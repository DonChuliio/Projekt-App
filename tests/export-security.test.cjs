const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
(async()=>{
for(const name of ['bring-export','bring-page']){
 let handler,reads=0,filters=[],result={data:null,error:null};
 const query={select(){return this},eq(){return this},gt(...args){filters.push(args);return this},async maybeSingle(){reads++;return result}};
 const ctx={URL,Response,Date,JSON,console,createClient:()=>({from:()=>query}),Deno:{env:{get:()=> 'server-only'},serve:f=>handler=f}};
 vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/'+name+'/index.ts','utf8').replace(/^import .*\n/gm,'')),ctx);
 const req=(id,method='GET')=>({method,url:'https://example.test/?id='+id});
 a.equal((await handler(req('invalid'))).status,404);a.equal(reads,0);
 a.equal((await handler(req('invalid','POST'))).status,405);a.equal(reads,0);
 const id='11111111-2222-4333-8444-555555555555';
 a.equal((await handler(req(id))).status,404);a.equal(filters[0][0],'expires_at');
 result={data:{name:'<script>alert(1)</script>',items:['<img src=x onerror=alert(1)>']},error:null};
 const r=await handler(req(id));a.equal(r.status,200);a.equal(r.headers.get('cache-control'),'no-store');a.equal(r.headers.get('referrer-policy'),'no-referrer');a.equal(r.headers.get('x-content-type-options'),'nosniff');
 const body=await r.text();
 if(name==='bring-page'){a.ok(body.includes('&lt;script&gt;'));a.ok(body.includes('\\u003cscript'));a.ok(!body.includes('<script>alert(1)</script>'));}
}
console.log('PASS: export method/UUID validation before DB access, expiry filters, unavailable exports, no-store/no-referrer/nosniff and escaped HTML/JSON.');
})().catch(e=>{console.error(e);process.exitCode=1});
