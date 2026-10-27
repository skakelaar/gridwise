// Composite cells: a main figure that follows attribute rules along one axis (rotation, fill, reflection, shape)
// while a set of small marks attached around it combines along the other axis by a set operation.
// Two engines share one cell, so the puzzle is only accepted when BOTH layers predict the gap uniquely:
// the figure layer through the attribute grammar (solver.js) and the mark layer through the set grammar.
import { ORIENTED_SHAPES, SET_PALETTES, transformConflict } from './shapes.js';
import { makeDomains, compositeCell, cellKey, SetOps, paletteOps, sameSet } from './cells.js';
import { makeRule } from './rules.js';
import { predictAttribute, predictSet, reverseSetReadings } from './solver.js';
import { explainRule, OP_TEXT } from './explain.js';
import { valueName, ATTR_LABEL, listNames, describeCell } from './text.js';

const PARTS = SET_PALETTES.parts.elements;
const PART_NAMES = SET_PALETTES.parts.names;
const FIG_ATTRS = ['shape', 'fill', 'rot', 'flip'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function opFns() { return { add: SetOps.union, union: SetOps.union, subtract: SetOps.diffAB, intersection: SetOps.intersection, xor: SetOps.xor, neither: paletteOps('parts').neither }; }

/** One line of the mark layer: two inputs and their combination, all non-empty and pairwise different. */
function makeLine(op, sizes, rng) {
  const k = rng.range(sizes[0], Math.min(sizes[1], PARTS.length - 1));
  const A = rng.sample(PARTS, k);
  const rest = PARTS.filter((e) => !A.includes(e));
  let B;
  switch (op) {
    case 'neither':
      if (A.length < 2 || rest.length < 2) return null;
      B = [...rng.sample(A, rng.range(1, A.length - 1)), ...rng.sample(rest, rng.range(1, rest.length - 1))];
      break;
    case 'add':
      if (!rest.length) return null;
      B = rng.sample(rest, rng.range(1, Math.min(rest.length, sizes[1])));
      break;
    case 'subtract':
      if (A.length < 2) return null;
      B = rng.sample(A, rng.range(1, A.length - 1));
      break;
    default:
      if (A.length < 2 || !rest.length) return null;
      B = [...rng.sample(A, rng.range(1, A.length - 1)), ...rng.sample(rest, rng.range(1, Math.min(rest.length, 2)))];
  }
  const C = opFns()[op](A, B);
  if (!C.length || sameSet(C, A) || sameSet(C, B)) return null;
  return [A, B, C];
}

/** Figure-layer rule plan per level. `axis` is where the main progression runs ('row' or 'col'). */
function figureRules(difficulty, axis, rng, domains) {
  const along = (t) => (axis === 'row' ? t : t.replace('row', 'col'));
  const rules = {};
  const rotTypes = difficulty <= 2 ? [along('rowProg')] : difficulty <= 4 ? [along('rowProg'), 'latin'] : [along('rowProg'), 'latin', 'grid'];
  rules.rot = makeRule('rot', rng.pick(rotTypes), domains.rot, rng, { maxStep: difficulty <= 1 ? 2 : difficulty <= 3 ? 3 : 4 });
  const fillTypes = difficulty <= 1 ? ['const'] : difficulty === 2 ? ['const', along('rowAlt')] : difficulty <= 4 ? [along('rowAlt'), 'latin'] : [along('rowAlt'), 'latin', 'checker'];
  rules.fill = makeRule('fill', rng.pick(fillTypes), domains.fill, rng);
  const flipTypes = difficulty <= 3 ? ['const'] : difficulty <= 5 ? ['const', along('rowAlt')] : [along('rowAlt'), 'checker'];
  const flipType = rng.pick(flipTypes);
  rules.flip = flipType === 'const' ? makeRule('flip', 'const', domains.flip, rng, { value: difficulty >= 5 ? rng.int(2) : 0 }) : makeRule('flip', flipType, domains.flip, rng);
  const shapeTypes = difficulty <= 4 ? ['const'] : ['const', 'latin'];
  rules.shape = makeRule('shape', rng.pick(shapeTypes), domains.shape, rng);
  if (Object.values(rules).some((r) => !r)) return null;
  // Rotation progressions with step 4 (180°) read as alternation as well; keep them out below level 5.
  if (rules.rot.type !== 'const' && rules.rot.params.step !== undefined && Math.abs(rules.rot.params.step) === 4 && difficulty < 5) return null;
  return rules;
}

export function buildComposite(difficulty, rng) {
  const d = Math.min(6, Math.max(1, difficulty));
  const figAxis = d <= 3 ? 'row' : rng.pick(['row', 'col']);
  const setAxis = figAxis === 'row' ? 'col' : 'row';
  // A triangle shows rotation but not reflection; it is only used while reflection stays constant.
  const flipMayVary = d >= 4;
  const shapeSet = flipMayVary ? ORIENTED_SHAPES : [...ORIENTED_SHAPES, 'triangle'];
  const domains = makeDomains(shapeSet);
  const rules = figureRules(d, figAxis, rng, domains);
  if (!rules) return null;
  const ops = { 1: ['add', 'union'], 2: ['add', 'union', 'subtract'], 3: ['union', 'subtract', 'intersection'], 4: ['union', 'subtract', 'intersection', 'xor'], 5: ['subtract', 'intersection', 'xor', 'neither'], 6: ['intersection', 'xor', 'neither'] }[d];
  const op = rng.pick(ops);
  const sizes = { 1: [1, 2], 2: [1, 3], 3: [2, 3], 4: [2, 4], 5: [2, 4], 6: [2, 4] }[d];
  const partsGrid = [[null, null, null], [null, null, null], [null, null, null]];
  for (let i = 0; i < 3; i++) {
    const line = makeLine(op, sizes, rng);
    if (!line) return null;
    for (let j = 0; j < 3; j++) { if (setAxis === 'row') partsGrid[i][j] = line[j]; else partsGrid[j][i] = line[j]; }
  }
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    cells.push(compositeCell({
      shape: domains.shape.values[rules.shape.values[r][c]],
      fill: domains.fill.values[rules.fill.values[r][c]],
      rot: domains.rot.values[rules.rot.values[r][c]],
      flip: domains.flip.values[rules.flip.values[r][c]],
      parts: partsGrid[r][c],
    }));
  }
  const answer = cells[8];
  // Uniqueness, layer by layer: every reading of each figure attribute must give the answer's value …
  for (const attr of FIG_ATTRS) {
    const known = rules[attr].values.map((row) => row.slice());
    known[2][2] = null;
    const preds = predictAttribute(domains[attr], known);
    if (preds.size !== 1 || !preds.has(rules[attr].values[2][2])) return null;
  }
  // … no rigid-transformation reading of the rows or columns may point elsewhere …
  if (transformConflict(cells)) return null;
  // … and the mark layer must admit exactly one set reading.
  const knownParts = partsGrid.map((row) => row.slice());
  knownParts[2][2] = null;
  const setPreds = predictSet('parts', knownParts);
  if (setPreds.length !== 1 || !sameSet(setPreds[0].members, answer.parts)) return null;
  // Eight visible cells should not all share the same marks (then the mark layer would be invisible).
  if (new Set(cells.slice(0, 8).map((c) => c.parts.join(','))).size < 3) return null;
  // Cross-layer couplings: the marks must not be a fixed function of a figure attribute (or the reverse) that
  // points to a different gap, otherwise a distractor would be lawful under "same rotation, same marks".
  if (crossLayerConflict(cells)) return null;

  const options = buildCompositeOptions(cells, rules, domains, op, setAxis, partsGrid, d, rng);
  if (!options) return null;
  if (options.options.some(c => !sameSet(c.parts, answer.parts) && reverseSetReadings('parts', knownParts, c.parts).length)) return null;
  const active = FIG_ATTRS.filter((a) => rules[a].type !== 'const').map((a) => rules[a]);
  return {
    rules: Object.values(rules),
    domains,
    setRule: { op, orientation: setAxis, palette: 'parts', opLabel: OP_TEXT[op].name, colOp: null, framing: null },
    cells,
    options: options.options,
    correctIndex: options.correctIndex,
    distractors: options.distractors,
    explanation: explainComposite(active, domains, op, setAxis, knownParts, answer, rules),
    hints: compositeHints(active, domains, op, setAxis),
    verification: { figure: Object.fromEntries(FIG_ATTRS.map((a) => [a, rules[a].type])), set: { predictions: setPreds.map((p) => ({ members: p.members, hypotheses: p.names })) } },
    features: { ruleCount: active.length + 1, rules: [...active.map((r) => `${r.attr}:${r.type}`), `set:${op}:${setAxis}`], figureAxis: figAxis, setAxis, op, maxSetSize: sizes[1], composite: true },
  };
}

/** True when, over the eight visible cells, marks = f(attr) or attr = f(marks) holds and predicts a gap other than cells[8]. */
export function crossLayerConflict(cells) {
  const known = cells.slice(0, 8);
  const gap = cells[8];
  const partsKey = (c) => c.parts.join(',');
  for (const attr of FIG_ATTRS) {
    const values = new Set(known.map((c) => c[attr]));
    if (values.size < 2 || values.size > 3) continue;
    // marks as a function of the attribute
    const m = new Map(); let ok = true;
    for (const c of known) { const k = c[attr]; if (m.has(k) && m.get(k) !== partsKey(c)) { ok = false; break; } m.set(k, partsKey(c)); }
    if (ok && m.has(gap[attr]) && m.get(gap[attr]) !== partsKey(gap)) return true;
    // the attribute as a function of the marks
    const r = new Map(); ok = true;
    for (const c of known) { const k = partsKey(c); if (r.has(k) && r.get(k) !== c[attr]) { ok = false; break; } r.set(k, c[attr]); }
    if (ok && r.size >= 2 && r.has(partsKey(gap)) && r.get(partsKey(gap)) !== gap[attr]) return true;
  }
  return false;
}

function buildCompositeOptions(cells, rules, domains, op, setAxis, partsGrid, difficulty, rng) {
  const answer = cells[8];
  const first = setAxis === 'row' ? partsGrid[2][0] : partsGrid[0][2];
  const second = setAxis === 'row' ? partsGrid[2][1] : partsGrid[1][2];
  const along = setAxis === 'row' ? 'row' : 'column';
  const mk = (over, code, text) => ({ cell: compositeCell({ ...answer, ...over }), code, text, attrs: [] });
  const isCopy = (m) => sameSet(m, first) || sameSet(m, second);
  // Primary misconception on the mark layer: a different set operation (or, failing that, a copied input).
  const wrongOps = [];
  const fns = opFns();
  for (const [other, fn] of Object.entries(fns)) {
    if (other === op || other === 'add' || (op === 'add' && other === 'union')) continue;
    if (other === 'neither' && difficulty < 4) continue; // a complement misreading is not plausible before complements appear
    const m = fn(first, second);
    if (m.length && !sameSet(m, answer.parts) && !isCopy(m)) wrongOps.push(mk({ parts: m }, `wrong-op:${other}`, `uses ${OP_TEXT[other].name} for the marks instead of ${OP_TEXT[op].name}: ${OP_TEXT[other].how}`));
  }
  if (op !== 'subtract') {
    const m = SetOps.diffBA(first, second);
    if (m.length && !sameSet(m, answer.parts) && !isCopy(m)) wrongOps.push(mk({ parts: m }, 'wrong-op:subtract-reversed', 'subtracts the first cell\'s marks from the second instead of combining them correctly'));
  }
  const copies = [
    mk({ parts: first }, 'copy-first', `copies the marks of the first cell of ${along} 3 instead of combining the two cells`),
    mk({ parts: second }, 'copy-second', `copies the marks of the second cell of ${along} 3 instead of combining the two cells`),
  ];
  // Figure-layer misreadings: one attribute off, the rest right.
  const figMisses = [];
  const addFig = (attr, value, code, text) => { if (value !== undefined && value !== null && value !== answer[attr]) figMisses.push(mk({ [attr]: value }, code, text)); };
  const rot = rules.rot;
  const step = rot.params.step ?? rot.params.b ?? 1;
  addFig('rot', ((answer.rot - step) % 8 + 8) % 8, 'rot-short', 'stops one turn short: the figure has not turned on from the previous cell');
  addFig('rot', ((answer.rot + step) % 8 + 8) % 8, 'rot-over', 'turns the figure one step too far');
  addFig('rot', ((answer.rot - 2 * step) % 8 + 8) % 8, 'rot-back', 'turns the figure the wrong way');
  if (rules.fill.type !== 'const') addFig('fill', cells[7].fill === answer.fill ? cells[5].fill : cells[7].fill, 'fill-continued', 'keeps the fill of a neighbouring cell instead of following the fill pattern');
  else addFig('fill', domains.fill.values.find((f) => f !== answer.fill), 'fill-changed', 'changes the fill, which never changes in this matrix');
  if (rules.flip.type !== 'const' && domains.shape.values.includes(answer.shape) && answer.shape !== 'triangle') addFig('flip', answer.flip ? 0 : 1, 'flip-wrong', 'has the figure facing the wrong way');
  if (rules.shape.type !== 'const') addFig('shape', cells[7].shape === answer.shape ? cells[5].shape : cells[7].shape, 'shape-repeated', 'repeats a shape that already appears in the row and column');
  // Mark-layer near misses.
  const nearOf = (base) => {
    const out = [];
    for (const e of rng.shuffle(base.cell.parts).slice(0, 2)) out.push(mk({ ...base.cell, parts: base.cell.parts.filter((x) => x !== e) }, `${base.code}+missing-one`, `${base.text}; and leaves out the ${PART_NAMES[e]}`));
    for (const e of rng.shuffle(PARTS.filter((x) => !base.cell.parts.includes(x))).slice(0, 2)) out.push(mk({ ...base.cell, parts: [...base.cell.parts, e] }, `${base.code}+extra-one`, `${base.text}; and adds a ${PART_NAMES[e]}`));
    return rng.shuffle(out);
  };
  const answerAsBase = { cell: answer, code: 'marks', text: 'has the right figure but the wrong marks: it' };
  const known = partsGrid.map(row => row.slice()); known[2][2] = null;
  const lawful = c => !sameSet(c.cell.parts, answer.parts) && reverseSetReadings('parts', known, c.cell.parts).length > 0;
  // Two balanced clusters of three: {answer, answer with one figure slip, answer with one mark slip} and the same
  // around the primary misconception W, so neither cluster stands out and a per-attribute majority vote ties.
  const used = new Set([cellKey(answer)]);
  const chosen = [];
  const take = (cand) => { if (!cand || lawful(cand)) return false; const k = cellKey(cand.cell); if (used.has(k)) return false; used.add(k); chosen.push(cand); return true; };
  const W = [...rng.shuffle(wrongOps), ...rng.shuffle(copies), ...nearOf(answerAsBase)].find(c => !lawful(c));
  if (!W) return null;
  take(W);
  const aSlips = rng.shuffle(figMisses);
  // The same figure slips applied to W, so the W cluster mirrors the answer's cluster.
  const wSlips = aSlips.map((f) => ({ cell: compositeCell({ ...f.cell, parts: W.cell.parts }), code: `${W.code}+${f.code}`, text: `${W.text}; and ${f.text}`, attrs: [] }));
  const order = difficulty >= 4
    ? [aSlips[0], nearOf(answerAsBase)[0], wSlips[0], nearOf(W)[0]]
    : [aSlips[0], aSlips[1] || nearOf(answerAsBase)[0], wSlips[0], nearOf(W)[0]];
  for (const c of order) take(c);
  for (const c of [...wrongOps.slice(1), ...copies, ...nearOf(answerAsBase), ...nearOf(W), ...aSlips.slice(1), ...wSlips.slice(1)]) { if (chosen.length >= 5) break; take(c); }
  if (chosen.length < 5) return null;
  const all = rng.shuffle([{ cell: answer, correct: true }, ...chosen]);
  const correctIndex = all.findIndex((o) => o.correct);
  return {
    options: all.map((o) => o.cell),
    correctIndex,
    distractors: all.map((o, i) => (o.correct ? null : { index: i, code: o.code, text: o.text, attrs: [] })),
  };
}

function explainComposite(active, domains, op, setAxis, knownParts, answer, rules) {
  const o = OP_TEXT[op];
  const along = setAxis === 'row' ? 'row' : 'column';
  const across = setAxis === 'row' ? 'columns' : 'rows';
  const first = setAxis === 'row' ? knownParts[2][0] : knownParts[0][2];
  const second = setAxis === 'row' ? knownParts[2][1] : knownParts[1][2];
  const names = (m) => (m.length ? listNames(m.map((x) => PART_NAMES[x])) : 'no marks');
  const parts = active.map((r) => explainRule(r, domains[r.attr], 'composite', domains));
  const setRule = `Marks: in each ${along}, the third cell ${o.verb} the first two: ${o.how}.` + (o.note ? ` ${o.note}` : '');
  const setNoRule = `Marks: the ${across} carry no rule for the marks; only the figure's own pattern runs that way.`;
  const constant = ['shape', 'fill'].filter((a) => rules[a].type === 'const').map((a) => `${ATTR_LABEL[a]} (${valueName(a, answer[a])})`);
  return {
    summary: `Two layers share each cell. The main figure follows ${active.length === 1 ? `one rule (${ATTR_LABEL[active[0].attr]})` : `${active.length} rules (${listNames(active.map((r) => ATTR_LABEL[r.attr]))})`}; the small marks around it combine by ${o.name} along the ${along}s. Solve the layers separately.`,
    rows: [...parts.map((p) => `Figure: ${p.row}`), setAxis === 'row' ? setRule : setNoRule],
    columns: [...parts.map((p) => `Figure: ${p.column}`), setAxis === 'col' ? setRule : setNoRule],
    missing: [
      ...parts.map((p) => `Figure: ${p.missing}`),
      `Marks: ${cap(along)} 3 has ${names(first)} in its first cell and ${names(second)} in its second; ${o.name} gives ${names(answer.parts)}.`,
      `Putting both layers together, the missing cell is ${describeCell(answer)}.`,
    ],
    unchanged: constant.length ? `Unchanged throughout: ${listNames(constant)}.` : '',
  };
}

function compositeHints(active, domains, op, setAxis) {
  const along = setAxis === 'row' ? 'row' : 'column';
  const figAlong = setAxis === 'row' ? 'column' : 'row';
  const o = OP_TEXT[op];
  const hints = [
    'Each cell has two layers: a main figure and small marks around it. Read them separately, and do not expect them to follow the same direction.',
    `The figure: read along ${figAlong} 1, then ${figAlong} 2. What changes from one cell to the next: ${listNames(active.map((r) => ATTR_LABEL[r.attr]))}?`,
  ];
  for (const r of active) {
    const e = explainRule(r, domains[r.attr], 'composite', domains);
    hints.push(`${cap(ATTR_LABEL[r.attr])}: ${r.type.startsWith('col') ? e.column : e.row}`);
  }
  hints.push(`The marks: compare the first two cells of ${along} 1 with its third cell. The operation is ${o.name}: ${o.how}. Apply it to ${along} 3.`);
  return hints;
}
