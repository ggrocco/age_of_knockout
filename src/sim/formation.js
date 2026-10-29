// Where each unit of a group move stands: a block of rows centred on the clicked point, facing the way the group travels
// (from its centroid to the point, snapped to one of 8 directions). Melee fighters take the front rows, then ranged units,
// then siege, then villagers; each kind starts a new row. Every unit gets its own tile, one the target can be reached from.
// A group is all soldiers or all ships (commands.js splits a mixed one): ships take their slots on open water.
import { passable } from './util.js';

const RANK = u => u.cls === 'civ' ? 3 : u.cls === 'siege' ? 2 : u.cls !== 'armor' && u.range >= 2 ? 1 : 0;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Tiles reachable from (tx, ty) by the pathfinder's rules (8-neighbour, no corner cutting) within `r` tiles, nearest first.
function reachable(game, tx, ty, r, naval = false) {
  const n = game.map.size, free = (x, y) => x >= 0 && y >= 0 && x < n && y < n && passable(game.map.tiles[y * n + x], naval) && !game.occAt(x, y);
  if (!free(tx, ty)) { // clicked on water (land for a ship) or a building: start from the nearest open tile
    let best = null, bd = Infinity;
    for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) {
      const d = Math.hypot(x - tx, y - ty); if (free(x, y) && d < bd) { bd = d; best = [x, y]; }
    }
    if (!best) return [];
    [tx, ty] = best;
  }
  const seen = new Set([ty * n + tx]), out = [{ x: tx, y: ty }];
  for (let i = 0; i < out.length; i++) for (const [dx, dy] of DIRS) {
    const { x, y } = out[i], nx = x + dx, ny = y + dy, k = ny * n + nx;
    if (Math.max(Math.abs(nx - tx), Math.abs(ny - ty)) > r || seen.has(k) || !free(nx, ny)) continue;
    if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
    seen.add(k); out.push({ x: nx, y: ny });
  }
  return out;
}

// The open tile (a tile centre) nearest (x, y) for this layer, by square rings, or null: ships sent onto land sail to the shore.
export function nearestOpen(game, x, y, naval) {
  const n = game.map.size, cx = Math.floor(x), cy = Math.floor(y);
  for (let r = 0; r < n; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const tx = cx + dx, ty = cy + dy;
    if (tx >= 0 && ty >= 0 && tx < n && ty < n && passable(game.map.tiles[ty * n + tx], naval) && !game.occAt(tx, ty)) return { x: tx + 0.5, y: ty + 0.5 };
  }
  return null;
}

// Free ground joined on foot (4-neighbour, around buildings and resources) to the tile at (x, y), or for a unit caught on
// a blocked tile, to the neighbours the pathfinder would step to from it (diagonals only past two free corners): a set of
// tile indices.
function groundFrom(game, x, y) {
  const n = game.map.size, seen = new Set(), queue = [], open = (i, j) => i >= 0 && j >= 0 && i < n && j < n && passable(game.map.tiles[j * n + i], false) && !game.occAt(i, j);
  const cx = Math.floor(x), cy = Math.floor(y), seed = (i, j) => { if (open(i, j) && !seen.has(j * n + i)) { seen.add(j * n + i); queue.push(j * n + i); } };
  if (open(cx, cy)) seed(cx, cy);
  else for (const [dx, dy] of DIRS) if (!(dx && dy) || (open(cx + dx, cy) && open(cx, cy + dy))) seed(cx + dx, cy + dy);
  for (let k = 0; k < queue.length; k++) {
    const t = queue[k], i = t % n, j = (t / n) | 0;
    for (const [ni, nj] of [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]]) if (open(ni, nj) && !seen.has(nj * n + ni)) { seen.add(nj * n + ni); queue.push(nj * n + ni); }
  }
  return seen;
}
// Where a transport lands near (x, y): the open water tile (sea, a tile centre) beside free ground (shore, a tile
// centre) nearest the point, by square rings, or null. With `from`, the shore must be ground one can walk to from there
// (not a strip walled in by trees or buildings).
export function landingNear(game, x, y, from = null) {
  const n = game.map.size, cx = Math.floor(x), cy = Math.floor(y), tiles = game.map.tiles, ground = from && groundFrom(game, from.x, from.y);
  const open = (i, j, naval) => i >= 0 && j >= 0 && i < n && j < n && passable(tiles[j * n + i], naval) && !game.occAt(i, j) && (naval || !ground || ground.has(j * n + i));
  for (let r = 0; r < n; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const i = cx + dx, j = cy + dy;
    if (!open(i, j, true) || tiles[j * n + i] !== 1) continue; // a deep-water tile, so it is not ground itself
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (open(i + ox, j + oy, false)) return { sea: { x: i + 0.5, y: j + 0.5 }, shore: { x: i + ox + 0.5, y: j + oy + 0.5 } };
  }
  return null;
}
// Up to `count` free ground tiles (tile centres) nearest (x, y) that are joined to it on foot, for passengers going ashore.
export function landingTiles(game, x, y, count) {
  return reachable(game, Math.floor(x), Math.floor(y), 4, false).slice(0, count).map(t => ({ x: t.x + 0.5, y: t.y + 0.5 }));
}

// Returns a Map unit id -> { x, y } (a tile centre) for two or more units.
export function formationSlots(game, units, x, y) {
  const us = [...units].sort((a, b) => a.id - b.id), tx = Math.floor(x), ty = Math.floor(y);
  const cx = us.reduce((s, u) => s + u.x, 0) / us.length, cy = us.reduce((s, u) => s + u.y, 0) / us.length;
  const q = Math.hypot(x - cx, y - cy) < 1 ? 2 : Math.round(Math.atan2(y - cy, x - cx) / (Math.PI / 4));
  const fx = Math.round(Math.cos(q * Math.PI / 4)), fy = Math.round(Math.sin(q * Math.PI / 4)), rx = -fy, ry = fx; // forward, right
  const fwd = u => u.x * fx + u.y * fy, side = u => u.x * rx + u.y * ry;
  const cols = Math.min(12, Math.ceil(Math.sqrt(2 * us.length))), rows = [];
  for (let rank = 0; rank < 4; rank++) {
    const group = us.filter(u => RANK(u) === rank).sort((a, b) => fwd(b) - fwd(a) || a.id - b.id); // the most forward go to the front row
    for (let i = 0; i < group.length; i += cols) rows.push(group.slice(i, i + cols).sort((a, b) => side(a) - side(b) || a.id - b.id));
  }
  // Offsets are whole steps along forward/right, so on a diagonal every slot still lands on its own tile.
  const front = Math.floor((rows.length - 1) / 2), tiles = reachable(game, tx, ty, cols + rows.length + 6, us[0].naval), used = new Set(), out = new Map();
  rows.forEach((row, i) => row.forEach((u, j) => {
    const k = front - i, c = j - Math.floor((row.length - 1) / 2), sx = tx + k * fx + c * rx, sy = ty + k * fy + c * ry;
    let best = null, bd = Infinity;
    for (const t of tiles) {
      if (used.has(t.y * game.map.size + t.x)) continue;
      const d = Math.hypot(t.x - sx, t.y - sy); if (d < bd) { bd = d; best = t; if (d === 0) break; }
    }
    if (!best) return out.set(u.id, { x, y }); // nowhere left to spread to: head for the point itself
    used.add(best.y * game.map.size + best.x); out.set(u.id, { x: best.x + 0.5, y: best.y + 0.5 });
  }));
  return out;
}
