-- Owner archives retain completed results after manually ending a game.
create or replace function dock_sieve.manage(p_action text,p_game uuid,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare g dock_sieve.games;begin
 if auth.uid() is null then raise exception 'Bitte anmelden';end if;
 if p_action='list' then return jsonb_build_object('games',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'state',state) order by created_at desc) from dock_sieve.games where owner_id=auth.uid()),'[]'));end if;
 if p_action='create' then insert into dock_sieve.games(owner_id,name) values(auth.uid(),trim(p_data->>'name')) returning id into p_game;return jsonb_build_object('id',p_game);end if;
 select * into g from dock_sieve.games where id=p_game and owner_id=auth.uid() for update;if not found then raise exception 'Spiel nicht verfügbar';end if;
 if p_action='view' then return jsonb_build_object('game',jsonb_build_object('id',g.id,'name',g.name,'state',g.state,'token',g.token,'words_per_player',g.words_per_player,'category_count',g.category_count,'joker_limit',g.joker_limit),'status',dock_sieve.status(g.token),'results',coalesce((select jsonb_agg(jsonb_build_object('number',number,'completed',completed,'words_a',words_a,'words_b',words_b,'jokers_a',jokers_a,'jokers_b',jokers_b,'bonus_a',bonus_a,'bonus_b',bonus_b) order by number) from dock_sieve.categories where game_id=g.id and completed),'[]'),'players',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'claimed',exists(select 1 from dock_sieve.claims c where c.game_id=g.id and c.player_id=p.id)) order by created_at,id) from dock_sieve.players p where game_id=g.id),'[]'));
 elsif p_action in('player','delete_player','configure','start') then
  if g.state<>'draft' then raise exception 'Konfiguration nach Spielstart gesperrt';end if;
  if p_action='player' then if (select count(*) from dock_sieve.players where game_id=g.id)>=100 then raise exception 'Maximal 100 Spieler';end if;insert into dock_sieve.players(game_id,name) values(g.id,trim(p_data->>'name'));
  elsif p_action='delete_player' then delete from dock_sieve.players where game_id=g.id and id=(p_data->>'id')::uuid;
  elsif p_action='configure' then update dock_sieve.games set words_per_player=(p_data->>'words_per_player')::int,category_count=(p_data->>'category_count')::int,joker_limit=(p_data->>'joker_limit')::int where id=g.id;
  else if (select count(*) from dock_sieve.players where game_id=g.id)<4 then raise exception 'Mindestens vier Spieler für zwei Teams erforderlich';end if;update dock_sieve.games set state='active',token=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','') where id=g.id;end if;
 elsif p_action='reset_claim' then delete from dock_sieve.claims where game_id=g.id and player_id=(p_data->>'id')::uuid;
 elsif p_action='end' then update dock_sieve.games set state='ended',current_turn=null where id=g.id;update dock_sieve.turns set phase='closed' where game_id=g.id and phase<>'closed';
 elsif p_action='delete' then delete from dock_sieve.games where id=g.id;
 else raise exception 'Unbekannte Aktion';end if;return jsonb_build_object('ok',true);
end $$;

