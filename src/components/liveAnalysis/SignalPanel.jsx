import React from "react";
import { TrendingUp, TrendingDown, Minus, ShieldAlert } from "lucide-react";
import { activeSessions } from "../../lib/signals/sessions";
import RuleChecklist from "./RuleChecklist";

const BIAS_STYLES = {
  long: {
    label: "Long bias",
    Icon: TrendingUp,
    badge: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  },
  short: {
    label: "Short bias",
    Icon: TrendingDown,
    badge: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  },
  neutral: {
    label: "Neutral",
    Icon: Minus,
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  },
};

/** Bias badge, confluence score, session badges, rule checklist. */
const SignalPanel = ({ signal }) => {
  if (!signal) return null;
  const { label, Icon, badge } = BIAS_STYLES[signal.bias] || BIAS_STYLES.neutral;
  const sessions = activeSessions(signal.evaluatedAt).filter(
    (s) => s.id !== "LUNCH_DOLDRUMS"
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span
          data-testid="signal-bias-value"
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badge}`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </span>
        <span
          data-testid="signal-score-value"
          className="text-xs font-medium text-gray-600 dark:text-gray-300"
        >
          {signal.score}/{signal.total} rules met
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {sessions.length > 0 ? (
          sessions.map((s) => (
            <span
              key={s.id}
              className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
            >
              {s.label} session
            </span>
          ))
        ) : (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            No major session open
          </span>
        )}
      </div>

      {signal.gated && (
        <div
          data-testid="signal-gated-callout"
          className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 text-xs"
        >
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Session filter active — conditions outside your trading windows. Bias is
            held at Neutral; consider standing aside.
          </span>
        </div>
      )}

      <RuleChecklist results={signal.results} />
    </div>
  );
};

export default SignalPanel;
