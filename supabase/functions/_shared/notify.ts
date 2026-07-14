// Shared server-side notification helpers for Edge Functions.
// Mirrors the client-side src/utils/notifications.js contract but runs under the
// service_role key (RLS-bypassing) so webhooks and background jobs can notify.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Supa = ReturnType<typeof createClient>;

export const NOTIFICATION_COLUMNS =
  "id, user_id, category, event_type, title, body, severity, link_to, metadata, email_status, read_at, created_at";

// Events that also send an email when the category's email pref is enabled.
// Keep in sync with EMAIL_EVENTS in src/utils/notifications.js.
const EMAIL_EVENTS = new Set([
  "payment_failed",
  "trial_ending",
  "broker_reconnect_required",
  "new_login",
]);

// ── Global email kill-switch ───────────────────────────────────────────────
// Notification emails are OFF unless NOTIFY_EMAIL_ENABLED is explicitly "true"
// in the Edge Function environment. The Resend free tier is small enough that
// one busy day of sign-ins would burn through it, and every send so far has
// been failing anyway (email_status='failed' on every row). In-app
// notifications are unaffected — they are the primary channel.
//
// Default OFF, not ON: forgetting to set an env var must not start spending
// quota. To re-enable, set NOTIFY_EMAIL_ENABLED=true (and a valid RESEND_API_KEY).
const EMAIL_ENABLED =
  (Deno.env.get("NOTIFY_EMAIL_ENABLED") ?? "false").trim().toLowerCase() === "true";

// Defaults applied when a user has no saved notification preferences.
const DEFAULT_PREFS: Record<string, { inApp: boolean; email: boolean }> = {
  broker_sync: { inApp: true, email: true },
  billing: { inApp: true, email: true },
  performance: { inApp: true, email: false },
  security: { inApp: true, email: true },
  // Account lifecycle (welcome, trial started). In-app only by default — the
  // user has just been emailed a confirmation link, so another email is noise.
  account: { inApp: true, email: false },
};

// Read the user's saved channel preferences, falling back to the category
// defaults.
//
// NEVER throws and never rejects. This is the crux of a production bug: this
// read is a *nice-to-have* (a per-user preference) that used to gate a
// *must-have* (the notification itself). It ran inside createServerNotification's
// try block, and supabase-js rejects — rather than returning { error } — on a
// transport-level failure. One failed read therefore skipped the insert
// entirely, and because the catch only console.error'd, the caller still
// returned 200 and nobody ever knew. `trial_started` was never written for a
// single user.
//
// A user who has never opened Settings has no preferences row at all, so the
// defaults are the norm, not the exception. Losing this read must cost the user
// their preference, not their notification.
async function getChannelPrefs(
  supabase: Supa,
  userId: string,
  category: string,
): Promise<{ inApp: boolean; email: boolean }> {
  const fallback = DEFAULT_PREFS[category] ?? { inApp: true, email: false };
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[notify] prefs read failed, using defaults:", error.message);
      return fallback;
    }
    const stored = (data?.preferences as Record<string, unknown> | null)
      ?.notifications as Record<string, { inApp?: boolean; email?: boolean }> | undefined;
    return { ...fallback, ...(stored?.[category] ?? {}) };
  } catch (err) {
    console.error("[notify] prefs read threw, using defaults:", err);
    return fallback;
  }
}

interface NotificationInput {
  userId: string;
  category: "broker_sync" | "billing" | "performance" | "security" | "account";
  event_type: string;
  title: string;
  body?: string;
  severity?: "info" | "success" | "warning" | "error";
  link_to?: string;
  metadata?: Record<string, unknown>;
}

// What happened to a notification. Returned (not thrown) so a caller can report
// it — a silent void return is what let `trial_started` go missing unnoticed.
export interface NotifyResult {
  ok: boolean;
  id?: string;
  /** Set when the user has turned this category's in-app channel off. */
  suppressed?: boolean;
  error?: string;
}

/**
 * Create a notification server-side, honoring the user's in-app preference, and
 * send an email for key events when the email preference is on AND email is
 * globally enabled (see EMAIL_ENABLED).
 *
 * Never throws — a notification must not fail the operation that triggered it
 * (an activated trial is still activated) — but it does REPORT, so a caller can
 * surface the failure instead of pretending it succeeded.
 */
export async function createServerNotification(
  supabase: Supa,
  input: NotificationInput,
): Promise<NotifyResult> {
  try {
    if (!input.userId) return { ok: false, error: "missing userId" };

    // Deliberately resolved before the insert but incapable of blocking it:
    // getChannelPrefs swallows its own failures and returns defaults.
    const prefs = await getChannelPrefs(supabase, input.userId, input.category);
    if (!prefs.inApp) return { ok: true, suppressed: true };

    const wantsEmail =
      EMAIL_ENABLED && prefs.email && EMAIL_EVENTS.has(input.event_type);

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: input.userId,
        category: input.category,
        event_type: input.event_type,
        title: input.title,
        body: input.body ?? null,
        severity: input.severity ?? "info",
        link_to: input.link_to ?? null,
        metadata: input.metadata ?? {},
        email_status: wantsEmail ? "queued" : "none",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[notify] insert failed:", error.message);
      return { ok: false, error: error.message };
    }

    if (wantsEmail) {
      await sendNotificationEmail(supabase, data.id as string);
    }
    return { ok: true, id: data.id as string };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[notify] unexpected error:", message);
    return { ok: false, error: message };
  }
}

/**
 * Send the email for an existing notification via Resend, then update its
 * email_status. Skips gracefully when the email channel is off for the category
 * or RESEND_API_KEY is unset. Returns the resulting status.
 */
export async function sendNotificationEmail(
  supabase: Supa,
  notificationId: string,
): Promise<"sent" | "skipped" | "failed"> {
  const { data: notification, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("id", notificationId)
    .single();

  if (error || !notification) {
    console.error("[notify] email: notification not found");
    return "failed";
  }

  const prefs = await getChannelPrefs(
    supabase,
    notification.user_id as string,
    notification.category as string,
  );

  const finalize = async (status: "sent" | "skipped" | "failed") => {
    await supabase
      .from("notifications")
      .update({ email_status: status })
      .eq("id", notificationId);
    return status;
  };

  // Global kill-switch first: when email is off, this is not a failure — there
  // is simply no email channel. Marking it 'failed' (which is what a missing
  // RESEND_API_KEY used to do) makes a deliberate configuration look like an
  // outage, and that is exactly how every notification row ended up 'failed'.
  if (!EMAIL_ENABLED) return finalize("skipped");
  if (!prefs.email) return finalize("skipped");

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("[notify] RESEND_API_KEY not set");
    return finalize("failed");
  }

  // Resolve the recipient's email from auth (service_role).
  const { data: authUser } = await supabase.auth.admin.getUserById(
    notification.user_id as string,
  );
  const to = authUser?.user?.email;
  if (!to) return finalize("failed");

  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ??
    "ZalorTrade <noreply@zalortrade.com>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: notification.title,
        html: renderEmail(
          notification.title as string,
          (notification.body as string | null) ?? "",
          notification.link_to as string | null,
        ),
      }),
    });

    if (!res.ok) {
      console.error("[notify] Resend error:", res.status, await res.text());
      return finalize("failed");
    }
    return finalize("sent");
  } catch (err) {
    console.error("[notify] email send failed:", err);
    return finalize("failed");
  }
}

function renderEmail(title: string, body: string, linkTo: string | null): string {
  const appUrl = Deno.env.get("APP_URL") ?? "https://www.zalortrade.com";
  const cta = linkTo
    ? `<p style="margin:24px 0;"><a href="${appUrl}${linkTo}" style="background:#2563eb;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View in app</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;">
    <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
      <h1 style="font-size:18px;color:#111827;margin:0 0 12px;">${title}</h1>
      <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0;">${body}</p>
      ${cta}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;margin:0;">You're receiving this because email alerts are enabled for this category. Manage your preferences in Settings → Notifications.</p>
    </div>
  </body></html>`;
}
