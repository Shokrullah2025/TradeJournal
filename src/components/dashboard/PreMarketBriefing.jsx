import React, { useCallback, useMemo, useState } from "react";
import { X } from "lucide-react";
import { computeBriefingStats, localDateKey } from "../../utils/briefingStats";

// Dismissal is per-day: storing today's date key means the card reappears
// automatically tomorrow. Not sensitive data, so localStorage is fine here.
const DISMISS_KEY = "pre_market_briefing_dismissed";

const fmtMoney = (v) => {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}$${Math.abs(Math.round(v)).toLocaleString()}`;
};

const fmtHourRange = (h) => {
  const label = (x) => {
    const h12 = ((x + 11) % 12) + 1;
    return `${h12}`;
  };
  const suffix = (h + 1) % 24 >= 12 ? "PM" : "AM";
  return `${label(h)}–${label(h + 1)} ${suffix}`;
};

const greeting = (now) => {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
};

const rankLabel = (dow) => {
  if (dow.rank === 1) return "your best day";
  if (dow.rank === dow.rankOf) return "your toughest day";
  return `#${dow.rank} of ${dow.rankOf} days`;
};

const Tile = ({ label, value, valueClass, sub, testId }) => (
  <div className="flex-1 min-w-[140px] bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2.5">
    <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
    <div
      className={`text-lg font-bold ${valueClass || "text-gray-900 dark:text-gray-100"}`}
      data-testid={testId}
    >
      {value}
    </div>
    <div className="text-[11px] text-gray-500 dark:text-gray-400">{sub}</div>
  </div>
);

const PreMarketBriefing = ({ trades, user }) => {
  const now = useMemo(() => new Date(), []);
  const todayKey = localDateKey(now);

  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === todayKey;
    } catch {
      return false;
    }
  });

  const stats = useMemo(() => computeBriefingStats(trades, now), [trades, now]);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, todayKey);
    } catch {
      // storage unavailable (private mode) — dismiss for this render only
    }
    setDismissed(true);
  }, [todayKey]);

  if (dismissed || !stats) return null;

  const firstName =
    user?.firstName ||
    user?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "trader";

  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const { dow, goldenHour, lastSession, openPositions, warning } = stats;

  return (
    <div
      className="card !p-4 border-l-4 border-l-success-500"
      data-testid="pre-market-briefing"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            {greeting(now)}, {firstName} 👋{" "}
            <span className="font-normal text-gray-500 dark:text-gray-400">
              — {dateLabel}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Your pre-market briefing, built from your trading history
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Dismiss briefing for today"
          data-testid="pre-market-briefing-dismiss-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mt-3">
        {dow && (
          <Tile
            label={
              dow.isNextSession ? `${dow.name}s (next session)` : `Your ${dow.name}s`
            }
            value={fmtMoney(dow.avgSession) + " avg"}
            valueClass={
              dow.avgSession >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }
            sub={`${Math.round(dow.winRate * 100)}% win rate — ${rankLabel(dow)}`}
            testId="briefing-dow-value"
          />
        )}
        {goldenHour && (
          <Tile
            label="Your golden hour"
            value={fmtHourRange(goldenHour.hour)}
            sub={`${Math.round(goldenHour.winRate * 100)}% win rate · ${fmtMoney(
              goldenHour.avg
            )} avg/trade`}
            testId="briefing-golden-hour-value"
          />
        )}
        {lastSession && (
          <Tile
            label="Last session"
            value={fmtMoney(lastSession.pnl)}
            valueClass={
              lastSession.pnl >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }
            sub={`${lastSession.count} trade${lastSession.count === 1 ? "" : "s"} · ${
              lastSession.wins
            } win${lastSession.wins === 1 ? "" : "s"}${
              lastSession.topInstrument ? ` · ${lastSession.topInstrument}` : ""
            }`}
            testId="briefing-last-session-value"
          />
        )}
        <Tile
          label="Open positions"
          value={openPositions.count}
          sub={
            openPositions.count === 0
              ? "Flat — no open risk"
              : openPositions.instruments.join(", ")
          }
          testId="briefing-open-positions-value"
        />
      </div>

      {warning && (
        <div
          className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2"
          data-testid="briefing-warning"
        >
          {warning.type === "hour"
            ? `⚠️ Heads-up: your trades around ${fmtHourRange(
                warning.hour
              )} win only ${Math.round(
                warning.winRate * 100
              )}% of the time (${warning.count} trades). Consider avoiding that window today.`
            : `⚠️ Heads-up: you're on a ${warning.length}-trade losing streak. Consider sizing down until you book a win.`}
        </div>
      )}
    </div>
  );
};

export default PreMarketBriefing;
