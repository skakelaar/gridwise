// Reproducible exploratory audit: node tools/adversarial-sweep.js [seeds=1000].
// Readings here are independent probes, not accepted by fiat as legitimate rules.
import {generatePuzzle,FAMILY_IDS} from '../src/engine/index.js';
import {solveIndependently} from '../src/engine/qa-solver.js';
import {writeFileSync} from 'node:fs';
const N=Number(process.argv[2]||1000), metrics=[], findings=[];
const equal=(a,b)=>JSON.stringify(Array.isArray(a)?[...a].sort():a)===JSON.stringify(Array.isArray(b)?[...b].sort():b);
const token=x=>typeof x==='object'?x.shape+'/'+x.fill:x;
const frequency=(a=[])=>{const b=a.map(token);return Object.fromEntries([...new Set(b)].map(x=>[x,b.filter(y=>y===x).length]));};
const same=(a,b)=>a.length===b.length&&a.every(v=>b.includes(v));
const paths=[[0,1,2,3,4,5,6,7,8],[0,1,2,5,4,3,6,7,8],[0,3,6,1,4,7,2,5,8],[0,3,6,7,4,1,2,5,8],[0,1,2,5,8,7,6,3,4],[0,3,6,7,8,5,2,1,4]];
const note=(p,option,reading)=>{if(findings.filter(x=>x.reading===reading).length<5)findings.push({family:p.family,difficulty:p.difficulty,seed:p.seed,option,correct:p.correctIndex,reading,cells:p.cells,options:p.options});};
for(const family of FAMILY_IDS)for(let difficulty=1;difficulty<=6;difficulty++){
 let rules=0, similarity=0, confidence=0, weak=0,singleton=0, coupledIndependent=0;
 for(let i=0;i<N;i++){
 const p=generatePuzzle({family,difficulty,seed:`audit-${i}`}),ans=p.cells[8], q=solveIndependently(p);
 rules+=p.features.ruleCount; confidence+=q.confidence;
 weak+=q.evaluations.some((e,j)=>j!==p.correctIndex&&e.level==='weak');
 const attrs=p.kind==='composite'?['shape','fill','rot','flip','parts']:ans.kind==='figure'?['shape','fill','size','rot','flip','count','x','y','inner','innerFill']:ans.kind==='set'?['members']:ans.kind==='split'?['sections']:ans.kind==='scatter'?['count']:['items'];
 const observable=c=>{
 const out=Object.fromEntries(attrs.filter(a=>!['parts','members','items'].includes(a)).map(a=>[a,c[a]]));
 for(const key of ['parts','members','items'].filter(k=>attrs.includes(k))) {
 const elements=[...new Set(p.options.flatMap(o=>(o[key]||[]).map(token)))];
 const counts=frequency(c[key]); for(const e of elements)out[key+':'+e]=counts[e]||0;
 }
 return out;
};
 const actual=observable(ans), alternatives=p.options.map(observable);
 for(let j=0;j<p.options.length;j++)if(j!==p.correctIndex)similarity+=Object.keys(actual).filter(a=>equal(alternatives[j][a],actual[a])).length/Object.keys(actual).length/5;
 if(Object.keys(actual).some(a=>alternatives.filter(o=>equal(o[a],actual[a])).length===1)){singleton++;if(difficulty===6)note(p,null,'answer has a singleton attribute (not itself proof of a shortcut)');}
 if(p.rules?.some(r=>r.type==='coupled')){const attr=p.rules.find(r=>r.type==='coupled').attr;coupledIndependent+=q.evaluations[p.correctIndex].attrs[attr].some(x=>x.strong&&!x.name.startsWith('coupled:'));}
 for(let j=0;j<p.options.length;j++){
 if(j===p.correctIndex)continue;
 const o=p.options[j], cs=[...p.cells.slice(0,8),o],lines=[ [cs.slice(0,3),cs.slice(3,6),cs.slice(6)], [0,1,2].map(c=>[cs[c],cs[c+3],cs[c+6]]) ];
 const differs=attrs.filter(a=>!equal(o[a],ans[a]));
 if(differs.length===1&&['flip','fill'].includes(differs[0])){
 const attr=differs[0], bit=c=>attr==='flip'?c.flip:c.fill==='none'?0:c.fill==='solid'?1:null;
 if(cs.every(c=>bit(c)!==null))for(const [axis,ls]of lines.entries())if(ls.every(l=>(bit(l[0])^bit(l[1]))===bit(l[2])))note(p,j,`${axis?'column':'row'} binary XOR on ${attr}`);
 }
 if(differs.length===1&&['count','sections'].includes(differs[0])) {
 const attr=differs[0];for(const [axis,ls]of lines.entries())if(ls.every(l=>((l[0][attr]+l[1][attr])%2)===(l[2][attr]%2)))note(p,j,`${axis?'column':'row'} parity arithmetic on ${attr} (underdetermined)`);
 }
 // Parallel anti-diagonals, traversing the full grid with one arithmetic step.
 const diagonalPath=[0,1,3,2,4,6,5,7,8];
 if(differs.length===1&&['rot','count','sections'].includes(differs[0])) {
 const attr=differs[0],v=diagonalPath.map(k=>cs[k][attr]),d=v.slice(1).map((x,k)=>attr==='rot'?(x-v[k]+8)%8:x-v[k]);
 if(d[0]!==0&&d.every(x=>x===d[0]))note(p,j,`anti-diagonal traversal on ${attr}`);
 }

 if(differs.length===1&&['rot','flip','count','sections','size','x','y'].includes(differs[0])){
 const attr=differs[0], vals=cs.map(c=>attr==='size'?['small','medium','large'].indexOf(c[attr]):c[attr]);
 if(attr==='rot') for(const [k,ls] of lines.entries()){
 if(ls.every(l=>(l[0].rot+l[1].rot)%8===l[2].rot))note(p,j,`${k?'column':'row'} orientation sum modulo 8`);
 if(ls.every(l=>(l[0].rot^l[1].rot)===l[2].rot))note(p,j,`${k?'column':'row'} orientation binary XOR (exploratory)`);
 }
 if(attr==='rot'&&cs.every((c,k)=>c.rot===(cs[Math.floor(k/3)*3].rot^cs[k%3].rot^cs[0].rot)))note(p,j,'orientation separable row XOR column (exploratory)');
 for(const path of paths){const v=path.map(k=>vals[k]),ds=v.slice(1).map((x,k)=>attr==='rot'?(x-v[k]+8)%8:x-v[k]);if(ds.every(x=>x===ds[0])&&ds[0]!==0)note(p,j,`path arithmetic on ${attr}`);}
 }
 if(ans.kind==='composite') {
 // Demand repeated evidence for every association; single sightings are not a law.
 const association=(source,target)=>{
 const map=new Map(),freq=new Map();
 for(const c of p.cells.slice(0,8)){
 const a=source(c),b=target(c);if(map.has(a)&&map.get(a)!==b)return false;
 map.set(a,b);freq.set(a,(freq.get(a)||0)+1);
 }
 return map.size>=2&&[...freq.values()].every(n=>n>=2)&&map.has(source(o))&&map.get(source(o))===target(o);
 };
 if(differs.length===1&&differs[0]==='parts'&&association(c=>c.rot,c=>[...c.parts].sort().join(',')))note(p,j,'composite marks determined by rotation');
 if(differs.length===1&&differs[0]==='rot'&&association(c=>[...c.parts].sort().join(','),c=>c.rot))note(p,j,'composite rotation determined by marks');
 }
 const key=ans.kind==='set'?'members':ans.kind==='composite'?'parts':null;
 if(key&&differs.length===1&&differs[0]===key){
 // Each mark-set appears once in every row or column (Latin readings on whole sets).
 for(const [axis,ls] of lines.entries()) {const ks=ls.map(l=>l.map(c=>[...c[key]].sort().join(',')));if(new Set(ks[0]).size===3&&ks.every(l=>same(l,ks[0])))note(p,j,`${axis?'column':'row'} Latin mark sets`);}
 // Local-line complement universe: only positions present somewhere in that line.
 for(const [axis,ls] of lines.entries())for(const op of ['neither','notBoth']){
 if(ls.every(l=>{const u=[...new Set(l.flatMap(c=>c[key]))],a=l[0][key],b=l[1][key];return same(l[2][key],u.filter(e=>op==='neither'?!a.includes(e)&&!b.includes(e):!(a.includes(e)&&b.includes(e))));}))note(p,j,`${axis?'column':'row'} ${op} over local line universe`);
 }
 // Geometric rotations of dot/line sets; composite corner marks retain their symbol identity,
 // so rotating a dot into a ring is not treated as a rigid rotation.
 if(ans.palette==='dots')for(const permutation of [[6,3,0,7,4,1,8,5,2],[8,7,6,5,4,3,2,1,0]]) {
 const names=['tl','tc','tr','ml','mc','mr','bl','bc','br'];const rot=a=>a.map(e=>names[permutation[names.indexOf(e)]]);
 for(const [axis,ls] of lines.entries())if(ls.every(l=>same(rot(l[0][key]),l[1][key])&&same(rot(l[1][key]),l[2][key])))note(p,j,`${axis?'column':'row'} rotated dot sets`);
 }
 }
 }
 }
 metrics.push({family,difficulty,seeds:N,rules:rules/N,optionSimilarity:similarity/N,confidence:confidence/N,weak,singleton,coupledIndependent});
}
writeFileSync('review/adversarial-measurements.json',JSON.stringify({seeds:N,metrics,findings},null,2)+'\n');
console.log(JSON.stringify({puzzles:FAMILY_IDS.length*6*N,examples:findings.map(({family,difficulty,seed,option,reading})=>({family,difficulty,seed,option,reading}))},null,2));
