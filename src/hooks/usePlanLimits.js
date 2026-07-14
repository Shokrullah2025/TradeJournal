import { useMemo } from "react";
import { useFeatureFlags } from "../context/FeatureFlagContext";
import { useSubscriptionPlans } from "./useSubscriptionPlans";
import { PLAN_LABELS } from "../lib/featureFlags";

// ── usePlanLimits ───────────────────────────────────────────────────────────
// Resolves the numeric usage caps (manual trades / month, saved backtest
// sessions) that apply to the CURRENT user, keyed off the audience already
// resolved by FeatureFlagContext. Reuses the cached useSubscriptionPlans read
// so no extra network round-trip is added.
//
// Audience → which plan's caps apply:
//   admin      → unlimited (0/0); admins are never usage-capped.
//   trial      → Pro-level (premium) — trials get the same entitlements as Pro.
//   basic/premium/enterprise → that plan's own row.
//   free       → most restrictive (basic); free users sit behind the TrialGate
//                and never reach these flows, but fail safe to the tightest cap.
//
// Fails OPEN: while plans are loading, or if a slug/row is missing, caps default
// to 0 (unlimited) so a load hiccup never blocks a paying user from saving.

const AUDIENCE_TO_LIMIT_SLUG = {
  trial: "premium",
  basic: "basic",
  premium: "premium",
  enterprise: "enterprise",
  free: "basic",
};

export function usePlanLimits() {
  const { audience } = useFeatureFlags();
  const { plans, loading } = useSubscriptionPlans();

  return useMemo(() => {
    if (audience === "admin") {
      return {
        maxTradesPerMonth: 0,
        maxBacktestSessions: 0,
        // The plan a user would upgrade to when they hit the cap (the next tier
        // up). Null for admin/enterprise — nothing above them to sell.
        upgradePlan: null,
        upgradeLabel: null,
        loading: false,
      };
    }

    const slug = AUDIENCE_TO_LIMIT_SLUG[audience] ?? "basic";
    const plan = plans[slug];

    // The obvious upsell target when a cap is hit: Starter → Pro, Pro → Elite.
    const upgradePlan =
      slug === "basic" ? "premium" : slug === "premium" ? "enterprise" : null;

    return {
      maxTradesPerMonth: plan?.maxTradesPerMonth ?? 0,
      maxBacktestSessions: plan?.maxBacktestSessions ?? 0,
      upgradePlan,
      upgradeLabel: upgradePlan ? PLAN_LABELS[upgradePlan] : null,
      loading,
    };
  }, [audience, plans, loading]);
}

export default usePlanLimits;
