-- =============================================================================
-- CHEFFEDATA — 0008: comandas (tabs), time clock, staff performance, plan limits,
-- green brand defaults.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Brand: green is CheffeData's default colour now.
-- -----------------------------------------------------------------------------
alter table public.restaurants alter column brand_color set default '#34D399';
alter table public.restaurants alter column accent_color set default '#2DD4BF';
update public.restaurants set brand_color = '#34D399', accent_color = '#2DD4BF'
 where upper(brand_color) in ('#38BDF8', '#3F6B4E') and upper(accent_color) in ('#A78BFA', '#C8743A');

-- -----------------------------------------------------------------------------
-- Comandas: a running bill for a table/customer. Each batch of items sent to
-- the kitchen is an order linked to the comanda.
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.tab_status as enum ('open', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

alter table public.restaurants add column if not exists tab_counter int not null default 0;

create table if not exists public.tabs (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  number int not null default 0,
  label text not null check (char_length(trim(label)) between 1 and 40),
  customer_name text check (customer_name is null or char_length(customer_name) <= 120),
  guests int check (guests is null or guests between 1 and 200),
  status public.tab_status not null default 'open',
  notes text,
  service_fee_pct numeric(5, 2) not null default 0 check (service_fee_pct between 0 and 30),
  subtotal numeric(12, 2) not null default 0,
  service_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_method text,
  opened_by uuid references auth.users (id) on delete set null default auth.uid(),
  closed_by uuid references auth.users (id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tabs_restaurant_status on public.tabs (restaurant_id, status, opened_at desc);

alter table public.orders add column if not exists tab_id uuid references public.tabs (id) on delete set null;
create index if not exists orders_tab on public.orders (tab_id);

create or replace function public.assign_tab_number() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.restaurants set tab_counter = tab_counter + 1 where id = new.restaurant_id returning tab_counter into new.number;
  return new;
end $$;
drop trigger if exists tabs_number on public.tabs;
create trigger tabs_number before insert on public.tabs for each row execute function public.assign_tab_number();

-- The billing guard must not block the counter bump done by the trigger above.
create or replace function public.protect_billing_fields() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.plan is distinct from old.plan
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.is_demo is distinct from old.is_demo
    or new.order_counter is distinct from old.order_counter
    or new.tab_counter is distinct from old.tab_counter
  ) then
    raise exception 'Billing fields can only be changed by CheffeData' using errcode = '42501';
  end if;
  return new;
end $$;

alter table public.tabs enable row level security;
create policy tabs_select on public.tabs for select to authenticated using (public.can(restaurant_id, 'orders', 'view'));
create policy tabs_insert on public.tabs for insert to authenticated with check (public.can(restaurant_id, 'orders', 'edit'));
create policy tabs_update on public.tabs for update to authenticated using (public.can(restaurant_id, 'orders', 'edit')) with check (public.can(restaurant_id, 'orders', 'edit'));
create trigger tabs_fixed_tenant before update on public.tabs for each row execute function public.forbid_restaurant_change();
drop trigger if exists guard_orders_tab on public.orders;
create trigger guard_orders_tab before insert or update on public.orders
  for each row execute function public.assert_same_restaurant('tab_id', 'tabs');

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.tabs;
  end if;
exception when duplicate_object then null; end $$;

-- Add items to an open comanda: creates a kitchen order linked to it.
create or replace function public.add_to_tab(p_tab uuid, p_items jsonb, p_notes text default null) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_tab public.tabs;
  v_order uuid;
begin
  select * into v_tab from public.tabs where id = p_tab;
  if not found then
    raise exception 'Comanda não encontrada' using errcode = 'P0002';
  end if;
  if v_tab.status <> 'open' then
    raise exception 'Esta comanda já foi fechada' using errcode = '22023';
  end if;
  v_order := public.create_order(
    p_restaurant => v_tab.restaurant_id, p_items => p_items, p_source => 'manual', p_fulfillment => 'dine_in',
    p_customer_name => v_tab.customer_name, p_table_label => v_tab.label, p_notes => p_notes);
  update public.orders set tab_id = p_tab where id = v_order;
  return v_order;
end $$;

-- Close a comanda: completes its orders (recording revenue and stock) and,
-- optionally, records the service fee as revenue.
create or replace function public.close_tab(p_tab uuid, p_payment_method text, p_service_fee_pct numeric default 0) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_tab public.tabs;
  v_subtotal numeric(12, 2);
  v_fee numeric(12, 2);
  v_tz text;
begin
  select * into v_tab from public.tabs where id = p_tab for update;
  if not found then
    raise exception 'Comanda não encontrada' using errcode = 'P0002';
  end if;
  if not public.can(v_tab.restaurant_id, 'orders', 'edit') then
    raise exception 'Você não tem permissão para fechar comandas' using errcode = '42501';
  end if;
  if v_tab.status <> 'open' then
    raise exception 'Esta comanda já foi fechada' using errcode = '22023';
  end if;
  if coalesce(p_service_fee_pct, 0) < 0 or coalesce(p_service_fee_pct, 0) > 30 then
    raise exception 'Taxa de serviço inválida' using errcode = '22023';
  end if;

  update public.orders set payment_method = p_payment_method where tab_id = p_tab and status <> 'cancelled';
  update public.orders set status = 'completed' where tab_id = p_tab and status not in ('completed', 'cancelled');

  select coalesce(sum(total), 0) into v_subtotal from public.orders where tab_id = p_tab and status = 'completed';
  if v_subtotal = 0 then
    raise exception 'A comanda está vazia. Para descartar, use “Cancelar comanda”.' using errcode = '22023';
  end if;
  v_fee := round(v_subtotal * coalesce(p_service_fee_pct, 0) / 100, 2);

  if v_fee > 0 then
    select timezone into v_tz from public.restaurants where id = v_tab.restaurant_id;
    insert into public.revenue_records (restaurant_id, description, amount, source, date, payment_method, notes, created_by)
    values (v_tab.restaurant_id, 'Taxa de serviço — ' || v_tab.label || ' (comanda #' || v_tab.number || ')', v_fee, 'other',
            (now() at time zone coalesce(v_tz, 'UTC'))::date, p_payment_method, 'Registrada ao fechar a comanda', auth.uid());
  end if;

  update public.tabs
     set status = 'closed', subtotal = v_subtotal, service_fee = v_fee, total = v_subtotal + v_fee,
         service_fee_pct = coalesce(p_service_fee_pct, 0), payment_method = p_payment_method,
         closed_by = auth.uid(), closed_at = now()
   where id = p_tab;
end $$;

create or replace function public.cancel_tab(p_tab uuid) returns void
language plpgsql security invoker set search_path = public as $$
declare v_tab public.tabs;
begin
  select * into v_tab from public.tabs where id = p_tab for update;
  if not found then
    raise exception 'Comanda não encontrada' using errcode = 'P0002';
  end if;
  if v_tab.status <> 'open' then
    raise exception 'Esta comanda já foi fechada' using errcode = '22023';
  end if;
  update public.orders set status = 'cancelled' where tab_id = p_tab and status <> 'cancelled' and status <> 'completed';
  update public.tabs set status = 'cancelled', closed_by = auth.uid(), closed_at = now() where id = p_tab;
end $$;

-- -----------------------------------------------------------------------------
-- Time clock
-- -----------------------------------------------------------------------------
-- Members can always see their own employee record and time entries.
create policy employees_self_select on public.employees for select to authenticated
  using (exists (select 1 from public.restaurant_members m where m.id = employees.member_id and m.user_id = auth.uid()));
create policy time_entries_self_select on public.time_entries for select to authenticated
  using (exists (
    select 1 from public.employees e join public.restaurant_members m on m.id = e.member_id
     where e.id = time_entries.employee_id and m.user_id = auth.uid()
  ));

-- One tap: clocks in if not on shift, otherwise clocks out.
create or replace function public.clock_toggle(p_restaurant uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member public.restaurant_members;
  v_employee uuid;
  v_open public.time_entries;
  v_name text;
  v_email text;
begin
  select * into v_member from public.restaurant_members
   where restaurant_id = p_restaurant and user_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'Você não faz parte deste restaurante' using errcode = '42501';
  end if;
  select id into v_employee from public.employees where member_id = v_member.id;
  if v_employee is null then
    select p.full_name, u.email into v_name, v_email from auth.users u left join public.profiles p on p.id = u.id where u.id = auth.uid();
    insert into public.employees (restaurant_id, member_id, full_name, email, role)
    values (p_restaurant, v_member.id, coalesce(v_name, v_email, 'Funcionário'), v_email, v_member.role)
    returning id into v_employee;
  end if;

  select * into v_open from public.time_entries
   where employee_id = v_employee and clock_out is null order by clock_in desc limit 1 for update;
  if found then
    update public.time_entries set clock_out = greatest(now(), v_open.clock_in + interval '1 second') where id = v_open.id;
    return jsonb_build_object('status', 'out', 'at', now(), 'since', v_open.clock_in);
  end if;
  insert into public.time_entries (restaurant_id, employee_id, clock_in) values (p_restaurant, v_employee, now());
  return jsonb_build_object('status', 'in', 'at', now());
end $$;

-- Hours per employee in a period (open entries count until now).
create or replace function public.team_hours(p_restaurant uuid, p_from timestamptz, p_to timestamptz)
returns table (employee_id uuid, full_name text, job_title text, member_id uuid, minutes numeric, entries bigint, on_shift_since timestamptz)
language sql stable security invoker set search_path = public as $$
  select e.id, e.full_name, e.position, e.member_id,
         coalesce(sum(extract(epoch from (least(coalesce(t.clock_out, now()), p_to) - greatest(t.clock_in, p_from))) / 60)
                  filter (where t.id is not null and coalesce(t.clock_out, now()) > p_from and t.clock_in < p_to), 0)::numeric(12, 1),
         count(t.id) filter (where t.clock_in < p_to and coalesce(t.clock_out, now()) > p_from),
         max(t.clock_in) filter (where t.clock_out is null)
    from public.employees e
    left join public.time_entries t on t.employee_id = e.id
   where e.restaurant_id = p_restaurant and e.status <> 'inactive'
   group by e.id
   order by e.full_name
$$;

-- -----------------------------------------------------------------------------
-- Staff performance: who took which orders (orders.created_by).
-- -----------------------------------------------------------------------------
create or replace function public.staff_performance(p_restaurant uuid, p_from timestamptz, p_to timestamptz)
returns table (user_id uuid, full_name text, orders bigint, completed bigint, cancelled bigint, revenue numeric, items bigint, tables bigint, tabs_closed bigint, last_order_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select o.created_by,
         coalesce(max(p.full_name), 'Sem nome'),
         count(*) filter (where o.status <> 'cancelled'),
         count(*) filter (where o.status = 'completed'),
         count(*) filter (where o.status = 'cancelled'),
         coalesce(sum(o.total) filter (where o.status = 'completed'), 0),
         coalesce(sum((select sum(quantity) from public.order_items oi where oi.order_id = o.id)) filter (where o.status <> 'cancelled'), 0)::bigint,
         count(distinct o.table_label) filter (where o.table_label is not null and o.status <> 'cancelled'),
         (select count(*) from public.tabs t where t.restaurant_id = p_restaurant and t.closed_by = o.created_by
            and t.status = 'closed' and t.closed_at between p_from and p_to),
         max(o.created_at)
    from public.orders o
    left join public.profiles p on p.id = o.created_by
   where o.restaurant_id = p_restaurant and o.created_at between p_from and p_to and o.created_by is not null
   group by o.created_by
   order by 6 desc
$$;

-- -----------------------------------------------------------------------------
-- Plan limits
-- -----------------------------------------------------------------------------
create or replace function public.enforce_integration_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_active int;
begin
  if new.status not in ('connected', 'demo', 'pending') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('connected', 'demo', 'pending') then return new; end if;
  select plan into v_plan from public.restaurants where id = new.restaurant_id;
  if v_plan <> 'essencial' then return new; end if;
  select count(*) into v_active from public.integrations
   where restaurant_id = new.restaurant_id and status in ('connected', 'demo', 'pending') and id <> new.id;
  if v_active >= 1 then
    raise exception 'O plano Essencial permite 1 aplicativo integrado. Faça upgrade para o Profissional para integrar quantos quiser.' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists integrations_plan_limit on public.integrations;
create trigger integrations_plan_limit before insert or update of status on public.integrations
  for each row execute function public.enforce_integration_limit();

create or replace function public.enforce_custom_role_plan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select plan from public.restaurants where id = new.restaurant_id) = 'essencial' then
    raise exception 'Cargos personalizados estão disponíveis a partir do plano Profissional.' using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists custom_roles_plan on public.custom_roles;
create trigger custom_roles_plan before insert on public.custom_roles
  for each row execute function public.enforce_custom_role_plan();

-- Activity log entries for comandas.
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
      v_summary := 'Novo pedido #' || (rec ->> 'number') || ' · ' || public.source_label(rec ->> 'source');
    elsif tg_op = 'UPDATE' and rec ->> 'status' is distinct from old_rec ->> 'status' then
      v_action := 'order.' || (rec ->> 'status');
      v_summary := 'Pedido #' || (rec ->> 'number') || ' ' || public.status_label(rec ->> 'status');
    else
      return null;
    end if;
  elsif tg_table_name = 'tabs' then
    if tg_op = 'INSERT' then
      v_action := 'tab.opened';
      v_summary := 'Comanda #' || (rec ->> 'number') || ' aberta — ' || (rec ->> 'label');
    elsif tg_op = 'UPDATE' and rec ->> 'status' is distinct from old_rec ->> 'status' then
      v_action := 'tab.' || (rec ->> 'status');
      v_summary := 'Comanda #' || (rec ->> 'number') || ' (' || (rec ->> 'label') || ') '
                   || case rec ->> 'status' when 'closed' then 'fechada' else 'cancelada' end;
    else
      return null;
    end if;
  elsif tg_table_name = 'expenses' then
    if tg_op = 'INSERT' and rec ->> 'recurring_parent_id' is null then
      v_action := 'expense.created';
      v_summary := 'Despesa adicionada: ' || (rec ->> 'description');
    elsif tg_op = 'DELETE' then
      v_action := 'expense.deleted';
      v_summary := 'Despesa removida: ' || (rec ->> 'description');
    else
      return null;
    end if;
  elsif tg_table_name = 'inventory_movements' then
    if rec ->> 'type' = 'order_deduction' then return null; end if;
    v_action := 'stock.' || (rec ->> 'type');
    select 'Estoque atualizado: ' || name || ' (' || public.movement_label(rec ->> 'type') || ' '
           || case when (rec ->> 'quantity_delta')::numeric > 0 then '+' else '' end
           || trim(trailing '.' from trim(trailing '0' from (rec ->> 'quantity_delta'))) || ' ' || unit || ')'
      into v_summary from public.inventory_items where id = (rec ->> 'inventory_item_id')::uuid;
  elsif tg_table_name = 'time_entries' then
    if tg_op = 'INSERT' then
      v_action := 'employee.clock_in';
      select full_name || ' registrou entrada' into v_summary from public.employees where id = (rec ->> 'employee_id')::uuid;
    elsif tg_op = 'UPDATE' and rec ->> 'clock_out' is not null and old_rec ->> 'clock_out' is null then
      v_action := 'employee.clock_out';
      select full_name || ' registrou saída' into v_summary from public.employees where id = (rec ->> 'employee_id')::uuid;
    else
      return null;
    end if;
  elsif tg_table_name = 'purchase_orders' then
    if tg_op = 'UPDATE' and rec ->> 'status' is distinct from old_rec ->> 'status' then
      v_action := 'purchase.' || (rec ->> 'status');
      select 'Pedido de compra de ' || name || ': ' || (rec ->> 'status') into v_summary
        from public.suppliers where id = (rec ->> 'supplier_id')::uuid;
    elsif tg_op = 'INSERT' then
      v_action := 'purchase.created';
      select 'Pedido de compra criado para ' || name into v_summary from public.suppliers where id = (rec ->> 'supplier_id')::uuid;
    else
      return null;
    end if;
  else
    v_action := tg_table_name || '.' || lower(tg_op);
    v_summary := case tg_table_name
                   when 'menu_items' then 'Item do cardápio'
                   when 'suppliers' then 'Fornecedor'
                   when 'revenue_records' then 'Receita'
                   else initcap(replace(rtrim(tg_table_name, 's'), '_', ' ')) end
                 || case tg_op when 'INSERT' then ' adicionado' when 'DELETE' then ' removido' else ' atualizado' end
                 || coalesce(': ' || coalesce(rec ->> 'name', rec ->> 'full_name', rec ->> 'description'), '');
  end if;

  -- When a whole restaurant is being deleted, its rows cascade away: don't log them.
  if tg_op = 'DELETE' and not exists (select 1 from public.restaurants where id = (rec ->> 'restaurant_id')::uuid) then
    return null;
  end if;

  insert into public.audit_logs (restaurant_id, actor_id, action, entity, entity_id, summary, data)
  values ((rec ->> 'restaurant_id')::uuid, auth.uid(), v_action, tg_table_name, (rec ->> 'id')::uuid, v_summary,
          case when tg_op = 'DELETE' then rec else null end);
  return null;
end $$;
drop trigger if exists audit_tabs on public.tabs;
create trigger audit_tabs after insert or update of status on public.tabs for each row execute function public.write_audit();

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------
revoke execute on function public.add_to_tab(uuid, jsonb, text), public.close_tab(uuid, text, numeric), public.cancel_tab(uuid),
  public.clock_toggle(uuid), public.team_hours(uuid, timestamptz, timestamptz), public.staff_performance(uuid, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.add_to_tab(uuid, jsonb, text), public.close_tab(uuid, text, numeric), public.cancel_tab(uuid),
  public.clock_toggle(uuid), public.team_hours(uuid, timestamptz, timestamptz), public.staff_performance(uuid, timestamptz, timestamptz)
  to authenticated;
