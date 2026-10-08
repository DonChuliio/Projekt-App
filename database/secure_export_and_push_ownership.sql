-- Preserve existing data; reduce exposed privileges and enforce ownership.
drop policy if exists "Allow push subscription insert" on public.push_subscriptions;
alter table public.push_subscriptions add constraint push_endpoint_allowed check (
 endpoint ~ '^https://(web[.]push[.]apple[.]com|fcm[.]googleapis[.]com|updates[.]push[.]services[.]mozilla[.]com|[A-Za-z0-9-]+[.]notify[.]windows[.]com)(:443)?/'
);
alter table public.bring_exports add column user_id uuid default auth.uid() references auth.users(id) on delete cascade;
drop policy if exists "authenticated users can create bring exports" on public.bring_exports;
drop policy if exists "authenticated users can read own export response" on public.bring_exports;
create policy bring_exports_own_insert on public.bring_exports for insert to authenticated with check (
 (select auth.uid())=user_id and expires_at>now() and expires_at<=now()+interval '30 minutes'
 and length(name) between 1 and 200 and jsonb_array_length(items) between 1 and 200
);
create policy bring_exports_own_select on public.bring_exports for select to authenticated using (
 (select auth.uid())=user_id and expires_at>now()
);
create policy push_deliveries_service_only on public.push_deliveries for all to service_role using(true) with check(true);

