import { findPath } from './path.js';
import { breachTarget } from './defence.js';
import { BUILDINGS } from '../data/buildings.js';
import { farmStats } from '../data/farms.js';
import { DT, distPoint, centerOf, tileOf, RES_KIND } from './util.js';
import { drawFrom } from './ore.js';

const REACH = 1.0, CARRY = 10, RATE = { food: 0.7, wood: 0.6, gold: 0.5, stone: 0.5 };
const IDLE = () => ({ type: 'idle' });
const goalNear = (t, r) => (x, y) => distPoint(x + 0.5, y + 0.5, t) <= r;

// Move along the current path (computing it if needed). 'arrived' | 'moving' | 'wait' | 'fail'
function travel(game, u, goal, to) {
  if (!u.path) {
    if (u.retry > game.time) return 'wait';
    u.path = findPath(game.map, game.blocked, { x: Math.floor(u.x), y: Math.floor(u.y) }, to, goal);
    if (!u.path) { u.retry = game.time + 40; return 'fail'; }
    if (u.path.length === 0) { u.path = null; u.x = Math.floor(u.x) + 0.5; u.y = Math.floor(u.y) + 0.5; return 'arrived'; }
  }
  const w = u.path[0];
  if (game.occAt(w.x, w.y)) { u.path = null; return 'moving'; }
  const tx = w.x + 0.5, ty = w.y + 0.5, dx = tx - u.x, dy = ty - u.y, d = Math.hypot(dx, dy), step = u.speed * DT;
  if (d <= step) { u.x = tx; u.y = ty; u.path.shift(); if (!u.path.length) { u.path = null; return 'arrived'; } }
  else { u.x += dx / d * step; u.y += dy / d * step; }
  return 'moving';
}
const stop = u => { u.order = IDLE(); u.path = null; };
// Walled off: attack the enemy building in the way, and take up `o` again once it falls (doAttack restores `resume`).
// travel just set a 40-tick retry for the failed path; clear it so the unit heads for the breach at once.
const breach = (u, id, o) => { u.order = { type: 'attack', target: id, fails: 0, resume: o }; u.path = null; u.retry = 0; };
// Hand back the order `o` interrupted (a breach's, or the job a build was given over), at once and with no retry wait.
const resume = (u, o) => { u.order = o.resume; u.path = null; u.retry = 0; };
// A build that ends (done, gone or unreachable) takes up the job it interrupted, if any, else the villager stops.
const endBuild = (u, o) => o.resume ? resume(u, o) : stop(u);

export function updateUnit(game, u) {
  if (u.cd > 0) u.cd--;
  const o = u.order;
  switch (o.type) {
    case 'idle': return aggro(game, u);
    case 'move': return doMove(game, u, o);
    case 'gather': return doGather(game, u, o);
    case 'build': return doBuild(game, u, o);
    case 'attack': return doAttack(game, u, o);
    case 'relic': return doRelic(game, u, o);
  }
}

// A move that cannot reach its tile first settles for within 2 tiles of it. If even that fails and enemy buildings are in the
// way, the unit breaks through them, then tries for the exact tile again (slack back to 0); otherwise it stops.
function doMove(game, u, o) {
  const to = { x: Math.floor(o.x), y: Math.floor(o.y) }, goal = (x, y) => Math.abs(x - to.x) <= o.slack && Math.abs(y - to.y) <= o.slack;
  const r = travel(game, u, goal, to);
  if (r === 'arrived') return stop(u);
  if (r !== 'fail') return;
  if (o.slack < 2) { o.slack = 2; u.retry = 0; return; }
  const id = breachTarget(game, u, to, goal);
  if (id === null) return stop(u);
  o.slack = 0; breach(u, id, o);
}

function nearestResource(game, u, kind, maxDist) {
  let best = null, bd = maxDist;
  const consider = e => { const d = Math.hypot(e.x - u.x, e.y - u.y); if (d < bd) { bd = d; best = e; } };
  for (const r of game.resources.values()) if (RES_KIND[r.type] === kind && r.amount > 0) consider(r);
  for (const b of game.buildings.values()) if (b.owner === u.owner && b.constructed && b.gatherType === kind && b.amount > 0) consider(b); // own Farms and Mines
  return best;
}
function nearestDrop(game, u, kind) {
  let best = null, bd = Infinity;
  for (const b of game.buildings.values()) {
    if (b.owner !== u.owner || !b.constructed || !(BUILDINGS[b.type].drops || []).includes(kind)) continue;
    const d = distPoint(u.x, u.y, b); if (d < bd) { bd = d; best = b; }
  }
  return best;
}
const gatherKind = r => r.gatherType || RES_KIND[r.type];

function doGather(game, u, o) {
  let res = game.entities.get(o.res);
  const kind = o.kind;
  if (!res || res.dead || res.amount <= 0 || (res.kind === 'building' && !res.constructed)) {
    if (o.phase === 'work') o.phase = u.carry.amount > 0 ? 'drop' : 'go';
    res = nearestResource(game, u, kind, 12);
    if (!res) { if (u.carry.amount > 0) { o.res = -1; o.phase = 'drop'; } else return stop(u); }
    else { o.res = res.id; u.path = null; }
  }
  if (o.phase === 'go') {
    if (!res) return stop(u);
    if (distPoint(u.x, u.y, res) <= REACH) { o.phase = 'work'; u.path = null; return; }
    const r = travel(game, u, goalNear(res, 0.95), centerOf(res));
    if (r === 'fail') { if (++o.fails > 3) stop(u); else o.res = -1; }
  } else if (o.phase === 'work') {
    const p = game.players[u.owner], rate = RATE[kind] * DT * p.gatherMult[kind] * p.workRate * (res.type === 'farm' ? farmStats(p.age).rate : 1); // Farms work faster each era
    if (u.carry.type !== kind) u.carry = { type: kind, amount: 0 };
    if (res.kind === 'building') res.gatherers = (res.gatherers || 0) + 1;
    const take = drawFrom(game, res, rate); u.carry.amount += take; game.players[u.owner].gathered += take; // removes an empty pile/Farm, exhausts a Mine's patch
    if (u.carry.amount >= CARRY || res.amount <= 0 || res.dead) { o.phase = 'drop'; u.path = null; }
  } else { // drop
    if (u.carry.amount <= 0) { o.phase = 'go'; return; }
    const d = nearestDrop(game, u, u.carry.type);
    if (!d) return stop(u);
    if (distPoint(u.x, u.y, d) <= REACH) {
      game.players[u.owner].res[u.carry.type] += u.carry.amount; u.carry = { type: null, amount: 0 };
      o.phase = 'go'; u.path = null; return;
    }
    const r = travel(game, u, goalNear(d, 0.95), centerOf(d));
    if (r === 'fail' && ++o.fails > 3) stop(u);
  }
}

// The nearest building in a build queue (a wall line) that is still standing and unfinished; it is taken off the queue.
// Finished or destroyed ones are dropped. A tie on distance goes to the earlier one in the queue.
function nextInQueue(game, u, o) {
  let best = null, bd = Infinity;
  o.queue = (o.queue || []).filter(id => { const b = game.entities.get(id); return b && !b.dead && !b.constructed && b.owner === u.owner; });
  for (const id of o.queue) { const b = game.entities.get(id), d = distPoint(u.x, u.y, b); if (d < bd) { bd = d; best = b; } }
  if (best) o.queue = o.queue.filter(id => id !== best.id);
  return best;
}

function doBuild(game, u, o) {
  const b = game.entities.get(o.target);
  if (!b || b.dead || b.constructed) { // done (or gone): move on to the nearest segment left in the queue
    const next = o.queue && nextInQueue(game, u, o);
    if (next) { o.target = next.id; o.fails = 0; u.path = null; u.retry = 0; return; }
  }
  if (!b || b.dead) return endBuild(u, o);
  if (b.constructed) {
    if (b.gatherType && b.amount > 0) { // a finished farm or mine is the last job in the chain: interrupted builds first, then work it
      let last = o; while (last.resume?.type === 'build') last = last.resume;
      last.resume = { type: 'gather', res: b.id, kind: b.gatherType, phase: 'go', fails: 0 }; // in place of any gather it interrupted
    }
    return endBuild(u, o);
  }
  if (distPoint(u.x, u.y, b) <= REACH) { b.workers++; u.path = null; return; }
  const r = travel(game, u, goalNear(b, 0.95), centerOf(b));
  if (r === 'fail') { o.fails = (o.fails || 0) + 1; if (o.fails > 3) endBuild(u, o); }
}

// AoE1 damage model (openage doc/reverse_engineering/game_mechanics/damage.md):
// subtract the armor matching the attacker's attack type, add any bonus-vs-class,
// clamp each term, floor at 1. Buildings carry melee/pierce armor (no cls), so the
// bonus never applies to them; archers (pierce) bounce off their high pierce armor.
export function damageTo(u, t) {
  const armor = u.atkType === 'pierce' ? (t.parmor || 0) : (t.marmor || 0);
  const bonus = (u.bonus && t.cls && u.bonus[t.cls]) || 0;
  return Math.max(1, Math.max(0, u.atk - armor) + bonus);
}

export function hit(game, u, t) {
  game.damage(t, damageTo(u, t), u);
  if (u.splash) {
    const c = centerOf(t);
    for (const list of [game.units, game.buildings]) for (const e of [...list.values()]) {
      if (e === t || e.dead || e.owner === u.owner) continue;
      if (distPoint(c.x, c.y, e) <= u.splash) game.damage(e, damageTo(u, e) * 0.5, u);
    }
  }
}

// A breach order (one with `resume`) that loses its target hands back the order it interrupted, on the next tick and with no
// retry wait. A walled-off attack first looks for an enemy building to break through (never the target itself: that would wrap
// the order round itself); a breach can wrap again, each layer restoring the one before. Only an attack with no breach counts fails.
function doAttack(game, u, o) {
  const t = game.entities.get(o.target);
  if (!t || t.dead || t.owner === u.owner || (t.kind !== 'unit' && t.kind !== 'building')) {
    if (!o.resume) return stop(u);
    return resume(u, o);
  }
  if (distPoint(u.x, u.y, t) <= u.range + 0.1) {
    u.path = null;
    if (u.cd === 0) { u.cd = u.cooldown; hit(game, u, t); }
    return;
  }
  const tt = tileOf(t), key = tt.x + ',' + tt.y;
  if (u.path && o.last !== key && (game.time + u.id) % 5 === 0) u.path = null;
  o.last = key;
  const goal = goalNear(t, Math.max(0.9, u.range - 0.5)), r = travel(game, u, goal, tt);
  if (r !== 'fail') return;
  const id = breachTarget(game, u, tt, goal);
  if (id !== null && id !== o.target) return breach(u, id, o);
  if (++o.fails > 3) stop(u);
}

function aggro(game, u) {
  if (u.cls === 'civ' || (game.time + u.id) % 5 !== 0) return;
  let best = null, bd = u.sight + 1;
  for (const e of game.units.values()) {
    if (e.owner === u.owner) continue;
    const d = Math.hypot(e.x - u.x, e.y - u.y) - (e.cls === 'civ' ? 0.5 : 0); if (d < bd) { bd = d; best = e; }
  }
  if (!best) for (const e of game.buildings.values()) {
    if (e.owner === u.owner) continue;
    const d = distPoint(u.x, u.y, e) + 2; if (d < bd) { bd = d; best = e; }
  }
  if (best) { u.order = { type: 'attack', target: best.id, fails: 0, auto: true }; u.path = null; }
}

function doRelic(game, u, o) {
  const r = game.relics.get(o.relic);
  if (o.phase === 'go') {
    if (!r || r.holder !== null || r.stored !== null) return stop(u);
    if (Math.hypot(r.x - u.x, r.y - u.y) <= REACH) { r.holder = u.id; u.relic = r.id; o.phase = 'store'; u.path = null; return; }
    const t = { x: Math.floor(r.x), y: Math.floor(r.y) };
    const goal = (x, y) => x === t.x && y === t.y, res = travel(game, u, goal, t);
    if (res !== 'fail') return;
    const id = breachTarget(game, u, t, goal); // a relic walled in by the enemy: break through, then take up the fetch again
    if (id !== null) return breach(u, id, o);
    if (++o.fails > 3) stop(u);
  } else {
    if (u.relic === null) return stop(u);
    let d = null, bd = Infinity;
    for (const b of game.buildings.values()) {
      if (b.owner !== u.owner || !b.constructed || !(b.type === 'town_center' || b.type === 'government_center')) continue;
      const dd = distPoint(u.x, u.y, b); if (dd < bd) { bd = dd; d = b; }
    }
    if (!d) return stop(u);
    if (bd <= REACH) { const rl = game.relics.get(u.relic); rl.holder = null; rl.stored = d.id; u.relic = null; return stop(u); }
    const goal = goalNear(d, 0.95), to = centerOf(d), res = travel(game, u, goal, to);
    if (res !== 'fail') return;
    const id = breachTarget(game, u, to, goal); // the way home is walled off by the enemy: break through, then carry on home
    if (id !== null) return breach(u, id, o);
    if (++o.fails > 3) stop(u);
  }
}
