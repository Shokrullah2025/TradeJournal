import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";
import { createServerNotification } from "../_shared/notify.ts";

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
    event = stripe.webhooks.constructEvent(
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

          await supabase
            .from("user_subscriptions")
            .update({
              status: stripeStatusToDb(sub.status),
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

          break;
        }

        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const userId = await resolveUserId(supabase, sub.customer as string);
          if (!userId) break;

          await supabase
            .from("user_subscriptions")
            .update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              cancel_at_period_end: false,
            })
            .eq("stripe_subscription_id", sub.id)
            .eq("user_id", userId);

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

  // Fire-and-forget so we respond to Stripe in < 30s
  processEvent();

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

function stripeStatusToDb(status: Stripe.Subscription.Status): string {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "cancelled";
    case "past_due":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return "suspended";
    default:
      return "suspended";
  }
}
