import { describe, it, expect } from "vitest";
import { sma, ema, rsi, atr, priorDayLevels, volumeRatio } from "./indicators";

const candle = (time, o, h, l, c, v = 1000) => ({
  time, open: o, high: h, low: l, close: c, volume: v,
});

describe("sma", () => {
  it("returns nulls during warm-up then correct averages", () => {
    const out = sma([1, 2, 3, 4, 5], 3);
    expect(out).toEqual([null, null, 2, 3, 4]);
  });
  it("returns all nulls when the series is too short", () => {
    expect(sma([1, 2], 3)).toEqual([null, null]);
  });
});

describe("ema", () => {
  it("is SMA-seeded and matches a hand-computed sequence", () => {
    // period 3, k = 0.5. Seed = avg(2,4,6) = 4.
    // next: 8*0.5 + 4*0.5 = 6; next: 10*0.5 + 6*0.5 = 8
    const out = ema([2, 4, 6, 8, 10], 3);
    expect(out).toEqual([null, null, 4, 6, 8]);
  });
});

describe("rsi", () => {
  it("is 100 when every change is a gain", () => {
    const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
    const out = rsi(closes, 14);
    expect(out[13]).toBeNull();
    expect(out[19]).toBe(100);
  });
  it("stays balanced when gains and losses alternate evenly", () => {
    // +1 / -1 forever: Wilder smoothing oscillates in a narrow band around 50
    // (the averages leapfrog each other every bar, so it never equals 50).
    const closes = [100];
    for (let i = 1; i < 300; i++) closes.push(closes[i - 1] + (i % 2 ? 1 : -1));
    const out = rsi(closes, 14);
    expect(out[298]).toBeGreaterThan(45);
    expect(out[298]).toBeLessThan(55);
    expect(out[299]).toBeGreaterThan(45);
    expect(out[299]).toBeLessThan(55);
  });
});

describe("atr", () => {
  it("equals the constant bar range for uniform candles", () => {
    // Each bar: high-low = 2, no gaps → TR = 2 always → ATR = 2
    const candles = Array.from({ length: 30 }, (_, i) =>
      candle(i * 60, 100, 101, 99, 100),
    );
    const out = atr(candles, 14);
    expect(out[13]).toBeNull();
    expect(out[14]).toBeCloseTo(2, 10);
    expect(out[29]).toBeCloseTo(2, 10);
  });
});

describe("priorDayLevels", () => {
  it("carries the completed prior ET day's high/low", () => {
    // Two ET days: 2024-01-02 (15:00 UTC = 10:00 ET) and 2024-01-03.
    const day1 = 1704207600; // 2024-01-02 15:00 UTC
    const day2 = day1 + 24 * 3600;
    const candles = [
      candle(day1, 100, 110, 95, 105),
      candle(day1 + 3600, 105, 120, 100, 115),
      candle(day2, 115, 118, 112, 116),
      candle(day2 + 3600, 116, 117, 113, 114),
    ];
    const { prevDayHigh, prevDayLow } = priorDayLevels(candles);
    expect(prevDayHigh[0]).toBeNull();
    expect(prevDayHigh[1]).toBeNull();
    expect(prevDayHigh[2]).toBe(120);
    expect(prevDayLow[2]).toBe(95);
    expect(prevDayHigh[3]).toBe(120);
  });
});

describe("volumeRatio", () => {
  it("is 1 for flat volume and scales with spikes", () => {
    const candles = Array.from({ length: 25 }, (_, i) =>
      candle(i * 60, 100, 101, 99, 100, i === 24 ? 3000 : 1000),
    );
    const out = volumeRatio(candles, 20);
    expect(out[10]).toBeNull();
    expect(out[20]).toBeCloseTo(1, 10);
    // spike bar: 3000 / avg(19×1000 + 3000)/20 = 3000/1100
    expect(out[24]).toBeCloseTo(3000 / 1100, 10);
  });
});
