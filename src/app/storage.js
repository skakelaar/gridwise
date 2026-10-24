// Persistence layer. Every key is prefixed with `mrt.` and every localStorage call is wrapped in try/catch;
// when storage is unavailable the app falls back to an in-memory map so it keeps working for the session.
const PREFIX = 'mrt.';
const memory = new Map();
let warned = false;

export const KEYS = {
  attempts: 'attempts',   // attempt log, oldest first
  mistakes: 'mistakes',   // mistakes, oldest first (ids + seeds only)
  settings: 'settings',   // user settings
  adaptive: 'adaptive',   // practice personalisation state
  timed: 'timed',         // in-progress or last finished timed session
  challenge: 'challenge', // in-progress adaptive challenge
  challengeHistory: 'challengeHistory', // finished challenges, newest last (capped)
};

const MAX_CHALLENGES = 20;

const MAX_ATTEMPTS = 5000;

export const DEFAULT_SETTINGS = {
  personalise: false,
  practiceFamily: 'all',       // 'all' | 'group:<id>' | '<familyId>'
  practiceDifficulty: 'mixed', // 'mixed' | '1' | '2' | '3'
  timedCount: 15,
  timedMinutes: 12,
  timedFamily: 'all',
  timedDifficulty: 'mixed',
};

export const DEFAULT_ADAPTIVE = { level: 1, correctStreak: 0, wrongStreak: 0 };

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
    return true;
  } catch {
    warned = true;
    return false;
  }
}

function rawRemove(key) {
  memory.delete(key);
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    warned = true;
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
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- domain helpers

export function loadAttempts() {
  const list = read(KEYS.attempts, []);
  return Array.isArray(list) ? list : [];
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
  return Array.isArray(list) ? list : [];
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
  return { ...DEFAULT_SETTINGS, ...(stored && typeof stored === 'object' ? stored : {}) };
}

export function saveSettings(patch) {
  const next = { ...loadSettings(), ...patch };
  write(KEYS.settings, next);
  return next;
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
  return t && typeof t === 'object' && Array.isArray(t.items) ? t : null;
}

export function saveTimed(session) {
  write(KEYS.timed, session);
}

export function clearTimed() {
  remove(KEYS.timed);
}

export function loadChallenge() {
  const c = read(KEYS.challenge, null);
  return c && typeof c === 'object' && Array.isArray(c.items) ? c : null;
}

export function saveChallenge(c) {
  write(KEYS.challenge, c);
}

export function clearChallenge() {
  remove(KEYS.challenge);
}

export function loadChallengeHistory() {
  const list = read(KEYS.challengeHistory, []);
  return Array.isArray(list) ? list : [];
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
