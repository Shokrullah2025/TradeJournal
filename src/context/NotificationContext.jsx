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
              // Re-sort after merging: aggregated notifications (e.g. contact
              // inbox) bump created_at on update so they surface at the top.
              setNotifications((prev) =>
                prev
                  .map((n) => (n.id === row.id ? { ...n, ...row } : n))
                  .sort(
                    (a, b) => new Date(b.created_at) - new Date(a.created_at)
                  )
              );
            } else if (payload.eventType === "DELETE") {
              // Default DELETE payloads carry only the row id, and the acting
              // tab already adjusted the unread count optimistically — just drop
              // the row here so other tabs stay in sync.
              const removedId = payload.old?.id;
              setNotifications((prev) => prev.filter((n) => n.id !== removedId));
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

  // Re-sync the first page + unread count whenever the tab regains focus.
  // Realtime keeps open tabs in step, but a backgrounded/asleep tab can miss
  // events (the socket drops), so a notification cleared or read on another
  // device would otherwise linger here until a full reload. Refetching on
  // return makes "I cleared it on my phone" reflect on the computer without
  // one. Collapses any "Load more" expansion back to the first page, which is
  // an acceptable trade for always showing the true current state.
  useEffect(() => {
    const resync = async () => {
      const userId = userIdRef.current;
      if (!userId || document.visibilityState === "hidden") return;
      const [{ rows, more }] = await Promise.all([
        fetchPage(userId, 0),
        fetchUnreadCount(userId),
      ]);
      setNotifications(rows);
      setHasMore(more);
    };
    window.addEventListener("focus", resync);
    document.addEventListener("visibilitychange", resync);
    return () => {
      window.removeEventListener("focus", resync);
      document.removeEventListener("visibilitychange", resync);
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

  const deleteNotification = useCallback(async (id) => {
    const userId = userIdRef.current;
    if (!userId) return;
    // Optimistic remove; realtime DELETE will reconcile (no-op if already gone).
    let wasUnread = false;
    setNotifications((prev) =>
      prev.filter((n) => {
        if (n.id === id) {
          wasUnread = !n.read_at;
          return false;
        }
        return true;
      })
    );
    if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", userId); // defense in depth alongside RLS

    if (error) {
      console.error("[Notify] delete failed:", error.message);
      toast.error("Couldn't delete notification. Please try again.");
    }
  }, []);

  const deleteAll = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    // Snapshot for rollback if the DB write fails.
    const snapshot = notifications;
    const prevUnread = unreadCount;
    setNotifications([]);
    setUnreadCount(0);
    setHasMore(false);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("[Notify] delete all failed:", error.message);
      toast.error("Couldn't clear notifications. Please try again.");
      setNotifications(snapshot);
      setUnreadCount(prevUnread);
    }
  }, [notifications, unreadCount]);

  const deleteMany = useCallback(
    async (ids) => {
      const userId = userIdRef.current;
      if (!userId || !ids || ids.length === 0) return;
      const idSet = new Set(ids);
      const snapshot = notifications;
      const prevUnread = unreadCount;
      const removedUnread = notifications.filter(
        (n) => idSet.has(n.id) && !n.read_at
      ).length;
      setNotifications((prev) => prev.filter((n) => !idSet.has(n.id)));
      setUnreadCount((c) => Math.max(0, c - removedUnread));

      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", ids)
        .eq("user_id", userId);

      if (error) {
        console.error("[Notify] delete many failed:", error.message);
        toast.error("Couldn't delete notifications. Please try again.");
        setNotifications(snapshot);
        setUnreadCount(prevUnread);
      }
    },
    [notifications, unreadCount]
  );

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
    deleteNotification,
    deleteMany,
    deleteAll,
    loadMore,
    createNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
