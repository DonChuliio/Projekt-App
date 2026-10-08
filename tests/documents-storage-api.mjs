// Run locally with securely supplied environment variables, never deploy this as an endpoint.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=process.env.SUPABASE_URL,admin=process.env.SUPABASE_TEST_ADMIN_KEY,key=process.env.SUPABASE_PUBLISHABLE_KEY;
if(base!=='https://osmmjfuzuxhwtfcttdxp.supabase.co'||!admin||!key){console.error('Test nicht ausgeführt: Projekt-URL, Publishable Key und temporärer Admin-Zugang fehlen. Keine Zugangsdaten in Dateien speichern.');process.exit(2);}
const users=[],paths=[],checks=[],cleanupErrors=[];
const pdf=label=>new Blob([`%PDF-1.4\n% synthetic Dock test ${label}\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [] /Count 0 >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF`],{type:'application/pdf'});
async function call(path,{token,method='GET',body,type}={}){return fetch(base+path,{method,signal:AbortSignal.timeout(30000),cache:'no-store',headers:{apikey:token===admin?admin:key,...(token?{Authorization:'Bearer '+token}:{}),...(type?{'Content-Type':type}:{}),...(body instanceof Blob?{'x-upsert':'true','cache-control':'no-store'}:{})},body});}
const object=(path,token,body)=>call('/storage/v1/object/dock-documents/'+path,{token,method:'POST',body,type:body.type});
const download=(path,token)=>call('/storage/v1/object/authenticated/dock-documents/'+path+'?cacheNonce='+randomUUID(),{token});
const remove=(path,token)=>call('/storage/v1/object/dock-documents',{token,method:'DELETE',type:'application/json',body:JSON.stringify({prefixes:[path]})});
async function equalFile(path,token,blob){const r=await download(path,token);assert.ok(r.ok,'own download');assert.ok(Buffer.from(await r.arrayBuffer()).equals(Buffer.from(await blob.arrayBuffer())),'own download must match uploaded bytes');}
console.log('Testlauf startet. Bitte bis zur Bereinigung nicht abbrechen.');
try{
 for(let i=0;i<2;i++){
  const email=`dock-storage-test-${randomUUID()}@example.invalid`,password=randomUUID()+'Aa9!';
  const r=await call('/auth/v1/admin/users',{token:admin,method:'POST',type:'application/json',body:JSON.stringify({email,password,email_confirm:true})});assert.ok(r.ok,'test user creation');const created=await r.json();users.push({id:created.id,token:null});
  const signed=await call('/auth/v1/token?grant_type=password',{method:'POST',type:'application/json',body:JSON.stringify({email,password})});assert.ok(signed.ok,'test sign-in');users[i].token=(await signed.json()).access_token;
 }
 console.log('Zwei Testkonten bereit. Storage-API-Prüfung läuft.');
 for(let i=0;i<2;i++){
  const own=users[i],other=users[1-i],path=`${own.id}/${randomUUID()}.pdf`;paths.push({path,user:own});const original=pdf('original'),replacement=pdf('replacement');
  const upload=await object(path,own.token,original);assert.ok(upload.ok,'own upload (HTTP '+upload.status+')');await equalFile(path,own.token,original);
  const ownList=await call('/storage/v1/object/list/dock-documents',{token:own.token,method:'POST',type:'application/json',body:JSON.stringify({prefix:own.id,limit:100})});assert.ok(ownList.ok,'own list');assert.ok((await ownList.json()).some(item=>item.name===path.split('/')[1]),'own file listed');
  for(const token of [other.token,undefined]){const listing=await call('/storage/v1/object/list/dock-documents',{token,method:'POST',type:'application/json',body:JSON.stringify({prefix:own.id,limit:100})});if(listing.ok)assert.equal((await listing.json()).length,0,'foreign/anonymous listing empty');}
  const imagePath=`${own.id}/${randomUUID()}.png`,image=new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=','base64')],{type:'image/png'});paths.push({path:imagePath,user:own});assert.ok((await object(imagePath,own.token,image)).ok,'own PNG upload');await equalFile(imagePath,own.token,image);
  assert.ok((await object(path,own.token,replacement)).ok,'own overwrite');await equalFile(path,own.token,replacement);
  assert.ok(!(await download(path,other.token)).ok,'foreign download denied');assert.ok(!(await download(path)).ok,'anonymous download denied');
  assert.ok(!(await call('/storage/v1/object/public/dock-documents/'+path)).ok,'public URL denied');
  assert.ok(!(await object(path,other.token,original)).ok,'foreign overwrite denied');assert.ok(!(await object(path,undefined,original)).ok,'anonymous overwrite denied');
  await remove(path,other.token);await equalFile(path,own.token,replacement);await remove(path);await equalFile(path,own.token,replacement);
  const foreignNew=`${own.id}/${randomUUID()}.pdf`;paths.push({path:foreignNew,user:own});assert.ok(!(await object(foreignNew,other.token,original)).ok,'foreign upload denied');assert.ok(!(await object(foreignNew,undefined,original)).ok,'anonymous upload denied');
  for(const [ext,blob] of [['html',new Blob(['<p>synthetic</p>'],{type:'text/html'})],['pdf',new Blob([new Uint8Array(10485761)],{type:'application/pdf'})]]){
   const invalid=`${own.id}/${randomUUID()}.${ext}`;paths.push({path:invalid,user:own});assert.ok(!(await object(invalid,own.token,blob)).ok,'invalid MIME/size denied');
  }
  assert.ok((await remove(path,own.token)).ok,'own delete');assert.ok(!(await download(path,own.token)).ok,'deleted original unavailable');checks.push('Benutzer '+(i+1)+': Upload/Download/Überschreiben/Löschen, Fremd-/Anonym-/Public-Zugriffe und Typ-/Größenlimits');
 }
}finally{
 for(const {path,user} of paths){try{let r=await remove(path,user.token||admin);if(!r.ok)r=await remove(path,admin);if(!r.ok)cleanupErrors.push('Objektbereinigung fehlgeschlagen');}catch{cleanupErrors.push('Objektbereinigung fehlgeschlagen');}}
 for(const user of users){try{if(user.token)await call('/auth/v1/logout?scope=global',{token:user.token,method:'POST'});const r=await call('/auth/v1/admin/users/'+user.id,{token:admin,method:'DELETE'});if(!r.ok)cleanupErrors.push('Testkontobereinigung fehlgeschlagen');}catch{cleanupErrors.push('Testkontobereinigung fehlgeschlagen');}}
 if(cleanupErrors.length){console.error(cleanupErrors.join('\n'));process.exitCode=1;}else console.log('Bereinigung abgeschlossen: ausschließlich synthetische Testobjekte und temporäre Testkonten entfernt.');
}
checks.forEach(check=>console.log('PASS: '+check));

