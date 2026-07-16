// ProjectX Gateway API adapter.
//
// Futures prop firms (Topstep, Apex, MyFundedFutures, …) provision accounts on the
// ProjectX platform, which exposes a REST "gateway" API purpose-built for prop/eval
// accounts (unlike Tradovate, whose API excludes them). See docs/broker-integrations.md.
//
// This module is pure transport + normalization: no Supabase, no secrets access. The
// Edge Functions (broker-oauth / broker-sync) own credential storage and call these.
//
// Auth model: POST /api/Auth/loginKey { userName, apiKey } -> session JWT (valid 24h).
// All later calls send `Authorization: Bearer <token>`. Each prop firm has its own
// gateway host (base_url), e.g. https://api.topstepx.com.

export interface ProjectxAccount {
  id: string;
  name: string;
  balance: number;
  canTrade: boolean;
}

// A ProjectX "trade" is a single execution/half-turn. The closing half-turn carries
// the realized profitAndLoss for the round trip; opening half-turns have it null.
export interface ProjectxTrade {
  id: number | string;
  accountId: number | string;
  contractId: string;
  creationTimestamp: string; // ISO 8601
  price: number;
  profitAndLoss: number | null;
  fees: number;
  side: number; // 0 = Buy/Bid, 1 = Sell/Ask
  size: number;
  voided?: boolean;
  orderId?: number | string;
}

// Normalized to the `trades` table shape used by broker-sync (matches the Tradovate path).
export interface NormalizedProjectxTrade {
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

// Normalize a per-firm base URL. Firms publish either `https://api.topstepx.com` or
// `https://api.<firm>.projectx.com/api` — strip a trailing `/api` and slash so we can
// always append `/api/...` exactly once.
export function projectxApiBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "").replace(/\/api$/i, "");
}

async function projectxPost<T>(
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${projectxApiBase(baseUrl)}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Log status only — never log the token or credentials.
    console.error(`ProjectX ${path} failed:`, res.status, text.slice(0, 300));
    const err = new Error(`ProjectX request failed (${res.status})`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return res.json() as Promise<T>;
}

// Exchange userName + apiKey for a 24h session token.
// ProjectX responses use { success, errorCode, errorMessage, token }.
export async function projectxLogin(
  baseUrl: string,
  userName: string,
  apiKey: string,
): Promise<string> {
  const data = await projectxPost<{ success?: boolean; errorCode?: number; errorMessage?: string; token?: string }>(
    baseUrl,
    "/api/Auth/loginKey",
    { userName, apiKey },
  );

  if (!data.token || data.success === false) {
    throw new Error(data.errorMessage || "ProjectX authentication failed. Check your username and API key.");
  }
  return data.token;
}

export async function projectxSearchAccounts(
  baseUrl: string,
  token: string,
): Promise<ProjectxAccount[]> {
  const data = await projectxPost<{ accounts?: Array<Record<string, unknown>> }>(
    baseUrl,
    "/api/Account/search",
    { onlyActiveAccounts: true },
    token,
  );

  const rows = Array.isArray(data.accounts) ? data.accounts : [];
  return rows.map((a) => ({
    id: String(a.id ?? ""),
    name: String(a.name ?? `ProjectX Account ${a.id ?? ""}`),
    balance: Number(a.balance ?? 0),
    canTrade: Boolean(a.canTrade ?? true),
  }));
}

export async function projectxSearchTrades(
  baseUrl: string,
  token: string,
  accountId: string,
  fromDate: string | null,
): Promise<ProjectxTrade[]> {
  // Default to a 90-day lookback when no cursor is given, so first-sync isn't unbounded.
  const start = fromDate ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date().toISOString();

  const data = await projectxPost<{ trades?: ProjectxTrade[] }>(
    baseUrl,
    "/api/Trade/search",
    { accountId, startTimestamp: start, endTimestamp: end },
    token,
  );

  return Array.isArray(data.trades) ? data.trades : [];
}

// Pair execution half-turns into round-trip trades, per contract, in time order.
// Mirrors the Tradovate pairing already used by broker-sync.
export function normalizeProjectxTrades(trades: ProjectxTrade[]): NormalizedProjectxTrade[] {
  const live = trades.filter((t) => !t.voided);

  const byContract: Record<string, ProjectxTrade[]> = {};
  for (const t of live) {
    const key = String(t.contractId);
    (byContract[key] ??= []).push(t);
  }

  const out: NormalizedProjectxTrade[] = [];

  for (const [contractId, legs] of Object.entries(byContract)) {
    legs.sort(
      (a, b) => new Date(a.creationTimestamp).getTime() - new Date(b.creationTimestamp).getTime(),
    );

    for (let i = 0; i + 1 < legs.length; i += 2) {
      const entry = legs[i];
      const exit = legs[i + 1];
      if (!entry || !exit) continue;

      const direction: "long" | "short" = entry.side === 0 ? "long" : "short";
      const quantity = Math.min(Number(entry.size) || 0, Number(exit.size) || 0);
      const fees = (Number(entry.fees) || 0) + (Number(exit.fees) || 0);

      // ProjectX reports realized P&L on the closing half-turn. Treat it as gross and
      // subtract fees to store NET pnl, matching the app's convention (pnl.js / the
      // Tradovate path). NOTE: verify against a live account whether profitAndLoss is
      // already net — if so, drop the `- fees` here.
      const gross = Number(exit.profitAndLoss ?? 0);
      const pnl = Number((gross - fees).toFixed(2));

      out.push({
        external_trade_id: `projectx_${entry.id}_${exit.id}`,
        instrument: contractId,
        direction,
        quantity,
        entry_price: Number(entry.price) || 0,
        exit_price: Number(exit.price) || 0,
        entry_date: entry.creationTimestamp,
        exit_date: exit.creationTimestamp,
        pnl,
        commission: fees,
      });
    }
  }

  return out;
}
