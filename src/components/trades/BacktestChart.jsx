import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createSeriesMarkers,
} from "lightweight-charts";
import { TV_LIGHT, TV_DARK, calcEMAIndexed, defaultWindow, applyChartSettings, measureLabelWidth } from './BacktestChart/chartConfig';
import DrawingPropertiesPanel from './BacktestChart/DrawingPropertiesPanel';
import { useDrawingTools } from './BacktestChart/hooks/useDrawingTools';
import { useChartSetup } from './BacktestChart/hooks/useChartSetup';
import { shiftTimeByBars } from './BacktestChart/timeScaleMath';
import { tzChartOptions } from '../../utils/chartTimezone';

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
  onRegisterCrosshairSetter,
  barReplayActive = false,
  selectedDrawingIds = [],
  onSelectionChange,
  onRangeChange,
  onRegisterRangeSetter,
  onDrawingUpdate,
  chartSettings = null,
  panelDrawing = null,
  onPropertyChange,
  onBarReplayDeactivate,
  timezone = null,
  hideAttribution = false,
  formingCandle = null,
  symbol = null,
  isActiveChart = true,
  onPriceScaleWidth,
}) => {
  const wrapperRef = useRef();
  const chartRef = useRef(null);
  const seriesRef = useRef({});
  const ema20Ref = useRef([]);
  const ema50Ref = useRef([]);
  const lastRef = useRef(0);
  const windowRef = useRef(50);
  const indicatorsRef = useRef(indicators);
  const onCandleSeekRef = useRef(onCandleSeek);
  const isDarkRef = useRef(isDark);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onOrderPreviewUpdateRef = useRef(onOrderPreviewUpdate);
  const onDrawingAddRef = useRef(onDrawingAdd);
  const onDrawingDeleteRef = useRef(onDrawingDelete);
  const barReplayActiveRef = useRef(barReplayActive);
  const replayCursorXRef = useRef(null);
  const onBarReplayDeactivateRef = useRef(onBarReplayDeactivate);
  const selectedDrawingIdsRef = useRef(selectedDrawingIds);
  const onSelectionChangeRef = useRef(onSelectionChange);
  // { line, posId, field } — tracks each drawn position price line
  const positionLineRefs = useRef([]);
  // { line, field } — tracks order-panel preview price lines (shown before order is placed)
  const previewLineRefs = useRef([]);
  // Active manual drag of a TP/SL price line (the library has no draggable lines)
  const priceLineDragRef = useRef(null);
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
  const svgDraggingRef = useRef(null); // { drawingId, field: 'sl'|'tp'|'endTime' }
  // Drawing mode / state
  const drawingModeRef = useRef(null);
  const drawingStateRef = useRef(null);   // first point when drawing a trendline
  const previewPointRef = useRef(null);   // current mouse position for trendline preview
  const userDrawingsRef = useRef([]);
  const updateSvgDrawingsRef = useRef(() => {});
  // Id of the text drawing currently being edited inline. The SVG renderer
  // skips its box while editing so only the dashed input shows (no double border).
  const inlineEditIdRef = useRef(null);
  const propsPanelRef = useRef(null); // floating properties panel DOM node
  const wasDraggedRef = useRef(false);
  const candleDataRef = useRef([]);
  const shiftKeyRef = useRef(false);
  // Read by useChartSetup when the chart is (re)created, so saved appearance
  // settings apply to a fresh chart without waiting for a settings change
  const chartSettingsRef = useRef(chartSettings);

  // Inline text editing — double-click on a text drawing opens an in-place input
  const [inlineEdit, setInlineEdit] = useState(null); // { id, x, y, fontSize, color, value }
  const onEditTextRef = useRef(null);
  // `overrides` lets a just-created label (not yet in userDrawingsRef) open the
  // editor immediately with known font/color/value instead of looking them up.
  onEditTextRef.current = (id, rect, overrides) => {
    const drawing = userDrawingsRef.current.find((d) => d.id === id);
    if (!drawing && !overrides) return;
    setInlineEdit({
      id,
      x: rect.left,
      y: rect.top,
      height: rect.height,
      fontSize: overrides?.fontSize ?? drawing?.fontSize ?? 14,
      color: overrides?.color ?? drawing?.color ?? "#f7a600",
      value: overrides?.value ?? drawing?.label ?? "",
      selectOnFocus: overrides?.selectOnFocus ?? false,
    });
  };
  // Hide the underlying SVG box while its label is being edited inline, so the
  // solid box border never shows above/around the dashed editor border. Toggle
  // the single group's visibility directly — calling updateSvgDrawings here
  // would wipe and rebuild the whole layer, making every drawing flash.
  useEffect(() => {
    const id = inlineEdit?.id ?? null;
    inlineEditIdRef.current = id;
    const svg = svgRef.current;
    if (!svg) return;
    svg.querySelectorAll("[data-text-id]").forEach((el) => {
      el.style.display = id != null && el.getAttribute("data-text-id") === String(id) ? "none" : "";
    });
  }, [inlineEdit?.id]);

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
  useEffect(() => {
    barReplayActiveRef.current = barReplayActive;
    if (!barReplayActive) replayCursorXRef.current = null;
  });
  useEffect(() => { onBarReplayDeactivateRef.current = onBarReplayDeactivate; });
  useEffect(() => {
    selectedDrawingIdsRef.current = selectedDrawingIds;
    updateSvgDrawingsRef.current(); // redraws glow and repositions the properties panel
  }, [selectedDrawingIds]); // eslint-disable-line
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; });
  useEffect(() => { chartSettingsRef.current = chartSettings; });
  useEffect(() => { onCrosshairMoveRef.current = onCrosshairMove; });
  useEffect(() => { onRangeChangeRef.current = onRangeChange; });
  useEffect(() => { onRegisterRangeSetterRef.current = onRegisterRangeSetter; });
  useEffect(() => { onDrawingUpdateRef.current = onDrawingUpdate; });
  useEffect(() => { candleDataRef.current = candleData; }, [candleData]);
  useEffect(() => {
    if (!isActiveChart && ohlcBarRef.current) ohlcBarRef.current.style.opacity = "0";
  }, [isActiveChart]);
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

  // ── Shift key tracking for angle snapping ──
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Shift") shiftKeyRef.current = e.type === "keydown";
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  // ── Brush / freehand drawing tool ──
  const { brushSvgRef } = useDrawingTools({
    drawingMode,
    wrapperRef,
    chartRef,
    seriesRef,
    onDrawingAdd, // plain function — the hook keeps its own ref in sync
  });

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
    // Theme options above reset background/candles — re-layer the user's
    // saved appearance settings on top
    applyChartSettings(chart, seriesRef.current.main, chartSettingsRef.current, isDark);
  }, [isDark]);

  // ── Imperative crosshair sync — sibling charts move this crosshair directly,
  // with no React re-render per mousemove. While applying an incoming position
  // the chart's own crosshairMove subscription fires with a time snapped to
  // THIS chart's candles; emitting that would ping-pong between charts and make
  // the cursor shake, so emission is suppressed for the synchronous + next tick.
  const applyingCrosshairRef = useRef(false);
  useEffect(() => {
    if (!onRegisterCrosshairSetter) return;
    onRegisterCrosshairSetter((t, y) => {
      const chart = chartRef.current;
      const main = seriesRef.current.main;
      if (!chart || !main) return;
      applyingCrosshairRef.current = true;
      try {
        if (t == null) {
          chart.clearCrosshairPosition?.();
        } else {
          const data = candleDataRef.current || [];
          let best = null, minDiff = Infinity;
          for (let i = 0; i < data.length; i++) {
            const d = Math.abs(data[i].time - t);
            if (d < minDiff) { minDiff = d; best = data[i]; }
          }
          if (best) {
            // Place the horizontal line at the same screen Y as the source
            // cursor (all windows share the same height) — falling back to the
            // candle close only when no Y was provided
            let price = best.close;
            if (y != null) {
              const p = main.coordinateToPrice(y);
              if (p != null && isFinite(p)) price = p;
            }
            chart.setCrosshairPosition(price, best.time, main);
            // When bar replay is active on this chart (charts 2/3), programmatic
            // setCrosshairPosition may not populate param.point in subscribeCrosshairMove.
            // Explicitly convert the time to a screen X and update the replay cursor so
            // the dashed vertical line renders on this chart too.
            if (barReplayActiveRef.current) {
              try {
                const x = chart.timeScale().timeToCoordinate(best.time);
                if (x != null) {
                  replayCursorXRef.current = x;
                  updateSvgDrawingsRef.current?.();
                }
              } catch {}
            }
          }
        }
      } catch { /* chart disposed */ }
      setTimeout(() => { applyingCrosshairRef.current = false; }, 0);
    });
  }, [candleData, onRegisterCrosshairSetter]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Register imperative range setter + getter (logical bar-index range, avoids re-render choppiness) ──
  useEffect(() => {
    const setter = (range) => {
      const ts = chartRef.current?.timeScale();
      if (!ts) return;
      applyingRangeRef.current = true;
      try { ts.setVisibleLogicalRange(range); } catch {}
      try { chartRef.current?.priceScale('right').applyOptions({ autoScale: true }); } catch {}
      setTimeout(() => { applyingRangeRef.current = false; }, 80);
    };
    const getter = () => {
      try { return chartRef.current?.timeScale().getVisibleLogicalRange() ?? null; } catch { return null; }
    };
    onRegisterRangeSetterRef.current?.(setter, getter);
  }, []); // eslint-disable-line

  // ── Drawing drag — document-level so drag works outside the SVG boundary ──
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

      // Convert canvas x → time. Three tiers:
      // 1. coordinateToTime  — exact, only works for existing bar timestamps
      // 2. coordinateToLogical + data lookup — works for any x within visible range
      // 3. visible-range extrapolation — for x outside the chart canvas (price-scale area)
      const getTimeFromX = (xCoord) => {
        const direct = chart.timeScale().coordinateToTime?.(xCoord);
        if (direct != null) return Number(direct);
        const data = candleDataRef.current;
        if (!data?.length) return null;
        const itvl = data.length > 1 ? data[1].time - data[0].time : 3600;
        const lastIdx = data.length - 1;
        const logIdx = chart.timeScale().coordinateToLogical(xCoord);
        if (logIdx != null) {
          const idx = Math.round(logIdx);
          if (idx < 0) return data[0].time;
          if (idx < data.length) return data[idx].time;
          return data[lastIdx].time + (idx - lastIdx) * itvl;
        }
        // Off-screen (cursor in price-scale or outside SVG): extrapolate via bar width
        const range = chart.timeScale().getVisibleLogicalRange();
        if (!range) return null;
        const svgW = svg.getBoundingClientRect().width;
        const barWidth = svgW / (range.to - range.from);
        const logicalFromX = range.from + xCoord / barWidth;
        const idx = Math.round(logicalFromX);
        if (idx < 0) return data[0].time;
        if (idx < data.length) return data[idx].time;
        return data[lastIdx].time + (idx - lastIdx) * itvl;
      };

      // R/R handle: SL or TP price line
      if (drag.field === "sl" || drag.field === "tp") {
        const p = main.coordinateToPrice(y);
        if (p != null) onDrawingUpdateRef.current?.(drag.drawingId, { [drag.field]: p });

      // R/R handle: right-edge time
      } else if (drag.field === "endTime") {
        const t = getTimeFromX(x);
        if (t != null) onDrawingUpdateRef.current?.(drag.drawingId, { endTime: t });

      // Fibonacci handles: p1 or p2 endpoint
      } else if (drag.field === "p1" || drag.field === "p2") {
        const rawT = getTimeFromX(x);
        const p = main.coordinateToPrice(y);
        if (rawT != null && p != null) {
          onDrawingUpdateRef.current?.(drag.drawingId, { [drag.field]: { time: rawT, price: p } });
        }

      // Multi-point trendline: drag a single vertex of the path
      } else if (drag.field === "point_resize") {
        const rawT = getTimeFromX(x);
        const p = main.coordinateToPrice(y);
        if (rawT != null && p != null) {
          const d = userDrawingsRef.current.find((dd) => dd.id === drag.drawingId);
          if (d?.points?.length) {
            onDrawingUpdateRef.current?.(drag.drawingId, {
              points: d.points.map((pt, i) =>
                i === drag.pointIndex ? { time: rawT, price: p } : pt
              ),
            });
          }
        }

      // Resize handles: drag individual endpoint of segment/trendline/ray/rectangle
      } else if (drag.field === "p1_resize" || drag.field === "p2_resize") {
        const rawT = getTimeFromX(x);
        const p = main.coordinateToPrice(y);
        if (rawT != null && p != null) {
          const key = drag.field === "p1_resize" ? "p1" : "p2";
          onDrawingUpdateRef.current?.(drag.drawingId, { [key]: { time: rawT, price: p } });
        }

      // Move entire drawing
      } else if (drag.field === "move") {
        const dx = e.clientX - drag.startClientX;
        const dy = e.clientY - drag.startClientY;
        if (!drag.hasMoved && Math.abs(dx) + Math.abs(dy) < 5) return;
        drag.hasMoved = true;

        // Track last valid logical so entering the price-scale area (where
        // coordinateToLogical returns null) doesn't snap the drawing back to its
        // original position.
        const rawLogical = chart.timeScale().coordinateToLogical(x);
        const logicalNow = rawLogical ?? (drag.lastValidLogical ?? drag.startLogical);
        if (rawLogical != null) drag.lastValidLogical = rawLogical;
        // Shift times by whole bars (gap-aware) instead of seconds — adding
        // `bars * interval` seconds lands on non-existent timestamps when the
        // drag crosses a weekend/session gap, which misplaces the drawing.
        const dBars = Math.round(logicalNow - drag.startLogical);
        const shiftT = (t) => shiftTimeByBars(candleDataRef.current, t, dBars);
        const priceNow = main.coordinateToPrice(y) ?? 0;
        // Use startClientY to compute cursor's original price (works for all drawing types)
        const cursorStartPrice = main.coordinateToPrice(drag.startClientY - rect.top) ?? 0;
        const priceDelta = priceNow - cursorStartPrice;

        if (drag.drawingType === "freehand" && drag.startPoints) {
          const isPixelFmt = drag.startPoints[0] && "xFrac" in drag.startPoints[0];
          if (isPixelFmt) {
            const svgW2 = rect.width || 1, svgH2 = rect.height || 1;
            const dxFrac = (e.clientX - drag.startClientX) / svgW2;
            const dyFrac = (e.clientY - drag.startClientY) / svgH2;
            onDrawingUpdateRef.current?.(drag.drawingId, {
              points: drag.startPoints.map(({ xFrac, yFrac }) => ({
                xFrac: xFrac + dxFrac,
                yFrac: yFrac + dyFrac,
              })),
            });
          } else {
            const dLogical = logicalNow - drag.startLogical;
            onDrawingUpdateRef.current?.(drag.drawingId, {
              points: drag.startPoints.map(({ logicalIdx, price }) => ({
                logicalIdx: logicalIdx + dLogical,
                price: price + priceDelta,
              })),
            });
          }
        } else if (drag.drawingType === "vline") {
          onDrawingUpdateRef.current?.(drag.drawingId, { time: shiftT(drag.startTime) });
        } else if (drag.drawingType === "hline") {
          // drag.startPrice = drawing's initial price (set via extraState)
          onDrawingUpdateRef.current?.(drag.drawingId, { price: drag.startPrice + priceDelta });
        } else if (drag.drawingType === "text") {
          onDrawingUpdateRef.current?.(drag.drawingId, {
            time:  shiftT(drag.startP1.time),
            price: drag.startP1.price + priceDelta,
          });
        } else if (drag.drawingType === "rr") {
          onDrawingUpdateRef.current?.(drag.drawingId, {
            time:    shiftT(drag.startTime),
            endTime: shiftT(drag.startEndTime),
            entry:   drag.startEntry   + priceDelta,
            sl:      drag.startSl      + priceDelta,
            tp:      drag.startTp      + priceDelta,
          });
        } else if (drag.startTPoints) {
          // Multi-point trendline — shift every vertex by bars + price delta
          onDrawingUpdateRef.current?.(drag.drawingId, {
            points: drag.startTPoints.map(({ time, price }) => ({
              time: shiftT(time),
              price: price + priceDelta,
            })),
          });
        } else if (drag.startP1 && drag.startP2) {
          onDrawingUpdateRef.current?.(drag.drawingId, {
            p1: { time: shiftT(drag.startP1.time), price: drag.startP1.price + priceDelta },
            p2: { time: shiftT(drag.startP2.time), price: drag.startP2.price + priceDelta },
          });
        }

        // ── Edge scroll: auto-scroll chart when dragging near left/right edges ──
        // Allows drawings to be dragged into future or past dates beyond the
        // current visible range. Rate-limited to avoid excessive scrolling.
        const EDGE_PX = 50;
        const now = Date.now();
        if (!drag._lastEdgeScroll || now - drag._lastEdgeScroll > 80) {
          const nearLeft = x < EDGE_PX;
          const nearRight = x > rect.width - EDGE_PX;
          if (nearLeft || nearRight) {
            const range = chart.timeScale().getVisibleLogicalRange();
            if (range) {
              const dir = nearLeft ? -1 : 1;
              applyingRangeRef.current = true;
              chart.timeScale().setVisibleLogicalRange({ from: range.from + dir, to: range.to + dir });
              setTimeout(() => { applyingRangeRef.current = false; }, 80);
              drag._lastEdgeScroll = now;
              // Keep lastValidLogical in sync with the scroll so next frame's
              // delta continues from the correct position rather than snapping.
              if (drag.lastValidLogical != null) drag.lastValidLogical += dir;
            }
          }
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
  // useChartSetup applies the same settings right after the chart is
  // (re)created — this effect alone misses that case because the chart is
  // built asynchronously when candle data arrives.
  useEffect(() => {
    applyChartSettings(chartRef.current, seriesRef.current.main, chartSettings, isDarkRef.current);
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
    // Hide lines for orders entered after the replay cursor (date cut / seek back)
    const cutoff = candleData?.[Math.min(visibleCount || 1, candleData?.length ?? 1) - 1]?.time ?? Infinity;
    positions.forEach((pos) => {
      if (pos.timestamp && pos.timestamp > cutoff) return;
      const sideColor = pos.side === "buy" ? T.up : T.down;
      const addLine = (price, color, label, lineStyle, posId, field) => {
        try {
          // Label is drawn by the DOM overlay, vertically centered on the line
          // (the native `title` renders offset above it)
          const line = main.createPriceLine({
            price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title: "",
            draggable: field !== "entry", // TP and SL are draggable; entry is not
          });
          positionLineRefs.current.push({ line, posId, field, label });
        } catch {}
      };
      addLine(pos.entryPrice, sideColor, `${pos.side.toUpperCase()} ×${pos.size}`, 2, pos.id, "entry");
      if (pos.takeProfit !== null) addLine(pos.takeProfit, "#089981", "Take Profit", 1, pos.id, "takeProfit");
      if (pos.stopLoss   !== null) addLine(pos.stopLoss,   "#f23645", "Stop Loss", 1, pos.id, "stopLoss");
    });
    updatePreviewLabelsRef.current();
  }, [positions, visibleCount, candleData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trade arrows — blue arrow where the entry filled; exit arrow blue when
  // TP (or manual close) ended the trade, red when the stop loss was hit ──
  const tradeMarkersRef = useRef(null); // { main, primitive }
  useEffect(() => {
    const main = seriesRef.current.main;
    if (!main || !candleData?.length) return;
    const nearestTime = (t) => {
      let best = candleData[0].time, diff = Infinity;
      for (let i = 0; i < candleData.length; i++) {
        const d = Math.abs(candleData[i].time - t);
        if (d < diff) { diff = d; best = candleData[i].time; }
        if (candleData[i].time > t) break; // ascending — no closer match ahead
      }
      return best;
    };
    // Arrows only exist up to the replay cursor — seeking/cutting back before
    // an order's entry hides it until the replay reaches that point again
    const cutoff = candleData[Math.min(visibleCount || 1, candleData.length) - 1]?.time ?? Infinity;
    const markers = [];
    const entryArrow = (t, side) => ({
      time: nearestTime(t),
      position: side === "buy" ? "belowBar" : "aboveBar",
      color: "#1E53E5",
      shape: side === "buy" ? "arrowUp" : "arrowDown",
      text: "",
      size: 1,
    });
    positions.forEach((pos) => {
      if (pos.timestamp && pos.timestamp <= cutoff) markers.push(entryArrow(pos.timestamp, pos.side));
    });
    trades.forEach((tr) => {
      if (tr.timestamp && tr.timestamp <= cutoff) markers.push(entryArrow(tr.timestamp, tr.side));
      const exitT = tr.exitTime ?? tr.timestamp;
      if (exitT && exitT <= cutoff) {
        markers.push({
          time: nearestTime(exitT),
          position: tr.side === "buy" ? "aboveBar" : "belowBar",
          color: tr.exitReason === "SL" ? "#f23645" : "#1E53E5",
          shape: tr.side === "buy" ? "arrowDown" : "arrowUp",
          text: tr.exitReason || "",
          size: 1,
        });
      }
    });
    markers.sort((a, b) => a.time - b.time);
    // The chart (and its series) is rebuilt when candleData changes — recreate
    // the markers primitive whenever it belongs to a stale series
    if (tradeMarkersRef.current?.main === main) {
      tradeMarkersRef.current.primitive.setMarkers(markers);
    } else {
      tradeMarkersRef.current = { main, primitive: createSeriesMarkers(main, markers) };
    }
  }, [trades, positions, candleData, visibleCount]);

  // ── Order preview line name labels — DOM pills pinned to each line's Y, so
  // the name sits right at the line, vertically centered on its left side
  // (lightweight-charts' own `title` renders offset above the line) ──
  const previewLabelsRef = useRef(null);
  const updatePreviewLabels = () => {
    const wrap = previewLabelsRef.current;
    if (!wrap) return;
    wrap.innerHTML = "";
    const main = seriesRef.current.main;
    if (!main) return;
    const NAMES = { entry: "Entry", takeProfit: "Take Profit", stopLoss: "Stop Loss" };
    const labelled = [
      ...previewLineRefs.current.map((l) => ({ ...l, label: NAMES[l.field] || l.field })),
      ...positionLineRefs.current,
    ];
    if (labelled.length === 0) return;
    // Sit just left of the price axis — the order panel floats over the chart's
    // left side and would cover labels placed there
    let rightInset = 78;
    try {
      const paneW = chartRef.current?.timeScale().width();
      if (paneW) rightInset = wrap.clientWidth - paneW + 8;
    } catch { /* chart disposed */ }
    labelled.forEach(({ line, label }) => {
      let y, color;
      try {
        const o = line.options();
        y = main.priceToCoordinate(o.price);
        color = o.color;
      } catch { return; }
      if (y == null) return;
      const el = document.createElement("div");
      el.textContent = label;
      el.style.cssText =
        `position:absolute;right:${rightInset}px;top:${y}px;transform:translateY(-50%);` +
        `font-size:10px;font-weight:700;line-height:1;padding:2px 6px;border-radius:4px;` +
        `pointer-events:none;color:#ffffff;background:${color};opacity:0.95;` +
        `font-family:'Trebuchet MS',Roboto,sans-serif;white-space:nowrap;`;
      wrap.appendChild(el);
    });
  };
  const updatePreviewLabelsRef = useRef(updatePreviewLabels);
  updatePreviewLabelsRef.current = updatePreviewLabels;

  // ── Order panel preview lines — entry/TP/SL shown before placing an order ──
  useEffect(() => {
    const { main } = seriesRef.current;
    if (!main) return;
    previewLineRefs.current.forEach(({ line }) => {
      try { main.removePriceLine(line); } catch {}
    });
    previewLineRefs.current = [];
    if (!orderPreview) { updatePreviewLabelsRef.current(); return; }
    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    const sideColor = orderPreview.side === "buy" ? T.up : T.down;
    const addLine = (price, color, lineStyle, field) => {
      try {
        // Names are rendered by the DOM label overlay, centered on the line
        const line = main.createPriceLine({
          price, color, lineWidth: 1, lineStyle, axisLabelVisible: true, title: "",
          draggable: field !== "entry",
        });
        previewLineRefs.current.push({ line, field });
      } catch {}
    };
    addLine(orderPreview.entryPrice, sideColor, 0, "entry");
    if (orderPreview.takeProfit !== null) addLine(orderPreview.takeProfit, "#089981", 1, "takeProfit");
    if (orderPreview.stopLoss !== null) addLine(orderPreview.stopLoss, "#f23645", 1, "stopLoss");
    updatePreviewLabelsRef.current();
  }, [orderPreview]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the preview name labels glued to their lines through pan/zoom/replay
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const sync = () => updatePreviewLabelsRef.current();
    const ts = chart.timeScale();
    ts.subscribeVisibleTimeRangeChange(sync);
    chart.subscribeCrosshairMove(sync);
    return () => {
      try { ts.unsubscribeVisibleTimeRangeChange(sync); } catch {}
      try { chart.unsubscribeCrosshairMove(sync); } catch {}
    };
  }, [candleData]);
  useEffect(() => { updatePreviewLabelsRef.current(); }, [visibleCount]);

  // ── Live overlay sync while the price axis is dragged/stretched ──
  // Vertical rescaling fires no time-scale events, so drawings and labels
  // otherwise only snap into place on mouseup. Track any press inside the
  // chart (pane or axis) and redraw the overlays once per frame while it moves.
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    let dragging = false;
    let rafId = null;
    const tick = () => {
      rafId = null;
      updateSvgDrawingsRef.current?.();
      updatePreviewLabelsRef.current?.();
    };
    const schedule = () => { if (rafId == null) rafId = requestAnimationFrame(tick); };
    const onDown = () => { dragging = true; };
    const onMove = () => { if (dragging) schedule(); };
    const onUp = () => { dragging = false; };
    const onWheel = () => schedule(); // wheel over the price axis rescales too
    wrapper.addEventListener("mousedown", onDown);
    wrapper.addEventListener("wheel", onWheel, { passive: true });
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      wrapper.removeEventListener("mousedown", onDown);
      wrapper.removeEventListener("wheel", onWheel);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [candleData]);

  // ── TP/SL price-line drag — lightweight-charts has no draggable price lines
  // (the `draggable` option is ignored), so hit-test the cursor against the
  // TP/SL line positions and move the line manually while the button is held ──
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const HIT_PX = 6;

    const findLineAt = (y) => {
      const main = seriesRef.current.main;
      if (!main) return null;
      const candidates = [
        ...positionLineRefs.current.map((l) => ({ ...l, source: "position" })),
        ...previewLineRefs.current.map((l) => ({ ...l, source: "preview" })),
      ].filter((l) => l.field !== "entry");
      for (const c of candidates) {
        try {
          const ly = main.priceToCoordinate(c.line.options().price);
          if (ly != null && Math.abs(ly - y) <= HIT_PX) return c;
        } catch {}
      }
      return null;
    };

    const onDown = (e) => {
      if (e.button !== 0 || drawingModeRef.current) return;
      const rect = wrapper.getBoundingClientRect();
      const hit = findLineAt(e.clientY - rect.top);
      if (!hit) return;
      // Capture-phase stop so the chart never starts panning from this press
      e.preventDefault();
      e.stopPropagation();
      priceLineDragRef.current = hit;
      try {
        chartRef.current?.applyOptions({
          handleScroll: { mouseWheel: true, pressedMouseMove: false, horzTouchDrag: false, vertTouchDrag: false },
        });
      } catch {}
    };

    const onMove = (e) => {
      const rect = wrapper.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const drag = priceLineDragRef.current;
      if (drag) {
        const p = seriesRef.current.main?.coordinateToPrice(y);
        if (p != null && isFinite(p)) {
          try { drag.line.applyOptions({ price: p }); } catch {}
          updatePreviewLabelsRef.current(); // labels follow both preview and position lines
        }
        return;
      }
      // Hover hint — ns-resize cursor when over a draggable TP/SL line
      // (only while the cursor is actually inside the chart area)
      if (
        !drawingModeRef.current && !svgDraggingRef.current &&
        e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom
      ) {
        wrapper.style.cursor = findLineAt(y) ? "ns-resize" : "";
      }
    };

    const onUp = () => {
      const drag = priceLineDragRef.current;
      if (!drag) return;
      priceLineDragRef.current = null;
      try {
        chartRef.current?.applyOptions({
          handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
        });
      } catch {}
      try {
        const price = drag.line.options().price;
        if (typeof price === "number" && isFinite(price)) {
          if (drag.source === "position") {
            onPositionUpdateRef.current?.(drag.posId, drag.field, String(price));
          } else {
            onOrderPreviewUpdateRef.current?.(drag.field, price);
          }
        }
      } catch {}
    };

    wrapper.addEventListener("mousedown", onDown, true);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      wrapper.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []); // stable — reads everything through refs

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
        try { chartRef.current.priceScale('right').applyOptions({ autoScale: true }); } catch {}
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Chart creation — runs only when candleData changes (new session / new timeframe) ──
  useChartSetup({
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
    selectedDrawingIdsRef,
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
  });

  // ── Timezone + attribution logo — re-applied after every chart rebuild ──
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.applyOptions({
      ...(timezone ? tzChartOptions(timezone) : {}),
      layout: { attributionLogo: !hideAttribution },
    });
  }, [timezone, hideAttribution, candleData]);

  // ── Report right price-scale width so the page can size/align UI (e.g. the
  // timezone dropdown) flush under this window's price column. Fires on init,
  // chart resize, and zoom (price-label digit count can change the width). ──
  const onPriceScaleWidthRef = useRef(onPriceScaleWidth);
  onPriceScaleWidthRef.current = onPriceScaleWidth;
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !onPriceScaleWidthRef.current) return;
    let raf = null;
    const report = () => {
      try {
        const w = chart.priceScale("right").width();
        if (w) onPriceScaleWidthRef.current(Math.round(w));
      } catch { /* chart disposed */ }
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(report);
    };
    report();
    const ts = chart.timeScale();
    ts.subscribeSizeChange(schedule);
    ts.subscribeVisibleLogicalRangeChange(schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { ts.unsubscribeSizeChange(schedule); } catch {}
      try { ts.unsubscribeVisibleLogicalRangeChange(schedule); } catch {}
    };
  }, [candleData]);

  // ── Brush mode: disable chart panning so dragging draws the stroke ──
  // With pressedMouseMove enabled, the chart pans along with the cursor and the
  // recorded stroke collapses into a near-vertical/horizontal line.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const brushing = drawingMode === "brush";
    chart.applyOptions({
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: !brushing,
        horzTouchDrag: !brushing,
        vertTouchDrag: !brushing,
      },
    });
  }, [drawingMode, candleData]);

  // ── Replay — efficient single-candle append ──
  useEffect(() => {
    const { main, vol, ema20s, ema50s } = seriesRef.current;
    if (!main || !candleData?.length) return;

    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    const target = Math.min(visibleCount || 1, candleData.length);
    const last = lastRef.current;

    const isSeek = target - last > 1 || target < last;

    if (isSeek) {
      // Seek (backward or multi-candle forward jump): setData is O(n) and a single render
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

    // Single-candle step-forward (play / next button): use update() for smooth appending
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

  // ── Candle-formation replay: draw the partially-formed next candle ──
  // Declared after the replay effect so a completed candle is committed by the
  // replay path before this one decides whether the partial bar must be removed.
  const formingShownRef = useRef(null);
  useEffect(() => {
    const { main, vol } = seriesRef.current;
    if (!main) return;
    const T = isDarkRef.current ? TV_DARK : TV_LIGHT;
    if (formingCandle) {
      main.update(formingCandle);
      vol?.update({
        time: formingCandle.time,
        value: formingCandle.volume || 0,
        color: formingCandle.close >= formingCandle.open ? T.volUp : T.volDown,
      });
      formingShownRef.current = formingCandle.time;
      return;
    }
    // Forming cleared — drop the partial bar unless it just became a committed candle
    if (formingShownRef.current != null) {
      const lastCommitted = candleData?.[lastRef.current - 1]?.time;
      if (lastCommitted == null || formingShownRef.current > lastCommitted) {
        const savedRange = chartRef.current?.timeScale().getVisibleLogicalRange();
        const slice = candleData?.slice(0, lastRef.current) ?? [];
        main.setData(slice);
        vol?.setData(slice.map((d) => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? T.volUp : T.volDown,
        })));
        if (savedRange) chartRef.current?.timeScale().setVisibleLogicalRange(savedRange);
      }
      formingShownRef.current = null;
    }
  }, [formingCandle, candleData]);

  return (
    <div className="relative w-full h-full" style={{ background: isDark ? TV_DARK.bg : TV_LIGHT.bg }}>
      {/* OHLCV info bar — top-left, TradingView style. Hidden on inactive charts. */}
      <div
        ref={ohlcBarRef}
        className="absolute top-2 left-3 z-10 flex items-center pointer-events-none select-none"
        style={{ opacity: 0, gap: 6, width: "fit-content", color: isDark ? TV_DARK.textMuted : TV_LIGHT.textMuted, fontFamily: "'Trebuchet MS', Roboto, sans-serif", fontSize: 10 }}
      >
        {symbol && (
          <span style={{ fontWeight: 700, marginRight: 2, color: isDark ? TV_DARK.text : TV_LIGHT.text }}>
            {symbol}
          </span>
        )}
        <span>O&thinsp;<span ref={ohlcOpenRef} style={{ fontWeight: 600 }} /></span>
        <span>H&thinsp;<span ref={ohlcHighRef} style={{ fontWeight: 600 }} /></span>
        <span>L&thinsp;<span ref={ohlcLowRef}  style={{ fontWeight: 600 }} /></span>
        <span>C&thinsp;<span ref={ohlcCloseRef} style={{ fontWeight: 600 }} /></span>
        <span ref={ohlcChangeRef} style={{ fontWeight: 600 }} />
      </div>

      {/* SVG overlay — user drawings. Must have pointer-events:none so it doesn't block
           chart scroll/drag/click. Child elements override this with pointer-events:stroke. */}
      <svg ref={svgRef} className="absolute inset-0" style={{ zIndex: 6, width: "100%", height: "100%", pointerEvents: "none" }} />

      {/* Brush stroke live preview SVG — separate from drawing SVG to avoid full rebuild on each point */}
      <svg ref={brushSvgRef} className="absolute inset-0" style={{ zIndex: 7, width: "100%", height: "100%", pointerEvents: "none" }} />

      {/* Order preview line name labels (Entry / TP / SL) — positioned imperatively */}
      <div ref={previewLabelsRef} className="absolute inset-0" style={{ zIndex: 8, pointerEvents: "none" }} />

      {/* Drawing mode hint — bottom right, only when a tool is active */}
      {drawingMode && drawingMode !== "eraser" && drawingMode !== "selector" && (
        <div
          className="absolute bottom-8 right-3 z-10 text-xs pointer-events-none select-none"
          style={{ color: isDark ? TV_DARK.border : TV_LIGHT.border, fontFamily: "'Trebuchet MS', Roboto, sans-serif" }}
        >
          {drawingMode === "trendline" ? "Click to add points — double-click to finish" :
           drawingMode === "ray" ? "Click to place ray start" :
           drawingMode === "segment" ? (drawingStateRef.current ? "Click to set end point" : "Click to set start point") :
           drawingMode === "rectangle" ? "Click to place first corner" :
           drawingMode === "fibonacci" ? "Click first point of retracement" :
           drawingMode === "text" ? "Click to place text label" :
           drawingMode === "hline" ? "Click to draw horizontal line" :
           drawingMode === "vline" ? "Click to draw vertical line" :
           drawingMode === "buy_marker" ? "Click candle to mark buy entry" :
           drawingMode === "sell_marker" ? "Click candle to mark sell entry" :
           drawingMode === "rr" ? (drawingStateRef.current ? "Click to set stop loss (TP auto 2:1)" : "Click to set entry price") :
           drawingMode === "brush" ? "Click and drag to draw freehand" : ""}
        </div>
      )}

      {/* Chart mount point — fills parent */}
      <div ref={wrapperRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Floating line properties panel — position tracked by updateSvgDrawings via propsPanelRef ── */}
      <DrawingPropertiesPanel
        panelDrawing={panelDrawing}
        isDark={isDark}
        onPropertyChange={onPropertyChange}
        propsPanelRef={propsPanelRef}
      />

      {/* Inline text editor — overlaid exactly on the text drawing box on double-click */}
      {inlineEdit && (
        <input
          type="text"
          autoFocus
          data-testid="text-label-inline-input"
          value={inlineEdit.value}
          onFocus={(e) => { if (inlineEdit.selectOnFocus) e.target.select(); }}
          onChange={(e) => setInlineEdit((prev) => ({ ...prev, value: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onPropertyChange?.(inlineEdit.id, { label: inlineEdit.value });
              setInlineEdit(null);
            } else if (e.key === "Escape") {
              setInlineEdit(null);
            }
          }}
          onBlur={() => {
            onPropertyChange?.(inlineEdit.id, { label: inlineEdit.value });
            setInlineEdit(null);
          }}
          style={{
            position: "fixed",
            left: inlineEdit.x,
            top: inlineEdit.y,
            // Width tracks the measured text width + padding (6px each side +
            // caret room) so the box hugs the content — no dead space on the right.
            width: Math.max(measureLabelWidth(inlineEdit.value, inlineEdit.fontSize) + 16, 30),
            height: inlineEdit.height,
            zIndex: 9999,
            background: isDark ? "rgba(19,23,34,0.96)" : "rgba(255,255,248,0.96)",
            // Dashed blue border signals edit mode — matches selection highlight colour
            border: "2px dashed #60a5fa",
            borderRadius: 3,
            outline: "none",
            boxSizing: "border-box",
            color: inlineEdit.color,
            fontSize: inlineEdit.fontSize,
            fontFamily: "'Trebuchet MS', Roboto, sans-serif",
            fontWeight: 600,
            padding: "1px 6px",
            caretColor: inlineEdit.color,
          }}
        />
      )}
    </div>
  );
};

export default BacktestChart;
