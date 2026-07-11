-- Phase 5 Slice 3: replace complete_shopping_trip with a version that
-- (a) accepts the active list id for race-condition protection,
-- (b) accepts a boolean controlling whether unavailable items carry over, and
-- (c) returns both the archived list id and the new active list id.

-- Drop the old single-argument signature first.
drop function if exists public.complete_shopping_trip(uuid);

-- ============================================================
-- complete_shopping_trip(p_household_id, p_active_list_id, p_carry_unavailable)
--
-- Executes as a single transaction (implicit in PL/pgSQL):
-- 1. Verify caller is a household member.
-- 2. Verify p_active_list_id is still the active list (abort if not).
-- 3. Archive it: status → completed, record completed_at / completed_by.
-- 4. Create a new active shopping list for the household.
-- 5. If p_carry_unavailable = true, copy every unavailable item into the
--    new list as pending (preserve quantity).
-- 6. Return jsonb with new_list_id and archived_list_id.
-- ============================================================
create or replace function public.complete_shopping_trip(
  p_household_id      uuid,
  p_active_list_id    uuid,
  p_carry_unavailable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_list_id uuid;
begin
  -- Auth guard
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Verify the supplied list is still the active list for this household.
  -- This prevents double-completion when two members tap simultaneously.
  if not exists (
    select 1
    from public.shopping_lists
    where id = p_active_list_id
      and household_id = p_household_id
      and status = 'active'
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Archive the current list.
  update public.shopping_lists
  set status       = 'completed',
      completed_at = now(),
      completed_by = auth.uid()
  where id = p_active_list_id;

  -- Create the new active list.
  insert into public.shopping_lists (household_id, status)
  values (p_household_id, 'active')
  returning id into v_new_list_id;

  -- Optionally carry over unavailable items as pending.
  if p_carry_unavailable then
    insert into public.shopping_items (list_id, product_id, quantity, status, added_by)
    select v_new_list_id, si.product_id, si.quantity, 'pending', auth.uid()
    from public.shopping_items si
    where si.list_id = p_active_list_id
      and si.status = 'unavailable'
    on conflict (list_id, product_id) do nothing;
  end if;

  return jsonb_build_object(
    'new_list_id',      v_new_list_id,
    'archived_list_id', p_active_list_id
  );
end;
$$;
