import React from "react";

/**
 * A single feature tile: lucide icon + title + description.
 * `icon` is a lucide-react component passed by the parent (e.g. BookOpen).
 * `badge` renders a small pill next to the title (e.g. "Coming soon").
 */
const FeatureCard = ({ icon: Icon, title, description, badge, testId }) => (
  <div
    data-test-id={testId}
    className="group rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
  >
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-100 text-accent-600 transition-colors group-hover:bg-accent-600 group-hover:text-white dark:bg-accent-900/30 dark:text-accent-400">
      {Icon && <Icon className="h-6 w-6" />}
    </span>
    <h3 className="mt-4 flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
      {title}
      {badge && (
        <span className="rounded-full bg-accent-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent-700 dark:bg-accent-900/50 dark:text-accent-300">
          {badge}
        </span>
      )}
    </h3>
    <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
      {description}
    </p>
  </div>
);

export default FeatureCard;
