import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { emitNotification, NOTIFICATION_COLUMNS } from "../utils/notifications";
import { normalizeNotificationPrefs } from "../lib/schemas/notifications";

const PAGE_SIZE = 20;

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // userId and prefs are read by createNotification; kept in refs so the
  // callback identity stays stable and never goes stale between renders.
  const userIdRef = useRef(null);
  const prefsRef = useRef(null);

  const fetchPage = useCallback(async (userId, offset) => {
    const { data, error } = await supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("[Notify] fetch page failed:", error.message);
      return { rows: [], more: false };
    }
    return { rows: data ?? [], more: (data?.length ?? 0) === PAGE_SIZE };
  }, []);

  const fetchUnreadCount = useCallback(async (userId) => {
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      console.error("[Notify] unread count failed:", error.message);
      return;
    }
    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let realtimeChannel = null;

    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const userId = session.user.id;
      userIdRef.current = userId;

      // Load the user's notification preferences (defaults applied).
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();
      prefsRef.current = profile?.preferences?.notifications ?? null;

      setIsLoading(true);
      const [{ rows, more }] = await Promise.all([
        fetchPage(userId, 0),
        fetchUnreadCount(userId),
      ]);
      if (cancelled) return;
      setNotifications(rows);
      setHasMore(more);
      setIsLoading(false);

      realtimeChannel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (cancelled) return;
            if (payload.eventType === "INSERT") {
              const row = payload.new;
              setNotifications((prev) =>
                prev.some((n) => n.id === row.id) ? prev : [row, ...prev]
              );
              if (!row.read_at) setUnreadCount((c) => c + 1);
              if (row.severity === "error") {
                toast.error(row.title);
              }
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new;
              setNotifications((prev) =>
                prev.map((n) => (n.id === row.id ? { ...n, ...row } : n))
              );
            }
          }
        )
        .subscribe();
    };

    init();

    return () => {
      cancelled = true;
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [fetchPage, fetchUnreadCount]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = useCallback(async (id) => {
    const readAt = new Date().toISOString();
    // Optimistic — realtime UPDATE will reconcile to the same value.
    let wasUnread = false;
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id && !n.read_at) {
          wasUnread = true;
          return { ...n, read_at: readAt };
        }
        return n;
      })
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("id", id)
      .is("read_at", null);

    if (error) console.error("[Notify] mark read failed:", error.message);
  }, []);

  const markAllAsRead = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    const readAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt }))
    );
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) console.error("[Notify] mark all read failed:", error.message);
  }, []);

  const loadMore = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    const { rows, more } = await fetchPage(userId, notifications.length);
    setNotifications((prev) => {
      const seen = new Set(prev.map((n) => n.id));
      return [...prev, ...rows.filter((r) => !seen.has(r.id))];
    });
    setHasMore(more);
  }, [fetchPage, notifications.length]);

  // Create a notification for the current user. Thin wrapper over emitNotification
  // that supplies the userId + prefs; the realtime subscription surfaces the row.
  const createNotification = useCallback(async (record) => {
    return emitNotification({
      userId: userIdRef.current,
      record,
      prefs: prefsRef.current,
    });
  }, []);

  const value = {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    prefs: normalizeNotificationPrefs(prefsRef.current),
    markAsRead,
    markAllAsRead,
    loadMore,
    createNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
