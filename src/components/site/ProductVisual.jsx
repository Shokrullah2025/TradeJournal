import React from "react";
import PropTypes from "prop-types";
import {
  Lightbulb,
  Play,
  RefreshCw,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";

/**
 * Illustrative product previews for the public marketing pages: a stylised,
 * browser-framed rendition of the app screen each feature page describes.
 * Built with Tailwind + inline SVG (no image assets) so they stay crisp at
 * any size, weigh nothing, and follow light/dark mode automatically.
 *
 * The whole visual is decorative (aria-hidden) — the surrounding hero copy
 * carries the meaning. Numbers shown are representative examples only.
 *
 * The variant sub-renderers below are tightly coupled to this component and
 * never used independently, so they live in this file (CLAUDE.md §5).
 */

// ── Shared bits ─────────────────────────────────────────────────────────────

const Frame = ({ path, children }) => (
  <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-xl dark:border-gray-700 dark:bg-gray-900">
    <div className="flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/60">
      <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
      <span className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
      <span className="ml-3 flex-1 truncate rounded-md border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-500">
        app.tradgella.com{path}
      </span>
    </div>
    <div className="p-4 sm:p-6">{children}</div>
  </div>
);

Frame.propTypes = {
  path: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

const pnlText = (positive) =>
  positive
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

const StatTile = ({ label, value, positive }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800/60">
    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
      {label}
    </p>
    <p
      className={`mt-1 text-lg font-bold ${
        positive === undefined
          ? "text-gray-900 dark:text-gray-100"
          : pnlText(positive)
      }`}
    >
      {value}
    </p>
  </div>
);

StatTile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  positive: PropTypes.bool,
};

// ── Dashboard: stat tiles + equity curve ────────────────────────────────────

const EQUITY_LINE =
  "0,95 27,90 54,92 80,82 107,78 134,84 160,70 187,64 214,72 240,58 267,52 294,60 320,45 347,40 374,46 400,20";

const DashboardVisual = () => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <StatTile label="Win rate" value="58.3%" />
      <StatTile label="Profit factor" value="1.86" />
      <StatTile label="Net P&L" value="+$4,210" positive />
    </div>
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
        Equity curve — last 90 days
      </p>
      <svg viewBox="0 0 400 112" className="mt-2 w-full">
        <defs>
          <linearGradient id="pv-equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[28, 56, 84].map((y) => (
          <line
            key={y}
            x1="0"
            y1={y}
            x2="400"
            y2={y}
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-200 dark:text-gray-700"
          />
        ))}
        <path
          d={`M${EQUITY_LINE.split(" ").join(" L")} L400,112 L0,112 Z`}
          fill="url(#pv-equity-fill)"
          className="text-primary-500"
        />
        <polyline
          points={EQUITY_LINE}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary-500"
        />
      </svg>
    </div>
  </div>
);

// ── Calendar: colour-coded daily P&L ────────────────────────────────────────

const CALENDAR_WEEKS = [
  [null, 320, -85, 210, 145, 0, null],
  [null, -180, 415, 95, -60, 530, null],
  [null, 240, 0, -125, 385, 175, null],
];

const dayCellClass = (pnl) => {
  if (pnl === null)
    return "bg-gray-50 text-gray-300 dark:bg-gray-800/40 dark:text-gray-600";
  if (pnl === 0)
    return "border border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-500";
  return pnl > 0
    ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400"
    : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400";
};

const CalendarVisual = () => (
  <div>
    <div className="mb-2 flex items-center justify-between">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        June 2026
      </p>
      <p className="text-[11px] font-medium text-green-600 dark:text-green-400">
        Month P&L: +$2,060
      </p>
    </div>
    <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-medium text-gray-400 dark:text-gray-500">
      {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
        <span key={`${day}-${index}`}>{day}</span>
      ))}
    </div>
    <div className="mt-1.5 space-y-1.5">
      {CALENDAR_WEEKS.map((week, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-1.5">
          {week.map((pnl, dayIndex) => (
            <div
              key={dayIndex}
              className={`flex h-11 flex-col items-center justify-center rounded-lg text-[10px] font-semibold sm:h-12 ${dayCellClass(pnl)}`}
            >
              <span className="text-[9px] font-normal opacity-70">
                {weekIndex * 7 + dayIndex + 1}
              </span>
              {pnl !== null &&
                (pnl === 0 ? "—" : `${pnl > 0 ? "+" : "−"}$${Math.abs(pnl)}`)}
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

// ── Journal: recent trades table ────────────────────────────────────────────

const JOURNAL_ROWS = [
  { symbol: "NQ", side: "LONG", tag: "Breakout", r: "+2.1R", pnl: "+$430", win: true },
  { symbol: "ES", side: "SHORT", tag: "Reversal", r: "−1.0R", pnl: "−$120", win: false },
  { symbol: "EURUSD", side: "LONG", tag: "Pullback", r: "+1.4R", pnl: "+$96", win: true },
  { symbol: "GC", side: "SHORT", tag: "Breakout", r: "+1.8R", pnl: "+$210", win: true },
];

const JournalVisual = () => (
  <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
    <div className="grid grid-cols-5 gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-500">
      <span>Symbol</span>
      <span>Side</span>
      <span>Setup</span>
      <span className="text-right">R</span>
      <span className="text-right">P&L</span>
    </div>
    {JOURNAL_ROWS.map((row) => (
      <div
        key={`${row.symbol}-${row.pnl}`}
        className="grid grid-cols-5 items-center gap-2 border-b border-gray-100 px-3 py-2.5 text-xs last:border-0 dark:border-gray-800"
      >
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {row.symbol}
        </span>
        <span
          className={`w-fit rounded px-1.5 py-0.5 text-[10px] font-bold ${
            row.side === "LONG"
              ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
          }`}
        >
          {row.side}
        </span>
        <span className="w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          {row.tag}
        </span>
        <span className={`text-right font-medium ${pnlText(row.win)}`}>
          {row.r}
        </span>
        <span className={`text-right font-semibold ${pnlText(row.win)}`}>
          {row.pnl}
        </span>
      </div>
    ))}
  </div>
);

// ── Broker sync: connection cards ───────────────────────────────────────────

const SYNC_BROKERS = [
  { name: "Tradovate", status: "Connected", detail: "Last sync 2 min ago", live: true },
  { name: "Apex Trader Funding", status: "Connected", detail: "Last sync 9 min ago", live: true },
  { name: "Topstep", status: "Syncing…", detail: "Importing 12 fills", live: false },
];

const SyncVisual = () => (
  <div className="space-y-2.5">
    {SYNC_BROKERS.map((broker) => (
      <div
        key={broker.name}
        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60"
      >
        <div className="flex items-center gap-3">
          {broker.live ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <RefreshCw className="h-5 w-5 animate-spin text-primary-500" />
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {broker.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {broker.detail}
            </p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            broker.live
              ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              : "bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
          }`}
        >
          {broker.status}
        </span>
      </div>
    ))}
    <p className="pt-1 text-center text-[11px] text-gray-500 dark:text-gray-400">
      142 fills imported automatically today
    </p>
  </div>
);

// ── Reports: P&L by hour bars ───────────────────────────────────────────────

const REPORT_BARS = [
  { label: "9a", value: 46 },
  { label: "10a", value: 56 },
  { label: "11a", value: 24 },
  { label: "12p", value: -18 },
  { label: "1p", value: -30 },
  { label: "2p", value: 38 },
  { label: "3p", value: -12 },
];

const ReportsVisual = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
    <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
      Net P&L by hour of day
    </p>
    <svg viewBox="0 0 400 150" className="mt-2 w-full">
      <line
        x1="0"
        y1="75"
        x2="400"
        y2="75"
        stroke="currentColor"
        strokeWidth="1"
        className="text-gray-300 dark:text-gray-600"
      />
      {REPORT_BARS.map((bar, index) => {
        const x = 16 + index * 54;
        const height = Math.abs(bar.value);
        const y = bar.value > 0 ? 75 - height : 75;
        return (
          <g key={bar.label}>
            <rect
              x={x}
              y={y}
              width="26"
              height={height}
              rx="4"
              fill="currentColor"
              className={
                bar.value > 0
                  ? "text-green-500 dark:text-green-500/90"
                  : "text-red-500 dark:text-red-500/90"
              }
            />
            <text
              x={x + 13}
              y={bar.value > 0 ? y - 6 : y + height + 12}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="currentColor"
              className={
                bar.value > 0
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }
            >
              {bar.value > 0 ? "+" : "−"}${Math.abs(bar.value) * 10}
            </text>
            <text
              x={x + 13}
              y="146"
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              className="text-gray-400 dark:text-gray-500"
            >
              {bar.label}
            </text>
          </g>
        );
      })}
    </svg>
  </div>
);

// ── AI insights: finding cards ──────────────────────────────────────────────

const AI_INSIGHTS = [
  "Your win rate after two consecutive losses drops to 31% — a cooldown rule would have saved $840 last month.",
  "Friday afternoons account for 64% of your losses. Your edge is strongest before noon.",
  "Breakout setups on NQ run a 2.1 profit factor — twice your reversal trades. Consider sizing accordingly.",
];

const AiVisual = () => (
  <div className="space-y-2.5">
    <div className="flex items-center justify-between">
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        This week&apos;s insights
      </p>
      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Based on 214 trades
      </span>
    </div>
    {AI_INSIGHTS.map((insight) => (
      <div
        key={insight.slice(0, 24)}
        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 dark:border-gray-700 dark:bg-gray-800/60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
          <Lightbulb className="h-4 w-4" />
        </span>
        <p className="text-xs leading-relaxed text-gray-700 dark:text-gray-300">
          {insight}
        </p>
      </div>
    ))}
  </div>
);

// ── Backtest: candlestick replay ────────────────────────────────────────────

// [x, wickTop, bodyTop, bodyBottom, wickBottom, up]
const CANDLES = [
  [16, 96, 88, 64, 58, true],
  [48, 88, 78, 58, 50, true],
  [80, 76, 60, 74, 84, false],
  [112, 82, 72, 52, 44, true],
  [144, 66, 50, 62, 72, false],
  [176, 70, 58, 38, 30, true],
  [208, 52, 36, 48, 58, false],
  [240, 56, 44, 26, 18, true],
  [272, 40, 24, 36, 46, false],
  [304, 44, 32, 14, 8, true],
  [336, 32, 18, 30, 40, false],
  [368, 36, 22, 6, 2, true],
];

const BacktestVisual = () => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
    <div className="flex items-center justify-between">
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
        NQ — bar replay · 5 min
      </p>
      <span className="rounded bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
        SIM
      </span>
    </div>
    <svg viewBox="0 0 400 104" className="mt-2 w-full">
      <line
        x1="0"
        y1="60"
        x2="400"
        y2="60"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="5 4"
        className="text-primary-400"
      />
      <text
        x="398"
        y="55"
        textAnchor="end"
        fontSize="9"
        fontWeight="600"
        fill="currentColor"
        className="text-primary-600 dark:text-primary-400"
      >
        Entry 21,412.25
      </text>
      {CANDLES.map(([x, wickTop, bodyTop, bodyBottom, wickBottom, up]) => (
        <g
          key={x}
          fill="currentColor"
          stroke="currentColor"
          className={up ? "text-green-500" : "text-red-500"}
        >
          <line x1={x + 8} y1={wickTop} x2={x + 8} y2={wickBottom} strokeWidth="1.5" />
          <rect
            x={x}
            y={Math.min(bodyTop, bodyBottom)}
            width="16"
            height={Math.abs(bodyBottom - bodyTop)}
            rx="2"
            strokeWidth="0"
          />
        </g>
      ))}
    </svg>
    <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700/60">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white">
          <Play className="h-3.5 w-3.5" />
        </span>
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          Replay · 2× speed
        </span>
      </div>
      <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
        Open P&L +1.6R
      </span>
    </div>
  </div>
);

// ── Risk calculator: inputs + position size ─────────────────────────────────

const CALC_ROWS = [
  { label: "Account balance", value: "$25,000" },
  { label: "Risk per trade", value: "1% ($250)" },
  { label: "Stop distance", value: "12 ticks ($60 / contract)" },
];

const CalculatorVisual = () => (
  <div className="space-y-2.5">
    {CALC_ROWS.map((row) => (
      <div
        key={row.label}
        className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60"
      >
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {row.label}
        </span>
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {row.value}
        </span>
      </div>
    ))}
    <div className="rounded-xl bg-primary-600 px-4 py-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-wider text-primary-100">
        Position size
      </p>
      <p className="mt-1 text-2xl font-bold text-white">4 contracts</p>
      <p className="mt-1 text-[11px] text-primary-100">
        2.0R target = +$500 · max loss capped at $250
      </p>
    </div>
  </div>
);

// ── Pre-market briefing: event list ─────────────────────────────────────────

const BRIEFING_ITEMS = [
  { time: "8:30 AM", text: "CPI release — expect volatility at the open", impact: "High" },
  { time: "9:30 AM", text: "Market open · ES overnight range 6,498–6,527", impact: null },
  { time: "10:00 AM", text: "Consumer sentiment — watch for a second push", impact: "Medium" },
];

const BriefingVisual = () => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-2">
      <CalendarClock className="h-4 w-4 text-primary-600 dark:text-primary-400" />
      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Today&apos;s briefing
      </p>
    </div>
    {BRIEFING_ITEMS.map((item) => (
      <div
        key={item.time}
        className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60"
      >
        <span className="w-16 shrink-0 text-[11px] font-bold text-gray-900 dark:text-gray-100">
          {item.time}
        </span>
        <p className="flex-1 text-xs text-gray-600 dark:text-gray-300">
          {item.text}
        </p>
        {item.impact && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              item.impact === "High"
                ? "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                : "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
            }`}
          >
            {item.impact}
          </span>
        )}
      </div>
    ))}
  </div>
);

// ── Public component ────────────────────────────────────────────────────────

const VARIANTS = {
  dashboard: { path: "/dashboard", render: DashboardVisual },
  calendar: { path: "/trades", render: CalendarVisual },
  journal: { path: "/trades", render: JournalVisual },
  sync: { path: "/brokers", render: SyncVisual },
  reports: { path: "/analytics", render: ReportsVisual },
  ai: { path: "/analytics", render: AiVisual },
  backtest: { path: "/backtest", render: BacktestVisual },
  calculator: { path: "/risk-calculator", render: CalculatorVisual },
  briefing: { path: "/dashboard", render: BriefingVisual },
};

const ProductVisual = ({ variant }) => {
  const config = VARIANTS[variant];
  if (!config) return null;
  const Body = config.render;

  return (
    <div data-testid={`product-visual-${variant}`} aria-hidden="true">
      <Frame path={config.path}>
        <Body />
      </Frame>
    </div>
  );
};

ProductVisual.propTypes = {
  variant: PropTypes.oneOf(Object.keys(VARIANTS)).isRequired,
};

export default ProductVisual;
