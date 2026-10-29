import { makeRng } from './rng.js';
import { AGES, AGE_COST } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { farmStats } from '../data/farms.js';
// 180-degree rotationally symmetric map so both players get identical terrain and resources.
// type: 'rivers' (a river with land crossings between the players) or 'islands' (no way across but by ship).
// Every random number comes from the seeded rng, in a fixed order: changing that order changes every map.
export const MAP_TYPES = ['rivers', 'islands'];
export function generateMap(seed, size = 112, type = 'rivers') {
  if (!MAP_TYPES.includes(type)) type = 'rivers';
  for (let attempt = 0; attempt < 20; attempt++) {
    const map = build(seed + attempt * 1000, size, type);
    if (type === 'islands' ? apart(map) : connected(map)) return map;
  }
  throw new Error('map generation failed for seed ' + seed);
}

const NEIGHBOURS_4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Tiles reached on foot from tile `start` (4-neighbour, deep water blocks; with `blockResources` resources block too).
function walk(map, start, blockResources) {
  const n = map.size, open = new Uint8Array(n * n), seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) open[i] = map.tiles[i] !== 1;
  if (blockResources) for (const resource of map.resources) open[tileIndex(map, resource)] = 0;
  const stack = [start];
  seen[start] = 1;
  while (stack.length) {
    const i = stack.pop(), x = i % n, y = (i / n) | 0;
    for (const [dx, dy] of NEIGHBOURS_4) {
      const nx = x + dx, ny = y + dy, j = ny * n + nx;
      if (nx >= 0 && ny >= 0 && nx < n && ny < n && open[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return seen;
}
const tileIndex = (map, point) => Math.floor(point.y) * map.size + Math.floor(point.x);

// Rivers: both starts and every relic spot must share one walkable region (water and resources block).
// 4-neighbour flood fill: with no corner cutting, A* reaches exactly these tiles.
function connected(map) {
  const seen = walk(map, tileIndex(map, map.starts[0]), true);
  return [map.starts[1], ...map.relicSpots].every(point => seen[tileIndex(map, point)]);
}
// Islands: no ground at all joins a start to the other start or to the central island, the relic spots share the
// central island (resources block there, so none is walled off), and each home island can pay to climb CLIMB_AGES Ages
// (the islands are mirror images, so checking one checks both).
function apart(map) {
  const home = walk(map, tileIndex(map, map.starts[0]), false);
  const centre = walk(map, tileIndex(map, map.relicSpots[0]), true);
  if (home[tileIndex(map, map.starts[1])] || home[tileIndex(map, map.relicSpots[0])]) return false;
  return map.relicSpots.every(point => centre[tileIndex(map, point)]) && homeBudget(map, 0).ok;
}

// A home island must hold enough to climb CLIMB_AGES Ages (Stone to Medieval) without leaving it, with half again to
// spare (CLIMB_MARGIN): the age-ups, the two cheapest gate buildings of each Age left, CLIMB_VILLAGERS villagers and the
// Houses for them, and a Dock and a Transport Ship to leave by. Food its berries don't cover comes from Farms, which
// cost wood (at Stone Age capacity, the least a Farm holds). All from the data tables, so it follows their changes.
export const CLIMB_AGES = 4, CLIMB_MARGIN = 1.5, CLIMB_VILLAGERS = 20;
const sum = cost => Object.values(cost).reduce((total, amount) => total + amount, 0);
// The costs of the two cheapest buildings that count towards advancing out of `age`.
const twoCheapestGates = age => Object.entries(BUILDINGS)
  .filter(([id, def]) => def.age === age && id !== 'town_center' && !def.extra)
  .map(([, def]) => def.cost)
  .sort((a, b) => sum(a) - sum(b))
  .slice(0, 2);
export function climbCost(ages = CLIMB_AGES) {
  const need = { food: 0, wood: 0, gold: 0, stone: 0 };
  const add = (cost, times = 1) => { for (const resource in need) need[resource] += (cost[resource] || 0) * times; };
  for (const age of AGES.slice(1, ages + 1)) add(AGE_COST[age].cost);
  for (const age of AGES.slice(0, ages)) for (const cost of twoCheapestGates(age)) add(cost);
  add(UNITS.villager.cost, CLIMB_VILLAGERS);
  add(BUILDINGS.house.cost, Math.ceil(Math.max(0, CLIMB_VILLAGERS - BUILDINGS.town_center.pop) / BUILDINGS.house.pop));
  add(BUILDINGS.dock.cost);
  add(UNITS.transport_ship.cost);
  return need;
}
// What lies on player pid's home land (ground joined to its start, deep water parting it): loose resources and ore
// patch reserves; fish need a Dock and the sea, so they don't count. ok: it covers climbCost() with the margin.
const HOME_KIND = { tree: 'wood', berry: 'food', gold: 'gold', stone: 'stone' };
export function homeBudget(map, pid) {
  const land = walk(map, tileIndex(map, map.starts[pid]), false), have = { food: 0, wood: 0, gold: 0, stone: 0 };
  for (const resource of map.resources) {
    const kind = HOME_KIND[resource.type];
    if (kind && land[tileIndex(map, resource)]) have[kind] += resource.amount;
  }
  for (const patch of map.orePatches) if (land[patch.tiles[0]]) have[patch.kind] += patch.reserve;
  const need = climbCost(), want = resource => need[resource] * CLIMB_MARGIN;
  const woodPerFood = BUILDINGS.farm.cost.wood / farmStats('stone').amount;
  const wood = have.wood - Math.max(0, want('food') - have.food) * woodPerFood; // what the Farms for the missing food take
  return { have, need, ok: wood >= want('wood') && have.gold >= want('gold') && have.stone >= want('stone') };
}

// Generation helpers. `layout` is one generation attempt's state (newLayout); s0 is player 0's start, s1 its mirror.
const START_AMOUNT = { tree: 100, berry: 200, gold: 800, stone: 600, fish: 300 };
const MINE_TILE = { gold: 2, stone: 3 };
const CENTRE_SHALLOWS = 12; // the river is shallow this far either side of the map centre, where the relics are
const mirror = (size, x, y) => ({ x: size - 1 - x, y: size - 1 - y });
const dist = (x, y, point) => Math.hypot(x - point.x, y - point.y);

function build(seed, size, type) {
  const layout = newLayout(seed, size, type);
  // The river's own fish are rolled after the others (keeps every river map's seed as it was).
  let riverCourse = null;
  if (layout.islands) shapeIslands(layout);
  else riverCourse = carveRivers(layout);
  placeStartResources(layout);
  placeOre(layout);
  placeForests(layout);
  for (const [x, y, spread, count] of layout.shoals) placeShoal(layout, x, y, spread, count);
  if (riverCourse) placeRiverFish(layout, riverCourse);
  return finishWithRelics(layout);
}

function newLayout(seed, size, type) {
  const rng = makeRng(seed), tiles = new Uint8Array(size * size), mid = (size - 1) / 2;
  // Starts sit on a ring around the centre at a random angle, keeping the resource rings off the edge.
  const startAngle = rng.next() * Math.PI * 2, ringRadius = size / 2 - 14;
  const s0 = { x: Math.round(mid + Math.cos(startAngle) * ringRadius), y: Math.round(mid + Math.sin(startAngle) * ringRadius) };
  const s1 = mirror(size, s0.x, s0.y);
  // Away from both starts and the centre: where ponds, mid-map patches and the open-map forests may go.
  const far = (x, y) => dist(x, y, s0) > 13 && dist(x, y, s1) > 13 && Math.hypot(x - mid, y - mid) > 9;
  // Tile 1 is deep water (ships only), tile 4 shallows (ships and soldiers both cross; nothing is built or placed there).
  return {
    rng, size, type, tiles, mid, startAngle, s0, s1, far, islands: type === 'islands',
    bank: [], // spots along the river banks that may grow a tree
    shoals: [], // [x, y, spread, count] for the fish, placed last
    resources: [], taken: new Set(), nextResourceId: 0, orePatches: [], fishAt: [],
  };
}

// Open sea everywhere but a home island round each start and a central island holding the relics and rich gold and
// stone. No shallows: the only way across is by ship. The coasts wobble; the central island's wobble has only even
// harmonics, so it is its own mirror image. Each home island is the other's mirror (both tiles are set at once).
function shapeIslands(layout) {
  const { rng, size, tiles, s0, mid } = layout;
  tiles.fill(1);
  const phase = [0, 1, 2, 3].map(() => rng.next() * Math.PI * 2);
  const homeRadius = angle => 20 + 2.5 * Math.sin(3 * angle + phase[0]) + 1.5 * Math.sin(5 * angle + phase[1]);
  const centreRadius = angle => 11.5 + 1.5 * Math.sin(2 * angle + phase[2]) + Math.sin(4 * angle + phase[3]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offHome = dist(x, y, s0) > homeRadius(Math.atan2(y - s0.y, x - s0.x));
    if (offHome && Math.hypot(x - mid, y - mid) > centreRadius(Math.atan2(y - mid, x - mid))) continue;
    const twin = mirror(size, x, y);
    tiles[y * size + x] = 0;
    tiles[twin.y * size + twin.x] = 0;
  }
  fillLagoons(tiles, size);
  addIslandShoals(layout, homeRadius, centreRadius);
}

// Water cut off from the open sea (a lagoon in a wobbly coast or a map corner) would trap any ship built there: fill
// it in. The open sea is the largest body of water; each body's mirror is a body of the same size, so this stays mirrored.
function fillLagoons(tiles, size) {
  const body = new Int32Array(size * size).fill(-1), bodySizes = [];
  for (let start = 0; start < size * size; start++) {
    if (tiles[start] === 1 && body[start] < 0) bodySizes.push(floodWaterBody(tiles, size, body, start, bodySizes.length));
  }
  const sea = bodySizes.indexOf(Math.max(...bodySizes));
  for (let i = 0; i < size * size; i++) if (tiles[i] === 1 && body[i] !== sea) tiles[i] = 0;
}

// Labels every deep-water tile 4-joined to `start` with `label` in `body`; returns how many tiles it labelled.
function floodWaterBody(tiles, size, body, start, label) {
  const queue = [start];
  body[start] = label;
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % size, y = (i / size) | 0;
    for (const [dx, dy] of NEIGHBOURS_4) {
      const nx = x + dx, ny = y + dy, j = ny * size + nx;
      if (nx >= 0 && ny >= 0 && nx < size && ny < size && tiles[j] === 1 && body[j] < 0) {
        body[j] = label;
        queue.push(j);
      }
    }
  }
  return queue.length;
}

// Fish off each home island's coast and round the central island.
function addIslandShoals(layout, homeRadius, centreRadius) {
  const { rng, size, s0, mid, shoals } = layout;
  for (let tries = 0, got = 0; got < 6 && tries < 60; tries++) { // home islands reach the map's edge: only spots on the map count
    const angle = rng.next() * Math.PI * 2, radius = homeRadius(angle) + 4 + rng.next() * 3;
    const x = s0.x + Math.cos(angle) * radius, y = s0.y + Math.sin(angle) * radius;
    if (x >= 3 && y >= 3 && x < size - 3 && y < size - 3) {
      shoals.push([x, y, 2, 1]);
      got++;
    }
  }
  for (let k = 0; k < 2; k++) {
    const angle = rng.next() * Math.PI * 2, radius = centreRadius(angle) + 3 + rng.next() * 2;
    shoals.push([mid + Math.cos(angle) * radius, mid + Math.sin(angle) * radius, 1, 1]);
  }
}

// Paints water on a disc and its mirror: disc(cx, cy, radius, tile = 1, keep = () => true), only on tiles keep(x, y)
// accepts. Never within 15 tiles of a start, and shallows never fill in deep water.
function waterPainter(layout) {
  const { size, tiles, s0, s1 } = layout;
  const wet = (x, y, tile) => {
    if (x < 0 || y < 0 || x >= size || y >= size || dist(x, y, s0) <= 15 || dist(x, y, s1) <= 15) return;
    const twin = mirror(size, x, y), i = y * size + x, j = twin.y * size + twin.x;
    if (tiles[i] !== 1) tiles[i] = tile;
    if (tiles[j] !== 1) tiles[j] = tile;
  };
  return (cx, cy, radius, tile = 1, keep = () => true) => {
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        if (Math.hypot(x - cx, y - cy) <= radius && keep(x, y)) wet(x, y, tile);
      }
    }
  };
}

// Rivers map: a few ponds, the river between the players, an estuary lake past each ford and a home bay per player.
// Returns the river's course for placeRiverFish.
function carveRivers(layout) {
  const { rng, size, far } = layout, disc = waterPainter(layout);
  // Small ponds. The pond count is rolled again at every check of the loop (keeps every map's seed as it was).
  for (let pond = 0; pond < 1 + rng.int(3); pond++) {
    const cx = rng.int(size), cy = rng.int(size);
    disc(cx, cy, 2 + rng.int(3), 1, far);
  }
  const course = riverCourse(layout);
  carveRiver(layout, disc, course);
  carveEstuaryAndBay(layout, disc, course);
  return course;
}

// A meandering, navigable river runs edge to edge between the players. Its sideways offset is an odd function of t,
// so the mirrored half joins it smoothly at the centre. Soldiers cross it (there is always a way to attack on foot) at
// the shallows over the centre, where the relics are, and at a shallow ford on each half; ships sail the whole river.
function riverCourse(layout) {
  const { rng, size, mid } = layout;
  const angle = layout.startAngle + Math.PI / 2 + (rng.next() - 0.5) * 0.6;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) }, perp = { x: -dir.y, y: dir.x };
  const amp = 3 + rng.next() * 4, freq = 0.07 + rng.next() * 0.05, ford = size * (0.24 + rng.next() * 0.08);
  // The river's centre line at distance t along it from the map centre.
  const along = t => {
    const offset = amp * Math.sin(t * freq);
    return { x: mid + dir.x * t + perp.x * offset, y: mid + dir.y * t + perp.y * offset };
  };
  return { along, perp, ford, halfWidth: t => 3 + 0.8 * Math.sin(t * 0.21) };
}

function carveRiver(layout, disc, { along, perp, ford, halfWidth }) {
  const { size, bank } = layout;
  for (let t = 0; t < size; t += 0.5) {
    const { x: px, y: py } = along(t), width = halfWidth(t);
    const shallow = t < CENTRE_SHALLOWS || Math.abs(t - ford) < width + 2.5; // fords at least 5 tiles across
    if (px < -2 || py < -2 || px > size + 1 || py > size + 1) break;
    disc(px, py, width, shallow ? 4 : 1);
    if (shallow || t % 2 !== 0) continue;
    for (const side of [-1, 1]) bank.push({ x: px + perp.x * side * (width + 1.5), y: py + perp.y * side * (width + 1.5) });
  }
}

// Past each ford the river opens into an estuary lake, and each player has a home bay: a channel from the river to a
// lake 17 tiles or more from their start, so a Dock is a short walk from home. The bays are mirror images, both on the
// one river, so the two home fleets can meet.
function carveEstuaryAndBay(layout, disc, { along, ford }) {
  const { rng, s0, shoals } = layout;
  const estuary = along(ford + 9 + rng.next() * 6);
  disc(estuary.x, estuary.y, 6 + rng.next() * 2);
  const side = rng.next() < 0.5 ? 1 : -1;
  const mouth = along(side * (CENTRE_SHALLOWS + 2 + rng.next() * Math.max(1, ford - CENTRE_SHALLOWS - 10)));
  const toward = Math.hypot(mouth.x - s0.x, mouth.y - s0.y);
  const lake = { x: s0.x + (mouth.x - s0.x) * 24 / toward, y: s0.y + (mouth.y - s0.y) * 24 / toward };
  for (let k = 0; k <= 1; k += 0.5 / toward) disc(lake.x + (mouth.x - lake.x) * k, lake.y + (mouth.y - lake.y) * k, 2.4);
  disc(lake.x, lake.y, 6.5);
  shoals.push([lake.x, lake.y, 4.5, 4], [estuary.x, estuary.y, 5, 3]);
}

const tileKey = (layout, x, y) => y * layout.size + x;
// Dry, inside the map's 1-tile border, and nothing placed there yet.
const isOpenLand = (layout, x, y) => {
  const { size, tiles, taken } = layout;
  return x >= 1 && y >= 1 && x < size - 1 && y < size - 1 && !tiles[tileKey(layout, x, y)] && !taken.has(tileKey(layout, x, y));
};
function addResource(layout, type, x, y, amount) {
  layout.taken.add(tileKey(layout, x, y));
  layout.resources.push({ id: 'r' + layout.nextResourceId++, type, x: x + 0.5, y: y + 0.5, amount });
}
// A pile on (x, y) and one on its mirror tile, each only where the land is open.
function placeMirrored(layout, type, x, y, amount) {
  const twin = mirror(layout.size, x, y);
  if (isOpenLand(layout, x, y)) addResource(layout, type, x, y, amount);
  if (isOpenLand(layout, twin.x, twin.y)) addResource(layout, type, twin.x, twin.y, amount);
}

// Berries, gold and stone in rings round the start (mirrored round the other), off the Town Center's own tiles.
function placeStartResources(layout) {
  placeRing(layout, 'berry', 6, 6, 8);
  placeRing(layout, 'gold', 4, 9, 13);
  placeRing(layout, 'stone', 3, 9, 13);
}
function placeRing(layout, type, count, minRadius, maxRadius) {
  const { rng, s0, resources } = layout;
  for (let tries = 0, placed = 0; placed < count && tries < 200; tries++) {
    const angle = rng.next() * Math.PI * 2, radius = minRadius + rng.next() * (maxRadius - minRadius);
    const x = Math.round(s0.x + Math.cos(angle) * radius), y = Math.round(s0.y + Math.sin(angle) * radius);
    if (Math.abs(x - s0.x) <= 2 && Math.abs(y - s0.y) <= 2) continue;
    const before = resources.length;
    placeMirrored(layout, type, x, y, START_AMOUNT[type]);
    if (resources.length > before) placed++;
  }
}

// A mirrored pair of piles, both or neither; also off the relic shallows at the centre. True if placed.
function placePair(layout, type, x, y, amount) {
  const twin = mirror(layout.size, x, y);
  if (!isOpenLand(layout, x, y) || !isOpenLand(layout, twin.x, twin.y) || (x === twin.x && y === twin.y)) return false;
  if (Math.hypot(x - layout.mid, y - layout.mid) <= 8) return false;
  placeMirrored(layout, type, x, y, amount);
  return true;
}

// A w x h ore patch centred near (cx, cy) and its mirror, both on dry, free land clear of the relic shallows at the
// centre and not overlapping. Returns its rectangle { x0, y0, w, h }, or false if it doesn't fit.
function placePatch(layout, kind, cx, cy, w, h, reserve) {
  const { size, tiles, mid, orePatches } = layout;
  const x0 = Math.round(cx - w / 2), y0 = Math.round(cy - h / 2), own = new Set(), mirrored = new Set();
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const twin = mirror(size, x, y);
    if (!isOpenLand(layout, x, y) || !isOpenLand(layout, twin.x, twin.y) || Math.hypot(x - mid, y - mid) <= 8) return false;
    own.add(tileKey(layout, x, y));
    mirrored.add(tileKey(layout, twin.x, twin.y));
  }
  for (const i of own) if (mirrored.has(i)) return false;
  const id = orePatches.length + 1, tile = MINE_TILE[kind];
  for (const i of own) tiles[i] = tile;
  for (const i of mirrored) tiles[i] = tile;
  orePatches.push(
    { id, kind, tiles: [...own], reserve, twin: id + 1 },
    { id: id + 1, kind, tiles: [...mirrored], reserve, twin: id },
  );
  return { x0, y0, w, h };
}

// Rocky ore patches (tile 2 gold vein, 3 quarry) for Mines, each placed with its 180-degree mirror or not at all; on
// islands the rich piles instead.
function placeOre(layout) {
  const { rng, s0 } = layout;
  for (let tries = 0; tries < 100; tries++) { // home gold patch: 4x3, centre 12-16 tiles from the start, outside the open base
    const angle = rng.next() * Math.PI * 2, radius = 12 + rng.next() * 4;
    if (placePatch(layout, 'gold', s0.x + Math.cos(angle) * radius, s0.y + Math.sin(angle) * radius, 4, 3, 1500)) break;
  }
  if (layout.islands) {
    placeCentralPiles(layout, 'gold', 1200, 4);
    placeCentralPiles(layout, 'stone', 900, 3);
    return;
  }
  placeMidMapPatch(layout, 'gold', 3000, 1200);
  placeMidMapPatch(layout, 'gold', 3000, 1200);
  placeMidMapPatch(layout, 'stone', 2500, 900);
}

// Islands: the rich piles lie on the central island, 9-11 tiles from its middle (the relics keep the middle 8).
function placeCentralPiles(layout, type, amount, count) {
  const { rng, mid } = layout;
  for (let tries = 0, got = 0; got < count && tries < 200; tries++) {
    const angle = rng.next() * Math.PI * 2, radius = 9 + rng.next() * 2;
    const x = Math.round(mid + Math.cos(angle) * radius), y = Math.round(mid + Math.sin(angle) * radius);
    if (placePair(layout, type, x, y, amount)) got++;
  }
}

// A mid-map patch in s0's half (the mirror lands in the other), with a cluster of 5 richer piles of its kind on its border.
function placeMidMapPatch(layout, kind, reserve, pileAmount) {
  const { rng, size, s0, s1, far } = layout;
  for (let tries = 0; tries < 200; tries++) {
    const x = rng.int(size), y = rng.int(size), fromStart = dist(x, y, s0);
    if (!far(x, y) || fromStart < 20 || fromStart > 34 || fromStart >= dist(x, y, s1)) continue;
    const rect = placePatch(layout, kind, x, y, 5, 4, reserve);
    if (!rect) continue;
    placeBorderPiles(layout, rect, kind, pileAmount);
    return;
  }
}
function placeBorderPiles(layout, rect, type, amount) {
  const edge = []; // free land touching the rectangle's border
  for (let y = rect.y0 - 1; y <= rect.y0 + rect.h; y++) for (let x = rect.x0 - 1; x <= rect.x0 + rect.w; x++) {
    if (x < rect.x0 || y < rect.y0 || x >= rect.x0 + rect.w || y >= rect.y0 + rect.h) edge.push([x, y]);
  }
  for (let tries = 0, got = 0; got < 5 && tries < 100; tries++) {
    const [x, y] = edge[layout.rng.int(edge.length)];
    if (placePair(layout, type, x, y, amount)) got++;
  }
}

// A round, mostly solid stand of trees: each tile within `radius` grows one with chance `density` where clear(x, y).
function placeForest(layout, cx, cy, radius, density, clear) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      if (Math.hypot(x - cx, y - cy) > radius || layout.rng.next() >= density || !clear(x, y)) continue;
      placeMirrored(layout, 'tree', x, y, START_AMOUNT.tree);
    }
  }
}
function placeForests(layout) {
  const { rng, size, s0, far, bank } = layout;
  const home = (x, y) => dist(x, y, s0) > 8; // woodlines near the start keep the TC and its build space open
  placeWoodlines(layout, 3, 11, home);
  if (layout.islands) placeWoodlines(layout, 4, 14, home); // the sea takes the rest of the map's forests
  for (let f = 0, count = Math.round(size * size / 480); f < count; f++) {
    const cx = rng.int(size), cy = rng.int(size);
    placeForest(layout, cx, cy, 2 + rng.next() * 2.5, 0.7, far);
  }
  for (const spot of bank) if (rng.next() < 0.3) placeForest(layout, spot.x, spot.y, 0.5, 1, far);
}
// `count` woodlines round the start, `minRadius` to 3 tiles further out.
function placeWoodlines(layout, count, minRadius, clear) {
  const { rng, s0 } = layout;
  for (let c = 0; c < count; c++) {
    const angle = rng.next() * Math.PI * 2, radius = minRadius + rng.next() * 3;
    placeForest(layout, s0.x + Math.cos(angle) * radius, s0.y + Math.sin(angle) * radius, 2.5, 0.75, clear);
  }
}

// Fish (food for Fishing Ships), mirrored, where `shoals` says: in each home bay, estuary and along the river, or off the
// islands' coasts. Only on open water (all eight neighbours wet) and 3 tiles apart, so a shoal never closes a channel
// or sits against the shore.
function isOpenWater(layout, x, y) {
  const { size, tiles } = layout;
  for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) {
    if (i < 0 || j < 0 || i >= size || j >= size || tiles[tileKey(layout, i, j)] !== 1) return false;
  }
  return true;
}
const nearFish = (layout, x, y) => layout.fishAt.some(fish => Math.max(Math.abs(fish.x - x), Math.abs(fish.y - y)) < 3);
function placeShoal(layout, cx, cy, spread, count) {
  const { rng, size } = layout;
  for (let tries = 0, got = 0; got < count && tries < 60; tries++) {
    const x = Math.round(cx + (rng.next() * 2 - 1) * spread), y = Math.round(cy + (rng.next() * 2 - 1) * spread);
    const twin = mirror(size, x, y);
    if (!isOpenWater(layout, x, y) || (x === twin.x && y === twin.y)) continue;
    if (nearFish(layout, x, y) || nearFish(layout, twin.x, twin.y)) continue;
    for (const spot of [{ x, y }, twin]) {
      layout.fishAt.push({ x: spot.x, y: spot.y });
      addResource(layout, 'fish', spot.x, spot.y, START_AMOUNT.fish);
    }
    got++;
  }
}
// Three single fish along the river's deep stretch on s0's side (mirrored onto the other).
function placeRiverFish(layout, { along }) {
  for (let k = 0; k < 3; k++) {
    const point = along(CENTRE_SHALLOWS + 2 + layout.rng.next() * (layout.size / 2 - CENTRE_SHALLOWS - 2));
    placeShoal(layout, point.x, point.y, 1.5, 1);
  }
}

// The relic spots round the centre become land (mirrored), and nothing else stays on them.
function finishWithRelics(layout) {
  const { size, type, tiles, resources, s0, s1, orePatches } = layout, c = size / 2 | 0;
  const relicSpots = [[c, c], [c - 4, c - 6], [c + 4, c + 6], [c - 6, c + 4], [c + 6, c - 4]]
    .map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
  for (const spot of relicSpots) {
    const x = Math.floor(spot.x), y = Math.floor(spot.y), twin = mirror(size, x, y);
    tiles[y * size + x] = 0;
    tiles[twin.y * size + twin.x] = 0;
  }
  const relicKeys = new Set(relicSpots.map(spot => tileKey(layout, Math.floor(spot.x), Math.floor(spot.y))));
  const clear = resources.filter(resource => !relicKeys.has(tileKey(layout, Math.floor(resource.x), Math.floor(resource.y))));
  return { size, type, tiles, resources: clear, starts: [s0, s1], relicSpots, orePatches };
}
