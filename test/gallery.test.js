import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGES } from '../src/data/ages.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { galleryRows, buildingFacts, trainsBy } from '../src/gallery/rows.js';

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
