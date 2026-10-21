// Hover descriptions and cost chips for the command tiles. DOM-free (returns HTML strings) so it is unit-testable.
import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { TECHS } from '../data/techs.js';
import { AGES, AGE_COST, AGE_POP_LIMIT, ageTitle } from '../data/ages.js';
import { WONDER_TICKS, RELIC_TICKS } from '../rounds/index.js';
import { ageUpNeed } from '../sim/commands.js';
import { icon } from './icons.js';

export const RES = ['food', 'wood', 'gold', 'stone'];
export const COLORS = { food: '#e0554d', wood: '#a06a35', gold: '#facc15', stone: '#9ca3af' };
const CLASS_LABEL = { civ: 'Worker', inf: 'Infantry', archer: 'Ranged', cav: 'Cavalry', siege: 'Siege', armor: 'Armored' };

// Only claims what the sim actually does (see docs and src/sim); Market has no trade yet, it just counts toward Age-up.
export const DESC = {
  town_center: 'Your base. Trains Villagers, accepts every resource and is where you advance to the next Age.',
  house: `Raises your population cap, up to the limit of your Age (${AGE_POP_LIMIT.stone} in the Stone Age, ${AGE_POP_LIMIT.future} in AI Future). Build more when training stalls at the cap.`,
  granary: 'Drop-off point for food. Place it beside berries and farms to shorten trips.',
  storage_pit: 'Drop-off point for wood, gold and stone. Also researches weapon and armor upgrades.',
  farm: 'A field that holds 400 food. Villagers work it for a steady food supply.',
  barracks: 'Trains infantry and Slingers, later Musketeers, Riflemen and Machine Gunners. The Future Age adds the Mech Walker.',
  archery_range: 'Trains ranged units: Bowmen, Crossbowmen in the Medieval Age, then Combat Drones in the Future Age.',
  stable: 'Trains fast cavalry: Scouts for exploring, Horse Archers for raids and armoured Knights in the Medieval Age.',
  market: 'Researches economy upgrades that speed up gathering, and counts toward leaving the Tool Age.',
  government_center: 'Trains Catapults and Railguns, researches Ballistics (+range) and accepts every resource. Later siege comes from the Castle and Factory.',
  wonder: `In the Wonder Race, keeping one standing for ${Math.round(WONDER_TICKS / 1200)} minutes wins the round.`,
  castle: 'Medieval stronghold with very heavy armour. Trains Trebuchets and Cannons, and is needed to leave the Medieval Age.',
  factory: 'Industrial Age works that builds Field Artillery and Tanks. You need one to advance out of the Industrial Age.',
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
  tank: 'Modern armoured vehicle from the Factory. Heavy armour and a long-range gun; spear bonuses and old weapon upgrades do not apply to it.',
  drone: 'Fast Future Age skirmisher that fires from long range.',
  mech: 'Future Age walker with 200 health and heavy armor. Slow, tough and hard-hitting.',
  railgun: 'Future Age siege with the longest range and the highest damage. Shots splash nearby units.',
  king: 'Regicide only: if your King falls, the match is lost. Keep him safe.',
  age: 'Research the next Age to unlock stronger units and buildings.',
  delete: 'Asks you to confirm before removing this building. Nothing is refunded, and queued training or research is lost.',
};

// Cost chips: coloured dot + amount. `short` lists resources the player lacks; `compact` shortens 1000 to 1k.
export const costHtml = (cost, short = [], compact = false) => RES.filter(k => cost[k]).map(k =>
  `<span class="c${short.includes(k) ? ' short' : ''}"><i class="dot" style="background:${COLORS[k]}"></i>${compact && cost[k] >= 1000 ? cost[k] / 1000 + 'k' : cost[k]}${compact ? '' : `<em>${k}</em>`}</span>`).join('');

const cap = s => s[0].toUpperCase() + s.slice(1);
const row = (label, value, wide) => `<div${wide ? ' class="wide"' : ''}><dt>${label}</dt><dd>${value}</dd></div>`;
const names = ids => ids.map(i => (UNITS[i] || BUILDINGS[i]).name).join(', ');

const CONQUEST_GOAL = 'Eliminate all enemy units, completed buildings that train units, and completed Wonders. Other buildings alone cannot keep an empire alive.';
const ROUND_INFO = {
  conquest: { icon: 'town_center', goal: CONQUEST_GOAL },
  deathmatch: { icon: 'barracks', goal: CONQUEST_GOAL, start: 'Iron Age with 20,000 of each resource.' },
  regicide: { icon: 'king', goal: 'Kill the enemy King while protecting yours. Losing your King ends the match immediately. You can also win by eliminating the enemy empire.' },
  wonder: { icon: 'wonder', goal: `Reach the Bronze Age, complete a Wonder, and keep it standing for ${WONDER_TICKS / 1200} uninterrupted game minutes. Losing all your completed Wonders resets the countdown. You can also win by eliminating the enemy empire.`, start: '3,000 of each resource.' },
  relics: { icon: 'villager', goal: `Control all 5 relics for ${RELIC_TICKS / 1200} uninterrupted game minutes. Carry them with units or store them in a Town Center or Government Center. Losing control of any relic resets the countdown. You can also win by eliminating the enemy empire.` },
};

// A production queue as "Villager x2, Scout": same units grouped in first-queued order, so a full queue fits a phone's info panel.
export const queueText = queue => {
  const n = new Map(); for (const q of queue) n.set(q.unit, (n.get(q.unit) || 0) + 1);
  return [...n].map(([u, c]) => UNITS[u].name + (c > 1 ? ` ×${c}` : '')).join(', ');
};
export const roundTimeLabel = (round, capTicks = round.capTicks) => capTicks === Infinity ? 'No time limit' : `${capTicks / 1200} minutes`;
export const roundLimitText = (round, capTicks = round.capTicks) => roundTimeLabel(round, capTicks) + (capTicks === Infinity ? '' : ' of game time');
export const TIME_LIMIT_RULE = 'If no one wins before the limit, the higher score wins.';
export const NO_TIME_LIMIT_RULE = 'Play until a victory condition is met or a player resigns.';

// Uses the same hover-card layout as buildings; durations come from the actual round rules.
export function roundTipHtml(round, capTicks = round.capTicks) {
  const info = ROUND_INFO[round.id];
  return `<div class="tip-h"><span class="orb">${icon(info.icon)}</span><div><h4>${round.name}</h4><span class="sub">Game mode</span></div></div>`
    + `<dl>${row('Goal', info.goal, true)}${row('Time limit', roundLimitText(round, capTicks), true)}`
    + (capTicks === Infinity ? row('Match ends', NO_TIME_LIMIT_RULE, true) : row('At the limit', TIME_LIMIT_RULE + ' An exact tie goes to you.', true))
    + (info.start ? row('Starting resources', info.start, true) : '') + '</dl>'
    + '<p>Score rewards combat, economy, exploration, research, relics and Wonders.</p>'
    + '<p>At 2x or 4x speed, game time passes faster. Pausing stops the clock.</p>';
}

// state: { kind: 'unit'|'building'|'tech'|'age'|'delete', id, next?, short?: string[], notes?: string[] }
export function tipHtml({ kind, id, next, short = [], notes = [] }) {
  let title, sub, cost, stats = '', desc = DESC[id], ic = id, cls;
  if (kind === 'unit') {
    const u = UNITS[id]; cls = u.cls; title = u.name; sub = `${CLASS_LABEL[u.cls]} unit, ${ageTitle(u.age)}`; cost = u.cost;
    const atkLabel = `${u.atk} ${u.atkType === 'pierce' ? 'pierce' : 'melee'}`;
    stats = row('HP', u.hp) + row('Attack', atkLabel) + row('Armor', `${u.marmor} melee / ${u.parmor} pierce`) + row('Range', u.range <= 1 ? 'Melee' : `${u.range} tiles`) + row('Speed', `${u.speed} tiles/s`) + row('Trains in', `${u.trainTime}s`);
    if (u.bonus) stats += row('Bonus', Object.entries(u.bonus).map(([k, v]) => `+${v} vs ${CLASS_LABEL[k] || k}`).join(', '), true);
  } else if (kind === 'building') {
    const b = BUILDINGS[id]; title = b.name; sub = `Building, ${ageTitle(b.age)}`; cost = b.cost;
    stats = row('HP', b.hp) + row('Build time', `${b.buildTime}s`);
    if (b.trains) stats += row('Trains', names(b.trains), true);
    if (b.pop) stats += row('Adds', `+${b.pop} population`, true);
    if (b.drops) stats += row('Drop-off', b.drops.map(cap).join(', '), true);
    if (b.gatherType) stats += row('Holds', `${b.amount} ${b.gatherType}`, true);
  } else if (kind === 'tech') {
    const t = TECHS[id]; title = t.name; sub = `Research, ${ageTitle(t.age)}`; cost = t.cost; desc = t.desc;
    stats = row('Research time', `${t.time}s`, true);
    if (t.requires) stats += row('Requires', TECHS[t.requires].name, true);
  } else if (kind === 'delete') {
    title = 'Delete'; sub = 'Your selected building'; cost = {}; ic = 'delete';
  } else {
    const a = AGE_COST[next]; title = `Advance to ${ageTitle(next)}`; sub = `Takes ${a.time}s`; cost = a.cost; ic = 'age';
    const need = ageUpNeed(AGES[AGES.indexOf(next) - 1]);
    desc += need ? ` Needs a Town Center and ${need} finished building${need > 1 ? 's' : ''} from your current Age.` : ' Needs a Town Center.';
    const unlocks = [...Object.values(BUILDINGS), ...Object.values(UNITS).filter(u => u.trainable !== false)].filter(d => d.age === next).map(d => d.name);
    stats = unlocks.length ? row('Unlocks', unlocks.join(', '), true) : '';
  }
  return `<div class="tip-h"><span class="orb">${icon(ic, cls)}</span><div><h4>${title}</h4><span class="sub">${sub}</span></div></div>`
    + `<p>${desc}</p><dl>${stats}</dl><div class="tip-cost">${costHtml(cost, short)}</div>`
    + notes.map(n => `<p class="note">${n}</p>`).join('');
}
