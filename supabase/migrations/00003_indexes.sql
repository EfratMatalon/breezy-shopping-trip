-- Phase 1: supporting indexes (unique indexes already created inline in 00002)

-- Resolve members of a household
create index idx_members_household on public.household_members (household_id);

-- Fetch active / completed lists for a household
create index idx_lists_household_status on public.shopping_lists (household_id, status);

-- Load cart items for a list
create index idx_items_list on public.shopping_items (list_id);

-- Filter pending vs purchased vs unavailable within a list
create index idx_items_list_status on public.shopping_items (list_id, status);

-- Household catalog lookups
create index idx_products_household on public.products (household_id);

-- Quick-add dedupe by normalized name within a household
create index idx_products_normalized on public.products (household_id, normalized_name);

-- Join-by-code lookup
create index idx_households_invite_code on public.households (invite_code);

-- Enabled recurring products for a household
create index idx_recurring_household on public.recurring_products (household_id) where enabled;
