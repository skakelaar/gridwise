// In-grammar uniqueness solver.
//
// Given the eight known cells, enumerate every rule in the grammar (rules.js) that is consistent with them,
// for every attribute, and collect the values each consistent rule predicts for the missing cell.
// A puzzle is accepted only when every attribute has exactly one predicted value, and the prediction
// equals the intended answer. Some extra "plausible reading" hypotheses outside the generator grammar
// (copying a row, column or diagonal) are included so puzzles that admit those readings are rejected too.
//
// This checks uniqueness within the supported grammar, not against every imaginable pattern.

import { wrapValue } from './rules.js';
import { SetOps, sameSet, paletteOps } from './cells.js';

// known: 3x3 matrix of value indices with known[2][2] === null.
export function predictAttribute(domain, known) {
  const preds = new Map(); // value -> [hypothesis names]
  const add = (name, v) => {
    if (v === null || v === undefined) return;
    if (!preds.has(v)) preds.set(v, []);
    preds.get(v).push(name);
  };
  const n = domain.values.length;
  const cyc = domain.kind === 'cyclic';
  const eq = (a, b) => a === b;
  const diff = (a, b) => (cyc ? (((a - b) % n) + n) % n : a - b);
  const cells = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (!(r === 2 && c === 2)) cells.push([r, c, known[r][c]]);

  // const
  if (cells.every(([, , v]) => eq(v, cells[0][2]))) add('const', cells[0][2]);

  const steps = [0, ...(domain.steps || [1, -1])]; // step 0 = constant along the line
  if (domain.kind !== 'categorical') {
    // rowProg: every complete row progresses by step, row 2 partial consistent.
    for (const step of steps) {
      let ok = true;
      for (let r = 0; r < 3 && ok; r++) {
        for (let c = 1; c < 3; c++) {
          if (r === 2 && c === 2) continue;
          if (diff(known[r][c], known[r][c - 1]) !== (cyc ? ((step % n) + n) % n : step)) { ok = false; break; }
        }
      }
      if (ok) add(`rowProg(${step})`, wrapValue(domain, known[2][1] + step));
    }
    for (const step of steps) {
      let ok = true;
      for (let c = 0; c < 3 && ok; c++) {
        for (let r = 1; r < 3; r++) {
          if (r === 2 && c === 2) continue;
          if (diff(known[r][c], known[r - 1][c]) !== (cyc ? ((step % n) + n) % n : step)) { ok = false; break; }
        }
      }
      if (ok) add(`colProg(${step})`, wrapValue(domain, known[1][2] + step));
    }
    // grid: v0 + r*a + c*b
    const v0 = known[0][0];
    for (const a of [0, ...steps]) for (const b of [0, ...steps]) {
      let ok = true;
      for (const [r, c, v] of cells) {
        const w = wrapValue(domain, v0 + r * a + c * b);
        if (w === null || w !== v) { ok = false; break; }
      }
      if (ok) add(`grid(${a},${b})`, wrapValue(domain, v0 + 2 * a + 2 * b));
    }
  }

  // latin: rows 0 and 1 are permutations of the same 3-set, columns 0 and 1 too, row 2 partial consistent.
  {
    const set = new Set(known[0]);
    const isPerm = (row) => row.length === 3 && new Set(row).size === 3 && row.every((v) => set.has(v));
    const col = (c) => [known[0][c], known[1][c], known[2][c]].filter((v) => v !== null);
    const partialOk = (vals) => new Set(vals).size === vals.length && vals.every((v) => set.has(v));
    if (set.size === 3 && isPerm(known[1]) && isPerm(col(0)) && partialOk(col(1)) && partialOk([known[2][0], known[2][1]]) && partialOk(col(2))) {
      const missingRow = [...set].filter((v) => v !== known[2][0] && v !== known[2][1]);
      const missingCol = [...set].filter((v) => v !== known[0][2] && v !== known[1][2]);
      if (missingRow.length === 1 && missingCol.length === 1 && missingRow[0] === missingCol[0]) add('latin', missingRow[0]);
    }
  }

  // One-of-each along rows only (or columns only): a weaker but common reading of "each row holds the same three values".
  {
    const set = new Set(known[0]);
    const isPerm = (vals) => vals.length === 3 && new Set(vals).size === 3 && vals.every((v) => set.has(v));
    if (set.size === 3 && isPerm(known[1]) && new Set([known[2][0], known[2][1]]).size === 2 && set.has(known[2][0]) && set.has(known[2][1])) {
      add('latinRows', [...set].find((v) => v !== known[2][0] && v !== known[2][1]));
    }
    const cset = new Set([known[0][0], known[1][0], known[2][0]]);
    const col1 = [known[0][1], known[1][1], known[2][1]];
    const isPermC = (vals) => vals.length === 3 && new Set(vals).size === 3 && vals.every((v) => cset.has(v));
    if (cset.size === 3 && isPermC(col1) && new Set([known[0][2], known[1][2]]).size === 2 && cset.has(known[0][2]) && cset.has(known[1][2])) {
      add('latinCols', [...cset].find((v) => v !== known[0][2] && v !== known[1][2]));
    }
  }

  // Arithmetic readings for counted attributes: third = first + second, or first − second.
  if (domain.arith) {
    const val = (i) => domain.values[i];
    const idx = (v) => domain.values.indexOf(v);
    const rowOk = (f) => f(val(known[0][0]), val(known[0][1])) === val(known[0][2]) && f(val(known[1][0]), val(known[1][1])) === val(known[1][2]);
    const colOk = (f) => f(val(known[0][0]), val(known[1][0])) === val(known[2][0]) && f(val(known[0][1]), val(known[1][1])) === val(known[2][1]);
    const fns = { sum: (a, b) => a + b, diff: (a, b) => a - b, absdiff: (a, b) => Math.abs(a - b) };
    for (const [name, f] of Object.entries(fns)) {
      if (rowOk(f)) { const i = idx(f(val(known[2][0]), val(known[2][1]))); if (i >= 0) add(`row${name}`, i); }
      if (colOk(f)) { const i = idx(f(val(known[0][2]), val(known[1][2]))); if (i >= 0) add(`col${name}`, i); }
    }
  }

  // alternations (all three predict the "A" value for cell (2,2))
  const altCheck = (pos) => {
    const A = known[0][0];
    let B = null;
    for (const [r, c, v] of cells) {
      if (pos(r, c)) { if (v !== A) return null; }
      else { if (B === null) B = v; else if (v !== B) return null; }
    }
    return B !== null && B !== A ? A : null;
  };
  add('rowAlt', altCheck((r, c) => c % 2 === 0));
  add('colAlt', altCheck((r, c) => r % 2 === 0));
  add('checker', altCheck((r, c) => (r + c) % 2 === 0));

  // Plausible readings outside the generator grammar.
  // Row 3 repeats row 1 / row 2; column 3 repeats column 1 / column 2.
  for (const r of [0, 1]) if (known[r][0] === known[2][0] && known[r][1] === known[2][1]) add(`copyRow${r}`, known[r][2]);
  for (const c of [0, 1]) if (known[0][c] === known[0][2] && known[1][c] === known[1][2]) add(`copyCol${c}`, known[2][c]);
  // Constant diagonals (cell = cell up-left).
  if (known[1][1] === known[0][0] && known[1][2] === known[0][1] && known[2][1] === known[1][0]) add('diagonal', known[1][1]);
  // (An anti-diagonal reading predicts nothing for the bottom-right corner.)
  return preds;
}

// Set cells: hypotheses are op × orientation, plus copy readings.
export function predictSet(palette, known /* 3x3 of member arrays, [2][2] null */) {
  const preds = []; // [{ members, names }]
  const add = (name, members) => {
    if (!members) return;
    const hit = preds.find((p) => sameSet(p.members, members));
    if (hit) hit.names.push(name); else preds.push({ members, names: [name] });
  };
  // Complements are read against the true palette and also against the elements a solver can actually see
  // (a person does not know which palette positions never appear), so both universes must agree.
  const observed = [...new Set(known.flat().filter(Boolean).flat())];
  const ops = {
    ...SetOps,
    ...paletteOps(palette),
    neitherSeen: (a, b) => observed.filter((x) => !a.includes(x) && !b.includes(x)),
    notBothSeen: (a, b) => observed.filter((x) => !(a.includes(x) && b.includes(x))),
  };
  for (const [opName, op] of Object.entries(ops)) {
    // row-wise: cell(r,2) = op(cell(r,0), cell(r,1))
    if (sameSet(op(known[0][0], known[0][1]), known[0][2]) && sameSet(op(known[1][0], known[1][1]), known[1][2])) {
      add(`row:${opName}`, op(known[2][0], known[2][1]));
    }
    if (sameSet(op(known[0][0], known[1][0]), known[2][0]) && sameSet(op(known[0][1], known[1][1]), known[2][1])) {
      add(`col:${opName}`, op(known[0][2], known[1][2]));
    }
  }
  for (const r of [0, 1]) if (sameSet(known[r][0], known[2][0]) && sameSet(known[r][1], known[2][1])) add(`copyRow${r}`, known[r][2]);
  for (const c of [0, 1]) if (sameSet(known[0][c], known[0][2]) && sameSet(known[1][c], known[1][2])) add(`copyCol${c}`, known[2][c]);
  if (sameSet(known[1][1], known[0][0]) && sameSet(known[1][2], known[0][1]) && sameSet(known[2][1], known[1][0])) add('diagonal', known[1][1]);
  return preds;
}
