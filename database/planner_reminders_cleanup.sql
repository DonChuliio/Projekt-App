-- Berlin midnight: 22:00 UTC during summer, 23:00 UTC during winter.
-- Both executions are safe: date predicate never removes today/future reminders.
select cron.schedule('dock-reminders-cleanup','0 22,23 * * *',
 $job$delete from public.planner_reminders where reminder_date < (clock_timestamp() at time zone 'Europe/Berlin')::date;$job$);
