-- Phase 1: Row Level Security policies
-- All tables already have RLS enabled (00002). This file adds policies only.

-- ============================================================
-- profiles
-- SELECT: self, or a co-member of the same household (display info only —
-- column-level restriction is left to the application query in later phases)
-- INSERT/UPDATE: self only. No DELETE.
-- ============================================================
create policy profiles_select on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.household_members me
      join public.household_members them on them.household_id = me.household_id
      where me.user_id = auth.uid()
        and them.user_id = public.profiles.id
    )
  );

create policy profiles_insert_self on public.profiles
  for insert
  with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- households
-- SELECT: members only.
-- INSERT: none (only via create_household RPC, which is SECURITY DEFINER
--   and therefore bypasses RLS).
-- UPDATE: any member may update (e.g. household name); invite_code and
--   created_by are protected by the trigger below and may only change via
--   the regenerate_invite_code RPC.
-- DELETE: none (ADR-19 — no household deletion in Phase 1).
-- ============================================================
create policy households_select on public.households
  for select
  using (public.is_household_member(id));

create policy households_update_member on public.households
  for update
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

-- Guard: invite_code and created_by are immutable outside of trusted RPCs.
-- RPCs that legitimately change these set a local GUC before the UPDATE.
create or replace function public.enforce_household_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if current_setting('app.bypass_household_guard', true) = 'on' then
    return new;
  end if;

  if new.invite_code is distinct from old.invite_code then
    raise exception 'invite_code can only be changed via regenerate_invite_code()';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'created_by is immutable';
  end if;

  return new;
end;
$$;

create trigger households_enforce_immutable_fields
  before update on public.households
  for each row execute function public.enforce_household_immutable_fields();

-- ============================================================
-- household_members
-- SELECT: members of the same household (so members can see who's in it).
-- INSERT/UPDATE/DELETE: none directly — create_household, join_household_by_code
--   and leave_household RPCs are SECURITY DEFINER and bypass RLS.
-- ============================================================
create policy household_members_select on public.household_members
  for select
  using (public.is_household_member(household_id));

-- ============================================================
-- products
-- SELECT: system products (household_id is null) or own household's products.
-- INSERT/UPDATE/DELETE: any member, household-scoped rows only (ADR-15).
-- System rows (household_id is null) cannot be modified by users.
-- ============================================================
create policy products_select on public.products
  for select
  using (
    household_id is null
    or public.is_household_member(household_id)
  );

create policy products_insert_member on public.products
  for insert
  with check (
    household_id is not null
    and public.is_household_member(household_id)
  );

create policy products_update_member on public.products
  for update
  using (
    household_id is not null
    and public.is_household_member(household_id)
  )
  with check (
    household_id is not null
    and public.is_household_member(household_id)
  );

create policy products_delete_member on public.products
  for delete
  using (
    household_id is not null
    and public.is_household_member(household_id)
  );

-- ============================================================
-- shopping_lists
-- SELECT: members only.
-- INSERT/UPDATE: none directly — managed by create_household and
--   complete_shopping_trip RPCs (SECURITY DEFINER).
-- DELETE: none.
-- ============================================================
create policy shopping_lists_select on public.shopping_lists
  for select
  using (public.is_household_member(household_id));

-- ============================================================
-- shopping_items
-- SELECT: members of the list's household.
-- INSERT: member, and only onto their household's *active* list.
-- UPDATE/DELETE: member of the list's household.
-- ============================================================
create policy shopping_items_select on public.shopping_items
  for select
  using (public.is_household_member(public.household_id_for_list(list_id)));

create policy shopping_items_insert_member on public.shopping_items
  for insert
  with check (
    public.is_household_member(public.household_id_for_list(list_id))
    and exists (
      select 1 from public.shopping_lists sl
      where sl.id = list_id and sl.status = 'active'
    )
  );

create policy shopping_items_update_member on public.shopping_items
  for update
  using (public.is_household_member(public.household_id_for_list(list_id)))
  with check (public.is_household_member(public.household_id_for_list(list_id)));

create policy shopping_items_delete_member on public.shopping_items
  for delete
  using (public.is_household_member(public.household_id_for_list(list_id)));

-- ============================================================
-- recurring_products
-- Any member may CRUD their household's recurring products (ADR-15).
-- ============================================================
create policy recurring_products_select on public.recurring_products
  for select
  using (public.is_household_member(household_id));

create policy recurring_products_insert_member on public.recurring_products
  for insert
  with check (public.is_household_member(household_id));

create policy recurring_products_update_member on public.recurring_products
  for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy recurring_products_delete_member on public.recurring_products
  for delete
  using (public.is_household_member(household_id));

-- ============================================================
-- suggestion_dismissals
-- Per-user: a member may select/insert/delete only their own dismissals,
-- scoped to their own household.
-- ============================================================
create policy suggestion_dismissals_select on public.suggestion_dismissals
  for select
  using (user_id = auth.uid());

create policy suggestion_dismissals_insert_self on public.suggestion_dismissals
  for insert
  with check (
    user_id = auth.uid()
    and public.is_household_member(household_id)
  );

create policy suggestion_dismissals_delete_self on public.suggestion_dismissals
  for delete
  using (user_id = auth.uid());
