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

  supabase
    .from("user_activity_log")
    .insert({
      user_id:    userId,
      action,
      details,
      user_agent: navigator.userAgent.slice(0, 500),
    })
    .then(({ error }) => {
      if (error) console.error("[ActivityLog] insert failed:", error.message);
    });
}
