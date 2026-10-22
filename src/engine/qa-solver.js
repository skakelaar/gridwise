// Independent QA solver.
//
// This solver deliberately knows nothing about the generator's rule specification. It only looks at the
// eight visible cells and the six options, exactly as a person would. Approach (different from solver.js,
// which enumerates the generator grammar on the eight known cells and *predicts* a value):
//
//   1. Plug each option into the gap to get a completed 3×3 grid.
//   2. For every visually observable attribute (figure: shape, fill, size, count, orientation, position;
//      set: the member set) test the completed grid against a library of pattern predicates.
//      Patterns are split into "strong" readings (global regularities a person would accept as *the*
//      rule: constant rows/columns, same arithmetic step in every row/column, one-of-each per row and
//      column, alternation, checkerboard, row/column sums for counts, row/column set operations …)
//      and "weak" readings (copying a row or column, each row having its own step, …).
//   3. An option is strongly consistent when every attribute admits at least one strong pattern,
//      weakly consistent when every attribute admits at least one pattern of any kind.
//   4. The answer is the best-scoring option; `ambiguous` is true when more than one option is fully
//      consistent at the best level reached.
//
// Only `cellKey` and `canonicalOrientation` are shared with the engine (both are pure helpers).
import { canonicalOrientation } from './shapes.js';

const SIZE_IDX = { small: 0, medium: 1, large: 2 };

// Observable attributes of a figure cell. A single shape has a position; a multi-shape layout is always
// drawn centred, so its observable position is the centre (the centroid of the layout).
const FIGURE_META = {
  shape: { kind: 'categorical' },
  fill: { kind: 'categorical' },
  size: { kind: 'ordered', n: 3 },
  count: { kind: 'ordered', n: 5, arithmetic: true },
  rot: { kind: 'cyclic', n: 8 },
  flip: { kind: 'categorical' },
  x: { kind: 'ordered', n: 3 },
  y: { kind: 'ordered', n: 3 },
  inner: { kind: 'categorical' },
  innerFill: { kind: 'categorical' },
};
const FIGURE_ATTRS = Object.keys(FIGURE_META);

function observeFigure(cell) {
  const o = canonicalOrientation(cell.shape, cell.rot, cell.flip);
  const single = cell.count === 1;
  return {
    shape: cell.shape,
    fill: cell.fill,
    size: SIZE_IDX[cell.size],
    count: cell.count,
    rot: o.r,
    flip: o.f,
    x: single ? cell.x : 1,
    y: single ? cell.y : 1,
    inner: single && cell.inner ? cell.inner : 'none',
    innerFill: single && cell.inner && cell.inner !== 'none' ? cell.innerFill : null,
  };
}

// ---------------------------------------------------------------- figure pattern library
// Every predicate receives a 3×3 grid of values (null = not observable) and the attribute meta.
// Comparisons involving null succeed (an unobservable value never contradicts a pattern).

const eq = (a, b) => a === null || b === null || a === b;
const ne = (a, b) => a === null || b === null || a !== b;
function stepOK(meta, a, b, k) {
  if (a === null || b === null) return true;
  if (meta.kind === 'cyclic') return (((b - a) % meta.n) + meta.n) % meta.n === ((k % meta.n) + meta.n) % meta.n;
  return b - a === k;
}
function stepsFor(meta) {
  if (meta.kind === 'cyclic') return Array.from({ length: meta.n - 1 }, (_, i) => i + 1);
  const out = [];
  for (let k = 1; k < meta.n; k++) out.push(k, -k);
  return out;
}
const rows = (g) => [0, 1, 2].map((r) => g[r]);
const cols = (g) => [0, 1, 2].map((c) => [g[0][c], g[1][c], g[2][c]]);
const knownOf = (line) => line.filter((v) => v !== null);
const allKnown = (g) => g.flat().filter((v) => v !== null);

function linesConst(lines) {
  return lines.every((l) => { const k = knownOf(l); return k.every((v) => v === k[0]); });
}
function linesStep(meta, lines, k) {
  return lines.every((l) => stepOK(meta, l[0], l[1], k) && stepOK(meta, l[1], l[2], k));
}
function linesStepOwn(meta, lines) {
  return lines.every((l) => [0, ...stepsFor(meta)].some((k) => stepOK(meta, l[0], l[1], k) && stepOK(meta, l[1], l[2], k)));
}
function linesDistinct(lines) {
  return lines.every((l) => { const k = knownOf(l); return new Set(k).size === k.length; });
}
function linesAlt(lines, same) {
  let A = null, B = null;
  for (const l of lines) {
    if (!eq(l[0], l[2]) || !ne(l[0], l[1]) || !ne(l[1], l[2])) return false;
    if (same) {
      for (const v of [l[0], l[2]]) { if (v === null) continue; if (A === null) A = v; else if (A !== v) return false; }
      if (l[1] !== null) { if (B === null) B = l[1]; else if (B !== l[1]) return false; }
    }
  }
  return true;
}
function linesMultiset(lines) {
  if (lines.some((l) => l.some((v) => v === null))) return false;
  const key = (l) => l.slice().sort().join('|');
  const k0 = key(lines[0]);
  return lines.every((l) => key(l) === k0);
}
function linesArith(lines, fn) {
  return lines.every((l) => l.every((v) => v !== null) && fn(l[0], l[1]) === l[2]);
}

// Returns [{ name, strong }] for every pattern the completed grid satisfies.
export function figurePatterns(grid, meta) {
  const out = [];
  const add = (name, strong) => out.push({ name, strong });
  const R = rows(grid), C = cols(grid);
  const known = allKnown(grid);
  if (known.length === 0) { add('unobservable', true); return out; }

  if (known.every((v) => v === known[0])) add('const', true);
  if (linesConst(R)) add('rowConst', true);
  if (linesConst(C)) add('colConst', true);

  if (meta.kind !== 'categorical') {
    for (const k of stepsFor(meta)) {
      const shown = meta.kind === 'cyclic' && k > meta.n / 2 ? k - meta.n : k; // cyclic +6 reads as -2
      if (linesStep(meta, R, k)) add(`rowStep(${shown > 0 ? '+' : ''}${shown})`, true);
      if (linesStep(meta, C, k)) add(`colStep(${shown > 0 ? '+' : ''}${shown})`, true);
    }
    if (linesStepOwn(meta, R)) add('rowStepOwn', false);
    if (linesStepOwn(meta, C)) add('colStepOwn', false);
  }
  if (meta.arithmetic) {
    if (linesArith(R, (a, b) => a + b)) add('rowSum', true);
    if (linesArith(C, (a, b) => a + b)) add('colSum', true);
    if (linesArith(R, (a, b) => a - b)) add('rowDiff', true);
    if (linesArith(C, (a, b) => a - b)) add('colDiff', true);
    // |a-b| flips the sign per line; a person rarely reads it as one rule, so it only counts as a weak reading
    if (linesArith(R, (a, b) => Math.abs(a - b)) && !linesArith(R, (a, b) => a - b)) add('rowAbsDiff', false);
    if (linesArith(C, (a, b) => Math.abs(a - b)) && !linesArith(C, (a, b) => a - b)) add('colAbsDiff', false);
    // result in the first or middle position (reverse readings)
    if (R.every((l) => l.every((v) => v !== null) && l[0] === l[1] + l[2])) add('rowSumFirst', false);
    if (C.every((l) => l.every((v) => v !== null) && l[0] === l[1] + l[2])) add('colSumFirst', false);
  }
  if (meta.kind === 'cyclic') {
    if (linesArith(R, (a, b) => (a + b) % meta.n)) add('rowSumMod', false);
    if (linesArith(C, (a, b) => (a + b) % meta.n)) add('colSumMod', false);
  }

  const distinct = new Set(known);
  if (distinct.size === 3) {
    const rowsOk = linesDistinct(R), colsOk = linesDistinct(C);
    if (rowsOk && colsOk) add('latin', true);
    else if (rowsOk) add('latinRows', true);
    else if (colsOk) add('latinCols', true);
  }
  if (linesAlt(R, true)) add('rowAlt', true); else if (linesAlt(R, false)) add('rowAltOwn', false);
  if (linesAlt(C, true)) add('colAlt', true); else if (linesAlt(C, false)) add('colAltOwn', false);
  {
    const ev = [], od = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (grid[r][c] !== null) ((r + c) % 2 === 0 ? ev : od).push(grid[r][c]);
    if (ev.length && od.length && ev.every((v) => v === ev[0]) && od.every((v) => v === od[0]) && ev[0] !== od[0]) add('checker', true);
  }
  if (eq(grid[1][1], grid[0][0]) && eq(grid[2][2], grid[1][1]) && eq(grid[1][2], grid[0][1]) && eq(grid[2][1], grid[1][0])) add('diagConst', true);

  for (const r of [0, 1]) if ([0, 1, 2].every((c) => eq(grid[r][c], grid[2][c]))) add(`copyRow${r + 1}`, false);
  for (const c of [0, 1]) if ([0, 1, 2].every((r) => eq(grid[r][c], grid[r][2]))) add(`copyCol${c + 1}`, false);
  if (distinct.size > 1 && linesMultiset(R)) add('rowMultiset', false);
  if (distinct.size > 1 && linesMultiset(C)) add('colMultiset', false);
  return out;
}

// ---------------------------------------------------------------- set pattern library

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const SET_OPS = {
  union: (a, b) => [...new Set([...a, ...b])],
  intersection: (a, b) => a.filter((x) => b.includes(x)),
  xor: (a, b) => [...a.filter((x) => !b.includes(x)), ...b.filter((x) => !a.includes(x))],
  'A-B': (a, b) => a.filter((x) => !b.includes(x)),
  'B-A': (a, b) => b.filter((x) => !a.includes(x)),
};

export function setPatterns(grid, elements) {
  const out = [];
  const add = (name, strong) => out.push({ name, strong });
  const R = rows(grid), C = cols(grid);
  if (grid.flat().every((m) => sameSet(m, grid[0][0]))) add('const', true);
  for (const [dir, lines] of [['row', R], ['col', C]]) {
    for (const [opName, op] of Object.entries(SET_OPS)) {
      // standard reading: third cell = op(first, second)
      if (lines.every((l) => sameSet(op(l[0], l[1]), l[2]))) add(`${dir}:${opName}`, true);
      // reverse readings: first cell = op(second, third), middle cell = op(first, third)
      if (lines.every((l) => sameSet(op(l[1], l[2]), l[0]))) add(`${dir}:first=${opName}(second,third)`, false);
      if (lines.every((l) => sameSet(op(l[0], l[2]), l[1]))) add(`${dir}:second=${opName}(first,third)`, false);
    }
    if (lines.every((l) => l.every((m) => sameSet(m, l[0])))) add(`${dir}Const`, false);
    // every element occurs the same number of times in every line
    if (elements.every((e) => { const n = lines.map((l) => l.filter((m) => m.includes(e)).length); return n.every((v) => v === n[0]); })) add(`${dir}Multiplicity`, false);
  }
  for (const r of [0, 1]) if ([0, 1, 2].every((c) => sameSet(grid[r][c], grid[2][c]))) add(`copyRow${r + 1}`, false);
  for (const c of [0, 1]) if ([0, 1, 2].every((r) => sameSet(grid[r][c], grid[r][2]))) add(`copyCol${c + 1}`, false);
  if (sameSet(grid[1][1], grid[0][0]) && sameSet(grid[2][2], grid[1][1]) && sameSet(grid[1][2], grid[0][1]) && sameSet(grid[2][1], grid[1][0])) add('diagConst', true);
  return out;
}

// ---------------------------------------------------------------- scoring

function completedGrid(values, option) {
  const all = [...values.slice(0, 8), option];
  return [all.slice(0, 3), all.slice(3, 6), all.slice(6, 9)];
}

function evaluateFigureOption(cells, option) {
  const obs = cells.slice(0, 8).map(observeFigure);
  const opt = observeFigure(option);
  const attrs = {};
  let strongAttrs = 0, anyAttrs = 0, total = 0;
  for (const attr of FIGURE_ATTRS) {
    const grid = completedGrid(obs.map((o) => o[attr]), opt[attr]);
    const pats = figurePatterns(grid, FIGURE_META[attr]);
    attrs[attr] = pats;
    if (pats.some((p) => p.strong)) strongAttrs++;
    if (pats.length) anyAttrs++;
    total += pats.length;
  }
  const n = FIGURE_ATTRS.length;
  return { attrs, level: strongAttrs === n ? 'strong' : anyAttrs === n ? 'weak' : 'none', score: [strongAttrs, anyAttrs, total] };
}

function evaluateSetOption(cells, option) {
  const elements = [...new Set([...cells.slice(0, 8), option].flatMap((c) => c.members))];
  const grid = completedGrid(cells.slice(0, 8).map((c) => c.members), option.members);
  const pats = setPatterns(grid, elements);
  const strong = pats.some((p) => p.strong);
  return { attrs: { set: pats }, level: strong ? 'strong' : pats.length ? 'weak' : 'none', score: [strong ? 1 : 0, pats.length ? 1 : 0, pats.length] };
}

const strongNames = (pats) => pats.filter((p) => p.strong).map((p) => p.name);
const allNames = (pats) => pats.map((p) => (p.strong ? p.name : `${p.name}?`));

// "attr: pattern, pattern; attr: …" — strong patterns only when there are any, otherwise weak ones marked "?".
function summarise(ev) {
  return Object.entries(ev.attrs)
    .map(([attr, pats]) => {
      const names = strongNames(pats).length ? strongNames(pats) : allNames(pats);
      return `${attr}: ${names.length ? names.join(', ') : 'NO PATTERN'}`;
    })
    .join('; ');
}

// Only the attributes on which `other` reads differently from `best`.
function contrast(best, other) {
  const parts = [];
  for (const attr of Object.keys(best.attrs)) {
    const a = strongNames(best.attrs[attr]).join(', ') || allNames(best.attrs[attr]).join(', ') || 'NO PATTERN';
    const b = strongNames(other.attrs[attr]).join(', ') || allNames(other.attrs[attr]).join(', ') || 'NO PATTERN';
    if (a !== b) parts.push(`${attr}: ${b} (best option reads ${a})`);
  }
  return parts.join('; ') || 'same readings';
}

// Solve a puzzle from its visible cells and options only.
export function solveIndependently(puzzle) {
  const cells = puzzle.cells;
  const options = puzzle.options;
  const kind = options[0].kind;
  const evals = options.map((o) => (kind === 'set' ? evaluateSetOption(cells, o) : evaluateFigureOption(cells, o)));

  const idx = (level) => evals.map((e, i) => (e.level === level ? i : -1)).filter((i) => i >= 0);
  let candidates = idx('strong');
  let level = 'strong';
  if (!candidates.length) { candidates = idx('weak'); level = 'weak'; }
  if (!candidates.length) {
    level = 'none';
    const best = Math.max(...evals.map((e) => e.score[0] * 100 + e.score[1] * 10 + e.score[2]));
    candidates = evals.map((e, i) => (e.score[0] * 100 + e.score[1] * 10 + e.score[2] === best ? i : -1)).filter((i) => i >= 0);
  }
  // Among candidates prefer the one satisfying the most patterns (purely a tie-break; ties stay ambiguous).
  const ranked = candidates.slice().sort((a, b) => evals[b].score[2] - evals[a].score[2]);
  const index = ranked[0];
  const ambiguous = candidates.length > 1;
  const weakOthers = evals.filter((e, i) => i !== index && e.level !== 'none').length;
  let confidence;
  if (level === 'strong' && !ambiguous) confidence = weakOthers ? 0.8 : 1;
  else if (level === 'strong') confidence = 0.5;
  else if (level === 'weak' && !ambiguous) confidence = 0.4;
  else confidence = 0.2;

  const reasons = [`best reading level: ${level}; option ${index} satisfies ${summarise(evals[index])}`];
  for (const i of candidates) if (i !== index) reasons.push(`also fully consistent: option ${i} reads ${contrast(evals[index], evals[i])}`);
  if (!ambiguous && weakOthers) {
    for (let i = 0; i < evals.length; i++) if (i !== index && evals[i].level !== 'none') reasons.push(`weakly consistent alternative: option ${i} reads ${contrast(evals[index], evals[i])}`);
  }
  return { index, confidence, reasons, ambiguous, candidates, level, evaluations: evals };
}
