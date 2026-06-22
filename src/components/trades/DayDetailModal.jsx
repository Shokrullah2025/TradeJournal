import React, { useState } from "react";
import ModalPortal from "../common/ModalPortal";
import {
  X,
  Calendar,
  Edit,
  Plus,
  Trash2,
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { useTrades } from "../../context/TradeContext";
import { tagColor } from "../../utils/tagColor";
import toast from "react-hot-toast";

// Pro terminal grid — shared by the header row and every data row so columns line
// up. Kept in one constant to avoid drift between header and body.
const GRID_COLS =
  "grid-cols-[30px_1.3fr_0.8fr_0.6fr_1.3fr_1fr_1fr_64px]";

// Deterministic pseudo-trend glyph for a trade. We have no intraday price series
// per trade, so the sparkline is a *direction indicator*: it slopes up for a
// winner and down for a loser, with stable per-trade jitter (seeded from the
// trade id) so the same trade always draws the same shape. It is decorative —
// the real number is the P&L beside it.
function hashSeed(str) {
  const s = String(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return Math.abs(h);
}

function sparklinePoints(seed, up, width = 74, height = 24, n = 6) {
  let s = hashSeed(seed) || 1;
  const rand = () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = up ? height - 2 - t * (height - 6) : 2 + t * (height - 6);
    const jitter = (rand() - 0.5) * (height * 0.4);
    const y = Math.max(2, Math.min(height - 2, base + jitter));
    pts.push(`${Math.round(t * width)},${Math.round(y)}`);
  }
  return pts.join(" ");
}

const TrendSparkline = ({ trade }) => {
  const up = (trade.pnl || 0) >= 0;
  return (
    <svg
      width="74"
      height="24"
      viewBox="0 0 74 24"
      preserveAspectRatio="none"
      data-testid={`trade-row-sparkline-${trade.id}`}
      aria-hidden="true"
    >
      <polyline
        points={sparklinePoints(trade.id, up)}
        fill="none"
        stroke={up ? "#16A34A" : "#DC2626"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// Zoomable screenshot strip shown inside the expanded detail drawer.
const TradeScreenshots = ({ images }) => {
  const [zoomedImg, setZoomedImg] = useState(null);
  if (!images || images.length === 0) return null;
  const sorted = [...images].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return (
    <>
      <div
        className="flex flex-wrap gap-2"
        onClick={(e) => e.stopPropagation()}
        data-testid="trade-screenshots-strip"
      >
        {sorted.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setZoomedImg(img)}
            data-testid={`trade-screenshot-thumb-${i}`}
            className="relative w-[70px] h-[46px] rounded-md overflow-hidden border border-gray-200 dark:border-gray-600 hover:ring-2 hover:ring-blue-400 transition-all group"
            title="Click to zoom"
          >
            {img.previewUrl ? (
              <img
                src={img.previewUrl}
                alt={`Screenshot ${i + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Camera className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium">
                zoom
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {zoomedImg && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-[70] flex items-center justify-center p-4"
          onClick={() => setZoomedImg(null)}
          data-testid="screenshot-lightbox"
        >
          <div
            className="relative max-w-4xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomedImg.previewUrl}
              alt="Screenshot zoom"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl mx-auto block"
            />
            <button
              onClick={() => setZoomedImg(null)}
              data-testid="lightbox-close-btn"
              className="absolute top-2 right-2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {sorted.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                {sorted.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setZoomedImg(img)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      img.id === zoomedImg.id
                        ? "bg-white"
                        : "bg-white bg-opacity-40 hover:bg-opacity-70"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Small colored tag chip (strategy / setup), colored deterministically by name.
const Tag = ({ label }) => {
  const { bg, text } = tagColor(label);
  return (
    <span
      className="font-semibold text-[11px] px-2 py-[3px] rounded-md"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
};

const formatCurrency = (amount) =>
  `${amount >= 0 ? "+" : "−"}$${Math.abs(amount).toFixed(2)}`;

const formatPrice = (value) =>
  value || value === 0
    ? `$${Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : "—";

const DayDetailModal = ({
  isOpen,
  date,
  trades,
  onClose,
  onEditTrade,
  onAddTrade,
}) => {
  const { deleteTrade } = useTrades();
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  if (!isOpen || !date) return null;

  // Day statistics
  const closedTrades = trades.filter((t) => t.status === "closed");
  const openTrades = trades.filter((t) => t.status === "open");
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winningTrades = closedTrades.filter((t) => t.pnl > 0);
  const losingTrades = closedTrades.filter((t) => t.pnl < 0);
  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;

  const handleDelete = async (tradeId) => {
    try {
      await deleteTrade(tradeId);
      toast.success("Trade deleted");
      setConfirmDeleteId(null);
      if (trades.length === 1) onClose();
    } catch {
      toast.error("Failed to delete trade");
    }
  };

  const toggleExpand = (id) =>
    setExpandedId((cur) => (cur === id ? null : id));

  const pnlTextClass = (pnl) =>
    pnl > 0
      ? "text-green-600 dark:text-green-400"
      : pnl < 0
      ? "text-red-600 dark:text-red-400"
      : "text-gray-500 dark:text-gray-400";

  const hasDetail = (trade) =>
    !!(trade.notes || (trade.images && trade.images.length) || trade.strategy || trade.setup);

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      data-testid="day-detail-modal"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* ── Dark terminal header ── */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-lg font-bold text-white tracking-tight">
                {format(date, "EEE, MMMM d, yyyy")}
              </div>
              <div className="font-mono text-xs text-slate-400 mt-0.5 tracking-wide">
                {trades.length} POSITION{trades.length !== 1 ? "S" : ""} ·{" "}
                {openTrades.length === 0
                  ? "ALL CLOSED"
                  : `${openTrades.length} OPEN`}
              </div>
            </div>
          </div>

          {/* KPI chips */}
          <div className="flex items-center gap-2">
            <div
              className={`flex flex-col gap-0.5 px-3.5 py-[7px] rounded-lg border ${
                totalPnL > 0
                  ? "bg-green-950/60 border-green-800"
                  : totalPnL < 0
                  ? "bg-red-950/60 border-red-900"
                  : "bg-slate-800 border-slate-700"
              }`}
            >
              <span className="font-semibold text-[9px] tracking-widest text-slate-400">
                DAY P&L
              </span>
              <span
                className={`font-mono font-bold text-[15px] ${
                  totalPnL > 0
                    ? "text-green-400"
                    : totalPnL < 0
                    ? "text-red-400"
                    : "text-slate-200"
                }`}
                data-testid="day-pnl-value"
              >
                {formatCurrency(totalPnL)}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-3.5 py-[7px] rounded-lg bg-slate-800 border border-slate-700">
              <span className="font-semibold text-[9px] tracking-widest text-slate-400">
                WIN
              </span>
              <span
                className="font-mono font-bold text-[15px] text-slate-200"
                data-testid="day-winrate-value"
              >
                {closedTrades.length > 0 ? `${winRate.toFixed(0)}%` : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 px-3.5 py-[7px] rounded-lg bg-slate-800 border border-slate-700">
              <span className="font-semibold text-[9px] tracking-widest text-slate-400">
                W / L
              </span>
              <span
                className="font-mono font-bold text-[15px] text-slate-200"
                data-testid="day-wl-value"
              >
                {winningTrades.length} / {losingTrades.length}
              </span>
            </div>
            <button
              onClick={() => onAddTrade(date)}
              data-testid="day-detail-add-btn"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ml-1"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Add
            </button>
            <button
              onClick={onClose}
              data-testid="day-detail-close-btn"
              className="w-9 h-9 rounded-lg border border-slate-700 bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable terminal body ── */}
        <div className="overflow-auto flex-1">
          {trades.length === 0 ? (
            <div
              className="text-center py-16 px-6"
              data-testid="day-detail-empty-state"
            >
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No trades on this date
              </p>
              <button
                onClick={() => onAddTrade(date)}
                className="btn btn-primary"
                data-testid="day-detail-empty-add-btn"
              >
                Add Your First Trade
              </button>
            </div>
          ) : (
            <div className="min-w-[700px]" data-testid="day-detail-table">
              {/* Column header */}
              <div
                className={`grid ${GRID_COLS} gap-3 px-6 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700 font-semibold text-[10px] tracking-wider text-gray-400 dark:text-gray-500 items-center`}
              >
                <span />
                <span>INSTRUMENT</span>
                <span>ENTRY</span>
                <span>QTY</span>
                <span>STOP / TARGET</span>
                <span>TREND</span>
                <span className="text-right">P&L</span>
                <span />
              </div>

              {/* Rows */}
              {trades.map((trade) => {
                const isExpanded = expandedId === trade.id;
                const detail = hasDetail(trade);
                const isWin = (trade.pnl || 0) >= 0;
                return (
                  <div
                    key={trade.id}
                    className="border-b border-gray-100 dark:border-gray-800"
                    data-testid={`trade-row-${trade.id}`}
                  >
                    <div
                      className={`grid ${GRID_COLS} gap-3 px-6 py-3 items-center transition-colors ${
                        detail ? "cursor-pointer" : ""
                      } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                      onClick={() => detail && toggleExpand(trade.id)}
                    >
                      {/* status dot */}
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          trade.status === "open"
                            ? "bg-blue-500"
                            : isWin
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />

                      {/* instrument + direction */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {trade.instrument}
                        </span>
                        <span
                          className={`font-bold text-[9px] px-1.5 py-0.5 rounded ${
                            trade.tradeType === "long"
                              ? "text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40"
                              : "text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/40"
                          }`}
                        >
                          {trade.tradeType?.toUpperCase()}
                        </span>
                      </div>

                      {/* entry */}
                      <span className="font-mono text-[13px] text-gray-700 dark:text-gray-300">
                        {formatPrice(trade.entryPrice)}
                      </span>

                      {/* qty */}
                      <span className="font-mono text-[13px] text-gray-700 dark:text-gray-300">
                        {trade.quantity}
                      </span>

                      {/* stop / target */}
                      <div className="flex gap-1.5 font-mono font-semibold text-xs">
                        <span className="text-red-600 dark:text-red-400">
                          {trade.stopLoss ? Number(trade.stopLoss).toFixed(2) : "—"}
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">/</span>
                        <span className="text-green-600 dark:text-green-400">
                          {trade.takeProfit
                            ? Number(trade.takeProfit).toFixed(2)
                            : "—"}
                        </span>
                      </div>

                      {/* trend */}
                      <TrendSparkline trade={trade} />

                      {/* pnl */}
                      <span
                        className={`font-mono font-bold text-sm text-right ${
                          trade.status === "open"
                            ? "text-blue-600 dark:text-blue-400"
                            : pnlTextClass(trade.pnl || 0)
                        }`}
                        data-testid={`trade-row-pnl-${trade.id}`}
                      >
                        {trade.status === "open"
                          ? "OPEN"
                          : formatCurrency(trade.pnl || 0)}
                      </span>

                      {/* actions */}
                      <div className="flex justify-end items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditTrade(trade);
                          }}
                          data-testid={`trade-row-edit-${trade.id}`}
                          className="w-7 h-7 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 flex items-center justify-center transition-colors"
                          title="Edit trade"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        {detail && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(trade.id);
                            }}
                            data-testid={`trade-row-expand-${trade.id}`}
                            className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                              isExpanded
                                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300"
                                : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
                            }`}
                            title={isExpanded ? "Collapse" : "Expand details"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Detail drawer ── */}
                    {isExpanded && detail && (
                      <div
                        className="mx-6 mb-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex gap-6 flex-wrap items-start"
                        data-testid={`trade-drawer-${trade.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex-1 min-w-[200px]">
                          <span className="font-semibold text-[10px] tracking-wider text-gray-400 dark:text-gray-500">
                            JOURNAL NOTE
                          </span>
                          {trade.notes ? (
                            <p className="mt-1.5 text-[13px] leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                              {trade.notes}
                            </p>
                          ) : (
                            <p className="mt-1.5 text-[13px] italic text-gray-400 dark:text-gray-500">
                              No notes added
                            </p>
                          )}
                          {(trade.strategy || trade.setup) && (
                            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                              {trade.strategy && <Tag label={trade.strategy} />}
                              {trade.setup && <Tag label={trade.setup} />}
                            </div>
                          )}
                        </div>

                        {trade.images && trade.images.length > 0 && (
                          <div>
                            <span className="font-semibold text-[10px] tracking-wider text-gray-400 dark:text-gray-500 block mb-1.5">
                              SCREENSHOTS · {trade.images.length}
                            </span>
                            <TradeScreenshots images={trade.images} />
                          </div>
                        )}

                        <div className="flex items-start">
                          {confirmDeleteId === trade.id ? (
                            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-1.5">
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                              <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                                Delete?
                              </span>
                              <button
                                onClick={() => handleDelete(trade.id)}
                                className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-800 px-2 py-0.5 rounded transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(trade.id)}
                              data-testid={`trade-row-delete-${trade.id}`}
                              className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400 hover:text-red-600 hover:border-red-300 flex items-center justify-center transition-colors"
                              title="Delete trade"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-800/60">
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500">
                  {closedTrades.length} of {trades.length} trade
                  {trades.length !== 1 ? "s" : ""} closed
                </span>
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  Net{" "}
                  <span
                    className={`font-mono font-bold ${pnlTextClass(totalPnL)}`}
                    data-testid="day-net-value"
                  >
                    {formatCurrency(totalPnL)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

export default DayDetailModal;
