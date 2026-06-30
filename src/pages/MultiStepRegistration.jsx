import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus, TrendingUp, Check, Mail, Star } from "lucide-react";
import { toast } from "react-hot-toast";
import { z } from "zod";

import { useAuth } from "../context/AuthContext";
import EmailVerification from "../components/auth/EmailVerification";

// Schema for user registration
const registrationSchema = z
  .object({
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    agreeToTerms: z
      .boolean()
      .refine((val) => val === true, "You must agree to the Terms of Service and Privacy Policy"),
    agreeToRefundPolicy: z
      .boolean()
      .refine((val) => val === true, "You must acknowledge the no-refund and auto-renewal policy"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const MultiStepRegistration = () => {
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(
    searchParams.get("step") || "account"
  );
  const [registrationData, setRegistrationData] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(registrationSchema),
  });

  const password = watch("password");

  const steps = [
    { id: "account", title: "Create Account", icon: UserPlus },
    { id: "email", title: "Verify Email", icon: Mail },
    { id: "trial", title: "Start Trial", icon: Star },
  ];

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    if (password.length >= 8) score++;
    if (password.match(/[a-z]/)) score++;
    if (password.match(/[A-Z]/)) score++;
    if (password.match(/[0-9]/)) score++;
    if (password.match(/[^a-zA-Z0-9]/)) score++;

    const labels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
    const colors = ["red", "orange", "yellow", "blue", "green"];

    return {
      score,
      label: labels[score - 1] || "",
      color: colors[score - 1] || "gray",
    };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleAccountCreation = async (data) => {
    try {
      await registerUser({
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        password: data.password,
      });

      // signUp() already sent the confirmation email and (with email
      // confirmation enabled) does NOT create a session — the user is not signed
      // in yet. Send them to the login page; the email-verify notice there tells
      // them to confirm their address before they can sign in. We pass the email
      // so that notice can show it. (registerUser already toasts the success.)
      navigate("/login", {
        replace: true,
        state: { verifyEmail: true, email: data.email },
      });
    } catch (error) {
      // Error handling is done in the AuthContext
    }
  };

  const handleEmailVerified = (userId) => {
    setRegistrationData((prev) => ({ ...prev, emailVerified: true, userId }));

    // Supabase Auth manages the session automatically — no token storage needed.
    // Send the user to the dashboard. They have no subscription yet, so
    // RequireSubscription renders it behind the TrialGate overlay where they
    // start their 7-day free trial (card up front). A full reload ensures the
    // FeatureFlag audience re-resolves to "free" so the gate appears.
    toast.success("Email verified! Add a card to start your free trial.");
    window.location.assign("/dashboard");
  };

  const handleResendEmail = () => {
    toast.info("Verification email resent. Please check your inbox.");
  };

  // Step 1: Account Creation
  if (currentStep === "account") {
    return (
      <>
        {/* While the signup request is in flight (it can be slow — the server
            sends the confirmation email synchronously), keep the form visible
            but dim it behind a translucent overlay with a spinner in front, so
            the user gets clear feedback instead of a frozen-looking page. */}
        {isSubmitting && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 backdrop-blur-[2px]"
            data-test-id="register-loading-overlay"
            role="status"
            aria-live="polite"
          >
            <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl">
              <div
                className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
                data-test-id="register-loading-spinner"
              />
              <p className="text-sm font-medium text-gray-700">
                Creating your account…
              </p>
            </div>
          </div>
        )}
      <div className="min-h-screen flex">
        {/* Left side - Feature Highlight */}
        <div className="hidden lg:block relative w-0 flex-1">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-800 flex items-center justify-center">
            <div className="text-center text-white px-8">
              <div className="text-6xl mb-6">�</div>
              <h2 className="text-3xl font-bold mb-4">
                Professional Trading Journal
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of traders who trust our platform to track and
                improve their trading performance.
              </p>
              <div className="grid grid-cols-1 gap-4 text-left max-w-md">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Advanced analytics</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Risk management tools</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Performance tracking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-300" />
                  <span>Export & reporting</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Registration Form */}
        <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
          <div className="mx-auto w-full max-w-sm lg:w-96">
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStepIndex;
                  const isCompleted = index < currentStepIndex;

                  return (
                    <div key={step.id} className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : isCompleted
                            ? "bg-green-600 text-white"
                            : "bg-gray-300 text-gray-500"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span
                        className={`text-xs mt-1 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(currentStepIndex / (steps.length - 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h1 className="ml-3 text-2xl font-bold text-gray-900">
                  Tradgella
                </h1>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Create your account
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-8">
              <form
                className="space-y-6"
                onSubmit={handleSubmit(handleAccountCreation)}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name
                    </label>
                    <div className="mt-1">
                      <input
                        {...register("firstName")}
                        type="text"
                        autoComplete="given-name"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.firstName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name
                    </label>
                    <div className="mt-1">
                      <input
                        {...register("lastName")}
                        type="text"
                        autoComplete="family-name"
                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Doe"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      {...register("email")}
                      type="email"
                      autoComplete="email"
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Password strength indicator */}
                  {password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 bg-${passwordStrength.color}-500`}
                            style={{
                              width: `${(passwordStrength.score / 5) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span
                          className={`text-xs font-medium text-${passwordStrength.color}-600`}
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                    </div>
                  )}

                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      {...register("confirmPassword")}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="flex items-start">
                  <input
                    {...register("agreeToTerms")}
                    id="agreeToTerms"
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    data-test-id="register-form-terms-checkbox"
                  />
                  <label
                    htmlFor="agreeToTerms"
                    className="ml-2 block text-sm text-gray-900 dark:text-gray-200"
                  >
                    I agree to the{" "}
                    <Link
                      to="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link
                      to="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      Privacy Policy
                    </Link>
                  </label>
                </div>
                {errors.agreeToTerms && (
                  <p className="mt-1 text-sm text-red-600" data-test-id="register-form-terms-error">
                    {errors.agreeToTerms.message}
                  </p>
                )}

                <div className="flex items-start">
                  <input
                    {...register("agreeToRefundPolicy")}
                    id="agreeToRefundPolicy"
                    type="checkbox"
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    data-test-id="register-form-refund-ack-checkbox"
                  />
                  <label
                    htmlFor="agreeToRefundPolicy"
                    className="ml-2 block text-sm text-gray-900 dark:text-gray-200"
                  >
                    I understand that all subscription charges are{" "}
                    <strong>final and non-refundable</strong> under any circumstances, and that my subscription{" "}
                    <strong>auto-renews</strong> until cancelled. I have read the{" "}
                    <Link
                      to="/refund"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-500 underline"
                    >
                      Refund & Billing Policy
                    </Link>
                    .
                  </label>
                </div>
                {errors.agreeToRefundPolicy && (
                  <p className="mt-1 text-sm text-red-600" data-test-id="register-form-refund-error">
                    {errors.agreeToRefundPolicy.message}
                  </p>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create Account
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // Step 2: Email Verification
  if (currentStep === "email") {
    return (
      <EmailVerification
        email={registrationData.email}
        onVerified={handleEmailVerified}
        onResendEmail={handleResendEmail}
      />
    );
  }

  // The trial is no longer a registration step — after email verification the
  // user is sent to the dashboard, which is gated by the TrialGate overlay
  // until they add a card. (See handleEmailVerified.)

  return null;
};

export default MultiStepRegistration;
