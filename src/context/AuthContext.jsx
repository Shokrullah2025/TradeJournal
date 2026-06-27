import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { logActivity } from "../utils/logActivity";
import { emitNotification } from "../utils/notifications";
import { validateAdminUserUpdate } from "../lib/schemas/adminUser";

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
          link_to: "/profile",
        },
      });
    });
};

// ── State ──────────────────────────────────────────────────────────────────
const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
};

const ActionTypes = {
  SET_USER:    "SET_USER",
  LOGOUT:      "LOGOUT",
  SET_LOADING: "SET_LOADING",
};

const authReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_USER:
      return { ...state, user: action.payload, isAuthenticated: !!action.payload, loading: false };
    case ActionTypes.LOGOUT:
      return { ...state, user: null, isAuthenticated: false, loading: false };
    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };
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

  // Resolve a session object into app state — shared by getSession() bootstrap
  // and onAuthStateChange subsequent events.
  const resolveSession = useCallback(async (session) => {
    if (session?.user) {
      try {
        const profile = await fetchUserProfile(session.user);
        dispatch({ type: ActionTypes.SET_USER, payload: profile });
      } catch (err) {
        console.error("[Auth] fetchUserProfile threw:", err);
        dispatch({ type: ActionTypes.SET_USER, payload: emptyProfile(session.user) });
      }
    } else {
      dispatch({ type: ActionTypes.LOGOUT });
    }
  }, []);

  useEffect(() => {
    // Read the stored session immediately from localStorage — no network call.
    // This unblocks the loading screen right away instead of waiting for the
    // JWT token refresh round-trip that onAuthStateChange requires first.
    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveSession(session);
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
    if (data.user) {
      logActivity(data.user.id, "login", {});
      notifyNewLogin(data.user.id);
    }
    // onAuthStateChange fires and sets the user — no manual dispatch needed
    toast.success("Welcome back!");
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  // Callers pass snake_case (first_name/last_name) — matching the DB column
  // names and the registration form contract — and read result.user_id to drive
  // the multi-step flow. Destructure the same keys and surface user_id in the
  // return so the names actually persist and the next step receives the id.
  const register = useCallback(async ({ first_name, last_name, email, password }) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    dispatch({ type: ActionTypes.SET_LOADING, payload: false });

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
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
  const verifyEmail = useCallback(async (tokenHash) => {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });
    if (error) throw new Error(friendlyError(error));
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) logActivity(session.user.id, "logout", {});
    await supabase.auth.signOut();
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
    sendPasswordReset,
    updateUserProfile,
    updateUser,
    fetchAllUsers,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export default AuthContext;
