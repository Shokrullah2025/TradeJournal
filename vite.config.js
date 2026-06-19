import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
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
});
