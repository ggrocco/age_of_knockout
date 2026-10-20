import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hashBuildings } from './tools/hash-buildings.js';
import { designOf } from '../src/render/arch/index.js';

test('kept designs stay byte-identical', () => {
  const want = JSON.parse(readFileSync(new URL('./fixtures/kept-buildings.json', import.meta.url)));
  assert.deepEqual(hashBuildings(), want);
});

test('design registry: earlier eras show the unlock-era design', () => {
  assert.equal(designOf('castle', 'stone').age, 'medieval');
});

test('design registry: kept designs and the legacy fallback', () => {
  assert.equal(designOf('house', 'tool').kind, 'kept');
  assert.equal(designOf('house', 'sail').kind, 'legacy'); // no Age of Sail House design yet
});
