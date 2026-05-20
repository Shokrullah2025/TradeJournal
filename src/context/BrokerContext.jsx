import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

const BrokerContext = createContext();

// Broker configuration.
// clientSecret is intentionally absent — it lives in Edge Function env vars only.
// NEVER add clientSecret or VITE_*_SECRET here.
const BROKERS = {
  tradovate: {
    name: "Tradovate",
    type: "live",
    authType: "oauth",
    description: "Professional futures trading platform",
    logo: "📈",
    propFirms: [
      "Apex Trader Funding",
      "MyFundedFutures",
      "Bulenox",
      "Take Profit Trader",
      "Other",
    ],
    oauthConfig: {
      demo: {
        clientId:
          import.meta.env.VITE_TRADOVATE_DEMO_CLIENT_ID || "YOUR_DEMO_CLIENT_ID",
        redirectUri: `${window.location.origin}/auth/callback/tradovate`,
        authUrl: "https://trader-test.tradovate.com/oauth",
        scopes: ["read", "trade"],
      },
      live: {
        clientId:
          import.meta.env.VITE_TRADOVATE_LIVE_CLIENT_ID || "YOUR_LIVE_CLIENT_ID",
        redirectUri: `${window.location.origin}/auth/callback/tradovate`,
        authUrl: "https://trader.tradovate.com/oauth",
        scopes: ["read", "trade"],
      },
    },
  },
  alpaca: {
    name: "Alpaca Trading",
    type: "live",
    authType: "oauth",
    description: "Commission-free stock trading",
    logo: "🦙",
    oauthConfig: {
      clientId: import.meta.env.VITE_ALPACA_CLIENT_ID || "your-alpaca-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "https://app.alpaca.markets/oauth/authorize",
      scopes: ["account:read", "trading"],
    },
  },
  demo: {
    name: "Demo Tradovate",
    type: "demo",
    authType: "demo",
    description: "Simulated Tradovate OAuth flow for testing",
    logo: "📈",
    oauthConfig: {
      clientId: "demo-tradovate-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "demo://tradovate/auth",
      scopes: ["read", "trade"],
    },
  },
};

const initialState = {
  selectedBroker: null,
  brokerConfig: {},
  propFirm: null,
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  accounts: [],
  selectedAccount: null,
  syncStatus: "idle",
  lastSync: null,
  autoSync: false,
  syncInterval: 300000,
};

// Non-sensitive fields that are safe to persist in localStorage
const SAFE_CONFIG_KEYS = [
  "selectedBroker",
  "brokerConfig",
  "propFirm",
  "isConnected",
  "accounts",
  "selectedAccount",
  "autoSync",
  "syncInterval",
];

class BrokerService {
  constructor() {
    this.intervalId = null;
    this.oauthPopup = null;
    this.oauthResolve = null;
    this.oauthReject = null;
    this.setupOAuthCallback();
  }

  setupOAuthCallback() {
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data.type === "OAUTH_SUCCESS") {
        this.handleOAuthSuccess(event.data.broker, event.data.code, event.data.accountType);
      } else if (event.data.type === "OAUTH_ERROR") {
        this.handleOAuthError(event.data.error);
      }
    });
  }

  getBrokers() {
    return BROKERS;
  }

  startOAuthFlow(brokerKey, accountType = "live") {
    const broker = BROKERS[brokerKey];
    if (!broker || !broker.oauthConfig) {
      throw new Error("OAuth not supported for this broker");
    }

    if (brokerKey === "demo") {
      return this.handleDemoOAuth(brokerKey);
    }

    const config =
      broker.oauthConfig[accountType] ?? broker.oauthConfig;

    if (!config) {
      throw new Error(`${accountType} account type not supported for this broker`);
    }

    const { clientId, redirectUri, authUrl, scopes } = config;

    // Catch missing credentials before opening the popup — gives a clear message
    const isPlaceholder =
      !clientId ||
      clientId.startsWith("YOUR_") ||
      clientId.startsWith("your-") ||
      clientId === "your-alpaca-client-id";

    if (isPlaceholder) {
      const envKey = brokerKey === "tradovate"
        ? `VITE_TRADOVATE_${accountType.toUpperCase()}_CLIENT_ID`
        : `VITE_${brokerKey.toUpperCase()}_CLIENT_ID`;
      throw new Error(
        `Tradovate credentials not configured.\n\nAdd ${envKey} to your .env file, then restart the dev server.\n\nAlternatively, use "Import CSV" to import trades without connecting a broker.`
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state: JSON.stringify({ broker: brokerKey, accountType, timestamp: Date.now() }),
    });

    const oauthUrl = `${authUrl}?${params.toString()}`;

    const popupWidth = 600;
    const popupHeight = 700;
    const left = (window.innerWidth - popupWidth) / 2;
    const top = (window.innerHeight - popupHeight) / 2;

    this.oauthPopup = window.open(
      oauthUrl,
      "oauth_popup",
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );

    if (!this.oauthPopup) {
      throw new Error("Failed to open OAuth popup. Please allow popups and try again.");
    }

    return new Promise((resolve, reject) => {
      this.oauthResolve = resolve;
      this.oauthReject = reject;

      const checkClosed = setInterval(() => {
        if (this.oauthPopup && this.oauthPopup.closed) {
          clearInterval(checkClosed);
          this.oauthReject(new Error("OAuth popup was closed"));
        }
      }, 1000);
    });
  }

  handleDemoOAuth(brokerKey) {
    return new Promise((resolve) => {
      const demoLoginHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Tradovate - OAuth Login</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f8f9fa; }
            .header { background: #1a73e8; color: white; padding: 20px; text-align: center; }
            .container { max-width: 420px; margin: 40px auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
            .form-content { padding: 40px; }
            h1 { color: #1a73e8; text-align: center; margin-bottom: 10px; font-size: 24px; }
            .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 14px; }
            .form-group { margin-bottom: 20px; }
            label { display: block; margin-bottom: 8px; font-weight: 500; color: #333; font-size: 14px; }
            input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px; box-sizing: border-box; }
            input:focus { outline: none; border-color: #1a73e8; }
            .login-btn { width: 100%; padding: 14px; background: #1a73e8; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; }
            .login-btn:hover { background: #1557b0; }
            .demo-notice { background: #e8f5e8; border: 1px solid #4caf50; color: #2e7d32; padding: 12px; border-radius: 6px; margin-bottom: 20px; font-size: 14px; text-align: center; }
            .permissions { background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
            .permissions h3 { margin: 0 0 10px 0; font-size: 14px; color: #333; }
            .permissions ul { margin: 0; padding-left: 20px; font-size: 13px; color: #666; }
            .loading { display: none; text-align: center; padding: 20px; }
            .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #1a73e8; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="header"><h2>📈 Tradovate</h2><p>Professional Futures Trading Platform</p></div>
          <div class="container">
            <div class="form-content">
              <h1>Sign In to Your Account</h1>
              <p class="subtitle">Continue to Trade Journal integration</p>
              <div class="demo-notice">🧪 <strong>Demo Mode:</strong> This is a simulated login for testing</div>
              <div class="permissions">
                <h3>Trade Journal will be able to:</h3>
                <ul><li>View your account information</li><li>Read your trade history</li><li>Access position data</li></ul>
              </div>
              <form id="loginForm">
                <div class="form-group">
                  <label>Username or Email:</label>
                  <input type="text" id="username" placeholder="Enter your username" value="demo@tradovate.com" required>
                </div>
                <div class="form-group">
                  <label>Password:</label>
                  <input type="password" id="password" placeholder="Enter your password" value="demo123" required>
                </div>
                <button type="submit" class="login-btn">Sign In & Authorize</button>
              </form>
              <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Authenticating and connecting to your account...</p>
              </div>
            </div>
          </div>
          <script>
            document.getElementById('loginForm').addEventListener('submit', function(e) {
              e.preventDefault();
              document.getElementById('loginForm').style.display = 'none';
              document.getElementById('loading').style.display = 'block';
              setTimeout(() => {
                const authCode = 'demo_tradovate_auth_code_' + Date.now();
                const state = JSON.stringify({ broker: '${brokerKey}', accountType: 'demo', timestamp: Date.now() });
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_SUCCESS', broker: '${brokerKey}', code: authCode, accountType: 'demo', state }, '*');
                  window.close();
                }
              }, 2000);
            });
          </script>
        </body>
        </html>
      `;

      const popupWidth = 500;
      const popupHeight = 700;
      const left = (window.innerWidth - popupWidth) / 2;
      const top = (window.innerHeight - popupHeight) / 2;

      this.oauthPopup = window.open(
        "",
        "tradovate_oauth_popup",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`,
      );

      if (this.oauthPopup) {
        this.oauthPopup.document.write(demoLoginHtml);
        this.oauthPopup.document.close();
      }

      this.oauthResolve = resolve;
      this.oauthReject = (error) => resolve({ success: false, error });
    });
  }

  handleOAuthSuccess(brokerKey, authCode, accountType = "demo") {
    if (this.oauthPopup) {
      this.oauthPopup.close();
    }

    this.exchangeCodeForToken(brokerKey, authCode, accountType)
      .then((result) => { if (this.oauthResolve) this.oauthResolve(result); })
      .catch((error) => { if (this.oauthReject) this.oauthReject(error); });
  }

  handleOAuthError(error) {
    if (this.oauthPopup) {
      this.oauthPopup.close();
    }
    if (this.oauthReject) {
      this.oauthReject(new Error(error));
    }
  }

  // Token exchange: demo is client-side; real brokers go through the Edge Function.
  // The client secret is NEVER sent from the browser — the Edge Function holds it.
  async exchangeCodeForToken(brokerKey, authCode, accountType = "demo") {
    if (brokerKey === "demo") {
      return this.handleDemoTokenExchange(authCode);
    }

    const broker = BROKERS[brokerKey];
    if (!broker || !broker.oauthConfig) {
      throw new Error("OAuth not supported for this broker");
    }

    const config = broker.oauthConfig[accountType] ?? broker.oauthConfig;
    const isPlaceholder =
      !config.clientId ||
      config.clientId.startsWith("YOUR_") ||
      config.clientId.startsWith("your-");

    if (isPlaceholder) {
      throw new Error(
        `Set up required: add VITE_TRADOVATE_${accountType.toUpperCase()}_CLIENT_ID in your .env file.`,
      );
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("You must be logged in to connect a broker.");
    }

    const { data, error } = await supabase.functions.invoke("broker-oauth", {
      body: {
        broker: brokerKey,
        code: authCode,
        accountType,
        redirectUri: config.redirectUri,
        propFirm: this._pendingPropFirm ?? null,
      },
    });

    if (error) {
      throw new Error(error.message || "Failed to connect broker");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Failed to connect broker");
    }

    return {
      success: true,
      accounts: [
        {
          id: data.data.accountId,
          name: data.data.accountName,
          balance: data.data.balance ?? 0,
          type: accountType,
        },
      ],
      accountType,
    };
  }

  async handleDemoTokenExchange(authCode) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          accounts: [
            {
              id: "DEMO_FUTURES_001",
              name: "Demo Futures Account",
              balance: 25000,
              equity: 26350,
              type: "demo",
            },
          ],
          accountType: "demo",
        });
      }, 1500);
    });
  }

  async connect(brokerKey, config = {}) {
    const broker = BROKERS[brokerKey];
    if (!broker) {
      throw new Error("Invalid broker selected");
    }

    // Store propFirm so exchangeCodeForToken can include it in the Edge Function call
    this._pendingPropFirm = config.propFirm ?? null;

    const accountType = config.accountType || "demo";
    return this.startOAuthFlow(brokerKey, accountType);
  }

  // Demo trade fetch (no real API call — purely client-side simulation)
  async fetchDemoTrades() {
    const demoOrders = [
      { id: "DEMO_ES_001", symbol: "ESH25", side: "buy", qty: 2, filled_at: "2025-01-10T09:30:00Z", filled_avg_price: 4850.25, commission: 4.8 },
      { id: "DEMO_ES_002", symbol: "ESH25", side: "sell", qty: 2, filled_at: "2025-01-10T10:45:00Z", filled_avg_price: 4862.75, commission: 4.8 },
      { id: "DEMO_NQ_001", symbol: "NQH25", side: "buy", qty: 1, filled_at: "2025-01-10T13:15:00Z", filled_avg_price: 20125.0, commission: 2.4 },
      { id: "DEMO_NQ_002", symbol: "NQH25", side: "sell", qty: 1, filled_at: "2025-01-10T14:30:00Z", filled_avg_price: 20089.25, commission: 2.4 },
      { id: "DEMO_CL_001", symbol: "CLH25", side: "buy", qty: 1, filled_at: "2025-01-11T08:00:00Z", filled_avg_price: 73.45, commission: 3.2 },
      { id: "DEMO_CL_002", symbol: "CLH25", side: "sell", qty: 1, filled_at: "2025-01-11T11:20:00Z", filled_avg_price: 74.12, commission: 3.2 },
    ];

    return new Promise((resolve) => {
      setTimeout(() => resolve(this.transformDemoTrades(demoOrders)), 1500);
    });
  }

  transformDemoTrades(orders) {
    const trades = [];

    for (let i = 0; i + 1 < orders.length; i += 2) {
      const entry = orders[i];
      const exit = orders[i + 1];
      if (!entry || !exit) continue;

      const entryPrice = parseFloat(entry.filled_avg_price);
      const exitPrice = parseFloat(exit.filled_avg_price);
      const quantity = parseInt(entry.qty);
      const isLong = entry.side === "buy";

      let multiplier = 1;
      if (entry.symbol.startsWith("ES")) multiplier = 50;
      else if (entry.symbol.startsWith("NQ")) multiplier = 20;
      else if (entry.symbol.startsWith("CL")) multiplier = 1000;

      const pnl = isLong
        ? (exitPrice - entryPrice) * quantity * multiplier
        : (entryPrice - exitPrice) * quantity * multiplier;

      const totalCommission = (entry.commission || 0) + (exit.commission || 0);

      trades.push({
        id: `${entry.id}_${exit.id}`,
        instrumentType: "futures",
        instrument: entry.symbol,
        tradeType: isLong ? "long" : "short",
        strategy: "Imported from Demo Tradovate",
        entryDate: entry.filled_at.split("T")[0],
        entryTime: entry.filled_at.split("T")[1].replace("Z", ""),
        entryPrice,
        exitDate: exit.filled_at.split("T")[0],
        exitTime: exit.filled_at.split("T")[1].replace("Z", ""),
        exitPrice,
        quantity,
        status: "closed",
        brokerTradeId: entry.id,
        brokerSource: "demo",
        fees: totalCommission,
        pnl: parseFloat((pnl - totalCommission).toFixed(2)),
        grossPnl: pnl,
        notes: `Imported from Demo Tradovate - ${entry.symbol} futures`,
        tags: ["demo", "tradovate", "futures", "imported"],
      });
    }

    return trades;
  }

  startAutoSync(callback, interval = 300000) {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = setInterval(callback, interval);
  }

  stopAutoSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const BrokerProvider = ({ children }) => {
  const [state, setState] = useState(initialState);
  const [brokerService] = useState(() => new BrokerService());

  // Restore non-sensitive connection state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("brokerConfig");
    if (saved) {
      try {
        const config = JSON.parse(saved);
        const safeConfig = {};
        for (const key of SAFE_CONFIG_KEYS) {
          if (key in config) safeConfig[key] = config[key];
        }
        setState((prev) => ({ ...prev, ...safeConfig }));
      } catch {
        // Ignore malformed config
      }
    }
  }, []);

  // Save only non-sensitive fields to localStorage
  const saveBrokerConfig = (config) => {
    const safeConfig = {};
    for (const key of SAFE_CONFIG_KEYS) {
      if (key in config) safeConfig[key] = config[key];
    }
    localStorage.setItem("brokerConfig", JSON.stringify(safeConfig));
  };

  const connectBroker = async (brokerKey, config) => {
    setState((prev) => ({ ...prev, isConnecting: true, connectionError: null }));

    try {
      const result = await brokerService.connect(brokerKey, config);

      if (result.success) {
        const firmLabel = config.propFirm || null;
        const newState = {
          selectedBroker: brokerKey,
          brokerConfig: config,
          propFirm: firmLabel,
          isConnected: true,
          isConnecting: false,
          connectionError: null,
          accounts: result.accounts,
          selectedAccount: result.accounts[0]?.id ?? null,
        };

        setState((prev) => ({ ...prev, ...newState }));
        saveBrokerConfig(newState);
        const displayName = firmLabel || BROKERS[brokerKey].name;
        toast.success(`Connected to ${displayName}`);
        return true;
      }

      setState((prev) => ({
        ...prev,
        isConnecting: false,
        connectionError: result.error,
      }));
      toast.error(result.error || "Connection failed");
      return false;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        connectionError: error.message,
      }));
      toast.error(error.message);
      return false;
    }
  };

  const disconnectBroker = () => {
    brokerService.stopAutoSync();
    setState((prev) => ({
      ...prev,
      selectedBroker: null,
      brokerConfig: {},
      isConnected: false,
      connectionError: null,
      accounts: [],
      selectedAccount: null,
    }));
    localStorage.removeItem("brokerConfig");
    toast.success("Disconnected from broker");
  };

  // Sync trades: demo fetches client-side; real brokers go through the Edge Function.
  const syncTrades = async (onTradesImported) => {
    if (!state.selectedBroker || !state.selectedAccount) {
      toast.error("Please select a broker and account first");
      return;
    }

    setState((prev) => ({ ...prev, syncStatus: "syncing" }));

    try {
      if (state.selectedBroker === "demo") {
        const trades = await brokerService.fetchDemoTrades();

        if (typeof onTradesImported === "function" && trades.length > 0) {
          onTradesImported(trades);
        }

        setState((prev) => ({ ...prev, syncStatus: "success", lastSync: new Date() }));
        toast.success(`Imported ${trades.length} demo trades`);
        return;
      }

      // Real broker: delegate entirely to the Edge Function.
      // The access token never leaves the server.
      const { data, error } = await supabase.functions.invoke("broker-sync", {
        body: {
          broker: state.selectedBroker,
          accountId: state.selectedAccount,
          fromDate: state.lastSync ? state.lastSync.toISOString() : null,
        },
      });

      if (error) throw new Error(error.message || "Sync failed");
      if (!data?.success) throw new Error(data?.error || "Sync failed");

      const { imported = 0, skipped = 0 } = data.data ?? {};

      setState((prev) => ({ ...prev, syncStatus: "success", lastSync: new Date() }));

      if (imported > 0) {
        // Signal the caller to reload trades from the DB
        if (typeof onTradesImported === "function") onTradesImported();
        toast.success(`Imported ${imported} trade${imported !== 1 ? "s" : ""} (${skipped} skipped)`);
      } else {
        toast.info("No new trades found");
      }
    } catch (error) {
      setState((prev) => ({ ...prev, syncStatus: "error" }));
      toast.error(`Sync failed: ${error.message}`);
    }
  };

  const toggleAutoSync = (enabled) => {
    setState((prev) => ({ ...prev, autoSync: enabled }));

    if (enabled) {
      brokerService.startAutoSync(() => syncTrades(), state.syncInterval);
    } else {
      brokerService.stopAutoSync();
    }

    saveBrokerConfig({ ...state, autoSync: enabled });
  };

  const setSyncInterval = (interval) => {
    setState((prev) => ({ ...prev, syncInterval: interval }));

    if (state.autoSync) {
      brokerService.startAutoSync(() => syncTrades(), interval);
    }

    saveBrokerConfig({ ...state, syncInterval: interval });
  };

  const value = {
    ...state,
    brokers: BROKERS,
    connectBroker,
    disconnectBroker,
    syncTrades,
    toggleAutoSync,
    setSyncInterval,
    brokerService,
  };

  return (
    <BrokerContext.Provider value={value}>{children}</BrokerContext.Provider>
  );
};

export const useBroker = () => {
  const context = useContext(BrokerContext);
  if (!context) {
    throw new Error("useBroker must be used within a BrokerProvider");
  }
  return context;
};
