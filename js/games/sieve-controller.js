// Server deadlines govern both actions and the local, monotonic display.
export function createSieveGame({token,rpc,changed,storage,now=()=>performance.now(),uuid=()=>crypto.randomUUID(),makeSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')}){
 const key='dock-sieve-claim:'+token;let status=null,claim=null,player=null,word=null,busy=false,error='',version=0,serial=0,remaining=0,anchor=0,deadline=null,pending=null;
 try{const v=JSON.parse(storage?.getItem(key)||'null');if(v&&typeof v.player_id==='string'&&/^[a-f0-9]{64}$/.test(v.secret))claim=v;}catch{}
 const save=()=>{try{if(claim)storage?.setItem(key,JSON.stringify({player_id:claim.player_id,secret:claim.secret}));else storage?.removeItem(key);}catch{}};
 const emit=()=>changed({status,player,claimed:Boolean(claim),word,busy,error,remaining,pending:Boolean(pending)});
 const hide=()=>{version++;word=null;emit();};
 function tick(){if(deadline!==null){remaining=Math.max(0,deadline-(now()-anchor));if(remaining===0&&word!==null){version++;word=null;}emit();}}
 async function poll(){const request=++serial,generation=version,start=now();try{
  const s=await rpc('sieve_status',{p_token:token});if(request!==serial||generation!==version)return;
  const identity=`${s.turn?.id||''}:${s.turn?.word_number||''}:${s.turn?.phase||''}`;const prior=`${status?.turn?.id||''}:${status?.turn?.word_number||''}:${status?.turn?.phase||''}`;
  if(identity!==prior){version++;word=null;}status=s;
  // Calibrate from the status request alone; subsequent identity lookup consumes time.
  anchor=now();deadline=s.turn?.phase==='running'?Math.max(0,s.turn.deadline-s.server_now-(anchor-start)/2):null;
  if(s.state==='unavailable'){claim=null;player=null;pending=null;word=null;save();}
  else if(claim){const own=await rpc('sieve_player',{p_token:token,p_secret:claim.secret});if(request!==serial)return;if(!own){claim=null;player=null;pending=null;word=null;version++;save();}else player=own;}
  remaining=deadline===null?0:Math.max(0,deadline-(now()-anchor));if(!pending)error='';emit();
 }catch(e){if(request!==serial)return;version++;word=null;error='Verbindung unterbrochen. Bitte erneut versuchen.';emit();}}
 async function select(id){if(busy||claim||!status||status.state!=='active')return;busy=true;error='';version++;serial++;claim={player_id:id,secret:makeSecret()};save();emit();
  try{await rpc('sieve_claim',{p_token:token,p_player:id,p_secret:claim.secret});await poll();}catch(e){error=e.message;if(error.includes('Name bereits belegt')){claim=null;save();}}finally{busy=false;emit();}
 }
 async function execute(){if(!pending||busy||!claim)return;busy=true;error='';hide();const op=pending;try{await rpc('sieve_action',{p_token:token,p_secret:claim.secret,p_operation:op.id,p_action:op.action,p_data:op.data});if(pending===op)pending=null;await poll();}catch(e){error=e.message;}finally{busy=false;emit();}}
 async function action(action,data={}){if(busy||pending||!player||status?.state!=='active')return;
  // Only an explicit retry resends an uncertain action. Fresh actions get fresh IDs.
  pending={id:uuid(),action,data:{turn_id:status.turn?.id,word_number:status.turn?.word_number,category:status.category,...data}};await execute();
 }
 async function show(){tick();if(busy||error||!player||status?.turn?.player_id!==player.id||status.turn.phase!=='running'||remaining<=0)return;const generation=version,turn=status.turn;try{
  const r=await rpc('sieve_word',{p_token:token,p_secret:claim.secret,p_turn:turn.id,p_number:turn.word_number});tick();if(generation===version&&remaining>0&&r.turn_id===turn.id&&r.word_number===turn.word_number){word=r.word;emit();}
 }catch(e){if(generation===version){word=null;error=e.message;emit();}}
 }
 return {poll,select,action,show,hide,tick,retry:execute,refresh:async()=>{pending=null;hide();await poll();},suspend:hide};
}
