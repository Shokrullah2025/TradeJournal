import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    include: ["src/**/*.test.{js,jsx}", "tests/**/*.test.{js,jsx}"],
    // Dummy Supabase env so modules importing src/lib/supabase.js can load
    // under test without a live project (createClient does no network I/O at
    // construction time).
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
