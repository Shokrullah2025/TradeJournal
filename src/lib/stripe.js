import { loadStripe } from "@stripe/stripe-js";

// Stripe publishable keys are public by design — safe to ship in the frontend
// bundle (unlike the secret key, which lives only in Edge Function env vars).
const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

// `loadStripe(undefined)` throws "Expected publishable key to be of type
// string, got type undefined instead." That happens when
// VITE_STRIPE_PUBLISHABLE_KEY is absent from the build environment (e.g. it was
// not set on the Cloudflare Pages build scope). Guard it here so a missing key
// degrades billing gracefully instead of crashing the whole app with an
// uncaught promise rejection at module load.
export const isStripeConfigured = Boolean(publishableKey);

// Initialized once at module level and shared everywhere — the single source of
// truth for the Stripe.js instance. `null` when the key is missing; callers must
// check `isStripeConfigured` before rendering <Elements>.
export const stripePromise = isStripeConfigured ? loadStripe(publishableKey) : null;
