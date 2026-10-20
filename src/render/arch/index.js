// Building design registry: which design a building shows in an era. Kept designs and eras without their own design
// render today's models (legacy.js); the rest come from DESIGNS, one module per era, built with the kit.
import { ageIndex } from '../../data/ages.js';
import { BUILDINGS } from '../../data/buildings.js';
import { styleOf } from '../styles.js';
import { legacyGeos } from './legacy.js';
import { designCtx, finish } from './kit.js';
import * as stone from './stone.js';
import * as bronze from './bronze.js';
import * as iron from './iron.js';
import * as medieval from './medieval.js';
import * as sail from './sail.js';
import * as industrial from './industrial.js';
import * as modern from './modern.js';
import * as future from './future.js';

// Today's looks that stay, byte-identical (pinned by test/fixtures/kept-buildings.json).
export const KEPT = {
  tool: ['town_center', 'house', 'granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market'],
  iron: ['town_center', 'house', 'government_center', 'wonder'],
  medieval: ['castle'],
  industrial: ['factory'],
};
// Per era, type → design(ctx), which draws into ctx and returns its scaffold height (the body's top). Each era module
// exports one design function per building type.
export const DESIGNS = { stone, bronze, iron, medieval, sail, industrial, modern, future };

// Before a building unlocks (gallery, debug) it shows its unlock-era design.
export const designAge = (type, age) => {
  const unlock = BUILDINGS[type]?.age ?? age;
  return ageIndex(age) < ageIndex(unlock) ? unlock : age;
};

// The key also names the model cache entry, so it must determine the geometry: legacy eras that share a style share it.
export function designOf(type, age) {
  const a = designAge(type, age);
  if (KEPT[a]?.includes(type)) return { key: `kept:${a}`, kind: 'kept', age: a };
  if (DESIGNS[a]?.[type]) return { key: a, kind: 'design', age: a };
  return { key: `legacy:${styleOf(a).key}`, kind: 'legacy', age: a };
}

export function archGeos(type, team, size, age) {
  const d = designOf(type, age);
  if (d.kind !== 'design') return legacyGeos(type, team, size, d.age);
  const ctx = designCtx(type, team, size, d.age);
  return finish(ctx, DESIGNS[d.age][type](ctx));
}
