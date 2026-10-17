const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict'),{stripTypeScriptTypes}=require('node:module');
const id='11111111-1111-4111-8111-111111111111',subs=[1,2].map(id=>({id,user_id:'owner',endpoint:'https://web.push.apple.com/synthetic-'+id,p256dh:'synthetic',auth:'synthetic'}));
let row,ledger,calls,transports,failAll,failSecond,ackError,elapsed;
const reset=()=>{row={state:'pending',archived:false,attempts:0,successes:0,failures:0};ledger=new Map();calls=[];transports=[];failAll=false;failSecond=false;ackError=false;elapsed=false;};
class Query{constructor(t){this.table=t;}delete(){this.mode='delete';return this;}eq(k,v){this.id=v;return this;}then(resolve,reject){calls.push('delete:'+this.id);for(const key of ledger.keys())if(key===this.id)ledger.delete(key);return Promise.resolve({error:null}).then(resolve,reject);}}
const db={from:t=>new Query(t),rpc:async(name,args)=>{
 calls.push(name+(args?.p_subscription?':'+args.p_subscription:''));
 if(name==='reconcile_planner_reminders'){if(elapsed&&row.state==='processing')row.state='uncertain';return {error:null};}
 if(name==='due_planner_reminders')return {data:!row.archived&&['pending','processing'].includes(row.state)?[{id,user_id:'owner'}]:[],error:null};
 if(name==='skip_planner_reminder'){row.state='no_subscription';return {error:null};}
 if(name==='claim_planner_reminder'){if(row.archived||ledger.has(args.p_subscription))return {data:null};ledger.set(args.p_subscription,'claimed');row.attempts++;row.state='processing';return {data:{id,title:'Test',description:'Comment',local_date:'2026-10-17'}};}
 if(name==='finish_planner_reminder'){if(ackError)return {error:Error('database unavailable')};if(ledger.get(args.p_subscription)!=='claimed')return {data:false};ledger.set(args.p_subscription,args.p_status);if(args.p_status==='sent'){row.successes++;row.archived=true;row.state='sent';}else{row.failures++;row.state=row.successes?'sent':row.failures===row.attempts?'failed':'processing';}return {data:true};}
 throw Error(name);
}};
const ctx={URL,Date,console:{error(){}},webpush:{sendNotification:async(sub,payload)=>{a.equal(row.attempts,2,'all current devices reserved before the first transport');const n=Number(sub.endpoint.split('-').at(-1));transports.push(n);calls.push('transport:'+n);if(failAll||(failSecond&&n===2))throw {statusCode:410};a.equal(JSON.parse(payload).reminderId,id);}}};vm.createContext(ctx);vm.runInContext(stripTypeScriptTypes(fs.readFileSync('supabase/functions/swift-processor/reminders.ts','utf8').replace('export ','')),ctx);
(async()=>{
 reset();failSecond=true;a.equal(await ctx.sendReminderPushes(db,ctx.webpush,subs),1);a.equal(row.archived,true);a.equal(row.successes,1);a.equal(row.failures,1);a.ok(calls.indexOf('finish_planner_reminder:2')<calls.indexOf('delete:2'),'outcome retained before subscription/ledger cascade');await ctx.sendReminderPushes(db,ctx.webpush,subs);a.equal(transports.length,2);
 reset();failAll=true;a.equal(await ctx.sendReminderPushes(db,ctx.webpush,subs),0);a.equal(row.state,'failed');a.equal(row.archived,false);await ctx.sendReminderPushes(db,ctx.webpush,subs);a.equal(transports.length,2,'no automatic failure retries');
 reset();await ctx.sendReminderPushes(db,ctx.webpush,[]);a.equal(calls[0],'reconcile_planner_reminders');a.equal(row.state,'no_subscription');a.equal(row.archived,false);a.equal(transports.length,0);
 reset();await ctx.sendReminderPushes(db,ctx.webpush,[{...subs[0],endpoint:'http://localhost/unsafe'}]);a.equal(row.state,'no_subscription');a.equal(row.attempts,0);
 reset();ackError=true;await ctx.sendReminderPushes(db,ctx.webpush,subs);a.equal(row.archived,false,'transport acceptance is not a persisted archive claim when recording fails');elapsed=true;await ctx.sendReminderPushes(db,ctx.webpush,subs);a.equal(row.state,'uncertain');a.equal(transports.length,2,'uncertain sends not duplicated');
 console.log('PASS: multi-device reservation before archival, partial success, all failed/no subscription/unsafe endpoint retained, evidence before expiry cascade, DB acknowledgement failure/uncertainty and no repeat transport. Mocked push transport.');
})().catch(e=>{console.error(e);process.exitCode=1;});
