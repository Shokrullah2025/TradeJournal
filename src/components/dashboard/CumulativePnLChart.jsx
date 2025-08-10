import React, { useEffect, useState } from "react";

const CumulativePnLChart = ({ trades = [] }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // Generate cumulative P&L data from real trades
  const generateCumulativeData = () => {
    // Handle undefined or null trades
    const validTrades = trades || [];
    const completedTrades = validTrades.filter((trade) => trade && trade.status === "closed");
    
    if (completedTrades.length === 0) {
      return [];
    }

    // Group trades by date and calculate daily P&L
    const dailyPnL = {};
    
    completedTrades.forEach((trade) => {
      const date = new Date(trade.exitDate || trade.createdAt).toISOString().split('T')[0];
      if (!dailyPnL[date]) {
        dailyPnL[date] = 0;
      }
      dailyPnL[date] += trade.pnl || 0;
    });

    // Convert to array, sort by date, and calculate cumulative
    const sortedDailyData = Object.entries(dailyPnL)
      .map(([date, pnl]) => ({
        date,
        dailyPnL: pnl,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate cumulative P&L
    let cumulativePnL = 0;
    return sortedDailyData.map((item) => {
      cumulativePnL += item.dailyPnL;
      const dateObj = new Date(item.date);
      
      return {
        date: item.date,
        dailyPnL: item.dailyPnL,
        cumulativePnL,
        displayDate: `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`,
        dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      };
    });
  };

  const data = generateCumulativeData();
  
  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-lg mb-2">No trading data available</div>
          <div className="text-sm">Start adding trades to see your cumulative P&L</div>
        </div>
      </div>
    );
  }
  
  const maxCumulative = Math.max(...data.map(d => d.cumulativePnL));
  const minCumulative = Math.min(...data.map(d => d.cumulativePnL));
  const range = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative), 1);

  // Generate path for SVG line
  const generatePath = () => {
    if (data.length === 0) return "";
    
    const width = 80; // Adjusted for padding
    const height = 80;
    const padding = 10;
    
    // Use symmetric range around zero for better centering
    const maxAbsValue = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative), 1000);
    const chartMin = -maxAbsValue;
    const chartMax = maxAbsValue;
    
    const points = data.map((point, index) => {
      const x = padding + (index / Math.max(data.length - 1, 1)) * width;
      // Normalize around zero (center of chart)
      const normalizedY = (point.cumulativePnL - chartMin) / (chartMax - chartMin);
      const y = padding + (1 - normalizedY) * height;
      return `${x},${y}`;
    });
    
    return `M ${points.join(' L ')}`;
  };

  // Generate Y-axis labels - symmetric around zero
  const generateYAxisLabels = () => {
    // Always center around zero for better visualization
    const maxAbsValue = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative), 1000); // Minimum range of 1000
    const step = Math.max(100, Math.ceil(maxAbsValue / 2 / 100) * 100); // Round to nearest 100
    const labels = [];
    
    // Add positive labels from top to middle
    for (let i = 2; i >= 1; i--) {
      const value = i * step;
      labels.push(`$+${value.toLocaleString()}`);
    }
    
    // Add zero line in the middle
    labels.push('$0');
    
    // Add negative labels from middle to bottom
    for (let i = 1; i <= 2; i++) {
      const value = i * step;
      labels.push(`$-${value.toLocaleString()}`);
    }
    
    return labels;
  };

  const yAxisLabels = generateYAxisLabels();

  return (
    <div className="h-80 w-full">
      <div className="flex h-64">
        {/* Y-Axis Labels (Left Side) */}
        <div className="w-20 flex flex-col justify-between py-2 pr-3">
          {yAxisLabels.map((label, index) => (
            <div
              key={index}
              className={`text-xs font-medium text-right ${
                label === '$0' 
                  ? 'text-gray-600 dark:text-gray-400 font-semibold' 
                  : label.includes('+') 
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-gray-900/30 dark:to-transparent rounded-lg" />
          
          {/* Grid Lines */}
          {yAxisLabels.map((_, index) => (
            <div
              key={index}
              className="absolute left-0 right-0 border-t border-gray-200/50 dark:border-gray-700/50"
              style={{ top: `${(index / (yAxisLabels.length - 1)) * 100}%` }}
            />
          ))}
          
          {/* Zero Line - centered and thick for easy reference */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-gray-500 dark:border-gray-400 z-10 opacity-80"
            style={{ top: '50%' }}
          />
          
          {/* Additional emphasis line for zero */}
          <div 
            className="absolute left-0 right-0 border-t border-gray-600 dark:border-gray-300 z-10"
            style={{ top: 'calc(50% + 1px)' }}
          />
          
          {/* SVG Line Chart */}
          <div className="absolute inset-0 p-2">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Line */}
              <path
                d={generatePath()}
                stroke={data[data.length - 1]?.cumulativePnL >= 0 ? '#10b981' : '#ef4444'}
                strokeWidth="0.8"
                fill="none"
                className="drop-shadow-sm"
              />
              
              {/* Fill area under/above zero */}
              <defs>
                <linearGradient id="fillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop 
                    offset="0%" 
                    style={{
                      stopColor: data[data.length - 1]?.cumulativePnL >= 0 ? '#10b981' : '#ef4444',
                      stopOpacity: 0.2
                    }} 
                  />
                  <stop 
                    offset="100%" 
                    style={{
                      stopColor: data[data.length - 1]?.cumulativePnL >= 0 ? '#10b981' : '#ef4444',
                      stopOpacity: 0.05
                    }} 
                  />
                </linearGradient>
              </defs>
              
              <path
                d={`${generatePath()} L ${90},${50} L ${10},${50} Z`}
                fill="url(#fillGradient)"
              />
              
              {/* Data points */}
              {data.map((point, index) => {
                const x = 10 + (index / Math.max(data.length - 1, 1)) * 80;
                // Use same symmetric range as path generation
                const maxAbsValue = Math.max(Math.abs(maxCumulative), Math.abs(minCumulative), 1000);
                const chartMin = -maxAbsValue;
                const chartMax = maxAbsValue;
                const normalizedY = (point.cumulativePnL - chartMin) / (chartMax - chartMin);
                const y = 10 + (1 - normalizedY) * 80;
                
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="1"
                    fill={point.cumulativePnL >= 0 ? '#10b981' : '#ef4444'}
                    className="hover:r-2 transition-all duration-200"
                  >
                    <title>{`${point.displayDate}: $${point.cumulativePnL >= 0 ? '+' : ''}${point.cumulativePnL.toLocaleString()}`}</title>
                  </circle>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      
      {/* X-Axis Labels */}
      <div className="flex justify-between px-2 mt-2 mb-4 ml-20">
        {data.map((item, index) => (
          <div
            key={item.date}
            className={`text-xs text-gray-500 dark:text-gray-400 text-center transition-opacity duration-200 ${
              index % 4 === 0 || index === data.length - 1 ? 'opacity-100' : 'opacity-0 hover:opacity-60'
            }`}
          >
            <div className="font-medium">{item.displayDate}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CumulativePnLChart;
