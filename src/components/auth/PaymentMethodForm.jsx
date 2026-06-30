import React, { useState, useEffect } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, Lock, Shield } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { stripePromise, isStripeConfigured } from "../../lib/stripe";

const SetupForm = ({ onPaymentMethodAdded }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsLoading(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing?setup=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Failed to save payment method. Please try again.");
      } else if (setupIntent?.status === "succeeded") {
        toast.success("Payment method saved! Your trial is ready.");
        onPaymentMethodAdded?.({ paymentMethodId: setupIntent.payment_method });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      data-test-id="payment-method-form"
    >
      <PaymentElement />

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        data-test-id="payment-method-submit-btn"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            Saving...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Save Payment Method
          </span>
        )}
      </button>
    </form>
  );
};

const PaymentMethodForm = ({ onPaymentMethodAdded }) => {
  const [clientSecret, setClientSecret] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const { data, error } = await supabase.functions.invoke("stripe-setup-intent");
      if (cancelled) return;

      if (error || !data?.success) {
        setInitError(data?.error || "Failed to initialize payment form.");
      } else {
        setClientSecret(data.data.clientSecret);
      }
      setIsInitializing(false);
    };

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mx-auto">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Add Payment Method
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Add your card to start your 7-day free trial. You won't be charged until your trial ends.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Secured by Stripe
            </span>
          </div>
          <p className="mt-1 text-sm text-blue-700">
            Card details go directly to Stripe's servers via an encrypted iframe — they never touch our servers.
          </p>
        </div>

        {!isStripeConfigured ? (
          <div
            className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800"
            data-test-id="payment-method-not-configured"
          >
            Payments are temporarily unavailable. Please try again later or contact support.
          </div>
        ) : isInitializing ? (
          <div className="flex justify-center py-8" data-test-id="payment-method-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : initError ? (
          <div
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700"
            data-test-id="payment-method-error"
          >
            {initError}
          </div>
        ) : clientSecret ? (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: "stripe", variables: { colorPrimary: "#2563eb" } },
            }}
          >
            <SetupForm onPaymentMethodAdded={onPaymentMethodAdded} />
          </Elements>
        ) : null}

        <p className="text-center text-xs text-gray-500">
          By adding your payment method, you agree to our{" "}
          <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>
          {" "}and{" "}
          <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodForm;
