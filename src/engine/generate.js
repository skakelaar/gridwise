// Puzzle generator. Every puzzle is built from a structured rule specification and a deterministic seed,
// then verified: exactly one in-grammar answer, visually distinct options, distractors tied to misconceptions.
import { Rng } from './rng.js';
import { PLAIN_SHAPES, ORIENTED_SHAPES, SET_PALETTES } from './shapes.js';
import { makeDomains, FIGURE_ATTRS, figureCell, setCell, cellKey, SetOps, sameSet, paletteOps } from './cells.js';
import { makeRule, wrapValue, RULE_TYPES_BY_KIND } from './rules.js';
import { predictAttribute, predictSet } from './solver.js';
import { explainFigurePuzzle, figureHints, explainSetPuzzle, setHints, OP_TEXT } from './explain.js';
import { describeCell, valueName, ATTR_LABEL, listNames } from './text.js';

export const GROUPS = {
  orientation: { label: 'Rotation and reflection' },
  change: { label: 'Number, size, position and fill' },
  sequence: { label: 'Alternation and cyclic sequences' },
  arithmetic: { label: 'Addition and subtraction' },
  set: { label: 'Union, intersection and exclusive-or' },
  combination: { label: 'Combined rules' },
};

export const FAMILIES = {
  rotation:     { group: 'orientation', label: 'Rotation', kind: 'figure', core: { attr: 'rot', types: ['rowProg', 'colProg', 'grid'] } },
  reflection:   { group: 'orientation', label: 'Reflection', kind: 'figure', core: { attr: 'flip', types: ['rowAlt', 'colAlt', 'checker'] } },
  number:       { group: 'change', label: 'Number', kind: 'figure', core: { attr: 'count', types: ['rowProg', 'colProg', 'grid', 'latin', 'rowSum', 'colSum', 'rowDiff', 'colDiff'] } },
  size:         { group: 'change', label: 'Size', kind: 'figure', core: { attr: 'size', types: ['rowProg', 'colProg', 'latin'] } },
  position:     { group: 'change', label: 'Position', kind: 'figure', core: { attr: ['x', 'y'], types: ['rowProg', 'colProg', 'latin'] } },
  fill:         { group: 'change', label: 'Fill', kind: 'figure', core: { attr: 'fill', types: ['latin', 'rowAlt', 'colAlt', 'checker'] } },
  alternation:  { group: 'sequence', label: 'Alternation', kind: 'figure', core: { attr: ['fill', 'shape', 'size'], types: ['rowAlt', 'colAlt', 'checker'] } },
  cyclic:       { group: 'sequence', label: 'Cyclic sequence', kind: 'figure', core: { attr: ['shape', 'fill', 'size'], types: ['latin'] } },
  addition:     { group: 'arithmetic', label: 'Addition', kind: 'set', op: 'add' },
  subtraction:  { group: 'arithmetic', label: 'Subtraction', kind: 'set', op: 'subtract' },
  union:        { group: 'set', label: 'Union', kind: 'set', op: 'union' },
  intersection: { group: 'set', label: 'Intersection', kind: 'set', op: 'intersection' },
  xor:          { group: 'set', label: 'Exclusive-or', kind: 'set', op: 'xor' },
  neither:      { group: 'set', label: 'Neither (complement)', kind: 'set', op: 'neither' },
  combination:  { group: 'combination', label: 'Combination', kind: 'figure', core: null },
};

export const DIFFICULTY_LABELS = { 1: 'Basic', 2: 'Intermediate', 3: 'Advanced', 4: 'Expert', 5: 'Master', 6: 'Grandmaster' };
export const MAX_DIFFICULTY = 6;
export const FAMILY_IDS = Object.keys(FAMILIES);

const MAX_ATTEMPTS = 400;

export function generatePuzzle({ family, difficulty = 1, seed }) {
  const fam = FAMILIES[family];
  if (!fam) throw new Error(`unknown family ${family}`);
  difficulty = Math.min(MAX_DIFFICULTY, Math.max(1, Number(difficulty) || 1));
  seed = String(seed ?? '0');
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new Rng(`${family}|${difficulty}|${seed}|${attempt}`);
    const built = fam.kind === 'set'
      ? buildSetPuzzle(family, fam, difficulty, rng)
      : buildFigurePuzzle(family, fam, difficulty, rng);
    if (built) {
      built.id = `${family}-${difficulty}-${seed}`;
      built.seed = seed;
      built.family = family;
      built.familyLabel = fam.label;
      built.group = fam.group;
      built.groupLabel = GROUPS[fam.group].label;
      built.difficulty = difficulty;
      built.difficultyLabel = DIFFICULTY_LABELS[difficulty];
      built.attempt = attempt;
      return built;
    }
  }
  throw new Error(`could not generate ${family} d${difficulty} seed ${seed} within ${MAX_ATTEMPTS} attempts`);
}

// ---------------------------------------------------------------- figure puzzles

const EXTRA_POOL = {
  shape: ['latin', 'rowAlt', 'colAlt', 'checker'],
  fill: ['latin', 'rowAlt', 'colAlt', 'checker'],
  size: ['rowProg', 'colProg', 'latin', 'rowAlt', 'colAlt', 'checker'],
  count: ['rowProg', 'colProg', 'grid', 'latin', 'rowSum', 'colSum', 'rowDiff', 'colDiff'],
  rot: ['rowProg', 'colProg', 'grid'],
  flip: ['rowAlt', 'colAlt', 'checker'],
  x: ['rowProg', 'colProg', 'latin'],
  y: ['rowProg', 'colProg', 'latin'],
  inner: ['latin', 'rowAlt', 'colAlt', 'checker'],
  innerFill: ['latin', 'rowAlt', 'colAlt', 'checker'],
};
// Count arithmetic (third = first ± second) only appears from level 3; inner shapes only from level 3.
const ARITH_TYPES = ['rowSum', 'colSum', 'rowDiff', 'colDiff'];
const typesFor = (attr, types, difficulty) => {
  let out = types;
  if (difficulty < 3) out = out.filter((t) => !ARITH_TYPES.includes(t));
  return out;
};

function chooseActiveRules(family, fam, difficulty, rng) {
  const active = [];
  const used = new Set();
  const conflicts = (attr) => {
    if (used.has(attr)) return true;
    if (attr === 'count' && (used.has('x') || used.has('y') || used.has('inner') || used.has('innerFill'))) return true;
    if ((attr === 'x' || attr === 'y') && used.has('count')) return true;
    // An inner shape needs a single hollow outer figure: no count rule and no outer fill rule.
    if ((attr === 'inner' || attr === 'innerFill') && (used.has('count') || used.has('fill') || difficulty < 3)) return true;
    if (attr === 'fill' && (used.has('inner') || used.has('innerFill'))) return true;
    return false;
  };
  const push = (attr, type) => { active.push({ attr, type }); used.add(attr); };
  let target;
  if (fam.core) {
    const attr = Array.isArray(fam.core.attr) ? rng.pick(fam.core.attr) : fam.core.attr;
    push(attr, rng.pick(typesFor(attr, fam.core.types, difficulty)));
    target = Math.min(5, difficulty); // 1–5 rules; level 6 couples one of them to another
  } else {
    target = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5, 6: 5 }[difficulty];
  }
  const pool = rng.shuffle(Object.keys(EXTRA_POOL));
  for (const attr of pool) {
    if (active.length >= target) break;
    if (conflicts(attr)) continue;
    let types = typesFor(attr, EXTRA_POOL[attr], difficulty);
    if (family === 'combination' && difficulty >= 3 && active.length === 0) {
      types = types.filter((t) => t === 'grid' || t === 'latin');
      if (!types.length) continue;
    }
    push(attr, rng.pick(types));
  }
  if (active.length < target) return null;
  return active;
}

function buildFigurePuzzle(family, fam, difficulty, rng) {
  const active = chooseActiveRules(family, fam, difficulty, rng);
  if (!active) return null;
  const orientationActive = active.some((r) => r.attr === 'rot' || r.attr === 'flip');
  const positionActive = active.some((r) => r.attr === 'x' || r.attr === 'y');
  const innerActive = active.some((r) => r.attr === 'inner' || r.attr === 'innerFill');
  const shapeSet = orientationActive ? ORIENTED_SHAPES.slice() : rng.sample(PLAIN_SHAPES, 3);
  const innerSet = ['none', ...rng.sample(PLAIN_SHAPES.filter((s) => !shapeSet.includes(s)), 3)];
  const domains = makeDomains(shapeSet, innerSet);
  const rules = {};
  for (const attr of FIGURE_ATTRS) {
    const act = active.find((a) => a.attr === attr);
    if (act) {
      const opts = {};
      if (attr === 'rot') opts.maxStep = difficulty >= 3 ? 3 : 2;
      if (attr === 'count') opts.maxStep = difficulty >= 2 ? 2 : 1;
      if (attr === 'inner') opts.allowed = [1, 2, 3]; // never "no inner shape" inside an active rule
      const rule = makeRule(attr, act.type, domains[attr], rng, opts);
      if (!rule) return null;
      rules[attr] = rule;
    } else {
      let value;
      switch (attr) {
        case 'shape': value = rng.int(3); break;
        case 'fill': value = innerActive ? 0 : rng.int(3); break;
        case 'size': value = rng.pick([0, 1, 1, 2]); break;
        case 'count': value = positionActive || innerActive ? 0 : rng.pick([0, 0, 0, 1, 2]); break;
        case 'inner': value = active.some((r) => r.attr === 'innerFill') ? rng.range(1, 3) : 0; break;
        case 'innerFill': value = rng.int(3); break;
        case 'rot': value = 0; break;
        case 'flip': value = 0; break;
        case 'x': case 'y': value = 1; break;
      }
      rules[attr] = makeRule(attr, 'const', domains[attr], rng, { value });
    }
  }
  // Level 6: one extra attribute stops following its own rule and becomes a function of another attribute.
  let coupled = null;
  if (difficulty >= 6) {
    const coreAttr = active[0].attr;
    const sources = active.filter((a) => ['latin', 'rowAlt', 'colAlt', 'checker'].includes(a.type));
    const targets = active.filter((a) => a.attr !== coreAttr && ['fill', 'size', 'shape', 'inner', 'innerFill', 'flip'].includes(a.attr));
    const pairs = [];
    for (const s of sources) for (const t of targets) if (s.attr !== t.attr) pairs.push([s.attr, t.attr]);
    if (!pairs.length) return null;
    const [A, B] = rng.pick(pairs);
    const srcValues = [...new Set(rules[A].values.flat())];
    const allowedB = B === 'inner' ? [1, 2, 3] : domains[B].values.map((_, i) => i);
    if (allowedB.length < srcValues.length) return null;
    const targetsB = rng.sample(allowedB, srcValues.length);
    const map = {};
    srcValues.forEach((v, i) => { map[v] = targetsB[i]; });
    const values = rules[A].values.map((row) => row.map((v) => map[v]));
    rules[B] = { attr: B, type: 'coupled', params: { source: A, map }, values };
    coupled = { source: A, target: B };
  }
  // Materialise cells.
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const attrs = {};
    for (const attr of FIGURE_ATTRS) attrs[attr] = domains[attr].values[rules[attr].values[r][c]];
    cells.push(figureCell(attrs));
  }
  const answer = cells[8];
  // Verify uniqueness within the grammar, attribute by attribute.
  const verification = { attributes: {} };
  const predsByAttr = {};
  for (const attr of FIGURE_ATTRS) {
    const known = rules[attr].values.map((row) => row.slice());
    known[2][2] = null;
    predsByAttr[attr] = predictAttribute(domains[attr], known);
  }
  // Coupled readings: attribute B is a function of attribute A over the eight known cells, where A has a
  // unique reading of its own (snapshot, so couplings never lean on other couplings).
  const basePreds = {};
  for (const attr of FIGURE_ATTRS) basePreds[attr] = new Map(predsByAttr[attr]);
  for (const B of FIGURE_ATTRS) {
    for (const A of FIGURE_ATTRS) {
      if (A === B || basePreds[A].size !== 1) continue;
      const aPred = [...basePreds[A].keys()][0];
      const map = new Map();
      let ok = true;
      for (let r = 0; r < 3 && ok; r++) for (let c = 0; c < 3; c++) {
        if (r === 2 && c === 2) continue;
        const a = rules[A].values[r][c], b = rules[B].values[r][c];
        if (map.has(a) && map.get(a) !== b) { ok = false; break; }
        map.set(a, b);
      }
      if (!ok || map.size < 2 || map.size > 3 || !map.has(aPred)) continue;
      const v = map.get(aPred);
      if (!predsByAttr[B].has(v)) predsByAttr[B].set(v, []);
      predsByAttr[B].get(v).push(`coupled:${A}`);
    }
  }
  for (const attr of FIGURE_ATTRS) {
    const preds = predsByAttr[attr];
    const expected = rules[attr].values[2][2];
    verification.attributes[attr] = { predictions: [...preds.entries()].map(([v, names]) => ({ value: domains[attr].values[v], hypotheses: names })) };
    if (preds.size !== 1 || !preds.has(expected)) return null;
  }
  // Distractors.
  const ruleList = FIGURE_ATTRS.map((a) => rules[a]);
  const options = buildFigureOptions(ruleList, domains, cells, rng);
  if (!options) return null;
  const explanation = explainFigurePuzzle(ruleList, domains, family, answer);
  const hints = figureHints(ruleList, domains, family);
  void coupled;
  const activeRules = ruleList.filter((r) => r.type !== 'const');
  return finish({
    kind: 'figure',
    rules: ruleList.map((r) => ({ attr: r.attr, type: r.type, params: r.params, values: r.values, label: ATTR_LABEL[r.attr] })),
    domains,
    cells,
    options: options.cells,
    correctIndex: options.correctIndex,
    distractors: options.distractors,
    explanation,
    hints,
    verification,
    features: {
      ruleCount: activeRules.length,
      rules: activeRules.map((r) => `${r.attr}:${r.type}`),
      twoDirection: activeRules.some((r) => r.type === 'grid' || r.type === 'latin' || r.type === 'checker'),
      orientation: orientationActive,
      inner: innerActive,
      arithmetic: activeRules.some((r) => ARITH_TYPES.includes(r.type)),
      coupled: activeRules.some((r) => r.type === 'coupled'),
      maxStep: Math.max(0, ...activeRules.map((r) => Math.abs(r.params.step ?? r.params.a ?? 0), ...activeRules.map((r) => Math.abs(r.params.b ?? 0)))),
    },
  });
}

function misconceptions(rule, domain, rng) {
  const V = rule.values;
  const p = rule.params;
  const attr = rule.attr;
  const label = ATTR_LABEL[attr];
  const out = [];
  const seen = new Set([V[2][2]]);
  const w = (v) => wrapValue(domain, v);
  const name = (v) => valueName(attr, domain.values[v]);
  const add = (value, code, text) => {
    if (value === null || value === undefined || value < 0 || value >= domain.values.length || seen.has(value)) return;
    seen.add(value);
    out.push({ attr, value, code, text });
  };
  switch (rule.type) {
    case 'rowProg':
      add(V[2][1], 'repeat-left', `repeats the ${label} of the cell to its left instead of applying the change once more`);
      add(w(V[2][1] - p.step), 'reverse-step', `applies the ${label} change in the wrong direction`);
      add(w(V[2][1] + 2 * p.step), 'double-step', `applies the ${label} change twice`);
      add(V[1][2], 'repeat-above', `copies the ${label} from the cell above; this rule runs along the rows, not down the columns`);
      break;
    case 'colProg':
      add(V[1][2], 'repeat-above', `repeats the ${label} of the cell above instead of applying the change once more`);
      add(w(V[1][2] - p.step), 'reverse-step', `applies the ${label} change in the wrong direction`);
      add(w(V[1][2] + 2 * p.step), 'double-step', `applies the ${label} change twice`);
      add(V[2][1], 'repeat-left', `copies the ${label} from the cell to the left; this rule runs down the columns, not along the rows`);
      break;
    case 'grid':
      add(V[2][1], 'repeat-left', `repeats the ${label} of the cell to its left instead of continuing the change`);
      add(V[1][2], 'repeat-above', `repeats the ${label} of the cell above instead of continuing the change`);
      add(w(V[2][1] - p.b), 'reverse-step', `applies the ${label} change in the wrong direction`);
      add(w(V[2][1] + 2 * p.b), 'double-step', `applies the ${label} change twice`);
      break;
    case 'rowSum': case 'rowDiff': case 'colSum': case 'colDiff': {
      const isRow = rule.type.startsWith('row');
      const first = domain.values[isRow ? V[2][0] : V[0][2]];
      const second = domain.values[isRow ? V[2][1] : V[1][2]];
      const idx = (n) => domain.values.indexOf(n);
      const other = rule.type.endsWith('Sum') ? first - second : first + second;
      add(idx(other), 'wrong-arith', rule.type.endsWith('Sum') ? 'subtracts the two counts instead of adding them' : 'adds the two counts instead of subtracting them');
      add(idx(domain.values[V[2][2]] + 1), 'off-by-one', 'miscounts by one');
      add(idx(domain.values[V[2][2]] - 1), 'off-by-one', 'miscounts by one');
      add(isRow ? V[2][1] : V[1][2], isRow ? 'repeat-left' : 'repeat-above', `repeats the ${label} of the ${isRow ? 'cell to its left' : 'cell above'} instead of combining the two counts`);
      break;
    }
    case 'coupled': {
      const others = Object.values(p.map).filter((v) => v !== V[2][2]);
      for (const o of others.slice(0, 2)) add(o, 'wrong-link', `pairs the ${label} with the wrong ${ATTR_LABEL[p.source]}: the link is fixed cell by cell`);
      add(V[2][1], 'repeat-left', `repeats the ${label} of the cell to its left instead of following the link to the ${ATTR_LABEL[p.source]}`);
      add(V[1][2], 'repeat-above', `repeats the ${label} of the cell above instead of following the link to the ${ATTR_LABEL[p.source]}`);
      break;
    }
    case 'latin':
      add(V[2][1], 'repeat-left', `repeats a ${label} already used in row 3 (${name(V[2][1])}); each row needs one of each`);
      add(V[1][2], 'repeat-above', `repeats a ${label} already used in column 3 (${name(V[1][2])}); each column needs one of each`);
      add(V[2][0], 'repeat-row-start', `repeats a ${label} already used in row 3 (${name(V[2][0])})`);
      break;
    case 'rowAlt': case 'colAlt': case 'checker': {
      add(p.B, 'alt-other', `keeps changing to ${name(p.B)}; the ${label} alternates and returns to ${name(p.A)} on the third cell`);
      const others = domain.values.map((_, i) => i).filter((i) => i !== p.A && i !== p.B);
      if (others.length) { const o = rng ? rng.pick(others) : others[0]; add(o, 'alt-new', `introduces a ${label} (${name(o)}) that appears nowhere in the matrix`); }
      break;
    }
    case 'const': {
      const others = domain.values.map((_, i) => i).filter((i) => i !== p.value);
      for (const o of (rng ? rng.shuffle(others) : others).slice(0, 2)) add(o, 'changed-constant', `changes the ${label} to ${name(o)}, although it stays the same throughout the matrix`);
      break;
    }
  }
  return out;
}

// Multi-shape layouts are always centred: a cell with several copies never carries an off-centre position.
function validFigure(cell) { return Number.isInteger(cell.count) && (cell.count === 1 || (cell.x === 1 && cell.y === 1)) && (cell.count === 1 || !cell.inner || cell.inner === 'none'); }

// Distractor construction for figure puzzles.
//
// Every distractor is one or two named misconceptions applied to the answer. The set is arranged so that the
// answer is never the per-attribute majority of the six options (a "majority vote" over the options must not
// reveal it): for a single rule, one wrong value is repeated; for several rules, two attributes a1 and a2 carry
// repeated wrong values w1 and w2 and the pair (w1, w2) — usually the cell to the left of the gap — appears too.
function buildFigureOptions(ruleList, domains, cells, rng) {
  const answer = cells[8];
  const active = ruleList.filter((r) => r.type !== 'const');
  const M = {};
  for (const r of active) M[r.attr] = misconceptions(r, domains[r.attr], rng);
  const withAttr = (base, attr, idx) => figureCell({ ...base, [attr]: domains[attr].values[idx] });
  const apply = (changes) => ({
    cell: changes.reduce((c, ch) => withAttr(c, ch.attr, ch.value), answer),
    code: changes.map((c) => c.code).join('+'),
    attrs: changes.map((c) => c.attr),
    text: changes.map((c) => c.text).join('; and '),
  });
  // Fillers only touch constant attributes (never rotate plain shapes, never move multi-shape layouts).
  const fillers = [];
  for (const rule of ruleList) {
    if (rule.type !== 'const') continue;
    if (rule.attr === 'rot' || rule.attr === 'flip' || rule.attr === 'x' || rule.attr === 'y') continue;
    if (rule.attr === 'count' && (answer.x !== 1 || answer.y !== 1 || (answer.inner && answer.inner !== 'none'))) continue;
    if ((rule.attr === 'inner' || rule.attr === 'innerFill') && (!answer.inner || answer.inner === 'none')) continue;
    if (rule.attr === 'fill' && answer.inner && answer.inner !== 'none') continue;
    for (const m of misconceptions(rule, domains[rule.attr], rng)) fillers.push(m);
  }
  const fillerOrder = rng.shuffle(fillers);

  let plan;
  if (active.length === 1) {
    const ms = M[active[0].attr];
    if (!ms.length) return null;
    const pickM = (i) => ms[Math.min(i, ms.length - 1)];
    plan = [[ms[0]], [ms[0]], [pickM(1)], [pickM(2)], [pickM(3)]];
  } else {
    const order = rng.shuffle(active.map((r) => r.attr));
    const [a1, a2, a3] = order;
    if (!M[a1].length || !M[a2].length) return null;
    const w1 = M[a1][0], y1 = M[a1][1] || M[a1][0];
    const w2 = M[a2][0], x1 = M[a2][1] || M[a2][0];
    const extra = a3 && M[a3].length ? M[a3][0] : x1;
    plan = [[w1], [w1, extra], [w1, w2], [w2], [w2, y1]];
  }

  const used = new Set([cellKey(answer)]);
  const chosen = [];
  for (const changes of plan) {
    let cand = apply(changes);
    if (used.has(cellKey(cand.cell))) {
      for (const f of fillerOrder) {
        const c2 = apply([...changes, f]);
        if (!validFigure(c2.cell) || used.has(cellKey(c2.cell))) continue;
        cand = c2; break;
      }
    }
    const k = cellKey(cand.cell);
    if (used.has(k) || !validFigure(cand.cell)) return null;
    used.add(k);
    // Whole-cell copies get their classic label.
    if (cellKey(cand.cell) === cellKey(cells[7])) cand = { ...cand, code: 'copy-left', text: 'copies the cell to the left of the gap' };
    else if (cellKey(cand.cell) === cellKey(cells[5])) cand = { ...cand, code: 'copy-above', text: 'copies the cell above the gap' };
    else if (cellKey(cand.cell) === cellKey(cells[4])) cand = { ...cand, code: 'copy-centre', text: 'copies the centre cell' };
    chosen.push(cand);
  }
  return assembleOptions(answer, chosen, rng);
}

function assembleOptions(answer, chosen, rng) {
  const all = rng.shuffle([{ cell: answer, correct: true }, ...chosen]);
  const correctIndex = all.findIndex((o) => o.correct);
  const distractors = all.map((o, i) => (o.correct ? null : { index: i, code: o.code, text: o.text, attrs: o.attrs ?? [] }));
  return { cells: all.map((o) => o.cell), correctIndex, distractors };
}

// ---------------------------------------------------------------- set puzzles

const SET_OP_FN = {
  add: SetOps.union,
  subtract: SetOps.diffAB,
  union: SetOps.union,
  intersection: SetOps.intersection,
  xor: SetOps.xor,
  neither: null, // bound per palette in buildSetPuzzle
};
function setOpFns(palette) { return { ...SET_OP_FN, neither: paletteOps(palette).neither }; }

function genPair(op, elements, sizes, rng) {
  const all = elements;
  const k = rng.range(sizes[0], Math.min(sizes[1], all.length - 1));
  const A = rng.sample(all, k);
  const rest = all.filter((e) => !A.includes(e));
  let B;
  switch (op) {
    case 'neither': {
      // A and B must leave something uncovered, and overlap so the complement of the union differs from
      // the complement of the intersection and from the exclusive-or.
      if (A.length < 2 || rest.length < 2) return null;
      const shared = rng.sample(A, rng.range(1, A.length - 1));
      const extra = rng.sample(rest, rng.range(1, rest.length - 1));
      B = [...shared, ...extra];
      break;
    }
    case 'add': {
      if (!rest.length) return null;
      B = rng.sample(rest, rng.range(1, Math.min(rest.length, sizes[1])));
      break;
    }
    case 'subtract': {
      if (A.length < 2) return null;
      B = rng.sample(A, rng.range(1, A.length - 1));
      break;
    }
    default: {
      // overlap at least 1, and neither subset of the other
      if (A.length < 2 || !rest.length) return null;
      const shared = rng.sample(A, rng.range(1, A.length - 1));
      const extra = rng.sample(rest, rng.range(1, Math.min(rest.length, 2)));
      B = [...shared, ...extra];
    }
  }
  const C = setOpFns(all === SET_PALETTES.dots.elements ? 'dots' : 'lines')[op](A, B);
  if (!C.length || sameSet(C, A) || sameSet(C, B)) return null;
  const sortByPalette = (m) => m.slice().sort((x, y) => all.indexOf(x) - all.indexOf(y));
  return { A: sortByPalette(A), B: sortByPalette(B), C: sortByPalette(C) };
}

function buildSetPuzzle(family, fam, difficulty, rng) {
  const op = fam.op;
  const palette = difficulty === 1 ? 'lines' : difficulty === 2 ? rng.pick(['lines', 'dots']) : 'dots';
  const orientation = difficulty === 1 ? 'row' : rng.pick(['row', 'col']);
  const sizes = { 1: [2, 3], 2: [2, 4], 3: [3, 5], 4: [4, 6], 5: [5, 7], 6: [5, 7] }[difficulty];
  const elements = SET_PALETTES[palette].elements;
  const grid = [[null, null, null], [null, null, null], [null, null, null]];
  let colOp = null;
  if (difficulty >= 6 && ['union', 'intersection', 'xor'].includes(op)) {
    // Two-way: rows combine by `op`, columns by a different operation, and the corner satisfies both.
    const fns = setOpFns(palette);
    colOp = rng.pick(['union', 'intersection', 'xor'].filter((o) => o !== op));
    const R = fns[op], Cf = fns[colOp];
    let found = null;
    for (let tries = 0; tries < 200 && !found; tries++) {
      const free = [0, 1, 2, 3].map(() => rng.sample(elements, rng.range(sizes[0] - 1, sizes[1] - 1)));
      const [a, b, c, d] = free;
      const g = [[a, b, R(a, b)], [c, d, R(c, d)], [Cf(a, c), Cf(b, d), null]];
      const corner = R(g[2][0], g[2][1]);
      if (!sameSet(corner, Cf(g[0][2], g[1][2]))) continue;
      g[2][2] = corner;
      const flat = g.flat();
      if (flat.some((m) => !m.length)) continue;
      if (sameSet(corner, g[2][0]) || sameSet(corner, g[2][1]) || sameSet(corner, g[0][2]) || sameSet(corner, g[1][2])) continue;
      const keys = flat.map((m) => m.slice().sort().join(','));
      if (new Set(keys).size < 7) continue;
      found = g;
    }
    if (!found) return null;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) grid[r][c] = found[r][c].slice().sort((x, y) => elements.indexOf(x) - elements.indexOf(y));
  } else {
    const lines = [];
    for (let i = 0; i < 3; i++) {
      const pair = genPair(op, elements, sizes, rng);
      if (!pair) return null;
      lines.push(pair);
    }
    for (let i = 0; i < 3; i++) {
      const { A, B, C } = lines[i];
      if (orientation === 'row') { grid[i][0] = A; grid[i][1] = B; grid[i][2] = C; }
      else { grid[0][i] = A; grid[1][i] = B; grid[2][i] = C; }
    }
  }
  const known = grid.map((row) => row.slice());
  known[2][2] = null;
  const preds = predictSet(palette, known);
  if (preds.length !== 1 || !sameSet(preds[0].members, grid[2][2])) return null;
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cells.push(setCell(palette, grid[r][c]));
  const answer = cells[8];
  const options = buildSetOptions(op, colOp ? 'row' : orientation, palette, grid, cells, rng, difficulty);
  if (!options) return null;
  return finish({
    kind: 'set',
    setRule: { op, orientation: colOp ? 'row' : orientation, palette, opLabel: OP_TEXT[op].name, colOp },
    rules: [],
    cells,
    options: options.cells,
    correctIndex: options.correctIndex,
    distractors: options.distractors,
    explanation: explainSetPuzzle(op, colOp ? 'row' : orientation, palette, known, answer, colOp),
    hints: setHints(op, colOp ? 'row' : orientation, colOp),
    verification: { set: { predictions: preds.map((p) => ({ members: p.members, hypotheses: p.names })) } },
    features: { ruleCount: colOp ? 2 : 1, rules: colOp ? [`set:${op}:row`, `set:${colOp}:col`] : [`set:${op}:${orientation}`], palette, paletteSize: elements.length, maxSetSize: sizes[1], orientation: colOp ? 'row' : orientation, twoWay: !!colOp },
  });
}

function buildSetOptions(op, orientation, palette, grid, cells, rng, difficulty = 1) {
  const answer = cells[8];
  const answerMembers = grid[2][2];
  const first = orientation === 'row' ? grid[2][0] : grid[0][2];
  const second = orientation === 'row' ? grid[2][1] : grid[1][2];
  const elements = SET_PALETTES[palette].elements;
  const names = SET_PALETTES[palette].names;
  const mk = (members, code, text) => ({ cell: setCell(palette, members), code, attrs: [], text });
  const isCopy = (m) => sameSet(m, first) || sameSet(m, second);
  const wrongOps = [];
  for (const [other, fn] of Object.entries(setOpFns(palette))) {
    if (other === op || other === 'add') continue; // 'add' and 'union' give the same set; label the misreading as union
    const m = fn(first, second);
    if (m.length && !sameSet(m, answerMembers) && !isCopy(m)) {
      wrongOps.push(mk(m, `wrong-op:${other}`, `uses ${OP_TEXT[other].name} instead of ${OP_TEXT[op].name}: ${OP_TEXT[other].how}`));
    }
  }
  if (op !== 'subtract') {
    const m = SetOps.diffBA(first, second);
    if (m.length && !sameSet(m, answerMembers) && !isCopy(m)) wrongOps.push(mk(m, 'wrong-op:subtract-reversed', 'subtracts the first cell from the second instead of combining them correctly'));
  }
  const along = orientation === 'row' ? 'row' : 'column';
  const copies = [
    mk(first, 'copy-first', `copies the first cell of ${along} 3 instead of combining the two cells`),
    mk(second, 'copy-second', `copies the second cell of ${along} 3 instead of combining the two cells`),
    mk(orientation === 'row' ? grid[1][2] : grid[2][1], orientation === 'row' ? 'copy-above' : 'copy-left', `copies the neighbouring cell ${orientation === 'row' ? 'above' : 'to the left of'} the gap`),
  ];
  const nearMisses = [];
  if (answerMembers.length >= 2) {
    for (const e of rng.shuffle(answerMembers).slice(0, 2)) nearMisses.push(mk(answerMembers.filter((x) => x !== e), 'missing-one', `leaves out one element (the ${names[e]})`));
  }
  const notIn = elements.filter((e) => !answerMembers.includes(e));
  for (const e of rng.shuffle(notIn).slice(0, 2)) nearMisses.push(mk([...answerMembers, e], 'extra-one', `includes an extra element (the ${names[e]})`));
  const random = [];
  for (let i = 0; i < 6; i++) {
    const k = rng.range(1, Math.min(elements.length, Math.max(2, answerMembers.length + 1)));
    random.push(mk(rng.sample(elements, k), 'other-set', 'does not follow from the operation'));
  }
  // Recipe: two balanced clusters of three — the answer with two near misses, and a primary misconception W
  // (a wrong operation, else a copied cell) with two near misses of its own — so that neither cluster can be
  // told from the other without reading the matrix, and a per-element majority vote never singles out the answer.
  const pool = [...rng.shuffle(wrongOps), ...rng.shuffle(copies)];
  const used = new Set([cellKey(answer)]);
  const chosen = [];
  const take = (cand) => {
    if (!cand || !cand.cell.members.length) return false;
    const k = cellKey(cand.cell);
    if (used.has(k)) return false;
    used.add(k);
    chosen.push(cand);
    return true;
  };
  const nearMissesOf = (base, codeSuffix, textSuffix) => {
    const out = [];
    const notInBase = rng.shuffle(elements.filter((e) => !base.cell.members.includes(e)));
    const inBase = rng.shuffle(base.cell.members);
    if (inBase.length >= 2) for (const e of inBase.slice(0, 2)) out.push(mk(base.cell.members.filter((x) => x !== e), `${codeSuffix}missing-one`, `${textSuffix}leaves out one element (the ${names[e]})`));
    for (const e of notInBase.slice(0, 2)) out.push(mk([...base.cell.members, e], `${codeSuffix}extra-one`, `${textSuffix}includes an extra element (the ${names[e]})`));
    return rng.shuffle(out);
  };
  const W = pool[0];
  if (!W) return null;
  take(W);
  const wMisses = difficulty >= 5 ? 1 : 2;
  const aMisses = difficulty >= 5 ? 3 : 2;
  let n = 0;
  for (const c of nearMissesOf(W, `${W.code}+`, `${W.text}; and `)) { if (n >= wMisses) break; if (take(c)) n++; }
  n = 0;
  for (const c of rng.shuffle(nearMisses)) { if (n >= aMisses) break; if (take(c)) n++; }
  for (const c of [...pool.slice(1), ...random]) { if (chosen.length >= 5) break; take(c); }
  if (chosen.length < 5) return null;
  return assembleOptions(answer, chosen, rng);
}

// ---------------------------------------------------------------- shared finishing

function finish(p) {
  // Visual distinctness of options and single correct option.
  const keys = p.options.map(cellKey);
  if (new Set(keys).size !== keys.length) return null;
  const answerKey = cellKey(p.cells[8]);
  if (keys.filter((k) => k === answerKey).length !== 1 || keys[p.correctIndex] !== answerKey) return null;
  p.description = {
    matrix: [0, 1, 2].map((r) => `Row ${r + 1}: ${[0, 1, 2].map((c) => (r === 2 && c === 2 ? 'missing cell' : describeCell(p.cells[r * 3 + c]))).join('; ')}.`).join(' '),
    cells: p.cells.map((c, i) => (i === 8 ? 'missing cell' : describeCell(c))),
    options: p.options.map((c) => describeCell(c)),
  };
  return p;
}

export function listFamilies() {
  return FAMILY_IDS.map((id) => ({ id, ...FAMILIES[id], group: FAMILIES[id].group, groupLabel: GROUPS[FAMILIES[id].group].label }));
}

export function randomSeed(rng = new Rng(Date.now() ^ (Math.random() * 1e9))) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[rng.int(chars.length)];
  return s;
}
