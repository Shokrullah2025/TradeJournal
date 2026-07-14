import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, Component } from "react";
import ModalPortal from "../components/common/ModalPortal";
import {
  Play,
  Pause,
  MoreVertical,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Globe,
  Clock,
  Calendar,
  Target,
  TrendingUp as Strategy,
  Layers,
  ArrowUpDown,
  Settings,
  Save,
  AlertTriangle,
  Info,
  Loader2,
  Scissors,
  SkipBack,
  SkipForward,
  X,
  MousePointer2,
  Minus,
  Trash2,
  Pencil,
  Undo2,
  Redo2,
  SeparatorVertical,
  Square,
  Type,
  Eraser,
  Crosshair,
  Search,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  ArrowLeftRight,
  Check,
  BarChart2,
  GripVertical,
  Smartphone,
} from "lucide-react";
import { useBacktest } from "../context/BacktestContext";
import BacktestChart from "../components/trades/BacktestChart";
import HistorySessionChart from "../components/trades/HistorySessionChart";
import MobileSessionCard from "../components/trades/MobileSessionCard";
import RichTextEditor from "../components/common/RichTextEditor";
import NoteView from "../components/common/NoteView";
import { TrendlineIcon, RayIcon, SegmentIcon } from "../components/trades/BacktestChart/toolIcons";
import EdgeAnalyticsPanel, { EquityCurve } from "../components/backtest/EdgeAnalyticsPanel";
import { computeEdgeStats, withBalanceSnapshots } from "../utils/edgeStats";
import { TZ_OPTIONS } from "../utils/chartTimezone";
import { fetchMarketCandles, clearCandleCache } from "../utils/marketData";
import { tagColor } from "../utils/tagColor";
import { useTemplates } from "../hooks/useTemplates";
import { useUserSettings } from "../hooks/useUserSettings";
import useIsMobile from "../hooks/useIsMobile";
import { usePlanLimits } from "../hooks/usePlanLimits";
import { limitReached } from "../utils/planLimits";
import PlanLimitModal from "../components/common/PlanLimitModal";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { sessionMetaSchema, sessionTagSchema, MAX_SESSION_TAGS } from "../lib/schemas/backtest";
import { autoSaveDefaults } from "../components/trades/BacktestChart/drawingDefaults";
import { trimPrice } from "../components/trades/BacktestChart/chartConfig";
import toast from "react-hot-toast";

class ChartErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-sm" style={{ background: "#f0f3fa", color: "#787b86" }}>
          <p className="mb-1" style={{ color: "#f23645" }}>Chart error</p>
          <p className="text-xs">{this.state.error.message}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

// How many candles to pre-load so the viewport is full on first render
function defaultWindowCandles(candles) {
  if (!candles || candles.length < 2) return 150;
  const sec = candles[1].time - candles[0].time;
  if (sec <=    60) return 300; // 1m  → ~5 h
  if (sec <=   300) return 120; // 5m  → ~10 h
  if (sec <=   900) return  80; // 15m → ~20 h
  if (sec <=  1800) return  60; // 30m → ~30 h
  if (sec <=  3600) return 120; // 1h  → ~5 d
  if (sec <= 14400) return  84; // 4h  → ~2 wk
  return 120;                   // 1d  → ~5 mo
}

// Market and instrument configurations
const MARKET_CONFIG = {
  futures: {
    name: "Futures",
    instruments: [
      {
        symbol: "ES",
        name: "S&P 500 Futures",
        exchange: "CME",
        tickSize: 0.25,
        tickValue: 12.5,
      },
      {
        symbol: "NQ",
        name: "NASDAQ 100 Futures",
        exchange: "CME",
        tickSize: 0.25,
        tickValue: 5.0,
      },
      {
        symbol: "YM",
        name: "Dow Jones Futures",
        exchange: "CBOT",
        tickSize: 1.0,
        tickValue: 5.0,
      },
      {
        symbol: "RTY",
        name: "Russell 2000 Futures",
        exchange: "CME",
        tickSize: 0.1,
        tickValue: 5.0,
      },
      {
        symbol: "CL",
        name: "Crude Oil",
        exchange: "NYMEX",
        tickSize: 0.01,
        tickValue: 10.0,
      },
    ],
  },
  stocks: {
    name: "Stocks",
    instruments: [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        exchange: "NASDAQ",
        tickSize: 0.01,
        tickValue: 0.01,
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        exchange: "NASDAQ",
        tickSize: 0.01,
        tickValue: 0.01,
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        exchange: "NASDAQ",
        tickSize: 0.01,
        tickValue: 0.01,
      },
    ],
  },
};

// ── Date-range quick-select for the Create Session form ──────────────────────
// Returns a local yyyy-mm-dd string (the format the native date input expects).
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Display a yyyy-mm-dd string as MM/DD/YYYY without touching the local timezone.
function formatRangeDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

const DATE_RANGE_PRESETS = [
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "6m",  label: "Last 6 months" },
  { key: "1y",  label: "Last year" },
  { key: "ytd", label: "Year to date" },
  { key: "custom", label: "Custom" },
];

// Compute { start, end } yyyy-mm-dd for a preset. End is yesterday — the last
// fully-formed session day — and start is offset back from it.
function rangeForPreset(key) {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  switch (key) {
    case "30d": start.setDate(end.getDate() - 30); break;
    case "90d": start.setDate(end.getDate() - 90); break;
    case "6m":  start.setMonth(end.getMonth() - 6); break;
    case "1y":  start.setFullYear(end.getFullYear() - 1); break;
    case "ytd": start.setMonth(0, 1); break; // Jan 1 of the current year
    default: return null; // "custom" — caller keeps the existing dates
  }
  return { start: toISODate(start), end: toISODate(end) };
}

// Restrict a candle series to the session's chosen [startDate, endDate] window.
// Candle .time is Unix seconds (UTC); bounds are inclusive and the end date
// covers its whole day. If the window falls outside the available history the
// full series is returned so the chart never receives an empty dataset.
function sliceCandlesToRange(candles, startDate, endDate) {
  if (!Array.isArray(candles) || candles.length === 0) return candles;
  if (!startDate && !endDate) return candles;
  const startSec = startDate ? Date.parse(`${startDate}T00:00:00Z`) / 1000 : -Infinity;
  const endSec = endDate ? Date.parse(`${endDate}T23:59:59Z`) / 1000 : Infinity;
  if (!isFinite(startSec) && !isFinite(endSec)) return candles;
  const sliced = candles.filter((c) => c.time >= startSec && c.time <= endSec);
  return sliced.length > 1 ? sliced : candles;
}

function HistoryModal({ session, onClose, onSave, tagSuggestions = [] }) {
  // Compact the detail layout on phones only — desktop stays exactly as it was.
  const isMobile = useIsMobile();
  const trades = useMemo(
    () => withBalanceSnapshots(session.trades || [], session.initialBalance),
    [session.trades, session.initialBalance]
  );
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const edge = useMemo(
    () => computeEdgeStats(trades, session.initialBalance ?? 0),
    [trades, session.initialBalance]
  );
  const pfStr = edge.profitFactor === 0 ? "—"
    : isFinite(edge.profitFactor) ? edge.profitFactor.toFixed(2) : "∞";

  // Editable session metadata
  const [note, setNote] = useState(session.note || "");
  const [tags, setTags] = useState(session.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  // The note is read-only until the user picks "Edit" from the 3-dots menu —
  // keeps the detail view clean and prevents accidental edits while skimming.
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const noteMenuRef = useRef(null);
  useEffect(() => {
    if (!noteMenuOpen) return;
    const onDoc = (e) => {
      if (noteMenuRef.current && !noteMenuRef.current.contains(e.target)) setNoteMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [noteMenuOpen]);
  const dirty =
    note !== (session.note || "") ||
    JSON.stringify(tags) !== JSON.stringify(session.tags || []);

  const addTag = (raw) => {
    const parsed = sessionTagSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid tag");
      return;
    }
    const tag = parsed.data;
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (tags.length >= MAX_SESSION_TAGS) {
      toast.error(`A session can have at most ${MAX_SESSION_TAGS} tags`);
      return;
    }
    setTags((prev) => [...prev, tag]);
    setTagInput("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(session.id, { note, tags });
    } finally {
      setSaving(false);
    }
  };

  const suggestions = tagSuggestions
    .filter((s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()))
    .slice(0, 8);
  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        // Mobile: the whole card scrolls as one column — with the desktop
        // layout (fixed sections + inner-scrolling trades list), the stats,
        // notes and tags blocks ate the 80vh and flexbox crushed the trades
        // list to a barely-visible sliver on phones.
        className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col ${isMobile ? "overflow-y-auto" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${isMobile ? "p-3" : "p-5"} border-b border-gray-200 dark:border-gray-700 flex items-start justify-between flex-shrink-0`}>
          <div className="min-w-0">
            <h2 className={`${isMobile ? "text-sm truncate" : "text-lg"} font-bold text-gray-900 dark:text-white`}>{session.name}</h2>
            <p className={`${isMobile ? "text-[11px] break-words" : "text-sm"} text-gray-500 dark:text-gray-400 mt-0.5`}>
              {session.instrumentName} · {session.timeframe?.toUpperCase()} · {session.strategy} · {session.setup}
            </p>
            <p className={`${isMobile ? "text-[10px]" : "text-xs"} text-gray-400 dark:text-gray-500 mt-0.5`}>
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div
          className={
            isMobile
              ? "grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
              : "grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700"
          }
        >
          {[
            {
              label: "Starting Balance",
              value: `$${session.initialBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              cls: "text-gray-900 dark:text-white",
            },
            {
              label: "Ending Balance",
              value: session.endingBalance != null
                ? `$${session.endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—",
              cls: session.endingBalance != null && session.endingBalance >= session.initialBalance
                ? "text-green-600 dark:text-green-400"
                : session.endingBalance != null
                  ? "text-red-500 dark:text-red-400"
                  : "text-gray-400",
            },
            { label: "Trades", value: trades.length, cls: "text-gray-900 dark:text-white" },
            {
              label: "Total P&L",
              value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`,
              cls: totalPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
            },
          ].map(({ label, value, cls }) => (
            <div
              key={label}
              className={
                isMobile
                  ? "p-2 text-center bg-white dark:bg-gray-800"
                  : "p-4 text-center"
              }
            >
              <p className={`${isMobile ? "text-[11px] mb-0.5 truncate" : "text-xs mb-1"} text-gray-500 dark:text-gray-400`}>{label}</p>
              <p className={`${isMobile ? "text-sm" : "text-base"} font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Per-session edge analytics */}
        {trades.length > 0 && (
          <div
            className={
              isMobile
                ? "grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700"
                : "grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40"
            }
            data-test-id="history-modal-edge-stats"
          >
            {[
              {
                label: "Win Rate",
                value: `${(edge.winRate * 100).toFixed(0)}%`,
                cls: edge.winRate >= 0.5 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
                testId: "history-modal-win-rate-value",
              },
              {
                label: "Profit Factor",
                value: pfStr,
                cls: edge.profitFactor >= 1 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
                testId: "history-modal-profit-factor-value",
              },
              {
                label: "Expectancy",
                value: `${edge.expectancy >= 0 ? "+" : "-"}$${Math.abs(edge.expectancy).toFixed(2)}`,
                cls: edge.expectancy >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400",
                testId: "history-modal-expectancy-value",
              },
              {
                label: "Max Drawdown",
                value: `${(edge.maxDD * 100).toFixed(1)}%`,
                cls: edge.maxDD > 0.05 ? "text-red-500 dark:text-red-400" : "text-gray-900 dark:text-white",
                testId: "history-modal-max-dd-value",
              },
            ].map(({ label, value, cls, testId }) => (
              <div
                key={label}
                className={
                  isMobile
                    ? "p-2 text-center bg-gray-50 dark:bg-gray-900/40"
                    : "p-3 text-center"
                }
              >
                <p className={`${isMobile ? "text-[11px] truncate" : "text-xs"} text-gray-500 dark:text-gray-400 mb-0.5`}>{label}</p>
                <p className={`text-sm font-bold ${cls}`} data-test-id={testId}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Editable note + custom tags */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3" data-test-id="history-modal-meta-editor">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Notes</label>
              <div className="relative" ref={noteMenuRef}>
                <button
                  data-test-id="history-modal-note-menu-btn"
                  onClick={() => setNoteMenuOpen((v) => !v)}
                  className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                    noteMenuOpen
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-200"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  }`}
                  aria-label="Note options"
                  aria-haspopup="menu"
                  aria-expanded={noteMenuOpen}
                  title="Note options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {noteMenuOpen && (
                  <div
                    data-test-id="history-modal-note-menu"
                    role="menu"
                    className="absolute right-0 top-8 z-10 w-32 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
                  >
                    <button
                      data-test-id="history-modal-note-edit-btn"
                      role="menuitem"
                      onClick={() => { setNoteEditing(true); setNoteMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      data-test-id="history-modal-note-delete-btn"
                      role="menuitem"
                      onClick={() => { setNote(""); setNoteEditing(false); setNoteMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
            {noteEditing ? (
              <RichTextEditor
                testId="history-modal-note-input"
                value={note}
                onChange={setNote}
                placeholder="What did you learn from this session?"
              />
            ) : (
              <div
                data-test-id="history-modal-note-readonly"
                className={`${isMobile ? "max-h-24" : "max-h-40"} overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2`}
              >
                {note ? (
                  <NoteView html={note} clamp={0} testId="history-modal-note-view" />
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    No notes yet — tap the menu to add one.
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tags</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {tags.map((tag) => {
                const c = tagColor(tag);
                return (
                <span
                  key={tag}
                  data-test-id={`history-modal-tag-${tag}`}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: c.bg, color: c.text }}
                >
                  {tag}
                  <button
                    data-test-id={`history-modal-remove-tag-${tag}`}
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    className="hover:opacity-70"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
                );
              })}
              <input
                data-test-id="history-modal-tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                maxLength={30}
                placeholder={tags.length === 0 ? "Add a tag…" : "Add another…"}
                className="text-xs px-2 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:border-primary-400 w-28"
              />
              {tagInput.trim() && (
                <button
                  data-test-id="history-modal-add-tag-btn"
                  onClick={() => addTag(tagInput)}
                  className="text-xs px-2 py-1 rounded-full bg-primary-600 text-white hover:bg-primary-700 font-medium"
                >
                  Add
                </button>
              )}
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500">Suggestions</span>
                {suggestions.map((s) => (
                  <button
                    key={s}
                    data-test-id={`history-modal-suggested-tag-${s}`}
                    onClick={() => addTag(s)}
                    className="text-xs px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {dirty && (
            <div className="flex justify-end">
              <button
                data-test-id="history-modal-save-btn"
                onClick={handleSave}
                disabled={saving}
                className="btn-gradient inline-flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg disabled:opacity-60 font-medium"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}
        </div>

        {/* Mobile scrolls in the card itself (above), so the trades list keeps
            its natural height there instead of being the shrinkable flex child. */}
        <div className={isMobile ? "overflow-x-auto" : "flex-1 overflow-y-auto"}>
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No trades recorded for this session</p>
              <p className="text-xs mt-1">Trades are saved automatically as you close them</p>
            </div>
          ) : (
            <table className={`w-full text-sm ${isMobile ? "min-w-[420px]" : ""}`}>
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                <tr className="text-xs text-gray-500 dark:text-gray-400">
                  <th className="text-left px-4 py-3 font-medium">Direction</th>
                  <th className="text-right px-4 py-3 font-medium">Entry</th>
                  <th className="text-right px-4 py-3 font-medium">Exit</th>
                  <th className="text-right px-4 py-3 font-medium">Closed by</th>
                  <th className="text-right px-4 py-3 font-medium">P&amp;L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {trades.map((t, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${t.side === "buy" ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                        {t.side?.toUpperCase()}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 ml-1.5 text-xs">×{t.size}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">${t.entryPrice?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700 dark:text-gray-300">${t.exitPrice?.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.exitReason === "TP" ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" :
                        t.exitReason === "SL" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
                        "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                      }`}>
                        {t.exitReason || "Manual"}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${t.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                      {t.pnl >= 0 ? "+" : ""}${t.pnl?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

// Per-window setup-tag bar — chips shown at the top-left of a chart window plus
// a picker to add an existing custom tag or create a new one. Tagging is scoped
// to the single window it's rendered in.
function WindowTagBar({ tags = [], suggestions = [], onToggle, onAdd, theme, testIdPrefix = "window", readOnly = false }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (readOnly && tags.length === 0) return null;

  const q = input.trim().toLowerCase();
  const available = suggestions.filter(
    (s) => !tags.some((t) => t.toLowerCase() === s.toLowerCase()) && s.toLowerCase().includes(q)
  );
  const canCreate = input.trim() && !suggestions.some((s) => s.toLowerCase() === q);

  return (
    <div
      ref={ref}
      data-test-id={`${testIdPrefix}-tag-bar`}
      className="absolute top-2 left-2 z-20 flex items-center gap-1 flex-wrap"
      style={{ maxWidth: "60%" }}
    >
      {tags.map((tag) => {
        const c = tagColor(tag);
        return (
        <span
          key={tag}
          data-test-id={`${testIdPrefix}-tag-${tag}`}
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm"
          style={{ background: c.bg, color: c.text }}
        >
          {tag}
          {!readOnly && (
            <button onClick={() => onToggle(tag)} aria-label={`Remove ${tag}`} className="hover:opacity-70">
              <X style={{ width: 11, height: 11 }} />
            </button>
          )}
        </span>
        );
      })}
      {!readOnly && (
        <div className="relative">
          <button
            data-test-id={`${testIdPrefix}-tag-add-btn`}
            onClick={() => setOpen((o) => !o)}
            title="Tag this window"
            className="inline-flex items-center justify-center w-5 h-5 rounded-full shadow-sm"
            style={{ background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}` }}
          >
            <Plus style={{ width: 12, height: 12 }} />
          </button>
          {open && (
            <div
              className="absolute top-7 left-0 w-52 rounded-lg shadow-xl p-2 z-30"
              style={{ background: theme.surface, border: `1px solid ${theme.border}` }}
            >
              <input
                data-test-id={`${testIdPrefix}-tag-input`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) { onAdd(input.trim()); setInput(""); } }}
                placeholder="Create or search…"
                maxLength={30}
                autoFocus
                className="w-full text-xs px-2 py-1 rounded mb-1 outline-none"
                style={{ background: theme.bg, border: `1px solid ${theme.border}`, color: theme.text }}
              />
              <div className="max-h-40 overflow-y-auto">
                {canCreate && (
                  <button
                    onClick={() => { onAdd(input.trim()); setInput(""); }}
                    className="w-full text-left text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: theme.text }}
                  >
                    Create “{input.trim()}”
                  </button>
                )}
                {available.map((s) => (
                  <button
                    key={s}
                    data-test-id={`${testIdPrefix}-tag-option-${s}`}
                    onClick={() => onToggle(s)}
                    className="w-full flex items-center gap-2 text-left text-xs px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                    style={{ color: theme.text }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: tagColor(s).text, flexShrink: 0 }} />
                    {s}
                  </button>
                ))}
                {available.length === 0 && !canCreate && (
                  <p className="text-[11px] px-2 py-1" style={{ color: theme.textMuted }}>
                    {suggestions.length === 0 ? "No saved tags yet" : "No matches"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Chart settings: defaults + TradingView-style color palette ──────────────
const DEFAULT_CHART_SETTINGS = {
  bg: "", bgOpacity: 100,
  upBody: "", upBodyOpacity: 100,
  downBody: "", downBodyOpacity: 100,
  upBorder: "", upBorderOpacity: 100,
  downBorder: "", downBorderOpacity: 100,
  upWick: "", upWickOpacity: 100,
  downWick: "", downWickOpacity: 100,
  plainBg: false,
};

const ALL_TIMEFRAMES = ["1m","2m","3m","5m","10m","15m","20m","30m","45m","1h","2h","3h","4h","6h","8h","12h","1d","3d","1w","1M"];
const DEFAULT_FAV_TIMEFRAMES = ["1m","5m","15m","30m","1h","4h","1d"];

// Drawing tools — shared by the left toolbar and the floating favourites bar.
// Icon components are module-level imports, so this can live at module scope.
const BACKTEST_DRAW_TOOLS = [
  { mode: "trendline", Icon: TrendlineIcon,     title: "Trend Line (double-click to finish)" },
  { mode: "ray",       Icon: RayIcon,           title: "Ray (extends right)" },
  { mode: "segment",   Icon: SegmentIcon,       title: "Line Segment" },
  { mode: "hline",     Icon: Minus,             title: "Horizontal Line" },
  { mode: "vline",     Icon: SeparatorVertical, title: "Vertical Line" },
  { mode: "fibonacci", Icon: null,              title: "Fibonacci Retracement", label: "Fib" },
  { mode: "rectangle", Icon: Square,            title: "Rectangle" },
  { mode: "text",      Icon: Type,              title: "Text Label (double-click to edit)" },
  { mode: "brush",     Icon: Pencil,            title: "Freehand Brush" },
  { mode: "rr",        Icon: null,              title: "Risk/Reward Box", label: "R:R" },
];

// Minutes per timeframe — used by the candle-formation replay to offer lower TFs
const TF_MINUTES = {
  "1m":1,"2m":2,"3m":3,"5m":5,"10m":10,"15m":15,"20m":20,"30m":30,"45m":45,
  "1h":60,"2h":120,"3h":180,"4h":240,"6h":360,"8h":480,"12h":720,
  "1d":1440,"3d":4320,"1w":10080,"1M":43200,
};

// Lower-TF candles that fall inside chart candle `idx`'s time window
function subCandlesIn(data, idx, subs) {
  const start = data[idx]?.time;
  if (start == null || !subs?.length) return [];
  const end = data[idx + 1]?.time ?? Infinity;
  const out = [];
  for (let i = 0; i < subs.length; i++) {
    const t = subs[i].time;
    if (t >= end) break;
    if (t >= start) out.push(subs[i]);
  }
  return out;
}

// Aggregate the first `count` lower-TF candles into a partial (forming) candle
function buildFormingCandle(htfCandle, subs, count) {
  const n = Math.min(count, subs.length);
  if (!htfCandle || n <= 0) return null;
  let high = -Infinity, low = Infinity, volume = 0;
  for (let i = 0; i < n; i++) {
    if (subs[i].high > high) high = subs[i].high;
    if (subs[i].low < low) low = subs[i].low;
    volume += subs[i].volume || 0;
  }
  return { time: htfCandle.time, open: subs[0].open, high, low, close: subs[n - 1].close, volume };
}

const CHART_COLOR_PALETTE = [
  ["#ffffff","#e0e0e0","#b0b3bb","#787b86","#555965","#363a45","#2a2e39","#1e2230","#131722","#000000"],
  ["#f23645","#ff6d00","#ffd600","#00c853","#00bfa5","#00b8d4","#2979ff","#aa00ff","#d500f9","#ff1744"],
  ["#ffcdd2","#ffe0cc","#fff9c4","#c8e6c9","#b2dfdb","#b3e5fc","#bbdefb","#e1bee7","#f8bbd0","#ffd1d1"],
  ["#ef9a9a","#ffcc80","#fff176","#a5d6a7","#80cbc4","#81d4fa","#90caf9","#ce93d8","#f48fb1","#ff8a65"],
  ["#e57373","#ffa726","#ffee58","#66bb6a","#26a69a","#29b6f6","#42a5f5","#ab47bc","#ec407a","#ff7043"],
  ["#e53935","#fb8c00","#fdd835","#43a047","#00897b","#039be5","#1e88e5","#8e24aa","#d81b60","#f4511e"],
  ["#b71c1c","#bf360c","#f57f17","#1b5e20","#004d40","#01579b","#0d47a1","#4a148c","#880e4f","#bf360c"],
  ["#7f0000","#6d3100","#6d5000","#0d3300","#00251a","#002b5a","#0a1a50","#1a0038","#3c001c","#4e0000"],
];

function ColorPickerPopup({ value, opacity, onChange, onChangeOpacity, onClose }) {
  const [hexInput, setHexInput] = useState(value || "");
  useEffect(() => { setHexInput(value || ""); }, [value]);
  return (
    <div
      className="absolute z-[400] rounded-xl shadow-2xl border p-3"
      style={{ background: "#1e2230", borderColor: "#363a45", width: 244, top: "100%", right: 0, marginTop: 6 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded transition-colors"
        style={{ color: "#787b86" }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d4dc")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#787b86")}
      >
        <X className="w-3.5 h-3.5" />
      </button>
      {/* Color grid */}
      <div className="mb-3 mt-4 space-y-0.5">
        {CHART_COLOR_PALETTE.map((row, ri) => (
          <div key={ri} className="flex gap-0.5">
            {row.map((c) => (
              <button
                key={c}
                onClick={() => onChange(c)}
                className="rounded-sm flex-shrink-0 transition-transform hover:scale-110"
                style={{
                  width: 20, height: 20, background: c,
                  outline: value === c ? "2px solid #60a5fa" : "1px solid rgba(255,255,255,0.08)",
                  outlineOffset: value === c ? 1 : 0,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="border-t mb-3" style={{ borderColor: "#363a45" }} />
      {/* Hex input + native color picker */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-sm flex-shrink-0" style={{ background: value || "#ffffff", border: "1px solid rgba(255,255,255,0.15)" }} />
        <input
          type="text"
          value={hexInput}
          onChange={(e) => {
            setHexInput(e.target.value);
            if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(e.target.value);
          }}
          placeholder="#ffffff"
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: "#d1d4dc" }}
        />
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-5 cursor-pointer rounded border-0"
          style={{ padding: 1, background: "transparent" }}
        />
      </div>
      {/* Opacity slider */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs" style={{ color: "#b2b5be" }}>Opacity</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onChangeOpacity(Math.max(0, opacity - 1))}
              className="w-4 h-4 flex items-center justify-center rounded transition-colors"
              style={{ color: "#787b86" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d4dc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#787b86")}
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
            <span className="text-xs font-medium tabular-nums w-8 text-center" style={{ color: "#d1d4dc" }}>{opacity}%</span>
            <button
              onClick={() => onChangeOpacity(Math.min(100, opacity + 1))}
              className="w-4 h-4 flex items-center justify-center rounded transition-colors"
              style={{ color: "#787b86" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d4dc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#787b86")}
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
        <input
          type="range" min="0" max="100"
          value={opacity}
          onChange={(e) => onChangeOpacity(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: "#1E53E5" }}
        />
      </div>
    </div>
  );
}

function ChartSettingsModal({ chartSettings, setChartSettings, onClose }) {
  const [openPicker, setOpenPicker] = useState(null);
  const update = (key, val) => setChartSettings((prev) => ({ ...prev, [key]: val }));

  const candleRows = [
    { label: "Body",    upKey: "upBody",   downKey: "downBody"   },
    { label: "Borders", upKey: "upBorder", downKey: "downBorder" },
    { label: "Wick",    upKey: "upWick",   downKey: "downWick"   },
  ];

  const Swatch = ({ colorKey, defaultColor }) => {
    const opKey = colorKey + "Opacity";
    const rawColor = chartSettings[colorKey] || defaultColor;
    const opacity = chartSettings[opKey] ?? 100;
    const isOpen = openPicker === colorKey;
    // Build rgba so the swatch shows the true rendered color (no CSS opacity on the button itself)
    const displayColor = (() => {
      if (opacity >= 100 || !rawColor) return rawColor;
      const r = parseInt(rawColor.slice(1, 3), 16);
      const g = parseInt(rawColor.slice(3, 5), 16);
      const b = parseInt(rawColor.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${(opacity / 100).toFixed(2)})`;
    })();
    return (
      <div className="relative">
        <button
          onClick={() => setOpenPicker(isOpen ? null : colorKey)}
          className="rounded"
          style={{
            width: 34, height: 24, background: displayColor,
            border: isOpen ? "2px solid #60a5fa" : "2px solid rgba(255,255,255,0.15)",
          }}
        />
        {isOpen && (
          <ColorPickerPopup
            value={chartSettings[colorKey]}
            opacity={opacity}
            onChange={(c) => update(colorKey, c)}
            onChangeOpacity={(op) => update(opKey, op)}
            onClose={() => setOpenPicker(null)}
          />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Click-outside backdrop — transparent so chart is visible while adjusting colors */}
      <div className="fixed inset-0 z-[299]" onMouseDown={() => { setOpenPicker(null); onClose(); }} />
      <div
        className="fixed z-[300] rounded-xl shadow-2xl border flex flex-col"
        style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, background: "#1a1f2e", borderColor: "#2a2e39", maxHeight: "80vh" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0" style={{ borderColor: "#2a2e39" }}>
          <h3 className="text-sm font-semibold" style={{ color: "#d1d4dc" }}>Chart Settings</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded transition-colors"
            style={{ color: "#787b86" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d4dc")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#787b86")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* CANDLES */}
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#555965" }}>Candles</p>

          {/* Column headers */}
          <div className="flex items-center mb-2">
            <div className="flex-1" />
            <div className="flex gap-2 text-xs text-center mr-0.5" style={{ color: "#555965" }}>
              <span className="w-[34px]">Bull</span>
              <span className="w-[34px]">Bear</span>
            </div>
          </div>

          {candleRows.map(({ label, upKey, downKey }) => (
            <div key={label} className="flex items-center justify-between mb-3.5">
              <span className="text-sm" style={{ color: "#d1d4dc" }}>{label}</span>
              <div className="flex items-center gap-2">
                <Swatch colorKey={upKey} defaultColor="#089981" />
                <Swatch colorKey={downKey} defaultColor="#f23645" />
              </div>
            </div>
          ))}

          {/* BACKGROUND */}
          <div className="border-t mt-4 pt-4" style={{ borderColor: "#2a2e39" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#555965" }}>Background</p>

            <div className="flex items-center justify-between mb-3.5">
              <span className="text-sm" style={{ color: "#d1d4dc" }}>Plain white background</span>
              <button
                onClick={() => update("plainBg", !chartSettings.plainBg)}
                className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: chartSettings.plainBg ? "#1E53E5" : "#363a45" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                  style={{ left: chartSettings.plainBg ? "calc(100% - 18px)" : 2 }}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#d1d4dc" }}>Background color</span>
              <Swatch colorKey="bg" defaultColor="#131722" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t flex-shrink-0" style={{ borderColor: "#2a2e39" }}>
          <button
            onClick={() => setChartSettings({ ...DEFAULT_CHART_SETTINGS })}
            className="text-xs px-3 py-1.5 rounded transition-colors"
            style={{ color: "#787b86", background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#d1d4dc")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#787b86")}
          >
            Reset all
          </button>
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded font-semibold transition-colors"
            style={{ background: "#1E53E5", color: "#ffffff" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#1a47cc")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1E53E5")}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}

// One open-position card in the side panel: live P&L, editable TP/SL, and a
// partial-close control so the user can close any portion of the open size.
function PositionCard({ pos, theme, tickSize, onUpdateField, onClose, trimPrice }) {
  const [closeQty, setCloseQty] = useState(pos.size);
  // Keep the chosen close quantity valid after a partial close shrinks the size
  useEffect(() => { setCloseQty((q) => Math.min(Math.max(1, q), pos.size)); }, [pos.size]);
  const pct = Math.round((closeQty / pos.size) * 100);
  const partial = closeQty < pos.size;

  return (
    <div
      data-test-id={`position-card-${pos.id}`}
      className="rounded p-2 text-xs border"
      style={{ background: theme.bg, borderColor: theme.border }}
    >
      <div className="flex justify-between mb-1">
        <span className="font-semibold" style={{ color: pos.side === "buy" ? "#089981" : "#f23645" }}>
          {pos.side.toUpperCase()} ×{pos.size}
        </span>
        <span data-test-id={`position-pnl-${pos.id}`} style={{ color: pos.currentPnL >= 0 ? "#089981" : "#f23645" }}>
          {pos.currentPnL >= 0 ? "+" : ""}${trimPrice(pos.currentPnL)}
        </span>
      </div>
      <div className="mb-1" style={{ color: theme.textMuted }}>
        Entry ${trimPrice(pos.entryPrice)}
      </div>
      {/* Editable TP */}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-5 text-center font-bold" style={{ color: "#089981", fontSize: 9 }}>TP</span>
        <input
          type="number"
          value={pos.takeProfit ?? ""}
          onChange={(e) => onUpdateField(pos.id, "takeProfit", e.target.value)}
          placeholder="—"
          step={tickSize}
          className="flex-1 px-1 py-0.5 rounded border outline-none text-xs"
          style={{ background: theme.surface, borderColor: pos.takeProfit !== null ? "#089981" : theme.border, color: "#089981", minWidth: 0 }}
        />
      </div>
      {/* Editable SL */}
      <div className="flex items-center gap-1 mb-1">
        <span className="w-5 text-center font-bold" style={{ color: "#f23645", fontSize: 9 }}>SL</span>
        <input
          type="number"
          value={pos.stopLoss ?? ""}
          onChange={(e) => onUpdateField(pos.id, "stopLoss", e.target.value)}
          placeholder="—"
          step={tickSize}
          className="flex-1 px-1 py-0.5 rounded border outline-none text-xs"
          style={{ background: theme.surface, borderColor: pos.stopLoss !== null ? "#f23645" : theme.border, color: "#f23645", minWidth: 0 }}
        />
      </div>

      {/* Partial-close amount — only meaningful with more than one contract */}
      {pos.size > 1 && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-1">
            <span style={{ color: theme.textMuted }}>Close amount</span>
            <span
              data-test-id={`position-close-qty-${pos.id}`}
              className="font-semibold tabular-nums"
              style={{ color: theme.text }}
            >
              {closeQty}/{pos.size} · {pct}%
            </span>
          </div>
          <div className="flex gap-1 mb-1">
            {[25, 50, 75, 100].map((p) => {
              const q = Math.max(1, Math.min(pos.size, Math.round((pos.size * p) / 100)));
              const active = q === closeQty;
              return (
                <button
                  key={p}
                  data-test-id={`position-close-preset-${p}-${pos.id}`}
                  onClick={() => setCloseQty(q)}
                  className="flex-1 py-0.5 rounded font-medium"
                  style={active
                    ? { background: "#1E53E5", color: "#fff" }
                    : { background: theme.surface, color: theme.textMuted, border: `1px solid ${theme.border}` }}
                >
                  {p}%
                </button>
              );
            })}
          </div>
          <input
            type="range"
            data-test-id={`position-close-slider-${pos.id}`}
            min="1"
            max={pos.size}
            step="1"
            value={closeQty}
            onChange={(e) => setCloseQty(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "#1E53E5" }}
          />
        </div>
      )}

      <button
        data-test-id={`position-close-btn-${pos.id}`}
        onClick={() => onClose(pos, closeQty)}
        className="text-xs w-full text-center py-0.5 rounded"
        style={{ background: partial ? "#1E53E5" : theme.border, color: partial ? "#fff" : "#787b86" }}
      >
        {partial ? `Close ${pct}% (${closeQty})` : "Close at Market"}
      </button>
    </div>
  );
}

function ChartContextMenu({ x, y, onSettings, onPlaceOrder, onClose }) {
  const adjX = Math.min(x, window.innerWidth - 170);
  const adjY = Math.min(y, window.innerHeight - 90);
  return (
    <>
      {/* Transparent backdrop — clicking outside closes the menu */}
      <div className="fixed inset-0 z-[249]" onMouseDown={onClose} />
      <div
        className="fixed z-[250] rounded-lg shadow-xl border py-1 overflow-hidden"
        style={{ left: adjX, top: adjY, background: "#1a1f2e", borderColor: "#2a2e39", minWidth: 160 }}
      >
        {[
          { label: "Place an order", icon: Plus, action: onPlaceOrder },
          { label: "Settings", icon: Settings, action: onSettings },
        ].map(({ label, icon: Icon, action }) => (
          <button
            key={label}
            onClick={() => { action(); onClose(); }}
            className="w-full text-left flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
            style={{ color: "#d1d4dc" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#787b86" }} />
            {label}
          </button>
        ))}
      </div>
    </>
  );
}

const Backtest = () => {
  const { user } = useAuth();
  const { sessions, createSession, getSession } = useBacktest();
  const { maxBacktestSessions, upgradeLabel } = usePlanLimits();
  // Populated (with the current session count) when creating a session is
  // blocked by the plan cap, which opens the upgrade modal instead.
  const [sessionLimitInfo, setSessionLimitInfo] = useState(null);

  // ── Dark mode detection ──
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // On a mobile/touch device past sessions can still be reviewed (the list and
  // the read-only snapshot replays), but creating a new session or running a
  // live backtest requires a precise pointer and a large chart — those are
  // gated out below.
  const isMobile = useIsMobile();

  // Session and Setup States
  const [currentView, setCurrentView] = useState("sessions");
  const [currentSession, setCurrentSession] = useState(null);

  // Keep the create-session form and the live backtest off mobile. If a device
  // becomes "mobile" while one of those views is open (e.g. a tablet rotated to
  // portrait, or a window resized), send the user back to the read-only session
  // list rather than leaving them stuck in an unusable view.
  useEffect(() => {
    if (isMobile && (currentView === "setup" || currentView === "backtest")) {
      setCurrentView("sessions");
      toast("Backtesting is available on desktop. You can still review past sessions here.", {
        icon: "💻",
      });
    }
  }, [isMobile, currentView]);
  const [sessionName, setSessionName] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  // Date range driven by quick-select presets (default: Last 90 days)
  const [dateRangePreset, setDateRangePreset] = useState("90d");
  const [startDate, setStartDate] = useState(() => rangeForPreset("90d").start);
  const [endDate, setEndDate] = useState(() => rangeForPreset("90d").end);

  // Apply a date-range preset, syncing start/end. "Custom" keeps current dates.
  const applyDateRangePreset = (key) => {
    setDateRangePreset(key);
    const range = rangeForPreset(key);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  // Session history — loaded from DB, persists across devices
  const [sessionHistory, setSessionHistory] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [historyModal, setHistoryModal] = useState(null); // session obj with .trades when open
  const [chartModalSession, setChartModalSession] = useState(null); // session whose chart-replay modal is open
  const [tagSuggestions, setTagSuggestions] = useState([]); // user's saved custom tags

  // Recent-sessions pagination. Fewer per page on mobile since the redesigned
  // card is taller — keeps each page to roughly one screen on either device.
  const SESSIONS_PER_PAGE = isMobile ? 6 : 12;
  const [sessionsPage, setSessionsPage] = useState(0);
  const sessionPageCount = Math.max(1, Math.ceil(sessionHistory.length / SESSIONS_PER_PAGE));
  // Clamp the page back into range whenever the list shrinks (a delete) or the
  // page size changes (mobile/desktop switch), so we never show an empty page.
  useEffect(() => {
    setSessionsPage((p) => Math.min(p, sessionPageCount - 1));
  }, [sessionPageCount]);
  const pagedSessions = useMemo(
    () =>
      sessionHistory.slice(
        sessionsPage * SESSIONS_PER_PAGE,
        sessionsPage * SESSIONS_PER_PAGE + SESSIONS_PER_PAGE
      ),
    [sessionHistory, sessionsPage, SESSIONS_PER_PAGE]
  );
  // Per-window setup tags shown at the top of each chart window. Keyed by chart
  // number (1–3); each window's tags are independent and never auto-apply to the
  // others. Chart 1's tags are carried into the session's replay.
  const [windowTags, setWindowTags] = useState({ 1: [], 2: [], 3: [] });

  useEffect(() => {
    if (!user?.id) { setIsLoadingSessions(false); return; }
    setIsLoadingSessions(true);
    let cancelled = false;
    supabase
      .from("backtest_sessions")
      .select("id, name, parameters, results, note, tags, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60)
      .then(({ data, error }) => {
        if (cancelled) return;
        setIsLoadingSessions(false);
        if (error) {
          console.error("[Backtest] history load error:", error.message);
          toast.error("Could not load your backtest history. Please refresh the page.");
          return;
        }
        if (!data) return;
        // Sessions where the user never placed an order are not history —
        // purge ALL of them from the DB (not just the rows fetched here),
        // sparing only the session currently in progress
        const activeId = currentSessionRef.current?.id ?? null;
        let cleanup = supabase
          .from("backtest_sessions")
          .delete()
          .eq("user_id", user.id)
          .filter("results->trades", "eq", "[]");
        if (activeId) cleanup = cleanup.neq("id", activeId);
        cleanup.then(({ error: delErr }) => {
          if (delErr) console.error("[Backtest] empty-session cleanup error:", delErr.message);
        });
        const mapped = data
          .filter((row) => row.id === activeId || (row.results?.trades ?? []).length > 0)
          .map((row) => ({
          id:              row.id,
          name:            row.name,
          market:          row.parameters?.market,
          symbol:          row.parameters?.symbol,
          instrumentName:  row.parameters?.instrumentName,
          timeframe:       row.parameters?.timeframe,
          strategy:        row.parameters?.strategy,
          setup:           row.parameters?.setup,
          startDate:       row.parameters?.startDate ?? null,
          endDate:         row.parameters?.endDate ?? null,
          createdAt:       row.created_at,
          initialBalance:  row.parameters?.initialBalance,
          endingBalance:   row.results?.endingBalance ?? null,
          trades:          row.results?.trades ?? [],
          drawings:        row.results?.drawings ?? [],
          windowTags:      row.results?.windowTags ?? { 1: [], 2: [], 3: [] },
          // Older sessions stored a setup note inside parameters
          note:            row.note ?? row.parameters?.notes ?? "",
          tags:            Array.isArray(row.tags) ? row.tags : [],
          }));
        setSessionHistory(mapped);
        // Fresh device/browser: carry the running account balance over from
        // the most recent session's ending balance stored in the DB
        if (localStorage.getItem("backtestRunningBalance") == null && !currentSessionRef.current) {
          const latest = mapped.find((s) => s.endingBalance != null);
          if (latest) {
            setBalance(latest.endingBalance);
            localStorage.setItem("backtestRunningBalance", latest.endingBalance.toString());
          }
        }
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // The user's saved custom tags, offered as suggestions in the history modal
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("backtest_setup_tags")
      .select("name")
      .eq("user_id", user.id)
      .order("name", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("[Backtest] tag suggestions load error:", error.message);
          return; // suggestions are a nice-to-have — don't block the page
        }
        setTagSuggestions((data ?? []).map((r) => r.name));
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Template states — fetched from Supabase via useTemplates hook
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const { templates: settingsTemplates, loading: templatesLoading } = useTemplates();

  // Trading Strategy & Setup States
  const [strategy, setStrategy] = useState("");
  const [setup, setSetup] = useState("");
  const [riskRewardRatio, setRiskRewardRatio] = useState(""); // Start empty, let template populate
  const [notes, setNotes] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [customExitPrice, setCustomExitPrice] = useState("");
  const [exitPriceMode, setExitPriceMode] = useState("stopLoss"); // Default exit mode
  const [timeframe, setTimeframe] = useState("15m");
  const [marketCondition, setMarketCondition] = useState("");

  // Strategies and setups loaded from DB via hook
  const { strategies: userStrategies, setups: userSetups } = useUserSettings();
  const strategies = userStrategies;
  const setups = userSetups;

  // Template application function
  const applyTemplate = (templateId) => {
    if (!templateId) return;

    const template = settingsTemplates.find((t) => t.id === templateId);

    if (!template) {
      toast.error("Template not found");
      return;
    }

    const templateFields = template.fields || {};
    const includedFields =
      template.includedFields || Object.keys(templateFields);

    // Apply template fields to states
    let appliedFields = [];
    includedFields.forEach((field) => {
      const value = templateFields[field];
      if (value !== undefined && value !== "" && value !== null) {
        appliedFields.push(field);
        switch (field) {
          case "instrumentType": {
            const marketKey = Object.keys(MARKET_CONFIG).find(
              (k) => MARKET_CONFIG[k].name.toLowerCase() === value.toLowerCase()
            );
            if (marketKey) {
              setSelectedMarket(marketKey);
              setSelectedInstruments([]);
            }
            break;
          }
          case "strategy":
            setStrategy(value);
            break;
          case "setup":
            setSetup(value);
            break;
          case "riskRewardRatio":
          case "riskReward":
            setRiskRewardRatio(value);
            break;
          case "startDate":
            setStartDate(value);
            setDateRangePreset("custom");
            break;
          case "endDate":
            setEndDate(value);
            setDateRangePreset("custom");
            break;
          case "stopLoss":
            setStopLoss(value);
            setExitPriceMode("stopLoss");
            break;
          case "timeframe":
            setTimeframe(value);
            break;
          case "marketCondition":
            setMarketCondition(value);
            break;
          case "notes":
            setNotes(value);
            break;
        }
      }
    });

    const riskFieldsApplied = appliedFields.filter((field) =>
      ["riskRewardRatio", "riskReward"].includes(field)
    );

    if (riskFieldsApplied.length > 0) {
      toast.success(
        `Template "${
          template.name
        }" applied successfully! Risk management fields populated: ${riskFieldsApplied.join(
          ", "
        )}`
      );
    } else {
      toast.success(`Template "${template.name}" applied successfully!`);
    }
  };

  // Indicator visibility state — off by default, user opts in
  const [indicators, setIndicators] = useState({ ema20: false, ema50: false, volume: false });
  const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
  const indicatorPanelRef = useRef(null);

  const toggleIndicator = (key) =>
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));

  // Close indicator dropdown on outside click
  useEffect(() => {
    if (!showIndicatorPanel) return;
    const handleClick = (e) => {
      if (indicatorPanelRef.current && !indicatorPanelRef.current.contains(e.target)) {
        setShowIndicatorPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showIndicatorPanel]);

  // Chart and Trading States
  const [chartData, setChartData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCandle, setCurrentCandle] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [orderSide, setOrderSide] = useState("buy");
  const [orderSize, setOrderSize] = useState(1);
  const [orderType, setOrderType] = useState("market"); // market | limit | stop | stopLimit
  const [useTakeProfit, setUseTakeProfit] = useState(false);
  const [useStopLoss, setUseStopLoss] = useState(false);
  // Risk-per-trade selector for the order panel (shows the $ risk budget)
  const [riskOn, setRiskOn] = useState(true);
  const [riskPct, setRiskPct] = useState(1.0);

  // Account balance — runs as a single persistent account across all sessions.
  // backtestRunningBalance = last saved exit balance (carries between sessions).
  // backtestBaseBalance    = user's manually set reset point.
  const [baseBalance, setBaseBalance] = useState(() => {
    const stored = parseFloat(localStorage.getItem("backtestBaseBalance"));
    return isFinite(stored) && stored > 0 ? stored : 10000;
  });
  const [balance, setBalance] = useState(() => {
    const running = parseFloat(localStorage.getItem("backtestRunningBalance"));
    if (isFinite(running) && running > 0) return running;
    const base = parseFloat(localStorage.getItem("backtestBaseBalance"));
    return isFinite(base) && base > 0 ? base : 10000;
  });
  // Tracks the balance when the current session started
  const sessionStartBalanceRef = useRef(null);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  // Persist baseBalance whenever it changes
  useEffect(() => {
    localStorage.setItem("backtestBaseBalance", baseBalance.toString());
  }, [baseBalance]);

  const confirmBalanceChange = () => {
    const newBalance = parseFloat(balanceInput);
    if (!isFinite(newBalance) || newBalance <= 0) {
      toast.error("Please enter a valid positive balance.");
      return;
    }
    const confirmed = window.confirm(
      `Set account balance to $${newBalance.toLocaleString()}?\n\nThis resets your running account balance. Future sessions will start from this amount.`
    );
    if (confirmed) {
      setBaseBalance(newBalance);
      setBalance(newBalance);
      localStorage.setItem("backtestRunningBalance", newBalance.toString());
      setIsEditingBalance(false);
      toast.success(`Balance set to $${newBalance.toLocaleString()}`);
    }
  };

  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [takeProfit, setTakeProfit] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const intervalRef = useRef(null);
  const currentCandleRef = useRef(0); // mirror of currentCandle for interval closure
  const positionsRef = useRef([]); // mirror of positions — read by interval without updater closure
  // Mirrors read by the session save handlers (pagehide/unmount fire from a
  // mount-time closure, so they must go through refs to see current values)
  const tradesRef = useRef([]);
  const balanceRef = useRef(balance);
  const currentSessionRef = useRef(null);
  const userIdRef = useRef(null);
  const drawingsRef = useRef([]); // chart-1 drawings, snapshotted into the session on save
  const windowTagsRef = useRef({ 1: [], 2: [], 3: [] }); // per-window tags, snapshotted on save

  // Drawing tools
  const [drawingMode, setDrawingMode] = useState(null);
  // Tracks whether the active drawing mode was set from the left panel ("panel") or the floating favorites bar ("floating")
  const [drawingModeSource, setDrawingModeSource] = useState(null);
  const floatDragRef = useRef(null); // for drag-to-reorder within the floating bar
  const [favBarPos, setFavBarPos] = useState(null); // null = default centered; { left, top } = fixed viewport coords after user drags the bar
  // Favourite drawing tools — persisted to localStorage
  const [favDrawingTools, setFavDrawingTools] = useState(() => {
    try { return JSON.parse(localStorage.getItem("backtestFavTools") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("backtestFavTools", JSON.stringify(favDrawingTools)); } catch {}
  }, [favDrawingTools]);
  const toggleFavTool = (mode) =>
    setFavDrawingTools((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
  // History stack for undo/redo — single state object so pushDrawings is one atomic setState call
  const [drawingHist, setDrawingHist] = useState({ history: [[]], idx: 0 });
  const userDrawings = drawingHist.history[drawingHist.idx] ?? [];
  const canUndo = drawingHist.idx > 0;
  const canRedo = drawingHist.idx < drawingHist.history.length - 1;
  // Per-chart drawing arrays for windows 2 and 3
  const [userDrawings2, setUserDrawings2] = useState([]);
  const [userDrawings3, setUserDrawings3] = useState([]);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState([]);
  // Copied drawings (Ctrl+C → Ctrl+P), shared across all chart windows.
  // Stored without ids — fresh ids are minted on paste so copies are independent
  // and individually deletable.
  const drawingClipboardRef = useRef([]);

  // Bar replay mode — when active, clicking the chart seeks to that candle
  const [barReplayMode, setBarReplayMode] = useState(false);

  // Seek-to-date picker dropdown in the top-center replay controls
  const [showSeekDatePicker, setShowSeekDatePicker] = useState(false);
  const seekDatePickerRef = useRef(null);

  // Compact timezone dropdown (shows a short code closed, full labels open)
  const [showTzDropdown, setShowTzDropdown] = useState(false);
  const tzDropdownRef = useRef(null);

  // Candle-formation replay — step each chart-TF candle using lower-TF data
  // (e.g. watch a 4h candle form from eight 30m steps)
  const [formTf, setFormTf] = useState(null); // null = off
  const [formData, setFormData] = useState([]); // lower-TF candles
  const [formStep, setFormStep] = useState(0); // sub-steps consumed of the forming candle
  const [isLoadingFormData, setIsLoadingFormData] = useState(false);
  const formStateRef = useRef({ formTf: null, formData: [], formStep: 0 });
  useEffect(() => {
    formStateRef.current = { formTf, formData, formStep };
  }, [formTf, formData, formStep]);

  // Chart timezone — applies to all chart windows, persisted across sessions
  const [chartTz, setChartTz] = useState(() => {
    try {
      const saved = localStorage.getItem("backtestChartTz");
      if (saved && TZ_OPTIONS.some((o) => o.id === saved)) return saved;
    } catch { /* storage unavailable */ }
    return "America/New_York";
  });
  const handleChartTzChange = (value) => {
    setChartTz(value);
    try { localStorage.setItem("backtestChartTz", value); } catch { /* storage unavailable */ }
  };

  // Chart layout: "single" | "2col" | "3col"
  const [chartLayout, setChartLayout] = useState("single");
  const [chartData2, setChartData2] = useState([]);
  const [isLoadingData2, setIsLoadingData2] = useState(false);
  const [chartData3, setChartData3] = useState([]);
  const [isLoadingData3, setIsLoadingData3] = useState(false);
  // Symbols currently loaded in extra chart slots
  const [chart2Symbol, setChart2Symbol] = useState(null);
  const [chart3Symbol, setChart3Symbol] = useState(null);
  // Independent timeframes for extra chart slots
  const [chart2Timeframe, setChart2Timeframe] = useState("15m");
  const [chart3Timeframe, setChart3Timeframe] = useState("15m");
  // Synced candle indices for extra charts
  const [currentCandle2, setCurrentCandle2] = useState(0);
  const [currentCandle3, setCurrentCandle3] = useState(0);

  // Sidebar & fullscreen
  const [showSidebar, setShowSidebar] = useState(false);
  // Collapsible sections inside the side panel (collapsed by default)
  const [showOpenPositions, setShowOpenPositions] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [showEdgeAnalytics, setShowEdgeAnalytics] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartContainerRef = useRef(null);

  // Layout sync settings
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [syncCursor, setSyncCursor] = useState(false);
  const [syncTimeframe, setSyncTimeframe] = useState(false);
  const [syncDrag, setSyncDrag] = useState(false);
  const layoutMenuRef = useRef(null);

  // Favorite timeframes — persisted, shown in central TF bar
  const [favTimeframes, setFavTimeframes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("backtestFavTimeframes")) || DEFAULT_FAV_TIMEFRAMES; }
    catch { return DEFAULT_FAV_TIMEFRAMES; }
  });
  const [tfPickerOpen, setTfPickerOpen] = useState(false);
  const tfPickerRef = useRef(null);

  // Asset search — unified search dropdown (null = closed, truthy = open)
  const [chartSearchOpen, setChartSearchOpen] = useState(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const searchDropdownRef = useRef(null);

  // Imperative crosshair setters — charts move each other's crosshair directly
  // (going through React state re-rendered the whole page per mousemove and
  // made the synced cursor shake/choppy in 2–3 window layouts)
  const crosshairSettersRef = useRef({});
  // Imperative range setters/getters — each BacktestChart registers here for smooth sync
  const rangeSettersRef = useRef({});
  const rangeGettersRef = useRef({});

  // Which chart window the mouse is currently in (1 | 2 | 3)
  const [activeChart, setActiveChart] = useState(1);

  // Column flex sizes for resizable chart panels [col1, col2, col3]
  const [colSizes, setColSizes] = useState([1, 1, 1]);
  const isResizingCol = useRef(null); // { startX, col, startSizes, visibleCols, latestSizes }
  const innerRowRef = useRef(null);
  const colPanelRefs = useRef([]); // DOM nodes of the three chart panels — flex written directly during drag

  // Right price-scale width per window {1,2,3} — reported by each BacktestChart.
  // Used to size + position the timezone dropdown flush under the active
  // window's price-scale column (not the far-right edge in 2/3-window layouts).
  const [psWidths, setPsWidths] = useState({ 1: 0, 2: 0, 3: 0 });
  const reportPsWidth = (chart, w) =>
    setPsWidths((prev) => (prev[chart] === w ? prev : { ...prev, [chart]: w }));
  // Computed { left, width } (px, relative to innerRowRef) for the TZ dropdown,
  // or null until the active window's price-scale width is known.
  const [tzBox, setTzBox] = useState(null);

  // Keep the TZ dropdown aligned under the LAST visible chart window's
  // price-scale column (rightmost window regardless of which is active).
  useLayoutEffect(() => {
    const recompute = () => {
      const lastIdx = chartLayout === "3col" ? 2 : chartLayout === "2col" ? 1 : 0;
      const lastNum = lastIdx + 1;
      const panel = colPanelRefs.current[lastIdx];
      const psW = psWidths[lastNum] || 0;
      if (!panel || !psW) { setTzBox(null); return; }
      const left = panel.offsetLeft + panel.offsetWidth - psW;
      setTzBox((prev) =>
        prev && prev.left === left && prev.width === psW ? prev : { left, width: psW });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (innerRowRef.current) ro.observe(innerRowRef.current);
    colPanelRefs.current.forEach((el) => el && ro.observe(el));
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [chartLayout, colSizes, psWidths]);

  // Chart appearance settings (candle colors, background) — persisted to localStorage
  const [chartSettings, setChartSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("backtestChartSettings")) || {};
      return { ...DEFAULT_CHART_SETTINGS, ...saved };
    } catch { return { ...DEFAULT_CHART_SETTINGS }; }
  });
  const [showChartSettings, setShowChartSettings] = useState(false);
  const chartSettingsPanelRef = useRef(null);

  // Right-click context menu position
  const [contextMenuPos, setContextMenuPos] = useState(null); // { x, y } or null

  // "Delete all drawings" confirmation modal (replaces window.confirm)
  const [showClearDrawingsConfirm, setShowClearDrawingsConfirm] = useState(false);
  const contextMenuRef = useRef(null);

  // Draggable order panel
  const [panelPos, setPanelPos] = useState({ x: 54, y: 10 });
  const isDraggingPanel = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Push a new drawings snapshot onto the history stack
  const pushDrawings = (next) => setDrawingHist((prev) => ({
    history: [...prev.history.slice(0, prev.idx + 1), next],
    idx: prev.idx + 1,
  }));
  const undo = () => setDrawingHist((prev) => prev.idx > 0 ? { ...prev, idx: prev.idx - 1 } : prev);
  const redo = () => setDrawingHist((prev) => prev.idx < prev.history.length - 1 ? { ...prev, idx: prev.idx + 1 } : prev);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingPanel.current) return;
      const nx = dragOrigin.current.px + (e.clientX - dragOrigin.current.mx);
      const ny = dragOrigin.current.py + (e.clientY - dragOrigin.current.my);
      setPanelPos({
        x: Math.max(0, Math.min(window.innerWidth - 284, nx)),
        y: Math.max(0, Math.min(window.innerHeight - 80, ny)),
      });
    };
    const onUp = () => { isDraggingPanel.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // Sync fullscreen state when user presses Escape
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Sync cursor during PLAYBACK — only runs while playing so manual seeks don't loop
  useEffect(() => {
    if ((!syncCursor && !barReplayMode) || !isPlaying) return;
    const ts = chartData[currentCandle]?.time;
    if (ts == null) return;
    if (chartData2.length > 0) {
      let idx = chartData2.length - 1;
      for (let i = 0; i < chartData2.length; i++) {
        if (chartData2[i].time > ts) { idx = Math.max(0, i - 1); break; }
      }
      setCurrentCandle2(idx);
    }
    if (chartData3.length > 0) {
      let idx = chartData3.length - 1;
      for (let i = 0; i < chartData3.length; i++) {
        if (chartData3[i].time > ts) { idx = Math.max(0, i - 1); break; }
      }
      setCurrentCandle3(idx);
    }
  }, [syncCursor, barReplayMode, isPlaying, currentCandle, chartData, chartData2, chartData3]);

  // Close layout menu / search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target))
        setShowLayoutMenu(false);
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target))
        setChartSearchOpen(null);
      if (seekDatePickerRef.current && !seekDatePickerRef.current.contains(e.target))
        setShowSeekDatePicker(false);
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target))
        setShowTzDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Backspace/Delete removes selected drawings; Ctrl+Z undoes; Ctrl+A selects all
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        if (userDrawings.length > 0) setSelectedDrawingIds(userDrawings.map((d) => d.id));
        return;
      }
      // Ctrl+C — copy the selected drawing(s) to the shared clipboard. The
      // selection set spans all windows, so gather from every window's array.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedDrawingIds.length === 0) return;
        const byId = new Map();
        [...userDrawings, ...userDrawings2, ...userDrawings3].forEach((d) => byId.set(d.id, d));
        const picked = selectedDrawingIds.map((id) => byId.get(id)).filter(Boolean);
        if (picked.length === 0) return;
        e.preventDefault();
        // Clone without the id — paste mints fresh ones
        drawingClipboardRef.current = picked.map(({ id, ...rest }) => JSON.parse(JSON.stringify(rest)));
        return;
      }
      // Ctrl+P — paste the copied drawing(s) into the active window. preventDefault
      // also suppresses the browser print dialog this shortcut normally triggers.
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        if (drawingClipboardRef.current.length === 0) return;
        // Offset each paste so the copy sits a little up-and-right of the original
        // instead of exactly overlapping. Up = +price (a slice of the visible
        // range), right = +a couple of bars. Shape preserved (same delta on every
        // point of a drawing).
        const data = activeChart === 2 ? chartData2 : activeChart === 3 ? chartData3 : chartData;
        const interval = data.length > 1 ? data[1].time - data[0].time : 3600;
        let lo = Infinity, hi = -Infinity;
        for (const c of data) { if (c.low < lo) lo = c.low; if (c.high > hi) hi = c.high; }
        const dt = interval * 2;
        const dp = hi > lo ? (hi - lo) * 0.05 : 0;
        const shiftGeom = (o) => {
          if (typeof o.time === "number") o.time += dt;
          if (typeof o.endTime === "number") o.endTime += dt;
          if (typeof o.price === "number") o.price += dp;
          ["entry", "sl", "tp"].forEach((k) => { if (typeof o[k] === "number") o[k] += dp; });
          if (o.p1) o.p1 = { ...o.p1, time: o.p1.time + dt, price: o.p1.price + dp };
          if (o.p2) o.p2 = { ...o.p2, time: o.p2.time + dt, price: o.p2.price + dp };
          if (Array.isArray(o.points)) {
            o.points = o.points.map((pt) => {
              if ("xFrac" in pt) return { ...pt, xFrac: pt.xFrac + 0.02, yFrac: pt.yFrac - 0.05 };
              if ("logicalIdx" in pt) return { ...pt, logicalIdx: pt.logicalIdx + 2, price: pt.price + dp };
              return { ...pt, time: pt.time + dt, price: pt.price + dp };
            });
          }
          return o;
        };
        const base = Date.now();
        const clones = drawingClipboardRef.current.map((d, i) => ({
          ...shiftGeom(JSON.parse(JSON.stringify(d))),
          id: base + i,
        }));
        const newIds = clones.map((d) => d.id);
        if (activeChart === 2) setUserDrawings2((prev) => [...prev, ...clones]);
        else if (activeChart === 3) setUserDrawings3((prev) => [...prev, ...clones]);
        else pushDrawings([...userDrawings, ...clones]);
        setSelectedDrawingIds(newIds);
        // Cascade: keep the pasted positions so a repeated paste steps further
        // up-right instead of stacking on the previous copy.
        drawingClipboardRef.current = clones.map(({ id, ...rest }) => rest);
        return;
      }
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (selectedDrawingIds.length > 0) {
        const toDelete = new Set(selectedDrawingIds);
        pushDrawings(userDrawings.filter((d) => !toDelete.has(d.id)));
        setUserDrawings2((prev) => prev.filter((d) => !toDelete.has(d.id)));
        setUserDrawings3((prev) => prev.filter((d) => !toDelete.has(d.id)));
        setSelectedDrawingIds([]);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selectedDrawingIds, userDrawings, userDrawings2, userDrawings3, activeChart, chartData, chartData2, chartData3]); // eslint-disable-line

  // Column resize — global mouse move/up so dragging outside the panel still works.
  // Updates are coalesced to one per animation frame so the charts resize smoothly.
  useEffect(() => {
    let rafId = null;
    let pendingX = null;
    const applyResize = () => {
      rafId = null;
      if (!isResizingCol.current || pendingX == null) return;
      const { startX, col, startSizes, visibleCols } = isResizingCol.current;
      const parent = innerRowRef.current;
      if (!parent) return;
      const totalWidth = parent.offsetWidth - 34; // subtract drawing toolbar width
      const totalFlex = startSizes.slice(0, visibleCols).reduce((a, b) => a + b, 0);
      const flexDelta = ((pendingX - startX) / totalWidth) * totalFlex;
      // Clamp the shared delta so both panels respect the 0.15 minimum and total flex stays constant
      const MIN_COL_FLEX = 0.15;
      const clamped = Math.max(
        MIN_COL_FLEX - startSizes[col],
        Math.min(startSizes[col + 1] - MIN_COL_FLEX, flexDelta)
      );
      const newSizes = [...startSizes];
      newSizes[col] = startSizes[col] + clamped;
      newSizes[col + 1] = startSizes[col + 1] - clamped;
      // Write flex directly to the DOM — re-rendering the whole page per frame makes the charts stutter
      const elA = colPanelRefs.current[col];
      const elB = colPanelRefs.current[col + 1];
      if (elA) elA.style.flex = String(newSizes[col]);
      if (elB) elB.style.flex = String(newSizes[col + 1]);
      isResizingCol.current.latestSizes = newSizes;
    };
    const handleMouseMove = (e) => {
      if (!isResizingCol.current) return;
      e.preventDefault();
      pendingX = e.clientX;
      if (rafId == null) rafId = requestAnimationFrame(applyResize);
    };
    const handleMouseUp = () => {
      if (!isResizingCol.current) return;
      const { latestSizes } = isResizingCol.current;
      isResizingCol.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      if (latestSizes) setColSizes(latestSizes); // commit so React state matches the DOM
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []); // eslint-disable-line

  // Close chart settings panel on outside click
  useEffect(() => {
    if (!showChartSettings) return;
    const handler = (e) => {
      if (chartSettingsPanelRef.current && !chartSettingsPanelRef.current.contains(e.target)) {
        setShowChartSettings(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showChartSettings]);

  // Persist chart settings to localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem("backtestChartSettings", JSON.stringify(chartSettings)); } catch {}
  }, [chartSettings]);

  // Persist favorite timeframes
  useEffect(() => {
    try { localStorage.setItem("backtestFavTimeframes", JSON.stringify(favTimeframes)); } catch {}
  }, [favTimeframes]);

  // ── Per-instrument drawing persistence via sessionStorage (auto-clears on page/tab close) ──
  // Load drawings when the instrument changes
  useEffect(() => {
    const symbol = currentSession?.instrument?.symbol;
    if (!symbol) return;
    try {
      const raw = sessionStorage.getItem(`backtest_drawings_${symbol}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setDrawingHist({ history: [parsed], idx: 0 });
      }
    } catch {}
  }, [currentSession?.instrument?.symbol]); // eslint-disable-line

  // Save drawings whenever they change.
  // Intentionally reads symbol from ref (not state dep) so this effect does NOT fire
  // on symbol change — only on drawing changes. Firing on symbol change would race
  // with the load effect above and overwrite the stored drawings with an empty array
  // before the loaded state has settled.
  useEffect(() => {
    const symbol = currentSessionRef.current?.instrument?.symbol;
    if (!symbol) return;
    try {
      sessionStorage.setItem(`backtest_drawings_${symbol}`, JSON.stringify(userDrawings));
    } catch {}
  }, [userDrawings]); // eslint-disable-line

  // Close TF picker on outside click
  useEffect(() => {
    if (!tfPickerOpen) return;
    const handler = (e) => {
      if (tfPickerRef.current && !tfPickerRef.current.contains(e.target)) setTfPickerOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tfPickerOpen]);

  // Close right-click context menu on outside click or Escape
  useEffect(() => {
    if (!contextMenuPos) return;
    const handler = (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
        setContextMenuPos(null);
      }
    };
    const escHandler = (e) => { if (e.key === "Escape") setContextMenuPos(null); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [contextMenuPos]);

  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await chartContainerRef.current?.requestFullscreen().catch(() => {});
    } else {
      await document.exitFullscreen().catch(() => {});
    }
  };

  // Load an asset into a specific chart slot (or next available if chartNum === 1)
  const handleAssetSearchSelectFor = async (chartNum, market, symbol) => {
    setChartSearchOpen(null);
    setAssetSearchQuery("");

    if (chartNum === 1) {
      // Always change the active window's (chart 1's) asset directly — the
      // selected window owns the search. Extra windows are populated by
      // selecting them (or via the layout buttons), not from chart 1.
      setIsLoadingData(true);
      try {
        const candles = sliceCandlesToRange(
          await fetchMarketCandles(market, symbol, timeframe),
          currentSession?.startDate,
          currentSession?.endDate,
        );
        setChartData(candles);
        setCurrentCandle(candles.length - 1);
        setCurrentPrice(candles[candles.length - 1]?.close || 0);
        setPositions([]);
        setCurrentSession((prev) => ({
          ...prev,
          instrument: { ...prev.instrument, symbol, market },
        }));
      } catch (err) { toast.error(err.message); }
      finally { setIsLoadingData(false); }
      return;
    }

    if (chartNum === 2) {
      setIsLoadingData2(true);
      try {
        const candles = sliceCandlesToRange(
          await fetchMarketCandles(currentSession?.market ?? selectedMarket, symbol, chart2Timeframe),
          currentSession?.startDate,
          currentSession?.endDate,
        );
        setChartData2(candles);
        setChart2Symbol(symbol);
        setCurrentCandle2(candles.length - 1);
        if (chartLayout === "single") setChartLayout("2col");
        // Match candle size to chart 1
        setTimeout(() => {
          const range = rangeGettersRef.current[1]?.();
          if (range) rangeSettersRef.current[2]?.(range);
        }, 200);
      } catch { toast.error(`Failed to load ${symbol}`); }
      finally { setIsLoadingData2(false); }
    } else {
      setIsLoadingData3(true);
      try {
        const candles = sliceCandlesToRange(
          await fetchMarketCandles(currentSession?.market ?? selectedMarket, symbol, chart3Timeframe),
          currentSession?.startDate,
          currentSession?.endDate,
        );
        setChartData3(candles);
        setChart3Symbol(symbol);
        setCurrentCandle3(candles.length - 1);
        if (chartLayout !== "3col") setChartLayout("3col");
        // Match candle size to chart 1
        setTimeout(() => {
          const range = rangeGettersRef.current[1]?.();
          if (range) rangeSettersRef.current[3]?.(range);
        }, 200);
      } catch { toast.error(`Failed to load ${symbol}`); }
      finally { setIsLoadingData3(false); }
    }
  };

  // Flat list of all instruments for search
  const allInstruments = Object.entries(MARKET_CONFIG).flatMap(([market, cfg]) =>
    cfg.instruments.map((inst) => ({ ...inst, market, marketName: cfg.name }))
  );
  const filteredInstruments = assetSearchQuery.trim()
    ? allInstruments.filter((i) =>
        i.symbol.toLowerCase().includes(assetSearchQuery.toLowerCase()) ||
        i.name.toLowerCase().includes(assetSearchQuery.toLowerCase())
      )
    : allInstruments;

  // Pure function — no setState side effects (StrictMode double-invokes updaters,
  // so calling setState inside setPositions's updater would duplicate trades)
  const processPositionsForCandle = (candle, openPositions) => {
    const stillOpen = [];
    const closedTrades = [];
    let balanceDelta = 0;

    openPositions.forEach((pos) => {
      let closed = false;
      let exitPrice = candle.close;
      let exitReason = "";

      if (pos.side === "buy") {
        if (pos.stopLoss !== null && candle.low <= pos.stopLoss) {
          exitPrice = pos.stopLoss; exitReason = "SL"; closed = true;
        } else if (pos.takeProfit !== null && candle.high >= pos.takeProfit) {
          exitPrice = pos.takeProfit; exitReason = "TP"; closed = true;
        }
      } else {
        if (pos.stopLoss !== null && candle.high >= pos.stopLoss) {
          exitPrice = pos.stopLoss; exitReason = "SL"; closed = true;
        } else if (pos.takeProfit !== null && candle.low <= pos.takeProfit) {
          exitPrice = pos.takeProfit; exitReason = "TP"; closed = true;
        }
      }

      if (closed) {
        const pnl = pos.side === "buy"
          ? (exitPrice - pos.entryPrice) * pos.size * pos.tickRatio
          : (pos.entryPrice - exitPrice) * pos.size * pos.tickRatio;
        balanceDelta += pnl;
        closedTrades.push({ ...pos, exitPrice, pnl, exitReason, exitTime: candle.time });
      } else {
        const currentPnL = pos.side === "buy"
          ? (candle.close - pos.entryPrice) * pos.size * pos.tickRatio
          : (pos.entryPrice - candle.close) * pos.size * pos.tickRatio;
        stillOpen.push({ ...pos, currentPnL });
      }
    });

    return { stillOpen, closedTrades, balanceDelta };
  };

  // R multiple achieved relative to the initial stop-loss risk (null if no SL)
  const rAchievedOf = (pos, pnl) => {
    if (pos.stopLoss == null) return null;
    const risk = Math.abs(pos.entryPrice - pos.stopLoss) * pos.size * pos.tickRatio;
    return risk > 0 ? pnl / risk : null;
  };

  // Apply closed-trade results — called after processPositionsForCandle
  const applyClosedTrades = (closedTrades, balanceDelta) => {
    if (closedTrades.length === 0) return;
    // Snapshot the balance after each close so equity curves and drawdown work
    let running = balanceRef.current;
    const enriched = closedTrades.map((trade) => {
      running += trade.pnl;
      return { ...trade, balanceAfter: running, rAchieved: rAchievedOf(trade, trade.pnl) };
    });
    setBalance((b) => b + balanceDelta);
    setTrades((t) => [...t, ...enriched]);
    enriched.forEach((trade) => {
      if (trade.pnl > 0) toast.success(`${trade.exitReason}: +$${trade.pnl.toFixed(2)}`);
      else toast.error(`${trade.exitReason}: $${trade.pnl.toFixed(2)}`);
    });
  };

  // Persist the active session's trades + running balance to the DB and the
  // running balance locally. Reads only refs so it stays correct when called
  // from pagehide/unmount handlers registered at mount.
  const saveSessionResults = (status = "running") => {
    const session = currentSessionRef.current;
    if (!session) return;
    localStorage.setItem("backtestRunningBalance", balanceRef.current.toString());
    if (!userIdRef.current) return;
    // A completed session with no trades is not history — remove its row
    if (status === "completed" && tradesRef.current.length === 0) {
      supabase
        .from("backtest_sessions")
        .delete()
        .eq("id", session.id)
        .eq("user_id", userIdRef.current)
        .then(({ error }) => {
          if (error) console.error("[Backtest] empty-session delete error:", error.message);
        });
      return;
    }
    supabase
      .from("backtest_sessions")
      .update({
        results: {
          trades: tradesRef.current,
          endingBalance: balanceRef.current,
          drawings: drawingsRef.current,
          windowTags: windowTagsRef.current,
        },
        status,
      })
      .eq("id", session.id)
      .then(({ error }) => {
        if (error) console.error("[Backtest] session save error:", error.message);
      });
  };

  // Save a note + custom tags edited in the history modal. New tags are also
  // remembered in backtest_setup_tags so they show up as suggestions later.
  const handleSaveSessionMeta = async (sessionId, meta) => {
    if (!user?.id) {
      toast.error("You must be signed in to save changes.");
      return;
    }
    const parsed = sessionMetaSchema.safeParse(meta);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid note or tags");
      return;
    }
    const { note, tags } = parsed.data;
    try {
      const { error } = await supabase
        .from("backtest_sessions")
        .update({ note, tags })
        .eq("id", sessionId)
        .eq("user_id", user.id);
      if (error) throw new Error(error.message);

      setSessionHistory((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, note, tags } : s))
      );
      setHistoryModal((m) => (m && m.id === sessionId ? { ...m, note, tags } : m));

      const newTags = tags.filter(
        (t) => !tagSuggestions.some((s) => s.toLowerCase() === t.toLowerCase())
      );
      if (newTags.length > 0) {
        const { error: tagErr } = await supabase
          .from("backtest_setup_tags")
          .upsert(
            newTags.map((name) => ({ user_id: user.id, name })),
            { onConflict: "user_id,name", ignoreDuplicates: true }
          );
        if (tagErr) {
          console.error("[Backtest] tag save error:", tagErr.message);
        } else {
          setTagSuggestions((prev) => [...new Set([...prev, ...newTags])].sort());
        }
      }
      toast.success("Session updated");
    } catch (err) {
      console.error("[Backtest] session meta save error:", err.message);
      toast.error("Could not save your changes. Please try again.");
    }
  };

  // Remember a freshly-created custom tag so it shows up as a suggestion later.
  // Shared by the history modal and the per-window tag pickers.
  const persistCustomTag = async (name) => {
    if (!user?.id) return;
    if (tagSuggestions.some((s) => s.toLowerCase() === name.toLowerCase())) return;
    const { error } = await supabase
      .from("backtest_setup_tags")
      .upsert([{ user_id: user.id, name }], { onConflict: "user_id,name", ignoreDuplicates: true });
    if (error) {
      console.error("[Backtest] tag save error:", error.message);
    } else {
      setTagSuggestions((prev) => [...new Set([...prev, name])].sort());
    }
  };

  // Toggle a tag on a single chart window — never touches the other windows.
  const toggleWindowTag = (win, tag) => {
    setWindowTags((prev) => {
      const current = prev[win] || [];
      const exists = current.some((t) => t.toLowerCase() === tag.toLowerCase());
      return {
        ...prev,
        [win]: exists
          ? current.filter((t) => t.toLowerCase() !== tag.toLowerCase())
          : [...current, tag],
      };
    });
  };

  // Validate + add a (possibly new) tag to a window, persisting it for reuse.
  const addWindowTag = (win, raw) => {
    const parsed = sessionTagSchema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Invalid tag");
      return;
    }
    const tag = parsed.data;
    const current = windowTags[win] || [];
    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    if (current.length >= MAX_SESSION_TAGS) {
      toast.error(`A window can have at most ${MAX_SESSION_TAGS} tags`);
      return;
    }
    toggleWindowTag(win, tag);
    persistCustomTag(tag);
  };

  const handleCreateSession = async () => {
    if (
      !sessionName ||
      !selectedMarket ||
      selectedInstruments.length === 0 ||
      !strategy ||
      !setup
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Enforce the saved-session plan cap before doing any work. Count from the
    // DB (source of truth) rather than the possibly-paginated `sessions` list.
    // A failed count fails open — never block a save on a count hiccup.
    if (maxBacktestSessions > 0 && user?.id) {
      const { count, error: countErr } = await supabase
        .from("backtest_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!countErr && count != null && limitReached(count, maxBacktestSessions)) {
        setSessionLimitInfo({ used: count, max: maxBacktestSessions });
        return;
      }
    }

    const sessionBalance = balance;
    sessionStartBalanceRef.current = balance;
    // Use the first selected instrument for the chart; store all for the session record
    const instrument = MARKET_CONFIG[selectedMarket].instruments.find(
      (inst) => inst.symbol === selectedInstruments[0]
    );

    const newSession = {
      id: crypto.randomUUID(),
      name: sessionName,
      market: selectedMarket,
      instrument,
      initialBalance: sessionBalance,
      strategy,
      setup,
      riskRewardRatio,
      timeframe,
      marketCondition,
      notes: notes || "",
      stopLoss: stopLoss || "",
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      status: "active",
    };

    setIsLoadingData(true);

    // Save to DB before switching view — insert is fast (< 100ms)
    if (user?.id) {
      const { data: inserted, error: insertErr } = await supabase
        .from("backtest_sessions")
        .insert({
          user_id:    user.id,
          name:       newSession.name,
          parameters: {
            market:          selectedMarket,
            symbol:          instrument.symbol,
            instrumentName:  instrument.name,
            timeframe,
            strategy,
            setup,
            riskRewardRatio,
            marketCondition,
            notes:           notes || "",
            stopLoss:        stopLoss || "",
            initialBalance:  sessionBalance,
            startDate,
            endDate,
          },
          results: { trades: [], endingBalance: null, drawings: [], windowTags: { 1: [], 2: [], 3: [] } },
          status: "running",
        })
        .select("id")
        .single();

      // DB-side plan cap backstop (raced/bypassed client pre-check): abort and
      // show the same upgrade modal rather than starting an unsaved session.
      if (insertErr && typeof insertErr.message === "string" && insertErr.message.includes("PLAN_LIMIT_BACKTEST")) {
        setSessionLimitInfo({ used: maxBacktestSessions, max: maxBacktestSessions });
        setIsLoadingData(false);
        return;
      }

      if (insertErr || !inserted?.id) {
        // Without a DB row every later save is a no-op update, so the whole
        // session would vanish on refresh — surface it instead of hiding it.
        console.error("[Backtest] session insert error:", insertErr?.message);
        toast.error("Could not save this session to your history. Your trades will not persist after you leave this page.");
      } else {
        newSession.id = inserted.id;
      }
    }

    // Fresh session — clear any trades/positions/tags left from a previous one
    setTrades([]);
    setPositions([]);
    positionsRef.current = [];
    tradesRef.current = [];
    setWindowTags({ 1: [], 2: [], 3: [] });
    windowTagsRef.current = { 1: [], 2: [], 3: [] };

    setCurrentSession(newSession);
    currentSessionRef.current = newSession;
    setCurrentView("backtest");

    // Prepend to local history state (already in DB)
    setSessionHistory((prev) => [
      {
        id:             newSession.id,
        name:           newSession.name,
        market:         selectedMarket,
        symbol:         instrument.symbol,
        instrumentName: instrument.name,
        timeframe,
        strategy,
        setup,
        startDate,
        endDate,
        createdAt:      newSession.createdAt,
        initialBalance: sessionBalance,
        endingBalance:  null,
        trades:         [],
        note:           notes || "",
        tags:           [],
      },
      ...prev.slice(0, 19),
    ]);

    try {
      const candles = sliceCandlesToRange(
        await fetchMarketCandles(selectedMarket, selectedInstruments[0], timeframe),
        startDate,
        endDate,
      );
      const latest = candles.length - 1;
      setChartData(candles);
      setCurrentCandle(latest);
      setCurrentPrice(candles[latest]?.close || 0);
      toast.success("Chart loaded with real market data!");

      // Load additional instrument charts
      if (selectedInstruments.length > 1) {
        setIsLoadingData2(true);
        try {
          const candles2 = sliceCandlesToRange(
            await fetchMarketCandles(selectedMarket, selectedInstruments[1], timeframe),
            startDate,
            endDate,
          );
          setChartData2(candles2);
          setChart2Symbol(selectedInstruments[1]);
          setCurrentCandle2(candles2.length - 1);
        } catch { /* second chart is optional */ } finally {
          setIsLoadingData2(false);
        }
        if (selectedInstruments.length > 2) {
          setIsLoadingData3(true);
          try {
            const candles3 = sliceCandlesToRange(
              await fetchMarketCandles(selectedMarket, selectedInstruments[2], timeframe),
              startDate,
              endDate,
            );
            setChartData3(candles3);
            setChart3Symbol(selectedInstruments[2]);
            setCurrentCandle3(candles3.length - 1);
          } catch { /* third chart is optional */ } finally {
            setIsLoadingData3(false);
          }
          setChartLayout("3col");
        } else {
          setChartLayout("2col");
        }
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Keep refs in sync (used by interval to avoid stale closures)
  useEffect(() => { currentCandleRef.current = currentCandle; }, [currentCandle]);
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { tradesRef.current = trades; }, [trades]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { drawingsRef.current = userDrawings; }, [userDrawings]);
  useEffect(() => { windowTagsRef.current = windowTags; }, [windowTags]);
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);

  // Evaluate window 2/3 positions against their own candles as those windows
  // advance (their cursors move via the playback-sync effect, not advanceOneStep).
  // Only forward single/multi steps are processed; the prev-ref resets on data
  // reload so a load-time jump to the last candle never back-processes history.
  const currentCandle2PrevRef = useRef(0);
  const currentCandle3PrevRef = useRef(0);
  useEffect(() => { currentCandle2PrevRef.current = currentCandle2; }, [chartData2]); // eslint-disable-line
  useEffect(() => { currentCandle3PrevRef.current = currentCandle3; }, [chartData3]); // eslint-disable-line
  useEffect(() => {
    const prev = currentCandle2PrevRef.current;
    if (currentCandle2 > prev) {
      const run = [];
      for (let i = prev + 1; i <= currentCandle2 && i < chartData2.length; i++) run.push(chartData2[i]);
      if (run.length) processCandleRun(run, 2);
    }
    currentCandle2PrevRef.current = currentCandle2;
  }, [currentCandle2]); // eslint-disable-line
  useEffect(() => {
    const prev = currentCandle3PrevRef.current;
    if (currentCandle3 > prev) {
      const run = [];
      for (let i = prev + 1; i <= currentCandle3 && i < chartData3.length; i++) run.push(chartData3[i]);
      if (run.length) processCandleRun(run, 3);
    }
    currentCandle3PrevRef.current = currentCandle3;
  }, [currentCandle3]); // eslint-disable-line

  // Persist after every closed trade (and after Reset clears them) so the
  // session history survives a tab close or refresh mid-session
  useEffect(() => {
    if (!currentSession || currentView !== "backtest") return;
    saveSessionResults("running");
  }, [trades]); // eslint-disable-line react-hooks/exhaustive-deps

  // Belt-and-suspenders: save when the tab is hidden/closed and when the
  // component unmounts (sidebar navigation away from the Backtest page)
  useEffect(() => {
    const handler = () => saveSessionResults("running");
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("pagehide", handler);
      handler();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Trading logic — reads positionsRef directly so no state is read inside an updater
  // (StrictMode double-invokes updater functions; calling setTrades inside setPositions's
  //  updater caused every closed trade to be added twice)
  // Process a list of candles (or sub-candles) for ONE window against that
  // window's open positions; positions on other windows are left untouched.
  const processCandleRun = (candles, chartNum = 1) => {
    const all = positionsRef.current;
    let pos = all.filter((p) => (p.chartNum ?? 1) === chartNum);
    const others = all.filter((p) => (p.chartNum ?? 1) !== chartNum);
    if (pos.length === 0) return; // nothing open on this window
    const closed = [];
    let delta = 0;
    candles.forEach((c) => {
      const r = processPositionsForCandle(c, pos);
      pos = r.stillOpen;
      closed.push(...r.closedTrades);
      delta += r.balanceDelta;
    });
    setPositions([...others, ...pos]);
    applyClosedTrades(closed, delta);
  };

  // Advance the replay by one step. In candle-formation mode a step is one
  // lower-TF sub-candle of the forming chart candle; otherwise a full candle.
  const advanceOneStep = () => {
    const prev = currentCandleRef.current;
    if (prev >= chartData.length - 1) { setIsPlaying(false); return; }
    const nextIdx = prev + 1;
    const candle = chartData[nextIdx];
    const { formTf: fTf, formData: fData, formStep: fStep } = formStateRef.current;
    const subs = fTf && fData.length ? subCandlesIn(chartData, nextIdx, fData) : [];

    if (subs.length > 1 && fStep < subs.length - 1) {
      // Partial step — the next candle keeps forming
      const s = fStep + 1;
      formStateRef.current.formStep = s;
      setFormStep(s);
      const sub = subs[s - 1];
      setCurrentPrice(sub.close);
      processCandleRun([sub]);
      return;
    }

    // Full step — completes the forming candle (processing only the sub-candles
    // not yet seen, so positions aren't run through the same range twice)
    const remaining = subs.length ? subs.slice(fStep) : [candle];
    formStateRef.current.formStep = 0;
    setFormStep(0);
    currentCandleRef.current = nextIdx;
    setCurrentCandle(nextIdx);
    setCurrentPrice(candle.close);
    processCandleRun(remaining.length ? remaining : [candle]);
  };

  useEffect(() => {
    if (isPlaying && currentCandle < chartData.length - 1) {
      intervalRef.current = setInterval(advanceOneStep, 1000 / speed);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, chartData.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = () => {
    if (currentCandle >= chartData.length - 1) return; // at end — button should be disabled
    setIsPlaying((p) => !p);
  };

  // Sync all other chart windows to a given timestamp (excludeChart won't be touched)
  const syncToTimestamp = (ts, excludeChart) => {
    if (ts == null) return;
    const findIdx = (data) => {
      let idx = data.length - 1;
      for (let i = 0; i < data.length; i++) {
        if (data[i].time > ts) { idx = Math.max(0, i - 1); break; }
      }
      return idx;
    };
    if (excludeChart !== 1 && chartData.length > 0) {
      const i = findIdx(chartData);
      setCurrentCandle(i);
      setCurrentPrice(chartData[i]?.close ?? 0);
    }
    if (excludeChart !== 2 && chartData2.length > 0) setCurrentCandle2(findIdx(chartData2));
    if (excludeChart !== 3 && chartData3.length > 0) setCurrentCandle3(findIdx(chartData3));
  };

  const handleStepForward = () => {
    if (currentCandle >= chartData.length - 1) return;
    advanceOneStep();
    // Always sync other windows when a candle completes (not mid sub-candle formation)
    if (formStateRef.current.formStep === 0) {
      syncToTimestamp(chartData[currentCandleRef.current]?.time, 1);
    }
  };

  // Restores the default viewport (zoom + position, anchored at each window's
  // current candle) for ALL open windows — must NOT rewind the replay cursor
  // or hide candle history.
  const handleReset = () => {
    const resetWin = (data, curr, setter) => {
      if (!data?.length || !setter) return;
      const win = defaultWindowCandles(data);
      const last = Math.min(curr, data.length - 1);
      setter({ from: last - win, to: last + 3 });
    };
    resetWin(chartData, currentCandle, rangeSettersRef.current[1]);
    resetWin(chartData2, currentCandle2, rangeSettersRef.current[2]);
    resetWin(chartData3, currentCandle3, rangeSettersRef.current[3]);
  };

  const handleCandleSeek = (idx) => {
    setIsPlaying(false);
    setFormStep(0);
    setCurrentCandle(idx);
    setCurrentPrice(chartData[idx]?.close || 0);
    if (syncCursor || barReplayMode) syncToTimestamp(chartData[idx]?.time, 1);
  };

  const handleCandleSeek2 = (idx) => {
    setCurrentCandle2(idx);
    if (syncCursor) syncToTimestamp(chartData2[idx]?.time, 2);
  };

  const handleCandleSeek3 = (idx) => {
    setCurrentCandle3(idx);
    if (syncCursor) syncToTimestamp(chartData3[idx]?.time, 3);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    // Candle-formation mode: unwind one sub-step of the forming candle first
    if (formTf && formStep > 0) {
      const s = formStep - 1;
      setFormStep(s);
      if (s > 0) {
        const subs = subCandlesIn(chartData, currentCandle + 1, formData);
        setCurrentPrice(subs[s - 1]?.close ?? chartData[currentCandle]?.close ?? 0);
      } else {
        setCurrentPrice(chartData[currentCandle]?.close || 0);
      }
      return;
    }
    if (currentCandle <= 0) return;
    const prev = currentCandle - 1;
    setCurrentCandle(prev);
    setCurrentPrice(chartData[prev]?.close || 0);
    syncToTimestamp(chartData[prev]?.time, 1);
  };

  // seekDate: the date the user has typed into the date picker
  const [seekDate, setSeekDate] = useState("");

  const handleCut = () => {
    if (!chartData.length) return;
    setIsPlaying(false);
    setFormStep(0);
    if (!seekDate) return;
    // Yahoo Finance timestamps are UTC seconds; date input gives "YYYY-MM-DD" in local tz.
    const findIdx = (data) => {
      const idx = data.findIndex((c) => {
        const d = new Date(c.time * 1000).toISOString().slice(0, 10);
        return d >= seekDate;
      });
      return idx === -1 ? data.length - 1 : idx;
    };
    const target = findIdx(chartData);
    setCurrentCandle(target);
    setCurrentPrice(chartData[target]?.close || 0);

    // Always sync cut to extra charts so all windows jump to the same date
    if (chartData2.length > 0) setCurrentCandle2(findIdx(chartData2));
    if (chartData3.length > 0) setCurrentCandle3(findIdx(chartData3));

    // Scroll chart to show the cut candle at the right edge, preserving current zoom level
    setTimeout(() => {
      const currentRange = rangeGettersRef.current[1]?.();
      const win = currentRange
        ? Math.round(currentRange.to - currentRange.from)
        : defaultWindowCandles(chartData);
      rangeSettersRef.current[1]?.({ from: target - win + 3, to: target + 3 });
    }, 0);
  };

  // Turn candle-formation replay on/off — loads the lower-TF dataset once
  const handleFormTfChange = async (tf) => {
    setIsPlaying(false);
    setFormStep(0);
    if (!tf) {
      setFormTf(null);
      setFormData([]);
      return;
    }
    setFormTf(tf);
    setIsLoadingFormData(true);
    try {
      const candles = await fetchMarketCandles(
        currentSession.market,
        currentSession.instrument.symbol,
        tf,
      );
      setFormData(candles);
      const firstCovered = candles.length ? candles[0].time : null;
      if (firstCovered != null && chartData.length && firstCovered > chartData[Math.min(currentCandle + 1, chartData.length - 1)]?.time) {
        toast(`${tf.toUpperCase()} data starts later than the replay position — formation kicks in once it's covered`, { icon: "ℹ️" });
      }
    } catch {
      toast.error(`Failed to load ${tf.toUpperCase()} data for candle formation`);
      setFormTf(null);
      setFormData([]);
    } finally {
      setIsLoadingFormData(false);
    }
  };

  // Formation data belongs to chart 1's instrument — drop it when that changes
  useEffect(() => {
    setFormTf(null);
    setFormData([]);
    setFormStep(0);
  }, [currentSession?.instrument?.symbol]);

  // The partially-formed next candle (null when not forming) — drawn by chart 1
  const formingCandle = useMemo(() => {
    if (!formTf || formStep <= 0 || !formData.length) return null;
    const next = chartData[currentCandle + 1];
    if (!next) return null;
    const subs = subCandlesIn(chartData, currentCandle + 1, formData);
    return buildFormingCandle(next, subs, formStep);
  }, [formTf, formStep, formData, chartData, currentCandle]);

  const handleTimeframeChange = async (newTf) => {
    if (newTf === timeframe || isLoadingData || !currentSession) return;
    // Preserve the timestamp of the current cut position
    const currentTs = chartData[currentCandle]?.time ?? null;
    setIsPlaying(false);
    setFormStep(0);
    // Formation TF must stay strictly below the chart TF — clear it otherwise
    if (formTf && (TF_MINUTES[formTf] >= TF_MINUTES[newTf] || TF_MINUTES[newTf] % TF_MINUTES[formTf] !== 0)) {
      setFormTf(null);
      setFormData([]);
    }
    setCurrentCandle(0);
    setChartData([]);
    setTimeframe(newTf);
    setIsLoadingData(true);
    // Clear cache so we re-fetch with new timeframe
    clearCandleCache(currentSession.market, currentSession.instrument.symbol, newTf);
    try {
      const candles = sliceCandlesToRange(
        await fetchMarketCandles(
          currentSession.market,
          currentSession.instrument.symbol,
          newTf,
        ),
        currentSession.startDate,
        currentSession.endDate,
      );
      // Find the closest candle to the saved timestamp
      let newIdx = candles.length - 1;
      if (currentTs !== null) {
        const matchIdx = candles.findIndex((c) => c.time >= currentTs);
        if (matchIdx !== -1) newIdx = matchIdx;
      }
      setChartData(candles);
      setCurrentCandle(newIdx);
      setCurrentPrice(candles[newIdx]?.close || 0);
      // Balance persists across timeframe changes
      setPositions([]);
      setTrades([]);

      // Sync timeframe: reload extra charts with their own timeframe (or the new one if syncTimeframe)
      const refTs = candles[newIdx]?.time ?? null;
      if (chart2Symbol && (chartData2.length > 0 || chartLayout !== "single")) {
        setIsLoadingData2(true);
        const tf2 = syncTimeframe ? newTf : chart2Timeframe;
        if (syncTimeframe) setChart2Timeframe(newTf);
        try {
          const c2 = sliceCandlesToRange(
            await fetchMarketCandles(currentSession.market, chart2Symbol, tf2),
            currentSession.startDate,
            currentSession.endDate,
          );
          setChartData2(c2);
          if (refTs !== null) {
            let i2 = c2.length - 1;
            for (let i = 0; i < c2.length; i++) { if (c2[i].time > refTs) { i2 = Math.max(0, i - 1); break; } }
            setCurrentCandle2(i2);
          } else { setCurrentCandle2(c2.length - 1); }
          // Sync candle size from chart 1 after new data renders
          setTimeout(() => {
            const range = rangeGettersRef.current[1]?.();
            if (range) rangeSettersRef.current[2]?.(range);
          }, 250);
        } catch { /* non-fatal */ } finally { setIsLoadingData2(false); }
      }
      if (chart3Symbol && (chartData3.length > 0 || chartLayout === "3col")) {
        setIsLoadingData3(true);
        const tf3 = syncTimeframe ? newTf : chart3Timeframe;
        if (syncTimeframe) setChart3Timeframe(newTf);
        try {
          const c3 = sliceCandlesToRange(
            await fetchMarketCandles(currentSession.market, chart3Symbol, tf3),
            currentSession.startDate,
            currentSession.endDate,
          );
          setChartData3(c3);
          if (refTs !== null) {
            let i3 = c3.length - 1;
            for (let i = 0; i < c3.length; i++) { if (c3[i].time > refTs) { i3 = Math.max(0, i - 1); break; } }
            setCurrentCandle3(i3);
          } else { setCurrentCandle3(c3.length - 1); }
          // Sync candle size from chart 1 after new data renders
          setTimeout(() => {
            const range = rangeGettersRef.current[1]?.();
            if (range) rangeSettersRef.current[3]?.(range);
          }, 250);
        } catch { /* non-fatal */ } finally { setIsLoadingData3(false); }
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleChart2TimeframeChange = async (newTf) => {
    if (!chart2Symbol || newTf === chart2Timeframe) return;
    setChart2Timeframe(newTf);
    setIsLoadingData2(true);
    try {
      const candles = sliceCandlesToRange(
        await fetchMarketCandles(currentSession?.market ?? selectedMarket, chart2Symbol, newTf),
        currentSession?.startDate,
        currentSession?.endDate,
      );
      setChartData2(candles);
      setCurrentCandle2(candles.length - 1);
      setTimeout(() => {
        const range = rangeGettersRef.current[1]?.();
        if (range) rangeSettersRef.current[2]?.(range);
      }, 200);
    } catch { toast.error(`Failed to load ${chart2Symbol} ${newTf}`); }
    finally { setIsLoadingData2(false); }
  };

  const handleChart3TimeframeChange = async (newTf) => {
    if (!chart3Symbol || newTf === chart3Timeframe) return;
    setChart3Timeframe(newTf);
    setIsLoadingData3(true);
    try {
      const candles = sliceCandlesToRange(
        await fetchMarketCandles(currentSession?.market ?? selectedMarket, chart3Symbol, newTf),
        currentSession?.startDate,
        currentSession?.endDate,
      );
      setChartData3(candles);
      setCurrentCandle3(candles.length - 1);
      setTimeout(() => {
        const range = rangeGettersRef.current[1]?.();
        if (range) rangeSettersRef.current[3]?.(range);
      }, 200);
    } catch { toast.error(`Failed to load ${chart3Symbol} ${newTf}`); }
    finally { setIsLoadingData3(false); }
  };

  // Central TF bar handler — routes to the active window (or all if sync is on)
  const handleActiveTfChange = (newTf) => {
    if (syncTimeframe) {
      handleTimeframeChange(newTf);
    } else if (activeChart === 2) {
      handleChart2TimeframeChange(newTf);
    } else if (activeChart === 3) {
      handleChart3TimeframeChange(newTf);
    } else {
      handleTimeframeChange(newTf);
    }
  };

  const updatePosition = (posId, field, value) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === posId ? { ...p, [field]: value !== "" && value !== null ? parseFloat(value) : null } : p
      )
    );
  };

  // Manually close all (or part) of an open position at the current market
  // price. `closeQty` contracts are closed (clamped to 1..pos.size); any
  // remainder stays open as a reduced position.
  const closePositionManually = (pos, closeQty) => {
    const cn = pos.chartNum ?? 1;
    const candle = cn === 2 ? chartData2[currentCandle2]
      : cn === 3 ? chartData3[currentCandle3]
      : chartData[currentCandle];
    const exitPrice = candle?.close || currentPrice;
    const qty = Math.max(1, Math.min(Math.round(closeQty), pos.size));
    const pnl = pos.side === "buy"
      ? (exitPrice - pos.entryPrice) * qty * pos.tickRatio
      : (pos.entryPrice - exitPrice) * qty * pos.tickRatio;
    const remaining = pos.size - qty;

    if (remaining > 0) {
      // Partial close — reduce the open size, keep it on the book
      setPositions((prev) => prev.map((p) => (p.id === pos.id ? { ...p, size: remaining } : p)));
    } else {
      setPositions((prev) => prev.filter((p) => p.id !== pos.id));
    }
    setBalance((b) => b + pnl);
    setTrades((t) => [...t, {
      ...pos,
      size: qty,
      exitPrice,
      pnl,
      exitReason: remaining > 0 ? "Partial" : "Manual",
      exitTime: candle?.time,
      balanceAfter: balance + pnl,
      rAchieved: rAchievedOf({ ...pos, size: qty }, pnl),
    }]);
  };

  const openOrderPanel = (side) => {
    setOrderSide(side);
    // TP/SL always start OFF — reset any leftover state from a cancelled panel
    // (toggling one on seeds a value ≥10 ticks from entry via clampExitLevel)
    setUseTakeProfit(false);
    setUseStopLoss(false);
    setTakeProfit("");
    setStopLoss("");
    const rect = chartContainerRef.current?.getBoundingClientRect();
    setPanelPos({
      x: (rect?.left ?? 0) + 60,
      y: (rect?.top ?? 0) + 80,
    });
    setShowOrderPanel(true);
  };

  // Price from whichever chart window the mouse is in
  const activeChartPrice =
    activeChart === 2 ? (chartData2[currentCandle2]?.close ?? 0)
    : activeChart === 3 ? (chartData3[currentCandle3]?.close ?? 0)
    : currentPrice;

  // Resolve a symbol to its full instrument (tickSize/tickValue) for the
  // current market — falls back to window 1's instrument if unknown.
  const resolveInstrument = (symbol) => {
    const market = currentSession?.market;
    return (
      MARKET_CONFIG[market]?.instruments.find((i) => i.symbol === symbol) ??
      currentSession?.instrument
    );
  };

  // Instrument + entry candle of the window the order panel is acting on, so an
  // order placed while window 2/3 is selected uses THAT window's contract and bar.
  const activeChartInstrument =
    activeChart === 2 ? resolveInstrument(chart2Symbol)
    : activeChart === 3 ? resolveInstrument(chart3Symbol)
    : currentSession?.instrument;
  const activeChartCandleTime =
    activeChart === 2 ? chartData2[currentCandle2]?.time
    : activeChart === 3 ? chartData3[currentCandle3]?.time
    : chartData[currentCandle]?.time;

  // TP/SL must stay at least 10 ticks away from the entry price — applied to
  // line drags and order execution
  const MIN_EXIT_TICKS = 10;
  const clampExitLevel = (field, value) => {
    const tickSize = activeChartInstrument?.tickSize || 0.25;
    const entry = activeChartPrice || currentPrice;
    if (!entry || !isFinite(value)) return value;
    const min = MIN_EXIT_TICKS * tickSize;
    const isBuy = orderSide === "buy";
    if (field === "takeProfit") return isBuy ? Math.max(value, entry + min) : Math.min(value, entry - min);
    if (field === "stopLoss")   return isBuy ? Math.min(value, entry - min) : Math.max(value, entry + min);
    return value;
  };

  // Positions + trades split per window so each chart draws only its own
  const positionsByChart = useMemo(() => ({
    1: positions.filter((p) => (p.chartNum ?? 1) === 1),
    2: positions.filter((p) => p.chartNum === 2),
    3: positions.filter((p) => p.chartNum === 3),
  }), [positions]);
  const tradesByChart = useMemo(() => ({
    1: trades.filter((t) => (t.chartNum ?? 1) === 1),
    2: trades.filter((t) => t.chartNum === 2),
    3: trades.filter((t) => t.chartNum === 3),
  }), [trades]);

  // Memoised so BacktestChart's preview-line effect doesn't fire on every unrelated render
  const orderPreview1 = useMemo(() =>
    showOrderPanel && activeChart === 1 ? {
      side: orderSide,
      entryPrice: activeChartPrice,
      takeProfit: useTakeProfit && takeProfit !== "" ? parseFloat(takeProfit) : null,
      stopLoss: useStopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null,
    } : null
  , [showOrderPanel, activeChart, orderSide, activeChartPrice, useTakeProfit, takeProfit, useStopLoss, stopLoss]); // eslint-disable-line

  const orderPreview2 = useMemo(() =>
    showOrderPanel && activeChart === 2 ? {
      side: orderSide,
      entryPrice: activeChartPrice,
      takeProfit: useTakeProfit && takeProfit !== "" ? parseFloat(takeProfit) : null,
      stopLoss: useStopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null,
    } : null
  , [showOrderPanel, activeChart, orderSide, activeChartPrice, useTakeProfit, takeProfit, useStopLoss, stopLoss]); // eslint-disable-line

  const orderPreview3 = useMemo(() =>
    showOrderPanel && activeChart === 3 ? {
      side: orderSide,
      entryPrice: activeChartPrice,
      takeProfit: useTakeProfit && takeProfit !== "" ? parseFloat(takeProfit) : null,
      stopLoss: useStopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null,
    } : null
  , [showOrderPanel, activeChart, orderSide, activeChartPrice, useTakeProfit, takeProfit, useStopLoss, stopLoss]); // eslint-disable-line

  // Derived risk / position-sizing values for the order panel. When risk +
  // auto-size are on and a stop is set, the contract count is computed from
  // account balance, risk %, and the stop distance instead of typed manually.
  const orderCalc = useMemo(() => {
    const instrument = activeChartInstrument || currentSession?.instrument;
    const tickSize = instrument?.tickSize || 0.25;
    const tickValue = instrument?.tickValue || 5;
    const entry = activeChartPrice || 0;

    const slPrice = useStopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null;
    const tpPrice = useTakeProfit && takeProfit !== "" ? parseFloat(takeProfit) : null;
    const slTicks = slPrice != null && entry > 0 && !isNaN(slPrice)
      ? Math.abs(slPrice - entry) / tickSize : 0;
    const tpTicks = tpPrice != null && entry > 0 && !isNaN(tpPrice)
      ? Math.abs(tpPrice - entry) / tickSize : 0;

    const units = Math.max(1, orderSize);
    const riskAmt = balance * (riskPct / 100);

    const riskOnStop = slTicks > 0 ? units * slTicks * tickValue : 0;
    const rewardAtTgt = tpTicks > 0 ? units * tpTicks * tickValue : 0;
    const rr = slTicks > 0 && tpTicks > 0 ? tpTicks / slTicks : null;
    const estValue = entry * units;

    return {
      tickSize, tickValue, entry,
      slTicks, tpTicks, units, riskAmt,
      riskOnStop, rewardAtTgt, rr, estValue,
    };
  }, [activeChartInstrument, currentSession, activeChartPrice, useStopLoss, stopLoss,
      useTakeProfit, takeProfit, orderSize, balance, riskPct]);

  const executeOrder = () => {
    if (!currentSession) return;
    // Execute against the window the panel is acting on — its instrument, its
    // current candle, and tag the position so it's drawn + processed there.
    const chartNum = activeChart;
    const instrument = activeChartInstrument || currentSession.instrument;
    const tickRatio = instrument.tickValue / instrument.tickSize;
    const entryPrice = activeChartPrice || currentPrice;

    const position = {
      id: Date.now(),
      chartNum,
      symbol: instrument.symbol,
      side: orderSide,
      size: orderCalc.units,
      entryPrice,
      stopLoss: useStopLoss && stopLoss ? clampExitLevel("stopLoss", parseFloat(stopLoss)) : null,
      takeProfit: useTakeProfit && takeProfit ? clampExitLevel("takeProfit", parseFloat(takeProfit)) : null,
      orderType,
      timestamp: activeChartCandleTime,
      currentPnL: 0,
      tickRatio,
    };

    setPositions((prev) => [...prev, position]);
    setShowOrderPanel(false);
    setOrderSize(1);
    setStopLoss("");
    setTakeProfit("");
    setUseTakeProfit(false);
    setUseStopLoss(false);

    toast.success(`${orderSide.toUpperCase()} ${orderCalc.units} ${instrument.symbol} at $${trimPrice(entryPrice)}`);
  };

  // Trade-level edge analytics aggregated across the whole saved history,
  // walked chronologically so the equity curve carries across sessions
  const historyEdge = useMemo(() => {
    const sessionsAsc = sessionHistory
      .filter((s) => (s.trades?.length ?? 0) > 0)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const allTrades = sessionsAsc.flatMap((s) =>
      withBalanceSnapshots(s.trades, s.initialBalance)
    );
    const initialBalance = sessionsAsc[0]?.initialBalance ?? 0;
    return {
      trades: allTrades,
      sessions: sessionsAsc.length,
      initialBalance,
      stats: computeEdgeStats(allTrades, initialBalance),
    };
  }, [sessionHistory]);

  // Render views
  if (currentView === "sessions") {
    const completedSessions = sessionHistory.filter((s) => s.endingBalance != null);
    const totalPnl = completedSessions.reduce((sum, s) => sum + (s.endingBalance - s.initialBalance), 0);
    const winningSessions = completedSessions.filter((s) => s.endingBalance >= s.initialBalance).length;
    const winRate = completedSessions.length > 0
      ? Math.round((winningSessions / completedSessions.length) * 100)
      : null;

    return (
      <>
      <div className="min-h-screen flex flex-col">

        {/* ── Top header bar ── */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-600/30">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Backtest</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Replay history, test your edge</p>
              </div>
            </div>
            {isMobile ? (
              <span
                data-test-id="backtest-desktop-only-note"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 flex-shrink-0"
              >
                <Smartphone className="w-4 h-4" />
                Desktop only
              </span>
            ) : (
              <button
                onClick={() => setCurrentView("setup")}
                className="btn-gradient flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
                data-test-id="backtest-new-session-btn"
              >
                <Plus className="w-4 h-4" />
                New Session
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">

          {isLoadingSessions ? (
            /* ── Loading — prevent flash of empty state while DB query is in-flight ── */
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 dark:text-primary-400" />
            </div>
          ) : sessionHistory.length === 0 ? (
            /* ── Empty state for first-time users ── */
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-20 h-20 rounded-2xl mb-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20">
                <TrendingUp className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Start your first backtest
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mb-2 leading-relaxed">
                Replay real market data candle by candle. Practice entering and exiting trades, measure your performance, and refine your edge — all without risking capital.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">
                Your account balance carries between sessions so you can track cumulative performance.
              </p>
              <div className="flex items-center gap-4 flex-wrap justify-center">
                {isMobile ? (
                  <div
                    data-test-id="backtest-mobile-empty-note"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700"
                  >
                    <Smartphone className="w-4 h-4 flex-shrink-0" />
                    Open Trade Journal on a desktop to create your first session.
                  </div>
                ) : (
                  <button
                    onClick={() => setCurrentView("setup")}
                    className="btn-gradient flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-md transition-all"
                    data-test-id="backtest-create-first-session-btn"
                  >
                    <Plus className="w-4 h-4" />
                    Create First Session
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Balance:</span>
                  {isEditingBalance ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" value={balanceInput}
                        onChange={(e) => setBalanceInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") confirmBalanceChange(); if (e.key === "Escape") setIsEditingBalance(false); }}
                        autoFocus
                        className="w-24 px-2 py-0.5 rounded border border-primary-500 outline-none text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <button onClick={confirmBalanceChange} className="px-1.5 py-0.5 rounded text-xs text-white" style={{ background: "#089981" }}>✓</button>
                      <button onClick={() => setIsEditingBalance(false)} className="px-1.5 py-0.5 rounded text-xs text-gray-500 bg-gray-100 dark:bg-gray-700">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => { setBalanceInput(balance.toFixed(2)); setIsEditingBalance(true); }} className="flex items-center gap-1 group font-mono font-semibold text-gray-900 dark:text-white hover:text-primary-600 transition-colors">
                      ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  )}
                </div>
              </div>

              {/* Feature highlights */}
              <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-5 w-full max-w-2xl">
                {[
                  { icon: Play, title: "Candle-by-candle replay", desc: "Step forward or play at speed. See exactly how price moved." },
                  { icon: Target, title: "Real positions", desc: "Place buy/sell orders with TP and SL, just like live trading." },
                  { icon: ArrowUpDown, title: "Multi-chart analysis", desc: "Compare up to 3 instruments side-by-side with synced cursor." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-left">
                    <div className="w-8 h-8 rounded-lg mb-3 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20">
                      <Icon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Sessions list ── */
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    label: "Sessions",
                    value: sessionHistory.length,
                    sub: `${completedSessions.length} completed`,
                    color: null,
                  },
                  {
                    label: "Win Rate",
                    value: winRate != null ? `${winRate}%` : "—",
                    sub: `${winningSessions} of ${completedSessions.length} profitable`,
                    color: winRate != null ? (winRate >= 50 ? "#089981" : "#f23645") : null,
                  },
                  {
                    label: "Total P&L",
                    value: completedSessions.length > 0 ? `${totalPnl >= 0 ? "+" : ""}$${Math.abs(totalPnl).toFixed(2)}` : "—",
                    sub: "across completed sessions",
                    color: completedSessions.length > 0 ? (totalPnl >= 0 ? "#089981" : "#f23645") : null,
                  },
                  {
                    label: "Account Balance",
                    value: `$${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    sub: "click to adjust",
                    color: null,
                    editable: true,
                  },
                ].map(({ label, value, sub, color, editable }) => (
                  <div key={label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{label}</p>
                    {editable && isEditingBalance ? (
                      <div className="flex items-center gap-1 mb-1">
                        <input
                          type="number" value={balanceInput}
                          onChange={(e) => setBalanceInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") confirmBalanceChange(); if (e.key === "Escape") setIsEditingBalance(false); }}
                          autoFocus
                          className="w-full px-2 py-1 rounded border border-primary-500 outline-none text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <button onClick={confirmBalanceChange} className="px-1.5 py-1 rounded text-xs text-white flex-shrink-0" style={{ background: "#089981" }}>✓</button>
                        <button onClick={() => setIsEditingBalance(false)} className="px-1.5 py-1 rounded text-xs flex-shrink-0 text-gray-500 bg-gray-100 dark:bg-gray-700">✕</button>
                      </div>
                    ) : (
                      <p
                        className={`text-xl font-bold mb-1 ${!color ? "text-gray-900 dark:text-white" : ""}`}
                        style={color ? { color } : {}}
                      >
                        {editable ? (
                          <button
                            onClick={() => { setBalanceInput(balance.toFixed(2)); setIsEditingBalance(true); }}
                            className="flex items-center gap-1 group hover:text-primary-600 transition-colors"
                          >
                            {value}
                            <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                          </button>
                        ) : value}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
                  </div>
                ))}
              </div>

              {/* Edge analytics across the whole backtest history */}
              {historyEdge.stats.total > 0 && (
                <div
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-8"
                  data-test-id="history-edge-analytics"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      <h2 className="text-base font-semibold text-gray-900 dark:text-white">Edge Analytics</h2>
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {historyEdge.stats.total} trade{historyEdge.stats.total !== 1 ? "s" : ""} across{" "}
                      {historyEdge.sessions} session{historyEdge.sessions !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Cumulative equity curve across sessions */}
                  <div
                    className="rounded-lg overflow-hidden mb-4 bg-gray-50 dark:bg-gray-900"
                    data-test-id="history-edge-equity-curve"
                  >
                    <EquityCurve
                      trades={historyEdge.trades}
                      initialBalance={historyEdge.initialBalance}
                      isDark={isDark}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      {
                        label: "Win Rate",
                        value: `${(historyEdge.stats.winRate * 100).toFixed(1)}%`,
                        color: historyEdge.stats.winRate >= 0.5 ? "#089981" : "#f23645",
                        testId: "history-edge-win-rate-value",
                      },
                      {
                        label: "Profit Factor",
                        value: historyEdge.stats.profitFactor === 0 ? "—"
                          : isFinite(historyEdge.stats.profitFactor)
                            ? historyEdge.stats.profitFactor.toFixed(2) : "∞",
                        color: historyEdge.stats.profitFactor >= 1.5 ? "#089981"
                          : historyEdge.stats.profitFactor >= 1 ? "#f7a600" : "#f23645",
                        testId: "history-edge-profit-factor-value",
                      },
                      {
                        label: "Expectancy / Trade",
                        value: `${historyEdge.stats.expectancy >= 0 ? "+" : "-"}$${Math.abs(historyEdge.stats.expectancy).toFixed(2)}`,
                        color: historyEdge.stats.expectancy >= 0 ? "#089981" : "#f23645",
                        testId: "history-edge-expectancy-value",
                      },
                      {
                        label: "Max Drawdown",
                        value: `${(historyEdge.stats.maxDD * 100).toFixed(1)}%`,
                        color: historyEdge.stats.maxDD > 0.05 ? "#f23645"
                          : historyEdge.stats.maxDD > 0 ? "#f7a600" : "#089981",
                        testId: "history-edge-max-dd-value",
                      },
                      {
                        label: "Avg Win",
                        value: historyEdge.stats.wins > 0 ? `+$${historyEdge.stats.avgWin.toFixed(2)}` : "—",
                        color: "#089981",
                        testId: "history-edge-avg-win-value",
                      },
                      {
                        label: "Avg Loss",
                        value: historyEdge.stats.losses > 0 ? `-$${historyEdge.stats.avgLoss.toFixed(2)}` : "—",
                        color: "#f23645",
                        testId: "history-edge-avg-loss-value",
                      },
                      {
                        label: "Best Trade",
                        value: isFinite(historyEdge.stats.best) ? `+$${historyEdge.stats.best.toFixed(2)}` : "—",
                        color: "#089981",
                        testId: "history-edge-best-trade-value",
                      },
                      {
                        label: "Worst Trade",
                        value: isFinite(historyEdge.stats.worst) ? `$${historyEdge.stats.worst.toFixed(2)}` : "—",
                        color: "#f23645",
                        testId: "history-edge-worst-trade-value",
                      },
                    ].map(({ label, value, color, testId }) => (
                      <div key={label} className="rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{label}</p>
                        <p className="text-sm font-bold" style={{ color }} data-test-id={testId}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Session cards */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Recent Sessions</h2>
                <span className="text-xs text-gray-400 dark:text-gray-500">{sessionHistory.length} session{sessionHistory.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {pagedSessions.map((s) => {
                  // Mobile gets a purpose-built stacked card; desktop keeps the
                  // exact row layout below, untouched.
                  if (isMobile) {
                    return (
                      <MobileSessionCard
                        key={s.id}
                        session={s}
                        onOpen={(sess) => setHistoryModal({ ...sess, trades: sess.trades || [] })}
                        onPlay={(sess) => setChartModalSession(sess)}
                      />
                    );
                  }
                  const sessionPnl = s.endingBalance != null ? s.endingBalance - s.initialBalance : null;
                  const pnlPositive = sessionPnl != null && sessionPnl >= 0;
                  const completed = s.endingBalance != null;
                  const hasTrades = (s.trades?.length ?? 0) > 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => setHistoryModal({ ...s, trades: s.trades || [] })}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 sm:gap-4 cursor-pointer transition-all hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 group"
                    >
                      {/* Left accent bar */}
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ background: !completed ? "#d1d4dc" : pnlPositive ? "#089981" : "#f23645", minHeight: 40 }}
                      />

                      {/* Symbol chip */}
                      <div
                        className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300"
                      >
                        {s.symbol ?? "—"}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {[s.instrumentName, s.timeframe?.toUpperCase(), s.strategy, s.setup].filter(Boolean).join(" · ")}
                        </p>
                        {s.note && (
                          <NoteView
                            html={s.note}
                            clamp={2}
                            className="mt-1 text-xs"
                            testId={`session-card-note-${s.id}`}
                          />
                        )}
                        {s.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
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
                      </div>

                      {/* Date */}
                      <div className="text-right hidden sm:block flex-shrink-0">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(s.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        {!completed && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">In progress</p>}
                      </div>

                      {/* P&L */}
                      <div className="text-right flex-shrink-0 min-w-[80px]">
                        {sessionPnl != null ? (
                          <>
                            <p className={`text-base font-bold ${pnlPositive ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                              {pnlPositive ? "+" : ""}${sessionPnl.toFixed(2)}
                            </p>
                            <p className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              ${s.initialBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 })} → ${s.endingBalance?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500">No result</p>
                        )}
                      </div>

                      {/* Play — opens the static chart replay in a modal */}
                      {hasTrades && (
                        <button
                          data-test-id={`session-card-play-btn-${s.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setChartModalSession(s);
                          }}
                          className="flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-900/40 dark:text-primary-300 dark:hover:bg-primary-900/60 transition-colors"
                          aria-label="Play session chart"
                          title="Replay session"
                        >
                          <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                        </button>
                      )}

                      <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-400 flex-shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>

              {/* Pagination — only when the list spills past a single page */}
              {sessionPageCount > 1 && (
                <div
                  data-test-id="sessions-pagination"
                  className="flex items-center justify-center gap-2 mt-4"
                >
                  <button
                    data-test-id="sessions-page-prev-btn"
                    onClick={() => setSessionsPage((p) => Math.max(0, p - 1))}
                    disabled={sessionsPage === 0}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {isMobile ? (
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-2 tabular-nums">
                      {sessionsPage + 1} / {sessionPageCount}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: sessionPageCount }, (_, i) => (
                        <button
                          key={i}
                          data-test-id={`sessions-page-btn-${i + 1}`}
                          onClick={() => setSessionsPage(i)}
                          className={`min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-colors ${
                            i === sessionsPage
                              ? "bg-primary-600 text-white"
                              : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    data-test-id="sessions-page-next-btn"
                    onClick={() => setSessionsPage((p) => Math.min(sessionPageCount - 1, p + 1))}
                    disabled={sessionsPage >= sessionPageCount - 1}
                    className="flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {historyModal && (
        <HistoryModal
          key={historyModal.id}
          session={historyModal}
          onClose={() => setHistoryModal(null)}
          onSave={handleSaveSessionMeta}
          tagSuggestions={tagSuggestions}
        />
      )}
      {chartModalSession && (
        <ModalPortal>
        <div
          data-test-id="history-chart-modal"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
          onClick={() => setChartModalSession(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{chartModalSession.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {[chartModalSession.instrumentName, chartModalSession.strategy, chartModalSession.setup]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {chartModalSession.note && (
                  <NoteView
                    html={chartModalSession.note}
                    clamp={3}
                    className="mt-2 max-w-2xl"
                    testId="history-chart-modal-note"
                  />
                )}
              </div>
              <button
                data-test-id="history-chart-modal-close-btn"
                onClick={() => setChartModalSession(null)}
                className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
                aria-label="Close chart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto">
              <HistorySessionChart key={chartModalSession.id} session={chartModalSession} autoOpen />
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
      </>
    );
  }

  if (currentView === "setup") {
    return (
      <>
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => setCurrentView("sessions")}
              className="flex items-center text-primary-600 hover:text-primary-700 mb-4"
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
              Back to Sessions
            </button>
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Create Backtest Session
              </h1>
              <div className="group relative">
                <Info className="w-5 h-5 text-gray-400 hover:text-primary-500 cursor-help" />
                <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  Configure your backtesting environment and strategy.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Header Section */}
            <div className="bg-primary-600 dark:bg-primary-700 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold">Session Configuration</h2>
            </div>

            <div className="p-8 space-y-8">
              {/* Session Name & Template Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Session Name */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Session Details
                    </h3>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Name *
                    </label>
                    <input
                      type="text"
                      value={sessionName}
                      onChange={(e) => setSessionName(e.target.value)}
                      placeholder="e.g., ES Scalping Test, AAPL Swing Analysis"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                {/* Template Quick Setup */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Quick Setup
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Optional
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Use Template
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help" />
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          Auto-fill this form from a saved template. Templates are stored on your account and available across all devices — create or edit them in Settings.
                        </div>
                      </div>
                    </div>
                    <select
                      value={selectedTemplateId}
                      disabled={templatesLoading}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        if (e.target.value) {
                          applyTemplate(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-60"
                    >
                      <option value="">
                        {templatesLoading
                          ? "Loading templates..."
                          : settingsTemplates.length === 0
                          ? "No templates — create one in Settings"
                          : "Choose a template to auto-fill..."}
                      </option>
                      {settingsTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Market & Instrument Selection */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Globe className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Market & Instrument
                  </h3>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Market Type *
                    </label>
                    <select
                      value={selectedMarket}
                      onChange={(e) => {
                        setSelectedMarket(e.target.value);
                        setSelectedInstruments([]);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors"
                    >
                      <option value="">Select Market Type</option>
                      {Object.entries(MARKET_CONFIG).map(([key, market]) => (
                        <option key={key} value={key}>
                          {market.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Instruments *
                        </label>
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help" />
                          <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                            Select up to 3 assets at a time — each opens in its own chart window.
                          </div>
                        </div>
                      </div>
                      {selectedInstruments.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedInstruments([])}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {!selectedMarket ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 italic py-3">
                        Select a market type first
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {MARKET_CONFIG[selectedMarket].instruments.map((instrument) => {
                          const isSelected = selectedInstruments.includes(instrument.symbol);
                          return (
                            <button
                              key={instrument.symbol}
                              type="button"
                              onClick={() =>
                                setSelectedInstruments((prev) => {
                                  if (isSelected) return prev.filter((s) => s !== instrument.symbol);
                                  if (prev.length >= 3) return prev; // max 3 assets
                                  return [...prev, instrument.symbol];
                                })
                              }
                              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                isSelected
                                  ? "bg-primary-600 text-white border-primary-600 dark:bg-primary-500 dark:border-primary-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:text-primary-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-primary-400"
                              }`}
                            >
                              {instrument.symbol}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {selectedInstruments.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {`Selected: ${selectedInstruments.join(", ")}${selectedInstruments.length >= 3 ? " · Max 3 reached" : ""}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trading Strategy & Setup */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Strategy className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Trading Strategy
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Strategy *
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-primary-500 cursor-help" />
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          Select your trading strategy. This helps categorize
                          and analyze your backtest results based on the trading
                          approach you're testing.
                        </div>
                      </div>
                    </div>
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    >
                      <option value="">Select a strategy</option>
                      {userStrategies.map((strat) => (
                        <option key={strat} value={strat}>
                          {strat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Setup *
                    </label>
                    <select
                      value={setup}
                      onChange={(e) => setSetup(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    >
                      <option value="">Select a setup</option>
                      {userSetups.map((setupItem) => (
                        <option key={setupItem} value={setupItem}>
                          {setupItem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Date Range
                  </h3>
                </div>
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    How far back to test
                  </label>
                  <div className="flex flex-wrap gap-2" data-test-id="date-range-presets">
                    {DATE_RANGE_PRESETS.map(({ key, label }) => {
                      const isActive = dateRangePreset === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          data-test-id={`date-range-preset-${key}`}
                          onClick={() => applyDateRangePreset(key)}
                          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                            isActive
                              ? "bg-primary-600 text-white border-primary-600 dark:bg-primary-500 dark:border-primary-500"
                              : "bg-white text-gray-700 border-gray-300 hover:border-primary-400 hover:text-primary-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-primary-400"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {dateRangePreset === "custom" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Date
                        </label>
                        <input
                          type="date"
                          data-test-id="date-range-start-input"
                          value={startDate}
                          max={endDate || undefined}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Date
                        </label>
                        <input
                          type="date"
                          data-test-id="date-range-end-input"
                          value={endDate}
                          min={startDate || undefined}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-gray-500 dark:text-gray-400" data-test-id="date-range-preview">
                    Testing{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">{formatRangeDate(startDate)}</span>
                    {" → "}
                    <span className="font-semibold text-gray-900 dark:text-white">{formatRangeDate(endDate)}</span>
                  </p>
                </div>
              </div>

              {/* Create Button */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex justify-center">
                  <button
                    onClick={handleCreateSession}
                    disabled={
                      !sessionName ||
                      !selectedMarket ||
                      selectedInstruments.length === 0 ||
                      !strategy ||
                      !setup
                    }
                    className="btn-gradient flex items-center justify-center px-8 py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Create Session & Start Backtesting
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PlanLimitModal
        open={!!sessionLimitInfo}
        onClose={() => setSessionLimitInfo(null)}
        title="Backtest session limit reached"
        message={`Your plan includes ${maxBacktestSessions} saved backtest sessions. Upgrade to run more.`}
        used={sessionLimitInfo?.used ?? 0}
        max={sessionLimitInfo?.max ?? maxBacktestSessions}
        upgradeLabel={upgradeLabel}
        testId="backtest-limit-modal"
      />
      </>
    );
  }

  if (currentView === "backtest" && currentSession) {
    const pnl = balance - (currentSession.initialBalance || 10000);
    const pnlPositive = pnl >= 0;

    // ── Theme color helpers ──
    const theme = {
      bg:        isDark ? "#131722" : "#f0f3fa",
      surface:   isDark ? "#1e222d" : "#ffffff",
      border:    isDark ? "#2a2e39" : "#e1ecf2",
      text:      isDark ? "#d1d4dc" : "#131722",
      textMuted: isDark ? "#787b86" : "#787b86",
      textFaint: isDark ? "#363c4e" : "#b2b5be",
      up:        "#089981",
      down:      "#f23645",
    };

    return (
      <>
      {/* Fills the viewport below the 64px app header at any resolution
          (HD, 4K, ...). The shell wraps pages in a plain block div, so
          `flex-1` has no flex parent here and never stretched — an explicit
          viewport height is what makes the inner flex chain (and the
          autoSize'd chart) actually fill the screen. Negative margins cancel
          the shell's p-6 padding; in fullscreen mode the browser's
          `:fullscreen` min-height:100% takes over. */}
      <div
        ref={chartContainerRef}
        className="-m-4 sm:-m-6 h-[calc(100vh-4rem)] flex flex-col overflow-hidden"
        style={{ background: theme.bg, color: theme.text }}
      >
        {/* ── Top bar — TradingView light toolbar style ── */}
        <div
          className="relative flex items-center justify-between px-4 py-1.5 flex-shrink-0 border-b"
          style={{ background: theme.surface, borderColor: theme.border }}
        >
          <div className="flex items-center space-x-4 min-w-0">
            <button
              onClick={() => {
                if (currentSession) {
                  saveSessionResults("completed");
                  // A session with no trades was deleted from the DB — drop it
                  // from the visible history too
                  setSessionHistory((prev) =>
                    trades.length === 0
                      ? prev.filter((s) => s.id !== currentSession.id)
                      : prev.map((s) =>
                          s.id === currentSession.id ? { ...s, endingBalance: balance, trades } : s
                        )
                  );
                  // Clear the session so the unmount/pagehide save doesn't
                  // flip the status back to "running"
                  setCurrentSession(null);
                  currentSessionRef.current = null;
                }
                setCurrentView("sessions");
              }}
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded transition-colors flex-shrink-0"
              style={{
                color: isDark ? "#7fd1c2" : "#147065",
                background: isDark ? "rgba(42,157,143,0.15)" : "#dcefeb",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = isDark ? "rgba(42,157,143,0.25)" : "#b9e6db")}
              onMouseLeave={(e) => (e.currentTarget.style.background = isDark ? "rgba(42,157,143,0.15)" : "#dcefeb")}
            >
              ← Sessions
            </button>
            <div className="h-4 w-px flex-shrink-0" style={{ background: theme.border }} />
            <div className="flex items-center gap-1.5 min-w-0">
              {/* Search icon — always visible; changes chart 1 directly in single-instrument sessions */}
              <div ref={chartSearchOpen ? searchDropdownRef : null} style={{ position: "relative" }}>
                <button
                  onClick={() => { setChartSearchOpen((v) => v ? null : 1); setAssetSearchQuery(""); }}
                  title={`Change asset for Chart ${activeChart}`}
                  className="flex items-center justify-center w-5 h-5 rounded transition-colors"
                  style={{ color: chartSearchOpen ? "#1E53E5" : theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#1E53E5")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = chartSearchOpen ? "#1E53E5" : theme.textMuted)}
                >
                  <Search className="w-3 h-3" />
                </button>
                {chartSearchOpen && (
                  <div className="absolute left-0 top-full mt-1 rounded-lg shadow-xl border z-50 overflow-hidden" style={{ background: theme.surface, borderColor: theme.border, width: 260 }}>
                    <div className="px-3 pt-2.5 pb-2 border-b" style={{ borderColor: theme.border }}>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: "#b2b5be" }}>
                        {`Chart ${activeChart} — ${
                          activeChart === 1 ? currentSession.instrument?.symbol :
                          activeChart === 2 ? (chart2Symbol ?? "empty") :
                          (chart3Symbol ?? "empty")
                        }`}
                      </p>
                      <input
                        autoFocus type="text"
                        placeholder={
                          activeChart === 1
                            ? "Change this window's instrument…"
                            : "Search instrument…"
                        }
                        value={assetSearchQuery}
                        onChange={(e) => setAssetSearchQuery(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                        style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}
                      />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                      {filteredInstruments.length === 0
                        ? <p className="text-xs px-3 py-3" style={{ color: "#b2b5be" }}>No results</p>
                        : filteredInstruments.map((inst) => (
                          <button
                            key={`${inst.market}-${inst.symbol}`}
                            onClick={() => handleAssetSearchSelectFor(activeChart, inst.market, inst.symbol)}
                            className="w-full flex items-center px-3 py-2 text-left gap-2 transition-colors"
                            style={{ background: "transparent" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <span className="text-xs font-bold w-10 flex-shrink-0" style={{ color: theme.text }}>{inst.symbol}</span>
                            <span className="text-xs truncate flex-1" style={{ color: theme.textMuted }}>{inst.name}</span>
                            <span className="text-xs flex-shrink-0" style={{ color: "#b2b5be" }}>{inst.marketName}</span>
                          </button>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* All loaded asset symbols — active window's symbol is highlighted */}
              {[
                { chart: 1, symbol: currentSession.instrument?.symbol },
                ...(chart2Symbol ? [{ chart: 2, symbol: chart2Symbol }] : []),
                ...(chart3Symbol ? [{ chart: 3, symbol: chart3Symbol }] : []),
              ].map(({ chart, symbol }, i) => (
                <span key={chart} className="flex items-center gap-1">
                  {i > 0 && <span className="text-xs select-none" style={{ color: theme.border }}>|</span>}
                  <span
                    className="font-bold text-sm"
                    style={{ color: activeChart === chart ? theme.text : theme.textMuted }}
                  >
                    {symbol}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* ── Center: replay controls — Formation / Prev / Play / Speed / Next / Bar replay / Seek date ── */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-0.5" style={{ marginLeft: -28 }}>
            {/* Bar magnifier — replay each chart-TF candle building from lower-TF
                steps (e.g. watch a 4H candle form from 30M sub-candles) */}
            <div
              className="flex items-center gap-0.5 flex-shrink-0 rounded border pl-1"
              style={{
                borderColor: formTf ? "#1E53E5" : "#d1d4dc",
                background: formTf ? "#e8f0fe" : theme.surface,
                opacity: (isLoadingData || isLoadingFormData || !chartData.length) ? 0.4 : 1,
              }}
              title="Build candles — watch each candle form from a lower timeframe (e.g. a 4H candle building in 30M steps)"
            >
              <Layers className="w-3 h-3 flex-shrink-0" style={{ color: formTf ? "#1E53E5" : theme.textMuted }} />
              <select
                data-test-id="backtest-form-tf-select"
                value={formTf ?? ""}
                onChange={(e) => handleFormTfChange(e.target.value || null)}
                disabled={isLoadingData || isLoadingFormData || !chartData.length}
                className="text-[10px] py-0.5 pr-1 bg-transparent outline-none disabled:cursor-not-allowed"
                style={{ color: formTf ? "#1E53E5" : theme.textMuted, fontWeight: formTf ? 600 : 400 }}
              >
                <option value="">Build: off</option>
                {ALL_TIMEFRAMES
                  .filter((tf) => TF_MINUTES[tf] < (TF_MINUTES[timeframe] ?? 0) && TF_MINUTES[timeframe] % TF_MINUTES[tf] === 0)
                  .map((tf) => (
                    <option key={tf} value={tf}>Build: {tf.toUpperCase()}</option>
                  ))}
              </select>
            </div>
            <button
              data-test-id="backtest-prev-btn"
              onClick={handleStepBack}
              disabled={isLoadingData || !chartData.length || currentCandle <= 0}
              title="Previous candle"
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded transition-colors disabled:opacity-40 flex-shrink-0 font-medium"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.text;
                e.currentTarget.style.background = theme.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.textMuted;
                e.currentTarget.style.background = "transparent";
              }}
            >
              <SkipBack className="w-3 h-3" />
              Prev
            </button>
            <button
              data-test-id="backtest-play-btn"
              onClick={handlePlay}
              disabled={isLoadingData || !chartData.length || (!isPlaying && currentCandle >= chartData.length - 1)}
              title={isPlaying ? "Pause" : currentCandle >= chartData.length - 1 ? "At last candle — use the date picker or Prev to rewind" : "Play forward"}
              className="flex items-center px-2.5 py-0.5 text-[10px] rounded font-medium transition-colors disabled:opacity-40 flex-shrink-0"
              style={{ background: "#1E53E5", color: "#ffffff" }}
            >
              {isPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            </button>
            <button
              data-test-id="backtest-next-btn"
              onClick={handleStepForward}
              disabled={isLoadingData || !chartData.length || currentCandle >= chartData.length - 1}
              title="Next candle"
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded transition-colors disabled:opacity-40 flex-shrink-0 font-medium"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme.text;
                e.currentTarget.style.background = theme.bg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme.textMuted;
                e.currentTarget.style.background = "transparent";
              }}
            >
              Next
              <SkipForward className="w-3 h-3" />
            </button>
            <select
              data-test-id="backtest-speed-select"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              title="Playback speed"
              className="text-[10px] rounded px-1 py-0.5 border flex-shrink-0 outline-none"
              style={{ background: theme.surface, color: theme.text, borderColor: "#d1d4dc" }}
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
              <option value={8}>8×</option>
            </select>
            <button
              data-test-id="backtest-bar-replay-btn"
              onClick={() => setBarReplayMode((v) => !v)}
              disabled={isLoadingData || !chartData.length}
              title={barReplayMode ? "Bar replay ON — click chart to seek" : "Bar replay — click to activate, then click chart to seek"}
              className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors disabled:opacity-40 flex-shrink-0"
              style={{
                background: barReplayMode ? "#e8f0fe" : "transparent",
                color: barReplayMode ? "#1E53E5" : theme.textMuted,
                border: barReplayMode ? "1px solid #1E53E5" : "1px solid transparent",
              }}
            >
              <Crosshair className="w-3 h-3" />
              {barReplayMode ? <span>Replay ON</span> : <span>Replay</span>}
            </button>

            {/* Seek to date — calendar toggle opens a dropdown with the date picker + Cut */}
            <div ref={seekDatePickerRef} className="relative flex-shrink-0">
              <button
                data-test-id="backtest-seek-date-btn"
                onClick={() => setShowSeekDatePicker((v) => !v)}
                disabled={isLoadingData || !chartData.length}
                title="Go to date — cut the chart at a date for replay"
                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded font-medium transition-colors disabled:opacity-40"
                style={{
                  background: showSeekDatePicker ? "#e8f0fe" : "transparent",
                  color: showSeekDatePicker ? "#1E53E5" : theme.textMuted,
                  border: showSeekDatePicker ? "1px solid #1E53E5" : "1px solid transparent",
                }}
              >
                <Calendar className="w-3 h-3" />
                Date
              </button>
              {showSeekDatePicker && (
                <div
                  data-test-id="backtest-seek-date-dropdown"
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 flex items-center gap-1.5 rounded-lg shadow-xl border px-2.5 py-2"
                  style={{ background: theme.surface, borderColor: theme.border }}
                >
                  <input
                    data-test-id="backtest-seek-date-input"
                    type="date"
                    value={seekDate}
                    onChange={(e) => setSeekDate(e.target.value)}
                    className="text-xs rounded px-1.5 py-0.5 border outline-none"
                    style={{
                      background: theme.surface,
                      color: theme.text,
                      borderColor: "#d1d4dc",
                      width: 120,
                    }}
                  />
                  <button
                    data-test-id="backtest-cut-btn"
                    onClick={() => { handleCut(); setShowSeekDatePicker(false); }}
                    disabled={isLoadingData || !chartData.length || !seekDate}
                    title="Cut chart at selected date — hides future candles for replay"
                    className="flex items-center gap-1 px-2 py-1 text-xs rounded font-medium transition-colors disabled:opacity-40 flex-shrink-0"
                    style={{ background: "#f23645", color: "#ffffff" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#d42c3a";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f23645";
                    }}
                  >
                    <Scissors className="w-3 h-3" />
                    Cut
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs flex-shrink-0">
            {/* Balance — click to edit, shows warning before saving */}
            {isEditingBalance ? (
              <div className="flex items-center gap-1">
                <span style={{ color: theme.textMuted }}>Balance</span>
                <input
                  type="number"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmBalanceChange();
                    if (e.key === "Escape") setIsEditingBalance(false);
                  }}
                  autoFocus
                  className="w-24 px-1.5 py-0.5 rounded border outline-none text-xs font-mono"
                  style={{ background: theme.bg, borderColor: "#1E53E5", color: theme.text }}
                />
                <button
                  onClick={confirmBalanceChange}
                  className="px-1.5 py-0.5 rounded text-xs font-bold"
                  style={{ background: "#089981", color: "#fff" }}
                >✓</button>
                <button
                  onClick={() => setIsEditingBalance(false)}
                  className="px-1.5 py-0.5 rounded text-xs"
                  style={{ background: theme.border, color: theme.textMuted }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setBalanceInput(balance.toFixed(2)); setIsEditingBalance(true); }}
                title="Click to adjust account balance"
                className="flex items-center gap-1 rounded px-1 py-0.5 transition-colors group"
                style={{ color: theme.textMuted }}
                onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>Balance</span>
                <span className="font-semibold" style={{ color: theme.text }}>
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            )}
            <div>
              <span style={{ color: theme.textMuted }}>P&amp;L </span>
              <span className="font-semibold" style={{ color: pnlPositive ? "#089981" : "#f23645" }}>
                {pnlPositive ? "+" : ""}${trimPrice(pnl)}
              </span>
            </div>
            {/* Buy / Sell buttons — in the top bar */}
            {!isLoadingData && chartData.length > 0 && (
              <>
                <button
                  onClick={() => openOrderPanel("buy")}
                  className="px-3 py-1 rounded text-xs font-bold transition-colors ml-1.5"
                  style={{ background: "#089981", color: "#fff" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#067a68")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#089981")}
                >
                  <TrendingUp className="w-3 h-3 inline mr-1" />
                  Buy
                </button>
                <button
                  onClick={() => openOrderPanel("sell")}
                  className="px-3 py-1 rounded text-xs font-bold transition-colors"
                  style={{ background: "#f23645", color: "#fff" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#c42c3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "#f23645")}
                >
                  <TrendingDown className="w-3 h-3 inline mr-1" />
                  Sell
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Chart toolbar — TradingView-style light toolbar ── */}
        {/* Outer: flex row, fixed height. Left part scrolls; right part (layout btn) never scrolls so its dropdown isn't clipped. */}
        <div
          className="flex items-stretch flex-shrink-0 border-b"
          style={{ background: theme.surface, borderColor: theme.border }}
        >
        <div
          className="flex items-center px-3 py-1 overflow-x-auto flex-1 min-w-0"
          style={{ gap: "2px" }}
        >
          {/* Timeframe buttons — context-aware: applies to the active chart window */}
          {(() => {
            const activeTf = activeChart === 2 ? chart2Timeframe : activeChart === 3 ? chart3Timeframe : timeframe;
            const isLoading = activeChart === 2 ? isLoadingData2 : activeChart === 3 ? isLoadingData3 : isLoadingData;
            return favTimeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => handleActiveTfChange(tf)}
                disabled={isLoading}
                className="px-2 py-1 text-xs rounded-sm transition-colors disabled:opacity-40 font-medium flex-shrink-0"
                style={
                  activeTf === tf
                    ? { background: "#e8f0fe", color: "#1E53E5", borderRadius: 3 }
                    : { color: theme.textMuted }
                }
                onMouseEnter={(e) => {
                  if (activeTf !== tf) {
                    e.currentTarget.style.color = theme.text;
                    e.currentTarget.style.background = theme.bg;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTf !== tf) {
                    e.currentTarget.style.color = theme.textMuted;
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {tf === "1d" ? "D" : tf === "1w" ? "W" : tf === "1M" ? "M" : tf === "3d" ? "3D" : tf.toUpperCase()}
              </button>
            ));
          })()}
          <div className="h-4 w-px mx-2 flex-shrink-0" style={{ background: theme.border }} />

          {/* Indicators button + dropdown (dropdown is fixed-positioned so the
              scrollable toolbar's overflow can't clip it) */}
          <div className="relative flex-shrink-0" ref={indicatorPanelRef}>
            <button
              onClick={() => setShowIndicatorPanel((v) => !v)}
              className="flex items-center px-2 py-1 text-xs rounded-sm transition-colors font-medium"
              style={
                showIndicatorPanel
                  ? { background: "#e8f0fe", color: "#1E53E5", borderRadius: 3 }
                  : { color: theme.textMuted }
              }
              onMouseEnter={(e) => {
                if (!showIndicatorPanel) {
                  e.currentTarget.style.color = theme.text;
                  e.currentTarget.style.background = theme.bg;
                }
              }}
              onMouseLeave={(e) => {
                if (!showIndicatorPanel) {
                  e.currentTarget.style.color = theme.textMuted;
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              Indicators
              <svg className="ml-1 w-3 h-3" viewBox="0 0 10 6" fill="currentColor">
                <path d="M0 0l5 6 5-6z" />
              </svg>
            </button>

            {showIndicatorPanel && (() => {
              const anchor = indicatorPanelRef.current?.getBoundingClientRect();
              return (
              <div
                className="fixed rounded-lg shadow-xl border z-50 py-2 min-w-[200px]"
                style={{
                  background: theme.surface,
                  borderColor: theme.border,
                  top: (anchor?.bottom ?? 0) + 4,
                  left: anchor?.left ?? 0,
                }}
              >
                <p
                  className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider border-b"
                  style={{ color: "#b2b5be", borderColor: theme.border }}
                >
                  Add Indicator
                </p>

                {[
                  { key: "ema20",  label: "EMA 20",  desc: "Exponential MA · 20 period", color: "#f7a600" },
                  { key: "ema50",  label: "EMA 50",  desc: "Exponential MA · 50 period", color: "#1E53E5" },
                  { key: "volume", label: "Volume",  desc: "Bar volume histogram",        color: "#089981" },
                ].map(({ key, label, desc, color }) => (
                  <button
                    key={key}
                    onClick={() => toggleIndicator(key)}
                    className="w-full flex items-center px-3 py-2.5 text-left transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Color swatch / checkmark */}
                    <span
                      className="flex items-center justify-center w-5 h-5 rounded mr-3 flex-shrink-0 text-xs font-bold"
                      style={{
                        background: indicators[key] ? color : theme.bg,
                        color: indicators[key] ? "#fff" : "#b2b5be",
                      }}
                    >
                      {indicators[key] ? "✓" : ""}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span
                        className="block text-xs font-semibold"
                        style={{ color: indicators[key] ? color : theme.text }}
                      >
                        {label}
                      </span>
                      <span className="block text-xs" style={{ color: "#b2b5be" }}>
                        {desc}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              );
            })()}
          </div>

          {/* Undo / Redo — to the right of Indicators, slightly spaced out */}
          <button
            data-test-id="backtest-undo-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo last drawing"
            className="flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors disabled:opacity-30 flex-shrink-0 ml-3"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => { if (canUndo) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; } }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            data-test-id="backtest-redo-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo drawing"
            className="flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors disabled:opacity-30 flex-shrink-0 ml-1"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => { if (canRedo) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; } }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

        </div>{/* end scrollable toolbar */}

          {/* ── Add/remove timeframe favorites — outside overflow so dropdown is never clipped ── */}
          <div ref={tfPickerRef} className="flex items-center flex-shrink-0 border-l px-2" style={{ borderColor: theme.border, position: "relative" }}>
            <button
              disabled
              title="Additional timeframes coming soon"
              className="flex items-center justify-center w-5 h-5 rounded cursor-not-allowed"
              style={{ color: theme.textMuted, opacity: 0.35 }}
            >
              <Plus className="w-3 h-3" />
            </button>
            {tfPickerOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-lg shadow-xl border z-50 overflow-hidden"
                style={{ background: theme.surface, borderColor: theme.border, width: 200 }}
              >
                <div className="px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: theme.border }}>
                  <p className="text-xs font-semibold" style={{ color: "#b2b5be" }}>Timeframe favorites</p>
                  <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>Click to add or remove</p>
                </div>
                <div className="py-1 max-h-56 overflow-y-auto">
                  {ALL_TIMEFRAMES.map((tf) => {
                    const isFav = favTimeframes.includes(tf);
                    return (
                      <button
                        key={tf}
                        onClick={() => setFavTimeframes((prev) =>
                          isFav
                            ? prev.filter((t) => t !== tf)
                            : [...prev, tf].sort((a, b) => ALL_TIMEFRAMES.indexOf(a) - ALL_TIMEFRAMES.indexOf(b))
                        )}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors"
                        style={{ color: isFav ? "#1E53E5" : theme.text, background: "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <span className="font-medium">
                          {tf === "1d" ? "1D" : tf === "1w" ? "1W" : tf === "1M" ? "1M" : tf === "3d" ? "3D" : tf.toUpperCase()}
                        </span>
                        {isFav && <Check className="w-3 h-3 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Far-right: Window layout button — outside overflow-x-auto so dropdown is never clipped ── */}
          <div className="flex items-center gap-1 flex-shrink-0 px-2 border-l" style={{ borderColor: theme.border }}>

            {/* Single window layout button — always active, just shows current layout icon */}
            {(() => {
              const layoutIcons = {
                single: (
                  <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                    <rect x="1" y="1" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                ),
                "2col": (
                  <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                    <rect x="1" y="1" width="5.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="8.5" y="1" width="5.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                ),
                "3col": (
                  <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                    <rect x="1"    y="1" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="5.75" y="1" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="10.5" y="1" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                ),
              };
              const anySyncOn = syncCursor || syncTimeframe;
              return (
                <div className="relative flex-shrink-0" ref={layoutMenuRef}>
                  <button
                    onClick={() => setShowLayoutMenu((v) => !v)}
                    title="Window layout & sync settings"
                    className="flex items-center gap-1 px-2 h-7 rounded transition-colors relative"
                    style={{
                      color: (showLayoutMenu || anySyncOn) ? "#1E53E5" : theme.textMuted,
                      background: (showLayoutMenu || anySyncOn) ? "#e8f0fe" : "transparent",
                      border: (showLayoutMenu || anySyncOn) ? "1px solid #c7d7fb" : "1px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!showLayoutMenu && !anySyncOn) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; } }}
                    onMouseLeave={(e) => { if (!showLayoutMenu && !anySyncOn) { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; } }}
                  >
                    {layoutIcons[chartLayout]}
                    <ChevronDown className="w-3 h-3" />
                    {anySyncOn && (
                      <span
                        className="absolute top-0.5 right-0.5 rounded-full"
                        style={{ width: 5, height: 5, background: "#1E53E5" }}
                      />
                    )}
                  </button>

                  {showLayoutMenu && (
                    <div
                      className="absolute right-0 top-full mt-1 rounded-lg shadow-xl border z-50 py-1.5"
                      style={{ background: theme.surface, borderColor: theme.border, minWidth: 230 }}
                    >
                      {/* Layout selection row */}
                      <p className="px-3 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color: "#b2b5be" }}>
                        Layout
                      </p>
                      <div className="flex items-center gap-1 px-3 pb-2">
                        {[
                          {
                            layout: "single",
                            label: "1 Window",
                            enabled: true,
                            icon: (
                              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                                <rect x="1" y="1" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            ),
                          },
                          {
                            layout: "2col",
                            label: "2 Windows",
                            enabled: chartData2.length > 0,
                            icon: (
                              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                                <rect x="1" y="1" width="5.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                                <rect x="8.5" y="1" width="5.5" height="9" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            ),
                          },
                          {
                            layout: "3col",
                            label: "3 Windows",
                            enabled: chartData3.length > 0,
                            icon: (
                              <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                                <rect x="1"    y="1" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                                <rect x="5.75" y="1" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                                <rect x="10.5" y="1" width="3.5" height="9" rx="0.8" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            ),
                          },
                        ].map(({ layout, label, enabled, icon }) => {
                          const active = chartLayout === layout;
                          return (
                            <button
                              key={layout}
                              onClick={() => enabled && setChartLayout(layout)}
                              title={enabled ? label : `Load ${layout === "2col" ? "a second" : "a third"} asset first`}
                              disabled={!enabled}
                              className="flex flex-col items-center gap-1 flex-1 py-2 rounded transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                              style={{
                                color: active ? "#1E53E5" : theme.textMuted,
                                background: active ? "#e8f0fe" : "transparent",
                                border: active ? "1px solid #c7d7fb" : "1px solid transparent",
                              }}
                              onMouseEnter={(e) => { if (!active && enabled) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; } }}
                              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.color = active ? "#1E53E5" : theme.textMuted; e.currentTarget.style.background = active ? "#e8f0fe" : "transparent"; } }}
                            >
                              {icon}
                              <span className="text-xs" style={{ fontSize: 10 }}>{label}</span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="mx-3 mb-1.5" style={{ height: 1, background: theme.border }} />

                      {/* Sync toggles */}
                      <p className="px-3 pt-0.5 pb-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "#b2b5be" }}>
                        Sync
                      </p>
                      {[
                        { key: "syncCursor", label: "Sync cursor & cut", desc: "All windows follow the same candle", value: syncCursor, set: setSyncCursor },
                        { key: "syncTimeframe", label: "Sync timeframe", desc: "Changing TF updates all windows", value: syncTimeframe, set: setSyncTimeframe },
                        { key: "syncDrag", label: "Sync drag & zoom", desc: "Panning one window pans all others", value: syncDrag, set: setSyncDrag },
                      ].map(({ key, label, desc, value, set }) => (
                        <button
                          key={key}
                          onClick={() => set((v) => !v)}
                          className="w-full flex items-center px-3 py-2 gap-3 text-left transition-colors"
                          style={{ background: "transparent" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div
                            className="relative flex-shrink-0 rounded-full transition-colors"
                            style={{ width: 28, height: 16, background: value ? "#1E53E5" : theme.border }}
                          >
                            <div
                              className="absolute top-0.5 rounded-full"
                              style={{
                                width: 12, height: 12,
                                background: "#fff",
                                left: value ? 14 : 2,
                                transition: "left 0.15s",
                                boxShadow: "0 1px 2px rgba(0,0,0,.25)",
                              }}
                            />
                          </div>
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-medium" style={{ color: theme.text }}>{label}</span>
                            <span className="block text-xs" style={{ color: "#b2b5be" }}>{desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Chart appearance settings button */}
            <button
              onClick={() => setShowChartSettings(true)}
              title="Chart appearance (candle colors, background)"
              className="flex items-center gap-1 px-2 h-7 rounded transition-colors flex-shrink-0"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>{/* end outer toolbar */}

        {/* ── Main content: chart + side panel ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Inner row: [drawing toolbar | chart area] — relative so order panel can float across all chart windows */}
            <div ref={innerRowRef} className="flex-1 flex overflow-hidden relative">

              {/* Drawing toolbar — always visible, TradingView-style left panel */}
              {(() => {
                const ALL_DRAW_TOOLS = BACKTEST_DRAW_TOOLS;
                const ToolBtn = ({ mode, Icon, title, label }) => {
                  // Only highlight from the left panel — not when the same tool was activated via the floating bar
                  const active = drawingMode === mode && drawingModeSource !== "floating";
                  const faved = favDrawingTools.includes(mode);
                  return (
                    <div className="relative group" style={{ width: 42 }}>
                      <button
                        onClick={() => { setDrawingMode(mode); setDrawingModeSource("panel"); setSelectedDrawingIds([]); }}
                        title={title}
                        style={{
                          width: 42, height: 36,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          borderRadius: 5,
                          background: active ? "#e8f0fe" : "transparent",
                          color: active ? "#1E53E5" : theme.textMuted,
                          fontSize: 9, fontWeight: 700, letterSpacing: "-0.5px",
                          border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                        }}
                        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.text; }}}
                        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; }}}
                      >
                        {Icon ? <Icon style={{ width: 16, height: 16 }} /> : label}
                      </button>
                      {/* Star — always visible so users know they can favourite tools */}
                      <button
                        title={faved ? "Remove from favourites" : "Add to favourites"}
                        onClick={(e) => { e.stopPropagation(); toggleFavTool(mode); }}
                        style={{
                          position: "absolute", top: 1, right: 1,
                          width: 11, height: 11,
                          fontSize: 9, lineHeight: "11px", textAlign: "center",
                          color: faved ? "#f7a600" : theme.textMuted,
                          opacity: 1,
                          background: "transparent", border: "none", cursor: "pointer", padding: 0,
                          WebkitTextStroke: faved ? "0.4px #333" : "0.4px #555",
                          textShadow: "0 0 1px rgba(0,0,0,0.6)",
                        }}
                      >
                        {faved ? "★" : "☆"}
                      </button>
                    </div>
                  );
                };
                const favTools = ALL_DRAW_TOOLS.filter((t) => favDrawingTools.includes(t.mode));
                return (
                  <div
                    className="flex flex-col items-center py-2 px-0.5 border-r flex-shrink-0 gap-0.5 overflow-y-auto overflow-x-hidden"
                    style={{
                      background: theme.surface,
                      borderColor: theme.border,
                      width: 46,
                      opacity: chartData.length === 0 ? 0.35 : 1,
                      pointerEvents: chartData.length === 0 ? "none" : "auto",
                    }}
                  >
                    {/* Cursor */}
                    <button
                      onClick={() => { setDrawingMode(null); setDrawingModeSource(null); }}
                      title="Cursor (default)"
                      style={{
                        width: 42, height: 36,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 5,
                        background: drawingMode === null ? "#e8f0fe" : "transparent",
                        color: drawingMode === null ? "#1E53E5" : theme.textMuted,
                        border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => { if (drawingMode !== null) { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.text; }}}
                      onMouseLeave={(e) => { if (drawingMode !== null) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; }}}
                    >
                      <MousePointer2 style={{ width: 16, height: 16 }} />
                    </button>

                    {/* All tools */}
                    {ALL_DRAW_TOOLS.map((t) => <ToolBtn key={t.mode} {...t} />)}

                    <div style={{ width: 24, height: 1, background: theme.border, margin: "4px 0 2px" }} />

                    {/* Eraser — click a drawing to delete it */}
                    <button
                      onClick={() => { setDrawingMode("eraser"); setDrawingModeSource("panel"); setSelectedDrawingIds([]); }}
                      title="Eraser — click a drawing to delete it"
                      style={{
                        width: 42, height: 36,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderRadius: 5,
                        background: drawingMode === "eraser" ? "#fff3e0" : "transparent",
                        color: drawingMode === "eraser" ? "#f7a600" : theme.textMuted,
                        border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => { if (drawingMode !== "eraser") { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.text; }}}
                      onMouseLeave={(e) => { if (drawingMode !== "eraser") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; }}}
                    >
                      <Eraser style={{ width: 16, height: 16 }} />
                    </button>

                    {/* Spacer pushes trash to bottom */}
                    <div style={{ flex: 1 }} />

                    {/* Clear all drawings */}
                    {userDrawings.length > 0 && (
                      <>
                        <div style={{ width: 24, height: 1, background: theme.border, margin: "2px 0" }} />
                        <button
                          data-test-id="drawing-clear-all-btn"
                          onClick={() => setShowClearDrawingsConfirm(true)}
                          title="Delete all drawings"
                          style={{
                            width: 42, height: 36,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            borderRadius: 5,
                            background: "transparent",
                            color: theme.textMuted,
                            border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2"; e.currentTarget.style.color = "#f23645"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; }}
                        >
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}

              {/* Chart area — overflow-hidden + minWidth:0 so flex can shrink it below the canvas's current width */}
              <div
                ref={(el) => (colPanelRefs.current[0] = el)}
                className="relative overflow-hidden"
                style={{ flex: colSizes[0], minWidth: 0 }}
                onMouseDown={() => setActiveChart(1)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
              >

              {/* Per-window setup tags */}
              {currentSession && chartData.length > 0 && (
                <WindowTagBar
                  tags={windowTags[1]}
                  suggestions={tagSuggestions}
                  onToggle={(t) => toggleWindowTag(1, t)}
                  onAdd={(t) => addWindowTag(1, t)}
                  theme={theme}
                  testIdPrefix="window-1"
                />
              )}

              {/* Floating favourite tools — hovers over the chart.
                  Single grip on the left drags the entire bar to reposition it.
                  Selecting a tool here does NOT highlight the left panel button. */}
              {favDrawingTools.length > 0 && !isLoadingData && chartData.length > 0 && (
                <div
                  data-test-id="fav-tools-floating-bar"
                  className={favBarPos ? "" : "absolute top-2 left-1/2 -translate-x-1/2"}
                  style={{
                    position: favBarPos ? "fixed" : undefined,
                    left: favBarPos ? favBarPos.left : undefined,
                    top: favBarPos ? favBarPos.top : undefined,
                    zIndex: 50,
                    display: "flex", alignItems: "center", gap: 1,
                    borderRadius: 8, border: `1px solid ${theme.border}`,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                    background: theme.surface,
                    padding: "2px 4px 2px 2px",
                  }}
                >
                  {/* Single drag handle for the whole bar */}
                  <div
                    title="Drag to move toolbar"
                    style={{ cursor: "grab", padding: "0 2px", display: "flex", alignItems: "center", flexShrink: 0 }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const bar = e.currentTarget.parentElement;
                      const barRect = bar.getBoundingClientRect();
                      const startMouseX = e.clientX;
                      const startMouseY = e.clientY;
                      const startLeft = barRect.left;
                      const startTop = barRect.top;
                      const onMove = (ev) => {
                        setFavBarPos({
                          left: startLeft + ev.clientX - startMouseX,
                          top: startTop + ev.clientY - startMouseY,
                        });
                      };
                      const onUp = () => {
                        window.removeEventListener("mousemove", onMove);
                        window.removeEventListener("mouseup", onUp);
                      };
                      window.addEventListener("mousemove", onMove);
                      window.addEventListener("mouseup", onUp);
                    }}
                  >
                    <GripVertical style={{ width: 12, height: 20, color: theme.textMuted, opacity: 0.55 }} />
                  </div>

                  {/* Tool buttons — draggable among themselves to reorder */}
                  {BACKTEST_DRAW_TOOLS
                    .filter((t) => favDrawingTools.includes(t.mode))
                    .sort((a, b) => favDrawingTools.indexOf(a.mode) - favDrawingTools.indexOf(b.mode))
                    .map(({ mode, Icon, title, label }) => {
                      const active = drawingMode === mode && drawingModeSource === "floating";
                      return (
                        <div
                          key={mode}
                          draggable
                          onDragStart={() => { floatDragRef.current = mode; }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            const src = floatDragRef.current;
                            if (!src || src === mode) return;
                            setFavDrawingTools((prev) => {
                              const arr = [...prev];
                              const from = arr.indexOf(src), to = arr.indexOf(mode);
                              if (from === -1 || to === -1) return prev;
                              arr.splice(from, 1);
                              arr.splice(to, 0, src);
                              return arr;
                            });
                          }}
                        >
                          <button
                            data-test-id={`fav-tool-${mode}-btn`}
                            onClick={() => { setDrawingMode(mode); setDrawingModeSource("floating"); setSelectedDrawingIds([]); }}
                            title={title}
                            style={{
                              width: 28, height: 26,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              borderRadius: 4,
                              background: active ? "#e8f0fe" : "transparent",
                              color: active ? "#1E53E5" : theme.textMuted,
                              fontSize: 9, fontWeight: 700, letterSpacing: "-0.5px",
                              border: "none", cursor: "pointer", transition: "background 0.12s, color 0.12s",
                            }}
                            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = theme.bg; e.currentTarget.style.color = theme.text; } }}
                            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textMuted; } }}
                          >
                            {Icon ? <Icon style={{ width: 14, height: 14 }} /> : label}
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Instrument labels moved to top bar */}

              {isLoadingData ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: theme.bg }}
                >
                  <Loader2
                    className="w-8 h-8 animate-spin mb-3"
                    style={{ color: "#2a9d8f" }}
                  />
                  <p className="text-sm" style={{ color: theme.textMuted }}>
                    Loading real market data…
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#b2b5be" }}>
                    Yahoo Finance via Edge Function
                  </p>
                </div>
              ) : chartData.length === 0 ? (
                <div
                  className="absolute inset-0 flex items-center justify-center text-sm"
                  style={{ color: "#b2b5be", background: theme.bg }}
                >
                  No data loaded yet
                </div>
              ) : (
                <ChartErrorBoundary>
                  <BacktestChart
                    candleData={chartData}
                    visibleCount={currentCandle + 1}
                    indicators={indicators}
                    onCandleSeek={handleCandleSeek}
                    isPlaying={isPlaying}
                    isDark={isDark}
                    symbol={currentSession?.instrument?.symbol}
                    isActiveChart={activeChart === 1}
                    onPriceScaleWidth={(w) => reportPsWidth(1, w)}
                    positions={positionsByChart[1]}
                    trades={tradesByChart[1]}
                    onPositionUpdate={updatePosition}
                    orderPreview={orderPreview1}
                    onOrderPreviewUpdate={(field, value) => {
                      if (field === "takeProfit") setTakeProfit(clampExitLevel("takeProfit", value).toFixed(2));
                      if (field === "stopLoss") setStopLoss(clampExitLevel("stopLoss", value).toFixed(2));
                    }}
                    drawingMode={drawingMode}
                    userDrawings={userDrawings}
                    onDrawingAdd={(drawing) => {
                      // Keep a caller-provided id (text tool pre-selects by id)
                      pushDrawings([...userDrawings, { id: Date.now(), ...drawing }]);
                      // Auto-switch back to cursor after completing a drawing.
                      // Brush stays armed so several strokes can be drawn in a row.
                      if (drawing.type !== "freehand") setDrawingMode(null);
                    }}
                    onDrawingDelete={(id) => {
                      pushDrawings(userDrawings.filter((d) => d.id !== id));
                      setSelectedDrawingIds((prev) => prev.filter((sid) => sid !== id));
                    }}
                    onCrosshairMove={(syncCursor || barReplayMode) ? (t, y) => {
                      crosshairSettersRef.current[2]?.(t, y);
                      crosshairSettersRef.current[3]?.(t, y);
                    } : undefined}
                    onRegisterCrosshairSetter={(fn) => { crosshairSettersRef.current[1] = fn; }}
                    barReplayActive={barReplayMode}
                    onBarReplayDeactivate={() => setBarReplayMode(false)}
                    selectedDrawingIds={selectedDrawingIds}
                    onSelectionChange={(id, multi) => {
                      if (id === null) { setSelectedDrawingIds([]); return; }
                      if (multi) {
                        setSelectedDrawingIds((prev) =>
                          prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
                        );
                      } else {
                        // Keep the same array ref when already the sole selection
                        // so React skips a re-render (and the full SVG rebuild that
                        // would flash every drawing) — e.g. clicking to start an edit.
                        setSelectedDrawingIds((prev) =>
                          prev.length === 1 && prev[0] === id ? prev : [id]
                        );
                      }
                    }}
                    onSelectMany={(ids) => setSelectedDrawingIds(ids)}
                    onRangeChange={syncDrag ? (r) => {
                      rangeSettersRef.current[2]?.(r);
                      rangeSettersRef.current[3]?.(r);
                    } : undefined}
                    onRegisterRangeSetter={(fn, getFn) => { rangeSettersRef.current[1] = fn; rangeGettersRef.current[1] = getFn; }}
                    timezone={chartTz}
                    formingCandle={formingCandle}
                    onDrawingUpdate={(id, changes) =>
                      pushDrawings(userDrawings.map((d) => d.id === id ? { ...d, ...changes } : d))
                    }
                    panelDrawing={
                      selectedDrawingIds.length === 1
                        ? userDrawings.find((d) => d.id === selectedDrawingIds[0]) ?? null
                        : null
                    }
                    onPropertyChange={(id, changes) => {
                      const next = userDrawings.map((d) => d.id === id ? { ...d, ...changes } : d);
                      pushDrawings(next);
                      const updated = next.find((d) => d.id === id);
                      if (updated) autoSaveDefaults(updated.type, updated);
                    }}
                    chartSettings={chartSettings}
                  />
                </ChartErrorBoundary>
              )}

              {/* ── Order panel — draggable, fixed so it floats above all chart windows ── */}
              {showOrderPanel && (
                <div
                  className="fixed z-50 flex flex-col shadow-2xl rounded-lg border overflow-hidden"
                  style={{
                    width: 312,
                    maxHeight: "calc(100vh - 80px)",
                    top: panelPos.y,
                    left: panelPos.x,
                    background: theme.surface,
                    borderColor: theme.border,
                    userSelect: "none",
                  }}
                  // The panel is a DOM child of window 1's chart area (whose
                  // onMouseDown sets activeChart=1). Stop bubbling so interacting
                  // with the panel never steals focus to window 1 — the order
                  // preview stays on whichever window is actually selected.
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {/* Drag handle header */}
                  <div
                    className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing flex-shrink-0"
                    style={{ background: isDark ? "#0d1117" : "#e8eaf0", borderBottom: `1px solid ${theme.border}` }}
                    onMouseDown={(e) => {
                      isDraggingPanel.current = true;
                      dragOrigin.current = { mx: e.clientX, my: e.clientY, px: panelPos.x, py: panelPos.y };
                    }}
                  >
                    <span className="text-xs font-semibold select-none" style={{ color: theme.textMuted }}>
                      Order Entry · {activeChartInstrument?.symbol ?? "—"}{chartLayout !== "single" ? ` (W${activeChart})` : ""}
                    </span>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setShowOrderPanel(false)}
                      className="text-xs rounded px-1.5 py-0.5 transition-colors"
                      style={{ color: theme.textMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Header: Sell | spread | Buy */}
                  <div className="flex flex-shrink-0" style={{ borderBottom: `1px solid ${theme.border}` }}>
                    <button
                      onClick={() => setOrderSide("sell")}
                      className="flex-1 py-1.5 px-3 text-left transition-colors"
                      style={{
                        background: orderSide === "sell" ? "#f23645" : theme.bg,
                        color: orderSide === "sell" ? "#fff" : theme.text,
                      }}
                    >
                      <div className="text-xs font-medium">Sell</div>
                      <div className="text-base font-bold font-mono">{activeChartPrice > 0 ? trimPrice(activeChartPrice - (activeChartInstrument?.tickSize || 0.25)) : "—"}</div>
                    </button>
                    <div className="flex flex-col items-center justify-center px-2" style={{ background: isDark ? "#131722" : "#e8e8e8", minWidth: 40 }}>
                      <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                        {((activeChartInstrument?.tickSize || 0.25) * 2).toFixed(3)}
                      </span>
                    </div>
                    <button
                      onClick={() => setOrderSide("buy")}
                      className="flex-1 py-1.5 px-3 text-right transition-colors"
                      style={{
                        background: orderSide === "buy" ? "#1E53E5" : theme.bg,
                        color: orderSide === "buy" ? "#fff" : "#1E53E5",
                      }}
                    >
                      <div className="text-xs font-medium">Buy</div>
                      <div className="text-base font-bold font-mono">{activeChartPrice > 0 ? trimPrice(activeChartPrice + (activeChartInstrument?.tickSize || 0.25)) : "—"}</div>
                    </button>
                  </div>

                  {/* Order type tabs */}
                  <div className="flex flex-shrink-0 border-b" style={{ borderColor: theme.border }}>
                    {["market", "limit", "stop", "stopLimit"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setOrderType(type)}
                        className="flex-1 py-2 text-xs font-medium transition-colors border-b-2"
                        style={{
                          color: orderType === type ? theme.text : "#787b86",
                          borderBottomColor: orderType === type ? "#1E53E5" : "transparent",
                          background: "transparent",
                        }}
                      >
                        {type === "stopLimit" ? "Stop Limit" : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 p-3 space-y-4 overflow-y-auto">
                    {/* Risk per trade — percentage-based risk budget */}
                    <div
                      data-test-id="order-risk-card"
                      className="rounded-lg border p-3"
                      style={{
                        borderColor: riskOn ? "#1E53E5" : theme.border,
                        background: theme.bg,
                        opacity: riskOn ? 1 : 0.55,
                      }}
                    >
                      <div className="flex items-center justify-end mb-2">
                        <button
                          data-test-id="order-risk-toggle"
                          onClick={() => setRiskOn((v) => !v)}
                          className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
                          style={{ background: riskOn ? "#1E53E5" : (isDark ? "#363c4e" : "#d1d4dc") }}
                        >
                          <span
                            className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                            style={{ left: riskOn ? "calc(100% - 18px)" : 2 }}
                          />
                        </button>
                      </div>

                      <div className="flex items-baseline gap-2 mb-2.5">
                        <span
                          data-test-id="order-risk-pct-value"
                          className="text-2xl font-extrabold tabular-nums leading-none"
                          style={{ color: "#1E53E5" }}
                        >
                          {riskPct.toFixed(2)}%
                        </span>
                        <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                          = <b style={{ color: theme.text }}>${Math.round(orderCalc.riskAmt).toLocaleString()}</b> at risk
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                        {[0.25, 0.5, 1, 2].map((p) => (
                          <button
                            key={p}
                            data-test-id={`order-risk-preset-${p}`}
                            onClick={() => setRiskPct(p)}
                            disabled={!riskOn}
                            className="py-1 text-xs font-bold rounded border tabular-nums transition-colors disabled:cursor-not-allowed"
                            style={
                              riskPct === p
                                ? { background: "#1E53E5", borderColor: "#1E53E5", color: "#fff" }
                                : { background: theme.surface, borderColor: theme.border, color: theme.textMuted }
                            }
                          >
                            {p}%
                          </button>
                        ))}
                      </div>

                      <input
                        type="range"
                        data-test-id="order-risk-slider"
                        min="0.1"
                        max="5"
                        step="0.05"
                        value={riskPct}
                        disabled={!riskOn}
                        onChange={(e) => setRiskPct(parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
                        style={{ accentColor: "#1E53E5" }}
                      />
                    </div>

                    {/* Size input */}
                    <div>
                      <label className="block text-xs mb-1.5 font-medium" style={{ color: theme.textMuted }}>Units</label>
                      <div className="flex rounded border" style={{ borderColor: "#1E53E5", background: theme.bg }}>
                        <input
                          type="number"
                          data-test-id="order-units-input"
                          value={orderSize}
                          onChange={(e) => setOrderSize(Math.max(1, Number(e.target.value)))}
                          min="1"
                          className="flex-1 px-3 py-2 text-sm bg-transparent outline-none"
                          style={{ color: theme.text }}
                        />
                      </div>
                    </div>

                    {/* Exits section */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Exits</span>
                      </div>

                      {/* Take Profit */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: "#787b86" }}>Take profit, price</span>
                          <button
                            onClick={() => {
                              if (!useTakeProfit && activeChartPrice) {
                                const tickSize = activeChartInstrument?.tickSize || 0.25;
                                const tp = orderSide === "buy"
                                  ? activeChartPrice + 20 * tickSize
                                  : activeChartPrice - 20 * tickSize;
                                setTakeProfit(tp.toFixed(2));
                              }
                              setUseTakeProfit((v) => !v);
                            }}
                            className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
                            style={{ background: useTakeProfit ? "#089981" : (isDark ? "#363c4e" : "#d1d4dc") }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                              style={{ left: useTakeProfit ? "calc(100% - 18px)" : 2 }}
                            />
                          </button>
                        </div>
                        {useTakeProfit && (
                          <div>
                            <input
                              type="number"
                              value={takeProfit}
                              onChange={(e) => setTakeProfit(e.target.value)}
                              placeholder="Take profit price"
                              step={activeChartInstrument?.tickSize || 0.25}
                              className="w-full px-3 py-2 rounded text-sm border outline-none"
                              style={{ background: theme.bg, borderColor: "#089981", color: theme.text }}
                            />
                            {takeProfit && !isNaN(parseFloat(takeProfit)) && (
                              <p className="text-xs mt-1" style={{ color: "#089981" }}>
                                {Math.abs((parseFloat(takeProfit) - activeChartPrice) / (activeChartInstrument?.tickSize || 0.25)).toFixed(0)} ticks from entry
                              </p>
                            )}
                            <div className="flex gap-1 mt-1.5">
                              {[5, 10, 20, 50].map((ticks) => (
                                <button
                                  key={ticks}
                                  onClick={() => {
                                    const ts = activeChartInstrument?.tickSize || 0.25;
                                    // Add ticks onto the current TP value (additive), not from entry price
                                    const base = parseFloat(takeProfit) || activeChartPrice;
                                    const tp = orderSide === "buy" ? base + ticks * ts : base - ticks * ts;
                                    setTakeProfit(tp.toFixed(2));
                                  }}
                                  className="flex-1 py-0.5 text-xs rounded font-medium"
                                  style={{ background: "rgba(8,153,129,0.15)", color: "#089981" }}
                                >
                                  {ticks}T
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stop Loss */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: "#787b86" }}>Stop loss, price</span>
                          <button
                            onClick={() => {
                              if (!useStopLoss && activeChartPrice) {
                                const tickSize = activeChartInstrument?.tickSize || 0.25;
                                const sl = orderSide === "buy"
                                  ? activeChartPrice - 10 * tickSize
                                  : activeChartPrice + 10 * tickSize;
                                setStopLoss(sl.toFixed(2));
                              }
                              setUseStopLoss((v) => !v);
                            }}
                            className="w-10 h-5 rounded-full transition-colors relative flex-shrink-0"
                            style={{ background: useStopLoss ? "#f23645" : (isDark ? "#363c4e" : "#d1d4dc") }}
                          >
                            <span
                              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                              style={{ left: useStopLoss ? "calc(100% - 18px)" : 2 }}
                            />
                          </button>
                        </div>
                        {useStopLoss && (
                          <div>
                            <input
                              type="number"
                              value={stopLoss}
                              onChange={(e) => setStopLoss(e.target.value)}
                              placeholder="Stop loss price"
                              step={activeChartInstrument?.tickSize || 0.25}
                              className="w-full px-3 py-2 rounded text-sm border outline-none"
                              style={{ background: theme.bg, borderColor: "#f23645", color: theme.text }}
                            />
                            {stopLoss && !isNaN(parseFloat(stopLoss)) && (
                              <p className="text-xs mt-1" style={{ color: "#f23645" }}>
                                {Math.abs((parseFloat(stopLoss) - activeChartPrice) / (activeChartInstrument?.tickSize || 0.25)).toFixed(0)} ticks from entry
                              </p>
                            )}
                            <div className="flex gap-1 mt-1.5">
                              {[5, 10, 20, 50].map((ticks) => (
                                <button
                                  key={ticks}
                                  onClick={() => {
                                    const ts = activeChartInstrument?.tickSize || 0.25;
                                    const base = parseFloat(stopLoss) || activeChartPrice;
                                    const sl = orderSide === "buy" ? base - ticks * ts : base + ticks * ts;
                                    setStopLoss(sl.toFixed(2));
                                  }}
                                  className="flex-1 py-0.5 text-xs rounded font-medium"
                                  style={{ background: "rgba(242,54,69,0.15)", color: "#f23645" }}
                                >
                                  {ticks}T
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order info */}
                    <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Order info</p>
                      <div className="flex justify-between text-xs" style={{ color: "#787b86" }}>
                        <span>Tick value</span>
                        <span className="font-semibold" style={{ color: theme.text }}>
                          {activeChartInstrument?.tickValue?.toFixed(2) || "—"} USD
                        </span>
                      </div>
                      {useStopLoss && orderCalc.riskOnStop > 0 && (
                        <div className="flex justify-between text-xs mt-1" style={{ color: "#787b86" }}>
                          <span>Risk on stop</span>
                          <span className="font-semibold" data-test-id="order-risk-on-stop" style={{ color: "#1E53E5" }}>
                            ${Math.round(orderCalc.riskOnStop).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {useTakeProfit && orderCalc.rewardAtTgt > 0 && (
                        <div className="flex justify-between text-xs mt-1" style={{ color: "#787b86" }}>
                          <span>Reward at target</span>
                          <span className="font-semibold" data-test-id="order-reward-at-target" style={{ color: "#089981" }}>
                            ${Math.round(orderCalc.rewardAtTgt).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {orderCalc.rr != null && (
                        <div className="flex justify-between text-xs mt-1" style={{ color: "#787b86" }}>
                          <span>Risk / reward</span>
                          <span className="font-semibold" data-test-id="order-rr" style={{ color: theme.text }}>
                            1 : {orderCalc.rr.toFixed(1)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs mt-1" style={{ color: "#787b86" }}>
                        <span>Est. value</span>
                        <span className="font-semibold" style={{ color: theme.text }}>
                          ${(activeChartPrice * orderCalc.units).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Submit + Close */}
                  <div className="p-3 flex-shrink-0 space-y-2" style={{ borderTop: `1px solid ${theme.border}` }}>
                    <button
                      onClick={executeOrder}
                      className="w-full py-3 rounded-lg text-sm font-bold transition-colors"
                      style={{
                        background: orderSide === "buy" ? "#1E53E5" : "#f23645",
                        color: "#ffffff",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      {orderSide === "buy" ? "Buy" : "Sell"} {orderCalc.units} {activeChartInstrument?.symbol ?? currentSession?.instrument?.symbol}<br />
                      <span className="text-xs font-normal opacity-90">
                        {orderType.toUpperCase()}
                        {useStopLoss && orderCalc.riskOnStop > 0
                          ? ` · risking $${Math.round(orderCalc.riskOnStop).toLocaleString()}`
                          : ""}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              </div> {/* end chart area */}

              {/* Second chart — visible when layout is 2col or 3col */}
              {(chartLayout === "2col" || chartLayout === "3col") && chartData.length > 0 && (
                <>
                <div
                  ref={(el) => (colPanelRefs.current[1] = el)}
                  className="relative overflow-hidden border-l"
                  style={{ flex: colSizes[1], minWidth: 0, borderColor: theme.border }}
                  onMouseDown={() => setActiveChart(2)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
                >
                  {/* Per-window setup tags */}
                  {chart2Symbol && chartData2.length > 0 && (
                    <WindowTagBar
                      tags={windowTags[2]}
                      suggestions={tagSuggestions}
                      onToggle={(t) => toggleWindowTag(2, t)}
                      onAdd={(t) => addWindowTag(2, t)}
                      theme={theme}
                      testIdPrefix="window-2"
                    />
                  )}
                  {/* Resize zone — left edge of chart 2 (left of price axis), resizes chart 1 ↔ chart 2 */}
                  <div
                    className="absolute top-0 bottom-0 left-0 z-30 group flex items-center justify-center"
                    style={{ width: 12, cursor: "col-resize" }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      document.body.style.cursor = "col-resize";
                      document.body.style.userSelect = "none";
                      isResizingCol.current = {
                        startX: e.clientX,
                        col: 0,
                        startSizes: [...colSizes],
                        visibleCols: chartLayout === "3col" ? 3 : 2,
                      };
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="rounded px-1 py-0.5 shadow" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                        <ArrowLeftRight className="w-3 h-3" style={{ color: theme.text }} />
                      </div>
                    </div>
                  </div>

                  {isLoadingData2 ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2a9d8f" }} />
                    </div>
                  ) : chartData2.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: theme.bg }}>
                      <span className="text-xs" style={{ color: "#b2b5be" }}>
                        {chart2Symbol
                          ? `No data for ${chart2Symbol}`
                          : "Select a second instrument to compare"}
                      </span>
                    </div>
                  ) : (
                    <ChartErrorBoundary>
                      <BacktestChart
                        candleData={chartData2}
                        visibleCount={currentCandle2 + 1}
                        indicators={indicators}
                        onCandleSeek={handleCandleSeek2}
                        isPlaying={false}
                        isDark={isDark}
                        positions={positionsByChart[2]}
                        trades={tradesByChart[2]}
                        onPositionUpdate={(id, field, value) => updatePosition(id, field, value)}
                        orderPreview={orderPreview2}
                        onOrderPreviewUpdate={(field, value) => {
                          if (field === "takeProfit") setTakeProfit(clampExitLevel("takeProfit", value).toFixed(2));
                          if (field === "stopLoss") setStopLoss(clampExitLevel("stopLoss", value).toFixed(2));
                        }}
                        symbol={chart2Symbol}
                        isActiveChart={activeChart === 2}
                        onPriceScaleWidth={(w) => reportPsWidth(2, w)}
                        drawingMode={drawingMode}
                        userDrawings={userDrawings2}
                        onDrawingAdd={(drawing) => {
                          setUserDrawings2((prev) => [...prev, { id: Date.now(), ...drawing }]);
                          if (drawing.type !== "freehand") setDrawingMode(null);
                        }}
                        onDrawingDelete={(id) => {
                          setUserDrawings2((prev) => prev.filter((d) => d.id !== id));
                          setSelectedDrawingIds((prev) => prev.filter((sid) => sid !== id));
                        }}
                        onDrawingUpdate={(id, changes) =>
                          setUserDrawings2((prev) => prev.map((d) => d.id === id ? { ...d, ...changes } : d))
                        }
                        selectedDrawingIds={selectedDrawingIds}
                        onSelectionChange={(id, multi) => {
                          if (id === null) { setSelectedDrawingIds([]); return; }
                          if (multi) {
                            setSelectedDrawingIds((prev) =>
                              prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
                            );
                          } else {
                            setSelectedDrawingIds([id]);
                          }
                        }}
                        onSelectMany={(ids) => setSelectedDrawingIds(ids)}
                        panelDrawing={
                          selectedDrawingIds.length === 1
                            ? userDrawings2.find((d) => d.id === selectedDrawingIds[0]) ?? null
                            : null
                        }
                        onPropertyChange={(id, changes) => {
                          setUserDrawings2((prev) => {
                            const next = prev.map((d) => d.id === id ? { ...d, ...changes } : d);
                            const updated = next.find((d) => d.id === id);
                            if (updated) autoSaveDefaults(updated.type, updated);
                            return next;
                          });
                        }}
                        barReplayActive={barReplayMode}
                        onCrosshairMove={(syncCursor || barReplayMode) ? (t, y) => {
                          crosshairSettersRef.current[1]?.(t, y);
                          crosshairSettersRef.current[3]?.(t, y);
                        } : undefined}
                        onRegisterCrosshairSetter={(fn) => { crosshairSettersRef.current[2] = fn; }}
                        onRangeChange={syncDrag ? (r) => {
                          rangeSettersRef.current[1]?.(r);
                          rangeSettersRef.current[3]?.(r);
                        } : undefined}
                        onRegisterRangeSetter={(fn, getFn) => { rangeSettersRef.current[2] = fn; rangeGettersRef.current[2] = getFn; }}
                        chartSettings={chartSettings}
                        timezone={chartTz}
                        hideAttribution
                      />
                    </ChartErrorBoundary>
                  )}
                </div>
                </>
              )}

              {/* Third chart — visible when layout is 3col */}
              {chartLayout === "3col" && chartData.length > 0 && (
                <>
                <div
                  ref={(el) => (colPanelRefs.current[2] = el)}
                  className="relative overflow-hidden border-l"
                  style={{ flex: colSizes[2], minWidth: 0, borderColor: theme.border }}
                  onMouseDown={() => setActiveChart(3)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenuPos({ x: e.clientX, y: e.clientY }); }}
                >
                  {/* Per-window setup tags */}
                  {chart3Symbol && chartData3.length > 0 && (
                    <WindowTagBar
                      tags={windowTags[3]}
                      suggestions={tagSuggestions}
                      onToggle={(t) => toggleWindowTag(3, t)}
                      onAdd={(t) => addWindowTag(3, t)}
                      theme={theme}
                      testIdPrefix="window-3"
                    />
                  )}
                  {/* Resize zone — left edge of chart 3, resizes chart 2 ↔ chart 3 */}
                  <div
                    className="absolute top-0 bottom-0 left-0 z-30 group flex items-center justify-center"
                    style={{ width: 12, cursor: "col-resize" }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      document.body.style.cursor = "col-resize";
                      document.body.style.userSelect = "none";
                      isResizingCol.current = {
                        startX: e.clientX,
                        col: 1,
                        startSizes: [...colSizes],
                        visibleCols: 3,
                      };
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="rounded px-1 py-0.5 shadow" style={{ background: theme.surface, border: `1px solid ${theme.border}` }}>
                        <ArrowLeftRight className="w-3 h-3" style={{ color: theme.text }} />
                      </div>
                    </div>
                  </div>

                  {isLoadingData3 ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#2a9d8f" }} />
                    </div>
                  ) : chartData3.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: theme.bg }}>
                      <span className="text-xs" style={{ color: "#b2b5be" }}>
                        {chart3Symbol
                          ? `No data for ${chart3Symbol}`
                          : "Select a third instrument to compare"}
                      </span>
                    </div>
                  ) : (
                    <ChartErrorBoundary>
                      <BacktestChart
                        candleData={chartData3}
                        visibleCount={currentCandle3 + 1}
                        indicators={indicators}
                        onCandleSeek={handleCandleSeek3}
                        isPlaying={false}
                        isDark={isDark}
                        positions={positionsByChart[3]}
                        trades={tradesByChart[3]}
                        onPositionUpdate={(id, field, value) => updatePosition(id, field, value)}
                        orderPreview={orderPreview3}
                        onOrderPreviewUpdate={(field, value) => {
                          if (field === "takeProfit") setTakeProfit(clampExitLevel("takeProfit", value).toFixed(2));
                          if (field === "stopLoss") setStopLoss(clampExitLevel("stopLoss", value).toFixed(2));
                        }}
                        symbol={chart3Symbol}
                        isActiveChart={activeChart === 3}
                        onPriceScaleWidth={(w) => reportPsWidth(3, w)}
                        drawingMode={drawingMode}
                        userDrawings={userDrawings3}
                        onDrawingAdd={(drawing) => {
                          setUserDrawings3((prev) => [...prev, { id: Date.now(), ...drawing }]);
                          if (drawing.type !== "freehand") setDrawingMode(null);
                        }}
                        onDrawingDelete={(id) => {
                          setUserDrawings3((prev) => prev.filter((d) => d.id !== id));
                          setSelectedDrawingIds((prev) => prev.filter((sid) => sid !== id));
                        }}
                        onDrawingUpdate={(id, changes) =>
                          setUserDrawings3((prev) => prev.map((d) => d.id === id ? { ...d, ...changes } : d))
                        }
                        selectedDrawingIds={selectedDrawingIds}
                        onSelectionChange={(id, multi) => {
                          if (id === null) { setSelectedDrawingIds([]); return; }
                          if (multi) {
                            setSelectedDrawingIds((prev) =>
                              prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
                            );
                          } else {
                            setSelectedDrawingIds([id]);
                          }
                        }}
                        onSelectMany={(ids) => setSelectedDrawingIds(ids)}
                        panelDrawing={
                          selectedDrawingIds.length === 1
                            ? userDrawings3.find((d) => d.id === selectedDrawingIds[0]) ?? null
                            : null
                        }
                        onPropertyChange={(id, changes) => {
                          setUserDrawings3((prev) => {
                            const next = prev.map((d) => d.id === id ? { ...d, ...changes } : d);
                            const updated = next.find((d) => d.id === id);
                            if (updated) autoSaveDefaults(updated.type, updated);
                            return next;
                          });
                        }}
                        barReplayActive={barReplayMode}
                        onCrosshairMove={(syncCursor || barReplayMode) ? (t, y) => {
                          crosshairSettersRef.current[1]?.(t, y);
                          crosshairSettersRef.current[2]?.(t, y);
                        } : undefined}
                        onRegisterCrosshairSetter={(fn) => { crosshairSettersRef.current[3] = fn; }}
                        onRangeChange={syncDrag ? (r) => {
                          rangeSettersRef.current[1]?.(r);
                          rangeSettersRef.current[2]?.(r);
                        } : undefined}
                        onRegisterRangeSetter={(fn, getFn) => { rangeSettersRef.current[3] = fn; rangeGettersRef.current[3] = getFn; }}
                        chartSettings={chartSettings}
                        timezone={chartTz}
                        hideAttribution
                      />
                    </ChartErrorBoundary>
                  )}
                </div>
                </>
              )}
              {/* ── Timezone dropdown — compact closed (short code), expands to
                   full city labels when opened. Shown for any window count. ── */}
              <div
                ref={tzDropdownRef}
                className={`absolute bottom-1 z-30 ${tzBox ? "" : "right-1"}`}
                style={tzBox ? { left: tzBox.left, width: tzBox.width } : undefined}
              >
                <button
                  data-test-id="backtest-timezone-select"
                  onClick={() => setShowTzDropdown((v) => !v)}
                  title="Chart timezone"
                  className={`flex items-center justify-center gap-0.5 text-[11px] leading-none rounded px-1.5 py-1 border outline-none cursor-pointer transition-colors ${tzBox ? "w-full" : ""}`}
                  style={{
                    background: showTzDropdown ? theme.bg : theme.surface,
                    color: theme.textMuted,
                    borderColor: theme.border,
                  }}
                >
                  {TZ_OPTIONS.find((o) => o.id === chartTz)?.short ?? "TZ"}
                  <svg className="w-2.5 h-2.5" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z" /></svg>
                </button>
                {showTzDropdown && (
                  <div
                    className="absolute bottom-full right-0 mb-1 rounded-lg shadow-xl border py-1 overflow-y-auto"
                    style={{ background: theme.surface, borderColor: theme.border, minWidth: 150, maxHeight: 220 }}
                  >
                    {TZ_OPTIONS.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { handleChartTzChange(o.id); setShowTzDropdown(false); }}
                        className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-xs text-left transition-colors"
                        style={{
                          background: o.id === chartTz ? theme.bg : "transparent",
                          color: o.id === chartTz ? "#1E53E5" : theme.text,
                          fontWeight: o.id === chartTz ? 600 : 400,
                        }}
                        onMouseEnter={(e) => { if (o.id !== chartTz) e.currentTarget.style.background = theme.bg; }}
                        onMouseLeave={(e) => { if (o.id !== chartTz) e.currentTarget.style.background = "transparent"; }}
                      >
                        <span>{o.label}</span>
                        <span style={{ color: "#b2b5be" }}>{o.short}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset all windows — centered across the whole chart row, above
                  the time axis. Resets every open window's zoom together. */}
              {!isLoadingData && chartData.length > 0 && (
                <button
                  data-test-id="backtest-reset-btn"
                  onClick={handleReset}
                  title="Reset zoom for all windows"
                  className="absolute bottom-9 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border shadow font-medium transition-colors"
                  style={{ background: theme.surface, borderColor: theme.border, color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset{chartLayout !== "single" ? " all" : ""}
                </button>
              )}
            </div> {/* end inner flex row [toolbar | chart] */}
          </div> {/* end chart column */}

          {/* Right-click context menu */}
          {contextMenuPos && (
            <ChartContextMenu
              x={contextMenuPos.x}
              y={contextMenuPos.y}
              onSettings={() => setShowChartSettings(true)}
              onPlaceOrder={() => setShowOrderPanel(true)}
              onClose={() => setContextMenuPos(null)}
            />
          )}

          {/* Delete-all-drawings confirmation modal */}
          {showClearDrawingsConfirm && (
            <ModalPortal>
            <div
              data-test-id="clear-drawings-modal"
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
              onClick={() => setShowClearDrawingsConfirm(false)}
            >
              <div
                className="rounded-xl shadow-2xl border p-5 w-80"
                style={{ background: theme.surface, borderColor: theme.border }}
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
                  Delete all drawings?
                </p>
                <p className="text-xs mb-4" style={{ color: theme.textMuted }}>
                  Every drawing on this chart will be removed. You can bring them back with Undo (Ctrl+Z).
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    data-test-id="clear-drawings-cancel-btn"
                    onClick={() => setShowClearDrawingsConfirm(false)}
                    className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{ background: theme.bg, color: theme.text }}
                  >
                    Cancel
                  </button>
                  <button
                    data-test-id="clear-drawings-confirm-btn"
                    onClick={() => {
                      pushDrawings([]);
                      setSelectedDrawingIds([]);
                      setShowClearDrawingsConfirm(false);
                    }}
                    className="px-3 py-1.5 rounded text-xs font-bold transition-colors"
                    style={{ background: "#f23645", color: "#ffffff" }}
                  >
                    Delete all
                  </button>
                </div>
              </div>
            </div>
            </ModalPortal>
          )}

          {/* Chart settings modal */}
          {showChartSettings && (
            <ChartSettingsModal
              chartSettings={chartSettings}
              setChartSettings={setChartSettings}
              onClose={() => setShowChartSettings(false)}
            />
          )}

          {/* Sidebar toggle — visible when sidebar is closed */}
          {!showSidebar && (
            <button
              onClick={() => setShowSidebar(true)}
              title="Open side panel"
              className="flex-shrink-0 flex items-center justify-center border-l transition-colors"
              style={{ width: 22, background: theme.surface, borderColor: theme.border, color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              <PanelRightOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Side panel: positions + trade history */}
          {showSidebar && (
          <div
            className="w-60 flex flex-col flex-shrink-0 border-l overflow-hidden"
            style={{ background: theme.surface, borderColor: theme.border }}
          >
            {/* Sidebar header with controls */}
            <div
              className="flex items-center justify-between px-3 py-1.5 border-b flex-shrink-0"
              style={{ borderColor: theme.border }}
            >
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#b2b5be" }}>
                Side Panel
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setShowEdgeAnalytics(!showEdgeAnalytics)}
                  title={showEdgeAnalytics ? "Hide Edge Analytics" : "Show Edge Analytics"}
                  className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                  style={{
                    color: showEdgeAnalytics ? "#1E53E5" : theme.textMuted,
                    background: showEdgeAnalytics ? "rgba(30,83,229,0.1)" : "transparent"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = showEdgeAnalytics ? "#1E53E5" : theme.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = showEdgeAnalytics ? "#1E53E5" : theme.textMuted)}
                  data-test-id="edge-analytics-toggle-btn"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleFullscreen}
                  title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                  style={{ color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setShowSidebar(false)}
                  title="Close side panel"
                  className="w-6 h-6 flex items-center justify-center rounded transition-colors"
                  style={{ color: theme.textMuted }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f23645")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Open positions — collapsible */}
            <div
              className="p-3 border-b flex-shrink-0"
              style={{ borderColor: theme.border }}
            >
              <button
                onClick={() => setShowOpenPositions((v) => !v)}
                className="w-full flex items-center justify-between mb-2"
                data-test-id="open-positions-toggle"
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#b2b5be" }}>
                  Open Positions{positions.length > 0 ? ` (${positions.length})` : ""}
                </span>
                {showOpenPositions
                  ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "#b2b5be" }} />
                  : <ChevronRight className="w-3.5 h-3.5" style={{ color: "#b2b5be" }} />}
              </button>
              {showOpenPositions && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {positions.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: "#b2b5be" }}>
                    No open positions
                  </p>
                ) : (
                  positions.map((pos) => (
                    <PositionCard
                      key={pos.id}
                      pos={pos}
                      theme={theme}
                      tickSize={currentSession?.instrument?.tickSize || 0.25}
                      onUpdateField={updatePosition}
                      onClose={closePositionManually}
                      trimPrice={trimPrice}
                    />
                  ))
                )}
              </div>
              )}
            </div>

            {/* Trade history — collapsible */}
            <div className="flex-1 p-3 flex flex-col overflow-hidden">
              <button
                onClick={() => setShowTradeHistory((v) => !v)}
                className="w-full flex items-center justify-between mb-2 flex-shrink-0"
                data-test-id="trade-history-toggle"
              >
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#b2b5be" }}>
                  Trade History{trades.length > 0 ? ` (${trades.length})` : ""}
                </span>
                {showTradeHistory
                  ? <ChevronDown className="w-3.5 h-3.5" style={{ color: "#b2b5be" }} />
                  : <ChevronRight className="w-3.5 h-3.5" style={{ color: "#b2b5be" }} />}
              </button>
              {showTradeHistory && (
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {trades.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: "#b2b5be" }}>
                    No trades yet
                  </p>
                ) : (
                  trades
                    .slice(-20)
                    .reverse()
                    .map((t) => (
                      <div
                        key={t.id}
                        className="rounded p-2 text-xs border"
                        style={{ background: theme.bg, borderColor: theme.border }}
                      >
                        <div className="flex justify-between mb-0.5">
                          <span
                            className="font-semibold"
                            style={{ color: t.side === "buy" ? "#089981" : "#f23645" }}
                          >
                            {t.side.toUpperCase()} ×{t.size}
                          </span>
                          <span style={{ color: t.pnl >= 0 ? "#089981" : "#f23645" }}>
                            {t.pnl >= 0 ? "+" : ""}${trimPrice(t.pnl)}
                          </span>
                        </div>
                        <div style={{ color: theme.textMuted }}>
                          {trimPrice(t.entryPrice)} → {trimPrice(t.exitPrice)}
                        </div>
                      </div>
                    ))
                )}
              </div>
              )}
            </div>
          </div>
          )} {/* end showSidebar */}

          {/* Edge Analytics Panel */}
          {showEdgeAnalytics && (
            <EdgeAnalyticsPanel
              trades={trades}
              initialBalance={currentSession.initialBalance ?? baseBalance}
              isDark={isDark}
              onClose={() => setShowEdgeAnalytics(false)}
            />
          )}
        </div>
      </div>

      </>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Backtest Sessions
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage your backtesting sessions
          </p>
        </div>
      </div>
    </div>
  );
};

export default Backtest;
