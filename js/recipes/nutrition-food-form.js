import { NUTRIENTS, BASES } from './nutrition-model.js?v=1.117';
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function renderFoodForm({target,food,onSubmit,onCancel,onChange,replace=false,allowReplace=false,submitText='Lebensmittel speichern'}){
 target.replaceChildren();
 const form=el('form'),fields={};
 const field=(key,title,value='')=>{const label=el('label',title),input=el('input');input.type='text';input.value=value??'';input.setAttribute('aria-label',title);input.required=true;label.append(input);form.append(label);fields[key]=input;return input;};
 field('name','Lebensmittelname',food?.name).maxLength=200;
 const label=el('label','Diese vier Werte gelten für'),basis=el('select');basis.required=true;basis.setAttribute('aria-label','Bezugsgröße');
 for(const [key,title] of [['','Bitte wählen'],...BASES]){const option=el('option',title);option.value=key;basis.append(option);}
 basis.value=food?.basis||'';label.append(basis);form.append(label);
 for(const [key,title] of NUTRIENTS)field(key,title+(key==='kcal'?'':' (g)'),food?.[key]).inputMode='decimal';
 const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=replace;checkbox.setAttribute('aria-label','Gespeicherten Eintrag aktualisieren');
 if(allowReplace){const checkLabel=el('label', 'Gespeicherten Eintrag bei Änderungen aktualisieren');checkLabel.className='nutrition-replace';checkLabel.append(checkbox);form.append(checkLabel);}
 const values=()=>({...Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value])),basis:basis.value});
 for(const field of [...Object.values(fields),basis,checkbox]){field.addEventListener('input',()=>onChange?.(values(),checkbox.checked));field.addEventListener('change',()=>onChange?.(values(),checkbox.checked));}
 const save=el('button',submitText);save.type='submit';form.append(save);
 if(onCancel){const cancel=el('button','Abbrechen');cancel.type='button';cancel.addEventListener('click',onCancel);form.append(cancel);}
 form.addEventListener('submit',event=>{event.preventDefault();return onSubmit(values(),checkbox.checked);});
 target.append(form);return form;
}
