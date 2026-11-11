export const NUTRIENTS=[['kcal','kcal'],['carbs','KH'],['protein','Eiweiß'],['fat','Fett']];
export const UNITS=[['g','g'],['kg','kg'],['ml','ml'],['l','l'],['piece','Stück']];
export const BASES=[['g','100 g'],['ml','100 ml'],['piece','1 Stück']];
export const basisLabel=basis=>BASES.find(([key])=>key===basis)?.[1]||'';
export const foodKey=value=>String(value||'').trim().toLocaleLowerCase('de').replace(/\s+/g,' ');
export function numberValue(value){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 const text=String(value).trim().replace(',','.');if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text))throw Error('Bitte eine gültige Zahl eingeben.');
 const n=Number(text);if(!Number.isFinite(n)||n<0||n>1000000)throw Error('Zahl außerhalb des gültigen Bereichs.');return n;
}
const units={g:'g',gr:'g',gramm:'g',kg:'kg',kilogramm:'kg',ml:'ml',milliliter:'ml',l:'l',liter:'l',stück:'piece',stueck:'piece',stk:'piece',st:'piece'};
export function parseIngredient(raw){
 const text=String(raw).trim(),unknown={raw:text,quantity:null,unit:'',name:text};
 const match=text.match(/^(\d+\s*\/\s*\d+|\d+(?:[.,]\d+)?)(\s*)(.*)$/);
 if(!match||/^\d{1,3}\.\d{3}$/.test(match[1])||/^(?:[-–—~x×/.,\d]|bis\b)/i.test(match[3]))return unknown;
 const [a,b]=match[1].split('/').map(part=>Number(part.replace(',','.'))),quantity=b===undefined?a:a/b;
 const rest=match[3].trim(),word=rest.match(/^([\p{L}]+)\.?\s*(.*)$/u),key=foodKey(word?.[1]),unit=Object.hasOwn(units,key)?units[key]:null;
 if(!Number.isFinite(quantity)||quantity<=0||quantity>1000000||!rest)return unknown;
 if(unit)return {raw:text,quantity,unit,name:word[2].trim()};
 if(!match[2]||/^(?:el|tl|esslöffel|teelöffel|prisen?|packung(?:en)?|pckg?|dosen?|becher|bund|scheiben?|handvoll|tassen?|tropfen|mg|cl|dl|oz|lb)$/.test(key))return {...unknown,name:word?.[2]?.trim()||rest};
 return {raw:text,quantity,unit:'piece',name:rest};
}
export function validateFood(value){
 const name=String(value.name||'').trim();if(!name||name.length>200)throw Error('Bitte einen Lebensmittelnamen eingeben (maximal 200 Zeichen).');
 if(!basisLabel(value.basis))throw Error('Bitte 100 g, 100 ml oder 1 Stück als Bezugsgröße wählen.');
 const nutrients=Object.fromEntries(NUTRIENTS.map(([key,title])=>{const n=numberValue(value[key]);if(n===null)throw Error(title+' fehlt. Bitte den Wert eintragen.');if(n>100000)throw Error(title+' ist zu groß.');return [key,n];}));
 return {name,basis:value.basis,...nutrients};
}
export function baseAmount(quantity,unit,food){
 const n=numberValue(quantity);if(n===null||n<=0)throw Error('Bitte eine Menge größer 0 eingeben.');
 if(!UNITS.some(([key])=>key===unit))throw Error('Bitte eine passende Einheit auswählen.');
 const basis=unit==='kg'?'g':unit==='l'?'ml':unit;
 if(basis!==food.basis)throw Error('Mengeneinheit und Bezugsgröße passen nicht zusammen. Bitte korrigieren.');
 return n*(unit==='kg'||unit==='l'?1000:1);
}
export function totalsFor(lines){
 return Object.fromEntries(NUTRIENTS.map(([key])=>[key,lines.length&&lines.every(line=>line.food[key]!=null)?lines.reduce((sum,line)=>sum+Number(line.food[key])*baseAmount(line.quantity,line.unit,line.food)/(line.food.basis==='piece'?1:100),0):null]));
}
export function perPortion(totals,portions){if(!Number.isInteger(portions)||portions<1||portions>2147483647)throw Error('Portionen müssen eine positive ganze Zahl sein.');return Object.fromEntries(NUTRIENTS.map(([key])=>[key,totals[key]==null?null:totals[key]/portions]));}
export const nutrientText=(value,key)=>value==null?'— (fehlt)':Number(value).toLocaleString('de-DE',{maximumFractionDigits:key==='kcal'?0:1})+(key==='kcal'?' kcal':' g');
