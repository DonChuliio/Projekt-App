import { showView } from "../router.js";
import { loadPacklists, createPacklist, updatePacklist, deletePacklist } from "../data/packlist-data.js?v=0.97";
import { initPacklistEditor } from "./packlist-editor.js?v=1.07";
import { initPacklistRun } from "./packlist-run.js?v=1.07";

function setTitle(id,name){const el=document.getElementById(id);if(el)el.textContent=name;}
function selectPacklist(packlist, mode){
 sessionStorage.setItem("active-packlist-id",String(packlist.id));
 sessionStorage.setItem("packlist-run-mode",mode);
}

function openBringExport(packlist){
 document.getElementById("packlist-action-dialog")?.remove();
 document.getElementById("packlist-export-dialog")?.remove();

 const buckets=(packlist.buckets||[]).map(bucket=>({
  name:bucket.name||"Bucket",
  items:(bucket.items||[]).filter(item=>item?.text?.trim())
 }));

 const total=buckets.reduce((sum,bucket)=>sum+bucket.items.length,0);
 if(!total){alert("Diese Packliste enthält noch keine Einträge.");return;}

 const overlay=document.createElement("div");
 overlay.id="packlist-export-dialog";
 overlay.className="packlist-dialog-overlay";

 const dialog=document.createElement("div");
 dialog.className="packlist-dialog packlist-export-dialog";

 const title=document.createElement("h3");
 title.textContent="An Bring! exportieren";

 const text=document.createElement("p");
 text.textContent="Wähle aus, was an Bring! übergeben werden soll.";

 const bucketArea=document.createElement("div");
 const count=document.createElement("span");
 count.className="packlist-export-count";

 const updateCount=()=>{
  const selected=dialog.querySelectorAll('.packlist-export-item input[type="checkbox"]:checked').length;
  count.textContent=`${selected} von ${total} Einträgen ausgewählt`;
 };

 for(const bucket of buckets){
  if(!bucket.items.length)continue;

  const section=document.createElement("section");
  section.className="packlist-export-bucket";

  const head=document.createElement("label");
  head.className="packlist-export-bucket-head";
  const bucketCheck=document.createElement("input");
  bucketCheck.type="checkbox";
  bucketCheck.checked=true;
  const bucketName=document.createElement("span");
  bucketName.textContent=bucket.name;
  head.append(bucketCheck,bucketName);
  section.appendChild(head);

  const itemChecks=[];
  for(const item of bucket.items){
   const row=document.createElement("label");
   row.className="packlist-export-item";
   const check=document.createElement("input");
   check.type="checkbox";
   check.checked=true;
   check.dataset.itemText=item.text.trim();
   const label=document.createElement("span");
   label.textContent=item.text.trim();
   row.append(check,label);
   section.appendChild(row);
   itemChecks.push(check);

   check.addEventListener("change",()=>{
    bucketCheck.checked=itemChecks.every(input=>input.checked);
    bucketCheck.indeterminate=!bucketCheck.checked&&itemChecks.some(input=>input.checked);
    updateCount();
   });
  }

  bucketCheck.addEventListener("change",()=>{
   bucketCheck.indeterminate=false;
   itemChecks.forEach(input=>input.checked=bucketCheck.checked);
   updateCount();
  });

  bucketArea.appendChild(section);
 }

 const actions=document.createElement("div");
 actions.className="packlist-export-actions";

 const confirm=document.createElement("button");
 confirm.type="button";
 confirm.textContent="Auswahl bestätigen";
 confirm.onclick=()=>{
  const items=[...dialog.querySelectorAll('.packlist-export-item input[type="checkbox"]:checked')]
   .map(input=>input.dataset.itemText)
   .filter(Boolean);
  if(!items.length){alert("Bitte mindestens einen Eintrag auswählen.");return;}

  const params=new URLSearchParams();
  params.set("name",packlist.name||"Dock Packliste");
  items.forEach(item=>params.append("item",item));
  window.location.href=`https://osmmjfuzuxhwtfcttdxp.supabase.co/functions/v1/bring-export?${params.toString()}`;
 };

 const cancel=document.createElement("button");
 cancel.type="button";
 cancel.className="packlist-dialog-cancel";
 cancel.textContent="Abbrechen";
 cancel.onclick=()=>overlay.remove();

 actions.append(count,confirm,cancel);
 dialog.append(title,text,bucketArea,actions);
 overlay.appendChild(dialog);
 document.body.appendChild(overlay);
 updateCount();

 overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
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
 const bring=document.createElement("button"); bring.textContent="An Bring! exportieren";
 bring.onclick=()=>openBringExport(packlist);
 const remove=document.createElement("button"); remove.className="packlist-dialog-delete"; remove.textContent="Liste löschen";
 remove.onclick=async()=>{if(!confirm("Packliste wirklich löschen?"))return;await deletePacklist(packlist.id);overlay.remove();await renderPacklists();};
 const cancel=document.createElement("button"); cancel.className="packlist-dialog-cancel";cancel.textContent="Abbrechen";cancel.onclick=()=>overlay.remove();
 dialog.append(title,text,cont,fresh,edit,bring,remove,cancel);overlay.appendChild(dialog);document.body.appendChild(overlay);
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