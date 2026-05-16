# src/components/dashboard/ — Dashboard Components

## Files
| File | Purpose |
|------|---------|
| `CumulativePnLChart.jsx` | Area chart showing cumulative P&L over time. Has 30D/60D/1Y filter tabs, hover tooltip, and always starts the Y-axis line at zero. Handles browser-refresh re-render bug with a key-based remount. |
| `PnLChart.jsx` | Daily P&L bar chart (green wins, red losses). SVG takes full card width by default. |
| `PnLChart_simple.jsx` | Simplified version of PnLChart used in some contexts. |
| `PnLChart_backup.jsx` | Old backup — not in active use. |
| `MiniCharts.jsx` | Tiny sparkline charts used inside StatsCards. |
| `PerformanceChart.jsx` | Broader performance chart on the dashboard. |
| `RMultipleChart.jsx` | Bar chart showing R-multiple distribution across trades. |
| `RecentTrades.jsx` | Table listing the most recent trades with P&L colouring. |
| `StatsCard.jsx` | Stat display card (Total P&L, Win Rate, Max Drawdown, Avg Win/Loss) with a MiniChart inside. |
| `WhenYouWinChart.jsx` | Heatmap grid showing average P&L by session hour and day of week. Fills the full card on browser refresh (fixed via SVG percentage sizing). |

## Known Fixes (see DASHBOARD_DATE_FIXES.md)
- `CumulativePnLChart`: remounts on data change to avoid stale render after browser refresh
- `WhenYouWinChart`: grid lines use SVG `%` lengths so they always span the full card width
- Both charts start their line/area at zero on the Y-axis

## Chart Library
All charts use **Recharts**. Common pattern: `ResponsiveContainer` wrapping a `ComposedChart` or `AreaChart`.
