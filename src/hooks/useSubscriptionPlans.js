import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Session cache for the resolved plans, plus the in-flight promise that fills
// it. The read is public, identical for every visitor and rarely changes, so a
// single fetch can serve every pricing surface for the life of the page.
//
// Without this, each mount restarted at {}: the caller's static fallbacks would
// paint, then a second later the live rows would land and the cards would
// visibly reflow. Because Home and /pricing each mount the hook fresh, that
// flash replayed on EVERY switch between the two pages. Seeding state from the
// cache means only the first pricing view can flash; every later one paints the
// live amounts on its first frame.
let plansCache = null; // slug -> plan, once resolved
let inflight = null; // shared by components that mount while the first read runs

async function loadPlans() {
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("slug, name, description, features, price, price_annually, currency, max_trades_per_month, max_backtest_sessions")
    .eq("is_active", true);
  if (error) throw new Error(error.message);

  const bySlug = {};
  (data ?? []).forEach((p) => {
    bySlug[p.slug] = {
      name: p.name,
      description: p.description ?? null,
      features: Array.isArray(p.features) ? p.features : null,
      price: p.price != null ? Number(p.price) : null,
      priceAnnually: p.price_annually != null ? Number(p.price_annually) : null,
      currency: (p.currency || "usd").toUpperCase(),
      // Usage caps consumed by usePlanLimits (0 = unlimited).
      maxTradesPerMonth: p.max_trades_per_month ?? 0,
      maxBacktestSessions: p.max_backtest_sessions ?? 0,
    };
  });

  plansCache = bySlug;
  return bySlug;
}

// Fetches active subscription plans so pricing displays read the live amounts an
// admin sets in the Pricing tab instead of hardcoded numbers. Returned keyed by
// slug for easy lookup. Read-only and public (RLS exposes is_active rows), so it
// works on marketing pages outside any provider too. Components should fall back
// to their own defaults while `loading` is true or a slug is absent.
export function useSubscriptionPlans() {
  const [plans, setPlans] = useState(() => plansCache ?? {});
  const [loading, setLoading] = useState(() => plansCache === null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (plansCache) return; // already resolved this session — live values are painted

    let cancelled = false;
    // A failed read clears `inflight` so the next mount retries rather than
    // re-awaiting a rejected promise forever. `plansCache` stays null on failure,
    // so callers keep their static fallbacks.
    if (!inflight) {
      inflight = loadPlans().finally(() => {
        inflight = null;
      });
    }

    inflight
      .then((bySlug) => {
        if (cancelled) return;
        setPlans(bySlug);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { plans, loading, error };
}

export default useSubscriptionPlans;
