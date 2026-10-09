const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),source=fs.readFileSync('js/router.js','utf8')+'\n'+fs.readFileSync('js/navigation.js','utf8').replace(/^import .*\n/gm,'');
const matches=[...html.matchAll(/data-view="([^"]+)"/g)],views=[],buttons=[];
function node(dataset={}){const listeners={},n={dataset,hidden:false,homes:[],classList:{toggle:(name,hidden)=>n.hidden=hidden},hasAttribute:name=>Object.hasOwn(n.attributes||{},name),addEventListener:(event,fn)=>(listeners[event]??=[]).push(fn),insertAdjacentElement:(_,home)=>n.homes.push(home),click:()=>{for(const fn of listeners.click||[])fn();}};return n;}
for(let i=0;i<matches.length;i++){
 const name=matches[i][1],fragment=html.slice(matches[i].index,matches[i+1]?.index||html.length),view=node({view:name});views.push(view);
 const tag=fragment.match(/<button[^>]*class="back-button"[^>]*>/);
 if(name==='dashboard'){assert.equal(tag,null);continue;}assert.ok(tag,'Back missing: '+name);
 const attributes=Object.fromEntries([...tag[0].matchAll(/(data-[a-z-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]||'']));
 const back=node({viewBack:attributes['data-view-back']});back.attributes=attributes;back.view=name;buttons.push(back);
 if(name==='watertest-entry')back.addEventListener('click',()=>ctx.showView('watertest'));
 if(name==='imposter')back.addEventListener('click',()=>ctx.showView('games'));
 if(name==='documents')back.addEventListener('click',()=>ctx.showView('documents'));
}
const ctx={document:{querySelectorAll:s=>s==='[data-view]'?views:buttons,createElement:()=>node()}};vm.createContext(ctx);vm.runInContext(source.replace(/export /g,''),ctx);ctx.initNavigation();ctx.initNavigation();
for(const back of buttons){assert.equal(back.homes.length,1,'exactly one Home: '+back.view);ctx.showView(back.view);assert.equal(views.filter(v=>!v.hidden).length,1);back.homes[0].click();assert.equal(views.find(v=>!v.hidden).dataset.view,'dashboard');ctx.showView(back.view);back.click();const expected=back.view==='documents'?'documents':back.view==='watertest-entry'?'watertest':back.dataset.viewBack||'dashboard';assert.equal(views.find(v=>!v.hidden).dataset.view,expected,'one declared parent/module handler: '+back.view);assert.ok(views.some(v=>v.dataset.view===expected));}
assert.ok(!fs.readFileSync('js/app.js','utf8').includes('querySelectorAll("[data-view-back]")'),'no competing listeners');
console.log(`PASS: ${buttons.length} module views: separate Home/Back, declared parents, custom document/water handlers, idempotent initialization.`);
