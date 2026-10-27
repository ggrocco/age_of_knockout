import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AGES, AGE_COST } from '../src/data/ages.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { UNITS } from '../src/data/units.js';
import { TECHS } from '../src/data/techs.js';
import { ladder, jumps, findings, towerDps, trainerOf } from '../src/ladder/model.js';

test('the age ladder lists every Age once, and every building, trainable unit and upgrade in its unlock Age', () => {
  const ages = ladder();
  assert.deepEqual(ages.map(a => a.id), AGES);
  assert.deepEqual(ages.flatMap(a => a.buildings.map(b => b.id)).sort(), Object.keys(BUILDINGS).sort());
  assert.deepEqual(ages.flatMap(a => a.units.map(u => u.id)).sort(), Object.keys(UNITS).filter(u => UNITS[u].trainable !== false).sort());
  assert.deepEqual(ages.flatMap(a => a.techs.map(t => t.id)).sort(), Object.keys(TECHS).sort());
  for (const a of ages) for (const u of a.units) assert.ok(BUILDINGS[u.at].trains.includes(u.id), `${u.id} trained at ${u.at}`);
});
test('the ladder shows the age-up rule: every Age but the last needs 2 of its own buildings', () => {
  const ages = ladder();
  for (const a of ages.slice(0, -1)) {
    assert.equal(a.advance.need, 2, a.id); assert.deepEqual(a.advance.cost, AGE_COST[a.next].cost, a.id);
    assert.ok(a.advance.gates.length >= 2 && a.advance.gates.every(g => BUILDINGS[g].age === a.id && !BUILDINGS[g].extra), a.id);
  }
  assert.equal(ages.at(-1).advance, null);
  assert.ok(!ages.find(a => a.id === 'bronze').advance.gates.includes('wonder'), 'the Wonder never counts');
});
test('units trained in a building from an earlier Age are marked', () => {
  const units = Object.fromEntries(ladder().flatMap(a => a.units.map(u => [u.id, u])));
  assert.equal(units.musketeer.older, true, 'Barracks (Stone) trains the Age of Sail Musketeer');
  assert.equal(units.armored_train.older, false, 'the Railway Station is Industrial like the train');
  assert.equal(trainerOf('drone'), 'airfield');
});
test('the price of a jump adds the cheapest gate buildings', () => {
  const tool = jumps().find(j => j.to === 'tool');
  assert.equal(tool.gates.length, 2); assert.ok(tool.gates.includes('house'), 'the House is the cheapest Stone gate');
  assert.ok(tool.timeWithGates > tool.time);
  assert.equal(jumps().length, AGES.length - 1);
});
test('growth: towers only from the Tool Age, values never fall across the Ages', () => {
  const ages = ladder();
  assert.equal(towerDps('stone'), null); assert.equal(towerDps('iron'), 3.5);
  for (const key of ['pop', 'farmFood', 'farmSpeed', 'towerDps', 'wallHp']) {
    const vals = ages.map(a => a.grows[key]).filter(v => v != null);
    assert.ok(vals.every((v, i) => !i || v >= vals[i - 1]), key);
  }
});
test('findings are data-driven and have text', () => {
  const list = findings();
  for (const f of list) { assert.ok(['high', 'med', 'low'].includes(f.sev)); assert.ok(f.title && f.text && f.fix); assert.doesNotMatch(f.title + f.text + f.fix, /undefined|NaN/); }
  const idle = list.find(f => /gate building/.test(f.title));
  assert.ok(idle && !/Airfield|Railway Station/.test(idle.text), 'the Airfield and Railway Station now train units');
});
test('ages.html loads the ladder script through a src/ path the deploy rewrites', () => {
  assert.match(readFileSync(new URL('../ages.html', import.meta.url), 'utf8'), /<script type="module" src="src\/ladder\/main\.js"><\/script>/);
});
test('ages.html uses the same three.js import map as the game', () => {
  const importMap = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').match(/<script type="importmap">(.*?)<\/script>/s)[1];
  assert.equal(importMap('ages.html'), importMap('index.html'));
});
