import { showView } from "../router.js";
import { loadPacklist, updatePacklist, deletePacklist } from "../data/packlist-data.js?v=0.97";
import { renderPacklists } from "./packlists.js?v=0.97";
function id(){return sessionStorage.getItem("active-packlist-id");}
export async function initPacklistEditor(){
 const c=document.getElementById("packlist-edit-content");if(!c)return;c.innerHTML="";
 let p;try{p=await loadPacklist(id());}catch(e){console.error(e);return;}if(!p)return;p.buckets ||= [];
 document.getElementById("packlist-edit-title").textContent=p.name;
 const del=document.createElement("button");del.textContent="Packliste löschen";del.onclick=async()=>{if(!confirm("Packliste wirklich löschen?"))return;await deletePacklist(p.id);await renderPacklists();showView("packlists");};c.appendChild(del);
 if(p.buckets.length<5){const add=document.createElement("button");add.textContent="Bucket hinzufügen";add.onclick=async()=>{p.buckets.push({id:crypto.randomUUID(),name:"Neuer Bucket",collapsed:false,items:[]});await updatePacklist(p.id,{buckets:p.buckets});await initPacklistEditor();};c.appendChild(add);}
 for(const b of p.buckets){
  const s=document.createElement("section"), title=document.createElement("input"), toggle=document.createElement("button");
  title.value=b.name;title.onchange=async()=>{b.name=title.value;await updatePacklist(p.id,{buckets:p.buckets});};
  toggle.textContent=b.collapsed?">":"v";toggle.onclick=async()=>{b.collapsed=!b.collapsed;await updatePacklist(p.id,{buckets:p.buckets});await initPacklistEditor();};
  s.append(toggle,title);
  if(!b.collapsed){for(const item of (b.items||[])){const row=document.createElement("div");row.textContent=item.text;const x=document.createElement("button");x.textContent="Löschen";x.onclick=async()=>{b.items=b.items.filter(i=>i.id!==item.id);p.progress=(p.progress||[]).filter(i=>i!==item.id);await updatePacklist(p.id,{buckets:p.buckets,progress:p.progress});await initPacklistEditor();};row.appendChild(x);s.appendChild(row);}
   const addItem=document.createElement("button");addItem.textContent="Item hinzufügen";addItem.onclick=async()=>{const text=prompt("Item:")?.trim();if(!text)return;b.items ||= [];b.items.push({id:crypto.randomUUID(),text});await updatePacklist(p.id,{buckets:p.buckets});await initPacklistEditor();};s.appendChild(addItem);}
  c.appendChild(s);
 }
}