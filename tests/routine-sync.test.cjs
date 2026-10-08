const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root='js/data';
const source=fs.readFileSync(root+'/routine-todos-data.js','utf8').replace(/^import[^\n]*\n/gm,'').replace(/export /g,'');
const dates=fs.readFileSync('js/utils/date.js','utf8').replace(/export /g,'');
let now=new Date(2027,0,1,15),user='first',calls=[],fail=false;
class Clock extends Date{constructor(...a){super(...(a.length?a:[now.getTime()]));}}
const ctx={Date:Clock,console,Promise,SUPABASE_URL:'https://example.test',SUPABASE_KEY:'public',getSession:()=>user?{user:{id:user}}:null,getValidAccessToken:async()=>{await Promise.resolve();return 'token';},fetch:async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:!fail,status:503,json:async()=>3};}};
vm.createContext(ctx);vm.runInContext(dates+source,ctx);
(async()=>{
const first=vm.runInContext('syncRoutineTodos()',ctx),second=vm.runInContext('syncRoutineTodos()',ctx);
assert.equal(first,second);assert.equal(await first,3);assert.equal(calls.length,1);assert.equal(calls[0].p_year,2026);assert.equal(calls[0].p_week,53);
fail=true;await assert.rejects(vm.runInContext('syncRoutineTodos()',ctx));fail=false;await vm.runInContext('syncRoutineTodos()',ctx);assert.equal(calls.length,3);
user=null;assert.equal(await vm.runInContext('syncRoutineTodos()',ctx),0);
user='second';now=new Date(2027,0,4,14);await vm.runInContext('syncRoutineTodos()',ctx);assert.equal(calls.at(-1).p_year,2027);assert.equal(calls.at(-1).p_week,1);
console.log('PASS: shared in-flight request, retry after failure, logged-out guard, afternoon startup, ISO year and next week.');
})().catch(e=>{console.error(e);process.exitCode=1;});
