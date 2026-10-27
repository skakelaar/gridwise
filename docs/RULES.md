# Supported puzzle rules and difficulty

Every puzzle is a 3×3 matrix with the bottom-right cell missing and six answer options. Puzzles are generated
from a structured rule specification and a seed, then verified (see "Correctness" below).

## Two kinds of cell

**Figure cells** show one figure (or several copies of it) described by ten attributes:
shape, fill (hollow / solid / striped), size (small / medium / large), rotation (0–315° in 45° steps),
reflection (mirrored or not), number of copies (1–5), horizontal position and vertical position (3 slots each),
and, from level 3, an optional *inner shape* with its own *inner fill* drawn inside a hollow outer figure.
Rotation and reflection are only ever applied to three *chiral* shapes (flag, L shape, key) so that every
orientation looks different. Plain shapes (circle, square, triangle, diamond, pentagon, hexagon, star, plus)
are never rotated.

**Set cells** show a collection of elements from a fixed palette: seven line segments and a centre dot
("lines"), or a 3×3 grid of dots ("dots"). A set puzzle combines the first two cells of each row (or column)
into the third with one operation.

**Composite cells** (family `composite`, "Figure with marks") carry both at once: one medium chiral figure
(flag, L shape, key; a triangle while reflection stays constant) in the middle of the cell, and a set of up to
five small marks at fixed anchors around it (top-left dot, top-right ring, bottom-left cross, bottom-right
square, bottom bar). The figure follows attribute rules on one axis (rotation always; fill from level 2;
reflection from level 4; shape from level 5; the axis is rows up to level 3 and random after that) while the
marks combine on the other axis by a set operation (addition and union at level 1; subtraction from level 2;
intersection from level 3; exclusive-or from level 4; complement from level 5; levels 5–6 drop the easy
operations). A composite puzzle is accepted only when every figure attribute has exactly one in-grammar
prediction, no rigid-transformation reading of the rows or columns points elsewhere, and the marks admit
exactly one set reading. Distractors form two balanced clusters: the answer with one figure slip and one mark
slip, and the primary misconception (a wrong set operation, else a copied input cell) with the same two slips.

## Rule grammar (figure attributes)

Each attribute of a figure puzzle follows exactly one of these rules:

| Rule | Meaning |
|---|---|
| const | the attribute never changes |
| rowProg(step) | across each row the value increases by `step` (rotation wraps around); each row has its own starting value |
| colProg(step) | the same, down each column |
| grid(a, b) | the value progresses both down the columns (by `a`) and across the rows (by `b`) |
| latin | each row and each column contains each of three values exactly once (row *i* is row 0 shifted by *i*·dir) |
| rowAlt | across each row the value alternates A, B, A; every row is identical |
| colAlt | down each column the value alternates A, B, A |
| checker | A and B alternate in a checkerboard |
| coupled | (level 6) the attribute is a function of another attribute's value in the same cell |
| rowSum / colSum | (number of shapes, level 3+) the third cell of each row / column holds the first count plus the second |
| rowDiff / colDiff | (number of shapes, level 3+) the third cell holds the first count minus the second |

Rules on different attributes are independent and are simply superimposed. Progressions are only used on
ordered attributes (size, number, position, rotation); categorical attributes (shape, fill, reflection, inner
shape, inner fill) use latin, alternation or const. Number and position rules are never combined in one puzzle
(the copies of a figure use a fixed layout), and inner shapes only appear in single, hollow outer figures, so
an inner-shape rule is never combined with a number or outer-fill rule.

## Set operations

`add` (the two cells never overlap and the third contains everything), `subtract` (the second cell is part of
the first and is removed), `union`, `intersection`, `xor` (exclusive-or: elements in exactly one of the two),
`neither` (the positions that are empty in both cells; its complement reading is checked against both the full
palette and the elements that are actually visible).
The operation runs along rows (difficulty 1) or along rows or columns (difficulty 2–3). Generation forces the
two complete rows to rule out the other operations (for example union puzzles always have overlapping cells
so that exclusive-or gives a different result).

## Families

| Family | Group | Core rule |
|---|---|---|
| rotation | Rotation and reflection | rowProg / colProg / grid on rotation |
| reflection | Rotation and reflection | rowAlt / colAlt / checker on reflection |
| number | Number, size, position and fill | progression / grid / latin on the number of copies |
| size | Number, size, position and fill | progression / latin on size |
| position | Number, size, position and fill | progression / latin on horizontal or vertical position |
| fill | Number, size, position and fill | latin / alternation on fill |
| alternation | Alternation and cyclic sequences | rowAlt / colAlt / checker on fill, shape or size |
| cyclic | Alternation and cyclic sequences | latin (cyclic shift) on shape, fill or size |
| addition, subtraction | Addition and subtraction | set add / subtract |
| union, intersection, xor, neither | Union, intersection and exclusive-or | set operation; "neither" shows the positions empty in both cells (complement of the union) |
| combination | Combined rules | two or three rules drawn from the pool above |

## Calibration

The adaptive challenge starts at level 3, the mock-test tiers are Standard (2–3), Higher (4–5), Master (5–6)
and Mixed (2–6), "Mixed" practice draws mostly from levels 3–5, and practice personalisation starts at level 3.
Practice can run a clock of 30–90 seconds per question; a timeout is recorded as a mistake.

## Difficulty (structural, not psychometric)

Difficulty is defined only by structural features of the specification. It is **not** calibrated against any
population, does not estimate IQ or percentiles, and is not comparable with any official score.

| Level | Figure families | Combination family | Set families |
|---|---|---|---|
| 1 Basic | 1 rule (the family's core rule); rotation steps ≤ 90°; number steps of 1 | 2 rules | "lines" palette (7 elements), sets of 2–3, operation along rows |
| 2 Intermediate | core rule + 1 independent rule on another attribute; number steps up to 2 | 3 rules | lines or dots palette, sets of 2–4, rows or columns |
| 3 Advanced | core rule + 2 independent rules; rotation steps up to 135°; count arithmetic and inner shapes enter the pool | 3 rules, the first of which is a two-direction rule (grid or latin) | "dots" palette (9 elements), sets of 3–5, rows or columns |
| 4 Expert | core rule + 3 independent rules (four attributes change at once) | 4 rules, the first of which is a two-direction rule | "dots" palette, sets of 4–6, rows or columns |
| 5 Master | core rule + 4 independent rules (five attributes change at once, inner shapes and count arithmetic in the pool) | 5 rules, the first of which is a two-direction rule | "dots" palette, sets of 5–7, the "neither" (complement of the union) operation in the pool, and distractors that are mostly one-element near misses |
| 6 Grandmaster | five rules of which one is **coupled**: an attribute follows no row or column pattern of its own but is a fixed function of another attribute (e.g. small → solid, medium → hollow, large → striped) | 5 rules including a coupled one | union, intersection and exclusive-or puzzles become **two-way**: rows combine by one operation and columns by a different one, and the corner satisfies both; other set families as level 5 |

`puzzle.features` records the actual rule count, the rule types, whether a two-direction rule is present and
the largest step, so the UI and the tests can check the level against these definitions.

## Whole-matrix families

These families break the row-and-column habit: the rule runs over the matrix as a whole. Each has its own
readings-based solver, and a puzzle is accepted only when every consistent reading predicts the same cell.

| Family | What changes | Readings enumerated |
|---|---|---|
| path (Snake and spiral counts) | the number of markers follows a sequence along a path: row by row, as a snake, column-wise, or as a clockwise or anticlockwise spiral ending in the centre; constant step at levels 1–3, alternating steps (e.g. +2, −1) from level 3; at level 4+ the gap sits in the middle of a spiral | every path × constant step or alternating steps, plus the row/column count readings |
| split (Three of each) | boxes divided into 2, 3 or 4 sections by varied line patterns; each count appears exactly three times in the matrix | three-of-each; constant |
| invariant (Fixed set with noise) | every cell holds the same fixed multiset of shapes (2–4 types) plus 0–3 random noise shapes with no system | exact core counts; column/row multisets; composition grid |
| columnSet (Column sets) | every cell in a column holds the same multiset, positions random | column and row multisets |
| composition (Count and composition) | the number of shapes follows a grid rule and a cell with n shapes shows the first n of a fixed chain | count readings; nested chain plus grid |
| mirrorRows (Mirrored rows) | row 3 is row 1 mirrored (or rotated) cell by cell; row 2 is another transformation, scrambled from level 4 | row 3 or column 3 as a rigid transformation of row/column 1 or 2 |

Ordinary figure puzzles are also checked against the rigid-transformation readings, so a rotation puzzle
can never accidentally be read as "row 3 is row 2 flipped".

## Other question types (non-matrix)

Generated by `src/engine/items/`, with the same contract (seeded, reproducible, one correct option, named
distractors, explanation and hints). They build at levels 1–5 (level 6 reuses the level-5 forms). Each family
has a guide tab on the Learn page (`#/intro/<tab>`) whose worked examples are generated from fixed seeds, so the
guide text and the example can never drift apart.

| Family | Group | What is generated | Level ladder |
|---|---|---|---|
| series | Number series | 5–8 terms, "which comes next", numbers or letters | 1: constant step, ×2/×3, growing step, halving · 2: sum of previous two, alternating operations, squares, cubes, letter steps · 3: interleaved series, pairwise rules, alternating + and −, primes, growing letter gaps · 4: base/exponent pairs, growing differences, "double plus k", ×3/−k alternation, two-letter pairs · 5: differences that are squares or primes, digit-sum growth, three interleaved series, second-order recurrences, letter-and-square pairs |
| logic | Logical deduction | "Which statement logically and inescapably follows": universal affirmatives (all A have B), universal negatives (no A have B), conditionals (if … then …), chained syllogisms (all/some/no over three classes), and ordering problems; option pools include true-sounding but irrelevant statements | 1: direct application · 2: contrapositive, converse trap, negatives · 3: inverse traps, chains, 4-person orders · 4: chains with "some", 4–5-person orders that may be undetermined · 5: three-premise class chains, chained conditionals, 5–6-person orders asking for second or last place |
| numeric | Fractions and arithmetic | fraction equivalence, percentages, "p % of what", proportions, fraction addition/subtraction/multiplication/division, comparing fractions, equation filling with one unknown in two places or with two different unknowns (answer as a pair) | 1: equivalence, percent, ratio · 2: + fraction arithmetic, percent-of-what · 3: + comparing, multiply/divide, equation filling · 4: + two-unknown equations · 5: compound percentage changes, ratio sharing, powers and roots, mixed-number arithmetic |
| analogy | Verbal reasoning | "A is to B as C is to …" from a curated bank of 24 relation types and about 500 level-graded pairs (opposites, tools, producers, parts, homes, categories, degree, cause, function, collective nouns, specialists, young animals, workplaces, materials, players, sequence, agents, symptoms, units, containers, fields of study, gender pairs, animal sounds, derived adjectives) | the level picks the vocabulary tier of the pairs; at level 5 half the analogies are given in reverse direction |
| word | Applied problems | distance-and-direction journeys, salary before a percentage rise, clock-hand overlaps, combined work rates, speed and time, averages, age ratios; answers exact by construction | 1: speed, averages · 2: + reverse percentages · 3: + journeys, work rates · 4: + ages · 5: clock hands |
| vocab | Verbal reasoning | sentence completion from a bank of 46 contextual sentences (levels 3–5), nearest synonym, nearest antonym (with the opposite kind of word as a trap) over a 130-word graded bank, odd one out (four of a set plus an intruder from a confusable set, 32 sets) | 1 everyday words … 4 advanced (laconic, parsimonious, obdurate) · 5 rare (perspicacious, pusillanimous, vicissitude) |

Correctness for these items: number-series options are checked against a solver that enumerates every series
rule in the grammar above (plus arithmetic, geometric, second-difference, Fibonacci-like, linear-recurrence,
interleaved, alternating, pairwise and square readings) and are only accepted when exactly one continuation is
predicted; equation-filling items are accepted only when exactly one option satisfies the equation; logic
items decide validity by construction (universal templates) or by checking every consistent order; analogy
distractors come from other relation types whose vocabulary does not overlap, plus one word of the same
relation that pairs with a different first word.

## Correctness

For every generated puzzle:

1. **Unique within the grammar.** The solver in `src/engine/solver.js` enumerates every rule in the grammar
   above for every attribute (and every operation × orientation for set puzzles), keeps those consistent with
   the eight visible cells, and collects the values they predict for the missing cell. The puzzle is accepted
   only if every attribute has exactly one predicted value and it equals the intended answer. Readings outside
   the generator's grammar are enumerated too, so puzzles that admit them are rejected: a line that stays
   constant, "one of each" along rows only or columns only, "third = first + second", "first − second" and
   "|first − second|" for the number of shapes, row 3 copying row 1 or 2, column 3 copying column 1 or 2, and
   constant diagonals, and coupled readings (an attribute determined by another attribute that has a unique
   reading of its own, with the gap's source value already seen among the eight cells).
2. **Visually distinct options.** Options are compared after canonicalising orientation by each shape's
   symmetry group, so two options can never render identically.
3. **Distractors are misconceptions.** Each wrong option is built from one or two named mistakes (repeat the
   cell to the left, apply the step in the wrong direction, apply it twice, duplicate a value already used in
   the row, use union instead of intersection, leave out one element, …). The code and text are stored on the
   puzzle. The five distractors are arranged in balanced clusters so that the answer is never the per-attribute
   (or per-element) majority of the six options: comparing the options with each other, without reading the
   matrix, finds the answer less often than chance (measured in `review/qa-report.md`).
4. **Explanations from the same specification.** Explanation, hints and accessible descriptions are rendered
   from the rule objects that generated the cells, never written separately.
5. **Reproducible.** `generatePuzzle({family, difficulty, seed})` is a pure function of its arguments.
6. **Automated sweeps.** `npm test` regenerates 120 seeds for every family × difficulty and checks all of the
   above, and `tests/qa-solver.test.js` runs an independently written solver (`src/engine/qa-solver.js`, which
   reads only the eight cells and the options) over 200 seeds per family × difficulty, requiring agreement and
   no second fully consistent option.

What this does *not* guarantee: a finite matrix can always be explained by some other rule. Uniqueness is
checked within the supported grammar plus the listed extra readings, not against every imaginable pattern.
