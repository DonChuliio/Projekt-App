import { getSession } from '../auth/auth.js';
import { loadDocuments, createDocument, updateDocument, downloadDocument, permanentlyDeleteDocument } from '../data/documents-data.js';
import { prepareFile, jpegPage, localDate, filterNames } from './files.js';
import { createScanPdf } from './scan-pdf.js';

export function initDocuments(){
 const root=document.getElementById('documents-content'),view=document.querySelector('[data-view="documents"]');
 if(!root||!view)return;
 let docs=[],page='home',selected=null,pendingFile=null,scan=[],query='',trash=false,busy=false,epoch=0,urls=[],loadedUser=null;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const clearUrls=()=>{urls.forEach(url=>URL.revokeObjectURL(url));urls=[];};
 const blobUrl=blob=>{const url=URL.createObjectURL(blob);urls.push(url);return url;};
 const button=(label,action,cls='')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',action);return b;};
 function field(form,label,{value='',type='text',required=false,maxLength=200}={}){const wrap=el('label',undefined,'documents-field');wrap.append(el('span',label));const input=el(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value;input.required=required;input.maxLength=maxLength;wrap.append(input);form.append(wrap);return input;}
 function status(message,error=false){let box=root.querySelector('[role="status"]');if(!box){box=el('p');box.setAttribute('role','status');root.prepend(box);}box.textContent=message;box.className=error?'documents-error':'documents-status';}
 async function run(action){if(busy)return;busy=true;const generation=epoch;root.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=true);try{await action();}catch(error){if(generation===epoch)status(error.message,true);}finally{busy=false;root.querySelectorAll('button,input,select,textarea').forEach(n=>n.disabled=false);}}
 async function reload(){const owner=getSession()?.user?.id;if(!owner)throw new Error('Bitte zuerst anmelden.');const rows=await loadDocuments();if(getSession()?.user?.id!==owner)return;docs=rows;loadedUser=owner;}
 function go(next){clearUrls();page=next;render();}
 function docList(list){const box=el('div',undefined,'documents-list');if(!list.length)box.append(el('p','Hier sind noch keine Dokumente.','documents-muted'));for(const doc of list){const b=button(doc.name,()=>{selected=doc;go('document');},'documents-row');b.append(el('small',`${doc.document_date||'Ohne Datum'} · ${doc.state==='pending'?'Unvollständiger Import':(doc.size_bytes/1024/1024).toFixed(1)+' MiB'}`));box.append(b);}return box;}
 function heading(title,back=()=>go('home')){const h=el('div',undefined,'documents-heading');h.append(button('Zurück',back,'secondary'),el('h2',title));root.append(h);}
 function picker(label,{accept,capture,multiple=false,scanMode=false}={}){
  const input=el('input');input.type='file';input.accept=accept;input.multiple=multiple;if(capture)input.setAttribute('capture',capture);input.className='documents-file-input';input.setAttribute('aria-label',label);
  input.addEventListener('change',()=>{const files=Array.from(input.files||[]);input.value='';if(!files.length)return;run(async()=>{const generation=epoch;if(scanMode){for(const file of files){if(scan.length>=30)throw new Error('Maximal 30 Scanseiten.');const data=await jpegPage(file,{maxEdge:1600,quality:.8});if(generation!==epoch)return;scan.push({...data,rotation:0});}go('scan');}else{pendingFile=await prepareFile(files[0]);if(generation!==epoch){pendingFile=null;return;}go('import');}});});
  const b=button(label,()=>input.click(),'documents-choice');root.append(b,input);
 }
 function renderHome(){
  root.append(el('h2',trash?'Papierkorb':'Posteingang'));
  const actions=el('div',undefined,'documents-actions');actions.append(button('Dokument hinzufügen',()=>go('add')),button(trash?'Zum Posteingang':'Papierkorb',()=>{trash=!trash;render();},'secondary'),button('Neu laden',()=>run(async()=>{await reload();render();}),'secondary'));root.append(actions);
  const search=el('input');search.type='search';search.placeholder='Dokumentnamen suchen';search.value=query;search.setAttribute('aria-label','Dokumentnamen suchen');root.append(search);
  const results=el('div');const update=()=>{results.replaceChildren(docList(filterNames(docs.filter(d=>Boolean(d.trashed_at)===trash),query)));};search.addEventListener('input',()=>{query=search.value;update();});root.append(results);update();
 }
 function renderAdd(){heading('Dokument hinzufügen');root.append(el('p','PDFs werden unverändert gespeichert. Große Fotos werden bei Bedarf verkleinert. Bis zu 10 MiB pro Dokument.','documents-muted'));
  picker('Fotografieren',{accept:'image/*',capture:'environment'});picker('Foto oder Screenshot auswählen',{accept:'image/jpeg,image/png,image/webp,image/heic,image/heif'});picker('PDF hochladen',{accept:'application/pdf,.pdf'});
  root.append(button('Mehrseitigen Scan starten',()=>{scan=[];go('scan');},'documents-choice'));
 }
 function renderImport(){heading('Im Posteingang speichern',()=>{pendingFile=null;go('add');});const form=el('form',undefined,'documents-form');const name=field(form,'Dokumentname',{value:pendingFile?.name?.replace(/\.[^.]+$/,'')||'Dokument '+localDate(),required:true});const date=field(form,'Dokumentdatum',{value:localDate(),type:'date'});const submit=el('button','Sicher speichern');submit.type='submit';form.append(submit);form.addEventListener('submit',e=>{e.preventDefault();if(!name.value.trim()){status('Bitte einen Dokumentnamen eingeben.',true);return;}run(async()=>{const generation=epoch;const doc=await createDocument(pendingFile,{name:name.value,date:date.value});pendingFile=null;await reload();if(generation!==epoch)return;selected=doc;go('imported');});});root.append(form);}
 function renderScan(){heading('Mehrseitiger Scan',()=>{scan=[];go('add');});root.append(el('p','Seiten fotografieren oder Bilder hinzufügen. Reihenfolge prüfen, bei Bedarf drehen. Die PDF wird direkt auf diesem Gerät erstellt.','documents-muted'));
  picker('Weitere Seite fotografieren',{accept:'image/*',capture:'environment',scanMode:true});picker('Seiten aus Fotos hinzufügen',{accept:'image/jpeg,image/png,image/webp,image/heic,image/heif',multiple:true,scanMode:true});
  const list=el('div',undefined,'documents-scan');scan.forEach((item,i)=>{const card=el('div',undefined,'documents-card');const image=el('img');image.src=blobUrl(item.blob);image.alt=`Scanseite ${i+1}`;card.append(image,el('p',`Seite ${i+1}`));const controls=el('div',undefined,'documents-actions');controls.append(button('Drehen',()=>run(async()=>{const generation=epoch;const turned=await jpegPage(item.blob,{rotation:90,maxEdge:1600});if(generation!==epoch)return;scan[i]={...turned};render();}),'secondary'),button('Nach oben',()=>{if(i){[scan[i-1],scan[i]]=[scan[i],scan[i-1]];render();}},'secondary'),button('Entfernen',()=>{scan.splice(i,1);render();},'secondary'));card.append(controls);list.append(card);});root.append(list);
  const done=button('PDF aus '+scan.length+' Seiten erstellen',()=>run(async()=>{const generation=epoch;const pdf=await createScanPdf(scan);if(generation!==epoch)return;pendingFile=pdf;scan=[];go('import');}));done.disabled=!scan.length;root.append(done);
 }
 function renderImported(){heading('Dokument gespeichert');root.append(el('p','Dein Dokument liegt jetzt im Posteingang.'));root.append(button('Im Posteingang behalten',()=>{selected=null;go('home');}),button('Dokument anzeigen',()=>go('document'),'secondary'));}
 function renderDocument(){
  const doc=selected;heading(doc.name);root.append(el('p',doc.document_date||'Ohne Dokumentdatum','documents-muted'));
  const actions=el('div',undefined,'documents-actions');actions.append(button('Umbenennen / Datum',()=>go('edit'),'secondary'));
  if(doc.trashed_at)actions.append(button('Wiederherstellen',()=>run(async()=>{await updateDocument(doc.id,{trashed_at:null});await reload();go('home');})),button('Endgültig löschen',()=>go('delete'),'documents-danger'));
  else actions.append(button('In den Papierkorb',()=>go('trash'),'documents-danger'));root.append(actions);
  if(doc.state==='pending'){root.append(el('p','Dieser Import wurde nicht vollständig abgeschlossen. Bitte erneut importieren und diesen Eintrag über den Papierkorb bereinigen.','documents-error'));return;}
  const preview=el('div',undefined,'documents-preview');preview.append(el('p','Datei wird authentifiziert geladen …','documents-muted'));root.append(preview);const generation=epoch;
  downloadDocument(doc).then(blob=>{if(generation!==epoch)return;const url=blobUrl(blob);preview.replaceChildren();const link=el('a','Datei öffnen / speichern','documents-download');link.href=url;link.target='_blank';link.rel='noopener';preview.append(link);const save=el('a','Datei herunterladen','documents-download');save.href=url;save.download=doc.name+'.'+doc.storage_path.split('.').pop();preview.append(save);
   if(doc.mime_type.startsWith('image/')){const image=el('img');image.src=url;image.alt=doc.name;preview.append(image);}else{const frame=el('iframe');frame.src=url;frame.title=doc.name;frame.setAttribute('sandbox','');preview.append(el('p','Falls die Vorschau auf dem iPhone nicht erscheint, die Datei oben öffnen.','documents-muted'),frame);}
  }).catch(error=>{if(generation===epoch)preview.replaceChildren(el('p',error.message,'documents-error'));});
 }
 function renderEdit(){heading('Dokument bearbeiten',()=>go('document'));const form=el('form',undefined,'documents-form');const name=field(form,'Dokumentname',{value:selected.name,required:true});const date=field(form,'Dokumentdatum',{value:selected.document_date||'',type:'date'});const save=el('button','Speichern');save.type='submit';form.append(save);form.addEventListener('submit',e=>{e.preventDefault();if(!name.value.trim())return;run(async()=>{selected=await updateDocument(selected.id,{name:name.value.trim(),document_date:date.value||null});await reload();go('document');});});root.append(form);}
 function renderDelete(permanent){heading(permanent?'Endgültig löschen':'In den Papierkorb',()=>go('document'));root.append(el('p',permanent?'Die Originaldatei wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.':'Das Dokument bleibt im Papierkorb erhalten und kann wiederhergestellt werden.'));const form=el('form',undefined,'documents-form');let confirm;
  if(permanent)confirm=field(form,'Zum Bestätigen LÖSCHEN eingeben',{required:true});const b=el('button',permanent?'Originaldatei endgültig löschen':'In den Papierkorb verschieben','documents-danger');b.type='submit';form.append(b);form.addEventListener('submit',e=>{e.preventDefault();if(permanent&&confirm.value!=='LÖSCHEN'){status('Bitte LÖSCHEN eingeben.',true);return;}run(async()=>{if(permanent)await permanentlyDeleteDocument(selected);else await updateDocument(selected.id,{trashed_at:new Date().toISOString()});await reload();selected=null;go('home');});});root.append(form);
 }
 function render(){epoch++;clearUrls();root.replaceChildren();const notice=el('p','Echte Storage-API-Sicherheitstests stehen noch aus. Für vertrauliche Dokumente ist die Ablage noch nicht freigegeben.','documents-security-note');root.append(notice);
  if(!getSession()){root.append(el('p','Bitte zuerst anmelden.'));return;}
  ({home:renderHome,add:renderAdd,import:renderImport,scan:renderScan,imported:renderImported,document:renderDocument,edit:renderEdit,trash:()=>renderDelete(false),delete:()=>renderDelete(true)}[page]||renderHome)();
 }
 function reset(){epoch++;clearUrls();docs=[];selected=null;pendingFile=null;scan=[];query='';page='home';trash=false;loadedUser=null;root.replaceChildren();}
 const active=()=>!view.classList.contains('hidden');
 new MutationObserver(()=>{if(active())run(async()=>{await reload();render();});else reset();}).observe(view,{attributes:true,attributeFilter:['class']});
 document.addEventListener('dock:auth-changed',()=>{if(loadedUser!==getSession()?.user?.id)reset();if(active()&&getSession())run(async()=>{await reload();render();});});
 window.addEventListener('pagehide',reset);
}
