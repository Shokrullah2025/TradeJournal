import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

// Format a price without trailing ".00" but keeping cents when present.
const fmt = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));

/**
 * A single pricing tier card. Highlights the popular plan and shows the price
 * for the selected billing cycle ("monthly" | "annual"). On annual it also
 * shows the effective monthly rate and the real yearly saving.
 *
 * Styled to match the pricing cards in the Home landing section so a plan reads
 * identically on both surfaces — same type scale, divider, check list and CTA.
 * The only thing this card adds is the billing-detail line, which the Home
 * section has no use for (it never offers the annual cycle).
 */
const PricingCard = ({ tier, cycle }) => {
  const isAnnual = cycle === "annual";
  const isFree = !tier.monthlyPrice || tier.monthlyPrice <= 0;
  const price = isAnnual && !isFree ? tier.yearlyPrice : tier.monthlyPrice;
  const suffix = isFree ? "forever" : isAnnual ? "/yr" : "/mo";
  const perMonth = isAnnual && !isFree ? Math.round((tier.yearlyPrice / 12) * 100) / 100 : null;
  const saved = !isFree ? Math.max(0, tier.monthlyPrice * 12 - tier.yearlyPrice) : 0;

  return (
    <div
      data-test-id={`pricing-card-${tier.id}`}
      className={`relative flex flex-col rounded-2xl border p-6 sm:min-h-[34rem] ${
        tier.popular
          ? "border-accent-500 bg-white shadow-xl dark:border-accent-500 dark:bg-gray-900"
          : "border-accent-100 bg-white dark:border-gray-700 dark:bg-gray-900"
      }`}
    >
      {tier.popular && (
        <span
          data-test-id={`pricing-card-badge-${tier.id}`}
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-600 px-3 py-1 font-nums text-[11px] font-semibold tracking-wide text-white"
        >
          MOST POPULAR
        </span>
      )}

      <p
        className={`text-[15px] font-semibold ${
          tier.popular
            ? "text-accent-600 dark:text-accent-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {tier.name}
      </p>

      <p className="mt-3 flex items-baseline gap-1">
        <span
          data-test-id={`pricing-card-price-${tier.id}`}
          className="font-nums text-4xl font-semibold text-gray-900 dark:text-gray-100"
        >
          ${fmt(price)}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>
      </p>

      {/* Billing detail line — unique to this page (Home has no annual cycle).
          min-h reserves its height so the rows below stay aligned across cards
          when only some of them have a saving to report. */}
      <p className="mt-1.5 min-h-[1.125rem] text-[13px]">
        {isFree ? (
          <span className="text-gray-400 dark:text-gray-500">Free</span>
        ) : isAnnual ? (
          <span className="text-success-700 dark:text-success-400">
            ${fmt(perMonth)}/mo billed annually
            {saved > 0 && <span className="font-semibold"> · Save ${fmt(saved)}/yr</span>}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500">Billed monthly</span>
        )}
      </p>

      <p className="mt-1.5 text-[13px] text-gray-500 dark:text-gray-400">
        {tier.description}
      </p>

      <div className="my-5 h-px bg-accent-100 dark:bg-gray-700" />

      {/* flex-1 absorbs the uneven feature counts so every CTA lands on the same
          baseline at the foot of the card. */}
      <ul className="flex-1 space-y-2.5">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-[13px] text-gray-700 dark:text-gray-300"
          >
            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-accent-600 dark:text-accent-400" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Carry the chosen plan into signup. It's persisted to auth metadata at
          registration, so after the user verifies their email and signs in the
          TrialGate skips the plan chooser and opens straight on activation.
          The tier id IS the plan slug (basic/premium/enterprise); the backend
          billing cycle is "monthly" | "annually". */}
      <Link
        to={`/register?plan=${tier.id}&cycle=${isAnnual ? "annually" : "monthly"}`}
        data-test-id={`pricing-card-cta-${tier.id}`}
        className={`mt-6 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
          tier.popular
            ? "btn-site"
            : "border border-accent-200 bg-accent-50 text-gray-900 hover:bg-accent-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  );
};

export default PricingCard;
