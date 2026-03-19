# TODOS

## High Priority

### [AUTH] Scope RLS policies to authenticated users
- **What:** Update Supabase RLS policies so all tables (`companies`, `digital_employees`, `onboarding_profiles`, `leads`, `tickets`) require `auth.uid()` instead of public access.
- **Why:** Without this, auth is cosmetic — middleware gates the UI but the database is wide open to direct API calls. Anyone with the Supabase URL + anon key can read/write all data.
- **How:** Add `user_id UUID REFERENCES auth.users(id)` to `companies` table. Update RLS policies to `USING (user_id = auth.uid())`. Cascade to related tables via foreign keys.
- **Depends on:** Auth flow being live (this PR) so users exist in `auth.users`.
- **Added:** 2026-03-18 via /plan-eng-review

## Medium Priority

### [AUTH] Password reset / forgot password flow
- **What:** Add "Forgot password?" link on `/register` page → triggers `supabase.auth.resetPasswordForEmail()`. Add `/auth/reset` callback page that lets user set a new password via `supabase.auth.updateUser()`.
- **Why:** No self-service account recovery exists. Locked-out users have no path back.
- **How:** ~2 new files: `app/auth/reset/route.ts` (callback) and UI for entering new password. Supabase handles email sending.
- **Depends on:** Auth flow finalized.
- **Added:** 2026-03-18 via /plan-eng-review
