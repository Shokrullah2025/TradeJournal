import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const CATEGORY_LABELS = {
  session: "Session",
  trend: "Trend",
  momentum: "Momentum",
  structure: "Structure",
  volatility: "Volatility",
};

/** Pass/fail checklist of every rule in the ruleset with its detail text. */
const RuleChecklist = ({ results }) => (
  <div data-testid="signal-rule-checklist" className="space-y-1">
    <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      Rule checklist
    </h3>
    {results.map((r) => (
      <div
        key={r.id}
        data-testid={`signal-rule-row-${r.id}`}
        title={`${CATEGORY_LABELS[r.category] || r.category}: ${r.detail}`}
        className="flex items-center gap-1.5 py-1 px-1.5 rounded bg-gray-50 dark:bg-gray-700/40"
      >
        {r.pass ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 shrink-0" />
        )}
        <span className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
          {r.label}
        </span>
      </div>
    ))}
  </div>
);

export default RuleChecklist;
