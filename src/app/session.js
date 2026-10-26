// Session state: which puzzle is up, what the user did, and how the next puzzle is chosen.
// No DOM and no storage here; the app layer only calls generatePuzzle from the engine.
import { generateAny, randomSeed, FAMILY_IDS, FAMILIES, ITEM_FAMILY_IDS, ITEM_FAMILIES, ALL_GROUPS, familyInfo } from '../engine/index.js';

export const RECENT_WINDOW = 30; // attempts counted as "recent" by practice personalisation

// ---------------------------------------------------------------- family / difficulty selection

/** Resolve a filter value ('all', 'group:<id>' or a family id) into a list of family ids. */
export function familiesForFilter(filter) {
  if (!filter || filter === 'all') return FAMILY_IDS.slice();
  if (filter === 'everything') return [...FAMILY_IDS, ...ITEM_FAMILY_IDS];
  if (filter === 'items') return ITEM_FAMILY_IDS.slice();
  if (filter.startsWith('group:')) {
    const g = filter.slice(6);
    const ids = [...FAMILY_IDS.filter((id) => FAMILIES[id].group === g), ...ITEM_FAMILY_IDS.filter((id) => ITEM_FAMILIES[id].group === g)];
    return ids.length ? ids : FAMILY_IDS.slice();
  }
  return familyInfo(filter) ? [filter] : FAMILY_IDS.slice();
}

export function describeFilter(filter) {
  if (!filter || filter === 'all') return 'All matrix families';
  if (filter === 'everything') return 'Everything (matrices and other question types)';
  if (filter === 'items') return 'All other question types';
  if (filter.startsWith('group:')) return ALL_GROUPS[filter.slice(6)]?.label || 'All matrix families';
  return familyInfo(filter)?.label || 'All matrix families';
}

function weightedPick(items, weights, random) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Choose the next puzzle spec. With personalisation on, this implements the contract heuristic:
 * family probability ∝ (1 + recent mistakes in that family); difficulty is the adaptive level.
 */
export function chooseSpec({ filter, difficulty, personalise, attempts = [], adaptive, random = Math.random }) {
  const families = familiesForFilter(filter);
  let family;
  if (personalise) {
    const recent = attempts.slice(-RECENT_WINDOW);
    const weights = families.map((f) => 1 + recent.filter((a) => a.family === f && a.chosenIndex != null && !a.correct).length);
    family = weightedPick(families, weights, random);
  } else {
    family = families[Math.floor(random() * families.length)];
  }
  let level;
  if (personalise && adaptive) level = adaptive.level;
  else if (difficulty === 'mixed' || difficulty == null) level = 1 + Math.floor(random() * 4);
  else level = Number(difficulty);
  level = Math.min(4, Math.max(1, level || 1));
  return { family, difficulty: level, seed: randomSeed() };
}

/** Streak bookkeeping for personalisation: up after 3 consecutive correct, down after 2 consecutive mistakes. */
export function updateAdaptive(adaptive, correct) {
  const a = { level: 1, correctStreak: 0, wrongStreak: 0, ...adaptive };
  if (correct) {
    a.correctStreak += 1;
    a.wrongStreak = 0;
    if (a.correctStreak >= 3) {
      if (a.level < 4) a.level += 1;
      a.correctStreak = 0;
    }
  } else {
    a.wrongStreak += 1;
    a.correctStreak = 0;
    if (a.wrongStreak >= 2) {
      if (a.level > 1) a.level -= 1;
      a.wrongStreak = 0;
    }
  }
  return a;
}

// ---------------------------------------------------------------- single-puzzle session (guided / untimed / review)

export function startPuzzle({ mode, spec, now = Date.now(), original = null }) {
  const puzzle = generateAny(spec);
  return {
    mode,                  // 'guided' | 'untimed' | 'review'
    spec: { family: puzzle.family, difficulty: puzzle.difficulty, seed: puzzle.seed },
    puzzle,
    startedAt: now,
    selected: null,
    hintsUsed: 0,
    revealed: false,
    answered: null,        // { chosenIndex, correct, ms }
    original,              // review mode: the stored mistake { chosenIndex, at, ... }
  };
}

export function selectOption(session, index) {
  if (session.answered || session.revealed) return session;
  session.selected = index;
  return session;
}

export function revealHint(session) {
  const total = session.puzzle.hints.length;
  if (session.hintsUsed < total) session.hintsUsed += 1;
  return session;
}

export function revealSolution(session) {
  session.revealed = true;
  session.selected = null;
  return session;
}

/** Submit the selected option. Returns the attempt record (or null when nothing is selected). */
export function submitAnswer(session, now = Date.now()) {
  if (session.answered || session.revealed || session.selected == null) return null;
  const { puzzle } = session;
  const chosenIndex = session.selected;
  const correct = chosenIndex === puzzle.correctIndex;
  const ms = Math.max(0, now - session.startedAt);
  session.answered = { chosenIndex, correct, ms };
  return makeAttempt(puzzle, { chosenIndex, correct, ms, hintsUsed: session.hintsUsed, mode: session.mode, at: now });
}

export function makeAttempt(puzzle, { chosenIndex, correct, ms, hintsUsed = 0, mode, at }) {
  return {
    puzzleId: puzzle.id,
    family: puzzle.family,
    group: puzzle.group,
    difficulty: puzzle.difficulty,
    seed: puzzle.seed,
    correct: !!correct,
    chosenIndex,
    correctIndex: puzzle.correctIndex,
    ms,
    hintsUsed,
    mode,
    at: new Date(at).toISOString(),
  };
}

export function makeMistake(puzzle, { chosenIndex, at, mode }) {
  return {
    puzzleId: puzzle.id,
    family: puzzle.family,
    group: puzzle.group,
    difficulty: puzzle.difficulty,
    seed: puzzle.seed,
    chosenIndex,
    correctIndex: puzzle.correctIndex,
    mode,
    at: new Date(at).toISOString(),
  };
}

// ---------------------------------------------------------------- timed sessions (serialisable: ids and seeds only)

export function createTimedSession({ count, minutes, filter = 'all', difficulty = 'mixed', now = Date.now(), random = Math.random }) {
  const n = Math.min(40, Math.max(5, Math.round(Number(count) || 15)));
  const mins = Math.min(60, Math.max(1, Number(minutes) || 12));
  const items = [];
  for (let i = 0; i < n; i++) {
    const spec = chooseSpec({ filter, difficulty, personalise: false, random });
    items.push({ ...spec, chosenIndex: null, correct: null, ms: null, skipped: false });
  }
  return {
    count: n,
    minutes: mins,
    filter,
    difficulty,
    items,
    index: 0,
    startedAt: now,
    endsAt: now + mins * 60 * 1000,
    puzzleStartedAt: now,
    finished: false,
    finishedAt: null,
    endedBy: null, // 'completed' | 'time' | 'stopped'
  };
}

const puzzleCache = new Map();

/** Regenerate (and cache) the puzzle for a stored spec. */
export function puzzleFor(spec) {
  const key = `${spec.family}|${spec.difficulty}|${spec.seed}`;
  if (!puzzleCache.has(key)) puzzleCache.set(key, generateAny({ family: spec.family, difficulty: spec.difficulty, seed: spec.seed }));
  return puzzleCache.get(key);
}

export function timedCurrent(t) {
  if (t.finished || t.index >= t.items.length) return null;
  return { item: t.items[t.index], puzzle: puzzleFor(t.items[t.index]) };
}

/** Record the answer for the current timed puzzle and advance. Returns the attempt record. */
export function timedAnswer(t, chosenIndex, now = Date.now()) {
  const cur = timedCurrent(t);
  if (!cur) return null;
  const { item, puzzle } = cur;
  item.chosenIndex = chosenIndex;
  item.correct = chosenIndex === puzzle.correctIndex;
  item.ms = Math.max(0, now - t.puzzleStartedAt);
  const attempt = makeAttempt(puzzle, { chosenIndex, correct: item.correct, ms: item.ms, mode: 'timed', at: now });
  timedAdvance(t, now);
  return attempt;
}

export function timedSkip(t, now = Date.now()) {
  const cur = timedCurrent(t);
  if (!cur) return;
  cur.item.skipped = true;
  timedAdvance(t, now);
}

function timedAdvance(t, now) {
  t.index += 1;
  t.puzzleStartedAt = now;
  if (t.index >= t.items.length) finishTimed(t, 'completed', now);
}

export function finishTimed(t, endedBy, now = Date.now()) {
  if (t.finished) return t;
  t.finished = true;
  t.finishedAt = Math.min(now, t.endsAt);
  t.endedBy = endedBy;
  return t;
}

export function timedSummary(t) {
  const answered = t.items.filter((i) => i.chosenIndex != null);
  const correct = answered.filter((i) => i.correct).length;
  const usedMs = Math.max(0, (t.finishedAt ?? Date.now()) - t.startedAt);
  return {
    total: t.items.length,
    answered: answered.length,
    correct,
    wrong: answered.length - correct,
    unanswered: t.items.length - answered.length,
    usedMs,
    limitMs: t.minutes * 60 * 1000,
    endedBy: t.endedBy,
  };
}
