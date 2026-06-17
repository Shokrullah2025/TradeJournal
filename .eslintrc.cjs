/* ESLint config for Trade Journal Pro (ESLint 8, legacy/eslintrc format). */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  // Vitest / Jest globals so test files don't trip no-undef.
  globals: {
    vi: "readonly",
    vitest: "readonly",
    describe: "readonly",
    it: "readonly",
    test: "readonly",
    expect: "readonly",
    beforeEach: "readonly",
    afterEach: "readonly",
    beforeAll: "readonly",
    afterAll: "readonly",
  },
  ignorePatterns: [
    "dist/",
    "node_modules/",
    "coverage/",
    "supabase/functions/", // Deno runtime, different globals
    "*.config.js",
  ],
  rules: {
    // CLAUDE.md prefers PropTypes/TS, but enabling as an error would be noise
    // on the existing codebase — surface as a warning instead.
    "react/prop-types": "warn",
    "react/no-unescaped-entities": "off",
    "no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "no-empty": ["warn", { allowEmptyCatch: true }],
    "no-console": "off",
  },
};
