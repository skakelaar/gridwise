// Explanations, hints and misconception text derived from the rule specification.
// Only wording lives here: every value comes from the rule parameters, so the text can never disagree with the puzzle.
import { valueName, shortValueName, ATTR_LABEL, listNames, describeCell } from './text.js';
import { SET_PALETTES } from './shapes.js';

const OP_TEXT = {
  add: { name: 'addition', verb: 'adds together', how: 'the third cell shows every element from the first two cells (the two cells never share an element)', note: 'Because the two cells never overlap, reading this as a union gives the same answer.' },
  subtract: { name: 'subtraction', verb: 'subtracts', how: 'the third cell is the first cell with the second cell\'s elements removed', note: 'Because the second cell is part of the first, reading this as "keep what is in only one of the two" gives the same answer.' },
  union: { name: 'union', verb: 'merges', how: 'the third cell shows every element that appears in either of the first two cells' },
  intersection: { name: 'intersection', verb: 'keeps the shared part of', how: 'the third cell keeps only the elements that appear in both of the first two cells' },
  xor: { name: 'exclusive-or', verb: 'keeps the differences between', how: 'the third cell keeps the elements that appear in only one of the first two cells; anything they share disappears' },
  neither: { name: 'neither', verb: 'shows what is missing from', how: 'the third cell shows exactly the positions that are empty in both of the first two cells (the complement of their union)' },
};
export { OP_TEXT };

const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// "a union puzzle" but "an addition puzzle": 'union' starts with a consonant sound.
const article = (word) => (/^[aeiou]/i.test(word) && !/^u[nst]i/i.test(word) ? 'an' : 'a');

function stepPhrase(attr, step) {
  const n = Math.abs(step);
  switch (attr) {
    case 'rot': return `turns ${n * 45}° ${step > 0 ? 'clockwise' : 'anticlockwise'}`;
    case 'count': return `${step > 0 ? 'gains' : 'loses'} ${NUMBER_WORDS[n]} shape${n > 1 ? 's' : ''}`;
    case 'size': return step > 0 ? 'grows one size' : 'shrinks one size';
    case 'x': return `moves one step to the ${step > 0 ? 'right' : 'left'}`;
    case 'y': return `moves one step ${step > 0 ? 'down' : 'up'}`;
    default: return `changes by ${step}`;
  }
}

// "one more step" phrased for the attribute, e.g. "one more 45° turn clockwise".
function oneMore(attr, step) {
  const n = Math.abs(step);
  switch (attr) {
    case 'rot': return `one more ${n * 45}° turn ${step > 0 ? 'clockwise' : 'anticlockwise'}`;
    case 'count': return `${step > 0 ? 'adding' : 'removing'} ${NUMBER_WORDS[n]} more`;
    case 'size': return step > 0 ? 'one size larger' : 'one size smaller';
    case 'x': return `one more step to the ${step > 0 ? 'right' : 'left'}`;
    case 'y': return `one more step ${step > 0 ? 'down' : 'up'}`;
    default: return 'one more step';
  }
}

const vn = (domain, attr, idx) => valueName(attr, domain.values[idx]);
// Value as it reads inside a sequence: rotations lose the repeated "rotated ... clockwise".
const sn = (domain, attr, idx) => (attr === 'rot' ? shortValueName(attr, domain.values[idx]) : valueName(attr, domain.values[idx]));

// List of starting values, e.g. "90°, 315° and 135° clockwise" or "5, 5 and 3 shapes".
function startList(domain, attr, starts) {
  if (attr === 'rot') {
    const names = starts.map((s) => shortValueName(attr, domain.values[s]));
    return names.some((n) => n !== 'upright') ? `${listNames(names)}, measured clockwise` : listNames(names);
  }
  if (attr === 'count') return `${listNames(starts.map((s) => String(domain.values[s])))} shapes`;
  if (attr === 'x' || attr === 'y') return listNames(starts.map((s) => shortValueName(attr, domain.values[s])));
  return listNames(starts.map((s) => valueName(attr, domain.values[s])));
}

// The direction that carries no rule for a progression, e.g. the columns of a row-wise progression.
function startsText(line, attr, label, domain, starts) {
  const other = line === 'row' ? 'columns' : 'rows';
  if (new Set(starts).size === 1) {
    const start = attr === 'x' || attr === 'y' ? shortValueName(attr, domain.values[starts[0]]) : vn(domain, attr, starts[0]);
    return `Every ${line} starts with the same ${label} (${start}), so the ${other} add no rule of their own.`;
  }
  return `Each ${line} has its own starting ${label} (${startList(domain, attr, starts)}); the ${other} add no rule of their own.`;
}

// Returns { row, column, missing } sentences for one rule.
export function explainRule(rule, domain, family, domains = null) {
  const attr = rule.attr;
  const label = ATTR_LABEL[attr];
  const V = rule.values;
  const p = rule.params;
  const rowSoFar = `Row 3 so far: ${sn(domain, attr, V[2][0])}, then ${sn(domain, attr, V[2][1])}.`;
  const colSoFar = `Column 3 so far: ${sn(domain, attr, V[0][2])}, then ${sn(domain, attr, V[1][2])}.`;
  switch (rule.type) {
    case 'const':
      return {
        row: `The ${label} does not change across the rows (${vn(domain, attr, p.value)} throughout).`,
        column: `The ${label} does not change down the columns either.`,
        missing: `So the missing cell is also ${vn(domain, attr, p.value)}.`,
      };
    case 'rowProg':
      return {
        row: `Across each row the figure ${stepPhrase(attr, p.step)} from one cell to the next.`,
        column: startsText('row', attr, label, domain, p.starts),
        missing: `${rowSoFar} ${cap(oneMore(attr, p.step))} gives ${sn(domain, attr, V[2][2])}.`,
      };
    case 'colProg':
      return {
        row: startsText('column', attr, label, domain, p.starts),
        column: `Down each column the figure ${stepPhrase(attr, p.step)} from one cell to the next.`,
        missing: `${colSoFar} ${cap(oneMore(attr, p.step))} gives ${sn(domain, attr, V[2][2])}.`,
      };
    case 'grid':
      return {
        row: `Across each row the figure ${stepPhrase(attr, p.b)} from one cell to the next.`,
        column: `Down each column the figure ${stepPhrase(attr, p.a)} from one cell to the next.`,
        missing: `${rowSoFar} ${cap(oneMore(attr, p.b))} gives ${sn(domain, attr, V[2][2])}; going down column 3 instead gives the same.`,
      };
    case 'latin': {
      const vals = p.perm.map((i) => vn(domain, attr, i));
      const shifted = family === 'cyclic'
        ? ` The sequence ${vals.join(' → ')} repeats, and each row starts ${p.dir === 1 ? 'one place' : 'two places'} further along.`
        : '';
      return {
        row: `Each row contains each ${label} exactly once (${listNames(vals)}), in its own order.${shifted}`,
        column: `Each column also contains each ${label} exactly once.`,
        missing: `Row 3 already has ${vn(domain, attr, V[2][0])} and ${vn(domain, attr, V[2][1])}, so the missing cell must be ${vn(domain, attr, V[2][2])}. Column 3 agrees: it has ${vn(domain, attr, V[0][2])} and ${vn(domain, attr, V[1][2])}, and still needs ${vn(domain, attr, V[2][2])}.`,
      };
    }
    case 'rowAlt':
      return {
        row: `Across each row the ${label} alternates: ${vn(domain, attr, p.A)}, ${vn(domain, attr, p.B)}, ${vn(domain, attr, p.A)}.`,
        column: `Every row follows the same pattern, so within each column the ${label} stays the same.`,
        missing: `The missing cell is the third in its row, so the ${label} returns to ${vn(domain, attr, p.A)}.`,
      };
    case 'colAlt':
      return {
        row: `Across each row the ${label} stays the same.`,
        column: `Down each column the ${label} alternates: ${vn(domain, attr, p.A)}, ${vn(domain, attr, p.B)}, ${vn(domain, attr, p.A)}.`,
        missing: `The missing cell is the third in its column, so the ${label} returns to ${vn(domain, attr, p.A)}.`,
      };
    case 'coupled': {
      const src = p.source;
      const srcDomain = domains ? domains[src] : null;
      const srcName = (i) => (srcDomain ? valueName(src, srcDomain.values[i]) : String(i));
      const links = Object.entries(p.map).map(([a, b]) => `${srcName(Number(a))} → ${vn(domain, attr, b)}`);
      const missingSrc = srcName(Number(Object.keys(p.map).find((a) => p.map[a] === V[2][2])));
      return {
        row: `The ${label} has no pattern of its own: it is tied to the ${ATTR_LABEL[src]} (${listNames(links)}).`,
        column: 'That link holds in every cell, across rows and down columns alike.',
        missing: `The missing cell's ${ATTR_LABEL[src]} is ${missingSrc}, so its ${label} must be ${vn(domain, attr, V[2][2])}.`,
      };
    }
    case 'rowSum': case 'rowDiff': case 'colSum': case 'colDiff': {
      const along = rule.type.startsWith('row') ? 'row' : 'column';
      const across = along === 'row' ? 'columns' : 'rows';
      const isSum = rule.type.endsWith('Sum');
      const first = along === 'row' ? V[2][0] : V[0][2];
      const second = along === 'row' ? V[2][1] : V[1][2];
      const ruleText = isSum
        ? `In each ${along}, the number of shapes in the third cell is the first cell's count plus the second cell's count.`
        : `In each ${along}, the number of shapes in the third cell is the first cell's count minus the second cell's count.`;
      const noRule = `The ${across} carry no counting rule of their own; check ${along} 1 and ${along} 2 to confirm the arithmetic.`;
      return {
        row: along === 'row' ? ruleText : noRule,
        column: along === 'row' ? noRule : ruleText,
        missing: `${cap(along)} 3 has ${domain.values[first]} then ${domain.values[second]} shapes, so the missing cell has ${domain.values[first]} ${isSum ? '+' : '−'} ${domain.values[second]} = ${vn(domain, attr, V[2][2])}.`,
      };
    }
    case 'checker':
      return {
        row: `Across each row the ${label} alternates between ${vn(domain, attr, p.A)} and ${vn(domain, attr, p.B)}.`,
        column: `Down each column the ${label} alternates too, so it forms a checkerboard: cells that touch at a corner match.`,
        missing: `The missing cell is on the same diagonal as the centre cell and the top-left cell, so its ${label} is ${vn(domain, attr, p.A)}.`,
      };
    default:
      throw new Error(`no explanation for ${rule.type}`);
  }
}

const runsDown = (r) => r.type === 'colProg' || r.type === 'colAlt' || r.type === 'colSum' || r.type === 'colDiff';
const runsBoth = (r) => r.type === 'latin' || r.type === 'checker' || r.type === 'grid';

export function explainFigurePuzzle(rules, domains, family, answer) {
  const active = rules.filter((r) => r.type !== 'const');
  const constant = rules.filter((r) => r.type === 'const');
  const parts = active.map((r) => explainRule(r, domains[r.attr], family, domains));
  const rows = parts.map((p) => p.row);
  const columns = parts.map((p) => p.column);
  const missing = parts.map((p) => p.missing);
  const hasInner = answer.inner && answer.inner !== 'none';
  const shown = constant.filter((r) => ['shape', 'fill', 'size', 'count'].includes(r.attr) || (hasInner && (r.attr === 'inner' || r.attr === 'innerFill')));
  const unchanged = shown.length
    ? `Unchanged throughout: ${listNames(shown.map((r) => `${ATTR_LABEL[r.attr]} (${vn(domains[r.attr], r.attr, r.params.value)})`))}.`
    : '';
  const summary = active.length === 1
    ? `One rule is at work: only the ${ATTR_LABEL[active[0].attr]} changes.`
    : `${cap(NUMBER_WORDS[active.length])} rules work independently: ${listNames(active.map((r) => ATTR_LABEL[r.attr]))}. Check each on its own.`;
  return {
    summary,
    rows,
    columns,
    missing: [...missing, `Putting it together, the missing cell is ${describeCell(answer)}.`],
    unchanged,
  };
}

// Where to look for one rule, before saying what it is.
function lookHint(r) {
  const label = ATTR_LABEL[r.attr];
  if (r.type === 'latin') return `Look at row 1, then row 2. Does any ${label} repeat within a row? Now check the columns the same way.`;
  if (r.type === 'checker') return `Compare neighbouring cells along row 1 and down column 1. Does the ${label} alternate in both directions?`;
  if (r.type === 'grid') return `Read along row 1, then down column 1. The ${label} changes by a fixed step in both directions.`;
  if (r.type === 'coupled') return `The ${label} follows no row or column pattern. Compare it with the other attributes cell by cell: it is tied to one of them.`;
  if (r.type === 'rowSum' || r.type === 'rowDiff') return `Count the shapes in the first two cells of row 1. How do they combine to give the third cell's count?`;
  if (r.type === 'colSum' || r.type === 'colDiff') return `Count the shapes in the first two cells of column 1. How do they combine to give the third cell's count?`;
  if (runsDown(r)) return `Read down column 1, then column 2. How does the ${label} change from one cell to the next?`;
  return `Read along row 1, then row 2. How does the ${label} change from one cell to the next?`;
}

function ruleHint(r, domains, family) {
  const e = explainRule(r, domains[r.attr], family, domains);
  return runsDown(r) ? e.column : e.row;
}

export function figureHints(rules, domains, family) {
  const active = rules.filter((r) => r.type !== 'const');
  const hints = [];
  if (active.length === 1) {
    const r = active[0];
    hints.push(`Focus on one thing: the ${ATTR_LABEL[r.attr]}. Everything else stays the same.`);
    hints.push(lookHint(r));
    hints.push(ruleHint(r, domains, family));
  } else {
    hints.push(`More than one thing changes. Check these separately: ${listNames(active.map((r) => ATTR_LABEL[r.attr]))}.`);
    const both = active.filter(runsBoth).length;
    hints.push(both
      ? 'Take them one at a time. For each, ask whether the pattern runs along the rows, down the columns, or both.'
      : 'Take them one at a time. For each, ask whether the pattern runs along the rows or down the columns.');
    for (const r of active) hints.push(`${cap(ATTR_LABEL[r.attr])}: ${ruleHint(r, domains, family)}`);
  }
  return hints;
}

export function explainSetPuzzle(op, orientation, palette, known, answer, colOp = null) {
  const pal = SET_PALETTES[palette];
  const names = (m) => (m.length ? listNames(m.map((x) => pal.names[x])) : 'nothing');
  const o = OP_TEXT[op];
  const along = orientation === 'row' ? 'row' : 'column';
  const across = orientation === 'row' ? 'columns' : 'rows';
  const first = orientation === 'row' ? known[2][0] : known[0][2];
  const second = orientation === 'row' ? known[2][1] : known[1][2];
  const ruleText = `In each ${along}, the third cell ${o.verb} the first two: ${o.how}.` + (o.note ? ` ${o.note}` : '');
  const co = colOp ? OP_TEXT[colOp] : null;
  const noRule = co
    ? `The columns follow a second operation of their own: in each column, the third cell ${co.verb} the first two (${co.how}). Both operations give the same missing cell.`
    : `The ${across} follow no rule of their own. Use ${along}s 1 and 2 to confirm the operation, then apply it to ${along} 3.`;
  return {
    summary: co ? `Two operations are at work: ${o.name} along the rows and ${co.name} down the columns.` : `This is ${article(o.name)} ${o.name} puzzle: the rule runs along the ${along}s.`,
    rows: [orientation === 'row' ? ruleText : noRule],
    columns: [orientation === 'row' ? noRule : ruleText],
    missing: [
      `${cap(along)} 3: the first cell has ${names(first)}; the second has ${names(second)}.`,
      `${cap(o.name)} gives ${names(answer.members)}, so that is the missing cell.`,
    ],
    unchanged: '',
  };
}

export function setHints(op, orientation, colOp = null) {
  const along = orientation === 'row' ? 'row' : 'column';
  const extra = colOp ? [`The columns follow a second operation (${OP_TEXT[colOp].name}); either direction gives the answer, and they agree.`] : [];
  return [...extra,
    `Treat each cell as a collection of separate elements rather than one picture. Compare the first two cells of ${along} 1 with its third cell.`,
    `Is the third cell of each ${along} fuller or emptier than the first two? Fuller suggests combining them; emptier suggests keeping only part of them.`,
    `The third cell of each ${along} is built from the first two by one operation. Does it keep everything, only the shared elements, or only the differences?`,
    `The operation is ${OP_TEXT[op].name}: ${OP_TEXT[op].how}. Apply it to the first two cells of ${along} 3.`,
  ];
}
