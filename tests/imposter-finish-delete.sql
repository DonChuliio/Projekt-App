begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
select set_config('dock.test.owner',current_setting('request.jwt.claim.sub'),true);
set local role authenticated;
do $$declare g uuid;v jsonb;i int;begin
 g=(public.imposter_manage('create',null,'{"name":"Synthetic atomic round and delete test"}')->>'id')::uuid;
 for i in 1..6 loop perform public.imposter_manage('player',g,jsonb_build_object('name','Synthetic player '||i));end loop;
 perform public.imposter_manage('configure',g,'{"imposters":2,"expected_players":6}');perform public.imposter_manage('start',g);v=public.imposter_manage('view',g);
 perform set_config('dock.test.game',g::text,true);perform set_config('dock.test.token',v->'game'->>'token',true);
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare token text:=current_setting('dock.test.token');s jsonb;n jsonb;r uuid;h uuid;secret text;othersecret text;begin
 s=public.imposter_status(token);r=(s->>'round_id')::uuid;h=(s->>'host_id')::uuid;secret=public.imposter_claim(token,r,h)->>'secret';
 othersecret=public.imposter_claim(token,r,(select (value->>'id')::uuid from jsonb_array_elements(s->'players') where value->>'id'<>h::text limit 1))->>'secret';
 perform public.imposter_host_action(token,r,secret,'prepare','{"word":"Synthetic word","hint":"Synthetic hint"}');
 begin perform public.imposter_host_action(token,r,othersecret,'finish_next','{"winner":"players"}');raise exception 'Nonhost allowed';exception when raise_exception then if sqlerrm='Nonhost allowed' then raise;end if;end;
 begin perform public.imposter_host_action(token,r,secret,'finish_next','{"winner":"invalid"}');raise exception 'Invalid winner allowed';exception when raise_exception then if sqlerrm='Invalid winner allowed' then raise;end if;end;
 if public.imposter_status(token)->>'state'<>'live' then raise exception 'Invalid action changed round';end if;
 perform public.imposter_host_action(token,r,secret,'finish_next','{"winner":"imposter"}');n=public.imposter_status(token);
 if n->>'round_id'=r::text or n->>'state'<>'choosing' or (n->>'number')::int<>2 or n->>'host_id'=h::text then raise exception 'Atomic next round failed';end if;
 begin perform public.imposter_host_action(token,r,secret,'finish_next','{"winner":"players"}');raise exception 'Duplicate allowed';exception when raise_exception then if sqlerrm='Duplicate allowed' then raise;end if;end;
 begin perform public.imposter_manage('delete',current_setting('dock.test.game')::uuid);raise exception 'Anonymous delete allowed';exception when insufficient_privilege then null;when raise_exception then if sqlerrm='Anonymous delete allowed' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin
 begin perform public.imposter_manage('delete',current_setting('dock.test.game')::uuid);raise exception 'Foreign delete allowed';exception when raise_exception then if sqlerrm='Foreign delete allowed' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('dock.test.owner'),true);
set local role authenticated;
do $$declare g uuid:=current_setting('dock.test.game')::uuid;v jsonb;begin
 v=public.imposter_manage('view',g);if jsonb_array_length(v->'history')<>1 or v->'history'->0->>'winner'<>'imposter' then raise exception 'Winner history missing';end if;
 perform public.imposter_manage('delete',g);
 g=(public.imposter_manage('create',null,'{"name":"Synthetic draft delete"}')->>'id')::uuid;perform public.imposter_manage('delete',g);
end $$;
reset role;
do $$declare g uuid:=current_setting('dock.test.game')::uuid;begin
 if exists(select 1 from dock_game.games where id=g) or exists(select 1 from dock_game.players where game_id=g) or exists(select 1 from dock_game.rounds where game_id=g) or exists(select 1 from dock_game.sessions where game_id=g) then raise exception 'Cascade incomplete';end if;
 if public.imposter_status(current_setting('dock.test.token'))->>'state'<>'unavailable' then raise exception 'Deleted link alive';end if;
end $$;
rollback;
