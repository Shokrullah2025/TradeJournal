import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  DollarSign,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Check,
  Tag,
  ListChecks,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { invokeFunction } from "../../lib/invokeFunction";
import { logActivity } from "../../utils/logActivity";

// ── Pricing admin panel ────────────────────────────────────────────────────
// Two sub-tabs, both card-based and read-only by default with a ⋮ menu:
//  • "Prices"       — monthly/annual amount per plan (saved via the
//                     stripe-admin-set-price edge function). Also adds/removes
//                     plans and toggles their visibility.
//  • "Plan details" — name, description, feature bullets (saved straight to the
//                     DB under the admin RLS policy; no Stripe).
// New plans are created hidden (is_active=false) so a half-configured plan never
// shows to customers; the useSubscriptionPlans hook only surfaces active plans.

const isPriceConfigured = (id) => /^price_[A-Za-z0-9]{8,}$/.test(id || "");

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const SUB_TABS = [
  { id: "prices", name: "Prices", icon: DollarSign },
  { id: "details", name: "Plan details", icon: ListChecks },
];

const emptyDetail = { name: "", description: "", features: "", maxTrades: "0", maxBacktest: "0" };

const detailFromPlan = (p) => ({
  name: p?.name ?? "",
  description: p?.description ?? "",
  features: Array.isArray(p?.features) ? p.features.join("\n") : "",
  // Usage caps — 0 means unlimited (matches the DB convention, see planLimits.js).
  maxTrades: p?.max_trades_per_month != null ? String(p.max_trades_per_month) : "0",
  maxBacktest: p?.max_backtest_sessions != null ? String(p.max_backtest_sessions) : "0",
});

// Parse a usage-cap input into a non-negative integer, or null when invalid.
// Blank counts as 0 (unlimited) so an admin can clear the field to remove a cap.
const parseCap = (v) => {
  const s = (v ?? "").toString().trim();
  if (s === "") return 0;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
};

// "Unlimited" or "50 / mo" style read-out for a cap value.
const capLabel = (v, suffix) => (!v || v <= 0 ? "Unlimited" : `${v}${suffix}`);

// Cards share a responsive grid: equal widths that shrink to fit the admin
// content area, so the Add card stays on the same row instead of wrapping to
// a lonely centered second row when the screen is under ~1330px.
const CARD_ROW = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
const CARD = "card p-5 w-full flex flex-col gap-4";

const PricingManagement = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("prices");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState({});
  const [detailDrafts, setDetailDrafts] = useState({});
  const [savingSlug, setSavingSlug] = useState(null);
  const [editingSlug, setEditingSlug] = useState(null);
  const [menuSlug, setMenuSlug] = useState(null);
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const resetInteraction = () => {
    setEditingSlug(null);
    setMenuSlug(null);
    setPendingDeleteSlug(null);
    setAdding(false);
    setNewName("");
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select(
          "slug, name, description, features, price, price_annually, currency, is_active, stripe_price_id_monthly, stripe_price_id_annually, sort_order, max_trades_per_month, max_backtest_sessions",
        )
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setPlans(data ?? []);

      const seededPrices = {};
      const seededDetails = {};
      (data ?? []).forEach((p) => {
        seededPrices[p.slug] = {
          monthly: p.price != null ? String(p.price) : "",
          annual: p.price_annually != null ? String(p.price_annually) : "",
        };
        seededDetails[p.slug] = detailFromPlan(p);
      });
      setPriceDrafts(seededPrices);
      setDetailDrafts(seededDetails);
      resetInteraction();
    } catch (err) {
      console.error("[Pricing] load error:", err.message);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Close the ⋮ menu on any outside click.
  useEffect(() => {
    if (!menuSlug) return undefined;
    const close = () => setMenuSlug(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuSlug]);

  const switchTab = (id) => {
    resetInteraction();
    setSubTab(id);
  };

  const setPriceDraft = (slug, field, value) =>
    setPriceDrafts((d) => ({ ...d, [slug]: { ...d[slug], [field]: value } }));
  const setDetailDraft = (slug, field, value) =>
    setDetailDrafts((d) => ({ ...d, [slug]: { ...d[slug], [field]: value } }));

  // ── Price save (Stripe-backed) ────────────────────────────────────────────
  const savePrice = async (plan) => {
    const draft = priceDrafts[plan.slug] || {};
    const monthly = draft.monthly?.trim();
    const annual = draft.annual?.trim();
    if (!monthly && !annual) {
      toast.error("Enter a monthly or annual price first.");
      return;
    }
    for (const [label, val] of [["Monthly", monthly], ["Annual", annual]]) {
      if (val && !(Number(val) >= 0.5 && Number(val) <= 100000)) {
        toast.error(`${label} price must be a number between $0.50 and $100,000.`);
        return;
      }
    }
    setSavingSlug(plan.slug);
    try {
      await invokeFunction(
        "stripe-admin-set-price",
        { body: { planSlug: plan.slug, monthly: monthly || undefined, annual: annual || undefined } },
        "Could not update the price.",
      );
      logActivity(user?.id, "admin_plan_price_updated", { plan: plan.slug, monthly: monthly || null, annual: annual || null });
      toast.success(`${plan.name} pricing updated`);
      setEditingSlug(null);
      await load();
    } catch (err) {
      console.error("[Pricing] price save error:", err.message);
      toast.error(err.message || "Could not update the price. Please try again.");
    } finally {
      setSavingSlug(null);
    }
  };

  // ── Details save (direct DB) ──────────────────────────────────────────────
  const saveDetails = async (plan) => {
    const draft = detailDrafts[plan.slug] || emptyDetail;
    const name = (draft.name || "").trim();
    if (!name) {
      toast.error("Plan name can't be empty.");
      return;
    }
    const features = (draft.features || "").split("\n").map((f) => f.trim()).filter(Boolean);
    const maxTrades = parseCap(draft.maxTrades);
    const maxBacktest = parseCap(draft.maxBacktest);
    if (maxTrades === null || maxBacktest === null) {
      toast.error("Usage limits must be whole numbers of 0 or more (0 = unlimited).");
      return;
    }
    setSavingSlug(plan.slug);
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name,
          description: (draft.description || "").trim() || null,
          features,
          max_trades_per_month: maxTrades,
          max_backtest_sessions: maxBacktest,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", plan.slug);
      if (error) throw error;
      logActivity(user?.id, "admin_plan_details_updated", { plan: plan.slug, features: features.length, maxTrades, maxBacktest });
      toast.success(`${name} details updated`);
      setEditingSlug(null);
      await load();
    } catch (err) {
      console.error("[Pricing] details save error:", err.message);
      toast.error("Could not save. Confirm you have admin access and try again.");
    } finally {
      setSavingSlug(null);
    }
  };

  // ── Card actions ──────────────────────────────────────────────────────────
  const startEdit = (slug) => {
    setMenuSlug(null);
    setPendingDeleteSlug(null);
    setEditingSlug(slug);
  };
  const cancelEdit = (slug) => {
    const plan = plans.find((p) => p.slug === slug);
    setDetailDrafts((d) => ({ ...d, [slug]: detailFromPlan(plan) }));
    setPriceDrafts((d) => ({
      ...d,
      [slug]: {
        monthly: plan?.price != null ? String(plan.price) : "",
        annual: plan?.price_annually != null ? String(plan.price_annually) : "",
      },
    }));
    setEditingSlug(null);
  };

  const togglePublish = async (plan) => {
    setMenuSlug(null);
    setSavingSlug(plan.slug);
    try {
      const next = !plan.is_active;
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: next, updated_at: new Date().toISOString() })
        .eq("slug", plan.slug);
      if (error) throw error;
      logActivity(user?.id, next ? "admin_plan_published" : "admin_plan_hidden", { plan: plan.slug });
      toast.success(`${plan.name} ${next ? "published" : "hidden"}`);
      await load();
    } catch (err) {
      console.error("[Pricing] visibility error:", err.message);
      toast.error("Could not update visibility.");
    } finally {
      setSavingSlug(null);
    }
  };

  const requestDelete = (slug) => {
    setMenuSlug(null);
    setEditingSlug(null);
    setPendingDeleteSlug(slug);
  };
  const cancelDelete = () => setPendingDeleteSlug(null);

  // Hard-delete when possible; a plan referenced by subscriptions/invoices can't
  // be deleted (FK 23503) so we hide it instead and say so.
  const confirmDelete = async (plan) => {
    setSavingSlug(plan.slug);
    try {
      const { error } = await supabase.from("subscription_plans").delete().eq("slug", plan.slug);
      if (error) {
        if (error.code === "23503") {
          const { error: hideErr } = await supabase
            .from("subscription_plans")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("slug", plan.slug);
          if (hideErr) throw hideErr;
          logActivity(user?.id, "admin_plan_hidden", { plan: plan.slug, reason: "delete_blocked" });
          toast("Plan has billing history — hidden instead of deleted.", { icon: "🙈" });
          setPendingDeleteSlug(null);
          await load();
          return;
        }
        throw error;
      }
      logActivity(user?.id, "admin_plan_deleted", { plan: plan.slug });
      toast.success(`${plan.name} plan deleted`);
      setPendingDeleteSlug(null);
      await load();
    } catch (err) {
      console.error("[Pricing] delete error:", err.message);
      toast.error("Could not remove the plan. Confirm you have admin access.");
    } finally {
      setSavingSlug(null);
    }
  };

  // ── Add plan ──────────────────────────────────────────────────────────────
  const createPlan = async () => {
    const name = newName.trim();
    if (!name) {
      toast.error("Enter a plan name.");
      return;
    }
    const slug = slugify(name);
    if (!slug) {
      toast.error("Please use letters or numbers in the name.");
      return;
    }
    const nextSort = plans.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0) + 1;
    setSavingSlug("__new__");
    try {
      const { error } = await supabase.from("subscription_plans").insert({
        slug,
        name,
        description: null,
        features: [],
        price: 0,
        currency: "usd",
        billing_cycle: "monthly",
        max_trades_per_month: 0, // 0 = unlimited; tighten per-plan in Plan details
        max_backtest_sessions: 0,
        max_accounts: 10,
        is_active: false, // created hidden — configure, then publish
        sort_order: nextSort,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error("A plan with a similar name already exists.");
          return;
        }
        throw error;
      }
      logActivity(user?.id, "admin_plan_created", { plan: slug });
      toast.success(`${name} added (hidden). Set a price, then publish it.`);
      setAdding(false);
      setNewName("");
      await load();
    } catch (err) {
      console.error("[Pricing] create error:", err.message);
      toast.error("Could not add the plan. Confirm you have admin access.");
    } finally {
      setSavingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-test-id="admin-pricing-loading-spinner">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  const cardActions = {
    editingSlug, menuSlug, setMenuSlug, pendingDeleteSlug,
    startEdit, cancelEdit, requestDelete, cancelDelete, confirmDelete,
    togglePublish, savingSlug,
  };

  return (
    <div className="space-y-4" data-test-id="admin-pricing">
      <div className="flex items-start gap-3">
        <DollarSign className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Plan Pricing</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control what each plan charges and how it appears on the pricing
            cards. Changes here update both the app and the marketing page.
          </p>
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2" data-test-id="admin-pricing-load-error">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Couldn't load plans. Confirm you have admin access and try again.</span>
        </div>
      )}

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Pricing sections">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            const btn = (
              <button
                type="button"
                onClick={() => switchTab(tab.id)}
                data-test-id={`admin-pricing-subtab-${tab.id}`}
                className={`${active ? "border-primary-500 text-primary-600 dark:text-primary-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"} whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
            if (tab.id !== "prices") return <React.Fragment key={tab.id}>{btn}</React.Fragment>;
            return (
              <div key={tab.id} className="flex items-center gap-1.5">
                {btn}
                <span className="relative group inline-flex items-center" data-test-id="admin-prices-info">
                  <Info className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 cursor-help" tabIndex={0} aria-label="About prices" />
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-64 rounded-md bg-gray-900 text-gray-100 text-xs leading-relaxed px-3 py-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-lg"
                  >
                    Prices are created in whichever Stripe account your{" "}
                    <code className="text-[11px] text-gray-300">STRIPE_SECRET_KEY</code>{" "}
                    points to. New plans start hidden — set a price, then publish to
                    show them.
                  </span>
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      {subTab === "prices" ? (
        <div className={CARD_ROW}>
          {plans.map((plan) => (
            <PriceCard
              key={plan.slug}
              plan={plan}
              draft={priceDrafts[plan.slug] || { monthly: "", annual: "" }}
              setPriceDraft={setPriceDraft}
              savePrice={savePrice}
              {...cardActions}
            />
          ))}
          <AddCard
            adding={adding}
            newName={newName}
            setNewName={setNewName}
            onStart={() => { setAdding(true); setNewName(""); }}
            onCancel={() => { setAdding(false); setNewName(""); }}
            onCreate={createPlan}
            creating={savingSlug === "__new__"}
          />
        </div>
      ) : (
        <div className={CARD_ROW}>
          {plans.map((plan) => (
            <DetailCard
              key={plan.slug}
              plan={plan}
              draft={detailDrafts[plan.slug] || emptyDetail}
              setDetailDraft={setDetailDraft}
              saveDetails={saveDetails}
              {...cardActions}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Shared bits ─────────────────────────────────────────────────────────────
const StatusPill = ({ ok, label }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${ok ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"}`}>
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    {label}
  </span>
);
StatusPill.propTypes = { ok: PropTypes.bool, label: PropTypes.string.isRequired };

const CardHeader = ({ plan, busy, menuSlug, setMenuSlug, startEdit, requestDelete, togglePublish }) => {
  const isMenuOpen = menuSlug === plan.slug;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <Tag className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500 truncate">{plan.slug}</span>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${plan.is_active ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
          {plan.is_active ? "Live" : "Hidden"}
        </span>
      </div>
      <div className="relative">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMenuSlug(isMenuOpen ? null : plan.slug); }}
          disabled={busy}
          data-test-id={`admin-plan-menu-btn-${plan.slug}`}
          aria-label={`${plan.name} actions`}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}
        </button>
        {isMenuOpen && (
          <div onClick={(e) => e.stopPropagation()} data-test-id={`admin-plan-menu-${plan.slug}`} className="absolute right-0 mt-1 w-36 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-10 py-1">
            <button type="button" onClick={() => startEdit(plan.slug)} data-test-id={`admin-plan-edit-btn-${plan.slug}`} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button type="button" onClick={() => togglePublish(plan)} data-test-id={`admin-plan-visibility-btn-${plan.slug}`} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
              {plan.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {plan.is_active ? "Hide" : "Publish"}
            </button>
            <button type="button" onClick={() => requestDelete(plan.slug)} data-test-id={`admin-plan-delete-btn-${plan.slug}`} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
CardHeader.propTypes = {
  plan: PropTypes.object.isRequired,
  busy: PropTypes.bool,
  menuSlug: PropTypes.string,
  setMenuSlug: PropTypes.func.isRequired,
  startEdit: PropTypes.func.isRequired,
  requestDelete: PropTypes.func.isRequired,
  togglePublish: PropTypes.func.isRequired,
};

const DeleteConfirm = ({ plan, busy, onConfirm, onCancel }) => (
  <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm flex-1" data-test-id={`admin-plan-delete-confirm-${plan.slug}`}>
    <p className="text-red-700 dark:text-red-300">
      Delete the <strong>{plan.name}</strong> plan? It disappears from the app and
      pricing page. If it has active subscriptions it's hidden instead.
    </p>
    <div className="mt-3 flex gap-2">
      <button type="button" disabled={busy} onClick={() => onConfirm(plan)} data-test-id={`admin-plan-delete-yes-${plan.slug}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Yes, delete
      </button>
      <button type="button" disabled={busy} onClick={onCancel} className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60">Cancel</button>
    </div>
  </div>
);
DeleteConfirm.propTypes = { plan: PropTypes.object.isRequired, busy: PropTypes.bool, onConfirm: PropTypes.func.isRequired, onCancel: PropTypes.func.isRequired };

const priceLabel = (v, suffix) => {
  if (v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? `$${n}${suffix}` : "—";
};

// ── Price card ────────────────────────────────────────────────────────────
const PriceCard = ({ plan, draft, setPriceDraft, savePrice, editingSlug, pendingDeleteSlug, savingSlug, ...actions }) => {
  const isEditing = editingSlug === plan.slug;
  const isConfirmingDelete = pendingDeleteSlug === plan.slug;
  const busy = savingSlug === plan.slug;

  return (
    <div className={CARD} data-test-id={`admin-price-card-${plan.slug}`}>
      {!isEditing && !isConfirmingDelete && (
        <CardHeader plan={plan} busy={busy} startEdit={actions.startEdit} requestDelete={actions.requestDelete} togglePublish={actions.togglePublish} menuSlug={actions.menuSlug} setMenuSlug={actions.setMenuSlug} />
      )}

      {isConfirmingDelete ? (
        <DeleteConfirm plan={plan} busy={busy} onConfirm={actions.confirmDelete} onCancel={actions.cancelDelete} />
      ) : isEditing ? (
        <div className="flex flex-col gap-3 flex-1">
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{plan.name}</h4>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Monthly ($)</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={draft.monthly} onChange={(e) => setPriceDraft(plan.slug, "monthly", e.target.value)} placeholder="—" data-test-id={`admin-pricing-monthly-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Annual ($)</span>
            <input type="number" min="0" step="0.01" inputMode="decimal" value={draft.annual} onChange={(e) => setPriceDraft(plan.slug, "annual", e.target.value)} placeholder="—" data-test-id={`admin-pricing-annual-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => savePrice(plan)} data-test-id={`admin-pricing-save-${plan.slug}`} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium btn-gradient focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
            </button>
            <button type="button" disabled={busy} onClick={() => actions.cancelEdit(plan.slug)} data-test-id={`admin-pricing-cancel-${plan.slug}`} className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-100" data-test-id={`admin-price-name-${plan.slug}`}>{plan.name}</h4>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-test-id={`admin-price-monthly-${plan.slug}`}>{priceLabel(plan.price, "")}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">/mo</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Annual: <span className="font-medium text-gray-700 dark:text-gray-300">{priceLabel(plan.price_annually, "")}</span>{plan.price_annually != null ? "/yr" : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1" data-test-id={`admin-price-status-${plan.slug}`}>
            <StatusPill ok={isPriceConfigured(plan.stripe_price_id_monthly)} label="Monthly" />
            <StatusPill ok={isPriceConfigured(plan.stripe_price_id_annually)} label="Annual" />
          </div>
        </div>
      )}
    </div>
  );
};
PriceCard.propTypes = {
  plan: PropTypes.object.isRequired,
  draft: PropTypes.object.isRequired,
  setPriceDraft: PropTypes.func.isRequired,
  savePrice: PropTypes.func.isRequired,
  editingSlug: PropTypes.string,
  pendingDeleteSlug: PropTypes.string,
  savingSlug: PropTypes.string,
};

// ── Detail card ───────────────────────────────────────────────────────────
const DetailCard = ({ plan, draft, setDetailDraft, saveDetails, editingSlug, pendingDeleteSlug, savingSlug, ...actions }) => {
  const isEditing = editingSlug === plan.slug;
  const isConfirmingDelete = pendingDeleteSlug === plan.slug;
  const busy = savingSlug === plan.slug;
  const features = Array.isArray(plan.features) ? plan.features : [];

  return (
    <div className={CARD} data-test-id={`admin-plan-details-${plan.slug}`}>
      {!isEditing && !isConfirmingDelete && (
        <CardHeader plan={plan} busy={busy} startEdit={actions.startEdit} requestDelete={actions.requestDelete} togglePublish={actions.togglePublish} menuSlug={actions.menuSlug} setMenuSlug={actions.setMenuSlug} />
      )}

      {isConfirmingDelete ? (
        <DeleteConfirm plan={plan} busy={busy} onConfirm={actions.confirmDelete} onCancel={actions.cancelDelete} />
      ) : isEditing ? (
        <>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan name</span>
            <input type="text" value={draft.name} onChange={(e) => setDetailDraft(plan.slug, "name", e.target.value)} data-test-id={`admin-plan-name-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
            <input type="text" value={draft.description} onChange={(e) => setDetailDraft(plan.slug, "description", e.target.value)} data-test-id={`admin-plan-description-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </label>
          <label className="block flex-1">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Features — one per line</span>
            <textarea rows={6} value={draft.features} onChange={(e) => setDetailDraft(plan.slug, "features", e.target.value)} placeholder={"Unlimited trades\nAdvanced analytics\nPriority support"} data-test-id={`admin-plan-features-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y" />
          </label>

          {/* Usage limits — the numeric caps enforced by usePlanLimits + the DB
              triggers. 0 = unlimited; when a user on this plan hits a cap the
              PlanLimitModal prompts them to upgrade to the next tier up. */}
          <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Usage limits</span>
              <span className="text-[11px] text-gray-400 dark:text-gray-500">— 0 = unlimited</span>
            </div>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Manual trades / month</span>
              <input type="number" min="0" step="1" inputMode="numeric" value={draft.maxTrades} onChange={(e) => setDetailDraft(plan.slug, "maxTrades", e.target.value)} placeholder="0" data-test-id={`admin-plan-max-trades-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Saved backtest sessions</span>
              <input type="number" min="0" step="1" inputMode="numeric" value={draft.maxBacktest} onChange={(e) => setDetailDraft(plan.slug, "maxBacktest", e.target.value)} placeholder="0" data-test-id={`admin-plan-max-backtest-input-${plan.slug}`} className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </label>
          </div>

          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => saveDetails(plan)} data-test-id={`admin-plan-details-save-${plan.slug}`} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium btn-gradient focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save details
            </button>
            <button type="button" disabled={busy} onClick={() => actions.cancelEdit(plan.slug)} data-test-id={`admin-plan-details-cancel-${plan.slug}`} className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60">Cancel</button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100" data-test-id={`admin-plan-name-${plan.slug}`}>{plan.name}</h4>
          {plan.description && <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>}
          <ul className="space-y-1.5 mt-1" data-test-id={`admin-plan-features-${plan.slug}`}>
            {features.length ? features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" />{f}
              </li>
            )) : <li className="text-sm italic text-gray-400 dark:text-gray-500">No features yet</li>}
          </ul>

          {/* Usage limits read-out — what this plan actually enforces. */}
          <div className="mt-auto flex flex-wrap gap-2 pt-2" data-test-id={`admin-plan-limits-${plan.slug}`}>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700/60 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300" data-test-id={`admin-plan-limit-trades-${plan.slug}`}>
              <span className="text-gray-400 dark:text-gray-500">Trades/mo:</span>
              <span className="font-semibold">{capLabel(plan.max_trades_per_month, "")}</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700/60 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300" data-test-id={`admin-plan-limit-backtest-${plan.slug}`}>
              <span className="text-gray-400 dark:text-gray-500">Backtests:</span>
              <span className="font-semibold">{capLabel(plan.max_backtest_sessions, "")}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
DetailCard.propTypes = {
  plan: PropTypes.object.isRequired,
  draft: PropTypes.object.isRequired,
  setDetailDraft: PropTypes.func.isRequired,
  saveDetails: PropTypes.func.isRequired,
  editingSlug: PropTypes.string,
  pendingDeleteSlug: PropTypes.string,
  savingSlug: PropTypes.string,
};

// ── Add-plan card ─────────────────────────────────────────────────────────
const AddCard = ({ adding, newName, setNewName, onStart, onCancel, onCreate, creating }) => {
  if (!adding) {
    return (
      <button
        type="button"
        onClick={onStart}
        data-test-id="admin-plan-add-btn"
        className="w-full min-h-[180px] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <Plus className="w-6 h-6" />
        <span className="text-sm font-medium">Add plan</span>
      </button>
    );
  }
  return (
    <div className={CARD} data-test-id="admin-plan-add-form">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">New plan</span>
      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan name</span>
        <input
          type="text"
          autoFocus
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onCreate(); }}
          placeholder="e.g. Team"
          data-test-id="admin-plan-add-name-input"
          className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </label>
      <p className="text-xs text-gray-400 dark:text-gray-500">Starts hidden — set a price and details, then publish.</p>
      <div className="flex gap-2 mt-auto">
        <button type="button" disabled={creating} onClick={onCreate} data-test-id="admin-plan-add-create-btn" className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium btn-gradient focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed">
          {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
        </button>
        <button type="button" disabled={creating} onClick={onCancel} className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60">Cancel</button>
      </div>
    </div>
  );
};
AddCard.propTypes = {
  adding: PropTypes.bool,
  newName: PropTypes.string,
  setNewName: PropTypes.func.isRequired,
  onStart: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  creating: PropTypes.bool,
};

export default PricingManagement;
