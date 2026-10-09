create table public.routine_columns (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100), legacy_key text,
 active boolean not null default true, created_at timestamptz not null default now(),
 unique(user_id,id), unique(user_id,legacy_key)
);
create table public.routine_tasks (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 task_id text not null default gen_random_uuid()::text,
 column_id uuid not null, name text not null check(length(trim(name)) between 1 and 200),
 weeks integer[] not null default '{}', active boolean not null default true,
 created_at timestamptz not null default now(), primary key(user_id,task_id),
 foreign key(user_id,column_id) references public.routine_columns(user_id,id),
 check(array_position(weeks,null) is null and weeks <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53])
);
create index routine_tasks_column_idx on public.routine_tasks(user_id,column_id);
alter table public.routine_columns enable row level security;
alter table public.routine_tasks enable row level security;
create policy own_routine_columns on public.routine_columns to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy own_routine_tasks on public.routine_tasks to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
revoke all on public.routine_columns,public.routine_tasks from anon,authenticated;
grant select,insert,update on public.routine_columns,public.routine_tasks to authenticated,service_role;

create function public.ensure_routine_templates() returns void language plpgsql security invoker set search_path='' as $$
declare seed record; col uuid;
begin
 if auth.uid() is null then raise exception 'Anmeldung erforderlich';end if;
 for seed in select * from (values
 ('plants','Pflanzen gießen'),('orchids','Orchideen wässern'),('aquarium-small','Aquarium kleiner Wasserwechsel'),('aquarium-large','Aquarium großer Wasserwechsel'),('water-test','Wassertest')) as s(task_id,name)
 loop
  insert into public.routine_columns(user_id,name,legacy_key) values(auth.uid(),seed.name,seed.task_id) on conflict(user_id,legacy_key) do nothing;
  select id into col from public.routine_columns where user_id=auth.uid() and legacy_key=seed.task_id;
  insert into public.routine_tasks(user_id,task_id,column_id,name) values(auth.uid(),seed.task_id,col,seed.name) on conflict(user_id,task_id) do nothing;
 end loop;
end $$;
revoke all on function public.ensure_routine_templates() from public,anon;
grant execute on function public.ensure_routine_templates() to authenticated;

-- Preserve all historical records; copy only the latest plan per task into its reusable template.
do $$ declare u record; t record; col uuid;begin
 for u in select id from auth.users loop
  perform set_config('request.jwt.claim.sub',u.id::text,true);
  perform public.ensure_routine_templates();
  for t in select task_id,array_agg(distinct week order by week) as weeks from public.calendar_tasks c
   where user_id=u.id and year=(select max(year) from public.calendar_tasks x where x.user_id=c.user_id and x.task_id=c.task_id) group by task_id loop
   select column_id into col from public.routine_tasks where user_id=u.id and task_id=t.task_id;
   if col is null then
    insert into public.routine_columns(user_id,name,legacy_key) values(u.id,t.task_id,t.task_id) returning id into col;
    insert into public.routine_tasks(user_id,task_id,column_id,name) values(u.id,t.task_id,col,t.task_id);
   end if;
   update public.routine_tasks set weeks=t.weeks where user_id=u.id and task_id=t.task_id;
  end loop;
 end loop;
 perform set_config('request.jwt.claim.sub','',true);
end $$;

create function public.archive_routine_column(p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Anmeldung erforderlich';end if;
 update public.routine_columns set active=false where id=p_id and user_id=auth.uid() and active;
 if not found then raise exception 'Spalte nicht verfügbar';end if;
 update public.routine_tasks set active=false where column_id=p_id and user_id=auth.uid();
end $$;
revoke all on function public.archive_routine_column(uuid) from public,anon;
grant execute on function public.archive_routine_column(uuid) to authenticated;

create or replace function public.sync_routine_todos_for_user(p_user_id uuid,p_year integer,p_week integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare n integer; m integer;
begin
 if p_user_id is null then raise exception 'Benutzer erforderlich';end if;
 if current_user<>'service_role' and p_user_id is distinct from auth.uid() then raise exception 'Kein Zugriff auf diesen Benutzer';end if;
 if p_year is null or p_year not between 1 and 9999 or p_week is null or p_week<1 or p_week>extract(week from make_date(p_year,12,28)) then raise exception 'Ungültige ISO-Kalenderwoche';end if;
 insert into public.todos(user_id,text,priority,routine_task_id,routine_year,routine_week,completed_at)
 select c.user_id,coalesce(t.name,case c.task_id when 'plants' then 'Pflanzen gießen' when 'orchids' then 'Orchideen wässern' when 'aquarium-small' then 'Aquarium kleiner Wasserwechsel' when 'aquarium-large' then 'Aquarium großer Wasserwechsel' when 'water-test' then 'Wassertest' else c.task_id end),'a',c.task_id,c.year,c.week,case when c.done then now() else null end
 from public.calendar_tasks c left join public.routine_tasks t on (t.user_id,t.task_id)=(c.user_id,c.task_id)
 left join public.routine_columns col on col.id=t.column_id and col.user_id=t.user_id
 where c.user_id=p_user_id and (c.year,c.week)<=(p_year,p_week) and (t.task_id is null or (t.active and col.active and (c.year<p_year or c.week=any(t.weeks))))
 on conflict(user_id,routine_year,routine_week,routine_task_id) do nothing;
 get diagnostics n=row_count;
 insert into public.todos(user_id,text,priority,routine_task_id,routine_year,routine_week)
 select t.user_id,t.name,'a',t.task_id,p_year,w.week from public.routine_tasks t
 join public.routine_columns c on (c.user_id,c.id)=(t.user_id,t.column_id)
 cross join generate_series(1,p_week) w(week)
 where t.user_id=p_user_id and t.active and c.active and w.week=any(t.weeks)
 and not exists(select 1 from public.calendar_tasks old where old.user_id=t.user_id and old.task_id=t.task_id and old.year=p_year and old.week=w.week)
 on conflict(user_id,routine_year,routine_week,routine_task_id) do nothing;
 get diagnostics m=row_count;
 return n+m;
end $$;
