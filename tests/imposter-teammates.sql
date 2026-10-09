begin;
select set_config('request.jwt.claim.sub',(select id::text from auth.users order by id limit 1),true);
set local role authenticated;
do $$declare g uuid;i int;j int;v jsonb;begin
 for i in 1..3 loop
  g=(public.imposter_manage('create',null,'{"name":"Synthetic teammate test"}')->>'id')::uuid;
  v=public.imposter_manage('view',g);if (v->'game'->>'reveal_imposters')::boolean then raise exception 'Not default off';end if;
  for j in 1..6 loop perform public.imposter_manage('player',g,jsonb_build_object('name','Synthetic name '||j));end loop;
  perform public.imposter_manage('configure',g,jsonb_build_object('expected_players',6,'imposters',case when i=3 then 1 else 2 end,'reveal_imposters',i>1));
  v=public.imposter_manage('view',g);if (v->'game'->>'reveal_imposters')::boolean<>(i>1) then raise exception 'Setting not saved';end if;
  perform public.imposter_manage('start',g);v=public.imposter_manage('view',g);perform set_config('dock.team.token'||i,v->'game'->>'token',true);
  begin perform public.imposter_manage('configure',g,'{"reveal_imposters":false}');raise exception 'Active setting changed';exception when raise_exception then if sqlerrm='Active setting changed' then raise;end if;end;
 end loop;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$declare i int;token text;s jsonb;r uuid;host uuid;secret text;p jsonb;answer jsonb;imps text[];seen text[]:='{}';begin
 for i in 1..3 loop
  token=current_setting('dock.team.token'||i);s=public.imposter_status(token);r=(s->>'round_id')::uuid;host=(s->>'host_id')::uuid;
  if s ? 'teammates' or s ? 'roles' then raise exception 'Public status exposed roles';end if;
  secret=public.imposter_claim(token,r,host)->>'secret';perform public.imposter_host_action(token,r,secret,'prepare','{"word":"Synthetic word","hint":"Synthetic hint"}');
  imps='{}';seen='{}';
  for p in select value from jsonb_array_elements(s->'players') loop
   if p->>'id'=host::text then answer=public.imposter_role(token,r,secret);if answer ? 'teammates' then raise exception 'Host learns teammates';end if;continue;end if;
   answer=public.imposter_claim(token,r,(p->>'id')::uuid)->'result';
   if answer->>'role'='imposter' then
    imps=array_append(imps,p->>'name');if answer ? 'word' then raise exception 'Imposter word leak';end if;
    if i=1 then if answer ? 'teammates' then raise exception 'Off leaked names';end if;
    else
     if jsonb_array_length(answer->'teammates')<>(case when i=3 then 0 else 1 end) then raise exception 'Wrong teammate count';end if;
     if answer->'teammates' ? (p->>'name') then raise exception 'Own name included';end if;
     select seen||coalesce(array_agg(value),'{}') into seen from jsonb_array_elements_text(answer->'teammates');
    end if;
   elsif answer ? 'teammates' or answer ? 'hint' then raise exception 'Normal player exposed names/hint';end if;
  end loop;
  if i=2 and not (seen @> imps and imps @> seen) then raise exception 'Wrong teammate identities';end if;
 end loop;
end $$;
reset role;
rollback;
