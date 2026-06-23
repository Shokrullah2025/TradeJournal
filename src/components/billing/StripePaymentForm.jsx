import React, { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Shield } from "lucide-react";
import { toast } from "react-hot-toast";
import { stripePromise } from "../../lib/stripe";

// Format a Stripe minor-unit amount (e.g. cents) in its currency for display.
const formatMinorAmount = (minor, currency) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format((minor ?? 0) / 100);

const CheckoutForm = ({ onSuccess, onCancel, amount, totals }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Handles 3D Secure redirect case — user is returned here after auth
          return_url: `${window.location.origin}/billing?payment=success`,
        },
        // Avoid redirect for cards that don't need it (no unnecessary page reload)
        redirect: "if_required",
      });

      if (error) {
        toast.error(error.message || "Payment failed. Please try again.");
      } else if (
        paymentIntent?.status === "succeeded" ||
        paymentIntent?.status === "processing"
      ) {
        toast.success("Payment successful! Your subscription is being activated.");
        onSuccess();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      data-testid="stripe-payment-form"
    >
      <PaymentElement />

      {totals?.total != null && (
        <div
          className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-md p-3 space-y-1"
          data-testid="stripe-payment-totals"
        >
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span data-testid="stripe-payment-subtotal">
              {formatMinorAmount(totals.subtotal, totals.currency)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Tax (VAT/GST)</span>
            <span data-testid="stripe-payment-tax">
              {formatMinorAmount(totals.tax, totals.currency)}
            </span>
          </div>
          <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-600 pt-1 mt-1">
            <span>Total due today</span>
            <span data-testid="stripe-payment-total">
              {formatMinorAmount(totals.total, totals.currency)}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-md p-3">
        <Shield className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" />
        <span>Card details go directly to Stripe — never stored on our servers</span>
      </div>

      <div className="flex space-x-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
          data-testid="stripe-payment-cancel-btn"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 py-2 px-4 bg-blue-600 dark:bg-blue-700 text-white rounded-md text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
          data-testid="stripe-payment-submit-btn"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Processing...
            </span>
          ) : totals?.total != null ? (
            `Subscribe — ${formatMinorAmount(totals.total, totals.currency)}`
          ) : amount ? (
            `Subscribe — $${amount}`
          ) : (
            "Complete Payment"
          )}
        </button>
      </div>
    </form>
  );
};

const StripePaymentForm = ({ clientSecret, amount, totals, onSuccess, onCancel }) => {
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: { colorPrimary: "#2563eb" },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        onSuccess={onSuccess}
        onCancel={onCancel}
        amount={amount}
        totals={totals}
      />
    </Elements>
  );
};

export default StripePaymentForm;
