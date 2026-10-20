import { makeRng } from './rng.js';
// 180-degree rotationally symmetric map so both players get identical terrain and resources.
export function generateMap(seed, size = 96) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const m = build(seed + attempt * 1000, size);
    if (connected(m)) return m;
  }
  throw new Error('map generation failed for seed ' + seed);
}
// Both starts and every relic spot must share one walkable region (water and resources block).
// 4-neighbour flood fill: with no corner cutting, A* reaches exactly these tiles.
function connected(m) {
  const n = m.size, open = new Uint8Array(n * n), seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) open[i] = m.tiles[i] !== 1;
  for (const r of m.resources) open[Math.floor(r.y) * n + Math.floor(r.x)] = 0;
  const s = m.starts[0].y * n + m.starts[0].x, stack = [s]; seen[s] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % n, y = (i / n) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const j = ny * n + nx;
      if (nx >= 0 && ny >= 0 && nx < n && ny < n && open[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
  }
  return [m.starts[1], ...m.relicSpots].every(p => seen[Math.floor(p.y) * n + Math.floor(p.x)]);
}
function build(seed, size) {
  const rng = makeRng(seed), tiles = new Uint8Array(size * size), rot = (x, y) => ({ x: size - 1 - x, y: size - 1 - y });
  const mid = (size - 1) / 2, dist = (x, y, p) => Math.hypot(x - p.x, y - p.y);
  // Starts sit on a ring around the centre at a random angle, keeping the resource rings off the edge.
  const a = rng.next() * Math.PI * 2, R = size / 2 - 14;
  const s0 = { x: Math.round(mid + Math.cos(a) * R), y: Math.round(mid + Math.sin(a) * R) }, s1 = rot(s0.x, s0.y);
  const far = (x, y) => dist(x, y, s0) > 13 && dist(x, y, s1) > 13 && Math.hypot(x - mid, y - mid) > 9;
  const wet = (x, y) => { // water on (x, y) and its mirror tile
    if (x < 0 || y < 0 || x >= size || y >= size || dist(x, y, s0) <= 15 || dist(x, y, s1) <= 15) return;
    const q = rot(x, y); tiles[y * size + x] = 1; tiles[q.y * size + q.x] = 1;
  };
  for (let b = 0; b < 2 + rng.int(3); b++) { // small lakes
    const cx = rng.int(size), cy = rng.int(size), r = 2 + rng.int(3);
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (Math.hypot(x - cx, y - cy) <= r && far(x, y)) wet(x, y);
  }
  // A meandering river runs edge to edge between the players. Its sideways offset is an odd function of t,
  // so the mirrored half joins it smoothly at the centre. Crossings: a wide land bridge over the centre
  // (where the relics are) and a ford on each half.
  const d = a + Math.PI / 2 + (rng.next() - 0.5) * 0.6, dir = { x: Math.cos(d), y: Math.sin(d) }, perp = { x: -dir.y, y: dir.x };
  const amp = 3 + rng.next() * 4, freq = 0.07 + rng.next() * 0.05, ford = size * (0.22 + rng.next() * 0.1), bank = [];
  for (let t = 7; t < size; t += 0.5) {
    const off = amp * Math.sin(t * freq), px = mid + dir.x * t + perp.x * off, py = mid + dir.y * t + perp.y * off;
    if (px < -2 || py < -2 || px > size + 1 || py > size + 1) break;
    if (Math.abs(t - ford) < 2.5) continue;
    const w = 1.3 + 0.4 * Math.sin(t * 0.21);
    for (let y = Math.floor(py - w); y <= Math.ceil(py + w); y++) for (let x = Math.floor(px - w); x <= Math.ceil(px + w); x++) if (Math.hypot(x - px, y - py) <= w) wet(x, y);
    if (t % 2 === 0) for (const side of [-1, 1]) bank.push({ x: px + perp.x * side * (w + 1.5), y: py + perp.y * side * (w + 1.5) });
  }
  const resources = [], taken = new Set(), key = (x, y) => y * size + x; let nid = 0;
  const ok = (x, y) => x >= 1 && y >= 1 && x < size - 1 && y < size - 1 && !tiles[key(x, y)] && !taken.has(key(x, y));
  const place = (type, x, y, amount, mirror = true) => {
    const pts = mirror ? [[x, y], [size - 1 - x, size - 1 - y]] : [[x, y]];
    for (const [px, py] of pts) if (ok(px, py)) { taken.add(key(px, py)); resources.push({ id: 'r' + nid++, type, x: px + 0.5, y: py + 0.5, amount }); }
  };
  const AMOUNT = { tree: 100, berry: 200, gold: 800, stone: 600 };
  const ring = (type, count, rMin, rMax) => {
    for (let k = 0, placed = 0; placed < count && k < 200; k++) {
      const a = rng.next() * Math.PI * 2, r = rMin + rng.next() * (rMax - rMin);
      const x = Math.round(s0.x + Math.cos(a) * r), y = Math.round(s0.y + Math.sin(a) * r);
      if (Math.abs(x - s0.x) <= 2 && Math.abs(y - s0.y) <= 2) continue;
      const before = resources.length; place(type, x, y, AMOUNT[type]); if (resources.length > before) placed++;
    }
  };
  ring('berry', 6, 6, 8); ring('gold', 4, 9, 13); ring('stone', 3, 9, 13);
  const forest = (cx, cy, r, density, clear) => { // a round, mostly solid stand of trees
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (Math.hypot(x - cx, y - cy) <= r && rng.next() < density && clear(x, y)) place('tree', x, y, AMOUNT.tree);
    }
  };
  const home = (x, y) => dist(x, y, s0) > 8; // woodlines near the start keep the TC and its build space open
  for (let c = 0; c < 3; c++) { const a = rng.next() * Math.PI * 2, r = 11 + rng.next() * 3; forest(s0.x + Math.cos(a) * r, s0.y + Math.sin(a) * r, 2.5, 0.75, home); }
  for (let f = 0, count = Math.round(size * size / 600); f < count; f++) forest(rng.int(size), rng.int(size), 2 + rng.next() * 2.5, 0.7, far);
  for (const p of bank) if (rng.next() < 0.3) forest(p.x, p.y, 0.5, 1, far);
  const c = size / 2 | 0;
  const relicSpots = [[c, c], [c - 4, c - 6], [c + 4, c + 6], [c - 6, c + 4], [c + 6, c - 4]].map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  for (const r of relicSpots) { const x = Math.floor(r.x), y = Math.floor(r.y), q = rot(x, y); tiles[y * size + x] = 0; tiles[q.y * size + q.x] = 0; }
  const relicKeys = new Set(relicSpots.map(r => key(Math.floor(r.x), Math.floor(r.y))));
  return { size, tiles, resources: resources.filter(r => !relicKeys.has(key(Math.floor(r.x), Math.floor(r.y)))), starts: [s0, s1], relicSpots };
}
