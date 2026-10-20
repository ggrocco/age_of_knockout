// Towers and walls: the tower's shooting, re-scaling both when their owner advances an era, and breaching them.
// Deterministic and DOM-free like the rest of src/sim: no randomness, and Map iteration order breaks every tie.
// orders.js imports breachTarget from here and this file imports hit from there: the cycle is safe because both sides only
// export function declarations, used at run time and never while the modules load.
import { BUILDINGS } from '../data/buildings.js';
import { defenceStats } from '../data/defences.js';
import { hit } from './orders.js';
import { findPath } from './path.js';
import { centerOf } from './util.js';

// One tick of a tower. An unfinished tower does nothing. A finished one counts its cooldown down and, at 0, shoots the nearest enemy
// unit whose tile its owner can see (fog) and that lies within `range` of the tower's centre. The shot reuses the unit damage
// model (`hit` reads atk, atkType, bonus, splash and owner off the attacker), so splash and kill credit work exactly as for a unit.
// With no target the cooldown stays at 0, so the first enemy to walk in is shot at once.
export function updateTower(game, b) {
  if (b.dead || !b.constructed) return;
  if (b.cd > 0) b.cd--;
  if (b.cd > 0) return;
  const c = centerOf(b), n = game.map.size, visible = game.players[b.owner].visible, reach = b.range * b.range;
  let target = null, best = Infinity;
  for (const u of game.units.values()) {
    if (u.owner === b.owner || u.dead) continue;
    const dx = u.x - c.x, dy = u.y - c.y, d2 = dx * dx + dy * dy;
    if (d2 > reach || d2 >= best) continue; // `>=`: a tie keeps the earlier (lower id) unit
    if (!visible[Math.floor(u.y) * n + Math.floor(u.x)]) continue;
    target = u; best = d2;
  }
  if (!target) return;
  hit(game, b, target);
  b.cd = b.cooldown;
}

// A tower or wall takes its numbers from its owner's era. When the owner advances, every existing one of theirs is upgraded in
// place: it keeps its fraction of health (hp / maxHp), a tower takes the new era's attack fields, and `cd` is left running.
// An unfinished one keeps its construction `progress` untouched; it already has the new maxHp, and updateBuilding raises its hp
// as max(hp, maxHp * progress) and sets hp = maxHp when it finishes, so it ends at the new era's maxHp.
export function refreshDefences(game, pid) {
  const age = game.players[pid].age;
  for (const b of game.buildings.values()) {
    const kind = BUILDINGS[b.type].defence;
    if (b.owner !== pid || !kind) continue;
    const s = defenceStats(kind, age);
    b.hp = b.hp / b.maxHp * s.hp; b.maxHp = s.hp;
    if (kind === 'tower') Object.assign(b, { atk: s.atk, atkType: s.atkType, range: s.range, cooldown: s.cooldown, splash: s.splash || 0 });
  }
}

// The enemy building unit `u` has to break through to reach `to` (or a tile `goal` accepts), or null. Called when the unit's
// own path has failed. It paths again with every tile held by an enemy building (any building whose owner is not u's, which is
// exactly what doAttack accepts as a target) counted as open; trees, mines, water, the map edge and u's own buildings still
// block. It returns the first enemy building that path runs into, or null when there is no such path or it crosses none.
// A diagonal step also counts its two corner tiles: real pathing never cuts a corner, so a step that squeezes between two enemy
// buildings (two segments of a diagonal wall line) is blocked by them, and the first of the two is returned. A step past one
// enemy corner is not blocked (the unit can go round by the other, open corner), so it does not count.
export function breachTarget(game, u, to, goal) {
  const enemyAt = (x, y) => { const e = game.entities.get(game.occAt(x, y)); return e && e.kind === 'building' && e.owner !== u.owner ? e : null; };
  const from = { x: Math.floor(u.x), y: Math.floor(u.y) };
  const path = findPath(game.map, (x, y) => game.blocked(x, y) && !enemyAt(x, y), from, to, goal);
  if (!path) return null;
  let p = from;
  for (const t of path) {
    if (t.x !== p.x && t.y !== p.y) { const a = enemyAt(t.x, p.y), b = enemyAt(p.x, t.y); if (a && b) return a.id; }
    const e = enemyAt(t.x, t.y); if (e) return e.id;
    p = t;
  }
  return null;
}
