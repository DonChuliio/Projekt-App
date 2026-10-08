const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const source=stripTypeScriptTypes(fs.readFileSync('supabase/functions/swift-processor/send-push.ts','utf8').replace(/^import .*\n/gm,''));
let now,handler,open=0,finance=false,sends=[],claims=new Set(),syncs=0,queries=[],syncAdds=0;
class Clock extends Date{constructor(...args){super(...(args.length?args:[now]));}}
class Query {
 constructor(table){this.table=table;this.mode='read';this.value=null;}
 select(){return this;}not(){return this;}eq(...args){queries.push(args);return this;}is(...args){queries.push(args);return this;}
 insert(value){this.mode='insert';this.value=value;return this;}
 update(value){this.mode='update';this.value=value;return this;}delete(){this.mode='delete';return this;}
 then(resolve,reject){let result={error:null};if(this.table==='calendar_settings')result.data=[{user_id:'u',month_start_balance_reminder:finance,month_end_savings_reminder:finance}];
 if(this.table==='push_subscriptions')result.data=[{id:1,user_id:'u',endpoint:'https://provider.test',p256dh:'key',auth:'key'}];
 if(this.table==='todos')result.count=open;
 if(this.table==='push_deliveries'&&this.mode==='insert'){const k=this.value.subscription_id+':'+this.value.local_date;if(claims.has(k))result.error={code:'23505'};else claims.add(k);}
 return Promise.resolve(result).then(resolve,reject);}
}
const ctx={Date:Clock,Intl,Set,Map,JSON,Response,console,webpush:{setVapidDetails(){},async sendNotification(sub,payload){sends.push(JSON.parse(payload));}},createClient:()=>({from:t=>new Query(t),rpc:async()=>{syncs++;open+=syncAdds;syncAdds=0;return {error:null};}}),Deno:{env:{get:key=>key==='SUPABASE_SECRET_KEYS'?'{"default":"secret"}':'configured'},serve:fn=>handler=fn}};
vm.createContext(ctx);vm.runInContext(source,ctx);
async function run(time){now=time;return (await handler({})).json();}
function reset(){sends=[];claims=new Set();open=2;finance=false;syncAdds=0;queries=[];}
(async()=>{
for(const [time,sent] of [['2026-07-01T07:00:00Z',1],['2026-07-01T08:00:00Z',0],['2026-01-01T08:00:00Z',1],['2026-01-01T07:00:00Z',0],['2026-03-29T07:00:00Z',1],['2026-10-25T08:00:00Z',1]]){
 reset();const result=await run(time);a.equal(result.sent,sent,time);if(sent){a.equal(sends[0].target,'todo');a.ok(queries.some(q=>q[0]==='completed_at'&&q[1]===null));}
}
reset();await run('2026-07-01T07:00:00Z');await run('2026-07-01T07:00:00Z');a.equal(sends.length,1);
reset();open=0;await run('2026-07-01T07:00:00Z');a.equal(sends.length,0);
reset();open=0;syncAdds=3;await run('2026-07-01T07:00:00Z');a.equal(sends.length,1);a.match(sends[0].body,/3 wichtige To-Dos/);a.ok(!sends[0].body.includes('KW-Aufgabe'));
for(const [time,text]of[['2026-07-02T07:00:00Z','Monatsabgleich'],['2026-07-31T07:00:00Z','Sparkonto'],['2028-02-29T08:00:00Z','Sparkonto']]){
 reset();finance=true;await run(time);a.equal(sends.length,1);a.equal(sends[0].target,'expenses-overview');a.match(sends[0].body,new RegExp(text));
}
console.log('PASS: summer/winter 09:00, both DST transition days, daily deduplication, no empty push, routine sync/count, completed filter, combined finance push, leap month end.');
})().catch(e=>{console.error(e);process.exitCode=1;});
