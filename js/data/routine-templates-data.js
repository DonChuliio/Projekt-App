import { SUPABASE_URL, SUPABASE_KEY } from '../config/supabase.js';
import { getSession, getValidAccessToken } from '../auth/auth.js';
async function request(path,method='GET',body){
 const owner=getSession()?.user?.id;
 if(!owner)throw new Error('Bitte zuerst anmelden.');
 const token=await getValidAccessToken();
 if(getSession()?.user?.id!==owner)throw new Error('Anmeldung wurde geändert. Bitte erneut öffnen.');
 const response=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{method,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!response.ok)throw new Error('Routinen konnten nicht gespeichert oder geladen werden. Bitte erneut versuchen.');
 const text=await response.text();return text?JSON.parse(text):null;
}
export async function loadRoutineTemplates(){
 await request('rpc/ensure_routine_templates','POST',{});
 const [columns,tasks]=await Promise.all([request('routine_columns?select=id,name&active=eq.true&order=created_at.asc'),request('routine_tasks?select=task_id,column_id,name,weeks&active=eq.true&order=created_at.asc')]);return {columns,tasks};
}
export async function addRoutineColumn(name){return (await request('routine_columns','POST',{name}))[0];}
export async function addRoutineTask(column_id,name){return (await request('routine_tasks','POST',{column_id,name,weeks:[]}))[0];}
export async function setRoutineWeeks(task_id,weeks,previousWeeks){const rows=await request(`routine_tasks?task_id=eq.${encodeURIComponent(task_id)}&active=eq.true&weeks=eq.${encodeURIComponent('{'+previousWeeks.join(',')+'}')}`,'PATCH',{weeks});if(rows.length!==1)throw new Error('Aufgabe geändert oder nicht mehr verfügbar. Bitte neu laden.');return rows[0];}
export async function archiveRoutineTask(task_id){const rows=await request(`routine_tasks?task_id=eq.${encodeURIComponent(task_id)}&active=eq.true`,'PATCH',{active:false});if(rows.length!==1)throw new Error('Aufgabe geändert oder nicht mehr verfügbar. Bitte neu laden.');}
export async function archiveRoutineColumn(id){await request('rpc/archive_routine_column','POST',{p_id:id});}
