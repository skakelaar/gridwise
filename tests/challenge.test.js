import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChallenge, challengeCurrent, challengeAnswer, challengeTimeout, catchUp, challengeReport, assessmentText, puzzleDeadline, CHALLENGE } from '../src/app/challenge.js';
import { Rng } from '../src/engine/rng.js';

const seededRandom = (seed) => { const r = new Rng(seed); return () => r.float(); };

test('challenge has twelve slots covering every rule group twice and starts at level 2', () => {
  const c = createChallenge({ now: 1000, random: seededRandom('a') });
  assert.equal(c.items.length, 12);
  const counts = {};
  for (const i of c.items) counts[i.group] = (counts[i.group] || 0) + 1;
  assert.deepEqual(Object.values(counts), [2, 2, 2, 2, 2, 2]);
  assert.equal(c.items[0].difficulty, 2);
  assert.equal(c.endsAt - c.startedAt, 12 * 60 * 1000);
  assert.equal(puzzleDeadline(c), 1000 + 60 * 1000);
});

test('staircase moves one level per answer within 1..4 and timeouts count as misses', () => {
  const c = createChallenge({ now: 0, random: seededRandom('b') });
  let now = 0;
  const answer = (correct) => {
    const { puzzle } = challengeCurrent(c);
    now += 5000;
    challengeAnswer(c, correct ? puzzle.correctIndex : (puzzle.correctIndex + 1) % 6, now);
  };
  answer(true); assert.equal(c.level, 3);
  answer(true); assert.equal(c.level, 4);
  answer(true); assert.equal(c.level, 5);
  answer(true); assert.equal(c.level, 6);
  answer(true); assert.equal(c.level, 6, 'capped at 6');
  answer(false); assert.equal(c.level, 5);
  now += 60000; challengeTimeout(c, now); assert.equal(c.level, 4);
  assert.equal(c.items[6].timedOut, true);
  answer(false); answer(false); answer(false); assert.equal(c.level, 1, 'floored at 1');
  answer(false); assert.equal(c.level, 1);
  assert.deepEqual(c.items.slice(0, 11).map((i) => i.difficulty), [2, 3, 4, 5, 6, 6, 5, 4, 3, 2, 1]);
  // finish the rest
  while (!c.finished) answer(true);
  assert.equal(c.endedBy, 'completed');
  const r = challengeReport(c);
  assert.equal(r.total, 12);
  assert.equal(r.answered, 11);
  assert.equal(r.timedOut, 1);
  assert.equal(r.highest, 6);
  assert.ok(assessmentText(r).join(' ').includes('small sample'));
});

test('mixed format: sixteen questions, thirty seconds each, items regenerate', () => {
  const c = createChallenge({ format: 'mixed', now: 0, random: seededRandom('m') });
  assert.equal(c.items.length, 16);
  assert.equal(c.endsAt, 8 * 60 * 1000);
  assert.equal(puzzleDeadline(c), 30 * 1000);
  const groups = c.items.map((i) => i.group);
  for (const g of ['series', 'logic', 'numeric', 'verbal']) assert.equal(groups.filter((x) => x === g).length, 2);
  assert.equal(groups.filter((g) => !['series', 'logic', 'numeric', 'verbal'].includes(g)).length, 8);
  let now = 0;
  while (!c.finished) { const { puzzle } = challengeCurrent(c); assert.ok(puzzle.options.length >= 4); now += 1000; challengeAnswer(c, puzzle.correctIndex, now); }
  const r = challengeReport(c);
  assert.equal(r.correct, 16);
  assert.equal(r.secondsPer, 30);
  assert.ok(r.groups.some((g) => g.id === 'verbal'));
});

test('catchUp applies elapsed timeouts after a reload and ends the challenge at the deadline', () => {
  const c = createChallenge({ now: 0, random: seededRandom('c') });
  catchUp(c, 2 * 60 * 1000 + 10);
  assert.equal(c.index, 2);
  assert.ok(c.items[0].timedOut && c.items[1].timedOut);
  assert.equal(c.level, 1);
  catchUp(c, 13 * 60 * 1000);
  assert.equal(c.finished, true);
  assert.equal(challengeReport(c).reached, 12);
  assert.equal(CHALLENGE.secondsPerPuzzle, 60);
});
