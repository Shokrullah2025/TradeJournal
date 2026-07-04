import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Shield,
  QrCode,
  KeyRound,
  Check,
  Copy,
  Smartphone,
  Lock,
  Zap,
  ArrowLeft,
  ArrowRight,
  PartyPopper,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/logActivity";
import { totpCodeSchema } from "../utils/validation";
import {
  enrollTotp,
  verifyTotpEnrollment,
  listFactors,
  unenrollFactor,
} from "../utils/mfa";
import TotpCodeInput from "../components/auth/TotpCodeInput";

// Standalone Authenticator (2FA) setup wizard: Intro → Scan → Verify → Done.
// Routed at /security/2fa OUTSIDE the app shell so it works for brand-new
// accounts that haven't started a trial yet (RequireSubscription would blur it
// behind the TrialGate). Reached from:
//   • the first sign-in after email confirmation — Login routes here when the
//     account has no authenticator (?onboarding=1 → offers "Skip for now")
//   • Settings → Security → "Set up"
// All Supabase MFA calls go through src/utils/mfa.js.

const STEPS = [
  { id: "intro", label: "Why 2FA", icon: Shield },
  { id: "scan", label: "Scan code", icon: QrCode },
  { id: "verify", label: "Verify", icon: KeyRound },
  { id: "done", label: "Done", icon: Check },
];

const BENEFITS = [
  {
    icon: Lock,
    title: "Stops password-only attacks",
    text: "Even if someone steals your password, they can't get into your trades without your phone.",
  },
  {
    icon: Smartphone,
    title: "Works with any authenticator app",
    text: "Google Authenticator, Microsoft Authenticator, Authy, 1Password — codes work fully offline.",
  },
  {
    icon: Zap,
    title: "Set up in about a minute",
    text: "Scan one QR code, type one 6-digit code, and your account is locked down.",
  },
];

const APP_SUGGESTIONS = [
  "Google Authenticator",
  "Microsoft Authenticator",
  "Authy",
  "1Password",
];

// ── Step progress rail across the top of the card ─────────────────────────────
const StepRail = ({ activeIndex }) => (
  <ol className="flex items-center justify-center gap-0" aria-label="Setup progress">
    {STEPS.map((step, i) => {
      const Icon = step.icon;
      const isDone = i < activeIndex;
      const isActive = i === activeIndex;
      return (
        <li key={step.id} className="flex items-center">
          {i > 0 && (
            <div
              className={`h-0.5 w-6 sm:w-10 rounded-full transition-colors duration-300 ${
                i <= activeIndex ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-700"
              }`}
            />
          )}
          <div className="flex flex-col items-center mx-1.5 sm:mx-2">
            <div
              className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${
                isDone
                  ? "bg-primary-500 border-primary-500 text-white"
                  : isActive
                  ? "border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30"
                  : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
              }`}
            >
              {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span
              className={`mt-1.5 text-[11px] font-medium hidden sm:block ${
                isActive
                  ? "text-primary-600 dark:text-primary-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              {step.label}
            </span>
          </div>
        </li>
      );
    })}
  </ol>
);

StepRail.propTypes = {
  activeIndex: PropTypes.number.isRequired,
};

const AuthenticatorSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Arrived right after registration/email-confirm: soften the tone and offer
  // "Skip for now" instead of "Back to settings".
  const onboarding = searchParams.get("onboarding") === "1";

  const [step, setStep] = useState("loading"); // loading | already | intro | scan | verify | done
  const [existingFactor, setExistingFactor] = useState(null);
  const [enroll, setEnroll] = useState(null); // { factorId, qr, secret }
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeIndex = Math.max(STEPS.findIndex((s) => s.id === step), 0);

  // If 2FA is already on, don't re-enroll — show the "already protected" state.
  useEffect(() => {
    let cancelled = false;
    listFactors()
      .then(({ data }) => {
        if (cancelled) return;
        const verified = data?.totp?.find((f) => f.status === "verified") ?? null;
        setExistingFactor(verified);
        setStep(verified ? "already" : "intro");
      })
      .catch(() => {
        if (!cancelled) setStep("intro");
      });
    return () => { cancelled = true; };
  }, []);

  const leave = useCallback(() => {
    navigate(onboarding ? "/dashboard" : "/settings?tab=security", { replace: true });
  }, [navigate, onboarding]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clear abandoned (unverified) enrollments first — Supabase rejects a new
      // factor with the same friendly name while a stale one exists.
      const { data: factors } = await listFactors();
      const stale = factors?.totp?.filter((f) => f.status !== "verified") ?? [];
      await Promise.all(stale.map((f) => unenrollFactor(f.id)));

      const { data, error } = await enrollTotp();
      if (error) {
        toast.error(error.message || "Couldn't start two-factor setup. Please try again.");
        return;
      }
      setEnroll({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
      setCode("");
      setCodeError("");
      setStep("scan");
    } finally {
      setBusy(false);
    }
  };

  const cancelEnroll = async () => {
    if (enroll?.factorId) await unenrollFactor(enroll.factorId); // drop the unverified factor
    setEnroll(null);
    setCode("");
    setCodeError("");
    setStep("intro");
  };

  const verify = async (submittedCode) => {
    if (busy) return;
    setCodeError("");
    const parsed = totpCodeSchema.safeParse({ code: submittedCode });
    if (!parsed.success) {
      setCodeError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    try {
      const { error } = await verifyTotpEnrollment(enroll.factorId, parsed.data.code);
      if (error) {
        setCodeError("That code didn't match. Wait for a fresh code in your app and try again.");
        setCode("");
        return;
      }
      logActivity(user?.id, "mfa_enrolled", {});
      setStep("done");
    } finally {
      setBusy(false);
    }
  };

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(enroll.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the key is visible to type manually.
    }
  };

  // Group the secret into blocks of 4 so it's readable when typed by hand.
  const prettySecret = enroll?.secret?.replace(/(.{4})/g, "$1 ").trim();

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-10"
      data-testid="authenticator-setup-page"
    >
      <div className="w-full max-w-xl">
        {/* Progress rail (hidden on the pre-flight states) */}
        {step !== "loading" && step !== "already" && (
          <div className="mb-8">
            <StepRail activeIndex={activeIndex} />
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl shadow-gray-900/5 overflow-hidden">
          {/* ── Loading ─────────────────────────────────────────────────── */}
          {step === "loading" && (
            <div className="flex items-center justify-center py-24" data-testid="mfa-setup-loading">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          )}

          {/* ── Already enrolled ────────────────────────────────────────── */}
          {step === "already" && (
            <div className="px-6 sm:px-10 py-10 text-center" data-testid="mfa-setup-already-enabled">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 dark:bg-green-900/30 mb-5">
                <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Your account is already protected
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Two-factor authentication has been on since{" "}
                {existingFactor?.created_at
                  ? format(new Date(existingFactor.created_at), "MMMM d, yyyy")
                  : "you enabled it"}
                . You can manage or remove it from Security settings.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="btn btn-gradient justify-center"
                  data-testid="mfa-setup-dashboard-btn"
                >
                  Go to dashboard
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/settings?tab=security")}
                  className="btn btn-secondary justify-center"
                  data-testid="mfa-setup-manage-btn"
                >
                  Manage in settings
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Intro ───────────────────────────────────────────── */}
          {step === "intro" && (
            <div data-testid="mfa-setup-intro">
              <div className="px-6 sm:px-10 pt-10 pb-8 text-center bg-gradient-to-b from-primary-50/70 to-transparent dark:from-primary-900/15">
                <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-600/30 mb-5">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {onboarding ? "One last step: secure your account" : "Set up your authenticator"}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  Your trading history, broker connections, and billing live here.
                  A 6-digit code from your phone keeps them yours — even if your password leaks.
                </p>
              </div>

              <div className="px-6 sm:px-10 pb-8 space-y-4">
                {BENEFITS.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-start gap-3.5">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</div>
                      <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{text}</div>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                    Works with
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {APP_SUGGESTIONS.map((app) => (
                      <span
                        key={app}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-10 py-5 border-t border-gray-100 dark:border-gray-700/70 bg-gray-50/60 dark:bg-gray-800/60 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={startEnroll}
                  disabled={busy}
                  className="btn btn-gradient flex items-center justify-center gap-2"
                  data-testid="mfa-setup-start-btn"
                >
                  {busy ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                  ) : (
                    <>
                      Set up authenticator
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={leave}
                  disabled={busy}
                  className="btn btn-secondary justify-center text-gray-600 dark:text-gray-300"
                  data-testid="mfa-setup-skip-btn"
                >
                  {onboarding ? "Skip for now" : "Back to settings"}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Scan QR ─────────────────────────────────────────── */}
          {step === "scan" && enroll && (
            <div data-testid="mfa-setup-scan">
              <div className="px-6 sm:px-10 pt-8 pb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Scan with your authenticator app
                </h1>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                  Open your authenticator app, tap “Add account”, and point your camera at this code.
                </p>
              </div>

              <div className="px-6 sm:px-10 pb-8 flex flex-col items-center gap-5">
                <div className="p-3 rounded-2xl bg-white ring-1 ring-gray-200 dark:ring-gray-600 shadow-lg shadow-gray-900/5">
                  <img
                    src={enroll.qr}
                    alt="Two-factor authentication QR code"
                    className="w-48 h-48"
                    data-testid="mfa-setup-qr"
                  />
                </div>

                <div className="w-full max-w-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center mb-2">
                    Can't scan? Enter this key manually
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
                    <code
                      className="flex-1 min-w-0 break-all text-center text-sm font-semibold tracking-wide text-gray-800 dark:text-gray-200"
                      data-testid="mfa-setup-secret"
                    >
                      {prettySecret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex-shrink-0 transition-colors"
                      aria-label="Copy setup key"
                      data-testid="mfa-setup-copy-secret-btn"
                    >
                      {copied
                        ? <Check className="w-4 h-4 text-green-500" />
                        : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-10 py-5 border-t border-gray-100 dark:border-gray-700/70 bg-gray-50/60 dark:bg-gray-800/60 flex flex-col sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={() => setStep("verify")}
                  className="btn btn-gradient flex items-center justify-center gap-2"
                  data-testid="mfa-setup-scanned-btn"
                >
                  I've added it — continue
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelEnroll}
                  className="btn btn-secondary flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300"
                  data-testid="mfa-setup-scan-back-btn"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Verify code ─────────────────────────────────────── */}
          {step === "verify" && enroll && (
            <div data-testid="mfa-setup-verify">
              <div className="px-6 sm:px-10 pt-8 pb-6 text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Enter your first code
                </h1>
                <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-400">
                  Type the 6-digit code your authenticator app is showing right now.
                </p>
              </div>

              <form
                className="px-6 sm:px-10 pb-8"
                onSubmit={(e) => { e.preventDefault(); verify(code); }}
                data-testid="mfa-setup-verify-form"
              >
                <TotpCodeInput
                  value={code}
                  onChange={(next) => { setCode(next); setCodeError(""); }}
                  onComplete={verify}
                  disabled={busy}
                  autoFocus
                  testIdPrefix="mfa-setup-code-input"
                />
                {codeError && (
                  <p
                    className="mt-3 text-sm text-danger-600 dark:text-danger-400 text-center"
                    data-testid="mfa-setup-verify-error"
                  >
                    {codeError}
                  </p>
                )}
                <p className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                  Codes refresh every 30 seconds — if one is rejected, just try the next one.
                </p>

                <div className="mt-6 flex flex-col sm:flex-row-reverse gap-3">
                  <button
                    type="submit"
                    disabled={busy || code.length !== 6}
                    className="btn btn-gradient justify-center disabled:opacity-50"
                    data-testid="mfa-setup-verify-btn"
                  >
                    {busy ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
                    ) : (
                      "Verify & turn on"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("scan")}
                    disabled={busy}
                    className="btn btn-secondary flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300"
                    data-testid="mfa-setup-verify-back-btn"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to QR code
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ── Step 4: Done ────────────────────────────────────────────── */}
          {step === "done" && (
            <div className="px-6 sm:px-10 py-12 text-center" data-testid="mfa-setup-done">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-5">
                <PartyPopper className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Two-factor is on
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                From now on, signing in takes your password plus a code from your
                authenticator app. Keep the app installed — you'll need it every time.
              </p>
              <div className="mt-8">
                <button
                  type="button"
                  onClick={leave}
                  className="btn btn-gradient justify-center"
                  data-testid="mfa-setup-done-btn"
                >
                  {onboarding ? "Continue to dashboard" : "Back to settings"}
                </button>
              </div>
            </div>
          )}
        </div>

        {step !== "loading" && step !== "done" && step !== "already" && (
          <p className="mt-5 text-center text-xs text-gray-400 dark:text-gray-500">
            You can turn two-factor authentication on or off anytime in Settings → Security.
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthenticatorSetup;
