-- Phase 1: core schema tables (RLS enabled, policies added in 00004)

-- ============================================================
-- profiles — extends auth.users
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- households
-- ============================================================
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.households enable row level security;

create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- ============================================================
-- household_members — one row per (household, user); UNIQUE(user_id)
-- enforces "one household per user" (ADR-11)
-- ============================================================
create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (household_id, user_id),
  unique (user_id)
);

alter table public.household_members enable row level security;

-- ============================================================
-- products — system catalog (household_id IS NULL) + household-scoped
-- ============================================================
create table public.products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id) on delete cascade,
  name text not null,
  category text not null,
  normalized_name text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

create unique index products_household_normalized_name_key
  on public.products (household_id, normalized_name)
  where household_id is not null;

-- ============================================================
-- shopping_lists — one active list per household (partial unique index)
-- ============================================================
create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  status text not null check (status in ('active', 'completed')),
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.shopping_lists enable row level security;

create unique index shopping_lists_one_active_per_household
  on public.shopping_lists (household_id)
  where status = 'active';

-- ============================================================
-- shopping_items — line items on a list
-- ============================================================
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity int not null check (quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'purchased', 'unavailable')),
  added_by uuid references public.profiles (id),
  status_updated_by uuid references public.profiles (id),
  status_updated_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (list_id, product_id)
);

alter table public.shopping_items enable row level security;

create trigger shopping_items_set_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

-- ============================================================
-- recurring_products — household staples auto-added each cycle
-- ============================================================
create table public.recurring_products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  product_id uuid not null references public.products (id),
  default_quantity int not null default 1,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, product_id)
);

alter table public.recurring_products enable row level security;

-- ============================================================
-- suggestion_dismissals — per-user dismissed "smart suggestion" chips
-- ============================================================
create table public.suggestion_dismissals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  unique (household_id, user_id, product_id)
);

alter table public.suggestion_dismissals enable row level security;
