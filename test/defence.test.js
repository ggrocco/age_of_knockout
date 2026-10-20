import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace, ageUpNeed, ageBuildings } from '../src/sim/commands.js';
import { scoreOf, isEliminated } from '../src/rounds/index.js';
import { AGES } from '../src/data/ages.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { TOWER, WALL_HP, defenceStats } from '../src/data/defences.js';
import { updateTower, refreshDefences } from '../src/sim/defence.js';
import { damageTo } from '../src/sim/orders.js';
import { updateVision } from '../src/sim/vision.js';
import { centerOf, lineTiles } from '../src/sim/util.js';
import { findPath } from '../src/sim/path.js';

// The binding stats from the defences plan: [era, hp, atk, atkType, range, cooldown, splash]
const TOWER_TABLE = [
  ['tool', 125, 3, 'pierce', 5, 40, 0], ['bronze', 160, 4, 'pierce', 6, 40, 0], ['iron', 220, 7, 'pierce', 7, 40, 0],
  ['medieval', 280, 9, 'pierce', 7, 40, 0], ['sail', 340, 16, 'melee', 8, 60, 0.8], ['industrial', 380, 4, 'pierce', 7, 12, 0],
  ['modern', 440, 26, 'melee', 9, 50, 1.0], ['future', 500, 18, 'pierce', 9, 20, 0],
];
const WALL_TABLE = { tool: 120, bronze: 200, iron: 300, medieval: 400, sail: 450, industrial: 500, modern: 650, future: 800 };

const tc = (g, p) => [...g.buildings.values()].find(b => b.owner === p && b.type === 'town_center');
// Drop a finished defence on the first free tile near the Town Center (addBuilding does not check placement itself).
const place = (g, pid, type, constructed = true) => {
  const t = tc(g, pid);
  for (let r = 4; r < 16; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const x = Math.floor(t.x) + dx, y = Math.floor(t.y) + dy;
    if (canPlace(g, pid, type, x, y)) return g.addBuilding(type, pid, x, y, constructed);
  }
  throw new Error('no free tile for ' + type);
};

test('tower stats table matches the binding era values, every field', () => {
  assert.deepEqual(Object.keys(TOWER), AGES.slice(1));
  for (const [era, hp, atk, atkType, range, cooldown, splash] of TOWER_TABLE) {
    const s = TOWER[era];
    assert.equal(s.hp, hp, `${era} hp`); assert.equal(s.atk, atk, `${era} atk`); assert.equal(s.atkType, atkType, `${era} type`);
    assert.equal(s.range, range, `${era} range`); assert.equal(s.cooldown, cooldown, `${era} cooldown`); assert.equal(s.splash ?? 0, splash, `${era} splash`);
  }
});
test('wall hp table matches the binding era values', () => {
  assert.deepEqual(WALL_HP, WALL_TABLE);
  assert.deepEqual(Object.keys(WALL_HP), AGES.slice(1));
});
test('defenceStats returns the era row, and the Tool row for ages before Tool', () => {
  for (const era of AGES.slice(1)) { assert.deepEqual(defenceStats('tower', era), TOWER[era], `tower ${era}`); assert.equal(defenceStats('wall', era).hp, WALL_HP[era], `wall ${era}`); }
  assert.deepEqual(defenceStats('tower', 'stone'), TOWER.tool);
  assert.equal(defenceStats('wall', 'stone').hp, WALL_HP.tool);
});
test('tower and wall building entries: cost, size, age, extra and defence flags', () => {
  const t = BUILDINGS.tower, w = BUILDINGS.wall;
  assert.deepEqual(t.cost, { food: 0, wood: 40, gold: 0, stone: 120 }); assert.deepEqual(w.cost, { food: 0, wood: 0, gold: 0, stone: 5 });
  assert.equal(t.size, 2); assert.equal(w.size, 1); assert.equal(t.age, 'tool'); assert.equal(w.age, 'tool');
  assert.equal(t.extra, true); assert.equal(w.extra, true); assert.equal(t.defence, 'tower'); assert.equal(w.defence, 'wall');
  assert.equal(t.hp, TOWER.tool.hp); assert.equal(w.hp, WALL_HP.tool);
  assert.equal(w.marmor, 4); assert.equal(w.parmor, 10);
});

test('tower and wall take their HP from the owner era', () => {
  const g = createGame({ seed: 1 }); g.players[0].age = 'sail';
  const t = place(g, 0, 'tower'), w = place(g, 0, 'wall');
  assert.equal(t.maxHp, 340); assert.equal(t.hp, 340); assert.equal(w.maxHp, 450); assert.equal(w.hp, 450);
  for (const era of AGES.slice(1)) {
    g.players[1].age = era; const a = place(g, 1, 'tower'), b = place(g, 1, 'wall');
    assert.equal(a.maxHp, TOWER[era].hp, `tower ${era}`); assert.equal(b.maxHp, WALL_HP[era], `wall ${era}`);
  }
});
test('an unfinished tower or wall starts at 1 HP but already has its era maxHp', () => {
  const g = createGame({ seed: 1 }); g.players[0].age = 'sail';
  const t = place(g, 0, 'tower', false), w = place(g, 0, 'wall', false);
  assert.equal(t.constructed, false); assert.equal(t.hp, 1); assert.equal(t.maxHp, 340);
  assert.equal(w.constructed, false); assert.equal(w.hp, 1); assert.equal(w.maxHp, 450);
});
test('a wall built before Tool (direct addBuilding) falls back to the Tool row', () => {
  const g = createGame({ seed: 1 }); assert.equal(g.players[0].age, 'stone');
  assert.equal(place(g, 0, 'tower').maxHp, 125); assert.equal(place(g, 0, 'wall').maxHp, 120);
});
test('a tower entity carries its era attack stats; a wall does not shoot', () => {
  const g = createGame({ seed: 1 });
  for (const [era, hp, atk, atkType, range, cooldown, splash] of TOWER_TABLE) {
    g.players[0].age = era; const t = place(g, 0, 'tower');
    assert.equal(t.maxHp, hp, era); assert.equal(t.atk, atk, era); assert.equal(t.atkType, atkType, era); assert.equal(t.range, range, era);
    assert.equal(t.cooldown, cooldown, era); assert.strictEqual(t.splash, splash, `${era} splash is a number, 0 when none`);
    assert.strictEqual(t.bonus, null, era); assert.strictEqual(t.cd, 0, era);
  }
  const w = place(g, 0, 'wall');
  assert.equal(w.atk, undefined); assert.equal(w.range, undefined); assert.equal(w.marmor, 4); assert.equal(w.parmor, 10);
});
test('other buildings are untouched by the defence stats', () => {
  const g = createGame({ seed: 1 }); g.players[0].age = 'future';
  const t = tc(g, 0); assert.equal(t.maxHp, BUILDINGS.town_center.hp); assert.equal(t.atk, undefined);
  assert.equal(place(g, 0, 'house').maxHp, BUILDINGS.house.hp);
});

test('towers and walls do not count toward age-up', () => {
  assert.equal(ageUpNeed('tool'), 2);
  for (const age of AGES) { const need = ageBuildings(age); assert.ok(!need.includes('tower') && !need.includes('wall'), age); }
  assert.deepEqual(ageBuildings('tool'), ['archery_range', 'stable', 'market']);
  assert.deepEqual(AGES.slice(0, -1).map(ageUpNeed), [2, 2, 1, 0, 1, 0, 1, 0]);
});
test('finished towers and walls do not satisfy the age-up building requirement', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool'; p.res = { food: 5000, wood: 5000, gold: 5000, stone: 5000 };
  place(g, 0, 'tower'); place(g, 0, 'wall'); place(g, 0, 'wall');
  assert.equal(g.command(0, { type: 'age' }).reason, 'needs buildings');
});

test('walls do not add to the building score; towers do', () => {
  const g = createGame({ seed: 1 }); const base = scoreOf(g, 0);
  for (let i = 0; i < 10; i++) place(g, 0, 'wall');
  assert.equal([...g.buildings.values()].filter(b => b.type === 'wall' && b.owner === 0 && b.constructed).length, 10);
  assert.equal(scoreOf(g, 0), base, 'ten finished walls add nothing');
  place(g, 0, 'tower'); assert.ok(scoreOf(g, 0) > base, 'a finished tower raises the score');
  const withTower = scoreOf(g, 0);
  place(g, 0, 'tower', false); assert.equal(scoreOf(g, 0), withTower, 'an unfinished tower never counts');
  place(g, 0, 'wall'); assert.equal(scoreOf(g, 0), withTower, 'nor does one more wall');
});

test('towers and walls do not keep a player alive', () => {
  const g = createGame({ seed: 1 });
  assert.equal(isEliminated(g, 1), false, 'control: a fresh player is alive');
  const t = place(g, 1, 'tower'), w = place(g, 1, 'wall');
  assert.ok(t.constructed && w.constructed);
  for (const e of [...g.entities.values()]) if (e.owner === 1 && e !== t && e !== w) g.remove(e);
  assert.deepEqual([...g.buildings.values()].filter(b => b.owner === 1).map(b => b.type).sort(), ['tower', 'wall']);
  assert.equal([...g.units.values()].filter(u => u.owner === 1).length, 0);
  assert.equal(isEliminated(g, 1), true);
  assert.equal(isEliminated(g, 0), false, 'the other side is untouched');
});

// ---- Tower shooting and upgrade on advance (Task 13) ----
// An enemy (owner 1) villager `d` tiles east of the tower's centre. Villagers (cls civ) never auto-aggro, so they stand still.
const foe = (g, t, d, dy = 0, type = 'villager', owner = 1) => { const c = centerOf(t); return g.spawnUnit(type, owner, c.x + d, c.y + dy); };
// A finished tower with every tile visible to its owner, so only the rule under test decides who is shot.
const armedTower = (g, age = 'tool') => { g.players[0].age = age; const t = place(g, 0, 'tower'); g.players[0].visible.fill(1); return t; };

test('a tower shoots the nearest enemy in range, not one out of range, not allies', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g);                       // Tool: range 5, atk 3 pierce
  const far = foe(g, t, 4), near = foe(g, t, 2, 0.5), out = foe(g, t, TOWER.tool.range + 1), ally = foe(g, t, 1, 0, 'villager', 0);
  updateTower(g, t);
  assert.equal(near.hp, near.maxHp - damageTo(t, near), 'the nearest enemy is hit');
  assert.equal(far.hp, far.maxHp, 'a farther enemy that is also in range is spared'); assert.equal(out.hp, out.maxHp, 'out of range is spared');
  assert.equal(ally.hp, ally.maxHp, 'allies are never shot');
  assert.equal(t.cd, t.cooldown, 'the shot starts the cooldown');
});
test('a tower only reaches targets within its range of its centre', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g); const r = TOWER.tool.range;
  const edge = foe(g, t, r - 0.01); updateTower(g, t); assert.ok(edge.hp < edge.maxHp, 'just inside the range is hit');
  const g2 = createGame({ seed: 1 }); const t2 = armedTower(g2); const beyond = foe(g2, t2, r + 0.01);
  updateTower(g2, t2); assert.equal(beyond.hp, beyond.maxHp, 'just outside is not'); assert.equal(t2.cd, 0, 'no target, no cooldown');
});
test('a tower with no target shoots the moment one arrives (cooldown stays at 0)', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g);
  for (let i = 0; i < 10; i++) updateTower(g, t);
  assert.equal(t.cd, 0);
  const v = foe(g, t, 3); updateTower(g, t); assert.ok(v.hp < v.maxHp);
});
test('a tower fires once per cooldown, not every tick', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g); const v = foe(g, t, 3); v.hp = v.maxHp = 1000;
  const shots = []; let last = v.hp;
  for (let i = 1; i <= 2 * TOWER.tool.cooldown + 1; i++) { updateTower(g, t); if (v.hp < last) { shots.push(i); last = v.hp; } }
  assert.deepEqual(shots, [1, 1 + TOWER.tool.cooldown, 1 + 2 * TOWER.tool.cooldown], 'one shot every `cooldown` ticks');
});
test('a tower does not shoot an enemy hidden by fog', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g); const v = foe(g, t, 3);
  const n = g.map.size, vis = g.players[0].visible, i = Math.floor(v.y) * n + Math.floor(v.x);
  vis[i] = 0; updateTower(g, t);
  assert.equal(v.hp, v.maxHp, 'the unit stands in range but its tile is not visible to the owner'); assert.equal(t.cd, 0);
  vis[i] = 1; updateTower(g, t); assert.ok(v.hp < v.maxHp, 'once the tile is visible it is shot');
});
test('fog is the owner\'s view: what the other side sees does not matter', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g); const v = foe(g, t, 3);
  const n = g.map.size, i = Math.floor(v.y) * n + Math.floor(v.x);
  g.players[0].visible[i] = 0; g.players[1].visible[i] = 1; updateTower(g, t); assert.equal(v.hp, v.maxHp);
});
test('a real tick: a tower sees, shoots and kills through game.tick, crediting the owner', () => {
  const g = createGame({ seed: 1 }); g.players[0].age = 'tool'; const t = place(g, 0, 'tower'); const v = foe(g, t, 2); v.hp = 3;
  updateVision(g); const kills = g.players[0].kills, losses = g.players[1].losses;
  g.tick();
  assert.ok(v.dead, 'the villager died to the tower'); assert.equal(g.players[0].kills, kills + 1, 'the tower\'s owner is credited (civ = 1)'); assert.equal(g.players[1].losses, losses + 1);
});
test('an unfinished tower does not shoot', () => {
  const g = createGame({ seed: 1 }); g.players[0].age = 'tool'; const t = place(g, 0, 'tower', false); g.players[0].visible.fill(1);
  const v = foe(g, t, 2); for (let i = 0; i < 5; i++) updateTower(g, t);
  assert.equal(v.hp, v.maxHp); assert.equal(t.cd, 0);
});
test('a tower never targets buildings', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g); const w = place(g, 1, 'wall'); const hp = w.hp; const tcHp = tc(g, 1).hp;
  w.x = Math.floor(centerOf(t).x) + 1; w.y = Math.floor(centerOf(t).y);
  for (let i = 0; i < 100; i++) updateTower(g, t);
  assert.equal(w.hp, hp); assert.equal(tc(g, 1).hp, tcHp);
});
test('ties on distance go to the lowest id (deterministic)', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g);
  const a = foe(g, t, 3), b = foe(g, t, -3); updateTower(g, t);
  assert.ok(a.hp < a.maxHp && b.hp === b.maxHp);
});
test('two identical games with towers stay identical (determinism)', () => {
  const run = () => { const g = createGame({ seed: 5 }); g.players[0].age = 'sail'; const t = place(g, 0, 'tower'); updateVision(g);
    foe(g, t, 3); foe(g, t, 3.5, 1); foe(g, t, 5, -1); for (let i = 0; i < 200; i++) g.tick(); return JSON.stringify(g.snapshot()); };
  assert.equal(run(), run());
});

test('a sail tower splashes', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g, 'sail'); assert.equal(t.splash, 0.8);        // melee 16, range 8
  const main = foe(g, t, 3), edge = foe(g, t, 3, 0.7), spared = foe(g, t, 3, 1.5), ally = foe(g, t, 3, -0.3, 'villager', 0);
  updateTower(g, t);
  assert.equal(main.hp, main.maxHp - damageTo(t, main), 'the target takes the full hit');
  assert.equal(edge.hp, edge.maxHp - damageTo(t, edge) * 0.5, 'a unit inside the splash radius takes half');
  assert.equal(spared.hp, spared.maxHp, 'outside the splash radius is spared'); assert.equal(ally.hp, ally.maxHp, 'the owner\'s units are never splashed');
});
test('a non-splash tower hits only its target', () => {
  const g = createGame({ seed: 1 }); const t = armedTower(g, 'iron'); const a = foe(g, t, 3), b = foe(g, t, 3, 0.2); updateTower(g, t);
  assert.ok(a.hp < a.maxHp); assert.equal(b.hp, b.maxHp);
});

test('advancing upgrades towers and walls in place, keeping the HP fraction', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool';
  const t = place(g, 0, 'tower'), w = place(g, 0, 'wall'), full = place(g, 0, 'tower'), other = place(g, 0, 'house'), theirs = place(g, 1, 'tower'), townCenter = tc(g, 0);
  t.hp = TOWER.tool.hp / 2; w.hp = WALL_HP.tool / 4; other.hp = 10; const tcHp = townCenter.hp, theirHp = theirs.hp, otherMax = other.maxHp;
  t.cd = 17;
  p.ageUp = { to: 'bronze', remaining: 1 }; g.tick();
  assert.equal(p.age, 'bronze');
  assert.equal(t.maxHp, 160); assert.equal(t.hp, 80, 'a tower at 50% of 125 is at 50% of 160');
  assert.equal(w.maxHp, 200); assert.equal(w.hp, 50, 'a wall at 25% of 120 is at 25% of 200');
  assert.equal(full.maxHp, 160); assert.equal(full.hp, 160, 'a full-health tower ends full');
  assert.equal(t.atk, 4); assert.equal(t.atkType, 'pierce'); assert.equal(t.range, 6); assert.equal(t.cooldown, 40); assert.strictEqual(t.splash, 0);
  assert.strictEqual(t.bonus, null); assert.equal(t.cd, 16, 'the running cooldown is kept, not reset (17, less the one tick that passed)');
  assert.equal(w.atk, undefined, 'a wall gains no attack');
  assert.equal(other.maxHp, otherMax); assert.equal(other.hp, 10); assert.equal(townCenter.hp, tcHp, 'other buildings are untouched');
  assert.equal(theirs.maxHp, 125); assert.equal(theirs.hp, theirHp, 'the other player\'s defences wait for their own advance');
});
test('upgrading copies the new era\'s attack, including splash, and drops it again', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'medieval';
  const t = place(g, 0, 'tower');
  p.ageUp = { to: 'sail', remaining: 1 }; g.tick();
  assert.deepEqual([t.atk, t.atkType, t.range, t.cooldown, t.splash, t.maxHp], [16, 'melee', 8, 60, 0.8, 340]);
  p.ageUp = { to: 'industrial', remaining: 1 }; g.tick();
  assert.deepEqual([t.atk, t.atkType, t.range, t.cooldown, t.splash, t.maxHp], [4, 'pierce', 7, 12, 0, 380]);
});
test('refreshDefences follows the owner\'s current age and is idempotent', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool'; const t = place(g, 0, 'tower'); t.hp = 25;
  p.age = 'iron'; refreshDefences(g, 0); refreshDefences(g, 0);
  assert.equal(t.maxHp, 220); assert.equal(t.hp, 44, '20% of 125 -> 20% of 220, applied once'); assert.equal(t.atk, 7);
});
test('a tower upgraded by an advance shoots with its new stats', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool'; const t = place(g, 0, 'tower'); p.visible.fill(1);
  const v = foe(g, t, 5.9); updateTower(g, t); assert.equal(v.hp, v.maxHp, 'out of Tool range (5)');
  p.ageUp = { to: 'bronze', remaining: 1 }; g.tick(); p.visible.fill(1); updateTower(g, t);
  assert.ok(v.hp < v.maxHp, 'inside Bronze range (6)');
});
test('Review Focus 4: an unfinished tower keeps its progress across an advance and finishes at the new maxHp', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool';
  const t = place(g, 0, 'tower', false), w = place(g, 0, 'wall', false);
  for (const b of [t, w]) { b.progress = 0.5; b.hp = Math.max(b.hp, b.maxHp * 0.5); } // half built: HP is half of the Tool value
  assert.equal(t.hp, 62.5); assert.equal(w.hp, 60);
  p.ageUp = { to: 'bronze', remaining: 1 }; g.tick();
  for (const b of [t, w]) assert.equal(b.constructed, false, `${b.type} is still unfinished`);
  assert.equal(t.progress, 0.5); assert.equal(w.progress, 0.5, 'progress is not touched by the advance');
  assert.equal(t.maxHp, 160); assert.equal(t.hp, 80, 'half of the new maxHp'); assert.equal(w.maxHp, 200); assert.equal(w.hp, 100);
  assert.equal(t.atk, 4, 'the unfinished tower already carries the new attack');
  // keep building: HP follows progress against the NEW maxHp and never exceeds it, then lands on it exactly
  let ticks = 0;
  while (!t.constructed || !w.constructed) {
    for (const b of [t, w]) if (!b.constructed) b.workers = 3;
    g.tick(); assert.ok(++ticks < 2000, 'finishes');
    for (const b of [t, w]) { assert.ok(b.hp <= b.maxHp + 1e-9, 'hp stays within maxHp'); if (!b.constructed) assert.ok(b.hp >= b.maxHp * b.progress - 1e-9, 'hp follows progress'); }
  }
  assert.equal(t.hp, 160); assert.equal(t.maxHp, 160); assert.equal(w.hp, 200); assert.equal(w.maxHp, 200); assert.equal(t.progress, 1);
});
test('a barely started tower also keeps its proportion across an advance and finishes at the new maxHp', () => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool'; const t = place(g, 0, 'tower', false);
  assert.equal(t.hp, 1);
  p.ageUp = { to: 'iron', remaining: 1 }; g.tick();
  assert.equal(t.progress, 0); assert.equal(t.maxHp, 220); assert.ok(Math.abs(t.hp - 220 / 125) < 1e-9, 'one Tool HP out of 125 stays one 125th');
  for (let i = 0; i < 2000 && !t.constructed; i++) { t.workers = 4; g.tick(); }
  assert.ok(t.constructed); assert.equal(t.hp, 220);
});

// ---- Wall lines, open foundations and deleting your own buildings (Task 14) ----
const idx = (g, x, y) => y * g.map.size + x;
const unitOn = (g, x, y) => [...g.units.values()].some(u => Math.floor(u.x) === x && Math.floor(u.y) === y);
const freeTile = (g, x, y) => x >= 1 && y >= 1 && x < g.map.size - 1 && y < g.map.size - 1 && g.map.tiles[idx(g, x, y)] !== 1 && !g.occAt(x, y) && !unitOn(g, x, y);
// Player 0 in the Tool Age with every tile explored and `stone` stone, so only the rule under test decides what can be placed.
const wallGame = (stone = 500) => { const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool'; p.res.stone = stone; p.explored.fill(1); return g; };
const villagers = (g, pid = 0) => [...g.units.values()].filter(u => u.owner === pid && u.type === 'villager');
const wallsOf = (g, pid = 0) => [...g.buildings.values()].filter(b => b.type === 'wall' && b.owner === pid);
// Top-left of the free w x h block (open ground, nothing on it, no unit standing in it) nearest player 0's Town Center.
const clearBlock = (g, w, h) => {
  const t = tc(g, 0);
  for (let r = 4; r < 24; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x0 = t.x + dx, y0 = t.y + dy; let ok = true;
    for (let j = 0; j < h && ok; j++) for (let i = 0; i < w && ok; i++) ok = freeTile(g, x0 + i, y0 + j);
    if (ok) return { x: x0, y: y0 };
  }
  throw new Error(`no free ${w}x${h} block`);
};
// Finish these walls through the real tick (updateBuilding), one worker each.
const finish = (g, walls) => {
  for (let i = 0; i < 2000 && walls.some(w => !w.constructed); i++) { for (const w of walls) if (!w.constructed) w.workers = 1; g.tick(); }
  assert.ok(walls.every(w => w.constructed), 'the walls finish');
};
// A diamond of four diagonal wall lines around (cx, cy); the four corners are listed twice (end of one line, start of the next).
const diamond = (cx, cy) => [[-2, 0, 0, -2], [0, -2, 2, 0], [2, 0, 0, 2], [0, 2, -2, 0]]
  .flatMap(([ax, ay, bx, by]) => lineTiles({ x: cx + ax, y: cy + ay }, { x: cx + bx, y: cy + by }));
const outside = (cx, cy) => (x, y) => Math.max(Math.abs(x - cx), Math.abs(y - cy)) >= 3;

test('lineTiles snaps a drag to a horizontal, vertical or diagonal line, both ends included, at most 64 tiles', () => {
  const xy = ts => ts.map(t => [t.x, t.y]);
  assert.deepEqual(xy(lineTiles({ x: 5, y: 5 }, { x: 5, y: 5 })), [[5, 5]], 'a click is one tile');
  assert.deepEqual(xy(lineTiles({ x: 2, y: 3 }, { x: 6, y: 4 })), [[2, 3], [3, 3], [4, 3], [5, 3], [6, 3]], 'mostly sideways (|dx| > 2|dy|) snaps horizontal');
  assert.deepEqual(xy(lineTiles({ x: 6, y: 3 }, { x: 2, y: 3 })), [[6, 3], [5, 3], [4, 3], [3, 3], [2, 3]], 'it runs from the first end');
  assert.deepEqual(xy(lineTiles({ x: 4, y: 9 }, { x: 5, y: 5 })), [[4, 9], [4, 8], [4, 7], [4, 6], [4, 5]], 'mostly up or down (|dy| > 2|dx|) snaps vertical');
  assert.deepEqual(xy(lineTiles({ x: 1, y: 1 }, { x: 4, y: 4 })), [[1, 1], [2, 2], [3, 3], [4, 4]], 'a true diagonal');
  assert.deepEqual(xy(lineTiles({ x: 10, y: 10 }, { x: 8, y: 13 })), [[10, 10], [9, 11], [8, 12], [7, 13]], 'in between: a diagonal of length max(|dx|, |dy|)');
  assert.deepEqual(xy(lineTiles({ x: 0, y: 0 }, { x: 2, y: 1 })), [[0, 0], [1, 1], [2, 2]], '|dx| = 2|dy| is still diagonal');
  assert.deepEqual(xy(lineTiles({ x: 0, y: 0 }, { x: 3, y: 1 })), [[0, 0], [1, 0], [2, 0], [3, 0]], 'just past it is horizontal');
  const long = lineTiles({ x: 0, y: 7 }, { x: 100, y: 7 });
  assert.equal(long.length, 64); assert.deepEqual(long[0], { x: 0, y: 7 }); assert.deepEqual(long[63], { x: 63, y: 7 }, 'capped at 64, counted from the start');
  assert.equal(lineTiles({ x: 90, y: 90 }, { x: 0, y: 0 }).length, 64, 'diagonals are capped too');
  assert.equal(lineTiles({ x: 3, y: 0 }, { x: 3, y: 64 }).length, 64, 'and verticals: 65 tiles become 64');
});

test('a wall line places and pays per segment and stops when stone runs out', () => {
  const g = wallGame(17), p = g.players[0], vs = villagers(g), ids = vs.map(v => v.id), { x, y } = clearBlock(g, 6, 1);
  const before = { ...p.res };
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: lineTiles({ x, y }, { x: x + 5, y }) }), { ok: true, placed: 3 });
  assert.deepEqual(p.res, { ...before, stone: 2 }, '3 segments at 5 stone each; the 4th cannot be paid for');
  const ws = wallsOf(g);
  assert.deepEqual(ws.map(w => [w.x, w.y]), [[x, y], [x + 1, y], [x + 2, y]], 'the first three tiles, and nothing after the first unaffordable one');
  for (const w of ws) { assert.equal(w.constructed, false); assert.equal(w.hp, 1); }
  for (const v of vs) { assert.equal(v.order.type, 'build'); assert.equal(v.order.target, ws[0].id); assert.deepEqual(v.order.queue, [ws[1].id, ws[2].id]); }
  assert.notEqual(vs[0].order.queue, vs[1].order.queue, 'each villager gets its own copy of the queue');
  // nothing placed: fail('placement'), no stone spent, orders untouched
  const orders = vs.map(v => v.order);
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: lineTiles({ x: x + 3, y }, { x: x + 5, y }) }), { ok: false, reason: 'resources' }, 'cannot afford even one');
  p.res.stone = 100;
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: lineTiles({ x, y }, { x: x + 2, y }) }), { ok: false, reason: 'placement' }, 'every tile already has a foundation');
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: [] }), { ok: false, reason: 'placement' });
  assert.equal(p.res.stone, 100); assert.equal(wallsOf(g).length, 3); assert.deepEqual(vs.map(v => v.order), orders);
  assert.deepEqual(g.command(0, { type: 'wall', ids: [tc(g, 0).id], tiles: [{ x: x + 4, y }] }), { ok: false, reason: 'no villagers' });
  p.age = 'stone';
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: [{ x: x + 4, y }] }), { ok: false, reason: 'age' });
  assert.equal(p.res.stone, 100); assert.equal(wallsOf(g).length, 3);
});

test('Review Focus 1: a line across a tree, a wall and a foundation places only the free tiles, charges only for them, and the villagers build every one', () => {
  const g = wallGame(), p = g.players[0], vs = villagers(g), home = centerOf(tc(g, 0));
  // the tree nearest home with three free tiles on each side of it in its row
  let tree = null, bd = Infinity;
  for (const r of g.resources.values()) {
    if (r.type !== 'tree') continue;
    const tx = Math.floor(r.x), ty = Math.floor(r.y);
    if (![-3, -2, -1, 1, 2, 3].every(d => freeTile(g, tx + d, ty))) continue;
    const d = Math.hypot(r.x - home.x, r.y - home.y); if (d < bd) { bd = d; tree = r; }
  }
  assert.ok(tree, 'a suitable tree'); const tx = Math.floor(tree.x), ty = Math.floor(tree.y), wood = tree.amount;
  const wall = g.addBuilding('wall', 0, tx + 2, ty, true), foundation = g.addBuilding('wall', 0, tx - 2, ty, false);
  const stone = p.res.stone;
  assert.deepEqual(g.command(0, { type: 'wall', ids: vs.map(v => v.id), tiles: lineTiles({ x: tx - 3, y: ty }, { x: tx + 3, y: ty }) }), { ok: true, placed: 4 });
  assert.equal(p.res.stone, stone - 4 * BUILDINGS.wall.cost.stone, 'only the four placed segments are paid for');
  const placed = wallsOf(g).filter(w => w !== wall && w !== foundation);
  assert.deepEqual(placed.map(w => w.x), [tx - 3, tx - 1, tx + 1, tx + 3], 'the tree, the finished wall and the old foundation are skipped');
  for (const v of vs) assert.deepEqual([v.order.target, ...v.order.queue], placed.map(w => w.id), 'each build queue holds exactly the placed segments');
  let ticks = 0;
  while (placed.some(w => !w.constructed)) { g.tick(); assert.ok(++ticks < 3000, 'the line gets built'); }
  for (let i = 0; i < 5; i++) g.tick();
  for (const v of vs) {
    assert.equal(v.order.type, 'idle', 'the villagers stop once the line is done');
    assert.ok(!wallsOf(g).some(w => w.constructed && w.x === Math.floor(v.x) && w.y === Math.floor(v.y)), 'and none is left inside a wall');
  }
  assert.equal(tree.dead, false); assert.equal(tree.amount, wood, 'the tree is untouched');
  assert.equal(foundation.constructed, false, 'the old foundation was not in this line\'s queue');
});

test('a builder takes the nearest unfinished segment of its queue next, not the next in line', () => {
  const g = wallGame(), [v] = villagers(g), { x, y } = clearBlock(g, 5, 1);
  v.x = x + 0.5; v.y = y + 1.5; v.path = null;
  assert.equal(g.command(0, { type: 'wall', ids: [v.id], tiles: [{ x, y }, { x: x + 4, y }, { x: x + 1, y }] }).placed, 3);
  const [a, far, near] = wallsOf(g);
  for (let i = 0; i < 1000 && !a.constructed; i++) g.tick();
  assert.ok(a.constructed); g.tick();
  assert.equal(v.order.target, near.id, 'the tile next door, though it came last'); assert.deepEqual(v.order.queue, [far.id]);
});

test('a builder whose segment is deleted moves on to the rest of its line', () => {
  const g = wallGame(), vs = villagers(g), { x, y } = clearBlock(g, 3, 1);
  g.command(0, { type: 'wall', ids: vs.map(v => v.id), tiles: lineTiles({ x, y }, { x: x + 2, y }) });
  const [first, ...rest] = wallsOf(g);
  assert.deepEqual(g.command(0, { type: 'delete', id: first.id }), { ok: true });
  let ticks = 0;
  while (rest.some(w => !w.constructed)) { g.tick(); assert.ok(++ticks < 3000, 'the rest of the line still gets built'); }
});

test('wall foundations do not block movement', () => {
  const g = wallGame(), p = g.players[0], vs = villagers(g), { x, y } = clearBlock(g, 5, 5), cx = x + 2, cy = y + 2;
  assert.ok(canPlace(g, 0, 'house', cx - 2, cy - 1), 'control: a house fits there before the wall');
  assert.deepEqual(g.command(0, { type: 'wall', ids: vs.map(v => v.id), tiles: diamond(cx, cy) }), { ok: true, placed: 8 }, 'each shared corner is placed once');
  assert.equal(p.res.stone, 500 - 8 * 5, 'and paid for once');
  for (const v of vs) v.order = { type: 'idle' }; // nobody builds: they stay foundations
  for (const w of wallsOf(g)) {
    assert.equal(g.blocked(w.x, w.y), false, 'a foundation is walkable'); assert.ok(g.reserved.has(idx(g, w.x, w.y)), 'but reserves its tile');
    assert.equal(canPlace(g, 0, 'wall', w.x, w.y), false); assert.equal(canPlace(g, 1, 'wall', w.x, w.y), false, 'for either player');
  }
  assert.equal(canPlace(g, 0, 'house', cx - 2, cy - 1), false, 'nor can any other building overlap a foundation');
  assert.ok(findPath(g.map, g.blocked, { x: cx, y: cy }, { x: cx + 3, y: cy }, outside(cx, cy)), 'a path leads out across the foundations');
  const u = g.spawnUnit('villager', 1, cx + 0.5, cy + 0.5);
  g.command(1, { type: 'move', ids: [u.id], x: cx + 4.5, y: cy + 0.5 });
  for (let i = 0; i < 200 && u.order.type === 'move'; i++) g.tick();
  assert.deepEqual([Math.floor(u.x), Math.floor(u.y)], [cx + 4, cy], 'a unit walks straight out over a foundation');
});

test('a finished wall blocks pathing', () => {
  const g = wallGame(), vs = villagers(g), { x, y } = clearBlock(g, 5, 5), cx = x + 2, cy = y + 2;
  g.command(0, { type: 'wall', ids: vs.map(v => v.id), tiles: diamond(cx, cy) });
  for (const v of vs) v.order = { type: 'idle' };
  const walls = wallsOf(g); assert.equal(walls.length, 8);
  finish(g, walls);
  for (const w of walls) {
    assert.equal(g.blocked(w.x, w.y), true); assert.equal(g.occAt(w.x, w.y), w.id, 'the finished wall occupies its tile');
    assert.equal(g.reserved.has(idx(g, w.x, w.y)), false, 'and no longer just reserves it');
  }
  assert.equal(findPath(g.map, g.blocked, { x: cx, y: cy }, { x: cx + 3, y: cy }, outside(cx, cy)), null, 'sealed in: the diagonal sides cannot be slipped through');
  const gap = walls.find(w => w.x === cx + 2 && w.y === cy); g.remove(gap);
  assert.equal(g.blocked(cx + 2, cy), false, 'removing a segment frees its tile');
  assert.ok(findPath(g.map, g.blocked, { x: cx, y: cy }, { x: cx + 3, y: cy }, outside(cx, cy)), 'and opens a gap');
});

test('Review Focus 2: a unit standing on a wall tile when it completes is moved to the nearest free tile', () => {
  const g = wallGame(), [b] = villagers(g), { x, y } = clearBlock(g, 3, 3), wx = x + 1, wy = y + 1;
  b.x = wx + 0.5; b.y = wy + 0.5; b.path = null; // the builder stands on the very tile it builds
  assert.equal(g.command(0, { type: 'wall', ids: [b.id], tiles: lineTiles({ x: wx - 1, y: wy }, { x: wx + 1, y: wy }) }).placed, 3);
  const [west, mid, east] = wallsOf(g);
  assert.ok(g.command(0, { type: 'construct', ids: [b.id], targetId: mid.id }).ok);
  const south = g.spawnUnit('villager', 1, wx + 0.5, wy + 0.9), leanEast = g.spawnUnit('villager', 1, wx + 0.9, wy + 0.5);
  const onEast = g.spawnUnit('villager', 1, wx + 1.5, wy + 0.5);
  let ticks = 0;
  while (!mid.constructed) { g.tick(); assert.ok(++ticks < 1000, 'the middle segment finishes'); }
  assert.equal(g.occAt(wx, wy), mid.id);
  for (const u of g.units.values()) assert.ok(!(Math.floor(u.x) === wx && Math.floor(u.y) === wy), `unit ${u.id} is not left inside the wall`);
  assert.deepEqual([south.x, south.y], [wx + 0.5, wy + 1.5], 'nearest free tile: the one it leaned towards');
  for (const u of [b, leanEast]) {
    const tx = Math.floor(u.x), ty = Math.floor(u.y);
    assert.ok(!g.blocked(tx, ty) && !g.reserved.has(idx(g, tx, ty)), 'never onto a neighbouring foundation');
    assert.equal(u.path, null);
  }
  assert.equal(Math.hypot(b.x - (wx + 0.5), b.y - (wy + 0.5)), 1, 'the builder steps one tile off (north or south: east and west are foundations)');
  assert.ok(Math.abs(Math.hypot(leanEast.x - (wx + 0.9), leanEast.y - (wy + 0.5)) - Math.hypot(0.4, 1)) < 1e-9, 'the east neighbour is a foundation, so the next nearest');
  assert.deepEqual([onEast.x, onEast.y], [wx + 1.5, wy + 0.5], 'a unit on a foundation that is not finishing stays put');
  assert.equal(west.constructed, false); assert.equal(east.constructed, false);
});

test('you can delete your own building, not an enemy one', () => {
  const g = wallGame(), p = g.players[0];
  const house = place(g, 0, 'house'); g.recount(); assert.equal(p.popCap, 14);
  const before = { ...p.res };
  assert.deepEqual(g.command(0, { type: 'delete', id: house.id }), { ok: true });
  assert.equal(house.dead, true); assert.equal(g.entities.has(house.id), false);
  assert.equal(g.occAt(house.x, house.y), 0, 'its tiles are free again'); assert.ok(canPlace(g, 0, 'house', house.x, house.y));
  assert.deepEqual(p.res, before, 'no refund'); assert.equal(p.popCap, 10, 'its housing goes at once');
  const theirs = tc(g, 1), mine = villagers(g)[0], tree = [...g.resources.values()][0];
  for (const id of [theirs.id, mine.id, tree.id, 99999, undefined]) assert.deepEqual(g.command(0, { type: 'delete', id }), { ok: false, reason: 'bad target' });
  assert.equal(theirs.dead, false); assert.equal(mine.dead, false); assert.equal(tree.dead, false);
  // a Barracks with a training queue
  const bk = place(g, 0, 'barracks'); p.res.food = 1000;
  assert.ok(g.command(0, { type: 'train', buildingId: bk.id, unit: 'clubman' }).ok); assert.ok(g.command(0, { type: 'train', buildingId: bk.id, unit: 'clubman' }).ok);
  assert.equal(p.pop, 5);
  assert.deepEqual(g.command(0, { type: 'delete', id: bk.id }), { ok: true });
  assert.equal(p.pop, 3, 'the queued units are recounted away'); assert.equal(p.res.food, 900, 'and not refunded');
  for (let i = 0; i < 30 * 20; i++) g.tick();
  assert.equal([...g.units.values()].filter(u => u.owner === 0).length, 3, 'nothing comes out of a deleted Barracks'); assert.equal(p.pop, 3);
  // an unfinished wall: deleting it lifts its reservation
  const { x, y } = clearBlock(g, 1, 1);
  g.command(0, { type: 'wall', ids: [mine.id], tiles: [{ x, y }] }); const w = wallsOf(g)[0];
  assert.equal(canPlace(g, 0, 'wall', x, y), false);
  assert.deepEqual(g.command(0, { type: 'delete', id: w.id }), { ok: true });
  assert.equal(g.reserved.has(idx(g, x, y)), false); assert.ok(canPlace(g, 0, 'wall', x, y), 'the tile can be built on again');
  assert.deepEqual(g.command(1, { type: 'delete', id: tc(g, 0).id }), { ok: false, reason: 'bad target' }, 'nor can the enemy delete yours');
});

test('a Modern tower sees, and so shoots, an enemy at its full range on the negative diagonal (sight 10)', () => {
  assert.equal(BUILDINGS.tower.sight, 10);
  const g = createGame({ seed: 1 }), n = g.map.size; g.players[0].age = 'modern';
  for (const e of [...g.entities.values()]) if (e.owner === 0) g.remove(e); // the tower is player 0's only eyes
  let spot = null; // a free 2x2 near the middle of the map
  for (let r = 0; r < 20 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
    const x = n / 2 + dx, y = n / 2 + dy;
    if ([[0, 0], [1, 0], [0, 1], [1, 1]].every(([i, j]) => g.map.tiles[idx(g, x + i, y + j)] !== 1 && !g.occAt(x + i, y + j))) spot = { x, y };
  }
  const t = g.addBuilding('tower', 0, spot.x, spot.y, true), c = centerOf(t), d = 8.9 / Math.SQRT2;
  assert.equal(t.range, 9);
  const v = g.spawnUnit('villager', 1, c.x - d, c.y - d), i = idx(g, Math.floor(v.x), Math.floor(v.y));
  assert.ok(Math.hypot(v.x - c.x, v.y - c.y) < t.range, 'inside the tower range');
  t.sight = 8; updateVision(g); assert.equal(g.players[0].visible[i], 0, 'control: at the old sight 8 its tile is in fog');
  for (let k = 0; k < 8; k++) g.tick();
  assert.equal(v.hp, v.maxHp, 'control: so the tower never shoots it');
  t.sight = BUILDINGS.tower.sight;
  for (let k = 0; k < 8 && v.hp === v.maxHp; k++) g.tick(); // vision refreshes every 4 ticks, then the tower fires
  assert.equal(g.players[0].visible[i], 1, 'sight 10 reaches it');
  assert.ok(v.hp < v.maxHp, 'and the tower shoots it');
});

// --- wall command: not enough stone (Task 17) ---
test('a wall line over free ground with too little stone for one segment fails with resources; an all-blocked line still fails with placement', () => {
  const g = wallGame(4), p = g.players[0], vs = villagers(g), ids = vs.map(v => v.id), { x, y } = clearBlock(g, 3, 1);
  const orders = vs.map(v => v.order), line = lineTiles({ x, y }, { x: x + 2, y });
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: line }), { ok: false, reason: 'resources' }, 'free tiles, 4 stone: the first segment is unaffordable');
  assert.equal(p.res.stone, 4); assert.equal(wallsOf(g).length, 0); assert.deepEqual(vs.map(v => v.order), orders, 'nothing is spent, placed or ordered');
  // a blocked tile before the first free one is skipped, then the free one cannot be paid for: still resources
  p.res.stone = 5; assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: [{ x, y }] }), { ok: true, placed: 1 });
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: line }), { ok: false, reason: 'resources' }, 'the foundation at the start is skipped free, the next tile is unaffordable');
  // every tile blocked: placement, whether or not there is stone
  p.res.stone = 5; assert.ok(g.command(0, { type: 'wall', ids, tiles: [{ x: x + 1, y }] }).ok);
  p.res.stone = 5; assert.ok(g.command(0, { type: 'wall', ids, tiles: [{ x: x + 2, y }] }).ok);
  assert.equal(p.res.stone, 0);
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: line }), { ok: false, reason: 'placement' }, 'every tile has a foundation and there is no stone');
  p.res.stone = 100;
  assert.deepEqual(g.command(0, { type: 'wall', ids, tiles: line }), { ok: false, reason: 'placement' }, 'every tile has a foundation, plenty of stone');
  assert.equal(p.res.stone, 100); assert.equal(wallsOf(g).length, 3);
});
