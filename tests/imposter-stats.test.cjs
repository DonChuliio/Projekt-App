const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('js/games/stats.js','utf8').replace('export ',''),ctx);
const people=[{name:'Alex',active:true},{name:'Berta',active:true},{name:'Chris',active:true},{name:'Entfernt',active:false}];
const history=[{winner:'imposter',host:'Chris',imposters:['Alex','Berta']},{winner:'players',host:'Berta',imposters:['Chris']},{winner:null,host:'Alex',imposters:['Berta']},{winner:'imposter',host:'Berta',imposters:['Alex']}];
assert.equal(JSON.stringify(ctx.imposterStats(people,history)),JSON.stringify([{name:'Alex',wins:2},{name:'Berta',wins:1},{name:'Chris',wins:0}]));
assert.equal(JSON.stringify(ctx.imposterStats(people,[])),JSON.stringify([{name:'Alex',wins:0},{name:'Berta',wins:0},{name:'Chris',wins:0}]));
console.log('PASS: only imposter wins, 1/2 imposter rounds, no ordinary/host/unscored wins, zero counts, stable ranking and removed draft participants excluded.');
