create function public.sync_routine_todos_for_user(p_user_id uuid, p_year integer, p_week integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare inserted_count integer;
begin
    if p_user_id is null then raise exception 'Benutzer erforderlich.'; end if;
    if current_user <> 'service_role' and p_user_id is distinct from auth.uid() then
        raise exception 'Kein Zugriff auf diesen Benutzer.';
    end if;
    if p_year is null or p_week is null or p_week < 1 or
       p_week > extract(week from make_date(p_year,12,28)) then
        raise exception 'Ungültige ISO-Kalenderwoche.';
    end if;
    insert into public.todos (user_id,text,priority,routine_task_id,routine_year,routine_week,completed_at)
    select c.user_id,
        case c.task_id
            when 'plants' then 'Pflanzen gießen'
            when 'orchids' then 'Orchideen wässern'
            when 'aquarium-small' then 'Aquarium kleiner Wasserwechsel'
            when 'aquarium-large' then 'Aquarium großer Wasserwechsel'
            when 'water-test' then 'Wassertest'
            else c.task_id end,
        'a',c.task_id,c.year,c.week,
        case when c.done then now() else null end
    from public.calendar_tasks c
    where c.user_id = p_user_id and (c.year,c.week) <= (p_year,p_week)
    order by c.year,c.week,c.task_id
    on conflict (user_id,routine_year,routine_week,routine_task_id) do nothing;
    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;

revoke all on function public.sync_routine_todos_for_user(uuid,integer,integer) from public, anon;
grant execute on function public.sync_routine_todos_for_user(uuid,integer,integer) to authenticated,service_role;
create or replace function public.sync_week_routine_todos(p_year integer,p_week integer)
returns integer language sql security invoker set search_path='' as $$
 select public.sync_routine_todos_for_user(auth.uid(),p_year,p_week);
$$;

create table public.push_deliveries (
 subscription_id bigint not null references public.push_subscriptions(id) on delete cascade,
 local_date date not null,
 kind text not null default 'morning',
 status text not null default 'claimed' check(status in ('claimed','sent','failed')),
 created_at timestamptz not null default now(),
 sent_at timestamptz,
 primary key(subscription_id,local_date,kind)
);
alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon,authenticated;
grant select,insert,update,delete on public.push_deliveries to service_role;

-- Cron uses UTC. Only the invocation corresponding to 09:00 Europe/Berlin sends.
select cron.alter_job(job_id := (select jobid from cron.job where jobname='projekt-app-09-uhr'),
 schedule := '0 7,8 * * *',
 command := $cron$select net.http_post(
 url:='https://osmmjfuzuxhwtfcttdxp.supabase.co/functions/v1/swift-processor',
 headers:='{}'::jsonb, timeout_milliseconds:=30000);$cron$);
