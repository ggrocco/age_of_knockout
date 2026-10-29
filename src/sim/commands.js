import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { TECHS } from '../data/techs.js';
import { AGES, AGE_COST, ageIndex, popLimit } from '../data/ages.js';
import { secs, RES_KIND, WATER, passable } from './util.js';
import { formationSlots, nearestOpen, landingNear } from './formation.js';

const fail = reason => ({ ok: false, reason });
const OK = { ok: true };
const RES = ['food', 'wood', 'gold', 'stone'];
// 'pop limit' once houses already reach the age's ceiling (only advancing raises it), else 'pop cap' (build houses).
export const popFullReason = player => player.popCap >= popLimit(player.age) ? 'pop limit' : 'pop cap';
export const canAfford = (player, cost) => RES.every(kind => player.res[kind] >= (cost[kind] || 0));
// Repairs are paid bit by bit, so any of each resource the building costs is enough to go on.
export const canRepair = (player, type) => RES.every(kind => !BUILDINGS[type].cost[kind] || player.res[kind] > 0);
const pay = (player, cost) => { for (const kind of RES) player.res[kind] -= cost[kind] || 0; };
// The player's own live units among `ids`; passengers take no orders.
const ownUnits = (game, playerId, ids) => (ids || [])
  .map(id => game.entities.get(id))
  .filter(entity => entity && entity.kind === 'unit' && entity.owner === playerId && !entity.dead && !entity.aboard);
const ownVillagers = (game, playerId, ids) => ownUnits(game, playerId, ids).filter(unit => unit.type === 'villager');
// A fresh order: the unit plans a new path to it.
function giveOrder(unit, order) {
  unit.order = order;
  unit.path = null;
  unit.retry = 0;
}

// A build (or repair) given to a villager that is gathering, building or repairing keeps that job as `resume`, and takes it
// up again once the new building is done, gone or unreachable (orders.js doBuild / doRepair). Builds interrupting builds nest,
// newest first. Idle, moving or fighting villagers have nothing to go back to, so their order gets no `resume` key. A gather
// resumes heading for its resource, or still on its way to drop off a load.
function buildOrder(unit, target, queue, type = 'build') {
  const order = queue ? { type, target, queue, fails: 0 } : { type, target, fails: 0 }, current = unit.order;
  if (current.type === 'gather') order.resume = { ...current, phase: current.phase === 'drop' ? 'drop' : 'go', fails: 0 };
  else if (current.type === 'build' || current.type === 'repair') order.resume = current;
  return order;
}

export function canPlace(game, pid, type, x, y) {
  const def = BUILDINGS[type], n = game.map.size, player = game.players[pid];
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 1 || y < 1 || x + def.size > n - 1 || y + def.size > n - 1) return false;
  const patch = def.ore ? game.patchAt[y * n + x] : 0;
  if (def.ore && !(game.patches.get(patch)?.reserve > 0)) return false;
  if (!footprintFits(game, player, def, x, y, patch)) return false;
  if (def.naval && !atShore(game, x, y, def.size)) return false;
  return !hasLooseRelic(game, x, y, def.size);
}

// A Mine goes wholly on one patch (`patch`) that still holds ore, a Dock wholly on deep water; everything else only on
// plain land (not water, shallows or ore). Every tile must also be unoccupied, not a wall foundation, and explored.
function footprintFits(game, player, def, x, y, patch) {
  const n = game.map.size, ground = def.naval ? WATER : 0;
  for (let j = y; j < y + def.size; j++) for (let i = x; i < x + def.size; i++) {
    const tile = j * n + i;
    const rightGround = def.ore ? game.patchAt[tile] === patch : game.map.tiles[tile] === ground;
    if (!rightGround || game.occAt(i, j) || game.reserved.has(tile) || !player.explored[tile]) return false;
  }
  return true;
}

// A relic lying loose on the size x size square at (x, y) (a building there would make it unfetchable).
function hasLooseRelic(game, x, y, size) {
  for (const relic of game.relics.values()) {
    if (relic.holder !== null || relic.stored !== null) continue;
    if (relic.x >= x && relic.x < x + size && relic.y >= y && relic.y < y + size) return true;
  }
  return false;
}

// A Dock's footprint at (x, y) touches the shore: a villager can stand beside it to build it, and a ship to be launched or
// land its catch. Of the tiles along its four sides (corners left out), one is free ground and one is free water.
function atShore(game, x, y, size) {
  const n = game.map.size;
  const open = (i, j, naval) => passable(game.map.tiles[j * n + i], naval) && !game.occAt(i, j) && !game.reserved.has(j * n + i);
  let land = false, sea = false;
  for (let k = 0; k < size; k++) for (const [i, j] of [[x + k, y - 1], [x + k, y + size], [x - 1, y + k], [x + size, y + k]]) {
    land ||= open(i, j, false);
    sea ||= open(i, j, true);
  }
  return land && sea;
}

// Advancing out of `age` needs this many distinct finished buildings of that age (extras like the Farm and Wonder don't count).
export const ageBuildings = age => Object.entries(BUILDINGS)
  .filter(([id, def]) => def.age === age && id !== 'town_center' && !def.extra)
  .map(([id]) => id);
export const ageUpNeed = age => Math.min(2, ageBuildings(age).length);

export function ageUpProblem(game, pid) {
  const player = game.players[pid];
  if (player.ageUp) return 'already researching';
  const next = AGES[ageIndex(player.age) + 1];
  if (!next) return 'max age';
  const { hasTownCenter, gates } = finishedGates(game, pid, player.age);
  if (!hasTownCenter) return 'needs town center';
  if (gates < ageUpNeed(player.age)) return 'needs buildings';
  if (!canAfford(player, AGE_COST[next].cost)) return 'resources';
  return null;
}

// Whether the player has a finished Town Center, and how many distinct finished buildings of `age` that count towards
// advancing (ageBuildings) they have.
function finishedGates(game, pid, age) {
  const owned = new Set(), counted = new Set(ageBuildings(age));
  let hasTownCenter = false;
  for (const building of game.buildings.values()) {
    if (building.owner !== pid || !building.constructed) continue;
    if (building.type === 'town_center') hasTownCenter = true;
    if (counted.has(building.type)) owned.add(building.type);
  }
  return { hasTownCenter, gates: owned.size };
}

export function execute(game, pid, cmd) {
  const player = game.players[pid];
  if (!player || game.result) return fail('no game');
  switch (cmd.type) {
    case 'move': return moveUnits(game, pid, cmd);
    case 'gather': return gather(game, pid, cmd);
    case 'build': return build(game, pid, player, cmd);
    case 'wall': return buildWall(game, pid, player, cmd);
    case 'delete': return deleteBuilding(game, pid, cmd);
    case 'resign': return resign(game, pid);
    case 'construct': return construct(game, pid, cmd);
    case 'repair': return repair(game, pid, player, cmd);
    case 'train': return train(game, pid, player, cmd);
    case 'research': return research(game, pid, player, cmd);
    case 'age': return ageUp(game, pid, player);
    case 'attack': return attack(game, pid, cmd);
    case 'board': return board(game, pid, cmd);
    case 'unload': return unload(game, pid, cmd);
    case 'relic': return fetchRelic(game, pid, cmd);
  }
  return fail('unknown command');
}

function moveUnits(game, pid, cmd) {
  const units = ownUnits(game, pid, cmd.ids);
  if (!units.length) return fail('no units');
  if (!Number.isFinite(cmd.x) || !Number.isFinite(cmd.y)) return fail('bad target');
  // A group spreads out instead of piling onto one tile; soldiers and ships each form up on their own ground, and
  // ships sent onto land head for the nearest water.
  for (const group of [units.filter(unit => !unit.naval), units.filter(unit => unit.naval)]) {
    if (group.length) moveGroup(game, group, cmd);
  }
  return OK;
}

function moveGroup(game, group, cmd) {
  const at = group[0].naval ? nearestOpen(game, cmd.x, cmd.y, true) || cmd : cmd;
  const slots = group.length > 1 ? formationSlots(game, group, at.x, at.y) : null;
  for (const unit of group) {
    const spot = slots ? slots.get(unit.id) : at;
    giveOrder(unit, { type: 'move', x: spot.x, y: spot.y, slack: 0 });
  }
}

// A loose resource, or one of the player's own finished gathering buildings (a Farm or a Mine), with something left.
function isGatherable(target, pid) {
  if (!target || target.dead || !(target.amount > 0)) return false;
  if (target.kind === 'resource') return true;
  return target.kind === 'building' && target.owner === pid && target.constructed && !!target.gatherType;
}

// Villagers gather on land, Fishing Ships fish; each takes the orders for its own kind of resource.
function gather(game, pid, cmd) {
  const gatherers = ownUnits(game, pid, cmd.ids).filter(unit => unit.type === 'villager' || UNITS[unit.type].capacity);
  const target = game.entities.get(cmd.resourceId);
  if (!gatherers.length) return fail('no villagers');
  if (!isGatherable(target, pid)) return fail('bad resource');
  const fish = target.type === 'fish', units = gatherers.filter(unit => unit.naval === fish);
  if (!units.length) return fail(fish ? 'needs a fishing ship' : 'no villagers');
  const kind = target.gatherType || RES_KIND[target.type];
  for (const unit of units) {
    giveOrder(unit, { type: 'gather', res: target.id, kind, phase: 'go', fails: 0 });
    if (unit.carry.type !== kind) unit.carry = { type: null, amount: 0 };
  }
  return OK;
}

function build(game, pid, player, cmd) {
  const def = BUILDINGS[cmd.building], villagers = ownVillagers(game, pid, cmd.ids);
  if (!def) return fail('unknown building');
  if (!villagers.length) return fail('no villagers');
  if (ageIndex(def.age) > ageIndex(player.age)) return fail('age');
  if (!canPlace(game, pid, cmd.building, cmd.x, cmd.y)) return fail('placement');
  if (!canAfford(player, def.cost)) return fail('resources');
  pay(player, def.cost);
  const building = game.addBuilding(cmd.building, pid, cmd.x, cmd.y, false);
  for (const unit of villagers) giveOrder(unit, buildOrder(unit, building.id));
  return OK;
}

// A line of wall foundations (tiles from lineTiles); the villagers build them in order.
function buildWall(game, pid, player, cmd) {
  const villagers = ownVillagers(game, pid, cmd.ids);
  if (!villagers.length) return fail('no villagers');
  if (ageIndex(BUILDINGS.wall.age) > ageIndex(player.age)) return fail('age');
  const { placed, short } = placeWallLine(game, pid, player, cmd.tiles);
  if (!placed.length) return fail(short ? 'resources' : 'placement'); // a free tile it could not pay for, or nowhere free
  const [target, ...rest] = placed;
  for (const unit of villagers) giveOrder(unit, buildOrder(unit, target, rest.slice()));
  return { ok: true, placed: placed.length };
}

// Each free tile is paid for and placed in order, blocked ones are skipped free; out of stone, the rest of the line is not
// placed (short). Returns the foundations' ids.
function placeWallLine(game, pid, player, tiles) {
  const cost = BUILDINGS.wall.cost, placed = [];
  for (const tile of Array.isArray(tiles) ? tiles : []) {
    if (!tile || !canPlace(game, pid, 'wall', tile.x, tile.y)) continue;
    if (!canAfford(player, cost)) return { placed, short: true };
    pay(player, cost);
    placed.push(game.addBuilding('wall', pid, tile.x, tile.y, false).id);
  }
  return { placed, short: false };
}

// Knock down one of your own buildings: no refund; anything in its training queue is lost.
function deleteBuilding(game, pid, cmd) {
  const building = game.entities.get(cmd.id);
  if (!building || building.dead || building.kind !== 'building' || building.owner !== pid) return fail('bad target');
  game.remove(building);
  game.recount();
  return OK;
}

function resign(game, pid) {
  game.result = { winner: 1 - pid, reason: 'resigned' };
  return OK;
}

const isOwnBuilding = (building, pid) => building && !building.dead && building.kind === 'building' && building.owner === pid;

function construct(game, pid, cmd) {
  const villagers = ownVillagers(game, pid, cmd.ids), building = game.entities.get(cmd.targetId);
  if (!villagers.length) return fail('no villagers');
  if (!isOwnBuilding(building, pid) || building.constructed) return fail('nothing to build');
  for (const unit of villagers) {
    if (unit.order.type === 'build' && unit.order.target === building.id) continue;
    giveOrder(unit, buildOrder(unit, building.id));
  }
  return OK;
}

// Put a finished, damaged building's HP back; paid as it goes (orders.js doRepair, game.js repairBuilding).
function repair(game, pid, player, cmd) {
  const villagers = ownVillagers(game, pid, cmd.ids), building = game.entities.get(cmd.targetId);
  if (!villagers.length) return fail('no villagers');
  if (!isOwnBuilding(building, pid) || !building.constructed || building.hp >= building.maxHp) return fail('nothing to repair');
  if (!canRepair(player, building.type)) return fail('resources');
  for (const unit of villagers) {
    if (unit.order.type === 'repair' && unit.order.target === building.id) continue;
    giveOrder(unit, buildOrder(unit, building.id, null, 'repair'));
  }
  return OK;
}

// One of the player's own finished buildings, by id.
const ownFinished = (building, pid) => building && building.kind === 'building' && building.owner === pid && building.constructed;

function train(game, pid, player, cmd) {
  const building = game.entities.get(cmd.buildingId), def = UNITS[cmd.unit];
  if (!ownFinished(building, pid) || !def) return fail('bad building');
  if (!(BUILDINGS[building.type].trains || []).includes(cmd.unit)) return fail('cannot train');
  if (ageIndex(def.age) > ageIndex(player.age)) return fail('age');
  if (building.queue.length >= 5) return fail('queue full');
  if (player.pop >= player.popCap) return fail(popFullReason(player));
  if (!canAfford(player, def.cost)) return fail('resources');
  pay(player, def.cost);
  building.queue.push({ unit: cmd.unit, remaining: secs(def.trainTime) });
  player.pop++;
  return OK;
}

function research(game, pid, player, cmd) {
  const building = game.entities.get(cmd.buildingId), tech = TECHS[cmd.tech];
  if (!ownFinished(building, pid) || !tech) return fail('bad building');
  if (tech.building !== building.type) return fail('wrong building');
  if (ageIndex(player.age) < ageIndex(tech.age)) return fail('age');
  if (player.techs.has(cmd.tech)) return fail('already researched');
  if (tech.requires && !player.techs.has(tech.requires)) return fail('requires');
  if (building.research) return fail('busy');
  if (isResearching(game, pid, cmd.tech)) return fail('already researching');
  if (!canAfford(player, tech.cost)) return fail('resources');
  pay(player, tech.cost);
  building.research = { tech: cmd.tech, remaining: secs(tech.time) };
  return OK;
}

// Some building of the player's is already researching `tech`.
function isResearching(game, pid, tech) {
  for (const building of game.buildings.values()) {
    if (building.owner === pid && building.research && building.research.tech === tech) return true;
  }
  return false;
}

function ageUp(game, pid, player) {
  const problem = ageUpProblem(game, pid);
  if (problem) return fail(problem);
  const next = AGES[ageIndex(player.age) + 1], info = AGE_COST[next];
  pay(player, info.cost);
  player.ageUp = { to: next, remaining: secs(info.time) };
  return OK;
}

function attack(game, pid, cmd) {
  const units = ownUnits(game, pid, cmd.ids).filter(unit => unit.atk > 0); // a Fishing Ship has no attack
  const target = game.entities.get(cmd.targetId);
  if (!units.length) return fail('no units');
  const attackable = target && !target.dead && target.owner !== pid && (target.kind === 'unit' || target.kind === 'building');
  if (!attackable) return fail('bad target');
  for (const unit of units) giveOrder(unit, { type: 'attack', target: target.id, fails: 0 });
  return OK;
}

const isOwnTransport = (transport, pid) => transport && !transport.dead && transport.owner === pid && transport.cargo;

// Land units walk to an own transport and go aboard; an idle transport sails to the shore nearest them.
function board(game, pid, cmd) {
  const transport = game.entities.get(cmd.transportId), units = ownUnits(game, pid, cmd.ids).filter(unit => !unit.naval);
  if (!isOwnTransport(transport, pid) || transport.aboard) return fail('bad transport');
  if (!units.length) return fail('no units');
  if (transport.cargo.length >= UNITS[transport.type].carries) return fail('transport full');
  for (const unit of units) giveOrder(unit, { type: 'board', target: transport.id, fails: 0 });
  if (transport.order.type === 'idle') fetchPassengers(game, transport, units);
  return OK;
}

function fetchPassengers(game, transport, units) {
  const centre = centroid(units), landing = landingNear(game, centre.x, centre.y, units[0]);
  if (!landing || Math.hypot(landing.sea.x - transport.x, landing.sea.y - transport.y) <= 0.3) return;
  giveOrder(transport, { type: 'move', x: landing.sea.x, y: landing.sea.y, slack: 0 });
}

function centroid(units) {
  let x = 0, y = 0;
  for (const unit of units) {
    x += unit.x / units.length;
    y += unit.y / units.length;
  }
  return { x, y };
}

// A transport lands at the shore nearest (x, y) (else nearest itself) and puts everyone ashore there.
function unload(game, pid, cmd) {
  const transport = game.entities.get(cmd.transportId);
  if (!isOwnTransport(transport, pid)) return fail('bad transport');
  if (!transport.cargo.length) return fail('empty');
  const at = Number.isFinite(cmd.x) && Number.isFinite(cmd.y) ? { x: cmd.x, y: cmd.y } : transport;
  const ground = at !== transport && passable(game.map.tiles[Math.floor(at.y) * game.map.size + Math.floor(at.x)], false);
  // A shore they can walk on from to (x, y), else the nearest shore.
  const landing = (ground && landingNear(game, at.x, at.y, at)) || landingNear(game, at.x, at.y);
  if (!landing) return fail('no shore');
  giveOrder(transport, {
    type: 'unload', x: landing.sea.x, y: landing.sea.y, sx: landing.shore.x, sy: landing.shore.y,
    to: ground ? { x: at.x, y: at.y } : null, slack: 0,
  });
  return OK;
}

// The first fit unit (not siege, not a ship, not already carrying one) goes to pick up the relic.
function fetchRelic(game, pid, cmd) {
  const carriers = ownUnits(game, pid, cmd.ids).filter(unit => unit.cls !== 'siege' && !unit.naval && unit.relic === null);
  const relic = game.relics.get(cmd.relicId);
  if (!carriers.length) return fail('no carriers');
  if (!relic || relic.holder !== null || relic.stored !== null) return fail('relic unavailable');
  giveOrder(carriers[0], { type: 'relic', relic: relic.id, phase: 'go', fails: 0 });
  return OK;
}
