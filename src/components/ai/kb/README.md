# src/components/ — Components Overview

## Directory Structure
```
components/
├── analytics/    Charts for the Analytics page (drawdown, instruments, strategy, time)
├── auth/         Auth flow components (protected route, email verify, trial, payment)
├── billing/      Billing UI (secure payment info display)
├── common/       Shared utility components (ThemeToggle)
├── dashboard/    Dashboard charts and widgets
├── layout/       App shell (Header, Sidebar)
├── profile/      Profile UI (ProfilePictureUpload)
└── trades/       All trade-related UI (form, list, calendar, backtest, broker)
```

## Conventions
- One component per file, filename matches the component name
- Files ending in `_backup` or `_clean` or `_v2` are old iterations — the primary file (no suffix) is the one in use
- Charts use Recharts library throughout
- Components consume context via `useContext` hooks — no prop drilling for global state
