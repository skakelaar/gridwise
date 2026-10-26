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

export function buildNumeric(difficulty, rng) {
  const pick = { 1: [equivalence, percent], 2: [percent, equivalence, fractionArith], 3: [fractionArith, equationFill], 4: [equationFill, fractionArith] }[Math.min(4, Math.max(1, difficulty))];
  const item = rng.pick(pick)(rng);
  if (!item) return null;
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
