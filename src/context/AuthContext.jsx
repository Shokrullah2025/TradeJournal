import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { logActivity } from "../utils/logActivity";
import { emitNotification } from "../utils/notifications";
import { validateAdminUserUpdate } from "../lib/schemas/adminUser";
import { getAal, listFactors, challengeAndVerify } from "../utils/mfa";
import { withTimeout } from "../utils/withTimeout";

// How long a single auth-bootstrap network call may block the loading screen
// before we proceed with a fallback. Generous enough for slow connections;
// a stalled request must never leave the app spinning forever.
const AUTH_CALL_TIMEOUT_MS = 8000;

// Fire-and-forget security notification on sign-in. Fetches the user's channel
// prefs so the email decision is honored, then emits. Never blocks login.
const notifyNewLogin = (userId) => {
  if (!userId) return;
  supabase
    .from("user_profiles")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle()
    .then(({ data }) => {
      emitNotification({
        userId,
        prefs: data?.preferences?.notifications,
        record: {
          category: "security",
          event_type: "new_login",
          title: "New sign-in to your account",
          body: `A new sign-in was detected on ${new Date().toLocaleString()}.`,
          severity: "info",
          // Informational only — no actionable destination, so it must not
          // navigate (clicking just marks it read). Only "proper" actionable
          // notifications (broker reconnect, milestones, etc.) carry a link_to.
        },
      });
    });
};

// ── State ──────────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  // True when the signed-in session is still aal1 but the account has a verified
  // TOTP factor — i.e. the user must complete a 2FA code step before they're
  // allowed into protected routes. Drives the MfaStepUp gate in ProtectedRoute.
  mfaRequired: false,
};

const ActionTypes = {
  SET_USER:         "SET_USER",
  LOGOUT:           "LOGOUT",
  SET_LOADING:      "SET_LOADING",
  SET_MFA_REQUIRED: "SET_MFA_REQUIRED",
};

const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, loading: false };
    case ActionTypes.LOGOUT:
      return { ...state, user: null, isAuthenticated: false, loading: false, mfaRequired: false };
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
    case ActionTypes.SET_MFA_REQUIRED:
      return { ...state, mfaRequired: action.payload };
    default:
      return state;
  }
};

// ── Supabase error → friendly message ─────────────────────────────────────
const friendlyError = (error) => {
  const msg = error?.message || "";
  if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials"))
    return "Incorrect email or password.";
  if (msg.includes("Email not confirmed") || msg.includes("email_not_confirmed"))
    return "Please verify your email before signing in. Check your inbox.";
  if (msg.includes("already registered") || msg.includes("user_already_exists") || msg.includes("23505"))
    return "An account with this email already exists.";
  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (msg.includes("weak_password"))
    return "Password is too weak. Use at least 8 characters with uppercase, lowercase, and a number.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Connection error. Please check your internet and try again.";
  return "Something went wrong. Please try again.";
};

// Default shape for a user with no profile data yet — also used as the
// fallback when fetchUserProfile throws so the app never sees undefined fields.
const emptyProfile = (authUser) => ({
  id:                authUser.id,
  email:             authUser.email,
  emailVerified:     !!authUser.email_confirmed_at,
  role:              "user",
  status:            "active",
  createdAt:         null,
  firstName:         "",
  lastName:          "",
  displayName:       "",
  avatarUrl:         "",
  phone:             "",
  birthday:          "",
  bio:               "",
  timezone:          "UTC",
  currency:          "USD",
  language:          "en",
  address:           "",
  city:              "",
  state:             "",
  zipCode:           "",
  country:           "",
  tradingExperience: "",
  riskTolerance:     "",
  preferredMarkets:  [],
  investmentGoals:   "",
});

// ── Fetch the full user profile across users / profile / address / trading ──
// All four reads run in parallel so the extra tables add ~no latency.
const fetchUserProfile = async (authUser) => {
  const [userRes, profileRes, addressRes, tradingRes] = await Promise.all([
    supabase
      .from("users")
      .select("role, status, created_at")
      .eq("id", authUser.id)
      .maybeSingle(),
    supabase
      .from("user_profiles")
      .select("first_name, last_name, display_name, avatar_url, phone, birthday, bio, timezone, currency, language")
      .eq("user_id", authUser.id)
      .maybeSingle(),
    supabase
      .from("user_addresses")
      .select("street_address, city, state_province, postal_code, country")
      .eq("user_id", authUser.id)
      .order("is_primary", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("trading_profiles")
      .select("trading_experience, risk_tolerance, preferred_markets, investment_goals")
      .eq("user_id", authUser.id)
      .maybeSingle(),
  ]);

  if (userRes.error)    console.error("[Auth] users table error:", userRes.error.message);
  if (profileRes.error) console.error("[Auth] user_profiles table error:", profileRes.error.message);
  if (addressRes.error) console.error("[Auth] user_addresses table error:", addressRes.error.message);
  if (tradingRes.error) console.error("[Auth] trading_profiles table error:", tradingRes.error.message);

  const userRow    = userRes.data;
  const profileRow = profileRes.data;
  const addressRow = addressRes.data;
  const tradingRow = tradingRes.data;

  return {
    ...emptyProfile(authUser),
    role:              userRow?.role    ?? "user",
    status:            userRow?.status  ?? "active",
    createdAt:         userRow?.created_at ?? null,
    firstName:         profileRow?.first_name   ?? "",
    lastName:          profileRow?.last_name    ?? "",
    displayName:       profileRow?.display_name ?? "",
    avatarUrl:         profileRow?.avatar_url   ?? "",
    phone:             profileRow?.phone        ?? "",
    birthday:          profileRow?.birthday     ?? "",
    bio:               profileRow?.bio          ?? "",
    timezone:          profileRow?.timezone     ?? "UTC",
    currency:          profileRow?.currency     ?? "USD",
    language:          profileRow?.language     ?? "en",
    address:           addressRow?.street_address ?? "",
    city:              addressRow?.city           ?? "",
    state:             addressRow?.state_province ?? "",
    zipCode:           addressRow?.postal_code    ?? "",
    country:           addressRow?.country        ?? "",
    tradingExperience: tradingRow?.trading_experience ?? "",
    riskTolerance:     tradingRow?.risk_tolerance     ?? "",
    preferredMarkets:  tradingRow?.preferred_markets  ?? [],
    investmentGoals:   tradingRow?.investment_goals   ?? "",
  };
};

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Monotonic counter that stamps each session resolution. fetchUserProfile is
  // four network reads, so a SIGNED_IN resolution can still be in flight when a
  // sign-out (or a newer event) supersedes it — its late SET_USER dispatch
  // would re-authenticate the UI with no real session behind it (confirmed bug:
  // the email-confirmation page discards the link's session, then the stale
  // fetch landed and PublicRoute bounced "Sign in" to the TrialGate).
  const sessionEpoch = useRef(0);

  // Resolve a session object into app state — shared by getSession() bootstrap
  // and onAuthStateChange subsequent events. Only the latest epoch may dispatch.
  const resolveSession = useCallback(async (session) => {
    const epoch = ++sessionEpoch.current;
    if (session?.user) {
      try {
        // The profile fetch is four parallel table reads; if any one of them
        // stalls (never settles), awaiting it directly would keep `loading`
        // true forever — the confirmed "stuck loading screen, refresh doesn't
        // help" bug. Time-box it: proceed with a minimal profile so the app
        // unblocks, then upgrade in place when the slow fetch finally lands.
        const fetchPromise = fetchUserProfile(session.user);
        const profile = await withTimeout(fetchPromise, AUTH_CALL_TIMEOUT_MS, null);
        if (epoch !== sessionEpoch.current) return; // superseded while fetching
        dispatch({
          type: ActionTypes.SET_USER,
          payload: profile ?? emptyProfile(session.user),
        });
        if (!profile) {
          fetchPromise
            .then((late) => {
              if (epoch !== sessionEpoch.current) return;
              dispatch({ type: ActionTypes.SET_USER, payload: late });
            })
            .catch(() => {}); // already running on the fallback profile
        }
      } catch (err) {
        if (epoch !== sessionEpoch.current) return;
        console.error("[Auth] fetchUserProfile threw:", err);
        dispatch({ type: ActionTypes.SET_USER, payload: emptyProfile(session.user) });
      }
    } else {
      dispatch({ type: ActionTypes.LOGOUT });
    }
  }, []);

  useEffect(() => {
    // Read the stored session immediately from localStorage — normally no
    // network call. Two guards so bootstrap can never hang the loading screen:
    // a timeout (getSession DOES hit the network when the stored token is
    // expired, and that refresh can stall) and a catch (an unhandled rejection
    // here would leave `loading` true forever). On either, resolve as signed
    // out — if a slow refresh later succeeds, onAuthStateChange re-resolves.
    withTimeout(supabase.auth.getSession(), AUTH_CALL_TIMEOUT_MS, { data: { session: null } })
      .then(({ data: { session } }) => {
        resolveSession(session);
      })
      .catch((err) => {
        console.error("[Auth] getSession failed:", err);
        resolveSession(null);
      });

    // Handle all subsequent auth events (token refresh, sign-in, sign-out).
    // INITIAL_SESSION is skipped — already handled by getSession() above.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;
        resolveSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [resolveSession]);

  // Recompute the 2FA step-up requirement whenever auth state changes — covers
  // session restore/refresh (a user who closed the tab mid-step-up) and the
  // post-verify elevation back to aal2. Runs OFF the bootstrap loading path (it
  // never flips `loading`), so it cannot reintroduce the documented hung-loading
  // bug. A verified TOTP factor on an aal1 session => step-up required.
  useEffect(() => {
    if (!state.isAuthenticated) return;
    let cancelled = false;
    getAal()
      .then(({ data }) => {
        if (cancelled) return;
        const required = data?.currentLevel === "aal1" && data?.nextLevel === "aal2";
        dispatch({ type: ActionTypes.SET_MFA_REQUIRED, payload: required });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [state.isAuthenticated, state.user]);

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }
    // A password sign-in only reaches aal1. If the account has a verified TOTP
    // factor, require the 6-digit code before completing login — defer the
    // activity log / new-login notification / welcome toast to completeMfaLogin().
    // Both lookups are time-boxed so a stalled request can't leave the submit
    // spinner running forever: if the AAL check times out we proceed as a
    // normal login and the bootstrap MFA effect re-gates once it resolves; a
    // missing factorId is fine because MfaStepUp re-resolves it on mount.
    const { data: aal } = await withTimeout(getAal(), AUTH_CALL_TIMEOUT_MS, { data: null });
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      dispatch({ type: ActionTypes.SET_MFA_REQUIRED, payload: true });
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      const { data: factorsData } = await withTimeout(listFactors(), AUTH_CALL_TIMEOUT_MS, { data: null });
      const totp = factorsData?.totp?.find((f) => f.status === "verified");
      return { status: "mfa_required", factorId: totp?.id ?? null };
    }
    if (data.user) {
      logActivity(data.user.id, "login", {});
      notifyNewLogin(data.user.id);
    }
    // No authenticator on the account (the aal2 branch above didn't fire) and
    // the setup offer hasn't been shown yet → tell the caller to route into
    // the 2FA wizard. The flag lives in auth user_metadata so the offer is
    // one-time per account, across devices; "Skip for now" in the wizard
    // continues to the dashboard.
    let offerMfaSetup = false;
    if (data.user && data.user.user_metadata?.mfa_setup_offered !== true) {
      offerMfaSetup = true;
      supabase.auth
        .updateUser({ data: { mfa_setup_offered: true } })
        .catch(() => {});
    }
    // onAuthStateChange fires and sets the user — no manual dispatch needed
    toast.success("Welcome back!");
    return { status: "ok", offerMfaSetup };
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  // Callers pass snake_case (first_name/last_name) — matching the DB column
  // names and the registration form contract — and read result.user_id to drive
  // the multi-step flow. Destructure the same keys and surface user_id in the
  // return so the names actually persist and the next step receives the id.
  const register = useCallback(async ({ first_name, last_name, email, password }) => {
    // Intentionally does NOT toggle the global auth `loading` flag. That flag
    // gates the route shell (PublicRoute), so flipping it here would unmount the
    // registration form and show the full-screen LoadingScreen — a white screen
    // with a spinner. The form drives its own in-page overlay from react-hook-
    // form's `isSubmitting` (awaiting this call), so the user keeps seeing the
    // registration page with a spinner in front instead.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }

    // Create the user profile row immediately after signup
    if (data.user) {
      await supabase.from("user_profiles").upsert({
        user_id:    data.user.id,
        first_name,
        last_name,
      }, { onConflict: "user_id" });
      logActivity(data.user.id, "register", {});
    }

    // No success toast here on purpose — the registration flow redirects to the
    // login page, which shows the single "verify your email" notice. A toast
    // would be a duplicate of that same message.
    return { ...data, user_id: data.user?.id ?? null };
  }, []);

  // ── Email verification ─────────────────────────────────────────────────────
  // signUp() already sends the initial confirmation email; this re-sends it for
  // the "Resend email" actions in the verification step. `type: 'signup'` issues
  // a fresh account-confirmation link (not a password reset). Previously this
  // function was referenced by the registration flow but never defined, so the
  // call threw and was silently swallowed — no email was ever (re)sent.
  const sendEmailVerification = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    if (error) {
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }
    toast.success("Verification email sent. Check your inbox and spam folder.");
  }, []);

  // Confirm an email from the verification-link token. Supabase exchanges the
  // token hash for a session; on success the user is signed in. The link can
  // also land on /auth/callback (OAuthCallback) — this backs the in-app token
  // path used by EmailVerification. Errors propagate so the caller can show the
  // "verification failed" state.
  const verifyEmail = useCallback(async (tokenHash, type = "email") => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) throw new Error(friendlyError(error));
  }, []);

  // ── Discard session (silent) ─────────────────────────────────────────────
  // Drops the current session without the ceremony of logout(): no toast, no
  // activity log, and the local auth state resets synchronously BEFORE the
  // network sign-out. The email-confirmation flow uses this to throw away the
  // session the link creates as a side effect — resetting state first stops
  // PublicRoute from bouncing the user to /dashboard off a stale
  // "authenticated" flag while signOut is still in flight.
  const discardSession = useCallback(async () => {
    // Bump the epoch FIRST so any in-flight profile fetch from the link's
    // SIGNED_IN event is invalidated and can't re-authenticate the UI later.
    sessionEpoch.current++;
    dispatch({ type: ActionTypes.LOGOUT });
    await supabase.auth.signOut();
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) logActivity(session.user.id, "logout", {});
    await supabase.auth.signOut();
    sessionEpoch.current++; // invalidate any in-flight profile fetch
    dispatch({ type: ActionTypes.LOGOUT });
    toast.success("Signed out successfully.");
  }, []);

  // ── Forgot password ──────────────────────────────────────────────────────
  const sendPasswordReset = useCallback(async (email) => {
    // Supabase handles email validation internally. For security reasons (prevent email enumeration),
    // it returns success even if the email doesn't exist. We follow the same pattern.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }

    // Show generic success message regardless of whether email exists (security best practice)
    toast.success("If this email is registered, you will receive a password reset link. Check your inbox and spam folder.");
  }, []);

  // ── Update profile ───────────────────────────────────────────────────────
  // Accepts a partial patch. Only the groups whose keys are present are
  // written, so an avatar-only update never clears address/trading data.
  const updateUserProfile = useCallback(async (profileData, { silent = false } = {}) => {
    if (!state.user) throw new Error("Not authenticated.");
    const userId = state.user.id;
    const u = state.user;

    // 1) Core profile (always upserted; unspecified fields keep current value)
    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id:      userId,
      first_name:   profileData.firstName   ?? u.firstName,
      last_name:    profileData.lastName    ?? u.lastName,
      display_name: profileData.displayName ?? u.displayName,
      phone:        (profileData.phone ?? u.phone) || null,
      birthday:     (profileData.birthday ?? u.birthday) || null,
      bio:          (profileData.bio ?? u.bio) || null,
      timezone:     profileData.timezone    ?? u.timezone,
      currency:     profileData.currency    ?? u.currency,
      language:     profileData.language    ?? u.language,
      avatar_url:   profileData.avatarUrl   ?? u.avatarUrl,
    }, { onConflict: "user_id" });

    if (profileError) {
      const msg = friendlyError(profileError);
      toast.error(msg);
      throw new Error(msg);
    }

    // 2) Address — separate table, no unique(user_id), so read-then-write the
    //    user's primary address. Only runs when an address field is provided.
    const addressKeys = ["address", "city", "state", "zipCode", "country"];
    if (addressKeys.some((k) => k in profileData)) {
      const addrPayload = {
        street_address: (profileData.address ?? u.address) || null,
        city:           (profileData.city    ?? u.city)    || null,
        state_province: (profileData.state   ?? u.state)   || null,
        postal_code:    (profileData.zipCode ?? u.zipCode) || null,
        country:        (profileData.country ?? u.country) || null,
      };

      const { data: existingAddr } = await supabase
        .from("user_addresses")
        .select("id")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { error: addrError } = existingAddr?.id
        ? await supabase.from("user_addresses").update(addrPayload).eq("id", existingAddr.id)
        : await supabase.from("user_addresses").insert({
            user_id: userId, address_type: "home", is_primary: true, ...addrPayload,
          });

      if (addrError) {
        const msg = friendlyError(addrError);
        toast.error(msg);
        throw new Error(msg);
      }
    }

    // 3) Trading profile — has unique(user_id), so a clean upsert. Enum columns
    //    are only set when non-empty so the DB defaults/CHECK stay valid.
    const tradingKeys = ["tradingExperience", "riskTolerance", "preferredMarkets", "investmentGoals"];
    if (tradingKeys.some((k) => k in profileData)) {
      const tradingPayload = {
        user_id:          userId,
        preferred_markets: profileData.preferredMarkets ?? u.preferredMarkets ?? [],
        investment_goals: (profileData.investmentGoals ?? u.investmentGoals) || null,
      };
      const experience = profileData.tradingExperience ?? u.tradingExperience;
      const risk        = profileData.riskTolerance ?? u.riskTolerance;
      if (experience) tradingPayload.trading_experience = experience;
      if (risk)       tradingPayload.risk_tolerance = risk;

      const { error: tradingError } = await supabase
        .from("trading_profiles")
        .upsert(tradingPayload, { onConflict: "user_id" });

      if (tradingError) {
        const msg = friendlyError(tradingError);
        toast.error(msg);
        throw new Error(msg);
      }
    }

    // Refresh user in state from the source of truth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const updated = await fetchUserProfile(authUser);
      dispatch({ type: ActionTypes.SET_USER, payload: updated });
    }

    if (!silent) toast.success("Profile updated.");
  }, [state.user]);

  // ── Complete 2FA step-up at login ─────────────────────────────────────────
  // Called after `login()` returns { status: 'mfa_required' }. Verifies the TOTP
  // code, clears the step-up gate, and runs the login side effects that were
  // deferred until the second factor was confirmed.
  const completeMfaLogin = useCallback(async (factorId, code) => {
    const { error } = await challengeAndVerify(factorId, code);
    if (error) throw new Error("Invalid code. Please try again.");
    dispatch({ type: ActionTypes.SET_MFA_REQUIRED, payload: false });
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logActivity(user.id, "login", {});
      notifyNewLogin(user.id);
    }
    toast.success("Welcome back!");
  }, []);

  // ── Change password (logged-in user) ──────────────────────────────────────
  // Supabase's updateUser() does NOT verify the current password, so we
  // re-authenticate first to confirm the user actually knows it. The re-auth
  // refreshes the JWT for the same user — no logout side effect — and we
  // deliberately do not fire notifyNewLogin for this internal re-auth.
  const changePassword = useCallback(async ({ currentPassword, newPassword }) => {
    if (!state.user) throw new Error("Not authenticated.");

    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: state.user.email,
      password: currentPassword,
    });
    if (reauthError) {
      const msg = "Current password is incorrect.";
      toast.error(msg);
      throw new Error(msg);
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = /same|different/i.test(error.message || "")
        ? "New password must be different from your old password."
        : friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }

    logActivity(state.user.id, "password_changed", {});

    // In-app security notification (fire-and-forget), honoring the user's prefs.
    const userId = state.user.id;
    supabase
      .from("user_profiles")
      .select("preferences")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data: profile }) => {
        emitNotification({
          userId,
          prefs: profile?.preferences?.notifications,
          record: {
            category: "security",
            event_type: "password_changed",
            title: "Your password was changed",
            body: "If this wasn't you, reset your password and contact support immediately.",
            severity: "warning",
            link_to: "/settings?tab=security",
          },
        });
      });

    toast.success("Password updated.");
  }, [state.user]);

  // ── Sign out of all devices ───────────────────────────────────────────────
  // Global scope revokes every refresh token for the user, so other devices are
  // signed out on their next token refresh.
  const signOutEverywhere = useCallback(async () => {
    if (state.user) logActivity(state.user.id, "signout_all_devices", {});
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) {
      toast.error("Failed to sign out of all devices.");
      throw new Error(error.message);
    }
    dispatch({ type: ActionTypes.LOGOUT });
    toast.success("Signed out of all devices.");
  }, [state.user]);

  // ── Admin: update another user's role/status ─────────────────────────────
  // Persisted only for admins via the users_update_admin RLS policy
  // (021_admin_dashboard.sql). Input is whitelist-validated with Zod so a
  // caller can never write columns other than role/status, and only to the
  // CHECK-constraint-allowed values.
  const updateUser = useCallback(async (userId, updates) => {
    let clean;
    try {
      clean = validateAdminUserUpdate(updates);
    } catch (err) {
      toast.error(err.message);
      throw err;
    }
    const { error } = await supabase.from("users").update(clean).eq("id", userId);
    if (error) {
      toast.error("Failed to update user.");
      throw error;
    }
    toast.success("User updated.");
  }, []);

  // ── Admin: fetch all users (paginated, admin only) ───────────────────────
  const fetchAllUsers = useCallback(async ({ page = 0, pageSize = 50 } = {}) => {
    const from = page * pageSize;
    const { data, error, count } = await supabase
      .from("users")
      .select("id, role, status, created_at, user_profiles(first_name, last_name, display_name, avatar_url)", { count: "exact" })
      .range(from, from + pageSize - 1)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { users: data, total: count };
  }, []);

  const value = {
    ...state,
    login,
    register,
    sendEmailVerification,
    verifyEmail,
    logout,
    discardSession,
    sendPasswordReset,
    updateUserProfile,
    updateUser,
    fetchAllUsers,
    completeMfaLogin,
    changePassword,
    signOutEverywhere,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export default AuthContext;
