// Single place that turns user-authored note HTML into something safe to store
// and render. Per CLAUDE.md §2, any HTML that ever reaches the DOM must be run
// through DOMPurify first — never trust contentEditable output as-is.
//
// The session-note editor only produces bold / italic / underline, ordered and
// unordered lists, and text color. We allow exactly that and nothing else, so a
// pasted <script>, <img onerror>, or inline event handler is stripped.

import DOMPurify from "dompurify";

const NOTE_CONFIG = {
  // h1–h3 are produced by the Contact Inbox reply composer (withHeadings).
  // `a` keeps links that were pasted or typed into a reply clickable — without
  // it DOMPurify unwrapped them and the URL rendered as dead text.
  ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "ul", "ol", "li", "p", "br", "span", "div", "h1", "h2", "h3", "a"],
  // `style` is kept — DOMPurify still sanitizes the CSS it contains, so only
  // safe declarations (e.g. `color`) survive. The link attributes are forced to
  // safe values by the hook below; DOMPurify's own URI check already rejects
  // `javascript:` and other script-bearing schemes in `href`.
  ALLOWED_ATTR: ["style", "href", "target", "rel"],
  // Defense in depth: no data:, no external resource loading of any kind.
  ALLOW_DATA_ATTR: false,
};

// Any link that survives sanitization opens in a new tab and can't reach back
// into this window (`noopener`) or leak the app URL as a referrer.
//
// Registered on first sanitize rather than at module load: the prerender build
// imports this module in Node, where DOMPurify has no DOM to bind to and
// exposes no `addHook` — a module-level call there fails the whole SSR bundle.
// The hook is global to the DOMPurify singleton, so it is only added once.
let linkHookRegistered = false;

function ensureLinkHook() {
  if (linkHookRegistered || typeof DOMPurify.addHook !== "function") return;
  linkHookRegistered = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

/**
 * Sanitize note HTML for safe storage/rendering. Returns a clean HTML string.
 */
export function sanitizeNoteHtml(html) {
  if (typeof html !== "string" || html.length === 0) return "";
  ensureLinkHook();
  return DOMPurify.sanitize(html, NOTE_CONFIG);
}

/**
 * Plain-text length of note HTML — used to enforce the character limit against
 * what the user actually typed, not the markup overhead.
 */
export function noteTextLength(html) {
  if (typeof html !== "string" || html.length === 0) return 0;
  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return text.replace(/\s+/g, " ").trim().length;
}
