import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace } from '../src/sim/commands.js';
import { AGES } from '../src/data/ages.js';
import { FARM, farmStats } from '../src/data/farms.js';
import { tipHtml } from '../src/ui/tips.js';

// A finished (or unfinished) Farm on the first free tile near player pid's Town Center.
const placeFarm = (g, pid, constructed = true) => {
  const tc = [...g.buildings.values()].find(b => b.owner === pid && b.type === 'town_center');
  for (let r = 4; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = tc.x + dx, y = tc.y + dy;
    if (canPlace(g, pid, 'farm', x, y)) return g.addBuilding('farm', pid, x, y, constructed);
  }
  throw new Error('no room for a farm');
};
const villager = (g, pid) => [...g.units.values()].find(u => u.owner === pid && u.type === 'villager');
// Food player 0 gathers in `ticks` with one villager on a Farm (or the nearest berry bush), in `age`.
const gatherIn = (age, target, ticks = 1200) => {
  const g = createGame({ seed: 1 }); g.players[0].age = age;
  const v = villager(g, 0);
  const res = target === 'farm' ? placeFarm(g, 0)
    : [...g.resources.values()].filter(r => r.type === 'berry').sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
  assert.equal(g.command(0, { type: 'gather', ids: [v.id], resourceId: res.id }).ok, true);
  for (let i = 0; i < ticks; i++) g.tick();
  return g.players[0].gathered;
};

test('every era has a Farm row; capacity and speed never fall, and Stone keeps the old 400 food at normal speed', () => {
  assert.deepEqual(Object.keys(FARM), AGES);
  assert.deepEqual(FARM.stone, { amount: 400, rate: 1 });
  for (let i = 1; i < AGES.length; i++) {
    const a = FARM[AGES[i - 1]], b = FARM[AGES[i]];
    assert.ok(b.amount > a.amount && b.rate > a.rate, `${AGES[i]} does not grow on ${AGES[i - 1]}`);
  }
  assert.equal(farmStats('nope'), FARM.stone);
});

test('a new Farm holds its owner\'s era\'s food', () => {
  for (const age of AGES) {
    const g = createGame({ seed: 1 }); g.players[0].age = age;
    const f = placeFarm(g, 0);
    assert.equal(f.amount, FARM[age].amount, age); assert.equal(f.maxAmount, FARM[age].amount, age);
  }
});

test('advancing grows the owner\'s Farms and keeps their fraction of food left; the other player\'s stay', () => {
  const g = createGame({ seed: 1 }), p = g.players[0];
  const half = placeFarm(g, 0), fresh = placeFarm(g, 0, false), theirs = placeFarm(g, 1);
  half.amount = 200;
  p.ageUp = { to: 'tool', remaining: 1 }; g.tick();
  assert.equal(p.age, 'tool');
  assert.equal(half.maxAmount, FARM.tool.amount); assert.equal(half.amount, FARM.tool.amount / 2);
  assert.equal(fresh.amount, FARM.tool.amount, 'an unfinished Farm starts full');
  assert.equal(theirs.maxAmount, FARM.stone.amount); assert.equal(theirs.amount, FARM.stone.amount);
});

test('a Farm is worked faster in later eras; berries are not', () => {
  const stone = gatherIn('stone', 'farm'), iron = gatherIn('iron', 'farm'), future = gatherIn('future', 'farm');
  assert.ok(iron > stone * 1.15, `iron ${iron} vs stone ${stone}`);
  assert.ok(future > iron * 1.4, `future ${future} vs iron ${iron}`);
  assert.equal(gatherIn('future', 'berry'), gatherIn('stone', 'berry'));
});

test('the Farm tooltip shows the player\'s era\'s capacity and speed', () => {
  assert.match(tipHtml({ kind: 'building', id: 'farm' }), /400 food/);
  assert.match(tipHtml({ kind: 'building', id: 'farm' }), /Normal/);
  const h = tipHtml({ kind: 'building', id: 'farm', age: 'future' });
  assert.match(h, /1800 food/); assert.match(h, /\+140% food gathering/);
});
