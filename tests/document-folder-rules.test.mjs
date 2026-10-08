import assert from 'node:assert/strict';
import {allowsSubfolders,subfolderParents} from '../js/documents/folder-rules.js';
const folders=[{id:'other',default_key:'other',parent_id:null},{id:'housing',default_key:'housing',parent_id:null},{id:'a',parent_id:'other'},{id:'b',parent_id:'a'},{id:'legacy',parent_id:'housing'},{id:'fake',name:'Sonstiges',parent_id:null},{id:'cycle',parent_id:'cycle'}];
for(const id of ['other','a','b'])assert.equal(allowsSubfolders(folders,id),true);
for(const id of ['housing','legacy','fake','cycle',null,'missing'])assert.equal(allowsSubfolders(folders,id),false);
assert.deepEqual(subfolderParents(folders,new Set(['a','b'])).map(f=>f.id),['other']);
console.log('PASS: only stable Sonstiges subtree accepts subfolders; no roots, standard children, same-name impostors or cycles; descendant exclusion.');
