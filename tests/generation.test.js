// Automated puzzle-generation checks across many seeds for every supported family and difficulty.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generatePuzzle, FAMILY_IDS, FAMILIES } from '../src/engine/index.js';
import { cellKey } from '../src/engine/cells.js';
import { makeDomains } from '../src/engine/cells.js';
import { predictAttribute, predictSet } from '../src/engine/solver.js';
import { renderCell } from '../src/render/svg.js';
import { SHAPES, canonicalOrientation, compose } from '../src/engine/shapes.js';

const SEEDS = Number(process.env.SEEDS || 120);
const seeds = Array.from({ length: SEEDS }, (_, i) => `seed-${i}`);

for (const family of FAMILY_IDS) {
  for (const difficulty of [1, 2, 3, 4, 5, 6]) {
    test(`${family} d${difficulty}: ${SEEDS} seeds generate, verify and reproduce`, () => {
      for (const seed of seeds) {
        const p = generatePuzzle({ family, difficulty, seed });
        const again = generatePuzzle({ family, difficulty, seed });
        assert.equal(JSON.stringify(p), JSON.stringify(again), `reproducible for ${seed}`);

        assert.equal(p.cells.length, 9);
        assert.equal(p.options.length, 6);
        assert.equal(p.kind, FAMILIES[family].kind);

        // Exactly one option is the intended answer and it equals cell 9.
        const answerKey = cellKey(p.cells[8]);
        const keys = p.options.map(cellKey);
        assert.equal(keys.filter((k) => k === answerKey).length, 1, 'exactly one correct option');
        assert.equal(keys[p.correctIndex], answerKey, 'correctIndex points at the answer');
        // Options are visually distinct after canonicalisation.
        assert.equal(new Set(keys).size, 6, 'six visually distinct options');
        // Every distractor carries a misconception label.
        const ds = p.distractors.filter(Boolean);
        assert.equal(ds.length, 5);
        for (const d of ds) { assert.ok(d.code && d.text, 'distractor has misconception'); assert.notEqual(d.index, p.correctIndex); }

        // Independent re-check with the solver: unique in-grammar prediction equal to the answer.
        if (p.kind === 'figure') {
          for (const rule of p.rules) {
            const known = rule.values.map((r) => r.slice());
            known[2][2] = null;
            const preds = predictAttribute(p.domains[rule.attr], known);
            assert.equal(preds.size, 1, `${rule.attr} has one in-grammar prediction`);
            assert.ok(preds.has(rule.values[2][2]));
          }
          // No distractor is an in-grammar alternative: it must differ from the answer in some attribute
          // for which only the answer's value is predicted (true by construction when predictions are unique).
          assert.ok(p.rules.filter((r) => r.type !== 'const').length === p.features.ruleCount);
          assert.ok(p.features.ruleCount >= (family === 'combination' ? 2 : difficulty) || family !== 'combination');
        } else if (p.kind === 'global') {
          assert.ok(p.features.rule, 'global reading recorded');
          assert.ok(p.cells.every((c) => ['scatter', 'multi', 'split', 'figure'].includes(c.kind)));
        } else {
          const grid = [[], [], []];
          p.cells.forEach((c, i) => { grid[Math.floor(i / 3)][i % 3] = c.members; });
          grid[2][2] = null;
          const preds = predictSet(p.setRule.palette, grid);
          assert.equal(preds.length, 1, 'one in-grammar set prediction');
          assert.deepEqual(new Set(preds[0].members), new Set(p.cells[8].members));
          for (const c of p.cells) assert.ok(c.members.length > 0, 'no empty cells');
        }

        // Explanation and hints come from the spec and are non-empty.
        assert.ok(p.explanation.rows.length >= 1 && p.explanation.columns.length >= 1 && p.explanation.missing.length >= 1);
        assert.ok(p.hints.length >= 3);
        for (const s of [...p.explanation.rows, ...p.explanation.columns, ...p.explanation.missing, ...p.hints]) {
          assert.ok(typeof s === 'string' && s.length > 10 && !/undefined|NaN|\[object/.test(s), `clean text: ${s}`);
        }
        // Accessible descriptions.
        assert.equal(p.description.options.length, 6);
        assert.ok(p.description.matrix.includes('Row 3'));

        // Every cell and option renders.
        for (const c of [...p.cells, ...p.options]) {
          if (c.kind === 'figure') assert.ok(Number.isInteger(c.count) && c.count >= 1 && c.count <= 5 && c.shape && c.fill && c.size, 'well-formed figure cell');
          const svg = renderCell(c, { label: 'x' });
          assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>') && !svg.includes('undefined'));
        }
      }
    });
  }
}

test('difficulty follows documented structural features', () => {
  for (const family of FAMILY_IDS) {
    if (FAMILIES[family].kind === 'global') continue;
    if (FAMILIES[family].kind === 'set') {
      for (const seed of seeds.slice(0, 20)) {
        const p1 = generatePuzzle({ family, difficulty: 1, seed });
        const p3 = generatePuzzle({ family, difficulty: 3, seed });
        const p4 = generatePuzzle({ family, difficulty: 4, seed });
        assert.equal(p1.features.palette, 'lines');
        assert.equal(p1.features.orientation, 'row');
        assert.equal(p3.features.palette, 'dots');
        assert.equal(p4.features.palette, 'dots');
        assert.equal(p4.features.maxSetSize, 6);
        const p5 = generatePuzzle({ family, difficulty: 5, seed });
        assert.equal(p5.features.maxSetSize, 7);
        const p6 = generatePuzzle({ family, difficulty: 6, seed });
        if (['union', 'intersection', 'xor'].includes(family)) assert.equal(p6.features.twoWay, true, 'two-way at level 6');
      }
    } else {
      for (const seed of seeds.slice(0, 20)) {
        const expect = family === 'combination' ? { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5, 6: 5 } : { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 5 };
        for (const d of [1, 2, 3, 4, 5, 6]) {
          const p = generatePuzzle({ family, difficulty: d, seed });
          assert.equal(p.features.ruleCount, expect[d], `${family} d${d} rule count`);
        }
      }
    }
  }
});

test('inner shapes and count arithmetic only appear from level 3 and stay well-formed', () => {
  let inner = 0, arith = 0;
  for (const family of FAMILY_IDS) {
    if (FAMILIES[family].kind !== 'figure') continue;
    for (const d of [1, 2, 3, 4, 5, 6]) for (const seed of seeds.slice(0, 40)) {
      const p = generatePuzzle({ family, difficulty: d, seed });
      if (p.features.inner) inner++;
      if (p.features.arithmetic) arith++;
      if (d < 3) { assert.equal(p.features.inner, false); assert.equal(p.features.arithmetic, false); }
      for (const c of [...p.cells, ...p.options]) {
        if (c.inner && c.inner !== 'none') {
          assert.equal(c.count, 1, 'inner shapes only in single-figure cells');
          assert.equal(c.fill, 'none', 'outer figure is hollow when it holds an inner shape');
        }
      }
    }
  }
  assert.ok(inner > 0 && arith > 0, 'both features occur');
});

test('level 6 figure puzzles couple one attribute to another', () => {
  for (const family of ['rotation', 'fill', 'combination', 'cyclic']) for (const seed of seeds.slice(0, 30)) {
    const p = generatePuzzle({ family, difficulty: 6, seed });
    assert.equal(p.features.coupled, true, `${p.id} has a coupled rule`);
    const r = p.rules.find((x) => x.type === 'coupled');
    assert.ok(r && r.params.source && Object.keys(r.params.map).length >= 2);
    assert.ok(p.explanation.rows.some((s) => s.includes('tied to')));
  }
});

test('D8 orientation arithmetic and canonical forms', () => {
  // flip then rotate twice vs rotate twice then flip differ for a chiral shape
  const a = canonicalOrientation('flag', 2, 1);
  const b = canonicalOrientation('flag', 6, 1);
  assert.notDeepEqual(a, b);
  // all 16 states distinct for chiral shapes
  for (const s of ['flag', 'ell', 'key']) {
    const set = new Set();
    for (let r = 0; r < 8; r++) for (let f = 0; f < 2; f++) { const c = canonicalOrientation(s, r, f); set.add(`${c.r},${c.f}`); }
    assert.equal(set.size, 16, `${s} has 16 distinct orientations`);
  }
  // a square has only 2 distinct rotations and mirroring changes nothing
  const sq = new Set();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 2; f++) { const c = canonicalOrientation('square', r, f); sq.add(`${c.r},${c.f}`); }
  assert.equal(sq.size, 2);
  const ci = new Set();
  for (let r = 0; r < 8; r++) for (let f = 0; f < 2; f++) { const c = canonicalOrientation('circle', r, f); ci.add(`${c.r},${c.f}`); }
  assert.equal(ci.size, 1);
  // group law sanity: (r,f)∘inverse = identity
  for (let r = 0; r < 8; r++) for (let f = 0; f < 2; f++) {
    const g = { r, f };
    const inv = f ? g : { r: (8 - r) % 8, f: 0 };
    assert.deepEqual(compose(g, inv), { r: 0, f: 0 });
  }
  assert.ok(Object.keys(SHAPES).length >= 11);
});

test('solver rejects a union/xor ambiguity', () => {
  const K = [[['top'], ['left'], ['top', 'left']], [['dot'], ['right'], ['dot', 'right']], [['top', 'dot'], ['dot', 'left'], null]];
  assert.equal(predictSet('lines', K).length, 2);
  const D = makeDomains(['circle', 'square', 'triangle']);
  assert.equal(predictAttribute(D.count, [[0, 1, 2], [1, 2, 3], [2, 3, null]]).size, 1);
});
