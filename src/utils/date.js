import { format } from "date-fns";

// Local calendar-day key ("YYYY-MM-DD") for bucketing trades by day.
//
// Never use toISOString().split("T")[0] for this: trade dates are stored as
// local midnight ("YYYY-MM-DDT00:00:00"), and converting to UTC shifts them
// to the PREVIOUS day in any timezone east of UTC — a July 4 trade lands in
// the July 3 bucket on the dashboard charts.
export const toLocalDateKey = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;
  return format(date, "yyyy-MM-dd");
};

// Human-readable long date ("July 8, 2026") for editorial content such as
// blog post published/updated lines. Parses date-only strings ("2026-07-08")
// as local calendar dates — new Date("2026-07-08") would treat them as UTC
// midnight and render the previous day east of UTC.
export const formatLongDate = (d) => {
  const date =
    typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? new Date(`${d}T00:00:00`)
      : d instanceof Date
        ? d
        : new Date(d);
  if (isNaN(date.getTime())) return null;
  return format(date, "MMMM d, yyyy");
};
