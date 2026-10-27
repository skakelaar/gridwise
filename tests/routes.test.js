import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseHash} from '../src/app/routes.js';
test('malformed URL escapes produce the not-found route and ordinary routes still decode',()=>{
 assert.deepEqual(parseHash('#/intro/%'),['not-found']);
 assert.deepEqual(parseHash('#/review/a%20b?unused=1'),['review','a b']);
 assert.deepEqual(parseHash('#/mock/report/m123'),['mock','report','m123']);
});
