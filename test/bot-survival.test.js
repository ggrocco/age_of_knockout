// The bot keeps itself alive: Docks only on open water, villagers run from soldiers and are replaced, a wave forms up
// before it attacks, pulls back when it is losing and comes home when the base is attacked.
import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { createBot, bigWater, OPEN_WATER, THINK_EVERY } from '../src/ai/bot.js';
import { roundById } from '../src/rounds/index.js';
import { centerOf, passable, flood4 } from '../src/sim/util.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Tiles in the body of navigable water holding tile index i.
function waterBody(map, i) {
  const seen = new Set([i]);
  flood4(map.size, i, j => !seen.has(j) && passable(map.tiles[j], true) && !!seen.add(j));
  return seen.size;
}

test('a bot never builds its Dock on a pond', () => {
  // Rivers seeds 29 and 39 have a pond nearer each start than the home bay; the bots used to put their Docks there.
  for (const seed of [29, 39]) {
    const g = createGame({ seed, rules: roundById('conquest') }), open = bigWater(g.map);
    const bots = [0, 1].map(pid => createBot(g, pid, 'medium'));
    for (const p of g.players) { p.age = 'tool'; p.res = { food: 9999, wood: 9999, gold: 9999, stone: 9999 }; }
    for (let t = 0; t < 3000; t++) { if (t % 15 === 0) bots.forEach(b => b.think()); g.tick(); }
    const docks = [...g.buildings.values()].filter(b => b.type === 'dock');
    assert.ok(docks.length >= 1, `seed ${seed}: a Dock went up`);
    for (const dock of docks) {
      const i = (dock.y + 1) * g.map.size + dock.x + 1;
      assert.ok(open[i] && waterBody(g.map, i) >= OPEN_WATER, `seed ${seed}: Dock of p${dock.owner} on ${waterBody(g.map, i)} tiles of water`);
    }
  }
});

// A hard bot (player 0) with a working economy, against an idle player 1.
function economy(ticks = 1800) {
  // No win check: the hard bot would otherwise finish off its idle opponent mid-test.
  const g = createGame({ seed: 4, rules: { ...roundById('conquest'), check: () => null }, capTicks: Infinity }), b = createBot(g, 0, 'hard'), p = g.players[0];
  const run = n => { for (let i = 0; i < n; i++) { g.tick(); if (g.time % THINK_EVERY.hard === 0) b.think(); } };
  run(ticks);
  const home = centerOf([...g.buildings.values()].find(x => x.owner === 0 && x.type === 'town_center'));
  const villagers = () => [...g.units.values()].filter(u => u.owner === 0 && u.type === 'villager');
  return { g, b, p, run, home, villagers };
}

test('villagers out at work run home from enemy soldiers and are kept off that work while the soldiers stay', () => {
  const { g, b, run, home, villagers } = economy();
  const worker = villagers().filter(u => u.order.type === 'gather' && dist(u, home) > 8).sort((a, c) => dist(c, home) - dist(a, home))[0];
  assert.ok(worker, 'a villager gathers away from home');
  const spot = { x: worker.x, y: worker.y };
  for (let k = 0; k < 3; k++) g.spawnUnit('axeman', 1, spot.x + 2 + k * 0.5, spot.y + 2);
  g.tick(); b.think();
  assert.equal(worker.order.type, 'move', `the villager runs (order ${worker.order.type})`);
  assert.ok(dist({ x: worker.order.x, y: worker.order.y }, home) < 6, 'towards home');
  run(400);
  const backThere = villagers().filter(u => u.order.type === 'gather' && dist(u, spot) < 4);
  assert.equal(backThere.length, 0, 'nobody is sent back to work beside the soldiers');
});

test('lost villagers are trained again even when the army fills the population', () => {
  const { g, p, run, villagers } = economy(18000);
  const before = villagers().length;
  assert.ok(p.pop >= p.popCap - 2, `the population is full (${p.pop}/${p.popCap})`);
  const victims = villagers().slice(0, 8);
  for (const v of victims) g.damage(v, v.hp, null);
  run(3600); // the Town Center trains one at a time
  assert.ok(villagers().length >= before - 2, `villagers back from ${before - 8} to ${villagers().length} of ${before}`);
});

// Medium bot (player 1) against an idle player 0, run until its first wave with `strategy` sets out.
function waveWith(strategy) {
  const g = createGame({ seed: 1, rules: roundById('conquest') }), b = createBot(g, 1, 'medium'), ev = THINK_EVERY.medium;
  b.strategy = strategy;
  const soldiers = () => [...g.units.values()].filter(u => u.owner === 1 && u.cls !== 'civ' && u.type !== 'king' && !u.naval);
  const step = () => { g.tick(); if (g.time % ev === 3 % ev) b.think(); };
  while (!b.waveActive && g.time < 24000) step();
  assert.ok(b.waveActive, 'the wave started');
  const home = centerOf([...g.buildings.values()].find(x => x.owner === 1 && x.type === 'town_center'));
  return { g, b, soldiers, step, home };
}
const commanded = u => u.order.type === 'attack' && !u.order.auto;

test('a wave forms up at a rally point and a staging point before it attacks', () => {
  const { g, b, soldiers, step } = waveWith('assault');
  assert.ok(b.march, 'the wave marches first');
  const points = b.march.points;
  assert.equal(points.length, 2, 'a rally point at home and a staging point short of the enemy base');
  let formed = null;
  while (g.time - b.waveAt < 6000 && b.march) {
    step();
    assert.ok(!soldiers().some(commanded), 'no attack orders while the wave forms up');
    if (!b.march) formed = soldiers();
  }
  assert.ok(formed, 'the march ended');
  const staging = points[1], near = formed.filter(u => dist(u, staging) < 9);
  assert.ok(near.length >= formed.length * 0.7, `${near.length} of ${formed.length} formed up at the staging point`);
  while (g.time - b.waveAt < 6000 && !soldiers().some(commanded)) step();
  assert.ok(soldiers().some(commanded), 'then the wave attacks');
});

test('a wave that is losing pulls back home instead of dying', () => {
  const { g, b, soldiers, step, home } = waveWith('assault');
  while (b.march && g.time - b.waveAt < 6000) step();
  const army = soldiers(), centre = { x: army.reduce((s, u) => s + u.x, 0) / army.length, y: army.reduce((s, u) => s + u.y, 0) / army.length };
  for (const u of army.slice(0, Math.ceil(army.length * 0.6))) g.damage(u, u.hp, null);
  const left = soldiers();
  for (let k = 0; k < left.length + 2; k++) g.spawnUnit('swordsman', 0, centre.x + 3 + (k % 4), centre.y + 3 + Math.floor(k / 4));
  for (let k = 0; k < THINK_EVERY.medium && b.waveActive; k++) step();
  assert.equal(b.waveActive, false, 'the wave is over');
  assert.ok(b.restUntil > g.time, 'and the army rests before the next one');
  const away = soldiers().filter(u => dist(u, home) > 8);
  assert.ok(away.length && away.every(u => u.order.type === 'move'), 'the survivors walk home');
});

test('a big attack on the base calls the wave home to fight', () => {
  const { g, b, soldiers, step, home } = waveWith('assault');
  while (b.march && b.march.stage < 1 && g.time - b.waveAt < 6000) step();
  while (soldiers().filter(u => dist(u, home) >= 25).length < soldiers().length / 2 && g.time - b.waveAt < 6000) step();
  const out = soldiers().length;
  for (let k = 0; k < Math.max(4, out); k++) g.spawnUnit('axeman', 0, home.x + 4 + (k % 4), home.y + 4 + Math.floor(k / 4));
  for (let k = 0; k < THINK_EVERY.medium && b.waveActive; k++) step();
  assert.equal(b.waveActive, false, 'the wave is called off');
  const raiders = new Set([...g.units.values()].filter(u => u.owner === 0 && u.type === 'axeman').map(u => u.id));
  const defending = soldiers().filter(u => u.order.type === 'attack' && raiders.has(u.order.target));
  assert.ok(defending.length >= soldiers().length * 0.8, `${defending.length} of ${soldiers().length} turn on the attackers`);
});
