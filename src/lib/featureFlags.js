// ── Feature flag catalog ─────────────────────────────────────────────────
// Canonical list of gateable features. Mirrors the seed in
// supabase/migrations/021_admin_dashboard.sql. The admin dashboard renders a
// toggle row per entry, and the FeatureFlagContext falls back to this catalog
// (all enabled) when the feature_flags table cannot be read — so the app never
// breaks just because the migration hasn't been applied yet.

export const FEATURE_CATALOG = [
  { key: "backtesting",        name: "Backtesting",        description: "Replay historical price action and journal simulated trades.", route: "/backtest" },
  { key: "broker_sync",        name: "Broker Sync",        description: "Automatic trade import via broker OAuth connections.",          route: "/brokers" },
  { key: "csv_import",         name: "CSV Import",         description: "Bulk-import trades from a broker CSV export.",                   route: null },
  { key: "advanced_analytics", name: "Advanced Analytics", description: "Strategy, instrument, time-of-day and drawdown breakdowns.",     route: "/analytics" },
  { key: "risk_calculator",    name: "Risk Calculator",    description: "Position-size and risk/reward planning tool.",                  route: "/risk-calculator" },
  { key: "export_reports",     name: "Export Reports",     description: "Download analytics and trade history as XLSX.",                 route: null },
  { key: "ai_insights",        name: "AI Insights",        description: "Pre-market briefing and automated edge insights.",              route: null },
  { key: "trade_images",       name: "Trade Screenshots",  description: "Attach chart screenshots to journal entries.",                  route: null },
];

// Features announced but not yet released. These stay visible in the app so
// users know they're coming, but render blurred behind a "Coming soon"
// overlay (see src/components/common/ComingSoonGate.jsx). Remove a key from
// this list to launch the feature — no other code change needed.
export const COMING_SOON_FEATURES = ["broker_sync"];

export const isComingSoon = (featureKey) =>
  COMING_SOON_FEATURES.includes(featureKey);

// Audiences a flag can target. Order matters for the admin UI columns.
// NOTE: keys must match the `subscription_plans.slug` values in Supabase. The
// mid-tier plan's slug is "premium" (its display name is "Pro").
//
// "free" is deliberately absent: there is no free plan. resolveAudience() still
// returns "free" as the internal signal for "no live trial and no paid plan",
// but that user is held behind the non-dismissible TrialGate and never reaches
// a gated feature — so a Free column in the admin grid would toggle access for
// people who cannot get into the app at all.
export const AUDIENCES = [
  { key: "trial",      label: "Trial" },
  { key: "basic",      label: "Basic" },
  { key: "premium",    label: "Pro" },
  { key: "enterprise", label: "Enterprise" },
  { key: "admin",      label: "Admin" },
];

// Resolve which audience a user belongs to, given their role and active
// subscription. Precedence: admin role > active trial > paid plan slug > free.
// The whitelist mirrors the real subscription_plans slugs in Supabase.
export function resolveAudience({ role, planSlug, isTrial } = {}) {
  if (role === "admin") return "admin";
  if (isTrial) return "trial";
  if (planSlug && ["basic", "premium", "enterprise"].includes(planSlug)) return planSlug;
  return "free";
}

// How long an 'active' row keeps its entitlement past current_period_end.
// Covers webhook lag on renewals (the renewal payment succeeds on Stripe but
// the status/period update takes a moment to land) without stranding paid
// users; anything longer would hand out free access when a webhook is lost.
export const ENTITLEMENT_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

// Derive what a user_subscriptions row actually entitles the user to, RIGHT
// NOW. The DB status only flips when a Stripe webhook lands; if that webhook
// never arrives (endpoint change, outage, orphaned Stripe account) the row
// stays 'trialing'/'active' forever — so entitlement must ALSO die with the
// period itself:
//   • a trialing row past trial_end grants nothing — its plan slug must not
//     leak into the paid-plan branch of resolveAudience (this exact leak let
//     expired trials keep full premium access);
//   • an active row keeps access up to ENTITLEMENT_GRACE_MS past
//     current_period_end, then grants nothing until a paid renewal lands.
// Returns { isTrial, planSlug } ready to feed into resolveAudience.
export function deriveEntitlement(row, nowMs = Date.now()) {
  if (!row) return { isTrial: false, planSlug: null };

  const isTrialRow = row.status === "trialing";
  const isTrial =
    isTrialRow && !!row.trial_end && new Date(row.trial_end).getTime() > nowMs;

  const periodLive =
    !row.current_period_end ||
    new Date(row.current_period_end).getTime() + ENTITLEMENT_GRACE_MS > nowMs;

  const planSlug =
    isTrialRow || !periodLive ? null : (row.subscription_plans?.slug ?? null);

  return { isTrial, planSlug };
}

// Decide whether a feature is on for a given audience.
//  - No flag record at all  → on (fail open; never hide a feature by accident).
//  - Master `enabled` false → off for everyone.
//  - audiences[audience] === false → off for that audience.
//  - otherwise               → on.
export function evaluateFlag(flag, audience) {
  if (!flag) return true;
  if (flag.enabled === false) return false;
  const audiences = flag.audiences || {};
  if (audience in audiences) return audiences[audience] !== false;
  return true;
}
