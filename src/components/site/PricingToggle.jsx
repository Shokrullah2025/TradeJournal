import React from "react";

/**
 * Monthly / annual billing switch for the Pricing page.
 * Controlled by the parent: `cycle` is "monthly" | "annual",
 * `onChange` receives the new cycle.
 */
const PricingToggle = ({ cycle, onChange }) => (
  <div
    data-test-id="pricing-billing-toggle"
    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800"
  >
    <button
      type="button"
      data-test-id="pricing-billing-monthly-btn"
      onClick={() => onChange("monthly")}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        cycle === "monthly"
          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      Monthly
    </button>
    <button
      type="button"
      data-test-id="pricing-billing-annual-btn"
      onClick={() => onChange("annual")}
      className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        cycle === "annual"
          ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
          : "text-gray-500 dark:text-gray-400"
      }`}
    >
      Annual
      <span className="rounded-full bg-success-100 px-2 py-0.5 text-xs font-semibold text-success-700 dark:bg-success-500/20 dark:text-success-400">
        Save ~17%
      </span>
    </button>
  </div>
);

export default PricingToggle;
