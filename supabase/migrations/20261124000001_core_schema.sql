-- =============================================================================
-- FORKLY — core schema
-- Multi-tenant restaurant management. Every restaurant-owned row carries
-- restaurant_id and is protected by Row Level Security (see 0002).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.app_role as enum ('owner', 'manager', 'employee', 'accountant', 'kitchen');
create type public.member_status as enum ('active', 'suspended');
create type public.order_status as enum ('new', 'accepted', 'preparing', 'ready', 'completed', 'cancelled');
create type public.order_source as enum ('website', 'manual', 'pos', 'ifood', 'ubereats', 'doordash', 'other');
create type public.inventory_unit as enum ('kg', 'g', 'l', 'ml', 'unit', 'box');
create type public.movement_type as enum ('purchase', 'usage', 'waste', 'adjustment', 'order_deduction', 'po_receipt', 'initial');
create type public.expense_category as enum (
  'ingredients', 'rent', 'salaries', 'electricity', 'water', 'gas', 'marketing',
  'equipment', 'delivery_fees', 'taxes', 'other'
);
create type public.recurrence as enum ('weekly', 'monthly', 'yearly');
create type public.revenue_source as enum ('order', 'manual', 'catering', 'event', 'other');
create type public.po_status as enum ('draft', 'sent', 'confirmed', 'received', 'cancelled');
create type public.employment_status as enum ('active', 'on_leave', 'inactive');
create type public.integration_status as enum ('disconnected', 'pending', 'connected', 'error', 'demo');

-- -----------------------------------------------------------------------------
-- Utility: updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Users / profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  last_restaurant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Restaurants (tenants)
-- -----------------------------------------------------------------------------
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique,
  restaurant_type text,
  logo_url text,
  cover_url text,
  brand_color text not null default '#3F6B4E' check (brand_color ~* '^#[0-9a-f]{6}$'),
  accent_color text not null default '#C8743A' check (accent_color ~* '^#[0-9a-f]{6}$'),
  currency text not null default 'USD' check (char_length(currency) = 3),
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  date_format text not null default 'MMM d, yyyy',
  business_hours jsonb not null default '{}'::jsonb,
  address text,
  phone text,
  email text,
  website text,
  is_demo boolean not null default false,
  onboarding_step int not null default 2,
  onboarding_completed_at timestamptz,
  plan text not null default 'trial',
  order_counter int not null default 1000,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger restaurants_touch before update on public.restaurants
  for each row execute function public.touch_updated_at();

create table public.restaurant_settings (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  inventory_auto_deduct boolean not null default true,
  default_prep_minutes int not null default 15 check (default_prep_minutes between 1 and 240),
  tax_rate numeric(6, 3) not null default 0 check (tax_rate >= 0 and tax_rate < 100),
  notifications jsonb not null default '{"low_stock": true, "new_order": true, "upcoming_bills": true, "unusual_expenses": true}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger restaurant_settings_touch before update on public.restaurant_settings
  for each row execute function public.touch_updated_at();

create table public.restaurant_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null default 'employee',
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);
create index on public.restaurant_members (user_id);

-- Section-level permissions per role, configurable by the owner.
-- Owners always have full access and are not stored here.
create table public.role_permissions (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role public.app_role not null check (role <> 'owner'),
  section text not null check (section in (
    'overview', 'orders', 'finances', 'inventory', 'menu', 'suppliers', 'team',
    'analytics', 'assistant', 'integrations', 'settings'
  )),
  can_view boolean not null default false,
  can_edit boolean not null default false,
  primary key (restaurant_id, role, section),
  check (not can_edit or can_view)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.app_role not null check (role <> 'owner'),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now()
);
create index on public.invitations (restaurant_id);

-- -----------------------------------------------------------------------------
-- Dashboard configuration
-- widgets: [{ "id": "w1", "type": "kpi_revenue", "size": "sm|md|lg|xl", "config": {...} }]
-- -----------------------------------------------------------------------------
create table public.dashboard_layouts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null default 'My dashboard' check (char_length(name) between 1 and 60),
  is_active boolean not null default false,
  density text not null default 'comfortable' check (density in ('compact', 'comfortable')),
  widgets jsonb not null default '[]'::jsonb check (jsonb_typeof(widgets) = 'array'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.dashboard_layouts (restaurant_id);
create unique index dashboard_one_active on public.dashboard_layouts (restaurant_id) where is_active;
create trigger dashboard_layouts_touch before update on public.dashboard_layouts
  for each row execute function public.touch_updated_at();

-- Catalog of widget types available in the widget library (global, read-only).
create table public.dashboard_widgets (
  type text primary key,
  title text not null,
  description text not null,
  section text not null,
  default_size text not null default 'sm'
);

-- -----------------------------------------------------------------------------
-- Suppliers
-- -----------------------------------------------------------------------------
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  contact_name text,
  phone text,
  email text,
  address text,
  products_supplied text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.suppliers (restaurant_id);
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Inventory
-- -----------------------------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  category text not null default 'General',
  quantity numeric(14, 3) not null default 0,
  unit public.inventory_unit not null default 'unit',
  min_quantity numeric(14, 3) not null default 0 check (min_quantity >= 0),
  unit_cost numeric(14, 4) not null default 0 check (unit_cost >= 0),
  supplier_id uuid references public.suppliers (id) on delete set null,
  expires_on date,
  storage_location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.inventory_items (restaurant_id);
create trigger inventory_items_touch before update on public.inventory_items
  for each row execute function public.touch_updated_at();

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  type public.movement_type not null,
  quantity_delta numeric(14, 3) not null check (quantity_delta <> 0),
  unit_cost numeric(14, 4),
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.inventory_movements (restaurant_id, created_at desc);
create index on public.inventory_movements (inventory_item_id, created_at desc);

-- Movements are the source of truth for stock: applying one updates the item.
create or replace function public.apply_inventory_movement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.inventory_items
     set quantity = quantity + new.quantity_delta,
         unit_cost = case
           when new.type in ('purchase', 'po_receipt') and new.unit_cost is not null and new.unit_cost > 0
             then new.unit_cost
           else unit_cost end
   where id = new.inventory_item_id and restaurant_id = new.restaurant_id;
  if not found then
    raise exception 'Inventory item does not belong to this restaurant';
  end if;
  return new;
end $$;

create trigger inventory_movements_apply after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- Unit conversion between compatible units (mass, volume). Returns null when incompatible.
create or replace function public.convert_quantity(qty numeric, from_unit public.inventory_unit, to_unit public.inventory_unit)
returns numeric language sql immutable as $$
  select case
    when from_unit = to_unit then qty
    when from_unit = 'g'  and to_unit = 'kg' then qty / 1000
    when from_unit = 'kg' and to_unit = 'g'  then qty * 1000
    when from_unit = 'ml' and to_unit = 'l'  then qty / 1000
    when from_unit = 'l'  and to_unit = 'ml' then qty * 1000
    else null end
$$;

-- -----------------------------------------------------------------------------
-- Menu & recipes
-- -----------------------------------------------------------------------------
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid references public.menu_categories (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  description text,
  photo_url text,
  price numeric(12, 2) not null check (price >= 0),
  is_available boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.menu_items (restaurant_id);
create trigger menu_items_touch before update on public.menu_items
  for each row execute function public.touch_updated_at();

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  menu_item_id uuid not null unique references public.menu_items (id) on delete cascade,
  instructions text,
  prep_minutes int check (prep_minutes is null or prep_minutes between 0 and 600),
  deduct_on_completion boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit public.inventory_unit not null,
  unique (recipe_id, inventory_item_id)
);

-- Estimated food cost per menu item (uses current inventory unit costs).
create or replace view public.menu_item_costs with (security_invoker = true) as
select
  mi.id as menu_item_id,
  mi.restaurant_id,
  mi.price,
  coalesce(sum(public.convert_quantity(ri.quantity, ri.unit, ii.unit) * ii.unit_cost), 0)::numeric(12, 4) as food_cost,
  count(ri.id) as ingredient_count,
  bool_or(ri.id is not null and public.convert_quantity(ri.quantity, ri.unit, ii.unit) is null) as has_unit_mismatch
from public.menu_items mi
left join public.recipes r on r.menu_item_id = mi.id
left join public.recipe_ingredients ri on ri.recipe_id = r.id
left join public.inventory_items ii on ii.id = ri.inventory_item_id
group by mi.id;

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  number int not null,
  source public.order_source not null default 'manual',
  external_id text,
  is_simulated boolean not null default false,
  status public.order_status not null default 'new',
  fulfillment text not null default 'dine_in' check (fulfillment in ('dine_in', 'takeaway', 'delivery')),
  table_label text,
  customer_name text,
  customer_phone text,
  notes text,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(12, 2) not null default 0,
  payment_method text,
  estimated_prep_minutes int,
  inventory_deducted boolean not null default false,
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, number),
  unique (restaurant_id, source, external_id)
);
create index on public.orders (restaurant_id, created_at desc);
create index on public.orders (restaurant_id, status);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name text not null,
  quantity int not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  modifiers text,
  notes text,
  total numeric(12, 2) generated always as (quantity * unit_price) stored
);
create index on public.order_items (order_id);
create index on public.order_items (restaurant_id, menu_item_id);

-- Per-restaurant sequential order numbers.
create or replace function public.assign_order_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.restaurants set order_counter = order_counter + 1
   where id = new.restaurant_id
   returning order_counter into new.number;
  return new;
end $$;

create trigger orders_number before insert on public.orders
  for each row execute function public.assign_order_number();

-- -----------------------------------------------------------------------------
-- Finances
-- -----------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 200),
  amount numeric(12, 2) not null check (amount > 0),
  category public.expense_category not null,
  date date not null default current_date,
  supplier_id uuid references public.suppliers (id) on delete set null,
  payment_method text,
  is_recurring boolean not null default false,
  recurrence public.recurrence,
  next_due_on date,
  recurring_parent_id uuid references public.expenses (id) on delete set null,
  notes text,
  receipt_path text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not is_recurring or recurrence is not null)
);
create index on public.expenses (restaurant_id, date desc);
create trigger expenses_touch before update on public.expenses
  for each row execute function public.touch_updated_at();

create table public.revenue_records (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  source public.revenue_source not null default 'manual',
  date date not null default current_date,
  order_id uuid unique references public.orders (id) on delete cascade,
  payment_method text,
  notes text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index on public.revenue_records (restaurant_id, date desc);

-- -----------------------------------------------------------------------------
-- Purchasing
-- -----------------------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  status public.po_status not null default 'draft',
  expected_on date,
  notes text,
  received_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.purchase_orders (restaurant_id, created_at desc);
create trigger purchase_orders_touch before update on public.purchase_orders
  for each row execute function public.touch_updated_at();

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0)
);

-- -----------------------------------------------------------------------------
-- Team
-- -----------------------------------------------------------------------------
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  member_id uuid references public.restaurant_members (id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 120),
  position text,
  email text,
  phone text,
  role public.app_role not null default 'employee',
  status public.employment_status not null default 'active',
  availability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.employees (restaurant_id);
create trigger employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  position text,
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index on public.shifts (restaurant_id, starts_at);

create table public.time_entries (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  created_at timestamptz not null default now(),
  check (clock_out is null or clock_out > clock_in)
);
create index on public.time_entries (restaurant_id, clock_in desc);

-- -----------------------------------------------------------------------------
-- Integrations
-- -----------------------------------------------------------------------------
create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  provider text not null,
  status public.integration_status not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, provider)
);
create trigger integrations_touch before update on public.integrations
  for each row execute function public.touch_updated_at();

-- Tokens are only readable by the service role (no RLS policies for users).
create table public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  integration_id uuid not null unique references public.integrations (id) on delete cascade,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scopes text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Notifications & audit
-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications (restaurant_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  summary text,
  data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_logs (restaurant_id, created_at desc);
