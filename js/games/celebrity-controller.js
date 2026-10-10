export function createCelebrityGame({token,rpc,changed,storage,makeSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('')}){
 const key='dock-celebrity-round:'+token;
 let status=null,claim=null,context=null,others=null,notes='',lastPlacement=null,busy=false,error='',version=0,serial=0,lastEmission='';
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved&&typeof saved.round_id==='string'&&typeof saved.player_id==='string'&&/^[a-f0-9]{64}$/.test(saved.secret)){claim={round_id:saved.round_id,player_id:saved.player_id,secret:saved.secret};notes=typeof saved.notes==='string'?saved.notes.slice(0,5000):'';}}catch{}
 const save=()=>{try{if(claim)storage?.setItem(key,JSON.stringify({...claim,notes}));else storage?.removeItem(key);}catch{}};
 const clear=()=>{claim=null;context=null;others=null;notes='';save();};
 const emit=()=>{const state={status,claimed:Boolean(claim),playerId:claim?.player_id,context,others,notes,lastPlacement,busy,error},signature=JSON.stringify(state);if(signature!==lastEmission){lastEmission=signature;changed(state);}};
 async function poll(){const request=++serial;let generation=version;try{
  const next=await rpc('celebrity_status',{p_token:token});if(request!==serial||generation!==version)return;
  if(next.state==='unavailable'){version++;clear();status=next;lastPlacement=null;error='';emit();return;}
  if(status?.round_id!==next.round_id||status?.state!==next.state){version++;generation=version;others=null;}
  if(claim&&claim.round_id!==next.round_id){const old=claim;clear();status=next;emit();const completed=await rpc('celebrity_player',{p_token:token,p_round:old.round_id,p_secret:old.secret});if(request!==serial||generation!==version)return;if(completed?.phase==='completed'&&completed.position)lastPlacement={number:completed.number,position:completed.position,placements:completed.placements||[]};else lastPlacement=null;}
  if(claim){const own=await rpc('celebrity_player',{p_token:token,p_round:next.round_id,p_secret:claim.secret});if(request!==serial||generation!==version)return;if(!own){version++;clear();}else context=own;}
  status=next;error='';emit();
 }catch(e){if(request!==serial||generation!==version)return;version++;others=null;error='Verbindung unterbrochen. Bitte erneut versuchen.';emit();}}
 async function select(player){if(busy||claim||!status?.round_id||status.state==='unavailable')return;
  busy=true;error='';version++;claim={round_id:status.round_id,player_id:player,secret:makeSecret()};notes='';context=null;lastPlacement=null;save();emit();
  try{await rpc('celebrity_claim',{p_token:token,p_round:claim.round_id,p_player:player,p_secret:claim.secret});await poll();}catch(e){error=e.message;if(error.includes('Name bereits belegt'))clear();}finally{busy=false;emit();}
 }
 async function action(action,data={}){if(busy||!claim||!context||status?.state==='unavailable')return;busy=true;error='';others=null;const generation=++version,credential={...claim};emit();
  try{const result=await rpc('celebrity_action',{p_token:token,p_round:credential.round_id,p_secret:credential.secret,p_action:action,p_data:data});if(generation!==version)return;if(action==='win'&&result.position)lastPlacement={number:result.number,position:result.position};await poll();}catch(e){error=e.message;}finally{busy=false;emit();}
 }
 async function show(){if(busy||!claim||status?.state!=='guessing'||error)return;const generation=version;try{const result=await rpc('celebrity_others',{p_token:token,p_round:claim.round_id,p_secret:claim.secret});if(generation===version){others=result;emit();}}catch(e){if(generation===version){others=null;error=e.message;emit();}}}
 const hide=()=>{version++;others=null;emit();};
 const setNotes=text=>{if(!claim||!status?.notes_enabled)return;notes=text.slice(0,5000);save();};
 const refresh=async()=>{if(busy)return;hide();await poll();};
 const close=()=>{version++;clear();status=null;lastPlacement=null;emit();};
 return {poll,select,action,show,hide,setNotes,refresh,suspend:hide,close};
}
