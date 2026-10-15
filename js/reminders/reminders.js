import { getSession } from '../auth/auth.js';
import { showView } from '../router.js';
import { loadReminders, loadReminder, saveReminder, deleteReminder, reminderId } from '../data/reminders-data.js?v=1.103';
import { upcomingReminders, reminderDay, reminderLabel } from './model.js?v=1.103';
export function initReminders() {
 const list=document.getElementById('reminders-content'),detail=document.getElementById('reminder-detail-content'),editor=document.getElementById('reminder-edit-content');
 if(!list||!detail||!editor)return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 const visible=name=>!document.querySelector('[data-view="'+name+'"]')?.classList.contains('hidden');
 let epoch=0,serial=0,busy=false,selected=null,editFrom=null;
 const current=(generation,owner)=>generation===epoch&&getSession()?.user?.id===owner;
 const status=(root,text)=>{let p=root.querySelector('[role="status"]');if(!p){p=el('p');p.setAttribute('role','status');root.prepend(p);}p.textContent=text;};
 function goList(){if(busy)return;selected=null;showView('reminders');refresh();}
 function drawList(rows){list.replaceChildren(button('Neue Erinnerung',()=>edit(null)));if(!rows.length)list.append(el('p','Keine kommenden Erinnerungen.'));for(const r of rows){const b=button(undefined,()=>open(r.id));b.className='reminder-row';b.append(el('strong',r.title),el('span',reminderLabel(r)));list.append(b);}}
 async function refresh(){const owner=getSession()?.user?.id,generation=epoch,request=++serial;if(!visible('reminders'))return;if(!owner){list.replaceChildren(el('p','Bitte anmelden.'));return;}if(!list.children.length)list.append(el('p','Erinnerungen werden geladen …'));
  try{const rows=upcomingReminders(await loadReminders());if(!current(generation,owner)||request!==serial)return;if(visible('reminders'))drawList(rows);}
  catch{if(current(generation,owner)&&request===serial){if(visible('reminders')){list.replaceChildren(button('Neue Erinnerung',()=>edit(null)),el('p','Erinnerungen konnten nicht geladen werden.'),button('Erneut versuchen',refresh));}}}
 }
 async function run(root,fn){if(busy||!getSession())return;busy=true;const generation=epoch,owner=getSession()?.user?.id;root.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=true);try{await fn(()=>current(generation,owner));}catch(e){if(current(generation,owner))status(root,e.message);}finally{busy=false;root.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=false);}}
 function drawDetail(row){selected=row;detail.replaceChildren(el('h3',row.title),el('p',reminderLabel(row)),el('p',row.description||'Keine Beschreibung.','reminder-description'),button('Bearbeiten',()=>edit(row)),button('Löschen',()=>{
  if(detail.querySelector('.reminder-confirm'))return;const box=el('section',undefined,'reminder-confirm');box.append(el('p','Diese Erinnerung wirklich löschen?'),button('Löschen bestätigen',()=>run(detail,async valid=>{await deleteReminder(row.id);if(!valid()||!visible('reminder-detail'))return;selected=null;showView('reminders');await refresh();})),button('Abbrechen',()=>box.remove()));detail.append(box);
 }));}
 async function open(id){if(!reminderId(id)||busy)return;const generation=++epoch,owner=getSession()?.user?.id;selected=null;showView('reminder-detail');detail.replaceChildren(el('p','Erinnerung wird geladen …'));if(!owner){status(detail,'Bitte anmelden.');return;}
  try{const row=await loadReminder(id);if(current(generation,owner)&&visible('reminder-detail'))drawDetail(row);}catch(e){if(current(generation,owner))detail.replaceChildren(el('p',e.message),button('Erneut versuchen',()=>open(id)));}
 }
 function edit(row){if(busy)return;editFrom=row;showView('reminder-edit');editor.replaceChildren();const form=el('form'),fields={};
  for(const [key,title,type,value] of [['title','Titel','text',row?.title||''],['reminder_date','Datum','date',row?.reminder_date||reminderDay()],['reminder_time','Uhrzeit (optional)','time',row?.reminder_time?.slice(0,5)||''],['description','Beschreibung (optional)','textarea',row?.description||'']]){const label=el('label',title),input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.required=['title','reminder_date'].includes(key);input.setAttribute('aria-label',title);if(key==='title')input.maxLength=200;if(key==='description')input.maxLength=5000;if(key==='reminder_time')input.step=60;label.append(input);form.append(label);fields[key]=input;}
  const submit=el('button','Speichern');submit.type='submit';form.append(submit,button('Abbrechen',()=>{if(busy)return;if(editFrom){showView('reminder-detail');drawDetail(editFrom);}else goList();}));
  form.addEventListener('submit',event=>{event.preventDefault();run(form,async valid=>{const rowSaved=await saveReminder({...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value])),timezone:'Europe/Berlin'},row?.id||null);if(!valid()||!visible('reminder-edit'))return;showView('reminder-detail');drawDetail(rowSaved);refresh();});});editor.append(form);
 }
 document.getElementById('reminders-back').addEventListener('click',()=>{if(!busy){epoch++;showView('planner');refresh();}});
 document.getElementById('reminder-detail-back').addEventListener('click',goList);
 document.getElementById('reminder-edit-back').addEventListener('click',()=>{if(busy)return;if(editFrom){showView('reminder-detail');drawDetail(editFrom);}else goList();});
 document.addEventListener('dock:open-reminder',event=>open(event.detail?.id));
 document.addEventListener('dock:auth-changed',()=>{epoch++;serial++;selected=null;editFrom=null;busy=false;list.replaceChildren();detail.replaceChildren();editor.replaceChildren();refresh();});
 new MutationObserver(()=>{if(visible('reminders'))refresh();}).observe(document.querySelector('main')||document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
 const tick=()=>{if(document.visibilityState!=='hidden'&&visible('reminders'))refresh();};let timer=setInterval(tick,60000);window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(tick,60000);tick();});
 refresh();
}
