// Hard navigation with a full page reload — used when in-memory state (feature
// flag audience, subscription entitlement) must re-resolve from scratch and a
// client-side navigate would race the route guards. Lives in its own module so
// tests can mock it: jsdom's window.location is [LegacyUnforgeable] and can't
// be spied on directly.
export const hardNavigate = (path) => window.location.assign(path);
