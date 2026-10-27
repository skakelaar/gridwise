import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generatePuzzle} from '../src/engine/index.js';
import {majorityPick} from '../tools/qa-report.js';

test('whole-matrix majority probe actually examines component counts',()=>{
 const cell=names=>({kind:'multi',items:names.map(shape=>({shape,fill:'none'}))});
 assert.equal(majorityPick({options:[cell(['circle','square','star']),cell(['square','star']),cell(['circle','star']),cell(['circle','square']),cell(['square','star','star']),cell(['circle','circle','star'])]}),0);
});
test('frozen invariant audit-0 reproduces the former component-vote leak',async()=>{
 const {default:p}=await import('./fixtures/invariant-6-audit-0.json',{with:{type:'json'}});
 assert.equal(majorityPick(p),p.correctIndex);
});
test('set distractor filtering cannot leave the answer alone in an element value',()=>{
 for(const family of ['addition','subtraction','contains','union','intersection','xor','neither'])for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<100;i++){
 const p=generatePuzzle({family,difficulty,seed:`audit-${i}`});
 for(const e of new Set(p.options.flatMap(o=>o.members)))assert.notEqual(p.options.filter(o=>o.members.includes(e)===p.cells[8].members.includes(e)).length,1,p.id+': '+e);
 }
});
test('invariant and composition answers are not exposed by per-component option voting',()=>{
 for(const family of ['invariant','composition'])for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<200;i++){
 const p=generatePuzzle({family,difficulty,seed:`audit-${i}`});
 assert.notEqual(majorityPick(p),p.correctIndex,p.id);
 }
});

test('mirrored rows cannot isolate the answer by reflection alone',()=>{
 for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<250;i++) {
 const p=generatePuzzle({family:'mirrorRows',difficulty,seed:`audit-${i}`});
 assert.ok(p.options.filter(o=>o.flip===p.cells[8].flip).length>1,p.id);
 }
});
