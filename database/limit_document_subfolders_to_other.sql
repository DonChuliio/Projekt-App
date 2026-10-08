-- Keep the seven standard folders fixed. Custom folders belong to Sonstiges.
-- Run atomically; preserve documents, original files and collection records.
lock table public.document_folders,public.document_collections,public.documents in share row exclusive mode;
create temporary table dock_folder_content_before on commit drop as
select
 (select count(*) from public.documents) as documents,
 (select count(*) from public.document_collections) as collections,
 (select md5(coalesce(jsonb_agg(to_jsonb(d)-'folder_id'-'collection_id'-'updated_at' order by d.id)::text,'')) from public.documents d) as doc_hash,
 (select md5(coalesce(jsonb_agg(to_jsonb(c)-'folder_id'-'updated_at' order by c.id)::text,'')) from public.document_collections c) as collection_hash;

-- Restore standard roots; retain custom root folders by moving them to Sonstiges.
update public.document_folders set parent_id=null where default_key is not null and parent_id is not null;
update public.document_folders f set parent_id=o.id from public.document_folders o
where f.user_id=o.user_id and o.default_key='other' and f.default_key is null and f.parent_id is null;

create temporary table dock_folder_cleanup on commit drop as
with recursive tree as (
 select id,user_id,id as root_id,default_key as root_key,0 as depth from public.document_folders where default_key is not null
 union all
 select f.id,f.user_id,t.root_id,t.root_key,t.depth+1 from public.document_folders f join tree t on f.parent_id=t.id and f.user_id=t.user_id
)
select t.* from tree t join public.document_folders f on f.id=t.id
where t.depth>0 and t.root_key<>'other' and f.default_key is null;

update public.document_collections c set folder_id=x.root_id,updated_at=now() from dock_folder_cleanup x where c.folder_id=x.id and c.user_id=x.user_id;
update public.documents d set folder_id=x.root_id,updated_at=now() from dock_folder_cleanup x where d.folder_id=x.id and d.user_id=x.user_id;
do $$ declare item record;begin
 for item in select id from dock_folder_cleanup order by depth desc loop
  delete from public.document_folders where id=item.id;
 end loop;
 if (select documents from dock_folder_content_before)<>(select count(*) from public.documents)
 or (select collections from dock_folder_content_before)<>(select count(*) from public.document_collections)
 or (select doc_hash from dock_folder_content_before) is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(d)-'folder_id'-'collection_id'-'updated_at' order by d.id)::text,'')) from public.documents d)
 or (select collection_hash from dock_folder_content_before) is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(c)-'folder_id'-'updated_at' order by c.id)::text,'')) from public.document_collections c)
 then raise exception 'Folder cleanup did not preserve document and collection contents';end if;
end $$;

create function dock_private.enforce_document_folder_layout() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cursor_id uuid;folder_key text;expected_name text;steps integer:=0;
begin
 -- Trusted administration must still be able to clean up accounts and their cascades.
 if current_user not in ('authenticated','anon') then
  if tg_op='DELETE' then return old;else return new;end if;
 end if;
 if tg_op='DELETE' then
  if old.default_key is not null then raise exception 'Standardordner können nicht gelöscht werden.' using errcode='23514';end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.default_key is not null then
  if new.name is distinct from old.name or new.parent_id is distinct from old.parent_id or new.default_key is distinct from old.default_key or new.user_id is distinct from old.user_id or new.id is distinct from old.id
  then raise exception 'Standardordner bleiben unverändert.' using errcode='23514';end if;
  return new;
 end if;
 if new.default_key is not null then
  if tg_op='UPDATE' then raise exception 'Ein Unterordner kann kein Standardordner werden.' using errcode='23514';end if;
  expected_name:=case new.default_key when 'housing' then 'Wohnen' when 'pension' then 'Altersvorsorge' when 'communication' then 'Kommunikation & Abos' when 'work' then 'Arbeit & Steuern' when 'insurance' then 'Versicherungen' when 'purchase' then 'Anschaffungen & Garantien' when 'other' then 'Sonstiges' end;
  if expected_name is null or new.name<>expected_name or new.parent_id is not null then raise exception 'Ungültiger Standardordner.' using errcode='23514';end if;
  return new;
 end if;
 cursor_id:=new.parent_id;
 while cursor_id is not null loop
  steps:=steps+1;if steps>64 then exit;end if;
  select parent_id,default_key into cursor_id,folder_key from public.document_folders where id=cursor_id and user_id=new.user_id;
  if folder_key='other' then return new;end if;
  if folder_key is not null then exit;end if;
 end loop;
 raise exception 'Unterordner sind ausschließlich unter Sonstiges erlaubt.' using errcode='23514';
end $$;
revoke all on function dock_private.enforce_document_folder_layout() from public,anon,authenticated;
create trigger document_folder_layout before insert or update or delete on public.document_folders for each row execute function dock_private.enforce_document_folder_layout();
