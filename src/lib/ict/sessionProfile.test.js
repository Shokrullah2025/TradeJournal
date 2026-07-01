import { describe, it, expect } from "vitest";
import { tradingDayKey, averageDailyRange, buildSessionProfiles } from "./sessionProfile";

// 30m bar starting at a given ET wall-clock time on a given ET date.
// June dates → EDT (UTC-4), so ET hh:mm = UTC hh+4:mm.
function bar(etDate, etTime, o, h, l, c) {
  const [hh, mm] = etTime.split(":").map(Number);
  const utc = Date.parse(`${etDate}T00:00:00Z`) / 1000 + ((hh + 4) * 60 + mm) * 60;
  return { time: utc, open: o, high: h, low: l, close: c, volume: 100 };
}

describe("tradingDayKey", () => {
  it("keeps daytime bars on their own calendar day", () => {
    expect(tradingDayKey(bar("2026-06-16", "10:00", 0, 0, 0, 0).time)).toBe("2026-06-16");
  });
  it("rolls bars at/after 20:00 ET into the next day (Sunday 20:00 → Monday)", () => {
    expect(tradingDayKey(bar("2026-06-14", "20:00", 0, 0, 0, 0).time)).toBe("2026-06-15");
    expect(tradingDayKey(bar("2026-06-16", "23:30", 0, 0, 0, 0).time)).toBe("2026-06-17");
  });
});

describe("averageDailyRange", () => {
  it("averages the last N daily ranges and needs enough history", () => {
    const daily = Array.from({ length: 25 }, (_, k) => ({
      time: k, open: 0, high: 10 + (k >= 5 ? 2 : 0), low: 0, close: 5,
    }));
    // last 20 candles all have range 12
    expect(averageDailyRange(daily, 20)).toBe(12);
    expect(averageDailyRange(daily.slice(0, 10), 20)).toBeNull();
  });
});

describe("buildSessionProfiles", () => {
  // Build a full synthetic trading day 2026-06-16 (Tuesday):
  // Asia (starts 20:00 ET on the 15th) consolidates 100–102,
  // London sweeps Asia's low then closes back inside (bullish Judas),
  // NY AM expands up and prints the high of day, NY PM drifts.
  function fullDay() {
    return [
      // Asia 20:00–23:30 (belongs to trading day 06-16)
      bar("2026-06-15", "20:00", 101, 102, 100, 101),
      bar("2026-06-15", "22:00", 101, 101.8, 100.2, 100.8),
      // London (profile window 03:00–09:30)
      bar("2026-06-16", "03:00", 100.8, 101, 99, 99.4),   // sweeps Asia low (99 < 100)
      bar("2026-06-16", "05:00", 99.4, 101.5, 99.2, 101), // closes back above Asia low
      // NY AM 09:30–11:30
      bar("2026-06-16", "09:30", 101, 104, 100.8, 103.5),
      bar("2026-06-16", "11:00", 103.5, 105, 103, 104.5), // high of day 105
      // Lunch
      bar("2026-06-16", "12:30", 104.5, 104.6, 104, 104.2),
      // NY PM
      bar("2026-06-16", "14:00", 104.2, 104.8, 103.8, 104),
      bar("2026-06-16", "15:30", 104, 104.3, 103.9, 104.1),
    ];
  }

  // 20 daily candles with range 10 → ADR 10, Asia range 2 < 3 → consolidation
  const daily = Array.from({ length: 20 }, (_, k) => ({
    time: k, open: 100, high: 105, low: 95, close: 100,
  }));

  it("splits the day into sessions with correct OHLC and direction", () => {
    const [day] = buildSessionProfiles(fullDay(), daily, { days: 1 });
    expect(day.dayKey).toBe("2026-06-16");
    expect(day.complete).toBe(true);
    expect(day.sessions.ASIA).toMatchObject({ open: 101, high: 102, low: 100, close: 100.8 });
    expect(day.sessions.LONDON.low).toBe(99);
    expect(day.sessions.NY_AM.high).toBe(105);
    expect(day.sessions.NY_AM.direction).toBe("up");
    expect(day.sessions.LUNCH_DOLDRUMS.bars).toBe(1);
  });

  it("detects the bullish Judas swing and session HOD/LOD attribution", () => {
    const [day] = buildSessionProfiles(fullDay(), daily, { days: 1 });
    expect(day.annotations.londonSweptAsiaLow).toBe(true);
    expect(day.annotations.londonSweptAsiaHigh).toBe(false);
    expect(day.annotations.judas).toBe("bullish");
    expect(day.annotations.lowOfDaySession).toBe("LONDON");
    expect(day.annotations.highOfDaySession).toBe("NY_AM");
    expect(day.annotations.asiaConsolidation).toBe(true); // range 2 < 0.3×10
  });

  it("detects a bearish Judas swing", () => {
    const bars = [
      bar("2026-06-15", "21:00", 101, 102, 100, 101.5),
      bar("2026-06-16", "03:30", 101.5, 103.5, 101, 101.4), // sweeps Asia high, closes back below
      bar("2026-06-16", "10:00", 101.4, 101.6, 98, 98.5),
    ];
    const [day] = buildSessionProfiles(bars, daily, { days: 1 });
    expect(day.annotations.judas).toBe("bearish");
    expect(day.complete).toBe(false); // no bar at/after 15:30
  });

  it("degrades to nulls when a session is missing", () => {
    const bars = [bar("2026-06-16", "10:00", 100, 101, 99, 100.5)]; // NY AM only
    const [day] = buildSessionProfiles(bars, daily, { days: 1 });
    expect(day.sessions.ASIA).toBeNull();
    expect(day.annotations.judas).toBeNull();
    expect(day.annotations.londonSweptAsiaHigh).toBeNull();
    expect(day.annotations.asiaConsolidation).toBeNull();
  });

  it("returns the last `days` trading days in ascending order", () => {
    const twoDays = [
      bar("2026-06-15", "10:00", 100, 101, 99, 100),
      ...fullDay(),
    ];
    const profiles = buildSessionProfiles(twoDays, daily, { days: 2 });
    expect(profiles.map((p) => p.dayKey)).toEqual(["2026-06-15", "2026-06-16"]);
  });

  it("handles empty input", () => {
    expect(buildSessionProfiles([], daily)).toEqual([]);
  });
});
