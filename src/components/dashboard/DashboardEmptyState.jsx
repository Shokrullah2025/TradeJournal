import React from "react";
import { useNavigate } from "react-router-dom";
import { Link2, BarChart3 } from "lucide-react";
import {
  GhostFade,
  PreviewPill,
  GhostHint,
  GhostStatCard,
  GhostSparkline,
  GhostDonut,
  GhostDrawdown,
  GhostWinLossBars,
  GhostDailyBars,
  GhostEquityCurve,
  GhostHeatmap,
  GhostScatter,
  GhostInsightLines,
} from "../common/GhostPreview";

// Grayscale ghost previews shown when the user has no trades yet. Each card
// keeps the live dashboard's slot but fills only its top half with a faded
// gray sketch of the real chart, plus a hint of what will appear there.
// Everything is render-only — no sample data is ever written anywhere.

// Skeleton tile standing in for a RecentTrades trade card.
const GhostTradeTile = () => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-600" />
        <div className="h-2.5 w-16 rounded bg-gray-100 dark:bg-gray-700" />
      </div>
      <div className="h-4 w-12 rounded-full bg-gray-100 dark:bg-gray-700" />
    </div>
    <div className="mt-3 h-5 w-20 rounded bg-gray-200 dark:bg-gray-600" />
  </div>
);

const DashboardEmptyState = () => {
  const navigate = useNavigate();
  const connectBroker = () => navigate("/brokers");

  return (
    <div className="space-y-6" data-testid="dashboard-empty-state">
      {/* No-trades banner — the single teal CTA on the page */}
      <div
        className="card flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5"
        data-testid="empty-state-banner"
      >
        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            No trades yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The gray previews show what each card will look like once your
            trades come in.
          </p>
        </div>
        <button
          type="button"
          onClick={connectBroker}
          className="btn btn-primary flex items-center gap-1.5 self-start sm:self-auto"
          data-testid="empty-state-connect-broker-btn"
        >
          <Link2 className="w-4 h-4" />
          Connect your broker
        </button>
      </div>

      {/* Ghost stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GhostStatCard
          label="Total P&L"
          hint="Your running P&L shows here"
          testId="empty-stat-total-pnl-card"
        >
          <GhostSparkline />
        </GhostStatCard>
        <GhostStatCard
          label="Win Rate"
          hint="% of winning trades"
          testId="empty-stat-win-rate-card"
        >
          <GhostDonut />
        </GhostStatCard>
        <GhostStatCard
          label="Max Drawdown"
          hint="Worst peak-to-trough dip"
          testId="empty-stat-max-drawdown-card"
        >
          <GhostDrawdown />
        </GhostStatCard>
        <GhostStatCard
          label="Avg Win/Loss"
          hint="Reward vs risk ratio"
          testId="empty-stat-avg-win-loss-card"
        >
          <GhostWinLossBars />
        </GhostStatCard>
      </div>

      {/* Ghost chart cards — same 3-column slots as the live dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="card flex flex-col h-[340px]"
          data-testid="empty-chart-daily-pnl-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Daily P&L
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostDailyBars />
          </GhostFade>
          <GhostHint title="Your daily wins & losses will chart here">
            Green bars for winning days, red for losing days.
          </GhostHint>
        </div>

        <div
          className="card flex flex-col h-[340px]"
          data-testid="empty-chart-cumulative-pnl-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cumulative P&L
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostEquityCurve />
          </GhostFade>
          <GhostHint title="Your equity curve grows here">
            Running total of P&L across sessions.
          </GhostHint>
        </div>

        <div
          className="card hidden lg:flex flex-col h-[340px]"
          data-testid="empty-chart-when-you-win-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              When You Win
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostHeatmap />
          </GhostFade>
          <GhostHint title="Your winning hours map here">
            Avg P&L by weekday & trading hour.
          </GhostHint>
        </div>
      </div>

      {/* Ghost bottom row: recent trades + outcomes/insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card" data-testid="empty-recent-trades-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Trades
            </h3>
            <PreviewPill />
          </div>
          <GhostFade>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GhostTradeTile />
              <GhostTradeTile />
            </div>
          </GhostFade>
          <div className="text-center mt-4">
            <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
              Your trade history lives here
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Connect your broker and your trades import automatically.
            </p>
            <button
              type="button"
              onClick={connectBroker}
              className="btn btn-primary inline-flex items-center gap-1.5 mt-3"
              data-testid="empty-recent-trades-connect-broker-btn"
            >
              <Link2 className="w-4 h-4" />
              Connect your broker
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card hidden lg:block" data-testid="empty-trade-outcomes-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trade Outcomes
              </h3>
              <PreviewPill />
            </div>
            <GhostFade className="h-16">
              <GhostScatter />
            </GhostFade>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
              One dot per closed trade — wins above, losses below.
            </p>
          </div>

          <div className="card" data-testid="empty-ai-insights-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trading Insights
              </h3>
              <PreviewPill />
            </div>
            <GhostFade className="h-14">
              <GhostInsightLines />
            </GhostFade>
            <div className="text-center mt-1">
              <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                AI insights unlock with data
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Personalized patterns after your first closed trades.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEmptyState;
