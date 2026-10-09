-- v1.78: owner setup; game-scoped participant credentials; host-led rounds.
alter table dock_game.games add column state text not null default 'draft' check(state in('draft','active','ended'));
alter table dock_game.games add column imposters integer not null default 1 check(imposters in(1,2));
alter table dock_game.games add column expected_players integer check(expected_players between 3 and 100);
alter table dock_game.games add column ended_at timestamptz;
update dock_game.games g set state='active',imposters=r.imposters from dock_game.rounds r where r.id=g.current_round;
alter table dock_game.games alter column share_token drop not null;
alter table dock_game.games alter column share_token drop default;
update dock_game.games set share_token=null where state='draft';
alter table dock_game.rounds alter column word drop not null;
alter table dock_game.rounds add column phase text not null default 'choosing' check(phase in('choosing','live','finished'));
alter table dock_game.rounds add column winner text check(winner in('imposter','players'));
update dock_game.rounds set phase=case when closed then 'finished' else 'live' end;
create table dock_game.sessions(game_id uuid not null references dock_game.games on delete cascade,player_id uuid not null,secret text not null unique default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),created_at timestamptz not null default now(),primary key(game_id,player_id),foreign key(game_id,player_id) references dock_game.players(game_id,id));
alter table dock_game.sessions enable row level security;
create policy no_direct_sessions on dock_game.sessions to anon,authenticated using(false) with check(false);
revoke all on dock_game.sessions from public,anon,authenticated;

create function dock_game.new_round(p_game uuid) returns void language plpgsql security definer set search_path='' as $$
declare g dock_game.games; previous uuid; host uuid; r uuid; num integer;begin
 select * into g from dock_game.games where id=p_game for update;
 if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
 if (select count(*) from dock_game.players where game_id=g.id and active)<=g.imposters+1 then raise exception 'Zu wenige Spieler';end if;
 select host_id into previous from dock_game.rounds where id=g.current_round;
 select id into host from dock_game.players where game_id=g.id and active and id is distinct from previous order by gen_random_uuid() limit 1;
 select coalesce(max(number),0)+1 into num from dock_game.rounds where game_id=g.id;
 insert into dock_game.rounds(game_id,number,host_id,word,hint,imposters,phase) values(g.id,num,host,null,'',g.imposters,'choosing') returning id into r;
 insert into dock_game.roles(round_id,player_id,is_imposter) select r,id,rn<=g.imposters from (select id,row_number() over(order by gen_random_uuid()) rn from dock_game.players where game_id=g.id and active and id<>host) x;
 update dock_game.games set current_round=r where id=g.id;
end $$;
revoke all on function dock_game.new_round(uuid) from public,anon,authenticated;

create or replace function dock_game.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games; r dock_game.rounds; pid uuid; participant_name text; n integer;begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'state',state) order by created_at desc) from dock_game.games where owner_id=auth.uid()),'[]');end if;
 if p_action='create' then insert into dock_game.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning * into g;return jsonb_build_object('id',g.id);end if;
 select * into g from dock_game.games where id=p_game and owner_id=auth.uid() for update;
 if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then
  select * into r from dock_game.rounds where id=g.current_round;
  return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'token',case when g.state='active' then g.share_token else null end,'imposters',g.imposters,'expected_players',g.expected_players),
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
  update dock_game.games set imposters=(p_data->>'imposters')::integer,expected_players=(p_data->>'expected_players')::integer where id=g.id;
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
 elsif p_action='reset' then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  delete from dock_game.sessions where game_id=g.id and player_id=(p_data->>'id')::uuid;
 else raise exception 'Unbekannte Aktion';end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function dock_game.status(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;begin
 select * into g from dock_game.games where share_token=p_token and state='active';
 if not found then return jsonb_build_object('state','unavailable');end if;
 select * into r from dock_game.rounds where id=g.current_round;
 return jsonb_build_object('name',g.name,'round_id',r.id,'number',r.number,'host_id',r.host_id,'state',r.phase,'winner',r.winner,'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'claimed',exists(select 1 from dock_game.sessions s where s.game_id=g.id and s.player_id=p.id)) order by p.created_at) from dock_game.players p where p.game_id=g.id and active),'[]'));
end $$;

create or replace function dock_game.role(p_token text,p_round uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;pid uuid;imposter boolean;begin
 select * into g from dock_game.games where share_token=p_token and state='active' for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Spiel oder Runde nicht aktiv';end if;
 select * into r from dock_game.rounds where id=p_round;
 select player_id into pid from dock_game.sessions where game_id=g.id and secret=p_secret;
 if not found then raise exception 'Name nicht mehr zugeordnet';end if;
 if pid=r.host_id then return jsonb_build_object('role','host','phase',r.phase,'word',r.word,'hint',r.hint,'winner',r.winner);end if;
 if r.phase<>'live' or r.closed then return jsonb_build_object('role','waiting','phase',r.phase);end if;
 select is_imposter into imposter from dock_game.roles where round_id=p_round and player_id=pid;
 if not found then raise exception 'Rolle nicht verfügbar';end if;
 if imposter then return jsonb_build_object('role','imposter','hint',r.hint);end if;
 return jsonb_build_object('role','player','word',r.word);
end $$;

create or replace function dock_game.claim(p_token text,p_round uuid,p_player uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;credential text;begin
 select * into g from dock_game.games where share_token=p_token and state='active' for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Spiel oder Runde nicht aktiv';end if;
 if not exists(select 1 from dock_game.players where game_id=g.id and id=p_player and active) then raise exception 'Name nicht verfügbar';end if;
 insert into dock_game.sessions(game_id,player_id) values(g.id,p_player) on conflict(game_id,player_id) do nothing returning secret into credential;
 if credential is null then raise exception 'Name bereits belegt';end if;
 return jsonb_build_object('secret',credential,'player_id',p_player,'result',dock_game.role(p_token,p_round,credential));
end $$;

create or replace function dock_game.claim_valid(p_token text,p_round uuid,p_secret text) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from dock_game.games g join dock_game.sessions s on s.game_id=g.id where g.share_token=p_token and g.state='active' and g.current_round=p_round and s.secret=p_secret);
$$;

create function dock_game.host_action(p_token text,p_round uuid,p_secret text,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;pid uuid;begin
 select * into g from dock_game.games where share_token=p_token and state='active' for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Spiel oder Runde nicht aktiv';end if;
 select * into r from dock_game.rounds where id=p_round;
 select player_id into pid from dock_game.sessions where game_id=g.id and secret=p_secret;
 if pid is null or pid<>r.host_id then raise exception 'Nur die aktuelle Spielleitung darf diese Aktion ausführen';end if;
 if p_action='prepare' then
  if r.phase<>'choosing' then raise exception 'Wort bereits festgelegt';end if;
  if p_data->>'word' is null or length(trim(p_data->>'word')) not between 1 and 200 or length(coalesce(p_data->>'hint',''))>500 then raise exception 'Wort und Hinweis prüfen';end if;
  update dock_game.rounds set word=trim(p_data->>'word'),hint=coalesce(p_data->>'hint',''),phase='live' where id=r.id;
 elsif p_action='finish' then
  if r.phase<>'live' or p_data->>'winner' is null or p_data->>'winner' not in('imposter','players') then raise exception 'Ergebnis nicht gültig';end if;
  update dock_game.rounds set winner=p_data->>'winner',phase='finished',closed=true where id=r.id;
 elsif p_action='next' then
  if r.phase<>'finished' then raise exception 'Zuerst Gewinner festlegen';end if;
  perform dock_game.new_round(g.id);
 else raise exception 'Unbekannte Aktion';end if;
 return jsonb_build_object('ok',true);
end $$;
create function public.imposter_host_action(p_token text,p_round uuid,p_secret text,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select dock_game.host_action(p_token,p_round,p_secret,p_action,p_data);$$;
revoke all on function dock_game.host_action(text,uuid,text,text,jsonb),public.imposter_host_action(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function dock_game.host_action(text,uuid,text,text,jsonb),public.imposter_host_action(text,uuid,text,text,jsonb) to anon,authenticated;
