import { SUPABASE_URL, SUPABASE_KEY } from '../config/supabase.js';
import { getSession, getValidAccessToken } from '../auth/auth.js';
import { validateReminder, reminderDay } from '../reminders/model.js?v=1.109';
const url = SUPABASE_URL+'/rest/v1/planner_reminders';
const fields = 'id,title,reminder_date,reminder_time,description,timezone,archived_at,push_status,push_status_at,push_attempts,push_successes,push_failures';
export const reminderId = value => typeof value==='string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
async function request(query='', method='GET', body) {
 const owner=getSession()?.user?.id;
 if(!owner)throw Error('Bitte anmelden.');
 const token=await getValidAccessToken();
 if(!token || owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
 const response=await fetch(url+query,{method,cache:'no-store',headers:{apikey:SUPABASE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{})});
 if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
 if(!response.ok)throw Error('Erinnerung konnte nicht geladen oder gespeichert werden ('+response.status+'). Bitte erneut versuchen.');
 const rows=await response.json();
 if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
 if(!Array.isArray(rows))throw Error('Ungültige Antwort für Erinnerungen.');
 return rows;
}
export async function loadReminders(day=reminderDay()) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Ungültiges Datum.');
 return request('?select='+fields+'&archived_at=is.null&push_status=in.(pending,processing)&reminder_date=gte.'+encodeURIComponent(day)+'&order=reminder_date.asc,reminder_time.asc.nullsfirst,title.asc');
}
export async function loadReminderArchive(){
 const owner=getSession()?.user?.id,rows=[],pageSize=200;
 for(let offset=0;;offset+=pageSize){
  const page=await request('?select='+fields+'&archived_at=not.is.null&order=reminder_date.desc,reminder_time.desc.nullslast,archived_at.desc,id.desc&limit='+pageSize+'&offset='+offset);
  if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');
  rows.push(...page);if(page.length<pageSize)return rows;
 }
}
export function loadUnsentReminders(day=reminderDay()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Ungültiges Datum.');
 return request('?select='+fields+'&archived_at=is.null&or=(reminder_date.lt.'+day+',push_status.in.(failed,no_subscription,missed,uncertain))&order=reminder_date.desc,reminder_time.desc.nullslast,id.desc');
}
export async function loadTodayReminders(day=reminderDay(),end=day){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('Ungültiges Datum.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<day)throw Error('Ungültiges Datum.');
 if(end===day)return request('?select='+fields+'&reminder_date=eq.'+day+'&order=reminder_time.asc.nullsfirst,title.asc');
 const owner=getSession()?.user?.id,rows=[];
 for(let offset=0;;offset+=200){const page=await request('?select='+fields+'&reminder_date=gte.'+day+'&reminder_date=lte.'+end+'&order=reminder_date.asc,reminder_time.asc.nullsfirst,title.asc,id.asc&limit=200&offset='+offset);if(owner!==getSession()?.user?.id)throw Error('Anmeldung geändert.');rows.push(...page);if(page.length<200)return rows;}
}
export async function loadReminder(id) {
 if(!reminderId(id))throw Error('Ungültige Erinnerung.');
 const rows=await request('?select='+fields+'&id=eq.'+id);
 if(!rows[0])throw Error('Diese Erinnerung ist nicht mehr vorhanden oder nicht zugänglich.');
 return rows[0];
}
export async function saveReminder(value, id=null) {
 if(id!==null&&!reminderId(id))throw Error('Ungültige Erinnerung.');
 const rows=await request(id?'?id=eq.'+id+'&archived_at=is.null&push_status=eq.pending':'',id?'PATCH':'POST',validateReminder(value));
 if(rows.length!==1)throw Error('Erinnerung nicht mehr vorhanden. Bitte Übersicht neu laden.');
 return rows[0];
}
export async function deleteReminder(id) {
 if(!reminderId(id))throw Error('Ungültige Erinnerung.');
 const rows=await request('?id=eq.'+id,'DELETE');
 if(rows.length!==1)throw Error('Erinnerung nicht mehr vorhanden. Bitte Übersicht neu laden.');
}
