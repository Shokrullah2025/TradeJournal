import React, { useMemo, useState } from "react";
import { X, BarChart2 } from "lucide-react";
import { computeEdgeStats } from "../../utils/edgeStats";

export function EquityCurve({ trades, initialBalance, isDark }) {
  const { pts, W, H, color } = useMemo(() => {
    const W = 100, H = 44;
    const data = [
      initialBalance,
      ...trades.filter((t) => t.balanceAfter != null).map((t) => t.balanceAfter),
    ];
    if (data.length < 2) return { pts: null, W, H, color: "#089981" };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data
      .map((b, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - 4 - ((b - min) / range) * (H - 8);
        return `${x},${y}`;
      })
      .join(" ");
    const last = data[data.length - 1];
    return { pts, W, H, color: last >= initialBalance ? "#089981" : "#f23645" };
  }, [trades, initialBalance]);

  if (!pts) {
    return (
      <div
        style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <span style={{ fontSize: 10, color: isDark ? "#555965" : "#b2b5be" }}>
          Complete a trade to see curve
        </span>
      </div>
    );
  }

  const fillPts = `0,${H} ${pts} ${W},${H}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: 48, display: "block" }}
    >
      <polygon points={fillPts} fill={color} fillOpacity="0.12" />
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SETUP_LABELS = {
  breakout:     "Breakout",
  pullback:     "Pullback",
  reversal:     "Reversal",
  range:        "Range",
  continuation: "Continuation",
  news:         "News",
  custom:       "Custom",
};

export default function EdgeAnalyticsPanel({ trades, initialBalance, isDark, onClose }) {
  const [activeTab, setActiveTab] = useState("overview");

  const theme = {
    bg:        isDark ? "#131722" : "#f0f3fa",
    surface:   isDark ? "#1e222d" : "#ffffff",
    border:    isDark ? "#2a2e39" : "#e1ecf2",
    text:      isDark ? "#d1d4dc" : "#131722",
    textMuted: "#787b86",
  };

  const stats = useMemo(
    () => computeEdgeStats(trades, initialBalance),
    [trades, initialBalance]
  );

  const bySetup = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      const key = t.setupTag || "Untagged";
      if (!map[key]) map[key] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) map[key].wins++; else map[key].losses++;
      map[key].pnl += t.pnl;
    });
    return Object.entries(map).sort((a, b) => b[1].pnl - a[1].pnl);
  }, [trades]);

  const fmtPct = (v) => (v * 100).toFixed(1) + "%";
  const fmtR   = (v) => (v != null ? (v >= 0 ? "+" : "") + v.toFixed(1) + "R" : "—");

  const pfStr = stats.profitFactor === 0 ? "—"
    : isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞";

  const overviewCards = [
    { label: "Win Rate",      value: stats.total ? fmtPct(stats.winRate)              : "—", color: stats.total && stats.winRate >= 0.5 ? "#089981" : stats.total ? "#f23645" : null },
    { label: "Profit Factor", value: stats.total ? pfStr                              : "—", color: stats.profitFactor >= 1.5 ? "#089981" : stats.profitFactor >= 1 && stats.total ? "#f7a600" : stats.total ? "#f23645" : null },
    { label: "Expectancy",    value: stats.total ? "$" + stats.expectancy.toFixed(2)  : "—", color: stats.total && stats.expectancy >= 0 ? "#089981" : stats.total ? "#f23645" : null },
    { label: "Total R",       value: stats.total && stats.totalR !== 0 ? fmtR(stats.totalR) : "—", color: stats.totalR > 0 ? "#089981" : stats.totalR < 0 ? "#f23645" : null },
    { label: "Avg Win",       value: stats.wins   > 0 ? "+$" + stats.avgWin.toFixed(2)  : "—", color: "#089981" },
    { label: "Avg Loss",      value: stats.losses > 0 ? "-$" + stats.avgLoss.toFixed(2) : "—", color: "#f23645" },
    { label: "Avg Win R",     value: stats.avgRWin  != null ? "+" + stats.avgRWin.toFixed(1)  + "R" : "—", color: "#089981" },
    { label: "Avg Loss R",    value: stats.avgRLoss != null ?        stats.avgRLoss.toFixed(1) + "R" : "—", color: "#f23645" },
  ];

  return (
    <div
      className="flex flex-col flex-shrink-0 border-l overflow-hidden"
      style={{ width: 256, background: theme.surface, borderColor: theme.border }}
      data-test-id="edge-analytics-panel"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
        style={{ borderColor: theme.border }}
      >
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" style={{ color: "#2a9d8f" }} />
          <span className="text-xs font-semibold" style={{ color: theme.text }}>Edge Analytics</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: theme.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
          onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          data-test-id="analytics-close-btn"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: theme.border }}>
        {[["overview", "Overview"], ["bySetup", "By Setup"], ["trades", "Trades"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex-1 py-1.5 text-xs font-medium border-b-2 transition-colors"
            style={{
              color: activeTab === key ? "#2a9d8f" : theme.textMuted,
              borderBottomColor: activeTab === key ? "#2a9d8f" : "transparent",
              background: "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="p-2.5 space-y-2.5">
            {/* Trade count + streak */}
            <div className="text-center py-1">
              <span className="text-2xl font-bold" style={{ color: theme.text }}>{stats.total}</span>
              <span className="text-xs ml-1" style={{ color: theme.textMuted }}>trades</span>
              {stats.total > 0 && stats.streakType && (
                <div className="mt-0.5">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: stats.streakType === "W" ? "rgba(8,153,129,0.15)" : "rgba(242,54,69,0.15)",
                      color: stats.streakType === "W" ? "#089981" : "#f23645",
                    }}
                    data-test-id="analytics-streak-badge"
                  >
                    {stats.streakType}{stats.streak} streak
                  </span>
                </div>
              )}
            </div>

            {/* Equity curve */}
            <div>
              <p className="text-xs mb-1" style={{ color: theme.textMuted }}>Equity Curve</p>
              <div style={{ borderRadius: 4, overflow: "hidden", background: theme.bg }}>
                <EquityCurve trades={trades} initialBalance={initialBalance} isDark={isDark} />
              </div>
            </div>

            {/* Stats grid 2-col */}
            <div className="grid grid-cols-2 gap-1.5">
              {overviewCards.map(({ label, value, color }) => (
                <div key={label} className="rounded p-2" style={{ background: theme.bg }}>
                  <p style={{ fontSize: 9, color: theme.textMuted, marginBottom: 2 }}>{label}</p>
                  <p
                    className="text-sm font-bold"
                    style={{ color: color || theme.text }}
                    data-test-id={`analytics-${label.toLowerCase().replace(/\s/g, "-")}-value`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {/* DD / Best / Worst */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Max DD",  value: stats.total ? fmtPct(stats.maxDD) : "—", color: stats.maxDD > 0.05 ? "#f23645" : stats.maxDD > 0 ? "#f7a600" : stats.total ? "#089981" : null },
                { label: "Best",   value: stats.total && isFinite(stats.best)  && stats.best  !== -Infinity ? "+$" + stats.best.toFixed(0)  : "—", color: "#089981" },
                { label: "Worst",  value: stats.total && isFinite(stats.worst) && stats.worst !== Infinity  ? "$" + stats.worst.toFixed(0)  : "—", color: "#f23645" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded p-2 text-center" style={{ background: theme.bg }}>
                  <p style={{ fontSize: 9, color: theme.textMuted, marginBottom: 2 }}>{label}</p>
                  <p className="text-xs font-bold" style={{ color: color || theme.text }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Exit reason split */}
            {stats.total > 0 && (
              <div>
                <p className="text-xs mb-1.5" style={{ color: theme.textMuted }}>Closed by</p>
                <div className="flex gap-1.5">
                  {[["TP", "#089981"], ["SL", "#f23645"], ["Manual", "#787b86"]].map(([key, color]) => {
                    const count = stats.byExit[key] || 0;
                    const pct   = Math.round((count / stats.total) * 100);
                    return (
                      <div
                        key={key}
                        className="flex-1 rounded p-1.5 text-center"
                        style={{ background: theme.bg }}
                      >
                        <div className="text-xs font-bold" style={{ color }}>{pct}%</div>
                        <div style={{ fontSize: 9, color: theme.textMuted }}>{key}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* W/L bar */}
            {stats.total > 0 && (
              <div>
                <div className="flex justify-between text-xs mb-1" style={{ color: theme.textMuted }}>
                  <span style={{ color: "#089981" }}>{stats.wins}W</span>
                  <span style={{ color: "#f23645" }}>{stats.losses}L</span>
                </div>
                <div className="flex rounded overflow-hidden" style={{ height: 5 }}>
                  <div style={{ flex: stats.wins,   background: "#089981", minWidth: stats.wins   > 0 ? 4 : 0 }} />
                  <div style={{ flex: stats.losses, background: "#f23645", minWidth: stats.losses > 0 ? 4 : 0 }} />
                </div>
              </div>
            )}

            {stats.total === 0 && (
              <div className="text-center py-6">
                <p className="text-xs" style={{ color: theme.textMuted }}>No trades yet.</p>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                  Place a trade to see your edge stats.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── BY SETUP ── */}
        {activeTab === "bySetup" && (
          <div className="p-2.5">
            {bySetup.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs" style={{ color: theme.textMuted }}>No setup tags yet.</p>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>
                  Tag trades in the order panel to see breakdown here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bySetup.map(([key, s]) => {
                  const total = s.wins + s.losses;
                  const wr = total ? s.wins / total : 0;
                  return (
                    <div key={key} className="rounded p-2.5" style={{ background: theme.bg }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: theme.text }}>
                          {SETUP_LABELS[key] || key}
                        </span>
                        <span className="text-xs font-bold" style={{ color: s.pnl >= 0 ? "#089981" : "#f23645" }}>
                          {s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: theme.textMuted }}>
                        <span>{total} trade{total !== 1 ? "s" : ""}</span>
                        <span style={{ color: wr >= 0.5 ? "#089981" : "#f23645" }}>
                          {(wr * 100).toFixed(0)}% WR
                        </span>
                        <span>{s.wins}W / {s.losses}L</span>
                      </div>
                      {total > 0 && (
                        <div className="flex rounded overflow-hidden mt-1.5" style={{ height: 3 }}>
                          <div style={{ flex: s.wins,   background: "#089981", minWidth: s.wins   > 0 ? 2 : 0 }} />
                          <div style={{ flex: s.losses, background: "#f23645", minWidth: s.losses > 0 ? 2 : 0 }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TRADES ── */}
        {activeTab === "trades" && (
          <div className="p-2 space-y-1.5">
            {trades.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: theme.textMuted }}>No trades yet</p>
            ) : (
              [...trades].reverse().map((t, i) => {
                const rStr  = t.rAchieved != null ? (t.rAchieved >= 0 ? "+" : "") + t.rAchieved.toFixed(1) + "R" : null;
                const label = SETUP_LABELS[t.setupTag] || t.setupTag;
                return (
                  <div
                    key={t.id ?? i}
                    className="rounded p-2 text-xs border"
                    style={{
                      background: theme.bg,
                      borderColor: t.pnl >= 0 ? "rgba(8,153,129,0.3)" : "rgba(242,54,69,0.3)",
                    }}
                    data-test-id={`analytics-trade-row-${t.id ?? i}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold" style={{ color: t.side === "buy" ? "#089981" : "#f23645" }}>
                        {t.side?.toUpperCase()} ×{t.size}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {rStr && (
                          <span className="font-semibold" style={{ color: t.pnl >= 0 ? "#089981" : "#f23645", fontSize: 10 }}>
                            {rStr}
                          </span>
                        )}
                        <span className="font-bold" style={{ color: t.pnl >= 0 ? "#089981" : "#f23645" }}>
                          {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between" style={{ color: theme.textMuted }}>
                      <span>{t.entryPrice?.toFixed(2)} → {t.exitPrice?.toFixed(2)}</span>
                      <div className="flex items-center gap-1">
                        {label && (
                          <span
                            className="px-1 py-0.5 rounded"
                            style={{ background: isDark ? "#1e222d" : "#dcefeb", color: "#2a9d8f", fontSize: 9 }}
                          >
                            {label}
                          </span>
                        )}
                        <span
                          className="px-1 py-0.5 rounded"
                          style={{
                            background: t.exitReason === "TP" ? "rgba(8,153,129,0.15)" : t.exitReason === "SL" ? "rgba(242,54,69,0.15)" : theme.bg,
                            color: t.exitReason === "TP" ? "#089981" : t.exitReason === "SL" ? "#f23645" : theme.textMuted,
                            fontSize: 9,
                          }}
                        >
                          {t.exitReason || "Manual"}
                        </span>
                      </div>
                    </div>
                    {(t.mae != null || t.mfe != null) && (
                      <div className="flex gap-2 mt-1" style={{ fontSize: 9, color: theme.textMuted }}>
                        {t.mae != null && t.mae > 0 && (
                          <span style={{ color: "#f23645" }}>MAE -{t.mae.toFixed(2)}</span>
                        )}
                        {t.mfe != null && t.mfe > 0 && (
                          <span style={{ color: "#089981" }}>MFE +{t.mfe.toFixed(2)}</span>
                        )}
                      </div>
                    )}
                    {t.note && (
                      <div className="mt-1 italic" style={{ fontSize: 10, color: theme.textMuted }}>
                        {t.note}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
