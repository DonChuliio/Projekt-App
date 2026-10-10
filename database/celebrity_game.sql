-- Promi-Raten is isolated from Imposter. Public RPCs use opaque per-round credentials.
create schema dock_celebrity;
revoke all on schema dock_celebrity from public,anon,authenticated;
grant usage on schema dock_celebrity to anon,authenticated;
create table dock_celebrity.games(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,name text not null check(length(trim(name)) between 1 and 100),state text not null default 'draft' check(state in('draft','active','ended')),share_token text unique check(share_token ~ '^[a-f0-9]{64}$'),notes_enabled boolean not null default false,current_round uuid,created_at timestamptz not null default now());
create table dock_celebrity.players(id uuid primary key default gen_random_uuid(),game_id uuid not null references dock_celebrity.games on delete cascade,name text not null check(length(trim(name)) between 1 and 100),active boolean not null default true,created_at timestamptz not null default now(),unique(game_id,id));
create unique index celebrity_active_name on dock_celebrity.players(game_id,lower(trim(name))) where active;
create table dock_celebrity.rounds(id uuid primary key default gen_random_uuid(),game_id uuid not null references dock_celebrity.games on delete cascade,number integer not null check(number>0),phase text not null default 'entering' check(phase in('entering','guessing','completed','discarded')),created_at timestamptz not null default now());
create unique index celebrity_current_number on dock_celebrity.rounds(game_id,number) where phase<>'discarded';
create table dock_celebrity.entries(round_id uuid not null references dock_celebrity.rounds on delete cascade,player_id uuid not null references dock_celebrity.players on delete cascade,recipient_id uuid not null references dock_celebrity.players on delete cascade,celebrity text check(length(trim(celebrity)) between 1 and 200),position integer check(position>0),primary key(round_id,player_id),unique(round_id,recipient_id),unique(round_id,position),check(player_id<>recipient_id));
create table dock_celebrity.claims(round_id uuid not null references dock_celebrity.rounds on delete cascade,player_id uuid not null references dock_celebrity.players on delete cascade,secret text not null unique check(secret ~ '^[a-f0-9]{64}$'),primary key(round_id,player_id));
create index celebrity_round_game on dock_celebrity.rounds(game_id);
create index celebrity_entry_player on dock_celebrity.entries(player_id,round_id);
do $$declare t text;begin foreach t in array array['games','players','rounds','entries','claims'] loop execute format('alter table dock_celebrity.%I enable row level security',t);execute format('create policy deny_direct_access on dock_celebrity.%I to anon,authenticated using(false) with check(false)',t);end loop;end $$;
revoke all on all tables in schema dock_celebrity from public,anon,authenticated;

create function dock_celebrity.new_round(p_game uuid,p_number integer) returns uuid language plpgsql security definer set search_path='' as $$
declare ids uuid[];rid uuid;i integer;n integer;begin
 perform 1 from dock_celebrity.games where id=p_game and state='active' for update;if not found then raise exception 'Spiel nicht aktiv';end if;
 select array_agg(id order by random()) into ids from dock_celebrity.players where game_id=p_game and active;n=array_length(ids,1);
 if n is null or n<2 then raise exception 'Mindestens zwei Spieler erforderlich';end if;
 insert into dock_celebrity.rounds(game_id,number) values(p_game,p_number) returning id into rid;
 for i in 1..n loop insert into dock_celebrity.entries(round_id,player_id,recipient_id) values(rid,ids[i],ids[(i%n)+1]);end loop;
 update dock_celebrity.games set current_round=rid where id=p_game;return rid;
end $$;
revoke all on function dock_celebrity.new_round(uuid,integer) from public,anon,authenticated;

create function dock_celebrity.stats(p_owner uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(x.item order by x.firsts desc,x.name),'[]') from(
 select min(p.name) as name,count(*) filter(where a.position=1) as firsts,jsonb_build_object('name',min(p.name),'rounds',count(*),'firsts',count(*) filter(where a.position=1),'placements',jsonb_agg(jsonb_build_object('game',g.name,'round',r.number,'position',a.position) order by r.created_at)) as item
 from dock_celebrity.entries a join dock_celebrity.players p on p.id=a.player_id join dock_celebrity.rounds r on r.id=a.round_id join dock_celebrity.games g on g.id=r.game_id
 where g.owner_id=p_owner and r.phase='completed' group by lower(trim(p.name))) x;
$$;
revoke all on function dock_celebrity.stats(uuid) from public,anon,authenticated;

create function dock_celebrity.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
 elsif p_action='reset' then
  if g.state<>'active' then raise exception 'Spiel nicht aktiv';end if;
  select * into r from dock_celebrity.rounds where id=g.current_round;update dock_celebrity.rounds set phase='discarded' where id=r.id;perform dock_celebrity.new_round(g.id,r.number);
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

create function dock_celebrity.status(p_token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare g dock_celebrity.games;r dock_celebrity.rounds;begin
 select * into g from dock_celebrity.games where share_token=p_token and state='active';if not found then return jsonb_build_object('state','unavailable');end if;
 select * into r from dock_celebrity.rounds where id=g.current_round;
 return jsonb_build_object('name',g.name,'round_id',r.id,'number',r.number,'state',r.phase,'notes_enabled',g.notes_enabled,'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'claimed',exists(select 1 from dock_celebrity.claims c where c.round_id=r.id and c.player_id=p.id),'submitted',a.celebrity is not null,'position',a.position) order by p.created_at) from dock_celebrity.players p join dock_celebrity.entries a on a.player_id=p.id and a.round_id=r.id where p.game_id=g.id),'[]'));
end $$;

create function dock_celebrity.claim(p_token text,p_round uuid,p_player uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_celebrity.games;existing text;begin
 select * into g from dock_celebrity.games where share_token=p_token and state='active' for update;
 if not found or g.current_round is distinct from p_round then raise exception 'Runde nicht mehr aktiv';end if;
 if not exists(select 1 from dock_celebrity.entries where round_id=p_round and player_id=p_player) then raise exception 'Name nicht verfügbar';end if;
 if p_secret is null or p_secret !~ '^[a-f0-9]{64}$' then raise exception 'Belegung ungültig';end if;
 insert into dock_celebrity.claims(round_id,player_id,secret) values(p_round,p_player,p_secret) on conflict(round_id,player_id) do nothing;
 select secret into existing from dock_celebrity.claims where round_id=p_round and player_id=p_player;
 if existing<>p_secret then raise exception 'Name bereits belegt';end if;
 return jsonb_build_object('ok',true);
end $$;

create function dock_celebrity.player(p_token text,p_round uuid,p_secret text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('recipient_name',case when r.phase='completed' then null else p.name end,'submitted',a.celebrity is not null,'position',a.position,'phase',r.phase,'number',r.number,'placements',case when r.phase='completed' then (select jsonb_agg(jsonb_build_object('name',finished.name,'position',e.position) order by e.position) from dock_celebrity.entries e join dock_celebrity.players finished on finished.id=e.player_id where e.round_id=r.id) else null end)
 from dock_celebrity.games g join dock_celebrity.rounds r on r.game_id=g.id join dock_celebrity.claims c on c.round_id=r.id join dock_celebrity.entries a on a.round_id=r.id and a.player_id=c.player_id join dock_celebrity.players p on p.id=a.recipient_id
 where g.share_token=p_token and g.state='active' and r.id=p_round and c.secret=p_secret and (g.current_round=r.id or r.phase='completed');
$$;

create function dock_celebrity.others(p_token text,p_round uuid,p_secret text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pid uuid;begin
 select c.player_id into pid from dock_celebrity.games g join dock_celebrity.rounds r on r.id=g.current_round join dock_celebrity.claims c on c.round_id=r.id where g.share_token=p_token and g.state='active' and r.id=p_round and r.phase='guessing' and c.secret=p_secret;
 if not found then raise exception 'Belegung oder Runde nicht aktiv';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'celebrity',a.celebrity) order by p.name) from dock_celebrity.entries a join dock_celebrity.players p on p.id=a.recipient_id where a.round_id=p_round and a.recipient_id<>pid),'[]');
end $$;

create function dock_celebrity.action(p_token text,p_round uuid,p_secret text,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_celebrity.games;r dock_celebrity.rounds;pid uuid;entry dock_celebrity.entries;n int;round_number int;word text;begin
 select * into g from dock_celebrity.games where share_token=p_token and state='active' for update;if not found then raise exception 'Runde nicht mehr aktiv';end if;
 if g.current_round is distinct from p_round then
  if p_action='win' then
   select a.position,archived.number into n,round_number from dock_celebrity.entries a join dock_celebrity.rounds archived on archived.id=a.round_id join dock_celebrity.claims c on c.round_id=a.round_id and c.player_id=a.player_id where archived.id=p_round and archived.game_id=g.id and archived.phase='completed' and c.secret=p_secret;
   if found then return jsonb_build_object('position',n,'number',round_number);end if;
  end if;
  raise exception 'Runde nicht mehr aktiv';
 end if;
 select * into r from dock_celebrity.rounds where id=p_round;select player_id into pid from dock_celebrity.claims where round_id=p_round and secret=p_secret;if not found then raise exception 'Name nicht mehr zugeordnet';end if;
 select * into entry from dock_celebrity.entries where round_id=p_round and player_id=pid;
 if p_action='submit' then
  word=trim(p_data->>'celebrity');if word is null or length(word) not between 1 and 200 then raise exception 'Promi-Namen eingeben (maximal 200 Zeichen)';end if;
  if entry.celebrity is not null then if entry.celebrity<>word then raise exception 'Promi bereits festgelegt';end if;return jsonb_build_object('ok',true);end if;
  if r.phase<>'entering' then raise exception 'Eingabephase beendet';end if;
  update dock_celebrity.entries set celebrity=word where round_id=p_round and player_id=pid;
  if not exists(select 1 from dock_celebrity.entries where round_id=p_round and celebrity is null) then update dock_celebrity.rounds set phase='guessing' where id=p_round;end if;
 elsif p_action='win' then
  if r.phase<>'guessing' then raise exception 'Ratephase noch nicht gestartet';end if;
  if entry.position is not null then return jsonb_build_object('position',entry.position,'number',r.number);end if;
  select coalesce(max(position),0)+1 into n from dock_celebrity.entries where round_id=p_round;update dock_celebrity.entries set position=n where round_id=p_round and player_id=pid;
  if not exists(select 1 from dock_celebrity.entries where round_id=p_round and position is null) then update dock_celebrity.rounds set phase='completed' where id=p_round;perform dock_celebrity.new_round(g.id,r.number+1);end if;
  return jsonb_build_object('position',n,'number',r.number);
 else raise exception 'Unbekannte Aktion';end if;return jsonb_build_object('ok',true);
end $$;

create function public.celebrity_manage(p_action text,p_game uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select dock_celebrity.manage(p_action,p_game,p_data);$$;
create function public.celebrity_status(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$select dock_celebrity.status(p_token);$$;
create function public.celebrity_claim(p_token text,p_round uuid,p_player uuid,p_secret text) returns jsonb language sql security invoker set search_path='' as $$select dock_celebrity.claim(p_token,p_round,p_player,p_secret);$$;
create function public.celebrity_player(p_token text,p_round uuid,p_secret text) returns jsonb language sql stable security invoker set search_path='' as $$select dock_celebrity.player(p_token,p_round,p_secret);$$;
create function public.celebrity_others(p_token text,p_round uuid,p_secret text) returns jsonb language sql stable security invoker set search_path='' as $$select dock_celebrity.others(p_token,p_round,p_secret);$$;
create function public.celebrity_action(p_token text,p_round uuid,p_secret text,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select dock_celebrity.action(p_token,p_round,p_secret,p_action,p_data);$$;
revoke all on all functions in schema dock_celebrity from public,anon,authenticated;
revoke all on function public.celebrity_manage(text,uuid,jsonb),public.celebrity_status(text),public.celebrity_claim(text,uuid,uuid,text),public.celebrity_player(text,uuid,text),public.celebrity_others(text,uuid,text),public.celebrity_action(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function dock_celebrity.manage(text,uuid,jsonb),public.celebrity_manage(text,uuid,jsonb) to authenticated;
grant execute on function dock_celebrity.status(text),dock_celebrity.claim(text,uuid,uuid,text),dock_celebrity.player(text,uuid,text),dock_celebrity.others(text,uuid,text),dock_celebrity.action(text,uuid,text,text,jsonb),public.celebrity_status(text),public.celebrity_claim(text,uuid,uuid,text),public.celebrity_player(text,uuid,text),public.celebrity_others(text,uuid,text),public.celebrity_action(text,uuid,text,text,jsonb) to anon,authenticated;
