# src/components/trades/ — Trade Components

## Files
| File | Purpose |
|------|---------|
| `TradeForm.jsx` | Main form for adding and editing trades. Supports futures and stock account types. |
| `TradeForm_clean.jsx` / `TradeForm_clean_v2.jsx` | Older refactor iterations — not in active use. |
| `TradeList.jsx` | Table/list view of all trades with sorting and selection. |
| `TradeManagement.jsx` | Orchestrates trade CRUD — wraps TradeList and TradeForm together. |
| `TradeFilters.jsx` | Filter bar for filtering trades by date, instrument, outcome, etc. |
| `TradeCalendar.jsx` | Calendar view showing trading days colour-coded by P&L. |
| `TradeCalendar_fixed.jsx` | Fixed version of the calendar — check which one is active in the page. |
| `DayDetailModal.jsx` | Modal that opens when clicking a calendar day, showing all trades for that day. |
| `AccountTypeSelector.jsx` | Dropdown/toggle for futures vs stock account type selection. |
| `TemplateCreation.jsx` | UI for creating custom trade entry templates — users can add/remove fields. |
| `BacktestModal.jsx` | Modal shell for the backtesting feature. |
| `BacktestPanel.jsx` | Panel UI inside the backtest modal. |
| `BacktestSession.jsx` | Manages an active backtest session (replay trades, track results). |
| `BacktestChart.jsx` | Chart visualising backtest results. |
| `BrokerModal.jsx` | Modal for broker connection setup. |
| `BrokerConfiguration.jsx` | Form/settings for configuring a connected broker. |
| `TradovateSetupStatus.jsx` | Shows Tradovate connection status and setup steps. |

## Notes
- Files without a suffix (`TradeForm.jsx`, `TradeCalendar.jsx`) are the active versions
- `_backup`, `_clean`, `_fixed`, `_v2` suffixed files are old iterations kept for reference
- Trade data flows from `TradeContext` — components do not fetch from Supabase directly
