import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
};

// Tradovate API endpoints
const TRADOVATE_FILLS_URL: Record<string, string> = {
  demo: "https://demo-api-d.tradovateapi.com/v1/fill/list",
  live: "https://live-api-d.tradovateapi.com/v1/fill/list",
};

const TRADOVATE_TOKEN_URLS: Record<string, string> = {
  demo: "https://demo-api-d.tradovateapi.com/v1/auth/oauthtoken",
  live: "https://live-api-d.tradovateapi.com/v1/auth/oauthtoken",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    if (authError || !user) {
      return errorResponse("Invalid or expired session", 401);
    }

    const body = await req.json();
    const { broker, accountId, fromDate } = body;

    if (!broker || !accountId) {
      return errorResponse("Missing required fields: broker, accountId", 400);
    }

    if (broker === "tradovate") {
      return await syncTradovateTrades(supabase, user.id, accountId, fromDate ?? null);
    }

    return errorResponse(`Broker '${broker}' is not yet supported`, 400);
  } catch (err) {
    console.error("broker-sync error:", err);
    return errorResponse("Internal server error", 500);
  }
});

async function syncTradovateTrades(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  accountId: string,
  fromDate: string | null,
) {
  // Load the token for this user's Tradovate connection
  const { data: tokenRow, error: tokenError } = await supabase
    .from("broker_tokens")
    .select("access_token, refresh_token, expires_at, account_type")
    .eq("user_id", userId)
    .eq("broker", "tradovate")
    .single();

  if (tokenError || !tokenRow) {
    return errorResponse("No Tradovate connection found. Please connect your account first.", 404);
  }

  // Refresh the token if it has expired
  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
    const refreshed = await refreshTradovateToken(
      supabase,
      userId,
      tokenRow.refresh_token,
      tokenRow.account_type,
    );
    if (!refreshed) {
      return errorResponse("Session expired. Please reconnect your Tradovate account.", 401);
    }
    accessToken = refreshed;
  }

  const fillsUrl = TRADOVATE_FILLS_URL[tokenRow.account_type] ?? TRADOVATE_FILLS_URL.live;

  // Fetch fills from Tradovate
  const fillsResponse = await fetch(fillsUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!fillsResponse.ok) {
    const errText = await fillsResponse.text().catch(() => "");
    console.error("Tradovate fills fetch failed:", fillsResponse.status, errText);
    if (fillsResponse.status === 401) {
      return errorResponse("Tradovate session expired. Please reconnect your account.", 401);
    }
    return errorResponse("Failed to fetch trades from Tradovate", 502);
  }

  const fills: TradovateFill[] = await fillsResponse.json();
  if (!Array.isArray(fills) || fills.length === 0) {
    return successResponse({ imported: 0, skipped: 0, message: "No trades found" });
  }

  // Pair fills into round-trip trades (entry + exit per instrument)
  const trades = pairTradovateFills(fills, fromDate);

  let imported = 0;
  let skipped = 0;

  for (const trade of trades) {
    // Deduplicate by external_trade_id
    const { data: existing } = await supabase
      .from("trades")
      .select("id")
      .eq("user_id", userId)
      .eq("external_trade_id", trade.external_trade_id)
      .maybeSingle();

    if (existing) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase.from("trades").insert({
      user_id: userId,
      account_id: accountId,
      external_trade_id: trade.external_trade_id,
      instrument: trade.instrument,
      instrument_type: "future",
      direction: trade.direction,
      quantity: trade.quantity,
      entry_price: trade.entry_price,
      exit_price: trade.exit_price,
      entry_date: trade.entry_date,
      exit_date: trade.exit_date,
      status: "closed",
      pnl: trade.pnl,
      commission: trade.commission,
      swap: 0,
      notes: `Imported from Tradovate`,
      tags: ["tradovate", "imported", "futures"],
    });

    if (insertError) {
      console.error("Failed to insert trade:", insertError, trade);
    } else {
      imported++;
    }
  }

  return successResponse({ imported, skipped });
}

interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  tradeDate?: { year: number; month: number; day: number };
  action: "Buy" | "Sell";
  qty: number;
  price: number;
  commission?: number;
}

interface NormalizedTrade {
  external_trade_id: string;
  instrument: string;
  direction: "long" | "short";
  quantity: number;
  entry_price: number;
  exit_price: number;
  entry_date: string;
  exit_date: string;
  pnl: number;
  commission: number;
}

function pairTradovateFills(fills: TradovateFill[], fromDate: string | null): NormalizedTrade[] {
  const sorted = [...fills].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Filter by fromDate if provided
  const filtered = fromDate
    ? sorted.filter((f) => new Date(f.timestamp) >= new Date(fromDate))
    : sorted;

  // Group by contractId
  const byContract: Record<string, TradovateFill[]> = {};
  for (const fill of filtered) {
    const key = String(fill.contractId);
    if (!byContract[key]) byContract[key] = [];
    byContract[key].push(fill);
  }

  const trades: NormalizedTrade[] = [];

  for (const [contractId, contractFills] of Object.entries(byContract)) {
    // Pair consecutive buy/sell fills as entry/exit
    for (let i = 0; i + 1 < contractFills.length; i += 2) {
      const entry = contractFills[i];
      const exit = contractFills[i + 1];
      if (!entry || !exit) continue;

      const direction: "long" | "short" = entry.action === "Buy" ? "long" : "short";
      const qty = Math.min(entry.qty, exit.qty);
      const tickValue = 1; // Tradovate returns P&L in contract currency
      const rawPnl = direction === "long"
        ? (exit.price - entry.price) * qty * tickValue
        : (entry.price - exit.price) * qty * tickValue;
      const totalCommission = (entry.commission ?? 0) + (exit.commission ?? 0);

      trades.push({
        external_trade_id: `tradovate_${entry.id}_${exit.id}`,
        instrument: String(contractId),
        direction,
        quantity: qty,
        entry_price: entry.price,
        exit_price: exit.price,
        entry_date: entry.timestamp,
        exit_date: exit.timestamp,
        pnl: parseFloat((rawPnl - totalCommission).toFixed(2)),
        commission: totalCommission,
      });
    }
  }

  return trades;
}

async function refreshTradovateToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string | null,
  accountType: string,
): Promise<string | null> {
  if (!refreshToken) return null;

  const clientId = accountType === "demo"
    ? Deno.env.get("TRADOVATE_DEMO_CLIENT_ID")
    : Deno.env.get("TRADOVATE_LIVE_CLIENT_ID");

  const clientSecret = accountType === "demo"
    ? Deno.env.get("TRADOVATE_DEMO_CLIENT_SECRET")
    : Deno.env.get("TRADOVATE_LIVE_CLIENT_SECRET");

  if (!clientId || !clientSecret) return null;

  const tokenUrl = TRADOVATE_TOKEN_URLS[accountType] ?? TRADOVATE_TOKEN_URLS.live;

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) return null;

    const tokenData = await response.json();
    if (tokenData.error || !tokenData.access_token) return null;

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    await supabase
      .from("broker_tokens")
      .update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? refreshToken,
        expires_at: expiresAt,
      })
      .eq("user_id", userId)
      .eq("broker", "tradovate");

    return tokenData.access_token;
  } catch {
    return null;
  }
}

function successResponse(data: unknown) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
