import React from "react";
import PropTypes from "prop-types";
import { CalendarRange, ArrowUp, ArrowDown, Minus } from "lucide-react";

const fmt = (v) =>
  v == null ? "—" : Number(v).toLocaleString(undefined, { maximumFractionDigits: 5 });

const Chip = ({ children, tone }) => (
  <span
    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      tone === "up"
        ? "bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300"
        : tone === "down"
          ? "bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300"
          : "bg-gray-100 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300"
    }`}
  >
    {children}
  </span>
);
Chip.propTypes = { children: PropTypes.node.isRequired, tone: PropTypes.string };

/** Weekly candle context: previous week's character + this week so far. */
const WeeklyContextCard = ({ weekly }) => {
  const prev = weekly?.prevWeek;
  const cur = weekly?.currentWeek;
  const cls = prev?.classification;

  return (
    <div className="card" data-testid="ai-analysis-weekly-card">
      <div className="flex items-center gap-2 mb-4">
        <CalendarRange className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Weekly context</h3>
      </div>

      {!prev && !cur ? (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="ai-analysis-weekly-empty">
          Not enough weekly history yet.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Previous week</div>
            {prev ? (
              <div className="flex flex-wrap items-center gap-2" data-testid="ai-analysis-weekly-prev">
                {cls ? (
                  <Chip tone={cls.direction === "up" ? "up" : cls.direction === "down" ? "down" : undefined}>
                    <span className="capitalize">
                      {cls.type}
                      {cls.direction !== "none" ? ` ${cls.direction}` : ""}
                    </span>
                  </Chip>
                ) : (
                  <Chip>unclassified</Chip>
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  {fmt(prev.low)} – {fmt(prev.high)}, closed {fmt(prev.close)}
                </span>
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">—</span>
            )}
          </div>

          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">This week so far</div>
            {cur ? (
              <div className="space-y-2" data-testid="ai-analysis-weekly-current">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  {cur.direction === "up" ? (
                    <ArrowUp className="w-4 h-4 text-success-600 dark:text-success-400" />
                  ) : cur.direction === "down" ? (
                    <ArrowDown className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-400" />
                  )}
                  <span>
                    {cur.daysElapsed} day{cur.daysElapsed === 1 ? "" : "s"} in, trading{" "}
                    {cur.direction === "none" ? "flat" : cur.direction} from the weekly open ({fmt(cur.open)})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cur.failedPrevWeekHigh ? (
                    <Chip tone="down">Swept prev-week high &amp; rejected</Chip>
                  ) : cur.tookPrevWeekHigh ? (
                    <Chip tone="up">Took prev-week high</Chip>
                  ) : null}
                  {cur.failedPrevWeekLow ? (
                    <Chip tone="up">Swept prev-week low &amp; rejected</Chip>
                  ) : cur.tookPrevWeekLow ? (
                    <Chip tone="down">Took prev-week low</Chip>
                  ) : null}
                  {!cur.tookPrevWeekHigh && !cur.tookPrevWeekLow && (
                    <Chip>Inside the previous week&apos;s range</Chip>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500">—</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

WeeklyContextCard.propTypes = {
  weekly: PropTypes.shape({
    prevWeek: PropTypes.object,
    currentWeek: PropTypes.object,
  }),
};

export default WeeklyContextCard;
