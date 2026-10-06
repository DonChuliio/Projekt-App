import { loadRecurringTransactions } from "../data/recurring-transactions-data.js?v=1.26";
import { loadPocketMoneyExpenses } from "../data/pocket-money-data.js?v=1.26";
const BUDGET=500;
const euro=v=>new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(v);
const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
function occurrence(entry,y,m){
 const start=new Date(`${entry.start_date}T12:00:00`),sm=start.getMonth(),day=Math.min(start.getDate(),daysInMonth(y,m));
 if(entry.frequency==="monthly") return new Date(y,m,day);
 if(entry.frequency==="yearly"&&m===sm) return new Date(y,m,day);
 if(entry.frequency==="quarterly"&&((m-sm+12)%3===0)) return new Date(y,m,day);
 return null;
}
export function initExpensesOverview(){
 const root=document.getElementById("expenses-overview-content");if(!root)return;
 let recurring=[],pocket=[],cursor=new Date();cursor.setDate(1);
 async function load(){try{[recurring,pocket]=await Promise.all([loadRecurringTransactions(),loadPocketMoneyExpenses()]);render();}catch(e){console.error("Ausgabenübersicht konnte nicht geladen werden:",e);root.innerHTML='<p class="loan-error">Übersicht konnte nicht geladen werden.</p>';}}
 function render(){
  const y=cursor.getFullYear(),m=cursor.getMonth(),today=new Date(),isCurrent=y===today.getFullYear()&&m===today.getMonth();
  const items=recurring.map(e=>({entry:e,date:occurrence(e,y,m)})).filter(x=>x.date).sort((a,b)=>a.date-b.date);
  const income=items.filter(x=>x.entry.transaction_type==="income").reduce((s,x)=>s+Number(x.entry.amount),0);
  const fixed=items.filter(x=>x.entry.transaction_type==="expense").reduce((s,x)=>s+Number(x.entry.amount),0);
  const free=income-fixed;
  const spent=pocket.filter(e=>{const d=new Date(`${e.expense_date}T12:00:00`);return d.getFullYear()===y&&d.getMonth()===m;}).reduce((s,e)=>s+Number(e.amount),0);
  const left=BUDGET-spent;
  const future=isCurrent?items.filter(x=>x.date>=new Date(today.getFullYear(),today.getMonth(),today.getDate())):items;
  const past=isCurrent?items.filter(x=>x.date<new Date(today.getFullYear(),today.getMonth(),today.getDate())).reverse():[];
  root.innerHTML=`<div class="overview-month-nav"><button id="ov-prev">&lt;</button><strong>${new Intl.DateTimeFormat("de-DE",{month:"long",year:"numeric"}).format(cursor)}</strong><button id="ov-next">&gt;</button></div>
  <div class="overview-card"><div><span>Fixe Einnahmen</span><strong>${euro(income)}</strong></div><div><span>Fixe Ausgaben</span><strong>− ${euro(fixed)}</strong></div><div class="overview-free"><span>Frei verfügbar</span><strong>${euro(free)}</strong></div></div>
  <div class="overview-card"><div><span>Taschengeld ausgegeben</span><strong>− ${euro(spent)}</strong></div><div class="overview-free"><span>Noch verfügbar</span><strong>${euro(left)}</strong></div><div class="overview-budget"><i style="width:${Math.min(100,Math.max(0,spent/BUDGET*100))}%"></i></div><small>${euro(spent)} von ${euro(BUDGET)}</small></div>
  <div id="ov-bookings"></div>`;
  root.querySelector("#ov-prev").onclick=()=>{cursor.setMonth(cursor.getMonth()-1);render();};root.querySelector("#ov-next").onclick=()=>{cursor.setMonth(cursor.getMonth()+1);render();};
  const list=root.querySelector("#ov-bookings");
  if(isCurrent){appendGroup(list,"Als Nächstes",future.slice(0,1),true);appendGroup(list,"Noch kommt",future.slice(1),true);appendGroup(list,"Bereits gewesen",past,false);}
  else appendGroup(list,"Buchungen",items,false);
 }
 function appendGroup(parent,title,items,future){if(!items.length)return;const h=document.createElement("h3");h.className="overview-list-title";h.textContent=title;parent.append(h);items.forEach(x=>{const row=document.createElement("div");row.className=`overview-booking${future?" overview-future":""}`;const d=String(x.date.getDate()).padStart(2,"0")+".";const amount=Number(x.entry.amount),sign=x.entry.transaction_type==="income"?"+":"−";row.innerHTML=`<span class="overview-date">${d}</span><strong></strong><span class="overview-amount">${sign} ${euro(amount)}</span>`;row.querySelector("strong").textContent=x.entry.name;parent.append(row);});}
 document.addEventListener("dock:recurring-changed", load);
 const overviewTile=document.querySelector('[data-tile="expenses-overview"]');
 if(overviewTile) overviewTile.addEventListener("click", load);
 load();
}
