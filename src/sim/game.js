import { generateMap } from './map.js';
import { UNITS } from '../data/units.js';
import { BUILDINGS, repairCost, workSpeed } from '../data/buildings.js';
import { defenceStats } from '../data/defences.js';
import { farmStats } from '../data/farms.js';
import { popLimit } from '../data/ages.js';
import { TECHS, applyUnitEffect } from '../data/techs.js';
import { updateUnit } from './orders.js';
import { updateTower, refreshDefences } from './defence.js';
import { execute } from './commands.js';
import { updateVision } from './vision.js';
import { initOre, recordPileStart, updateRespawn, RESPAWN_EVERY } from './ore.js';
import { secs, rectOf, centerOf, passable } from './util.js';

// A wall foundation (an unfinished wall) does not block movement: it only reserves its tile, and occupies it once finished.
const opensFoundation = type => BUILDINGS[type].defence === 'wall';

const newPlayer = (id, n, workRate) => ({
  id, res: { food: 200, wood: 200, gold: 100, stone: 100 }, age: 'stone', ageUp: null,
  explored: new Uint8Array(n * n), visible: new Uint8Array(n * n),
  kills: 0, losses: 0, bdestroyed: 0, gathered: 0, pop: 0, popCap: 0, defeated: false,
  techs: new Set(), gatherMult: { food: 1, wood: 1, gold: 1, stone: 1 }, workRate,
});

// workRate: per-player speed of gathering, building, training, research and age-ups (a handicap, 1 = normal).
// capTicks: round time limit, defaults to the round's own. mapType: 'rivers' or 'islands' (map.js).
export function createGame({
  seed = 1, rules = null, size = 112, workRate = [1, 1], capTicks = rules?.capTicks, mapType = 'rivers',
} = {}) {
  const map = generateMap(seed, size, mapType), n = map.size;
  // occupancy: per tile (y * size + x), the id of the building or resource standing on it, 0 for none.
  const occupancy = new Int32Array(n * n), reserved = new Set();
  const game = {
    seed, map, rules, capTicks, time: 0, result: null, nextId: 1,
    entities: new Map(), units: new Map(), buildings: new Map(), resources: new Map(), relics: new Map(),
    players: [0, 1].map(id => newPlayer(id, n, workRate[id])),
    reserved, // tile indices (y * size + x) held by wall foundations: walkable, but nothing else can be placed there
    occAt: (x, y) => (x < 0 || y < 0 || x >= n || y >= n) ? 1 : occupancy[y * n + x],
    blocked: (x, y) => occupancy[y * n + x] !== 0,
  };
  initOre(game); // patches, patchAt, terrainVersion, oreRng
  // Fixed: ore patches only ever swap land for land.
  game.toWater = shoreDistance(map, true);
  game.toLand = shoreDistance(map, false);
  const grid = tileGrid(game, occupancy);
  addEntityMethods(game, grid);
  addRemovalMethods(game, grid);
  addQueryMethods(game, grid);
  game.tick = () => tick(game);
  game.snapshot = () => snapshot(game);
  setUpStart(game);
  return game;
}

// Tile bookkeeping shared by the game's methods: marking footprints on the occupancy grid and finding open tiles.
function tileGrid(game, occupancy) {
  const { map, reserved } = game, n = map.size;
  const mark = (entity, id) => {
    const rect = rectOf(entity);
    for (let y = rect.y0; y < rect.y1; y++) for (let x = rect.x0; x < rect.x1; x++) occupancy[y * n + x] = id;
  };
  const tilesOf = entity => {
    const rect = rectOf(entity), out = [];
    for (let y = rect.y0; y < rect.y1; y++) for (let x = rect.x0; x < rect.x1; x++) out.push(y * n + x);
    return out;
  };
  // Open ground a unit can be put on: on the map, not water, not occupied, not a wall foundation. naval: open water instead.
  const free = (x, y, naval = false) => x >= 0 && y >= 0 && x < n && y < n
    && passable(map.tiles[y * n + x], naval) && !occupancy[y * n + x] && !reserved.has(y * n + x);
  const nearestFree = nearestFreeFinder(free), freeTileNear = freeLandFinder(free, n);
  return { n, occupancy, reserved, mark, tilesOf, free, nearestFree, freeTileNear };
}

// The free tile whose centre is nearest (x, y), searching 8 tiles around; a tie goes to the first in row order.
function nearestFreeFinder(free) {
  return (x, y, naval = false) => {
    const cx = Math.floor(x), cy = Math.floor(y);
    let best = null, bestDistance = Infinity;
    for (let ty = cy - 8; ty <= cy + 8; ty++) for (let tx = cx - 8; tx <= cx + 8; tx++) {
      if (!free(tx, ty, naval)) continue;
      const distance = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { x: tx + 0.5, y: ty + 0.5 };
      }
    }
    return best || { x, y };
  };
}

// The free land tile nearest (x, y), by square rings: within 8 tiles, or anywhere for a relic lost at sea, which washes up
// on the nearest shore.
function freeLandFinder(free, n) {
  return (x, y) => {
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let ring = 0; ring <= n; ring++) for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
      const tx = cx + dx, ty = cy + dy;
      // Never onto a foundation, which would seal a dropped relic inside the wall.
      if (free(tx, ty)) return { x: tx + 0.5, y: ty + 0.5 };
    }
    return { x, y };
  };
}

// Puts a unit on `spot` and drops its path (it was pushed there, not walked).
function placeUnit(unit, spot) {
  unit.x = spot.x;
  unit.y = spot.y;
  unit.path = null;
}

// addResource, addBuilding, occupyFoundation, spawnUnit, completeTech, spawnRelic, relicOwner.
function addEntityMethods(game, { mark, tilesOf, reserved, nearestFree }) {
  game.addResource = spec => {
    const resource = { ...spec, kind: 'resource', id: game.nextId++, dead: false };
    game.entities.set(resource.id, resource);
    game.resources.set(resource.id, resource);
    mark(resource, resource.id);
    return resource;
  };
  game.addBuilding = (type, owner, x, y, constructed) => {
    const building = newBuilding(game, type, owner, x, y, constructed);
    game.entities.set(building.id, building);
    game.buildings.set(building.id, building);
    if (!constructed && opensFoundation(type)) { // units may stand on it until it is finished
      for (const i of tilesOf(building)) reserved.add(i);
      return building;
    }
    mark(building, building.id);
    pushUnitsOff(game, building);
    return building;
  };
  // A wall foundation just finished: it now occupies its tile, and any unit standing on it moves to the nearest free tile.
  game.occupyFoundation = building => {
    for (const i of tilesOf(building)) reserved.delete(i);
    mark(building, building.id);
    const rect = rectOf(building);
    for (const unit of game.units.values()) {
      const tx = Math.floor(unit.x), ty = Math.floor(unit.y);
      if (unit.aboard || tx < rect.x0 || tx >= rect.x1 || ty < rect.y0 || ty >= rect.y1) continue;
      placeUnit(unit, nearestFree(unit.x, unit.y, unit.naval));
    }
  };
  game.spawnUnit = (type, owner, x, y) => {
    const unit = newUnit(game, type, owner, x, y);
    for (const id of game.players[owner].techs) applyUnitEffect(unit, TECHS[id].effect); // inherit researched upgrades
    game.entities.set(unit.id, unit);
    game.units.set(unit.id, unit);
    return unit;
  };
  game.completeTech = (playerId, techId) => completeTech(game, playerId, techId);
  game.spawnRelic = (x, y) => {
    const relic = { id: game.nextId++, kind: 'relic', x, y, holder: null, stored: null, dead: false };
    game.entities.set(relic.id, relic);
    game.relics.set(relic.id, relic);
    return relic;
  };
  // Who has a relic: the owner of the unit carrying it or the building it is stored in, else null.
  game.relicOwner = relic => {
    if (relic.holder !== null) return game.entities.get(relic.holder)?.owner ?? null;
    if (relic.stored !== null) return game.entities.get(relic.stored)?.owner ?? null;
    return null;
  };
}

function newBuilding(game, type, owner, x, y, constructed) {
  const def = BUILDINGS[type], age = game.players[owner].age;
  // Defences: HP (and a tower's attack) come from the owner's era now.
  const defence = def.defence ? defenceStats(def.defence, age) : null, maxHp = defence ? defence.hp : def.hp;
  const building = {
    id: game.nextId++, kind: 'building', type, owner, x, y, size: def.size, maxHp, hp: constructed ? maxHp : 1, constructed,
    progress: constructed ? 1 : 0, queue: [], workers: 0, sight: def.sight, marmor: def.marmor ?? 3, parmor: def.parmor ?? 8,
    dead: false, gatherType: def.gatherType || null, amount: def.amount || 0,
  };
  if (def.ore) { // a Mine yields what its patch holds
    const patch = game.patches.get(game.patchAt[y * game.map.size + x]);
    Object.assign(building, {
      patch: patch?.id ?? 0, gatherType: patch?.kind ?? 'gold', amount: patch?.reserve ?? 0, digging: 0,
    });
  }
  if (type === 'farm') building.amount = building.maxAmount = farmStats(age).amount; // a Farm holds its owner's era's food
  if (def.defence === 'tower') {
    Object.assign(building, {
      atk: defence.atk, atkType: defence.atkType, range: defence.range, cooldown: defence.cooldown,
      splash: defence.splash || 0, bonus: null, cd: 0,
    });
  }
  return building;
}

// Units standing where a new building goes are moved out to its spawn tiles.
function pushUnitsOff(game, building) {
  const { x, y, size } = building;
  for (const unit of game.units.values()) {
    if (unit.aboard || unit.x < x || unit.x > x + size || unit.y < y || unit.y > y + size) continue;
    placeUnit(unit, game.findSpawn(building, unit.naval));
  }
}

// Ticks between attacks for a unit type that doesn't set its own cooldown.
const defaultCooldown = cls => cls === 'archer' ? 40 : cls === 'siege' ? 80 : 30;

function newUnit(game, type, owner, x, y) {
  const def = UNITS[type];
  return {
    id: game.nextId++, kind: 'unit', type, owner, x, y, hp: def.hp, maxHp: def.hp,
    atk: def.atk, atkType: def.atkType || 'melee', marmor: def.marmor || 0, parmor: def.parmor || 0, bonus: def.bonus || null,
    range: def.range, speed: def.speed, sight: def.sight,
    cls: def.cls, naval: !!def.naval, splash: def.splash || 0, cooldown: def.cooldown ?? defaultCooldown(def.cls), cd: 0,
    order: { type: 'idle' }, path: null, retry: 0, carry: { type: null, amount: 0 }, relic: null, dead: false,
    aboard: null, // the transport carrying this unit
    cargo: def.carries ? [] : null, // who a transport carries
  };
}

function completeTech(game, playerId, techId) {
  const player = game.players[playerId];
  if (player.techs.has(techId)) return;
  player.techs.add(techId);
  const effect = TECHS[techId].effect;
  if (effect.gather) {
    for (const kind in effect.gather) player.gatherMult[kind] *= effect.gather[kind];
    return;
  }
  // Upgrade existing units too.
  for (const unit of game.units.values()) if (unit.owner === playerId) applyUnitEffect(unit, effect);
}

// remove, depleted, damage.
function addRemovalMethods(game, { n, occupancy, reserved, tilesOf, freeTileNear }) {
  const holdsRelic = (entity, relic) => (entity.kind === 'unit' && relic.holder === entity.id)
    || (entity.kind === 'building' && relic.stored === entity.id);
  const dropRelics = (entity, x, y) => {
    for (const relic of game.relics.values()) {
      if (!holdsRelic(entity, relic)) continue;
      const spot = freeTileNear(x, y);
      relic.holder = null;
      relic.stored = null;
      relic.x = spot.x;
      relic.y = spot.y;
    }
    if (entity.kind === 'unit') entity.relic = null;
  };
  const clearTiles = entity => {
    for (const i of tilesOf(entity)) {
      reserved.delete(i);
      if (occupancy[i] === entity.id) occupancy[i] = 0; // a foundation never marked its tile
    }
  };
  game.remove = entity => {
    if (entity.dead) return;
    entity.dead = true;
    sinkPassengers(game, entity);
    leaveTransport(game, entity);
    game.entities.delete(entity.id);
    game.units.delete(entity.id);
    game.buildings.delete(entity.id);
    game.resources.delete(entity.id);
    if (entity.kind === 'building' || entity.kind === 'resource') clearTiles(entity);
    // A building's relics come out just past its far edge; a unit drops its relic where it stands.
    const centre = centerOf(entity), isBuilding = entity.kind === 'building';
    const dropX = isBuilding ? Math.min(n - 1, Math.floor(centre.x) + 0.5) : centre.x;
    dropRelics(entity, dropX, isBuilding ? Math.min(n - 1, entity.y + entity.size + 0.5) : centre.y);
  };
  game.depleted = resource => { if (resource.kind === 'resource' || resource.gatherType) game.remove(resource); };
  game.damage = (target, amount, attacker) => {
    if (target.dead) return;
    target.hp -= amount;
    if (target.hp <= 0) destroy(game, target, attacker);
  };
}

// A sunk transport takes its passengers down.
function sinkPassengers(game, transport) {
  const cargo = transport.cargo;
  if (!cargo) return;
  for (const id of cargo) {
    const passenger = game.entities.get(id);
    if (!passenger) continue;
    game.players[passenger.owner].losses++;
    game.remove(passenger);
  }
}

function leaveTransport(game, passenger) {
  if (!passenger.aboard) return;
  const transport = game.entities.get(passenger.aboard);
  if (transport?.cargo) transport.cargo = transport.cargo.filter(id => id !== passenger.id);
}

// Killed: score the kill (a sunk transport's passengers too), count the loss, take it off the map.
function destroy(game, target, attacker) {
  if (attacker) creditKill(game, game.players[attacker.owner], target);
  if (target.kind === 'unit') game.players[target.owner].losses++; // for generalship score (any death, attributed or not)
  game.remove(target);
}

const killValue = unit => unit.cls === 'civ' ? 1 : 2;
function creditKill(game, killer, target) {
  if (target.kind === 'building') {
    killer.bdestroyed++;
    return;
  }
  killer.kills += killValue(target);
  for (const id of target.cargo ?? []) {
    const passenger = game.entities.get(id);
    if (passenger) killer.kills += killValue(passenger);
  }
}

// findSpawn, recount, command, visibleEntities, knownResources.
function addQueryMethods(game, { n, free, nearestFree }) {
  const spawnTile = (x, y, naval) => free(x, y, naval) ? { x: x + 0.5, y: y + 0.5 } : null;
  // Where a unit trained at (or pushed off) building b appears: the first open tile in the rings round it (open water for
  // a ship). Each step along a ring tries the four sides in turn: y + size, y - 1, x - 1, x + size.
  game.findSpawn = (b, naval = false) => {
    for (let ring = 1; ring <= 3; ring++) for (let i = -ring; i < b.size + ring; i++) {
      const spot = spawnTile(b.x + i, b.y + b.size - 1 + ring, naval) || spawnTile(b.x + i, b.y - ring, naval)
        || spawnTile(b.x - ring, b.y + i, naval) || spawnTile(b.x + b.size - 1 + ring, b.y + i, naval);
      if (spot) return spot;
    }
    return naval ? nearestFree(b.x + b.size / 2, b.y + b.size / 2, true) : { x: b.x + 0.5, y: b.y + 0.5 };
  };
  game.recount = () => recount(game);
  game.command = (playerId, cmd) => execute(game, playerId, cmd);
  game.visibleEntities = playerId => {
    const visible = game.players[playerId].visible, out = [];
    addVisible(game.units, playerId, visible, n, out);
    addVisible(game.buildings, playerId, visible, n, out);
    for (const relic of game.relics.values()) if (visible[Math.floor(relic.y) * n + Math.floor(relic.x)]) out.push(relic);
    return out;
  };
  game.knownResources = playerId => [...game.resources.values()]
    .filter(resource => game.players[playerId].explored[Math.floor(resource.y) * n + Math.floor(resource.x)]);
}

// Own entities, and the other side's whose centre tile is in sight. Passengers are out of sight in the hold.
function addVisible(entities, playerId, visible, n, out) {
  for (const entity of entities.values()) {
    if (entity.aboard) continue;
    if (entity.owner === playerId) {
      out.push(entity);
      continue;
    }
    const centre = centerOf(entity);
    if (visible[Math.floor(centre.y) * n + Math.floor(centre.x)]) out.push(entity);
  }
}

// Population (units plus training queues) and the cap from finished Houses and Town Centers, up to the age's limit.
function recount(game) {
  for (const player of game.players) {
    player.pop = 0;
    player.popCap = 0;
  }
  for (const unit of game.units.values()) game.players[unit.owner].pop++;
  for (const building of game.buildings.values()) {
    const player = game.players[building.owner];
    player.pop += building.queue.length;
    if (building.constructed) player.popCap += BUILDINGS[building.type].pop || 0;
  }
  for (const player of game.players) player.popCap = Math.min(popLimit(player.age), player.popCap);
}

function tick(game) {
  if (game.result) return;
  game.time++;
  for (const unit of [...game.units.values()]) if (!unit.dead && !unit.aboard) updateUnit(game, unit);
  carryPassengers(game);
  for (const building of [...game.buildings.values()]) {
    if (building.dead) continue;
    updateBuilding(game, building);
    if (building.type === 'tower') updateTower(game, building);
  }
  if (game.time % RESPAWN_EVERY === 0) updateRespawn(game);
  for (const player of game.players) {
    if (player.ageUp && (player.ageUp.remaining -= player.workRate) <= 0) finishAgeUp(game, player);
  }
  carryRelics(game);
  game.recount();
  if (game.time % 4 === 0) updateVision(game);
  if (game.rules) {
    const outcome = game.rules.check(game);
    if (outcome) game.result = outcome;
  }
}

// Passengers ride along with their transport.
function carryPassengers(game) {
  for (const transport of game.units.values()) {
    const cargo = transport.cargo;
    if (!cargo) continue;
    for (const id of cargo) {
      const passenger = game.entities.get(id);
      if (passenger) {
        passenger.x = transport.x;
        passenger.y = transport.y;
      }
    }
  }
}

// A carried relic moves with its carrier.
function carryRelics(game) {
  for (const relic of game.relics.values()) {
    if (relic.holder === null) continue;
    const holder = game.entities.get(relic.holder);
    if (holder) {
      relic.x = holder.x;
      relic.y = holder.y;
    }
  }
}

function finishAgeUp(game, player) {
  player.age = player.ageUp.to;
  player.ageUp = null;
  refreshDefences(game, player.id);
  refreshFarms(game, player.id);
}

function snapshot(game) {
  const players = game.players.map(player => ({ res: player.res, age: player.age, kills: player.kills, pop: player.pop }));
  const entities = [...game.entities.values()].filter(entity => entity.kind !== 'resource').map(entity => ({
    id: entity.id, type: entity.type, owner: entity.owner,
    x: +entity.x.toFixed(3), y: +entity.y.toFixed(3), hp: +(entity.hp ?? 0).toFixed(2),
  }));
  return { time: game.time, players, entities };
}

// The map's resources, then each player's Town Center with three villagers, then the round's own setup.
function setUpStart(game) {
  const { map, rules } = game;
  for (const resource of map.resources) game.addResource(resource);
  recordPileStart(game);
  for (const [playerId, start] of map.starts.entries()) {
    const townCenter = game.addBuilding('town_center', playerId, start.x - 1, start.y - 1, true);
    for (let k = 0; k < 3; k++) {
      const spot = game.findSpawn(townCenter);
      game.spawnUnit('villager', playerId, spot.x, spot.y);
    }
  }
  game.recount();
  updateVision(game);
  if (rules && rules.setup) rules.setup(game);
  game.recount();
  updateVision(game);
}

// Per tile, how far it is to the nearest tile a ship can sail (naval) or a soldier can walk (else): 0 on such a tile.
// Distances are tile centre to tile centre, carried as the nearest source found by a breadth-first sweep, which is close
// to exact on these maps. orders.js canHit uses them to tell whether a ship could ever get a land target in range, or a
// soldier a ship.
function shoreDistance(map, naval) {
  const n = map.size, distance = new Float32Array(n * n).fill(Infinity), source = new Int32Array(n * n).fill(-1), queue = [];
  for (let i = 0; i < n * n; i++) {
    if (!passable(map.tiles[i], naval)) continue;
    distance[i] = 0;
    source[i] = i;
    queue.push(i);
  }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % n, y = (i / n) | 0, from = source[i], fromX = from % n, fromY = (from / n) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, j = ny * n + nx;
      if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const viaFrom = Math.hypot(nx - fromX, ny - fromY);
      if (viaFrom >= distance[j]) continue;
      const fresh = source[j] < 0;
      distance[j] = viaFrom;
      source[j] = from;
      if (fresh) queue.push(j);
    }
  }
  return distance;
}

// When a player advances, each of their Farms grows to the new era's capacity and keeps its fraction of food left
// (amount / maxAmount), as a Tower keeps its fraction of health. An unfinished Farm is full, so it starts full again.
function refreshFarms(game, playerId) {
  const capacity = farmStats(game.players[playerId].age).amount;
  for (const farm of game.buildings.values()) {
    if (farm.owner !== playerId || farm.type !== 'farm') continue;
    farm.amount = farm.amount / farm.maxAmount * capacity;
    farm.maxAmount = capacity;
  }
}

function updateBuilding(game, building) {
  // A Mine shows its patch's reserve.
  if (building.patch !== undefined) building.amount = game.patches.get(building.patch)?.reserve ?? 0;
  if (building.gatherType) { // villagers who worked it this tick (units update first)
    building.digging = building.gatherers || 0;
    building.gatherers = 0;
  }
  if (building.gatherType && building.amount <= 0) return game.remove(building);
  const rate = game.players[building.owner].workRate;
  if (!building.constructed) return advanceConstruction(game, building, rate);
  if (building.repairers) repairBuilding(game, building, rate);
  const work = rate * workSpeed(building); // a damaged building trains and researches slower (repairing is not slowed)
  if (building.queue.length && (building.queue[0].remaining -= work) <= 0) finishTraining(game, building);
  if (building.research && (building.research.remaining -= work) <= 0) finishResearch(game, building);
}

// Villagers who stood building it this tick (units update first) add progress; a bigger crew is faster, with diminishing returns.
function advanceConstruction(game, building, rate) {
  const builders = building.workers;
  building.workers = 0;
  if (builders <= 0) return;
  building.progress += Math.pow(builders, 0.7) * rate / secs(BUILDINGS[building.type].buildTime);
  building.hp = Math.max(building.hp, building.maxHp * Math.min(1, building.progress));
  if (building.progress < 1) return;
  building.constructed = true;
  building.hp = building.maxHp;
  building.progress = 1;
  if (opensFoundation(building.type)) game.occupyFoundation(building);
}

function finishTraining(game, building) {
  const done = building.queue.shift(), spot = game.findSpawn(building, UNITS[done.unit].naval);
  game.spawnUnit(done.unit, building.owner, spot.x, spot.y);
}

function finishResearch(game, building) {
  const tech = building.research.tech;
  building.research = null;
  game.completeTech(building.owner, tech);
}

// Villagers who stood repairing `building` this tick (units update first) put HP back as fast as they would build it, crew
// scaling included. The owner pays repairCost for it; short of a resource, only the share they can pay goes on and the
// stock hits 0.
function repairBuilding(game, building, rate) {
  const crew = building.repairers, player = game.players[building.owner];
  building.repairers = 0;
  const { maxHp } = building;
  const hp = Math.min(maxHp - building.hp, maxHp * Math.pow(crew, 0.7) * rate / secs(BUILDINGS[building.type].buildTime));
  if (hp <= 0) return;
  const cost = repairCost(building.type, hp, maxHp);
  // share: the part of the repair the owner can pay; short: the resource that limits it.
  let share = 1, short = null;
  for (const kind in cost) {
    if (cost[kind] > 0 && player.res[kind] / cost[kind] < share) {
      share = player.res[kind] / cost[kind];
      short = kind;
    }
  }
  if (share <= 0) return;
  for (const kind in cost) player.res[kind] = Math.max(0, player.res[kind] - cost[kind] * share);
  if (short) player.res[short] = 0; // exactly, so doRepair sees it run out instead of chasing a rounding crumb
  building.hp = Math.min(maxHp, building.hp + hp * share);
}
