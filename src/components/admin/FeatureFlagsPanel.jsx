import React, { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { Flag, Save, Loader2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useFeatureFlags } from "../../context/FeatureFlagContext";
import { logActivity } from "../../utils/logActivity";
import { AUDIENCES, FEATURE_CATALOG } from "../../lib/featureFlags";

// ── Feature flags admin panel ──────────────────────────────────────────────
// Each row is one feature; each column is a plan (plus Admin). A toggle decides
// whether that plan can load that feature — turn Backtesting off for Starter and
// every Starter sees it locked behind an upgrade prompt. Edits are staged
// locally and saved per row so a misclick never half-writes.
//
// There is deliberately no Trial column: a trial is a free window on a real
// plan, so a trialing Starter is governed by the Starter toggle and a trialing
// Pro by the Pro toggle. A separate Trial switch used to override all of them,
// which is why upgrading mid-trial appeared to do nothing.
//
// There is also no master on/off switch. It only ever duplicated "turn every
// plan off", and an admin who flipped it saw the per-plan grid go dead with no
// explanation. The `enabled` column still exists in the DB as a kill switch and
// is preserved on save; it just isn't editable from here.

const Toggle = ({ checked, disabled, onChange, testId, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    data-test-id={testId}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
      checked ? "bg-primary-600" : "bg-gray-300 dark:bg-gray-600"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? "translate-x-4" : "translate-x-0.5"
      }`}
    />
  </button>
);

Toggle.propTypes = {
  checked: PropTypes.bool,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  testId: PropTypes.string,
  label: PropTypes.string,
};

const FeatureFlagsPanel = () => {
  const { user } = useAuth();
  const { refreshFlags } = useFeatureFlags();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [savingKey, setSavingKey] = useState(null);
  const [dirty, setDirty] = useState({}); // key -> true

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("id, key, name, description, enabled, audiences, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        // Table exists but unseeded — show the catalog defaults read-only.
        setTableMissing(false);
        setRows(
          FEATURE_CATALOG.map((f, i) => ({
            id: null,
            key: f.key,
            name: f.name,
            description: f.description,
            enabled: true,
            audiences: {},
            sort_order: i,
          }))
        );
      } else {
        setTableMissing(false);
        setRows(data);
      }
    } catch (err) {
      console.error("[FeatureFlags] panel load error:", err.message);
      setTableMissing(true);
      setRows(
        FEATURE_CATALOG.map((f, i) => ({
          id: null,
          key: f.key,
          name: f.name,
          description: f.description,
          enabled: true,
          audiences: {},
          sort_order: i,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markDirty = (key) => setDirty((d) => ({ ...d, [key]: true }));

  const setAudience = (key, audienceKey, allowed) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r;
        const audiences = { ...(r.audiences || {}) };
        // Store an explicit false to block; otherwise drop the key (inherit).
        if (allowed) delete audiences[audienceKey];
        else audiences[audienceKey] = false;
        return { ...r, audiences };
      })
    );
    markDirty(key);
  };

  const save = async (row) => {
    setSavingKey(row.key);
    try {
      const payload = {
        key: row.key,
        name: row.name,
        description: row.description,
        enabled: row.enabled,
        audiences: row.audiences || {},
        updated_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from("feature_flags")
        .upsert(payload, { onConflict: "key" });
      if (error) throw error;

      logActivity(user?.id, "admin_feature_flag_updated", { key: row.key, enabled: row.enabled });
      setDirty((d) => {
        const next = { ...d };
        delete next[row.key];
        return next;
      });
      toast.success(`"${row.name}" saved`);
      await refreshFlags();
      await load();
    } catch (err) {
      console.error("[FeatureFlags] save error:", err.message);
      toast.error("Could not save flag. Admin access and the migration are required.");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16" data-test-id="admin-flags-loading-spinner">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-test-id="admin-feature-flags">
      <div className="flex items-start gap-3">
        <Flag className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Feature Access</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose which plans can use each feature. Turning a feature off for a
            plan shows those users a locked preview with an upgrade prompt.
            Trials follow the plan they’re a trial of — a Starter trial gets
            Starter access.
          </p>
        </div>
      </div>

      {tableMissing && (
        <div
          className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 px-4 py-3 text-sm text-warning-700 dark:text-warning-300 flex items-start gap-2"
          data-test-id="admin-flags-table-missing"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Showing catalog defaults. Apply migration{" "}
            <code className="text-[12px]">021_admin_dashboard.sql</code> to enable
            editing and persistence.
          </span>
        </div>
      )}

      {/* pb-2 below sm: the grid is wider than a phone, so the scrollbar sits
          directly under the last row's toggles. Laptops fit it without
          scrolling and need no extra space. */}
      <div className="card overflow-x-auto p-0 pb-2 sm:pb-0">
        <table className="min-w-[760px] w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Feature
              </th>
              {AUDIENCES.map((a) => (
                <th key={a.key} className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {a.label}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Save
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row) => {
              return (
                <tr key={row.key} data-test-id={`admin-flag-row-${row.key}`} className="bg-white dark:bg-gray-800">
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3 max-w-xs">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{row.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.description}</div>
                  </td>
                  {AUDIENCES.map((a) => {
                    const allowed = !((row.audiences || {})[a.key] === false);
                    return (
                      <td key={a.key} className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          <Toggle
                            checked={allowed}
                            disabled={tableMissing}
                            onChange={(v) => setAudience(row.key, a.key, v)}
                            testId={`admin-flag-${row.key}-${a.key}`}
                            label={`${row.name} for ${a.label}`}
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={tableMissing || !dirty[row.key] || savingKey === row.key}
                      onClick={() => save(row)}
                      data-test-id={`admin-flag-save-${row.key}`}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                        dirty[row.key] && !tableMissing
                          ? "btn-gradient"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {savingKey === row.key ? (
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
    </div>
  );
};

export default FeatureFlagsPanel;
