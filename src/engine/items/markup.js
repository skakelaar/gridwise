// Tiny text markup for numeric prompts: {sup 18} → superscript, {frac 5/20} → a fraction.
// Everything else is plain text (escaped on the way to HTML).

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function markupToHtml(text) {
  return esc(text)
    .replace(/\{frac ([^}/]+)\/([^}]+)\}/g, (_, a, b) => `<span class="frac"><span class="frac-num">${a}</span><span class="frac-den">${b}</span></span>`)
    .replace(/\{sup ([^}]+)\}/g, (_, a) => `<sup>${a}</sup>`);
}

export function markupToPlain(text) {
  return String(text)
    .replace(/\{frac ([^}/]+)\/([^}]+)\}/g, (_, a, b) => `${a} over ${b}`)
    .replace(/\{sup ([^}]+)\}/g, (_, a) => ` to the power of ${a}`);
}
