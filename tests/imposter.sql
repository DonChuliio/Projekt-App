-- Entirely synthetic fixtures in a rolled-back transaction; no real game modified.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare g uuid;v jsonb;i int;begin
 g=(public.imposter_manage('create',null,'{"name":"Synthetic lifecycle"}')->>'id')::uuid;
 v=public.imposter_manage('view',g);if v->'game'->>'token' is not null then raise exception 'Draft has link';end if;
 for i in 1..11 loop perform public.imposter_manage('player',g,jsonb_build_object('name','Synthetic player '||i));end loop;
 perform public.imposter_manage('configure',g,'{"imposters":2,"expected_players":10}');
 begin perform public.imposter_manage('start',g);raise exception 'Wrong count accepted';exception when raise_exception then if sqlerrm='Wrong count accepted' then raise;end if;end;
 perform public.imposter_manage('configure',g,'{"imposters":2,"expected_players":11}');perform public.imposter_manage('start',g);
 v=public.imposter_manage('view',g);if v->'game'->>'token' is null or v->'round'->>'phase'<>'choosing' then raise exception 'No started game';end if;
 begin perform public.imposter_manage('start',g);raise exception 'Double start';exception when raise_exception then if sqlerrm='Double start' then raise;end if;end;
 begin perform public.imposter_manage('player',g,'{"name":"Late"}');raise exception 'Active roster changed';exception when raise_exception then if sqlerrm='Active roster changed' then raise;end if;end;
 perform set_config('dock.test.game',g::text,true);perform set_config('dock.test.token',v->'game'->>'token',true);
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare token text:=current_setting('dock.test.token');s jsonb;c jsonb;p jsonb;credentials jsonb:='{}';host uuid;previous uuid;other uuid;r uuid;i int;secret text;role jsonb;begin
 s=public.imposter_status(token);r=(s->>'round_id')::uuid;
 for p in select value from jsonb_array_elements(s->'players') loop
  c=public.imposter_claim(token,r,(p->>'id')::uuid);credentials=credentials||jsonb_build_object(p->>'id',c->>'secret');
  if c->'result'->>'role' not in('host','waiting') or c->'result'->>'word' is not null then raise exception 'Word before preparation';end if;
  begin perform public.imposter_claim(token,r,(p->>'id')::uuid);raise exception 'Duplicate name accepted';exception when raise_exception then if sqlerrm='Duplicate name accepted' then raise;end if;end;
 end loop;
 for i in 1..20 loop
  s=public.imposter_status(token);r=(s->>'round_id')::uuid;host=(s->>'host_id')::uuid;secret=credentials->>host::text;
  if host=previous or (s->>'number')::int<>i or s ? 'word' or s ? 'hint' or s ? 'roles' then raise exception 'Round rotation/status leak';end if;
  select (value->>'id')::uuid into other from jsonb_array_elements(s->'players') where value->>'id'<>host::text limit 1;
  begin perform public.imposter_host_action(token,r,credentials->>other::text,'prepare','{"word":"hack"}');raise exception 'Foreign prepare';exception when raise_exception then if sqlerrm='Foreign prepare' then raise;end if;end;
  begin perform public.imposter_host_action(token,r,secret,'finish','{"winner":"players"}');raise exception 'Early result';exception when raise_exception then if sqlerrm='Early result' then raise;end if;end;
  perform public.imposter_host_action(token,r,secret,'prepare','{"word":"Synthetic word","hint":"Synthetic hint"}');
  for p in select value from jsonb_array_elements(s->'players') loop
   role=public.imposter_role(token,r,credentials->>(p->>'id'));
   if p->>'id'=host::text then if role->>'role'<>'host' or role->>'word'<>'Synthetic word' then raise exception 'Host cannot see word';end if;
   elsif role->>'role'='imposter' then if role ? 'word' or role->>'hint'<>'Synthetic hint' then raise exception 'Imposter leaked word';end if;
   elsif role->>'word'<>'Synthetic word' or role ? 'hint' then raise exception 'Player invalid role';end if;
  end loop;
  begin perform public.imposter_host_action(token,r,credentials->>other::text,'finish','{"winner":"players"}');raise exception 'Foreign result';exception when raise_exception then if sqlerrm='Foreign result' then raise;end if;end;
  perform public.imposter_host_action(token,r,secret,'finish',jsonb_build_object('winner',case when i%2=0 then 'imposter' else 'players' end));
  begin perform public.imposter_host_action(token,r,secret,'finish','{"winner":"players"}');raise exception 'Double result';exception when raise_exception then if sqlerrm='Double result' then raise;end if;end;
  if i<20 then
   begin perform public.imposter_host_action(token,r,credentials->>other::text,'next');raise exception 'Foreign next';exception when raise_exception then if sqlerrm='Foreign next' then raise;end if;end;
   perform public.imposter_host_action(token,r,secret,'next');
   begin perform public.imposter_host_action(token,r,secret,'next');raise exception 'Stale next';exception when raise_exception then if sqlerrm='Stale next' then raise;end if;end;
   if not public.imposter_claim_valid(token,(public.imposter_status(token)->>'round_id')::uuid,secret) then raise exception 'Persistent identity lost';end if;
  end if;
  previous=host;
 end loop;
 begin perform public.imposter_manage('end',current_setting('dock.test.game')::uuid);raise exception 'Anonymous end';exception when insufficient_privilege then null;end;
 begin perform * from dock_game.sessions;raise exception 'Direct credentials read';exception when insufficient_privilege then null;end;
 perform set_config('dock.test.reset_player',other::text,true);perform set_config('dock.test.reset_secret',credentials->>other::text,true);perform set_config('dock.test.secret',secret,true);perform set_config('dock.test.round',r::text,true);
end $$;
reset role;
do $$begin
 if exists(select 1 from dock_game.rounds r where r.game_id=current_setting('dock.test.game')::uuid and ((select count(*) from dock_game.roles a where a.round_id=r.id)<>10 or (select count(*) from dock_game.roles a where a.round_id=r.id and a.is_imposter)<>2 or exists(select 1 from dock_game.roles a where a.round_id=r.id and a.player_id=r.host_id))) then raise exception 'Invalid role allocation';end if;
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 begin perform public.imposter_manage('view',current_setting('dock.test.game')::uuid);raise exception 'Foreign owner';exception when raise_exception then if sqlerrm='Foreign owner' then raise;end if;end;
 begin perform public.imposter_manage('end',current_setting('dock.test.game')::uuid);raise exception 'Foreign end';exception when raise_exception then if sqlerrm='Foreign end' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare g uuid:=current_setting('dock.test.game')::uuid;v jsonb;wins int;played int;p jsonb;begin
 v=public.imposter_manage('view',g);if jsonb_array_length(v->'history')<>20 then raise exception 'History lost';end if;
 select sum((value->>'wins')::int),sum((value->>'played')::int) into wins,played from jsonb_array_elements(v->'stats');if wins<>100 or played<>200 then raise exception 'Scores wrong % %',wins,played;end if;
 perform public.imposter_manage('reset',g,jsonb_build_object('id',current_setting('dock.test.reset_player')));if public.imposter_claim_valid(current_setting('dock.test.token'),current_setting('dock.test.round')::uuid,current_setting('dock.test.reset_secret')) then raise exception 'Reset ignored';end if;
 perform public.imposter_manage('end',g);v=public.imposter_manage('view',g);
 if v->'game'->>'state'<>'ended' or v->'game'->>'token' is not null or jsonb_array_length(v->'history')<>20 then raise exception 'Archive wrong';end if;
 begin perform public.imposter_manage('start',g);raise exception 'Ended restarted';exception when raise_exception then if sqlerrm='Ended restarted' then raise;end if;end;
end $$;
reset role;
set local role anon;
do $$begin
 if public.imposter_status(current_setting('dock.test.token'))<>'{"state":"unavailable"}'::jsonb then raise exception 'Dead link exposed game';end if;
 begin perform public.imposter_role(current_setting('dock.test.token'),current_setting('dock.test.round')::uuid,current_setting('dock.test.secret'));raise exception 'Dead role';exception when raise_exception then if sqlerrm='Dead role' then raise;end if;end;
 begin perform public.imposter_host_action(current_setting('dock.test.token'),current_setting('dock.test.round')::uuid,current_setting('dock.test.secret'),'next');raise exception 'Dead next';exception when raise_exception then if sqlerrm='Dead next' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare g uuid;i int;begin
 g=(public.imposter_manage('create',null,'{"name":"Synthetic one imposter"}')->>'id')::uuid;
 for i in 1..3 loop perform public.imposter_manage('player',g,jsonb_build_object('name','Synthetic name '||i));end loop;
 perform public.imposter_manage('configure',g,'{"expected_players":3,"imposters":1}');perform public.imposter_manage('start',g);perform set_config('dock.test.one_game',g::text,true);
end $$;
reset role;
do $$declare r uuid;begin
 select current_round into r from dock_game.games where id=current_setting('dock.test.one_game')::uuid;
 if (select count(*) from dock_game.roles where round_id=r)<>2 or (select count(*) from dock_game.roles where round_id=r and is_imposter)<>1 then raise exception 'One imposter wrong';end if;
end $$;
rollback;
