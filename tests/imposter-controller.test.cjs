const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/games/public-controller.js','utf8').replace('export ',''),ctx);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
let latest,live={name:'Test',state:'waiting',round_id:null,players:[]},valid=true,fail=false,pending=null,calls=[];
async function rpc(name,args){calls.push({name,args});if(fail)throw Error('offline');if(name==='imposter_status')return {...live};if(name==='imposter_claim_valid')return valid;if(name==='imposter_claim'){if(pending)return pending;return {secret:'opaque',result:args.p_player==='host'?{role:'host'}:{role:'player',word:'Secret'}};}if(name==='imposter_role')return {role:'player',word:'Secret'};throw Error(name);}
const create=()=>ctx.createPublicGame({token:'a'.repeat(64),rpc,changed:s=>latest=s,storage});
(async()=>{
 let game=create();await game.poll();assert.equal(latest.status.state,'waiting');await game.select('p');assert.equal(calls.filter(x=>x.name==='imposter_claim').length,0);
 live={...live,state:'live',round_id:'r1',number:1,players:[{id:'host',name:'Host'},{id:'p',name:'Player'}]};await game.poll();await game.select('host');assert.equal(JSON.stringify(latest.result),'{"role":"host"}');game.hide();assert.equal(latest.result,null);assert.equal(latest.claimed,true);
 assert.ok(![...memory.values()].join().includes('Secret'));assert.ok(![...memory.values()].join().includes('Host'));
 game=create();await game.poll();assert.equal(latest.claimed,true);assert.equal(latest.result,null);await game.show();assert.equal(latest.result.word,'Secret');game.suspend();assert.equal(latest.result,null);await game.show();assert.equal(latest.result.word,'Secret');
 valid=false;await game.poll();assert.equal(latest.claimed,false);assert.equal(memory.size,0);valid=true;await game.select('p');assert.equal(latest.result.word,'Secret');
 live={...live,round_id:'r2',number:2};await game.poll();assert.equal(latest.claimed,false);assert.match(latest.notice,/Neue Runde/);assert.equal(memory.size,0);
 let resolve;pending=new Promise(r=>resolve=r);const selecting=game.select('p');assert.equal(latest.busy,true);await game.select('host');live={...live,round_id:'r3',number:3};await game.poll();resolve({secret:'stale',result:{role:'player',word:'Old'}});await selecting;pending=null;assert.equal(latest.claimed,false);assert.equal(latest.result,null);
 await game.select('p');fail=true;await game.poll();assert.equal(latest.result,null);assert.match(latest.error,/Verbindung/);fail=false;await game.poll();assert.equal(latest.error,'');await game.show();assert.equal(latest.result.word,'Secret');
 live={...live,state:'closed'};await game.poll();assert.equal(latest.claimed,false);assert.equal(latest.result,null);assert.equal(memory.size,0);
 const apiCtx={SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'public',fetch:async(url,options)=>{apiCtx.request={url,options};return {ok:true,json:async()=>({ok:true})};}};vm.createContext(apiCtx);vm.runInContext(fs.readFileSync('js/games/api.js','utf8').replace(/^import .*\n/m,'').replace('export ',''),apiCtx);
 await apiCtx.gameRpc('imposter_status',{p_token:'share'});assert.equal(apiCtx.request.options.headers.Authorization,undefined);assert.equal(apiCtx.request.options.cache,'no-store');assert.equal(apiCtx.request.options.credentials,'omit');await apiCtx.gameRpc('imposter_manage',{},'user-jwt');assert.equal(apiCtx.request.options.headers.Authorization,'Bearer user-jwt');
 const page=fs.readFileSync('imposter.html','utf8');assert.ok(!page.includes('app.js'));assert.ok(page.includes('no-referrer'));assert.ok(page.includes('Content-Security-Policy'));assert.ok(!fs.readFileSync('js/games/public.js','utf8').includes('admin-data'));
 console.log('PASS: waiting/host/own role, hide/reopen, reload, round change, stale claim, duplicate click, revocation, connection recovery, background privacy, closed round, ephemeral storage and public/auth API separation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
