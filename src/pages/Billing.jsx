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

const Billing = () => {
  const { user } = useAuth();
  const {
    payments,
    getSubscriptionAnalytics,
    subscription,
    paymentMethods,
    userInvoices,
    isLoading,
    createCheckoutSession,
    openPortal,
  } = useBilling();
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
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingAnalytics, setBillingAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("payment");

  useEffect(() => {
    if (user?.role === "admin") {
      setBillingAnalytics(getSubscriptionAnalytics());
    }
  }, [user, getSubscriptionAnalytics]);

  const handleUpgrade = async (planSlug, cycle) => {
    setSelectedPlan(planSlug);
    setCheckoutLoading(true);
    try {
      const cs = await createCheckoutSession(planSlug, cycle);
      setClientSecret(cs);
      setShowPaymentForm(true);
    } catch (err) {
      toast.error(err.message || "Failed to initialize checkout. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setClientSecret(null);
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      await openPortal();
    } catch (err) {
      toast.error(err.message || "Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const plans = [
    {
      id: "basic",
      name: "Basic",
      description: "Perfect for individual traders getting started",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        "Up to 50 trades per month",
        "Basic analytics dashboard",
        "Export to CSV",
        "Email support",
        "Mobile app access",
      ],
      color: "gray",
      popular: false,
    },
    {
      id: "premium",
      name: "Premium",
      description: "Best for serious traders and small teams",
      monthlyPrice: 29,
      yearlyPrice: 290,
      features: [
        "Unlimited trades",
        "Advanced analytics & insights",
        "Risk management tools",
        "Custom reports",
        "Priority email support",
        "API access",
        "Real-time sync",
      ],
      color: "blue",
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For trading firms and large organizations",
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: [
        "Everything in Premium",
        "Team management",
        "Advanced security features",
        "Custom integrations",
        "24/7 phone support",
        "Dedicated account manager",
        "Custom training sessions",
        "White-label options",
      ],
      color: "purple",
      popular: false,
    },
  ];

  const getPlanPrice = (plan) => {
    return billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavingsPercent = (plan) => {
    if (plan.monthlyPrice === 0) return 0;
    const monthlyTotal = plan.monthlyPrice * 12;
    const yearlySavings = monthlyTotal - plan.yearlyPrice;
    return Math.round((yearlySavings / monthlyTotal) * 100);
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Admin Billing Overview Sidebar */}
      {user?.role === "admin" && (
        <div className="w-full lg:w-80 bg-white dark:bg-gray-800 shadow-lg border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
              Billing Overview
            </h2>

            {/* Admin Billing Stats */}
            {billingAnalytics && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <DollarSign className="h-8 w-8" />
                    <div className="ml-3">
                      <p className="text-sm opacity-90">Total Revenue</p>
                      <p className="text-2xl font-bold">
                        ${billingAnalytics.totalRevenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-400 to-blue-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <Users className="h-8 w-8" />
                    <div className="ml-3">
                      <p className="text-sm opacity-90">Total Subscribers</p>
                      <p className="text-2xl font-bold">
                        {billingAnalytics.totalSubscribers}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-400 to-purple-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8" />
                    <div className="ml-3">
                      <p className="text-sm opacity-90">Avg Revenue/User</p>
                      <p className="text-2xl font-bold">
                        ${billingAnalytics.averageRevenuePerUser.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-red-400 to-red-600 rounded-lg p-4 text-white">
                  <div className="flex items-center">
                    <AlertCircle className="h-8 w-8" />
                    <div className="ml-3">
                      <p className="text-sm opacity-90">Failed Payments</p>
                      <p className="text-2xl font-bold">
                        {billingAnalytics.failedPayments}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subscription Breakdown */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Plan Distribution
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Basic
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {billingAnalytics.subscriptionsByPlan.basic}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Premium
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {billingAnalytics.subscriptionsByPlan.premium}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Enterprise
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {billingAnalytics.subscriptionsByPlan.enterprise}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Payments Preview */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Recent Payments
                  </h3>
                  <div className="space-y-2">
                    {payments.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mr-2">
                            <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                          </div>
                          <div>
                            <p
                              className="font-medium text-gray-900 dark:text-gray-100 truncate"
                              style={{ maxWidth: "120px" }}
                            >
                              {payment.userName}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                              ${payment.amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            payment.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 ${user?.role === "admin" ? "lg:pl-6" : ""} p-4 lg:p-6`}>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {user?.role === "admin"
                ? "Billing Management"
                : "Subscription & Billing"}
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
              {user?.role === "admin"
                ? "Manage all billing operations and view analytics"
                : "Manage your subscription and payment information"}
            </p>
          </div>

          {/* Trial banner — shown while the subscription is in its free trial. */}
          {subscription?.status === "trialing" && (
            <div
              className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-6"
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
                  onClick={async () => {
                    try {
                      await openPortal();
                    } catch (err) {
                      toast.error(err.message || "Couldn't open the billing portal.");
                    }
                  }}
                  className="py-2 px-4 border border-amber-300 dark:border-amber-600 rounded-md text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                  data-test-id="billing-trial-cancel-btn"
                >
                  Manage or cancel
                </button>
              </div>
            </div>
          )}

          {/* Current Subscription Status — admins only at top; users see it inside the Payment tab */}
          {user?.role === "admin" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200">
                    Current Subscription
                  </h3>
                  <p className="text-blue-700 dark:text-blue-300">
                    You're currently on the{" "}
                    <span className="font-semibold capitalize">
                      {currentPlanSlug}
                    </span>{" "}
                    plan
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                    $
                    {currentPlanSlug === "basic"
                      ? "0"
                      : currentPlanSlug === "premium"
                      ? "29"
                      : "99"}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-300">
                    per month
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation - Users Only */}
          {user?.role !== "admin" && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("payment")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "payment"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  Payment Information
                </button>
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "plans"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  Plans & Subscriptions
                </button>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "invoices"
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  Invoice History
                </button>
              </nav>
            </div>
          )}

          {/* Tab Content - Users Only */}
          {user?.role !== "admin" && (
            <div className="mt-8">
              {/* Payment Information Tab */}
              {activeTab === "payment" && (
                <div className="space-y-8">
                  {/* Current Subscription Status */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-200">
                          Current Subscription
                        </h3>
                        <p className="text-blue-700 dark:text-blue-300">
                          You're currently on the{" "}
                          <span className="font-semibold capitalize">
                            {currentPlanSlug}
                          </span>{" "}
                          plan
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                          $
                          {currentPlanSlug === "basic"
                            ? "0"
                            : currentPlanSlug === "premium"
                            ? "29"
                            : "99"}
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-300">
                          per month
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Saved Payment Methods */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
                      Payment Methods
                    </h2>

                    {paymentMethods.length > 0 ? (
                      <div className="space-y-3" data-test-id="billing-payment-methods-list">
                        {paymentMethods.map((pm) => (
                          <div
                            key={pm.id}
                            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700"
                            data-test-id={`billing-payment-method-${pm.id}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-white dark:bg-gray-600 rounded-md shadow-sm">
                                <CreditCard className="h-5 w-5 text-gray-500 dark:text-gray-300" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                  {pm.brand} ending in {pm.last_four}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Expires {String(pm.exp_month).padStart(2, "0")}/{pm.exp_year}
                                </p>
                              </div>
                            </div>
                            {pm.is_default && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                                Default
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8" data-test-id="billing-no-payment-method">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <CreditCard className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No payment method on file. Add one when you subscribe to a plan.
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex items-center gap-3">
                      <button
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="inline-flex items-center gap-2 bg-blue-600 dark:bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        data-test-id="billing-update-payment-btn"
                      >
                        {portalLoading ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                            Opening portal…
                          </>
                        ) : (
                          "Manage Payment Methods"
                        )}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Secured by Stripe — card data never touches our servers
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {/* Plans & Subscriptions Tab */}
              {activeTab === "plans" && (
                <div className="space-y-8">
                  {/* Billing Cycle Toggle */}
                  <div className="flex items-center justify-center">
                    <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                      <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          billingCycle === "monthly"
                            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle("yearly")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          billingCycle === "yearly"
                            ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm"
                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                        }`}
                      >
                        Yearly
                        <span className="ml-1 text-xs bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
                          Save up to 17%
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Pricing Plans */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 transition-all ${
                          selectedPlan === plan.id
                            ? `border-${plan.color}-500 dark:border-${plan.color}-400`
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-1 text-sm font-medium rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="p-6">
                          <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {plan.name}
                            </h3>
                            <p className="mt-2 text-gray-500 dark:text-gray-400">
                              {plan.description}
                            </p>

                            <div className="mt-6">
                              <div className="flex items-center justify-center">
                                <span className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                                  ${getPlanPrice(plan)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 ml-2">
                                  /
                                  {billingCycle === "monthly"
                                    ? "month"
                                    : "year"}
                                </span>
                              </div>

                              {billingCycle === "yearly" &&
                                plan.monthlyPrice > 0 && (
                                  <div className="mt-2">
                                    <span className="text-sm text-green-600 dark:text-green-400">
                                      Save {getSavingsPercent(plan)}% vs monthly
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>

                          <ul className="mt-8 space-y-3">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <Check className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-8">
                            <button
                              onClick={() => {
                                if (plan.id !== currentPlanSlug && plan.id !== "basic") {
                                  handleUpgrade(plan.id, billingCycle);
                                }
                              }}
                              disabled={
                                plan.id === currentPlanSlug ||
                                plan.id === "basic" ||
                                checkoutLoading
                              }
                              className={`w-full py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                                plan.id === currentPlanSlug || plan.id === "basic"
                                  ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                  : selectedPlan === plan.id
                                  ? `bg-${plan.color}-600 dark:bg-${plan.color}-700 text-white hover:bg-${plan.color}-700 dark:hover:bg-${plan.color}-600`
                                  : `border border-${plan.color}-600 dark:border-${plan.color}-400 text-${plan.color}-600 dark:text-${plan.color}-400 hover:bg-${plan.color}-50 dark:hover:bg-${plan.color}-900/20`
                              }`}
                              data-test-id={`billing-plan-select-${plan.id}-btn`}
                            >
                              {checkoutLoading && selectedPlan === plan.id ? (
                                <span className="flex items-center justify-center gap-2">
                                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                                  Loading...
                                </span>
                              ) : plan.id === currentPlanSlug ? (
                                "Current Plan"
                              ) : plan.id === "basic" ? (
                                "Downgrade to Basic"
                              ) : (
                                "Upgrade to " + plan.name
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoice History Tab */}
              {activeTab === "invoices" && (
                <div className="space-y-8">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Invoice History
                      </h2>
                      <button
                        onClick={handleOpenPortal}
                        disabled={portalLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
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

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Total Paid</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-200" data-test-id="invoices-total-paid">
                              $
                              {userInvoices
                                .filter((inv) => inv.status === "paid")
                                .reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0)
                                .toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-green-900 dark:text-green-200">Invoices Paid</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-200" data-test-id="invoices-paid-count">
                              {userInvoices.filter((inv) => inv.status === "paid").length}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg">
                            <Calendar className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Next Invoice</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100" data-test-id="invoices-next-date">
                              {subscription?.current_period_end
                                ? new Date(subscription.current_period_end).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Table */}
                    {isLoading ? (
                      <div className="text-center py-12" data-test-id="invoices-loading-spinner">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                      </div>
                    ) : userInvoices.length > 0 ? (
                      <div className="overflow-x-auto" data-test-id="invoices-table">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {userInvoices.map((inv) => (
                              <tr
                                key={inv.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                data-test-id={`invoice-row-${inv.id}`}
                              >
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100" data-test-id={`invoice-number-${inv.id}`}>
                                    {inv.invoice_number || inv.stripe_invoice_id || `INV-${inv.id.slice(0, 8).toUpperCase()}`}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                  {new Date(inv.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 capitalize">
                                  {subscription?.subscription_plans?.slug ?? "—"} subscription
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100" data-test-id={`invoice-amount-${inv.id}`}>
                                  ${(parseFloat(inv.total_amount) || 0).toFixed(2)}{" "}
                                  <span className="text-xs text-gray-400 uppercase">{inv.currency}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
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
                    ) : (
                      <div className="text-center py-12" data-test-id="invoices-empty-state">
                        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                          No invoices yet
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">
                          Your invoices will appear here after your first payment.
                        </p>
                        <button
                          onClick={() => setActiveTab("plans")}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600"
                        >
                          View Plans
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin All Payments Table */}
          {user?.role === "admin" && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  All Payment Transactions
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Method
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.slice(0, 15).map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-5 w-5 text-gray-500" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {payment.userName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {payment.userEmail}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                              payment.plan === "premium"
                                ? "bg-blue-100 text-blue-800"
                                : payment.plan === "enterprise"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {payment.plan}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {payment.billingCycle}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payment.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              payment.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : payment.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {payment.status}
                          </span>
                          {payment.failureReason && (
                            <div className="text-xs text-red-600 mt-1">
                              {payment.failureReason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payment.createdAt.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="capitalize">
                              {payment.cardBrand}
                            </span>
                            <span className="ml-1">
                              ****{payment.cardLast4}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stripe Payment Modal */}
          {showPaymentForm && clientSecret && (
            <ModalPortal>
            <div
              className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-75 overflow-y-auto h-full w-full z-[9999]"
              data-test-id="billing-payment-modal"
            >
              <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
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

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Subscribing to the{" "}
                    <span className="font-semibold capitalize">{selectedPlan}</span> plan
                    ({billingCycle}).
                  </p>

                  <StripePaymentForm
                    clientSecret={clientSecret}
                    amount={getPlanPrice(plans.find((p) => p.id === selectedPlan))}
                    onSuccess={handlePaymentSuccess}
                    onCancel={handlePaymentCancel}
                  />
                </div>
              </div>
            </div>
            </ModalPortal>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;
