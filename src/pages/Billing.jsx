import React, { useState, useEffect } from "react";
import ModalPortal from "../components/common/ModalPortal";
import {
  CreditCard,
  Check,
  Shield,
  Download,
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useBilling } from "../context/BillingContext";
import { toast } from "react-hot-toast";
import StripePaymentForm from "../components/billing/StripePaymentForm";
import useSubscriptionPlans from "../hooks/useSubscriptionPlans";
import useAdminBillingData from "../hooks/useAdminBillingData";
import { annualPriceFor } from "../utils/pricing";

const Billing = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  // Real admin analytics from the DB (admin RLS); no-op for regular users.
  const { data: adminData, loading: adminLoading, error: adminError } =
    useAdminBillingData(isAdmin);
  const {
    subscription,
    paymentMethods,
    userInvoices,
    isLoading,
    createCheckoutSession,
    openPortal,
  } = useBilling();
  // Live plan prices set by admins in the Pricing tab; the hardcoded numbers
  // below act as a fallback until they load.
  const { plans: livePlans } = useSubscriptionPlans();
  // Derive active plan slug from real DB subscription (BillingContext).
  // A trial carries the same plan entitlement as an active subscription, so
  // both 'active' and 'trialing' resolve the plan. Falls back to "basic".
  const currentPlanSlug =
    subscription?.status === "active" || subscription?.status === "trialing"
      ? (subscription?.subscription_plans?.slug ?? "basic")
      : "basic";

  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  // "payment" charges the first invoice; "setup" saves a card for a checkout
  // whose first invoice is $0 (100%-off coupon) so renewals can be charged.
  const [paymentMode, setPaymentMode] = useState("payment");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("payment");
  // Admin billing card tab — admins manage everyone's billing here, they don't
  // see their own plan/invoices.
  const [adminTab, setAdminTab] = useState("overview");

  const handleUpgrade = async (planSlug, cycle) => {
    setSelectedPlan(planSlug);
    setCheckoutLoading(true);
    try {
      // The backend's billingCycle is "monthly" | "annually" — this page's
      // toggle stores "yearly", which the backend would silently read as
      // monthly and subscribe at the wrong price.
      const { clientSecret: cs, paidInFull, setupClientSecret } = await createCheckoutSession(
        planSlug,
        cycle === "yearly" ? "annually" : cycle,
      );
      if (paidInFull) {
        // $0 first invoice (100%-off coupon): already active, nothing to pay
        // today — but still save a card (SetupIntent) so renewal invoices
        // after the free period have something to charge.
        if (setupClientSecret) {
          setClientSecret(setupClientSecret);
          setPaymentMode("setup");
          setShowPaymentForm(true);
        } else {
          toast.success("Subscription activated!");
          handlePaymentSuccess();
        }
      } else {
        setClientSecret(cs);
        setPaymentMode("payment");
        setShowPaymentForm(true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to initialize checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    setPaymentMode("payment");
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
    setPaymentMode("payment");
  };

  // Opening the Stripe portal navigates the tab away. When the user returns —
  // especially via the browser back button, which restores the page from the
  // bfcache with its old state — the button could stay stuck on "Opening…".
  // Reset the loading flag whenever the page is shown or regains focus.
  useEffect(() => {
    const reset = () => setPortalLoading(false);
    window.addEventListener("pageshow", reset);
    window.addEventListener("focus", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("focus", reset);
    };
  }, []);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (err) {
      toast.error(err.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const planContent = [
    {
      id: "basic",
      name: "Starter",
      description: "Everything you need to start journaling consistently",
      monthlyPrice: 9.99,
      yearlyPrice: 90,
      features: [
        "Up to 50 trades per month",
        "1 trading account",
        "Trade journal with notes & screenshots",
        "Core dashboard — P&L, win rate, calendar",
        "CSV & Excel import",
        "Risk calculator",
        "Email support",
      ],
      color: "gray",
      popular: false,
    },
    {
      id: "premium",
      name: "Pro",
      description: "For traders who review, refine, and scale an edge",
      monthlyPrice: 18,
      yearlyPrice: 180,
      features: [
        "Everything in Starter",
        "Unlimited trades",
        "Up to 3 trading accounts",
        "Advanced analytics — profit factor, drawdown, R-multiple",
        "Breakdowns by setup, instrument & session",
        "Backtesting studio",
        "Custom reports & data export",
        "Priority email support",
      ],
      color: "primary",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Elite",
      description: "For funded traders running multiple accounts",
      monthlyPrice: 40,
      yearlyPrice: 360,
      features: [
        "Everything in Pro",
        "Unlimited trading accounts",
        "Prop-firm & funded account tracking",
        "Compare performance across accounts",
        "Unlimited saved backtest strategies",
        "Broker auto-sync — early access at launch",
        "Priority chat support",
      ],
      color: "amber",
      popular: false,
    },
  ];

  // Overlay live DB prices (set in the admin Pricing tab) onto the static plan
  // content, keeping features/copy local. The annual price and savings use the
  // same shared formula as the marketing pricing page (2 months free unless an
  // explicit, genuinely-discounted annual price is configured).
  const plans = planContent.map((p) => {
    const monthlyPrice = livePlans[p.id]?.price ?? p.monthlyPrice;
    return {
      ...p,
      name: livePlans[p.id]?.name ?? p.name,
      description: livePlans[p.id]?.description ?? p.description,
      features: livePlans[p.id]?.features?.length ? livePlans[p.id].features : p.features,
      monthlyPrice,
      yearlyPrice: annualPriceFor(monthlyPrice, livePlans[p.id]?.priceAnnually ?? p.yearlyPrice),
    };
  });

  // Dollar amount a plan saves per year on the annual price vs paying monthly,
  // rounded to cents and shown without trailing ".00". Derived from the live
  // prices, so admin price changes flow through automatically.
  const yearlySavingsAmount = (plan) => {
    const saved = Math.round((plan.monthlyPrice * 12 - plan.yearlyPrice) * 100) / 100;
    if (saved <= 0) return null;
    return Number.isInteger(saved) ? String(saved) : saved.toFixed(2);
  };

  // Savings shown on the Yearly toggle badge, from the featured plan.
  const popularPlan = plans.find((p) => p.popular) ?? plans.find((p) => p.monthlyPrice > 0);
  const popularSavings = popularPlan ? yearlySavingsAmount(popularPlan) : null;

  const getPlanPrice = (plan) => {
    return billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  };

  // @container/billing: the rail-vs-tabs layout switches on this component's
  // own width, not the viewport — embedded in Settings it gets far less room
  // than the window suggests. The container must be a wrapper: an element's
  // own container queries can't match itself, only an ancestor.
  return (
    <div className="@container/billing">
    <div className="flex flex-col">
      {/* Main Content — no padding of its own: the app shell (and the Settings
          grid, when embedded as a tab) already pad the page, and zero padding
          keeps the billing card top-aligned with the Settings subnav card. */}
      <div className="flex-1">
        {/* Capped width so the content doesn't look stretched. @container makes
            the grids below respond to this column's real width — the page is
            also embedded as a Settings tab, where two nav rails shrink the
            available space long before viewport breakpoints would fire. On a
            full desktop the column hits its 896px cap, so @4xl matches the old
            xl look exactly. */}
        <div className="@container max-w-4xl space-y-6">
          {/* Trial banner — shown while the subscription is in its free trial. */}
          {subscription?.status === "trialing" && (
            <div
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 @lg:p-6"
              data-test-id="billing-trial-banner"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-medium text-amber-900 dark:text-amber-200">
                      Free trial active
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      {subscription?.trial_end
                        ? `Your card will be charged on ${format(new Date(subscription.trial_end), "MMM d, yyyy")} unless you cancel before then.`
                        : "Cancel before your trial ends to avoid being charged."}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenPortal}
                  disabled={portalLoading}
                  className="py-2 px-4 border border-amber-300 dark:border-amber-600 rounded-md text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-70 disabled:cursor-not-allowed"
                  data-test-id="billing-trial-cancel-btn"
                >
                  {portalLoading ? "Opening…" : "Manage or cancel"}
                </button>
              </div>
            </div>
          )}

          {/* Admin billing — one card, same top-tab layout as the user page.
              Real DB data (admin RLS); admins don't see personal plan/invoice
              sections here. */}
          {isAdmin && (
            <div>
              <h1 className="text-lg font-bold text-gray-900 @2xl:text-xl dark:text-gray-300">
                Billing Management
              </h1>
              <p className="mt-1 text-xs text-gray-500 @2xl:text-sm dark:text-gray-500">
                Revenue, subscriptions, and payments across all users
              </p>
            </div>
          )}
          {isAdmin && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.05)] dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,.3),0_20px_40px_rgba(0,0,0,.4)]">
              <nav
                aria-label="Admin billing sections"
                className="flex gap-1.5 overflow-x-auto border-b border-gray-100 p-3 dark:border-white/5"
              >
                {[
                  { id: "overview", label: "Overview" },
                  { id: "transactions", label: "Transactions" },
                  { id: "failed", label: "Failed Payments" },
                  { id: "plans", label: "Plan Distribution" },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setAdminTab(id)}
                    data-test-id={`billing-admin-tab-${id}-btn`}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors @2xl:px-3.5 @2xl:py-2 @2xl:text-[13px] ${
                      adminTab === id
                        ? "bg-[#e7f5f2] font-semibold text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="p-4 @lg:p-6">
                {adminLoading ? (
                  <div className="flex items-center justify-center py-16" data-test-id="billing-admin-loading">
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600" />
                  </div>
                ) : adminError ? (
                  <p className="py-12 text-center text-sm text-red-600 dark:text-red-400" data-test-id="billing-admin-error">
                    {adminError}
                  </p>
                ) : adminData && (
                  <>
                    {/* Overview — compact stat tiles: tinted icon square, bold
                        number, quiet label. */}
                    {adminTab === "overview" && (
                      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4 @2xl:gap-4" data-test-id="billing-admin-overview">
                        {[
                          {
                            id: "revenue",
                            label: "Total Revenue",
                            value: `$${adminData.totalRevenue.toFixed(2)}`,
                            Icon: DollarSign,
                            tint: "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400",
                          },
                          {
                            id: "subscribers",
                            label: "Active Subscribers",
                            value: String(adminData.totalSubscribers),
                            Icon: Users,
                            tint: "bg-[#e7f5f2] text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]",
                          },
                          {
                            id: "arpu",
                            label: "Avg / Paying User",
                            value: `$${adminData.averageRevenuePerUser.toFixed(2)}`,
                            Icon: TrendingUp,
                            tint: "bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
                          },
                          {
                            id: "failed-count",
                            label: "Failed Payments",
                            value: String(adminData.failedCount),
                            Icon: AlertCircle,
                            tint: "bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400",
                          },
                        ].map(({ id, label, value, Icon, tint }) => (
                          <div
                            key={id}
                            className="rounded-xl border border-gray-200 p-4 dark:border-white/10"
                          >
                            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tint}`}>
                              <Icon className="h-[18px] w-[18px]" />
                            </div>
                            <p
                              className="mt-3 text-lg font-extrabold tabular-nums text-gray-900 @2xl:text-xl dark:text-gray-300"
                              data-test-id={`billing-admin-${id}`}
                            >
                              {value}
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-400 @2xl:text-xs dark:text-gray-500">
                              {label}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Transactions — latest invoices across all users */}
                    {adminTab === "transactions" && (
                      adminData.invoices.length === 0 ? (
                        <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-500" data-test-id="billing-admin-transactions-empty">
                          No invoices yet.
                        </p>
                      ) : (
                      <div className="overflow-x-auto" data-test-id="billing-admin-transactions">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                          <thead className="bg-gray-50 dark:bg-white/5">
                            <tr>
                              {["User", "Invoice", "Plan", "Amount", "Status", "Date"].map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-500"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                            {adminData.invoices.slice(0, 25).map((inv) => (
                              <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                <td className="whitespace-nowrap px-4 py-3">
                                  <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-white/10">
                                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-300">
                                      {inv.userName}
                                    </span>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500 dark:text-gray-500">
                                  {inv.invoice_number}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">
                                  <span className="inline-flex rounded-full bg-[#e7f5f2] px-2 py-0.5 text-xs font-semibold capitalize text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]">
                                    {inv.planName}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-300">
                                  ${(parseFloat(inv.total_amount) || 0).toFixed(2)}{" "}
                                  <span className="text-xs uppercase text-gray-400">{inv.currency}</span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      inv.status === "paid"
                                        ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                                        : inv.status === "failed"
                                        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                                        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500 dark:text-gray-500">
                                  {new Date(inv.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      )
                    )}

                    {/* Failed payments */}
                    {adminTab === "failed" && (
                      <div className="space-y-3" data-test-id="billing-admin-failed">
                        {adminData.invoices.filter((i) => i.status === "failed").length === 0 ? (
                          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-500">
                            No failed payments. 🎉
                          </p>
                        ) : (
                          adminData.invoices
                            .filter((i) => i.status === "failed")
                            .map((inv) => (
                              <div
                                key={inv.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-400/20 dark:bg-red-500/5"
                              >
                                <div>
                                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-300">
                                    {inv.userName}
                                  </div>
                                  <div className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                                    {inv.invoice_number} · {inv.planName}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-gray-900 dark:text-gray-300">
                                    ${(parseFloat(inv.total_amount) || 0).toFixed(2)}
                                  </div>
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    {new Date(inv.created_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    {/* Plan distribution */}
                    {adminTab === "plans" && (
                      <div className="space-y-4" data-test-id="billing-admin-plans">
                        {Object.keys(adminData.subscriptionsByPlan).length === 0 ? (
                          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-500">
                            No active subscriptions yet.
                          </p>
                        ) : (
                          Object.entries(adminData.subscriptionsByPlan).map(([slug, count]) => {
                            const total = Math.max(1, adminData.totalSubscribers);
                            const pct = Math.round((count / total) * 100);
                            return (
                              <div key={slug}>
                                <div className="mb-1 flex items-center justify-between text-sm">
                                  <span className="font-semibold capitalize text-gray-900 dark:text-gray-300">
                                    {slug}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-500">
                                    {count} subscriber{count === 1 ? "" : "s"} · {pct}%
                                  </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-primary-500 dark:bg-teal-600"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Billing card (design 1a): one white rounded panel with a pill tab
              bar on top and the section content inside. Payment Information is
              the default tab. Users only — admins manage billing above. */}
          {!isAdmin && (
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.05)] dark:border-white/10 dark:bg-gray-800 dark:shadow-[0_1px_2px_rgba(0,0,0,.3),0_20px_40px_rgba(0,0,0,.4)]">
              <nav
                aria-label="Billing sections"
                className="flex gap-1.5 border-b border-gray-100 p-3 dark:border-white/5"
              >
                {[
                  { id: "payment", label: "Payment Information", short: "Payment Info" },
                  { id: "plans", label: "Plans & Subscriptions", short: "Plans & Subs" },
                  { id: "invoices", label: "Invoice History", short: "Invoices" },
                ].map(({ id, label, short }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    data-test-id={`billing-tab-${id}-btn`}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition-colors @2xl:px-3.5 @2xl:py-2 @2xl:text-[13px] ${
                      activeTab === id
                        ? "bg-[#e7f5f2] font-semibold text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-200"
                    }`}
                  >
                    {/* Short labels while the column is narrow so all three tabs
                        always fit without horizontal scrolling. */}
                    <span className="@2xl:hidden">{short}</span>
                    <span className="hidden @2xl:inline">{label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 @lg:p-6 @2xl:px-10 @2xl:py-10">
                {/* Heading — centered inside the card, per the design. */}
                <div className="mb-5 text-center @2xl:mb-7">
                  <h1 className="text-lg font-bold text-gray-900 @2xl:text-xl dark:text-gray-300">
                    Subscription &amp; Billing
                  </h1>
                  <p className="mt-1 text-xs text-gray-500 @2xl:text-sm dark:text-gray-500">
                    Manage your subscription and payment information
                  </p>
                </div>
              {/* Payment Information Tab */}
              {activeTab === "payment" && (
                <div className="space-y-6 text-left">
                  {/* Current Subscription — a slim row: plan name as a small teal
                      pill, price on the right. */}
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-gray-200 px-4 py-3.5 @lg:px-5 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-300">
                        Current plan
                      </h3>
                      <span className="rounded-full bg-[#e7f5f2] px-2.5 py-0.5 text-xs font-bold capitalize text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]">
                        {currentPlanSlug}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-300">
                        $
                        {livePlans[currentPlanSlug]?.price ??
                          (currentPlanSlug === "basic"
                            ? 9.99
                            : currentPlanSlug === "premium"
                            ? 18
                            : 99)}
                      </span>
                      /month
                    </p>
                  </div>

                  {/* Saved Payment Methods */}
                  <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-4 @lg:p-6">
                    <h2 className="mb-4 text-base font-bold text-gray-900 @2xl:text-lg dark:text-gray-300">
                      Payment Methods
                    </h2>

                    {paymentMethods.length > 0 ? (
                      <div className="space-y-3" data-test-id="billing-payment-methods-list">
                        {paymentMethods.map((pm) => (
                          <div
                            key={pm.id}
                            className="flex items-center justify-between p-4 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5"
                            data-test-id={`billing-payment-method-${pm.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-white dark:bg-white/10 rounded-md shadow-sm">
                                <CreditCard className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-300 capitalize">
                                  {pm.brand} ending in {pm.last_four}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  Expires {String(pm.exp_month).padStart(2, "0")}/{pm.exp_year}
                                </p>
                              </div>
                            </div>
                            {pm.is_default && (
                              <span className="text-xs bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 px-2 py-1 rounded-full font-medium">
                                Default
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8" data-test-id="billing-no-payment-method">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                          <CreditCard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-500 text-sm">
                          No payment method on file. Add one when you subscribe to a plan.
                        </p>
                      </div>
                    )}

                    {/* Extra empty row above the manage button — reserved space
                        for upcoming payment info. */}
                    <div className="mt-24 flex flex-col items-start gap-3 @md:flex-row @md:items-center">
                      <button
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="inline-flex w-full justify-center @md:w-auto items-center gap-2 whitespace-nowrap text-sm font-semibold bg-primary-600 text-white dark:bg-teal-700 dark:text-white px-5 py-2.5 rounded-[10px] hover:bg-primary-700 dark:hover:bg-teal-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        data-test-id="billing-update-payment-btn"
                      >
                        {portalLoading ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                            Opening portal…
                          </>
                        ) : (
                          "Manage Payment Methods"
                        )}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Secured by Stripe — card data never touches our servers
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {/* Plans & Subscriptions Tab */}
              {activeTab === "plans" && (
                <div>
                  {/* Billing Cycle Toggle */}
                  <div className="flex items-center justify-center">
                    <div className="inline-flex gap-0.5 rounded-xl bg-gray-100 p-1 dark:bg-white/5">
                      <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`rounded-lg px-4 py-2 text-[13px] font-medium transition-colors @2xl:px-5 @2xl:text-sm ${
                          billingCycle === "monthly"
                            ? "bg-white font-semibold text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-300 dark:shadow-[0_1px_2px_rgba(0,0,0,.3)]"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-200"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle("yearly")}
                        className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors @2xl:px-5 @2xl:text-sm ${
                          billingCycle === "yearly"
                            ? "bg-white font-semibold text-gray-900 shadow-sm dark:bg-gray-600 dark:text-gray-300 dark:shadow-[0_1px_2px_rgba(0,0,0,.3)]"
                            : "text-gray-500 hover:text-gray-900 dark:text-gray-500 dark:hover:text-gray-200"
                        }`}
                      >
                        Yearly
                        {popularSavings && (
                          <span className="rounded-md bg-[#e7f5f2] px-1.5 py-0.5 text-[10.5px] font-bold text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]">
                            Save ${popularSavings}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Pricing Plans — all three side by side whenever the column
                      allows; on phones they stack as compact summary cards
                      (name + price on one row, dot-separated features). */}
                  <div className="mt-6 grid grid-cols-1 gap-4 text-left @lg:grid-cols-3 @lg:gap-3 @2xl:mt-8 @2xl:gap-5">
                    {plans.map((plan) => {
                      const isCurrent = plan.id === currentPlanSlug;
                      return (
                        <div
                          key={plan.id}
                          className={`relative flex flex-col gap-3 rounded-2xl p-5 @lg:min-h-[440px] @lg:gap-3.5 @lg:p-4 @2xl:min-h-[500px] @2xl:p-6 @4xl:gap-[18px] @4xl:px-6 @4xl:py-7 ${
                            plan.popular
                              ? "border-[1.5px] border-primary-600 bg-[#fbfefd] shadow-[0_12px_32px_rgba(21,132,119,.16)] dark:border-[#2dd4bf] dark:bg-gray-800 dark:shadow-[0_12px_32px_rgba(45,212,191,.15)]"
                              : "border border-gray-200 dark:border-white/10"
                          }`}
                        >
                          {plan.popular && (
                            <span className="absolute -top-3 left-4 whitespace-nowrap rounded-full bg-primary-600 px-3 py-1 text-[10px] font-bold text-white @lg:left-1/2 @lg:-translate-x-1/2 @2xl:px-3.5 @2xl:text-[11px] dark:bg-teal-700 dark:text-white">
                              Most Popular
                            </span>
                          )}

                          {/* Name + price: one row when stacked (phones), name/
                              description block with the price below in columns. */}
                          <div className="flex items-baseline justify-between gap-2 @lg:block">
                            <div>
                              <h3 className="text-base font-bold text-gray-900 @2xl:text-lg dark:text-gray-300">
                                {plan.name}
                              </h3>
                              <p className="mt-1 hidden text-xs text-gray-400 @lg:block @2xl:text-[13px] dark:text-gray-500">
                                {plan.description}
                              </p>
                            </div>
                            <div className="flex items-baseline gap-1 @lg:mt-3.5">
                              <span className="text-xl font-extrabold text-gray-900 @lg:text-2xl @2xl:text-3xl @4xl:text-[34px] dark:text-gray-300">
                                ${getPlanPrice(plan)}
                              </span>
                              <span className="text-[11px] text-gray-400 @2xl:text-[13px] dark:text-gray-500">
                                /{billingCycle === "monthly" ? "month" : "year"}
                              </span>
                            </div>
                          </div>

                          {billingCycle === "yearly" && yearlySavingsAmount(plan) && (
                            <div className="-mt-1 text-xs text-primary-600 dark:text-[#2dd4bf]">
                              Save ${yearlySavingsAmount(plan)} a year vs monthly
                            </div>
                          )}

                          {/* Features: dot-separated line when stacked, check
                              rows in columns. */}
                          <p className="text-xs text-gray-400 @lg:hidden dark:text-gray-500">
                            {plan.features.slice(0, 3).join(" · ")}
                          </p>
                          <ul className="hidden flex-1 flex-col gap-2 text-xs text-gray-700 @lg:flex @2xl:gap-2.5 @2xl:text-[13.5px] dark:text-gray-400">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-600 @2xl:h-4 @2xl:w-4 dark:text-[#2dd4bf]" />
                                {feature}
                              </li>
                            ))}
                          </ul>

                          <button
                            onClick={() => {
                              if (!isCurrent && plan.id !== "basic") {
                                handleUpgrade(plan.id, billingCycle);
                              }
                            }}
                            disabled={isCurrent || plan.id === "basic" || checkoutLoading}
                            className={`w-full rounded-[10px] px-2 py-2.5 text-xs font-semibold transition-colors @lg:mt-auto @2xl:py-3 @2xl:text-[13.5px] ${
                              isCurrent
                                ? "cursor-default bg-[#e7f5f2] text-primary-600 dark:bg-[#2dd4bf]/10 dark:text-[#2dd4bf]"
                                : plan.id === "basic"
                                ? "cursor-not-allowed bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-500"
                                : "bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-70 dark:bg-teal-700 dark:text-white dark:hover:bg-teal-600"
                            }`}
                            data-test-id={`billing-plan-select-${plan.id}-btn`}
                          >
                            {checkoutLoading && selectedPlan === plan.id ? (
                              <span className="flex items-center justify-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-current" />
                                Loading...
                              </span>
                            ) : isCurrent ? (
                              "Current Plan"
                            ) : plan.id === "basic" ? (
                              <>
                                <span className="@lg:hidden">Downgrade</span>
                                <span className="hidden whitespace-nowrap @lg:inline">
                                  {`Downgrade to ${plan.name}`}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="@lg:hidden">Upgrade</span>
                                <span className="hidden whitespace-nowrap @lg:inline">
                                  {`Upgrade to ${plan.name}`}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Invoice History Tab */}
              {activeTab === "invoices" && (
                <div className="space-y-6 text-left">
                  <div className="rounded-2xl border border-gray-200 dark:border-white/10 p-4 @lg:p-6">
                    <div className="flex flex-col gap-3 @lg:flex-row @lg:items-center @lg:justify-between mb-6">
                      <h2 className="text-base font-bold text-gray-900 @2xl:text-lg dark:text-gray-300">
                        Invoice History
                      </h2>
                      <button
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-white/10 rounded-[10px] text-sm font-medium text-gray-700 dark:text-gray-400 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 disabled:opacity-70 disabled:cursor-not-allowed"
                        data-test-id="billing-invoices-portal-btn"
                      >
                        {portalLoading ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
                            Opening…
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Download from Stripe Portal
                          </>
                        )}
                      </button>
                    </div>

                    {/* Invoice Table */}
                    {isLoading ? (
                      <div className="text-center py-12" data-test-id="invoices-loading-spinner">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
                      </div>
                    ) : userInvoices.length > 0 ? (
                      <>
                        {/* Narrow columns (phones, or the squeezed Settings tab):
                            stacked cards instead of a cramped sideways-scrolling table. */}
                        <div className="space-y-3 @2xl:hidden" data-test-id="invoices-list-mobile">
                          {userInvoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="border border-gray-200 dark:border-white/10 rounded-lg p-4"
                              data-test-id={`invoice-card-${inv.id}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-gray-300 truncate">
                                  {inv.invoice_number || inv.stripe_invoice_id || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                                </span>
                                <span
                                  className={`inline-flex flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${
                                    inv.status === "paid"
                                      ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200"
                                      : inv.status === "failed" || inv.status === "void"
                                      ? "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"
                                      : "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
                                  }`}
                                >
                                  {inv.status === "paid" ? "Paid" : inv.status}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center justify-between text-sm">
                                <span className="text-gray-500 dark:text-gray-500">
                                  {new Date(inv.created_at).toLocaleDateString()}
                                </span>
                                <span className="font-medium text-gray-900 dark:text-gray-300">
                                  ${(parseFloat(inv.total_amount) || 0).toFixed(2)}{" "}
                                  <span className="text-xs text-gray-400 uppercase">{inv.currency}</span>
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                Subscription
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Wider columns: the full table. */}
                        <div className="hidden @2xl:block overflow-x-auto" data-test-id="invoices-table">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                            <thead className="bg-gray-50 dark:bg-white/5">
                              <tr>
                                <th className="px-4 @4xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-4 @4xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 @4xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Plan</th>
                                <th className="px-4 @4xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 @4xl:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                              {userInvoices.map((inv) => (
                                <tr
                                  key={inv.id}
                                  className="hover:bg-gray-50 dark:hover:bg-white/5"
                                  data-test-id={`invoice-row-${inv.id}`}
                                >
                                  <td className="px-4 @4xl:px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-300" data-test-id={`invoice-number-${inv.id}`}>
                                      {inv.invoice_number || inv.stripe_invoice_id || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                                    </div>
                                  </td>
                                  <td className="px-4 @4xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                    {new Date(inv.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 @4xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                    Subscription
                                  </td>
                                  <td className="px-4 @4xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300" data-test-id={`invoice-amount-${inv.id}`}>
                                    ${(parseFloat(inv.total_amount) || 0).toFixed(2)}{" "}
                                    <span className="text-xs text-gray-400 uppercase">{inv.currency}</span>
                                  </td>
                                  <td className="px-4 @4xl:px-6 py-4 whitespace-nowrap">
                                    <span
                                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                        inv.status === "paid"
                                          ? "bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200"
                                          : inv.status === "failed" || inv.status === "void"
                                          ? "bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200"
                                          : "bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200"
                                      }`}
                                      data-test-id={`invoice-status-${inv.id}`}
                                    >
                                      {inv.status === "paid" ? "Paid" : inv.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12" data-test-id="invoices-empty-state">
                        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300 mb-2">
                          No invoices yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-500 mb-6">
                          Your invoices will appear here after your first payment.
                        </p>
                        <button
                          onClick={() => setActiveTab("plans")}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 dark:bg-primary-700 hover:bg-primary-700 dark:hover:bg-primary-600"
                        >
                          View Plans
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* Stripe Payment Modal */}
          {showPaymentForm && clientSecret && (() => {
            const modalPlan = plans.find((p) => p.id === selectedPlan);
            return (
            <ModalPortal>
            {/* Centered on screen; scrolls internally on short viewports. */}
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 p-4"
              data-test-id="billing-payment-modal"
            >
              <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-300">
                    Complete Subscription
                  </h3>
                  <button
                    onClick={handlePaymentCancel}
                    className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                    data-test-id="billing-payment-modal-close-btn"
                  >
                    ✕
                  </button>
                </div>

                {/* The price lives here, next to the plan/cycle — not in the button. */}
                <p className="text-sm text-gray-600 dark:text-gray-500 mb-4">
                  Subscribing to the{" "}
                  <span className="font-semibold">{modalPlan?.name ?? selectedPlan}</span>{" "}
                  plan ({billingCycle}) —{" "}
                  <span className="font-semibold text-gray-900 dark:text-gray-300" data-test-id="billing-payment-modal-price">
                    ${paymentMode === "setup" ? 0 : getPlanPrice(modalPlan)}/{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                  .
                  {paymentMode === "setup" && (
                    <span data-test-id="billing-payment-modal-setup-note">
                      {" "}Your coupon covers today&apos;s payment — save a card so the
                      plan renews automatically after the discount ends.
                    </span>
                  )}
                </p>

                <StripePaymentForm
                  clientSecret={clientSecret}
                  mode={paymentMode}
                  submitLabel={paymentMode === "setup" ? "Save card & activate" : "Confirm subscription"}
                  onSuccess={() => {
                    if (paymentMode === "setup") toast.success("Card saved — subscription active!");
                    handlePaymentSuccess();
                  }}
                  onCancel={handlePaymentCancel}
                />
              </div>
            </div>
            </ModalPortal>
            );
          })()}
        </div>
      </div>
    </div>
    </div>
  );
};

export default Billing;
