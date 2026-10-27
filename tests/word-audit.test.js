import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateAny} from '../src/engine/index.js';

test('clock options denote distinct times and exactly one overlap',()=>{
 let seen=0;const hours=new Set();
 for(let i=0;i<1000;i++) {
 const p=generateAny({family:'word',difficulty:5,seed:`audit-${i}`}); if(p.features.rule!=='clock-hands')continue;
 const times=p.options.map(s=>{const m=s.match(/^(\d+):(\d+)(?: and (\d+)\/11 min)?$/);assert.ok(m,s);hours.add(+m[1]);return {h:+m[1],m:+m[2]+Number(m[3]||0)/11};});
 assert.equal(new Set(times.map(t=>(t.h*60+t.m).toFixed(8))).size,p.options.length,p.id);
 const valid=times.map((t,j)=>Math.abs(30*t.h-5.5*t.m)<1e-8?j:-1).filter(j=>j>=0);
 assert.deepEqual(valid,[p.correctIndex],p.id);seen++;
 }
 assert.ok(seen>100);assert.equal(hours.size,10);
});
test('measurement analogies use the quantities measured by candela and kilogram',()=>{
 let candela=0,kilogram=0;
 for(let difficulty=1;difficulty<=6;difficulty++)for(let i=0;i<400;i++){
 const p=generateAny({family:'analogy',difficulty,seed:`audit-${i}`});const text=p.prompt+' '+p.explanation.steps.join(' ');
 if(text.includes('candela')){assert.match(text.toLowerCase(),/luminous intensity/);assert.doesNotMatch(text.toLowerCase(),/luminosity/);candela++;}
 if(text.includes('kilogram')){assert.match(text.toLowerCase(),/mass/);assert.doesNotMatch(text.toLowerCase(),/weight/);kilogram++;}
 }
 assert.ok(candela>0&&kilogram>0);
});
