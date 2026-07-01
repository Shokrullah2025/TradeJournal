import React from "react";
import PropTypes from "prop-types";
import { Clock, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { SESSION_ORDER } from "../../lib/ict/sessionProfile";
import { SESSIONS } from "../../lib/signals/sessions";

const SESSION_LABELS = {
  ASIA: "Asia (20:00–00:00 ET)",
  LONDON: "London (03:00–09:30 ET)",
  NY_AM: "New York AM",
  LUNCH_DOLDRUMS: "NY Lunch",
  NY_PM: "New York PM",
};

const fmt = (v) =>
  v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 5 });

const DirIcon = ({ direction }) =>
  direction === "up" ? (
    <ArrowUp className="w-3.5 h-3.5 text-success-600 dark:text-success-400" />
  ) : direction === "down" ? (
    <ArrowDown className="w-3.5 h-3.5 text-danger-600 dark:text-danger-400" />
  ) : (
    <Minus className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
  );
DirIcon.propTypes = { direction: PropTypes.string };

const Chip = ({ children, tone }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      tone === "warn"
        ? "bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300"
        : "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
    }`}
  >
    {children}
  </span>
);
Chip.propTypes = { children: PropTypes.node.isRequired, tone: PropTypes.string };

function DayBlock({ profile, title }) {
  const a = profile.annotations;
  return (
    <div data-testid={`ai-analysis-session-day-${profile.dayKey}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {title} · {profile.dayKey}
        </span>
        {!profile.complete && (
          <span className="text-xs text-gray-500 dark:text-gray-400">forming</span>
        )}
      </div>
      <div className="space-y-1">
        {SESSION_ORDER.map((id) => {
          const s = profile.sessions[id];
          return (
            <div
              key={id}
              className="flex items-center gap-2 text-sm"
              data-testid={`ai-analysis-session-row-${id}`}
            >
              <span className="w-40 flex-shrink-0 text-gray-600 dark:text-gray-400">
                {SESSION_LABELS[id] || SESSIONS[id]?.label || id}
              </span>
              {s ? (
                <>
                  <DirIcon direction={s.direction} />
                  <span className="text-gray-700 dark:text-gray-300">
                    {fmt(s.low)} – {fmt(s.high)}
                  </span>
                  <span className="ml-auto flex items-center gap-1">
                    {a.highOfDaySession === id && <Chip>HOD</Chip>}
                    {a.lowOfDaySession === id && <Chip>LOD</Chip>}
                  </span>
                </>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">—</span>
              )}
            </div>
          );
        })}
      </div>
      {(a.judas || a.asiaConsolidation) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {a.judas && (
            <Chip tone="warn">
              {a.judas === "bullish"
                ? "London swept Asia low & reversed (bullish Judas)"
                : "London swept Asia high & reversed (bearish Judas)"}
            </Chip>
          )}
          {a.asiaConsolidation && <Chip>Asia consolidation (&lt;30% ADR)</Chip>}
        </div>
      )}
    </div>
  );
}
DayBlock.propTypes = {
  profile: PropTypes.shape({
    dayKey: PropTypes.string,
    complete: PropTypes.bool,
    sessions: PropTypes.object,
    annotations: PropTypes.object,
  }).isRequired,
  title: PropTypes.string.isRequired,
};

/** How the daily candle formed across Asia / London / New York. */
const SessionProfileCard = ({ profiles }) => (
  <div className="card" data-testid="ai-analysis-session-card">
    <div className="flex items-center gap-2 mb-4">
      <Clock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Session profile</h3>
    </div>

    {!profiles || profiles.length === 0 ? (
      <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-session-empty">
        Intraday session data is unavailable right now — the bias above is computed without the
        session factor.
      </p>
    ) : (
      <div className="space-y-5">
        {profiles.map((p, idx) => (
          <DayBlock
            key={p.dayKey}
            profile={p}
            title={idx === profiles.length - 1 && !p.complete ? "Today" : idx === profiles.length - 1 ? "Latest day" : "Previous day"}
          />
        ))}
      </div>
    )}
  </div>
);

SessionProfileCard.propTypes = {
  profiles: PropTypes.arrayOf(PropTypes.object),
};

export default SessionProfileCard;
