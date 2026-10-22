// Deterministic seeded random number generator (mulberry32) with string seed hashing.
// Puzzle logic only; no DOM access.

export function hashSeed(str) {
  // FNV-1a 32-bit
  let h = 2166136261 >>> 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function mulberry32(a) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed) {
    this.seed = seed;
    this.next = mulberry32(typeof seed === 'number' ? seed >>> 0 : hashSeed(seed));
  }
  float() { return this.next(); }
  int(n) { return Math.floor(this.next() * n); }
  range(lo, hi) { return lo + this.int(hi - lo + 1); } // inclusive
  pick(arr) { return arr[this.int(arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  sample(arr, k) { return this.shuffle(arr).slice(0, k); }
}
