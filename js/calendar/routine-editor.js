import { getSession } from '../auth/auth.js';
import { getISOWeekYear, getISOWeeksInYear } from '../utils/date.js';
import { loadRoutineTemplates,addRoutineColumn,addRoutineTask,renameRoutineTask,setRoutineWeeks,archiveRoutineTask } from '../data/routine-templates-data.js?v=1.110';
export async function initRoutineEditor(host){
 const owner=getSession()?.user?.id;if(!owner)return;
 const root=document.createElement('div');host.append(root);
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 let data,year=getISOWeekYear(new Date()),busy=false,editing=false,scrollLeft=0;
 const active=()=>getSession()?.user?.id===owner&&root.isConnected;
 const message=el('p',undefined,'loan-error');message.setAttribute('role','status');
 const notify=()=>document.dispatchEvent(new CustomEvent('dock:routines-changed'));
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 async function work(fn){if(busy||!active())return;busy=true;const controls=[...root.querySelectorAll('button,input')];controls.forEach(n=>n.disabled=true);try{await fn();if(!active())return;data=await loadRoutineTemplates();if(active()){draw();notify();}}catch(e){if(active())message.textContent=e.message;}finally{busy=false;controls.forEach(n=>n.disabled=false);}}
 function addForm(label,save,value=''){if(busy)return;root.querySelector('form')?.remove();const form=el('form',undefined,'routine-edit-form'),input=el('input');input.required=true;input.maxLength=200;input.value=value;input.setAttribute('aria-label',label);input.placeholder=label;const submit=el('button','Speichern');submit.type='submit';form.append(input,submit,button('Abbrechen',()=>form.remove()));form.addEventListener('submit',event=>{event.preventDefault();const name=input.value.trim();if(!name)return;work(()=>save(name));});root.prepend(form);input.focus();}
 function confirmDelete(text,save){if(busy)return;root.querySelector('form')?.remove();const form=el('form',undefined,'routine-edit-form');form.append(el('p',text+' Bereits erzeugte To-dos und Erledigungsstände bleiben erhalten.'),button('Entfernen bestätigen',()=>work(save)),button('Abbrechen',()=>form.remove()));root.prepend(form);}
 function draw(){
  const previous=root.querySelector('.routine-grid-scroll');if(previous)scrollLeft=previous.scrollLeft;
  root.replaceChildren();message.textContent='';root.append(message,el('p','Die KW-Häkchen planen die jährliche Fälligkeit. Erledigen kannst du die Aufgaben weiterhin bei den wichtigen To-dos.','calendar-no-tasks'));
  const controls=el('div',undefined,'documents-actions');controls.append(button('Aufgabe hinzufügen',()=>addForm('Aufgabenname',async name=>{const column=data.columns[0]||await addRoutineColumn('Routinen');await addRoutineTask(column.id,name);})),button(editing?'Bearbeiten beenden':'Bearbeiten',()=>{if(busy)return;editing=!editing;draw();}),button('Neu laden',()=>work(async()=>{})));root.append(controls);
  if(editing){const management=el('section',undefined,'routine-task-management');management.append(el('h3','Aufgaben bearbeiten'));for(const task of data.tasks){const row=el('div',undefined,'routine-task-row');row.append(el('span',task.name),button('Umbenennen',()=>addForm('Aufgabenname',name=>renameRoutineTask(task.task_id,name),task.name)),button('Entfernen',()=>confirmDelete(`„${task.name}“ aus zukünftigen Plänen entfernen?`,()=>archiveRoutineTask(task.task_id))));management.append(row);}root.append(management);}
  const nav=el('div',undefined,'documents-actions');nav.append(button('Vorjahr',()=>{if(year>1900){year--;draw();}}),el('strong',`ISO-Jahr ${year} · ${getISOWeeksInYear(year)} Wochen`),button('Folgejahr',()=>{if(year<9999){year++;draw();}}));root.append(nav);
  const scroll=el('div',undefined,'routine-grid-scroll'),table=el('table',undefined,'routine-grid-table');scroll.setAttribute('role','region');scroll.setAttribute('aria-label','Routinen nach Kalenderwoche');scroll.setAttribute('tabindex','0');
  const head=el('tr'),corner=el('th','Aufgabe');corner.setAttribute('scope','col');head.append(corner);for(let week=1;week<=getISOWeeksInYear(year);week++){const th=el('th',`KW ${week}`);th.setAttribute('scope','col');head.append(th);}const thead=el('thead');thead.append(head);table.append(thead);
  const body=el('tbody');for(const task of data.tasks){const row=el('tr'),name=el('th',task.name);name.setAttribute('scope','row');row.append(name);for(let week=1;week<=getISOWeeksInYear(year);week++){const cell=el('td'),label=el('label',undefined,'routine-grid-choice'),input=el('input');input.type='checkbox';input.checked=task.weeks.includes(week);input.setAttribute('aria-label',`${task.name}, KW ${week}`);input.addEventListener('change',()=>work(()=>setRoutineWeeks(task.task_id,input.checked?[...new Set([...task.weeks,week])].sort((a,b)=>a-b):task.weeks.filter(w=>w!==week),task.weeks)).then(()=>{if(active())input.checked=task.weeks.includes(week);}));label.append(input);cell.append(label);row.append(cell);}body.append(row);}table.append(body);scroll.append(table);root.append(scroll);scroll.scrollLeft=scrollLeft;
  if(!data.tasks.length)root.append(el('p','Noch keine Aufgaben. Über „Aufgabe hinzufügen“ legst du eine neue Zeile an.','calendar-no-tasks'));
 }
 try{data=await loadRoutineTemplates();if(active())draw();}catch(e){if(active()){message.textContent=e.message;root.append(message,button('Erneut laden',()=>{root.remove();initRoutineEditor(host);}));}}
}
