# src/components/billing/ — Billing Components

## Files
| File | Purpose |
|------|---------|
| `SecurePaymentInfo.jsx` | Displays secure payment badges and card info summary. Informational only — no payment processing logic here. |

## Billing Architecture
- Stripe publishable key is in the frontend (`VITE_STRIPE_PUBLISHABLE_KEY`)
- Stripe secret key lives ONLY in Supabase Edge Functions — never exposed to the browser
- `BillingContext` holds subscription status, trial days remaining, and plan info
- Payment forms use Stripe Elements (in `src/components/auth/PaymentMethodForm.jsx`)
- The `Billing` page (`src/pages/Billing.jsx`) is the main billing management UI
