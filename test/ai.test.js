import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { createBot } from '../src/ai/bot.js';
import { roundById } from '../src/rounds/index.js';
import { ageIndex } from '../src/data/ages.js';
import { UNITS } from '../src/data/units.js';
import { THINK_EVERY } from '../src/ai/bot.js';
// Runs one bot against an idle opponent; returns the tick of its first attack wave and the tick it reached each age.
function firstWave(roundId, diff, seed = 1) {
  const rules = roundById(roundId), g = createGame({ seed, rules }), b = createBot(g, 1, diff), ev = THINK_EVERY[diff], ages = {};
  let wave = null;
  while (!g.result && g.time < rules.capTicks && wave === null) { g.tick(); if (g.time % ev === 3 % ev) b.think(); ages[g.players[1].age] ??= g.time; if (b.waveActive) wave = g.time; }
  return { wave, ages, age: g.players[1].age };
}
test('relaxed bot leaves a long peaceful start: no wave before ~15 min or before Bronze Age', () => {
  for (const id of ['conquest', 'deathmatch', 'regicide', 'wonder']) {
    const r = firstWave(id, 'relaxed');
    if (r.wave !== null) { assert.ok(r.wave >= 18000, `${id}: wave at ${r.wave}`); assert.ok(ageIndex(r.age) >= ageIndex('bronze'), `${id}: attacked in ${r.age}`); }
  }
  const c = firstWave('conquest', 'relaxed');
  assert.ok(c.wave !== null && c.wave < 24000, 'relaxed bot still attacks eventually in conquest, wave at ' + c.wave);
});
test('easy bot waits for Tool Age before its first wave', () => {
  const r = firstWave('conquest', 'easy'); assert.ok(r.wave !== null); assert.ok(r.wave >= r.ages.tool, `wave ${r.wave} before tool ${r.ages.tool}`);
});
test('bot builds an economy and army in 10 minutes without command spam', () => {
  const g = createGame({ seed: 4, rules: roundById('conquest') }); const b = createBot(g, 0, 'medium'), o = createBot(g, 1, 'easy');
  for (let i = 0; i < 12000 && !g.result; i++) { g.tick(); if (i % 15 === 0) b.think(); if (i % 30 === 0) o.think(); }
  const mine = [...g.units.values()].filter(u => u.owner === 0), bl = [...g.buildings.values()].filter(x => x.owner === 0);
  console.log('   vills', mine.filter(u => u.type === 'villager').length, 'army', mine.filter(u => u.cls !== 'civ').length, 'houses', bl.filter(x => x.type === 'house').length, 'age', g.players[0].age, 'maxRejects', b.maxRejects, 'res', JSON.stringify(g.players[0].res), 'result', JSON.stringify(g.result));
  assert.ok(mine.filter(u => u.type === 'villager').length >= 15 || g.result);
  assert.ok(bl.filter(x => x.type === 'house').length >= 2 || g.result);
  assert.ok(ageIndex(g.players[0].age) >= 1); assert.ok(g.players[0].kills + mine.filter(u => u.cls !== 'civ').length >= 5);
  assert.ok(b.maxRejects <= 20, 'rejects ' + b.maxRejects);
});
test('bot at AI Future age trains future units and caps siege at 2', () => {
  const g = createGame({ seed: 4, rules: roundById('conquest') }); const b = createBot(g, 0, 'hard');
  const p = g.players[0]; p.age = 'future'; p.res = { food: 9000, wood: 9000, gold: 9000, stone: 9000 };
  const t = [...g.buildings.values()].find(x => x.owner === 0 && x.type === 'town_center');
  g.addBuilding('barracks', 0, t.x - 8, t.y, true); g.addBuilding('archery_range', 0, t.x + 8, t.y, true); g.addBuilding('government_center', 0, t.x, t.y + 8, true);
  for (let k = 0; k < 20; k++) g.spawnUnit('villager', 0, t.x + 2 + k % 5, t.y + 4); // enough villagers that the bot starts military production
  let maxSiege = 0; const railguns = new Set(); // peak (alive + queued) siege; ids of every railgun ever seen alive
  for (let i = 0; i < 12000; i++) {
    g.tick();
    if (i % 15 === 0) {
      p.res = { food: 9000, wood: 9000, gold: 9000, stone: 9000 }; b.think();
      const alive = [...g.units.values()].filter(u => u.owner === 0 && u.cls === 'siege'), queued = [...g.buildings.values()].filter(x => x.owner === 0).reduce((n, x) => n + x.queue.filter(q => UNITS[q.unit].cls === 'siege').length, 0);
      maxSiege = Math.max(maxSiege, alive.length + queued);
      for (const u of alive) if (u.type === 'railgun') railguns.add(u.id);
    }
  }
  const mine = [...g.units.values()].filter(u => u.owner === 0);
  assert.ok(mine.some(u => ['mech', 'drone', 'railgun'].includes(u.type)), 'trained a future unit');
  assert.ok(railguns.size >= 1, 'trained a railgun (scenario must exercise the siege cap)');
  assert.ok(mine.filter(u => u.cls === 'siege').length <= 2, 'siege cap');
  assert.ok(maxSiege <= 2, 'siege alive + queued never exceeded 2, peak ' + maxSiege);
  assert.ok(b.maxRejects <= 20, 'rejects ' + b.maxRejects);
  assert.deepEqual(Object.keys(b.why).filter(k => k.startsWith('train')), [], 'bot never had a train command rejected');
});
test('bot at AI Future age falls back to affordable units when the top pick costs gold', () => {
  const g = createGame({ seed: 4, rules: roundById('conquest') }); const b = createBot(g, 0, 'hard');
  const p = g.players[0]; p.age = 'future';
  const broke = () => { p.res = { food: 9000, wood: 9000, gold: 0, stone: 9000 }; }; broke(); // gold-free economy: drone/mech/swordsman are unaffordable
  const t = [...g.buildings.values()].find(x => x.owner === 0 && x.type === 'town_center');
  g.addBuilding('barracks', 0, t.x - 8, t.y, true); g.addBuilding('archery_range', 0, t.x + 8, t.y, true);
  for (let k = 0; k < 20; k++) g.spawnUnit('villager', 0, t.x + 2 + k % 5, t.y + 4); // enough villagers that the bot starts military production
  for (let i = 0; i < 6000; i++) { g.tick(); if (i % 15 === 0) { broke(); b.think(); } }
  const mine = [...g.units.values()].filter(u => u.owner === 0);
  assert.ok(mine.some(u => u.type === 'bowman'), 'archery range trained the gold-free bowman');
  assert.ok(!mine.some(u => u.type === 'drone'), 'no drone (needs gold the bot never has)');
  assert.deepEqual(Object.keys(b.why).filter(k => k.startsWith('train')), [], 'bot never had a train command rejected');
});
