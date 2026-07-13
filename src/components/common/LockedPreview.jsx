import React from "react";
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
  <div className="space-y-[18px]" data-testid="locked-preview-generic">
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
  <div className="card p-5" data-testid="locked-preview-ai-insights">
    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
      AI Insights
    </p>
    <GhostFade className="h-24">
      <GhostInsightLines />
    </GhostFade>
  </div>
);
