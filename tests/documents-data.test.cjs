const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict');
const uid='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';let requests=[],stored;
const ctx={Blob,URL,RegExp,Date,JSON,encodeURIComponent,crypto:{randomUUID:()=>id},SUPABASE_URL:'https://example.test',SUPABASE_KEY:'public',getSession:()=>({user:{id:uid}}),getValidAccessToken:async()=> 'user-jwt',TYPES:{'application/pdf':'pdf'},validateFile:b=>b.type,fetch:async(url,options)=>{requests.push({url,options});if(url.includes('/rest/')){if(options.method==='POST')stored={...JSON.parse(options.body),user_id:uid};if(options.method==='PATCH')stored={...stored,...JSON.parse(options.body)};return {ok:true,json:async()=>[stored]};}return {ok:true,blob:async()=>new Blob(['%PDF'],{type:'application/pdf'})};}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/data/documents-data.js','utf8').replace(/^import .*\n/gm,'').replace(/export /g,''),ctx);
(async()=>{
 const blob=new Blob(['%PDF original bytes'],{type:'application/pdf'});ctx.input=blob;
 const doc=await vm.runInContext("createDocument(input,{name:'Test',date:'2026-10-08'})",ctx);a.equal(doc.state,'ready');
 const upload=requests.find(r=>r.url.includes('/storage/')&&r.options.method==='POST');a.equal(upload.options.body,blob);a.equal(upload.options.headers['x-upsert'],'false');a.equal(upload.options.headers.Authorization,'Bearer user-jwt');a.ok(requests.every(r=>r.options.cache==='no-store'));
 ctx.doc=doc;await vm.runInContext('downloadDocument(doc)',ctx);a.ok(requests.at(-1).url.includes('/object/authenticated/'));a.ok(!requests.some(r=>r.url.includes('/object/public/')));
 await a.rejects(vm.runInContext('permanentlyDeleteDocument(doc)',ctx));
 ctx.doc={...doc,trashed_at:'2026-10-08'};await vm.runInContext('permanentlyDeleteDocument(doc)',ctx);a.equal(requests.at(-2).options.method,'DELETE');a.ok(requests.at(-2).url.includes('/storage/'));a.ok(requests.at(-1).url.includes('/rest/'));
 ctx.doc={storage_path:'99999999-9999-4999-8999-999999999999/'+id+'.pdf'};await a.rejects(vm.runInContext('downloadDocument(doc)',ctx));
 console.log('PASS: authenticated/no-store requests, unchanged PDF bytes, no overwrite/public URLs, path ownership and guarded storage-first permanent deletion.');
})().catch(e=>{console.error(e);process.exitCode=1;});
