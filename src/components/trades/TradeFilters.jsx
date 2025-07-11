import React from "react";
import { useTrades } from "../../context/TradeContext";

const TradeFilters = () => {
  const { filters, setFilters } = useTrades();

  const handleFilterChange = (filterType, value) => {
    setFilters({ [filterType]: value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <select
          value={filters.dateRange}
          onChange={(e) => handleFilterChange("dateRange", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Time</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instrument
        </label>
        <select
          value={filters.instrument}
          onChange={(e) => handleFilterChange("instrument", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Instruments</option>
          <option value="AAPL">AAPL</option>
          <option value="GOOGL">GOOGL</option>
          <option value="MSFT">MSFT</option>
          <option value="TSLA">TSLA</option>
          <option value="SPY">SPY</option>
          <option value="QQQ">QQQ</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Strategy
        </label>
        <select
          value={filters.strategy}
          onChange={(e) => handleFilterChange("strategy", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Strategies</option>
          <option value="Breakout">Breakout</option>
          <option value="Pullback">Pullback</option>
          <option value="Momentum">Momentum</option>
          <option value="Mean Reversion">Mean Reversion</option>
          <option value="Scalping">Scalping</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Outcome
        </label>
        <select
          value={filters.outcome}
          onChange={(e) => handleFilterChange("outcome", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Trades</option>
          <option value="winning">Winning Trades</option>
          <option value="losing">Losing Trades</option>
        </select>
      </div>
    </div>
  );
};

export default TradeFilters;
