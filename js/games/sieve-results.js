export const SIEVE_CATEGORIES=['Erklären','Ein Wort','Pantomime','Geräusche'];
export function sieveTotals(categories){const total={A:0,B:0};for(const c of categories||[])if(c.completed){total.A+=c.words_a+c.bonus_a;total.B+=c.words_b+c.bonus_b;}return total;}
export function sieveWinner(categories){const {A,B}=sieveTotals(categories);return A===B?'Unentschieden':`Team ${A>B?'A':'B'} gewinnt`;}
export function appendSieveResults(container,categories,{final=false,create=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;}}={}){
 const completed=(categories||[]).filter(c=>c.completed);if(!completed.length)return;
 container.append(create('h3',final?'Endergebnis':'Runde beendet'));
 for(const c of completed){const detail=create('details');detail.className='game-section';detail.open=!final&&c===completed.at(-1);detail.append(create('summary',c.name||SIEVE_CATEGORIES[c.number-1]||'Kategorie '+c.number));detail.append(create('p',`Team A: ${c.words_a} Wörter (${c.jokers_a} Joker)${c.bonus_a?' · +1 Bonuspunkt':''}`),create('p',`Team B: ${c.words_b} Wörter (${c.jokers_b} Joker)${c.bonus_b?' · +1 Bonuspunkt':''}`));container.append(detail);}
 const t=sieveTotals(completed);container.append(create('p',`Gesamt: Team A ${t.A} · Team B ${t.B}`));if(final)container.append(create('h2',sieveWinner(completed)));
}
