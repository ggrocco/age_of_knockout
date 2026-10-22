import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace } from '../src/sim/commands.js';
import { drawFrom, spawnPatchPair, updateRespawn, PATCH_CAP, RESPAWN_MIN, RESPAWN_EVERY } from '../src/sim/ore.js';
import { secs } from '../src/sim/util.js';

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
  for (const f of fresh) { assert.equal(f.kind, 'gold'); assert.equal(f.reserve, 500); assert.equal(f.startReserve, 500); assert.equal(f.tiles.length, 12); } // a third of 1500
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

const liveOf = (g, kind) => [...g.patches.values()].filter(p => p.kind === kind);
const reserveOf = (g, kind) => liveOf(g, kind).reduce((s, p) => s + p.reserve, 0);
// Empty a patch the way Mines do: through drawFrom, so exhaustPatch and the respawn run for real.
const drain = (g, p) => drawFrom(g, { patch: p.id, amount: p.reserve }, Infinity);

test('spawnPatchPair keeps each kind under its own PATCH_CAP and returns false on a full map', () => {
  assert.deepEqual(PATCH_CAP, { gold: 8, stone: 4 });
  const g = createGame({ seed: 3 });
  assert.ok(liveOf(g, 'gold').length + 2 <= PATCH_CAP.gold && liveOf(g, 'stone').length + 2 <= PATCH_CAP.stone);
  const spawn = gg => { const ok = spawnPatchPair(gg, 'gold', 800); return { ok, ids: [...gg.patches.keys()], tiles: [...gg.map.tiles] }; };
  const first = spawn(g);
  assert.equal(first.ok, true);
  assert.deepEqual(spawn(createGame({ seed: 3 })), first, 'deterministic');
  const refused = (kind, why) => {
    const size = g.patches.size, tv = g.terrainVersion, tiles = [...g.map.tiles];
    assert.equal(spawnPatchPair(g, kind, 500), false, why);
    assert.equal(g.patches.size, size); assert.equal(g.terrainVersion, tv); assert.deepEqual([...g.map.tiles], tiles);
  };
  while (liveOf(g, 'gold').length + 2 <= PATCH_CAP.gold) assert.equal(spawnPatchPair(g, 'gold', 500), true, 'room for gold');
  assert.equal(liveOf(g, 'gold').length, PATCH_CAP.gold);
  refused('gold', 'gold at its cap');
  assert.equal(spawnPatchPair(g, 'stone', 500), true, 'a full gold cap leaves stone free');
  assert.equal(liveOf(g, 'stone').length, PATCH_CAP.stone);
  refused('stone', 'stone at its cap');
  // Drain everything in turn: neither kind ever passes its cap.
  for (let k = 0; k < 40 && g.patches.size; k++) {
    const live = [...g.patches.values()]; drain(g, live[k % live.length]);
    for (const kind of ['gold', 'stone']) assert.ok(liveOf(g, kind).length <= PATCH_CAP[kind], `${kind} over its cap at step ${k}`);
  }
});

test('draining gold to its cap, then a quarry, a gold and the other quarry still respawns quarries', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const g = createGame({ seed });
    while (liveOf(g, 'gold').length + 2 <= PATCH_CAP.gold) assert.equal(spawnPatchPair(g, 'gold', 1500), true, 'seed ' + seed);
    const [q1] = liveOf(g, 'stone'), q2 = g.patches.get(q1.twin);
    assert.ok(q1 && q2, 'two map quarries, seed ' + seed);
    let before = liveOf(g, 'stone').length; drain(g, q1);
    assert.equal(liveOf(g, 'stone').length, before - 1 + 2, 'a quarry pair after the first quarry, seed ' + seed);
    drain(g, liveOf(g, 'gold')[0]);
    before = liveOf(g, 'stone').length; drain(g, q2);
    assert.equal(liveOf(g, 'stone').length, before - 1 + 2, 'a quarry pair after the other quarry, seed ' + seed);
    assert.ok(liveOf(g, 'stone').every(p => p.reserve === Math.floor(2500 / 3)), 'a third of the map quarry');
  }
});

test('a chain of drains thins each kind out and stops below RESPAWN_MIN', () => {
  const g = createGame({ seed: 3 });
  // Drain p: the kind's live reserve strictly drops; returns the new patches.
  const step = p => {
    const known = new Set(g.patches.keys()), sum = reserveOf(g, p.kind);
    drain(g, p);
    assert.ok(reserveOf(g, p.kind) < sum, `${p.kind} reserve ${sum} -> ${reserveOf(g, p.kind)}`);
    return [...g.patches.values()].filter(q => !known.has(q.id));
  };
  const stops = p => { // no respawn, and not because of the cap
    const fresh = step(p);
    assert.deepEqual(fresh, [], 'no respawn below ' + RESPAWN_MIN);
    assert.ok(liveOf(g, p.kind).length + 2 <= PATCH_CAP[p.kind], 'room under the cap, so the floor stopped it');
  };
  for (const [first, next] of [[homePatch(g, 0), 500], [liveOf(g, 'gold').find(p => p.reserve === 3000), 1000]]) {
    assert.ok(first, 'patch for ' + next);
    const fresh = step(first);
    assert.equal(fresh.length, 2);
    for (const f of fresh) { assert.equal(f.reserve, next); assert.equal(f.startReserve, next); }
    assert.ok(Math.floor(next / 3) < RESPAWN_MIN); // 166 and 333
    stops(fresh[0]);
  }
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

const piles = (g, kind) => [...g.resources.values()].filter(r => r.type === kind);
const sumOf = (g, kind) => piles(g, kind).reduce((s, r) => s + r.amount, 0);
const dropPiles = (g, kind) => { for (const r of piles(g, kind)) g.remove(r); };
const tileOfPile = (g, r) => Math.floor(r.y) * g.map.size + Math.floor(r.x);
const nearCentre = (g, i) => { const n = g.map.size, mid = (n - 1) / 2; return Math.hypot(i % n - mid, Math.floor(i / n) - mid) <= 8; };
const tickTo = (g, time) => { while (g.time < time) g.tick(); };

test('piles respawn mirrored once below 25% of the start, with a cooldown', () => {
  const g = createGame({ seed: 3 }), n = g.map.size;
  assert.ok(g.pileStart.gold > 0 && g.pileStart.stone > 0);
  // Plentiful: nothing appears at the boundary.
  const gold0 = piles(g, 'gold').length, stone0 = piles(g, 'stone').length;
  tickTo(g, RESPAWN_EVERY);
  assert.equal(piles(g, 'gold').length, gold0); assert.equal(piles(g, 'stone').length, stone0);
  // Just above the threshold still counts as plentiful.
  dropPiles(g, 'gold'); g.addResource({ type: 'gold', x: 0.5, y: 0.5, amount: 0.25 * g.pileStart.gold });
  g.time = 2 * RESPAWN_EVERY - 1; g.tick(); assert.equal(piles(g, 'gold').length, 1, 'at exactly 25% nothing spawns');
  dropPiles(g, 'gold'); // every gold pile gone: well below 25%
  tickTo(g, 3 * RESPAWN_EVERY - 1); assert.equal(piles(g, 'gold').length, 0, 'only on the boundary');
  g.tick();
  const gold = piles(g, 'gold');
  assert.equal(gold.length, 8, 'a 2x2 block and its mirror');
  const at = new Set(gold.map(r => tileOfPile(g, r)));
  for (const r of gold) {
    const i = tileOfPile(g, r);
    assert.equal(r.amount, 800);
    assert.equal(g.map.tiles[i], 0, 'plain land, not ore or water');
    assert.ok(at.has(n * n - 1 - i), 'mirror tile holds a pile');
    assert.equal(g.occAt(i % n, Math.floor(i / n)), r.id);
  }
  assert.equal(g.lastRespawn.gold, 3 * RESPAWN_EVERY);
  assert.equal(piles(g, 'stone').length, stone0, 'stone not low');
  // Cooldown: still far below the start (3200 < 25%), yet nothing for secs(120), then another cluster.
  tickTo(g, 3 * RESPAWN_EVERY + secs(120) - RESPAWN_EVERY);
  assert.equal(piles(g, 'gold').length, 8, 'cooldown');
  assert.ok(sumOf(g, 'gold') < 0.25 * g.pileStart.gold);
  tickTo(g, 3 * RESPAWN_EVERY + secs(120));
  assert.equal(piles(g, 'gold').length, 16, 'cooldown over');
});

test('respawned piles and patches keep clear of the centre and the starts', () => {
  let spawned = 0;
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const g = createGame({ seed });
    for (let k = 0; k < 6; k++) {
      dropPiles(g, 'gold'); dropPiles(g, 'stone'); g.lastRespawn = { gold: -Infinity, stone: -Infinity };
      const before = new Set([...g.resources.keys()]);
      updateRespawn(g);
      for (const r of g.resources.values()) if (!before.has(r.id)) {
        const i = tileOfPile(g, r);
        assert.ok(!nearCentre(g, i), `seed ${seed}: pile at tile ${i} within 8 of the centre`);
        for (const s of g.map.starts) assert.ok(Math.hypot(r.x - 0.5 - s.x, r.y - 0.5 - s.y) > 13);
      }
    }
    for (let k = 0; k < 6; k++) { // patches: free the cap by clearing, then respawn
      g.patches.clear();
      const known = new Set(g.patches.keys());
      if (!spawnPatchPair(g, 'gold', 1500)) continue;
      spawned++;
      for (const p of g.patches.values()) if (!known.has(p.id)) for (const i of p.tiles) assert.ok(!nearCentre(g, i), `seed ${seed}: patch tile ${i} within 8 of the centre`);
    }
  }
  assert.ok(spawned > 0, 'no patch pair ever spawned');
});

// Replays: game A shows where the next respawn would land; game B, same seed and same oreRng, gets an obstacle there
// first. B draws the same candidates, so it reaches A's pick at the same try and must turn it down.
const firstNew = (g, before) => [...g.resources.values()].find(r => !before.has(r.id));
const goldRespawn = seed => { const g = createGame({ seed }); dropPiles(g, 'gold'); return g; };
const respawnGold = g => { const before = new Set(g.resources.keys()); updateRespawn(g); return piles(g, 'gold').filter(r => !before.has(r.id)); };
const block = (x, y) => [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];

test('a respawned pile or patch never covers a loose relic', () => {
  for (const seed of [1, 2, 3]) {
    const a = goldRespawn(seed), got = respawnGold(a), n = a.map.size;
    assert.equal(got.length, 8, 'A spawned, seed ' + seed);
    const sx = Math.floor(got[0].x), sy = Math.floor(got[0].y);
    const b = goldRespawn(seed), relics = block(sx, sy).map(([x, y]) => b.spawnRelic(x + 0.5, y + 0.5));
    const held = b.spawnRelic(sx + 0.5, sy + 0.5); held.holder = [...b.units.keys()][0]; // carried: doesn't count
    const mine = respawnGold(b), at = new Set(mine.map(r => tileOfPile(b, r)));
    assert.equal(mine.length, 8, 'B spawned elsewhere, seed ' + seed);
    for (const r of relics) assert.equal(at.has(Math.floor(r.y) * n + Math.floor(r.x)), false, `seed ${seed}: pile on a relic`);
    // Patches: the same replay with spawnPatchPair, a relic on one tile of A's first patch.
    const pa = createGame({ seed }), known = new Set(pa.patches.keys());
    assert.equal(spawnPatchPair(pa, 'stone', 800), true);
    const tile = [...pa.patches.values()].find(p => !known.has(p.id)).tiles[5];
    const pb = createGame({ seed }); pb.spawnRelic(tile % n + 0.5, Math.floor(tile / n) + 0.5);
    assert.equal(spawnPatchPair(pb, 'stone', 800), true);
    assert.equal(pb.patchAt[tile], 0, `seed ${seed}: patch on a relic`);
  }
});

test('a pile block enclosed by trees or water is never chosen', () => {
  let tried = 0;
  for (const seed of [1, 2, 3, 4, 5]) for (const wall of ['tree', 'water']) {
    const a = goldRespawn(seed), got = respawnGold(a), n = a.map.size;
    if (got.length !== 8) continue;
    const sx = Math.floor(got[0].x), sy = Math.floor(got[0].y), b = goldRespawn(seed);
    for (let y = sy - 1; y <= sy + 2; y++) for (let x = sx - 1; x <= sx + 2; x++) { // the ring around A's 2x2 block
      if (x >= sx && x <= sx + 1 && y >= sy && y <= sy + 1) continue;
      const i = y * n + x;
      if (b.map.tiles[i] === 1 || b.occAt(x, y)) continue;
      if (wall === 'water') b.map.tiles[i] = 1; else b.addResource({ type: 'tree', x: x + 0.5, y: y + 0.5, amount: 100 });
    }
    const mine = respawnGold(b), at = new Set(mine.map(r => tileOfPile(b, r)));
    for (const [x, y] of block(sx, sy)) assert.equal(at.has(y * n + x), false, `seed ${seed} ${wall}: pile in the enclosed block`);
    tried++;
  }
  assert.ok(tried >= 8, 'replays run ' + tried);
});

test('respawn is deterministic for a seed', () => {
  const run = () => { const g = createGame({ seed: 7 }); dropPiles(g, 'gold'); dropPiles(g, 'stone'); tickTo(g, 2 * RESPAWN_EVERY);
    return ['gold', 'stone'].map(k => piles(g, k).map(r => [r.x, r.y, r.amount])); };
  const a = run(), b = run();
  assert.ok(a[0].length > 0 && a[1].length > 0);
  assert.deepEqual(a, b);
});

test('a crowded map makes respawn give up quietly', () => {
  const g = createGame({ seed: 3 }), n = g.map.size;
  dropPiles(g, 'gold'); dropPiles(g, 'stone');
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (g.map.tiles[y * n + x] === 0 && !g.occAt(x, y)) g.addResource({ type: 'tree', x: x + 0.5, y: y + 0.5, amount: 100 });
  const count = g.resources.size;
  assert.doesNotThrow(() => updateRespawn(g));
  assert.equal(g.resources.size, count);
  assert.equal(g.lastRespawn.gold, -Infinity, 'no cooldown started without a spawn');
});
