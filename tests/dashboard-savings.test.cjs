const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path=require('node:path'),root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),dashboard=html.split('data-view="dashboard"')[1].split('data-view="games"')[0];
const expected=[['notes','Notizen'],['planner','Planer'],['packlists','Packlisten'],['finances','Finanzen'],['documents','Dokumente'],['hobby','Hobby'],['games','Spiele']];
const tiles=[...dashboard.matchAll(/<button type="button" class="tile" data-tile="([^"]+)">([\s\S]*?)<\/button>/g)];
assert.equal(tiles.length,7);
const clicks=[],nodes=tiles.map((tile,i)=>{
 assert.equal(tile[1],expected[i][0]);assert.ok(tile[2].includes(`<span>${expected[i][1]}</span>`));
 assert.match(tile[2],/<svg class="dashboard-icon" viewBox="0 0 24 24" aria-hidden="true">/);
 assert.match(tile[2],/<path d="[^"\s][^"]+"/);
 console.log(`PASS #15: ${expected[i][1]}: SVG, Titel, Reihenfolge, Tastatur-Button`);
 return {dataset:{tile:tile[1]},classList:{add(){},remove(){}},addEventListener(_,cb){this.click=cb}};
});
vm.runInNewContext(read('js/dashboard.js').replace(/^import[^\n]*\n/m,'').replace('export function','function')+'\ninitDashboard();',{
 document:{querySelectorAll:()=>nodes,getElementById:()=>null},window:{setTimeout:cb=>cb()},showView:target=>clicks.push(target)
});nodes.forEach(n=>n.click());assert.deepEqual(clicks,expected.map(e=>e[0]));
const css=read('style.css');assert.match(css,/\.dashboard-icon\s*\{[^}]*width:30px;[^}]*height:30px;[^}]*stroke:currentColor/);
assert.match(css,/\.tiles\s*\{[^}]*grid-template-columns:\s*1fr/s);
const saving=html.split('data-view="saving"')[1].split('data-view="expenses"')[0];
const sections=[...saving.matchAll(/<details class="saving-plan">([\s\S]*?)<\/details>/g)];assert.equal(sections.length,4);
for(const [i,key] of ['trade','taures','lissy','reserve'].entries()){
 assert.match(sections[i][1],new RegExp(`id="saving-${key}-summary"`));
 assert.match(sections[i][1],new RegExp(`id="saving-${key}-start"`));
 assert.match(sections[i][1],new RegExp(`id="saving-${key}-monthly"`));
}
assert.ok(!/<details[^>]*\bname=/.test(saving)); // No exclusive accordion group: independent native details.
const model={};vm.runInNewContext(read('js/finances/savings-model.js').replace(/export /g,'')+'\nObject.assign(out,{PLANS,future,valid,project});',{out:model});
assert.equal(model.future(1000,50,0,2,3),2350);
const legacy=(s,m,a,y,x)=>{const n=Math.round(y*12)+x,r=a/100/12;return r===0?s+m*n:s*Math.pow(1+r,n)+m*((Math.pow(1+r,n)-1)/r)};
for(const rate of [0,1.5,6,12])for(const years of [0,1,20])for(const months of [1,11])assert.equal(model.future(2000,75,rate,years,months),legacy(2000,75,rate,years,months));
const v={tradeStart:1000,tradeMonthly:50,tauresStart:2000,tauresMonthly:75,lissyStart:500,lissyMonthly:20,reserveStart:3000,reserveMonthly:100,annualReturn:6,years:2,months:3};
assert.ok(model.valid(v));const projection=model.project(v);assert.equal(projection.reserve,5700);
assert.equal(projection.total,projection.trade+projection.taures+projection.lissy+5700);
assert.ok(!model.valid({...v,reserveMonthly:-1}));assert.ok(!model.valid({...v,reserveStart:Infinity}));assert.ok(!model.valid({...v,months:12}));
const classes=()=>{const s=new Set(['hidden']);return {add:x=>s.add(x),remove:x=>s.delete(x),contains:x=>s.has(x)}};
function controller(saved){
 const elements={};for(const id of [...html.matchAll(/id="(saving-[^"]+)"/g)].map(m=>m[1]))elements[id]={value:'',textContent:'',classList:classes(),addEventListener(_,fn){this.input=fn}};
 const timers=[],writes=[];
 const context={document:{getElementById:id=>elements[id]},...model,Intl,Number,Object,clearTimeout(){},setTimeout:fn=>{timers.push(fn);return timers.length},loadSavingsCalculation:async()=>saved,saveSavingsCalculation:async row=>writes.push(row)};
 vm.runInNewContext(read('js/finances/savings-calculator.js').replace(/^import[^\n]*\n/gm,'').replace('export function','function')+'\ninitSavingsCalculator();',context);
 return {elements,timers,writes};
}
(async()=>{
 const saved=Object.fromEntries(Object.entries(v).map(([k,n])=>[k.replace(/Start$/,'_start').replace(/Monthly$/,'_monthly').replace('annualReturn','annual_return'),n]));
 const c=controller(saved);await new Promise(setImmediate);
 assert.equal(c.elements['saving-reserve-start'].value,3000);assert.match(c.elements['saving-reserve-summary'].textContent,/3\.000,00/);
 assert.equal(c.elements['saving-reserve-result'].textContent,new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(5700));
 c.elements['saving-reserve-monthly'].value='125';c.elements['saving-reserve-monthly'].input();await c.timers.at(-1)();assert.equal(c.writes.at(-1).reserveMonthly,125);assert.equal(c.writes.at(-1).tradeStart,1000);
 const again=controller({...saved,reserve_monthly:125});await new Promise(setImmediate);assert.equal(again.elements['saving-reserve-monthly'].value,125);assert.match(again.elements['saving-reserve-summary'].textContent,/125,00/);
 c.elements['saving-reserve-start'].value='-1';c.elements['saving-reserve-start'].input();await c.timers.at(-1)();assert.equal(c.writes.length,1);assert.ok(c.elements['saving-results'].classList.contains('hidden'));
 const requests=[],data={SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'public-test-key',getValidAccessToken:async()=> 'synthetic-token',fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>[saved]}}};
 vm.runInNewContext(read('js/data/savings-calculation-data.js').replace(/^import[^\n]*\n/gm,'').replace(/export /g,'')+'\nObject.assign(out,{loadSavingsCalculation,saveSavingsCalculation});',{...data,out:data});
 assert.equal((await data.loadSavingsCalculation()).reserve_start,3000);await data.saveSavingsCalculation(v);
 assert.match(requests[0].url,/reserve_start,reserve_monthly/);assert.equal(requests[1].options.headers.Authorization,'Bearer synthetic-token');
 assert.equal(JSON.parse(requests[1].options.body).reserve_monthly,100);assert.match(requests[1].url,/on_conflict=user_id/);
 console.log('PASS #11: 4 unabhängige native Details, Kurzüberblick, unveränderte Altberechnung, Notgroschen 0%, Summe, Validierung, Laden/Ändern/Speichern/Neuladen und authentifizierter Upsert');
 console.log('Grenze: DOM-/Strukturtests; kein tatsächlicher iPhone-/Browser-Test.');
})().catch(e=>{console.error(e);process.exitCode=1});
