import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";

// Validates a customer-entered promotion code against Stripe so the checkout /
// trial UI can show "20% off applied" (or "invalid") before the subscription is
// created. Only active promotion codes tied to a valid coupon pass. The actual
// discount is applied server-side again in stripe-start-trial /
// stripe-create-subscription — this endpoint is for feedback only.
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) return errorResponse("Enter a coupon code.", 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    const promos = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
    const promo = promos.data[0];
    if (!promo || !promo.coupon?.valid) {
      return successResponse({ valid: false });
    }

    return successResponse({
      valid: true,
      code: promo.code,
      label: describeCoupon(promo.coupon),
    });
  } catch (err) {
    console.error("stripe-validate-coupon error:", err);
    return errorResponse("Couldn't check that coupon. Please try again.", 500);
  }
});

function describeCoupon(c: Stripe.Coupon): string {
  let base: string;
  if (c.percent_off) {
    base = `${c.percent_off}% off`;
  } else if (c.amount_off) {
    base = `${(c.amount_off / 100).toFixed(2)} ${(c.currency || "usd").toUpperCase()} off`;
  } else {
    base = "Discount";
  }
  if (c.duration === "repeating" && c.duration_in_months) {
    return `${base} for ${c.duration_in_months} months`;
  }
  if (c.duration === "forever") return `${base}, forever`;
  if (c.duration === "once") return `${base} on your first charge`;
  return base;
}

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
