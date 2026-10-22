import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace } from '../src/sim/commands.js';
import { drawFrom, spawnPatchPair, PATCH_CAP } from '../src/sim/ore.js';

const villagers = (g, p) => [...g.units.values()].filter(u => u.owner === p && u.type === 'villager');
const centre = (g, patch) => { const n = g.map.size; let x = 0, y = 0; for (const i of patch.tiles) { x += i % n + 0.5; y += Math.floor(i / n) + 0.5; } return { x: x / patch.tiles.length, y: y / patch.tiles.length }; };
// The gold patch nearest player pid's start.
const homePatch = (g, pid) => { const s = g.map.starts[pid], d = p => { const c = centre(g, p); return Math.hypot(c.x - s.x, c.y - s.y); };
  return [...g.patches.values()].filter(p => p.kind === 'gold').sort((a, b) => d(a) - d(b))[0]; };
const explore = (g, pid) => g.players[pid].explored.fill(1);
// Top-left of every 2x2 square wholly inside the patch, in tile order.
const squares = (g, patch) => { const n = g.map.size, set = new Set(patch.tiles);
  return [...patch.tiles].sort((a, b) => a - b).filter(i => [i, i + 1, i + n, i + n + 1].every(j => set.has(j))).map(i => ({ x: i % n, y: Math.floor(i / n) })); };
const rectOn = (g, patch) => squares(g, patch)[0];
// Two squares on the patch that don't overlap.
const twoSquares = (g, patch) => { const sq = squares(g, patch), a = sq[0]; return [a, sq.find(b => Math.abs(b.x - a.x) >= 2 || Math.abs(b.y - a.y) >= 2)]; };
const plainFree = (g, x, y) => { const n = g.map.size, i = y * n + x; return g.map.tiles[i] === 0 && !g.occAt(x, y) && !g.reserved.has(i); };

test('a Mine can only go wholly on one explored patch; nothing else can go on ore', () => {
  const g = createGame({ seed: 3 }), n = g.map.size, home = homePatch(g, 0), { x, y } = rectOn(g, home);
  assert.equal(home.reserve, 1500);
  assert.equal(canPlace(g, 0, 'mine', x, y), false, 'unexplored');
  explore(g, 0);
  assert.equal(canPlace(g, 0, 'mine', x, y), true);
  assert.equal(canPlace(g, 0, 'house', x, y), false, 'a house on ore');
  // Half on, half off: every 2x2 that is partly on the patch, with the rest plain free land, is refused.
  const half = [];
  for (let py = y - 3; py <= y + 4; py++) for (let px = x - 3; px <= x + 4; px++) {
    const cells = [[px, py], [px + 1, py], [px, py + 1], [px + 1, py + 1]], on = cells.filter(([cx, cy]) => g.patchAt[cy * n + cx] === home.id);
    if (on.length && on.length < 4 && cells.every(([cx, cy]) => g.patchAt[cy * n + cx] === home.id || plainFree(g, cx, cy))) half.push({ x: px, y: py, off: cells.filter(c => !on.includes(c)) });
  }
  assert.ok(half.length > 0, 'no half-on spot to test');
  for (const h of half) assert.equal(canPlace(g, 0, 'mine', h.x, h.y), false, `half-on at ${h.x},${h.y}`);
  // An emptied patch takes no Mine.
  home.reserve = 0; assert.equal(canPlace(g, 0, 'mine', x, y), false, 'empty patch'); home.reserve = 1500;
  // Two patches side by side: the off-patch tiles of a half-on spot become another patch, and the square across both is still refused.
  const h = half[0], fake = { id: 99, kind: 'gold', tiles: h.off.map(([cx, cy]) => cy * n + cx), reserve: 500, twin: 0 };
  for (const i of fake.tiles) { g.map.tiles[i] = 2; g.patchAt[i] = 99; }
  g.patches.set(99, fake);
  assert.equal(canPlace(g, 0, 'mine', h.x, h.y), false, 'across two patches');
  assert.equal(canPlace(g, 0, 'mine', x, y), true, 'still fine wholly on one');
});

test('a Mine takes its kind and amount from the patch, and two Mines share the reserve', () => {
  const g = createGame({ seed: 3 }), home = homePatch(g, 0), [ra, rb] = twoSquares(g, home);
  const a = g.addBuilding('mine', 0, ra.x, ra.y, true), b = g.addBuilding('mine', 0, rb.x, rb.y, true);
  for (const m of [a, b]) { assert.equal(m.gatherType, 'gold'); assert.equal(m.amount, 1500); assert.equal(m.patch, home.id); assert.equal(m.digging, 0); }
  assert.equal(drawFrom(g, a, 10), 10);
  assert.equal(home.reserve, 1490); assert.equal(a.amount, 1490);
  g.tick();
  assert.equal(a.amount, 1490); assert.equal(b.amount, 1490);
  assert.equal(drawFrom(g, b, 5), 5); g.tick();
  assert.equal(home.reserve, 1485); assert.equal(a.amount, 1485);
});

test('villagers gather gold from a Mine and drop it at the Town Center', () => {
  const g = createGame({ seed: 3 }), home = homePatch(g, 0), r = rectOn(g, home), m = g.addBuilding('mine', 0, r.x, r.y, true), vs = villagers(g, 0), gold0 = g.players[0].res.gold;
  assert.equal(g.command(0, { type: 'gather', ids: vs.map(v => v.id), resourceId: m.id }).ok, true);
  let dug = 0;
  for (let i = 0; i < 3000; i++) { g.tick(); dug = Math.max(dug, m.digging); }
  const got = g.players[0].res.gold - gold0, carried = vs.reduce((s, v) => s + (v.carry.type === 'gold' ? v.carry.amount : 0), 0);
  assert.ok(got > 50, 'gold delivered ' + got);
  assert.ok(Math.abs((1500 - home.reserve) - (got + carried)) < 1e-6, `reserve ${home.reserve}, got ${got}, carried ${carried}`);
  assert.equal(m.amount, home.reserve);
  assert.ok(dug >= 1 && dug <= 3, 'digging ' + dug);
});

test('an emptied patch collapses its Mines and foundations, reverts to land, and spawns a mirrored pair', () => {
  const g = createGame({ seed: 3 }), n = g.map.size, home = homePatch(g, 0), [ra, rb] = twoSquares(g, home);
  const built = g.addBuilding('mine', 0, ra.x, ra.y, true), found = g.addBuilding('mine', 0, rb.x, rb.y, false);
  const [v, w, bld] = villagers(g, 0), put = (u, b) => { const sp = g.findSpawn(b); u.x = sp.x; u.y = sp.y; u.path = null; };
  put(v, built); put(w, built); put(bld, found);
  w.carry = { type: 'gold', amount: 7 }; // already carrying when the patch empties
  assert.equal(g.command(0, { type: 'gather', ids: [v.id, w.id], resourceId: built.id }).ok, true);
  assert.equal(g.command(0, { type: 'construct', ids: [bld.id], targetId: found.id }).ok, true);
  const before = new Set(g.patches.keys()), tv = g.terrainVersion, gold0 = g.players[0].res.gold;
  home.reserve = 1;
  for (let i = 0; i < 400 && g.patches.has(home.id); i++) g.tick();
  assert.equal(g.patches.has(home.id), false, 'patch never emptied');
  assert.equal(built.dead, true); assert.equal(found.dead, true);
  assert.equal(g.buildings.has(built.id), false); assert.equal(g.buildings.has(found.id), false);
  for (const i of home.tiles) { assert.equal(g.map.tiles[i], 0, 'tile ' + i); assert.equal(g.patchAt[i], 0, 'patchAt ' + i); }
  assert.ok(g.terrainVersion > tv, 'terrainVersion');
  const fresh = [...g.patches.values()].filter(p => !before.has(p.id));
  assert.equal(fresh.length, 2);
  const [p, q] = fresh;
  for (const f of fresh) { assert.equal(f.kind, 'gold'); assert.equal(f.reserve, 1500); assert.equal(f.tiles.length, 12); }
  assert.equal(p.twin, q.id); assert.equal(q.twin, p.id);
  assert.deepEqual([...p.tiles].map(i => n * n - 1 - i).sort((a, b) => a - b), [...q.tiles].sort((a, b) => a - b), 'mirrored');
  const piles = new Set([...g.resources.values()].map(r => Math.floor(r.y) * n + Math.floor(r.x)));
  for (const f of fresh) for (const i of f.tiles) {
    const x = i % n, y = Math.floor(i / n);
    assert.equal(g.map.tiles[i], 2); assert.equal(g.patchAt[i], f.id);
    assert.equal(g.occAt(x, y), 0, 'occupied ' + i); assert.equal(piles.has(i), false, 'pile on ' + i);
    for (const s of g.map.starts) assert.ok(Math.hypot(x - s.x, y - s.y) > 13, 'near a start');
  }
  for (let i = 0; i < 1500; i++) g.tick();
  assert.equal(bld.order.type, 'idle', 'builder of the collapsed foundation');
  for (const u of [v, w]) assert.ok(u.order.type === 'idle' || (u.order.type === 'gather' && u.order.kind === 'gold'), `villager ${u.id} order ${JSON.stringify(u.order)}`);
  assert.ok(g.players[0].res.gold >= gold0 + 7, 'carried gold delivered: ' + (g.players[0].res.gold - gold0));
});

test('spawnPatchPair respects PATCH_CAP and returns false on a full map', () => {
  const g = createGame({ seed: 3 }), start = g.patches.size;
  assert.ok(start + 2 <= PATCH_CAP);
  const spawn = gg => { const ok = spawnPatchPair(gg, 'stone', 1250); return { ok, ids: [...gg.patches.keys()], tiles: [...gg.map.tiles] }; };
  const first = spawn(g);
  assert.equal(first.ok, true); assert.equal(g.patches.size, start + 2);
  assert.deepEqual(spawn(createGame({ seed: 3 })), first, 'deterministic');
  for (let id = 1000; g.patches.size < PATCH_CAP - 1; id++) g.patches.set(id, { id, kind: 'gold', tiles: [], reserve: 1, twin: id });
  for (let k = 0; k < 2; k++) {
    const size = g.patches.size, tv = g.terrainVersion, tiles = [...g.map.tiles];
    assert.equal(spawnPatchPair(g, 'gold', 1500), false, 'size ' + size);
    assert.equal(g.patches.size, size); assert.equal(g.terrainVersion, tv); assert.deepEqual([...g.map.tiles], tiles);
    g.patches.set(2000, { id: 2000, kind: 'gold', tiles: [], reserve: 1, twin: 2000 });
  }
  assert.equal(g.patches.size, PATCH_CAP);
});

test('finishing a Mine sends its builders to gather gold, not food', () => {
  const g = createGame({ seed: 3 }), p = g.players[0], r = rectOn(g, homePatch(g, 0)), [v] = villagers(g, 0);
  p.age = 'tool'; explore(g, 0);
  assert.equal(g.command(0, { type: 'build', ids: [v.id], building: 'house', x: r.x, y: r.y }).reason, 'placement');
  assert.equal(g.command(0, { type: 'build', ids: [v.id], building: 'mine', x: r.x, y: r.y }).ok, true);
  assert.equal(p.res.wood, 100); assert.equal(p.res.stone, 50);
  const m = [...g.buildings.values()].find(b => b.type === 'mine');
  for (let i = 0; i < 4000 && !m.constructed; i++) g.tick();
  assert.equal(m.constructed, true);
  g.tick();
  assert.equal(v.order.type, 'gather'); assert.equal(v.order.kind, 'gold'); assert.equal(v.order.res, m.id);
});
