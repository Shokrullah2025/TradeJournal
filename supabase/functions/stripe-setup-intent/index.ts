import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// stripe@16: the `customerSessions` resource (used below for one-click "quick
// checkout" with saved cards) was added in v15; v14 lacks it entirely.
import Stripe from "https://esm.sh/stripe@16?target=deno&no-check";

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

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      // Customer Session payment-element saved-card features below require a
      // 2024-06-20+ API version; older versions reject the feature flags.
      apiVersion: "2024-06-20",
    });

    // Get or create Stripe customer
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let customerId = existingSub?.stripe_customer_id;

    if (!customerId) {
      const existing = await stripe.customers.search({
        query: `metadata['supabase_user_id']:'${user.id}'`,
        limit: 1,
      });

      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const name = profile
          ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
          : "";

        const customer = await stripe.customers.create({
          email: user.email!,
          name: name || undefined,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    // Customer Session — lets the Payment Element display cards this customer
    // saved on a previous visit, pre-listed for one-click "quick checkout".
    // `payment_method_redisplay` surfaces eligible saved cards; `_save` keeps the
    // "save for faster checkout" option working for new cards. Best-effort: a
    // returning customer with no saved cards (or a transient error here) must not
    // block starting the trial, so a failure just omits the secret and the
    // Payment Element falls back to a plain card form.
    let customerSessionClientSecret: string | null = null;
    try {
      const customerSession = await stripe.customerSessions.create({
        customer: customerId,
        components: {
          payment_element: {
            enabled: true,
            features: {
              payment_method_redisplay: "enabled",
              payment_method_save: "enabled",
              payment_method_save_usage: "off_session",
              payment_method_remove: "enabled",
            },
          },
        },
      });
      customerSessionClientSecret = customerSession.client_secret;
    } catch (sessionErr) {
      console.error("stripe-setup-intent customerSession error:", sessionErr);
    }

    return successResponse({
      clientSecret: setupIntent.client_secret,
      customerId,
      customerSessionClientSecret,
    });
  } catch (err) {
    console.error("stripe-setup-intent error:", err);
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
