import { supabase } from "../lib/supabase";

/**
 * Fire-and-forget audit logger. Inserts into user_activity_log.
 * Never throws — a logging failure must not break the calling operation.
 *
 * @param {string} userId  - auth.uid() of the acting user
 * @param {string} action  - short action name, e.g. "login", "trade_created"
 * @param {object} details - optional JSONB payload (no PII, no credentials)
 */
export function logActivity(userId, action, details = {}) {
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
      });
    })
    .then((res) => {
      if (res?.error) console.error("[ActivityLog] insert failed:", res.error.message);
    })
    .catch((err) => {
      console.error("[ActivityLog] unexpected error:", err?.message);
    });
}
