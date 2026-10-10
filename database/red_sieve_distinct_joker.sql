-- A Joker requires a different term, even if players entered identical words.
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
   if t.phase='confirmed' then update dock_sieve.turns set phase='running',deadline=clock_timestamp()+interval '60 seconds' where id=t.id;update dock_sieve.players set turns_started=turns_started+1 where id=p.id;elsif t.phase<>'running' then raise exception 'Zuerst Ich bin dran bestätigen';end if;
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

