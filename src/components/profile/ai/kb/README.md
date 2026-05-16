# src/components/profile/ — Profile Components

## Files
| File | Purpose |
|------|---------|
| `ProfilePictureUpload.jsx` | Handles profile picture upload to Supabase Storage. Shows preview, handles file selection, uploads to the `avatars` bucket, and updates the user's profile URL in the database. |

## Notes
- Supabase Storage bucket: `avatars`
- Storage RLS policies are in `supabase/migrations/003_storage_policies.sql`
- Profile data (name, avatar URL, preferences) is stored in the `profiles` table in Supabase
- The `Profile` page (`src/pages/Profile.jsx`) composes this component
