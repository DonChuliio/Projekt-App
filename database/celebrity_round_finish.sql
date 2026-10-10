-- Preserve player identity across completed rounds and support early completion.
-- Secrets remain scoped to the round; every RPC checks round + game + secret.
alter table dock_celebrity.claims drop constraint claims_secret_key;
alter table dock_celebrity.claims add constraint celebrity_round_secret unique(round_id,secret);

create or replace function dock_celebrity.new_round(p_game uuid,p_number integer) returns uuid language plpgsql security definer set search_path='' as $$
declare ids uuid[];rid uuid;previous_round uuid;i integer;n integer;begin
 select current_round into previous_round from dock_celebrity.games where id=p_game and state='active' for update;if not found then raise exception 'Spiel nicht aktiv';end if;
 select array_agg(id order by random()) into ids from dock_celebrity.players where game_id=p_game and active;n=array_length(ids,1);
 if n is null or n<2 then raise exception 'Mindestens zwei Spieler erforderlich';end if;
 insert into dock_celebrity.rounds(game_id,number) values(p_game,p_number) returning id into rid;
 for i in 1..n loop insert into dock_celebrity.entries(round_id,player_id,recipient_id) values(rid,ids[i],ids[(i%n)+1]);end loop;
 insert into dock_celebrity.claims(round_id,player_id,secret) select rid,c.player_id,c.secret from dock_celebrity.claims c join dock_celebrity.rounds previous on previous.id=c.round_id join dock_celebrity.entries fresh on fresh.round_id=rid and fresh.player_id=c.player_id where c.round_id=previous_round and previous.phase='completed';
 update dock_celebrity.games set current_round=rid where id=p_game;return rid;
end $$;
create or replace function dock_celebrity.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_celebrity.games;r dock_celebrity.rounds;pid uuid;begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return jsonb_build_object('games',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'state',state) order by created_at desc) from dock_celebrity.games where owner_id=auth.uid()),'[]'),'stats',dock_celebrity.stats(auth.uid()));end if;
 if p_action='create' then insert into dock_celebrity.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning * into g;return jsonb_build_object('id',g.id);end if;
 select * into g from dock_celebrity.games where id=p_game and owner_id=auth.uid() for update;if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then select * into r from dock_celebrity.rounds where id=g.current_round;
  return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'notes_enabled',g.notes_enabled,'token',case when g.state='active' then g.share_token else null end),'round',case when r.id is null then null else jsonb_build_object('id',r.id,'number',r.number,'phase',r.phase) end,
   'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'claimed',exists(select 1 from dock_celebrity.claims c where c.round_id=r.id and c.player_id=p.id),'submitted',a.celebrity is not null,'position',a.position) order by p.created_at) from dock_celebrity.players p left join dock_celebrity.entries a on a.player_id=p.id and a.round_id=r.id where p.game_id=g.id and p.active),'[]'),
   'history',coalesce((select jsonb_agg(jsonb_build_object('number',h.number,'placements',(select jsonb_agg(jsonb_build_object('name',p.name,'position',a.position) order by a.position) from dock_celebrity.entries a join dock_celebrity.players p on p.id=a.player_id where a.round_id=h.id)) order by h.number) from dock_celebrity.rounds h where h.game_id=g.id and h.phase='completed'),'[]'),'stats',dock_celebrity.stats(auth.uid()));
 elsif p_action='player' then
  if g.state<>'draft' then raise exception 'Spielerliste nach Spielstart gesperrt';end if;
  if (select count(*) from dock_celebrity.players where game_id=g.id and active)>=100 then raise exception 'Maximal 100 Spieler';end if;
  insert into dock_celebrity.players(game_id,name) values(g.id,trim(p_data->>'name'));
 elsif p_action='delete_player' then
  if g.state<>'draft' then raise exception 'Spielerliste nach Spielstart gesperrt';end if;
  update dock_celebrity.players set active=false where game_id=g.id and id=(p_data->>'id')::uuid and active;if not found then raise exception 'Spieler nicht verfügbar';end if;
 elsif p_action='configure' then update dock_celebrity.games set notes_enabled=(p_data->>'notes_enabled')::boolean where id=g.id;
 elsif p_action='start' then
  if g.state<>'draft' then raise exception 'Spiel bereits gestartet';end if;
  update dock_celebrity.games set state='active',share_token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') where id=g.id;perform dock_celebrity.new_round(g.id,1);
 elsif p_action in('finish_round','reset') then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  select * into r from dock_celebrity.rounds where id=g.current_round;
  if p_action='finish_round' and (p_data->>'round_id')::uuid is distinct from r.id then raise exception 'Runde bereits beendet. Ansicht aktualisieren.';end if;
  if r.phase not in('entering','guessing') then raise exception 'Runde bereits beendet';end if;
  update dock_celebrity.rounds set phase='completed' where id=r.id;perform dock_celebrity.new_round(g.id,r.number+1);
 elsif p_action='reset_claim' then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  delete from dock_celebrity.claims where round_id=g.current_round and player_id=(p_data->>'id')::uuid;
 elsif p_action='end' then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  update dock_celebrity.rounds set phase='discarded' where id=g.current_round and phase in('entering','guessing');update dock_celebrity.games set state='ended' where id=g.id;
 elsif p_action='delete' then
  delete from dock_celebrity.rounds where game_id=g.id;delete from dock_celebrity.games where id=g.id;
 else raise exception 'Unbekannte Aktion';end if;return jsonb_build_object('ok',true);
end $$;

create or replace function dock_celebrity.player(p_token text,p_round uuid,p_secret text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recipient_name',case when r.phase='completed' then null else p.name end,'submitted',a.celebrity is not null,'position',a.position,'phase',r.phase,'number',r.number,'previous',(select jsonb_build_object('number',h.number,'position',last_entry.position,'placements',(select jsonb_agg(jsonb_build_object('name',previous_player.name,'position',previous_entry.position) order by previous_entry.position nulls last,previous_player.name) from dock_celebrity.entries previous_entry join dock_celebrity.players previous_player on previous_player.id=previous_entry.player_id where previous_entry.round_id=h.id)) from dock_celebrity.rounds h join dock_celebrity.entries last_entry on last_entry.round_id=h.id and last_entry.player_id=c.player_id where h.game_id=g.id and h.phase='completed' and h.number<r.number order by h.number desc limit 1),'placements',case when r.phase='completed' then (select jsonb_agg(jsonb_build_object('name',finished.name,'position',e.position) order by e.position) from dock_celebrity.entries e join dock_celebrity.players finished on finished.id=e.player_id where e.round_id=r.id) else null end)
 from dock_celebrity.games g join dock_celebrity.rounds r on r.game_id=g.id join dock_celebrity.claims c on c.round_id=r.id join dock_celebrity.entries a on a.round_id=r.id and a.player_id=c.player_id join dock_celebrity.players p on p.id=a.recipient_id
 where g.share_token=p_token and g.state='active' and r.id=p_round and c.secret=p_secret and (g.current_round=r.id or r.phase='completed');
$$;
