export function createPublicGame({token,rpc,changed,storage}){
 const key='dock-imposter-player:'+token;
 let status=null,claim=null,result=null,summary=null,held=false,busy=false,version=0,pollSerial=0,error='',notice='',lastEmission='';
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved&&typeof saved.secret==='string'&&typeof saved.player_id==='string')claim={secret:saved.secret,player_id:saved.player_id};}catch{}
 const clear=()=>{claim=null;held=false;result=null;summary=null;try{storage?.removeItem(key);}catch{}};
 const emit=()=>{const state={status,claimed:Boolean(claim),playerId:claim?.player_id,result,summary,busy,error,notice},signature=JSON.stringify(state);if(signature!==lastEmission){lastEmission=signature;changed(state);}};
 async function poll(){const serial=++pollSerial;let generation=version;try{const next=await rpc('imposter_status',{p_token:token});if(serial!==pollSerial||generation!==version)return;const different=status?.round_id!==next.round_id||status?.state!==next.state;
  if(different){version++;held=false;result=null;notice=status?.round_id&&status.round_id!==next.round_id?'Neue Runde – neue Rundenleitung':'';}
  if(next.state==='unavailable'){generation=version;held=false;result=null;notice='';status=next;emit();const final=claim?await rpc('imposter_personal_summary',{p_token:token,p_secret:claim.secret}):null;if(serial!==pollSerial||generation!==version)return;summary=final;if(!final)clear();}
  else if(claim){const acceptedVersion=version;const valid=await rpc('imposter_claim_valid',{p_token:token,p_round:next.round_id,p_secret:claim.secret});if(serial!==pollSerial||acceptedVersion!==version)return;if(!valid){version++;clear();notice='Deine Belegung wurde zurückgesetzt. Bitte Namen neu auswählen.';}}
  if(next.state!=='unavailable')summary=null;status=next;error='';emit();
 }catch{if(serial!==pollSerial||generation!==version)return;version++;held=false;result=null;error='Verbindung unterbrochen. Rollen sind verborgen. Bitte aktualisieren.';emit();}}
 async function select(player){if(busy||claim||!status?.round_id||status.state==='unavailable')return;busy=true;error='';const round=status.round_id,generation=version;emit();try{const response=await rpc('imposter_claim',{p_token:token,p_round:round,p_player:player});if(status?.state==='unavailable')return;claim={secret:response.secret,player_id:response.player_id};try{storage?.setItem(key,JSON.stringify(claim));}catch{}result=null;}catch(e){error=e.message;result=null;}finally{busy=false;emit();}}
 async function show(){if(busy||!claim||status?.state!=='live'||error)return;held=true;const generation=version;try{const response=await rpc('imposter_role',{p_token:token,p_round:status.round_id,p_secret:claim.secret});if(held&&generation===version){result=response;emit();}}catch(e){if(held&&generation===version){result=null;error=e.message;emit();}}}
 async function host(action,data={}){if(busy||!claim||claim.player_id!==status?.host_id)return;held=false;result=null;busy=true;error='';const generation=++version;emit();try{await rpc('imposter_host_action',{p_token:token,p_round:status.round_id,p_secret:claim.secret,p_action:action,p_data:data});if(generation===version){result=null;await poll();}}catch(e){error=e.message;}finally{busy=false;emit();}}
 async function refresh(){if(busy)return;hide();await poll();}
 const hide=()=>{version++;held=false;result=null;emit();};
 function close(){version++;clear();status=null;emit();}
 return {poll,select,show,host,refresh,hide,suspend:hide,close};
}
