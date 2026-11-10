import { findPath } from './path.js';
import { breachTarget } from './defence.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { farmStats } from '../data/farms.js';
import { DT, distPoint, centerOf, tileOf, RES_KIND } from './util.js';
import { drawFrom } from './ore.js';
import { canRepair } from './commands.js';
import { landingTiles, landingNear } from './formation.js';
import { sheltered } from './kingdoms.js';

// How close a worker stands to its job, how much a villager carries (a unit's `capacity` overrides it), and gather rates
// per resource per second.
const REACH = 1.0, CARRY = 10, RATE = { food: 0.7, wood: 0.6, gold: 0.5, stone: 0.5 };
const NO_DROPS = [];
const IDLE = () => ({ type: 'idle' });
const goalNear = (target, radius) => (x, y) => distPoint(x + 0.5, y + 0.5, target) <= radius;

// Move along the current path (computing it if needed). 'arrived' | 'moving' | 'wait' | 'fail'
function travel(game, unit, goal, to) {
  if (!unit.path) {
    const status = planPath(game, unit, goal, to);
    if (status !== null) return status;
  }
  return stepAlongPath(game, unit);
}

// Plan a path for a unit that has none (on the water for a ship). 'wait' while a failed search's retry delay runs, 'fail'
// (and a 40-tick retry delay), 'arrived' when it already stands at the goal (snapped to its tile centre), or null when it
// has a path to walk.
function planPath(game, unit, goal, to) {
  if (unit.retry > game.time) return 'wait';
  unit.path = findPath(game.map, game.blocked, { x: Math.floor(unit.x), y: Math.floor(unit.y) }, to, goal, unit.naval);
  if (!unit.path) {
    unit.retry = game.time + 40;
    return 'fail';
  }
  if (unit.path.length !== 0) return null;
  unit.path = null;
  unit.x = Math.floor(unit.x) + 0.5;
  unit.y = Math.floor(unit.y) + 0.5;
  return 'arrived';
}

// One tick's walk towards the next waypoint. A waypoint that has been built on drops the path, so it is planned again.
function stepAlongPath(game, unit) {
  const waypoint = unit.path[0];
  if (game.occAt(waypoint.x, waypoint.y)) {
    unit.path = null;
    return 'moving';
  }
  const targetX = waypoint.x + 0.5, targetY = waypoint.y + 0.5;
  const dx = targetX - unit.x, dy = targetY - unit.y, distance = Math.hypot(dx, dy), step = unit.speed * DT;
  if (distance <= step) {
    unit.x = targetX;
    unit.y = targetY;
    unit.path.shift();
    if (unit.path.length) return 'moving';
    unit.path = null;
    return 'arrived';
  }
  unit.x += dx / distance * step;
  unit.y += dy / distance * step;
  return 'moving';
}

const stop = unit => {
  unit.order = IDLE();
  unit.path = null;
};
// Walled off: attack the enemy building in the way, and take up `order` again once it falls (doAttack restores `resume`).
// travel just set a 40-tick retry for the failed path; clear it so the unit heads for the breach at once.
const breach = (unit, wallId, order) => {
  unit.order = { type: 'attack', target: wallId, fails: 0, resume: order };
  unit.path = null;
  unit.retry = 0;
};
// Hand back the order `order` interrupted (a breach's, or the job a build was given over), at once and with no retry wait.
const resume = (unit, order) => {
  unit.order = order.resume;
  unit.path = null;
  unit.retry = 0;
};
// A build that ends (done, gone or unreachable) takes up the job it interrupted, if any, else the villager stops.
const endBuild = (unit, order) => order.resume ? resume(unit, order) : stop(unit);

// The way to `to` has failed: break through the enemy building in the way (then take up `order` again), or count a failure
// and give up after the fourth.
function breachOrFail(game, unit, order, to, goal) {
  const wallId = breachTarget(game, unit, to, goal);
  if (wallId !== null) return breach(unit, wallId, order);
  if (++order.fails > 3) stop(unit);
}

export function updateUnit(game, unit) {
  if (unit.cd > 0) unit.cd--;
  const order = unit.order;
  switch (order.type) {
    case 'idle': return aggro(game, unit);
    case 'move': return doMove(game, unit, order);
    case 'gather': return doGather(game, unit, order);
    case 'build': return doBuild(game, unit, order);
    case 'repair': return doRepair(game, unit, order);
    case 'attack': return doAttack(game, unit, order);
    case 'relic': return doRelic(game, unit, order);
    case 'board': return doBoard(game, unit, order);
    case 'unload': return doUnload(game, unit, order);
    case 'ferry': return unit.cargo ? doFerry(game, unit, order) : doRide(game, unit, order);
    case 'shelter': return doShelter(game, unit, order);
  }
}

function doShelter(game, unit, order) {
  const castle = game.buildings.get(order.target);
  if (!castle || !castle.constructed || castle.owner !== unit.owner || castle.type !== 'castle') return stop(unit);
  if (distPoint(unit.x, unit.y, castle) <= 1) {
    unit.garrisonedIn = castle.id;
    castle.king = unit.id;
    const centre = centerOf(castle);
    unit.x = centre.x; unit.y = centre.y;
    return stop(unit);
  }
  const centre = centerOf(castle);
  const status = travel(game, unit, goalNear(castle, 1), { x: Math.floor(centre.x), y: Math.floor(centre.y) });
  if (status === 'fail') stop(unit);
}

// A move that cannot reach its tile first settles for within 2 tiles of it. If even that fails and enemy buildings are in the
// way, the unit breaks through them, then tries for the exact tile again (slack back to 0); otherwise it stops. Ships never
// breach: walls stand on land.
function doMove(game, unit, order) {
  const to = { x: Math.floor(order.x), y: Math.floor(order.y) };
  const goal = (x, y) => Math.abs(x - to.x) <= order.slack && Math.abs(y - to.y) <= order.slack;
  const status = travel(game, unit, goal, to);
  if (status === 'arrived') return stop(unit);
  if (status !== 'fail') return;
  if (order.slack < 2) {
    order.slack = 2;
    unit.retry = 0;
    return;
  }
  const wallId = unit.naval ? null : breachTarget(game, unit, to, goal);
  if (wallId === null) return stop(unit);
  order.slack = 0;
  breach(unit, wallId, order);
}

// The nearest resource of `kind` closer than maxDist: a loose pile, tree or bush, or one of the unit's own Farms and Mines.
// Ships fish and land at a Dock; villagers gather everything else and never drop at a Dock.
function nearestResource(game, unit, kind, maxDist) {
  let nearest = null, nearestDist = maxDist;
  const consider = source => {
    const distance = Math.hypot(source.x - unit.x, source.y - unit.y);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearest = source;
    }
  };
  for (const resource of game.resources.values()) {
    if (RES_KIND[resource.type] === kind && resource.amount > 0 && (resource.type === 'fish') === unit.naval) consider(resource);
  }
  if (unit.naval) return nearest;
  for (const building of game.buildings.values()) {
    const ownWorkplace = building.owner === unit.owner && building.constructed && building.gatherType === kind;
    if (ownWorkplace && building.amount > 0) consider(building);
  }
  return nearest;
}

// The nearest of the unit's finished buildings that takes `kind` in: a Dock for a ship, any other drop site for a villager.
function nearestDrop(game, unit, kind) {
  let nearest = null, nearestDist = Infinity;
  for (const building of game.buildings.values()) {
    if (building.owner !== unit.owner || !building.constructed) continue;
    const spec = BUILDINGS[building.type];
    if (!(spec.drops || NO_DROPS).includes(kind) || !spec.naval !== !unit.naval) continue;
    const distance = distPoint(unit.x, unit.y, building);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearest = building;
    }
  }
  return nearest;
}

// A gather source that can no longer be worked: gone, used up, or a Farm or Mine still being built.
const isSpent = source => !source || source.dead || source.amount <= 0 || (source.kind === 'building' && !source.constructed);

// Gathering cycles through three phases: 'go' to the source, 'work' it until the villager is full, 'drop' it off.
function doGather(game, unit, order) {
  let source = game.entities.get(order.res);
  if (isSpent(source)) {
    source = switchSource(game, unit, order);
    if (!source && unit.carry.amount <= 0) return stop(unit);
  }
  if (order.phase === 'go') return walkToSource(game, unit, order, source);
  if (order.phase === 'work') return gatherFrom(game, unit, order, source);
  dropOff(game, unit, order);
}

// The source is spent: take the nearest other one of the kind within 12 tiles. With none left, a villager that carries
// something still takes it home (res -1); doGather stops one that carries nothing. Returns the new source, or null.
function switchSource(game, unit, order) {
  if (order.phase === 'work') order.phase = unit.carry.amount > 0 ? 'drop' : 'go';
  const source = nearestResource(game, unit, order.kind, 12);
  if (source) {
    order.res = source.id;
    unit.path = null;
  } else if (unit.carry.amount > 0) {
    order.res = -1;
    order.phase = 'drop';
  }
  return source;
}

// A source that cannot be reached is given up (res -1, so the next tick picks another); the fourth failure stops the villager.
function walkToSource(game, unit, order, source) {
  if (!source) return stop(unit);
  if (distPoint(unit.x, unit.y, source) <= REACH) {
    order.phase = 'work';
    unit.path = null;
    return;
  }
  const status = travel(game, unit, goalNear(source, 0.95), centerOf(source));
  if (status !== 'fail') return;
  if (++order.fails > 3) stop(unit);
  else order.res = -1;
}

function gatherFrom(game, unit, order, source) {
  const kind = order.kind, player = game.players[unit.owner];
  const farmRate = source.type === 'farm' ? farmStats(player.age).rate : 1; // Farms work faster each era
  const rate = RATE[kind] * DT * player.gatherMult[kind] * player.workRate * farmRate;
  if (unit.carry.type !== kind) unit.carry = { type: kind, amount: 0 };
  if (source.kind === 'building') source.gatherers = (source.gatherers || 0) + 1;
  const taken = drawFrom(game, source, rate); // removes an empty pile/Farm, exhausts a Mine's patch
  unit.carry.amount += taken;
  player.gathered += taken;
  if (unit.carry.amount >= (UNITS[unit.type].capacity ?? CARRY) || source.amount <= 0 || source.dead) {
    order.phase = 'drop';
    unit.path = null;
  }
}

function dropOff(game, unit, order) {
  const carry = unit.carry;
  if (carry.amount <= 0) {
    order.phase = 'go';
    return;
  }
  const dropSite = nearestDrop(game, unit, carry.type);
  if (!dropSite) return stop(unit);
  if (distPoint(unit.x, unit.y, dropSite) <= REACH) {
    game.players[unit.owner].res[carry.type] += carry.amount;
    unit.carry = { type: null, amount: 0 };
    order.phase = 'go';
    unit.path = null;
    return;
  }
  const status = travel(game, unit, goalNear(dropSite, 0.95), centerOf(dropSite));
  if (status === 'fail' && ++order.fails > 3) stop(unit);
}

// The nearest building in a build queue (a wall line) that is still standing and unfinished; it is taken off the queue.
// Finished or destroyed ones are dropped. A tie on distance goes to the earlier one in the queue.
function nextInQueue(game, unit, order) {
  order.queue = (order.queue || []).filter(id => {
    const building = game.entities.get(id);
    return building && !building.dead && !building.constructed && building.owner === unit.owner;
  });
  let nearest = null, nearestDist = Infinity;
  for (const id of order.queue) {
    const building = game.entities.get(id), distance = distPoint(unit.x, unit.y, building);
    if (distance < nearestDist) {
      nearestDist = distance;
      nearest = building;
    }
  }
  if (nearest) order.queue = order.queue.filter(id => id !== nearest.id);
  return nearest;
}

function doBuild(game, unit, order) {
  const building = game.entities.get(order.target);
  if (!building || building.dead || building.constructed) { // done (or gone): move on to the nearest segment left in the queue
    const next = order.queue && nextInQueue(game, unit, order);
    if (next) {
      order.target = next.id;
      order.fails = 0;
      unit.path = null;
      unit.retry = 0;
      return;
    }
  }
  if (!building || building.dead) return endBuild(unit, order);
  if (building.constructed) {
    if (building.gatherType && building.amount > 0) workAfterBuilds(order, building);
    return endBuild(unit, order);
  }
  if (distPoint(unit.x, unit.y, building) <= REACH) {
    building.workers++;
    unit.path = null;
    return;
  }
  const status = travel(game, unit, goalNear(building, 0.95), centerOf(building));
  if (status === 'fail') failBuildStep(unit, order);
}

// A finished farm or mine is the last job in the chain: interrupted builds first, then work it (in place of any gather the
// chain interrupted).
function workAfterBuilds(order, building) {
  let last = order;
  while (last.resume?.type === 'build' || last.resume?.type === 'repair') last = last.resume;
  last.resume = { type: 'gather', res: building.id, kind: building.gatherType, phase: 'go', fails: 0 };
}

// A build or repair whose building cannot be reached gives up after the fourth failure.
function failBuildStep(unit, order) {
  order.fails = (order.fails || 0) + 1;
  if (order.fails > 3) endBuild(unit, order);
}

// AoE1 damage model (openage doc/reverse_engineering/game_mechanics/damage.md):
// subtract the armor matching the attacker's attack type, add any bonus-vs-class,
// clamp each term, floor at 1. Buildings carry melee/pierce armor (no cls), so the
// bonus never applies to them; archers (pierce) bounce off their high pierce armor.
export function damageTo(attacker, target) {
  const armor = attacker.atkType === 'pierce' ? (target.parmor || 0) : (target.marmor || 0);
  const bonus = (attacker.bonus && target.cls && attacker.bonus[target.cls]) || 0;
  return Math.max(1, Math.max(0, attacker.atk - armor) + bonus);
}

export function hit(game, attacker, target) {
  // Snapshot who was exposed before the primary hit can release a sheltered king or change an empire's owner.
  const splash = attacker.splash ? [...game.units.values(), ...game.buildings.values()]
    .filter(e => e !== target && !e.dead && !e.aboard && !sheltered(e)) : null;
  game.damage(target, damageTo(attacker, target), attacker);
  if (splash) splashAround(game, attacker, target, splash);
}

// Splash damage: half damage to every other enemy unit and building within `splash` of the target's centre, except units
// in a transport's hold. The lists are copied first because a kill removes the entity from its Map.
function splashAround(game, attacker, target, exposed) {
  const center = centerOf(target);
  for (const entity of exposed) {
    if (entity.dead || entity.owner === attacker.owner || entity.aboard || sheltered(entity)) continue;
    if (distPoint(center.x, center.y, entity) <= attacker.splash) game.damage(entity, damageTo(attacker, entity) * 0.5, attacker);
  }
}

// Whether `unit` could ever get `target` in range: a ship needs open water within reach of a target on land, and a soldier
// needs ground within reach of a ship (so only ranged soldiers hit a ship on deep water; anyone can hit one in the shallows).
// Same-layer targets are always reachable as far as this goes. game.toWater / game.toLand hold each tile's distance.
export function canHit(game, unit, target) {
  if (target.aboard || sheltered(target)) return false;
  const naval = !!unit.naval;
  if (target.kind === 'unit' ? !!target.naval === naval : !naval && !BUILDINGS[target.type]?.naval) return true;
  const distances = naval ? game.toWater : game.toLand, n = game.map.size;
  const reach = Math.max(0.9, unit.range - 0.5) + 0.05;
  if (target.kind === 'unit') return distances[Math.floor(target.y) * n + Math.floor(target.x)] <= reach;
  return footprintMin(distances, n, target) - 0.5 <= reach;
}

// The smallest of `distances` over the tiles a building stands on.
function footprintMin(distances, n, building) {
  let smallest = Infinity;
  for (let y = building.y; y < building.y + building.size; y++) {
    for (let x = building.x; x < building.x + building.size; x++) smallest = Math.min(smallest, distances[y * n + x]);
  }
  return smallest;
}

// A breach order (one with `resume`) that loses its target hands back the order it interrupted, on the next tick and with no
// retry wait. A target this unit can never get in range of (canHit) ends the order the same way, before any path search.
// A walled-off attack first looks for an enemy building to break through (never the target itself: that would wrap the
// order round itself); a breach can wrap again, each layer restoring the one before. Only an attack with no breach counts
// fails.
function doAttack(game, unit, order) {
  const target = game.entities.get(order.target);
  if (attackOver(game, unit, target)) {
    if (!order.resume) return stop(unit);
    return resume(unit, order);
  }
  if (distPoint(unit.x, unit.y, target) <= unit.range + 0.1) {
    unit.path = null;
    if (unit.cd === 0) {
      unit.cd = unit.cooldown;
      hit(game, unit, target);
    }
    return;
  }
  chaseTarget(game, unit, order, target);
}

const attackOver = (game, unit, target) => !target || target.dead || target.owner === unit.owner
  || (target.kind !== 'unit' && target.kind !== 'building') || !canHit(game, unit, target);

// Walk into range of the target. When it has moved to another tile, the path is dropped (staggered: one tick in 5 per unit)
// so it is planned again towards where the target is now.
function chaseTarget(game, unit, order, target) {
  const targetTile = tileOf(target), tileKey = targetTile.x + ',' + targetTile.y;
  if (unit.path && order.last !== tileKey && (game.time + unit.id) % 5 === 0) unit.path = null;
  order.last = tileKey;
  const goal = goalNear(target, Math.max(0.9, unit.range - 0.5)), status = travel(game, unit, goal, targetTile);
  if (status !== 'fail') return;
  const wallId = unit.naval ? null : breachTarget(game, unit, targetTile, goal);
  if (wallId !== null && wallId !== order.target) return breach(unit, wallId, order);
  if (++order.fails > 3) stop(unit);
}

// An idle soldier or warship looks round every 5 ticks (staggered by id) and takes on the nearest enemy within its sight + 1
// that it can get in range of (canHit): a unit first (villagers count half a tile nearer), else a building (counted 2 tiles
// further away). Workers and unarmed transports never pick fights.
function aggro(game, unit) {
  if (unit.cls === 'civ' || !(unit.atk > 0) || (game.time + unit.id) % 5 !== 0) return;
  const reach = unit.sight + 1;
  const target = nearestEnemyUnit(game, unit, reach) || nearestEnemyBuilding(game, unit, reach);
  if (!target) return;
  unit.order = { type: 'attack', target: target.id, fails: 0, auto: true };
  unit.path = null;
}

function nearestEnemyUnit(game, unit, maxDist) {
  let nearest = null, nearestDist = maxDist;
  for (const other of game.units.values()) {
    if (other.owner === unit.owner || other.aboard || sheltered(other)) continue;
    const distance = Math.hypot(other.x - unit.x, other.y - unit.y) - (other.cls === 'civ' ? 0.5 : 0);
    if (distance < nearestDist && canHit(game, unit, other)) {
      nearestDist = distance;
      nearest = other;
    }
  }
  return nearest;
}

function nearestEnemyBuilding(game, unit, maxDist) {
  let nearest = null, nearestDist = maxDist;
  for (const building of game.buildings.values()) {
    if (building.owner === unit.owner) continue;
    const distance = distPoint(unit.x, unit.y, building) + 2;
    if (distance < nearestDist && canHit(game, unit, building)) {
      nearestDist = distance;
      nearest = building;
    }
  }
  return nearest;
}

// A relic order: 'go' fetches the relic, then 'store' carries it to the nearest Town or Government Center.
function doRelic(game, unit, order) {
  if (order.phase === 'go') return fetchRelic(game, unit, order, game.relics.get(order.relic));
  carryRelicHome(game, unit, order);
}

function fetchRelic(game, unit, order, relic) {
  if (!relic || relic.holder !== null || relic.stored !== null) return stop(unit);
  if (Math.hypot(relic.x - unit.x, relic.y - unit.y) <= REACH) {
    relic.holder = unit.id;
    unit.relic = relic.id;
    order.phase = 'store';
    unit.path = null;
    return;
  }
  const to = { x: Math.floor(relic.x), y: Math.floor(relic.y) };
  const goal = (x, y) => x === to.x && y === to.y;
  // a relic walled in by the enemy: break through, then take up the fetch again
  if (travel(game, unit, goal, to) === 'fail') breachOrFail(game, unit, order, to, goal);
}

const isRelicStore = (building, owner) => building.owner === owner && building.constructed
  && (building.type === 'town_center' || building.type === 'government_center');

function carryRelicHome(game, unit, order) {
  if (unit.relic === null) return stop(unit);
  let home = null, homeDist = Infinity;
  for (const building of game.buildings.values()) {
    if (!isRelicStore(building, unit.owner)) continue;
    const distance = distPoint(unit.x, unit.y, building);
    if (distance < homeDist) {
      homeDist = distance;
      home = building;
    }
  }
  if (!home) return stop(unit);
  if (homeDist <= REACH) return storeRelic(game, unit, home);
  const goal = goalNear(home, 0.95), to = centerOf(home);
  // the way home is walled off by the enemy: break through, then carry on home
  if (travel(game, unit, goal, to) === 'fail') breachOrFail(game, unit, order, to, goal);
}

function storeRelic(game, unit, home) {
  const relic = game.relics.get(unit.relic);
  relic.holder = null;
  relic.stored = home.id;
  unit.relic = null;
  stop(unit);
}

// Repair: stand by the building and put HP back (game.js repairBuilding pays for it) until it is whole, gone, no longer
// ours, or the owner runs out of something it costs; then take up the interrupted job, like a finished build.
function doRepair(game, unit, order) {
  const building = game.entities.get(order.target);
  if (repairOver(game, unit, building)) return endBuild(unit, order);
  if (distPoint(unit.x, unit.y, building) <= REACH) {
    building.repairers = (building.repairers || 0) + 1;
    unit.path = null;
    return;
  }
  const status = travel(game, unit, goalNear(building, 0.95), centerOf(building));
  if (status === 'fail') failBuildStep(unit, order);
}

const repairOver = (game, unit, building) => !building || building.dead || building.owner !== unit.owner
  || !building.constructed || building.hp >= building.maxHp || !canRepair(game.players[unit.owner], building.type);

// ---- transports ----
// Close enough to step aboard: a transport waits on the water next to the shore, so a soldier on the shore tile beside it
// (up to a diagonal away) can board.
const BOARD_REACH = 1.6;
// Board: walk to the transport (following it while it moves) and step aboard, out of sight, while it has room; a full,
// lost or foreign transport ends the order. Boarding drops the unit's other orders; a relic it carries comes along.
function doBoard(game, unit, order) {
  const transport = game.entities.get(order.target);
  if (cannotBoard(unit, transport)) return stop(unit);
  if (Math.hypot(transport.x - unit.x, transport.y - unit.y) <= BOARD_REACH) return stepAboard(unit, transport);
  const transportTile = tileOf(transport), tileKey = transportTile.x + ',' + transportTile.y;
  if (unit.path && order.last !== tileKey) unit.path = null; // the transport moved: head for where it is now
  order.last = tileKey;
  const besideTransport = (x, y) => Math.hypot(x + 0.5 - transport.x, y + 0.5 - transport.y) <= BOARD_REACH - 0.1;
  const status = travel(game, unit, besideTransport, transportTile);
  if (status !== 'fail' || transport.order.type !== 'idle') return; // while it is still on its way to the shore, keep waiting
  if (++order.fails > 8) return stop(unit);
  if (order.fails % 3 === 0) callTransport(game, unit, transport);
}

const cannotBoard = (unit, transport) => !transport || transport.dead || transport.owner !== unit.owner || !transport.cargo
  || transport.cargo.length >= UNITS[transport.type].carries;

function stepAboard(unit, transport) {
  transport.cargo.push(unit.id);
  unit.aboard = transport.id;
  unit.x = transport.x;
  unit.y = transport.y;
  stop(unit);
}

// It waits where this unit can't walk (a coast the base has walled in since): call it to a shore this unit can reach.
function callTransport(game, unit, transport) {
  const landing = landingNear(game, unit.x, unit.y, unit);
  if (landing && Math.hypot(landing.sea.x - transport.x, landing.sea.y - transport.y) > 0.3) {
    transport.order = { type: 'move', x: landing.sea.x, y: landing.sea.y, slack: 0 };
    transport.path = null;
    transport.retry = 0;
  }
}

// Sail to the water tile (x, y): within `near` of it is there (a tile for unloading; a ferry taking people on comes onto
// the tile itself, so they can reach it from the shore). A way that fails is tried once more for anywhere within a tile of
// it (order.slack 1); 'fail' only after that. 'arrived' | 'moving' | 'wait' | 'fail'.
function sailTo(game, unit, order, x, y, near = 1) {
  if (Math.hypot(x - unit.x, y - unit.y) <= near) return 'arrived';
  const to = { x: Math.floor(x), y: Math.floor(y) };
  const status = travel(game, unit, (i, j) => Math.abs(i - to.x) <= order.slack && Math.abs(j - to.y) <= order.slack, to);
  if (status !== 'fail' || order.slack >= 1) return status;
  order.slack = 1;
  unit.retry = 0;
  return 'moving';
}

// Unload: sail to the landing (order.x, order.y), a water tile beside the shore tile (order.sx, order.sy), and put every
// passenger ashore on the free ground nearest it. Passengers carrying a relic take it on to a Town Center; the rest walk on
// to order.to, if given.
function doUnload(game, unit, order) {
  if (!unit.cargo?.length) return stop(unit);
  const status = sailTo(game, unit, order, order.x, order.y);
  if (status === 'fail') return stop(unit); // can't reach the landing, even within a tile of it: give up
  if (status === 'arrived') {
    landPassengers(game, unit, order);
    stop(unit);
  }
}

// Everyone aboard goes ashore beside the shore tile (order.sx, order.sy); false (and all stay aboard) when the shore is full.
function landPassengers(game, transport, order) {
  const passengers = transport.cargo.map(id => game.entities.get(id)).filter(Boolean);
  const spots = landingTiles(game, order.sx, order.sy, passengers.length);
  if (!spots.length) return false;
  passengers.forEach((passenger, i) => {
    const spot = spots[Math.min(i, spots.length - 1)];
    passenger.aboard = null;
    passenger.x = spot.x;
    passenger.y = spot.y;
    passenger.path = null;
    passenger.retry = 0;
    passenger.order = orderAshore(passenger, order);
  });
  transport.cargo = [];
  return true;
}

// A ferried passenger walks on to its own place in the group's formation (order.slots), others to order.to.
function orderAshore(passenger, order) {
  if (passenger.relic !== null) return { type: 'relic', relic: passenger.relic, phase: 'store', fails: 0 };
  const to = order.slots?.[passenger.id] || order.to;
  return to ? { type: 'move', x: to.x, y: to.y, slack: 0 } : IDLE();
}

// ---- ferries (commands.js startFerries) ----
// A ferry shuttles its riders (order.ids) across the sea: 'load' sails to the pickup landing (order.px, order.py) and waits
// there while they board, 'carry' sails to the drop landing (order.x, order.y) and puts them ashore, then it goes back for
// the next boatload until nobody is left. It sails as soon as it is full or everyone left is aboard, or with whoever is
// aboard once nobody has boarded for FERRY_WAIT ticks; with nobody aboard by then it gives up. The wait starts over whenever someone boards or a rider is still walking up. Riders who die or take
// another order drop out of the job.
const FERRY_WAIT = 600;
function doFerry(game, boat, order) {
  order.ids = order.ids.filter(id => {
    const rider = game.entities.get(id);
    return rider && !rider.dead && (rider.aboard === boat.id || (rider.order.type === 'ferry' && rider.order.transport === boat.id));
  });
  if (order.phase === 'load') loadFerry(game, boat, order);
  else carryFerry(game, boat, order);
}

function loadFerry(game, boat, order) {
  const waiting = order.ids.map(id => game.entities.get(id)).filter(rider => !rider.aboard), aboard = boat.cargo.length;
  if (!waiting.length && !aboard) return stop(boat);
  if (aboard !== order.held || waiting.some(rider => rider.path)) { // someone boarded, or is still on the way
    order.held = aboard;
    order.since = game.time;
  }
  const stalled = order.docked && game.time - order.since > FERRY_WAIT;
  if (aboard && (!waiting.length || aboard >= UNITS[boat.type].carries || stalled)) return setSail(boat, order, 'carry');
  if (stalled) return stop(boat);
  if (order.docked) return;
  const status = sailTo(game, boat, order, order.px, order.py, 0.3);
  if (status === 'fail') return stop(boat);
  if (status === 'arrived') {
    order.docked = true;
    order.since = game.time;
    boat.path = null;
  }
}

function carryFerry(game, boat, order) {
  if (!boat.cargo.length) return setSail(boat, order, 'load');
  const status = sailTo(game, boat, order, order.x, order.y);
  if (status === 'fail') return stop(boat); // the landing can't be reached: they stay aboard, as after a failed unload
  if (status !== 'arrived') return;
  if (!landPassengers(game, boat, order)) return stop(boat); // the shore is full: keep them aboard
  setSail(boat, order, 'load');
}

function setSail(boat, order, phase) {
  order.phase = phase;
  order.docked = false;
  order.slack = 0;
  boat.path = null;
  boat.retry = 0;
}

// A rider waits on the shore by the pickup landing (walking there first) and steps aboard once its ferry lies there taking
// people on and has room. A ferry that is gone or has dropped the job, or a shore it can't walk to, ends the order.
function doRide(game, unit, order) {
  const boat = game.entities.get(order.transport), job = boat?.order;
  if (!boat || boat.dead || boat.owner !== unit.owner || job.type !== 'ferry' || !job.ids.includes(unit.id)) return stop(unit);
  const at = job.docked ? boat : { x: job.px, y: job.py };
  if (Math.hypot(at.x - unit.x, at.y - unit.y) <= BOARD_REACH) {
    unit.path = null;
    if (job.docked && boat.cargo.length < UNITS[boat.type].carries) stepAboard(unit, boat);
    return;
  }
  const tile = { x: Math.floor(at.x), y: Math.floor(at.y) }, tileKey = tile.x + ',' + tile.y;
  if (unit.path && order.last !== tileKey) unit.path = null; // the ferry came in a little off the landing: head for it
  order.last = tileKey;
  const beside = (x, y) => Math.hypot(x + 0.5 - at.x, y + 0.5 - at.y) <= BOARD_REACH - 0.1;
  if (travel(game, unit, beside, tile) === 'fail' && ++order.fails > 8) stop(unit);
}
