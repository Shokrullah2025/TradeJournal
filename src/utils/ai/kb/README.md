# src/utils/ — Utility Functions

## Files
| File | Purpose |
|------|---------|
| `brokerUtils.js` | Helper functions for broker API interactions — formatting requests, parsing responses, handling Tradovate and Alpaca data structures. |
| `chartColors.js` | Centralised colour constants for all Recharts charts. Import from here so colours are consistent across dashboard, analytics, and backtest charts. |
| `exportUtils.js` | Functions for exporting trade data — CSV export and PDF report generation. |
| `validation.js` | Form validation helpers used in TradeForm, registration, and settings forms. Pure functions — no side effects. |

## Notes
- These are pure utility functions — no React, no Supabase calls, no side effects
- Import specific functions, not the whole module: `import { validateTrade } from '../utils/validation'`
- `chartColors.js` should be the single source of truth for any colour used in a chart
