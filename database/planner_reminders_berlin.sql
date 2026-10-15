-- All reminders use Berlin, including writes from older clients. Existing rows are already Berlin.
create or replace function dock_private.prepare_planner_reminder() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.timezone='Europe/Berlin';
 new.title=trim(new.title);
 new.push_at=(new.reminder_date+coalesce(new.reminder_time,time '09:00')) at time zone new.timezone;
 new.updated_at=clock_timestamp();
 return new;
end $$;
