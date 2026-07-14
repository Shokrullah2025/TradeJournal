import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Sparkles, RefreshCw, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

// Tailwind classes per insight tone, mirroring the dashboard's success/warning/
// primary palette so AI output sits visually alongside the rest of the UI.
const TONE_STYLES = {
  positive:
    "bg-success-50 dark:bg-success-900/30 border-success-100 dark:border-success-800 text-success-700 dark:text-success-300",
  warning:
    "bg-warning-50 dark:bg-warning-900/30 border-warning-100 dark:border-warning-800 text-warning-700 dark:text-warning-300",
  info: "bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-300",
};

// Build a compact, privacy-safe summary of the user's OWN closed trades to send
// to the Edge Function. Only aggregates leave the browser — never raw trades.
function summarize(trades, stats) {
  const closed = (trades || []).filter((t) => t && t.status === "closed");

  // Per-instrument P&L and counts, top 5 by trade volume.
  const byInstrument = {};
  closed.forEach((t) => {
    const sym = t.instrument || "UNKNOWN";
    if (!byInstrument[sym]) byInstrument[sym] = { symbol: sym, trades: 0, pnl: 0 };
    byInstrument[sym].trades += 1;
    byInstrument[sym].pnl += t.pnl || 0;
  });
  const instruments = Object.values(byInstrument)
    .sort((a, b) => b.trades - a.trades)
    .slice(0, 5)
    .map((i) => ({ ...i, pnl: Math.round(i.pnl * 100) / 100 }));

  // Current win/loss streak from the most recent closed trades.
  const ordered = [...closed].sort(
    (a, b) =>
      new Date(b.exitDate || b.exit_date || b.createdAt || b.created_at || 0) -
      new Date(a.exitDate || a.exit_date || a.createdAt || a.created_at || 0),
  );
  let recentStreak = null;
  if (ordered.length > 0) {
    const first = ordered[0].pnl || 0;
    const type = first >= 0 ? "win" : "loss";
    let length = 0;
    for (const t of ordered) {
      const isWin = (t.pnl || 0) >= 0;
      if ((type === "win") === isWin) length += 1;
      else break;
    }
    recentStreak = { type, length };
  }

  return {
    stats: {
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      totalPnL: stats.totalPnL,
      avgWin: stats.avgWin,
      avgLoss: stats.avgLoss,
      profitFactor: stats.profitFactor,
      maxDrawdown: stats.maxDrawdown,
    },
    instruments,
    recentStreak,
  };
}

const AIInsights = ({ trades, stats }) => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const hasTrades = stats.totalTrades > 0;

  // Avoid setState after unmount when the request is in flight (CLAUDE.md §3).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const payload = useMemo(() => summarize(trades, stats), [trades, stats]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "ai-insights",
        { body: payload },
      );
      if (fnError) throw fnError;
      if (!data?.success) {
        throw new Error(data?.error || "Could not generate insights.");
      }
      if (mountedRef.current) setInsights(data.data.insights || []);
    } catch (err) {
      if (mountedRef.current) {
        setError(
          "We couldn't generate insights right now. Please try again.",
        );
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [payload]);

  return (
    <div className="card" data-test-id="ai-insights-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <span>AI Insights</span>
          </div>
        </h3>
        {hasTrades && (insights.length > 0 || error) && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            data-test-id="ai-insights-refresh-btn"
            className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center space-x-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Empty: no trades to analyze yet */}
      {!hasTrades && (
        <div
          className="text-sm text-gray-500 dark:text-gray-400 text-center py-4"
          data-test-id="ai-insights-empty-state"
        >
          Add closed trades to get personalized AI feedback.
        </div>
      )}

      {/* Loading */}
      {hasTrades && loading && insights.length === 0 && (
        <div
          className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400"
          data-test-id="ai-insights-loading-spinner"
        >
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Analyzing your trades…</span>
        </div>
      )}

      {/* Error */}
      {hasTrades && error && !loading && (
        <div
          className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 border border-danger-100 dark:border-danger-800 flex items-start space-x-2"
          data-test-id="ai-insights-error"
        >
          <AlertCircle className="w-4 h-4 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-danger-700 dark:text-danger-300">{error}</p>
        </div>
      )}

      {/* Initial call-to-action before the first generation */}
      {hasTrades && !loading && !error && insights.length === 0 && (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Get personalized feedback on your trading, generated from your stats.
          </p>
          <button
            type="button"
            onClick={generate}
            data-test-id="ai-insights-generate-btn"
            className="btn btn-primary inline-flex items-center space-x-2 text-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate insights</span>
          </button>
        </div>
      )}

      {/* Results */}
      {insights.length > 0 && (
        <div className="space-y-3" data-test-id="ai-insights-list">
          {insights.map((insight, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border ${TONE_STYLES[insight.tone] || TONE_STYLES.info}`}
              data-test-id={`ai-insight-${i}`}
            >
              <p className="text-sm">{insight.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

AIInsights.propTypes = {
  trades: PropTypes.array.isRequired,
  stats: PropTypes.shape({
    totalTrades: PropTypes.number,
    winRate: PropTypes.number,
    totalPnL: PropTypes.number,
    avgWin: PropTypes.number,
    avgLoss: PropTypes.number,
    profitFactor: PropTypes.number,
    maxDrawdown: PropTypes.number,
  }).isRequired,
};

export default AIInsights;
