import { bindHold } from './hold.js?v=1.85';
import { gameRpc } from './api.js?v=1.85';
import { createPublicGame } from './public-controller.js?v=1.85';
const root=document.getElementById('public-game'),token=new URL(location.href).searchParams.get('game');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
const roleArea=document.getElementById('public-role'),roleContent=document.getElementById('public-role-content'),holdButton=document.getElementById('public-role-hold'),outcomeArea=document.getElementById('public-outcomes'),roleControls=document.getElementById('public-role-controls');
function paintRole(s){
 roleArea.hidden=!s.claimed||!s.status?.round_id||s.status.state==='unavailable';
 const choosing=s.status?.state==='choosing';roleControls.hidden=choosing;
 const available=s.claimed&&s.status?.state==='live'&&!s.busy&&!s.error;holdButton.disabled=!available;roleContent.replaceChildren();
 if(choosing){roleContent.append(el('p',s.playerId===s.status.host_id?'Lege das Wort und optional einen Hinweis fest.':'Die Rundenleitung legt das Wort und optional einen Hinweis fest.','game-waiting'));}
 else if(available&&s.result&&['host','player','imposter'].includes(s.result.role)){const r=s.result;if(r.role!=='host')roleContent.append(el('h2',r.role==='imposter'?'Du bist Imposter':'Kein Imposter')); if(r.role==='host')roleContent.append(el('p','Imposter: '+(r.imposters?.join(', ')||'Keine Imposter verfügbar')));if(r.role!=='imposter')roleContent.append(el('p',r.word,'game-secret-word'));if(r.role==='host'||r.role==='imposter')roleContent.append(el('p',r.hint||'Kein Hinweis'));if(r.role==='imposter'&&r.teammates)roleContent.append(el('p',r.teammates.length?'Weitere Imposter: '+r.teammates.join(', '):'Kein weiterer Imposter'));}
 else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','game-eye-off');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.8 5.2A12 12 0 0 1 12 5c5.5 0 9 7 9 7a17 17 0 0 1-4 4.7M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7a12 12 0 0 0 4.2-.8');svg.append(path);roleContent.append(svg,el('p','Rolle und Wort verborgen'));}
}
let controller,timer,inFlight=false,lastRound=null,draftWord='',draftHint='',draftSelection='';
function render(s){
 outcomeArea.replaceChildren();
 paintRole(s);
 const currentForm=root.querySelector('.host-word-form');const focused=document.activeElement,focusField=currentForm&&focused===currentForm.querySelector('input')?'input':currentForm&&focused===currentForm.querySelector('textarea')?'textarea':null,caret=focused?.selectionStart;if(currentForm){draftWord=currentForm.querySelector('input').value;draftHint=currentForm.querySelector('textarea').value;}
 const select=root.querySelector('select');if(select)draftSelection=select.value;
 if(lastRound!==s.status?.round_id){draftWord='';draftHint='';draftSelection='';lastRound=s.status?.round_id;}
 root.replaceChildren(el('h1',s.status?.name||'Dock Imposter'));
 if(s.error){const p=el('p',s.error,'loan-error');p.setAttribute('role','status');root.append(p,button('Erneut versuchen',()=>controller.refresh()));}
 if(!s.status){root.append(el('p','Spiel wird geladen …'));return;}
 if(s.status.state==='unavailable'){root.append(el('p','Dieses Spiel ist beendet oder der Link ist nicht mehr aktiv.'));return;}
 const names=s.status.players,hostName=names.find(p=>p.id===s.status.host_id)?.name||'Rundenleitung';
 root.append(el('h2',`Runde ${s.status.number}`),el('p','Dein Name: '+(names.find(p=>p.id===s.playerId)?.name||'Noch nicht ausgewählt'),'game-person-line'),el('p','Rundenleitung: '+hostName,'game-person-line'));
 if(s.notice&&!s.notice.startsWith('Neue Runde'))root.append(el('p',s.notice));
 if(!s.claimed){const form=el('form',undefined,'game-name-form'),picker=el('select');picker.required=true;picker.setAttribute('aria-label','Deinen Namen auswählen');const empty=el('option','Deinen Namen auswählen');empty.value='';picker.append(empty);for(const p of names){const o=el('option',p.name+(p.claimed?' – belegt':''));o.value=p.id;o.disabled=p.claimed;picker.append(o);}if(names.some(p=>p.id===draftSelection&&!p.claimed))picker.value=draftSelection;const submit=el('button','Namen bestätigen');submit.type='submit';form.append(picker,submit);form.addEventListener('submit',e=>{e.preventDefault();if(picker.value)controller.select(picker.value);});root.append(form,el('p','Deine Auswahl bleibt für dieses Spiel auf diesem Gerät gespeichert. Wähle nur deinen eigenen Namen. Öffne den Link nicht in einem privaten Tab: Dort bleibt deine Namensauswahl nach dem Schließen möglicherweise nicht gespeichert.','game-muted'));}
 else{
  if(s.playerId===s.status.host_id){root.append(el('h2','Du bist der Rundenleiter'));
   if(s.status.state==='choosing'){const form=el('form',undefined,'host-word-form'),label=el('label','Geheimes Wort'),word=el('input'),hintLabel=el('label','Hinweis für Imposter (optional)'),hint=el('textarea');word.required=true;word.maxLength=200;word.value=draftWord;hint.maxLength=500;hint.value=draftHint;label.append(word);hintLabel.append(hint);const start=el('button','Wort freigeben');start.type='submit';form.append(label,hintLabel,start);form.addEventListener('submit',e=>{e.preventDefault();if(word.value.trim())controller.host('prepare',{word:word.value.trim(),hint:hint.value});});root.append(form);}
   else if(s.status.state==='live'){
    const group=el('div',undefined,'game-outcome-buttons');group.append(button('Imposter gewonnen',()=>controller.host('finish_next',{winner:'imposter'})),button('Die anderen gewonnen',()=>controller.host('finish_next',{winner:'players'})));outcomeArea.append(group);}
   else outcomeArea.append(button('Neue Runde starten',()=>controller.host('next')));
  }

 }
 if(s.status.state==='finished')root.append(el('p',s.status.winner==='imposter'?'Imposter haben gewonnen.':s.status.winner==='players'?'Die anderen haben gewonnen.':'Runde beendet.'),el('p','Warte auf die nächste Runde.'));
 root.querySelectorAll('button,input,textarea,select').forEach(n=>n.disabled=s.busy);outcomeArea.querySelectorAll('button').forEach(n=>n.disabled=s.busy);if(focusField&&!s.busy){const next=root.querySelector('.host-word-form')?.querySelector(focusField);next?.focus();if(Number.isInteger(caret))next?.setSelectionRange?.(caret,caret);}
}
async function poll(){if(inFlight||document.visibilityState==='hidden')return;inFlight=true;try{await controller.poll();}finally{inFlight=false;}}
paintRole({});
if(!token||!/^[a-f0-9]{64}$/.test(token)){paintRole({});root.replaceChildren(el('h1','Dock Imposter'),el('p','Dieser Gruppenlink ist ungültig.'));}
else{let storage;try{storage=localStorage;}catch{}controller=createPublicGame({token,rpc:gameRpc,changed:render,storage});bindHold(holdButton,{show:()=>controller.show(),hide:()=>controller.hide()});poll();timer=setInterval(poll,3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')controller.suspend();else poll();});window.addEventListener('pagehide',()=>{clearInterval(timer);controller.suspend();});window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(poll,3000);poll();});}
