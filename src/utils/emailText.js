// Makes an emailed message body readable.
//
// Inbound HTML emails (newsletters, transactional mail from big senders) are
// stored as plain text by contact-inbound, which strips the tags but keeps the
// source layout — so the body arrives carrying the HTML file's indentation,
// whitespace-only lines, and long runs of blank lines. Rendered verbatim it
// reads as a deeply indented column with page-sized gaps between sentences.
//
// This is the "Tidy" reading mode in the Contact Inbox: it only removes
// whitespace noise. No word, line order, or punctuation is touched, and the
// untouched original is always one toggle away.

// Zero-width characters some senders use for tracking or layout hacks. Written
// as escapes because the literal characters are invisible in an editor.
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;
// Non-breaking space: invisible, but defeats every whitespace rule below.
const NBSP = /\u00a0/g;

/**
 * Strip whitespace noise from an email body.
 *
 * - removes the leading indentation every line inherited from the HTML source
 * - trims trailing spaces
 * - collapses runs of spaces/tabs inside a line down to one
 * - treats whitespace-only lines as blank, then collapses a run of blank lines
 *   into a single one
 * - drops blank lines at the very start and end
 *
 * @param {string} text Raw stored message body.
 * @returns {string} The same content with the noise removed.
 */
export function tidyEmailText(text) {
  if (typeof text !== "string" || text.length === 0) return "";

  const lines = text
    .replace(ZERO_WIDTH, "")
    .replace(NBSP, " ")
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/[ \t]{2,}/g, " "));

  const out = [];
  for (const line of lines) {
    // A leading blank, or a blank following another blank, adds nothing.
    if (line === "" && (out.length === 0 || out[out.length - 1] === "")) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();

  return out.join("\n");
}

export default tidyEmailText;
