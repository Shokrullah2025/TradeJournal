# tests/ — Test Suite

## Files
| File | Purpose |
|------|---------|
| `setup.js` | Test environment setup — mocks, global config for the test runner. |
| `billing.test.jsx` | Unit tests for billing logic and components. |
| `billing-integration.test.jsx` | Integration tests for the full billing flow (trial → subscription). |
| `trial-registration.test.jsx` | Tests for the multi-step registration and trial activation flow. |
| `test-template-functionality.md` | Notes on testing the custom trade template feature (see this file). |

## Test Runner
Tests use **Vitest** (configured via `vite.config.js`) with React Testing Library.

Run tests:
```bash
npm test
```

## Notes
- Tests cover billing and registration — these are the most complex flows with Stripe and Supabase interactions
- Mocks for Supabase and Stripe are set up in `setup.js`
- The test suite verifies logic correctness, not UI appearance — always manually test UI changes in the browser
