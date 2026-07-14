import React, { useState } from "react";
import PropTypes from "prop-types";
import { Check, Sparkles } from "lucide-react";
import useSubscriptionPlans from "../../hooks/useSubscriptionPlans";
import { PLAN_ORDER, PLAN_LABELS } from "../../lib/featureFlags";
import { PRICING_TIERS } from "../site/content";
import { annualPriceFor, savingsPercent } from "../../utils/pricing";

// ── Plan chooser ───────────────────────────────────────────────────────────
// First step of the TrialGate: a signed-in user with no subscription picks the
// plan they want before they're asked for a card. Prices come from the live
// subscription_plans rows (the admin Pricing tab), with the static marketing
// tiers as a fallback for copy the DB doesn't carry — so a plan reads the same
// here as it does on /pricing.
//
// This step is skipped entirely when the user already chose a plan on the
// marketing pricing page (carried through signup in auth metadata) — see
// TrialGate.

const PlanSelection = ({ onSelect, initialCycle = "monthly" }) => {
  const [cycle, setCycle] = useState(initialCycle);
  const { plans: livePlans } = useSubscriptionPlans();
  const isAnnual = cycle === "annually";

  // PLAN_ORDER is cheapest → dearest, and a tier's `id` is its plan slug.
  const tiers = PLAN_ORDER.map((slug) => {
    const staticTier = PRICING_TIERS.find((t) => t.id === slug);
    const live = livePlans[slug];
    const monthlyPrice = live?.price ?? staticTier?.monthlyPrice ?? 0;
    return {
      slug,
      name: live?.name ?? staticTier?.name ?? PLAN_LABELS[slug],
      description: live?.description ?? staticTier?.description ?? "",
      features: live?.features?.length ? live.features : staticTier?.features ?? [],
      popular: !!staticTier?.popular,
      monthlyPrice,
      yearlyPrice: annualPriceFor(monthlyPrice, live?.priceAnnually ?? staticTier?.yearlyPrice),
    };
  });

  const popular = tiers.find((t) => t.popular);
  const savingsPct = popular ? savingsPercent(popular.monthlyPrice, popular.yearlyPrice) : 0;

  const priceOf = (tier) => (isAnnual ? tier.yearlyPrice : tier.monthlyPrice);
  const fmt = (n) => (Number.isInteger(n) ? `${n}` : Number(n).toFixed(2));

  return (
    <div
      className="w-full rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
      data-test-id="plan-selection"
    >
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
          Choose your plan
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
          Every plan starts with a 7-day free trial. You won’t be charged today,
          and you can cancel any time before the trial ends.
        </p>
      </div>

      {/* Billing-cycle toggle */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-full bg-gray-100 p-1" role="group">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            data-test-id="plan-selection-cycle-monthly-btn"
            aria-pressed={!isAnnual}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !isAnnual
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("annually")}
            data-test-id="plan-selection-cycle-annually-btn"
            aria-pressed={isAnnual}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              isAnnual
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Annually
            {savingsPct > 0 && (
              <span className="ml-1.5 text-xs font-semibold text-primary-600">
                save {savingsPct}%
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.slug}
            data-test-id={`plan-selection-card-${tier.slug}`}
            className={`relative flex flex-col rounded-xl border p-5 ${
              tier.popular
                ? "border-primary-500 shadow-lg"
                : "border-gray-200"
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-600 px-3 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                MOST POPULAR
              </span>
            )}

            <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>

            <p className="mt-2">
              <span
                className="text-3xl font-extrabold text-gray-900"
                data-test-id={`plan-selection-price-${tier.slug}`}
              >
                ${fmt(priceOf(tier))}
              </span>
              <span className="text-sm text-gray-500">
                {isAnnual ? "/yr" : "/mo"}
              </span>
            </p>

            {tier.description && (
              <p className="mt-1.5 text-[13px] text-gray-500">{tier.description}</p>
            )}

            <ul className="mt-4 flex-1 space-y-2">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[13px] text-gray-700"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary-600" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => onSelect(tier.slug, cycle)}
              data-test-id={`plan-selection-choose-${tier.slug}-btn`}
              className={`mt-5 w-full rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                tier.popular
                  ? "bg-primary-600 text-white hover:bg-primary-700"
                  : "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50"
              }`}
            >
              Start free trial
            </button>
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-xs text-gray-500">
        Prices are in USD. After your 7-day trial, your plan renews
        automatically at the price above unless you cancel.
      </p>
    </div>
  );
};

PlanSelection.propTypes = {
  // (planSlug, billingCycle) → advance to card entry.
  onSelect: PropTypes.func.isRequired,
  initialCycle: PropTypes.oneOf(["monthly", "annually"]),
};

export default PlanSelection;
