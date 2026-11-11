import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { drawFrom } from '../src/sim/ore.js';
import { FISH_AMOUNT, FISH_RETURN } from '../src/sim/fish.js';
import { roundById } from '../src/rounds/index.js';
import { createBot } from '../src/ai/bot.js';

const shoals = g => [...g.resources.values()].filter(r => r.type === 'fish');
const at = (g, spot) => shoals(g).find(r => r.x === spot.x && r.y === spot.y);
const run = (g, ticks) => { for (let i = 0; i < ticks; i++) g.tick(); };
// Empty a shoal the way a Fishing Ship does.
const fishOut = (g, shoal) => { while (shoal.amount > 0) drawFrom(g, shoal, 15); };

test('a fished-out shoal comes back full on its own tile, and again after that', () => {
  for (const options of [{ seed: 3 }, { seed: 3, mapType: 'islands' }, { seed: 3, playerCount: 4 }]) {
    const g = createGame(options), count = shoals(g).length, shoal = shoals(g)[0], spot = { x: shoal.x, y: shoal.y };
    assert.equal(shoal.amount, FISH_AMOUNT);
    for (let round = 0; round < 2; round++) {
      fishOut(g, at(g, spot));
      assert.equal(at(g, spot), undefined, 'gone once emptied');
      assert.equal(g.occAt(Math.floor(spot.x), Math.floor(spot.y)), 0);
      run(g, FISH_RETURN - 20);
      assert.equal(at(g, spot), undefined, 'not before its time');
      run(g, 40);
      const back = at(g, spot);
      assert.ok(back, 'restocked');
      assert.equal(back.amount, FISH_AMOUNT);
      assert.equal(g.occAt(Math.floor(spot.x), Math.floor(spot.y)), back.id);
      assert.equal(shoals(g).length, count, 'no shoal lost or added');
    }
  }
});

test('every shoal fished out at once is restocked: the fish never run out', () => {
  const g = createGame({ seed: 5 }), count = shoals(g).length;
  for (const shoal of shoals(g)) fishOut(g, shoal);
  assert.equal(shoals(g).length, 0);
  run(g, FISH_RETURN + 20);
  assert.equal(shoals(g).length, count);
  assert.ok(shoals(g).every(r => r.amount === FISH_AMOUNT));
});

test('a shoal waits for a ship on its tile to sail off before it returns', () => {
  const g = createGame({ seed: 3 }), shoal = shoals(g)[0], spot = { x: shoal.x, y: shoal.y };
  fishOut(g, shoal);
  const boat = g.spawnUnit('fishing_ship', 0, spot.x, spot.y);
  run(g, FISH_RETURN + 60);
  assert.equal(at(g, spot), undefined, 'held back by the hull');
  g.remove(boat);
  run(g, 20);
  assert.ok(at(g, spot), 'back once the tile is clear');
});

test('a bot goes back to fishing when its emptied shoals return', () => {
  const g = createGame({ seed: 3, rules: roundById('standard') }), bot = createBot(g, 1, 'hard');
  const step = ticks => { for (let i = 0; i < ticks && !g.result; i++) { g.tick(); if (g.time % 10 === 0) bot.think(); } };
  const fishing = () => [...g.units.values()].filter(u => u.owner === 1 && u.type === 'fishing_ship' && u.order.type === 'gather');
  for (let k = 0; k < 40 && !fishing().length; k++) step(600);
  assert.ok(fishing().length, 'the bot fishes');
  for (const shoal of shoals(g)) fishOut(g, shoal);
  step(100);
  assert.equal(fishing().length, 0, 'nothing left to fish');
  step(FISH_RETURN + 400);
  assert.ok(fishing().length, 'fishing the restocked shoals');
});
