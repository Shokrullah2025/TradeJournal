import React from "react";
import FeatureCard from "./FeatureCard";

/**
 * Responsive grid of FeatureCards (1 col mobile → 2 tablet → 3 desktop).
 * `features` is an array of { icon, title, description }.
 * `idPrefix` builds a stable data-test-id per card (e.g. "feature-journaling").
 */
const FeatureGrid = ({ features, idPrefix = "feature", columns = 3 }) => {
  const colClass =
    columns === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div
      data-test-id={`${idPrefix}-grid`}
      className={`grid grid-cols-1 gap-6 ${colClass}`}
    >
      {features.map((feature, index) => (
        <FeatureCard
          key={feature.title}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          testId={`${idPrefix}-card-${index}`}
        />
      ))}
    </div>
  );
};

export default FeatureGrid;
