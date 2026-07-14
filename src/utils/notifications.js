import { supabase } from "../lib/supabase";
import {
  notificationRecordSchema,
  normalizeNotificationPrefs,
} from "../lib/schemas/notifications";

// Columns selected when reading notifications back. Never use SELECT *.
export const NOTIFICATION_COLUMNS =
  "id, category, event_type, title, body, severity, link_to, metadata, read_at, created_at";

// Events that also send an email when the category's email pref is enabled.
// Kept in sync with the v1 email events handled by the notify-email function.
const EMAIL_EVENTS = new Set([
  "payment_failed",
  "trial_ending",
  "broker_reconnect_required",
  "new_login",
]);

// ── Global email kill-switch ───────────────────────────────────────────────
// Notification emails are off app-wide. The Resend free tier is small enough
// that sign-in alerts alone would exhaust it, and every send was failing
// regardless (every notification row was landing on email_status='failed').
// In-app notifications are unaffected — they are the primary channel, and the
// bell still shows everything.
//
// To turn emails back on, flip this to true AND set NOTIFY_EMAIL_ENABLED=true
// in the Supabase Edge Function environment (the server has its own switch —
// see supabase/functions/_shared/notify.ts). Both must agree; the UI's email
// toggles are hidden while this is false, so users aren't offered a dead
// channel.
export const EMAIL_NOTIFICATIONS_ENABLED = false;

/**
 * Create a notification for a user. Validates the record, honors the user's
 * per-category in-app preference (the in-app toggle is the master switch — email
 * rides on top of an in-app notification), inserts the row, and fires the
 * notify-email Edge Function for key events when the email pref is on.
 *
 * Never throws — a notification failure must not break the calling operation.
 *
 * @param {object}  params
 * @param {string}  params.userId - auth.uid() of the recipient
 * @param {object}  params.record - { category, event_type, title, body?, severity?, link_to?, metadata? }
 * @param {object} [params.prefs] - raw user_profiles.preferences.notifications value
 * @returns {Promise<{ data: object|null, error: Error|null }>}
 */
export async function emitNotification({ userId, record, prefs }) {
  if (!userId) return { data: null, error: new Error("Missing userId") };

  const parsed = notificationRecordSchema.safeParse(record);
  if (!parsed.success) {
    console.error("[Notify] invalid record:", parsed.error.issues);
    return { data: null, error: parsed.error };
  }

  const payload = parsed.data;
  const channelPrefs = normalizeNotificationPrefs(prefs)[payload.category];

  // In-app off → suppress the notification entirely (no row, no email).
  if (!channelPrefs.inApp) return { data: null, error: null };

  const wantsEmail =
    EMAIL_NOTIFICATIONS_ENABLED &&
    channelPrefs.email &&
    EMAIL_EVENTS.has(payload.event_type);

  try {
    // The insert runs with whatever token the client currently holds. Emits
    // are fire-and-forget and can outlive the session that scheduled them
    // (e.g. a sign-out or account switch racing a new_login emit) — without a
    // session the request goes out as `anon` and Postgres rejects it with
    // 42501 before RLS even runs. Quietly drop the notification instead.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || session.user.id !== userId) {
      return { data: null, error: null };
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        category: payload.category,
        event_type: payload.event_type,
        title: payload.title,
        body: payload.body ?? null,
        severity: payload.severity,
        link_to: payload.link_to ?? null,
        metadata: payload.metadata,
        email_status: wantsEmail ? "queued" : "none",
      })
      .select(NOTIFICATION_COLUMNS)
      .single();

    if (error) {
      console.error("[Notify] insert failed:", error.message);
      return { data: null, error };
    }

    // Fire-and-forget email; failures must not affect the in-app path.
    if (wantsEmail) {
      supabase.functions
        .invoke("notify-email", { body: { notificationId: data.id } })
        .catch((e) => console.error("[Notify] email invoke failed:", e?.message));
    }

    return { data, error: null };
  } catch (err) {
    console.error("[Notify] unexpected error:", err?.message);
    return { data: null, error: err };
  }
}
