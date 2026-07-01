import { describe, it, expect } from "vitest";
import {
  computeBiasAt,
  computeLiveBias,
  buildBiasSeries,
  biasForTimestamp,
  WARMUP_DAYS,
  BIAS_THRESHOLD,
} from "./bias";
import { atr } from "../signals/indicators";

const DAY = 24 * 3600;

// Weekday-only daily bars starting Mon 2026-06-01 at 17:00 UTC (13:00 ET).
function series(days) {
  const monday = Math.floor(Date.parse("2026-06-01T17:00:00Z") / 1000);
  let t = monday;
  let weekday = 0;
  return days.map((d) => {
    const out = { time: t, open: d.o, high: d.h, low: d.l, close: d.c, volume: 1000 };
    weekday = (weekday + 1) % 5;
    t += weekday === 0 ? 3 * DAY : DAY;
    return out;
  });
}

const flat = { o: 100, h: 105, l: 95, c: 100 };
const flatDays = (n) => Array.from({ length: n }, () => ({ ...flat }));

function biasAtEnd(days, opts = {}) {
  const candles = series(days);
  return computeBiasAt(candles, candles.length - 1, {
    atr14: atr(candles, 14),
    ...opts,
  });
}

describe("computeBiasAt", () => {
  it("returns neutral with no factors during warm-up", () => {
    const r = biasAtEnd(flatDays(10));
    expect(r.bias).toBe("neutral");
    expect(r.reasons).toEqual([]);
  });

  it("goes long on a strong expansion-up close", () => {
    const r = biasAtEnd([...flatDays(25), { o: 100, h: 112, l: 99, c: 111 }]);
    expect(r.bias).toBe("long");
    expect(r.score).toBeGreaterThanOrEqual(BIAS_THRESHOLD);
    const struct = r.reasons.find((f) => f.key === "dailyStructure");
    expect(struct.points).toBe(30);
    expect(r.reasons.find((f) => f.key === "closeLocation").points).toBe(10);
    expect(r.reasons.find((f) => f.key === "priorDayLiquidity").points).toBe(15);
    // ran into the top of the 20-day range → premium works against the long
    expect(r.reasons.find((f) => f.key === "premiumDiscount").points).toBe(-15);
  });

  it("goes short on the mirrored expansion down", () => {
    const r = biasAtEnd([...flatDays(25), { o: 100, h: 101, l: 88, c: 89 }]);
    expect(r.bias).toBe("short");
    expect(r.reasons.find((f) => f.key === "dailyStructure").points).toBe(-30);
  });

  it("stays neutral in flat conditions", () => {
    const r = biasAtEnd(flatDays(26));
    expect(r.bias).toBe("neutral");
    expect(Math.abs(r.score)).toBeLessThan(BIAS_THRESHOLD);
  });

  it("shrinks maxScore when SMT and session data are unavailable", () => {
    const noSibling = biasAtEnd(flatDays(26));
    // 30+10+15+15+8+7 = 85: no session (0) and no SMT pair (0)
    expect(noSibling.maxScore).toBe(85);
    const smtFactor = noSibling.reasons.find((f) => f.key === "smt");
    expect(smtFactor.maxPoints).toBe(0);

    const withSibling = biasAtEnd(flatDays(26), {
      siblingDaily: series(flatDays(26)),
      symbol: "ES",
    });
    expect(withSibling.maxScore).toBe(100);
  });

  it("adds the session factor only when a session day is provided", () => {
    const sessionDay = { annotations: { judas: "bullish" } };
    const r = biasAtEnd(flatDays(26), { sessionDay });
    expect(r.reasons.find((f) => f.key === "sessionProfile").points).toBe(10);
    expect(r.maxScore).toBe(95);
  });

  it("is deterministic", () => {
    const days = [...flatDays(25), { o: 100, h: 112, l: 99, c: 111 }];
    expect(biasAtEnd(days)).toEqual(biasAtEnd(days.map((d) => ({ ...d }))));
  });
});

describe("computeLiveBias", () => {
  it("drops a daily bar dated 'today'", () => {
    const candles = series(flatDays(30));
    const last = candles[candles.length - 1];
    // now = same ET day as the last bar → analyze the bar before it
    const live = computeLiveBias(candles, {}, last.time + 3600);
    expect(live.computedFrom.time).toBe(candles[candles.length - 2].time);
    // now = well after → analyze the last bar itself
    const after = computeLiveBias(candles, {}, last.time + 2 * DAY);
    expect(after.computedFrom.time).toBe(last.time);
  });

  it("returns null without enough history", () => {
    expect(computeLiveBias(series(flatDays(10)), {}, 0)).toBeNull();
    expect(computeLiveBias([], {})).toBeNull();
  });
});

describe("buildBiasSeries / biasForTimestamp", () => {
  it("maps each bias to the next trading day, Friday to Monday", () => {
    const candles = series(flatDays(30));
    const s = buildBiasSeries(candles, { symbol: "GC" });
    expect(s.entries.length).toBe(30 - WARMUP_DAYS);

    // candles[24] is a Friday (index 24 = week 5 day 5); its bias applies Monday
    const friday = candles[24];
    const monday = candles[25];
    const fridayBias = s.entries.find((e) => e.computedFrom.time === friday.time);
    expect(fridayBias.forDayKey).toBe("2026-07-06");
    // an entry-engine query inside Monday's session gets Friday's bias
    expect(biasForTimestamp(s, monday.time)).toEqual(fridayBias);
    // and a query during Sunday-evening Asia (20:00 ET) also maps to Monday
    expect(biasForTimestamp(s, monday.time - 17 * 3600)).toEqual(fridayBias);
  });

  it("returns null for days with no computed bias", () => {
    const s = buildBiasSeries(series(flatDays(30)), { symbol: "GC" });
    expect(biasForTimestamp(s, Date.parse("2020-01-01T12:00:00Z") / 1000)).toBeNull();
  });
});
