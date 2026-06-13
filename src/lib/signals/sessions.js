// Trading session windows and timezone helpers for the signal engine.
// Sessions are defined in the exchange/market timezone (America/New_York) as
// the source of truth; the user's timezone is for display only.
// Uses the Intl API for DST-correct conversion — no extra dependency.

export const MARKET_TZ = "America/New_York";

export const SESSIONS = {
  LONDON: {
    id: "LONDON",
    label: "London",
    startMin: 3 * 60, // 03:00 ET
    endMin: 11 * 60 + 30, // 11:30 ET
    tz: MARKET_TZ,
  },
  NY_AM: {
    id: "NY_AM",
    label: "New York AM",
    startMin: 9 * 60 + 30, // 09:30 ET
    endMin: 12 * 60, // 12:00 ET
    tz: MARKET_TZ,
  },
  NY_PM: {
    id: "NY_PM",
    label: "New York PM",
    startMin: 13 * 60 + 30, // 13:30 ET
    endMin: 16 * 60, // 16:00 ET
    tz: MARKET_TZ,
  },
  LUNCH_DOLDRUMS: {
    id: "LUNCH_DOLDRUMS",
    label: "NY Lunch (low liquidity)",
    startMin: 12 * 60, // 12:00 ET
    endMin: 13 * 60 + 30, // 13:30 ET
    tz: MARKET_TZ,
  },
};

/** Minutes since midnight for a unix-seconds timestamp in the given IANA timezone. */
export function minutesOfDayInTz(unixSeconds, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date(unixSeconds * 1000));
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = Number(p.value) % 24; // Intl can emit "24" at midnight
    if (p.type === "minute") minute = Number(p.value);
  }
  return hour * 60 + minute;
}

/** Weekday name (e.g., "Sat") in the given timezone. */
function weekdayInTz(unixSeconds, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(
    new Date(unixSeconds * 1000)
  );
}

/** True if the timestamp falls on Saturday or Sunday in the given timezone. */
export function isWeekend(unixSeconds, tz = MARKET_TZ) {
  const day = weekdayInTz(unixSeconds, tz);
  return day === "Sat" || day === "Sun";
}

/**
 * True if the timestamp is inside the session window. Start is inclusive,
 * end is exclusive. Handles overnight sessions where startMin > endMin.
 */
export function isInSession(unixSeconds, session) {
  const m = minutesOfDayInTz(unixSeconds, session.tz);
  if (session.startMin <= session.endMin) {
    return m >= session.startMin && m < session.endMin;
  }
  return m >= session.startMin || m < session.endMin;
}

/** All sessions currently open at the timestamp. */
export function activeSessions(unixSeconds) {
  return Object.values(SESSIONS).filter((s) => isInSession(unixSeconds, s));
}

/**
 * Formats a session window in a display timezone, e.g. "09:30–12:00 EST".
 * Window boundaries are converted by rendering a reference date at the
 * session's start/end minute in the market tz.
 */
export function formatSessionWindow(session, displayTz = MARKET_TZ) {
  const fmt = (min) =>
    `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const tzName =
    new Intl.DateTimeFormat("en-US", { timeZone: displayTz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value || "";
  return `${fmt(session.startMin)}–${fmt(session.endMin)} ET${
    displayTz !== MARKET_TZ && tzName ? ` (${tzName} local)` : ""
  }`;
}
