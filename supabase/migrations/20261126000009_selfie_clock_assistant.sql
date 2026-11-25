-- =============================================================================
-- CHEFFEDATA — 0009: selfie on the time clock, AI assistant usage quota.
-- =============================================================================

-- ---------------------------------------------------------------- selfie clock
alter table public.time_entries
  add column if not exists clock_in_photo text,
  add column if not exists clock_out_photo text;

alter table public.restaurant_settings
  add column if not exists require_selfie boolean not null default true;

-- Private bucket. Paths: "<restaurant_id>/<user_id>/<file>.jpg".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('timeclock', 'timeclock', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "timeclock write own" on storage.objects;
create policy "timeclock write own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'timeclock'
    and public.is_member(public.try_uuid((storage.foldername(name))[1]))
    and (storage.foldername(name))[2] = auth.uid()::text
  );
drop policy if exists "timeclock read" on storage.objects;
create policy "timeclock read" on storage.objects for select to authenticated
  using (
    bucket_id = 'timeclock'
    and (
      ((storage.foldername(name))[2] = auth.uid()::text and public.is_member(public.try_uuid((storage.foldername(name))[1])))
      or public.can(public.try_uuid((storage.foldername(name))[1]), 'team', 'view')
    )
  );
drop policy if exists "timeclock delete" on storage.objects;
create policy "timeclock delete" on storage.objects for delete to authenticated
  using (bucket_id = 'timeclock' and public.can(public.try_uuid((storage.foldername(name))[1]), 'team', 'edit'));

drop function if exists public.clock_toggle(uuid);
create or replace function public.clock_toggle(p_restaurant uuid, p_photo text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member public.restaurant_members;
  v_employee uuid;
  v_open public.time_entries;
  v_name text;
  v_email text;
  v_require boolean;
begin
  select * into v_member from public.restaurant_members
   where restaurant_id = p_restaurant and user_id = auth.uid() and status = 'active';
  if not found then
    raise exception 'Você não faz parte deste restaurante' using errcode = '42501';
  end if;

  select coalesce(require_selfie, true) into v_require from public.restaurant_settings where restaurant_id = p_restaurant;
  if p_photo is not null then
    -- The photo must be the caller's own upload for this restaurant.
    if p_photo not like p_restaurant::text || '/' || auth.uid()::text || '/%'
       or not exists (select 1 from storage.objects where bucket_id = 'timeclock' and name = p_photo) then
      raise exception 'Selfie inválida. Tire a foto de novo.' using errcode = '22023';
    end if;
  elsif coalesce(v_require, true) then
    raise exception 'Tire uma selfie para bater o ponto.' using errcode = '22023';
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
    update public.time_entries
       set clock_out = greatest(now(), v_open.clock_in + interval '1 second'), clock_out_photo = p_photo
     where id = v_open.id;
    return jsonb_build_object('status', 'out', 'at', now(), 'since', v_open.clock_in);
  end if;
  insert into public.time_entries (restaurant_id, employee_id, clock_in, clock_in_photo) values (p_restaurant, v_employee, now(), p_photo);
  return jsonb_build_object('status', 'in', 'at', now());
end $$;

revoke all on function public.clock_toggle(uuid, text) from public, anon;
grant execute on function public.clock_toggle(uuid, text) to authenticated;

-- ---------------------------------------------------------------- assistant quota
create table if not exists public.assistant_usage (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  day date not null,
  messages int not null default 0,
  primary key (restaurant_id, day)
);
alter table public.assistant_usage enable row level security;
drop policy if exists "assistant usage read" on public.assistant_usage;
create policy "assistant usage read" on public.assistant_usage for select to authenticated
  using (public.is_member(restaurant_id));

-- Counts one assistant message for today; returns false once the daily limit is reached.
create or replace function public.assistant_take_quota(p_restaurant uuid, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_used int;
begin
  if not public.can(p_restaurant, 'overview', 'view') then
    raise exception 'Você não tem permissão para usar o assistente' using errcode = '42501';
  end if;
  insert into public.assistant_usage (restaurant_id, day, messages)
  values (p_restaurant, (now() at time zone 'America/Sao_Paulo')::date, 1)
  on conflict (restaurant_id, day) do update set messages = public.assistant_usage.messages + 1
  returning messages into v_used;
  if v_used > p_limit then
    update public.assistant_usage set messages = messages - 1
     where restaurant_id = p_restaurant and day = (now() at time zone 'America/Sao_Paulo')::date;
    return false;
  end if;
  return true;
end $$;

revoke all on function public.assistant_take_quota(uuid, int) from public, anon;
grant execute on function public.assistant_take_quota(uuid, int) to authenticated;
grant select on public.assistant_usage to authenticated;
