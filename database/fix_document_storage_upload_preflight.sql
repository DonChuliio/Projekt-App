-- Storage checks permissions before final size metadata exists.
-- Ownership/path checks belong in RLS; MIME and size limits are enforced by Storage itself.
do $$
begin
 if not exists(select 1 from storage.buckets where id='dock-documents' and public=false
  and file_size_limit=10485760
  and allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'])
 then raise exception 'Private document bucket restrictions are missing';end if;
end $$;
alter policy dock_documents_insert on storage.objects with check(
 bucket_id='dock-documents' and
 name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png|webp|heic|heif)$')
);
alter policy dock_documents_update on storage.objects with check(
 bucket_id='dock-documents' and
 name ~ ('^'||(select auth.uid())::text||'/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](pdf|jpg|jpeg|png|webp|heic|heif)$')
);
