import { renderFoodForm } from './nutrition-food-form.js?v=1.117';
import { getSession } from '../auth/auth.js';
import { showView } from '../router.js';
import { loadNutritionRecipe,loadPersonalFoods,savePersonalFood,deletePersonalFood,saveNutrition,savePortions } from '../data/nutrition-data.js?v=1.117';
import { NUTRIENTS,UNITS,parseIngredient,numberValue,baseAmount,perPortion,nutrientText,foodKey,basisLabel,validateFood } from './nutrition-model.js?v=1.117';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
function message(root,text){let p=root.querySelector('[role="status"]');if(!p){p=el('p');p.setAttribute('role','status');root.prepend(p);}p.textContent=text;}
function valuesTable(totals){const list=el('dl',undefined,'nutrition-values');for(const [key,title] of NUTRIENTS)list.append(el('dt',title),el('dd',nutrientText(totals[key],key)));return list;}
export function appendNutritionSection(container,recipe,recalculate){const section=el('section',undefined,'recipe-view-section nutrition-section');section.append(el('h3','Nährwerte'));container.append(section);const snapshot=recipe.nutrition_data;if(!snapshot){section.append(el('p','Noch keine Nährwertberechnung.'),button('Nährwerte ermitteln',recalculate));return;}
 if(recipe.nutrition_stale||JSON.stringify(snapshot.ingredients)!==JSON.stringify(recipe.ingredients))section.append(el('p','Veraltet: Die Zutaten wurden geändert. Angezeigt ist die letzte Berechnung.','nutrition-warning'),button('Neu berechnen',recalculate));
 else if(snapshot.method!=='manual')section.append(el('p','Frühere Berechnung. Du kannst sie mit der manuellen Erfassung neu berechnen.','nutrition-help'),button('Neu berechnen',recalculate));
 const totals=snapshot.totals||{};section.append(el('h4','Gesamtes Rezept'),valuesTable(totals));if(NUTRIENTS.some(([key])=>totals[key]===null||totals[key]===undefined))section.append(el('p','Unvollständig: Mindestens einer Zutat fehlen Nährwerte. Fehlende Werte sind mit — markiert.','nutrition-warning'));
 const label=el('label','Portionen'),input=el('input');input.type='number';input.min=1;input.max=2147483647;input.step=1;input.value=recipe.nutrition_portions||1;input.setAttribute('aria-label','Portionen');label.append(input);const serving=el('div'),status=el('p');status.setAttribute('role','status');let saving=false,pending=null;const owner=getSession()?.user?.id;
 const draw=()=>{serving.replaceChildren(el('h4','Pro Portion'),valuesTable(perPortion(totals,Number(input.value))));};draw();section.append(label,serving,status);
 async function flush(){if(saving||pending===null)return;saving=true;while(pending!==null){const value=pending;pending=null;try{await savePortions(recipe.id,value);if(getSession()?.user?.id!==owner){pending=null;break;}recipe.nutrition_portions=value;if(pending===null&&Number(input.value)===value)status.textContent='Portionen gespeichert.';}catch(e){status.textContent='Portionen nicht gespeichert: '+e.message;pending=null;let retry=section.querySelector('.nutrition-save-retry');if(!retry){retry=button('Erneut speichern',()=>{try{draw();pending=Number(input.value);flush();}catch(error){status.textContent=error.message;}});retry.className='nutrition-save-retry';section.append(retry);}break;}}saving=false;}
 input.addEventListener('input',()=>{try{draw();status.textContent='Portionen werden gespeichert …';pending=Number(input.value);section.querySelector('.nutrition-save-retry')?.remove();flush();}catch(e){pending=null;status.textContent=e.message;}});
}

let root,library,onRecipe,recipe,foods=[],drafts=[],mappings=[],index=0,epoch=0,busy=false,foodBack=null;
const isVisible=name=>{const view=document.querySelector('[data-view="'+name+'"]');return Boolean(view&&!view.classList.contains('hidden'));};
async function run(target,fn){
 if(busy||!getSession()?.user?.id)return;
 target.querySelector('[role="status"]')?.remove();busy=true;
 const generation=epoch,owner=getSession()?.user?.id,valid=()=>generation===epoch&&owner===getSession()?.user?.id;
 const controls=[...target.querySelectorAll('button,input,select')];controls.forEach(n=>n.disabled=true);
 try{await fn(valid);}catch(e){if(valid())message(target,e.message);}finally{if(valid())busy=false;controls.forEach(n=>n.disabled=false);}
}
export function initNutrition(openRecipe){
 root=document.getElementById('recipe-nutrition-content');library=document.getElementById('recipe-foods-content');if(!root||!library)return;onRecipe=openRecipe;
 document.getElementById('recipe-nutrition-back').addEventListener('click',()=>{if(busy)return;if(index>0){index--;drawStep();}else if(recipe)onRecipe(recipe);else showView('red-folder');});
 document.getElementById('recipe-foods-back').addEventListener('click',()=>{if(busy)return;if(foodBack){foodBack=null;drawLibrary();}else showView('red-folder');});
 document.getElementById('recipe-foods-open').addEventListener('click',openFoodLibrary);
 document.addEventListener('dock:auth-changed',()=>{epoch++;busy=false;foods=[];recipe=null;drafts=[];mappings=[];foodBack=null;index=0;root.replaceChildren();library.replaceChildren();});
}
export async function openNutrition(value){
 if(!root||busy)return;const generation=++epoch,owner=getSession()?.user?.id;recipe=null;index=0;showView('recipe-nutrition');root.replaceChildren(el('p','Zutaten und persönliche Lebensmittel werden geladen …'));
 try{
  const [fresh,personal]=await Promise.all([loadNutritionRecipe(value.id),loadPersonalFoods()]);
  if(generation!==epoch||owner!==getSession()?.user?.id||!isVisible('recipe-nutrition'))return;
  recipe=fresh;foods=personal;
  if(!Array.isArray(recipe.ingredients)||!recipe.ingredients.length)throw Error('Bitte zuerst Zutaten im Zutatenfeld eintragen.');
  if(recipe.ingredients.length>500)throw Error('Maximal 500 Zutaten pro Berechnung.');
  const saved=recipe.nutrition_data,restore=saved?.method==='manual'&&!recipe.nutrition_stale&&JSON.stringify(saved.ingredients)===JSON.stringify(recipe.ingredients);
  drafts=recipe.ingredients.map((raw,i)=>{
   const parsed=parseIngredient(raw),line=restore?saved.lines?.[i]:null;
   const values=line?{name:line.food_name,basis:line.basis,...Object.fromEntries(NUTRIENTS.map(([key])=>[key,line[key]]))}:{name:parsed.name,basis:parsed.unit==='kg'?'g':parsed.unit==='l'?'ml':parsed.unit};
   return {...parsed,quantity:line?.quantity??parsed.quantity??'',unit:line?.unit??parsed.unit,values,selectedId:null,replace:false};
  });
  mappings=drafts.map(()=>null);drawStep();
 }catch(e){if(generation===epoch&&owner===getSession()?.user?.id&&isVisible('recipe-nutrition'))root.replaceChildren(el('p',e.message),button('Erneut versuchen',()=>openNutrition(value)));}
}
function drawStep(){
 const i=index,draft=drafts[i];root.replaceChildren(el('h3',recipe.name),el('p','Zutat '+(i+1)+' von '+drafts.length),el('h4',draft.raw));
 if(draft.quantity==='')root.append(el('p','Keine eindeutige Menge erkannt. Bitte Menge und Einheit ergänzen.','nutrition-warning'));
 const invalidate=()=>{mappings[i]=null;root.querySelector('.nutrition-finish')?.remove();};
 const amountLabel=el('label','Menge im Rezept'),amount=el('input');amount.type='text';amount.inputMode='decimal';amount.value=draft.quantity;amount.setAttribute('aria-label','Menge');
 amount.addEventListener('input',()=>{draft.quantity=amount.value;invalidate();});amountLabel.append(amount);
 const unitLabel=el('label','Einheit im Rezept'),unit=el('select');unit.setAttribute('aria-label','Einheit');
 for(const [key,title] of [['','Bitte wählen'],...UNITS]){const option=el('option',title);option.value=key;unit.append(option);}
 unit.value=draft.unit;unit.addEventListener('change',()=>{draft.unit=unit.value;invalidate();});unitLabel.append(unit);
 const picker=el('div'),toggle=button(undefined,()=>{
  if(picker.children.length){picker.replaceChildren();toggle.setAttribute('aria-expanded','false');return;}
  toggle.setAttribute('aria-expanded','true');const search=el('input');search.type='search';search.placeholder='In meiner Bibliothek suchen';search.setAttribute('aria-label','Bibliothek durchsuchen');const list=el('div');
  const draw=()=>{list.replaceChildren();const term=foodKey(search.value);for(const food of foods.filter(f=>foodKey(f.name).includes(term)))list.append(button(food.name+' · '+basisLabel(food.basis),()=>{draft.values=food;draft.selectedId=food.id;draft.replace=false;invalidate();drawStep();}));if(!list.children.length)list.append(el('p','Keine gespeicherten Lebensmittel gefunden.'));};
  search.addEventListener('input',draw);picker.append(search,list);draw();search.focus?.();
 });
 toggle.className='nutrition-library-icon';toggle.setAttribute('aria-label','Lebensmittelbibliothek öffnen');toggle.setAttribute('aria-expanded','false');toggle.title='Lebensmittelbibliothek';
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M4 4h6v16H4zM10 4h5v16h-5zM15 6l4-1 4 14-4 1z');svg.append(path);toggle.append(svg);
 const heading=el('div',undefined,'nutrition-entry-heading');heading.append(el('h4','Nährwerte'),toggle);const formHost=el('div');
 root.append(amountLabel,unitLabel,heading,picker,el('p','Bestätigte Nährwerte werden in deiner Bibliothek gespeichert.','nutrition-help'),formHost);
 renderFoodForm({target:formHost,food:draft.values,allowReplace:true,replace:draft.replace,submitText:'Zutat bestätigen',
  onChange:(values,replace)=>{draft.values=values;draft.replace=replace;invalidate();},
  onSubmit:(value,replace)=>run(root,async valid=>{
   draft.values=value;draft.replace=replace;const food=validateFood(value),quantity=numberValue(amount.value);
   baseAmount(quantity,unit.value,food);
   const original=foods.find(f=>f.id===draft.selectedId);
   const selected=original&&foodKey(original.name)===foodKey(food.name)?original.id:null;
   const saved=await savePersonalFood(food,selected,replace);
   if(!valid()||!isVisible('recipe-nutrition'))return;
   remember(saved);
   draft.values=saved;draft.selectedId=saved.id;draft.quantity=quantity;draft.unit=unit.value;draft.replace=false;
   mappings[i]={raw:recipe.ingredients[i],quantity,unit:unit.value,food:saved};
   if(index<drafts.length-1)index++;drawStep();
  })
 });
 const overview=el('details');overview.append(el('summary','Zutaten prüfen'));for(let k=0;k<drafts.length;k++)overview.append(button((k+1)+'. '+drafts[k].raw+' · '+(mappings[k]?'bestätigt':'offen'),()=>{index=k;drawStep();}));root.append(overview);
 if(mappings.every(Boolean)){const finish=button('Berechnung speichern',()=>run(root,async valid=>{const result=await saveNutrition(recipe.id,recipe.ingredients,mappings);if(valid()&&isVisible('recipe-nutrition'))onRecipe({...recipe,...result});}));finish.className='nutrition-finish';root.append(finish);}
}
function remember(saved){
 const old=foods.find(f=>f.id===saved.id);
 if(old&&(old.basis!==saved.basis||old.name!==saved.name||NUTRIENTS.some(([key])=>old[key]!==saved[key]))){
  drafts.forEach((draft,i)=>{if(draft.selectedId===saved.id){draft.values=saved;mappings[i]=null;}});
 }
 foods=[...foods.filter(f=>f.id!==saved.id),saved].sort((a,b)=>a.name.localeCompare(b.name,'de'));
}
async function openFoodLibrary(){
 if(!library||busy)return;const generation=++epoch,owner=getSession()?.user?.id;showView('recipe-foods');library.replaceChildren(el('p','Lebensmittel werden geladen …'));foodBack=null;
 try{const loaded=await loadPersonalFoods();if(generation===epoch&&owner===getSession()?.user?.id&&isVisible('recipe-foods')){foods=loaded;drawLibrary();}}catch(e){if(generation===epoch&&owner===getSession()?.user?.id)message(library,e.message);}
}
function drawLibrary(){
 foodBack=null;library.replaceChildren(button('Neues Lebensmittel',()=>editFood(null)));
 const search=el('input');search.type='search';search.placeholder='Lebensmittel suchen';search.setAttribute('aria-label','Persönliche Lebensmittel suchen');const list=el('div');
 const draw=()=>{list.replaceChildren();for(const food of foods.filter(f=>foodKey(f.name).includes(foodKey(search.value)))){
  const card=el('section',undefined,'nutrition-food-result');card.append(el('h3',food.name),el('p','Je '+basisLabel(food.basis)),valuesTable(food),button('Bearbeiten',()=>editFood(food)),button('Löschen',()=>{
   if(card.querySelector('.nutrition-food-delete'))return;
   const confirm=el('div',undefined,'nutrition-food-delete');confirm.append(el('p','Lebensmittel löschen? Gespeicherte Rezeptberechnungen bleiben erhalten.'),button('Löschen bestätigen',()=>run(library,async valid=>{await deletePersonalFood(food.id);if(valid()&&isVisible('recipe-foods')){foods=foods.filter(f=>f.id!==food.id);drawLibrary();}})),button('Abbrechen',()=>confirm.remove()));card.append(confirm);
  }));list.append(card);
 }if(!list.children.length)list.append(el('p','Keine persönlichen Lebensmittel gefunden.'));};
 search.addEventListener('input',draw);library.append(search,list);draw();
}
function editFood(food){
 foodBack=drawLibrary;
 renderFoodForm({target:library,food,onCancel:drawLibrary,onSubmit:value=>run(library,async valid=>{
  const saved=await savePersonalFood(value,food?.id||null,Boolean(food));if(!valid()||!isVisible('recipe-foods'))return;remember(saved);drawLibrary();
 })});
}
