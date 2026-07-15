import { supabase } from "../lib/supabase";

/**
 * Fire-and-forget audit logger. Inserts into user_activity_log.
 * Never throws — a logging failure must not break the calling operation.
 *
 * @param {string} userId  - auth.uid() of the acting user
 * @param {string} action  - short action name, e.g. "login", "trade_created"
 * @param {object} details - optional JSONB payload (no PII, no credentials)
 * @param {object} [extra] - optional extra columns: { ipAddress }
 */
export function logActivity(userId, action, details = {}, extra = {}) {
  if (!userId || !action) return;

  // The insert runs with whatever token the client holds when it fires — and
  // being fire-and-forget it can race a sign-out, an account switch, or a
  // retried sign-in. RLS requires user_id = auth.uid(), so a mismatched or
  // missing session fails with 42501 ("new row violates row-level security").
  // Verify the live session belongs to the user we're logging for, and
  // quietly drop the entry otherwise.
  supabase.auth
    .getSession()
    .then(({ data: { session } }) => {
      if (!session?.user || session.user.id !== userId) return null;
      return supabase.from("user_activity_log").insert({
        user_id:    userId,
        action,
        details,
        user_agent: navigator.userAgent.slice(0, 500),
        ...(extra.ipAddress
          ? { ip_address: String(extra.ipAddress).slice(0, 100) }
          : {}),
      });
    })
    .then((res) => {
      if (res?.error) console.error("[ActivityLog] insert failed:", res.error.message);
    })
    .catch((err) => {
      console.error("[ActivityLog] unexpected error:", err?.message);
    });
}

// Best-effort coarse geolocation for the login history. Keyless HTTPS provider,
// short timeout so a slow lookup never holds up the (fire-and-forget) audit
// write for long. Returns null on any failure — location is a nicety, never a
// requirement, and must never break or delay a sign-in.
async function lookupGeo() {
  try {
    const res = await fetch("https://ipwho.is/", {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const g = await res.json();
    if (g?.success === false) return null;
    const location = [g.city, g.country].filter(Boolean).join(", ") || null;
    return { location, ip: g.ip || null };
  } catch {
    return null;
  }
}

/**
 * Record a sign-in in the login history, annotated with the device (via the
 * user agent, added by logActivity) and a coarse location. The location is
 * client-derived and non-authoritative — it only labels the user's own login
 * records, shown only to them (RLS) in Settings → Security. Fire-and-forget:
 * a failed lookup just omits the location; it never blocks or delays login.
 *
 * @param {string} userId - auth.uid() of the signing-in user
 */
export async function recordLogin(userId) {
  if (!userId) return;
  const geo = await lookupGeo();
  logActivity(
    userId,
    "login",
    geo?.location ? { location: geo.location } : {},
    geo?.ip ? { ipAddress: geo.ip } : {},
  );
}
