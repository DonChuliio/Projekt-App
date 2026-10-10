-- Read-only final personal statistics, scoped to an existing opaque player credential.
create or replace function dock_game.personal_summary(p_token text,p_secret text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('name',p.name,
  'imposter_rounds',(select count(*) from dock_game.roles a join dock_game.rounds r on r.id=a.round_id where r.game_id=g.id and a.player_id=p.id and a.is_imposter and r.word is not null),
  'imposter_wins',(select count(*) from dock_game.roles a join dock_game.rounds r on r.id=a.round_id where r.game_id=g.id and a.player_id=p.id and a.is_imposter and r.winner='imposter'))
 from dock_game.games g join dock_game.sessions s on s.game_id=g.id join dock_game.players p on p.id=s.player_id and p.game_id=g.id
 where g.share_token=p_token and g.state='ended' and s.secret=p_secret;
$$;
create or replace function public.imposter_personal_summary(p_token text,p_secret text) returns jsonb language sql stable security invoker set search_path='' as $$select dock_game.personal_summary(p_token,p_secret);$$;
revoke all on function dock_game.personal_summary(text,text),public.imposter_personal_summary(text,text) from public,anon,authenticated;
grant execute on function dock_game.personal_summary(text,text),public.imposter_personal_summary(text,text) to anon,authenticated;
