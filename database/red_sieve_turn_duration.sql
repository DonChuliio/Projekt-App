-- Existing games retain 60 seconds; running deadlines remain unchanged.
alter table dock_sieve.games add column turn_seconds int not null default 60 check(turn_seconds between 10 and 300);

create or replace function dock_sieve.status(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'phase',g.phase,'words_per_player',g.words_per_player,'category_count',g.category_count,'joker_limit',g.joker_limit,'turn_seconds',g.turn_seconds,'category',g.category,'server_now',extract(epoch from clock_timestamp())*1000,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'team',p.team,'submitted',p.submitted,'claimed',exists(select 1 from dock_sieve.claims c where c.game_id=g.id and c.player_id=p.id)) order by p.created_at,p.id) from dock_sieve.players p where p.game_id=g.id),'[]'),
 'turn',(select jsonb_build_object('id',t.id,'team',t.team,'player_id',t.player_id,'name',p.name,'phase',case when t.phase='running' and t.deadline<=clock_timestamp() then 'expired' else t.phase end,'word_number',t.word_number,'deadline',extract(epoch from t.deadline)*1000) from dock_sieve.turns t join dock_sieve.players p on p.id=t.player_id where t.id=g.current_turn),
 'remaining',(select count(*) from dock_sieve.deck where game_id=g.id and category=g.category and solved_by is null),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('number',c.number,'start_team',c.start_team,'completed',c.completed,'words_a',c.words_a,'words_b',c.words_b,'jokers_a',c.jokers_a,'jokers_b',c.jokers_b,'bonus_a',c.bonus_a,'bonus_b',c.bonus_b) order by c.number) from dock_sieve.categories c where c.game_id=g.id),'[]'))
 from dock_sieve.games g where g.token=p_token and g.state in('active','finished');
$$;

create or replace function dock_sieve.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return jsonb_build_object('games',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'state',state) order by created_at desc) from dock_sieve.games where owner_id=auth.uid()),'[]'));end if;
 if p_action='create' then insert into dock_sieve.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning id into p_game;return jsonb_build_object('id',p_game);end if;
 select * into g from dock_sieve.games where id=p_game and owner_id=auth.uid() for update;if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'token',g.token,'words_per_player',g.words_per_player,'category_count',g.category_count,'joker_limit',g.joker_limit,'turn_seconds',g.turn_seconds),'status',dock_sieve.status(g.token),'results',coalesce((select jsonb_agg(jsonb_build_object('number',number,'completed',completed,'words_a',words_a,'words_b',words_b,'jokers_a',jokers_a,'jokers_b',jokers_b,'bonus_a',bonus_a,'bonus_b',bonus_b) order by number) from dock_sieve.categories where game_id=g.id and completed),'[]'),'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'claimed',exists(select 1 from dock_sieve.claims c where c.game_id=g.id and c.player_id=p.id)) order by created_at,id) from dock_sieve.players p where game_id=g.id),'[]'));
 elsif p_action in('player','delete_player','configure','start') then
  if g.state<>'draft' then raise exception 'Konfiguration nach Spielstart gesperrt';end if;
  if p_action='player' then if (select count(*) from dock_sieve.players where game_id=g.id)>=100 then raise exception 'Maximal 100 Spieler';end if;insert into dock_sieve.players(game_id,name) values(g.id,trim(p_data->>'name'));
  elsif p_action='delete_player' then delete from dock_sieve.players where game_id=g.id and id=(p_data->>'id')::uuid;
  elsif p_action='configure' then update dock_sieve.games set words_per_player=(p_data->>'words_per_player')::int,category_count=(p_data->>'category_count')::int,joker_limit=(p_data->>'joker_limit')::int,turn_seconds=coalesce((p_data->>'turn_seconds')::int,g.turn_seconds) where id=g.id;
  else if (select count(*) from dock_sieve.players where game_id=g.id)<4 then raise exception 'Mindestens vier Spieler für zwei Teams erforderlich';end if;update dock_sieve.games set state='active',token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') where id=g.id;end if;
 elsif p_action='reset_claim' then delete from dock_sieve.claims where game_id=g.id and player_id=(p_data->>'id')::uuid;
 elsif p_action='end' then update dock_sieve.games set state='ended',current_turn=null where id=g.id;update dock_sieve.turns set phase='closed' where game_id=g.id and phase<>'closed';
 elsif p_action='delete' then delete from dock_sieve.games where id=g.id;
 else raise exception 'Unbekannte Aktion';end if;return jsonb_build_object('ok',true);
end $$;

create or replace function dock_sieve.action(p_token text,p_secret text,p_operation uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;p dock_sieve.players;t dock_sieve.turns;c dock_sieve.categories;old dock_sieve.receipts;signature text;wid uuid;ids uuid[];i int;n int;items jsonb;begin
 select * into g from dock_sieve.games where token=p_token and state in('active','finished') for update;if not found then raise exception 'Spiel nicht aktiv';end if;
 select player.* into p from dock_sieve.claims claim join dock_sieve.players player on player.id=claim.player_id where claim.game_id=g.id and claim.secret=p_secret;if not found then raise exception 'Name nicht mehr zugeordnet';end if;
 if p_operation is null then raise exception 'Aktion ungültig';end if;signature=md5(p_action||':'||coalesce(p_data::text,'null'));
 select * into old from dock_sieve.receipts where game_id=g.id and operation_id=p_operation;if found then if old.player_id<>p.id or old.signature<>signature then raise exception 'Aktionskennung bereits verwendet';end if;return old.response;end if;
 if g.state<>'active' then raise exception 'Spiel bereits abgeschlossen';end if;
 if p_action='submit' then
  if g.phase<>'collecting' then raise exception 'Worteingabe beendet';end if;
  items=p_data->'words';if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items)<>g.words_per_player then raise exception 'Genau % Wörter eingeben',g.words_per_player;end if;
  for i in 0..g.words_per_player-1 loop if jsonb_typeof(items->i) is distinct from 'string' or length(trim(items->>i)) not between 1 and 120 then raise exception 'Jedes Wort muss 1 bis 120 Zeichen enthalten';end if;end loop;
  if p.submitted then if (select jsonb_agg(word order by slot) from dock_sieve.words where game_id=g.id and player_id=p.id)<>(select jsonb_agg(trim(value #>> '{}')) from jsonb_array_elements(items)) then raise exception 'Wörter bereits bestätigt';end if;
  else for i in 0..g.words_per_player-1 loop insert into dock_sieve.words(game_id,player_id,slot,word) values(g.id,p.id,i+1,trim(items->>i));end loop;update dock_sieve.players set submitted=true where id=p.id;end if;
  if not exists(select 1 from dock_sieve.players where game_id=g.id and not submitted) then
   select array_agg(id order by random()) into ids from dock_sieve.players where game_id=g.id;n=array_length(ids,1);for i in 1..n loop update dock_sieve.players set team=case when i<=n/2 then 'A' else 'B' end where id=ids[i];end loop;perform dock_sieve.begin_category(g.id,1);
  end if;
 elsif p_action='next_category' then
  if g.phase<>'category_done' or (p_data->>'category')::int is distinct from g.category then raise exception 'Kategorie bereits gewechselt oder nicht beendet';end if;perform dock_sieve.begin_category(g.id,g.category+1);
 else
  if g.phase<>'playing' or (p_data->>'turn_id')::uuid is distinct from g.current_turn then raise exception 'Zug bereits gewechselt';end if;
  select * into t from dock_sieve.turns where id=g.current_turn;select * into c from dock_sieve.categories where game_id=g.id and number=g.category;
  if t.player_id<>p.id then raise exception 'Nur aktive Person darf diesen Zug steuern';end if;
  if p_action='confirm' then if t.phase='pending' then update dock_sieve.turns set phase='confirmed' where id=t.id;elsif t.phase<>'confirmed' then raise exception 'Zug bereits gestartet';end if;
  elsif p_action='start' then
   if t.phase in('pending','confirmed') then update dock_sieve.turns set phase='running',deadline=clock_timestamp()+make_interval(secs=>g.turn_seconds) where id=t.id;update dock_sieve.players set turns_started=turns_started+1 where id=p.id;elsif t.phase<>'running' then raise exception 'Zug nicht mehr startbar';end if;
  elsif p_action in('solve','joker','last','pass') then
   if t.phase<>'running' or (p_data->>'word_number')::int is distinct from t.word_number then raise exception 'Wort oder Zug bereits gewechselt';end if;
   if p_action in('solve','joker') and t.deadline<=clock_timestamp() then raise exception 'Zeit abgelaufen';end if;
   if p_action in('last','pass') and t.deadline>clock_timestamp() then raise exception 'Zeit noch nicht abgelaufen';end if;
   if p_action='joker' then
    if (case when t.team='A' then c.jokers_a else c.jokers_b end)>=g.joker_limit then raise exception 'Keine Joker mehr verfügbar';end if;
    select d.word_id into wid from dock_sieve.deck d join dock_sieve.words alternative on alternative.id=d.word_id join dock_sieve.words current_word on current_word.id=t.word_id where d.game_id=g.id and d.category=g.category and d.solved_by is null and d.word_id<>t.word_id and lower(alternative.word)<>lower(current_word.word) order by random() limit 1;if wid is null then raise exception 'Kein anderes ungelöstes Wort verfügbar';end if;
    update dock_sieve.categories set jokers_a=jokers_a+case when t.team='A' then 1 else 0 end,jokers_b=jokers_b+case when t.team='B' then 1 else 0 end where game_id=g.id and number=g.category;
    update dock_sieve.turns set word_id=wid,word_number=word_number+1 where id=t.id;
   else
    if p_action in('solve','last') then
     update dock_sieve.deck set solved_by=t.team where game_id=g.id and category=g.category and word_id=t.word_id and solved_by is null;if not found then raise exception 'Wort bereits gelöst';end if;
     update dock_sieve.categories set words_a=words_a+case when t.team='A' then 1 else 0 end,words_b=words_b+case when t.team='B' then 1 else 0 end where game_id=g.id and number=g.category;
    end if;
    if not exists(select 1 from dock_sieve.deck where game_id=g.id and category=g.category and solved_by is null) then perform dock_sieve.finish_category(g.id);
    elsif p_action='solve' then select word_id into wid from dock_sieve.deck where game_id=g.id and category=g.category and solved_by is null order by random() limit 1;update dock_sieve.turns set word_id=wid,word_number=word_number+1 where id=t.id;
    else update dock_sieve.turns set phase='closed' where id=t.id;perform dock_sieve.next_turn(g.id,case when t.team='A' then 'B' else 'A' end);end if;
   end if;
  else raise exception 'Unbekannte Aktion';end if;
 end if;
 insert into dock_sieve.receipts(game_id,operation_id,player_id,signature,response) values(g.id,p_operation,p.id,signature,'{"ok":true}');return jsonb_build_object('ok',true);
end $$;
