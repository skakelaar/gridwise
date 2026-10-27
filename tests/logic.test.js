// Formal check of every logical-deduction item: the intended answer must be entailed by the premises and no
// other option may be, under BOTH readings of universal statements (with and without existential import).
// Class statements are checked by enumerating every model over a small domain; conditionals by truth table;
// orderings by enumerating permutations. The checker parses the item text, so it also catches wording drift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateItem } from '../src/engine/items/index.js';
import { GROUPS_BANK, CONDITIONALS, CHAIN_CONDITIONALS, NONE } from '../src/engine/items/logic.js';

const PLURAL = { has: 'have', wears: 'wear', starts: 'start', reads: 'read', trains: 'train', owns: 'own', can: 'can' };
const pluralVerb = (has) => has.replace(/^(has|wears|starts|reads|trains|owns|can)/, (v) => PLURAL[v]);
const strip = (x) => x.replace(/\.$/, '');

// ---- class logic: statements over named classes (and individuals as singleton classes)
// Returns { kind: 'all'|'some'|'no'|'someNot', a, b } or { kind: 'in'|'notIn', x, cls } or null.
function parseClass(s) {
  s = strip(s);
  let m;
  for (const g of GROUPS_BANK) {
    if (s === `All ${g.plural} ${pluralVerb(g.has)}`) return { kind: 'all', a: g.plural, b: g.has };
    if (s === `No ${g.plural} ${pluralVerb(g.has)}`) return { kind: 'no', a: g.plural, b: g.has };
    if (s === g.converse) return { kind: 'all', a: g.has, b: g.plural };
    if ((m = s.match(/^(\w+) is not (.+)$/)) && m[2] === g.singular) return { kind: 'notIn', x: m[1], cls: g.plural };
    if ((m = s.match(/^(\w+) is (.+)$/)) && m[2] === g.singular) return { kind: 'in', x: m[1], cls: g.plural };
    if ((m = s.match(/^(\w+) (.+)$/)) && m[2] === g.hasNot) return { kind: 'notIn', x: m[1], cls: g.has };
    if ((m = s.match(/^(\w+) (.+)$/)) && m[2] === g.has) return { kind: 'in', x: m[1], cls: g.has };
  }
  if ((m = s.match(/^All (.+?) are (.+)$/))) return { kind: 'all', a: m[1], b: m[2] };
  if ((m = s.match(/^No (.+?) are (.+)$/))) return { kind: 'no', a: m[1], b: m[2] };
  if ((m = s.match(/^Some (.+?) are not (.+)$/))) return { kind: 'someNot', a: m[1], b: m[2] };
  if ((m = s.match(/^Some (.+?) are (.+)$/))) return { kind: 'some', a: m[1], b: m[2] };
  return null;
}

// Enumerate models: each class is a subset of a domain of N elements (bitmask); individuals are fixed elements.
function classEntails(premises, conclusion, importAll) {
  const terms = [...new Set([...premises, conclusion].flatMap((p) => (p.kind === 'in' || p.kind === 'notIn' ? [p.cls] : [p.a, p.b])))];
  const people = [...new Set([...premises, conclusion].filter((p) => p.kind === 'in' || p.kind === 'notIn').map((p) => p.x))];
  const N = 3;
  const truth = (st, model) => {
    if (st.kind === 'in') return (model[st.cls] >> people.indexOf(st.x)) & 1;
    if (st.kind === 'notIn') return !((model[st.cls] >> people.indexOf(st.x)) & 1);
    const A = model[st.a], B = model[st.b];
    if (st.kind === 'all') return (A & ~B) === 0 && (!importAll || A !== 0);
    if (st.kind === 'no') return (A & B) === 0;
    if (st.kind === 'some') return (A & B) !== 0;
    if (st.kind === 'someNot') return (A & ~B) !== 0;
    throw new Error('bad statement');
  };
  let satisfiable = false;
  const model = {};
  const rec = (i) => {
    if (i === terms.length) {
      if (!premises.every((p) => truth(p, model))) return true;
      satisfiable = true;
      return !!truth(conclusion, model);
    }
    for (let mask = 0; mask < (1 << N); mask++) { model[terms[i]] = mask; if (!rec(i + 1)) return false; }
    return true;
  };
  const ok = rec(0);
  return satisfiable && ok;
}

// ---- conditionals: propositions keyed by CONDITIONALS entries
// Every proposition is keyed by its present-tense condition text, so "If X, then Y", "X happened" and
// "X did not happen" all resolve to the same variable.
const PROPS = [
  ...CONDITIONALS.flatMap((c) => [{ cond: c.cond, past: c.condPast, notPast: c.condNotPast }, { cond: c.res, past: c.resPast, notPast: c.resNotPast }]),
  ...CHAIN_CONDITIONALS.flatMap((t) => [t.a, t.b, t.c]),
];
function parseProp(s) {
  s = strip(s);
  let m;
  for (const p of PROPS) {
    if (s === p.past) return { v: p.cond, neg: false };
    if (s === p.notPast) return { v: p.cond, neg: true };
  }
  if ((m = s.match(/^If (.+?), then (.+)$/)) && PROPS.some((p) => p.cond === m[1]) && PROPS.some((p) => p.cond === m[2])) return { imp: [m[1], m[2]] };
  return null;
}
function propEntails(premises, conclusion) {
  const vars = [...new Set([...premises, conclusion].flatMap((p) => (p.imp ? p.imp : [p.v])))];
  const val = (p, env) => (p.imp ? !env[p.imp[0]] || env[p.imp[1]] : env[p.v] !== p.neg);
  let sat = false;
  for (let mask = 0; mask < (1 << vars.length); mask++) {
    const env = Object.fromEntries(vars.map((v, i) => [v, !!((mask >> i) & 1)]));
    if (!premises.every((p) => val(p, env))) continue;
    sat = true;
    if (!val(conclusion, env)) return false;
  }
  return sat;
}

// ---- orderings
function checkOrdering(item) {
  const lines = item.prompt.split('\n');
  const q = lines.pop();
  const pairs = [];
  const names = new Set();
  for (const l of lines) {
    let m;
    if ((m = l.match(/^(\w+) is (\w+) than (\w+) and than (\w+)\.$/))) { pairs.push([m[1], m[3], m[2]], [m[1], m[4], m[2]]); }
    else if ((m = l.match(/^(\w+) is (\w+) than (\w+), but (\w+) than (\w+)\.$/))) { pairs.push([m[1], m[3], m[2]], [m[5], m[1], m[2] === 'taller' ? 'taller' : m[2]]); }
    else if ((m = l.match(/^(\w+) is (\w+) than (\w+)\.$/))) pairs.push([m[1], m[3], m[2]]);
    else throw new Error(`unparsed ordering line: ${l}`);
  }
  // normalise "less" comparatives to "more": X is shorter than Y  ⇒  Y beats X
  const LESS = { shorter: 'taller', younger: 'older', slower: 'faster', lighter: 'heavier', poorer: 'richer' };
  const beats = pairs.map(([a, b, adj]) => (LESS[adj] ? [b, a] : [a, b]));
  for (const [a, b] of beats) { names.add(a); names.add(b); }
  const people = [...names];
  const perms = (arr) => (arr.length <= 1 ? [arr] : arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p])));
  const consistent = perms(people).filter((p) => beats.every(([a, b]) => p.indexOf(a) < p.indexOf(b)));
  assert.ok(consistent.length > 0, `${item.id}: statements are contradictory`);
  const m = q.match(/^Who is the (second )?(\w+)\?$/);
  assert.ok(m, `${item.id}: unparsed question ${q}`);
  const LEAST = { shortest: true, youngest: true, slowest: true, lightest: true, poorest: true };
  const pos = m[1] ? 1 : LEAST[m[2]] ? people.length - 1 : 0;
  const tops = new Set(consistent.map((p) => p[pos]));
  const answer = item.options[item.correctIndex];
  if (tops.size === 1) assert.equal(answer, [...tops][0], `${item.id}: determined order, wrong answer`);
  else assert.equal(answer, NONE, `${item.id}: undetermined order but answer ${answer}`);
}

const seeds = Array.from({ length: Number(process.env.SEEDS || 250) }, (_, i) => `logic-${i}`);

test('every logic item: the answer is entailed and no other option is, under both readings', () => {
  let classItems = 0, propItems = 0, orderItems = 0;
  for (const difficulty of [1, 2, 3, 4, 5, 6]) {
    for (const seed of seeds) {
      const item = generateItem({ family: 'logic', difficulty, seed });
      const answer = item.options[item.correctIndex];
      if (item.features.rule === 'ordering') { checkOrdering(item); orderItems++; continue; }
      const lines = item.prompt.split('\n');
      const isProp = lines[0].startsWith('If ');
      if (isProp) {
        const prem = lines.map(parseProp);
        assert.ok(prem.every(Boolean), `${item.id}: unparsed premise in ${item.prompt}`);
        const entailed = item.options.filter((o) => o !== NONE).filter((o) => { const p = parseProp(o); assert.ok(p, `${item.id}: unparsed option ${o}`); return propEntails(prem, p); });
        if (answer === NONE) assert.deepEqual(entailed, [], `${item.id}: ${entailed.join(' / ')} follows but answer is NONE`);
        else assert.deepEqual(entailed, [answer], `${item.id}: entailed options ${entailed.join(' / ')} vs answer ${answer}`);
        propItems++;
      } else {
        const prem = lines.map(parseClass);
        assert.ok(prem.every(Boolean), `${item.id}: unparsed premise in ${item.prompt}`);
        for (const importAll of [false, true]) {
          const entailed = item.options.filter((o) => o !== NONE).filter((o) => { const c = parseClass(o); return c ? classEntails(prem, c, importAll) : false; });
          if (answer === NONE) assert.deepEqual(entailed, [], `${item.id} (import ${importAll}): ${entailed.join(' / ')} follows but answer is NONE`);
          else assert.deepEqual(entailed, [answer], `${item.id} (import ${importAll}): entailed ${entailed.join(' / ')} vs answer ${answer}`);
        }
        classItems++;
      }
      // a premise is never offered as an option, and every distractor carries a note
      for (const o of item.options) assert.ok(!lines.map(strip).includes(o), `${item.id}: premise offered as option`);
      assert.equal(item.distractors.filter(Boolean).length, item.options.length - 1);
    }
  }
  assert.ok(classItems > 100 && propItems > 100 && orderItems > 100, `coverage ${classItems}/${propItems}/${orderItems}`);
});
