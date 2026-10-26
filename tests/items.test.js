import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateItem, ITEM_FAMILY_IDS } from '../src/engine/items/index.js';
import { predictNumeric } from '../src/engine/items/series.js';
import { markupToHtml, markupToPlain } from '../src/engine/items/markup.js';

const SEEDS = Number(process.env.SEEDS || 150);
const seeds = Array.from({ length: SEEDS }, (_, i) => `it-${i}`);

for (const family of ITEM_FAMILY_IDS) {
  for (const difficulty of [1, 2, 3, 4, 5, 6]) {
    test(`${family} d${difficulty}: ${SEEDS} seeds generate, reproduce, have one correct option`, () => {
      for (const seed of seeds) {
        const a = generateItem({ family, difficulty, seed });
        const b = generateItem({ family, difficulty, seed });
        assert.equal(JSON.stringify(a), JSON.stringify(b));
        assert.ok(a.options.length >= 4 && a.options.length <= 5);
        assert.equal(new Set(a.options).size, a.options.length, 'distinct options');
        assert.ok(a.correctIndex >= 0 && a.correctIndex < a.options.length);
        assert.equal(a.distractors.filter(Boolean).length, a.options.length - 1);
        assert.ok(a.explanation.summary && a.explanation.steps.length >= 1);
        assert.ok(a.hints.length >= 3);
        for (const s of [a.prompt, ...a.options, a.explanation.summary, ...a.explanation.steps, ...a.hints]) {
          assert.ok(typeof s === 'string' && !/undefined|NaN|\[object/.test(s), `clean text: ${s}`);
        }
        assert.ok(a.description.prompt.length > 10);
      }
    });
  }
}

test('number-series options admit exactly one in-grammar continuation', () => {
  for (const difficulty of [1, 2, 3, 4, 5]) for (const seed of seeds) {
    const it = generateItem({ family: 'series', difficulty, seed });
    if (it.features.rule === 'exponentPairs' || it.features.letters) continue;
    const terms = it.prompt.replace(' -- ...', '').split(' -- ').map(Number);
    const preds = predictNumeric(terms);
    assert.equal(preds.size, 1, `${it.id}: ${[...preds.keys()]}`);
    assert.equal(String([...preds.keys()][0]), it.options[it.correctIndex]);
  }
});

test('numeric equation fill: only the correct option satisfies the equation', () => {
  for (const seed of seeds) {
    const it = generateItem({ family: 'numeric', difficulty: 4, seed });
    if (it.features.rule !== 'equation-fill') continue;
    const m = it.prompt.match(/\((\d+) ÷ \?\) ÷ \((\d+) \+ \?\) = (\d+)/);
    assert.ok(m);
    const [n, k, r] = m.slice(1).map(Number);
    const ok = it.options.filter((o) => Math.abs((n / Number(o)) / (k + Number(o)) - r) < 1e-9);
    assert.equal(ok.length, 1);
    assert.equal(ok[0], it.options[it.correctIndex]);
  }
});

test('markup renders fractions and exponents', () => {
  assert.equal(markupToHtml('{frac 5/?} = {frac ?/20}'), '<span class="frac"><span class="frac-num">5</span><span class="frac-den">?</span></span> = <span class="frac"><span class="frac-num">?</span><span class="frac-den">20</span></span>');
  assert.equal(markupToHtml('3{sup 16}'), '3<sup>16</sup>');
  assert.equal(markupToPlain('3{sup 16}'), '3 to the power of 16');
  assert.equal(markupToHtml('<b>'), '&lt;b&gt;');
});
