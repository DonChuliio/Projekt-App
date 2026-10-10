import { bindHold } from './hold.js?v=1.97';
import { gameRpc } from './api.js?v=1.97';
import { createCelebrityGame } from './celebrity-controller.js?v=1.97';
const root=document.getElementById('celebrity-public'),area=document.getElementById('celebrity-reveal'),content=document.getElementById('celebrity-reveal-content'),hold=document.getElementById('celebrity-reveal-hold'),notesArea=document.getElementById('celebrity-notes'),notes=document.getElementById('celebrity-note-input'),outcome=document.getElementById('celebrity-outcomes'),token=new URL(location.href).searchParams.get('game');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
let controller,draft='',selection='',lastRound=null,polling=false,timer;
function paint(s){
 const form=root.querySelector('.celebrity-entry-form'),focused=document.activeElement,focusInput=form&&focused===form.querySelector('input'),caret=focused?.selectionStart;if(form)draft=form.querySelector('input').value;const picker=root.querySelector('select');if(picker)selection=picker.value;
 if(lastRound!==s.status?.round_id){draft='';selection='';lastRound=s.status?.round_id;}
 root.replaceChildren(el('h1',s.status?.name||'Dock Promi-Raten'));outcome.replaceChildren();content.replaceChildren();content.className='';
 const playing=s.claimed&&s.context&&s.status?.state==='guessing';area.hidden=!playing;hold.disabled=!playing||s.busy||Boolean(s.error);notesArea.hidden=!playing||!s.status.notes_enabled||Boolean(s.context.position);
 if(notes.value!==s.notes)notes.value=s.notes;notes.disabled=s.busy;
 if(s.error){const p=el('p',s.error,'loan-error');p.setAttribute('role','status');root.append(p,button('Erneut versuchen',()=>controller.refresh()));}
 if(!s.status){root.append(el('p','Spiel wird geladen …'));return;}
 if(s.status.state==='unavailable'){root.append(el('p','Dieses Spiel ist beendet oder der Link ist nicht mehr aktiv.'));return;}
 root.append(el('h2',`Runde ${s.status.number}`));
 if(!s.claimed){
  const choose=el('form',undefined,'game-name-form'),select=el('select');select.required=true;select.setAttribute('aria-label','Deinen Namen auswählen');const empty=el('option','Deinen Namen auswählen');empty.value='';select.append(empty);for(const p of s.status.players){const o=el('option',p.name+(p.claimed?' – belegt':''));o.value=p.id;o.disabled=p.claimed;select.append(o);}if(s.status.players.some(p=>p.id===selection&&!p.claimed))select.value=selection;const confirm=el('button','Namen bestätigen');confirm.type='submit';choose.append(select,confirm);choose.addEventListener('submit',e=>{e.preventDefault();if(select.value)controller.select(select.value);});root.append(choose,el('p','Wähle nur deinen eigenen Namen. Deine Auswahl bleibt für dieses Spiel in diesem Tab gespeichert und wird in die nächste Runde übernommen. Nutze deshalb keinen privaten Tab. Die Namenswahl erfolgt auf Vertrauensbasis.','game-muted'));
 }else{
  const name=s.status.players.find(p=>p.id===s.playerId)?.name;root.append(el('p','Dein Name: '+(name||'Teilnehmer'),'game-person-line'));
  if(!s.context){root.append(el('p','Belegung wird geprüft …'));}
  else if(s.status.state==='entering'){
   if(!s.context.submitted){const entry=el('form',undefined,'celebrity-entry-form'),label=el('label',`Du legst einen Promi für ${s.context.recipient_name} fest`),input=el('input');input.required=true;input.maxLength=200;input.value=draft;input.setAttribute('aria-label','Promi-Name');label.append(input);const submit=el('button','Promi festlegen');submit.type='submit';entry.append(label,submit);entry.addEventListener('submit',e=>{e.preventDefault();if(input.value.trim())controller.action('submit',{celebrity:input.value.trim()});});root.append(entry);}
   else root.append(el('p','Dein Promi ist festgelegt. Warte, bis alle ihre Eingabe abgeschlossen haben.','game-waiting'));
   root.append(el('p',`${s.status.players.filter(p=>p.submitted).length} von ${s.status.players.length} Promis festgelegt`));
  }else if(s.status.state==='guessing'){
   if(s.others){if(s.others.length>5)content.className='celebrity-reveal-grid';for(const p of s.others)content.append(el('p',`${p.name}: ${p.celebrity}`));}
   else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','game-eye-off');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.8 5.2A12 12 0 0 1 12 5c5.5 0 9 7 9 7a17 17 0 0 1-4 4.7M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7a12 12 0 0 0 4.2-.8');svg.append(path);content.append(svg,el('p','Promis der anderen verborgen'));}
   if(s.context.position)root.append(el('h2',`Du bist Platz ${s.context.position} geworden!`));
   else outcome.append(button('Gewonnen',()=>controller.action('win')));
   if(s.context.position){const placements=el('section',undefined,'celebrity-placements');placements.append(el('h3','Platzierungen'));for(const p of [...s.status.players].sort((a,b)=>(a.position||Infinity)-(b.position||Infinity))){placements.append(el('p',`${p.name}: ${p.position?'Platz '+p.position:'Rät noch'}`));}outcome.append(placements);}
  }
 }
 if(s.lastPlacement&&s.lastPlacement.number<s.status.number){const previous=s.lastPlacement;const ranks=el('section',undefined,'celebrity-placements');ranks.append(el('h3',`Platzierungen · Runde ${previous.number}`),el('p',previous.position?`Du bist Platz ${previous.position} geworden!`:'Du bist unplatziert.'));for(const p of previous.placements||[])ranks.append(el('p',`${p.name}: ${p.position?'Platz '+p.position:'Unplatziert'}`));root.append(ranks);}
 root.querySelectorAll('button,input,select').forEach(n=>n.disabled=s.busy);outcome.querySelectorAll('button').forEach(n=>n.disabled=s.busy);
 if(focusInput&&!s.busy){const next=root.querySelector('.celebrity-entry-form')?.querySelector('input');next?.focus();if(Number.isInteger(caret))next?.setSelectionRange?.(caret,caret);}
}
async function poll(){if(polling||document.visibilityState==='hidden')return;polling=true;try{await controller.poll();}finally{polling=false;}}
notes.addEventListener('input',()=>controller.setNotes(notes.value));
if(!token||!/^[a-f0-9]{64}$/.test(token)){root.replaceChildren(el('h1','Dock Promi-Raten'),el('p','Dieser Gruppenlink ist ungültig.'));}
else{let storage;try{storage=sessionStorage;}catch{}controller=createCelebrityGame({token,rpc:gameRpc,changed:paint,storage});bindHold(hold,{show:()=>controller.show(),hide:()=>controller.hide()});poll();timer=setInterval(poll,3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')controller.suspend();else poll();});window.addEventListener('pagehide',()=>{clearInterval(timer);controller.suspend();});window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(poll,3000);poll();});}
