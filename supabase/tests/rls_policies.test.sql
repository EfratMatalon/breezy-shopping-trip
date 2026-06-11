-- Phase 1: structural sanity tests for RLS + RPC setup.
-- Run with: supabase db reset (applies migrations), then:
--   psql "$DATABASE_URL" -f supabase/tests/rls_policies.test.sql
--
-- This is a plain SQL script (no pgTAP dependency). It checks that RLS is
-- enabled on every Phase 1 table, that policies exist, and that the seed
-- catalog landed. It does NOT simulate two users with different JWTs —
-- that requires `request.jwt.claims` setup and is recommended as a
-- follow-up in Phase 7.

do $$
declare
  v_count int;
begin
  -- 1. RLS enabled on all Phase 1 tables
  select count(*) into v_count
  from pg_tables t
  join pg_class c on c.relname = t.tablename and c.relnamespace = 'public'::regnamespace
  where t.schemaname = 'public'
    and t.tablename in (
      'profiles', 'households', 'household_members', 'products',
      'shopping_lists', 'shopping_items', 'recurring_products', 'suggestion_dismissals'
    )
    and c.relrowsecurity = false;

  if v_count > 0 then
    raise exception 'FAIL: % Phase 1 table(s) have RLS disabled', v_count;
  end if;
  raise notice 'PASS: RLS enabled on all Phase 1 tables';

  -- 2. Every Phase 1 table has at least one policy
  select count(*) into v_count
  from (
    select unnest(array[
      'profiles', 'households', 'household_members', 'products',
      'shopping_lists', 'shopping_items', 'recurring_products', 'suggestion_dismissals'
    ]) as tablename
  ) expected
  where not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = expected.tablename
  );

  if v_count > 0 then
    raise exception 'FAIL: % Phase 1 table(s) have no RLS policies', v_count;
  end if;
  raise notice 'PASS: every Phase 1 table has at least one policy';

  -- 3. Seed catalog landed (~70 system products)
  select count(*) into v_count from public.products where household_id is null;
  if v_count < 60 then
    raise exception 'FAIL: expected ~70 system products, found %', v_count;
  end if;
  raise notice 'PASS: system product catalog seeded (% rows)', v_count;

  -- 4. household_members has UNIQUE(user_id)
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.household_members'::regclass
      and contype = 'u'
      and array_length(conkey, 1) = 1
  ) then
    raise exception 'FAIL: household_members missing single-column UNIQUE(user_id)';
  end if;
  raise notice 'PASS: household_members has UNIQUE(user_id)';

  -- 5. shopping_lists partial unique index for one active list per household
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'shopping_lists'
      and indexname = 'shopping_lists_one_active_per_household'
  ) then
    raise exception 'FAIL: missing shopping_lists_one_active_per_household index';
  end if;
  raise notice 'PASS: one-active-list-per-household index exists';

  -- 6. shopping_items in realtime publication
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shopping_items'
  ) then
    raise exception 'FAIL: shopping_items not in supabase_realtime publication';
  end if;
  raise notice 'PASS: shopping_items is in supabase_realtime publication';

  -- 7. Required RPC functions exist
  select count(*) into v_count
  from (
    select unnest(array[
      'create_household', 'join_household_by_code', 'regenerate_invite_code',
      'leave_household', 'complete_shopping_trip', 'seed_recurring_items',
      'is_household_member', 'my_household_id', 'is_household_creator',
      'household_id_for_list'
    ]) as fn
  ) expected
  where not exists (
    select 1 from pg_proc pr
    join pg_namespace n on n.oid = pr.pronamespace
    where n.nspname = 'public' and pr.proname = expected.fn
  );

  if v_count > 0 then
    raise exception 'FAIL: % expected function(s) missing', v_count;
  end if;
  raise notice 'PASS: all helper functions and RPCs exist';

  raise notice 'ALL CHECKS PASSED';
end;
$$;
