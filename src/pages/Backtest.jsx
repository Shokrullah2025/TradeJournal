import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { useBacktest } from "../context/BacktestContext";
import toast from "react-hot-toast";

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
  crypto: {
    name: "Cryptocurrency",
    instruments: [
      {
        symbol: "BTCUSDT",
        name: "Bitcoin / USDT",
        exchange: "Binance",
        tickSize: 0.01,
        tickValue: 0.01,
      },
      {
        symbol: "ETHUSDT",
        name: "Ethereum / USDT",
        exchange: "Binance",
        tickSize: 0.01,
        tickValue: 0.01,
      },
      {
        symbol: "ADAUSDT",
        name: "Cardano / USDT",
        exchange: "Binance",
        tickSize: 0.0001,
        tickValue: 0.0001,
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

  // Chart and Trading States
  const [chartData, setChartData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCandle, setCurrentCandle] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [orderSide, setOrderSide] = useState("buy");
  const [orderSize, setOrderSize] = useState(1);
  const [balance, setBalance] = useState(10000);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const intervalRef = useRef(null);

  // Generate sample OHLCV data based on selected instrument
  const generateSampleData = (instrument, days = 30) => {
    const data = [];
    const now = new Date();
    let basePrice;

    // Set realistic base prices for different instruments
    switch (instrument.symbol) {
      case "NQ":
        basePrice = 23400;
        break;
      case "ES":
        basePrice = 5800;
        break;
      case "BTCUSDT":
        basePrice = 95000;
        break;
      case "ETHUSDT":
        basePrice = 3500;
        break;
      case "AAPL":
        basePrice = 220;
        break;
      default:
        basePrice = 100;
    }

    for (let i = days * 96; i >= 0; i--) {
      const time = new Date(now - i * 15 * 60 * 1000);
      const volatility = basePrice * 0.002;

      const prevClose =
        i === days * 96 ? basePrice : data[data.length - 1].close;
      const open = prevClose + (Math.random() - 0.5) * volatility;
      const change = (Math.random() - 0.5) * volatility;
      const high = open + Math.abs(change) + Math.random() * volatility;
      const low = open - Math.abs(change) - Math.random() * volatility;
      const close = open + change;
      const volume = Math.floor(Math.random() * 2000) + 500;

      data.push({
        time: time.toISOString(),
        open: Number(open.toFixed(instrument.tickSize < 1 ? 2 : 0)),
        high: Number(high.toFixed(instrument.tickSize < 1 ? 2 : 0)),
        low: Number(low.toFixed(instrument.tickSize < 1 ? 2 : 0)),
        close: Number(close.toFixed(instrument.tickSize < 1 ? 2 : 0)),
        volume,
      });
    }

    return data;
  };

  const handleCreateSession = () => {
    // Validation with required fields
    if (
      !sessionName ||
      !selectedMarket ||
      !selectedInstrument ||
      !strategy ||
      !setup ||
      !riskRewardRatio
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Use default balance if not provided
    const balance = initialBalance || 100000;

    const instrument = MARKET_CONFIG[selectedMarket].instruments.find(
      (inst) => inst.symbol === selectedInstrument
    );

    const newSession = {
      id: Date.now().toString(),
      name: sessionName,
      market: selectedMarket,
      instrument: instrument,
      initialBalance: balance,
      // Trading details from individual states
      strategy: strategy,
      setup: setup,
      riskRewardRatio: riskRewardRatio,
      timeframe,
      marketCondition,
      notes: notes || "",
      stopLoss: stopLoss || "",
      createdAt: new Date().toISOString(),
      status: "active",
    };

    // Generate chart data for the session
    const data = generateSampleData(instrument);
    setChartData(data);
    setCurrentPrice(data[0]?.close || 0);
    setBalance(balance);
    setCurrentSession(newSession);
    setCurrentView("backtest");

    toast.success("Backtest session created successfully!");
  };

  // Chart rendering component
  const renderCandlestickChart = () => {
    if (!chartData.length)
      return (
        <div className="text-gray-400 text-center py-20">
          No chart data available
        </div>
      );

    const visibleCandles = chartData.slice(0, currentCandle + 1);
    const chartWidth = Math.max(visibleCandles.length * 8, 800);
    const chartHeight = 400;
    const padding = { top: 20, right: 50, bottom: 40, left: 50 };

    // Calculate price range
    const prices = visibleCandles.flatMap((d) => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.1;

    const yScale = (price) => {
      return (
        chartHeight -
        padding.bottom -
        ((price - (minPrice - priceBuffer)) / (priceRange + 2 * priceBuffer)) *
          (chartHeight - padding.top - padding.bottom)
      );
    };

    return (
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <svg width="100%" height={chartHeight} className="bg-gray-900">
          {/* Price Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price =
              minPrice - priceBuffer + (priceRange + 2 * priceBuffer) * ratio;
            const y = yScale(price);
            return (
              <g key={ratio}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={chartWidth - padding.right}
                  y2={y}
                  stroke="#374151"
                  strokeDasharray="2,2"
                />
                <text
                  x={chartWidth - padding.right + 5}
                  y={y + 4}
                  fill="#9CA3AF"
                  fontSize="12"
                >
                  {price.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Candlesticks */}
          {visibleCandles.map((candle, index) => {
            const x = padding.left + index * 8;
            const isGreen = candle.close > candle.open;
            const color = isGreen ? "#10B981" : "#EF4444";

            const highY = yScale(candle.high);
            const lowY = yScale(candle.low);
            const openY = yScale(candle.open);
            const closeY = yScale(candle.close);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.abs(closeY - openY);

            return (
              <g key={index}>
                <line
                  x1={x + 3}
                  y1={highY}
                  x2={x + 3}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="1"
                />
                <rect
                  x={x}
                  y={bodyTop}
                  width="6"
                  height={Math.max(bodyHeight, 1)}
                  fill={color}
                />
              </g>
            );
          })}

          {/* Current Price Line */}
          {currentPrice > 0 && (
            <line
              x1={padding.left}
              y1={yScale(currentPrice)}
              x2={chartWidth - padding.right}
              y2={yScale(currentPrice)}
              stroke="#F59E0B"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </svg>
      </div>
    );
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
          const nextCandle = prev + 1;
          setCurrentPrice(chartData[nextCandle].close);
          return nextCandle;
        });
      }, 1000 / speed);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, currentCandle, chartData.length]);

  const handlePlay = () => {
    if (currentCandle >= chartData.length - 1) {
      setCurrentCandle(0);
      setCurrentPrice(chartData[0].close);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentCandle(0);
    setCurrentPrice(chartData[0]?.close || 0);
    setPositions([]);
    setTrades([]);
    setBalance(currentSession?.initialBalance || 10000);
  };

  const executeOrder = () => {
    if (!currentSession) return;

    const position = {
      id: Date.now(),
      side: orderSide,
      size: orderSize,
      entryPrice: currentPrice,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit) : null,
      timestamp: chartData[currentCandle]?.time,
      currentPnL: 0,
    };

    setPositions((prev) => [...prev, position]);
    setShowOrderPanel(false);

    setOrderSize(1);
    setStopLoss("");
    setTakeProfit("");

    toast.success(
      `${orderSide.toUpperCase()} order executed at $${currentPrice.toFixed(2)}`
    );
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
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Strategy *
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
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

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Timeframe
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          The chart timeframe for your analysis. Lower
                          timeframes (1m, 5m) are good for scalping, while
                          higher timeframes (1h, 4h, 1d) suit swing trading.
                        </div>
                      </div>
                    </div>
                    <select
                      value={timeframe}
                      onChange={(e) => setTimeframe(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    >
                      <option value="1m">1 Minute</option>
                      <option value="5m">5 Minutes</option>
                      <option value="15m">15 Minutes</option>
                      <option value="30m">30 Minutes</option>
                      <option value="1h">1 Hour</option>
                      <option value="4h">4 Hours</option>
                      <option value="1d">Daily</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Risk Management */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
                <div className="flex items-center space-x-2 mb-6">
                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Risk Management
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Risk/Reward Ratio *
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          The ratio of potential loss to potential profit. For
                          example, "1:2" means you risk $1 to potentially gain
                          $2. Higher ratios generally indicate better risk
                          management.
                        </div>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={riskRewardRatio}
                      onChange={(e) => setRiskRewardRatio(e.target.value)}
                      placeholder="e.g., 1:2, 1:3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    />
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Market Condition
                      </label>
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-blue-500 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          The overall market environment during your backtest
                          period. This helps analyze how your strategy performs
                          in different market conditions.
                        </div>
                      </div>
                    </div>
                    <select
                      value={marketCondition}
                      onChange={(e) => setMarketCondition(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
                    >
                      <option value="">Select condition</option>
                      <option value="Trending Up">Trending Up</option>
                      <option value="Trending Down">Trending Down</option>
                      <option value="Sideways/Range">Sideways/Range</option>
                      <option value="Volatile">Volatile</option>
                      <option value="Low Volume">Low Volume</option>
                      <option value="High Volume">High Volume</option>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Session Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows="4"
                      placeholder="Add notes about your trading plan, market outlook, or strategy expectations..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors resize-none"
                    />
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
                      !setup ||
                      !riskRewardRatio
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
    return (
      <div className="h-screen bg-gray-900 text-white flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setCurrentView("sessions")}
                className="text-gray-400 hover:text-white"
              >
                ← Back to Sessions
              </button>
              <div>
                <h1 className="text-xl font-semibold">
                  {currentSession?.name || "Backtest Session"}
                </h1>
                <p className="text-sm text-gray-400">
                  {currentSession?.instrument?.symbol} -{" "}
                  {currentSession?.instrument?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="text-gray-400">Balance: </span>
                <span
                  className={`font-semibold ${
                    balance >= (currentSession?.initialBalance || 10000)
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  ${balance.toFixed(2)}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-400">P&L: </span>
                <span
                  className={`font-semibold ${
                    balance >= (currentSession?.initialBalance || 10000)
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {balance >= (currentSession?.initialBalance || 10000)
                    ? "+"
                    : ""}
                  $
                  {(
                    balance - (currentSession?.initialBalance || 10000)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Chart Area */}
          <div className="flex-1 p-4">
            {/* Chart Controls */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handlePlay}
                    className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 mr-2" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </button>

                  <button
                    onClick={handleReset}
                    className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </button>

                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">Speed:</span>
                    <select
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={2}>2x</option>
                      <option value={4}>4x</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-400">
                    Candle: {currentCandle + 1} / {chartData.length}
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-400">Price: </span>
                    <span className="font-semibold text-yellow-400">
                      ${currentPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-800 rounded-lg p-4 flex-1">
              <div className="h-96 overflow-x-auto">
                {renderCandlestickChart()}
              </div>
            </div>

            {/* Trading Controls */}
            <div className="bg-gray-800 rounded-lg p-4 mt-4">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => {
                    setOrderSide("buy");
                    setShowOrderPanel(true);
                  }}
                  className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  BUY
                </button>

                <button
                  onClick={() => {
                    setOrderSide("sell");
                    setShowOrderPanel(true);
                  }}
                  className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <TrendingDown className="w-5 h-5 mr-2" />
                  SELL
                </button>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-gray-800 border-l border-gray-700">
            {/* Positions */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Open Positions</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {positions.length === 0 ? (
                  <p className="text-gray-400 text-sm">No open positions</p>
                ) : (
                  positions.map((position) => (
                    <div key={position.id} className="bg-gray-700 p-3 rounded">
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className={`text-sm font-medium ${
                            position.side === "buy"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {position.side.toUpperCase()} {position.size}
                        </span>
                        <span
                          className={`text-sm ${
                            position.currentPnL >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {position.currentPnL >= 0 ? "+" : ""}$
                          {position.currentPnL.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Entry: ${position.entryPrice.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trade History */}
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-3">Trade History</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {trades.length === 0 ? (
                  <p className="text-gray-400 text-sm">No trades yet</p>
                ) : (
                  trades
                    .slice(-10)
                    .reverse()
                    .map((trade) => (
                      <div key={trade.id} className="bg-gray-700 p-3 rounded">
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-sm font-medium ${
                              trade.side === "buy"
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {trade.side.toUpperCase()} {trade.size}
                          </span>
                          <span
                            className={`text-sm ${
                              trade.pnl >= 0 ? "text-green-400" : "text-red-400"
                            }`}
                          >
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {trade.entryPrice.toFixed(2)} →{" "}
                          {trade.exitPrice.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {trade.reason}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Panel Modal */}
        {showOrderPanel && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-96">
              <h3 className="text-xl font-semibold mb-4">
                {orderSide.toUpperCase()} Order
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Position Size
                  </label>
                  <input
                    type="number"
                    value={orderSize}
                    onChange={(e) => setOrderSize(Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Stop Loss (Optional)
                  </label>
                  <input
                    type="number"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    step="0.01"
                    placeholder="Stop loss price"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Take Profit (Optional)
                  </label>
                  <input
                    type="number"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    step="0.01"
                    placeholder="Take profit price"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={executeOrder}
                  className={`flex-1 py-2 px-4 rounded font-medium ${
                    orderSide === "buy"
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  Execute {orderSide.toUpperCase()}
                </button>
                <button
                  onClick={() => setShowOrderPanel(false)}
                  className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
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
