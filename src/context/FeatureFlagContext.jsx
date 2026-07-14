import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";
import { withTimeout } from "../utils/withTimeout";
import {
  FEATURE_CATALOG,
  resolveAudience,
  deriveEntitlement,
  evaluateFlag,
  getFeatureState,
  requiredPlanFor,
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
  // True once the first authenticated resolution has completed. Subsequent
  // re-resolutions (e.g. a routine token refresh when the tab regains focus
  // hands AuthContext a new `user` object reference) must NOT flip `loading`
  // back to true — see the effect below.
  const hasResolvedRef = useRef(false);

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
        .select("status, trial_end, current_period_end, subscription_plans(slug)")
        .eq("user_id", user.id)
        // A trial grants the same Pro entitlements as a paid plan, so both
        // 'active' and 'trialing' rows must resolve the audience. (Stripe's
        // trialing status is stored as 'trialing' since migration 025.)
        .in("status", ["active", "trialing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Entitlement dies with the period even if the status-flipping webhook
      // never lands — an expired trial or lapsed active row must resolve to
      // "free". The pure logic (and its edge cases) lives in
      // src/lib/featureFlags.js and is unit-tested in featureFlags.test.js.
      // A live trial resolves to the plan it is a trial OF, so trialing users
      // are gated exactly like paying users on that plan.
      const { planSlug } = deriveEntitlement(data);
      setAudience(resolveAudience({ role: user.role, planSlug }));
    } catch (err) {
      console.error("[FeatureFlags] audience resolve failed:", err.message);
      setAudience(resolveAudience({ role: user?.role }));
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated) {
      hasResolvedRef.current = false;
      setFlags({});
      setAudience("free");
      setLoading(false);
      return;
    }
    // Only block the gated app shell (RequireSubscription renders a full-screen
    // LoadingScreen while this is true) on the FIRST resolution after sign-in.
    // Re-resolutions caused by a new `user` reference after a token refresh
    // refresh flags/audience in the background, leaving the existing shell —
    // and the non-dismissible TrialGate over it — mounted. Flipping `loading`
    // here would unmount TrialGate, throwing away any in-progress trial flow
    // (e.g. the entered card / SetupIntent step) and dropping the user back to
    // the start every time they switch tabs and come back.
    if (!hasResolvedRef.current) setLoading(true);
    // Time-boxed: both loaders swallow their own errors, but a request that
    // stalls without settling would keep `loading` true and pin the full-screen
    // LoadingScreen forever. On timeout we proceed (flags fail open); the slow
    // reads still update flags/audience in the background when they land.
    withTimeout(Promise.all([refreshFlags(), resolveUserAudience()]), 8000, null).finally(() => {
      if (!cancelled) {
        hasResolvedRef.current = true;
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, refreshFlags, resolveUserAudience]);

  const isFeatureEnabled = useCallback(
    (key) => evaluateFlag(flags[key], audience),
    [flags, audience]
  );

  // Re-resolve entitlement in place, without reloading the app. Used right after
  // a subscription starts (TrialActivation): stripe-start-trial inserts the
  // 'trialing' user_subscriptions row before it responds, so awaiting this is
  // enough for `audience` to leave "free" — RequireSubscription then drops the
  // TrialGate and lets the user straight into the app.
  const refreshEntitlement = useCallback(
    () => Promise.all([refreshFlags(), resolveUserAudience()]),
    [refreshFlags, resolveUserAudience]
  );

  // "on" | "locked" | "hidden" for the current audience — lets the UI keep a
  // locked feature visible (blurred, behind an upgrade gate) instead of the
  // binary hide that isFeatureEnabled implies.
  const featureState = useCallback(
    (key) => getFeatureState(flags[key], audience),
    [flags, audience]
  );

  // The cheapest plan that would unlock a feature — the "Upgrade to Pro" target.
  const requiredPlan = useCallback((key) => requiredPlanFor(flags[key]), [flags]);

  const value = useMemo(
    () => ({
      flags,
      audience,
      loading,
      isFeatureEnabled,
      getFeatureState: featureState,
      requiredPlan,
      refreshFlags,
      refreshEntitlement,
      catalog: FEATURE_CATALOG,
    }),
    [
      flags,
      audience,
      loading,
      isFeatureEnabled,
      featureState,
      requiredPlan,
      refreshFlags,
      refreshEntitlement,
    ]
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
