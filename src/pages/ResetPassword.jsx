import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Lock, TrendingUp } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { emitNotification } from "../utils/notifications";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Check if the user has a valid recovery session
  useEffect(() => {
    const checkRecoverySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[ResetPassword] Session error:", error.message);
          toast.error("Invalid or expired reset link. Please request a new one.");
          setValidSession(false);
          setCheckingSession(false);
          return;
        }

        if (session) {
          setValidSession(true);
        } else {
          toast.error("Invalid or expired reset link. Please request a new one.");
          setValidSession(false);
        }
      } catch (err) {
        console.error("[ResetPassword] Error checking session:", err);
        toast.error("Something went wrong. Please try again.");
        setValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    };

    checkRecoverySession();
  }, []);

  const onSubmit = async ({ password }) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        if (error.message.includes("same")) {
          toast.error("New password must be different from your old password.");
        } else {
          toast.error(error.message || "Failed to update password. Please try again.");
        }
        return;
      }

      toast.success("Password updated successfully! Redirecting to dashboard...");

      // Security notification (in-app only — not an email event), fire-and-forget.
      supabase.auth.getUser().then(({ data: userData }) => {
        const userId = userData?.user?.id;
        if (!userId) return;
        supabase
          .from("user_profiles")
          .select("preferences")
          .eq("user_id", userId)
          .maybeSingle()
          .then(({ data: profile }) => {
            emitNotification({
              userId,
              prefs: profile?.preferences?.notifications,
              record: {
                category: "security",
                event_type: "password_changed",
                title: "Your password was changed",
                body: "If this wasn't you, reset your password and contact support immediately.",
                severity: "warning",
                link_to: "/settings?tab=security",
              },
            });
          });
      });

      // Wait a moment for the toast to show, then redirect
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("[ResetPassword] Update error:", err);
      toast.error("Something went wrong. Please try again.");
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" data-testid="reset-password-checking-spinner" />
          <p className="text-gray-600 dark:text-gray-400">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen flex bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            <div className="flex items-center mb-6">
              <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h1 className="ml-3 text-2xl font-bold">Tradgella</h1>
            </div>

            <div
              className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
              data-testid="reset-password-invalid-session"
            >
              <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Invalid Reset Link</h2>
              <p className="text-sm text-red-700 dark:text-red-400 mb-4">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                data-testid="reset-password-back-to-login-btn"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Left — Reset Password Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h1 className="ml-3 text-2xl font-bold">Tradgella</h1>
          </div>

          <h2 className="text-3xl font-extrabold mb-2">Set new password</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            Enter a new password for your account. Make sure it's strong and secure.
          </p>

          <form
            className="space-y-6"
            onSubmit={handleSubmit(onSubmit)}
            data-testid="reset-password-form"
          >
            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Enter new password"
                  data-testid="reset-password-password-input"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(p => !p)}
                  data-testid="reset-password-toggle-password-btn"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword
                    ? <EyeOff className="h-5 w-5 text-gray-400" />
                    : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="reset-password-password-error">
                  {errors.password.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters with uppercase, lowercase, and a number
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  {...register("confirmPassword")}
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Confirm new password"
                  data-testid="reset-password-confirm-password-input"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(p => !p)}
                  data-testid="reset-password-toggle-confirm-password-btn"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword
                    ? <EyeOff className="h-5 w-5 text-gray-400" />
                    : <Eye className="h-5 w-5 text-gray-400" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" data-testid="reset-password-confirm-password-error">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="reset-password-submit-btn"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" data-testid="reset-password-loading-spinner" />
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Reset Password
                </>
              )}
            </button>
          </form>
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
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-3xl font-bold mb-4">Secure Your Account</h2>
            <p className="text-xl text-primary-100">
              Choose a strong password to protect your trading data and analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
