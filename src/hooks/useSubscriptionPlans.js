import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Fetches active subscription plans so pricing displays read the live amounts an
// admin sets in the Pricing tab instead of hardcoded numbers. Returned keyed by
// slug for easy lookup. Read-only and public (RLS exposes is_active rows), so it
// works on marketing pages outside any provider too. Components should fall back
// to their own defaults while `loading` is true or a slug is absent.
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState({}); // slug -> { name, price, priceAnnually, currency }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data, error: qErr } = await supabase
          .from("subscription_plans")
          .select("slug, name, description, features, price, price_annually, currency")
          .eq("is_active", true);
        if (qErr) throw qErr;
        if (cancelled) return;

        const bySlug = {};
        (data ?? []).forEach((p) => {
          bySlug[p.slug] = {
            name: p.name,
            description: p.description ?? null,
            features: Array.isArray(p.features) ? p.features : null,
            price: p.price != null ? Number(p.price) : null,
            priceAnnually: p.price_annually != null ? Number(p.price_annually) : null,
            currency: (p.currency || "usd").toUpperCase(),
          };
        });
        setPlans(bySlug);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, loading, error };
}

export default useSubscriptionPlans;
