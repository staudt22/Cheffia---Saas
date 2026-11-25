-- =============================================================================
-- FORKLY — demo workspace seed
-- Fills a restaurant flagged is_demo = true with realistic sample data so
-- prospects can explore the product. Refuses to run on real workspaces.
-- Orders from delivery platforms are flagged is_simulated.
-- =============================================================================

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
    raise exception 'Demo data can only be added to a demo workspace' using errcode = '42501';
  end if;
  if public.member_role(p_restaurant) is distinct from 'owner' then
    raise exception 'Only the owner can seed demo data' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where restaurant_id = p_restaurant) then
    raise exception 'This demo workspace already has data' using errcode = '22023';
  end if;

  v_tz := v_r.timezone;
  perform setseed(0.42);
  update public.restaurant_settings set inventory_auto_deduct = false where restaurant_id = p_restaurant;
  update public.restaurants set restaurant_type = coalesce(restaurant_type, 'Burger & grill') where id = p_restaurant;

  -- Suppliers
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Prime Cuts Butchery', 'Marco Silva', '+1 555 0101', 'orders@primecuts.example', 'Beef, bacon, chicken')
  returning id into s_meat;
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Golden Crust Bakery', 'Anna Lee', '+1 555 0102', 'hello@goldencrust.example', 'Brioche buns')
  returning id into s_bakery;
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'Green Valley Produce', 'Tom Becker', '+1 555 0103', 'sales@greenvalley.example', 'Vegetables, potatoes, lemons')
  returning id into s_produce;
  insert into suppliers (restaurant_id, name, contact_name, phone, email, products_supplied)
  values (p_restaurant, 'City Beverages Co.', 'Priya Nair', '+1 555 0104', 'b2b@citybev.example', 'Soft drinks, ice cream, packaging')
  returning id into s_drinks;

  -- Inventory (unit_cost is per unit of measure)
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Ground beef', 'Meat', 0, 'kg', 15, 9.80, s_meat, 'Walk-in fridge') returning id into i_beef;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location, expires_on)
  values (p_restaurant, 'Brioche bun', 'Bakery', 0, 'unit', 80, 0.45, s_bakery, 'Dry storage', current_date + 2) returning id into i_bun;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Cheddar slices', 'Dairy', 0, 'unit', 100, 0.18, s_meat, 'Walk-in fridge') returning id into i_cheese;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'House sauce', 'Sauces', 0, 'l', 3, 6.50, null, 'Walk-in fridge') returning id into i_sauce;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location, expires_on)
  values (p_restaurant, 'Lettuce', 'Produce', 0, 'kg', 3, 3.20, s_produce, 'Walk-in fridge', current_date + 3) returning id into i_lettuce;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Tomato', 'Produce', 0, 'kg', 4, 2.90, s_produce, 'Walk-in fridge') returning id into i_tomato;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Smoked bacon', 'Meat', 0, 'kg', 4, 12.40, s_meat, 'Walk-in fridge') returning id into i_bacon;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Potatoes', 'Produce', 0, 'kg', 25, 1.10, s_produce, 'Dry storage') returning id into i_potato;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Frying oil', 'Pantry', 0, 'l', 10, 2.30, s_produce, 'Dry storage') returning id into i_oil;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Cola 350ml', 'Beverages', 0, 'unit', 48, 0.55, s_drinks, 'Bar fridge') returning id into i_cola;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Lemons', 'Produce', 0, 'kg', 2, 2.60, s_produce, 'Bar fridge') returning id into i_lemon;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Vanilla ice cream', 'Dairy', 0, 'l', 4, 5.90, s_drinks, 'Freezer') returning id into i_icecream;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Chicken breast', 'Meat', 0, 'kg', 6, 8.20, s_meat, 'Walk-in fridge') returning id into i_chicken;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Takeaway boxes', 'Packaging', 0, 'box', 4, 18.00, s_drinks, 'Dry storage') returning id into i_box;
  insert into inventory_items (restaurant_id, name, category, quantity, unit, min_quantity, unit_cost, supplier_id, storage_location)
  values (p_restaurant, 'Red onion', 'Produce', 0, 'kg', 3, 1.80, s_produce, 'Dry storage') returning id into i_onion;

  -- Opening stock (a few deliberately below minimum to demonstrate alerts)
  insert into inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason)
  values
    (p_restaurant, i_beef, 'initial', 42, 'Opening stock'),
    (p_restaurant, i_bun, 'initial', 64, 'Opening stock'),
    (p_restaurant, i_cheese, 'initial', 380, 'Opening stock'),
    (p_restaurant, i_sauce, 'initial', 9, 'Opening stock'),
    (p_restaurant, i_lettuce, 'initial', 6.5, 'Opening stock'),
    (p_restaurant, i_tomato, 'initial', 9, 'Opening stock'),
    (p_restaurant, i_bacon, 'initial', 2.4, 'Opening stock'),
    (p_restaurant, i_potato, 'initial', 70, 'Opening stock'),
    (p_restaurant, i_oil, 'initial', 24, 'Opening stock'),
    (p_restaurant, i_cola, 'initial', 120, 'Opening stock'),
    (p_restaurant, i_lemon, 'initial', 3.5, 'Opening stock'),
    (p_restaurant, i_icecream, 'initial', 7, 'Opening stock'),
    (p_restaurant, i_chicken, 'initial', 11, 'Opening stock'),
    (p_restaurant, i_box, 'initial', 9, 'Opening stock'),
    (p_restaurant, i_onion, 'initial', 5, 'Opening stock');
  insert into inventory_movements (restaurant_id, inventory_item_id, type, quantity_delta, reason)
  values (p_restaurant, i_lettuce, 'waste', -0.8, 'Wilted — discarded');

  -- Menu
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Burgers', 0) returning id into c_burgers;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Appetizers', 1) returning id into c_sides;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Main dishes', 2) returning id into c_mains;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Drinks', 3) returning id into c_drinks;
  insert into menu_categories (restaurant_id, name, position) values (p_restaurant, 'Desserts', 4) returning id into c_desserts;

  with ins as (
    insert into menu_items (restaurant_id, category_id, name, description, price, position)
    values
      (p_restaurant, c_burgers, 'Classic Burger', '180g beef, cheddar, lettuce, tomato, house sauce', 14.00, 0),
      (p_restaurant, c_burgers, 'Bacon Double', 'Two 180g patties, smoked bacon, double cheddar', 19.50, 1),
      (p_restaurant, c_burgers, 'Crispy Chicken Burger', 'Buttermilk chicken, lettuce, house sauce', 15.00, 2),
      (p_restaurant, c_burgers, 'Smash Onion Burger', 'Smashed patty, caramelised red onion, cheddar', 13.50, 3),
      (p_restaurant, c_sides, 'Hand-cut Fries', 'Twice-fried, sea salt', 5.50, 0),
      (p_restaurant, c_sides, 'Loaded Fries', 'Fries, bacon, cheddar, house sauce', 8.50, 1),
      (p_restaurant, c_mains, 'Grilled Chicken Plate', 'Chicken breast, fries, side salad', 18.00, 0),
      (p_restaurant, c_drinks, 'Cola', '350ml can', 3.50, 0),
      (p_restaurant, c_drinks, 'Fresh Lemonade', 'Squeezed to order', 4.50, 1),
      (p_restaurant, c_drinks, 'Craft Beer', 'Local IPA, 473ml', 7.00, 2),
      (p_restaurant, c_desserts, 'Vanilla Sundae', 'Vanilla ice cream, caramel', 6.00, 0),
      (p_restaurant, c_desserts, 'Brownie', 'Warm chocolate brownie', 6.50, 1)
    returning id, name, price
  )
  select array_agg(id order by name), array_agg(price order by name), array_agg(name order by name)
    into m_ids, m_prices, m_names from ins;

  -- Recipes (Craft Beer & Brownie intentionally have none → "missing recipe" alert)
  for rec in select * from menu_items where restaurant_id = p_restaurant loop
    if rec.name in ('Craft Beer', 'Brownie') then continue; end if;
    insert into recipes (restaurant_id, menu_item_id, prep_minutes)
    values (p_restaurant, rec.id, case when rec.category_id = c_drinks then 2 when rec.category_id = c_desserts then 4 else 12 end);
  end loop;

  insert into recipe_ingredients (restaurant_id, recipe_id, inventory_item_id, quantity, unit)
  select p_restaurant, r.id, x.item, x.qty, x.unit::inventory_unit
    from recipes r join menu_items mi on mi.id = r.menu_item_id
    join lateral (values
      ('Classic Burger', i_beef, 180::numeric, 'g'), ('Classic Burger', i_bun, 1, 'unit'), ('Classic Burger', i_cheese, 2, 'unit'),
      ('Classic Burger', i_sauce, 30, 'ml'), ('Classic Burger', i_lettuce, 20, 'g'), ('Classic Burger', i_tomato, 30, 'g'),
      ('Bacon Double', i_beef, 360, 'g'), ('Bacon Double', i_bun, 1, 'unit'), ('Bacon Double', i_cheese, 4, 'unit'),
      ('Bacon Double', i_bacon, 60, 'g'), ('Bacon Double', i_sauce, 30, 'ml'),
      ('Crispy Chicken Burger', i_chicken, 170, 'g'), ('Crispy Chicken Burger', i_bun, 1, 'unit'),
      ('Crispy Chicken Burger', i_lettuce, 20, 'g'), ('Crispy Chicken Burger', i_sauce, 30, 'ml'), ('Crispy Chicken Burger', i_oil, 80, 'ml'),
      ('Smash Onion Burger', i_beef, 150, 'g'), ('Smash Onion Burger', i_bun, 1, 'unit'), ('Smash Onion Burger', i_cheese, 1, 'unit'),
      ('Smash Onion Burger', i_onion, 50, 'g'),
      ('Hand-cut Fries', i_potato, 250, 'g'), ('Hand-cut Fries', i_oil, 60, 'ml'),
      ('Loaded Fries', i_potato, 250, 'g'), ('Loaded Fries', i_oil, 60, 'ml'), ('Loaded Fries', i_bacon, 40, 'g'),
      ('Loaded Fries', i_cheese, 2, 'unit'), ('Loaded Fries', i_sauce, 20, 'ml'),
      ('Grilled Chicken Plate', i_chicken, 220, 'g'), ('Grilled Chicken Plate', i_potato, 200, 'g'),
      ('Grilled Chicken Plate', i_lettuce, 40, 'g'), ('Grilled Chicken Plate', i_tomato, 40, 'g'),
      ('Cola', i_cola, 1, 'unit'),
      ('Fresh Lemonade', i_lemon, 120, 'g'),
      ('Vanilla Sundae', i_icecream, 150, 'ml')
    ) as x(menu_name, item, qty, unit) on x.menu_name = mi.name
   where r.restaurant_id = p_restaurant;

  -- Popularity weights aligned with m_names (sorted alphabetically)
  -- Bacon Double, Brownie, Classic Burger, Cola, Craft Beer, Crispy Chicken, Fresh Lemonade,
  -- Grilled Chicken Plate, Hand-cut Fries, Loaded Fries, Smash Onion, Vanilla Sundae
  m_weights := array[14, 4, 26, 18, 7, 12, 8, 6, 22, 9, 10, 5];

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
        v_pick := coalesce(v_pick, 3);
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
            (array['Julia M.', 'Table 4', 'Carlos R.', 'Table 9', 'Emma W.', 'Noah K.', 'Table 2'])[v_k],
            case v_k when 1 then 'No onions, please' when 4 then 'Allergy: peanuts' else null end,
            now() - make_interval(mins => (8 - v_k) * 3), 12)
    returning id into v_order;
    insert into order_items (restaurant_id, order_id, menu_item_id, name, quantity, unit_price, modifiers)
    values (p_restaurant, v_order, m_ids[3], m_names[3], 1 + (v_k % 2), m_prices[3], case when v_k = 1 then 'No onion' end),
           (p_restaurant, v_order, m_ids[9], m_names[9], 1, m_prices[9], case when v_k = 3 then 'Extra crispy' end);
    select sum(total) into v_sub from order_items where order_id = v_order;
    update orders set subtotal = v_sub, total = v_sub where id = v_order;
  end loop;

  -- Expenses (recurring templates generate their history)
  insert into expenses (restaurant_id, description, amount, category, date, payment_method, is_recurring, recurrence, next_due_on)
  values
    (p_restaurant, 'Rent', 4200, 'rent', (date_trunc('month', current_date) - interval '1 month')::date, 'bank_transfer', true, 'monthly', date_trunc('month', current_date)::date),
    (p_restaurant, 'Kitchen & floor staff payroll', 5900, 'salaries', (date_trunc('month', current_date) - interval '1 month')::date, 'bank_transfer', true, 'monthly', date_trunc('month', current_date)::date),
    (p_restaurant, 'Electricity', 640, 'electricity', (date_trunc('month', current_date) - interval '1 month' + interval '9 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '9 days')::date),
    (p_restaurant, 'Water', 180, 'water', (date_trunc('month', current_date) - interval '1 month' + interval '11 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '11 days')::date),
    (p_restaurant, 'Gas', 290, 'gas', (date_trunc('month', current_date) - interval '1 month' + interval '14 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '14 days')::date),
    (p_restaurant, 'Instagram ads', 350, 'marketing', (date_trunc('month', current_date) - interval '1 month' + interval '3 days')::date, 'card', true, 'monthly', (date_trunc('month', current_date) + interval '3 days')::date);
  perform public.generate_recurring_expenses(p_restaurant);

  for v_day in reverse 45..1 loop
    if extract(isodow from current_date - v_day) in (1, 4) then
      insert into expenses (restaurant_id, description, amount, category, date, supplier_id, payment_method)
      values (p_restaurant, 'Meat delivery', round((520 + random() * 260)::numeric, 2), 'ingredients', current_date - v_day, s_meat, 'bank_transfer'),
             (p_restaurant, 'Produce delivery', round((140 + random() * 90)::numeric, 2), 'ingredients', current_date - v_day, s_produce, 'card');
    end if;
    if extract(isodow from current_date - v_day) = 2 then
      insert into expenses (restaurant_id, description, amount, category, date, supplier_id, payment_method)
      values (p_restaurant, 'Buns & bakery', round((160 + random() * 50)::numeric, 2), 'ingredients', current_date - v_day, s_bakery, 'card'),
             (p_restaurant, 'Beverages & packaging', round((210 + random() * 80)::numeric, 2), 'ingredients', current_date - v_day, s_drinks, 'card');
    end if;
  end loop;
  insert into expenses (restaurant_id, description, amount, category, date, payment_method, notes)
  values
    (p_restaurant, 'Delivery platform commissions', 1180, 'delivery_fees', current_date - 20, 'platform_payout', 'Deducted from payouts'),
    (p_restaurant, 'Delivery platform commissions', 1240, 'delivery_fees', current_date - 5, 'platform_payout', 'Deducted from payouts'),
    (p_restaurant, 'Fryer repair', 1450, 'equipment', current_date - 6, 'card', 'Unplanned — thermostat replaced'),
    (p_restaurant, 'Sales tax remittance', 1900, 'taxes', current_date - 12, 'bank_transfer', null);

  insert into revenue_records (restaurant_id, description, amount, source, date, notes)
  values (p_restaurant, 'Private event — birthday party', 1350, 'event', current_date - 9, 'Deposit + balance');

  -- Team
  with ins as (
    insert into employees (restaurant_id, full_name, position, email, phone, role)
    values
      (p_restaurant, 'Lucas Ferreira', 'Head chef', 'lucas@example.com', '+1 555 0201', 'kitchen'),
      (p_restaurant, 'Sofia Martins', 'Line cook', 'sofia@example.com', '+1 555 0202', 'kitchen'),
      (p_restaurant, 'Daniel Costa', 'Floor manager', 'daniel@example.com', '+1 555 0203', 'manager'),
      (p_restaurant, 'Mia Thompson', 'Server', 'mia@example.com', '+1 555 0204', 'employee'),
      (p_restaurant, 'Ethan Park', 'Cashier', 'ethan@example.com', '+1 555 0205', 'employee')
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
    values (p_restaurant, s_meat, 'draft', current_date + 2, 'Weekly restock') returning id
  )
  insert into purchase_order_items (restaurant_id, purchase_order_id, inventory_item_id, quantity, unit_cost)
  select p_restaurant, po.id, x.item, x.qty, x.cost from po,
    (values (i_beef, 30::numeric, 9.80::numeric), (i_bacon, 6, 12.40)) as x(item, qty, cost);

  update public.restaurant_settings set inventory_auto_deduct = true where restaurant_id = p_restaurant;
  update public.restaurants set onboarding_completed_at = coalesce(onboarding_completed_at, now()) where id = p_restaurant;
end $$;

revoke all on function public.seed_demo_restaurant(uuid) from public;
grant execute on function public.seed_demo_restaurant(uuid) to authenticated;
