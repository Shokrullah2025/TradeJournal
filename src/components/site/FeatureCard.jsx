import React from "react";

/**
 * A single feature tile: lucide icon + title + description.
 * `icon` is a lucide-react component passed by the parent (e.g. BookOpen).
 */
const FeatureCard = ({ icon: Icon, title, description, testId }) => (
  <div
    data-testid={testId}
    className="group rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
  >
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary-100 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white dark:bg-primary-900/30 dark:text-primary-400">
      {Icon && <Icon className="h-6 w-6" />}
    </span>
    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
      {title}
    </h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

export default FeatureCard;
