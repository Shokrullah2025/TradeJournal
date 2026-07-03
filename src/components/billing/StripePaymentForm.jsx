import React, { useState } from "react";
import PropTypes from "prop-types";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Shield, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { formatStripeError } from "../../utils/stripeErrors";
import { stripePromise, isStripeConfigured } from "../../lib/stripe";

const CheckoutForm = ({ clientSecret, onSuccess, onCancel, amount, mode, submitLabel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  // Persistent, inline card error (e.g. expired card, wrong CVC, declined) shown
  // under the card field — survives until the user edits the card or resubmits.
  const [cardError, setCardError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setCardError("");
    try {
      if (mode === "setup") {
        // A SetupIntent can only be confirmed once. If the card was already
        // confirmed on a previous attempt but a later step failed (e.g. starting
        // the trial errored), re-confirming the same SetupIntent makes Stripe
        // throw `setup_intent_unexpected_state` ("already succeeded"). Check the
        // real state first and reuse the verified card instead of confirming again
        // — this lets the genuine downstream error surface on retry.
        const { setupIntent: existing } = await stripe.retrieveSetupIntent(clientSecret);
        if (existing?.status === "succeeded") {
          onSuccess(existing.payment_method);
          return;
        }

        // Trial flow: collect & confirm the card without charging it. The resulting
        // payment method is handed back so the caller can start a trial subscription
        // that auto-charges when the trial ends.
        const { error, setupIntent } = await stripe.confirmSetup({
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/billing?setup=success`,
          },
          redirect: "if_required",
        });

        if (error) {
          const msg = formatStripeError(error);
          setCardError(msg);
          toast.error(msg);
        } else if (setupIntent?.status === "succeeded") {
          onSuccess(setupIntent.payment_method);
        } else {
          // e.g. requires_action / processing that didn't resolve — don't leave
          // the user on a button that appears to do nothing.
          const msg = "Your card needs additional verification. Please try a different card.";
          setCardError(msg);
          toast.error(msg);
        }
        return;
      }

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
        const msg = formatStripeError(error);
        setCardError(msg);
        toast.error(msg);
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
      <PaymentElement onChange={() => cardError && setCardError("")} />

      {cardError && (
        <div
          className="flex items-start space-x-2 text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3"
          data-testid="stripe-card-error"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500 dark:text-red-400" />
          <span>{cardError}</span>
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
          className="flex-1 py-2 px-4 bg-primary-600 dark:bg-primary-700 text-white rounded-md text-sm font-medium hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50"
          data-testid="stripe-payment-submit-btn"
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Processing...
            </span>
          ) : submitLabel ? (
            submitLabel
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

const StripePaymentForm = ({
  clientSecret,
  customerSessionClientSecret,
  amount,
  onSuccess,
  onCancel,
  mode = "payment",
  submitLabel,
}) => {
  // Billing is unavailable if VITE_STRIPE_PUBLISHABLE_KEY was not set at build
  // time. Show a friendly message instead of mounting <Elements stripe={null}>.
  if (!isStripeConfigured) {
    return (
      <div
        className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 flex items-start gap-2"
        data-testid="stripe-not-configured"
      >
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <span>Payments are temporarily unavailable. Please try again later or contact support.</span>
      </div>
    );
  }

  const options = {
    clientSecret,
    // When present, the Payment Element shows this customer's previously saved
    // cards (one-click "quick checkout") instead of only a blank card form.
    // Omitted when there's no session secret so Elements isn't passed undefined.
    ...(customerSessionClientSecret ? { customerSessionClientSecret } : {}),
    appearance: {
      theme: "stripe",
      variables: { colorPrimary: "#2563eb" },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onCancel={onCancel}
        amount={amount}
        mode={mode}
        submitLabel={submitLabel}
      />
    </Elements>
  );
};

const checkoutPropTypes = {
  clientSecret: PropTypes.string,
  onSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  mode: PropTypes.oneOf(["payment", "setup"]),
  submitLabel: PropTypes.string,
};

CheckoutForm.propTypes = checkoutPropTypes;

StripePaymentForm.propTypes = {
  ...checkoutPropTypes,
  clientSecret: PropTypes.string.isRequired,
  customerSessionClientSecret: PropTypes.string,
};

export default StripePaymentForm;
