import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  projectxLogin,
  projectxSearchAccounts,
} from "../_shared/projectxAdapter.ts";

// ProjectX session JWTs are valid for 24h.
const PROJECTX_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-app-name",
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

    // Server-side entitlement gate — Broker Sync is an Elite feature. This
    // client uses the service-role key (bypasses RLS), so we check explicitly
    // with the resolved user id before touching any broker OAuth flow.
    const { data: allowed, error: gateError } = await supabase.rpc("feature_enabled_for", {
      p_user_id: user.id,
      p_flag_key: "broker_sync",
    });
    if (gateError || allowed !== true) {
      return errorResponse("Broker Sync isn’t included in your current plan.", 403);
    }

    const body = await req.json();
    const { broker, code, accountType, redirectUri, propFirm } = body;

    if (!broker) {
      return errorResponse("Missing required field: broker", 400);
    }

    // ── ProjectX: API-key connect (no OAuth code/redirect) ──────────────────────
    if (broker === "projectx") {
      // Rollout kill-switch — dark in production until enabled (admins bypass).
      const { data: rollout } = await supabase.rpc("feature_enabled_for", {
        p_user_id: user.id,
        p_flag_key: "projectx_broker",
      });
      if (rollout !== true) {
        return errorResponse("ProjectX connections aren’t available yet.", 403);
      }
      return await handleProjectxConnect(supabase, user.id, body);
    }

    // ── OAuth brokers (Tradovate) ───────────────────────────────────────────────
    if (!code || !accountType || !redirectUri) {
      return errorResponse("Missing required fields: code, accountType, redirectUri", 400);
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

// Known prop firms on the ProjectX platform, matched against account names so the
// hub can badge each account ("Topstep", "Apex", …) without asking the user.
const PROP_FIRM_PATTERNS: Array<[RegExp, string]> = [
  [/topstep/i, "Topstep"],
  [/apex/i, "Apex"],
  [/(myfundedfutures|my funded|mffu?)/i, "MyFundedFutures"],
  [/bulenox/i, "Bulenox"],
  [/take ?profit/i, "Take Profit Trader"],
  [/tradeify/i, "Tradeify"],
  [/alpha ?futures/i, "Alpha Futures"],
  [/futures ?desk/i, "The Futures Desk"],
];

function detectPropFirm(accountName: string, fallback: string | null): string | null {
  for (const [pattern, firm] of PROP_FIRM_PATTERNS) {
    if (pattern.test(accountName)) return firm;
  }
  return fallback;
}

// Connect a ProjectX prop-firm account with an API key. We log in server-side
// (the apiKey never touches the browser), read the account list, and persist the
// long-lived apiKey + the 24h session JWT so broker-sync can re-login silently.
//
// The Broker Hub wizard drives this in two phases:
//   phase:"discover" — authenticate + store credentials, return ALL accounts so the
//                       user can choose which to import (credentials never echoed).
//   phase:"activate" — create a trading_accounts row per SELECTED account, carrying
//                       the user's nickname and the auto-detected prop firm.
// No phase = legacy single-account connect (kept for BrokerModal compatibility).
async function handleProjectxConnect(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: Record<string, unknown>,
) {
  if (body.phase === "discover") {
    return await handleProjectxDiscover(supabase, userId, body);
  }
  if (body.phase === "activate") {
    return await handleProjectxActivate(supabase, userId, body);
  }
  const firmId = typeof body.firmId === "string" ? body.firmId : null;
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  const userName = typeof body.userName === "string" ? body.userName.trim() : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const accountType = body.accountType === "live" ? "live" : "demo";
  const propFirm = typeof body.propFirm === "string" ? body.propFirm : null;

  if (!baseUrl || !userName || !apiKey) {
    return errorResponse("Missing required fields: baseUrl, userName, apiKey", 400);
  }
  if (!/^https:\/\//i.test(baseUrl)) {
    return errorResponse("Invalid gateway URL — must be https.", 400);
  }

  // Authenticate with ProjectX (server-side only).
  let token: string;
  try {
    token = await projectxLogin(baseUrl, userName, apiKey);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "ProjectX authentication failed.",
      401,
    );
  }

  // Pull the account list; use the primary account for sync.
  let accounts: Awaited<ReturnType<typeof projectxSearchAccounts>> = [];
  try {
    accounts = await projectxSearchAccounts(baseUrl, token);
  } catch {
    // Non-fatal: connection still succeeds; sync can resolve accounts later.
    accounts = [];
  }

  const primary = accounts[0] ?? null;
  const accountName = propFirm
    ? `${propFirm} — ${accountType === "demo" ? "Evaluation" : "Funded"}`
    : (primary?.name ?? "ProjectX Account");

  // Upsert the trading_account (our internal record).
  const { data: tradingAccount, error: accountError } = await supabase
    .from("trading_accounts")
    .upsert(
      {
        user_id: userId,
        account_name: accountName,
        broker: "projectx",
        account_type: accountType,
        current_balance: primary?.balance ?? 0,
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

  // Store credentials + session token server-side. Never returned to the browser.
  const expiresAt = new Date(Date.now() + PROJECTX_TOKEN_TTL_MS).toISOString();
  const { error: tokenError } = await supabase
    .from("broker_tokens")
    .upsert(
      {
        user_id: userId,
        account_id: tradingAccount.id,
        broker: "projectx",
        account_type: accountType,
        access_token: token,
        token_type: "Bearer",
        expires_at: expiresAt,
        api_username: userName,
        api_key: apiKey,
        base_url: baseUrl,
        firm_id: firmId,
        external_account_id: primary?.id ?? null,
      },
      { onConflict: "user_id,broker,account_type" },
    );

  if (tokenError) {
    console.error("Failed to store ProjectX connection:", tokenError);
    return errorResponse("Failed to save connection", 500);
  }

  return successResponse({
    accountId: tradingAccount.id,
    accountName: tradingAccount.account_name,
    broker: "projectx",
    accountType,
    balance: primary?.balance ?? 0,
    propFirm,
  });
}

// Phase 1 of the wizard: authenticate with ProjectX, persist the credentials +
// session JWT, and return the full account list for the "Choose accounts" step.
// No trading_accounts rows are created yet — that happens on activate, so a user
// who abandons the wizard mid-way leaves nothing half-imported behind.
async function handleProjectxDiscover(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: Record<string, unknown>,
) {
  const firmId = typeof body.firmId === "string" ? body.firmId : null;
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";
  const userName = typeof body.userName === "string" ? body.userName.trim() : "";
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const accountType = body.accountType === "live" ? "live" : "demo";

  if (!baseUrl || !userName || !apiKey) {
    return errorResponse("Missing required fields: baseUrl, userName, apiKey", 400);
  }
  if (!/^https:\/\//i.test(baseUrl)) {
    return errorResponse("Invalid gateway URL — must be https.", 400);
  }

  let token: string;
  try {
    token = await projectxLogin(baseUrl, userName, apiKey);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : "Authentication failed. Check your username and API key.",
      401,
    );
  }

  let accounts: Awaited<ReturnType<typeof projectxSearchAccounts>> = [];
  try {
    accounts = await projectxSearchAccounts(baseUrl, token);
  } catch {
    return errorResponse("Signed in, but we couldn't load your accounts. Please try again.", 502);
  }

  if (accounts.length === 0) {
    return errorResponse("No active accounts were found for this login.", 404);
  }

  // Persist credentials + session so activate/sync never need the apiKey from the
  // browser again. external_account_id is filled in on activate.
  const expiresAt = new Date(Date.now() + PROJECTX_TOKEN_TTL_MS).toISOString();
  const { error: tokenError } = await supabase
    .from("broker_tokens")
    .upsert(
      {
        user_id: userId,
        broker: "projectx",
        account_type: accountType,
        access_token: token,
        token_type: "Bearer",
        expires_at: expiresAt,
        api_username: userName,
        api_key: apiKey,
        base_url: baseUrl,
        firm_id: firmId,
      },
      { onConflict: "user_id,broker,account_type" },
    );

  if (tokenError) {
    console.error("Failed to store ProjectX connection:", tokenError);
    return errorResponse("Failed to save connection", 500);
  }

  // Account metadata only — never the token or apiKey.
  return successResponse({
    broker: "projectx",
    accountType,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance,
      canTrade: a.canTrade,
      propFirm: detectPropFirm(a.name, null),
    })),
  });
}

// Phase 2 of the wizard: create one trading_accounts row per account the user
// selected, carrying nickname + detected prop firm. Requires a prior discover
// (the stored broker_tokens row proves the credentials were verified).
async function handleProjectxActivate(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  body: Record<string, unknown>,
) {
  const accountType = body.accountType === "live" ? "live" : "demo";
  const fallbackFirm = typeof body.propFirm === "string" ? body.propFirm : null;
  const selections = Array.isArray(body.accounts) ? body.accounts : [];

  if (selections.length === 0) {
    return errorResponse("Select at least one account to import.", 400);
  }
  if (selections.length > 25) {
    return errorResponse("Too many accounts selected.", 400);
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from("broker_tokens")
    .select("id")
    .eq("user_id", userId)
    .eq("broker", "projectx")
    .eq("account_type", accountType)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    return errorResponse("No verified ProjectX connection found. Please sign in again.", 404);
  }

  const created: Array<{
    id: string;
    externalId: string;
    name: string;
    nickname: string | null;
    balance: number;
    propFirm: string | null;
  }> = [];

  for (const raw of selections) {
    const sel = raw as Record<string, unknown>;
    const externalId = String(sel.externalId ?? "").trim();
    const name = String(sel.name ?? "").trim().slice(0, 100);
    const nickname = typeof sel.nickname === "string" && sel.nickname.trim()
      ? sel.nickname.trim().slice(0, 60)
      : null;
    const balance = Number.isFinite(Number(sel.balance)) ? Number(sel.balance) : 0;

    if (!externalId || !name) continue;

    const propFirm = detectPropFirm(name, fallbackFirm);

    const { data: account, error: accountError } = await supabase
      .from("trading_accounts")
      .upsert(
        {
          user_id: userId,
          account_name: name,
          broker: "projectx",
          account_type: accountType,
          account_number: externalId,
          external_account_id: externalId,
          nickname,
          prop_firm: propFirm,
          current_balance: balance,
          sync_enabled: true,
          is_active: true,
        },
        { onConflict: "user_id,account_name,broker", ignoreDuplicates: false },
      )
      .select("id, account_name, nickname, external_account_id, current_balance, prop_firm")
      .single();

    if (accountError || !account) {
      console.error("Failed to upsert trading_account:", accountError);
      return errorResponse("Failed to save account information", 500);
    }

    created.push({
      id: account.id,
      externalId: account.external_account_id,
      name: account.account_name,
      nickname: account.nickname,
      balance: Number(account.current_balance ?? 0),
      propFirm: account.prop_firm,
    });
  }

  if (created.length === 0) {
    return errorResponse("No valid accounts in selection.", 400);
  }

  // Legacy pointer used by the single-account sync path — keep it on the first
  // selected account so older clients continue to work.
  await supabase
    .from("broker_tokens")
    .update({ external_account_id: created[0].externalId })
    .eq("user_id", userId)
    .eq("broker", "projectx")
    .eq("account_type", accountType);

  return successResponse({ broker: "projectx", accountType, accounts: created });
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
