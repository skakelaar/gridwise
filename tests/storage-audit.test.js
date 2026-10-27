import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as s from '../src/app/storage.js';

function fakeStorage() {
 const data=new Map();
 return {data, fail:false,get length(){return data.size;},key(i){return [...data.keys()][i];},getItem(k){return data.get(k)??null;},setItem(k,v){if(this.fail)throw Error('QuotaExceededError');data.set(k,v);},removeItem(k){if(this.fail)throw Error('SecurityError');data.delete(k);}};
}
test('a failed write must shadow stale durable data; failed deletion must stay deleted in this session',()=>{
 globalThis.localStorage=fakeStorage(); s.clearAll();
 s.saveSettings({practiceClock:'30'});
 localStorage.fail=true;
 s.saveSettings({practiceClock:'60'});
 assert.equal(s.loadSettings().practiceClock,'60');
 s.remove(s.KEYS.settings);
 assert.equal(s.loadSettings().practiceClock,'off');
 localStorage.fail=false;s.clearAll();
});
test('settings are validated and unknown keys cannot drive redirect loops',()=>{
 globalThis.localStorage=fakeStorage();s.clearAll();
 s.write(s.KEYS.settings,{testFormat:'test',practiceFamily:12,practiceDifficulty:'1.5',practiceHints:null,alien:true});
 assert.deepEqual(s.loadSettings(),s.DEFAULT_SETTINGS);
 s.saveSettings({mockCount:8,mockMinutes:3,mockTier:'higher'});
 assert.equal(s.loadSettings().mockCount,8);
 assert.ok(Object.hasOwn(s.DEFAULT_SETTINGS,'mockCount'));
 s.clearAll();
});
test('corrupt JSON and null records cannot break results or mistakes',()=>{
 globalThis.localStorage=fakeStorage();s.clearAll();
 localStorage.setItem('mrt.settings','{broken');assert.deepEqual(s.loadSettings(),s.DEFAULT_SETTINGS);
 s.write(s.KEYS.attempts,[null,42,{}]);assert.deepEqual(s.loadAttempts(),[]);
 s.write(s.KEYS.mistakes,[null,42,{}]);assert.deepEqual(s.loadMistakes(),[]);
 s.write(s.KEYS.mock,{items:[null],index:0});assert.equal(s.loadMock(),null);
 s.clearAll();
});
