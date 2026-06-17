import React, { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { DollarSign, CreditCard, RefreshCw, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import AdminStatCard from "./AdminStatCard";

// ── Billing overview ───────────────────────────────────────────────────────
// Subscription mix by plan, recent revenue and the latest invoices. All reads
// are admin-scoped by RLS on user_subscriptions / invoices / subscription_plans.

const PLAN_COLORS = ["#3b82f6", "#10b981", "#6366f1", "#f59e0b", "#ef4444", "#8b5cf6"];

// Theme-aware tooltip so it stays legible on the dark card.
const tooltipStyle = {
  backgroundColor: "var(--toast-bg, #fff)",
  color: "var(--toast-color, #111827)",
  border: "1px solid var(--toast-border, #e5e7eb)",
  borderRadius: 8,
  fontSize: 12,
};
const tooltipItemStyle = { color: "var(--toast-color, #111827)" };

const INVOICE_BADGE = {
  paid: "bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-300",
  sent: "bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300",
  draft: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  failed: "bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-300",
  refunded: "bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-300",
};

const BillingOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [planMix, setPlanMix] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [totals, setTotals] = useState({ activeSubs: 0, revenue30d: 0, mrr: 0 });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
        const [subsRes, plansRes, invoicesRes, recentInvRes] = await Promise.all([
          supabase
            .from("user_subscriptions")
            .select("plan_id, status")
            .eq("status", "active"),
          supabase.from("subscription_plans").select("id, name, price"),
          supabase.from("invoices").select("total_amount, paid_at").eq("status", "paid").gte("paid_at", since30),
          supabase
            .from("invoices")
            .select("id, invoice_number, status, total_amount, currency, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        if (cancelled) return;

        if ([subsRes, plansRes, invoicesRes, recentInvRes].some((r) => r.error)) {
          console.error("[BillingOverview] query error:", [subsRes, plansRes, invoicesRes, recentInvRes].find((r) => r.error)?.error?.message);
          setError("Some billing data could not be loaded. Figures may be incomplete.");
        }

        const plans = plansRes.data ?? [];
        const planById = Object.fromEntries(plans.map((p) => [p.id, p]));
        const counts = {};
        let mrr = 0;
        (subsRes.data ?? []).forEach((s) => {
          const plan = planById[s.plan_id];
          const label = plan?.name ?? "Unknown";
          counts[label] = (counts[label] || 0) + 1;
          mrr += Number(plan?.price || 0);
        });

        setPlanMix(Object.entries(counts).map(([name, value]) => ({ name, value })));
        setInvoices(recentInvRes.data ?? []);
        setTotals({
          activeSubs: subsRes.data?.length ?? 0,
          revenue30d: (invoicesRes.data ?? []).reduce((s, i) => s + Number(i.total_amount || 0), 0),
          mrr,
        });
      } catch (err) {
        console.error("[BillingOverview] load error:", err.message);
        if (!cancelled) setError("Could not load billing data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const money = (n) =>
    Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="admin-billing-loading-spinner">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-billing-overview">
      {error && (
        <div
          className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-4 py-3 text-sm text-warning-700 dark:text-warning-300"
          data-testid="admin-billing-error"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AdminStatCard title="Active Subscriptions" value={totals.activeSubs} icon={CreditCard} tone="primary" testId="admin-billing-active-subs" />
        <AdminStatCard title="Est. MRR" value={money(totals.mrr)} icon={RefreshCw} tone="success" hint="sum of active plan prices" testId="admin-billing-mrr" />
        <AdminStatCard title="Revenue (30d)" value={money(totals.revenue30d)} icon={DollarSign} tone="success" hint="paid invoices" testId="admin-billing-revenue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card" data-testid="admin-billing-plan-mix">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Subscription Mix</h3>
          {planMix.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">No active subscriptions.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {planMix.map((entry, i) => (
                      <Cell key={entry.name} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipItemStyle} itemStyle={tooltipItemStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card" data-testid="admin-billing-invoices">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" /> Recent Invoices
          </h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between py-2.5" data-testid={`admin-invoice-row-${inv.id}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{inv.invoice_number}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(inv.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${INVOICE_BADGE[inv.status] ?? INVOICE_BADGE.draft}`}>
                      {inv.status}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                      {money(inv.total_amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillingOverview;
