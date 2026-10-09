create policy deny_direct_roles on dock_game.roles to anon,authenticated using(false) with check(false);
create policy deny_direct_claims on dock_game.claims to anon,authenticated using(false) with check(false);
