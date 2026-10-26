// Cell model, attribute domains and canonical keys.
import { canonicalOrientation, SET_PALETTES } from './shapes.js';

// Attribute domains for figure cells. Rule values are always indices into `values`.
export function makeDomains(shapeSet, innerSet = ['none']) {
  return {
    shape: { kind: 'categorical', values: shapeSet, label: 'shape' },
    inner: { kind: 'categorical', values: innerSet, label: 'inner shape' },
    innerFill: { kind: 'categorical', values: ['none', 'solid', 'hatched'], label: 'inner fill' },
    fill:  { kind: 'categorical', values: ['none', 'solid', 'hatched'], label: 'fill' },
    size:  { kind: 'ordered', values: ['small', 'medium', 'large'], label: 'size', steps: [1, -1] },
    count: { kind: 'ordered', values: [1, 2, 3, 4, 5], label: 'number of shapes', steps: [1, -1, 2, -2], arith: true },
    rot:   { kind: 'cyclic', values: [0, 1, 2, 3, 4, 5, 6, 7], label: 'rotation', steps: [1, -1, 2, -2, 3, -3] },
    flip:  { kind: 'categorical', values: [0, 1], label: 'reflection' },
    x:     { kind: 'ordered', values: [0, 1, 2], label: 'horizontal position', steps: [1, -1] },
    y:     { kind: 'ordered', values: [0, 1, 2], label: 'vertical position', steps: [1, -1] },
  };
}

export const FIGURE_ATTRS = ['shape', 'fill', 'size', 'count', 'rot', 'flip', 'x', 'y', 'inner', 'innerFill'];

export function figureCell(attrs) {
  return { kind: 'figure', ...attrs };
}

export function setCell(palette, members) {
  const order = SET_PALETTES[palette].elements;
  const sorted = [...new Set(members)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { kind: 'set', palette, members: sorted };
}

// Canonical key: equal keys ⇔ visually identical cells.
export function cellKey(cell) {
  if (cell.kind === 'set') return `set|${cell.palette}|${cell.members.join(',')}`;
  const o = canonicalOrientation(cell.shape, cell.rot, cell.flip);
  const pos = cell.count === 1 ? `${cell.x},${cell.y}` : 'layout';
  const inner = !cell.inner || cell.inner === 'none' ? '-' : `${cell.inner},${cell.innerFill}`;
  return `fig|${cell.shape}|${cell.fill}|${cell.size}|${o.r},${o.f}|${cell.count}|${pos}|${inner}`;
}

export function cellsEqual(a, b) { return cellKey(a) === cellKey(b); }

// Set helpers (members are arrays of element ids).
export const SetOps = {
  union: (a, b) => [...new Set([...a, ...b])],
  intersection: (a, b) => a.filter((x) => b.includes(x)),
  xor: (a, b) => [...a.filter((x) => !b.includes(x)), ...b.filter((x) => !a.includes(x))],
  diffAB: (a, b) => a.filter((x) => !b.includes(x)),
  diffBA: (a, b) => b.filter((x) => !a.includes(x)),
};

// Operations that need the palette (complements). Bound into SetOps per palette by withPalette().
export function paletteOps(palette) {
  const all = SET_PALETTES[palette].elements;
  return {
    neither: (a, b) => all.filter((x) => !a.includes(x) && !b.includes(x)),
    notBoth: (a, b) => all.filter((x) => !(a.includes(x) && b.includes(x))),
  };
}

export function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}
