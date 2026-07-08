// Race a promise against a timeout. Resolves with `fallback` if the promise
// hasn't settled within `ms` — the original promise keeps running and callers
// may still consume its eventual result separately.
//
// Exists because a single stalled network request (never resolving, never
// rejecting) must not leave a blocking UI state — the auth bootstrap loading
// screen, the 2FA factor lookup — stuck forever. Confirmed production symptom:
// the app hung on the loading screen across refreshes when one of the profile
// reads stalled.
export const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export default withTimeout;
