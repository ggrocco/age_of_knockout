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
const at = Object.fromEntries(AGES.map((a, i) => [a, i]));
const total = c => RES.reduce((s, k) => s + (c[k] || 0), 0);
export const trainerOf = unit => Object.keys(BUILDINGS).find(b => BUILDINGS[b].trains?.includes(unit));
// Tower damage per second (the sim runs 20 ticks a second); null before the Tool Age, which has no Towers.
export const towerDps = age => TOWER[age] ? Math.round(TOWER[age].atk * 20 / TOWER[age].cooldown * 10) / 10 : null;

// One entry per Age, in order: what leaving it needs, and what it brings.
export function ladder() {
  return AGES.map((id, i) => {
    const next = AGES[i + 1] ?? null, gates = next ? ageBuildings(id) : [];
    return {
      id, i, title: ageTitle(id), next,
      advance: next ? { cost: AGE_COST[next].cost, time: AGE_COST[next].time, need: ageUpNeed(id), gates } : null,
      buildings: Object.keys(BUILDINGS).filter(b => BUILDINGS[b].age === id).map(b => ({
        id: b, name: BUILDINGS[b].name, cost: BUILDINGS[b].cost, buildTime: BUILDINGS[b].buildTime,
        gate: gates.includes(b), trains: BUILDINGS[b].trains ?? [] })),
      units: Object.keys(UNITS).filter(u => UNITS[u].age === id && UNITS[u].trainable !== false).map(u => {
        const b = trainerOf(u);
        return { id: u, name: UNITS[u].name, cls: UNITS[u].cls, at: b, atName: BUILDINGS[b].name, older: at[BUILDINGS[b].age] < i };
      }),
      techs: Object.keys(TECHS).filter(t => TECHS[t].age === id).map(t => ({
        id: t, name: TECHS[t].name, at: TECHS[t].building, atName: BUILDINGS[TECHS[t].building].name,
        desc: TECHS[t].desc, requires: TECHS[t].requires ? TECHS[TECHS[t].requires].name : null })),
      grows: { pop: AGE_POP_LIMIT[id], farmFood: FARM[id].amount, farmSpeed: FARM[id].rate, towerDps: towerDps(id), wallHp: WALL_HP[id] ?? null },
    };
  });
}

// The price of each age-up: the research, plus (`withGates`) the cheapest buildings that satisfy the gate, and the time
// that takes with one builder.
export function jumps(ages = ladder()) {
  return ages.filter(a => a.advance).map(a => {
    const gates = a.buildings.filter(b => b.gate).sort((x, y) => total(x.cost) - total(y.cost)).slice(0, a.advance.need);
    const gateCost = Object.fromEntries(RES.map(k => [k, gates.reduce((s, b) => s + (b.cost[k] || 0), 0)]));
    return { from: a.id, to: a.next, cost: a.advance.cost, gateCost, gates: gates.map(b => b.id),
      time: a.advance.time, timeWithGates: a.advance.time + gates.reduce((s, b) => s + b.buildTime, 0) };
  });
}

// What gets better by itself on arrival, one series per stat (null where the stat does not exist yet).
export const GROWTH = [
  { key: 'pop', label: 'Population limit' }, { key: 'farmFood', label: 'Farm food held' }, { key: 'farmSpeed', label: 'Farm work speed' },
  { key: 'towerDps', label: 'Tower damage / sec' }, { key: 'wallHp', label: 'Wall HP' },
];

// Evolution problems the data shows. Each check returns null once the problem is gone, so the page drops it on its own.
// Problems in the HUD (no arrival message, the Advance tile's "+2 bldgs") are not visible here; progress.md lists them.
export function findings(ages = ladder()) {
  const by = Object.fromEntries(ages.map(a => [a.id, a])), out = [];
  const add = (sev, title, text, fix) => out.push({ sev, title, text, fix });

  const idle = ages.filter(a => a.i >= at.bronze).flatMap(a => a.buildings.filter(b => b.gate && !b.trains.length));
  if (idle.length) add('high', `${idle.length} gate building${idle.length > 1 ? 's' : ''} train nothing`,
    `${idle.map(b => b.name).join(', ')} only unlock the next Age and research one upgrade each. Players build them to advance and never click them again.`,
    'Give each one a unit, a second upgrade or a passive effect, or tag them "Gate" in the build menu so the player knows why they are building them.');

  const siege = Object.keys(UNITS).filter(u => UNITS[u].cls === 'siege');
  if (!siege.some(u => BUILDINGS.siege_workshop.trains?.includes(u))) add('high', 'The Siege Workshop makes no siege',
    `Siege comes from elsewhere: ${siege.map(u => `${UNITS[u].name} from the ${BUILDINGS[trainerOf(u)].name}`).join(', ')}.`,
    'Move siege production to the Siege Workshop (as the Combat Drone moved to the Airfield), or rename it to match what it does.');

  const old = ages.flatMap(a => a.units.filter(u => u.older));
  if (old.length) {
    const top = Object.entries(Object.groupBy(old, u => u.atName)).sort((x, y) => y[1].length - x[1].length)[0];
    const eras = ages.filter(a => a.units.some(u => u.atName === top[0])).length;
    add('med', 'New units appear quietly in old buildings',
      `${old.length} units unlock inside a building from an earlier Age. The ${top[0]} gets a new unit in ${eras} of ${ages.length} Ages, and nothing points the player back to it.`,
      'After an Age-up, badge the buildings that gained a unit or upgrade ("New") until the player opens them.');
  }

  for (let i = 1; i < ages.length; i++) {
    const p = TOWER[ages[i - 1].id], t = TOWER[ages[i].id];
    if (p && t && t.atk < p.atk && towerDps(ages[i].id) > towerDps(ages[i - 1].id)) {
      add('low', 'Tower attack drops in the tooltip while it gets stronger',
        `${ages[i - 1].title} Towers hit for ${p.atk}; ${ages[i].title} Towers hit for ${t.atk} but fire faster (${towerDps(ages[i - 1].id)} → ${towerDps(ages[i].id)} damage per second). Read as a stat, it looks like a downgrade.`,
        'Show damage per second wherever tower stats appear.');
      break;
    }
  }

  if (ageBuildings('stone').includes('house')) add('low', 'Houses open the Tool Age',
    'The House counts as a Stone Age gate, so a House and a Granary pass the first gate without a Barracks. In AoE1 Houses did not count.',
    'Mark the House like the Farm (it never counts), or say so in the Advance tooltip.');

  const last = ages.at(-1);
  if (!last.buildings.length) add('low', 'The top of the ladder is thin',
    `${last.title} adds ${last.units.length} units and ${last.techs.length} upgrade${last.techs.length === 1 ? '' : 's'} but no buildings, after the most expensive age-up (${total(AGE_COST[last.id].cost).toLocaleString('en')} resources, ${AGE_COST[last.id].time}s).`,
    `Give ${last.title} a signature building or a capstone upgrade so the last jump feels like an arrival.`);

  const w = BUILDINGS.wonder;
  if (w && by[w.age]?.advance && !by[w.age].advance.gates.includes('wonder')) add('low', `The Wonder sits in the ${ageTitle(w.age)} but never counts`,
    `A player who builds a Wonder (${RES.filter(k => w.cost[k]).map(k => w.cost[k]).join(' / ')}) still needs ${by[w.age].advance.gates.map(g => `the ${BUILDINGS[g].name}`).join(' and ')} to advance.`,
    'Add "Does not count toward advancing" to the Wonder, Farm, Mine, Tower and Wall tooltips.');
  return out;
}
