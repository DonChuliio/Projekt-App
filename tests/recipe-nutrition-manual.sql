begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$
declare suffix text:=gen_random_uuid()::text; pasta jsonb; milk jsonb; eggs jsonb; rid bigint; result jsonb; lines jsonb;
 ingredients jsonb:='["500gr Nudeln","200ml Milch","3 Eier"]';
 egg_values jsonb:=jsonb_build_object('name','Synthetic eggs '||suffix,'basis','piece','kcal',80,'carbs',0,'protein',7,'fat',5);
begin
 pasta:=public.save_manual_food(jsonb_build_object('name','Synthetic pasta '||suffix,'basis','g','kcal',350,'carbs',70,'protein',12,'fat',2));
 milk:=public.save_manual_food(jsonb_build_object('name','Synthetic milk '||suffix,'basis','ml','kcal',50,'carbs',5,'protein',3,'fat',2));
 eggs:=public.save_manual_food(egg_values);
 if public.save_manual_food(egg_values)->>'id'<>eggs->>'id' then raise exception 'Duplicate food created';end if;
 begin perform public.save_manual_food(egg_values||'{"kcal":81}');raise exception 'Unconfirmed replacement';exception when raise_exception then if sqlerrm='Unconfirmed replacement' then raise;end if;end;
 if public.save_manual_food(egg_values||'{"kcal":81}',(eggs->>'id')::uuid,true)->>'id'<>eggs->>'id' then raise exception 'Replacement changed ID';end if;
 perform public.save_manual_food(egg_values,(eggs->>'id')::uuid,true);
 insert into public.recipes(name,ingredients,description,nutrition_portions) values('Synthetic manual nutrition '||suffix,ingredients,'Not a recipe ingredient',4) returning id into rid;
 lines:=jsonb_build_array(jsonb_build_object('raw',ingredients->>0,'quantity',500,'unit','g','food_id',pasta->>'id'),jsonb_build_object('raw',ingredients->>1,'quantity',200,'unit','ml','food_id',milk->>'id'),jsonb_build_object('raw',ingredients->>2,'quantity',3,'unit','piece','food_id',eggs->>'id'));
 result:=public.save_manual_recipe_nutrition(rid,ingredients,lines);
 if result->'nutrition_data'->'totals' <> '{"kcal":2090,"carbs":360,"protein":87,"fat":29}'::jsonb or result->>'nutrition_portions'<>'4' then raise exception 'Unexpected recipe totals or portions';end if;
 begin perform public.save_manual_recipe_nutrition(rid,ingredients,jsonb_set(lines,'{2,unit}','"g"'));raise exception 'Invalid conversion';exception when raise_exception then if sqlerrm='Invalid conversion' then raise;end if;end;
 update public.recipes set ingredients='["2 Eier"]' where id=rid;
 if not (select nutrition_stale and nutrition_portions=4 from public.recipes where id=rid) then raise exception 'Missing stale flag or portions lost';end if;
 perform set_config('manual.food',eggs->>'id',true);perform set_config('manual.recipe',rid::text,true);
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.personal_foods where id=current_setting('manual.food')::uuid) then raise exception 'Foreign food readable';end if;
 begin perform public.save_manual_recipe_nutrition(current_setting('manual.recipe')::bigint,'[]','[]');raise exception 'Foreign recipe editable';exception when raise_exception then if sqlerrm='Foreign recipe editable' then raise;end if;end;
end $$;
reset role;
rollback;
