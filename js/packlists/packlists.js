import { showView } from "../router.js";
import { loadPacklists, createPacklist, updatePacklist } from "../data/packlist-data.js?v=0.97";
import { initPacklistEditor } from "./packlist-editor.js?v=0.97";
import { initPacklistRun } from "./packlist-run.js?v=0.97";

function setTitle(id,name){const el=document.getElementById(id);if(el)el.textContent=name;}
function selectPacklist(packlist, mode){
 sessionStorage.setItem("active-packlist-id",String(packlist.id));
 sessionStorage.setItem("packlist-run-mode",mode);
}
function openDialog(packlist){
 document.getElementById("packlist-action-dialog")?.remove();
 const overlay=document.createElement("div"); overlay.id="packlist-action-dialog"; overlay.className="packlist-dialog-overlay";
 const dialog=document.createElement("div"); dialog.className="packlist-dialog";
 const title=document.createElement("h3"); title.textContent=packlist.name;
 const text=document.createElement("p"); text.textContent="Was möchtest du machen?";
 const cont=document.createElement("button"); cont.textContent="Fortsetzen";
 cont.onclick=async()=>{overlay.remove();selectPacklist(packlist,"continue");setTitle("packlist-run-title",packlist.name);showView("packlist-run");await initPacklistRun();};
 const fresh=document.createElement("button"); fresh.textContent="Neu starten";
 fresh.onclick=async()=>{overlay.remove();await updatePacklist(packlist.id,{progress:[]});packlist.progress=[];selectPacklist(packlist,"continue");setTitle("packlist-run-title",packlist.name);showView("packlist-run");await initPacklistRun();};
 const edit=document.createElement("button"); edit.textContent="Liste bearbeiten";
 edit.onclick=async()=>{overlay.remove();selectPacklist(packlist,"edit");setTitle("packlist-edit-title",packlist.name);showView("packlist-edit");await initPacklistEditor();};
 const cancel=document.createElement("button"); cancel.className="packlist-dialog-cancel";cancel.textContent="Abbrechen";cancel.onclick=()=>overlay.remove();
 dialog.append(title,text,cont,fresh,edit,cancel);overlay.appendChild(dialog);document.body.appendChild(overlay);
 overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
}
export async function renderPacklists(){
 const list=document.getElementById("packlists-list");if(!list)return;list.innerHTML="";
 try{const rows=await loadPacklists();rows.forEach(p=>{const li=document.createElement("li");li.textContent=p.name;li.onclick=()=>openDialog(p);list.appendChild(li);});}
 catch(e){console.log("Packlisten noch nicht geladen:",e.message);}
}
export function initPacklists(){
 const btn=document.getElementById("create-packlist");if(!btn)return;
 if(!btn.dataset.ready){btn.dataset.ready="1";btn.onclick=async()=>{const name=prompt("Name der Packliste:")?.trim();if(!name)return;await createPacklist(name);await renderPacklists();};}
 document.querySelector('[data-tile="packlists"]')?.addEventListener("click",renderPacklists);
 renderPacklists();
}