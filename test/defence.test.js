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
import { centerOf } from '../src/sim/util.js';

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
