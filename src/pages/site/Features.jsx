import React from "react";
import SectionHeading from "../../components/site/SectionHeading";
import FeatureGrid from "../../components/site/FeatureGrid";
import CTASection from "../../components/site/CTASection";
import { FEATURE_CATEGORIES } from "../../components/site/content";

/**
 * Features page (route "/features"). Renders every feature category from the
 * shared content module, alternating background tone for visual rhythm.
 */
const Features = () => (
  <div data-testid="site-features-page">
    {/* Page header */}
    <section className="bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-100/60 px-3 py-1 text-xs font-semibold text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
          Features
        </span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Everything you need to{" "}
          <span className="text-gradient">master your trading</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          A complete toolkit — journaling, analytics, broker auto-sync,
          backtesting, and risk management — designed to help you find and keep
          your edge.
        </p>
      </div>
    </section>

    {/* Feature categories */}
    {FEATURE_CATEGORIES.map((category, index) => (
      <section
        key={category.id}
        data-testid={`features-category-${category.id}`}
        className={
          index % 2 === 1
            ? "bg-gray-50 dark:bg-gray-800/40"
            : "bg-white dark:bg-gray-900"
        }
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <SectionHeading
            eyebrow={category.eyebrow}
            title={category.title}
            subtitle={category.subtitle}
          />
          <div className="mt-12">
            <FeatureGrid
              features={category.features}
              idPrefix={`features-${category.id}`}
            />
          </div>
        </div>
      </section>
    ))}

    <CTASection />
  </div>
);

export default Features;
