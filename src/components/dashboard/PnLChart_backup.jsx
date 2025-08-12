import React, { useEffect, useState } from "react";

const PnLChart = ({ trades }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const generateDailyPnLData = () => {
    const completedTrades = trades.filter((trade) => trade.status === "closed");
    
    if (completedTrades.length === 0) {
      // Generate mock data with only trading days
      return Array.from({ length: 12 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (i * 2 + 1)); // Skip some days to simulate trading days only
        const pnl = (Math.random() - 0.4) * 2000; // Slightly biased towards positive
        return {
          date: date.toISOString().split('T')[0],
          pnl: Math.round(pnl),
          displayDate: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
        };
      }).reverse();
    }

    // Group trades by date and calculate daily P&L
    const dailyPnL = {};
    
    completedTrades.forEach((trade) => {
      const date = new Date(trade.exitDate || trade.createdAt).toISOString().split('T')[0];
      if (!dailyPnL[date]) {
        dailyPnL[date] = 0;
      }
      dailyPnL[date] += trade.pnl;
    });

    // Only return days with actual trading activity (non-zero P&L)
    const tradingDays = Object.entries(dailyPnL)
      .filter(([_, pnl]) => pnl !== 0)
      .map(([dateStr, pnl]) => {
        const date = new Date(dateStr);
        return {
          date: dateStr,
          pnl: pnl,
          displayDate: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-30); // Last 30 trading days

    return tradingDays;
  };

  const data = generateDailyPnLData();
  const maxAbsPnL = Math.max(...data.map(d => Math.abs(d.pnl)));

  const CandleBar = ({ pnl, height, index }) => {
    const isPositive = pnl >= 0;
    const barHeight = Math.max(4, (Math.abs(pnl) / maxAbsPnL) * height * 0.8); // Minimum 4px height
    
    return (
      <div className="flex flex-col items-center justify-end h-full relative group">
        {/* P&L Value Tooltip */}
        <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
            ${pnl >= 0 ? '+' : ''}${pnl.toLocaleString()}
          </div>
        </div>
        
        {/* Candle Bar */}
        <div
          className={`w-4 rounded-t-sm rounded-b-sm transition-all duration-300 hover:scale-110 cursor-pointer ${
            isPositive 
              ? 'bg-gradient-to-t from-green-400 to-green-500 hover:from-green-500 hover:to-green-600 shadow-green-200 dark:shadow-green-800' 
              : 'bg-gradient-to-t from-red-400 to-red-500 hover:from-red-500 hover:to-red-600 shadow-red-200 dark:shadow-red-800'
          } shadow-sm hover:shadow-md`}
          style={{
            height: `${barHeight}px`,
            marginBottom: isPositive ? '0' : 'auto',
            marginTop: isPositive ? 'auto' : '0',
          }}
        />
      </div>
    );
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <p>No closed trades available</p>
          <p className="text-sm mt-1">
            Complete some trades to see P&L distribution
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      {/* Chart Container with Y-axis */}
      <div className="flex h-48">
        {/* Y-axis Labels */}
        <div className="flex flex-col justify-between py-2 pr-3 text-xs text-gray-500 dark:text-gray-400 w-16 text-right">
          <span>${(maxAbsPnL).toLocaleString()}</span>
          <span>${(maxAbsPnL / 2).toLocaleString()}</span>
          <span>$0</span>
          <span>-${(maxAbsPnL / 2).toLocaleString()}</span>
          <span>-${(maxAbsPnL).toLocaleString()}</span>
        </div>
        
        {/* Chart Area */}
        <div className="flex-1 h-full flex items-end justify-between px-2 relative bg-gradient-to-t from-gray-50 to-transparent dark:from-gray-800/30 dark:to-transparent rounded-lg">
          {/* Zero Line */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-300 dark:bg-gray-600 transform -translate-y-1/2 z-0" />
          
          {/* Grid Lines */}
          <div className="absolute left-0 right-0 top-2 h-px bg-gray-200 dark:bg-gray-700 opacity-50" />
          <div className="absolute left-0 right-0 top-1/4 h-px bg-gray-200 dark:bg-gray-700 opacity-50" />
          <div className="absolute left-0 right-0 bottom-1/4 h-px bg-gray-200 dark:bg-gray-700 opacity-50" />
          <div className="absolute left-0 right-0 bottom-2 h-px bg-gray-200 dark:bg-gray-700 opacity-50" />
          
          {/* Candle Bars */}
          {data.map((item, index) => (
            <CandleBar
              key={item.date}
              pnl={item.pnl}
              height={180}
              index={index}
            />
          ))}
        </div>
      </div>
      
      {/* Date Labels */}
      <div className="flex justify-between px-2 ml-16 mt-2">
        {data.map((item, index) => (
          <div
            key={item.date}
            className={`text-xs text-gray-500 dark:text-gray-400 ${
              data.length <= 15 || index % Math.ceil(data.length / 8) === 0 || index === data.length - 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {item.displayDate}
          </div>
        ))}
      </div>
      
      {/* Summary Stats */}
      <div className="flex justify-between items-center mt-4 px-2 ml-16">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gradient-to-t from-green-400 to-green-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Winning Days: {data.filter(d => d.pnl > 0).length}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gradient-to-t from-red-400 to-red-500 rounded-full"></div>
            <span className="text-gray-600 dark:text-gray-400">
              Losing Days: {data.filter(d => d.pnl < 0).length}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Win Rate: {((data.filter(d => d.pnl > 0).length / data.length) * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
};

export default PnLChart;
