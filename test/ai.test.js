import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { createBot } from '../src/ai/bot.js';
import { roundById } from '../src/rounds/index.js';
import { ageIndex } from '../src/data/ages.js';
import { UNITS } from '../src/data/units.js';
import { THINK_EVERY, DIFF, matchOptions } from '../src/ai/bot.js';
import { updateVision } from '../src/sim/vision.js';
import { findPath } from '../src/sim/path.js';
import { centerOf, distPoint, tileOf } from '../src/sim/util.js';
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
// `res` is what the bot is given before every think (a number for all four, or a { food, wood, gold, stone } object);
// `each(g)` runs after every think. run(n) plays n more ticks the same way.
function eraBot(age, buildings, ticks = 9000, pin = true, { res = 9000, each = () => {} } = {}) {
  const g = createGame({ seed: 4, rules: roundById('conquest') }), b = createBot(g, 0, 'hard'), p = g.players[0], types = new Set();
  const rich = () => { p.res = typeof res === 'number' ? { food: res, wood: res, gold: res, stone: res } : { ...res }; };
  p.age = age; rich(); if (pin) p.ageUp = { to: age, remaining: Infinity };
  const t = [...g.buildings.values()].find(x => x.owner === 0 && x.type === 'town_center');
  const slots = [[t.x - 8, t.y], [t.x + 8, t.y], [t.x, t.y + 8], [t.x, t.y - 9], [t.x + 8, t.y + 8]];
  buildings.forEach((type, i) => g.addBuilding(type, 0, slots[i][0], slots[i][1], true));
  for (const [x, y] of [[t.x - 8, t.y + 8], [t.x - 8, t.y - 8], [t.x + 8, t.y - 8], [t.x - 5, t.y + 12], [t.x + 5, t.y + 12], [t.x + 12, t.y + 4]]) g.addBuilding('house', 0, x, y, true);
  for (let k = 0; k < 20; k++) g.spawnUnit('villager', 0, t.x + 2 + k % 5, t.y + 4);
  const run = n => {
    for (let i = 0; i < n; i++) {
      g.tick();
      if (i % 15 === 0) { rich(); b.think(); each(g); for (const u of g.units.values()) if (u.owner === 0) types.add(u.type); }
    }
  };
  run(ticks);
  return { g, b, p, types, run, tc: t };
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

// ---- towers, siege and walls (Task 16) ----
const towersOf = (g, pid) => [...g.buildings.values()].filter(b => b.owner === pid && b.type === 'tower');
// Clear the w x h block whose top-left tile is (x0, y0) of trees, mines and water; returns a tile test for the block.
const clearBox = (g, x0, y0, w, h) => {
  const n = g.map.size, inside = (x, y) => x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
  for (const r of [...g.resources.values()]) if (inside(Math.floor(r.x), Math.floor(r.y))) g.remove(r);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) g.map.tiles[y * n + x] = 0;
  return inside;
};

test('bot keeps its tower count', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(DIFF).map(([k, d]) => [k, d.towers])), { relaxed: 1, easy: 1, medium: 2, hard: 3 });
  let peak = 0;
  const { g, run, tc } = eraBot('tool', ['barracks', 'archery_range'], 6000, true, { each: g => { peak = Math.max(peak, towersOf(g, 0).length); } });
  const done = () => towersOf(g, 0).filter(t => t.constructed), home = centerOf(tc);
  assert.equal(done().length, 3, 'a hard bot in Tool has 3 finished towers within 6000 ticks');
  for (const t of towersOf(g, 0)) assert.ok(distPoint(home.x, home.y, t) <= 10, `tower at ${t.x},${t.y} is near its Town Center`);
  const lost = done()[0]; g.damage(lost, lost.hp, null);
  assert.equal(done().length, 2);
  run(3000);
  assert.equal(done().length, 3, 'the destroyed tower is rebuilt'); assert.ok(!towersOf(g, 0).includes(lost));
  assert.equal(peak, 3, 'never more than 3 at once, foundations included');
  const stone = eraBot('stone', ['barracks'], 3000);
  assert.equal(towersOf(stone.g, 0).length, 0, 'none before the Tool Age');
});

test('a tower never takes the stone the next age-up needs', () => {
  // Age of Sail -> Industrial costs 200 stone. With no food the age-up has to wait, so the stone must stay put for it.
  const res = stone => ({ res: { food: 0, wood: 9000, gold: 9000, stone } });
  const short = eraBot('sail', ['government_center'], 3000, false, res(319));
  assert.equal(short.p.ageUp, null, 'control: the age-up waits for food'); assert.equal(short.p.age, 'sail');
  assert.equal(towersOf(short.g, 0).length, 0, '319 stone: a tower would leave 199, one short of the age-up');
  const spare = eraBot('sail', ['government_center'], 3000, false, res(320));
  assert.ok(towersOf(spare.g, 0).length >= 1, '320 stone: a tower leaves the 200 the age-up needs');
});

test('in an active wave, siege with no attack order of its own goes for the nearest enemy tower it can see', () => {
  const g = createGame({ seed: 1, rules: roundById('conquest') }), n = g.map.size, b = createBot(g, 0, 'hard');
  const inBox = clearBox(g, 20, 20, 24, 24);
  assert.ok(![...g.units.values(), ...g.buildings.values()].some(e => inBox(Math.floor(e.x), Math.floor(e.y))), 'the box starts empty');
  const tower = (x, y) => g.addBuilding('tower', 1, x, y, true);
  const north = tower(30, 22), south = tower(30, 32), fogged = tower(30, 42);
  const wall = g.addBuilding('wall', 1, 26, 20, true), enemy = g.spawnUnit('swordsman', 1, 26.5, 27.5);
  const cannon = (x, y, order) => { const u = g.spawnUnit('cannon', 0, x, y); if (order) u.order = order; return u; };
  const idleN = cannon(23.5, 22.5), idleS = cannon(23.5, 32.5);
  const auto = cannon(23.5, 26.5, { type: 'attack', target: enemy.id, fails: 0, auto: true }); // aggro picked a unit
  const moving = cannon(23.5, 33.5, { type: 'move', x: 40.5, y: 33.5, slack: 0 }); // a sweep
  const far = cannon(20.5, 40.5); // the fogged tower is nearer to it than any it can see
  const onTower = cannon(23.5, 23.5, { type: 'attack', target: south.id, fails: 0 }); // on a tower, though not the nearest
  const ordered = cannon(24.5, 27.5, { type: 'attack', target: enemy.id, fails: 0 }); // a commanded attack
  const breaching = cannon(25.5, 20.5, { type: 'attack', target: wall.id, fails: 0, resume: { type: 'move', x: 40.5, y: 20.5, slack: 0 } });
  const kept = [onTower, ordered, breaching].map(u => [u, u.order]);
  g.recount(); updateVision(g);
  const seen = t => g.players[0].visible[Math.floor(centerOf(t).y) * n + Math.floor(centerOf(t).x)] === 1;
  assert.ok(seen(north) && seen(south), 'control: two towers in sight'); assert.ok(!seen(fogged), 'control: one in the fog');
  assert.ok(distPoint(far.x, far.y, fogged) < distPoint(far.x, far.y, south), 'control: and it is the nearer one');
  b.think();
  assert.equal(idleN.order.type, 'idle', 'no wave yet: siege is left alone');
  b.waveActive = true; b.think();
  const on = u => u.order.type === 'attack' && !u.order.auto ? g.entities.get(u.order.target) : null;
  assert.equal(on(idleN), north); assert.equal(on(idleS), south, 'each idle cannon takes the tower nearest it');
  assert.equal(on(auto), north, 'an auto-aggro attack on a unit gives way to the tower');
  assert.equal(on(moving), south, 'so does a move');
  assert.equal(on(far), south, 'a tower in the fog does not count');
  for (const [u, o] of kept) assert.equal(u.order, o, `cannon ${u.id} keeps its order`);
  const orders = [idleN, idleS, auto, moving, far].map(u => u.order), issued = b.issued;
  b.think();
  assert.deepEqual([idleN, idleS, auto, moving, far].map(u => u.order), orders, 'once on a tower, it keeps it');
  assert.equal(b.issued, issued, 'and no attack command is re-sent');
});

test('a hard Death Match army breaks into a walled, towered base', () => {
  const g = createGame({ seed: 1, rules: roundById('deathmatch') });
  g.time = 9000; for (const p of g.players) p.age = 'sail'; // Cannons for the attacker; Sail-era walls and towers for the defender
  const tc = [...g.buildings.values()].find(x => x.owner === 1 && x.type === 'town_center');
  assert.deepEqual([tc.x, tc.y], [52, 26], 'control: where seed 1 puts it');
  // one closed ring of walls round the 13 x 13 block (47, 21)-(59, 33), 5 tiles out from the Town Center, cleared first
  const x0 = 47, y0 = 21, side = 13; clearBox(g, x0, y0, side, side);
  const walls = [];
  for (let y = y0; y < y0 + side; y++) for (let x = x0; x < x0 + side; x++) if (x === x0 || y === y0 || x === x0 + side - 1 || y === y0 + side - 1) walls.push(g.addBuilding('wall', 1, x, y, true));
  const towers = [[49, 26], [53, 23], [53, 30]].map(([x, y]) => g.addBuilding('tower', 1, x, y, true)); // west, north and south of it
  const inRing = u => { const x = Math.floor(u.x), y = Math.floor(u.y); return x > x0 && x < x0 + side - 1 && y > y0 && y < y0 + side - 1; };
  // 24 mixed era units, 2 of them Cannons, 10 to 13 tiles west of the ring: out of aggro reach, so only the bot's orders move them
  const types = ['cannon', 'cannon', ...Array(6).fill('swordsman'), ...Array(4).fill('hoplite'), ...Array(4).fill('knight'), ...Array(4).fill('crossbowman'), ...Array(4).fill('musketeer')];
  const army = types.map((type, k) => g.spawnUnit(type, 0, 34.5 + k % 4, 24.5 + Math.floor(k / 4)));
  g.recount(); updateVision(g);
  assert.equal(army.length, 24); assert.ok(army.every(u => !g.blocked(Math.floor(u.x), Math.floor(u.y))), 'control: on open ground');
  assert.equal(walls.length, 48); assert.ok(towers.every(t => t.constructed && t.maxHp === 340), 'control: 3 finished Sail towers');
  assert.equal(findPath(g.map, g.blocked, tileOf(army[0]), tileOf(tc), (x, y) => distPoint(x + 0.5, y + 0.5, tc) <= 0.9), null, 'control: the ring is closed');
  const b = createBot(g, 0, 'hard');
  // A hard bot only launches its Death Match wave at DIFF.hard.dmWave (38) units. This army is smaller and already on the
  // attack: if 24 units break in, the bot's real, bigger wave does too.
  b.waveActive = true;
  const brokeIn = () => [...g.units.values()].some(u => u.owner === 0 && inRing(u)) || tc.hp < tc.maxHp;
  let ticks = 0;
  for (; ticks < 3000 && !brokeIn(); ticks++) { g.tick(); if (g.time % THINK_EVERY.hard === 0) b.think(); }
  assert.ok(brokeIn(), `inside the ring or the Town Center hit within 3000 ticks (gave up at ${ticks})`);
});

test('the bot never builds walls', () => {
  for (const diffs of [['relaxed', 'easy'], ['medium', 'hard']]) {
    const g = createGame({ seed: 1, rules: roundById('deathmatch') }), bots = diffs.map((d, i) => createBot(g, i, d)), seen = new Set(), send = g.command;
    g.command = (pid, c) => { seen.add(c.type); return send(pid, c); };
    let towers = 0;
    for (let i = 0; i < 6000 && !g.result; i++) {
      g.tick();
      diffs.forEach((d, k) => { if (g.time % THINK_EVERY[d] === (k * 3) % THINK_EVERY[d]) bots[k].think(); });
      assert.ok(![...g.buildings.values()].some(x => x.type === 'wall'), `${diffs}: no wall, ever`);
      towers = Math.max(towers, towersOf(g, 0).length + towersOf(g, 1).length);
    }
    assert.ok(!seen.has('wall'), `${diffs}: never a wall command`); assert.ok(seen.has('build'), `${diffs}: control: they do build`);
    assert.ok(towers >= 2, `${diffs}: control: towers, yes (peak ${towers})`);
  }
});

test('disabling time limits overrides difficulty caps while keeping the bot handicap', () => {
  assert.deepEqual(matchOptions([null, 'relaxed'], { noTimeLimit: true }), { workRate: [1, 0.5], capTicks: Infinity });
  assert.deepEqual(matchOptions(['hard', 'easy'], { noTimeLimit: true }), { workRate: [1, 1], capTicks: Infinity });
  assert.deepEqual(matchOptions([null, 'relaxed'], { noTimeLimit: false }), matchOptions([null, 'relaxed']));
});

test('every sweep waypoint is land the army can reach', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const g = createGame({ seed, rules: roundById('deathmatch') }), n = g.map.size;
    if (seed === 3) assert.equal(g.map.tiles[54 * n + 32], 1, 'control: seed 3 has a lake on the (32, 54) waypoint');
    for (const pid of [0, 1]) for (const wp of createBot(g, pid, 'medium').sweep) {
      assert.notEqual(g.map.tiles[wp.y * n + wp.x], 1, `seed ${seed}: waypoint ${wp.x},${wp.y} is not water`);
      const from = tileOf([...g.units.values()].find(u => u.owner === pid));
      const path = findPath(g.map, g.blocked, from, wp, (x, y) => Math.abs(x - wp.x) <= 2 && Math.abs(y - wp.y) <= 2);
      assert.ok(path, `seed ${seed}: player ${pid} can reach waypoint ${wp.x},${wp.y}`);
    }
  }
});
