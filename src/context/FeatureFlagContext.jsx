import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import {
  FEATURE_CATALOG,
  resolveAudience,
  evaluateFlag,
} from "../lib/featureFlags";

// ── Feature flag context ──────────────────────────────────────────────────
// Loads feature_flags once per session, resolves the current user's audience
// from their role + active subscription, and exposes isFeatureEnabled(key) so
// any component can gate UI. Admins additionally get refreshFlags() to re-pull
// after editing flags in the dashboard.

const FeatureFlagContext = createContext(null);

export const FeatureFlagProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [flags, setFlags] = useState({}); // keyed by flag.key
  const [audience, setAudience] = useState("free");
  const [loading, setLoading] = useState(true);

  // Pull the flag catalog. Fails open: if the table is missing (migration not
  // applied) or the read errors, we keep an empty map and evaluateFlag() treats
  // every feature as enabled.
  const refreshFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, name, description, enabled, audiences, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      const map = {};
      (data ?? []).forEach((f) => {
        map[f.key] = f;
      });
      setFlags(map);
    } catch (err) {
      console.error("[FeatureFlags] load failed, failing open:", err.message);
      setFlags({});
    }
  }, []);

  // Resolve the current user's audience from their active subscription.
  const resolveUserAudience = useCallback(async () => {
    if (!user) return setAudience("free");
    if (user.role === "admin") return setAudience("admin");

    try {
      const { data } = await supabase
        .from("user_subscriptions")
        .select("status, trial_end, subscription_plans(slug)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const planSlug = data?.subscription_plans?.slug ?? null;
      const isTrial = !!data?.trial_end && new Date(data.trial_end) > new Date();
      setAudience(resolveAudience({ role: user.role, planSlug, isTrial }));
    } catch (err) {
      console.error("[FeatureFlags] audience resolve failed:", err.message);
      setAudience(resolveAudience({ role: user?.role }));
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      setFlags({});
      setAudience("free");
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([refreshFlags(), resolveUserAudience()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshFlags, resolveUserAudience]);

  const isFeatureEnabled = useCallback(
    (key) => evaluateFlag(flags[key], audience),
    [flags, audience]
  );

  const value = useMemo(
    () => ({
      flags,
      audience,
      loading,
      isFeatureEnabled,
      refreshFlags,
      catalog: FEATURE_CATALOG,
    }),
    [flags, audience, loading, isFeatureEnabled, refreshFlags]
  );

  return (
    <FeatureFlagContext.Provider value={value}>
      {children}
    </FeatureFlagContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx)
    throw new Error("useFeatureFlags must be used within a FeatureFlagProvider");
  return ctx;
};

export default FeatureFlagContext;
