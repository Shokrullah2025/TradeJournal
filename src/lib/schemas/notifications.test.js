import { describe, it, expect } from "vitest";
import {
  notificationRecordSchema,
  notificationPrefsSchema,
  normalizeNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from "./notifications";

describe("notificationRecordSchema", () => {
  it("accepts a valid record and applies defaults", () => {
    const result = notificationRecordSchema.safeParse({
      category: "billing",
      event_type: "payment_failed",
      title: "Payment failed",
    });
    expect(result.success).toBe(true);
    expect(result.data.severity).toBe("info");
    expect(result.data.metadata).toEqual({});
  });

  it("trims the title and keeps optional fields", () => {
    const result = notificationRecordSchema.safeParse({
      category: "broker_sync",
      event_type: "sync_failed",
      title: "  Sync failed  ",
      body: "Tradovate sync hit an error.",
      severity: "error",
      link_to: "/brokers",
      metadata: { broker: "tradovate" },
    });
    expect(result.success).toBe(true);
    expect(result.data.title).toBe("Sync failed");
    expect(result.data.link_to).toBe("/brokers");
  });

  it("rejects an unknown category", () => {
    const result = notificationRecordSchema.safeParse({
      category: "risk",
      event_type: "x",
      title: "x",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty title (edge case)", () => {
    const result = notificationRecordSchema.safeParse({
      category: "security",
      event_type: "new_login",
      title: "   ",
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("title is required");
  });

  it("rejects an invalid severity (error state)", () => {
    const result = notificationRecordSchema.safeParse({
      category: "security",
      event_type: "new_login",
      title: "New login",
      severity: "critical",
    });
    expect(result.success).toBe(false);
  });
});

describe("notificationPrefsSchema", () => {
  it("accepts a partial prefs object", () => {
    const result = notificationPrefsSchema.safeParse({
      billing: { inApp: true, email: false },
    });
    expect(result.success).toBe(true);
  });

  it("rejects a channel value that is not boolean", () => {
    const result = notificationPrefsSchema.safeParse({
      billing: { inApp: "yes", email: false },
    });
    expect(result.success).toBe(false);
  });
});

describe("normalizeNotificationPrefs", () => {
  it("returns full defaults for null/undefined input", () => {
    expect(normalizeNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(normalizeNotificationPrefs(undefined)).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );
  });

  it("merges a partial object over the defaults", () => {
    const result = normalizeNotificationPrefs({
      performance: { inApp: false, email: true },
    });
    expect(result.performance).toEqual({ inApp: false, email: true });
    expect(result.billing).toEqual(DEFAULT_NOTIFICATION_PREFS.billing);
  });

  it("falls back to defaults when given a malformed value", () => {
    expect(normalizeNotificationPrefs("garbage")).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );
    expect(normalizeNotificationPrefs({ billing: { inApp: 1 } })).toEqual(
      DEFAULT_NOTIFICATION_PREFS
    );
  });
});
