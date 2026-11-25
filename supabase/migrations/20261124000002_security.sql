-- =============================================================================
-- FORKLY — tenant isolation & permissions (Row Level Security)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper functions (security definer so they can read membership tables
-- without recursive RLS evaluation). All are scoped to auth.uid().
-- -----------------------------------------------------------------------------
create or replace function public.member_role(r uuid) returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.restaurant_members
   where restaurant_id = r and user_id = auth.uid() and status = 'active'
$$;

create or replace function public.is_member(r uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.restaurant_members
     where restaurant_id = r and user_id = auth.uid() and status = 'active'
  )
$$;

-- can(restaurant, section, 'view' | 'edit')
create or replace function public.can(r uuid, section text, action text default 'view') returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_role public.app_role;
  v_ok boolean;
begin
  v_role := public.member_role(r);
  if v_role is null then
    return false;
  end if;
  if v_role = 'owner' then
    return true;
  end if;
  select case when action = 'edit' then rp.can_edit else rp.can_view end
    into v_ok
    from public.role_permissions rp
   where rp.restaurant_id = r and rp.role = v_role and rp.section = can.section;
  return coalesce(v_ok, false);
end $$;

revoke all on function public.can(uuid, text, text) from public;
grant execute on function public.can(uuid, text, text) to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.member_role(uuid) to authenticated;

-- Default permission matrix used when a restaurant is created.
create or replace function public.seed_role_permissions(r uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  sections text[] := array['overview','orders','finances','inventory','menu','suppliers','team','analytics','assistant','integrations','settings'];
  s text;
begin
  foreach s in array sections loop
    insert into public.role_permissions (restaurant_id, role, section, can_view, can_edit) values
      (r, 'manager',    s, true, s <> 'settings'),
      (r, 'employee',   s, s in ('overview','orders','menu','inventory'), s = 'orders'),
      (r, 'accountant', s, s in ('overview','finances','analytics','suppliers','inventory','assistant'), s = 'finances'),
      (r, 'kitchen',    s, s in ('orders','menu','inventory'), s = 'orders')
    on conflict do nothing;
  end loop;
end $$;
revoke all on function public.seed_role_permissions(uuid) from public, authenticated;

-- -----------------------------------------------------------------------------
-- Enable RLS on every table
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.role_permissions enable row level security;
alter table public.invitations enable row level security;
alter table public.dashboard_layouts enable row level security;
alter table public.dashboard_widgets enable row level security;
alter table public.suppliers enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.revenue_records enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.time_entries enable row level security;
alter table public.integrations enable row level security;
alter table public.integration_credentials enable row level security; -- no policies: service role only
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- -----------------------------------------------------------------------------
-- Profiles: a user sees their own profile and profiles of co-members.
-- -----------------------------------------------------------------------------
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid() or exists (
      select 1 from public.restaurant_members a
      join public.restaurant_members b on a.restaurant_id = b.restaurant_id
      where a.user_id = auth.uid() and a.status = 'active' and b.user_id = profiles.id
    )
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- Restaurants: members can read; settings editors can update.
-- Creation happens only through create_restaurant() (0003).
-- -----------------------------------------------------------------------------
create policy restaurants_select on public.restaurants for select to authenticated
  using (public.is_member(id));
create policy restaurants_update on public.restaurants for update to authenticated
  using (public.can(id, 'settings', 'edit')) with check (public.can(id, 'settings', 'edit'));

create policy restaurant_settings_select on public.restaurant_settings for select to authenticated
  using (public.is_member(restaurant_id));
create policy restaurant_settings_update on public.restaurant_settings for update to authenticated
  using (public.can(restaurant_id, 'settings', 'edit')) with check (public.can(restaurant_id, 'settings', 'edit'));

-- Members: visible to co-members. Changes go through owner-only RPCs.
create policy members_select on public.restaurant_members for select to authenticated
  using (public.is_member(restaurant_id));

-- Permissions matrix: readable by members, editable by the owner only.
create policy role_permissions_select on public.role_permissions for select to authenticated
  using (public.is_member(restaurant_id));
create policy role_permissions_update on public.role_permissions for update to authenticated
  using (public.member_role(restaurant_id) = 'owner')
  with check (public.member_role(restaurant_id) = 'owner');

-- Invitations: team editors manage them. Accepting goes through accept_invitation().
create policy invitations_select on public.invitations for select to authenticated
  using (public.can(restaurant_id, 'team', 'edit'));
create policy invitations_insert on public.invitations for insert to authenticated
  with check (
    public.can(restaurant_id, 'team', 'edit')
    and (role <> 'manager' or public.member_role(restaurant_id) = 'owner')
  );
create policy invitations_delete on public.invitations for delete to authenticated
  using (public.can(restaurant_id, 'team', 'edit'));

-- Widget catalog is global read-only data.
create policy dashboard_widgets_select on public.dashboard_widgets for select to authenticated using (true);

-- Notifications: restaurant-wide (user_id null) or addressed to the user.
create policy notifications_select on public.notifications for select to authenticated
  using (public.is_member(restaurant_id) and (user_id is null or user_id = auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (public.is_member(restaurant_id) and (user_id is null or user_id = auth.uid()))
  with check (public.is_member(restaurant_id));

-- Audit log: members can read (powers the activity feed). Written by triggers only.
create policy audit_select on public.audit_logs for select to authenticated
  using (public.is_member(restaurant_id));

-- -----------------------------------------------------------------------------
-- Section-scoped tables: view => select, edit => insert/update/delete.
-- -----------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('dashboard_layouts', 'overview'),
      ('suppliers', 'suppliers'),
      ('purchase_orders', 'suppliers'),
      ('purchase_order_items', 'suppliers'),
      ('inventory_items', 'inventory'),
      ('inventory_movements', 'inventory'),
      ('menu_categories', 'menu'),
      ('menu_items', 'menu'),
      ('recipes', 'menu'),
      ('recipe_ingredients', 'menu'),
      ('orders', 'orders'),
      ('order_items', 'orders'),
      ('expenses', 'finances'),
      ('revenue_records', 'finances'),
      ('employees', 'team'),
      ('shifts', 'team'),
      ('time_entries', 'team'),
      ('integrations', 'integrations')
    ) as x(tbl, section)
  loop
    execute format(
      'create policy %1$s_select on public.%1$I for select to authenticated using (public.can(restaurant_id, %2$L, ''view''))',
      t.tbl, t.section);
    execute format(
      'create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.can(restaurant_id, %2$L, ''edit''))',
      t.tbl, t.section);
    execute format(
      'create policy %1$s_update on public.%1$I for update to authenticated using (public.can(restaurant_id, %2$L, ''edit'')) with check (public.can(restaurant_id, %2$L, ''edit''))',
      t.tbl, t.section);
    execute format(
      'create policy %1$s_delete on public.%1$I for delete to authenticated using (public.can(restaurant_id, %2$L, ''edit''))',
      t.tbl, t.section);
  end loop;
end $$;

-- Inventory movements are an append-only ledger: no edits or deletes by users.
drop policy inventory_movements_update on public.inventory_movements;
drop policy inventory_movements_delete on public.inventory_movements;

-- Staff can clock themselves in/out even without team edit rights.
create policy time_entries_self_insert on public.time_entries for insert to authenticated
  with check (exists (
    select 1 from public.employees e
    join public.restaurant_members m on m.id = e.member_id
    where e.id = employee_id and e.restaurant_id = time_entries.restaurant_id and m.user_id = auth.uid()
  ));
create policy time_entries_self_update on public.time_entries for update to authenticated
  using (exists (
    select 1 from public.employees e
    join public.restaurant_members m on m.id = e.member_id
    where e.id = employee_id and m.user_id = auth.uid()
  ));

-- Cross-tenant guard: a child row must reference parents in the same restaurant.
-- RLS alone checks the child's restaurant_id; these triggers stop a user from
-- attaching their row to another tenant's parent id.
create or replace function public.assert_same_restaurant() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  col text;
  parent_table text;
  parent_id uuid;
  parent_restaurant uuid;
  i int := 0;
begin
  while i < tg_nargs loop
    col := tg_argv[i];
    parent_table := tg_argv[i + 1];
    parent_id := (to_jsonb(new) ->> col)::uuid;
    if parent_id is not null then
      execute format('select restaurant_id from public.%I where id = $1', parent_table)
        into parent_restaurant using parent_id;
      if parent_restaurant is distinct from new.restaurant_id then
        raise exception 'Cross-restaurant reference rejected (%.%)', tg_table_name, col
          using errcode = '42501';
      end if;
    end if;
    i := i + 2;
  end loop;
  return new;
end $$;

create trigger guard_inventory_items before insert or update on public.inventory_items
  for each row execute function public.assert_same_restaurant('supplier_id', 'suppliers');
create trigger guard_inventory_movements before insert on public.inventory_movements
  for each row execute function public.assert_same_restaurant('inventory_item_id', 'inventory_items');
create trigger guard_menu_items before insert or update on public.menu_items
  for each row execute function public.assert_same_restaurant('category_id', 'menu_categories');
create trigger guard_recipes before insert or update on public.recipes
  for each row execute function public.assert_same_restaurant('menu_item_id', 'menu_items');
create trigger guard_recipe_ingredients before insert or update on public.recipe_ingredients
  for each row execute function public.assert_same_restaurant('recipe_id', 'recipes', 'inventory_item_id', 'inventory_items');
create trigger guard_order_items before insert or update on public.order_items
  for each row execute function public.assert_same_restaurant('order_id', 'orders', 'menu_item_id', 'menu_items');
create trigger guard_expenses before insert or update on public.expenses
  for each row execute function public.assert_same_restaurant('supplier_id', 'suppliers');
create trigger guard_revenue before insert or update on public.revenue_records
  for each row execute function public.assert_same_restaurant('order_id', 'orders');
create trigger guard_purchase_orders before insert or update on public.purchase_orders
  for each row execute function public.assert_same_restaurant('supplier_id', 'suppliers');
create trigger guard_po_items before insert or update on public.purchase_order_items
  for each row execute function public.assert_same_restaurant('purchase_order_id', 'purchase_orders', 'inventory_item_id', 'inventory_items');
create trigger guard_employees before insert or update on public.employees
  for each row execute function public.assert_same_restaurant('member_id', 'restaurant_members');
create trigger guard_shifts before insert or update on public.shifts
  for each row execute function public.assert_same_restaurant('employee_id', 'employees');
create trigger guard_time_entries before insert or update on public.time_entries
  for each row execute function public.assert_same_restaurant('employee_id', 'employees');

-- Prevent moving rows between tenants.
create or replace function public.forbid_restaurant_change() returns trigger
language plpgsql as $$
begin
  if new.restaurant_id is distinct from old.restaurant_id then
    raise exception 'restaurant_id cannot be changed' using errcode = '42501';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'restaurant_settings','dashboard_layouts','suppliers','inventory_items','menu_categories','menu_items',
    'recipes','recipe_ingredients','orders','order_items','expenses','revenue_records','purchase_orders',
    'purchase_order_items','employees','shifts','time_entries','integrations','notifications'
  ] loop
    execute format('create trigger %1$s_fixed_tenant before update on public.%1$I for each row execute function public.forbid_restaurant_change()', t);
  end loop;
end $$;
