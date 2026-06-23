import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const BillingContext = createContext();

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) {
    throw new Error("useBilling must be used within a BillingProvider");
  }
  return context;
};

// ── Mock admin analytics data ──────────────────────────────────────────────
// Used only by the admin billing panel. Real user subscription data is fetched
// from Supabase below. Admin-wide payment data requires a dedicated admin query
// endpoint with elevated RLS policies (future work).
const MOCK_PAYMENTS = [
  {
    id: "pay_001", userId: "user1", userEmail: "admin@example.com", userName: "Admin User",
    amount: 29.0, currency: "USD", plan: "premium", billingCycle: "monthly",
    status: "completed", cardLast4: "4242", cardBrand: "visa",
    createdAt: new Date("2024-12-01"), nextBillingDate: new Date("2025-01-01"),
  },
  {
    id: "pay_002", userId: "user2", userEmail: "john@example.com", userName: "John Doe",
    amount: 290.0, currency: "USD", plan: "premium", billingCycle: "yearly",
    status: "completed", cardLast4: "1234", cardBrand: "mastercard",
    createdAt: new Date("2024-11-15"), nextBillingDate: new Date("2025-11-15"),
  },
  {
    id: "pay_003", userId: "user3", userEmail: "jane@example.com", userName: "Jane Smith",
    amount: 99.0, currency: "USD", plan: "enterprise", billingCycle: "monthly",
    status: "completed", cardLast4: "5678", cardBrand: "amex",
    createdAt: new Date("2024-12-10"), nextBillingDate: new Date("2025-01-10"),
  },
  {
    id: "pay_004", userId: "user4", userEmail: "bob@example.com", userName: "Bob Wilson",
    amount: 29.0, currency: "USD", plan: "premium", billingCycle: "monthly",
    status: "failed", cardLast4: "9999", cardBrand: "visa",
    createdAt: new Date("2024-12-15"), nextBillingDate: new Date("2025-01-15"),
    failureReason: "Insufficient funds",
  },
];

export const BillingProvider = ({ children }) => {
  // Admin analytics (mock — see note above)
  const [payments] = useState(MOCK_PAYMENTS);
  const [adminStats] = useState({
    totalSubscribers: MOCK_PAYMENTS.filter((p) => p.status === "completed").length,
    totalRevenue: MOCK_PAYMENTS.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0),
    monthlyRevenue: MOCK_PAYMENTS.filter((p) => p.status === "completed" && p.billingCycle === "monthly").reduce((s, p) => s + p.amount, 0),
    yearlyRevenue: MOCK_PAYMENTS.filter((p) => p.status === "completed" && p.billingCycle === "yearly").reduce((s, p) => s + p.amount, 0),
    subscriptionsByPlan: {
      basic: 0,
      premium: MOCK_PAYMENTS.filter((p) => p.plan === "premium" && p.status === "completed").length,
      enterprise: MOCK_PAYMENTS.filter((p) => p.plan === "enterprise" && p.status === "completed").length,
    },
    failedPayments: MOCK_PAYMENTS.filter((p) => p.status === "failed").length,
  });

  // Real user subscription data from Supabase
  const [subscription, setSubscription] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [userInvoices, setUserInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let realtimeChannel = null;

    const fetchData = async (userId) => {
      const [subResult, methodsResult, invoicesResult] = await Promise.all([
        supabase
          .from("user_subscriptions")
          .select("id, status, current_period_end, cancel_at_period_end, stripe_customer_id, subscription_plans(name, slug, price)")
          .eq("user_id", userId)
          .in("status", ["active", "suspended"])
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
      ]);

      if (cancelled) return;
      setSubscription(subResult.data ?? null);
      setPaymentMethods(methodsResult.data ?? []);
      setUserInvoices(invoicesResult.data ?? []);
    };

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;

      const userId = session.user.id;
      setIsLoading(true);
      await fetchData(userId);
      if (!cancelled) setIsLoading(false);
      if (cancelled) return;

      realtimeChannel = supabase
        .channel(`billing-sub-${userId}`)
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "user_subscriptions",
          filter: `user_id=eq.${userId}`,
        }, () => {
          if (!cancelled) fetchData(userId);
        })
        .subscribe();
    };

    init();

    return () => {
      cancelled = true;
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  // billingDetails: { address, taxId } collected by BillingAddressForm. The
  // address must reach Stripe before the subscription is created so Stripe Tax
  // can compute VAT/GST. Returns the clientSecret plus tax-inclusive totals.
  const createCheckoutSession = async (planSlug, billingCycle, billingDetails = {}) => {
    const { data: custData, error: custError } = await supabase.functions.invoke(
      "stripe-create-customer",
      { body: { address: billingDetails.address, taxId: billingDetails.taxId } },
    );
    if (custError || !custData?.success) {
      throw new Error(custData?.error || "Failed to initialize checkout");
    }

    const { data: subData, error: subError } = await supabase.functions.invoke(
      "stripe-create-subscription",
      { body: { customerId: custData.data.customerId, planSlug, billingCycle } },
    );
    if (subError || !subData?.success) {
      throw new Error(subData?.error || "Failed to create subscription");
    }

    return { clientSecret: subData.data.clientSecret, totals: subData.data.totals };
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke("stripe-portal");
    if (error || !data?.success) {
      throw new Error(data?.error || "Failed to open billing portal");
    }
    window.location.href = data.data.url;
  };

  // ── Admin-compat helpers (use mock data until admin RLS policies are added) ─

  const getPaymentsByUser = (userId) =>
    payments.filter((p) => p.userId === userId);

  const getSubscriptionAnalytics = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentPayments = payments.filter((p) => p.createdAt >= thirtyDaysAgo);
    return {
      ...adminStats,
      recentPayments: recentPayments.length,
      averageRevenuePerUser: adminStats.totalSubscribers > 0
        ? adminStats.totalRevenue / adminStats.totalSubscribers
        : 0,
      churnRate: 0.05,
      growthRate: 0.15,
    };
  };

  const value = {
    // Admin panel (mock data — real data requires admin RLS policy)
    payments,
    subscriptions: adminStats,
    getPaymentsByUser,
    getSubscriptionAnalytics,
    // Real user subscription data
    subscription,
    paymentMethods,
    userInvoices,
    isLoading,
    // Stripe actions
    createCheckoutSession,
    openPortal,
  };

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
};
