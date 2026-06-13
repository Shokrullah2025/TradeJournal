// Persisted per-tool style presets. The user can save a tool's settings
// (color, thickness, line style, …) under a name from the properties panel;
// the active preset is applied to every new drawing of that type.
// Stored in localStorage — purely cosmetic UI preferences, no user/trade data.

const STORAGE_KEY      = "tjp_drawing_tool_defaults";
const LAST_USED_KEY    = "tjp_drawing_last_used";

// Whitelist of style fields persisted per drawing type. Geometry fields
// (p1/p2/points/time/price) must never be saved as defaults.
const SAVED_FIELDS = {
  trendline: ["color", "lineWidth", "lineStyle"],
  segment: ["color", "lineWidth", "lineStyle", "fontSize", "labelPos", "label"],
  ray: ["color", "lineWidth", "lineStyle"],
  hline: ["color", "lineWidth", "lineStyle"],
  vline: ["color", "lineWidth", "lineStyle"],
  rectangle: ["color", "lineWidth", "lineStyle", "fontSize", "labelPos", "label"],
  freehand: ["color", "lineWidth"],
  text: ["color", "fontSize", "label"],
  fibonacci: ["color", "lineWidth", "lineStyle", "showLabels", "levels"],
  rr: ["fillOpacity", "showLabels", "lineStyle", "label", "labelPos"],
};

export const MAX_PRESET_NAME_LENGTH = 30;

// Returns the style fields persisted for a given drawing type
export function getSavedFields(type) {
  return SAVED_FIELDS[type] || ["color", "lineWidth", "lineStyle"];
}

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage full / unavailable — presets simply won't persist
  }
}

// Normalizes a stored entry to { presets: {name: style}, active: name|null }.
// Migrates the legacy format where the entry was a single flat style object.
function readType(type) {
  const raw = readAll()[type];
  if (!raw || typeof raw !== "object") return { presets: {}, active: null };
  if (raw.presets && typeof raw.presets === "object") {
    return { presets: raw.presets, active: raw.active ?? null };
  }
  // Legacy flat style object → one preset named "My default", active
  return { presets: { "My default": raw }, active: "My default" };
}

function writeType(type, entry) {
  const all = readAll();
  all[type] = entry;
  writeAll(all);
}

function pickStyleFields(type, drawing) {
  const fields = SAVED_FIELDS[type] || ["color", "lineWidth", "lineStyle"];
  const picked = {};
  fields.forEach((f) => {
    if (drawing[f] !== undefined && drawing[f] !== null) picked[f] = drawing[f];
  });
  return picked;
}

// ── Last-used helpers ──────────────────────────────────────────────────────────
function readLastUsed() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAST_USED_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Silently persists the style fields of the given drawing as the "last used"
// defaults for its tool type. Called automatically whenever a drawing property
// changes so the next drawing of the same type inherits the same look.
export function autoSaveDefaults(type, drawing) {
  if (!type || !drawing) return;
  const style = pickStyleFields(type, drawing);
  if (!Object.keys(style).length) return;
  try {
    const all = readLastUsed();
    all[type] = style;
    localStorage.setItem(LAST_USED_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — silently skip
  }
}

// Style applied to NEW drawings of this type:
//   1. Last-used style takes priority — it is auto-saved on every property
//      change AND when a named preset is applied, so it always reflects the
//      user's most recent intent.
//   2. Active named preset is the fallback (e.g. fresh tab where last-used
//      hasn't been written yet).
//   3. Returns null when neither exists → caller uses hard-coded built-in defaults.
export function getToolDefaults(type) {
  const lastUsed = readLastUsed()[type];
  if (lastUsed && typeof lastUsed === "object" && Object.keys(lastUsed).length > 0) {
    return lastUsed;
  }
  const { presets, active } = readType(type);
  if (active && presets[active] && Object.keys(presets[active]).length > 0) {
    return presets[active];
  }
  return null;
}

// All saved presets for a tool: [{ name, style }]
export function listPresets(type) {
  const { presets } = readType(type);
  return Object.entries(presets).map(([name, style]) => ({ name, style }));
}

export function getActivePresetName(type) {
  const { presets, active } = readType(type);
  return active && presets[active] ? active : null;
}

// Saves the drawing's whitelisted style fields under `name` and makes that
// preset active. Returns the saved style.
export function savePreset(type, name, drawing) {
  const trimmed = String(name || "").trim().slice(0, MAX_PRESET_NAME_LENGTH);
  if (!trimmed) return null;
  const entry = readType(type);
  const style = pickStyleFields(type, drawing);
  entry.presets[trimmed] = style;
  entry.active = trimmed;
  writeType(type, entry);
  return style;
}

// Saves presets in `orderedNames` order — call after drag-to-reorder in the UI
export function reorderPresets(type, orderedNames) {
  const entry = readType(type);
  const reordered = {};
  orderedNames.forEach((n) => { if (entry.presets[n] !== undefined) reordered[n] = entry.presets[n]; });
  entry.presets = reordered;
  writeType(type, entry);
}

export function deletePreset(type, name) {
  const entry = readType(type);
  delete entry.presets[name];
  if (entry.active === name) entry.active = null;
  writeType(type, entry);
}

// name = null selects the built-in defaults
export function setActivePreset(type, name) {
  const entry = readType(type);
  entry.active = name && entry.presets[name] ? name : null;
  writeType(type, entry);
}
