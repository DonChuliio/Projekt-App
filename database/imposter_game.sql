create schema dock_game;
revoke all on schema dock_game from public;
grant usage on schema dock_game to anon,authenticated;
create table dock_game.games(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,name text not null check(length(trim(name)) between 1 and 100),share_token text not null unique default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),current_round uuid,created_at timestamptz not null default now());
create table dock_game.players(id uuid primary key default gen_random_uuid(),game_id uuid not null references dock_game.games on delete cascade,name text not null check(length(trim(name)) between 1 and 100),active boolean not null default true,created_at timestamptz not null default now(),unique(game_id,id));
create unique index game_active_names on dock_game.players(game_id,lower(name)) where active;
create table dock_game.rounds(id uuid primary key default gen_random_uuid(),game_id uuid not null references dock_game.games on delete cascade,number integer not null,host_id uuid not null,word text not null check(length(trim(word)) between 1 and 200),hint text not null default '' check(length(hint)<=500),imposters integer not null check(imposters in(1,2)),closed boolean not null default false,created_at timestamptz not null default now(),unique(game_id,number),foreign key(game_id,host_id) references dock_game.players(game_id,id));
create table dock_game.roles(round_id uuid not null references dock_game.rounds on delete cascade,player_id uuid not null references dock_game.players,is_imposter boolean not null,primary key(round_id,player_id));
create table dock_game.claims(round_id uuid not null references dock_game.rounds on delete cascade,player_id uuid not null references dock_game.players,secret text not null unique default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),primary key(round_id,player_id));
create index games_owner_idx on dock_game.games(owner_id);
create index players_game_idx on dock_game.players(game_id);
-- Tables are not exposed through the Data API and have no client grants.
alter table dock_game.games enable row level security;
alter table dock_game.players enable row level security;
alter table dock_game.rounds enable row level security;
alter table dock_game.roles enable row level security;
alter table dock_game.claims enable row level security;
create policy owner_games on dock_game.games to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy owner_players on dock_game.players to authenticated using(exists(select 1 from dock_game.games g where g.id=game_id and g.owner_id=auth.uid())) with check(exists(select 1 from dock_game.games g where g.id=game_id and g.owner_id=auth.uid()));
create policy owner_rounds on dock_game.rounds to authenticated using(exists(select 1 from dock_game.games g where g.id=game_id and g.owner_id=auth.uid())) with check(exists(select 1 from dock_game.games g where g.id=game_id and g.owner_id=auth.uid()));
-- No role/claim SELECT policy: all output is through purpose-built narrow functions.
revoke all on all tables in schema dock_game from public,anon,authenticated;

create function dock_game.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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

create function dock_game.status(p_token text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;begin
 select * into g from dock_game.games where share_token=p_token;
 if not found then raise exception 'Spiel nicht verfügbar';end if;
 select * into r from dock_game.rounds where id=g.current_round;
 return jsonb_build_object('name',g.name,'round_id',r.id,'number',r.number,'state',case when r.id is null then 'waiting' when r.closed then 'closed' else 'live' end,'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'claimed',exists(select 1 from dock_game.claims c where c.round_id=r.id and c.player_id=players.id)) order by created_at) from dock_game.players where game_id=g.id and active),'[]'));
end $$;

create function dock_game.role(p_token text,p_round uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;r dock_game.rounds;pid uuid;imposter boolean;begin
 select * into g from dock_game.games where share_token=p_token for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Runde nicht mehr aktuell';end if;
 select * into r from dock_game.rounds where id=p_round and not closed;
 if not found then raise exception 'Runde geschlossen';end if;
 select player_id into pid from dock_game.claims where round_id=p_round and secret=p_secret;
 if not found then raise exception 'Name nicht mehr zugeordnet';end if;
 if pid=r.host_id then return jsonb_build_object('role','host');end if;
 select is_imposter into imposter from dock_game.roles where round_id=p_round and player_id=pid;
 if not found then raise exception 'Rolle nicht verfügbar';end if;
 if imposter then return jsonb_build_object('role','imposter','hint',r.hint);end if;
 return jsonb_build_object('role','player','word',r.word);
end $$;

create function dock_game.claim(p_token text,p_round uuid,p_player uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_game.games;secret text;begin
 select * into g from dock_game.games where share_token=p_token for update;
 if not found or g.current_round is distinct from p_round or not exists(select 1 from dock_game.rounds where id=p_round and not closed) then raise exception 'Runde nicht mehr aktuell';end if;
 if not exists(select 1 from dock_game.players where game_id=g.id and id=p_player and active) then raise exception 'Name nicht verfügbar';end if;
 insert into dock_game.claims(round_id,player_id) values(p_round,p_player) on conflict(round_id,player_id) do nothing returning claims.secret into secret;
 if secret is null then raise exception 'Name bereits belegt';end if;
 return jsonb_build_object('secret',secret,'result',dock_game.role(p_token,p_round,secret));
end $$;

-- Invoker wrappers expose only the explicit game operations, no privileged table access.
create function public.imposter_manage(p_action text,p_game uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select dock_game.manage(p_action,p_game,p_data);$$;
create function public.imposter_status(p_token text) returns jsonb language sql security invoker set search_path='' as $$select dock_game.status(p_token);$$;
create function public.imposter_claim(p_token text,p_round uuid,p_player uuid) returns jsonb language sql security invoker set search_path='' as $$select dock_game.claim(p_token,p_round,p_player);$$;
create function public.imposter_role(p_token text,p_round uuid,p_secret text) returns jsonb language sql security invoker set search_path='' as $$select dock_game.role(p_token,p_round,p_secret);$$;
revoke all on all functions in schema dock_game from public,anon,authenticated;
grant execute on function dock_game.manage(text,uuid,jsonb) to authenticated;
grant execute on function dock_game.status(text),dock_game.claim(text,uuid,uuid),dock_game.role(text,uuid,text) to anon,authenticated;
revoke all on function public.imposter_manage(text,uuid,jsonb),public.imposter_status(text),public.imposter_claim(text,uuid,uuid),public.imposter_role(text,uuid,text) from public,anon,authenticated;
grant execute on function public.imposter_manage(text,uuid,jsonb) to authenticated;
grant execute on function public.imposter_status(text),public.imposter_claim(text,uuid,uuid),public.imposter_role(text,uuid,text) to anon,authenticated;
