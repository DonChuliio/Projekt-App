import { NUTRIENTS,UNITS,numberValue,pieceReference,densityProposal,needsDensity,conversionProposal,ingredientPreview,nutrientText,baseAmount } from './nutrition-model.js?v=1.108';

const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const format=n=>Number(n).toLocaleString('de-DE',{maximumFractionDigits:2});
const link=(root,text,href)=>{const a=el('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';root.append(a);};

// Pure form: persistence and account guards remain in the existing nutrition controller.
export function renderFoodForm({target,food,onSubmit,onCancel,alias='',unit='',quantity=null}){
 target.replaceChildren(el('h3',food?.id?'Lebensmittel bearbeiten':'Lebensmittel bestätigen'));
 const form=el('form'),fields={},unitFields={};
 const field=(parent,key,title,value='')=>{const label=el('label'),caption=el('span',title),input=el('input');input.type='text';input.value=value??'';input.setAttribute('aria-label',title);if(key!=='name')input.inputMode='decimal';label.append(caption,input);parent.append(label);fields[key]=input;return input;};
 field(form,'name','Lebensmittelname',food?.name||alias).maxLength=200;fields.name.required=true;
 const reference=pieceReference(food?.name||alias),liquid=densityProposal(food?.name||alias),basisInfo=el('p'),basisOptions=el('details');
 basisOptions.append(el('summary','Bezugsgröße ändern'));
 const basisLabel=el('label','Diese vier Werte gelten für'),basis=el('select');
 for(const [value,title] of [['','Bitte wählen'],['g','100 g'],['ml','100 ml']]){const o=el('option',title);o.value=value;basis.append(o);}
 basis.value=food?.basis||(liquid?'ml':reference||!food?'g':'');basis.required=true;basis.setAttribute('aria-label','Bezugsgröße');basisLabel.append(basis);basisOptions.append(basisLabel);basisOptions.open=!basis.value;form.append(basisInfo,basisOptions);
 const nutritionInputs=el('details');nutritionInputs.append(el('summary','Basiswerte prüfen oder ändern'));nutritionInputs.open=!food||NUTRIENTS.some(([key])=>food[key]===null||food[key]===undefined);for(const [key,title] of NUTRIENTS)field(nutritionInputs,key,title+(key==='kcal'?'':' (g)'),food?.[key]);form.append(nutritionInputs);
 form.append(el('p','Leere Werte bleiben unbekannt. Werte und Bezugsgröße bitte mit dem Etikett bzw. der Quelle prüfen.'));

 const densityBox=el('details');densityBox.append(el('summary','Umrechnung zwischen ml und g prüfen'));
 field(densityBox,'densityWeight','Gewicht von 100 ml (g)',food?.density?food.density*100:'');
 const densityNote=el('p');densityBox.append(densityNote);form.append(densityBox);
 const densitySource=el('div');densityBox.append(densitySource);
 const customUnit=unit&&!['g','kg','ml','l'].includes(unit),primary=el('section'),conversionNote=el('p'),conversionSource=el('div');form.append(primary);
 const advanced=el('details');advanced.append(el('summary','Weitere Einstellungen'));
 advanced.append(el('p','Alternative Namen helfen Dock, dieses Lebensmittel später wiederzuerkennen. Sie werden beim Bestätigen automatisch ergänzt.'));
 const aliasLabel=el('label','Alternative Namen – ein Name pro Zeile'),aliases=el('textarea');aliases.value=[...new Set([...(food?.aliases||[]),alias].filter(Boolean))].join('\n');aliases.setAttribute('aria-label','Aliasnamen');aliasLabel.append(aliases);advanced.append(aliasLabel);
 const unitLabels={};
 for(const [key,title] of UNITS.filter(([key])=>!['g','kg','ml','l'].includes(key))){const parent=key===unit?primary:advanced;const input=field(parent,'unit_'+key,'Menge pro '+title,food?.unit_amounts?.[key]);unitFields[key]=input;unitLabels[key]={label:parent.children[parent.children.length-1],input,title};}
 primary.append(conversionNote,conversionSource);primary.hidden=!customUnit;form.append(advanced);
 const preview=el('section');preview.className='nutrition-ingredient-preview';form.append(preview);
 let suggestedUnit=null,suggestedDensity=null,previousBasis=basis.value;
 const density=()=>{const weight=numberValue(fields.densityWeight.value);return weight===null?null:weight/100;};
 const values=()=>({name:fields.name.value,basis:basis.value,...Object.fromEntries(NUTRIENTS.map(([key])=>[key,fields[key].value])),density:density(),aliases:aliases.value.split('\n'),unit_amounts:Object.fromEntries(Object.entries(unitFields).filter(([,input])=>input.value.trim()).map(([key,input])=>[key,input.value])),source_ref:food?.source_ref||null});
 const drawPreview=()=>{preview.replaceChildren();if(!unit||quantity===null||quantity==='')return;
  preview.append(el('h4','Für diese Zutat'));
  try{if(!basis.value)throw Error('Bitte zuerst 100 g oder 100 ml auswählen.');const value=values();for(const [key] of NUTRIENTS)value[key]=numberValue(value[key]);const result=ingredientPreview(quantity,unit,value);const title=UNITS.find(([key])=>key===unit)?.[1]||unit;
   const conversion=customUnit?format(Number(value.unit_amounts[unit]))+' '+basis.value+' pro '+title:unit;
   preview.append(el('p',format(numberValue(quantity))+' '+title+' · '+conversion+' → '+format(result.amount)+' '+basis.value));
   const list=el('dl');list.className='nutrition-values';for(const [key,title] of NUTRIENTS)list.append(el('dt',title),el('dd',nutrientText(result.totals[key],key)));preview.append(list);
  }catch(e){preview.append(el('p',e.message));}
 };
 const update=()=>{
  const selectedName=fields.name.value,ref=pieceReference(selectedName),proposal=densityProposal(selectedName);
  basisInfo.textContent=basis.value?'Nährwerte je 100 '+basis.value+(food?.basis?' · aus deinem Lebensmittel bzw. der Quelle übernommen.':ref||proposal?' · für dieses Lebensmittel vorgeschlagen, bitte prüfen.':'. Bitte Bezugsgröße prüfen.'):'Die Quelle nennt keine eindeutige Bezugsgröße. Bitte 100 g oder 100 ml auswählen.';
  const directSpoonAmount=['tbsp','tsp'].includes(unit)&&food?.unit_amounts?.[unit]>0;
  const requiresDensity=(!directSpoonAmount&&needsDensity(unit,basis.value))||(unit==='piece'&&basis.value==='ml'&&Boolean(ref));
  densityBox.hidden=!requiresDensity;
  if(requiresDensity&&proposal&&(!fields.densityWeight.value||fields.densityWeight.value===suggestedDensity)){fields.densityWeight.value=String(proposal.value*100);suggestedDensity=fields.densityWeight.value;}
  densityNote.textContent=fields.densityWeight.value?'100 ml entsprechen etwa '+fields.densityWeight.value+' g. Richtwert prüfen oder anpassen.':'Für diese Umrechnung fehlt ein verlässlicher Richtwert. Wie viel wiegen 100 ml dieses Lebensmittels?';
  densityBox.open=requiresDensity&&!fields.densityWeight.value;densitySource.replaceChildren();if(requiresDensity&&proposal)link(densitySource,'Quelle: FAO/INFOODS',proposal.source);
  for(const [key,{label,title}] of Object.entries(unitLabels)){// Keep accessible names stable while explaining the unit in visible text.
   let caption=label.querySelector('span');if(!caption){caption=el('span');label.prepend(caption);}caption.textContent=(basis.value||'g')+' pro '+title;
  }
  conversionSource.replaceChildren();let d;try{d=density();}catch{}
  const suggestion=conversionProposal(unit,selectedName,{basis:basis.value,density:d});
  if(customUnit&&suggestion&&(!unitFields[unit].value||unitFields[unit].value===suggestedUnit)){unitFields[unit].value=String(suggestion.amount);suggestedUnit=unitFields[unit].value;}
  if(customUnit){conversionNote.textContent=food?.unit_amounts?.[unit]?'Dein gespeicherter Wert. Du kannst ihn ändern.':suggestion?(suggestion.note||suggestion.text)+' Mit „Lebensmittel speichern“ bestätigen.':'Keine zuverlässige Stück-/Packungsgröße bekannt. Bitte die Menge für genau ein Stück bzw. eine Packung eintragen.';if(suggestion?.source)link(conversionSource,'Quelle zum Richtwert',suggestion.source);}
  drawPreview();
 };
 basis.addEventListener('change',()=>{let d;try{d=density();}catch{}if(previousBasis&&previousBasis!==basis.value)for(const input of Object.values(unitFields)){let amount;try{amount=numberValue(input.value);}catch{}input.value=amount&&d&&basis.value?String(previousBasis==='g'?amount/d:amount*d):'';}previousBasis=basis.value;suggestedUnit=null;update();});
 fields.name.addEventListener('input',()=>{if(suggestedUnit&&unitFields[unit]?.value===suggestedUnit)unitFields[unit].value='';if(suggestedDensity&&fields.densityWeight.value===suggestedDensity)fields.densityWeight.value='';suggestedUnit=null;suggestedDensity=null;update();});
 for(const [key,input] of Object.entries(fields))if(key!=='name')input.addEventListener('input',key==='densityWeight'?update:drawPreview);
 if(food?.source_ref)link(form,'Quelle: Open Food Facts · ODbL',food.source_ref);
 const save=el('button','Lebensmittel speichern');save.type='submit';const cancel=el('button','Abbrechen');cancel.type='button';cancel.addEventListener('click',onCancel);form.append(save,cancel);
 form.addEventListener('submit',event=>{event.preventDefault();let value;try{value=values();if(unit&&quantity!==null&&quantity!=='')baseAmount(quantity,unit,value);}catch(e){let error=form.querySelector('[role="status"]');if(!error){error=el('p');error.setAttribute('role','status');form.prepend(error);}error.textContent=e.message;return;}onSubmit(value);});
 target.append(form);update();return form;
}
