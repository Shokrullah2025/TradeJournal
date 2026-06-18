import React from "react";

/**
 * A single "how it works" step: big number, title, and description.
 */
const StepCard = ({ number, title, description, testId }) => (
  <div
    data-testid={testId}
    className="relative rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800"
  >
    <span className="text-4xl font-bold text-primary-200 dark:text-primary-900">
      {number}
    </span>
    <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
      {title}
    </h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

export default StepCard;
