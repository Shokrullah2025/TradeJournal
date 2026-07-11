import React, { useState } from "react";
import PropTypes from "prop-types";
import { CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useBilling } from "../../context/BillingContext";
import { hardNavigate } from "../../utils/navigation";
import useSubscriptionPlans from "../../hooks/useSubscriptionPlans";
import StripePaymentForm from "../billing/StripePaymentForm";
import CouponField from "../billing/CouponField";

// The gate shown to a signed-in user who has already consumed their one free
// trial and has no live subscription: no second trial offer — they pay up
// front to re-enter the app. Mirrors TrialActivation's overlay card, but the
// checkout charges immediately (stripe-create-subscription) instead of
// starting a trial. The backend independently enforces the one-trial rule.
const SubscribeActivation = ({ planSlug = "premium", billingCycle = "monthly", variant = "page" }) => {
  const isOverlay = variant === "overlay";
  const { createCheckoutSession } = useBilling();
  const { plans } = useSubscriptionPlans();
  const plan = plans[planSlug];
  const monthlyPrice = plan?.price ?? 18;
  const planName = plan?.name ?? "Pro";

  const [isWorking, setIsWorking] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  // Applied (validated) coupon code — must be set before checkout starts,
  // since the discount is attached when the subscription is created.
  const [couponCode, setCouponCode] = useState(null);
  // After the card confirms, the webhook flips the subscription
  // suspended → active; show a short "activating" state before reloading so
  // the gate re-evaluates against the fresh entitlement.
  const [activating, setActivating] = useState(false);

  const beginCheckout = async () => {
    setIsWorking(true);
    setErrorMessage("");
    try {
      const cs = await createCheckoutSession(planSlug, billingCycle, couponCode);
      setClientSecret(cs);
    } catch (err) {
      setErrorMessage(err.message || "Failed to start checkout. Please try again.");
      toast.error(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setIsWorking(false);
    }
  };

  const handlePaid = () => {
    setActivating(true);
    toast.success("Payment received — activating your subscription…");
    // Give the Stripe webhook a moment to mark the subscription active, then
    // reload so RequireSubscription reads the fresh entitlement.
    setTimeout(() => hardNavigate("/dashboard"), 2500);
  };

  return (
    <div
      className={
        isOverlay
          ? "w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          : "min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
      }
      data-testid="subscribe-activation"
    >
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mx-auto">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Subscribe to continue
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your free trial has already been used. Pick up right where you left
            off — your data is safe and waiting.
          </p>
        </div>

        {/* Plan summary */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 border border-primary-200 rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{planName} plan</h3>
              <p className="text-sm text-gray-600">Billed {billingCycle === "annually" ? "annually" : "monthly"} · cancel anytime</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-primary-700" data-testid="subscribe-price">
                ${monthlyPrice}
              </span>
              <span className="text-sm text-gray-500">/mo</span>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div
            className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700"
            data-testid="subscribe-error-message"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {activating ? (
          <div className="flex flex-col items-center gap-3 py-6" data-testid="subscribe-activating">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            <p className="text-sm text-gray-600">Activating your subscription…</p>
          </div>
        ) : clientSecret ? (
          <div className="border border-gray-200 rounded-lg p-4 bg-white" data-testid="subscribe-card-input">
            <div className="flex items-center mb-3 text-sm font-medium text-gray-900">
              <CreditCard className="w-4 h-4 mr-2 text-primary-600" />
              Enter your card to subscribe
            </div>
            <StripePaymentForm
              clientSecret={clientSecret}
              submitLabel={`Pay $${monthlyPrice} & subscribe`}
              onSuccess={handlePaid}
              onCancel={() => setClientSecret(null)}
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Coupon must be applied before checkout starts — the discount is
                attached when the subscription is created. */}
            <div className="space-y-1.5" data-testid="subscribe-coupon">
              <p className="text-xs font-medium text-gray-500">Have a coupon code?</p>
              <CouponField
                onApply={setCouponCode}
                onClear={() => setCouponCode(null)}
                disabled={isWorking}
              />
            </div>

            <form
              data-testid="subscribe-form"
              onSubmit={(e) => {
                e.preventDefault();
                beginCheckout();
              }}
            >
              <button
                type="submit"
                disabled={isWorking}
                data-testid="subscribe-submit-btn"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isWorking ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Preparing checkout…
                  </span>
                ) : (
                  `Subscribe — $${monthlyPrice}/month`
                )}
              </button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-gray-500">
          Prices are in USD. Secured by Stripe — card data never touches our
          servers.
        </p>
      </div>
    </div>
  );
};

SubscribeActivation.propTypes = {
  planSlug: PropTypes.string,
  billingCycle: PropTypes.oneOf(["monthly", "annually"]),
  variant: PropTypes.oneOf(["page", "overlay"]),
};

export default SubscribeActivation;
