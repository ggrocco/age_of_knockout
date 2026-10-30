import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGES } from '../src/data/ages.js';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { galleryRows, unitGalleryRows, unitFacts, buildingFacts, trainsBy, upgradesAt } from '../src/gallery/rows.js';
import { TECHS } from '../src/data/techs.js';

test('buildings gallery has a row for every building and a cell for every age', () => {
  const rows = galleryRows();
  assert.deepEqual(rows.map(r => r.type).sort(), Object.keys(BUILDINGS).sort());
  for (const row of rows) {
    assert.deepEqual(row.cells.map(c => c.age), AGES, row.type);
    const first = row.cells.findIndex(c => c.available);
    assert.equal(row.cells[first].age, BUILDINGS[row.type].age, `${row.type}: shown before it unlocks`);
    assert.ok(row.cells.slice(first).every(c => c.available), `${row.type}: disappears in a later age`);
    assert.equal(row.cells.filter(c => c.unlocks).length, 1, `${row.type}: one NEW badge`);
  }
});

test('buildings gallery picks up new ages and buildings from the tables', () => {
  const buildings = { ...BUILDINGS, space_port: { ...BUILDINGS.market, name: 'Space Port', age: 'future' } };
  const rows = galleryRows(buildings, [...AGES, 'space']);
  for (const row of rows) {
    const space = row.cells.at(-1);
    assert.ok(space.age === 'space' && space.available && !space.unlocks, `${row.type}: missing from a new age`);
  }
  const port = rows.find(r => r.type === 'space_port');
  assert.ok(port, 'new building gets a row');
  assert.deepEqual(port.cells.filter(c => c.available).map(c => c.age), ['future', 'space']);
  assert.equal(rows.at(-1).type, 'space_port', 'rows are ordered by unlock age');
});

test('buildings gallery facts and trainable units come from the data', () => {
  assert.ok(buildingFacts(BUILDINGS.town_center).includes('200 wood, 100 stone'));
  assert.deepEqual(trainsBy(BUILDINGS.barracks, 'stone'), ['Clubman', 'Slinger']);
  assert.ok(trainsBy(BUILDINGS.barracks, 'future').includes('Mech Walker'));
});

test('buildings.html uses the same three.js import map as the game', () => {
  const importMap = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').match(/<script type="importmap">(.*?)<\/script>/s)[1];
  assert.equal(importMap('buildings.html'), importMap('index.html'));
});

test('buildings gallery names eras by their title, never "Sail Age"', () => {
  const facts = buildingFacts({ ...BUILDINGS.market, age: 'sail' }).join(' ');
  assert.match(facts, /Age of Sail/); assert.doesNotMatch(facts, /Sail age|Sail Age|Age of Sail age/i);
  assert.match(buildingFacts(BUILDINGS.castle).join(' '), /Medieval Age/);
});

test('buildings gallery shows each upgrade once, in the age it unlocks at its building', () => {
  assert.deepEqual(upgradesAt('academy', 'iron'), [{ name: 'Phalanx Drill', desc: TECHS.phalanx_drill.desc }]);
  assert.deepEqual(upgradesAt('academy', 'medieval'), [], 'not repeated in later ages');
  assert.deepEqual(upgradesAt('market', 'tool').map(u => u.name), ['Woodworking', 'Gold Mining']);
  const shown = Object.keys(BUILDINGS).flatMap(type => AGES.flatMap(age => upgradesAt(type, age).map(u => u.name)));
  assert.deepEqual(shown.sort(), Object.values(TECHS).map(t => t.name).sort(), 'every upgrade appears exactly once');
});

test('unit evolution gallery includes every unit only from its unlock era onward', () => {
  const rows = unitGalleryRows();
  assert.deepEqual(rows.map(r => r.type).sort(), Object.keys(UNITS).sort());
  for (const row of rows) {
    const first = row.cells.findIndex(c => c.available);
    assert.equal(row.cells[first].age, UNITS[row.type].age, row.type);
    assert.ok(row.cells.slice(first).every(c => c.available), row.type);
    assert.equal(row.cells.filter(c => c.unlocks).length, 1, row.type);
    assert.deepEqual(row.cells.map(c => c.age), AGES);
  }
  const future = { ...UNITS, worker_bot: { ...UNITS.villager, age: 'future' } };
  assert.ok(unitGalleryRows(future, [...AGES, 'space']).every(r => r.cells.at(-1).available));
  assert.ok(unitGalleryRows(future).some(r => r.type === 'worker_bot'));
});

test('unit gallery facts identify training locations, civilian ships and scenario units', () => {
  assert.ok(unitFacts('villager', UNITS.villager).includes('Trained at: Town Center'));
  assert.ok(unitFacts('fishing_ship', UNITS.fishing_ship).includes('Trained at: Dock'));
  assert.ok(unitFacts('fishing_ship', UNITS.fishing_ship).includes('Carries 15 fish'));
  assert.ok(unitFacts('transport_ship', UNITS.transport_ship).includes('Carries 8 passengers'));
  assert.ok(unitFacts('king', UNITS.king).includes('Scenario unit'));
});
