// Hashes the geometry of the designs that stay unchanged through the era-architecture work.
// Run directly to print the fixture JSON: node test/tools/hash-buildings.js > test/fixtures/kept-buildings.json
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildModel } from '../../src/render/models.js';
import { BUILDINGS } from '../../src/data/buildings.js';

const KEPT = {
  tool: ['town_center', 'house', 'granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market'],
  iron: ['town_center', 'house', 'government_center', 'wonder'],
  medieval: ['castle'],
  industrial: ['factory'],
};

export function hashBuildings() {
  const out = {};
  for (const [age, types] of Object.entries(KEPT)) for (const type of types) for (const owner of [0, 1]) for (const constructed of [true, false]) {
    const model = buildModel({ kind: 'building', type, owner, size: BUILDINGS[type].size, constructed, progress: 0.5, amount: 300 }, age), h = createHash('sha1');
    model.root.traverse(o => {
      if (!o.isMesh) return;
      const { position, color } = o.geometry.attributes;
      h.update(Buffer.from(position.array.buffer, position.array.byteOffset, position.array.byteLength));
      h.update(Buffer.from(color.array.buffer, color.array.byteOffset, color.array.byteLength));
    });
    out[`${type}:${age}:${owner}:${constructed}`] = h.digest('hex');
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(hashBuildings(), null, 2));
