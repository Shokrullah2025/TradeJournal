import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
} from "lightweight-charts";
import {
  TV_LIGHT,
  TV_DARK,
  getChartOptions,
  calcEMAIndexed,
  defaultWindow,
} from "../trades/BacktestChart/chartConfig";

// Price-line palette: entry blue (solid), stop red (dashed), target green
// (dashed) — matching the up/down candle colors of the TradingView themes.
const LINE_COLORS = { entry: "#2962ff", stop: "#f23645", target: "#089981" };

/**
 * Read-only candlestick chart for the AI Analysis page: candles + EMA20/50 +
 * volume, with the live signal's entry / stop / target drawn as price lines.
 */
const SignalChart = ({ candles, signal, isDark }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const priceLinesRef = useRef([]);

  // Create the chart once; destroy on unmount.
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
    const ema20 = chart.addSeries(LineSeries, {
      color: theme.ema20, lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    const ema50 = chart.addSeries(LineSeries, {
      color: theme.ema50, lineWidth: 1,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
      priceLineVisible: false, lastValueVisible: false,
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = { main, ema20, ema50, volume };
    return () => {
      priceLinesRef.current = [];
      seriesRef.current = {};
      chartRef.current = null;
      chart.remove();
    };
    // Recreate on theme flip — simplest way to restyle every series at once.
  }, [isDark]);

  // Load data whenever candles change (or after a theme recreate).
  useEffect(() => {
    const { main, ema20, ema50, volume } = seriesRef.current;
    const chart = chartRef.current;
    if (!chart || !main || !Array.isArray(candles) || candles.length === 0) return;
    const theme = isDark ? TV_DARK : TV_LIGHT;

    main.setData(candles.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
    ema20.setData(calcEMAIndexed(candles, 20).filter(Boolean));
    ema50.setData(calcEMAIndexed(candles, 50).filter(Boolean));
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

  // Draw / replace the signal price lines.
  useEffect(() => {
    const { main } = seriesRef.current;
    if (!main) return;
    for (const line of priceLinesRef.current) {
      try { main.removePriceLine(line); } catch { /* series already disposed */ }
    }
    priceLinesRef.current = [];
    if (!signal || signal.direction === "neutral") return;

    const mk = (price, color, title, style) =>
      main.createPriceLine({
        price, color, title,
        lineWidth: 1,
        lineStyle: style,
        axisLabelVisible: true,
      });
    priceLinesRef.current = [
      mk(signal.entry, LINE_COLORS.entry, "Entry", LineStyle.Solid),
      mk(signal.stopLoss, LINE_COLORS.stop, "Stop", LineStyle.Dashed),
      mk(signal.takeProfit, LINE_COLORS.target, "Target", LineStyle.Dashed),
    ];
  }, [signal, candles, isDark]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[420px] sm:h-[480px]"
      data-testid="ai-analysis-chart"
    />
  );
};

SignalChart.propTypes = {
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
  signal: PropTypes.shape({
    direction: PropTypes.oneOf(["long", "short", "neutral"]),
    entry: PropTypes.number,
    stopLoss: PropTypes.number,
    takeProfit: PropTypes.number,
  }),
  isDark: PropTypes.bool,
};

export default SignalChart;
