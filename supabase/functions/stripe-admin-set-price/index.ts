import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14?target=deno&no-check";

// Admin-only: sets a plan's price. Stripe Prices are immutable, so this creates
// a *new* recurring Price (reusing one Product per plan) and repoints the
// subscription_plans row at it. New subscriptions charge the new amount;
// existing subscribers keep their current price until separately migrated.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
};

// Stripe rejects amounts under ~$0.50; cap high to catch fat-finger errors.
const MIN_AMOUNT = 0.5;
const MAX_AMOUNT = 100000;

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

    // Resolve identity from the JWT — never trust a role from the client.
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    // Server-side admin gate — mirrors the DB is_admin() (public.users.role).
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("stripe-admin-set-price role lookup error:", profileError.message);
      return errorResponse("Could not verify your permissions.", 500);
    }
    if (profile?.role !== "admin") {
      return errorResponse("Admin access required.", 403);
    }

    const body = await req.json().catch(() => ({}));
    const planSlug = typeof body.planSlug === "string" ? body.planSlug.trim() : "";
    if (!planSlug) return errorResponse("planSlug is required.", 400);

    const monthly = normalizeAmount(body.monthly);
    const annual = normalizeAmount(body.annual);
    if (monthly === "invalid" || annual === "invalid") {
      return errorResponse(
        `Prices must be numbers between $${MIN_AMOUNT} and $${MAX_AMOUNT}.`,
        400,
      );
    }
    if (monthly === null && annual === null) {
      return errorResponse("Provide at least a monthly or annual price.", 400);
    }

    // Load the plan we're repricing.
    const { data: plan, error: planError } = await supabase
      .from("subscription_plans")
      .select("id, name, currency, stripe_product_id")
      .eq("slug", planSlug)
      .maybeSingle();
    if (planError) {
      console.error("stripe-admin-set-price plan lookup error:", planError.message);
      return errorResponse("Could not load that plan.", 500);
    }
    if (!plan) return errorResponse("Plan not found.", 404);

    const currency = (plan.currency || "usd").toLowerCase();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    // Reuse the plan's Stripe Product, creating it once if this is the first time.
    let productId = plan.stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({ name: plan.name });
      productId = product.id;
    }

    const update: Record<string, unknown> = {
      stripe_product_id: productId,
      currency,
      updated_at: new Date().toISOString(),
    };

    if (monthly !== null) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(monthly * 100),
        currency,
        recurring: { interval: "month" },
      });
      update.stripe_price_id_monthly = price.id;
      // The display `price` column tracks the headline monthly amount.
      update.price = monthly;
    }

    if (annual !== null) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: Math.round(annual * 100),
        currency,
        recurring: { interval: "year" },
      });
      update.stripe_price_id_annually = price.id;
      // Mirror the annual amount into the DB so the UI can display it.
      update.price_annually = annual;
    }

    const { data: updated, error: updateError } = await supabase
      .from("subscription_plans")
      .update(update)
      .eq("id", plan.id)
      .select("slug, name, price, price_annually, currency, stripe_price_id_monthly, stripe_price_id_annually")
      .single();
    if (updateError) {
      console.error("stripe-admin-set-price update error:", updateError.message);
      return errorResponse("The price was created in Stripe but saving it failed. Please retry.", 500);
    }

    return successResponse({ plan: updated });
  } catch (err) {
    console.error("stripe-admin-set-price error:", err);
    return errorResponse("We couldn't update the price. Please try again.", 500);
  }
});

// Returns a positive number, null (field omitted), or "invalid" (present but bad).
function normalizeAmount(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return "invalid";
  if (n < MIN_AMOUNT || n > MAX_AMOUNT) return "invalid";
  return n;
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
