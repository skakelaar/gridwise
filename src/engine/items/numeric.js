// Fractions, percentages and equation-filling items.

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n, d) => `{frac ${n}/${d}}`;
function simplify(n, d) { const g = gcd(n, d) || 1; return [n / g, d / g]; }
const fmtFrac = (n, d) => (d === 1 ? String(n) : frac(n, d));
const plainFrac = (n, d) => (d === 1 ? String(n) : `${n}/${d}`);

function equivalence(rng) {
  // a/x = x/b with x² = a·b:  a, x = a·k, b = a·k²
  const a = rng.range(2, 9), k = rng.range(2, 4);
  const x = a * k, b = a * k * k;
  const wrong = [a + k, b / 2, x + a, x - a, a * a, b - x, x + k, a + b].filter((v) => v > 0 && v !== x && Number.isInteger(v));
  const opts = [x, ...rng.shuffle([...new Set(wrong)]).slice(0, 4)];
  if (opts.length < 5) return null;
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which number can replace both question marks?',
    prompt: `${frac(a, '?')} = ${frac('?', b)}`,
    options: order.map((i) => String(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${x} is the only option that fits both question marks.`, steps: [`${a}/${x} and ${x}/${b} are both equal to ${plainFrac(...simplify(a, x))}.`, `In general the number must satisfy ? × ? = ${a} × ${b} = ${a * b}, and ${x} × ${x} = ${x * x}.`] },
    hints: ['The same number goes in both places, so the two fractions must be equal.', 'Try each option in both fractions and reduce them.', `Only ${x} gives the same value on both sides.`],
    features: { rule: 'equivalence' },
  };
}

function percent(rng) {
  const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 60, 75, 80, 90]);
  const n = rng.pick([24, 36, 40, 48, 55, 60, 64, 72, 80, 88, 96, 120, 150, 240]);
  const ans = Math.round(n * p) / 100;
  const fmt = (v) => String(Math.round(v * 100) / 100);
  const wrong = [n * p / 1000, n * (100 - p) / 100, n * p / 10, ans + n / 10, p, n - p].map((v) => Math.round(v * 100) / 100).filter((v) => v > 0 && v !== ans);
  const opts = [ans, ...[...new Set(wrong)].slice(0, 4)];
  if (opts.length < 5) return null;
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which number completes the statement?',
    prompt: `? = ${p} % of ${n}`,
    options: order.map((i) => fmt(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${n} × ${p / 100} = ${fmt(ans)}.`, steps: [`${p} % means ${p} hundredths, so multiply ${n} by ${p / 100}.`] },
    hints: ['Turn the percentage into a decimal (per cent = per hundred).', `10 % of ${n} is ${n / 10}; build the rest from that.`, `${n} × ${p / 100} = ${fmt(ans)}.`],
    features: { rule: 'percent' },
  };
}

function fractionArith(rng) {
  const d1 = rng.pick([3, 4, 5, 6, 8]), d2 = rng.pick([3, 4, 5, 6, 8, 10].filter((d) => d !== d1));
  const n1 = rng.range(1, d1 - 1), n2 = rng.range(1, d2 - 1);
  const sub = rng.chance(0.5);
  const L = d1 * d2 / gcd(d1, d2);
  const a = n1 * (L / d1), b = n2 * (L / d2);
  const num = sub ? a - b : a + b;
  if (num <= 0) return null;
  const [rn, rd] = simplify(num, L);
  const key = (n, d) => `${n}/${d}`;
  const wrongs = [
    simplify(sub ? n1 - n2 : n1 + n2, d1 + d2), // adding tops and bottoms
    [num, L].every(Number.isFinite) ? [num + (sub ? L / d2 : -(L / d2)), L] : null,
    simplify(sub ? a + b : Math.abs(a - b), L), // wrong sign
    simplify(n1 * n2, d1 * d2),
    [rn + 1, rd],
  ].filter((w) => w && w[0] > 0 && key(...simplify(w[0], w[1])) !== key(rn, rd)).map((w) => simplify(w[0], w[1]));
  const uniq = []; for (const w of wrongs) if (!uniq.some((u) => key(...u) === key(...w))) uniq.push(w);
  if (uniq.length < 4) return null;
  const opts = [[rn, rd], ...uniq.slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which fraction is the result?',
    prompt: `${frac(n1, d1)} ${sub ? '−' : '+'} ${frac(n2, d2)} = ?`,
    options: order.map((i) => fmtFrac(...opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `The result is ${plainFrac(rn, rd)}.`, steps: [`Bring both fractions to the common denominator ${L}: ${n1}/${d1} = ${a}/${L} and ${n2}/${d2} = ${b}/${L}.`, `${a}/${L} ${sub ? '−' : '+'} ${b}/${L} = ${num}/${L}${num !== rn ? `, which simplifies to ${plainFrac(rn, rd)}` : ''}.`] },
    hints: ['Fractions can only be added or subtracted once they share a denominator.', `${d1} and ${d2} both go into ${L}.`, `Scale both fractions to ${L}ths, then ${sub ? 'subtract' : 'add'} the numerators and simplify.`],
    features: { rule: sub ? 'fraction-subtract' : 'fraction-add' },
  };
}

function equationFill(rng) {
  // (n ÷ ?) ÷ (m + ?) = r, one unknown in both places
  const x = rng.range(2, 6), m = rng.range(1, 5), r = rng.range(2, 4);
  const n = x * r * (m + x);
  const evalAt = (v) => (n / v) / (m + v);
  const cands = [x, x + 1, x - 1, x + 2, m + x, r, n / (m + x), x * 2].filter((v) => v > 0 && v !== x && Number.isInteger(v));
  const uniq = [...new Set(cands)].filter((v) => Math.abs(evalAt(v) - r) > 1e-9);
  if (uniq.length < 4) return null;
  const opts = [x, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which number can replace both question marks?',
    prompt: `(${n} ÷ ?) ÷ (${m} + ?) = ${r}`,
    options: order.map((i) => String(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${x} works in both places.`, steps: [`(${n} ÷ ${x}) = ${n / x}. (${m} + ${x}) = ${m + x}. ${n / x} ÷ ${m + x} = ${r}.`, 'Trying the other options gives a different result each time.'] },
    hints: ['The same number goes in both brackets.', 'Try the options one by one: divide first, then add, then divide.', `${x} gives ${n / x} ÷ ${m + x} = ${r}.`],
    features: { rule: 'equation-fill' },
  };
}

function ratio(rng) {
  // a : b = ? : d  with the same scale factor
  const k = rng.range(2, 6), a = rng.range(2, 9), b = rng.range(2, 9);
  if (a === b) return null;
  const d = b * k, x = a * k;
  const wrong = [a + k, d - (b - a), b * k - a, x + k, a * b, d - a].filter((v) => v > 0 && v !== x && Number.isInteger(v));
  const uniq = [...new Set(wrong)];
  if (uniq.length < 4) return null;
  const opts = [x, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which number completes the proportion?',
    prompt: `${a} : ${b} = ? : ${d}`,
    options: order.map((i) => String(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${x} keeps the two ratios equal.`, steps: [`${d} is ${b} × ${k}, so the missing number is ${a} × ${k} = ${x}.`, `Check: ${a}/${b} and ${x}/${d} both reduce to ${plainFrac(...simplify(a, b))}.`] },
    hints: ['Find how the second ratio\'s known number was obtained from the first ratio.', `${b} became ${d}: by what factor?`, `Apply the same factor to ${a}.`],
    features: { rule: 'ratio' },
  };
}

function percentOfWhat(rng) {
  const p = rng.pick([10, 20, 25, 40, 50, 60, 75, 80]);
  const x = rng.pick([40, 60, 80, 120, 150, 200, 240, 300]);
  const part = x * p / 100;
  if (!Number.isInteger(part)) return null;
  const wrong = [part * p / 100, x * p / 100, part + p, Math.round(part / (p / 100) * 1.5), x + part, p * part].filter((v) => v > 0 && v !== x && Number.isInteger(v));
  const uniq = [...new Set(wrong)];
  if (uniq.length < 4) return null;
  const opts = [x, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which number completes the statement?',
    prompt: `${p} % of ? = ${part}`,
    options: order.map((i) => String(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${part} is ${p} % of ${x}.`, steps: [`If ${p} % of the number is ${part}, then 1 % is ${part / p}, so 100 % is ${x}.`] },
    hints: ['Work out what 1 % would be first.', `${part} ÷ ${p} gives 1 %.`, 'Multiply that by 100.'],
    features: { rule: 'percent-of-what' },
  };
}

function compareFractions(rng) {
  const dens = [3, 4, 5, 6, 7, 8, 9, 10, 12];
  const fr = [];
  let guard = 0;
  while (fr.length < 5 && guard++ < 60) {
    const d = rng.pick(dens), n = rng.range(1, d - 1);
    const [sn, sd] = simplify(n, d);
    if (!fr.some((f) => f[0] === sn && f[1] === sd) && !fr.some((f) => Math.abs(f[0] / f[1] - sn / sd) < 0.02)) fr.push([sn, sd]);
  }
  if (fr.length < 5) return null;
  const values = fr.map(([n, d]) => n / d);
  const max = Math.max(...values);
  const correctIndex = values.indexOf(max);
  return {
    question: 'Which fraction is the largest?',
    prompt: 'Compare the five fractions.',
    options: fr.map(([n, d]) => frac(n, d)),
    correctIndex,
    explanation: { summary: `${plainFrac(...fr[correctIndex])} is the largest.`, steps: [`As decimals: ${fr.map(([n, d]) => `${plainFrac(n, d)} ≈ ${(n / d).toFixed(2)}`).join(', ')}.`] },
    hints: ['Fractions above or below one half are quickly sorted; compare the rest more carefully.', 'Convert to decimals, or bring the close ones to a common denominator.', `The largest is ${plainFrac(...fr[correctIndex])}.`],
    features: { rule: 'compare-fractions' },
  };
}

function fractionMultiply(rng) {
  const d1 = rng.pick([2, 3, 4, 5, 6]), d2 = rng.pick([2, 3, 4, 5, 6, 8]);
  // inputs are shown in lowest terms
  const n1 = rng.pick([...Array(d1 - 1).keys()].map((i) => i + 1).filter((n) => gcd(n, d1) === 1));
  const n2 = rng.pick([...Array(d2 - 1).keys()].map((i) => i + 1).filter((n) => gcd(n, d2) === 1));
  const divide = rng.chance(0.4);
  const [rn, rd] = divide ? simplify(n1 * d2, d1 * n2) : simplify(n1 * n2, d1 * d2);
  const key = (n, d) => { const [a, b] = simplify(n, d); return `${a}/${b}`; };
  const wrongs = [simplify(n1 * n2, d1 * d2), simplify(n1 * d2, d1 * n2), simplify(n1 + n2, d1 + d2), simplify(n1 * d2 + n2 * d1, d1 * d2), simplify(rn + 1, rd), simplify(n1 * n2, d1 + d2)]
    .filter((w) => w[0] > 0 && w[1] > 0 && key(...w) !== key(rn, rd));
  const uniq = []; for (const w of wrongs) if (!uniq.some((u) => key(...u) === key(...w))) uniq.push(w);
  if (uniq.length < 4) return null;
  const opts = [[rn, rd], ...uniq.slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which fraction is the result?',
    prompt: `${frac(n1, d1)} ${divide ? '÷' : '×'} ${frac(n2, d2)} = ?`,
    options: order.map((i) => fmtFrac(...opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `The result is ${plainFrac(rn, rd)}.`, steps: divide ? [`Dividing by a fraction is multiplying by its reciprocal: ${n1}/${d1} × ${d2}/${n2} = ${n1 * d2}/${d1 * n2}${n1 * d2 !== rn ? `, which simplifies to ${plainFrac(rn, rd)}` : ''}.`] : [`Multiply numerators and denominators: ${n1 * n2}/${d1 * d2}${n1 * n2 !== rn ? `, which simplifies to ${plainFrac(rn, rd)}` : ''}.`] },
    hints: [divide ? 'To divide by a fraction, flip it and multiply.' : 'Multiply the tops together and the bottoms together.', 'Then simplify by any common factor.', `The result is ${plainFrac(rn, rd)}.`],
    features: { rule: divide ? 'fraction-divide' : 'fraction-multiply' },
  };
}

function equationPair(rng) {
  // (n ÷ a) ÷ (m + b) = r with two different unknowns; options are pairs "a and b"
  const a = rng.range(2, 7), b = rng.range(1, 6), m = rng.range(1, 5), r = rng.range(2, 4);
  if (a === b) return null;
  const n = a * r * (m + b);
  const evalAt = (x, y) => (n / x) / (m + y);
  const pairs = [[a, b]];
  const cands = [[b, a], [a, b + 1], [a + 1, b], [a - 1, b + 1], [b + 1, a], [a, m], [r, b], [a * 2, b]].filter(([x, y]) => x > 0 && y >= 0 && Math.abs(evalAt(x, y) - r) > 1e-9);
  for (const c of rng.shuffle(cands)) if (pairs.length < 5 && !pairs.some((p) => p[0] === c[0] && p[1] === c[1])) pairs.push(c);
  if (pairs.length < 5) return null;
  const order = rng.shuffle(pairs.map((_, i) => i));
  return {
    question: 'Which pair of numbers makes the equation true (first question mark, then second)?',
    prompt: `(${n} ÷ ?) ÷ (${m} + ?) = ${r}`,
    options: order.map((i) => `${pairs[i][0]} and ${pairs[i][1]}`),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${a} and ${b}.`, steps: [`(${n} ÷ ${a}) = ${n / a}. (${m} + ${b}) = ${m + b}. ${n / a} ÷ ${m + b} = ${r}.`, 'No other listed pair gives the right-hand side.'] },
    hints: ['The two question marks are different numbers; each option gives them in order.', 'Work out the first bracket, then the second, then divide.', `${a} and ${b} give ${n / a} ÷ ${m + b} = ${r}.`],
    features: { rule: 'equation-pair' },
  };
}

function compoundPercent(rng) {
  const up = rng.pick([10, 20, 25, 40, 50]), down = rng.pick([10, 20, 25, 40, 50]);
  const factor = (1 + up / 100) * (1 - down / 100);
  const change = Math.round((factor - 1) * 1000) / 10;
  const fmt = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} %`;
  const wrong = [up - down, -(down - up), change + 5, change - 5, up - down + 2.5].map((v) => Math.round(v * 10) / 10).filter((v) => v !== change);
  const uniq = [...new Set(wrong)];
  if (uniq.length < 4) return null;
  const opts = [change, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'What is the overall change?',
    prompt: `A price rises by ${up} % and then falls by ${down} %.`,
    options: order.map((i) => fmt(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `The overall change is ${fmt(change)}.`, steps: [`Multiply the factors: ${1 + up / 100} × ${1 - down / 100} = ${Math.round(factor * 1000) / 1000}.`, 'Percentages applied one after the other multiply; they do not add.'] },
    hints: ['Take a starting price of 100 and apply each change in turn.', `100 → ${100 + up} → ${Math.round((100 + up) * (1 - down / 100) * 10) / 10}.`, `That is ${fmt(change)} overall.`],
    features: { rule: 'compound-percent' },
  };
}

function ratioShare(rng) {
  const parts = rng.shuffle([1, 2, 3, 4, 5]).slice(0, 3).sort((a, b) => a - b);
  const unit = rng.pick([4, 5, 6, 8, 10, 12]);
  const sum = parts.reduce((a, b) => a + b, 0);
  const total = sum * unit;
  const which = rng.pick(['largest', 'smallest']);
  const ans = (which === 'largest' ? parts[2] : parts[0]) * unit;
  const wrong = [parts[1] * unit, (which === 'largest' ? parts[0] : parts[2]) * unit, Math.round(total / 3), ans + unit, ans - unit, unit].filter((v) => v > 0 && v !== ans);
  const uniq = [...new Set(wrong)];
  if (uniq.length < 4) return null;
  const opts = [ans, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: `What is the ${which} share?`,
    prompt: `${total} is shared in the ratio ${parts.join(' : ')}.`,
    options: order.map((i) => String(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `The ${which} share is ${ans}.`, steps: [`The ratio has ${sum} parts, so one part is ${total} ÷ ${sum} = ${unit}.`, `The ${which} share is ${which === 'largest' ? parts[2] : parts[0]} parts: ${which === 'largest' ? parts[2] : parts[0]} × ${unit} = ${ans}.`] },
    hints: ['Add the ratio numbers to find how many parts there are.', `${total} ÷ ${sum} gives one part.`, 'Multiply one part by the number of parts in the share you want.'],
    features: { rule: 'ratio-share' },
  };
}

function powersRoots(rng) {
  const kind = rng.pick(['rootTimesPower', 'powerMinusPower', 'rootPlusRoot']);
  let prompt, ans, steps;
  if (kind === 'rootTimesPower') { const r = rng.pick([4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144]); const b = rng.pick([2, 3]), e = rng.pick([2, 3, 4]); ans = Math.sqrt(r) * b ** e; prompt = `√${r} × ${b}{sup ${e}} = ?`; steps = [`√${r} = ${Math.sqrt(r)} and ${b}^${e} = ${b ** e}, so ${Math.sqrt(r)} × ${b ** e} = ${ans}.`]; }
  else if (kind === 'powerMinusPower') { const a = rng.pick([2, 3, 4, 5]), e1 = rng.pick([3, 4]), b = rng.pick([2, 3]), e2 = rng.pick([2, 3, 5]); if (a ** e1 <= b ** e2) return null; ans = a ** e1 - b ** e2; prompt = `${a}{sup ${e1}} − ${b}{sup ${e2}} = ?`; steps = [`${a}^${e1} = ${a ** e1} and ${b}^${e2} = ${b ** e2}, so the difference is ${ans}.`]; }
  else { const r1 = rng.pick([16, 25, 36, 49, 64, 81]), r2 = rng.pick([4, 9, 100, 121, 144]); ans = Math.sqrt(r1) + Math.sqrt(r2); prompt = `√${r1} + √${r2} = ?`; steps = [`√${r1} = ${Math.sqrt(r1)} and √${r2} = ${Math.sqrt(r2)}; their sum is ${ans}.`]; }
  const wrong = [ans + 1, ans - 1, ans * 2, Math.round(ans / 2), ans + 4, ans - 6].filter((v) => v > 0 && v !== ans && Number.isInteger(v));
  const uniq = [...new Set(wrong)];
  if (uniq.length < 4) return null;
  const opts = [ans, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which number is the result?',
    prompt,
    options: order.map((i) => String(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `The result is ${ans}.`, steps },
    hints: ['Evaluate each power or root on its own first.', 'Then combine the two results.', `The result is ${ans}.`],
    features: { rule: 'powers-roots' },
  };
}

function mixedFractions(rng) {
  const w1 = rng.range(1, 3), w2 = rng.range(1, 2);
  const d1 = rng.pick([2, 3, 4, 6]), d2 = rng.pick([3, 4, 5, 6, 8].filter((d) => d !== d1));
  const n1 = rng.range(1, d1 - 1), n2 = rng.range(1, d2 - 1);
  const sub = rng.chance(0.5);
  const L = d1 * d2 / gcd(d1, d2);
  const top1 = w1 * d1 + n1, top2 = w2 * d2 + n2;
  const num = sub ? top1 * (L / d1) - top2 * (L / d2) : top1 * (L / d1) + top2 * (L / d2);
  if (num <= 0) return null;
  const [rn, rd] = simplify(num, L);
  const whole = Math.floor(rn / rd), rem = rn - whole * rd;
  const mixed = (n, d) => { const wh = Math.floor(n / d), r = n - wh * d; return wh === 0 ? frac(n, d) : r === 0 ? String(wh) : `${wh} ${frac(r, d)}`; };
  const plainMixed = (n, d) => { const wh = Math.floor(n / d), r = n - wh * d; return wh === 0 ? `${n}/${d}` : r === 0 ? String(wh) : `${wh} ${r}/${d}`; };
  const key = (n, d) => `${n}/${d}`;
  const wrongs = [simplify(sub ? Math.abs(w1 * d1 * d2 - w2 * d1 * d2) + Math.abs(n1 - n2) * 1 : (w1 + w2) * d1 * d2 + (n1 + n2), d1 * d2), simplify(num + L / d2, L), simplify(num - L / d1, L), [rn + rd, rd], simplify((sub ? w1 - w2 : w1 + w2) * (d1 + d2) + (sub ? Math.abs(n1 - n2) : n1 + n2), d1 + d2)]
    .filter((w) => w[0] > 0 && key(...w) !== key(rn, rd));
  const uniq = []; for (const w of wrongs) if (!uniq.some((u) => key(...u) === key(...w))) uniq.push(w);
  if (uniq.length < 4) return null;
  const opts = [[rn, rd], ...uniq.slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'Which is the result?',
    prompt: `${w1} ${frac(n1, d1)} ${sub ? '−' : '+'} ${w2} ${frac(n2, d2)} = ?`,
    options: order.map((i) => mixed(...opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `The result is ${plainMixed(rn, rd)}.`, steps: [`Convert to improper fractions: ${top1}/${d1} and ${top2}/${d2}.`, `Common denominator ${L}: ${top1 * (L / d1)}/${L} ${sub ? '−' : '+'} ${top2 * (L / d2)}/${L} = ${num}/${L}${num !== rn ? ` = ${rn}/${rd}` : ''}, that is ${plainMixed(rn, rd)}.`] },
    hints: ['Turn each mixed number into an improper fraction first.', `Then use the common denominator ${L}.`, 'Convert the answer back to a mixed number and simplify.'],
    features: { rule: sub ? 'mixed-subtract' : 'mixed-add', whole, rem },
  };
}

export function buildNumeric(difficulty, rng) {
  const pick = {
    1: [equivalence, percent, ratio],
    2: [percent, equivalence, fractionArith, ratio, percentOfWhat],
    3: [fractionArith, equationFill, compareFractions, fractionMultiply, percentOfWhat],
    4: [equationFill, equationPair, fractionArith, fractionMultiply, compareFractions],
    5: [compoundPercent, ratioShare, powersRoots, mixedFractions, equationPair],
  }[Math.min(5, Math.max(1, difficulty))];
  const item = rng.pick(pick)(rng);
  if (!item) return null;
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
