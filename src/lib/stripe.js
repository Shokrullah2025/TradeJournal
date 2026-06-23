import { loadStripe } from "@stripe/stripe-js";

// Single shared Stripe.js instance. The publishable key is public by design
// (CLAUDE.md §2 — only VITE_ vars are exposed). Importing this everywhere
// avoids calling loadStripe() more than once, mirroring the Supabase singleton.
export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
