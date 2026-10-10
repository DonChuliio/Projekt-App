-- Rotes Sieb: isolated tables, private engine, narrow public RPCs.
create schema dock_sieve;
revoke all on schema dock_sieve from public,anon,authenticated;
grant usage on schema dock_sieve to anon,authenticated;
create table dock_sieve.games(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users on delete cascade,name text not null check(length(trim(name)) between 1 and 100),state text not null default 'draft' check(state in('draft','active','finished','ended')),phase text not null default 'collecting' check(phase in('collecting','playing','category_done','finished')),words_per_player int not null default 3 check(words_per_player between 1 and 20),category_count int not null default 4 check(category_count between 1 and 4),joker_limit int not null default 2 check(joker_limit between 0 and 20),turn_seconds int not null default 60 check(turn_seconds between 10 and 300),token text unique check(token ~ '^[a-f0-9]{64}$'),category int,current_turn uuid,created_at timestamptz not null default now());
create table dock_sieve.players(id uuid primary key default gen_random_uuid(),game_id uuid not null references dock_sieve.games on delete cascade,name text not null check(length(trim(name)) between 1 and 100),team text check(team in('A','B')),submitted boolean not null default false,turns_started int not null default 0 check(turns_started>=0),created_at timestamptz not null default now(),unique(game_id,id));
create unique index sieve_player_name on dock_sieve.players(game_id,lower(trim(name)));
create table dock_sieve.claims(game_id uuid not null references dock_sieve.games on delete cascade,player_id uuid not null,secret text not null unique check(secret ~ '^[a-f0-9]{64}$'),primary key(game_id,player_id),foreign key(game_id,player_id) references dock_sieve.players(game_id,id) on delete cascade);
create table dock_sieve.words(id uuid primary key default gen_random_uuid(),game_id uuid not null,player_id uuid not null,slot int not null check(slot between 1 and 20),word text not null check(length(trim(word)) between 1 and 120),unique(game_id,id),unique(game_id,player_id,slot),foreign key(game_id,player_id) references dock_sieve.players(game_id,id) on delete cascade);
create table dock_sieve.categories(game_id uuid not null references dock_sieve.games on delete cascade,number int not null check(number between 1 and 4),start_team text not null check(start_team in('A','B')),completed boolean not null default false,words_a int not null default 0,words_b int not null default 0,jokers_a int not null default 0,jokers_b int not null default 0,bonus_a int not null default 0,bonus_b int not null default 0,primary key(game_id,number));
create table dock_sieve.deck(game_id uuid not null,category int not null,word_id uuid not null,solved_by text check(solved_by in('A','B')),primary key(game_id,category,word_id),foreign key(game_id,category) references dock_sieve.categories on delete cascade,foreign key(game_id,word_id) references dock_sieve.words(game_id,id) on delete cascade);
create table dock_sieve.turns(id uuid primary key default gen_random_uuid(),game_id uuid not null,category int not null,team text not null check(team in('A','B')),player_id uuid not null,phase text not null default 'pending' check(phase in('pending','confirmed','running','closed')),word_id uuid not null,word_number int not null default 1 check(word_number>0),deadline timestamptz,foreign key(game_id,category) references dock_sieve.categories on delete cascade,foreign key(game_id,player_id) references dock_sieve.players(game_id,id) on delete cascade,foreign key(game_id,word_id) references dock_sieve.words(game_id,id) on delete cascade);
create table dock_sieve.receipts(game_id uuid not null references dock_sieve.games on delete cascade,operation_id uuid not null,player_id uuid not null,signature text not null,response jsonb not null,primary key(game_id,operation_id),foreign key(game_id,player_id) references dock_sieve.players(game_id,id) on delete cascade);
create index sieve_turn_game on dock_sieve.turns(game_id);
create index sieve_turn_category on dock_sieve.turns(game_id,category);
create index sieve_turn_player on dock_sieve.turns(game_id,player_id);
create index sieve_turn_word on dock_sieve.turns(game_id,word_id);
create index sieve_deck_word on dock_sieve.deck(game_id,word_id);
create index sieve_receipt_player on dock_sieve.receipts(game_id,player_id);
do $$declare t text;begin foreach t in array array['games','players','claims','words','categories','deck','turns','receipts'] loop execute format('alter table dock_sieve.%I enable row level security',t);execute format('create policy deny_direct_access on dock_sieve.%I to anon,authenticated using(false) with check(false)',t);end loop;end $$;
revoke all on all tables in schema dock_sieve from public,anon,authenticated;

create function dock_sieve.next_turn(p_game uuid,p_team text) returns void language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;pid uuid;wid uuid;tid uuid;begin
 select * into g from dock_sieve.games where id=p_game and state='active' for update;if not found then raise exception 'Spiel nicht aktiv';end if;
 select id into pid from dock_sieve.players where game_id=g.id and team=p_team order by turns_started,random() limit 1;
 select word_id into wid from dock_sieve.deck where game_id=g.id and category=g.category and solved_by is null order by random() limit 1;
 if pid is null or wid is null then raise exception 'Kein nächster Zug verfügbar';end if;
 insert into dock_sieve.turns(game_id,category,team,player_id,word_id) values(g.id,g.category,p_team,pid,wid) returning id into tid;
 update dock_sieve.games set current_turn=tid,phase='playing' where id=g.id;
end $$;

create function dock_sieve.begin_category(p_game uuid,p_number int) returns void language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;team text;begin
 select * into g from dock_sieve.games where id=p_game and state='active' for update;if not found or p_number not between 1 and g.category_count then raise exception 'Kategorie nicht verfügbar';end if;
 if p_number=1 then team=case when random()<0.5 then 'A' else 'B' end;else select case when start_team='A' then 'B' else 'A' end into team from dock_sieve.categories where game_id=g.id and number=p_number-1 and completed;if team is null then raise exception 'Vorige Kategorie nicht beendet';end if;end if;
 insert into dock_sieve.categories(game_id,number,start_team) values(g.id,p_number,team);
 insert into dock_sieve.deck(game_id,category,word_id) select g.id,p_number,id from dock_sieve.words where game_id=g.id;
 update dock_sieve.games set category=p_number where id=g.id;perform dock_sieve.next_turn(g.id,team);
end $$;

create function dock_sieve.finish_category(p_game uuid) returns void language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;c dock_sieve.categories;begin
 select * into g from dock_sieve.games where id=p_game for update;select * into c from dock_sieve.categories where game_id=g.id and number=g.category;
 if c.completed then return;end if;
 update dock_sieve.categories set completed=true,bonus_a=case when words_a=words_b and jokers_a<jokers_b then 1 else 0 end,bonus_b=case when words_a=words_b and jokers_b<jokers_a then 1 else 0 end where game_id=g.id and number=g.category;
 update dock_sieve.turns set phase='closed' where id=g.current_turn;
 update dock_sieve.games set current_turn=null,phase=case when category=category_count then 'finished' else 'category_done' end,state=case when category=category_count then 'finished' else state end where id=g.id;
end $$;

create function dock_sieve.status(p_token text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'phase',g.phase,'words_per_player',g.words_per_player,'category_count',g.category_count,'joker_limit',g.joker_limit,'turn_seconds',g.turn_seconds,'category',g.category,'server_now',extract(epoch from clock_timestamp())*1000,
 'players',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'team',p.team,'submitted',p.submitted,'claimed',exists(select 1 from dock_sieve.claims c where c.game_id=g.id and c.player_id=p.id)) order by p.created_at,p.id) from dock_sieve.players p where p.game_id=g.id),'[]'),
 'turn',(select jsonb_build_object('id',t.id,'team',t.team,'player_id',t.player_id,'name',p.name,'phase',case when t.phase='running' and t.deadline<=clock_timestamp() then 'expired' else t.phase end,'word_number',t.word_number,'deadline',extract(epoch from t.deadline)*1000) from dock_sieve.turns t join dock_sieve.players p on p.id=t.player_id where t.id=g.current_turn),
 'remaining',(select count(*) from dock_sieve.deck where game_id=g.id and category=g.category and solved_by is null),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('number',c.number,'start_team',c.start_team,'completed',c.completed,'words_a',c.words_a,'words_b',c.words_b,'jokers_a',c.jokers_a,'jokers_b',c.jokers_b,'bonus_a',c.bonus_a,'bonus_b',c.bonus_b) order by c.number) from dock_sieve.categories c where c.game_id=g.id),'[]'))
 from dock_sieve.games g where g.token=p_token and g.state in('active','finished');
$$;

create function dock_sieve.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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

create function dock_sieve.claim(p_token text,p_player uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;existing text;begin
 select * into g from dock_sieve.games where token=p_token and state='active' for update;if not found then raise exception 'Spiel nicht aktiv';end if;
 if not exists(select 1 from dock_sieve.players where id=p_player and game_id=g.id) or p_secret is null or p_secret !~ '^[a-f0-9]{64}$' then raise exception 'Belegung ungültig';end if;
 insert into dock_sieve.claims(game_id,player_id,secret) values(g.id,p_player,p_secret) on conflict(game_id,player_id) do nothing;select secret into existing from dock_sieve.claims where game_id=g.id and player_id=p_player;if existing<>p_secret then raise exception 'Name bereits belegt';end if;return jsonb_build_object('ok',true);
end $$;

create function dock_sieve.player(p_token text,p_secret text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',p.id,'name',p.name,'team',p.team,'submitted',p.submitted) from dock_sieve.games g join dock_sieve.claims c on c.game_id=g.id join dock_sieve.players p on p.id=c.player_id where g.token=p_token and g.state in('active','finished') and c.secret=p_secret;
$$;

create function dock_sieve.word(p_token text,p_secret text,p_turn uuid,p_number int) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;t dock_sieve.turns;pid uuid;answer text;begin
 select * into g from dock_sieve.games where token=p_token and state='active' for update;if not found or g.current_turn is distinct from p_turn then raise exception 'Zug nicht aktiv';end if;
 select player_id into pid from dock_sieve.claims where game_id=g.id and secret=p_secret;select * into t from dock_sieve.turns where id=p_turn;
 if pid is null or pid<>t.player_id or t.phase<>'running' or t.deadline<=clock_timestamp() or p_number is distinct from t.word_number then raise exception 'Wort nur für aktive Person verfügbar';end if;
 select word into answer from dock_sieve.words where id=t.word_id and game_id=g.id;
 return jsonb_build_object('word',answer,'turn_id',t.id,'word_number',t.word_number,'deadline',extract(epoch from t.deadline)*1000,'server_now',extract(epoch from clock_timestamp())*1000);
end $$;

create function dock_sieve.action(p_token text,p_secret text,p_operation uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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

create function public.sieve_manage(p_action text,p_game uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select dock_sieve.manage(p_action,p_game,p_data);$$;
create function public.sieve_status(p_token text) returns jsonb language sql stable security invoker set search_path='' as $$select coalesce(dock_sieve.status(p_token),'{"state":"unavailable"}'::jsonb);$$;
create function public.sieve_claim(p_token text,p_player uuid,p_secret text) returns jsonb language sql security invoker set search_path='' as $$select dock_sieve.claim(p_token,p_player,p_secret);$$;
create function public.sieve_player(p_token text,p_secret text) returns jsonb language sql stable security invoker set search_path='' as $$select dock_sieve.player(p_token,p_secret);$$;
create function public.sieve_word(p_token text,p_secret text,p_turn uuid,p_number int) returns jsonb language sql security invoker set search_path='' as $$select dock_sieve.word(p_token,p_secret,p_turn,p_number);$$;
create function public.sieve_action(p_token text,p_secret text,p_operation uuid,p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select dock_sieve.action(p_token,p_secret,p_operation,p_action,p_data);$$;
revoke all on all functions in schema dock_sieve from public,anon,authenticated;
revoke all on function public.sieve_manage(text,uuid,jsonb),public.sieve_status(text),public.sieve_claim(text,uuid,text),public.sieve_player(text,text),public.sieve_word(text,text,uuid,int),public.sieve_action(text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function dock_sieve.manage(text,uuid,jsonb),public.sieve_manage(text,uuid,jsonb) to authenticated;
grant execute on function dock_sieve.status(text),dock_sieve.claim(text,uuid,text),dock_sieve.player(text,text),dock_sieve.word(text,text,uuid,int),dock_sieve.action(text,text,uuid,text,jsonb),public.sieve_status(text),public.sieve_claim(text,uuid,text),public.sieve_player(text,text),public.sieve_word(text,text,uuid,int),public.sieve_action(text,text,uuid,text,jsonb) to anon,authenticated;
