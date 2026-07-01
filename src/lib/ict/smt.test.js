import { describe, it, expect } from "vitest";
import { smtPairFor, computeSmt, buildDayKeyMap, buildSmtSiblingIndex } from "./smt";

const DAY = 24 * 3600;
// Weekday-only daily bars starting Mon 2026-06-01 at 17:00 UTC.
function series(days) {
  const monday = Math.floor(Date.parse("2026-06-01T17:00:00Z") / 1000);
  let t = monday;
  let weekday = 0;
  return days.map((d) => {
    const out = { time: t, open: d.o ?? d.c, high: d.h, low: d.l, close: d.c, volume: 1000 };
    weekday = (weekday + 1) % 5;
    t += weekday === 0 ? 3 * DAY : DAY; // skip weekends
    return out;
  });
}

describe("smtPairFor", () => {
  it("maps indices and returns null otherwise", () => {
    expect(smtPairFor("ES")).toBe("NQ");
    expect(smtPairFor("MES")).toBe("NQ");
    expect(smtPairFor("YM")).toBe("ES");
    expect(smtPairFor("CL")).toBeNull();
    expect(smtPairFor("GC")).toBeNull();
  });
});

describe("computeSmt (daily)", () => {
  it("flags bearish SMT: A takes its prior high, B fails", () => {
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 102, l: 92, c: 101 }]);
    const B = series([{ h: 200, l: 180, c: 190 }, { h: 199, l: 185, c: 195 }]);
    const r = computeSmt(A, B, 1, { pairSymbol: "NQ" });
    expect(r.available).toBe(true);
    expect(r.daily).toBe("bearish");
    expect(r.detail.bHigh).toBe(199);
  });

  it("flags bullish SMT: A takes its prior low, B holds", () => {
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 98, l: 88, c: 96 }]);
    const B = series([{ h: 200, l: 180, c: 190 }, { h: 198, l: 181, c: 192 }]);
    expect(computeSmt(A, B, 1, {}).daily).toBe("bullish");
  });

  it("returns none when both confirm", () => {
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 102, l: 92, c: 101 }]);
    const B = series([{ h: 200, l: 180, c: 190 }, { h: 205, l: 185, c: 202 }]);
    expect(computeSmt(A, B, 1, {}).daily).toBeNull();
  });

  it("returns null on conflict (divergence both ways)", () => {
    // A outside bar (takes high AND low), B inside bar (takes neither)
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 103, l: 87, c: 95 }]);
    const B = series([{ h: 200, l: 180, c: 190 }, { h: 199, l: 181, c: 190 }]);
    expect(computeSmt(A, B, 1, {}).daily).toBeNull();
  });

  it("degrades when the sibling misses the aligned day", () => {
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 102, l: 92, c: 101 }]);
    const B = series([{ h: 200, l: 180, c: 190 }]); // no bar for A's second day
    const r = computeSmt(A, B, 1, {});
    expect(r.available).toBe(true);
    expect(r.daily).toBeNull();
    expect(r.detail).toBeNull();
  });

  it("is unavailable without a sibling series", () => {
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 102, l: 92, c: 101 }]);
    expect(computeSmt(A, null, 1, {})).toMatchObject({ available: false, daily: null });
  });

  it("accepts a prebuilt day-key map and matches the ad-hoc path", () => {
    const A = series([{ h: 100, l: 90, c: 95 }, { h: 102, l: 92, c: 101 }]);
    const B = series([{ h: 200, l: 180, c: 190 }, { h: 199, l: 185, c: 195 }]);
    const withMap = computeSmt(A, B, 1, { bByKey: buildDayKeyMap(B) });
    expect(withMap).toEqual(computeSmt(A, B, 1, {}));
  });
});

describe("computeSmt (weekly)", () => {
  // Three weeks each: week2 sets the reference extremes, week3 diverges.
  function threeWeeks(week3) {
    const flat = { h: 100, l: 90, c: 95 };
    return series([
      flat, flat, flat, flat, flat,             // week 1
      flat, flat, flat, flat, flat,             // week 2 (prev week: high 100, low 90)
      ...week3,
    ]);
  }

  it("flags bearish weekly SMT when A breaks the prior week high and B does not", () => {
    const A = threeWeeks([{ h: 105, l: 95, c: 103 }, { h: 106, l: 96, c: 104 }]);
    const B = threeWeeks([{ h: 99, l: 92, c: 97 }, { h: 98, l: 93, c: 96 }]);
    const r = computeSmt(A, B, A.length - 1, {});
    expect(r.weekly).toBe("bearish");
  });

  it("is null weekly when both take the same side", () => {
    const A = threeWeeks([{ h: 105, l: 95, c: 103 }]);
    const B = threeWeeks([{ h: 104, l: 95, c: 102 }]);
    expect(computeSmt(A, B, A.length - 1, {}).weekly).toBeNull();
  });

  it("the prebuilt sibling index (fast replay path) matches the filter path", () => {
    const A = threeWeeks([{ h: 105, l: 95, c: 103 }, { h: 106, l: 96, c: 104 }]);
    const B = threeWeeks([{ h: 99, l: 92, c: 97 }]); // one day shorter than A
    const bIndex = buildSmtSiblingIndex(B);
    for (let i = 1; i < A.length; i++) {
      const slow = computeSmt(A, B, i, {});
      const fast = computeSmt(A, B, i, { bByKey: bIndex.byKey, bIndex });
      expect(fast).toEqual(slow);
    }
  });
});
