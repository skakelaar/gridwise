// Pure statistics over the attempt log. No DOM, no storage.
import { GROUPS, DIFFICULTY_LABELS } from '../engine/index.js';

export const SMALL_SAMPLE = 10;

export function median(values) {
  const nums = values.filter((v) => typeof v === 'number' && Number.isFinite(v)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

/** Summarise a list of attempts: count, correct, accuracy (0..1 or null), median ms, small-sample flag. */
export function summarise(attempts) {
  const answered = attempts.filter((a) => a.chosenIndex != null);
  const correct = answered.filter((a) => a.correct).length;
  return {
    attempted: answered.length,
    correct,
    accuracy: answered.length ? correct / answered.length : null,
    medianMs: median(answered.map((a) => a.ms)),
    smallSample: answered.length < SMALL_SAMPLE,
  };
}

export function byGroup(attempts) {
  return Object.keys(GROUPS).map((id) => ({
    id,
    label: GROUPS[id].label,
    ...summarise(attempts.filter((a) => a.group === id)),
  }));
}

export function byDifficulty(attempts) {
  return [1, 2, 3, 4].map((d) => ({
    id: String(d),
    label: `${d} – ${DIFFICULTY_LABELS[d]}`,
    ...summarise(attempts.filter((a) => Number(a.difficulty) === d)),
  }));
}

export function formatPercent(fraction) {
  return fraction == null ? '–' : `${Math.round(fraction * 100)}%`;
}

export function formatMs(ms) {
  if (ms == null) return '–';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = Math.floor(s / 60);
  const rest = Math.round(s - m * 60);
  return `${m} min ${String(rest).padStart(2, '0')} s`;
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
