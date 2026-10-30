import test from 'node:test';
import assert from 'node:assert/strict';
import { isIdleWorker } from '../src/ui/input.js';

const unit = (type, order = 'idle', extra = {}) => ({ type, owner: 0, order: { type: order }, ...extra });

test('the idle button counts idle villagers and Fishing Ships of the player only', () => {
  assert.ok(isIdleWorker(unit('villager')));
  assert.ok(isIdleWorker(unit('fishing_ship')));
  assert.ok(!isIdleWorker(unit('fishing_ship', 'gather')));
  assert.ok(!isIdleWorker(unit('fishing_ship', 'idle', { owner: 1 })));
  assert.ok(!isIdleWorker(unit('villager', 'idle', { aboard: 7 })));
  assert.ok(!isIdleWorker(unit('war_galley')));
  assert.ok(!isIdleWorker(unit('clubman')));
});
