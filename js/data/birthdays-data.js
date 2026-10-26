import { SUPABASE_URL,SUPABASE_KEY } from '../config/supabase.js';
import { getSession,getValidAccessToken } from '../auth/auth.js';
import { validateBirthday } from '../birthdays/model.js?v=1.111';
const base=SUPABASE_URL+'/rest/v1/planner_birthdays';
const fields='id,name,birth_date';
export const birthdayId=value=>typeof value==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
async function request(query,method='GET',body){
 const owner=getSession()?.user?.id;if(!owner)throw Error('Bitte anmelden.');
 const token=await getValidAccessToken();if(!token||owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
 const response=await fetch(base+query,{method,cache:'no-store',credentials:'omit',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
 if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
 if(!response.ok)throw Error('Geburtstage konnten nicht geladen oder gespeichert werden. Bitte erneut versuchen.');
 const rows=await response.json();if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
 if(!Array.isArray(rows))throw Error('Ungültige Antwort für Geburtstage.');return rows;
}
export async function loadBirthdays(){
 const owner=getSession()?.user?.id,rows=[],pageSize=200;
 for(let offset=0;;offset+=pageSize){
  const page=await request('?select='+fields+'&order=created_at.asc,id.asc&limit='+pageSize+'&offset='+offset);
  if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');rows.push(...page);if(page.length<pageSize)return rows;
 }
}
export async function loadBirthday(id){if(!birthdayId(id))throw Error('Ungültiger Geburtstag.');const rows=await request('?select='+fields+'&id=eq.'+id);if(!rows[0])throw Error('Geburtstag nicht mehr vorhanden oder nicht zugänglich.');return rows[0];}
export async function saveBirthday(value,id=null){
 if(id!==null&&!birthdayId(id))throw Error('Ungültiger Geburtstag.');
 const rows=await request(id?'?id=eq.'+id:'',id?'PATCH':'POST',validateBirthday(value));
 if(rows.length!==1)throw Error('Geburtstag nicht mehr vorhanden. Bitte neu laden.');return rows[0];
}
export async function deleteBirthday(id){if(!birthdayId(id))throw Error('Ungültiger Geburtstag.');const rows=await request('?id=eq.'+id,'DELETE');if(rows.length!==1)throw Error('Geburtstag nicht mehr vorhanden. Bitte neu laden.');}
