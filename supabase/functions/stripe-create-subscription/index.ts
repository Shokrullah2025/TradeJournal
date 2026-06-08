import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";

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

    // Create subscription in 'default_incomplete' state.
    // The PaymentIntent client_secret is returned to the browser to confirm
    // payment via Stripe Elements — the card data never touches this server.
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent | null;

    if (!paymentIntent?.client_secret) {
      return errorResponse("Failed to get payment client secret from Stripe", 500);
    }

    // Save subscription row as 'suspended' — the webhook activates it once payment confirms
    const now = new Date().toISOString();
    const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

    const { error: dbError } = await supabase
      .from("user_subscriptions")
      .insert({
        user_id: user.id,
        plan_id: plan.id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        status: "suspended",
        current_period_start: now,
        current_period_end: periodEnd,
        cancel_at_period_end: false,
      });

    if (dbError) {
      console.error("Failed to insert user_subscriptions:", dbError);
      // Don't fail the request — webhook will also upsert the row
    }

    return successResponse({
      clientSecret: paymentIntent.client_secret,
      subscriptionId: subscription.id,
    });
  } catch (err) {
    console.error("stripe-create-subscription error:", err);
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
