// Generation/template coverage, not a semantic proof of the word bank.
// Run: node tools/item-audit.js [seeds=1000]
import {generateAny,ITEM_FAMILY_IDS} from '../src/engine/index.js';
import {writeFileSync} from 'node:fs';
const seeds=Number(process.argv[2]||1000),rows=[];
for(const family of ITEM_FAMILY_IDS)for(let difficulty=1;difficulty<=6;difficulty++){
 const rules={};
 for(let i=0;i<seeds;i++){
  const p=generateAny({family,difficulty,seed:`audit-${i}`});
  const name=p.features.rule||p.features.relation;
  rules[name]=(rules[name]||0)+1;
 }
 rows.push({family,difficulty,seeds,rules});
}
writeFileSync('review/item-coverage.json',JSON.stringify(rows,null,2)+'\n');
console.log(`${rows.length*seeds} items generated; wrote review/item-coverage.json`);
