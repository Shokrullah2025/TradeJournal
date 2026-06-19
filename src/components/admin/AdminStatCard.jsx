import React from "react";
import PropTypes from "prop-types";

// ── Admin KPI card ─────────────────────────────────────────────────────────
// Mirrors the user dashboard StatsCard styling (icon chip + label + value)
// so the admin area feels native. `hint` shows a small secondary line; `tone`
// colors the icon chip.

const TONES = {
  primary: "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
  success: "bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400",
  danger:  "bg-danger-50 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400",
  warning: "bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400",
  gray:    "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

const AdminStatCard = ({ title, value, icon: Icon, tone = "primary", hint, testId }) => (
  <div className="card hover:shadow-md transition-shadow duration-200 p-4" data-testid={testId}>
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg flex-shrink-0 ${TONES[tone] ?? TONES.primary}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 truncate">
          {title}
        </p>
        <p
          className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate"
          data-testid={testId ? `${testId}-value` : undefined}
        >
          {value}
        </p>
        {hint && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{hint}</p>
        )}
      </div>
    </div>
  </div>
);

AdminStatCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType.isRequired,
  tone: PropTypes.oneOf(["primary", "success", "danger", "warning", "gray"]),
  hint: PropTypes.string,
  testId: PropTypes.string,
};

export default AdminStatCard;
