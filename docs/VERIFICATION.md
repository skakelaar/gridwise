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
