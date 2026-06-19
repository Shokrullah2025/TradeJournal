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
    },
    include: ["src/**/*.test.{js,jsx}", "tests/**/*.test.{js,jsx}"],
  },
});
