// Hover descriptions and cost chips for the command tiles. DOM-free (returns HTML strings) so it is unit-testable.
import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { TECHS } from '../data/techs.js';
import { farmStats } from '../data/farms.js';
import { AGES, AGE_COST, AGE_POP_LIMIT, ageTitle } from '../data/ages.js';
import { WONDER_TICKS, RELIC_TICKS } from '../rounds/index.js';
import { ageUpNeed } from '../sim/commands.js';
import { icon } from './icons.js';

export const RES = ['food', 'wood', 'gold', 'stone'];
export const COLORS = { food: '#e0554d', wood: '#a06a35', gold: '#facc15', stone: '#9ca3af' };
const CLASS_LABEL = {
  civ: 'Worker', inf: 'Infantry', archer: 'Ranged', cav: 'Cavalry', siege: 'Siege', armor: 'Armored', ship: 'Warship', transport: 'Transport',
};

// Only claims what the sim actually does (see docs and src/sim); Market has no trade yet, it just counts toward Age-up.
export const DESC = {
  town_center: 'Your base. Trains Villagers, accepts every resource and is where you advance to the next Age.',
  house: `Raises your population cap, up to the limit of your Age (${AGE_POP_LIMIT.stone} in the Stone Age, ${AGE_POP_LIMIT.future} in AI Future). Build more when training stalls at the cap.`,
  granary: 'Drop-off point for food. Place it beside berries and farms to shorten trips.',
  storage_pit: 'Drop-off point for wood, gold and stone. Also researches weapon and armor upgrades.',
  farm: 'A field of food villagers work for a steady supply. Each Age it holds more food and is worked faster; advancing grows your Farms too.',
  barracks: 'Trains infantry and Slingers, later Musketeers, Riflemen and Machine Gunners. The Future Age adds the Mech Walker.',
  archery_range: 'Trains ranged units: Bowmen, then Crossbowmen in the Medieval Age.',
  stable: 'Trains fast cavalry: Scouts for exploring, Horse Archers for raids and armoured Knights in the Medieval Age.',
  market: 'Researches economy upgrades that speed up gathering, and counts toward leaving the Tool Age.',
  government_center: 'Trains Catapults and Railguns, researches Ballistics (+range) and accepts every resource. Later siege comes from the Castle and Factory.',
  wonder: `In the Wonder Race, keeping one standing for ${Math.round(WONDER_TICKS / 1200)} minutes wins the round.`,
  castle: 'Medieval stronghold with very heavy armour. Trains Trebuchets and Cannons, and is needed to leave the Medieval Age. In Kingdom Conquest, your King automatically shelters inside until the castle falls.',
  factory: 'Industrial Age works that builds Field Artillery and Tanks. You need one to advance out of the Industrial Age.',
  temple: 'Bronze Age shrine that researches Sacred Harvest (faster food gathering). Needed, with a Government Center, to advance out of the Bronze Age.',
  academy: 'Iron Age school of drill that researches Phalanx Drill (+20 HP for infantry). Needed, with a Siege Workshop, to advance out of the Iron Age.',
  siege_workshop: 'Iron Age workshop that researches Torsion Engines (+10 siege attack). Needed, with an Academy, to advance out of the Iron Age.',
  university: 'Medieval seat of learning that researches Masonry (faster stone quarrying). Needed, with a Castle, to advance out of the Medieval Age.',
  arsenal: 'Gunpowder store that researches Bayonets (+2 melee armor for ranged foot units). Needed, with a Trading Company, to leave the Age of Sail.',
  trading_company: 'Merchant house that researches Colonial Trade (faster gold mining). Needed, with an Arsenal, to leave the Age of Sail.',
  railway_station: 'Industrial Age station that trains Armored Trains and researches Railways (every unit moves 10% faster). Needed, with a Factory, to leave the Industrial Age.',
  power_plant: 'Modern Age generating station that researches Electrification (all gathering 10% faster). Needed, with an Airfield, to reach AI Future.',
  airfield: 'Modern Age airstrip that researches Air Support (+30 HP for Tanks and siege) and trains Combat Drones in the AI Future Age. Needed, with a Power Plant, to reach AI Future.',
  mine: 'A shaft on rocky ground. Build it on a gold vein for gold or a quarry for stone; every Mine on a patch shares its reserve, and the patch is gone when it runs dry.',
  dock: 'Harbour built on deep water against the shore. Trains ships and takes the Fishing Ships\' catch. Does not count toward advancing an Age.',
  tower: 'Shoots the nearest enemy in range, on its own. Towers built in a later Age are tougher and hit harder. Does not count toward advancing an Age.',
  wall: 'One-tile barrier that blocks every unit, yours too. It has no gates: leave a gap or delete it. Walls built in a later Age are tougher.',
  villager: 'Gathers food, wood, gold and stone and builds every structure. Weak in a fight.',
  clubman: 'Cheap melee infantry that fights well early and falls behind in later Ages.',
  axeman: 'Melee infantry with a heavier swing than the Clubman.',
  slinger: 'Cheap pierce skirmisher that throws stones from a distance. Costs a little stone.',
  bowman: 'Pierce ranged unit that shreds unarmoured infantry. Bounces off buildings and pierce-armoured foes; keep soldiers in front of it.',
  spearman: 'Sturdy melee infantry with bonus damage against cavalry. A good front line in the Tool Age.',
  hoplite: 'Heavy melee armour (5) soaks up melee hits, but arrows still get through. Hits very hard.',
  swordsman: 'The toughest infantry before the Future Age: huge health and solid melee armour.',
  scout: 'Fast cavalry with wide sight and bonus damage against infantry. Explore and pick off stray Villagers.',
  horse_archer: 'Fast pierce cavalry with 2 pierce armour, so it beats other archers. Strike and retreat.',
  catapult: 'Slow siege engine. Its shots also hurt nearby units, but it is fragile up close.',
  knight: 'Heavy Medieval cavalry with plate armour (3 melee, 2 pierce). Fast and hard-hitting, but Spearmen still punish it.',
  crossbowman: 'Medieval ranged infantry that out-ranges the Bowman and hits harder. Fragile up close; keep a front line ahead of it.',
  trebuchet: 'Medieval siege engine from the Castle. Hurls stones from long range that also hurt nearby units; very slow to move.',
  musketeer: 'Age of Sail gunpowder infantry from the Barracks. Fires musket shots from range and hits harder than any bow.',
  cannon: 'Age of Sail siege gun from the Castle. Sturdier than a Trebuchet, and its shots splash nearby units.',
  rifleman: 'Industrial Age infantry with long-range rifles and light armour. Out-ranges the Musketeer.',
  field_artillery: 'Industrial Age gun from the Factory. Long range, heavy splash damage and more health than older siege.',
  machine_gunner: 'Modern infantry that fires very rapidly. Each bullet is weak, so armour blunts it, but it shreds unarmoured troops.',
  armored_train: 'Industrial armoured locomotive from the Railway Station. Machine guns fire from a riveted, heavily armoured hull; spear bonuses and old weapon upgrades do not apply to it.',
  tank: 'Modern armoured vehicle from the Factory. Heavy armour and a long-range gun; spear bonuses and old weapon upgrades do not apply to it.',
  drone: 'Fast Future Age skirmisher that fires from long range.',
  mech: 'Future Age walker with 200 health and heavy armor. Slow, tough and hard-hitting.',
  railgun: 'Future Age siege with the longest range and the highest damage. Shots splash nearby units.',
  fishing_ship: 'Fishes the shoals in the bays and the river and brings the catch to a Dock. Cannot fight.',
  transport_ship: 'Carries 8 soldiers or villagers over water: right-click it with units to board, select it and right-click the shore to land. Unarmed; if it sinks, all aboard are lost.',
  unload: 'Lands everyone aboard on the nearest shore.',
  war_galley: 'Bronze Age oared warship. Shoots arrows at ships and at anything near the shore; soldiers can only hit it from the bank with ranged attacks, or in the shallows.',
  frigate: 'Age of Sail warship whose cannon broadsides splash nearby targets and batter buildings by the water.',
  destroyer: 'Modern warship: fast, heavily armoured and long-ranged, with guns that splash nearby targets.',
  king: 'Protect your King. In Regicide his death loses the match. In Kingdom Conquest he has 250 HP and his death transfers your civilization to the attacker; castles shelter him.',
  age: 'Research the next Age to unlock stronger units and buildings.',
  delete: 'Asks you to confirm before removing this building. Nothing is refunded, and queued training or research is lost.',
};

// Cost chips: coloured dot + amount. `short` lists resources the player lacks; `compact` shortens 1000 to 1k.
const costChip = (cost, resource, short, compact) => {
  const amount = compact && cost[resource] >= 1000 ? cost[resource] / 1000 + 'k' : cost[resource];
  const label = compact ? '' : `<em>${resource}</em>`;
  return `<span class="c${short.includes(resource) ? ' short' : ''}">`
    + `<i class="dot" style="background:${COLORS[resource]}"></i>${amount}${label}</span>`;
};
export const costHtml = (cost, short = [], compact = false) =>
  RES.filter(resource => cost[resource]).map(resource => costChip(cost, resource, short, compact)).join('');

const capitalize = text => text[0].toUpperCase() + text.slice(1);
const row = (label, value, wide) => `<div${wide ? ' class="wide"' : ''}><dt>${label}</dt><dd>${value}</dd></div>`;
const nameList = ids => ids.map(id => (UNITS[id] || BUILDINGS[id]).name).join(', ');
// The hover card's header: icon orb, title and subtitle.
const tipHeader = (iconHtml, title, sub) =>
  `<div class="tip-h"><span class="orb">${iconHtml}</span><div><h4>${title}</h4><span class="sub">${sub}</span></div></div>`;

const CONQUEST_GOAL = 'Eliminate all enemy units, completed buildings that train units, and completed Wonders.'
  + ' Other buildings alone cannot keep an empire alive, and neither can ships without a Dock.';
const ELIMINATION_ALSO_WINS = ' You can also win by eliminating the enemy empire.';
const ROUND_INFO = {
  kingdoms: {
    icon: 'king',
    goal: 'Slay opposing kings to inherit their entire civilizations. Your King has 250 HP and automatically shelters in a completed castle. Completed buildings claim land within eight ground steps; equal opposing claims are neutral. Conquer all three opponents or hold the most territory at the deadline.',
  },
  conquest: { icon: 'town_center', goal: CONQUEST_GOAL },
  deathmatch: { icon: 'barracks', goal: CONQUEST_GOAL, start: 'Iron Age with 20,000 of each resource.' },
  regicide: {
    icon: 'king',
    goal: 'Kill the enemy King while protecting yours. Losing your King ends the match immediately.' + ELIMINATION_ALSO_WINS,
  },
  wonder: {
    icon: 'wonder',
    goal: `Reach the Bronze Age, complete a Wonder, and keep it standing for ${WONDER_TICKS / 1200} uninterrupted game minutes.`
      + ' Losing all your completed Wonders resets the countdown.' + ELIMINATION_ALSO_WINS,
    start: '3,000 of each resource.',
  },
  relics: {
    icon: 'villager',
    goal: `Control all 5 relics for ${RELIC_TICKS / 1200} uninterrupted game minutes.`
      + ' Carry them with units or store them in a Town Center or Government Center.'
      + ' Losing control of any relic resets the countdown.' + ELIMINATION_ALSO_WINS,
  },
};

// A production queue as "Villager x2, Scout": same units grouped in first-queued order, so a full queue fits
// a phone's info panel.
export const queueText = queue => {
  const counts = new Map();
  for (const item of queue) counts.set(item.unit, (counts.get(item.unit) || 0) + 1);
  return [...counts].map(([unit, count]) => UNITS[unit].name + (count > 1 ? ` ×${count}` : '')).join(', ');
};
export const roundTimeLabel = (round, capTicks = round.capTicks) =>
  capTicks === Infinity ? 'No time limit' : `${capTicks / 1200} minutes`;
export const roundLimitText = (round, capTicks = round.capTicks) =>
  roundTimeLabel(round, capTicks) + (capTicks === Infinity ? '' : ' of game time');
export const TIME_LIMIT_RULE = 'If no one wins before the limit, the higher score wins.';
export const NO_TIME_LIMIT_RULE = 'Play until a victory condition is met or a player resigns.';

// Uses the same hover-card layout as buildings; durations come from the actual round rules.
export function roundTipHtml(round, capTicks = round.capTicks) {
  const info = ROUND_INFO[round.id];
  const deadline = round.id === 'kingdoms'
    ? 'Most territory wins; existing game score breaks territory ties. A remaining tie is a draw.'
    : TIME_LIMIT_RULE + ' An exact tie goes to you.';
  const endRule = capTicks === Infinity
    ? row('Match ends', NO_TIME_LIMIT_RULE, true)
    : row('At the limit', deadline, true);
  return tipHeader(icon(info.icon), round.name, 'Game mode')
    + `<dl>${row('Goal', info.goal, true)}${row('Time limit', roundLimitText(round, capTicks), true)}`
    + endRule
    + (info.start ? row('Starting resources', info.start, true) : '') + '</dl>'
    + '<p>Score rewards combat, economy, exploration, research, relics and Wonders.</p>'
    + '<p>At 2x or 4x speed, game time passes faster. Pausing stops the clock.</p>';
}

// Each *Tip helper returns what the card shows for one kind of tile: title, subtitle, cost, the stats rows,
// the description and which icon to draw.
function unitTip(id) {
  const unit = UNITS[id];
  const attack = `${unit.atk} ${unit.atkType === 'pierce' ? 'pierce' : 'melee'}`;
  let stats = row('HP', unit.hp) + row('Attack', attack) + row('Armor', `${unit.marmor} melee / ${unit.parmor} pierce`)
    + row('Range', unit.range <= 1 ? 'Melee' : `${unit.range} tiles`) + row('Speed', `${unit.speed} tiles/s`)
    + row('Trains in', `${unit.trainTime}s`);
  if (unit.bonus) {
    const bonuses = Object.entries(unit.bonus)
      .map(([unitClass, amount]) => `+${amount} vs ${CLASS_LABEL[unitClass] || unitClass}`);
    stats += row('Bonus', bonuses.join(', '), true);
  }
  const sub = `${CLASS_LABEL[unit.cls]} unit, ${ageTitle(unit.age)}`;
  return { title: unit.name, sub, cost: unit.cost, stats, desc: DESC[id], iconId: id, unitClass: unit.cls };
}

// A Farm holds more food and is worked faster in each Age.
function farmRows(age) {
  const farm = farmStats(age);
  const workSpeed = farm.rate > 1 ? `+${Math.round((farm.rate - 1) * 100)}% food gathering` : 'Normal';
  return row('Holds', `${farm.amount} food`, true) + row('Work speed', workSpeed, true);
}

function buildingTip(id, age) {
  const building = BUILDINGS[id];
  let stats = row('HP', building.hp) + row('Build time', `${building.buildTime}s`);
  if (building.trains) stats += row('Trains', nameList(building.trains), true);
  if (building.pop) stats += row('Adds', `+${building.pop} population`, true);
  if (building.drops) stats += row('Drop-off', building.drops.map(capitalize).join(', '), true);
  if (id === 'farm') stats += farmRows(age);
  const sub = `Building, ${ageTitle(building.age)}`;
  return { title: building.name, sub, cost: building.cost, stats, desc: DESC[id], iconId: id };
}

function techTip(id) {
  const tech = TECHS[id];
  let stats = row('Research time', `${tech.time}s`, true);
  if (tech.requires) stats += row('Requires', TECHS[tech.requires].name, true);
  return { title: tech.name, sub: `Research, ${ageTitle(tech.age)}`, cost: tech.cost, stats, desc: tech.desc, iconId: id };
}

const deleteTip = id => ({
  title: 'Delete', sub: 'Your selected building', cost: {}, stats: '', desc: DESC[id], iconId: 'delete',
});
const unloadTip = id => ({
  title: 'Unload', sub: 'Your selected Transport Ship', cost: {}, stats: '', desc: DESC[id], iconId: 'unload',
});

// Advancing to the `next` Age: what it needs and the buildings and units it unlocks.
function ageTip(id, next) {
  const ageUp = AGE_COST[next];
  const need = ageUpNeed(AGES[AGES.indexOf(next) - 1]);
  const needText = need
    ? ` Needs a Town Center and ${need} finished building${need > 1 ? 's' : ''} from your current Age.`
    : ' Needs a Town Center.';
  const trainable = Object.values(UNITS).filter(unit => unit.trainable !== false);
  const unlocks = [...Object.values(BUILDINGS), ...trainable].filter(def => def.age === next).map(def => def.name);
  const stats = unlocks.length ? row('Unlocks', unlocks.join(', '), true) : '';
  const title = `Advance to ${ageTitle(next)}`;
  return { title, sub: `Takes ${ageUp.time}s`, cost: ageUp.cost, stats, desc: DESC[id] + needText, iconId: 'age' };
}

function tipParts(kind, id, next, age) {
  if (kind === 'unit') return unitTip(id);
  if (kind === 'building') return buildingTip(id, age);
  if (kind === 'tech') return techTip(id);
  if (kind === 'delete') return deleteTip(id);
  if (kind === 'unload') return unloadTip(id);
  return ageTip(id, next);
}

// state: { kind: 'unit'|'building'|'tech'|'age'|'delete'|'unload', id, next?, age? (the player's era, for era-scaled stats),
// short?: string[], notes?: string[] }
export function tipHtml({ kind, id, next, age = 'stone', short = [], notes = [] }) {
  const tip = tipParts(kind, id, next, age);
  return tipHeader(icon(tip.iconId, tip.unitClass), tip.title, tip.sub)
    + `<p>${tip.desc}</p><dl>${tip.stats}</dl><div class="tip-cost">${costHtml(tip.cost, short)}</div>`
    + notes.map(note => `<p class="note">${note}</p>`).join('');
}
