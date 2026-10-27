import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAny, generatePuzzle } from '../src/engine/index.js';
import { predictAttribute } from '../src/engine/solver.js';
import { solveIndependently } from '../src/engine/qa-solver.js';

test('split audit-18: row endpoints supply a second lawful answer', () => {
  const cells = [4,3,4,2,3,2,3,2,4].map(sections => ({kind:'split', sections, variant:'unused'}));
  const q = solveIndependently({cells,options:[cells[8],{...cells[8],sections:3}]});
  assert.equal(q.ambiguous,true);
  const p = predictAttribute({kind:'ordered',values:[1,2,3,4,5],steps:[1,-1],arith:true},[[3,2,3],[1,2,1],[2,1,null]]);
  assert.ok(p.has(2));
  for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<200;i++) {
    const p=generatePuzzle({family:'split',difficulty,seed:`audit-${i}`});
    assert.equal(solveIndependently(p).ambiguous,false,p.id);
  }
});

test('rotation audit-185: column angle addition gives a second fully consistent option', async () => {
  const {default:p}=await import('./fixtures/rotation-1-audit-185.json',{with:{type:'json'}});
  assert.equal(p.cells[8].rot,2);
  assert.equal(p.options[0].rot,1);
  assert.equal(solveIndependently(p).ambiguous,true);
  const predictions=predictAttribute({kind:'cyclic',values:[0,1,2,3,4,5,6,7],steps:[1,-1]},[[1,1,0],[2,2,1],[3,3,null]]);
  assert.ok(predictions.has(1)); assert.ok(predictions.has(2));
  const repaired=generatePuzzle({family:'rotation',difficulty:1,seed:'audit-185'});
  assert.equal(solveIndependently(repaired).ambiguous,false);
});


test('composite audit-0: reverse subtraction is a second answer, not a harmless weak reading', async () => {
  const {default:p}=await import('./fixtures/composite-1-audit-0.json',{with:{type:'json'}});
  const {reverseSetReadings}=await import('../src/engine/solver.js');
  const g=[0,3,6].map(i=>p.cells.slice(i,i+3).map(c=>c.parts));g[2][2]=null;
  assert.ok(reverseSetReadings('parts',g,p.options[5].parts).length);
  assert.equal(solveIndependently(p).ambiguous,true);
  const repaired=generatePuzzle({family:'composite',difficulty:1,seed:'audit-0'});
  assert.equal(solveIndependently(repaired).ambiguous,false);
});
