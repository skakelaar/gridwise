// Writes a static HTML gallery of rendered puzzles for visual review: node tools/gallery.js [out.html] [seeds]
import { writeFile } from 'node:fs/promises';
import { generatePuzzle, FAMILY_IDS } from '../src/engine/index.js';
import { renderCell } from '../src/render/svg.js';

const out = process.argv[2] || 'review/gallery.html';
const n = Number(process.argv[3] || 2);
let html = `<!doctype html><meta charset="utf-8"><title>Puzzle gallery</title>
<style>body{font-family:system-ui;margin:20px;color:#111} .p{border:1px solid #ccc;padding:10px;margin:12px 0;display:flex;gap:18px;flex-wrap:wrap}
.m{display:grid;grid-template-columns:repeat(3,70px);gap:4px}.m div{border:1px solid #999;width:70px;height:70px;display:flex;align-items:center;justify-content:center;font-size:30px}
.o{display:grid;grid-template-columns:repeat(3,70px);gap:4px}.o div{border:1px solid #999;width:70px;height:70px;position:relative}.o div.c{outline:3px solid #2a7}.o span{position:absolute;left:2px;top:0;font-size:11px}
.t{max-width:520px;font-size:13px}</style><h1>Puzzle gallery</h1>`;
for (const family of FAMILY_IDS) for (const d of [1, 2, 3, 4, 5, 6]) for (let s = 0; s < n; s++) {
  const p = generatePuzzle({ family, difficulty: d, seed: `g${s}` });
  html += `<div class="p"><div><b>${p.id}</b><div class="m">${p.cells.slice(0, 8).map((c) => `<div>${renderCell(c, { size: 64 })}</div>`).join('')}<div>?</div></div></div>`;
  html += `<div><div class="o">${p.options.map((c, i) => `<div class="${i === p.correctIndex ? 'c' : ''}"><span>${i + 1}</span>${renderCell(c, { size: 64 })}</div>`).join('')}</div></div>`;
  html += `<div class="t"><p>${p.explanation.summary}</p><p>${p.explanation.rows.join(' ')}</p><p>${p.explanation.columns.join(' ')}</p><p>${p.explanation.missing.join(' ')}</p><p><i>${p.distractors.filter(Boolean).map((x) => `${x.index + 1}: ${x.text}`).join('<br>')}</i></p></div></div>`;
}
await writeFile(out, html);
console.log(`wrote ${out}`);
