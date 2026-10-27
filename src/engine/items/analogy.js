// Verbal analogies: "A is to B as C is to ...", built from the graded relation bank.
import { RELATIONS } from './wordbank.js';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Reversed direction: "B is to A as D is to ..." — the answer is the first word of the pair.
function buildReversed(rel, pairs, p1, p2, level, rng, ok) {
  const [, a1, b1] = p1;
  const [, c, d] = p2;
  const distractors = [];
  const others = rng.shuffle(RELATIONS.filter((x) => x.id !== rel.id));
  for (const o of others) {
    if (distractors.length >= 4) break;
    const cands = rng.shuffle(o.pairs.filter(([l]) => Math.abs(l - level) <= 1).map((p) => p[1]).filter((w) => ok(w) && !distractors.some((x) => x.w === w)));
    if (cands.length) distractors.push({ w: cands[0], code: `other-relation:${o.id}`, text: `would need a different relationship (${o.text})` });
  }
  if (distractors.length < 4) return null;
  const words = [c, ...distractors.map((x) => x.w)];
  if (new Set(words).size !== words.length) return null;
  const order = rng.shuffle(words.map((_, i) => i));
  const options = order.map((i) => words[i]);
  const correctIndex = order.indexOf(0);
  return {
    question: 'Which word completes the analogy?',
    prompt: `${cap(b1)} is to ${a1} as ${d} is to ...`,
    options,
    correctIndex,
    distractors: options.map((w, i) => (i === correctIndex ? null : { index: i, ...distractors.find((x) => x.w === w) })).map((x) => (x ? { index: x.index, code: x.code, text: x.text } : null)),
    explanation: { summary: `The relationship runs in reverse: ${rel.text}, read from the second word back to the first.`, steps: [`${cap(a1)} → ${b1}, so ${b1} leads back to ${a1}; in the same way ${d} leads back to ${c}.`] },
    hints: [`Work out how "${a1}" and "${b1}" are related, then notice the pair is given in reverse order.`, 'Apply the same reversed relationship to the third word.', `Relationship: ${rel.text}.`],
    features: { rule: rel.id, level, reversed: true },
  };
}

// Every (first → second) pairing anywhere in the bank, so a distractor never pairs with the third word.
const PAIRED = new Set();
for (const r of RELATIONS) for (const [, a, b] of r.pairs) PAIRED.add(`${a}|${b}`);

export function buildAnalogy(difficulty, rng) {
  const level = Math.min(5, Math.max(1, difficulty));
  const reversed = level >= 5 && rng.chance(0.5);
  // Relations that have at least two pairs at or just below the level, preferring the level itself.
  const usable = RELATIONS.map((r) => ({ r, pairs: r.pairs.filter(([l]) => l === level || l === level - 1) })).filter((x) => x.pairs.filter(([l]) => l === level).length >= 1 && x.pairs.length >= 2);
  if (!usable.length) return null;
  const { r: rel, pairs } = rng.pick(usable);
  const atLevel = pairs.filter(([l]) => l === level);
  const p2 = rng.pick(atLevel);
  const p1 = rng.pick(pairs.filter((p) => p !== p2));
  const [, a1, b1] = p1;
  const [, c, d] = p2;
  // Words that are the second (or first) member of ANY pair in the same relation are never offered: another
  // word of the same kind (a second unit, a second collective noun) is too often a defensible answer as well.
  const sameKind = new Set(rel.pairs.flatMap((p) => [p[1], p[2]]));
  const forbidden = new Set([d, c, a1, b1]);
  const ok = (w) => !forbidden.has(w) && !sameKind.has(w) && !PAIRED.has(`${c}|${w}`) && !PAIRED.has(`${w}|${d}`);
  if (reversed) return buildReversed(rel, pairs, p1, p2, level, rng, ok);
  const distractors = [];
  // words from other relations, close to the level so vocabulary difficulty does not give the answer away
  const others = rng.shuffle(RELATIONS.filter((x) => x.id !== rel.id));
  for (const o of others) {
    if (distractors.length >= 4) break;
    const cands = rng.shuffle(o.pairs.filter(([l]) => Math.abs(l - level) <= 1).map((p) => p[2]).filter((w) => ok(w) && !distractors.some((x) => x.w === w)));
    if (cands.length) distractors.push({ w: cands[0], code: `other-relation:${o.id}`, text: `would need a different relationship (${o.text})` });
  }
  if (distractors.length < 4) return null;
  const words = [d, ...distractors.map((x) => x.w)];
  if (new Set(words).size !== words.length) return null;
  const order = rng.shuffle(words.map((_, i) => i));
  const options = order.map((i) => words[i]);
  const correctIndex = order.indexOf(0);
  return {
    question: 'Which word completes the analogy?',
    prompt: `${cap(a1)} is to ${b1} as ${c} is to ...`,
    options,
    correctIndex,
    distractors: options.map((w, i) => (i === correctIndex ? null : { index: i, ...distractors.find((x) => x.w === w) })).map((x) => (x ? { index: x.index, code: x.code, text: x.text } : null)),
    explanation: { summary: `The relationship: ${rel.text}.`, steps: [`${cap(a1)} → ${b1}; in the same way ${c} → ${d}.`] },
    hints: [`Say the first pair as a sentence: how does "${a1}" relate to "${b1}"?`, 'Apply exactly that relationship to the third word and reject words that relate to it in a different way.', `Relationship: ${rel.text}.`],
    features: { rule: rel.id, level },
  };
}
