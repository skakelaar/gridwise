// Verbal analogies from an original, curated bank: "A is to B as C is to ...".
// Each relation's vocabulary is kept distinct from the others so distractors from other relations do not fit.

export const ANALOGY_BANK = [
  { id: 'opposite', level: 1, text: 'the second word is the opposite of the first', pairs: [['full', 'empty'], ['rested', 'tired'], ['wide', 'narrow'], ['ancient', 'modern'], ['generous', 'stingy'], ['brave', 'cowardly'], ['scarce', 'plentiful'], ['humid', 'dry']] },
  { id: 'tool', level: 1, text: 'the second word is the tool used to do the first', pairs: [['cutting', 'scissors'], ['writing', 'pen'], ['sweeping', 'broom'], ['digging', 'spade'], ['sawing', 'saw'], ['stirring', 'spoon'], ['measuring', 'ruler'], ['hammering', 'hammer']] },
  { id: 'producer', level: 2, text: 'the first delivers or produces the second', pairs: [['baker', 'bread'], ['musician', 'concert'], ['author', 'novel'], ['beekeeper', 'honey'], ['sculptor', 'statue'], ['farmer', 'harvest'], ['tailor', 'suit'], ['architect', 'blueprint']] },
  { id: 'part', level: 2, text: 'the first is part of the second', pairs: [['child', 'family'], ['violinist', 'orchestra'], ['petal', 'flower'], ['soldier', 'army'], ['chapter', 'book'], ['wheel', 'bicycle'], ['island', 'archipelago'], ['sailor', 'crew']] },
  { id: 'home', level: 2, text: 'the second is where the first lives or is kept', pairs: [['bee', 'hive'], ['horse', 'stable'], ['monk', 'monastery'], ['bear', 'den'], ['pupil', 'school'], ['ship', 'harbour'], ['bird', 'nest'], ['wine', 'cellar']] },
  { id: 'category', level: 3, text: 'the first is a kind of the second', pairs: [['oak', 'tree'], ['sonnet', 'poem'], ['copper', 'metal'], ['salmon', 'fish'], ['waltz', 'dance'], ['sapphire', 'gem'], ['sparrow', 'bird'], ['tango', 'dance']] },
  { id: 'degree', level: 3, text: 'the second is a stronger degree of the first', pairs: [['warm', 'scorching'], ['cool', 'freezing'], ['annoyed', 'furious'], ['damp', 'soaked'], ['glad', 'ecstatic'], ['breeze', 'gale'], ['drizzle', 'downpour'], ['whisper', 'shout']] },
  { id: 'cause', level: 3, text: 'the first causes the second', pairs: [['spark', 'fire'], ['virus', 'illness'], ['drought', 'famine'], ['practice', 'skill'], ['insult', 'offence'], ['earthquake', 'tremor'], ['rain', 'flood'], ['effort', 'fatigue']] },
  { id: 'function', level: 4, text: 'the second is what the first is used for', pairs: [['compass', 'navigation'], ['telescope', 'observation'], ['anchor', 'mooring'], ['ledger', 'bookkeeping'], ['scalpel', 'surgery'], ['kiln', 'firing'], ['loom', 'weaving'], ['sieve', 'sifting']] },
  { id: 'collective', level: 4, text: 'the second is the collective name for many of the first', pairs: [['wolf', 'pack'], ['fish', 'shoal'], ['lion', 'pride'], ['cow', 'herd'], ['geese', 'gaggle'], ['crow', 'murder'], ['bee', 'swarm'], ['ship', 'fleet']] },
  { id: 'expert', level: 4, text: 'the second is the specialist who studies or treats the first', pairs: [['stars', 'astronomer'], ['insects', 'entomologist'], ['teeth', 'dentist'], ['rocks', 'geologist'], ['eyes', 'optician'], ['languages', 'linguist'], ['fossils', 'palaeontologist'], ['weather', 'meteorologist']] },
];

export function buildAnalogy(difficulty, rng) {
  const level = Math.min(4, Math.max(1, difficulty));
  const rels = ANALOGY_BANK.filter((r) => r.level === level || (level === 1 && r.level <= 1) || (level >= 2 && Math.abs(r.level - level) <= 1 && r.level <= level));
  const rel = rng.pick(rels);
  const [p1, p2] = rng.sample(rel.pairs, 2);
  const others = ANALOGY_BANK.filter((r) => r.id !== rel.id);
  const distractorWords = [];
  // one word from the same relation (a wrong B of the same type is tempting but does not pair with C)
  const sameRel = rel.pairs.filter((p) => p !== p1 && p !== p2).map((p) => p[1]);
  distractorWords.push({ w: rng.pick(sameRel), code: 'same-relation-wrong-pair', text: `has the right kind of relationship but belongs with a different first word` });
  for (const r of rng.sample(others, 3)) {
    const pair = rng.pick(r.pairs);
    distractorWords.push({ w: pair[1], code: `other-relation:${r.id}`, text: `would need a different relationship (${r.text})` });
  }
  const words = [p2[1], ...distractorWords.map((d) => d.w)];
  if (new Set(words).size !== words.length) return null;
  const order = rng.shuffle(words.map((_, i) => i));
  const options = order.map((i) => words[i]);
  const correctIndex = order.indexOf(0);
  const distractors = options.map((w, i) => (i === correctIndex ? null : { index: i, ...distractorWords.find((d) => d.w === w) }));
  return {
    question: 'Which word completes the analogy?',
    prompt: `${cap(p1[0])} is to ${p1[1]} as ${p2[0]} is to ...`,
    options,
    correctIndex,
    distractors: distractors.map((d) => (d ? { index: d.index, code: d.code, text: d.text } : null)),
    explanation: { summary: `The relationship: ${rel.text}.`, steps: [`${cap(p1[0])} → ${p1[1]}; in the same way ${p2[0]} → ${p2[1]}.`] },
    hints: [`Say the first pair as a sentence: how does "${p1[0]}" relate to "${p1[1]}"?`, 'Apply exactly that relationship to the third word and reject words that relate to it in a different way.', `Relationship: ${rel.text}.`],
    features: { rule: rel.id },
  };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
