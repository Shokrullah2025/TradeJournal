// Broker API utilities and helpers

export const BROKER_TYPES = {
  ALPACA: "alpaca",
  TD_AMERITRADE: "tda",
  INTERACTIVE_BROKERS: "ib",
  DEMO: "demo",
};

export const BROKER_CONFIG = {
  [BROKER_TYPES.ALPACA]: {
    name: "Alpaca Trading",
    baseUrl: "https://paper-api.alpaca.markets",
    endpoints: {
      account: "/v2/account",
      orders: "/v2/orders",
      positions: "/v2/positions",
    },
    rateLimits: {
      requestsPerMinute: 200,
      requestsPerSecond: 5,
    },
  },
  [BROKER_TYPES.TD_AMERITRADE]: {
    name: "TD Ameritrade",
    baseUrl: "https://api.tdameritrade.com",
    endpoints: {
      account: "/v1/accounts",
      orders: "/v1/accounts/{accountId}/orders",
      positions: "/v1/accounts/{accountId}/positions",
    },
    rateLimits: {
      requestsPerMinute: 120,
      requestsPerSecond: 2,
    },
  },
  [BROKER_TYPES.INTERACTIVE_BROKERS]: {
    name: "Interactive Brokers",
    baseUrl: "http://localhost:5000",
    endpoints: {
      account: "/v1/api/accounts",
      orders: "/v1/api/iserver/orders",
      positions: "/v1/api/portfolio/{accountId}/positions",
    },
    rateLimits: {
      requestsPerMinute: 60,
      requestsPerSecond: 1,
    },
  },
  [BROKER_TYPES.DEMO]: {
    name: "Demo Broker",
    baseUrl: "demo://localhost",
    endpoints: {
      account: "/account",
      orders: "/orders",
      positions: "/positions",
    },
    rateLimits: {
      requestsPerMinute: 1000,
      requestsPerSecond: 10,
    },
  },
};

// Rate limiting utility
class RateLimiter {
  constructor(requestsPerSecond = 1, requestsPerMinute = 60) {
    this.requestsPerSecond = requestsPerSecond;
    this.requestsPerMinute = requestsPerMinute;
    this.secondQueue = [];
    this.minuteQueue = [];
  }

  async checkRateLimit() {
    const now = Date.now();

    // Clean up old requests
    this.secondQueue = this.secondQueue.filter((time) => now - time < 1000);
    this.minuteQueue = this.minuteQueue.filter((time) => now - time < 60000);

    // Check if we need to wait
    if (this.secondQueue.length >= this.requestsPerSecond) {
      const waitTime = 1000 - (now - this.secondQueue[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    if (this.minuteQueue.length >= this.requestsPerMinute) {
      const waitTime = 60000 - (now - this.minuteQueue[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Record this request
    this.secondQueue.push(now);
    this.minuteQueue.push(now);
  }
}

// Create rate limiters for each broker
const rateLimiters = {};
Object.keys(BROKER_CONFIG).forEach((brokerType) => {
  const config = BROKER_CONFIG[brokerType];
  rateLimiters[brokerType] = new RateLimiter(
    config.rateLimits.requestsPerSecond,
    config.rateLimits.requestsPerMinute
  );
});

// Broker API request helper
export const makeBrokerRequest = async (brokerType, endpoint, options = {}) => {
  const config = BROKER_CONFIG[brokerType];
  const rateLimiter = rateLimiters[brokerType];

  if (!config) {
    throw new Error(`Unsupported broker type: ${brokerType}`);
  }

  // Apply rate limiting
  await rateLimiter.checkRateLimit();

  const url = `${config.baseUrl}${endpoint}`;

  const defaultOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const requestOptions = { ...defaultOptions, ...options };

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(
      `Broker API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
};

// Trade data normalization
export const normalizeTrade = (brokerType, rawTrade) => {
  switch (brokerType) {
    case BROKER_TYPES.ALPACA:
      return normalizeAlpacaTrade(rawTrade);
    case BROKER_TYPES.TD_AMERITRADE:
      return normalizeTDATrade(rawTrade);
    case BROKER_TYPES.INTERACTIVE_BROKERS:
      return normalizeIBTrade(rawTrade);
    case BROKER_TYPES.DEMO:
      return normalizeDemoTrade(rawTrade);
    default:
      throw new Error(`Unsupported broker type: ${brokerType}`);
  }
};

// Alpaca trade normalization
const normalizeAlpacaTrade = (trade) => ({
  id: trade.id,
  brokerTradeId: trade.id,
  brokerSource: BROKER_TYPES.ALPACA,
  instrumentType: "stocks",
  instrument: trade.symbol,
  tradeType: trade.side === "buy" ? "long" : "short",
  entryDate: trade.filled_at
    ? trade.filled_at.split("T")[0]
    : new Date().toISOString().split("T")[0],
  entryTime: trade.filled_at
    ? trade.filled_at.split("T")[1].split("Z")[0]
    : new Date().toTimeString().split(" ")[0],
  entryPrice: parseFloat(trade.filled_avg_price || trade.limit_price || 0),
  quantity: parseInt(trade.filled_qty || trade.qty || 0),
  status: trade.status === "filled" ? "closed" : "open",
  strategy: "Imported from Alpaca",
  fees: parseFloat(trade.commission || 0),
  notes: `Order ID: ${trade.id}, Order Type: ${trade.order_type}`,
  tags: ["alpaca", "imported"],
});

// TD Ameritrade trade normalization
const normalizeTDATrade = (trade) => ({
  id: trade.orderId,
  brokerTradeId: trade.orderId,
  brokerSource: BROKER_TYPES.TD_AMERITRADE,
  instrumentType: trade.instrument?.assetType?.toLowerCase() || "stocks",
  instrument: trade.instrument?.symbol || "Unknown",
  tradeType: trade.instruction === "BUY" ? "long" : "short",
  entryDate: trade.enteredTime
    ? new Date(trade.enteredTime).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  entryTime: trade.enteredTime
    ? new Date(trade.enteredTime).toTimeString().split(" ")[0]
    : new Date().toTimeString().split(" ")[0],
  entryPrice: parseFloat(trade.price || 0),
  quantity: parseInt(trade.quantity || 0),
  status: trade.status === "FILLED" ? "closed" : "open",
  strategy: "Imported from TD Ameritrade",
  fees: 0, // TD Ameritrade commission-free
  notes: `Order ID: ${trade.orderId}, Order Type: ${trade.orderType}`,
  tags: ["tda", "imported"],
});

// Interactive Brokers trade normalization
const normalizeIBTrade = (trade) => ({
  id: trade.orderId,
  brokerTradeId: trade.orderId,
  brokerSource: BROKER_TYPES.INTERACTIVE_BROKERS,
  instrumentType: trade.secType?.toLowerCase() || "stocks",
  instrument: trade.symbol || "Unknown",
  tradeType: trade.action === "BUY" ? "long" : "short",
  entryDate: trade.lastExecutionTime
    ? new Date(trade.lastExecutionTime).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0],
  entryTime: trade.lastExecutionTime
    ? new Date(trade.lastExecutionTime).toTimeString().split(" ")[0]
    : new Date().toTimeString().split(" ")[0],
  entryPrice: parseFloat(trade.avgPrice || trade.lmtPrice || 0),
  quantity: parseInt(trade.totalSize || 0),
  status: trade.status === "Filled" ? "closed" : "open",
  strategy: "Imported from Interactive Brokers",
  fees: parseFloat(trade.commission || 0),
  notes: `Order ID: ${trade.orderId}, Order Type: ${trade.orderType}`,
  tags: ["ib", "imported"],
});

// Demo broker trade normalization
const normalizeDemoTrade = (trade) => ({
  id: trade.id,
  brokerTradeId: trade.id,
  brokerSource: BROKER_TYPES.DEMO,
  instrumentType: "stocks",
  instrument: trade.symbol,
  tradeType: trade.side === "buy" ? "long" : "short",
  entryDate: trade.filled_at
    ? trade.filled_at.split("T")[0]
    : new Date().toISOString().split("T")[0],
  entryTime: trade.filled_at
    ? trade.filled_at.split("T")[1].split("Z")[0]
    : new Date().toTimeString().split(" ")[0],
  entryPrice: parseFloat(trade.filled_avg_price || 0),
  quantity: parseInt(trade.qty || 0),
  status: trade.status === "filled" ? "closed" : "open",
  strategy: "Imported from Demo Broker",
  fees: 0,
  notes: `Demo Order ID: ${trade.id}`,
  tags: ["demo", "imported"],
});

// Validation helpers
export const validateBrokerConfig = (brokerType, config) => {
  const errors = [];

  switch (brokerType) {
    case BROKER_TYPES.ALPACA:
      if (!config.apiKey) errors.push("API Key is required");
      if (!config.secretKey) errors.push("Secret Key is required");
      break;
    case BROKER_TYPES.TD_AMERITRADE:
      if (!config.clientId) errors.push("Client ID is required");
      if (!config.redirectUri) errors.push("Redirect URI is required");
      break;
    case BROKER_TYPES.INTERACTIVE_BROKERS:
      if (!config.port) errors.push("TWS Port is required");
      if (!config.clientId) errors.push("Client ID is required");
      break;
    case BROKER_TYPES.DEMO:
      // No validation needed for demo
      break;
    default:
      errors.push(`Unsupported broker type: ${brokerType}`);
  }

  return errors;
};

// Connection test utilities
export const testBrokerConnection = async (brokerType, config) => {
  try {
    const errors = validateBrokerConfig(brokerType, config);
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const brokerConfig = BROKER_CONFIG[brokerType];
    const endpoint = brokerConfig.endpoints.account;

    let requestOptions = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };

    // Add broker-specific authentication
    switch (brokerType) {
      case BROKER_TYPES.ALPACA:
        requestOptions.headers["APCA-API-KEY-ID"] = config.apiKey;
        requestOptions.headers["APCA-API-SECRET-KEY"] = config.secretKey;
        break;
      case BROKER_TYPES.TD_AMERITRADE:
        // OAuth token would be handled differently
        break;
      case BROKER_TYPES.INTERACTIVE_BROKERS:
        // IB uses session-based authentication
        break;
      case BROKER_TYPES.DEMO:
        // No auth needed for demo
        break;
    }

    const response = await makeBrokerRequest(
      brokerType,
      endpoint,
      requestOptions
    );

    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Export utilities
export { rateLimiters, RateLimiter };
