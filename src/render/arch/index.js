// Building design registry: which design a building shows in an era. Kept designs and eras without their own design
// render today's models (legacy.js); the rest come from DESIGNS, one module per era, built with the kit.
import { ageIndex } from '../../data/ages.js';
import { BUILDINGS } from '../../data/buildings.js';
import { styleOf } from '../styles.js';
import { legacyGeos } from './legacy.js';
import { designCtx, finish } from './kit.js';
import * as stone from './stone.js';
import * as tool from './tool.js';
import * as bronze from './bronze.js';
import * as iron from './iron.js';
import * as medieval from './medieval.js';
import * as sail from './sail.js';
import * as industrial from './industrial.js';
import * as modern from './modern.js';
import * as future from './future.js';
import { mine } from './mine.js';
import { dock } from './dock.js';
import { GATES } from './gates.js';

// Today's looks that stay, byte-identical (pinned by test/fixtures/kept-buildings.json).
export const KEPT = {
  tool: ['town_center', 'house', 'granary', 'storage_pit', 'farm', 'barracks', 'archery_range', 'stable', 'market'],
  iron: ['town_center', 'house', 'government_center', 'wonder'],
  medieval: ['castle'],
  industrial: ['factory'],
};
// Per era, type → design(ctx), which draws into ctx and returns its scaffold height (the body's top). Each era module
// exports one design function per building type.
const ERA_MODULES = { stone, tool, bronze, iron, medieval, sail, industrial, modern, future };
// The gate buildings (gates.js) have one design for every era from their unlock on, added to each era here.
const gatesStandingIn = age => Object.fromEntries(
  Object.entries(GATES).filter(([type]) => ageIndex(age) >= ageIndex(BUILDINGS[type].age)));
export const DESIGNS = Object.fromEntries(
  Object.entries(ERA_MODULES).map(([age, designs]) => [age, { ...designs, ...gatesStandingIn(age) }]));

// Before a building unlocks (gallery, debug) it shows its unlock-era design.
export const designAge = (type, age) => {
  const unlock = BUILDINGS[type]?.age ?? age;
  return ageIndex(age) < ageIndex(unlock) ? unlock : age;
};

// The key also names the model cache entry, so it must determine the geometry: legacy eras that share a style share it.
export function designOf(type, age) {
  const shownAge = designAge(type, age);
  // The Mine and the Dock are one design each (mine.js, dock.js) that changes with the era.
  if (type === 'mine' || type === 'dock') return { key: `${type}:${shownAge}`, kind: 'design', age: shownAge };
  if (KEPT[shownAge]?.includes(type)) return { key: `kept:${shownAge}`, kind: 'kept', age: shownAge };
  if (DESIGNS[shownAge]?.[type]) return { key: shownAge, kind: 'design', age: shownAge };
  return { key: `legacy:${styleOf(shownAge).key}`, kind: 'legacy', age: shownAge };
}

const designFunction = (type, age) => {
  if (type === 'mine') return mine;
  if (type === 'dock') return dock;
  return DESIGNS[age][type];
};

export function archGeos(type, team, size, age) {
  const design = designOf(type, age);
  if (design.kind !== 'design') return legacyGeos(type, team, size, design.age);
  const ctx = designCtx(type, team, size, design.age);
  return finish(ctx, designFunction(type, design.age)(ctx));
}
