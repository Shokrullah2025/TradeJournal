import containerQueries from "@tailwindcss/container-queries";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Public marketing-site accent (Evergreen teal theme from the
        // approved landing design). The authenticated app keeps `primary`.
        accent: {
          50: "#eef5f2",
          100: "#dcefeb",
          200: "#b9e6db",
          300: "#7fd1c2",
          400: "#3fae9c",
          500: "#2a9d8f",
          600: "#158477",
          700: "#147065",
          800: "#0f5f5f",
          900: "#0a403b",
        },
        // Brand Evergreen teal — same scale as `accent` so the authenticated
        // app matches the marketing site (was sky blue before 2026-07).
        primary: {
          50: "#eef5f2",
          100: "#dcefeb",
          200: "#b9e6db",
          300: "#7fd1c2",
          400: "#3fae9c",
          500: "#2a9d8f",
          600: "#158477",
          700: "#147065",
          800: "#0f5f5f",
          900: "#0a403b",
        },
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        // Marketing-site typography (landing design): Space Grotesk headings,
        // IBM Plex Sans body, IBM Plex Mono for tabular numbers.
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui"],
        body: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui"],
        nums: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [containerQueries],
};
