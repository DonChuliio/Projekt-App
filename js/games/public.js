import { gameRpc } from './api.js?v=1.79';
import { createPublicGame } from './public-controller.js?v=1.79';
const root=document.getElementById('public-game'),token=new URL(location.href).searchParams.get('game');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
let controller,timer,inFlight=false,lastRound=null,draftWord='',draftHint='',draftSelection='',pendingWinner=null;
function render(s){
 const currentForm=root.querySelector('.host-word-form');const focused=document.activeElement,focusField=currentForm&&focused===currentForm.querySelector('input')?'input':currentForm&&focused===currentForm.querySelector('textarea')?'textarea':null,caret=focused?.selectionStart;if(currentForm){draftWord=currentForm.querySelector('input').value;draftHint=currentForm.querySelector('textarea').value;}
 const select=root.querySelector('select');if(select)draftSelection=select.value;
 if(lastRound!==s.status?.round_id){draftWord='';draftHint='';draftSelection='';lastRound=s.status?.round_id;pendingWinner=null;}
 root.replaceChildren(el('h1',s.status?.name||'Dock Imposter'));
 if(s.error){const p=el('p',s.error,'loan-error');p.setAttribute('role','status');root.append(p);}
 if(!s.status){root.append(el('p','Spiel wird geladen …'),button('Aktualisieren',()=>controller.refresh()));return;}
 if(s.status.state==='unavailable'){root.append(el('p','Dieses Spiel ist beendet oder der Link ist nicht mehr aktiv.'));return;}
 const names=s.status.players,hostName=names.find(p=>p.id===s.status.host_id)?.name||'Spielleitung';
 root.append(el('h2',`Runde ${s.status.number}`),el('p','Spielleitung: '+hostName));
 if(s.notice)root.append(el('p',s.notice));
 if(!s.claimed){const form=el('form'),picker=el('select');picker.required=true;picker.setAttribute('aria-label','Deinen Namen auswählen');const empty=el('option','Deinen Namen auswählen');empty.value='';picker.append(empty);for(const p of names){const o=el('option',p.name+(p.claimed?' – belegt':''));o.value=p.id;o.disabled=p.claimed;picker.append(o);}if(names.some(p=>p.id===draftSelection&&!p.claimed))picker.value=draftSelection;const submit=el('button','Namen bestätigen');submit.type='submit';form.append(picker,submit);form.addEventListener('submit',e=>{e.preventDefault();if(picker.value)controller.select(picker.value);});root.append(form,el('p','Deine Auswahl bleibt für dieses Spiel auf diesem Gerät gespeichert. Wähle nur deinen eigenen Namen. Bei falscher Belegung bitte in Dock zurücksetzen.','game-muted'));}
 else{
  root.append(el('p','Dein Name: '+(names.find(p=>p.id===s.playerId)?.name||'Teilnehmer')));
  if(s.playerId===s.status.host_id){root.append(el('h2','Du bist der Spielleiter'));
   if(s.status.state==='choosing'){const form=el('form',undefined,'host-word-form'),label=el('label','Geheimes Wort'),word=el('input'),hintLabel=el('label','Hinweis für Imposter (optional)'),hint=el('textarea');word.required=true;word.maxLength=200;word.value=draftWord;hint.maxLength=500;hint.value=draftHint;label.append(word);hintLabel.append(hint);const start=el('button','Wort freigeben');start.type='submit';form.append(label,hintLabel,start);form.addEventListener('submit',e=>{e.preventDefault();if(word.value.trim())controller.host('prepare',{word:word.value.trim(),hint:hint.value});});root.append(form);}
   else if(s.status.state==='live'){if(s.result?.role==='host'){root.append(el('p','Wort: '+s.result.word),el('p','Hinweis: '+(s.result.hint||'Kein Hinweis')),button('Wort verbergen',()=>controller.hide()));}else root.append(button('Wort anzeigen',()=>controller.show()));
    const choose=winner=>{pendingWinner=winner;render(s);};if(pendingWinner){const winner=pendingWinner,box=el('section',undefined,'game-confirm');box.append(el('p',winner==='imposter'?'Imposter haben gewonnen?':'Die anderen haben gewonnen?'),button('Ergebnis bestätigen',()=>{pendingWinner=null;controller.host('finish',{winner});}),button('Abbrechen',()=>{pendingWinner=null;render(s);}));root.append(box);}root.append(button('Imposter gewonnen',()=>choose('imposter')),button('Die anderen gewonnen',()=>choose('players')));}
   else root.append(button('Neue Runde starten',()=>controller.host('next')));
  }else if(s.status.state==='choosing')root.append(el('p','Die Spielleitung legt Wort und Hinweis fest. Danach aktualisieren.'));
  else if(s.status.state==='live'){if(s.result?.role==='player'||s.result?.role==='imposter'){const panel=el('section',undefined,'game-role');panel.append(el('h2',s.result.role==='imposter'?'Du bist Imposter':'Kein Imposter'));if(s.result.role==='player')panel.append(el('p','Das Wort ist '+s.result.word));if(s.result.role==='imposter')panel.append(el('p',s.result.hint||'Kein Hinweis'));panel.append(button('Rolle verbergen',()=>controller.hide()));root.append(panel);}else root.append(el('p','Deine Rolle ist verborgen.'),button('Rolle anzeigen',()=>controller.show()));}
 }
 if(s.status.state==='finished')root.append(el('p',s.status.winner==='imposter'?'Imposter haben gewonnen.':s.status.winner==='players'?'Die anderen haben gewonnen.':'Runde beendet.'),el('p','Warte auf die nächste Runde und aktualisiere.'));
 root.append(button('Aktualisieren',()=>controller.refresh()));root.querySelectorAll('button,input,textarea,select').forEach(n=>n.disabled=s.busy);if(focusField&&!s.busy){const next=root.querySelector('.host-word-form')?.querySelector(focusField);next?.focus();if(Number.isInteger(caret))next?.setSelectionRange?.(caret,caret);}
}
async function poll(){if(inFlight||document.visibilityState==='hidden')return;inFlight=true;try{await controller.poll();}finally{inFlight=false;}}
if(!token||!/^[a-f0-9]{64}$/.test(token))root.replaceChildren(el('h1','Dock Imposter'),el('p','Dieser Gruppenlink ist ungültig.'));
else{let storage;try{storage=localStorage;}catch{}controller=createPublicGame({token,rpc:gameRpc,changed:render,storage});poll();timer=setInterval(poll,3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')controller.suspend();else poll();});window.addEventListener('pagehide',()=>{clearInterval(timer);controller.suspend();});window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(poll,3000);poll();});}
