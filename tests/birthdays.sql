-- Synthetic birthday records and two JWT subjects, entirely rolled back.
-- Exercises DB roles/RLS, not a real Auth login or a physical browser.
begin;
select set_config('birthday.owner',(select id::text from auth.users order by id limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('birthday.owner'),true);
set local role authenticated;
do $$declare bid uuid;n int;begin
 insert into public.planner_birthdays(name,birth_date) values('Synthetic birthday','2000-02-29') returning id into bid;
 perform set_config('birthday.id',bid::text,true);
 if not exists(select 1 from public.planner_birthdays where id=bid and user_id=auth.uid()) then raise exception 'Own insert/read failed';end if;
 update public.planner_birthdays set name='Synthetic edited',birth_date='1990-12-31' where id=bid;
 if not exists(select 1 from public.planner_birthdays where id=bid and name='Synthetic edited' and birth_date='1990-12-31') then raise exception 'Own update/reload failed';end if;
 begin update public.planner_birthdays set user_id=gen_random_uuid() where id=bid;raise exception 'Owner reassignment allowed';exception when insufficient_privilege then null;end;
 begin insert into public.planner_birthdays(user_id,name,birth_date) values(gen_random_uuid(),'Spoofed','2000-01-01');raise exception 'Explicit owner assignment allowed';exception when insufficient_privilege then null;end;
 begin insert into public.planner_birthdays(name,birth_date) values('  ','2000-01-01');raise exception 'Blank name accepted';exception when check_violation then null;end;
 begin insert into public.planner_birthdays(name,birth_date) values('Bad date','2025-02-29');raise exception 'Invalid date accepted';exception when datetime_field_overflow then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$declare n int;begin
 select count(*) into n from public.planner_birthdays where id=current_setting('birthday.id')::uuid;if n<>0 then raise exception 'Foreign read allowed';end if;
 update public.planner_birthdays set name='Foreign edit' where id=current_setting('birthday.id')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'Foreign update allowed';end if;
 delete from public.planner_birthdays where id=current_setting('birthday.id')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'Foreign delete allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$begin
 begin perform 1 from public.planner_birthdays;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;
 begin insert into public.planner_birthdays(name,birth_date) values('Anonymous','2000-01-01');raise exception 'Anonymous insert allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('birthday.owner'),true);
set local role authenticated;
do $$declare n int;begin
 delete from public.planner_birthdays where id=current_setting('birthday.id')::uuid;get diagnostics n=row_count;if n<>1 then raise exception 'Own delete failed';end if;
 if exists(select 1 from public.planner_birthdays where id=current_setting('birthday.id')::uuid) then raise exception 'Deleted birthday still visible';end if;
end $$;
reset role;
rollback;
