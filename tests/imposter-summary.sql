begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
select set_config('dock.summary.owner',current_setting('request.jwt.claim.sub'),true);
set local role authenticated;
do $$declare g uuid;v jsonb;i int;begin
 g=(public.imposter_manage('create',null,'{"name":"Synthetic summary test"}')->>'id')::uuid;
 for i in 1..6 loop perform public.imposter_manage('player',g,jsonb_build_object('name','Synthetic player '||i));end loop;
 perform public.imposter_manage('configure',g,'{"imposters":2,"expected_players":6}');perform public.imposter_manage('start',g);v=public.imposter_manage('view',g);
 perform set_config('dock.summary.game',g::text,true);perform set_config('dock.summary.token',v->'game'->>'token',true);
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare token text:=current_setting('dock.summary.token');s jsonb;credential text;p jsonb;hostsecret text;i int;begin
 s=public.imposter_status(token);
 for p in select value from jsonb_array_elements(s->'players') loop
  credential=public.imposter_claim(token,(s->>'round_id')::uuid,(p->>'id')::uuid)->>'secret';
  perform set_config('dock.summary.secret.p'||replace(p->>'id','-',''),credential,true);perform set_config('dock.summary.any_secret',credential,true);
  if public.imposter_personal_summary(token,credential) is not null then raise exception 'Active summary leaked';end if;
 end loop;
 for i in 1..4 loop
  s=public.imposter_status(token);hostsecret=current_setting('dock.summary.secret.p'||replace(s->>'host_id','-',''));
  perform public.imposter_host_action(token,(s->>'round_id')::uuid,hostsecret,'prepare','{"word":"Synthetic word"}');
  perform public.imposter_host_action(token,(s->>'round_id')::uuid,hostsecret,'finish_next',jsonb_build_object('winner',case when i<=2 then 'imposter' else 'players' end));
 end loop;
 -- Round five remains unprepared: its randomly assigned roles must not count.
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('dock.summary.owner'),true);
set local role authenticated;
select public.imposter_manage('end',current_setting('dock.summary.game')::uuid);
reset role;
do $$declare token text:=current_setting('dock.summary.token');g uuid:=current_setting('dock.summary.game')::uuid;p record;v jsonb;expected_rounds int;expected_wins int;begin
 for p in select * from dock_game.players where game_id=g loop
  select count(*),count(*) filter(where r.winner='imposter') into expected_rounds,expected_wins from dock_game.roles a join dock_game.rounds r on r.id=a.round_id where r.game_id=g and a.player_id=p.id and a.is_imposter and r.word is not null;
  perform set_config('dock.summary.expected.name',p.name,true);perform set_config('dock.summary.expected.rounds',expected_rounds::text,true);perform set_config('dock.summary.expected.wins',expected_wins::text,true);
  execute 'set local role anon';
  v=public.imposter_personal_summary(token,current_setting('dock.summary.secret.p'||replace(p.id::text,'-','')));
  if v is null or v->>'name'<>current_setting('dock.summary.expected.name') or (v->>'imposter_rounds')::int<>current_setting('dock.summary.expected.rounds')::int or (v->>'imposter_wins')::int<>current_setting('dock.summary.expected.wins')::int then raise exception 'Wrong own summary';end if;
  if v ? 'word' or v ? 'players' or v ? 'secret' or v ? 'roles' then raise exception 'Unneeded data leak';end if;
  execute 'reset role';
 end loop;
end $$;
set local role anon;
do $$begin
 if public.imposter_personal_summary(current_setting('dock.summary.token'),'wrong') is not null or public.imposter_personal_summary('wrong',current_setting('dock.summary.any_secret')) is not null or public.imposter_personal_summary(current_setting('dock.summary.token'),null) is not null then raise exception 'Invalid credential accepted';end if;
 if public.imposter_status(current_setting('dock.summary.token'))->>'state'<>'unavailable' then raise exception 'Ended link reactivated';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('dock.summary.owner'),true);
set local role authenticated;
select public.imposter_manage('delete',current_setting('dock.summary.game')::uuid);
reset role;
do $$begin if exists(select 1 from dock_game.games where id=current_setting('dock.summary.game')::uuid) then raise exception 'Delete failed';end if;if public.imposter_personal_summary(current_setting('dock.summary.token'),'anything') is not null then raise exception 'Deleted game summary';end if;end $$;
rollback;
