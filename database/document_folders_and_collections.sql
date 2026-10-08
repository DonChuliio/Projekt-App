create table public.document_folders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200),
 parent_id uuid,
 default_key text,
 created_at timestamptz not null default now(),
 unique(user_id,id),unique(user_id,default_key),
 foreign key(user_id,parent_id) references public.document_folders(user_id,id) on delete restrict,
 check(parent_id is null or parent_id<>id)
);
create index document_folders_parent on public.document_folders(user_id,parent_id);
create table public.document_collections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 folder_id uuid,
 name text not null default 'Neue Ablage' check(length(trim(name)) between 1 and 200),
 template text not null default 'general' check(template in ('general','contract','insurance','purchase','pension','work','housing')),
 fields jsonb not null default '{}' check(jsonb_typeof(fields)='object' and octet_length(fields::text)<=65536),
 custom_fields jsonb not null default '[]' check(jsonb_typeof(custom_fields)='array' and jsonb_array_length(custom_fields)<=50 and octet_length(custom_fields::text)<=65536),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,id),
 foreign key(user_id,folder_id) references public.document_folders(user_id,id) on delete restrict
);
create index document_collections_folder on public.document_collections(user_id,folder_id);
alter table public.documents add column folder_id uuid,add column collection_id uuid;
alter table public.documents add constraint documents_folder_owner foreign key(user_id,folder_id) references public.document_folders(user_id,id) on delete restrict;
alter table public.documents add constraint documents_collection_owner foreign key(user_id,collection_id) references public.document_collections(user_id,id) on delete restrict;
alter table public.documents add constraint documents_one_location check(folder_id is null or collection_id is null);
create index documents_collection on public.documents(user_id,collection_id);

alter table public.document_folders enable row level security;
alter table public.document_collections enable row level security;
revoke all on public.document_folders,public.document_collections from anon,authenticated;
grant select,insert,update,delete on public.document_folders,public.document_collections to authenticated;
create policy document_folders_select on public.document_folders for select to authenticated using ((select auth.uid())=user_id);
create policy document_folders_insert on public.document_folders for insert to authenticated with check ((select auth.uid())=user_id);
create policy document_folders_update on public.document_folders for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy document_folders_delete on public.document_folders for delete to authenticated using ((select auth.uid())=user_id);
create policy document_collections_select on public.document_collections for select to authenticated using ((select auth.uid())=user_id);
create policy document_collections_insert on public.document_collections for insert to authenticated with check ((select auth.uid())=user_id);
create policy document_collections_update on public.document_collections for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy document_collections_delete on public.document_collections for delete to authenticated using ((select auth.uid())=user_id);

-- Serialize hierarchy edits per owner, then check ancestors. RLS remains active.
create function dock_private.check_document_folder_cycle() returns trigger
language plpgsql security invoker set search_path='' as $$
declare cursor_id uuid;steps integer:=0;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,8721));
 cursor_id:=new.parent_id;
 while cursor_id is not null loop
  if cursor_id=new.id then raise exception 'Ein Ordner kann nicht in einen eigenen Unterordner verschoben werden.' using errcode='23514';end if;
  steps:=steps+1;if steps>64 then raise exception 'Maximale Ordnertiefe überschritten.' using errcode='23514';end if;
  select parent_id into cursor_id from public.document_folders where id=cursor_id and user_id=new.user_id;
 end loop;
 return new;
end $$;
revoke all on function dock_private.check_document_folder_cycle() from public,anon,authenticated;
create trigger document_folder_cycle before insert or update of parent_id,user_id on public.document_folders for each row execute function dock_private.check_document_folder_cycle();

create function public.ensure_document_folders() returns void language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Anmeldung erforderlich' using errcode='42501';end if;
 insert into public.document_folders(user_id,name,default_key)
 select auth.uid(),name,key from (values
 ('Wohnen','housing'),('Altersvorsorge','pension'),('Kommunikation & Abos','communication'),
 ('Arbeit & Steuern','work'),('Versicherungen','insurance'),('Anschaffungen & Garantien','purchase'),('Sonstiges','other')) as defaults(name,key)
 on conflict(user_id,default_key) do nothing;
end $$;
revoke all on function public.ensure_document_folders() from public,anon;
grant execute on function public.ensure_document_folders() to authenticated;
