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
    assert.equal(n, 112);
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
test('water: one river ships can sail end to end, a home bay for each player, fish, and shallows soldiers wade', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const m = generateMap(seed), n = m.size, at = i => ({ x: i % n, y: (i / n) | 0 }), count = v => m.tiles.reduce((k, t) => k + (t === v), 0);
    const share = (count(1) + count(4)) / (n * n);
    assert.ok(share > 0.06 && share < 0.2, `water share ${seed}: ${share}`);
    assert.ok(count(4) >= 40, 'shallows ' + seed);
    // The biggest body of water (deep and shallows, 4-way) is the river, and it reaches within 17-20 tiles of each start: the
    // home bays. Ships can sail from one bay to the other.
    const comp = new Int32Array(n * n).fill(-1), sizes = [];
    for (let i = 0; i < n * n; i++) if ((m.tiles[i] === 1 || m.tiles[i] === 4) && comp[i] < 0) {
      const id = sizes.length, stack = [i]; comp[i] = id; let k = 0;
      while (stack.length) { const j = stack.pop(), p = at(j); k++; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = p.x + dx, y = p.y + dy, q = y * n + x; if (x >= 0 && y >= 0 && x < n && y < n && comp[q] < 0 && (m.tiles[q] === 1 || m.tiles[q] === 4)) { comp[q] = id; stack.push(q); } } }
      sizes.push(k);
    }
    const river = sizes.indexOf(Math.max(...sizes));
    const bays = m.starts.map(s => { let best = null, bd = Infinity; for (let i = 0; i < n * n; i++) if (m.tiles[i] === 1 && comp[i] === river) { const p = at(i), d = Math.hypot(p.x - s.x, p.y - s.y); if (d < bd) { bd = d; best = p; } } return { p: best, d: bd }; });
    for (const b of bays) assert.ok(b.d > 15 && b.d <= 20, `bay distance ${seed}: ${b.d}`);
    const shoals = new Set(m.resources.map(r => Math.floor(r.y) * n + Math.floor(r.x)));
    assert.ok(findPath(m, (x, y) => shoals.has(y * n + x), bays[0].p, bays[1].p, null, true) !== null, 'ships sail from bay to bay ' + seed);
    // A 3x3 block of deep water against the shore (a Dock spot) within 24 tiles of each start.
    for (const s of m.starts) {
      let ok = false;
      for (let y = 1; y < n - 4 && !ok; y++) for (let x = 1; x < n - 4 && !ok; x++) {
        if (Math.hypot(x + 1.5 - s.x, y + 1.5 - s.y) > 24) continue;
        let deep = true; for (let j = y; j < y + 3; j++) for (let i = x; i < x + 3; i++) if (m.tiles[j * n + i] !== 1) deep = false;
        if (!deep) continue;
        for (let k = 0; k < 3; k++) for (const [i, j] of [[x + k, y - 1], [x + k, y + 3], [x - 1, y + k], [x + 3, y + k]]) if (m.tiles[j * n + i] === 0) ok = true;
      }
      assert.ok(ok, 'dock spot ' + seed);
    }
    const fish = m.resources.filter(r => r.type === 'fish'), key = r => `${Math.floor(r.x)},${Math.floor(r.y)}`, keys = new Set(fish.map(key));
    assert.ok(fish.length >= 10, 'fish ' + seed);
    for (const f of fish) {
      assert.equal(m.tiles[Math.floor(f.y) * n + Math.floor(f.x)], 1, 'fish on deep water ' + seed);
      assert.ok(keys.has(`${n - 1 - Math.floor(f.x)},${n - 1 - Math.floor(f.y)}`), 'fish mirrored ' + seed);
    }
    assert.ok(m.resources.filter(r => r.type !== 'fish').every(r => m.tiles[Math.floor(r.y) * n + Math.floor(r.x)] === 0), 'nothing else on water or shallows ' + seed);
  }
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
