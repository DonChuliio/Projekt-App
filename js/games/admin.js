import { imposterStats } from './stats.js?v=1.85';
import { manageGame } from './admin-data.js?v=1.85';
import { showView } from '../router.js';
import { getSession } from '../auth/auth.js';
export function initImposter(){
 const root=document.getElementById('imposter-content'),view=document.querySelector('[data-view="imposter"]');if(!root||!view)return;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,action)=>{const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;};
 let gameId=null,data=null,screen='list',playersReturn='list',busy=false,epoch=0,loadSerial=0;
 const back=view.querySelector('.back-button');
 const expanded=new Set();
 const fold=(label,key)=>{const box=el('details',undefined,'game-section'),id=gameId+':'+key;box.open=expanded.has(id);box.append(el('summary',label));box.addEventListener('toggle',()=>{if(box.open)expanded.add(id);else expanded.delete(id);});return box;};
 const redraw=()=>{root.replaceChildren();if(screen==='players')drawPlayers();else drawGame();};
 const goBack=()=>{if(busy)return;if(screen==='players'&&playersReturn==='game'){screen='game';redraw();}else if(screen!=='list'){gameId=null;screen='list';load().catch(e=>status(e.message,root,true));}else showView('games');};
 back?.addEventListener('click',goBack);
 const active=()=>!view.classList.contains('hidden')&&Boolean(getSession());
 const status=(msg,target=root,retryable=false,success=false)=>{let n=target.querySelector('[role="status"]');if(!n){n=el('p',undefined,'loan-error');n.setAttribute('role','status');target.prepend(n);}n.className=success?'game-status-success':'loan-error';n.textContent=msg;if(retryable&&!root.querySelector('.game-retry')){const retry=button('Erneut versuchen',()=>run(async()=>{}));retry.className='game-retry';target.append(retry);}n.scrollIntoView?.({block:'nearest',behavior:'smooth'});};
 async function run(fn,feedbackTarget=root){if(busy||!active())return;busy=true;const generation=epoch,owner=getSession()?.user?.id,controls=[...root.querySelectorAll('button,input,select')];controls.forEach(n=>n.disabled=true);try{await fn();if(generation!==epoch||owner!==getSession()?.user?.id)return;await load();}catch(e){if(generation===epoch&&owner===getSession()?.user?.id)status(e.message,feedbackTarget,true);}finally{busy=false;controls.forEach(n=>n.disabled=false);}}
 const field=(form,label,value='',type='text')=>{const wrap=el('label'),input=el('input');input.type=type;input.value=value;input.maxLength=type==='text'?200:100;wrap.append(el('span',label),input);form.append(wrap);return input;};
 function playerForm(player=null){root.querySelector('.game-player-form')?.remove();const form=el('form',undefined,'game-player-form'),name=field(form,'Teilnehmername',player?.name||'');name.maxLength=100;name.required=true;const save=el('button','Teilnehmer speichern');save.type='submit';form.append(save,button('Abbrechen',()=>form.remove()));form.addEventListener('submit',e=>{e.preventDefault();if(name.value.trim())run(()=>manageGame('player',gameId,{id:player?.id,name:name.value.trim()}));});root.prepend(form);name.focus();}
 function confirm(text,action,target=root){root.querySelector('.game-confirm')?.remove();const box=el('section',undefined,'game-confirm');box.append(el('p',text),button('Bestätigen',()=>run(action,target)),button('Abbrechen',()=>box.remove()));if(target===root)target.prepend(box);else target.append(box);box.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
 async function load(){const generation=epoch,serial=++loadSerial,owner=getSession()?.user?.id;if(!active())return;
  if(!gameId){const games=await manageGame('list');if(!active()||generation!==epoch||serial!==loadSerial||owner!==getSession()?.user?.id)return;screen='list';root.replaceChildren();root.append(el('h3','Spiel erstellen'));
   const create=el('form',undefined,'game-create-form'),name=field(create,'Spielname');name.maxLength=100;name.required=true;const submit=el('button','Spiel erstellen');submit.type='submit';create.append(submit);create.addEventListener('submit',e=>{e.preventDefault();if(name.value.trim())run(async()=>{gameId=(await manageGame('create',null,{name:name.value.trim()})).id;screen='game';playersReturn='list';});});root.append(create);
   if(games.length){root.append(el('h3','Meine Spiele'));const list=el('div',undefined,'game-list');for(const g of games){const b=button(g.name+(g.state==='ended'?' · Beendet':g.state==='active'?' · Läuft':' · Einrichtung'),()=>run(async()=>{gameId=g.id;screen='open';}));if(g.state==='ended')b.className='game-ended';list.append(b);}root.append(list);}return;
  }
  const next=await manageGame('view',gameId);if(!active()||generation!==epoch||serial!==loadSerial||owner!==getSession()?.user?.id)return;data=next;if(screen==='open')screen='game';redraw();
 }
 function drawPlayers(target=root){
  target.append(el('h3',`${data.players.filter(p=>p.active!==false).length} Teilnehmer`),el('p','Die Namen sind nach Spielstart fest. Belegungen können in Dock zurückgesetzt werden.','game-muted'),...(data.game.state==='draft'?[button('Spieler hinzufügen',()=>playerForm())]:[]));const list=el('div',undefined,'game-player-list');for(const p of data.players.filter(p=>p.active!==false)){const row=el('div',undefined,'game-player-row');row.append(el('span',p.name));if(data.game.state==='draft')row.append(button('Bearbeiten',()=>playerForm(p)),button('Entfernen',()=>confirm(`„${p.name}“ entfernen?`,()=>manageGame('delete_player',gameId,{id:p.id}))));if(p.claimed&&data.game.state==='active')row.append(button('Belegung zurücksetzen',()=>confirm(`Belegung für „${p.name}“ zurücksetzen?`,()=>manageGame('reset',gameId,{id:p.id}))));list.append(row);}target.append(list);
  if(target===root&&data.game.state!=='draft')target.append(button('Zurück zum Spiel',()=>{if(busy)return;screen='game';redraw();}));
 }
 function drawGame(){
  const g=data.game,r=data.round,people=data.players.filter(p=>p.active!==false);root.append(el('h3',g.name),button('Spiel löschen',()=>confirm('Spiel einschließlich aller Spieler, Runden und Statistiken dauerhaft löschen? Der Link wird ungültig.',async()=>{await manageGame('delete',gameId);gameId=null;data=null;screen='list';expanded.clear();})));
  if(g.state==='active'&&g.token){const url=new URL('imposter.html',location.href);url.searchParams.set('game',g.token);const link=el('input');link.readOnly=true;link.value=url.href;link.setAttribute('aria-label','Gruppenlink');root.append(link);const share=el('div',undefined,'game-actions');share.append(button('Link kopieren',async()=>{try{await navigator.clipboard.writeText(url.href);status('Link kopiert.',root,false,true);}catch{link.focus();link.select();status('Bitte markierten Link kopieren.');}}));root.append(share);}
  if(g.state!=='draft'){const players=fold(`Spieler (${people.length})`,'players');drawPlayers(players);root.append(players);}
  if(g.state==='draft'){
   drawPlayers();root.append(el('p','Link und zufällige Rundenleitung entstehen erst beim Spielstart.'));
   const form=el('form',undefined,'game-setup-form'),group=el('div',undefined,'game-imposter-choice');group.setAttribute('role','group');group.setAttribute('aria-label','Imposter pro Runde');form.append(el('h3','Imposter pro Runde'));
   const setting=(n,reveal)=>run(()=>manageGame('configure',gameId,{expected_players:null,imposters:n,reveal_imposters:reveal}),form);
   for(const n of [1,2]){const choice=button(n+' Imposter',()=>setting(n,Boolean(g.reveal_imposters)));choice.setAttribute('aria-pressed',String(g.imposters===n));group.append(choice);}form.append(group);
   const label=el('label',undefined,'game-checkbox'),check=el('input');check.type='checkbox';check.checked=Boolean(g.reveal_imposters);label.append(check,el('span','Imposter sehen sich gegenseitig'));form.append(label);check.addEventListener('change',()=>setting(g.imposters,check.checked).then(()=>check.checked=Boolean(data.game.reveal_imposters)));
   const start=el('button','Spiel starten');start.type='submit';form.append(start);form.addEventListener('submit',e=>{e.preventDefault();if(people.length<=g.imposters+1){status(`Für ${g.imposters} Imposter mindestens ${g.imposters+2} Personen einschließlich Rundenleitung hinzufügen. Aktuell: ${people.length}.`,form);return;}run(async()=>{await manageGame('configure',gameId,{expected_players:people.length,imposters:g.imposters,reveal_imposters:Boolean(g.reveal_imposters)});await manageGame('start',gameId);},form);});root.append(form);return;
  }
  root.append(el('h3',g.state==='ended'?'Spiel beendet':r?`Runde ${r.number}`:'Spiel läuft'));
  if(r){const current=fold('Aktuelle Runde','current'),host=people.find(p=>p.id===r.host_id);current.append(el('p','Rundenleitung: '+(host?.name||'Teilnehmer')),el('p',r.phase==='choosing'?'Wort wird von der Rundenleitung festgelegt.':r.phase==='live'?'Runde läuft – Ergebnis steht noch aus.':r.winner==='imposter'?'Imposter haben gewonnen.':r.winner==='players'?'Die anderen haben gewonnen.':'Runde ohne Ergebnis beendet.'));if(r.word)current.append(el('p','Wort: '+r.word),el('p','Hinweis: '+(r.hint||'Kein Hinweis')));root.append(current);}
  root.append(el('p',`${people.filter(p=>p.claimed).length} von ${people.length} Namen belegt`));
  if(g.state==='active')root.append(button('Spiel beenden',()=>run(()=>manageGame('end',gameId))));
  else root.append(el('p','Der Gruppenlink ist dauerhaft deaktiviert.'));
  const history=fold(`Rundenhistorie (${(data.history||[]).length})`,'history');history.className='game-history game-section';for(const round of data.history||[]){const row=fold(`Runde ${round.number} · ${round.winner==='imposter'?'Imposter gewonnen':round.winner==='players'?'Die anderen gewonnen':'Ohne Ergebnis'}`,'round-'+round.number);row.append(el('p','Rundenleitung: '+round.host),el('p','Imposter: '+round.imposters.join(', ')));history.append(row);}if(!(data.history||[]).length)history.append(el('p','Noch keine abgeschlossene Runde.'));
  const scores=fold('Siege als Imposter','scores'),table=el('table',undefined,'game-stats-table'),head=el('thead'),header=el('tr');header.append(el('th','Name'),el('th','Siege'));head.append(header);table.append(head);const body=el('tbody');for(const p of imposterStats(data.players,data.history||[])){const row=el('tr');row.append(el('td',p.name),el('td',String(p.wins)));body.append(row);}table.append(body);scores.append(table);root.append(history,scores);

 }
 function reset(){epoch++;gameId=null;data=null;screen='list';playersReturn='list';expanded.clear();root.replaceChildren();}
 const tick=()=>{if(active()&&!busy&&screen==='game'&&data?.game.state==='active'&&!root.querySelector('.game-confirm')&&document.visibilityState!=='hidden')load().catch(e=>status(e.message,root,true));};let timer=setInterval(tick,5000);
 window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(tick,5000);});
 new MutationObserver(()=>{if(active())load().catch(e=>status(e.message,root,true));else reset();}).observe(view,{attributes:true,attributeFilter:['class']});
 document.addEventListener('dock:auth-changed',()=>{reset();if(active())load().catch(e=>status(e.message,root,true));});window.addEventListener('pagehide',reset);
}
