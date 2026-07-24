/**
 * One-off backfill: recover attachments from inbound contact emails that were
 * received before contact-inbound learned to store them.
 *
 * Until 2026-07-24 the inbound webhook only kept an email's text, so every PDF,
 * screenshot and document a visitor sent was left behind on Resend. Resend
 * keeps received emails — attachments included — for 30 days, so anything that
 * arrived inside that window can still be pulled back and attached to the
 * message it belongs to.
 *
 * What it does, per received email in the window:
 *   1. lists its attachments (GET /emails/receiving/{id}/attachments)
 *   2. finds the contact_submissions row that email produced (same sender,
 *      same subject, arrived at about the same time)
 *   3. applies the same type/size rules as contact-inbound, uploads the files
 *      to the private contact-attachments bucket, and records them on
 *      metadata.attachments — exactly the shape the inbox renders
 *
 * Guard rails:
 *   - Dry run by default. Nothing is uploaded or written without `--apply`.
 *   - Idempotent: a message that already has attachments is skipped, storage
 *     paths are deterministic, and uploads use upsert — safe to re-run.
 *   - Never invents data: an email with no matching row is reported, not
 *     inserted. (Attachment-only emails were dropped entirely back then, so
 *     they have no row to attach to.)
 *
 * Prerequisites:
 *   - migration 20260724120000 applied (`supabase db push`) so the
 *     contact-attachments bucket and its policies exist
 *   - env: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 *     (SUPABASE_URL falls back to VITE_SUPABASE_URL in .env)
 *
 * Usage:
 *   node scripts/backfill-contact-attachments.mjs                # dry run
 *   node scripts/backfill-contact-attachments.mjs --apply        # write
 *   node scripts/backfill-contact-attachments.mjs --days=7 --apply
 *
 * The validation rules below intentionally mirror
 * supabase/functions/contact-inbound/index.ts — that function is the source of
 * truth; this script is a throwaway that must agree with it. Deno and Node
 * can't share the module, hence the copy.
 */
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const ATTACHMENT_BUCKET = "contact-attachments";
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_ATTACHMENTS_TOTAL_BYTES = 25 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const INLINE_IMAGE_MIN_BYTES = 10 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
]);

// How far apart a received email and the row it created may sit. The webhook
// fires within seconds, but a Resend retry can push the insert out — an hour is
// generous without risking a match against a different email from the sender
// (the subject check below does the real work).
const MATCH_WINDOW_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const days = Number(args.find((a) => a.startsWith("--days="))?.split("=")[1] ?? 30);
const emailLimit = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] ?? 0);

if (!Number.isFinite(days) || days <= 0) {
  console.error("--days must be a positive number");
  process.exit(1);
}

const resendKey = process.env.RESEND_API_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.SUPABASE_URL || (await readEnvFile("VITE_SUPABASE_URL"));

if (!resendKey || !serviceKey || !supabaseUrl) {
  console.error(
    "Missing configuration. Required:\n" +
      "  RESEND_API_KEY            (Resend dashboard → API Keys)\n" +
      "  SUPABASE_SERVICE_ROLE_KEY (Supabase dashboard → Settings → API)\n" +
      "  SUPABASE_URL              (optional; defaults to VITE_SUPABASE_URL in .env)",
  );
  process.exit(1);
}

const resendHeaders = { Authorization: `Bearer ${resendKey}` };
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
const summary = {
  emailsScanned: 0,
  emailsWithFiles: 0,
  alreadyDone: 0,
  noMatch: 0,
  messagesUpdated: 0,
  filesStored: 0,
  filesSkipped: 0,
};

console.log(
  `${apply ? "APPLYING" : "DRY RUN"} — scanning inbound email from the last ${days} day(s)` +
    `${apply ? "" : "; re-run with --apply to write"}\n`,
);

await assertBucketExists();

// ---------------------------------------------------------------------------
// Walk the received emails newest-first, stopping at the cutoff.
// ---------------------------------------------------------------------------
let cursor = null;
let pages = 0;
outer: while (pages < 50) {
  pages += 1;
  const page = await listReceivedEmails(cursor);
  if (page.length === 0) break;

  for (const email of page) {
    const receivedAt = new Date(email.created_at ?? email.received_at ?? 0);
    if (Number.isFinite(receivedAt.getTime()) && receivedAt.getTime() < cutoff) break outer;

    summary.emailsScanned += 1;
    if (emailLimit && summary.emailsScanned > emailLimit) break outer;

    await processEmail(email, receivedAt);
  }

  const last = page[page.length - 1];
  const nextCursor = last?.id ?? null;
  // No advancing cursor means we can't page further without looping forever.
  if (!nextCursor || nextCursor === cursor) break;
  cursor = nextCursor;
}

console.log("\n──────── summary ────────");
console.log(`emails scanned          ${summary.emailsScanned}`);
console.log(`  with attachments      ${summary.emailsWithFiles}`);
console.log(`  already backfilled    ${summary.alreadyDone}`);
console.log(`  no matching message   ${summary.noMatch}`);
console.log(`messages updated        ${summary.messagesUpdated}`);
console.log(`files stored            ${summary.filesStored}`);
console.log(`files skipped           ${summary.filesSkipped}`);
if (!apply && summary.filesStored > 0) {
  console.log("\n(dry run — nothing was written; re-run with --apply)");
}

// ---------------------------------------------------------------------------
// Per-email work
// ---------------------------------------------------------------------------
async function processEmail(email, receivedAt) {
  const files = await listAttachments(email.id);
  if (files.length === 0) return;

  const sender = parseAddress(email.from);
  const subject = String(email.subject ?? "").trim().slice(0, 120) || "(no subject)";
  const label = `${receivedAt.toISOString()}  ${sender || "?"}  “${subject}”`;

  if (!sender) {
    summary.noMatch += 1;
    console.log(`SKIP  ${label}\n      no sender address on the received email`);
    return;
  }

  summary.emailsWithFiles += 1;

  const row = await findSubmission(sender, subject, receivedAt);
  if (!row) {
    summary.noMatch += 1;
    console.log(
      `SKIP  ${label}\n      ${files.length} file(s) on Resend, but no matching inbox message ` +
        "(attachment-only emails were dropped entirely back then)",
    );
    return;
  }
  if (Array.isArray(row.metadata?.attachments) && row.metadata.attachments.length > 0) {
    summary.alreadyDone += 1;
    return;
  }

  console.log(`MATCH ${label}\n      → message ${row.id}`);

  const stored = [];
  const skipped = [];
  let totalBytes = 0;

  for (const [index, att] of files.slice(0, MAX_ATTACHMENTS).entries()) {
    const filename = safeFilename(att.filename);
    const contentType = String(att.content_type ?? "").split(";")[0].trim().toLowerCase();
    const declaredSize = Number(att.size) || 0;
    const inline = String(att.content_disposition ?? "").trim().toLowerCase().startsWith("inline");
    const downloadUrl =
      typeof att.download_url === "string" ? att.download_url
      : typeof att.url === "string" ? att.url
      : "";

    if (inline && contentType.startsWith("image/") && declaredSize > 0 &&
        declaredSize < INLINE_IMAGE_MIN_BYTES) {
      continue; // signature logo / tracking pixel
    }
    if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
      skipped.push({ filename, contentType, size: declaredSize, reason: "type" });
      console.log(`      skip ${filename} (${contentType || "unknown type"})`);
      continue;
    }
    if (declaredSize > MAX_ATTACHMENT_BYTES ||
        totalBytes + declaredSize > MAX_ATTACHMENTS_TOTAL_BYTES) {
      skipped.push({ filename, contentType, size: declaredSize, reason: "size" });
      console.log(`      skip ${filename} (too large: ${declaredSize} bytes)`);
      continue;
    }
    if (!downloadUrl) {
      skipped.push({ filename, contentType, size: declaredSize, reason: "download" });
      console.log(`      skip ${filename} (no download URL — it may have expired)`);
      continue;
    }

    const path = `${row.id}/${index}-${filename}`;

    if (!apply) {
      totalBytes += declaredSize;
      stored.push({ path, filename, contentType, size: declaredSize, inline });
      summary.filesStored += 1;
      console.log(`      would store ${filename} (${contentType}, ${declaredSize} bytes)`);
      continue;
    }

    let bytes;
    try {
      const res = await fetch(
        downloadUrl,
        new URL(downloadUrl).hostname === "api.resend.com" ? { headers: resendHeaders } : {},
      );
      if (!res.ok) throw new Error(`status ${res.status}`);
      bytes = new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      skipped.push({ filename, contentType, size: declaredSize, reason: "download" });
      console.log(`      FAIL ${filename} — download: ${err.message}`);
      continue;
    }

    if (bytes.byteLength > MAX_ATTACHMENT_BYTES ||
        totalBytes + bytes.byteLength > MAX_ATTACHMENTS_TOTAL_BYTES) {
      skipped.push({ filename, contentType, size: bytes.byteLength, reason: "size" });
      console.log(`      skip ${filename} (too large: ${bytes.byteLength} bytes)`);
      continue;
    }

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .upload(path, bytes, { contentType, upsert: true });
    if (uploadError) {
      skipped.push({ filename, contentType, size: bytes.byteLength, reason: "upload" });
      console.log(`      FAIL ${filename} — upload: ${uploadError.message}`);
      continue;
    }

    totalBytes += bytes.byteLength;
    stored.push({ path, filename, contentType, size: bytes.byteLength, inline });
    summary.filesStored += 1;
    console.log(`      stored ${filename} (${contentType}, ${bytes.byteLength} bytes)`);
  }

  // More files than we take: record the real total so the inbox can point the
  // admin at Resend for the rest.
  const truncated = files.length > MAX_ATTACHMENTS ? files.length : 0;
  if (truncated > 0) {
    console.log(`      note: ${truncated} files on the email, storing the first ${MAX_ATTACHMENTS}`);
  }

  summary.filesSkipped += skipped.length;
  if (stored.length === 0 && skipped.length === 0 && truncated === 0) return;

  if (!apply) {
    summary.messagesUpdated += 1;
    return;
  }

  const { error: updateError } = await supabase
    .from("contact_submissions")
    .update({
      metadata: {
        ...(row.metadata ?? {}),
        ...(stored.length > 0 ? { attachments: stored } : {}),
        ...(skipped.length > 0 ? { attachments_skipped: skipped } : {}),
        ...(truncated > 0 ? { attachments_truncated: truncated } : {}),
        // Marks the row as touched by this script rather than by the webhook.
        attachments_backfilled_at: new Date().toISOString(),
      },
    })
    .eq("id", row.id);
  if (updateError) {
    console.log(`      FAIL metadata update: ${updateError.message}`);
    return;
  }
  summary.messagesUpdated += 1;
}

// The inbox row this received email produced. Candidates are every message from
// the sender inside the match window; an exact subject match wins, otherwise the
// closest in time does.
async function findSubmission(sender, subject, receivedAt) {
  const from = new Date(receivedAt.getTime() - MATCH_WINDOW_MS).toISOString();
  const to = new Date(receivedAt.getTime() + MATCH_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("contact_submissions")
    .select("id, email, subject, metadata, created_at")
    // Escape LIKE wildcards — `_` and `%` are legal in an address local part.
    .ilike("email", sender.replace(/([\\%_])/g, "\\$1"))
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false });

  if (error) {
    console.log(`      lookup failed: ${error.message}`);
    return null;
  }
  const candidates = data ?? [];
  if (candidates.length === 0) return null;

  const exact = candidates.filter((r) => (r.subject ?? "").trim() === subject);
  const pool = exact.length > 0 ? exact : candidates;
  return pool.reduce((best, r) =>
    Math.abs(new Date(r.created_at) - receivedAt) < Math.abs(new Date(best.created_at) - receivedAt)
      ? r
      : best,
  );
}

// ---------------------------------------------------------------------------
// Resend + storage helpers
// ---------------------------------------------------------------------------
async function listReceivedEmails(after) {
  const url = new URL("https://api.resend.com/emails/receiving");
  url.searchParams.set("limit", "100");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url, { headers: resendHeaders });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`list received emails failed: ${res.status} ${detail}`);
  }
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

async function listAttachments(emailId) {
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=${MAX_ATTACHMENTS}`,
    { headers: resendHeaders },
  );
  if (!res.ok) return []; // 404 = none on some accounts
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

// Fail early and clearly if the migration hasn't been pushed — otherwise every
// upload fails one by one with a cryptic "bucket not found".
async function assertBucketExists() {
  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).list("", { limit: 1 });
  if (error) {
    console.error(
      `Storage bucket "${ATTACHMENT_BUCKET}" is not reachable: ${error.message}\n` +
        "Apply migration 20260724120000 first (`supabase db push`).",
    );
    process.exit(1);
  }
}

// "Name <a@b.com>" | "a@b.com" | { email } | [ … ] → lowercased address
function parseAddress(value) {
  if (Array.isArray(value)) return parseAddress(value[0]);
  if (value && typeof value === "object") {
    return String(value.email ?? value.address ?? "").trim().toLowerCase();
  }
  if (typeof value !== "string") return "";
  const match = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return (match ? match[2] : value).trim().toLowerCase();
}

function safeFilename(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 100);
  return cleaned || "attachment";
}

async function readEnvFile(key) {
  try {
    const text = await readFile(new URL("../.env", import.meta.url), "utf8");
    return text.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}
