import React from "react";

/**
 * Reusable eyebrow + title + subtitle block used to introduce page sections
 * on the public website. Centered by default; pass align="left" for left copy.
 * `badge` renders a filled pill after the eyebrow (e.g. "Coming soon").
 */
const SectionHeading = ({ eyebrow, title, subtitle, badge, align = "center" }) => {
  const alignment = align === "left" ? "text-left mx-0" : "text-center mx-auto";

  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400 mb-3">
          {eyebrow}
          {badge && (
            <span className="ml-2 inline-block rounded-full bg-accent-600 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white align-middle">
              {badge}
            </span>
          )}
        </p>
      )}
      <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeading;
