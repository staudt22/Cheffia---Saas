-- =============================================================================
-- FORKLY — 0007: 7-day free trial, subscription plans, Brazilian defaults,
-- Portuguese activity log and Portuguese demo data.
-- =============================================================================

-- Brazilian defaults for new restaurants
alter table public.restaurants alter column currency set default 'BRL';
alter table public.restaurants alter column locale set default 'pt-BR';
alter table public.restaurants alter column timezone set default 'America/Sao_Paulo';
alter table public.restaurants alter column date_format set default 'dd/MM/yyyy';

-- Restaurants created before this update with the old US defaults move to reais / pt-BR.
update public.restaurants set currency = 'BRL', locale = 'pt-BR', date_format = 'dd/MM/yyyy'
 where currency = 'USD' and locale = 'en-US';

-- -----------------------------------------------------------------------------
-- Trial & plans
-- plan: 'trial' | 'essencial' | 'profissional' | 'rede'
-- -----------------------------------------------------------------------------
alter table public.restaurants add column if not exists trial_ends_at timestamptz;
update public.restaurants set trial_ends_at = created_at + interval '7 days' where trial_ends_at is null;
alter table public.restaurants alter column trial_ends_at set default now() + interval '7 days';
alter table public.restaurants alter column plan set default 'trial';
alter table public.restaurants drop constraint if exists restaurants_plan_check;
alter table public.restaurants add constraint restaurants_plan_check check (plan in ('trial', 'essencial', 'profissional', 'rede'));

-- Plan, trial and demo flags can only be changed by the platform (service role /
-- billing webhooks), never by restaurant users through the API.
create or replace function public.protect_billing_fields() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.plan is distinct from old.plan
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.is_demo is distinct from old.is_demo
    or new.order_counter is distinct from old.order_counter
  ) then
    raise exception 'Billing fields can only be changed by Forkly' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists restaurants_protect_billing on public.restaurants;
create trigger restaurants_protect_billing before update on public.restaurants
  for each row execute function public.protect_billing_fields();

-- Team size per plan (trial behaves like Profissional).
create or replace function public.plan_user_limit(p_plan text) returns int
language sql immutable as $$
  select case p_plan when 'essencial' then 3 when 'profissional' then 15 when 'trial' then 15 else null end
$$;

create or replace function public.enforce_user_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan text;
  v_limit int;
  v_used int;
begin
  select plan into v_plan from public.restaurants where id = new.restaurant_id;
  v_limit := public.plan_user_limit(v_plan);
  if v_limit is null then return new; end if;
  select (select count(*) from public.restaurant_members where restaurant_id = new.restaurant_id and status = 'active')
       + (select count(*) from public.invitations where restaurant_id = new.restaurant_id and accepted_at is null and expires_at > now())
    into v_used;
  if v_used >= v_limit then
    raise exception 'Seu plano permite até % usuários. Faça upgrade para convidar mais pessoas.', v_limit using errcode = '54000';
  end if;
  return new;
end $$;
drop trigger if exists invitations_user_limit on public.invitations;
create trigger invitations_user_limit before insert on public.invitations
  for each row execute function public.enforce_user_limit();

-- Helpers for Portuguese activity text
create or replace function public.source_label(s text) returns text language sql immutable as $$
  select case s when 'website' then 'site' when 'manual' then 'manual' when 'pos' then 'PDV' when 'ifood' then 'iFood'
    when 'ubereats' then 'Uber Eats' when 'doordash' then 'DoorDash' else 'outro' end
$$;
create or replace function public.status_label(s text) returns text language sql immutable as $$
  select case s when 'new' then 'recebido' when 'accepted' then 'aceito' when 'preparing' then 'em preparo'
    when 'ready' then 'pronto' when 'completed' then 'concluído' when 'cancelled' then 'cancelado' else s end
$$;
create or replace function public.movement_label(s text) returns text language sql immutable as $$
  select case s when 'purchase' then 'compra' when 'usage' then 'uso' when 'waste' then 'desperdício' when 'adjustment' then 'ajuste'
    when 'order_deduction' then 'pedido' when 'po_receipt' then 'pedido de compra' when 'initial' then 'inicial' else s end
$$;

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

-- Demo workspace in Portuguese with BRL prices
create or replace function public.seed_demo_restaurant(p_restaurant uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_r public.restaurants;
  v_tz text;
  s_meat uuid; s_bakery uuid; s_produce uuid; s_drinks uuid;
  c_burgers uuid; c_sides uuid; c_drinks uuid; c_desserts uuid; c_mains uuid;
  i_beef uuid; i_bun uuid; i_cheese uuid; i_sauce uuid; i_lettuce uuid; i_tomato uuid; i_bacon uuid;
  i_potato uuid; i_oil uuid; i_cola uuid; i_lemon uuid; i_icecream uuid; i_chicken uuid; i_box uuid; i_onion uuid;
  m_ids uuid[];
  m_prices numeric[];
  m_names text[];
  m_weights int[];
  e_ids uuid[];
  v_day int;
  v_n int;
  v_k int;
  v_order uuid;
  v_ts timestamptz;
  v_hour int;
  v_src public.order_source;
  v_pick int;
  v_items int;
  v_qty int;
  v_sub numeric;
  v_rand numeric;
  v_status public.order_status;
  v_week_start date := date_trunc('week', current_date)::date;
  rec record;
begin
  select * into v_r from public.restaurants where id = p_restaurant;
  if not found or not v_r.is_demo then
    raise exception 'Dados de demonstração só podem ser adicionados a um restaurante de demonstração' using errcode = '42501';
  end if;
  if public.member_role(p_restaurant) is distinct from 'owner' then
    raise exception 'Apenas o dono pode criar dados de demonstração' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where restaurant_id = p_restaurant) then
    raise exception 'Este restaurante de demonstração já tem dados' using errcode = '22023';
  end if;

  v_tz := v_r.timezone;
  perform setseed(0.42);
  update public.restaurant_settings set inventory_auto_deduct = false where restaurant_id = p_restaurant;
  update public.restaurants set restaurant_type = coalesce(restaurant_type, 'Hamburgueria') where id = p_restaurant;

  -- Suppliers
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Açougue Prime', 'Marco Silva', '(11) 4000-0101', 'pedidos@acougueprime.example', 'Carne bovina, bacon, frango')
  returning id into s_meat;
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Padaria Casca Dourada', 'Ana Lima', '(11) 4000-0102', 'contato@cascadourada.example', 'Pães brioche')
  returning id into s_bakery;
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Hortifruti Vale Verde', 'Tomás Becker', '(11) 4000-0103', 'vendas@valeverde.example', 'Legumes, batatas, limões')
  returning id into s_produce;
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Distribuidora Bebidas da Cidade', 'Paula Nunes', '(11) 4000-0104', 'b2b@bebidascidade.example', 'Refrigerantes, sorvete, embalagens')
  returning id into s_drinks;

  -- Inventory (unit_cost is per unit of measure)
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Carne moída', 'Carnes', 0, 'kg', 15, 9.80, s_meat, 'Câmara fria') returning id into i_beef;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location, expires_on)
  values (p_restaurant, 'Pão brioche', 'Padaria', 0, 'unit', 80, 0.45, s_bakery, 'Estoque seco', current_date + 2) returning id into i_bun;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Cheddar fatiado', 'Laticínios', 0, 'unit', 100, 0.18, s_meat, 'Câmara fria') returning id into i_cheese;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Molho da casa', 'Molhos', 0, 'l', 3, 6.50, null, 'Câmara fria') returning id into i_sauce;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location, expires_on)
  values (p_restaurant, 'Alface', 'Hortifruti', 0, 'kg', 3, 3.20, s_produce, 'Câmara fria', current_date + 3) returning id into i_lettuce;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Tomate', 'Hortifruti', 0, 'kg', 4, 2.90, s_produce, 'Câmara fria') returning id into i_tomato;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Bacon defumado', 'Carnes', 0, 'kg', 4, 12.40, s_meat, 'Câmara fria') returning id into i_bacon;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Batata', 'Hortifruti', 0, 'kg', 25, 1.10, s_produce, 'Estoque seco') returning id into i_potato;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Óleo de fritura', 'Mercearia', 0, 'l', 10, 2.30, s_produce, 'Estoque seco') returning id into i_oil;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Refrigerante lata 350ml', 'Bebidas', 0, 'unit', 48, 0.55, s_drinks, 'Geladeira do bar') returning id into i_cola;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Limão', 'Hortifruti', 0, 'kg', 2, 2.60, s_produce, 'Geladeira do bar') returning id into i_lemon;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Sorvete de baunilha', 'Laticínios', 0, 'l', 4, 5.90, s_drinks, 'Freezer') returning id into i_icecream;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Peito de frango', 'Carnes', 0, 'kg', 6, 8.20, s_meat, 'Câmara fria') returning id into i_chicken;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Embalagens para viagem', 'Embalagens', 0, 'box', 4, 18.00, s_drinks, 'Estoque seco') returning id into i_box;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Cebola roxa', 'Hortifruti', 0, 'kg', 3, 1.80, s_produce, 'Estoque seco') returning id into i_onion;

  -- Opening stock (a few deliberately below minimum to demonstrate alerts)
  insert into inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason)
  values
    (p_restaurant, i_beef, 'initial', 42, 'Estoque inicial'),
    (p_restaurant, i_bun, 'initial', 64, 'Estoque inicial'),
    (p_restaurant, i_cheese, 'initial', 380, 'Estoque inicial'),
    (p_restaurant, i_sauce, 'initial', 9, 'Estoque inicial'),
    (p_restaurant, i_lettuce, 'initial', 6.5, 'Estoque inicial'),
    (p_restaurant, i_tomato, 'initial', 9, 'Estoque inicial'),
    (p_restaurant, i_bacon, 'initial', 2.4, 'Estoque inicial'),
    (p_restaurant, i_potato, 'initial', 70, 'Estoque inicial'),
    (p_restaurant, i_oil, 'initial', 24, 'Estoque inicial'),
    (p_restaurant, i_cola, 'initial', 120, 'Estoque inicial'),
    (p_restaurant, i_lemon, 'initial', 3.5, 'Estoque inicial'),
    (p_restaurant, i_icecream, 'initial', 7, 'Estoque inicial'),
    (p_restaurant, i_chicken, 'initial', 11, 'Estoque inicial'),
    (p_restaurant, i_box, 'initial', 9, 'Estoque inicial'),
    (p_restaurant, i_onion, 'initial', 5, 'Estoque inicial');
  insert into inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason)
  values (p_restaurant, i_lettuce, 'waste', -0.8, 'Murcha — descartada');

  -- Menu
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Hambúrgueres', 0) returning id into c_burgers;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Entradas', 1) returning id into c_sides;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Pratos principais', 2) returning id into c_mains;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Bebidas', 3) returning id into c_drinks;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Sobremesas', 4) returning id into c_desserts;

  with ins as (
    insert into menu_items (restaurant_id, category_id, name, description, price, position)
    values
      (p_restaurant, c_burgers, 'Burger Clássico', 'Blend 180g, cheddar, alface, tomate e molho da casa', 14.00, 0),
      (p_restaurant, c_burgers, 'Duplo Bacon', 'Dois blends de 180g, bacon defumado e cheddar em dobro', 19.50, 1),
      (p_restaurant, c_burgers, 'Burger de Frango Crocante', 'Frango empanado, alface e molho da casa', 15.00, 2),
      (p_restaurant, c_burgers, 'Smash de Cebola', 'Blend prensado, cebola roxa caramelizada e cheddar', 13.50, 3),
      (p_restaurant, c_sides, 'Batata Rústica', 'Frita duas vezes, com sal grosso', 5.50, 0),
      (p_restaurant, c_sides, 'Batata Recheada', 'Batata, bacon, cheddar e molho da casa', 8.50, 1),
      (p_restaurant, c_mains, 'Prato de Frango Grelhado', 'Peito de frango, batata e salada', 18.00, 0),
      (p_restaurant, c_drinks, 'Refrigerante', 'Lata 350ml', 3.50, 0),
      (p_restaurant, c_drinks, 'Limonada', 'Feita na hora', 4.50, 1),
      (p_restaurant, c_drinks, 'Cerveja Artesanal', 'IPA local, 473ml', 7.00, 2),
      (p_restaurant, c_desserts, 'Sundae de Baunilha', 'Sorvete de baunilha com caramelo', 6.00, 0),
      (p_restaurant, c_desserts, 'Brownie', 'Brownie de chocolate quente', 6.50, 1)
    returning id, name, price
  )
  select array_agg(id order by name), array_agg(price order by name), array_agg(name order by name)
    into m_ids, m_prices, m_names from ins;

  -- Recipes (Craft Beer & Brownie intentionally have none → "missing recipe" alert)
  for rec in select * from menu_items where restaurant_id = p_restaurant loop
    if rec.name in ('Cerveja Artesanal', 'Brownie') then continue; end if;
    insert into recipes (restaurant_id, menu_item_id, prep_minutes)
    values (p_restaurant, rec.id, case when rec.category_id = c_drinks then 2 when rec.category_id = c_desserts then 4 else 12 end);
  end loop;

  insert into recipe_ingredients (restaurant_id, recipe_id, inventory_item_id, quantity, unit)
  select p_restaurant, r.id, x.item, x.qty, x.unit::inventory_unit
    from recipes r join menu_items mi on mi.id = r.menu_item_id
    join lateral (values
      ('Burger Clássico', i_beef, 180::numeric, 'g'), ('Burger Clássico', i_bun, 1, 'unit'), ('Burger Clássico', i_cheese, 2, 'unit'),
      ('Burger Clássico', i_sauce, 30, 'ml'), ('Burger Clássico', i_lettuce, 20, 'g'), ('Burger Clássico', i_tomato, 30, 'g'),
      ('Duplo Bacon', i_beef, 360, 'g'), ('Duplo Bacon', i_bun, 1, 'unit'), ('Duplo Bacon', i_cheese, 4, 'unit'),
      ('Duplo Bacon', i_bacon, 60, 'g'), ('Duplo Bacon', i_sauce, 30, 'ml'),
      ('Burger de Frango Crocante', i_chicken, 170, 'g'), ('Burger de Frango Crocante', i_bun, 1, 'unit'),
      ('Burger de Frango Crocante', i_lettuce, 20, 'g'), ('Burger de Frango Crocante', i_sauce, 30, 'ml'), ('Burger de Frango Crocante', i_oil, 80, 'ml'),
      ('Smash de Cebola', i_beef, 150, 'g'), ('Smash de Cebola', i_bun, 1, 'unit'), ('Smash de Cebola', i_cheese, 1, 'unit'),
      ('Smash de Cebola', i_onion, 50, 'g'),
      ('Batata Rústica', i_potato, 250, 'g'), ('Batata Rústica', i_oil, 60, 'ml'),
      ('Batata Recheada', i_potato, 250, 'g'), ('Batata Recheada', i_oil, 60, 'ml'), ('Batata Recheada', i_bacon, 40, 'g'),
      ('Batata Recheada', i_cheese, 2, 'unit'), ('Batata Recheada', i_sauce, 20, 'ml'),
      ('Prato de Frango Grelhado', i_chicken, 220, 'g'), ('Prato de Frango Grelhado', i_potato, 200, 'g'),
      ('Prato de Frango Grelhado', i_lettuce, 40, 'g'), ('Prato de Frango Grelhado', i_tomato, 40, 'g'),
      ('Refrigerante', i_cola, 1, 'unit'),
      ('Limonada', i_lemon, 120, 'g'),
      ('Sundae de Baunilha', i_icecream, 150, 'ml')
    ) as x(menu_name, item, qty, unit) on x.menu_name = mi.name
   where r.restaurant_id = p_restaurant;

  -- Popularity weights aligned with m_names (sorted alphabetically)
  -- Bacon Double, Brownie, Classic Burger, Cola, Craft Beer, Crispy Chicken, Fresh Lemonade,
  -- Grilled Chicken Plate, Hand-cut Fries, Loaded Fries, Smash Onion, Vanilla Sundae
  -- weights follow m_names in alphabetical order (pt-BR names)
  select array_agg(case name
      when 'Burger Clássico' then 26 when 'Batata Rústica' then 22 when 'Refrigerante' then 18 when 'Duplo Bacon' then 14
      when 'Burger de Frango Crocante' then 12 when 'Smash de Cebola' then 10 when 'Batata Recheada' then 9 when 'Limonada' then 8
      when 'Cerveja Artesanal' then 7 when 'Prato de Frango Grelhado' then 6 when 'Sundae de Baunilha' then 5 else 4 end order by name)
    into m_weights from menu_items where restaurant_id = p_restaurant;

  -- 45 days of order history
  for v_day in reverse 45..1 loop
    v_n := 36 + floor(random() * 20)::int
         + case extract(isodow from current_date - v_day) when 5 then 18 when 6 then 24 when 7 then 12 else 0 end;
    for v_k in 1..v_n loop
      v_hour := case when random() < 0.42 then 11 + floor(random() * 3)::int else 17 + floor(random() * 5)::int end;
      v_ts := ((current_date - v_day)::timestamp + make_interval(hours => v_hour, mins => floor(random() * 60)::int)) at time zone v_tz;
      v_src := case
        when random() < 0.38 then 'pos'
        when random() < 0.45 then 'ifood'
        when random() < 0.40 then 'ubereats'
        when random() < 0.35 then 'website'
        when random() < 0.50 then 'doordash'
        else 'manual' end;
      v_status := case when random() < 0.035 then 'cancelled' else 'completed' end;

      insert into orders (restaurant_id, source, is_simulated, status, fulfillment, created_at, accepted_at, completed_at,
                          cancelled_at, estimated_prep_minutes, payment_method, delivery_fee)
      values (p_restaurant, v_src, v_src in ('ifood', 'ubereats', 'doordash'), v_status,
              case when v_src in ('ifood', 'ubereats', 'doordash') then 'delivery' when random() < 0.3 then 'takeaway' else 'dine_in' end,
              v_ts, v_ts + interval '1 minute',
              case when v_status = 'completed' then v_ts + make_interval(mins => 14 + floor(random() * 14)::int) end,
              case when v_status = 'cancelled' then v_ts + interval '4 minutes' end,
              12, case when random() < 0.7 then 'card' when random() < 0.6 then 'cash' else 'pix' end, 0)
      returning id into v_order;

      v_items := 1 + floor(random() * 3.5)::int;
      for v_qty in 1..v_items loop
        -- weighted pick
        v_rand := random() * 141;
        v_pick := (select idx from (
                    select idx, sum(m_weights[idx]) over (order by idx) as cum
                      from generate_subscripts(m_weights, 1) idx) w
                   where cum >= v_rand order by idx limit 1);
        v_pick := coalesce(v_pick, 1);
        insert into order_items (restaurant_id, order_id, menu_item_id, name, quantity, unit_price)
        values (p_restaurant, v_order, m_ids[v_pick], m_names[v_pick], case when random() < 0.15 then 2 else 1 end, m_prices[v_pick]);
      end loop;

      select sum(total) into v_sub from order_items where order_id = v_order;
      update orders set subtotal = v_sub, total = v_sub where id = v_order;
    end loop;
  end loop;

  -- Live orders for the kitchen display
  for v_k in 1..7 loop
    v_status := (array['new', 'new', 'accepted', 'preparing', 'preparing', 'ready', 'accepted'])[v_k]::order_status;
    v_src := (array['ifood', 'pos', 'ubereats', 'manual', 'website', 'doordash', 'pos'])[v_k]::order_source;
    insert into orders (restaurant_id, source, is_simulated, status, fulfillment, customer_name, notes, created_at, estimated_prep_minutes)
    values (p_restaurant, v_src, v_src in ('ifood', 'ubereats', 'doordash'), v_status,
            case when v_src in ('ifood', 'ubereats', 'doordash') then 'delivery' else 'dine_in' end,
            (array['Júlia M.', 'Mesa 4', 'Carlos R.', 'Mesa 9', 'Emanuele W.', 'Nicolas K.', 'Mesa 2'])[v_k],
            case v_k when 1 then 'Sem cebola, por favor' when 4 then 'Alergia: amendoim' else null end,
            now() - make_interval(mins => (8 - v_k) * 3), 12)
    returning id into v_order;
    insert into order_items (restaurant_id, order_id, menu_item_id, name, quantity, unit_price, modifiers)
    select p_restaurant, v_order, id, name, case when name = 'Burger Clássico' then 1 + (v_k % 2) else 1 end, price,
           case when name = 'Burger Clássico' and v_k = 1 then 'Sem cebola' when name = 'Batata Rústica' and v_k = 3 then 'Bem crocante' end
      from menu_items where restaurant_id = p_restaurant and name in ('Burger Clássico', 'Batata Rústica');
    select sum(total) into v_sub from order_items where order_id = v_order;
    update orders set subtotal = v_sub, total = v_sub where id = v_order;
  end loop;

  -- Expenses (recurring templates generate their history)
  insert into expenses (restaurant_id, description, amount, category, date, payment_method, is_recurring, recurrence, next_due_on)
  values
    (p_restaurant, 'Aluguel', 4200, 'rent', (date_trunc('month', current_date) - interval '1 month')::date, 'bank_transfer', true, 'monthly', date_trunc('month', current_date)::date),
    (p_restaurant, 'Folha de pagamento da equipe', 5900, 'salaries', (date_trunc('month', current_date) - interval '1 month')::date, 'bank_transfer', true, 'monthly', date_trunc('month', current_date)::date),
    (p_restaurant, 'Energia elétrica', 640, 'electricity', (date_trunc('month', current_date) - interval '1 month' + interval '9 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '9 days')::date),
    (p_restaurant, 'Água', 180, 'water', (date_trunc('month', current_date) - interval '1 month' + interval '11 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '11 days')::date),
    (p_restaurant, 'Gás', 290, 'gas', (date_trunc('month', current_date) - interval '1 month' + interval '14 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '14 days')::date),
    (p_restaurant, 'Anúncios no Instagram', 350, 'marketing', (date_trunc('month', current_date) - interval '1 month' + interval '3 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '3 days')::date);
  perform public.generate_recurring_expenses(p_restaurant);

  for v_day in reverse 45..1 loop
    if extract(isodow from current_date - v_day) in (1, 4) then
      insert into expenses (restaurant_id, description, amount, category, date, supplier_id, payment_method)
      values (p_restaurant, 'Entrega do açougue', round((520 + random() * 260)::numeric, 2), 'ingredients', current_date - v_day, s_meat, 'bank_transfer'),
             (p_restaurant, 'Entrega do hortifruti', round((140 + random() * 90)::numeric, 2), 'ingredients', current_date - v_day, s_produce, 'card');
    end if;
    if extract(isodow from current_date - v_day) = 2 then
      insert into expenses (restaurant_id, description, amount, category, date, supplier_id, payment_method)
      values (p_restaurant, 'Pães e padaria', round((160 + random() * 50)::numeric, 2), 'ingredients', current_date - v_day, s_bakery, 'card'),
             (p_restaurant, 'Bebidas e embalagens', round((210 + random() * 80)::numeric, 2), 'ingredients', current_date - v_day, s_drinks, 'card');
    end if;
  end loop;
  insert into expenses (restaurant_id, description, amount, category, date, payment_method, notes)
  values
    (p_restaurant, 'Comissões dos apps de delivery', 1180, 'delivery_fees', current_date - 20, 'platform_payout', 'Descontado dos repasses'),
    (p_restaurant, 'Comissões dos apps de delivery', 1240, 'delivery_fees', current_date - 5, 'platform_payout', 'Descontado dos repasses'),
    (p_restaurant, 'Conserto da fritadeira', 1450, 'equipment', current_date - 6, 'card', 'Imprevisto — termostato trocado'),
    (p_restaurant, 'Pagamento de impostos', 1900, 'taxes', current_date - 12, 'bank_transfer', null);

  insert into revenue_records (restaurant_id, description, amount, source, date, notes)
  values (p_restaurant, 'Evento privado — festa de aniversário', 1350, 'event', current_date - 9, 'Sinal + restante');

  -- Team
  with ins as (
    insert into employees (restaurant_id, full_name, position, email, phone, role)
    values
      (p_restaurant, 'Lucas Ferreira', 'Chef de cozinha', 'lucas@example.com', '(11) 98000-0201', 'kitchen'),
      (p_restaurant, 'Sofia Martins', 'Cozinheira', 'sofia@example.com', '(11) 98000-0202', 'kitchen'),
      (p_restaurant, 'Daniel Costa', 'Gerente de salão', 'daniel@example.com', '(11) 98000-0203', 'manager'),
      (p_restaurant, 'Mia Tavares', 'Garçonete', 'mia@example.com', '(11) 98000-0204', 'employee'),
      (p_restaurant, 'Ethan Paiva', 'Caixa', 'ethan@example.com', '(11) 98000-0205', 'employee')
    returning id
  ) select array_agg(id) into e_ids from ins;

  for v_day in 0..6 loop
    for v_k in 1..array_length(e_ids, 1) loop
      if (v_day + v_k) % 6 = 0 then continue; end if;
      insert into shifts (restaurant_id, employee_id, starts_at, ends_at, position)
      values (p_restaurant, e_ids[v_k],
              ((v_week_start + v_day)::timestamp + case when v_k % 2 = 0 then interval '10 hours' else interval '16 hours' end) at time zone v_tz,
              ((v_week_start + v_day)::timestamp + case when v_k % 2 = 0 then interval '17 hours' else interval '23 hours' end) at time zone v_tz,
              null);
    end loop;
  end loop;

  insert into time_entries (restaurant_id, employee_id, clock_in, clock_out)
  select p_restaurant, e, s.starts_at + interval '3 minutes', s.ends_at - interval '5 minutes'
    from unnest(e_ids) e join shifts s on s.employee_id = e and s.ends_at < now();

  -- A purchase order waiting to be sent
  with po as (
    insert into purchase_orders (restaurant_id, supplier_id, status, expected_on, notes)
    values (p_restaurant, s_meat, 'draft', current_date + 2, 'Reposição semanal') returning id
  )
  insert into purchase_order_items (restaurant_id, purchase_order_id, inventory_item_id, quantity, unit_cost)
  select p_restaurant, po.id, x.item, x.qty, x.cost from po,
    (values (i_beef, 30::numeric, 9.80::numeric), (i_bacon, 6, 12.40)) as x(item, qty, cost);

  -- Bring prices to realistic Brazilian (BRL) levels.
  update menu_items set price = round(price * 2.5) - 0.10 where restaurant_id = p_restaurant;
  update order_items oi set unit_price = mi.price from menu_items mi where mi.id = oi.menu_item_id and oi.restaurant_id = p_restaurant;
  update orders o set subtotal = s.t, total = s.t
    from (select order_id, sum(total) t from order_items where restaurant_id = p_restaurant group by order_id) s
   where s.order_id = o.id;
  update expenses set amount = round(amount * 2.5) where restaurant_id = p_restaurant;
  update revenue_records set amount = round(amount * 2.5) where restaurant_id = p_restaurant and source <> 'order';
  update inventory_items set unit_cost = round(unit_cost * 4, 2) where restaurant_id = p_restaurant;
  update purchase_order_items set unit_cost = round(unit_cost * 4, 2) where restaurant_id = p_restaurant;

  update public.restaurant_settings set inventory_auto_deduct = true where restaurant_id = p_restaurant;
  update public.restaurants set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = p_restaurant;
end $$;

revoke all on function public.seed_demo_restaurant(uuid) from public, anon;
grant execute on function public.seed_demo_restaurant(uuid) to authenticated;
grant execute on function public.source_label(text), public.status_label(text), public.movement_label(text), public.plan_user_limit(text) to authenticated;

-- Portuguese descriptions for automatic records
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
  values (v_o.restaurant_id, 'Pedido #' || v_o.number, v_o.total, 'order',
          (v_o.completed_at at time zone coalesce(v_tz, 'UTC'))::date, v_o.id, v_o.payment_method, v_o.created_by)
  on conflict (order_id) do update set amount = excluded.amount, date = excluded.date;

  if coalesce(v_auto, true) and not v_o.inventory_deducted then
    insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason, reference_type, reference_id, created_by)
    select v_o.restaurant_id, ii.id, 'order_deduction',
           -sum(public.convert_quantity(ri.quantity, ri.unit, ii.unit) * oi.quantity),
           'Pedido #' || v_o.number, 'order', v_o.id, auth.uid()
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

create or replace function public.process_order_reversal(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_o public.orders;
begin
  select * into v_o from public.orders where id = p_order;
  delete from public.revenue_records where order_id = v_o.id;
  if v_o.inventory_deducted then
    insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason, reference_type, reference_id, created_by)
    select restaurant_id, inventory_item_id, 'adjustment', -sum(quantity_delta),
           'Pedido #' || v_o.number || ' cancelado — estoque devolvido', 'order', v_o.id, auth.uid()
      from public.inventory_movements
     where reference_type = 'order' and reference_id = v_o.id and type = 'order_deduction'
     group by restaurant_id, inventory_item_id
    having sum(quantity_delta) <> 0;
    update public.orders set inventory_deducted = false where id = v_o.id;
  end if;
end $$;

create or replace function public.receive_purchase_order(p_po uuid, p_record_expense boolean default true) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_po public.purchase_orders;
  v_total numeric(12, 2);
  v_supplier text;
begin
  select * into v_po from public.purchase_orders where id = p_po for update;
  if not found then
    raise exception 'Pedido de compra não encontrado' using errcode = 'P0002';
  end if;
  if not (public.can(v_po.restaurant_id, 'suppliers', 'edit') and public.can(v_po.restaurant_id, 'inventory', 'edit')) then
    raise exception 'Você precisa de permissão para editar fornecedores e estoque' using errcode = '42501';
  end if;
  if v_po.status in ('received', 'cancelled') then
    raise exception 'Este pedido de compra já está %', v_po.status using errcode = '22023';
  end if;

  insert into public.inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, unit_cost, reason, reference_type, reference_id)
  select v_po.restaurant_id, inventory_item_id, 'po_receipt', quantity, unit_cost, 'Pedido de compra recebido', 'purchase_order', v_po.id
    from public.purchase_order_items where purchase_order_id = v_po.id;

  update public.purchase_orders set status = 'received', received_at = now() where id = v_po.id;

  select coalesce(sum(quantity * unit_cost), 0) into v_total from public.purchase_order_items where purchase_order_id = v_po.id;
  if p_record_expense and v_total > 0 and public.can(v_po.restaurant_id, 'finances', 'edit') then
    select name into v_supplier from public.suppliers where id = v_po.supplier_id;
    insert into public.expenses (restaurant_id, description, amount, category, date, supplier_id, notes)
    values (v_po.restaurant_id, 'Compra de ' || v_supplier, v_total, 'ingredients', current_date, v_po.supplier_id,
            'Registrada automaticamente ao receber o pedido de compra');
  end if;
end $$;
update public.revenue_records set description = regexp_replace(description, '^Order #', 'Pedido #') where source = 'order';


-- =============================================================================
-- Custom roles: owners can create their own roles (e.g. "Caixa", "Garçom")
-- with a per-section permission matrix, in addition to the built-in ones.
-- =============================================================================
create table if not exists public.custom_roles (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 40),
  description text check (description is null or char_length(description) <= 200),
  created_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create table if not exists public.custom_role_permissions (
  custom_role_id uuid not null references public.custom_roles (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  section text not null check (section in (
    'overview', 'orders', 'finances', 'inventory', 'menu', 'suppliers', 'team',
    'analytics', 'assistant', 'integrations', 'settings'
  )),
  can_view boolean not null default false,
  can_edit boolean not null default false,
  primary key (custom_role_id, section),
  check (not can_edit or can_view)
);

alter table public.restaurant_members add column if not exists custom_role_id uuid references public.custom_roles (id) on delete set null;
alter table public.invitations add column if not exists custom_role_id uuid references public.custom_roles (id) on delete set null;

alter table public.custom_roles enable row level security;
alter table public.custom_role_permissions enable row level security;

create policy custom_roles_select on public.custom_roles for select to authenticated using (public.is_member(restaurant_id));
create policy custom_roles_insert on public.custom_roles for insert to authenticated with check (public.member_role(restaurant_id) = 'owner');
create policy custom_roles_update on public.custom_roles for update to authenticated using (public.member_role(restaurant_id) = 'owner') with check (public.member_role(restaurant_id) = 'owner');
create policy custom_roles_delete on public.custom_roles for delete to authenticated using (public.member_role(restaurant_id) = 'owner');
create policy custom_role_permissions_select on public.custom_role_permissions for select to authenticated using (public.is_member(restaurant_id));
create policy custom_role_permissions_insert on public.custom_role_permissions for insert to authenticated with check (public.member_role(restaurant_id) = 'owner');
create policy custom_role_permissions_update on public.custom_role_permissions for update to authenticated using (public.member_role(restaurant_id) = 'owner') with check (public.member_role(restaurant_id) = 'owner');
create policy custom_role_permissions_delete on public.custom_role_permissions for delete to authenticated using (public.member_role(restaurant_id) = 'owner');

create trigger guard_custom_role_permissions before insert or update on public.custom_role_permissions
  for each row execute function public.assert_same_restaurant('custom_role_id', 'custom_roles');
create trigger guard_invitations_custom_role before insert or update on public.invitations
  for each row execute function public.assert_same_restaurant('custom_role_id', 'custom_roles');
create trigger guard_members_custom_role before insert or update on public.restaurant_members
  for each row execute function public.assert_same_restaurant('custom_role_id', 'custom_roles');
create trigger custom_roles_fixed_tenant before update on public.custom_roles
  for each row execute function public.forbid_restaurant_change();
create trigger custom_role_permissions_fixed_tenant before update on public.custom_role_permissions
  for each row execute function public.forbid_restaurant_change();

-- Permission check now honours custom roles.
create or replace function public.can(r uuid, section text, action text default 'view') returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_role public.app_role;
  v_custom uuid;
  v_ok boolean;
begin
  select m.role, m.custom_role_id into v_role, v_custom
    from public.restaurant_members m
   where m.restaurant_id = r and m.user_id = auth.uid() and m.status = 'active';
  if v_role is null then
    return false;
  end if;
  if v_role = 'owner' then
    return true;
  end if;
  if v_custom is not null then
    select case when action = 'edit' then p.can_edit else p.can_view end into v_ok
      from public.custom_role_permissions p
     where p.custom_role_id = v_custom and p.section = can.section;
  else
    select case when action = 'edit' then rp.can_edit else rp.can_view end into v_ok
      from public.role_permissions rp
     where rp.restaurant_id = r and rp.role = v_role and rp.section = can.section;
  end if;
  return coalesce(v_ok, false);
end $$;

-- Owner assigns a built-in role, or a custom role (base role becomes 'employee').
create or replace function public.set_member_role(p_member uuid, p_role public.app_role, p_custom_role uuid default null) returns void
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
  if p_role = 'owner' then
    raise exception 'Invalid role' using errcode = '22023';
  end if;
  if p_custom_role is not null and not exists (select 1 from public.custom_roles where id = p_custom_role and restaurant_id = v_m.restaurant_id) then
    raise exception 'Cross-restaurant reference rejected' using errcode = '42501';
  end if;
  update public.restaurant_members
     set role = case when p_custom_role is not null then 'employee' else p_role end,
         custom_role_id = p_custom_role
   where id = p_member;
  update public.employees set role = case when p_custom_role is not null then 'employee' else p_role end where member_id = p_member;
end $$;

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

  insert into public.restaurant_members (restaurant_id, user_id, role, custom_role_id)
  values (v_inv.restaurant_id, auth.uid(), v_inv.role, v_inv.custom_role_id)
  on conflict (restaurant_id, user_id) do update set role = excluded.role, custom_role_id = excluded.custom_role_id, status = 'active'
  returning id into v_member;

  insert into public.employees (restaurant_id, member_id, full_name, email, role)
  select v_inv.restaurant_id, v_member, coalesce(p.full_name, v_email), v_email, v_inv.role
    from public.profiles p where p.id = auth.uid()
     and not exists (select 1 from public.employees e where e.member_id = v_member);

  update public.invitations set accepted_at = now() where id = v_inv.id;
  update public.profiles set last_restaurant_id = v_inv.restaurant_id where id = auth.uid();
  return v_inv.restaurant_id;
end $$;

revoke execute on function public.set_member_role(uuid, public.app_role, uuid) from public, anon;
grant execute on function public.set_member_role(uuid, public.app_role, uuid) to authenticated;
