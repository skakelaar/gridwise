export { generatePuzzle, listFamilies, randomSeed, FAMILIES, FAMILY_IDS, GROUPS, DIFFICULTY_LABELS, MAX_DIFFICULTY } from './generate.js';
export { describeCell, valueName, ATTR_LABEL } from './text.js';
export { cellKey, cellsEqual } from './cells.js';
export { Rng, hashSeed } from './rng.js';
export { generateItem, ITEM_FAMILIES, ITEM_FAMILY_IDS, ITEM_GROUPS } from './items/index.js';
export { markupToHtml, markupToPlain } from './items/markup.js';
import { generatePuzzle as _gen, FAMILIES as _F, GROUPS as _G } from './generate.js';
import { generateItem as _genItem, ITEM_FAMILIES as _IF, ITEM_GROUPS as _IG } from './items/index.js';
/** Matrix groups followed by the other question-type groups. */
export const ALL_GROUPS = { ..._G, ..._IG };
export function familyInfo(id) { return _F[id] || _IF[id] || null; }
/** Generate a matrix puzzle or a non-matrix item from the same kind of spec { family, difficulty, seed }. */
export function generateAny(spec) { return _IF[spec.family] ? _genItem(spec) : _gen(spec); }
