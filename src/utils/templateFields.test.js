import { describe, it, expect } from 'vitest';
import { DEFAULT_VISIBLE_FIELDS, isFieldVisible } from './templateFields';

// Fields the Trade Entry form (TradeForm.jsx) actually gates with isFieldVisible.
// Each of these MUST be representable in a template config, otherwise toggling
// it in Settings cannot affect the trade modal (the original screenshots bug).
const GATED_FIELDS = ['exitPrice', 'screenshots', 'strategy', 'setup', 'marketCondition', 'notes'];

describe('isFieldVisible', () => {
  it('shows every field when there is no config (legacy/no template)', () => {
    expect(isFieldVisible(null, 'screenshots')).toBe(true);
    expect(isFieldVisible(undefined, 'notes')).toBe(true);
    expect(isFieldVisible({}, 'screenshots')).toBe(true);
  });

  it('hides a field only when the config marks it exactly false', () => {
    expect(isFieldVisible({ screenshots: false }, 'screenshots')).toBe(false);
    expect(isFieldVisible({ screenshots: true }, 'screenshots')).toBe(true);
  });

  it('treats an unknown key in a non-empty config as visible', () => {
    expect(isFieldVisible({ notes: false }, 'screenshots')).toBe(true);
  });

  // The reported bug: Settings showed the Screenshots toggle OFF (absent key
  // read as `|| false`) while the trade form still rendered the panel (absent
  // key read as `!== false`). Turning the toggle off must now hide the panel.
  it('hides the screenshot panel when the template turns screenshots off', () => {
    const savedConfig = { ...DEFAULT_VISIBLE_FIELDS, screenshots: false };
    expect(isFieldVisible(savedConfig, 'screenshots')).toBe(false);
  });

  it('keeps the screenshot panel visible by default', () => {
    expect(isFieldVisible(DEFAULT_VISIBLE_FIELDS, 'screenshots')).toBe(true);
  });
});

describe('DEFAULT_VISIBLE_FIELDS', () => {
  it('defines an explicit boolean for every field the trade form gates', () => {
    for (const key of GATED_FIELDS) {
      expect(typeof DEFAULT_VISIBLE_FIELDS[key]).toBe('boolean');
    }
  });

  it('agrees with the Settings toggle reading for every gated field', () => {
    // Settings renders the toggle as ON when `visibleFields[key] || false` is
    // truthy. The trade form renders the field when isFieldVisible(...) is true.
    // For a saved default config these two readings must never disagree, or a
    // toggle would look on/off in Settings yet do the opposite in the modal.
    for (const key of GATED_FIELDS) {
      const settingsToggleOn = DEFAULT_VISIBLE_FIELDS[key] || false;
      const formShowsField = isFieldVisible(DEFAULT_VISIBLE_FIELDS, key);
      expect(settingsToggleOn).toBe(formShowsField);
    }
  });
});
