// Shape catalogue and dihedral-group (D8) orientation arithmetic.
//
// An orientation state is { r, f }: flip horizontally first if f === 1, then rotate by r * 45° clockwise.
// Two states produce the same picture for a shape when they differ by an element of the shape's symmetry
// group, so visual comparisons must go through canonicalOrientation().

export const SHAPES = {
  // oriented: false → never rotated/flipped by rules (rot/flip always 0).
  // rot: k means rotation by k*45° is a symmetry (8 = no rotational symmetry, 1 = full).
  // mirror: m means the reflection (m,1) is a symmetry; null = chiral (no mirror symmetry).
  circle:   { oriented: false, rot: 1, mirror: 0, label: 'circle' },
  square:   { oriented: false, rot: 2, mirror: 0, label: 'square' },
  triangle: { oriented: false, rot: 8, mirror: 0, label: 'triangle' },
  diamond:  { oriented: false, rot: 2, mirror: 0, label: 'diamond' },
  pentagon: { oriented: false, rot: 8, mirror: 0, label: 'pentagon' },
  hexagon:  { oriented: false, rot: 4, mirror: 0, label: 'hexagon' },
  star:     { oriented: false, rot: 8, mirror: 0, label: 'star' },
  plus:     { oriented: false, rot: 2, mirror: 0, label: 'plus sign' },
  // Chiral shapes: every one of the 16 orientation states looks different.
  flag:     { oriented: true, rot: 8, mirror: null, label: 'flag' },
  ell:      { oriented: true, rot: 8, mirror: null, label: 'L shape' },
  key:      { oriented: true, rot: 8, mirror: null, label: 'key' },
};

export const PLAIN_SHAPES = Object.keys(SHAPES).filter((k) => !SHAPES[k].oriented);
export const ORIENTED_SHAPES = Object.keys(SHAPES).filter((k) => SHAPES[k].oriented);

// D8 composition: apply b first, then a.
export function compose(a, b) {
  return { r: (((a.r + (a.f ? -b.r : b.r)) % 8) + 8) % 8, f: a.f ^ b.f };
}

const stabCache = new Map();
function stabilizer(shapeName) {
  if (stabCache.has(shapeName)) return stabCache.get(shapeName);
  const s = SHAPES[shapeName];
  const gens = [{ r: s.rot % 8, f: 0 }];
  if (s.mirror !== null && s.mirror !== undefined) gens.push({ r: s.mirror, f: 1 });
  const seen = new Map();
  const key = (g) => `${g.r},${g.f}`;
  const queue = [{ r: 0, f: 0 }];
  seen.set('0,0', queue[0]);
  while (queue.length) {
    const g = queue.shift();
    for (const h of gens) {
      const x = compose(g, h);
      if (!seen.has(key(x))) { seen.set(key(x), x); queue.push(x); }
    }
  }
  const out = [...seen.values()];
  stabCache.set(shapeName, out);
  return out;
}

// Smallest (r, f) among all states that draw the same picture.
export function canonicalOrientation(shapeName, r, f) {
  const g = { r: ((r % 8) + 8) % 8, f: f ? 1 : 0 };
  let best = null;
  for (const s of stabilizer(shapeName)) {
    const x = compose(g, s);
    if (!best || x.r < best.r || (x.r === best.r && x.f < best.f)) best = x;
  }
  return best;
}

export const SET_PALETTES = {
  lines: {
    label: 'line figure',
    elements: ['top', 'bottom', 'left', 'right', 'diagA', 'diagB', 'dot'],
    names: {
      top: 'top line', bottom: 'bottom line', left: 'left line', right: 'right line',
      diagA: 'falling diagonal', diagB: 'rising diagonal', dot: 'centre dot',
    },
  },
  dots: {
    label: 'dot grid',
    elements: ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'],
    names: {
      tl: 'top-left dot', tc: 'top-centre dot', tr: 'top-right dot',
      ml: 'middle-left dot', mc: 'centre dot', mr: 'middle-right dot',
      bl: 'bottom-left dot', bc: 'bottom-centre dot', br: 'bottom-right dot',
    },
  },
};
