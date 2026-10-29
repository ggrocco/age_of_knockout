import { makeRng } from './rng.js';
// 180-degree rotationally symmetric map so both players get identical terrain and resources.
// type: 'rivers' (a river with land crossings between the players) or 'islands' (no way across but by ship).
export const MAP_TYPES = ['rivers', 'islands'];
export function generateMap(seed, size = 112, type = 'rivers') {
  if (!MAP_TYPES.includes(type)) type = 'rivers';
  for (let attempt = 0; attempt < 20; attempt++) {
    const m = build(seed + attempt * 1000, size, type);
    if (type === 'islands' ? apart(m) : connected(m)) return m;
  }
  throw new Error('map generation failed for seed ' + seed);
}
// Tiles reached on foot from tile s (4-neighbour, deep water blocks; with `blockResources` resources block too).
function walk(m, s, blockResources) {
  const n = m.size, open = new Uint8Array(n * n), seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) open[i] = m.tiles[i] !== 1;
  if (blockResources) for (const r of m.resources) open[Math.floor(r.y) * n + Math.floor(r.x)] = 0;
  const stack = [s]; seen[s] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % n, y = (i / n) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      const j = ny * n + nx;
      if (nx >= 0 && ny >= 0 && nx < n && ny < n && open[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
    }
  }
  return seen;
}
const tileIndex = (m, p) => Math.floor(p.y) * m.size + Math.floor(p.x);
// Rivers: both starts and every relic spot must share one walkable region (water and resources block).
// 4-neighbour flood fill: with no corner cutting, A* reaches exactly these tiles.
function connected(m) {
  const seen = walk(m, tileIndex(m, m.starts[0]), true);
  return [m.starts[1], ...m.relicSpots].every(p => seen[tileIndex(m, p)]);
}
// Islands: no ground at all joins a start to the other start or to the central island, and the relic spots share the
// central island (resources block there, so none is walled off).
function apart(m) {
  const home = walk(m, tileIndex(m, m.starts[0]), false), centre = walk(m, tileIndex(m, m.relicSpots[0]), true);
  return !home[tileIndex(m, m.starts[1])] && !home[tileIndex(m, m.relicSpots[0])] && m.relicSpots.every(p => centre[tileIndex(m, p)]);
}
function build(seed, size, type) {
  const rng = makeRng(seed), tiles = new Uint8Array(size * size), rot = (x, y) => ({ x: size - 1 - x, y: size - 1 - y });
  const mid = (size - 1) / 2, dist = (x, y, p) => Math.hypot(x - p.x, y - p.y);
  // Starts sit on a ring around the centre at a random angle, keeping the resource rings off the edge.
  const a = rng.next() * Math.PI * 2, R = size / 2 - 14;
  const s0 = { x: Math.round(mid + Math.cos(a) * R), y: Math.round(mid + Math.sin(a) * R) }, s1 = rot(s0.x, s0.y);
  const far = (x, y) => dist(x, y, s0) > 13 && dist(x, y, s1) > 13 && Math.hypot(x - mid, y - mid) > 9;
  // Tile 1 is deep water (ships only), tile 4 shallows (ships and soldiers both cross; nothing is built or placed there).
  const islands = type === 'islands', bank = [], shoals = []; // shoals: [x, y, spread, count] for the fish, placed last
  let riverShoals = null; // the river's own fish, rolled after the others (keeps every river map's seed as it was)
  if (islands) {
    // Open sea everywhere but a home island round each start and a central island holding the relics and rich gold and
    // stone. No shallows: the only way across is by ship. The coasts wobble; the central island's wobble has only even
    // harmonics, so it is its own mirror image. Each home island is the other's mirror (both tiles are set at once).
    tiles.fill(1);
    const ph = [0, 1, 2, 3].map(() => rng.next() * Math.PI * 2);
    const homeR = t => 20 + 2.5 * Math.sin(3 * t + ph[0]) + 1.5 * Math.sin(5 * t + ph[1]), centreR = t => 11.5 + 1.5 * Math.sin(2 * t + ph[2]) + Math.sin(4 * t + ph[3]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (dist(x, y, s0) > homeR(Math.atan2(y - s0.y, x - s0.x)) && Math.hypot(x - mid, y - mid) > centreR(Math.atan2(y - mid, x - mid))) continue;
      const q = rot(x, y); tiles[y * size + x] = 0; tiles[q.y * size + q.x] = 0;
    }
    // Water cut off from the open sea (a lagoon in a wobbly coast or a map corner) would trap any ship built there: fill
    // it in. The open sea is the largest body of water; each body's mirror is a body of the same size, so this stays mirrored.
    const body = new Int32Array(size * size).fill(-1), sizes = [];
    for (let s = 0; s < size * size; s++) if (tiles[s] === 1 && body[s] < 0) {
      const queue = [s]; body[s] = sizes.length;
      for (let k = 0; k < queue.length; k++) {
        const i = queue[k], x = i % size, y = (i / size) | 0;
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) { const j = ny * size + nx; if (nx >= 0 && ny >= 0 && nx < size && ny < size && tiles[j] === 1 && body[j] < 0) { body[j] = sizes.length; queue.push(j); } }
      }
      sizes.push(queue.length);
    }
    const sea = sizes.indexOf(Math.max(...sizes));
    for (let i = 0; i < size * size; i++) if (tiles[i] === 1 && body[i] !== sea) tiles[i] = 0;
    // Fish off each home island's coast and round the central island.
    for (let k = 0, got = 0; got < 6 && k < 60; k++) { // home islands reach the map's edge: only spots on the map count
      const t = rng.next() * Math.PI * 2, r = homeR(t) + 4 + rng.next() * 3, x = s0.x + Math.cos(t) * r, y = s0.y + Math.sin(t) * r;
      if (x >= 3 && y >= 3 && x < size - 3 && y < size - 3) { shoals.push([x, y, 2, 1]); got++; }
    }
    for (let k = 0; k < 2; k++) { const t = rng.next() * Math.PI * 2, r = centreR(t) + 3 + rng.next() * 2; shoals.push([mid + Math.cos(t) * r, mid + Math.sin(t) * r, 1, 1]); }
  } else {
    const wet = (x, y, v = 1) => { // water on (x, y) and its mirror tile; shallows never fill in deep water
      if (x < 0 || y < 0 || x >= size || y >= size || dist(x, y, s0) <= 15 || dist(x, y, s1) <= 15) return;
      const q = rot(x, y), i = y * size + x, j = q.y * size + q.x;
      if (tiles[i] !== 1) tiles[i] = v;
      if (tiles[j] !== 1) tiles[j] = v;
    };
    const disc = (cx, cy, r, v = 1, keep = () => true) => { // water on a disc and its mirror
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.hypot(x - cx, y - cy) <= r && keep(x, y)) wet(x, y, v);
    };
    for (let b = 0; b < 1 + rng.int(3); b++) { const cx = rng.int(size), cy = rng.int(size); disc(cx, cy, 2 + rng.int(3), 1, far); } // small ponds
    // A meandering, navigable river runs edge to edge between the players. Its sideways offset is an odd function of t,
    // so the mirrored half joins it smoothly at the centre. Soldiers cross it (there is always a way to attack on foot) at
    // the shallows over the centre, where the relics are, and at a shallow ford on each half; ships sail the whole river.
    const d = a + Math.PI / 2 + (rng.next() - 0.5) * 0.6, dir = { x: Math.cos(d), y: Math.sin(d) }, perp = { x: -dir.y, y: dir.x };
    const amp = 3 + rng.next() * 4, freq = 0.07 + rng.next() * 0.05, ford = size * (0.24 + rng.next() * 0.08);
    const along = t => { const off = amp * Math.sin(t * freq); return { x: mid + dir.x * t + perp.x * off, y: mid + dir.y * t + perp.y * off }; };
    const halfWidth = t => 3 + 0.8 * Math.sin(t * 0.21), CENTRE = 12;
    for (let t = 0; t < size; t += 0.5) {
      const { x: px, y: py } = along(t), w = halfWidth(t), shallow = t < CENTRE || Math.abs(t - ford) < w + 2.5; // fords at least 5 tiles across
      if (px < -2 || py < -2 || px > size + 1 || py > size + 1) break;
      disc(px, py, w, shallow ? 4 : 1);
      if (!shallow && t % 2 === 0) for (const side of [-1, 1]) bank.push({ x: px + perp.x * side * (w + 1.5), y: py + perp.y * side * (w + 1.5) });
    }
    // Past each ford the river opens into an estuary lake, and each player has a home bay: a channel from the river to a
    // lake 17 tiles or more from their start, so a Dock is a short walk from home. The bays are mirror images, both on the
    // one river, so the two home fleets can meet.
    const te = ford + 9 + rng.next() * 6, e = along(te); disc(e.x, e.y, 6 + rng.next() * 2);
    const side = rng.next() < 0.5 ? 1 : -1, tb = side * (CENTRE + 2 + rng.next() * Math.max(1, ford - CENTRE - 10)), p0 = along(tb);
    const toward = Math.hypot(p0.x - s0.x, p0.y - s0.y), lake = { x: s0.x + (p0.x - s0.x) * 24 / toward, y: s0.y + (p0.y - s0.y) * 24 / toward };
    for (let k = 0; k <= 1; k += 0.5 / toward) disc(lake.x + (p0.x - lake.x) * k, lake.y + (p0.y - lake.y) * k, 2.4);
    disc(lake.x, lake.y, 6.5);
    shoals.push([lake.x, lake.y, 4.5, 4], [e.x, e.y, 5, 3]);
    riverShoals = () => { for (let k = 0; k < 3; k++) { const p = along(CENTRE + 2 + rng.next() * (size / 2 - CENTRE - 2)); shoal(p.x, p.y, 1.5, 1); } };
  }
  const resources = [], taken = new Set(), key = (x, y) => y * size + x; let nid = 0;
  const ok = (x, y) => x >= 1 && y >= 1 && x < size - 1 && y < size - 1 && !tiles[key(x, y)] && !taken.has(key(x, y));
  const place = (type, x, y, amount, mirror = true) => {
    const pts = mirror ? [[x, y], [size - 1 - x, size - 1 - y]] : [[x, y]];
    for (const [px, py] of pts) if (ok(px, py)) { taken.add(key(px, py)); resources.push({ id: 'r' + nid++, type, x: px + 0.5, y: py + 0.5, amount }); }
  };
  const AMOUNT = { tree: 100, berry: 200, gold: 800, stone: 600, fish: 300 };
  const ring = (type, count, rMin, rMax) => {
    for (let k = 0, placed = 0; placed < count && k < 200; k++) {
      const a = rng.next() * Math.PI * 2, r = rMin + rng.next() * (rMax - rMin);
      const x = Math.round(s0.x + Math.cos(a) * r), y = Math.round(s0.y + Math.sin(a) * r);
      if (Math.abs(x - s0.x) <= 2 && Math.abs(y - s0.y) <= 2) continue;
      const before = resources.length; place(type, x, y, AMOUNT[type]); if (resources.length > before) placed++;
    }
  };
  ring('berry', 6, 6, 8); ring('gold', 4, 9, 13); ring('stone', 3, 9, 13);
  // Rocky ore patches (tile 2 gold vein, 3 quarry) for Mines. Each is placed with its 180-degree mirror or not at all.
  const orePatches = [], MINE_TILE = { gold: 2, stone: 3 }, pair = (type, x, y, amount) => { // a mirrored pair of piles, both or neither
    const q = rot(x, y);
    if (!ok(x, y) || !ok(q.x, q.y) || (x === q.x && y === q.y) || Math.hypot(x - mid, y - mid) <= 8) return false; // also off the relic shallows at the centre
    place(type, x, y, amount); return true;
  };
  const patch = (kind, cx, cy, w, h, reserve) => {
    const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), own = new Set(), mir = new Set();
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const q = rot(x, y);
      if (!ok(x, y) || !ok(q.x, q.y) || Math.hypot(x - mid, y - mid) <= 8) return false; // dry, free, clear of the relic shallows at the centre
      own.add(key(x, y)); mir.add(key(q.x, q.y));
    }
    for (const i of own) if (mir.has(i)) return false;
    const id = orePatches.length + 1, v = MINE_TILE[kind];
    for (const i of own) tiles[i] = v;
    for (const i of mir) tiles[i] = v;
    orePatches.push({ id, kind, tiles: [...own], reserve, twin: id + 1 }, { id: id + 1, kind, tiles: [...mir], reserve, twin: id });
    return { x0, y0, w, h };
  };
  for (let k = 0; k < 100; k++) { // home gold patch: 4x3, centre 12-16 tiles from the start, outside the open base
    const a = rng.next() * Math.PI * 2, r = 12 + rng.next() * 4;
    if (patch('gold', s0.x + Math.cos(a) * r, s0.y + Math.sin(a) * r, 4, 3, 1500)) break;
  }
  // Islands: the rich piles lie on the central island, 9-11 tiles from its middle (the relics keep the middle 8).
  if (islands) for (const [type, amount, count] of [['gold', 1200, 4], ['stone', 900, 3]]) {
    for (let k = 0, got = 0; got < count && k < 200; k++) { const t = rng.next() * Math.PI * 2, r = 9 + rng.next() * 2; if (pair(type, Math.round(mid + Math.cos(t) * r), Math.round(mid + Math.sin(t) * r), amount)) got++; }
  }
  // Mid-map patches in s0's half (the mirror lands in the other), each with a cluster of 5 richer piles on its border.
  if (!islands) for (const [kind, reserve, pile, amount] of [['gold', 3000, 'gold', 1200], ['gold', 3000, 'gold', 1200], ['stone', 2500, 'stone', 900]]) {
    for (let k = 0, r; k < 200 && !r; k++) {
      const x = rng.int(size), y = rng.int(size), d0 = dist(x, y, s0);
      if (far(x, y) && d0 >= 20 && d0 <= 34 && d0 < dist(x, y, s1)) r = patch(kind, x, y, 5, 4, reserve);
      if (!r) continue;
      const edge = []; // free land touching the rectangle's border
      for (let y = r.y0 - 1; y <= r.y0 + r.h; y++) for (let x = r.x0 - 1; x <= r.x0 + r.w; x++) if (x < r.x0 || y < r.y0 || x >= r.x0 + r.w || y >= r.y0 + r.h) edge.push([x, y]);
      for (let t = 0, got = 0; got < 5 && t < 100; t++) { const [px, py] = edge[rng.int(edge.length)]; if (pair(pile, px, py, amount)) got++; }
    }
  }
  const forest = (cx, cy, r, density, clear) => { // a round, mostly solid stand of trees
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (Math.hypot(x - cx, y - cy) <= r && rng.next() < density && clear(x, y)) place('tree', x, y, AMOUNT.tree);
    }
  };
  const home = (x, y) => dist(x, y, s0) > 8; // woodlines near the start keep the TC and its build space open
  for (let c = 0; c < 3; c++) { const a = rng.next() * Math.PI * 2, r = 11 + rng.next() * 3; forest(s0.x + Math.cos(a) * r, s0.y + Math.sin(a) * r, 2.5, 0.75, home); }
  if (islands) for (let c = 0; c < 4; c++) { const a = rng.next() * Math.PI * 2, r = 14 + rng.next() * 3; forest(s0.x + Math.cos(a) * r, s0.y + Math.sin(a) * r, 2.5, 0.75, home); } // the sea takes the rest of the map's forests
  for (let f = 0, count = Math.round(size * size / 480); f < count; f++) forest(rng.int(size), rng.int(size), 2 + rng.next() * 2.5, 0.7, far);
  for (const p of bank) if (rng.next() < 0.3) forest(p.x, p.y, 0.5, 1, far);
  // Fish (food for Fishing Ships), mirrored, where `shoals` says: in each home bay, estuary and along the river, or off the
  // islands' coasts. Only on open water (all eight neighbours wet) and 3 tiles apart, so a shoal never closes a channel
  // or sits against the shore.
  const fishAt = [], open = (x, y) => { for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) if (i < 0 || j < 0 || i >= size || j >= size || tiles[key(i, j)] !== 1) return false; return true; };
  const shoal = (cx, cy, r, count) => {
    for (let k = 0, got = 0; got < count && k < 60; k++) {
      const x = Math.round(cx + (rng.next() * 2 - 1) * r), y = Math.round(cy + (rng.next() * 2 - 1) * r), q = rot(x, y);
      if (!open(x, y) || (x === q.x && y === q.y) || fishAt.some(f => Math.max(Math.abs(f.x - x), Math.abs(f.y - y)) < 3 || Math.max(Math.abs(f.x - q.x), Math.abs(f.y - q.y)) < 3)) continue;
      for (const [px, py] of [[x, y], [q.x, q.y]]) { taken.add(key(px, py)); fishAt.push({ x: px, y: py }); resources.push({ id: 'r' + nid++, type: 'fish', x: px + 0.5, y: py + 0.5, amount: AMOUNT.fish }); }
      got++;
    }
  };
  for (const [x, y, r, count] of shoals) shoal(x, y, r, count);
  riverShoals?.();
  const c = size / 2 | 0;
  const relicSpots = [[c, c], [c - 4, c - 6], [c + 4, c + 6], [c - 6, c + 4], [c + 6, c - 4]].map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  for (const r of relicSpots) { const x = Math.floor(r.x), y = Math.floor(r.y), q = rot(x, y); tiles[y * size + x] = 0; tiles[q.y * size + q.x] = 0; }
  const relicKeys = new Set(relicSpots.map(r => key(Math.floor(r.x), Math.floor(r.y))));
  return { size, type, tiles, resources: resources.filter(r => !relicKeys.has(key(Math.floor(r.x), Math.floor(r.y)))), starts: [s0, s1], relicSpots, orePatches };
}
