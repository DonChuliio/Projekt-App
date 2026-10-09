-- Synthetic game only; the entire transaction is rolled back.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$ declare g uuid; v jsonb; token text; host uuid; first_host uuid; pid uuid; old_round uuid; old_secret text; r uuid; c jsonb; status jsonb; n integer; i integer; result jsonb;begin
 g=(public.imposter_manage('create',null,'{"name":"Synthetic Imposter"}')->>'id')::uuid;
 for i in 1..11 loop perform public.imposter_manage('player',g,jsonb_build_object('name','Synthetic player '||i));end loop;
 v=public.imposter_manage('view',g);token=v->'game'->>'token';host=(v->'players'->0->>'id')::uuid;first_host=host;pid=(v->'players'->1->>'id')::uuid;
 status=public.imposter_status(token);if status->>'state'<>'waiting' or jsonb_array_length(status->'players')<>11 then raise exception 'Waiting roster wrong';end if;
 for i in 1..20 loop
  v=public.imposter_manage('view',g);host=(v->'players'->(i%11)->>'id')::uuid;
  perform public.imposter_manage('round',g,jsonb_build_object('host_id',host,'word','Synthetic word','hint','Synthetic hint','imposters',1+(i%2)));
  v=public.imposter_manage('view',g);r=(v->'round'->>'id')::uuid;
  if v->'game'->>'token'<>token or v->'round'->>'word'<>'Synthetic word' or v->'round'->>'hint'<>'Synthetic hint' then raise exception 'Admin/link changed';end if;
  -- Private inspection only in this transactional test, never exposed by any RPC.
  perform set_config('dock.test.round',r::text,true);perform set_config('dock.test.game',g::text,true);
  perform set_config('dock.test.expected',(1+(i%2))::text,true);
  if i=1 then old_round=r;c=public.imposter_claim(token,r,host);old_secret=c->>'secret';if c->'result'<>'{"role":"host"}'::jsonb then raise exception 'Host word leaked';end if;end if;
 end loop;
 -- Current round host differs, 11 persistent participants remain.
 if host=first_host or jsonb_array_length(v->'players')<>11 then raise exception 'Host rotation/list persistence failed';end if;
 begin perform public.imposter_role(token,old_round,old_secret);raise exception 'Old role accepted';exception when raise_exception then if sqlerrm='Old role accepted' then raise;end if;end;
 if public.imposter_claim_valid(token,old_round,old_secret) then raise exception 'Old credential valid';end if;
 for result in select value from jsonb_array_elements(v->'players') loop
  pid=(result->>'id')::uuid;c=public.imposter_claim(token,r,pid);status=public.imposter_role(token,r,c->>'secret');
  if pid=host then if status<>'{"role":"host"}'::jsonb then raise exception 'Host data leaked';end if;
  elsif status->>'role'='imposter' then if status ? 'word' or status->>'hint'<>'Synthetic hint' then raise exception 'Imposter word leak';end if;
  else if status->>'word'<>'Synthetic word' or status ? 'hint' then raise exception 'Player role invalid';end if;end if;
  begin perform public.imposter_claim(token,r,pid);raise exception 'Duplicate claim allowed';exception when raise_exception then if sqlerrm='Duplicate claim allowed' then raise;end if;end;
  perform public.imposter_manage('reset',g,jsonb_build_object('id',pid));if public.imposter_claim_valid(token,r,c->>'secret') then raise exception 'Reset credential valid';end if;
 end loop;
 status=public.imposter_status(token);if status ? 'word' or status ? 'hint' or status ? 'roles' then raise exception 'Bulk data exposed';end if;
 perform public.imposter_manage('close',g);if public.imposter_status(token)->>'state'<>'closed' then raise exception 'Close failed';end if;
 begin perform public.imposter_claim(token,r,pid);raise exception 'Closed claim accepted';exception when raise_exception then if sqlerrm='Closed claim accepted' then raise;end if;end;
 -- Participant editing/removal remains admin-only and scoped to this game.
 perform public.imposter_manage('player',g,jsonb_build_object('id',pid,'name','Synthetic renamed'));
 perform public.imposter_manage('delete_player',g,jsonb_build_object('id',pid));
 if jsonb_array_length(public.imposter_manage('view',g)->'players')<>10 then raise exception 'Targeted removal failed';end if;
 perform set_config('dock.test.token',token,true);
end $$;
reset role;
do $$ declare n integer; expected integer;begin
 select count(*) into n from dock_game.roles where round_id=current_setting('dock.test.round')::uuid;if n<>10 then raise exception 'Not 10 active players';end if;
 select count(*) into n from dock_game.roles where round_id=current_setting('dock.test.round')::uuid and is_imposter;expected=current_setting('dock.test.expected')::integer;if n<>expected then raise exception 'Wrong imposter count';end if;
 if exists(select 1 from dock_game.roles x join dock_game.rounds r on r.id=x.round_id where r.game_id=current_setting('dock.test.game')::uuid and x.player_id=r.host_id) then raise exception 'Host has player role';end if;
 if exists(select 1 from dock_game.rounds r where r.game_id=current_setting('dock.test.game')::uuid and (select count(*) from dock_game.roles x where x.round_id=r.id and x.is_imposter)<>r.imposters) then raise exception 'Wrong counts across rounds';end if;
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 begin perform public.imposter_manage('view',current_setting('dock.test.game')::uuid);raise exception 'Foreign admin allowed';exception when raise_exception then if sqlerrm='Foreign admin allowed' then raise;end if;end;
 begin perform public.imposter_manage('reset',current_setting('dock.test.game')::uuid,'{}');raise exception 'Foreign reset allowed';exception when raise_exception then if sqlerrm='Foreign reset allowed' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$ declare s jsonb;begin
 s=public.imposter_status(current_setting('dock.test.token'));if s ? 'word' or s ? 'hint' then raise exception 'Anonymous word leak';end if;
 begin perform public.imposter_manage('create',null,'{"name":"forbidden"}');raise exception 'Anonymous admin';exception when insufficient_privilege then null;end;
 begin perform * from dock_game.roles;raise exception 'Direct roles read';exception when insufficient_privilege then null;end;
 begin perform * from dock_game.rounds;raise exception 'Direct word read';exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
