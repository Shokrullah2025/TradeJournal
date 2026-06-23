import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import { BarChart3, Layers, Info } from "lucide-react";

// Shared visual language with the Overview (PnLOverviewHero / DistributionAnalysis).
const POS = "#22c55e";
const NEG = "#ef4444";
const GRID = "#eef1f6";

// Full-precision currency, matching PerformanceMetrics / PnLOverviewHero.
const formatMoney = (value, decimals = 2) => {
  const sign = value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

// Compact axis labels that keep small, real values legible (no "$0k" collapse).
const formatK = (value) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}$${abs.toLocaleString()}`;
};

// Small "ⓘ" affordance next to a chart title; reveals the explanatory text on
// hover/focus so it no longer overflows the bottom of the card.
const InfoTip = ({ text, testId }) => (
  <span className="relative inline-flex group">
    <button
      type="button"
      data-testid={testId}
      aria-label="Chart explanation"
      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
    >
      <Info className="w-3.5 h-3.5" />
    </button>
    <span
      role="tooltip"
      className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-[11px] leading-snug text-gray-500 dark:text-gray-400 shadow-lg opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
    >
      {text}
    </span>
  </span>
);

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const SectionHeader = ({ icon: Icon, tone, title, subtitle, info, right }) => {
  const toneClasses = {
    pos: "bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400",
    neg: "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400",
    neutral:
      "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
  };
  return (
    <div className="flex items-start justify-between mb-5">
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-lg grid place-items-center ${toneClasses[tone]}`}
        >
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-bold text-gray-900 dark:text-gray-100">
              {title}
            </span>
            {info && <InfoTip text={info} testId={`${slug(title)}-info-btn`} />}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {subtitle}
          </div>
        </div>
      </div>
      {right}
    </div>
  );
};

// The hover banner. Rendered as our own overlay (not Recharts' Tooltip) so it
// only appears when the cursor is actually over the candle, not anywhere in the
// category column.
const TooltipBox = ({ data }) => (
  <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg whitespace-nowrap">
    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5">
      {data.name}
    </p>
    <div className="space-y-1">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Total P&L:
        <span
          className={`ml-1 font-mono font-semibold ${
            data.totalPnL >= 0
              ? "text-success-600 dark:text-success-400"
              : "text-danger-600 dark:text-danger-400"
          }`}
        >
          {formatMoney(data.totalPnL)}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Trades:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {data.totalTrades}
        </span>
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Win Rate:
        <span className="ml-1 font-mono font-semibold text-gray-900 dark:text-gray-100">
          {data.winRate.toFixed(1)}%
        </span>
      </p>
    </div>
  </div>
);

// Absolutely-positioned highlight + banner for the hovered bar. The banner is
// always pinned a few px above the bar's top tip (above the zero line for loss
// bars, so it never overlaps the axis labels below).
const ChartTooltipOverlay = ({ hovered }) => (
  <>
    <div
      className="pointer-events-none absolute z-0 rounded bg-gray-400/10"
      style={{
        left: hovered.rectX - 6,
        top: hovered.rectTop - 6,
        width: hovered.rectW + 12,
        height: hovered.rectH + 12,
      }}
    />
    <div
      className="pointer-events-none absolute z-10 [transform:translate(-50%,calc(-100%_-_14px))]"
      style={{ left: hovered.cx, top: hovered.rectTop }}
    >
      <TooltipBox data={hovered.data} />
    </div>
  </>
);

// Floating value label a few px outside each bar's tip (above for gains,
// below for losses) so the number never overlaps the bar.
const ValueLabel = ({ x, y, width, height, value }) => {
  if (!value) return null;
  const cx = x + width / 2;
  const positive = value >= 0;
  // Recharts gives negative bars a negative height, so derive the bar's edges
  // defensively and place the label just outside the candle's outer tip.
  const topEdge = Math.min(y, y + height);
  const bottomEdge = Math.max(y, y + height);
  const ly = positive ? topEdge - 6 : bottomEdge + 16;
  return (
    <text
      x={cx}
      y={ly}
      textAnchor="middle"
      fontSize={11}
      fontWeight={600}
      fontFamily="monospace"
      fill={positive ? POS : NEG}
    >
      {formatK(value)}
    </text>
  );
};

const InstrumentAnalysis = ({ trades = [], detailed = false }) => {
  // Hovered bar, captured from the Bar's own mouse events (fire only over the
  // rectangle) so the banner never shows over empty parts of a column.
  const [hovered, setHovered] = useState(null);
  const handleBarHover = (d) => {
    if (typeof d?.y !== "number") return;
    const rectTop = Math.min(d.y, d.y + d.height);
    setHovered({
      cx: d.x + d.width / 2,
      rectTop,
      rectX: d.x,
      rectW: d.width,
      rectH: Math.abs(d.height),
      data: d.payload,
    });
  };
  const clearHover = () => setHovered(null);

  const chartData = useMemo(() => {
    // Match the Overview: only closed trades count toward realised P&L / win rate.
    const completedTrades = trades.filter((t) => t.status === "closed");

    const instrumentData = completedTrades.reduce((acc, trade) => {
      const instrument = trade.instrument || "Unknown";
      if (!acc[instrument]) {
        acc[instrument] = {
          name: instrument,
          totalTrades: 0,
          totalPnL: 0,
          winningTrades: 0,
        };
      }

      acc[instrument].totalTrades += 1;
      acc[instrument].totalPnL += trade.pnl || 0;
      if ((trade.pnl || 0) > 0) {
        acc[instrument].winningTrades += 1;
      }

      return acc;
    }, {});

    return Object.values(instrumentData)
      .map((item) => ({
        ...item,
        winRate:
          item.totalTrades > 0
            ? (item.winningTrades / item.totalTrades) * 100
            : 0,
      }))
      .sort((a, b) => b.totalPnL - a.totalPnL)
      .slice(0, detailed ? 10 : 5);
  }, [trades, detailed]);

  if (chartData.length === 0) {
    return (
      <div
        className="card text-center py-12"
        data-testid="instrument-empty-state"
      >
        <Layers className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No instrument data available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Close some trades to compare profitability across instruments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="instrument-analysis">
      <section className="card" data-testid="instrument-pnl-chart">
        <SectionHeader
          icon={Layers}
          tone="neutral"
          title="Instrument Performance Analysis"
          subtitle="Net P&L compared across your traded instruments"
          info="Bars above $0 are net-profitable instruments; bars below are net losers. Hover any bar for trade count and win rate."
          right={
            <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">
              {chartData.length}{" "}
              {chartData.length === 1 ? "instrument" : "instruments"}
            </span>
          }
        />

        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              barCategoryGap="30%"
              margin={{ top: 24, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={GRID}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke="#9ca3af"
                fontSize={12}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6b7280", fontWeight: 600 }}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => formatK(value)}
                tick={{ fill: "#6b7280", fontFamily: "monospace" }}
                width={56}
              />
              <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
              <Bar
                dataKey="totalPnL"
                radius={[5, 5, 0, 0]}
                maxBarSize={44}
                onMouseEnter={handleBarHover}
                onMouseLeave={clearHover}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.totalPnL >= 0 ? POS : NEG}
                    fillOpacity={0.85}
                  />
                ))}
                <LabelList dataKey="totalPnL" content={<ValueLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {hovered && <ChartTooltipOverlay hovered={hovered} />}
        </div>
      </section>

      {detailed && (
        <section className="card" data-testid="instrument-breakdown">
          <SectionHeader
            icon={BarChart3}
            tone="neutral"
            title="Detailed Performance Breakdown"
            subtitle="Per-instrument net P&L and win rate"
          />
          <div className="space-y-2">
            {chartData.map((instrument, index) => (
              <div
                key={instrument.name}
                data-testid={`instrument-row-${instrument.name}`}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      instrument.totalPnL >= 0
                        ? "bg-success-500"
                        : "bg-danger-500"
                    }`}
                  />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {instrument.name}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-mono">
                      {instrument.totalTrades} trades
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-mono font-semibold ${
                      instrument.totalPnL >= 0
                        ? "text-success-600 dark:text-success-400"
                        : "text-danger-600 dark:text-danger-400"
                    }`}
                  >
                    {instrument.totalPnL >= 0 ? "+" : ""}
                    {formatMoney(instrument.totalPnL)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {instrument.winRate.toFixed(1)}% win rate
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default InstrumentAnalysis;
