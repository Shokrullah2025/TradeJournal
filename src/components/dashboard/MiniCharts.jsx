import React from "react";

// Mini Line Chart for trends
export const MiniLineChart = ({ data, color = "blue", positive = true }) => {
  if (!data || data.length === 0) return null;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    green: positive ? '#10b981' : '#ef4444',
    red: '#ef4444',
    blue: '#3b82f6',
    purple: '#8b5cf6'
  };

  return (
    <div className="w-16 h-8">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polyline
          points={points}
          fill="none"
          stroke={colorClasses[color]}
          strokeWidth="4"
          className="drop-shadow-sm"
        />
        <defs>
          <linearGradient id={`gradient-${color}-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor: colorClasses[color], stopOpacity: 0.25}} />
            <stop offset="100%" style={{stopColor: colorClasses[color], stopOpacity: 0}} />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#gradient-${color}-${Math.random()})`}
        />
      </svg>
    </div>
  );
};

// Mini Bar Chart for distributions
export const MiniBarChart = ({ data, color = "blue" }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data) || 1;
  
  const colorClasses = {
    green: '#10b981',
    red: '#ef4444', 
    blue: '#3b82f6',
    purple: '#8b5cf6'
  };

  return (
    <div className="w-16 h-8 flex items-end justify-between gap-0.5">
      {data.slice(0, 8).map((value, index) => (
        <div
          key={index}
          className="flex-1 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
          style={{
            height: `${Math.max((value / max) * 100, 12)}%`,
            backgroundColor: colorClasses[color],
          }}
        />
      ))}
    </div>
  );
};

// Mini Donut Chart for percentages
export const MiniDonutChart = ({ percentage, color = "blue" }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = (percentage / 100) * circumference;
  
  const colorClasses = {
    green: '#10b981',
    red: '#ef4444',
    blue: '#3b82f6', 
    purple: '#8b5cf6'
  };

  return (
    <div className="w-8 h-8 relative">
      <svg viewBox="0 0 24 24" className="w-full h-full transform -rotate-90">
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200 dark:text-gray-700"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          stroke={colorClasses[color]}
          strokeWidth="2"
          strokeDasharray={`${strokeDasharray} ${circumference}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">
          {Math.round(percentage)}
        </span>
      </div>
    </div>
  );
};

// Mini Area Chart for cumulative data
export const MiniAreaChart = ({ data, color = "blue", positive = true }) => {
  if (!data || data.length === 0) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const colorClasses = {
    green: positive ? '#10b981' : '#ef4444',
    red: '#ef4444',
    blue: '#3b82f6',
    purple: '#8b5cf6'
  };

  return (
    <div className="w-16 h-8">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id={`area-gradient-${color}-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor: colorClasses[color], stopOpacity: 0.35}} />
            <stop offset="100%" style={{stopColor: colorClasses[color], stopOpacity: 0.08}} />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#area-gradient-${color}-${Math.random()})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={colorClasses[color]}
          strokeWidth="3"
        />
      </svg>
    </div>
  );
};

// Risk-Reward Ratio Chart for comparing win/loss amounts
export const MiniRiskRewardChart = ({ winAmount, lossAmount, color = "blue" }) => {
  if (winAmount <= 0 && lossAmount <= 0) return null;
  
  const maxAmount = Math.max(winAmount, lossAmount);
  const winHeight = maxAmount > 0 ? (winAmount / maxAmount) * 100 : 0;
  const lossHeight = maxAmount > 0 ? (lossAmount / maxAmount) * 100 : 0;

  const colorClasses = {
    green: '#10b981',
    red: '#ef4444',
    blue: '#3b82f6',
    purple: '#8b5cf6'
  };

  return (
    <div className="w-16 h-8 flex items-end justify-center gap-2">
      {/* Win Bar */}
      <div className="flex flex-col items-center flex-1">
        <div
          className="w-full rounded-t-sm opacity-90"
          style={{
            height: `${Math.max(winHeight, 10)}%`,
            backgroundColor: '#10b981',
          }}
        />
        <div className="text-[6px] text-success-600 font-medium mt-0.5">W</div>
      </div>
      
      {/* Loss Bar */}
      <div className="flex flex-col items-center flex-1">
        <div
          className="w-full rounded-t-sm opacity-90"
          style={{
            height: `${Math.max(lossHeight, 10)}%`,
            backgroundColor: '#ef4444',
          }}
        />
        <div className="text-[6px] text-danger-600 font-medium mt-0.5">L</div>
      </div>
    </div>
  );
};

// Drawdown Chart showing underwater curve
export const MiniDrawdownChart = ({ drawdownData, color = "red" }) => {
  if (!drawdownData || drawdownData.length === 0) return null;
  
  const max = Math.max(...drawdownData);
  const min = Math.min(...drawdownData);
  const range = max - min || 1;

  const points = drawdownData.map((value, index) => {
    const x = (index / (drawdownData.length - 1)) * 100;
    // Invert for drawdown (lower values = higher on chart)
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-16 h-8">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Zero line */}
        <line x1="0" y1="100" x2="100" y2="100" stroke="#374151" strokeWidth="1" opacity="0.3" />
        <defs>
          <linearGradient id={`drawdown-gradient-${Math.random()}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{stopColor: '#ef4444', stopOpacity: 0.4}} />
            <stop offset="100%" style={{stopColor: '#ef4444', stopOpacity: 0.1}} />
          </linearGradient>
        </defs>
        <polygon
          points={`0,100 ${points} 100,100`}
          fill={`url(#drawdown-gradient-${Math.random()})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke="#ef4444"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
};
