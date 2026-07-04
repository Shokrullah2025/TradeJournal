import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Smartphone,
  LogOut,
  KeyRound,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabase";
import { logActivity } from "../../utils/logActivity";
import { changePasswordSchema } from "../../utils/validation";
import { listFactors, unenrollFactor } from "../../utils/mfa";

// ── Shared card / row styling (matches the General & Notifications tabs) ──────
const CARD =
  "rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden";

// Human-readable label for a user_activity_log action.
const ACTION_LABEL = {
  login: "Signed in",
  logout: "Signed out",
  signout_all_devices: "Signed out of all devices",
  password_changed: "Password changed",
};

// Best-effort browser/OS from a user-agent string — enough to recognise a device
// without pulling in a UA-parsing dependency.
const describeDevice = (ua) => {
  if (!ua) return "Unknown device";
  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" : "Browser";
  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS X|Macintosh/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
};

// ── A. Change password ────────────────────────────────────────────────────────
const ChangePasswordSection = () => {
  const { changePassword } = useAuth();
  const [show, setShow] = useState({ current: false, next: false, confirm: false });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
    } catch {
      // Error toast already shown in changePassword.
    }
  };

  const fields = [
    { name: "currentPassword", label: "Current password", key: "current", testid: "security-current-password" },
    { name: "newPassword", label: "New password", key: "next", testid: "security-new-password" },
    { name: "confirmNewPassword", label: "Confirm new password", key: "confirm", testid: "security-confirm-password" },
  ];

  return (
    <section className={CARD}>
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/70">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Change password</h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Use at least 6 characters with an uppercase, a lowercase, and a number.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="px-5 py-4 space-y-4"
        data-testid="security-change-password-form"
      >
        {fields.map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {f.label}
            </label>
            <div className="relative">
              <input
                {...register(f.name)}
                type={show[f.key] ? "text" : "password"}
                autoComplete={f.key === "current" ? "current-password" : "new-password"}
                className="input w-full pr-10"
                data-testid={`${f.testid}-input`}
              />
              <button
                type="button"
                onClick={() => setShow((s) => ({ ...s, [f.key]: !s[f.key] }))}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                aria-label={show[f.key] ? "Hide password" : "Show password"}
                data-testid={`${f.testid}-toggle-btn`}
              >
                {show[f.key]
                  ? <EyeOff className="h-5 w-5 text-gray-400" />
                  : <Eye className="h-5 w-5 text-gray-400" />}
              </button>
            </div>
            {errors[f.name] && (
              <p className="mt-1 text-sm text-danger-600 dark:text-danger-400" data-testid={`${f.testid}-error`}>
                {errors[f.name].message}
              </p>
            )}
          </div>
        ))}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-gradient justify-center"
          data-testid="security-change-password-submit-btn"
        >
          {isSubmitting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" data-testid="security-change-password-spinner" />
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </section>
  );
};

// ── B. Two-factor authentication (TOTP) ────────────────────────────────────────
// Enrollment itself happens in the standalone wizard at /security/2fa (also
// offered right after registration) so the setup UI lives in exactly one
// place. This section only reports status and handles removal.
const TwoFactorSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [factor, setFactor] = useState(null); // verified factor or null
  const [busy, setBusy] = useState(false);

  const refreshFactors = useCallback(async (signal) => {
    const { data, error: listError } = await listFactors();
    if (signal?.cancelled) return;
    if (listError) {
      setError("Couldn't load your two-factor status.");
      setFactor(null);
    } else {
      setError("");
      setFactor(data?.totp?.find((f) => f.status === "verified") ?? null);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    setLoading(true);
    refreshFactors(signal).finally(() => {
      if (!signal.cancelled) setLoading(false);
    });
    return () => { signal.cancelled = true; };
  }, [refreshFactors]);

  const removeFactor = async () => {
    if (!window.confirm("Turn off two-factor authentication for your account?")) return;
    setBusy(true);
    try {
      const { error: removeError } = await unenrollFactor(factor.id);
      if (removeError) {
        toast.error("Couldn't turn off two-factor. Please try again.");
        return;
      }
      logActivity(user?.id, "mfa_unenrolled", {});
      toast.success("Two-factor authentication is off.");
      await refreshFactors();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={CARD} data-testid="security-2fa-section">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/70 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Two-factor authentication</h3>
        </div>
        {!loading && !error && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              factor
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
            }`}
            data-testid="security-2fa-status-badge"
          >
            {factor ? "ON" : "OFF"}
          </span>
        )}
      </header>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-6" data-testid="security-2fa-loading">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-danger-600 dark:text-danger-400" data-testid="security-2fa-error">
            {error}
          </p>
        ) : factor ? (
          // Enabled state
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6" data-testid="security-2fa-enabled">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Enabled</div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  Added {factor.created_at ? format(new Date(factor.created_at), "MMM d, yyyy") : "—"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFactor}
              disabled={busy}
              className="btn btn-secondary text-danger-600 dark:text-danger-400 flex-shrink-0"
              data-testid="security-2fa-remove-btn"
            >
              Remove
            </button>
          </div>
        ) : (
          // Disabled state — enrollment happens in the /security/2fa wizard.
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6" data-testid="security-2fa-disabled">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Add an extra layer of security</div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Require a one-time code from your phone each time you sign in.
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/security/2fa")}
              className="btn btn-gradient flex-shrink-0"
              data-testid="security-2fa-enroll-btn"
            >
              Set up
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

// ── C. Login activity + sign out everywhere ────────────────────────────────────
// Only the last RETENTION_DAYS of history is queried, and only the most recent
// VISIBLE_COUNT rows render by default — "View all" expands to the full
// (retention-window) list.
const ACTIVITY_RETENTION_DAYS = 60;
const ACTIVITY_VISIBLE_COUNT = 10;
const ACTIVITY_FETCH_CAP = 50;

const LoginActivitySection = () => {
  const { user, signOutEverywhere } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const cutoff = new Date(
          Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000
        ).toISOString();
        const { data, error: queryError } = await supabase
          .from("user_activity_log")
          .select("id, action, user_agent, created_at")
          .eq("user_id", user.id) // defense in depth alongside RLS
          .in("action", ["login", "logout", "signout_all_devices"])
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false })
          .limit(ACTIVITY_FETCH_CAP);
        if (cancelled) return;
        if (queryError) {
          setError("Couldn't load your login activity.");
          setRows([]);
        } else {
          setError("");
          setRows(data || []);
        }
      } catch {
        if (!cancelled) setError("Couldn't load your login activity.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const visibleRows = expanded ? rows : rows.slice(0, ACTIVITY_VISIBLE_COUNT);
  const hiddenCount = rows.length - ACTIVITY_VISIBLE_COUNT;

  const handleSignOutAll = async () => {
    if (!window.confirm("Sign out of all devices? You'll need to sign in again everywhere.")) return;
    setSigningOut(true);
    try {
      await signOutEverywhere();
    } catch {
      // Error toast shown in signOutEverywhere.
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section className={CARD}>
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/70">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Login activity</h3>
        </div>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          Sign-ins on your account over the last {ACTIVITY_RETENTION_DAYS} days.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-8" data-testid="security-activity-loading">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <p className="px-5 py-6 text-sm text-danger-600 dark:text-danger-400" data-testid="security-activity-error">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-gray-400" data-testid="security-activity-empty">
          No recent login activity.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-gray-100 dark:divide-gray-700/70" data-testid="security-activity-list">
            {visibleRows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
                data-testid={`security-activity-row-${row.id}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {ACTION_LABEL[row.action] || row.action}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {describeDevice(row.user_agent)}
                  </div>
                </div>
                <time className="text-xs text-gray-400 flex-shrink-0">
                  {row.created_at ? format(new Date(row.created_at), "MMM d, yyyy h:mm a") : ""}
                </time>
              </li>
            ))}
          </ul>
          {hiddenCount > 0 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700/70 text-center">
              <button
                type="button"
                onClick={() => setExpanded((open) => !open)}
                className="text-sm font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400"
                data-testid="security-activity-viewall-btn"
              >
                {expanded
                  ? "Show recent only"
                  : `View all (${rows.length})`}
              </button>
            </div>
          )}
        </>
      )}

      <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700/70">
        <button
          type="button"
          onClick={handleSignOutAll}
          disabled={signingOut}
          className="btn btn-secondary text-danger-600 dark:text-danger-400 flex items-center gap-2"
          data-testid="security-signout-all-btn"
        >
          <LogOut className="w-4 h-4" />
          {signingOut ? "Signing out…" : "Sign out of all devices"}
        </button>
      </div>
    </section>
  );
};

// ── Security tab ───────────────────────────────────────────────────────────────
const SecurityTab = () => (
  <div className="max-w-3xl space-y-6" data-testid="settings-security-panel">
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Security</h2>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        Manage your password, two-factor authentication, and where you're signed in.
      </p>
    </div>

    <ChangePasswordSection />
    <TwoFactorSection />
    <LoginActivitySection />
  </div>
);

export default SecurityTab;
