-- New synthetic foods and recipe only. Entire test rolls back.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare fid uuid;rid bigint;v jsonb;ingredients jsonb:='["1,5 kg Mehl","200 ml Mehl"]';lines jsonb;begin
 insert into public.personal_foods(name,aliases,basis,kcal,protein,carbs,fat,density,unit_amounts) values('Synthetic flour',array['mehl'],'g',400,10,80,2,0.5,'{"piece":50,"tbsp":7.5,"tsp":2.5,"pinch":0.3,"pack":500,"can":400}') returning id into fid;
 insert into public.recipes(name,ingredients,description) values('Synthetic nutrition recipe',ingredients,'Not an ingredient: 999 kg sugar') returning id into rid;
 if (select nutrition_portions from public.recipes where id=rid)<>1 then raise exception 'Initial portions not one';end if;
 lines=jsonb_build_array(jsonb_build_object('raw','1,5 kg Mehl','food_id',fid,'quantity',1.5,'unit','kg'),jsonb_build_object('raw','200 ml Mehl','food_id',fid,'quantity',200,'unit','ml'));
 v=public.save_recipe_nutrition(rid,ingredients,lines);if (v->'nutrition_data'->'totals'->>'kcal')::numeric<>6400 then raise exception 'Wrong total';end if;
 update public.recipes set nutrition_portions=4 where id=rid;
 v=public.save_recipe_nutrition(rid,ingredients,lines);if (v->>'nutrition_portions')::int<>4 then raise exception 'Recalculation lost portions';end if;
 update public.personal_foods set protein=null,fat=0 where id=fid;
 v=public.save_recipe_nutrition(rid,ingredients,lines);if v->'nutrition_data'->'totals'->>'protein' is not null or (v->'nutrition_data'->'totals'->>'fat')::numeric<>0 then raise exception 'Unknown treated as zero';end if;
 update public.recipes set ingredients='["2 Stück Mehl"]' where id=rid;
 if not(select nutrition_stale from public.recipes where id=rid) or (select nutrition_portions from public.recipes where id=rid)<>4 then raise exception 'Ingredient change not stale/portions lost';end if;
 begin perform public.save_recipe_nutrition(rid,ingredients,lines);raise exception 'Stale snapshot saved';exception when raise_exception then if sqlerrm='Stale snapshot saved' then raise;end if;end;
 v=public.save_recipe_nutrition(rid,'["2 Stück Mehl"]',jsonb_build_array(jsonb_build_object('raw','2 Stück Mehl','food_id',fid,'quantity',2,'unit','piece')));
 if (v->'nutrition_data'->'totals'->>'kcal')::numeric<>400 or (v->>'nutrition_stale')::boolean then raise exception 'Piece recalculation failed';end if;
 begin update public.recipes set nutrition_portions=0 where id=rid;raise exception 'Zero portions accepted';exception when check_violation then null;end;
 begin update public.personal_foods set user_id=gen_random_uuid() where id=fid;raise exception 'Food owner changed';exception when insufficient_privilege then null;end;
 perform set_config('nutrition.food',fid::text,true);perform set_config('nutrition.recipe',rid::text,true);
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.personal_foods where id=current_setting('nutrition.food')::uuid) then raise exception 'Foreign food read';end if;
 if exists(select 1 from public.recipes where id=current_setting('nutrition.recipe')::bigint) then raise exception 'Foreign recipe read';end if;
 update public.personal_foods set name='Foreign edit' where id=current_setting('nutrition.food')::uuid;if found then raise exception 'Foreign edit';end if;
 begin perform public.save_recipe_nutrition(current_setting('nutrition.recipe')::bigint,'[]','[]');raise exception 'Foreign calculation';exception when raise_exception then if sqlerrm='Foreign calculation' then raise;end if;end;
 begin perform public.begin_food_search('mehl');raise exception 'Client provider budget allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
set local role anon;
do $$begin
 begin perform 1 from public.personal_foods;raise exception 'Anonymous food read';exception when insufficient_privilege then null;end;
 begin perform public.save_recipe_nutrition(1,'[]','[]');raise exception 'Anonymous calculation';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
