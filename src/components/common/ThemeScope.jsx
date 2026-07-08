import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../context/AuthContext";

// Routes where the user's saved theme does NOT apply: the public marketing
// site, legal pages, and the auth screens always render light. The dark
// preference a user picks inside the app must never leak onto the logged-out
// website. Everything else (the protected "/*" app shell, /security/2fa)
// follows the chosen theme.
const PUBLIC_PATHS = [
  "/features",
  "/solutions",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/disclaimer",
  "/cookies",
  "/refund",
  "/aup",
  "/dmca",
  "/login",
  "/register",
  "/auth",
  "/verify-email",
];

const isPublicPath = (pathname) =>
  pathname === "/" ||
  PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

/**
 * Applies the theme class to <html> based on the current route. Mounted once
 * inside the Router; ThemeContext only tracks the preference (state +
 * localStorage) and this component owns the DOM class, so the two can't fight.
 */
const ThemeScope = () => {
  const { theme } = useTheme();
  const { mfaRequired } = useAuth();
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const root = document.documentElement;
    // The 2FA step-up gate (MfaStepUp) renders in place at the protected route
    // the user was heading to, so it has no public pathname of its own. It is
    // still part of the sign-in flow — keep it light like /login; the saved
    // dark theme applies only once the code is verified and the app renders.
    const dark = theme === "dark" && !isPublicPath(pathname) && !mfaRequired;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);

    // Smooth the color swap (body has transition rules keyed off this class).
    root.classList.add("theme-transition");
    const timer = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 300);
    return () => clearTimeout(timer);
  }, [theme, pathname, mfaRequired]);

  return null;
};

export default ThemeScope;
