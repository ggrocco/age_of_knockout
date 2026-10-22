import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { BUILDINGS, REPAIR_COST, repairCost, workSpeed } from '../src/data/buildings.js';
import { TECHS } from '../src/data/techs.js';

const vills = (g, p) => [...g.units.values()].filter(u => u.owner === p && u.type === 'villager');
const tc = (g, p) => [...g.buildings.values()].find(b => b.owner === p && b.type === 'town_center');
const run = (g, n) => { for (let i = 0; i < n; i++) g.tick(); };

test('repair puts a damaged building back to full HP and charges half its build cost for that', () => {
  const g = createGame({ seed: 1 }), t = tc(g, 0), p = g.players[0], v = vills(g, 0)[0];
  p.res = { food: 0, wood: 1000, gold: 0, stone: 1000 };
  t.hp = t.maxHp - 300;
  const r = g.command(0, { type: 'repair', ids: [v.id], targetId: t.id }); assert.equal(r.ok, true, r.reason);
  assert.equal(v.order.type, 'repair');
  run(g, 20 * 120);
  assert.equal(t.hp, t.maxHp);
  const paid = repairCost('town_center', 300, t.maxHp);
  assert.ok(Math.abs(1000 - p.res.wood - paid.wood) < 1e-6, `wood paid ${1000 - p.res.wood}, expected ${paid.wood}`);
  assert.ok(Math.abs(1000 - p.res.stone - paid.stone) < 1e-6);
  assert.equal(paid.wood, BUILDINGS.town_center.cost.wood * REPAIR_COST * 300 / t.maxHp);
  assert.equal(v.order.type, 'idle', 'an idle villager stops once the building is whole');
});

test('a full repair by one villager takes as long as building it', () => {
  const g = createGame({ seed: 1 }), t = tc(g, 0), v = vills(g, 0)[0];
  g.players[0].res.wood = g.players[0].res.stone = 5000;
  v.x = t.x - 0.5; v.y = t.y + 1.5; // already beside it
  t.hp = 1;
  g.command(0, { type: 'repair', ids: [v.id], targetId: t.id });
  run(g, 20 * BUILDINGS.town_center.buildTime - 40);
  assert.ok(t.hp < t.maxHp && t.hp > t.maxHp * 0.9, `hp ${t.hp}`);
  run(g, 60);
  assert.equal(t.hp, t.maxHp);
});

test('repair rejected for whole, unfinished or enemy buildings and without villagers or resources', () => {
  const g = createGame({ seed: 1 }), t = tc(g, 0), v = vills(g, 0)[0], p = g.players[0];
  assert.equal(g.command(0, { type: 'repair', ids: [v.id], targetId: t.id }).reason, 'nothing to repair');
  t.hp -= 50;
  assert.equal(g.command(0, { type: 'repair', ids: [v.id], targetId: tc(g, 1).id }).reason, 'nothing to repair');
  tc(g, 1).hp -= 50;
  assert.equal(g.command(0, { type: 'repair', ids: [v.id], targetId: tc(g, 1).id }).reason, 'nothing to repair');
  const f = g.addBuilding('house', 0, Math.floor(t.x) - 4, Math.floor(t.y), false);
  assert.equal(g.command(0, { type: 'repair', ids: [v.id], targetId: f.id }).reason, 'nothing to repair');
  g.spawnUnit('clubman', 0, t.x - 1, t.y);
  const club = [...g.units.values()].find(u => u.type === 'clubman');
  assert.equal(g.command(0, { type: 'repair', ids: [club.id], targetId: t.id }).reason, 'no villagers');
  p.res.stone = 0;
  assert.equal(g.command(0, { type: 'repair', ids: [v.id], targetId: t.id }).reason, 'resources');
});

test('repair stops when a resource it costs runs out, spending exactly what was left', () => {
  const g = createGame({ seed: 1 }), t = tc(g, 0), v = vills(g, 0)[0], p = g.players[0];
  p.res = { food: 0, wood: 1000, gold: 0, stone: 10 };
  t.hp = 100;
  g.command(0, { type: 'repair', ids: [v.id], targetId: t.id });
  run(g, 20 * 120);
  assert.equal(p.res.stone, 0);
  const healed = t.hp - 100, expect = 10 / (BUILDINGS.town_center.cost.stone * REPAIR_COST) * t.maxHp;
  assert.ok(Math.abs(healed - expect) < 1e-6, `healed ${healed}, expected ${expect}`);
  assert.equal(v.order.type, 'idle');
});

test('a gathering villager sent to repair goes back to gathering afterwards', () => {
  const g = createGame({ seed: 1 }), t = tc(g, 0), v = vills(g, 0)[0];
  g.players[0].res.wood = g.players[0].res.stone = 1000;
  const tree = [...g.resources.values()].filter(r => r.type === 'tree').sort((a, b) => Math.hypot(a.x - t.x, a.y - t.y) - Math.hypot(b.x - t.x, b.y - t.y))[0];
  assert.equal(g.command(0, { type: 'gather', ids: [v.id], resourceId: tree.id }).ok, true);
  run(g, 100);
  t.hp = t.maxHp - 30;
  g.command(0, { type: 'repair', ids: [v.id], targetId: t.id });
  assert.equal(v.order.type, 'repair'); assert.equal(v.order.resume.type, 'gather');
  run(g, 20 * 30);
  assert.equal(t.hp, t.maxHp);
  assert.equal(v.order.type, 'gather');
});

test('several villagers repair faster than one, and repairing is deterministic', () => {
  const play = n => {
    const g = createGame({ seed: 3 }), t = tc(g, 0);
    g.players[0].res.wood = g.players[0].res.stone = 5000;
    t.hp = 1;
    g.command(0, { type: 'repair', ids: vills(g, 0).slice(0, n).map(u => u.id), targetId: t.id });
    run(g, 600);
    return { hp: t.hp, snap: JSON.stringify(g.snapshot()) };
  };
  const one = play(1), three = play(3);
  assert.ok(three.hp > one.hp * 1.5, `${three.hp} vs ${one.hp}`);
  assert.equal(play(3).snap, three.snap);
});

test('a damaged building trains slower in proportion to its HP (never below 25%) and is back to normal once repaired', () => {
  const trainTicks = hpFrac => {
    const g = createGame({ seed: 1 }), t = tc(g, 0); g.players[0].res.food = 1000;
    t.hp = t.maxHp * hpFrac;
    assert.equal(g.command(0, { type: 'train', buildingId: t.id, unit: 'villager' }).ok, true);
    const n = vills(g, 0).length; let i = 0;
    while (vills(g, 0).length === n && i < 5000) { g.tick(); i++; }
    return i;
  };
  const full = trainTicks(1), half = trainTicks(0.5), wrecked = trainTicks(0.05);
  assert.ok(Math.abs(half - full * 2) <= 2, `half HP ${half} vs full ${full}`);
  assert.ok(Math.abs(wrecked - full * 4) <= 4, `5% HP ${wrecked} vs full ${full} (floor 25%)`);
  assert.equal(workSpeed({ hp: 600, maxHp: 600 }), 1);
  assert.equal(workSpeed({ hp: 150, maxHp: 600 }), 0.25);
});

test('research slows with damage too, and repairing restores the speed', () => {
  const g = createGame({ seed: 1 }), p = g.players[0], t = tc(g, 0);
  p.age = 'tool'; p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 };
  const pit = g.addBuilding('storage_pit', 0, Math.floor(t.x) - 4, Math.floor(t.y), true);
  pit.hp = pit.maxHp / 2;
  assert.equal(TECHS.bronze_weapons.building, 'storage_pit');
  assert.equal(g.command(0, { type: 'research', buildingId: pit.id, tech: 'bronze_weapons' }).ok, true);
  const start = pit.research.remaining; g.tick();
  assert.ok(Math.abs(start - pit.research.remaining - 0.5) < 1e-9, 'half speed at half HP');
  pit.hp = pit.maxHp; g.tick();
  assert.ok(Math.abs(start - pit.research.remaining - 1.5) < 1e-9, 'full speed once whole');
});
