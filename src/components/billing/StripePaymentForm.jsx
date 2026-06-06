import React, { useState } from "react";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Shield } from "lucide-react";
import { toast } from "react-hot-toast";

// Initialized once at module level — safe because publishable keys are public by design
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ onSuccess, onCancel, amount }) => {
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

const StripePaymentForm = ({ clientSecret, amount, onSuccess, onCancel }) => {
  const options = {
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: { colorPrimary: "#2563eb" },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm onSuccess={onSuccess} onCancel={onCancel} amount={amount} />
    </Elements>
  );
};

export default StripePaymentForm;
