import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// Captured synchronously at module load — supabase-js strips the recovery
// hash from the URL once it exchanges the tokens, so this is the only
// reliable place to see it.
const landedWithRecoveryHash =
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery");

// Safety net for the password-recovery email link. If the Supabase redirect
// allowlist rejects our redirectTo, the link falls back to the Site URL and
// the user lands on the home page silently signed in — without ever seeing
// the reset form. Whatever page the recovery session lands on, this routes
// the user to /auth/reset-password.
const RecoveryRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const goToReset = () => {
      if (window.location.pathname !== "/auth/reset-password") {
        navigate("/auth/reset-password", { replace: true });
      }
    };

    // Primary signal: fired after supabase-js exchanges the recovery hash.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") goToReset();
    });

    // Fallback for when PASSWORD_RECOVERY fired before this listener was
    // mounted: getSession() resolves only after URL detection has finished,
    // so a session here means the recovery hash was consumed successfully.
    if (landedWithRecoveryHash) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) goToReset();
      });
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

export default RecoveryRedirect;
