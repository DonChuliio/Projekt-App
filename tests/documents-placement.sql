-- Only synthetic metadata in a fully rolled-back transaction; no Storage files.
begin;
select set_config('dock.test.uid',(select id::text from auth.users order by id limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('dock.test.uid'),true);
set local role authenticated;
do $$
declare a uuid;b uuid;c uuid;d uuid:=gen_random_uuid();n integer;path text;original_name text:='Synthetic UI10 letter';
begin
 insert into public.document_folders(name) values('Synthetic UI10 folder') returning id into a;
 insert into public.document_collections(name,folder_id) values('Synthetic UI10 collection A',a) returning id into b;
 insert into public.document_collections(name,folder_id) values('Synthetic UI10 collection B',a) returning id into c;
 path:=auth.uid()||'/'||d||'.pdf';
 insert into public.documents(id,name,storage_path,mime_type,size_bytes,state,collection_id) values(d,original_name,path,'application/pdf',100,'ready',b);
 select count(*) into n from public.documents where id=d and collection_id=b and folder_id is null;if n<>1 then raise exception 'Direct collection placement failed';end if;
 update public.documents set collection_id=c,folder_id=null where id=d;get diagnostics n=row_count;if n<>1 then raise exception 'Collection to collection move failed';end if;
 update public.documents set collection_id=null,folder_id=a where id=d;get diagnostics n=row_count;if n<>1 then raise exception 'Direct folder move failed';end if;
 update public.documents set collection_id=null,folder_id=null where id=d;get diagnostics n=row_count;if n<>1 then raise exception 'Move to inbox failed';end if;
 update public.documents set collection_id=b,folder_id=null where id=d and collection_id is null and folder_id is null and trashed_at is null and state='ready';get diagnostics n=row_count;if n<>1 then raise exception 'Inbox selection failed';end if;
 update public.documents set collection_id=c,folder_id=null where id=d and collection_id is null and folder_id is null and trashed_at is null and state='ready';get diagnostics n=row_count;if n<>0 then raise exception 'Concurrent inbox assignment overwrote placement';end if;
 select count(*) into n from public.documents where id=d and storage_path=path and name=original_name and mime_type='application/pdf' and size_bytes=100 and collection_id=b;if n<>1 then raise exception 'File metadata lost or duplicated';end if;
 perform set_config('dock.test.doc',d::text,true);
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare n integer;begin
 select count(*) into n from public.documents where id=current_setting('dock.test.doc')::uuid;if n<>0 then raise exception 'Foreign document visible';end if;
 update public.documents set collection_id=null,folder_id=null where id=current_setting('dock.test.doc')::uuid;get diagnostics n=row_count;if n<>0 then raise exception 'Foreign document move allowed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 begin update public.documents set collection_id=null where id=current_setting('dock.test.doc')::uuid;raise exception 'Anonymous move allowed';exception when insufficient_privilege then null;end;
end $$;
rollback;
