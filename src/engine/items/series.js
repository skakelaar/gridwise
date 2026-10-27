// Number-series items. Each rule family generates terms deterministically and the solver below checks that
// no other rule in the grammar predicts a different value among the options.
import { listNames } from '../text.js';

export const SERIES_RULES = {
  1: ['arith', 'arithNeg', 'geom', 'growingStep', 'halving'],
  2: ['fib', 'altOps', 'squares', 'squaresPlus', 'letters', 'cubes'],
  3: ['interleaved', 'pairwise', 'altAddSub', 'primes', 'lettersGrowing'],
  4: ['exponentPairs', 'secondDiff', 'linearRec', 'triMix', 'letterPairs'],
  5: ['squareDiffs', 'primeDiffs', 'digitSum', 'tripleInterleave', 'recur2', 'letterSquares'],
};
const digitSum = (n) => String(n).split('').reduce((s, d) => s + Number(d), 0);

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const L = (n) => LETTERS[n - 1];
const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61];

const range = (n) => Array.from({ length: n }, (_, i) => i);

function build(rule, rng) {
  switch (rule) {
    case 'arith': { const a = rng.range(1, 12), d = rng.range(2, 9); const t = range(6).map((i) => a + i * d); return { terms: t, how: `${d} is added each time`, misc: [t[5] + d - 1, t[5] + 2 * d, t[4] + d * 2 + 1, t[5] - d] }; }
    case 'arithNeg': { const d = rng.range(2, 7), a = 40 + rng.range(0, 30); const t = range(6).map((i) => a - i * d); return { terms: t, how: `${d} is subtracted each time`, misc: [t[5] - d + 1, t[5] - 2 * d, t[5] + d, t[5] - d - 1] }; }
    case 'geom': { const r = rng.pick([2, 3]), a = rng.range(1, 4); const t = range(5).map((i) => a * r ** i); return { terms: t, how: `each number is multiplied by ${r}`, misc: [t[4] * r + 1, t[4] + (t[4] - t[3]), t[4] * (r + 1), t[4] * r - r] }; }
    case 'growingStep': { const a = rng.range(1, 9), s = rng.range(1, 3); const t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1] + s + i - 1); const nextStep = t.at(-1) - t.at(-2); return { terms: t, how: `the step grows by one each time (+${s}, +${s + 1}, +${s + 2} …), so the next step is +${nextStep}`, misc: [t[5] + (t[5] - t[4]), t[5] + nextStep + 1, t[5] + nextStep - 1, t[5] + s] }; }
    case 'fib': { const a = rng.range(1, 5), b = rng.range(a, a + 4); const t = [a, b]; for (let i = 2; i < 6; i++) t.push(t[i - 1] + t[i - 2]); return { terms: t, how: 'each number is the sum of the two before it', misc: [t[5] + (t[5] - t[4]), t[5] * 2, t[5] + t[4] + 1, t[5] + t[3]] }; }
    case 'altOps': { const a = rng.range(2, 6), add = rng.range(2, 5); const t = [a]; for (let i = 1; i < 6; i++) t.push(i % 2 ? t[i - 1] * 2 : t[i - 1] + add); return { terms: t, how: `the operations alternate: ×2, then +${add}, then ×2 …`, misc: [t[5] + add, t[5] * 2 + add, t[5] + (t[5] - t[4]), t[5] * 2 - 1] }; }
    case 'squares': { const s = rng.range(1, 3); const t = range(6).map((i) => (s + i) ** 2); const n = s + 6; return { terms: t, how: `these are square numbers: ${listNames(t.slice(0, 3).map((v, i) => `${s + i}² = ${v}`))}`, misc: [n * n - 1, t[5] + (t[5] - t[4]), n * n + 1, t[5] + 2 * (t[5] - t[4])] }; }
    case 'squaresPlus': { const k = rng.pick([1, 2, 3, -1]); const t = range(6).map((i) => (i + 1) ** 2 + k); const n = 7; return { terms: t, how: `each number is a square number ${k > 0 ? 'plus' : 'minus'} ${Math.abs(k)} (1²${k > 0 ? '+' : '−'}${Math.abs(k)}, 2²${k > 0 ? '+' : '−'}${Math.abs(k)} …)`, misc: [n * n, n * n + 2 * k, t[5] + (t[5] - t[4]), n * n + k + 1] }; }
    case 'interleaved': {
      const a = rng.range(2, 9), da = rng.range(2, 4), b = rng.range(1, 6), db = rng.range(1, 3);
      if (da === db) return null;
      const t = []; for (let i = 0; i < 7; i++) t.push(i % 2 === 0 ? a + (i / 2) * da : b + ((i - 1) / 2) * db);
      // 7 shown terms end on an "a" term; the next is a "b" term
      const next = b + 3 * db;
      return { terms: t, next, how: `two series are interleaved: the 1st, 3rd, 5th … numbers go up by ${da}, the 2nd, 4th, 6th … numbers go up by ${db}. The next number belongs to the second series`, misc: [t[6] + da, t[6] + db, next + db, t[5] + da] };
    }
    case 'pairwise': {
      const c = rng.range(1, 4); const pairs = []; for (let i = 0; i < 3; i++) { const x = 2 * rng.range(6, 48); pairs.push([x, x / 2 + c]); }
      const t = [pairs[0][0], pairs[0][1], pairs[1][0], pairs[1][1], pairs[2][0]]; const next = pairs[2][1];
      return { terms: t, next, how: `the numbers come in pairs: the second of each pair is the first divided by 2, plus ${c}`, misc: [pairs[2][0] / 2, pairs[2][0] / 2 - c, pairs[2][0] + c, pairs[2][0] / 2 + c + 1] };
    }
    case 'altAddSub': { const a = rng.range(10, 20), p = rng.range(3, 7), m = rng.range(1, p - 1); const t = [a]; for (let i = 1; i < 7; i++) t.push(i % 2 ? t[i - 1] + p : t[i - 1] - m); return { terms: t, how: `+${p} and −${m} alternate`, misc: [t[6] - m, t[6] + p + 1, t[6] + (t[6] - t[5]), t[6] + p - m] }; }
    case 'halving': { const a = rng.pick([320, 640, 480, 960, 800]); const t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1] / 2); if (!t.every(Number.isInteger)) return null; return { terms: t, how: 'each number is half the one before', misc: [t[5] / 2 + 1, t[5] - (t[4] - t[5]), t[5] / 4, t[5] / 2 - 1] }; }
    case 'cubes': { const s = rng.range(1, 2); const t = range(5).map((i) => (s + i) ** 3); const n = s + 5; return { terms: t, how: `these are cube numbers (${s}³ = ${t[0]}, ${s + 1}³ = ${t[1]} …)`, misc: [n * n * n - 1, t[4] + (t[4] - t[3]), n * n, n * n * n + 1] }; }
    case 'primes': { const start = rng.range(0, 6); const t = PRIMES.slice(start, start + 6); const next = PRIMES[start + 6]; return { terms: t, next, how: 'these are consecutive prime numbers', misc: [next + 1, t[5] + (t[5] - t[4]), next - 2 === t[5] ? next + 2 : next - 2, t[5] + 2] }; }
    case 'letters': { const a = rng.range(1, 6), d = rng.range(2, 4); const nums = range(6).map((i) => a + i * d); if (nums[5] > 26) return null; return { terms: nums.slice(0, 5).map(L), next: L(nums[5]), textual: true, how: `the letters move ${d} places along the alphabet each time`, misc: [L(nums[5] - 1), L(nums[5] + 1), L(nums[4] + d + d), L(nums[5] - d + 1)].filter((x) => x), numeric: nums.slice(0, 5), nextNumeric: nums[5] }; }
    case 'lettersGrowing': { const a = rng.range(1, 3), s = rng.range(1, 2); const nums = [a]; for (let i = 1; i < 6; i++) nums.push(nums[i - 1] + s + i - 1); if (nums[5] > 26) return null; return { terms: nums.slice(0, 5).map(L), next: L(nums[5]), textual: true, how: `the gaps between the letters grow by one each time (+${s}, +${s + 1}, +${s + 2} …)`, misc: [L(nums[5] - 1), L(nums[5] + 1), L(nums[4] + (nums[4] - nums[3])), L(nums[5] + 2)].filter((x) => x), numeric: nums.slice(0, 5), nextNumeric: nums[5] }; }
    case 'letterPairs': { const a = rng.range(1, 4), d = rng.range(2, 3), b = 26 - rng.range(0, 3); const terms = []; for (let i = 0; i < 4; i++) terms.push(`${L(a + i * d)}${L(b - i * 2)}`); const nb = a + 4 * d, ne = b - 8; if (nb > 26 || ne < 1) return null; return { terms, next: `${L(nb)}${L(ne)}`, textual: true, how: `two letter series run together: the first letter moves ${d} places forward, the second moves 2 places back`, misc: [`${L(nb)}${L(ne + 1)}`, `${L(nb - 1)}${L(ne)}`, `${L(nb + 1)}${L(ne - 1)}`, `${L(nb)}${L(ne - 1)}`], numeric: range(4).map((i) => a + i * d), nextNumeric: nb, numeric2: range(4).map((i) => b - i * 2), nextNumeric2: ne }; }
    case 'triMix': { const a = rng.range(2, 5), k = rng.range(1, 3); const t = [a]; for (let i = 1; i < 6; i++) t.push(i % 2 ? t[i - 1] * 3 : t[i - 1] - k); return { terms: t, how: `the operations alternate: ×3, then −${k}, then ×3 …`, misc: [t[5] - k, t[5] * 3 - k, t[5] + (t[5] - t[4]), t[5] * 3 + k] }; }
    case 'squareDiffs': { const a = rng.range(1, 12); const t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1] + i * i); return { terms: t, how: `the differences are the square numbers ${range(t.length - 2).map(i => (i + 1) ** 2).join(', ')}, so the next difference is ${t.at(-1) - t.at(-2)}`, misc: [t[5] + 25, t[5] + 30, t[5] + 36 + 11, t[5] + (t[5] - t[4]) + 11] }; }
    case 'primeDiffs': { const a = rng.range(1, 15); const ps = [2, 3, 5, 7, 11, 13]; const t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1] + ps[i - 1]); return { terms: t, how: `the differences are the prime numbers ${ps.slice(0, t.length - 2).join(', ')}, so the next difference is ${t.at(-1) - t.at(-2)}`, misc: [t[5] + 11, t[5] + 12, t[5] + 15, t[5] + 14] }; }
    case 'digitSum': { const a = rng.range(11, 39); const t = [a]; for (let i = 1; i < 7; i++) t.push(t[i - 1] + digitSum(t[i - 1])); return { terms: t, how: 'each number is the previous number plus the sum of its own digits', misc: [t[6] + digitSum(t[5]), t[6] + (t[6] - t[5]), t[6] + digitSum(t[6]) + 1, t[6] + digitSum(t[6]) - 1] }; }
    case 'tripleInterleave': {
      const starts = [rng.range(1, 9), rng.range(10, 19), rng.range(20, 29)];
      const steps = rng.shuffle([2, 3, 4, 5]).slice(0, 3);
      const t = []; for (let i = 0; i < 8; i++) t.push(starts[i % 3] + Math.floor(i / 3) * steps[i % 3]);
      const next = starts[2] + 2 * steps[2];
      return { terms: t, next, how: `three series are interleaved (every third number belongs together): they go up by ${steps[0]}, ${steps[1]} and ${steps[2]}. The next number continues the third series`, misc: [t[7] + steps[1], t[5] + steps[2] + 1, next + steps[2], t[7] + (t[7] - t[6])] };
    }
    case 'recur2': { const a = rng.range(1, 3), b = a + rng.range(1, 3); const t = [a, b]; for (let i = 2; i < 7; i++) t.push(2 * t[i - 1] + t[i - 2]); return { terms: t, how: 'each number is twice the previous number plus the one before that', misc: [t[6] * 2, t[6] + t[5], t[6] * 2 + t[5] + 1, t[6] * 2 + t[4]] }; }
    case 'letterSquares': { const a = rng.range(1, 3), d = 2; const nums = range(6).map((i) => a + i * d); const sq = range(6).map((i) => (i + 1) ** 2); if (nums[5] > 26) return null; const terms = range(5).map((i) => `${L(nums[i])}${sq[i]}`); return { terms, next: `${L(nums[5])}${sq[5]}`, textual: true, how: 'the letters move two places along the alphabet while the numbers are the square numbers 1, 4, 9, 16, 25', misc: [`${L(nums[5])}${sq[5] - 1}`, `${L(nums[5] + 1)}${sq[5]}`, `${L(nums[5])}${sq[4] + 10}`, `${L(nums[4] + 1)}${sq[5]}`], numeric: nums.slice(0, 5), nextNumeric: nums[5], numeric2: sq.slice(0, 5), nextNumeric2: sq[5] }; }
    case 'exponentPairs': {
      const bases = []; const b0 = rng.range(1, 3), bd = rng.range(1, 3); const e0 = 15 + rng.range(0, 6);
      const steps = []; for (let i = 0; i < 4; i++) { bases.push(i === 0 ? b0 : bases[i - 1] + bd + i - 1); }
      const exps = []; for (let i = 0; i < 4; i++) exps.push(e0 - (i * (i + 3)) / 2); // −2, −3, −4 …
      const nextBase = bases[3] + bd + 3; const nextExp = exps[3] - 5;
      const terms = bases.map((b, i) => `${b}{sup ${exps[i]}}`);
      return { terms, next: `${nextBase}{sup ${nextExp}}`, textual: true, how: `two series are combined: the bases grow by an increasing step (+${bd}, +${bd + 1}, +${bd + 2}, so +${bd + 3} next) and the exponents fall by an increasing step (−2, −3, −4, so −5 next)`, misc: [`${nextBase}{sup ${nextExp + 1}}`, `${bases[3] + bd + 4}{sup ${nextExp}}`, `${nextBase}{sup ${exps[3] - 4}}`, `${bases[3] + bd}{sup ${nextExp}}`], baseSeq: bases, expSeq: exps, nextBase, nextExp };
    }
    case 'secondDiff': { const a = rng.range(1, 6), d1 = rng.range(1, 4), d2 = rng.range(2, 4); const t = [a]; let d = d1; for (let i = 1; i < 6; i++) { t.push(t[i - 1] + d); d += d2; } return { terms: t, how: `the differences themselves grow by ${d2} each time (+${d1}, +${d1 + d2}, +${d1 + 2 * d2} …), so the next difference is +${t.at(-1) - t.at(-2)}`, misc: [t[5] + (t[5] - t[4]), t[5] + d + d2, t[5] + d - 1, t[5] + d + 1] }; }
    case 'linearRec': { const a = rng.range(1, 4), k = rng.pick([1, 2, 3]); const t = [a]; for (let i = 1; i < 6; i++) t.push(t[i - 1] * 2 + k); return { terms: t, how: `each number is double the previous one plus ${k}`, misc: [t[5] * 2, t[5] * 2 + k + 1, t[5] + (t[5] - t[4]), t[5] * 2 - k] }; }
    default: throw new Error(`unknown series rule ${rule}`);
  }
}

// ---------------------------------------------------------------- solver: what could the next term be?
const isInt = (x) => Number.isInteger(x);

const digitSumOf = (v) => String(Math.abs(v)).split('').reduce((s, d) => s + Number(d), 0);

const arithNext = (s) => { if (s.length < 2) return null; const d = s.slice(1).map((v, i) => v - s[i]); return d.every((x) => x === d[0]) ? s[s.length - 1] + d[0] : null; };

export function predictNumeric(t) {
  const preds = new Map();
  const add = (name, v) => { if (v == null || !Number.isFinite(v)) return; if (!preds.has(v)) preds.set(v, []); preds.get(v).push(name); };
  const n = t.length;
  const diffs = t.slice(1).map((v, i) => v - t[i]);
  if (diffs.every((d) => d === diffs[0])) add('arithmetic', t[n - 1] + diffs[0]);
  if (t.every((v) => v !== 0)) { const ratios = t.slice(1).map((v, i) => v / t[i]); if (ratios.every((r) => r === ratios[0]) && isInt(ratios[0])) add('geometric', t[n - 1] * ratios[0]); }
  const dd = diffs.slice(1).map((v, i) => v - diffs[i]);
  if (dd.length >= 2 && dd.every((v) => v === dd[0]) && dd[0] !== 0) add('second difference', t[n - 1] + diffs[diffs.length - 1] + dd[0]);
  if (n >= 4 && t.slice(2).every((v, i) => v === t[i] + t[i + 1])) add('sum of previous two', t[n - 1] + t[n - 2]);
  // linear recurrence t[i] = a*t[i-1] + b with small integer a, b
  for (let a = 2; a <= 3; a++) { const b = t[1] - a * t[0]; if (isInt(b) && Math.abs(b) <= 10 && t.slice(1).every((v, i) => v === a * t[i] + b)) add(`×${a}${b >= 0 ? '+' : '−'}${Math.abs(b)}`, a * t[n - 1] + b); }
  // interleaved: two arithmetic subsequences
  const odd = t.filter((_, i) => i % 2 === 0), even = t.filter((_, i) => i % 2 === 1);
  if (odd.length >= 3 && even.length >= 2) { const nextSub = n % 2 === 0 ? arithNext(odd) : arithNext(even); const otherOk = n % 2 === 0 ? arithNext(even) : arithNext(odd); if (nextSub != null && otherOk != null) add('interleaved', nextSub); }
  // alternating two operations (+p then −m, or ×2 then +k)
  if (n >= 5) {
    const d0 = diffs.filter((_, i) => i % 2 === 0), d1 = diffs.filter((_, i) => i % 2 === 1);
    if (d0.every((v) => v === d0[0]) && d1.every((v) => v === d1[0]) && d0[0] !== d1[0]) add('alternating steps', t[n - 1] + (diffs.length % 2 === 0 ? d0[0] : d1[0]));
    const ops = t.slice(1).map((v, i) => (v === t[i] * 2 ? 'x2' : `+${v - t[i]}`));
    const o0 = ops.filter((_, i) => i % 2 === 0), o1 = ops.filter((_, i) => i % 2 === 1);
    if (o0.every((v) => v === 'x2') && o1.every((v) => v === o1[0]) && o1[0] !== 'x2') { const nextOp = ops.length % 2 === 0 ? 'x2' : o1[0]; add('alternating ×2 and +k', nextOp === 'x2' ? t[n - 1] * 2 : t[n - 1] + Number(nextOp)); }
    if (o1.every((v) => v === 'x2') && o0.every((v) => v === o0[0]) && o0[0] !== 'x2') { const nextOp = ops.length % 2 === 0 ? o0[0] : 'x2'; add('alternating +k and ×2', nextOp === 'x2' ? t[n - 1] * 2 : t[n - 1] + Number(nextOp)); }
    const ops3 = t.slice(1).map((v, i) => (v === t[i] * 3 ? 'x3' : `+${v - t[i]}`));
    const p0 = ops3.filter((_, i) => i % 2 === 0), p1 = ops3.filter((_, i) => i % 2 === 1);
    if (p0.every((v) => v === 'x3') && p1.every((v) => v === p1[0]) && p1[0] !== 'x3') { const nextOp = ops3.length % 2 === 0 ? 'x3' : p1[0]; add('alternating ×3 and ±k', nextOp === 'x3' ? t[n - 1] * 3 : t[n - 1] + Number(nextOp)); }
    if (p1.every((v) => v === 'x3') && p0.every((v) => v === p0[0]) && p0[0] !== 'x3') { const nextOp = ops3.length % 2 === 0 ? p0[0] : 'x3'; add('alternating ±k and ×3', nextOp === 'x3' ? t[n - 1] * 3 : t[n - 1] + Number(nextOp)); }
  }
  // pairwise: second of each pair = first/2 + c (odd length: next completes a pair)
  if (n % 2 === 1 && n >= 5) { const cs = []; for (let i = 0; i + 1 < n; i += 2) cs.push(t[i + 1] - t[i] / 2); if (cs.every((c) => c === cs[0]) && isInt(cs[0])) add('half plus constant', t[n - 1] / 2 + cs[0]); }
  // differences that are consecutive squares or consecutive primes
  { const ks = diffs.map((d) => Math.sqrt(d)); if (ks.every((k) => isInt(k) && k > 0) && ks.slice(1).every((k, i) => k === ks[i] + 1)) add('square differences', t[n - 1] + (ks[ks.length - 1] + 1) ** 2); }
  { const i0 = PRIMES.indexOf(diffs[0]); if (i0 >= 0 && diffs.every((d, i) => PRIMES[i0 + i] === d) && PRIMES[i0 + diffs.length] != null) add('prime differences', t[n - 1] + PRIMES[i0 + diffs.length]); }
  // digit-sum growth
  if (t.slice(1).every((v, i) => v === t[i] + digitSumOf(t[i]))) add('digit sum', t[n - 1] + digitSumOf(t[n - 1]));
  // three interleaved arithmetic series
  if (n >= 7) { const subs = [0, 1, 2].map((k) => t.filter((_, i) => i % 3 === k)); const nexts = subs.map(arithNext); if (nexts.every((x) => x != null)) add('three interleaved', nexts[n % 3]); }
  // second-order recurrences t = a*t[n-1] + b*t[n-2]
  for (const a of [1, 2, 3]) for (const b of [1, 2, 3]) { if (a === 1 && b === 1) continue; if (n >= 4 && t.slice(2).every((v, i) => v === a * t[i + 1] + b * t[i])) add(`${a}×prev+${b}×before`, a * t[n - 1] + b * t[n - 2]); }
  // cubes
  { const roots = t.map((v) => Math.round(Math.cbrt(v))); if (roots.every((r, i) => r > 0 && r ** 3 === t[i]) && roots.slice(1).every((r, i) => r === roots[i] + 1)) add('cubes', (roots[n - 1] + 1) ** 3); }
  // consecutive primes
  { const idx = PRIMES.indexOf(t[0]); if (idx >= 0 && t.every((v, i) => PRIMES[idx + i] === v) && PRIMES[idx + n] != null) add('primes', PRIMES[idx + n]); }
  // squares (+k)
  for (const k of [-1, 0, 1, 2, 3]) { const roots = t.map((v) => Math.sqrt(v - k)); if (roots.every((r) => isInt(r) && r > 0) && roots.slice(1).every((r, i) => r === roots[i] + 1)) add(`squares${k ? (k > 0 ? '+' : '−') + Math.abs(k) : ''}`, (roots[n - 1] + 1) ** 2 + k); }
  return preds;
}

export function buildSeries(difficulty, rng) {
  const rule = rng.pick(SERIES_RULES[Math.min(5, Math.max(1, difficulty))]);
  const s = build(rule, rng);
  if (!s) return null;
  const terms = s.terms;
  const next = s.next ?? null;
  let answer;
  let shown;
  if (s.textual) { shown = terms; answer = next; }
  else if (next != null) { shown = terms; answer = next; }
  else { shown = terms.slice(0, -1); answer = terms[terms.length - 1]; }
  // uniqueness within the numeric grammar
  if (s.textual && s.baseSeq) {
    const pb = predictNumeric(s.baseSeq), pe = predictNumeric(s.expSeq);
    if (pb.size !== 1 || !pb.has(s.nextBase) || pe.size !== 1 || !pe.has(s.nextExp)) return null;
  } else if (s.textual && s.numeric) {
    const p1 = predictNumeric(s.numeric);
    if (p1.size !== 1 || !p1.has(s.nextNumeric)) return null;
    if (s.numeric2) { const p2 = predictNumeric(s.numeric2); if (p2.size !== 1 || !p2.has(s.nextNumeric2)) return null; }
  } else {
    const preds = predictNumeric(shown);
    if (preds.size !== 1 || !preds.has(answer)) return null;
  }
  // options: answer + 4 distinct misconceptions
  const opts = [answer];
  for (const m of s.misc) if (!opts.includes(m) && (s.textual || (isInt(m) && m > 0))) opts.push(m);
  let guard = 0;
  while (opts.length < 5 && guard++ < 20) { const m = s.textual ? (s.baseSeq ? `${s.nextBase + guard}{sup ${s.nextExp}}` : `${LETTERS[(s.nextNumeric + guard) % 26]}`) : answer + rng.pick([-3, -2, 2, 3, 4, 5]) * (guard % 2 ? 1 : 2); if (!opts.includes(m) && (s.textual || m > 0)) opts.push(m); }
  if (opts.length < 5) return null;
  const order = rng.shuffle(opts.map((_, i) => i));
  const options = order.map((i) => String(opts[i]));
  const correctIndex = order.indexOf(0);
  const promptTerms = shown.map(String).join(' -- ') + ' -- ...';
  const isLetters = s.numeric && !s.baseSeq;
  const fmt = (v) => String(v).replace(/\{sup ([^}]+)\}/g, '^$1');
  return {
    rule,
    question: isLetters ? 'Which letters complete the series?' : 'Which number completes the series?',
    prompt: promptTerms,
    options,
    correctIndex,
    explanation: {
      summary: `In this series ${s.how}.`,
      steps: [`Shown: ${shown.map(fmt).join(', ')}.`, `Applying the rule once more gives ${fmt(answer)}.`],
    },
    hints: ['Look at the differences (or ratios) between neighbouring numbers first.', 'If no single step fits, test two interleaved series or a rule that works in pairs.', `Rule: ${s.how}.`],
    features: { rule, letters: !!isLetters },
  };
}
