import { SUPABASE_URL, SUPABASE_KEY } from '../config/supabase.js';
export async function gameRpc(name,args,token=null){
 const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',credentials:'omit',headers:{apikey:SUPABASE_KEY,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(args)});
 const data=await response.json();if(!response.ok)throw new Error(data.message||'Spiel nicht erreichbar. Bitte erneut versuchen.');return data;
}
