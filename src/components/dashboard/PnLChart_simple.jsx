import React, { useEffect, useState } from "react";

const PnLChart = ({ trades = [] }) => {
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

  // Generate daily P&L data from real trades
  const generateDailyPnLData = () => {
    // Handle undefined or null trades
    const validTrades = trades || [];
    const completedTrades = validTrades.filter((trade) => trade && trade.status === "closed");
    
    if (completedTrades.length === 0) {
      // If no real trades, show empty state or minimal mock data
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

    // Convert to array and sort by date, only include trading days (non-zero P&L)
    return Object.entries(dailyPnL)
      .filter(([date, pnl]) => pnl !== 0)
      .map(([date, pnl]) => {
        const dateObj = new Date(date);
        return {
          date,
          pnl,
          displayDate: `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}`,
          fullDate: `${(dateObj.getMonth() + 1).toString().padStart(2, '0')}/${dateObj.getDate().toString().padStart(2, '0')}/${dateObj.getFullYear()}`,
          dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 trading days
  };

  const data = generateDailyPnLData();
  
  // Handle empty data case
  if (!data || data.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400 text-center">
          <div className="text-lg mb-2">No trading data available</div>
          <div className="text-sm">Start adding trades to see your daily P&L distribution</div>
        </div>
      </div>
    );
  }
  
  const maxPnL = Math.max(...data.map(d => d.pnl), 0);
  const minPnL = Math.min(...data.map(d => d.pnl), 0);
  const maxAbsPnL = Math.max(Math.abs(maxPnL), Math.abs(minPnL), 1); // Ensure not zero

  const CandleBar = ({ pnl, index }) => {
    const isPositive = pnl >= 0;
    const heightPercent = Math.max(2, (Math.abs(pnl) / maxAbsPnL) * 40); // 40% max height for each direction
    
    return (
      <div className="relative h-full w-full flex flex-col items-center group">
        {/* Tooltip */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none">
          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap font-medium">
            <div className="text-center">
              <div className={`font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                ${pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
              </div>
              <div className="text-xs opacity-75 mt-0.5">
                {data[index]?.fullDate}
              </div>
              <div className="text-xs opacity-60 mt-0.5">
                {data[index]?.dayOfWeek}
              </div>
            </div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
            </div>
          </div>
        </div>
        
        {/* Candle container positioned from center (zero line) */}
        <div className="relative w-full h-full flex items-center justify-center">
          {isPositive ? (
            // Positive bar - extends upward from center
            <div
              className="w-3 rounded-sm transition-all duration-300 hover:w-4 cursor-pointer bg-gradient-to-t from-green-500 via-green-400 to-green-300 hover:from-green-600 hover:via-green-500 hover:to-green-400 shadow-sm hover:shadow-lg hover:shadow-green-200 dark:hover:shadow-green-800/50 border border-white/20 absolute group-hover:scale-y-110"
              style={{
                height: `${heightPercent}%`,
                bottom: '50%', // Start from center line going up
                transformOrigin: 'bottom center', // Scale upward from bottom (zero line)
              }}
            >
              <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          ) : (
            // Negative bar - extends downward from center
            <div
              className="w-3 rounded-sm transition-all duration-300 hover:w-4 cursor-pointer bg-gradient-to-b from-red-500 via-red-400 to-red-300 hover:from-red-600 hover:via-red-500 hover:to-red-400 shadow-sm hover:shadow-lg hover:shadow-red-200 dark:hover:shadow-red-800/50 border border-white/20 absolute group-hover:scale-y-110"
              style={{
                height: `${heightPercent}%`,
                top: '50%', // Start from center line going down
                transformOrigin: 'top center', // Scale downward from top (zero line)
              }}
            >
              <div className="absolute inset-0 rounded-sm bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const generateYAxisLabels = () => {
    if (maxAbsPnL === 0) return ['$0'];
    
    const step = Math.max(1, Math.ceil(maxAbsPnL / 2 / 100) * 100); // Divide by 2 since we show both positive and negative
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
          
          {/* Zero Line - positioned to align with $0 label */}
          <div 
            className="absolute left-0 right-0 border-t-2 border-gray-400 dark:border-gray-500 z-10"
            style={{ top: `${(Math.floor(yAxisLabels.length / 2) / (yAxisLabels.length - 1)) * 100}%` }}
          />
          
          {/* Candle Bars Container - positioned to fill entire height */}
          <div className="absolute inset-0 flex justify-between px-2 gap-0.5">
            {data.map((item, index) => (
              <CandleBar
                key={item.date}
                pnl={item.pnl}
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* X-Axis Labels */}
      <div className="flex justify-between px-2 mt-2 mb-4 ml-20">
        {data.map((item, index) => (
          <div
            key={item.date}
            className={`text-xs text-gray-500 dark:text-gray-400 text-center transition-opacity duration-200 ${
              index % 3 === 0 || index === data.length - 1 ? 'opacity-100' : 'opacity-0 hover:opacity-60'
            }`}
          >
            <div className="font-medium">{item.displayDate}</div>
            <div className="text-xs opacity-75 mt-0.5">{item.dayOfWeek}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PnLChart;
