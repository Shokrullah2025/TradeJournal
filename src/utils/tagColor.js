// Deterministic color for a setup tag, derived from its name so the *same* tag
// always renders in the *same* color everywhere it appears (across chart windows,
// the session list, and the replay), while different tags get different colors.
//
// Palette intentionally avoids plain blue and spreads across distinct hues. Each
// entry is a light tint background + a strong text color, readable on both light
// and dark surfaces.

const TAG_PALETTE = [
  { bg: "#d1f4ed", text: "#0d9488" }, // teal
  { bg: "#ede9fe", text: "#7c3aed" }, // violet
  { bg: "#fef3c7", text: "#b45309" }, // amber
  { bg: "#ffe4e6", text: "#e11d48" }, // rose
  { bg: "#dcfce7", text: "#16a34a" }, // green
  { bg: "#ffedd5", text: "#ea580c" }, // orange
  { bg: "#cffafe", text: "#0891b2" }, // cyan
  { bg: "#fce7f3", text: "#db2777" }, // pink
  { bg: "#e0e7ff", text: "#4f46e5" }, // indigo
  { bg: "#ecfccb", text: "#65a30d" }, // lime
];

// Stable string hash (FNV-1a style) — case-insensitive so "FVG" and "fvg" match.
function hashTag(name) {
  const s = String(name).trim().toLowerCase();
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

/**
 * Returns `{ bg, text }` hex colors for a tag name. Same name → same colors.
 */
export function tagColor(name) {
  return TAG_PALETTE[hashTag(name) % TAG_PALETTE.length];
}
