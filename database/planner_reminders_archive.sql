-- Issue 32: retain reminders; only provider-accepted pushes enter the archive.
-- No reminder/user content is deleted by this migration.
select cron.unschedule(jobid) from cron.job where jobname='dock-reminders-cleanup';

alter table public.planner_reminders
 add column archived_at timestamptz,
 add column push_status text not null default 'pending' check(push_status in ('pending','processing','sent','failed','no_subscription','missed','uncertain')),
 add column push_status_at timestamptz,
 add column push_attempts integer not null default 0 check(push_attempts>=0),
 add column push_successes integer not null default 0 check(push_successes>=0),
 add column push_failures integer not null default 0 check(push_failures>=0),
 add constraint reminders_archive_requires_sent check(archived_at is null or (push_status='sent' and push_successes>0));
create index planner_reminders_archive_owner on public.planner_reminders(user_id,archived_at desc) where archived_at is not null;
create index push_reminder_evidence on public.push_deliveries(kind) where kind like 'reminder:%';
-- Existing own-row policies and column-specific INSERT/UPDATE grants remain unchanged.
-- The newly added server-only columns are readable, not client-writable.

-- Reconstruct only outcomes still evidenced by the existing delivery ledger.
with evidence as (
 select r.id,count(*)::int attempts,count(*) filter(where d.status='sent')::int successes,
 count(*) filter(where d.status='failed')::int failures,
 min(coalesce(d.sent_at,d.created_at)) filter(where d.status='sent') accepted_at
 from public.planner_reminders r join public.push_deliveries d on d.kind='reminder:'||r.id::text group by r.id
)
update public.planner_reminders r set push_attempts=e.attempts,push_successes=e.successes,push_failures=e.failures,
 archived_at=e.accepted_at,push_status=case when e.successes>0 then 'sent' when e.failures=e.attempts then 'failed' else 'uncertain' end,
 push_status_at=coalesce(e.accepted_at,clock_timestamp()) from evidence e where e.id=r.id;

create or replace function dock_private.prepare_planner_reminder() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and old.push_status<>'pending' then
  raise exception 'Diese Erinnerung wurde bereits verarbeitet. Bitte für einen neuen Push eine neue Erinnerung anlegen.';
 end if;
 new.timezone='Europe/Berlin';new.title=trim(new.title);
 new.push_at=(new.reminder_date+coalesce(new.reminder_time,time '09:00')) at time zone new.timezone;
 new.updated_at=clock_timestamp();return new;
end $$;

create function public.reconcile_planner_reminders() returns void language plpgsql security invoker set search_path='' as $$
begin
 -- Recover already-recorded legacy acknowledgements during the rolling deployment.
 with evidence as (
  select r.id,count(*)::int attempts,count(*) filter(where d.status='sent')::int successes,
  count(*) filter(where d.status='failed')::int failures,min(coalesce(d.sent_at,d.created_at)) filter(where d.status='sent') accepted_at
  from public.planner_reminders r join public.push_deliveries d on d.kind='reminder:'||r.id::text
  where r.archived_at is null group by r.id
 ) update public.planner_reminders r set push_attempts=greatest(r.push_attempts,e.attempts),
 push_successes=greatest(r.push_successes,e.successes),push_failures=greatest(r.push_failures,e.failures),
 archived_at=e.accepted_at,push_status=case when e.successes>0 then 'sent' else 'failed' end,push_status_at=clock_timestamp()
 from evidence e where e.id=r.id and (e.successes>0 or e.failures=e.attempts);
 -- No transport retries for uncertain sends. Preserve the row for inspection.
 update public.planner_reminders set push_status='uncertain',push_status_at=clock_timestamp()
 where archived_at is null and push_status='processing' and push_at<date_trunc('minute',clock_timestamp())-interval '2 minutes';
 update public.planner_reminders r set push_status=case when not exists(select 1 from public.push_subscriptions s where s.user_id=r.user_id) then 'no_subscription' else 'missed' end,
 push_status_at=clock_timestamp()
 where archived_at is null and push_status='pending' and push_at<date_trunc('minute',clock_timestamp());
end $$;

create or replace function public.due_planner_reminders() returns table(id uuid,user_id uuid) language sql security invoker set search_path='' as $$
 select r.id,r.user_id from public.planner_reminders r
 where r.archived_at is null and r.push_status in ('pending','processing')
 and r.push_at>=date_trunc('minute',clock_timestamp()) and r.push_at<date_trunc('minute',clock_timestamp())+interval '1 minute'
 and r.updated_at<=r.push_at;
$$;

create or replace function public.claim_planner_reminder(p_reminder uuid,p_subscription bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.planner_reminders;reserved boolean;begin
 select * into r from public.planner_reminders where id=p_reminder for update;
 if not found or r.archived_at is not null or r.push_status not in ('pending','processing') or r.updated_at>r.push_at
 or r.push_at<date_trunc('minute',clock_timestamp()) or r.push_at>=date_trunc('minute',clock_timestamp())+interval '1 minute' then return null;end if;
 if not exists(select 1 from public.push_subscriptions where id=p_subscription and user_id=r.user_id) then return null;end if;
 insert into public.push_deliveries(subscription_id,local_date,kind) values(p_subscription,r.reminder_date,'reminder:'||r.id) on conflict do nothing returning true into reserved;
 if reserved is not true then return null;end if;
 update public.planner_reminders set push_status='processing',push_status_at=clock_timestamp(),push_attempts=push_attempts+1 where id=r.id;
 return jsonb_build_object('id',r.id,'title',r.title,'description',r.description,'local_date',r.reminder_date);
end $$;

create function public.skip_planner_reminder(p_reminder uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 update public.planner_reminders set push_status='no_subscription',push_status_at=clock_timestamp()
 where id=p_reminder and archived_at is null and push_status='pending' and updated_at<=push_at
 and push_at>=date_trunc('minute',clock_timestamp()) and push_at<date_trunc('minute',clock_timestamp())+interval '1 minute';
end $$;

-- Record transport acceptance and archival in the SAME database transaction.
-- Only a previously reserved own-device ledger entry can be finalized once.
create function public.finish_planner_reminder(p_reminder uuid,p_subscription bigint,p_status text) returns boolean language plpgsql security invoker set search_path='' as $$
declare r public.planner_reminders;changed boolean;successes int;failures int;stamp timestamptz:=clock_timestamp();begin
 if p_status not in ('sent','failed') or p_status is null then raise exception 'Ungültiger Versandstatus';end if;
 select * into r from public.planner_reminders where id=p_reminder for update;if not found then return false;end if;
 if not exists(select 1 from public.push_subscriptions where id=p_subscription and user_id=r.user_id) then return false;end if;
 update public.push_deliveries set status=p_status,sent_at=case when p_status='sent' then stamp else null end
 where subscription_id=p_subscription and kind='reminder:'||r.id and status='claimed' returning true into changed;
 if changed is not true then return false;end if;
 successes=r.push_successes+case when p_status='sent' then 1 else 0 end;
 failures=r.push_failures+case when p_status='failed' then 1 else 0 end;
 update public.planner_reminders set push_successes=successes,push_failures=failures,
 archived_at=case when successes>0 then coalesce(r.archived_at,stamp) else null end,
 push_status=case when successes>0 then 'sent' when failures=r.push_attempts then 'failed' else 'processing' end,
 push_status_at=stamp where id=r.id;
 return true;
end $$;

revoke all on function public.reconcile_planner_reminders(),public.skip_planner_reminder(uuid),public.finish_planner_reminder(uuid,bigint,text) from public,anon,authenticated;
grant execute on function public.reconcile_planner_reminders(),public.skip_planner_reminder(uuid),public.finish_planner_reminder(uuid,bigint,text) to service_role;
-- Existing due/claim service-only grants are preserved by CREATE OR REPLACE.
select public.reconcile_planner_reminders();
