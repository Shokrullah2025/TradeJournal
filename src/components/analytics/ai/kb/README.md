# src/components/analytics/ — Analytics Components

## Files
| File | Purpose |
|------|---------|
| `DrawdownChart.jsx` | Chart showing drawdown curve over time — peak-to-trough equity drops. |
| `InstrumentAnalysis.jsx` | Breakdown of P&L and win rate per traded instrument/ticker. |
| `PerformanceMetrics.jsx` | Summary metrics panel (Sharpe, profit factor, avg win/loss, etc.). |
| `StrategyAnalysis.jsx` | Breakdown of performance by trading strategy/setup tag. |
| `TimeAnalysis.jsx` | Analysis of performance by time of day and day of week. |

## Notes
- All components receive trade data from `TradeContext` via the `Analytics` page
- Charts use Recharts — `ResponsiveContainer` is always the outer wrapper
- Filters applied on the Analytics page (date range, instrument) are passed down as props
