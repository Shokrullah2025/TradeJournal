# src/context/ — React Context Providers

## Files
| File | Purpose |
|------|---------|
| `AuthContext.jsx` | User authentication state. Holds session, user object, and profile. Exposes `signIn`, `signOut`, `signUp`. Listens to Supabase `onAuthStateChange`. |
| `TradeContext.jsx` | All trade data. Fetches trades from Supabase on mount, exposes `addTrade`, `updateTrade`, `deleteTrade`, and filter state. |
| `BrokerContext.jsx` | Broker connection state. Handles OAuth initiation for Tradovate and Alpaca, stores connection tokens, and manages broker status. |
| `BacktestContext.jsx` | Backtest session state. Tracks active session, trade replay position, and backtest results. |
| `BillingContext.jsx` | Subscription and trial state. Fetches billing status from Supabase, exposes plan details and trial days remaining. |

## Usage Pattern
All contexts follow the same pattern:
```jsx
const { data, action } = useContext(XxxContext)
```
Contexts are provided in `src/main.jsx` wrapping the entire app. Never call Supabase directly from a component — go through the relevant context.

## Broker OAuth Notes (see TRADOVATE_OAUTH_SETUP.md)
- OAuth flow initiated in `BrokerContext`
- Callback handled in `src/pages/OAuthCallback.jsx`
- Client secrets never touch the browser — token exchange happens in Supabase Edge Functions
