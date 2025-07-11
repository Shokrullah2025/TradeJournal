import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, UserPlus, TrendingUp, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { registerSchema } from "../utils/validation";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register: registerUser, loading } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password");

  const onSubmit = async (data) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      navigate("/");
    } catch (error) {
      // Error is handled in the auth context
    }
  };

  // Password strength indicator
  const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: "", color: "" };

    let score = 0;
    if (password.length >= 6) score++;
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

  return (
    <div className="min-h-screen flex">
      {/* Left side - Feature Highlight */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
          <div className="text-center text-white px-8">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-3xl font-bold mb-4">
              Start Your Trading Journey
            </h2>
            <p className="text-xl text-green-100 mb-8">
              Join thousands of traders who trust our platform to manage their
              portfolio.
            </p>{" "}
            <div className="grid grid-cols-1 gap-4 text-left max-w-md">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-300" />
                <span>7-day free trial</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-300" />
                <span>No setup fees</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-300" />
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-300" />
                <span>All Pro features included</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                Trade Journal Pro
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
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>
                <div className="mt-1">
                  <input
                    {...register("name")}
                    type="text"
                    autoComplete="name"
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter your full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.name.message}
                    </p>
                  )}
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
                    placeholder="Enter your email"
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
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

              <div className="flex items-center">
                <input
                  id="agree-terms"
                  name="agree-terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="agree-terms"
                  className="ml-2 block text-sm text-gray-900"
                >
                  I agree to the{" "}
                  <a href="#" className="text-blue-600 hover:text-blue-500">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-blue-600 hover:text-blue-500">
                    Privacy Policy
                  </a>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting || loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || loading ? (
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

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you'll get access to our free 7-day
                trial with email verification and payment method required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
