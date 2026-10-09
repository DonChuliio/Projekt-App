export function createPublicGame({token,rpc,changed,storage}){
 const key='dock-imposter-round:'+token;
 let status=null,claim=null,result=null,visible=false,busy=false,version=0,error='',notice='';
 try{const saved=JSON.parse(storage?.getItem(key)||'null');if(saved&&typeof saved.secret==='string'&&typeof saved.round_id==='string')claim=saved;}catch{}
 const clear=()=>{claim=null;result=null;visible=false;try{storage?.removeItem(key);}catch{}};
 const emit=()=>changed({status,claimed:Boolean(claim),result:visible?result:null,busy,error,notice});
 async function poll(){try{const next=await rpc('imposter_status',{p_token:token});const newer=status?.round_id&&status.round_id!==next.round_id;
  if(newer||next.state!=='live'||claim&&claim.round_id!==next.round_id){version++;clear();notice=newer&&next.state==='live'?'Neue Runde verfügbar – Namen auswählen':'';}
  if(claim&&next.state==='live'&&claim.round_id===next.round_id){const valid=await rpc('imposter_claim_valid',{p_token:token,p_round:claim.round_id,p_secret:claim.secret});if(!valid){version++;clear();notice='Deine Belegung wurde zurückgesetzt – Namen auswählen';}}
  status=next;error='';emit();
 }catch{version++;result=null;visible=false;error='Verbindung unterbrochen. Rollen sind verborgen. Es wird erneut versucht.';emit();}}
 async function select(player){if(busy||claim||status?.state!=='live')return;busy=true;error='';const round=status.round_id,generation=version;emit();try{const response=await rpc('imposter_claim',{p_token:token,p_round:round,p_player:player});if(generation!==version||status?.round_id!==round)return;claim={round_id:round,secret:response.secret};try{storage?.setItem(key,JSON.stringify(claim));}catch{}result=response.result;visible=true;notice='';}catch(e){if(generation===version){error=e.message;result=null;visible=false;}}finally{busy=false;emit();}}
 async function show(){if(busy||!claim||status?.state!=='live')return;busy=true;error='';const generation=version;emit();try{const response=await rpc('imposter_role',{p_token:token,p_round:claim.round_id,p_secret:claim.secret});if(generation===version){result=response;visible=true;}}catch(e){if(generation===version){clear();error=e.message;}}finally{busy=false;emit();}}
 function hide(){visible=false;result=null;emit();}
 function suspend(){version++;visible=false;result=null;emit();}
 function close(){version++;clear();status=null;emit();}
 return {poll,select,show,hide,suspend,close};
}
