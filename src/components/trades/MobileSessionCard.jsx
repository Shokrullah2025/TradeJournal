import React from "react";
import PropTypes from "prop-types";
import { Play } from "lucide-react";
import NoteView from "../common/NoteView";
import { tagColor } from "../../utils/tagColor";

/**
 * Touch-optimised session card for the Backtest "Recent Sessions" list. Renders
 * only on mobile (the desktop list keeps its own row layout untouched). Stacks
 * the data vertically so nothing overlaps on a narrow screen and gives the
 * replay action a full-width tap target.
 *
 * data-test-id values mirror the desktop card so automated tests target either
 * layout the same way (CLAUDE.md §9 — stable, shared testids).
 */
function MobileSessionCard({ session: s, onOpen, onPlay }) {
  const sessionPnl = s.endingBalance != null ? s.endingBalance - s.initialBalance : null;
  const pnlPositive = sessionPnl != null && sessionPnl >= 0;
  const completed = s.endingBalance != null;
  const hasTrades = (s.trades?.length ?? 0) > 0;
  const accent = !completed ? "#d1d4dc" : pnlPositive ? "#089981" : "#f23645";

  return (
    <div
      data-test-id={`session-card-${s.id}`}
      onClick={() => onOpen(s)}
      className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 pl-5 cursor-pointer overflow-hidden transition-transform active:scale-[0.99]"
    >
      {/* Left accent bar — P&L / status color */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl"
        style={{ background: accent }}
      />

      {/* Header: symbol chip + name/date + P&L */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: "#e8f0fe", color: "#1E53E5" }}
        >
          {s.symbol ?? "—"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
            {new Date(s.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {!completed && " · In progress"}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {sessionPnl != null ? (
            <p
              className={`text-base font-bold ${
                pnlPositive
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-500 dark:text-red-400"
              }`}
            >
              {pnlPositive ? "+" : ""}${sessionPnl.toFixed(2)}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">No result</p>
          )}
        </div>
      </div>

      {/* Meta line */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {[s.instrumentName, s.timeframe?.toUpperCase(), s.strategy, s.setup]
          .filter(Boolean)
          .join(" · ")}
      </p>

      {/* Balance delta */}
      {sessionPnl != null && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
          ${s.initialBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 })} → $
          {s.endingBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </p>
      )}

      {/* Note */}
      {s.note && (
        <NoteView
          html={s.note}
          clamp={2}
          className="mt-2 text-xs"
          testId={`session-card-note-${s.id}`}
        />
      )}

      {/* Tags */}
      {s.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {s.tags.slice(0, 4).map((tag) => {
            const c = tagColor(tag);
            return (
              <span
                key={tag}
                data-test-id={`session-card-tag-${s.id}-${tag}`}
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: c.bg, color: c.text }}
              >
                {tag}
              </span>
            );
          })}
          {s.tags.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 text-gray-400 dark:text-gray-500">
              +{s.tags.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Replay — full-width tap target */}
      {hasTrades && (
        <button
          data-test-id={`session-card-play-btn-${s.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onPlay(s);
          }}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 text-sm font-medium transition-colors active:bg-blue-100 dark:active:bg-blue-900/60"
          aria-label="Play session chart"
        >
          <Play className="w-4 h-4" fill="currentColor" />
          Replay session
        </button>
      )}
    </div>
  );
}

MobileSessionCard.propTypes = {
  session: PropTypes.object.isRequired,
  onOpen: PropTypes.func.isRequired,
  onPlay: PropTypes.func.isRequired,
};

export default MobileSessionCard;
