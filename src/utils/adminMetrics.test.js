import { describe, it, expect } from "vitest";
import {
  isFailureEvent,
  buildDailySeries,
  summarizeSeries,
  FAILURE_HINTS,
} from "./adminMetrics";

// Helper: an ISO timestamp for `daysAgo` days before now (defaults to now).
const iso = (daysAgo = 0) => new Date(Date.now() - daysAgo * 864e5).toISOString();

describe("isFailureEvent", () => {
  it("flags actions whose name hints at a failure", () => {
    expect(isFailureEvent({ action: "login_failed" })).toBe(true);
    expect(isFailureEvent({ action: "broker_sync_error" })).toBe(true);
    expect(isFailureEvent({ action: "access_denied" })).toBe(true);
    expect(isFailureEvent({ action: "account_locked" })).toBe(true);
  });

  it("flags events whose details carry an error/failure marker", () => {
    expect(isFailureEvent({ action: "sync", details: { error: "boom" } })).toBe(true);
    expect(isFailureEvent({ action: "sync", details: { failed: true } })).toBe(true);
    expect(isFailureEvent({ action: "sync", details: { success: false } })).toBe(true);
  });

  it("returns false for successful / benign events", () => {
    expect(isFailureEvent({ action: "login", details: {} })).toBe(false);
    expect(isFailureEvent({ action: "trade_created", details: { success: true } })).toBe(false);
  });

  it("is null-safe (edge case)", () => {
    expect(isFailureEvent(null)).toBe(false);
    expect(isFailureEvent(undefined)).toBe(false);
    expect(isFailureEvent({})).toBe(false);
  });

  it("exposes the hint list it matches on", () => {
    expect(FAILURE_HINTS).toContain("fail");
    expect(FAILURE_HINTS).toContain("error");
  });
});

describe("buildDailySeries", () => {
  it("returns exactly `days` zero-filled buckets when there is no data (edge case)", () => {
    const series = buildDailySeries({ days: 7 });
    expect(series).toHaveLength(7);
    series.forEach((d) => {
      expect(d.requests).toBe(0);
      expect(d.failures).toBe(0);
      expect(d.errorRate).toBe(0);
      expect(d.activeUsers).toBe(0);
      expect(d.signups).toBe(0);
      expect(d.trades).toBe(0);
    });
    // Oldest first, today last.
    expect(series[series.length - 1].date).toBe(new Date().toISOString().split("T")[0]);
  });

  it("counts requests, failures, distinct active users, signups and trades into today's bucket (happy path)", () => {
    const series = buildDailySeries({
      activityRows: [
        { action: "login", created_at: iso(0), user_id: "u1" },
        { action: "login", created_at: iso(0), user_id: "u1" }, // same user → still 1 active
        { action: "login_failed", created_at: iso(0), user_id: "u2" },
        { action: "trade_created", created_at: iso(0), user_id: "u3", details: { error: "x" } },
      ],
      signupRows: [{ created_at: iso(0) }, { created_at: iso(0) }],
      tradeRows: [{ created_at: iso(0) }],
      days: 3,
    });
    const today = series[series.length - 1];
    expect(today.requests).toBe(4);
    expect(today.failures).toBe(2); // login_failed + details.error
    expect(today.activeUsers).toBe(3); // u1, u2, u3 distinct
    expect(today.signups).toBe(2);
    expect(today.trades).toBe(1);
    expect(today.errorRate).toBe(50); // 2/4
  });

  it("drops events outside the window and bucket-matches by day (edge case)", () => {
    const series = buildDailySeries({
      activityRows: [
        { action: "login", created_at: iso(1), user_id: "u1" }, // yesterday
        { action: "login", created_at: iso(99), user_id: "u9" }, // far outside 3-day window
      ],
      days: 3,
    });
    const total = series.reduce((sum, d) => sum + d.requests, 0);
    expect(total).toBe(1); // only the in-window (yesterday) event counts
    expect(series[series.length - 2].requests).toBe(1); // yesterday bucket
  });

  it("rounds error rate to one decimal place", () => {
    const series = buildDailySeries({
      activityRows: [
        { action: "ok", created_at: iso(0), user_id: "u1" },
        { action: "ok2", created_at: iso(0), user_id: "u1" },
        { action: "fail_x", created_at: iso(0), user_id: "u1" },
      ],
      days: 1,
    });
    // 1 failure / 3 requests = 33.333% → 33.3
    expect(series[0].errorRate).toBe(33.3);
  });
});

describe("summarizeSeries", () => {
  it("rolls a series up into headline totals (happy path)", () => {
    const series = [
      { requests: 10, failures: 1, signups: 2, trades: 5, activeUsers: 3 },
      { requests: 30, failures: 3, signups: 1, trades: 4, activeUsers: 7 },
    ];
    const totals = summarizeSeries(series);
    expect(totals.requests).toBe(40);
    expect(totals.failures).toBe(4);
    expect(totals.signups).toBe(3);
    expect(totals.trades).toBe(9);
    expect(totals.peakActive).toBe(7); // max, not sum
    expect(totals.errorRate).toBe(10); // 4/40 → 10.0
  });

  it("returns all-zero totals with no divide-by-zero for an empty series (edge case)", () => {
    const totals = summarizeSeries([]);
    expect(totals).toEqual({
      requests: 0,
      failures: 0,
      signups: 0,
      trades: 0,
      peakActive: 0,
      errorRate: 0,
    });
  });

  it("defaults to an empty array argument (error/guard case)", () => {
    expect(() => summarizeSeries()).not.toThrow();
    expect(summarizeSeries().requests).toBe(0);
  });
});
