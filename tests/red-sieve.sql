-- Synthetic fixtures only; no live games are modified. Every change rolls back.
begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
select set_config('sieve.owner',current_setting('request.jwt.claim.sub'),true);
set local role authenticated;
do $$declare g uuid;v jsonb;i int;begin
 g=(public.sieve_manage('create',null,'{"name":"Synthetic Rotes Sieb"}')->>'id')::uuid;
 begin perform public.sieve_manage('start',g);raise exception 'Too few players accepted';exception when raise_exception then if sqlerrm='Too few players accepted' then raise;end if;end;
 for i in 1..4 loop perform public.sieve_manage('player',g,jsonb_build_object('name','Synthetic sieve player '||i));end loop;
 begin perform public.sieve_manage('configure',g,'{"words_per_player":0,"category_count":5,"joker_limit":-1}');raise exception 'Bad configuration accepted';exception when check_violation then null;end;
 perform public.sieve_manage('configure',g,'{"words_per_player":2,"category_count":4,"joker_limit":2}');perform public.sieve_manage('start',g);v=public.sieve_manage('view',g);
 perform set_config('sieve.game',g::text,true);perform set_config('sieve.token',v->'game'->>'token',true);
 begin perform public.sieve_manage('player',g,'{"name":"Late player"}');raise exception 'Late player accepted';exception when raise_exception then if sqlerrm='Late player accepted' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare v jsonb;p jsonb;i int:=0;secret text;operation uuid;begin
 begin perform public.sieve_manage('list');raise exception 'Anonymous admin allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from dock_sieve.words;raise exception 'Direct words allowed';exception when insufficient_privilege then null;end;
 begin perform dock_sieve.next_turn(current_setting('sieve.game')::uuid,'A');raise exception 'Private helper allowed';exception when insufficient_privilege then null;end;
 v=public.sieve_status(current_setting('sieve.token'));
 for p in select value from jsonb_array_elements(v->'players') loop
  i=i+1;secret=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');perform set_config('sieve.secret.p'||replace(p->>'id','-',''),secret,true);
  perform public.sieve_claim(current_setting('sieve.token'),(p->>'id')::uuid,secret);perform public.sieve_claim(current_setting('sieve.token'),(p->>'id')::uuid,secret);
  begin perform public.sieve_claim(current_setting('sieve.token'),(p->>'id')::uuid,repeat('0',64));raise exception 'Duplicate claim accepted';exception when raise_exception then if sqlerrm='Duplicate claim accepted' then raise;end if;end;
  begin perform public.sieve_action(current_setting('sieve.token'),secret,gen_random_uuid(),'submit','{"words":["one"]}');raise exception 'Wrong word count accepted';exception when raise_exception then if sqlerrm='Wrong word count accepted' then raise;end if;end;
  operation=gen_random_uuid();perform public.sieve_action(current_setting('sieve.token'),secret,operation,'submit',jsonb_build_object('words',jsonb_build_array('synthetic-private-'||i||'-1','synthetic-private-'||i||'-2')));
  perform public.sieve_action(current_setting('sieve.token'),secret,operation,'submit',jsonb_build_object('words',jsonb_build_array('synthetic-private-'||i||'-1','synthetic-private-'||i||'-2')));
  if i<4 then perform public.sieve_action(current_setting('sieve.token'),secret,gen_random_uuid(),'submit',jsonb_build_object('words',jsonb_build_array('synthetic-private-'||i||'-1','synthetic-private-'||i||'-2')));end if;
  if public.sieve_status(current_setting('sieve.token'))->>'phase'<>(case when i=4 then 'playing' else 'collecting' end) then raise exception 'Premature teams';end if;
 end loop;
 v=public.sieve_status(current_setting('sieve.token'));if v::text like '%synthetic-private-%' then raise exception 'Status leaked words';end if;
 if (select count(*) from jsonb_array_elements(v->'players') member where member->>'team'='A')<>2 or (select count(*) from jsonb_array_elements(v->'players') member where member->>'team'='B')<>2 then raise exception 'Teams not balanced';end if;
 perform set_config('sieve.initial_team',v->'turn'->>'team',true);
end $$;
reset role;
do $$begin if (select count(*) from dock_sieve.words where game_id=current_setting('sieve.game')::uuid)<>8 then raise exception 'Duplicate input words';end if;end $$;
set local role anon;
do $$declare token text:=current_setting('sieve.token');v jsonb;t jsonb;secret text;other_secret text;op uuid;args jsonb;answer jsonb;first_word text;deadline numeric;begin
 v=public.sieve_status(token);t=v->'turn';secret=current_setting('sieve.secret.p'||replace(t->>'player_id','-',''));select current_setting('sieve.secret.p'||replace(p->>'id','-','')) into other_secret from jsonb_array_elements(v->'players') p where p->>'id'<>t->>'player_id' limit 1;
 args=jsonb_build_object('turn_id',t->>'id','word_number',1);
 begin perform public.sieve_word(token,secret,(t->>'id')::uuid,1);raise exception 'Pre-start word leaked';exception when raise_exception then if sqlerrm='Pre-start word leaked' then raise;end if;end;
 begin perform public.sieve_action(token,other_secret,gen_random_uuid(),'confirm',args);raise exception 'Foreign turn control allowed';exception when raise_exception then if sqlerrm='Foreign turn control allowed' then raise;end if;end;
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'start',args);raise exception 'Unconfirmed start allowed';exception when raise_exception then if sqlerrm='Unconfirmed start allowed' then raise;end if;end;
 perform public.sieve_action(token,secret,gen_random_uuid(),'confirm',args);op=gen_random_uuid();perform public.sieve_action(token,secret,op,'start',args);deadline=(public.sieve_status(token)->'turn'->>'deadline')::numeric;perform public.sieve_action(token,secret,op,'start',args);
 if (public.sieve_status(token)->'turn'->>'deadline')::numeric<>deadline then raise exception 'Retry restarted timer';end if;
 v=public.sieve_status(token);if deadline-(v->>'server_now')::numeric not between 59000 and 60000 then raise exception 'Timer not server 60 seconds';end if;
 answer=public.sieve_word(token,secret,(t->>'id')::uuid,1);if answer->>'word' not like 'synthetic-private-%' then raise exception 'Active word missing';end if;
 begin perform public.sieve_word(token,other_secret,(t->>'id')::uuid,1);raise exception 'Inactive word leaked';exception when raise_exception then if sqlerrm='Inactive word leaked' then raise;end if;end;
 op=gen_random_uuid();perform public.sieve_action(token,secret,op,'solve',args);perform public.sieve_action(token,secret,op,'solve',args);
 if (public.sieve_status(token)->'turn'->>'word_number')::int<>2 or (public.sieve_status(token)->>'remaining')::int<>7 then raise exception 'Solve retry counted twice';end if;
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'solve',args);raise exception 'Stale solve advanced';exception when raise_exception then if sqlerrm='Stale solve advanced' then raise;end if;end;
 begin perform public.sieve_action(token,secret,op,'joker',args);raise exception 'Operation reused with different action';exception when raise_exception then if sqlerrm='Operation reused with different action' then raise;end if;end;
 args=jsonb_build_object('turn_id',t->>'id','word_number',2);first_word=public.sieve_word(token,secret,(t->>'id')::uuid,2)->>'word';op=gen_random_uuid();perform public.sieve_action(token,secret,op,'joker',args);perform public.sieve_action(token,secret,op,'joker',args);
 if public.sieve_word(token,secret,(t->>'id')::uuid,3)->>'word'=first_word then raise exception 'Joker repeated current word';end if;
 args=jsonb_build_object('turn_id',t->>'id','word_number',3);perform public.sieve_action(token,secret,gen_random_uuid(),'joker',args);
 args=jsonb_build_object('turn_id',t->>'id','word_number',4);begin perform public.sieve_action(token,secret,gen_random_uuid(),'joker',args);raise exception 'Exhausted joker accepted';exception when raise_exception then if sqlerrm='Exhausted joker accepted' then raise;end if;end;
 if (public.sieve_status(token)->>'remaining')::int<>7 then raise exception 'Joker removed word';end if;
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'pass',args);raise exception 'Early pass allowed';exception when raise_exception then if sqlerrm='Early pass allowed' then raise;end if;end;
 perform set_config('sieve.expired_turn',t->>'id',true);perform set_config('sieve.actor_secret',secret,true);
end $$;
reset role;
update dock_sieve.turns set deadline=clock_timestamp()-interval '1 second' where id=current_setting('sieve.expired_turn')::uuid;
set local role anon;
do $$declare token text:=current_setting('sieve.token');secret text:=current_setting('sieve.actor_secret');tid uuid:=current_setting('sieve.expired_turn')::uuid;args jsonb:=jsonb_build_object('turn_id',tid,'word_number',4);op uuid:=gen_random_uuid();v jsonb;begin
 if public.sieve_status(token)->'turn'->>'phase'<>'expired' then raise exception 'Expired status missing';end if;
 begin perform public.sieve_word(token,secret,tid,4);raise exception 'Expired word leaked';exception when raise_exception then if sqlerrm='Expired word leaked' then raise;end if;end;
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'solve',args);raise exception 'Expired solve accepted';exception when raise_exception then if sqlerrm='Expired solve accepted' then raise;end if;end;
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'joker',args);raise exception 'Expired joker accepted';exception when raise_exception then if sqlerrm='Expired joker accepted' then raise;end if;end;
 perform public.sieve_action(token,secret,op,'pass',args);perform public.sieve_action(token,secret,op,'pass',args);v=public.sieve_status(token);
 if v->'turn'->>'team'=current_setting('sieve.initial_team') or v->'turn'->>'phase'<>'pending' or (v->'turn'->>'word_number')::int<>1 or v->'turn'->>'deadline' is not null then raise exception 'Pass failed team/number/manual start';end if;
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'last',args);raise exception 'Second expiry decision accepted';exception when raise_exception then if sqlerrm='Second expiry decision accepted' then raise;end if;end;
end $$;
reset role;
-- Deadline changes below are restricted to this rollback-only synthetic game.
do $$declare token text:=current_setting('sieve.token');gid uuid:=current_setting('sieve.game')::uuid;v jsonb;t jsonb;args jsonb;secret text;previous_team text;team text;op uuid;cat int;i int;total int;begin
 previous_team=current_setting('sieve.initial_team');
 for i in 1..12 loop
  v=public.sieve_status(token);t=v->'turn';if t->>'team'=previous_team then raise exception 'Turn team did not alternate';end if;previous_team=t->>'team';secret=current_setting('sieve.secret.p'||replace(t->>'player_id','-',''));args=jsonb_build_object('turn_id',t->>'id','word_number',t->>'word_number');
  perform public.sieve_action(token,secret,gen_random_uuid(),'confirm',args);perform public.sieve_action(token,secret,gen_random_uuid(),'start',args);
  if exists(select 1 from dock_sieve.players member where member.game_id=gid group by member.team having max(member.turns_started)-min(member.turns_started)>1) then raise exception 'Unfair repeated player';end if;
  update dock_sieve.turns set deadline=clock_timestamp()-interval '1 second' where id=(t->>'id')::uuid;perform public.sieve_action(token,secret,gen_random_uuid(),'pass',args);
 end loop;
 -- Opposite team solves four; initial team then solves the remaining three: 4:4 tie.
 for i in 1..2 loop
  v=public.sieve_status(token);t=v->'turn';secret=current_setting('sieve.secret.p'||replace(t->>'player_id','-',''));args=jsonb_build_object('turn_id',t->>'id','word_number',1);perform public.sieve_action(token,secret,gen_random_uuid(),'confirm',args);perform public.sieve_action(token,secret,gen_random_uuid(),'start',args);
  for total in 1..(case when i=1 then 4 else 3 end) loop t=public.sieve_status(token)->'turn';args=jsonb_build_object('turn_id',t->>'id','word_number',t->>'word_number');perform public.sieve_action(token,secret,gen_random_uuid(),'solve',args);end loop;
  if i=1 then t=public.sieve_status(token)->'turn';args=jsonb_build_object('turn_id',t->>'id','word_number',t->>'word_number');update dock_sieve.turns set deadline=clock_timestamp()-interval '1 second' where id=(t->>'id')::uuid;perform public.sieve_action(token,secret,gen_random_uuid(),'pass',args);end if;
 end loop;
 v=public.sieve_status(token);if v->>'phase'<>'category_done' or v->'turn'<>'null'::jsonb then raise exception 'Immediate category finish failed';end if;
 if not exists(select 1 from dock_sieve.categories where game_id=gid and number=1 and words_a=4 and words_b=4 and jokers_a+jokers_b=2 and bonus_a+bonus_b=1 and (case when current_setting('sieve.initial_team')='A' then bonus_b else bonus_a end)=1) then raise exception 'Tie/joker bonus incorrect';end if;
 previous_team=current_setting('sieve.initial_team');
 for cat in 2..4 loop
  op=gen_random_uuid();perform public.sieve_action(token,secret,op,'next_category',jsonb_build_object('category',cat-1));perform public.sieve_action(token,secret,op,'next_category',jsonb_build_object('category',cat-1));v=public.sieve_status(token);t=v->'turn';team=t->>'team';if team=previous_team then raise exception 'Category start did not alternate';end if;previous_team=team;
  if (v->>'remaining')::int<>8 or (select count(*) from dock_sieve.deck where game_id=gid and category=cat)<>8 then raise exception 'Original pool not reused';end if;
  if exists(select 1 from dock_sieve.categories where game_id=gid and number=cat and jokers_a+jokers_b<>0) then raise exception 'Jokers not reset';end if;
  secret=current_setting('sieve.secret.p'||replace(t->>'player_id','-',''));args=jsonb_build_object('turn_id',t->>'id','word_number',1);perform public.sieve_action(token,secret,gen_random_uuid(),'confirm',args);perform public.sieve_action(token,secret,gen_random_uuid(),'start',args);
  perform public.sieve_action(token,secret,gen_random_uuid(),'joker',args);
  for i in 1..8 loop t=public.sieve_status(token)->'turn';args=jsonb_build_object('turn_id',t->>'id','word_number',t->>'word_number');op=gen_random_uuid();perform public.sieve_action(token,secret,op,'solve',args);end loop;
 end loop;
 perform public.sieve_action(token,secret,op,'solve',args);v=public.sieve_status(token);
 if v->>'phase'<>'finished' or v->>'state'<>'finished' or jsonb_array_length(v->'categories')<>4 or v::text like '%synthetic-private-%' then raise exception 'Final result/link/privacy failed';end if;
 if (select sum(words_a+words_b+bonus_a+bonus_b) from dock_sieve.categories where game_id=gid)<>33 then raise exception 'Final total incorrect';end if;
 if (select count(distinct word_id) from dock_sieve.deck where game_id=gid)<>8 or (select count(*) from dock_sieve.deck where game_id=gid)<>32 then raise exception 'Pool changed across categories';end if;
end $$;
-- Dedicated last-counts and last-word-joker edge case; only synthetic records are altered.
do $$declare gid uuid:=current_setting('sieve.game')::uuid;rid uuid;token text:=current_setting('sieve.token');t jsonb;secret text;args jsonb;begin
 update dock_sieve.games set state='active',phase='playing',category=4 where id=gid;update dock_sieve.categories set completed=false,words_a=7,words_b=0,jokers_a=0,jokers_b=0,bonus_a=0,bonus_b=0 where game_id=gid and number=4;
 update dock_sieve.deck set solved_by='A' where game_id=gid and category=4;select word_id into rid from dock_sieve.deck where game_id=gid and category=4 limit 1;update dock_sieve.deck set solved_by=null where game_id=gid and category=4 and word_id=rid;perform dock_sieve.next_turn(gid,'A');t=public.sieve_status(token)->'turn';secret=current_setting('sieve.secret.p'||replace(t->>'player_id','-',''));args=jsonb_build_object('turn_id',t->>'id','word_number',1);perform public.sieve_action(token,secret,gen_random_uuid(),'confirm',args);perform public.sieve_action(token,secret,gen_random_uuid(),'start',args);
 begin perform public.sieve_action(token,secret,gen_random_uuid(),'joker',args);raise exception 'Only-word joker accepted';exception when raise_exception then if sqlerrm='Only-word joker accepted' then raise;end if;end;
 if (select jokers_a from dock_sieve.categories where game_id=gid and number=4)<>0 then raise exception 'Failed joker consumed quota';end if;
 update dock_sieve.turns set deadline=clock_timestamp()-interval '1 second' where id=(t->>'id')::uuid;perform public.sieve_action(token,secret,gen_random_uuid(),'last',args);if public.sieve_status(token)->>'state'<>'finished' or (select words_a from dock_sieve.categories where game_id=gid and number=4)<>8 then raise exception 'Last word not counted';end if;
 update dock_sieve.games set state='active',phase='playing' where id=gid;update dock_sieve.categories set completed=false,words_a=4,words_b=4,jokers_a=1,jokers_b=4 where game_id=gid and number=4;perform dock_sieve.finish_category(gid);if (select bonus_a from dock_sieve.categories where game_id=gid and number=4)<>1 or (select bonus_b from dock_sieve.categories where game_id=gid and number=4)<>0 then raise exception 'Joker difference awarded more than one bonus';end if;
 -- Equal word/joker totals: no bonus. Unequal word totals: no bonus regardless of joker totals.
 update dock_sieve.games set state='active',phase='playing' where id=gid;update dock_sieve.categories set completed=false,words_a=4,words_b=4,jokers_a=1,jokers_b=1 where game_id=gid and number=4;perform dock_sieve.finish_category(gid);if (select bonus_a+bonus_b from dock_sieve.categories where game_id=gid and number=4)<>0 then raise exception 'Equal jokers awarded bonus';end if;
 update dock_sieve.games set state='active',phase='playing' where id=gid;update dock_sieve.categories set completed=false,words_a=5,words_b=3,jokers_a=4,jokers_b=0 where game_id=gid and number=4;perform dock_sieve.finish_category(gid);if (select bonus_a+bonus_b from dock_sieve.categories where game_id=gid and number=4)<>0 then raise exception 'Non-tie awarded bonus';end if;
end $$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
set local role authenticated;
do $$begin begin perform public.sieve_manage('view',current_setting('sieve.game')::uuid);raise exception 'Foreign admin allowed';exception when raise_exception then if sqlerrm='Foreign admin allowed' then raise;end if;end;end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('sieve.owner'),true);
set local role authenticated;
select public.sieve_manage('reset_claim',current_setting('sieve.game')::uuid,jsonb_build_object('id',(public.sieve_manage('view',current_setting('sieve.game')::uuid)->'players'->0->>'id')));
select public.sieve_manage('delete',current_setting('sieve.game')::uuid);
reset role;
set local role anon;
do $$begin if public.sieve_status(current_setting('sieve.token'))->>'state'<>'unavailable' then raise exception 'Deleted link still active';end if;end $$;
reset role;
rollback;
