import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";

// Applies a retention discount to the caller's live subscription when they start
// a cancellation flow but accept a "stay" offer instead. The actual percentage
// and duration live in the Stripe coupon referenced by STRIPE_RETENTION_COUPON_ID
// — this function never hardcodes the amount, so marketing can change the offer
// in the Stripe dashboard without a redeploy.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Missing Authorization header", 401);

    const couponId = Deno.env.get("STRIPE_RETENTION_COUPON_ID");
    if (!couponId) {
      // Misconfiguration — do not surface internals to the user.
      console.error("STRIPE_RETENTION_COUPON_ID is not set");
      return errorResponse("This offer isn't available right now.", 503);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Never trust a user_id from the client — resolve identity from the JWT.
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    // Only an active or trialing subscription can carry a retention discount.
    const { data: sub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .not("stripe_subscription_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subError) {
      console.error("stripe-apply-retention-coupon lookup error:", subError.message);
      return errorResponse("We couldn't load your subscription. Please try again.", 500);
    }
    if (!sub?.stripe_subscription_id) {
      return errorResponse("No active subscription found to apply the offer to.", 404);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    // Attach the coupon to the subscription. Stripe applies it to upcoming
    // invoices per the coupon's own duration (once / repeating / forever). The
    // webhook (customer.subscription.updated) reconciles our DB row afterward.
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      coupon: couponId,
    });

    return successResponse({
      applied: true,
      message: "Your discount has been applied. Thanks for staying with us!",
    });
  } catch (err) {
    // Stripe surfaces bad/duplicate coupons here — keep the user message clean.
    console.error("stripe-apply-retention-coupon error:", err);
    return errorResponse("We couldn't apply the offer. Please try again.", 500);
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
