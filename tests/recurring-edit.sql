-- Only synthetic fixture, all changes rolled back.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$ declare test_id text; n integer; begin
 insert into public.recurring_transactions(name,amount,transaction_type,frequency,start_date)
 values('Synthetic recurring edit',42.50,'expense','monthly','2000-01-15') returning id::text into test_id;
 perform set_config('dock.test.recurring',test_id,true);
 update public.recurring_transactions set amount=59.95 where id::text=test_id;
 select count(*) into n from public.recurring_transactions where id::text=test_id and amount=59.95;
 if n<>1 then raise exception 'Own update/read failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare n integer;begin
 update public.recurring_transactions set amount=1 where id::text=current_setting('dock.test.recurring');get diagnostics n=row_count;
 if n<>0 then raise exception 'Foreign update allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare n integer;begin
 begin update public.recurring_transactions set amount=1 where id::text=current_setting('dock.test.recurring');get diagnostics n=row_count;
 if n<>0 then raise exception 'Anonymous update allowed';end if;exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
