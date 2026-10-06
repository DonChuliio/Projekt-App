import { loadPacklist, updatePacklist } from "../data/packlist-data.js?v=1.33";
function id(){return sessionStorage.getItem("active-packlist-id");}
export async function initPacklistRun(){
 const c=document.getElementById("packlist-run-content");if(!c)return;c.innerHTML="";
 let p;try{p=await loadPacklist(id());}catch(e){console.error(e);c.textContent="Packliste konnte nicht geladen werden.";return;}if(!p){c.textContent="Keine aktive Packliste gewählt.";return;}
 document.getElementById("packlist-run-title").textContent=p.name;p.buckets ||= [];let checked=Array.isArray(p.progress)?p.progress:[];
 const renderProgress=()=>{const ids=p.buckets.flatMap(b=>(b.items||[]).map(i=>i.id));progress.textContent=`Fortschritt: ${checked.filter(x=>ids.includes(x)).length} / ${ids.length}`;};
 const progress=document.createElement("p");progress.className="packlist-progress";renderProgress();c.appendChild(progress);
 for(const b of p.buckets){b.items ||= [];const s=document.createElement("section");s.className="bucket";const h=document.createElement("div");h.className="bucket-header";const t=document.createElement("button");t.className="bucket-toggle";t.classList.toggle("open",!b.collapsed);t.textContent=b.collapsed?">":"v";const title=document.createElement("h3");title.textContent=b.name||"Bucket";h.append(t,title);s.appendChild(h);const content=document.createElement("div");content.className="bucket-content";if(b.collapsed)content.classList.add("hidden");
  for(const item of b.items){const row=document.createElement("div");row.className="pack-item clickable";row.textContent=item.text;if(checked.includes(item.id))row.classList.add("packed");row.onclick=async()=>{if(checked.includes(item.id)){checked=checked.filter(x=>x!==item.id);row.classList.remove("packed");}else{checked.push(item.id);row.classList.add("packed");}renderProgress();await updatePacklist(p.id,{progress:checked});};content.appendChild(row);}
  s.appendChild(content);t.onclick=async()=>{b.collapsed=!b.collapsed;await updatePacklist(p.id,{buckets:p.buckets});content.classList.toggle("hidden",b.collapsed);t.classList.toggle("open",!b.collapsed);t.textContent=b.collapsed?">":"v";};c.appendChild(s);
 }
}