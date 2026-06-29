import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Variables that Vite inlines into the client bundle at build time. If any are
// missing when `npm run build` runs, Vite still produces a bundle — but it
// replaces the missing values with `undefined`, so the app crashes at runtime
// with "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY...". On a hosted
// build (e.g. Cloudflare Pages) that broken bundle gets deployed silently.
// We fail the build loudly instead, so the deploy log makes the cause obvious.
const REQUIRED_BUILD_ENV = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  // Stripe's publishable key is inlined too. Without it the payment form renders
  // "Payments are temporarily unavailable" and trials can't be started — so a
  // production build missing it is a broken deploy. Fail loudly instead.
  "VITE_STRIPE_PUBLISHABLE_KEY",
];

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    // loadEnv merges process.env (where Cloudflare/Vercel/Netlify inject their
    // dashboard variables) with any local .env files, filtered by prefix.
    const env = loadEnv(mode, process.cwd(), "");
    const missing = REQUIRED_BUILD_ENV.filter((key) => !env[key]);
    if (missing.length > 0) {
      throw new Error(
        `\n\n[vite build] Missing required build-time environment variable(s): ${missing.join(", ")}.\n` +
          `These VITE_* variables are inlined into the bundle at build time and must be present\n` +
          `BEFORE the build runs (i.e. 'npm run build'). On Cloudflare Pages set them in:\n` +
          `  Settings -> Variables and Secrets -> add to the Production (and Preview) scope\n` +
          `then trigger a fresh deployment. Names must match exactly (VITE_ prefix, no whitespace).\n`,
      );
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server: {
      port: 3000,
      // Listen on all network interfaces so the dev server is reachable from
      // other devices on the same network (e.g. a phone for mobile testing).
      host: true,
      // Don't crash if 3000 is still bound from a previous run — use next free port
      strictPort: false,
      // inotify (the Linux file-watch mechanism) does not work on NTFS drives
      // mounted via WSL2 (/mnt/c/...). Polling is slower but reliable here.
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
  };
});
