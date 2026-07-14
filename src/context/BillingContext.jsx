import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { invokeFunction } from "../lib/invokeFunction";
import { useAuth } from "./AuthContext";

const BillingContext = createContext();

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return context;
};

export const BillingProvider = ({ children }) => {
  // Admin-wide billing analytics live in useAdminBillingData (real DB queries
  // under the admin RLS policies) — no mock data here anymore.

  // Real user subscription data from Supabase
  const [subscription, setSubscription] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [userInvoices, setUserInvoices] = useState([]);
  // Whether this user has ever consumed the one free trial (any subscription
  // row with trial_start set, however it ended). The trial gate uses this to
  // show a pay-now checkout instead of a second trial offer — the backend
  // (stripe-start-trial) enforces the same rule with a 409.
  const [hasUsedTrial, setHasUsedTrial] = useState(false);
  // Which user's billing data is currently loaded. `isLoading` is derived from
  // this instead of a boolean flag so a freshly signed-in user is "loading"
  // from the very first render — TrialGate must never decide between the
  // trial offer and the pay-now checkout off the pre-fetch defaults.
  const [loadedUserId, setLoadedUserId] = useState(null);

  // Keyed to the auth user, not a one-shot getSession(): after a cache-cleared
  // login there is no session when this provider mounts, and a mount-only
  // effect would never fetch (hasUsedTrial stuck false → wrong gate offer).
  const { user } = useAuth();
  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;
    let realtimeChannel = null;

    if (!userId) {
      setSubscription(null);
      setPaymentMethods([]);
      setUserInvoices([]);
      setHasUsedTrial(false);
      setLoadedUserId(null);
      return undefined;
    }

    const fetchData = async () => {
      const [subResult, methodsResult, invoicesResult, trialResult] = await Promise.all([
        supabase
          .from("user_subscriptions")
          .select("id, status, current_period_end, cancel_at_period_end, trial_start, trial_end, stripe_customer_id, subscription_plans(name, slug, price)")
          .eq("user_id", userId)
          .in("status", ["active", "trialing", "suspended"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("payment_methods")
          .select("id, type, last_four, brand, exp_month, exp_year, is_default")
          .eq("user_id", userId)
          .order("is_default", { ascending: false }),
        supabase
          .from("invoices")
          .select("id, invoice_number, status, total_amount, currency, paid_at, created_at, stripe_invoice_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        // Any row that ever had a trial, regardless of how it ended.
        supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", userId)
          .not("trial_start", "is", null)
          .limit(1)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setSubscription(subResult.data ?? null);
      setPaymentMethods(methodsResult.data ?? []);
      setUserInvoices(invoicesResult.data ?? []);
      setHasUsedTrial(Boolean(trialResult.data));
      setLoadedUserId(userId);
    };

    fetchData();

    // Live-refresh on any change to this user's subscription, invoices OR saved
    // cards, so a plan change, the proration invoice, and the card the webhook
    // saves all show up without a manual reload.
    //
    // payment_methods matters most at signup: the card is written server-side by
    // stripe-webhook on `payment_method.attached`, a moment AFTER the browser's
    // confirmation resolves. Without this the user who just typed their card in
    // was shown "No payment method on file" until they reloaded.
    //
    // (All three tables are in the supabase_realtime publication — migrations
    // 20260712050000 and 20260714140000; RLS scopes events to this user.)
    realtimeChannel = supabase
      .channel(`billing-sub-${userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "user_subscriptions",
        filter: `user_id=eq.${userId}`,
      }, () => {
        if (!cancelled) fetchData();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "invoices",
        filter: `user_id=eq.${userId}`,
      }, () => {
        if (!cancelled) fetchData();
      })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "payment_methods",
        filter: `user_id=eq.${userId}`,
      }, () => {
        if (!cancelled) fetchData();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, [userId]);

  const isLoading = Boolean(userId) && loadedUserId !== userId;

  // ── Actions ───────────────────────────────────────────────────────────────

  const createCheckoutSession = async (planSlug, billingCycle, promotionCode) => {
    const custData = await invokeFunction(
      "stripe-create-customer",
      undefined,
      "Failed to initialize checkout",
    );

    const subData = await invokeFunction(
      "stripe-create-subscription",
      { body: { customerId: custData.customerId, planSlug, billingCycle, promotionCode: promotionCode || undefined } },
      "Failed to create subscription",
    );

    // paidInFull: a 100%-off coupon zeroed the first invoice — Stripe already
    // activated the subscription and there is no PaymentIntent to confirm.
    // setupClientSecret is the SetupIntent to confirm instead: it saves the
    // card that renewal invoices auto-charge, so a $0 first month must still
    // collect card details or month 2 could never be billed.
    return {
      clientSecret: subData.clientSecret ?? null,
      paidInFull: Boolean(subData.paidInFull),
      setupClientSecret: subData.setupClientSecret ?? null,
    };
  };

  // `customerId` comes from the stripe-setup-intent step, which already
  // resolves-or-creates the Stripe customer — no extra create-customer call.
  const startTrial = async (planSlug, billingCycle, paymentMethodId, customerId, promotionCode) => {
    return invokeFunction(
      "stripe-start-trial",
      { body: { customerId, planSlug, billingCycle, paymentMethodId, promotionCode: promotionCode || undefined } },
      "Failed to start your trial",
    );
  };

  // Checks a promotion code against Stripe so the UI can confirm the discount
  // before the user commits. Returns { valid, code, label }.
  const validateCoupon = async (code) => {
    return invokeFunction(
      "stripe-validate-coupon",
      { body: { code } },
      "Couldn't check that coupon. Please try again.",
    );
  };

  const openPortal = async () => {
    // Return to the page the user left from — without this the portal's
    // default return_url is the standalone /billing route, so users who
    // opened it from Settings → Billing came "back" to a page missing the
    // Settings menu.
    const data = await invokeFunction(
      "stripe-portal",
      { body: { returnUrl: window.location.href } },
      "Failed to open billing portal",
    );
    window.location.href = data.url;
  };

  // Applies the retention discount to the caller's live subscription (used by the
  // cancellation "stay" offer). The coupon's percent/duration lives in Stripe;
  // the realtime user_subscriptions channel refreshes the row once the webhook
  // reconciles it, so callers don't need to refetch manually.
  const applyRetentionOffer = async () => {
    return invokeFunction(
      "stripe-apply-retention-coupon",
      undefined,
      "We couldn't apply the offer. Please try again.",
    );
  };

  const value = {
    // Real user subscription data
    subscription,
    paymentMethods,
    userInvoices,
    hasUsedTrial,
    isLoading,
    // Stripe actions
    createCheckoutSession,
    startTrial,
    validateCoupon,
    openPortal,
    applyRetentionOffer,
  };

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
};
