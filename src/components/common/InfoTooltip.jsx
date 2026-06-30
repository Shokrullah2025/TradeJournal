import React, { useState } from "react";
import PropTypes from "prop-types";
import { Info } from "lucide-react";

/**
 * Small tap/hover info hint. Shows a short help string in a popover so long
 * descriptions don't eat vertical space next to a field. Used on mobile in the
 * Settings rows (CLAUDE.md §9 — stable testids), placed next to each label.
 *
 * Tap (or click) toggles the bubble; blurring the trigger closes it, so no
 * global listeners are registered (nothing to leak). Render-gated by the
 * caller via `className` (e.g. `lg:hidden` to keep it mobile-only).
 */
function InfoTooltip({ text, className = "", label = "More info", testId = "info-tooltip" }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        title={text}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 active:opacity-70"
        data-testid={`${testId}-btn`}
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-56 max-w-[70vw] -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium leading-snug text-white shadow-lg dark:bg-gray-700"
          data-testid={`${testId}-content`}
        >
          {text}
        </span>
      )}
    </span>
  );
}

InfoTooltip.propTypes = {
  text: PropTypes.string,
  className: PropTypes.string,
  label: PropTypes.string,
  testId: PropTypes.string,
};

export default InfoTooltip;
