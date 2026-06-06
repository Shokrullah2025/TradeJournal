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
  if (candleData.length < 2) return 50;
  const intervalSec = candleData[1].time - candleData[0].time;
  if (intervalSec <=    60) return 120;  // 1m  → ~2 hours
  if (intervalSec <=   300) return  48;  // 5m  → ~4 hours
  if (intervalSec <=   900) return  32;  // 15m → ~8 hours
  if (intervalSec <=  1800) return  24;  // 30m → ~12 hours
  if (intervalSec <=  3600) return  72;  // 1h  → ~3 days
  if (intervalSec <= 14400) return  42;  // 4h  → ~1 week
  return 44;                             // 1d  → ~2 months
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
  // { line, posId, field } — tracks each drawn position price line
  const positionLineRefs = useRef([]);
  // { line, field } — tracks order-panel preview price lines (shown before order is placed)
  const previewLineRefs = useRef([]);
  // { line, id } — user-drawn horizontal price lines
  const userHLineRefs = useRef([]);
  // SVG overlay for trend lines
  const svgRef = useRef(null);
  // Drawing mode / state
  const drawingModeRef = useRef(null);
  const drawingStateRef = useRef(null);   // first point when drawing a trendline
  const previewPointRef = useRef(null);   // current mouse position for trendline preview
  const userDrawingsRef = useRef([]);
  const updateSvgDrawingsRef = useRef(() => {});

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
  useEffect(() => { drawingModeRef.current = drawingMode; drawingStateRef.current = null; }, [drawingMode]);

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
          lineWidth: 1, lineStyle: 0, axisLabelVisible: true, title: "", draggable: false,
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
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
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

      userDrawingsRef.current.forEach((drawing) => {
        // Vertical line
        if (drawing.type === "vline") {
          const x = ts.logicalToCoordinate(drawing.logicalIndex);
          if (x == null) return;
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", x); el.setAttribute("y1", 0);
          el.setAttribute("x2", x); el.setAttribute("y2", svgH);
          el.setAttribute("stroke", drawing.color || "#f7a600");
          el.setAttribute("stroke-width", "1.5");
          el.setAttribute("stroke-dasharray", "4,3");
          el.style.cursor = "pointer";
          el.style.pointerEvents = "stroke";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            if (!drawingModeRef.current || drawingModeRef.current === "eraser")
              onDrawingDeleteRef.current?.(drawing.id);
          });
          svg.appendChild(el);
          return;
        }

        if (drawing.type !== "trendline") return;
        const x1 = ts.logicalToCoordinate(drawing.p1.logicalIndex);
        const y1 = mn.priceToCoordinate(drawing.p1.price);
        const x2 = ts.logicalToCoordinate(drawing.p2.logicalIndex);
        const y2 = mn.priceToCoordinate(drawing.p2.price);
        if (x1 == null || y1 == null || x2 == null || y2 == null) return;

        // Extend line to full chart width
        const dx = x2 - x1, dy = y2 - y1;
        let lx1 = x1, ly1 = y1, lx2 = x2, ly2 = y2;
        if (Math.abs(dx) > 0.5) {
          const slope = dy / dx;
          lx1 = 0;    ly1 = y1 + slope * (0 - x1);
          lx2 = svgW; ly2 = y1 + slope * (svgW - x1);
        }

        const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
        el.setAttribute("x1", lx1); el.setAttribute("y1", ly1);
        el.setAttribute("x2", lx2); el.setAttribute("y2", ly2);
        el.setAttribute("stroke", drawing.color || "#1E53E5");
        el.setAttribute("stroke-width", "1.5");
        el.style.cursor = "pointer";
        el.style.pointerEvents = "stroke";
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!drawingModeRef.current || drawingModeRef.current === "eraser")
            onDrawingDeleteRef.current?.(drawing.id);
        });
        svg.appendChild(el);

        // Anchor dots at the two clicked points
        [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", cx); dot.setAttribute("cy", cy); dot.setAttribute("r", "3");
          dot.setAttribute("fill", drawing.color || "#1E53E5");
          dot.style.pointerEvents = "none";
          svg.appendChild(dot);
        });
      });

      // Dashed preview while placing second trendline point
      if (drawingModeRef.current === "trendline" && drawingStateRef.current && previewPointRef.current) {
        const p1 = drawingStateRef.current;
        const ax = ts.logicalToCoordinate(p1.logicalIndex);
        const ay = mn.priceToCoordinate(p1.price);
        if (ax != null && ay != null) {
          const el = document.createElementNS("http://www.w3.org/2000/svg", "line");
          el.setAttribute("x1", ax); el.setAttribute("y1", ay);
          el.setAttribute("x2", previewPointRef.current.x);
          el.setAttribute("y2", previewPointRef.current.y);
          el.setAttribute("stroke", "#1E53E5");
          el.setAttribute("stroke-width", "1.5");
          el.setAttribute("stroke-dasharray", "5,4");
          el.style.pointerEvents = "none";
          svg.appendChild(el);
          const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          dot.setAttribute("cx", ax); dot.setAttribute("cy", ay); dot.setAttribute("r", "3");
          dot.setAttribute("fill", "#1E53E5"); dot.style.pointerEvents = "none";
          svg.appendChild(dot);
        }
      }
    };
    updateSvgDrawingsRef.current = updateSvgDrawings;
    chart.timeScale().subscribeVisibleLogicalRangeChange(updateSvgDrawings);

    // Click-to-seek, or record drawing points when a tool is active
    chart.subscribeClick((param) => {
      if (drawingModeRef.current) {
        if (!param.point || !param.time) return;
        const price = main?.coordinateToPrice(param.point.y);
        if (price == null) return;
        const t = typeof param.time === "number" ? param.time : Number(param.time);
        let logicalIndex = candleData.findIndex((c) => c.time === t);
        if (logicalIndex === -1) {
          let minDiff = Infinity;
          candleData.forEach((c, i) => { const d = Math.abs(c.time - t); if (d < minDiff) { minDiff = d; logicalIndex = i; } });
        }
        if (drawingModeRef.current === "hline") {
          onDrawingAddRef.current?.({ type: "hline", price, color: "#1E53E5" });
        } else if (drawingModeRef.current === "vline") {
          onDrawingAddRef.current?.({ type: "vline", logicalIndex, color: "#f7a600" });
        } else if (drawingModeRef.current === "trendline") {
          if (!drawingStateRef.current) {
            drawingStateRef.current = { price, logicalIndex };
          } else {
            const p1 = drawingStateRef.current;
            onDrawingAddRef.current?.({
              type: "trendline",
              p1: { price: p1.price, logicalIndex: p1.logicalIndex },
              p2: { price, logicalIndex },
              color: "#1E53E5",
            });
            drawingStateRef.current = null;
          }
        }
        return; // don't seek when drawing
      }
      if (!param.time || !onCandleSeekRef.current) return;
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
      // Update trendline drawing preview
      if (param.point) {
        previewPointRef.current = { x: param.point.x, y: param.point.y };
        if (drawingModeRef.current === "trendline" && drawingStateRef.current) {
          updateSvgDrawings();
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
      // Do NOT reset the viewport on backward seek — preserve the user's current scroll/zoom
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
      chartRef.current?.timeScale().scrollToRealTime();
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

      {/* Click-to-seek hint — bottom right, fades on hover */}
      <div
        className="absolute bottom-8 right-3 z-10 text-xs pointer-events-none select-none"
        style={{ color: isDark ? TV_DARK.border : TV_LIGHT.border, fontFamily: "'Trebuchet MS', Roboto, sans-serif" }}
      >
        {drawingMode === "trendline" ? (drawingMode && !drawingModeRef.current ? "" : "Click to place first point") :
         drawingMode === "hline" ? "Click to draw horizontal line" :
         "Click candle to set replay point"}
      </div>

      {/* Chart mount point — fills parent */}
      <div ref={wrapperRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default BacktestChart;
