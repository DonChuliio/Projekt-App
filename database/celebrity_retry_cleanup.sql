alter table dock_celebrity.entries drop constraint entries_player_id_fkey,drop constraint entries_recipient_id_fkey;
alter table dock_celebrity.entries add constraint entries_player_id_fkey foreign key(player_id) references dock_celebrity.players on delete cascade,add constraint entries_recipient_id_fkey foreign key(recipient_id) references dock_celebrity.players on delete cascade;
alter table dock_celebrity.claims drop constraint claims_player_id_fkey;
alter table dock_celebrity.claims add constraint claims_player_id_fkey foreign key(player_id) references dock_celebrity.players on delete cascade;
create or replace function dock_celebrity.action(p_token text,p_round uuid,p_secret text,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
