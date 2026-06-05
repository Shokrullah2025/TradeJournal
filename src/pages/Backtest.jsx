import React, { useState, useEffect, useRef, Component } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Plus,
  ChevronRight,
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
} from "lucide-react";
import { useBacktest } from "../context/BacktestContext";
import BacktestChart from "../components/trades/BacktestChart";
import { fetchMarketCandles } from "../utils/marketData";
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

const Backtest = () => {
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
  const [selectedInstrument, setSelectedInstrument] = useState("");
  const [startDate, setStartDate] = useState(() => {
    // Default to today's date
    return new Date().toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(""); // Start empty so user can select
  const [initialBalance, setInitialBalance] = useState(100000);

  // Session history (localStorage)
  const [sessionHistory, setSessionHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("backtestHistory") || "[]"); } catch { return []; }
  });

  // Template states
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [settingsTemplates, setSettingsTemplates] = useState(() => {
    const stored = localStorage.getItem("tradeJournalTemplates");
    const templates = stored ? JSON.parse(stored) : [];
    // Add default templates if none exist
    if (templates.length === 0) {
      const defaultTemplates = [
        {
          id: 1,
          name: "Day Trade Long",
          description: "Standard day trading template for long positions",
          fields: {
            instrumentType: "Stocks",
            tradeType: "Long",
            strategy: "Day Trading",
            setup: "Breakout",
            marketCondition: "Trending Up",
            riskRewardRatio: "1:2",
            targetProfit: "500",
            maxLoss: "250",
          },
          isDefault: true,
          createdAt: "2025-07-01",
          usageCount: 45,
        },
        {
          id: 2,
          name: "Swing Trade",
          description: "Multi-day swing trading template",
          fields: {
            instrumentType: "Stocks",
            tradeType: "Long",
            strategy: "Swing Trading",
            setup: "Support Bounce",
            marketCondition: "Consolidating",
            riskRewardRatio: "1:3",
            targetProfit: "1000",
            maxLoss: "333",
          },
          isDefault: false,
          createdAt: "2025-07-05",
          usageCount: 23,
        },
      ];
      localStorage.setItem(
        "tradeJournalTemplates",
        JSON.stringify(defaultTemplates)
      );
      return defaultTemplates;
    }
    return templates;
  });

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

  // Get strategies and setups from localStorage (same as Settings page)
  const getUserStrategies = () => {
    const stored = localStorage.getItem("tradeJournalStrategies");
    return stored
      ? JSON.parse(stored)
      : ["Day Trading", "Swing Trading", "Scalp Trading"];
  };

  const getUserSetups = () => {
    const stored = localStorage.getItem("tradeJournalSetups");
    return stored
      ? JSON.parse(stored)
      : ["Breakout", "Support Bounce", "Pullback"];
  };

  const [userStrategies] = useState(getUserStrategies());
  const [userSetups] = useState(getUserSetups());

  // For session form (same as userStrategies/userSetups)
  const strategies = userStrategies;
  const setups = userSetups;

  // Template application function
  const applyTemplate = (templateId) => {
    if (!templateId) return;

    const numericTemplateId = parseInt(templateId);
    const template = settingsTemplates.find((t) => t.id === numericTemplateId);

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
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [takeProfit, setTakeProfit] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const intervalRef = useRef(null);

  // Helper: process SL/TP for a single candle — returns the still-open positions
  const processPositionsForCandle = (candle, openPositions, setBalanceFn, setTradesFn) => {
    const stillOpen = [];

    openPositions.forEach((pos) => {
      let closed = false;
      let exitPrice = candle.close;
      let exitReason = "";

      if (pos.side === "buy") {
        if (pos.stopLoss !== null && candle.low <= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = "SL";
          closed = true;
        } else if (pos.takeProfit !== null && candle.high >= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = "TP";
          closed = true;
        }
      } else {
        if (pos.stopLoss !== null && candle.high >= pos.stopLoss) {
          exitPrice = pos.stopLoss;
          exitReason = "SL";
          closed = true;
        } else if (pos.takeProfit !== null && candle.low <= pos.takeProfit) {
          exitPrice = pos.takeProfit;
          exitReason = "TP";
          closed = true;
        }
      }

      if (closed) {
        const pnl =
          pos.side === "buy"
            ? (exitPrice - pos.entryPrice) * pos.size * pos.tickRatio
            : (pos.entryPrice - exitPrice) * pos.size * pos.tickRatio;
        setBalanceFn((b) => b + pnl);
        setTradesFn((t) => [...t, { ...pos, exitPrice, pnl, exitReason }]);
        if (pnl > 0) toast.success(`${exitReason}: +$${pnl.toFixed(2)}`);
        else toast.error(`${exitReason}: $${pnl.toFixed(2)}`);
      } else {
        const currentPnL =
          pos.side === "buy"
            ? (candle.close - pos.entryPrice) * pos.size * pos.tickRatio
            : (pos.entryPrice - candle.close) * pos.size * pos.tickRatio;
        stillOpen.push({ ...pos, currentPnL });
      }
    });

    return stillOpen;
  };

  const handleCreateSession = async () => {
    if (
      !sessionName ||
      !selectedMarket ||
      !selectedInstrument ||
      !strategy ||
      !setup
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const sessionBalance = initialBalance || 100000;
    const instrument = MARKET_CONFIG[selectedMarket].instruments.find(
      (inst) => inst.symbol === selectedInstrument
    );

    const newSession = {
      id: Date.now().toString(),
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
    setCurrentSession(newSession);
    setCurrentView("backtest");

    // Save session to history in localStorage
    const savedSessions = JSON.parse(localStorage.getItem("backtestHistory") || "[]");
    savedSessions.unshift({
      id: newSession.id,
      name: newSession.name,
      market: newSession.market,
      symbol: instrument.symbol,
      instrumentName: instrument.name,
      timeframe,
      strategy,
      setup,
      createdAt: newSession.createdAt,
      initialBalance: sessionBalance,
    });
    // Keep last 20 sessions
    localStorage.setItem("backtestHistory", JSON.stringify(savedSessions.slice(0, 20)));
    setSessionHistory(savedSessions.slice(0, 20));

    try {
      const candles = await fetchMarketCandles(
        selectedMarket,
        selectedInstrument,
        timeframe,
      );
      const latest = candles.length - 1;
      setChartData(candles);
      setCurrentCandle(latest);
      setCurrentPrice(candles[latest]?.close || 0);
      setBalance(sessionBalance);
      toast.success("Chart loaded with real market data!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Trading logic
  useEffect(() => {
    if (isPlaying && currentCandle < chartData.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentCandle((prev) => {
          if (prev >= chartData.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const nextIdx = prev + 1;
          const candle = chartData[nextIdx];
          setCurrentPrice(candle.close);

          // Update positions P&L and check SL/TP
          setPositions((openPositions) =>
            processPositionsForCandle(candle, openPositions, setBalance, setTrades)
          );

          return nextIdx;
        });
      }, 1000 / speed);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, currentCandle, chartData.length]);

  const handlePlay = () => {
    if (currentCandle >= chartData.length - 1) {
      // Start replay from the beginning with a window of context
      const win = defaultWindowCandles(chartData);
      const start = Math.min(win, chartData.length - 1);
      setCurrentCandle(start);
      setCurrentPrice(chartData[start]?.close || 0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((p) => !p);
  };

  const handleStepForward = () => {
    if (currentCandle >= chartData.length - 1) return;
    const next = currentCandle + 1;
    const candle = chartData[next];
    setCurrentCandle(next);
    setCurrentPrice(candle.close);
    // Apply SL/TP check on manual step
    setPositions((openPositions) =>
      processPositionsForCandle(candle, openPositions, setBalance, setTrades)
    );
  };

  const handleReset = () => {
    setIsPlaying(false);
    const win = defaultWindowCandles(chartData);
    const start = Math.min(win, chartData.length - 1);
    setCurrentCandle(start);
    setCurrentPrice(chartData[start]?.close || 0);
    setPositions([]);
    setTrades([]);
    setBalance(currentSession?.initialBalance || 10000);
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
    // We compare against the candle's UTC date string to match correctly.
    const idx = chartData.findIndex((c) => {
      const d = new Date(c.time * 1000).toISOString().slice(0, 10);
      return d >= seekDate;
    });
    const target = idx === -1 ? chartData.length - 1 : idx;
    setCurrentCandle(target);
    setCurrentPrice(chartData[target]?.close || 0);
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
      setBalance(currentSession.initialBalance);
      setPositions([]);
      setTrades([]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsLoadingData(false);
    }
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

          <div className="mb-6">
            <button
              onClick={() => setCurrentView("setup")}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Session
            </button>
          </div>

          {/* Session History */}
          {sessionHistory.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Sessions
              </h2>
              <div className="space-y-3">
                {sessionHistory.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
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
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        ${s.initialBalance?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Initial Balance ($)
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" />
                        <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                          The starting capital for your backtest. Default is
                          $100,000. You can adjust this based on your actual
                          account size.
                        </div>
                      </div>
                    </div>
                    <input
                      type="number"
                      value={initialBalance}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === "") {
                          setInitialBalance("");
                        } else {
                          setInitialBalance(Number(value));
                        }
                      }}
                      min="1000"
                      step="1000"
                      placeholder="100000"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                  </div>
                </div>

                {/* Template Quick Setup */}
                {settingsTemplates.length > 0 && (
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
                        onChange={(e) => {
                          setSelectedTemplateId(e.target.value);
                          if (e.target.value) {
                            applyTemplate(e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                      >
                        <option value="">
                          Choose a template to auto-fill...
                        </option>
                        {settingsTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Templates help you quickly set up sessions with your
                        preferred trading parameters
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Market & Instrument Selection */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Market & Instrument
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Market Type *
                    </label>
                    <select
                      value={selectedMarket}
                      onChange={(e) => {
                        setSelectedMarket(e.target.value);
                        setSelectedInstrument(""); // Reset instrument when market changes
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Instrument *
                    </label>
                    <select
                      value={selectedInstrument}
                      onChange={(e) => setSelectedInstrument(e.target.value)}
                      disabled={!selectedMarket}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-600 transition-colors"
                    >
                      <option value="">
                        {selectedMarket
                          ? "Select Instrument"
                          : "Select Market Type First"}
                      </option>
                      {selectedMarket &&
                        MARKET_CONFIG[selectedMarket].instruments.map(
                          (instrument) => (
                            <option
                              key={instrument.symbol}
                              value={instrument.symbol}
                            >
                              {instrument.symbol} - {instrument.name} (
                              {instrument.exchange})
                            </option>
                          )
                        )}
                    </select>
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
                      !selectedInstrument ||
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
              onClick={() => setCurrentView("sessions")}
              className="text-xs transition-colors flex-shrink-0"
              style={{ color: theme.textMuted }}
              onMouseEnter={(e) => (e.currentTarget.style.color = theme.text)}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme.textMuted)}
            >
              ← Sessions
            </button>
            <div className="h-4 w-px flex-shrink-0" style={{ background: theme.border }} />
            <div className="flex items-baseline space-x-2 min-w-0">
              <span className="font-bold text-sm" style={{ color: theme.text }}>
                {currentSession.instrument?.symbol}
              </span>
              <span className="text-xs hidden sm:block truncate" style={{ color: theme.textMuted }}>
                {currentSession.instrument?.name}
              </span>
              <span className="text-xs hidden md:block" style={{ color: "#b2b5be" }}>
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

          <div className="flex items-center space-x-5 text-xs flex-shrink-0">
            <div>
              <span style={{ color: theme.textMuted }}>Balance </span>
              <span className="font-semibold" style={{ color: theme.text }}>
                ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span style={{ color: theme.textMuted }}>P&amp;L </span>
              <span
                className="font-semibold"
                style={{ color: pnlPositive ? "#089981" : "#f23645" }}
              >
                {pnlPositive ? "+" : ""}${pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Chart toolbar — TradingView-style light toolbar ── */}
        <div
          className="flex items-center px-3 py-1 flex-shrink-0 border-b flex-wrap"
          style={{ background: theme.surface, borderColor: theme.border, gap: "2px" }}
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

          {/* Play / Pause */}
          <button
            onClick={handlePlay}
            disabled={isLoadingData || !chartData.length}
            title={isPlaying ? "Pause" : "Play forward"}
            className="flex items-center px-3 py-1 text-xs rounded font-medium transition-colors disabled:opacity-40 flex-shrink-0"
            style={{ background: "#1E53E5", color: "#ffffff" }}
          >
            {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          </button>

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
        </div>

        {/* ── Main content: chart + side panel ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chart column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Chart — fills remaining space */}
            <div className="flex-1 relative overflow-hidden">
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
                  />
                </ChartErrorBoundary>
              )}

              {/* Floating Buy / Sell buttons — bottom-left of chart */}
              {!isLoadingData && chartData.length > 0 && (
                <div className="absolute bottom-4 left-3 z-20 flex flex-col gap-2">
                  <button
                    onClick={() => { setOrderSide("buy"); setShowOrderPanel(true); }}
                    className="px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-colors"
                    style={{ background: "#089981", color: "#fff", minWidth: 64 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#067a68")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#089981")}
                  >
                    <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                    BUY
                  </button>
                  <button
                    onClick={() => { setOrderSide("sell"); setShowOrderPanel(true); }}
                    className="px-4 py-2 rounded-lg text-xs font-bold shadow-lg transition-colors"
                    style={{ background: "#f23645", color: "#fff", minWidth: 64 }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#c42c3a")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#f23645")}
                  >
                    <TrendingDown className="w-3.5 h-3.5 inline mr-1" />
                    SELL
                  </button>
                </div>
              )}

              {/* ── Order panel — floats over chart left side ── */}
              {showOrderPanel && (
                <div
                  className="absolute left-0 top-0 bottom-0 z-30 flex flex-col shadow-2xl border-r overflow-y-auto"
                  style={{
                    width: 280,
                    background: theme.surface,
                    borderColor: theme.border,
                  }}
                >
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
                            onClick={() => setUseTakeProfit((v) => !v)}
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
                          <input
                            type="number"
                            value={takeProfit}
                            onChange={(e) => setTakeProfit(e.target.value)}
                            placeholder="Take profit price"
                            step={currentSession?.instrument?.tickSize || 0.25}
                            className="w-full px-3 py-2 rounded text-sm border outline-none"
                            style={{
                              background: theme.bg,
                              borderColor: theme.border,
                              color: theme.text,
                            }}
                          />
                        )}
                      </div>

                      {/* Stop Loss */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs" style={{ color: "#787b86" }}>Stop loss, price</span>
                          <button
                            onClick={() => setUseStopLoss((v) => !v)}
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
                          <input
                            type="number"
                            value={stopLoss}
                            onChange={(e) => setStopLoss(e.target.value)}
                            placeholder="Stop loss price"
                            step={currentSession?.instrument?.tickSize || 0.25}
                            className="w-full px-3 py-2 rounded text-sm border outline-none"
                            style={{
                              background: theme.bg,
                              borderColor: theme.border,
                              color: theme.text,
                            }}
                          />
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
                    <button
                      onClick={() => setShowOrderPanel(false)}
                      className="w-full py-2 rounded text-xs transition-colors"
                      style={{ color: "#787b86", background: theme.bg }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Side panel: positions + trade history */}
          <div
            className="w-60 flex flex-col flex-shrink-0 border-l overflow-hidden"
            style={{ background: theme.surface, borderColor: theme.border }}
          >
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
                      <div className="flex justify-between mb-0.5">
                        <span
                          className="font-semibold"
                          style={{ color: pos.side === "buy" ? "#089981" : "#f23645" }}
                        >
                          {pos.side.toUpperCase()} ×{pos.size}
                        </span>
                        <span
                          style={{ color: pos.currentPnL >= 0 ? "#089981" : "#f23645" }}
                        >
                          {pos.currentPnL >= 0 ? "+" : ""}${pos.currentPnL.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ color: theme.textMuted }}>
                        Entry ${pos.entryPrice.toFixed(2)}
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
                        className="text-xs mt-1 w-full text-center py-0.5 rounded"
                        style={{ background: theme.border, color: "#787b86" }}
                      >
                        Close
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
