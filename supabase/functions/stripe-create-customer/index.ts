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

    // Optional billing address + tax ID, required for Stripe Tax (VAT/GST) to
    // compute the correct rate for EU/international customers. The browser
    // collects these with Stripe's AddressElement before checkout.
    const body = await req.json().catch(() => ({}));
    const { address, taxId } = (body ?? {}) as {
      address?: BillingAddress;
      taxId?: { type: string; value: string } | null;
    };

    const addressError = validateAddress(address);
    if (addressError) return errorResponse(addressError, 400);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-04-10",
    });

    // Resolve an existing customer first (DB row, then Stripe metadata search)
    // so we never create duplicates. If found, we still UPDATE the address so a
    // customer created before this change gets a tax location attached.
    const customerId = await resolveExistingCustomerId(supabase, stripe, user.id);

    if (customerId) {
      if (address) {
        await stripe.customers.update(customerId, {
          address: toStripeAddress(address),
        });
      }
      await attachTaxId(stripe, customerId, taxId);
      return successResponse({ customerId });
    }

    // Fetch user profile for the customer name
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
      address: address ? toStripeAddress(address) : undefined,
      metadata: { supabase_user_id: user.id },
    });

    await attachTaxId(stripe, customer.id, taxId);

    return successResponse({ customerId: customer.id });
  } catch (err) {
    console.error("stripe-create-customer error:", err);
    // Surface a bad VAT/tax ID (or other invalid input) to the user instead of
    // a generic 500 so they can correct it.
    if (err instanceof Stripe.errors.StripeInvalidRequestError) {
      return errorResponse(err.message, 400);
    }
    return errorResponse("Internal server error", 500);
  }
});

interface BillingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

// Country (ISO-2) must be present for Stripe Tax to resolve a jurisdiction.
// Other fields are optional but improve accuracy for regional taxes (US, CA).
function validateAddress(address?: BillingAddress): string | null {
  if (!address) return null; // address is optional at customer-create time
  if (!address.country || !/^[A-Z]{2}$/.test(address.country)) {
    return "A valid 2-letter country code is required for tax calculation";
  }
  return null;
}

function toStripeAddress(address: BillingAddress) {
  return {
    line1: address.line1 || undefined,
    line2: address.line2 || undefined,
    city: address.city || undefined,
    state: address.state || undefined,
    postal_code: address.postal_code || undefined,
    country: address.country,
  };
}

async function resolveExistingCustomerId(
  supabase: ReturnType<typeof createClient>,
  stripe: Stripe,
  userId: string,
): Promise<string | null> {
  const { data: existingSub } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSub?.stripe_customer_id) return existingSub.stripe_customer_id;

  const found = await stripe.customers.search({
    query: `metadata['supabase_user_id']:'${userId}'`,
    limit: 1,
  });
  return found.data[0]?.id ?? null;
}

// Attach a VAT/GST/ABN tax ID if the customer doesn't already have the same
// one. Stripe rejects malformed IDs — we surface that as a 400 to the caller.
async function attachTaxId(
  stripe: Stripe,
  customerId: string,
  taxId?: { type: string; value: string } | null,
) {
  if (!taxId?.type || !taxId?.value) return;

  const existing = await stripe.customers.listTaxIds(customerId, { limit: 100 });
  const alreadyPresent = existing.data.some(
    (t) => t.type === taxId.type && t.value === taxId.value,
  );
  if (alreadyPresent) return;

  await stripe.customers.createTaxId(customerId, {
    type: taxId.type as Stripe.TaxIdCreateParams.Type,
    value: taxId.value,
  });
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
