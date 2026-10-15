-- Issue 31: standalone reminders, existing subscriptions and delivery ledger.
create table public.planner_reminders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200),
 reminder_date date not null,
 reminder_time time check(reminder_time is null or (extract(second from reminder_time)=0 and reminder_time<time '24:00')),
 timezone text not null default 'Europe/Berlin',
 description text not null default '' check(length(description)<=5000),
 push_at timestamptz not null,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp()
);
create index planner_reminders_owner_day on public.planner_reminders(user_id,reminder_date,reminder_time);
create index planner_reminders_due on public.planner_reminders(push_at);
alter table public.planner_reminders enable row level security;
revoke all on public.planner_reminders from public,anon,authenticated;
grant select,delete on public.planner_reminders to authenticated;
grant insert(title,reminder_date,reminder_time,timezone,description),update(title,reminder_date,reminder_time,timezone,description) on public.planner_reminders to authenticated;
grant select,insert,update,delete on public.planner_reminders to service_role;
create policy reminders_own_select on public.planner_reminders for select to authenticated using(user_id=(select auth.uid()));
create policy reminders_own_insert on public.planner_reminders for insert to authenticated with check(user_id=(select auth.uid()));
create policy reminders_own_update on public.planner_reminders for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy reminders_own_delete on public.planner_reminders for delete to authenticated using(user_id=(select auth.uid()));
create function dock_private.prepare_planner_reminder() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.timezone='Europe/Berlin';
 new.title=trim(new.title);
 new.push_at=(new.reminder_date+coalesce(new.reminder_time,time '09:00')) at time zone new.timezone;
 new.updated_at=clock_timestamp();
 return new;
end $$;
revoke all on function dock_private.prepare_planner_reminder() from public,anon,authenticated;
create trigger prepare_planner_reminder before insert or update of title,reminder_date,reminder_time,timezone,description on public.planner_reminders for each row execute function dock_private.prepare_planner_reminder();
-- One logical reminder per device, even if an already delivered reminder is edited.
create unique index push_reminder_once on public.push_deliveries(subscription_id,kind) where kind like 'reminder:%';
create function public.due_planner_reminders() returns table(id uuid,user_id uuid) language sql security invoker set search_path='' as $$
 select r.id,r.user_id from public.planner_reminders r
 where r.push_at>=date_trunc('minute',clock_timestamp()) and r.push_at<date_trunc('minute',clock_timestamp())+interval '1 minute'
 and r.updated_at<=r.push_at;
$$;
create function public.claim_planner_reminder(p_reminder uuid,p_subscription bigint) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.planner_reminders;reserved boolean;begin
 select * into r from public.planner_reminders where id=p_reminder for update;
 if not found or r.updated_at>r.push_at or r.push_at<date_trunc('minute',clock_timestamp()) or r.push_at>=date_trunc('minute',clock_timestamp())+interval '1 minute' then return null;end if;
 if not exists(select 1 from public.push_subscriptions where id=p_subscription and user_id=r.user_id) then return null;end if;
 insert into public.push_deliveries(subscription_id,local_date,kind) values(p_subscription,r.reminder_date,'reminder:'||r.id) on conflict do nothing returning true into reserved;
 if reserved is not true then return null;end if;
 return jsonb_build_object('id',r.id,'title',r.title,'description',r.description,'local_date',r.reminder_date);
end $$;
revoke all on function public.due_planner_reminders(),public.claim_planner_reminder(uuid,bigint) from public,anon,authenticated;
grant execute on function public.due_planner_reminders(),public.claim_planner_reminder(uuid,bigint) to service_role;
-- Keep the existing authenticated command/Vault token. The same function handles both schedules.
select cron.alter_job(job_id:=(select jobid from cron.job where jobname='projekt-app-09-uhr'),schedule:='* * * * *');
