import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const DEFAULT_STRATEGIES = ["Day Trading", "Swing Trading", "Scalp Trading"];
const DEFAULT_SETUPS     = ["Breakout", "Support Bounce", "Pullback"];

/**
 * Loads and persists the user's custom strategies, setups, and risk profiles
 * from the trading_profiles table. Safe to call from multiple components —
 * each mount triggers a fresh fetch but writes are debounce-free DB upserts.
 */
export function useUserSettings() {
  const { user } = useAuth();
  const [strategies,   setStrategies]   = useState(DEFAULT_STRATEGIES);
  const [setups,       setSetups]       = useState(DEFAULT_SETUPS);
  const [riskProfiles, setRiskProfiles] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;

    supabase
      .from("trading_profiles")
      .select("custom_strategies, custom_setups, risk_settings")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) { setLoading(false); return; }
        if (Array.isArray(data.custom_strategies) && data.custom_strategies.length > 0)
          setStrategies(data.custom_strategies);
        if (Array.isArray(data.custom_setups) && data.custom_setups.length > 0)
          setSetups(data.custom_setups);
        if (Array.isArray(data.risk_settings) && data.risk_settings.length > 0)
          setRiskProfiles(data.risk_settings);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  const saveStrategies = useCallback((updated) => {
    setStrategies(updated);
    if (!user?.id) return;
    supabase
      .from("trading_profiles")
      .upsert({ user_id: user.id, custom_strategies: updated }, { onConflict: "user_id" })
      .then(({ error }) => { if (error) console.error("[Settings] strategies save:", error.message); });
  }, [user?.id]);

  const saveSetups = useCallback((updated) => {
    setSetups(updated);
    if (!user?.id) return;
    supabase
      .from("trading_profiles")
      .upsert({ user_id: user.id, custom_setups: updated }, { onConflict: "user_id" })
      .then(({ error }) => { if (error) console.error("[Settings] setups save:", error.message); });
  }, [user?.id]);

  const saveRiskProfiles = useCallback((updated) => {
    setRiskProfiles(updated);
    if (!user?.id) return;
    supabase
      .from("trading_profiles")
      .upsert({ user_id: user.id, risk_settings: updated }, { onConflict: "user_id" })
      .then(({ error }) => { if (error) console.error("[Settings] risk profiles save:", error.message); });
  }, [user?.id]);

  return { strategies, setups, riskProfiles, loading, saveStrategies, saveSetups, saveRiskProfiles };
}
