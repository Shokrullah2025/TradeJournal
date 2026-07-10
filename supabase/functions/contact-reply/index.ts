import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3";
import sanitizeHtml from "https://esm.sh/sanitize-html@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-app-name",
};

// Server-side mirror of src/lib/schemas/contact.js `contactReplySchema`.
// Never trust the browser — re-validate here (CLAUDE.md §2). The message is
// rich-text HTML from the inbox composer; the raw cap is generous for markup
// and the real 5000-char limit is enforced on the visible text after
// sanitization below.
const replySchema = z.object({
  submissionId: z.string().uuid(),
  // Optional for backward compatibility — older clients don't send one, and
  // we fall back to "Re: <original subject>".
  subject: z.string().trim().min(1).max(150).optional(),
  message: z.string().trim().min(1).max(20000),
});

// Same allowlist the app's RichTextEditor / sanitizeNoteHtml produces:
// inline formatting, lists, headings, and a color style — nothing else.
const SANITIZE_OPTIONS = {
  allowedTags: [
    "b", "strong", "i", "em", "u", "ul", "ol", "li",
    "p", "br", "span", "div", "h1", "h2", "h3",
  ],
  allowedAttributes: { "*": ["style"] },
  allowedStyles: {
    "*": { color: [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s,./%]+\)$/, /^inherit$/] },
  },
};

/** Visible-text length of sanitized reply HTML (mirrors noteTextLength). */
function textLength(html: string): number {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim()
    .length;
}

// Admin-only endpoint. Lets a support admin reply to a contact submission from
// inside the app; the reply is emailed to the submitter FROM the support address
// (reply-to support), so the admin never hands off to a personal mail client.
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Missing Authorization header", 401);

    // service_role: read the submission (RLS-locked table) and write status.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve identity server-side from the JWT — never from the body (§2).
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) return errorResponse("Invalid or expired session", 401);

    // Authorize: must be an admin. Mirrors public.is_admin() (migration 005):
    // a row in public.users with role = 'admin'.
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return errorResponse("You don't have permission to do that.", 403);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return errorResponse("Please enter a reply and try again.", 400);
    }

    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Please enter a reply message.", 400);
    }
    const { submissionId } = parsed.data;
    // Sanitize to the editor's allowlist, then enforce the limit on what the
    // recipient will actually read.
    const message = sanitizeHtml(parsed.data.message, SANITIZE_OPTIONS);
    const visibleLength = textLength(message);
    if (visibleLength === 0) {
      return errorResponse("Please enter a reply message.", 400);
    }
    if (visibleLength > 5000) {
      return errorResponse("Reply is too long (5000 characters max).", 400);
    }

    const { data: submission, error: lookupError } = await supabase
      .from("contact_submissions")
      .select("id, name, email, subject, message, created_at, metadata")
      .eq("id", submissionId)
      .single();
    if (lookupError || !submission) {
      return errorResponse("That message could not be found.", 404);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      // Email channel isn't configured — tell the admin instead of silently failing.
      return errorResponse(
        "Email sending isn't configured yet. Set RESEND_API_KEY on the function.",
        503,
      );
    }

    const supportEmail = Deno.env.get("CONTACT_TO_EMAIL") ?? "support@zalortrade.com";
    const from = `ZalorTrade Support <${supportEmail}>`;
    // The visitor's reply must land on the Resend-receiving subdomain so
    // contact-inbound picks it up — that's a different address than the sending
    // `from` when the receiving subdomain isn't a verified sending domain.
    // Falls back to the from address when unset (single-domain setups).
    const replyTo = Deno.env.get("CONTACT_REPLY_TO_EMAIL") ?? supportEmail;
    const subject = parsed.data.subject ?? `Re: ${submission.subject}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: submission.email,
        reply_to: replyTo,
        subject,
        html: renderEmail(message, {
          name: submission.name as string,
          email: submission.email as string,
          message: submission.message as string,
          at: submission.created_at as string,
        }),
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("contact-reply Resend error:", res.status, detail);
      // Admin-only endpoint: surface the provider's reason so the operator can
      // act on it (e.g. an unverified sending domain) instead of a dead end.
      let reason = "";
      try {
        reason = (JSON.parse(detail) as { message?: string }).message ?? "";
      } catch { /* non-JSON body — fall back to the generic message */ }
      return errorResponse(
        reason
          ? `Email provider rejected the reply: ${reason}`
          : "We couldn't send your reply. Please try again.",
        502,
      );
    }

    // Record the reply on the submission (audit trail) and mark it read. Status
    // stays within the existing CHECK set; reply history lives in metadata JSONB
    // and is rendered inside the conversation thread in the admin inbox.
    const prevMeta = (submission.metadata ?? {}) as Record<string, unknown>;
    const replies = Array.isArray(prevMeta.replies) ? prevMeta.replies : [];
    await supabase
      .from("contact_submissions")
      .update({
        status: "read",
        metadata: {
          ...prevMeta,
          replies: [
            ...replies,
            { at: new Date().toISOString(), by: user.email ?? user.id, subject, message },
          ],
        },
      })
      .eq("id", submissionId);

    return successResponse({ id: submissionId });
  } catch (err) {
    console.error("contact-reply error:", err);
    return errorResponse("Internal server error", 500);
  }
});

function renderEmail(
  messageHtml: string,
  quoted: { name: string; email: string; message: string; at: string },
): string {
  // `messageHtml` is already sanitized (SANITIZE_OPTIONS above) so it can be
  // embedded as-is. Plain-text replies (no markup) keep their line breaks.
  const body = /<[a-z][^>]*>/i.test(messageHtml)
    ? messageHtml
    : messageHtml.replace(/\n/g, "<br />");
  // Quote the message being answered below the reply, mail-client style
  // ("On <date>, <name> wrote:" + left-bordered muted copy), so the visitor
  // sees exactly what this responds to. The quoted content is visitor-supplied
  // plain text — escape it before embedding (CLAUDE.md §2).
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const when = new Date(quoted.at);
  const whenLabel = Number.isNaN(when.getTime())
    ? ""
    : `On ${when.toUTCString()}, `;
  const quotedHtml = `
    <div style="margin-top:24px;color:#6b7280;font-size:13px;">${whenLabel}${esc(quoted.name)} &lt;${esc(quoted.email)}&gt; wrote:</div>
    <blockquote style="margin:8px 0 0;padding:0 0 0 12px;border-left:3px solid #d1d5db;color:#6b7280;font-size:13px;white-space:pre-wrap;">${esc(quoted.message)}</blockquote>`;
  // Plain message — no card, border, or background, so it reads like a normal
  // email rather than a boxed notification.
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111827;font-size:14px;line-height:1.6;margin:0;padding:16px;">${body}${quotedHtml}</body></html>`;
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
