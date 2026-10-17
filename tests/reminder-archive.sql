-- Real DB, synthetic IDs only; every fixture/change rolls back. No transport calls.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
select set_config('archive.owner',current_setting('request.jwt.claim.sub'),true);
set local role authenticated;
do $$declare ids uuid[]:='{}';rid uuid;i int;begin
 for i in 1..6 loop
  insert into public.planner_reminders(title,reminder_date,description) values('Synthetic archive '||i,date '2027-07-01','Synthetic test only') returning id into rid;
  ids=array_append(ids,rid);
 end loop;
 perform set_config('archive.ids',array_to_json(ids)::text,true);
 if (select push_at from public.planner_reminders where id=ids[1])<>timestamptz '2027-07-01 07:00+00' then raise exception '09:00 Berlin default changed';end if;
 update public.planner_reminders set reminder_date='2027-01-01' where id=ids[1];
 if (select push_at from public.planner_reminders where id=ids[1])<>timestamptz '2027-01-01 08:00+00' then raise exception 'Winter time changed';end if;
 begin update public.planner_reminders set archived_at=now() where id=ids[1];raise exception 'Client archives';exception when insufficient_privilege then null;end;
 begin perform public.reconcile_planner_reminders();raise exception 'Client reconcile';exception when insufficient_privilege then null;end;
 begin perform public.finish_planner_reminder(ids[1],0,'sent');raise exception 'Client finish';exception when insufficient_privilege then null;end;
end $$;
reset role;
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(current_setting('archive.owner')::uuid,'https://web.push.apple.com/synthetic-archive-'||gen_random_uuid(),'synthetic','synthetic') returning set_config('archive.s1',id::text,true);
insert into public.push_subscriptions(user_id,endpoint,p256dh,auth) values(current_setting('archive.owner')::uuid,'https://web.push.apple.com/synthetic-archive-'||gen_random_uuid(),'synthetic','synthetic') returning set_config('archive.s2',id::text,true);
set local role service_role;
do $$declare ids jsonb:=current_setting('archive.ids')::jsonb;rid uuid;s1 bigint:=current_setting('archive.s1')::bigint;s2 bigint:=current_setting('archive.s2')::bigint;begin
 update public.planner_reminders set push_at=date_trunc('minute',clock_timestamp()),updated_at=date_trunc('minute',clock_timestamp())-interval '1 second' where id in(select value::uuid from jsonb_array_elements_text(ids));
 rid=(ids->>0)::uuid;
 if public.claim_planner_reminder(rid,s1) is null or public.claim_planner_reminder(rid,s2) is null then raise exception 'Device reservations missing';end if;
 if public.claim_planner_reminder(rid,s1) is not null then raise exception 'Duplicate reservation';end if;
 if not public.finish_planner_reminder(rid,s1,'sent') then raise exception 'Acceptance not recorded';end if;
 if not exists(select 1 from public.planner_reminders where id=rid and archived_at is not null and push_status='sent' and push_successes=1) then raise exception 'Accepted push not archived';end if;
 if exists(select 1 from public.due_planner_reminders() where id=rid) or public.claim_planner_reminder(rid,0) is not null then raise exception 'Archived reminder due';end if;
 if not public.finish_planner_reminder(rid,s2,'failed') then raise exception 'Second already reserved device lost';end if;
 if public.finish_planner_reminder(rid,s1,'sent') or public.finish_planner_reminder(rid,s2,'failed') then raise exception 'Duplicate outcome';end if;
 if not exists(select 1 from public.planner_reminders where id=rid and archived_at is not null and push_attempts=2 and push_successes=1 and push_failures=1) then raise exception 'Partial success counters wrong';end if;
 rid=(ids->>1)::uuid;
 perform public.claim_planner_reminder(rid,s1);perform public.claim_planner_reminder(rid,s2);
 perform public.finish_planner_reminder(rid,s1,'failed');perform public.finish_planner_reminder(rid,s2,'failed');
 if not exists(select 1 from public.planner_reminders where id=rid and archived_at is null and push_status='failed' and push_failures=2) then raise exception 'Failed push disappeared';end if;
 if public.claim_planner_reminder(rid,s1) is not null then raise exception 'Failure retried';end if;
 rid=(ids->>2)::uuid;perform public.skip_planner_reminder(rid);
 if not exists(select 1 from public.planner_reminders where id=rid and archived_at is null and push_status='no_subscription') then raise exception 'Missing subscription not retained';end if;
 rid=(ids->>3)::uuid;perform public.claim_planner_reminder(rid,s1);
 update public.planner_reminders set push_at=date_trunc('minute',clock_timestamp())-interval '5 minutes' where id=rid;
 update public.planner_reminders set push_at=date_trunc('minute',clock_timestamp())-interval '5 minutes' where id=(ids->>4)::uuid;
 rid=(ids->>5)::uuid;perform public.claim_planner_reminder(rid,s1);
 update public.push_deliveries set status='sent',sent_at=clock_timestamp() where subscription_id=s1 and kind='reminder:'||rid;
 perform public.reconcile_planner_reminders();perform public.reconcile_planner_reminders();
 if not exists(select 1 from public.planner_reminders where id=(ids->>3)::uuid and push_status='uncertain' and archived_at is null) then raise exception 'Uncertain outcome falsely archived';end if;
 if not exists(select 1 from public.planner_reminders where id=(ids->>4)::uuid and push_status='missed' and archived_at is null) then raise exception 'Missed entry disappeared';end if;
 if not exists(select 1 from public.planner_reminders where id=(ids->>5)::uuid and archived_at is not null and push_successes=1) then raise exception 'Legacy accepted evidence not recovered';end if;
end $$;
reset role;
set local role authenticated;
do $$declare rid uuid:=(current_setting('archive.ids')::jsonb->>0)::uuid;begin
 if not exists(select 1 from public.planner_reminders where id=rid and archived_at is not null) then raise exception 'Own archive not readable';end if;
 begin update public.planner_reminders set title='Cannot rearm sent' where id=rid;raise exception 'Archived entry edited';exception when raise_exception then if sqlerrm='Archived entry edited' then raise;end if;end;
 begin update public.planner_reminders set push_status='pending' where id=rid;raise exception 'Client rearms';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$declare rid uuid:=(current_setting('archive.ids')::jsonb->>0)::uuid;begin
 if exists(select 1 from public.planner_reminders where id=rid) then raise exception 'Foreign archive visible';end if;
 update public.planner_reminders set title='Foreign edit' where id=rid;if found then raise exception 'Foreign archive edit';end if;
 delete from public.planner_reminders where id=rid;if found then raise exception 'Foreign archive delete';end if;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform 1 from public.planner_reminders;raise exception 'Anonymous archive read';exception when insufficient_privilege then null;end;
 begin perform public.finish_planner_reminder(gen_random_uuid(),0,'sent');raise exception 'Anonymous finish';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('archive.owner'),true);
set local role authenticated;
delete from public.planner_reminders where id=(current_setting('archive.ids')::jsonb->>0)::uuid;
reset role;
do $$begin if exists(select 1 from cron.job where jobname='dock-reminders-cleanup') then raise exception 'Automatic reminder deletion still active';end if;end $$;
rollback;
