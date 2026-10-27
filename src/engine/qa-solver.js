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
  if (R.every(l => eq(l[0], l[2]))) add('rowPalindrome', true);
  if (C.every(l => eq(l[0], l[2]))) add('colPalindrome', true);
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
  // complement readings need the palette
  const OPS = {
    ...SET_OPS,
    neither: (a, b) => elements.filter((x) => !a.includes(x) && !b.includes(x)),
    notBoth: (a, b) => elements.filter((x) => !(a.includes(x) && b.includes(x))),
  };
  for (const [dir, lines] of [['row', R], ['col', C]]) {
    for (const [opName, op] of Object.entries(OPS)) {
      // standard reading: third cell = op(first, second)
      if (lines.every((l) => sameSet(op(l[0], l[1]), l[2]))) add(`${dir}:${opName}`, true);
      // reverse readings: first cell = op(second, third), middle cell = op(first, third)
      if (lines.every((l) => sameSet(op(l[1], l[2]), l[0]))) add(`${dir}:first=${opName}(second,third)`, true);
      if (lines.every((l) => sameSet(op(l[0], l[2]), l[1]))) add(`${dir}:second=${opName}(first,third)`, true);
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

/** Row-3 (or column-3) as a rigid transformation of row 1 or 2 (or column 1 or 2) over the completed grid. */
function transformReadings(cells, option) {
  const all = [...cells.slice(0, 8), option];
  const T = { flipV: { r: 4, f: 1 }, flipH: { r: 0, f: 1 }, rot180: { r: 4, f: 0 }, rot90: { r: 2, f: 0 }, rot270: { r: 6, f: 0 } };
  const st = (c) => canonicalOrientation(c.shape, c.rot, c.flip);
  const eq = (a, b) => a.r === b.r && a.f === b.f;
  const comp = (g, s) => ({ r: (((g.r + (g.f ? -s.r : s.r)) % 8) + 8) % 8, f: g.f ^ s.f });
  const apply = (g, c) => { const s = comp(g, { r: c.rot, f: c.flip }); return canonicalOrientation(c.shape, s.r, s.f); };
  const at = (r, c) => all[r * 3 + c];
  const out = [];
  for (const [name, g] of Object.entries(T)) {
    for (const src of [0, 1]) {
      if ([0, 1, 2].every((c) => at(src, c).shape === at(2, c).shape && eq(apply(g, at(src, c)), st(at(2, c))))) out.push(`row3=${name}(row${src + 1})`);
      if ([0, 1, 2].every((r) => at(r, src).shape === at(r, 2).shape && eq(apply(g, at(r, src)), st(at(r, 2))))) out.push(`col3=${name}(col${src + 1})`);
    }
  }
  return out;
}

function evaluateFigureOption(cells, option) {
  const obs = cells.slice(0, 8).map(observeFigure);
  const opt = observeFigure(option);
  const attrs = {};
  let strongAttrs = 0, anyAttrs = 0, total = 0;
  const transforms = transformReadings(cells, option);
  const grids = {};
  for (const attr of FIGURE_ATTRS) grids[attr] = completedGrid(obs.map((o) => o[attr]), opt[attr]);
  // Independent readings first; a coupled reading may only lean on an attribute that stands on its own.
  const base = {};
  for (const attr of FIGURE_ATTRS) base[attr] = figurePatterns(grids[attr], FIGURE_META[attr]);
  for (const attr of FIGURE_ATTRS) {
    const grid = grids[attr];
    const pats = base[attr].slice();
    // Coupled reading: this attribute is a function of another, independently patterned attribute with 2–3 values.
    const flatB = grid.flat();
    if (new Set(flatB.filter((v) => v !== null)).size > 1) {
      for (const other of FIGURE_ATTRS) {
        if (other === attr || !base[other].some((p) => p.strong)) continue;
        const flatA = grids[other].flat();
        const distinct = new Set(flatA.filter((v) => v !== null));
        if (distinct.size < 2 || distinct.size > 3) continue;
        // The link must be fixed by the eight visible cells; the gap may not introduce a new source value.
        const map = new Map();
        let ok = true;
        for (let i = 0; i < 8; i++) { const a = flatA[i], b = flatB[i]; if (a === null || b === null) continue; if (map.has(a) && map.get(a) !== b) { ok = false; break; } map.set(a, b); }
        const aGap = flatA[8], bGap = flatB[8];
        if (ok && map.size >= 2 && aGap !== null && bGap !== null && map.has(aGap) && map.get(aGap) === bGap) pats.push({ name: `coupled:${other}`, strong: true });
      }
    }
    if ((attr === 'rot' || attr === 'flip') && transforms.length) for (const t of transforms) pats.push({ name: t, strong: true });
    attrs[attr] = pats;
    if (pats.some((p) => p.strong)) strongAttrs++;
    if (pats.length) anyAttrs++;
    total += pats.length;
  }
  const n = FIGURE_ATTRS.length;
  return { attrs, level: strongAttrs === n ? 'strong' : anyAttrs === n ? 'weak' : 'none', score: [strongAttrs, anyAttrs, total] };
}

// ---------------------------------------------------------------- whole-matrix readings (independent of global.js)

const QA_PATHS = {
  rowMajor: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  snake: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [2, 1], [2, 2]],
  colMajor: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  colSnake: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]],
  spiral: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1]],
  spiralCcw: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [1, 1]],
};

function countsOf(items) { const m = new Map(); for (const it of items) { const k = `${it.shape}/${it.fill}`; m.set(k, (m.get(k) || 0) + 1); } return m; }
const sameCounts = (a, b) => a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);

function evaluateGlobalOption(cells, option) {
  const all = [...cells.slice(0, 8), option];
  const pats = [];
  const add = (name, strong = true) => pats.push({ name, strong });
  const kind = option.kind;
  if (kind === 'scatter') {
    // counts along a path with a constant step or two alternating steps (full 9-sequence check)
    const grid = [all.slice(0, 3), all.slice(3, 6), all.slice(6, 9)].map((row) => row.map((c) => c.count));
    for (const [name, path] of Object.entries(QA_PATHS)) {
      const seq = path.map(([r, c]) => grid[r][c]);
      const d = seq.slice(1).map((v, i) => v - seq[i]);
      if (d.every((x) => x === d[0]) && d[0] !== 0) add(`${name}:step`);
      const even = d.filter((_, i) => i % 2 === 0), odd = d.filter((_, i) => i % 2 === 1);
      if (even.every((x) => x === even[0]) && odd.every((x) => x === odd[0]) && even[0] !== odd[0] && even[0] !== 0 && odd[0] !== 0) add(`${name}:alternating`);
    }
    if (all.every((c) => c.count === all[0].count)) add('const');
  } else if (kind === 'split') {
    const tally = new Map();
    for (const c of all) tally.set(c.sections, (tally.get(c.sections) || 0) + 1);
    if ([...tally.values()].every((n) => n === 3)) add('three-of-each');
    if (all.every((c) => c.sections === all[0].sections)) add('const');
    const g = [0, 3, 6].map(i => all.slice(i, i + 3).map(c => c.sections));
    for (const p of figurePatterns(g, { kind: 'ordered', n: 6, arithmetic: true })) {
      if (p.strong) add(`sections:${p.name}`);
    }
  } else if (kind === 'multi') {
    const counts = all.map((c) => countsOf(c.items));
    // invariant core: types with identical counts in all nine cells, and at least one such type
    const core = [...counts[0].keys()].filter((k) => counts.every((m) => m.get(k) === counts[0].get(k)));
    const optionCore = core.length > 0;
    // the option must not break any type that is invariant over the eight known cells
    const known = counts.slice(0, 8);
    const knownCore = [...known[0].keys()].filter((k) => known.every((m) => m.get(k) === known[0].get(k)));
    // A fixed set is a strong reading only when the item counts of the known cells show no row/column grid
    // (when they do, the stricter composition reading applies and "keeps the core" is just a weak sanity check).
    const knownSizes = cells.slice(0, 8).map((c) => c.items.length);
    const ka = knownSizes[3] - knownSizes[0], kb = knownSizes[1] - knownSizes[0];
    const knownGrid = (ka !== 0 || kb !== 0) && [0, 1, 2, 3, 4, 5, 6, 7].every((i) => knownSizes[i] === knownSizes[0] + Math.floor(i / 3) * ka + (i % 3) * kb);
    if (knownCore.length && knownCore.every((k) => counts[8].get(k) === known[0].get(k)) && optionCore) add('invariant-core', !knownGrid);
    // column-constant multisets
    if ([0, 1, 2].every((c) => sameCounts(counts[c], counts[c + 3]) && sameCounts(counts[c], counts[c + 6]))) add('column-multiset');
    if ([0, 1, 2].every((r) => sameCounts(counts[r * 3], counts[r * 3 + 1]) && sameCounts(counts[r * 3], counts[r * 3 + 2]))) add('row-multiset');
    // nested composition: cells with n items show the first n of one chain, and counts form a grid
    const sizes = all.map((c) => c.items.length);
    const byN = new Map();
    let nested = true;
    for (let i = 0; i < 9 && nested; i++) { const key = [...countsOf(all[i].items).keys()].sort().join('|'); if (byN.has(sizes[i]) && byN.get(sizes[i]) !== key) nested = false; byN.set(sizes[i], key); }
    if (nested) {
      const ns = [...byN.keys()].sort((a, b) => a - b);
      const chainOk = ns.every((n, i) => i === 0 || byN.get(ns[i - 1]).split('|').every((k) => byN.get(n).split('|').includes(k)));
      const g = [sizes.slice(0, 3), sizes.slice(3, 6), sizes.slice(6, 9)];
      const a = g[1][0] - g[0][0], b = g[0][1] - g[0][0];
      const gridOk = g.every((row, r) => row.every((v, c) => v === g[0][0] + r * a + c * b));
      if (chainOk && gridOk && (a !== 0 || b !== 0)) add('composition-grid');
    }
  } else if (kind === 'figure') {
    // mirrored / transformed rows and columns
    const T = { flipV: { r: 4, f: 1 }, flipH: { r: 0, f: 1 }, rot180: { r: 4, f: 0 }, rot90: { r: 2, f: 0 }, rot270: { r: 6, f: 0 } };
    const st = (c) => canonicalOrientation(c.shape, c.rot, c.flip);
    const eq = (a, b) => a.r === b.r && a.f === b.f;
    const comp = (g, s) => ({ r: (((g.r + (g.f ? -s.r : s.r)) % 8) + 8) % 8, f: g.f ^ s.f });
    const apply = (g, c) => { const s = comp(g, { r: c.rot, f: c.flip }); return canonicalOrientation(c.shape, s.r, s.f); };
    const at = (r, c) => all[r * 3 + c];
    for (const [name, g] of Object.entries(T)) {
      for (const src of [0, 1]) {
        if ([0, 1, 2].every((c) => eq(apply(g, at(src, c)), st(at(2, c))))) add(`row3=${name}(row${src + 1})`);
        if ([0, 1, 2].every((r) => eq(apply(g, at(r, src)), st(at(r, 2))))) add(`col3=${name}(col${src + 1})`);
      }
    }
  }
  return { attrs: { global: pats }, level: pats.some((p) => p.strong) ? 'strong' : pats.length ? 'weak' : 'none', score: [pats.some((p) => p.strong) ? 1 : 0, pats.length ? 1 : 0, pats.length] };
}

// Composite cells: the main figure is read like a figure cell (shape, fill, orientation; everything else constant)
// and the attached marks like a set cell. An option is consistent only when both layers are.
function evaluateCompositeOption(cells, option) {
  const toFig = (c) => ({ kind: 'figure', shape: c.shape, fill: c.fill, rot: c.rot, flip: c.flip, size: 'medium', count: 1, x: 1, y: 1, inner: 'none', innerFill: 'none' });
  const fig = evaluateFigureOption(cells.slice(0, 8).map(toFig), toFig(option));
  const known = cells.slice(0, 8).map((c) => c.parts);
  const elements = [...new Set([...known, option.parts].flat())];
  const pats = setPatterns(completedGrid(known, option.parts), elements);
  // Cross-layer reading: the marks are a fixed function of one figure attribute with 2–3 values, the link being
  // fixed by the eight visible cells and the gap's attribute value already seen.
  const partsKey = (c) => c.parts.slice().sort().join(',');
  for (const attr of ['shape', 'fill', 'rot', 'flip']) {
    const src = (c) => { if (attr === 'rot' || attr === 'flip') { const o = canonicalOrientation(c.shape, c.rot, c.flip); return attr === 'rot' ? o.r : o.f; } return c[attr]; };
    const values = new Set(cells.slice(0, 8).map(src));
    if (values.size < 2 || values.size > 3) continue;
    const m = new Map(); let ok = true;
    for (const c of cells.slice(0, 8)) { const k = src(c); if (m.has(k) && m.get(k) !== partsKey(c)) { ok = false; break; } m.set(k, partsKey(c)); }
    if (ok && m.has(src(option)) && m.get(src(option)) === partsKey(option)) pats.push({ name: `coupled:${attr}`, strong: true });
  }
  const setStrong = pats.some((p) => p.strong);
  const level = fig.level === 'strong' && setStrong ? 'strong' : fig.level !== 'none' && pats.length ? 'weak' : 'none';
  return { attrs: { ...fig.attrs, marks: pats }, level, score: [fig.score[0] + (setStrong ? 1 : 0), fig.score[1] + (pats.length ? 1 : 0), fig.score[2] + pats.length] };
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
  const isGlobal = ['scatter', 'multi', 'split'].includes(kind);
  const evals = options.map((o) => (isGlobal ? evaluateGlobalOption(cells, o) : kind === 'set' ? evaluateSetOption(cells, o) : kind === 'composite' ? evaluateCompositeOption(cells, o) : evaluateFigureOption(cells, o)));

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
