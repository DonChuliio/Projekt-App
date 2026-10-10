begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare g uuid;v jsonb;i int;begin
 for i in 1..2 loop
  g=(public.celebrity_manage('create',null,jsonb_build_object('name','Synthetic cross-game '||i))->>'id')::uuid;
  perform public.celebrity_manage('player',g,'{"name":"Synthetic shared player"}');
  perform public.celebrity_manage('player',g,jsonb_build_object('name','Synthetic other player '||i));
  perform public.celebrity_manage('start',g);v=public.celebrity_manage('view',g);perform set_config('celeb.cross.token'||i,v->'game'->>'token',true);
 end loop;
end $$;
reset role;
set local role anon;
do $$declare token text;s jsonb;p jsonb;secret text;shared text;other text;i int;begin
 for i in 1..2 loop
  token=current_setting('celeb.cross.token'||i);s=public.celebrity_status(token);
  for p in select value from jsonb_array_elements(s->'players') loop
   secret=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
   perform public.celebrity_claim(token,(s->>'round_id')::uuid,(p->>'id')::uuid,secret);
   perform public.celebrity_action(token,(s->>'round_id')::uuid,secret,'submit','{"celebrity":"Synthetic cross-game celebrity"}');
   if p->>'name'='Synthetic shared player' then shared=secret;else other=secret;end if;
  end loop;
  perform public.celebrity_action(token,(s->>'round_id')::uuid,shared,'win');
  perform public.celebrity_action(token,(s->>'round_id')::uuid,other,'win');
 end loop;
end $$;
reset role;
set local role authenticated;
do $$declare v jsonb;s jsonb;begin
 v=public.celebrity_manage('list');select value into s from jsonb_array_elements(v->'stats') where value->>'name'='Synthetic shared player';
 if s is null or (s->>'rounds')::int<>2 or (s->>'firsts')::int<>2 or jsonb_array_length(s->'placements')<>2 then raise exception 'Cross-game stats failed';end if;
end $$;
reset role;
rollback;
