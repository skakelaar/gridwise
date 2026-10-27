import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateAny, generatePuzzle } from '../src/engine/index.js';
import { predictAttribute } from '../src/engine/solver.js';
import { solveIndependently } from '../src/engine/qa-solver.js';
import { SERIES_RULES } from '../src/engine/items/series.js';

test('series next-step explanation agrees with the missing term, not the term after it', () => {
  const wanted = new Set(['growingStep','secondDiff','squareDiffs','primeDiffs']);
  const seen = new Set();
  for(const difficulty of [1,4,5])for(let i=0;i<200;i++){
    const p=generateAny({family:'series',difficulty,seed:`audit-${i}`});
    if(!wanted.has(p.features.rule))continue;
    seen.add(p.features.rule);
    const terms=p.prompt.split(' -- ').slice(0,-1).map(Number);
    const m=p.explanation.summary.match(/next (?:step|difference) is \+?(\d+)/);
    assert.ok(m,p.id);
    assert.equal(Number(m[1]),Number(p.options[p.correctIndex])-terms.at(-1),p.id);
  }
  assert.deepEqual(seen,wanted);
});

test('every advertised series template is reachable', () => {
  for(let difficulty=1;difficulty<=5;difficulty++) {
    const seen=new Set();
    for(let i=0;i<1000;i++)seen.add(generateAny({family:'series',difficulty,seed:`audit-${i}`}).features.rule);
    assert.deepEqual([...seen].sort(),[...SERIES_RULES[difficulty]].sort(),`level ${difficulty}`);
  }
});
