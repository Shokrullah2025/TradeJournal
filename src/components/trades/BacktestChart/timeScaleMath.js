// Gap-aware conversions between drawing timestamps and logical bar indices.
//
// Real market data has time gaps (weekends, session breaks), so converting a
// timestamp to a bar position with linear `(t - lastTime) / interval` math
// lands in the wrong place anywhere near a gap — drawings appear stretched or
// shifted. These helpers binary-search the actual candle times instead.
// Timestamps past the last candle map to evenly spaced future bars, matching
// the whitespace series appended to the chart in useChartSetup.

export function barInterval(data) {
  return data?.length > 1 ? data[1].time - data[0].time : 3600;
}

// timestamp → fractional logical bar index
export function timeToLogical(data, t) {
  if (!data?.length) return null;
  const itvl = barInterval(data);
  const lastIdx = data.length - 1;
  if (t >= data[lastIdx].time) return lastIdx + (t - data[lastIdx].time) / itvl;
  if (t <= data[0].time) return (t - data[0].time) / itvl;
  let lo = 0;
  let hi = lastIdx;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (data[mid].time <= t) lo = mid;
    else hi = mid;
  }
  return lo + (t - data[lo].time) / (data[hi].time - data[lo].time);
}

// fractional logical bar index → timestamp
export function logicalToTime(data, logical) {
  if (!data?.length) return null;
  const itvl = barInterval(data);
  const lastIdx = data.length - 1;
  if (logical >= lastIdx) return data[lastIdx].time + (logical - lastIdx) * itvl;
  if (logical <= 0) return data[0].time + logical * itvl;
  const i = Math.floor(logical);
  return data[i].time + (logical - i) * (data[i + 1].time - data[i].time);
}

// Shift a timestamp by a whole number of bars, crossing gaps correctly.
// Shifting by N bars over a weekend moves N actual candles, not N*interval
// seconds (which would land on a timestamp where no bar exists).
export function shiftTimeByBars(data, t, bars) {
  if (!data?.length || !bars) return t;
  return logicalToTime(data, timeToLogical(data, t) + bars);
}
