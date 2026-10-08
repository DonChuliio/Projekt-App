-- Private documents: only PDF and passive image formats, maximum 10 MiB.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('dock-documents','dock-documents',false,10485760,
 array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
;
create policy dock_documents_select on storage.objects for select to authenticated using(
 bucket_id='dock-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
);
create policy dock_documents_insert on storage.objects for insert to authenticated with check(
 bucket_id='dock-documents' and
 name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png|webp|heic|heif)$') and
 coalesce((metadata->>'size')::bigint,-1) between 1 and 10485760 and
 metadata->>'mimetype'=any(array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
);
create policy dock_documents_update on storage.objects for update to authenticated using(
 bucket_id='dock-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
) with check(
 bucket_id='dock-documents' and
 name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png|webp|heic|heif)$') and
 coalesce((metadata->>'size')::bigint,-1) between 1 and 10485760 and
 metadata->>'mimetype'=any(array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
);
create policy dock_documents_delete on storage.objects for delete to authenticated using(
 bucket_id='dock-documents' and (storage.foldername(name))[1]=(select auth.uid())::text
);

