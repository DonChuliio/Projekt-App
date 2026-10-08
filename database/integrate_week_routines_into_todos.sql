alter table public.todos
    add column routine_task_id text,
    add column routine_year integer,
    add column routine_week integer,
    add column completed_at timestamptz;

alter table public.todos add constraint todos_routine_source_check check (
    (routine_task_id is null and routine_year is null and routine_week is null)
    or (routine_task_id is not null and routine_year is not null and routine_week is not null
        and routine_week between 1 and 53)
);
alter table public.todos add constraint todos_routine_occurrence_key
    unique (user_id, routine_year, routine_week, routine_task_id);
create index todos_open_user_priority_idx on public.todos (user_id, priority) where completed_at is null;

-- Preserve the occurrence identity, including when a task has been completed.
create function public.protect_routine_todo_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
    if old.routine_task_id is not null then
        if tg_op = 'DELETE' and current_user in ('authenticated','anon') then
            raise exception 'Routine-To-dos werden über completed_at abgeschlossen.';
        end if;
        if tg_op = 'UPDATE' and (new.user_id,new.routine_year,new.routine_week,new.routine_task_id)
            is distinct from (old.user_id,old.routine_year,old.routine_week,old.routine_task_id) then
            raise exception 'Die Herkunft eines Routine-To-dos darf nicht geändert werden.';
        end if;
    end if;
    if tg_op = 'DELETE' then return old; end if;
    return new;
end;
$$;
revoke all on function public.protect_routine_todo_identity() from public, anon, authenticated;
create trigger protect_routine_todo_identity before update or delete on public.todos
for each row execute function public.protect_routine_todo_identity();

create function public.sync_week_routine_todos(p_year integer, p_week integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare inserted_count integer;
begin
    if auth.uid() is null then raise exception 'Anmeldung erforderlich.'; end if;
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
    where c.user_id = auth.uid() and (c.year,c.week) <= (p_year,p_week)
    order by c.year,c.week,c.task_id
    on conflict (user_id,routine_year,routine_week,routine_task_id) do nothing;
    get diagnostics inserted_count = row_count;
    return inserted_count;
end;
$$;
revoke all on function public.sync_week_routine_todos(integer,integer) from public, anon;
grant execute on function public.sync_week_routine_todos(integer,integer) to authenticated;
