create function dock_game.claim_valid(p_token text,p_round uuid,p_secret text) returns boolean language sql security definer set search_path='' as $$
 select exists(select 1 from dock_game.games g join dock_game.rounds r on r.id=g.current_round join dock_game.claims c on c.round_id=r.id where g.share_token=p_token and r.id=p_round and not r.closed and c.secret=p_secret);
$$;
create function public.imposter_claim_valid(p_token text,p_round uuid,p_secret text) returns boolean language sql security invoker set search_path='' as $$select dock_game.claim_valid(p_token,p_round,p_secret);$$;
revoke all on function dock_game.claim_valid(text,uuid,text),public.imposter_claim_valid(text,uuid,text) from public,anon,authenticated;
grant execute on function dock_game.claim_valid(text,uuid,text),public.imposter_claim_valid(text,uuid,text) to anon,authenticated;
