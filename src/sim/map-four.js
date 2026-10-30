import { makeRng } from './rng.js';

// Quarter turns operate on tile indices, so rotated footprints and resource centres agree exactly.
export function rotations(size, x, y) {
  return [{ x, y }, { x: size - 1 - y, y: x },
    { x: size - 1 - x, y: size - 1 - y }, { x: y, y: size - 1 - x }];
}

// Kept separate from the two-player generator: adding this mode must not change existing seeded maps.
export function buildFourMap(seed, size, type) {
  const rng = makeRng(seed), mid = (size - 1) / 2, radius = size / 2 - 14;
  const angle = rng.next() * Math.PI * 2, cos = Math.cos(angle), sin = Math.sin(angle);
  const starts = rotations(size, Math.round(mid + cos * radius), Math.round(mid + sin * radius));
  const tiles = new Uint8Array(size * size), resources = [], orePatches = [], taken = new Set();
  const fromHome = (x, y) => Math.min(...starts.map(s => Math.hypot(x - s.x, y - s.y)));
  // Paint complete orbits once; even rounding at the centre preserves exact four-way symmetry.
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const orbit = rotations(size, x, y), i = y * size + x;
    if (i !== Math.min(...orbit.map(p => p.y * size + p.x))) continue;
    const dx = x - mid, dy = y - mid, d = Math.hypot(dx, dy);
    const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
    let tile;
    if (type === 'islands') tile = fromHome(x, y) <= 20 || d <= 11.5 ? 0 : 1;
    else tile = fromHome(x, y) > 16 && Math.abs(Math.abs(u) - Math.abs(v)) < 6 ? (d < 13 ? 4 : 1) : 0;
    for (const p of orbit) tiles[p.y * size + p.x] = tile;
  }
  const open = (x, y) => x >= 1 && y >= 1 && x < size - 1 && y < size - 1
    && tiles[y * size + x] === 0 && !taken.has(y * size + x);
  const addOrbit = (kind, x, y, amount) => {
    const spots = rotations(size, x, y);
    if (new Set(spots.map(p => p.y * size + p.x)).size !== 4 || !spots.every(p => open(p.x, p.y))) return false;
    for (const p of spots) {
      taken.add(p.y * size + p.x);
      resources.push({ id: 'r' + resources.length, type: kind, x: p.x + 0.5, y: p.y + 0.5, amount });
    }
    return true;
  };
  const ring = (kind, count, lo, hi, amount, origin = starts[0]) => {
    for (let tries = 0, got = 0; tries < count * 100 && got < count; tries++) {
      const a = rng.next() * Math.PI * 2, r = lo + rng.next() * (hi - lo);
      if (addOrbit(kind, Math.round(origin.x + Math.cos(a) * r), Math.round(origin.y + Math.sin(a) * r), amount)) got++;
    }
  };
  ring('berry', 6, 6, 8, 200);
  ring('gold', 6, 9, 13, 800);
  ring('stone', 5, 9, 13, 600);
  // A home gold patch and richer contested patches, rotated as 4x3 / 3x4 rectangles.
  const patch = (kind, x, y, reserve) => {
    const groups = [[], [], [], []];
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 4; dx++) {
      for (const [turn, p] of rotations(size, x + dx, y + dy).entries()) groups[turn].push(p.y * size + p.x);
    }
    const all = groups.flat();
    if (new Set(all).size !== all.length || !all.every(i => open(i % size, Math.floor(i / size)))) return false;
    const first = orePatches.length + 1;
    groups.forEach((indices, turn) => {
      for (const i of indices) tiles[i] = kind === 'gold' ? 2 : 3;
      orePatches.push({ id: first + turn, kind, tiles: indices, reserve, twin: first + (turn + 2) % 4 });
    });
    return true;
  };
  for (const [kind, reserve, home] of [['gold', 1500, true], ['stone', 2500, true], ['gold', 3000, false]]) {
    for (let tries = 0; tries < 300; tries++) {
      const a = rng.next() * Math.PI * 2, r = home ? 12 + rng.next() * 3 : 9 + rng.next() * 2;
      const origin = home ? starts[0] : { x: mid, y: mid };
      if (patch(kind, Math.round(origin.x + Math.cos(a) * r) - 2, Math.round(origin.y + Math.sin(a) * r) - 1, reserve)) break;
    }
  }
  ring('tree', 105, 9, 18, 100);
  // Sparse inland groves, keeping a clear base and the central landing area.
  for (let k = 0; k < size * size / 15; k++) {
    const x = rng.int(size), y = rng.int(size);
    if (fromHome(x, y) > 21 && Math.hypot(x - mid, y - mid) > 12) addOrbit('tree', x, y, 100);
  }
  // Fish stay away from the shore and each other, leaving navigable channels and Dock footprints.
  const fish = [];
  for (let tries = 0; tries < 3000 && fish.length < 40; tries++) {
    const x = 2 + rng.int(size - 4), y = 2 + rng.int(size - 4), spots = rotations(size, x, y);
    if (!spots.every(p => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (tiles[(p.y + dy) * size + p.x + dx] !== 1) return false;
      }
      return !fish.some(f => Math.max(Math.abs(f.x - p.x), Math.abs(f.y - p.y)) < 4);
    })) continue;
    for (const p of spots) {
      fish.push(p);
      resources.push({ id: 'r' + resources.length, type: 'fish', x: p.x + 0.5, y: p.y + 0.5, amount: 300 });
    }
  }
  const relicSpots = rotations(size, Math.floor(mid) - 3, Math.floor(mid) - 3).map(p => ({ x: p.x + 0.5, y: p.y + 0.5 }));
  return { size, type, tiles, starts, resources, orePatches, relicSpots };
}
