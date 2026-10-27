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

`FAMILY_IDS` contains 23 matrix families (see `src/engine/families.js` and `listFamilies()`),
including figure, set, composite and whole-matrix families. `GROUPS` contains seven rule groups.
`DIFFICULTY_LABELS` maps 1–6 to Basic, Intermediate, Advanced, Expert, Master and Grandmaster.
`generateAny(spec)` additionally dispatches six item families: series, logic, numeric, analogy, vocab, word.


### Puzzle object
```
id, seed, family, familyLabel, group, groupLabel, difficulty, difficultyLabel, attempt
kind            'figure' | 'set' | 'composite' | 'global' (generateAny also returns 'item')
cells[9]        cell objects, row-major; cells[8] is the hidden answer (never render it in the matrix)
options[6]      cell objects (answer choices, already shuffled deterministically)
correctIndex    0..5
distractors[6]  null at correctIndex; otherwise { index, code, text, attrs } — text is the misconception
                 phrased as a predicate, e.g. "copies the cell to the left of the gap"
rules[]         (figure) [{ attr, type, params, values[3][3], label }]; type 'const' = unchanged attribute
setRule         (set) { op, orientation:'row'|'col', palette:'lines'|'dots', opLabel, colOp?, framing? }
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
composite: { kind:'composite', shape, fill, rot:0..7, flip:0|1, parts:[ids from the 'parts' palette] }
scatter / multi / split: whole-matrix cell kinds, see src/engine/global.js
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
export const LEARN_TABS = [ { id, label } ];           // 'matrices' first; other ids key ITEM_GUIDES and route #/intro/<id>
export const ITEM_GUIDES = { [tabId]: { title, lead, steps:[{ title, body }], traps, examples:[{ family, difficulty, seed }], practise /* practiceFamily value */ } };
export const PRACTICE_MODES = { guided: {title, blurb}, untimed: {...}, timed: {...}, review: {...} };
export const TIMED_PRESETS = [ { id:'twelve', label:'12-minute practice (15 puzzles)', minutes:12, count:15, note:'...' }, ... ];
export const STATS_CAVEAT = '...';          // small-sample limitation text
export const PERSONALISATION_NOTE = '...';  // how the transparent heuristic works
export const LIMITATIONS = [ '...', '...' ]; // bullet strings
```

### `src/app/storage.js`, `src/app/session.js`, `src/app/ui.js`, `src/app/main.js`, `index.html`, `css/styles.css`
Owner: frontend packet. localStorage key prefix `mrt.`. Puzzle logic never lives in the app layer: the app only
calls `generateAny`/`generatePuzzle` and the render layer.

### Adaptive practice (transparent heuristic, labelled "practice personalisation")
Default off. When on: pick the next family with probability proportional to (1 + recent mistakes in that family),
and raise difficulty by one level after 3 consecutive correct answers at the current level, lower it after 2
consecutive mistakes. State this rule in the UI verbatim.


### Saved question snapshots — `src/app/replay.js`

Version 1 stores `{ version: 1, key, puzzle }` as `snapshot` on attempts, mistakes and assigned
session items. The puzzle is a detached JSON copy of the generated payload, including cells,
shuffled options, answer index, explanation, hints, distractor notes, accessible descriptions and
rule parameters. Diagnostic `verification` traces are omitted. Dot-set cells also retain their
`dotElements` order; partition cells retain their `lines`, so changes to engine-owned geometry
tables cannot reinterpret old diagrams. No executable HTML or generator is stored.

The content-derived key separates different questions generated from the same family/level/seed;
it is the attempt/mistake `puzzleId`. Its checksum detects accidental payload changes, not malicious
modification. `savedPuzzle(record)` returns detached data or `null`; `requireSavedPuzzle` throws
on unavailable data. Neither regenerates a seed, revalidates historical rules against a newer
solver, nor re-marks stored results. Stored labels and explanations belong to the original question.

Fixed timed and mock sessions snapshot every slot before first display. Challenges snapshot a slot
when its adaptive level is assigned; unassigned future slots are not historical questions. Session
records carry `snapshotVersion: 1`. Keep version-1 cell/render semantics and this reader compatible;
introduce a new version and reader for incompatible formats. Do not reinterpret version 1 or
silently migrate seed-only history using the current engine. Unknown versions and damaged snapshots
remain stored, but cannot be replayed. The app does not retain old executable engine versions.

Legacy attempts/mistakes and completed sessions remain in place, with recorded result, selection and
answer index (when present). The UI explicitly distinguishes unavailable questions from unassigned
challenge slots. Loading an unfinished session with missing/unsupported snapshots ends it with
`endedBy: 'unavailable'` before timeout catch-up or grading; answers and adaptive state are retained.
A legacy mock's pending attempt log uses its recorded metadata, never a regenerated answer key.

Snapshots are inline with their records, so saving a question and its result does not require a
second storage-key write. Existing retention limits (5,000 attempts, 20 reports of each kind; mistakes
until removed) remain. Browser quota can be reached before those maxima. Failed writes still use
memory and now show a visible warning on the next screen render. This does not provide durable
storage when the browser denies writes, or atomic transactions across the separate history keys.
