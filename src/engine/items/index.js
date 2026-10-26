// Non-matrix items (number series, logical deduction, fractions and arithmetic, verbal analogies).
// Same contract as matrix puzzles where it matters to the app: id, family, group, difficulty, seed,
// options, correctIndex, distractors, explanation, hints, description, features.
import { Rng } from '../rng.js';
import { DIFFICULTY_LABELS } from '../generate.js';
import { buildSeries } from './series.js';
import { buildLogic } from './logic.js';
import { buildNumeric } from './numeric.js';
import { buildAnalogy } from './analogy.js';
import { buildVocab } from './vocab.js';
import { markupToPlain } from './markup.js';

export const ITEM_GROUPS = {
  series: { label: 'Number series' },
  logic: { label: 'Logical deduction' },
  numeric: { label: 'Fractions and arithmetic' },
  verbal: { label: 'Verbal reasoning' },
};

export const ITEM_FAMILIES = {
  series: { group: 'series', label: 'Number series', kind: 'item', build: buildSeries },
  logic: { group: 'logic', label: 'Logical deduction', kind: 'item', build: buildLogic },
  numeric: { group: 'numeric', label: 'Fractions and arithmetic', kind: 'item', build: buildNumeric },
  analogy: { group: 'verbal', label: 'Verbal analogies', kind: 'item', build: buildAnalogy },
  vocab: { group: 'verbal', label: 'Vocabulary', kind: 'item', build: buildVocab },
};
export const ITEM_FAMILY_IDS = Object.keys(ITEM_FAMILIES);

const MAX_ATTEMPTS = 200;

export function generateItem({ family, difficulty = 1, seed }) {
  const fam = ITEM_FAMILIES[family];
  if (!fam) throw new Error(`unknown item family ${family}`);
  difficulty = Math.min(5, Math.max(1, Number(difficulty) || 1));
  seed = String(seed ?? '0');
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new Rng(`${family}|${difficulty}|${seed}|${attempt}`);
    const built = fam.build(difficulty, rng);
    if (!built) continue;
    if (new Set(built.options).size !== built.options.length) continue;
    const item = {
      kind: 'item',
      id: `${family}-${difficulty}-${seed}`,
      seed,
      family,
      familyLabel: fam.label,
      group: fam.group,
      groupLabel: ITEM_GROUPS[fam.group].label,
      difficulty,
      difficultyLabel: DIFFICULTY_LABELS[difficulty],
      attempt,
      question: built.question,
      prompt: built.prompt,
      options: built.options,
      correctIndex: built.correctIndex,
      distractors: built.distractors || built.options.map((_, i) => (i === built.correctIndex ? null : { index: i, code: 'wrong', text: 'does not follow from the rule' })),
      explanation: built.explanation,
      hints: built.hints,
      features: { ...built.features, optionCount: built.options.length },
      description: {
        prompt: `${built.question} ${markupToPlain(built.prompt).replace(/\n/g, ' ')}`,
        options: built.options.map(markupToPlain),
      },
    };
    return item;
  }
  throw new Error(`could not generate ${family} d${difficulty} seed ${seed}`);
}
