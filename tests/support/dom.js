// Small DOM adapter for rendering assertions. Browser behaviour is tested separately.
export class Element {
  constructor(tag, text='') { this.tagName=tag; this.text=text; this.children=[]; this.attrs={}; this.dataset={}; }
  appendChild(child) { this.children.push(child); return child; }
  setAttribute(k,v) { this.attrs[k]=v; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {}
  set innerHTML(value) { this.text=value; }
  set textContent(value) { this.text=value; }
  get textContent() { return this.text+this.children.map(c=>c.textContent).join(' '); }
}
export function installDOM() {
  globalThis.Node=Element;
  globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>new Element('#text',text)};
}
