const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class N{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.value='';this.disabled=false;this.textContent='';this.className='';}
 get isConnected(){return this.connected||Boolean(this.parent?.isConnected);}append(...ns){for(const n of ns){n.parent=this;this.children.push(n);}}prepend(n){n.parent=this;this.children.unshift(n);}replaceChildren(){this.children.forEach(n=>n.parent=null);this.children=[];}remove(){if(this.parent){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}}
 setAttribute(k,v){this.attrs[k]=v;}focus(){}addEventListener(k,f){this.listeners[k]=f;}fire(k){return this.listeners[k]?.({preventDefault(){}});}
 querySelectorAll(s){return this.children.flatMap(n=>[...(s.split(',').some(t=>t===n.tagName||t.startsWith('.')&&n.className===t.slice(1))?[n]:[]),...n.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
}

let columns=[{id:'c1',name:'Alt'},{id:'c2',name:'Andere'}],tasks=[{task_id:'t1',column_id:'c1',name:'Bestehend',weeks:[1,53]},{task_id:'t2',column_id:'c2',name:'Andere Aufgabe',weeks:[2]}],count=0,notifications=0,fail=false,logged=true;
const host=new N('div');host.connected=true;
const ctx={console,Date,Number,String,Set,CustomEvent:class{},document:{createElement:t=>new N(t),dispatchEvent:()=>notifications++},getSession:()=>logged?{user:{id:'owner'}}:null,getISOWeekYear:()=>2026,getISOWeeksInYear:y=>y===2026?53:52,
 loadRoutineTemplates:async()=>({columns:columns.filter(c=>!c.archived).map(c=>({...c})),tasks:tasks.filter(t=>!t.archived).map(t=>({...t,weeks:[...t.weeks]}))}),
 addRoutineColumn:async name=>{const c={id:'c'+(++count+2),name};columns.push(c);return c;},addRoutineTask:async(column_id,name)=>tasks.push({task_id:'custom'+(++count),column_id,name,weeks:[]}),
 renameRoutineTask:async(id,name)=>{if(fail)throw Error('Synthetic rename error');tasks.find(t=>t.task_id===id).name=name;},
 setRoutineWeeks:async(id,weeks,previous)=>{if(fail)throw Error('Synthetic save error');const t=tasks.find(t=>t.task_id===id);assert.equal(previous.join(','),t.weeks.join(','));t.weeks=weeks;},
 archiveRoutineTask:async id=>tasks.find(t=>t.task_id===id).archived=true};
vm.runInNewContext(fs.readFileSync('js/calendar/routine-editor.js','utf8').replace(/^import .*\n/gm,'').replace(/export /g,'')+'\nout.init=initRoutineEditor;',{...ctx,out:ctx});
const settle=async()=>{for(let i=0;i<5;i++)await new Promise(setImmediate);},click=text=>{const b=host.querySelectorAll('button').find(b=>b.textContent===text);assert.ok(b,text);return b.fire('click');};
const check=(name,week)=>host.querySelectorAll('input').find(n=>n.attrs['aria-label']===name+', KW '+week);
const editRow=name=>host.querySelectorAll('.routine-task-row').find(n=>n.children[0].textContent===name);
function grid(weeks,rows){
 const body=host.querySelector('tbody');assert.equal(body.children.length,rows);
 const head=host.querySelector('thead').children[0];assert.equal(head.children.length,weeks+1);assert.equal(head.children[0].textContent,'Aufgabe');
 for(const row of body.children){assert.equal(row.children.length,weeks+1);assert.equal(row.children[0].tagName,'th');for(const cell of row.children.slice(1)){assert.equal(cell.querySelectorAll('input').length,1);assert.equal(cell.querySelectorAll('span').length,0);assert.equal(cell.querySelectorAll('button').length,0);assert.equal(cell.children.length,1);assert.equal(cell.children[0].children.length,1);}}
 assert.ok(!host.querySelectorAll('button').some(n=>n.textContent==='Spalte hinzufügen'||n.textContent==='Spalte entfernen'));
}
(async()=>{
 await ctx.init(host);grid(53,2);assert.ok(check('Bestehend',1).checked);assert.ok(check('Bestehend',53).checked);assert.equal(host.querySelector('.routine-task-management'),null);
 host.querySelector('.routine-grid-scroll').scrollLeft=960;click('Folgejahr');grid(52,2);assert.equal(host.querySelector('.routine-grid-scroll').scrollLeft,960);assert.ok(tasks[0].weeks.includes(53),'KW53 retained in 52-week year');click('Vorjahr');grid(53,2);
 click('Aufgabe hinzufügen');host.querySelector('form').querySelector('input').value='<script> Eigene Aufgabe';await host.querySelector('form').fire('submit');await settle();assert.equal(tasks.length,3);assert.equal(columns.length,2,'no hierarchy created');grid(53,3);
 let input=check('<script> Eigene Aufgabe',1);input.checked=true;await input.fire('change');await settle();assert.equal(tasks.at(-1).weeks.join(','),'1');assert.ok(notifications>0);assert.equal(host.querySelector('.routine-grid-scroll').scrollLeft,960);
 host.replaceChildren();await ctx.init(host);input=check('<script> Eigene Aufgabe',1);assert.ok(input.checked,'reload persists');
 fail=true;input.checked=false;await input.fire('change');assert.ok(input.checked,'failed save restores checkbox');assert.equal(tasks.at(-1).weeks.join(','),'1');fail=false;
 click('Bearbeiten');let row=editRow('<script> Eigene Aufgabe');row.querySelectorAll('button').find(b=>b.textContent==='Umbenennen').fire('click');let form=host.querySelector('form');assert.equal(form.querySelector('input').value,'<script> Eigene Aufgabe');form.querySelector('input').value='Umbenannt';await form.fire('submit');await settle();assert.ok(check('Umbenannt',1).checked);assert.equal(tasks.at(-1).task_id,'custom1');
 editRow('Umbenannt').querySelectorAll('button').find(b=>b.textContent==='Entfernen').fire('click');click('Abbrechen');assert.ok(!tasks.at(-1).archived);
 editRow('Umbenannt').querySelectorAll('button').find(b=>b.textContent==='Entfernen').fire('click');await click('Entfernen bestätigen');await settle();assert.ok(tasks.at(-1).archived);assert.ok(!tasks[0].archived);grid(53,2);
 const requests=[],api={SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'public-test',getSession:()=>({user:{id:'owner'}}),getValidAccessToken:async()=>'test-jwt',fetch:async(url,options)=>{requests.push({url,options});return {ok:true,text:async()=>JSON.stringify([{task_id:'t',weeks:[1,2]}])};}};
 vm.runInNewContext(fs.readFileSync('js/data/routine-templates-data.js','utf8').replace(/^import .*\n/gm,'').replace(/export /g,'')+'\nObject.assign(out,{setRoutineWeeks,renameRoutineTask});',{...api,out:api});await api.setRoutineWeeks('t',[1,2],[1]);assert.match(requests[0].url,/weeks=eq\.%7B1%7D/);assert.equal(requests[0].options.method,'PATCH');assert.equal(requests[0].options.headers.Authorization,'Bearer test-jwt');assert.equal(JSON.parse(requests[0].options.body).weeks.join(','),'1,2');
 await api.renameRoutineTask('t','New');assert.deepEqual(JSON.parse(requests[1].options.body),{name:'New'});assert.match(requests[1].url,/task_id=eq.t&active=eq.true/);
 const date={};vm.runInNewContext(fs.readFileSync('js/utils/date.js','utf8').replace(/export /g,'')+'\nObject.assign(out,{getISOWeek,getISOWeekYear,getISOWeeksInYear});',{Date,out:date});assert.equal(date.getISOWeekYear(new Date(2027,0,1)),2026);assert.equal(date.getISOWeek(new Date(2027,0,1)),53);assert.equal(date.getISOWeek(new Date(2027,0,4)),1);
 const css=fs.readFileSync('style.css','utf8');assert.match(css,/\.routine-grid-scroll \{[^}]*overflow-x:auto/);assert.match(css,/\.routine-grid-table th:first-child \{[^}]*position:sticky;left:0/);assert.match(css,/\.routine-grid-table th:first-child \{[^}]*background:var\(--surface\)/);
 columns=[];tasks=[];host.replaceChildren();await ctx.init(host);grid(53,0);click('Aufgabe hinzufügen');host.querySelector('form').querySelector('input').value='Erste Aufgabe';await host.querySelector('form').fire('submit');await settle();grid(53,1);assert.equal(columns.length,1,'internal backing column only');assert.equal(tasks[0].weeks.length,0);
 logged=false;host.replaceChildren();await ctx.init(host);assert.equal(host.children.length,0);
 console.log('PASS #36: flat task rows, 52/53 week checkbox-only cells, sticky CSS, retained scroll and historical weeks/IDs, add/rename/remove/cancel/reload/error rollback, first task, authenticated targeted PATCH and logout. DOM mocks; physical iPhone pending.');
})().catch(e=>{console.error(e);process.exitCode=1;});
