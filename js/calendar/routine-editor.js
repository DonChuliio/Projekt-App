import { getSession } from '../auth/auth.js';
import { getISOWeekYear, getISOWeeksInYear } from '../utils/date.js';
import { loadRoutineTemplates,addRoutineColumn,addRoutineTask,setRoutineWeeks,archiveRoutineColumn,archiveRoutineTask } from '../data/routine-templates-data.js?v=1.73';
export async function initRoutineEditor(host){
 const owner=getSession()?.user?.id;if(!owner)return;
 const root=document.createElement('div');host.append(root);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let data,year=getISOWeekYear(new Date()),busy=false;
 const active=()=>getSession()?.user?.id===owner&&root.isConnected;
 const message=el('p',undefined,'loan-error');message.setAttribute('role','status');
 const notify=()=>document.dispatchEvent(new CustomEvent('dock:routines-changed'));
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 async function work(fn){if(busy||!active())return;busy=true;const controls=[...root.querySelectorAll('button,input')];controls.forEach(n=>n.disabled=true);try{await fn();if(!active())return;data=await loadRoutineTemplates();if(active()){draw();notify();}}catch(e){if(active())message.textContent=e.message;}finally{busy=false;controls.forEach(n=>n.disabled=false);}}
 function addForm(label,save){if(busy)return;root.querySelector('form')?.remove();const form=el('form',undefined,'routine-edit-form'),input=el('input');input.required=true;input.maxLength=100;input.setAttribute('aria-label',label);input.placeholder=label;const submit=el('button','Speichern');submit.type='submit';form.append(input,submit,button('Abbrechen',()=>form.remove()));form.addEventListener('submit',event=>{event.preventDefault();const name=input.value.trim();if(!name)return;work(()=>save(name));});root.prepend(form);input.focus();}
 function confirmDelete(text,save){if(busy)return;root.querySelector('form')?.remove();const form=el('form',undefined,'routine-edit-form');form.append(el('p',text+' Bereits erzeugte To-dos und Erledigungsstände bleiben erhalten.'),button('Entfernen bestätigen',()=>work(save)),button('Abbrechen',()=>form.remove()));root.prepend(form);}
 function draw(){
  root.replaceChildren();message.textContent='';root.append(message,el('h3','Routinen – jedes Jahr wiederverwenden'),el('p','Die KW-Auswahl gilt jährlich. Erledigt wird jedes Jahresvorkommen separat bei den wichtigen To-dos. KW 53 bleibt für Jahre mit 53 Wochen gespeichert.','calendar-no-tasks'));
  const controls=el('div',undefined,'documents-actions');controls.append(button('Spalte hinzufügen',()=>addForm('Spaltenname',addRoutineColumn)),button('Neu laden',()=>work(async()=>{})));root.append(controls);
  const management=el('div',undefined,'routine-columns');
  for(const column of data.columns){const card=el('section',undefined,'routine-column');card.append(el('h4',column.name),button('Aufgabe hinzufügen',()=>addForm('Aufgabenname',name=>addRoutineTask(column.id,name))),button('Spalte entfernen',()=>confirmDelete(`„${column.name}“ und nur ihre Aufgaben aus zukünftigen Plänen entfernen?`,()=>archiveRoutineColumn(column.id))));for(const task of data.tasks.filter(t=>t.column_id===column.id)){const row=el('div',undefined,'routine-task-row');row.append(el('span',task.name),button('Aufgabe entfernen',()=>confirmDelete(`„${task.name}“ aus zukünftigen Plänen entfernen?`,()=>archiveRoutineTask(task.task_id))));card.append(row);}management.append(card);}root.append(management);
  const nav=el('div',undefined,'documents-actions');nav.append(button('Vorjahr',()=>{if(year>1900){year--;draw();}}),el('strong',`ISO-Jahr ${year} · ${getISOWeeksInYear(year)} Wochen`),button('Folgejahr',()=>{if(year<9999){year++;draw();}}));root.append(nav);
  const scroll=el('div',undefined,'week-plan-scroll'),table=el('table',undefined,'week-plan-table');const head=el('tr');head.append(el('th','KW'));data.columns.forEach(c=>head.append(el('th',c.name)));const thead=el('thead');thead.append(head);table.append(thead);
  const body=el('tbody');for(let week=1;week<=getISOWeeksInYear(year);week++){const row=el('tr');row.append(el('th',`KW ${week}`));for(const column of data.columns){const cell=el('td');for(const task of data.tasks.filter(t=>t.column_id===column.id)){const label=el('label',undefined,'routine-week-choice'),input=el('input');input.type='checkbox';input.checked=task.weeks.includes(week);input.setAttribute('aria-label',`${column.name}: ${task.name}, KW ${week}`);input.addEventListener('change',()=>work(()=>setRoutineWeeks(task.task_id,input.checked?[...new Set([...task.weeks,week])].sort((a,b)=>a-b):task.weeks.filter(w=>w!==week),task.weeks)).then(()=>{if(active())input.checked=task.weeks.includes(week);}));label.append(input,el('span',task.name));cell.append(label);}row.append(cell);}body.append(row);}table.append(body);scroll.append(table);root.append(scroll);
 }
 try{data=await loadRoutineTemplates();if(active())draw();}catch(e){if(active()){message.textContent=e.message;root.append(message,button('Erneut laden',()=>{root.remove();initRoutineEditor(host);}));}}
}
