import React from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom/server";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "../context/AuthContext";
import SiteRoutes from "./SiteRoutes";
import { PUBLIC_ROUTES } from "./routes";

// Re-exported so scripts/prerender.mjs gets the route list and canonical
// origin from the same SSR bundle it renders with — one build, one source of
// truth (SITE_URL honors VITE_SITE_URL for preview deploys).
export { PUBLIC_ROUTES };
export { SITE_URL } from "../utils/seo";

/**
 * Server-side entry used by scripts/prerender.mjs at build time (never in the
 * browser). Renders one public route to an HTML string plus the helmet head
 * tags that route emitted through <Seo/>.
 *
 * AuthProvider is the only context the public site tree consumes (SiteNavbar's
 * session-aware "Sign in"). Its initial state — signed out, effects never run
 * under renderToString — is exactly what an anonymous crawler should see.
 */
export function render(url) {
  const helmetContext = {};

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <AuthProvider>
        <StaticRouter location={url}>
          <SiteRoutes />
        </StaticRouter>
      </AuthProvider>
    </HelmetProvider>
  );

  return { html, helmet: helmetContext.helmet };
}
