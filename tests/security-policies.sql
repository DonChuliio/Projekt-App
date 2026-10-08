begin;
do $bucket$
begin
 if not exists(select 1 from storage.buckets where id='dock-documents' and public=false and file_size_limit=10485760
 and allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
 then raise exception 'Document bucket limits missing';end if;
end $bucket$;
select set_config('dock.test.uid',(select user_id::text from public.todos limit 1),true);
select set_config('dock.test.other',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub',current_setting('dock.test.uid'),true);
insert into storage.objects(bucket_id,name,metadata)
values('dock-documents',current_setting('dock.test.other')||'/'||gen_random_uuid()||'.pdf','{"size":100,"mimetype":"application/pdf"}');
set local role authenticated;
do $t$
declare path text:=auth.uid()::text||'/'||gen_random_uuid()||'.pdf'; other text:=current_setting('dock.test.other')||'/'||gen_random_uuid()||'.pdf'; n integer; export_id uuid;
begin
 insert into storage.objects(bucket_id,name,metadata) values('dock-documents',path,'{"size":100,"mimetype":"application/pdf"}');
 select count(*) into n from storage.objects where bucket_id='dock-documents' and name=path;
 if n<>1 then raise exception 'own read failed';end if;
 select count(*) into n from storage.objects where bucket_id='dock-documents' and name like current_setting('dock.test.other')||'/%';
 if n<>0 then raise exception 'foreign read allowed';end if;
 update storage.objects set metadata='{"size":200,"mimetype":"application/pdf"}' where bucket_id='dock-documents' and name=path;
 get diagnostics n=row_count;if n<>1 then raise exception 'own update failed';end if;
 update storage.objects set metadata='{"size":200,"mimetype":"application/pdf"}' where bucket_id='dock-documents' and name like current_setting('dock.test.other')||'/%';
 get diagnostics n=row_count;if n<>0 then raise exception 'foreign update allowed';end if;
 begin
  insert into storage.objects(bucket_id,name,metadata) values('dock-documents',other,'{"size":100,"mimetype":"application/pdf"}');
  raise exception 'foreign upload allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into storage.objects(bucket_id,name,metadata) values('dock-documents',auth.uid()||'/'||gen_random_uuid()||'.html','{"size":100,"mimetype":"text/html"}');
  raise exception 'HTML accepted';
 exception when insufficient_privilege then null;end;
 -- Storage permission probes do not yet contain final size metadata.
 insert into storage.objects(bucket_id,name,metadata) values('dock-documents',auth.uid()||'/'||gen_random_uuid()||'.pdf','{}');
 begin
  update storage.objects set name=other where bucket_id='dock-documents' and name=path;
  raise exception 'foreign move allowed';
 exception when insufficient_privilege then null;end;
 insert into public.bring_exports(name,items) values('Security transaction fixture','["test"]') returning id into export_id;
 select count(*) into n from public.bring_exports where id=export_id;if n<>1 then raise exception 'own export inaccessible';end if;
 begin
  insert into public.bring_exports(user_id,name,items) values(current_setting('dock.test.other')::uuid,'forbidden','["test"]');
  raise exception 'foreign export accepted';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.bring_exports(name,items,expires_at) values('forbidden','["test"]',now()+interval '1 day');
  raise exception 'Long export TTL accepted';
 exception when insufficient_privilege then null;end;
end $t$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('dock.test.other'),true);
set local role authenticated;
do $t$ declare n integer;begin
 select count(*) into n from storage.objects where bucket_id='dock-documents' and name like current_setting('dock.test.uid')||'/%';
 if n<>0 then raise exception 'Other user saw file';end if;
 select count(*) into n from public.bring_exports where name='Security transaction fixture';
 if n<>0 then raise exception 'Other user saw export';end if;
end $t$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $t$ declare n integer;begin
 select count(*) into n from storage.objects where bucket_id='dock-documents';
 if n<>0 then raise exception 'Anonymous storage read';end if;
 begin
  insert into public.push_subscriptions(endpoint,p256dh,auth) values('https://web.push.apple.com/test','test','test');
  raise exception 'Anonymous push insert';
 exception when insufficient_privilege then null;end;
 begin
  insert into storage.objects(bucket_id,name,metadata) values('dock-documents',current_setting('dock.test.uid')||'/'||gen_random_uuid()||'.pdf','{"size":100,"mimetype":"application/pdf"}');
  raise exception 'Anonymous upload';
 exception when insufficient_privilege then null;end;
end $t$;
rollback;