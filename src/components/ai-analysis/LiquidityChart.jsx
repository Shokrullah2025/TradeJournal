import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
} from "lightweight-charts";
import {
  TV_LIGHT,
  TV_DARK,
  getChartOptions,
  defaultWindow,
} from "../trades/BacktestChart/chartConfig";

// Liquidity levels: buy-side (highs) in the up color, sell-side (lows) in the
// down color; prior-DAY levels solid, prior-WEEK dashed, equilibrium dotted.
const LEVEL_STYLES = [
  { key: "pdh", title: "PDH", color: "#089981", style: LineStyle.Solid },
  { key: "pdl", title: "PDL", color: "#f23645", style: LineStyle.Solid },
  { key: "pwh", title: "PWH", color: "#089981", style: LineStyle.Dashed },
  { key: "pwl", title: "PWL", color: "#f23645", style: LineStyle.Dashed },
  { key: "eq", title: "EQ 20d", color: "#787b86", style: LineStyle.Dotted },
];

/**
 * Read-only candlestick chart for the AI Analysis page with the ICT liquidity
 * levels (prior day / prior week highs & lows, 20-day equilibrium) drawn as
 * price lines, plus the 4H order-block zone when one is in play and the
 * entry/stop/target lines when a setup is active.
 */
const LiquidityChart = ({ candles, levels, obZone, setupLines, isDark }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const priceLinesRef = useRef([]);

  // Create the chart once; destroy on unmount. Recreate on theme flip —
  // simplest way to restyle every series at once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const theme = isDark ? TV_DARK : TV_LIGHT;
    const chart = createChart(el, getChartOptions(theme));

    const main = chart.addSeries(CandlestickSeries, {
      upColor: theme.up,
      downColor: theme.down,
      borderUpColor: theme.upBorder,
      borderDownColor: theme.downBorder,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      priceLineVisible: false, lastValueVisible: false,
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = { main, volume };
    return () => {
      priceLinesRef.current = [];
      seriesRef.current = {};
      chartRef.current = null;
      chart.remove();
    };
  }, [isDark]);

  // Load data whenever candles change (or after a theme recreate).
  useEffect(() => {
    const { main, volume } = seriesRef.current;
    const chart = chartRef.current;
    if (!chart || !main || !Array.isArray(candles) || candles.length === 0) return;
    const theme = isDark ? TV_DARK : TV_LIGHT;

    main.setData(candles.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    volume.setData(candles.map((c) => ({
      time: c.time,
      value: c.volume || 0,
      color: c.close >= c.open ? theme.volUp : theme.volDown,
    })));

    const win = defaultWindow(candles);
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - win),
      to: candles.length + 5,
    });
  }, [candles, isDark]);

  // Draw / replace the liquidity, order-block, and setup lines.
  useEffect(() => {
    const { main } = seriesRef.current;
    if (!main) return;
    for (const line of priceLinesRef.current) {
      try { main.removePriceLine(line); } catch { /* series already disposed */ }
    }
    priceLinesRef.current = [];

    const mk = (price, color, title, style, lineWidth = 1) =>
      main.createPriceLine({ price, color, title, lineWidth, lineStyle: style, axisLabelVisible: true });
    const lines = [];

    if (levels) {
      for (const { key, title, color, style } of LEVEL_STYLES) {
        if (Number.isFinite(levels[key])) lines.push(mk(levels[key], color, title, style));
      }
    }
    if (obZone) {
      if (Number.isFinite(obZone.high)) lines.push(mk(obZone.high, "#f59e0b", "OB high", LineStyle.Dashed));
      if (Number.isFinite(obZone.low)) lines.push(mk(obZone.low, "#f59e0b", "OB low", LineStyle.Dashed));
    }
    if (setupLines) {
      if (Number.isFinite(setupLines.entry)) lines.push(mk(setupLines.entry, "#2962ff", "ENTRY", LineStyle.Solid));
      if (Number.isFinite(setupLines.stop)) lines.push(mk(setupLines.stop, "#f23645", "SL", LineStyle.Solid, 2));
      if (Number.isFinite(setupLines.target)) lines.push(mk(setupLines.target, "#089981", "TP", LineStyle.Solid, 2));
    }
    priceLinesRef.current = lines;
  }, [levels, obZone, setupLines, candles, isDark]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] sm:h-[480px]"
      data-testid="ai-analysis-chart"
    />
  );
};

LiquidityChart.propTypes = {
  candles: PropTypes.arrayOf(
    PropTypes.shape({
      time: PropTypes.number.isRequired,
      open: PropTypes.number.isRequired,
      high: PropTypes.number.isRequired,
      low: PropTypes.number.isRequired,
      close: PropTypes.number.isRequired,
      volume: PropTypes.number,
    }),
  ).isRequired,
  levels: PropTypes.shape({
    pdh: PropTypes.number,
    pdl: PropTypes.number,
    pwh: PropTypes.number,
    pwl: PropTypes.number,
    eq: PropTypes.number,
  }),
  obZone: PropTypes.shape({
    high: PropTypes.number,
    low: PropTypes.number,
  }),
  setupLines: PropTypes.shape({
    entry: PropTypes.number,
    stop: PropTypes.number,
    target: PropTypes.number,
  }),
  isDark: PropTypes.bool,
};

export default LiquidityChart;
