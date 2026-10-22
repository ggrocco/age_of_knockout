import { makeRng } from './rng.js';
// Ore patches (map tiles 2 gold vein, 3 quarry): Mines stand on them and share each patch's reserve. An emptied patch
// reverts to land and a fresh mirrored pair of its kind appears elsewhere, until PATCH_CAP patches are alive.
export const PATCH_CAP = 12;
const ORE_TILE = { gold: 2, stone: 3 }, RESPAWN = { gold: 1500, stone: 1250 }; // half the mid-map reserves

export function initOre(game) {
  const n = game.map.size;
  game.patches = new Map(game.map.orePatches.map(p => [p.id, { ...p, tiles: [...p.tiles] }])); // own copies: the map's list stays untouched
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

// The patch is used up: its Mines (foundations too) collapse, its ground turns back to land, and a new pair spawns.
export function exhaustPatch(game, patch) {
  if (game.patches.get(patch.id) !== patch) return;
  patch.reserve = 0;
  for (const b of [...game.buildings.values()]) if (b.patch === patch.id) { b.amount = 0; game.remove(b); }
  for (const i of patch.tiles) { game.map.tiles[i] = 0; game.patchAt[i] = 0; }
  game.terrainVersion++;
  game.patches.delete(patch.id);
  spawnPatchPair(game, patch.kind, RESPAWN[patch.kind]);
}

// A random w x h top-left (x, y) whose rectangle and its 180-degree mirror are on the map, don't overlap, and pass
// accept(tx, ty) on every tile of both. At most 200 tries from game.oreRng; null if none fits.
export function mirroredSpot(game, w, h, accept) {
  const n = game.map.size, rng = game.oreRng;
  for (let k = 0; k < 200; k++) {
    const x = 1 + rng.int(n - w - 1), y = 1 + rng.int(n - h - 1), mx = n - x - w, my = n - y - h; // rect stays in [1, n-1)
    if (x < mx + w && mx < x + w && y < my + h && my < y + h) continue; // overlaps its mirror
    let ok = true;
    for (let ty = y; ty < y + h && ok; ty++) for (let tx = x; tx < x + w && ok; tx++) ok = accept(tx, ty) && accept(n - 1 - tx, n - 1 - ty);
    if (ok) return { x, y };
  }
  return null;
}

// A mirrored pair of fresh 4x3 patches on dry, empty land well away from both starts. False at the cap or with no room.
export function spawnPatchPair(game, kind, reserve) {
  if (game.patches.size + 2 > PATCH_CAP) return false;
  const n = game.map.size, starts = game.map.starts;
  const accept = (x, y) => { const i = y * n + x; return game.map.tiles[i] === 0 && game.occAt(x, y) === 0 && !game.reserved.has(i) && starts.every(s => Math.hypot(x - s.x, y - s.y) > 13); };
  const spot = mirroredSpot(game, 4, 3, accept);
  if (!spot) return false;
  const own = [];
  for (let y = spot.y; y < spot.y + 3; y++) for (let x = spot.x; x < spot.x + 4; x++) own.push(y * n + x);
  let id = game.nextPatchId; for (const k of game.patches.keys()) id = Math.max(id, k + 1); // above every live id too
  const a = { id, kind, tiles: own, reserve, twin: id + 1 }, b = { id: id + 1, kind, tiles: own.map(i => n * n - 1 - i), reserve, twin: id };
  game.nextPatchId = id + 2;
  for (const p of [a, b]) { game.patches.set(p.id, p); for (const i of p.tiles) { game.map.tiles[i] = ORE_TILE[kind]; game.patchAt[i] = p.id; } }
  game.terrainVersion++;
  return true;
}
