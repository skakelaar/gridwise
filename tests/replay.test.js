import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateAny, FAMILY_IDS, ITEM_FAMILY_IDS } from '../src/engine/index.js';
import { SET_PALETTES } from '../src/engine/shapes.js';
import { SPLIT_VARIANTS } from '../src/engine/global.js';
import { renderCell, snapshotCell } from '../src/render/svg.js';
import { capturePuzzle, savedPuzzle, requireSavedPuzzle, replayStatus, protectSession, SNAPSHOT_VERSION } from '../src/app/replay.js';
import * as session from '../src/app/session.js';
import * as mock from '../src/app/mocktest.js';
import * as challenge from '../src/app/challenge.js';
import * as storage from '../src/app/storage.js';
import * as ui from '../src/app/ui.js';
import { installDOM } from './support/dom.js';

const clone = value => JSON.parse(JSON.stringify(value));
const old = JSON.parse(readFileSync(new URL('./fixtures/rotation-1-audit-185.json', import.meta.url)));
const result = { chosenIndex: 0, correct: false, ms: 4000, mode: 'untimed', at: 0 };
const legacy = { puzzleId: old.id, family: old.family, difficulty: old.difficulty, seed: old.seed,
  group: old.group, correctIndex: old.correctIndex, ...result, at: new Date(0).toISOString() };

// Actual pre-audit fixture: same seed now produces answer 3 instead of answer 2.
test('historical reproduction: a seed changes the question and answer; snapshots replay the original', () => {
  const current = generateAny(old);
  assert.equal(old.correctIndex, 1);
  // Do not pin today's answer position: future generators may change it again.
  assert.notDeepEqual(current.options, old.options);
  const record = clone(session.makeMistake(old, result));
  const reviewed = session.startPuzzle({ mode: 'review', spec: old, original: record });
  assert.deepEqual(reviewed.puzzle.options, old.options);
  assert.deepEqual(reviewed.puzzle.cells, old.cells);
  assert.deepEqual(reviewed.puzzle.explanation, old.explanation);
  assert.equal(reviewed.puzzle.correctIndex, 1);
  session.selectOption(reviewed, 1);
  assert.equal(session.submitAnswer(reviewed, 5000).correct, true);
  assert.equal(savedPuzzle(legacy), null);
  assert.throws(() => session.startPuzzle({ mode: 'review', spec: old, original: legacy }), /predates/);
});

test('all families and levels retain question, options, answer, descriptions, hints and explanations through JSON', () => {
  for (const family of [...FAMILY_IDS, ...ITEM_FAMILY_IDS]) for (let difficulty = 1; difficulty <= 6; difficulty++) {
    const puzzle = generateAny({ family, difficulty, seed: 'snapshot-roundtrip' });
    const record = clone(session.makeAttempt(puzzle, result));
    assert.equal(replayStatus(record), 'available', `${family}/${difficulty}`);
    const restored = savedPuzzle(record);
    for (const field of ['correctIndex', 'question', 'prompt', 'description', 'explanation', 'hints', 'distractors', 'features']) {
      assert.deepEqual(restored[field], puzzle[field], `${family}/${difficulty}/${field}`);
    }
    assert.deepEqual(restored.options, puzzle.kind === 'item' ? puzzle.options : puzzle.options.map(snapshotCell));
    if (puzzle.cells) assert.deepEqual(restored.cells, puzzle.cells.map(snapshotCell));
  }
});

test('snapshot data is detached on capture and replay; its identity distinguishes different content at the same seed', () => {
  const original = clone(old);
  const record = session.makeAttempt(original, result);
  original.options.reverse(); original.explanation.summary = 'changed';
  const view = savedPuzzle(record);
  view.options.reverse(); view.hints.push('changed');
  assert.deepEqual(savedPuzzle(record).options, old.options);
  assert.deepEqual(savedPuzzle(record).hints, old.hints);
  assert.equal(session.makeMistake(savedPuzzle(record), result).puzzleId, record.puzzleId);
  assert.notEqual(session.makeAttempt(generateAny(old), result).puzzleId, record.puzzleId);
});

test('retired families replay without consulting the current generator', () => {
  const retired = { ...old, family: 'retired-family' };
  assert.throws(() => generateAny(retired), /unknown family/);
  assert.equal(savedPuzzle(session.makeAttempt(retired, result)).family, 'retired-family');
});

test('unknown versions, damaged payloads and mismatched metadata fail closed without seed fallback', () => {
  const good = session.makeAttempt(old, result);
  for (const change of [r => r.snapshot = null, r => r.snapshot.version = 99,
    r => r.snapshot.puzzle.options.reverse(), r => r.snapshot.puzzle.correctIndex = 999,
    r => r.snapshot.puzzle.explanation.summary = 'changed', r => r.seed = 'another-seed',
    r => r.puzzleId = 'another-id', r => r.correctIndex = 99]) {
    const record = clone(good); change(record);
    assert.notEqual(replayStatus(record), 'available');
    assert.equal(savedPuzzle(record), null);
    assert.throws(() => session.puzzleFor(record));
  }
});

test('engine-owned dot and partition geometry is frozen in saved cells', () => {
  const dots = { kind: 'set', palette: 'dots', members: [SET_PALETTES.dots.elements[0]] };
  const [sections, variants] = Object.entries(SPLIT_VARIANTS)[0];
  const partition = { kind: 'split', sections: Number(sections), variant: variants[0].id };
  const frozenDots = snapshotCell(dots), frozenPartition = snapshotCell(partition);
  const dotDrawing = renderCell(frozenDots), partitionDrawing = renderCell(frozenPartition);
  const elements = [...SET_PALETTES.dots.elements], lines = clone(variants[0].lines);
  try {
    SET_PALETTES.dots.elements.reverse(); variants[0].lines = [];
    assert.notEqual(renderCell(dots), dotDrawing);
    assert.notEqual(renderCell(partition), partitionDrawing);
    assert.equal(renderCell(frozenDots), dotDrawing);
    assert.equal(renderCell(frozenPartition), partitionDrawing);
  } finally {
    SET_PALETTES.dots.elements.splice(0, elements.length, ...elements);
    variants[0].lines = lines;
  }
});

test('fixed sessions save all assigned questions before first display, and reload grades their saved answers', () => {
  const t = clone(session.createTimedSession({ count: 5, minutes: 1, filter: 'series', difficulty: 2, now: 0 }));
  const m = clone(mock.createMock({ count: 6, minutes: 1, now: 0 }));
  for (const state of [t, m]) {
    assert.equal(state.snapshotVersion, SNAPSHOT_VERSION);
    assert.ok(state.items.every(i => replayStatus(i) === 'available'));
    assert.equal(protectSession(state, 10).finished, false);
  }
  // Substitute a real historic question whose current generated answer differs.
  t.items[0] = { ...legacy, snapshot: capturePuzzle(old), puzzleId: capturePuzzle(old).key, chosenIndex: null };
  m.items[0] = clone(t.items[0]);
  assert.equal(session.timedAnswer(t, 1, 100).correct, true);
  mock.mockAnswer(m, 1, 100);
  mock.finishMock(m, 'finished', 200);
  assert.equal(m.items[0].correct, true);
  assert.equal(mock.mockAttempts(m, 200)[0].correctIndex, 1);
});

test('adaptive challenges snapshot at level assignment and never regenerate earlier slots', () => {
  let c = challenge.createChallenge({ format: 'mixed', now: 0 });
  assert.equal(replayStatus(c.items[0]), 'available');
  assert.ok(c.items.slice(1).every(i => i.difficulty === null && !Object.hasOwn(i, 'snapshot')));
  const first = clone(c.items[0].snapshot);
  c = clone(c);
  assert.equal(protectSession(c, 100).finished, false);
  challenge.challengeAnswer(c, challenge.challengeCurrent(c).puzzle.correctIndex, 100);
  assert.equal(replayStatus(c.items[1]), 'available');
  assert.deepEqual(c.items[0].snapshot, first);
  assert.equal(c.items[1].difficulty, 4);
  assert.equal(c.items[2].difficulty, null);
});

test('legacy active sessions end before catch-up or grading, retaining answers and staircase', () => {
  for (const kind of ['timed', 'mock', 'challenge']) {
    const c = { kind, id: 'legacy', items: [{ ...legacy, ms: 17 }], index: 0, startedAt: 0,
      endsAt: 60000, puzzleStartedAt: 0, level: 3, finished: false };
    const items = clone(c.items);
    protectSession(c, 70000);
    assert.equal(c.finished, true);
    assert.equal(c.endedBy, 'unavailable');
    assert.equal(c.finishedAt, 60000);
    assert.equal(challenge.catchUp(c, 70000), false);
    assert.deepEqual(c.items, items);
    assert.equal(c.level, 3);
    protectSession(c, 90000);
    assert.equal(c.finishedAt, 60000);
    if (kind === 'mock') {
      const attempt = mock.mockAttempts(c, 70000)[0];
      assert.equal(attempt.correct, legacy.correct);
      assert.equal(attempt.correctIndex, legacy.correctIndex);
      assert.equal(replayStatus(attempt), 'legacy');
    }
  }
});

test('unsupported session versions and partial snapshots cannot resume; finished histories remain unchanged', () => {
  const state = session.createTimedSession({ count: 5, minutes: 1, filter: 'series', now: 0 });
  for (const mutate of [s => s.snapshotVersion = 99, s => delete s.items[3].snapshot, s => s.items[0].snapshot.version = 99]) {
    const c = clone(state); mutate(c);
    protectSession(c, 10); assert.equal(c.endedBy, 'unavailable');
  }
  const completed = { ...state, finished: true, endedBy: 'time', finishedAt: 60000 };
  delete completed.items[0].snapshot;
  assert.deepEqual(protectSession(clone(completed)), completed);
  const futureItem = clone(state.items[1]);
  futureItem.snapshot.version = 99;
  futureItem.chosenIndex = 0;
  futureItem.correct = false;
  const futureAttempt = mock.mockAttempts({ id: 'future', items: [futureItem] }, 100)[0];
  assert.equal(futureAttempt.puzzleId, futureItem.snapshot.key);
  assert.deepEqual(futureAttempt.snapshot, futureItem.snapshot);
});

test('storage round trips snapshots and retains legacy history without inventing snapshots', () => {
  const data = new Map();
  globalThis.localStorage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v),
    removeItem: k => data.delete(k), get length() { return data.size; }, key: i => [...data.keys()][i] };
  storage.clearAll();
  const attempt = session.makeAttempt(old, result), mistake = session.makeMistake(old, result);
  storage.appendAttempt(legacy); storage.appendAttempt(attempt);
  storage.upsertMistake(legacy); storage.upsertMistake(mistake);
  assert.equal(storage.loadMistakes().length, 2);
  assert.deepEqual(storage.loadAttempts(), [legacy, attempt]);
  assert.deepEqual(storage.findMistake(mistake.puzzleId), mistake);
  const state = { items: [legacy], index: 0, startedAt: 0, endsAt: 60000, finished: false };
  for (const [save, load] of [[storage.saveTimed, storage.loadTimed], [storage.saveMock, storage.loadMock], [storage.saveChallenge, storage.loadChallenge]]) {
    save(state);
    const stopped = load();
    assert.equal(stopped.endedBy, 'unavailable');
    assert.deepEqual(stopped.items, state.items);
    assert.deepEqual(load(), stopped);
  }
  storage.clearAll();
});

test('legacy UI distinguishes unavailable history from a question never reached and retains recorded result', () => {
  installDOM();
  const screen = ui.renderReplayUnavailable(legacy, '#/results/mistakes').textContent;
  assert.match(screen, /predates saved question snapshots/);
  assert.match(screen, /has not been re-marked/);
  assert.match(screen, /Recorded answer key: option 2/);
  assert.doesNotMatch(screen, /never presented/);
  const c = { kind: 'mock', tier: 'mixed', minutes: 1, items: [legacy], startedAt: 0, endsAt: 60000,
    finishedAt: 60000, finished: true, endedBy: 'time' };
  const report = ui.renderChallengeReport({ challenge: c, report: challenge.challengeReport(c), puzzles: [null] }).textContent;
  assert.match(report, /Replay unavailable/);
  assert.match(report, /has not been re-marked/);
  assert.match(report, /2 \(recorded\)/);
  assert.doesNotMatch(report, /never presented/);
  assert.match(ui.renderStorageNotice().textContent, /may be lost when you reload/);
});
