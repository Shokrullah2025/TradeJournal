import React from "react";
import { Info } from "lucide-react";

/** Persistent, non-dismissible decision-support disclaimer. */
const DisclaimerBanner = () => (
  <div
    data-testid="signal-disclaimer-banner"
    className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs"
  >
    <Info className="w-4 h-4 mt-0.5 shrink-0" />
    <span>
      This analysis is automated, rule-based decision support for educational
      purposes only. It is not financial advice and is not a recommendation to
      buy or sell any instrument. Always do your own research and manage your
      risk.
    </span>
  </div>
);

export default DisclaimerBanner;
