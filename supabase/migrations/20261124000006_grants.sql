-- =============================================================================
-- FORKLY — function grants
-- Postgres/Supabase grant EXECUTE broadly by default. Signed-out visitors only
-- need the invitation preview; internal helpers are never callable directly.
-- =============================================================================
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated, service_role;

revoke execute on function public.seed_role_permissions(uuid) from authenticated;
revoke execute on function public.process_order_completion(uuid) from authenticated;
revoke execute on function public.process_order_reversal(uuid) from authenticated;

grant execute on function public.invitation_preview(text) to anon;
