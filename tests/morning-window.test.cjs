const fs=require('node:fs'),vm=require('node:vm'),a=require('node:assert/strict'),ctx={Date};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/morning/model.js','utf8').replace(/export /g,''),ctx);
for(const [date,end] of [[new Date(2026,11,31,8),'2027-01-02'],[new Date(2026,2,28,8),'2026-03-30'],[new Date(2026,9,24,8),'2026-10-26']])a.equal(ctx.morningEnd(date),end);
const rows=[{title:'Outside',reminder_date:'2027-01-03'},{title:'Two',reminder_date:'2027-01-02'},{title:'Late',reminder_date:'2026-12-31',reminder_time:'12:00'},{title:'Early',reminder_date:'2026-12-31',reminder_time:'08:00'},{title:'Tomorrow',reminder_date:'2027-01-01'},{title:'Past',reminder_date:'2026-12-30'}];
a.equal(ctx.morningReminders(rows,'2026-12-31','2027-01-02').map(r=>r.title).join(','),'Early,Late,Tomorrow,Two');
console.log('PASS: exact inclusive three-calendar-day reminder window, past/day3 exclusion, chronological time sorting, New Year and both DST boundaries.');
