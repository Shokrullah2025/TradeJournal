import React from "react";
import PropTypes from "prop-types";
import {
  GhostFade,
  GhostStatCard,
  GhostSparkline,
  GhostDrawdown,
  GhostWinLossBars,
  GhostDailyBars,
  GhostEquityCurve,
  GhostHistogram,
  GhostInsightLines,
  GhostHeatmap,
  GhostScatter,
  GhostField,
  GhostButton,
  GhostTableRows,
  GhostBrokerTile,
  GhostGauge,
} from "./GhostPreview";

// ── Locked-feature previews ──────────────────────────────────────────────────
// Fake, gray-only teasers shown behind the FeatureGate upgrade overlay for a
// plan-locked feature. Critically these mount INSTEAD of the real page — the
// real component (and its Supabase queries) never runs for a locked user, so
// there is no live data in the browser to reveal by stripping the blur/CSS.
// All sketches are render-only; no sample data touches state or the database.

// A believable analytics/backtest-style dashboard teaser used as the default
// when a call site doesn't supply its own preview.
export const GenericLockedPreview = () => (
  <div className="space-y-[18px]" data-test-id="locked-preview-generic">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <GhostStatCard label="Net P&L" hint="Upgrade to unlock" testId="locked-preview-stat-1">
        <GhostSparkline />
      </GhostStatCard>
      <GhostStatCard label="Win rate" hint="Upgrade to unlock" testId="locked-preview-stat-2">
        <GhostWinLossBars />
      </GhostStatCard>
      <GhostStatCard label="Profit factor" hint="Upgrade to unlock" testId="locked-preview-stat-3">
        <GhostDailyBars />
      </GhostStatCard>
      <GhostStatCard label="Max drawdown" hint="Upgrade to unlock" testId="locked-preview-stat-4">
        <GhostDrawdown />
      </GhostStatCard>
    </div>

    <div className="card p-5">
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
        Equity curve
      </p>
      <GhostFade className="h-48">
        <GhostEquityCurve />
      </GhostFade>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
          R-multiple distribution
        </p>
        <GhostFade className="h-32">
          <GhostHistogram />
        </GhostFade>
      </div>
      <div className="card p-5">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
          Daily P&L
        </p>
        <GhostFade className="h-32">
          <GhostDailyBars />
        </GhostFade>
      </div>
    </div>
  </div>
);

// Compact teaser for the Dashboard AI Insights cards (inline gate).
export const AiInsightsLockedPreview = () => (
  <div className="card p-5" data-test-id="locked-preview-ai-insights">
    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
      AI Insights
    </p>
    <GhostFade className="h-24">
      <GhostInsightLines />
    </GhostFade>
  </div>
);

// A section header used across the page-level previews below.
const PreviewCard = ({ title, className = "", children }) => (
  <div className={`card p-5 ${className}`}>
    <p className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
      {title}
    </p>
    {children}
  </div>
);

PreviewCard.propTypes = {
  title: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.node,
};

// ── Backtesting ─────────────────────────────────────────────────────────────
// Sketches the backtest studio: a setup panel, the run action, headline result
// stats, an equity curve and the simulated-trade log.
export const BacktestingLockedPreview = () => (
  <div className="space-y-[18px]" data-test-id="locked-preview-backtesting">
    <PreviewCard title="New backtest session">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <GhostField label="Strategy" />
        <GhostField label="Instrument" />
        <GhostField label="Start date" />
        <GhostField label="End date" />
      </div>
      <div className="mt-4 flex justify-end">
        <GhostButton className="w-36" />
      </div>
    </PreviewCard>

    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <GhostStatCard label="Total return" hint="Upgrade to unlock" testId="locked-preview-backtest-stat-1">
        <GhostSparkline />
      </GhostStatCard>
      <GhostStatCard label="Win rate" hint="Upgrade to unlock" testId="locked-preview-backtest-stat-2">
        <GhostWinLossBars />
      </GhostStatCard>
      <GhostStatCard label="Profit factor" hint="Upgrade to unlock" testId="locked-preview-backtest-stat-3">
        <GhostDailyBars />
      </GhostStatCard>
      <GhostStatCard label="Max drawdown" hint="Upgrade to unlock" testId="locked-preview-backtest-stat-4">
        <GhostDrawdown />
      </GhostStatCard>
    </div>

    <PreviewCard title="Simulated equity curve">
      <GhostFade className="h-48">
        <GhostEquityCurve />
      </GhostFade>
    </PreviewCard>

    <PreviewCard title="Simulated trades">
      <GhostTableRows rows={5} cols={5} />
    </PreviewCard>
  </div>
);

// ── Broker sync ─────────────────────────────────────────────────────────────
// Sketches the broker picker: a search box and a grid of connectable brokers.
export const BrokerSyncLockedPreview = () => (
  <div className="space-y-[18px]" data-test-id="locked-preview-broker-sync">
    <PreviewCard title="Connect a broker">
      <div className="grid grid-cols-2 gap-4">
        <GhostField label="Search brokers" wide />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <GhostBrokerTile key={i} />
        ))}
      </div>
    </PreviewCard>

    <PreviewCard title="Recently synced trades">
      <GhostTableRows rows={4} cols={5} />
    </PreviewCard>
  </div>
);

// ── Advanced analytics ──────────────────────────────────────────────────────
// Sketches the breakdowns that separate this from the basic dashboard:
// R-multiple distribution, win/loss scatter and the time-of-day heatmap.
export const AdvancedAnalyticsLockedPreview = () => (
  <div className="space-y-[18px]" data-test-id="locked-preview-advanced-analytics">
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <GhostStatCard label="Expectancy" hint="Upgrade to unlock" testId="locked-preview-analytics-stat-1">
        <GhostSparkline />
      </GhostStatCard>
      <GhostStatCard label="Profit factor" hint="Upgrade to unlock" testId="locked-preview-analytics-stat-2">
        <GhostWinLossBars />
      </GhostStatCard>
      <GhostStatCard label="Avg R-multiple" hint="Upgrade to unlock" testId="locked-preview-analytics-stat-3">
        <GhostHistogram />
      </GhostStatCard>
      <GhostStatCard label="Max drawdown" hint="Upgrade to unlock" testId="locked-preview-analytics-stat-4">
        <GhostDrawdown />
      </GhostStatCard>
    </div>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <PreviewCard title="R-multiple distribution">
        <GhostFade className="h-40">
          <GhostHistogram />
        </GhostFade>
      </PreviewCard>
      <PreviewCard title="Win / loss by trade">
        <GhostFade className="h-40">
          <GhostScatter />
        </GhostFade>
      </PreviewCard>
    </div>

    <PreviewCard title="When you win — by day and session">
      <GhostFade className="h-40">
        <GhostHeatmap />
      </GhostFade>
    </PreviewCard>
  </div>
);

// ── Risk calculator ─────────────────────────────────────────────────────────
// Sketches the position-size form and its result panel — no charts, because the
// real page has none. This is the whole reason a per-feature preview matters:
// the generic analytics ghost was a lie about what sits behind the lock.
export const RiskCalculatorLockedPreview = () => (
  <div
    className="grid grid-cols-1 gap-[18px] lg:grid-cols-2"
    data-test-id="locked-preview-risk-calculator"
  >
    <PreviewCard title="Position size calculator">
      <div className="grid grid-cols-2 gap-4">
        <GhostField label="Account balance" />
        <GhostField label="Risk per trade %" />
        <GhostField label="Entry price" />
        <GhostField label="Stop loss" />
        <GhostField label="Take profit" />
        <GhostField label="Instrument" />
      </div>
      <div className="mt-5">
        <GhostButton className="w-full" />
      </div>
    </PreviewCard>

    <PreviewCard title="Your risk">
      <GhostFade className="h-28">
        <GhostGauge />
      </GhostFade>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 text-center dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Position size
          </p>
          <p className="text-lg font-bold text-gray-400 dark:text-gray-500">—</p>
        </div>
        <div className="rounded-xl border border-gray-200 p-4 text-center dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Risk / reward
          </p>
          <p className="text-lg font-bold text-gray-400 dark:text-gray-500">—</p>
        </div>
      </div>
      <div className="mt-4">
        <GhostTableRows rows={3} cols={3} />
      </div>
    </PreviewCard>
  </div>
);
