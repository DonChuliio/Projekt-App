-- Atomic result and next round; owner-only game deletion. Existing RPC ACLs remain unchanged.
create or replace function dock_game.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games; r dock_game.rounds; pid uuid; participant_name text; n integer;begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'state',state) order by created_at desc) from dock_game.games where owner_id=auth.uid()),'[]');end if;
 if p_action='create' then insert into dock_game.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning * into g;return jsonb_build_object('id',g.id);end if;
 select * into g from dock_game.games where id=p_game and owner_id=auth.uid() for update;
 if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then
  select * into r from dock_game.rounds where id=g.current_round;
  return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'token',case when g.state='active' then g.share_token else null end,'imposters',g.imposters,'expected_players',g.expected_players,'reveal_imposters',g.reveal_imposters),
   'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'claimed',exists(select 1 from dock_game.sessions s where s.game_id=g.id and s.player_id=p.id),'active',p.active) order by p.created_at) from dock_game.players p where p.game_id=g.id),'[]'),
   'round',case when r.id is null then null else jsonb_build_object('id',r.id,'number',r.number,'host_id',r.host_id,'word',r.word,'hint',r.hint,'phase',r.phase,'winner',r.winner,'closed',r.closed) end,
   'history',coalesce((select jsonb_agg(jsonb_build_object('number',x.number,'host',h.name,'winner',x.winner,'phase',x.phase,'imposters',coalesce((select jsonb_agg(p.name order by p.name) from dock_game.roles a join dock_game.players p on p.id=a.player_id where a.round_id=x.id and a.is_imposter),'[]')) order by x.number) from dock_game.rounds x join dock_game.players h on h.id=x.host_id where x.game_id=g.id and x.phase='finished'),'[]'),
   'stats',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'wins',(select count(*) from dock_game.roles a join dock_game.rounds x on x.id=a.round_id where a.player_id=p.id and x.game_id=g.id and x.winner is not null and ((x.winner='imposter' and a.is_imposter) or (x.winner='players' and not a.is_imposter))),'played',(select count(*) from dock_game.roles a join dock_game.rounds x on x.id=a.round_id where a.player_id=p.id and x.game_id=g.id and x.winner is not null)) order by p.created_at) from dock_game.players p where p.game_id=g.id),'[]'));
 elsif p_action in('player','delete_player') then
  if g.state<>'draft' then raise exception 'Spielerliste ist nach Spielstart gesperrt';end if;
  pid=nullif(p_data->>'id','')::uuid;participant_name=trim(p_data->>'name');
  if p_action='delete_player' then update dock_game.players set active=false where id=pid and game_id=g.id and active;if not found then raise exception 'Spieler nicht verfügbar';end if;
  elsif pid is null then if (select count(*) from dock_game.players where game_id=g.id and active)>=100 then raise exception 'Maximal 100 Spieler';end if;insert into dock_game.players(game_id,name) values(g.id,participant_name);
  else update dock_game.players set name=participant_name where id=pid and game_id=g.id and active;if not found then raise exception 'Spieler nicht verfügbar';end if;end if;
 elsif p_action='configure' then
  if g.state<>'draft' then raise exception 'Konfiguration nur vor Spielstart';end if;
  update dock_game.games set imposters=(p_data->>'imposters')::integer,expected_players=(p_data->>'expected_players')::integer,reveal_imposters=coalesce((p_data->>'reveal_imposters')::boolean,g.reveal_imposters) where id=g.id;
 elsif p_action='start' then
  if g.state<>'draft' then raise exception 'Spiel bereits gestartet oder beendet';end if;
  select count(*) into n from dock_game.players where game_id=g.id and active;
  if n<=g.imposters+1 or (g.expected_players is not null and g.expected_players<>n) then raise exception 'Spielerzahl und Imposter-Anzahl prüfen';end if;
  update dock_game.games set state='active',share_token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') where id=g.id;
  perform dock_game.new_round(g.id);
 elsif p_action='end' then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  update dock_game.games set state='ended',ended_at=now() where id=g.id;
  update dock_game.rounds set closed=true,phase='finished' where id=g.current_round;
 elsif p_action='delete' then
  delete from dock_game.sessions where game_id=g.id;
  delete from dock_game.rounds where game_id=g.id;
  delete from dock_game.games where id=g.id;
 elsif p_action='reset' then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  delete from dock_game.sessions where game_id=g.id and player_id=(p_data->>'id')::uuid;
 else raise exception 'Unbekannte Aktion';end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function dock_game.host_action(p_token text,p_round uuid,p_secret text,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;pid uuid;begin
 select * into g from dock_game.games where share_token=p_token and state='active' for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Spiel oder Runde nicht aktiv';end if;
 select * into r from dock_game.rounds where id=p_round;
 select player_id into pid from dock_game.sessions where game_id=g.id and secret=p_secret;
 if pid is null or pid<>r.host_id then raise exception 'Nur die aktuelle Rundenleitung darf diese Aktion ausführen';end if;
 if p_action='prepare' then
  if r.phase<>'choosing' then raise exception 'Wort bereits festgelegt';end if;
  if p_data->>'word' is null or length(trim(p_data->>'word')) not between 1 and 200 or length(coalesce(p_data->>'hint',''))>500 then raise exception 'Wort und Hinweis prüfen';end if;
  update dock_game.rounds set word=trim(p_data->>'word'),hint=coalesce(p_data->>'hint',''),phase='live' where id=r.id;
 elsif p_action in('finish','finish_next') then
  if r.phase<>'live' or p_data->>'winner' is null or p_data->>'winner' not in('imposter','players') then raise exception 'Ergebnis nicht gültig';end if;
  update dock_game.rounds set winner=p_data->>'winner',phase='finished',closed=true where id=r.id;
  if p_action='finish_next' then perform dock_game.new_round(g.id);end if;
 elsif p_action='next' then
  if r.phase<>'finished' then raise exception 'Zuerst Gewinner festlegen';end if;
  perform dock_game.new_round(g.id);
 else raise exception 'Unbekannte Aktion';end if;
 return jsonb_build_object('ok',true);
end $$;
