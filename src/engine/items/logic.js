// Logical-deduction items: "Which statement logically and inescapably follows from the first two statements?"
// Universal statements (modus ponens / tollens / no valid conclusion) and ordering problems whose
// answer is determined, or not, by checking every consistent order.

const NONE = 'None of these conclusions is logically inescapable';

// Original vocabulary: [group noun (plural, singular), property (verb phrase, negated, noun form for the converse)]
const GROUPS_BANK = [
  { plural: 'lifeguards', singular: 'a lifeguard', has: 'can swim', hasNot: 'cannot swim', converse: 'Everyone who can swim is a lifeguard' },
  { plural: 'members of the chess club', singular: 'a member of the chess club', has: 'wears a badge', hasNot: 'does not wear a badge', converse: 'Everyone who wears a badge is a member of the chess club' },
  { plural: 'bakers in this town', singular: 'a baker in this town', has: 'starts work before dawn', hasNot: 'does not start work before dawn', converse: 'Everyone who starts work before dawn is a baker in this town' },
  { plural: 'pilots', singular: 'a pilot', has: 'has a licence', hasNot: 'does not have a licence', converse: 'Everyone who has a licence is a pilot' },
  { plural: 'players in the orchestra', singular: 'a player in the orchestra', has: 'reads music', hasNot: 'does not read music', converse: 'Everyone who reads music is a player in the orchestra' },
  { plural: 'residents of Oak Street', singular: 'a resident of Oak Street', has: 'has a parking permit', hasNot: 'does not have a parking permit', converse: 'Everyone who has a parking permit is a resident of Oak Street' },
  { plural: 'marathon runners', singular: 'a marathon runner', has: 'trains on Sundays', hasNot: 'does not train on Sundays', converse: 'Everyone who trains on Sundays is a marathon runner' },
  { plural: 'librarians', singular: 'a librarian', has: 'owns a bicycle', hasNot: 'does not own a bicycle', converse: 'Everyone who owns a bicycle is a librarian' },
];
const NAMES = ['Frank', 'Nadia', 'Tomas', 'Priya', 'Lena', 'Omar', 'Yuki', 'Marco', 'Sofia', 'Amir', 'Greta', 'Hugo', 'Ines', 'Kofi', 'Mila', 'Ravi'];

function universal(difficulty, rng) {
  const g = rng.pick(GROUPS_BANK);
  const name = rng.pick(NAMES);
  const first = `All ${g.plural} ${g.has.replace(/^(has|wears|starts|reads|trains|owns|can)/, (v) => ({ has: 'have', wears: 'wear', starts: 'start', reads: 'read', trains: 'train', owns: 'own', can: 'can' }[v]))}.`;
  const isA = `${name} is ${g.singular}`;
  const isNotA = `${name} is not ${g.singular}`;
  const hasB = `${name} ${g.has}`;
  const hasNotB = `${name} ${g.hasNot}`;
  const converse = g.converse;
  // Variants: which second premise, and which conclusion (if any) follows.
  const variants = {
    1: [{ second: `${isA}.`, answer: hasB, why: `${name}, as ${g.singular}, falls under "all ${g.plural}" in the first statement, so the property applies to ${name}.` }],
    2: [
      { second: `${hasNotB}.`, answer: isNotA, why: `If all ${g.plural} have the property, someone without it cannot be one of them. That does not mean everyone with the property is one of them.` },
      { second: `${hasB}.`, answer: NONE, why: `The first statement says nothing about people who have the property but are not ${g.plural}. ${name} may or may not be ${g.singular}, and the converse ("${converse}") is not stated.` },
    ],
    3: [
      { second: `${isNotA}.`, answer: NONE, why: `The first statement only tells us about ${g.plural}. It says nothing about whether someone who is not ${g.singular} has the property or not.` },
      { second: `${hasB}.`, answer: NONE, why: `Having the property is necessary for being ${g.singular}, not sufficient. The converse ("${converse}") is not stated.` },
    ],
  };
  const v = rng.pick(variants[Math.min(3, difficulty)]);
  const pool = [isA, isNotA, hasB, hasNotB, converse].filter((c) => c !== v.answer);
  const picks = rng.sample(pool, 3);
  const candidates = v.answer === NONE ? picks : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, ...(v.answer !== NONE ? ['The other conclusions go beyond what the two statements say.'] : [])] },
    hints: ['Treat the first statement as a rule about a whole group. Does the second statement place someone inside that group, or only tell you about the property?', 'A rule "all A have B" never allows you to conclude from "has B" that someone is an A.', `${v.answer === NONE ? 'Nothing follows inescapably here.' : `Only one conclusion is forced: ${v.answer}.`}`],
    features: { rule: 'universal', valid: v.answer !== NONE },
  };
}

const ATTRS = [
  { adj: 'taller', superl: 'tallest' }, { adj: 'older', superl: 'oldest' }, { adj: 'faster', superl: 'fastest' },
  { adj: 'heavier', superl: 'heaviest' }, { adj: 'richer', superl: 'richest' },
];

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((x, i) => permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
}

function ordering(difficulty, rng) {
  const n = difficulty >= 4 ? 4 : 3;
  const names = rng.sample(NAMES, n);
  const attr = rng.pick(ATTRS);
  const less = { taller: 'shorter', older: 'younger', faster: 'slower', heavier: 'lighter', richer: 'poorer' }[attr.adj];
  // random true order, best first
  const order = rng.shuffle(names);
  const rank = Object.fromEntries(order.map((p, i) => [p, i]));
  // constraints: pairs (a beats b)
  const pairs = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && rank[names[i]] < rank[names[j]]) pairs.push([names[i], names[j]]);
  const wantDetermined = difficulty <= 3 ? true : rng.chance(0.5);
  let chosen = null;
  for (let tries = 0; tries < 40 && !chosen; tries++) {
    const k = n === 3 ? 2 : rng.range(2, 3);
    const cand = rng.sample(pairs, k);
    const consistent = permutations(names).filter((p) => cand.every(([a, b]) => p.indexOf(a) < p.indexOf(b)));
    const tops = new Set(consistent.map((p) => p[0]));
    const determined = tops.size === 1;
    if (determined === wantDetermined) chosen = { cand, consistent, top: determined ? [...tops][0] : null };
  }
  if (!chosen) return null;
  const sentence = ([a, b], i) => (i % 2 === 0 ? `${a} is ${attr.adj} than ${b}.` : `${b} is ${less} than ${a}.`);
  const statements = chosen.cand.map(sentence);
  // Difficulty 2+: fold two statements into one when they share a person
  let prompt = statements.join('\n');
  if (difficulty >= 2 && chosen.cand.length >= 2) {
    const [p1, p2] = chosen.cand;
    if (p1[0] === p2[0]) prompt = [`${p1[0]} is ${attr.adj} than ${p1[1]} and than ${p2[1]}.`, ...chosen.cand.slice(2).map(sentence)].join('\n');
    else if (p1[1] === p2[0]) prompt = [`${p1[1]} is ${attr.adj} than ${p2[1]}, but ${less} than ${p1[0]}.`, ...chosen.cand.slice(2).map(sentence)].join('\n');
  }
  const options = [...rng.shuffle(names), NONE];
  const answer = chosen.top ?? NONE;
  const why = chosen.top
    ? `Putting the statements together gives the order ${chosen.consistent[0].join(' > ')} for ${attr.superl.replace('est', '')}ness is not needed: every order that fits the statements has ${chosen.top} at the top.`
    : `More than one order fits the statements (for example ${chosen.consistent.slice(0, 2).map((p) => p.join(' > ')).join(' or ')}), so the ${attr.superl} person is not determined.`;
  return {
    question: 'Which statement logically and inescapably follows from the statements?',
    prompt: `${prompt}\nWho is the ${attr.superl}?`,
    options,
    correctIndex: options.indexOf(answer),
    explanation: { summary: chosen.top ? `${chosen.top} is the ${attr.superl}.` : 'None of the conclusions is logically inescapable.', steps: [chosen.top ? `Every order consistent with the statements puts ${chosen.top} first (for example ${chosen.consistent[0].join(' > ')}).` : why] },
    hints: ['Write the people in a line from the statements, one comparison at a time.', 'Check whether the statements pin down who is at the top, or leave two people who could both be first.', chosen.top ? `${chosen.top} must be first.` : 'The top position is not fixed by the statements.'],
    features: { rule: 'ordering', people: n, valid: !!chosen.top },
  };
}

export function buildLogic(difficulty, rng) {
  const kind = difficulty >= 3 ? rng.pick(['universal', 'ordering']) : difficulty === 2 ? rng.pick(['universal', 'universal', 'ordering']) : rng.pick(['universal', 'ordering']);
  const item = kind === 'ordering' ? ordering(difficulty, rng) : universal(difficulty, rng);
  if (!item) return null;
  // Four or five options; exactly one correct by construction. Sanity: options distinct.
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
