# Verification and limits

Current audit: 2026-10-27, Node 26.8.2, macOS, Chromium in-app browser. This page
replaces the accumulated historical counts; earlier claims remain in Git history.

## Reproducible checks

* `npm test`: **356 tests pass**, zero failures (9.30 seconds in the final run).
  The starting checkout passed 329 tests, not the 328 stated in the review brief.
* `node tools/qa-report.js 200`: **27,600 puzzles = 23 matrix families × 6 levels ×
  200 seeds**. See `review/qa-report.md` for actual results, structural checks and
  limitations of the option-voting probe.
* `node tools/adversarial-sweep.js 1000`: **138,000 matrices**, `audit-0` through
  `audit-999` at every family/level. Additional readings and difficulty proxies are
  recorded in `review/adversarial-measurements.json`; candidate hits need semantic
  review before being called defects.
* `SEEDS=1000 node --test tests/logic.test.js`: 6,000 generated logic items checked
  by class-model enumeration, conditional truth tables or ordering permutations.
  Class readings cross universal existential import on/off with ordinary “some”
  and a subject-empty-vacuous “some”. These are four specified semantics, not every
  possible interpretation of English. Contradiction notes and premise paraphrases
  are checked too.
* `node tools/item-audit.js 1000` records template counts from 36,000 generated items in `review/item-coverage.json`
  (six families × six levels × 1,000 seeds). This is generation coverage, not a
  claim that 36,000 texts received individual semantic review.
* `node tools/gallery.js` refreshes the visual gallery. No claim that every image
  in the refreshed gallery was individually inspected.

New regressions preserve original ambiguous puzzles in `tests/fixtures/`, check
series explanations/template reachability, logic fallacy notes and quantifiers,
word-choice and equivalent-time distractors, actual Learn example rendering,
corrupt storage, write/removal failures, URL decoding, submission deadlines,
mock reload accounting, repeated logic templates and option-only answer leaks.

## Browser evidence

On the isolated test origin `http://localhost:8081`:

* Six-question mock completed by keyboard, with a flag and reload. Selected answer,
  flag and remaining clock persisted. Finish required two presses. Five-option
  question ignored key 6. Report focus and Test navigation state were correct.
* Sixteen-question mixed challenge completed by number keys and Enter. Mistake
  review was retried by keyboard; focus moved to `feedback-title`.
* Results showed exactly 23 attempts: six mock + sixteen challenge + one retry.
* A running challenge was left for Learn for longer than its question deadline;
  its timer did not replace the Learn screen.
* `#/intro/logic`, `#/results/mistakes`, and `#/mock/report/...` highlighted Learn,
  Results, and Test respectively. Malformed `#/intro/%` originally threw an
  uncaught URIError; after the fix it shows Page not found.
* `review/browser-audit.html` embeds 320 px app viewports. Light and dark practice
  content measured 305 px wide after scrollbars, with scrollWidth also 305 px.
  Script-disabled iframe displayed the noscript message. Dark composite hatch,
  ring, dot, cross, square and bar were inspected: `review/browser-320-dark.png`.
  Foreground #ece6d8 on #16262a has a calculated contrast ratio of 12.55:1.

## Not verified / residual risk

* No real screen-reader session. DOM/AX inspection is not a screen-reader audit.
* Reduced-motion CSS disables animation/transitions and smooth scrolling, but
  an actual reduced-motion browser/OS setting was not exercised.
* Browser security policy rejected `file://` navigation. It was not bypassed.
  Native modules are documented to require an HTTP(S) origin.
* Other browser engines and a real 320 px device were not tested.
* No atomic multi-key persistence guarantee during a browser/process crash.
* Seeds are reproducible within a revision. Stronger rejection rules can change
  their generated puzzle. Old seed-only history cannot reconstruct the earlier
  cell/option snapshot; historical replay across engine updates remains a risk.
* A finite grammar and finite word bank audit cannot establish human uniqueness
  or psychometric difficulty. See `review/adversarial-review.md` for findings,
  competing interpretations, measured plateaus and the remaining uncertainty.
