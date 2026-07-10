import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

// Format a price without trailing ".00" but keeping cents when present.
const fmt = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(2));

/**
 * A single pricing tier card. Highlights the popular plan and shows the price
 * for the selected billing cycle ("monthly" | "annual"). On annual it also
 * shows the effective monthly rate and the real yearly saving.
 */
const PricingCard = ({ tier, cycle }) => {
  const isAnnual = cycle === "annual";
  const isFree = !tier.monthlyPrice || tier.monthlyPrice <= 0;
  const price = isAnnual && !isFree ? tier.yearlyPrice : tier.monthlyPrice;
  const suffix = isFree ? "" : isAnnual ? "/year" : "/month";
  const perMonth = isAnnual && !isFree ? Math.round((tier.yearlyPrice / 12) * 100) / 100 : null;
  const saved = !isFree ? Math.max(0, tier.monthlyPrice * 12 - tier.yearlyPrice) : 0;

  return (
    <div
      data-testid={`pricing-card-${tier.id}`}
      className={`relative flex flex-col rounded-2xl border p-8 sm:p-10 sm:min-h-[34rem] transition-all duration-200 hover:-translate-y-1 ${
        tier.popular
          ? "z-10 border-accent-500 bg-white shadow-2xl ring-1 ring-accent-500 dark:bg-gray-800 lg:scale-[1.04]"
          : "border-gray-200 bg-white shadow-sm hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      {tier.popular && (
        <span
          data-testid={`pricing-card-badge-${tier.id}`}
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent-600 px-4 py-1 text-xs font-semibold text-white shadow"
        >
          Most popular
        </span>
      )}

      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{tier.name}</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{tier.description}</p>

      <div className="mt-6 flex items-end gap-1">
        <span
          data-testid={`pricing-card-price-${tier.id}`}
          className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100"
        >
          ${fmt(price)}
        </span>
        {suffix && (
          <span className="mb-1.5 text-sm text-gray-500 dark:text-gray-400">{suffix}</span>
        )}
      </div>

      {/* Billing detail line — reserves height so cards stay aligned */}
      <p className="mt-2 min-h-[1.25rem] text-sm">
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

      <ul className="mt-8 flex-1 space-y-3.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success-100 dark:bg-success-500/20">
              <Check className="h-3.5 w-3.5 text-success-600 dark:text-success-400" />
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        data-testid={`pricing-card-cta-${tier.id}`}
        className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
          tier.popular
            ? "bg-accent-600 text-white shadow-sm hover:bg-accent-700"
            : "border border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  );
};

export default PricingCard;
