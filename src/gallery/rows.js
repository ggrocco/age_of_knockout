// Buildings-by-era gallery layout, derived only from the data tables so new ages and
// buildings show up without touching the page. DOM- and three-free so tests can check it.
import { AGES, ageIndex, ageTitle } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { TECHS } from '../data/techs.js';

const RES = ['food', 'wood', 'gold', 'stone'];

// One row per building, one cell per age: available from its unlock age onward.
export function galleryRows(buildings = BUILDINGS, ages = AGES) {
  const idx = a => ages.indexOf(a);
  return Object.entries(buildings)
    .sort(([, a], [, b]) => idx(a.age) - idx(b.age))
    .map(([type, spec]) => ({
      type, spec, name: spec.name, unlock: spec.age,
      cells: ages.map(age => ({
        age, available: idx(age) >= idx(spec.age), unlocks: age === spec.age,
      })),
    }));
}

// Plain-text facts for the row header, all read from the tables.
export function buildingFacts(spec) {
  const cost = RES.filter(r => spec.cost[r]).map(r => `${spec.cost[r]} ${r}`).join(', ') || 'free';
  const facts = [ageTitle(spec.age), `${spec.size}×${spec.size}`, `${spec.hp} hp`, cost, `${spec.buildTime}s`];
  if (spec.pop) facts.push(`+${spec.pop} pop`);
  if (spec.drops) facts.push(`drop: ${spec.drops.join('/')}`);
  if (spec.extra) facts.push('extra');
  return facts;
}

// Units this building can train by the given age (unknown unit ids are kept, by id).
export function trainsBy(spec, age) {
  return (spec.trains || []).filter(u => !UNITS[u] || ageIndex(UNITS[u].age) <= ageIndex(age)).map(u => UNITS[u]?.name ?? u);
}

// Upgrades this building can research from the given age on (those that unlock exactly then), with what they do.
export function upgradesAt(type, age) {
  return Object.values(TECHS).filter(t => t.building === type && t.age === age).map(t => ({ name: t.name, desc: t.desc }));
}
