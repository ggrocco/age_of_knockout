import { makeRng } from './rng.js';
import { secs } from './util.js';
import { BUILDINGS } from '../data/buildings.js';
import { rotations } from './map-four.js';
// Ore patches (map tiles 2 gold vein, 3 quarry): Mines stand on them and share each patch's reserve. An emptied patch
// reverts to land and a fresh mirrored pair of its kind appears elsewhere, each new patch holding a third of the drained
// one's starting reserve (so the pair holds 2/3 and the map thins out). No respawn below RESPAWN_MIN, and never past the
// kind's PATCH_CAP live patches, so one kind can't crowd out the other.
export const PATCH_CAP = { gold: 8, stone: 4 }, RESPAWN_MIN = 400;
const ORE_TILE = { gold: 2, stone: 3 };
// Loose gold and stone piles: when a kind's piles fall below LOW_PILES of its starting total a mirrored cluster appears.
export const RESPAWN_EVERY = secs(30), PILE_COOLDOWN = secs(120), LOW_PILES = 0.25, PILE_AMOUNT = { gold: 800, stone: 600 };
const KINDS = ['gold', 'stone'], CENTRE_CLEAR = 8; // CENTRE_CLEAR: keep off the relic shallows at the centre, like map generation

export function initOre(game) {
  const n = game.map.size;
  // Own copies: the map's list stays untouched.
  const ownCopy = patch => ({ ...patch, tiles: [...patch.tiles], startReserve: patch.reserve });
  game.patches = new Map(game.map.orePatches.map(patch => [patch.id, ownCopy(patch)]));
  game.patchAt = new Int32Array(n * n);
  for (const patch of game.patches.values()) for (const i of patch.tiles) game.patchAt[i] = patch.id;
  // Never reused, so a surviving twin's `twin` can't point at a newer patch.
  game.nextPatchId = Math.max(0, ...game.patches.keys()) + 1;
  game.terrainVersion = 0;
  game.oreRng = makeRng((game.seed ^ 0x6f7265) >>> 0);
}

// Take up to `want` from a pile, a Farm or a Mine; returns the amount taken. A Mine draws on its patch's shared reserve.
export function drawFrom(game, source, want) {
  if (source.patch) return drawFromPatch(game, source, want);
  const take = Math.min(want, source.amount);
  source.amount -= take;
  if (source.amount <= 0) game.depleted(source);
  return take;
}

function drawFromPatch(game, mine, want) {
  const patch = game.patches.get(mine.patch);
  if (!patch) {
    mine.amount = 0;
    return 0;
  }
  const take = Math.min(want, patch.reserve);
  patch.reserve -= take;
  mine.amount = patch.reserve;
  if (patch.reserve <= 0) exhaustPatch(game, patch);
  return take;
}

// The patch is used up: its Mines (foundations too) collapse, its ground turns back to land, and a smaller pair spawns.
export function exhaustPatch(game, patch) {
  if (game.patches.get(patch.id) !== patch) return;
  patch.reserve = 0;
  for (const building of [...game.buildings.values()]) {
    if (building.patch !== patch.id) continue;
    building.amount = 0;
    game.remove(building);
  }
  for (const i of patch.tiles) {
    game.map.tiles[i] = 0;
    game.patchAt[i] = 0;
  }
  game.terrainVersion++;
  game.patches.delete(patch.id);
  const next = Math.floor(patch.startReserve / (game.players.length === 4 ? 6 : 3));
  if (next >= RESPAWN_MIN) spawnPatchPair(game, patch.kind, next);
}

// A random w x h top-left (x, y) whose rectangle and its 180-degree mirror are on the map, don't overlap, and pass
// accept(tx, ty) on every tile of both, then whole(x, y) (if given) on the rectangle's and the mirror's top-left.
// At most 200 tries from game.oreRng; null if none fits.
export function mirroredSpot(game, w, h, accept, whole = null) {
  const n = game.map.size, rng = game.oreRng;
  for (let tries = 0; tries < 200; tries++) {
    const x = 1 + rng.int(n - w - 1), y = 1 + rng.int(n - h - 1); // rect stays in [1, n-1)
    const mirrorX = n - x - w, mirrorY = n - y - h;
    if (x < mirrorX + w && mirrorX < x + w && y < mirrorY + h && mirrorY < y + h) continue; // overlaps its mirror
    if (!acceptsRect(n, x, y, w, h, accept)) continue;
    if (!whole || (whole(x, y) && whole(mirrorX, mirrorY))) return { x, y };
  }
  return null;
}

// accept(tx, ty) holds on every tile of the w x h rectangle at (x, y) and on its mirror tile.
function acceptsRect(n, x, y, w, h, accept) {
  for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) {
    if (!accept(tx, ty) || !accept(n - 1 - tx, n - 1 - ty)) return false;
  }
  return true;
}

// accept(x, y) for mirroredSpot: dry, empty, unreserved plain land with no loose relic on it (a pile or a Mine would
// make the relic unfetchable), more than 13 tiles from both starts and clear of the centre.
function openLand(game) {
  const n = game.map.size, mid = (n - 1) / 2, starts = game.map.starts, relicTiles = new Set();
  for (const relic of game.relics.values()) {
    if (relic.holder === null && relic.stored === null) relicTiles.add(Math.floor(relic.y) * n + Math.floor(relic.x));
  }
  return (x, y) => {
    const i = y * n + x;
    if (game.map.tiles[i] !== 0 || game.occAt(x, y) !== 0 || game.reserved.has(i) || relicTiles.has(i)) return false;
    return starts.every(start => Math.hypot(x - start.x, y - start.y) > 13) && Math.hypot(x - mid, y - mid) > CENTRE_CLEAR;
  };
}

// A mirrored pair of fresh 4x3 patches on dry, empty land well away from both starts. False at the kind's cap or with no room.
export function spawnPatchPair(game, kind, reserve) {
  if (game.players.length === 4) return spawnPatchQuartet(game, kind, reserve);
  let live = 0;
  for (const patch of game.patches.values()) if (patch.kind === kind) live++;
  if (live + 2 > PATCH_CAP[kind]) return false;
  const n = game.map.size;
  const spot = mirroredSpot(game, 4, 3, openLand(game));
  if (!spot) return false;
  const tiles = [];
  for (let y = spot.y; y < spot.y + 3; y++) for (let x = spot.x; x < spot.x + 4; x++) tiles.push(y * n + x);
  let id = game.nextPatchId;
  for (const liveId of game.patches.keys()) id = Math.max(id, liveId + 1); // above every live id too
  const patch = { id, kind, tiles, reserve, startReserve: reserve, twin: id + 1 };
  const twin = { id: id + 1, kind, tiles: tiles.map(i => n * n - 1 - i), reserve, startReserve: reserve, twin: id };
  game.nextPatchId = id + 2;
  addPatch(game, patch);
  addPatch(game, twin);
  game.terrainVersion++;
  return true;
}

function rotatedTiles(n, x, y, w, h) {
  const groups = [[], [], [], []];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) {
    rotations(n, x + dx, y + dy).forEach((p, k) => groups[k].push(p.y * n + p.x));
  }
  return groups;
}

function rotatedSpot(game, w, h, accept, whole = null) {
  const n = game.map.size;
  for (let tries = 0; tries < 200; tries++) {
    const x = 1 + game.oreRng.int(n - w - 1), y = 1 + game.oreRng.int(n - h - 1);
    const groups = rotatedTiles(n, x, y, w, h), all = groups.flat();
    if (new Set(all).size !== all.length || !all.every(i => accept(i % n, Math.floor(i / n)))) continue;
    if (whole && !groups.every(g => whole(Math.min(...g.map(i => i % n)), Math.min(...g.map(i => Math.floor(i / n)))))) continue;
    return { x, y, groups };
  }
  return null;
}

function spawnPatchQuartet(game, kind, reserve) {
  const live = [...game.patches.values()].filter(p => p.kind === kind).length;
  if (live + 4 > PATCH_CAP[kind] * 2) return false;
  const spot = rotatedSpot(game, 4, 3, openLand(game));
  if (!spot) return false;
  const first = game.nextPatchId;
  spot.groups.forEach((tiles, turn) => addPatch(game, {
    id: first + turn, kind, tiles, reserve, startReserve: reserve, twin: first + (turn + 2) % 4,
  }));
  game.nextPatchId += 4;
  game.terrainVersion++;
  return true;
}

function addPatch(game, patch) {
  game.patches.set(patch.id, patch);
  for (const i of patch.tiles) {
    game.map.tiles[i] = ORE_TILE[patch.kind];
    game.patchAt[i] = patch.id;
  }
}

const pileSum = (game, kind) => {
  let sum = 0;
  for (const resource of game.resources.values()) if (resource.type === kind) sum += resource.amount;
  return sum;
};

// createGame calls this once the map's piles are in: the totals the respawn threshold is measured against.
export function recordPileStart(game) {
  game.pileStart = { gold: pileSum(game, 'gold'), stone: pileSum(game, 'stone') };
  game.lastRespawn = { gold: -Infinity, stone: -Infinity };
}

// Tiles a villager can walk to from either Town Center: a 4-neighbour flood from both 3x3 Town Center footprints
// (seeded directly, so a standing Town Center doesn't block its own start) through tiles that aren't water and aren't
// occupied. Ore ground and wall foundations count as open, as in map.js `connected`; buildings and resources block.
function walkable(game) {
  const n = game.map.size, seen = new Uint8Array(n * n), stack = seedTownCenters(game, seen);
  const open = (x, y) => x >= 0 && y >= 0 && x < n && y < n && game.map.tiles[y * n + x] !== 1 && game.occAt(x, y) === 0;
  const visit = (x, y) => {
    if (!open(x, y) || seen[y * n + x]) return;
    seen[y * n + x] = 1;
    stack.push(y * n + x);
  };
  while (stack.length) {
    const i = stack.pop(), x = i % n, y = (i / n) | 0;
    visit(x + 1, y);
    visit(x - 1, y);
    visit(x, y + 1);
    visit(x, y - 1);
  }
  return seen;
}

// Marks both Town Center footprints as seen; returns their tiles as the flood's starting stack.
function seedTownCenters(game, seen) {
  const n = game.map.size, size = BUILDINGS.town_center.size, stack = [];
  for (const start of game.map.starts) for (let y = start.y - 1; y < start.y - 1 + size; y++) {
    for (let x = start.x - 1; x < start.x - 1 + size; x++) {
      const i = y * n + x;
      if (x < 0 || y < 0 || x >= n || y >= n || seen[i]) continue;
      seen[i] = 1;
      stack.push(i);
    }
  }
  return stack;
}

// whole(x, y) for mirroredSpot: some tile on a side of the w x h block at (x, y) was reached by the flood and is still free
// (the flood is shared by both kinds in one updateRespawn call, so an earlier block may have filled it since).
const reachedSide = (game, seen, w, h) => (x, y) => {
  const n = game.map.size;
  const reached = (tx, ty) => seen[ty * n + tx] && game.occAt(tx, ty) === 0;
  for (let k = 0; k < w; k++) for (const ty of [y - 1, y + h]) if (ty >= 0 && ty < n && reached(x + k, ty)) return true;
  for (let k = 0; k < h; k++) for (const tx of [x - 1, x + w]) if (tx >= 0 && tx < n && reached(tx, y + k)) return true;
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
    const finder = game.players.length === 4 ? rotatedSpot : mirroredSpot;
    const spot = finder(game, 2, 2, openLand(game), reachedSide(game, seen, 2, 2));
    if (!spot) continue;
    addPileBlock(game, kind, spot);
    game.lastRespawn[kind] = game.time;
  }
}

// A 2x2 block of fresh piles at `spot`, each placed with its mirror pile.
function addPileBlock(game, kind, spot) {
  const n = game.map.size, amount = PILE_AMOUNT[kind];
  if (game.players.length === 4) {
    for (const group of spot.groups) for (const i of group) {
      game.addResource({ type: kind, x: i % n + 0.5, y: Math.floor(i / n) + 0.5, amount });
    }
    return;
  }
  for (let y = spot.y; y < spot.y + 2; y++) for (let x = spot.x; x < spot.x + 2; x++) {
    game.addResource({ type: kind, x: x + 0.5, y: y + 0.5, amount });
    game.addResource({ type: kind, x: n - 1 - x + 0.5, y: n - 1 - y + 0.5, amount });
  }
}
