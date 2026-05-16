import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus, TrendingUp, Check, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { registerSchema } from "../utils/validation";

// Password strength meter
const getPasswordStrength = (password = "") => {
  let score = 0;
  if (password.length >= 8)             score++;
  if (/[a-z]/.test(password))           score++;
  if (/[A-Z]/.test(password))           score++;
  if (/[0-9]/.test(password))           score++;
  if (/[^a-zA-Z0-9]/.test(password))    score++;
  const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const colors = ["red",       "orange", "yellow", "blue", "green"];
  return { score, label: labels[score - 1] ?? "", color: colors[score - 1] ?? "gray" };
};

const Register = () => {
  const [showPassword, setShowPassword]           = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailSent, setEmailSent]                 = useState(false);
  const [registeredEmail, setRegisteredEmail]     = useState("");

  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { agreeToTerms: false },
  });

  const password         = watch("password");
  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (data) => {
    try {
      await registerUser({
        firstName: data.firstName,
        lastName:  data.lastName,
        email:     data.email,
        password:  data.password,
      });
      setRegisteredEmail(data.email);
      setEmailSent(true);
    } catch {
      // error shown via toast in AuthContext
    }
  };

  // ── Email-sent confirmation screen ───────────────────────────────────────
  if (emailSent) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 px-4"
        data-testid="register-email-sent-screen"
      >
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-6">
            <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            Verify your email
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            We sent a confirmation link to
          </p>
          <p className="font-semibold text-gray-900 dark:text-gray-100 mb-6" data-testid="register-sent-email">
            {registeredEmail}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Click the link in the email to activate your account. Check your spam folder if you don't see it.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
            data-testid="go-to-login-after-register-btn"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Left — Feature highlight */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
          <div className="text-center text-white px-8">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-3xl font-bold mb-4">Start Your Trading Journey</h2>
            <p className="text-xl text-green-100 mb-8">
              Join thousands of traders who trust our platform.
            </p>
            <div className="grid grid-cols-1 gap-4 text-left max-w-md">
              {["7-day free trial", "No setup fees", "Cancel anytime", "All Pro features included"].map(f => (
                <div key={f} className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">

          {/* Logo */}
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="ml-3 text-2xl font-bold">Trade Journal Pro</h1>
          </div>

          <h2 className="text-3xl font-extrabold mb-2">Create your account</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500"
              data-testid="go-to-login-link"
            >
              Sign in here
            </Link>
          </p>

          <form
            className="space-y-5"
            onSubmit={handleSubmit(onSubmit)}
            data-testid="register-form"
          >
            {/* First name + Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First name
                </label>
                <input
                  {...register("firstName")}
                  type="text"
                  autoComplete="given-name"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="First name"
                  data-testid="register-first-name-input"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" data-testid="register-first-name-error">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last name
                </label>
                <input
                  {...register("lastName")}
                  type="text"
                  autoComplete="family-name"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Last name"
                  data-testid="register-last-name-input"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400" data-testid="register-last-name-error">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

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
                data-testid="register-email-input"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="register-email-error">
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
                  autoComplete="new-password"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Create a password"
                  data-testid="register-password-input"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(p => !p)}
                  data-testid="register-toggle-password-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>

              {/* Strength meter */}
              {password && (
                <div className="mt-2" data-testid="password-strength-meter">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 bg-${passwordStrength.color}-500`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        data-testid="password-strength-bar"
                      />
                    </div>
                    <span
                      className={`text-xs font-medium text-${passwordStrength.color}-600`}
                      data-testid="password-strength-label"
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="register-password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm password
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm your password"
                  data-testid="register-confirm-password-input"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(p => !p)}
                  data-testid="register-toggle-confirm-password-btn"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="register-confirm-password-error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                {...register("agreeToTerms")}
                type="checkbox"
                className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded"
                data-testid="register-agree-terms-checkbox"
              />
              <label className="text-sm text-gray-900 dark:text-gray-100">
                I agree to the{" "}
                <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
              </label>
            </div>
            {errors.agreeToTerms && (
              <p className="text-sm text-red-600 dark:text-red-400" data-testid="register-terms-error">
                {errors.agreeToTerms.message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="register-submit-btn"
            >
              {isSubmitting || loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" data-testid="register-loading-spinner" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
            You'll get a 7-day free trial after email verification. No credit card required to start.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
