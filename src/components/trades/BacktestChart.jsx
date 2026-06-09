import React, { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from "lightweight-charts";

// TradingView light theme — exact values from TradingView's default "White" theme
const TV_LIGHT = {
  bg: "#ffffff",
  bgAlt: "#f0f3fa",
  text: "#131722",
  textMuted: "#787b86",
  grid: "#e1ecf2",
  border: "#d1d4dc",
  up: "#089981",
  down: "#f23645",
  upBorder: "#089981",
  downBorder: "#f23645",
  ema20: "#f7a600",
  ema50: "#1E53E5",
  volUp: "rgba(8,153,129,0.3)",
  volDown: "rgba(242,54,69,0.3)",
};

const TV_DARK = {
  bg: "#131722",
  bgAlt: "#1e222d",
  text: "#d1d4dc",
  textMuted: "#787b86",
  grid: "#2a2e39",
  border: "#363c4e",
  up: "#089981",
  down: "#f23645",
  upBorder: "#089981",
  downBorder: "#f23645",
  ema20: "#f7a600",
  ema50: "#2962ff",
  volUp: "rgba(8,153,129,0.3)",
  volDown: "rgba(242,54,69,0.3)",
};

function calcEMAIndexed(candles, period) {
  const out = new Array(candles.length).fill(null);
  if (candles.length < period) return out;
  const k = 2 / (period + 1);
  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  out[period - 1] = { time: candles[period - 1].time, value: ema };
  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    out[i] = { time: candles[i].time, value: ema };
  }
  return out;
}

// Returns how many candles should fill the default viewport for each timeframe
function defaultWindow(candleData) {
  if (candleData.length < 2) return 200;
  const intervalSec = candleData[1].time - candleData[0].time;
  if (intervalSec <=    60) return 400;  // 1m  → ~6.5 hours
  if (intervalSec <=   300) return 160;  // 5m  → ~13 hours
  if (intervalSec <=   900) return 110;  // 15m → ~27 hours
  if (intervalSec <=  1800) return  80;  // 30m → ~40 hours
  if (intervalSec <=  3600) return 160;  // 1h  → ~6.5 days
  if (intervalSec <= 14400) return 110;  // 4h  → ~18 days
  return 160;                            // 1d  → ~7.5 months
}

const BacktestChart = ({
  candleData,
  visibleCount,
  trades = [],
  indicators = { ema20: false, ema50: false, volume: false },
  onCandleSeek,
  isPlaying = false,
  isDark = false,
  positions = [],
  onPositionUpdate,
  orderPreview = null,
  onOrderPreviewUpdate,
  drawingMode = null,
  userDrawings = [],
  onDrawingAdd,
  onDrawingDelete,
  onCrosshairMove,
  syncedCrosshairTime = null,
  barReplayActive = false,
  selectedDrawingIds = [],
  onSelectionChange,
  onRangeChange,
  onRegisterRangeSetter,
  onDrawingUpdate,
  chartSettings = null,
  panelDrawing = null,
  onPropertyChange,
}) => {
  const wrapperRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const ema20Ref = useRef([]);
  const ema50Ref = useRef([]);
  const lastRef = useRef(0);
  const windowRef = useRef(50); // candles visible in the default viewport
  const indicatorsRef = useRef(indicators);
  const onCandleSeekRef = useRef(onCandleSeek);
  const isDarkRef = useRef(isDark);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onOrderPreviewUpdateRef = useRef(onOrderPreviewUpdate);
  const onDrawingAddRef = useRef(onDrawingAdd);
  const onDrawingDeleteRef = useRef(onDrawingDelete);
  const barReplayActiveRef = useRef(barReplayActive);
  const selectedDrawingIdsRef = useRef(selectedDrawingIds);
  const onSelectionChangeRef = useRef(onSelectionChange);
  // { line, posId, field } — tracks each drawn position price line
  const positionLineRefs = useRef([]);
  // { line, field } — tracks order-panel preview price lines (shown before order is placed)
  const previewLineRefs = useRef([]);
  // { line, id } — user-drawn horizontal price lines
  const userHLineRefs = useRef([]);
  // SVG overlay for trend lines
  const svgRef = useRef(null);
  // Crosshair sync
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  const lastEmittedTimeRef = useRef(null); // prevents echo when we receive our own emission back
  // Range (drag/zoom) sync — imperative refs avoid React re-render choppiness
  const onRangeChangeRef = useRef(onRangeChange);
  const onRegisterRangeSetterRef = useRef(onRegisterRangeSetter);
  const onDrawingUpdateRef = useRef(onDrawingUpdate);
  const applyingRangeRef = useRef(false); // suppress re-emission while applying an incoming range
  const svgDraggingRef = useRef(null); // { drawingId, field: 'sl'|'tp'|'endTime'|'move', ... }
  const candleDataRef = useRef(candleData);
  // Drawing mode / state
  const drawingModeRef = useRef(null);
  const drawingStateRef = useRef(null);   // first point when drawing a trendline
  const previewPointRef = useRef(null);   // current mouse position for trendline preview
  const shiftKeyRef = useRef(false);      // true while Shift is held — snaps line to 0°/45°/90°
  const userDrawingsRef = useRef([]);
  const updateSvgDrawingsRef = useRef(() => {});
  const propsPanelRef = useRef(null); // floating properties panel DOM node
  const wasDraggedRef = useRef(false); // suppresses click after a drag ends

  // OHLCV bar — direct DOM writes for 60fps crosshair, no React re-render
  const ohlcBarRef = useRef();
  const ohlcOpenRef = useRef();
  const ohlcHighRef = useRef();
  const ohlcLowRef = useRef();
  const ohlcCloseRef = useRef();
  const ohlcChangeRef = useRef();

  // Keep refs current without adding to chart creation deps
  useEffect(() => { indicatorsRef.current = indicators; });
  useEffect(() => { onCandleSeekRef.current = onCandleSeek; });
  useEffect(() => { isDarkRef.current = isDark; });
  useEffect(() => { onPositionUpdateRef.current = onPositionUpdate; });
  useEffect(() => { onOrderPreviewUpdateRef.current = onOrderPreviewUpdate; });
  useEffect(() => { onDrawingAddRef.current = onDrawingAdd; });
  useEffect(() => { onDrawingDeleteRef.current = onDrawingDelete; });
  useEffect(() => { barReplayActiveRef.current = barReplayActive; });
  useEffect(() => {
    selectedDrawingIdsRef.current = selectedDrawingIds;
    updateSvgDrawingsRef.current(); // redraws glow and repositions the properties panel
  }, [selectedDrawingIds]); // eslint-disable-line
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; });
  useEffect(() => { onCrosshairMoveRef.current = onCrosshairMove; });
  useEffect(() => { onRangeChangeRef.current = onRangeChange; });
  useEffect(() => { onRegisterRangeSetterRef.current = onRegisterRangeSetter; });
  useEffect(() => { onDrawingUpdateRef.current = onDrawingUpdate; });
  useEffect(() => { candleDataRef.current = candleData; }, [candleData]);
  useEffect(() => {
    drawingModeRef.current = drawingMode;
    drawingStateRef.current = null;
    // Rebuild SVG so pointer-events on existing RR groups update immediately
    updateSvgDrawingsRef.current();
  }, [drawingMode]);

  // ── Drawing cursor ──
  useEffect(() => {
    if (wrapperRef.current) wrapperRef.current.style.cursor = drawingMode ? "crosshair" : "";
  }, [drawingMode]);

  // ── Sync user drawings — hlines via price lines, trendlines via SVG ──
  useEffect(() => {
    const { main } = seriesRef.current;
    userDrawingsRef.current = userDrawings;
    if (!main) return;
    userHLineRefs.current.forEach(({ line }) => { try { main.removePriceLine(line); } catch {} });
    userHLineRefs.current = [];
    userDrawings.filter((d) => d.type === "hline").forEach((d) => {
      try {
        const line = main.createPriceLine({
          price: d.price, color: d.color || "#1E53E5",
          lineWidth: d.lineWidth || 1,
          lineStyle: d.lineStyle === "dashed" ? 2 : 0,
          axisLabelVisible: true, title: "", draggable: false,
        });
        userHLineRefs.current.push({ line, id: d.id });
      } catch {}
    });
    updateSvgDrawingsRef.current();
  }, [userDrawings]);

  // ── Indicator visibility — runs when indicator toggles change ──
  useEffect(() => {
    const { ema20s, ema50s, vol } = seriesRef.current;
    if (ema20s) ema20s.applyOptions({ visible: indicators.ema20 });
    if (ema50s) ema50s.applyOptions({ visible: indicators.ema50 });
    if (vol)   vol.applyOptions({ visible: indicators.volume });
  }, [indicators.ema20, indicators.ema50, indicators.volume]);

  // ── Theme change — update chart colors when dark/light mode switches ──
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const T = isDark ? TV_DARK : TV_LIGHT;
    chart.applyOptions({
      layout: { background: { color: T.bg }, textColor: T.text },
      grid: { vertLines: { color: T.grid }, horzLines: { color: T.grid } },
      rightPriceScale: { borderColor: T.border, textColor: T.textMuted },
      timeScale: { borderColor: T.border, textColor: T.textMuted },
      crosshair: {
        vertLine: { color: T.border },
        horzLine: { color: T.border },
      },
    });
  }, [isDark]);

  // ── Synced crosshair from another chart ──
  useEffect(() => {
    const chart = chartRef.current;
    const { main } = seriesRef.current;
    if (!chart || !main) return;
    if (syncedCrosshairTime == null) {
      try { chart.clearCrosshairPosition?.(); } catch {}
      return;
    }
    // Skip if this chart emitted this timestamp — prevents bidirectional echo
    if (syncedCrosshairTime === lastEmittedTimeRef.current) return;
    let bestIdx = 0, minDiff = Infinity;
    candleData.forEach((c, i) => {
      const d = Math.abs(c.time - syncedCrosshairTime);
      if (d < minDiff) { minDiff = d; bestIdx = i; }
    });
    const c = candleData[bestIdx];
    if (c) { try { chart.setCrosshairPosition(c.close, c.time, main); } catch {} }
  }, [syncedCrosshairTime, candleData]);

  // ── Register imperative range setter + getter (logical bar-index range, avoids re-render choppiness) ──
  useEffect(() => {
    const setter = (range) => {
      const ts = chartRef.current?.timeScale();
      if (!ts) return;
      applyingRangeRef.current = true;
      try { ts.setVisibleLogicalRange(range); } catch {}
      setTimeout(() => { applyingRangeRef.current = false; }, 80);
    };
    const getter = () => {
      try { return chartRef.current?.timeScale().getVisibleLogicalRange() ?? null; } catch { return null; }
    };
    onRegisterRangeSetterRef.current?.(setter, getter);
  }, []); // eslint-disable-line

  // ── R/R drag handles — document-level so drag works outside the SVG ──
  useEffect(() => {
    const onMove = (e) => {
      const drag = svgDraggingRef.current;
      if (!drag) return;
      const svg = svgRef.current;
      const main = seriesRef.current.main;
      const chart = chartRef.current;
      if (!svg || !main || !chart) return;
      const rect = svg.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const x = e.clientX - rect.left;
      if (drag.field === "sl" || drag.field === "tp") {
        const p = main.coordinateToPrice(y);
        if (p != null) onDrawingUpdateRef.current?.(drag.drawingId, { [drag.field]: p });
      } else if (drag.field === "endTime") {
        const t = chart.timeScale().coordinateToTime?.(x);
        if (t != null) onDrawingUpdateRef.current?.(drag.drawingId, { endTime: Number(t) });
      } else if (drag.field === "p1" || drag.field === "p2") {
        // Shift snaps endpoint to 0°/45°/90° relative to the fixed anchor endpoint
        let cx = x, cy = y;
        if (shiftKeyRef.current && drag.anchorPrice != null) {
          const anchorT = drag.field === "p1" ? drag.visualP2Time : drag.p1Time;
          const anchorX = chart.timeScale().timeToCoordinate(anchorT);
          const anchorY = main.priceToCoordinate(drag.anchorPrice);
          if (anchorX != null && anchorY != null) {
            const adx = Math.abs(cx - anchorX), ady = Math.abs(cy - anchorY);
            if (adx > ady * 2.414)      { cy = anchorY; }
            else if (ady > adx * 2.414) { cx = anchorX; }
            else { const d = Math.max(adx, ady); cx = anchorX + (cx >= anchorX ? d : -d); cy = anchorY + (cy >= anchorY ? d : -d); }
          }
        }
        const rawT = chart.timeScale().coordinateToTime?.(cx);
        const p = main.coordinateToPrice(cy);
        if (rawT != null && p != null) {
          const newTime = Number(rawT);
          if (drag.field === "p1") {
            const newSpan = Math.max(1, Math.round((drag.visualP2Time - newTime) / drag.candleInterval));
            onDrawingUpdateRef.current?.(drag.drawingId, { p1: { time: newTime, price: p }, candleSpan: newSpan });
          } else {
            const newSpan = Math.max(1, Math.round((newTime - drag.p1Time) / drag.candleInterval));
            onDrawingUpdateRef.current?.(drag.drawingId, { p2: { time: newTime, price: p }, candleSpan: newSpan });
          }
        }
      } else if (drag.field === "move") {
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        if (!drag.hasMoved && Math.abs(dx) + Math.abs(dy) < 5) return;
        drag.hasMoved = true;
        // startLogical and startPrice are captured once at mousedown — never recomputed,
        // so zoom/scroll between mousedown and now doesn't corrupt the delta.
        // Shift constrains movement to horizontal or vertical axis only
        let effectiveX = e.clientX - rect.left, effectiveY = e.clientY - rect.top;
        if (shiftKeyRef.current) {
          if (Math.abs(dx) >= Math.abs(dy)) {
            effectiveY = drag.startClientY - rect.top; // horizontal — lock price
          } else {
            effectiveX = drag.startClientX - rect.left; // vertical — lock time
          }
        }
        const logicalNow = chart.timeScale().coordinateToLogical(effectiveX) ?? drag.startLogical;
        const timeDelta  = Math.round((logicalNow - drag.startLogical) * drag.candleInterval);
        const priceNow   = main.coordinateToPrice(effectiveY) ?? drag.startPrice;
        const priceDelta = priceNow - drag.startPrice;
        if (drag.drawingType === "vline") {
          onDrawingUpdateRef.current?.(drag.drawingId, { time: drag.startTime + timeDelta });
        } else if (drag.drawingType === "hline") {
          onDrawingUpdateRef.current?.(drag.drawingId, { price: drag.startPrice + priceDelta });
        } else if (drag.drawingType === "text") {
          onDrawingUpdateRef.current?.(drag.drawingId, {
            time:  drag.startTime         + timeDelta,
            price: drag.startDrawingPrice + priceDelta,
          });
        } else if (drag.drawingType === "rr") {
          onDrawingUpdateRef.current?.(drag.drawingId, {
            entry: drag.startEntry + priceDelta,
            sl:    drag.startSl    + priceDelta,
            tp:    drag.startTp    + priceDelta,
            time:    drag.startTime    + timeDelta,
            endTime: drag.startEndTime != null ? drag.startEndTime + timeDelta : null,
          });
        } else {
          onDrawingUpdateRef.current?.(drag.drawingId, {
            p1: { time: drag.startP1.time + timeDelta, price: drag.startP1.price + priceDelta },
            p2: { time: drag.startP2.time + timeDelta, price: drag.startP2.price + priceDelta },
          });
        }
      }
    };
    const onUp = () => {
      wasDraggedRef.current = svgDraggingRef.current?.hasMoved ?? false;
      svgDraggingRef.current = null;
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []); // eslint-disable-line

  // ── Chart appearance settings (candle colors + opacity, background, plain bg) ──
  useEffect(() => {
    const { main } = seriesRef.current;
    const chart = chartRef.current;
    if (!chart || !main) return;
    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    const cs = chartSettings || {};

    const withOpacity = (hex, opKey) => {
      if (!hex) return null;
      const op = cs[opKey] ?? 100;
      if (op >= 100) return hex;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${(op / 100).toFixed(2)})`;
    };

    const upBody   = withOpacity(cs.upBody,   "upBodyOpacity")   || T.up;
    const downBody = withOpacity(cs.downBody, "downBodyOpacity") || T.down;
    const upBorder   = withOpacity(cs.upBorder,   "upBorderOpacity")   || withOpacity(cs.upBody, "upBodyOpacity")   || T.upBorder;
    const downBorder = withOpacity(cs.downBorder, "downBorderOpacity") || withOpacity(cs.downBody, "downBodyOpacity") || T.downBorder;
    const upWick   = withOpacity(cs.upWick,   "upWickOpacity")   || upBody;
    const downWick = withOpacity(cs.downWick, "downWickOpacity") || downBody;
    const bgColor  = cs.plainBg ? "#ffffff" : (withOpacity(cs.bg, "bgOpacity") || T.bg);

    try {
      chart.applyOptions({
        layout: { background: { color: bgColor } },
        grid: cs.plainBg
          ? { vertLines: { visible: false }, horzLines: { visible: false } }
          : { vertLines: { color: T.grid, style: 0 }, horzLines: { color: T.grid, style: 0 } },
      });
      main.applyOptions({
        upColor: upBody, downColor: downBody,
        borderUpColor: upBorder, borderDownColor: downBorder,
        wickUpColor: upWick, wickDownColor: downWick,
      });
    } catch {}
  }, [chartSettings]);

  // ── Position price lines — entry, TP, SL drawn on the candlestick series ──
  useEffect(() => {
    const { main } = seriesRef.current;
    if (!main) return;
    positionLineRefs.current.forEach(({ line }) => {
      try { main.removePriceLine(line); } catch {}
    });
    positionLineRefs.current = [];
    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    positions.forEach((pos) => {
      const sideColor = pos.side === "buy" ? T.up : T.down;
      const addLine = (price, color, title, lineStyle, posId, field) => {
        try {
          const line = main.createPriceLine({
            price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title,
            draggable: field !== "entry", // TP and SL are draggable; entry is not
          });
          positionLineRefs.current.push({ line, posId, field });
        } catch {}
      };
      addLine(pos.entryPrice, sideColor, `${pos.side.toUpperCase()} ×${pos.size}`, 2, pos.id, "entry");
      if (pos.takeProfit !== null) addLine(pos.takeProfit, "#089981", "TP", 1, pos.id, "takeProfit");
      if (pos.stopLoss   !== null) addLine(pos.stopLoss,   "#f23645", "SL", 1, pos.id, "stopLoss");
    });
  }, [positions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Order panel preview lines — entry/TP/SL shown before placing an order ──
  useEffect(() => {
    const { main } = seriesRef.current;
    if (!main) return;
    previewLineRefs.current.forEach(({ line }) => {
      try { main.removePriceLine(line); } catch {}
    });
    previewLineRefs.current = [];
    if (!orderPreview) return;
    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    const sideColor = orderPreview.side === "buy" ? T.up : T.down;
    const addLine = (price, color, title, lineStyle, field) => {
      try {
        const line = main.createPriceLine({
          price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title,
          draggable: field !== "entry",
        });
        previewLineRefs.current.push({ line, field });
      } catch {}
    };
    // Only show TP/SL dashed lines (no entry line — avoids clutter while order panel is open)
    if (orderPreview.takeProfit !== null) addLine(orderPreview.takeProfit, "#089981", "TP", 1, "takeProfit");
    if (orderPreview.stopLoss !== null) addLine(orderPreview.stopLoss, "#f23645", "SL", 1, "stopLoss");
  }, [orderPreview, candleData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mouseup sync — reads dragged price line positions back to state ──
  // subscribeClick is unreliable after a drag; mouseup on the container always fires
  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;
    const onMouseUp = () => {
      if (onPositionUpdateRef.current) {
        positionLineRefs.current.forEach(({ line, posId, field }) => {
          if (field === "entry") return;
          try {
            const newPrice = line.options().price;
            if (typeof newPrice === "number" && isFinite(newPrice)) {
              onPositionUpdateRef.current(posId, field, String(newPrice));
            }
          } catch {}
        });
      }
      if (onOrderPreviewUpdateRef.current) {
        previewLineRefs.current.forEach(({ line, field }) => {
          if (field === "entry") return;
          try {
            const newPrice = line.options().price;
            if (typeof newPrice === "number" && isFinite(newPrice)) {
              onOrderPreviewUpdateRef.current(field, newPrice);
            }
          } catch {}
        });
      }
    };
    container.addEventListener("mouseup", onMouseUp);
    return () => container.removeEventListener("mouseup", onMouseUp);
  }, []); // stable — uses refs so always sees current handlers

  // ── Keyboard shortcut: Ctrl+R or Alt+R resets chart zoom to default ──
  useEffect(() => {
    const handleKey = (e) => {
      if (!chartRef.current) return;
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "r") {
        e.preventDefault();
        const last = lastRef.current;
        const win = windowRef.current;
        chartRef.current.applyOptions({ timeScale: { barSpacing: 4 } });
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: last - 1 - win,
          to:   last - 1 + Math.round(win * 0.1),
        });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Track Shift key state for line angle snapping ──
  useEffect(() => {
    const onKey = (e) => { shiftKeyRef.current = e.shiftKey; };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  // ── Chart creation — runs only when candleData changes (new session / new timeframe) ──
  useEffect(() => {
    if (!wrapperRef.current || !candleData?.length) return;

    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;

    ema20Ref.current = calcEMAIndexed(candleData, 20);
    ema50Ref.current = calcEMAIndexed(candleData, 50);

    const chart = createChart(wrapperRef.current, {
      autoSize: true,
      layout: {
        background: { color: T.bg },
        textColor: T.text,
        fontSize: 11,
        fontFamily: "'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: T.grid, style: 0 },
        horzLines: { color: T.grid, style: 0 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#758696", width: 1, style: 1, labelBackgroundColor: "#2962ff" },
        horzLine: { color: "#758696", width: 1, style: 1, labelBackgroundColor: "#2962ff" },
      },
      rightPriceScale: {
        borderColor: T.border,
        scaleMargins: { top: 0.08, bottom: 0.25 },
        textColor: T.textMuted,
      },
      timeScale: {
        borderColor: T.border,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 4,
        minBarSpacing: 2,
        rightOffset: 5,
        textColor: T.textMuted,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: { time: false, price: true }, mouseWheel: true, pinch: false },
    });
    chartRef.current = chart;

    // v5 API: chart.addSeries(SeriesType, options)
    const main = chart.addSeries(CandlestickSeries, {
      upColor: T.up,
      downColor: T.down,
      borderUpColor: T.upBorder,
      borderDownColor: T.downBorder,
      wickUpColor: T.up,
      wickDownColor: T.down,
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const ema20s = chart.addSeries(LineSeries, {
      color: T.ema20,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      title: "EMA 20",
    });

    const ema50s = chart.addSeries(LineSeries, {
      color: T.ema50,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      title: "EMA 50",
    });

    seriesRef.current = { main, vol, ema20s, ema50s };

    // Apply initial visibility so series never flash visible then disappear
    const initT = indicatorsRef.current;
    ema20s.applyOptions({ visible: initT.ema20 });
    ema50s.applyOptions({ visible: initT.ema50 });
    vol.applyOptions({ visible: initT.volume });

    const count = Math.min(visibleCount || 1, candleData.length);
    const slice = candleData.slice(0, count);

    main.setData(slice);
    vol.setData(
      slice.map((d) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? T.volUp : T.volDown,
      }))
    );
    ema20s.setData(ema20Ref.current.slice(0, count).filter(Boolean));
    ema50s.setData(ema50Ref.current.slice(0, count).filter(Boolean));
    lastRef.current = count;

    // Zoom to show an appropriate time window instead of squishing all candles
    const win = defaultWindow(candleData);
    windowRef.current = win;
    chart.timeScale().setVisibleLogicalRange({
      from: count - 1 - win,
      to:   count - 1 + Math.round(win * 0.1), // small right padding
    });

    // Trade markers — v5 uses createSeriesMarkers(series, markers)
    if (trades.length > 0) {
      const markers = trades
        .flatMap((trade) => {
          const eT = Math.floor(new Date(trade.entryDate).getTime() / 1000);
          const xT = Math.floor(new Date(trade.exitDate).getTime() / 1000);
          const nearest = (t) =>
            candleData.reduce((c, d) =>
              Math.abs(d.time - t) < Math.abs(c.time - t) ? d : c
            );
          return [
            {
              time: nearest(eT).time,
              position: trade.direction === "long" ? "belowBar" : "aboveBar",
              color: trade.direction === "long" ? T.up : T.down,
              shape: trade.direction === "long" ? "arrowUp" : "arrowDown",
              text: `${trade.direction === "long" ? "B" : "S"} ${trade.instrument}`,
              size: 1,
            },
            {
              time: nearest(xT).time,
              position: trade.direction === "long" ? "aboveBar" : "belowBar",
              color: trade.pnl > 0 ? T.up : T.down,
              shape: trade.direction === "long" ? "arrowDown" : "arrowUp",
              text: `${trade.pnl > 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`,
              size: 1,
            },
          ];
        })
        .sort((a, b) => a.time - b.time);
      createSeriesMarkers(main, markers);
    }

    // ── SVG drawing layer — recomputed on every scroll/zoom ──
    const updateSvgDrawings = () => {
      const svg = svgRef.current;
      if (!svg) return;
      while (svg.lastChild) svg.removeChild(svg.lastChild);
      const ts = chart.timeScale();
      const mn = seriesRef.current.main;
      if (!mn) return;
      const svgW = svg.clientWidth;
      const svgH = svg.clientHeight;

      // Snap a drawing timestamp to the nearest candle — keeps drawings visible across TF switches
      const interval = candleDataRef.current?.length > 1
        ? candleDataRef.current[1].time - candleDataRef.current[0].time : 3600;
      const snapTime = (t) => {
        const data = candleDataRef.current;
        if (!data?.length) return t;
        let best = data[0], bestDist = Math.abs(data[0].time - t);
        for (const c of data) {
          const d = Math.abs(c.time - t);
          if (d < bestDist) { bestDist = d; best = c; }
        }
        return best.time;
      };

      // logX: converts a bar timestamp to a pixel X coordinate that works even when the bar is
      // outside the visible range. lightweight-charts timeToCoordinate returns null for off-screen
      // times; logicalToCoordinate extrapolates pixel positions beyond the viewport (SVG clips them).
      const _barData = candleDataRef.current || [];
      const _timeToIdx = new Map(_barData.map((c, i) => [c.time, i]));
      const logX = (t) => {
        const idx = _timeToIdx.get(t);
        if (idx !== undefined) {
          const c = ts.logicalToCoordinate(idx);
          if (c != null) return c;
        }
        return ts.timeToCoordinate(t); // fallback for times not in current data set
      };

      // Factory for move handles — blue circle with grab cursor, starts a 'move' drag on mousedown.
      // Captures startLogical and startPrice at mousedown so zoom/scroll between then and onMove
      // can't corrupt the delta calculation.
      const mkMoveHandle = (hx, hy, drawing, extraState) => {
        const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        h.setAttribute("cx", hx); h.setAttribute("cy", hy); h.setAttribute("r", "6");
        h.setAttribute("fill", "#1E53E5"); h.setAttribute("fill-opacity", "0.85");
        h.setAttribute("stroke", "#fff"); h.setAttribute("stroke-width", "1.5");
        h.style.cursor = "grab";
        h.style.pointerEvents = "all";
        h.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          const svgEl = svgRef.current;
          const svgRect = svgEl?.getBoundingClientRect();
          const ch = chartRef.current;
          const mn2 = seriesRef.current.main;
          const startLogical = ch?.timeScale().coordinateToLogical(e.clientX - (svgRect?.left ?? 0)) ?? 0;
          const startPrice   = mn2?.coordinateToPrice(e.clientY - (svgRect?.top ?? 0)) ?? 0;
          svgDraggingRef.current = {
            drawingId: drawing.id, field: "move", drawingType: drawing.type,
            startClientX: e.clientX, startClientY: e.clientY,
            startLogical, startPrice,
            candleInterval: interval, hasMoved: false,
            ...extraState,
          };
        });
        return h;
      };

      // No SVG filters — selection uses thicker stroke only, no shadow/glow
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.appendChild(defs);

      // CSS hover rules — labels and handles only appear on :hover or when selected
      const rrStyle = document.createElementNS("http://www.w3.org/2000/svg", "style");
      rrStyle.textContent = [
        ".rr-labels{visibility:hidden}",
        ".rr-handles{visibility:hidden}",
        ".rr-group:hover .rr-labels{visibility:visible}",
        ".rr-group:hover .rr-handles{visibility:visible}",
        ".rr-selected .rr-labels{visibility:visible}",
        ".rr-selected .rr-handles{visibility:visible}",
      ].join(" ");
      svg.appendChild(rrStyle);

      // Helper: attach delete/select click to any SVG element
      const attachInteraction = (el, drawing) => {
        el.addEventListener("click", (e) => {
          // Suppress click if mouse moved (drag) — wasDraggedRef is set by onUp
          if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
          e.stopPropagation();
          if (drawingModeRef.current === "eraser") {
            onDrawingDeleteRef.current?.(drawing.id);
          } else if (!drawingModeRef.current || drawingModeRef.current === "selector") {
            // Ctrl/Cmd + left-click: multi-select toggle; plain click: single-select
            onSelectionChangeRef.current?.(drawing.id, e.ctrlKey || e.metaKey || e.shiftKey);
          }
        });
        // Suppress browser context menu on right-click over drawings
        el.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
        });
      };
      const isSelected = (id) => selectedDrawingIdsRef.current.includes(id);
      const selStroke = (base) => isSelected(base) ? "#60a5fa" : base;
      const selWidth = (id) => isSelected(id) ? "2.5" : "1.5";
      const applyGlow = () => {}; // no glow — selection shown via stroke width only

      userDrawingsRef.current.forEach((drawing) => {
        // Vertical line
        if (drawing.type === "vline") {
          const x = logX(drawing.time);
          if (x == null) return;
          const sel = isSelected(drawing.id);
          const vBaseW = drawing.lineWidth || 1;

          // Wide transparent hit area — easy to click & drag the whole line
          const hitEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hitEl.setAttribute("x1", x); hitEl.setAttribute("y1", 0);
          hitEl.setAttribute("x2", x); hitEl.setAttribute("y2", svgH);
          hitEl.setAttribute("stroke", "transparent");
          hitEl.setAttribute("stroke-width", "12");
          hitEl.style.cursor = sel ? "ew-resize" : "pointer";
          hitEl.style.pointerEvents = "stroke";
          attachInteraction(hitEl, drawing);
          hitEl.addEventListener("mousedown", (e) => {
            if (drawingModeRef.current) return;
            e.stopPropagation();
            const svgEl = svgRef.current;
            const svgRect = svgEl?.getBoundingClientRect();
            const ch = chartRef.current;
            const mn2 = seriesRef.current.main;
            const startLogical = ch?.timeScale().coordinateToLogical(e.clientX - (svgRect?.left ?? 0)) ?? 0;
            const startPrice   = mn2?.coordinateToPrice(e.clientY - (svgRect?.top ?? 0)) ?? 0;
            svgDraggingRef.current = {
              drawingId: drawing.id, field: "move", drawingType: "vline",
              startClientX: e.clientX, startClientY: e.clientY,
              startLogical, startPrice,
              candleInterval: interval, hasMoved: false,
              startTime: drawing.time,
            };
          });
          svg.appendChild(hitEl);

          // Visible line
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", x); el.setAttribute("y1", 0);
          el.setAttribute("x2", x); el.setAttribute("y2", svgH);
          el.setAttribute("stroke", sel ? "#60a5fa" : (drawing.color || "#f7a600"));
          el.setAttribute("stroke-width", sel ? String(vBaseW + 1) : String(vBaseW));
          if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "4,3");
          el.style.pointerEvents = "none";
          svg.appendChild(el);

          if (sel) {
            svg.appendChild(mkMoveHandle(x, svgH / 2, drawing, { startTime: drawing.time }));
          }
          return;
        }

        // Text label
        if (drawing.type === "text") {
          const x = logX(drawing.time);
          const y = mn.priceToCoordinate(drawing.price);
          if (x == null || y == null) return;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
          el.setAttribute("x", x);
          el.setAttribute("y", y - 4);
          el.setAttribute("fill", isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#f7a600"));
          el.setAttribute("font-size", "12");
          el.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
          el.setAttribute("font-weight", "600");
          el.style.cursor = "pointer";
          el.style.pointerEvents = "all";
          el.textContent = drawing.label || "Label";
          el.style.cursor = isSelected(drawing.id) ? "grab" : "pointer";
          attachInteraction(el, drawing);
          svg.appendChild(el);
          if (isSelected(drawing.id)) {
            svg.appendChild(mkMoveHandle(x, y - 4, drawing, {
              startTime: drawing.time, startDrawingPrice: drawing.price,
            }));
          }
          return;
        }

        // Rectangle
        if (drawing.type === "rectangle") {
          const x1 = logX(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = logX(drawing.p2.time);
          const y2 = mn.priceToCoordinate(drawing.p2.price);
          if (x1 == null || y1 == null || x2 == null || y2 == null) return;
          const rx = Math.min(x1, x2), ry = Math.min(y1, y2);
          const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1);
          const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          el.setAttribute("x", rx); el.setAttribute("y", ry);
          el.setAttribute("width", rw); el.setAttribute("height", rh);
          el.setAttribute("stroke", selStroke(drawing.color || "#1E53E5"));
          el.setAttribute("stroke-width", selWidth(drawing.id));
          el.setAttribute("fill", isSelected(drawing.id) ? "rgba(96,165,250,0.1)" : "rgba(30,83,229,0.06)");
          el.style.cursor = "pointer";
          el.style.pointerEvents = "all";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          svg.appendChild(el);
          if (isSelected(drawing.id)) {
            const p = { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } };
            svg.appendChild(mkMoveHandle((x1 + x2) / 2, (y1 + y2) / 2, drawing, p));
          }
          return;
        }

        // Segment — scales with timeframe via candleSpan; endpoint handles for resize
        if (drawing.type === "segment") {
          const p1Idx = _timeToIdx.get(drawing.p1.time);
          const x1 = p1Idx !== undefined
            ? (ts.logicalToCoordinate(p1Idx) ?? ts.timeToCoordinate(drawing.p1.time))
            : ts.timeToCoordinate(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const scaledEndTime = drawing.candleSpan != null
            ? drawing.p1.time + drawing.candleSpan * interval
            : drawing.p2.time;
          // Use p1Idx + candleSpan for the end logical position — works even when the endpoint
          // is outside the visible range (logicalToCoordinate extrapolates; SVG clips the result).
          const x2 = (p1Idx !== undefined && drawing.candleSpan != null)
            ? (ts.logicalToCoordinate(p1Idx + drawing.candleSpan) ?? ts.timeToCoordinate(scaledEndTime))
            : ts.timeToCoordinate(scaledEndTime);
          const y2 = mn.priceToCoordinate(drawing.p2.price);
          if (y1 == null || y2 == null) return;
          if (x1 == null && x2 == null) return; // entirely off-screen horizontally
          // Wide transparent hit area — 12px stroke so the line is easy to click
          const hitEl = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hitEl.setAttribute("x1", x1); hitEl.setAttribute("y1", y1);
          hitEl.setAttribute("x2", x2); hitEl.setAttribute("y2", y2);
          hitEl.setAttribute("stroke", "transparent");
          hitEl.setAttribute("stroke-width", "12");
          hitEl.style.cursor = "pointer";
          hitEl.style.pointerEvents = "stroke";
          attachInteraction(hitEl, drawing);
          svg.appendChild(hitEl);
          // Visible line
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", x1); el.setAttribute("y1", y1);
          el.setAttribute("x2", x2); el.setAttribute("y2", y2);
          el.setAttribute("stroke", selStroke(drawing.color || "#f7a600"));
          const segBaseW = drawing.lineWidth || 1.5;
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(segBaseW + 1) : String(segBaseW));
          if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
          el.style.pointerEvents = "none";
          applyGlow(el, drawing.id);
          svg.appendChild(el);
          // Endpoint dots
          [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
            dot.setAttribute("fill", selStroke(drawing.color || "#f7a600"));
            dot.style.pointerEvents = "none";
            svg.appendChild(dot);
          });
          if (isSelected(drawing.id)) {
            const moveP = { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } };
            svg.appendChild(mkMoveHandle((x1 + x2) / 2, (y1 + y2) / 2, drawing, moveP));
            // Endpoint resize handles — white ring with line color border; anchorPrice enables Shift snap
            const mkResizeHandle = (hx, hy, field, anchorPrice) => {
              const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              h.setAttribute("cx", hx); h.setAttribute("cy", hy); h.setAttribute("r", "5");
              h.setAttribute("fill", isDarkRef.current ? "#131722" : "#ffffff");
              h.setAttribute("stroke", drawing.color || "#f7a600");
              h.setAttribute("stroke-width", "2");
              h.style.cursor = "crosshair";
              h.style.pointerEvents = "all";
              h.addEventListener("mousedown", (ev) => {
                ev.stopPropagation();
                svgDraggingRef.current = {
                  drawingId: drawing.id, field,
                  drawingType: "segment",
                  candleInterval: interval,
                  visualP2Time: scaledEndTime,
                  p1Time: drawing.p1.time,
                  anchorPrice,
                };
              });
              return h;
            };
            svg.appendChild(mkResizeHandle(x1, y1, "p1", drawing.p2.price));
            svg.appendChild(mkResizeHandle(x2, y2, "p2", drawing.p1.price));
          }
          return;
        }

        // Ray — extends right from p1 through p2
        if (drawing.type === "ray") {
          const x1 = logX(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = logX(drawing.p2.time);
          const y2 = mn.priceToCoordinate(drawing.p2.price);
          if (x1 == null || y1 == null || x2 == null || y2 == null) return;
          const dx = x2 - x1, dy = y2 - y1;
          let lx2 = x2, ly2 = y2;
          if (Math.abs(dx) > 0.5) {
            const slope = dy / dx;
            lx2 = svgW; ly2 = y1 + slope * (svgW - x1);
          }
          const rayBaseW = drawing.lineWidth || 1.5;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", x1); el.setAttribute("y1", y1);
          el.setAttribute("x2", lx2); el.setAttribute("y2", ly2);
          el.setAttribute("stroke", selStroke(drawing.color || "#089981"));
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(rayBaseW + 1) : String(rayBaseW));
          if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
          el.style.cursor = "pointer";
          el.style.pointerEvents = "stroke";
          attachInteraction(el, drawing);
          svg.appendChild(el);
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", x1); dot.setAttribute("cy", y1); dot.setAttribute("r", "3");
          dot.setAttribute("fill", selStroke(drawing.color || "#089981"));
          dot.style.pointerEvents = "none";
          svg.appendChild(dot);
          if (isSelected(drawing.id)) {
            const midX = (x1 + Math.min(lx2, svgW)) / 2;
            const midY = y1 + (Math.abs(dx) > 0.5 ? (dy / dx) * (midX - x1) : 0);
            const p = { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } };
            svg.appendChild(mkMoveHandle(midX, midY, drawing, p));
          }
          return;
        }

        // Trendline — extends across full chart width
        if (drawing.type === "trendline") {
          const x1 = logX(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = logX(drawing.p2.time);
          const y2 = mn.priceToCoordinate(drawing.p2.price);
          if (x1 == null || y1 == null || x2 == null || y2 == null) return;
          const dx = x2 - x1, dy = y2 - y1;
          let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
          if (Math.abs(dx) > 0.5) {
            const slope = dy / dx;
            lx1 = 0;    ly1 = y1 + slope * (0 - x1);
            lx2 = svgW; ly2 = y1 + slope * (svgW - x1);
          }
          const trendBaseW = drawing.lineWidth || 1.5;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", lx1); el.setAttribute("y1", ly1);
          el.setAttribute("x2", lx2); el.setAttribute("y2", ly2);
          el.setAttribute("stroke", selStroke(drawing.color || "#1E53E5"));
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(trendBaseW + 1) : String(trendBaseW));
          if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
          el.style.cursor = "pointer";
          el.style.pointerEvents = "stroke";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          svg.appendChild(el);
          [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
            dot.setAttribute("fill", selStroke(drawing.color || "#1E53E5"));
            dot.style.pointerEvents = "none";
            svg.appendChild(dot);
          });
          if (isSelected(drawing.id)) {
            const midX = svgW / 2;
            const midY = Math.abs(dx) > 0.5 ? y1 + (dy / dx) * (midX - x1) : y1;
            const p = { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } };
            svg.appendChild(mkMoveHandle(midX, midY, drawing, p));
          }
          return;
        }

        // Fibonacci retracement
        if (drawing.type === "fibonacci") {
          const x1 = logX(drawing.p1.time);
          const x2 = logX(drawing.p2.time);
          if (x1 == null || x2 == null) return;
          const lx1 = Math.min(x1, x2), lx2 = Math.max(x1, x2);
          const priceRange = drawing.p2.price - drawing.p1.price;
          const FIB_LEVELS = [
            { r: 0,     color: "#787b86" },
            { r: 0.236, color: "#089981" },
            { r: 0.382, color: "#089981" },
            { r: 0.5,   color: "#f7a600" },
            { r: 0.618, color: "#089981" },
            { r: 0.786, color: "#089981" },
            { r: 1.0,   color: "#787b86" },
          ];
          const selected   = isSelected(drawing.id);
          const overColor  = drawing.color || null;
          const lineW      = drawing.lineWidth || 1;
          const isDashed   = drawing.lineStyle === "dashed";
          const showLabels = drawing.showLabels !== false;
          const sw         = selected ? String(lineW + 1) : String(lineW);

          FIB_LEVELS.forEach(({ r, color }) => {
            const fibPrice = drawing.p1.price + priceRange * r;
            const fy = mn.priceToCoordinate(fibPrice);
            if (fy == null) return;
            const stroke = selected ? "#60a5fa" : (overColor || color);

            const hit = document.createElementNS("http://www.w3.org/2000/svg", "line");
            hit.setAttribute("x1", lx1); hit.setAttribute("y1", fy);
            hit.setAttribute("x2", lx2); hit.setAttribute("y2", fy);
            hit.setAttribute("stroke", "transparent");
            hit.setAttribute("stroke-width", "10");
            hit.style.cursor = "pointer";
            hit.style.pointerEvents = "stroke";
            attachInteraction(hit, drawing);
            svg.appendChild(hit);

            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", lx1); line.setAttribute("y1", fy);
            line.setAttribute("x2", lx2); line.setAttribute("y2", fy);
            line.setAttribute("stroke", stroke);
            line.setAttribute("stroke-width", sw);
            if (r !== 0 && r !== 1) {
              line.setAttribute("stroke-dasharray", isDashed ? "6,4" : "4,3");
            }
            line.style.pointerEvents = "none";
            svg.appendChild(line);

            if (showLabels) {
              const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
              lbl.setAttribute("x", lx1 + 4); lbl.setAttribute("y", fy - 2);
              lbl.setAttribute("fill", stroke);
              lbl.setAttribute("font-size", "9");
              lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
              lbl.setAttribute("font-weight", "600");
              lbl.textContent = `${(r * 100).toFixed(1)}%  ${fibPrice.toFixed(2)}`;
              lbl.style.pointerEvents = "none";
              svg.appendChild(lbl);
            }
          });

          if (selected) {
            const midPrice = drawing.p1.price + priceRange * 0.5;
            const midY = mn.priceToCoordinate(midPrice);
            if (midY != null) {
              svg.appendChild(mkMoveHandle((lx1 + lx2) / 2, midY, drawing, {
                startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 },
              }));
            }
          }
          return;
        }

        // Buy / Sell position markers
        if (drawing.type === "buy_marker" || drawing.type === "sell_marker") {
          const x = logX(drawing.time);
          const y = mn.priceToCoordinate(drawing.price);
          if (x == null || y == null) return;
          const isBuy = drawing.type === "buy_marker";
          const col = selected => selected ? "#60a5fa" : (isBuy ? "#089981" : "#f23645");
          const color = col(isSelected(drawing.id));
          // Triangle: buy = arrow below price pointing up, sell = arrow above pointing down
          const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          const pts = isBuy
            ? `${x},${y + 2} ${x - 7},${y + 14} ${x + 7},${y + 14}`
            : `${x},${y - 2} ${x - 7},${y - 14} ${x + 7},${y - 14}`;
          arrow.setAttribute("points", pts);
          arrow.setAttribute("fill", color);
          arrow.style.cursor = "pointer";
          arrow.style.pointerEvents = "all";
          applyGlow(arrow, drawing.id);
          attachInteraction(arrow, drawing);
          svg.appendChild(arrow);
          // Label
          const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          lbl.setAttribute("x", x); lbl.setAttribute("y", isBuy ? y + 24 : y - 18);
          lbl.setAttribute("text-anchor", "middle");
          lbl.setAttribute("fill", color);
          lbl.setAttribute("font-size", "9");
          lbl.setAttribute("font-weight", "700");
          lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
          lbl.textContent = isBuy ? "B" : "S";
          lbl.style.pointerEvents = "none";
          svg.appendChild(lbl);
          return;
        }

        // Risk/Reward box — two colored rectangles, width controlled by endTime
        if (drawing.type === "rr") {
          const x = logX(drawing.time);
          if (x == null) return;
          const xEndRaw = drawing.endTime ? ts.timeToCoordinate(snapTime(drawing.endTime)) : null;
          const xEnd = xEndRaw ?? svgW;
          if (xEnd <= x) return;
          const yEntry = mn.priceToCoordinate(drawing.entry);
          const ySL    = mn.priceToCoordinate(drawing.sl);
          const yTP    = mn.priceToCoordinate(drawing.tp);
          if (yEntry == null || ySL == null || yTP == null) return;
          const sel = isSelected(drawing.id);
          const sw = sel ? "2" : "1";

          const risk   = Math.abs(drawing.entry - drawing.sl);
          const reward = Math.abs(drawing.tp - drawing.entry);
          const ratio  = risk > 0 ? (reward / risk).toFixed(1) : "—";
          const slPct  = risk   > 0 ? ((risk   / drawing.entry) * 100).toFixed(3) : "0.000";
          const tpPct  = reward > 0 ? ((reward / drawing.entry) * 100).toFixed(3) : "0.000";
          const size   = drawing.size ?? 1;
          const slAmt  = Math.round(risk   * size);
          const tpAmt  = Math.round(reward * size);
          const inDrawMode = !!drawingModeRef.current;
          const fillOp = drawing.fillOpacity ?? 0.18; // zone fill transparency
          const showLabels = drawing.showLabels !== false; // default on

          // Use actual price coordinates — zones scale naturally with chart zoom
          const ySLv = ySL;
          const yTPv = yTP;

          // Container group — CSS :hover shows rr-labels and rr-handles sub-groups
          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.setAttribute("class", sel ? "rr-group rr-selected" : "rr-group");
          if (inDrawMode) group.style.pointerEvents = "none";

          // Always-visible colored zones
          const mkRect = (yA, yB, fillColor, strokeColor) => {
            const top = Math.min(yA, yB), h = Math.abs(yB - yA);
            const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            r.setAttribute("x", x); r.setAttribute("y", top);
            r.setAttribute("width", xEnd - x); r.setAttribute("height", Math.max(h, 1));
            r.setAttribute("fill", fillColor);
            r.setAttribute("stroke", strokeColor); r.setAttribute("stroke-width", sw);
            if (!inDrawMode) {
              r.style.cursor = "pointer"; r.style.pointerEvents = "all";
              attachInteraction(r, drawing);
            } else {
              r.style.pointerEvents = "none";
            }
            group.appendChild(r);
          };
          const slFill = `rgba(242,54,69,${sel ? Math.min(fillOp * 1.6, 1) : fillOp})`;
          const tpFill = `rgba(8,153,129,${sel ? Math.min(fillOp * 1.6, 1) : fillOp})`;
          mkRect(yEntry, ySLv, slFill, sel ? "#f23645" : `rgba(242,54,69,${Math.min(fillOp * 2.5, 1)})`);
          mkRect(yEntry, yTPv, tpFill, sel ? "#089981" : `rgba(8,153,129,${Math.min(fillOp * 2.5, 1)})`);

          // Boundary lines (always visible)
          const mkLine = (y1, stroke, dash) => {
            const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
            ln.setAttribute("x1", x); ln.setAttribute("y1", y1);
            ln.setAttribute("x2", xEnd); ln.setAttribute("y2", y1);
            ln.setAttribute("stroke", stroke); ln.setAttribute("stroke-width", sw);
            if (dash) ln.setAttribute("stroke-dasharray", dash);
            ln.style.pointerEvents = "none";
            group.appendChild(ln);
          };
          const entryDash = (drawing.lineStyle === "dashed") ? "6,3" : null;
          mkLine(yEntry, sel ? "#60a5fa" : "rgba(255,255,255,0.7)", entryDash);
          mkLine(ySLv, sel ? "#60a5fa" : "rgba(242,54,69,0.85)");
          mkLine(yTPv, sel ? "#60a5fa" : "rgba(8,153,129,0.85)");

          // Labels — in sub-group, CSS controls visibility on hover / selected
          const labelsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          labelsG.setAttribute("class", showLabels ? "rr-labels" : "rr-labels-hidden");
          if (!showLabels) labelsG.style.display = "none";
          const fontFam = "'Inter','Trebuchet MS',sans-serif";
          // Smaller font; labels sit to the LEFT of the box so they don't overlap the zones
          const fontSize = 8, lineH = 11, padX = 5, padY = 3, charW = 4.5;
          const mkPill = (lines, anchorY, bgColor) => {
            const pillW = Math.max(...lines.map((l) => l.length)) * charW + padX * 2;
            const pillH = lines.length * lineH + padY * 2;
            // Place to the right of the drawing; clamp so it doesn't go off-screen right
            const pillX = Math.min(xEnd + 6, svgW - pillW - 2);
            const pillY = anchorY - pillH / 2;
            const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            bg.setAttribute("x", pillX); bg.setAttribute("y", pillY);
            bg.setAttribute("width", pillW); bg.setAttribute("height", pillH);
            bg.setAttribute("rx", "3"); bg.setAttribute("ry", "3");
            bg.setAttribute("fill", bgColor); bg.style.pointerEvents = "none";
            labelsG.appendChild(bg);
            lines.forEach((line, i) => {
              const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
              t.setAttribute("x", pillX + padX);
              t.setAttribute("y", pillY + padY + (i + 1) * lineH - 2);
              t.setAttribute("fill", "#fff"); t.setAttribute("font-size", fontSize);
              t.setAttribute("font-family", fontFam); t.setAttribute("font-weight", "600");
              t.textContent = line; t.style.pointerEvents = "none";
              labelsG.appendChild(t);
            });
          };
          mkPill([`Target: ${drawing.tp.toFixed(2)} (${tpPct}%) ${reward.toFixed(2)}, Amt: ${tpAmt}`], yTPv, "#089981");
          mkPill([`P&L: 0  Qty: ${size}  R:R ${ratio}`], yEntry, "#f23645");
          mkPill([`Stop: ${drawing.sl.toFixed(2)} (${slPct}%) ${risk.toFixed(2)}, Amt: ${slAmt}`], ySLv, "#f23645");
          group.appendChild(labelsG);

          // Handles — in sub-group, CSS controls visibility; hidden entirely in draw mode
          // Handles use actual price coordinates (ySL/yTP) so dragging still tracks real price
          if (!inDrawMode) {
            const handlesG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            handlesG.setAttribute("class", "rr-handles");
            const midY = (Math.min(yEntry, yTPv) + Math.max(yEntry, ySLv)) / 2;
            const midX = (x + xEnd) / 2;
            const mkHandle = (hx, hy, cursor, field, color) => {
              const hw = 8;
              const h = document.createElementNS("http://www.w3.org/2000/svg", "rect");
              h.setAttribute("x", hx - hw / 2); h.setAttribute("y", hy - hw / 2);
              h.setAttribute("width", hw); h.setAttribute("height", hw);
              h.setAttribute("rx", "1"); h.setAttribute("ry", "1");
              h.setAttribute("fill", color);
              h.setAttribute("stroke", "#fff"); h.setAttribute("stroke-width", "1.5");
              h.style.cursor = cursor; h.style.pointerEvents = "all";
              h.addEventListener("mousedown", (e) => {
                e.stopPropagation();
                svgDraggingRef.current = { drawingId: drawing.id, field };
              });
              handlesG.appendChild(h);
            };
            mkHandle(xEnd, midY,  "ew-resize", "endTime", "#1E53E5");
            mkHandle(midX, ySLv, "ns-resize", "sl",      "#f23645"); // visual pos; drag maps back to price
            mkHandle(midX, yTPv, "ns-resize", "tp",      "#089981");
            // Move handle — sits on the entry line in the center of the box
            const moveH = mkMoveHandle(midX, yEntry, drawing, {
              startEntry: drawing.entry, startSl: drawing.sl, startTp: drawing.tp,
              startTime: drawing.time, startEndTime: drawing.endTime,
            });
            handlesG.appendChild(moveH);
            group.appendChild(handlesG);
          }

          svg.appendChild(group);
          return;
        }
      });

      // Dashed preview while placing second point for trendline/ray/rectangle/fibonacci/rr
      const mode = drawingModeRef.current;
      const twoPointModes = ["trendline", "ray", "segment", "rectangle", "fibonacci", "rr"];
      if (twoPointModes.includes(mode) && drawingStateRef.current && previewPointRef.current) {
        const p1 = drawingStateRef.current;
        const ax = ts.timeToCoordinate(snapTime(p1.time));
        const ay = mn.priceToCoordinate(p1.price);
        if (ax != null && ay != null) {
          if (mode === "rectangle") {
            const el = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            const rx = Math.min(ax, previewPointRef.current.x);
            const ry = Math.min(ay, previewPointRef.current.y);
            const rw = Math.abs(previewPointRef.current.x - ax);
            const rh = Math.abs(previewPointRef.current.y - ay);
            el.setAttribute("x", rx); el.setAttribute("y", ry);
            el.setAttribute("width", rw); el.setAttribute("height", rh);
            el.setAttribute("stroke", "#1E53E5");
            el.setAttribute("stroke-width", "1.5");
            el.setAttribute("stroke-dasharray", "5,4");
            el.setAttribute("fill", "rgba(30,83,229,0.04)");
            el.style.pointerEvents = "none";
            svg.appendChild(el);
          } else if (mode === "fibonacci") {
            // Preview fib as two vertical markers connected by a bracket
            const px2 = previewPointRef.current.x;
            const lx1p = Math.min(ax, px2), lx2p = Math.max(ax, px2);
            const previewLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
            const previewPrice2 = mn.coordinateToPrice(previewPointRef.current.y);
            if (previewPrice2 != null) {
              const priceRange = previewPrice2 - p1.price;
              previewLevels.forEach((r) => {
                const fp = p1.price + priceRange * r;
                const fy = mn.priceToCoordinate(fp);
                if (fy == null) return;
                const pl = document.createElementNS("http://www.w3.org/2000/svg", "line");
                pl.setAttribute("x1", lx1p); pl.setAttribute("y1", fy);
                pl.setAttribute("x2", lx2p); pl.setAttribute("y2", fy);
                pl.setAttribute("stroke", "#1E53E5");
                pl.setAttribute("stroke-width", "1");
                pl.setAttribute("stroke-dasharray", "4,3");
                pl.setAttribute("opacity", "0.6");
                pl.style.pointerEvents = "none";
                svg.appendChild(pl);
              });
            }
          } else if (mode === "rr") {
            const slPrice = mn.coordinateToPrice(previewPointRef.current.y);
            if (slPrice != null) {
              const entry = p1.price;
              const risk = Math.abs(entry - slPrice);
              const isLong = slPrice < entry;
              const tpPrice = isLong ? entry + risk * 2 : entry - risk * 2;
              const ySL = previewPointRef.current.y;
              const yTP = mn.priceToCoordinate(tpPrice);
              if (yTP != null) {
                const previewRight = previewPointRef.current.x;
                const mkPreviewRect = (yA, yB, fill) => {
                  const top = Math.min(yA, yB), h = Math.abs(yB - yA);
                  const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                  r.setAttribute("x", ax); r.setAttribute("y", top);
                  r.setAttribute("width", Math.max(previewRight - ax, 1)); r.setAttribute("height", Math.max(h, 1));
                  r.setAttribute("fill", fill); r.setAttribute("stroke-width", "1");
                  r.setAttribute("stroke-dasharray", "5,4"); r.style.pointerEvents = "none";
                  svg.appendChild(r);
                };
                mkPreviewRect(ay, ySL, "rgba(242,54,69,0.12)");
                mkPreviewRect(ay, yTP, "rgba(8,153,129,0.12)");
                // Entry line preview — stops at cursor x
                const eL = document.createElementNS("http://www.w3.org/2000/svg", "line");
                eL.setAttribute("x1", ax); eL.setAttribute("y1", ay);
                eL.setAttribute("x2", previewRight); eL.setAttribute("y2", ay);
                eL.setAttribute("stroke", "rgba(255,255,255,0.5)"); eL.setAttribute("stroke-width", "1");
                eL.setAttribute("stroke-dasharray", "5,4"); eL.style.pointerEvents = "none";
                svg.appendChild(eL);
              }
            }
          } else {
            // Shift snaps the preview to 0° / 45° / 90°
            const rawPrev = previewPointRef.current;
            const prev = shiftKeyRef.current ? (() => {
              const dx = rawPrev.x - ax, dy = rawPrev.y - ay;
              const adx = Math.abs(dx), ady = Math.abs(dy);
              if (adx > ady * 2.414) return { x: rawPrev.x, y: ay };          // horizontal
              if (ady > adx * 2.414) return { x: ax, y: rawPrev.y };           // vertical
              const d = Math.max(adx, ady);                                    // 45-degree
              return { x: ax + (dx >= 0 ? d : -d), y: ay + (dy >= 0 ? d : -d) };
            })() : rawPrev;
            const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
            el.setAttribute("x1", ax); el.setAttribute("y1", ay);
            el.setAttribute("x2", prev.x);
            el.setAttribute("y2", prev.y);
            const previewColor = mode === "ray" ? "#089981" : mode === "segment" ? "#f7a600" : "#1E53E5";
            el.setAttribute("stroke", previewColor);
            el.setAttribute("stroke-width", "1.5");
            el.setAttribute("stroke-dasharray", "5,4");
            el.style.pointerEvents = "none";
            svg.appendChild(el);
          }
          const previewDotColor = mode === "ray" ? "#089981" : mode === "segment" ? "#f7a600" : "#1E53E5";
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", ax); dot.setAttribute("cy", ay); dot.setAttribute("r", "3");
          dot.setAttribute("fill", previewDotColor);
          dot.style.pointerEvents = "none";
          svg.appendChild(dot);
        }
      }

      // ── Position the properties panel at the top-center of the chart (never over the line) ──
      const panel = propsPanelRef.current;
      if (panel && selectedDrawingIdsRef.current.length === 1) {
        const PANEL_TYPES = ["segment", "trendline", "ray", "hline", "vline", "rr", "text", "fibonacci"];
        const selD = userDrawingsRef.current.find((d) => d.id === selectedDrawingIdsRef.current[0]);
        if (selD && PANEL_TYPES.includes(selD.type)) {
          const rect = wrapperRef.current?.getBoundingClientRect();
          if (rect) {
            const pw = panel.offsetWidth || 260;
            const fl = rect.left + rect.width / 2 - pw / 2;
            panel.style.left = `${Math.round(Math.max(8, Math.min(fl, window.innerWidth - pw - 8)))}px`;
            panel.style.top  = `${Math.round(rect.top + 8)}px`;
          }
        }
      }
    };
    updateSvgDrawingsRef.current = updateSvgDrawings;
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      updateSvgDrawings();
      if (!applyingRangeRef.current && onRangeChangeRef.current) {
        try {
          const range = chartRef.current?.timeScale().getVisibleLogicalRange();
          if (range) onRangeChangeRef.current(range);
        } catch {}
      }
    });

    // Click-to-draw or click-to-seek (seek only when bar replay mode is active)
    chart.subscribeClick((param) => {
      const mode = drawingModeRef.current;
      if (mode && mode !== "selector" && mode !== "eraser") {
        if (!param.point || !param.time) return;
        const price = main?.coordinateToPrice(param.point.y);
        if (price == null) return;
        const t = typeof param.time === "number" ? param.time : Number(param.time);

        if (mode === "hline") {
          onDrawingAddRef.current?.({ type: "hline", price, color: "#1E53E5" });
        } else if (mode === "vline") {
          onDrawingAddRef.current?.({ type: "vline", time: t, color: "#f7a600" });
        } else if (mode === "text") {
          const label = window.prompt("Enter label text:", "Label");
          if (!label) return;
          onDrawingAddRef.current?.({ type: "text", time: t, price, label, color: "#f7a600" });
        } else if (mode === "buy_marker" || mode === "sell_marker") {
          onDrawingAddRef.current?.({
            type: mode, time: t, price,
            color: mode === "buy_marker" ? "#089981" : "#f23645",
          });
        } else if (["trendline", "ray", "segment", "rectangle", "fibonacci"].includes(mode)) {
          if (!drawingStateRef.current) {
            drawingStateRef.current = { price, time: t };
          } else {
            const p1 = drawingStateRef.current;
            // Apply Shift angle-snap for line tools (not rectangle/fibonacci)
            let p2Price = price, p2Time = t;
            if (shiftKeyRef.current && ["trendline", "ray", "segment"].includes(mode) && param.point) {
              const p1x = chart.timeScale().timeToCoordinate(p1.time);
              const p1y = main.priceToCoordinate(p1.price);
              if (p1x != null && p1y != null) {
                const dx = param.point.x - p1x, dy = param.point.y - p1y;
                const adx = Math.abs(dx), ady = Math.abs(dy);
                let cx = param.point.x, cy = param.point.y;
                if (adx > ady * 2.414)      { cy = p1y; }                                           // horizontal
                else if (ady > adx * 2.414) { cx = p1x; }                                           // vertical
                else { const d = Math.max(adx, ady); cx = p1x + (dx >= 0 ? d : -d); cy = p1y + (dy >= 0 ? d : -d); } // 45°
                const snapT = chart.timeScale().coordinateToTime?.(cx);
                const snapP = main.coordinateToPrice(cy);
                if (snapT != null) p2Time = Number(snapT);
                if (snapP != null) p2Price = snapP;
              }
            }
            const baseInterval = candleData.length > 1 ? candleData[1].time - candleData[0].time : 3600;
            const newDrawing = {
              type: mode,
              p1: { price: p1.price, time: p1.time },
              p2: { price: p2Price, time: p2Time },
              color: mode === "ray" ? "#089981" : mode === "segment" ? "#f7a600" : "#089981",
              ...(mode === "segment" && {
                candleSpan: Math.max(1, Math.round(Math.abs(p2Time - p1.time) / baseInterval)),
              }),
            };
            onDrawingAddRef.current?.(newDrawing);
            drawingStateRef.current = null;
            // Immediately render the committed drawing without waiting for React state cycle
            userDrawingsRef.current = [...userDrawingsRef.current, { ...newDrawing, id: '__pending__' }];
            updateSvgDrawingsRef.current();
          }
        } else if (mode === "rr") {
          if (!drawingStateRef.current) {
            drawingStateRef.current = { price, time: t };
          } else {
            const p1 = drawingStateRef.current;
            const entry = p1.price;
            const sl = price;
            const risk = Math.abs(entry - sl);
            const isLong = sl < entry;
            const tp = isLong ? entry + risk * 2 : entry - risk * 2;
            const interval = candleData.length > 1 ? candleData[1].time - candleData[0].time : 3600;
            // Right edge = where the user clicked (x-position of second click) + 2 candle buffer
            const endTime = t > p1.time ? t + 2 * interval : p1.time + 5 * interval;
            onDrawingAddRef.current?.({ type: "rr", time: p1.time, entry, sl, tp, isLong, endTime, size: 1 });
            drawingStateRef.current = null;
          }
        }
        return;
      }
      // Cursor / selector mode — clicking the chart background clears selection
      if (!mode || mode === "selector") {
        if (selectedDrawingIdsRef.current.length > 0) {
          onSelectionChangeRef.current?.(null); // null = clear all selection
        }
      }
      // Seek: only when bar-replay mode is explicitly active
      if (!param.time || !onCandleSeekRef.current || !barReplayActiveRef.current) return;
      const t = typeof param.time === "number" ? param.time : Number(param.time);
      let idx = candleData.findIndex((c) => c.time === t);
      if (idx === -1) {
        let minDiff = Infinity;
        candleData.forEach((c, i) => {
          const diff = Math.abs(c.time - t);
          if (diff < minDiff) { minDiff = diff; idx = i; }
        });
      }
      if (idx >= 0) onCandleSeekRef.current(idx);
    });

    // OHLCV crosshair tooltip — direct DOM for 60fps
    chart.subscribeCrosshairMove((param) => {
      // Update drawing preview for all two-point tools
      if (param.point) {
        previewPointRef.current = { x: param.point.x, y: param.point.y };
        if (drawingStateRef.current) updateSvgDrawings();
      }

      // Emit crosshair time for sync (track last emitted to prevent echo on receive)
      if (onCrosshairMoveRef.current) {
        if (!param.time) {
          lastEmittedTimeRef.current = null;
          onCrosshairMoveRef.current(null);
        } else {
          const t = typeof param.time === "number" ? param.time : Number(param.time);
          lastEmittedTimeRef.current = t;
          onCrosshairMoveRef.current(t);
        }
      }

      if (!ohlcBarRef.current) return;
      if (!param.time) { ohlcBarRef.current.style.opacity = "0"; return; }
      const d = param.seriesData?.get(main);
      if (!d) return;
      const isUp = d.close >= d.open;
      const TT = isDarkRef.current ? TV_DARK : TV_LIGHT;
      const color = isUp ? TT.up : TT.down;
      const changePct = (((d.close - d.open) / d.open) * 100).toFixed(2);
      ohlcBarRef.current.style.opacity = "1";
      const fmt = (v) =>
        v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (ohlcOpenRef.current)   ohlcOpenRef.current.textContent  = fmt(d.open);
      if (ohlcHighRef.current)   ohlcHighRef.current.textContent  = fmt(d.high);
      if (ohlcLowRef.current)    ohlcLowRef.current.textContent   = fmt(d.low);
      if (ohlcCloseRef.current)  ohlcCloseRef.current.textContent = fmt(d.close);
      if (ohlcChangeRef.current) {
        ohlcChangeRef.current.textContent = `${isUp ? "+" : ""}${changePct}%`;
        ohlcChangeRef.current.style.color = color;
      }
      [ohlcOpenRef, ohlcHighRef, ohlcLowRef, ohlcCloseRef].forEach((r) => {
        if (r.current) r.current.style.color = color;
      });
    });

    return () => {
      positionLineRefs.current = [];
      previewLineRefs.current = [];
      userHLineRefs.current = [];
      updateSvgDrawingsRef.current = () => {};
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
      lastRef.current = 0;
    };
  }, [candleData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Replay — efficient single-candle append ──
  useEffect(() => {
    const { main, vol, ema20s, ema50s } = seriesRef.current;
    if (!main || !candleData?.length) return;

    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    const target = Math.min(visibleCount || 1, candleData.length);
    const last = lastRef.current;

    if (target < last) {
      // Save viewport before setData (setData can reset the visible range)
      const savedRange = chartRef.current?.timeScale().getVisibleLogicalRange();
      const slice = candleData.slice(0, target);
      main.setData(slice);
      vol.setData(
        slice.map((d) => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? T.volUp : T.volDown,
        }))
      );
      ema20s.setData(ema20Ref.current.slice(0, target).filter(Boolean));
      ema50s.setData(ema50Ref.current.slice(0, target).filter(Boolean));
      lastRef.current = target;
      // Restore viewport so zoom is preserved after setData.
      // If viewport was within data bounds, restore exactly.
      // If viewport extended beyond data end, clamp to end but keep same zoom width.
      if (savedRange) {
        const last = target - 1;
        if (savedRange.to <= last) {
          chartRef.current?.timeScale().setVisibleLogicalRange(savedRange);
        } else {
          const width = savedRange.to - savedRange.from;
          chartRef.current?.timeScale().setVisibleLogicalRange({
            from: last - width,
            to: last,
          });
        }
      }
      return;
    }

    for (let i = last; i < target; i++) {
      const d = candleData[i];
      main.update(d);
      vol.update({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? T.volUp : T.volDown,
      });
      const e20 = ema20Ref.current[i];
      if (e20) ema20s.update(e20);
      const e50 = ema50Ref.current[i];
      if (e50) ema50s.update(e50);
    }
    lastRef.current = target;
    if (isPlaying) {
      // Slide the viewport to keep the latest candle visible without resetting zoom
      const ts = chartRef.current?.timeScale();
      const range = ts?.getVisibleLogicalRange();
      if (range) {
        const latest = target - 1;
        if (latest > range.to - 2) {
          ts.setVisibleLogicalRange({
            from: range.from + (latest - (range.to - 2)),
            to: range.to + (latest - (range.to - 2)),
          });
        }
      }
    }
  }, [visibleCount, candleData, isPlaying]);

  return (
    <div className="relative w-full h-full" style={{ background: isDark ? TV_DARK.bg : TV_LIGHT.bg }}>
      {/* OHLCV info bar — top-left, TradingView style */}
      <div
        ref={ohlcBarRef}
        className="absolute top-2 left-3 z-10 flex items-center gap-3 text-xs pointer-events-none select-none"
        style={{ opacity: 0, color: isDark ? TV_DARK.textMuted : TV_LIGHT.textMuted, fontFamily: "'Trebuchet MS', Roboto, sans-serif" }}
      >
        <span>O&thinsp;<span ref={ohlcOpenRef} style={{ fontWeight: 600 }} /></span>
        <span>H&thinsp;<span ref={ohlcHighRef} style={{ fontWeight: 600 }} /></span>
        <span>L&thinsp;<span ref={ohlcLowRef}  style={{ fontWeight: 600 }} /></span>
        <span>C&thinsp;<span ref={ohlcCloseRef} style={{ fontWeight: 600 }} /></span>
        <span ref={ohlcChangeRef} style={{ fontWeight: 600 }} />
      </div>

      {/* SVG overlay — user drawings. Must have pointer-events:none so it doesn't block
           chart scroll/drag/click. Child elements override this with pointer-events:stroke. */}
      <svg ref={svgRef} className="absolute inset-0" style={{ zIndex: 6, width: "100%", height: "100%", pointerEvents: "none" }} />

      {/* Drawing mode hint — bottom right, only when a tool is active */}
      {drawingMode && drawingMode !== "eraser" && drawingMode !== "selector" && (
        <div
          className="absolute bottom-8 right-3 z-10 text-xs pointer-events-none select-none"
          style={{ color: isDark ? TV_DARK.border : TV_LIGHT.border, fontFamily: "'Trebuchet MS', Roboto, sans-serif" }}
        >
          {drawingMode === "trendline" ? "Click to place first point" :
           drawingMode === "ray" ? "Click to place ray start" :
           drawingMode === "segment" ? (drawingStateRef.current ? "Click to set end point" : "Click to set start point") :
           drawingMode === "rectangle" ? "Click to place first corner" :
           drawingMode === "fibonacci" ? "Click first point of retracement" :
           drawingMode === "text" ? "Click to place text label" :
           drawingMode === "hline" ? "Click to draw horizontal line" :
           drawingMode === "vline" ? "Click to draw vertical line" :
           drawingMode === "buy_marker" ? "Click candle to mark buy entry" :
           drawingMode === "sell_marker" ? "Click candle to mark sell entry" :
           drawingMode === "rr" ? (drawingStateRef.current ? "Click to set stop loss (TP auto 2:1)" : "Click to set entry price") : ""}
        </div>
      )}

      {/* Chart mount point — fills parent */}
      <div ref={wrapperRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Floating properties panel — top-center, position set imperatively by updateSvgDrawings ── */}
      {(() => {
        const sel = panelDrawing;
        if (!sel) return null;
        const PANEL_TYPES = ["segment","trendline","ray","hline","vline","rr","text","fibonacci"];
        if (!PANEL_TYPES.includes(sel.type)) return null;

        const bgPanel  = isDark ? "#1e222d" : "#ffffff";
        const bgSect   = isDark ? "#262b36" : "#f5f7fa";
        const divider  = isDark ? "#2a2e39" : "#e1ecf2";
        const labelC   = isDark ? "#787b86" : "#9ca3af";
        const activeB  = isDark ? "#1a2a4a" : "#e8f0fe";
        const activeC  = "#1E53E5";
        const inactiveC = isDark ? "#787b86" : "#9ca3af";

        const sectStyle = { padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 };
        const headStyle = { fontSize: 9, fontWeight: 600, color: labelC, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 };
        const btnStyle = (active) => ({
          padding: "3px 8px", borderRadius: 4, cursor: "pointer", border: "none",
          background: active ? activeB : "transparent",
          color: active ? activeC : inactiveC,
          fontSize: 11, fontWeight: 600, textAlign: "left",
        });

        // ── R:R panel ──
        if (sel.type === "rr") {
          const curOp     = sel.fillOpacity ?? 0.18;
          const curLabels = sel.showLabels !== false;
          const curDir    = sel.isLong !== false;
          const OPACITIES = [
            { val: 0.08,  label: "Low" },
            { val: 0.18,  label: "Med" },
            { val: 0.32,  label: "High" },
          ];
          return (
            <div
              ref={propsPanelRef}
              style={{
                position: "fixed", zIndex: 9999, background: bgPanel,
                border: `1px solid ${divider}`, borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                display: "flex", flexDirection: "row", overflow: "hidden", userSelect: "none",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Direction */}
              <div style={{ ...sectStyle, background: bgSect }}>
                <div style={headStyle}>Direction</div>
                {[{ val: true, label: "Long" }, { val: false, label: "Short" }].map(({ val, label }) => (
                  <button key={label} onClick={() => onPropertyChange?.(sel.id, { isLong: val })} style={btnStyle(curDir === val)}>{label}</button>
                ))}
              </div>

              <div style={{ width: 1, background: divider }} />

              {/* Fill opacity */}
              <div style={sectStyle}>
                <div style={headStyle}>Fill</div>
                {OPACITIES.map(({ val, label }) => (
                  <button key={label} onClick={() => onPropertyChange?.(sel.id, { fillOpacity: val })} style={btnStyle(Math.abs(curOp - val) < 0.01)}>{label}</button>
                ))}
              </div>

              <div style={{ width: 1, background: divider }} />

              {/* Labels */}
              <div style={sectStyle}>
                <div style={headStyle}>Labels</div>
                {[{ val: true, label: "Show" }, { val: false, label: "Hide" }].map(({ val, label }) => (
                  <button key={label} onClick={() => onPropertyChange?.(sel.id, { showLabels: val })} style={btnStyle(curLabels === val)}>{label}</button>
                ))}
              </div>

              <div style={{ width: 1, background: divider }} />

              {/* Entry line style */}
              <div style={sectStyle}>
                <div style={headStyle}>Entry line</div>
                {[{ val: "solid", label: "——" }, { val: "dashed", label: "- - -" }].map(({ val, label }) => (
                  <button key={val} onClick={() => onPropertyChange?.(sel.id, { lineStyle: val })}
                    style={{ ...btnStyle((sel.lineStyle || "solid") === val), fontSize: val === "solid" ? 13 : 10, letterSpacing: val === "dashed" ? 2 : 0.5 }}
                  >{label}</button>
                ))}
              </div>
            </div>
          );
        }

        // ── Fibonacci panel ──
        if (sel.type === "fibonacci") {
          const FIB_COLORS = [
            "#1E53E5","#089981","#f23645","#f7a600",
            "#9333ea","#ef4444","#787b86","#ffffff",
          ];
          const curColor  = sel.color || null;
          const curStyle  = sel.lineStyle || "solid";
          const curW      = sel.lineWidth || 1;
          const curLabels = sel.showLabels !== false;
          return (
            <div
              ref={propsPanelRef}
              style={{
                position: "fixed", zIndex: 9999, background: bgPanel,
                border: `1px solid ${divider}`, borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                display: "flex", flexDirection: "row", overflow: "hidden", userSelect: "none",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Color — first button resets to multi-colour default */}
              <div style={{ padding: "8px 10px", background: bgSect }}>
                <div style={{ ...headStyle, marginBottom: 6 }}>Color</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 18px)", gap: 4 }}>
                  <button
                    title="Default (multi-color)"
                    onClick={() => onPropertyChange?.(sel.id, { color: null })}
                    style={{
                      gridColumn: "1 / -1", height: 18, borderRadius: 4, cursor: "pointer", padding: 0,
                      background: "linear-gradient(90deg,#787b86 0%,#089981 40%,#f7a600 70%,#787b86 100%)",
                      border: !curColor ? "2.5px solid #60a5fa" : `1.5px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)"}`,
                      outline: "none",
                    }}
                  />
                  {FIB_COLORS.map((c) => (
                    <button key={c} onClick={() => onPropertyChange?.(sel.id, { color: c })} title={c}
                      style={{
                        width: 18, height: 18, borderRadius: 4, background: c, cursor: "pointer",
                        border: curColor === c ? "2.5px solid #60a5fa" : `1.5px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)"}`,
                        outline: "none", padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ width: 1, background: divider }} />

              {/* Inner line style */}
              <div style={sectStyle}>
                <div style={headStyle}>Lines</div>
                {[{ val: "solid", label: "——" }, { val: "dashed", label: "- - -" }].map(({ val, label }) => (
                  <button key={val} onClick={() => onPropertyChange?.(sel.id, { lineStyle: val })}
                    style={{ ...btnStyle(curStyle === val), fontSize: val === "solid" ? 13 : 10, letterSpacing: val === "dashed" ? 2 : 0.5 }}
                  >{label}</button>
                ))}
              </div>

              <div style={{ width: 1, background: divider }} />

              {/* Thickness */}
              <div style={sectStyle}>
                <div style={headStyle}>Weight</div>
                {[1, 2, 3].map((w) => (
                  <button key={w} onClick={() => onPropertyChange?.(sel.id, { lineWidth: w })}
                    style={{ width: 52, padding: "3px 6px", borderRadius: 4, cursor: "pointer", border: "none",
                      background: curW === w ? activeB : "transparent", display: "flex", alignItems: "center" }}
                  >
                    <div style={{ width: 38, height: w * 1.5 + 0.5, background: curW === w ? activeC : inactiveC, borderRadius: 2 }} />
                  </button>
                ))}
              </div>

              <div style={{ width: 1, background: divider }} />

              {/* Labels */}
              <div style={sectStyle}>
                <div style={headStyle}>Labels</div>
                {[{ val: true, label: "Show" }, { val: false, label: "Hide" }].map(({ val, label }) => (
                  <button key={label} onClick={() => onPropertyChange?.(sel.id, { showLabels: val })} style={btnStyle(curLabels === val)}>{label}</button>
                ))}
              </div>
            </div>
          );
        }

        // ── Line panel (segment / trendline / ray / hline / vline) ──
        const COLORS = [
          "#1E53E5","#089981","#f23645","#f7a600",
          "#9333ea","#ef4444","#787b86","#ffffff",
        ];
        const curColor = sel.color || "#1E53E5";
        const curStyle = sel.lineStyle || "solid";
        const curW     = sel.lineWidth || 1;

        return (
          <div
            ref={propsPanelRef}
            style={{
              position: "fixed", zIndex: 9999, background: bgPanel,
              border: `1px solid ${divider}`, borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              display: "flex", flexDirection: "row", overflow: "hidden", userSelect: "none",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Color */}
            <div style={{ padding: "8px 10px", background: bgSect, minWidth: 102 }}>
              <div style={{ ...headStyle, marginBottom: 6 }}>Color</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 18px)", gap: 4 }}>
                {COLORS.map((c) => (
                  <button key={c} onClick={() => onPropertyChange?.(sel.id, { color: c })} title={c}
                    style={{
                      width: 18, height: 18, borderRadius: 4, background: c, cursor: "pointer",
                      border: curColor === c ? "2.5px solid #60a5fa" : `1.5px solid ${isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.16)"}`,
                      outline: "none", padding: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ width: 1, background: divider }} />

            {/* Style */}
            <div style={sectStyle}>
              <div style={headStyle}>Style</div>
              {[{ val: "solid", label: "——" }, { val: "dashed", label: "- - -" }].map(({ val, label }) => (
                <button key={val} onClick={() => onPropertyChange?.(sel.id, { lineStyle: val })}
                  style={{ ...btnStyle(curStyle === val), fontSize: val === "solid" ? 13 : 10, letterSpacing: val === "dashed" ? 2 : 0.5 }}
                >{label}</button>
              ))}
            </div>

            <div style={{ width: 1, background: divider }} />

            {/* Thickness */}
            <div style={sectStyle}>
              <div style={headStyle}>Thickness</div>
              {[1, 2, 3].map((w) => (
                <button key={w} onClick={() => onPropertyChange?.(sel.id, { lineWidth: w })} title={`Weight ${w}`}
                  style={{ width: 52, padding: "3px 6px", borderRadius: 4, cursor: "pointer", border: "none",
                    background: curW === w ? activeB : "transparent", display: "flex", alignItems: "center" }}
                >
                  <div style={{ width: 38, height: w * 1.5 + 0.5, background: curW === w ? activeC : inactiveC, borderRadius: 2 }} />
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default BacktestChart;
