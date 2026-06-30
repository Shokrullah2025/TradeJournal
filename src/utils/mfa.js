import { supabase } from "../lib/supabase";

// Thin, testable wrapper around Supabase Auth's TOTP MFA API. Every function
// returns Supabase's `{ data, error }` shape and never throws, so callers can
// handle errors uniformly (toast / inline banner) without try/catch around each
// call. Used by both the Login step-up flow and the Security settings tab so the
// enroll/verify/list/unenroll logic lives in exactly one place.

/**
 * Begin TOTP enrollment. Returns a factor id plus the data needed to render the
 * setup screen: `totp.qr_code` is an SVG data-URL (render directly in an <img>,
 * no QR library required) and `totp.secret` is the manual-entry fallback.
 */
export function enrollTotp() {
  return supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Authenticator",
  });
}

/**
 * Verify a freshly enrolled factor with the 6-digit code from the user's
 * authenticator app. Creates a challenge then verifies it; on success the factor
 * becomes `verified` and the session is elevated to aal2.
 */
export async function verifyTotpEnrollment(factorId, code) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { data: null, error: challengeError };

  return supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
}

/**
 * List the user's MFA factors. A factor is only "active" when its `status` is
 * `verified` — unverified factors are abandoned enrollments and must be ignored.
 */
export function listFactors() {
  return supabase.auth.mfa.listFactors();
}

/** Remove an enrolled (or abandoned/unverified) TOTP factor. */
export function unenrollFactor(factorId) {
  return supabase.auth.mfa.unenroll({ factorId });
}

/**
 * Current vs. required authenticator assurance level. When a verified factor
 * exists but the session is still aal1, this returns
 * `{ currentLevel: 'aal1', nextLevel: 'aal2' }` — the signal that a TOTP
 * step-up is required to finish signing in.
 */
export function getAal() {
  return supabase.auth.mfa.getAuthenticatorAssuranceLevel();
}

/**
 * Challenge + verify an already-enrolled factor at login step-up time. Same pair
 * as enrollment verification, kept separate for call-site clarity.
 */
export async function challengeAndVerify(factorId, code) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return { data: null, error: challengeError };

  return supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
}
