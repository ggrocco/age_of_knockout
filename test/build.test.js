import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace, ageUpNeed, ageBuildings } from '../src/sim/commands.js';
import { AGES, AGE_POP_LIMIT, popLimit } from '../src/data/ages.js';
const freeSpot = (g, p, type, skip = []) => { const t = tc(g, p); for (let r = 3; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(t.x) + dx, y = Math.floor(t.y) + dy; if (skip.some(k => Math.abs(k.x - x) < 4 && Math.abs(k.y - y) < 4)) continue; if (canPlace(g, p, type, x, y)) return { x, y }; } };
const mine = (g, p, type) => [...g.units.values()].filter(u => u.owner === p && u.type === type);
const tc = (g, p) => [...g.buildings.values()].find(b => b.owner === p && b.type === 'town_center');
const spot = (g, p) => { const t = tc(g, p); return { x: Math.floor(t.x) - 4, y: Math.floor(t.y) }; };
test('build deducts cost and constructs over time', () => {
  const g = createGame({ seed: 1 }); const v = mine(g, 0, 'villager')[0], w = g.players[0].res.wood, s = spot(g, 0);
  const r = g.command(0, { type: 'build', ids: [v.id], building: 'house', x: s.x, y: s.y }); assert.equal(r.ok, true, r.reason);
  assert.equal(g.players[0].res.wood, w - 30);
  const b = [...g.buildings.values()].find(b => b.type === 'house' && b.owner === 0); assert.equal(b.constructed, false);
  for (let i = 0; i < 800; i++) g.tick();
  assert.equal(b.constructed, true); assert.equal(g.players[0].popCap, 14);
});
test('bad placement rejected, nothing spent', () => {
  const g = createGame({ seed: 1 }); const v = mine(g, 0, 'villager')[0], before = { ...g.players[0].res }, t = tc(g, 0);
  for (const [x, y] of [[t.x, t.y], [-3, 5], [g.map.size, 5]]) {
    const r = g.command(0, { type: 'build', ids: [v.id], building: 'house', x, y }); assert.equal(r.ok, false);
  }
  assert.deepEqual(g.players[0].res, before);
});
test('placement in unexplored area rejected', () => {
  const g = createGame({ seed: 1 }); const v = mine(g, 0, 'villager')[0];
  const r = g.command(0, { type: 'build', ids: [v.id], building: 'house', x: g.map.size - 8, y: g.map.size - 8 });
  assert.equal(r.ok, false);
});
test('train: rejected without resources or at pop cap; works otherwise', () => {
  const g = createGame({ seed: 1 }); const t = tc(g, 0), p = g.players[0];
  p.res.food = 10; let r = g.command(0, { type: 'train', buildingId: t.id, unit: 'villager' }); assert.equal(r.ok, false); assert.equal(p.res.food, 10);
  p.res.food = 5000;
  for (let i = 0; i < 20; i++) { g.command(0, { type: 'train', buildingId: t.id, unit: 'villager' }); }
  assert.ok(t.queue.length <= 5);
  const g2 = createGame({ seed: 1 }); g2.players[0].res.food = 5000; const t2 = tc(g2, 0);
  for (let i = 0; i < 3000; i++) { g2.command(0, { type: 'train', buildingId: t2.id, unit: 'villager' }); g2.tick(); }
  assert.ok(mine(g2, 0, 'villager').length <= 10, 'pop capped at 10 without houses');
  assert.equal(g2.command(0, { type: 'train', buildingId: t2.id, unit: 'clubman' }).ok, false);
});
test('population cap grows with houses up to a per-age limit: 50 in Stone, 200 in AI Future', () => {
  assert.deepEqual(Object.keys(AGE_POP_LIMIT), AGES);
  for (let i = 1; i < AGES.length; i++) assert.ok(popLimit(AGES[i]) > popLimit(AGES[i - 1]), AGES[i] + ' raises the limit');
  assert.equal(popLimit('stone'), 50); assert.equal(popLimit('future'), 200);
  const g = createGame({ seed: 1 }), p = g.players[0], t = tc(g, 0);
  for (let n = 0; n < 60; n++) { const s = freeSpot(g, 0, 'house'); if (!s) break; g.addBuilding('house', 0, s.x, s.y, true); }
  const houses = [...g.buildings.values()].filter(b => b.owner === 0 && b.type === 'house').length, housing = 10 + 4 * houses;
  assert.ok(housing > popLimit('iron'), `enough houses to pass several limits (${housing})`);
  g.recount(); assert.equal(p.popCap, 50, 'Stone Age stops at 50 however many houses');
  for (const age of AGES) { p.age = age; g.recount(); assert.equal(p.popCap, Math.min(popLimit(age), housing), age); }
  p.age = 'stone'; p.res.food = 5000; g.recount();
  while (p.pop < p.popCap) { g.spawnUnit('villager', 0, t.x + 4, t.y + 4); g.recount(); }
  assert.deepEqual(g.command(0, { type: 'train', buildingId: t.id, unit: 'villager' }), { ok: false, reason: 'pop limit' }, 'at the Stone limit: advance, not more houses');
  p.age = 'tool'; g.recount(); assert.equal(g.command(0, { type: 'train', buildingId: t.id, unit: 'villager' }).ok, true, 'the Tool Age lifts it');
});
test('age up requires buildings, cost, and gates units', () => {
  const g = createGame({ seed: 1 }); const p = g.players[0]; p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 };
  assert.equal(g.command(0, { type: 'age' }).ok, false, 'needs 2 buildings');
  const vs = mine(g, 0, 'villager'), s = spot(g, 0);
  const placed = [];
  for (const [i, type] of ['house', 'granary', 'barracks'].entries()) { const sp = freeSpot(g, 0, type, placed); placed.push(sp); assert.equal(g.command(0, { type: 'build', ids: [vs[i].id], building: type, x: sp.x, y: sp.y }).ok, true, type); }
  for (let i = 0; i < 2000; i++) g.tick();
  const b = [...g.buildings.values()].find(b => b.type === 'barracks' && b.owner === 0);
  assert.equal(g.command(0, { type: 'train', buildingId: b.id, unit: 'axeman' }).ok, false, 'axeman is Tool Age');
  const r = g.command(0, { type: 'age' }); assert.equal(r.ok, true, r.reason);
  for (let i = 0; i < 700; i++) g.tick();
  assert.equal(p.age, 'tool');
  assert.equal(g.command(0, { type: 'train', buildingId: b.id, unit: 'axeman' }).ok, true);
});

test('construct: villagers can help finish an existing foundation', () => {
  const g = createGame({ seed: 1 }); const vs = mine(g, 0, 'villager'); const sp = freeSpot(g, 0, 'house', []);
  g.command(0, { type: 'build', ids: [vs[0].id], building: 'house', x: sp.x, y: sp.y });
  const b = [...g.buildings.values()].find(b => b.type === 'house' && b.owner === 0);
  assert.equal(g.command(0, { type: 'construct', ids: [vs[1].id, vs[2].id], targetId: b.id }).ok, true);
  assert.equal(g.command(1, { type: 'construct', ids: [], targetId: b.id }).ok, false, 'enemy cannot');
  for (let i = 0; i < 300; i++) g.tick(); assert.equal(b.constructed, true, 'three builders finish a house fast');
});
test('ageUpNeed: every Age but the last needs two buildings of its own (Wonder and Farm excluded)', () => {
  assert.deepEqual(AGES.slice(0, -1).map(ageUpNeed), [2, 2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(AGES.slice(2, -1).map(ageBuildings), [['government_center', 'temple'], ['academy', 'siege_workshop'], ['castle', 'university'],
    ['arsenal', 'trading_company'], ['factory', 'railway_station'], ['power_plant', 'airfield']]);
});
test('bronze age advances to iron with a Government Center and a Temple; no Wonder required', () => {
  const g = createGame({ seed: 1 }); const p = g.players[0]; p.age = 'bronze'; p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 };
  assert.equal(g.command(0, { type: 'age' }).reason, 'needs buildings', 'needs bronze buildings first');
  const t = tc(g, 0); g.addBuilding('government_center', 0, t.x, t.y + 8, true); g.addBuilding('wonder', 0, t.x - 9, t.y - 9, true);
  assert.equal(g.command(0, { type: 'age' }).reason, 'needs buildings', 'the Wonder does not count');
  g.addBuilding('temple', 0, t.x + 8, t.y, true);
  const r = g.command(0, { type: 'age' }); assert.equal(r.ok, true, r.reason);
  for (let i = 0; i < 1100; i++) g.tick();
  assert.equal(p.age, 'iron');
});
test('iron advances to medieval; AI Future is the max age', () => {
  const g = createGame({ seed: 1 }); const p = g.players[0], t = tc(g, 0); p.age = 'iron'; p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 };
  g.addBuilding('academy', 0, t.x, t.y + 8, true); g.addBuilding('siege_workshop', 0, t.x + 8, t.y, true);
  const r = g.command(0, { type: 'age' }); assert.equal(r.ok, true, r.reason);
  for (let i = 0; i < 1100; i++) g.tick();
  assert.equal(p.age, 'medieval');
  p.age = 'future'; const again = g.command(0, { type: 'age' }); assert.equal(again.ok, false); assert.equal(again.reason, 'max age');
});
const rich = p => { p.res = { food: 9000, wood: 9000, gold: 9000, stone: 9000 }; };
test('every Age from Bronze to Modern needs both of its gate buildings, finished', () => {
  for (const age of AGES.slice(2, -1)) {
    const g = createGame({ seed: 1 }), p = g.players[0], t = tc(g, 0); p.age = age; rich(p);
    const [a, b] = ageBuildings(age);
    assert.equal(g.command(0, { type: 'age' }).reason, 'needs buildings', age);
    g.addBuilding(a, 0, t.x, t.y - 9, true); g.addBuilding(b, 0, t.x + 8, t.y, false);
    assert.equal(g.command(0, { type: 'age' }).reason, 'needs buildings', `${age}: an unfinished ${b} does not count`);
    g.addBuilding(b, 0, t.x - 9, t.y + 8, true);
    const r = g.command(0, { type: 'age' }); assert.equal(r.ok, true, `${age}: ${r.reason}`);
  }
});
test('iron climbs to AI Future through every era', () => {
  const g = createGame({ seed: 1 }), p = g.players[0], t = tc(g, 0); p.age = 'iron';
  const spots = [[0, -9], [8, 0], [-9, 8], [8, 8], [-9, -9], [8, -9], [0, 8], [-9, 0], [12, 4], [4, 12], [-13, 4], [4, -13]];
  AGES.slice(3, -1).flatMap(ageBuildings).forEach((type, i) => g.addBuilding(type, 0, t.x + spots[i][0], t.y + spots[i][1], true));
  const seen = [];
  while (p.age !== 'future') {
    rich(p); const r = g.command(0, { type: 'age' }); assert.equal(r.ok, true, `${p.age}: ${r.reason}`);
    for (let i = 0; i < 2000 && p.ageUp; i++) g.tick();
    seen.push(p.age);
  }
  assert.deepEqual(seen, ['medieval', 'sail', 'industrial', 'modern', 'future']);
});
test('era units are age-gated at their buildings', () => {
  const g = createGame({ seed: 1 }), p = g.players[0], t = tc(g, 0); rich(p);
  const at = { stable: g.addBuilding('stable', 0, t.x, t.y + 8, true), archery_range: g.addBuilding('archery_range', 0, t.x + 8, t.y + 8, true), barracks: g.addBuilding('barracks', 0, t.x - 8, t.y, true),
    castle: g.addBuilding('castle', 0, t.x, t.y - 9, true), factory: g.addBuilding('factory', 0, t.x + 8, t.y, true) };
  g.addBuilding('house', 0, t.x - 8, t.y + 8, true); g.addBuilding('house', 0, t.x - 8, t.y - 8, true); g.tick();
  p.age = 'iron'; assert.equal(g.command(0, { type: 'train', buildingId: at.stable.id, unit: 'knight' }).reason, 'age');
  p.age = 'modern';
  for (const [u, b] of [['knight', 'stable'], ['crossbowman', 'archery_range'], ['trebuchet', 'castle'], ['musketeer', 'barracks'], ['cannon', 'castle'], ['rifleman', 'barracks'], ['field_artillery', 'factory'], ['machine_gunner', 'barracks'], ['tank', 'factory']]) {
    const r = g.command(0, { type: 'train', buildingId: at[b].id, unit: u }); assert.equal(r.ok, true, `${u}: ${r.reason}`);
  }
});
test('future units are age-gated and trainable at their buildings', () => {
  const g = createGame({ seed: 1 }); const p = g.players[0]; p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 };
  const t = tc(g, 0), ar = g.addBuilding('archery_range', 0, t.x + 8, t.y, true), gc = g.addBuilding('government_center', 0, t.x, t.y + 8, true), bk = g.addBuilding('barracks', 0, t.x - 8, t.y, true);
  p.age = 'iron'; assert.equal(g.command(0, { type: 'train', buildingId: ar.id, unit: 'drone' }).ok, false, 'drone needs future');
  p.age = 'future';
  for (const [b, u] of [[ar, 'drone'], [bk, 'mech'], [gc, 'railgun']]) assert.equal(g.command(0, { type: 'train', buildingId: b.id, unit: u }).ok, true, u);
});
test('railgun cannot carry relics', () => {
  const g = createGame({ seed: 1 }); const r = g.spawnRelic(20.5, 20.5), u = g.spawnUnit('railgun', 0, 20.5, 20.5);
  const res = g.command(0, { type: 'relic', ids: [u.id], relicId: r.id }); assert.equal(res.ok, false); assert.equal(res.reason, 'no carriers');
});

// Interrupting work with a build: the villager picks the interrupted job back up once the new building is done.
const nearestRes = (g, v, type) => [...g.resources.values()].filter(r => r.type === type).sort((a, b) => Math.hypot(a.x - v.x, a.y - v.y) - Math.hypot(b.x - v.x, b.y - v.y))[0];
const houseAt = (g, s) => [...g.buildings.values()].find(b => b.type === 'house' && b.owner === 0 && b.x === s.x && b.y === s.y);
const tickUntil = (g, f, n = 2000) => { for (let i = 0; i < n && !f(); i++) g.tick(); };
test('a gatherer told to build goes back to the same resource once the building is done', () => {
  const g = createGame({ seed: 1 }), v = mine(g, 0, 'villager')[0], tree = nearestRes(g, v, 'tree'), s = freeSpot(g, 0, 'house');
  g.command(0, { type: 'gather', ids: [v.id], resourceId: tree.id }); for (let i = 0; i < 100; i++) g.tick();
  assert.equal(g.command(0, { type: 'build', ids: [v.id], building: 'house', x: s.x, y: s.y }).ok, true);
  assert.equal(v.order.type, 'build'); assert.equal(v.order.resume.type, 'gather'); assert.equal(v.order.resume.res, tree.id);
  const h = houseAt(g, s); tickUntil(g, () => h.constructed); g.tick(); g.tick();
  assert.equal(v.order.type, 'gather'); assert.equal(v.order.res, tree.id, 'back on the same tree'); assert.equal(v.order.resume, undefined);
});
test('a builder told to build something else finishes it, then the first building, then goes back to work', () => {
  const g = createGame({ seed: 1 }), v = mine(g, 0, 'villager')[0], gold = nearestRes(g, v, 'gold'), a = freeSpot(g, 0, 'house'), b = freeSpot(g, 0, 'house', [a]);
  g.command(0, { type: 'gather', ids: [v.id], resourceId: gold.id }); g.tick();
  g.command(0, { type: 'build', ids: [v.id], building: 'house', x: a.x, y: a.y }); for (let i = 0; i < 60; i++) g.tick();
  g.command(0, { type: 'build', ids: [v.id], building: 'house', x: b.x, y: b.y });
  const ha = houseAt(g, a), hb = houseAt(g, b);
  assert.equal(v.order.target, hb.id); assert.equal(v.order.resume.target, ha.id); assert.equal(v.order.resume.resume.res, gold.id);
  tickUntil(g, () => hb.constructed); g.tick(); g.tick();
  assert.equal(ha.constructed, false); assert.equal(v.order.type, 'build'); assert.equal(v.order.target, ha.id, 'back to the first foundation');
  tickUntil(g, () => ha.constructed); g.tick(); g.tick();
  assert.equal(v.order.type, 'gather'); assert.equal(v.order.res, gold.id, 'then back to the gold mine');
});
test('a finished farm is the last job of the chain: earlier builds first, then farm it instead of the old resource', () => {
  const g = createGame({ seed: 1 }), p = g.players[0], [v, w] = mine(g, 0, 'villager'), tree = nearestRes(g, v, 'tree'); p.res.wood = 1000;
  const a = freeSpot(g, 0, 'farm'); g.command(0, { type: 'build', ids: [v.id], building: 'farm', x: a.x, y: a.y });
  const fa = [...g.buildings.values()].find(b => b.type === 'farm'); tickUntil(g, () => fa.constructed); g.tick(); g.tick();
  assert.equal(v.order.type, 'gather'); assert.equal(v.order.res, fa.id, 'an idle builder farms what it built');
  g.command(0, { type: 'gather', ids: [w.id], resourceId: tree.id }); g.tick();
  const h = freeSpot(g, 0, 'house', [a]); g.command(0, { type: 'build', ids: [w.id], building: 'house', x: h.x, y: h.y });
  const hh = houseAt(g, h); for (let i = 0; i < 40; i++) g.tick();
  const f = freeSpot(g, 0, 'farm', [a, h]); g.command(0, { type: 'build', ids: [w.id], building: 'farm', x: f.x, y: f.y });
  const fb = [...g.buildings.values()].find(b => b.type === 'farm' && b !== fa);
  tickUntil(g, () => fb.constructed); g.tick(); g.tick();
  assert.equal(hh.constructed, false); assert.equal(w.order.type, 'build'); assert.equal(w.order.target, hh.id, 'the unfinished house first');
  tickUntil(g, () => hh.constructed); g.tick(); g.tick();
  assert.equal(w.order.type, 'gather'); assert.equal(w.order.res, fb.id, 'then the new farm, not the tree');
});
test('a drop-off in progress resumes as a drop-off', () => {
  const g = createGame({ seed: 1 }), v = mine(g, 0, 'villager')[0], tree = nearestRes(g, v, 'tree'), s = freeSpot(g, 0, 'house');
  g.command(0, { type: 'gather', ids: [v.id], resourceId: tree.id }); tickUntil(g, () => v.order.phase === 'drop');
  g.command(0, { type: 'build', ids: [v.id], building: 'house', x: s.x, y: s.y });
  assert.equal(v.order.resume.phase, 'drop', 'carries its load home first');
});
test('a destroyed foundation sends the villager back to work; move and construct-on-itself do not stack', () => {
  const g = createGame({ seed: 1 }), [v, w] = mine(g, 0, 'villager'), tree = nearestRes(g, v, 'tree'), s = freeSpot(g, 0, 'house');
  g.command(0, { type: 'gather', ids: [v.id, w.id], resourceId: tree.id }); g.tick();
  g.command(0, { type: 'build', ids: [v.id, w.id], building: 'house', x: s.x, y: s.y }); const h = houseAt(g, s);
  const before = v.order; g.command(0, { type: 'construct', ids: [v.id], targetId: h.id });
  assert.equal(v.order, before, 're-ordering onto its own foundation keeps the order (no self-resume)');
  g.command(0, { type: 'move', ids: [w.id], x: w.x + 2, y: w.y }); assert.equal(w.order.resume, undefined, 'a move drops the chain');
  g.command(0, { type: 'delete', id: h.id }); g.tick(); g.tick();
  assert.equal(v.order.type, 'gather'); assert.equal(v.order.res, tree.id, 'foundation gone: back to the tree');
  const idle = mine(g, 0, 'villager')[2]; g.command(0, { type: 'build', ids: [idle.id], building: 'house', x: s.x, y: s.y });
  assert.equal('resume' in idle.order, false, 'nothing to resume: no resume key');
});
