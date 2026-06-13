import React, { useEffect, useState } from "react";
import { RefreshCw, PauseCircle } from "lucide-react";

const formatRemaining = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/** "Next refresh in m:ss" countdown with a manual refresh button. */
const RefreshCountdown = ({ nextRefreshAt, isPaused, onRefresh, loading }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
      {isPaused ? (
        <span
          data-testid="signal-paused-badge"
          className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
        >
          <PauseCircle className="w-4 h-4" />
          Paused (tab hidden)
        </span>
      ) : (
        <span data-testid="signal-countdown-value">
          {nextRefreshAt
            ? `Next refresh in ${formatRemaining(nextRefreshAt - now)}`
            : "Waiting for data…"}
        </span>
      )}
      <button
        type="button"
        data-testid="signal-refresh-btn"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        Refresh
      </button>
    </div>
  );
};

export default RefreshCountdown;
