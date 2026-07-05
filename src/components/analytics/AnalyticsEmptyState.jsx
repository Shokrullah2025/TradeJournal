import React from "react";
import { useNavigate } from "react-router-dom";
import { Link2, PieChart } from "lucide-react";
import {
  GhostFade,
  PreviewPill,
  GhostHint,
  GhostStatCard,
  GhostSparkline,
  GhostDrawdown,
  GhostWinLossBars,
  GhostDailyBars,
  GhostEquityCurve,
  GhostHistogram,
  GhostScatter,
} from "../common/GhostPreview";

// Grayscale ghost previews for the Analytics page when the account has no
// trades at all. Mirrors the Overview layout (hero curve, metric tiles,
// distributions) with half-card faded sketches — same treatment as the
// dashboard's DashboardEmptyState. Render-only; no sample data is stored.

const AnalyticsEmptyState = () => {
  const navigate = useNavigate();
  const connectBroker = () => navigate("/brokers");

  return (
    <div className="space-y-[18px]" data-testid="analytics-ghost-state">
      {/* No-trades banner — the single teal CTA on the page */}
      <div
        className="card flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5"
        data-testid="analytics-ghost-banner"
      >
        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
          <PieChart className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            No trades to analyze yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The gray previews show what your analytics will look like once your
            trades come in.
          </p>
        </div>
        <button
          type="button"
          onClick={connectBroker}
          className="btn btn-primary flex items-center gap-1.5 self-start sm:self-auto"
          data-testid="analytics-ghost-connect-broker-btn"
        >
          <Link2 className="w-4 h-4" />
          Connect your broker
        </button>
      </div>

      {/* Ghost P&L overview hero */}
      <div
        className="card flex flex-col h-[300px]"
        data-testid="analytics-ghost-hero-card"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            P&L Overview
          </h3>
          <PreviewPill />
        </div>
        <GhostFade className="h-[46%]">
          <GhostEquityCurve />
        </GhostFade>
        <GhostHint title="Your full performance story starts here">
          Net P&L, win rate, profit factor and best day — across any time
          range.
        </GhostHint>
      </div>

      {/* Ghost performance metric tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GhostStatCard
          label="Profit Factor"
          hint="Gross profit ÷ gross loss"
          testId="analytics-ghost-profit-factor-card"
        >
          <GhostWinLossBars />
        </GhostStatCard>
        <GhostStatCard
          label="Expectancy"
          hint="Expected value per trade"
          testId="analytics-ghost-expectancy-card"
        >
          <GhostSparkline />
        </GhostStatCard>
        <GhostStatCard
          label="Sharpe Ratio"
          hint="Risk-adjusted return"
          testId="analytics-ghost-sharpe-card"
        >
          <GhostDrawdown />
        </GhostStatCard>
        <GhostStatCard
          label="Average Win"
          hint="Per winning trade"
          testId="analytics-ghost-avg-win-card"
        >
          <GhostDailyBars />
        </GhostStatCard>
      </div>

      {/* Ghost distribution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[18px]">
        <div
          className="card flex flex-col h-[300px]"
          data-testid="analytics-ghost-r-distribution-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              R-Multiple Distribution
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostHistogram />
          </GhostFade>
          <GhostHint title="Your risk-reward spread lands here">
            How many trades hit each return bucket, measured in units of risk
            (R).
          </GhostHint>
        </div>

        <div
          className="card flex flex-col h-[300px]"
          data-testid="analytics-ghost-hold-time-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Hold Time vs P&L
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostScatter />
          </GhostFade>
          <GhostHint title="Scalps or long holds — which pays you?">
            One dot per trade: profit against how long the position was held.
          </GhostHint>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsEmptyState;
