# Verification summary and known limitations

Date: 2026-10-22 (updated the same day for the Expert level and the redesign). Environment: macOS, Node 26,
Chromium-based in-app browser.

## Automated checks (all passing)

`npm test` → 118 tests, 0 failures (about 4 s). Levels 1–4 are covered.

* `tests/generation.test.js` — for each of the 14 families × 3 difficulties × 120 seeds: generation succeeds,
  the result is byte-identical when regenerated from the same seed, exactly one option equals the hidden cell,
  all six options are visually distinct after orientation canonicalisation, every distractor carries a
  misconception code and text, the in-grammar solver predicts exactly one value per attribute (or one set),
  explanation/hint/description strings are non-empty and clean, every cell and option renders to SVG, and the
  recorded structural difficulty features match `docs/RULES.md`. Plus unit tests of the D8 orientation
  arithmetic and of the solver's rejection of a union/exclusive-or ambiguity.
* `tests/qa-solver.test.js` — an independently written solver that reads only the eight visible cells and the
  options (never the rule specification) agrees with the intended answer on 100% of 200 seeds per family ×
  difficulty, and finds no second option that is fully consistent under any of its readings.
* `node tools/qa-report.js 300` → `review/qa-report.md`: 16,800 puzzles (14 families × 4 levels × 300 seeds),
  16,800 agreements, 0 ambiguous, 0 identical option renderings, 0 explanation/value mismatches, 0 off-centre
  multi-shape cells. A "majority of the options" heuristic finds the answer in at most a few percent of puzzles
  in any family (chance 16.7%).
* Expert-level additions (inner shapes with their own fill, count arithmetic "third = first ± second", four
  simultaneous rules, set puzzles with up to six elements) are generated, solved independently and rendered in
  the same sweeps. A test asserts that inner shapes only occur in single hollow figures and never below level 3.
* The first Expert sweep exposed a distractor with an out-of-range count (an arithmetic misconception could
  leave the domain); the generator now rejects out-of-domain misconception values and a test checks every
  figure cell is well-formed.

Two classes of ambiguity found by the first QA sweep were fixed before delivery: progressions whose two complete
lines were identical admitted a "one of each per row" reading, and count progressions that coincided with
"third = first + second". Both readings are now enumerated by the uniqueness checker and such matrices are
regenerated.

## Browser verification (performed, in-app browser)

* Desktop (~1200 px) and mobile (375 px, no horizontal overflow): home with sample puzzle and independence
  notice, intro, guided practice, untimed practice, timed setup (12-minute preset labelled as a practice preset
  with its note), timed run, session summary, mistake review, progress, settings. No console errors.
* Keyboard only: Tab into the option group, arrow keys and number keys 1–6 select, Enter submits, focus moves to
  the feedback heading; hints reveal one at a time with "Hint k of n"; visible focus rings throughout.
* Feedback: correct/incorrect, completed matrix with row 3 and column 3 highlighted, explanation sections
  "Across each row", "Down each column", "How the missing cell follows", unchanged attributes, and
  "Why option N is tempting: it …" for the chosen distractor.
* Timed: 5 puzzles / 1 minute, answered by keyboard, deadline persisted (reload restores the remaining time from
  storage), auto-ends at 0:00 with "Time ran out", unanswered puzzles counted as unanswered, per-puzzle review
  links. "End session early" now needs a second press.
* Mistake review stores (family, difficulty, seed) only, regenerates the same puzzle, allows retry and
  "Mark as understood". Reset clears every `mrt.` key after a confirm step.
* Rendered puzzle gallery (`review/gallery.html`, one seed per family × difficulty) reviewed by eye for
  legibility and ambiguity; the QA packet hand-read a further 12 puzzles (see `review/qa-report.md`, section 6).

Bugs found and fixed during verification: Enter on a selected option re-selected instead of submitting; the
skip link's `#app` anchor was treated as a route ("Page not found"); a single Enter on "End session early"
discarded a session.

## 12-in-12 challenge (added 2026-10-24)

* `tests/challenge.test.js` covers the slot design (every group twice), the staircase bounds (1–4, start at 2),
  timeouts counting as misses, catch-up of elapsed timeouts after a reload, and the report figures.
* Browser run-through: start, answer by keyboard, a puzzle left to time out (recorded as timed out, level
  stepped down, next puzzle started automatically), reload mid-challenge resumed the current puzzle with the
  right remaining time, "End session early" (two presses) produced the report: assessment text, difficulty path,
  group table, memorandum with your/correct answers, and an expandable explanation for every puzzle. A crash on
  unreached puzzles in the report was found this way and fixed.

## Other question types and mixed challenge (added 2026-10-26)

* `tests/items.test.js`: 4 families × 4 levels × 150 seeds generate, reproduce byte-for-byte, have 4–5 distinct
  options with one correct answer, named distractors, explanation and hints; number-series items admit exactly
  one in-grammar continuation; equation-filling items have exactly one satisfying option; markup renders.
* `tests/challenge.test.js`: mixed format has 16 slots (8 matrices, 2 of each other group), 30 s each, 8 minutes.
* Browser: practice with each question type (prompt, text options, keyboard, feedback), a 16-question mixed
  challenge answered through to the report, item answer keys with fractions rendered, progress by group.

## Richer question bank and mock test (added 2026-10-26)

* Verbal: 19 analogy relations with level-graded pairs, a 50-entry vocabulary bank (synonym/antonym with a
  trap of the opposite kind) and 15 odd-one-out sets; near-synonym clusters are merged so distractors never
  come from a neighbouring meaning; a bank check lists words shared across relations and the analogy builder
  rejects any distractor that pairs with the third word anywhere in the bank.
* Logic: universal negatives, conditionals (four inference patterns, two invalid), chained syllogisms and
  4–5-person ordering problems; option pools include plausible-but-irrelevant statements.
* Series: letters, cubes, primes, halving, ×3/−k alternation and two-letter pairs, all covered by the solver
  used in the uniqueness test. Arithmetic: proportions, percent-of-what, fraction multiply/divide, comparing
  fractions, two-unknown equations verified by evaluation.
* Mock test: `tests/mocktest.test.js` covers balanced slots, tier levels, navigation, flags, changed answers,
  time accounting and the report; in the browser an 8-question test was run with flagging, jumping, changing an
  answer, finishing early and reading the report (one crash on the report title fixed).

## Master level (added 2026-10-26)

* Matrices: five simultaneous rules, the "neither" set operation with sets of 5–7 on the dot palette, near-miss
  distractors. The uniqueness solver gained complement readings against both the true palette and the visible
  elements; the independent QA solver gained the same readings. One addition puzzle that admitted an
  "everything except what both share" reading over the visible elements was caught by the QA sweep and is now
  rejected by the generator.
* Items: six new series rules (all covered by the series solver), three-premise and chained-conditional logic,
  five- and six-person orderings asking for second or last place, compound percentages, ratio sharing, powers and
  roots, mixed numbers, 40 rare vocabulary entries, level-5 analogy pairs and reversed analogies, seven more
  odd-one-out sets.
* All sweeps run over levels 1–5 (matrix QA sweep: 15 families × 5 levels × 300 seeds).

## Grandmaster level and consolidated navigation (added 2026-10-26)

* Coupled attribute rules: generated at level 6, verified by both solvers with the rule that a coupling may only
  lean on an attribute with an independent reading and must be fixed by the eight visible cells. The first QA
  sweep caught a mutual-coupling loophole (two attributes each "explained" by the other) which is now closed.
* Two-way set puzzles (different operations along rows and columns, corner satisfying both) are found by search
  and verified by the existing operation hypotheses; a test asserts every union/intersection/xor puzzle at
  level 6 is two-way.
* Navigation consolidated to Learn / Practise / Test / Results / Settings; hints are a toggle inside Practise;
  the three test formats share a switcher; Results has Progress, Mistakes and Reports tabs; old routes redirect.
  Checked in the browser at desktop and 375 px (no horizontal overflow) after a spacing pass.

## Whole-matrix families, applied problems, recalibration (added 2026-10-26)

* Six whole-matrix families with readings-based solvers; the independent QA solver gained its own path,
  distribution, multiset, composition and rigid-transformation readings. Two real findings from the sweep were
  fixed: ordinary figure puzzles could be read as a rigid transformation of another row or column (now checked
  in the generator), and the "fixed set" reading was too permissive for count-grid puzzles.
* Applied word problems and 46 sentence-completion items; all answers exact by construction.
* Calibration: challenge starts at level 3, mock tiers shifted up, mixed practice weighted to levels 3–5,
  personalisation starts at level 3, optional practice clock with timeouts logged as mistakes.
* 304 tests pass; matrix QA sweep over 21 families × 6 levels.

## Composite cells and the Learn guides (added 2026-10-27)

* New `composite` family (figure rules on one axis, mark sets on the other) with its own generator
  (`src/engine/composite.js`), uniqueness checks on both layers, a rigid-transformation guard shared through
  `shapes.js`, a two-cluster distractor recipe, and a QA-solver evaluator that reads the figure and the marks
  independently. Sweep: 200 seeds × 6 levels, 100% agreement, 0 ambiguous, majority-vote probe 0.8%.
* Learn page split into tabs: the matrices method (now eight steps, the last on two-layer cells) and one guide
  per non-matrix group with method steps, traps and seeded worked examples rendered from the engine.
* 328 tests pass; matrix QA sweep over 22 families × 6 levels (27,600 puzzles).

## Logical deduction audit and app-layer fixes (added 2026-10-27)

* `tests/logic.test.js` checks every generated logic item formally: class statements by enumerating all models
  over a three-element domain, with and without existential import; conditionals by truth table; orderings by
  permutation. The intended answer must be entailed and no other option may be. The first run found and the
  generator now prevents: a premise restated as an option; "some C are B" offered beside "some A are C" when
  both follow; the intermediate consequence offered beside the final one in two-rule chains; ordering items
  naming a person who never appears in the statements; a malformed superlative ("lightesti").
* Every logic distractor now carries a note naming the actual slip (denying the antecedent, affirming the
  consequent, reversed rule, contradicts a premise, not forced), shown as "why this option is tempting".
* App-layer review fixed: reset not clearing an in-memory challenge or mock test; the practice clock running
  while the puzzle was off screen; a countdown firing its end callback twice; skipped timed puzzles described
  as mistakes; a false "every rule group twice" claim; a six-option message on four-option items; blank group
  labels for non-matrix mistakes; an expired timed drill with no way back to its summary; a dead history entry
  from the skip link; non-atomic mock finalisation; Enter doing nothing on the last mock question.
* Item-bank audit (independent reviewer, 6 families × 6 levels × 150 seeds, answers recomputed from the
  prompts): series, logic, numeric and word arithmetic were mechanically clean. Semantic defects fixed: the
  "same relation, different first word" analogy distractor was often a second defensible answer (a second unit,
  collective noun, symptom or workplace), so it is gone and no word of the same relation is ever offered;
  eleven word-bank pairs corrected or replaced; sentence-completion distractors now respect kin clusters and
  per-sentence exclusion lists, and five weak sentences were tightened; word problems never offer zero or
  negative amounts; fraction items show inputs in lowest terms and never two options of equal value; three
  odd-one-out sets lost a disputable member.
* 329 tests pass.

## Not verified

* Real screen-reader output (ARIA roles, labels and live regions were checked in the DOM only).
* Loading from `file://` (ES modules need an http(s) origin; use any static server).
* Browsers other than the Chromium-based in-app browser.

## Known limitations

* Uniqueness is checked within the supported rule grammar plus the extra readings listed in `docs/RULES.md`,
  not against every imaginable pattern. A finite matrix can always be explained by some other rule.
* Difficulty is structural (rule count, two-direction rules, step size, palette and set size). It is not
  psychometrically calibrated and does not estimate IQ, percentiles or any official score.
* Addition puzzles are also valid unions and subtraction puzzles are also valid exclusive-ors on the visible
  evidence; the explanation states the equivalence.
* Five small copies of a chiral shape (number × rotation at difficulty 2–4) are visually demanding, and
  Expert puzzles with four rules are deliberately dense.
* The redesign uses system font stacks (no bundled fonts), so typography varies slightly across platforms.
* Progress statistics come from small samples; the UI says so. Practice personalisation is a stated heuristic,
  not an ability estimate.
* All data stays in the browser's local storage; clearing site data clears progress.
