const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict');
let logged=false,active,events={},messages={},saved=new Map(),href='https://donchuliio.github.io/Projekt-App/?push=todo',refreshes=[];
function app(){
 events={};messages={};
 const ctx={URL,Set,console,queueMicrotask,isLoggedIn:()=>logged,showView:v=>active=v,sessionStorage:{setItem:(k,v)=>saved.set(k,v),getItem:k=>saved.get(k),removeItem:k=>saved.delete(k)},history:{replaceState:(a,b,url)=>href=url},CustomEvent:class{constructor(type){this.type=type;}},window:{location:{href}},navigator:{serviceWorker:{addEventListener:(n,f)=>messages[n]=f}},document:{addEventListener:(n,f)=>events[n]=f,dispatchEvent:e=>refreshes.push(e.type),getElementById:()=>({scrollIntoView(){}})}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/push/push-routing.js','utf8').replace(/^import .*\n/gm,'').replace(/export /g,''),ctx);vm.runInContext('initPushRouting()',ctx);
}
(async()=>{
app();a.equal(active,undefined);a.equal(saved.get('dock-pending-push-target'),'todo');a.ok(!href.includes('?push='));
app();logged=true;events['dock:auth-changed']();active='good-morning';await Promise.resolve();a.equal(active,'todo');a.ok(refreshes.includes('dock:todos-changed'));a.equal(saved.size,0);
let ack=false;messages.message({data:{type:'dock:push-navigate',target:'expenses-overview'},ports:[{postMessage(){ack=true;}}]});a.equal(active,'expenses-overview');a.ok(ack);a.ok(refreshes.includes('dock:push-expenses'));
messages.message({data:{type:'dock:push-navigate',target:'https://evil.test'},ports:[]});a.equal(active,'expenses-overview');
const handlers={},shown=[],opened=[];let windows=[],focuses=0,navigations=[];
class Channel{constructor(){this.port1={close(){}};this.port2={postMessage:()=>this.port1.onmessage()};}}
const worker={URL,Set,console,setTimeout,clearTimeout,MessageChannel:Channel,self:{location:{origin:'https://donchuliio.github.io'},addEventListener:(n,f)=>handlers[n]=f,skipWaiting(){},registration:{showNotification:async(t,o)=>shown.push(o)},clients:{claim(){},matchAll:async()=>windows,openWindow:async url=>opened.push(url)}}};
vm.createContext(worker);vm.runInContext(fs.readFileSync('service-worker.js','utf8'),worker);
let promise;handlers.push({data:{json:()=>({target:'todo',tag:'daily'})},waitUntil:p=>promise=p});await promise;a.equal(shown[0].data.target,'todo');a.equal(shown[0].tag,'daily');
function click(target){handlers.notificationclick({notification:{data:{target},close(){}},waitUntil:p=>promise=p});return promise;}
await click('todo');a.ok(opened[0].includes('push=todo'));
windows=[{url:'https://donchuliio.github.io/Projekt-App/',focus:async()=>focuses++,postMessage:(data,ports)=>ports[0].postMessage({}),navigate:async url=>navigations.push(url)}];
await click('expenses-overview');a.equal(focuses,1);a.equal(opened.length,1);a.equal(navigations.length,0);
windows[0].postMessage=()=>{};await click('todo');a.equal(navigations.length,1);a.ok(navigations[0].includes('push=todo'));
console.log('PASS: pending target survives login/reload, push overrides greeting, task/finance reload, unsafe targets ignored, new window, focus/reuse existing window, old-client navigation fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
