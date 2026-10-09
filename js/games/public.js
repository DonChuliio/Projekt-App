import { gameRpc } from './api.js?v=1.76';
import { createPublicGame } from './public-controller.js?v=1.76';
const root=document.getElementById('public-game'),token=new URL(location.href).searchParams.get('game');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
let controller,timer,inFlight=false,renderedRound=null;
function render(state){const previousSelection=renderedRound===state.status?.round_id?root.querySelector('select')?.value:'';renderedRound=state.status?.round_id;root.replaceChildren();root.append(el('h1',state.status?.name||'Dock Imposter'));
 if(state.error){const p=el('p',state.error,'loan-error');p.setAttribute('role','status');root.append(p);}
 if(!state.status){root.append(el('p','Spiel wird geladen …'));return;}
 if(state.status.state!=='live'){root.append(el('p',state.status.state==='waiting'?'Die erste Runde wurde noch nicht gestartet.':'Diese Runde ist geschlossen. Warte auf die nächste Runde.'));return;}
 root.append(el('h2',`Runde ${state.status.number}`));if(state.notice){const notice=el('p',state.notice);notice.setAttribute('role','status');root.append(notice);}
 if(!state.claimed){const form=el('form'),select=el('select');select.required=true;select.setAttribute('aria-label','Deinen Namen auswählen');const empty=el('option','Deinen Namen auswählen');empty.value='';select.append(empty);for(const p of state.status.players){const option=el('option',p.name+(p.claimed?' – belegt':''));option.value=p.id;option.disabled=p.claimed;select.append(option);}if(state.status.players.some(p=>p.id===previousSelection&&!p.claimed))select.value=previousSelection;const submit=el('button','Rolle anzeigen');submit.type='submit';submit.disabled=state.busy;form.append(select,submit);form.addEventListener('submit',e=>{e.preventDefault();if(select.value)controller.select(select.value);});root.append(form,el('p','Wähle nur deinen eigenen Namen. Belegung versehentlich verloren? Bitte in Dock zurücksetzen lassen.','game-muted'));}
 else if(state.result){const panel=el('section',undefined,'game-role');panel.setAttribute('aria-live','polite');if(state.result.role==='host')panel.append(el('h2','Du bist der Spielleiter'),el('p','Du spielst diese Runde nicht mit. Wort und Hinweis werden nur in Dock angezeigt.'));
 else if(state.result.role==='imposter')panel.append(el('h2','Du bist Imposter'),el('p',state.result.hint||'Kein Hinweis für diese Runde.'));
 else panel.append(el('p','Dein Wort'),el('h2',state.result.word));panel.append(button('Rolle verbergen',()=>controller.hide()));root.append(panel);}
 else root.append(el('p','Deine Rolle ist verborgen.'),button('Rolle erneut anzeigen',()=>controller.show()));
 root.append(button('Aktualisieren',()=>poll()));root.querySelectorAll('button').forEach(b=>b.disabled=state.busy);
}
async function poll(){if(inFlight||document.visibilityState==='hidden')return;inFlight=true;try{await controller.poll();}finally{inFlight=false;}}
if(!token||!/^[a-f0-9]{64}$/.test(token)){root.replaceChildren(el('h1','Dock Imposter'),el('p','Dieser Gruppenlink ist ungültig. Bitte den Link aus Dock verwenden.'));}
else{let storage;try{storage=sessionStorage;}catch{}controller=createPublicGame({token,rpc:gameRpc,changed:render,storage});poll();timer=setInterval(poll,3000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')controller.suspend();else poll();});window.addEventListener('pagehide',()=>{clearInterval(timer);controller.suspend();});window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(poll,3000);poll();});}
