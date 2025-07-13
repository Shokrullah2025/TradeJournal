import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import { format } from "date-fns";

const TradeContext = createContext();

// Trade data structure
const initialState = {
  trades: [],
  filters: {
    dateRange: "all",
    instrument: "all",
    strategy: "all",
    outcome: "all",
  },
  stats: {
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
  },
};

// Action types
const ACTIONS = {
  ADD_TRADE: "ADD_TRADE",
  UPDATE_TRADE: "UPDATE_TRADE",
  DELETE_TRADE: "DELETE_TRADE",
  SET_FILTERS: "SET_FILTERS",
  LOAD_TRADES: "LOAD_TRADES",
  CALCULATE_STATS: "CALCULATE_STATS",
  IMPORT_TRADES: "IMPORT_TRADES",
};

// Helper functions
const calculatePnL = (trade) => {
  const { entryPrice, exitPrice, quantity, tradeType, fees = 0 } = trade;

  if (!exitPrice) return 0;

  let pnl;
  if (tradeType === "long") {
    pnl = (exitPrice - entryPrice) * quantity;
  } else {
    pnl = (entryPrice - exitPrice) * quantity;
  }

  return pnl - fees;
};

const calculateStats = (trades) => {
  const completedTrades = trades.filter((trade) => trade.status === "closed");

  if (completedTrades.length === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
    };
  }

  const pnls = completedTrades.map((trade) => trade.pnl);
  const wins = pnls.filter((pnl) => pnl > 0);
  const losses = pnls.filter((pnl) => pnl < 0);

  const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
  const winRate = (wins.length / completedTrades.length) * 100;
  const avgWin =
    wins.length > 0 ? wins.reduce((sum, win) => sum + win, 0) / wins.length : 0;
  const avgLoss =
    losses.length > 0
      ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length)
      : 0;
  const profitFactor =
    avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

  // Calculate max drawdown
  let runningTotal = 0;
  let peak = 0;
  let maxDrawdown = 0;

  completedTrades.forEach((trade) => {
    runningTotal += trade.pnl;
    if (runningTotal > peak) {
      peak = runningTotal;
    }
    const drawdown = peak - runningTotal;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return {
    totalTrades: completedTrades.length,
    winRate: Math.round(winRate * 100) / 100,
    totalPnL: Math.round(totalPnL * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    sharpeRatio: 0, // Simplified - would need risk-free rate and volatility
  };
};

// Reducer
const tradeReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.ADD_TRADE: {
      const newTrade = {
        ...action.payload,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        pnl:
          action.payload.status === "closed" ? calculatePnL(action.payload) : 0,
      };

      const newTrades = [...state.trades, newTrade];
      return {
        ...state,
        trades: newTrades,
        stats: calculateStats(newTrades),
      };
    }

    case ACTIONS.UPDATE_TRADE: {
      const updatedTrades = state.trades.map((trade) =>
        trade.id === action.payload.id
          ? {
              ...action.payload,
              pnl:
                action.payload.status === "closed"
                  ? calculatePnL(action.payload)
                  : 0,
            }
          : trade
      );

      return {
        ...state,
        trades: updatedTrades,
        stats: calculateStats(updatedTrades),
      };
    }

    case ACTIONS.DELETE_TRADE: {
      const filteredTrades = state.trades.filter(
        (trade) => trade.id !== action.payload
      );
      return {
        ...state,
        trades: filteredTrades,
        stats: calculateStats(filteredTrades),
      };
    }

    case ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };

    case ACTIONS.LOAD_TRADES: {
      const tradesWithPnL = action.payload.map((trade) => ({
        ...trade,
        pnl: trade.status === "closed" ? calculatePnL(trade) : 0,
      }));

      return {
        ...state,
        trades: tradesWithPnL,
        stats: calculateStats(tradesWithPnL),
      };
    }

    case ACTIONS.IMPORT_TRADES: {
      const importedTrades = action.payload.map((trade) => ({
        ...trade,
        pnl: trade.status === "closed" ? calculatePnL(trade) : 0,
      }));

      // Filter out trades that already exist (by brokerTradeId)
      const existingBrokerIds = new Set(
        state.trades
          .filter((trade) => trade.brokerTradeId)
          .map((trade) => trade.brokerTradeId)
      );

      const newTrades = importedTrades.filter(
        (trade) => !existingBrokerIds.has(trade.brokerTradeId)
      );

      if (newTrades.length === 0) {
        return state; // No new trades to import
      }

      const allTrades = [...state.trades, ...newTrades];

      return {
        ...state,
        trades: allTrades,
        stats: calculateStats(allTrades),
      };
    }

    default:
      return state;
  }
};

// Provider component
export const TradeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(tradeReducer, initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load trades from localStorage on mount
  useEffect(() => {
    const savedTrades = localStorage.getItem("tradeJournalTrades");
    if (savedTrades) {
      try {
        const trades = JSON.parse(savedTrades);
        if (Array.isArray(trades) && trades.length > 0) {
          dispatch({ type: ACTIONS.LOAD_TRADES, payload: trades });
        }
      } catch (error) {
        console.error("Error loading trades from localStorage:", error);
      }
    } else {
      // Add some sample trades for testing
      const sampleTrades = [
        {
          id: 1,
          instrumentType: "stocks",
          instrument: "AAPL",
          tradeType: "long",
          strategy: "Breakout",
          entryDate: "2025-01-08",
          entryTime: "09:30",
          entryPrice: 150.0,
          exitPrice: 155.0,
          quantity: 100,
          status: "closed",
          setup: "Bull Flag",
          marketCondition: "Bullish",
          fees: 2.5,
          notes: "Clean breakout above resistance",
          tags: ["momentum", "breakout"],
        },
        {
          id: 2,
          instrumentType: "stocks",
          instrument: "TSLA",
          tradeType: "long",
          strategy: "Swing Trading",
          entryDate: "2025-01-09",
          entryTime: "10:15",
          entryPrice: 220.0,
          exitPrice: 210.0,
          quantity: 50,
          status: "closed",
          setup: "Support Bounce",
          marketCondition: "Bearish",
          fees: 2.0,
          notes: "Failed to hold support, cut losses",
          tags: ["swing", "loss"],
        },
        {
          id: 3,
          instrumentType: "stocks",
          instrument: "MSFT",
          tradeType: "long",
          strategy: "Day Trading",
          entryDate: "2025-01-10",
          entryTime: "11:00",
          entryPrice: 420.0,
          exitPrice: 425.0,
          quantity: 25,
          status: "closed",
          setup: "Momentum",
          marketCondition: "Bullish",
          fees: 1.5,
          notes: "Quick momentum play",
          tags: ["day-trade", "momentum"],
        },
        {
          id: 4,
          instrumentType: "stocks",
          instrument: "GOOGL",
          tradeType: "short",
          strategy: "Pullback",
          entryDate: "2025-01-11",
          entryTime: "14:30",
          entryPrice: 175.0,
          exitPrice: 170.0,
          quantity: 30,
          status: "closed",
          setup: "Bear Flag",
          marketCondition: "Bearish",
          fees: 2.0,
          notes: "Nice pullback trade",
          tags: ["short", "pullback"],
        },
        {
          id: 5,
          instrumentType: "stocks",
          instrument: "NVDA",
          tradeType: "long",
          strategy: "Breakout",
          entryDate: "2025-01-11",
          entryTime: "15:45",
          entryPrice: 140.0,
          quantity: 40,
          status: "open",
          setup: "Bull Flag",
          marketCondition: "Bullish",
          fees: 0,
          notes: "Holding for breakout continuation",
          tags: ["breakout", "open"],
        },
      ];
      dispatch({ type: ACTIONS.LOAD_TRADES, payload: sampleTrades });
    }
    setIsInitialized(true);
  }, []);

  // Save trades to localStorage whenever trades change (but not on initial load)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("tradeJournalTrades", JSON.stringify(state.trades));
    }
  }, [state.trades, isInitialized]);

  const addTrade = (trade) => {
    dispatch({ type: ACTIONS.ADD_TRADE, payload: trade });
  };

  const updateTrade = (trade) => {
    dispatch({ type: ACTIONS.UPDATE_TRADE, payload: trade });
  };

  const deleteTrade = (tradeId) => {
    dispatch({ type: ACTIONS.DELETE_TRADE, payload: tradeId });
  };

  const setFilters = (filters) => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload: filters });
  };

  const importTrades = (trades) => {
    dispatch({ type: ACTIONS.IMPORT_TRADES, payload: trades });
  };

  // Filter trades based on current filters
  const getFilteredTrades = () => {
    return state.trades.filter((trade) => {
      const { dateRange, instrument, strategy, outcome } = state.filters;

      // Date filter
      if (dateRange !== "all") {
        const tradeDate = new Date(trade.entryDate);
        const now = new Date();
        let startDate;

        switch (dateRange) {
          case "7d":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "30d":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          default:
            startDate = new Date(0);
        }

        if (tradeDate < startDate) return false;
      }

      // Instrument filter
      if (instrument !== "all" && trade.instrument !== instrument) return false;

      // Strategy filter
      if (strategy !== "all" && trade.strategy !== strategy) return false;

      // Outcome filter
      if (outcome !== "all") {
        if (outcome === "winning" && trade.pnl <= 0) return false;
        if (outcome === "losing" && trade.pnl >= 0) return false;
      }

      return true;
    });
  };

  const value = {
    trades: state.trades,
    filteredTrades: getFilteredTrades(),
    filters: state.filters,
    stats: state.stats,
    addTrade,
    updateTrade,
    deleteTrade,
    setFilters,
    importTrades,
  };

  return (
    <TradeContext.Provider value={value}>{children}</TradeContext.Provider>
  );
};

// Hook to use the context
export const useTrades = () => {
  const context = useContext(TradeContext);
  if (!context) {
    throw new Error("useTrades must be used within a TradeProvider");
  }
  return context;
};

// Export the context itself for direct access if needed
export { TradeContext };
