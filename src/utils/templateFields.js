// Single source of truth for a trade template's per-field visibility config
// (Settings → Trade Templates → "Configure Fields"). Both the Settings editor
// and the Trade Entry form read from here so the toggle a user flips in
// Settings always matches what renders in the trade modal.
//
// Invariant: every field the editor can toggle MUST have an explicit boolean in
// DEFAULT_VISIBLE_FIELDS. A key that is absent is read as OFF by the Settings
// toggle (`config[key] || false`) but as VISIBLE by `isFieldVisible` below
// (`config[key] !== false`). That disagreement is exactly the "Screenshots
// toggle does nothing" bug: `screenshots` used to be missing here, so it looked
// off in Settings yet still rendered in the trade form. Keep this list complete.

export const DEFAULT_VISIBLE_FIELDS = {
  instrumentType: true,
  tradeType: true,
  strategy: true,
  setup: true,
  marketCondition: true,
  marketDirection: false,
  riskRewardRatio: true,
  targetProfit: false,
  maxLoss: false,
  timeframe: false,
  notes: false,
  stopLoss: false,
  entryPrice: false,
  exitPrice: false,
  position: false,
  screenshots: true,
};

/**
 * Whether a field should render in the Trade Entry form for a given template
 * visibility config.
 *
 * @param {Object|null|undefined} config - the template's `visibleFields` map,
 *   or null/empty when no template config is active.
 * @param {string} key - the field key (e.g. "screenshots", "notes").
 * @returns {boolean} true when the field should be shown.
 *
 * A null/empty config means "no template visibility in effect" → show every
 * field (legacy behavior). Otherwise a field is hidden only when the config
 * lists it as exactly `false`; an unknown key defaults to visible.
 */
export function isFieldVisible(config, key) {
  if (!config || Object.keys(config).length === 0) return true;
  return config[key] !== false;
}
