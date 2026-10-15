-- Only synthetic fixture IDs are deleted; entire test rolls back.
begin;
do $$declare fixture_ids uuid[];owner_id uuid;berlin_day date:=(clock_timestamp() at time zone 'Europe/Berlin')::date;removed int;begin
 select id into owner_id from auth.users order by id limit 1;
 with added as (
  insert into public.planner_reminders(user_id,title,reminder_date) values
   (owner_id,'Synthetic cleanup yesterday',berlin_day-1),
   (owner_id,'Synthetic cleanup today',berlin_day),
   (owner_id,'Synthetic cleanup tomorrow',berlin_day+1)
  returning id
 ) select array_agg(id) into fixture_ids from added;
 delete from public.planner_reminders where id=any(fixture_ids) and reminder_date<(clock_timestamp() at time zone 'Europe/Berlin')::date;
 get diagnostics removed=row_count;
 if removed<>1 or (select count(*) from public.planner_reminders where id=any(fixture_ids))<>2 then raise exception 'Cleanup did not preserve today/future';end if;
 delete from public.planner_reminders where id=any(fixture_ids) and reminder_date<(clock_timestamp() at time zone 'Europe/Berlin')::date;
 get diagnostics removed=row_count;if removed<>0 then raise exception 'Cleanup not idempotent';end if;
 if (timestamptz '2026-07-12 21:59+00' at time zone 'Europe/Berlin')::date<>date '2026-07-12'
 or (timestamptz '2026-07-12 22:00+00' at time zone 'Europe/Berlin')::date<>date '2026-07-13'
 or (timestamptz '2026-01-12 22:59+00' at time zone 'Europe/Berlin')::date<>date '2026-01-12'
 or (timestamptz '2026-01-12 23:00+00' at time zone 'Europe/Berlin')::date<>date '2026-01-13' then raise exception 'Midnight DST conversion incorrect';end if;
end $$;
rollback;
