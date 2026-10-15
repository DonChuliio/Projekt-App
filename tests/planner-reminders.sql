-- Synthetics only, rollback includes all reminders/subscriptions/delivery reservations.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
select set_config('reminders.owner',current_setting('request.jwt.claim.sub'),true);
set local role authenticated;
do $$declare rid uuid;begin
 insert into public.planner_reminders(title,reminder_date,description,timezone) values('Synthetic reminder',date '2027-07-01','Synthetic only','Europe/Berlin') returning id into rid;
 perform set_config('reminders.id',rid::text,true);
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-07-01 07:00+00' then raise exception 'Summer default is not 09:00 local';end if;
 update public.planner_reminders set reminder_date='2027-01-01' where id=rid;
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-01-01 08:00+00' then raise exception 'Winter default wrong';end if;
 update public.planner_reminders set reminder_date='2027-03-28',reminder_time='02:30' where id=rid;
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-03-28 01:30+00' then raise exception 'DST gap wrong';end if;
 update public.planner_reminders set reminder_date='2026-10-25' where id=rid;
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2026-10-25 01:30+00' then raise exception 'DST fold wrong';end if;
 update public.planner_reminders set reminder_date='2027-07-01',reminder_time='09:15',timezone='America/New_York',title='Synthetic edited' where id=rid;
 if (select push_at from public.planner_reminders where id=rid)<>timestamptz '2027-07-01 07:15+00' then raise exception 'Zone/edit not applied';end if;
 update public.planner_reminders set timezone='Not/AZone' where id=rid;if (select timezone from public.planner_reminders where id=rid)<>'Europe/Berlin' then raise exception 'Berlin not enforced';end if;
 begin insert into public.planner_reminders(title,reminder_date) values('   ',current_date);raise exception 'Blank accepted';exception when check_violation then null;end;
 begin update public.planner_reminders set reminder_time='09:00:30' where id=rid;raise exception 'Seconds accepted';exception when check_violation then null;end;
 begin update public.planner_reminders set user_id=gen_random_uuid() where id=rid;raise exception 'Owner change allowed';exception when insufficient_privilege then null;end;
 begin perform public.due_planner_reminders();raise exception 'Client due allowed';exception when insufficient_privilege then null;end;
 begin perform public.claim_planner_reminder(rid,0);raise exception 'Client send allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.planner_reminders where id=current_setting('reminders.id')::uuid) then raise exception 'Foreign read';end if;
 update public.planner_reminders set title='Foreign edit' where id=current_setting('reminders.id')::uuid;if found then raise exception 'Foreign edit';end if;
 delete from public.planner_reminders where id=current_setting('reminders.id')::uuid;if found then raise exception 'Foreign delete';end if;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform 1 from public.planner_reminders;raise exception 'Anonymous read';exception when insufficient_privilege then null;end;
 begin perform public.due_planner_reminders();raise exception 'Anonymous due';exception when insufficient_privilege then null;end;
end $$;
reset role;
-- Move only the synthetic fixture into this minute. No production clock override endpoint.
update public.planner_reminders set push_at=date_trunc('minute',clock_timestamp()),updated_at=date_trunc('minute',clock_timestamp())-interval '1 second' where id=current_setting('reminders.id')::uuid;
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(current_setting('reminders.owner')::uuid,'https://web.push.apple.com/synthetic-'||gen_random_uuid(),'synthetic','synthetic') returning set_config('reminders.subscription',id::text,true);
set local role service_role;
do $$declare rid uuid:=current_setting('reminders.id')::uuid;sid bigint:=current_setting('reminders.subscription')::bigint;claim jsonb;begin
 if not exists(select 1 from public.due_planner_reminders() where id=rid) then raise exception 'Due missing';end if;
 claim=public.claim_planner_reminder(rid,sid);if claim->>'title'<>'Synthetic edited' then raise exception 'Current title missing';end if;
 if public.claim_planner_reminder(rid,sid) is not null then raise exception 'Duplicate claim';end if;
 if public.claim_planner_reminder(rid,0) is not null then raise exception 'Foreign subscription claim';end if;
end $$;
reset role;
-- Editing the date cannot reserve a previously delivered logical reminder again.
update public.planner_reminders set push_at=date_trunc('minute',clock_timestamp()) where id=current_setting('reminders.id')::uuid;
set local role service_role;
do $$begin if public.claim_planner_reminder(current_setting('reminders.id')::uuid,current_setting('reminders.subscription')::bigint) is not null then raise exception 'Edited reminder resent';end if;end $$;
reset role;
-- A late creation/update is not sent, even within the current scheduled minute.
update public.planner_reminders set updated_at=clock_timestamp() where id=current_setting('reminders.id')::uuid;
set local role service_role;
do $$begin if exists(select 1 from public.due_planner_reminders() where id=current_setting('reminders.id')::uuid) then raise exception 'Late reminder due';end if;end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('reminders.owner'),true);
set local role authenticated;
delete from public.planner_reminders where id=current_setting('reminders.id')::uuid;
reset role;
set local role service_role;
do $$begin if public.claim_planner_reminder(current_setting('reminders.id')::uuid,current_setting('reminders.subscription')::bigint) is not null then raise exception 'Deleted reminder due';end if;end $$;
reset role;
rollback;
