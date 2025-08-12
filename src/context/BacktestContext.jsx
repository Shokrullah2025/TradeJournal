import React, { createContext, useState, useContext, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const BacktestContext = createContext();

export const useBacktest = () => useContext(BacktestContext);

/**
 * Provider component that wraps parts of the app that need access to backtesting state
 */
export const BacktestProvider = ({ children }) => {
  // Store all backtesting sessions
  const [backtestSessions, setBacktestSessions] = useState([]);
  // Current active session
  const [activeSession, setActiveSession] = useState(null);
  // Loading state for simulations
  const [isSimulating, setIsSimulating] = useState(false);

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem("backtestSessions");
      if (savedSessions) {
        setBacktestSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error("Failed to load backtest sessions:", error);
    }
  }, []);

  // Save sessions to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        "backtestSessions",
        JSON.stringify(backtestSessions)
      );
    } catch (error) {
      console.error("Failed to save backtest sessions:", error);
    }
  }, [backtestSessions]);

  /**
   * Create a new backtesting session
   */
  const createSession = (sessionData) => {
    const newSession = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      status: "created",
      results: null,
      trades: [],
      metrics: {},
      ...sessionData,
    };

    setBacktestSessions((prev) => [...prev, newSession]);
    return newSession.id;
  };

  /**
   * Start a simulation for a specific session
   */
  const runSimulation = async (sessionId) => {
    setIsSimulating(true);
    try {
      // Find the session
      const session = backtestSessions.find((s) => s.id === sessionId);
      if (!session) {
        console.error(
          "Session not found. Available session IDs:",
          backtestSessions.map((s) => s.id)
        );
        throw new Error("Session not found");
      }

      // Update session status
      updateSession(sessionId, { status: "running" });

      // Simulate delay for the backtesting process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Generate simulated trades based on session parameters
      const simulatedTrades = generateSimulatedTrades(session);

      // Calculate performance metrics
      const metrics = calculateBacktestMetrics(simulatedTrades);

      // Update session with results
      updateSession(sessionId, {
        status: "completed",
        trades: simulatedTrades,
        metrics,
        results: {
          completedAt: new Date().toISOString(),
          summary: {
            totalTrades: simulatedTrades.length,
            winRate: metrics.winRate,
            totalPnL: metrics.totalPnL,
            maxDrawdown: metrics.maxDrawdown,
          },
        },
      });

      // Set as active session
      const updatedSession = backtestSessions.find((s) => s.id === sessionId);
      setActiveSession(updatedSession);

      return updatedSession;
    } catch (error) {
      console.error("Simulation failed:", error);
      updateSession(sessionId, { status: "failed", error: error.message });
      return null;
    } finally {
      setIsSimulating(false);
    }
  };

  /**
   * Generate simulated trades based on session parameters
   */
  const generateSimulatedTrades = (session) => {
    const { dateRange, instruments, strategies, parameters } = session;

    // Parse date range
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Number of trades to generate based on frequency
    const tradesPerDay = parameters?.tradesPerDay || 1.5;
    const totalTrades = Math.ceil(daysDiff * tradesPerDay);

    // Win rate based on strategy or default
    const winRate = parameters?.winRate || 0.55;

    // Average profit and loss sizes
    const avgProfit = parameters?.avgProfit || 2.5; // In %
    const avgLoss = parameters?.avgLoss || 1.5; // In %

    // Generate the trades
    const trades = [];
    let currentEquity = parameters?.startingCapital || 10000;
    let highestEquity = currentEquity;
    let currentDate = new Date(startDate);

    for (let i = 0; i < totalTrades; i++) {
      // Randomly select instrument
      const instrument =
        instruments[Math.floor(Math.random() * instruments.length)];

      // Randomly select strategy
      const strategy =
        strategies[Math.floor(Math.random() * strategies.length)];

      // Random date within range, keeping chronological order
      if (i > 0) {
        // Advance time by random amount (0-2 days)
        const advanceHours = Math.random() * 48;
        currentDate = new Date(
          currentDate.getTime() + advanceHours * 60 * 60 * 1000
        );
        // Ensure we don't exceed end date
        if (currentDate > endDate) currentDate = new Date(endDate);
      }

      // Determine if winning or losing trade
      const isWin = Math.random() < winRate;

      // Calculate P&L with some randomness
      const profitPercentage = isWin
        ? avgProfit + Math.random() * avgProfit * 0.5
        : -avgLoss - Math.random() * avgLoss * 0.5;

      const positionSize = currentEquity * (parameters?.riskPerTrade || 0.02);
      const pnl = positionSize * (profitPercentage / 100);

      // Update equity
      currentEquity += pnl;
      if (currentEquity > highestEquity) highestEquity = currentEquity;

      // Generate trade object
      trades.push({
        id: uuidv4(),
        instrument,
        strategy,
        entryDate: new Date(currentDate).toISOString(),
        exitDate: new Date(
          currentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000
        ).toISOString(),
        entryPrice: Math.round(100 + Math.random() * 900), // Simulated price
        exitPrice: Math.round(100 + Math.random() * 900),
        quantity: Math.round(positionSize / (100 + Math.random() * 900)),
        direction: Math.random() > 0.5 ? "long" : "short",
        status: "closed",
        pnl,
        fees: positionSize * 0.001, // 0.1% in fees
        notes: `Simulated ${
          isWin ? "winning" : "losing"
        } trade for ${strategy} strategy`,
        tags: [strategy, "backtest", instrument],
      });
    }

    return trades;
  };

  /**
   * Calculate comprehensive backtest metrics
   */
  const calculateBacktestMetrics = (trades) => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        expectancy: 0,
      };
    }

    const pnls = trades.map((trade) => trade.pnl);
    const wins = pnls.filter((pnl) => pnl > 0);
    const losses = pnls.filter((pnl) => pnl < 0);

    const totalPnL = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const winRate = (wins.length / trades.length) * 100;
    const avgWin =
      wins.length > 0
        ? wins.reduce((sum, win) => sum + win, 0) / wins.length
        : 0;
    const avgLoss =
      losses.length > 0
        ? Math.abs(losses.reduce((sum, loss) => sum + loss, 0) / losses.length)
        : 0;
    const profitFactor =
      losses.length > 0
        ? wins.reduce((sum, win) => sum + win, 0) /
          Math.abs(losses.reduce((sum, loss) => sum + loss, 0))
        : 0;

    // Calculate max drawdown
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;

    // Sort trades by date
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.entryDate) - new Date(b.entryDate)
    );

    sortedTrades.forEach((trade) => {
      runningTotal += trade.pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Calculate equity curve for charting
    let equity = 10000; // Starting capital
    const equityCurve = sortedTrades.map((trade) => {
      equity += trade.pnl;
      return {
        date: new Date(trade.exitDate),
        equity,
      };
    });

    // Calculate daily returns for Sharpe ratio
    const returns = [];
    let prevEquity = 10000;
    equityCurve.forEach((point) => {
      returns.push((point.equity - prevEquity) / prevEquity);
      prevEquity = point.equity;
    });

    const avgReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
        returns.length
    );

    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0;
    const expectancy =
      (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

    return {
      totalTrades: trades.length,
      winRate: Math.round(winRate * 100) / 100,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgWin: Math.round(avgWin * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      profitFactor: Math.round(profitFactor * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      expectancy: Math.round(expectancy * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100,
      equityCurve,
      returns,
    };
  };

  /**
   * Update an existing session
   */
  const updateSession = (sessionId, updateData) => {
    setBacktestSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              ...updateData,
              lastModified: new Date().toISOString(),
            }
          : session
      )
    );
  };

  /**
   * Delete a session
   */
  const deleteSession = (sessionId) => {
    setBacktestSessions((prev) =>
      prev.filter((session) => session.id !== sessionId)
    );

    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
  };

  /**
   * Get a specific session by ID
   */
  const getSession = (sessionId) => {
    return backtestSessions.find((session) => session.id === sessionId) || null;
  };

  /**
   * Set the active session
   */
  const setSessionActive = (sessionId) => {
    const session = getSession(sessionId);
    setActiveSession(session);
    return session;
  };

  // Context value
  const value = {
    sessions: backtestSessions,
    backtestSessions,
    activeSession,
    isSimulating,
    createSession,
    updateSession,
    deleteSession,
    getSession,
    setSessionActive,
    runSimulation,
  };

  return (
    <BacktestContext.Provider value={value}>
      {children}
    </BacktestContext.Provider>
  );
};
