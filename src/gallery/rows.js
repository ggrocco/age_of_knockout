// Buildings-by-era gallery layout, derived only from the data tables so new ages and
// buildings show up without touching the page. DOM- and three-free so tests can check it.
import { AGES, ageIndex, ageTitle } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { TECHS } from '../data/techs.js';

const RES = ['food', 'wood', 'gold', 'stone'];

// One row per building, one cell per age: available from its unlock age onward.
export function galleryRows(buildings = BUILDINGS, ages = AGES) {
  const ageOrder = age => ages.indexOf(age);
  return Object.entries(buildings)
    .sort(([, a], [, b]) => ageOrder(a.age) - ageOrder(b.age))
    .map(([type, spec]) => ({
      type, spec, name: spec.name, unlock: spec.age,
      cells: ages.map(age => ({
        age, available: ageOrder(age) >= ageOrder(spec.age), unlocks: age === spec.age,
      })),
    }));
}

// Plain-text facts for the row header, all read from the tables.
export function buildingFacts(spec) {
  const cost = RES.filter(res => spec.cost[res]).map(res => `${spec.cost[res]} ${res}`).join(', ') || 'free';
  const facts = [ageTitle(spec.age), `${spec.size}×${spec.size}`, `${spec.hp} hp`, cost, `${spec.buildTime}s`];
  if (spec.pop) facts.push(`+${spec.pop} pop`);
  if (spec.drops) facts.push(`drop: ${spec.drops.join('/')}`);
  if (spec.extra) facts.push('extra');
  return facts;
}

// Units this building can train by the given age (unknown unit ids are kept, by id).
export function trainsBy(spec, age) {
  return (spec.trains || [])
    .filter(id => !UNITS[id] || ageIndex(UNITS[id].age) <= ageIndex(age))
    .map(id => UNITS[id]?.name ?? id);
}

// Upgrades this building can research from the given age on (those that unlock exactly then), with what they do.
export function upgradesAt(type, age) {
  return Object.values(TECHS)
    .filter(tech => tech.building === type && tech.age === age)
    .map(tech => ({ name: tech.name, desc: tech.desc }));
}

// Units keep one row each, including scenario-only units such as the King.
export const unitGalleryRows = (units = UNITS, ages = AGES) => galleryRows(units, ages);

export function unitFacts(type, spec) {
  const cost = RES.filter(r => spec.cost[r]).map(r => `${spec.cost[r]} ${r}`).join(', ') || 'free';
  const trainers = Object.values(BUILDINGS).filter(b => b.trains?.includes(type)).map(b => b.name);
  const facts = [ageTitle(spec.age), `${spec.hp} hp`, `${spec.atk} attack`, cost,
    trainers.length ? `Trained at: ${trainers.join(', ')}` : 'Scenario unit'];
  if (spec.naval) facts.push('Sails on water');
  if (spec.carries) facts.push(`Carries ${spec.carries} passengers`);
  if (spec.capacity) facts.push(`Carries ${spec.capacity} fish`);
  if (type === 'king') facts.push('Keeps its royal appearance');
  return facts;
}
