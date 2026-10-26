// Mock test: a fixed set of questions, one overall clock, free navigation (previous / next / jump), questions
// can be flagged for later and answers changed until "I am finished" or the clock runs out. Not adaptive.
// Practice format only: it does not reproduce any publisher's test, timing, scoring or norms.
import { randomSeed, GROUPS, FAMILIES, FAMILY_IDS, ITEM_FAMILIES, ITEM_FAMILY_IDS } from '../engine/index.js';
import { puzzleFor, makeAttempt } from './session.js';

export const MOCK_TIERS = {
  standard: { id: 'standard', label: 'Standard (levels 2–3)', levels: [2, 3] },
  higher: { id: 'higher', label: 'Higher (levels 4–5)', levels: [4, 5] },
  master: { id: 'master', label: 'Master (levels 5–6)', levels: [5, 6] },
  mixed: { id: 'mixed', label: 'Mixed (levels 2–6)', levels: [2, 3, 4, 5, 6] },
};
export const MOCK_DEFAULTS = { count: 16, minutes: 8, tier: 'mixed' };

function shuffle(arr, random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Balanced slots: matrices for half the questions, the rest spread over the other question groups. */
export function createMock({ count = MOCK_DEFAULTS.count, minutes = MOCK_DEFAULTS.minutes, tier = MOCK_DEFAULTS.tier, now = Date.now(), random = Math.random } = {}) {
  const n = Math.min(40, Math.max(6, Math.round(Number(count) || MOCK_DEFAULTS.count)));
  const mins = Math.min(60, Math.max(1, Number(minutes) || MOCK_DEFAULTS.minutes));
  const levels = (MOCK_TIERS[tier] || MOCK_TIERS.mixed).levels;
  const matrixGroups = Object.keys(GROUPS);
  const itemGroups = ['series', 'logic', 'numeric', 'verbal'];
  const slots = [];
  const half = Math.ceil(n / 2);
  for (let i = 0; i < half; i++) slots.push(matrixGroups[i % matrixGroups.length]);
  for (let i = 0; i < n - half; i++) slots.push(itemGroups[i % itemGroups.length]);
  const items = shuffle(slots, random).map((group) => {
    const families = [...FAMILY_IDS.filter((id) => FAMILIES[id].group === group), ...ITEM_FAMILY_IDS.filter((id) => ITEM_FAMILIES[id].group === group)];
    const family = families[Math.floor(random() * families.length)];
    const difficulty = levels[Math.floor(random() * levels.length)];
    return { group, family, difficulty, seed: randomSeed(), chosenIndex: null, correct: null, flagged: false, ms: 0 };
  });
  return {
    kind: 'mock',
    id: `m${now.toString(36)}`,
    tier: (MOCK_TIERS[tier] || MOCK_TIERS.mixed).id,
    minutes: mins,
    items,
    index: 0,
    startedAt: now,
    endsAt: now + mins * 60 * 1000,
    viewedAt: now,
    finished: false,
    finishedAt: null,
    endedBy: null, // 'finished' | 'time'
  };
}

export function mockPuzzle(m, i = m.index) {
  return puzzleFor(m.items[i]);
}

/** Time spent on the current question is accumulated whenever the view changes. */
function clockOut(m, now) {
  const item = m.items[m.index];
  if (item) item.ms = (item.ms || 0) + Math.max(0, now - (m.viewedAt ?? now));
  m.viewedAt = now;
}

export function mockGoTo(m, i, now = Date.now()) {
  if (m.finished || i < 0 || i >= m.items.length) return m;
  clockOut(m, now);
  m.index = i;
  return m;
}

export function mockAnswer(m, chosenIndex) {
  if (m.finished) return m;
  const item = m.items[m.index];
  item.chosenIndex = chosenIndex;
  item.correct = chosenIndex === mockPuzzle(m).correctIndex;
  return m;
}

export function mockToggleFlag(m) {
  const item = m.items[m.index];
  item.flagged = !item.flagged;
  return item.flagged;
}

export function finishMock(m, endedBy, now = Date.now()) {
  if (m.finished) return m;
  clockOut(m, Math.min(now, m.endsAt));
  m.finished = true;
  m.finishedAt = Math.min(now, m.endsAt);
  m.endedBy = endedBy;
  return m;
}

/** Attempt records for the log (answered questions only), produced once at the end. */
export function mockAttempts(m, now = Date.now()) {
  return m.items.filter((i) => i.chosenIndex != null).map((i) => makeAttempt(puzzleFor(i), { chosenIndex: i.chosenIndex, correct: i.correct, ms: i.ms || null, mode: 'mock', at: now }));
}

export function mockProgress(m) {
  return { answered: m.items.filter((i) => i.chosenIndex != null).length, flagged: m.items.map((i, k) => (i.flagged ? k : -1)).filter((k) => k >= 0), total: m.items.length };
}
