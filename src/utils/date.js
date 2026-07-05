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
