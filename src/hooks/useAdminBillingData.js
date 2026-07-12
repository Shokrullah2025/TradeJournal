import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// Fetch-cap for the transactions list. Revenue/failed counts are computed over
// this window too — recent-first, so headline numbers cover the latest 500
// invoices (plenty until real volume calls for a server-side aggregate).
const INVOICE_FETCH_CAP = 500;

/**
 * Real admin billing analytics, read straight from the DB under the admin RLS
 * policies (users/user_subscriptions/invoices/user_profiles all allow
 * `is_admin()` SELECT). Replaces the old MOCK_PAYMENTS placeholder data.
 *
 * Pass `enabled=false` for non-admins so no cross-user queries are attempted.
 */
const useAdminBillingData = (enabled) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [staffRes, subsRes, invRes] = await Promise.all([
          // Staff accounts are excluded from customer billing analytics so an
          // admin's own trials/subscriptions never skew revenue or counts.
          supabase.from("users").select("id").in("role", ["admin", "moderator"]),
          supabase
            .from("user_subscriptions")
            .select("id, user_id, status, created_at, subscription_plans(slug, name)")
            .order("created_at", { ascending: false }),
          supabase
            .from("invoices")
            .select("id, user_id, invoice_number, total_amount, currency, status, created_at")
            .order("created_at", { ascending: false })
            .limit(INVOICE_FETCH_CAP),
        ]);
        if (staffRes.error) throw new Error(staffRes.error.message);
        if (subsRes.error) throw new Error(subsRes.error.message);
        if (invRes.error) throw new Error(invRes.error.message);
        const staffIds = new Set((staffRes.data ?? []).map((s) => s.id));
        const subs = (subsRes.data ?? []).filter((s) => !staffIds.has(s.user_id));
        const invoices = (invRes.data ?? []).filter((i) => !staffIds.has(i.user_id));

        // Resolve display names for everyone appearing in either list.
        const userIds = [
          ...new Set([...subs, ...invoices].map((r) => r.user_id).filter(Boolean)),
        ];
        const names = {};
        if (userIds.length > 0) {
          const { data: profiles, error: profError } = await supabase
            .from("user_profiles")
            .select("user_id, first_name, last_name, display_name")
            .in("user_id", userIds);
          if (profError) throw new Error(profError.message);
          for (const p of profiles ?? []) {
            const full = [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
            names[p.user_id] = p.display_name || full || null;
          }
        }

        const liveSubs = subs.filter(
          (s) => s.status === "active" || s.status === "trialing"
        );
        const paidInvoices = invoices.filter((i) => i.status === "paid");
        const totalRevenue = paidInvoices.reduce(
          (sum, i) => sum + (parseFloat(i.total_amount) || 0),
          0
        );
        const payingUsers = new Set(paidInvoices.map((i) => i.user_id)).size;

        const subscriptionsByPlan = {};
        const planByUser = {};
        for (const s of liveSubs) {
          const slug = s.subscription_plans?.slug ?? "unknown";
          subscriptionsByPlan[slug] = (subscriptionsByPlan[slug] || 0) + 1;
          planByUser[s.user_id] = s.subscription_plans?.name ?? slug;
        }

        if (cancelled) return;
        setData({
          totalRevenue,
          totalSubscribers: liveSubs.length,
          averageRevenuePerUser: payingUsers > 0 ? totalRevenue / payingUsers : 0,
          failedCount: invoices.filter((i) => i.status === "failed").length,
          subscriptionsByPlan,
          invoices: invoices.map((i) => ({
            ...i,
            userName: names[i.user_id] || "Unnamed user",
            planName: planByUser[i.user_id] || "—",
          })),
        });
        setError("");
      } catch (err) {
        console.error("useAdminBillingData:", err);
        if (!cancelled) setError("Couldn't load billing data. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, loading, error };
};

export default useAdminBillingData;
