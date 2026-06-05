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
const TV = {
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
  indicators = { ema20: false, ema50: false, volume: true },
  onCandleSeek,
  isPlaying = false,
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

  // ── Indicator visibility — runs when indicator toggles change ──
  useEffect(() => {
    const { ema20s, ema50s, vol } = seriesRef.current;
    if (ema20s) ema20s.applyOptions({ visible: indicators.ema20 });
    if (ema50s) ema50s.applyOptions({ visible: indicators.ema50 });
    if (vol)   vol.applyOptions({ visible: indicators.volume });
  }, [indicators.ema20, indicators.ema50, indicators.volume]);

  // ── Chart creation — runs only when candleData changes (new session / new timeframe) ──
  useEffect(() => {
    if (!wrapperRef.current || !candleData?.length) return;

    ema20Ref.current = calcEMAIndexed(candleData, 20);
    ema50Ref.current = calcEMAIndexed(candleData, 50);

    const chart = createChart(wrapperRef.current, {
      autoSize: true,
      layout: {
        background: { color: TV.bg },
        textColor: TV.text,
        fontSize: 11,
        fontFamily: "'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: TV.grid, style: 0 },
        horzLines: { color: TV.grid, style: 0 },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#758696", width: 1, style: 1, labelBackgroundColor: "#2962ff" },
        horzLine: { color: "#758696", width: 1, style: 1, labelBackgroundColor: "#2962ff" },
      },
      rightPriceScale: {
        borderColor: TV.border,
        scaleMargins: { top: 0.08, bottom: 0.25 },
        textColor: TV.textMuted,
      },
      timeScale: {
        borderColor: TV.border,
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 10,
        minBarSpacing: 3,
        rightOffset: 5,
        textColor: TV.textMuted,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });
    chartRef.current = chart;

    // v5 API: chart.addSeries(SeriesType, options)
    const main = chart.addSeries(CandlestickSeries, {
      upColor: TV.up,
      downColor: TV.down,
      borderUpColor: TV.upBorder,
      borderDownColor: TV.downBorder,
      wickUpColor: TV.up,
      wickDownColor: TV.down,
    });

    const vol = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    const ema20s = chart.addSeries(LineSeries, {
      color: TV.ema20,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      title: "EMA 20",
    });

    const ema50s = chart.addSeries(LineSeries, {
      color: TV.ema50,
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerVisible: false,
      title: "EMA 50",
    });

    seriesRef.current = { main, vol, ema20s, ema50s };

    const count = Math.min(visibleCount || 1, candleData.length);
    const slice = candleData.slice(0, count);

    main.setData(slice);
    vol.setData(
      slice.map((d) => ({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? TV.volUp : TV.volDown,
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
              color: trade.direction === "long" ? TV.up : TV.down,
              shape: trade.direction === "long" ? "arrowUp" : "arrowDown",
              text: `${trade.direction === "long" ? "B" : "S"} ${trade.instrument}`,
              size: 1,
            },
            {
              time: nearest(xT).time,
              position: trade.direction === "long" ? "aboveBar" : "belowBar",
              color: trade.pnl > 0 ? TV.up : TV.down,
              shape: trade.direction === "long" ? "arrowDown" : "arrowUp",
              text: `${trade.pnl > 0 ? "+" : ""}$${trade.pnl.toFixed(2)}`,
              size: 1,
            },
          ];
        })
        .sort((a, b) => a.time - b.time);
      createSeriesMarkers(main, markers);
    }

    // Click-to-seek: clicking a candle sets the replay cut point
    chart.subscribeClick((param) => {
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
      if (!ohlcBarRef.current) return;
      if (!param.time) { ohlcBarRef.current.style.opacity = "0"; return; }
      const d = param.seriesData?.get(main);
      if (!d) return;
      const isUp = d.close >= d.open;
      const color = isUp ? TV.up : TV.down;
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

    const target = Math.min(visibleCount || 1, candleData.length);
    const last = lastRef.current;

    if (target < last) {
      const slice = candleData.slice(0, target);
      main.setData(slice);
      vol.setData(
        slice.map((d) => ({
          time: d.time,
          value: d.volume || 0,
          color: d.close >= d.open ? TV.volUp : TV.volDown,
        }))
      );
      ema20s.setData(ema20Ref.current.slice(0, target).filter(Boolean));
      ema50s.setData(ema50Ref.current.slice(0, target).filter(Boolean));
      lastRef.current = target;
      const win = windowRef.current;
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: target - 1 - win,
        to:   target - 1 + Math.round(win * 0.1),
      });
      return;
    }

    for (let i = last; i < target; i++) {
      const d = candleData[i];
      main.update(d);
      vol.update({
        time: d.time,
        value: d.volume || 0,
        color: d.close >= d.open ? TV.volUp : TV.volDown,
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
    <div className="relative w-full h-full" style={{ background: TV.bg }}>
      {/* OHLCV info bar — top-left, TradingView style */}
      <div
        ref={ohlcBarRef}
        className="absolute top-2 left-3 z-10 flex items-center gap-3 text-xs pointer-events-none select-none"
        style={{ opacity: 0, color: TV.textMuted, fontFamily: "'Trebuchet MS', Roboto, sans-serif" }}
      >
        <span>O&thinsp;<span ref={ohlcOpenRef} style={{ fontWeight: 600 }} /></span>
        <span>H&thinsp;<span ref={ohlcHighRef} style={{ fontWeight: 600 }} /></span>
        <span>L&thinsp;<span ref={ohlcLowRef}  style={{ fontWeight: 600 }} /></span>
        <span>C&thinsp;<span ref={ohlcCloseRef} style={{ fontWeight: 600 }} /></span>
        <span ref={ohlcChangeRef} style={{ fontWeight: 600 }} />
      </div>

      {/* Click-to-seek hint — bottom right, fades on hover */}
      <div
        className="absolute bottom-8 right-3 z-10 text-xs pointer-events-none select-none"
        style={{ color: TV.border, fontFamily: "'Trebuchet MS', Roboto, sans-serif" }}
      >
        Click candle to set replay point
      </div>

      {/* Chart mount point — fills parent */}
      <div ref={wrapperRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};

export default BacktestChart;
