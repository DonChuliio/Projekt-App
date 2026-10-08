begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.calendar_tasks limit 1),true);
set local role authenticated;
do $test$
declare n integer; task text := 'dock-transaction-test-' || gen_random_uuid()::text;
begin
 insert into public.calendar_tasks(user_id,year,week,task_id,done)
 values (auth.uid(),2097,1,task,false),(auth.uid(),2097,2,task,false);
 perform public.sync_week_routine_todos(2097,1);
 perform public.sync_week_routine_todos(2097,1);
 select count(*) into n from public.todos where routine_task_id=task;
 if n<>1 then raise exception 'Duplicate occurrence: %',n;end if;
 update public.todos set completed_at=now() where routine_task_id=task;
 perform public.sync_week_routine_todos(2097,1);
 select count(*) into n from public.todos where routine_task_id=task and completed_at is null;
 if n<>0 then raise exception 'Completed task recreated';end if;
 perform public.sync_week_routine_todos(2097,2);
 select count(*) into n from public.todos where routine_task_id=task and completed_at is null and priority='a';
 if n<>1 then raise exception 'Next week not created';end if;
 insert into public.calendar_tasks(user_id,year,week,task_id,done)
 values(auth.uid(),2097,3,task,false);
 perform public.sync_week_routine_todos(2097,3);
 select count(*) into n from public.todos where routine_task_id=task and completed_at is null;
 if n<>2 then raise exception 'Open previous week not retained';end if;
 begin
  delete from public.todos where routine_task_id=task;
  raise exception 'Delete protection failed';
 exception when raise_exception then
  if sqlerrm='Delete protection failed' then raise;end if;
 end;
 begin
  update public.todos set routine_week=4 where routine_task_id=task and routine_week=3;
  raise exception 'Identity protection failed';
 exception when raise_exception then
  if sqlerrm='Identity protection failed' then raise;end if;
 end;
 begin
  insert into public.todos(user_id,text,priority) values(gen_random_uuid(),'forbidden','a');
  raise exception 'RLS failed';
 exception when insufficient_privilege then null;
 end;
 delete from public.calendar_tasks where task_id=task and week=3;
 select count(*) into n from public.todos where routine_task_id=task and completed_at is null;
 if n<>2 then raise exception 'Removing schedule removed task';end if;
end $test$;
rollback;
