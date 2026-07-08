/**
 * Build-time prerenderer + sitemap generator. Runs as the last step of
 * `npm run build` (after `vite build` and `vite build --ssr`):
 *
 *   1. Renders every route in src/prerender/routes.js to static HTML with the
 *      SSR bundle (ReactDOMServer.renderToString — no headless browser, so it
 *      works in any CI, including Cloudflare Pages).
 *   2. Writes dist/<route>/index.html for each. Static hosts serve an existing
 *      file before the SPA fallback, so crawlers get real per-page HTML —
 *      unique title/description/canonical/OG/JSON-LD plus the rendered body —
 *      while unknown paths still fall back to the SPA shell.
 *   3. Emits dist/sitemap.xml from the same route list (with lastmod where a
 *      real content date exists).
 *
 * Head handling: the block between the seo:fallback markers in index.html
 * (site-level title/OG/Twitter fallback for the SPA shell) is REPLACED with
 * the helmet tags the page emitted, so prerendered pages never carry
 * duplicate/conflicting title, og:*, or twitter:* tags.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DIST = path.resolve("dist");
const SSR_DIR = path.resolve("dist-ssr");
const SHELL_PATH = path.join(DIST, "index.html");

const FALLBACK_START = "<!-- seo:fallback:start -->";
const FALLBACK_END = "<!-- seo:fallback:end -->";
const ROOT_DIV = '<div id="root"></div>';

async function loadSsrBundle() {
  // Vite names the SSR bundle .mjs when package.json has no "type": "module",
  // and .js when it does — accept either so a future package change can't
  // silently break the build.
  const candidates = ["entry-prerender.mjs", "entry-prerender.js"];
  let bundlePath = null;
  for (const name of candidates) {
    try {
      const candidate = path.join(SSR_DIR, name);
      await readFile(candidate);
      bundlePath = candidate;
      break;
    } catch {
      /* try next */
    }
  }
  if (!bundlePath) {
    throw new Error(`SSR bundle not found in ${SSR_DIR} (tried ${candidates.join(", ")})`);
  }
  const mod = await import(pathToFileURL(bundlePath).href);
  // Rollup may emit ESM or CJS depending on package type; handle both shapes.
  const api = mod.render ? mod : mod.default;
  if (!api?.render || !api?.PUBLIC_ROUTES || !api?.SITE_URL) {
    throw new Error(
      "SSR bundle is missing render/PUBLIC_ROUTES/SITE_URL exports — check src/prerender/entry-prerender.jsx"
    );
  }
  return api;
}

function injectHead(shell, helmet) {
  const start = shell.indexOf(FALLBACK_START);
  const end = shell.indexOf(FALLBACK_END);
  if (start === -1 || end === -1) {
    throw new Error(
      `index.html is missing the ${FALLBACK_START} / ${FALLBACK_END} markers around the static SEO block. ` +
        "If they exist in the source index.html, dist/ was already prerendered — run a fresh `vite build` first " +
        "(the full `npm run build` does this)."
    );
  }
  // helmet.priority holds the tags <Helmet prioritizeSeoTags> hoists (og:*,
  // twitter:*, canonical) — they are NOT in helmet.meta/link, so render it too.
  const headTags = [
    helmet.priority.toString(),
    helmet.title.toString(),
    helmet.meta.toString(),
    helmet.link.toString(),
    helmet.script.toString(),
  ]
    .filter(Boolean)
    .join("\n    ");
  return (
    shell.slice(0, start) + headTags + shell.slice(end + FALLBACK_END.length)
  );
}

function injectBody(shell, appHtml) {
  if (!shell.includes(ROOT_DIV)) {
    throw new Error('index.html is missing the <div id="root"></div> mount point');
  }
  return shell.replace(ROOT_DIV, `<div id="root">${appHtml}</div>`);
}

function outputPathFor(route) {
  return route === "/"
    ? SHELL_PATH
    : path.join(DIST, ...route.split("/").filter(Boolean), "index.html");
}

function buildSitemap(routes, siteUrl) {
  const entries = routes
    .map(({ path: routePath, changefreq, priority, lastmod }) => {
      const loc = routePath === "/" ? `${siteUrl}/` : `${siteUrl}${routePath}`;
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        ...(lastmod ? [`    <lastmod>${lastmod}</lastmod>`] : []),
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

async function main() {
  const { render, PUBLIC_ROUTES, SITE_URL } = await loadSsrBundle();
  const shell = await readFile(SHELL_PATH, "utf8");

  // Render "/" last: it overwrites dist/index.html, which is also the SPA
  // fallback shell — but the fallback only serves NON-prerendered paths (the
  // authed app), and those are noindex/behind auth, so a homepage-flavored
  // shell there is harmless. Every crawlable path gets its own file below.
  const routes = [...PUBLIC_ROUTES].sort((a, b) =>
    a.path === "/" ? 1 : b.path === "/" ? -1 : 0
  );

  let count = 0;
  for (const { path: routePath } of routes) {
    const { html, helmet } = render(routePath);
    const page = injectBody(injectHead(shell, helmet), html);
    const outPath = outputPathFor(routePath);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, page, "utf8");
    count += 1;
  }

  await writeFile(
    path.join(DIST, "sitemap.xml"),
    buildSitemap(PUBLIC_ROUTES, SITE_URL),
    "utf8"
  );

  await rm(SSR_DIR, { recursive: true, force: true });
  console.log(
    `prerender: wrote ${count} static routes + sitemap.xml (${PUBLIC_ROUTES.length} URLs) for ${SITE_URL}`
  );
}

main().catch((err) => {
  console.error("prerender failed:", err);
  process.exit(1);
});
