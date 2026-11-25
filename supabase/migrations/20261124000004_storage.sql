-- =============================================================================
-- FORKLY — storage buckets (logos, menu photos, receipts)
-- Object paths are always "<restaurant_id>/<file>" so policies can scope them.
-- =============================================================================

create or replace function public.try_uuid(p text) returns uuid
language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('branding', 'branding', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
  ('menu-photos', 'menu-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('receipts', 'receipts', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create policy "branding write" on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and public.can(public.try_uuid((storage.foldername(name))[1]), 'settings', 'edit'));
create policy "branding update" on storage.objects for update to authenticated
  using (bucket_id = 'branding' and public.can(public.try_uuid((storage.foldername(name))[1]), 'settings', 'edit'));
create policy "branding delete" on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and public.can(public.try_uuid((storage.foldername(name))[1]), 'settings', 'edit'));

create policy "menu photos write" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-photos' and public.can(public.try_uuid((storage.foldername(name))[1]), 'menu', 'edit'));
create policy "menu photos update" on storage.objects for update to authenticated
  using (bucket_id = 'menu-photos' and public.can(public.try_uuid((storage.foldername(name))[1]), 'menu', 'edit'));
create policy "menu photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu-photos' and public.can(public.try_uuid((storage.foldername(name))[1]), 'menu', 'edit'));

create policy "receipts read" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.can(public.try_uuid((storage.foldername(name))[1]), 'finances', 'view'));
create policy "receipts write" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.can(public.try_uuid((storage.foldername(name))[1]), 'finances', 'edit'));
create policy "receipts delete" on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.can(public.try_uuid((storage.foldername(name))[1]), 'finances', 'edit'));
