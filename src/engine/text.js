// Human-readable names for attribute values and cells. Shared by explanations, hints and accessibility text.
import { SHAPES, SET_PALETTES } from './shapes.js';
import { describeGlobalCell } from './global.js';

// Full name of one attribute value, e.g. "striped", "3 shapes", "rotated 90° clockwise".
export function valueName(attr, value) {
  switch (attr) {
    case 'shape': return SHAPES[value]?.label ?? String(value);
    case 'fill': return { none: 'hollow', solid: 'solid', hatched: 'striped' }[value];
    case 'size': return value;
    case 'count': return value === 1 ? 'one shape' : `${value} shapes`;
    case 'rot': return value === 0 ? 'upright' : `rotated ${value * 45}° clockwise`;
    case 'flip': return value ? 'mirrored' : 'not mirrored';
    case 'x': return ['left', 'centre', 'right'][value];
    case 'y': return ['top', 'middle', 'bottom'][value];
    case 'inner': return value === 'none' ? 'none' : (SHAPES[value]?.label ?? String(value));
    case 'innerFill': return { none: 'hollow', solid: 'solid', hatched: 'striped' }[value];
    default: return String(value);
  }
}

// Short name for use inside lists and sequences, where the full name would repeat itself
// ("90°, 315° and 135°" rather than "rotated 90° clockwise, rotated 315° clockwise and ...").
export function shortValueName(attr, value) {
  switch (attr) {
    case 'rot': return value === 0 ? 'upright' : `${value * 45}°`;
    case 'count': return value === 1 ? 'one' : String(value);
    case 'x': return ['the left', 'the centre', 'the right'][value];
    case 'y': return ['the top', 'the middle', 'the bottom'][value];
    default: return valueName(attr, value);
  }
}

export const ATTR_LABEL = {
  shape: 'shape', fill: 'fill', size: 'size', count: 'number of shapes', rot: 'rotation',
  flip: 'reflection', x: 'horizontal position', y: 'vertical position',
  inner: 'inner shape', innerFill: 'inner fill',
};

export function listNames(items) {
  if (items.length === 0) return 'nothing';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

// Short spoken description of a cell, e.g. "2 medium striped flags, rotated 90° clockwise".
export function describeCell(cell) {
  if (cell.kind === 'scatter' || cell.kind === 'multi' || cell.kind === 'split') return describeGlobalCell(cell);
  if (cell.kind === 'set') {
    const pal = SET_PALETTES[cell.palette];
    if (cell.members.length === 0) return 'empty cell';
    return listNames(cell.members.map((m) => pal.names[m]));
  }
  const shape = SHAPES[cell.shape];
  const parts = [];
  parts.push(cell.count === 1 ? 'one' : String(cell.count));
  parts.push(cell.size);
  parts.push(valueName('fill', cell.fill));
  parts.push(shape.label + (cell.count > 1 ? 's' : ''));
  let s = parts.join(' ');
  const extras = [];
  if (shape.oriented) {
    if (cell.flip) extras.push('mirrored');
    if (cell.rot) extras.push(`rotated ${cell.rot * 45}° clockwise`);
    if (!cell.flip && !cell.rot) extras.push('upright');
  }
  if (cell.count === 1 && (cell.x !== 1 || cell.y !== 1)) {
    extras.push(`at the ${valueName('y', cell.y)} ${valueName('x', cell.x)}`.replace('middle centre', 'centre'));
  }
  if (cell.inner && cell.inner !== 'none') {
    extras.push(`containing a small ${valueName('innerFill', cell.innerFill)} ${SHAPES[cell.inner]?.label ?? cell.inner}`);
  }
  if (extras.length) s += ', ' + extras.join(', ');
  return s;
}
