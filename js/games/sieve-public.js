import { bindHold } from './hold.js?v=1.99';
import { gameRpc } from './api.js?v=1.99';
import { createSieveGame } from './sieve-controller.js?v=1.99';
import { SIEVE_CATEGORIES,appendSieveResults } from './sieve-results.js?v=1.99';
const root=document.getElementById('sieve-public'),reveal=document.getElementById('sieve-reveal'),content=document.getElementById('sieve-reveal-content'),hold=document.getElementById('sieve-hold'),number=document.getElementById('sieve-word-number'),actions=document.getElementById('sieve-actions'),results=document.getElementById('sieve-results'),token=new URL(location.href).searchParams.get('game');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
let controller,holdBinding,pollTimer,tickTimer,polling=false,wordDraft=[],selected='',lastSection=null,paintKey='';
function render(s){
 // Tick updates only the timer and reveal, preserving focus, draft and held pointer.
 const k=JSON.stringify([s.status?{...s.status,server_now:undefined}:null,s.player,s.claimed,s.busy,s.error,s.pending,Math.ceil(s.remaining/1000)===0]);
 const actualTurn=s.status?.turn,active=s.player?.id===actualTurn?.player_id&&Boolean(s.player),running=actualTurn?.phase==='running'&&s.remaining>0;
 reveal.hidden=!active||!running;hold.disabled=!active||!running||s.busy||s.pending||Boolean(s.error);
 number.textContent='Wort Nummer '+(actualTurn?.word_number||1);content.replaceChildren();
 if(s.word&&active&&running&&!s.error)content.append(el('p',s.word,'game-secret-word'));else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','game-eye-off');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M3 3l18 18M6 6C3 8 2 12 2 12s4 7 10 7a12 12 0 0 0 5-1M10 5h2c6 0 10 7 10 7a17 17 0 0 1-4 5');svg.append(path);content.append(svg);}
 const timer=root.querySelector('.sieve-timer');if(timer)timer.textContent=actualTurn?.phase==='running'?`${Math.ceil(s.remaining/1000)} Sekunden`:actualTurn?.phase==='expired'?'Zeit abgelaufen':'';
 if(k===paintKey)return;paintKey=k;
 const oldForm=root.querySelector('.sieve-word-form');if(oldForm)wordDraft=Array.from(oldForm.querySelectorAll('input'),n=>n.value);const oldSelect=root.querySelector('select');if(oldSelect)selected=oldSelect.value;const focused=document.activeElement,focusIndex=oldForm?Array.from(oldForm.querySelectorAll('input')).indexOf(focused):-1,caret=focused?.selectionStart;
 if(lastSection!==s.status?.phase){if(s.status?.phase!=='collecting')wordDraft=[];lastSection=s.status?.phase;}
 root.replaceChildren(el('h1',s.status?.name||'Dock Rotes Sieb'));actions.replaceChildren();results.replaceChildren();
 if(s.error){const msg=el('p',s.error,'loan-error');msg.setAttribute('role','status');const retry=button(s.pending?'Aktion erneut versuchen':'Erneut versuchen',()=>s.pending?controller.retry():controller.refresh());retry.setAttribute('data-sieve-recovery','');root.append(msg,retry);if(s.pending){const refresh=button('Aktuellen Stand laden',()=>controller.refresh());refresh.setAttribute('data-sieve-recovery','');root.append(refresh);}}
 if(!s.status){root.append(el('p','Spiel wird geladen …'));return;}
 if(s.status.state==='unavailable'){root.append(el('p','Dieses Spiel ist beendet oder der Link ist nicht mehr aktiv.'));return;}
 const state=s.status;
 if(state.category)root.append(el('h2',state.category_names?.[state.category-1]||SIEVE_CATEGORIES[state.category-1]||'Kategorie '+state.category));
 if(state.players.some(p=>p.team)){const teams=el('details',undefined,'game-section');teams.append(el('summary','Teams'));for(const team of ['A','B'])teams.append(el('p',`Team ${team}: ${state.players.filter(p=>p.team===team).map(p=>p.name).join(', ')}`));root.append(teams);}
 if(state.phase==='finished'){appendSieveResults(results,state.categories,{final:true});return;}
 if(!s.claimed){const form=el('form',undefined,'game-name-form'),select=el('select');select.required=true;select.setAttribute('aria-label','Deinen Namen auswählen');const empty=el('option','Deinen Namen auswählen');empty.value='';select.append(empty);for(const p of state.players){const option=el('option',p.name+(p.claimed?' – belegt':''));option.value=p.id;option.disabled=p.claimed;select.append(option);}if(state.players.some(p=>p.id===selected&&!p.claimed))select.value=selected;const confirm=el('button','Namen bestätigen');confirm.type='submit';form.append(select,confirm);form.addEventListener('submit',e=>{e.preventDefault();if(select.value)controller.select(select.value);});root.append(form,el('p','Wähle nur deinen eigenen Namen. Deine Auswahl bleibt in diesem Tab gespeichert. Nutze deshalb keinen privaten Tab. Die Namenswahl erfolgt auf Vertrauensbasis.','game-muted'));}
 else if(!s.player)root.append(el('p','Belegung wird geprüft …'));
 else{root.append(el('p','Dein Name: '+s.player.name+(s.player.team?' · Dein Team: '+s.player.team:''),'game-person-line'));
  if(state.phase==='collecting'){
   if(s.player.submitted)root.append(el('p','Deine Wörter sind bestätigt. Warte auf die anderen.','game-waiting'));
   else{const form=el('form',undefined,'sieve-word-form'),progress=el('p'),submit=el('button','Wörter bestätigen');submit.type='submit';const inputs=[];const update=()=>{const complete=inputs.filter(n=>n.value.trim()).length;progress.textContent=`${complete} von ${state.words_per_player} Wörtern`;submit.disabled=s.busy||complete!==state.words_per_player;};for(let i=0;i<state.words_per_player;i++){const label=el('label','Wort '+(i+1)),input=el('input');input.required=true;input.maxLength=120;input.value=wordDraft[i]||'';input.setAttribute('aria-label','Wort '+(i+1));input.addEventListener('input',update);label.append(input);form.append(label);inputs.push(input);}form.append(progress,submit);form.addEventListener('submit',e=>{e.preventDefault();if(inputs.every(n=>n.value.trim()))controller.action('submit',{words:inputs.map(n=>n.value.trim())});});root.append(form);update();}
  }
 }
 if(state.phase==='collecting')root.append(el('p',`${state.players.filter(p=>p.submitted).length} von ${state.players.length} Teilnehmern fertig`));
 if(state.phase==='category_done'){appendSieveResults(results,state.categories);if(s.player)results.append(button('Nächste Kategorie',()=>controller.action('next_category')));}
 if(state.phase==='playing'&&actualTurn){root.append(el('p',`Team ${actualTurn.team} · ${actualTurn.name} ist dran`,'game-person-line'),el('p',actualTurn.phase==='running'?`${Math.ceil(s.remaining/1000)} Sekunden`:actualTurn.phase==='expired'?'Zeit abgelaufen':'Zug wartet auf Start','sieve-timer'),el('p',`${state.remaining} Wörter offen`));
  const category=state.categories.find(c=>c.number===state.category),jokers=Math.max(0,state.joker_limit-(actualTurn.team==='A'?category?.jokers_a:category?.jokers_b));
  if(active){if(actualTurn.phase==='pending'||actualTurn.phase==='confirmed')root.append(button('Ich bin dran',()=>controller.action('start')),el('p','Der Timer startet sofort. Mach dich vor dem Klicken bereit.','game-muted sieve-start-hint'));else if(running){const solve=button('Geschafft / Nächstes Wort',()=>{holdBinding.release();controller.action('solve');}),joker=button(`Joker einlösen (${jokers})`,()=>{holdBinding.release();controller.action('joker');});joker.disabled=s.busy||jokers===0||state.remaining<2;actions.append(solve,joker);}else{actions.append(button('Letztes zählt noch',()=>controller.action('last')),button('Weitergeben',()=>controller.action('pass')));}}
  else root.append(el('p','Warte auf die aktive Person.','game-waiting'));
 }
 root.querySelectorAll('button,input,select').forEach(n=>{if(s.busy||(s.pending&&!n.hasAttribute('data-sieve-recovery')))n.disabled=true;});actions.querySelectorAll('button').forEach(n=>{if(s.busy||s.pending)n.disabled=true;});results.querySelectorAll('button').forEach(n=>n.disabled=s.busy||s.pending);
 if(Number.isInteger(focusIndex)&&focusIndex>=0&&!s.busy){const next=root.querySelector('.sieve-word-form')?.querySelectorAll('input')[focusIndex];next?.focus();if(Number.isInteger(caret))next?.setSelectionRange?.(caret,caret);}
}
async function poll(){if(polling||document.visibilityState==='hidden')return;polling=true;try{await controller.poll();}finally{polling=false;}}
function stop(){clearInterval(pollTimer);clearInterval(tickTimer);holdBinding.release();controller.suspend();}
function start(){clearInterval(pollTimer);clearInterval(tickTimer);poll();pollTimer=setInterval(poll,1500);tickTimer=setInterval(()=>controller.tick(),100);}
if(!token||!/^[a-f0-9]{64}$/.test(token))root.replaceChildren(el('h1','Dock Rotes Sieb'),el('p','Dieser Gruppenlink ist ungültig.'));
else{let storage;try{storage=sessionStorage;}catch{}controller=createSieveGame({token,rpc:gameRpc,changed:render,storage});holdBinding=bindHold(hold,{show:()=>controller.show(),hide:()=>controller.hide()});start();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop();else start();});window.addEventListener('pagehide',stop);window.addEventListener('pageshow',start);}
