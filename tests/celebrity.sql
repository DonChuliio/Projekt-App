begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
select set_config('celeb.owner',current_setting('request.jwt.claim.sub'),true);
set local role authenticated;
do $$declare g uuid;i int;v jsonb;begin
 g=(public.celebrity_manage('create',null,'{"name":"Synthetic eleven-player game"}')->>'id')::uuid;
 for i in 1..11 loop perform public.celebrity_manage('player',g,jsonb_build_object('name','Synthetic player '||i));end loop;
 perform public.celebrity_manage('configure',g,'{"notes_enabled":true}');perform public.celebrity_manage('start',g);v=public.celebrity_manage('view',g);
 perform set_config('celeb.game',g::text,true);perform set_config('celeb.token',v->'game'->>'token',true);perform set_config('celeb.round',v->'round'->>'id',true);
 if jsonb_array_length(v->'players')<>11 then raise exception 'Wrong player count';end if;
end $$;
reset role;
do $$declare rid uuid:=current_setting('celeb.round')::uuid;begin
 if (select count(*) from dock_celebrity.entries where round_id=rid)<>11 or (select count(distinct recipient_id) from dock_celebrity.entries where round_id=rid)<>11 or exists(select 1 from dock_celebrity.entries where round_id=rid and player_id=recipient_id) then raise exception 'Invalid random bijection';end if;
end $$;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare s jsonb;p jsonb;own jsonb;answer jsonb;i int:=0;secret text;rid uuid:=current_setting('celeb.round')::uuid;token text:=current_setting('celeb.token');begin
 s=public.celebrity_status(token);if s ? 'celebrity' or s ? 'entries' or s ? 'recipient_id' then raise exception 'Public status leak';end if;
 if not (s->>'notes_enabled')::boolean then raise exception 'Notes setting lost';end if;
 begin perform public.celebrity_manage('list');raise exception 'Anonymous manage allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from dock_celebrity.entries;raise exception 'Direct entries allowed';exception when insufficient_privilege then null;end;
 begin perform dock_celebrity.stats(null);raise exception 'Private stats allowed';exception when insufficient_privilege then null;end;
 for p in select value from jsonb_array_elements(s->'players') loop
  i=i+1;secret=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');perform set_config('celeb.secret.p'||replace(p->>'id','-',''),secret,true);
  perform public.celebrity_claim(token,rid,(p->>'id')::uuid,secret);perform public.celebrity_claim(token,rid,(p->>'id')::uuid,secret);
  begin perform public.celebrity_claim(token,rid,(p->>'id')::uuid,repeat('0',64));raise exception 'Double claim accepted';exception when raise_exception then if sqlerrm='Double claim accepted' then raise;end if;end;
  own=public.celebrity_player(token,rid,secret);if own is null or own->>'recipient_name'=p->>'name' or own ? 'celebrity' then raise exception 'Invalid own context';end if;
  begin perform public.celebrity_action(token,rid,secret,'win');raise exception 'Early win allowed';exception when raise_exception then if sqlerrm='Early win allowed' then raise;end if;end;
  begin perform public.celebrity_others(token,rid,secret);raise exception 'Early others allowed';exception when raise_exception then if sqlerrm='Early others allowed' then raise;end if;end;
  perform public.celebrity_action(token,rid,secret,'submit',jsonb_build_object('celebrity','Synthetic celebrity for '||(own->>'recipient_name')));
  perform public.celebrity_action(token,rid,secret,'submit',jsonb_build_object('celebrity','Synthetic celebrity for '||(own->>'recipient_name')));
  if public.celebrity_status(token)->>'state'<>(case when i=11 then 'guessing' else 'entering' end) then raise exception 'Premature guessing';end if;
 end loop;
 i=0;
 for p in select value from jsonb_array_elements(s->'players') loop
  i=i+1;secret=current_setting('celeb.secret.p'||replace(p->>'id','-',''));answer=public.celebrity_others(token,rid,secret);
  if jsonb_array_length(answer)<>10 or exists(select 1 from jsonb_array_elements(answer) x where x->>'name'=p->>'name' or x->>'celebrity'='Synthetic celebrity for '||(p->>'name')) then raise exception 'Own celebrity exposed';end if;
  answer=public.celebrity_action(token,rid,secret,'win');if (answer->>'position')::int<>i then raise exception 'Wrong placement';end if;
  if i<11 then answer=public.celebrity_action(token,rid,secret,'win');if (answer->>'position')::int<>i then raise exception 'Repeated win changed placement';end if;end if;
 end loop;
 s=public.celebrity_status(token);if s->>'round_id'=rid::text or (s->>'number')::int<>2 or s->>'state'<>'entering' or s->>'round_id' is null then raise exception 'Next round failed';end if;
 if exists(select 1 from jsonb_array_elements(s->'players') x where (x->>'claimed')::boolean or (x->>'submitted')::boolean or x->>'position' is not null) then raise exception 'Old data carried over';end if;
 perform set_config('celeb.next',s->>'round_id',true);
 if (public.celebrity_action(token,rid,secret,'win')->>'position')::int<>11 then raise exception 'Final win retry changed placement';end if;
 begin perform public.celebrity_action(token,rid,secret,'submit','{"celebrity":"Stale change"}');raise exception 'Stale change accepted';exception when raise_exception then if sqlerrm='Stale change accepted' then raise;end if;end;
 if jsonb_array_length(public.celebrity_player(token,rid,secret)->'placements')<>11 then raise exception 'Archived standings missing';end if;
 if public.celebrity_player(token,rid,secret)->>'phase'<>'completed' then raise exception 'Own last placement missing';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin begin perform public.celebrity_manage('view',current_setting('celeb.game')::uuid);raise exception 'Foreign admin allowed';exception when raise_exception then if sqlerrm='Foreign admin allowed' then raise;end if;end;end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('celeb.owner'),true);
set local role authenticated;
 do $$declare g uuid:=current_setting('celeb.game')::uuid;v jsonb;begin
 v=public.celebrity_manage('view',g);if jsonb_array_length(v->'history')<>1 or jsonb_array_length(v->'history'->0->'placements')<>11 or jsonb_array_length(v->'stats')<11 then raise exception 'Completed stats missing';end if;
 perform public.celebrity_manage('reset',g);v=public.celebrity_manage('view',g);if v->'round'->>'id'=current_setting('celeb.next') or (v->'round'->>'number')::int<>2 or jsonb_array_length(v->'history')<>1 then raise exception 'Entry reset lost history';end if;
 perform set_config('celeb.reset',v->'round'->>'id',true);
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare s jsonb;p jsonb;secret text;token text:=current_setting('celeb.token');rid uuid:=current_setting('celeb.reset')::uuid;begin
 s=public.celebrity_status(token);for p in select value from jsonb_array_elements(s->'players') loop
 secret=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');perform set_config('celeb.reset_player',p->>'id',true);perform set_config('celeb.reset_secret',secret,true);perform public.celebrity_claim(token,rid,(p->>'id')::uuid,secret);perform public.celebrity_action(token,rid,secret,'submit','{"celebrity":"Synthetic reset test"}');end loop;
 if public.celebrity_status(token)->>'state'<>'guessing' then raise exception 'Guessing reset fixture failed';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('celeb.owner'),true);
set local role authenticated;
select public.celebrity_manage('reset_claim',current_setting('celeb.game')::uuid,jsonb_build_object('id',current_setting('celeb.reset_player')));
reset role;
set local role anon;
do $$begin if public.celebrity_player(current_setting('celeb.token'),current_setting('celeb.reset')::uuid,current_setting('celeb.reset_secret')) is not null then raise exception 'Reset secret still valid';end if;end $$;
reset role;
set local role authenticated;
do $$declare g uuid:=current_setting('celeb.game')::uuid;v jsonb;begin
 perform public.celebrity_manage('reset',g);perform public.celebrity_manage('configure',g,'{"notes_enabled":false}');v=public.celebrity_manage('view',g);
 if v->'round'->>'phase'<>'entering' or v->'round'->>'id'=current_setting('celeb.reset') or jsonb_array_length(v->'history')<>1 or (v->'game'->>'notes_enabled')::boolean then raise exception 'Guessing reset/history/notes failed';end if;
 perform public.celebrity_manage('end',g);perform public.celebrity_manage('delete',g);
end $$;
reset role;
set local role anon;
do $$begin if public.celebrity_status(current_setting('celeb.token'))->>'state'<>'unavailable' then raise exception 'Deleted link active';end if;end $$;
reset role;
rollback;
