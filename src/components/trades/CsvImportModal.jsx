import React, { useState, useRef, useCallback } from "react";
import ModalPortal from "../common/ModalPortal";
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { parseCSVFile, PLATFORM_LABELS } from "../../utils/csvImport";
import { useTrades } from "../../context/TradeContext";
import toast from "react-hot-toast";

const ACCEPTED_TYPES = ".csv,.xlsx,.xls";

const PLATFORM_GUIDES = {
  ninjatrader: {
    label: "NinjaTrader 8",
    steps: [
      "Open NinjaTrader → Control Center",
      "Go to New → Trade Performance",
      "Set the date range you want",
      'Click "Export" → "Export to CSV"',
    ],
  },
  tradovate: {
    label: "Tradovate",
    steps: [
      "Log in to app.tradovate.com",
      "Go to Account → Trade History",
      "Set your date range",
      'Click "Export" (top right)',
    ],
  },
  topstepx: {
    label: "TopstepX",
    steps: [
      "Log in to your TopstepX dashboard",
      "Go to Trading → Trade History",
      "Select your evaluation or funded account",
      'Click "Export" → CSV',
    ],
  },
  rithmic: {
    label: "Rithmic R|Trader Pro",
    steps: [
      "Open R|Trader Pro",
      "Go to Performance → Trade History",
      "Right-click the table → Export to CSV",
    ],
  },
  generic: {
    label: "Any platform",
    steps: [
      "Export your trade history as CSV from your platform",
      "Required columns: Symbol/Instrument, Entry Price, Quantity, Entry Date",
      "Optional: Exit Price, Exit Date, P/L, Commission, Side/Direction",
    ],
  },
};

const PLATFORM_COLORS = {
  ninjatrader: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300",
  tradovate:   "bg-blue-50   dark:bg-blue-900/20   border-blue-200   dark:border-blue-800   text-blue-800   dark:text-blue-300",
  topstepx:    "bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800  text-green-800  dark:text-green-300",
  rithmic:     "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300",
  generic:     "bg-gray-50   dark:bg-gray-700/50   border-gray-200   dark:border-gray-600   text-gray-800   dark:text-gray-300",
};

const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n ?? 0);

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function CsvImportModal({ isOpen, onClose, onImported }) {
  const { importTrades } = useTrades();

  const [phase, setPhase] = useState("idle"); // idle | parsing | preview | importing | done
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState(null);   // { trades, format, warnings }
  const [result, setResult] = useState(null);   // { imported, skipped }
  const [error, setError] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState("ninjatrader");
  const fileInputRef = useRef(null);

  const reset = () => {
    setPhase("idle");
    setDragOver(false);
    setFileName("");
    setParsed(null);
    setResult(null);
    setError("");
    setShowGuide(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback(async (file) => {
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      setError("Unsupported file type. Please upload a CSV or Excel file.");
      return;
    }

    setFileName(file.name);
    setError("");
    setPhase("parsing");

    try {
      const result = await parseCSVFile(file);
      if (result.trades.length === 0) {
        setError("No valid trades found in this file. Check the format guide below.");
        setPhase("idle");
        return;
      }
      setParsed(result);
      setPhase("preview");
    } catch (err) {
      setError(err.message || "Failed to parse file.");
      setPhase("idle");
    }
  }, []);

  const handleFileInput = (e) => processFile(e.target.files[0]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setPhase("importing");
    try {
      const count = await importTrades(parsed.trades);
      const skipped = parsed.trades.length - count;
      setResult({ imported: count, skipped });
      setPhase("done");
      if (count > 0) {
        if (typeof onImported === "function") onImported();
        toast.success(`Imported ${count} trade${count !== 1 ? "s" : ""}`);
      } else {
        toast.info("All trades already existed — nothing new to import.");
      }
    } catch (err) {
      setError(err.message || "Import failed.");
      setPhase("preview");
    }
  };

  if (!isOpen) return null;

  const guide = PLATFORM_GUIDES[selectedGuide] ?? PLATFORM_GUIDES.generic;

  return (
    <ModalPortal>
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
      data-testid="csv-import-modal"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Import from CSV</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            data-testid="csv-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── IDLE / PARSING — drop zone ─────────────────────────────── */}
          {(phase === "idle" || phase === "parsing") && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/40"
                }`}
                data-testid="csv-drop-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileInput}
                  className="hidden"
                  data-testid="csv-file-input"
                />
                {phase === "parsing" ? (
                  <>
                    <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-gray-700 dark:text-gray-300 font-medium">Parsing {fileName}…</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-700 dark:text-gray-200 font-medium mb-1">
                      Drop your export file here, or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Supports: NinjaTrader, Tradovate, TopstepX, Rithmic, or any CSV
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">.csv, .xlsx, .xls</p>
                  </>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2 text-sm text-red-700 dark:text-red-400" data-testid="csv-error-banner">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* How to export guide */}
              <div>
                <button
                  onClick={() => setShowGuide((v) => !v)}
                  className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Info className="w-4 h-4" />
                  <span>How to export from your platform</span>
                  {showGuide ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showGuide && (
                  <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                      {Object.entries(PLATFORM_GUIDES).map(([key, g]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedGuide(key)}
                          className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                            selectedGuide === key
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                    <ol className="p-4 space-y-1.5 list-decimal list-inside bg-gray-50 dark:bg-gray-700/30">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PREVIEW ────────────────────────────────────────────────── */}
          {phase === "preview" && parsed && (
            <>
              {/* Detected format badge */}
              <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border text-sm font-medium ${PLATFORM_COLORS[parsed.format] ?? PLATFORM_COLORS.generic}`}>
                <FileText className="w-4 h-4" />
                <span>Detected: {PLATFORM_LABELS[parsed.format] ?? parsed.format}</span>
              </div>

              {/* Summary row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="csv-preview-total">
                    {parsed.trades.length}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Trades found</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {new Set(parsed.trades.map((t) => t.instrument)).size}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Instruments</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <div className={`text-2xl font-bold ${parsed.trades.reduce((s, t) => s + t.pnl, 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {formatCurrency(parsed.trades.reduce((s, t) => s + t.pnl, 0))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total P&L</div>
                </div>
              </div>

              {/* Warnings */}
              {parsed.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg" data-testid="csv-warnings">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      {parsed.warnings.length} warning{parsed.warnings.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                    {parsed.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
                    {parsed.warnings.length > 5 && <li>…and {parsed.warnings.length - 5} more</li>}
                  </ul>
                </div>
              )}

              {/* Trade preview table */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Preview (first {Math.min(5, parsed.trades.length)} of {parsed.trades.length})
                </h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-700/60">
                      <tr>
                        {["Instrument", "Direction", "Qty", "Entry", "Exit", "Date", "P&L"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {parsed.trades.slice(0, 5).map((t, i) => (
                        <tr key={i} className="bg-white dark:bg-gray-800">
                          <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">{t.instrument}</td>
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${t.direction === "long" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{t.quantity}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{t.entryPrice?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{t.exitPrice?.toLocaleString() ?? "—"}</td>
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{formatDate(t.entryDate)}</td>
                          <td className={`px-3 py-2 font-medium whitespace-nowrap ${t.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                            {formatCurrency(t.pnl)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={reset}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  ← Choose different file
                </button>
                <button
                  onClick={handleImport}
                  className="btn btn-primary flex items-center space-x-2"
                  data-testid="csv-import-confirm-btn"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import {parsed.trades.length} Trade{parsed.trades.length !== 1 ? "s" : ""}</span>
                </button>
              </div>
            </>
          )}

          {/* ── IMPORTING ─────────────────────────────────────────────── */}
          {phase === "importing" && (
            <div className="text-center py-10">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-3" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">Importing trades…</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This only takes a moment</p>
            </div>
          )}

          {/* ── DONE ──────────────────────────────────────────────────── */}
          {phase === "done" && result && (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto" />
              <div>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="csv-import-result">
                  {result.imported > 0
                    ? `${result.imported} trade${result.imported !== 1 ? "s" : ""} imported`
                    : "Nothing new to import"}
                </p>
                {result.skipped > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {result.skipped} already existed and were skipped
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center space-x-3">
                <button onClick={reset} className="btn btn-secondary text-sm">
                  Import another file
                </button>
                <button onClick={handleClose} className="btn btn-primary text-sm">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
