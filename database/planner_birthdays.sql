-- Issue 38: private, annually recurring birthday records; no push jobs/triggers.
create table public.planner_birthdays (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 200),
 birth_date date not null check(birth_date between date '0001-01-01' and date '9999-12-31'),
 created_at timestamptz not null default now()
);
create index planner_birthdays_owner_order on public.planner_birthdays(user_id,created_at,id);
alter table public.planner_birthdays enable row level security;
revoke all on public.planner_birthdays from public,anon,authenticated;
grant select,delete on public.planner_birthdays to authenticated;
grant insert(name,birth_date),update(name,birth_date) on public.planner_birthdays to authenticated;
create policy birthdays_own_select on public.planner_birthdays for select to authenticated using(user_id=(select auth.uid()));
create policy birthdays_own_insert on public.planner_birthdays for insert to authenticated with check(user_id=(select auth.uid()));
create policy birthdays_own_update on public.planner_birthdays for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy birthdays_own_delete on public.planner_birthdays for delete to authenticated using(user_id=(select auth.uid()));
