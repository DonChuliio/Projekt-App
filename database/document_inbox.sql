create table public.documents (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200),
 document_date date,
 storage_path text not null unique,
 mime_type text not null check(mime_type in ('application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif')),
 size_bytes bigint not null check(size_bytes between 1 and 10485760),
 state text not null default 'pending' check(state in ('pending','ready')),
 trashed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,id),
 check(storage_path ~ ('^'||user_id::text||'/'||id::text||'[.](pdf|jpg|jpeg|png|webp|heic|heif)$'))
);
create index documents_user_created on public.documents(user_id,created_at desc);
alter table public.documents enable row level security;
revoke all on public.documents from anon,authenticated;
grant select,insert,update,delete on public.documents to authenticated;
create policy documents_select on public.documents for select to authenticated using ((select auth.uid())=user_id);
create policy documents_insert on public.documents for insert to authenticated with check ((select auth.uid())=user_id);
create policy documents_update on public.documents for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy documents_delete on public.documents for delete to authenticated using ((select auth.uid())=user_id and (trashed_at is not null or state='pending'));
