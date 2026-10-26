# Gridwise

**A matrix reasoning trainer.** 
Independent practice material for abstract matrix reasoning: 3×3 matrices with one missing cell and six answer
options, procedurally generated in the browser, with explanations, hints, timed sessions, mistake review and
local progress tracking.

This project is not affiliated with or endorsed by Assessio, does not reproduce Matrigma items, and does not
claim that practice results predict any official score.

## Run it

No build step and no dependencies. Serve the folder with any static file server:

```bash
npm run serve        # http://localhost:8080/  (node tools/serve.js [port])
```

or `python3 -m http.server 8080`, or open `index.html` through any web server. Opening the file directly from
disk does not work in most browsers because ES modules need an http(s) origin.

## Static hosting

Upload the whole folder (or at least `index.html`, `css/`, `src/`) to any static host — GitHub Pages, Netlify,
Cloudflare Pages, an S3 bucket, nginx. No server-side code, no environment variables, no external requests.
Paths are relative, so the site works from a sub-directory too.

## Checks

```bash
npm test             # generation sweep + independent QA solver (node:test)
SEEDS=500 npm test   # heavier sweep
node tools/gallery.js review/gallery.html 2   # visual review gallery of rendered puzzles
node tools/qa-report.js                       # writes review/qa-report.md
```

## Layout

```
index.html            single page application shell
css/styles.css        all styles (responsive, dark mode, reduced motion)
src/engine/           puzzle logic: rng, shapes (D8 symmetry), cells, rules, generate, solver, explain, text
src/render/svg.js     cell rendering (SVG, currentColor)
src/app/              UI, session state, storage, content
tests/                node:test suites
tools/                dev server, gallery, QA report
docs/RULES.md         supported rules, difficulty definition, correctness checks
docs/CONTRACTS.md     module interface contracts
docs/VERIFICATION.md  what was verified and known limitations
```

Puzzle logic never touches the DOM; the app layer only calls `generatePuzzle` and `renderCell`.

## Other question types

Besides matrices, Gridwise generates number series, logical deduction (syllogisms and ordering problems),
fractions, percentages and equation filling, and verbal analogies, all original and seeded. They appear in
practice (family filter "Everything" or "Other question types") and in the mixed challenge. See `docs/RULES.md`.

## Mock test

`#/mock`: a fixed set of questions (default 16 in 8 minutes, level tier Standard 1–2, Higher 3–4 or Mixed) on one
clock, with Previous/Next, "Save this question for later", a jump list, answers that can be changed, and
"I am finished". The report is the same as the challenge report (assessment, memorandum, explanations).

## Challenge

`#/challenge`: two formats, "12 matrices in 12 minutes" (60 s each, every rule group twice) and "16 mixed
questions in 8 minutes" (30 s each: eight matrices plus two each of number series, logic, arithmetic and
analogies). Difficulty follows
a stated 1-up/1-down staircase (start at level 2; correct → up one level, incorrect or timeout → down one level,
within 1–4). The report gives a plain-language assessment, a difficulty path, a memorandum of every answer
(your answer, the correct answer, result, time) and the full explanation of each puzzle. Finished challenges are
kept locally so their reports can be reopened. The format is practice only and does not reproduce any
publisher's adaptive algorithm, item bank, timing, scoring or norms.

## Difficulty levels

Five structural levels: Basic (one rule), Intermediate (two), Advanced (three, with count arithmetic and
inner shapes entering the pool), Expert (four rules changing at once; set puzzles with up to six elements) and
Master (five rules at once, complement set operations, two-level series, three-premise logic, compound
arithmetic, rare vocabulary and reversed analogies).
See `docs/RULES.md` for the exact definitions.
