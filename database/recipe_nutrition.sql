-- Issue 12. Existing recipe rows/editor/Bring export remain intact.
alter table public.recipes add column nutrition_data jsonb,
 add column nutrition_portions integer not null default 1 check(nutrition_portions>0),
 add column nutrition_stale boolean not null default false;
create table public.personal_foods(
 id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid() references auth.users on delete cascade,
 name text not null check(length(trim(name)) between 1 and 200),
 aliases varchar(120)[] not null default '{}' check(cardinality(aliases)<=32 and array_position(aliases,null) is null),
 basis text not null check(basis in('g','ml')),
 kcal numeric(12,4) check(kcal between 0 and 100000),protein numeric(12,4) check(protein between 0 and 100000),
 carbs numeric(12,4) check(carbs between 0 and 100000),fat numeric(12,4) check(fat between 0 and 100000),
 density numeric(12,6) check(density>0 and density<=100),
 unit_amounts jsonb not null default '{}' check(jsonb_typeof(unit_amounts)='object' and octet_length(unit_amounts::text)<=4096),
 source_ref text check(source_ref is null or source_ref ~ '^https://world\.openfoodfacts\.org/product/[0-9]{4,20}$'),
 created_at timestamptz not null default now()
);
create index personal_foods_owner on public.personal_foods(user_id);
alter table public.personal_foods enable row level security;
revoke all on public.personal_foods from public,anon,authenticated;
grant select,delete on public.personal_foods to authenticated;
grant insert(name,aliases,basis,kcal,protein,carbs,fat,density,unit_amounts,source_ref),update(name,aliases,basis,kcal,protein,carbs,fat,density,unit_amounts,source_ref) on public.personal_foods to authenticated;
grant all on public.personal_foods to service_role;
create policy personal_foods_read on public.personal_foods for select to authenticated using(user_id=(select auth.uid()));
create policy personal_foods_create on public.personal_foods for insert to authenticated with check(user_id=(select auth.uid()));
create policy personal_foods_edit on public.personal_foods for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy personal_foods_delete on public.personal_foods for delete to authenticated using(user_id=(select auth.uid()));
create function dock_private.recipe_nutrition_changed() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.ingredients is distinct from old.ingredients and old.nutrition_data is not null then new.nutrition_stale=true;end if;
 return new;
end $$;
revoke all on function dock_private.recipe_nutrition_changed() from public,anon,authenticated;
create trigger recipe_nutrition_changed before update of ingredients on public.recipes for each row execute function dock_private.recipe_nutrition_changed();
create function public.save_recipe_nutrition(p_recipe bigint,p_ingredients jsonb,p_lines jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.recipes;f public.personal_foods;line jsonb;rows jsonb:='[]';totals jsonb:='{"kcal":0,"protein":0,"carbs":0,"fat":0}';
 quantity numeric;amount numeric;conversion numeric;unit text;metric text;value numeric;i int:=0;snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 select * into r from public.recipes where id=p_recipe and user_id=auth.uid() for update;
 if not found then raise exception 'Rezept nicht verfügbar';end if;
 if r.ingredients is distinct from p_ingredients then raise exception 'Zutaten wurden inzwischen geändert. Bitte neu berechnen.';end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_typeof(r.ingredients) is distinct from 'array' then raise exception 'Ungültige Zutatenliste';end if;
 if jsonb_array_length(p_lines)<>jsonb_array_length(r.ingredients) or jsonb_array_length(p_lines) not between 1 and 500 then raise exception 'Jede Zutat muss bestätigt werden (maximal 500).';end if;
 for line in select item.value from jsonb_array_elements(p_lines) as item(value) loop
  if line->>'raw' is distinct from r.ingredients->>i then raise exception 'Zutatenzuordnung stimmt nicht';end if;i=i+1;
  select * into f from public.personal_foods where id=(line->>'food_id')::uuid and user_id=auth.uid();if not found then raise exception 'Lebensmittel nicht verfügbar';end if;
  quantity=(line->>'quantity')::numeric;unit=line->>'unit';
  if quantity is null or not(quantity>0 and quantity<=1000000) then raise exception 'Ungültige Menge';end if;
  amount=quantity;
  if unit in('g','kg') then
   if unit='kg' then amount=amount*1000;end if;
   if f.basis='ml' then if f.density is null then raise exception 'Dichte fehlt';end if;amount=amount/f.density;end if;
  elsif unit in('ml','l') then
   if unit='l' then amount=amount*1000;end if;
   if f.basis='g' then if f.density is null then raise exception 'Dichte fehlt';end if;amount=amount*f.density;end if;
  elsif unit in('piece','tbsp','tsp','pinch','pack','can') then
   conversion=(f.unit_amounts->>unit)::numeric;if conversion is null or not(conversion>0 and conversion<=1000000) then raise exception 'Bestätigte Einheitenumrechnung fehlt';end if;amount=amount*conversion;
  else raise exception 'Einheit fehlt oder ist ungültig';end if;
  if not(amount>0 and amount<=1000000000) then raise exception 'Umrechnungsmenge ungültig';end if;
  foreach metric in array array['kcal','protein','carbs','fat'] loop
   value=(to_jsonb(f)->>metric)::numeric;
   totals=totals||jsonb_build_object(metric,case when value is null or totals->>metric is null then null else (totals->>metric)::numeric+value*amount/100 end);
  end loop;
  rows=rows||jsonb_build_array(jsonb_build_object('raw',line->>'raw','food_id',f.id,'food_name',f.name,'quantity',quantity,'unit',unit,'amount_base',amount,'basis',f.basis,'kcal',f.kcal,'protein',f.protein,'carbs',f.carbs,'fat',f.fat,'source_ref',f.source_ref));
 end loop;
 snapshot=jsonb_build_object('totals',totals,'lines',rows,'ingredients',r.ingredients,'calculated_at',clock_timestamp());
 update public.recipes set nutrition_data=snapshot,nutrition_stale=false where id=r.id;
 return jsonb_build_object('nutrition_data',snapshot,'nutrition_portions',r.nutrition_portions,'nutrition_stale',false);
end $$;
revoke all on function public.save_recipe_nutrition(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.save_recipe_nutrition(bigint,jsonb,jsonb) to authenticated;

-- Shared provider budget/cache: no recipe/user contents, only sanitized food search data.
create table dock_private.food_search_cache(query text primary key,products jsonb not null,fetched_at timestamptz not null default now());
create table dock_private.food_search_budget(id boolean primary key default true check(id),window_start timestamptz not null default now(),used int not null default 0);
insert into dock_private.food_search_budget(id) values(true);
alter table dock_private.food_search_cache enable row level security;
alter table dock_private.food_search_budget enable row level security;
revoke all on dock_private.food_search_cache,dock_private.food_search_budget from public,anon,authenticated;
grant all on dock_private.food_search_cache,dock_private.food_search_budget to service_role;
create function public.begin_food_search(p_query text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare products jsonb;b dock_private.food_search_budget;stamp timestamptz:=date_trunc('minute',clock_timestamp());begin
 if length(p_query) not between 2 and 80 then raise exception 'Ungültige Suche';end if;
 select c.products into products from dock_private.food_search_cache c where c.query=p_query and c.fetched_at>now()-interval '24 hours';
 if found then return jsonb_build_object('cached',true,'products',products);end if;
 select * into b from dock_private.food_search_budget where id for update;
 if b.window_start<stamp then update dock_private.food_search_budget set window_start=stamp,used=1 where id;
 elsif b.used>=8 then return jsonb_build_object('allowed',false);
 else update dock_private.food_search_budget set used=used+1 where id;end if;
 return jsonb_build_object('cached',false,'allowed',true);
end $$;
create function public.finish_food_search(p_query text,p_products jsonb) returns void language plpgsql security invoker set search_path='' as $$
begin
 if length(p_query) not between 2 and 80 or jsonb_typeof(p_products) is distinct from 'array' then raise exception 'Ungültige Suchdaten';end if;
 if jsonb_array_length(p_products)>8 or octet_length(p_products::text)>40000 then raise exception 'Suchdaten zu groß';end if;
 insert into dock_private.food_search_cache(query,products) values(p_query,p_products) on conflict(query) do update set products=excluded.products,fetched_at=clock_timestamp();
end $$;
revoke all on function public.begin_food_search(text),public.finish_food_search(text,jsonb) from public,anon,authenticated;
grant execute on function public.begin_food_search(text),public.finish_food_search(text,jsonb) to service_role;
