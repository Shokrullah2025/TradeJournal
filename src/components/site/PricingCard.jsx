import React from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

/**
 * A single pricing tier card. Highlights the popular plan and shows the price
 * for the selected billing cycle ("monthly" | "annual").
 */
const PricingCard = ({ tier, cycle }) => {
  const isAnnual = cycle === "annual";
  const price = isAnnual ? tier.yearlyPrice : tier.monthlyPrice;
  const isFree = price === 0;
  const suffix = isFree ? "" : isAnnual ? "/year" : "/month";

  return (
    <div
      data-testid={`pricing-card-${tier.id}`}
      className={`relative flex flex-col rounded-2xl border p-8 ${
        tier.popular
          ? "border-primary-500 bg-white shadow-xl dark:border-primary-500 dark:bg-gray-800"
          : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      }`}
    >
      {tier.popular && (
        <span
          data-testid={`pricing-card-badge-${tier.id}`}
          className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white"
        >
          Most popular
        </span>
      )}

      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {tier.name}
      </h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {tier.description}
      </p>

      <div className="mt-6 flex items-baseline gap-1">
        <span
          data-testid={`pricing-card-price-${tier.id}`}
          className="text-4xl font-bold text-gray-900 dark:text-gray-100"
        >
          ${price}
        </span>
        {suffix && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {suffix}
          </span>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-3">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        to="/register"
        data-testid={`pricing-card-cta-${tier.id}`}
        className={`mt-8 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
          tier.popular
            ? "bg-primary-600 text-white hover:bg-primary-700"
            : "border border-gray-300 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  );
};

export default PricingCard;
