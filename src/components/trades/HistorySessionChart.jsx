import React, { Component, useEffect, useMemo, useState } from "react";
import { Loader2, Play } from "lucide-react";
import BacktestChart from "./BacktestChart";
import { fetchMarketCandles } from "../../utils/marketData";
import { sliceCandlesAroundTrades } from "../../utils/historyWindow";
import { tagColor } from "../../utils/tagColor";

// Only these three timeframes are switchable in the read-only history viewer.
const VIEWER_TFS = ["15m", "1h", "4h"];

// Minimal boundary so a chart render error degrades to a message instead of
// white-screening the whole history modal (CLAUDE.md §5).
class ChartBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          Unable to render this chart.
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Static, locked candle viewer for a saved backtest session. Frames the window
 * on exactly where the user placed their orders and lets them switch only
 * between 15m / 1h / 4h. No panning to past or future.
 */
function HistorySessionChart({ session, autoOpen = false }) {
  const trades = session.trades || [];

  const defaultTf = VIEWER_TFS.includes(session.timeframe) ? session.timeframe : "1h";
  const [tf, setTf] = useState(defaultTf);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // The chart only loads after the user presses Play — clicking through history
  // sessions shouldn't fire a market-data fetch for every one. When rendered
  // inline from a row's Play button, the row already is the trigger (autoOpen).
  const [opened, setOpened] = useState(autoOpen);

  // Detect dark mode so the chart theme matches the app (self-contained — the
  // modal doesn't thread a theme prop).
  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Re-fetch + reframe whenever the timeframe (or session) changes — but only
  // once the user has opened the chart via Play.
  useEffect(() => {
    if (!opened) return;
    let cancelled = false;

    setLoading(true);
    setError("");
    fetchMarketCandles(session.market, session.symbol, tf)
      .then((all) => {
        if (cancelled) return;
        const sliced = sliceCandlesAroundTrades(all, trades);
        if (sliced.length < 2) {
          setCandles([]);
          setError(
            "Intraday data for this period is no longer available. Try a higher timeframe."
          );
        } else {
          setCandles(sliced);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setCandles([]);
        setError(err?.message || "Could not load chart data. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [opened, tf, session.market, session.symbol, trades]);

  const visibleCount = useMemo(() => candles.length, [candles]);

  return (
    <div data-testid="history-session-chart" className="p-4">
      {/* Timeframe toggle — restricted to 15m / 1h / 4h, only once opened */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {session.instrumentName} · {session.symbol}
          </span>
          {(session.windowTags?.[1] || []).map((tag) => {
            const c = tagColor(tag);
            return (
              <span
                key={tag}
                data-testid={`history-chart-tag-${tag}`}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: c.bg, color: c.text }}
              >
                {tag}
              </span>
            );
          })}
        </div>
        {opened && (
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {VIEWER_TFS.map((t) => (
              <button
                key={t}
                data-testid={`history-chart-tf-${t}`}
                onClick={() => setTf(t)}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  tf === t
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart area — fixed height, locked (no pan/zoom past the window) */}
      <div
        data-testid="history-chart-container"
        className="relative h-[560px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        {!opened ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <button
              data-testid="history-chart-play-btn"
              onClick={() => setOpened(true)}
              className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg transition-colors"
              aria-label="Load session chart"
            >
              <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
            </button>
            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              View this session's price action
            </p>
          </div>
        ) : loading ? (
          <div
            data-testid="history-chart-loading"
            className="absolute inset-0 flex flex-col items-center justify-center text-gray-400"
          >
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading market data…</p>
          </div>
        ) : error ? (
          <div
            data-testid="history-chart-empty"
            className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-gray-400"
          >
            {error}
          </div>
        ) : (
          <ChartBoundary>
            <BacktestChart
              candleData={candles}
              visibleCount={visibleCount}
              trades={trades}
              userDrawings={session.drawings || []}
              isDark={isDark}
              locked
              symbol={session.symbol}
            />
          </ChartBoundary>
        )}
      </div>
    </div>
  );
}

export default HistorySessionChart;
