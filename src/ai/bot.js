// Scripted build-order AI. Issues only game.command calls and reads game.visibleEntities/knownResources.
import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { AGES, AGE_COST, ageIndex, popLimit } from '../data/ages.js';
import { TECHS } from '../data/techs.js';
import { canPlace, canAfford, canRepair, ageUpProblem, ageUpNeed, ageBuildings } from '../sim/commands.js';
import { RES_KIND, WATER, centerOf, distPoint } from '../sim/util.js';
import { canHit } from '../sim/orders.js';
import { nearestOpen } from '../sim/formation.js';
import { parseTimeLimit } from '../time-limit.js';

// attackAge: the bot sends no wave before reaching this age. grace: no wave before this tick in any round
// (overrides the early Wonder rush and Death Match timings), so a relaxed match starts peacefully like AoE1.
// towers: how many Towers it keeps near its Town Center from the Tool Age on.
// fleet: warships it keeps from the Bronze Age on (two more once it has seen enemy ships); fishers: Fishing Ships from
// the Stone Age; transports: Transport Ships it keeps when the enemy (or, in the relics round, a relic) is across the sea.
// ageFirst: research and the second half of the army only spend what leaves the next age-up affordable.
// work: the bot's sim workRate handicap (half-speed economy and production). cap: the match's time limit in ticks.
export const DIFF = {
  relaxed: { every: 40, villagers: 14, wave: 10, attackAt: 36000, army: 12, attackAge: 'bronze', grace: 36000,
    dmWave: 20, dmArmy: 24, work: 0.5, cap: 48000, towers: 1, fleet: 1, fishers: 2, transports: 1 },
  easy:    { every: 20, villagers: 18, wave: 12, attackAt: 10000, army: 16, attackAge: 'tool', grace: 0,
    dmWave: 24, dmArmy: 44, towers: 1, ageFirst: true, fleet: 2, fishers: 2, transports: 1 },
  medium:  { every: 15, villagers: 20, wave: 14, attackAt: 8000, army: 28, attackAge: 'stone', grace: 0,
    dmWave: 32, dmArmy: 44, towers: 2, fleet: 3, fishers: 3, transports: 2 },
  hard:    { every: 10, villagers: 26, wave: 18, attackAt: 8000, army: 36, attackAge: 'stone', grace: 0,
    dmWave: 38, dmArmy: 44, towers: 3, fleet: 4, fishers: 4, transports: 2 },
};
// Bot think interval in ticks for each difficulty.
export const THINK_EVERY = Object.fromEntries(Object.entries(DIFF).map(([tier, settings]) => [tier, settings.every]));
// createGame options for a match between these bot difficulties (null = a human player): each bot's handicap,
// and the chosen time limit, otherwise the longest bot cap (undefined keeps the round's own).
export const matchOptions = (diffs, { noTimeLimit = false, timeLimit } = {}) => ({
  workRate: diffs.map(tier => DIFF[tier]?.work ?? 1),
  capTicks: matchCapTicks(diffs, noTimeLimit, timeLimit),
});
function matchCapTicks(diffs, noTimeLimit, timeLimit) {
  if (parseTimeLimit(timeLimit) !== null) return Number(timeLimit) === 0 ? Infinity : Number(timeLimit) * 1200;
  if (noTimeLimit) return Infinity;
  return Math.max(0, ...diffs.map(tier => DIFF[tier]?.cap ?? 0)) || undefined;
}

const RESOURCES = ['food', 'wood', 'gold', 'stone'];
// Share of the villagers each resource should get; before 12 villagers (or in the Stone Age) only food and wood.
const SHARE = { food: 0.35, wood: 0.35, gold: 0.2, stone: 0.1 };
const EARLY_SHARE = { food: 0.5, wood: 0.5, gold: 0, stone: 0 };
// Age-up shortfalls are filled in this order, from surpluses checked in the second order.
const SHORTFALL_ORDER = ['gold', 'food', 'stone', 'wood'];
const SURPLUS_ORDER = ['food', 'wood', 'stone', 'gold'];
// Sweep waypoints for a wave with nothing in sight, laid out for a 64-tile map (scaled to the real size).
const SWEEP_POINTS = [[16, 16], [48, 16], [16, 48], [48, 48], [32, 32], [32, 10], [32, 54], [10, 32], [54, 32]];
const WALL_SCREEN = 6; // tiles in the wall line in front of each tower
const SHIPS = ['destroyer', 'frigate', 'war_galley']; // newest first
const SIEGE = ['railgun', 'field_artillery', 'cannon', 'trebuchet', 'catapult'];
const RESEARCH_PREF = ['woodworking', 'gold_mining', 'sacred_harvest', 'colonial_trade', 'electrification', 'masonry',
  'bronze_weapons', 'bronze_shields', 'iron_weapons', 'ballistics', 'hide_armor', 'scale_barding', 'phalanx_drill',
  'torsion_engines', 'steel_weapons', 'plate_armor', 'paper_cartridges', 'bayonets', 'railways', 'rifled_barrels',
  'composite_armor', 'air_support', 'nanoweave_plating'];
// Counter-pick preference lists (openage damage.md classes). Same units, reordered; the era units sit right after the
// AI Future ones (newest first at each building), and armor (Tanks, Armored Trains) is answered with siege and Tanks:
// vs archers -> tanky melee / pierce-armoured closers; vs cavalry -> spearman (bonus) first;
// vs infantry -> pierce archers (infantry has no pierce armour); vs siege -> fast closers.
const PREF = {
  default: ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon',
    'musketeer', 'knight', 'trebuchet', 'swordsman', 'hoplite', 'catapult', 'drone', 'crossbowman', 'horse_archer',
    'scout', 'axeman', 'bowman', 'spearman', 'clubman', 'slinger'],
  archer: ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon',
    'musketeer', 'knight', 'trebuchet', 'catapult', 'swordsman', 'hoplite', 'horse_archer', 'scout', 'drone',
    'crossbowman', 'axeman', 'spearman', 'clubman', 'bowman', 'slinger'],
  cav: ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon',
    'musketeer', 'knight', 'trebuchet', 'catapult', 'spearman', 'swordsman', 'hoplite', 'drone', 'crossbowman',
    'bowman', 'horse_archer', 'axeman', 'scout', 'clubman', 'slinger'],
  inf: ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon',
    'musketeer', 'knight', 'trebuchet', 'catapult', 'drone', 'crossbowman', 'bowman', 'horse_archer', 'scout',
    'slinger', 'hoplite', 'swordsman', 'axeman', 'spearman', 'clubman'],
  siege: ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon',
    'musketeer', 'knight', 'trebuchet', 'catapult', 'horse_archer', 'scout', 'drone', 'crossbowman', 'hoplite',
    'swordsman', 'axeman', 'bowman', 'spearman', 'clubman', 'slinger'],
  armor: ['railgun', 'mech', 'field_artillery', 'tank', 'armored_train', 'cannon', 'trebuchet', 'machine_gunner',
    'rifleman', 'knight', 'musketeer', 'catapult', 'drone', 'crossbowman', 'swordsman', 'hoplite', 'horse_archer',
    'scout', 'axeman', 'bowman', 'spearman', 'clubman', 'slinger'],
};

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// Sorts `list` in place, nearest `point` first, and returns it.
const nearestFirst = (list, point) => list.sort((a, b) => dist(a, point) - dist(b, point));
const notBuildingOrRepairing = villager => villager.order.type !== 'build' && villager.order.type !== 'repair';

// How many units the buildings have queued whose type passes `test`.
function queuedUnits(buildings, test) {
  let total = 0;
  for (const building of buildings) for (const entry of building.queue) if (test(entry.unit)) total++;
  return total;
}
function queuedOfType(buildings, unitType) {
  let total = 0;
  for (const building of buildings) for (const entry of building.queue) if (entry.unit === unitType) total++;
  return total;
}

// Breadth-first flood fill of an n x n grid from tile index `start`, 4-way (paths never cut corners). `enter(j)` decides
// whether neighbour tile j joins the fill (and marks it), in visiting order.
const STEP_X = [1, -1, 0, 0], STEP_Y = [0, 0, 1, -1];
function flood4(n, start, enter) {
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head], x = i % n, y = (i / n) | 0;
    for (let step = 0; step < 4; step++) {
      const nx = x + STEP_X[step], ny = y + STEP_Y[step];
      if (nx >= 0 && ny >= 0 && nx < n && ny < n && enter(ny * n + nx)) queue.push(ny * n + nx);
    }
  }
}

// Tiles reachable on foot from start on the bare map: water and the map's starting resources block, buildings don't.
function reachableFrom(map, start) {
  const n = map.size, blocked = new Uint8Array(n * n), seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) blocked[i] = map.tiles[i] === WATER ? 1 : 0;
  for (const resource of map.resources) blocked[Math.floor(resource.y) * n + Math.floor(resource.x)] = 1;
  const startIndex = start.y * n + start.x;
  seen[startIndex] = 1;
  flood4(n, startIndex, j => {
    if (seen[j] || blocked[j]) return false;
    seen[j] = 1;
    return true;
  });
  return seen;
}
// Each walkable tile's land mass (4-neighbour, deep water parts them; -1 on deep water), from the bare map: on an island
// map the home islands and the central island are separate land masses, on a river map there is one.
function landMasses(map) {
  const n = map.size, massId = new Int32Array(n * n).fill(-1);
  for (let start = 0, next = 0; start < n * n; start++) {
    if (map.tiles[start] === WATER || massId[start] >= 0) continue;
    massId[start] = next;
    flood4(n, start, j => {
      if (massId[j] >= 0 || map.tiles[j] === WATER) return false;
      massId[j] = next;
      return true;
    });
    next++;
  }
  return massId;
}
// Nearest tile (by square rings) in the reachable set.
function nearestReachable(map, reach, point) {
  const n = map.size;
  for (let ring = 0; ring < n; ring++) for (let dy = -ring; dy <= ring; dy++) for (let dx = -ring; dx <= ring; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
    const x = point.x + dx, y = point.y + dy;
    if (x >= 0 && y >= 0 && x < n && y < n && reach[y * n + x]) return { x, y };
  }
  return point;
}

export function createBot(game, pid, difficulty = 'medium') {
  const settings = DIFF[difficulty], me = game.players[pid];
  const map = game.map, mapSize = map.size;
  const nearestOpponent = () => game.players.filter(p => p.id !== pid && !p.defeated)
    .sort((a, b) => dist(map.starts[pid], map.starts[a.id]) - dist(map.starts[pid], map.starts[b.id]) || a.id - b.id)[0]?.id;
  let enemyPid = game.players.length === 2 ? 1 - pid : nearestOpponent();
  let enemyStart = map.starts[enemyPid];
  // Fixed sweep points can fall in a lake; every unit sent there would search the whole map for a path, so snap them
  // to reachable land.
  const reach = reachableFrom(map, map.starts[pid]), sweepScale = mapSize / 64;
  // Which land mass a point is on; soldiers only get orders for targets on their own (a transport ferries the rest).
  const mass = landMasses(map), massOf = point => mass[Math.floor(point.y) * mapSize + Math.floor(point.x)];
  const homeMass = massOf(map.starts[pid]);
  let enemyMass = massOf(enemyStart), overSea = enemyMass !== homeMass;
  const sameLand = (a, b) => massOf(a) === massOf(b);
  const sweep = [enemyStart, ...SWEEP_POINTS.map(([x, y]) =>
    nearestReachable(map, reach, { x: Math.round(x * sweepScale), y: Math.round(y * sweepScale) }))];
  const sentTo = new Map(); // unit id -> sweepIdx of the waypoint it was last sent to
  const bot = {
    saving: false, why: {}, rejects: 0, maxRejects: 0, issued: 0, waveActive: false, sweep, sweepIdx: 0, scout: 0, think,
  };

  // In the Wonder round, keep the wonder's cost untouched until it is placed.
  const wonderPlaced = () => ownEntities('buildings').some(b => b.type === 'wonder');
  const wonderReserve = () => (game.rules && game.rules.id === 'wonder' && !wonderPlaced()) ? BUILDINGS.wonder.cost : null;
  const canPay = cost => {
    const reserve = wonderReserve();
    if (!reserve) return canAfford(me, cost);
    return canAfford(me, Object.fromEntries(RESOURCES.map(kind => [kind, (cost[kind] || 0) + (reserve[kind] || 0)])));
  };

  // Issues one command, keeping count of rejections (by type, item and reason) for the tests and for debugging.
  function cmd(command) {
    const result = game.command(pid, command);
    bot.issued++;
    if (result.ok) bot.rejects = 0;
    else noteRejection(command, result.reason);
    return result.ok;
  }
  function noteRejection(command, reason) {
    const key = command.type + ':' + (command.building || command.unit || '') + ':' + reason;
    bot.why[key] = (bot.why[key] || 0) + 1;
    bot.rejects++;
    bot.maxRejects = Math.max(bot.maxRejects, bot.rejects);
  }
  const ownEntities = kind => [...game[kind].values()].filter(e => e.owner === pid && !e.aboard && !e.garrisonedIn);
  const buildingCount = type => ownEntities('buildings').filter(b => b.type === type).length;
  // True when paying `cost` still leaves, of each resource it spends, what the next age-up costs (from the Age of Sail
  // on that includes stone). No reserve while an age-up is already paid for and running, or at the last age.
  const leavesAgeUp = cost => {
    const nextAge = AGES[ageIndex(me.age) + 1], ageUpCost = !me.ageUp && nextAge ? AGE_COST[nextAge].cost : {};
    return Object.keys(cost).every(kind => !cost[kind] || me.res[kind] - cost[kind] >= (ageUpCost[kind] || 0));
  };

  // More villagers as the eras go on (the age-ups and buildings cost more): +2 a era from the Iron Age, +12 in AI Future.
  const villagerTarget = () => settings.villagers + 2 * Math.max(0, ageIndex(me.age) - ageIndex('bronze'));

  // Top-left of the nearest spot (square rings 3 to 15 tiles out from `around`) where `type` can go. With `margin`,
  // a spot closer than 12 tiles also needs a free tile all round it, so buildings don't box each other in.
  function spotNear(type, around, margin = true) {
    const size = BUILDINGS[type].size, cx = Math.floor(around.x), cy = Math.floor(around.y);
    for (let ring = 3; ring < 16; ring++) for (let dy = -ring; dy <= ring; dy += 1) for (let dx = -ring; dx <= ring; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
      const x = cx + dx, y = cy + dy;
      if (!canPlace(game, pid, type, x, y)) continue;
      if (margin && ring < 12 && !clearAround(x, y, size)) continue;
      return { x, y };
    }
    return null;
  }
  // True when a `size` footprint at (x, y) and the one-tile border round it hold nothing.
  function clearAround(x, y, size) {
    for (let j = y - 1; j <= y + size; j++) for (let i = x - 1; i <= x + size; i++) if (game.occAt(i, j)) return false;
    return true;
  }
  function tryBuild(type, vills, around, builderCount = 1) {
    const def = BUILDINGS[type];
    if (ageIndex(def.age) > ageIndex(me.age)) return false;
    // The Wonder itself is what the reserve is kept for.
    if (!(type === 'wonder' ? canAfford(me, def.cost) : canPay(def.cost))) return false;
    const spot = spotNear(type, around);
    if (!spot) return false;
    const builders = nearestFirst(vills.filter(v => v.order.type !== 'build'), spot).slice(0, builderCount);
    if (!builders.length) return false;
    return cmd({ type: 'build', ids: builders.map(v => v.id), building: type, x: spot.x, y: spot.y });
  }

  // A wall screen in front of each finished tower: a straight line of WALL_SCREEN tiles, one open row out from the tower
  // on the side facing the enemy start, so attackers walk round it under the tower's fire or stop to break it. Lost
  // segments are put back. Walls have no gates and our own units never break our own walls, so a tile next to one of our
  // other buildings is left out, and the whole line is dropped if it would cut off any ground we can walk on now.
  const wallSkip = new Map(); // tower id -> tick its screen was last found to cut off ground
  function screenTiles(tower) {
    const centre = centerOf(tower), dx = enemyStart.x + 0.5 - centre.x, dy = enemyStart.y + 0.5 - centre.y, tiles = [];
    if (Math.abs(dx) >= Math.abs(dy)) { // the enemy lies more east or west: a north-south line
      const x = dx > 0 ? tower.x + tower.size + 1 : tower.x - 2;
      for (let k = 0; k < WALL_SCREEN; k++) tiles.push({ x, y: tower.y - 2 + k });
    } else {
      const y = dy > 0 ? tower.y + tower.size + 1 : tower.y - 2;
      for (let k = 0; k < WALL_SCREEN; k++) tiles.push({ x: tower.x - 2 + k, y });
    }
    return tiles;
  }
  const nextToBuilding = (x, y) => {
    for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) {
      const e = game.entities.get(game.occAt(i, j));
      if (e && e.kind === 'building' && e.type !== 'wall') return true;
    }
    return false;
  };
  // An open tile: on the map, not deep water, unoccupied, not reserved (wall foundations count as walls already) and
  // not one of the `walled` tile indices.
  function isOpenTile(i, walled) {
    return map.tiles[i] !== WATER && !game.occAt(i % mapSize, (i / mapSize) | 0) && !game.reserved.has(i) && !walled.has(i);
  }
  // Tiles reachable on foot from the open tile `from`, with the `walled` tile indices also blocked.
  function openArea(from, walled) {
    const seen = new Uint8Array(mapSize * mapSize), start = from.y * mapSize + from.x;
    if (!isOpenTile(start, walled)) return seen;
    seen[start] = 1;
    flood4(mapSize, start, j => {
      if (seen[j] || !isOpenTile(j, walled)) return false;
      seen[j] = 1;
      return true;
    });
    return seen;
  }
  const tilesMarked = marks => marks.reduce((sum, mark) => sum + mark, 0);
  // True when walling `tiles` leaves every tile we can reach from beside the Town Center still reachable.
  function keepsGroundOpen(tc, tiles) {
    const walled = new Set(tiles.map(t => t.y * mapSize + t.x)), from = openTileBeside(tc, walled);
    if (!from) return false;
    const before = openArea(from, new Set()), after = tilesMarked(openArea(from, walled));
    return after === tilesMarked(before) - [...walled].filter(i => before[i]).length;
  }
  // The first open tile, row by row, of the ring just outside the Town Center.
  function openTileBeside(tc, walled) {
    const x0 = tc.x - 1, y0 = tc.y - 1, x1 = tc.x + tc.size, y1 = tc.y + tc.size;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (x !== x0 && x !== x1 && y !== y0 && y !== y1) continue;
      if (x >= 0 && y >= 0 && x < mapSize && y < mapSize && isOpenTile(y * mapSize + x, walled)) return { x, y };
    }
    return null;
  }
  function wallTowers(tc, free) {
    if (ageIndex(me.age) < ageIndex(BUILDINGS.wall.age)) return;
    for (const tower of ownEntities('buildings')) {
      if (tower.type !== 'tower' || !tower.constructed) continue;
      if (game.time - (wallSkip.get(tower.id) ?? -Infinity) < 1200) continue;
      const tiles = screenTiles(tower).filter(t => canPlace(game, pid, 'wall', t.x, t.y) && !nextToBuilding(t.x, t.y));
      if (!tiles.length) continue;
      const cost = { stone: BUILDINGS.wall.cost.stone * tiles.length };
      if (!canPay(cost) || !leavesAgeUp(cost)) return;
      if (!keepsGroundOpen(tc, tiles)) { wallSkip.set(tower.id, game.time); continue; }
      const builder = nearestFirst(free.filter(v => v.order.type !== 'repair'), tiles[0])[0];
      if (builder) cmd({ type: 'wall', ids: [builder.id], tiles });
      return; // one screen per think
    }
  }

  // Foundations nobody is working on (the builder died, was pulled away, or gave up on the way) get the nearest free
  // villager again: buildingCount() includes foundations, so an abandoned House or gate building would otherwise block
  // every later one (and the age-up). One that has made no progress after three such calls, and none for 2 minutes, is
  // unreachable: delete it (buildingCount() then lets a new one go somewhere else).
  const stall = new Map(); // foundation id -> { progress, since, sends }
  function finishFoundations(buildings, vills) {
    for (const id of stall.keys()) {
      const foundation = game.entities.get(id);
      if (!foundation || foundation.constructed) stall.delete(id);
    }
    const working = foundationsBeingWorked(vills);
    let sent = 0;
    for (const foundation of buildings) {
      if (foundation.constructed || foundation.type === 'wonder') continue; // the Wonder round staffs its Wonder itself
      let record = stall.get(foundation.id);
      if (!record || foundation.progress > record.progress) {
        stall.set(foundation.id, record = { progress: foundation.progress, since: game.time, sends: 0 });
      } else if (record.sends >= 3 && game.time - record.since > 2400) {
        if (cmd({ type: 'delete', id: foundation.id })) stall.delete(foundation.id);
        continue;
      }
      // Three calls with no progress: wait to delete it.
      if (working.has(foundation.id) || sent >= 2 || record.sends >= 3) continue;
      const builder = nearestFirst(vills.filter(notBuildingOrRepairing), foundation)[0];
      if (builder && cmd({ type: 'construct', ids: [builder.id], targetId: foundation.id })) {
        record.sends++;
        sent++;
        working.add(foundation.id);
      }
    }
  }
  // Ids of the buildings some villager is building or repairing, now, queued, or to resume after the current job.
  function foundationsBeingWorked(vills) {
    const working = new Set();
    for (const villager of vills) {
      for (let order = villager.order; order && (order.type === 'build' || order.type === 'repair'); order = order.resume) {
        working.add(order.target);
        if (order.queue) for (const id of order.queue) working.add(id);
      }
    }
    return working;
  }

  // The most damaged finished building under 70% HP with no enemy soldier within 8 tiles of it gets the nearest free
  // villager (two for a Town Center or Castle), one building at a time, while we can pay for it. They go back to work after.
  function repairDamaged(done, vills, enemies) {
    if (vills.some(v => v.order.type === 'repair')) return;
    const danger = enemies.filter(e => e.kind === 'unit' && e.cls !== 'civ');
    const damaged = done.filter(b => b.hp < b.maxHp * 0.7 && canRepair(me, b.type)
      && !danger.some(e => distPoint(e.x, e.y, b) < 8));
    const target = damaged.sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
    if (!target) return;
    const crew = target.type === 'town_center' || target.type === 'castle' ? 2 : 1;
    const ids = nearestFirst(vills.filter(notBuildingOrRepairing), target).slice(0, crew).map(v => v.id);
    if (ids.length) cmd({ type: 'repair', ids, targetId: target.id });
  }

  function think() {
    if (game.result || me.defeated) return;
    if (game.players.length > 2 && game.players[enemyPid].defeated) {
      const next = nearestOpponent();
      if (next === undefined) return;
      enemyPid = next;
      enemyStart = map.starts[enemyPid];
      enemyMass = massOf(enemyStart);
      overSea = enemyMass !== homeMass;
      sweep[0] = enemyStart;
      bot.sweepIdx = 0;
      sentTo.clear();
      for (const [id, job] of ferry) if (job.wave) {
        job.dest = { ...enemyStart };
        if (job.stage === 'sail') cmd({ type: 'unload', transportId: id, x: job.dest.x, y: job.dest.y });
      }
    }
    const buildings = ownEntities('buildings'), done = buildings.filter(b => b.constructed);
    const tc = buildings.find(b => b.type === 'town_center' && b.constructed), anyBase = tc || done[0];
    const units = ownEntities('units'), vills = units.filter(u => u.type === 'villager');
    const army = units.filter(u => u.cls !== 'civ' && u.type !== 'king' && !u.naval), ships = units.filter(u => u.naval);
    const roundId = game.rules ? game.rules.id : 'conquest';
    if (!anyBase && !vills.length && !army.length) return;
    const home = anyBase ? centerOf(anyBase) : (units[0] || map.starts[pid]);
    const visible = game.visibleEntities(pid);
    const enemies = visible.filter(e => (game.players.length === 2 ? e.owner === enemyPid
      : e.owner != null && e.owner !== pid && !game.players[e.owner].defeated) && (e.kind === 'unit' || e.kind === 'building'));

    trainVillagers(tc, vills, done);
    buildHouses(buildings, vills, home, roundId);
    const free = vills.filter(v => v.order.type !== 'build');
    if (roundId === 'kingdoms' && !buildings.some(b => b.type === 'castle') && ageIndex(me.age) >= ageIndex('medieval')) {
      tryBuild('castle', free, home);
    }
    buildBase(tc, buildings, vills, free, home, roundId);
    advanceAge(vills, roundId);
    buildGateBuildings(free, home, roundId);
    buildEraBuildings(tc, free, home, roundId);
    finishFoundations(buildings, vills);
    if (!bot.saving) repairDamaged(done, vills, enemies);
    if (!bot.saving) research(done);
    buildWonder(buildings, vills, free, home, roundId);

    const idle = vills.filter(v => v.order.type === 'idle');
    if (idle.length) assign(idle, vills, home, done);
    rebalanceForAgeUp(vills, home, done);

    trainArmy(army, ships, vills, done, enemies, roundId);
    orderArmy(army, enemies, home, roundId);
    navy(ships, done, buildings, free, enemies, home, roundId, army);
  }

  // ---- economy and buildings ----
  function trainVillagers(tc, vills, done) {
    if (!tc || (bot.saving && vills.length >= 14)) return;
    const queued = queuedOfType(done, 'villager');
    if (vills.length + queued >= villagerTarget() || tc.queue.length >= 2) return;
    if (canAfford(me, UNITS.villager.cost) && me.pop < me.popCap) cmd({ type: 'train', buildingId: tc.id, unit: 'villager' });
  }
  function buildHouses(buildings, vills, home, roundId) {
    const housesBuilding = buildings.filter(b => b.type === 'house' && !b.constructed).length;
    const maxAtOnce = roundId === 'deathmatch' ? 3 : 1;
    if (me.popCap < popLimit(me.age) && me.pop + 3 >= me.popCap && housesBuilding < maxAtOnce && vills.length) {
      tryBuild('house', vills, home);
    }
  }
  function buildBase(tc, buildings, vills, free, home, roundId) {
    // A lost Town Center is rebuilt: it trains the villagers and no age-up happens without one.
    if (!tc && !buildings.some(b => b.type === 'town_center') && vills.length) {
      tryBuild('town_center', vills, home, Math.min(4, vills.length));
    }
    if (vills.length >= 5 && buildingCount('barracks') < 1) tryBuild('barracks', free, home);
    if (vills.length >= 7 && buildingCount('storage_pit') < 1) tryBuild('storage_pit', free, home);
    buildGranary(free, home, roundId);
    if (roundId === 'deathmatch' && vills.length >= 5) buildDeathMatchProduction(free, home);
    if (difficulty === 'hard' && vills.length >= 14 && buildingCount('barracks') < 2) tryBuild('barracks', free, home);
  }
  // A Granary by the nearest berries (within 12 tiles of home, else at home, where the Farms go) shortens food trips.
  // Not before the Bronze age-up is paid for: earlier it slows the climb by a minute or more.
  function buildGranary(free, home, roundId) {
    const bronzePaidFor = (me.ageUp && ageIndex(me.age) >= 1) || ageIndex(me.age) >= 2;
    if (!bronzePaidFor || buildingCount('granary') >= 1 || roundId === 'wonder') return;
    const berries = game.knownResources(pid).filter(r => r.type === 'berry' && r.amount > 0 && dist(r, home) <= 12);
    const berry = nearestFirst(berries, home)[0];
    tryBuild('granary', free, berry || home);
  }
  // Death Match's rich start: mass production buildings instead of a slow economy.
  function buildDeathMatchProduction(free, home) {
    if (buildingCount('barracks') < 4) tryBuild('barracks', free, home);
    else if (ageIndex(me.age) >= 1 && buildingCount('archery_range') < 2) tryBuild('archery_range', free, home);
    else if (ageIndex(me.age) >= 1 && buildingCount('stable') < 2) tryBuild('stable', free, home);
  }
  // Starts the next age-up once there are enough villagers; in the Stone Age, short of resources, it saves for it.
  function advanceAge(vills, roundId) {
    bot.saving = false;
    if (me.ageUp || ageIndex(me.age) >= AGES.length - 1) return;
    if (vills.length < (roundId === 'wonder' ? 5 : Math.min(9, settings.villagers * 0.5))) return;
    const problem = ageUpProblem(game, pid);
    if (!problem) cmd({ type: 'age' });
    else if (problem === 'resources' && ageIndex(me.age) === 0) bot.saving = true;
  }
  // From Bronze on, build what the current era's gate needs (e.g. the Temple in Bronze, the Academy and Siege Workshop in
  // Iron); buildingCount() includes foundations, so no duplicates. The Wonder round stays in Bronze and saves for its Wonder.
  function buildGateBuildings(free, home, roundId) {
    if (ageIndex(me.age) < ageIndex('iron') && !(me.age === 'bronze' && roundId !== 'wonder')) return;
    const required = ageBuildings(me.age), missing = required.filter(type => buildingCount(type) < 1);
    if (!missing.length || required.length - missing.length >= ageUpNeed(me.age)) return;
    tryBuild(missing[0], free, home, Math.min(3, Math.floor(free.length / 4) || 1));
  }
  function buildEraBuildings(tc, free, home, roundId) {
    if (ageIndex(me.age) >= 1) {
      if (buildingCount('archery_range') < 1) tryBuild('archery_range', free, home);
      if (buildingCount('stable') < 1) tryBuild('stable', free, home);
      // The Market (Woodworking, Gold Mining) waits until the Bronze age-up is paid for, so it never slows that age-up.
      if (buildingCount('market') < 1 && (me.ageUp || ageIndex(me.age) >= 2)) tryBuild('market', free, home);
    }
    if (ageIndex(me.age) >= 2 && buildingCount('government_center') < 1 && roundId !== 'wonder') {
      tryBuild('government_center', free, home);
    }
    // Towers near the Town Center (tryBuild refuses before the Tool Age). buildingCount() includes foundations, so a lost
    // tower is rebuilt and a slow one is not doubled. After the age-up and the era's buildings above, and never out of
    // the next age-up.
    if (tc && buildingCount('tower') < settings.towers && leavesAgeUp(BUILDINGS.tower.cost)) tryBuild('tower', free, home);
    if (tc) wallTowers(tc, free);
  }
  // Research upgrades, economy first, then military (canPay respects the Wonder reserve).
  function research(done) {
    for (const building of done) {
      if (building.research) continue;
      for (const techId of RESEARCH_PREF) {
        if (!canResearch(techId, building, done)) continue;
        if (cmd({ type: 'research', buildingId: building.id, tech: techId })) break;
      }
    }
  }
  function canResearch(techId, building, done) {
    const tech = TECHS[techId];
    if (tech.building !== building.type || me.techs.has(techId) || ageIndex(me.age) < ageIndex(tech.age)) return false;
    if (tech.requires && !me.techs.has(tech.requires)) return false;
    if (done.some(b => b.research && b.research.tech === techId)) return false; // another building already on it
    return canPay(tech.cost) && !(settings.ageFirst && !leavesAgeUp(tech.cost));
  }
  function buildWonder(buildings, vills, free, home, roundId) {
    if (roundId !== 'wonder') return;
    if (ageIndex(me.age) >= 2 && buildingCount('wonder') < 1 && vills.length >= 8) {
      tryBuild('wonder', free, home, Math.min(10, free.length));
    }
    // Everyone helps build the Wonder.
    const wonder = buildings.find(b => b.type === 'wonder' && !b.constructed);
    if (!wonder) return;
    const helpers = free.filter(v => v.order.type !== 'build').slice(0, 12).map(v => v.id);
    if (helpers.length) cmd({ type: 'construct', ids: helpers, targetId: wonder.id });
  }
  // A resource piling up while the next age-up waits on another -> every 10 s move one of its gatherers to the shortfall
  // (gold first, then food, stone, wood), keeping a fifth of the villagers on wood. A pile is 400 over what the age-up
  // takes of it. Without this a bot sits on thousands of food in the late eras while the gold for the age-up never comes.
  function rebalanceForAgeUp(vills, home, done) {
    const nextAge = AGES[ageIndex(me.age) + 1], ageCost = nextAge && !me.ageUp ? AGE_COST[nextAge].cost : null;
    if (!ageCost || game.time - (bot.shiftedAt ?? -Infinity) < 200) return;
    const gatherersOf = kind => vills.filter(v => v.order.type === 'gather' && v.order.kind === kind);
    const short = SHORTFALL_ORDER.find(kind => me.res[kind] < ageCost[kind]);
    if (!short) return;
    const surplus = SURPLUS_ORDER.find(kind => kind !== short && me.res[kind] - (ageCost[kind] || 0) > 400
      && gatherersOf(kind).length > (kind === 'wood' ? vills.length * 0.2 : 0));
    if (!surplus) return;
    bot.shiftedAt = game.time;
    assign([gatherersOf(surplus)[0]], vills, home, done, short);
  }

  // ---- military production ----
  function trainArmy(army, ships, vills, done, enemies, roundId) {
    // Across the sea nobody can land before they have a Transport Ship: until ours is out, keep a small home guard and
    // put the rest into reaching the Dock's age (a full army would only wait on the beach).
    const roundCap = roundId === 'deathmatch' ? settings.dmArmy : settings.army;
    const armyCap = Math.min(roundCap, overSea && !ships.some(u => u.cargo) ? 6 : Infinity);
    const armyCount = army.length + queuedUnits(done, unit => UNITS[unit].cls !== 'civ' && !UNITS[unit].naval);
    if (bot.saving || armyCount >= armyCap) return;
    if (!(vills.length >= settings.villagers * 0.6 || roundId === 'deathmatch' || roundId === 'wonder')) return;
    const enemyClass = dominantEnemyClass(enemies); // counter-pick against what we can see
    for (const { building, unit } of productionPicks(done, enemyClass, roundId)) {
      if (shouldTrain(unit, army, done, armyCount, armyCap)) cmd({ type: 'train', buildingId: building.id, unit });
    }
  }
  // Each production building with room in its queue and its best unit to train. Buildings whose pick ranks higher go
  // first, so the best siege takes the two siege places (a Castle's Trebuchet before a Government Center's Catapult) and
  // the best unit gets the resources when they run short.
  function productionPicks(done, enemyClass, roundId) {
    const pref = PREF[enemyClass] || PREF.default, maxQueue = roundId === 'deathmatch' ? 4 : 2;
    return done.filter(b => b.type !== 'town_center' && b.type !== 'dock' && b.queue.length < maxQueue)
      .map(b => ({ building: b, unit: bestUnit(BUILDINGS[b.type].trains || [], enemyClass) }))
      .filter(pick => pick.unit)
      .sort((a, c) => pref.indexOf(a.unit) - pref.indexOf(c.unit));
  }
  function shouldTrain(unit, army, done, armyCount, armyCap) {
    const spec = UNITS[unit];
    if (!canPay(spec.cost) || me.pop >= me.popCap) return false;
    if (settings.ageFirst && armyCount >= armyCap / 2 && !leavesAgeUp(spec.cost)) return false;
    // A pair of scouts is plenty, and so are two siege units.
    if (unit === 'scout' && army.filter(a => a.type === 'scout').length + queuedOfType(done, 'scout') >= 2) return false;
    if (spec.cls === 'siege'
      && army.filter(a => a.cls === 'siege').length + queuedUnits(done, type => UNITS[type].cls === 'siege') >= 2) return false;
    return true;
  }
  function dominantEnemyClass(enemies) {
    const counts = {};
    for (const e of enemies) {
      if (e.kind === 'unit' && e.cls && e.cls !== 'civ' && !e.naval) counts[e.cls] = (counts[e.cls] || 0) + 1;
    }
    let best = null, bestCount = 0;
    for (const cls in counts) if (counts[cls] > bestCount) { bestCount = counts[cls]; best = cls; }
    return best;
  }
  function bestUnit(trains, enemyClass) {
    const pref = PREF[enemyClass] || PREF.default;
    const known = pref.filter(unit => trains.includes(unit) && ageIndex(UNITS[unit].age) <= ageIndex(me.age));
    if (!known.length) return null;
    const affordable = known.filter(unit => canPay(UNITS[unit].cost)); // prefer the best unit we can actually pay for right now
    const choices = affordable.length ? affordable : known; // none affordable: the caller's canPay check skips this building
    const siege = choices.find(unit => SIEGE.includes(unit));
    if (siege && game.time % 3 === 0) return siege;
    return choices.find(unit => !SIEGE.includes(unit)) || siege;
  }

  // ---- the navy: a Dock in the home bay, Fishing Ships, and a small fleet that patrols to the enemy's bay ----
  // Dock spots, nearest home first: every 3x3 block of deep water against the shore, beside ground we can walk to from our
  // start, on our side of the map and within 30 tiles of it. Fixed terrain, so worked out once; canPlace is checked when used.
  let dockSpots = null;
  const isWater = (x, y) => map.tiles[y * mapSize + x] === WATER;
  const isReachable = (x, y) => !!reach[y * mapSize + x];
  function findDockSpots() {
    const own = map.starts[pid], spots = [];
    for (let y = 1; y < mapSize - 4; y++) for (let x = 1; x < mapSize - 4; x++) {
      const centre = { x: x + 1.5, y: y + 1.5 }, d = dist(centre, own);
      if (d > 30 || d >= dist(centre, enemyStart)) continue;
      if (isWaterBlock(x, y) && isShore(x, y)) spots.push({ x, y, d });
    }
    return spots.sort((a, b) => a.d - b.d);
  }
  function isWaterBlock(x, y) {
    for (let j = y; j < y + 3; j++) for (let i = x; i < x + 3; i++) if (!isWater(i, j)) return false;
    return true;
  }
  // True when the tiles touching the 3x3 block at (x, y) include ground we can walk to and open water.
  function isShore(x, y) {
    let land = false, sea = false;
    for (let k = 0; k < 3; k++) {
      land ||= isReachable(x + k, y - 1) || isReachable(x + k, y + 3) || isReachable(x - 1, y + k) || isReachable(x + 3, y + k);
      sea ||= isWater(x + k, y - 1) || isWater(x + k, y + 3) || isWater(x - 1, y + k) || isWater(x + 3, y + k);
    }
    return land && sea;
  }
  function navy(ships, done, buildings, free, enemies, home, roundId, army) {
    if (ageIndex(me.age) < ageIndex(BUILDINGS.dock.age) || roundId === 'wonder') return; // the Wonder round saves for its Wonder
    const docks = done.filter(b => b.type === 'dock');
    if (!buildings.some(b => b.type === 'dock')) buildDock(free);
    if (!docks.length) return;
    const dock = docks[0];
    const fishers = ships.filter(u => u.type === 'fishing_ship'), fleet = ships.filter(u => u.cls === 'ship');
    const transports = ships.filter(u => u.cargo);
    // Transport Ships, first in the Dock's queue, when there is somewhere to go that soldiers can't walk to.
    const relicsAcross = roundId === 'relics' && [...game.relics.values()].some(r => massOf(r) !== homeMass);
    const needFerries = overSea || relicsAcross;
    if (needFerries && transports.length + queuedOfType(done, 'transport_ship') < settings.transports) {
      trainAtDock(dock, 'transport_ship');
    }
    ferryWork(transports, army, home, roundId);
    fish(dock, done, fishers);
    trainWarships(dock, done, fleet, transports, enemies, needFerries);
    commandFleet(dock, fleet, enemies);
  }
  // Trains `unit` at the Dock when its queue has room and we can pay and house it.
  function trainAtDock(dock, unit) {
    if (dock.queue.length >= 2 || ageIndex(me.age) < ageIndex(UNITS[unit].age)) return;
    if (canPay(UNITS[unit].cost) && me.pop < me.popCap) cmd({ type: 'train', buildingId: dock.id, unit });
  }
  // Across the sea the Dock comes first; otherwise it waits for spare villagers and never comes out of the next age-up.
  function buildDock(free) {
    const cost = BUILDINGS.dock.cost;
    if (!(overSea || (!bot.saving && free.length >= 6 && leavesAgeUp(cost))) || !canPay(cost)) return;
    dockSpots ??= findDockSpots();
    const spot = dockSpots.find(p => canPlace(game, pid, 'dock', p.x, p.y));
    const builder = spot && nearestFirst(free.filter(u => u.order.type !== 'repair'), spot)[0];
    if (builder) cmd({ type: 'build', ids: [builder.id], building: 'dock', x: spot.x, y: spot.y });
    else if (!spot && dockSpots.length && game.time - (bot.dockScout ?? -Infinity) > 1200) scoutBay(free);
  }
  // The bay is still unexplored: walk a villager over.
  function scoutBay(free) {
    const bay = dockSpots[0], scout = nearestFirst(free, bay)[0];
    if (!scout || game.players[pid].explored[(bay.y + 1) * mapSize + bay.x + 1]) return;
    bot.dockScout = game.time;
    cmd({ type: 'move', ids: [scout.id], x: bay.x + 1.5, y: bay.y + 1.5 });
  }
  // Fishing Ships: train up to `fishers`, and send idle ones to the nearest fish we know of.
  function fish(dock, done, fishers) {
    const shoals = game.knownResources(pid).filter(r => r.type === 'fish' && r.amount > 0);
    if (ageIndex(me.age) >= ageIndex(UNITS.fishing_ship.age) && shoals.length
      && fishers.length + queuedOfType(done, 'fishing_ship') < settings.fishers) trainAtDock(dock, 'fishing_ship');
    for (const ship of fishers) {
      if (ship.order.type !== 'idle') continue;
      const shoal = nearestFirst(shoals, ship)[0];
      if (shoal) cmd({ type: 'gather', ids: [ship.id], resourceId: shoal.id });
    }
  }
  // Warships: the newest we can build, up to `fleet` (two more once enemy ships show up), never out of the next age-up,
  // and only once the ferries we need are out.
  function trainWarships(dock, done, fleet, transports, enemies, needFerries) {
    const enemyShips = enemies.filter(e => e.kind === 'unit' && e.naval), want = settings.fleet + (enemyShips.length ? 2 : 0);
    const newest = SHIPS.find(type => ageIndex(UNITS[type].age) <= ageIndex(me.age));
    if (!newest || bot.saving || transports.length < (needFerries ? settings.transports : 0)) return;
    if (fleet.length + SHIPS.reduce((sum, type) => sum + queuedOfType(done, type), 0) >= want || dock.queue.length >= 2) return;
    const cost = UNITS[newest].cost;
    if (canPay(cost) && (!settings.ageFirst || leavesAgeUp(cost)) && me.pop < me.popCap) {
      cmd({ type: 'train', buildingId: dock.id, unit: newest });
    }
  }
  // Idle warships take the nearest target they can reach (enemy ships first), else, while a land wave is on, sail to the
  // enemy's bay (the mirror of our Dock) and back to our Dock in turn.
  function commandFleet(dock, fleet, enemies) {
    const targets = enemies.filter(e => (e.kind === 'unit' || e.constructed) && fleet.length && canHit(game, fleet[0], e));
    for (const ship of fleet) {
      if (ship.order.type !== 'idle') continue;
      const target = nearestFirst(targets.filter(e => e.naval), ship)[0] || nearestFirst(targets, ship)[0];
      if (target && dist(target, ship) < 30) { cmd({ type: 'attack', ids: [ship.id], targetId: target.id }); continue; }
      if (bot.waveActive) patrol(ship, dock);
    }
  }
  // Ship id -> the leg (0 to the enemy's bay, 1 home) it is on, and the leg it was last sent on.
  const fleetLeg = new Map(), sentLeg = new Map();
  function patrol(ship, dock) {
    const centre = centerOf(dock);
    const legs = [nearestOpen(game, mapSize - centre.x, mapSize - centre.y, true), nearestOpen(game, centre.x, centre.y, true)];
    const leg = fleetLeg.get(ship.id) ?? 0, to = legs[leg];
    if (!to) return;
    // There (or stuck short of it): turn round.
    const nextLeg = dist(ship, to) < 5 || sentLeg.get(ship.id) === leg ? 1 - leg : leg;
    fleetLeg.set(ship.id, nextLeg);
    const next = legs[nextLeg];
    if (cmd({ type: 'move', ids: [ship.id], x: next.x, y: next.y })) sentLeg.set(ship.id, nextLeg);
  }

  // Ferries. Each Transport Ship takes one job at a time: bring relic carriers stranded on another island home; take a
  // squad to an island with loose relics nobody of ours is on; or, while a land wave is on and the enemy is across the
  // sea, take the soldiers waiting at home to the enemy's shore. A job loads (the passengers board; the transport comes to
  // the shore nearest them), sails (unloads at the shore nearest the destination) and ends once the hold is empty. It is
  // dropped if nobody ends up aboard, and a hold that won't unload where it was sent is unloaded at home.
  // Transport id -> its job; the ids of the units in a job (orderArmy leaves them be).
  const ferry = bot.ferry = new Map(), ferried = new Set();
  function ferryWork(transports, army, home, roundId) {
    for (const id of ferry.keys()) if (!transports.some(t => t.id === id)) ferry.delete(id);
    ferried.clear();
    for (const job of ferry.values()) for (const id of job.ids) ferried.add(id);
    for (const transport of transports) {
      const job = ferry.get(transport.id);
      if (!job && transport.cargo.length) takeStrays(transport, home);
      else if (!job) startFerryJob(transport, army, home, roundId);
      else if (job.stage === 'load') loadFerry(transport, job);
      else sailFerry(transport, job, home);
    }
  }
  // Passengers with no job (a stray who boarded late): take them where the soldiers are going.
  function takeStrays(transport, home) {
    const dest = bot.waveActive && overSea ? { x: enemyStart.x, y: enemyStart.y } : { x: home.x, y: home.y };
    const job = { stage: 'sail', ids: [...transport.cargo], dest, since: game.time, tries: 0 };
    ferry.set(transport.id, job);
    cmd({ type: 'unload', transportId: transport.id, x: job.dest.x, y: job.dest.y });
  }
  function startFerryJob(transport, army, home, roundId) {
    const plan = planFerryJob(transport, army, home, roundId);
    if (!plan?.units.length) return;
    const units = plan.units.slice(0, UNITS.transport_ship.carries - transport.cargo.length);
    const job = { stage: 'load', ids: units.map(u => u.id), dest: { x: plan.dest.x, y: plan.dest.y }, relic: plan.relic,
      wave: plan.wave, since: game.time, tries: 0 };
    ferry.set(transport.id, job);
    for (const id of job.ids) ferried.add(id);
    cmd({ type: 'board', ids: job.ids, transportId: transport.id });
  }
  // Who an idle transport should carry where: relic carriers home, else a squad to a loose relic across the sea, else
  // (during a wave) the soldiers waiting at home to the enemy. Null when there is nothing to do.
  function planFerryJob(transport, army, home, roundId) {
    const capacity = UNITS.transport_ship.carries;
    const free = army.filter(u => !ferried.has(u.id) && u.order.type === 'idle');
    const carriers = free.filter(u => u.relic !== null && massOf(u) !== homeMass);
    const loose = roundId === 'relics' && looseRelicAcross(army);
    let waiting = free.filter(u => u.relic === null && massOf(u) === homeMass);
    if (roundId === 'kingdoms') {
      // Inherited armies can be on any conquered island. Pick one shore at a time so passengers don't call
      // their transport back and forth between different islands while it loads.
      const stranded = free.filter(u => u.relic === null && massOf(u) !== enemyMass);
      const pickup = nearestFirst(stranded, transport)[0];
      waiting = pickup ? stranded.filter(u => sameLand(u, pickup)) : [];
    }
    if (carriers.length) return { units: carriers.slice(0, capacity), dest: home, relic: null, wave: false };
    if (loose && waiting.length) {
      const squad = nearestFirst(waiting.filter(u => u.cls !== 'siege'), transport).slice(0, Math.min(capacity, 5));
      return { units: squad, dest: loose, relic: loose.id, wave: false };
    }
    if (bot.waveActive && overSea && waiting.length >= Math.min(4, capacity)) {
      return { units: nearestFirst(waiting, transport).slice(0, capacity), dest: enemyStart, relic: null, wave: true };
    }
    return null;
  }
  // A loose relic on another land mass with no free-handed soldier of ours on it and no ferry job already going for it.
  function looseRelicAcross(army) {
    return [...game.relics.values()].find(r => r.holder === null && r.stored === null && massOf(r) !== homeMass
      && !army.some(u => sameLand(u, r) && u.relic === null) && ![...ferry.values()].some(job => job.relic === r.id));
  }
  function loadFerry(transport, job) {
    const alive = job.ids.map(id => game.entities.get(id)).filter(u => u && !u.dead);
    const aboard = alive.filter(u => u.aboard === transport.id);
    const coming = alive.filter(u => !u.aboard && u.order.type === 'board' && u.order.target === transport.id);
    const tookTooLong = game.time - job.since > 900;
    if (aboard.length && ((!coming.length && !convoyStillLoading(transport, job)) || tookTooLong)) {
      setSail(transport, job, aboard, coming);
    } else if (!coming.length || game.time - job.since > 2400) ferry.delete(transport.id);
  }
  // A wave sails as one convoy: a loaded transport waits for the others still taking on soldiers.
  function convoyStillLoading(transport, job) {
    if (!job.wave) return false;
    for (const [id, other] of ferry) {
      if (id !== transport.id && other.wave && other.stage === 'load' && other.ids.some(isBoarding)) return true;
    }
    return false;
  }
  const isBoarding = id => {
    const unit = game.entities.get(id);
    return unit && !unit.dead && !unit.aboard && unit.order.type === 'board';
  };
  // Everyone who is coming is aboard (or they took too long): sail; the late ones stay behind for the next trip.
  function setSail(transport, job, aboard, coming) {
    job.ids = aboard.map(u => u.id);
    job.stage = 'sail';
    job.since = game.time;
    cmd({ type: 'unload', transportId: transport.id, x: job.dest.x, y: job.dest.y });
    for (const u of coming) cmd({ type: 'move', ids: [u.id], x: u.x, y: u.y });
  }
  function sailFerry(transport, job, home) {
    if (!transport.cargo.length) { ferry.delete(transport.id); return; } // all ashore
    if (transport.order.type !== 'idle') return;
    // The unload stopped short: try again, then bring them home.
    if (++job.tries > 3) job.dest = { x: home.x, y: home.y };
    cmd({ type: 'unload', transportId: transport.id, x: job.dest.x, y: job.dest.y });
  }

  // ---- gathering ----
  // Distance from `point` to the nearest finished building that takes `kind` (Infinity when there is none).
  function dropsiteDistance(kind, point, done) {
    let best = Infinity;
    for (const building of done) {
      const drops = BUILDINGS[building.type].drops;
      if (drops && drops.includes(kind)) best = Math.min(best, distPoint(point.x, point.y, building));
    }
    return best;
  }
  // Top-left of the first 2x2 Mine spot on an ore patch of this kind, trying patches nearest `home` first. Only patches
  // in our own half (nearer our start than the enemy's), and only spots with a tile on or around them we can walk to:
  // a foundation nobody can reach would block every later Mine of that kind.
  function mineSpot(kind, home) {
    const own = map.starts[pid];
    const patches = [...game.patches.values()].filter(p => p.kind === kind && p.reserve > 0)
      .map(patch => ({ patch, centre: patchCentre(patch) }))
      .filter(({ centre }) => dist(centre, own) < dist(centre, enemyStart))
      .map(({ patch, centre }) => ({ patch, distance: dist(centre, home) }))
      .sort((a, b) => a.distance - b.distance);
    for (const { patch } of patches) {
      for (const i of patch.tiles) {
        const x = i % mapSize, y = (i / mapSize) | 0;
        if (touchesReachable(x, y) && canPlace(game, pid, 'mine', x, y)) return { x, y };
      }
    }
    return null;
  }
  function patchCentre(patch) {
    const count = patch.tiles.length;
    let x = 0, y = 0;
    for (const i of patch.tiles) {
      x += (i % mapSize + 0.5) / count;
      y += (((i / mapSize) | 0) + 0.5) / count;
    }
    return { x, y };
  }
  // True when a 2x2 spot at (x, y) or a tile round it is ground we can walk to.
  function touchesReachable(x, y) {
    for (let j = y - 1; j <= y + 2; j++) for (let i = x - 1; i <= x + 2; i++) {
      if (i >= 0 && j >= 0 && i < mapSize && j < mapSize && reach[j * mapSize + i]) return true;
    }
    return false;
  }
  // Sends idle villagers to work. force: the resource kind to send them to instead of the one furthest below its share.
  function assign(idle, vills, home, done, force) {
    const gatherers = { food: 0, wood: 0, gold: 0, stone: 0 };
    for (const v of vills) if (v.order.type === 'gather') gatherers[v.order.kind]++;
    const known = game.knownResources(pid).filter(r => sameLand(r, home)); // nothing across the sea
    const shares = vills.length < 12 || ageIndex(me.age) === 0 ? EARLY_SHARE : SHARE;
    const total = vills.length || 1;
    for (const villager of idle) {
      const kind = force || neediestKind(gatherers, shares, total);
      putToWork(villager, kind, gatherers, known, vills, home, done);
    }
  }
  // The resource kind furthest below its share of the villagers (no gold or stone in Death Match).
  function neediestKind(gatherers, shares, total) {
    let kind = 'wood', bestDeficit = -Infinity;
    for (const k of RESOURCES) {
      if (game.rules && game.rules.id === 'deathmatch' && (k === 'gold' || k === 'stone')) continue;
      const deficit = shares[k] * total - gatherers[k];
      if (deficit > bestDeficit) { bestDeficit = deficit; kind = k; }
    }
    return kind;
  }
  function putToWork(villager, kind, gatherers, known, vills, home, done) {
    let target = closestResource(kind, villager, known, done);
    if (kind === 'food' && (!target || dist(target, home) > 12)) { // prefer farms once berries are far away
      const farms = done.filter(b => b.gatherType === 'food' && b.amount > 0);
      const nearestFarm = nearestFirst(farms, villager)[0];
      if (nearestFarm && farms.length * 2 > gatherers.food) target = nearestFarm;
      else if (me.res.wood >= 60 && tryBuild('farm', [villager], home)) { gatherers.food++; return; }
    }
    if ((kind === 'gold' || kind === 'stone') && (!target || dist(target, home) > 16)) { // piles gone or far: dig a Mine
      const mines = done.filter(b => b.type === 'mine' && b.gatherType === kind && b.amount > 0);
      if (mines.length) target = leastWorkedMine(mines, vills);
      else if (startMine(villager, kind, home)) { gatherers[kind]++; return; }
    }
    if (!target) { exploreFor(villager, kind, gatherers, home); return; }
    if (buildDropsiteBy(villager, kind, target, done)) return;
    if (cmd({ type: 'gather', ids: [villager.id], resourceId: target.id })) gatherers[kind]++;
  }
  // The closest resource of this kind we know of, counting the trip on to its dropsite (capped at 25 tiles) half again.
  function closestResource(kind, villager, known, done) {
    let best = null, bestScore = Infinity;
    for (const resource of known) {
      if (RES_KIND[resource.type] === kind && resource.type !== 'fish' && resource.amount > 0) {
        const score = dist(resource, villager) + 1.5 * Math.min(dropsiteDistance(kind, resource, done), 25);
        if (score < bestScore) { bestScore = score; best = resource; }
      }
    }
    return best;
  }
  // Spread out: the first Mine with fewer than 4 gatherers, else the least worked.
  function leastWorkedMine(mines, vills) {
    const load = m => vills.filter(u => u.order.type === 'gather' && u.order.res === m.id).length;
    return mines.find(m => load(m) < 4) || mines.reduce((a, b) => load(b) < load(a) ? b : a);
  }
  // A new Mine of this kind, when the age allows one, none is already going up and we can pay for it.
  function startMine(villager, kind, home) {
    if (ageIndex(me.age) < ageIndex(BUILDINGS.mine.age)) return false;
    if (ownEntities('buildings').some(b => b.type === 'mine' && !b.constructed && b.gatherType === kind)) return false;
    if (!canPay(BUILDINGS.mine.cost)) return false;
    const spot = mineSpot(kind, home);
    return !!spot && cmd({ type: 'build', ids: [villager.id], building: 'mine', x: spot.x, y: spot.y });
  }
  // None of this kind explored yet (trees can start just outside the explored radius): walk out and look, each trip a
  // step further round a widening spiral.
  function exploreFor(villager, kind, gatherers, home) {
    if (kind !== 'wood') gatherers[kind] = 99; // the rest of this batch picks another kind
    const angle = bot.scout * 2.4, radius = Math.min(30, 12 + 2 * Math.floor(bot.scout++ / 6));
    const clamp = v => Math.min(mapSize - 1, Math.max(0, v));
    const goal = {
      x: Math.round(clamp(home.x + radius * Math.cos(angle))),
      y: Math.round(clamp(home.y + radius * Math.sin(angle))),
    };
    const waypoint = nearestReachable(map, reach, goal);
    cmd({ type: 'move', ids: [villager.id], x: waypoint.x + 0.5, y: waypoint.y + 0.5 });
  }
  // Far from any dropsite: build one by the resource first (true when the villager went to build it).
  function buildDropsiteBy(villager, kind, target, done) {
    if (!((target.kind === 'resource' || target.type === 'mine') && dropsiteDistance(kind, target, done) > 10)) return false;
    const type = kind === 'food' ? 'granary' : 'storage_pit', spot = spotNear(type, target, false);
    if (!spot || ownEntities('buildings').some(b => !b.constructed && b.type === type)) return false;
    if (!canAfford(me, BUILDINGS[type].cost)) return false;
    return cmd({ type: 'build', ids: [villager.id], building: type, x: spot.x, y: spot.y });
  }

  // ---- military orders ----
  function orderArmy(army, enemies, home, roundId) {
    if (!army.length) return;
    const idle = army.filter(u => u.order.type === 'idle'); // taken before the relic runners get their orders
    if (roundId === 'relics') sendRelicRunners(army);
    if (defendHome(idle, enemies, home)) return;
    if (!updateWave(army, roundId)) return;
    const centre = {
      x: army.reduce((sum, u) => sum + u.x, 0) / army.length,
      y: army.reduce((sum, u) => sum + u.y, 0) / army.length,
    };
    const targetFor = waveTargets(enemies, roundId, centre);
    const onTower = siegeOnTowers(army, enemies);
    let advanced = false;
    for (const soldier of idle) {
      if (soldier.relic !== null || onTower.has(soldier.id) || ferried.has(soldier.id)) continue;
      const target = targetFor(soldier);
      if (target) cmd({ type: 'attack', ids: [soldier.id], targetId: target.id });
      else if (massOf(soldier) === enemyMass) advanced = sweepOn(soldier, advanced);
      // else nothing to fight on this land: wait for a transport
    }
  }
  // Relics: send the nearest free soldier to each loose relic (idle or mid-wave), one per relic.
  function sendRelicRunners(army) {
    const assigned = new Set(army.filter(a => a.order.type === 'relic').map(a => a.order.relic));
    for (const relic of game.relics.values()) {
      if (relic.holder !== null || relic.stored !== null || assigned.has(relic.id)) continue;
      const candidates = army.filter(a => a.relic === null && a.cls !== 'siege' && a.order.type !== 'relic'
        && sameLand(a, relic));
      const runner = nearestFirst(candidates, relic)[0];
      if (runner && dist(runner, relic) < 40) {
        cmd({ type: 'relic', ids: [runner.id], relicId: relic.id });
        assigned.add(relic.id);
      }
    }
  }
  // Enemy soldiers within 14 tiles of home on our land (ships are the towers' and the fleet's): idle soldiers on the
  // nearest one's land attack it. True when there was a threat.
  function defendHome(idle, enemies, home) {
    const threats = enemies.filter(e => e.kind === 'unit' && e.cls !== 'civ' && !e.naval
      && dist(e, home) < 14 && sameLand(e, home));
    if (!threats.length) return false;
    const threat = nearestFirst(threats, home)[0];
    for (const soldier of idle) if (sameLand(soldier, threat)) cmd({ type: 'attack', ids: [soldier.id], targetId: threat.id });
    return true;
  }
  // Starts a wave once the army is big enough (and the round's time and our age allow it), ends it when the army is
  // nearly gone. Returns whether a wave is on.
  function updateWave(army, roundId) {
    const rush = roundId === 'wonder'; // contest the Wonder while it is being built
    // Death Match: whoever attacks piecemeal loses to defenders, so wait for a big army (bigger for harder bots)
    const needWave = rush ? 5 : roundId === 'deathmatch' ? settings.dmWave : settings.wave;
    const needTime = Math.max(settings.grace, rush ? 3600 : roundId === 'deathmatch' ? 9000 : settings.attackAt);
    if (!bot.waveActive && game.time >= needTime && ageIndex(me.age) >= ageIndex(settings.attackAge) && army.length >= needWave) {
      bot.waveActive = true;
    }
    if (bot.waveActive && army.length + unitsAboard() < 3) bot.waveActive = false; // a wave at sea is still a wave
    return bot.waveActive;
  }
  function unitsAboard() {
    let count = 0;
    for (const unit of game.units.values()) if (unit.owner === pid && unit.aboard) count++;
    return count;
  }
  // The wave's target for a soldier, chosen among the enemies on its land mass (the King, Wonder or relic vault first,
  // then the soldier, building or anyone nearest the army's centre), worked out once per land mass.
  function waveTargets(enemies, roundId, centre) {
    const vaults = roundId === 'relics'
      ? new Set([...game.relics.values()].filter(r => r.stored !== null && game.relicOwner(r) === enemyPid).map(r => r.stored))
      : new Set();
    const targets = new Map();
    return unit => {
      const landMass = massOf(unit);
      if (!targets.has(landMass)) targets.set(landMass, waveTargetOn(landMass, enemies, roundId, vaults, centre));
      return targets.get(landMass);
    };
  }
  function waveTargetOn(landMass, enemies, roundId, vaults, centre) {
    const here = enemies.filter(e => massOf(e.kind === 'building' ? centerOf(e) : e) === landMass);
    const key = here.find(e => ((roundId === 'regicide' || roundId === 'kingdoms') && e.type === 'king')
      || (roundId === 'kingdoms' && e.type === 'castle' && e.king) || (roundId === 'wonder' && e.type === 'wonder')
      || vaults.has(e.id));
    return key || nearestFirst(here.filter(e => e.kind === 'unit' && e.cls !== 'civ' && !e.naval), centre)[0]
      || nearestFirst(here.filter(e => e.kind === 'building'), centre)[0]
      || nearestFirst(here.filter(e => e.kind === 'unit' && !e.naval), centre)[0];
  }
  // Siege goes for the defences first: a siege unit with no attack order of its own takes the finished enemy tower
  // nearest it on its land that we can see. Returns the ids of the siege units sent.
  function siegeOnTowers(army, enemies) {
    const towers = enemies.filter(e => e.type === 'tower' && e.constructed), onTower = new Set();
    if (!towers.length) return onTower;
    for (const unit of army) {
      if (unit.cls !== 'siege' || !freeToRetarget(unit.order)) continue;
      const near = towers.filter(e => sameLand(unit, centerOf(e)));
      if (!near.length) continue;
      const tower = near.reduce((best, e) => distPoint(unit.x, unit.y, e) < distPoint(unit.x, unit.y, best) ? e : best);
      if (cmd({ type: 'attack', ids: [unit.id], targetId: tower.id })) onTower.add(unit.id);
    }
    return onTower;
  }
  // Idle, on a sweep move, or only auto-aggro on something other than a tower. A commanded attack, a breach (an attack
  // with `resume`) and an attack already on a tower are kept.
  function freeToRetarget(order) {
    if (order.type === 'idle' || order.type === 'move') return true;
    if (!order.auto) return false;
    const attacked = order.type === 'attack' ? game.entities.get(order.target) : null;
    return attacked?.type !== 'tower';
  }
  // Sends a soldier to the current sweep waypoint. Returns whether the sweep has moved on a waypoint this think.
  function sweepOn(soldier, advanced) {
    let waypoint = sweep[bot.sweepIdx % sweep.length];
    // Idle short of the waypoint it was sent to means the move failed: go on to the next one rather than
    // re-sending it (each re-send costs a whole-map path search per unit). Skip at most one waypoint per think.
    if (dist(soldier, waypoint) < 4 || (sentTo.get(soldier.id) === bot.sweepIdx && !advanced)) {
      bot.sweepIdx++;
      advanced = true;
      waypoint = sweep[bot.sweepIdx % sweep.length];
    }
    if (cmd({ type: 'move', ids: [soldier.id], x: waypoint.x + 0.5, y: waypoint.y + 0.5 })) sentTo.set(soldier.id, bot.sweepIdx);
    return advanced;
  }
  return bot;
}
