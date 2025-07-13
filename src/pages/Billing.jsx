import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreditCard,
  Check,
  Shield,
  Zap,
  Star,
  Download,
  Calendar,
  DollarSign,
  Users,
  BarChart3,
  TrendingUp,
  AlertCircle,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useBilling } from "../context/BillingContext";
import { billingSchema } from "../utils/validation";
import { toast } from "react-hot-toast";

const Billing = () => {
  const { user, updateUser } = useAuth();
  const {
    processPayment,
    getPaymentsByUser,
    payments,
    getSubscriptionAnalytics,
  } = useBilling();
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [userPayments, setUserPayments] = useState([]);
  const [billingAnalytics, setBillingAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("payment");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      plan: selectedPlan,
      billingCycle: billingCycle,
    },
  });

  // Load user payments on component mount
  useEffect(() => {
    if (user) {
      setUserPayments(getPaymentsByUser(user.id));
      // Load billing analytics for admin users
      if (user.role === "admin") {
        setBillingAnalytics(getSubscriptionAnalytics());
      }
    }
  }, [user, getPaymentsByUser, getSubscriptionAnalytics]);

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

  const onSubmit = async (data) => {
    try {
      const selectedPlanData = plans.find((p) => p.id === selectedPlan);
      const amount = getPlanPrice(selectedPlanData);

      // Process payment through billing context
      const paymentData = {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        amount: amount,
        currency: "USD",
        plan: selectedPlan,
        billingCycle: billingCycle,
        paymentMethod: "card",
        cardLast4: data.cardNumber.slice(-4),
        cardBrand: "visa", // In real app, detect from card number
      };

      await processPayment(paymentData);

      // Update user subscription
      updateUser(user.id, {
        ...user,
        subscription: selectedPlan,
        billingCycle: billingCycle,
      });

      // Refresh user payments
      setUserPayments(getPaymentsByUser(user.id));

      toast.success(
        "Payment processed successfully! Your subscription has been updated."
      );
      setShowPaymentForm(false);
    } catch (error) {
      toast.error("Payment failed. Please try again.");
    }
  };

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
    <div className="flex min-h-screen bg-gray-50">
      {/* Admin Billing Overview Sidebar */}
      {user?.role === "admin" && (
        <div className="w-80 bg-white shadow-lg border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
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
                <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Plan Distribution
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Basic</span>
                      <span className="text-sm font-medium">
                        {billingAnalytics.subscriptionsByPlan.basic}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Premium</span>
                      <span className="text-sm font-medium">
                        {billingAnalytics.subscriptionsByPlan.premium}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Enterprise</span>
                      <span className="text-sm font-medium">
                        {billingAnalytics.subscriptionsByPlan.enterprise}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Payments Preview */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Recent Payments
                  </h3>
                  <div className="space-y-2">
                    {payments.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                            <User className="w-3 h-3 text-gray-500" />
                          </div>
                          <div>
                            <p
                              className="font-medium text-gray-900 truncate"
                              style={{ maxWidth: "120px" }}
                            >
                              {payment.userName}
                            </p>
                            <p className="text-gray-500">
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
      <div className={`flex-1 ${user?.role === "admin" ? "pl-6" : ""} p-6`}>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.role === "admin"
                ? "Billing Management"
                : "Subscription & Billing"}
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              {user?.role === "admin"
                ? "Manage all billing operations and view analytics"
                : "Manage your subscription and payment information"}
            </p>
          </div>

          {/* Current Subscription Status */}
          {user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-blue-900">
                    Current Subscription
                  </h3>
                  <p className="text-blue-700">
                    You're currently on the{" "}
                    <span className="font-semibold capitalize">
                      {user.subscription}
                    </span>{" "}
                    plan
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-900">
                    $
                    {user.subscription === "basic"
                      ? "0"
                      : user.subscription === "premium"
                      ? "29"
                      : "99"}
                  </div>
                  <div className="text-sm text-blue-600">per month</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation - Users Only */}
          {user?.role !== "admin" && (
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("payment")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "payment"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Payment Information
                </button>
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "plans"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Plans & Subscriptions
                </button>
                <button
                  onClick={() => setActiveTab("invoices")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === "invoices"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
                  {/* Credit Card Information Section */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Payment Information
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="•••• •••• •••• 4242"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled
                          />
                          <CreditCard className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Your card information is encrypted and secure
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="•••"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            disabled
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          placeholder={user?.name || "John Doe"}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Billing Address
                        </label>
                        <input
                          type="text"
                          placeholder="123 Main St, City, State 12345"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          disabled
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex space-x-4">
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Update Payment Method
                      </button>
                      <button className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        Download Invoice
                      </button>
                    </div>
                  </div>

                  {/* Payment History */}
                  {userPayments.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Payment History
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
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
                                Next Billing
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userPayments.slice(0, 5).map((payment) => (
                              <tr key={payment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {payment.createdAt.toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                                  {payment.plan} ({payment.billingCycle})
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
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {payment.nextBillingDate?.toLocaleDateString() ||
                                    "N/A"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Plans & Subscriptions Tab */}
              {activeTab === "plans" && (
                <div className="space-y-8">
                  {/* Billing Cycle Toggle */}
                  <div className="flex items-center justify-center">
                    <div className="bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setBillingCycle("monthly")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          billingCycle === "monthly"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle("yearly")}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                          billingCycle === "yearly"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        Yearly
                        <span className="ml-1 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
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
                        className={`relative bg-white rounded-lg shadow-lg border-2 transition-all ${
                          selectedPlan === plan.id
                            ? `border-${plan.color}-500`
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {plan.popular && (
                          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <span className="bg-blue-500 text-white px-4 py-1 text-sm font-medium rounded-full">
                              Most Popular
                            </span>
                          </div>
                        )}

                        <div className="p-6">
                          <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-900">
                              {plan.name}
                            </h3>
                            <p className="mt-2 text-gray-500">
                              {plan.description}
                            </p>

                            <div className="mt-6">
                              <div className="flex items-center justify-center">
                                <span className="text-4xl font-bold text-gray-900">
                                  ${getPlanPrice(plan)}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  /
                                  {billingCycle === "monthly"
                                    ? "month"
                                    : "year"}
                                </span>
                              </div>

                              {billingCycle === "yearly" &&
                                plan.monthlyPrice > 0 && (
                                  <div className="mt-2">
                                    <span className="text-sm text-green-600">
                                      Save {getSavingsPercent(plan)}% vs monthly
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>

                          <ul className="mt-8 space-y-3">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-start">
                                <Check className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="ml-3 text-sm text-gray-700">
                                  {feature}
                                </span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-8">
                            <button
                              onClick={() => {
                                setSelectedPlan(plan.id);
                                if (plan.id !== user?.subscription) {
                                  setShowPaymentForm(true);
                                }
                              }}
                              disabled={plan.id === user?.subscription}
                              className={`w-full py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                                plan.id === user?.subscription
                                  ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                  : selectedPlan === plan.id
                                  ? `bg-${plan.color}-600 text-white hover:bg-${plan.color}-700`
                                  : `border border-${plan.color}-600 text-${plan.color}-600 hover:bg-${plan.color}-50`
                              }`}
                            >
                              {plan.id === user?.subscription
                                ? "Current Plan"
                                : plan.id === "basic"
                                ? "Downgrade to Basic"
                                : "Upgrade to " + plan.name}
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
                  {/* Invoice Overview */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Invoice History
                      </h2>
                      <div className="flex space-x-3">
                        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                          <Download className="w-4 h-4 mr-2" />
                          Download All
                        </button>
                        <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                          <Calendar className="w-4 h-4 mr-2" />
                          Request Invoice
                        </button>
                      </div>
                    </div>

                    {/* Invoice Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-blue-900">
                              Total Paid
                            </p>
                            <p className="text-2xl font-bold text-blue-900">
                              $
                              {userPayments
                                .reduce(
                                  (total, payment) =>
                                    payment.status === "completed"
                                      ? total + payment.amount
                                      : total,
                                  0
                                )
                                .toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Check className="w-6 h-6 text-green-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-green-900">
                              Invoices Paid
                            </p>
                            <p className="text-2xl font-bold text-green-900">
                              {
                                userPayments.filter(
                                  (payment) => payment.status === "completed"
                                ).length
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <Calendar className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              Next Invoice
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                              {userPayments.length > 0 &&
                              userPayments[0].nextBillingDate
                                ? userPayments[0].nextBillingDate.toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Invoice Table */}
                    {userPayments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Invoice #
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {userPayments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    INV-{payment.id.toString().padStart(6, "0")}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {payment.plan.charAt(0).toUpperCase() +
                                      payment.plan.slice(1)}{" "}
                                    Plan
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {payment.createdAt.toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {payment.plan.charAt(0).toUpperCase() +
                                      payment.plan.slice(1)}{" "}
                                    Subscription
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {payment.billingCycle
                                      .charAt(0)
                                      .toUpperCase() +
                                      payment.billingCycle.slice(1)}{" "}
                                    billing
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                                    {payment.status === "completed"
                                      ? "Paid"
                                      : payment.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <button
                                      className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                                      onClick={() => {
                                        // In a real app, this would generate and download the PDF
                                        toast.success(
                                          `Invoice INV-${payment.id
                                            .toString()
                                            .padStart(6, "0")} downloaded`
                                        );
                                      }}
                                    >
                                      <Download className="w-4 h-4 mr-1" />
                                      Download
                                    </button>
                                    {payment.status === "failed" && (
                                      <button className="text-red-600 hover:text-red-900">
                                        Retry Payment
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          No invoices yet
                        </h3>
                        <p className="text-gray-500 mb-6">
                          Your invoices will appear here after your first
                          payment.
                        </p>
                        <button
                          onClick={() => setActiveTab("plans")}
                          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          View Plans
                        </button>
                      </div>
                    )}

                    {/* Invoice Settings */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Invoice Settings
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Email invoices automatically
                            </p>
                            <p className="text-sm text-gray-500">
                              Receive invoices via email when payments are
                              processed
                            </p>
                          </div>
                          <button
                            type="button"
                            className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-blue-600"
                            role="switch"
                            aria-checked="true"
                          >
                            <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Include detailed breakdown
                            </p>
                            <p className="text-sm text-gray-500">
                              Show itemized details on invoices
                            </p>
                          </div>
                          <button
                            type="button"
                            className="relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 bg-gray-200"
                            role="switch"
                            aria-checked="false"
                          >
                            <span className="translate-x-0 pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200"></span>
                          </button>
                        </div>
                      </div>
                    </div>
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

          {/* Payment Form Modal */}
          {showPaymentForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Payment Details
                    </h3>
                    <button
                      onClick={() => setShowPaymentForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      x
                    </button>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <input
                      type="hidden"
                      {...register("plan")}
                      value={selectedPlan}
                    />
                    <input
                      type="hidden"
                      {...register("billingCycle")}
                      value={billingCycle}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Card Number
                      </label>
                      <input
                        {...register("cardNumber")}
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.cardNumber && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.cardNumber.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Expiry Date
                        </label>
                        <input
                          {...register("expiryDate")}
                          type="text"
                          placeholder="MM/YY"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.expiryDate && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.expiryDate.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          CVV
                        </label>
                        <input
                          {...register("cvv")}
                          type="text"
                          placeholder="123"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        {errors.cvv && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.cvv.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Cardholder Name
                      </label>
                      <input
                        {...register("cardholderName")}
                        type="text"
                        placeholder="John Doe"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errors.cardholderName && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.cardholderName.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span>
                        Your payment information is secure and encrypted
                      </span>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          </div>
                        ) : (
                          "Complete Payment"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Features Comparison */}
          <div className="bg-gray-50 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Why Choose Trade Journal Pro?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Advanced Analytics
                </h3>
                <p className="text-gray-600">
                  Get detailed insights into your trading performance with
                  comprehensive analytics and reporting.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Secure & Reliable
                </h3>
                <p className="text-gray-600">
                  Your data is protected with enterprise-grade security and
                  backed up automatically.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Lightning Fast
                </h3>
                <p className="text-gray-600">
                  Experience blazing-fast performance with real-time updates and
                  instant sync across devices.
                </p>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg p-8">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
              Frequently Asked Questions
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Can I change my plan at any time?
                </h3>
                <p className="text-gray-600">
                  Yes, you can upgrade or downgrade your plan at any time.
                  Changes take effect immediately, and you'll be charged or
                  credited proportionally.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Is there a free trial?
                </h3>
                <p className="text-gray-600">
                  Yes, all new users get a 30-day free trial of our Premium
                  plan. No credit card required to start.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-gray-600">
                  We accept all major credit cards (Visa, MasterCard, American
                  Express) and PayPal. Enterprise customers can also pay by
                  invoice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
