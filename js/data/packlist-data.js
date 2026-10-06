import { SUPABASE_URL, SUPABASE_KEY } from "../config/supabase.js";
import { getAccessToken } from "../auth/auth.js";
const URL = `${SUPABASE_URL}/rest/v1/packlists`;
function headers(prefer) {
 const token=getAccessToken(); if(!token) throw new Error("Keine aktive Anmeldung vorhanden.");
 const h={"apikey":SUPABASE_KEY,"Authorization":`Bearer ${token}`,"Content-Type":"application/json"};
 if(prefer) h.Prefer=prefer; return h;
}
export async function loadPacklists(){
 const r=await fetch(`${URL}?select=id,name,buckets,progress,created_at&order=created_at.asc`,{headers:headers()});
 if(!r.ok) throw new Error(await r.text()); return r.json();
}
export async function createPacklist(name){
 const r=await fetch(URL,{method:"POST",headers:headers("return=representation"),body:JSON.stringify({name,buckets:[],progress:[]})});
 if(!r.ok) throw new Error(await r.text()); return (await r.json())[0];
}
export async function updatePacklist(id, changes){
 const r=await fetch(`${URL}?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",headers:headers("return=representation"),body:JSON.stringify(changes)});
 if(!r.ok) throw new Error(await r.text()); return (await r.json())[0];
}
export async function deletePacklist(id){
 const r=await fetch(`${URL}?id=eq.${encodeURIComponent(id)}`,{method:"DELETE",headers:headers()});
 if(!r.ok) throw new Error(await r.text());
}
export async function loadPacklist(id){
 const r=await fetch(`${URL}?id=eq.${encodeURIComponent(id)}&select=id,name,buckets,progress&limit=1`,{headers:headers()});
 if(!r.ok) throw new Error(await r.text()); return (await r.json())[0]||null;
}