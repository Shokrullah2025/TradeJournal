import { useEffect, useRef } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import { timeToLogical, shiftTimeByBars } from "../timeScaleMath";
import { DEFAULT_FIB_LEVELS, buildSmoothPath, applyChartSettings, trimPrice, measureLabelWidth } from "../chartConfig";
import { getToolDefaults } from "../drawingDefaults";

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
  if (candleData.length < 2) return 150;
  const intervalSec = candleData[1].time - candleData[0].time;
  if (intervalSec <=    60) return 300;  // 1m  → ~5 hours
  if (intervalSec <=   300) return 120;  // 5m  → ~10 hours
  if (intervalSec <=   900) return  80;  // 15m → ~20 hours
  if (intervalSec <=  1800) return  60;  // 30m → ~30 hours
  if (intervalSec <=  3600) return 120;  // 1h  → ~5 days
  if (intervalSec <= 14400) return  84;  // 4h  → ~2 weeks
  return 120;                            // 1d  → ~5 months
}

/**
 * useChartSetup - Manages TradingView Lightweight Charts initialization and setup
 *
 * This hook handles:
 * - Chart creation with createChart()
 * - Main candlestick series, volume series, and EMA series setup
 * - Chart click subscriptions (for drawing tools and bar replay seeking)
 * - Crosshair move events
 * - Visible range changes
 * - Chart data updates (candleData, visibleCount)
 * - Position and order preview line rendering on the chart
 * - Indicator visibility management
 *
 * @param {Object} params - Hook parameters
 * @param {Object} params.wrapperRef - Ref to the chart container DOM element
 * @param {Array} params.candleData - Array of candle data objects
 * @param {Number} params.visibleCount - Number of visible candles for bar replay
 * @param {Array} params.trades - Array of trade objects to display as markers
 * @param {Object} params.indicators - Indicator visibility state
 * @param {Object} params.isDarkRef - Ref containing dark mode state
 * @param {Object} params.indicatorsRef - Ref containing indicators state
 * @param {Object} params.onCandleSeekRef - Ref to candle seek callback
 * @param {Object} params.barReplayActiveRef - Ref to bar replay active state
 * @param {Object} params.drawingModeRef - Ref to current drawing mode
 * @param {Object} params.drawingStateRef - Ref to drawing state (first point)
 * @param {Object} params.previewPointRef - Ref to preview point position
 * @param {Object} params.shiftKeyRef - Ref to shift key state
 * @param {Object} params.onDrawingAddRef - Ref to drawing add callback
 * @param {Object} params.onDrawingDeleteRef - Ref to drawing delete callback
 * @param {Object} params.onSelectionChangeRef - Ref to selection change callback
 * @param {Object} params.selectedDrawingIdsRef - Ref to selected drawing IDs
 * @param {Object} params.userDrawingsRef - Ref to user drawings array
 * @param {Object} params.updateSvgDrawingsRef - Ref to SVG update function
 * @param {Object} params.svgRef - Ref to SVG overlay element
 * @param {Object} params.svgDraggingRef - Ref to SVG dragging state
 * @param {Object} params.wasDraggedRef - Ref to was-dragged flag
 * @param {Object} params.candleDataRef - Ref to candle data
 * @param {Object} params.propsPanelRef - Ref to properties panel element
 * @param {Object} params.onCrosshairMoveRef - Ref to crosshair move callback
 * @param {Object} params.lastEmittedTimeRef - Ref to last emitted time
 * @param {Object} params.ohlcBarRef - Ref to OHLC bar element
 * @param {Object} params.ohlcOpenRef - Ref to OHLC open element
 * @param {Object} params.ohlcHighRef - Ref to OHLC high element
 * @param {Object} params.ohlcLowRef - Ref to OHLC low element
 * @param {Object} params.ohlcCloseRef - Ref to OHLC close element
 * @param {Object} params.ohlcChangeRef - Ref to OHLC change element
 * @param {Object} params.onRangeChangeRef - Ref to range change callback
 * @param {Object} params.applyingRangeRef - Ref to applying range flag
 * @param {Object} params.onRegisterRangeSetterRef - Ref to register range setter callback
 * @param {Object} params.onDrawingUpdateRef - Ref to drawing update callback
 * @param {Object} params.brushSvgRef - Ref to brush SVG element
 *
 * @returns {Object} - { chartRef, seriesRef, lastRef, windowRef, ema20Ref, ema50Ref }
 */
export function useChartSetup({
  wrapperRef,
  candleData,
  visibleCount,
  trades,
  indicators,
  chartRef,
  seriesRef,
  ema20Ref,
  ema50Ref,
  lastRef,
  windowRef,
  lockedRef,
  isDarkRef,
  indicatorsRef,
  onCandleSeekRef,
  barReplayActiveRef,
  replayCursorXRef,
  onBarReplayDeactivateRef,
  drawingModeRef,
  drawingStateRef,
  previewPointRef,
  shiftKeyRef,
  onDrawingAddRef,
  onDrawingDeleteRef,
  onSelectionChangeRef,
  onSelectManyRef,
  selectedDrawingIdsRef,
  drawTradeMarkersRef,
  userDrawingsRef,
  updateSvgDrawingsRef,
  svgRef,
  svgDraggingRef,
  wasDraggedRef,
  candleDataRef,
  propsPanelRef,
  onCrosshairMoveRef,
  lastEmittedTimeRef,
  applyingCrosshairRef,
  ohlcBarRef,
  ohlcOpenRef,
  ohlcHighRef,
  ohlcLowRef,
  ohlcCloseRef,
  ohlcChangeRef,
  onRangeChangeRef,
  applyingRangeRef,
  onRegisterRangeSetterRef,
  onDrawingUpdateRef,
  brushSvgRef,
  chartSettingsRef,
  onEditTextRef,
  inlineEditIdRef,
}) {

  // ── Chart creation — runs only when candleData changes (new session / new timeframe) ──
  useEffect(() => {
    if (!wrapperRef.current || !candleData?.length) return;

    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    const isLocked = !!lockedRef?.current;

    ema20Ref.current = calcEMAIndexed(candleData, 20);
    ema50Ref.current = calcEMAIndexed(candleData, 50);

    const chart = createChart(wrapperRef.current, {
      autoSize: true,
      // Trim trailing .00 from axis + crosshair price labels
      localization: { priceFormatter: trimPrice },
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
        rightOffset: isLocked ? 0 : 3,
        // Locked viewer: clamp scrolling to the loaded window — no empty past/future
        fixLeftEdge: isLocked,
        fixRightEdge: isLocked,
        lockVisibleTimeRangeOnResize: isLocked,
        textColor: T.textMuted,
      },
      // Locked viewer (history replay): freeze horizontal pan + time zoom so the
      // window and candle width stay static, but allow dragging the price axis to
      // scale candle height up/down.
      handleScroll: isLocked ? false : { mouseWheel: true, pressedMouseMove: true },
      handleScale: isLocked
        ? { axisPressedMouseMove: { time: false, price: true }, mouseWheel: false, pinch: false }
        : { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
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

    // Whitespace series — extends the time scale past the last candle so the
    // empty right-hand area gets grid columns, time labels, and real time
    // coordinates. Without it, timeToCoordinate() returns null right of the
    // last bar and drawings (R:R, segments) fall back to full-width stretch.
    // Locked viewer shows a static window with no future room, so it can clamp to
    // the last candle (fixRightEdge). The live chart needs future bars so drawings
    // and replay have room to the right.
    const FUTURE_BARS = isLocked ? 0 : 500;
    const wsInterval =
      candleData.length > 1 ? candleData[1].time - candleData[0].time : 3600;
    const wsLastTime = candleData[candleData.length - 1].time;
    const whitespace = chart.addSeries(LineSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });
    whitespace.setData([
      ...candleData.map((d) => ({ time: d.time })),
      ...Array.from({ length: FUTURE_BARS }, (_, i) => ({
        time: wsLastTime + (i + 1) * wsInterval,
      })),
    ]);

    seriesRef.current = { main, vol, ema20s, ema50s };

    // A fresh chart starts from theme defaults — layer the user's saved
    // appearance settings (candle colors, background) on top immediately
    applyChartSettings(chart, main, chartSettingsRef?.current, isDarkRef.current);

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

    // Zoom to show an appropriate time window instead of squishing all candles.
    // Locked viewer frames the entire sliced window (no replay cursor, no future
    // whitespace) so it sits static on exactly where the user traded.
    const win = defaultWindow(candleData);
    windowRef.current = win;
    if (isLocked) {
      // Fit every loaded candle into the viewport (no whitespace exists in locked
      // mode), so the window is full and there is nothing to scroll to.
      chart.timeScale().fitContent();
    } else {
      chart.timeScale().setVisibleLogicalRange({
        from: count - 1 - win,
        to:   count - 1 + 3, // 3 bars right padding — keeps the last candle near the right edge
      });
    }

    // Trade markers — v5 uses createSeriesMarkers(series, markers).
    // Only journal-style trades carry entryDate/exitDate; live backtest trades
    // (timestamp/exitTime) are drawn by BacktestChart's own markers effect.
    if (trades.length > 0 && trades.some((t) => t.entryDate && t.exitDate)) {
      const markers = trades
        .filter((trade) => trade.entryDate && trade.exitDate)
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

    // Draw live-trade (timestamp/exitTime) entry/exit arrows now that the series
    // exists. BacktestChart's own markers effect runs before this chart is
    // created, so on a static chart it would otherwise never paint them.
    drawTradeMarkersRef?.current?.();

    // Tracks the last click on a text label so two quick clicks open the inline
    // editor. A native dblclick listener is unreliable here: selecting on the
    // first click rebuilds the SVG, so the second click lands on a fresh node.
    // This lives in the effect scope so it survives those rebuilds.
    let lastTextClick = null; // { id, time }

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

      // Helper: candle interval for time<->logical conversion
      const interval = candleDataRef.current?.length > 1
        ? candleDataRef.current[1].time - candleDataRef.current[0].time : 3600;

      // Convert a timestamp to an SVG x coordinate, including future times past the
      // last candle. ts.timeToCoordinate() only works for existing bar timestamps;
      // anything else (times inside session gaps, beyond the whitespace series)
      // converts through a gap-aware logical index — never linear interval math,
      // which misplaces coordinates near weekends/session breaks.
      const timeToCoord = (t) => {
        const direct = ts.timeToCoordinate(t);
        if (direct != null) return direct;
        const data = candleDataRef.current;
        if (!data?.length) return null;
        const logical = timeToLogical(data, t);
        const fromLogical = ts.logicalToCoordinate(logical);
        if (fromLogical != null) return fromLogical;
        // Off-screen: extrapolate using bar width so the coordinate is finite
        const range = ts.getVisibleLogicalRange();
        if (!range) return null;
        const barWidth = svgW / (range.to - range.from);
        return (logical - range.from) * barWidth;
      };

      // Attaches grab cursor + move drag to any SVG element
      const attachMoveDrag = (el, drawing, extraState) => {
        el.style.cursor = "pointer";
        el.addEventListener("mousedown", (e) => {
          if (drawingModeRef.current) return;
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
      };

      // Opens the inline editor positioned exactly over a text label's box.
      // Reads geometry from the box's SVG attributes (not getBoundingClientRect,
      // which can be {0,0} on a node React just detached) + the stable SVG root.
      const openTextEditor = (boxEl, drawing) => {
        const svgRect = boxEl.ownerSVGElement?.getBoundingClientRect();
        if (!svgRect) return;
        const bx = parseFloat(boxEl.getAttribute("x")) || 0;
        const by = parseFloat(boxEl.getAttribute("y")) || 0;
        const bh = parseFloat(boxEl.getAttribute("height")) || 24;
        onEditTextRef?.current?.(drawing.id, {
          left: svgRect.left + bx, top: svgRect.top + by, height: bh,
        });
      };

      // Helper: attach delete/select click to any SVG element
      const attachInteraction = (el, drawing) => {
        el.addEventListener("click", (e) => {
          if (wasDraggedRef.current) { wasDraggedRef.current = false; return; }
          e.stopPropagation();
          if (drawingModeRef.current === "eraser") {
            onDrawingDeleteRef.current?.(drawing.id);
          } else if (!drawingModeRef.current || drawingModeRef.current === "selector") {
            // Two quick clicks on a text label open the inline editor. We detect
            // this by timing instead of a native dblclick because the first
            // click selects the label and rebuilds the SVG, so the second click
            // lands on a brand-new node that never receives a dblclick.
            if (drawing.type === "text") {
              const now = Date.now();
              if (lastTextClick && lastTextClick.id === drawing.id && now - lastTextClick.time < 400) {
                lastTextClick = null;
                openTextEditor(el, drawing);
                return;
              }
              lastTextClick = { id: drawing.id, time: now };
            }
            onSelectionChangeRef.current?.(drawing.id, e.ctrlKey || e.metaKey || e.shiftKey);
          }
        });
        el.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); });
      };
      const isSelected = (id) => selectedDrawingIdsRef.current.includes(id);
      const selStroke = (base) => isSelected(base) ? "#60a5fa" : base;
      const selWidth = (id) => isSelected(id) ? "2.5" : "1.5";
      const applyGlow = () => {}; // no glow — selection shown via stroke width only

      // Resize handle — interactive circle at an endpoint, visible when drawing is selected.
      // `extra` merges additional drag state (e.g. pointIndex for multi-point paths).
      const addResizeHandle = (hx, hy, drawingId, field, color, extra) => {
        const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        h.setAttribute("cx", hx); h.setAttribute("cy", hy); h.setAttribute("r", "5");
        h.setAttribute("fill", isDarkRef.current ? "#131722" : "#ffffff");
        h.setAttribute("stroke", color || "#1E53E5");
        h.setAttribute("stroke-width", "2");
        h.style.cursor = "crosshair";
        h.style.pointerEvents = "all";
        h.addEventListener("mousedown", (e) => {
          e.stopPropagation();
          svgDraggingRef.current = { drawingId, field, ...(extra || {}) };
        });
        svg.appendChild(h);
      };

      userDrawingsRef.current.forEach((drawing) => {
        // Freehand brush stroke — smoothed curve through the captured points
        if (drawing.type === "freehand") {
          if (!drawing.points?.length || drawing.points.length < 2) return;
          const firstPt = drawing.points[0];
          const isPixelFormat = firstPt && "xFrac" in firstPt;
          const pts = isPixelFormat
            // New format: screen-relative fractions — render directly as pixels
            ? drawing.points.map(({ xFrac, yFrac }) => ({ x: xFrac * svgW, y: yFrac * svgH }))
            // Legacy format: chart logical/price coordinates
            : (() => {
                const fhRange = ts.getVisibleLogicalRange();
                const fhBarW = fhRange ? svgW / (fhRange.to - fhRange.from) : null;
                return drawing.points.map(({ logicalIdx, price }) => {
                  const px = ts.logicalToCoordinate(logicalIdx)
                    ?? (fhBarW != null ? (logicalIdx - fhRange.from) * fhBarW : null);
                  const py = mn.priceToCoordinate(price);
                  return px != null && py != null ? { x: px, y: py } : null;
                });
              })().filter(Boolean);
          if (pts.length < 2) return;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", buildSmoothPath(pts));
          path.setAttribute("stroke", isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#1E53E5"));
          path.setAttribute("stroke-width", isSelected(drawing.id) ? String((drawing.lineWidth || 2) + 1) : String(drawing.lineWidth || 2));
          path.setAttribute("fill", "none");
          path.setAttribute("stroke-linecap", "round");
          path.setAttribute("stroke-linejoin", "round");
          path.style.pointerEvents = "stroke";
          attachInteraction(path, drawing);
          attachMoveDrag(path, drawing, { startPoints: drawing.points.map(p => ({ ...p })) });
          svg.appendChild(path);
          return;
        }

        // Vertical line
        if (drawing.type === "vline") {
          const x = timeToCoord(drawing.time);
          if (x == null) return;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", x); el.setAttribute("y1", 0);
          el.setAttribute("x2", x); el.setAttribute("y2", svgH);
          el.setAttribute("stroke", selStroke(drawing.color || "#f7a600"));
          const vBaseW = drawing.lineWidth || 1;
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(vBaseW + 1) : String(vBaseW));
          el.setAttribute("stroke-dasharray", drawing.lineStyle === "solid" ? "" : "4,3");
          el.style.pointerEvents = "stroke";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          attachMoveDrag(el, drawing, { startTime: drawing.time });
          svg.appendChild(el);
          const vHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          vHit.setAttribute("x1", x); vHit.setAttribute("y1", 0);
          vHit.setAttribute("x2", x); vHit.setAttribute("y2", svgH);
          vHit.setAttribute("stroke", "transparent"); vHit.setAttribute("stroke-width", "14");
          vHit.style.pointerEvents = "stroke";
          attachInteraction(vHit, drawing);
          attachMoveDrag(vHit, drawing, { startTime: drawing.time });
          svg.appendChild(vHit);
          return;
        }

        // Horizontal line — extends full width with endpoint arrows
        if (drawing.type === "hline") {
          const y = mn.priceToCoordinate(drawing.price);
          if (y == null) return;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", 0); el.setAttribute("y1", y);
          el.setAttribute("x2", svgW); el.setAttribute("y2", y);
          el.setAttribute("stroke", selStroke(drawing.color || "#1E53E5"));
          const hBaseW = drawing.lineWidth || 1;
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(hBaseW + 1) : String(hBaseW));
          el.setAttribute("stroke-dasharray", drawing.lineStyle === "dashed" ? "6,4" : "");
          el.style.pointerEvents = "stroke";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          attachMoveDrag(el, drawing, { startPrice: drawing.price });
          svg.appendChild(el);
          const hHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          hHit.setAttribute("x1", 0); hHit.setAttribute("y1", y);
          hHit.setAttribute("x2", svgW); hHit.setAttribute("y2", y);
          hHit.setAttribute("stroke", "transparent"); hHit.setAttribute("stroke-width", "14");
          hHit.style.pointerEvents = "stroke";
          attachInteraction(hHit, drawing);
          attachMoveDrag(hHit, drawing, { startPrice: drawing.price });
          svg.appendChild(hHit);
          return;
        }

        // Text label — rendered as a box (rect + text). The rect is the event
        // target so the full visible area is clickable/draggable.
        if (drawing.type === "text") {
          // While this label is being edited inline, the dashed input overlays
          // it — skip the SVG box so its solid border doesn't double up.
          if (inlineEditIdRef?.current === drawing.id) return;
          const x = timeToCoord(drawing.time);
          const y = mn.priceToCoordinate(drawing.price);
          if (x == null || y == null) return;
          // Hide the label once its anchor time is scrolled outside the visible
          // range. timeToCoord's logical fallback can otherwise clamp an
          // off-screen time to the chart edge, piling every distant label on the
          // left. Render each label only where it actually sits.
          const textVisRange = ts.getVisibleLogicalRange();
          if (textVisRange) {
            const textLogical = timeToLogical(candleDataRef.current, drawing.time);
            if (textLogical != null &&
                (textLogical < textVisRange.from - 1 || textLogical > textVisRange.to + 1)) return;
          }
          const label = drawing.label || "Label";
          const fs = drawing.fontSize || 14;
          const color = isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#f7a600");
          // Box hugs the measured text (6px padding each side) — no dead space.
          const textW = Math.max(measureLabelWidth(label, fs) + 12, 30);
          const textH = fs + 10;
          const isDark = isDarkRef.current;

          // Group for glow — events live on the rect, not the group.
          // Tagged with the drawing id so inline editing can hide just this box
          // (via a display toggle) without rebuilding the whole SVG layer.
          const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
          g.setAttribute("data-text-id", String(drawing.id));
          g.style.userSelect = "none";
          applyGlow(g, drawing.id);

          // Rect: the actual hit area + visual border.
          // MUST set pointerEvents "all" — the SVG root has pointerEvents:none, so
          // children only receive events when they explicitly opt in.
          const box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          box.setAttribute("x", x); box.setAttribute("y", y);
          box.setAttribute("width", textW); box.setAttribute("height", textH);
          box.setAttribute("rx", "3"); box.setAttribute("ry", "3");
          box.setAttribute("fill", isDark ? "rgba(19,23,34,0.88)" : "rgba(255,255,248,0.92)");
          box.setAttribute("stroke", color);
          box.setAttribute("stroke-width", isSelected(drawing.id) ? "2" : "1");
          box.style.pointerEvents = "all";
          g.appendChild(box);

          const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
          textEl.setAttribute("x", x + 6); textEl.setAttribute("y", y + fs + 2);
          textEl.setAttribute("fill", color);
          textEl.setAttribute("font-size", String(fs));
          textEl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
          textEl.setAttribute("font-weight", "600");
          textEl.style.pointerEvents = "none"; // text passes clicks through to rect
          textEl.style.userSelect = "none";
          textEl.textContent = label;
          g.appendChild(textEl);
          svg.appendChild(g);

          const dragState = { startP1: { time: drawing.time, price: drawing.price }, startP2: { time: drawing.time, price: drawing.price } };
          attachInteraction(box, drawing);
          attachMoveDrag(box, drawing, dragState);
          // Native dblclick fallback (fires when selection didn't rebuild the node)
          box.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            e.preventDefault();
            openTextEditor(box, drawing);
          });
          return;
        }

        // Rectangle
        if (drawing.type === "rectangle") {
          const x1 = timeToCoord(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = timeToCoord(drawing.p2.time);
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
          el.style.pointerEvents = "all";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          el.addEventListener("dblclick", (e) => {
            e.stopPropagation();
            e.preventDefault();
            onEditTextRef?.current?.(drawing.id, el.getBoundingClientRect());
          });
          svg.appendChild(el);
          // Resize handles at diagonal corners when selected
          if (isSelected(drawing.id)) {
            addResizeHandle(x1, y1, drawing.id, "p1_resize", drawing.color || "#1E53E5");
            addResizeHandle(x2, y2, drawing.id, "p2_resize", drawing.color || "#1E53E5");
          }
          // Text label inside the box
          if (drawing.label) {
            const fs = drawing.fontSize || 13;
            const pos = drawing.labelPos || "top-left";
            let tx, ty, anchor;
            if (pos === "top-center") {
              tx = rx + rw / 2; ty = ry + fs + 4; anchor = "middle";
            } else if (pos === "center") {
              tx = rx + rw / 2; ty = ry + rh / 2 + fs * 0.35; anchor = "middle";
            } else if (pos === "bottom-left") {
              tx = rx + 5; ty = ry + rh - 5; anchor = "start";
            } else {
              tx = rx + 5; ty = ry + fs + 3; anchor = "start"; // top-left
            }
            const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            lbl.setAttribute("x", tx); lbl.setAttribute("y", ty);
            lbl.setAttribute("text-anchor", anchor);
            lbl.setAttribute("fill", isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#1E53E5"));
            lbl.setAttribute("font-size", String(fs));
            lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
            lbl.setAttribute("font-weight", "600");
            lbl.style.pointerEvents = "none";
            lbl.textContent = drawing.label;
            svg.appendChild(lbl);
          }
          return;
        }

        // Segment — fixed-length line exactly from p1 to p2
        if (drawing.type === "segment") {
          const x1 = timeToCoord(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = timeToCoord(drawing.p2.time);
          const y2 = mn.priceToCoordinate(drawing.p2.price);
          if (x1 == null || y1 == null || x2 == null || y2 == null) return;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", x1); el.setAttribute("y1", y1);
          el.setAttribute("x2", x2); el.setAttribute("y2", y2);
          el.setAttribute("stroke", selStroke(drawing.color || "#f7a600"));
          const segBaseW = drawing.lineWidth || 1.5;
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(segBaseW + 1) : String(segBaseW));
          if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
          el.style.pointerEvents = "stroke";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          svg.appendChild(el);
          const segHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          segHit.setAttribute("x1", x1); segHit.setAttribute("y1", y1);
          segHit.setAttribute("x2", x2); segHit.setAttribute("y2", y2);
          segHit.setAttribute("stroke", "transparent"); segHit.setAttribute("stroke-width", "14");
          segHit.style.pointerEvents = "stroke";
          attachInteraction(segHit, drawing);
          attachMoveDrag(segHit, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          svg.appendChild(segHit);
          if (isSelected(drawing.id)) {
            addResizeHandle(x1, y1, drawing.id, "p1_resize", drawing.color || "#f7a600");
            addResizeHandle(x2, y2, drawing.id, "p2_resize", drawing.color || "#f7a600");
          } else {
            [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
              const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
              dot.setAttribute("fill", selStroke(drawing.color || "#f7a600"));
              dot.style.pointerEvents = "none";
              svg.appendChild(dot);
            });
          }
          // Text label on the segment
          if (drawing.label) {
            const fs = drawing.fontSize || 11;
            const pos = drawing.labelPos || "above";
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            let tx, ty, anchor;
            if (pos === "start") {
              tx = x1; ty = y1 - 5; anchor = x1 <= x2 ? "start" : "end";
            } else if (pos === "end") {
              tx = x2; ty = y2 - 5; anchor = x2 >= x1 ? "end" : "start";
            } else if (pos === "middle") {
              tx = mx; ty = my - 3; anchor = "middle";
            } else {
              // "above" — perpendicular offset above the midpoint
              tx = mx; ty = my - (fs + 3); anchor = "middle";
            }
            const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            lbl.setAttribute("x", tx); lbl.setAttribute("y", ty);
            lbl.setAttribute("text-anchor", anchor);
            lbl.setAttribute("fill", isSelected(drawing.id) ? "#60a5fa" : (drawing.color || "#f7a600"));
            lbl.setAttribute("font-size", String(fs));
            lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
            lbl.setAttribute("font-weight", "600");
            lbl.style.pointerEvents = "none";
            lbl.textContent = drawing.label;
            svg.appendChild(lbl);
          }
          return;
        }

        // Ray — extends right from p1 through p2 (limited on left, unlimited on right)
        if (drawing.type === "ray") {
          const x1 = timeToCoord(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = timeToCoord(drawing.p2.time);
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
          el.style.pointerEvents = "stroke";
          attachInteraction(el, drawing);
          attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          svg.appendChild(el);
          const rayHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          rayHit.setAttribute("x1", x1); rayHit.setAttribute("y1", y1);
          rayHit.setAttribute("x2", lx2); rayHit.setAttribute("y2", ly2);
          rayHit.setAttribute("stroke", "transparent"); rayHit.setAttribute("stroke-width", "14");
          rayHit.style.pointerEvents = "stroke";
          attachInteraction(rayHit, drawing);
          attachMoveDrag(rayHit, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          svg.appendChild(rayHit);

          if (isSelected(drawing.id)) {
            // Resize handles: start point (p1) and direction point (p2)
            addResizeHandle(x1, y1, drawing.id, "p1_resize", drawing.color || "#089981");
            addResizeHandle(x2, y2, drawing.id, "p2_resize", drawing.color || "#089981");
          } else {
            // Decorative dot at start point only
            const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            dot.setAttribute("cx", x1); dot.setAttribute("cy", y1); dot.setAttribute("r", "3");
            dot.setAttribute("fill", selStroke(drawing.color || "#089981"));
            dot.style.pointerEvents = "none";
            svg.appendChild(dot);
          }

          // Unlimited endpoint (arrow) at the right edge pointing right
          if (lx2 >= svgW - 5) {
            const endpointColor = selStroke(drawing.color || "#089981");
            const arrowSize = 5;
            const angle = Math.atan2(dy, dx);
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const a1x = lx2 + Math.cos(angle - Math.PI / 6) * arrowSize * 1.5;
            const a1y = ly2 + Math.sin(angle - Math.PI / 6) * arrowSize * 1.5;
            const a2x = lx2 + Math.cos(angle + Math.PI / 6) * arrowSize * 1.5;
            const a2y = ly2 + Math.sin(angle + Math.PI / 6) * arrowSize * 1.5;
            arrow.setAttribute("points", `${lx2},${ly2} ${a1x},${a1y} ${a2x},${a2y}`);
            arrow.setAttribute("fill", endpointColor);
            arrow.style.pointerEvents = "none";
            svg.appendChild(arrow);
          }

          return;
        }

        // Trend line — multi-point path with an arrow at the tip. Each click
        // added a vertex; legacy drawings with only {p1, p2} still render.
        if (drawing.type === "trendline") {
          const rawPts = drawing.points?.length
            ? drawing.points
            : drawing.p1 && drawing.p2 ? [drawing.p1, drawing.p2] : null;
          if (!rawPts || rawPts.length < 2) return;
          const pts = rawPts
            .map((p) => {
              const px = timeToCoord(p.time);
              const py = mn.priceToCoordinate(p.price);
              return px != null && py != null ? { x: px, y: py } : null;
            });
          if (pts.some((p) => p == null)) return;
          const tlColor = drawing.color || "#1E53E5";
          const trendBaseW = drawing.lineWidth || 1.5;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
          el.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
          el.setAttribute("fill", "none");
          el.setAttribute("stroke", selStroke(tlColor));
          el.setAttribute("stroke-width", isSelected(drawing.id) ? String(trendBaseW + 1) : String(trendBaseW));
          if (drawing.lineStyle === "dashed") el.setAttribute("stroke-dasharray", "6,4");
          el.setAttribute("stroke-linejoin", "round");
          el.style.pointerEvents = "stroke";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          const tlDragState = drawing.points?.length
            ? { startTPoints: drawing.points.map((p) => ({ ...p })) }
            : { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } };
          attachMoveDrag(el, drawing, tlDragState);
          svg.appendChild(el);
          const tlHit = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
          tlHit.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
          tlHit.setAttribute("fill", "none");
          tlHit.setAttribute("stroke", "transparent"); tlHit.setAttribute("stroke-width", "14");
          tlHit.style.pointerEvents = "stroke";
          attachInteraction(tlHit, drawing);
          attachMoveDrag(tlHit, drawing, tlDragState);
          svg.appendChild(tlHit);

          // Arrow tip at the final point, oriented along the last segment
          const tip = pts[pts.length - 1];
          const beforeTip = pts[pts.length - 2];
          const tipAngle = Math.atan2(tip.y - beforeTip.y, tip.x - beforeTip.x);
          const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          const aLen = 10;
          const a1x = tip.x - Math.cos(tipAngle - Math.PI / 7) * aLen;
          const a1y = tip.y - Math.sin(tipAngle - Math.PI / 7) * aLen;
          const a2x = tip.x - Math.cos(tipAngle + Math.PI / 7) * aLen;
          const a2y = tip.y - Math.sin(tipAngle + Math.PI / 7) * aLen;
          arrow.setAttribute("points", `${tip.x},${tip.y} ${a1x},${a1y} ${a2x},${a2y}`);
          arrow.setAttribute("fill", selStroke(tlColor));
          arrow.style.pointerEvents = "none";
          svg.appendChild(arrow);

          if (isSelected(drawing.id)) {
            if (drawing.points?.length) {
              pts.forEach((p, i) =>
                addResizeHandle(p.x, p.y, drawing.id, "point_resize", tlColor, { pointIndex: i }));
            } else {
              addResizeHandle(pts[0].x, pts[0].y, drawing.id, "p1_resize", tlColor);
              addResizeHandle(pts[1].x, pts[1].y, drawing.id, "p2_resize", tlColor);
            }
          } else {
            // Skip the last point — the arrow head already marks the tip
            pts.forEach(({ x: cx, y: cy }, i) => {
              if (i === pts.length - 1) return;
              const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
              dot.setAttribute("fill", selStroke(tlColor));
              dot.style.pointerEvents = "none";
              svg.appendChild(dot);
            });
          }
          return;
        }

        // Extended line — extends across full chart width (unlimited on both ends)
        if (drawing.type === "extline") {
          const x1 = timeToCoord(drawing.p1.time);
          const y1 = mn.priceToCoordinate(drawing.p1.price);
          const x2 = timeToCoord(drawing.p2.time);
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
          el.style.pointerEvents = "stroke";
          applyGlow(el, drawing.id);
          attachInteraction(el, drawing);
          attachMoveDrag(el, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          svg.appendChild(el);
          const extHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
          extHit.setAttribute("x1", lx1); extHit.setAttribute("y1", ly1);
          extHit.setAttribute("x2", lx2); extHit.setAttribute("y2", ly2);
          extHit.setAttribute("stroke", "transparent"); extHit.setAttribute("stroke-width", "14");
          extHit.style.pointerEvents = "stroke";
          attachInteraction(extHit, drawing);
          attachMoveDrag(extHit, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
          svg.appendChild(extHit);

          // Control points / resize handles at the two clicked locations
          if (isSelected(drawing.id)) {
            addResizeHandle(x1, y1, drawing.id, "p1_resize", drawing.color || "#1E53E5");
            addResizeHandle(x2, y2, drawing.id, "p2_resize", drawing.color || "#1E53E5");
          } else {
            [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
              const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
              dot.setAttribute("fill", selStroke(drawing.color || "#1E53E5"));
              dot.style.pointerEvents = "none";
              svg.appendChild(dot);
            });
          }

          // Add directional arrows at chart edges to indicate unlimited extension
          const endpointColor = selStroke(drawing.color || "#1E53E5");
          const arrowSize = 5;

          // Calculate arrow direction from slope
          const angle = Math.atan2(dy, dx);

          // Left arrow (pointing in the direction of the line extension)
          if (lx1 <= 5) {
            const arrowAngle = angle + Math.PI; // pointing left along the line
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const ax = lx1 + Math.cos(arrowAngle) * arrowSize;
            const ay = ly1 + Math.sin(arrowAngle) * arrowSize;
            const a1x = lx1 + Math.cos(arrowAngle - Math.PI / 6) * arrowSize * 1.5;
            const a1y = ly1 + Math.sin(arrowAngle - Math.PI / 6) * arrowSize * 1.5;
            const a2x = lx1 + Math.cos(arrowAngle + Math.PI / 6) * arrowSize * 1.5;
            const a2y = ly1 + Math.sin(arrowAngle + Math.PI / 6) * arrowSize * 1.5;
            arrow.setAttribute("points", `${lx1},${ly1} ${a1x},${a1y} ${a2x},${a2y}`);
            arrow.setAttribute("fill", endpointColor);
            arrow.style.pointerEvents = "none";
            svg.appendChild(arrow);
          }

          // Right arrow (pointing in the direction of the line extension)
          if (lx2 >= svgW - 5) {
            const arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const ax = lx2 + Math.cos(angle) * arrowSize;
            const ay = ly2 + Math.sin(angle) * arrowSize;
            const a1x = lx2 + Math.cos(angle - Math.PI / 6) * arrowSize * 1.5;
            const a1y = ly2 + Math.sin(angle - Math.PI / 6) * arrowSize * 1.5;
            const a2x = lx2 + Math.cos(angle + Math.PI / 6) * arrowSize * 1.5;
            const a2y = ly2 + Math.sin(angle + Math.PI / 6) * arrowSize * 1.5;
            arrow.setAttribute("points", `${lx2},${ly2} ${a1x},${a1y} ${a2x},${a2y}`);
            arrow.setAttribute("fill", endpointColor);
            arrow.style.pointerEvents = "none";
            svg.appendChild(arrow);
          }

          return;
        }

        // Fibonacci retracement
        if (drawing.type === "fibonacci") {
          const x1 = timeToCoord(drawing.p1.time);
          const x2 = timeToCoord(drawing.p2.time);
          if (x1 == null || x2 == null) return;
          const lx1 = Math.min(x1, x2), lx2 = Math.max(x1, x2);
          const priceRange = drawing.p2.price - drawing.p1.price;
          const fibLevels = (drawing.levels?.length ? drawing.levels : DEFAULT_FIB_LEVELS)
            .filter((l) => l.visible !== false);
          const fibW = String(drawing.lineWidth || 1);
          const fibShowLabels = drawing.showLabels !== false;
          const selected = isSelected(drawing.id);
          // Selection must not recolor the levels — only the corner handles appear
          fibLevels.forEach(({ r, color: lvlColor }) => {
            // drawing.color overrides all levels; per-level color otherwise
            const color = drawing.color || lvlColor;
            const fibPrice = drawing.p1.price + priceRange * r;
            const fy = mn.priceToCoordinate(fibPrice);
            if (fy == null) return;
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.setAttribute("x1", lx1); line.setAttribute("y1", fy);
            line.setAttribute("x2", lx2); line.setAttribute("y2", fy);
            line.setAttribute("stroke", color);
            line.setAttribute("stroke-width", fibW);
            const dash = drawing.lineStyle === "solid" ? ""
              : drawing.lineStyle === "dashed" ? "4,3"
              : (r === 0 || r === 1) ? "" : "4,3";
            line.setAttribute("stroke-dasharray", dash);
            line.style.pointerEvents = "stroke";
            attachInteraction(line, drawing);
            attachMoveDrag(line, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
            svg.appendChild(line);
            const fibHit = document.createElementNS("http://www.w3.org/2000/svg", "line");
            fibHit.setAttribute("x1", lx1); fibHit.setAttribute("y1", fy);
            fibHit.setAttribute("x2", lx2); fibHit.setAttribute("y2", fy);
            fibHit.setAttribute("stroke", "transparent"); fibHit.setAttribute("stroke-width", "14");
            fibHit.style.pointerEvents = "stroke";
            attachInteraction(fibHit, drawing);
            attachMoveDrag(fibHit, drawing, { startP1: { ...drawing.p1 }, startP2: { ...drawing.p2 } });
            svg.appendChild(fibHit);
            if (!fibShowLabels) return;
            const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            lbl.setAttribute("x", lx1 + 4); lbl.setAttribute("y", fy - 2);
            lbl.setAttribute("fill", color);
            lbl.setAttribute("font-size", "9");
            lbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
            lbl.setAttribute("font-weight", "600");
            lbl.textContent = `${(r * 100).toFixed(1)}%  ${fibPrice.toFixed(2)}`;
            lbl.style.pointerEvents = "none";
            svg.appendChild(lbl);
          });

          if (selected) {
            const mkFibHandle = (hx, hy, field, anchorPrice) => {
              const h = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              h.setAttribute("cx", hx); h.setAttribute("cy", hy); h.setAttribute("r", "5");
              h.setAttribute("fill", isDarkRef.current ? "#131722" : "#ffffff");
              h.setAttribute("stroke", drawing.color || "#087b86");
              h.setAttribute("stroke-width", "2");
              h.style.cursor = "crosshair";
              h.style.pointerEvents = "all";
              h.addEventListener("mousedown", (ev) => {
                ev.stopPropagation();
                svgDraggingRef.current = {
                  drawingId: drawing.id, field,
                  drawingType: "fibonacci",
                  candleInterval: interval,
                  visualP2Time: drawing.p2.time,
                  p1Time: drawing.p1.time,
                  anchorPrice,
                };
              });
              svg.appendChild(h);
            };
            // One handle per clicked point, at diagonally opposite corners
            const p1y = mn.priceToCoordinate(drawing.p1.price);
            const p2y = mn.priceToCoordinate(drawing.p2.price);
            if (p1y != null) mkFibHandle(x1, p1y, "p1", drawing.p2.price);
            if (p2y != null) mkFibHandle(x2, p2y, "p2", drawing.p1.price);
          }

          return;
        }

        // Buy / Sell position markers
        if (drawing.type === "buy_marker" || drawing.type === "sell_marker") {
          const x = ts.timeToCoordinate(drawing.time);
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
          const x = timeToCoord(drawing.time);
          if (x == null) return;
          // Use timeToCoord (not ts.timeToCoordinate) so future endTimes render correctly
          // instead of falling back to svgW and stretching across the whole chart
          const xEndRaw = drawing.endTime ? timeToCoord(drawing.endTime) : null;
          // Last resort: default to ~5 bars wide — never stretch to the full chart
          const rrRange = ts.getVisibleLogicalRange();
          const rrBarW = rrRange ? svgW / (rrRange.to - rrRange.from) : 8;
          const xEnd = xEndRaw ?? x + 5 * rrBarW;
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

          // Use actual price coordinates for zones — scales proportionally with chart
          const ySLv = ySL;
          const yTPv = yTP;

          // Container group — CSS :hover shows rr-labels and rr-handles sub-groups
          const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
          group.setAttribute("class", sel ? "rr-group rr-selected" : "rr-group");
          if (inDrawMode) group.style.pointerEvents = "none";

          // Extra state for move drag — all rr fields needed to shift the whole box
          const rrMoveState = {
            startTime:    drawing.time,
            startEndTime: drawing.endTime ?? shiftTimeByBars(candleDataRef.current, drawing.time, 5),
            startEntry:   drawing.entry,
            startSl:      drawing.sl,
            startTp:      drawing.tp,
          };

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
              attachMoveDrag(r, drawing, rrMoveState);
            } else {
              r.style.pointerEvents = "none";
            }
            group.appendChild(r);
          };
          mkRect(yEntry, ySLv,
            sel ? "rgba(242,54,69,0.28)" : "rgba(242,54,69,0.18)",
            sel ? "#f23645" : "rgba(242,54,69,0.45)");
          mkRect(yEntry, yTPv,
            sel ? "rgba(8,153,129,0.28)" : "rgba(8,153,129,0.18)",
            sel ? "#089981" : "rgba(8,153,129,0.45)");

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
          mkLine(yEntry, sel ? "#60a5fa" : "rgba(255,255,255,0.7)", "6,3");
          mkLine(ySLv, sel ? "#60a5fa" : "rgba(242,54,69,0.85)");
          mkLine(yTPv, sel ? "#60a5fa" : "rgba(8,153,129,0.85)");

          // Labels — in sub-group, CSS controls visibility on hover / selected
          const labelsG = document.createElementNS("http://www.w3.org/2000/svg", "g");
          labelsG.setAttribute("class", "rr-labels");
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
            group.appendChild(handlesG);
          }

          // User label on R:R box
          if (drawing.label) {
            const rrLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            const pos = drawing.labelPos || "top-left";
            const rrTop = Math.min(yEntry, yTPv);
            const rrBot = Math.max(yEntry, ySLv);
            let lx, ly, anchor;
            if (pos === "top-right")  { lx = xEnd - 4; ly = rrTop + 12; anchor = "end"; }
            else if (pos === "center"){ lx = (x + xEnd) / 2; ly = (rrTop + rrBot) / 2 + 4; anchor = "middle"; }
            else if (pos === "bottom-left") { lx = x + 4; ly = rrBot - 4; anchor = "start"; }
            else /* top-left */       { lx = x + 4; ly = rrTop + 12; anchor = "start"; }
            rrLbl.setAttribute("x", lx); rrLbl.setAttribute("y", ly);
            rrLbl.setAttribute("text-anchor", anchor);
            rrLbl.setAttribute("fill", "#ffffff");
            rrLbl.setAttribute("font-size", "11");
            rrLbl.setAttribute("font-family", "'Inter','Trebuchet MS',sans-serif");
            rrLbl.setAttribute("font-weight", "700");
            rrLbl.style.pointerEvents = "none";
            rrLbl.textContent = drawing.label;
            group.appendChild(rrLbl);
          }

          svg.appendChild(group);
          return;
        }
      });

      const mode = drawingModeRef.current;

      // Trendline in progress — committed vertices as a solid polyline, plus a
      // dashed segment with arrow tip following the cursor until double-click
      if (mode === "trendline" && drawingStateRef.current?.points?.length) {
        const tlPrev = getToolDefaults("trendline") || {};
        const prevColor = tlPrev.color || "#1E53E5";
        const stPts = drawingStateRef.current.points
          .map((p) => {
            const px = timeToCoord(p.time);
            const py = mn.priceToCoordinate(p.price);
            return px != null && py != null ? { x: px, y: py } : null;
          })
          .filter(Boolean);
        if (stPts.length >= 2) {
          const pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
          pl.setAttribute("points", stPts.map((p) => `${p.x},${p.y}`).join(" "));
          pl.setAttribute("fill", "none");
          pl.setAttribute("stroke", prevColor);
          pl.setAttribute("stroke-width", String(tlPrev.lineWidth || 1.5));
          pl.style.pointerEvents = "none";
          svg.appendChild(pl);
        }
        stPts.forEach(({ x: cx, y: cy }) => {
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
          dot.setAttribute("fill", prevColor);
          dot.style.pointerEvents = "none";
          svg.appendChild(dot);
        });
        if (stPts.length && previewPointRef.current) {
          const last = stPts[stPts.length - 1];
          const cx = previewPointRef.current.x, cy = previewPointRef.current.y;
          const seg = document.createElementNS("http://www.w3.org/2000/svg", "line");
          seg.setAttribute("x1", last.x); seg.setAttribute("y1", last.y);
          seg.setAttribute("x2", cx); seg.setAttribute("y2", cy);
          seg.setAttribute("stroke", prevColor);
          seg.setAttribute("stroke-width", "1.5");
          seg.setAttribute("stroke-dasharray", "5,4");
          seg.style.pointerEvents = "none";
          svg.appendChild(seg);
          // Arrow tip preview at the cursor
          const ang = Math.atan2(cy - last.y, cx - last.x);
          const arr = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
          const a1x = cx - Math.cos(ang - Math.PI / 7) * 10;
          const a1y = cy - Math.sin(ang - Math.PI / 7) * 10;
          const a2x = cx - Math.cos(ang + Math.PI / 7) * 10;
          const a2y = cy - Math.sin(ang + Math.PI / 7) * 10;
          arr.setAttribute("points", `${cx},${cy} ${a1x},${a1y} ${a2x},${a2y}`);
          arr.setAttribute("fill", prevColor);
          arr.style.pointerEvents = "none";
          svg.appendChild(arr);
        }
      }

      // Dashed preview while placing second point for ray/segment/rectangle/fibonacci/rr
      const twoPointModes = ["ray", "segment", "rectangle", "fibonacci", "rr"];
      if (twoPointModes.includes(mode) && drawingStateRef.current && previewPointRef.current) {
        const p1 = drawingStateRef.current;
        const ax = timeToCoord(p1.time);
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
            // Live fib preview — uses saved defaults so colors/style match what the
            // committed drawing will look like (no flash from default → saved on release)
            const px2 = previewPointRef.current.x;
            const lx1p = Math.min(ax, px2), lx2p = Math.max(ax, px2);
            const previewPrice2 = mn.coordinateToPrice(previewPointRef.current.y);
            if (previewPrice2 != null) {
              const priceRange = previewPrice2 - p1.price;
              const fibDef = getToolDefaults("fibonacci") || {};
              const previewLevels = fibDef.levels?.length ? fibDef.levels : DEFAULT_FIB_LEVELS;
              const previewColor = fibDef.color || null;
              const previewW = String(fibDef.lineWidth || 1);
              const previewStyle = fibDef.lineStyle;
              previewLevels.filter((l) => l.visible !== false).forEach(({ r, color: lvlColor }) => {
                const color = previewColor || lvlColor;
                const fp = p1.price + priceRange * r;
                const fy = mn.priceToCoordinate(fp);
                if (fy == null) return;
                const pl = document.createElementNS("http://www.w3.org/2000/svg", "line");
                pl.setAttribute("x1", lx1p); pl.setAttribute("y1", fy);
                pl.setAttribute("x2", lx2p); pl.setAttribute("y2", fy);
                pl.setAttribute("stroke", color);
                pl.setAttribute("stroke-width", previewW);
                const dash = previewStyle === "solid" ? ""
                  : previewStyle === "dashed" ? "4,3"
                  : (r === 0 || r === 1) ? "" : "4,3";
                pl.setAttribute("stroke-dasharray", dash);
                pl.setAttribute("opacity", "0.9");
                pl.style.pointerEvents = "none";
                svg.appendChild(pl);
                const plbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                plbl.setAttribute("x", lx1p + 4); plbl.setAttribute("y", fy - 2);
                plbl.setAttribute("fill", color);
                plbl.setAttribute("font-size", "9");
                plbl.setAttribute("font-family", "'Trebuchet MS', Roboto, sans-serif");
                plbl.setAttribute("font-weight", "600");
                plbl.textContent = `${(r * 100).toFixed(1)}%  ${fp.toFixed(2)}`;
                plbl.style.pointerEvents = "none";
                svg.appendChild(plbl);
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
            let bx = previewPointRef.current.x, by = previewPointRef.current.y;
            if (shiftKeyRef.current && ["ray", "segment"].includes(mode)) {
              const dx = bx - ax, dy = by - ay;
              const adx = Math.abs(dx), ady = Math.abs(dy);
              if (adx > ady * 2.414)      { by = ay; }
              else if (ady > adx * 2.414) { bx = ax; }
              else { const d = Math.max(adx, ady); bx = ax + (dx >= 0 ? d : -d); by = ay + (dy >= 0 ? d : -d); }
            }
            const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
            el.setAttribute("x1", ax); el.setAttribute("y1", ay);
            el.setAttribute("x2", bx);
            el.setAttribute("y2", by);
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

      // ── Replay cursor line — vertical line following the mouse when bar replay is active ──
      if (barReplayActiveRef.current && replayCursorXRef?.current != null) {
        const x = replayCursorXRef.current;
        const replayLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        replayLine.setAttribute("x1", x);
        replayLine.setAttribute("y1", 0);
        replayLine.setAttribute("x2", x);
        replayLine.setAttribute("y2", svgH);
        replayLine.setAttribute("stroke", "#1E53E5");
        replayLine.setAttribute("stroke-width", "2");
        replayLine.setAttribute("stroke-dasharray", "6,4");
        replayLine.setAttribute("opacity", "0.85");
        replayLine.style.pointerEvents = "none";
        svg.appendChild(replayLine);
      }

      // ── Dock the properties panel at the top-center of the chart window ──
      // (fixed position so it never covers the selected drawing)
      const panel = propsPanelRef.current;
      if (panel) {
        const selIds = selectedDrawingIdsRef.current;
        if (selIds.length === 1) {
          const currentSelId = selIds[0];
          // If the selected drawing changed, clear the user-dragged flag so it re-docks
          if (panel._lastSelId !== currentSelId) {
            panel._lastSelId = currentSelId;
            delete panel.dataset.userDragged;
          }
          // Only auto-dock when the user hasn't manually repositioned the panel
          if (!panel.dataset.userDragged) {
            const pw = panel.offsetWidth || 260;
            const svgRect = svg.getBoundingClientRect();
            const margin = 10;
            let fl = svgRect.left + (svgRect.width - pw) / 2;
            fl = Math.max(margin, Math.min(fl, window.innerWidth - pw - margin));
            panel.style.left = `${Math.round(fl)}px`;
            panel.style.top  = `${Math.round(svgRect.top + margin)}px`;
          }
        }
      }
    };
    updateSvgDrawingsRef.current = updateSvgDrawings;

    // Redraw SVG drawings on horizontal scroll/zoom
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      requestAnimationFrame(updateSvgDrawings);
      if (!applyingRangeRef.current && onRangeChangeRef.current) {
        try {
          const range = chartRef.current?.timeScale().getVisibleLogicalRange();
          if (range) onRangeChangeRef.current(range);
        } catch {}
      }
    });

    // Redraw SVG drawings on vertical price-scale zoom/drag (axisPressedMouseMove)
    try {
      chart.priceScale("right").subscribeVisiblePriceRangeChange(() => {
        requestAnimationFrame(updateSvgDrawings);
      });
    } catch {}
    const onPriceScaleDrag = () => requestAnimationFrame(updateSvgDrawings);
    wrapperRef.current?.addEventListener("wheel", onPriceScaleDrag, { passive: true });

    // Additional handlers to catch price scale resize via drag
    const onMouseMove = () => {
      if (document.querySelector('.tv-lightweight-charts')?.classList.contains('dragging-price-scale')) {
        requestAnimationFrame(updateSvgDrawings);
      }
    };
    const onMouseUp = () => requestAnimationFrame(updateSvgDrawings);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);

    // ── Ctrl/Cmd + drag marquee — rubber-band multi-select ──
    // Hold Ctrl (or Cmd) and drag across empty chart space to select every
    // drawing the box touches. The capture-phase mousedown runs before the
    // chart canvas, so calling stopPropagation suppresses the chart pan once a
    // marquee begins. Starting the drag on a drawing element hits the SVG
    // overlay (a sibling of the chart), not this listener, so the marquee only
    // ever starts on the background — exactly the standard behaviour.
    const marquee = { active: false, startX: 0, startY: 0, rectEl: null };
    const ptIn = (x, y, R) => x >= R.x1 && x <= R.x2 && y >= R.y1 && y <= R.y2;
    // Screen coords for a time/price (svg overlay shares the chart pane's box)
    const xOfTime = (t) => {
      if (t == null) return null;
      const tsm = chart.timeScale();
      const direct = tsm.timeToCoordinate(t);
      if (direct != null) return direct;
      const data = candleDataRef.current;
      if (!data?.length) return null;
      const c = tsm.logicalToCoordinate(timeToLogical(data, t));
      return c == null ? null : c;
    };
    const yOfPrice = (p) => {
      const mn = seriesRef.current.main;
      if (!mn || p == null) return null;
      const c = mn.priceToCoordinate(p);
      return c == null ? null : c;
    };
    // Standard segment-segment intersection (orientation test)
    const segSeg = (ax, ay, bx, by, cx, cy, dx, dy) => {
      const o = (px, py, qx, qy, rx, ry) =>
        Math.sign((qy - py) * (rx - qx) - (qx - px) * (ry - qy));
      const o1 = o(ax, ay, bx, by, cx, cy);
      const o2 = o(ax, ay, bx, by, dx, dy);
      const o3 = o(cx, cy, dx, dy, ax, ay);
      const o4 = o(cx, cy, dx, dy, bx, by);
      return o1 !== o2 && o3 !== o4;
    };
    const segHitsRect = (ax, ay, bx, by, R) => {
      if (ptIn(ax, ay, R) || ptIn(bx, by, R)) return true;
      const E = [
        [R.x1, R.y1, R.x2, R.y1], [R.x2, R.y1, R.x2, R.y2],
        [R.x2, R.y2, R.x1, R.y2], [R.x1, R.y2, R.x1, R.y1],
      ];
      return E.some(([x1, y1, x2, y2]) => segSeg(ax, ay, bx, by, x1, y1, x2, y2));
    };
    const boxHitsRect = (x1, y1, x2, y2, R) =>
      x1 <= R.x2 && x2 >= R.x1 && y1 <= R.y2 && y2 >= R.y1;
    // True if the drawing's geometry touches the marquee rect R
    const drawingHitsRect = (d, R) => {
      if (d.type === "hline") {
        const y = yOfPrice(d.price);
        return y != null && y >= R.y1 && y <= R.y2; // spans full width
      }
      if (d.type === "vline") {
        const x = xOfTime(d.time);
        return x != null && x >= R.x1 && x <= R.x2; // spans full height
      }
      if (d.type === "text" || d.type === "buy_marker" || d.type === "sell_marker") {
        const x = xOfTime(d.time), y = yOfPrice(d.price);
        return x != null && y != null && ptIn(x, y, R);
      }
      if (d.type === "trendline" && Array.isArray(d.points)) {
        const pts = d.points
          .map((p) => [xOfTime(p.time), yOfPrice(p.price)])
          .filter(([x, y]) => x != null && y != null);
        if (pts.some(([x, y]) => ptIn(x, y, R))) return true;
        for (let i = 0; i < pts.length - 1; i++) {
          if (segHitsRect(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], R)) return true;
        }
        return false;
      }
      if (d.type === "rr") {
        const x1 = xOfTime(d.time), x2 = xOfTime(d.endTime);
        const ys = [d.entry, d.sl, d.tp].map(yOfPrice).filter((v) => v != null);
        if (x1 == null || x2 == null || !ys.length) return false;
        return boxHitsRect(Math.min(x1, x2), Math.min(...ys), Math.max(x1, x2), Math.max(...ys), R);
      }
      if (d.p1 && d.p2) {
        const ax = xOfTime(d.p1.time), ay = yOfPrice(d.p1.price);
        const bx = xOfTime(d.p2.time), by = yOfPrice(d.p2.price);
        if (ax == null || ay == null || bx == null || by == null) return false;
        if (d.type === "rectangle" || d.type === "fibonacci") {
          return boxHitsRect(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), R);
        }
        return segHitsRect(ax, ay, bx, by, R); // segment, ray
      }
      return false;
    };
    const onMarqueeMove = (e) => {
      if (!marquee.active) return;
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const cx = e.clientX - svgRect.left, cy = e.clientY - svgRect.top;
      const x = Math.min(marquee.startX, cx), y = Math.min(marquee.startY, cy);
      const w = Math.abs(cx - marquee.startX), h = Math.abs(cy - marquee.startY);
      if (marquee.rectEl) {
        marquee.rectEl.setAttribute("x", x);
        marquee.rectEl.setAttribute("y", y);
        marquee.rectEl.setAttribute("width", w);
        marquee.rectEl.setAttribute("height", h);
      }
    };
    const onMarqueeUp = (e) => {
      document.removeEventListener("mousemove", onMarqueeMove, true);
      document.removeEventListener("mouseup", onMarqueeUp, true);
      if (!marquee.active) return;
      marquee.active = false;
      if (marquee.rectEl?.parentNode) marquee.rectEl.parentNode.removeChild(marquee.rectEl);
      marquee.rectEl = null;
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const cx = e.clientX - svgRect.left, cy = e.clientY - svgRect.top;
      const R = {
        x1: Math.min(marquee.startX, cx), x2: Math.max(marquee.startX, cx),
        y1: Math.min(marquee.startY, cy), y2: Math.max(marquee.startY, cy),
      };
      // A near-zero drag is a click, not a selection — leave selection untouched
      if (R.x2 - R.x1 < 4 && R.y2 - R.y1 < 4) return;
      const hits = (userDrawingsRef.current || [])
        .filter((d) => d.id !== "__pending__" && drawingHitsRect(d, R))
        .map((d) => d.id);
      onSelectManyRef?.current?.(hits);
    };
    const onMarqueeDown = (e) => {
      if (e.button !== 0 || !(e.ctrlKey || e.metaKey)) return;
      const mode = drawingModeRef.current;
      if (mode && mode !== "selector") return; // only in cursor/selector mode
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      // Take over from the chart's pan handler
      e.preventDefault();
      e.stopPropagation();
      marquee.active = true;
      marquee.startX = e.clientX - svgRect.left;
      marquee.startY = e.clientY - svgRect.top;
      const brush = brushSvgRef.current;
      if (brush) {
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("fill", "rgba(96,165,250,0.12)");
        r.setAttribute("stroke", "#60a5fa");
        r.setAttribute("stroke-width", "1");
        r.setAttribute("stroke-dasharray", "4 3");
        r.setAttribute("pointer-events", "none");
        brush.appendChild(r);
        marquee.rectEl = r;
      }
      document.addEventListener("mousemove", onMarqueeMove, true);
      document.addEventListener("mouseup", onMarqueeUp, true);
    };
    wrapperRef.current?.addEventListener("mousedown", onMarqueeDown, true);

    // Click-to-draw or click-to-seek (seek only when bar replay mode is active)
    chart.subscribeClick((param) => {
      const mode = drawingModeRef.current;
      if (mode && mode !== "selector" && mode !== "eraser") {
        if (!param.point) return;
        const price = main?.coordinateToPrice(param.point.y);
        if (price == null) return;
        let t;
        if (param.time) {
          t = typeof param.time === "number" ? param.time : Number(param.time);
        } else {
          // Estimate time from x coordinate (empty chart area to the right of data)
          const logIdx = chart.timeScale().coordinateToLogical(param.point.x);
          if (logIdx == null) return;
          const idx = Math.round(logIdx);
          const interval = candleData.length > 1 ? candleData[1].time - candleData[0].time : 3600;
          if (idx >= 0 && idx < candleData.length) {
            t = candleData[idx].time;
          } else if (idx >= candleData.length) {
            t = candleData[candleData.length - 1].time + (idx - candleData.length + 1) * interval;
          } else {
            return;
          }
        }

        if (mode === "hline") {
          onDrawingAddRef.current?.({ type: "hline", price, color: "#1E53E5", ...(getToolDefaults("hline") || {}) });
        } else if (mode === "vline") {
          onDrawingAddRef.current?.({ type: "vline", time: t, color: "#f7a600", ...(getToolDefaults("vline") || {}) });
        } else if (mode === "text") {
          // Place the label and open the in-place editor on the chart right away,
          // so the user can type the text directly instead of only via the panel.
          const id = Date.now();
          const textDefaults = getToolDefaults("text") || {};
          onDrawingAddRef.current?.({
            id, type: "text", time: t, price, label: "Text",
            color: "#f7a600", ...textDefaults,
          });
          onSelectionChangeRef.current?.(id);
          const svgRect = svgRef.current?.getBoundingClientRect();
          if (svgRect) {
            const fs = textDefaults.fontSize || 14;
            onEditTextRef?.current?.(
              id,
              { left: svgRect.left + param.point.x, top: svgRect.top + param.point.y, height: fs + 10 },
              { fontSize: fs, color: textDefaults.color || "#f7a600", value: "Text", selectOnFocus: true },
            );
          }
        } else if (mode === "buy_marker" || mode === "sell_marker") {
          onDrawingAddRef.current?.({
            type: mode, time: t, price,
            color: mode === "buy_marker" ? "#089981" : "#f23645",
          });
        } else if (mode === "trendline") {
          // Each click adds a vertex; the path is committed on double-click
          if (!drawingStateRef.current?.points) {
            drawingStateRef.current = { points: [{ time: t, price }] };
          } else {
            drawingStateRef.current.points.push({ time: t, price });
          }
          updateSvgDrawingsRef.current();
        } else if (["ray", "segment", "rectangle", "fibonacci"].includes(mode)) {
          if (!drawingStateRef.current) {
            drawingStateRef.current = { price, time: t };
          } else {
            const p1 = drawingStateRef.current;
            const newDrawing = {
              type: mode,
              p1: { price: p1.price, time: p1.time },
              p2: { price, time: t },
              color: mode === "ray" ? "#089981" : mode === "segment" ? "#f7a600" : "#089981",
              ...(getToolDefaults(mode) || {}),
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
            // Right edge = where the user clicked (x-position of second click) + 2 candle
            // buffer. Shift by bars (gap-aware), not seconds — `time + k*interval` can land
            // inside a weekend/session gap where no bar exists and the box collapses.
            const endTime = t > p1.time
              ? shiftTimeByBars(candleData, t, 2)
              : shiftTimeByBars(candleData, p1.time, 5);
            onDrawingAddRef.current?.({
              type: "rr", time: p1.time, entry, sl, tp, isLong, endTime, size: 1,
              ...(getToolDefaults("rr") || {}),
            });
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
      if (idx >= 0) {
        onCandleSeekRef.current(idx);
        // Clear cursor line and deactivate bar replay after the cut
        if (replayCursorXRef) replayCursorXRef.current = null;
        onBarReplayDeactivateRef?.current?.();
        updateSvgDrawings();
      }
    });

    // Double-click finishes a multi-point trendline. The double-click already
    // fired one or two single clicks, so the final vertex is duplicated — drop
    // trailing points that sit within a few pixels of the previous one.
    const finishTrendline = () => {
      if (drawingModeRef.current !== "trendline") return;
      const st = drawingStateRef.current;
      if (!st?.points?.length) return;
      const ts2 = chart.timeScale();
      const pts = [...st.points];
      while (pts.length >= 2) {
        const a = pts[pts.length - 2];
        const b = pts[pts.length - 1];
        const ax = ts2.timeToCoordinate(a.time), bx = ts2.timeToCoordinate(b.time);
        const ay = main.priceToCoordinate(a.price), by = main.priceToCoordinate(b.price);
        const dup = ax != null && bx != null && ay != null && by != null
          ? Math.hypot(bx - ax, by - ay) < 6
          : a.time === b.time && a.price === b.price;
        if (dup) pts.pop(); else break;
      }
      drawingStateRef.current = null;
      if (pts.length >= 2) {
        const newDrawing = {
          type: "trendline", points: pts,
          color: "#1E53E5", ...(getToolDefaults("trendline") || {}),
        };
        onDrawingAddRef.current?.(newDrawing);
        // Immediate render so the line doesn't flicker while React state catches up
        userDrawingsRef.current = [...userDrawingsRef.current, { ...newDrawing, id: "__pending__" }];
      }
      updateSvgDrawingsRef.current();
    };
    chart.subscribeDblClick?.(finishTrendline);
    // DOM fallback — the library's dblclick detection can miss when the two
    // clicks land a few pixels apart; the browser's dblclick always fires
    const onDomDblClick = () => finishTrendline();
    wrapperRef.current?.addEventListener("dblclick", onDomDblClick);

    // Escape cancels any in-progress drawing (trendline vertices or the first
    // point of a two-point tool)
    const onEscKey = (e) => {
      if (e.key !== "Escape" || !drawingStateRef.current) return;
      drawingStateRef.current = null;
      previewPointRef.current = null;
      updateSvgDrawingsRef.current();
    };
    document.addEventListener("keydown", onEscKey);

    // OHLCV crosshair tooltip — direct DOM for 60fps
    chart.subscribeCrosshairMove((param) => {
      // Track cursor X for bar replay cursor line
      if (barReplayActiveRef.current && replayCursorXRef) {
        const prevX = replayCursorXRef.current;
        replayCursorXRef.current = param.point ? param.point.x : null;
        if (replayCursorXRef.current !== prevX) updateSvgDrawings();
      }

      // Update drawing preview for all two-point tools
      if (param.point) {
        previewPointRef.current = { x: param.point.x, y: param.point.y };
        if (drawingStateRef.current) updateSvgDrawings();
      }

      // Emit crosshair time + cursor Y for sync (track last emitted to prevent
      // echo on receive; skip entirely while applying a position from a sibling
      // chart). The Y lets sibling charts place the horizontal line at the same
      // screen position as the real cursor instead of snapping to a candle close.
      if (onCrosshairMoveRef.current && !applyingCrosshairRef?.current) {
        if (!param.time) {
          lastEmittedTimeRef.current = null;
          onCrosshairMoveRef.current(null, null);
        } else {
          const t = typeof param.time === "number" ? param.time : Number(param.time);
          lastEmittedTimeRef.current = t;
          onCrosshairMoveRef.current(t, param.point ? param.point.y : null);
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
      const fmt = trimPrice;
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
      updateSvgDrawingsRef.current = () => {};
      wrapperRef.current?.removeEventListener("wheel", onPriceScaleDrag);
      wrapperRef.current?.removeEventListener("dblclick", onDomDblClick);
      document.removeEventListener("keydown", onEscKey);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      wrapperRef.current?.removeEventListener("mousedown", onMarqueeDown, true);
      document.removeEventListener("mousemove", onMarqueeMove, true);
      document.removeEventListener("mouseup", onMarqueeUp, true);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = {};
      lastRef.current = 0;
    };
  }, [candleData]); // eslint-disable-line react-hooks/exhaustive-deps

}
