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
      .select("id, name, email, subject, metadata")
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

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: submission.email,
        reply_to: supportEmail,
        subject: `Re: ${submission.subject}`,
        html: renderEmail(
          submission.name as string,
          message,
        ),
      }),
    });

    if (!res.ok) {
      console.error("contact-reply Resend error:", res.status, await res.text());
      return errorResponse("We couldn't send your reply. Please try again.", 502);
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
            { at: new Date().toISOString(), by: user.email ?? user.id, message },
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

function renderEmail(name: string, messageHtml: string): string {
  // `messageHtml` is already sanitized (SANITIZE_OPTIONS above) so it can be
  // embedded as-is; the sender name is still escaped (CLAUDE.md §2).
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Plain-text replies (no markup) keep their line breaks.
  const body = /<[a-z][^>]*>/i.test(messageHtml)
    ? messageHtml
    : messageHtml.replace(/\n/g, "<br />");
  return `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e5e7eb;">
      <p style="font-size:14px;color:#111827;margin:0 0 16px;">Hi ${esc(name)},</p>
      <div style="font-size:14px;color:#111827;line-height:1.6;">${body}</div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:12px;color:#9ca3af;margin:0;">ZalorTrade Support · Reply to this email to continue the conversation.</p>
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
