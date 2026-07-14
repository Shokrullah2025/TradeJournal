import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn, MailCheck, CheckCircle, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loginSchema } from "../utils/validation";
import AuthNavbar from "../components/auth/AuthNavbar";

const REMEMBER_KEY = "tjp_remembered_email";

const Login = () => {
  const [showPassword, setShowPassword]             = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail]               = useState("");
  const [resetSent, setResetSent]                   = useState(false);
  // Initialise from localStorage so the checkbox reflects the previous choice
  const [rememberMe, setRememberMe] = useState(
    () => !!localStorage.getItem(REMEMBER_KEY)
  );

  const { login, sendPasswordReset, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || "/dashboard";

  // Shown once after sign-up: the account exists but the email isn't confirmed
  // yet, so the user must verify before they can sign in. Driven by the
  // navigation state set in the registration flow; dismissible.
  const [showVerifyNotice, setShowVerifyNotice] = useState(
    () => !!location.state?.verifyEmail
  );
  const verifyEmailAddress = location.state?.email || "";

  // Shown once after the confirmation link is clicked: the address is verified
  // and the user just needs to sign in (their first login offers the
  // authenticator setup). Driven by navigation state from AuthConfirm.
  const [showConfirmedNotice, setShowConfirmedNotice] = useState(
    () => !!location.state?.emailConfirmed
  );

  // Auto-dismiss the verify-email notice after 9s so it's readable but doesn't
  // linger forever. The X still lets the user close it sooner. Timer is cleared
  // on unmount / re-run to avoid setState after unmount.
  useEffect(() => {
    if (!showVerifyNotice) return;
    const timer = setTimeout(() => setShowVerifyNotice(false), 9000);
    return () => clearTimeout(timer);
  }, [showVerifyNotice]);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(loginSchema),
    // Pre-fill email if the user previously ticked "Remember me"
    defaultValues: {
      email:    localStorage.getItem(REMEMBER_KEY) || "",
      password: "",
    },
  });

  const onSubmit = async ({ email, password }) => {
    try {
      // Persist or clear the email depending on the current checkbox state
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      const result = await login(email, password);
      // 2FA step-up: do NOT navigate. Global `loading` stays true (keeping
      // this button's spinner running) until the session resolution lands
      // isAuthenticated + mfaRequired together; PublicRoute then redirects
      // and ProtectedRoute mounts the MFA gate directly. Navigating now
      // would hit ProtectedRoute before isAuthenticated is set and bounce
      // straight back here — the "login page flashes before the
      // Authenticator" bug.
      if (result?.status === "mfa_required") return;
      // First sign-in with no authenticator enrolled → one-time setup offer.
      // The wizard's onboarding mode has "Skip for now" → dashboard.
      if (result?.offerMfaSetup) {
        navigate("/security/2fa?onboarding=1", { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch {
      // error already shown via toast in AuthContext
    }
  };

  const onForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      await sendPasswordReset(forgotEmail);
      setResetSent(true);
    } catch {
      // error shown via toast
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Top navigation — brand, home link, and a direct path to the dashboard */}
      <AuthNavbar />

      <div className="flex flex-1">
      {/* Left — Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">

          {/* Forgot-password panel */}
          {showForgotPassword ? (
            <div data-test-id="forgot-password-panel">
              <h2 className="text-2xl font-extrabold mb-2">Reset your password</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {resetSent ? (
                <div
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-800 dark:text-green-300 text-sm"
                  data-test-id="reset-sent-confirmation"
                >
                  Check your inbox — a reset link is on its way.
                </div>
              ) : (
                <form onSubmit={onForgotPassword} className="space-y-4" data-test-id="forgot-password-form">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Enter your email"
                      data-test-id="forgot-password-email-input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!forgotEmail}
                    className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500"
                    data-test-id="forgot-password-submit-btn"
                  >
                    Send Reset Link
                  </button>
                </form>
              )}

              <button
                onClick={() => { setShowForgotPassword(false); setResetSent(false); setForgotEmail(""); }}
                className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                data-test-id="back-to-login-btn"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              {showConfirmedNotice && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-800 dark:text-green-200"
                  data-test-id="login-email-confirmed-notice"
                  role="status"
                >
                  <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="font-medium">Email verified!</p>
                    <p className="mt-1">
                      Your email address is confirmed. Sign in below to continue.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowConfirmedNotice(false)}
                    className="flex-shrink-0 text-green-500 hover:text-green-700 dark:hover:text-green-300"
                    aria-label="Dismiss"
                    data-test-id="login-email-confirmed-notice-dismiss-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {showVerifyNotice && (
                <div
                  className="mb-6 flex items-start gap-3 rounded-lg border border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 p-4 text-sm text-primary-800 dark:text-primary-200"
                  data-test-id="login-verify-email-notice"
                  role="status"
                >
                  <MailCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                  <div className="flex-1">
                    <p className="font-medium">Verify your email to sign in</p>
                    <p className="mt-1">
                      We've sent a verification link
                      {verifyEmailAddress ? <> to <span className="font-medium">{verifyEmailAddress}</span></> : null}.
                      Please confirm your email address before signing in — check your inbox and spam folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVerifyNotice(false)}
                    className="flex-shrink-0 text-primary-500 hover:text-primary-700 dark:hover:text-primary-300"
                    aria-label="Dismiss"
                    data-test-id="login-verify-email-notice-dismiss-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <h2 className="text-3xl font-extrabold mb-2">Welcome back</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500"
                  data-test-id="go-to-register-link"
                >
                  Sign up for free
                </Link>
              </p>

              <form
                className="space-y-6"
                onSubmit={handleSubmit(onSubmit)}
                data-test-id="login-form"
              >
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email address
                  </label>
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Enter your email"
                    data-test-id="login-email-input"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-test-id="login-email-error">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="Enter your password"
                      data-test-id="login-password-input"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 w-10 flex items-center justify-center"
                      onClick={() => setShowPassword(p => !p)}
                      data-test-id="login-toggle-password-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOff className="h-5 w-5 text-gray-400" />
                        : <Eye    className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-test-id="login-password-error">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded cursor-pointer"
                      data-test-id="login-remember-me-checkbox"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-500"
                    data-test-id="forgot-password-link"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-test-id="login-submit-btn"
                >
                  {isSubmitting || loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" data-test-id="login-loading-spinner" />
                  ) : (
                    <>
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign in
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Right — Feature highlight */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-400 via-primary-600 to-primary-900 flex items-center justify-center overflow-hidden">
          {/* Soft glows so the panel reads as a rich gradient, not a flat fill. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-primary-200/25 blur-3xl" />
            <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-primary-900/40 blur-3xl" />
          </div>
          <div className="relative text-center text-white px-8">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-3xl font-bold mb-4">Track Your Trading Success</h2>
            <p className="text-xl text-primary-100 mb-8">
              Professional tools for analyzing your trading performance and maximizing profits.
            </p>
            <div className="grid grid-cols-1 gap-4 text-left max-w-md">
              {["Advanced Analytics Dashboard", "Risk Management Tools", "Performance Tracking", "Export & Reporting"].map(f => (
                <div key={f} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-300 rounded-full" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Login;
