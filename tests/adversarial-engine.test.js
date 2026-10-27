import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAny, generatePuzzle } from '../src/engine/index.js';
import { predictAttribute } from '../src/engine/solver.js';
import { solveIndependently } from '../src/engine/qa-solver.js';
import { SERIES_RULES } from '../src/engine/items/series.js';

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

