begin;
select set_config('dock.test.uid',(select id::text from auth.users limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('dock.test.uid'),true);
set local role authenticated;
do $$
declare doc uuid:=gen_random_uuid();n integer;
begin
 insert into public.documents(id,name,storage_path,mime_type,size_bytes) values(doc,'Synthetic security fixture',auth.uid()||'/'||doc||'.pdf','application/pdf',100);
 select count(*) into n from public.documents where id=doc;if n<>1 then raise exception 'Own read failed';end if;
 update public.documents set name='Synthetic renamed' where id=doc;get diagnostics n=row_count;if n<>1 then raise exception 'Own update failed';end if;
 update public.documents set state='ready' where id=doc;
 delete from public.documents where id=doc;get diagnostics n=row_count;if n<>0 then raise exception 'Active metadata deleted without trash';end if;
 begin update public.documents set user_id=gen_random_uuid() where id=doc;raise exception 'Owner reassigned';exception when insufficient_privilege then null;end;
 begin insert into public.documents(name,storage_path,mime_type,size_bytes) values('invalid','foreign/path.pdf','application/pdf',100);raise exception 'Invalid path accepted';exception when check_violation then null;end;
 begin insert into public.documents(name,storage_path,mime_type,size_bytes) values('invalid',auth.uid()||'/'||gen_random_uuid()||'.html','text/html',100);raise exception 'HTML accepted';exception when check_violation then null;end;
 update public.documents set trashed_at=now() where id=doc;
 delete from public.documents where id=doc;get diagnostics n=row_count;if n<>1 then raise exception 'Trash deletion failed';end if;
end $$;
reset role;
-- A synthetic row owned by an existing user is invisible to another JWT subject.
insert into public.documents(id,user_id,name,storage_path,mime_type,size_bytes)
select id,current_setting('dock.test.uid')::uuid,'Synthetic foreign fixture',current_setting('dock.test.uid')||'/'||id||'.pdf','application/pdf',100 from (select gen_random_uuid() id) f;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare n integer;begin
 select count(*) into n from public.documents where name='Synthetic foreign fixture';if n<>0 then raise exception 'Foreign read allowed';end if;
 update public.documents set name='forbidden' where name='Synthetic foreign fixture';get diagnostics n=row_count;if n<>0 then raise exception 'Foreign update allowed';end if;
 delete from public.documents where name='Synthetic foreign fixture';get diagnostics n=row_count;if n<>0 then raise exception 'Foreign delete allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 begin perform id from public.documents;raise exception 'Anonymous metadata access';exception when insufficient_privilege then null;end;
end $$;
rollback;
