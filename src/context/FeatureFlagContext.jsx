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
  // True only while a live plan change is being re-resolved. Drives the brief
  // "Updating your plan…" overlay below — distinct from `loading`, which gates
  // the whole app shell on first sign-in and must not flip for a plan change.
  const [entitlementSyncing, setEntitlementSyncing] = useState(false);
  // Lets the realtime effect call the latest refreshEntitlement without taking
  // it as a dependency — depending on it would tear down and re-subscribe the
  // channel on every flags/audience change.
  const refreshEntitlementRef = useRef(() => Promise.resolve());
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

  // ── Live plan changes ────────────────────────────────────────────────────
  // The audience used to be resolved exactly once, when the user signed in.
  // Nothing re-resolved it afterwards, so upgrading Starter → Pro left every
  // Pro feature locked: the subscription row said `premium` while this context
  // still said `basic`. Re-subscribing on a plan change fixes it without a
  // reload — components read `audience` from here, so the gates simply re-render
  // open.
  //
  // Scoped to UPDATEs where plan_id or status actually moved. An INSERT is a
  // brand-new trial, which TrialActivation already refreshes itself (and which
  // renders under TrialGate, where an overlay would be a flash); and the webhook
  // touches this row for plenty of reasons that don't change entitlement.
  // payload.old carries the previous values thanks to REPLICA IDENTITY FULL
  // (migration 20260714140000).
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user.role === "admin") return undefined;
    let cancelled = false;

    const channel = supabase
      .channel(`entitlement-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const before = payload.old ?? {};
          const after = payload.new ?? {};
          const moved =
            before.plan_id !== after.plan_id || before.status !== after.status;
          if (!moved || cancelled) return;

          setEntitlementSyncing(true);
          try {
            await refreshEntitlementRef.current();
          } finally {
            if (!cancelled) setEntitlementSyncing(false);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, user?.role]);

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

  useEffect(() => {
    refreshEntitlementRef.current = refreshEntitlement;
  }, [refreshEntitlement]);

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
      entitlementSyncing,
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
      entitlementSyncing,
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
      {/* Plan change in flight. Brief and self-clearing: it covers the moment
          between the subscription row changing and this context re-resolving,
          so the user isn't looking at a Pro plan next to a locked Pro page. */}
      {entitlementSyncing && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-gray-900/70"
          data-test-id="entitlement-syncing-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600 dark:border-[#2dd4bf]" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Updating your plan…
            </p>
          </div>
        </div>
      )}
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
