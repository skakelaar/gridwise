// Vocabulary items: nearest synonym, nearest antonym, odd one out.
import { VOCAB, ODD_SETS, CLOZE } from './wordbank.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Clusters whose members shade into one another (an "energy" word is often a fair opposite of a "care" word),
// so distractors are never drawn from a kin cluster of the target.
const KIN = [['energy', 'care', 'willing', 'persistence'], ['calm', 'friendliness', 'joy'], ['clarity', 'truth', 'speech']];
const kinOf = (cluster) => KIN.find((k) => k.includes(cluster)) || [cluster];
const farFrom = (cluster) => (v) => !kinOf(cluster).includes(v.cluster);

function synonymOrAntonym(difficulty, rng, wantAntonym) {
  const level = Math.min(5, Math.max(1, difficulty));
  const pool = VOCAB.filter((v) => v.level === level);
  const target = rng.pick(pool);
  const answer = rng.pick(wantAntonym ? target.ant : target.syn);
  const related = new Set([target.w, ...target.syn, ...target.ant]);
  // distractors: same part of speech, different cluster, from nearby levels; never a listed synonym/antonym of the target
  const near = VOCAB.filter((v) => farFrom(target.cluster)(v) && v.pos === target.pos && Math.abs(v.level - level) <= 1);
  const cands = rng.shuffle(near.flatMap((v) => [v.w, ...v.syn]).filter((w) => !related.has(w)));
  const uniq = [...new Set(cands)].slice(0, 3);
  // one "trap": the opposite kind of relation (an antonym when a synonym is asked, and vice versa)
  const trap = rng.pick(wantAntonym ? target.syn : target.ant);
  const words = [answer, trap, ...uniq];
  if (new Set(words).size !== 5) return null;
  const order = rng.shuffle(words.map((_, i) => i));
  const options = order.map((i) => words[i]);
  const correctIndex = order.indexOf(0);
  const trapIndex = options.indexOf(trap);
  return {
    question: wantAntonym ? 'Which word is most nearly the opposite in meaning?' : 'Which word is closest in meaning?',
    prompt: cap(target.w),
    options,
    correctIndex,
    distractors: options.map((w, i) => (i === correctIndex ? null : { index: i, code: i === trapIndex ? (wantAntonym ? 'synonym-instead' : 'antonym-instead') : 'unrelated', text: i === trapIndex ? (wantAntonym ? `means the same as ${target.w}, not the opposite` : `is the opposite of ${target.w}, not a synonym`) : `is unrelated to ${target.w}` })),
    explanation: { summary: `${cap(answer)} is ${wantAntonym ? 'the opposite of' : 'closest in meaning to'} ${target.w}.`, steps: [`${cap(target.w)}: similar words include ${target.syn.join(', ')}; opposites include ${target.ant.join(', ')}.`] },
    hints: [`Think of a sentence that uses "${target.w}" and try each option in its place.`, wantAntonym ? 'One option means the same thing: that is the trap, not the answer.' : 'One option means the opposite: that is the trap, not the answer.', `${cap(target.w)} means roughly "${target.syn[0]}".`],
    features: { rule: wantAntonym ? 'antonym' : 'synonym', level },
  };
}

function oddOneOut(difficulty, rng) {
  const level = Math.min(5, Math.max(1, difficulty));
  const sets = ODD_SETS.filter((s) => s.level === level);
  const set = rng.pick(sets);
  const members = rng.sample(set.words, 4);
  const intruder = rng.pick(set.intruders.words);
  const words = rng.shuffle([intruder, ...members]);
  const correctIndex = words.indexOf(intruder);
  return {
    question: 'Which word does not belong with the others?',
    prompt: 'Four of these words belong together. Find the one that does not fit.',
    options: words,
    correctIndex,
    distractors: words.map((w, i) => (i === correctIndex ? null : { index: i, code: 'member', text: `is one of the ${set.name}, like the other three` })),
    explanation: { summary: `${cap(intruder)} is the odd one out.`, steps: [`${members.map(cap).join(', ')} are all ${set.name}; ${intruder} is one of the ${set.intruders.name}.`] },
    hints: ['Find the category that fits most of the words.', `Four of them are ${set.name}.`, `${cap(intruder)} belongs to a different group (${set.intruders.name}).`],
    features: { rule: 'odd-one-out', level },
  };
}

function cloze(difficulty, rng) {
  const level = Math.min(5, Math.max(1, difficulty));
  const pool = CLOZE.filter((c) => c.level === level);
  if (!pool.length) return null;
  const c = rng.pick(pool);
  const entry = VOCAB.find((v) => v.w === c.w);
  if (!entry) return null;
  const related = new Set([entry.w, ...entry.syn, ...entry.ant]);
  const avoid = new Set(c.avoid || []);
  const near = VOCAB.filter((v) => farFrom(entry.cluster)(v) && v.pos === entry.pos && Math.abs(v.level - level) <= 1);
  const cands = [...new Set(rng.shuffle(near.map((v) => v.w)).filter((w) => !related.has(w) && !avoid.has(w)))].slice(0, 3);
  const trap = rng.pick(entry.ant);
  const words = [entry.w, trap, ...cands];
  if (new Set(words).size !== 5) return null;
  const order = rng.shuffle(words.map((_, i) => i));
  const options = order.map((i) => words[i]);
  const correctIndex = order.indexOf(0);
  const trapIndex = options.indexOf(trap);
  return {
    question: 'Which word completes the sentence?',
    prompt: c.s.replace('____d', '____'),
    options,
    correctIndex,
    distractors: options.map((w, i) => (i === correctIndex ? null : { index: i, code: i === trapIndex ? 'antonym' : 'unrelated', text: i === trapIndex ? 'means the opposite of what the sentence needs' : 'does not fit the sense of the sentence' })),
    explanation: { summary: `${cap(entry.w)} fits: ${entry.syn.join(', ')}.`, steps: [`The rest of the sentence calls for a word meaning "${entry.syn[0]}"; ${entry.w} means exactly that, while ${trap} means the opposite.`] },
    hints: ['Read the whole sentence and decide what quality or action it describes.', `You need a word close to "${entry.syn[0]}".`, `${cap(entry.w)} is that word.`],
    features: { rule: 'cloze', level },
  };
}

export function buildVocab(difficulty, rng) {
  const kind = rng.pick(difficulty >= 3 ? ['synonym', 'antonym', 'odd', 'cloze', 'cloze'] : ['synonym', 'antonym', 'odd']);
  const item = kind === 'cloze' ? cloze(difficulty, rng) : kind === 'odd' ? oddOneOut(difficulty, rng) : synonymOrAntonym(difficulty, rng, kind === 'antonym');
  if (!item && kind === 'cloze') return buildVocab(difficulty, rng);
  if (!item) return null;
  if (new Set(item.options).size !== item.options.length) return null;
  return item;
}
