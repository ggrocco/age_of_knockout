import test from 'node:test'; import assert from 'node:assert/strict';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { AGES, AGE_COST, AGE_NAME, AGE_TITLE, ageLabel, ageTitle } from '../src/data/ages.js';
const costOk = c => Object.values(c).every(v => v >= 0);
test('units valid', () => {
  for (const [id, u] of Object.entries(UNITS)) {
    assert.ok(costOk(u.cost), id); assert.ok(AGES.includes(u.age), id); assert.ok(u.hp > 0 && u.speed > 0, id);
  }
});
test('buildings valid and trains exist', () => {
  for (const [id, b] of Object.entries(BUILDINGS)) {
    assert.ok(costOk(b.cost), id); assert.ok(AGES.includes(b.age), id);
    for (const t of b.trains || []) assert.ok(UNITS[t], `${id} trains ${t}`);
  }
});
test('every trainable unit has a building; ages have costs', () => {
  const trainable = new Set(Object.values(BUILDINGS).flatMap(b => b.trains || []));
  for (const [id, u] of Object.entries(UNITS)) if (u.trainable !== false) assert.ok(trainable.has(id), id);
  for (const a of AGES.slice(1)) assert.ok(AGE_COST[a]);
});
test('era chain: order, age-up costs and names', () => {
  assert.deepEqual(AGES, ['stone', 'tool', 'bronze', 'iron', 'medieval', 'sail', 'industrial', 'modern', 'future']);
  assert.deepEqual(AGE_COST.medieval, { cost: { food: 1100, wood: 200, gold: 900, stone: 0 }, time: 50 });
  assert.deepEqual(AGE_COST.sail, { cost: { food: 1200, wood: 400, gold: 1000, stone: 100 }, time: 55 });
  assert.deepEqual(AGE_COST.industrial, { cost: { food: 1400, wood: 400, gold: 1100, stone: 200 }, time: 60 });
  assert.deepEqual(AGE_COST.modern, { cost: { food: 1600, wood: 0, gold: 1300, stone: 300 }, time: 65 });
  assert.deepEqual(AGE_COST.future, { cost: { food: 1800, wood: 0, gold: 1500, stone: 400 }, time: 70 });
  for (let i = 2; i < AGES.length; i++) for (const k of ['food', 'gold']) assert.ok(AGE_COST[AGES[i]].cost[k] >= AGE_COST[AGES[i - 1]].cost[k], `${AGES[i]} ${k}`);
  for (const a of AGES) { assert.ok(AGE_NAME[a], a); assert.ok(AGE_TITLE[a], a); }
});
test('ageTitle is the sentence form of an era', () => {
  assert.deepEqual(['iron', 'medieval', 'sail', 'future'].map(ageTitle), ['Iron Age', 'Medieval Age', 'Age of Sail', 'AI Future Age']);
  assert.equal(ageLabel('sail'), 'Age of Sail');
});
test('future units: class, age and training building', () => {
  const want = { drone: ['archer', 'airfield'], mech: ['inf', 'barracks'], railgun: ['siege', 'government_center'] };
  for (const [id, [cls, bld]] of Object.entries(want)) {
    assert.equal(UNITS[id].age, 'future', id); assert.equal(UNITS[id].cls, cls, id);
    assert.ok(BUILDINGS[bld].trains.includes(id), `${bld} trains ${id}`);
  }
  assert.ok(UNITS.railgun.splash > 0 && UNITS.railgun.range > UNITS.catapult.range);
});
test('era units: era, class and training building', () => {
  const want = { knight: ['medieval', 'cav', 'stable'], crossbowman: ['medieval', 'archer', 'archery_range'], trebuchet: ['medieval', 'siege', 'castle'],
    musketeer: ['sail', 'archer', 'barracks'], cannon: ['sail', 'siege', 'castle'], rifleman: ['industrial', 'archer', 'barracks'],
    field_artillery: ['industrial', 'siege', 'factory'], machine_gunner: ['modern', 'archer', 'barracks'], tank: ['modern', 'armor', 'factory'],
    armored_train: ['industrial', 'armor', 'railway_station'] };
  for (const [id, [age, cls, bld]] of Object.entries(want)) { assert.equal(UNITS[id].age, age, id); assert.equal(UNITS[id].cls, cls, id); assert.ok(BUILDINGS[bld].trains.includes(id), `${bld} trains ${id}`); }
  assert.equal(BUILDINGS.castle.age, 'medieval'); assert.equal(BUILDINGS.factory.age, 'industrial');
  for (const [id, u] of Object.entries(UNITS)) if (u.cls === 'siege' && id !== 'railgun') assert.ok(u.range < UNITS.railgun.range, id);
});
test('ageLabel returns display names', () => { assert.equal(ageLabel('future'), 'AI Future'); assert.equal(ageLabel('iron'), 'Iron'); });
