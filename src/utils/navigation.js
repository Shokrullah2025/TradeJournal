// Hard navigation with a full page reload — used when in-memory state (feature
// flag audience, subscription entitlement) must re-resolve from scratch and a
// client-side navigate would race the route guards. Lives in its own module so
// tests can mock it: jsdom's window.location is [LegacyUnforgeable] and can't
// be spied on directly.
export const hardNavigate = (path) => window.location.assign(path);

// Where every "Upgrade" CTA goes: Settings → Billing → Plans & Subscriptions.
// Both halves of the query matter. Without `tab=billing` the user lands on
// Settings' General tab; without `section=plans` Billing opens on its default
// Payment Information tab — so someone who just clicked "Upgrade to Pro" is
// shown their saved cards and has to go hunting for the plans they were sold.
// Kept here (not inlined) so the deep link can't drift between call sites.
export const UPGRADE_PLANS_PATH = "/settings?tab=billing&section=plans";
