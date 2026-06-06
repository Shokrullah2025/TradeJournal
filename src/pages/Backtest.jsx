import React, { useState, useEffect, useRef, Component } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronRight,
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
} from "lucide-react";
import { useBacktest } from "../context/BacktestContext";
import BacktestChart from "../components/trades/BacktestChart";
import { fetchMarketCandles } from "../utils/marketData";
import { useTemplates } from "../hooks/useTemplates";
import { useUserSettings } from "../hooks/useUserSettings";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
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
  if (!candles || candles.length < 2) return 44;
  const sec = candles[1].time - candles[0].time;
  if (sec <=    60) return 120; // 1m  → 2 h
  if (sec <=   300) return  48; // 5m  → 4 h
  if (sec <=   900) return  32; // 15m → 8 h
  if (sec <=  1800) return  24; // 30m → 12 h
  if (sec <=  3600) return  72; // 1h  → 3 d
  if (sec <= 14400) return  42; // 4h  → 1 wk
  return 44;                    // 1d  → 2 mo
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

function HistoryModal({ session, onClose }) {
  const trades = session.trades || [];
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{session.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {session.instrumentName} · {session.timeframe?.toUpperCase()} · {session.strategy} · {session.setup}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 divide-x divide-gray-200 dark:divide-gray-700 border-b border-gray-200 dark:border-gray-700">
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
            <div key={label} className="p-4 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
              <p className={`text-base font-bold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {trades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No trades recorded for this session</p>
              <p className="text-xs mt-1">Trades are saved when you leave the backtest view</p>
            </div>
          ) : (
            <table className="w-full text-sm">
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
  );
}

const Backtest = () => {
  const { user } = useAuth();
  const { sessions, createSession, getSession } = useBacktest();

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

  // Session and Setup States
  const [currentView, setCurrentView] = useState("sessions");
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionName, setSessionName] = useState("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    // Default to today's date
    return new Date().toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(""); // Start empty so user can select

  // Session history — loaded from DB, persists across devices
  const [sessionHistory, setSessionHistory] = useState([]);
  const [historyModal, setHistoryModal] = useState(null); // session obj with .trades when open

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("backtest_sessions")
      .select("id, name, parameters, results, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSessionHistory(data.map((row) => ({
          id:              row.id,
          name:            row.name,
          market:          row.parameters?.market,
          symbol:          row.parameters?.symbol,
          instrumentName:  row.parameters?.instrumentName,
          timeframe:       row.parameters?.timeframe,
          strategy:        row.parameters?.strategy,
          setup:           row.parameters?.setup,
          createdAt:       row.created_at,
          initialBalance:  row.parameters?.initialBalance,
          endingBalance:   row.results?.endingBalance ?? null,
          trades:          row.results?.trades ?? [],
        })));
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
            break;
          case "endDate":
            setEndDate(value);
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
  // Tracks the balance when the current session started (used by Reset button)
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

  // Drawing tools
  const [drawingMode, setDrawingMode] = useState(null);
  // History stack for undo/redo — each entry is a snapshot of the drawings array
  const [drawingsHistory, setDrawingsHistory] = useState([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const userDrawings = drawingsHistory[historyIdx] ?? [];
  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < drawingsHistory.length - 1;

  // Chart layout: "single" | "2col" | "3col"
  const [chartLayout, setChartLayout] = useState("single");
  const [chartData2, setChartData2] = useState([]);
  const [isLoadingData2, setIsLoadingData2] = useState(false);
  const [chartData3, setChartData3] = useState([]);
  const [isLoadingData3, setIsLoadingData3] = useState(false);
  // Symbols currently loaded in extra chart slots
  const [chart2Symbol, setChart2Symbol] = useState(null);
  const [chart3Symbol, setChart3Symbol] = useState(null);
  // Synced candle indices for extra charts
  const [currentCandle2, setCurrentCandle2] = useState(0);
  const [currentCandle3, setCurrentCandle3] = useState(0);

  // Sidebar & fullscreen
  const [showSidebar, setShowSidebar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartContainerRef = useRef(null);

  // Layout sync settings
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [syncCursor, setSyncCursor] = useState(false);
  const [syncTimeframe, setSyncTimeframe] = useState(false);
  const layoutMenuRef = useRef(null);

  // Asset search — chartSearchOpen = null | 1 | 2 | 3 (which chart's search is open)
  const [chartSearchOpen, setChartSearchOpen] = useState(null);
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const searchDropdownRef = useRef(null);

  // Draggable order panel
  const [panelPos, setPanelPos] = useState({ x: 10, y: 10 });
  const isDraggingPanel = useRef(false);
  const dragOrigin = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Push a new drawings snapshot onto the history stack
  const pushDrawings = (next) => {
    setDrawingsHistory((prev) => {
      const trimmed = prev.slice(0, historyIdx + 1);
      return [...trimmed, next];
    });
    setHistoryIdx((i) => i + 1);
  };
  const undo = () => { if (canUndo) setHistoryIdx((i) => i - 1); };
  const redo = () => { if (canRedo) setHistoryIdx((i) => i + 1); };

  useEffect(() => {
    const onMove = (e) => {
      if (!isDraggingPanel.current) return;
      setPanelPos({
        x: dragOrigin.current.px + (e.clientX - dragOrigin.current.mx),
        y: dragOrigin.current.py + (e.clientY - dragOrigin.current.my),
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

  // Sync cursor: when main chart candle changes, find matching timestamp in extra charts
  useEffect(() => {
    if (!syncCursor) return;
    const ts = chartData[currentCandle]?.time;
    if (ts == null) return;
    if (chartData2.length > 0) {
      // Find the last candle in chart2 whose time <= ts (so it mirrors the cut position)
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
  }, [syncCursor, currentCandle, chartData, chartData2, chartData3]);

  // Close layout menu / search on outside click
  useEffect(() => {
    const handler = (e) => {
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target))
        setShowLayoutMenu(false);
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target))
        setChartSearchOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
      // Chart 1 search adds to the next available extra slot
      const useSlot = chartData2.length === 0 ? 2 : 3;
      chartNum = useSlot;
    }

    if (chartNum === 2) {
      setIsLoadingData2(true);
      try {
        const candles = await fetchMarketCandles(currentSession?.market ?? selectedMarket, symbol, timeframe);
        setChartData2(candles);
        setChart2Symbol(symbol);
        setCurrentCandle2(candles.length - 1);
        if (chartLayout === "single") setChartLayout("2col");
      } catch { toast.error(`Failed to load ${symbol}`); }
      finally { setIsLoadingData2(false); }
    } else {
      setIsLoadingData3(true);
      try {
        const candles = await fetchMarketCandles(currentSession?.market ?? selectedMarket, symbol, timeframe);
        setChartData3(candles);
        setChart3Symbol(symbol);
        setCurrentCandle3(candles.length - 1);
        if (chartLayout !== "3col") setChartLayout("3col");
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
        closedTrades.push({ ...pos, exitPrice, pnl, exitReason });
      } else {
        const currentPnL = pos.side === "buy"
          ? (candle.close - pos.entryPrice) * pos.size * pos.tickRatio
          : (pos.entryPrice - candle.close) * pos.size * pos.tickRatio;
        stillOpen.push({ ...pos, currentPnL });
      }
    });

    return { stillOpen, closedTrades, balanceDelta };
  };

  // Apply closed-trade results — called after processPositionsForCandle
  const applyClosedTrades = (closedTrades, balanceDelta) => {
    if (closedTrades.length === 0) return;
    setBalance((b) => b + balanceDelta);
    setTrades((t) => [...t, ...closedTrades]);
    closedTrades.forEach((trade) => {
      if (trade.pnl > 0) toast.success(`${trade.exitReason}: +$${trade.pnl.toFixed(2)}`);
      else toast.error(`${trade.exitReason}: $${trade.pnl.toFixed(2)}`);
    });
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
          },
          results: { trades: [], endingBalance: null },
          status: "running",
        })
        .select("id")
        .single();

      if (!insertErr && inserted?.id) newSession.id = inserted.id;
    }

    setCurrentSession(newSession);
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
        createdAt:      newSession.createdAt,
        initialBalance: sessionBalance,
        endingBalance:  null,
        trades:         [],
      },
      ...prev.slice(0, 19),
    ]);

    try {
      const candles = await fetchMarketCandles(
        selectedMarket,
        selectedInstruments[0],
        timeframe,
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
          const candles2 = await fetchMarketCandles(selectedMarket, selectedInstruments[1], timeframe);
          setChartData2(candles2);
          setChart2Symbol(selectedInstruments[1]);
          setCurrentCandle2(candles2.length - 1);
        } catch { /* second chart is optional */ } finally {
          setIsLoadingData2(false);
        }
        if (selectedInstruments.length > 2) {
          setIsLoadingData3(true);
          try {
            const candles3 = await fetchMarketCandles(selectedMarket, selectedInstruments[2], timeframe);
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

  // Trading logic — reads positionsRef directly so no state is read inside an updater
  // (StrictMode double-invokes updater functions; calling setTrades inside setPositions's
  //  updater caused every closed trade to be added twice)
  useEffect(() => {
    if (isPlaying && currentCandle < chartData.length - 1) {
      intervalRef.current = setInterval(() => {
        const prev = currentCandleRef.current;
        if (prev >= chartData.length - 1) { setIsPlaying(false); return; }
        const nextIdx = prev + 1;
        const candle = chartData[nextIdx];
        currentCandleRef.current = nextIdx;
        setCurrentCandle(nextIdx);
        setCurrentPrice(candle.close);
        const { stillOpen, closedTrades, balanceDelta } = processPositionsForCandle(candle, positionsRef.current);
        setPositions(stillOpen);
        applyClosedTrades(closedTrades, balanceDelta);
      }, 1000 / speed);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, chartData.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlay = () => {
    if (currentCandle >= chartData.length - 1) return; // at end — button should be disabled
    setIsPlaying((p) => !p);
  };

  const handleStepForward = () => {
    if (currentCandle >= chartData.length - 1) return;
    const next = currentCandle + 1;
    const candle = chartData[next];
    setCurrentCandle(next);
    setCurrentPrice(candle.close);
    const { stillOpen, closedTrades, balanceDelta } = processPositionsForCandle(candle, positionsRef.current);
    setPositions(stillOpen);
    applyClosedTrades(closedTrades, balanceDelta);
  };

  const handleReset = () => {
    setIsPlaying(false);
    const win = defaultWindowCandles(chartData);
    const start = Math.min(win, chartData.length - 1);
    setCurrentCandle(start);
    setCurrentPrice(chartData[start]?.close || 0);
    setPositions([]);
    setTrades([]);
    setBalance(sessionStartBalanceRef.current ?? baseBalance); // restore to session start balance
  };

  const handleCandleSeek = (idx) => {
    setIsPlaying(false);
    setCurrentCandle(idx);
    setCurrentPrice(chartData[idx]?.close || 0);
  };

  const handleStepBack = () => {
    if (currentCandle <= 0) return;
    const prev = currentCandle - 1;
    setCurrentCandle(prev);
    setCurrentPrice(chartData[prev]?.close || 0);
    setIsPlaying(false);
  };

  // seekDate: the date the user has typed into the date picker
  const [seekDate, setSeekDate] = useState("");

  const handleCut = () => {
    if (!chartData.length) return;
    setIsPlaying(false);
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

    // Sync cut to extra charts when cursor sync is enabled
    if (syncCursor) {
      if (chartData2.length > 0) setCurrentCandle2(findIdx(chartData2));
      if (chartData3.length > 0) setCurrentCandle3(findIdx(chartData3));
    }
  };

  const handleTimeframeChange = async (newTf) => {
    if (newTf === timeframe || isLoadingData || !currentSession) return;
    // Preserve the timestamp of the current cut position
    const currentTs = chartData[currentCandle]?.time ?? null;
    setIsPlaying(false);
    setCurrentCandle(0);
    setChartData([]);
    setTimeframe(newTf);
    setIsLoadingData(true);
    // Clear cache so we re-fetch with new timeframe
    const cacheKey = `chart_${currentSession.market}_${currentSession.instrument.symbol}_${newTf}`;
    sessionStorage.removeItem(cacheKey);
    try {
      const candles = await fetchMarketCandles(
        currentSession.market,
        currentSession.instrument.symbol,
        newTf,
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

      // Sync timeframe: reload extra charts with the new timeframe
      if (syncTimeframe) {
        const refTs = candles[newIdx]?.time ?? null;
        if (chart2Symbol && (chartData2.length > 0 || chartLayout !== "single")) {
          setIsLoadingData2(true);
          try {
            const c2 = await fetchMarketCandles(currentSession.market, chart2Symbol, newTf);
            setChartData2(c2);
            if (refTs !== null) {
              let i2 = c2.length - 1;
              for (let i = 0; i < c2.length; i++) { if (c2[i].time > refTs) { i2 = Math.max(0, i - 1); break; } }
              setCurrentCandle2(i2);
            } else { setCurrentCandle2(c2.length - 1); }
          } catch { /* non-fatal */ } finally { setIsLoadingData2(false); }
        }
        if (chart3Symbol && (chartData3.length > 0 || chartLayout === "3col")) {
          setIsLoadingData3(true);
          try {
            const c3 = await fetchMarketCandles(currentSession.market, chart3Symbol, newTf);
            setChartData3(c3);
            if (refTs !== null) {
              let i3 = c3.length - 1;
              for (let i = 0; i < c3.length; i++) { if (c3[i].time > refTs) { i3 = Math.max(0, i - 1); break; } }
              setCurrentCandle3(i3);
            } else { setCurrentCandle3(c3.length - 1); }
          } catch { /* non-fatal */ } finally { setIsLoadingData3(false); }
        }
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  const updatePosition = (posId, field, value) => {
    setPositions((prev) =>
      prev.map((p) =>
        p.id === posId ? { ...p, [field]: value !== "" && value !== null ? parseFloat(value) : null } : p
      )
    );
  };

  const openOrderPanel = (side) => {
    setOrderSide(side);
    setPanelPos({ x: 10, y: 10 });
    setShowOrderPanel(true);
  };

  const executeOrder = () => {
    if (!currentSession) return;
    const instrument = currentSession.instrument;
    const tickRatio = instrument.tickValue / instrument.tickSize;
    const entryPrice = currentPrice;

    const position = {
      id: Date.now(),
      side: orderSide,
      size: orderSize,
      entryPrice,
      stopLoss: useStopLoss && stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: useTakeProfit && takeProfit ? parseFloat(takeProfit) : null,
      orderType,
      timestamp: chartData[currentCandle]?.time,
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

    toast.success(`${orderSide.toUpperCase()} ${orderSize} ${instrument.symbol} at $${entryPrice.toFixed(2)}`);
  };

  // Render views
  if (currentView === "sessions") {
    return (
      <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Backtest Sessions
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Create and manage your backtesting sessions
            </p>
          </div>

          <div className="mb-6 flex items-start gap-4 flex-wrap">
            <button
              onClick={() => setCurrentView("setup")}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Session
            </button>

            {/* Running account balance card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-5 py-3 flex items-center gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Account Balance</p>
                {isEditingBalance ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmBalanceChange();
                        if (e.key === "Escape") setIsEditingBalance(false);
                      }}
                      autoFocus
                      className="w-28 px-2 py-1 rounded border border-blue-500 outline-none text-sm font-mono bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={confirmBalanceChange}
                      className="px-2 py-1 rounded text-xs text-white font-medium"
                      style={{ background: "#089981" }}
                    >✓</button>
                    <button
                      onClick={() => setIsEditingBalance(false)}
                      className="px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBalanceInput(balance.toFixed(2)); setIsEditingBalance(true); }}
                    className="flex items-center gap-1.5 group"
                    title="Click to edit account balance"
                  >
                    <span className="text-lg font-bold text-gray-900 dark:text-white">
                      ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[160px]">
                Carries across all sessions. Click to reset.
              </p>
            </div>
          </div>

          {/* Session History */}
          {sessionHistory.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Sessions
              </h2>
              <div className="space-y-3">
                {sessionHistory.map((s) => {
                  const sessionPnl = s.endingBalance != null
                    ? s.endingBalance - s.initialBalance
                    : null;
                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setHistoryModal({ ...s, trades: s.trades || [] });
                      }}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{s.symbol}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {s.instrumentName} · {s.timeframe.toUpperCase()} · {s.strategy}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          ${s.initialBalance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {s.endingBalance != null && (
                            <span className="ml-2">
                              →{" "}
                              <span className={sessionPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}>
                                ${s.endingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </span>
                          )}
                        </p>
                        {sessionPnl != null && (
                          <p className={`text-xs font-semibold mt-0.5 ${sessionPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}>
                            {sessionPnl >= 0 ? "+" : ""}${sessionPnl.toFixed(2)} P&L
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {historyModal && (
        <HistoryModal session={historyModal} onClose={() => setHistoryModal(null)} />
      )}
      </>
    );
  }

  if (currentView === "setup") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => setCurrentView("sessions")}
              className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
              Back to Sessions
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Create Backtest Session
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure your backtesting environment and strategy
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            {/* Header Section */}
            <div className="bg-blue-600 dark:bg-blue-700 px-8 py-6 text-white">
              <h2 className="text-2xl font-bold mb-2">Session Configuration</h2>
              <p className="text-blue-100">
                Set up your trading environment and strategy for historical
                testing
              </p>
            </div>

            <div className="p-8 space-y-8">
              {/* Session Name & Template Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Session Name */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                {/* Template Quick Setup */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Quick Setup
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      Optional
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Use Template
                    </label>
                    <select
                      value={selectedTemplateId}
                      disabled={templatesLoading}
                      onChange={(e) => {
                        setSelectedTemplateId(e.target.value);
                        if (e.target.value) {
                          applyTemplate(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors disabled:opacity-60"
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Templates are saved to your account and available across all devices
                    </p>
                  </div>
                </div>
              </div>

              {/* Market & Instrument Selection */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Instruments * <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(select one or more)</span>
                      </label>
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
                                setSelectedInstruments((prev) =>
                                  isSelected
                                    ? prev.filter((s) => s !== instrument.symbol)
                                    : [...prev, instrument.symbol]
                                )
                              }
                              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                isSelected
                                  ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:border-blue-400"
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
                        Selected: {selectedInstruments.join(", ")} · Chart loads {selectedInstruments[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trading Strategy & Setup */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Strategy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                        <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" />
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
                  <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Additional Settings
                  </h3>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
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
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                      />
                    </div>
                  </div>

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
                    className="flex items-center justify-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
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
      <div
        ref={chartContainerRef}
        className="-mx-6 -my-6 flex-1 flex flex-col overflow-hidden"
        style={{ background: theme.bg, color: theme.text }}
      >
        {/* ── Top bar — TradingView light toolbar style ── */}
        <div
          className="flex items-center justify-between px-4 py-1.5 flex-shrink-0 border-b"
          style={{ background: theme.surface, borderColor: theme.border }}
        >
          <div className="flex items-center space-x-4 min-w-0">
            <button
              onClick={() => {
                if (currentSession) {
                  // Persist running balance locally (used to pre-fill next session)
                  localStorage.setItem("backtestRunningBalance", balance.toString());
                  // Save trades + ending balance to DB and update local history state
                  supabase
                    .from("backtest_sessions")
                    .update({ results: { trades, endingBalance: balance }, status: "completed" })
                    .eq("id", currentSession.id)
                    .then(({ error }) => {
                      if (error) console.error("[Backtest] session save error:", error.message);
                    });
                  setSessionHistory((prev) =>
                    prev.map((s) =>
                      s.id === currentSession.id ? { ...s, endingBalance: balance, trades } : s
                    )
                  );
                }
                setCurrentView("sessions");
              }}
              className="text-xs transition-colors flex-shrink-0"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              ← Sessions
            </button>
            <div className="h-4 w-px flex-shrink-0" style={{ background: theme.border }} />
            <div className="flex items-baseline gap-1.5 min-w-0">
              <span className="font-bold text-sm flex-shrink-0" style={{ color: theme.text }}>
                {currentSession.instrument?.symbol}
              </span>
              <span className="text-xs hidden sm:block truncate" style={{ color: theme.textMuted }}>
                {currentSession.instrument?.name}
              </span>
              <span className="text-xs hidden md:block flex-shrink-0" style={{ color: "#b2b5be" }}>
                · {currentSession.instrument?.exchange}
              </span>
            </div>
            {currentPrice > 0 && (
              <span
                className="font-mono font-semibold text-base flex-shrink-0"
                style={{ color: theme.text }}
              >
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3 text-xs flex-shrink-0">
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
                {pnlPositive ? "+" : ""}${pnl.toFixed(2)}
              </span>
            </div>
            {/* Buy / Sell buttons — in the top bar */}
            {!isLoadingData && chartData.length > 0 && (
              <>
                <button
                  onClick={() => openOrderPanel("buy")}
                  className="px-3 py-1 rounded text-xs font-bold transition-colors"
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
          {/* Timeframe buttons */}
          {["1m", "5m", "15m", "30m", "1h", "4h", "1d"].map((tf) => (
            <button
              key={tf}
              onClick={() => handleTimeframeChange(tf)}
              disabled={isLoadingData}
              className="px-2 py-1 text-xs rounded-sm transition-colors disabled:opacity-40 font-medium flex-shrink-0"
              style={
                timeframe === tf
                  ? { background: "#e8f0fe", color: "#1E53E5", borderRadius: 3 }
                  : { color: theme.textMuted }
              }
              onMouseEnter={(e) => {
                if (timeframe !== tf) {
                  e.currentTarget.style.color = theme.text;
                  e.currentTarget.style.background = theme.bg;
                }
              }}
              onMouseLeave={(e) => {
                if (timeframe !== tf) {
                  e.currentTarget.style.color = theme.textMuted;
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              {tf === "1d" ? "D" : tf.toUpperCase()}
            </button>
          ))}

          <div className="h-4 w-px mx-2 flex-shrink-0" style={{ background: theme.border }} />

          {/* ── Replay controls ── */}

          {/* Previous candle */}
          <button
            onClick={handleStepBack}
            disabled={isLoadingData || !chartData.length || currentCandle <= 0}
            title="Previous candle"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors disabled:opacity-40 flex-shrink-0 font-medium"
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
            <SkipBack className="w-3.5 h-3.5" />
            Prev
          </button>

          {/* Play / Pause */}
          <button
            onClick={handlePlay}
            disabled={isLoadingData || !chartData.length || (!isPlaying && currentCandle >= chartData.length - 1)}
            title={isPlaying ? "Pause" : currentCandle >= chartData.length - 1 ? "At last candle — use Reset to replay" : "Play forward"}
            className="flex items-center px-3 py-1 text-xs rounded font-medium transition-colors disabled:opacity-40 flex-shrink-0"
            style={{ background: "#1E53E5", color: "#ffffff" }}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

          {/* Next candle */}
          <button
            onClick={handleStepForward}
            disabled={isLoadingData || !chartData.length || currentCandle >= chartData.length - 1}
            title="Next candle"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors disabled:opacity-40 flex-shrink-0 font-medium"
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
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            disabled={isLoadingData}
            title="Reset to start"
            className="flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors disabled:opacity-40 flex-shrink-0"
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
            <RotateCcw className="w-3 h-3" />
          </button>

          <div className="h-4 w-px mx-2 flex-shrink-0" style={{ background: theme.border }} />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo last drawing"
            className="flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors disabled:opacity-30 flex-shrink-0"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => { if (canUndo) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; } }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo drawing"
            className="flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors disabled:opacity-30 flex-shrink-0"
            style={{ color: theme.textMuted }}
            onMouseEnter={(e) => { if (canRedo) { e.currentTarget.style.color = theme.text; e.currentTarget.style.background = theme.bg; } }}
            onMouseLeave={(e) => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.background = "transparent"; }}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px mx-2 flex-shrink-0" style={{ background: theme.border }} />

          {/* ── Cut by date ── */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: "#b2b5be" }} />
            <input
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
              onClick={handleCut}
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

          <div className="h-4 w-px mx-2 flex-shrink-0" style={{ background: theme.border }} />

          {/* Speed */}
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="text-xs rounded px-2 py-1 border flex-shrink-0"
            style={{ background: theme.surface, color: theme.text, borderColor: "#d1d4dc" }}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
            <option value={8}>8×</option>
          </select>

          <div className="h-4 w-px flex-shrink-0" style={{ background: theme.border }} />

          {/* Indicators button + dropdown */}
          <div className="relative flex-shrink-0 ml-1" ref={indicatorPanelRef}>
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

            {showIndicatorPanel && (
              <div
                className="absolute left-0 top-full mt-1 rounded-lg shadow-xl border z-50 py-2 min-w-[200px]"
                style={{ background: theme.surface, borderColor: theme.border }}
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
            )}
          </div>

        </div>{/* end scrollable toolbar */}

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
          </div>
        </div>{/* end outer toolbar */}

        {/* ── Main content: chart + side panel ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Inner row: [drawing toolbar | chart area] */}
            <div className="flex-1 flex overflow-hidden">

              {/* Drawing toolbar — always visible, TradingView-style left panel */}
              <div
                className="flex flex-col items-center py-2 px-1 border-r flex-shrink-0 gap-0.5 overflow-y-auto"
                style={{
                  background: theme.surface,
                  borderColor: theme.border,
                  width: 44,
                  opacity: chartData.length === 0 ? 0.35 : 1,
                  pointerEvents: chartData.length === 0 ? "none" : "auto",
                }}
              >
                {/* Cursor */}
                <button
                  onClick={() => setDrawingMode(null)}
                  title="Cursor (default)"
                  className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                  style={{ background: drawingMode === null ? "#e8f0fe" : "transparent", color: drawingMode === null ? "#1E53E5" : theme.textMuted }}
                >
                  <MousePointer2 className="w-4 h-4" />
                </button>

                <div className="w-6 h-px my-1" style={{ background: theme.border }} />

                {/* Line tools */}
                {[
                  { mode: "trendline",  Icon: TrendingUp,        title: "Trend Line" },
                  { mode: "hline",      Icon: Minus,             title: "Horizontal Line" },
                  { mode: "vline",      Icon: SeparatorVertical, title: "Vertical Line" },
                ].map(({ mode, Icon, title }) => (
                  <button
                    key={mode}
                    onClick={() => setDrawingMode((prev) => prev === mode ? null : mode)}
                    title={title}
                    className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                    style={{ background: drawingMode === mode ? "#e8f0fe" : "transparent", color: drawingMode === mode ? "#1E53E5" : theme.textMuted }}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}

                <div className="w-6 h-px my-1" style={{ background: theme.border }} />

                {/* Eraser */}
                <button
                  onClick={() => setDrawingMode((prev) => prev === "eraser" ? null : "eraser")}
                  title="Eraser — click a drawing to delete it"
                  className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                  style={{ background: drawingMode === "eraser" ? "#fff3e0" : "transparent", color: drawingMode === "eraser" ? "#f7a600" : theme.textMuted }}
                >
                  <Eraser className="w-4 h-4" />
                </button>

                {/* Spacer pushes trash to bottom */}
                <div className="flex-1" />

                {userDrawings.length > 0 && (
                  <>
                    <div className="w-6 h-px" style={{ background: theme.border }} />
                    <button
                      onClick={() => pushDrawings([])}
                      title="Clear all drawings"
                      className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                      style={{ color: theme.textMuted }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f23645")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>

              {/* Chart area */}
              <div className="flex-1 relative overflow-hidden">

              {/* Chart 1 instrument label + search — top-left overlay */}
              <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5" ref={chartSearchOpen === 1 ? searchDropdownRef : null}>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                  style={{ background: isDark ? "rgba(19,23,34,0.85)" : "rgba(255,255,255,0.85)", color: theme.text, border: `1px solid ${theme.border}`, backdropFilter: "blur(4px)" }}
                >
                  <span>{currentSession.instrument?.symbol}</span>
                  <button
                    onClick={() => { setChartSearchOpen((v) => v === 1 ? null : 1); setAssetSearchQuery(""); }}
                    title="Search for an asset to add"
                    className="flex items-center justify-center w-4 h-4 rounded transition-colors"
                    style={{ color: chartSearchOpen === 1 ? "#1E53E5" : theme.textMuted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#1E53E5")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = chartSearchOpen === 1 ? "#1E53E5" : theme.textMuted)}
                  >
                    <Search className="w-3 h-3" />
                  </button>
                </div>
                {chartSearchOpen === 1 && (
                  <div
                    className="absolute left-0 top-full mt-1 rounded-lg shadow-xl border z-50 overflow-hidden"
                    style={{ background: theme.surface, borderColor: theme.border, width: 240 }}
                  >
                    <div className="p-2 border-b" style={{ borderColor: theme.border }}>
                      <input autoFocus type="text" placeholder="Add chart 2 or 3 instrument…"
                        value={assetSearchQuery} onChange={(e) => setAssetSearchQuery(e.target.value)}
                        className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                        style={{ background: theme.bg, color: theme.text, borderColor: theme.border }}
                      />
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                      {filteredInstruments.length === 0
                        ? <p className="text-xs px-3 py-3" style={{ color: "#b2b5be" }}>No results</p>
                        : filteredInstruments.map((inst) => (
                          <button key={`${inst.market}-${inst.symbol}`}
                            onClick={() => handleAssetSearchSelectFor(1, inst.market, inst.symbol)}
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

              {isLoadingData ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center"
                  style={{ background: theme.bg }}
                >
                  <Loader2
                    className="w-8 h-8 animate-spin mb-3"
                    style={{ color: "#1E53E5" }}
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
                    positions={positions}
                    onPositionUpdate={updatePosition}
                    orderPreview={showOrderPanel ? {
                      side: orderSide,
                      entryPrice: currentPrice,
                      takeProfit: useTakeProfit && takeProfit !== "" ? parseFloat(takeProfit) : null,
                      stopLoss: useStopLoss && stopLoss !== "" ? parseFloat(stopLoss) : null,
                    } : null}
                    onOrderPreviewUpdate={(field, value) => {
                      if (field === "takeProfit") setTakeProfit(String(value));
                      if (field === "stopLoss") setStopLoss(String(value));
                    }}
                    drawingMode={drawingMode}
                    userDrawings={userDrawings}
                    onDrawingAdd={(drawing) =>
                      pushDrawings([...userDrawings, { ...drawing, id: Date.now() }])
                    }
                    onDrawingDelete={(id) =>
                      pushDrawings(userDrawings.filter((d) => d.id !== id))
                    }
                  />
                </ChartErrorBoundary>
              )}

              {/* ── Order panel — draggable, floats over chart ── */}
              {showOrderPanel && (
                <div
                  className="absolute z-30 flex flex-col shadow-2xl rounded-lg border overflow-hidden"
                  style={{
                    width: 280,
                    maxHeight: "calc(100% - 20px)",
                    top: panelPos.y,
                    left: panelPos.x,
                    background: theme.surface,
                    borderColor: theme.border,
                    userSelect: "none",
                  }}
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
                    <span className="text-xs font-semibold select-none" style={{ color: theme.textMuted }}>Order Entry</span>
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
                      className="flex-1 p-3 text-left transition-colors"
                      style={{
                        background: orderSide === "sell" ? "#f23645" : theme.bg,
                        color: orderSide === "sell" ? "#fff" : theme.text,
                      }}
                    >
                      <div className="text-xs font-medium mb-0.5">Sell</div>
                      <div className="text-lg font-bold font-mono">{currentPrice > 0 ? (currentPrice - (currentSession?.instrument?.tickSize || 0.25)).toFixed(2) : "—"}</div>
                    </button>
                    <div className="flex flex-col items-center justify-center px-2" style={{ background: isDark ? "#131722" : "#e8e8e8", minWidth: 40 }}>
                      <span className="text-xs font-medium" style={{ color: theme.textMuted }}>
                        {((currentSession?.instrument?.tickSize || 0.25) * 2).toFixed(3)}
                      </span>
                    </div>
                    <button
                      onClick={() => setOrderSide("buy")}
                      className="flex-1 p-3 text-right transition-colors"
                      style={{
                        background: orderSide === "buy" ? "#1E53E5" : theme.bg,
                        color: orderSide === "buy" ? "#fff" : "#1E53E5",
                      }}
                    >
                      <div className="text-xs font-medium mb-0.5">Buy</div>
                      <div className="text-lg font-bold font-mono">{currentPrice > 0 ? (currentPrice + (currentSession?.instrument?.tickSize || 0.25)).toFixed(2) : "—"}</div>
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
                    {/* Size input */}
                    <div>
                      <label className="block text-xs mb-1.5 font-medium" style={{ color: theme.textMuted }}>Units</label>
                      <div className="flex rounded border" style={{ borderColor: "#1E53E5", background: theme.bg }}>
                        <input
                          type="number"
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
                              if (!useTakeProfit && currentPrice) {
                                const tickSize = currentSession?.instrument?.tickSize || 0.25;
                                const tp = orderSide === "buy"
                                  ? currentPrice + 20 * tickSize
                                  : currentPrice - 20 * tickSize;
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
                              step={currentSession?.instrument?.tickSize || 0.25}
                              className="w-full px-3 py-2 rounded text-sm border outline-none"
                              style={{ background: theme.bg, borderColor: "#089981", color: theme.text }}
                            />
                            {takeProfit && !isNaN(parseFloat(takeProfit)) && (
                              <p className="text-xs mt-1" style={{ color: "#089981" }}>
                                {Math.abs((parseFloat(takeProfit) - currentPrice) / (currentSession?.instrument?.tickSize || 0.25)).toFixed(0)} ticks from entry
                              </p>
                            )}
                            <div className="flex gap-1 mt-1.5">
                              {[5, 10, 20, 50].map((ticks) => (
                                <button
                                  key={ticks}
                                  onClick={() => {
                                    const ts = currentSession?.instrument?.tickSize || 0.25;
                                    // Add ticks onto the current TP value (additive), not from entry price
                                    const base = parseFloat(takeProfit) || currentPrice;
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
                              if (!useStopLoss && currentPrice) {
                                const tickSize = currentSession?.instrument?.tickSize || 0.25;
                                const sl = orderSide === "buy"
                                  ? currentPrice - 10 * tickSize
                                  : currentPrice + 10 * tickSize;
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
                              step={currentSession?.instrument?.tickSize || 0.25}
                              className="w-full px-3 py-2 rounded text-sm border outline-none"
                              style={{ background: theme.bg, borderColor: "#f23645", color: theme.text }}
                            />
                            {stopLoss && !isNaN(parseFloat(stopLoss)) && (
                              <p className="text-xs mt-1" style={{ color: "#f23645" }}>
                                {Math.abs((parseFloat(stopLoss) - currentPrice) / (currentSession?.instrument?.tickSize || 0.25)).toFixed(0)} ticks from entry
                              </p>
                            )}
                            <div className="flex gap-1 mt-1.5">
                              {[5, 10, 20, 50].map((ticks) => (
                                <button
                                  key={ticks}
                                  onClick={() => {
                                    const ts = currentSession?.instrument?.tickSize || 0.25;
                                    const base = parseFloat(stopLoss) || currentPrice;
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
                          {currentSession?.instrument?.tickValue?.toFixed(2) || "—"} USD
                        </span>
                      </div>
                      <div className="flex justify-between text-xs mt-1" style={{ color: "#787b86" }}>
                        <span>Est. value</span>
                        <span className="font-semibold" style={{ color: theme.text }}>
                          ${(currentPrice * orderSize).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                      {orderSide === "buy" ? "Buy" : "Sell"}<br />
                      <span className="text-xs font-normal opacity-90">
                        {orderSize} {currentSession?.instrument?.symbol} {orderType.toUpperCase()}
                      </span>
                    </button>
                  </div>
                </div>
              )}
              </div> {/* end chart area */}

              {/* Second chart — visible when layout is 2col or 3col */}
              {(chartLayout === "2col" || chartLayout === "3col") && chartData.length > 0 && (
                <div
                  className="flex-1 relative overflow-hidden border-l"
                  style={{ borderColor: theme.border }}
                >
                  {isLoadingData2 ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1E53E5" }} />
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
                        visibleCount={syncCursor ? currentCandle2 + 1 : chartData2.length}
                        indicators={indicators}
                        onCandleSeek={syncCursor ? (idx) => { setCurrentCandle2(idx); } : () => {}}
                        isPlaying={false}
                        isDark={isDark}
                        positions={[]}
                        onPositionUpdate={() => {}}
                        orderPreview={null}
                        onOrderPreviewUpdate={() => {}}
                        drawingMode={null}
                        userDrawings={[]}
                        onDrawingAdd={() => {}}
                        onDrawingDelete={() => {}}
                      />
                    </ChartErrorBoundary>
                  )}
                  {/* Chart 2 label + search */}
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5" ref={chartSearchOpen === 2 ? searchDropdownRef : null}>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: isDark ? "rgba(19,23,34,0.85)" : "rgba(255,255,255,0.85)", color: theme.text, border: `1px solid ${theme.border}`, backdropFilter: "blur(4px)" }}>
                      <span>{chart2Symbol ?? "Chart 2"}</span>
                      <button onClick={() => { setChartSearchOpen((v) => v === 2 ? null : 2); setAssetSearchQuery(""); }}
                        title="Change chart 2 asset" className="flex items-center justify-center w-4 h-4 rounded transition-colors"
                        style={{ color: chartSearchOpen === 2 ? "#1E53E5" : theme.textMuted }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#1E53E5")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = chartSearchOpen === 2 ? "#1E53E5" : theme.textMuted)}>
                        <Search className="w-3 h-3" />
                      </button>
                    </div>
                    {chartSearchOpen === 2 && (
                      <div className="absolute left-0 top-full mt-1 rounded-lg shadow-xl border z-50 overflow-hidden"
                        style={{ background: theme.surface, borderColor: theme.border, width: 240 }}>
                        <div className="p-2 border-b" style={{ borderColor: theme.border }}>
                          <input autoFocus type="text" placeholder="Search instrument…"
                            value={assetSearchQuery} onChange={(e) => setAssetSearchQuery(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                            style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} />
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                          {filteredInstruments.length === 0
                            ? <p className="text-xs px-3 py-3" style={{ color: "#b2b5be" }}>No results</p>
                            : filteredInstruments.map((inst) => (
                              <button key={`${inst.market}-${inst.symbol}`}
                                onClick={() => handleAssetSearchSelectFor(2, inst.market, inst.symbol)}
                                className="w-full flex items-center px-3 py-2 text-left gap-2 transition-colors"
                                style={{ background: "transparent" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
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
                </div>
              )}

              {/* Third chart — visible when layout is 3col */}
              {chartLayout === "3col" && chartData.length > 0 && (
                <div
                  className="flex-1 relative overflow-hidden border-l"
                  style={{ borderColor: theme.border }}
                >
                  {isLoadingData3 ? (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: theme.bg }}>
                      <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#1E53E5" }} />
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
                        visibleCount={syncCursor ? currentCandle3 + 1 : chartData3.length}
                        indicators={indicators}
                        onCandleSeek={syncCursor ? (idx) => { setCurrentCandle3(idx); } : () => {}}
                        isPlaying={false}
                        isDark={isDark}
                        positions={[]}
                        onPositionUpdate={() => {}}
                        orderPreview={null}
                        onOrderPreviewUpdate={() => {}}
                        drawingMode={null}
                        userDrawings={[]}
                        onDrawingAdd={() => {}}
                        onDrawingDelete={() => {}}
                      />
                    </ChartErrorBoundary>
                  )}
                  {/* Chart 3 label + search */}
                  <div className="absolute top-2 left-2 z-20 flex items-center gap-0.5" ref={chartSearchOpen === 3 ? searchDropdownRef : null}>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                      style={{ background: isDark ? "rgba(19,23,34,0.85)" : "rgba(255,255,255,0.85)", color: theme.text, border: `1px solid ${theme.border}`, backdropFilter: "blur(4px)" }}>
                      <span>{chart3Symbol ?? "Chart 3"}</span>
                      <button onClick={() => { setChartSearchOpen((v) => v === 3 ? null : 3); setAssetSearchQuery(""); }}
                        title="Change chart 3 asset" className="flex items-center justify-center w-4 h-4 rounded transition-colors"
                        style={{ color: chartSearchOpen === 3 ? "#1E53E5" : theme.textMuted }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#1E53E5")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = chartSearchOpen === 3 ? "#1E53E5" : theme.textMuted)}>
                        <Search className="w-3 h-3" />
                      </button>
                    </div>
                    {chartSearchOpen === 3 && (
                      <div className="absolute left-0 top-full mt-1 rounded-lg shadow-xl border z-50 overflow-hidden"
                        style={{ background: theme.surface, borderColor: theme.border, width: 240 }}>
                        <div className="p-2 border-b" style={{ borderColor: theme.border }}>
                          <input autoFocus type="text" placeholder="Search instrument…"
                            value={assetSearchQuery} onChange={(e) => setAssetSearchQuery(e.target.value)}
                            className="w-full text-xs px-2 py-1.5 rounded border outline-none"
                            style={{ background: theme.bg, color: theme.text, borderColor: theme.border }} />
                        </div>
                        <div className="overflow-y-auto" style={{ maxHeight: 200 }}>
                          {filteredInstruments.length === 0
                            ? <p className="text-xs px-3 py-3" style={{ color: "#b2b5be" }}>No results</p>
                            : filteredInstruments.map((inst) => (
                              <button key={`${inst.market}-${inst.symbol}`}
                                onClick={() => handleAssetSearchSelectFor(3, inst.market, inst.symbol)}
                                className="w-full flex items-center px-3 py-2 text-left gap-2 transition-colors"
                                style={{ background: "transparent" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = theme.bg)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
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
                </div>
              )}
            </div> {/* end inner flex row [toolbar | chart] */}
          </div> {/* end chart column */}

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

            {/* Open positions */}
            <div
              className="p-3 border-b flex-shrink-0"
              style={{ borderColor: theme.border }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#b2b5be" }}
              >
                Open Positions
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {positions.length === 0 ? (
                  <p className="text-xs py-2" style={{ color: "#b2b5be" }}>
                    No open positions
                  </p>
                ) : (
                  positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="rounded p-2 text-xs border"
                      style={{ background: theme.bg, borderColor: theme.border }}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold" style={{ color: pos.side === "buy" ? "#089981" : "#f23645" }}>
                          {pos.side.toUpperCase()} ×{pos.size}
                        </span>
                        <span style={{ color: pos.currentPnL >= 0 ? "#089981" : "#f23645" }}>
                          {pos.currentPnL >= 0 ? "+" : ""}${pos.currentPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="mb-1" style={{ color: theme.textMuted }}>
                        Entry ${pos.entryPrice.toFixed(2)}
                      </div>
                      {/* Editable TP */}
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="w-5 text-center font-bold" style={{ color: "#089981", fontSize: 9 }}>TP</span>
                        <input
                          type="number"
                          value={pos.takeProfit ?? ""}
                          onChange={(e) => updatePosition(pos.id, "takeProfit", e.target.value)}
                          placeholder="—"
                          step={currentSession?.instrument?.tickSize || 0.25}
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
                          onChange={(e) => updatePosition(pos.id, "stopLoss", e.target.value)}
                          placeholder="—"
                          step={currentSession?.instrument?.tickSize || 0.25}
                          className="flex-1 px-1 py-0.5 rounded border outline-none text-xs"
                          style={{ background: theme.surface, borderColor: pos.stopLoss !== null ? "#f23645" : theme.border, color: "#f23645", minWidth: 0 }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const candle = chartData[currentCandle];
                          const exitPrice = candle?.close || currentPrice;
                          const pnl = pos.side === "buy"
                            ? (exitPrice - pos.entryPrice) * pos.size * pos.tickRatio
                            : (pos.entryPrice - exitPrice) * pos.size * pos.tickRatio;
                          setPositions((prev) => prev.filter((p) => p.id !== pos.id));
                          setBalance((b) => b + pnl);
                          setTrades((t) => [...t, { ...pos, exitPrice, pnl, exitReason: "Manual" }]);
                        }}
                        className="text-xs w-full text-center py-0.5 rounded"
                        style={{ background: theme.border, color: "#787b86" }}
                      >
                        Close at Market
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trade history */}
            <div className="flex-1 p-3 flex flex-col overflow-hidden">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-2 flex-shrink-0"
                style={{ color: "#b2b5be" }}
              >
                Trade History
              </p>
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
                            {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div style={{ color: theme.textMuted }}>
                          {t.entryPrice.toFixed(2)} → {t.exitPrice.toFixed(2)}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
          )} {/* end showSidebar */}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
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
