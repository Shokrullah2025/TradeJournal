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
 * price lines.
 */
const LiquidityChart = ({ candles, levels, isDark }) => {
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

  // Draw / replace the liquidity level lines.
  useEffect(() => {
    const { main } = seriesRef.current;
    if (!main) return;
    for (const line of priceLinesRef.current) {
      try { main.removePriceLine(line); } catch { /* series already disposed */ }
    }
    priceLinesRef.current = [];
    if (!levels) return;

    priceLinesRef.current = LEVEL_STYLES
      .filter(({ key }) => Number.isFinite(levels[key]))
      .map(({ key, title, color, style }) =>
        main.createPriceLine({
          price: levels[key],
          color,
          title,
          lineWidth: 1,
          lineStyle: style,
          axisLabelVisible: true,
        }),
      );
  }, [levels, candles, isDark]);

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
  isDark: PropTypes.bool,
};

export default LiquidityChart;
