-- Synthetic reserve values only; all writes rolled back, existing plans preserved.
begin;
select set_config('dock.test.uid',(select user_id::text from public.savings_calculations order by id limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('dock.test.uid'),true);
set local role authenticated;
do $$
declare before_row jsonb; after_row jsonb; n integer;
begin
 select to_jsonb(s)-'reserve_start'-'reserve_monthly' into before_row from public.savings_calculations s where user_id=auth.uid();
 if before_row is null then raise exception 'No owner fixture available'; end if;
 insert into public.savings_calculations(reserve_start,reserve_monthly) values(1234.50,75.25)
 on conflict(user_id) do update set reserve_start=excluded.reserve_start,reserve_monthly=excluded.reserve_monthly;
 select to_jsonb(s)-'reserve_start'-'reserve_monthly' into after_row from public.savings_calculations s where user_id=auth.uid();
 if before_row<>after_row then raise exception 'Existing savings data modified'; end if;
 select count(*) into n from public.savings_calculations where user_id=auth.uid() and reserve_start=1234.50 and reserve_monthly=75.25;
 if n<>1 then raise exception 'Owner upsert/read failed or duplicated';end if;
 begin update public.savings_calculations set reserve_start=-1 where user_id=auth.uid();raise exception 'Negative start allowed';exception when check_violation then null;end;
 begin update public.savings_calculations set reserve_monthly=-1 where user_id=auth.uid();raise exception 'Negative monthly allowed';exception when check_violation then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare n integer;begin
 select count(*) into n from public.savings_calculations where user_id=current_setting('dock.test.uid')::uuid;if n<>0 then raise exception 'Foreign read allowed';end if;
 update public.savings_calculations set reserve_start=1 where user_id=current_setting('dock.test.uid')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'Foreign update allowed';end if;
 begin insert into public.savings_calculations(user_id,reserve_start) values(current_setting('dock.test.uid')::uuid,1) on conflict(user_id) do update set reserve_start=excluded.reserve_start;raise exception 'Foreign upsert allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare n integer;begin
 begin select count(*) into n from public.savings_calculations;if n<>0 then raise exception 'Anonymous read allowed';end if;exception when insufficient_privilege then null;end;
 begin update public.savings_calculations set reserve_start=1;get diagnostics n=row_count;if n<>0 then raise exception 'Anonymous update allowed';end if;exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
