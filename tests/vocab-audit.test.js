import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateAny} from '../src/engine/index.js';
test('data-entry cloze specifies monotony and excludes the demonstrated arduous alternative',()=>{
 let seen=0;
 for(let i=0;i<1000;i++) {
 const p=generateAny({family:'vocab',difficulty:3,seed:`audit-${i}`});
 if(p.features.rule==='cloze'&&p.options[p.correctIndex]==='tedious') {
 assert.match(p.prompt,/easy.*dull, unvarying/); assert.ok(!p.options.includes('arduous'),p.id); seen++;
 }
 }
 assert.ok(seen>10);
});
