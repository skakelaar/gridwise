# Interface contracts (shared by all work packets)

Stack: static HTML + CSS + native ES modules. No build step, no bundler, no runtime network access.
Node 26 runs the checks (`npm test`). `npm run serve` starts `tools/serve.js` on http://localhost:8080/.

## Engine API — `src/engine/index.js` (owner: root; frozen)

```js
import { generatePuzzle, listFamilies, randomSeed, FAMILIES, FAMILY_IDS, GROUPS, DIFFICULTY_LABELS,
         describeCell, cellKey } from './src/engine/index.js';
import { renderCell, renderMatrixPreview } from './src/render/svg.js';

const puzzle = generatePuzzle({ family: 'rotation', difficulty: 2, seed: 'abc123' });
```

`FAMILY_IDS`: rotation, reflection, number, size, position, fill, alternation, cyclic, addition,
subtraction, union, intersection, xor, combination.  `FAMILIES[id]` = `{ group, label, kind:'figure'|'set', ... }`.
`GROUPS[group].label` gives the six user-facing rule groups (orientation, change, sequence, arithmetic, set, combination).
`DIFFICULTY_LABELS` = `{1:'Basic', 2:'Intermediate', 3:'Advanced'}`.

### Puzzle object
```
id, seed, family, familyLabel, group, groupLabel, difficulty, difficultyLabel, attempt
kind            'figure' | 'set'
cells[9]        cell objects, row-major; cells[8] is the hidden answer (never render it in the matrix)
options[6]      cell objects (answer choices, already shuffled deterministically)
correctIndex    0..5
distractors[6]  null at correctIndex; otherwise { index, code, text, attrs } — text is the misconception
                 phrased as a predicate, e.g. "copies the cell to the left of the gap"
rules[]         (figure) [{ attr, type, params, values[3][3], label }]; type 'const' = unchanged attribute
setRule         (set) { op, orientation:'row'|'col', palette:'lines'|'dots', opLabel }
explanation     { summary, rows[], columns[], missing[], unchanged }  — plain sentences
hints[]         3+ progressively more specific hints; the last one states the rule but not the answer
description     { matrix: string, cells[9]: string, options[6]: string } — accessible text
features        structural difficulty features (ruleCount, rules, twoDirection, orientation, maxStep | palette, maxSetSize)
verification    solver output (predictions per attribute / set) for debugging and QA
```

### Cell objects
```
figure: { kind:'figure', shape, fill:'none'|'solid'|'hatched', size:'small'|'medium'|'large',
          rot:0..7 (×45° clockwise), flip:0|1, count:1..5, x:0..2, y:0..2 }
set:    { kind:'set', palette:'lines'|'dots', members:[element ids] }
```
`renderCell(cell, { size = 100, label = '', className = 'cell-svg' })` → SVG string. Pass `label` (use
`describeCell(cell)` or `puzzle.description.*`) for `role="img"`; without it the SVG is `aria-hidden`.
Shapes use `currentColor`; hollow fill uses CSS var `--cell-bg` (default white). Set `--cell-bg` on the cell container.

`renderMatrixPreview(puzzle, { cellSize, gap })` → one SVG of the 3×3 matrix with a "?" in the gap (home-page sample).

## App contracts

### `src/app/content.js` (owner: learning-experience packet)
```js
export const PRODUCT_NAME = 'Gridwise';
export const INDEPENDENCE_NOTICE = '...';   // short, one paragraph, plain text
export const INTRO_STEPS = [ { title, body /* HTML string, may include <p>, <ul>, <strong> */, example?: { family, difficulty, seed } } ];
export const PRACTICE_MODES = { guided: {title, blurb}, untimed: {...}, timed: {...}, review: {...} };
export const TIMED_PRESETS = [ { id:'twelve', label:'12-minute practice (15 puzzles)', minutes:12, count:15, note:'...' }, ... ];
export const STATS_CAVEAT = '...';          // small-sample limitation text
export const PERSONALISATION_NOTE = '...';  // how the transparent heuristic works
export const LIMITATIONS = [ '...', '...' ]; // bullet strings
```

### `src/app/storage.js`, `src/app/session.js`, `src/app/ui.js`, `src/app/main.js`, `index.html`, `css/styles.css`
Owner: frontend packet. localStorage key prefix `mrt.`. Puzzle logic never lives in the app layer: the app only
calls `generatePuzzle` and `renderCell`.

### Adaptive practice (transparent heuristic, labelled "practice personalisation")
Default off. When on: pick the next family with probability proportional to (1 + recent mistakes in that family),
and raise difficulty by one level after 3 consecutive correct answers at the current level, lower it after 2
consecutive mistakes. State this rule in the UI verbatim.
