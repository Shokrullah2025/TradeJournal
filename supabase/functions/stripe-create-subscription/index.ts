import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";
import { resolveCheckoutOutcome } from "./checkout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Missing Authorization header", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    const body = await req.json();
    const { customerId, planSlug, billingCycle } = body as {
      customerId: string;
      planSlug: string;
      billingCycle: "monthly" | "annually";
    };
    const promotionCode = typeof body.promotionCode === "string" ? body.promotionCode.trim() : "";

    if (!customerId || !planSlug || !billingCycle) {
      return errorResponse("Missing required fields: customerId, planSlug, billingCycle", 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    // Verify the customerId belongs to this user by checking Stripe metadata
    const customer = await stripe.customers.retrieve(customerId);
    if (
      customer.deleted ||
      (customer as Stripe.Customer).metadata?.supabase_user_id !== user.id
    ) {
      return errorResponse("Invalid customer ID", 403);
    }

    // Look up the Stripe price ID from the database
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, stripe_price_id_monthly, stripe_price_id_annually")
      .eq("slug", planSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (planError || !plan) {
      return errorResponse(`Plan '${planSlug}' not found`, 404);
    }

    const priceId = billingCycle === "annually"
      ? plan.stripe_price_id_annually
      : plan.stripe_price_id_monthly;

    if (!priceId) {
      return errorResponse(
        `No Stripe price configured for ${planSlug} (${billingCycle}). ` +
        "Set stripe_price_id_monthly / stripe_price_id_annually in the subscription_plans table.",
        422,
      );
    }

    // Resolve a coupon code if one was entered — reject an invalid one rather
    // than silently charging full price.
    let promotionId: string | null = null;
    if (promotionCode) {
      const promos = await stripe.promotionCodes.list({ code: promotionCode, active: true, limit: 1 });
      const promo = promos.data[0];
      if (!promo || !promo.coupon?.valid) {
        return errorResponse("That coupon code isn't valid.", 400);
      }
      promotionId = promo.id;
    }

    // ── Prevent stacked subscriptions ────────────────────────────────────────
    // This endpoint used to call subscriptions.create() unconditionally, so a
    // user who clicked "subscribe" more than once accumulated many parallel
    // Stripe subscriptions (and a pile of "suspended" local rows) — a real
    // double-billing risk. Before creating anything:
    //   1. cancel abandoned incomplete checkouts (they never charged), and
    //   2. if a live (active/trialing) subscription already exists, switch it
    //      to the new plan in place instead of opening a second one.
    const existing = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 100,
    });

    // Clean up dead checkouts. `incomplete` = card never confirmed; cancel it.
    // `incomplete_expired` = Stripe already killed it (~23h unconfirmed) and it
    // can't be cancelled, so only sync the local row. Leave past_due/unpaid
    // alone — those are real subscriptions in dunning, not abandoned checkouts.
    for (const s of existing.data) {
      if (s.status === "incomplete" || s.status === "incomplete_expired") {
        if (s.status === "incomplete") {
          try {
            await stripe.subscriptions.cancel(s.id);
          } catch (_) {
            // Already gone / transitioned — nothing to do.
          }
        }
        await supabase
          .from("user_subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", s.id)
          .eq("user_id", user.id);
      }
    }

    // Plan change: reuse the one live subscription rather than stacking a new
    // one. Stripe swaps the price on the existing item and invoices the
    // proration immediately (always_invoice), so an upgrade produces a receipt
    // right away. The card on file is charged for the difference; if the bank
    // requires authentication (SCA) the PaymentIntent's client_secret is
    // returned so the browser can confirm it — same as first checkout.
    const liveSub = existing.data.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    if (liveSub) {
      const item = liveSub.items.data[0];
      const alreadyOnPlan = item?.price?.id === priceId;

      if (item?.id && !alreadyOnPlan) {
        const updateParams: Stripe.SubscriptionUpdateParams = {
          items: [{ id: item.id, price: priceId }],
          proration_behavior: "always_invoice",
          cancel_at_period_end: false,
          expand: ["latest_invoice.payment_intent"],
        };
        if (promotionId) updateParams.promotion_code = promotionId;
        const updated = await stripe.subscriptions.update(liveSub.id, updateParams);

        // Sync the local row. The webhook also syncs on subscription.updated and
        // records the proration invoice on invoice.payment_succeeded.
        await supabase
          .from("user_subscriptions")
          .update({
            plan_id: plan.id,
            status: updated.status === "trialing" ? "trialing" : "active",
            current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
            cancel_at_period_end: false,
          })
          .eq("stripe_subscription_id", liveSub.id)
          .eq("user_id", user.id);

        // Decide what — if anything — the browser must confirm for the proration
        // invoice Stripe just raised.
        const invoice =
          updated.latest_invoice && typeof updated.latest_invoice === "object"
            ? (updated.latest_invoice as Stripe.Invoice)
            : null;
        const paymentIntent =
          invoice && typeof invoice.payment_intent === "object"
            ? (invoice.payment_intent as Stripe.PaymentIntent)
            : null;

        // Charged outright (card on file, no SCA) or nothing due (credit / $0).
        if (!invoice || invoice.status === "paid" || (invoice.amount_due ?? 0) === 0) {
          return successResponse({ subscriptionId: liveSub.id, paidInFull: true });
        }
        // Bank authentication needed — hand the browser the secret to confirm.
        if (paymentIntent?.client_secret) {
          return successResponse({
            subscriptionId: liveSub.id,
            paidInFull: false,
            clientSecret: paymentIntent.client_secret,
          });
        }
        // Invoice open with nothing to confirm — let dunning/webhooks collect
        // rather than block the user on the plan switch.
        return successResponse({ subscriptionId: liveSub.id, paidInFull: true });
      }

      // Already on this plan — nothing to change or charge.
      return successResponse({ subscriptionId: liveSub.id, paidInFull: true });
    }

    // Create subscription in 'default_incomplete' state.
    // The PaymentIntent client_secret is returned to the browser to confirm
    // payment via Stripe Elements — the card data never touches this server.
    const subParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      // pending_setup_intent exists when the first invoice needs no payment
      // ($0 via 100%-off coupon) — confirming it collects the card that every
      // later renewal invoice charges. Without it the subscription has no
      // payment method and month 2 could never be collected.
      expand: ["latest_invoice.payment_intent", "pending_setup_intent"],
    };
    if (promotionId) subParams.promotion_code = promotionId;
    const subscription = await stripe.subscriptions.create(subParams);

    // A 100%-off promotion makes the first invoice $0: Stripe pays it out of
    // band, activates the subscription immediately, and never creates a
    // PaymentIntent. The pure decision logic lives in checkout.ts (unit-tested
    // in tests/edge/checkoutOutcome.test.js).
    const outcome = resolveCheckoutOutcome(
      subscription as unknown as Parameters<typeof resolveCheckoutOutcome>[0],
    );
    const { paidInFull } = outcome;

    if (!outcome.ok) {
      return errorResponse("Failed to get payment client secret from Stripe", 500);
    }

    // Save subscription row as 'suspended' — the webhook activates it once
    // payment confirms. A $0 checkout is already live, so store it active.
    const now = new Date().toISOString();
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    const { error: dbError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: paidInFull ? "active" : "suspended",
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
      });

    if (dbError) {
      console.error("Failed to insert user_subscriptions:", dbError);
      // Don't fail the request — webhook will also upsert the row
    }

    return successResponse({
      clientSecret: outcome.clientSecret,
      subscriptionId: subscription.id,
      paidInFull,
      // On the paidInFull path the browser confirms this SetupIntent instead,
      // saving the card that future renewal invoices will auto-charge.
      setupClientSecret: outcome.setupClientSecret,
    });
  } catch (err) {
    console.error("stripe-create-subscription error:", err);
    // Stripe request errors carry customer-appropriate messages (e.g. a promo
    // code restricted to first-time customers) — surface those instead of a
    // blind "internal server error". Anything else stays generic.
    if (err?.type === "StripeInvalidRequestError" || err?.type === "StripeCardError") {
      return errorResponse(err.message ?? "Payment request was rejected.", 400);
    }
    return errorResponse("Internal server error", 500);
  }
});

function successResponse(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
