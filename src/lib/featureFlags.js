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
// NOTE: keys must match the `subscription_plans.slug` values in Supabase, which
// are frozen because Stripe and every existing subscriber row key off them. The
// display names have since diverged from the slugs: basic → "Starter",
// premium → "Pro", enterprise → "Elite".
//
// "free" is deliberately absent: there is no free plan. resolveAudience() still
// returns "free" as the internal signal for "no live trial and no paid plan",
// but that user is held behind the non-dismissible TrialGate and never reaches
// a gated feature — so a Free column in the admin grid would toggle access for
// people who cannot get into the app at all.
//
// "trial" is deliberately absent too. A trial is NOT a tier — it is a free
// window on a plan the user actually chose at signup, so a trialing Starter is
// a Starter and a trialing Pro is a Pro. Collapsing every trialing user into
// one "trial" audience threw that plan away, which broke two things at once:
// upgrading Starter → Pro mid-trial changed nothing (the row stays
// status='trialing', so the audience stayed "trial"), and the admin grid needed
// a Trial column that silently overrode every plan column. The plan toggles
// below now govern trial users too.
export const AUDIENCES = [
  { key: "basic",      label: "Starter" },
  { key: "premium",    label: "Pro" },
  { key: "enterprise", label: "Elite" },
  { key: "admin",      label: "Admin" },
];

// Resolve which audience a user belongs to, given their role and active
// subscription. Precedence: admin role > plan slug (paid OR trialing) > free.
// The whitelist mirrors the real subscription_plans slugs in Supabase.
export function resolveAudience({ role, planSlug } = {}) {
  if (role === "admin") return "admin";
  if (planSlug && PLAN_ORDER.includes(planSlug)) return planSlug;
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
//   • a LIVE trial (trial_end in the future) entitles the user to the plan it
//     is a trial OF — a Starter trial is Starter, a Pro trial is Pro. Upgrading
//     mid-trial swaps the plan on the row and the entitlement follows it.
//   • an EXPIRED trial grants nothing: its plan slug must not survive, or the
//     trial never actually ends (this exact leak once let expired trials keep
//     full premium access).
//   • an active row keeps access up to ENTITLEMENT_GRACE_MS past
//     current_period_end, then grants nothing until a paid renewal lands.
// Returns { isTrial, planSlug }; isTrial is reported for billing UI, but only
// planSlug decides entitlement (see resolveAudience).
export function deriveEntitlement(row, nowMs = Date.now()) {
  if (!row) return { isTrial: false, planSlug: null };

  const isTrialRow = row.status === "trialing";
  const isTrial =
    isTrialRow && !!row.trial_end && new Date(row.trial_end).getTime() > nowMs;

  const periodLive =
    !row.current_period_end ||
    new Date(row.current_period_end).getTime() + ENTITLEMENT_GRACE_MS > nowMs;

  // A trialing row lives or dies by trial_end; any other row by its period.
  const entitled = isTrialRow ? isTrial : periodLive;
  const planSlug = entitled ? (row.subscription_plans?.slug ?? null) : null;

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

// ── Plan hierarchy ─────────────────────────────────────────────────────────
// The flag grid is a flat per-audience allow/deny map; nothing in it knows that
// Elite > Pro > Starter. To render an "Upgrade to Pro" call-to-action on a
// locked feature we have to derive the cheapest plan that would unlock it.
//
// PLAN_ORDER is cheapest → most expensive; the labels are the marketing names
// (the slugs are frozen because Stripe and every subscriber row key off them —
// see the AUDIENCES note above).
export const PLAN_ORDER = ["basic", "premium", "enterprise"];
export const PLAN_LABELS = { basic: "Starter", premium: "Pro", enterprise: "Elite" };

// The upsell target for a locked feature: the cheapest plan whose audience is
// not explicitly denied. Returns null when the feature is off for everyone
// (master kill-switch) or has no flag record — in both cases there is nothing
// to upsell.
export function requiredPlanFor(flag) {
  if (!flag || flag.enabled === false) return null;
  const audiences = flag.audiences || {};
  return PLAN_ORDER.find((plan) => audiences[plan] !== false) ?? null;
}

// Three-state view of a feature for a given audience, driving the UI:
//   "hidden" — master kill-switch is off; the feature does not exist for anyone
//              yet, so never advertise an upgrade for it (drop the nav item).
//   "on"     — the audience has access; render the real thing.
//   "locked" — the audience is denied; render blurred behind an upgrade gate.
export function getFeatureState(flag, audience) {
  if (flag && flag.enabled === false) return "hidden";
  return evaluateFlag(flag, audience) ? "on" : "locked";
}
