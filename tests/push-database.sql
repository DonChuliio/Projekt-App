begin;
set local role service_role;
do $test$
declare sid bigint; uid uuid; n integer;
begin
 select id,user_id into sid,uid from public.push_subscriptions where user_id is not null limit 1;
 if sid is null then raise exception 'No subscription fixture';end if;
 insert into public.push_deliveries(subscription_id,local_date) values(sid,'2099-01-01');
 insert into public.push_deliveries(subscription_id,local_date) values(sid,'2099-01-01') on conflict do nothing;
 select count(*) into n from public.push_deliveries where subscription_id=sid and local_date='2099-01-01';
 if n<>1 then raise exception 'Daily duplicate';end if;
 insert into public.push_deliveries(subscription_id,local_date) values(sid,'2099-01-02');
 perform public.sync_routine_todos_for_user(uid,2026,41);
 perform public.sync_routine_todos_for_user(uid,2026,41);
 select count(*) into n from (select user_id,routine_year,routine_week,routine_task_id,count(*) from public.todos where routine_task_id is not null group by 1,2,3,4 having count(*)>1) d;
 if n<>0 then raise exception 'Duplicate routine';end if;
end $test$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.push_subscriptions where user_id is not null limit 1),true);
set local role authenticated;
do $test$
begin
 perform public.sync_week_routine_todos(2026,41);
 begin
  perform public.sync_routine_todos_for_user(gen_random_uuid(),2026,41);
  raise exception 'Cross-user sync allowed';
 exception when raise_exception then
  if sqlerrm='Cross-user sync allowed' then raise;end if;
 end;
 begin
  perform * from public.push_deliveries;
  raise exception 'Client has delivery-table access';
 exception when insufficient_privilege then null;
 end;
end $test$;
rollback;