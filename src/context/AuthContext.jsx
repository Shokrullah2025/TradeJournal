import React, { createContext, useContext, useReducer, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabase";

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

// ── Fetch the full user profile from public.users + public.user_profiles ──
const fetchUserProfile = async (authUser) => {
  const { data: userRow, error: userError } = await supabase
    .from("users")
    .select("role, status")
    .eq("id", authUser.id)
    .maybeSingle();

  const { data: profileRow, error: profileError } = await supabase
    .from("user_profiles")
    .select("first_name, last_name, display_name, avatar_url, timezone, currency, language")
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (userError) console.error("[Auth] users table error:", userError.message);
  if (profileError) console.error("[Auth] user_profiles table error:", profileError.message);

  const profile = {
    id:            authUser.id,
    email:         authUser.email,
    emailVerified: !!authUser.email_confirmed_at,
    role:          userRow?.role    ?? "user",
    status:        userRow?.status  ?? "active",
    firstName:     profileRow?.first_name   ?? "",
    lastName:      profileRow?.last_name    ?? "",
    displayName:   profileRow?.display_name ?? "",
    avatarUrl:     profileRow?.avatar_url   ?? "",
    timezone:      profileRow?.timezone     ?? "UTC",
    currency:      profileRow?.currency     ?? "USD",
    language:      profileRow?.language     ?? "en",
  };
  return profile;
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
        dispatch({
          type: ActionTypes.SET_USER,
          payload: {
            id:            session.user.id,
            email:         session.user.email,
            emailVerified: !!session.user.email_confirmed_at,
            role:          'user',
            status:        'active',
            firstName:     '',
            lastName:      '',
            displayName:   '',
            avatarUrl:     '',
            timezone:      'UTC',
            currency:      'USD',
            language:      'en',
          },
        });
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }
    // onAuthStateChange fires and sets the user — no manual dispatch needed
    toast.success("Welcome back!");
  }, []);

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async ({ firstName, lastName, email, password }) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: true });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
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
        first_name: firstName,
        last_name:  lastName,
      }, { onConflict: "user_id" });
    }

    toast.success("Account created! Please check your email to verify your account.");
    return data;
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    dispatch({ type: ActionTypes.LOGOUT });
    toast.success("Signed out successfully.");
  }, []);

  // ── Forgot password ──────────────────────────────────────────────────────
  const sendPasswordReset = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) {
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }
    toast.success("Password reset email sent. Check your inbox.");
  }, []);

  // ── Update profile ───────────────────────────────────────────────────────
  const updateUserProfile = useCallback(async (profileData) => {
    if (!state.user) throw new Error("Not authenticated.");

    const { firstName, lastName, displayName, timezone, currency, language, avatarUrl } = profileData;

    const { error } = await supabase.from("user_profiles").upsert({
      user_id:      state.user.id,
      first_name:   firstName   ?? state.user.firstName,
      last_name:    lastName    ?? state.user.lastName,
      display_name: displayName ?? state.user.displayName,
      timezone:     timezone    ?? state.user.timezone,
      currency:     currency    ?? state.user.currency,
      language:     language    ?? state.user.language,
      avatar_url:   avatarUrl   ?? state.user.avatarUrl,
    }, { onConflict: "user_id" });

    if (error) {
      const msg = friendlyError(error);
      toast.error(msg);
      throw new Error(msg);
    }

    // Refresh user in state
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      const updated = await fetchUserProfile(authUser);
      dispatch({ type: ActionTypes.SET_USER, payload: updated });
    }

    toast.success("Profile updated.");
  }, [state.user]);

  // ── Admin: update another user's role/status ─────────────────────────────
  // RLS allows this only for admins (is_admin() policy on public.users)
  const updateUser = useCallback(async (userId, updates) => {
    const { error } = await supabase.from("users").update(updates).eq("id", userId);
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
