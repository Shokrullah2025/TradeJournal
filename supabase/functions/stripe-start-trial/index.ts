import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";
import { createServerNotification } from "../_shared/notify.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
};

const TRIAL_PERIOD_DAYS = 7;

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
    const { customerId, planSlug, billingCycle, paymentMethodId } = body as {
      customerId: string;
      planSlug: string;
      billingCycle: "monthly" | "annually";
      paymentMethodId: string;
    };
    const promotionCode = typeof body.promotionCode === "string" ? body.promotionCode.trim() : "";

    if (!customerId || !planSlug || !billingCycle || !paymentMethodId) {
      return errorResponse(
        "Missing required fields: customerId, planSlug, billingCycle, paymentMethodId",
        400,
      );
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

    // Anti-abuse: one free trial per user. Keyed on user_subscriptions (written
    // synchronously below) rather than the subscription_events ledger, because
    // the ledger event can be written asynchronously by the webhook and would
    // race a rapid second attempt. Any prior row that ever had a trial counts.
    const { data: priorTrial } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .not("trial_start", "is", null)
      .limit(1)
      .maybeSingle();

    if (priorTrial) {
      return errorResponse("You've already used your free trial.", 409);
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

    // Resolve a coupon code, if the user entered one. We only apply valid, active
    // promotion codes — an invalid code is rejected so the user isn't silently
    // charged full price after expecting a discount.
    let promotionId: string | null = null;
    if (promotionCode) {
      const promos = await stripe.promotionCodes.list({ code: promotionCode, active: true, limit: 1 });
      const promo = promos.data[0];
      if (!promo || !promo.coupon?.valid) {
        return errorResponse("That coupon code isn't valid.", 400);
      }
      promotionId = promo.id;
    }

    // Attach the payment method (confirmed client-side via SetupIntent) and make it
    // the customer default, so Stripe can auto-charge when the trial ends.
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Create the subscription with a real 7-day trial. When the trial ends Stripe
    // automatically invoices and charges the default payment method, then bills
    // monthly. If the card is removed before trial end the subscription is cancelled
    // instead of leaving an unpaid subscription open.
    const subParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: TRIAL_PERIOD_DAYS,
      default_payment_method: paymentMethodId,
      payment_settings: { save_default_payment_method: "on_subscription" },
      trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
    };
    // The discount applies to invoices after the trial ends (the first real charge).
    if (promotionId) subParams.promotion_code = promotionId;
    const subscription = await stripe.subscriptions.create(subParams);

    const now = new Date().toISOString();
    const trialEnd = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null;
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Insert the subscription row as 'trialing'. The webhook also reconciles this
    // row on customer.subscription.created/updated (idempotent on
    // stripe_subscription_id), but we insert here so the trial is durable even if
    // that webhook is delayed.
    const { data: subRow, error: dbError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: "trialing",
        current_period_start: now,
        current_period_end: periodEnd,
        trial_start: now,
        trial_end: trialEnd,
        cancel_at_period_end: false,
      })
      .select("id")
      .single();

    if (dbError || !subRow) {
      console.error("Failed to insert user_subscriptions:", dbError);
      // Don't fail the request — the webhook will reconcile the row and log the
      // trial_started event from customer.subscription.created.
    } else {
      // Log trial_started here so the conversion ledger is reliable regardless of
      // webhook timing. The webhook's insert is guarded against duplicating it.
      const { error: eventError } = await supabase
        .from("subscription_events")
        .insert({
          user_id: user.id,
          subscription_id: subRow.id,
          event_type: "trial_started",
          from_status: null,
          to_status: "trialing",
          metadata: { stripe_subscription_id: subscription.id },
        });
      if (eventError) {
        console.error("Failed to log trial_started event:", eventError);
      }
    }

    // Tell the user their trial is live and, crucially, WHEN it converts — the
    // card is already on file, so the first charge must never be a surprise.
    // Never throws; a failed notification must not fail an activated trial.
    await createServerNotification(supabase, {
      userId: user.id,
      category: "billing",
      event_type: "trial_started",
      title: "Your 7-day free trial has started",
      body: trialEnd
        ? `You have full access until ${new Date(trialEnd).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}. We'll charge your card then unless you cancel before.`
        : "You have full access for the next 7 days. Cancel any time before it ends.",
      severity: "success",
      link_to: "/billing",
      metadata: { stripe_subscription_id: subscription.id, plan: planSlug },
    });

    return successResponse({
      subscriptionId: subscription.id,
      trialEnd,
    });
  } catch (err) {
    console.error("stripe-start-trial error:", err);
    // Surface Stripe card errors (e.g. declined) to the user; keep everything else generic.
    if (err instanceof Stripe.errors.StripeCardError) {
      return errorResponse(err.message, 402);
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
