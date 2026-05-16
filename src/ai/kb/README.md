# src/ — Source Overview

## Structure
```
src/
├── components/   UI components grouped by feature
├── context/      React Context providers (state management)
├── contexts/     ThemeContext (separate from main context/)
├── lib/          Third-party client setup (Supabase)
├── pages/        Top-level route components
├── styles/       Global CSS, tokens, component styles
└── utils/        Pure helper functions
```

## State Management
All global state uses React Context API — no Redux or Zustand. Contexts wrap the entire app in `main.jsx`:
- `AuthContext` — user session, profile, auth actions
- `TradeContext` — trades CRUD, filters, selected trade
- `BrokerContext` — broker connections, OAuth flow
- `BacktestContext` — backtest sessions and results
- `BillingContext` — subscription status, trial info
- `ThemeContext` — dark/light mode preference

## Routing
React Router v6 with nested routes defined in `App.jsx`. Protected routes use `ProtectedRoute.jsx` which checks `AuthContext` for a valid session before rendering.

## Styling Approach
Tailwind utility classes are used for layout and spacing. Custom CSS variables (defined in `styles/tokens.css`) handle theme colours. Component-specific CSS files live in `styles/components/`.
