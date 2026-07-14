import { z } from "zod";

// Notification categories. Keep in sync with the notifications.category CHECK
// constraint (020_notifications.sql, extended with 'contact' in 20260708210946
// and 'account' in 20260714031000).
// 'contact' is admin-only: the contact-submit Edge Function emits it when a
// visitor messages the public Contact form.
// 'account' is lifecycle: the welcome message on a user's first sign-in.
export const NOTIFICATION_CATEGORIES = [
  "broker_sync",
  "billing",
  "performance",
  "security",
  "contact",
  "account",
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
  // In-app only: the user has just received a confirmation email, so a welcome
  // email on top of it is noise.
  account: { inApp: true, email: false },
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
  account: notificationChannelPrefsSchema.optional(),
});

// Merge a stored (possibly partial / unknown) preferences value with defaults.
// Always returns a complete, valid prefs object — never throws.
//
// Built from NOTIFICATION_CATEGORIES rather than a hand-written line per
// category: an omitted category silently loses its defaults, and since
// emitNotification() suppresses anything whose inApp pref is falsy, a dropped
// category means its notifications are never written at all.
export const normalizeNotificationPrefs = (raw) => {
  const parsed = notificationPrefsSchema.safeParse(raw ?? {});
  const value = parsed.success ? parsed.data : {};
  return Object.fromEntries(
    NOTIFICATION_CATEGORIES.map((category) => [
      category,
      { ...DEFAULT_NOTIFICATION_PREFS[category], ...value[category] },
    ])
  );
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
