-- Synthetic fixtures only. All changes roll back; no real game is changed.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare gid uuid;v jsonb;bad jsonb;i int;begin
 gid=(public.sieve_manage('create',null,'{"name":"Synthetic configurable category game"}')->>'id')::uuid;
 for i in 1..4 loop perform public.sieve_manage('player',gid,jsonb_build_object('name','Synthetic custom player '||i));end loop;
 for bad in select value from jsonb_array_elements('[{"category_count":0},{"category_count":5},{"category_count":2,"category_names":["One"]},{"category_count":2,"category_names":["One","   "]},{"category_count":2,"category_names":["One",null]},{"category_count":2,"category_names":["One",42]},{"category_count":2,"category_names":"Wrong type"}]'::jsonb) loop
  begin perform public.sieve_manage('configure',gid,'{"words_per_player":1,"joker_limit":1,"turn_seconds":60}'::jsonb||bad);raise exception 'Invalid categories accepted';exception when raise_exception then if sqlerrm='Invalid categories accepted' then raise;end if;end;
 end loop;
 begin perform public.sieve_manage('configure',gid,jsonb_build_object('words_per_player',1,'joker_limit',1,'category_count',1,'category_names',jsonb_build_array(repeat('x',61))));raise exception 'Long name accepted';exception when raise_exception then if sqlerrm='Long name accepted' then raise;end if;end;
 perform public.sieve_manage('configure',gid,'{"words_per_player":1,"joker_limit":1,"category_count":3,"category_names":["  Mimen  ","Eigene Runde","Erklären"]}');
 v=public.sieve_manage('view',gid);if v->'game'->'category_names'<>'["Mimen","Eigene Runde","Erklären"]'::jsonb then raise exception 'Custom names/order not persisted';end if;
 perform public.sieve_manage('start',gid);
 begin perform public.sieve_manage('configure',gid,'{"words_per_player":1,"joker_limit":1,"category_count":1,"category_names":["Changed"]}');raise exception 'Started settings changed';exception when raise_exception then if sqlerrm='Started settings changed' then raise;end if;end;
 v=public.sieve_manage('view',gid);perform set_config('sieve_custom.game',gid::text,true);perform set_config('sieve_custom.token',v->'game'->>'token',true);
end $$;
reset role;
set local role anon;
do $$declare token text:=current_setting('sieve_custom.token');v jsonb;p jsonb;secret text;args jsonb;t jsonb;cat int;i int;expected text[]:=array['Mimen','Eigene Runde','Erklären'];begin
 v=public.sieve_status(token);if v->'category_names'<>'["Mimen","Eigene Runde","Erklären"]'::jsonb then raise exception 'Public order differs';end if;
 for p in select value from jsonb_array_elements(v->'players') loop
  secret=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');perform set_config('sieve_custom.secret.p'||replace(p->>'id','-',''),secret,true);perform public.sieve_claim(token,(p->>'id')::uuid,secret);perform public.sieve_action(token,secret,gen_random_uuid(),'submit','{"words":["Synthetic category term"]}');
 end loop;
 for cat in 1..3 loop
  v=public.sieve_status(token);if (v->>'category')::int<>cat or v->'categories'->(cat-1)->>'name'<>expected[cat] then raise exception 'Category progression/name differs';end if;
  t=v->'turn';secret=current_setting('sieve_custom.secret.p'||replace(t->>'player_id','-',''));args=jsonb_build_object('turn_id',t->>'id','word_number',1);perform public.sieve_action(token,secret,gen_random_uuid(),'start',args);
  for i in 1..4 loop args=jsonb_build_object('turn_id',t->>'id','word_number',i);perform public.sieve_action(token,secret,gen_random_uuid(),'solve',args);end loop;
  v=public.sieve_status(token);if cat<3 then
   if v->>'phase'<>'category_done' then raise exception 'Category skipped';end if;
   perform public.sieve_action(token,secret,gen_random_uuid(),'next_category',jsonb_build_object('category',cat));
  elsif v->>'state'<>'finished' then raise exception 'Wrong final category';end if;
 end loop;
end $$;
reset role;
set local role authenticated;
select public.sieve_manage('end',current_setting('sieve_custom.game')::uuid);
do $$declare v jsonb;begin
 v=public.sieve_manage('view',current_setting('sieve_custom.game')::uuid);
 if jsonb_array_length(v->'results')<>3 or v->'results'->0->>'name'<>'Mimen' or v->'results'->1->>'name'<>'Eigene Runde' or v->'results'->2->>'name'<>'Erklären' then raise exception 'Archive names/order lost';end if;
end $$;
reset role;
rollback;
