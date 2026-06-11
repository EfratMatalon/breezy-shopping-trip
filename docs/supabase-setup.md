# Supabase Setup — Phase 1

This document covers the manual steps required to stand up the Supabase
backend for Phase 1 (schema, RLS, RPCs). It does **not** cover Google OAuth
or frontend wiring — those are Phase 2.

## 1. Local development

1. Install the Supabase CLI (already added as a devDependency: `npm i`).
2. Start local Supabase:
   ```sh
   npm run supabase:start
   ```
3. Apply all migrations to a fresh local database:
   ```sh
   npm run supabase:reset
   ```
   This runs every file in `supabase/migrations/` in order:
   - `00001_extensions_and_helpers.sql`
   - `00002_tables.sql`
   - `00003_indexes.sql`
   - `00004_rls_policies.sql`
   - `00005_rpc_functions.sql`
   - `00006_seed_products.sql`
   - `00007_realtime_publication.sql`
4. Run the structural sanity tests:
   ```sh
   npm run supabase:test
   ```
5. Studio is available at the URL printed by `supabase start`
   (default `http://localhost:54323`).

## 2. Remote project (when ready)

1. Create a project at https://supabase.com/dashboard.
2. Link the local project:
   ```sh
   supabase link --project-ref <project-ref>
   ```
3. Push migrations:
   ```sh
   supabase db push
   ```
4. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (these are not yet read by the app — wired in Phase 2).

## 3. Google OAuth (Phase 2 — not configured yet)

Deferred. When Phase 2 begins:

- Enable the Google provider under **Authentication → Providers**.
- Configure the redirect URL allowlist for local (`http://localhost:3000`)
  and the deployed Cloudflare host.
- Never expose the `service_role` key to the frontend — only
  `VITE_SUPABASE_ANON_KEY` is used client-side.

## 4. What Phase 1 delivers

- Tables: `profiles`, `households`, `household_members`, `products`,
  `shopping_lists`, `shopping_items`, `recurring_products`,
  `suggestion_dismissals` — all with RLS enabled.
- Helper functions: `is_household_member`, `my_household_id`,
  `is_household_creator`, `household_id_for_list`.
- RPCs: `create_household`, `join_household_by_code`,
  `regenerate_invite_code`, `leave_household`, `complete_shopping_trip`,
  `seed_recurring_items`, `generate_invite_code`.
- Seed: ~70 system products across 10 Hebrew categories.
- Realtime: `shopping_items` added to the `supabase_realtime` publication.

See [`phase1-implementation-report.md`](../phase1-implementation-report.md)
for the full file-by-file summary.
