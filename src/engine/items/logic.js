// Logical-deduction items: "Which statement logically and inescapably follows from the first two statements?"
// Universal statements (modus ponens / tollens / no valid conclusion) and ordering problems whose
// answer is determined, or not, by checking every consistent order.

export const NONE = 'None of these conclusions is logically inescapable';

const strip = (x) => String(x).replace(/\.$/, '');
const PLURAL_VERB = { has: 'have', wears: 'wear', starts: 'start', reads: 'read', trains: 'train', owns: 'own', can: 'can' };
const pluralVerb = (has) => has.replace(/^(has|wears|starts|reads|trains|owns|can)/, (v) => PLURAL_VERB[v]);
const bare = (sing) => sing.replace(/^an? /, '');
const singular = (plural) => plural.replace(/ies$/, 'y').replace(/s$/, '');
/** Notes for class-statement options: a contradiction of the forced conclusion, a reversed premise, or "not forced". */
function classReasons(answer, premises, pool) {
  const parse = (x) => { const m = String(x).match(/^(All|Some|No) (.+?) are (not )?(.+)$/); return m && { q: m[1], a: m[2], neg: !!m[3], b: m[4] }; };
  const ans = answer === NONE ? null : parse(answer);
  const parsed = premises.map(strip).map(parse).filter(Boolean);
  const occupied = new Set(parsed.filter(p => p.q === 'Some').flatMap(p => p.neg ? [p.a] : [p.a, p.b]));
  // Universal statements alone do not establish that their subject class exists.
  for (let i = 0; i < parsed.length; i++) for (const p of parsed) if (p.q === 'All' && !p.neg && occupied.has(p.a)) occupied.add(p.b);
  const reasons = {};
  for (const o of pool) {
    const c = parse(o);
    if (!c) continue;
    if (ans && c.a === ans.a && c.b === ans.b) {
      const contra = (ans.q === 'All' && !ans.neg && (c.q === 'No' || (c.q === 'Some' && c.neg)))
        || (ans.q === 'Some' && !ans.neg && c.q === 'No')
        || (ans.q === 'No' && (c.q === 'All' || (c.q === 'Some' && !c.neg)))
        || (ans.q === 'Some' && ans.neg && c.q === 'All' && !c.neg);
      const emptyCompatible = [ans.q,c.q].includes('All') && [ans.q,c.q].includes('No') && !occupied.has(c.a);
      if (contra && !emptyCompatible) { reasons[o] = `contradicts what the statements force: ${answer.charAt(0).toLowerCase()}${answer.slice(1)}`; continue; }
    }
    const reversed = premises.map(strip).map(parse).find((pr) => pr && pr.q === 'All' && c.q === 'All' && !c.neg && pr.a === c.b && pr.b === c.a);
    if (reversed) { reasons[o] = `reverses "all ${reversed.a} are ${reversed.b}": the ${reversed.b} may include many things that are not ${reversed.a}`; continue; }
    // contradicts a premise ("no" and "some … are" are symmetric in their two terms)
    const sameTerms = (x, y) => (x.a === y.a && x.b === y.b) || ((x.q === 'No' || (x.q === 'Some' && !x.neg)) && x.a === y.b && x.b === y.a);
    const clash = parsed.find((pr) => sameTerms(c, pr) && !([pr.q,c.q].includes('All') && [pr.q,c.q].includes('No') && !occupied.has(c.q === 'All' ? c.a : pr.a)) && (
      (pr.q === 'All' && !pr.neg && (c.q === 'No' || (c.q === 'Some' && c.neg && c.a === pr.a)))
      || (pr.q === 'No' && (c.q === 'All' || (c.q === 'Some' && !c.neg)))
      || (pr.q === 'Some' && !pr.neg && c.q === 'No')));
    if (clash) { reasons[o] = `contradicts the statement "${premises.map(strip).find((x) => { const q = parse(x); return q && q.a === clash.a && q.b === clash.b; })}"`; continue; }
  }
  return reasons;
}
/** Attach a per-option "why this is tempting" note. `reasons` maps option text → note; the rest get a generic note. */
function withDistractors(item, reasons = {}) {
  const answer = item.options[item.correctIndex];
  item.distractors = item.options.map((o, i) => (i === item.correctIndex ? null : {
    index: i,
    code: o === NONE ? 'none-when-forced' : reasons[o] ? 'named-fallacy' : 'not-forced',
    text: reasons[o] || (o === NONE ? `claims nothing follows, but one conclusion is forced: ${answer}` : 'may well be true, but the statements do not force it'),
  }));
  return item;
}

// Original vocabulary: [group noun (plural, singular), property (verb phrase, negated, noun form for the converse)]
export const GROUPS_BANK = [
  { plural: 'lifeguards', singular: 'a lifeguard', has: 'can swim', hasNot: 'cannot swim', converse: 'Everyone who can swim is a lifeguard', plausible: ['Lifeguards work mainly in summer', 'Swimming is good exercise'] },
  { plural: 'members of the chess club', singular: 'a member of the chess club', has: 'wears a badge', hasNot: 'does not wear a badge', converse: 'Everyone who wears a badge is a member of the chess club', plausible: ['Chess is a game of skill', 'The chess club meets on Thursdays'] },
  { plural: 'bakers in this town', singular: 'a baker in this town', has: 'starts work before dawn', hasNot: 'does not start work before dawn', converse: 'Everyone who starts work before dawn is a baker in this town', plausible: ['Bread is best eaten fresh', 'Bakers use flour'] },
  { plural: 'pilots', singular: 'a pilot', has: 'has a licence', hasNot: 'does not have a licence', converse: 'Everyone who has a licence is a pilot', plausible: ['Pilots can fly aeroplanes', 'Pilots renew their licences regularly'] },
  { plural: 'players in the orchestra', singular: 'a player in the orchestra', has: 'reads music', hasNot: 'does not read music', converse: 'Everyone who reads music is a player in the orchestra', plausible: ['An orchestra has a conductor', 'Violins are string instruments'] },
  { plural: 'residents of Oak Street', singular: 'a resident of Oak Street', has: 'has a parking permit', hasNot: 'does not have a parking permit', converse: 'Everyone who has a parking permit is a resident of Oak Street', plausible: ['Oak Street has many oak trees', 'Parking permits must be renewed yearly'] },
  { plural: 'marathon runners', singular: 'a marathon runner', has: 'trains on Sundays', hasNot: 'does not train on Sundays', converse: 'Everyone who trains on Sundays is a marathon runner', plausible: ['Marathon runners are fit', 'A marathon is 42 kilometres long'] },
  { plural: 'librarians', singular: 'a librarian', has: 'owns a bicycle', hasNot: 'does not own a bicycle', converse: 'Everyone who owns a bicycle is a librarian', plausible: ['Libraries lend books', 'Bicycles have two wheels'] },
];

// Conditionals: if <condition>, then <result>.
export const CONDITIONALS = [
  { cond: 'it rains on Saturday', condNot: 'it does not rain on Saturday', condPast: 'It rained on Saturday', condNotPast: 'It did not rain on Saturday', res: 'the match is postponed', resPast: 'The match was postponed', resNotPast: 'The match was not postponed' },
  { cond: 'the alarm is set', condNot: 'the alarm is not set', condPast: 'The alarm was set', condNotPast: 'The alarm was not set', res: 'Mila wakes at six', resPast: 'Mila woke at six', resNotPast: 'Mila did not wake at six' },
  { cond: 'the bridge is closed', condNot: 'the bridge is not closed', condPast: 'The bridge was closed', condNotPast: 'The bridge was not closed', res: 'the bus takes the long route', resPast: 'The bus took the long route', resNotPast: 'The bus did not take the long route' },
  { cond: 'the oven is hot enough', condNot: 'the oven is not hot enough', condPast: 'The oven was hot enough', condNotPast: 'The oven was not hot enough', res: 'the loaf rises', resPast: 'The loaf rose', resNotPast: 'The loaf did not rise' },
  { cond: 'the shop has power', condNot: 'the shop does not have power', condPast: 'The shop had power', condNotPast: 'The shop did not have power', res: 'the till works', resPast: 'The till worked', resNotPast: 'The till did not work' },
];

// Chained conditionals with coherent content: if a then b; if b then c.
export const CHAIN_CONDITIONALS = [
  { a: { cond: 'it rains on Saturday', past: 'It rained on Saturday', notPast: 'It did not rain on Saturday' }, b: { cond: 'the match is postponed', past: 'The match was postponed', notPast: 'The match was not postponed' }, c: { cond: 'the final is played a week later', past: 'The final was played a week later', notPast: 'The final was not played a week later' } },
  { a: { cond: 'the alarm is set', past: 'The alarm was set', notPast: 'The alarm was not set' }, b: { cond: 'Mila wakes at six', past: 'Mila woke at six', notPast: 'Mila did not wake at six' }, c: { cond: 'Mila catches the early train', past: 'Mila caught the early train', notPast: 'Mila did not catch the early train' } },
  { a: { cond: 'the bridge is closed', past: 'The bridge was closed', notPast: 'The bridge was not closed' }, b: { cond: 'the bus takes the long route', past: 'The bus took the long route', notPast: 'The bus did not take the long route' }, c: { cond: 'the bus arrives late', past: 'The bus arrived late', notPast: 'The bus did not arrive late' } },
  { a: { cond: 'the oven is hot enough', past: 'The oven was hot enough', notPast: 'The oven was not hot enough' }, b: { cond: 'the loaf rises', past: 'The loaf rose', notPast: 'The loaf did not rise' }, c: { cond: 'the crust turns golden', past: 'The crust turned golden', notPast: 'The crust did not turn golden' } },
  { a: { cond: 'the shop has power', past: 'The shop had power', notPast: 'The shop did not have power' }, b: { cond: 'the till works', past: 'The till worked', notPast: 'The till did not work' }, c: { cond: 'receipts are printed', past: 'Receipts were printed', notPast: 'No receipts were printed' } },
];

// Chained syllogisms: three class terms.
export const CHAINS = [
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
  const first = `All ${g.plural} ${pluralVerb(g.has)}.`;
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
  const plausible = rng.sample(g.plausible, 1)[0];
  // A premise restated is trivially entailed, so it is never offered as an option.
  const pool = [isA, isNotA, hasB, hasNotB, converse, plausible].filter((c) => c !== v.answer && c !== strip(v.second));
  const picks = rng.sample(pool, 3);
  const candidates = v.answer === NONE ? picks : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  const given = strip(v.second);
  const reasons = {
    [converse]: `reverses the rule: "all ${g.plural} ${pluralVerb(g.has)}" does not say that everyone who ${g.has} is ${g.singular}`,
    [plausible]: 'sounds true in general, but it is not stated in either premise',
    [isA]: given === hasB ? `affirms the consequent: ${name} ${g.has}, but that may be true of many people who are not ${g.plural}` : given === hasNotB ? `contradicts the rule: every ${bare(g.singular)} ${g.has}, and ${name} ${g.hasNot}` : `is not forced: nothing places ${name} inside the group`,
    [isNotA]: given === isA ? 'contradicts the second statement' : given === hasB ? `is not forced: ${name} may or may not be ${g.singular}` : `is not forced: lacking nothing in the premises, ${name} could still be ${g.singular}`,
    [hasB]: given === isNotA ? `is not forced: the rule is only about ${g.plural}; it says nothing about whether people outside the group ${pluralVerb(g.has)}` : given === hasNotB ? 'contradicts the second statement' : `is not forced by the statements`,
    [hasNotB]: given === isA ? `contradicts the rule: all ${g.plural} ${pluralVerb(g.has)}` : given === isNotA ? `denies the antecedent: the rule says nothing about people who are not ${g.plural}` : given === hasB ? 'contradicts the second statement' : 'is not forced by the statements',
  };
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Statements that are merely plausible or generally true are not conclusions drawn from the two premises.'] },
    hints: ['Treat the first statement as a rule about a whole group. Does the second statement place someone inside that group, or only tell you about the property?', 'A rule "all A have B" never allows you to conclude from "has B" that someone is an A.', `${v.answer === NONE ? 'Nothing follows inescapably here.' : `Only one conclusion is forced: ${v.answer}.`}`],
    features: { rule: 'universal', valid: v.answer !== NONE },
  }, reasons);
}

function negativeUniversal(difficulty, rng) {
  const g = rng.pick(GROUPS_BANK);
  const name = rng.pick(NAMES);
  const first = `No ${g.plural} ${pluralVerb(g.has)}.`;
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
  const plausible = rng.sample(g.plausible, 1)[0];
  const pool = [isA, isNotA, hasB, hasNotB, plausible].filter((c) => c !== v.answer && c !== strip(v.second));
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  const given = strip(v.second);
  const reasons = {
    [plausible]: 'sounds true in general, but it is not stated in either premise',
    [isA]: given === hasB ? `contradicts the rule: no ${g.plural} ${pluralVerb(g.has)}, yet ${name} ${g.has}` : `is not forced: lacking the property is shared by ${g.plural} and by many others`,
    [isNotA]: given === isA ? 'contradicts the second statement' : `is not forced: nothing in the statements keeps ${name} out of the group`,
    [hasB]: given === isA ? `contradicts the rule: ${name} is ${g.singular}` : given === isNotA ? `is not forced: the rule says nothing about people who are not ${g.plural}` : 'is not forced by the statements',
    [hasNotB]: given === hasB ? 'contradicts the second statement' : given === isNotA ? `denies the antecedent: "no ${g.plural} …" says nothing about people outside the group` : 'is not forced by the statements',
  };
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Statements that are merely plausible or generally true are not conclusions drawn from the two premises.'] },
    hints: ['"No A have B" rules out the property for every member of A, and rules out membership for anyone with the property.', 'It says nothing about non-members, and nothing about people who lack the property.', v.answer === NONE ? 'Nothing follows inescapably here.' : `Only one conclusion is forced: ${v.answer}.`],
    features: { rule: 'universal-negative', valid: v.answer !== NONE },
  }, reasons);
}

function conditional(difficulty, rng) {
  const c = rng.pick(CONDITIONALS);
  const first = `If ${c.cond}, then ${c.res}.`;
  const variants = [
    { second: `${c.condPast}.`, answer: c.resPast, why: 'The condition held, so the stated consequence follows.' },
    { second: `${c.resNotPast}.`, answer: c.condNotPast, why: 'Had the condition held, the consequence would have followed. It did not, so the condition cannot have held.' },
    { second: `${c.resPast}.`, answer: NONE, why: `This is the trap called affirming the consequent. "${first}" does not say that ${c.cond} is the only way for ${c.res}: it may have happened for some other reason. So "${c.condPast}" is possible but not forced, and nothing else follows.` },
    { second: `${c.condNotPast}.`, answer: NONE, why: `This is the trap called denying the antecedent. "${first}" says what happens when ${c.cond}; it is silent about what happens when ${c.condNot}. Then ${c.res} may still have come about for another reason, or not at all. "${c.resNotPast}" is possible but not forced, and neither is "${c.resPast}".` },
  ];
  const v = difficulty <= 2 ? rng.pick(variants.slice(0, 2)) : rng.pick(variants);
  const pool = [c.condPast, c.condNotPast, c.resPast, c.resNotPast].filter((x) => x !== v.answer && x !== strip(v.second));
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  const given = strip(v.second);
  const reasons = {
    [c.condPast]: given === c.resPast ? `affirms the consequent: "${c.res}" can come about without "${c.cond}"` : given === c.resNotPast ? `would mean that ${c.res}, which the second statement rules out` : given === c.condNotPast ? 'contradicts the second statement' : 'is not forced by the statements',
    [c.condNotPast]: given === c.condPast ? 'contradicts the second statement' : given === c.resPast ? `is not forced: nothing says whether ${c.cond}` : 'is not forced by the statements',
    [c.resPast]: given === c.condNotPast ? `is not forced: with ${c.condNot}, the rule says nothing either way` : given === c.resNotPast ? 'contradicts the second statement' : 'is not forced by the statements',
    [c.resNotPast]: given === c.condNotPast ? `denies the antecedent: the rule only says what happens when ${c.cond}; it does not make ${c.cond} the only route to ${c.res}` : given === c.condPast ? `contradicts the rule: the condition held, so ${c.res}` : given === c.resPast ? 'contradicts the second statement' : 'is not forced by the statements',
  };
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why] },
    hints: ['An "if … then" rule runs in one direction only.', 'From the consequence failing you may conclude the condition failed; from the consequence happening you may conclude nothing.', v.answer === NONE ? 'Nothing follows inescapably here.' : `The forced conclusion: ${v.answer}.`],
    features: { rule: 'conditional', valid: v.answer !== NONE },
  }, reasons);
}

function chain(difficulty, rng) {
  const [A, B, C] = rng.pick(CHAINS);
  const variants = [
    { first: `All ${A} are ${B}.`, second: `All ${B} are ${C}.`, answer: `All ${A} are ${C}`, also: [`Some ${A} are ${C}`, `Some ${C} are ${A}`, `Some ${C} are ${B}`], why: `Every ${singular(A)} is among the ${B}, and every one of those is among the ${C}.` },
    { first: `Some ${A} are ${B}.`, second: `All ${B} are ${C}.`, answer: `Some ${A} are ${C}`, also: [`Some ${C} are ${A}`, `Some ${C} are ${B}`], why: `The ${A} that are ${B} are, like all ${B}, also ${C}.` },
    { first: `All ${A} are ${B}.`, second: `Some ${C} are ${B}.`, answer: NONE, why: `The ${C} that are ${B} need not be ${A}: being ${B} does not make something one of the ${A}.` },
    { first: `No ${B} are ${C}.`, second: `All ${A} are ${B}.`, answer: `No ${A} are ${C}`, also: [`No ${C} are ${A}`, `Some ${A} are not ${C}`], why: `Every ${singular(A)} is one of the ${B}, and none of the ${B} are ${C}.` },
    { first: `All ${A} are ${B}.`, second: `No ${A} are ${C}.`, answer: NONE, why: `The ${A} are only part of the ${B}; other ${B} may well be ${C}.` },
  ];
  const v = difficulty <= 3 ? rng.pick(variants.slice(0, 2).concat(variants[3])) : rng.pick(variants);
  // Statements that are the answer, a premise, or defensible alongside the answer (e.g. "some A are C" when
  // "all A are C" holds) never appear as options.
  const banned = new Set([v.answer, strip(v.first), strip(v.second), ...(v.also || [])]);
  const pool = [`All ${A} are ${C}`, `Some ${A} are ${C}`, `No ${A} are ${C}`, `All ${C} are ${A}`, `Some ${C} are ${B}`, `No ${B} are ${A}`, `All ${B} are ${A}`].filter((x) => !banned.has(x));
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  const reasons = classReasons(v.answer, [v.first, v.second], pool);
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the first two statements?',
    prompt: `${v.first}\n${v.second}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Draw the groups as nested or overlapping circles to check each candidate.'] },
    hints: ['Picture each statement as circles: "all A are B" puts the A circle inside B.', '"Some" only guarantees an overlap; "no" keeps circles apart.', v.answer === NONE ? 'No candidate is forced by the picture.' : `Forced: ${v.answer}.`],
    features: { rule: 'chain', valid: v.answer !== NONE },
  }, reasons);
}

function chain3(difficulty, rng) {
  const [A, B, C] = rng.pick(CHAINS);
  const D = rng.pick(['things kept in a museum', 'things that need water', 'things sold at the market', 'things found in a valley', 'things listed in the register'].filter((x) => x !== C));
  const variants = [
    { p: [`All ${A} are ${B}.`, `All ${B} are ${C}.`, `No ${C} are ${D}.`], answer: `No ${A} are ${D}`, also: [`Some ${D} are not ${A}`, `Some ${C} are ${A}`, `No ${B} are ${D}`, `No ${D} are ${A}`], why: `Every ${singular(A)} is one of the ${B}, hence one of the ${C}, and none of the ${C} are ${D}.` },
    { p: [`Some ${A} are ${B}.`, `All ${B} are ${C}.`, `All ${C} are ${D}.`], answer: `Some ${A} are ${D}`, also: [`Some ${C} are ${A}`], why: `The ${A} that are ${B} are also ${C}, and therefore also ${D}.` },
    { p: [`All ${A} are ${B}.`, `Some ${B} are ${C}.`, `All ${C} are ${D}.`], answer: NONE, why: `The ${B} that are ${C} need not be ${A}, so nothing links the ${A} to the ${C} or the ${D}.` },
    { p: [`No ${A} are ${B}.`, `All ${C} are ${B}.`, `Some ${D} are ${C}.`], answer: `Some ${D} are not ${A}`, also: [`No ${C} are ${A}`], why: `The ${D} that are ${C} are ${B}, and no ${B} can be ${A}, so those ${D} are not ${A}.` },
    { p: [`All ${A} are ${B}.`, `All ${A} are ${C}.`, `Some ${D} are ${B}.`], answer: NONE, also: [`Some ${C} are ${A}`], why: `Being ${B} or ${C} does not make something one of the ${A}; the ${D} that are ${B} may or may not be ${A} or ${C}.` },
  ];
  const v = rng.pick(variants);
  const banned = new Set([v.answer, ...v.p.map(strip), ...(v.also || [])]);
  const pool = [`No ${A} are ${D}`, `Some ${A} are ${D}`, `All ${A} are ${D}`, `Some ${D} are not ${A}`, `All ${D} are ${C}`, `No ${B} are ${D}`, `Some ${C} are ${A}`, `All ${B} are ${A}`].filter((x) => !banned.has(x));
  if (pool.length < 3) return null;
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the three statements?',
    prompt: v.p.join('\n'),
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why, 'Chain the statements only where a class term is fully covered ("all" or "no"); "some" carries over just the part it names.'] },
    hints: ['Link the statements through the class term they share.', 'A chain breaks wherever the shared term is only "some" of a class.', v.answer === NONE ? 'No candidate survives the chain.' : `Forced: ${v.answer}.`],
    features: { rule: 'chain3', valid: v.answer !== NONE },
  }, classReasons(v.answer, v.p, pool));
}

function conditionalChain(difficulty, rng) {
  const t = rng.pick(CHAIN_CONDITIONALS);
  const { a, b, c } = t;
  const first = `If ${a.cond}, then ${b.cond}.`;
  const second = `If ${b.cond}, then ${c.cond}.`;
  const variants = [
    { third: `${c.notPast}.`, answer: a.notPast, also: [b.notPast], why: `Had ${a.cond}, then ${b.cond}, and then ${c.cond}. The last of these did not happen, so neither of the earlier ones can have: the chain runs backwards from a failed consequence.` },
    { third: `${a.past}.`, answer: c.past, also: [b.past], why: `${a.past}, so ${b.cond}; and because ${b.cond}, ${c.cond}. The chain runs forwards from a condition that held.` },
    { third: `${c.past}.`, answer: NONE, why: `Affirming the consequent: "${c.past}" may have come about without ${b.cond}, and ${b.cond} without ${a.cond}. The rules only run forwards, so nothing is forced.` },
    { third: `${b.notPast}.`, answer: a.notPast, why: `${b.notPast}, so its condition cannot have held: ${a.notPast.charAt(0).toLowerCase()}${a.notPast.slice(1)}. Nothing follows about whether ${c.cond}, which may have other causes.` },
  ];
  const v = rng.pick(variants);
  // The intermediate consequence follows too whenever the final one does, so it is never offered beside it.
  const banned = new Set([v.answer, strip(v.third), ...(v.also || [])]);
  const pool = [a.past, a.notPast, b.past, b.notPast, c.past, c.notPast].filter((x) => !banned.has(x));
  const candidates = v.answer === NONE ? rng.sample(pool, 3) : rng.shuffle([v.answer, ...rng.sample(pool, 2)]);
  const options = [...candidates, NONE];
  const given = strip(v.third);
  const neg = { [a.past]: a.notPast, [a.notPast]: a.past, [b.past]: b.notPast, [b.notPast]: b.past, [c.past]: c.notPast, [c.notPast]: c.past };
  const reasons = {};
  for (const o of pool) {
    if (neg[o] === given) reasons[o] = 'contradicts the third statement';
    else if (v.answer !== NONE && neg[o] === v.answer) reasons[o] = `contradicts what the statements force: ${v.answer.charAt(0).toLowerCase()}${v.answer.slice(1)}`;
    else if (given === c.past && (o === a.past || o === b.past)) reasons[o] = `affirms the consequent: ${c.cond} can come about without it`;
    else if (given === b.notPast && (o === c.past || o === c.notPast)) reasons[o] = `is not forced: with ${b.notPast.charAt(0).toLowerCase()}${b.notPast.slice(1)}, the second rule says nothing either way`;
    else if (given === c.notPast && o === a.past) reasons[o] = `would mean that ${b.cond} and then ${c.cond}, which the third statement rules out`;
  }
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the three statements?',
    prompt: `${first}\n${second}\n${v.third}`,
    options,
    correctIndex: options.indexOf(v.answer),
    explanation: { summary: v.answer === NONE ? 'None of the conclusions is logically inescapable.' : `${v.answer}.`, steps: [v.why] },
    hints: ['Two "if … then" rules join into one longer chain.', 'From a failed consequence you may walk backwards up the chain; from a consequence that happened you may conclude nothing.', v.answer === NONE ? 'Nothing is forced.' : `Forced: ${v.answer}.`],
    features: { rule: 'conditional-chain', valid: v.answer !== NONE },
  }, reasons);
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
  for (let tries = 0; tries < 80 && !chosen; tries++) {
    const k = n === 3 ? 2 : n === 4 ? rng.range(2, 3) : n === 5 ? rng.range(3, 4) : rng.range(4, 5);
    const cand = rng.sample(pairs, k);
    // Every person must be mentioned: an unmentioned name in the options would make "none" a trick answer.
    if (names.some((nm) => !cand.some(([a, b]) => a === nm || b === nm))) continue;
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
  const LEAST = { taller: 'shortest', older: 'youngest', faster: 'slowest', heavier: 'lightest', richer: 'poorest' };
  const posWord = askPos === 0 ? attr.superl : askPos === 1 ? `second ${attr.superl}` : LEAST[attr.adj];
  const why = chosen.top
    ? `Every order that fits the statements agrees on that position.`
    : `More than one order fits the statements (for example ${chosen.consistent.slice(0, 2).map((p) => p.join(' > ')).join(' or ')}), so that position is not determined.`;
  const reasons = {};
  for (const nm of names) if (nm !== answer) reasons[nm] = chosen.top ? `is never the ${posWord}: every order that fits the statements puts ${chosen.top} there` : (chosen.consistent.some((p) => p[askPos] === nm) ? `is the ${posWord} in some orders that fit the statements, but not in all of them` : `is never the ${posWord} in any order that fits the statements`);
  return withDistractors({
    question: 'Which statement logically and inescapably follows from the statements?',
    prompt: `${prompt}\nWho is the ${posWord}?`,
    options,
    correctIndex: options.indexOf(answer),
    explanation: { summary: chosen.top ? `${chosen.top} is the ${posWord}.` : 'None of the conclusions is logically inescapable.', steps: [chosen.top ? `Every order consistent with the statements puts ${chosen.top} in that position (for example ${chosen.consistent[0].join(' > ')}).` : why] },
    hints: ['Write the people in a line from the statements, one comparison at a time.', 'Check whether the statements pin down the position asked about, or leave two people who could both fill it.', chosen.top ? `${chosen.top} must be the ${posWord}.` : 'That position is not fixed by the statements.'],
    features: { rule: 'ordering', people: n, valid: !!chosen.top },
  }, reasons);
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
  if (item.features.rule !== 'ordering') {
    item.question += ' Treat the statements as rules without exceptions.';
    if (item.prompt.includes('Some ')) item.question += ' “Some” means at least one, possibly all.';
    if (item.prompt.startsWith('If ')) item.question += ' Each “if … then” rule is one-way: the result may also occur without its condition.';
  }
  // Four or five options; exactly one correct by construction. Sanity: options distinct.
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
