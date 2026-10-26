import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMock, mockPuzzle, mockGoTo, mockAnswer, mockToggleFlag, finishMock, mockAttempts, mockProgress, MOCK_TIERS } from '../src/app/mocktest.js';
import { challengeReport, assessmentText } from '../src/app/challenge.js';
import { Rng } from '../src/engine/rng.js';

const seededRandom = (seed) => { const r = new Rng(seed); return () => r.float(); };

test('mock test: balanced slots, fixed levels from the tier, one clock', () => {
  const m = createMock({ count: 16, minutes: 8, tier: 'higher', now: 0, random: seededRandom('mk') });
  assert.equal(m.items.length, 16);
  assert.equal(m.endsAt, 8 * 60 * 1000);
  assert.ok(m.items.every((i) => MOCK_TIERS.higher.levels.includes(i.difficulty)));
  const matrices = m.items.filter((i) => !['series', 'logic', 'numeric', 'verbal'].includes(i.group)).length;
  assert.equal(matrices, 8);
  for (let i = 0; i < 16; i++) { mockGoTo(m, i, i * 1000); assert.ok(mockPuzzle(m).options.length >= 4); }
});

test('mock test: navigation, flags, changing answers, time accounting and report', () => {
  const m = createMock({ count: 8, minutes: 5, tier: 'standard', now: 0, random: seededRandom('mk2') });
  mockAnswer(m, (mockPuzzle(m).correctIndex + 1) % mockPuzzle(m).options.length);
  assert.equal(m.items[0].correct, false);
  mockAnswer(m, mockPuzzle(m).correctIndex); // change of mind
  assert.equal(m.items[0].correct, true);
  assert.equal(mockToggleFlag(m), true);
  mockGoTo(m, 3, 10000);
  assert.equal(m.items[0].ms, 10000);
  mockGoTo(m, 0, 15000);
  assert.equal(m.items[3].ms, 5000);
  assert.deepEqual(mockProgress(m), { answered: 1, flagged: [0], total: 8 });
  finishMock(m, 'finished', 20000);
  assert.equal(m.items[0].ms, 15000);
  const attempts = mockAttempts(m, 20000);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0].mode, 'mock');
  const r = challengeReport(m);
  assert.equal(r.format, 'mock');
  assert.equal(r.adaptive, false);
  assert.equal(r.answered, 1);
  assert.ok(assessmentText(r).join(' ').includes('Levels ranged'));
});
