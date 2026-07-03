import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";

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
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const root = document.documentElement;
    const dark = theme === "dark" && !isPublicPath(pathname);
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);

    // Smooth the color swap (body has transition rules keyed off this class).
    root.classList.add("theme-transition");
    const timer = setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 300);
    return () => clearTimeout(timer);
  }, [theme, pathname]);

  return null;
};

export default ThemeScope;
