import { generateMap } from './map.js';
import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { defenceStats } from '../data/defences.js';
import { AGES } from '../data/ages.js';
import { TECHS, applyUnitEffect } from '../data/techs.js';
import { updateUnit } from './orders.js';
import { updateTower, refreshDefences } from './defence.js';
import { execute } from './commands.js';
import { updateVision } from './vision.js';
import { secs, rectOf, centerOf } from './util.js';

// A wall foundation (an unfinished wall) does not block movement: it only reserves its tile, and occupies it once finished.
const opensFoundation = type => BUILDINGS[type].defence === 'wall';

export function createGame({ seed = 1, rules = null, size = 64 } = {}) {
  const map = generateMap(seed, size), n = map.size, occ = new Int32Array(n * n), reserved = new Set();
  const game = {
    seed, map, rules, time: 0, result: null, nextId: 1,
    entities: new Map(), units: new Map(), buildings: new Map(), resources: new Map(), relics: new Map(),
    players: [0, 1].map(id => ({ id, res: { food: 200, wood: 200, gold: 100, stone: 100 }, age: 'stone', ageUp: null,
      explored: new Uint8Array(n * n), visible: new Uint8Array(n * n), kills: 0, losses: 0, bdestroyed: 0, gathered: 0, pop: 0, popCap: 0, defeated: false,
      techs: new Set(), gatherMult: { food: 1, wood: 1, gold: 1, stone: 1 } })),
    reserved, // tile indices (y * size + x) held by wall foundations: walkable, but nothing else can be placed there
    occAt: (x, y) => (x < 0 || y < 0 || x >= n || y >= n) ? 1 : occ[y * n + x],
    blocked: (x, y) => occ[y * n + x] !== 0,
  };
  const mark = (e, v) => { const r = rectOf(e); for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) occ[y * n + x] = v; };
  const cells = e => { const r = rectOf(e), out = []; for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) out.push(y * n + x); return out; };
  // Open ground a unit can be put on: on the map, not water, not occupied, not a wall foundation.
  const free = (x, y) => x >= 0 && y >= 0 && x < n && y < n && map.tiles[y * n + x] !== 1 && !occ[y * n + x] && !reserved.has(y * n + x);
  // The free tile whose centre is nearest (x, y), searching 8 tiles around; a tie goes to the first in row order.
  const nearestFree = (x, y) => {
    const cx = Math.floor(x), cy = Math.floor(y); let best = null, bd = Infinity;
    for (let ty = cy - 8; ty <= cy + 8; ty++) for (let tx = cx - 8; tx <= cx + 8; tx++) {
      if (!free(tx, ty)) continue;
      const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y); if (d < bd) { bd = d; best = { x: tx + 0.5, y: ty + 0.5 }; }
    }
    return best || { x, y };
  };

  game.addResource = r => { const e = { ...r, kind: 'resource', id: game.nextId++, dead: false }; game.entities.set(e.id, e); game.resources.set(e.id, e); mark(e, e.id); return e; };
  game.addBuilding = (type, owner, x, y, constructed) => {
    const d = BUILDINGS[type], def = d.defence ? defenceStats(d.defence, game.players[owner].age) : null, maxHp = def ? def.hp : d.hp; // defences: HP (and a tower's attack) come from the owner's era now
    const e = { id: game.nextId++, kind: 'building', type, owner, x, y, size: d.size, maxHp, hp: constructed ? maxHp : 1, constructed, progress: constructed ? 1 : 0,
      queue: [], workers: 0, sight: d.sight, marmor: d.marmor ?? 3, parmor: d.parmor ?? 8, dead: false, gatherType: d.gatherType || null, amount: d.amount || 0 };
    if (d.defence === 'tower') Object.assign(e, { atk: def.atk, atkType: def.atkType, range: def.range, cooldown: def.cooldown, splash: def.splash || 0, bonus: null, cd: 0 });
    game.entities.set(e.id, e); game.buildings.set(e.id, e);
    if (!constructed && opensFoundation(type)) { for (const i of cells(e)) reserved.add(i); return e; } // units may stand on it until it is finished
    mark(e, e.id);
    for (const u of game.units.values()) if (u.x >= x && u.x <= x + e.size && u.y >= y && u.y <= y + e.size) { const sp = game.findSpawn(e); u.x = sp.x; u.y = sp.y; u.path = null; }
    return e;
  };
  // A wall foundation just finished: it now occupies its tile, and any unit standing on it moves to the nearest free tile.
  game.occupyFoundation = b => {
    for (const i of cells(b)) reserved.delete(i);
    mark(b, b.id);
    const r = rectOf(b);
    for (const u of game.units.values()) {
      const tx = Math.floor(u.x), ty = Math.floor(u.y);
      if (tx >= r.x0 && tx < r.x1 && ty >= r.y0 && ty < r.y1) { const t = nearestFree(u.x, u.y); u.x = t.x; u.y = t.y; u.path = null; }
    }
  };
  game.spawnUnit = (type, owner, x, y) => {
    const d = UNITS[type];
    const u = { id: game.nextId++, kind: 'unit', type, owner, x, y, hp: d.hp, maxHp: d.hp, atk: d.atk, atkType: d.atkType || 'melee', marmor: d.marmor || 0, parmor: d.parmor || 0, bonus: d.bonus || null, range: d.range, speed: d.speed, sight: d.sight,
      cls: d.cls, splash: d.splash || 0, cooldown: d.cooldown ?? (d.cls === 'archer' ? 40 : d.cls === 'siege' ? 80 : 30), cd: 0, order: { type: 'idle' }, path: null, retry: 0,
      carry: { type: null, amount: 0 }, relic: null, dead: false };
    for (const id of game.players[owner].techs) applyUnitEffect(u, TECHS[id].effect); // inherit researched upgrades
    game.entities.set(u.id, u); game.units.set(u.id, u); return u;
  };
  game.completeTech = (pid, id) => {
    const p = game.players[pid]; if (p.techs.has(id)) return; p.techs.add(id);
    const eff = TECHS[id].effect;
    if (eff.gather) { for (const k in eff.gather) p.gatherMult[k] *= eff.gather[k]; }
    else for (const u of game.units.values()) if (u.owner === pid) applyUnitEffect(u, eff); // upgrade existing units too
  };
  game.spawnRelic = (x, y) => { const r = { id: game.nextId++, kind: 'relic', x, y, holder: null, stored: null, dead: false }; game.entities.set(r.id, r); game.relics.set(r.id, r); return r; };
  game.relicOwner = r => r.holder !== null ? game.entities.get(r.holder)?.owner ?? null : r.stored !== null ? game.entities.get(r.stored)?.owner ?? null : null;

  const freeTileNear = (x, y) => {
    const cx = Math.floor(x), cy = Math.floor(y);
    for (let r = 0; r <= 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = cx + dx, ty = cy + dy;
      if (free(tx, ty)) return { x: tx + 0.5, y: ty + 0.5 }; // never onto a foundation, which would seal a dropped relic inside the wall
    }
    return { x, y };
  };
  const dropRelics = (e, x, y) => {
    for (const r of game.relics.values()) if ((e.kind === 'unit' && r.holder === e.id) || (e.kind === 'building' && r.stored === e.id)) { const t = freeTileNear(x, y); r.holder = null; r.stored = null; r.x = t.x; r.y = t.y; }
    if (e.kind === 'unit') e.relic = null;
  };
  game.remove = e => {
    if (e.dead) return; e.dead = true;
    game.entities.delete(e.id); game.units.delete(e.id); game.buildings.delete(e.id); game.resources.delete(e.id);
    if (e.kind === 'building' || e.kind === 'resource') for (const i of cells(e)) { reserved.delete(i); if (occ[i] === e.id) occ[i] = 0; } // a foundation never marked its tile
    const c = centerOf(e); dropRelics(e, e.kind === 'building' ? Math.min(n - 1, Math.floor(c.x) + 0.5) : c.x, e.kind === 'building' ? Math.min(n - 1, e.y + e.size + 0.5) : c.y);
  };
  game.depleted = r => { if (r.kind === 'resource') game.remove(r); else if (r.gatherType) game.remove(r); };
  game.damage = (e, amount, attacker) => {
    if (e.dead) return; e.hp -= amount;
    if (e.hp <= 0) {
      if (attacker) { const p = game.players[attacker.owner]; if (e.kind === 'building') p.bdestroyed++; else p.kills += e.cls === 'civ' ? 1 : 2; }
      if (e.kind === 'unit') game.players[e.owner].losses++; // for generalship score (any death, attributed or not)
      game.remove(e);
    }
  };
  game.findSpawn = b => {
    for (let ring = 1; ring <= 3; ring++) for (let i = -ring; i < b.size + ring; i++) for (const [x, y] of [[b.x + i, b.y + b.size - 1 + ring], [b.x + i, b.y - ring], [b.x - ring, b.y + i], [b.x + b.size - 1 + ring, b.y + i]]) {
      if (free(x, y)) return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: b.x + 0.5, y: b.y + 0.5 };
  };
  game.recount = () => {
    for (const p of game.players) { p.pop = 0; p.popCap = 0; }
    for (const u of game.units.values()) game.players[u.owner].pop++;
    for (const b of game.buildings.values()) { const p = game.players[b.owner]; p.pop += b.queue.length; if (b.constructed) p.popCap += BUILDINGS[b.type].pop || 0; }
    for (const p of game.players) p.popCap = Math.min(50, p.popCap);
  };
  game.command = (pid, cmd) => execute(game, pid, cmd);
  game.visibleEntities = pid => {
    const p = game.players[pid], out = [];
    for (const list of [game.units, game.buildings]) for (const e of list.values()) {
      if (e.owner === pid) { out.push(e); continue; }
      const c = centerOf(e); if (p.visible[Math.floor(c.y) * n + Math.floor(c.x)]) out.push(e);
    }
    for (const r of game.relics.values()) if (p.visible[Math.floor(r.y) * n + Math.floor(r.x)]) out.push(r);
    return out;
  };
  game.knownResources = pid => [...game.resources.values()].filter(r => game.players[pid].explored[Math.floor(r.y) * n + Math.floor(r.x)]);

  game.tick = () => {
    if (game.result) return;
    game.time++;
    for (const u of [...game.units.values()]) if (!u.dead) updateUnit(game, u);
    for (const b of [...game.buildings.values()]) if (!b.dead) { updateBuilding(game, b); if (b.type === 'tower') updateTower(game, b); }
    for (const p of game.players) if (p.ageUp && --p.ageUp.remaining <= 0) { p.age = p.ageUp.to; p.ageUp = null; refreshDefences(game, p.id); }
    for (const r of game.relics.values()) if (r.holder !== null) { const h = game.entities.get(r.holder); if (h) { r.x = h.x; r.y = h.y; } }
    game.recount();
    if (game.time % 4 === 0) updateVision(game);
    if (game.rules) { const res = game.rules.check(game); if (res) game.result = res; }
  };
  game.snapshot = () => ({ time: game.time, players: game.players.map(p => ({ res: p.res, age: p.age, kills: p.kills, pop: p.pop })),
    entities: [...game.entities.values()].filter(e => e.kind !== 'resource').map(e => ({ id: e.id, type: e.type, owner: e.owner, x: +e.x.toFixed(3), y: +e.y.toFixed(3), hp: +(e.hp ?? 0).toFixed(2) })) });

  // initial state
  for (const r of map.resources) game.addResource(r);
  for (const [i, s] of map.starts.entries()) {
    const tc = game.addBuilding('town_center', i, s.x - 1, s.y - 1, true);
    for (let k = 0; k < 3; k++) { const sp = game.findSpawn(tc); const u = game.spawnUnit('villager', i, sp.x, sp.y); }
  }
  game.recount(); updateVision(game);
  if (rules && rules.setup) rules.setup(game);
  game.recount(); updateVision(game);
  return game;
}

function updateBuilding(game, b) {
  if (b.gatherType && b.amount <= 0) return game.remove(b);
  if (!b.constructed) {
    const w = b.workers; b.workers = 0;
    if (w > 0) {
      b.progress += Math.pow(w, 0.7) / secs(BUILDINGS[b.type].buildTime); b.hp = Math.max(b.hp, b.maxHp * Math.min(1, b.progress));
      if (b.progress >= 1) { b.constructed = true; b.hp = b.maxHp; b.progress = 1; if (opensFoundation(b.type)) game.occupyFoundation(b); }
    }
    return;
  }
  if (b.queue.length && --b.queue[0].remaining <= 0) {
    const q = b.queue.shift(), sp = game.findSpawn(b); game.spawnUnit(q.unit, b.owner, sp.x, sp.y);
  }
  if (b.research && --b.research.remaining <= 0) { const t = b.research.tech; b.research = null; game.completeTech(b.owner, t); }
}
