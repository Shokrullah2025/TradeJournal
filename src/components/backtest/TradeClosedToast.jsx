import React, { useState, useEffect, useRef } from "react";

export default function TradeClosedToast({
  trade,
  trades,
  initialBalance,
  onClose,
  onOpenAnalytics,
  onNoteChange,
  isDark,
}) {
  const [note, setNote]   = useState("");
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setNote(trade?.note || "");
    setSaved(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onClose(), 7000);
    return () => clearTimeout(timerRef.current);
  }, [trade?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!trade) return null;

  const total    = trades.length;
  const wins     = trades.filter((t) => t.pnl > 0).length;
  const winRate  = total ? Math.round((wins / total) * 100) : 0;
  const grossWin  = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl <= 0).reduce((s, t) => s + t.pnl, 0));
  const pf = grossLoss > 0 ? (grossWin / grossLoss).toFixed(2) : grossWin > 0 ? "∞" : "—";

  const isWin     = trade.pnl > 0;
  const rStr      = trade.rAchieved != null
    ? (trade.rAchieved >= 0 ? "+" : "") + trade.rAchieved.toFixed(1) + "R"
    : null;
  const exitColor = trade.exitReason === "TP" ? "#089981"
    : trade.exitReason === "SL" ? "#f23645"
    : "#787b86";

  const theme = isDark
    ? { bg: "#1e222d", border: "#2a2e39", text: "#d1d4dc", textMuted: "#787b86", surface: "#131722" }
    : { bg: "#ffffff", border: "#e1ecf2", text: "#131722", textMuted: "#787b86", surface: "#f0f3fa" };

  const handleSaveNote = () => {
    onNoteChange?.(trade.id, note);
    setSaved(true);
  };

  return (
    <div
      className="fixed z-50 rounded-xl shadow-2xl border overflow-hidden"
      style={{
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        width: 320,
        background: theme.bg,
        borderColor: theme.border,
        borderLeft: `3px solid ${isWin ? "#089981" : "#f23645"}`,
      }}
      data-testid="trade-closed-toast"
    >
      {/* Main row */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-bold"
              style={{ color: trade.side === "buy" ? "#089981" : "#f23645" }}
            >
              {trade.side === "buy" ? "LONG" : "SHORT"}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: exitColor + "22", color: exitColor }}
            >
              {trade.exitReason || "Manual"}
            </span>
            <span
              className="text-sm font-bold"
              style={{ color: isWin ? "#089981" : "#f23645" }}
              data-testid="trade-toast-pnl"
            >
              {isWin ? "+" : ""}${trade.pnl.toFixed(2)}
              {rStr && (
                <span className="text-xs ml-1 font-normal">({rStr})</span>
              )}
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: theme.textMuted }}>
            {total}T · {winRate}% WR · PF {pf}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { onOpenAnalytics(); onClose(); }}
            className="text-xs px-2 py-1 rounded font-medium"
            style={{ background: "rgba(42,157,143,0.15)", color: "#2a9d8f" }}
            data-testid="trade-toast-stats-btn"
          >
            Stats
          </button>
          <button
            onClick={onClose}
            className="w-5 h-5 flex items-center justify-center rounded text-xs"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Quick note */}
      <div className="px-3 pb-2.5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Quick note… (optional)"
            value={note}
            onChange={(e) => { setNote(e.target.value); setSaved(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSaveNote(); }}
            className="flex-1 text-xs px-2 py-1 rounded border outline-none"
            style={{ background: theme.surface, borderColor: theme.border, color: theme.text }}
            data-testid="trade-toast-note-input"
          />
          {saved ? (
            <span className="text-xs px-2 py-1 rounded" style={{ color: "#089981" }}>✓</span>
          ) : (
            <button
              onClick={handleSaveNote}
              className="btn-gradient text-xs px-2 py-1 rounded font-semibold"
              data-testid="trade-toast-note-save-btn"
            >
              Save
            </button>
          )}
        </div>
      </div>

      {/* Auto-close progress bar */}
      <div style={{ height: 2, background: isDark ? "#131722" : "#f0f3fa" }}>
        <div
          style={{
            height: 2,
            background: isWin ? "#089981" : "#f23645",
            animation: "toastShrink 7s linear forwards",
            width: "100%",
          }}
        />
      </div>
      <style>{`@keyframes toastShrink { from { width: 100%; } to { width: 0%; } }`}</style>
    </div>
  );
}
