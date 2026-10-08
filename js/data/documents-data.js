import { SUPABASE_URL, SUPABASE_KEY } from '../config/supabase.js';
import { getSession, getValidAccessToken } from '../auth/auth.js';
import { validateFile, TYPES } from '../documents/files.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function user(){const id=getSession()?.user?.id;if(!id||!UUID.test(id))throw new Error('Bitte zuerst anmelden.');return id;}
function objectPath(path){if(!path?.match(new RegExp(`^${user()}/[0-9a-f-]{36}\\.(pdf|jpg|jpeg|png|webp|heic|heif)$`)))throw new Error('Ungültiger Dateipfad.');return path.split('/').map(encodeURIComponent).join('/');}
async function request(path,options={},expectedUser=user()) {
 const token=await getValidAccessToken();if(user()!==expectedUser)throw new Error('Die Anmeldung hat sich geändert.');
 const response=await fetch(SUPABASE_URL+path,{...options,cache:'no-store',headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`,...options.headers}});
 if(user()!==expectedUser)throw new Error('Die Anmeldung hat sich geändert.');
 if(!response.ok)throw new Error(response.status===401||response.status===403?'Zugriff verweigert. Bitte Anmeldung prüfen.':`Dokumentvorgang fehlgeschlagen (${response.status}).`);
 return response;
}
export async function rows(table,query='order=created_at.desc,id.desc'){
 const owner=user(),out=[];let start=0;
 for(;;){const r=await request(`/rest/v1/${table}?select=*&${query}`,{headers:{Range:`${start}-${start+499}`}},owner);const page=await r.json();out.push(...page);if(page.length<500)break;start+=500;}
 return out;
}
export async function writeRow(table,id,data,method=id?'PATCH':'POST') {
 if(id&&!UUID.test(id))throw new Error('Ungültiger Eintrag.');
 const r=await request(`/rest/v1/${table}${id?'?id=eq.'+id:''}`,{method,headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:method==='DELETE'?undefined:JSON.stringify(data)});
 const results=await r.json();if(!results.length)throw new Error('Eintrag wurde geändert oder ist nicht zugänglich. Bitte neu laden.');return results[0];
}
export const loadDocuments=()=>rows('documents');
export async function loadDocumentLibrary(){
 await request('/rest/v1/rpc/ensure_document_folders',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 const [documents,folders,collections]=await Promise.all([loadDocuments(),rows('document_folders','order=name.asc,id.asc'),rows('document_collections','order=name.asc,id.asc')]);
 return {documents,folders,collections};
}
export const saveFolder=(id,data)=>writeRow('document_folders',id,data);
export const saveCollection=(id,data)=>writeRow('document_collections',id,data);
export const deleteFolder=id=>writeRow('document_folders',id,null,'DELETE');
export const deleteCollection=id=>writeRow('document_collections',id,null,'DELETE');
export async function downloadDocument(doc){const r=await request(`/storage/v1/object/authenticated/dock-documents/${objectPath(doc.storage_path)}`);return r.blob();}
async function removeObject(doc){await request('/storage/v1/object/dock-documents',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({prefixes:[objectPath(doc.storage_path)]})});}
export async function createDocument(file,{name,date}){
 const mime=validateFile(file),owner=user(),id=crypto.randomUUID(),path=`${owner}/${id}.${TYPES[mime]}`;
 const doc=await writeRow('documents',null,{id,name:name.trim(),document_date:date||null,storage_path:path,mime_type:mime,size_bytes:file.size});
 try {
  await request(`/storage/v1/object/dock-documents/${objectPath(path)}`,{method:'POST',headers:{'Content-Type':mime,'x-upsert':'false','cache-control':'0'},body:file},owner);
  return await writeRow('documents',id,{state:'ready',updated_at:new Date().toISOString()});
 } catch(error){
  // An interrupted upload has an explicit recoverable metadata row; don't hide cleanup errors.
  try{await removeObject(doc);await writeRow('documents',id,null,'DELETE');}catch{throw new Error('Import nicht abgeschlossen. Der unvollständige Eintrag bleibt zur Bereinigung im Posteingang.');}
  throw error;
 }
}
export const updateDocument=(id,data)=>writeRow('documents',id,{...data,updated_at:new Date().toISOString()});
export async function permanentlyDeleteDocument(doc){
 if(!doc.trashed_at)throw new Error('Bitte zuerst in den Papierkorb verschieben.');
 await removeObject(doc);await writeRow('documents',doc.id,null,'DELETE');
}
