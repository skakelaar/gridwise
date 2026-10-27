// Saved questions are data, never instructions to run the current generator.
// Version 1 is a permanent wire contract. Add a reader for a new version rather
// than changing the meaning of this one; unknown versions fail closed.
import { snapshotCell } from '../render/svg.js';

export const SNAPSHOT_VERSION = 1;
const copy = value => JSON.parse(JSON.stringify(value));

// Content identity and accidental-corruption check, not a security signature.
function fingerprint(text) {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return `${(a >>> 0).toString(16)}${(b >>> 0).toString(16).padStart(8, '0')}`;
}

export function capturePuzzle(puzzle) {
  // Verification traces are diagnostic, not part of the question or solution.
  const { verification, ...data } = puzzle;
  const p = copy(data);
  if (p.kind !== 'item') {
    p.cells = p.cells.map(snapshotCell);
    p.options = p.options.map(snapshotCell);
  }
  const key = `${p.id}~v${SNAPSHOT_VERSION}~${fingerprint(JSON.stringify(p))}`;
  return { version: SNAPSHOT_VERSION, key, puzzle: p };
}

export function replayStatus(record) {
  if (!record || !Object.hasOwn(record, 'snapshot')) return 'legacy';
  const s = record.snapshot;
  if (!s || typeof s !== 'object') return 'damaged';
  if (s.version !== SNAPSHOT_VERSION) return 'unsupported';
  const p = s.puzzle;
  if (!p || !Array.isArray(p.options) || !Number.isInteger(p.correctIndex)
      || p.correctIndex < 0 || p.correctIndex >= p.options.length
      || !Array.isArray(p.hints) || !Array.isArray(p.distractors) || !p.explanation
      || !Array.isArray(p.description?.options)
      || (p.kind !== 'item' && (!Array.isArray(p.cells) || p.cells.length !== 9))) return 'damaged';
  if (s.key !== `${p.id}~v1~${fingerprint(JSON.stringify(p))}`) return 'damaged';
  for (const field of ['family', 'difficulty', 'seed']) {
    if (record[field] != null && record[field] !== p[field]) return 'damaged';
  }
  if (record.correctIndex != null && record.correctIndex !== p.correctIndex) return 'damaged';
  if (record.puzzleId != null && record.puzzleId !== s.key) return 'damaged';
  return 'available';
}

/** Detached data: callers cannot mutate the saved question through a view. */
export function savedPuzzle(record) {
  return replayStatus(record) === 'available' ? copy(record.snapshot.puzzle) : null;
}

export function requireSavedPuzzle(record) {
  const puzzle = savedPuzzle(record);
  if (!puzzle) throw new Error(replayMessage(record));
  return puzzle;
}

export function replayMessage(record) {
  const reason = {
    legacy: 'This record predates saved question snapshots. Its original question and option order cannot be recovered reliably from its seed.',
    unsupported: 'This question uses a snapshot version this app cannot read. It needs a compatible version of the app.',
    damaged: 'This saved question snapshot is damaged or does not match its record.',
  }[replayStatus(record)];
  return reason ? `${reason} The recorded result is retained and has not been re-marked. No replacement question has been generated.` : '';
}

/** End an unsafe resume before any deadline catch-up, grading or generation.
 * Unassigned adaptive slots are future questions, not historical questions. */
export function protectSession(session, now = Date.now()) {
  if (!session || session.finished) return session;
  const unavailable = session.items.some(item => item.difficulty != null && replayStatus(item) !== 'available');
  if (unavailable || session.snapshotVersion !== SNAPSHOT_VERSION) {
    session.finished = true;
    session.endedBy = 'unavailable';
    session.finishedAt = Math.max(session.startedAt, Math.min(now, session.endsAt));
  }
  return session;
}
