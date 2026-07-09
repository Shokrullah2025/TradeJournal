import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
};

// Server-side mirror of src/lib/schemas/contact.js. We re-validate here because
// the client check can be bypassed — never trust the browser (CLAUDE.md §2).
const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().min(1).max(254).email(),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
});

// Spam guard for this public, unauthenticated endpoint (CLAUDE.md §2).
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Public endpoint — no auth.getUser(). Anonymous visitors submit the Contact
// form; we validate, rate-limit, persist, and best-effort email the team.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // service_role: bypasses RLS so we can write to a table with no client policies.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Please check the form and try again.", 400);
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Please check the form and try again.", 400);
    }
    const { name, email, subject, message } = parsed.data;

    const ip = (req.headers.get("x-forwarded-for") ?? "")
      .split(",")[0]
      .trim() || "unknown";
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    // CAPTCHA: verify the Cloudflare Turnstile token. Enforced only when the
    // secret is configured, so dev/local without keys still works.
    const turnstileSecret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (turnstileSecret) {
      const token = (body as { captchaToken?: unknown }).captchaToken;
      if (typeof token !== "string" || !token) {
        return errorResponse("Please complete the captcha and try again.", 400);
      }
      const ok = await verifyTurnstile(turnstileSecret, token, ip);
      if (!ok) {
        return errorResponse("Captcha verification failed. Please try again.", 400);
      }
    }

    // Per-IP rate limit: count this IP's submissions in the last hour.
    if (ip !== "unknown") {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count } = await supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("metadata->>ip", ip)
        .gte("created_at", since);

      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        return errorResponse(
          "You've sent a few messages recently — please try again later.",
          429,
        );
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email,
        subject,
        message,
        metadata: { ip, user_agent: userAgent, email_status: "none" },
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("contact-submit insert error:", insertError?.message);
      return errorResponse(
        "We couldn't send your message. Please try again.",
        500,
      );
    }

    // Best-effort in-app notification for admins, aggregated per sender email
    // (one bell entry with a running count, not a new row per message).
    await notifyAdminsInApp(supabase, {
      name,
      email,
      subject,
      submissionId: inserted.id,
    });

    // Best-effort team notification. The submission is already saved, so a
    // missing/failed email never fails the request — we just record the outcome.
    const emailStatus = await notifyTeam({ name, email, subject, message });
    if (emailStatus !== "none") {
      await supabase
        .from("contact_submissions")
        .update({ metadata: { ip, user_agent: userAgent, email_status: emailStatus } })
        .eq("id", inserted.id);
    }

    return successResponse({ id: inserted.id });
  } catch (err) {
    console.error("contact-submit error:", err);
    return errorResponse("Internal server error", 500);
  }
});

// Verifies a Cloudflare Turnstile token against the siteverify endpoint.
// Returns true only when Cloudflare confirms the challenge passed.
async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string,
): Promise<boolean> {
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") form.append("remoteip", ip);

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: form },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success === true;
  } catch (err) {
    console.error("contact-submit turnstile verify failed:", err);
    return false;
  }
}

// Creates or bumps one in-app notification per admin per sender email.
// Repeat messages from the same sender increment the count on the existing
// unread notification (and move it to the top by refreshing created_at)
// instead of stacking a separate notification for every message. Once the
// admin reads the notification, the next message starts a fresh one.
// Never throws — the submission is already saved and must not fail here.
async function notifyAdminsInApp(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  input: { name: string; email: string; subject: string; submissionId: string },
): Promise<void> {
  try {
    const { data: admins, error: adminsError } = await supabase
      .from("users")
      .select("id")
      .eq("role", "admin");
    if (adminsError || !admins?.length) {
      if (adminsError) {
        console.error("contact-submit admin lookup failed:", adminsError.message);
      }
      return;
    }

    await Promise.all(
      admins.map(async ({ id: adminId }: { id: string }) => {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id, metadata")
          .eq("user_id", adminId)
          .eq("category", "contact")
          .eq("event_type", "contact_message")
          .eq("metadata->>sender_email", input.email)
          .is("read_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          const count = (Number(existing.metadata?.count) || 1) + 1;
          const { error } = await supabase
            .from("notifications")
            .update({
              title: `${count} new messages from ${input.name}`,
              body: input.subject,
              metadata: {
                ...existing.metadata,
                sender_email: input.email,
                count,
                latest_submission_id: input.submissionId,
              },
              // Bump so the aggregated entry surfaces at the top of the bell.
              created_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
          if (error) {
            console.error("contact-submit notification bump failed:", error.message);
          }
        } else {
          const { error } = await supabase.from("notifications").insert({
            user_id: adminId,
            category: "contact",
            event_type: "contact_message",
            title: `New message from ${input.name}`,
            body: input.subject,
            severity: "info",
            link_to: "/admin/contact-submissions",
            metadata: {
              sender_email: input.email,
              count: 1,
              latest_submission_id: input.submissionId,
            },
          });
          if (error) {
            console.error("contact-submit notification insert failed:", error.message);
          }
        }
      }),
    );
  } catch (err) {
    console.error("contact-submit admin notification failed:", err);
  }
}

// Emails the support inbox via Resend, with reply-to set to the submitter so the
// team can respond directly. Mirrors the fetch pattern in _shared/notify.ts.
async function notifyTeam(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<"sent" | "failed" | "none"> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return "none"; // email channel not configured — skip silently

  const to = Deno.env.get("CONTACT_TO_EMAIL") ?? "support@zalortrade.com";
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
        reply_to: input.email,
        subject: `New contact: ${input.subject}`,
        html: renderEmail(input),
      }),
    });

    if (!res.ok) {
      console.error("contact-submit Resend error:", res.status, await res.text());
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("contact-submit email send failed:", err);
    return "failed";
  }
}

function renderEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  // Escape user-provided strings before embedding in HTML (CLAUDE.md §2).
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
      <h1 style="font-size:18px;color:#111827;margin:0 0 16px;">New contact form submission</h1>
      <p style="font-size:14px;color:#4b5563;margin:0 0 6px;"><strong>From:</strong> ${esc(input.name)} &lt;${esc(input.email)}&gt;</p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 16px;"><strong>Subject:</strong> ${esc(input.subject)}</p>
      <div style="font-size:14px;color:#111827;line-height:1.6;white-space:pre-wrap;border-top:1px solid #e5e7eb;padding-top:16px;">${esc(input.message)}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;margin:0;">Reply directly to this email to respond to ${esc(input.name)}.</p>
    </div>
  </body></html>`;
}

function successResponse(data: unknown) {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
