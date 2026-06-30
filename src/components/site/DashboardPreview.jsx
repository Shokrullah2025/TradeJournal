import React from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

/**
 * Pure CSS/SVG mock of the app dashboard, shown in the hero so the landing
 * page looks real without shipping a screenshot. Purely decorative — its
 * internals are exempt from data-test-id per CLAUDE.md §9; the container
 * carries `site-hero-preview` for automation to locate it.
 */
const STAT_TILES = [
  { label: "Net P&L", value: "+$12,480", positive: true },
  { label: "Win rate", value: "63.2%", positive: true },
  { label: "Profit factor", value: "2.4", positive: true },
  { label: "Max drawdown", value: "-8.1%", positive: false },
];

// A gently rising equity curve, drawn as an SVG polyline over a 320x120 grid.
const CURVE_POINTS =
  "0,108 28,96 56,100 84,78 112,84 140,60 168,66 196,44 224,50 252,30 280,22 320,8";

const DashboardPreview = () => (
  <div
    data-test-id="site-hero-preview"
    className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:p-6"
  >
    {/* Window chrome */}
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-600">
          <TrendingUp className="h-4 w-4 text-white" />
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Dashboard
        </span>
      </div>
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-200 dark:bg-gray-600" />
      </div>
    </div>

    {/* Stat tiles */}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAT_TILES.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/40"
        >
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
            {tile.label}
          </p>
          <p
            className={`mt-1 flex items-center gap-1 text-sm font-bold ${
              tile.positive
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }`}
          >
            {tile.positive ? (
              <ArrowUpRight className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="h-3.5 w-3.5" />
            )}
            {tile.value}
          </p>
        </div>
      ))}
    </div>

    {/* Equity curve */}
    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Equity curve
        </span>
        <span className="text-xs font-semibold text-success-600 dark:text-success-400">
          +18.4%
        </span>
      </div>
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="none"
        className="h-28 w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="siteHeroCurve" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`0,120 ${CURVE_POINTS} 320,120`}
          fill="url(#siteHeroCurve)"
        />
        <polyline
          points={CURVE_POINTS}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>

    {/* Mini trade rows */}
    <div className="mt-4 space-y-2">
      {[
        { sym: "ES", positive: true, val: "+$420" },
        { sym: "NQ", positive: false, val: "-$135" },
        { sym: "CL", positive: true, val: "+$890" },
      ].map((row) => (
        <div
          key={row.sym}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-100 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              {row.sym}
            </span>
            <span className="h-2 w-16 rounded-full bg-gray-100 dark:bg-gray-700" />
          </div>
          <span
            className={`text-xs font-semibold ${
              row.positive
                ? "text-success-600 dark:text-success-400"
                : "text-danger-600 dark:text-danger-400"
            }`}
          >
            {row.val}
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default DashboardPreview;
