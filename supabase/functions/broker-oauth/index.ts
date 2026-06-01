import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tradovate token endpoint per account type
const TRADOVATE_TOKEN_URLS: Record<string, string> = {
  demo: "https://demo-api-d.tradovateapi.com/v1/auth/oauthtoken",
  live: "https://live-api-d.tradovateapi.com/v1/auth/oauthtoken",
};

const TRADOVATE_ACCOUNT_URLS: Record<string, string> = {
  demo: "https://demo-api-d.tradovateapi.com/v1/account/list",
  live: "https://live-api-d.tradovateapi.com/v1/account/list",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the caller is a logged-in user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing Authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate the JWT and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );

    if (authError || !user) {
      return errorResponse("Invalid or expired session", 401);
    }

    const body = await req.json();
    const { broker, code, accountType, redirectUri, propFirm } = body;

    if (!broker || !code || !accountType || !redirectUri) {
      return errorResponse("Missing required fields: broker, code, accountType, redirectUri", 400);
    }

    if (broker === "tradovate") {
      return await handleTradovateOAuth(supabase, user.id, code, accountType, redirectUri, propFirm ?? null);
    }

    return errorResponse(`Broker '${broker}' is not yet supported`, 400);
  } catch (err) {
    console.error("broker-oauth error:", err);
    return errorResponse("Internal server error", 500);
  }
});

async function handleTradovateOAuth(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  code: string,
  accountType: string,
  redirectUri: string,
  propFirm: string | null,
) {
  // Load the appropriate client secret from env (never from the browser)
  const clientId = accountType === "demo"
    ? Deno.env.get("TRADOVATE_DEMO_CLIENT_ID")
    : Deno.env.get("TRADOVATE_LIVE_CLIENT_ID");

  const clientSecret = accountType === "demo"
    ? Deno.env.get("TRADOVATE_DEMO_CLIENT_SECRET")
    : Deno.env.get("TRADOVATE_LIVE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return errorResponse(
      "Tradovate credentials not configured. Set TRADOVATE_DEMO_CLIENT_ID, TRADOVATE_DEMO_CLIENT_SECRET, TRADOVATE_LIVE_CLIENT_ID, TRADOVATE_LIVE_CLIENT_SECRET in Edge Function env vars.",
      500,
    );
  }

  const tokenUrl = TRADOVATE_TOKEN_URLS[accountType];
  if (!tokenUrl) {
    return errorResponse(`Unsupported accountType '${accountType}' for Tradovate`, 400);
  }

  // Exchange the authorization code for tokens (server-side — secret stays here)
  const tokenResponse = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text().catch(() => "");
    console.error("Tradovate token exchange failed:", tokenResponse.status, errText);
    return errorResponse("Failed to connect to Tradovate. Check your credentials.", 502);
  }

  const tokenData = await tokenResponse.json();
  if (tokenData.error) {
    return errorResponse(tokenData.error_description || tokenData.error, 502);
  }

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
    : null;

  // Fetch account list from Tradovate
  const accountUrl = TRADOVATE_ACCOUNT_URLS[accountType];
  const accountResponse = await fetch(accountUrl, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  let accounts: Array<{ id: string; name: string; balance: number }> = [];
  if (accountResponse.ok) {
    const rawAccounts = await accountResponse.json();
    if (Array.isArray(rawAccounts)) {
      accounts = rawAccounts.map((a: Record<string, unknown>) => ({
        id: String(a.id ?? ""),
        name: String(a.name ?? `Tradovate Account ${a.id}`),
        balance: parseFloat(String(a.balance ?? 0)),
      }));
    }
  }

  // Use the first account (or create a placeholder if none)
  const primaryAccount = accounts[0] ?? { id: "unknown", name: "Tradovate Account", balance: 0 };

  // Use the prop firm label as the account name if provided (e.g. "Apex Trader Funding")
  const accountName = propFirm
    ? `${propFirm} — ${accountType === "demo" ? "Evaluation" : "Funded"}`
    : primaryAccount.name;

  // Upsert a trading_account record for this user+broker+accountType
  const { data: tradingAccount, error: accountError } = await supabase
    .from("trading_accounts")
    .upsert(
      {
        user_id: userId,
        account_name: accountName,
        broker: "tradovate",
        account_type: accountType,
        current_balance: primaryAccount.balance,
        is_active: true,
      },
      { onConflict: "user_id,account_name,broker", ignoreDuplicates: false },
    )
    .select("id, account_name")
    .single();

  if (accountError) {
    console.error("Failed to upsert trading_account:", accountError);
    return errorResponse("Failed to save account information", 500);
  }

  // Store the token in the DB — never return it to the browser
  const { error: tokenError } = await supabase
    .from("broker_tokens")
    .upsert(
      {
        user_id: userId,
        account_id: tradingAccount.id,
        broker: "tradovate",
        account_type: accountType,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token ?? null,
        token_type: tokenData.token_type ?? "Bearer",
        expires_at: expiresAt,
        scope: tokenData.scope ?? null,
      },
      { onConflict: "user_id,broker,account_type" },
    );

  if (tokenError) {
    console.error("Failed to store broker token:", tokenError);
    return errorResponse("Failed to save connection", 500);
  }

  // Return only the account info — no tokens
  return successResponse({
    accountId: tradingAccount.id,
    accountName: tradingAccount.account_name,
    broker: "tradovate",
    accountType,
    balance: primaryAccount.balance,
    propFirm: propFirm ?? null,
  });
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
