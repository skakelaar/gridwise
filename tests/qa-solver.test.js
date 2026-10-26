// Independent-solver challenge: for every family × difficulty, generate many puzzles, solve them with the
// rule-blind QA solver (src/engine/qa-solver.js) and compare with the intended answer.
//
// The solver never looks at puzzle.rules / setRule / correctIndex / explanation / verification / distractors.
// Two assertions per family × difficulty:
//   1. agreement (solver's pick === correctIndex) is at least 99%;
//   2. no puzzle admits a second option that is fully consistent under a strong reading (ambiguous === true).
// These tests are deliberately honest: known engine weaknesses make some of them fail. The failure message names
// the puzzle ids and the competing reading; review/qa-report.md documents the classes and proposed fixes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, FAMILY_IDS } from '../src/engine/index.js';
import { solveIndependently } from '../src/engine/qa-solver.js';

const SEEDS = Math.max(200, Number(process.env.SEEDS || 200));
const seeds = Array.from({ length: SEEDS }, (_, i) => `qa-${i}`);

const FORBIDDEN = ['rules', 'setRule', 'correctIndex', 'explanation', 'verification', 'distractors', 'hints', 'description', 'features', 'domains'];

// Strip everything the solver is not allowed to see, so a regression in the solver cannot cheat.
function blind(puzzle) {
  const p = { cells: puzzle.cells.map((c, i) => (i === 8 ? null : c)), options: puzzle.options };
  for (const k of FORBIDDEN) assert.equal(k in p, false);
  return p;
}

test('qa-solver returns the documented shape', () => {
  const p = generatePuzzle({ family: 'rotation', difficulty: 1, seed: 'qa-0' });
  const s = solveIndependently(blind(p));
  assert.ok(Number.isInteger(s.index) && s.index >= 0 && s.index < 6);
  assert.ok(typeof s.confidence === 'number' && s.confidence > 0 && s.confidence <= 1);
  assert.ok(Array.isArray(s.reasons) && s.reasons.length >= 1);
  assert.equal(typeof s.ambiguous, 'boolean');
  assert.ok(Array.isArray(s.candidates) && s.candidates.includes(s.index));
});

test('qa-solver does not need the hidden answer cell', () => {
  for (const family of FAMILY_IDS) {
    const p = generatePuzzle({ family, difficulty: 2, seed: 'qa-1' });
    const a = solveIndependently(p);
    const b = solveIndependently(blind(p));
    assert.deepEqual(a.candidates, b.candidates, family);
    assert.equal(a.index, b.index, family);
  }
});

for (const family of FAMILY_IDS) {
  for (const difficulty of [1, 2, 3, 4, 5]) {
    test(`${family} d${difficulty}: independent solver agrees on ≥99% of ${SEEDS} seeds and finds no second consistent option`, () => {
      let agree = 0;
      const disagreements = [];
      const ambiguous = [];
      for (const seed of seeds) {
        const p = generatePuzzle({ family, difficulty, seed });
        const s = solveIndependently(blind(p));
        if (s.index === p.correctIndex) agree++;
        else disagreements.push(`${p.id}: chose ${s.index}, intended ${p.correctIndex}; ${s.reasons[0].slice(0, 160)}`);
        if (s.ambiguous) {
          const others = s.candidates.filter((i) => i !== p.correctIndex);
          ambiguous.push(`${p.id}: options ${others.join(',')} also fully consistent (intended ${p.correctIndex}); ${s.reasons.find((r) => r.startsWith('also')).slice(0, 220)}`);
        }
        // The intended answer must itself be fully consistent under a strong reading; otherwise the solver's
        // pattern library is missing something and the rest of the numbers would be meaningless.
        assert.equal(s.evaluations[p.correctIndex].level, 'strong', `${p.id}: intended answer is not strongly consistent: ${s.reasons[0]}`);
      }
      const rate = agree / SEEDS;
      assert.ok(rate >= 0.99, `agreement ${agree}/${SEEDS} (${(rate * 100).toFixed(1)}%) below 99%:\n  ${disagreements.join('\n  ')}`);
      assert.equal(ambiguous.length, 0, `${ambiguous.length} puzzles admit a second fully consistent option:\n  ${ambiguous.join('\n  ')}`);
    });
  }
}
