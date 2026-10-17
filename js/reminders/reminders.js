import { getSession } from '../auth/auth.js';
import { showView } from '../router.js';
import { loadReminders, loadReminderArchive, loadUnsentReminders, loadReminder, saveReminder, deleteReminder, reminderId } from '../data/reminders-data.js?v=1.109';
import { upcomingReminders, archivedReminders, reminderPushLabel, reminderDay, reminderLabel } from './model.js?v=1.109';
export function initReminders() {
 const list=document.getElementById('reminders-content'),detail=document.getElementById('reminder-detail-content'),editor=document.getElementById('reminder-edit-content');
 const archive=document.getElementById('reminder-archive-content');
 if(!list||!detail||!editor||!archive)return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 const icon=(label,path,fn)=>{const b=button(undefined,fn);b.className='reminder-icon';b.setAttribute('aria-label',label);b.title=label;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',path);svg.append(p);b.append(svg);return b;};
 const visible=name=>!document.querySelector('[data-view="'+name+'"]')?.classList.contains('hidden');
 let epoch=0,serial=0,busy=false,selected=null,editFrom=null,detailFrom='reminders';
 const current=(generation,owner)=>generation===epoch&&getSession()?.user?.id===owner;
 const status=(root,text)=>{let p=root.querySelector('[role="status"]');if(!p){p=el('p');p.setAttribute('role','status');root.prepend(p);}p.textContent=text;};
 function goList(){if(busy)return;selected=null;detailFrom='reminders';showView('reminders');refresh();}
 function goArchive(){if(busy)return;selected=null;detailFrom='reminder-archive';showView('reminder-archive');refresh();}
 function archiveButton(){const b=icon('Archiv','M3 7V4h6l2 3h10v13H3V7z',goArchive);b.className='reminder-folder reminder-icon';b.append(el('span','Archiv'));return b;}
 function rowButton(r,origin,withStatus=false){const b=button(undefined,()=>open(r.id,origin));b.className='reminder-row';b.append(el('strong',r.title),el('span',reminderLabel(r)));if(withStatus)b.append(el('span',reminderPushLabel(r)));return b;}
 function drawList(rows,unsent){list.replaceChildren(button('Neue Erinnerung',()=>edit(null)),archiveButton(),el('h3','Kommende Erinnerungen'));if(!rows.length)list.append(el('p','Keine kommenden Erinnerungen.'));for(const r of rows)list.append(rowButton(r,'reminders'));if(unsent.length){list.append(el('h3','Ohne bestätigten Versand'),el('p','Diese Erinnerungen bleiben gespeichert. Es erfolgt kein automatischer Nachversand.','reminder-help'));for(const r of unsent)list.append(rowButton(r,'reminders',true));}}
 function drawArchive(rows){archive.replaceChildren(el('p','Vom Push-Dienst angenommene Erinnerungen bleiben hier gespeichert. Dies ist keine Empfangs- oder Lesebestätigung.','reminder-help'));if(!rows.length)archive.append(el('p','Noch keine archivierten Erinnerungen.'));for(const r of rows)archive.append(rowButton(r,'reminder-archive'));}
 async function refresh(){const view=visible('reminder-archive')?'reminder-archive':'reminders',target=view==='reminder-archive'?archive:list;const owner=getSession()?.user?.id,generation=epoch,request=++serial;if(!visible(view))return;if(!owner){target.replaceChildren(el('p','Bitte anmelden.'));return;}if(!target.children.length)target.append(el('p','Erinnerungen werden geladen …'));
  try{const data=view==='reminder-archive'?await loadReminderArchive():await Promise.all([loadReminders(),loadUnsentReminders()]);if(!current(generation,owner)||request!==serial||!visible(view))return;if(view==='reminder-archive')drawArchive(archivedReminders(data));else drawList(upcomingReminders(data[0]),data[1]);}
  catch{if(current(generation,owner)&&request===serial&&visible(view))target.replaceChildren(...(view==='reminders'?[button('Neue Erinnerung',()=>edit(null)),archiveButton()]:[]),el('p','Erinnerungen konnten nicht geladen werden.'),button('Erneut versuchen',refresh));}
 }
 async function run(root,fn){if(busy||!getSession())return;busy=true;const generation=epoch,owner=getSession()?.user?.id;root.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=true);try{await fn(()=>current(generation,owner));}catch(e){if(current(generation,owner))status(root,e.message);}finally{busy=false;root.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=false);}}
 function drawDetail(row){selected=row;if(row.archived_at)detailFrom='reminder-archive';const actions=el('div',undefined,'reminder-actions');if(!row.archived_at&&(!row.push_status||row.push_status==='pending'))actions.append(icon('Bearbeiten','M16 3l5 5M4 16l-1 5 5-1L21 7l-5-5L4 16',()=>edit(row)));actions.append(icon('Löschen','M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',()=>run(detail,async valid=>{await deleteReminder(row.id);if(!valid()||!visible('reminder-detail'))return;selected=null;showView(detailFrom);await refresh();})));detail.replaceChildren(el('h3',row.title),el('p',reminderLabel(row)),el('p',row.description||'Keine Beschreibung.','reminder-description'),el('p',reminderPushLabel(row),'reminder-help'),actions);}
 async function open(id,origin){if(!reminderId(id)||busy)return;detailFrom=origin||'reminders';const generation=++epoch,owner=getSession()?.user?.id;selected=null;showView('reminder-detail');detail.replaceChildren(el('p','Erinnerung wird geladen …'));if(!owner){status(detail,'Bitte anmelden.');return;}
  try{const row=await loadReminder(id);if(current(generation,owner)&&visible('reminder-detail'))drawDetail(row);}catch(e){if(current(generation,owner))detail.replaceChildren(el('p',e.message),button('Erneut versuchen',()=>open(id,detailFrom)));}
 }
 function edit(row){if(busy||row?.archived_at||(row?.push_status&&row.push_status!=='pending'))return;editFrom=row;showView('reminder-edit');editor.replaceChildren();const form=el('form'),fields={};
  for(const [key,title,type,value] of [['title','Titel','text',row?.title||''],['reminder_date','Datum','date',row?.reminder_date||reminderDay()],['reminder_time','Uhrzeit','time',row ? (row.reminder_time?.slice(0,5)||'') : '09:00'],['description','Beschreibung (optional)','textarea',row?.description||'']]){const label=el('label',title),input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.required=['title','reminder_date'].includes(key);input.setAttribute('aria-label',title);if(key==='title')input.maxLength=200;if(key==='description')input.maxLength=5000;if(key==='reminder_time')input.step=60;label.append(input);form.append(label);fields[key]=input;}
  const submit=el('button','Speichern');submit.type='submit';form.append(submit,button('Abbrechen',()=>{if(busy)return;if(editFrom){showView('reminder-detail');drawDetail(editFrom);}else goList();}));
  form.addEventListener('submit',event=>{event.preventDefault();run(form,async valid=>{const rowSaved=await saveReminder({...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value])),timezone:'Europe/Berlin'},row?.id||null);if(!valid()||!visible('reminder-edit'))return;showView('reminder-detail');drawDetail(rowSaved);refresh();});});editor.append(form);
 }
 document.getElementById('reminders-back').addEventListener('click',()=>{if(!busy){epoch++;showView('planner');refresh();}});
 document.getElementById('reminder-archive-back').addEventListener('click',goList);
 document.getElementById('reminder-detail-back').addEventListener('click',()=>detailFrom==='reminder-archive'?goArchive():goList());
 document.getElementById('reminder-edit-back').addEventListener('click',()=>{if(busy)return;if(editFrom){showView('reminder-detail');drawDetail(editFrom);}else goList();});
 document.addEventListener('dock:open-reminder',event=>open(event.detail?.id));
 document.addEventListener('dock:auth-changed',()=>{epoch++;serial++;selected=null;editFrom=null;busy=false;list.replaceChildren();detail.replaceChildren();editor.replaceChildren();archive.replaceChildren();detailFrom='reminders';refresh();});
 new MutationObserver(()=>{if(visible('reminders')||visible('reminder-archive'))refresh();}).observe(document.querySelector('main')||document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
 const tick=()=>{if(document.visibilityState!=='hidden'&&(visible('reminders')||visible('reminder-archive')))refresh();};let timer=setInterval(tick,60000);window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(tick,60000);tick();});
 refresh();
}
