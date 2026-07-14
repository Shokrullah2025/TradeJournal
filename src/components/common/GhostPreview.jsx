import React from "react";
import PropTypes from "prop-types";

// Shared grayscale "ghost preview" kit for zero-data empty states
// (Dashboard, Analytics). Sketches are deliberately gray-only — never
// green/red — so they can't be mistaken for real performance. Purely
// presentational: no sample data ever touches state or the database.

// Ghost gray tones (Tailwind fill/stroke classes).
export const GHOST_STRONG = "fill-gray-400 dark:fill-gray-500";
export const GHOST_MID = "fill-gray-300 dark:fill-gray-600";
export const GHOST_SOFT = "fill-gray-200 dark:fill-gray-700";
export const GHOST_FAINT = "fill-gray-100 dark:fill-gray-700/50";
export const GHOST_LINE = "stroke-gray-400 dark:stroke-gray-500";
export const GHOST_GRID = "stroke-gray-200 dark:stroke-gray-700";

// Top-half wrapper: fades the sketch out so it reads as a preview, not data.
export const GhostFade = ({ className = "", children }) => (
  <div
    aria-hidden="true"
    className={`[mask-image:linear-gradient(to_bottom,black_15%,transparent_96%)] [-webkit-mask-image:linear-gradient(to_bottom,black_15%,transparent_96%)] ${className}`}
  >
    {children}
  </div>
);

GhostFade.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node,
};

export const PreviewPill = () => (
  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 whitespace-nowrap">
    Preview
  </span>
);

// Centered hint filling the bottom half of a flex-col chart card.
export const GhostHint = ({ title, children }) => (
  <div className="flex-1 flex flex-col justify-center text-center px-2 pt-1">
    {title && (
      <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
        {title}
      </div>
    )}
    <div className="text-xs text-gray-400 dark:text-gray-500">{children}</div>
  </div>
);

GhostHint.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
};

// --- ghost sketches (pure SVG, gray only) ---

export const GhostSparkline = () => (
  <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="w-full h-full block">
    <path
      d="M0,34 L14,30 L28,31 L42,25 L56,27 L70,20 L84,22 L98,14 L112,16 L126,10 L140,12 L160,5 L160,40 L0,40 Z"
      className={GHOST_SOFT}
    />
    <path
      d="M0,34 L14,30 L28,31 L42,25 L56,27 L70,20 L84,22 L98,14 L112,16 L126,10 L140,12 L160,5"
      fill="none"
      strokeWidth="2"
      className={GHOST_LINE}
    />
  </svg>
);

export const GhostDonut = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 block mx-auto">
    <circle cx="20" cy="20" r="15" fill="none" strokeWidth="6" className={GHOST_GRID} />
    <circle
      cx="20"
      cy="20"
      r="15"
      fill="none"
      strokeWidth="6"
      strokeDasharray="55 94"
      strokeLinecap="round"
      transform="rotate(-90 20 20)"
      className={GHOST_LINE}
    />
  </svg>
);

export const GhostDrawdown = () => (
  <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="w-full h-full block">
    <path
      d="M0,5 L20,5 L34,14 L48,9 L62,21 L76,16 L90,27 L104,20 L118,31 L132,24 L146,27 L160,18 L160,5 Z"
      className={GHOST_SOFT}
    />
    <path
      d="M0,5 L20,5 L34,14 L48,9 L62,21 L76,16 L90,27 L104,20 L118,31 L132,24 L146,27 L160,18"
      fill="none"
      strokeWidth="2"
      className={GHOST_LINE}
    />
  </svg>
);

export const GhostWinLossBars = () => (
  <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="w-full h-full block">
    <rect x="30" y="6" width="60" height="11" rx="4" className={GHOST_STRONG} />
    <rect x="30" y="23" width="36" height="11" rx="4" className={GHOST_SOFT} />
  </svg>
);

// Daily P&L: dark bars above the baseline (wins), light bars below (losses).
const DAILY_BARS = [
  { x: 14, y: 30, h: 22, up: true },
  { x: 36, y: 52, h: 15, up: false },
  { x: 58, y: 23, h: 29, up: true },
  { x: 80, y: 38, h: 14, up: true },
  { x: 102, y: 52, h: 24, up: false },
  { x: 124, y: 27, h: 25, up: true },
  { x: 146, y: 52, h: 9, up: false },
  { x: 168, y: 19, h: 33, up: true },
  { x: 190, y: 35, h: 17, up: true },
  { x: 212, y: 52, h: 19, up: false },
  { x: 234, y: 25, h: 27, up: true },
  { x: 256, y: 41, h: 11, up: true },
  { x: 278, y: 52, h: 13, up: false },
];

export const GhostDailyBars = () => (
  <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="52" x2="320" y2="52" strokeWidth="1" className={GHOST_GRID} />
    {DAILY_BARS.map((b) => (
      <rect
        key={b.x}
        x={b.x}
        y={b.y}
        width="14"
        height={b.h}
        rx="3"
        className={b.up ? GHOST_STRONG : GHOST_MID}
      />
    ))}
  </svg>
);

export const GhostEquityCurve = () => (
  <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="92" x2="320" y2="92" strokeWidth="1" className={GHOST_GRID} />
    <path
      d="M0,92 L24,84 L48,87 L72,72 L96,76 L120,60 L144,65 L168,46 L192,51 L216,32 L240,37 L264,20 L288,24 L320,8 L320,100 L0,100 Z"
      className={GHOST_FAINT}
    />
    <path
      d="M0,92 L24,84 L48,87 L72,72 L96,76 L120,60 L144,65 L168,46 L192,51 L216,32 L240,37 L264,20 L288,24 L320,8"
      fill="none"
      strokeWidth="2"
      className={GHOST_LINE}
    />
  </svg>
);

// When You Win: 3 fading rows of heatmap cells with varied gray intensity.
const HEATMAP_ROWS = [
  [2, 3, 1, 2, 0, 1],
  [1, 3, 3, 2, 1, 0],
  [0, 2, 3, 3, 2, 1],
];
const HEATMAP_FILLS = [GHOST_FAINT, GHOST_SOFT, GHOST_MID, GHOST_STRONG];

export const GhostHeatmap = () => (
  <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="w-full h-full block">
    {HEATMAP_ROWS.map((row, r) =>
      row.map((v, c) => (
        <rect
          key={`${r}-${c}`}
          x={8 + c * 51}
          y={4 + r * 34}
          width="46"
          height="29"
          rx="5"
          className={HEATMAP_FILLS[v]}
        />
      ))
    )}
  </svg>
);

const SCATTER_WINS = [
  [22, 20], [58, 14], [96, 24], [132, 11], [170, 21], [216, 9], [252, 18], [284, 13],
];
const SCATTER_LOSSES = [[40, 44], [112, 48], [150, 41], [196, 51], [268, 43]];

export const GhostScatter = () => (
  <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="32" x2="300" y2="32" strokeWidth="1" className={GHOST_GRID} />
    {SCATTER_WINS.map(([cx, cy]) => (
      <circle key={`w-${cx}`} cx={cx} cy={cy} r="4" className={GHOST_STRONG} />
    ))}
    {SCATTER_LOSSES.map(([cx, cy]) => (
      <circle key={`l-${cx}`} cx={cx} cy={cy} r="4" className={GHOST_MID} />
    ))}
  </svg>
);

// R-multiple style distribution: light loss bars left of center, dark win
// bars to the right, tallest around the middle.
const HISTOGRAM_BARS = [
  { x: 14, h: 18, win: false },
  { x: 38, h: 34, win: false },
  { x: 62, h: 52, win: false },
  { x: 86, h: 70, win: false },
  { x: 110, h: 84, win: true },
  { x: 134, h: 92, win: true },
  { x: 158, h: 74, win: true },
  { x: 182, h: 58, win: true },
  { x: 206, h: 44, win: true },
  { x: 230, h: 30, win: true },
  { x: 254, h: 20, win: true },
  { x: 278, h: 12, win: true },
];

export const GhostHistogram = () => (
  <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="96" x2="320" y2="96" strokeWidth="1" className={GHOST_GRID} />
    {HISTOGRAM_BARS.map((b) => (
      <rect
        key={b.x}
        x={b.x}
        y={96 - b.h}
        width="18"
        height={b.h}
        rx="3"
        className={b.win ? GHOST_STRONG : GHOST_MID}
      />
    ))}
  </svg>
);

export const GhostInsightLines = () => (
  <svg viewBox="0 0 300 52" preserveAspectRatio="none" className="w-full h-full block">
    <rect x="0" y="4" width="26" height="26" rx="7" className={GHOST_FAINT} />
    <rect x="36" y="6" width="220" height="9" rx="4" className={GHOST_SOFT} />
    <rect x="36" y="21" width="150" height="9" rx="4" className={GHOST_FAINT} />
    <rect x="0" y="40" width="26" height="26" rx="7" className={GHOST_FAINT} />
    <rect x="36" y="42" width="190" height="9" rx="4" className={GHOST_SOFT} />
  </svg>
);

// Small stat/metric card: label, em-dash value, half-faded sketch, hint.
export const GhostStatCard = ({ label, hint, testId, children }) => (
  <div className="card p-4" data-test-id={testId}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          {label}
        </p>
        <p className="text-lg font-bold text-gray-400 dark:text-gray-500">—</p>
      </div>
      <PreviewPill />
    </div>
    <GhostFade className="h-10 mt-2">{children}</GhostFade>
    <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
      {hint}
    </p>
  </div>
);

GhostStatCard.propTypes = {
  label: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  testId: PropTypes.string.isRequired,
  children: PropTypes.node,
};
