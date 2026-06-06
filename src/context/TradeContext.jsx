import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import { logActivity } from "../utils/logActivity";

const TradeContext = createContext();

// ── Field mapping helpers ──────────────────────────────────────────────────

const INSTRUMENT_TYPE_TO_DB = {
  stocks: "stock",
  stock: "stock",
  futures: "future",
  future: "future",
  options: "option",
  option: "option",
  forex: "forex",
  crypto: "crypto",
  commodity: "commodity",
};

const INSTRUMENT_TYPE_FROM_DB = {
  stock: "stocks",
  future: "futures",
  option: "options",
  forex: "forex",
  crypto: "crypto",
  commodity: "commodity",
};

// camelCase form data → snake_case DB row
const toDbRow = (data, userId, accountId) => ({
  user_id:          userId,
  account_id:       accountId,
  instrument:       data.instrument,
  instrument_type:  INSTRUMENT_TYPE_TO_DB[data.instrumentType] ?? data.instrumentType ?? "stock",
  direction:        data.tradeType || data.direction || "long",
  quantity:         parseFloat(data.quantity) || 0,
  entry_price:      parseFloat(data.entryPrice) || 0,
  exit_price:       data.exitPrice ? parseFloat(data.exitPrice) : null,
  stop_loss:        data.stopLoss ? parseFloat(data.stopLoss) : null,
  take_profit:      data.takeProfit ? parseFloat(data.takeProfit) : null,
  entry_date:       data.entryDate || new Date().toISOString(),
  exit_date:        data.exitDate || null,
  status:           data.status || "open",
  pnl:              parseFloat(data.pnl) || 0,
  commission:       parseFloat(data.fees ?? data.commission) || 0,
  strategy:         data.strategy || null,
  setup_type:       data.setup || data.setupType || null,
  market_condition: data.marketCondition || null,
  notes:            data.notes || null,
  tags:             Array.isArray(data.tags) ? data.tags : [],
  risk_reward_ratio: data.riskRewardRatio ? parseFloat(data.riskRewardRatio) : null,
  external_trade_id: data.brokerTradeId || data.externalTradeId || null,
});

// snake_case DB row → camelCase UI object
const fromDbRow = (row, images = []) => ({
  id:               row.id,
  userId:           row.user_id,
  accountId:        row.account_id,
  instrument:       row.instrument,
  instrumentType:   INSTRUMENT_TYPE_FROM_DB[row.instrument_type] ?? row.instrument_type,
  tradeType:        row.direction,
  direction:        row.direction,
  quantity:         parseFloat(row.quantity),
  entryPrice:       parseFloat(row.entry_price),
  exitPrice:        row.exit_price != null ? parseFloat(row.exit_price) : null,
  stopLoss:         row.stop_loss != null ? parseFloat(row.stop_loss) : null,
  takeProfit:       row.take_profit != null ? parseFloat(row.take_profit) : null,
  entryDate:        row.entry_date,
  exitDate:         row.exit_date,
  status:           row.status,
  pnl:              parseFloat(row.pnl),
  fees:             parseFloat(row.commission),
  commission:       parseFloat(row.commission),
  strategy:         row.strategy,
  setup:            row.setup_type,
  setupType:        row.setup_type,
  marketCondition:  row.market_condition,
  notes:            row.notes,
  tags:             Array.isArray(row.tags) ? row.tags : [],
  riskRewardRatio:  row.risk_reward_ratio != null ? parseFloat(row.risk_reward_ratio) : null,
  brokerTradeId:    row.external_trade_id,
  createdAt:        row.created_at,
  updatedAt:        row.updated_at,
  images,
});

// ── Stats ──────────────────────────────────────────────────────────────────

const calculateStats = (trades) => {
  const closed = trades.filter((t) => t.status === "closed");
  if (closed.length === 0) {
    return { totalTrades: 0, winRate: 0, totalPnL: 0, avgWin: 0, avgLoss: 0,
             profitFactor: 0, maxDrawdown: 0, sharpeRatio: 0 };
  }

  const pnls  = closed.map((t) => t.pnl);
  const wins  = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);

  const totalPnL     = pnls.reduce((s, p) => s + p, 0);
  const winRate      = (wins.length / closed.length) * 100;
  const avgWin       = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
  const avgLoss      = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

  let running = 0, peak = 0, maxDrawdown = 0;
  closed.forEach((t) => {
    running += t.pnl;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });

  return {
    totalTrades:   closed.length,
    winRate:       Math.round(winRate * 100) / 100,
    totalPnL:      Math.round(totalPnL * 100) / 100,
    avgWin:        Math.round(avgWin * 100) / 100,
    avgLoss:       Math.round(avgLoss * 100) / 100,
    profitFactor:  Math.round(profitFactor * 100) / 100,
    maxDrawdown:   Math.round(maxDrawdown * 100) / 100,
    sharpeRatio:   0,
  };
};

// ── Reducer ────────────────────────────────────────────────────────────────

const ACTIONS = {
  SET_TRADES:      "SET_TRADES",
  ADD_TRADE:       "ADD_TRADE",
  UPDATE_TRADE:    "UPDATE_TRADE",
  DELETE_TRADE:    "DELETE_TRADE",
  SET_FILTERS:     "SET_FILTERS",
  SET_LOADING:     "SET_LOADING",
  SET_ACCOUNT:     "SET_ACCOUNT",
};

const initialState = {
  trades:    [],
  loading:   false,
  defaultAccountId: null,
  filters: { dateRange: "all", instrument: "all", strategy: "all", outcome: "all" },
  stats:   { totalTrades: 0, winRate: 0, totalPnL: 0, avgWin: 0, avgLoss: 0,
             profitFactor: 0, maxDrawdown: 0, sharpeRatio: 0 },
};

const tradeReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_TRADES: {
      const trades = action.payload;
      return { ...state, trades, stats: calculateStats(trades), loading: false };
    }
    case ACTIONS.ADD_TRADE: {
      const trades = [...state.trades, action.payload];
      return { ...state, trades, stats: calculateStats(trades) };
    }
    case ACTIONS.UPDATE_TRADE: {
      const trades = state.trades.map((t) =>
        t.id === action.payload.id ? action.payload : t
      );
      return { ...state, trades, stats: calculateStats(trades) };
    }
    case ACTIONS.DELETE_TRADE: {
      const trades = state.trades.filter((t) => t.id !== action.payload);
      return { ...state, trades, stats: calculateStats(trades) };
    }
    case ACTIONS.SET_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case ACTIONS.SET_ACCOUNT:
      return { ...state, defaultAccountId: action.payload };
    default:
      return state;
  }
};

// ── Provider ───────────────────────────────────────────────────────────────

export const TradeProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [state, dispatch] = useReducer(tradeReducer, initialState);
  const [localMigrationDone, setLocalMigrationDone] = useState(false);

  // Ensure user has a default trading account, return its id
  const ensureDefaultAccount = useCallback(async (userId) => {
    const { data: accounts } = await supabase
      .from("trading_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1);

    if (accounts && accounts.length > 0) {
      return accounts[0].id;
    }

    // Create a default paper trading account
    const { data: created, error } = await supabase
      .from("trading_accounts")
      .insert({
        user_id:         userId,
        account_name:    "Default Paper Account",
        broker:          "Paper Trading",
        account_type:    "paper",
        base_currency:   "USD",
        initial_balance: 0,
        current_balance: 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Trades] failed to create default account:", error);
      return null;
    }
    return created.id;
  }, []);

  // Fetch all trades for the current user (with images)
  const fetchTrades = useCallback(async (userId) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    const { data, error } = await supabase
      .from("trades")
      .select("id, user_id, account_id, instrument, instrument_type, direction, quantity, entry_price, exit_price, stop_loss, take_profit, entry_date, exit_date, status, pnl, commission, strategy, setup_type, market_condition, notes, tags, risk_reward_ratio, external_trade_id, created_at, updated_at")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false });

    if (error) {
      console.error("[Trades] fetch error:", error);
      dispatch({ type: ACTIONS.SET_LOADING, payload: false });
      return;
    }

    const tradeRows = data || [];

    // Fetch images for all trades in one query
    let imagesByTradeId = {};
    if (tradeRows.length > 0) {
      const tradeIds = tradeRows.map((t) => t.id);
      const { data: imgRows } = await supabase
        .from("trade_images")
        .select("id, trade_id, image_url, sort_order, mime_type, caption")
        .in("trade_id", tradeIds)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true });

      if (imgRows && imgRows.length > 0) {
        // Batch-generate signed URLs (single API call)
        const paths = imgRows.map((r) => r.image_url);
        const { data: signedUrls } = await supabase.storage
          .from("trade-images")
          .createSignedUrls(paths, 3600);

        const urlMap = {};
        (signedUrls || []).forEach((item) => {
          if (item.signedUrl) urlMap[item.path] = item.signedUrl;
        });

        imgRows.forEach((row) => {
          if (!imagesByTradeId[row.trade_id]) imagesByTradeId[row.trade_id] = [];
          imagesByTradeId[row.trade_id].push({
            id: row.id,
            storagePath: row.image_url,
            previewUrl: urlMap[row.image_url] || null,
            sortOrder: row.sort_order,
            mimeType: row.mime_type,
            caption: row.caption,
            isNew: false,
            toDelete: false,
          });
        });
      }
    }

    dispatch({
      type: ACTIONS.SET_TRADES,
      payload: tradeRows.map((row) => fromDbRow(row, imagesByTradeId[row.id] || [])),
    });
  }, []);

  // One-time migration: push localStorage trades to Supabase
  const migrateLocalTrades = useCallback(async (userId, accountId) => {
    const migrationKey = `tradesMigrated_${userId}`;
    if (localStorage.getItem(migrationKey)) return;

    const raw = localStorage.getItem("tradeJournalTrades");
    if (!raw) {
      localStorage.setItem(migrationKey, "1");
      return;
    }

    let localTrades;
    try { localTrades = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(localTrades) || localTrades.length === 0) {
      localStorage.setItem(migrationKey, "1");
      return;
    }

    const rows = localTrades.map((t) => toDbRow(t, userId, accountId));
    const { error } = await supabase.from("trades").insert(rows);

    if (error) {
      console.error("[Trades] localStorage migration failed:", error);
    } else {
      toast.success(`Migrated ${localTrades.length} local trades to the cloud.`);
      localStorage.setItem(migrationKey, "1");
      await fetchTrades(userId);
    }
  }, [fetchTrades]);

  // Boot: when auth resolves, load account + trades
  useEffect(() => {
    if (!isAuthenticated || !user) {
      dispatch({ type: ACTIONS.SET_TRADES, payload: [] });
      return;
    }

    (async () => {
      const accountId = await ensureDefaultAccount(user.id);
      dispatch({ type: ACTIONS.SET_ACCOUNT, payload: accountId });
      await fetchTrades(user.id);
      if (!localMigrationDone) {
        await migrateLocalTrades(user.id, accountId);
        setLocalMigrationDone(true);
      }
    })();
  }, [isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const addTrade = useCallback(async (formData) => {
    if (!user) throw new Error("Not authenticated");
    const accountId = state.defaultAccountId;
    if (!accountId) throw new Error("No trading account available");

    const row = toDbRow(formData, user.id, accountId);
    const { data, error } = await supabase
      .from("trades")
      .insert(row)
      .select("id, user_id, account_id, instrument, instrument_type, direction, quantity, entry_price, exit_price, stop_loss, take_profit, entry_date, exit_date, status, pnl, commission, strategy, setup_type, market_condition, notes, tags, risk_reward_ratio, external_trade_id, created_at, updated_at")
      .single();

    if (error) {
      console.error("[Trades] insert error:", error);
      throw error;
    }

    const trade = fromDbRow(data);
    dispatch({ type: ACTIONS.ADD_TRADE, payload: trade });
    logActivity(user.id, "trade_created", { trade_id: trade.id, instrument: trade.instrument, direction: trade.direction });
    return trade;
  }, [user, state.defaultAccountId]);

  const updateTrade = useCallback(async (tradeId, formData) => {
    if (!user || !tradeId) throw new Error("Invalid update params");

    const { account_id, user_id, ...updateFields } = toDbRow(formData, user.id, state.defaultAccountId);

    const { data, error } = await supabase
      .from("trades")
      .update(updateFields)
      .eq("id", tradeId)
      .eq("user_id", user.id)
      .select("id, user_id, account_id, instrument, instrument_type, direction, quantity, entry_price, exit_price, stop_loss, take_profit, entry_date, exit_date, status, pnl, commission, strategy, setup_type, market_condition, notes, tags, risk_reward_ratio, external_trade_id, created_at, updated_at")
      .single();

    if (error) {
      console.error("[Trades] update error:", error);
      throw error;
    }

    const trade = fromDbRow(data);
    dispatch({ type: ACTIONS.UPDATE_TRADE, payload: trade });
    logActivity(user.id, "trade_updated", { trade_id: tradeId, instrument: trade.instrument });
    return trade;
  }, [user, state.defaultAccountId]);

  const deleteTrade = useCallback(async (tradeId) => {
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("trades")
      .delete()
      .eq("id", tradeId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[Trades] delete error:", error);
      throw error;
    }

    dispatch({ type: ACTIONS.DELETE_TRADE, payload: tradeId });
    logActivity(user.id, "trade_deleted", { trade_id: tradeId });
  }, [user]);

  const setFilters = useCallback((filters) => {
    dispatch({ type: ACTIONS.SET_FILTERS, payload: filters });
  }, []);

  const importTrades = useCallback(async (trades) => {
    if (!user || !state.defaultAccountId) throw new Error("Not ready");

    const existingBrokerIds = new Set(
      state.trades.filter((t) => t.brokerTradeId).map((t) => t.brokerTradeId)
    );

    const newRows = trades
      .filter((t) => !existingBrokerIds.has(t.brokerTradeId))
      .map((t) => toDbRow(t, user.id, state.defaultAccountId));

    if (newRows.length === 0) return 0;

    const { data, error } = await supabase
      .from("trades")
      .insert(newRows)
      .select("id, user_id, account_id, instrument, instrument_type, direction, quantity, entry_price, exit_price, stop_loss, take_profit, entry_date, exit_date, status, pnl, commission, strategy, setup_type, market_condition, notes, tags, risk_reward_ratio, external_trade_id, created_at, updated_at");

    if (error) throw error;

    const imported = (data || []).map(fromDbRow);
    const trades2 = [...state.trades, ...imported];
    dispatch({ type: ACTIONS.SET_TRADES, payload: trades2 });
    logActivity(user.id, "trades_imported", { count: imported.length });
    return imported.length;
  }, [user, state.defaultAccountId, state.trades]);

  // ── Filtered trades ───────────────────────────────────────────────────────

  const getFilteredTrades = () => {
    return state.trades.filter((trade) => {
      const { dateRange, instrument, strategy, outcome } = state.filters;

      if (dateRange !== "all") {
        const tradeDate = new Date(trade.entryDate);
        const now = new Date();
        let startDate;
        switch (dateRange) {
          case "7d":  startDate = new Date(now - 7  * 86400000); break;
          case "30d": startDate = new Date(now - 30 * 86400000); break;
          case "90d": startDate = new Date(now - 90 * 86400000); break;
          default:    startDate = new Date(0);
        }
        if (tradeDate < startDate) return false;
      }

      if (instrument !== "all" && trade.instrument !== instrument) return false;
      if (strategy  !== "all" && trade.strategy  !== strategy)   return false;
      if (outcome   !== "all") {
        if (outcome === "winning" && trade.pnl <= 0) return false;
        if (outcome === "losing"  && trade.pnl >= 0) return false;
      }

      return true;
    });
  };

  // Upload an image file and insert a row into trade_images
  const saveTradeImage = useCallback(async (tradeId, file, sortOrder) => {
    if (!user) throw new Error("Not authenticated");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${tradeId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("trade-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw uploadError;

    const { error: insertError } = await supabase.from("trade_images").insert({
      trade_id:   tradeId,
      user_id:    user.id,
      image_url:  path,
      sort_order: sortOrder,
      mime_type:  file.type,
      file_size:  file.size,
      image_type: "chart",
    });

    if (insertError) throw insertError;
    return path;
  }, [user]);

  // Soft-delete a trade image — sets deleted_at so it's hidden from normal queries
  // but remains in storage and is recoverable by an admin via the deleted_at IS NOT NULL filter.
  const deleteTradeImage = useCallback(async (imageId) => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("trade_images")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", imageId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }, [user]);

  // Update sort_order for an existing image row
  const updateTradeImageOrder = useCallback(async (imageId, sortOrder) => {
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("trade_images")
      .update({ sort_order: sortOrder })
      .eq("id", imageId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  }, [user]);

  const value = {
    trades:          state.trades,
    filteredTrades:  getFilteredTrades(),
    filters:         state.filters,
    stats:           state.stats,
    loading:         state.loading,
    defaultAccountId: state.defaultAccountId,
    addTrade,
    updateTrade,
    deleteTrade,
    setFilters,
    importTrades,
    saveTradeImage,
    deleteTradeImage,
    updateTradeImageOrder,
    refreshTrades:   () => user && fetchTrades(user.id),
  };

  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>;
};

export const useTrades = () => {
  const ctx = useContext(TradeContext);
  if (!ctx) throw new Error("useTrades must be used within a TradeProvider");
  return ctx;
};

export { TradeContext };
