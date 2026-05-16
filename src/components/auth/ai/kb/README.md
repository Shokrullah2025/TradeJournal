# src/components/auth/ — Auth Components

## Files
| File | Purpose |
|------|---------|
| `ProtectedRoute.jsx` | Route guard — checks `AuthContext` for a valid session. Redirects unauthenticated users to `/login`. |
| `EmailVerification.jsx` | Handles the email verification step after registration. Listens for Supabase auth state changes. |
| `TrialActivation.jsx` | UI for activating a free trial during the registration flow. |
| `PaymentMethodForm.jsx` | Stripe payment form for entering card details. Uses Stripe Elements. Never handles raw card numbers — Stripe tokenises on the client. |

## Auth Flow
1. User registers via `MultiStepRegistration` page
2. Supabase sends verification email → `EmailVerification` handles the callback
3. Trial activated via `TrialActivation`
4. On login, `AuthContext` sets session and user profile
5. All protected pages wrapped in `ProtectedRoute`

## Security Notes
- Stripe secret key is NEVER in the frontend — payment intents are created via Supabase Edge Functions
- Supabase RLS ensures users can only read/write their own data regardless of frontend logic
