import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyAdminsContact } from "../_shared/contactNotify.ts";

// Inbound-email webhook for the Contact Inbox.
//
// When an admin replies to a contact submission (contact-reply), the email goes
// out with reply-to set to the support address. The visitor's reply lands in
// that mailbox — not in the app. This function is the missing link: point
// Resend's inbound-email webhook (support@ domain) at it, and every reply gets
// written back into contact_submissions as a new message on the sender's thread,
// so it shows up in the inbox (grouped by email via the contact_threads view)
// and bumps the unread badge in realtime.
//
// Security: this is a public, unauthenticated endpoint that writes to the DB, so
// it fails closed — requests must carry a valid Svix signature (Resend signs
// webhooks with Svix) verified against RESEND_INBOUND_SIGNING_SECRET.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "svix-id, svix-timestamp, svix-signature, content-type",
};

// Guard against oversized bodies being stored. contact_submissions.message is
// TEXT (no DB cap), but a reply thread should never be enormous — trim the
// stored copy so a huge forwarded chain can't bloat the row.
const MAX_MESSAGE_LENGTH = 20000;
// Cap for the quoted history preserved alongside a reply (metadata.quoted) —
// context only, so it can be tighter than the message itself.
const MAX_QUOTED_LENGTH = 10000;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // Read the raw body first — signature verification is over the exact bytes,
    // so we must not req.json() before verifying (same rule as stripe-webhook).
    const rawBody = await req.text();

    const signingSecret = Deno.env.get("RESEND_INBOUND_SIGNING_SECRET");
    if (!signingSecret) {
      // Fail closed: without the secret we can't tell a real Resend delivery
      // from a forged one, and this endpoint writes to the DB.
      console.error("contact-inbound: RESEND_INBOUND_SIGNING_SECRET not set");
      return errorResponse("Inbound email is not configured.", 503);
    }

    const verified = await verifySvixSignature(signingSecret, req.headers, rawBody);
    if (!verified) {
      console.error("contact-inbound: signature verification failed");
      return errorResponse("Invalid signature", 401);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return errorResponse("Invalid payload", 400);
    }

    const root = payload as Record<string, unknown>;
    // A Resend webhook endpoint can receive several event types; only inbound
    // deliveries concern us. Acknowledge anything else so it isn't retried.
    if (typeof root?.type === "string" && root.type !== "email.received") {
      return successResponse({ id: null, skipped: `event:${root.type}` });
    }
    const meta = (root?.data ?? {}) as Record<string, unknown>;
    const emailId =
      typeof meta.email_id === "string" ? meta.email_id
      : typeof meta.id === "string" ? meta.id
      : "";
    if (!emailId) {
      console.warn("contact-inbound: no email_id in payload");
      return successResponse({ id: null, skipped: "no-email-id" });
    }

    // The email.received webhook carries only metadata — no body, headers, or
    // attachments. Fetch the full message from the Received Emails API using the
    // account API key.
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      console.error("contact-inbound: RESEND_API_KEY not set");
      return errorResponse("Inbound email is not configured.", 503);
    }

    // Throws on a retrieve failure so the outer catch returns 500 and Resend
    // retries — we must not drop a reply because the fetch hit a transient error.
    const content = await fetchReceivedEmail(apiKey, emailId);
    const parsed = buildInbound(content, meta);
    if (!parsed) {
      // Genuinely empty/unparseable message — acknowledge so Resend stops retrying.
      console.warn("contact-inbound: no usable content for", emailId);
      return successResponse({ id: null, skipped: "no-content" });
    }

    const { name, email, subject, message, quoted } = parsed;

    // Loop guard: when the receiving domain is also our sending domain, our own
    // outbound mail (e.g. contact-submit's team notification from noreply@, or an
    // admin's own address) is received right back here. Never store those —
    // otherwise every form submission would create a bogus inbound "reply" row.
    if (isSelfAddress(email)) {
      return successResponse({ id: null, skipped: "self-sender" });
    }

    // service_role: bypasses RLS to write the RLS-locked contact_submissions
    // table, exactly like contact-submit.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Respect the admin block list (migration 20260709140532): discard
    // silently, same as the form path, so a blocked sender can't get back in
    // via email either.
    const { data: blocked, error: blockLookupError } = await supabase
      .from("contact_blocked_senders")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (blockLookupError) {
      console.error("contact-inbound block lookup failed:", blockLookupError.message);
    } else if (blocked) {
      return successResponse({ id: null, skipped: "blocked" });
    }

    // Keep this reply in the sender's existing thread. contact_threads groups by
    // the exact email string, and form submissions preserve the original casing
    // (the schema trims but doesn't lowercase). Reuse the stored casing of the
    // most recent message from this sender so the reply doesn't fork into a
    // second thread that differs only by case.
    const { data: existing } = await supabase
      .from("contact_submissions")
      .select("email")
      // Escape LIKE wildcards so an address with `_` or `%` (both valid in the
      // local part) matches literally instead of as a pattern.
      .ilike("email", email.replace(/([\\%_])/g, "\\$1"))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const threadEmail = existing?.email ?? email;

    const { data: inserted, error: insertError } = await supabase
      .from("contact_submissions")
      .insert({
        name,
        email: threadEmail,
        subject,
        message,
        status: "new",
        metadata: {
          source: "inbound-email",
          email_status: "received",
          // The quoted chain from the sender's mail client, shown as
          // collapsible context under the message in the inbox.
          ...(quoted ? { quoted } : {}),
        },
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("contact-inbound insert error:", insertError?.message);
      return errorResponse("Could not store inbound message", 500);
    }

    // Best-effort admin bell notification: one aggregated entry with a running
    // count (mirrors contact-submit) — never fails the request once saved.
    await notifyAdminsContact(
      supabase,
      { name, email: threadEmail, subject, submissionId: inserted.id },
      "reply",
    );

    return successResponse({ id: inserted.id });
  } catch (err) {
    console.error("contact-inbound error:", err);
    return errorResponse("Internal server error", 500);
  }
});

// ---------------------------------------------------------------------------
// Svix signature verification (Resend signs webhooks with Svix).
// Signed content is `${svix-id}.${svix-timestamp}.${body}`, HMAC-SHA256 with the
// base64-decoded secret (the part after the `whsec_` prefix), base64-encoded.
// The svix-signature header is a space-separated list of `v1,<sig>` entries.
// ---------------------------------------------------------------------------
async function verifySvixSignature(
  secret: string,
  headers: Headers,
  body: string,
): Promise<boolean> {
  try {
    const id = headers.get("svix-id");
    const timestamp = headers.get("svix-timestamp");
    const signatureHeader = headers.get("svix-signature");
    if (!id || !timestamp || !signatureHeader) return false;

    // Reject stale deliveries (replay guard): 5-minute tolerance.
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
      return false;
    }

    const keyBytes = base64ToBytes(secret.replace(/^whsec_/, ""));
    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signed = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
    const digest = await crypto.subtle.sign("HMAC", key, signed);
    const expected = bytesToBase64(new Uint8Array(digest));

    // Header may hold several signatures (during secret rotation).
    return signatureHeader
      .split(" ")
      .map((entry) => entry.split(",")[1])
      .some((sig) => sig && timingSafeEqual(sig, expected));
  } catch (err) {
    console.error("contact-inbound signature error:", err);
    return false;
  }
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// Constant-time string compare to avoid leaking the signature via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Content retrieval + parsing.
//
// Resend's email.received webhook is metadata-only, so we call the Received
// Emails API (GET /emails/receiving/{id}) to get the actual from/subject/body,
// then stay defensive about the exact field shapes so a schema tweak doesn't
// drop replies on the floor.
// ---------------------------------------------------------------------------
interface Inbound {
  name: string;
  email: string;
  subject: string;
  message: string;
  // The quoted history the sender's mail client appended ("On … wrote:" and
  // the `>` lines), kept separately so the inbox can show it as context.
  quoted: string;
}

// Fetches the full received email. Throws on any non-2xx / network failure so
// the caller can surface a 500 and let Resend retry rather than lose the reply.
async function fetchReceivedEmail(
  apiKey: string,
  emailId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`retrieve received email ${emailId} failed: ${res.status} ${detail}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

// Builds the inbound record from the retrieved email, falling back to the
// webhook metadata (which also carries from/subject) where the body response is
// thin. Returns null when there's no usable sender or body to store.
function buildInbound(
  content: Record<string, unknown>,
  meta: Record<string, unknown>,
): Inbound | null {
  const headers = (content.headers ?? {}) as Record<string, unknown>;
  // headers.from keeps the display name ("Name <a@b>"); content.from / the
  // webhook's from are usually the bare address — try richest first.
  const sender = parseAddress(headers.from ?? content.from ?? meta.from);
  if (!sender.email) return null;

  const text = typeof content.text === "string" ? content.text : "";
  const html = typeof content.html === "string" ? content.html : "";
  const rawText = text.trim() ? text : html ? stripHtml(html) : "";
  const { reply, quoted } = splitQuotedReply(rawText);
  const message = reply.trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) return null;

  const subjectSource =
    (typeof content.subject === "string" && content.subject.trim() && content.subject) ||
    (typeof meta.subject === "string" && meta.subject.trim() && meta.subject) ||
    "";
  const subject = subjectSource
    ? subjectSource.trim().slice(0, 120)
    : "(no subject)";

  return {
    name: sender.name || sender.email.split("@")[0],
    email: sender.email,
    subject,
    message,
    quoted,
  };
}

// True when the sender is one of our own outbound addresses — used to drop mail
// we sent ourselves (notifications, admin replies) when receiving on the same
// domain we send from. Derived from the configured from/reply-to env vars, plus
// the well-known defaults as a safety net.
function isSelfAddress(email: string): boolean {
  const candidates = [
    Deno.env.get("CONTACT_TO_EMAIL"),
    Deno.env.get("CONTACT_REPLY_TO_EMAIL"),
    Deno.env.get("NOTIFY_FROM_EMAIL"),
    "support@zalortrade.com",
    "noreply@zalortrade.com",
  ];
  const self = new Set<string>();
  for (const value of candidates) {
    if (!value) continue;
    const { email: addr } = parseAddress(value);
    if (addr) self.add(addr);
  }
  return self.has(email.toLowerCase());
}

// Accepts "Name <a@b.com>", "a@b.com", { name, email }, { address }, or an
// array of those (takes the first).
function parseAddress(value: unknown): { name: string; email: string } {
  if (Array.isArray(value)) return parseAddress(value[0]);

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const email = String(obj.email ?? obj.address ?? "").trim();
    const name = String(obj.name ?? "").trim();
    return { name, email: email.toLowerCase() };
  }

  if (typeof value === "string") {
    const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (match) {
      return {
        name: match[1].replace(/^["']|["']$/g, "").trim(),
        email: match[2].trim().toLowerCase(),
      };
    }
    return { name: "", email: value.trim().toLowerCase() };
  }

  return { name: "", email: "" };
}

// Best-effort split of the new reply from the quoted history, so the inbox
// shows the fresh text as the message while keeping the quote available as
// context (metadata.quoted) — the admin can still see exactly which message
// the visitor was answering.
function splitQuotedReply(text: string): { reply: string; quoted: string } {
  // Cut at the Gmail/Apple-style attribution. It commonly wraps across lines —
  // "On <date>, <name> <email>\nwrote:" — so match across newlines up to
  // "wrote:" (non-greedy, capped so it can't run away). Requires a preceding
  // newline so a message that merely starts with "On" isn't eaten.
  const attributionAt = text.search(/\n\s*On\s[\s\S]{0,200}?\bwrote:/i);
  let body = text;
  let quoted = "";
  if (attributionAt >= 0) {
    body = text.slice(0, attributionAt);
    quoted = text.slice(attributionAt);
  }

  // Then split at other common quote markers / a run of quoted `>` lines.
  const cutMarkers = [
    /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i,
    /^\s*_{5,}\s*$/,
    /^\s*From:\s.+/i,
  ];
  const lines = body.split(/\r?\n/);
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (cutMarkers.some((re) => re.test(line)) || /^\s*>/.test(line)) {
      const rest = lines.slice(i).join("\n");
      quoted = quoted ? `${rest}\n${quoted}` : rest;
      break;
    }
    out.push(line);
  }
  return { reply: out.join("\n"), quoted: cleanQuoted(quoted) };
}

// Normalizes the captured quote for display: drop `>` markers (the inbox
// renders it inside its own quote block), collapse blank runs, cap the size so
// a deep chain can't bloat the row.
function cleanQuoted(quoted: string): string {
  return quoted
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(>\s?)+/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_QUOTED_LENGTH);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
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
