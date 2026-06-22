import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LogIn } from "lucide-react";
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
      await login(email, password);
      navigate(from, { replace: true });
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
            <div data-testid="forgot-password-panel">
              <h2 className="text-2xl font-extrabold mb-2">Reset your password</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Enter your email and we'll send you a reset link.
              </p>

              {resetSent ? (
                <div
                  className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-800 dark:text-green-300 text-sm"
                  data-testid="reset-sent-confirmation"
                >
                  Check your inbox — a reset link is on its way.
                </div>
              ) : (
                <form onSubmit={onForgotPassword} className="space-y-4" data-testid="forgot-password-form">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your email"
                      data-testid="forgot-password-email-input"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!forgotEmail}
                    className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="forgot-password-submit-btn"
                  >
                    Send Reset Link
                  </button>
                </form>
              )}

              <button
                onClick={() => { setShowForgotPassword(false); setResetSent(false); setForgotEmail(""); }}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                data-testid="back-to-login-btn"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-extrabold mb-2">Welcome back</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
                  data-testid="go-to-register-link"
                >
                  Sign up for free
                </Link>
              </p>

              <form
                className="space-y-6"
                onSubmit={handleSubmit(onSubmit)}
                data-testid="login-form"
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
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your email"
                    data-testid="login-email-input"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="login-email-error">
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
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Enter your password"
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(p => !p)}
                      data-testid="login-toggle-password-btn"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOff className="h-5 w-5 text-gray-400" />
                        : <Eye    className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="login-password-error">
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
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded cursor-pointer"
                      data-testid="login-remember-me-checkbox"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
                    data-testid="forgot-password-link"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="login-submit-btn"
                >
                  {isSubmitting || loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" data-testid="login-loading-spinner" />
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
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-800 dark:from-blue-700 dark:to-blue-900 flex items-center justify-center">
          <div className="text-center text-white px-8">
            <div className="text-6xl mb-6">📊</div>
            <h2 className="text-3xl font-bold mb-4">Track Your Trading Success</h2>
            <p className="text-xl text-blue-100 mb-8">
              Professional tools for analyzing your trading performance and maximizing profits.
            </p>
            <div className="grid grid-cols-1 gap-4 text-left max-w-md">
              {["Advanced Analytics Dashboard", "Risk Management Tools", "Performance Tracking", "Export & Reporting"].map(f => (
                <div key={f} className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-300 rounded-full" />
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
