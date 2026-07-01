import { describe, it, expect } from "vitest";
import { weekKeyOf, aggregateToWeeks, weeklyContext, buildWeeksIndex } from "./weekly";

// Daily bar at 17:00 UTC (12:00/13:00 ET) on a given UTC date — mid-day so
// the ET calendar day matches the UTC date.
const DAY = 24 * 3600;
function dailyBar(utcDateStr, o, h, l, c) {
  return { time: Math.floor(Date.parse(`${utcDateStr}T17:00:00Z`) / 1000), open: o, high: h, low: l, close: c, volume: 1000 };
}

// A known week: Mon 2026-06-01 … Fri 2026-06-05 (June 2026: the 1st is a Monday)
const WEEK1 = [
  dailyBar("2026-06-01", 100, 105, 99, 104),
  dailyBar("2026-06-02", 104, 108, 103, 107),
  dailyBar("2026-06-03", 107, 110, 105, 106),
  dailyBar("2026-06-04", 106, 109, 104, 108),
  dailyBar("2026-06-05", 108, 112, 107, 111),
];
const WEEK2 = [
  dailyBar("2026-06-08", 111, 113, 108, 109),
  dailyBar("2026-06-09", 109, 110, 105, 106),
];

describe("weekKeyOf", () => {
  it("maps every weekday to that week's Monday", () => {
    for (const bar of WEEK1) expect(weekKeyOf(bar.time)).toBe("2026-06-01");
    expect(weekKeyOf(WEEK2[0].time)).toBe("2026-06-08");
  });
  it("folds a Sunday bar forward into the following Monday's week", () => {
    expect(weekKeyOf(dailyBar("2026-06-07", 0, 0, 0, 0).time)).toBe("2026-06-08");
  });
  it("drops Saturdays", () => {
    expect(weekKeyOf(dailyBar("2026-06-06", 0, 0, 0, 0).time)).toBeNull();
  });
});

describe("aggregateToWeeks", () => {
  it("folds Mon–Fri into one candle with correct OHLC", () => {
    const weeks = aggregateToWeeks(WEEK1);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toMatchObject({
      weekKey: "2026-06-01", open: 100, high: 112, low: 99, close: 111, days: 5,
    });
  });

  it("handles a holiday-shortened week and multiple weeks", () => {
    const weeks = aggregateToWeeks([...WEEK1, ...WEEK2]);
    expect(weeks).toHaveLength(2);
    expect(weeks[1]).toMatchObject({ weekKey: "2026-06-08", days: 2, close: 106 });
  });

  it("groups correctly across the US spring-forward week (2026-03-08 transition)", () => {
    // Mon 2026-03-09 … Fri 2026-03-13 — DST began Sunday 03-08 at 02:00 ET
    const dst = ["2026-03-09", "2026-03-10", "2026-03-11", "2026-03-12", "2026-03-13"]
      .map((d, k) => dailyBar(d, 100 + k, 101 + k, 99 + k, 100.5 + k));
    const weeks = aggregateToWeeks(dst);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekKey).toBe("2026-03-09");
    expect(weeks[0].days).toBe(5);
  });

  it("groups correctly across the fall-back week (2026-11-01 transition)", () => {
    const dst = ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]
      .map((d, k) => dailyBar(d, 100 + k, 101 + k, 99 + k, 100.5 + k));
    const weeks = aggregateToWeeks(dst);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].weekKey).toBe("2026-11-02");
  });
});

describe("weeklyContext", () => {
  // Six weeks of data so prevWeek classification has its 4-week reference.
  function sixWeeks() {
    const out = [];
    const mondays = ["2026-04-20", "2026-04-27", "2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"];
    mondays.forEach((mon, w) => {
      const monTime = Math.floor(Date.parse(`${mon}T17:00:00Z`) / 1000);
      for (let d = 0; d < 5; d++) {
        const base = 100 + w * 10;
        out.push({
          time: monTime + d * DAY,
          open: base + d, high: base + d + 3, low: base + d - 3, close: base + d + 2,
          volume: 1000,
        });
      }
    });
    return out;
  }

  it("separates the previous completed week from the week-so-far", () => {
    const daily = sixWeeks();
    // index of Wednesday in the last week: 5 weeks * 5 days + 2
    const i = 5 * 5 + 2;
    const ctx = weeklyContext(daily, i);
    expect(ctx.prevWeek.weekKey).toBe("2026-05-18");
    expect(ctx.prevWeek.classification).not.toBeNull();
    expect(ctx.currentWeek.weekKey).toBe("2026-05-25");
    expect(ctx.currentWeek.daysElapsed).toBe(3);
    expect(ctx.currentWeek.direction).toBe("up");
    // week 6 base 150: high so far = 150+2+3 = 155; prev week high = 140+4+3 = 147
    expect(ctx.currentWeek.tookPrevWeekHigh).toBe(true);
    expect(ctx.currentWeek.failedPrevWeekHigh).toBe(false); // closeSoFar 154 > 147
  });

  it("matches with and without a prebuilt weeks index", () => {
    const daily = sixWeeks();
    const idx = buildWeeksIndex(daily);
    const i = 5 * 5 + 2;
    const a = weeklyContext(daily, i);
    const b = weeklyContext(daily, i, undefined, idx);
    expect(b.prevWeek.weekKey).toBe(a.prevWeek.weekKey);
    expect(b.currentWeek).toEqual(a.currentWeek);
  });

  it("returns nulls when there is no prior week", () => {
    const ctx = weeklyContext(WEEK1, 2);
    expect(ctx.prevWeek).toBeNull();
    expect(ctx.currentWeek.daysElapsed).toBe(3);
  });
});
