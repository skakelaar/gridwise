import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './support/dom.js';
import {generateAny} from '../src/engine/index.js';
import {INTRO_STEPS,ITEM_GUIDES} from '../src/app/content.js';
import {renderIntro,renderItemGuide} from '../src/app/ui.js';

test('all eight matrix lessons render explanations from their actual generated examples',()=>{
 installDOM();
 const examples=INTRO_STEPS.map(s=>generateAny(s.example));
 const text=renderIntro({examples}).textContent;
 for(const p of examples) for(const sentence of [p.explanation.summary,...p.explanation.missing]) assert.ok(text.includes(sentence),p.id+': '+sentence);
 assert.doesNotMatch(text,/top line appears in both|three and two; column|number of triangles grows/);
});

test('all non-matrix guide examples render the generated explanation',()=>{
 installDOM();
 for(const [tab,guide] of Object.entries(ITEM_GUIDES)) {
 const examples=guide.examples.map(generateAny);
 const text=renderItemGuide({tab,guide,examples},{onPractise:()=>{}}).textContent;
 for(const p of examples)for(const sentence of [p.explanation.summary,...p.explanation.steps])assert.ok(text.includes(sentence),p.id);
 }
});
