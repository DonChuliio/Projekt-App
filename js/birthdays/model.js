const DAY=86400000;
const leap=year=>year%4===0&&(year%100!==0||year%400===0);
const daysInMonth=(year,month)=>[31,leap(year)?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
export function birthdayInputDate(value,previous=''){
 const match=typeof value==='string'&&value.trim().match(/^(\d{2})\.?([0-9]{2})\.?$/);
 if(!match)throw Error('Bitte Tag und Monat als TTMM eingeben, zum Beispiel 2412.');
 const [,day,month]=match,old=birthdayDate(previous);
 if(old&&old.day===Number(day)&&old.month===Number(month))return previous;
 const result=`2000-${month}-${day}`;
 if(!birthdayDate(result))throw Error('Bitte einen gültigen Tag und Monat eingeben.');
 return result;
}
export function birthdayDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [year,month,day]=value.split('-').map(Number);
 return year>=1&&month>=1&&month<=12&&day>=1&&day<=daysInMonth(year,month)?{year,month,day}:null;
}
export function validateBirthday(value){
 const name=typeof value?.name==='string'?value.name.trim():'';
 if(!name||name.length>200)throw Error('Bitte einen Namen mit 1 bis 200 Zeichen eingeben.');
 if(!birthdayDate(value?.birth_date))throw Error('Bitte ein gültiges Geburtsdatum eingeben.');
 return {name,birth_date:value.birth_date};
}
// Local calendar parts, UTC arithmetic: DST must not turn one calendar day into 0 or 2 days.
function ordinal(year,month,day){const d=new Date(0);d.setUTCFullYear(year,month-1,day);d.setUTCHours(0,0,0,0);return d.getTime()/DAY;}
function occurrence(birth,year){return {year,month:birth.month,day:Math.min(birth.day,daysInMonth(year,birth.month))};}
export function nextBirthday(row,today=new Date()){
 const birth=birthdayDate(row?.birth_date);if(!birth||!Number.isFinite(today.getTime()))return null;
 const day=ordinal(today.getFullYear(),today.getMonth()+1,today.getDate());let next=occurrence(birth,today.getFullYear());
 if(ordinal(next.year,next.month,next.day)<day)next=occurrence(birth,today.getFullYear()+1);
 return {...row,nextDate:`${next.year}-${String(next.month).padStart(2,'0')}-${String(next.day).padStart(2,'0')}`,days:ordinal(next.year,next.month,next.day)-day};
}
export function orderedBirthdays(rows,today=new Date()){
 return rows.map(row=>nextBirthday(row,today)).filter(Boolean).sort((a,b)=>a.days-b.days||a.name.localeCompare(b.name,'de')||String(a.id).localeCompare(String(b.id)));
}
export function upcomingBirthdays(rows,today=new Date()){return orderedBirthdays(rows,today).filter(row=>row.days>=0&&row.days<=6);}
export function birthdayLabel(row){
 const birth=birthdayDate(row.birth_date);return birth?`${String(birth.day).padStart(2,'0')}.${String(birth.month).padStart(2,'0')}.`:'';
}
export function nextBirthdayLabel(row){const [,month,day]=row.nextDate.split('-');return `${day}.${month}. · ${row.days===0?'Heute':row.days===1?'In 1 Tag':`In ${row.days} Tagen`}`;}
