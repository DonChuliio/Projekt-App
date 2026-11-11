-- Keep existing food IDs, legacy metadata, snapshots and portions intact.
alter table public.personal_foods drop constraint personal_foods_basis_check;
alter table public.personal_foods add constraint personal_foods_basis_check check(basis in ('g','ml','piece'));

create function public.save_manual_food(p_food jsonb,p_id uuid default null,p_replace boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid(); f public.personal_foods; candidate public.personal_foods;
 food_name text:=regexp_replace(btrim(p_food->>'name'),'[[:space:]]+',' ','g');
 food_basis text:=p_food->>'basis'; kcal_value numeric:=round((p_food->>'kcal')::numeric,4);
 carbs_value numeric:=round((p_food->>'carbs')::numeric,4); protein_value numeric:=round((p_food->>'protein')::numeric,4);
 fat_value numeric:=round((p_food->>'fat')::numeric,4);
begin
 if owner is null then raise exception 'Bitte anmelden.';end if;
 if food_name is null or length(food_name) not between 1 and 200 or food_basis is null or food_basis not in ('g','ml','piece') then raise exception 'Bitte Name und Bezugsgröße eingeben.';end if;
 if ((kcal_value between 0 and 100000) and (carbs_value between 0 and 100000) and (protein_value between 0 and 100000) and (fat_value between 0 and 100000)) is not true then raise exception 'Bitte alle vier gültigen Nährwerte eingeben.';end if;
 -- Serialize edits within one library; do not rewrite existing duplicate records.
 perform pg_advisory_xact_lock(hashtextextended('dock:manual-food:'||owner::text,0));
 select * into candidate from public.personal_foods
 where user_id=owner and basis=food_basis and lower(regexp_replace(btrim(name),'[[:space:]]+',' ','g'))=lower(food_name)
 and (p_id is null or id<>p_id) order by created_at,id limit 1;
 if p_id is not null then
  select * into f from public.personal_foods where id=p_id and user_id=owner;
  if not found then raise exception 'Lebensmittel nicht verfügbar.';end if;
  if candidate.id is not null and (f.basis<>food_basis or lower(regexp_replace(btrim(f.name),'[[:space:]]+',' ','g'))<>lower(food_name)) then raise exception 'Dieser Name mit dieser Bezugsgröße ist bereits gespeichert.';end if;
 else f:=candidate;
 end if;
 if f.id is null then
  insert into public.personal_foods(name,basis,kcal,carbs,protein,fat) values(food_name,food_basis,kcal_value,carbs_value,protein_value,fat_value) returning * into f;
 elsif row(f.basis,f.kcal,f.carbs,f.protein,f.fat) is distinct from row(food_basis,kcal_value,carbs_value,protein_value,fat_value)
   or (p_id is not null and f.name is distinct from food_name) then
  if p_replace is distinct from true then raise exception 'Lebensmittel bereits gespeichert. Bitte die Aktualisierung des Eintrags ausdrücklich bestätigen.';end if;
  update public.personal_foods set name=food_name,basis=food_basis,kcal=kcal_value,carbs=carbs_value,protein=protein_value,fat=fat_value where id=f.id and user_id=owner returning * into f;
  if not found then raise exception 'Lebensmittel nicht verfügbar.';end if;
 end if;
 return jsonb_build_object('id',f.id,'name',f.name,'basis',f.basis,'kcal',f.kcal,'carbs',f.carbs,'protein',f.protein,'fat',f.fat);
end $$;
revoke all on function public.save_manual_food(jsonb,uuid,boolean) from public,anon;
grant execute on function public.save_manual_food(jsonb,uuid,boolean) to authenticated;

create function public.save_manual_recipe_nutrition(p_recipe bigint,p_ingredients jsonb,p_lines jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner uuid:=auth.uid(); r public.recipes; f public.personal_foods; line jsonb;
 rows jsonb:='[]'; totals jsonb:='{"kcal":0,"carbs":0,"protein":0,"fat":0}';
 quantity numeric; unit text; factor numeric; metric text; i integer:=0; snapshot jsonb;
begin
 if owner is null then raise exception 'Bitte anmelden.';end if;
 select * into r from public.recipes where id=p_recipe and user_id=owner for update;
 if not found then raise exception 'Rezept nicht verfügbar.';end if;
 if r.ingredients is distinct from p_ingredients then raise exception 'Zutaten wurden inzwischen geändert. Bitte neu berechnen.';end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_typeof(r.ingredients) is distinct from 'array' then raise exception 'Ungültige Zutatenliste.';end if;
 if jsonb_array_length(p_lines)<>jsonb_array_length(r.ingredients) or jsonb_array_length(p_lines) not between 1 and 500 then raise exception 'Jede Zutat muss bestätigt werden (maximal 500).';end if;
 for line in select item.value from jsonb_array_elements(p_lines) as item(value) loop
  if line->>'raw' is distinct from r.ingredients->>i then raise exception 'Zutatenzuordnung stimmt nicht.';end if;
  i:=i+1;
  select * into f from public.personal_foods where id=(line->>'food_id')::uuid and user_id=owner;
  if not found then raise exception 'Lebensmittel nicht verfügbar.';end if;
  if f.kcal is null or f.carbs is null or f.protein is null or f.fat is null then raise exception 'Bitte alle vier Nährwerte ergänzen.';end if;
  quantity:=(line->>'quantity')::numeric;unit:=line->>'unit';
  if quantity is null or not(quantity>0 and quantity<=1000000) then raise exception 'Ungültige Menge.';end if;
  if unit='piece' and f.basis='piece' then factor:=quantity;
  elsif (unit in ('g','kg') and f.basis='g') or (unit in ('ml','l') and f.basis='ml') then factor:=quantity*(case when unit in ('kg','l') then 10 else 0.01 end);
  else raise exception 'Mengeneinheit und Bezugsgröße passen nicht zusammen.';
  end if;
  foreach metric in array array['kcal','carbs','protein','fat'] loop
   totals:=totals||jsonb_build_object(metric,(totals->>metric)::numeric+(to_jsonb(f)->>metric)::numeric*factor);
  end loop;
  rows:=rows||jsonb_build_array(jsonb_build_object('raw',line->>'raw','food_id',f.id,'food_name',f.name,'quantity',quantity,'unit',unit,'basis',f.basis,'kcal',f.kcal,'carbs',f.carbs,'protein',f.protein,'fat',f.fat));
 end loop;
 snapshot:=jsonb_build_object('method','manual','totals',totals,'lines',rows,'ingredients',r.ingredients,'calculated_at',clock_timestamp());
 update public.recipes set nutrition_data=snapshot,nutrition_stale=false where id=r.id and user_id=owner;
 return jsonb_build_object('nutrition_data',snapshot,'nutrition_portions',r.nutrition_portions,'nutrition_stale',false);
end $$;
revoke all on function public.save_manual_recipe_nutrition(bigint,jsonb,jsonb) from public,anon;
grant execute on function public.save_manual_recipe_nutrition(bigint,jsonb,jsonb) to authenticated;
