// Shared server-side notification helpers for Edge Functions.
// Mirrors the client-side src/utils/notifications.js contract but runs under the
// service_role key (RLS-bypassing) so webhooks and background jobs can notify.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AwsClient } from "https://esm.sh/aws4fetch@1";

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

// Defaults applied when a user has no saved notification preferences.
const DEFAULT_PREFS: Record<string, { inApp: boolean; email: boolean }> = {
  broker_sync: { inApp: true, email: true },
  billing: { inApp: true, email: true },
  performance: { inApp: true, email: false },
  security: { inApp: true, email: true },
};

async function getChannelPrefs(
  supabase: Supa,
  userId: string,
  category: string,
): Promise<{ inApp: boolean; email: boolean }> {
  const { data } = await supabase
    .from("user_profiles")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();
  const stored = (data?.preferences as Record<string, unknown> | null)
    ?.notifications as Record<string, { inApp?: boolean; email?: boolean }> | undefined;
  const fallback = DEFAULT_PREFS[category] ?? { inApp: true, email: false };
  return { ...fallback, ...(stored?.[category] ?? {}) };
}

interface NotificationInput {
  userId: string;
  category: "broker_sync" | "billing" | "performance" | "security";
  event_type: string;
  title: string;
  body?: string;
  severity?: "info" | "success" | "warning" | "error";
  link_to?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a notification server-side, honoring the user's in-app preference, and
 * send an email for key events when the email preference is on. Never throws.
 */
export async function createServerNotification(
  supabase: Supa,
  input: NotificationInput,
): Promise<void> {
  try {
    if (!input.userId) return;
    const prefs = await getChannelPrefs(supabase, input.userId, input.category);
    if (!prefs.inApp) return;

    const wantsEmail = prefs.email && EMAIL_EVENTS.has(input.event_type);

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
      return;
    }

    if (wantsEmail) {
      await sendNotificationEmail(supabase, data.id);
    }
  } catch (err) {
    console.error("[notify] unexpected error:", err);
  }
}

/**
 * Send the email for an existing notification via Brevo (primary) / SES (fallback),
 * then update its email_status. Skips gracefully when the email channel is off for
 * the category or no provider is configured. Returns the resulting status.
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

  if (!prefs.email) return finalize("skipped");

  // Resolve the recipient's email from auth (service_role).
  const { data: authUser } = await supabase.auth.admin.getUserById(
    notification.user_id as string,
  );
  const to = authUser?.user?.email;
  if (!to) return finalize("failed");

  const from = Deno.env.get("NOTIFY_FROM_EMAIL") ??
    "Trade Journal Pro <notifications@tradejournalpro.app>";
  const html = renderEmail(
    notification.title as string,
    (notification.body as string | null) ?? "",
    notification.link_to as string | null,
  );

  const status = await sendTransactionalEmail(to, from, notification.title as string, html);
  return finalize(status);
}

/**
 * Send a transactional email via Brevo (primary) with AWS SES as automatic fallback.
 * Neither provider is required — if both are unconfigured the call returns "failed".
 */
export async function sendTransactionalEmail(
  to: string,
  from: string,
  subject: string,
  html: string,
  replyTo?: string,
): Promise<"sent" | "failed"> {
  // --- Primary: Brevo ---
  const brevoKey = Deno.env.get("BREVO_API_KEY");
  if (brevoKey) {
    try {
      const payload: Record<string, unknown> = {
        sender: { email: from.match(/<(.+)>/)?.[1] ?? from, name: "Trade Journal Pro" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      };
      if (replyTo) payload.replyTo = { email: replyTo };
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": brevoKey, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) return "sent";
      console.warn("[notify] Brevo failed:", res.status, await res.text());
    } catch (err) {
      console.warn("[notify] Brevo error, falling back to SES:", err);
    }
  }

  // --- Fallback: AWS SES ---
  const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) {
    console.error("[notify] no email provider configured (BREVO_API_KEY or AWS credentials required)");
    return "failed";
  }
  const region = Deno.env.get("AWS_SES_REGION") ?? "us-east-1";
  try {
    const aws = new AwsClient({ accessKeyId, secretAccessKey, region, service: "ses" });
    const sesPayload: Record<string, unknown> = {
      FromEmailAddress: from,
      Destination: { ToAddresses: [to] },
      Content: { Simple: { Subject: { Data: subject }, Body: { Html: { Data: html } } } },
    };
    if (replyTo) sesPayload.ReplyToAddresses = [replyTo];
    const res = await aws.fetch(
      `https://email.${region}.amazonaws.com/v2/email/outbound-emails`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sesPayload) },
    );
    if (!res.ok) {
      console.error("[notify] SES error:", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[notify] SES fallback failed:", err);
    return "failed";
  }
}

function renderEmail(title: string, body: string, linkTo: string | null): string {
  const appUrl = Deno.env.get("APP_URL") ?? "https://app.tradejournalpro.app";
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
