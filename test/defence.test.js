import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace, ageUpNeed, ageBuildings } from '../src/sim/commands.js';
import { scoreOf, isEliminated } from '../src/rounds/index.js';
import { AGES } from '../src/data/ages.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { TOWER, WALL_HP, defenceStats } from '../src/data/defences.js';

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
