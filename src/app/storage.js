// Persistence layer. Every key is prefixed with `mrt.` and every localStorage call is wrapped in try/catch;
// when storage is unavailable the app falls back to an in-memory map so it keeps working for the session.
const PREFIX = 'mrt.';
const memory = new Map();
const pending = new Set(); // failed writes/deletions must shadow stale durable values
let warned = false;

export const KEYS = {
  attempts: 'attempts',   // attempt log, oldest first
  mistakes: 'mistakes',   // mistakes, oldest first (ids + seeds only)
  settings: 'settings',   // user settings
  adaptive: 'adaptive',   // practice personalisation state
  timed: 'timed',         // in-progress or last finished timed session
  challenge: 'challenge', // in-progress adaptive challenge
  challengeHistory: 'challengeHistory', // finished challenges, newest last (capped)
  mock: 'mock',                 // in-progress mock test
  mockHistory: 'mockHistory',   // finished mock tests, newest last (capped)
};

const MAX_CHALLENGES = 20;

const MAX_ATTEMPTS = 5000;

export const DEFAULT_SETTINGS = {
  practiceHints: true,
  practiceClock: 'off',
  testFormat: 'mock',
  personalise: false,
  practiceFamily: 'all',       // 'all' | 'group:<id>' | '<familyId>'
  practiceDifficulty: 'mixed', // 'mixed' | '1' | '2' | '3'
  timedCount: 15,
  timedMinutes: 12,
  timedFamily: 'all',
  timedDifficulty: 'mixed',
  mockCount: 16,
  mockMinutes: 8,
  mockTier: 'mixed',
};

export const DEFAULT_ADAPTIVE = { level: 3, correctStreak: 0, wrongStreak: 0 };

export function storageAvailable() {
  try {
    const k = `${PREFIX}__probe`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function rawGet(key) {
  if (pending.has(key)) return memory.get(key) ?? null;
  try {
    const v = localStorage.getItem(PREFIX + key);
    if (v != null) return v;
  } catch {
    warned = true;
  }
  return memory.has(key) ? memory.get(key) : null;
}

function rawSet(key, value) {
  memory.set(key, value);
  try {
    localStorage.setItem(PREFIX + key, value);
    pending.delete(key);
    return true;
  } catch {
    warned = true;
    pending.add(key);
    return false;
  }
}

function rawRemove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
    pending.delete(key);
  } catch {
    warned = true;
    pending.add(key);
  }
}

export function read(key, fallback) {
  const raw = rawGet(key);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  return rawSet(key, JSON.stringify(value));
}

export function remove(key) {
  rawRemove(key);
}

export function storageWarned() {
  return warned;
}

/** Remove every `mrt.` key (and the memory fallback). Returns true when localStorage could be cleared. */
export function clearAll() {
  memory.clear();
  for (const key of Object.values(KEYS)) pending.add(key);
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
    pending.clear();
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- domain helpers

function validSpec(s) {
  return s && typeof s.family === 'string' && typeof s.seed === 'string'
    && Number.isInteger(s.difficulty) && s.difficulty >= 1 && s.difficulty <= 6;
}

function validRecord(r) {
  return validSpec(r) && typeof r.puzzleId === 'string' && typeof r.at === 'string'
    && Number.isFinite(Date.parse(r.at));
}

function validSession(s, adaptive = false) {
  return s && Array.isArray(s.items) && s.items.length > 0 && s.items.every(i =>
    validSpec(i) || (adaptive && i && i.difficulty === null && typeof i.family === 'string' && typeof i.seed === 'string'))
    && Number.isInteger(s.index) && s.index >= 0 && s.index <= s.items.length
    && Number.isFinite(s.startedAt) && Number.isFinite(s.endsAt) && s.endsAt >= s.startedAt;
}

export function loadAttempts() {
  const list = read(KEYS.attempts, []);
  return Array.isArray(list) ? list.filter(validRecord) : [];
}

export function appendAttempt(attempt) {
  const list = loadAttempts();
  list.push(attempt);
  if (list.length > MAX_ATTEMPTS) list.splice(0, list.length - MAX_ATTEMPTS);
  write(KEYS.attempts, list);
  return list;
}

export function loadMistakes() {
  const list = read(KEYS.mistakes, []);
  return Array.isArray(list) ? list.filter(validRecord) : [];
}

/** Insert or refresh a mistake entry; one entry per puzzle id. */
export function upsertMistake(mistake) {
  const list = loadMistakes().filter((m) => m.puzzleId !== mistake.puzzleId);
  list.push(mistake);
  write(KEYS.mistakes, list);
  return list;
}

export function removeMistake(puzzleId) {
  const list = loadMistakes().filter((m) => m.puzzleId !== puzzleId);
  write(KEYS.mistakes, list);
  return list;
}

export function findMistake(puzzleId) {
  return loadMistakes().find((m) => m.puzzleId === puzzleId) || null;
}

export function loadSettings() {
  const stored = read(KEYS.settings, {});
  const next = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== 'object') return next;
  for (const key of Object.keys(next)) {
    const value = stored[key];
    if (key === 'testFormat') { if (['mock', 'challenge', 'timed'].includes(value)) next[key] = value; }
    else if (key === 'mockTier') { if (['standard', 'higher', 'master', 'mixed'].includes(value)) next[key] = value; }
    else if (key.endsWith('Difficulty')) { if (['mixed', '1', '2', '3', '4', '5', '6'].includes(String(value))) next[key] = String(value); }
    else if (key === 'practiceClock') { if (['off', '30', '45', '60', '90'].includes(String(value))) next[key] = String(value); }
    else if (key.endsWith('Count')) { if (Number.isInteger(value) && value >= 5 && value <= 40) next[key] = value; }
    else if (key.endsWith('Minutes')) { if (Number.isFinite(value) && value >= 1 && value <= 60) next[key] = value; }
    else if (typeof value === typeof next[key]) next[key] = value;
  }
  return next;
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  write(KEYS.settings, next);
  return loadSettings();
}

export function loadAdaptive() {
  const stored = read(KEYS.adaptive, {});
  return { ...DEFAULT_ADAPTIVE, ...(stored && typeof stored === 'object' ? stored : {}) };
}

export function saveAdaptive(state) {
  write(KEYS.adaptive, state);
  return state;
}

export function loadTimed() {
  const t = read(KEYS.timed, null);
  return validSession(t) ? t : null;
}

export function saveTimed(session) {
  write(KEYS.timed, session);
}

export function clearTimed() {
  remove(KEYS.timed);
}

export function loadChallenge() {
  const c = read(KEYS.challenge, null);
  return validSession(c, true) ? c : null;
}

export function saveChallenge(c) {
  write(KEYS.challenge, c);
}

export function clearChallenge() {
  remove(KEYS.challenge);
}

export function loadChallengeHistory() {
  const list = read(KEYS.challengeHistory, []);
  return Array.isArray(list) ? list.filter(c => validSession(c, true)) : [];
}

/** Store a finished challenge so its report can be reopened later. */
export function archiveChallenge(c) {
  const list = loadChallengeHistory().filter((x) => x.id !== c.id);
  list.push(c);
  while (list.length > MAX_CHALLENGES) list.shift();
  write(KEYS.challengeHistory, list);
}

export function findChallenge(id) {
  return loadChallengeHistory().find((x) => x.id === id) || null;
}

export function loadMock() {
  const m = read(KEYS.mock, null);
  return validSession(m) ? m : null;
}
export function saveMock(m) { write(KEYS.mock, m); }
export function clearMock() { remove(KEYS.mock); }
export function loadMockHistory() { const list = read(KEYS.mockHistory, []); return Array.isArray(list) ? list.filter(m => validSession(m)) : []; }
export function archiveMock(m) {
  const list = loadMockHistory().filter((x) => x.id !== m.id);
  list.push(m);
  while (list.length > MAX_CHALLENGES) list.shift();
  write(KEYS.mockHistory, list);
}
export function findMock(id) { return loadMockHistory().find((x) => x.id === id) || null; }
