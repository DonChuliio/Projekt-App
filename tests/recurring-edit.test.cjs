const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class N {
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.value='';this.textContent='';this.disabled=false;}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}appendChild(n){this.append(n);}prepend(n){n.parent=this;this.children.unshift(n);}
 setAttribute(k,v){this.attrs[k]=v;}focus(){}remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
 set innerHTML(html){this.children=[];if(this.tagName!=='form')return;
  for(const m of html.matchAll(/<(input|select)\b([^>]+)>/g)){const n=new N(m[1]);for(const a of m[2].matchAll(/([\w-]+)="([^"]*)"/g))n.attrs[a[1]]=a[2];n.value=n.attrs.name==='transaction_type'?'expense':n.attrs.name==='month'?'1':'';this.append(n);}
  const submit=new N('button');submit.attrs.type='submit';this.append(submit);const cancel=new N('button');cancel.className='recurring-cancel';this.append(cancel);
 }
 matches(s){if(s.startsWith('.'))return this.className===s.slice(1);if(s.startsWith('[name='))return this.attrs.name===s.match(/"([^"]+)"/)[1];if(s==='[role="status"]')return this.attrs.role==='status';if(s==='button[type="submit"]')return this.tagName==='button'&&this.attrs.type==='submit';return this.tagName===s;}
 querySelectorAll(s){return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}querySelector(s){return this.querySelectorAll(s)[0]||null;}
 insertAdjacentElement(_,n){n.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,n);}
 addEventListener(name,cb){this.listeners[name]=cb;}fire(name){return this.listeners[name]?.({preventDefault(){}});}
}
const root=new N('div'),rows=['monthly','quarterly','yearly'].map((frequency,i)=>({id:i+1,name:'Original '+i,amount:42.50,transaction_type:'expense',frequency,start_date:'2025-02-15'}));
let writes=[],adds=0,fail=false,events=0;
const ctx={console,Date,Number,String,Intl,CustomEvent:class{},FormData:class{constructor(form){this.form=form;}get(name){return this.form.querySelector(`[name="${name}"]`).value;}},document:{getElementById:()=>root,createElement:t=>new N(t),dispatchEvent:()=>events++},loadRecurringTransactions:async()=>rows.map(r=>({...r})),addRecurringTransaction:async e=>{adds++;return {...e,id:99};},updateRecurringTransaction:async(id,e)=>{if(fail)throw Error('synthetic');writes.push({id,...e});return {...e,id};},deleteRecurringTransaction:async()=>{throw Error('unexpected deletion');}};
vm.runInNewContext(fs.readFileSync('js/finances/recurring-transactions.js','utf8').replace(/^import[\s\S]*?;\n/,'').replace(/export /g,'')+'\ninitRecurringTransactions();',ctx);
const settle=()=>new Promise(setImmediate),form=()=>root.querySelector('form'),field=n=>form().querySelector(`[name="${n}"]`);
const edit=i=>root.querySelectorAll('button').find(b=>b.attrs['aria-label']===`Original ${i} bearbeiten`).fire('click');
(async()=>{
 await settle();
 for(let i=0;i<3;i++){
  edit(i);assert.equal(Number(field('amount').value),42.50);assert.equal(field('name').value,'Original '+i);
  field('amount').value='59.95';await form().fire('submit');assert.equal(writes.at(-1).id,i+1);assert.equal(writes.at(-1).amount,59.95);assert.equal(writes.at(-1).start_date,'2025-02-15');assert.equal(root.querySelectorAll('.recurring-row').length,3);
 }
 assert.equal(adds,0);assert.equal(events,3);
 edit(0);field('amount').value='100';form().querySelector('.recurring-cancel').fire('click');assert.equal(writes.length,3);
 edit(1);field('day').value='31';assert.equal(Number(field('month').value),2);await form().fire('submit');assert.equal(writes.length,3);assert.match(form().querySelector('[role="status"]').textContent,/gültiges Datum/);
 field('day').value='15';field('amount').value='-1';await form().fire('submit');assert.equal(writes.length,3);
 field('amount').value='70';fail=true;await form().fire('submit');assert.equal(field('amount').value,'70');assert.match(form().querySelector('[role="status"]').textContent,/fehlgeschlagen/);assert.equal(form().querySelector('button[type="submit"]').disabled,false);fail=false;await form().fire('submit');assert.equal(writes.length,4);
 root.querySelectorAll('button').find(b=>b.attrs['aria-label']==='Monatlich hinzufügen').fire('click');field('name').value='New';field('amount').value='15';field('day').value='10';await form().fire('submit');assert.equal(adds,1);assert.equal(root.querySelectorAll('.recurring-row').length,4,'creation still works');
 const requests=[],api={SUPABASE_URL:'https://example.invalid',SUPABASE_KEY:'synthetic-public',getValidAccessToken:async()=>'synthetic-jwt',fetch:async(url,options)=>{requests.push({url,options});return {ok:true,json:async()=>[{...rows[0],amount:99}]};}};
 vm.runInNewContext(fs.readFileSync('js/data/recurring-transactions-data.js','utf8').replace(/^import .*\n/gm,'').replace(/export /g,'')+'\nout.update=updateRecurringTransaction;',{...api,out:api});
 await api.update(1,{...rows[0],amount:99,user_id:'foreign'});assert.equal(requests[0].options.method,'PATCH');assert.match(requests[0].url,/id=eq\.1&select=/);assert.equal(requests[0].options.headers.Authorization,'Bearer synthetic-jwt');assert.equal(JSON.parse(requests[0].options.body).user_id,undefined);assert.equal(JSON.parse(requests[0].options.body).amount,99);
 const empty={...api,fetch:async()=>({ok:true,json:async()=>[]})};vm.runInNewContext(fs.readFileSync('js/data/recurring-transactions-data.js','utf8').replace(/^import .*\n/gm,'').replace(/export /g,'')+'\nout.update=updateRecurringTransaction;',{...empty,out:empty});await assert.rejects(()=>empty.update(1,rows[0]),/nicht mehr verfügbar/);
 console.log('PASS: edit monthly/quarterly/yearly, prefill, amount save, ID/date preserved, no duplicates/deletion, cancel, invalid input, failed-save retry, change event, authenticated PATCH whitelist and empty-result rejection. DOM mock; no iPhone test.');
})().catch(e=>{console.error(e);process.exitCode=1;});
