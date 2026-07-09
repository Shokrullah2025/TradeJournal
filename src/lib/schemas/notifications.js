import { z } from "zod";

// Notification categories. Keep in sync with the notifications.category CHECK
// constraint (020_notifications.sql, extended with 'contact' in 034).
// 'contact' is admin-only: the contact-submit Edge Function emits it when a
// visitor messages the public Contact form.
export const NOTIFICATION_CATEGORIES = [
  "broker_sync",
  "billing",
  "performance",
  "security",
  "contact",
];

export const NOTIFICATION_SEVERITIES = ["info", "success", "warning", "error"];

// Per-category default channel preferences. Used when a user has never saved
// preferences, or when a category key is missing from the stored object.
export const DEFAULT_NOTIFICATION_PREFS = {
  broker_sync: { inApp: true, email: true },
  billing: { inApp: true, email: true },
  performance: { inApp: true, email: false },
  security: { inApp: true, email: true },
  contact: { inApp: true, email: false },
};

// In-app vs email toggles for a single category.
export const notificationChannelPrefsSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
});

// The full preferences object stored at user_profiles.preferences.notifications.
// Every category is optional so partial/legacy objects still parse; callers merge
// the result over DEFAULT_NOTIFICATION_PREFS.
export const notificationPrefsSchema = z.object({
  broker_sync: notificationChannelPrefsSchema.optional(),
  billing: notificationChannelPrefsSchema.optional(),
  performance: notificationChannelPrefsSchema.optional(),
  security: notificationChannelPrefsSchema.optional(),
  contact: notificationChannelPrefsSchema.optional(),
});

// Merge a stored (possibly partial / unknown) preferences value with defaults.
// Always returns a complete, valid prefs object — never throws.
export const normalizeNotificationPrefs = (raw) => {
  const parsed = notificationPrefsSchema.safeParse(raw ?? {});
  const value = parsed.success ? parsed.data : {};
  return {
    broker_sync: { ...DEFAULT_NOTIFICATION_PREFS.broker_sync, ...value.broker_sync },
    billing: { ...DEFAULT_NOTIFICATION_PREFS.billing, ...value.billing },
    performance: { ...DEFAULT_NOTIFICATION_PREFS.performance, ...value.performance },
    security: { ...DEFAULT_NOTIFICATION_PREFS.security, ...value.security },
    contact: { ...DEFAULT_NOTIFICATION_PREFS.contact, ...value.contact },
  };
};

// Validates the input to createNotification() before it touches the database.
export const notificationRecordSchema = z.object({
  category: z.enum(NOTIFICATION_CATEGORIES),
  event_type: z.string().trim().min(1, "event_type is required"),
  title: z.string().trim().min(1, "title is required").max(200),
  body: z.string().trim().max(1000).optional(),
  severity: z.enum(NOTIFICATION_SEVERITIES).default("info"),
  link_to: z.string().trim().max(200).optional(),
  metadata: z.record(z.unknown()).default({}),
});
