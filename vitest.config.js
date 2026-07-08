import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    env: {
      // Test-only placeholders so src/lib/supabase.js can construct the client
      // without throwing. No real network calls are made in unit tests.
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
      // src/lib/stripe.js reads this at module scope; without it the payment
      // components render the "not configured" fallback and the trial-
      // registration tests fail. They passed locally only because .env
      // supplied the key — CI has no .env, so every CI run was red. The tests
      // mock all @stripe/* modules, so a placeholder is safe.
      VITE_STRIPE_PUBLISHABLE_KEY: "pk_test_placeholder_for_tests",
    },
    include: ["src/**/*.test.{js,jsx}", "tests/**/*.test.{js,jsx}"],
  },
});
