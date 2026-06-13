// Shared timezone helpers for lightweight-charts time axes and crosshair labels.
// Used by the Backtest and Live Analysis chart timezone dropdowns.
import { trimPrice } from "../components/trades/BacktestChart/chartConfig";

export const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const TZ_OPTIONS = [
  { id: "America/New_York", label: "New York (ET)", short: "ET" },
  { id: "America/Chicago", label: "Chicago (CT)", short: "CT" },
  { id: "America/Denver", label: "Denver (MT)", short: "MT" },
  { id: "America/Los_Angeles", label: "Los Angeles (PT)", short: "PT" },
  { id: "Europe/London", label: "London", short: "LON" },
  { id: "Europe/Paris", label: "Paris (CET)", short: "CET" },
  { id: "Europe/Berlin", label: "Frankfurt (CET)", short: "FRA" },
  { id: "Europe/Zurich", label: "Zurich (CET)", short: "ZUR" },
  { id: "Europe/Moscow", label: "Moscow (MSK)", short: "MSK" },
  { id: "UTC", label: "UTC", short: "UTC" },
  { id: LOCAL_TZ, label: `Local (${LOCAL_TZ.split("/").pop().replace(/_/g, " ")})`, short: "LOCAL" },
  // Dedupe in case the user's local zone is already one of the listed cities
].filter((opt, i, arr) => arr.findIndex((o) => o.id === opt.id) === i);

// Axis/crosshair time formatting in the chosen IANA timezone (DST-correct).
// tickMarkType: 0 Year, 1 Month, 2 DayOfMonth, 3+ Time.
export function tzChartOptions(tz) {
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false });
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" });
  const month = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short" });
  const year = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric" });
  const full = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  const fullWithYear = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return {
    localization: {
      // Crosshair label: include the year only when hovering data from a past
      // (or future) year — the current year is implied
      timeFormatter: (t) => {
        const d = new Date(t * 1000);
        return year.format(d) === year.format(new Date()) ? full.format(d) : fullWithYear.format(d);
      },
      // Re-assert the price trim so applyOptions doesn't drop it
      priceFormatter: trimPrice,
    },
    timeScale: {
      tickMarkFormatter: (t, tickMarkType) => {
        const d = new Date(t * 1000);
        if (tickMarkType === 0) return year.format(d);
        if (tickMarkType === 1) return month.format(d);
        if (tickMarkType === 2) return day.format(d);
        return time.format(d);
      },
    },
  };
}
