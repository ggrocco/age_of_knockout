// Where each unit of a group move stands: a block of rows centred on the clicked point, facing the way the group travels
// (from its centroid to the point, snapped to one of 8 directions). Melee fighters take the front rows, then ranged units,
// then siege, then villagers; each kind starts a new row. Every unit gets its own tile, one the target can be reached from.

const RANK = u => u.cls === 'civ' ? 3 : u.cls === 'siege' ? 2 : u.cls !== 'armor' && u.range >= 2 ? 1 : 0;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Tiles reachable from (tx, ty) by the pathfinder's rules (8-neighbour, no corner cutting) within `r` tiles, nearest first.
function reachable(game, tx, ty, r) {
  const n = game.map.size, free = (x, y) => x >= 0 && y >= 0 && x < n && y < n && game.map.tiles[y * n + x] !== 1 && !game.occAt(x, y);
  if (!free(tx, ty)) { // clicked on water or a building: start from the nearest open tile
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
  const front = Math.floor((rows.length - 1) / 2), tiles = reachable(game, tx, ty, cols + rows.length + 6), used = new Set(), out = new Map();
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
