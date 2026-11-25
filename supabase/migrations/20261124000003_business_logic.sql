-- =============================================================================
-- FORKLY — business logic: RPCs, order lifecycle, inventory, finance, metrics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Workspace creation & membership
-- -----------------------------------------------------------------------------
create or replace function public.default_dashboard_widgets() returns jsonb
language sql immutable as $$
  select '[
    {"id":"kpi-revenue","type":"kpi_revenue","size":"sm"},
    {"id":"kpi-expenses","type":"kpi_expenses","size":"sm"},
    {"id":"kpi-profit","type":"kpi_profit","size":"sm"},
    {"id":"kpi-orders","type":"kpi_orders","size":"sm"},
    {"id":"revenue-chart","type":"revenue_chart","size":"xl","config":{"chart":"area"}},
    {"id":"expense-breakdown","type":"expense_breakdown","size":"md"},
    {"id":"popular-products","type":"popular_products","size":"md"},
    {"id":"alerts","type":"alerts","size":"md"},
    {"id":"recent-activity","type":"recent_activity","size":"md"},
    {"id":"ai-insights","type":"ai_insights","size":"md"},
    {"id":"recent-transactions","type":"recent_transactions","size":"md"}
  ]'::jsonb
$$;

create or replace function public.create_restaurant(
  p_name text,
  p_is_demo boolean default false
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_base text;
  v_slug text;
  n int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Restaurant name is required' using errcode = '22023';
  end if;
  if (select count(*) from public.restaurant_members where user_id = v_uid and role = 'owner') >= 10 then
    raise exception 'Workspace limit reached' using errcode = '54000';
  end if;

  v_base := trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'restaurant'; end if;
  v_slug := v_base;
  while exists (select 1 from public.restaurants where slug = v_slug) loop
    n := n + 1;
    v_slug := v_base || '-' || n;
  end loop;

  insert into public.restaurants (name, slug, is_demo, created_by)
  values (trim(p_name), v_slug, p_is_demo, v_uid)
  returning id into v_id;

  insert into public.restaurant_members (restaurant_id, user_id, role) values (v_id, v_uid, 'owner');
  insert into public.restaurant_settings (restaurant_id) values (v_id);
  perform public.seed_role_permissions(v_id);
  insert into public.dashboard_layouts (restaurant_id, name, is_active, widgets, created_by)
  values (v_id, 'Default', true, public.default_dashboard_widgets(), v_uid);
  insert into public.employees (restaurant_id, member_id, full_name, email, role, position)
  select v_id, m.id, coalesce(p.full_name, u.email), u.email, 'owner', 'Owner'
    from public.restaurant_members m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.id = m.user_id
   where m.restaurant_id = v_id and m.user_id = v_uid;

  update public.profiles set last_restaurant_id = v_id where id = v_uid;
  return v_id;
end $$;
revoke all on function public.create_restaurant(text, boolean) from public;
grant execute on function public.create_restaurant(text, boolean) to authenticated;

create or replace function public.accept_invitation(p_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_email text;
  v_member uuid;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  select * into v_inv from public.invitations where token = p_token for update;
  if not found or v_inv.accepted_at is not null or v_inv.expires_at < now() then
    raise exception 'This invitation is invalid or has expired' using errcode = '22023';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'This invitation was sent to a different email address' using errcode = '42501';
  end if;

  insert into public.restaurant_members (restaurant_id, user_id, role)
  values (v_inv.restaurant_id, auth.uid(), v_inv.role)
  on conflict (restaurant_id, user_id) do update set role = excluded.role, status = 'active'
  returning id into v_member;

  insert into public.employees (restaurant_id, member_id, full_name, email, role)
  select v_inv.restaurant_id, v_member, coalesce(p.full_name, v_email), v_email, v_inv.role
    from public.profiles p where p.id = auth.uid()
     and not exists (select 1 from public.employees e where e.member_id = v_member);

  update public.invitations set accepted_at = now() where id = v_inv.id;
  update public.profiles set last_restaurant_id = v_inv.restaurant_id where id = auth.uid();
  return v_inv.restaurant_id;
end $$;
grant execute on function public.accept_invitation(text) to authenticated;

-- Public lookup so the invite page can show which restaurant invited you.
create or replace function public.invitation_preview(p_token text)
returns table (restaurant_name text, role public.app_role, email text, expired boolean)
language sql stable security definer set search_path = public as $$
  select r.name, i.role, i.email, (i.accepted_at is not null or i.expires_at < now())
    from public.invitations i join public.restaurants r on r.id = i.restaurant_id
   where i.token = p_token
$$;
grant execute on function public.invitation_preview(text) to anon, authenticated;

create or replace function public.update_member_role(p_member uuid, p_role public.app_role) returns void
language plpgsql security definer set search_path = public as $$
declare v_m public.restaurant_members;
begin
  select * into v_m from public.restaurant_members where id = p_member;
  if not found or public.member_role(v_m.restaurant_id) is distinct from 'owner' then
    raise exception 'Only the owner can change roles' using errcode = '42501';
  end if;
  if v_m.user_id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '22023';
  end if;
  update public.restaurant_members set role = p_role where id = p_member;
  update public.employees set role = p_role where member_id = p_member;
end $$;
grant execute on function public.update_member_role(uuid, public.app_role) to authenticated;

create or replace function public.remove_member(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_m public.restaurant_members;
begin
  select * into v_m from public.restaurant_members where id = p_member;
  if not found or public.member_role(v_m.restaurant_id) is distinct from 'owner' then
    raise exception 'Only the owner can remove members' using errcode = '42501';
  end if;
  if v_m.role = 'owner' then
    raise exception 'The owner cannot be removed' using errcode = '22023';
  end if;
  update public.employees set member_id = null, status = 'inactive' where member_id = p_member;
  delete from public.restaurant_members where id = p_member;
end $$;
grant execute on function public.remove_member(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Orders
-- -----------------------------------------------------------------------------
-- Creates an order atomically; prices come from the menu, never from the client.
-- p_items: [{ "menu_item_id": uuid, "quantity": int, "modifiers": text, "notes": text }]
create or replace function public.create_order(
  p_restaurant uuid,
  p_items jsonb,
  p_source public.order_source default 'manual',
  p_fulfillment text default 'dine_in',
  p_customer_name text default null,
  p_customer_phone text default null,
  p_table_label text default null,
  p_notes text default null,
  p_discount numeric default 0,
  p_delivery_fee numeric default 0,
  p_payment_method text default null,
  p_status public.order_status default 'new'
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_order uuid;
  v_subtotal numeric(12, 2);
  v_prep int;
  v_bad int;
begin
  if not public.can(p_restaurant, 'orders', 'edit') then
    raise exception 'You do not have permission to create orders' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'An order needs at least one item' using errcode = '22023';
  end if;
  if p_status not in ('new', 'accepted', 'completed') then
    raise exception 'Invalid initial status' using errcode = '22023';
  end if;

  select count(*) into v_bad
    from jsonb_array_elements(p_items) e
    left join public.menu_items mi
      on mi.id = (e ->> 'menu_item_id')::uuid and mi.restaurant_id = p_restaurant and mi.is_available
   where mi.id is null or coalesce((e ->> 'quantity')::int, 0) <= 0;
  if v_bad > 0 then
    raise exception 'One or more items are unavailable or invalid' using errcode = '22023';
  end if;

  select coalesce(max(r.prep_minutes), (select default_prep_minutes from public.restaurant_settings where restaurant_id = p_restaurant))
    into v_prep
    from jsonb_array_elements(p_items) e
    left join public.recipes r on r.menu_item_id = (e ->> 'menu_item_id')::uuid;

  insert into public.orders (
    restaurant_id, source, fulfillment, customer_name, customer_phone, table_label, notes,
    discount, delivery_fee, payment_method, estimated_prep_minutes, status
  ) values (
    p_restaurant, p_source, p_fulfillment, nullif(trim(p_customer_name), ''), nullif(trim(p_customer_phone), ''),
    nullif(trim(p_table_label), ''), nullif(trim(p_notes), ''), greatest(coalesce(p_discount, 0), 0),
    greatest(coalesce(p_delivery_fee, 0), 0), p_payment_method, v_prep, 'new'
  ) returning id into v_order;

  insert into public.order_items (restaurant_id, order_id, menu_item_id, name, quantity, unit_price, modifiers, notes)
  select p_restaurant, v_order, mi.id, mi.name, (e ->> 'quantity')::int, mi.price,
         nullif(trim(e ->> 'modifiers'), ''), nullif(trim(e ->> 'notes'), '')
    from jsonb_array_elements(p_items) e
    join public.menu_items mi on mi.id = (e ->> 'menu_item_id')::uuid;

  select coalesce(sum(total), 0) into v_subtotal from public.order_items where order_id = v_order;
  update public.orders
     set subtotal = v_subtotal,
         total = greatest(v_subtotal - discount + delivery_fee, 0)
   where id = v_order;

  if p_status <> 'new' then
    update public.orders set status = p_status where id = v_order;
  end if;
  return v_order;
end $$;
grant execute on function public.create_order(uuid, jsonb, public.order_source, text, text, text, text, text, numeric, numeric, text, public.order_status) to authenticated;

create or replace function public.order_status_timestamps() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'cancelled' then
    raise exception 'A cancelled order cannot be reopened' using errcode = '22023';
  end if;
  case new.status
    when 'accepted'  then new.accepted_at  := coalesce(new.accepted_at, now());
    when 'preparing' then new.accepted_at  := coalesce(new.accepted_at, now());
    when 'ready'     then new.ready_at     := coalesce(new.ready_at, now());
    when 'completed' then new.completed_at := coalesce(new.completed_at, now());
                          new.ready_at     := coalesce(new.ready_at, new.completed_at);
    when 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now());
    else null;
  end case;
  return new;
end $$;

create trigger orders_status_ts before insert or update of status on public.orders
  for each row execute function public.order_status_timestamps();

-- Completion: record revenue and deduct recipe ingredients from stock.
create or replace function public.process_order_completion(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_o public.orders;
  v_tz text;
  v_auto boolean;
begin
  select * into v_o from public.orders where id = p_order;
  select r.timezone, s.inventory_auto_deduct into v_tz, v_auto
    from public.restaurants r join public.restaurant_settings s on s.restaurant_id = r.id
   where r.id = v_o.restaurant_id;

  insert into public.revenue_records (restaurant_id, description, amount, source, date, order_id, payment_method, created_by)
  values (v_o.restaurant_id, 'Order #' || v_o.number, v_o.total, 'order',
          (v_o.completed_at at time zone coalesce(v_tz, 'UTC'))::date, v_o.id, v_o.payment_method, v_o.created_by)
  on conflict (order_id) do update set amount = excluded.amount, date = excluded.date;

  if coalesce(v_auto, true) and not v_o.inventory_deducted then
    insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason, reference_type, reference_id, created_by)
    select v_o.restaurant_id, ii.id, 'order_deduction',
           -sum(public.convert_quantity(ri.quantity, ri.unit, ii.unit) * oi.quantity),
           'Order #' || v_o.number, 'order', v_o.id, auth.uid()
      from public.order_items oi
      join public.recipes r on r.menu_item_id = oi.menu_item_id and r.deduct_on_completion
      join public.recipe_ingredients ri on ri.recipe_id = r.id
      join public.inventory_items ii on ii.id = ri.inventory_item_id
     where oi.order_id = v_o.id
       and public.convert_quantity(ri.quantity, ri.unit, ii.unit) is not null
     group by ii.id
    having sum(public.convert_quantity(ri.quantity, ri.unit, ii.unit) * oi.quantity) <> 0;

    update public.orders set inventory_deducted = true where id = v_o.id;
  end if;
end $$;
revoke all on function public.process_order_completion(uuid) from public, authenticated;

-- Reversal: a completed order that is cancelled gives back revenue and stock.
create or replace function public.process_order_reversal(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_o public.orders;
begin
  select * into v_o from public.orders where id = p_order;
  delete from public.revenue_records where order_id = v_o.id;
  if v_o.inventory_deducted then
    insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason, reference_type, reference_id, created_by)
    select restaurant_id, inventory_item_id, 'adjustment', -sum(quantity_delta),
           'Order #' || v_o.number || ' cancelled — stock restored', 'order', v_o.id, auth.uid()
      from public.inventory_movements
     where reference_type = 'order' and reference_id = v_o.id and type = 'order_deduction'
     group by restaurant_id, inventory_item_id
    having sum(quantity_delta) <> 0;
    update public.orders set inventory_deducted = false where id = v_o.id;
  end if;
end $$;
revoke all on function public.process_order_reversal(uuid) from public, authenticated;

create or replace function public.on_order_status_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and (tg_op = 'INSERT' or old.status <> 'completed') then
    perform public.process_order_completion(new.id);
  elsif tg_op = 'UPDATE' and old.status = 'completed' and new.status = 'cancelled' then
    perform public.process_order_reversal(new.id);
  elsif tg_op = 'UPDATE' and new.status = 'completed' and old.status = 'completed'
        and new.total is distinct from old.total then
    update public.revenue_records set amount = new.total where order_id = new.id;
  end if;
  return null;
end $$;

create trigger orders_after_status after insert or update of status, total on public.orders
  for each row execute function public.on_order_status_change();

-- -----------------------------------------------------------------------------
-- Purchasing: receiving a PO adds stock and (optionally) records the expense.
-- -----------------------------------------------------------------------------
create or replace function public.receive_purchase_order(p_po uuid, p_record_expense boolean default true) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_po public.purchase_orders;
  v_total numeric(12, 2);
  v_supplier text;
begin
  select * into v_po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'Purchase order not found' using errcode = 'P0002';
  end if;
  if not (public.can(v_po.restaurant_id, 'suppliers', 'edit') and public.can(v_po.restaurant_id, 'inventory', 'edit')) then
    raise exception 'You need supplier and inventory edit rights' using errcode = '42501';
  end if;
  if v_po.status in ('received', 'cancelled') then
    raise exception 'This purchase order is already %', v_po.status using errcode = '22023';
  end if;

  insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, unit_cost, reason, reference_type, reference_id)
  select v_po.restaurant_id, inventory_item_id, 'po_receipt', quantity, unit_cost, 'Purchase order received', 'purchase_order', v_po.id
    from public.purchase_order_items where purchase_order_id = v_po.id;

  update public.purchase_orders set status = 'received', received_at = now() where id = v_po.id;

  select coalesce(sum(quantity * unit_cost), 0) into v_total from public.purchase_order_items where purchase_order_id = v_po.id;
  if p_record_expense and v_total > 0 and public.can(v_po.restaurant_id, 'finances', 'edit') then
    select name into v_supplier from public.suppliers where id = v_po.supplier_id;
    insert into public.expenses (restaurant_id, description, amount, category, date, supplier_id, notes)
    values (v_po.restaurant_id, 'Purchase from ' || v_supplier, v_total, 'ingredients', current_date, v_po.supplier_id,
            'Recorded automatically when purchase order was received');
  end if;
end $$;
grant execute on function public.receive_purchase_order(uuid, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- Recurring expenses: materialise due occurrences (idempotent).
-- -----------------------------------------------------------------------------
create or replace function public.generate_recurring_expenses(p_restaurant uuid) returns int
language plpgsql security invoker set search_path = public as $$
declare
  v_exp public.expenses;
  v_due date;
  v_count int := 0;
  v_step interval;
begin
  if not public.can(p_restaurant, 'finances', 'edit') then
    return 0;
  end if;
  for v_exp in
    select * from public.expenses
     where restaurant_id = p_restaurant and is_recurring and next_due_on is not null and next_due_on <= current_date
     for update
  loop
    v_step := case v_exp.recurrence when 'weekly' then interval '1 week' when 'monthly' then interval '1 month' else interval '1 year' end;
    v_due := v_exp.next_due_on;
    while v_due <= current_date and v_count < 500 loop
      insert into public.expenses (restaurant_id, description, amount, category, date, supplier_id, payment_method, notes, recurring_parent_id)
      values (v_exp.restaurant_id, v_exp.description, v_exp.amount, v_exp.category, v_due, v_exp.supplier_id,
              v_exp.payment_method, v_exp.notes, v_exp.id);
      v_due := (v_due + v_step)::date;
      v_count := v_count + 1;
    end loop;
    update public.expenses set next_due_on = v_due where id = v_exp.id;
  end loop;
  return v_count;
end $$;
grant execute on function public.generate_recurring_expenses(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Metrics (security invoker: RLS decides what the caller may aggregate)
-- -----------------------------------------------------------------------------
create or replace function public.period_totals(p_restaurant uuid, p_from date, p_to date)
returns table (revenue numeric, expenses numeric, orders bigint, cancelled bigint)
language sql stable security invoker set search_path = public as $$
  with tz as (select timezone from public.restaurants where id = p_restaurant)
  select
    (select coalesce(sum(amount), 0) from public.revenue_records
      where restaurant_id = p_restaurant and date between p_from and p_to),
    (select coalesce(sum(amount), 0) from public.expenses
      where restaurant_id = p_restaurant and date between p_from and p_to),
    (select count(*) from public.orders o, tz
      where o.restaurant_id = p_restaurant and o.status = 'completed'
        and (o.completed_at at time zone tz.timezone)::date between p_from and p_to),
    (select count(*) from public.orders o, tz
      where o.restaurant_id = p_restaurant and o.status = 'cancelled'
        and (o.created_at at time zone tz.timezone)::date between p_from and p_to)
$$;
grant execute on function public.period_totals(uuid, date, date) to authenticated;

-- Daily series for sparklines & charts.
create or replace function public.daily_series(p_restaurant uuid, p_from date, p_to date)
returns table (day date, revenue numeric, expenses numeric, orders bigint)
language sql stable security invoker set search_path = public as $$
  with tz as (select timezone from public.restaurants where id = p_restaurant),
  days as (select generate_series(p_from, p_to, interval '1 day')::date as day)
  select d.day,
    coalesce((select sum(amount) from public.revenue_records r where r.restaurant_id = p_restaurant and r.date = d.day), 0),
    coalesce((select sum(amount) from public.expenses e where e.restaurant_id = p_restaurant and e.date = d.day), 0),
    (select count(*) from public.orders o, tz where o.restaurant_id = p_restaurant and o.status = 'completed'
       and (o.completed_at at time zone tz.timezone)::date = d.day)
  from days d order by d.day
$$;
grant execute on function public.daily_series(uuid, date, date) to authenticated;

-- Revenue bucketed by hour/day/week/month. Hourly uses order completion times
-- (manual revenue records only carry a date).
create or replace function public.revenue_series(p_restaurant uuid, p_from date, p_to date, p_bucket text default 'day')
returns table (bucket timestamp, revenue numeric, orders bigint)
language plpgsql stable security invoker set search_path = public as $$
declare v_tz text;
begin
  select timezone into v_tz from public.restaurants where id = p_restaurant;
  if p_bucket = 'hour' then
    return query
      select date_trunc('hour', o.completed_at at time zone v_tz), sum(o.total), count(*)
        from public.orders o
       where o.restaurant_id = p_restaurant and o.status = 'completed'
         and (o.completed_at at time zone v_tz)::date between p_from and p_to
       group by 1 order by 1;
  elsif p_bucket in ('day', 'week', 'month') then
    return query
      select date_trunc(p_bucket, r.date::timestamp), sum(r.amount),
             count(*) filter (where r.source = 'order')
        from public.revenue_records r
       where r.restaurant_id = p_restaurant and r.date between p_from and p_to
       group by 1 order by 1;
  else
    raise exception 'Invalid bucket %', p_bucket using errcode = '22023';
  end if;
end $$;
grant execute on function public.revenue_series(uuid, date, date, text) to authenticated;

create or replace function public.expense_breakdown(p_restaurant uuid, p_from date, p_to date)
returns table (category public.expense_category, amount numeric, entries bigint)
language sql stable security invoker set search_path = public as $$
  select category, sum(amount), count(*)
    from public.expenses
   where restaurant_id = p_restaurant and date between p_from and p_to
   group by category order by 2 desc
$$;
grant execute on function public.expense_breakdown(uuid, date, date) to authenticated;

create or replace function public.product_performance(p_restaurant uuid, p_from date, p_to date)
returns table (menu_item_id uuid, name text, quantity bigint, revenue numeric, food_cost numeric, margin numeric, has_recipe boolean)
language sql stable security invoker set search_path = public as $$
  with tz as (select timezone from public.restaurants where id = p_restaurant)
  select oi.menu_item_id, max(oi.name), sum(oi.quantity)::bigint, sum(oi.total),
         max(c.food_cost) * sum(oi.quantity),
         case when sum(oi.total) > 0 and max(c.ingredient_count) > 0
              then round(1 - (max(c.food_cost) * sum(oi.quantity)) / sum(oi.total), 4) end,
         coalesce(max(c.ingredient_count), 0) > 0
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    cross join tz
    left join public.menu_item_costs c on c.menu_item_id = oi.menu_item_id
   where oi.restaurant_id = p_restaurant and o.status = 'completed'
     and (o.completed_at at time zone tz.timezone)::date between p_from and p_to
   group by oi.menu_item_id
   order by 3 desc
$$;
grant execute on function public.product_performance(uuid, date, date) to authenticated;

-- -----------------------------------------------------------------------------
-- Audit log / activity feed
-- -----------------------------------------------------------------------------
create or replace function public.write_audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  rec jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_rec jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else null end;
  v_summary text;
  v_action text := lower(tg_op);
begin
  if tg_table_name = 'orders' then
    if tg_op = 'INSERT' then
      v_action := 'order.created';
      v_summary := 'New order #' || (rec ->> 'number') || ' · ' || (rec ->> 'source');
    elsif tg_op = 'UPDATE' and rec ->> 'status' is distinct from old_rec ->> 'status' then
      v_action := 'order.' || (rec ->> 'status');
      v_summary := 'Order #' || (rec ->> 'number') || ' marked ' || (rec ->> 'status');
    else
      return null;
    end if;
  elsif tg_table_name = 'expenses' then
    if tg_op = 'INSERT' and rec ->> 'recurring_parent_id' is null then
      v_action := 'expense.created';
      v_summary := 'Expense added: ' || (rec ->> 'description');
    elsif tg_op = 'DELETE' then
      v_action := 'expense.deleted';
      v_summary := 'Expense deleted: ' || (rec ->> 'description');
    else
      return null;
    end if;
  elsif tg_table_name = 'inventory_movements' then
    if rec ->> 'type' = 'order_deduction' then return null; end if;
    v_action := 'stock.' || (rec ->> 'type');
    select 'Stock updated: ' || name || ' (' || replace(rec ->> 'type', '_', ' ') || ' '
           || case when (rec ->> 'quantity_delta')::numeric > 0 then '+' else '' end
           || trim(trailing '.' from trim(trailing '0' from (rec ->> 'quantity_delta'))) || ' ' || unit || ')'
      into v_summary from public.inventory_items where id = (rec ->> 'inventory_item_id')::uuid;
  elsif tg_table_name = 'time_entries' then
    if tg_op = 'INSERT' then
      v_action := 'employee.clock_in';
      select full_name || ' clocked in' into v_summary from public.employees where id = (rec ->> 'employee_id')::uuid;
    elsif tg_op = 'UPDATE' and rec ->> 'clock_out' is not null and old_rec ->> 'clock_out' is null then
      v_action := 'employee.clock_out';
      select full_name || ' clocked out' into v_summary from public.employees where id = (rec ->> 'employee_id')::uuid;
    else
      return null;
    end if;
  elsif tg_table_name = 'purchase_orders' then
    if tg_op = 'UPDATE' and rec ->> 'status' is distinct from old_rec ->> 'status' then
      v_action := 'purchase.' || (rec ->> 'status');
      select 'Purchase order from ' || name || ' ' || (rec ->> 'status') into v_summary
        from public.suppliers where id = (rec ->> 'supplier_id')::uuid;
    elsif tg_op = 'INSERT' then
      v_action := 'purchase.created';
      select 'Purchase order created for ' || name into v_summary from public.suppliers where id = (rec ->> 'supplier_id')::uuid;
    else
      return null;
    end if;
  else
    v_action := tg_table_name || '.' || lower(tg_op);
    v_summary := case tg_table_name
                   when 'menu_items' then 'Menu item'
                   when 'suppliers' then 'Supplier'
                   when 'revenue_records' then 'Revenue'
                   else initcap(replace(rtrim(tg_table_name, 's'), '_', ' ')) end
                 || case tg_op when 'INSERT' then ' added' when 'DELETE' then ' removed' else ' updated' end
                 || coalesce(': ' || coalesce(rec ->> 'name', rec ->> 'full_name', rec ->> 'description'), '');
  end if;

  insert into public.audit_logs (restaurant_id, actor_id, action, entity, entity_id, summary, data)
  values ((rec ->> 'restaurant_id')::uuid, auth.uid(), v_action, tg_table_name, (rec ->> 'id')::uuid, v_summary,
          case when tg_op = 'DELETE' then rec else null end);
  return null;
end $$;

create trigger audit_orders after insert or update of status on public.orders for each row execute function public.write_audit();
create trigger audit_expenses after insert or delete on public.expenses for each row execute function public.write_audit();
create trigger audit_movements after insert on public.inventory_movements for each row execute function public.write_audit();
create trigger audit_time after insert or update of clock_out on public.time_entries for each row execute function public.write_audit();
create trigger audit_po after insert or update of status on public.purchase_orders for each row execute function public.write_audit();
create trigger audit_menu after insert or delete on public.menu_items for each row execute function public.write_audit();
create trigger audit_suppliers after insert or delete on public.suppliers for each row execute function public.write_audit();
create trigger audit_revenue_ins after insert on public.revenue_records for each row
  when (new.source <> 'order') execute function public.write_audit();
create trigger audit_revenue_del after delete on public.revenue_records for each row
  when (old.source <> 'order') execute function public.write_audit();

-- -----------------------------------------------------------------------------
-- Widget catalog
-- -----------------------------------------------------------------------------
insert into public.dashboard_widgets (type, title, description, section, default_size) values
  ('kpi_revenue',       'Revenue',            'Total revenue for the selected period',            'finances',  'sm'),
  ('kpi_today_revenue', 'Today''s revenue',   'Revenue recorded today',                           'finances',  'sm'),
  ('kpi_week_revenue',  'Weekly revenue',     'Revenue for the last 7 days',                       'finances',  'sm'),
  ('kpi_month_revenue', 'Monthly revenue',    'Revenue for the current month',                     'finances',  'sm'),
  ('kpi_expenses',      'Expenses',           'Total expenses for the selected period',            'finances',  'sm'),
  ('kpi_profit',        'Estimated profit',   'Revenue minus expenses',                            'finances',  'sm'),
  ('kpi_orders',        'Orders',             'Completed orders in the period',                    'orders',    'sm'),
  ('kpi_aov',           'Average order value','Revenue per completed order',                       'orders',    'sm'),
  ('revenue_chart',     'Revenue chart',      'Revenue over time, hourly to monthly',              'finances',  'lg'),
  ('expense_breakdown', 'Expense breakdown',  'Where the money goes, by category',                 'finances',  'md'),
  ('popular_products',  'Popular products',   'Best sellers with revenue and estimated margin',    'orders',    'md'),
  ('order_activity',    'Order activity',     'Orders currently in progress',                      'orders',    'md'),
  ('inventory_alerts',  'Inventory alerts',   'Low stock and expiring items',                      'inventory', 'md'),
  ('alerts',            'Alerts',             'Everything that needs your attention',              'overview',  'md'),
  ('recent_activity',   'Recent activity',    'Latest events across the restaurant',               'overview',  'md'),
  ('recent_transactions','Recent transactions','Latest revenue and expenses',                      'finances',  'md'),
  ('upcoming_shifts',   'Upcoming shifts',    'Who is working next',                               'team',      'md'),
  ('ai_insights',       'AI insights',        'Observations drawn from your own data',             'assistant', 'md');

-- -----------------------------------------------------------------------------
-- Realtime for the kitchen display
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
