import { getSession } from '../auth/auth.js';
import { showView } from '../router.js';
import { loadBirthdays,loadBirthday,saveBirthday,deleteBirthday,birthdayId } from '../data/birthdays-data.js?v=1.111';
import { orderedBirthdays,birthdayLabel,nextBirthdayLabel } from './model.js?v=1.111';

export function initBirthdays(){
 const list=document.getElementById('birthdays-content'),editor=document.getElementById('birthday-edit-content');if(!list||!editor)return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 const icon=(label,path,fn)=>{const b=button(undefined,fn);b.className='birthday-icon';b.setAttribute('aria-label',label);b.title=label;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',path);svg.append(p);b.append(svg);return b;};
 const visible=name=>{const view=document.querySelector('[data-view="'+name+'"]');return Boolean(view&&!view.classList.contains('hidden'));};
 let epoch=0,serial=0,busy=false;
 const current=(generation,owner)=>generation===epoch&&getSession()?.user?.id===owner;
 const status=(root,text)=>{let p=root.querySelector('[role="status"]');if(!p){p=el('p');p.setAttribute('role','status');root.prepend(p);}p.textContent=text;};
 const notify=()=>document.dispatchEvent(new CustomEvent('dock:birthdays-changed'));
 async function run(root,fn){
  if(busy||!getSession()?.user?.id)return;busy=true;const generation=epoch,owner=getSession()?.user?.id;
  root.querySelectorAll('button,input').forEach(n=>n.disabled=true);
  try{await fn(()=>current(generation,owner));}catch(error){if(current(generation,owner))status(root,error.message);}
  finally{if(current(generation,owner)){busy=false;root.querySelectorAll('button,input').forEach(n=>n.disabled=false);}}
 }
 function drawList(rows){
  list.replaceChildren(button('Neuer Geburtstag',()=>edit(null)));
  if(!rows.length)list.append(el('p','Noch keine Geburtstage gespeichert.'));
  for(const row of orderedBirthdays(rows)){
   const card=el('div',undefined,'birthday-row'),body=el('div',undefined,'birthday-person'),actions=el('div',undefined,'birthday-actions');
   body.append(el('strong',row.name),el('span',birthdayLabel(row)),el('span',nextBirthdayLabel(row)));
   actions.append(icon('Bearbeiten: '+row.name,'M16 3l5 5M4 16l-1 5 5-1L21 7l-5-5L4 16',()=>edit(row)),icon('Löschen: '+row.name,'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',()=>run(list,async valid=>{await deleteBirthday(row.id);if(!valid())return;notify();if(visible('birthdays'))await refresh();})));
   card.append(body,actions);list.append(card);
  }
 }
 async function refresh(){
  if(!visible('birthdays'))return;const owner=getSession()?.user?.id,generation=epoch,request=++serial;
  if(!owner){list.replaceChildren(el('p','Bitte anmelden.'));return;}
  if(!list.children.length)list.append(el('p','Geburtstage werden geladen …'));
  try{const rows=await loadBirthdays();if(current(generation,owner)&&request===serial&&visible('birthdays'))drawList(rows);}
  catch{if(current(generation,owner)&&request===serial&&visible('birthdays'))list.replaceChildren(button('Neuer Geburtstag',()=>edit(null)),el('p','Geburtstage konnten nicht geladen werden.'),button('Erneut versuchen',refresh));}
 }
 function edit(row){
  if(busy||!getSession()?.user?.id)return;serial++;showView('birthday-edit');editor.replaceChildren();document.getElementById('birthday-edit-title').textContent=row?'Geburtstag bearbeiten':'Neuer Geburtstag';
  const form=el('form'),nameLabel=el('label','Name'),name=el('input'),dateLabel=el('label','Geburtsdatum'),date=el('input');
  name.type='text';name.required=true;name.maxLength=200;name.value=row?.name||'';name.setAttribute('aria-label','Name');name.autocomplete='off';
  date.type='date';date.required=true;date.min='0001-01-01';date.max='9999-12-31';date.value=row?.birth_date||'';date.setAttribute('aria-label','Geburtsdatum');
  nameLabel.append(name);dateLabel.append(date);const submit=el('button','Speichern');submit.type='submit';
  form.append(nameLabel,dateLabel,submit,button('Abbrechen',()=>{if(busy)return;showView('birthdays');refresh();}));
  form.addEventListener('submit',event=>{event.preventDefault();run(form,async valid=>{await saveBirthday({name:name.value,birth_date:date.value},row?.id||null);if(!valid())return;notify();if(visible('birthday-edit')){showView('birthdays');await refresh();}});});editor.append(form);
 }
 async function open(id){
  if(busy||!birthdayId(id)||!getSession()?.user?.id)return;const owner=getSession()?.user?.id,generation=++epoch,request=++serial;showView('birthday-edit');editor.replaceChildren(el('p','Geburtstag wird geladen …'));
  try{const row=await loadBirthday(id);if(current(generation,owner)&&request===serial&&visible('birthday-edit'))edit(row);}
  catch(error){if(current(generation,owner)&&request===serial&&visible('birthday-edit'))editor.replaceChildren(el('p',error.message),button('Erneut versuchen',()=>open(id)));}
 }
 document.addEventListener('dock:open-birthday',event=>open(event.detail?.id));
 document.addEventListener('dock:auth-changed',()=>{epoch++;serial++;busy=false;list.replaceChildren();editor.replaceChildren();refresh();});
 new MutationObserver(()=>{if(visible('birthdays'))refresh();}).observe(document.querySelector('main')||document.body,{subtree:true,attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh();});
 window.addEventListener('pageshow',refresh);
 refresh();
}
