import { describe, it, expect } from "vitest";
import {
  buildIndicatorContext,
  evaluateSignalAt,
  computeLiveSignal,
  WARMUP_BARS,
  ATR_STOP_MULT,
  ATR_TARGET_MULT,
} from "./engine";

const candle = (time, o, h, l, c, v = 1000) => ({
  time, open: o, high: h, low: l, close: c, volume: v,
});

// Injecting a hand-built indicator context lets each rule be pinned exactly,
// independent of indicator warm-up mechanics (covered in indicators.test.js).
function ctxAt(i, values) {
  const arr = (v) => {
    const a = new Array(i + 1).fill(null);
    a[i] = v;
    return a;
  };
  return {
    ema20: arr(values.ema20),
    ema50: arr(values.ema50),
    rsi14: arr(values.rsi14),
    atr14: arr(values.atr14),
    volRatio20: arr(values.volRatio ?? null),
    prevDayHigh: arr(values.prevDayHigh ?? null),
    prevDayLow: arr(values.prevDayLow ?? null),
  };
}

function seriesEndingWith(i, close) {
  const candles = [];
  for (let k = 0; k <= i; k++) candles.push(candle(k * 86400, close, close + 1, close - 1, close));
  return candles;
}

const I = WARMUP_BARS; // evaluate at the first post-warm-up index

describe("evaluateSignalAt", () => {
  it("fires a full-confluence LONG with ATR-based levels on 1d", () => {
    const ctx = ctxAt(I, {
      ema20: 105, ema50: 100, rsi14: 60, atr14: 4,
      volRatio: 1.5, prevDayHigh: 104, prevDayLow: 90,
    });
    const candles = seriesEndingWith(I, 106);
    const sig = evaluateSignalAt(candles, I, ctx, "1d");

    expect(sig.direction).toBe("long");
    expect(sig.maxScore).toBe(90); // no session factor on 1d
    expect(sig.score).toBe(90);
    expect(sig.confluencePct).toBe(100);
    expect(sig.tier).toBe("high");
    expect(sig.entry).toBe(106);
    expect(sig.stopLoss).toBe(106 - ATR_STOP_MULT * 4);
    expect(sig.takeProfit).toBe(106 + ATR_TARGET_MULT * 4);
    expect(sig.factors.map((f) => f.key)).toEqual([
      "trend", "trendStrength", "momentum", "pullback", "volume", "level",
    ]);
    expect(sig.factors.every((f) => f.passed)).toBe(true);
  });

  it("fires a mirrored SHORT below the prior day low", () => {
    const ctx = ctxAt(I, {
      ema20: 95, ema50: 100, rsi14: 40, atr14: 4,
      volRatio: 1.5, prevDayHigh: 110, prevDayLow: 95,
    });
    const candles = seriesEndingWith(I, 94);
    const sig = evaluateSignalAt(candles, I, ctx, "1d");

    expect(sig.direction).toBe("short");
    expect(sig.confluencePct).toBe(100);
    expect(sig.stopLoss).toBe(94 + ATR_STOP_MULT * 4);
    expect(sig.takeProfit).toBe(94 - ATR_TARGET_MULT * 4);
  });

  it("stays neutral when EMAs are flat (no directional gate)", () => {
    const ctx = ctxAt(I, { ema20: 100, ema50: 100, rsi14: 55, atr14: 4 });
    const sig = evaluateSignalAt(seriesEndingWith(I, 101), I, ctx, "1d");
    expect(sig.direction).toBe("neutral");
    expect(sig.entry).toBeNull();
  });

  it("suppresses a weak setup below the confluence floor but keeps factors", () => {
    // Gate passes, everything else fails, RSI overextended (-10):
    // score = 25 - 10 = 15 → 17% < 50 → neutral.
    const ctx = ctxAt(I, {
      ema20: 105, ema50: 104.9, rsi14: 80, atr14: 4,
      volRatio: 0.8, prevDayHigh: 200, prevDayLow: 10,
    });
    const sig = evaluateSignalAt(seriesEndingWith(I, 110), I, ctx, "1d");
    expect(sig.direction).toBe("neutral");
    expect(sig.tier).toBeNull();
    expect(sig.factors.length).toBeGreaterThan(0);
    expect(sig.confluencePct).toBeLessThan(50);
  });

  it("returns neutral during indicator warm-up", () => {
    const ctx = ctxAt(10, { ema20: 105, ema50: 100, rsi14: 60, atr14: 4 });
    const sig = evaluateSignalAt(seriesEndingWith(10, 106), 10, ctx, "1d");
    expect(sig.direction).toBe("neutral");
  });

  it("rounds entry, stop and target to the contract tick", () => {
    const ctx = ctxAt(I, {
      ema20: 105, ema50: 100, rsi14: 60, atr14: 4.13,
      volRatio: 1.5, prevDayHigh: 104, prevDayLow: 90,
    });
    const contract = { tickSize: 0.25, tickValue: 12.5 };
    const sig = evaluateSignalAt(seriesEndingWith(I, 106.1), I, ctx, "1d", contract);
    for (const p of [sig.entry, sig.stopLoss, sig.takeProfit, ...sig.entryZone]) {
      expect(Math.round(p / 0.25) * 0.25).toBeCloseTo(p, 10);
    }
  });
});

describe("computeLiveSignal", () => {
  // Deterministic pseudo-random walk (fixed linear-congruential seed).
  function generateSeries(n, intervalSec = 86400) {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const candles = [];
    let price = 100;
    for (let i = 0; i < n; i++) {
      const drift = rand() * 2 - 0.8;
      const open = price;
      const close = price + drift;
      candles.push(candle(
        1700000000 + i * intervalSec,
        open,
        Math.max(open, close) + rand(),
        Math.min(open, close) - rand(),
        close,
        800 + Math.round(rand() * 400),
      ));
      price = close;
    }
    return candles;
  }

  it("is deterministic for identical input", () => {
    const candles = generateSeries(200);
    const a = computeLiveSignal(candles, "1d", null, 1800000000);
    const b = computeLiveSignal(candles.map((c) => ({ ...c })), "1d", null, 1800000000);
    expect(a).toEqual(b);
  });

  it("drops a still-forming last bar", () => {
    const candles = generateSeries(200);
    const last = candles[candles.length - 1];
    // `now` inside the last bar's window → evaluate the bar before it
    const forming = computeLiveSignal(candles, "1d", null, last.time + 10);
    expect(forming.time).toBe(candles[candles.length - 2].time);
    // `now` after the last bar closed → evaluate the last bar
    const closed = computeLiveSignal(candles, "1d", null, last.time + 86400 + 10);
    expect(closed.time).toBe(last.time);
  });

  it("returns null when there is not enough history", () => {
    expect(computeLiveSignal(generateSeries(30), "1d", null, 1800000000)).toBeNull();
    expect(computeLiveSignal([], "1d")).toBeNull();
  });
});
