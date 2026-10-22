import test from 'node:test'; import assert from 'node:assert/strict';
import { UNITS } from '../src/data/units.js';
import { BUILDINGS } from '../src/data/buildings.js';
import { TECHS } from '../src/data/techs.js';
import { AGES } from '../src/data/ages.js';
import { ICONS, icon } from '../src/ui/icons.js';
import { DESC, costHtml, tipHtml, roundTipHtml, roundTimeLabel, roundLimitText } from '../src/ui/tips.js';
import { wallPlan } from '../src/ui/input.js';
import { ROUNDS, roundById } from '../src/rounds/index.js';
import { createGame } from '../src/sim/game.js';
import { canPlace } from '../src/sim/commands.js';
import { lineTiles } from '../src/sim/util.js';
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
test('tower and wall have their own icon and a description of what they do', () => {
  for (const id of ['tower', 'wall']) {
    assert.match(ICONS[id] || '', /^<svg[^>]*viewBox="0 0 24 24"/, id); assert.ok(DESC[id] && DESC[id].length >= 20 && DESC[id].length <= 200, id);
    assert.doesNotMatch(DESC[id], /Sail Age/, id);
    assert.equal(Object.entries(ICONS).filter(([, s]) => s === ICONS[id]).length, 1, `${id} glyph is its own`);
    assert.equal(icon(id), ICONS[id]);
  }
  assert.match(DESC.tower, /shoots/i); assert.match(DESC.wall, /block/i); assert.match(DESC.wall, /gate/i);
  const h = tipHtml({ kind: 'building', id: 'tower' }); for (const s of ['Tower', DESC.tower, '40', '120']) assert.ok(h.includes(s), s);
  const w = tipHtml({ kind: 'building', id: 'wall' }); for (const s of ['Wall', DESC.wall, '</i>5<em>stone']) assert.ok(w.includes(s), s);
});
test('mine has its own icon and a tooltip with its cost and the rocky-ground rule', () => {
  assert.match(ICONS.mine || '', /^<svg[^>]*viewBox="0 0 24 24"/);
  assert.equal(Object.entries(ICONS).filter(([, s]) => s === ICONS.mine).length, 1, 'mine glyph is its own');
  assert.match(DESC.mine, /rocky ground/i); assert.match(DESC.mine, /gold vein/i); assert.match(DESC.mine, /quarry/i);
  const h = tipHtml({ kind: 'building', id: 'mine' });
  for (const s of ['Mine', DESC.mine, '</i>100<em>wood', '</i>50<em>stone']) assert.ok(h.includes(s), s);
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

// ---- Delete tile and the wall ghost line (Task 17) ----
test('the Delete tile has its own icon, a description and a tip that render', () => {
  assert.match(ICONS.delete || '', /^<svg[^>]*viewBox="0 0 24 24"/); assert.ok(ICONS.delete.endsWith('</svg>'));
  assert.equal(Object.entries(ICONS).filter(([, s]) => s === ICONS.delete).length, 1, 'delete glyph is its own');
  assert.equal(icon('delete'), ICONS.delete);
  assert.ok(DESC.delete && DESC.delete.length >= 20 && DESC.delete.length <= 200);
  assert.match(DESC.delete, /refund/i);
  const h = tipHtml({ kind: 'delete', id: 'delete' });
  for (const s of ['Delete', DESC.delete]) assert.ok(h.includes(s), s);
  assert.doesNotMatch(h, /undefined|NaN/);
});

// Player 0 in the Tool Age, every tile explored, `stone` stone; and a tree with two placeable tiles on each side of it in its row.
const ghostGame = stone => {
  const g = createGame({ seed: 1 }), p = g.players[0]; p.age = 'tool'; p.res.stone = stone; p.explored.fill(1);
  const ok = (x, y) => canPlace(g, 0, 'wall', x, y);
  for (const r of g.resources.values()) {
    const tx = Math.floor(r.x), ty = Math.floor(r.y);
    if (r.type === 'tree' && !ok(tx, ty) && [-2, -1, 1, 2].every(d => ok(tx + d, ty))) return { g, p, tx, ty };
  }
  throw new Error('no suitable tree');
};
const vills = g => [...g.units.values()].filter(u => u.owner === 0 && u.type === 'villager').map(u => u.id);
const walls = g => [...g.buildings.values()].filter(b => b.type === 'wall' && b.owner === 0).map(b => ({ x: b.x, y: b.y }));

test('wallPlan flags each tile by canPlace: a tree is a red gap, the rest green', () => {
  const { g, tx, ty } = ghostGame(500), line = lineTiles({ x: tx - 2, y: ty }, { x: tx + 2, y: ty });
  const plan = wallPlan(g, 0, line);
  assert.deepEqual(plan.tiles, line); assert.deepEqual(plan.ok, [true, true, false, true, true]); assert.equal(plan.count, 4);
  assert.deepEqual(g.command(0, { type: 'wall', ids: vills(g), tiles: line }), { ok: true, placed: plan.count }, 'the command places what the ghost showed green');
  assert.deepEqual(walls(g), plan.tiles.filter((t, i) => plan.ok[i]));
  assert.deepEqual(wallPlan(g, 0, line).ok, [false, false, false, false, false], 'once placed, the foundations are red');
});

test('wallPlan counts a repeated tile once', () => {
  const { g, tx, ty } = ghostGame(500), a = { x: tx - 2, y: ty }, b = { x: tx - 1, y: ty };
  const plan = wallPlan(g, 0, [a, b, a, { ...b }]);
  assert.deepEqual(plan.tiles, [a, b]); assert.deepEqual(plan.ok, [true, true]); assert.equal(plan.count, 2);
  assert.deepEqual(g.command(0, { type: 'wall', ids: vills(g), tiles: [a, b, a, b] }), { ok: true, placed: 2 });
});

test('wallPlan flags placement only, not stone: with too little stone the free tiles stay green and the command says resources', () => {
  const { g, p, tx, ty } = ghostGame(3), line = lineTiles({ x: tx - 2, y: ty }, { x: tx + 2, y: ty });
  const plan = wallPlan(g, 0, line);
  assert.deepEqual(plan.ok, [true, true, false, true, true], 'canPlace per tile: only the tree is red'); assert.equal(plan.count, 4);
  assert.deepEqual(g.command(0, { type: 'wall', ids: vills(g), tiles: line }), { ok: false, reason: 'resources' }, 'the toast gives the reason');
  assert.equal(p.res.stone, 3); assert.deepEqual(walls(g), []);
});

test('unlimited mode tips explain how to win without showing a score deadline', () => {
  for (const round of ROUNDS) {
    const html = roundTipHtml(round, Infinity);
    assert.equal(roundTimeLabel(round, Infinity), 'No time limit');
    assert.equal(roundLimitText(round, Infinity), 'No time limit');
    assert.match(html, /No time limit/);
    assert.match(html, /victory condition is met or a player resigns/);
    assert.doesNotMatch(html, /Infinity|NaN|undefined|At the limit|higher score wins|exact tie/);
  }
  assert.match(roundTipHtml(roundById('wonder'), Infinity), /3 uninterrupted game minutes/);
  assert.match(roundTipHtml(roundById('relics'), Infinity), /3 uninterrupted game minutes/);
});
