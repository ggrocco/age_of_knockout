// Age ladder page (ages.html): everything each Age needs, costs, brings and grows, built from the data tables and the
// age-up rule, plus the evolution problems the tables show. DOM-free so it is tested headlessly (test/ladder.test.js).
import { AGES, AGE_COST, AGE_POP_LIMIT, ageTitle } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNITS } from '../data/units.js';
import { TECHS } from '../data/techs.js';
import { TOWER, WALL_HP } from '../data/defences.js';
import { FARM } from '../data/farms.js';
import { ageBuildings, ageUpNeed } from '../sim/commands.js';

export const RES = ['food', 'wood', 'gold', 'stone'];
const ageIndexOf = Object.fromEntries(AGES.map((age, i) => [age, i]));
const total = cost => RES.reduce((sum, res) => sum + (cost[res] || 0), 0);
const plural = (count, word) => `${word}${count === 1 ? '' : 's'}`;
export const trainerOf = unit => Object.keys(BUILDINGS).find(b => BUILDINGS[b].trains?.includes(unit));
// Tower damage per second (the sim runs 20 ticks a second); null before the Tool Age, which has no Towers.
export const towerDps = age => TOWER[age] ? Math.round(TOWER[age].atk * 20 / TOWER[age].cooldown * 10) / 10 : null;

// The Age's buildings; `gate` marks those that count toward advancing.
const ageBuildingList = (id, gates) => Object.keys(BUILDINGS).filter(b => BUILDINGS[b].age === id).map(b => ({
  id: b, name: BUILDINGS[b].name, cost: BUILDINGS[b].cost, buildTime: BUILDINGS[b].buildTime,
  gate: gates.includes(b), trains: BUILDINGS[b].trains ?? [],
}));
// The Age's trainable units and where they are trained; `older` when that building is from an earlier Age.
const ageUnitList = (id, i) => Object.keys(UNITS).filter(u => UNITS[u].age === id && UNITS[u].trainable !== false).map(u => {
  const trainer = trainerOf(u);
  return {
    id: u, name: UNITS[u].name, cls: UNITS[u].cls, at: trainer, atName: BUILDINGS[trainer].name,
    older: ageIndexOf[BUILDINGS[trainer].age] < i,
  };
});
// The Age's upgrades, where they are researched and what they require.
const ageTechList = id => Object.keys(TECHS).filter(t => TECHS[t].age === id).map(t => ({
  id: t, name: TECHS[t].name, at: TECHS[t].building, atName: BUILDINGS[TECHS[t].building].name,
  desc: TECHS[t].desc, requires: TECHS[t].requires ? TECHS[TECHS[t].requires].name : null,
}));
const ageGrowth = id => ({
  pop: AGE_POP_LIMIT[id], farmFood: FARM[id].amount, farmSpeed: FARM[id].rate, towerDps: towerDps(id), wallHp: WALL_HP[id] ?? null,
});

// One entry per Age, in order: what leaving it needs, and what it brings.
export function ladder() {
  return AGES.map((id, i) => {
    const next = AGES[i + 1] ?? null, gates = next ? ageBuildings(id) : [];
    return {
      id, i, title: ageTitle(id), next,
      advance: next ? { cost: AGE_COST[next].cost, time: AGE_COST[next].time, need: ageUpNeed(id), gates } : null,
      buildings: ageBuildingList(id, gates),
      units: ageUnitList(id, i),
      techs: ageTechList(id),
      grows: ageGrowth(id),
    };
  });
}

// The price of each age-up: the research, plus (`withGates`) the cheapest buildings that satisfy the gate, and the time
// that takes with one builder.
export function jumps(ages = ladder()) {
  return ages.filter(age => age.advance).map(age => {
    const gates = age.buildings.filter(b => b.gate).sort((x, y) => total(x.cost) - total(y.cost)).slice(0, age.advance.need);
    const gateCost = Object.fromEntries(RES.map(res => [res, gates.reduce((sum, b) => sum + (b.cost[res] || 0), 0)]));
    return {
      from: age.id, to: age.next, cost: age.advance.cost, gateCost, gates: gates.map(b => b.id),
      time: age.advance.time, timeWithGates: age.advance.time + gates.reduce((sum, b) => sum + b.buildTime, 0),
    };
  });
}

// What gets better by itself on arrival, one series per stat (null where the stat does not exist yet).
export const GROWTH = [
  { key: 'pop', label: 'Population limit' }, { key: 'farmFood', label: 'Farm food held' },
  { key: 'farmSpeed', label: 'Farm work speed' }, { key: 'towerDps', label: 'Tower damage / sec' }, { key: 'wallHp', label: 'Wall HP' },
];

// ---------- findings ----------
// Each check returns a finding ({ sev, title, text, fix }) or null once the problem is gone.
const finding = (sev, title, text, fix) => ({ sev, title, text, fix });

function idleGates(ages) {
  const idle = ages.filter(a => a.i >= ageIndexOf.bronze).flatMap(a => a.buildings.filter(b => b.gate && !b.trains.length));
  if (!idle.length) return null;
  return finding('high', `${idle.length} gate building${idle.length > 1 ? 's' : ''} train nothing`,
    `${idle.map(b => b.name).join(', ')} only unlock the next Age and research one upgrade each. `
      + 'Players build them to advance and never click them again.',
    'Give each one a unit, a second upgrade or a passive effect, or tag them "Gate" in the build menu so the player knows '
      + 'why they are building them.');
}

function siegeElsewhere() {
  const siege = Object.keys(UNITS).filter(u => UNITS[u].cls === 'siege');
  if (siege.some(u => BUILDINGS.siege_workshop.trains?.includes(u))) return null;
  return finding('high', 'The Siege Workshop makes no siege',
    `Siege comes from elsewhere: ${siege.map(u => `${UNITS[u].name} from the ${BUILDINGS[trainerOf(u)].name}`).join(', ')}.`,
    'Move siege production to the Siege Workshop (as the Combat Drone moved to the Airfield), or rename it to match what it does.');
}

function quietUnits(ages) {
  const old = ages.flatMap(a => a.units.filter(u => u.older));
  if (!old.length) return null;
  // The building that gains the most units from later Ages.
  const [busiest] = Object.entries(Object.groupBy(old, u => u.atName)).sort((x, y) => y[1].length - x[1].length)[0];
  const eras = ages.filter(a => a.units.some(u => u.atName === busiest)).length;
  return finding('med', 'New units appear quietly in old buildings',
    `${old.length} units unlock inside a building from an earlier Age. The ${busiest} gets a new unit in ${eras} of `
      + `${ages.length} Ages, and nothing points the player back to it.`,
    'After an Age-up, badge the buildings that gained a unit or upgrade ("New") until the player opens them.');
}

// The first Age where a Tower's attack falls while its damage per second rises.
function towerAttackDrop(ages) {
  for (let i = 1; i < ages.length; i++) {
    const before = ages[i - 1], after = ages[i], previous = TOWER[before.id], tower = TOWER[after.id];
    if (!(previous && tower && tower.atk < previous.atk && towerDps(after.id) > towerDps(before.id))) continue;
    return finding('low', 'Tower attack drops in the tooltip while it gets stronger',
      `${before.title} Towers hit for ${previous.atk}; ${after.title} Towers hit for ${tower.atk} but fire faster `
        + `(${towerDps(before.id)} → ${towerDps(after.id)} damage per second). Read as a stat, it looks like a downgrade.`,
      'Show damage per second wherever tower stats appear.');
  }
  return null;
}

function houseGate() {
  if (!ageBuildings('stone').includes('house')) return null;
  return finding('low', 'Houses open the Tool Age',
    'The House counts as a Stone Age gate, so a House and a Granary pass the first gate without a Barracks. '
      + 'In AoE1 Houses did not count.',
    'Mark the House like the Farm (it never counts), or say so in the Advance tooltip.');
}

function thinTop(ages) {
  const last = ages.at(-1);
  if (last.buildings.length) return null;
  const cost = AGE_COST[last.id];
  return finding('low', 'The top of the ladder is thin',
    `${last.title} adds ${last.units.length} units and ${last.techs.length} ${plural(last.techs.length, 'upgrade')} but no buildings, `
      + `after the most expensive age-up (${total(cost.cost).toLocaleString('en')} resources, ${cost.time}s).`,
    `Give ${last.title} a signature building or a capstone upgrade so the last jump feels like an arrival.`);
}

function wonderNeverCounts(ages) {
  const wonder = BUILDINGS.wonder, byId = Object.fromEntries(ages.map(a => [a.id, a]));
  if (!wonder || !byId[wonder.age]?.advance || byId[wonder.age].advance.gates.includes('wonder')) return null;
  const price = RES.filter(res => wonder.cost[res]).map(res => wonder.cost[res]).join(' / ');
  const needed = byId[wonder.age].advance.gates.map(g => `the ${BUILDINGS[g].name}`).join(' and ');
  return finding('low', `The Wonder sits in the ${ageTitle(wonder.age)} but never counts`,
    `A player who builds a Wonder (${price}) still needs ${needed} to advance.`,
    'Add "Does not count toward advancing" to the Wonder, Farm, Mine, Tower and Wall tooltips.');
}

// Evolution problems the data shows. Each check returns null once the problem is gone, so the page drops it on its own.
// Problems in the HUD (no arrival message, the Advance tile's "+2 bldgs") are not visible here; progress.md lists them.
export function findings(ages = ladder()) {
  const checks = [
    idleGates(ages), siegeElsewhere(), quietUnits(ages), towerAttackDrop(ages), houseGate(), thinTop(ages), wonderNeverCounts(ages),
  ];
  return checks.filter(Boolean);
}
