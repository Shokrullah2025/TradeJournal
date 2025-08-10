import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const StatsCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color = "primary",
  miniChart = null,
  chartData = [],
}) => {
  const colorClasses = {
    primary:
      "bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400",
    success:
      "bg-success-50 text-success-600 dark:bg-success-900/30 dark:text-success-400",
    danger:
      "bg-danger-50 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400",
    warning:
      "bg-warning-50 text-warning-600 dark:bg-warning-900/30 dark:text-warning-400",
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 p-4">
      <div className="flex items-start justify-between h-18">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
              {value}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end ml-3 flex-shrink-0">
          {/* Mini Chart */}
          {miniChart && (
            <div className="mb-1.5">
              {miniChart}
            </div>
          )}
          
          <div
            className={`flex items-center space-x-1 text-xs font-medium ${
              changeType === "positive"
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }`}
          >
            {changeType === "positive" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span className="whitespace-nowrap">{change}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
