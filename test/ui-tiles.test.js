import test from 'node:test'; import assert from 'node:assert/strict';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { TECHS } from '../src/data/techs.js';
import { AGES } from '../src/data/ages.js';
import { ICONS, icon } from '../src/ui/icons.js';
import { DESC, costHtml, tipHtml, roundTipHtml, roundTimeLabel } from '../src/ui/tips.js';
import { ROUNDS, roundById } from '../src/rounds/index.js';
import { createGame } from '../src/sim/game.js';
import { matchOptions } from '../src/ai/bot.js';
import { LEVELS } from '../src/tournament/bracket.js';

const ids = [...Object.keys(UNITS), ...Object.keys(BUILDINGS)];

test('every unit, building and the age button has its own svg icon', () => {
  for (const id of [...ids, 'age', 'lock']) {
    const s = ICONS[id];
    assert.ok(s, `icon for ${id}`);
    assert.match(s, /^<svg[^>]*viewBox="0 0 24 24"/, id); assert.ok(s.endsWith('</svg>'), id);
  }
});
const ERA_IDS = ['knight', 'crossbowman', 'trebuchet', 'musketeer', 'cannon', 'rifleman', 'field_artillery', 'machine_gunner', 'tank', 'castle', 'factory'];
test('era units and buildings have their own icon and description', () => {
  for (const id of ERA_IDS) { assert.match(ICONS[id] || '', /^<svg[^>]*viewBox="0 0 24 24"/, id); assert.ok(DESC[id] && DESC[id].length >= 20 && DESC[id].length <= 200, id); }
  assert.equal(new Set(ERA_IDS.map(id => ICONS[id])).size, ERA_IDS.length, 'each glyph is its own');
  assert.equal(icon('made_up_unit', 'armor'), ICONS.tank);
});
test('icon() falls back by unit class, then to a generic glyph', () => {
  assert.equal(icon('made_up_unit', 'siege'), ICONS.catapult);
  assert.equal(icon('made_up_unit', 'archer'), ICONS.bowman);
  assert.equal(icon('made_up_thing'), ICONS.unknown);
  assert.equal(icon('barracks', 'inf'), ICONS.barracks);
});
test('every unit, building and the age button has a short description', () => {
  for (const id of [...ids, 'age']) { assert.ok(DESC[id], `description for ${id}`); assert.ok(DESC[id].length >= 20 && DESC[id].length <= 200, `${id} length`); }
});
test('costHtml skips zero costs, shortens thousands and flags shortfalls', () => {
  const h = costHtml({ food: 0, wood: 1000, gold: 75, stone: 0 }, ['gold'], true);
  assert.match(h, />1k</); assert.match(h, /75/); assert.doesNotMatch(h, /food/);
  assert.match(h, /class="c short"><i[^>]*><\/i>75/); assert.doesNotMatch(h, /class="c short"><i[^>]*><\/i>1k/);
  assert.match(costHtml({ wood: 1000 }, [], false), />1000</);
  assert.equal(costHtml({}, [], true), '');
});
test('unit tip: name, description, stats, cost and notes', () => {
  const h = tipHtml({ kind: 'unit', id: 'catapult', short: ['gold'], notes: ['Requires Iron Age'] });
  for (const s of ['Catapult', DESC.catapult, 'HP', '75', 'Attack', '60', 'Range', '9', 'Requires Iron Age', 'short']) assert.ok(h.includes(s), s);
  assert.match(tipHtml({ kind: 'unit', id: 'clubman' }), /Melee/);
});
test('building tip lists what it trains and the build time', () => {
  const h = tipHtml({ kind: 'building', id: 'barracks' });
  for (const s of ['Barracks', 'Clubman', 'Mech Walker', `${BUILDINGS.barracks.buildTime}s`, `${BUILDINGS.barracks.hp}`]) assert.ok(h.includes(s), s);
  assert.ok(tipHtml({ kind: 'building', id: 'house' }).includes('+4 population'));
});
test('age tip names the next age and what it unlocks', () => {
  const h = tipHtml({ kind: 'age', id: 'age', next: 'tool' });
  for (const s of ['Tool', 'Archery Range', 'Bowman', 'Scout', '30s']) assert.ok(h.includes(s), s);
  assert.ok(!h.includes('Clubman'));
});
test('age tip states the same building requirement as ageUpProblem', () => {
  const need = a => Math.min(2, Object.entries(BUILDINGS).filter(([id, d]) => d.age === AGES[AGES.indexOf(a) - 1] && id !== 'town_center' && !d.extra).length);
  assert.equal(need('future'), 0, 'modern has no buildings of its own to require');
  assert.doesNotMatch(tipHtml({ kind: 'age', id: 'age', next: 'future' }), /finished building/);
  for (const a of ['tool', 'bronze']) { assert.equal(need(a), 2, a); assert.match(tipHtml({ kind: 'age', id: 'age', next: a }), /2 finished buildings/, a); }
  // The Wonder is a victory building, not an age-up requirement: leaving Bronze needs only the Government Center.
  assert.equal(need('iron'), 1); assert.match(tipHtml({ kind: 'age', id: 'age', next: 'iron' }), /1 finished building from/);
});
test('tips name eras by their full title and never say "Sail Age"', () => {
  const all = [...Object.keys(UNITS).map(id => tipHtml({ kind: 'unit', id })), ...Object.keys(BUILDINGS).map(id => tipHtml({ kind: 'building', id })),
    ...Object.keys(TECHS).map(id => tipHtml({ kind: 'tech', id })), ...AGES.slice(1).map(next => tipHtml({ kind: 'age', id: 'age', next }))].join('');
  assert.doesNotMatch(all, /Sail Age|Age of Sail Age|Future Age Age/);
  assert.match(tipHtml({ kind: 'age', id: 'age', next: 'sail' }), /Advance to Age of Sail/);
  assert.match(tipHtml({ kind: 'unit', id: 'swordsman' }), /Iron Age/);
});
test('tech tip: name, description, cost, research time and prerequisite', () => {
  const h = tipHtml({ kind: 'tech', id: 'iron_weapons', short: ['gold'], notes: ['Needs Bronze Weapons'] });
  for (const s of ['Iron Weapons', TECHS.iron_weapons.desc, 'Research time', `${TECHS.iron_weapons.time}s`, 'Requires', 'Bronze Weapons', 'Needs Bronze Weapons']) assert.ok(h.includes(s), s);
});
test('round tips disclose the actual game-time cap and score decision', () => {
  for (const r of ROUNDS) {
    const h = roundTipHtml(r);
    assert.ok(h.includes(r.name), r.id);
    assert.match(h, new RegExp(`${r.capTicks / 1200} minutes of game time`), r.id);
    assert.match(h, /higher score wins/, r.id);
    assert.match(h, /exact tie goes to you/, r.id);
    assert.match(h, /2x or 4x.*Pausing stops the clock/, r.id);
    assert.doesNotMatch(h, /undefined|NaN/, r.id);
  }
  const changed = { ...roundById('conquest'), capTicks: 48000 };
  assert.equal(roundTimeLabel(changed), '40 minutes');
  assert.match(roundTipHtml(changed), /40 minutes of game time/);
  assert.doesNotMatch(roundTipHtml(changed), /25 minutes/);
});
test('round tips use the effective time limit for each difficulty', () => {
  for (const [level, diffs] of Object.entries(LEVELS)) for (const [i, round] of ROUNDS.entries()) {
    const game = createGame({ rules: round, ...matchOptions([null, diffs[i]]) });
    const expected = level === 'relaxed' ? 40 : round.capTicks / 1200;
    assert.equal(roundTimeLabel(round, game.capTicks), `${expected} minutes`, `${level} ${round.id}`);
    assert.ok(roundTipHtml(round, game.capTicks).includes(`${expected} minutes of game time`), `${level} ${round.id}`);
  }
  assert.match(roundTipHtml(roundById('deathmatch')), /Iron Age with 20,000/);
});
test('round goals explain elimination, starting resources and objective countdowns', () => {
  assert.match(roundTipHtml(roundById('conquest')), /buildings that train units.*Wonders/);
  assert.match(roundTipHtml(roundById('deathmatch')), /20,000 of each resource/);
  assert.match(roundTipHtml(roundById('regicide')), /Losing your King ends the match immediately/);
  const wonder = roundTipHtml(roundById('wonder'));
  assert.match(wonder, /Bronze Age.*3 uninterrupted game minutes/);
  assert.match(wonder, /resets the countdown/);
  assert.match(wonder, /3,000 of each resource/);
  const relics = roundTipHtml(roundById('relics'));
  assert.match(relics, /all 5 relics for 3 uninterrupted game minutes/);
  assert.match(relics, /Town Center or Government Center/);
  assert.match(relics, /Losing control of any relic resets the countdown/);
});
test('every tip renders without throwing and never leaks "undefined"', () => {
  for (const id of Object.keys(UNITS)) assert.doesNotMatch(tipHtml({ kind: 'unit', id }), /undefined|NaN/, id);
  for (const id of Object.keys(BUILDINGS)) assert.doesNotMatch(tipHtml({ kind: 'building', id }), /undefined|NaN/, id);
  for (const id of Object.keys(TECHS)) assert.doesNotMatch(tipHtml({ kind: 'tech', id }), /undefined|NaN/, id);
  for (const a of AGES.slice(1)) assert.doesNotMatch(tipHtml({ kind: 'age', id: 'age', next: a }), /undefined|NaN/, a);
});
