-- Issue 36: synthetic authenticated edits only; all changes are rolled back.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare c uuid;t text:=gen_random_uuid()::text;n int;begin
 insert into public.routine_columns(name) values('Synthetic flat-grid test') returning id into c;
 insert into public.routine_tasks(task_id,column_id,name,weeks) values(t,c,'Synthetic original',array[1,53]);
 perform set_config('grid.test.task',t,true);
 update public.routine_tasks set name='Synthetic renamed' where task_id=t and active;
 if not exists(select 1 from public.routine_tasks where task_id=t and name='Synthetic renamed' and weeks=array[1,53] and column_id=c) then raise exception 'Rename changed identity or week history';end if;
 update public.routine_tasks set weeks=array[1,2,53] where task_id=t and weeks=array[1,53];get diagnostics n=row_count;if n<>1 then raise exception 'Checkbox not stored';end if;
 update public.routine_tasks set weeks=array[1] where task_id=t and weeks=array[1,53];get diagnostics n=row_count;if n<>0 then raise exception 'Stale checkbox overwrote history';end if;
 if not exists(select 1 from public.routine_tasks where task_id=t and weeks=array[1,2,53]) then raise exception 'Stored weeks not reloadable';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$declare n int;begin
 select count(*) into n from public.routine_tasks where task_id=current_setting('grid.test.task');if n<>0 then raise exception 'Foreign row visible';end if;
 update public.routine_tasks set name='Foreign rename' where task_id=current_setting('grid.test.task');get diagnostics n=row_count;if n<>0 then raise exception 'Foreign rename permitted';end if;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform 1 from public.routine_tasks;raise exception 'Anonymous access permitted';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
