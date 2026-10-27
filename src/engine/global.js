// Whole-matrix puzzle families: rules that run over the matrix as a whole (a path, a distribution, an invariant,
// a column multiset, a count-plus-composition chain, mirrored rows) rather than along rows and columns.
// Each family has a generator and a reading-based solver; a puzzle is accepted only when every consistent
// reading predicts the same cell and no option matches another reading.
import { PLAIN_SHAPES, ORIENTED_SHAPES, compose, canonicalOrientation } from './shapes.js';
import { cellKey, figureCell } from './cells.js';
import { predictAttribute, } from './solver.js';
import { makeDomains } from './cells.js';

// ---------------------------------------------------------------- cell kinds

export const MARKERS = ['dot', 'cross', 'ring', 'square'];
export const MARKER_NAMES = { dot: 'dot', cross: 'cross', ring: 'ring', square: 'small square' };

/** Jittered positions on a 3×3 or 4×4 lattice so markers never overlap. */
export function scatterPoints(count, rng) {
  const n = count <= 5 ? 3 : 4;
  const cellsIdx = rng.sample([...Array(n * n).keys()], Math.min(count, n * n));
  const step = 76 / n;
  return cellsIdx.map((i) => {
    const gx = i % n, gy = Math.floor(i / n);
    const jx = (rng.float() - 0.5) * step * 0.45, jy = (rng.float() - 0.5) * step * 0.45;
    return [Math.round(12 + step * (gx + 0.5) + jx), Math.round(12 + step * (gy + 0.5) + jy)];
  });
}

export function scatterCell(marker, count, rng) {
  return { kind: 'scatter', marker, count, points: scatterPoints(count, rng) };
}

export function multiCell(items, rng) {
  const points = scatterPoints(items.length, rng);
  return { kind: 'multi', items: items.map((it) => ({ ...it })), points };
}

// Line patterns dividing a box into a known number of sections. Coordinates in the 0..100 cell box (frame 10..90).
export const SPLIT_VARIANTS = {
  2: [
    { id: 'diag', lines: [[10, 10, 90, 90]], text: 'one diagonal' },
    { id: 'diag2', lines: [[10, 90, 90, 10]], text: 'one diagonal' },
    { id: 'vert', lines: [[50, 10, 50, 90]], text: 'one vertical line' },
    { id: 'horiz', lines: [[10, 50, 90, 50]], text: 'one horizontal line' },
    { id: 'cornerMid', lines: [[10, 10, 90, 50]], text: 'one line from a corner to the middle of a side' },
    { id: 'midMid', lines: [[10, 30, 90, 70]], text: 'one slanted line' },
  ],
  3: [
    { id: 'twoVert', lines: [[37, 10, 37, 90], [63, 10, 63, 90]], text: 'two vertical lines' },
    { id: 'twoHoriz', lines: [[10, 37, 90, 37], [10, 63, 90, 63]], text: 'two horizontal lines' },
    { id: 'vee', lines: [[10, 10, 50, 90], [90, 10, 50, 90]], text: 'two lines meeting at the bottom' },
    { id: 'caret', lines: [[10, 90, 50, 10], [90, 90, 50, 10]], text: 'two lines meeting at the top' },
    { id: 'diagHalf', lines: [[10, 10, 90, 90], [50, 50, 90, 10]], text: 'a diagonal with a half line from its middle' },
    { id: 'tee', lines: [[10, 50, 90, 50], [50, 50, 50, 90]], text: 'a T of two lines' },
  ],
  4: [
    { id: 'cross', lines: [[10, 10, 90, 90], [10, 90, 90, 10]], text: 'two crossing diagonals' },
    { id: 'plus', lines: [[50, 10, 50, 90], [10, 50, 90, 50]], text: 'a vertical and a horizontal line' },
    { id: 'threeVert', lines: [[30, 10, 30, 90], [50, 10, 50, 90], [70, 10, 70, 90]], text: 'three vertical lines' },
    { id: 'threeHoriz', lines: [[10, 30, 90, 30], [10, 50, 90, 50], [10, 70, 90, 70]], text: 'three horizontal lines' },
    { id: 'diagVert', lines: [[10, 10, 90, 90], [50, 10, 50, 90]], text: 'a diagonal crossed by a vertical line' },
    { id: 'fan', lines: [[10, 90, 90, 10], [10, 90, 50, 10], [10, 90, 90, 50]], text: 'three lines fanning from one corner' },
  ],
  5: [
    { id: 'fourVert', lines: [[26, 10, 26, 90], [42, 10, 42, 90], [58, 10, 58, 90], [74, 10, 74, 90]], text: 'four vertical lines' },
    { id: 'plusDiag', lines: [[50, 10, 50, 90], [10, 50, 90, 50], [50, 50, 90, 90]], text: 'a plus with an extra half diagonal' },
    { id: 'crossVert', lines: [[10, 10, 90, 90], [10, 90, 90, 10], [50, 50, 50, 90]], text: 'crossing diagonals with a half vertical' },
  ],
};

export function splitCell(sections, variantId) {
  return { kind: 'split', sections, variant: variantId };
}

export function globalCellKey(cell) {
  if (cell.kind === 'scatter') return `sc|${cell.marker}|${cell.count}`;
  if (cell.kind === 'multi') return `mu|${cell.items.map((i) => `${i.shape}/${i.fill}`).sort().join(',')}`;
  if (cell.kind === 'split') return `sp|${cell.sections}|${cell.variant}`;
  return null;
}

const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const SHAPE_LABEL = { circle: 'circle', square: 'square', triangle: 'triangle', diamond: 'diamond', pentagon: 'pentagon', hexagon: 'hexagon', star: 'star', plus: 'plus sign' };
function multisetText(items) {
  const counts = new Map();
  for (const it of items) { const k = `${it.fill === 'solid' ? 'solid' : 'hollow'} ${SHAPE_LABEL[it.shape]}`; counts.set(k, (counts.get(k) || 0) + 1); }
  const parts = [...counts.entries()].sort().map(([k, n]) => `${NUM[n]} ${k}${n > 1 ? 's' : ''}`);
  return parts.length === 0 ? 'empty cell' : parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function describeGlobalCell(cell) {
  if (cell.kind === 'scatter') return `${NUM[cell.count]} ${MARKER_NAMES[cell.marker]}${cell.count === 1 ? '' : cell.marker === 'cross' ? 'es' : 's'}`;
  if (cell.kind === 'multi') return multisetText(cell.items);
  if (cell.kind === 'split') { const v = SPLIT_VARIANTS[cell.sections].find((x) => x.id === cell.variant); return `a box divided into ${NUM[cell.sections]} sections by ${v ? v.text : 'lines'}`; }
  return null;
}

// ---------------------------------------------------------------- shared helpers

const PATHS = {
  rowMajor: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],
  snake: [[0, 0], [0, 1], [0, 2], [1, 2], [1, 1], [1, 0], [2, 0], [2, 1], [2, 2]],
  colMajor: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  colSnake: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2]],
  spiral: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], [2, 1], [2, 0], [1, 0], [1, 1]],
  spiralCcw: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [0, 1], [1, 1]],
};
const PATH_TEXT = {
  rowMajor: 'row by row, left to right', snake: 'as a snake: left to right, then right to left, then left to right',
  colMajor: 'column by column, top to bottom', colSnake: 'as a snake down the columns', spiral: 'as a clockwise spiral from the top-left corner into the centre', spiralCcw: 'as an anticlockwise spiral from the top-left corner into the centre',
};
const gapPos = (path) => PATHS[path].findIndex(([r, c]) => r === 2 && c === 2);

/** Rules along a path: constant step, or two alternating steps. Returns the sequence or null. */
function pathSequence(rule, start) {
  const seq = [start];
  for (let i = 1; i < 9; i++) {
    const step = rule.kind === 'const' ? rule.step : rule.steps[(i - 1) % 2];
    seq.push(seq[i - 1] + step);
  }
  return seq;
}

/** All path readings consistent with the known counts (gap unknown) → map count → readings. */
export function predictPathCounts(known /* 3x3 counts, null at gap */) {
  const preds = new Map();
  const add = (name, v) => { if (v == null || v < 1 || v > 9) return; if (!preds.has(v)) preds.set(v, []); preds.get(v).push(name); };
  for (const [path, cells] of Object.entries(PATHS)) {
    const seq = cells.map(([r, c]) => known[r][c]);
    const g = seq.indexOf(null);
    // constant step
    const diffs = [];
    for (let i = 1; i < 9; i++) if (seq[i] != null && seq[i - 1] != null) diffs.push(seq[i] - seq[i - 1]);
    if (diffs.length && diffs.every((d) => d === diffs[0])) {
      const d = diffs[0];
      const v = g > 0 ? seq[g - 1] + d : seq[1] - d;
      if (d !== 0 && [...Array(9).keys()].every((i) => i === g || seq[i] === v + (i - g) * d)) add(`${path}:step ${d > 0 ? '+' : ''}${d}`, v);
    }
    // alternating steps a, b (starting with a at index 0→1)
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
      if (a === b || a === 0 || b === 0) continue;
      const s0 = g === 0 ? null : seq[0];
      // reconstruct from the first known element
      let ok = true; const full = new Array(9).fill(null);
      const firstKnown = seq.findIndex((v) => v != null);
      full[firstKnown] = seq[firstKnown];
      for (let i = firstKnown + 1; i < 9; i++) full[i] = full[i - 1] + ((i - 1) % 2 === 0 ? a : b);
      for (let i = firstKnown - 1; i >= 0; i--) full[i] = full[i + 1] - (i % 2 === 0 ? a : b);
      for (let i = 0; i < 9; i++) if (seq[i] != null && seq[i] !== full[i]) { ok = false; break; }
      void s0;
      if (ok) add(`${path}:alternating ${a > 0 ? '+' : ''}${a}, ${b > 0 ? '+' : ''}${b}`, full[g]);
    }
  }
  return preds;
}

function fiveDistinct(cands, keyOf, rng, answerKey) {
  const used = new Set([answerKey]);
  const out = [];
  for (const c of rng.shuffle(cands)) {
    const k = keyOf(c);
    if (used.has(k)) continue;
    used.add(k); out.push(c);
    if (out.length === 5) break;
  }
  return out.length === 5 ? out : null;
}

function assemble(answer, distractors, rng) {
  const all = rng.shuffle([{ cell: answer, correct: true }, ...distractors]);
  const correctIndex = all.findIndex((o) => o.correct);
  return { options: all.map((o) => o.cell), correctIndex, distractors: all.map((o, i) => (o.correct ? null : { index: i, code: o.code, text: o.text, attrs: [] })) };
}

// ---------------------------------------------------------------- family: path (snake / spiral counts)

export function buildPath(difficulty, rng) {
  const marker = rng.pick(MARKERS);
  const pathChoices = { 1: ['rowMajor', 'snake'], 2: ['snake', 'colSnake'], 3: ['snake', 'colSnake', 'spiral'], 4: ['spiral', 'spiralCcw', 'snake'], 5: ['spiral', 'spiralCcw'], 6: ['spiral', 'spiralCcw'] }[Math.min(6, difficulty)];
  const path = rng.pick(pathChoices);
  let rule;
  if (difficulty <= 2) rule = { kind: 'const', step: 1 };
  else if (difficulty === 3) rule = rng.pick([{ kind: 'const', step: 1 }, { kind: 'const', step: -1 }, { kind: 'alt', steps: [2, -1] }]);
  else rule = rng.pick([{ kind: 'alt', steps: [2, -1] }, { kind: 'alt', steps: [3, -2] }, { kind: 'alt', steps: [-1, 2] }, { kind: 'const', step: -1 }]);
  // choose start so all counts stay in 1..9
  const starts = [];
  for (let s = 1; s <= 9; s++) { const seq = pathSequence(rule, s); if (seq.every((v) => v >= 1 && v <= 9)) starts.push(s); }
  if (!starts.length) return null;
  const seq = pathSequence(rule, rng.pick(starts));
  const grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  PATHS[path].forEach(([r, c], i) => { grid[r][c] = seq[i]; });
  const known = grid.map((row) => row.slice()); known[2][2] = null;
  const preds = predictPathCounts(known);
  if (preds.size !== 1 || !preds.has(grid[2][2])) return null;
  // also reject when the count read as a row/column attribute gives a different reading
  const dom = { kind: 'ordered', values: [1, 2, 3, 4, 5, 6, 7, 8, 9], steps: [1, -1, 2, -2, 3, -3], arith: true };
  const attrPreds = predictAttribute(dom, known.map((row) => row.map((v) => (v == null ? null : v - 1))));
  for (const v of attrPreds.keys()) if (v + 1 !== grid[2][2]) return null;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(scatterCell(marker, grid[r][c], rng));
  const answer = cells[8];
  const wrong = [];
  const add = (count, code, text) => { if (count >= 1 && count <= 9 && count !== grid[2][2]) wrong.push({ cell: scatterCell(marker, count, rng), code, text }); };
  add(grid[2][1] + 1, 'row-step', 'continues the row as if the sequence ran left to right in every row');
  add(grid[1][2] + 1, 'col-step', 'continues the column downwards instead of following the path');
  add(grid[2][2] + 1, 'off-by-one', 'is one too many');
  add(grid[2][2] - 1, 'off-by-one', 'is one too few');
  add(grid[2][2] + 2, 'off-by-two', 'is two too many');
  add(grid[2][2] - 2, 'off-by-two', 'is two too few');
  add(grid[2][1], 'copy-left', 'copies the cell to the left');
  add(grid[1][2], 'copy-above', 'copies the cell above');
  const primary = wrong.slice();
  for (let n = 1; n <= 9; n++) add(n, 'other-count', 'does not fit the sequence along the path');
  const ds = fiveDistinct(primary, (d) => `sc|${marker}|${d.cell.count}`, rng, `sc|${marker}|${grid[2][2]}`)
    || (() => { const used = new Set([`sc|${marker}|${grid[2][2]}`]); const out = []; for (const d of [...primary, ...rng.shuffle(wrong.slice(primary.length))]) { const k = `sc|${marker}|${d.cell.count}`; if (used.has(k)) continue; used.add(k); out.push(d); if (out.length === 5) break; } return out.length === 5 ? out : null; })();
  if (!ds) return null;
  const g = gapPos(path);
  const ruleText = rule.kind === 'const' ? `${rule.step > 0 ? 'one more' : 'one fewer'}${Math.abs(rule.step) > 1 ? ` (by ${Math.abs(rule.step)})` : ''} at every step` : `the steps alternate: ${rule.steps[0] > 0 ? '+' : ''}${rule.steps[0]}, then ${rule.steps[1] > 0 ? '+' : ''}${rule.steps[1]}`;
  const prev = g > 0 ? seq[g - 1] : null, next = g < 8 ? seq[g + 1] : null;
  return {
    kind: 'global', cells, ...assemble(answer, ds, rng),
    explanation: {
      summary: 'The rule runs over the whole matrix as one sequence, not along separate rows and columns.',
      rows: [`Read the cells ${PATH_TEXT[path]}: the counts go ${seq.map((v, i) => (i === g ? '?' : v)).join(', ')}.`],
      columns: [`Along that path, ${ruleText}.`],
      missing: [`The gap is step ${g + 1} of 9 on the path${prev != null ? `; the cell before it has ${prev}` : ''}${next != null ? ` and the cell after it has ${next}` : ''}, so the gap holds ${grid[2][2]} ${MARKER_NAMES[marker]}${grid[2][2] === 1 ? '' : marker === 'cross' ? 'es' : 's'}.`],
      unchanged: '',
    },
    hints: ['Count the markers in each cell and write the nine counts down.', 'The counts do not follow rows or columns separately: look for a path through the matrix along which they change steadily.', `Read the matrix ${PATH_TEXT[path]}; ${ruleText}.`],
    features: { rule: `path:${path}:${rule.kind}`, gapOnPath: g },
    setRule: null,
  };
}

// ---------------------------------------------------------------- family: split (three of each section count)

export function buildSplit(difficulty, rng) {
  const counts = rng.shuffle([2, 2, 2, 3, 3, 3, 4, 4, 4]);
  const pool = { 2: rng.shuffle(SPLIT_VARIANTS[2]), 3: rng.shuffle(SPLIT_VARIANTS[3]), 4: rng.shuffle(SPLIT_VARIANTS[4]) };
  const cells = counts.map((n) => { const v = pool[n].pop(); return splitCell(n, v.id); });
  const answer = cells[8];
  // reading: each section count appears three times
  const seen = cells.slice(0, 8).map((c) => c.sections);
  const missing = [2, 3, 4].filter((n) => seen.filter((x) => x === n).length === 2);
  if (missing.length !== 1 || missing[0] !== answer.sections) return null;
  // Section counts also admit ordinary line rules, independently of the tally.
  const domain = { kind: 'ordered', values: [1, 2, 3, 4, 5], steps: [1, -1, 2, -2], arith: true };
  const known = [0, 3, 6].map(i => cells.slice(i, i + 3).map(c => c.sections - 1));
  known[2][2] = null;
  if ([...predictAttribute(domain, known).keys()].some(v => domain.values[v] !== answer.sections)) return null;
  const wrong = [];
  for (const n of [2, 3, 4, 5]) {
    if (n === answer.sections) continue;
    for (const v of SPLIT_VARIANTS[n]) wrong.push({ cell: splitCell(n, v.id), code: n === 5 ? 'too-many-sections' : 'wrong-section-count', text: n === 5 ? 'has five sections, a count that never appears in the matrix' : `has ${NUM[n]} sections, which already appears three times` });
  }
  const ds = fiveDistinct(wrong, (d) => globalCellKey(d.cell), rng, globalCellKey(answer));
  if (!ds) return null;
  return {
    kind: 'global', cells, ...assemble(answer, ds, rng),
    explanation: {
      summary: 'Count the sections each box is divided into; the lines themselves are a distraction.',
      rows: ['Across the whole matrix there are three boxes split into two sections, three split into three, and three split into four.'],
      columns: ['Rows and columns carry no rule of their own: only the overall count of each kind matters.'],
      missing: [`The eight visible boxes contain ${[2, 3, 4].map((n) => `${NUM[seen.filter((x) => x === n).length]} with ${n}`).join(', ')} sections, so the missing box must have ${NUM[answer.sections]} sections.`],
      unchanged: '',
    },
    hints: ['Ignore where the lines are and count how many regions each box is cut into.', 'Tally the region counts over all eight boxes.', 'One count appears only twice; the gap makes it three.'],
    features: { rule: 'split:three-of-each' }, setRule: null,
  };
}

// ---------------------------------------------------------------- family: invariant (core multiset plus noise)

const MULTI_SHAPES = ['circle', 'square', 'triangle', 'star', 'pentagon', 'hexagon', 'diamond', 'plus'];

function multisetCounts(items) {
  const m = new Map();
  for (const it of items) { const k = `${it.shape}/${it.fill}`; m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

export function buildInvariant(difficulty, rng) {
  const coreTypes = difficulty <= 2 ? 2 : difficulty <= 4 ? 3 : 4;
  const noiseMax = difficulty <= 1 ? 1 : difficulty <= 3 ? 2 : 3;
  const shapes = rng.shuffle(MULTI_SHAPES);
  const core = shapes.slice(0, coreTypes).map((shape) => ({ shape, fill: rng.pick(['none', 'solid']), n: rng.pick([1, 1, 2]) }));
  const noisePool = shapes.slice(coreTypes, coreTypes + 3);
  const fills = ['none', 'solid'];
  const makeItems = () => {
    const items = [];
    for (const c of core) for (let i = 0; i < c.n; i++) items.push({ shape: c.shape, fill: c.fill });
    const k = rng.range(0, noiseMax);
    for (let i = 0; i < k; i++) items.push({ shape: rng.pick(noisePool), fill: rng.pick(fills) });
    return items;
  };
  const cells = [];
  for (let i = 0; i < 9; i++) cells.push(multiCell(makeItems(), rng));
  if (cells.some((c) => c.items.length > 8)) return null;
  const answer = cells[8];
  // reading: exact counts of every type that appears in all eight cells with the same count
  const counts = cells.slice(0, 8).map((c) => multisetCounts(c.items));
  const coreKeys = [...counts[0].keys()].filter((k) => counts.every((m) => m.get(k) === counts[0].get(k)));
  const coreSet = new Set(core.map((c) => `${c.shape}/${c.fill}`));
  if (coreKeys.length !== coreSet.size || !coreKeys.every((k) => coreSet.has(k))) return null; // noise accidentally invariant
  const violates = (items) => { const m = multisetCounts(items); return coreKeys.some((k) => (m.get(k) || 0) !== counts[0].get(k)); };
  const wrong = [];
  const baseNoise = answer.items.filter((it) => !coreSet.has(`${it.shape}/${it.fill}`));
  for (const c of core) {
    const minus = answer.items.slice(); const idx = minus.findIndex((it) => it.shape === c.shape && it.fill === c.fill); minus.splice(idx, 1);
    wrong.push({ items: minus, code: 'missing-core', text: `lacks one ${c.fill === 'solid' ? 'solid' : 'hollow'} ${SHAPE_LABEL[c.shape]} that every cell must contain` });
    wrong.push({ items: [...answer.items, { shape: c.shape, fill: c.fill }], code: 'extra-core', text: `has one ${c.fill === 'solid' ? 'solid' : 'hollow'} ${SHAPE_LABEL[c.shape]} too many` });
    wrong.push({ items: answer.items.map((it) => (it.shape === c.shape && it.fill === c.fill ? { shape: c.shape, fill: c.fill === 'solid' ? 'none' : 'solid' } : it)), code: 'wrong-fill', text: `changes the fill of the ${SHAPE_LABEL[c.shape]}${c.n > 1 ? 's' : ''}, which is part of the fixed set` });
  }
  wrong.push({ items: [...baseNoise, ...baseNoise.length ? [] : [{ shape: noisePool[0], fill: 'none' }]], code: 'noise-only', text: 'keeps only the stray shapes and drops the fixed set' });
  const cands = wrong.filter((w) => w.items.length >= 1 && w.items.length <= 8 && violates(w.items)).map((w) => ({ cell: multiCell(w.items, rng), code: w.code, text: w.text }));
  const ds = fiveDistinct(cands, (d) => globalCellKey(d.cell), rng, globalCellKey(answer));
  if (!ds) return null;
  const coreText = core.map((c) => `${NUM[c.n]} ${c.fill === 'solid' ? 'solid' : 'hollow'} ${SHAPE_LABEL[c.shape]}${c.n > 1 ? 's' : ''}`);
  return {
    kind: 'global', cells, ...assemble(answer, ds, rng),
    explanation: {
      summary: 'Every cell contains the same fixed set of shapes; any other shapes are noise with no system.',
      rows: [`Every box contains ${coreText.join(', ')}.`],
      columns: ['Other figures may also be present, but nothing governs them: neither their type, their fill nor their position.'],
      missing: [`Only one option contains exactly ${coreText.join(', ')}; the others break the fixed set.`],
      unchanged: '',
    },
    hints: ['Look for what every single cell has in common, ignoring position.', 'List the shapes that appear in all eight cells with the same count.', `Each cell has ${coreText.join(', ')}; the rest is noise.`],
    features: { rule: 'invariant', coreTypes, noiseMax }, setRule: null,
  };
}

// ---------------------------------------------------------------- family: columnSet (each column keeps its multiset)

export function buildColumnSet(difficulty, rng) {
  const shapes = rng.shuffle(MULTI_SHAPES);
  const perColumnTypes = difficulty <= 2 ? 2 : 3;
  const total = difficulty <= 2 ? 4 : difficulty <= 4 ? 5 : 6;
  const columns = [];
  for (let c = 0; c < 3; c++) {
    const types = shapes.slice(c * perColumnTypes, (c + 1) * perColumnTypes).map((shape) => ({ shape, fill: rng.pick(['none', 'solid']) }));
    const items = [];
    for (let i = 0; i < total; i++) items.push(types[i % types.length]);
    columns.push(rng.shuffle(items));
  }
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(multiCell(rng.shuffle(columns[c]), rng));
  const answer = cells[8];
  const wrong = [];
  const col = columns[2];
  wrong.push({ items: col.slice(1), code: 'missing-one', text: 'has one shape too few for its column' });
  wrong.push({ items: [...col, col[0]], code: 'extra-one', text: 'has one shape too many for its column' });
  wrong.push({ items: col.map((it, i) => (i === 0 ? { ...it, fill: it.fill === 'solid' ? 'none' : 'solid' } : it)), code: 'wrong-fill', text: 'changes the fill of one shape' });
  wrong.push({ items: columns[1], code: 'other-column', text: 'copies the set of the middle column' });
  wrong.push({ items: col.map((it, i) => (i === 0 ? { ...it, shape: columns[0][0].shape } : it)), code: 'wrong-type', text: 'swaps one shape for a type from another column' });
  wrong.push({ items: col.slice(0, -1).concat([{ ...col[0] }]), code: 'swap-count', text: 'has the right number of shapes but the wrong mix' });
  const colKey = globalCellKey(answer);
  const cands = wrong.filter((w) => w.items.length >= 1 && w.items.length <= 8).map((w) => ({ cell: multiCell(w.items, rng), code: w.code, text: w.text })).filter((d) => globalCellKey(d.cell) !== colKey);
  const ds = fiveDistinct(cands, (d) => globalCellKey(d.cell), rng, colKey);
  if (!ds) return null;
  return {
    kind: 'global', cells, ...assemble(answer, ds, rng),
    explanation: {
      summary: 'Each column keeps the same collection of shapes; the positions inside the cell are random.',
      rows: ['Across a row the cells differ: each belongs to a different column set.'],
      columns: ['Every box in a column contains exactly the same number and types of figures.'],
      missing: [`Column 3 contains ${multisetText(col)} in every box, so the missing box does too.`],
      unchanged: '',
    },
    hints: ['Ignore positions: count the shapes of each type in a cell.', 'Compare cells in the same column with each other.', `The third column always holds ${multisetText(col)}.`],
    features: { rule: 'column-multiset', total }, setRule: null,
  };
}

// ---------------------------------------------------------------- family: composition (count grid + nested types)

export function buildComposition(difficulty, rng) {
  const chain = rng.shuffle(MULTI_SHAPES).slice(0, 5).map((shape) => ({ shape, fill: rng.pick(['none', 'solid']) }));
  // counts: v0 + r*a + c*b within 1..5
  const combos = [];
  for (const a of [-1, 1, -2, 2]) for (const b of [-1, 1, -2, 2]) for (let v0 = 1; v0 <= 5; v0++) {
    let ok = true;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const v = v0 + r * a + c * b; if (v < 1 || v > 5) ok = false; }
    if (ok && (difficulty >= 4 || (Math.abs(a) === 1 && Math.abs(b) === 1))) combos.push({ v0, a, b });
  }
  if (!combos.length) return null;
  const { v0, a, b } = rng.pick(combos);
  const grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = v0 + r * a + c * b;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(multiCell(chain.slice(0, grid[r][c]), rng));
  const answer = cells[8];
  const k = grid[2][2];
  const dom = { kind: 'ordered', values: [1, 2, 3, 4, 5], steps: [1, -1, 2, -2], arith: true };
  const known = grid.map((row) => row.map((v) => v - 1)); known[2][2] = null;
  const preds = predictAttribute(dom, known);
  if (preds.size !== 1 || !preds.has(k - 1)) return null;
  const wrong = [];
  if (k < 5) wrong.push({ items: chain.slice(0, k + 1), code: 'count-plus', text: 'has one shape too many' });
  if (k > 1) wrong.push({ items: chain.slice(0, k - 1), code: 'count-minus', text: 'has one shape too few' });
  if (k < 5) wrong.push({ items: [...chain.slice(0, k - 1), chain[k]], code: 'wrong-member', text: 'has the right number of shapes but includes a shape that only appears in larger sets' });
  if (k >= 2) wrong.push({ items: [...chain.slice(0, k - 1), chain[Math.min(4, k + 1)] || chain[0]], code: 'wrong-member', text: 'has the right number of shapes but the wrong mix' });
  if (k >= 2) wrong.push({ items: chain.slice(1, k + 1), code: 'shifted-set', text: 'drops the shape that every non-empty cell contains' });
  wrong.push({ items: chain.slice(0, k).map((it, i) => (i === 0 ? { ...it, fill: it.fill === 'solid' ? 'none' : 'solid' } : it)), code: 'wrong-fill', text: 'changes a fill' });
  wrong.push({ items: chain.slice(0, Math.min(5, k + 2)), code: 'count-plus-two', text: 'has two shapes too many' });
  const cands = wrong.filter((w) => w.items.length >= 1).map((w) => ({ cell: multiCell(w.items, rng), code: w.code, text: w.text }));
  const ds = fiveDistinct(cands, (d) => globalCellKey(d.cell), rng, globalCellKey(answer));
  if (!ds) return null;
  const chainText = chain.map((c, i) => `${i + 1}: + ${SHAPE_LABEL[c.shape]}`).join(', ');
  return {
    kind: 'global', cells, ...assemble(answer, ds, rng),
    explanation: {
      summary: 'Two things matter: how many shapes a cell holds, and which shapes appear for that number.',
      rows: [`Across each row the number of shapes ${b > 0 ? 'rises' : 'falls'} by ${Math.abs(b)}.`],
      columns: [`Down each column the number of shapes ${a > 0 ? 'rises' : 'falls'} by ${Math.abs(a)}. The shapes are nested: a cell with n shapes shows the first n of a fixed order (${chainText}).`],
      missing: [`The missing cell needs ${k} shape${k > 1 ? 's' : ''}: ${multisetText(chain.slice(0, k))}.`],
      unchanged: '',
    },
    hints: ['First count the shapes in each cell and find how the count changes along rows and columns.', 'Then notice which shapes appear whenever a cell has two shapes, three shapes, and so on.', `The gap needs ${k} shape${k > 1 ? 's' : ''}, and the set with ${k} shapes is always the same.`],
    features: { rule: 'composition', a, b }, setRule: null,
  };
}

// ---------------------------------------------------------------- family: mirrorRows (row 3 mirrors row 1)

const TRANSFORMS = {
  flipV: { g: { r: 4, f: 1 }, text: 'mirrored top to bottom' },      // vertical flip = rotate 180 ∘ flipH
  flipH: { g: { r: 0, f: 1 }, text: 'mirrored left to right' },
  rot180: { g: { r: 4, f: 0 }, text: 'turned upside down (rotated 180°)' },
  rot90: { g: { r: 2, f: 0 }, text: 'rotated 90° clockwise' },
  rot270: { g: { r: 6, f: 0 }, text: 'rotated 90° anticlockwise' },
};
const applyT = (T, cell) => { const s = compose(T.g, { r: cell.rot, f: cell.flip }); return figureCell({ ...cell, rot: s.r, flip: s.f }); };

/** Readings: row 3 = T(row 1) or row 3 = T(row 2), column 3 = T(column 1 or 2); each predicts the gap. */
export function predictMirror(cells /* 9 with cells[8] ignored */) {
  const preds = new Map();
  const add = (name, cell) => { const k = cellKey(cell); if (!preds.has(k)) preds.set(k, { cell, names: [] }); preds.get(k).names.push(name); };
  const at = (r, c) => cells[r * 3 + c];
  const same = (a, b) => cellKey(a) === cellKey(b);
  for (const [name, T] of Object.entries(TRANSFORMS)) {
    for (const src of [0, 1]) {
      if ([0, 1].every((c) => same(applyT(T, at(src, c)), at(2, c)))) add(`row3=${name}(row${src + 1})`, applyT(T, at(src, 2)));
      if ([0, 1].every((r) => same(applyT(T, at(r, src)), at(r, 2)))) add(`col3=${name}(col${src + 1})`, applyT(T, at(2, src)));
    }
  }
  return preds;
}

export function buildMirrorRows(difficulty, rng) {
  const shape = rng.pick(ORIENTED_SHAPES);
  const fill = rng.pick(['none', 'solid', 'hatched']);
  const base = { shape, fill, size: 'medium', count: 1, x: 1, y: 1, inner: 'none', innerFill: 'none' };
  const row1 = [];
  const states = rng.sample([...Array(16).keys()], 3);
  for (const s of states) row1.push(figureCell({ ...base, rot: s % 8, flip: s >= 8 ? 1 : 0 }));
  const t3 = rng.pick(difficulty <= 2 ? ['flipV', 'rot180'] : ['flipV', 'flipH', 'rot180']);
  const t2 = rng.pick(Object.keys(TRANSFORMS).filter((t) => t !== t3));
  const row2 = row1.map((c) => applyT(TRANSFORMS[t2], c));
  const row3 = row1.map((c) => applyT(TRANSFORMS[t3], c));
  // at higher levels, row 2 is scrambled so it cannot serve as an anchor
  const row2cells = difficulty >= 4 ? rng.shuffle(row2) : row2;
  const cells = [...row1, ...row2cells, ...row3];
  const preds = predictMirror(cells);
  const answerKey = cellKey(cells[8]);
  if (preds.size !== 1 || !preds.has(answerKey)) return null;
  // attribute-wise readings on rot/flip must not disagree
  const domains = makeDomains(ORIENTED_SHAPES);
  for (const attr of ['rot', 'flip']) {
    const known = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (r === 2 && c === 2 ? null : cells[r * 3 + c][attr])));
    const p = predictAttribute(domains[attr], known);
    for (const v of p.keys()) if (v !== cells[8][attr]) return null;
  }
  const answer = cells[8];
  const wrong = [];
  for (const [name, T] of Object.entries(TRANSFORMS)) if (name !== t3) wrong.push({ cell: applyT(T, row1[2]), code: `wrong-transform:${name}`, text: `applies the wrong transformation to the top cell (${T.text})` });
  wrong.push({ cell: figureCell({ ...row1[2] }), code: 'copy-top', text: 'copies the top cell of the column unchanged' });
  wrong.push({ cell: figureCell({ ...cells[7] }), code: 'copy-left', text: 'copies the cell to the left' });
  wrong.push({ cell: figureCell({ ...cells[5] }), code: 'copy-above', text: 'copies the cell above' });
  const ds = fiveDistinct(wrong, (d) => cellKey(d.cell), rng, answerKey);
  if (!ds) return null;
  return {
    kind: 'figure', cells, ...assemble(answer, ds, rng),
    explanation: {
      summary: 'The rows are transformations of one another: the bottom row is the top row transformed.',
      rows: [`Row 3 is row 1 ${TRANSFORMS[t3].text}, cell by cell.`],
      columns: [difficulty >= 4 ? 'Row 2 holds the same figures in a different order and does not help with the gap.' : `Row 2 is row 1 ${TRANSFORMS[t2].text}.`],
      missing: [`Take the top-right cell and apply the same transformation: ${TRANSFORMS[t3].text}.`],
      unchanged: `Unchanged throughout: shape (${shape}), fill (${fill === 'none' ? 'hollow' : fill === 'solid' ? 'solid' : 'striped'}).`,
    },
    hints: ['Compare the first two cells of row 3 with the cells directly above them in row 1.', 'Each bottom cell is the top cell of its column after one and the same transformation.', `Row 3 is row 1 ${TRANSFORMS[t3].text}.`],
    features: { rule: `mirror:${t3}`, row2: t2 }, setRule: null,
  };
}

export const GLOBAL_BUILDERS = { path: buildPath, split: buildSplit, invariant: buildInvariant, columnSet: buildColumnSet, composition: buildComposition, mirrorRows: buildMirrorRows };
