-- Synthetic provider cache/budget test. Transaction rolls back every change.
begin;
set local role service_role;
do $$declare v jsonb;i int;term text:='dock-synthetic-'||gen_random_uuid()::text;
begin
 update dock_private.food_search_budget set window_start=date_trunc('minute',clock_timestamp()),used=0 where id;
 for i in 1..8 loop
  v=public.begin_food_search(term||i);
  if not(v->>'allowed')::boolean then raise exception 'Search reservation failed';end if;
 end loop;
 v=public.begin_food_search(term||'blocked');
 if (v->>'allowed')::boolean then raise exception 'Search budget bypass';end if;
 perform public.finish_food_search(term,'[{"name":"Synthetic test","basis":"","kcal":null,"protein":0,"carbs":null,"fat":null,"source_ref":"https://world.openfoodfacts.org/product/123456"}]');
 v=public.begin_food_search(term);
 if not(v->>'cached')::boolean or v->'products'->0->>'name'<>'Synthetic test' then raise exception 'Search cache failed';end if;
end $$;
reset role;
rollback;
