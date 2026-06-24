import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
  Label,
} from "recharts";
import { Target, TrendingDown, Activity, Info } from "lucide-react";

const POS = "#22c55e";
const NEG = "#ef4444";
const NEUTRAL = "#0ea5e9";
// Subtle, light grid so rows are barely there but axis numbers stay readable.
const GRID = "#eef1f6";
const AXIS_LABEL_STYLE = {
  fill: "#9ca3af",
  fontSize: 10,
  textAnchor: "middle",
  fontWeight: 600,
};

// Small "ⓘ" affordance next to a chart title; reveals the "how to read it"
// note on hover/focus so it no longer overflows the bottom of the card.
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

const formatK = (value) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = abs / 1000;
    return `${sign}$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${sign}$${abs.toLocaleString()}`;
};

const formatHold = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours % 1 === 0 ? hours.toFixed(0) : hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
};

// The hover banner. Rendered as our own overlay (not Recharts' Tooltip) so it
// only appears when the cursor is actually over the bar, not anywhere in the
// category column — matching the candle banners on the other analytics charts.
const TooltipBox = ({ data }) => (
  <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg whitespace-nowrap">
    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
      {data.label}
    </p>
    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
      {data.count} {data.count === 1 ? "trade" : "trades"}
    </p>
  </div>
);

// Absolutely-positioned highlight + banner for the hovered bar. The banner is
// pinned a few px above the bar's top tip, just like the other candle charts.
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

const DistributionAnalysis = ({ trades = [] }) => {
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

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status === "closed"),
    [trades]
  );

  // ---- R-Multiple distribution ----------------------------------------
  const { rBins, rTradeCount } = useMemo(() => {
    const labels = [
      "≤-2R",
      "-2R",
      "-1R",
      "0R",
      "+1R",
      "+2R",
      "+3R",
      "≥+4R",
    ];
    const tones = ["neg", "neg", "neg", "neutral", "pos", "pos", "pos", "pos"];
    const counts = new Array(labels.length).fill(0);
    let counted = 0;

    closedTrades.forEach((trade) => {
      const entry = Number(trade.entryPrice);
      const stop = Number(trade.stopLoss);
      const qty = Number(trade.quantity);
      if (!stop || !entry || !qty) return;

      const riskPerUnit = Math.abs(entry - stop);
      const risk = riskPerUnit * qty;
      if (!risk || !isFinite(risk)) return;

      const r = (trade.pnl || 0) / risk;
      counted += 1;

      let idx;
      if (r <= -2) idx = 0;
      else if (r <= -1) idx = 1;
      else if (r < 0) idx = 2;
      else if (r < 1) idx = 3;
      else if (r < 2) idx = 4;
      else if (r < 3) idx = 5;
      else if (r < 4) idx = 6;
      else idx = 7;

      counts[idx] += 1;
    });

    return {
      rTradeCount: counted,
      rBins: labels.map((label, i) => ({
        label,
        count: counts[i],
        tone: tones[i],
      })),
    };
  }, [closedTrades]);

  // ---- Underwater (drawdown) curve ------------------------------------
  const { underwater, maxDrawdown } = useMemo(() => {
    const sorted = [...closedTrades]
      .filter((t) => t.exitDate || t.entryDate)
      .sort(
        (a, b) =>
          new Date(a.exitDate || a.entryDate) -
          new Date(b.exitDate || b.entryDate)
      );

    let running = 0;
    let peak = 0;
    let maxDD = 0;
    const points = sorted.map((trade, index) => {
      running += trade.pnl || 0;
      if (running > peak) peak = running;
      const dd = running - peak; // <= 0
      if (-dd > maxDD) maxDD = -dd;
      return { index: index + 1, drawdown: dd };
    });

    return { underwater: points, maxDrawdown: maxDD };
  }, [closedTrades]);

  // ---- Hold time vs P&L scatter ---------------------------------------
  const scatter = useMemo(() => {
    return closedTrades
      .filter((t) => t.entryDate && t.exitDate)
      .map((trade) => {
        const minutes =
          (new Date(trade.exitDate) - new Date(trade.entryDate)) / 60000;
        if (!isFinite(minutes) || minutes < 0) return null;
        const pnl = trade.pnl || 0;
        return {
          hold: minutes,
          pnl,
          size: Math.abs(pnl) || 1,
          win: pnl >= 0,
        };
      })
      .filter(Boolean);
  }, [closedTrades]);

  const winScatter = scatter.filter((p) => p.win);
  const lossScatter = scatter.filter((p) => !p.win);

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
              {info && (
                <InfoTip text={info} testId={`${slug(title)}-info-btn`} />
              )}
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

  const UnderwaterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Trade #{d.index}
          </p>
          <p className="text-xs font-mono text-danger-600 dark:text-danger-400">
            {formatK(d.drawdown)}
          </p>
        </div>
      );
    }
    return null;
  };

  const ScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-semibold font-mono text-gray-900 dark:text-gray-100">
            {formatK(d.pnl)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Held {formatHold(d.hold)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (closedTrades.length === 0) {
    return (
      <div className="card text-center py-12" data-testid="distribution-empty-state">
        <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          No distribution data available
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Close some trades to see how your returns are distributed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="distribution-analysis">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* R-Multiple Distribution */}
        <section className="card" data-testid="distribution-r-multiple-chart">
          <SectionHeader
            icon={Target}
            tone="neutral"
            title="R-Multiple Distribution"
            subtitle="Trade returns measured in units of risk (R)"
            info="Left axis = how many trades landed in each bucket. Each bar is a return in units of risk (R): red bars on the left are losses, green on the right are wins. A real edge leans right — winners paying +2R or more outweigh the −1R losers."
            right={
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap">
                {rTradeCount} trades
              </span>
            }
          />
          {rTradeCount === 0 ? (
            <div className="h-[220px] grid place-items-center text-sm text-gray-500 dark:text-gray-400 text-center px-6">
              R-multiples need a stop loss on each trade. Add stop-loss values to
              see this distribution.
            </div>
          ) : (
            <div className="h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rBins}
                  margin={{ top: 20, right: 8, left: 8, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={GRID}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280", fontFamily: "monospace" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#9ca3af"
                    fontSize={11}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6b7280" }}
                    width={40}
                  >
                    <Label
                      value="# of trades"
                      angle={-90}
                      position="insideLeft"
                      style={AXIS_LABEL_STYLE}
                    />
                  </YAxis>
                  <Bar
                    dataKey="count"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={40}
                    onMouseEnter={handleBarHover}
                    onMouseLeave={clearHover}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      style={{
                        fill: "#6b7280",
                        fontSize: 11,
                        fontFamily: "monospace",
                        fontWeight: 600,
                      }}
                    />
                    {rBins.map((bin, index) => (
                      <Cell
                        key={`r-cell-${index}`}
                        fill={
                          bin.tone === "pos"
                            ? POS
                            : bin.tone === "neg"
                            ? NEG
                            : NEUTRAL
                        }
                        fillOpacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {hovered && <ChartTooltipOverlay hovered={hovered} />}
            </div>
          )}
        </section>

        {/* Underwater Drawdown */}
        <section className="card" data-testid="distribution-underwater-chart">
          <SectionHeader
            icon={TrendingDown}
            tone="neg"
            title="Drawdown · Underwater"
            subtitle="Distance below the running equity peak"
            info="Left axis = dollars below your highest equity point ($0 = sitting at a new high). Deeper, longer dips are your worst losing streaks — use it to judge how much pain a strategy puts you through before recovering."
            right={
              <div className="text-right">
                <div className="text-[15px] font-bold font-mono text-danger-600 dark:text-danger-400">
                  {formatK(-maxDrawdown)}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Max DD
                </div>
              </div>
            }
          />
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={underwater}
                margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="uwGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={NEG} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={NEG} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID}
                  vertical={false}
                />
                <XAxis
                  dataKey="index"
                  stroke="#9ca3af"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af", fontFamily: "monospace" }}
                  tickFormatter={(v) => `#${v}`}
                  minTickGap={40}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#9ca3af" }}
                  tickFormatter={(v) => formatK(v)}
                  width={52}
                >
                  <Label
                    value="$ below peak"
                    angle={-90}
                    position="insideLeft"
                    style={AXIS_LABEL_STYLE}
                  />
                </YAxis>
                <Tooltip content={<UnderwaterTooltip />} />
                <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke={NEG}
                  strokeWidth={2}
                  fill="url(#uwGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Hold Time vs P&L scatter */}
      <section className="card" data-testid="distribution-holdtime-chart">
        <SectionHeader
          icon={Activity}
          tone="neutral"
          title="Hold Time vs P&L"
          subtitle="Each dot is a trade · dot size = magnitude of result"
          info="Left axis = profit/loss per trade; bottom axis = how long the trade was held. Dots above the dashed $0 line are winners, below are losers, and bigger dots mean bigger results. Look for where your profits cluster — it tells you whether quick scalps or longer holds pay off."
          right={
            <div className="flex items-center gap-3.5 text-xs font-mono text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-success-500" />
                Profit
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-danger-500" />
                Loss
              </span>
            </div>
          }
        />
        {scatter.length === 0 ? (
          <div className="h-[280px] grid place-items-center text-sm text-gray-500 dark:text-gray-400">
            No trades with both entry and exit times.
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis
                  type="number"
                  dataKey="hold"
                  name="Hold time"
                  stroke="#9ca3af"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280", fontFamily: "monospace" }}
                  tickFormatter={formatHold}
                  height={36}
                >
                  <Label
                    value="Hold time →"
                    position="insideBottom"
                    offset={-6}
                    style={AXIS_LABEL_STYLE}
                  />
                </XAxis>
                <YAxis
                  type="number"
                  dataKey="pnl"
                  name="P&L"
                  stroke="#9ca3af"
                  fontSize={11}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6b7280" }}
                  tickFormatter={(v) => formatK(v)}
                  width={56}
                >
                  <Label
                    value="P&L per trade"
                    angle={-90}
                    position="insideLeft"
                    style={AXIS_LABEL_STYLE}
                  />
                </YAxis>
                <ZAxis type="number" dataKey="size" range={[40, 360]} />
                <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 4" />
                <Tooltip
                  content={<ScatterTooltip />}
                  cursor={{ strokeDasharray: "3 3" }}
                />
                <Scatter data={winScatter} fill={POS} fillOpacity={0.5} stroke={POS} />
                <Scatter data={lossScatter} fill={NEG} fillOpacity={0.5} stroke={NEG} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
};

export default DistributionAnalysis;
