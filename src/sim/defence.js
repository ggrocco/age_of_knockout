// Towers and walls: the tower's shooting, re-scaling both when their owner advances an era, and breaching them.
// Deterministic and DOM-free like the rest of src/sim: no randomness, and Map iteration order breaks every tie.
// orders.js imports breachTarget from here and this file imports hit from there: the cycle is safe because both sides only
// export function declarations, used at run time and never while the modules load.
import { BUILDINGS } from '../data/buildings.js';
import { defenceStats } from '../data/defences.js';
import { hit } from './orders.js';
import { findPath } from './path.js';
import { centerOf } from './util.js';

// One tick of a tower. An unfinished tower does nothing. A finished one counts its cooldown down and, at 0, shoots the nearest
// enemy unit whose tile its owner can see (fog) and that lies within `range` of the tower's centre. The shot reuses the unit
// damage model (`hit` reads atk, atkType, bonus, splash and owner off the attacker), so splash and kill credit work exactly as
// for a unit. With no target the cooldown stays at 0, so the first enemy to walk in is shot at once.
export function updateTower(game, tower) {
  if (tower.dead || !tower.constructed) return;
  if (tower.cd > 0) tower.cd--;
  if (tower.cd > 0) return;
  const target = nearestVisibleEnemy(game, tower);
  if (!target) return;
  hit(game, tower, target);
  tower.cd = tower.cooldown;
}

// The nearest enemy unit within the tower's range whose tile the tower's owner can see, or null. Compares squared distances.
function nearestVisibleEnemy(game, tower) {
  const center = centerOf(tower), n = game.map.size, visible = game.players[tower.owner].visible;
  const rangeSq = tower.range * tower.range;
  let target = null, nearestSq = Infinity;
  for (const unit of game.units.values()) {
    if (unit.owner === tower.owner || unit.dead || unit.aboard) continue;
    const dx = unit.x - center.x, dy = unit.y - center.y, distSq = dx * dx + dy * dy;
    if (distSq > rangeSq || distSq >= nearestSq) continue; // `>=`: a tie keeps the earlier (lower id) unit
    if (!visible[Math.floor(unit.y) * n + Math.floor(unit.x)]) continue;
    target = unit;
    nearestSq = distSq;
  }
  return target;
}

// A tower or wall takes its numbers from its owner's era. When the owner advances, every existing one of theirs is upgraded in
// place: it keeps its fraction of health (hp / maxHp), a tower takes the new era's attack fields, and `cd` is left running.
// An unfinished one keeps its construction `progress` untouched; it already has the new maxHp, and updateBuilding raises its hp
// as max(hp, maxHp * progress) and sets hp = maxHp when it finishes, so it ends at the new era's maxHp.
export function refreshDefences(game, pid) {
  const age = game.players[pid].age;
  for (const building of game.buildings.values()) {
    const kind = BUILDINGS[building.type].defence;
    if (building.owner !== pid || !kind) continue;
    const stats = defenceStats(kind, age);
    building.hp = building.hp / building.maxHp * stats.hp;
    building.maxHp = stats.hp;
    if (kind !== 'tower') continue;
    Object.assign(building, {
      atk: stats.atk, atkType: stats.atkType, range: stats.range, cooldown: stats.cooldown, splash: stats.splash || 0,
    });
  }
}

// The enemy building `unit` has to break through to reach `to` (or a tile `goal` accepts), or null. Called when the unit's
// own path has failed. It paths again with every tile held by an enemy building (any building whose owner is not the
// unit's, which is exactly what doAttack accepts as a target) counted as open; trees, mines, water, the map edge and the
// unit's own buildings still block. It returns the first enemy building that path runs into, or null when there is no such
// path or it crosses none.
// A diagonal step also counts its two corner tiles: real pathing never cuts a corner, so a step that squeezes between two enemy
// buildings (two segments of a diagonal wall line) is blocked by them, and the first of the two is returned. A step past one
// enemy corner is not blocked (the unit can go round by the other, open corner), so it does not count.
export function breachTarget(game, unit, to, goal) {
  const enemyAt = (x, y) => {
    const entity = game.entities.get(game.occAt(x, y));
    return entity && entity.kind === 'building' && entity.owner !== unit.owner ? entity : null;
  };
  const from = { x: Math.floor(unit.x), y: Math.floor(unit.y) };
  const path = findPath(game.map, (x, y) => game.blocked(x, y) && !enemyAt(x, y), from, to, goal);
  if (!path) return null;
  let previous = from;
  for (const tile of path) {
    if (tile.x !== previous.x && tile.y !== previous.y) { // a diagonal step: both corners held by enemy buildings block it
      const cornerA = enemyAt(tile.x, previous.y), cornerB = enemyAt(previous.x, tile.y);
      if (cornerA && cornerB) return cornerA.id;
    }
    const enemy = enemyAt(tile.x, tile.y);
    if (enemy) return enemy.id;
    previous = tile;
  }
  return null;
}
