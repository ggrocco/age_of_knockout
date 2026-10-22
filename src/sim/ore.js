import { makeRng } from './rng.js';
import { secs } from './util.js';
import { BUILDINGS } from '../data/buildings.js';
// Ore patches (map tiles 2 gold vein, 3 quarry): Mines stand on them and share each patch's reserve. An emptied patch
// reverts to land and a fresh mirrored pair of its kind appears elsewhere, each new patch holding a third of the drained
// one's starting reserve (so the pair holds 2/3 and the map thins out). No respawn below RESPAWN_MIN, and never past the
// kind's PATCH_CAP live patches, so one kind can't crowd out the other.
export const PATCH_CAP = { gold: 8, stone: 4 }, RESPAWN_MIN = 400;
const ORE_TILE = { gold: 2, stone: 3 };
// Loose gold and stone piles: when a kind's piles fall below LOW_PILES of its starting total a mirrored cluster appears.
export const RESPAWN_EVERY = secs(30), PILE_COOLDOWN = secs(120), LOW_PILES = 0.25, PILE_AMOUNT = { gold: 800, stone: 600 };
const KINDS = ['gold', 'stone'], CENTRE_CLEAR = 8; // CENTRE_CLEAR: keep off the relic land bridge, like map generation

export function initOre(game) {
  const n = game.map.size;
  game.patches = new Map(game.map.orePatches.map(p => [p.id, { ...p, tiles: [...p.tiles], startReserve: p.reserve }])); // own copies: the map's list stays untouched
  game.patchAt = new Int32Array(n * n);
  for (const p of game.patches.values()) for (const i of p.tiles) game.patchAt[i] = p.id;
  game.nextPatchId = Math.max(0, ...game.patches.keys()) + 1; // never reused, so a surviving twin's `twin` can't point at a newer patch
  game.terrainVersion = 0;
  game.oreRng = makeRng((game.seed ^ 0x6f7265) >>> 0);
}

// Take up to `want` from a pile, a Farm or a Mine; returns the amount taken. A Mine draws on its patch's shared reserve.
export function drawFrom(game, res, want) {
  if (res.patch) {
    const p = game.patches.get(res.patch);
    if (!p) { res.amount = 0; return 0; }
    const take = Math.min(want, p.reserve); p.reserve -= take; res.amount = p.reserve;
    if (p.reserve <= 0) exhaustPatch(game, p);
    return take;
  }
  const take = Math.min(want, res.amount); res.amount -= take;
  if (res.amount <= 0) game.depleted(res);
  return take;
}

// The patch is used up: its Mines (foundations too) collapse, its ground turns back to land, and a smaller pair spawns.
export function exhaustPatch(game, patch) {
  if (game.patches.get(patch.id) !== patch) return;
  patch.reserve = 0;
  for (const b of [...game.buildings.values()]) if (b.patch === patch.id) { b.amount = 0; game.remove(b); }
  for (const i of patch.tiles) { game.map.tiles[i] = 0; game.patchAt[i] = 0; }
  game.terrainVersion++;
  game.patches.delete(patch.id);
  const next = Math.floor(patch.startReserve / 3);
  if (next >= RESPAWN_MIN) spawnPatchPair(game, patch.kind, next);
}

// A random w x h top-left (x, y) whose rectangle and its 180-degree mirror are on the map, don't overlap, and pass
// accept(tx, ty) on every tile of both, then whole(x, y) (if given) on the rectangle's and the mirror's top-left.
// At most 200 tries from game.oreRng; null if none fits.
export function mirroredSpot(game, w, h, accept, whole = null) {
  const n = game.map.size, rng = game.oreRng;
  for (let k = 0; k < 200; k++) {
    const x = 1 + rng.int(n - w - 1), y = 1 + rng.int(n - h - 1), mx = n - x - w, my = n - y - h; // rect stays in [1, n-1)
    if (x < mx + w && mx < x + w && y < my + h && my < y + h) continue; // overlaps its mirror
    let ok = true;
    for (let ty = y; ty < y + h && ok; ty++) for (let tx = x; tx < x + w && ok; tx++) ok = accept(tx, ty) && accept(n - 1 - tx, n - 1 - ty);
    if (ok && (!whole || (whole(x, y) && whole(mx, my)))) return { x, y };
  }
  return null;
}

// accept(x, y) for mirroredSpot: dry, empty, unreserved plain land with no loose relic on it (a pile or a Mine would
// make the relic unfetchable), more than 13 tiles from both starts and clear of the centre.
function openLand(game) {
  const n = game.map.size, mid = (n - 1) / 2, starts = game.map.starts, relics = new Set();
  for (const r of game.relics.values()) if (r.holder === null && r.stored === null) relics.add(Math.floor(r.y) * n + Math.floor(r.x));
  return (x, y) => { const i = y * n + x; return game.map.tiles[i] === 0 && game.occAt(x, y) === 0 && !game.reserved.has(i) && !relics.has(i)
    && starts.every(s => Math.hypot(x - s.x, y - s.y) > 13) && Math.hypot(x - mid, y - mid) > CENTRE_CLEAR; };
}

// A mirrored pair of fresh 4x3 patches on dry, empty land well away from both starts. False at the kind's cap or with no room.
export function spawnPatchPair(game, kind, reserve) {
  let live = 0; for (const p of game.patches.values()) if (p.kind === kind) live++;
  if (live + 2 > PATCH_CAP[kind]) return false;
  const n = game.map.size;
  const spot = mirroredSpot(game, 4, 3, openLand(game));
  if (!spot) return false;
  const own = [];
  for (let y = spot.y; y < spot.y + 3; y++) for (let x = spot.x; x < spot.x + 4; x++) own.push(y * n + x);
  let id = game.nextPatchId; for (const k of game.patches.keys()) id = Math.max(id, k + 1); // above every live id too
  const a = { id, kind, tiles: own, reserve, startReserve: reserve, twin: id + 1 }, b = { id: id + 1, kind, tiles: own.map(i => n * n - 1 - i), reserve, startReserve: reserve, twin: id };
  game.nextPatchId = id + 2;
  for (const p of [a, b]) { game.patches.set(p.id, p); for (const i of p.tiles) { game.map.tiles[i] = ORE_TILE[kind]; game.patchAt[i] = p.id; } }
  game.terrainVersion++;
  return true;
}

const pileSum = (game, kind) => { let sum = 0; for (const r of game.resources.values()) if (r.type === kind) sum += r.amount; return sum; };

// createGame calls this once the map's piles are in: the totals the respawn threshold is measured against.
export function recordPileStart(game) {
  game.pileStart = { gold: pileSum(game, 'gold'), stone: pileSum(game, 'stone') };
  game.lastRespawn = { gold: -Infinity, stone: -Infinity };
}

// Tiles a villager can walk to from either Town Center: a 4-neighbour flood from both 3x3 Town Center footprints
// (seeded directly, so a standing Town Center doesn't block its own start) through tiles that aren't water and aren't
// occupied. Ore ground and wall foundations count as open, as in map.js `connected`; buildings and resources block.
function walkable(game) {
  const n = game.map.size, seen = new Uint8Array(n * n), stack = [], size = BUILDINGS.town_center.size;
  const open = (x, y) => x >= 0 && y >= 0 && x < n && y < n && game.map.tiles[y * n + x] !== 1 && game.occAt(x, y) === 0;
  for (const s of game.map.starts) for (let y = s.y - 1; y < s.y - 1 + size; y++) for (let x = s.x - 1; x < s.x - 1 + size; x++) {
    const i = y * n + x; if (x >= 0 && y >= 0 && x < n && y < n && !seen[i]) { seen[i] = 1; stack.push(i); }
  }
  while (stack.length) {
    const i = stack.pop(), x = i % n, y = (i / n) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (open(nx, ny) && !seen[ny * n + nx]) { seen[ny * n + nx] = 1; stack.push(ny * n + nx); }
  }
  return seen;
}

// whole(x, y) for mirroredSpot: some tile on a side of the w x h block at (x, y) was reached by the flood and is still free
// (the flood is shared by both kinds in one updateRespawn call, so an earlier block may have filled it since).
const reachedSide = (game, seen, w, h) => (x, y) => {
  const n = game.map.size;
  for (let k = 0; k < w; k++) for (const ty of [y - 1, y + h]) if (ty >= 0 && ty < n && seen[ty * n + x + k] && game.occAt(x + k, ty) === 0) return true;
  for (let k = 0; k < h; k++) for (const tx of [x - 1, x + w]) if (tx >= 0 && tx < n && seen[(y + k) * n + tx] && game.occAt(tx, y + k) === 0) return true;
  return false;
};

// For each kind whose loose piles have run below LOW_PILES of the start (and not within PILE_COOLDOWN of its last
// respawn): a 2x2 block of piles and its 180-degree mirror on open land, each reachable on foot from a Town Center.
// One flood per call, and only when a kind actually needs a spawn. Gives up quietly if the map has no room.
export function updateRespawn(game) {
  let seen = null;
  for (const kind of KINDS) {
    if (pileSum(game, kind) >= LOW_PILES * game.pileStart[kind] || game.time - game.lastRespawn[kind] < PILE_COOLDOWN) continue;
    seen ??= walkable(game);
    const spot = mirroredSpot(game, 2, 2, openLand(game), reachedSide(game, seen, 2, 2));
    if (!spot) continue;
    const n = game.map.size;
    for (let y = spot.y; y < spot.y + 2; y++) for (let x = spot.x; x < spot.x + 2; x++)
      for (const [px, py] of [[x, y], [n - 1 - x, n - 1 - y]]) game.addResource({ type: kind, x: px + 0.5, y: py + 0.5, amount: PILE_AMOUNT[kind] });
    game.lastRespawn[kind] = game.time;
  }
}
