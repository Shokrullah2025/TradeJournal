import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const StatsCard = ({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color = "primary",
}) => {
  const colorClasses = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    danger: "bg-danger-50 text-danger-600",
    warning: "bg-warning-50 text-warning-600",
  };

  return (
    <div className="card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        </div>

        <div className="text-right">
          <div
            className={`flex items-center space-x-1 text-sm font-medium ${
              changeType === "positive" ? "text-success-600" : "text-danger-600"
            }`}
          >
            {changeType === "positive" ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{change}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">vs last month</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
