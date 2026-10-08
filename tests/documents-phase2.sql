begin;
select set_config('dock.test.uid',(select id::text from auth.users order by id limit 1),true);
select set_config('request.jwt.claim.sub',current_setting('dock.test.uid'),true);
set local role authenticated;
do $$
declare first_count integer;second_count integer;a uuid;b uuid;c uuid;doc uuid:=gen_random_uuid();n integer;
begin
 perform public.ensure_document_folders();select count(*) into first_count from public.document_folders where default_key is not null;
 perform public.ensure_document_folders();select count(*) into second_count from public.document_folders where default_key is not null;
 if first_count<>7 or second_count<>7 then raise exception 'Default folders are missing or duplicated';end if;
 insert into public.document_folders(name) values('Synthetic parent') returning id into a;
 insert into public.document_folders(name,parent_id) values('Synthetic child',a) returning id into b;
 begin update public.document_folders set parent_id=b where id=a;raise exception 'Folder cycle allowed';exception when check_violation then null;end;
 insert into public.document_collections(name,folder_id,template,fields,custom_fields)
 values('Synthetic provider',b,'housing','{"customer_number":"test","meter_number":"test"}','[{"id":"synthetic","label":"Own field","value":"Test"}]') returning id into c;
 insert into public.documents(id,name,storage_path,mime_type,size_bytes,collection_id)
 values(doc,'Synthetic letter',auth.uid()||'/'||doc||'.pdf','application/pdf',100,c);
 begin delete from public.document_collections where id=c;raise exception 'Nonempty collection deleted';exception when foreign_key_violation then null;end;
 begin delete from public.document_folders where id=a;raise exception 'Nonempty parent deleted';exception when foreign_key_violation then null;end;
 begin update public.documents set folder_id=b where id=doc;raise exception 'Two locations allowed';exception when check_violation then null;end;
 update public.documents set collection_id=null,folder_id=a where id=doc;
 delete from public.document_collections where id=c;get diagnostics n=row_count;if n<>1 then raise exception 'Empty collection delete failed';end if;
 delete from public.document_folders where id=b;get diagnostics n=row_count;if n<>1 then raise exception 'Empty folder delete failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$ declare n integer;begin
 select count(*) into n from public.document_folders where name='Synthetic parent';if n<>0 then raise exception 'Foreign folder readable';end if;
 select count(*) into n from public.documents where name='Synthetic letter';if n<>0 then raise exception 'Foreign letter readable';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ begin
 begin perform public.ensure_document_folders();raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;
 begin perform id from public.document_collections;raise exception 'Anonymous collections readable';exception when insufficient_privilege then null;end;
end $$;
rollback;
