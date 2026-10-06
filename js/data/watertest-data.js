import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getAccessToken } from "../auth/auth.js";
const URL=`${SUPABASE_URL}/rest/v1/water_tests`;
function headers(prefer){const token=getAccessToken();if(!token)throw new Error("Keine aktive Anmeldung vorhanden.");const h={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"};if(prefer)h.Prefer=prefer;return h;}
export async function loadWaterTests(){
 const r=await fetch(`${URL}?select=id,year,week,values,created_at,updated_at&order=year.desc,week.desc`,{headers:headers()});
 if(!r.ok)throw new Error(await r.text());return r.json();
}
export async function loadWaterTest(year,week){
 const r=await fetch(`${URL}?year=eq.${year}&week=eq.${week}&select=id,year,week,values&limit=1`,{headers:headers()});
 if(!r.ok)throw new Error(await r.text());return (await r.json())[0]||null;
}
export async function saveWaterTest(year,week,values){
 const existing=await loadWaterTest(year,week);
 if(existing){
  const r=await fetch(`${URL}?id=eq.${existing.id}`,{method:"PATCH",headers:headers("return=minimal"),body:JSON.stringify({values,updated_at:new Date().toISOString()})});
  if(!r.ok)throw new Error(await r.text());return;
 }
 const r=await fetch(URL,{method:"POST",headers:headers("return=minimal"),body:JSON.stringify({year,week,values,updated_at:new Date().toISOString()})});
 if(!r.ok)throw new Error(await r.text());
}