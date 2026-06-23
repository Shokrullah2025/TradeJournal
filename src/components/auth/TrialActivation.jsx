import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Clock, CheckCircle, Star, ArrowRight, CreditCard } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useBilling } from "../../context/BillingContext";
import StripePaymentForm from "../billing/StripePaymentForm";

const TrialActivation = ({
  onTrialActivated,
  planSlug = "pro",
  billingCycle = "monthly",
}) => {
  // intro → card (collect card) → activated. `error` shows a recoverable message.
  const [trialStatus, setTrialStatus] = useState("intro");
  const [isWorking, setIsWorking] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [trialEnd, setTrialEnd] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { startTrial } = useBilling();

  // Step 1 — create a SetupIntent so the user can enter a card without being charged.
  const beginTrial = async () => {
    setIsWorking(true);
    setErrorMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Without a valid session the request can't be authorized — stop early
      // rather than firing a `Bearer undefined` request.
      if (!session?.access_token) {
        setErrorMessage("Please sign in to start your trial.");
        toast.error("Please sign in to start your trial.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("stripe-setup-intent");
      if (error || !data?.success) {
        throw new Error(data?.error || "Failed to start your trial");
      }

      setClientSecret(data.data.clientSecret);
      setCustomerId(data.data.customerId);
      setTrialStatus("card");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  // Step 2 — the card was confirmed client-side; start the trial subscription.
  const handleCardConfirmed = async (paymentMethodId) => {
    setIsWorking(true);
    setErrorMessage("");
    try {
      const result = await startTrial(planSlug, billingCycle, paymentMethodId, customerId);
      setTrialEnd(result?.trialEnd ?? null);
      setTrialStatus("activated");
      toast.success("Your 7-day free trial has started!");
      onTrialActivated?.(result);
    } catch (err) {
      setErrorMessage(err.message || "We couldn't start your trial. Please try again.");
      toast.error(err.message || "We couldn't start your trial. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const trialFeatures = [
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Unlimited Trade Entries",
      description: "Log as many trades as you want during your trial",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Advanced Analytics",
      description: "Track your performance with detailed charts and metrics",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Risk Management Tools",
      description: "Set stop losses, take profits, and manage your risk",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Export & Reporting",
      description: "Export your data and generate professional reports",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Mobile Access",
      description: "Access your journal from any device, anywhere",
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-green-500" />,
      title: "Priority Support",
      description: "Get help when you need it with our dedicated support team",
    },
  ];

  if (trialStatus === "activated") {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
        data-testid="trial-activated-state"
      >
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-full mx-auto">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to Trade Journal Pro!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your 7-day free trial has been successfully activated.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">
                  Trial Period
                </span>
              </div>
              <span className="text-sm font-bold text-green-800">
                7 Days Remaining
              </span>
            </div>
            <p className="text-sm text-green-700" data-testid="trial-end-date">
              {trialEnd
                ? `Your card will be charged on ${format(new Date(trialEnd), "MMM d, yyyy")} unless you cancel before then. You have full access to all Pro features until your trial ends.`
                : "You'll have full access to all Pro features during your trial. Cancel anytime before it ends to avoid being charged."}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 text-center">
              What's included in your trial:
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {trialFeatures.slice(0, 4).map((feature, index) => (
                <div key={index} className="flex items-start space-x-3">
                  {feature.icon}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-600 text-center">
              + All premium features and unlimited access
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Complete Your Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mx-auto">
            <Star className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Ready to Start Your Trial?
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            You're all set! Activate your 7-day free trial and start tracking
            your trades like a pro.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              7-Day Free Trial
            </h3>
            <span className="text-2xl font-bold text-blue-600">$0</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            No commitment, cancel anytime. After your 7 days, your plan continues
            automatically at $29.99/month unless you cancel.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {trialFeatures.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                {feature.icon}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-sm font-medium text-yellow-800">
              Trial Details
            </span>
          </div>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="space-y-1">
              <li>• $0 charged today — your card is only verified</li>
              <li>• Full access to all Pro features for 7 days</li>
              <li>• Cancel anytime before it ends and you won't be charged</li>
              <li>• Otherwise it converts to a paid plan automatically</li>
            </ul>
          </div>
        </div>

        {errorMessage && (
          <div
            className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700"
            data-testid="trial-error-message"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {trialStatus === "card" && clientSecret ? (
          <div
            className="border border-gray-200 rounded-lg p-4 bg-white"
            data-testid="trial-card-input"
          >
            <div className="flex items-center mb-3 text-sm font-medium text-gray-900">
              <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
              Add a card to start your trial
            </div>
            <StripePaymentForm
              clientSecret={clientSecret}
              mode="setup"
              submitLabel={isWorking ? "Starting trial…" : "Start free trial"}
              onSuccess={handleCardConfirmed}
              onCancel={() => setTrialStatus("intro")}
            />
          </div>
        ) : (
          <form
            data-testid="trial-activate-form"
            onSubmit={(e) => {
              e.preventDefault();
              beginTrial();
            }}
          >
            <button
              type="submit"
              disabled={isWorking}
              data-testid="trial-activate-submit-btn"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isWorking ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Starting Your Trial...
                </div>
              ) : (
                <div className="flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  Start 7-Day Free Trial
                </div>
              )}
            </button>
          </form>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By starting your trial, you agree to our{" "}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

TrialActivation.propTypes = {
  onTrialActivated: PropTypes.func,
  planSlug: PropTypes.string,
  billingCycle: PropTypes.oneOf(["monthly", "annually"]),
};

export default TrialActivation;
