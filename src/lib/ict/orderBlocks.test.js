import { describe, it, expect } from "vitest";
import {
  buildObTimeline,
  tapsZone,
  isRejectionClose,
  DISPLACEMENT_WINDOW,
} from "./orderBlocks";

const H4 = 4 * 3600;
const candle = (i, o, h, l, c) => ({ time: 1700000000 + i * H4, open: o, high: h, low: l, close: c, volume: 100 });

// Injected flat ATR keeps the displacement threshold explicit in every fixture.
const flatAtr = (n, v = 4) => new Array(n).fill(v);

// 20 quiet bars (range 2) to sit before the interesting part.
const quiet = (count, startIdx = 0, price = 100) =>
  Array.from({ length: count }, (_, k) => candle(startIdx + k, price, price + 1, price - 1, price));

describe("buildObTimeline — detection", () => {
  it("detects a bullish OB with exact fields", () => {
    // OB candle at 20: bearish 100→97 (high 101, low 96).
    // Displacement at 22: closes 103 > high 101, leg high 105 − close 97 = 8 ≥ 1×4.
    const candles = [
      ...quiet(20),
      candle(20, 100, 101, 96, 97),
      candle(21, 97, 100, 96.5, 99),
      candle(22, 99, 105, 98, 103),
      candle(23, 103, 104, 102, 103.5),
    ];
    const { obs, inPlay } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs).toHaveLength(1);
    expect(obs[0]).toMatchObject({
      direction: "long",
      zoneLow: 96,
      zoneHigh: 101,
      obIndex: 20,
      displacementIndex: 22,
      invalidatedIndex: null,
    });
    expect(inPlay.long[21]).toBe(-1); // not active until displacement closes
    expect(inPlay.long[22]).toBe(0);
    expect(inPlay.long[23]).toBe(0);
  });

  it("detects the bearish mirror", () => {
    // OB candle bullish 100→103 (low 99, high 104); displacement closes below 99
    // with leg close(103) − low(94) = 9 ≥ 4.
    const candles = [
      ...quiet(20),
      candle(20, 100, 104, 99, 103),
      candle(21, 103, 103.5, 94, 96),
    ];
    const { obs } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs).toHaveLength(1);
    expect(obs[0].direction).toBe("short");
    expect(obs[0].zoneHigh).toBe(104);
  });

  it("does not detect when the leg is smaller than one ATR", () => {
    // Close above high but leg high 101.5 − close 97 = 4.5 < 1×5
    const candles = [
      ...quiet(20),
      candle(20, 100, 101, 96, 97),
      candle(21, 97, 101.5, 96.5, 101.2),
    ];
    const { obs } = buildObTimeline(candles, { atr14: flatAtr(candles.length, 5) });
    expect(obs).toHaveLength(0);
  });

  it("does not detect when the close beyond comes too late", () => {
    const candles = [
      ...quiet(20),
      candle(20, 100, 101, 96, 97),
      ...quiet(DISPLACEMENT_WINDOW, 21, 99), // stays inside for the window
      candle(21 + DISPLACEMENT_WINDOW, 99, 106, 98, 105), // beyond, but late
    ];
    const { obs } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs.filter((o) => o.obIndex === 20)).toHaveLength(0);
  });

  it("a wick above the OB high without a body close is not displacement", () => {
    const candles = [
      ...quiet(20),
      candle(20, 100, 101, 96, 97),
      candle(21, 97, 106, 96.5, 100.5), // huge wick, closes back inside
    ];
    const { obs } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs).toHaveLength(0);
  });

  it("returns nothing during ATR warm-up", () => {
    const candles = [candle(0, 100, 101, 96, 97), candle(1, 97, 106, 96, 105)];
    const { obs } = buildObTimeline(candles); // real atr → null during warm-up
    expect(obs).toHaveLength(0);
  });
});

describe("buildObTimeline — validity", () => {
  const base = [
    ...quiet(20),
    candle(20, 100, 101, 96, 97), // bullish OB zone [96, 101]
    candle(21, 97, 105, 96.5, 103), // displacement
  ];

  it("invalidates on a later close through the far edge", () => {
    const candles = [...base, candle(22, 103, 104, 94, 95)]; // closes 95 < 96
    const { obs, inPlay } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs[0].invalidatedIndex).toBe(22);
    expect(inPlay.long[22]).toBe(-1);
  });

  it("a wick through the far edge with a close back inside keeps it alive", () => {
    const candles = [...base, candle(22, 103, 104, 94, 99)]; // low 94 < 96 but closes 99
    const { obs, inPlay } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs[0].invalidatedIndex).toBeNull();
    expect(inPlay.long[22]).toBe(0);
  });

  it("a stillborn OB (violated before displacement) never activates", () => {
    const candles = [
      ...quiet(20),
      candle(20, 100, 101, 96, 97),
      candle(21, 97, 98, 93, 94), // closes 94 < low 96 before any displacement
      candle(22, 94, 107, 93.5, 106), // would have displaced
    ];
    const { obs } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    expect(obs.filter((o) => o.obIndex === 20)).toHaveLength(0);
  });

  it("falls back to the older valid OB when the newer one dies", () => {
    const candles = [
      ...quiet(20),
      candle(20, 100, 101, 96, 97), // OB A zone [96, 101]
      candle(21, 97, 106, 96.5, 105), // displacement A
      candle(22, 105, 106, 103, 104), // bearish → OB B zone [103, 106]
      candle(23, 104, 111, 103.5, 110), // displacement B (leg 110? high 111 − 104 = 7 ≥ 4)
      candle(24, 110, 110.5, 101, 102), // closes 102 < B.zoneLow 103 → B dies; A alive (102 > 96)
    ];
    const { obs, inPlay } = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    const longs = obs.filter((o) => o.direction === "long");
    expect(longs).toHaveLength(2); // (candle 23 also seeds a short OB — not under test)
    const [obA, obB] = longs;
    expect(inPlay.long[23]).toBe(obs.indexOf(obB)); // newest wins while alive
    expect(obB.invalidatedIndex).toBe(24);
    expect(inPlay.long[24]).toBe(obs.indexOf(obA)); // fallback to A
  });

  it("is deterministic", () => {
    const candles = [...base, candle(22, 103, 104, 94, 99)];
    const a = buildObTimeline(candles, { atr14: flatAtr(candles.length) });
    const b = buildObTimeline(candles.map((c) => ({ ...c })), { atr14: flatAtr(candles.length) });
    expect(a).toEqual(b);
  });
});

describe("tapsZone / isRejectionClose", () => {
  const ob = { direction: "long", zoneLow: 96, zoneHigh: 101 };

  it("taps at the boundary (low === zoneHigh counts)", () => {
    expect(tapsZone(candle(0, 103, 104, 101, 103), ob)).toBe(true);
    expect(tapsZone(candle(0, 103, 104, 101.25, 103), ob)).toBe(false);
  });

  it("accepts a full rejection: tap + close above zone in upper half with bullish body", () => {
    expect(isRejectionClose(candle(0, 101.5, 104, 99, 103.5), ob)).toBe(true);
  });

  it("rejects when the close is above the zone but in the candle's lower half", () => {
    // taps (low 99), closes 101.5 > zoneHigh but mid of [99, 106] is 102.5
    expect(isRejectionClose(candle(0, 101, 106, 99, 101.5), ob)).toBe(false);
  });

  it("rejects a bearish-bodied candle even if it closes above the zone", () => {
    expect(isRejectionClose(candle(0, 104, 104.5, 100, 102.5), ob)).toBe(false);
  });

  it("rejects without a tap", () => {
    expect(isRejectionClose(candle(0, 102, 105, 101.5, 104), ob)).toBe(false);
  });

  it("mirrors for shorts", () => {
    const sob = { direction: "short", zoneLow: 103, zoneHigh: 106 };
    expect(isRejectionClose(candle(0, 102.5, 104, 100, 101), sob)).toBe(true); // taps 104 ≥ 103, closes < 103, lower half, bearish
    expect(isRejectionClose(candle(0, 101, 102.5, 100, 101.5), sob)).toBe(false); // no tap
  });
});
