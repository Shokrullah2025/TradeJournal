import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

/**
 * Tracks a single aggregated count of NEW (untriaged) contact submissions for
 * admins. This is deliberately one number — a badge that reads 1, 2, 3… — rather
 * than one notification per message, so a burst of contact-form submissions never
 * floods the admin with individual alerts.
 *
 * The count is derived live from contact_submissions (status = 'new'); opening a
 * message marks it 'read', which decrements the badge. Non-admins never query the
 * table (RLS would return nothing anyway) and always see 0.
 */
const ContactInboxContext = createContext();

export const useContactInbox = () => {
  const context = useContext(ContactInboxContext);
  if (!context) {
    throw new Error(
      "useContactInbox must be used within a ContactInboxProvider",
    );
  }
  return context;
};

export const ContactInboxProvider = ({ children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [unreadCount, setUnreadCount] = useState(0);

  // Recompute the badge from the source of truth. Cheap: a head+count query, no
  // rows transferred. Never select('*') (CLAUDE.md §4).
  const refresh = useCallback(async () => {
    if (!isAdmin) {
      setUnreadCount(0);
      return;
    }
    const { count, error } = await supabase
      .from("contact_submissions")
      .select("id", { head: true, count: "exact" })
      .eq("status", "new");

    if (error) {
      console.error("[ContactInbox] count failed:", error.message);
      return;
    }
    setUnreadCount(count ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    // Initial load, then keep the badge live. Any change to the table (a new
    // submission, or a status flip to read/archived/spam) just re-derives the
    // count — simple and always consistent.
    refresh();

    const channel = supabase
      .channel("contact-inbox-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_submissions" },
        () => {
          if (!cancelled) refresh();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, refresh]);

  const value = { unreadCount, refresh };

  return (
    <ContactInboxContext.Provider value={value}>
      {children}
    </ContactInboxContext.Provider>
  );
};
