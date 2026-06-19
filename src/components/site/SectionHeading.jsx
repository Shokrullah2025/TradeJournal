import React from "react";

/**
 * Reusable eyebrow + title + subtitle block used to introduce page sections
 * on the public website. Centered by default; pass align="left" for left copy.
 */
const SectionHeading = ({ eyebrow, title, subtitle, align = "center" }) => {
  const alignment = align === "left" ? "text-left mx-0" : "text-center mx-auto";

  return (
    <div className={`max-w-2xl ${alignment}`}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400 mb-3">
          {eyebrow}
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
