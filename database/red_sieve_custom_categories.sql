-- Preserve existing category names/order and results; settings remain draft-only.
alter table dock_sieve.games add column category_names text[] default array['Erklären','Ein Wort','Pantomime','Geräusche'];
update dock_sieve.games set category_names=category_names[1:category_count];
alter table dock_sieve.games alter column category_names set not null;
alter table dock_sieve.games add constraint games_category_names_check check(cardinality(category_names)=category_count and array_position(category_names,null) is null);

create or replace function dock_sieve.status(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'phase',g.phase,'words_per_player',g.words_per_player,'category_count',g.category_count,'category_names',g.category_names,'joker_limit',g.joker_limit,'turn_seconds',g.turn_seconds,'category',g.category,'server_now',extract(epoch from clock_timestamp())*1000,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'team',p.team,'submitted',p.submitted,'claimed',exists(select 1 from dock_sieve.claims c where c.game_id=g.id and c.player_id=p.id)) order by p.created_at,p.id) from dock_sieve.players p where p.game_id=g.id),'[]'),
 'turn',(select jsonb_build_object('id',t.id,'team',t.team,'player_id',t.player_id,'name',p.name,'phase',case when t.phase='running' and t.deadline<=clock_timestamp() then 'expired' else t.phase end,'word_number',t.word_number,'deadline',extract(epoch from t.deadline)*1000) from dock_sieve.turns t join dock_sieve.players p on p.id=t.player_id where t.id=g.current_turn),
 'remaining',(select count(*) from dock_sieve.deck where game_id=g.id and category=g.category and solved_by is null),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('number',c.number,'name',g.category_names[c.number],'start_team',c.start_team,'completed',c.completed,'words_a',c.words_a,'words_b',c.words_b,'jokers_a',c.jokers_a,'jokers_b',c.jokers_b,'bonus_a',c.bonus_a,'bonus_b',c.bonus_b) order by c.number) from dock_sieve.categories c where c.game_id=g.id),'[]'))
 from dock_sieve.games g where g.token=p_token and g.state in('active','finished');
$$;

create or replace function dock_sieve.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;names text[];count_categories int;begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return jsonb_build_object('games',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'state',state) order by created_at desc) from dock_sieve.games where owner_id=auth.uid()),'[]'));end if;
 if p_action='create' then insert into dock_sieve.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning id into p_game;return jsonb_build_object('id',p_game);end if;
 select * into g from dock_sieve.games where id=p_game and owner_id=auth.uid() for update;if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'token',g.token,'words_per_player',g.words_per_player,'category_count',g.category_count,'category_names',g.category_names,'joker_limit',g.joker_limit,'turn_seconds',g.turn_seconds),'status',dock_sieve.status(g.token),'results',coalesce((select jsonb_agg(jsonb_build_object('number',number,'name',g.category_names[number],'completed',completed,'words_a',words_a,'words_b',words_b,'jokers_a',jokers_a,'jokers_b',jokers_b,'bonus_a',bonus_a,'bonus_b',bonus_b) order by number) from dock_sieve.categories where game_id=g.id and completed),'[]'),'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'claimed',exists(select 1 from dock_sieve.claims c where c.game_id=g.id and c.player_id=p.id)) order by created_at,id) from dock_sieve.players p where game_id=g.id),'[]'));
 elsif p_action in('player','delete_player','configure','start') then
  if g.state<>'draft' then raise exception 'Konfiguration nach Spielstart gesperrt';end if;
  if p_action='player' then if (select count(*) from dock_sieve.players where game_id=g.id)>=100 then raise exception 'Maximal 100 Spieler';end if;insert into dock_sieve.players(game_id,name) values(g.id,trim(p_data->>'name'));
  elsif p_action='delete_player' then delete from dock_sieve.players where game_id=g.id and id=(p_data->>'id')::uuid;
  elsif p_action='configure' then
   count_categories=(p_data->>'category_count')::int;
   if count_categories is null or count_categories not between 1 and 4 then raise exception 'Bitte 1 bis 4 Kategorien wählen';end if;
   if p_data ? 'category_names' then
    if jsonb_typeof(p_data->'category_names') is distinct from 'array' then raise exception 'Kategorien müssen eine Liste sein';end if;
    if jsonb_array_length(p_data->'category_names')<>count_categories then raise exception 'Anzahl und Kategorien stimmen nicht überein';end if;
    if exists(select 1 from jsonb_array_elements(p_data->'category_names') item where jsonb_typeof(item)<>'string' or length(trim(item #>> '{}')) not between 1 and 60) then raise exception 'Jede Kategorie benötigt einen Namen mit 1 bis 60 Zeichen';end if;
    select array_agg(trim(value) order by ord) into names from jsonb_array_elements_text(p_data->'category_names') with ordinality entry(value,ord);
   else select array_agg(coalesce(g.category_names[i],(array['Erklären','Ein Wort','Pantomime','Geräusche'])[i],'Kategorie '||i) order by i) into names from generate_series(1,count_categories) i;end if;
   update dock_sieve.games set category_names=names, words_per_player=(p_data->>'words_per_player')::int,category_count=count_categories,joker_limit=(p_data->>'joker_limit')::int,turn_seconds=coalesce((p_data->>'turn_seconds')::int,g.turn_seconds) where id=g.id;
  else if (select count(*) from dock_sieve.players where game_id=g.id)<4 then raise exception 'Mindestens vier Spieler für zwei Teams erforderlich';end if;update dock_sieve.games set state='active',token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') where id=g.id;end if;
 elsif p_action='reset_claim' then delete from dock_sieve.claims where game_id=g.id and player_id=(p_data->>'id')::uuid;
 elsif p_action='end' then update dock_sieve.games set state='ended',current_turn=null where id=g.id;update dock_sieve.turns set phase='closed' where game_id=g.id and phase<>'closed';
 elsif p_action='delete' then delete from dock_sieve.games where id=g.id;
 else raise exception 'Unbekannte Aktion';end if;return jsonb_build_object('ok',true);
end $$;
