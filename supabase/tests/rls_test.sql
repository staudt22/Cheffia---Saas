-- Tenant isolation, permissions and business-logic tests.
-- Run with: npm run db:test  (see scripts/db-test.sh)
\set ON_ERROR_STOP 1
\set QUIET 1

create or replace function pg_temp.as_user(u uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), false);
  if u is null then execute 'set role anon'; else execute 'set role authenticated'; end if;
end $$;

create or replace function pg_temp.check(ok boolean, label text) returns void language plpgsql as $$
begin
  if not ok then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$;

-- Returns true when the statement is rejected.
create or replace function pg_temp.rejects(sql text) returns boolean language plpgsql as $$
begin
  execute sql;
  return false;
exception when others then
  return true;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@one.test', '{"full_name":"Ana Owner"}'),
  ('00000000-0000-0000-0000-00000000000b', 'ben@two.test', '{"full_name":"Ben Owner"}'),
  ('00000000-0000-0000-0000-00000000000c', 'kai@one.test', '{"full_name":"Kai Kitchen"}'),
  ('00000000-0000-0000-0000-00000000000d', 'ada@one.test', '{"full_name":"Ada Accountant"}'),
  ('00000000-0000-0000-0000-00000000000e', 'eve@nowhere.test', '{"full_name":"Eve Outsider"}');

select pg_temp.check((select count(*) = 5 from public.profiles), 'profiles created by auth trigger');

-- ---------------------------------------------------------------- workspaces
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.create_restaurant('Ana''s Bistro') as r1 \gset
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.create_restaurant('Ben Burgers Demo', true) as r2 \gset
select public.seed_demo_restaurant(:'r2');

select pg_temp.check((select count(*) from public.orders) > 500, 'demo seed created order history');
select pg_temp.check((select count(*) from public.orders where is_simulated) > 0, 'delivery-platform demo orders are flagged simulated');
select pg_temp.check((select count(*) from public.revenue_records where source = 'order') > 500, 'completed orders produced revenue records');
select pg_temp.check((select count(*) from public.expenses where recurring_parent_id is not null) >= 6, 'recurring expenses materialised');

-- --------------------------------------------------------------- isolation
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from public.restaurants) = 1, 'owner A sees only their restaurant');
select pg_temp.check((select count(*) from public.orders) = 0, 'owner A sees no orders from restaurant B');
select pg_temp.check((select count(*) from public.expenses) = 0, 'owner A sees no expenses from restaurant B');
select pg_temp.check((select count(*) from public.audit_logs where restaurant_id = :'r2') = 0, 'owner A cannot read B audit log');
select pg_temp.check(pg_temp.rejects(format(
  $q$insert into public.inventory_items (restaurant_id, name) values (%L, 'Hijack')$q$, :'r2')),
  'owner A cannot insert into restaurant B');
select pg_temp.check((select count(*) from public.integration_credentials) = 0, 'credentials table invisible to users');

update public.restaurants set name = 'Hacked' where id = :'r2';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select name from public.restaurants where id = :'r2') = 'Ben Burgers Demo', 'owner A cannot rename restaurant B');
select id as b_menu_item from public.menu_items limit 1 \gset
select id as b_inv_item from public.inventory_items limit 1 \gset

-- ------------------------------------------------ cross-tenant references
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into public.menu_categories (restaurant_id, name) values (:'r1', 'Mains');
insert into public.inventory_items (restaurant_id, name, unit, quantity, unit_cost, min_quantity)
  values (:'r1', 'Beef', 'kg', 0, 10, 2) returning id as a_beef \gset
insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta)
  values (:'r1', :'a_beef', 'purchase', 10);
insert into public.menu_items (restaurant_id, name, price) values (:'r1', 'Steak frites', 25) returning id as a_steak \gset
insert into public.recipes (restaurant_id, menu_item_id, prep_minutes) values (:'r1', :'a_steak', 20) returning id as a_recipe \gset
insert into public.recipe_ingredients (restaurant_id, recipe_id, inventory_item_id, quantity, unit)
  values (:'r1', :'a_recipe', :'a_beef', 250, 'g');

select pg_temp.check(pg_temp.rejects(format(
  $q$insert into public.recipe_ingredients (restaurant_id, recipe_id, inventory_item_id, quantity, unit) values (%L, %L, %L, 1, 'unit')$q$,
  :'r1', :'a_recipe', :'b_inv_item')), 'cannot attach another restaurant''s ingredient');
select pg_temp.check(pg_temp.rejects(format(
  $q$select public.create_order(%L, '[{"menu_item_id": "%s", "quantity": 1}]'::jsonb)$q$, :'r1', :'b_menu_item')),
  'cannot order another restaurant''s menu item');
select pg_temp.check(pg_temp.rejects(format(
  $q$select public.create_order(%L, '[{"menu_item_id": "%s", "quantity": 1}]'::jsonb)$q$, :'r2', :'a_steak')),
  'cannot create orders in restaurant B');
select pg_temp.check(pg_temp.rejects(format(
  $q$update public.menu_items set restaurant_id = %L where id = %L$q$, :'r2', :'a_steak')),
  'cannot move a row to another tenant');

select pg_temp.check((select food_cost from public.menu_item_costs where menu_item_id = :'a_steak') = 2.5,
  'recipe cost converts grams to kg (250g × $10/kg = $2.50)');

-- --------------------------------------------------------- order lifecycle
select public.create_order(:'r1', format('[{"menu_item_id": "%s", "quantity": 2, "modifiers": "Medium rare"}]', :'a_steak')::jsonb,
  'manual', 'dine_in', null, null, 'T4', null, 5) as a_order \gset
select pg_temp.check((select total from public.orders where id = :'a_order') = 45, 'order total uses menu prices minus discount (2×25−5)');
select pg_temp.check((select estimated_prep_minutes from public.orders where id = :'a_order') = 20, 'prep time taken from recipe');
update public.orders set status = 'preparing' where id = :'a_order';
update public.orders set status = 'completed' where id = :'a_order';
select pg_temp.check((select amount from public.revenue_records where order_id = :'a_order') = 45, 'completion records revenue');
select pg_temp.check((select quantity from public.inventory_items where id = :'a_beef') = 9.5, 'completion deducts recipe stock (10kg − 2×250g)');
update public.orders set status = 'cancelled' where id = :'a_order';
select pg_temp.check(not exists (select 1 from public.revenue_records where order_id = :'a_order'), 'cancelling a completed order removes revenue');
select pg_temp.check((select quantity from public.inventory_items where id = :'a_beef') = 10, 'cancelling restores stock');
select pg_temp.check(pg_temp.rejects(format($q$update public.orders set status = 'new' where id = %L$q$, :'a_order')),
  'cancelled orders cannot be reopened');
select pg_temp.check(pg_temp.rejects(format(
  $q$update public.inventory_movements set quantity_delta = 999 where inventory_item_id = %L$q$, :'a_beef'))
  or (select quantity from public.inventory_items where id = :'a_beef') = 10, 'inventory ledger is append-only');

-- ---------------------------------------------------------- roles & invites
insert into public.invitations (restaurant_id, email, role) values (:'r1', 'kai@one.test', 'kitchen') returning token as kai_token \gset
insert into public.invitations (restaurant_id, email, role) values (:'r1', 'ada@one.test', 'accountant') returning token as ada_token \gset
insert into public.expenses (restaurant_id, description, amount, category) values (:'r1', 'Rent', 3000, 'rent');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check(pg_temp.rejects(format($q$select public.accept_invitation(%L)$q$, :'kai_token')), 'invite cannot be accepted by a different email');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.accept_invitation(:'kai_token');
select pg_temp.check((select count(*) from public.orders) = 1, 'kitchen staff can see orders');
select pg_temp.check((select count(*) from public.expenses) = 0, 'kitchen staff cannot see expenses');
select pg_temp.check(pg_temp.rejects(format(
  $q$insert into public.expenses (restaurant_id, description, amount, category) values (%L, 'x', 1, 'other')$q$, :'r1')),
  'kitchen staff cannot add expenses');
select pg_temp.check(pg_temp.rejects(format($q$update public.restaurants set name = 'x' where id = %L and true returning 1$q$, :'r1'))
  or (select name from public.restaurants where id = :'r1') = 'Ana''s Bistro', 'kitchen staff cannot edit restaurant settings');
select pg_temp.check(pg_temp.rejects(format(
  $q$update public.role_permissions set can_view = true where restaurant_id = %L returning 1$q$, :'r1'))
  or not exists (select 1 from public.role_permissions where restaurant_id = :'r1' and role = 'kitchen' and section = 'finances' and can_view),
  'kitchen staff cannot change permissions');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select public.accept_invitation(:'ada_token');
select pg_temp.check((select count(*) from public.expenses) = 1, 'accountant can see expenses');
select pg_temp.check((select count(*) from public.orders) = 0, 'accountant cannot see orders by default');
select pg_temp.check((select revenue from public.period_totals(:'r1', current_date - 30, current_date)) = 0
  and (select expenses from public.period_totals(:'r1', current_date - 30, current_date)) = 3000, 'accountant metrics are RLS-scoped');

-- Owner grants finances to kitchen; permission takes effect immediately.
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
update public.role_permissions set can_view = true where restaurant_id = :'r1' and role = 'kitchen' and section = 'finances';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.check((select count(*) from public.expenses) = 1, 'owner-granted permission takes effect');
select pg_temp.check(pg_temp.rejects(format(
  $q$select public.update_member_role(id, 'manager') from public.restaurant_members where restaurant_id = %L and user_id = auth.uid()$q$, :'r1')),
  'non-owner cannot change roles');

-- ----------------------------------------------------------------- outsider
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.check((select count(*) from public.restaurants) = 0, 'outsider sees no restaurants');
select pg_temp.check((select count(*) from public.orders) + (select count(*) from public.inventory_items) = 0, 'outsider sees no data');
select pg_temp.check((select revenue from public.period_totals(:'r2', current_date - 30, current_date)) = 0, 'outsider metrics are empty');
select pg_temp.check(pg_temp.rejects(format($q$select public.seed_demo_restaurant(%L)$q$, :'r2')), 'outsider cannot seed demo data');

select pg_temp.as_user(null);
select pg_temp.check(pg_temp.rejects(format($q$select public.create_order(%L, '[]'::jsonb)$q$, :'r1')), 'anonymous cannot call create_order');
select pg_temp.check(pg_temp.rejects($q$select public.create_restaurant('Anon')$q$), 'anonymous cannot create restaurants');
select pg_temp.check((select count(*) from public.invitation_preview(:'kai_token')) = 1, 'anonymous can preview an invitation link');

-- ------------------------------------------------------------- demo metrics
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select revenue from public.period_totals(:'r2', current_date - 30, current_date - 1)) > 10000, 'demo revenue last 30 days is realistic');
select pg_temp.check((select count(*) from public.daily_series(:'r2', current_date - 6, current_date)) = 7, 'daily series returns one row per day');
select pg_temp.check((select count(*) from public.revenue_series(:'r2', current_date - 1, current_date - 1, 'hour')) >= 5, 'hourly revenue series');
select pg_temp.check((select count(*) from public.product_performance(:'r2', current_date - 30, current_date) where margin is not null) >= 8, 'product margins computed from recipes');
select pg_temp.check((select count(*) from public.inventory_items where quantity <= min_quantity) >= 2, 'demo has low-stock items for alerts');
select pg_temp.check((select count(*) from public.audit_logs) > 0, 'activity feed populated');
select id as b_po from public.purchase_orders limit 1 \gset
select quantity as beef_before from public.inventory_items where name = 'Ground beef' \gset
select public.receive_purchase_order(:'b_po');
select pg_temp.check((select quantity from public.inventory_items where name = 'Ground beef') = :beef_before + 30, 'receiving a PO adds stock');
select pg_temp.check(exists (select 1 from public.expenses where description like 'Purchase from%'), 'receiving a PO records the expense');
select pg_temp.check(pg_temp.rejects(format($q$select public.receive_purchase_order(%L)$q$, :'b_po')), 'a PO cannot be received twice');

reset role;
