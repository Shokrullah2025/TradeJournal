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
  ALLOWED_TAGS: ["b", "strong", "i", "em", "u", "ul", "ol", "li", "p", "br", "span", "div", "h1", "h2", "h3"],
  // `style` is the only attribute we keep — DOMPurify still sanitizes the CSS it
  // contains, so only safe declarations (e.g. `color`) survive.
  ALLOWED_ATTR: ["style"],
  // Defense in depth: no data:, no external resource loading of any kind.
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitize note HTML for safe storage/rendering. Returns a clean HTML string.
 */
export function sanitizeNoteHtml(html) {
  if (typeof html !== "string" || html.length === 0) return "";
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
