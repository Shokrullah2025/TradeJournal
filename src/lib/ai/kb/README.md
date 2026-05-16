# src/lib/ — Third-Party Client Setup

## Files
| File | Purpose |
|------|---------|
| `supabase.js` | Creates and exports the Supabase client. Reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from environment variables. Import this client wherever Supabase is needed — never create a second instance. |

## Usage
```js
import { supabase } from '../lib/supabase'

const { data, error } = await supabase.from('trades').select('*')
```

## Important
- The anon key is safe for the browser — Supabase RLS policies enforce what each user can access
- Never use the Supabase `service_role` key in the frontend — it bypasses RLS and exposes all data
- Service role key lives only in Supabase Edge Function environment variables
