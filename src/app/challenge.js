// Adaptive 12-in-12 challenge: twelve puzzles, sixty seconds each, difficulty moving one level up after a
// correct answer and one level down after an incorrect answer or a timeout (a transparent 1-up/1-down
// staircase). This is a practice format; it does not reproduce any publisher's adaptive algorithm, item bank,
// scoring or norms. Pure state functions, serialisable (ids and seeds only), no DOM.
import { randomSeed, GROUPS, FAMILIES, FAMILY_IDS, MAX_DIFFICULTY } from '../engine/index.js';
import { puzzleFor, makeAttempt } from './session.js';

export const CHALLENGE = {
  count: 12,
  secondsPerPuzzle: 60,
  startLevel: 2,
  minLevel: 1,
  maxLevel: MAX_DIFFICULTY,
};

export const CHALLENGE_RULE = 'You start at level 2. Each correct answer moves the next puzzle one level up (to a maximum of 4); each incorrect answer or timeout moves it one level down (to a minimum of 1). Every puzzle has its own 60-second clock, so the whole challenge lasts at most 12 minutes.';

function shuffle(arr, random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Twelve slots: every rule group twice, in a shuffled order, each with its own seed. The level is decided as play proceeds. */
export function createChallenge({ now = Date.now(), random = Math.random } = {}) {
  const groups = Object.keys(GROUPS);
  const slots = shuffle([...groups, ...groups], random);
  const items = slots.map((group) => {
    const families = FAMILY_IDS.filter((id) => FAMILIES[id].group === group);
    const family = families[Math.floor(random() * families.length)];
    return { group, family, seed: randomSeed(), difficulty: null, chosenIndex: null, correct: null, ms: null, timedOut: false, level: null };
  });
  const c = {
    kind: 'challenge',
    id: `c${now.toString(36)}`,
    items,
    index: 0,
    level: CHALLENGE.startLevel,
    startedAt: now,
    endsAt: now + CHALLENGE.count * CHALLENGE.secondsPerPuzzle * 1000,
    puzzleStartedAt: now,
    finished: false,
    finishedAt: null,
    endedBy: null, // 'completed' | 'time' | 'stopped'
  };
  assignLevel(c);
  return c;
}

function assignLevel(c) {
  const item = c.items[c.index];
  if (item && item.difficulty == null) { item.difficulty = c.level; item.level = c.level; }
}

export function puzzleDeadline(c) {
  return Math.min(c.endsAt, c.puzzleStartedAt + CHALLENGE.secondsPerPuzzle * 1000);
}

export function challengeCurrent(c) {
  if (c.finished || c.index >= c.items.length) return null;
  assignLevel(c);
  const item = c.items[c.index];
  return { item, puzzle: puzzleFor(item) };
}

function stepLevel(c, correct) {
  c.level = correct ? Math.min(CHALLENGE.maxLevel, c.level + 1) : Math.max(CHALLENGE.minLevel, c.level - 1);
}

function advance(c, now) {
  c.index += 1;
  c.puzzleStartedAt = now;
  if (c.index >= c.items.length) finishChallenge(c, 'completed', now);
  else assignLevel(c);
}

/** Record the answer for the current puzzle, move the level and advance. Returns the attempt record. */
export function challengeAnswer(c, chosenIndex, now = Date.now()) {
  const cur = challengeCurrent(c);
  if (!cur) return null;
  const { item, puzzle } = cur;
  item.chosenIndex = chosenIndex;
  item.correct = chosenIndex === puzzle.correctIndex;
  item.ms = Math.max(0, now - c.puzzleStartedAt);
  const attempt = makeAttempt(puzzle, { chosenIndex, correct: item.correct, ms: item.ms, mode: 'challenge', at: now });
  stepLevel(c, item.correct);
  advance(c, now);
  return attempt;
}

/** The current puzzle's 60 seconds ran out: unanswered, counted as a miss for the staircase. */
export function challengeTimeout(c, now = Date.now()) {
  const cur = challengeCurrent(c);
  if (!cur) return;
  cur.item.timedOut = true;
  cur.item.ms = CHALLENGE.secondsPerPuzzle * 1000;
  stepLevel(c, false);
  advance(c, now);
}

/** Apply any timeouts that elapsed while the page was away (reload or background tab). */
export function catchUp(c, now = Date.now()) {
  let changed = false;
  while (!c.finished && now >= puzzleDeadline(c)) {
    const deadline = puzzleDeadline(c);
    challengeTimeout(c, deadline);
    changed = true;
  }
  return changed;
}

export function finishChallenge(c, endedBy, now = Date.now()) {
  if (c.finished) return c;
  c.finished = true;
  c.finishedAt = Math.min(now, c.endsAt);
  c.endedBy = endedBy;
  return c;
}

/** Everything the report needs, computed from the stored items. */
export function challengeReport(c) {
  const items = c.items;
  const reached = items.filter((i) => i.difficulty != null);
  const answered = reached.filter((i) => i.chosenIndex != null);
  const correct = answered.filter((i) => i.correct);
  const timedOut = reached.filter((i) => i.timedOut).length;
  const notReached = items.length - reached.length;
  const levels = reached.map((i) => i.difficulty);
  const highest = levels.length ? Math.max(...levels) : null;
  const avgMs = answered.length ? Math.round(answered.reduce((s, i) => s + i.ms, 0) / answered.length) : null;
  const groups = Object.keys(GROUPS).map((g) => {
    const gi = reached.filter((i) => i.group === g);
    const ga = gi.filter((i) => i.chosenIndex != null);
    return { id: g, label: GROUPS[g].label, attempted: gi.length, correct: ga.filter((i) => i.correct).length, answered: ga.length };
  });
  const strongest = groups.filter((g) => g.answered > 0 && g.correct === g.answered).map((g) => g.label);
  const weakest = groups.filter((g) => g.attempted > 0 && g.correct === 0).map((g) => g.label);
  return {
    total: items.length,
    reached: reached.length,
    notReached,
    answered: answered.length,
    correct: correct.length,
    wrong: answered.length - correct.length,
    timedOut,
    usedMs: Math.max(0, (c.finishedAt ?? Date.now()) - c.startedAt),
    limitMs: c.endsAt - c.startedAt,
    avgMs,
    levels,
    finalLevel: c.level,
    highest,
    correctAtHighest: highest == null ? 0 : reached.filter((i) => i.difficulty === highest && i.correct).length,
    groups,
    strongest,
    weakest,
    endedBy: c.endedBy,
  };
}

/** Plain-language assessment built only from the numbers above (no norms, no external scale). */
export function assessmentText(r) {
  const parts = [];
  parts.push(`You answered ${r.correct} of ${r.total} puzzles correctly${r.timedOut ? ` and ${r.timedOut} timed out` : ''}${r.notReached ? `; ${r.notReached} were not reached` : ''}.`);
  if (r.highest != null) {
    parts.push(`The staircase took you as high as level ${r.highest} (${['', 'Basic', 'Intermediate', 'Advanced', 'Expert'][r.highest]}), where you were correct on ${r.correctAtHighest} of ${r.levels.filter((l) => l === r.highest).length} puzzle${r.levels.filter((l) => l === r.highest).length === 1 ? '' : 's'}, and it finished at level ${r.finalLevel}.`);
  }
  if (r.avgMs != null) parts.push(`Your average time per answered puzzle was ${Math.round(r.avgMs / 1000)} seconds of the 60 available.`);
  if (r.strongest.length) parts.push(`Every puzzle was correct in: ${r.strongest.join(', ')}.`);
  if (r.weakest.length) parts.push(`No puzzle was correct in: ${r.weakest.join(', ')}. Those are the groups to practise next.`);
  parts.push('Twelve puzzles is a small sample, so treat this as a snapshot of one sitting rather than a measure of ability.');
  return parts;
}
