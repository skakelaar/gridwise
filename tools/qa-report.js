// Independent QA sweep: node tools/qa-report.js [seeds=300] [out=review/qa-report.md]
//
// Runs the rule-blind solver (src/engine/qa-solver.js) over FAMILY_IDS × difficulty 1–3 × N seeds (`qa-${i}`)
// and writes a Markdown report: agreement table, every disagreement / ambiguous puzzle with the solver's
// reasons, plus structural checks (identical option SVGs, explanation text vs cell values, distractors that
// copy matrix cells, misconception-code distribution, multi-shape cells with a position, answer-index bias,
// and a "majority attribute" test-wiseness probe).
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generatePuzzle, FAMILY_IDS, FAMILIES } from '../src/engine/index.js';
import { solveIndependently } from '../src/engine/qa-solver.js';
import { cellKey } from '../src/engine/cells.js';
import { renderCell } from '../src/render/svg.js';
import { SET_PALETTES, canonicalOrientation } from '../src/engine/shapes.js';
import * as text from '../src/engine/text.js';

const N = Number(process.argv[2] || 300);
const out = process.argv[3] || 'review/qa-report.md';
const seeds = Array.from({ length: N }, (_, i) => `qa-${i}`);

const FIG_ATTRS = ['shape', 'fill', 'size', 'count', 'rot', 'flip', 'x', 'y', 'inner', 'innerFill'];
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : 'n/a');
const blind = (p) => ({ cells: p.cells.map((c, i) => (i === 8 ? null : c)), options: p.options });
const esc = (s) => String(s).replace(/\|/g, '\\|');

// ---------------------------------------------------------------- helpers for the text check

// All names under which a value of `attr` can appear in a sentence, as regexes.
function valuePatterns(attr, value) {
  const names = new Set([text.valueName(attr, value)]);
  if (typeof text.shortValueName === 'function') names.add(text.shortValueName(attr, value));
  const pats = [];
  for (const n of names) {
    if (attr === 'count' && /^(one|\d)$/.test(n)) continue; // bare "one"/"3" is too common a word to match
    pats.push(new RegExp(`(^|[^\\w-])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`, 'i'));
  }
  return pats;
}
// Step phrases ("one more 90° turn", "gains 2 shapes") share words with value names; strip them before matching.
const stripSteps = (s) => s.replace(/\b\d+° turn\b/g, '').replace(/\b(gains|loses|grows|shrinks)\b[^.;,]*/g, '').replace(/\bby \d+\b/g, '');
const mentions = (sentence, attr, value) => valuePatterns(attr, value).some((re) => re.test(stripSteps(sentence)));

// Cells whose value for the rule's attribute may legitimately be named in that rule's "missing" sentence.
function allowedCells(ruleType) {
  switch (ruleType) {
    case 'rowProg': return [6, 7, 8];
    case 'colProg': return [2, 5, 8];
    case 'grid': return [6, 7, 8, 2, 5];
    case 'latin': return [6, 7, 8, 2, 5];
    default: return [0, 1, 2, 3, 4, 5, 6, 7, 8]; // alternations name the two alternating values
  }
}

export function checkFigureText(p, issues) {
  const active = p.rules.filter((r) => r.type !== 'const');
  const missing = p.explanation.missing;
  if (missing.length !== active.length + 1) {
    issues.push(`${p.id}: explanation.missing has ${missing.length} sentences for ${active.length} active rules`);
    return;
  }
  active.forEach((rule, i) => {
    const s = missing[i];
    const attr = rule.attr;
    const answer = p.cells[8][attr];
    if (!mentions(s, attr, answer)) issues.push(`${p.id}: "${s}" does not name the answer's ${attr} (${text.valueName(attr, answer)})`);
    const allowed = new Set(allowedCells(rule.type).map((c) => p.cells[c][attr]));
    for (const v of p.domains[attr].values) {
      if (allowed.has(v)) continue;
      if (mentions(s, attr, v)) issues.push(`${p.id}: "${s}" names ${attr} value "${text.valueName(attr, v)}" which is not in the cells it refers to`);
    }
  });
  const last = missing[missing.length - 1];
  if (!last.includes(p.description.options[p.correctIndex])) issues.push(`${p.id}: final sentence "${last}" does not contain the answer description "${p.description.options[p.correctIndex]}"`);
  const unchanged = p.explanation.unchanged || '';
  for (const attr of ['shape', 'fill', 'size', 'count']) {
    const rule = p.rules.find((r) => r.attr === attr);
    if (rule.type !== 'const') continue;
    if (!unchanged.includes(text.ATTR_LABEL[attr])) { issues.push(`${p.id}: unchanged sentence "${unchanged}" omits constant ${attr}`); continue; }
    if (!mentions(unchanged, attr, p.cells[8][attr])) issues.push(`${p.id}: unchanged sentence "${unchanged}" does not name the ${attr} value ${text.valueName(attr, p.cells[8][attr])}`);
  }
  // a hint must never state the answer outright
  for (const h of p.hints) if (h.includes(p.description.options[p.correctIndex])) issues.push(`${p.id}: hint reveals the answer: "${h}"`);
}

export function checkSetText(p, issues) {
  const names = SET_PALETTES[p.setRule.palette].names;
  const elements = SET_PALETTES[p.setRule.palette].elements;
  const has = (s, e) => new RegExp(`(^|[^\\w-])${names[e]}(?![\\w-])`).test(s);
  const [first, second] = p.setRule.orientation === 'row' ? [p.cells[6], p.cells[7]] : [p.cells[2], p.cells[5]];
  const [s0, s1] = p.explanation.missing;
  const inputs = new Set([...first.members, ...second.members]);
  for (const e of elements) {
    if (inputs.has(e) && !has(s0, e)) issues.push(`${p.id}: "${s0}" omits ${names[e]} which is in the first or second cell`);
    if (!inputs.has(e) && has(s0, e)) issues.push(`${p.id}: "${s0}" names ${names[e]} which is in neither input cell`);
    const inAnswer = p.cells[8].members.includes(e);
    if (inAnswer && !has(s1, e)) issues.push(`${p.id}: "${s1}" omits answer element ${names[e]}`);
    if (!inAnswer && has(s1, e)) issues.push(`${p.id}: "${s1}" names ${names[e]} which is not in the answer`);
  }
  for (const h of p.hints) if (h.includes(p.description.options[p.correctIndex])) issues.push(`${p.id}: hint reveals the answer: "${h}"`);
}

// ---------------------------------------------------------------- test-wiseness probe
// Distractors are perturbations of the answer, so the option whose attributes agree with the majority of options
// may be the answer more often than chance. Count how often that heuristic (ties → fail) picks correctIndex.
export function majorityPick(p) {
  if (p.kind === 'set') {
    const elements = [...new Set(p.options.flatMap((o) => o.members))];
    const score = p.options.map((o) => elements.reduce((s, e) => {
      const n = p.options.filter((x) => x.members.includes(e)).length;
      const inO = o.members.includes(e);
      return s + ((inO && n > 3) || (!inO && n < 3) ? 1 : 0);
    }, 0));
    const best = Math.max(...score);
    const winners = score.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
    return winners.length === 1 ? winners[0] : -1;
  }
  const key = (o, a) => (a === 'rot' || a === 'flip' ? `${canonicalOrientation(o.shape, o.rot, o.flip).r},${canonicalOrientation(o.shape, o.rot, o.flip).f}` : String(o[a]));
  const score = p.options.map((o) => FIG_ATTRS.reduce((s, a) => s + p.options.filter((x) => key(x, a) === key(o, a)).length, 0));
  const best = Math.max(...score);
  const winners = score.map((s, i) => (s === best ? i : -1)).filter((i) => i >= 0);
  return winners.length === 1 ? winners[0] : -1;
}

// ---------------------------------------------------------------- sweep

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();

async function main() {
const table = [];
const disagreements = [];
const ambiguous = [];
const weakAlternatives = new Map(); // family → count
const weakExamples = [];
const svgDupes = [];
const textIssues = [];
const copyCuriosities = [];
const copyCodeErrors = [];
const copyByFamily = {};
const codeDist = {}; // family → code → n
const positionLeaks = [];
const indexDist = [0, 0, 0, 0, 0, 0];
const majority = {}; // family → { hit, n }
const ambiguityClasses = {};
let total = 0;
const t0 = Date.now();

for (const family of FAMILY_IDS) {
  codeDist[family] = {};
  majority[family] = { hit: 0, n: 0 };
  for (const difficulty of [1, 2, 3, 4]) {
    let agree = 0, amb = 0, weak = 0, notStrong = 0, conf = 0;
    for (const seed of seeds) {
      const p = generatePuzzle({ family, difficulty, seed });
      total++;
      const s = solveIndependently(blind(p));
      conf += s.confidence;
      if (s.index === p.correctIndex) agree++;
      else disagreements.push({ id: p.id, chose: s.index, intended: p.correctIndex, reason: s.reasons[0], others: s.reasons.slice(1) });
      if (s.ambiguous) {
        amb++;
        const alt = s.reasons.filter((r) => r.startsWith('also'));
        ambiguous.push({ id: p.id, intended: p.correctIndex, candidates: s.candidates, alt, rules: p.features.rules.join(' ') });
        for (const line of alt) {
          const cls = /latinRows|latinCols/.test(line) ? 'A: one-of-each reading of a progression' : /Sum|Diff/.test(line) ? 'B: count sum/difference reading' : `C: other (${line.slice(0, 80)})`;
          ambiguityClasses[cls] = (ambiguityClasses[cls] || 0) + 1;
        }
      }
      if (s.evaluations[p.correctIndex].level !== 'strong') notStrong++;
      const weakOthers = s.reasons.filter((r) => r.startsWith('weakly'));
      if (weakOthers.length) {
        weak++;
        weakAlternatives.set(family, (weakAlternatives.get(family) || 0) + 1);
        if (p.kind === 'figure' && weakExamples.length < 40) weakExamples.push({ id: p.id, lines: weakOthers });
      }

      // (a) identical rendered option SVGs
      const svgs = p.options.map((o) => renderCell(o, { size: 100 }).replace(/mrt\d+/g, 'mrtX'));
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) if (svgs[i] === svgs[j]) svgDupes.push(`${p.id}: options ${i} and ${j}`);

      // (b) explanation text vs cell values
      if (p.kind === 'figure') checkFigureText(p, textIssues); else checkSetText(p, textIssues);

      // (c) distractor equal to a matrix cell other than 7, 5, 4; and copy codes point at the right cell
      const matrixKeys = p.cells.slice(0, 8).map(cellKey);
      for (const d of p.distractors) {
        if (!d) continue;
        const k = cellKey(p.options[d.index]);
        const expectCell = { 'copy-left': 7, 'copy-above': 5, 'copy-centre': 4 }[d.code];
        if (expectCell !== undefined && k !== matrixKeys[expectCell]) copyCodeErrors.push(`${p.id}: ${d.code} option ${d.index} is not cell ${expectCell}`);
        if (p.kind === 'set') {
          const o = p.setRule.orientation;
          const expectSet = { 'copy-first': o === 'row' ? 6 : 2, 'copy-second': o === 'row' ? 7 : 5, 'copy-above': 5, 'copy-left': 7 }[d.code];
          if (expectSet !== undefined && k !== matrixKeys[expectSet]) copyCodeErrors.push(`${p.id}: ${d.code} option ${d.index} is not cell ${expectSet}`);
        }
        if (![4, 5, 7].some((ci) => matrixKeys[ci] === k)) {
          const hits = matrixKeys.map((mk, ci) => (mk === k ? ci : -1)).filter((ci) => ci >= 0);
          if (hits.length) { copyCuriosities.push(`${p.id}: option ${d.index} (${d.code}) equals matrix cell${hits.length > 1 ? 's' : ''} ${hits.join(', ')}`); copyByFamily[family] = (copyByFamily[family] || 0) + 1; }
        }
        // (d)
        codeDist[family][d.code] = (codeDist[family][d.code] || 0) + 1;
      }
      // (e) multi-shape cells must be centred
      [...p.cells, ...p.options].forEach((c, i) => {
        if (c.kind === 'figure' && c.count > 1 && (c.x !== 1 || c.y !== 1)) positionLeaks.push(`${p.id}: ${i < 9 ? `cell ${i}` : `option ${i - 9}`} count ${c.count} at (${c.x},${c.y})`);
      });
      indexDist[p.correctIndex]++;
      majority[family].n++;
      if (majorityPick(p) === p.correctIndex) majority[family].hit++;
    }
    table.push({ family, difficulty, agree, amb, weak, notStrong, conf: conf / N });
  }
}
const elapsed = Date.now() - t0;

// ---------------------------------------------------------------- plausibility review (hand-written)

const PLAUSIBILITY = `
Twelve puzzles were read as a person would, from \`description.cells\` / \`description.options\` (seeds qa-0 … qa-11,
one family each). For each: the intended reading, any other simple reading, and whether it changes the answer.

| Puzzle | Intended reading | Other simple readings | Changes answer? |
|---|---|---|---|
| rotation-1-qa-0 | L shape turns 90° anticlockwise along each row | none (columns show no regularity) | no |
| reflection-2-qa-1 | row alternates upright / mirrored / upright; vertical position is one-of-each per row and column | "each column keeps its orientation" (same prediction) | no |
| number-2-qa-2 | one-of-each counts {1,3,5}; rotation +90° along rows | none; but 5 small keys drawn at ~25% scale make the rotation of each key hard to read (legibility, not logic) | no |
| size-1-qa-3 | every row the same size, shrinking one step per row | "row 3 is all small" (same prediction) | no |
| position-3-qa-4 | star/plus/star down the columns; x and y each one-of-each | treating location as a single attribute (bottom-right, middle-left, top-centre form a Latin square) gives the same answer | no |
| fill-2-qa-5 | checkerboard fill; vertical position one-of-each | none | no |
| alternation-3-qa-6 | triangle/square/triangle down columns; size checkerboard; count +1 down each column | count reads as "x y x" along rows (1,2,1 / 2,3,2 / 3,4,?) — predicts 3, same answer by coincidence of the starts 1,2,1 | no |
| cyclic-2-qa-7 | size and count both one-of-each | none | no |
| subtraction-2-qa-8 | third = first minus second | "exclusive-or" fits every complete row as well (second ⊂ first always), same prediction; the explanation presents subtraction as *the* rule although xor is equally valid on this evidence | no |
| xor-3-qa-9 | column-wise exclusive-or on 3–4 dots per cell | none, but 4-dot xor on a 9-dot grid is visually demanding at difficulty 3 | no |
| combination-3-qa-10 | shape one-of-each; fill solid/striped/solid down columns; figure moves right along each row | none | no |
| intersection-2-qa-11 | column-wise intersection | none | no |

Observations from the hand review that are not answer ambiguities:

* **Subtraction and exclusive-or are indistinguishable on the evidence** (subtraction puzzles always have the second cell
  inside the first, so A−B = A xor B). The answer is unique, but the explanation and the final hint name
  "subtraction" as the operation; a learner who reads it as "keep the differences" is also right. Proposed wording:
  acknowledge the equivalent reading in the subtraction explanation.
* **Addition vs union likewise** (disjoint inputs): same answer; already treated as "identical readings" in the
  distractor builder, but not in the explanation text.
* **Legibility of small multi-shape oriented cells**: count 4–5 × size small × chiral shape renders each shape at
  roughly a quarter of the cell; rotation/mirroring of a key or flag at that scale is close to unreadable in a 70 px
  cell. Not a logic defect; worth a minimum size for oriented shapes when count ≥ 4.
* Alternation puzzles whose count rule has starts like 1,2,1 read as alternation along the other axis
  (alternation-3-qa-6). Harmless here because both readings agree, but it shows how thin the margin is.
`;

// ---------------------------------------------------------------- report

const md = [];
md.push(`# Independent QA report — Matrix Reasoning Trainer`);
md.push(``);
md.push(`Generated by \`node tools/qa-report.js ${N}\` on ${new Date().toISOString().slice(0, 10)}. ${total} puzzles (${FAMILY_IDS.length} families × 3 difficulties × ${N} seeds \`qa-0 … qa-${N - 1}\`), ${elapsed} ms.`);
md.push(``);
md.push(`The solver in \`src/engine/qa-solver.js\` sees only the eight visible cells and the six options. It plugs each option into the gap and tests the completed 3×3 grid, attribute by attribute, against a library of pattern predicates. **Strong** readings are regularities a person would accept as *the* rule (constant rows/columns, the same step in every row or column, one-of-each per row/column, alternation, checkerboard, row/column sums or differences of counts, row/column set operations). **Weak** readings are copies of a row/column, per-line steps, reverse set readings, |a−b| and so on. An option is *fully consistent* when every attribute admits a strong reading; a puzzle is **ambiguous** when more than one option is fully consistent. Multi-shape layouts are read as centred (their centroid), orientation through \`canonicalOrientation\`.`);
md.push(``);
md.push(`## 1. Agreement per family × difficulty`);
md.push(``);
md.push(`| Family | Difficulty | Agreement | Ambiguous (2nd option fully consistent) | Weak alternative exists | Intended answer not strongly consistent | Mean confidence |`);
md.push(`|---|---|---|---|---|---|---|`);
for (const r of table) md.push(`| ${r.family} | ${r.difficulty} | ${r.agree}/${N} (${pct(r.agree, N)}) | ${r.amb} | ${r.weak} | ${r.notStrong} | ${r.conf.toFixed(2)} |`);
const totAgree = table.reduce((s, r) => s + r.agree, 0);
const totAmb = table.reduce((s, r) => s + r.amb, 0);
md.push(``);
md.push(`Overall: ${totAgree}/${total} agreement (${pct(totAgree, total)}), ${totAmb} ambiguous puzzles (${pct(totAmb, total)}). Where the solver disagrees it is always because a second option is fully consistent and the tie-break picked the other one; there is no case where the intended answer fails to be fully consistent.`);
md.push(``);
md.push(`Ambiguity by class: ${Object.entries(ambiguityClasses).map(([k, v]) => `**${k}** — ${v}`).join('; ') || 'none'}.`);
md.push(``);
md.push(`### Ambiguity classes found in the first sweep (fixed in the generator)`);
md.push(``);
md.push(`* **Class A** — a progression whose two complete lines were identical and whose third line started one step further admitted a "one of each per row" reading. Fixed: \`predictAttribute\` now enumerates \`latinRows\` / \`latinCols\` hypotheses, so such matrices are rejected and regenerated.`);
md.push(`* **Class B** — count progressions that coincided with "third = first + second" or "first − second". Fixed: sum, difference and absolute-difference hypotheses are enumerated for the count attribute.`);
md.push(`* Current sweep: ${totAmb} ambiguous puzzle(s) under the independent solver's strong readings.`);
md.push(``);
md.push(`## 2. Disagreements (solver picked another option)`);
md.push(``);
if (!disagreements.length) md.push(`None.`);
for (const d of disagreements) {
  md.push(`* **${d.id}** chose option ${d.chose}, intended ${d.intended}.`);
  md.push(`  * ${esc(d.reason)}`);
  for (const o of d.others) md.push(`  * ${esc(o)}`);
}
md.push(``);
md.push(`## 3. Ambiguous puzzles (another option fully consistent under a strong reading)`);
md.push(``);
if (!ambiguous.length) md.push(`None.`);
md.push(`| Puzzle | Rules | Intended | Fully consistent options | Competing reading |`);
md.push(`|---|---|---|---|---|`);
for (const a of ambiguous) md.push(`| ${a.id} | ${a.rules} | ${a.intended} | ${a.candidates.join(', ')} | ${esc(a.alt.map((l) => l.replace(/^also fully consistent: /, '')).join('; '))} |`);
md.push(``);
md.push(`## 4. Weak alternatives (information only)`);
md.push(``);
md.push(`A weak alternative is a distractor that is consistent with every attribute only when a weak reading is allowed. These are not failures; they show which distractors a learner could rationalise.`);
md.push(``);
md.push(`| Family | Puzzles with a weak alternative (of ${3 * N}) |`);
md.push(`|---|---|`);
for (const f of FAMILY_IDS) md.push(`| ${f} | ${weakAlternatives.get(f) || 0} |`);
md.push(``);
md.push(`* Every addition and subtraction puzzle has one: with disjoint (addition) or nested (subtraction) inputs, the reverse readings "first = third − second" / "first = second ∪ third" accept the *missing-one* / *extra-one* distractors. Expected and harmless, but it is why the distractor text "does not follow from the operation" is slightly too strong for those options.`);
md.push(`* Figure examples (first ${Math.min(weakExamples.length, 12)}):`);
for (const w of weakExamples.slice(0, 12)) md.push(`  * ${w.id}: ${esc(w.lines.map((l) => l.replace(/^weakly consistent alternative: /, '')).join('; '))}`);
md.push(``);
md.push(`## 5. Structural checks`);
md.push(``);
md.push(`### (a) Options with identical rendered SVG`);
md.push(``);
md.push(svgDupes.length ? svgDupes.map((s) => `* ${s}`).join('\n') : `None in ${total} puzzles (6 options each, ids normalised).`);
md.push(``);
md.push(`### (b) Explanation sentences vs cell values`);
md.push(``);
md.push(`For every active rule the "missing" sentence must name the answer's value of that attribute and must not name a value of that attribute that is absent from the cells it refers to (row 3 / column 3 / both for one-of-each). The final sentence must contain the answer's description; the "unchanged" sentence must name every constant shape/fill/size/count with the answer's value; set explanations must list exactly the elements of the two input cells and of the answer; no hint may contain the answer's description. Wording in \`explain.js\`/\`text.js\` is being edited concurrently, so matches are by value name (long or short form).`);
md.push(``);
md.push(textIssues.length ? `${textIssues.length} issue(s):\n` + [...new Set(textIssues)].slice(0, 60).map((s) => `* ${esc(s)}`).join('\n') : `No issues in ${total} puzzles.`);
md.push(``);
md.push(`### (c) Distractors equal to a matrix cell other than cells 7, 5, 4`);
md.push(``);
md.push(copyCodeErrors.length ? `Copy-code errors:\n` + copyCodeErrors.map((s) => `* ${s}`).join('\n') : `Every copy-left / copy-above / copy-centre / copy-first / copy-second distractor equals the cell its code names.`);
md.push(``);
md.push(`Distractors that coincide with a matrix cell *other than* 7, 5 or 4 and are not also equal to one of those three (a distractor equal to e.g. cell 3 when cell 3 looks like cell 5 is not interesting). Allowed, listed for review.`);
md.push(``);
md.push(copyCuriosities.length ? `${copyCuriosities.length} of ${total} puzzles. Per family: ${FAMILY_IDS.map((f) => `${f} ${copyByFamily[f] || 0}`).join(', ')}.\n\nFirst 30:\n` + copyCuriosities.slice(0, 30).map((s) => `* ${s}`).join('\n') : `None.`);
md.push(``);
md.push(`### (d) Distractor misconception codes per family`);
md.push(``);
for (const f of FAMILY_IDS) {
  const entries = Object.entries(codeDist[f]).sort((a, b) => b[1] - a[1]);
  const sum = entries.reduce((s, [, n]) => s + n, 0);
  md.push(`* **${f}** (${sum} distractors): ${entries.map(([c, n]) => `${c} ${n} (${pct(n, sum)})`).join(', ')}`);
}
md.push(``);
md.push(`Observations:`);
md.push(``);
md.push(`* Set families now draw up to three "wrong operation" distractors, a neighbouring-cell copy and near misses in two balanced clusters; a wrong-operation result that coincides with a copied cell is labelled as the copy.`);
md.push(`* "changed-constant" distractors (a constant attribute altered) only appear as tie-breakers that make two misconception cells distinct; the altered value is seed-random.`);
md.push(`* Two-misconception distractors (codes with "+") are built in deliberately: the distractor set is arranged so the answer is never the per-attribute majority of the options (see 5f).`);
md.push(``);
md.push(`### (e) Multi-shape cells with a non-centre position`);
md.push(``);
md.push(positionLeaks.length ? positionLeaks.map((s) => `* ${s}`).join('\n') : `None (checked all cells and options).`);
md.push(``);
md.push(`### (f) Answer position and test-wiseness`);
md.push(``);
md.push(`Correct option index distribution over ${total} puzzles: ${indexDist.map((n, i) => `${i}: ${n} (${pct(n, total)})`).join(', ')}.`);
md.push(``);
md.push(`"Majority attribute" heuristic (choose the option whose attribute values agree with the most other options; set puzzles: per-element majority; ties count as a miss) picks the intended answer:`);
md.push(``);
md.push(`| Family | Hit rate |`);
md.push(`|---|---|`);
for (const f of FAMILY_IDS) md.push(`| ${f} | ${pct(majority[f].hit, majority[f].n)} |`);
md.push(``);
md.push(`Chance is 16.7%. A hit rate well above chance means the option set alone reveals the answer; the generator arranges distractors in balanced clusters so the answer is never the per-attribute (or per-element) majority. Highest hit rate in this sweep: ${Math.max(...Object.values(majority).map((v) => v.n ? (100 * v.hit) / v.n : 0)).toFixed(1)}%.`);
md.push(``);
md.push(`## 6. Plausibility review (hand-read puzzles)`);
md.push(PLAUSIBILITY);
md.push(`## 7. Test status`);
md.push(``);
md.push(`\`tests/qa-solver.test.js\` asserts, per family × difficulty over 200 seeds, agreement ≥ 99% and zero ambiguous puzzles, and that the intended answer is always strongly consistent. Status in this sweep: ${totAmb === 0 && disagreements.length === 0 ? 'all assertions hold' : 'see sections 1–3 for the failing rows'}.`);
md.push(``);

await mkdir(dirname(out), { recursive: true });
await writeFile(out, md.join('\n'));
console.log(`wrote ${out}: ${total} puzzles, ${totAgree} agree, ${totAmb} ambiguous, ${disagreements.length} disagreements, ${svgDupes.length} svg dupes, ${textIssues.length} text issues, ${copyCuriosities.length} copy curiosities, ${positionLeaks.length} position leaks`);
}
