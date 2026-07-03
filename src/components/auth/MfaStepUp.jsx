import React, { useState, useEffect } from "react";
import { ShieldCheck, LogOut, KeyRound, Lock, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { listFactors } from "../../utils/mfa";
import { totpCodeSchema } from "../../utils/validation";
import TotpCodeInput from "./TotpCodeInput";

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

  const submitCode = async (submittedCode) => {
    if (submitting) return;
    setError("");

    const parsed = totpCodeSchema.safeParse({ code: submittedCode });
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
      setCode(""); // clear for a fresh attempt
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCode(code);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 px-4 py-10"
      data-testid="mfa-stepup-screen"
    >
      {/* Decorative brand glow — purely visual, sits behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl dark:bg-primary-500/10" />
        <div className="absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-600/20 blur-3xl dark:bg-primary-700/10" />
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-300/10 blur-3xl dark:bg-teal-400/5" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-gray-200/70 bg-white/80 p-8 shadow-2xl shadow-primary-900/10 backdrop-blur-xl dark:border-gray-700/60 dark:bg-gray-800/70 sm:p-10">
          {/* Hero — gradient shield badge with a soft pulsing glow. */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-6">
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-pulse rounded-2xl bg-primary-500/40 blur-xl"
              />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/40">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              Verify it's you
            </h1>
            <p className="mt-2 max-w-xs text-sm text-gray-600 dark:text-gray-400">
              Enter the 6-digit code from your authenticator app to finish
              signing in.
            </p>
          </div>

          {/* Body */}
          <div className="mt-8">
            {loadingFactor ? (
              <div
                className="flex items-center justify-center py-10"
                data-testid="mfa-stepup-loading"
              >
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="space-y-5"
                data-testid="mfa-stepup-form"
              >
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  <KeyRound className="h-3.5 w-3.5" />
                  Authentication code
                </div>

                <TotpCodeInput
                  value={code}
                  onChange={(next) => { setCode(next); setError(""); }}
                  onComplete={submitCode}
                  disabled={submitting}
                  autoFocus
                  testIdPrefix="mfa-stepup-code-input"
                />

                {error && (
                  <div
                    className="flex items-center justify-center gap-2 rounded-xl border border-danger-200 bg-danger-50 px-3 py-2.5 text-sm text-danger-600 dark:border-danger-900/50 dark:bg-danger-900/20 dark:text-danger-400"
                    data-testid="mfa-stepup-error"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || code.length !== 6}
                  className="btn btn-gradient w-full disabled:cursor-not-allowed disabled:opacity-60"
                  data-testid="mfa-stepup-submit-btn"
                >
                  <span className="inline-flex w-full items-center justify-center gap-2 leading-none">
                    {submitting ? (
                      <span className="h-5 w-5 animate-spin rounded-full border-b-2 border-current" />
                    ) : (
                      <>
                        <Lock className="h-4 w-4 flex-shrink-0" />
                        <span>Verify &amp; continue</span>
                      </>
                    )}
                  </span>
                </button>

                <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                  Codes refresh every 30 seconds — if one is rejected, wait for
                  the next and try again.
                </p>
              </form>
            )}
          </div>

          {/* Footer — the only escape hatch is signing out. */}
          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-700/60">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              data-testid="mfa-stepup-signout-btn"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-gray-400 dark:text-gray-500">
          <Lock className="h-3 w-3" />
          Protected by two-factor authentication
        </p>
      </div>
    </div>
  );
};

export default MfaStepUp;
