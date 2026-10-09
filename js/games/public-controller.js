export function createPublicGame({token,rpc,changed,storage}){
 const key='dock-imposter-player:'+token;
 let status=null,claim=null,result=null,busy=false,version=0,pollSerial=0,error='',notice='',lastEmission='';
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved&&typeof saved.secret==='string'&&typeof saved.player_id==='string')claim={secret:saved.secret,player_id:saved.player_id};}catch{}
 const clear=()=>{claim=null;result=null;try{storage?.removeItem(key);}catch{}};
 const emit=()=>{const state={status,claimed:Boolean(claim),playerId:claim?.player_id,result,busy,error,notice},signature=JSON.stringify(state);if(signature!==lastEmission){lastEmission=signature;changed(state);}};
 async function poll(){const serial=++pollSerial,generation=version;try{const next=await rpc('imposter_status',{p_token:token});if(serial!==pollSerial||generation!==version)return;const different=status?.round_id!==next.round_id||status?.state!==next.state;
  if(different){version++;result=null;notice=status?.round_id&&status.round_id!==next.round_id?'Neue Runde – neue Spielleitung':'';}
  if(next.state==='unavailable'){version++;clear();notice='';}
  else if(claim){const acceptedVersion=version;const valid=await rpc('imposter_claim_valid',{p_token:token,p_round:next.round_id,p_secret:claim.secret});if(serial!==pollSerial||acceptedVersion!==version)return;if(!valid){version++;clear();notice='Deine Belegung wurde zurückgesetzt. Bitte Namen neu auswählen.';}}
  status=next;error='';emit();
 }catch{if(serial!==pollSerial||generation!==version)return;version++;result=null;error='Verbindung unterbrochen. Rollen sind verborgen. Bitte aktualisieren.';emit();}}
 async function select(player){if(busy||claim||!status?.round_id||status.state==='unavailable')return;busy=true;error='';const round=status.round_id,generation=version;emit();try{const response=await rpc('imposter_claim',{p_token:token,p_round:round,p_player:player});if(status?.state==='unavailable')return;claim={secret:response.secret,player_id:response.player_id};try{storage?.setItem(key,JSON.stringify(claim));}catch{}if(generation===version)result=response.result;}catch(e){error=e.message;result=null;}finally{busy=false;emit();}}
 async function show(){if(busy||!claim||!status?.round_id||error)return;busy=true;const generation=version;error='';emit();try{const response=await rpc('imposter_role',{p_token:token,p_round:status.round_id,p_secret:claim.secret});if(generation===version)result=response;}catch(e){result=null;error=e.message;}finally{busy=false;emit();}}
 async function host(action,data={}){if(busy||!claim||claim.player_id!==status?.host_id)return;busy=true;error='';const generation=++version;emit();try{await rpc('imposter_host_action',{p_token:token,p_round:status.round_id,p_secret:claim.secret,p_action:action,p_data:data});if(generation===version){result=null;await poll();}}catch(e){error=e.message;}finally{busy=false;emit();}}
 async function refresh(){if(busy)return;await poll();if(!error)await show();}
 const hide=()=>{version++;result=null;emit();};
 function close(){version++;clear();status=null;emit();}
 return {poll,select,show,host,refresh,hide,suspend:hide,close};
}
