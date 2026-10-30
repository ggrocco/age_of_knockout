import { ageIndex } from '../data/ages.js';
import { findPath } from './path.js';
import { centerOf, distPoint } from './util.js';
import { updateVision } from './vision.js';

export const TERRITORY_REACH = 8;
export const isKingdoms = game => game.rules?.id === 'kingdoms';
export const sheltered = unit => !!unit.garrisonedIn;

export function setupKingdoms(game) {
  game.roundState = { kings: [], territory: null, events: [] };
  for (const player of game.players) {
    const tc = [...game.buildings.values()].find(b => b.owner === player.id && b.type === 'town_center');
    const spot = game.findSpawn(tc);
    game.roundState.kings.push(game.spawnUnit('king', player.id, spot.x, spot.y).id);
  }
  updateTerritory(game);
}

// Removal is the single entry point, including drowning and unattributed/debug removals.
export function kingRemoved(game, king, attacker) {
  if (!isKingdoms(game) || king.type !== 'king' || !game.roundState?.kings.includes(king.id)) return;
  const loser = game.players[king.owner];
  if (loser.defeated) return;
  const winner = attacker && game.players[attacker.owner];
  if (!winner || winner === loser || winner.defeated) return eliminateKingdom(game, loser.id);
  loser.defeated = true;
  loser.defeatedBy = winner.id;
  for (const kind of Object.keys(winner.res)) { winner.res[kind] += loser.res[kind]; loser.res[kind] = 0; }
  if (ageIndex(loser.age) > ageIndex(winner.age)) winner.age = loser.age;
  for (const tech of loser.techs) winner.techs.add(tech);
  // Keep the furthest pending age-up; for the same target retain the most progress.
  const advances = [winner.ageUp, loser.ageUp].filter(a => a && ageIndex(a.to) > ageIndex(winner.age));
  advances.sort((a, b) => ageIndex(b.to) - ageIndex(a.to) || a.remaining - b.remaining);
  winner.ageUp = advances[0] || null;
  loser.ageUp = null;
  for (let i = 0; i < winner.explored.length; i++) winner.explored[i] |= loser.explored[i];
  for (const entity of game.entities.values()) if (!entity.dead && entity.owner === loser.id) entity.owner = winner.id;
  game.refreshCivilization(winner.id);
  // All sides may have orders aimed at somebody who has just become friendly. Captured work orders remain valid.
  for (const unit of game.units.values()) {
    const order = unit.order, target = game.entities.get(order.target);
    if (order.type === 'attack' && target?.owner === unit.owner) {
      unit.order = { type: 'idle' }; unit.path = null;
    }
  }
  const researching = new Map();
  for (const b of game.buildings.values()) {
    if (b.owner !== winner.id || !b.research) continue;
    const tech = b.research.tech, previous = researching.get(tech);
    if (winner.techs.has(tech)) b.research = null;
    else if (!previous) researching.set(tech, b);
    else if (b.research.remaining < previous.research.remaining) { previous.research = null; researching.set(tech, b); }
    else b.research = null;
  }
  game.roundState.events.push({ time: game.time, loser: loser.id, winner: winner.id });
  game.recount();
  updateVision(game);
  updateTerritory(game);
}

export function eliminateKingdom(game, pid) {
  const player = game.players[pid];
  if (player.defeated) return;
  player.defeated = true;
  player.defeatedBy = null;
  player.ageUp = null;
  for (const entity of [...game.entities.values()]) if (entity.owner === pid) game.remove(entity);
  game.roundState.events.push({ time: game.time, loser: pid, winner: null });
  game.recount();
  updateTerritory(game);
}

export function releaseKing(game, castle) {
  if (!castle.king) return;
  const king = game.units.get(castle.king);
  castle.king = null;
  if (!king || king.dead) return;
  const spot = game.findSpawn(castle);
  king.garrisonedIn = null;
  king.x = spot.x; king.y = spot.y;
  king.order = { type: 'idle' }; king.path = null; king.retry = 0;
  king.shelterRetry = game.time + 1;
}

// Search at most once per six game seconds after a failed attempt. Reuse the successful path in orders.js.
export function updateShelters(game) {
  for (const id of game.roundState.kings) {
    const king = game.units.get(id);
    if (!king || king.aboard || sheltered(king) || king.shelterRetry > game.time) continue;
    const existing = game.buildings.get(king.order.target);
    if (king.order.type === 'shelter' && existing?.constructed && existing.owner === king.owner) continue;
    king.shelterRetry = game.time + 120;
    const castles = [...game.buildings.values()].filter(b => b.type === 'castle' && b.constructed && b.owner === king.owner);
    castles.sort((a, b) => distPoint(king.x, king.y, a) - distPoint(king.x, king.y, b) || a.id - b.id);
    for (const castle of castles) {
      const centre = centerOf(castle);
      const path = findPath(game.map, game.blocked, { x: Math.floor(king.x), y: Math.floor(king.y) },
        { x: Math.floor(centre.x), y: Math.floor(centre.y) }, (x, y) => distPoint(x + 0.5, y + 0.5, castle) <= 1);
      if (!path) continue;
      king.order = { type: 'shelter', target: castle.id };
      king.path = path.length ? path : null;
      king.retry = 0;
      break;
    }
  }
}

// One bounded flood per surviving team, only when completed footprints/ownership/terrain change.
export function updateTerritory(game) {
  const state = game.roundState, n = game.map.size;
  const buildings = [...game.buildings.values()].filter(b => b.constructed && !game.players[b.owner].defeated);
  const key = game.terrainVersion + ':' + buildings.map(b => `${b.id},${b.owner}`).join(';');
  if (state.territory?.key === key) return;
  const owners = new Int8Array(n * n).fill(-1), best = new Int16Array(n * n).fill(TERRITORY_REACH + 1);
  const counts = game.players.map(() => 0), dry = i => game.map.tiles[i] !== 1 && game.map.tiles[i] !== 4;
  for (const player of game.players) {
    if (player.defeated) continue;
    const distances = new Int16Array(n * n).fill(-1), queue = [];
    const seed = (x, y, d) => {
      const i = y * n + x;
      if (x < 0 || y < 0 || x >= n || y >= n || !dry(i) || distances[i] >= 0) return;
      distances[i] = d; queue.push(i);
    };
    const own = buildings.filter(b => b.owner === player.id);
    // All zero-distance sources precede coastal Dock sources, preserving breadth-first order.
    for (const b of own) for (let y = b.y; y < b.y + b.size; y++) for (let x = b.x; x < b.x + b.size; x++) seed(x, y, 0);
    for (const b of own) if (b.type === 'dock') for (let k = 0; k < b.size; k++) {
      seed(b.x - 1, b.y + k, 1); seed(b.x + b.size, b.y + k, 1);
      seed(b.x + k, b.y - 1, 1); seed(b.x + k, b.y + b.size, 1);
    }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head], d = distances[i], x = i % n, y = Math.floor(i / n);
      if (d < best[i]) { best[i] = d; owners[i] = player.id; }
      else if (d === best[i]) owners[i] = -1;
      if (d === TERRITORY_REACH) continue;
      seed(x - 1, y, d + 1); seed(x + 1, y, d + 1); seed(x, y - 1, d + 1); seed(x, y + 1, d + 1);
    }
  }
  let total = 0;
  for (let i = 0; i < owners.length; i++) { if (dry(i)) total++; if (owners[i] >= 0) counts[owners[i]]++; }
  state.territory = { owners, counts, total, key, version: (state.territory?.version ?? 0) + 1 };
}

export function checkKingdoms(game, scoreOf) {
  updateTerritory(game);
  const alive = game.players.filter(p => !p.defeated), territory = [...game.roundState.territory.counts];
  if (alive.length <= 1) return { winner: alive[0]?.id ?? null, reason: 'kingdom conquest', territory };
  if (game.time < game.capTicks) return null;
  const scores = game.players.map(p => scoreOf(game, p.id));
  const most = Math.max(...alive.map(p => territory[p.id]));
  let tied = alive.filter(p => territory[p.id] === most);
  const best = Math.max(...tied.map(p => scores[p.id]));
  tied = tied.filter(p => scores[p.id] === best);
  return { winner: tied.length === 1 ? tied[0].id : null, reason: 'territory', territory, scores };
}
