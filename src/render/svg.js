// SVG rendering of puzzle cells. Pure functions returning SVG markup strings; no DOM dependency.
// Shapes are drawn in a 100×100 viewBox using currentColor, so they follow the page's text colour.
import { SET_PALETTES } from '../engine/shapes.js';
import { SPLIT_VARIANTS } from '../engine/global.js';

let uid = 0;

const SHAPE_PATHS = {
  circle: '<circle cx="0" cy="0" r="28"/>',
  square: '<rect x="-24" y="-24" width="48" height="48"/>',
  triangle: '<polygon points="0,-30 27,20 -27,20"/>',
  diamond: '<polygon points="0,-31 31,0 0,31 -31,0"/>',
  pentagon: `<polygon points="${regular(5, 29)}"/>`,
  hexagon: `<polygon points="${regular(6, 29)}"/>`,
  star: `<polygon points="${star(5, 30, 13)}"/>`,
  plus: '<path d="M-9,-28 h18 v19 h19 v18 h-19 v19 h-18 v-19 h-19 v-18 h19 z"/>',
  // Chiral shapes (no rotational or mirror symmetry): rotation and reflection are always visible.
  flag: '<path d="M-3,-30 h6 v60 h-6 z M3,-30 L29,-18 L3,-6 z"/>',
  ell: '<path d="M-19,-29 h13 v45 h25 v13 h-38 z"/>',
  key: '<path d="M0,-30 a13,13 0 1 0 0.01,0 z M-3,-5 h6 v35 h-6 z M3,19 h11 v5 h-11 z M3,27 h7 v4 h-7 z"/>',
};

function regular(n, r, startDeg = -90) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = ((startDeg + (360 / n) * i) * Math.PI) / 180;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
function star(n, ro, ri) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? ro : ri;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

const SIZE_SCALE = { small: 0.55, medium: 0.78, large: 1.0 };
const LAYOUTS = {
  1: [[50, 50]],
  2: [[30, 50], [70, 50]],
  3: [[50, 27], [27, 71], [73, 71]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
};
const LAYOUT_SCALE = { 1: 1, 2: 0.62, 3: 0.55, 4: 0.5, 5: 0.46 };
const POS = [24, 50, 76];

export function renderCell(cell, opts = {}) {
  const { size = 100, label = '', className = 'cell-svg' } = opts;
  const id = `mrt${++uid}`;
  const body = cell.kind === 'set' ? renderSet(cell)
    : cell.kind === 'scatter' ? renderScatter(cell)
    : cell.kind === 'multi' ? renderMulti(cell)
    : cell.kind === 'split' ? renderSplit(cell)
    : cell.kind === 'composite' ? renderComposite(cell, id)
    : renderFigure(cell, id);
  const hasInner = cell.kind === 'figure' && cell.inner && cell.inner !== 'none' && cell.count === 1;
  const defs = ((cell.kind === 'figure' || cell.kind === 'composite') && cell.fill === 'hatched') || (hasInner && cell.innerFill === 'hatched')
    ? `<defs><pattern id="${id}-h" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="currentColor" stroke-width="2.4"/></pattern></defs>`
    : '';
  const aria = label ? ` role="img" aria-label="${escapeAttr(label)}"` : ' aria-hidden="true"';
  return `<svg class="${className}" viewBox="0 0 100 100" width="${size}" height="${size}"${aria} focusable="false">${defs}${body}</svg>`;
}

function renderFigure(cell, id) {
  const layout = LAYOUTS[cell.count] || LAYOUTS[1];
  let scale = SIZE_SCALE[cell.size] * LAYOUT_SCALE[cell.count];
  const positioned = cell.count === 1 && (cell.x !== 1 || cell.y !== 1);
  if (positioned) scale *= 0.68;
  const fillAttr = cell.fill === 'solid' ? 'currentColor' : cell.fill === 'hatched' ? `url(#${id}-h)` : 'var(--cell-bg, #fff)';
  const path = SHAPE_PATHS[cell.shape];
  const orient = `rotate(${cell.rot * 45})${cell.flip ? ' scale(-1,1)' : ''}`;
  let out = `<g fill="${fillAttr}" stroke="currentColor" stroke-width="${(3 / scale).toFixed(2)}" stroke-linejoin="round">`;
  for (let i = 0; i < (positioned ? 1 : layout.length); i++) {
    const [cx, cy] = positioned ? [POS[cell.x], POS[cell.y]] : layout[i];
    out += `<g transform="translate(${cx} ${cy}) scale(${scale.toFixed(3)}) ${orient}">${path}</g>`;
  }
  out += '</g>';
  if (cell.inner && cell.inner !== 'none' && cell.count === 1) {
    // A small second figure inside the outer one (outer fill is always hollow when an inner shape is present).
    const [cx, cy] = positioned ? [POS[cell.x], POS[cell.y]] : layout[0];
    const inScale = scale * 0.42;
    const inFill = cell.innerFill === 'solid' ? 'currentColor' : cell.innerFill === 'hatched' ? `url(#${id}-h)` : 'var(--cell-bg, #fff)';
    out += `<g fill="${inFill}" stroke="currentColor" stroke-width="${(3 / inScale).toFixed(2)}" stroke-linejoin="round" transform="translate(${cx} ${cy}) scale(${inScale.toFixed(3)})">${SHAPE_PATHS[cell.inner]}</g>`;
  }
  return out;
}

// Composite cell: one medium figure in the middle, small marks at fixed anchors around it.
const PART_GEOM = {
  dot: '<circle cx="17" cy="17" r="5.5" fill="currentColor" stroke="none"/>',
  ring: '<circle cx="83" cy="17" r="6" fill="var(--cell-bg,#fff)" stroke="currentColor" stroke-width="3"/>',
  cross: '<path d="M11,77 L23,89 M11,89 L23,77" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  square: '<rect x="77" y="77" width="12" height="12" fill="currentColor" stroke="none"/>',
  bar: '<path d="M36,90 H64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>',
};
function renderComposite(cell, id) {
  const scale = 0.66;
  const fillAttr = cell.fill === 'solid' ? 'currentColor' : cell.fill === 'hatched' ? `url(#${id}-h)` : 'var(--cell-bg, #fff)';
  const orient = `rotate(${cell.rot * 45})${cell.flip ? ' scale(-1,1)' : ''}`;
  let out = `<g fill="${fillAttr}" stroke="currentColor" stroke-width="${(3 / scale).toFixed(2)}" stroke-linejoin="round"><g transform="translate(50 50) scale(${scale}) ${orient}">${SHAPE_PATHS[cell.shape]}</g></g>`;
  for (const p of cell.parts) out += PART_GEOM[p] || '';
  return out;
}

const LINE_GEOM = {
  top: 'M22,22 H78', bottom: 'M22,78 H78', left: 'M22,22 V78', right: 'M78,22 V78',
  diagA: 'M22,22 L78,78', diagB: 'M22,78 L78,22',
};
function renderSet(cell) {
  const members = new Set(cell.members);
  if (cell.palette === 'lines') {
    let out = '<g stroke="currentColor" stroke-width="5" stroke-linecap="round" fill="none">';
    for (const [k, d] of Object.entries(LINE_GEOM)) if (members.has(k)) out += `<path d="${d}"/>`;
    out += '</g>';
    if (members.has('dot')) out += '<circle cx="50" cy="50" r="7" fill="currentColor"/>';
    return out;
  }
  const els = SET_PALETTES.dots.elements;
  let out = '<g fill="currentColor">';
  // faint frame so empty regions still read as part of a grid
  out += '<rect x="12" y="12" width="76" height="76" rx="6" fill="none" stroke="currentColor" stroke-opacity="0.18" stroke-width="1.5"/>';
  els.forEach((e, i) => {
    if (!members.has(e)) return;
    const cx = POS[i % 3];
    const cy = POS[Math.floor(i / 3)];
    out += `<circle cx="${cx}" cy="${cy}" r="8"/>`;
  });
  return out + '</g>';
}

function renderScatter(cell) {
  let out = '<g fill="currentColor" stroke="currentColor" stroke-width="3" stroke-linecap="round">';
  for (const [x, y] of cell.points) {
    if (cell.marker === 'dot') out += `<circle cx="${x}" cy="${y}" r="5" stroke="none"/>`;
    else if (cell.marker === 'ring') out += `<circle cx="${x}" cy="${y}" r="5.5" fill="var(--cell-bg,#fff)"/>`;
    else if (cell.marker === 'square') out += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" stroke="none"/>`;
    else out += `<path d="M${x - 5},${y - 5} L${x + 5},${y + 5} M${x - 5},${y + 5} L${x + 5},${y - 5}" fill="none"/>`;
  }
  return out + '</g>';
}

function renderMulti(cell) {
  let out = '';
  cell.items.forEach((it, i) => {
    const [x, y] = cell.points[i] || [50, 50];
    const fill = it.fill === 'solid' ? 'currentColor' : 'var(--cell-bg,#fff)';
    out += `<g transform="translate(${x} ${y}) scale(0.3)" fill="${fill}" stroke="currentColor" stroke-width="8" stroke-linejoin="round">${SHAPE_PATHS[it.shape] || SHAPE_PATHS.circle}</g>`;
  });
  return out;
}

function renderSplit(cell) {
  const v = (SPLIT_VARIANTS[cell.sections] || []).find((x) => x.id === cell.variant);
  let out = '<rect x="10" y="10" width="80" height="80" fill="var(--cell-bg,#fff)" stroke="currentColor" stroke-width="3"/>';
  out += '<g stroke="currentColor" stroke-width="3" stroke-linecap="round">';
  for (const [x1, y1, x2, y2] of (v ? v.lines : [])) out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  return out + '</g>';
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Render a whole 3×3 matrix (cells 0..7 plus the gap) as a single SVG for compact previews.
export function renderMatrixPreview(puzzle, opts = {}) {
  const { cellSize = 60, gap = 6 } = opts;
  const total = cellSize * 3 + gap * 4;
  let out = `<svg viewBox="0 0 ${total} ${total}" width="${total}" height="${total}" aria-hidden="true" focusable="false">`;
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3), c = i % 3;
    const x = gap + c * (cellSize + gap), y = gap + r * (cellSize + gap);
    out += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="4" fill="var(--cell-bg,#fff)" stroke="currentColor" stroke-opacity="0.35"/>`;
    if (i === 8) {
      out += `<text x="${x + cellSize / 2}" y="${y + cellSize / 2 + 8}" text-anchor="middle" font-size="${cellSize * 0.5}" fill="currentColor" fill-opacity="0.5">?</text>`;
    } else {
      const inner = renderCell(puzzle.cells[i], { size: cellSize }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
      out += `<svg x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" viewBox="0 0 100 100">${inner}</svg>`;
    }
  }
  return out + '</svg>';
}
