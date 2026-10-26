// Applied word problems: directions and distances, reverse percentages, clock hands, rates, averages, ages.
// Numbers are chosen so every answer is exact; distractors are the standard slips.

const NAMES = ['Nadia', 'Tomas', 'Priya', 'Lena', 'Omar', 'Yuki', 'Marco', 'Sofia'];

function finish(rng, ans, wrongs, fmt, question, prompt, steps, hints, rule) {
  const uniq = [];
  for (const w of wrongs) if (w != null && Number.isFinite(w) && w !== ans && !uniq.includes(w)) uniq.push(w);
  if (uniq.length < 4) return null;
  const opts = [ans, ...rng.shuffle(uniq).slice(0, 4)];
  const order = rng.shuffle(opts.map((_, i) => i));
  return { question, prompt, options: order.map((i) => fmt(opts[i])), correctIndex: order.indexOf(0), explanation: { summary: `The answer is ${fmt(ans)}.`, steps }, hints, features: { rule } };
}

function directions(rng) {
  // west then north then west again (or mirrored), displacement with a Pythagorean total
  const triples = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]];
  const [a, b, c] = rng.pick(triples);
  const w1 = rng.range(1, a - 1), w2 = a - w1;
  const dirs = rng.pick([['west', 'north', 'west', 'north-west'], ['east', 'south', 'east', 'south-east'], ['north', 'east', 'north', 'north-east'], ['south', 'west', 'south', 'south-west']]);
  const turn = { west: ['right', 'left'], east: ['right', 'left'], north: ['right', 'left'], south: ['right', 'left'] };
  const [d1, d2, d3, diag] = dirs;
  // turning right from west gives north; right from east gives south; right from north gives east; right from south gives west
  const rightOf = { west: 'north', east: 'south', north: 'east', south: 'west' };
  const t1 = rightOf[d1] === d2 ? 'right' : 'left';
  const t2 = rightOf[d2] === d3 ? 'right' : 'left';
  void turn;
  const prompt = `A delivery van travels ${w1} km ${d1}, then turns ${t1} and travels ${b} km ${d2}. It then turns ${t2} and travels ${w2} km ${d3}. How far is the van from its starting point, and in which direction?`;
  const fmt = (v) => (typeof v === 'string' ? v : `${v} km ${diag}`);
  const ans = `${c} km ${diag}`;
  const wrongs = [`${a + b} km ${diag}`, `${c} km ${d1}`, `${Math.abs(a - b)} km ${diag}`, `${a} km ${d1}`, `${b} km ${d2}`];
  const uniq = wrongs.filter((w) => w !== ans);
  const opts = [ans, ...rng.shuffle([...new Set(uniq)]).slice(0, 4)];
  if (opts.length < 5) return null;
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'How far, and in which direction?',
    prompt,
    options: order.map((i) => fmt(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: `${c} km ${diag}.`, steps: [`The two legs ${d1} add up: ${w1} + ${w2} = ${a} km ${d1}; the other leg is ${b} km ${d2}.`, `Those are the two sides of a right angle, so the straight-line distance is √(${a}² + ${b}²) = ${c} km, pointing ${diag}.`] },
    hints: ['Add up the legs that run in the same direction.', 'The two totals are at right angles: draw them as a triangle.', `√(${a}² + ${b}²) = ${c}.`],
    features: { rule: 'directions' },
  };
}

function reversePercent(rng) {
  const p = rng.pick([5, 8, 10, 12, 15, 20, 25, 40]);
  const base = rng.pick([20000, 25000, 30000, 40000, 45000, 50000, 60000, 80000]);
  const after = base * (1 + p / 100);
  if (!Number.isInteger(after)) return null;
  const name = rng.pick(NAMES);
  const fmt = (v) => `${Math.round(v).toLocaleString('en-GB')}`;
  return finish(rng, base, [after * (1 - p / 100), after - base * p / 100 * 1.5, after / (1 + p / 100) * 1.02, after - p * 1000, base * (1 - p / 100)].map(Math.round),
    fmt, 'What was the salary before the increase?',
    `${name} received a ${p} % salary increase this year, making the new salary ${fmt(after)}.`,
    [`The new salary is ${100 + p} % of the old one, so divide: ${fmt(after)} ÷ ${(1 + p / 100)} = ${fmt(base)}.`, `Subtracting ${p} % of the new salary gives a different, wrong number: the percentage was taken of the old salary.`],
    ['The increase was a percentage of the old salary, not the new one.', `The new salary equals ${100 + p} % of the old salary.`, `Divide by ${(1 + p / 100)}.`], 'reverse-percent');
}

function clockHands(rng) {
  const h = rng.range(1, 10);
  // hands overlap at h:(60h/11) minutes
  const minutesExact = (60 * h) / 11;
  const whole = Math.floor(minutesExact);
  const frac = 60 * h - whole * 11; // numerator over 11
  const fmt = (v) => (typeof v === 'string' ? v : v);
  const ans = `${h}:${String(whole).padStart(2, '0')} and ${frac}/11 min`;
  const wrongs = [`${h}:${String(whole).padStart(2, '0')}`, `${h}:${String(h * 5).padStart(2, '0')}`, `${h}:${String(whole + 1).padStart(2, '0')} and ${frac}/11 min`, `${h}:${String(whole).padStart(2, '0')} and ${(frac + 3) % 11}/11 min`, `${h}:30`];
  const opts = [ans, ...rng.shuffle([...new Set(wrongs.filter((w) => w !== ans))]).slice(0, 4)];
  if (opts.length < 5) return null;
  const order = rng.shuffle(opts.map((_, i) => i));
  return {
    question: 'At what time do the hands overlap?',
    prompt: `At what time between ${h} and ${h + 1} o'clock are the hour and minute hands of a clock exactly together?`,
    options: order.map((i) => fmt(opts[i])),
    correctIndex: order.indexOf(0),
    explanation: { summary: ans + '.', steps: [`At ${h}:00 the hour hand is ${h * 30}° past 12. The minute hand gains 5.5° per minute on the hour hand.`, `${h * 30} ÷ 5.5 = ${(60 * h)}/11 = ${whole} ${frac}/11 minutes past ${h}.`] },
    hints: ['Measure where the hour hand is at the full hour, in degrees.', 'Each minute the minute hand gains 5.5° on the hour hand.', `Divide ${h * 30}° by 5.5°.`],
    features: { rule: 'clock-hands' },
  };
}

function workRate(rng) {
  const pairs = [[6, 3, 2], [4, 12, 3], [10, 15, 6], [5, 20, 4], [8, 24, 6], [12, 6, 4], [9, 18, 6], [3, 6, 2]];
  const [a, b, t] = rng.pick(pairs);
  const [n1, n2] = rng.sample(NAMES, 2);
  const fmt = (v) => `${v} hours`;
  return finish(rng, t, [Math.round((a + b) / 2), a + b, Math.abs(a - b), Math.round(a * b / 10) || 1, t + 1, t - 1], fmt,
    'How long do they take together?',
    `${n1} can paint a fence in ${a} hours; ${n2} can paint the same fence in ${b} hours. Working together at the same rates, how long do they take?`,
    [`In one hour ${n1} paints 1/${a} of the fence and ${n2} paints 1/${b}; together 1/${a} + 1/${b} = 1/${t}.`, `So the whole fence takes ${t} hours.`],
    ['Think in fence-per-hour, not hours.', `Add the two rates: 1/${a} + 1/${b}.`, `The combined rate is 1/${t}, so ${t} hours.`], 'work-rate');
}

function speedTime(rng) {
  const speed = rng.pick([40, 50, 60, 80, 90, 120]);
  const minutes = rng.pick([15, 20, 30, 45, 50, 75, 90]);
  const dist = speed * minutes / 60;
  if (!Number.isInteger(dist)) return null;
  const fmt = (v) => `${v} km`;
  return finish(rng, dist, [speed * minutes / 100, speed, speed * minutes / 10, dist * 2, dist + 10, Math.round(dist / 2)], fmt,
    'How far does it travel?',
    `A train travels at a steady ${speed} km/h for ${minutes} minutes. How far does it travel?`,
    [`${minutes} minutes is ${minutes}/60 = ${minutes / 60} of an hour.`, `${speed} × ${minutes / 60} = ${dist} km.`],
    ['Convert the minutes to a fraction of an hour.', `${minutes} minutes = ${minutes / 60} h.`, `Multiply by the speed.`], 'speed-time');
}

function average(rng) {
  const n = rng.range(4, 6);
  const avg = rng.pick([12, 15, 18, 20, 24, 30, 36]);
  const known = [];
  let sum = 0;
  for (let i = 0; i < n - 1; i++) { const v = avg + rng.range(-6, 6); known.push(v); sum += v; }
  const last = avg * n - sum;
  if (last <= 0) return null;
  const fmt = (v) => String(v);
  return finish(rng, last, [avg, avg * n - sum + avg, Math.round(sum / (n - 1)), last + n, last - n, avg * 2], fmt,
    'What is the missing score?',
    `The average of ${n} test scores is ${avg}. The first ${n - 1} scores are ${known.join(', ')}. What is the last score?`,
    [`${n} scores with an average of ${avg} add up to ${n} × ${avg} = ${avg * n}.`, `The known scores add up to ${sum}, so the last score is ${avg * n} − ${sum} = ${last}.`],
    ['An average tells you the total: multiply it by the number of scores.', `The total must be ${avg * n}.`, 'Subtract the scores you know.'], 'average');
}

function ages(rng) {
  const child = rng.range(4, 12), k = rng.pick([3, 4, 5]);
  const parent = child * k;
  const years = rng.pick([4, 6, 8, 10, 12]);
  const ratioLater = (parent + years) / (child + years);
  if (!Number.isInteger(ratioLater)) return null;
  const fmt = (v) => `${v} years old`;
  return finish(rng, child, [parent, child + years, parent - child, Math.round(parent / 2), child + 2, child - 2], fmt,
    'How old is the child now?',
    `A parent is ${k} times as old as their child. In ${years} years the parent will be ${ratioLater} times as old as the child. How old is the child now?`,
    [`Let the child be c; the parent is ${k}c. In ${years} years: ${k}c + ${years} = ${ratioLater}(c + ${years}).`, `${k}c + ${years} = ${ratioLater}c + ${ratioLater * years}, so ${k - ratioLater}c = ${ratioLater * years - years}, c = ${child}.`],
    ['Write both ages now in terms of the child\'s age.', `Add ${years} to both and set up the second ratio.`, 'Solve the resulting equation.'], 'ages');
}

export function buildWord(difficulty, rng) {
  const pick = {
    1: [speedTime, average],
    2: [speedTime, average, reversePercent],
    3: [reversePercent, directions, workRate],
    4: [directions, workRate, ages],
    5: [clockHands, ages, directions],
  }[Math.min(5, Math.max(1, difficulty))];
  const item = rng.pick(pick)(rng);
  if (!item) return null;
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
