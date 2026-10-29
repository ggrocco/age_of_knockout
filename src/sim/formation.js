// Where each unit of a group move stands: a block of rows centred on the clicked point, facing the way the group travels
// (from its centroid to the point, snapped to one of 8 directions). Melee fighters take the front rows, then ranged units,
// then siege, then villagers; each kind starts a new row. Every unit gets its own tile, one the target can be reached from.
// A group is all soldiers or all ships (commands.js splits a mixed one): ships take their slots on open water.
import { passable } from './util.js';

const RANK = unit => unit.cls === 'civ' ? 3 : unit.cls === 'siege' ? 2 : unit.cls !== 'armor' && unit.range >= 2 ? 1 : 0;
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTHOGONAL = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Whether (x, y) is on the map, of the layer the unit moves on (land, or water for a ship) and free of buildings.
function isOpenTile(game, n, x, y, naval) {
  return x >= 0 && y >= 0 && x < n && y < n && passable(game.map.tiles[y * n + x], naval) && !game.occAt(x, y);
}

// Tiles reachable from (tx, ty) by the pathfinder's rules (8-neighbour, no corner cutting) within `radius` tiles, nearest
// first.
function reachable(game, tx, ty, radius, naval = false) {
  const n = game.map.size, free = (x, y) => isOpenTile(game, n, x, y, naval);
  if (!free(tx, ty)) { // clicked on water (land for a ship) or a building: start from the nearest open tile
    const start = nearestFree(free, tx, ty, radius);
    if (!start) return [];
    [tx, ty] = start;
  }
  return floodFill(free, n, tx, ty, radius);
}

// The open tile nearest to (tx, ty) within the square of `radius` round it, as [x, y], or null.
function nearestFree(free, tx, ty, radius) {
  let nearest = null, nearestDist = Infinity;
  for (let y = ty - radius; y <= ty + radius; y++) for (let x = tx - radius; x <= tx + radius; x++) {
    const distance = Math.hypot(x - tx, y - ty);
    if (free(x, y) && distance < nearestDist) {
      nearestDist = distance;
      nearest = [x, y];
    }
  }
  return nearest;
}

// Breadth-first from the start tile, so the tiles come out nearest first.
function floodFill(free, n, startX, startY, radius) {
  const seen = new Set([startY * n + startX]), out = [{ x: startX, y: startY }];
  for (let i = 0; i < out.length; i++) for (const [dx, dy] of DIRS) {
    const { x, y } = out[i], nx = x + dx, ny = y + dy, key = ny * n + nx;
    if (Math.max(Math.abs(nx - startX), Math.abs(ny - startY)) > radius || seen.has(key) || !free(nx, ny)) continue;
    if (dx && dy && (!free(x + dx, y) || !free(x, y + dy))) continue;
    seen.add(key);
    out.push({ x: nx, y: ny });
  }
  return out;
}

// The open tile (a tile centre) nearest (x, y) for this layer, by square rings, or null: ships sent onto land sail to the
// shore.
export function nearestOpen(game, x, y, naval) {
  const n = game.map.size, cx = Math.floor(x), cy = Math.floor(y);
  for (let ring = 0; ring < n; ring++) for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue; // only the ring's edge; the inside was searched already
    const tx = cx + dx, ty = cy + dy;
    if (isOpenTile(game, n, tx, ty, naval)) return { x: tx + 0.5, y: ty + 0.5 };
  }
  return null;
}

// Free ground joined on foot (4-neighbour, around buildings and resources) to the tile at (x, y), or for a unit caught on
// a blocked tile, to the neighbours the pathfinder would step to from it (diagonals only past two free corners): a set of
// tile indices.
function groundFrom(game, x, y) {
  const n = game.map.size, seen = new Set(), queue = [];
  const open = (i, j) => isOpenTile(game, n, i, j, false);
  const seed = (i, j) => {
    if (!open(i, j) || seen.has(j * n + i)) return;
    seen.add(j * n + i);
    queue.push(j * n + i);
  };
  const cx = Math.floor(x), cy = Math.floor(y);
  if (open(cx, cy)) seed(cx, cy);
  else for (const [dx, dy] of DIRS) if (!(dx && dy) || (open(cx + dx, cy) && open(cx, cy + dy))) seed(cx + dx, cy + dy);
  for (let k = 0; k < queue.length; k++) {
    const tile = queue[k], i = tile % n, j = (tile / n) | 0;
    for (const [dx, dy] of ORTHOGONAL) seed(i + dx, j + dy);
  }
  return seen;
}

// Where a transport lands near (x, y): the open water tile (sea, a tile centre) beside free ground (shore, a tile
// centre) nearest the point, by square rings, or null. With `from`, the shore must be ground one can walk to from there
// (not a strip walled in by trees or buildings).
export function landingNear(game, x, y, from = null) {
  const n = game.map.size, cx = Math.floor(x), cy = Math.floor(y), tiles = game.map.tiles;
  const ground = from && groundFrom(game, from.x, from.y);
  const open = (i, j, naval) => isOpenTile(game, n, i, j, naval) && (naval || !ground || ground.has(j * n + i));
  for (let ring = 0; ring < n; ring++) for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
    const i = cx + dx, j = cy + dy;
    if (!open(i, j, true) || tiles[j * n + i] !== 1) continue; // a deep-water tile, so it is not ground itself
    const landing = landingAt(open, i, j);
    if (landing) return landing;
  }
  return null;
}

// The landing from the water tile (i, j) to the first open ground beside it (right, left, below, above), or null.
function landingAt(open, i, j) {
  for (const [ox, oy] of ORTHOGONAL) {
    if (open(i + ox, j + oy, false)) return { sea: { x: i + 0.5, y: j + 0.5 }, shore: { x: i + ox + 0.5, y: j + oy + 0.5 } };
  }
  return null;
}

// Up to `count` free ground tiles (tile centres) nearest (x, y) that are joined to it on foot, for passengers going ashore.
export function landingTiles(game, x, y, count) {
  return reachable(game, Math.floor(x), Math.floor(y), 4, false).slice(0, count).map(t => ({ x: t.x + 0.5, y: t.y + 0.5 }));
}

// The group's forward direction (fx, fy), a whole step of one of the 8 directions from its centroid towards (x, y).
// A group already standing on the point faces down the map (+y).
function facing(units, x, y) {
  const centroidX = units.reduce((sum, unit) => sum + unit.x, 0) / units.length;
  const centroidY = units.reduce((sum, unit) => sum + unit.y, 0) / units.length;
  const octant = Math.hypot(x - centroidX, y - centroidY) < 1
    ? 2
    : Math.round(Math.atan2(y - centroidY, x - centroidX) / (Math.PI / 4));
  return { fx: Math.round(Math.cos(octant * Math.PI / 4)), fy: Math.round(Math.sin(octant * Math.PI / 4)) };
}

// The units in rows of at most `cols`, front row first: rank by rank, the most forward of each rank first, and each row
// ordered left to right (along the right vector rx, ry).
function formRows(units, cols, fx, fy, rx, ry) {
  const forward = unit => unit.x * fx + unit.y * fy, side = unit => unit.x * rx + unit.y * ry;
  const rows = [];
  for (let rank = 0; rank < 4; rank++) {
    const group = units.filter(unit => RANK(unit) === rank).sort((a, b) => forward(b) - forward(a) || a.id - b.id);
    for (let i = 0; i < group.length; i += cols) {
      rows.push(group.slice(i, i + cols).sort((a, b) => side(a) - side(b) || a.id - b.id));
    }
  }
  return rows;
}

// The tile in `tiles` nearest to (sx, sy) that no unit has taken yet, or null.
function nearestUnused(tiles, used, n, sx, sy) {
  let nearest = null, nearestDist = Infinity;
  for (const tile of tiles) {
    if (used.has(tile.y * n + tile.x)) continue;
    const distance = Math.hypot(tile.x - sx, tile.y - sy);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearest = tile;
      if (distance === 0) break;
    }
  }
  return nearest;
}

// Returns a Map unit id -> { x, y } (a tile centre) for two or more units.
export function formationSlots(game, units, x, y) {
  const sorted = [...units].sort((a, b) => a.id - b.id), tx = Math.floor(x), ty = Math.floor(y);
  const { fx, fy } = facing(sorted, x, y), rx = -fy, ry = fx; // forward, right
  const cols = Math.min(12, Math.ceil(Math.sqrt(2 * sorted.length))), rows = formRows(sorted, cols, fx, fy, rx, ry);
  // Offsets are whole steps along forward/right, so on a diagonal every slot still lands on its own tile.
  const front = Math.floor((rows.length - 1) / 2), tiles = reachable(game, tx, ty, cols + rows.length + 6, sorted[0].naval);
  const n = game.map.size, used = new Set(), out = new Map();
  rows.forEach((row, i) => row.forEach((unit, j) => {
    const ahead = front - i, across = j - Math.floor((row.length - 1) / 2);
    const slotX = tx + ahead * fx + across * rx, slotY = ty + ahead * fy + across * ry;
    const tile = nearestUnused(tiles, used, n, slotX, slotY);
    if (!tile) return out.set(unit.id, { x, y }); // nowhere left to spread to: head for the point itself
    used.add(tile.y * n + tile.x);
    out.set(unit.id, { x: tile.x + 0.5, y: tile.y + 0.5 });
  }));
  return out;
}
