import React, { createContext, useContext, useState, useEffect } from "react";
import toast from "react-hot-toast";

const BrokerContext = createContext();

// Available brokers configuration
const BROKERS = {
  tradovate: {
    name: "Tradovate",
    type: "live",
    authType: "oauth",
    description: "Professional futures trading platform",
    logo: "📈",
    oauthConfig: {
      clientId: "3239",
      redirectUri: `${window.location.origin}/auth/callback/tradovate`,
      authUrl: "https://trader.tradovate.com/oauth",
      scopes: ["read", "trade"],
      endpoints: {
        authorize: "https://trader.tradovate.com/oauth",
        token: "https://live.tradovateapi.com/v1/auth/accesstokenrequest",
        account: "https://live.tradovateapi.com/v1/account/list",
        orders: "https://live.tradovateapi.com/v1/order/list",
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
      clientId: "your-alpaca-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "https://app.alpaca.markets/oauth/authorize",
      scopes: ["account:read", "trading"],
      endpoints: {
        authorize: "https://app.alpaca.markets/oauth/authorize",
        token: "https://api.alpaca.markets/oauth/token",
        account: "https://paper-api.alpaca.markets/v2/account",
        orders: "https://paper-api.alpaca.markets/v2/orders",
      },
    },
  },
  tda: {
    name: "TD Ameritrade",
    type: "live",
    authType: "oauth",
    description: "Full-service brokerage platform",
    logo: "🏦",
    oauthConfig: {
      clientId: "your-tda-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "https://auth.tdameritrade.com/auth",
      scopes: ["read", "trade"],
      endpoints: {
        authorize: "https://auth.tdameritrade.com/auth",
        token: "https://api.tdameritrade.com/v1/oauth2/token",
        account: "https://api.tdameritrade.com/v1/accounts",
        orders: "https://api.tdameritrade.com/v1/orders",
      },
    },
  },
  schwab: {
    name: "Charles Schwab",
    type: "live",
    authType: "oauth",
    description: "Comprehensive investment platform",
    logo: "�️",
    oauthConfig: {
      clientId: "your-schwab-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "https://api.schwabapi.com/oauth/authorize",
      scopes: ["read", "trade"],
      endpoints: {
        authorize: "https://api.schwabapi.com/oauth/authorize",
        token: "https://api.schwabapi.com/oauth/token",
        account: "https://api.schwabapi.com/v1/accounts",
        orders: "https://api.schwabapi.com/v1/orders",
      },
    },
  },
  ib: {
    name: "Interactive Brokers",
    type: "live",
    authType: "oauth",
    description: "Professional trading platform",
    logo: "🔗",
    oauthConfig: {
      clientId: "your-ib-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "https://www.interactivebrokers.com/oauth/authorize",
      scopes: ["read", "trade"],
      endpoints: {
        authorize: "https://www.interactivebrokers.com/oauth/authorize",
        token: "https://api.interactivebrokers.com/oauth/token",
        account: "https://localhost:5000/v1/api/accounts",
        orders: "https://localhost:5000/v1/api/iserver/orders",
      },
    },
  },
  etrade: {
    name: "E*TRADE",
    type: "live",
    authType: "oauth",
    description: "Online trading and investing",
    logo: "�",
    oauthConfig: {
      clientId: "your-etrade-client-id",
      redirectUri: `${window.location.origin}/auth/callback`,
      authUrl: "https://api.etrade.com/oauth/authorize",
      scopes: ["read", "trade"],
      endpoints: {
        authorize: "https://api.etrade.com/oauth/authorize",
        token: "https://api.etrade.com/oauth/token",
        account: "https://api.etrade.com/v1/account/list",
        orders: "https://api.etrade.com/v1/account/{accountId}/orders",
      },
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
      endpoints: {
        authorize: "demo://tradovate/auth",
        token: "demo://tradovate/token",
        account: "demo://tradovate/account",
        orders: "demo://tradovate/orders",
      },
    },
  },
};

// Initial state
const initialState = {
  selectedBroker: null,
  brokerConfig: {},
  isConnected: false,
  isConnecting: false,
  connectionError: null,
  accounts: [],
  selectedAccount: null,
  syncStatus: "idle", // idle, syncing, success, error
  lastSync: null,
  autoSync: false,
  syncInterval: 300000, // 5 minutes
};

// Broker service class
class BrokerService {
  constructor() {
    this.intervalId = null;
    this.oauthPopup = null;
    this.setupOAuthCallback();
  }

  // Setup OAuth callback listener
  setupOAuthCallback() {
    window.addEventListener("message", (event) => {
      if (event.origin !== window.location.origin) return;

      if (event.data.type === "OAUTH_SUCCESS") {
        this.handleOAuthSuccess(event.data.broker, event.data.code);
      } else if (event.data.type === "OAUTH_ERROR") {
        this.handleOAuthError(event.data.error);
      }
    });
  }

  // Get available brokers
  getBrokers() {
    return BROKERS;
  }

  // Start OAuth flow
  startOAuthFlow(brokerKey) {
    const broker = BROKERS[brokerKey];
    if (!broker || !broker.oauthConfig) {
      throw new Error("OAuth not supported for this broker");
    }

    // Handle demo broker differently
    if (brokerKey === "demo") {
      return this.handleDemoOAuth(brokerKey);
    }

    const { clientId, redirectUri, authUrl, scopes } = broker.oauthConfig;

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state: JSON.stringify({ broker: brokerKey, timestamp: Date.now() }),
    });

    const oauthUrl = `${authUrl}?${params.toString()}`;

    // Open OAuth popup
    const popupWidth = 600;
    const popupHeight = 700;
    const left = (window.innerWidth - popupWidth) / 2;
    const top = (window.innerHeight - popupHeight) / 2;

    this.oauthPopup = window.open(
      oauthUrl,
      "oauth_popup",
      `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    return new Promise((resolve, reject) => {
      this.oauthResolve = resolve;
      this.oauthReject = reject;

      // Check if popup is closed manually
      const checkClosed = setInterval(() => {
        if (this.oauthPopup && this.oauthPopup.closed) {
          clearInterval(checkClosed);
          this.oauthReject(new Error("OAuth popup was closed"));
        }
      }, 1000);
    });
  }

  // Handle demo OAuth (simulate the flow)
  handleDemoOAuth(brokerKey) {
    return new Promise((resolve) => {
      // Create a demo login popup that looks like Tradovate
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
            input { width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 16px; transition: border-color 0.2s; }
            input:focus { outline: none; border-color: #1a73e8; }
            .login-btn { width: 100%; padding: 14px; background: #1a73e8; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
            .login-btn:hover { background: #1557b0; }
            .login-btn:disabled { background: #ccc; cursor: not-allowed; }
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
          <div class="header">
            <h2>📈 Tradovate</h2>
            <p>Professional Futures Trading Platform</p>
          </div>
          
          <div class="container">
            <div class="form-content">
              <h1>Sign In to Your Account</h1>
              <p class="subtitle">Continue to Trade Journal integration</p>
              
              <div class="demo-notice">
                🧪 <strong>Demo Mode:</strong> This is a simulated Tradovate login for testing purposes
              </div>
              
              <div class="permissions">
                <h3>Trade Journal will be able to:</h3>
                <ul>
                  <li>View your account information</li>
                  <li>Read your trade history</li>
                  <li>Access position data</li>
                </ul>
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
              
              const form = document.getElementById('loginForm');
              const loading = document.getElementById('loading');
              
              form.style.display = 'none';
              loading.style.display = 'block';
              
              setTimeout(() => {
                const authCode = 'demo_tradovate_auth_code_' + Date.now();
                const state = JSON.stringify({ broker: '${brokerKey}', timestamp: Date.now() });
                
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'OAUTH_SUCCESS',
                    broker: '${brokerKey}',
                    code: authCode,
                    state: state
                  }, '*');
                  window.close();
                } else {
                  window.location.href = '${window.location.origin}/auth/callback?code=' + authCode + '&state=' + encodeURIComponent(state);
                }
              }, 2000);
            });
          </script>
        </body>
        </html>
      `;

      // Open demo login popup
      const popupWidth = 500;
      const popupHeight = 700;
      const left = (window.innerWidth - popupWidth) / 2;
      const top = (window.innerHeight - popupHeight) / 2;

      this.oauthPopup = window.open(
        "",
        "tradovate_oauth_popup",
        `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (this.oauthPopup) {
        this.oauthPopup.document.write(demoLoginHtml);
        this.oauthPopup.document.close();
      }

      this.oauthResolve = resolve;
      this.oauthReject = (error) => resolve({ success: false, error });
    });
  }

  // Handle OAuth success
  handleOAuthSuccess(brokerKey, authCode) {
    if (this.oauthPopup) {
      this.oauthPopup.close();
    }

    this.exchangeCodeForToken(brokerKey, authCode)
      .then((result) => {
        if (this.oauthResolve) {
          this.oauthResolve(result);
        }
      })
      .catch((error) => {
        if (this.oauthReject) {
          this.oauthReject(error);
        }
      });
  }

  // Handle OAuth error
  handleOAuthError(error) {
    if (this.oauthPopup) {
      this.oauthPopup.close();
    }

    if (this.oauthReject) {
      this.oauthReject(new Error(error));
    }
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(brokerKey, authCode) {
    const broker = BROKERS[brokerKey];
    if (!broker || !broker.oauthConfig) {
      throw new Error("OAuth not supported for this broker");
    }

    // Handle demo broker
    if (brokerKey === "demo") {
      return this.handleDemoTokenExchange(authCode);
    }

    const { clientId, redirectUri } = broker.oauthConfig;
    const tokenUrl = broker.oauthConfig.endpoints.token;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          redirect_uri: redirectUri,
          code: authCode,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Token exchange failed: ${response.status}. This is expected since we're using placeholder client credentials. To connect to real ${broker.name}, you need to register your app and get valid client credentials.`
        );
      }

      const tokenData = await response.json();

      // Store token securely
      this.storeToken(brokerKey, tokenData);

      // Fetch account information
      const accountData = await this.fetchAccountInfo(
        brokerKey,
        tokenData.access_token
      );

      return {
        success: true,
        token: tokenData,
        accounts: accountData,
      };
    } catch (error) {
      throw new Error(`Token exchange failed: ${error.message}`);
    }
  }

  // Handle demo token exchange
  async handleDemoTokenExchange(authCode) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const tokenData = {
          access_token: "demo_tradovate_token_" + Date.now(),
          refresh_token: "demo_tradovate_refresh_" + Date.now(),
          expires_in: 3600,
          token_type: "Bearer",
        };

        // Store token
        this.storeToken("demo", tokenData);

        // Return demo account data that looks like Tradovate
        resolve({
          success: true,
          token: tokenData,
          accounts: [
            {
              id: "123456789",
              name: "Demo Futures Account",
              balance: 25000,
              equity: 26350,
              type: "futures",
              currency: "USD",
              marginUsed: 1650,
              marginAvailable: 23700,
            },
          ],
        });
      }, 1500);
    });
  }

  // Store token securely
  storeToken(brokerKey, tokenData) {
    const tokenInfo = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
      token_type: tokenData.token_type || "Bearer",
    };

    localStorage.setItem(`${brokerKey}_token`, JSON.stringify(tokenInfo));
  }

  // Get stored token
  getStoredToken(brokerKey) {
    const stored = localStorage.getItem(`${brokerKey}_token`);
    if (!stored) return null;

    try {
      const tokenInfo = JSON.parse(stored);

      // Check if token is expired
      if (Date.now() >= tokenInfo.expires_at) {
        this.refreshToken(brokerKey, tokenInfo.refresh_token);
        return null;
      }

      return tokenInfo;
    } catch (error) {
      return null;
    }
  }

  // Refresh access token
  async refreshToken(brokerKey, refreshToken) {
    const broker = BROKERS[brokerKey];
    if (!broker || !broker.oauthConfig) {
      throw new Error("OAuth not supported for this broker");
    }

    const { clientId } = broker.oauthConfig;
    const tokenUrl = broker.oauthConfig.endpoints.token;

    try {
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const tokenData = await response.json();
      this.storeToken(brokerKey, tokenData);

      return tokenData;
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem(`${brokerKey}_token`);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  // Fetch account information
  async fetchAccountInfo(brokerKey, accessToken) {
    const broker = BROKERS[brokerKey];
    if (!broker || !broker.oauthConfig) {
      throw new Error("OAuth not supported for this broker");
    }

    const accountUrl = broker.oauthConfig.endpoints.account;

    try {
      const response = await fetch(accountUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Account fetch failed: ${response.status}`);
      }

      const accountData = await response.json();
      return this.normalizeAccountData(brokerKey, accountData);
    } catch (error) {
      throw new Error(`Account fetch failed: ${error.message}`);
    }
  }

  // Normalize account data from different brokers
  normalizeAccountData(brokerKey, rawData) {
    switch (brokerKey) {
      case "tradovate":
        return this.normalizeTradovateAccounts(rawData);
      case "alpaca":
        return this.normalizeAlpacaAccounts(rawData);
      case "tda":
        return this.normalizeTDAAccounts(rawData);
      case "schwab":
        return this.normalizeSchwabAccounts(rawData);
      case "ib":
        return this.normalizeIBAccounts(rawData);
      case "etrade":
        return this.normalizeETradeAccounts(rawData);
      case "demo":
        return this.normalizeDemoAccounts(rawData);
      default:
        return [];
    }
  }

  // Normalize Tradovate accounts
  normalizeTradovateAccounts(data) {
    if (!Array.isArray(data)) return [];

    return data.map((account) => ({
      id: account.id,
      name: account.name || `Tradovate Account ${account.id}`,
      balance: parseFloat(account.balance || 0),
      equity: parseFloat(account.netLiquidationValue || 0),
      type: account.accountType || "trading",
    }));
  }

  // Normalize Alpaca accounts
  normalizeAlpacaAccounts(data) {
    return [
      {
        id: data.account_number,
        name: "Alpaca Trading Account",
        balance: parseFloat(data.buying_power || 0),
        equity: parseFloat(data.equity || 0),
        type: "trading",
      },
    ];
  }

  // Normalize TD Ameritrade accounts
  normalizeTDAAccounts(data) {
    if (!Array.isArray(data)) return [];

    return data.map((account) => ({
      id: account.securitiesAccount.accountId,
      name: account.securitiesAccount.accountId,
      balance: parseFloat(
        account.securitiesAccount.currentBalances.buyingPower || 0
      ),
      equity: parseFloat(account.securitiesAccount.currentBalances.equity || 0),
      type: account.securitiesAccount.type || "trading",
    }));
  }

  // Normalize Charles Schwab accounts
  normalizeSchwabAccounts(data) {
    if (!Array.isArray(data)) return [];

    return data.map((account) => ({
      id: account.hashValue,
      name: account.accountNumber,
      balance: parseFloat(account.currentBalances.buyingPower || 0),
      equity: parseFloat(account.currentBalances.equity || 0),
      type: account.type || "trading",
    }));
  }

  // Normalize Interactive Brokers accounts
  normalizeIBAccounts(data) {
    if (!Array.isArray(data)) return [];

    return data.map((account) => ({
      id: account.accountId,
      name: account.accountId,
      balance: parseFloat(account.availableFunds || 0),
      equity: parseFloat(account.netLiquidation || 0),
      type: "trading",
    }));
  }

  // Normalize E*TRADE accounts
  normalizeETradeAccounts(data) {
    if (!data.AccountListResponse || !data.AccountListResponse.Accounts)
      return [];

    return data.AccountListResponse.Accounts.map((account) => ({
      id: account.accountIdKey,
      name: account.accountDesc,
      balance: parseFloat(
        account.accountMode === "CASH"
          ? account.accountBalance
          : account.marginBalance || 0
      ),
      equity: parseFloat(account.accountBalance || 0),
      type: account.accountMode || "trading",
    }));
  }

  // Normalize demo accounts
  normalizeDemoAccounts(data) {
    return [
      {
        id: "DEMO001",
        name: "Demo Trading Account",
        balance: 50000,
        equity: 52500,
        type: "demo",
      },
    ];
  }

  // Connect to broker using OAuth
  async connect(brokerKey) {
    const broker = BROKERS[brokerKey];
    if (!broker) {
      throw new Error("Invalid broker selected");
    }

    if (brokerKey === "demo") {
      return this.connectDemo();
    }

    // Check for existing valid token
    const existingToken = this.getStoredToken(brokerKey);
    if (existingToken) {
      try {
        const accountData = await this.fetchAccountInfo(
          brokerKey,
          existingToken.access_token
        );
        return {
          success: true,
          accounts: accountData,
          token: existingToken,
        };
      } catch (error) {
        // Token might be invalid, proceed with new OAuth flow
        localStorage.removeItem(`${brokerKey}_token`);
      }
    }

    // Start OAuth flow (will show login page, but may fail at token exchange without real credentials)
    return this.startOAuthFlow(brokerKey);
  }

  // Demo broker connection
  async connectDemo() {
    // Use OAuth flow for demo too
    return this.startOAuthFlow("demo");
  }

  // Fetch trades from broker using OAuth
  async fetchTrades(brokerKey, accountId) {
    const broker = BROKERS[brokerKey];
    if (!broker) {
      throw new Error("Invalid broker selected");
    }

    // Get access token
    const token = this.getStoredToken(brokerKey);
    if (!token) {
      throw new Error(
        "No valid access token found. Please reconnect to the broker."
      );
    }

    switch (brokerKey) {
      case "tradovate":
        return this.fetchTradovateTrades(token.access_token, accountId);
      case "alpaca":
        return this.fetchAlpacaTrades(token.access_token, accountId);
      case "tda":
        return this.fetchTDATrades(token.access_token, accountId);
      case "schwab":
        return this.fetchSchwabTrades(token.access_token, accountId);
      case "ib":
        return this.fetchIBTrades(token.access_token, accountId);
      case "etrade":
        return this.fetchEtradeTrades(token.access_token, accountId);
      case "demo":
        return this.fetchDemoTrades(token.access_token, accountId);
      default:
        throw new Error("Broker not supported");
    }
  }

  // Fetch Tradovate trades
  async fetchTradovateTrades(accessToken, accountId) {
    try {
      const response = await fetch(
        `https://live.tradovateapi.com/v1/order/list`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch Tradovate trades");
      }

      const orders = await response.json();
      return this.transformTradovateTrades(orders);
    } catch (error) {
      throw new Error(`Tradovate API error: ${error.message}`);
    }
  }

  // Fetch Alpaca trades with OAuth
  async fetchAlpacaTrades(accessToken, accountId) {
    try {
      const response = await fetch(
        "https://paper-api.alpaca.markets/v2/orders",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch Alpaca trades");
      }

      const orders = await response.json();
      return this.transformAlpacaTrades(orders);
    } catch (error) {
      throw new Error(`Alpaca API error: ${error.message}`);
    }
  }

  // Fetch TD Ameritrade trades
  async fetchTDATrades(accessToken, accountId) {
    try {
      const response = await fetch(
        `https://api.tdameritrade.com/v1/accounts/${accountId}/orders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch TD Ameritrade trades");
      }

      const orders = await response.json();
      return this.transformTDATrades(orders);
    } catch (error) {
      throw new Error(`TD Ameritrade API error: ${error.message}`);
    }
  }

  // Fetch Charles Schwab trades
  async fetchSchwabTrades(accessToken, accountId) {
    try {
      const response = await fetch(
        `https://api.schwabapi.com/v1/accounts/${accountId}/orders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch Schwab trades");
      }

      const orders = await response.json();
      return this.transformSchwabTrades(orders);
    } catch (error) {
      throw new Error(`Schwab API error: ${error.message}`);
    }
  }

  // Fetch Interactive Brokers trades
  async fetchIBTrades(accessToken, accountId) {
    try {
      const response = await fetch(
        `https://localhost:5000/v1/api/iserver/orders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch IB trades");
      }

      const orders = await response.json();
      return this.transformIBTrades(orders);
    } catch (error) {
      throw new Error(`IB API error: ${error.message}`);
    }
  }

  // Fetch E*TRADE trades
  async fetchEtradeTrades(accessToken, accountId) {
    try {
      const response = await fetch(
        `https://api.etrade.com/v1/account/${accountId}/orders`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch E*TRADE trades");
      }

      const orders = await response.json();
      return this.transformEtradeTrades(orders);
    } catch (error) {
      throw new Error(`E*TRADE API error: ${error.message}`);
    }
  }

  // Fetch demo trades
  async fetchDemoTrades(accessToken, accountId) {
    // Simulate fetching trades from Tradovate with realistic futures data
    const demoTrades = [
      {
        id: "DEMO_ES_001",
        symbol: "ESH25",
        side: "buy",
        qty: 2,
        filled_at: "2025-01-10T09:30:00Z",
        filled_avg_price: 4850.25,
        order_type: "market",
        status: "filled",
        commission: 4.8,
      },
      {
        id: "DEMO_ES_002",
        symbol: "ESH25",
        side: "sell",
        qty: 2,
        filled_at: "2025-01-10T10:45:00Z",
        filled_avg_price: 4862.75,
        order_type: "market",
        status: "filled",
        commission: 4.8,
      },
      {
        id: "DEMO_NQ_001",
        symbol: "NQH25",
        side: "buy",
        qty: 1,
        filled_at: "2025-01-10T13:15:00Z",
        filled_avg_price: 20125.0,
        order_type: "market",
        status: "filled",
        commission: 2.4,
      },
      {
        id: "DEMO_NQ_002",
        symbol: "NQH25",
        side: "sell",
        qty: 1,
        filled_at: "2025-01-10T14:30:00Z",
        filled_avg_price: 20089.25,
        order_type: "market",
        status: "filled",
        commission: 2.4,
      },
      {
        id: "DEMO_CL_001",
        symbol: "CLH25",
        side: "buy",
        qty: 1,
        filled_at: "2025-01-11T08:00:00Z",
        filled_avg_price: 73.45,
        order_type: "market",
        status: "filled",
        commission: 3.2,
      },
      {
        id: "DEMO_CL_002",
        symbol: "CLH25",
        side: "sell",
        qty: 1,
        filled_at: "2025-01-11T11:20:00Z",
        filled_avg_price: 74.12,
        order_type: "market",
        status: "filled",
        commission: 3.2,
      },
    ];

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.transformDemoTrades(demoTrades));
      }, 1500);
    });
  }

  // Transform Tradovate trades
  transformTradovateTrades(orders) {
    const trades = [];
    const groupedOrders = {};

    // Group orders by symbol
    orders.forEach((order) => {
      if (!groupedOrders[order.symbol]) {
        groupedOrders[order.symbol] = [];
      }
      groupedOrders[order.symbol].push(order);
    });

    // Create trades from grouped orders
    Object.entries(groupedOrders).forEach(([symbol, orders]) => {
      const sortedOrders = orders.sort(
        (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
      );

      for (let i = 0; i < sortedOrders.length; i += 2) {
        const entry = sortedOrders[i];
        const exit = sortedOrders[i + 1];

        if (entry && exit) {
          trades.push({
            id: `${entry.id}_${exit.id}`,
            instrumentType: "futures",
            instrument: symbol,
            tradeType: entry.action === "Buy" ? "long" : "short",
            strategy: "Imported from Tradovate",
            entryDate: entry.timestamp.split("T")[0],
            entryTime: entry.timestamp.split("T")[1].split("Z")[0],
            entryPrice: parseFloat(entry.price),
            exitDate: exit.timestamp.split("T")[0],
            exitTime: exit.timestamp.split("T")[1].split("Z")[0],
            exitPrice: parseFloat(exit.price),
            quantity: parseInt(entry.qty),
            status: "closed",
            brokerTradeId: entry.id,
            brokerSource: "tradovate",
            fees: parseFloat(entry.commission || 0),
            notes: `Imported from Tradovate - Order ${entry.id}`,
            tags: ["tradovate", "imported", "futures"],
          });
        }
      }
    });

    return trades;
  }

  // Fetch demo trades (mock data)
  async fetchDemoTrades() {
    // Mock trade data
    const demoTrades = [
      {
        id: "demo_1",
        symbol: "AAPL",
        side: "buy",
        qty: 100,
        filled_at: "2025-01-10T14:30:00Z",
        filled_avg_price: 150.25,
        order_type: "market",
        status: "filled",
      },
      {
        id: "demo_2",
        symbol: "AAPL",
        side: "sell",
        qty: 100,
        filled_at: "2025-01-10T15:45:00Z",
        filled_avg_price: 152.75,
        order_type: "market",
        status: "filled",
      },
    ];

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.transformDemoTrades(demoTrades));
      }, 1500);
    });
  }

  // Transform Alpaca trades to our format
  transformAlpacaTrades(orders) {
    const trades = [];
    const groupedOrders = {};

    // Group orders by symbol
    orders.forEach((order) => {
      if (!groupedOrders[order.symbol]) {
        groupedOrders[order.symbol] = [];
      }
      groupedOrders[order.symbol].push(order);
    });

    // Create trades from grouped orders
    Object.entries(groupedOrders).forEach(([symbol, orders]) => {
      const sortedOrders = orders.sort(function (a, b) {
        return new Date(a.filled_at) - new Date(b.filled_at);
      });

      for (let i = 0; i < sortedOrders.length; i += 2) {
        const entry = sortedOrders[i];
        const exit = sortedOrders[i + 1];

        if (entry && exit) {
          trades.push({
            id: `${entry.id}_${exit.id}`,
            instrumentType: "stocks",
            instrument: symbol,
            tradeType: entry.side === "buy" ? "long" : "short",
            strategy: "Imported from Alpaca",
            entryDate: entry.filled_at.split("T")[0],
            entryTime: entry.filled_at.split("T")[1].split("Z")[0],
            entryPrice: parseFloat(entry.filled_avg_price),
            exitDate: exit.filled_at.split("T")[0],
            exitTime: exit.filled_at.split("T")[1].split("Z")[0],
            exitPrice: parseFloat(exit.filled_avg_price),
            quantity: parseInt(entry.qty),
            status: "closed",
            brokerTradeId: entry.id,
            brokerSource: "alpaca",
          });
        }
      }
    });

    return trades;
  }

  // Transform demo trades to our format
  // Transform demo trades to our format
  transformDemoTrades(orders) {
    const trades = [];

    for (let i = 0; i < orders.length; i += 2) {
      const entry = orders[i];
      const exit = orders[i + 1];

      if (entry && exit) {
        // Calculate P&L
        const entryPrice = parseFloat(entry.filled_avg_price);
        const exitPrice = parseFloat(exit.filled_avg_price);
        const quantity = parseInt(entry.qty);
        const isLong = entry.side === "buy";

        // Determine instrument type based on symbol
        let instrumentType = "futures";
        let multiplier = 1;

        if (entry.symbol.startsWith("ES")) {
          multiplier = 50; // E-mini S&P 500
        } else if (entry.symbol.startsWith("NQ")) {
          multiplier = 20; // E-mini Nasdaq
        } else if (entry.symbol.startsWith("CL")) {
          multiplier = 1000; // Crude Oil
        }

        const pnl = isLong
          ? (exitPrice - entryPrice) * quantity * multiplier
          : (entryPrice - exitPrice) * quantity * multiplier;

        const totalCommission =
          (entry.commission || 0) + (exit.commission || 0);
        const netPnl = pnl - totalCommission;

        trades.push({
          id: `${entry.id}_${exit.id}`,
          instrumentType: instrumentType,
          instrument: entry.symbol,
          tradeType: isLong ? "long" : "short",
          strategy: "Imported from Demo Tradovate",
          entryDate: entry.filled_at.split("T")[0],
          entryTime: entry.filled_at.split("T")[1].split("Z")[0],
          entryPrice: entryPrice,
          exitDate: exit.filled_at.split("T")[0],
          exitTime: exit.filled_at.split("T")[1].split("Z")[0],
          exitPrice: exitPrice,
          quantity: quantity,
          status: "closed",
          brokerTradeId: entry.id,
          brokerSource: "demo",
          fees: totalCommission,
          pnl: netPnl,
          grossPnl: pnl,
          notes: `Imported from Demo Tradovate - ${entry.symbol} futures contract`,
          tags: ["demo", "tradovate", "futures", "imported"],
        });
      }
    }

    return trades;
  }

  // Start auto-sync
  startAutoSync(callback, interval = 300000) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(callback, interval);
  }

  // Stop auto-sync
  stopAutoSync() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Context provider
export const BrokerProvider = ({ children }) => {
  const [state, setState] = useState(initialState);
  const [brokerService] = useState(() => new BrokerService());

  // Load saved broker configuration
  useEffect(() => {
    const savedConfig = localStorage.getItem("brokerConfig");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setState((prev) => ({
          ...prev,
          selectedBroker: config.selectedBroker,
          brokerConfig: config.brokerConfig,
          autoSync: config.autoSync || false,
          syncInterval: config.syncInterval || 300000,
        }));
      } catch (error) {
        console.error("Failed to load broker config:", error);
      }
    }
  }, []);

  // Save broker configuration
  const saveBrokerConfig = (config) => {
    localStorage.setItem("brokerConfig", JSON.stringify(config));
  };

  // Connect to broker
  const connectBroker = async (brokerKey, config) => {
    setState((prev) => ({
      ...prev,
      isConnecting: true,
      connectionError: null,
    }));

    try {
      const result = await brokerService.connect(brokerKey, config);

      if (result.success) {
        const newState = {
          selectedBroker: brokerKey,
          brokerConfig: config,
          isConnected: true,
          isConnecting: false,
          connectionError: null,
          accounts: result.accounts,
          selectedAccount: result.accounts[0]?.id || null,
        };

        setState((prev) => ({ ...prev, ...newState }));
        saveBrokerConfig(newState);
        toast.success(`Connected to ${BROKERS[brokerKey].name}`);
        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          connectionError: result.error,
        }));
        toast.error(result.error);
        return false;
      }
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

  // Disconnect from broker
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

  // Sync trades from broker
  const syncTrades = async (onTradesImported) => {
    if (!state.selectedBroker || !state.selectedAccount) {
      toast.error("Please select a broker and account first");
      return;
    }

    setState((prev) => ({ ...prev, syncStatus: "syncing" }));

    try {
      const trades = await brokerService.fetchTrades(
        state.selectedBroker,
        state.brokerConfig,
        state.selectedAccount
      );

      if (trades.length > 0) {
        // Call the callback to import trades
        onTradesImported(trades);

        setState((prev) => ({
          ...prev,
          syncStatus: "success",
          lastSync: new Date(),
        }));

        toast.success(`Imported ${trades.length} trades from broker`);
      } else {
        setState((prev) => ({
          ...prev,
          syncStatus: "success",
          lastSync: new Date(),
        }));

        toast.info("No new trades found");
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        syncStatus: "error",
      }));
      toast.error(`Sync failed: ${error.message}`);
    }
  };

  // Toggle auto-sync
  const toggleAutoSync = (enabled) => {
    setState((prev) => ({ ...prev, autoSync: enabled }));

    if (enabled) {
      brokerService.startAutoSync(() => {
        syncTrades();
      }, state.syncInterval);
    } else {
      brokerService.stopAutoSync();
    }

    saveBrokerConfig({ ...state, autoSync: enabled });
  };

  // Set sync interval
  const setSyncInterval = (interval) => {
    setState((prev) => ({ ...prev, syncInterval: interval }));

    if (state.autoSync) {
      brokerService.startAutoSync(() => {
        syncTrades();
      }, interval);
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

// Hook to use broker context
export const useBroker = () => {
  const context = useContext(BrokerContext);
  if (!context) {
    throw new Error("useBroker must be used within a BrokerProvider");
  }
  return context;
};
