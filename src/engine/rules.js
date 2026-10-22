// Rule grammar for figure attributes.
//
// A rule assigns a value index V(r, c) to every matrix cell for one attribute.
// Types:
//   const    V = v
//   rowProg  V(r,c) = start[r] + c*step            (each row has its own start)
//   colProg  V(r,c) = start[c] + r*step            (each column has its own start)
//   grid     V(r,c) = v0 + r*a + c*b               (both directions progress)
//   latin    each row and each column holds the three values once; row i = row 0 shifted by i*dir
//   rowAlt   V = (c even) ? A : B                  (every row A B A)
//   colAlt   V = (r even) ? A : B                  (every column A B A)
//   checker  V = ((r+c) even) ? A : B
// The same grammar is enumerated by the solver in solver.js.

export function wrapValue(domain, v) {
  const n = domain.values.length;
  if (domain.kind === 'cyclic') return ((v % n) + n) % n;
  return v >= 0 && v < n ? v : null;
}

export function evalRule(rule, domain) {
  const V = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const p = rule.params;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      let v;
      switch (rule.type) {
        case 'const': v = p.value; break;
        case 'rowProg': v = wrapValue(domain, p.starts[r] + c * p.step); break;
        case 'colProg': v = wrapValue(domain, p.starts[c] + r * p.step); break;
        case 'grid': v = wrapValue(domain, p.v0 + r * p.a + c * p.b); break;
        case 'latin': {
          const base = p.perm; // array of 3 value indices
          v = base[(((c + r * p.dir) % 3) + 3) % 3];
          break;
        }
        case 'rowSum': case 'rowDiff': case 'colSum': case 'colDiff': {
          // Count arithmetic: the third cell of each line is the sum (or difference) of the first two.
          const line = rule.type.startsWith('row') ? r : c;
          const posInLine = rule.type.startsWith('row') ? c : r;
          const [a, b] = p.pairs[line];
          const vals = domain.values;
          const third = rule.type.endsWith('Sum') ? vals[a] + vals[b] : vals[a] - vals[b];
          v = posInLine === 0 ? a : posInLine === 1 ? b : vals.indexOf(third);
          if (v < 0) v = null;
          break;
        }
        case 'rowAlt': v = c % 2 === 0 ? p.A : p.B; break;
        case 'colAlt': v = r % 2 === 0 ? p.A : p.B; break;
        case 'checker': v = (r + c) % 2 === 0 ? p.A : p.B; break;
        default: throw new Error(`unknown rule type ${rule.type}`);
      }
      if (v === null || v === undefined) throw new Error(`rule ${rule.type} leaves domain ${domain.label}`);
      V[r][c] = v;
    }
  }
  return V;
}

export const RULE_TYPES_BY_KIND = {
  categorical: ['const', 'latin', 'rowAlt', 'colAlt', 'checker'],
  ordered: ['const', 'rowProg', 'colProg', 'grid', 'latin', 'rowAlt', 'colAlt', 'checker', 'rowSum', 'rowDiff', 'colSum', 'colDiff'],
  cyclic: ['const', 'rowProg', 'colProg', 'grid', 'latin', 'rowAlt', 'colAlt', 'checker'],
};

// Randomly parametrise a rule of the given type on a domain. Returns null when impossible.
export function makeRule(attr, type, domain, rng, opts = {}) {
  const n = domain.values.length;
  const steps = (domain.steps || [1, -1]).filter((s) => !opts.maxStep || Math.abs(s) <= opts.maxStep);
  const fits = (v) => domain.kind === 'cyclic' || (v >= 0 && v < n);
  const allowed = opts.allowed || [...Array(n).keys()];
  let params = null;
  switch (type) {
    case 'const':
      params = { value: opts.value ?? rng.int(n) };
      break;
    case 'rowProg':
    case 'colProg': {
      const order = rng.shuffle(steps);
      for (const step of order) {
        const starts = [];
        const okStarts = [];
        for (let s = 0; s < n; s++) if (fits(s + 2 * step)) okStarts.push(s);
        if (!okStarts.length) continue;
        for (let i = 0; i < 3; i++) starts.push(rng.pick(okStarts));
        // Avoid three identical starts when there is a choice (keeps rows distinct).
        if (okStarts.length >= 2 && starts[0] === starts[1] && starts[1] === starts[2]) {
          starts[rng.int(3)] = rng.pick(okStarts.filter((s) => s !== starts[0]));
        }
        params = { step, starts };
        break;
      }
      break;
    }
    case 'grid': {
      const combos = [];
      for (const a of steps) for (const b of steps) for (let v0 = 0; v0 < n; v0++) {
        let ok = true;
        for (let r = 0; r < 3 && ok; r++) for (let c = 0; c < 3; c++) if (!fits(v0 + r * a + c * b)) { ok = false; break; }
        if (ok) combos.push({ v0, a, b });
      }
      if (combos.length) params = rng.pick(combos);
      break;
    }
    case 'rowSum': case 'rowDiff': case 'colSum': case 'colDiff': {
      if (!domain.arith) break;
      const vals = domain.values;
      const combos = [];
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        const third = type.endsWith('Sum') ? vals[a] + vals[b] : vals[a] - vals[b];
        const t = vals.indexOf(third);
        if (t >= 0 && t !== a && t !== b && (type.endsWith('Sum') || vals[a] > vals[b])) combos.push([a, b]);
      }
      if (combos.length < 2) break;
      const pairs = [rng.pick(combos), rng.pick(combos), rng.pick(combos)];
      if (pairs.every((q) => q[0] === pairs[0][0] && q[1] === pairs[0][1])) pairs[rng.int(3)] = rng.pick(combos.filter((q) => q[0] !== pairs[0][0] || q[1] !== pairs[0][1]));
      params = { pairs };
      break;
    }
    case 'latin': {
      if (allowed.length < 3) break;
      const vals = rng.sample(allowed, 3);
      params = { perm: vals, dir: rng.pick([1, 2]) };
      break;
    }
    case 'rowAlt':
    case 'colAlt':
    case 'checker': {
      if (allowed.length < 2) break;
      const [A, B] = rng.sample(allowed, 2);
      params = { A, B };
      break;
    }
    default:
      throw new Error(`unknown rule type ${type}`);
  }
  if (!params) return null;
  const rule = { attr, type, params };
  rule.values = evalRule(rule, domain);
  return rule;
}
