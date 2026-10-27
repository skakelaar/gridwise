import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createChallenge,challengeAnswer} from '../src/app/challenge.js';
import {createMock,mockAnswer} from '../src/app/mocktest.js';
import {createTimedSession,timedAnswer} from '../src/app/session.js';

test('answers arriving after the deadline but before a timer tick cannot be scored',()=>{
 const c=createChallenge({format:'mixed',now:0});
 assert.equal(challengeAnswer(c,0,30001),null);
 assert.equal(c.items[0].timedOut,true);assert.equal(c.items[0].chosenIndex,null);
 assert.equal(c.items[1].chosenIndex,null);
 const m=createMock({count:6,minutes:1,now:0});mockAnswer(m,0,60001);
 assert.equal(m.items[0].chosenIndex,null);assert.equal(m.finished,true);
 const t=createTimedSession({count:5,minutes:1,now:0});
 assert.equal(timedAnswer(t,0,60001),null);assert.equal(t.items[0].chosenIndex,null);assert.equal(t.finished,true);
});
