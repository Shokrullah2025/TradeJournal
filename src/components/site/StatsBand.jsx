import React from "react";
import { STATS_BAND } from "./content";

/**
 * Headline metric strip reinforcing the core analytics the product tracks.
 * Static, decorative band — values double as labels for the metrics.
 */
const StatsBand = () => (
  <section
    data-testid="site-stats-band"
    className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/40"
  >
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
        Every metric a serious trader watches — calculated automatically
      </p>
      <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
        {STATS_BAND.map((stat) => (
          <div key={stat.value} className="text-center">
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default StatsBand;
