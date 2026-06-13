import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  normalizeNotificationPrefs,
  notificationPrefsSchema,
} from "../lib/schemas/notifications";

/**
 * Loads and persists the user's notification channel preferences, stored at
 * user_profiles.preferences.notifications (JSONB). Writes are read-modify-merge
 * so sibling preference keys (dateFormat, theme, etc.) are never clobbered.
 */
export function useNotificationPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState(() => normalizeNotificationPrefs(null));
  const [loading, setLoading] = useState(true);
  // Full preferences object, kept so merges preserve unrelated keys.
  const allPrefsRef = useRef({});

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    supabase
      .from("user_profiles")
      .select("preferences")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const all = data?.preferences ?? {};
        allPrefsRef.current = all;
        setPrefs(normalizeNotificationPrefs(all.notifications));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Toggle a single channel for a category. Optimistic, with rollback on error.
  const setChannel = useCallback(
    async (category, channel, value) => {
      if (!user?.id) return;

      const previous = prefs;
      const next = {
        ...prefs,
        [category]: { ...prefs[category], [channel]: value },
      };

      // Validate before persisting.
      const check = notificationPrefsSchema.safeParse(next);
      if (!check.success) {
        toast.error("Could not update notification settings.");
        return;
      }

      setPrefs(next);

      const mergedPreferences = {
        ...allPrefsRef.current,
        notifications: next,
      };

      const { error } = await supabase
        .from("user_profiles")
        .update({ preferences: mergedPreferences })
        .eq("user_id", user.id);

      if (error) {
        console.error("[Settings] notification prefs save:", error.message);
        toast.error("Could not save notification settings. Please try again.");
        setPrefs(previous);
        return;
      }
      allPrefsRef.current = mergedPreferences;
    },
    [prefs, user?.id]
  );

  return { prefs, loading, setChannel };
}
