import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

/**
 * Live count of unread ("new") contact form submissions, for the admin
 * Contact Inbox badge in the sidebar and the "New" tab counter in the inbox.
 *
 * Admin-only: RLS on contact_submissions returns zero rows for everyone else,
 * and the hook skips the query entirely for non-admins. The count refreshes
 * in realtime — contact_submissions is in the supabase_realtime publication
 * (migration 034) and postgres_changes respects RLS, so only admins receive
 * events.
 */
export function useContactInboxCount() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [newCount, setNewCount] = useState(0);
  // Distinct channel topic per hook instance — the sidebar and the inbox page
  // can both mount this hook without their subscriptions colliding.
  const channelTopicRef = useRef(
    `contact-inbox-count-${Math.random().toString(36).slice(2)}`
  );

  const refresh = useCallback(async () => {
    if (!isAdmin) return;
    const { count, error } = await supabase
      .from("contact_submissions")
      .select("id", { head: true, count: "exact" })
      .eq("status", "new");

    if (error) {
      console.error("[ContactInbox] new count failed:", error.message);
      return;
    }
    setNewCount(count ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setNewCount(0);
      return;
    }
    let cancelled = false;

    refresh();

    const channel = supabase
      .channel(channelTopicRef.current)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_submissions" },
        () => {
          if (!cancelled) refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refresh]);

  return { newCount, refresh };
}
