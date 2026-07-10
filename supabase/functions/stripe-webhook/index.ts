import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";
import { createServerNotification } from "../_shared/notify.ts";
import {
  classifyDeleteEvent,
  classifyUpdateEvent,
  stripeStatusToDb,
} from "./status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Stripe webhooks must use raw body for signature verification.
  // NEVER call req.json() before this — it would consume the body.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-04-10",
  });

  let event: Stripe.Event;
  try {
    // Must be the async variant: Deno's crypto is SubtleCrypto (async-only), so
    // the sync constructEvent throws "cannot be used in a synchronous context"
    // on every request — rejecting even correctly-signed events with a 400.
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Return 200 to Stripe immediately after signature verification.
  // Process DB updates asynchronously — Stripe retries on non-200 responses,
  // so we must not let DB errors cause webhook failures.
  const processEvent = async () => {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await resolveUserId(supabase, sub.customer as string);
          if (!userId) break;

          const planId = await resolvePlanId(supabase, sub.items.data[0]?.price?.id);

          // Capture the prior DB status BEFORE the update so we can detect
          // trial-lifecycle transitions (e.g. trialing → active = converted).
          const priorStatus = await getDbSubStatus(supabase, sub.id);
          const newStatus = stripeStatusToDb(sub.status);

          await supabase
            .from("user_subscriptions")
            .update({
              status: newStatus,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end,
              cancelled_at: sub.canceled_at
                ? new Date(sub.canceled_at * 1000).toISOString()
                : null,
              ...(planId ? { plan_id: planId } : {}),
            })
            .eq("stripe_subscription_id", sub.id)
            .eq("user_id", userId);

          if (event.type === "customer.subscription.created") {
            // New trial subscription — record the start of the trial lifecycle.
            if (newStatus === "trialing") {
              await logSubscriptionEvent(supabase, {
                userId,
                stripeSubscriptionId: sub.id,
                eventType: "trial_started",
                fromStatus: null,
                toStatus: "trialing",
              });
            }
          } else {
            const evt = classifyUpdateEvent(priorStatus, sub.status, sub.cancel_at_period_end);
            if (evt) {
              await logSubscriptionEvent(supabase, {
                userId,
                stripeSubscriptionId: sub.id,
                eventType: evt,
                fromStatus: priorStatus,
                toStatus: newStatus,
              });
            }
          }

          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await resolveUserId(supabase, sub.customer as string);
          if (!userId) break;

          // Capture prior status before flipping to 'cancelled' so we can tell a
          // trial that expired (no usable card) apart from one the user cancelled.
          const priorStatus = await getDbSubStatus(supabase, sub.id);

          await supabase
            .from("user_subscriptions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              cancel_at_period_end: false,
            })
            .eq("stripe_subscription_id", sub.id)
            .eq("user_id", userId);

          const evt = classifyDeleteEvent(
            priorStatus,
            sub.cancellation_details?.reason ?? null,
          );
          if (evt) {
            await logSubscriptionEvent(supabase, {
              userId,
              stripeSubscriptionId: sub.id,
              eventType: evt,
              fromStatus: priorStatus,
              toStatus: "cancelled",
            });
          }

          break;
        }

        case "invoice.payment_succeeded": {
          const inv = event.data.object as Stripe.Invoice;
          const userId = await resolveUserId(supabase, inv.customer as string);
          if (!userId) break;

          const subRow = inv.subscription
            ? await resolveSubRow(supabase, inv.subscription as string)
            : null;

          // Upsert invoice — ON CONFLICT on stripe_invoice_id (unique constraint added in migration 012)
          await supabase.from("invoices").upsert(
            {
              user_id: userId,
              subscription_id: subRow?.id ?? null,
              invoice_number: inv.number ?? inv.id,
              status: "paid",
              amount: (inv.amount_paid ?? 0) / 100,
              currency: inv.currency.toUpperCase(),
              tax_amount: (inv.tax ?? 0) / 100,
              discount_amount: 0,
              total_amount: (inv.amount_paid ?? 0) / 100,
              paid_at: new Date().toISOString(),
              stripe_invoice_id: inv.id,
              stripe_payment_intent_id: inv.payment_intent as string | null,
            },
            { onConflict: "stripe_invoice_id" },
          );

          // Activate the subscription if it was suspended waiting for payment
          if (inv.subscription) {
            await supabase
              .from("user_subscriptions")
              .update({ status: "active" })
              .eq("stripe_subscription_id", inv.subscription as string)
              .eq("status", "suspended");
          }

          break;
        }

        case "invoice.payment_failed": {
          const inv = event.data.object as Stripe.Invoice;
          const userId = await resolveUserId(supabase, inv.customer as string);
          if (!userId) break;

          const subRow = inv.subscription
            ? await resolveSubRow(supabase, inv.subscription as string)
            : null;

          await supabase.from("invoices").upsert(
            {
              user_id: userId,
              subscription_id: subRow?.id ?? null,
              invoice_number: inv.number ?? inv.id,
              status: "failed",
              amount: (inv.amount_due ?? 0) / 100,
              currency: inv.currency.toUpperCase(),
              tax_amount: 0,
              discount_amount: 0,
              total_amount: (inv.amount_due ?? 0) / 100,
              stripe_invoice_id: inv.id,
              stripe_payment_intent_id: inv.payment_intent as string | null,
            },
            { onConflict: "stripe_invoice_id" },
          );

          if (inv.subscription) {
            await supabase
              .from("user_subscriptions")
              .update({ status: "suspended" })
              .eq("stripe_subscription_id", inv.subscription as string)
              .eq("user_id", userId);
          }

          await createServerNotification(supabase, {
            userId,
            category: "billing",
            event_type: "payment_failed",
            title: "Payment failed",
            body:
              "We couldn't process your latest payment. Update your payment method to keep your subscription active.",
            severity: "error",
            link_to: "/billing",
            metadata: { invoice: inv.id },
          });

          break;
        }

        case "customer.subscription.trial_will_end": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await resolveUserId(supabase, sub.customer as string);
          if (!userId) break;

          const endsAt = sub.trial_end
            ? new Date(sub.trial_end * 1000).toLocaleDateString()
            : "soon";

          await createServerNotification(supabase, {
            userId,
            category: "billing",
            event_type: "trial_ending",
            title: "Your free trial is ending soon",
            body: `Your trial ends on ${endsAt}. Add a payment method to keep your plan without interruption.`,
            severity: "warning",
            link_to: "/billing",
            metadata: { subscription: sub.id },
          });

          break;
        }

        case "payment_method.attached": {
          const pm = event.data.object as Stripe.PaymentMethod;
          const userId = await resolveUserId(supabase, pm.customer as string);
          if (!userId || !pm.card) break;

          await supabase.from("payment_methods").upsert(
            {
              user_id: userId,
              stripe_payment_method_id: pm.id,
              type: "card",
              last_four: pm.card.last4,
              brand: pm.card.brand,
              exp_month: pm.card.exp_month,
              exp_year: pm.card.exp_year,
              is_default: false,
            },
            { onConflict: "stripe_payment_method_id" },
          );

          break;
        }

        default:
          // Unhandled event — not an error
          break;
      }
    } catch (err) {
      console.error(`Failed to process webhook event ${event.type}:`, err);
    }
  };

  // Keep the worker alive until processing finishes. A bare fire-and-forget
  // promise can be killed when the isolate shuts down right after the response,
  // which intermittently dropped event processing (e.g. the invoice row was
  // written but the trialing→active status update never ran).
  const task = processEvent();
  // @ts-ignore -- EdgeRuntime is a global provided by the Supabase Edge runtime
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task);

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

async function resolveUserId(
  supabase: ReturnType<typeof createClient>,
  stripeCustomerId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", stripeCustomerId)
    .limit(1)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function resolveSubRow(
  supabase: ReturnType<typeof createClient>,
  stripeSubId: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();
  return data ?? null;
}

async function resolvePlanId(
  supabase: ReturnType<typeof createClient>,
  stripePriceId: string | undefined,
): Promise<string | null> {
  if (!stripePriceId) return null;
  const { data } = await supabase
    .from("subscription_plans")
    .select("id")
    .or(`stripe_price_id_monthly.eq.${stripePriceId},stripe_price_id_annually.eq.${stripePriceId}`)
    .maybeSingle();
  return data?.id ?? null;
}

// Append-only trial-lifecycle ledger (migration 025). Written only by this
// webhook with the service-role key — there is deliberately no user INSERT
// policy, so app code cannot forge events.
async function logSubscriptionEvent(
  supabase: ReturnType<typeof createClient>,
  args: {
    userId: string;
    stripeSubscriptionId: string;
    eventType: string;
    fromStatus?: string | null;
    toStatus?: string | null;
  },
): Promise<void> {
  const subRow = await resolveSubRow(supabase, args.stripeSubscriptionId);
  if (!subRow) return;

  // Idempotency: Stripe redelivers webhooks, and some lifecycle transitions
  // surface across two events (e.g. a mid-trial cancel fires on both
  // subscription.updated and subscription.deleted). Each (subscription, event)
  // pair must be logged at most once. Also covers the trial_started row the
  // stripe-start-trial function may have already written.
  const { data: existing } = await supabase
    .from("subscription_events")
    .select("id")
    .eq("subscription_id", subRow.id)
    .eq("event_type", args.eventType)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  const { error } = await supabase.from("subscription_events").insert({
    user_id: args.userId,
    subscription_id: subRow.id,
    event_type: args.eventType,
    from_status: args.fromStatus ?? null,
    to_status: args.toStatus ?? null,
    metadata: { stripe_subscription_id: args.stripeSubscriptionId },
  });
  if (error) {
    console.error(`Failed to log subscription_event ${args.eventType}:`, error);
  }
}

async function getDbSubStatus(
  supabase: ReturnType<typeof createClient>,
  stripeSubId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_subscriptions")
    .select("status")
    .eq("stripe_subscription_id", stripeSubId)
    .maybeSingle();
  return (data?.status as string | undefined) ?? null;
}
