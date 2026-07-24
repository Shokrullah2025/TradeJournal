/**
 * Download the files people emailed to support@, straight from Resend.
 *
 * The Contact Inbox now stores attachments itself, but anything received before
 * that went live exists only on Resend — visible in the dashboard, yet awkward
 * to pull out of it. This fetches them to a local folder instead.
 *
 * Unlike scripts/backfill-contact-attachments.mjs, this touches nothing but
 * your disk: no Supabase key, no writes to the database or storage. Use the
 * backfill when you want the files to appear in the inbox; use this when you
 * just want the file in your hands.
 *
 * Resend keeps received email for 30 days — older messages are gone.
 *
 * Usage:
 *   RESEND_API_KEY=... node scripts/download-inbound-attachments.mjs --list
 *   RESEND_API_KEY=... node scripts/download-inbound-attachments.mjs
 *   RESEND_API_KEY=... node scripts/download-inbound-attachments.mjs --match=screening
 *   RESEND_API_KEY=... node scripts/download-inbound-attachments.mjs --out=C:/Users/me/Downloads
 *
 * Flags:
 *   --list           show what's there, download nothing
 *   --match=<text>   only emails whose subject or sender contains <text>
 *                    (case-insensitive)
 *   --days=<n>       how far back to look (default 30)
 *   --out=<dir>      where to save (default ./inbound-attachments)
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_ATTACHMENTS_PER_EMAIL = 100;

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const match = (args.find((a) => a.startsWith("--match="))?.split("=")[1] ?? "").toLowerCase();
const days = Number(args.find((a) => a.startsWith("--days="))?.split("=")[1] ?? 30);
const outDir = args.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "inbound-attachments";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error(
    "Missing RESEND_API_KEY.\n" +
      "Grab one from the Resend dashboard → API Keys (read access is enough), then:\n" +
      "  RESEND_API_KEY=re_... node scripts/download-inbound-attachments.mjs --list",
  );
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiKey}` };
const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
let emailsWithFiles = 0;
let downloaded = 0;

console.log(
  `${listOnly ? "Listing" : "Downloading"} attachments from the last ${days} day(s)` +
    `${match ? ` matching "${match}"` : ""}\n`,
);

let cursor = null;
let pages = 0;
outer: while (pages < 50) {
  pages += 1;
  const page = await listReceivedEmails(cursor);
  if (page.length === 0) break;

  for (const email of page) {
    const receivedAt = new Date(email.created_at ?? email.received_at ?? 0);
    if (Number.isFinite(receivedAt.getTime()) && receivedAt.getTime() < cutoff) break outer;

    const from = describeSender(email.from);
    const subject = String(email.subject ?? "(no subject)").trim();
    if (match && !`${subject} ${from}`.toLowerCase().includes(match)) continue;

    const files = await listAttachments(email.id);
    if (files.length === 0) continue;

    emailsWithFiles += 1;
    console.log(`${receivedAt.toISOString()}  ${from}`);
    console.log(`  ${subject}`);

    for (const file of files) {
      const filename = safeFilename(file.filename);
      const size = formatSize(Number(file.size) || 0);
      const url =
        typeof file.download_url === "string" ? file.download_url
        : typeof file.url === "string" ? file.url
        : "";

      if (listOnly) {
        console.log(`    ${filename}  ${file.content_type ?? ""}  ${size}`);
        continue;
      }
      if (!url) {
        console.log(`    ${filename} — no download URL (it may have expired)`);
        continue;
      }

      try {
        // A pre-signed storage link must be fetched WITHOUT the API key —
        // two auth mechanisms is an error. Only Resend's own host gets it.
        const res = await fetch(
          url,
          new URL(url).hostname === "api.resend.com" ? { headers } : {},
        );
        if (!res.ok) throw new Error(`status ${res.status}`);
        const bytes = Buffer.from(await res.arrayBuffer());

        // One folder per email, so files from different senders can't collide.
        const dir = path.join(outDir, `${stamp(receivedAt)}-${safeFilename(from)}`);
        await mkdir(dir, { recursive: true });
        const target = path.join(dir, filename);
        await writeFile(target, bytes);
        downloaded += 1;
        console.log(`    saved ${target}  (${formatSize(bytes.length)})`);
      } catch (err) {
        console.log(`    FAILED ${filename} — ${err.message}`);
      }
    }
    console.log("");
  }

  const next = page[page.length - 1]?.id ?? null;
  if (!next || next === cursor) break;
  cursor = next;
}

if (emailsWithFiles === 0) {
  console.log("No emails with attachments in that window.");
} else if (listOnly) {
  console.log(`${emailsWithFiles} email(s) with attachments. Re-run without --list to download.`);
} else {
  console.log(`Done — ${downloaded} file(s) from ${emailsWithFiles} email(s) into ${outDir}/`);
}

async function listReceivedEmails(after) {
  const url = new URL("https://api.resend.com/emails/receiving");
  url.searchParams.set("limit", "100");
  if (after) url.searchParams.set("after", after);
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`list received emails failed: ${res.status} ${detail}`);
  }
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

async function listAttachments(emailId) {
  const res = await fetch(
    `https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments?limit=${MAX_ATTACHMENTS_PER_EMAIL}`,
    { headers },
  );
  if (!res.ok) return [];
  const body = await res.json();
  return Array.isArray(body?.data) ? body.data : [];
}

function describeSender(value) {
  if (Array.isArray(value)) return describeSender(value[0]);
  if (value && typeof value === "object") {
    return String(value.email ?? value.address ?? "unknown").trim().toLowerCase();
  }
  if (typeof value !== "string") return "unknown";
  const m = value.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return (m ? m[2] : value).trim().toLowerCase();
}

function safeFilename(value) {
  const base = String(value ?? "").trim().split(/[\\/]/).pop() ?? "";
  return (
    base
      .replace(/[^A-Za-z0-9._@-]+/g, "_")
      .replace(/_{2,}/g, "_")
      .replace(/^[._-]+/, "")
      .slice(0, 100) || "attachment"
  );
}

function stamp(date) {
  return Number.isFinite(date.getTime())
    ? date.toISOString().slice(0, 10)
    : "undated";
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
