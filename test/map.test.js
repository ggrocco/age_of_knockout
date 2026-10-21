import test from 'node:test'; import assert from 'node:assert/strict';
import { generateMap } from '../src/sim/map.js';
import { findPath } from '../src/sim/path.js';
const blockedOf = m => (x, y) => m.tiles[y * m.size + x] === 1 || m.resources.some(r => Math.floor(r.x) === x && Math.floor(r.y) === y);
test('deterministic', () => {
  assert.deepEqual(generateMap(5).resources, generateMap(5).resources);
});
test('starts connected and resource rich', () => {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    const m = generateMap(seed);
    assert.ok(findPath(m, blockedOf(m), m.starts[0], m.starts[1]) !== null, 'seed ' + seed);
    for (const s of m.starts) for (const type of ['tree', 'berry', 'gold', 'stone']) {
      assert.ok(m.resources.some(r => r.type === type && Math.hypot(r.x - s.x, r.y - s.y) < 16), `${seed} ${type}`);
    }
    assert.equal(m.relicSpots.length, 5);
  }
});
test('bigger map with random starts, a river with crossings and dense forests', () => {
  const angles = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    const m = generateMap(seed), n = m.size, [a, b] = m.starts;
    assert.equal(n, 96);
    assert.deepEqual(b, { x: n - 1 - a.x, y: n - 1 - a.y }, 'starts mirrored');
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) > 55, 'starts far apart ' + seed);
    for (const s of m.starts) assert.ok(s.x >= 12 && s.y >= 12 && s.x < n - 12 && s.y < n - 12, 'start off the edge ' + seed);
    angles.add(Math.round(Math.atan2(a.y - n / 2, a.x - n / 2) / (Math.PI / 4)));
    for (let i = 0; i < n * n; i++) assert.equal(m.tiles[i], m.tiles[n * n - 1 - i], 'water mirrored ' + seed);
    assert.ok(m.tiles.reduce((s, t) => s + t, 0) > 150, 'river ' + seed);
    for (const s of m.starts) for (let y = s.y - 6; y <= s.y + 6; y++) for (let x = s.x - 6; x <= s.x + 6; x++) assert.equal(m.tiles[y * n + x], 0, 'dry base ' + seed);
    assert.ok(m.resources.filter(r => r.type === 'tree').length > 350, 'trees ' + seed);
    for (const s of m.starts) assert.ok(m.resources.filter(r => r.type === 'tree' && Math.hypot(r.x - s.x, r.y - s.y) < 16).length >= 20, 'woodline ' + seed);
    for (const r of m.relicSpots) for (const s of m.starts) assert.ok(findPath(m, blockedOf(m), s, { x: Math.floor(r.x), y: Math.floor(r.y) }) !== null, `relic ${seed}`);
  }
  assert.ok(angles.size >= 6, 'start positions vary: ' + [...angles]);
});
test('path around wall, enclosed null, same tile empty', () => {
  const m = { size: 10, tiles: new Uint8Array(100) };
  const wall = (x, y) => x === 5 && y < 9;
  const p = findPath(m, wall, { x: 2, y: 2 }, { x: 8, y: 2 });
  assert.ok(p && p.length > 6 && p.at(-1).x === 8 && p.every(s => !wall(s.x, s.y)));
  const box = (x, y) => Math.abs(x - 8) <= 1 && Math.abs(y - 2) <= 1 && !(x === 8 && y === 2) ;
  assert.equal(findPath(m, box, { x: 2, y: 2 }, { x: 8, y: 2 }), null);
  assert.deepEqual(findPath(m, wall, { x: 2, y: 2 }, { x: 2, y: 2 }), []);
});
test('ore patches: mirrored, home gold patch per player, tiles match kinds', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const m = generateMap(seed), n = m.size, byId = new Map(m.orePatches.map(p => [p.id, p]));
    for (const p of m.orePatches) {
      const t = byId.get(p.twin);
      assert.equal(t.twin, p.id); assert.equal(t.kind, p.kind); assert.equal(t.reserve, p.reserve);
      assert.deepEqual([...p.tiles].map(i => n * n - 1 - i).sort((a, b) => a - b), [...t.tiles].sort((a, b) => a - b), 'mirrored ' + seed);
      for (const i of p.tiles) assert.equal(m.tiles[i], p.kind === 'gold' ? 2 : 3);
    }
    for (const s of m.starts) assert.ok(m.orePatches.some(p => p.kind === 'gold' && p.reserve === 1500
      && p.tiles.every(i => { const d = Math.hypot(i % n - s.x, (i / n | 0) - s.y); return d >= 9 && d <= 19; })), 'home patch ' + seed);
    assert.ok(m.orePatches.filter(p => p.kind === 'stone').length >= 2, 'quarries ' + seed);
    const onOre = m.resources.filter(r => m.tiles[Math.floor(r.y) * n + Math.floor(r.x)] >= 2);
    assert.equal(onOre.length, 0, 'no pile on ore ' + seed);
    for (const r of m.relicSpots) assert.ok(m.tiles[Math.floor(r.y) * n + Math.floor(r.x)] < 2, 'relic spot off ore ' + seed);
  }
});
test('mid-map gold and stone between the bases', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const m = generateMap(seed), [a, b] = m.starts;
    for (const type of ['gold', 'stone']) {
      const mid = m.resources.filter(r => r.type === type && Math.hypot(r.x - a.x, r.y - a.y) > 16 && Math.hypot(r.x - b.x, r.y - b.y) > 16);
      assert.ok(mid.length >= 8, `${type} mid ${seed}: ${mid.length}`);
      assert.ok(mid.every(r => r.amount > (type === 'gold' ? 800 : 600)), 'mid piles richer');
    }
  }
});
