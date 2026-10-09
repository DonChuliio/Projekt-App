create or replace function dock_game.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games; r dock_game.rounds; pid uuid; n integer; nr integer; participant_name text;
begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',games.name) order by created_at) from dock_game.games where owner_id=auth.uid()),'[]');end if;
 if p_action='create' then insert into dock_game.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning * into g;return jsonb_build_object('id',g.id);end if;
 select * into g from dock_game.games where id=p_game and owner_id=auth.uid() for update;
 if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then
  select * into r from dock_game.rounds where id=g.current_round;
  return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'token',g.share_token),'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',players.name,'claimed',exists(select 1 from dock_game.claims c where c.round_id=g.current_round and c.player_id=players.id)) order by created_at) from dock_game.players where game_id=g.id and active),'[]'),'round',case when r.id is null then null else jsonb_build_object('id',r.id,'number',r.number,'host_id',r.host_id,'word',r.word,'hint',r.hint,'imposters',r.imposters,'closed',r.closed) end);
 elsif p_action in('player','delete_player') then
  pid=nullif(p_data->>'id','')::uuid;participant_name=trim(p_data->>'name');
  if p_action='delete_player' then update dock_game.players set active=false where id=pid and game_id=g.id and active;if not found then raise exception 'Teilnehmer nicht verfügbar';end if;
  elsif pid is null then insert into dock_game.players(game_id,name) values(g.id,participant_name);
  else update dock_game.players set name=participant_name where id=pid and game_id=g.id and active;if not found then raise exception 'Teilnehmer nicht verfügbar';end if;end if;
  -- Membership changes invalidate the current roster atomically.
  update dock_game.rounds set closed=true where id=g.current_round;
 elsif p_action='round' then
  pid=(p_data->>'host_id')::uuid;n=(p_data->>'imposters')::integer;
  if n is null or n not in(1,2) or not exists(select 1 from dock_game.players where game_id=g.id and id=pid and active) then raise exception 'Spielleiter und 1 oder 2 Imposter auswählen';end if;
  if (select count(*) from dock_game.players where game_id=g.id and active and id<>pid)<=n then raise exception 'Zu wenige aktive Spieler';end if;
  select coalesce(max(number),0)+1 into nr from dock_game.rounds where game_id=g.id;
  update dock_game.rounds set closed=true where id=g.current_round;
  insert into dock_game.rounds(game_id,number,host_id,word,hint,imposters) values(g.id,nr,pid,trim(p_data->>'word'),coalesce(p_data->>'hint',''),n) returning * into r;
  insert into dock_game.roles(round_id,player_id,is_imposter)
   select r.id,id,rn<=n from (select id,row_number() over(order by gen_random_uuid()) rn from dock_game.players where game_id=g.id and active and id<>pid) randomized;
  update dock_game.games set current_round=r.id where id=g.id;
 elsif p_action='close' then update dock_game.rounds set closed=true where id=g.current_round;
 elsif p_action='reset' then delete from dock_game.claims where round_id=g.current_round and player_id=(p_data->>'id')::uuid;
 else raise exception 'Unbekannte Aktion';end if;
 return jsonb_build_object('ok',true);
end $$;
