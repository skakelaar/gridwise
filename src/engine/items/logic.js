// Logical-deduction items: "Which statement logically and inescapably follows from the first two statements?"
// Universal statements (modus ponens / tollens / no valid conclusion) and ordering problems whose
// answer is determined, or not, by checking every consistent order.

const NONE = 'None of these conclusions is logically inescapable';

// Original vocabulary: [group noun (plural, singular), property (verb phrase, negated, noun form for the converse)]
const GROUPS_BANK = [
  { plural: 'lifeguards', singular: 'a lifeguard', has: 'can swim', hasNot: 'cannot swim', converse: 'Everyone who can swim is a lifeguard', plausible: ['Lifeguards work mainly in summer', 'Swimming is good exercise'] },
  { plural: 'members of the chess club', singular: 'a member of the chess club', has: 'wears a badge', hasNot: 'does not wear a badge', converse: 'Everyone who wears a badge is a member of the chess club', plausible: ['Chess is a game of skill', 'The chess club meets on Thursdays'] },
  { plural: 'bakers in this town', singular: 'a baker in this town', has: 'starts work before dawn', hasNot: 'does not start work before dawn', converse: 'Everyone who starts work before dawn is a baker in this town', plausible: ['Bread is best eaten fresh', 'Bakers use flour'] },
  { plural: 'pilots', singular: 'a pilot', has: 'has a licence', hasNot: 'does not have a licence', converse: 'Everyone who has a licence is a pilot', plausible: ['Pilots can fly aeroplanes', 'A glider pilot is a pilot'] },
  { plural: 'players in the orchestra', singular: 'a player in the orchestra', has: 'reads music', hasNot: 'does not read music', converse: 'Everyone who reads music is a player in the orchestra', plausible: ['An orchestra has a conductor', 'Violins are string instruments'] },
  { plural: 'residents of Oak Street', singular: 'a resident of Oak Street', has: 'has a parking permit', hasNot: 'does not have a parking permit', converse: 'Everyone who has a parking permit is a resident of Oak Street', plausible: ['Oak Street has many oak trees', 'Parking permits must be renewed yearly'] },
  { plural: 'marathon runners', singular: 'a marathon runner', has: 'trains on Sundays', hasNot: 'does not train on Sundays', converse: 'Everyone who trains on Sundays is a marathon runner', plausible: ['Marathon runners are fit', 'A marathon is 42 kilometres long'] },
  { plural: 'librarians', singular: 'a librarian', has: 'owns a bicycle', hasNot: 'does not own a bicycle', converse: 'Everyone who owns a bicycle is a librarian', plausible: ['Libraries lend books', 'Bicycles have two wheels'] },
];

// Conditionals: if <condition>, then <result>.
const CONDITIONALS = [
  { cond: 'it rains on Saturday', condNot: 'it does not rain on Saturday', condPast: 'It rained on Saturday', condNotPast: 'It did not rain on Saturday', res: 'the match is postponed', resPast: 'The match was postponed', resNotPast: 'The match was not postponed' },
  { cond: 'the alarm is set', condNot: 'the alarm is not set', condPast: 'The alarm was set', condNotPast: 'The alarm was not set', res: 'Mila wakes at six', resPast: 'Mila woke at six', resNotPast: 'Mila did not wake at six' },
  { cond: 'the bridge is closed', condNot: 'the bridge is not closed', condPast: 'The bridge was closed', condNotPast: 'The bridge was not closed', res: 'the bus takes the long route', resPast: 'The bus took the long route', resNotPast: 'The bus did not take the long route' },
  { cond: 'the oven is hot enough', condNot: 'the oven is not hot enough', condPast: 'The oven was hot enough', condNotPast: 'The oven was not hot enough', res: 'the loaf rises', resPast: 'The loaf rose', resNotPast: 'The loaf did not rise' },
  { cond: 'the shop has power', condNot: 'the shop does not have power', condPast: 'The shop had power', condNotPast: 'The shop did not have power', res: 'the till works', resPast: 'The till worked', resNotPast: 'The till did not work' },
];

// Chained syllogisms: three class terms.
const CHAINS = [
  ['tulips', 'spring flowers', 'plants that need sunlight'],
  ['sonnets', 'poems', 'works of literature'],
  ['ferries', 'boats', 'vehicles that float'],
  ['sparrows', 'songbirds', 'animals with feathers'],
  ['basalts', 'volcanic rocks', 'rocks formed from lava'],
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
  const pool = [isA, isNotA, hasB, hasNotB, converse, ...rng.sample(g.plausible, 1)].filter((c) => c !== v.answer);
  const picks = rng.sample(pool, 3);
  const candidates = v.answer === NONE ? picks : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Statements that are merely plausible or generally true are not conclusions drawn from the two premises.'] },
    hints: ['Treat the first statement as a rule about a whole group. Does the second statement place someone inside that group, or only tell you about the property?', 'A rule "all A have B" never allows you to conclude from "has B" that someone is an A.', `${v.answer === NONE ? 'Nothing follows inescapably here.' : `Only one conclusion is forced: ${v.answer}.`}`],
    features: { rule: 'universal', valid: v.answer !== NONE },
  };
}

function negativeUniversal(difficulty, rng) {
  const g = rng.pick(GROUPS_BANK);
  const name = rng.pick(NAMES);
  const first = `No ${g.plural} ${g.has.replace(/^(has|wears|starts|reads|trains|owns|can)/, (v) => ({ has: 'have', wears: 'wear', starts: 'start', reads: 'read', trains: 'train', owns: 'own', can: 'can' }[v]))}.`;
  const isA = `${name} is ${g.singular}`;
  const isNotA = `${name} is not ${g.singular}`;
  const hasB = `${name} ${g.has}`;
  const hasNotB = `${name} ${g.hasNot}`;
  const variants = [
    { second: `${isA}.`, answer: hasNotB, why: `${name} is one of the ${g.plural}, and none of them has the property.` },
    { second: `${hasB}.`, answer: isNotA, why: `No ${g.plural} have the property, so anyone who has it cannot be one of them.` },
    { second: `${hasNotB}.`, answer: NONE, why: `Not having the property is shared by all ${g.plural} and possibly by many others; it does not make ${name} one of them.` },
    { second: `${isNotA}.`, answer: NONE, why: `The first statement is only about ${g.plural}. It says nothing about people who are not ${g.plural}.` },
  ];
  const v = difficulty <= 2 ? rng.pick(variants.slice(0, 2)) : rng.pick(variants);
  const pool = [isA, isNotA, hasB, hasNotB, ...rng.sample(g.plausible, 1)].filter((c) => c !== v.answer);
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Statements that are merely plausible or generally true are not conclusions drawn from the two premises.'] },
    hints: ['"No A have B" rules out the property for every member of A, and rules out membership for anyone with the property.', 'It says nothing about non-members, and nothing about people who lack the property.', v.answer === NONE ? 'Nothing follows inescapably here.' : `Only one conclusion is forced: ${v.answer}.`],
    features: { rule: 'universal-negative', valid: v.answer !== NONE },
  };
}

function conditional(difficulty, rng) {
  const c = rng.pick(CONDITIONALS);
  const first = `If ${c.cond}, then ${c.res}.`;
  const variants = [
    { second: `${c.condPast}.`, answer: c.resPast, why: 'The condition held, so the stated consequence follows.' },
    { second: `${c.resNotPast}.`, answer: c.condNotPast, why: 'Had the condition held, the consequence would have followed. It did not, so the condition cannot have held.' },
    { second: `${c.resPast}.`, answer: NONE, why: 'The consequence can have other causes; the rule only runs from condition to consequence, not back.' },
    { second: `${c.condNotPast}.`, answer: NONE, why: 'The rule says what happens when the condition holds. When it does not hold, the consequence may or may not happen.' },
  ];
  const v = difficulty <= 2 ? rng.pick(variants.slice(0, 2)) : rng.pick(variants);
  const pool = [c.condPast, c.condNotPast, c.resPast, c.resNotPast].filter((x) => x !== v.answer && x !== v.second.replace(/\.$/, ''));
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why] },
    hints: ['An "if … then" rule runs in one direction only.', 'From the consequence failing you may conclude the condition failed; from the consequence happening you may conclude nothing.', v.answer === NONE ? 'Nothing follows inescapably here.' : `The forced conclusion: ${v.answer}.`],
    features: { rule: 'conditional', valid: v.answer !== NONE },
  };
}

function chain(difficulty, rng) {
  const [A, B, C] = rng.pick(CHAINS);
  const variants = [
    { first: `All ${A} are ${B}.`, second: `All ${B} are ${C}.`, answer: `All ${A} are ${C}`, why: `Every ${A.replace(/s$/, '')} is among the ${B}, and every one of those is among the ${C}.` },
    { first: `Some ${A} are ${B}.`, second: `All ${B} are ${C}.`, answer: `Some ${A} are ${C}`, why: `The ${A} that are ${B} are, like all ${B}, also ${C}.` },
    { first: `All ${A} are ${B}.`, second: `Some ${C} are ${B}.`, answer: NONE, why: `The ${C} that are ${B} need not be ${A}: being ${B} does not make something one of the ${A}.` },
    { first: `No ${B} are ${C}.`, second: `All ${A} are ${B}.`, answer: `No ${A} are ${C}`, why: `Every ${A.replace(/s$/, '')} is one of the ${B}, and none of the ${B} are ${C}.` },
    { first: `All ${A} are ${B}.`, second: `No ${A} are ${C}.`, answer: NONE, why: `The ${A} are only part of the ${B}; other ${B} may well be ${C}.` },
  ];
  const v = difficulty <= 3 ? rng.pick(variants.slice(0, 2).concat(variants[3])) : rng.pick(variants);
  const pool = [`All ${A} are ${C}`, `Some ${A} are ${C}`, `No ${A} are ${C}`, `All ${C} are ${A}`, `Some ${C} are ${B}`, `No ${B} are ${A}`, `All ${B} are ${A}`].filter((x) => x !== v.answer);
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${v.first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Draw the groups as nested or overlapping circles to check each candidate.'] },
    hints: ['Picture each statement as circles: "all A are B" puts the A circle inside B.', '"Some" only guarantees an overlap; "no" keeps circles apart.', v.answer === NONE ? 'No candidate is forced by the picture.' : `Forced: ${v.answer}.`],
    features: { rule: 'chain', valid: v.answer !== NONE },
  };
}

function chain3(difficulty, rng) {
  const [A, B, C] = rng.pick(CHAINS);
  const D = rng.pick(['things kept in a museum', 'things that need water', 'things sold at the market', 'things found in a valley', 'things listed in the register'].filter((x) => x !== C));
  const variants = [
    { p: [`All ${A} are ${B}.`, `All ${B} are ${C}.`, `No ${C} are ${D}.`], answer: `No ${A} are ${D}`, why: `Every ${A.replace(/s$/, '')} is one of the ${B}, hence one of the ${C}, and none of the ${C} are ${D}.` },
    { p: [`Some ${A} are ${B}.`, `All ${B} are ${C}.`, `All ${C} are ${D}.`], answer: `Some ${A} are ${D}`, why: `The ${A} that are ${B} are also ${C}, and therefore also ${D}.` },
    { p: [`All ${A} are ${B}.`, `Some ${B} are ${C}.`, `All ${C} are ${D}.`], answer: NONE, why: `The ${B} that are ${C} need not be ${A}, so nothing links the ${A} to the ${C} or the ${D}.` },
    { p: [`No ${A} are ${B}.`, `All ${C} are ${B}.`, `Some ${D} are ${C}.`], answer: `Some ${D} are not ${A}`, why: `The ${D} that are ${C} are ${B}, and no ${B} can be ${A}, so those ${D} are not ${A}.` },
    { p: [`All ${A} are ${B}.`, `All ${A} are ${C}.`, `Some ${D} are ${B}.`], answer: NONE, why: `Being ${B} or ${C} does not make something one of the ${A}; the ${D} that are ${B} may or may not be ${A} or ${C}.` },
  ];
  const v = rng.pick(variants);
  const pool = [`No ${A} are ${D}`, `Some ${A} are ${D}`, `All ${A} are ${D}`, `Some ${D} are not ${A}`, `All ${D} are ${C}`, `No ${B} are ${D}`, `Some ${C} are ${A}`, `All ${B} are ${A}`].filter((x) => x !== v.answer);
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the three statements?',
    prompt: v.p.join('\n'),
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Chain the statements only where a class term is fully covered ("all" or "no"); "some" carries over just the part it names.'] },
    hints: ['Link the statements through the class term they share.', 'A chain breaks wherever the shared term is only "some" of a class.', v.answer === NONE ? 'No candidate survives the chain.' : `Forced: ${v.answer}.`],
    features: { rule: 'chain3', valid: v.answer !== NONE },
  };
}

function conditionalChain(difficulty, rng) {
  const [c1, c2] = rng.sample(CONDITIONALS, 2);
  // If c1.cond then c1.res. If c1.res then c2.res.  (the middle term is reused as a condition)
  const first = `If ${c1.cond}, then ${c1.res}.`;
  const second = `If ${c1.res}, then ${c2.res}.`;
  const variants = [
    { third: `${c2.resNotPast}.`, answer: c1.condNotPast, why: 'Had the first condition held, both consequences would have followed. The final consequence did not, so the first condition cannot have held.' },
    { third: `${c1.condPast}.`, answer: c2.resPast, why: 'The first condition held, so the first consequence followed, and with it the second.' },
    { third: `${c2.resPast}.`, answer: NONE, why: 'The final consequence may have other causes; the rules only run forwards.' },
    { third: `${c1.resNotPast}.`, answer: c1.condNotPast, why: 'The first consequence failed, so its condition cannot have held. Nothing follows about the final consequence, which may have other causes.' },
  ];
  const v = rng.pick(variants);
  const pool = [c1.condPast, c1.condNotPast, c1.resPast, c1.resNotPast, c2.resPast, c2.resNotPast].filter((x) => x !== v.answer && `${x}.` !== v.third);
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return {
    question: 'Which statement logically and inescapably follows from the three statements?',
    prompt: `${first}\n${second}\n${v.third}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why] },
    hints: ['Two "if … then" rules join into one longer chain.', 'From a failed consequence you may walk backwards up the chain; from a consequence that happened you may conclude nothing.', v.answer === NONE ? 'Nothing is forced.' : `Forced: ${v.answer}.`],
    features: { rule: 'conditional-chain', valid: v.answer !== NONE },
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
  const n = difficulty >= 5 ? rng.pick([5, 6]) : difficulty >= 4 ? rng.pick([4, 5]) : difficulty === 3 ? 4 : 3;
  const askPos = difficulty >= 5 && rng.chance(0.6) ? rng.pick([1, n - 1]) : 0; // 0 = top, 1 = second, n-1 = last
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
    const k = n === 3 ? 2 : n === 4 ? rng.range(2, 3) : n === 5 ? rng.range(3, 4) : rng.range(4, 5);
    const cand = rng.sample(pairs, k);
    const consistent = permutations(names).filter((p) => cand.every(([a, b]) => p.indexOf(a) < p.indexOf(b)));
    const tops = new Set(consistent.map((p) => p[askPos]));
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
  const options = [...rng.shuffle(names).slice(0, Math.min(4, names.length)), NONE];
  const answer = chosen.top ?? NONE;
  if (chosen.top && !options.includes(chosen.top)) { options[0] = chosen.top; }
  const posWord = askPos === 0 ? attr.superl : askPos === 1 ? `second ${attr.superl}` : `least ${attr.adj.replace(/er$/, '')}`.replace('least tall', 'shortest').replace('least old', 'youngest').replace('least fast', 'slowest').replace('least heav', 'lightest').replace('least rich', 'poorest');
  const why = chosen.top
    ? `Every order that fits the statements agrees on that position.`
    : `More than one order fits the statements (for example ${chosen.consistent.slice(0, 2).map((p) => p.join(' > ')).join(' or ')}), so that position is not determined.`;
  return {
    question: 'Which statement logically and inescapably follows from the statements?',
    prompt: `${prompt}\nWho is the ${posWord}?`,
    options,
    correctIndex: options.indexOf(answer),
    explanation: { summary: chosen.top ? `${chosen.top} is the ${posWord}.` : 'None of the conclusions is logically inescapable.', steps: [chosen.top ? `Every order consistent with the statements puts ${chosen.top} in that position (for example ${chosen.consistent[0].join(' > ')}).` : why] },
    hints: ['Write the people in a line from the statements, one comparison at a time.', 'Check whether the statements pin down the position asked about, or leave two people who could both fill it.', chosen.top ? `${chosen.top} must be the ${posWord}.` : 'That position is not fixed by the statements.'],
    features: { rule: 'ordering', people: n, valid: !!chosen.top },
  };
}

const BUILDERS = { universal, negative: negativeUniversal, conditional, chain, ordering, chain3, conditionalChain };
const KINDS = {
  1: ['universal', 'conditional', 'ordering'],
  2: ['universal', 'negative', 'conditional', 'ordering'],
  3: ['universal', 'negative', 'conditional', 'chain', 'ordering'],
  4: ['negative', 'conditional', 'chain', 'ordering', 'universal'],
  5: ['chain3', 'conditionalChain', 'ordering', 'chain'],
};

export function buildLogic(difficulty, rng) {
  const kind = rng.pick(KINDS[Math.min(5, Math.max(1, difficulty))]);
  const item = BUILDERS[kind](difficulty, rng);
  if (!item) return null;
  // Four or five options; exactly one correct by construction. Sanity: options distinct.
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
