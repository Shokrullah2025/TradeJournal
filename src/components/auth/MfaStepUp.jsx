import React, { useState, useEffect } from "react";
import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { listFactors } from "../../utils/mfa";
import { totpCodeSchema } from "../../utils/validation";

// Full-screen 2FA step-up gate. Rendered by ProtectedRoute when the signed-in
// session is still aal1 but the account has a verified TOTP factor. It blocks
// every protected route until the 6-digit code is verified — covering the normal
// post-login flow, a page refresh, and any direct navigation, all in one place
// (mirrors the TrialGate overlay pattern). Escapes only via sign-out.
const MfaStepUp = () => {
  const { completeMfaLogin, logout } = useAuth();
  const [factorId, setFactorId] = useState(null);
  const [loadingFactor, setLoadingFactor] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Resolve the verified TOTP factor id on mount (we don't have it after a
  // refresh, so never rely on it being passed in).
  useEffect(() => {
    let cancelled = false;
    listFactors()
      .then(({ data }) => {
        if (cancelled) return;
        const totp = data?.totp?.find((f) => f.status === "verified");
        setFactorId(totp?.id ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingFactor(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const parsed = totpCodeSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    if (!factorId) {
      setError("Couldn't find your authenticator. Sign out and try again.");
      return;
    }

    setSubmitting(true);
    try {
      await completeMfaLogin(factorId, parsed.data.code);
      // On success the gate's `mfaRequired` flips false and ProtectedRoute
      // renders the real page — this component unmounts.
    } catch (err) {
      setError(err.message || "Invalid code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4"
      data-test-id="mfa-stepup-screen"
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 mb-4">
            <ShieldCheck className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Two-factor authentication
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit code from your authenticator app to finish signing in.
          </p>
        </div>

        {loadingFactor ? (
          <div className="flex items-center justify-center py-10" data-test-id="mfa-stepup-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" data-test-id="mfa-stepup-form">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              autoFocus
              className="input w-full text-center text-2xl tracking-[0.5em] font-semibold"
              data-test-id="mfa-stepup-code-input"
            />
            {error && (
              <p className="text-sm text-danger-600 dark:text-danger-400" data-test-id="mfa-stepup-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-gradient w-full justify-center"
              data-test-id="mfa-stepup-submit-btn"
            >
              {submitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                "Verify"
              )}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={logout}
          className="mt-6 w-full flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          data-test-id="mfa-stepup-signout-btn"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default MfaStepUp;
