create or replace function dock_game.role(p_token text,p_round uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;pid uuid;imposter boolean;begin
 select * into g from dock_game.games where share_token=p_token and state='active' for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Spiel oder Runde nicht aktiv';end if;
 select * into r from dock_game.rounds where id=p_round;
 select player_id into pid from dock_game.sessions where game_id=g.id and secret=p_secret;
 if not found then raise exception 'Name nicht mehr zugeordnet';end if;
 if pid=r.host_id then return jsonb_build_object('role','host','phase',r.phase,'word',r.word,'hint',r.hint,'winner',r.winner,'imposters',case when r.phase='live' and not r.closed then coalesce((select jsonb_agg(p.name order by p.name) from dock_game.roles a join dock_game.players p on p.id=a.player_id where a.round_id=r.id and a.is_imposter),'[]'::jsonb) else '[]'::jsonb end);end if;
 if r.phase<>'live' or r.closed then return jsonb_build_object('role','waiting','phase',r.phase);end if;
 select is_imposter into imposter from dock_game.roles where round_id=p_round and player_id=pid;
 if not found then raise exception 'Rolle nicht verfügbar';end if;
 if imposter then
  if g.reveal_imposters then return jsonb_build_object('role','imposter','hint',r.hint,'teammates',coalesce((select jsonb_agg(p.name order by p.name) from dock_game.roles a join dock_game.players p on p.id=a.player_id where a.round_id=r.id and a.is_imposter and a.player_id<>pid),'[]'));end if;
  return jsonb_build_object('role','imposter','hint',r.hint);end if;
 return jsonb_build_object('role','player','word',r.word);
end $$;
