import React, { useState } from "react";
import PropTypes from "prop-types";
import { Check, CreditCard, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { useBilling } from "../../context/BillingContext";
import { hardNavigate } from "../../utils/navigation";
import useSubscriptionPlans from "../../hooks/useSubscriptionPlans";
import { annualPriceFor, savingsPercent } from "../../utils/pricing";
import StripePaymentForm from "../billing/StripePaymentForm";
import CouponField from "../billing/CouponField";
import ModalPortal from "../common/ModalPortal";

// Static fallbacks shown only until the live subscription_plans rows load (or
// if that public read fails) — same slugs/amounts as the seeded DB rows.
const PLAN_ORDER = ["basic", "premium", "enterprise"];
const PLAN_FALLBACKS = {
  basic: { name: "Starter", price: 9.99, features: ["Up to 50 trades per month", "Trade journal & core dashboard", "CSV import", "Email support"] },
  premium: { name: "Pro", price: 18, features: ["Unlimited trades", "Advanced analytics", "Backtesting studio", "Priority support"] },
  enterprise: { name: "Elite", price: 40, features: ["Everything in Pro", "Unlimited trading accounts", "Prop-firm tracking", "Priority chat support"] },
};

// The gate shown to a signed-in user who has already consumed their one free
// trial and has no live subscription: no second trial offer — they pick a plan
// and pay up front to re-enter the app. Selecting a plan opens a checkout
// modal on top with the card fields and a coupon field beneath them. The
// backend independently enforces the one-trial rule.
//
// Coupon note: Stripe attaches the discount when the subscription is created,
// so applying/removing a code re-creates the checkout session with the code
// and swaps the Payment Element's clientSecret (the abandoned incomplete
// subscription expires on Stripe's side and the webhook reconciles the row).
const SubscribeActivation = ({ planSlug = "premium", billingCycle = "monthly", variant = "page" }) => {
  const isOverlay = variant === "overlay";
  const { createCheckoutSession } = useBilling();
  const { plans, loading: plansLoading } = useSubscriptionPlans();

  const [cycle, setCycle] = useState(billingCycle);
  const [selectedSlug, setSelectedSlug] = useState(null);
  // Slug whose checkout session is being created — drives the per-card spinner.
  const [preparingSlug, setPreparingSlug] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  // SetupIntent secret for a fully-discounted ($0) checkout: nothing is due
  // today, but the card must still be saved or renewal invoices after the
  // free period would have nothing to charge.
  const [setupSecret, setSetupSecret] = useState(null);
  // True while a coupon change is re-creating the session for a new secret.
  const [rebuilding, setRebuilding] = useState(false);
  const [coupon, setCoupon] = useState(null); // { code, label }
  const [errorMessage, setErrorMessage] = useState("");
  // After the card confirms, the webhook flips the subscription
  // suspended → active; show a short "activating" state before reloading so
  // the gate re-evaluates against the fresh entitlement.
  const [activating, setActivating] = useState(false);

  const planFor = (slug) => {
    const live = plans[slug];
    const fallback = PLAN_FALLBACKS[slug];
    const monthly = live?.price ?? fallback.price;
    return {
      slug,
      name: live?.name ?? fallback.name,
      features: live?.features?.length ? live.features : fallback.features,
      monthly,
      annual: annualPriceFor(monthly, live?.priceAnnually ?? null),
    };
  };

  const displayPlans = PLAN_ORDER.map(planFor);
  const priceFor = (plan) => (cycle === "annually" ? plan.annual : plan.monthly);
  const popular = planFor(PLAN_FALLBACKS[planSlug] ? planSlug : "premium");
  const yearlySavingsPct = savingsPercent(popular.monthly, popular.annual);
  const selectedPlan = selectedSlug ? planFor(selectedSlug) : null;

  const createSession = async (slug, couponCode) => {
    return createCheckoutSession(slug, cycle, couponCode || undefined);
  };

  const selectPlan = async (slug) => {
    setPreparingSlug(slug);
    setErrorMessage("");
    try {
      const { clientSecret: cs, paidInFull, setupClientSecret } = await createSession(slug, coupon?.code);
      setSelectedSlug(slug);
      if (paidInFull) {
        // 100%-off coupon: Stripe activated the subscription with no payment
        // to confirm. Still collect the card via the SetupIntent so renewals
        // after the free period can be charged; only skip the form entirely
        // when Stripe provided nothing to confirm.
        setClientSecret(null);
        setSetupSecret(setupClientSecret ?? null);
        if (!setupClientSecret) handlePaid();
      } else {
        setSetupSecret(null);
        setClientSecret(cs);
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to start checkout. Please try again.");
      toast.error(err.message || "Failed to start checkout. Please try again.");
    } finally {
      setPreparingSlug(null);
    }
  };

  // Applying or removing a coupon re-creates the subscription so the discount
  // is attached at creation, then swaps the payment form to the new secret.
  const changeCoupon = async (nextCoupon) => {
    if (!nextCoupon && !coupon) return; // nothing applied, nothing to rebuild
    const prev = coupon;
    setCoupon(nextCoupon);
    setRebuilding(true);
    try {
      const { clientSecret: cs, paidInFull, setupClientSecret } = await createSession(selectedSlug, nextCoupon?.code);
      if (paidInFull) {
        // The new coupon covers the full price — nothing left to pay today,
        // but the card is still saved (SetupIntent) for renewal charges.
        setClientSecret(null);
        setSetupSecret(setupClientSecret ?? null);
        if (!setupClientSecret) handlePaid();
      } else {
        setSetupSecret(null);
        setClientSecret(cs);
      }
    } catch (err) {
      setCoupon(prev); // the live session still reflects the previous coupon
      toast.error(err.message || "Couldn't update the coupon. Please try again.");
    } finally {
      setRebuilding(false);
    }
  };

  const closeModal = () => {
    setSelectedSlug(null);
    setClientSecret(null);
    setSetupSecret(null);
    setCoupon(null);
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
          ? "w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
          : "min-h-screen flex items-center justify-center bg-gray-50 py-4 px-4 sm:px-6 lg:px-8"
      }
      data-testid="subscribe-activation"
    >
      <div className="max-w-4xl w-full space-y-4">
        {/* Extra bottom padding nudges the logo/header up within the centered
            block, mirroring the footer's top padding pushing it down. */}
        <div className="text-center pb-3">
          <div className="flex items-center justify-center w-12 h-12 bg-primary-600 rounded-full mx-auto">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h2 className="mt-3 text-3xl font-extrabold text-gray-900">
            Choose a plan to continue
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your free trial has already been used. Pick up right where you left
            off — your data is safe and waiting.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1" data-testid="subscribe-cycle-toggle">
            <button
              type="button"
              onClick={() => setCycle("monthly")}
              data-testid="subscribe-cycle-monthly-btn"
              className={`px-4 py-1.5 text-sm font-medium rounded-md ${
                cycle === "monthly" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setCycle("annually")}
              data-testid="subscribe-cycle-annually-btn"
              className={`px-4 py-1.5 text-sm font-medium rounded-md ${
                cycle === "annually" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Yearly{yearlySavingsPct > 0 ? ` · save ${yearlySavingsPct}%` : ""}
            </button>
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

        {/* Plan cards */}
        {plansLoading ? (
          <div className="flex justify-center py-10" data-testid="subscribe-plans-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
            {displayPlans.map((plan) => {
              const isPopular = plan.slug === popular.slug;
              return (
                <div
                  key={plan.slug}
                  data-testid={`subscribe-plan-card-${plan.slug}`}
                  className={`relative flex flex-col rounded-xl border p-6 min-h-[29rem] ${
                    isPopular ? "border-primary-500 ring-1 ring-primary-500" : "border-gray-200"
                  }`}
                >
                  {isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-bold text-gray-900" data-testid={`subscribe-plan-price-${plan.slug}`}>
                      ${priceFor(plan)}
                    </span>
                    <span className="text-sm text-gray-500">/{cycle === "annually" ? "yr" : "mo"}</span>
                  </p>
                  {/* flex-1 pushes the button to the bottom, leaving the empty
                      space here for the richer per-plan descriptions to come. */}
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => selectPlan(plan.slug)}
                    disabled={preparingSlug !== null}
                    data-testid={`subscribe-plan-select-${plan.slug}-btn`}
                    className={`mt-6 w-full flex justify-center py-2.5 px-4 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPopular
                        ? "bg-primary-600 text-white hover:bg-primary-700"
                        : "border border-primary-600 text-primary-700 hover:bg-primary-50"
                    }`}
                  >
                    {preparingSlug === plan.slug ? (
                      <span className="flex items-center">
                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2" />
                        Preparing…
                      </span>
                    ) : (
                      `Choose ${plan.name}`
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-gray-500 pt-3">
          Prices are in USD. Secured by Stripe — card data never touches our
          servers. Cancel anytime.
        </p>
      </div>

      {/* Checkout modal — card fields with the coupon field beneath them.
          A fully-discounted ($0) checkout shows the same card form in setup
          mode (setupSecret): the card is saved for renewal charges without
          paying anything today. */}
      {selectedPlan && (clientSecret || setupSecret || activating) && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4"
            data-testid="subscribe-payment-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 sm:p-8 shadow-2xl ring-1 ring-black/5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="flex items-center text-xl font-semibold text-gray-900">
                  <span className="flex items-center justify-center w-10 h-10 mr-3 rounded-xl bg-primary-50">
                    <CreditCard className="w-5 h-5 text-primary-600" />
                  </span>
                  Complete subscription
                </h3>
                {!activating && (
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    data-testid="subscribe-modal-close-btn"
                    aria-label="Close checkout"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* The price lives here, next to the plan/cycle — not in the button. */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-3 mb-5">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{selectedPlan.name} plan</p>
                  <p className="text-xs text-gray-500">
                    Billed {cycle === "annually" ? "yearly" : "monthly"}
                    {coupon ? ` · coupon ${coupon.code} applied at checkout` : ""}
                  </p>
                </div>
                <p className="text-right">
                  <span className="text-2xl font-bold text-gray-900" data-testid="subscribe-price">
                    ${setupSecret && !clientSecret ? 0 : priceFor(selectedPlan)}
                  </span>
                  <span className="text-sm text-gray-500">/{cycle === "annually" ? "yr" : "mo"}</span>
                </p>
              </div>

              {setupSecret && !clientSecret && !activating && (
                <p
                  className="text-xs text-gray-600 bg-primary-50 border border-primary-100 rounded-md px-3 py-2 mb-4"
                  data-testid="subscribe-setup-note"
                >
                  Your coupon covers today&apos;s payment. Save a card so your plan
                  renews automatically at ${priceFor(selectedPlan)}/
                  {cycle === "annually" ? "yr" : "mo"} after the discount ends.
                </p>
              )}

              {activating ? (
                <div className="flex flex-col items-center gap-3 py-6" data-testid="subscribe-activating">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  <p className="text-sm text-gray-600">Activating your subscription…</p>
                </div>
              ) : rebuilding ? (
                <div className="flex flex-col items-center gap-3 py-10" data-testid="subscribe-coupon-updating">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                  <p className="text-sm text-gray-600">Updating your total…</p>
                </div>
              ) : (
                <StripePaymentForm
                  key={clientSecret ?? setupSecret}
                  clientSecret={clientSecret ?? setupSecret}
                  mode={clientSecret ? "payment" : "setup"}
                  submitLabel={clientSecret ? "Pay & subscribe" : "Save card & activate"}
                  onSuccess={handlePaid}
                  onCancel={closeModal}
                  footer={
                    <div className="space-y-1.5" data-testid="subscribe-coupon">
                      <p className="text-xs font-medium text-gray-500">Have a coupon code?</p>
                      <CouponField
                        initialApplied={coupon}
                        onApply={(code, label) => changeCoupon({ code, label })}
                        onClear={() => changeCoupon(null)}
                      />
                    </div>
                  }
                />
              )}
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
};

SubscribeActivation.propTypes = {
  planSlug: PropTypes.string,
  billingCycle: PropTypes.oneOf(["monthly", "annually"]),
  variant: PropTypes.oneOf(["page", "overlay"]),
};

export default SubscribeActivation;
