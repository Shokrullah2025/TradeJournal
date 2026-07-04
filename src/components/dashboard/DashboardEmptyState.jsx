import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { Link2, BarChart3 } from "lucide-react";

// Grayscale ghost previews shown when the user has no trades yet. Each card
// keeps the live dashboard's slot but fills only its top half with a faded
// gray sketch of the real chart, plus a hint of what will appear there.
// Everything is render-only — no sample data is ever written anywhere.

// Ghost gray tones. Deliberately never green/red so the sketches can't be
// mistaken for real performance; the teal accent is reserved for the CTA.
const STRONG = "fill-gray-400 dark:fill-gray-500";
const MID = "fill-gray-300 dark:fill-gray-600";
const SOFT = "fill-gray-200 dark:fill-gray-700";
const FAINT = "fill-gray-100 dark:fill-gray-700/50";
const LINE = "stroke-gray-400 dark:stroke-gray-500";
const GRID = "stroke-gray-200 dark:stroke-gray-700";

// Top-half wrapper: fades the sketch out so it reads as a preview, not data.
const GhostFade = ({ className = "", children }) => (
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

const PreviewPill = () => (
  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 whitespace-nowrap">
    Preview
  </span>
);

const Hint = ({ title, children }) => (
  <div className="flex-1 flex flex-col justify-center text-center px-2 pt-1">
    {title && (
      <div className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
        {title}
      </div>
    )}
    <div className="text-xs text-gray-400 dark:text-gray-500">{children}</div>
  </div>
);

Hint.propTypes = {
  title: PropTypes.string,
  children: PropTypes.node,
};

// --- ghost sketches (pure SVG, gray only) ---

const GhostSparkline = () => (
  <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="w-full h-full block">
    <path
      d="M0,34 L14,30 L28,31 L42,25 L56,27 L70,20 L84,22 L98,14 L112,16 L126,10 L140,12 L160,5 L160,40 L0,40 Z"
      className={SOFT}
    />
    <path
      d="M0,34 L14,30 L28,31 L42,25 L56,27 L70,20 L84,22 L98,14 L112,16 L126,10 L140,12 L160,5"
      fill="none"
      strokeWidth="2"
      className={LINE}
    />
  </svg>
);

const GhostDonut = () => (
  <svg viewBox="0 0 40 40" className="w-10 h-10 block mx-auto">
    <circle cx="20" cy="20" r="15" fill="none" strokeWidth="6" className={GRID} />
    <circle
      cx="20"
      cy="20"
      r="15"
      fill="none"
      strokeWidth="6"
      strokeDasharray="55 94"
      strokeLinecap="round"
      transform="rotate(-90 20 20)"
      className={LINE}
    />
  </svg>
);

const GhostDrawdown = () => (
  <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="w-full h-full block">
    <path
      d="M0,5 L20,5 L34,14 L48,9 L62,21 L76,16 L90,27 L104,20 L118,31 L132,24 L146,27 L160,18 L160,5 Z"
      className={SOFT}
    />
    <path
      d="M0,5 L20,5 L34,14 L48,9 L62,21 L76,16 L90,27 L104,20 L118,31 L132,24 L146,27 L160,18"
      fill="none"
      strokeWidth="2"
      className={LINE}
    />
  </svg>
);

const GhostWinLossBars = () => (
  <svg viewBox="0 0 160 40" preserveAspectRatio="none" className="w-full h-full block">
    <rect x="30" y="6" width="60" height="11" rx="4" className={STRONG} />
    <rect x="30" y="23" width="36" height="11" rx="4" className={SOFT} />
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

const GhostDailyBars = () => (
  <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="52" x2="320" y2="52" strokeWidth="1" className={GRID} />
    {DAILY_BARS.map((b) => (
      <rect
        key={b.x}
        x={b.x}
        y={b.y}
        width="14"
        height={b.h}
        rx="3"
        className={b.up ? STRONG : MID}
      />
    ))}
  </svg>
);

const GhostEquityCurve = () => (
  <svg viewBox="0 0 320 100" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="92" x2="320" y2="92" strokeWidth="1" className={GRID} />
    <path
      d="M0,92 L24,84 L48,87 L72,72 L96,76 L120,60 L144,65 L168,46 L192,51 L216,32 L240,37 L264,20 L288,24 L320,8 L320,100 L0,100 Z"
      className={FAINT}
    />
    <path
      d="M0,92 L24,84 L48,87 L72,72 L96,76 L120,60 L144,65 L168,46 L192,51 L216,32 L240,37 L264,20 L288,24 L320,8"
      fill="none"
      strokeWidth="2"
      className={LINE}
    />
  </svg>
);

// When You Win: 3 fading rows of heatmap cells with varied gray intensity.
const HEATMAP_ROWS = [
  [2, 3, 1, 2, 0, 1],
  [1, 3, 3, 2, 1, 0],
  [0, 2, 3, 3, 2, 1],
];
const HEATMAP_FILLS = [FAINT, SOFT, MID, STRONG];

const GhostHeatmap = () => (
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

const GhostScatter = () => (
  <svg viewBox="0 0 300 64" preserveAspectRatio="none" className="w-full h-full block">
    <line x1="0" y1="32" x2="300" y2="32" strokeWidth="1" className={GRID} />
    {SCATTER_WINS.map(([cx, cy]) => (
      <circle key={`w-${cx}`} cx={cx} cy={cy} r="4" className={STRONG} />
    ))}
    {SCATTER_LOSSES.map(([cx, cy]) => (
      <circle key={`l-${cx}`} cx={cx} cy={cy} r="4" className={MID} />
    ))}
  </svg>
);

const GhostInsightLines = () => (
  <svg viewBox="0 0 300 52" preserveAspectRatio="none" className="w-full h-full block">
    <rect x="0" y="4" width="26" height="26" rx="7" className={FAINT} />
    <rect x="36" y="6" width="220" height="9" rx="4" className={SOFT} />
    <rect x="36" y="21" width="150" height="9" rx="4" className={FAINT} />
    <rect x="0" y="40" width="26" height="26" rx="7" className={FAINT} />
    <rect x="36" y="42" width="190" height="9" rx="4" className={SOFT} />
  </svg>
);

// Skeleton tile standing in for a RecentTrades trade card.
const GhostTradeTile = () => (
  <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700/60 flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-600" />
        <div className="h-2.5 w-16 rounded bg-gray-100 dark:bg-gray-700" />
      </div>
      <div className="h-4 w-12 rounded-full bg-gray-100 dark:bg-gray-700" />
    </div>
    <div className="mt-3 h-5 w-20 rounded bg-gray-200 dark:bg-gray-600" />
  </div>
);

const GhostStatCard = ({ label, hint, testId, children }) => (
  <div className="card p-4" data-testid={testId}>
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

const DashboardEmptyState = () => {
  const navigate = useNavigate();
  const connectBroker = () => navigate("/brokers");

  return (
    <div className="space-y-6" data-testid="dashboard-empty-state">
      {/* No-trades banner — the single teal CTA on the page */}
      <div
        className="card flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5"
        data-testid="empty-state-banner"
      >
        <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            No trades yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            The gray previews show what each card will look like once your
            trades come in.
          </p>
        </div>
        <button
          type="button"
          onClick={connectBroker}
          className="btn btn-primary flex items-center gap-1.5 self-start sm:self-auto"
          data-testid="empty-state-connect-broker-btn"
        >
          <Link2 className="w-4 h-4" />
          Connect your broker
        </button>
      </div>

      {/* Ghost stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GhostStatCard
          label="Total P&L"
          hint="Your running P&L shows here"
          testId="empty-stat-total-pnl-card"
        >
          <GhostSparkline />
        </GhostStatCard>
        <GhostStatCard
          label="Win Rate"
          hint="% of winning trades"
          testId="empty-stat-win-rate-card"
        >
          <GhostDonut />
        </GhostStatCard>
        <GhostStatCard
          label="Max Drawdown"
          hint="Worst peak-to-trough dip"
          testId="empty-stat-max-drawdown-card"
        >
          <GhostDrawdown />
        </GhostStatCard>
        <GhostStatCard
          label="Avg Win/Loss"
          hint="Reward vs risk ratio"
          testId="empty-stat-avg-win-loss-card"
        >
          <GhostWinLossBars />
        </GhostStatCard>
      </div>

      {/* Ghost chart cards — same 3-column slots as the live dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="card flex flex-col h-[340px]"
          data-testid="empty-chart-daily-pnl-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Daily P&L
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostDailyBars />
          </GhostFade>
          <Hint title="Your daily wins & losses will chart here">
            Green bars for winning days, red for losing days.
          </Hint>
        </div>

        <div
          className="card flex flex-col h-[340px]"
          data-testid="empty-chart-cumulative-pnl-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Cumulative P&L
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostEquityCurve />
          </GhostFade>
          <Hint title="Your equity curve grows here">
            Running total of P&L across sessions.
          </Hint>
        </div>

        <div
          className="card hidden lg:flex flex-col h-[340px]"
          data-testid="empty-chart-when-you-win-card"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              When You Win
            </h3>
            <PreviewPill />
          </div>
          <GhostFade className="h-[46%]">
            <GhostHeatmap />
          </GhostFade>
          <Hint title="Your winning hours map here">
            Avg P&L by weekday & trading hour.
          </Hint>
        </div>
      </div>

      {/* Ghost bottom row: recent trades + outcomes/insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card" data-testid="empty-recent-trades-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Trades
            </h3>
            <PreviewPill />
          </div>
          <GhostFade>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GhostTradeTile />
              <GhostTradeTile />
            </div>
          </GhostFade>
          <div className="text-center mt-4">
            <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
              Your trade history lives here
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Connect your broker and your trades import automatically.
            </p>
            <button
              type="button"
              onClick={connectBroker}
              className="btn btn-primary inline-flex items-center gap-1.5 mt-3"
              data-testid="empty-recent-trades-connect-broker-btn"
            >
              <Link2 className="w-4 h-4" />
              Connect your broker
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card hidden lg:block" data-testid="empty-trade-outcomes-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trade Outcomes
              </h3>
              <PreviewPill />
            </div>
            <GhostFade className="h-16">
              <GhostScatter />
            </GhostFade>
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-1">
              One dot per closed trade — wins above, losses below.
            </p>
          </div>

          <div className="card" data-testid="empty-ai-insights-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Trading Insights
              </h3>
              <PreviewPill />
            </div>
            <GhostFade className="h-14">
              <GhostInsightLines />
            </GhostFade>
            <div className="text-center mt-1">
              <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
                AI insights unlock with data
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Personalized patterns after your first closed trades.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardEmptyState;
