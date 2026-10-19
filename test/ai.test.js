import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { createBot } from '../src/ai/bot.js';
import { roundById } from '../src/rounds/index.js';
import { ageIndex } from '../src/data/ages.js';
import { UNITS } from '../src/data/units.js';
import { THINK_EVERY, matchOptions } from '../src/ai/bot.js';
// Runs one bot against an idle opponent; returns the tick of its first attack wave and the tick it reached each age.
function firstWave(roundId, diff, seed = 1) {
  const rules = roundById(roundId), g = createGame({ seed, rules, ...matchOptions([null, diff]) }), b = createBot(g, 1, diff), ev = THINK_EVERY[diff], ages = {};
  let wave = null;
  while (!g.result && g.time < g.capTicks && wave === null) { g.tick(); if (g.time % ev === 3 % ev) b.think(); ages[g.players[1].age] ??= g.time; if (b.waveActive) wave = g.time; }
  return { wave, ages, age: g.players[1].age };
}
test('relaxed bot leaves a long peaceful start: no wave before 30 min or before Bronze Age', () => {
  for (const id of ['conquest', 'deathmatch', 'regicide', 'wonder']) {
    const r = firstWave(id, 'relaxed');
    if (r.wave !== null) { assert.ok(r.wave >= 36000, `${id}: wave at ${r.wave}`); assert.ok(ageIndex(r.age) >= ageIndex('bronze'), `${id}: attacked in ${r.age}`); }
  }
  const c = firstWave('conquest', 'relaxed');
  assert.ok(c.wave !== null && c.wave < 42000, 'relaxed bot still attacks well before the 40 min cap in conquest, wave at ' + c.wave);
});
test('a relaxed opponent works at half speed and lengthens the match to 40 min', () => {
  assert.deepEqual(matchOptions([null, 'relaxed']), { workRate: [1, 0.5], capTicks: 48000 });
  assert.deepEqual(matchOptions(['hard', 'easy']), { workRate: [1, 1], capTicks: undefined });
  const g = createGame({ seed: 1, rules: roundById('conquest'), ...matchOptions([null, 'relaxed']) });
  assert.equal(g.capTicks, 48000); assert.equal(createGame({ seed: 1, rules: roundById('conquest') }).capTicks, 30000);
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

// A bot set to `age` with rich resources, the listed buildings, 6 Houses and 20 villagers. pin = true holds the era
// (an age-up that never finishes) so the bot cannot advance mid-test and change what it trains.
function eraBot(age, buildings, ticks = 9000, pin = true) {
  const g = createGame({ seed: 4, rules: roundById('conquest') }), b = createBot(g, 0, 'hard'), p = g.players[0], types = new Set();
  const rich = () => { p.res = { food: 9000, wood: 9000, gold: 9000, stone: 9000 }; };
  p.age = age; rich(); if (pin) p.ageUp = { to: age, remaining: Infinity };
  const t = [...g.buildings.values()].find(x => x.owner === 0 && x.type === 'town_center');
  const slots = [[t.x - 8, t.y], [t.x + 8, t.y], [t.x, t.y + 8], [t.x, t.y - 9], [t.x + 8, t.y + 8]];
  buildings.forEach((type, i) => g.addBuilding(type, 0, slots[i][0], slots[i][1], true));
  for (const [x, y] of [[t.x - 8, t.y + 8], [t.x - 8, t.y - 8], [t.x + 8, t.y - 8], [t.x - 5, t.y + 12], [t.x + 5, t.y + 12], [t.x + 12, t.y + 4]]) g.addBuilding('house', 0, x, y, true);
  for (let k = 0; k < 20; k++) g.spawnUnit('villager', 0, t.x + 2 + k % 5, t.y + 4);
  for (let i = 0; i < ticks; i++) {
    g.tick();
    if (i % 15 === 0) { rich(); b.think(); for (const u of g.units.values()) if (u.owner === 0) types.add(u.type); }
  }
  return { g, b, p, types };
}
test('bot trains every new era unit at its building', () => {
  const table = [['medieval', ['stable', 'archery_range', 'castle'], ['knight', 'crossbowman', 'trebuchet']], ['sail', ['barracks', 'castle'], ['musketeer', 'cannon']],
    ['industrial', ['barracks', 'factory'], ['rifleman', 'field_artillery']], ['modern', ['barracks', 'factory'], ['machine_gunner', 'tank']]];
  for (const [age, buildings, want] of table) {
    const { b, types } = eraBot(age, buildings);
    for (const u of want) assert.ok(types.has(u), `${age}: trained ${u} (saw ${[...types].join(',')})`);
    assert.deepEqual(Object.keys(b.why).filter(k => k.startsWith('train')), [], `${age}: no rejected train commands`);
  }
});
test('a Medieval bot builds a Castle and advances to the Age of Sail', () => {
  const { g, b, p } = eraBot('medieval', ['barracks', 'archery_range', 'stable'], 9000, false);
  assert.ok([...g.buildings.values()].some(x => x.owner === 0 && x.type === 'castle' && x.constructed), 'built a Castle');
  assert.ok(ageIndex(p.age) >= ageIndex('sail'), 'reached the Age of Sail, at ' + p.age);
  assert.ok(b.maxRejects <= 20, 'rejects ' + b.maxRejects);
});
