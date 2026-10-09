import { imposterStats } from './stats.js?v=1.80';
import { manageGame } from './admin-data.js?v=1.80';
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
 const goBack=()=>{if(busy)return;if(screen==='players'&&playersReturn==='game'){screen='game';redraw();}else if(screen!=='list'){gameId=null;screen='list';load().catch(e=>status(e.message));}else showView('games');};
 back?.addEventListener('click',goBack);
 const active=()=>!view.classList.contains('hidden')&&Boolean(getSession());
 const status=(msg,target=root)=>{let n=target.querySelector('[role="status"]');if(!n){n=el('p',undefined,'loan-error');n.setAttribute('role','status');target.prepend(n);}n.textContent=msg;n.scrollIntoView?.({block:'nearest',behavior:'smooth'});};
 async function run(fn,feedbackTarget=root){if(busy||!active())return;busy=true;const generation=epoch,owner=getSession()?.user?.id,controls=[...root.querySelectorAll('button,input,select')];controls.forEach(n=>n.disabled=true);try{await fn();if(generation!==epoch||owner!==getSession()?.user?.id)return;await load();}catch(e){if(generation===epoch&&owner===getSession()?.user?.id)status(e.message,feedbackTarget);}finally{busy=false;controls.forEach(n=>n.disabled=false);}}
 const field=(form,label,value='',type='text')=>{const wrap=el('label'),input=el('input');input.type=type;input.value=value;input.maxLength=type==='text'?200:100;wrap.append(el('span',label),input);form.append(wrap);return input;};
 function playerForm(player=null){root.querySelector('.game-player-form')?.remove();const form=el('form',undefined,'game-player-form'),name=field(form,'Teilnehmername',player?.name||'');name.maxLength=100;name.required=true;const save=el('button','Teilnehmer speichern');save.type='submit';form.append(save,button('Abbrechen',()=>form.remove()));form.addEventListener('submit',e=>{e.preventDefault();if(name.value.trim())run(()=>manageGame('player',gameId,{id:player?.id,name:name.value.trim()}));});root.prepend(form);name.focus();}
 function confirm(text,action,target=root){root.querySelector('.game-confirm')?.remove();const box=el('section',undefined,'game-confirm');box.append(el('p',text),button('Bestätigen',()=>run(action,target)),button('Abbrechen',()=>box.remove()));if(target===root)target.prepend(box);else target.append(box);box.scrollIntoView?.({block:'nearest',behavior:'smooth'});}
 async function load(){const generation=epoch,serial=++loadSerial,owner=getSession()?.user?.id;if(!active())return;
  if(!gameId){const games=await manageGame('list');if(!active()||generation!==epoch||serial!==loadSerial||owner!==getSession()?.user?.id)return;screen='list';root.replaceChildren();root.append(el('h3','Spiel erstellen'));
   const create=el('form',undefined,'game-create-form'),name=field(create,'Spielname');name.maxLength=100;name.required=true;const submit=el('button','Spiel erstellen');submit.type='submit';create.append(submit);create.addEventListener('submit',e=>{e.preventDefault();if(name.value.trim())run(async()=>{gameId=(await manageGame('create',null,{name:name.value.trim()})).id;screen='players';playersReturn='list';});});root.append(create);
   if(games.length){root.append(el('h3','Meine Spiele'));const list=el('div',undefined,'game-list');for(const g of games){const b=button(g.name+(g.state==='ended'?' · Beendet':g.state==='active'?' · Läuft':' · Einrichtung'),()=>run(async()=>{gameId=g.id;screen='open';}));if(g.state==='ended')b.className='game-ended';list.append(b);}root.append(list);}return;
  }
  const next=await manageGame('view',gameId);if(!active()||generation!==epoch||serial!==loadSerial||owner!==getSession()?.user?.id)return;data=next;if(screen==='open')screen=data.game.state!=='draft'||data.players.filter(p=>p.active!==false).length>=3?'game':'players';redraw();
 }
 function drawPlayers(){
  root.append(el('h3',data.game.name+' · Spieler'),el('p','Spieler anlegen und anschließend bestätigen.','game-muted'));
  if(data.game.state==='draft'){const label=el('label',undefined,'game-checkbox'),check=el('input');check.type='checkbox';check.checked=Boolean(data.game.reveal_imposters);label.append(check,el('span','Imposter sehen sich gegenseitig'));root.append(label);check.addEventListener('change',()=>run(()=>manageGame('configure',gameId,{expected_players:data.game.expected_players||null,imposters:data.game.imposters,reveal_imposters:check.checked})).then(()=>check.checked=Boolean(data.game.reveal_imposters)));}

  root.append(el('h3',`${data.players.length} Teilnehmer`),el('p','Die Namen sind nach Spielstart fest. Belegungen können in Dock zurückgesetzt werden.','game-muted'),...(data.game.state==='draft'?[button('Spieler hinzufügen',()=>playerForm())]:[]));const list=el('div',undefined,'game-player-list');for(const p of data.players.filter(p=>p.active!==false)){const row=el('div',undefined,'game-player-row');row.append(el('span',p.name));if(data.game.state==='draft')row.append(button('Bearbeiten',()=>playerForm(p)),button('Entfernen',()=>confirm(`„${p.name}“ entfernen und laufende Runde schließen?`,()=>manageGame('delete_player',gameId,{id:p.id}))));if(p.claimed&&data.game.state==='active')row.append(button('Belegung zurücksetzen',()=>confirm(`Belegung für „${p.name}“ zurücksetzen?`,()=>manageGame('reset',gameId,{id:p.id}))));list.append(row);}root.append(list);
  root.append(button('Spieler bestätigen',()=>{if(busy)return;if(data.game.state==='draft'&&data.players.filter(p=>p.active!==false).length<3){status('Mindestens drei Spieler einschließlich Rundenleitung anlegen.');return;}screen='game';redraw();}));
 }
 function drawGame(){
  const g=data.game,r=data.round,people=data.players.filter(p=>p.active!==false);root.append(el('h3',g.name));
  if(g.state==='active'&&g.token){const url=new URL('imposter.html',location.href);url.searchParams.set('game',g.token);const link=el('input');link.readOnly=true;link.value=url.href;link.setAttribute('aria-label','Gruppenlink');root.append(link);const share=el('div',undefined,'game-actions');share.append(button('Link kopieren',async()=>{try{await navigator.clipboard.writeText(url.href);status('Link kopiert.');}catch{link.focus();link.select();status('Bitte markierten Link kopieren.');}}));const whatsapp=el('a','Über WhatsApp teilen');whatsapp.href='https://wa.me/?text='+encodeURIComponent('Dock Imposter: '+url.href);whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';share.append(whatsapp);root.append(share,el('p','Namen bleiben pro Gerät für dieses Spiel gespeichert. Der Link prüft keine Identität.','game-muted'));}
  root.append(button('Spieler anzeigen',()=>{if(busy)return;screen='players';playersReturn='game';run(async()=>{});}));
  if(g.state==='draft'){
   root.append(el('p','Link und zufällige Rundenleitung entstehen erst beim Spielstart.'),el('p','Imposter sehen sich gegenseitig: '+(g.reveal_imposters?'Ja':'Nein')));
   const form=el('form',undefined,'game-setup-form'),count=field(form,'Anzahl Personen einschließlich Rundenleitung',g.expected_players||people.length||3,'number');count.min=3;count.max=100;count.required=true;
   const label=el('label','Imposter pro Runde'),imposters=el('select');for(const n of [1,2]){const o=el('option',n+' Imposter');o.value=String(n);imposters.append(o);}imposters.value=String(g.imposters);label.append(imposters);form.append(label,el('p',people.length+' Namen angelegt.'));
   const save=el('button','Einstellungen speichern');save.type='button';save.addEventListener('click',()=>configure(false));const start=el('button','Spiel starten');start.type='submit';form.append(save,start);
   function configure(startGame){const expected=Number(count.value),n=Number(imposters.value);if(!Number.isInteger(expected)||expected<3||expected>100||expected<=n+1){status(`Für ${n} Imposter mindestens ${n+2} Personen einschließlich Rundenleitung einstellen.`,form);return;}if(startGame&&expected!==people.length){status(`Bitte genau ${expected} Namen anlegen. Aktuell: ${people.length}.`,form);return;}run(async()=>{await manageGame('configure',gameId,{expected_players:expected,imposters:n,reveal_imposters:Boolean(g.reveal_imposters)});if(startGame)await manageGame('start',gameId);},form);}
   form.addEventListener('submit',e=>{e.preventDefault();configure(true);});root.append(form);return;
  }
  root.append(el('h3',g.state==='ended'?'Spiel beendet':r?`Runde ${r.number}`:'Spiel läuft'));
  if(r){const current=fold('Aktuelle Runde','current'),host=people.find(p=>p.id===r.host_id);current.append(el('p','Rundenleitung: '+(host?.name||'Teilnehmer')),el('p',r.phase==='choosing'?'Wort wird von der Rundenleitung festgelegt.':r.phase==='live'?'Runde läuft – Ergebnis steht noch aus.':r.winner==='imposter'?'Imposter haben gewonnen.':r.winner==='players'?'Die anderen haben gewonnen.':'Runde ohne Ergebnis beendet.'));if(r.word)current.append(el('p','Wort: '+r.word),el('p','Hinweis: '+(r.hint||'Kein Hinweis')));root.append(current);}
  root.append(el('p',`${people.filter(p=>p.claimed).length} von ${people.length} Namen belegt`));
  if(g.state==='active')root.append(button('Aktualisieren',()=>run(async()=>{})),button('Spiel beenden',()=>confirm('Spiel dauerhaft beenden? Der Link wird deaktiviert. Statistiken bleiben erhalten.',()=>manageGame('end',gameId))));
  else root.append(el('p','Der Gruppenlink ist dauerhaft deaktiviert.'));
  const history=fold(`Rundenhistorie (${(data.history||[]).length})`,'history');history.className='game-history game-section';for(const round of data.history||[]){const row=fold(`Runde ${round.number} · ${round.winner==='imposter'?'Imposter gewonnen':round.winner==='players'?'Die anderen gewonnen':'Ohne Ergebnis'}`,'round-'+round.number);row.append(el('p','Rundenleitung: '+round.host),el('p','Imposter: '+round.imposters.join(', ')));history.append(row);}if(!(data.history||[]).length)history.append(el('p','Noch keine abgeschlossene Runde.'));
  const scores=fold('Siege als Imposter','scores'),table=el('table',undefined,'game-stats-table'),head=el('thead'),header=el('tr');header.append(el('th','Name'),el('th','Siege'));head.append(header);table.append(head);const body=el('tbody');for(const p of imposterStats(data.players,data.history||[])){const row=el('tr');row.append(el('td',p.name),el('td',String(p.wins)));body.append(row);}table.append(body);scores.append(table);root.append(history,scores);

 }
 function reset(){epoch++;gameId=null;data=null;screen='list';playersReturn='list';expanded.clear();root.replaceChildren();}
 const tick=()=>{if(active()&&!busy&&screen==='game'&&data?.game.state==='active'&&!root.querySelector('.game-confirm')&&document.visibilityState!=='hidden')load().catch(e=>status(e.message));};let timer=setInterval(tick,5000);
 window.addEventListener('pagehide',()=>clearInterval(timer));window.addEventListener('pageshow',()=>{clearInterval(timer);timer=setInterval(tick,5000);});
 new MutationObserver(()=>{if(active())load().catch(e=>status(e.message));else reset();}).observe(view,{attributes:true,attributeFilter:['class']});
 document.addEventListener('dock:auth-changed',()=>{reset();if(active())load().catch(e=>status(e.message));});window.addEventListener('pagehide',reset);
}
