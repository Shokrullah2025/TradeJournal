/**
 * Centralised SEO constants and helpers. Every public page builds its
 * <head> metadata from here so titles, descriptions, and canonical URLs stay
 * consistent and absolute (required for Open Graph / Twitter previews).
 *
 * The canonical origin is read from VITE_SITE_URL so it can be overridden per
 * environment (preview deploys, custom domains). It falls back to the
 * production domain. Trailing slashes are stripped to avoid double slashes
 * when composing canonical URLs.
 */

export const SITE_NAME = "ZalorTrade";

// Absolute origin used for canonical URLs, sitemap entries, and og:url.
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://www.zalortrade.com"
).replace(/\/+$/, "");

// One-line value proposition reused as the default meta description and the
// homepage description.
export const SITE_DESCRIPTION =
  "ZalorTrade is a data-driven trading journal: auto-sync your broker, " +
  "journal every trade, and turn your track record into real, measurable " +
  "analytics — win rate, profit factor, drawdown, and more.";

// Default social-share image. A 1200x630 PNG/JPG gives the best preview across
// X, Facebook, LinkedIn, and Slack. Replace /og-image.png in public/ with a
// branded card; until then the logo is used as a safe fallback.
export const DEFAULT_OG_IMAGE = "/og-image.png";

export const TWITTER_HANDLE = "@zalortrade";

/**
 * Build an absolute URL from a route path (e.g. "/pricing"). Accepts an
 * already-absolute URL and returns it untouched.
 */
export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/**
 * Compose the document title. Pass a page title to get
 * "Page Title | ZalorTrade"; omit it for the bare site name (used on the
 * homepage to avoid a redundant "ZalorTrade | ZalorTrade").
 */
export function pageTitle(title) {
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}
