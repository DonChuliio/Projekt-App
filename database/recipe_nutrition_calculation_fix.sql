create or replace function public.save_recipe_nutrition(p_recipe bigint,p_ingredients jsonb,p_lines jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
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
