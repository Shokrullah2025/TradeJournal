import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import {
  TV_LIGHT,
  TV_DARK,
  getChartOptions,
  defaultWindow,
} from "../trades/BacktestChart/chartConfig";
import { TZ_OPTIONS, tzChartOptions } from "../../utils/chartTimezone";

const TZ_STORAGE_KEY = "liveAnalysis_chartTz";

// Layout of the mini HTF candles (TTM-style overlay): the last `count` HTF
// candles drawn adjacent (1px apart), anchored `startBars` bars right of the
// last candle but clamped inside the pane so they never leave the view
const HTF_OVERLAY = { count: 4, bodyW: 14, gapPx: 1, startBars: 3 };

/**
 * Read-only candlestick chart for the Live Analysis page.
 * Renders candles, the signal's buy/sell zones (dashed price-line pairs),
 * ICT overlays (sessions, sweep, SMT, CISD, draw on liquidity), and a
 * TTM-style HTF candle overlay: the last few higher-timeframe candles drawn
 * just right of the latest bar, tracking the chart as it pans.
 * Rendering is deferred until the container is visible.
 */
const LiveAnalysisChart = ({ candles, signal, isDark, htfCandles, htfTimeframe }) => {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const overlaySeriesRef = useRef([]);
  const markersRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [tz, setTz] = useState(() => {
    try {
      const saved = localStorage.getItem(TZ_STORAGE_KEY);
      if (saved && TZ_OPTIONS.some((o) => o.id === saved)) return saved;
    } catch { /* storage unavailable */ }
    return "America/New_York";
  });

  const handleTzChange = (value) => {
    setTz(value);
    try { localStorage.setItem(TZ_STORAGE_KEY, value); } catch { /* storage unavailable */ }
  };

  // Defer chart creation until the container scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Create / destroy the chart
  useEffect(() => {
    if (!isVisible || !containerRef.current) return undefined;
    const theme = isDark ? TV_DARK : TV_LIGHT;
    const chart = createChart(containerRef.current, getChartOptions(theme));
    const main = chart.addSeries(CandlestickSeries, {
      upColor: theme.up,
      downColor: theme.down,
      borderUpColor: theme.upBorder,
      borderDownColor: theme.downBorder,
      wickUpColor: theme.up,
      wickDownColor: theme.down,
    });
    // Extra right whitespace so the HTF candle overlay has room
    chart.timeScale().applyOptions({ rightOffset: 16 });
    chartRef.current = chart;
    seriesRef.current = { main };
    priceLinesRef.current = [];
    return () => {
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      overlaySeriesRef.current = [];
      markersRef.current = null;
      chart.remove();
    };
  }, [isVisible, isDark]);

  // Apply the selected timezone to axis labels and crosshair (also re-applies
  // after the chart is rebuilt, since this effect is declared after creation)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions(tzChartOptions(tz));
  }, [tz, isVisible, isDark]);

  // Feed data
  useEffect(() => {
    const s = seriesRef.current;
    const chart = chartRef.current;
    if (!s || !chart || !candles || candles.length === 0) return;
    s.main.setData(candles);
    const win = defaultWindow(candles);
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - win),
      to: candles.length + 5,
    });
  }, [candles, isVisible, isDark]);

  // Draw signal zones, ICT overlays (Asia levels, sweep, SMT, draw on
  // liquidity), and markers
  useEffect(() => {
    const s = seriesRef.current;
    const chart = chartRef.current;
    if (!s || !chart) return;

    priceLinesRef.current.forEach((pl) => {
      try { s.main.removePriceLine(pl); } catch { /* chart already disposed */ }
    });
    priceLinesRef.current = [];
    overlaySeriesRef.current.forEach((os) => {
      try { chart.removeSeries(os); } catch { /* chart already disposed */ }
    });
    overlaySeriesRef.current = [];

    if (!signal) return;

    const ov = signal.overlays || {};
    const lastTime = candles && candles.length ? candles[candles.length - 1].time : null;

    // --- draw on liquidity: gray dashed level (the daily-bias target) ---
    if (ov.drawOnLiquidity) {
      priceLinesRef.current.push(
        s.main.createPriceLine({
          price: ov.drawOnLiquidity.price,
          color: "#9ca3af",
          lineWidth: 2,
          lineStyle: 2, // dashed
          axisLabelVisible: true,
          title: ov.drawOnLiquidity.label,
        })
      );
    }

    // Segment helper: a two-point LineSeries that doesn't disturb autoscale
    const addSegment = (t1, p1, t2, p2, color, style = 2, width = 1) => {
      if (t1 == null || t2 == null || t1 === t2) return;
      const ls = chart.addSeries(LineSeries, {
        color,
        lineWidth: width,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
        autoscaleInfoProvider: () => null,
      });
      const pts = [
        { time: Math.min(t1, t2), value: t1 <= t2 ? p1 : p2 },
        { time: Math.max(t1, t2), value: t1 <= t2 ? p2 : p1 },
      ];
      ls.setData(pts);
      overlaySeriesRef.current.push(ls);
    };

    // --- Asia session high/low, extended until swept (or until now) ---
    if (ov.asia && lastTime != null) {
      const highEnd =
        ov.sweep && ov.sweep.side === "high" ? ov.sweep.time : lastTime;
      const lowEnd =
        ov.sweep && ov.sweep.side === "low" ? ov.sweep.time : lastTime;
      addSegment(ov.asia.startTime, ov.asia.high, highEnd, ov.asia.high, "#94a3b8");
      addSegment(ov.asia.startTime, ov.asia.low, lowEnd, ov.asia.low, "#94a3b8");
    }

    // --- SMT divergence line between the two diverging swings ---
    if (ov.smt && ov.smt.points && ov.smt.points.length === 2) {
      const [p1, p2] = ov.smt.points;
      addSegment(
        p1.time, p1.price, p2.time, p2.price,
        "#f97316", 0, 2
      );
    }

    // --- CISD level: solid line spanning only the series, from the series-open
    // candle to the candle whose body closed through the level ---
    if (ov.cisd) {
      addSegment(
        ov.cisd.from, ov.cisd.level, ov.cisd.at, ov.cisd.level,
        ov.cisd.direction === "long" ? "#10b981" : "#f43f5e", 0, 2
      );
    }

    // --- markers: sweep + CISD + SMT ---
    const markers = [];
    if (ov.sweep) {
      markers.push({
        time: ov.sweep.time,
        position: ov.sweep.side === "low" ? "belowBar" : "aboveBar",
        color: "#eab308",
        shape: "circle",
        text: `London swept Asia ${ov.sweep.side}`,
      });
    }
    if (ov.cisd) {
      markers.push({
        time: ov.cisd.at,
        position: ov.cisd.direction === "long" ? "belowBar" : "aboveBar",
        color: ov.cisd.direction === "long" ? "#10b981" : "#f43f5e",
        shape: "square",
        text: "CISD",
      });
    }
    if (ov.smt && ov.smt.points && ov.smt.points.length === 2) {
      markers.push({
        time: ov.smt.points[1].time,
        position: ov.smt.direction === "long" ? "belowBar" : "aboveBar",
        color: "#f97316",
        shape: "square",
        text: `SMT ${ov.smt.kind || ""} vs ${ov.smt.vs}`.replace("  ", " "),
      });
    }
    markers.sort((a, b) => a.time - b.time);
    if (markersRef.current) {
      markersRef.current.setMarkers(markers);
    } else {
      markersRef.current = createSeriesMarkers(s.main, markers);
    }
  }, [signal, candles, isVisible, isDark]);

  // SVG overlay: Asia/London session shading + TTM-style HTF candle overlay.
  // Redrawn on every pan/zoom so everything tracks the bars.
  useEffect(() => {
    const chart = chartRef.current;
    const s = seriesRef.current;
    const svg = svgRef.current;
    if (!chart || !s || !svg) return undefined;
    const ov = (signal && signal.overlays) || {};

    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const redraw = () => {
      const ts = chart.timeScale();
      const vr = ts.getVisibleRange();
      let html = "";

      // --- session boxes ---
      if (vr) {
        const box = (sess, fill, stroke, label) => {
          if (!sess) return;
          const from = Math.max(sess.startTime, vr.from);
          const to = Math.min(sess.endTime, vr.to);
          if (from >= to) return;
          const x1 = ts.timeToCoordinate(from);
          const x2 = ts.timeToCoordinate(to);
          const y1 = s.main.priceToCoordinate(sess.high);
          const y2 = s.main.priceToCoordinate(sess.low);
          if (x1 == null || x2 == null || y1 == null || y2 == null) return;
          const top = Math.min(y1, y2);
          html += `<rect x="${x1}" y="${top}" width="${x2 - x1}" height="${Math.abs(y2 - y1)}" fill="${fill}" stroke="${stroke}" stroke-opacity="0.5" stroke-width="1" />`;
          html += `<text x="${x1 + 4}" y="${top + 12}" fill="${stroke}" font-size="10" font-weight="600">${esc(label)}</text>`;
        };
        box(ov.asia, "rgba(99,102,241,0.10)", "#6366f1", "ASIA");
        const lonLabel = ov.sweep
          ? `LONDON — swept Asia ${ov.sweep.side}`
          : "LONDON";
        box(ov.london, "rgba(245,158,11,0.10)", "#d97706", lonLabel);
      }

      // --- HTF candle overlay (TTM-style mini candles) ---
      if (htfCandles && htfCandles.length >= 2 && candles && candles.length) {
        const Y = (p) => s.main.priceToCoordinate(p);
        const live = htfCandles[htfCandles.length - 1];

        // The last `count` HTF candles, drawn adjacent. Anchored just right of
        // the last bar, then clamped into the pane so panning/zooming can
        // never push the group out of view.
        {
          const { count, bodyW, gapPx, startBars } = HTF_OVERLAY;
          const shown = htfCandles.slice(-count);
          const lastIndex = candles.length - 1;
          const slot = bodyW + gapPx;
          const groupW = shown.length * slot;
          const paneW = ts.width();
          const anchor = ts.logicalToCoordinate(lastIndex + startBars);
          let xStart = anchor != null ? anchor : paneW - 10 - groupW;
          xStart = Math.min(xStart, paneW - 10 - groupW);
          xStart = Math.max(xStart, 10);

          const upFill = "#16a34a";
          const downFill = isDark ? "#1f2937" : "#111827";
          const downStroke = isDark ? "#9ca3af" : "#111827";
          const textCol = isDark ? "#9ca3af" : "#6b7280";

          let topY = Infinity;
          let drawn = 0;
          shown.forEach((c, i) => {
            const xc = xStart + i * slot + bodyW / 2;
            const yO = Y(c.open);
            const yC = Y(c.close);
            const yH = Y(c.high);
            const yL = Y(c.low);
            if (yO == null || yC == null || yH == null || yL == null) return;
            topY = Math.min(topY, yH);
            drawn++;
            const up = c.close >= c.open;
            const fill = up ? upFill : downFill;
            const stroke = up ? upFill : downStroke;
            const bodyTop = Math.min(yO, yC);
            const bodyH = Math.max(1, Math.abs(yC - yO));
            html += `<line x1="${xc}" y1="${yH}" x2="${xc}" y2="${yL}" stroke="${stroke}" stroke-width="1" />`;
            html += `<rect x="${xc - bodyW / 2}" y="${bodyTop}" width="${bodyW}" height="${bodyH}" fill="${fill}" stroke="${stroke}" stroke-width="1" />`;
            // Staggered time labels (adjacent candles would overlap otherwise)
            const labelY = yL + 12 + (i % 2) * 11;
            html += `<text x="${xc}" y="${labelY}" fill="${textCol}" font-size="9" text-anchor="middle">${esc(timeFmt.format(new Date(c.time * 1000)))}</text>`;
          });

          // Timeframe label above the group
          if (drawn > 0 && topY !== Infinity) {
            const xMid = xStart + groupW / 2;
            html += `<text x="${xMid}" y="${Math.max(12, topY - 18)}" fill="${textCol}" font-size="10" font-weight="600" text-anchor="middle">${esc((htfTimeframe || "").toUpperCase())}</text>`;
            html += `<text x="${xMid}" y="${Math.max(24, topY - 6)}" fill="${textCol}" font-size="9" text-anchor="middle">(auto)</text>`;
          }

          // Dotted open line of the live HTF candle, from its window to the minis
          const yOpen = Y(live.open);
          if (yOpen != null && drawn > 0) {
            const xFrom = vr ? ts.timeToCoordinate(Math.max(live.time, vr.from)) : null;
            const x0 = xFrom != null ? Math.min(xFrom, xStart) : 0;
            html += `<line x1="${x0}" y1="${yOpen}" x2="${xStart + groupW}" y2="${yOpen}" stroke="${textCol}" stroke-width="1" stroke-dasharray="2,2" />`;
          }
        }
      }

      svg.innerHTML = html;
    };

    redraw();
    const ts = chart.timeScale();
    ts.subscribeVisibleTimeRangeChange(redraw);
    return () => {
      try { ts.unsubscribeVisibleTimeRangeChange(redraw); } catch { /* chart disposed */ }
      svg.innerHTML = "";
    };
  }, [signal, candles, htfCandles, htfTimeframe, isVisible, isDark, tz]);

  return (
    <div className="relative w-full h-[420px] md:h-[480px] xl:h-full xl:min-h-[420px]">
      <div
        ref={containerRef}
        data-testid="live-analysis-chart"
        className="w-full h-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
      />
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
      />
      <select
        data-testid="live-analysis-timezone-select"
        value={tz}
        onChange={(e) => handleTzChange(e.target.value)}
        className="absolute bottom-1 right-1 z-10 px-1.5 py-0.5 rounded text-[11px] border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 cursor-pointer"
      >
        {TZ_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LiveAnalysisChart;
