-- Phase 1: extensions, helper functions, shared triggers
-- Tables referenced here (households, household_members, shopping_lists, profiles)
-- are created in 00002_tables.sql. plpgsql function bodies are not validated
-- against table existence at creation time, so this ordering is safe.

create extension if not exists pgcrypto;

-- ============================================================
-- Shared trigger: maintain updated_at on mutable tables
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Trigger: bootstrap a profiles row when a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Helper: is the current user a member of the given household?
-- ============================================================
create or replace function public.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = auth.uid()
  );
$$;

-- ============================================================
-- Helper: the single household_id for the current user, or NULL
-- ============================================================
create or replace function public.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select hm.household_id
  from public.household_members hm
  where hm.user_id = auth.uid()
  limit 1;
$$;

-- ============================================================
-- Helper: is the current user the creator of the given household?
-- ============================================================
create or replace function public.is_household_creator(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.households h
    where h.id = p_household_id
      and h.created_by = auth.uid()
  );
$$;

-- ============================================================
-- Helper: resolve household_id for a given shopping_list id
-- (used by shopping_items RLS policies)
-- ============================================================
create or replace function public.household_id_for_list(p_list_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sl.household_id
  from public.shopping_lists sl
  where sl.id = p_list_id;
$$;
