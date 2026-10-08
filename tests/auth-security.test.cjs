const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict');
const data=new Map(),calls=[],events={};let respond,mode='success';
const ctx={console,Date,Promise,SUPABASE_URL:'https://example.test',SUPABASE_KEY:'public',localStorage:{setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)||null,removeItem:k=>data.delete(k)},document:{dispatchEvent:()=>{}},CustomEvent:class{},window:{addEventListener:(n,f)=>events[n]=f},fetch:async(url,options)=>{calls.push(url);if(url.includes('logout'))return {ok:true};if(mode==='delayed')return new Promise(r=>respond=r);return {ok:mode==='success',status:mode==='success'?200:401,json:async()=>({access_token:'renewed',refresh_token:'refresh',expires_in:3600,user:{id:'one'}})};}};
vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/auth/auth.js','utf8').replace(/^import[\s\S]*?;\n/gm,'').replace(/export /g,''),ctx);
const session=()=>data.set('dock-auth-session',JSON.stringify({access_token:'old',refresh_token:'refresh',expires_at:1,user:{id:'one'}}));
(async()=>{
session();const before=calls.length;await Promise.all([vm.runInContext('refreshSession()',ctx),vm.runInContext('refreshSession()',ctx)]);a.equal(calls.length-before,1);a.ok(JSON.parse(data.get('dock-auth-session')).expires_at>Date.now()/1000);
session();mode='delayed';const pending=vm.runInContext('refreshSession()',ctx);await Promise.resolve();await vm.runInContext('signOut()',ctx);respond({ok:true,json:async()=>({access_token:'late',refresh_token:'refresh',expires_in:3600,user:{id:'one'}})});a.equal(await pending,null);a.equal(data.has('dock-auth-session'),false);a.ok(calls.some(u=>u.includes('logout?scope=local')));
session();mode='invalid';await a.rejects(vm.runInContext('refreshSession()',ctx));a.equal(data.has('dock-auth-session'),false);
data.set('dock-auth-session','{broken');a.equal(vm.runInContext('getSession()',ctx),null);
data.set('dock-auth-session',JSON.stringify({access_token:'expired',expires_at:1,user:{id:'one'}}));a.equal(vm.runInContext('isLoggedIn()',ctx),false);
console.log('PASS: single refresh, fixed expiry, no resurrection after logout, server logout, invalid-session removal and malformed/expired-session gating.');
})().catch(e=>{console.error(e);process.exitCode=1;});
