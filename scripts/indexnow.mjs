/**
 * Submits every sitemap URL to IndexNow (Bing guideline: notify quickly when
 * URLs are added, updated, or removed). Runs at the end of `npm run build`.
 *
 * Guard rails:
 *   - Only submits on the production Cloudflare Pages build (CF_PAGES_BRANCH
 *     === "main"). Preview builds and local builds are skipped so Bing is not
 *     pinged with URLs that never went live. Set INDEXNOW_FORCE=1 to submit
 *     from a local shell after a manual deploy.
 *   - Never fails the build: any network or API error is logged and swallowed.
 *
 * The key is not a secret — IndexNow's design requires it to be publicly
 * hosted at the key location so search engines can verify domain ownership.
 * Google does not consume IndexNow; this has no effect on Google indexing.
 */
import { readFile } from "node:fs/promises";

const HOST = "zalortrade.com";
const KEY = "1efb7f2f2beddb60ed1b52a73b0b43b4"; // served from public/<KEY>.txt

const branch = process.env.CF_PAGES_BRANCH;
if (branch && branch !== "main") {
  console.log(`indexnow: skipped (preview branch "${branch}")`);
  process.exit(0);
}
if (!branch && !process.env.INDEXNOW_FORCE) {
  console.log(
    "indexnow: skipped (not a Cloudflare Pages production build; set INDEXNOW_FORCE=1 to submit manually)"
  );
  process.exit(0);
}

try {
  const xml = await readFile("dist/sitemap.xml", "utf8");
  const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urlList.length === 0) throw new Error("no <loc> entries in dist/sitemap.xml");

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: KEY,
      keyLocation: `https://${HOST}/${KEY}.txt`,
      urlList,
    }),
  });
  // 200 = submitted, 202 = accepted (key validation pending) — both fine.
  console.log(`indexnow: submitted ${urlList.length} URLs — HTTP ${res.status}`);
} catch (err) {
  console.warn(`indexnow: submission failed (non-fatal): ${err.message}`);
}
