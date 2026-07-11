-- Phase 5: add p_carry_pending parameter to complete_shopping_trip.
-- Drops v2 (3-arg) and replaces with v3 (4-arg).

drop function if exists public.complete_shopping_trip(uuid, uuid, boolean);

-- ============================================================
-- complete_shopping_trip(p_household_id, p_active_list_id,
--                        p_carry_pending, p_carry_unavailable)
--
-- Single transaction:
-- 1. Auth + membership guard.
-- 2. Verify p_active_list_id is still active (race-condition guard).
-- 3. Archive current list.
-- 4. Create new active list.
-- 5. If p_carry_pending  = true → copy pending items to new list.
-- 6. If p_carry_unavailable = true → copy unavailable items as pending.
-- 7. Return { new_list_id, archived_list_id }.
-- ============================================================
create or replace function public.complete_shopping_trip(
  p_household_id      uuid,
  p_active_list_id    uuid,
  p_carry_pending     boolean,
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
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED' using errcode = '28000';
  end if;

  if not public.is_household_member(p_household_id) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  -- Race-condition guard: abort if list was already completed by another member.
  if not exists (
    select 1
    from public.shopping_lists
    where id            = p_active_list_id
      and household_id  = p_household_id
      and status        = 'active'
  ) then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Archive.
  update public.shopping_lists
  set status       = 'completed',
      completed_at = now(),
      completed_by = auth.uid()
  where id = p_active_list_id;

  -- New active list.
  insert into public.shopping_lists (household_id, status)
  values (p_household_id, 'active')
  returning id into v_new_list_id;

  -- Carry pending items (as pending).
  if p_carry_pending then
    insert into public.shopping_items (list_id, product_id, quantity, status, added_by)
    select v_new_list_id, si.product_id, si.quantity, 'pending', auth.uid()
    from public.shopping_items si
    where si.list_id = p_active_list_id
      and si.status  = 'pending'
    on conflict (list_id, product_id) do nothing;
  end if;

  -- Carry unavailable items (as pending).
  if p_carry_unavailable then
    insert into public.shopping_items (list_id, product_id, quantity, status, added_by)
    select v_new_list_id, si.product_id, si.quantity, 'pending', auth.uid()
    from public.shopping_items si
    where si.list_id = p_active_list_id
      and si.status  = 'unavailable'
    on conflict (list_id, product_id) do nothing;
  end if;

  return jsonb_build_object(
    'new_list_id',      v_new_list_id,
    'archived_list_id', p_active_list_id
  );
end;
$$;
