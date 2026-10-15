-- Reduced safe integration: own synthetic reminder only, no subscription/delivery writes.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare rid uuid;begin
 insert into public.planner_reminders(title,reminder_date,timezone) values('Synthetic rollback-only reminder',date '2027-07-01','Europe/Berlin') returning id into rid;
 perform set_config('reminders.smoke',rid::text,true);
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-07-01 07:00+00' then raise exception 'Insert/trigger/summer default failed';end if;
 update public.planner_reminders set reminder_date='2027-01-01',title='Synthetic edited' where id=rid;
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-01-01 08:00+00' then raise exception 'Owner edit/winter failed';end if;
 update public.planner_reminders set timezone='America/New_York' where id=rid;
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-01-01 14:00+00' then raise exception 'Zone edit failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin if exists(select 1 from public.planner_reminders where id=current_setting('reminders.smoke')::uuid) then raise exception 'Foreign read allowed';end if;end $$;
reset role;
rollback;
