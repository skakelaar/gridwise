# Adversarial review brief for a frontier model (Codex)

Copy everything below the line into a fresh Codex session opened on this repository. The brief is written
so that a reviewer with no prior context can audit the app end to end, is told exactly how the authors
checked it, and is pushed to disprove those checks rather than repeat them.

---

## Role

You are an adversarial reviewer. Another model (Claude) built this repository: Gridwise, a static
reasoning trainer. Your job is not to praise it. Your job is to find what is wrong, prove it with a
reproduction, and fix it without breaking anything the test suite protects. Assume every design decision
below may be mistaken, every "verified" claim may be over-stated, and every puzzle may admit a second
answer. Where you cannot find a defect, say so and show the evidence you gathered; do not pad.

## What the product is

A no-build static site (HTML, CSS, native ES modules; Node 26 only for tests and the dev server) that
generates original 3×3 abstract matrix puzzles and non-matrix aptitude items, explains every answer, and
tracks progress in `localStorage`. No backend, no accounts, no analytics, no network calls after load.
It is independent practice material: it must never claim affiliation with Assessio or Matrigma, reproduce
their items, or claim that results predict an official score.

Run it: `npm run serve` (port 8080). Tests: `npm test` (328 tests, ~6 s). Independent QA sweep:
`node tools/qa-report.js 200` writes `review/qa-report.md`. Visual gallery: `node tools/gallery.js`.

Read first, in this order: `README.md`, `docs/RULES.md`, `docs/CONTRACTS.md`, `docs/VERIFICATION.md`.
Then the engine: `src/engine/generate.js` (figure and set puzzles), `src/engine/global.js`
(whole-matrix families), `src/engine/composite.js` (figure plus attached marks), `src/engine/solver.js`
(in-grammar uniqueness solver), `src/engine/qa-solver.js` (rule-blind second solver),
`src/engine/items/*` (number series, logic, arithmetic, analogies, vocabulary, word problems).
Then the app: `src/app/main.js`, `ui.js`, `session.js`, `challenge.js`, `mocktest.js`, `storage.js`.

## How the authors checked it (so you can attack the checks, not just the code)

1. Every matrix puzzle is accepted only if the generator's uniqueness solver finds exactly one in-grammar
   prediction for every rule, plus a list of "extra readings" (one-of-each per row only, count arithmetic,
   copied rows and columns, diagonals, complements over the true palette and over the visible elements,
   rigid transformations of rows and columns, attribute couplings anchored on independently patterned
   attributes).
2. A second solver, `qa-solver.js`, reads only the eight visible cells and six options, with its own pattern
   library, and must agree with the intended answer on ≥99% of 200 seeds per family and level and must
   never find a second fully consistent option. Current sweep: 22 families × 6 levels, 100% agreement,
   0 ambiguous.
3. Distractors are built in "balanced clusters" so a per-attribute majority vote over the six options does
   not reveal the answer (probe hit rate ≤ a few percent per family; `review/qa-report.md` §5f).
4. Explanations and hints are generated from the same rule specification as the puzzle; a text checker
   verifies that the "missing cell" sentences name the answer's values and nothing absent.
5. Non-matrix items: series options are checked against a series solver that enumerates the series grammar;
   equation items accept only one satisfying option; logic items are valid by construction or by checking
   every consistent ordering; analogy distractors come from non-overlapping relation types.
6. The UI was exercised in a Chromium browser pane at desktop and 375 px widths; screen readers were not.

## Where to dig (ranked by where the authors expect to be wrong)

1. **Second answers the solvers both miss.** Both solvers share the same mental model (rows, columns, paths,
   tallies, sets, rigid transforms, couplings). Invent readings outside that model and test them over
   thousands of seeds: e.g. anti-diagonal rules, "cell = f(row index) ⊕ g(column index)" on orientation,
   parity rules on counts, "third cell = first XOR second" on figure attributes, mark sets read as a
   rotation of the previous cell's marks, path rules on attributes other than count, Latin-square readings
   on composite marks, and any reading in which a distractor is as consistent as the answer. A finding
   counts only if you show a concrete seed where a distractor is at least as lawful as the intended answer
   under a rule a careful test-taker would accept.
2. **Composite cells (`src/engine/composite.js`, newest code).** The figure layer and the mark layer are
   checked separately. Look for cross-layer leaks: can the marks be predicted from the figure's rotation
   (or vice versa) so that a "wrong-op" distractor is actually consistent under a coupled reading? Can the
   triangle (used while reflection is constant) make two options visually identical after rotation
   (`cellKey` canonicalisation)? Is the W-cluster recipe (`buildCompositeOptions`) ever degenerate so that
   the answer is the only option whose marks contain a given element?
3. **Whole-matrix families (`global.js`).** Path puzzles: is the gap ever predictable by a simpler row or
   column rule than the path rule, giving a different value? Invariant family: can noise accidentally form a
   column multiset? Composition: does the "wrong-member" distractor ever coincide with a valid nested chain?
   Mirrored rows at level 4+ scramble row 2: is there a seed where the scrambled row 2 is itself a
   transformation of row 1 that points to a different gap?
4. **Set puzzles and complements.** `neither` is read against the palette and against the elements actually
   seen. Find a seed where a human would read the universe differently (e.g. only the elements of the
   current line) and get another option.
5. **Non-matrix content.** Dispute the word bank (`src/engine/items/wordbank.js`): analogies with a
   second defensible relation, antonym items where the "trap" is a legitimate antonym, odd-one-out sets with
   two outliers, cloze sentences with two fitting words, logic items whose "none of these" is wrong because
   one conclusion is actually forced (or vice versa), series with a second simple continuation among the
   options, word problems with ambiguous wording (direction, inclusive counting, units). Generate hundreds of
   seeds per family and read them; do not trust the templates.
6. **Logical deduction, specifically (`src/engine/items/logic.js`, `tests/logic.test.js`).** The trainee has
   disputed these items, so audit them formally, not by eye. The repository already has a model-enumeration
   checker (class statements over a 3-element domain with and without existential import; conditionals by truth
   table; orderings by permutation). Extend it, then break it: (a) add a reading in which "some A are B" has no
   existential force and one in which "all A are B" implies "some A are B", and show every item still has
   exactly one entailed option; (b) check that no option merely restates a premise or its contrapositive in
   other words; (c) check the English: that "no A have B" and "all A have B" templates read as universal claims
   and not as generic tendencies, that "if … then" items are not read as biconditionals by a reasonable
   person (if they could be, propose wording that blocks it), and that the "none of these" option is phrased
   identically everywhere; (d) in orderings, verify that every named person appears in the statements, that
   folded sentences ("X is taller than Y, but shorter than Z") parse the way the generator intends, and that
   "second tallest" and "shortest" questions are computed from the right end; (e) check that the per-option
   "why this is tempting" notes name the actual fallacy (denying the antecedent, affirming the consequent,
   illicit conversion) and are never attached to the wrong option; (f) look for two items with the same
   template appearing consecutively in a mock or challenge and propose a seed-level variety guard.
7. **App state.** Timers that outlive their screen (`teardown` in `main.js`), attempts recorded twice,
   mock-test time accounting across reloads (`viewedAt`), `localStorage` exceptions, settings keys that drift
   from `DEFAULT_SETTINGS`, routes that redirect in loops, number-key shortcuts selecting a non-existent
   option, focus lost after answering, `aria-current` on the wrong nav item for sub-routes (`#/intro/logic`,
   `#/results/mistakes`, `#/mock/report/...`).
8. **Learn page accuracy.** Every guide tab (`src/app/content.js`: `INTRO_STEPS`, `ITEM_GUIDES`) states
   rules in prose and shows seeded examples. Check that each prose claim about an example is true of that
   exact seed (regenerate it) and that the method advice is not wrong (e.g. clock-angle arithmetic, percent
   change reversal, syllogism validity claims).
9. **Difficulty honesty.** Levels are claimed to be structurally monotone (`docs/RULES.md`). Measure
   something: rules in play, option similarity, solver confidence, time-to-solve proxies. Report any family
   where level n+1 is not harder than level n by your measure, and any level-6 puzzle that is trivially
   solvable by elimination (e.g. five options share a value the answer lacks).
10. **Claims and copy.** Find any sentence in the UI, README or docs that over-claims (prediction of scores,
   affiliation, "verified" statements not backed by a test) or that is now stale after the latest changes.
11. **Accessibility and robustness.** Keyboard-only full run of practice, mock, challenge and review;
    reduced-motion; dark mode contrast on hatched fills and composite marks; 320 px width; `file://`
    loading; JavaScript disabled; corrupted `localStorage` JSON.

## Rules of engagement

* Reproduce before you report. For engine findings give the family, difficulty and seed
  (`generatePuzzle({ family, difficulty, seed })` or `generateAny(spec)` from `src/engine/index.js`) and the
  competing reading in one sentence. For app findings give the route and the clicks or keys.
* Fix what you find. Keep the architecture (engine → render → app; explanations derived from the spec; both
  solvers extended in lockstep for any new reading). Add a regression test for every fix. `npm test` must
  stay green and `node tools/qa-report.js 200` must stay at 0 disagreements and 0 ambiguous.
* Do not widen the uniqueness check by weakening it. If a new reading is legitimate, add it to both
  `solver.js` and `qa-solver.js` and let the generator reject puzzles that fail it.
* Do not add dependencies, a build step, network calls, analytics or any affiliation claim.
* British spelling in UI copy. Explanations must come from the rule parameters, never hand-written per seed.
* Keep commits small and named by finding. End with a report: findings table (severity, file, seed or route,
  status), what you measured for difficulty, what you could not break and how hard you tried.

## Deliverable

1. A ranked findings list with reproductions and fixes applied (or a reason a fix was out of scope).
2. The updated test suite and QA report.
3. A short "residual risk" section: readings or behaviours you suspect but could not demonstrate.
