-- Only cron knows the bearer secret; the Edge Function can compare its hash.
create schema if not exists dock_private;
revoke all on schema dock_private from public,anon,authenticated;
grant usage on schema dock_private to service_role;
create table dock_private.push_cron_auth(id boolean primary key default true check(id),token_hash text not null);
grant select on dock_private.push_cron_auth to service_role;
do $$
declare token text:=encode(extensions.gen_random_bytes(32),'hex');
begin
 perform vault.create_secret(token,'dock_push_cron_token','Internal Dock cron authentication');
 insert into dock_private.push_cron_auth(id,token_hash) values(true,encode(extensions.digest(token,'sha256'),'hex'));
end $$;
create function public.verify_push_cron_token(p_token text) returns boolean
language sql security invoker set search_path='' as $$
 select exists(select 1 from dock_private.push_cron_auth
 where length(p_token)=64 and token_hash=encode(extensions.digest(p_token,'sha256'),'hex'));
$$;
revoke all on function public.verify_push_cron_token(text) from public,anon,authenticated;
grant execute on function public.verify_push_cron_token(text) to service_role;
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='projekt-app-09-uhr'),
 command:=$cron$select net.http_post(
 url:='https://osmmjfuzuxhwtfcttdxp.supabase.co/functions/v1/swift-processor',
 headers:=jsonb_build_object('x-dock-cron-token',(select decrypted_secret from vault.decrypted_secrets where name='dock_push_cron_token')),
 timeout_milliseconds:=30000);$cron$);
