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
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { invokeFunction } from "../../lib/invokeFunction";
import { logActivity } from "../../utils/logActivity";

// ── Pricing admin panel ────────────────────────────────────────────────────
// Two sub-tabs. "Prices" sets each plan's monthly/annual amount via the
// stripe-admin-set-price edge function (creates a new immutable Stripe Price and
// repoints the plan, so Stripe + DB stay in sync). "Plan details" shows each
// plan read-only and reveals editing/removal behind a ⋮ menu — edits and
// removal touch no Stripe and save straight to the DB under the admin RLS
// policy. Both feed the customer-facing displays through useSubscriptionPlans.

// A real Stripe price id looks like `price_1Ab2Cd...` (alphanumeric). The seed
// placeholders (`price_live_monthly_id`) and nulls fail this, so we can flag a
// plan whose billing isn't wired yet.
const isPriceConfigured = (id) => /^price_[A-Za-z0-9]{8,}$/.test(id || "");

const SUB_TABS = [
  { id: "prices", name: "Prices", icon: DollarSign },
  { id: "details", name: "Plan details", icon: ListChecks },
];

const emptyDetail = { name: "", description: "", features: "" };

const detailFromPlan = (p) => ({
  name: p?.name ?? "",
  description: p?.description ?? "",
  // One feature per line — the simplest thing an operator can edit.
  features: Array.isArray(p?.features) ? p.features.join("\n") : "",
});

const PricingManagement = () => {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("prices");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [priceDrafts, setPriceDrafts] = useState({}); // slug -> { monthly, annual }
  const [detailDrafts, setDetailDrafts] = useState({}); // slug -> { name, description, features }
  const [savingSlug, setSavingSlug] = useState(null);
  // Plan-details interaction state.
  const [editingSlug, setEditingSlug] = useState(null);
  const [menuSlug, setMenuSlug] = useState(null);
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select(
          "slug, name, description, features, price, price_annually, currency, stripe_price_id_monthly, stripe_price_id_annually, sort_order",
        )
        .eq("is_active", true)
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
      // Any in-progress edit/menu is stale after a reload.
      setEditingSlug(null);
      setMenuSlug(null);
      setPendingDeleteSlug(null);
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

  const setPriceDraft = (slug, field, value) => {
    setPriceDrafts((d) => ({ ...d, [slug]: { ...d[slug], [field]: value } }));
  };
  const setDetailDraft = (slug, field, value) => {
    setDetailDrafts((d) => ({ ...d, [slug]: { ...d[slug], [field]: value } }));
  };

  const savePrice = async (plan) => {
    const draft = priceDrafts[plan.slug] || {};
    const monthly = draft.monthly?.trim();
    const annual = draft.annual?.trim();

    if (!monthly && !annual) {
      toast.error("Enter a monthly or annual price first.");
      return;
    }
    // Client-side guard mirrors the edge function so bad input never round-trips.
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
        {
          body: {
            planSlug: plan.slug,
            monthly: monthly || undefined,
            annual: annual || undefined,
          },
        },
        "Could not update the price.",
      );
      logActivity(user?.id, "admin_plan_price_updated", {
        plan: plan.slug,
        monthly: monthly || null,
        annual: annual || null,
      });
      toast.success(`${plan.name} pricing updated`);
      await load();
    } catch (err) {
      console.error("[Pricing] price save error:", err.message);
      toast.error(err.message || "Could not update the price. Please try again.");
    } finally {
      setSavingSlug(null);
    }
  };

  // ── Plan-details actions ──────────────────────────────────────────────────
  const startEdit = (slug) => {
    setMenuSlug(null);
    setPendingDeleteSlug(null);
    setEditingSlug(slug);
  };

  const cancelEdit = (slug) => {
    // Discard unsaved edits by reseeding the draft from the loaded plan.
    const plan = plans.find((p) => p.slug === slug);
    setDetailDrafts((d) => ({ ...d, [slug]: detailFromPlan(plan) }));
    setEditingSlug(null);
  };

  const saveDetails = async (plan) => {
    const draft = detailDrafts[plan.slug] || emptyDetail;
    const name = (draft.name || "").trim();
    if (!name) {
      toast.error("Plan name can't be empty.");
      return;
    }
    const features = (draft.features || "")
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    setSavingSlug(plan.slug);
    try {
      // No Stripe involved — a direct update, allowed by the admin RLS policy.
      const { error } = await supabase
        .from("subscription_plans")
        .update({
          name,
          description: (draft.description || "").trim() || null,
          features,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", plan.slug);
      if (error) throw error;

      logActivity(user?.id, "admin_plan_details_updated", {
        plan: plan.slug,
        features: features.length,
      });
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

  const requestDelete = (slug) => {
    setMenuSlug(null);
    setEditingSlug(null);
    setPendingDeleteSlug(slug);
  };
  const cancelDelete = () => setPendingDeleteSlug(null);

  // "Delete" archives the plan (is_active=false) rather than hard-deleting: a
  // plan may be referenced by invoices/subscriptions, and archiving hides it
  // from every customer surface while preserving billing history. Recoverable
  // by flipping is_active back on in the DB.
  const confirmDelete = async (plan) => {
    setSavingSlug(plan.slug);
    try {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("slug", plan.slug);
      if (error) throw error;
      logActivity(user?.id, "admin_plan_archived", { plan: plan.slug });
      toast.success(`${plan.name} plan removed`);
      setPendingDeleteSlug(null);
      await load();
    } catch (err) {
      console.error("[Pricing] archive error:", err.message);
      toast.error("Could not remove the plan. Confirm you have admin access.");
    } finally {
      setSavingSlug(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-testid="admin-pricing-loading-spinner">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="admin-pricing">
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
        <div
          className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-start gap-2"
          data-testid="admin-pricing-load-error"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Couldn't load plans. Confirm you have admin access and try again.</span>
        </div>
      )}

      {/* Sub-tab navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6" aria-label="Pricing sections">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                data-testid={`admin-pricing-subtab-${tab.id}`}
                className={`${
                  active
                    ? "border-primary-500 text-primary-600 dark:text-primary-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                } whitespace-nowrap py-2.5 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {subTab === "prices" ? (
        <PricesTab
          plans={plans}
          priceDrafts={priceDrafts}
          setPriceDraft={setPriceDraft}
          savePrice={savePrice}
          savingSlug={savingSlug}
        />
      ) : (
        <DetailsTab
          plans={plans}
          detailDrafts={detailDrafts}
          setDetailDraft={setDetailDraft}
          saveDetails={saveDetails}
          savingSlug={savingSlug}
          editingSlug={editingSlug}
          menuSlug={menuSlug}
          setMenuSlug={setMenuSlug}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          pendingDeleteSlug={pendingDeleteSlug}
          requestDelete={requestDelete}
          cancelDelete={cancelDelete}
          confirmDelete={confirmDelete}
        />
      )}
    </div>
  );
};

// ── Prices sub-tab ─────────────────────────────────────────────────────────
const PricesTab = ({ plans, priceDrafts, setPriceDraft, savePrice, savingSlug }) => (
  <>
    <div className="card overflow-x-auto p-0">
      <table className="min-w-[720px] w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Monthly ($)</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Annual ($)</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Stripe status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Save</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {plans.map((plan) => {
            const draft = priceDrafts[plan.slug] || { monthly: "", annual: "" };
            const monthlyReady = isPriceConfigured(plan.stripe_price_id_monthly);
            const annualReady = isPriceConfigured(plan.stripe_price_id_annually);
            return (
              <tr key={plan.slug} data-testid={`admin-pricing-row-${plan.slug}`}>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{plan.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">{plan.currency}</div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={draft.monthly}
                    onChange={(e) => setPriceDraft(plan.slug, "monthly", e.target.value)}
                    placeholder="—"
                    data-testid={`admin-pricing-monthly-input-${plan.slug}`}
                    className="w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={draft.annual}
                    onChange={(e) => setPriceDraft(plan.slug, "annual", e.target.value)}
                    placeholder="—"
                    data-testid={`admin-pricing-annual-input-${plan.slug}`}
                    className="w-40 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-center gap-1 text-xs" data-testid={`admin-pricing-status-${plan.slug}`}>
                    <StatusPill ok={monthlyReady} label="Monthly" />
                    <StatusPill ok={annualReady} label="Annual" />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={savingSlug === plan.slug}
                    onClick={() => savePrice(plan)}
                    data-testid={`admin-pricing-save-${plan.slug}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium btn-gradient focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingSlug === plan.slug ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

    <p className="text-xs text-gray-500 dark:text-gray-400">
      Prices are created in whichever Stripe account your{" "}
      <code className="text-[12px]">STRIPE_SECRET_KEY</code> points to. Make sure
      that key matches your live publishable key before saving, or the new price
      won't be usable at checkout.
    </p>
  </>
);

PricesTab.propTypes = {
  plans: PropTypes.array.isRequired,
  priceDrafts: PropTypes.object.isRequired,
  setPriceDraft: PropTypes.func.isRequired,
  savePrice: PropTypes.func.isRequired,
  savingSlug: PropTypes.string,
};

// ── Plan details sub-tab ───────────────────────────────────────────────────
// Cards are read-only by default; the ⋮ menu reveals Edit / Delete.
const DetailsTab = ({
  plans,
  detailDrafts,
  setDetailDraft,
  saveDetails,
  savingSlug,
  editingSlug,
  menuSlug,
  setMenuSlug,
  startEdit,
  cancelEdit,
  pendingDeleteSlug,
  requestDelete,
  cancelDelete,
  confirmDelete,
}) => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    {plans.map((plan) => {
      const draft = detailDrafts[plan.slug] || emptyDetail;
      const isEditing = editingSlug === plan.slug;
      const isMenuOpen = menuSlug === plan.slug;
      const isConfirmingDelete = pendingDeleteSlug === plan.slug;
      const busy = savingSlug === plan.slug;
      const features = Array.isArray(plan.features) ? plan.features : [];

      return (
        <div
          key={plan.slug}
          className="card p-5 flex flex-col gap-4"
          data-testid={`admin-plan-details-${plan.slug}`}
        >
          {/* Header: slug + ⋮ menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-gray-500">
              <Tag className="w-3.5 h-3.5" />
              {plan.slug}
            </div>
            {!isEditing && !isConfirmingDelete && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuSlug(isMenuOpen ? null : plan.slug);
                  }}
                  data-testid={`admin-plan-menu-btn-${plan.slug}`}
                  aria-label={`${plan.name} actions`}
                  className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {isMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`admin-plan-menu-${plan.slug}`}
                    className="absolute right-0 mt-1 w-32 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg z-10 py-1"
                  >
                    <button
                      type="button"
                      onClick={() => startEdit(plan.slug)}
                      data-testid={`admin-plan-edit-btn-${plan.slug}`}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => requestDelete(plan.slug)}
                      data-testid={`admin-plan-delete-btn-${plan.slug}`}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {isConfirmingDelete ? (
            <div
              className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm flex-1"
              data-testid={`admin-plan-delete-confirm-${plan.slug}`}
            >
              <p className="text-red-700 dark:text-red-300">
                Remove the <strong>{plan.name}</strong> plan? It disappears from
                the app and pricing page. Existing subscribers keep their plan.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => confirmDelete(plan)}
                  data-testid={`admin-plan-delete-yes-${plan.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Yes, remove
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={cancelDelete}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : isEditing ? (
            <>
              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Plan name</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => setDetailDraft(plan.slug, "name", e.target.value)}
                  data-testid={`admin-plan-name-input-${plan.slug}`}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</span>
                <input
                  type="text"
                  value={draft.description}
                  onChange={(e) => setDetailDraft(plan.slug, "description", e.target.value)}
                  data-testid={`admin-plan-description-input-${plan.slug}`}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </label>

              <label className="block flex-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Features — one per line
                </span>
                <textarea
                  rows={7}
                  value={draft.features}
                  onChange={(e) => setDetailDraft(plan.slug, "features", e.target.value)}
                  placeholder={"Unlimited trades\nAdvanced analytics\nPriority support"}
                  data-testid={`admin-plan-features-input-${plan.slug}`}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                />
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => saveDetails(plan)}
                  data-testid={`admin-plan-details-save-${plan.slug}`}
                  className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium btn-gradient focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save details
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => cancelEdit(plan.slug)}
                  data-testid={`admin-plan-details-cancel-${plan.slug}`}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3 flex-1">
              <h4
                className="text-lg font-bold text-gray-900 dark:text-gray-100"
                data-testid={`admin-plan-name-${plan.slug}`}
              >
                {plan.name}
              </h4>
              {plan.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{plan.description}</p>
              )}
              <ul className="space-y-1.5 mt-1" data-testid={`admin-plan-features-${plan.slug}`}>
                {features.length ? (
                  features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" />
                      {f}
                    </li>
                  ))
                ) : (
                  <li className="text-sm italic text-gray-400 dark:text-gray-500">No features yet</li>
                )}
              </ul>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

DetailsTab.propTypes = {
  plans: PropTypes.array.isRequired,
  detailDrafts: PropTypes.object.isRequired,
  setDetailDraft: PropTypes.func.isRequired,
  saveDetails: PropTypes.func.isRequired,
  savingSlug: PropTypes.string,
  editingSlug: PropTypes.string,
  menuSlug: PropTypes.string,
  setMenuSlug: PropTypes.func.isRequired,
  startEdit: PropTypes.func.isRequired,
  cancelEdit: PropTypes.func.isRequired,
  pendingDeleteSlug: PropTypes.string,
  requestDelete: PropTypes.func.isRequired,
  cancelDelete: PropTypes.func.isRequired,
  confirmDelete: PropTypes.func.isRequired,
};

const StatusPill = ({ ok, label }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
      ok
        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
    }`}
  >
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    {label}
  </span>
);

StatusPill.propTypes = {
  ok: PropTypes.bool,
  label: PropTypes.string.isRequired,
};

export default PricingManagement;
