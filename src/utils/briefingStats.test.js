import { describe, it, expect } from "vitest";
import { computeBriefingStats, localDateKey, DAY_NAMES } from "./briefingStats";

// computeBriefingStats is the pure engine behind the Pre-Market Briefing card.
// `now` is injectable, so every assertion below is fully deterministic and
// independent of the machine's clock and timezone (dates use the local
// constructor). Jan 1 2024 is a Monday, so Jan 8/15 are Mondays.
const NOW = new Date(2024, 0, 15, 10, 0, 0); // Mon Jan 15 2024, 10:00 local

const trade = (monthIdx, day, hour, pnl, instrument = "ES", status = "closed") => ({
  id: `${monthIdx}-${day}-${hour}-${pnl}`,
  status,
  exit_date: new Date(2024, monthIdx, day, hour, 0, 0),
  pnl,
  instrument,
});

describe("localDateKey", () => {
  it("formats a date as local YYYY-MM-DD", () => {
    expect(localDateKey(new Date(2024, 0, 5, 23, 0, 0))).toBe("2024-01-05");
  });

  it("zero-pads month and day", () => {
    expect(localDateKey(new Date(2024, 8, 9, 1, 0, 0))).toBe("2024-09-09");
  });
});

describe("computeBriefingStats — guards", () => {
  it("returns null for an empty array (edge case)", () => {
    expect(computeBriefingStats([], NOW)).toBeNull();
  });

  it("returns null for undefined input (error/edge resilience)", () => {
    expect(computeBriefingStats(undefined, NOW)).toBeNull();
  });

  it("returns null below the minimum trade threshold (4 closed trades)", () => {
    const trades = [
      trade(0, 8, 10, 10),
      trade(0, 9, 10, 20),
      trade(0, 10, 10, -5),
      trade(0, 11, 10, 15),
    ];
    expect(computeBriefingStats(trades, NOW)).toBeNull();
  });
});

describe("computeBriefingStats — happy path aggregations", () => {
  // 5 closed trades + 2 open positions, hand-verified below.
  const trades = [
    trade(0, 8, 10, 100, "ES"), // Mon
    trade(0, 8, 11, -40, "ES"), // Mon
    trade(0, 9, 10, 60, "NQ"), // Tue
    trade(0, 10, 14, -20, "ES"), // Wed
    trade(0, 11, 10, 30, "NQ"), // Thu (latest completed session)
    trade(0, 20, 9, 0, "CL", "open"),
    trade(0, 21, 9, 0, "ES", "open"),
  ];

  it("returns a non-null result with all sections", () => {
    const s = computeBriefingStats(trades, NOW);
    expect(s).not.toBeNull();
    expect(s).toHaveProperty("dow");
    expect(s).toHaveProperty("goldenHour");
    expect(s).toHaveProperty("lastSession");
    expect(s).toHaveProperty("openPositions");
    expect(s).toHaveProperty("warning");
  });

  it("counts open positions and lists their instruments", () => {
    const { openPositions } = computeBriefingStats(trades, NOW);
    expect(openPositions.count).toBe(2);
    expect(openPositions.instruments).toEqual(
      expect.arrayContaining(["CL", "ES"])
    );
  });

  it("reports the last completed session before today", () => {
    const { lastSession } = computeBriefingStats(trades, NOW);
    // Latest day < today is Thu Jan 11: a single +30 NQ winner
    expect(lastSession.key).toBe("2024-01-11");
    expect(lastSession.pnl).toBe(30);
    expect(lastSession.count).toBe(1);
    expect(lastSession.wins).toBe(1);
    expect(lastSession.topInstrument).toBe("NQ");
  });

  it("identifies the golden hour (best total-P&L hour with >=3 trades)", () => {
    const { goldenHour } = computeBriefingStats(trades, NOW);
    // Hour 10 holds +100, +60, +30 = +190 across 3 winning trades
    expect(goldenHour.hour).toBe(10);
    expect(goldenHour.winRate).toBe(1);
  });

  it("returns null for the day-of-week tile when the target day lacks enough trades", () => {
    // Today is Monday but Mondays only have 2 trades (< MIN_TRADES_PER_HOUR)
    const { dow } = computeBriefingStats(trades, NOW);
    expect(dow).toBeNull();
  });

  it("emits no warning for a profitable recent record", () => {
    const { warning } = computeBriefingStats(trades, NOW);
    expect(warning).toBeNull();
  });
});

describe("computeBriefingStats — warnings", () => {
  it("warns about a losing streak when no single hour qualifies", () => {
    // Losses spread across distinct hours so no hour reaches the count>=4
    // warning threshold; the trailing streak of 4 losses triggers instead.
    const trades = [
      trade(0, 8, 10, 50),
      trade(0, 9, 11, -10),
      trade(0, 10, 12, -20),
      trade(0, 11, 13, -30),
      trade(0, 12, 14, -40),
    ];
    const { warning } = computeBriefingStats(trades, NOW);
    expect(warning.type).toBe("streak");
    expect(warning.length).toBe(4);
  });

  it("warns about a bad trading hour when one has a low win rate and enough trades", () => {
    const trades = [
      trade(0, 8, 10, -10),
      trade(0, 9, 10, -20),
      trade(0, 10, 10, -30),
      trade(0, 11, 10, 40),
      trade(0, 12, 10, -50),
    ];
    const { warning } = computeBriefingStats(trades, NOW);
    expect(warning.type).toBe("hour");
    expect(warning.hour).toBe(10);
    expect(warning.count).toBe(5);
  });
});

describe("DAY_NAMES", () => {
  it("maps JS day indices to names", () => {
    expect(DAY_NAMES[0]).toBe("Sunday");
    expect(DAY_NAMES[1]).toBe("Monday");
    expect(DAY_NAMES[6]).toBe("Saturday");
  });
});
