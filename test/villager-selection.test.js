import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace } from '../src/sim/commands.js';
import { createInput } from '../src/ui/input.js';

// Exercise the actual input handlers with a real sim; only the DOM and picking are stubbed.
function setup(t, touch = true) {
  const previous = { document: globalThis.document, window: globalThis.window };
  const element = () => Object.assign(new EventTarget(), {
    classList: { add() {}, remove() {}, toggle() {} }, style: {}, contains: () => true,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 400, bottom: 800, width: 400, height: 800 }),
    width: 400, height: 800,
  });
  const elements = Object.fromEntries(['viewport', 'dragbox', 'minimap'].map(id => [id, element()]));
  globalThis.document = Object.assign(new EventTarget(), { getElementById: id => elements[id] });
  globalThis.window = new EventTarget();
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const game = createGame({ seed: 1 });
  const villagers = [...game.units.values()].filter(unit => unit.owner === 0 && unit.type === 'villager');
  let target = null, ground = { x: 30, y: 30 };
  const commands = [];
  const ui = { game, touch, sel: new Set(), inspect: null, placing: null,
    view: { pickEntity: () => target, pickGround: () => ground, project: (x, y) => ({ x, y }) },
    minimap: { toWorld: () => ground }, marker() {},
    stopPlacing() { ui.placing = null; },
    cmd(command) { commands.push(command); return game.command(0, command); },
  };
  createInput(ui);
  const fire = (element, type, data = {}) => element.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), data));
  const point = (entity, at = ground) => {
    target = entity;
    ground = at;
    if (touch) {
      const finger = { clientX: 100, clientY: 200 };
      fire(elements.viewport, 'touchstart', { touches: [finger] });
      fire(elements.viewport, 'touchend', { touches: [], changedTouches: [finger] });
    } else fire(elements.viewport, 'contextmenu', { clientX: 100, clientY: 200 });
  };
  return { game, ui, villagers, commands, point, fire, elements };
}

for (const touch of [true, false]) test(`${touch ? 'touch' : 'desktop'} work orders release villagers and preserve their job on the next tap`, t => {
  const { game, ui, villagers: [villager], point, commands } = setup(t, touch);
  const tree = [...game.resources.values()].find(resource => resource.type === 'tree');
  if (touch) point(villager);
  else ui.sel.add(villager.id);
  point(tree);
  assert.equal(villager.order.type, 'gather');
  assert.equal(ui.sel.has(villager.id), false);
  const job = structuredClone(villager.order), count = commands.length;
  point(null, { x: 40, y: 40 });
  assert.deepEqual(villager.order, job);
  assert.equal(commands.length, count, 'the next empty-ground tap issues no order');
  if (touch) {
    point(tree);
    assert.equal(ui.inspect, tree, 'the next target can be inspected');
    point(villager);
    assert.deepEqual([...ui.sel], [villager.id], 'reselecting promptly does not double-select all villagers');
  }
});

test('moving a mixed selection releases villagers while keeping soldiers selected', t => {
  const { game, ui, villagers, point } = setup(t);
  const soldier = game.spawnUnit('clubman', 0, 30, 30);
  for (const unit of [...villagers, soldier]) ui.sel.add(unit.id);
  point(null);
  assert.ok(villagers.every(villager => villager.order.type === 'move'));
  assert.deepEqual([...ui.sel], [soldier.id]);
  point(null, { x: 40, y: 40 });
  assert.ok(villagers.every(villager => villager.order.x !== 40));
  assert.equal(soldier.order.x, 40);
});

test('construction and repair orders release villagers; rejected work keeps them selected', t => {
  const { game, ui, villagers: [villager], point } = setup(t);
  const foundation = game.addBuilding('house', 0, 40, 40, false);
  ui.sel.add(villager.id);
  point(foundation);
  assert.equal(villager.order.type, 'build');
  assert.equal(ui.sel.size, 0);
  const buildingOrder = villager.order;
  ui.sel.add(villager.id);
  point(foundation);
  assert.equal(villager.order, buildingOrder, 'reissuing construction keeps the existing job');
  assert.equal(ui.sel.size, 0, 'an already assigned task still releases selection');
  const tc = [...game.buildings.values()].find(building => building.owner === 0 && building.type === 'town_center');
  tc.hp--;
  ui.sel.add(villager.id);
  point(tc);
  assert.equal(villager.order.type, 'repair');
  assert.equal(ui.sel.size, 0);
  const repairOrder = villager.order;
  ui.sel.add(villager.id);
  point(tc);
  assert.equal(villager.order, repairOrder, 'reissuing repair keeps the existing job');
  assert.equal(ui.sel.size, 0);
  ui.sel.add(villager.id);
  point([...game.resources.values()].find(resource => resource.type === 'fish'));
  assert.equal(ui.sel.has(villager.id), true, 'villagers cannot fish');
});

test('partially accepted fishing orders keep villagers that received no task selected', t => {
  const { game, ui, villagers: [villager], point } = setup(t);
  const fish = [...game.resources.values()].find(resource => resource.type === 'fish');
  const ship = game.spawnUnit('fishing_ship', 0, fish.x, fish.y);
  const oldOrder = villager.order;
  ui.sel.add(villager.id);
  ui.sel.add(ship.id);
  point(fish);
  assert.equal(ship.order.type, 'gather');
  assert.equal(villager.order, oldOrder);
  assert.deepEqual([...ui.sel], [villager.id, ship.id]);
});

test('a group relic order releases only the villager assigned to carry it', t => {
  const { game, ui, villagers, point } = setup(t);
  const relic = game.spawnRelic(40, 40);
  for (const villager of villagers) ui.sel.add(villager.id);
  point(relic);
  assert.equal(villagers[0].order.type, 'relic');
  assert.ok(villagers.slice(1).every(villager => villager.order.type === 'idle'));
  assert.deepEqual([...ui.sel], villagers.slice(1).map(villager => villager.id));
});

test('building placement releases villagers, except while Shift keeps placement active', t => {
  const { game, ui, villagers: [villager], fire } = setup(t, false);
  const freeTile = () => {
    for (let y = 5; y < 100; y++) for (let x = 5; x < 100; x++) {
      if (canPlace(game, 0, 'house', x, y)) return { x, y };
    }
  };
  ui.sel.add(villager.id);
  ui.placing = 'house';
  ui.placeTile = freeTile();
  fire(globalThis.window, 'keydown', { key: 'Shift', shiftKey: true });
  ui.actions['place-ok']();
  assert.equal(villager.order.type, 'build');
  assert.equal(ui.placing, 'house');
  assert.equal(ui.sel.has(villager.id), true);
  fire(globalThis.window, 'keyup', { key: 'Shift', shiftKey: false });
  ui.placeTile = freeTile();
  ui.actions['place-ok']();
  assert.equal(ui.placing, null);
  assert.equal(ui.sel.size, 0);
  ui.sel.add(villager.id);
  ui.placing = 'house';
  ui.placeTile = { x: -10, y: -10 };
  ui.actions['place-ok']();
  assert.equal(ui.placing, 'house');
  assert.equal(ui.sel.has(villager.id), true, 'failed placement can be retried');
});

test('wall placement and minimap moves also release villagers', t => {
  const { game, ui, villagers: [villager], fire, elements } = setup(t);
  game.players[0].age = 'tool';
  let tile;
  for (let y = 5; y < 100 && !tile; y++) for (let x = 5; x < 100 && !tile; x++) {
    if (canPlace(game, 0, 'wall', x, y)) tile = { x, y };
  }
  ui.sel.add(villager.id);
  ui.placing = 'wall';
  ui.wallStart = ui.wallEnd = tile;
  ui.actions['place-ok']();
  assert.equal(villager.order.type, 'build');
  assert.equal(ui.sel.size, 0);
  assert.equal(ui.placing, null);
  ui.sel.add(villager.id);
  fire(elements.minimap, 'mousedown', { button: 2, clientX: 100, clientY: 200 });
  assert.equal(villager.order.type, 'move');
  assert.equal(ui.sel.size, 0);
});
