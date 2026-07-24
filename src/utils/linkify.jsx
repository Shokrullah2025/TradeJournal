import React from "react";

// Turns URLs and email addresses inside plain text into real links.
//
// Message bodies that arrive by email are stored as plain text, so a URL a
// visitor sent renders as dead grey text. This is the single place that finds
// those links and wraps them — it returns React nodes (never HTML), so nothing
// user-supplied is ever interpreted as markup.

// http(s):// URLs, bare `www.` hosts, and email addresses. The URL half stops
// at whitespace and at brackets/quotes so surrounding punctuation isn't eaten.
const LINK_PATTERN =
  /((?:https?:\/\/|www\.)[^\s<>[\]{}"'`]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

// Sentence punctuation that follows a link far more often than it belongs to it
// ("see https://x.com/docs." → the period is the sentence's).
const TRAILING_PUNCTUATION = /[.,;:!?'"]+$/;

const EMAIL_ONLY = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

// Strips punctuation the sentence owns rather than the link. Closing brackets
// are only removed when they have no opener inside the match, so
// `…/Foo_(bar)` survives while `(see https://x.com)` does not keep the `)`.
const trimTrailing = (value) => {
  let out = value.replace(TRAILING_PUNCTUATION, "");
  while (/[)\]}]$/.test(out)) {
    const close = out.slice(-1);
    const open = { ")": "(", "]": "[", "}": "{" }[close];
    const balanced =
      out.split(open).length - 1 >= out.split(close).length - 1;
    if (balanced) break;
    out = out.slice(0, -1).replace(TRAILING_PUNCTUATION, "");
  }
  return out;
};

const hrefFor = (value) => {
  if (EMAIL_ONLY.test(value)) return `mailto:${value}`;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

/**
 * Split plain text into an array of strings and <a> elements.
 *
 * @param {string} text        The plain-text body.
 * @param {object} [options]
 * @param {string} [options.className] Classes applied to each generated link.
 * @param {string} [options.testIdPrefix] When set, each link gets
 *   `data-test-id="{prefix}-link-{n}"` so automation can target it.
 * @returns {Array<string|JSX.Element>|string} Nodes ready to render.
 */
export function linkifyText(text, { className = "", testIdPrefix = "" } = {}) {
  if (typeof text !== "string" || text.length === 0) return "";

  const nodes = [];
  // A fresh regex per call: /g patterns carry `lastIndex` between calls.
  const pattern = new RegExp(LINK_PATTERN.source, "g");
  let lastIndex = 0;
  let linkIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[0];
    const value = trimTrailing(raw);
    // Nothing left once punctuation was stripped — treat it as plain text.
    if (!value) continue;

    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(
      <a
        key={`link-${match.index}`}
        href={hrefFor(value)}
        target="_blank"
        rel="noopener noreferrer nofollow"
        // Links live inside clickable rows/bubbles — don't trigger those too.
        onClick={(e) => e.stopPropagation()}
        data-test-id={testIdPrefix ? `${testIdPrefix}-link-${linkIndex}` : undefined}
        className={className}
      >
        {value}
      </a>,
    );
    linkIndex += 1;
    lastIndex = match.index + value.length;
  }

  if (nodes.length === 0) return text;
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default linkifyText;
