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
export const popFullReason = p => p.popCap >= popLimit(p.age) ? 'pop limit' : 'pop cap';
export const canAfford = (p, cost) => RES.every(k => p.res[k] >= (cost[k] || 0));
// Repairs are paid bit by bit, so any of each resource the building costs is enough to go on.
export const canRepair = (p, type) => RES.every(k => !BUILDINGS[type].cost[k] || p.res[k] > 0);
const pay = (p, cost) => { for (const k of RES) p.res[k] -= cost[k] || 0; };
const ownUnits = (game, pid, ids) => (ids || []).map(i => game.entities.get(i)).filter(e => e && e.kind === 'unit' && e.owner === pid && !e.dead && !e.aboard); // passengers take no orders

// A build (or repair) given to a villager that is gathering, building or repairing keeps that job as `resume`, and takes it
// up again once the new building is done, gone or unreachable (orders.js doBuild / doRepair). Builds interrupting builds nest,
// newest first. Idle, moving or fighting villagers have nothing to go back to, so their order gets no `resume` key. A gather
// resumes heading for its resource, or still on its way to drop off a load.
function buildOrder(u, target, queue, type = 'build') {
  const order = queue ? { type, target, queue, fails: 0 } : { type, target, fails: 0 }, o = u.order;
  if (o.type === 'gather') order.resume = { ...o, phase: o.phase === 'drop' ? 'drop' : 'go', fails: 0 };
  else if (o.type === 'build' || o.type === 'repair') order.resume = o;
  return order;
}

export function canPlace(game, pid, type, x, y) {
  const def = BUILDINGS[type], n = game.map.size, p = game.players[pid];
  if (!Number.isInteger(x) || !Number.isInteger(y)) return false;
  if (x < 1 || y < 1 || x + def.size > n - 1 || y + def.size > n - 1) return false;
  // A Mine goes wholly on one patch that still holds ore, a Dock wholly on deep water; everything else only on plain land
  // (not water, shallows or ore).
  const pat = def.ore ? game.patchAt[y * n + x] : 0;
  if (def.ore && !(game.patches.get(pat)?.reserve > 0)) return false;
  for (let j = y; j < y + def.size; j++) for (let i = x; i < x + def.size; i++) {
    const tile = game.map.tiles[j * n + i];
    if ((def.ore ? game.patchAt[j * n + i] !== pat : tile !== (def.naval ? WATER : 0)) || game.occAt(i, j) || game.reserved.has(j * n + i) || !p.explored[j * n + i]) return false;
  }
  if (def.naval && !atShore(game, x, y, def.size)) return false;
  for (const r of game.relics.values()) if (r.holder === null && r.stored === null && r.x >= x && r.x < x + def.size && r.y >= y && r.y < y + def.size) return false;
  return true;
}

// A Dock's footprint at (x, y) touches the shore: a villager can stand beside it to build it, and a ship to be launched or
// land its catch. Of the tiles along its four sides (corners left out), one is free ground and one is free water.
function atShore(game, x, y, size) {
  const n = game.map.size, open = (i, j, naval) => passable(game.map.tiles[j * n + i], naval) && !game.occAt(i, j) && !game.reserved.has(j * n + i);
  let land = false, sea = false;
  for (let k = 0; k < size; k++) for (const [i, j] of [[x + k, y - 1], [x + k, y + size], [x - 1, y + k], [x + size, y + k]]) {
    land ||= open(i, j, false); sea ||= open(i, j, true);
  }
  return land && sea;
}

// Advancing out of `age` needs this many distinct finished buildings of that age (extras like the Farm and Wonder don't count).
export const ageBuildings = age => Object.entries(BUILDINGS).filter(([id, d]) => d.age === age && id !== 'town_center' && !d.extra).map(([id]) => id);
export const ageUpNeed = age => Math.min(2, ageBuildings(age).length);

export function ageUpProblem(game, pid) {
  const p = game.players[pid];
  if (p.ageUp) return 'already researching';
  const next = AGES[ageIndex(p.age) + 1]; if (!next) return 'max age';
  const owned = new Set(), avail = new Set(ageBuildings(p.age));
  let hasTC = false;
  for (const b of game.buildings.values()) if (b.owner === pid && b.constructed) { if (b.type === 'town_center') hasTC = true; if (avail.has(b.type)) owned.add(b.type); }
  if (!hasTC) return 'needs town center';
  if (owned.size < ageUpNeed(p.age)) return 'needs buildings';
  if (!canAfford(p, AGE_COST[next].cost)) return 'resources';
  return null;
}

export function execute(game, pid, cmd) {
  const p = game.players[pid];
  if (!p || game.result) return fail('no game');
  switch (cmd.type) {
    case 'move': {
      const us = ownUnits(game, pid, cmd.ids); if (!us.length) return fail('no units');
      if (!Number.isFinite(cmd.x) || !Number.isFinite(cmd.y)) return fail('bad target');
      // A group spreads out instead of piling onto one tile; soldiers and ships each form up on their own ground, and
      // ships sent onto land head for the nearest water.
      for (const group of [us.filter(u => !u.naval), us.filter(u => u.naval)]) {
        if (!group.length) continue;
        const at = group[0].naval ? nearestOpen(game, cmd.x, cmd.y, true) || cmd : cmd, slots = group.length > 1 ? formationSlots(game, group, at.x, at.y) : null;
        for (const u of group) { const s = slots ? slots.get(u.id) : at; u.order = { type: 'move', x: s.x, y: s.y, slack: 0 }; u.path = null; u.retry = 0; }
      }
      return OK;
    }
    case 'gather': { // villagers gather on land, Fishing Ships fish; each takes the orders for its own kind of resource
      const all = ownUnits(game, pid, cmd.ids).filter(u => u.type === 'villager' || UNITS[u.type].capacity), r = game.entities.get(cmd.resourceId);
      if (!all.length) return fail('no villagers');
      const ok = r && !r.dead && r.amount > 0 && (r.kind === 'resource' || (r.kind === 'building' && r.owner === pid && r.constructed && r.gatherType));
      if (!ok) return fail('bad resource');
      const us = all.filter(u => u.naval === (r.type === 'fish'));
      if (!us.length) return fail(r.type === 'fish' ? 'needs a fishing ship' : 'no villagers');
      const kind = r.gatherType || RES_KIND[r.type];
      for (const u of us) { u.order = { type: 'gather', res: r.id, kind, phase: 'go', fails: 0 }; u.path = null; u.retry = 0; if (u.carry.type !== kind) u.carry = { type: null, amount: 0 }; }
      return OK;
    }
    case 'build': {
      const def = BUILDINGS[cmd.building], us = ownUnits(game, pid, cmd.ids).filter(u => u.type === 'villager');
      if (!def) return fail('unknown building'); if (!us.length) return fail('no villagers');
      if (ageIndex(def.age) > ageIndex(p.age)) return fail('age');
      if (!canPlace(game, pid, cmd.building, cmd.x, cmd.y)) return fail('placement');
      if (!canAfford(p, def.cost)) return fail('resources');
      pay(p, def.cost);
      const b = game.addBuilding(cmd.building, pid, cmd.x, cmd.y, false);
      for (const u of us) { u.order = buildOrder(u, b.id); u.path = null; u.retry = 0; }
      return OK;
    }
    case 'wall': { // a line of wall foundations (tiles from lineTiles): each free tile is paid for and placed in order, blocked ones are skipped free
      const def = BUILDINGS.wall, us = ownUnits(game, pid, cmd.ids).filter(u => u.type === 'villager');
      if (!us.length) return fail('no villagers');
      if (ageIndex(def.age) > ageIndex(p.age)) return fail('age');
      const placed = []; let short = false;
      for (const t of Array.isArray(cmd.tiles) ? cmd.tiles : []) {
        if (!t || !canPlace(game, pid, 'wall', t.x, t.y)) continue;
        if (!canAfford(p, def.cost)) { short = true; break; } // out of stone: the rest of the line is not placed
        pay(p, def.cost); placed.push(game.addBuilding('wall', pid, t.x, t.y, false).id);
      }
      if (!placed.length) return fail(short ? 'resources' : 'placement'); // a free tile it could not pay for, or nowhere free
      const [target, ...rest] = placed;
      for (const u of us) { u.order = buildOrder(u, target, rest.slice()); u.path = null; u.retry = 0; }
      return { ok: true, placed: placed.length };
    }
    case 'delete': { // knock down one of your own buildings: no refund; anything in its training queue is lost
      const b = game.entities.get(cmd.id);
      if (!b || b.dead || b.kind !== 'building' || b.owner !== pid) return fail('bad target');
      game.remove(b); game.recount();
      return OK;
    }
    case 'resign': game.result = { winner: 1 - pid, reason: 'resigned' }; return OK;
    case 'construct': {
      const us = ownUnits(game, pid, cmd.ids).filter(u => u.type === 'villager'), b = game.entities.get(cmd.targetId);
      if (!us.length) return fail('no villagers');
      if (!b || b.dead || b.kind !== 'building' || b.owner !== pid || b.constructed) return fail('nothing to build');
      for (const u of us) { if (u.order.type === 'build' && u.order.target === b.id) continue; u.order = buildOrder(u, b.id); u.path = null; u.retry = 0; }
      return OK;
    }
    case 'repair': { // put a finished, damaged building's HP back; paid as it goes (orders.js doRepair, game.js repairBuilding)
      const us = ownUnits(game, pid, cmd.ids).filter(u => u.type === 'villager'), b = game.entities.get(cmd.targetId);
      if (!us.length) return fail('no villagers');
      if (!b || b.dead || b.kind !== 'building' || b.owner !== pid || !b.constructed || b.hp >= b.maxHp) return fail('nothing to repair');
      if (!canRepair(p, b.type)) return fail('resources');
      for (const u of us) { if (u.order.type === 'repair' && u.order.target === b.id) continue; u.order = buildOrder(u, b.id, null, 'repair'); u.path = null; u.retry = 0; }
      return OK;
    }
    case 'train': {
      const b = game.entities.get(cmd.buildingId), def = UNITS[cmd.unit];
      if (!b || b.kind !== 'building' || b.owner !== pid || !b.constructed || !def) return fail('bad building');
      if (!(BUILDINGS[b.type].trains || []).includes(cmd.unit)) return fail('cannot train');
      if (ageIndex(def.age) > ageIndex(p.age)) return fail('age');
      if (b.queue.length >= 5) return fail('queue full');
      if (p.pop >= p.popCap) return fail(popFullReason(p));
      if (!canAfford(p, def.cost)) return fail('resources');
      pay(p, def.cost); b.queue.push({ unit: cmd.unit, remaining: secs(def.trainTime) }); p.pop++;
      return OK;
    }
    case 'research': {
      const b = game.entities.get(cmd.buildingId), t = TECHS[cmd.tech];
      if (!b || b.kind !== 'building' || b.owner !== pid || !b.constructed || !t) return fail('bad building');
      if (t.building !== b.type) return fail('wrong building');
      if (ageIndex(p.age) < ageIndex(t.age)) return fail('age');
      if (p.techs.has(cmd.tech)) return fail('already researched');
      if (t.requires && !p.techs.has(t.requires)) return fail('requires');
      if (b.research) return fail('busy');
      for (const bb of game.buildings.values()) if (bb.owner === pid && bb.research && bb.research.tech === cmd.tech) return fail('already researching');
      if (!canAfford(p, t.cost)) return fail('resources');
      pay(p, t.cost); b.research = { tech: cmd.tech, remaining: secs(t.time) };
      return OK;
    }
    case 'age': {
      const why = ageUpProblem(game, pid); if (why) return fail(why);
      const next = AGES[ageIndex(p.age) + 1], info = AGE_COST[next];
      pay(p, info.cost); p.ageUp = { to: next, remaining: secs(info.time) };
      return OK;
    }
    case 'attack': {
      const us = ownUnits(game, pid, cmd.ids).filter(u => u.atk > 0), t = game.entities.get(cmd.targetId); // a Fishing Ship has no attack
      if (!us.length) return fail('no units'); if (!t || t.dead || t.owner === pid || (t.kind !== 'unit' && t.kind !== 'building')) return fail('bad target');
      for (const u of us) { u.order = { type: 'attack', target: t.id, fails: 0 }; u.path = null; u.retry = 0; }
      return OK;
    }
    case 'board': { // land units walk to an own transport and go aboard; an idle transport sails to the shore nearest them
      const t = game.entities.get(cmd.transportId), us = ownUnits(game, pid, cmd.ids).filter(u => !u.naval);
      if (!t || t.dead || t.owner !== pid || !t.cargo || t.aboard) return fail('bad transport');
      if (!us.length) return fail('no units');
      if (t.cargo.length >= UNITS[t.type].carries) return fail('transport full');
      for (const u of us) { u.order = { type: 'board', target: t.id, fails: 0 }; u.path = null; u.retry = 0; }
      if (t.order.type === 'idle') {
        const c = us.reduce((a, u) => ({ x: a.x + u.x / us.length, y: a.y + u.y / us.length }), { x: 0, y: 0 }), l = landingNear(game, c.x, c.y, us[0]);
        if (l && Math.hypot(l.sea.x - t.x, l.sea.y - t.y) > 0.3) { t.order = { type: 'move', x: l.sea.x, y: l.sea.y, slack: 0 }; t.path = null; t.retry = 0; }
      }
      return OK;
    }
    case 'unload': { // a transport lands at the shore nearest (x, y) (else nearest itself) and puts everyone ashore there
      const t = game.entities.get(cmd.transportId);
      if (!t || t.dead || t.owner !== pid || !t.cargo) return fail('bad transport');
      if (!t.cargo.length) return fail('empty');
      const at = Number.isFinite(cmd.x) && Number.isFinite(cmd.y) ? { x: cmd.x, y: cmd.y } : t;
      const ground = at !== t && passable(game.map.tiles[Math.floor(at.y) * game.map.size + Math.floor(at.x)], false);
      const l = (ground && landingNear(game, at.x, at.y, at)) || landingNear(game, at.x, at.y); // a shore they can walk on from to (x, y)
      if (!l) return fail('no shore');
      t.order = { type: 'unload', x: l.sea.x, y: l.sea.y, sx: l.shore.x, sy: l.shore.y, to: ground ? { x: at.x, y: at.y } : null, slack: 0 }; t.path = null; t.retry = 0;
      return OK;
    }
    case 'relic': {
      const us = ownUnits(game, pid, cmd.ids).filter(u => u.cls !== 'siege' && !u.naval && u.relic === null), r = game.relics.get(cmd.relicId);
      if (!us.length) return fail('no carriers'); if (!r || r.holder !== null || r.stored !== null) return fail('relic unavailable');
      const u = us[0]; u.order = { type: 'relic', relic: r.id, phase: 'go', fails: 0 }; u.path = null; u.retry = 0;
      return OK;
    }
  }
  return fail('unknown command');
}
