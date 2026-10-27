import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateAny} from '../src/engine/index.js';

test('a definitional tautology is not offered as an irrelevant conclusion',()=>{
 const p=generateAny({family:'logic',difficulty:1,seed:'audit-12'});
 assert.ok(!p.options.includes('A glider pilot is a pilot'));
});
test('fallacy notes do not call a positive consequent denying the antecedent',()=>{
 let checked=0;
 for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<400;i++){
 const p=generateAny({family:'logic',difficulty,seed:`audit-${i}`});
 if(p.features.rule==='universal'&&p.prompt.split('\n')[1].includes(' is not ')){
 for(const d of p.distractors.filter(Boolean))if(!/does not|cannot| is not /.test(p.options[d.index]))assert.doesNotMatch(d.text,/denies the antecedent/,p.id);
 checked++;}
 if(p.features.rule==='conditional-chain')for(const d of p.distractors.filter(Boolean))assert.doesNotMatch(d.text,/the not |Mila not wakes/,p.id);
 }
 assert.ok(checked>20);
});
test('logic questions explicitly settle existential and one-way readings',()=>{
 for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<100;i++) {
 const p=generateAny({family:'logic',difficulty,seed:`audit-${i}`});
 if(p.prompt.includes('Some '))assert.match(p.question,/at least one/);
 if(p.prompt.startsWith('If '))assert.match(p.question,/one-way/);
 if(/^(All|No) /.test(p.prompt))assert.match(p.question,/without exceptions/);
 }
});

test('adjacent logic templates get a deterministic persisted seed variation',async()=>{
 const {avoidRepeatedLogicTemplate,puzzleFor}=await import('../src/app/session.js');
 const items=[1,2].map(i=>({family:'logic',difficulty:3,seed:`variety-${i}`}));
 assert.equal(puzzleFor(items[0]).features.rule,puzzleFor(items[1]).features.rule);
 avoidRepeatedLogicTemplate(items,1);
 assert.notEqual(puzzleFor(items[0]).features.rule,puzzleFor(items[1]).features.rule);
 const saved=JSON.parse(JSON.stringify(items));avoidRepeatedLogicTemplate(saved,1);
 assert.deepEqual(saved,items);
});
