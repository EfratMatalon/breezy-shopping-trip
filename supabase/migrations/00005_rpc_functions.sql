-- Phase 1: RPC functions for household lifecycle and trip completion.
-- All RPCs are SECURITY DEFINER with `search_path = public` and explicit
-- auth.uid() checks. Error contract uses simple message codes that the
-- frontend can match: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT,
-- ALREADY_IN_HOUSEHOLD.

-- ============================================================
-- Internal: generate a unique 8-character Crockford Base32 invite code
-- ============================================================
create or replace function public.generate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; -- Crockford Base32 (no I, L, O, U)
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    end loop;
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ============================================================
-- Internal: insert pending items from enabled recurring_products into a list
-- Skips products already present on the list (merge rule).
-- ============================================================
create or replace function public.seed_recurring_items(p_list_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
begin
  select household_id into v_household_id
  from public.shopping_lists
  where id = p_list_id;

  if v_household_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  insert into public.shopping_items (list_id, product_id, quantity, status)
  select p_list_id, rp.product_id, rp.default_quantity, 'pending'
  from public.recurring_products rp
  where rp.household_id = v_household_id
    and rp.enabled = true
  on conflict (list_id, product_id) do nothing;
end;
$$;

-- ============================================================
-- create_household(name) — household + membership + active list + recurring seed
-- Fails if the caller already has a household membership.
-- ============================================================
create or replace function public.create_household(p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_list_id uuid;
  v_invite_code text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'ALREADY_IN_HOUSEHOLD' using errcode = '23505';
  end if;

  v_invite_code := public.generate_invite_code();

  insert into public.households (name, invite_code, created_by)
  values (trim(p_name), v_invite_code, auth.uid())
  returning id into v_household_id;

  insert into public.household_members (household_id, user_id)
  values (v_household_id, auth.uid());

  insert into public.shopping_lists (household_id, status)
  values (v_household_id, 'active')
  returning id into v_list_id;

  perform public.seed_recurring_items(v_list_id);

  return jsonb_build_object(
    'household_id', v_household_id,
    'invite_code', v_invite_code,
    'list_id', v_list_id
  );
end;
$$;

-- ============================================================
-- join_household_by_code(code) — add membership via invite code
-- Idempotent if already a member of the target household.
-- Fails if the caller is already a member of a *different* household.
-- ============================================================
create or replace function public.join_household_by_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_household_id uuid;
  v_existing_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  select id into v_household_id
  from public.households
  where invite_code = upper(trim(p_code));

  if v_household_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  select household_id into v_existing_household_id
  from public.household_members
  where user_id = auth.uid();

  if v_existing_household_id is not null then
    if v_existing_household_id = v_household_id then
      -- already a member of this household: idempotent success
      return jsonb_build_object('household_id', v_household_id);
    end if;
    raise exception 'ALREADY_IN_HOUSEHOLD' using errcode = '23505';
  end if;

  insert into public.household_members (household_id, user_id)
  values (v_household_id, auth.uid());

  return jsonb_build_object('household_id', v_household_id);
end;
$$;

-- ============================================================
-- regenerate_invite_code(household_id) — creator only (ADR-17)
-- ============================================================
create or replace function public.regenerate_invite_code(p_household_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_code text;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if not public.is_household_creator(p_household_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_new_code := public.generate_invite_code();

  perform set_config('app.bypass_household_guard', 'on', true);

  update public.households
  set invite_code = v_new_code
  where id = p_household_id;

  perform set_config('app.bypass_household_guard', 'off', true);

  return v_new_code;
end;
$$;

-- ============================================================
-- leave_household() — removes only the caller's membership row (self only)
-- ============================================================
create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  delete from public.household_members
  where user_id = auth.uid();

  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
end;
$$;

-- ============================================================
-- complete_shopping_trip(household_id) — Appendix B
-- 1. Validate membership.
-- 2. Complete current active list.
-- 3. Create new active list.
-- 4. Carry over `unavailable` items as `pending`.
-- 5. Auto-add enabled recurring products (merge: skip if product already
--    carried over from step 4).
-- 6. Return the new list_id.
-- ============================================================
create or replace function public.complete_shopping_trip(p_household_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_list_id uuid;
  v_new_list_id uuid;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select id into v_old_list_id
  from public.shopping_lists
  where household_id = p_household_id and status = 'active';

  if v_old_list_id is null then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.shopping_lists
  set status = 'completed',
      completed_at = now(),
      completed_by = auth.uid()
  where id = v_old_list_id;

  insert into public.shopping_lists (household_id, status)
  values (p_household_id, 'active')
  returning id into v_new_list_id;

  -- Carry over unavailable items as pending (preserve quantity)
  insert into public.shopping_items (list_id, product_id, quantity, status, added_by)
  select v_new_list_id, si.product_id, si.quantity, 'pending', auth.uid()
  from public.shopping_items si
  where si.list_id = v_old_list_id
    and si.status = 'unavailable'
  on conflict (list_id, product_id) do nothing;

  -- Auto-add enabled recurring products, skipping products already carried over
  perform public.seed_recurring_items(v_new_list_id);

  return v_new_list_id;
end;
$$;
