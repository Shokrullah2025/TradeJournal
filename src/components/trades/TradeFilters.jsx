import React, { useMemo } from "react";
import { X } from "lucide-react";
import { useTrades } from "../../context/TradeContext";

// Compact filter bar. Instrument and strategy options are derived from the
// user's actual trades so the choices always match real data (the old static
// list could offer symbols the user never traded, and hide ones they did).
const SELECT_CLASS =
  "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200";

const DEFAULT_FILTERS = {
  dateRange: "all",
  instrument: "all",
  strategy: "all",
  outcome: "all",
};

const TradeFilters = () => {
  const { filters, setFilters, trades } = useTrades();

  const { instruments, strategies } = useMemo(() => {
    const i = new Set();
    const s = new Set();
    (trades || []).forEach((t) => {
      if (t.instrument) i.add(t.instrument);
      if (t.strategy) s.add(t.strategy);
    });
    return {
      instruments: [...i].sort(),
      strategies: [...s].sort(),
    };
  }, [trades]);

  const handleFilterChange = (filterType, value) => {
    setFilters({ [filterType]: value });
  };

  const isActive = Object.keys(DEFAULT_FILTERS).some(
    (key) => filters[key] !== DEFAULT_FILTERS[key],
  );

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="trade-filters"
    >
      <select
        value={filters.outcome}
        onChange={(e) => handleFilterChange("outcome", e.target.value)}
        data-testid="trade-filter-outcome-select"
        className={SELECT_CLASS}
      >
        <option value="all">All trades</option>
        <option value="winning">Wins</option>
        <option value="losing">Losses</option>
      </select>

      <select
        value={filters.instrument}
        onChange={(e) => handleFilterChange("instrument", e.target.value)}
        data-testid="trade-filter-instrument-select"
        className={SELECT_CLASS}
      >
        <option value="all">All instruments</option>
        {instruments.map((sym) => (
          <option key={sym} value={sym}>
            {sym}
          </option>
        ))}
      </select>

      {strategies.length > 0 && (
        <select
          value={filters.strategy}
          onChange={(e) => handleFilterChange("strategy", e.target.value)}
          data-testid="trade-filter-strategy-select"
          className={SELECT_CLASS}
        >
          <option value="all">All strategies</option>
          {strategies.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.dateRange}
        onChange={(e) => handleFilterChange("dateRange", e.target.value)}
        data-testid="trade-filter-date-select"
        className={SELECT_CLASS}
      >
        <option value="all">All time</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
        <option value="90d">Last 90 days</option>
      </select>

      {isActive && (
        <button
          type="button"
          onClick={() => setFilters(DEFAULT_FILTERS)}
          data-testid="trade-filter-clear-btn"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  );
};

export default TradeFilters;
