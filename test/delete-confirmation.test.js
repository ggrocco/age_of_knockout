import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { requestBuildingDeletion } from '../src/ui/input.js';

const setup = touch => {
  const game = createGame({ seed: 2 }), building = [...game.buildings.values()].find(b => b.owner === 0);
  const prompts = [], commands = [];
  const ui = { game, touch, sel: new Set([building.id]), confirmDelete: (target, confirm) => prompts.push({ target, confirm }),
    cmd(command) { commands.push(command); return ui.game.command(0, command); } };
  return { game, building, ui, prompts, commands };
};

test('desktop and touch request confirmation before deleting buildings or foundations', () => {
  for (const touch of [false, true]) for (const foundation of [false, true]) {
    const { game, building: tc, ui, prompts, commands } = setup(touch);
    const building = foundation ? game.addBuilding('house', 0, 30, 30, false) : tc;
    ui.sel = new Set([building.id]);
    const resources = { ...game.players[0].res };
    requestBuildingDeletion(ui, building.id);
    assert.equal(prompts.length, 1);
    assert.equal(prompts[0].target, building);
    assert.equal(commands.length, 0);
    assert.equal(game.entities.has(building.id), true);
    prompts[0].confirm();
    assert.equal(game.entities.has(building.id), false);
    assert.equal(ui.sel.has(building.id), false);
    assert.deepEqual(game.players[0].res, resources, 'no refund after confirmation');
    prompts[0].confirm();
    assert.equal(commands.length, 1, 'the same confirmation cannot delete twice');
  }
});

test('leaving a request unconfirmed or having no confirmation UI never deletes', () => {
  const { game, building, ui, prompts, commands } = setup(false);
  requestBuildingDeletion(ui, building.id);
  assert.equal(prompts.length, 1);
  assert.equal(game.entities.has(building.id), true);
  ui.confirmDelete = undefined;
  requestBuildingDeletion(ui, building.id);
  assert.equal(game.entities.has(building.id), true);
  assert.equal(commands.length, 0);
});

test('confirmation rejects invalid targets, ended matches, and requests from an earlier match', () => {
  const { game, building, ui, prompts, commands } = setup(false);
  const enemy = [...game.buildings.values()].find(b => b.owner === 1), unit = [...game.units.values()][0];
  for (const id of [enemy.id, unit.id, 999999, undefined]) requestBuildingDeletion(ui, id);
  assert.equal(prompts.length, 0);
  requestBuildingDeletion(ui, building.id);
  ui.game = createGame({ seed: 3 }); prompts[0].confirm();
  assert.equal(game.entities.has(building.id), true);
  assert.equal(commands.length, 0);
  ui.game = game;
  requestBuildingDeletion(ui, building.id);
  game.result = { winner: 0, reason: 'conquest' }; prompts[1].confirm();
  requestBuildingDeletion(ui, building.id);
  assert.equal(prompts.length, 2);
  assert.equal(game.entities.has(building.id), true);
  assert.equal(commands.length, 0);
});

test('confirmation cannot delete a building that disappeared or changed owner while pending', () => {
  for (const change of ['removed', 'converted', 'match closed']) {
    const { game, building, ui, prompts, commands } = setup(false);
    requestBuildingDeletion(ui, building.id);
    if (change === 'removed') game.remove(building);
    else if (change === 'converted') building.owner = 1;
    else ui.game = null;
    prompts[0].confirm();
    assert.equal(commands.length, 0, change);
    assert.equal(ui.sel.has(building.id), true, 'an invalid confirmation must not change the selection');
    if (change !== 'removed') assert.equal(game.entities.get(building.id), building, change);
    requestBuildingDeletion(ui, building.id);
    assert.equal(prompts.length, 1, 'invalid targets cannot open another request');
  }
});
