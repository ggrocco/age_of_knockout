import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { fishNear, FISH_SNAP } from '../src/ui/input.js';

const shoals = game => [...game.resources.values()].filter(resource => resource.type === 'fish');

test('a click on water beside a shoal finds that shoal, a click far from any does not', () => {
  const game = createGame({ seed: 3 });
  game.players[0].explored.fill(1);
  const fish = shoals(game)[0];
  assert.ok(fish, 'the map has fish');
  assert.equal(fishNear(game, { x: fish.x + 0.9, y: fish.y - 0.7 }), fish);
  assert.equal(fishNear(game, { x: fish.x, y: fish.y }), fish);
  // well away from every shoal: nothing to snap to
  const far = { x: fish.x + FISH_SNAP * 3, y: fish.y };
  const anyNear = shoals(game).some(other => Math.hypot(other.x - far.x, other.y - far.y) <= FISH_SNAP);
  if (!anyNear) assert.equal(fishNear(game, far), null);
  assert.equal(fishNear(game, null), null);
});

test('only shoals the player has explored and that still hold fish count', () => {
  const game = createGame({ seed: 3 });
  const fish = shoals(game)[0], point = { x: fish.x + 0.5, y: fish.y };
  game.players[0].explored.fill(0);
  assert.equal(fishNear(game, point), null, 'unexplored');
  game.players[0].explored.fill(1);
  const others = shoals(game).filter(other => other !== fish && Math.hypot(other.x - point.x, other.y - point.y) <= FISH_SNAP);
  for (const other of others) other.amount = 0;
  fish.amount = 0;
  assert.equal(fishNear(game, point), null, 'fished out');
});

test('the nearest of two shoals wins', () => {
  const game = createGame({ seed: 3 });
  game.players[0].explored.fill(1);
  const fish = shoals(game)[0];
  const near = shoals(game).filter(other => Math.hypot(other.x - fish.x, other.y - fish.y) <= FISH_SNAP * 2);
  const point = { x: fish.x + 0.3, y: fish.y + 0.2 };
  const nearest = near.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
  assert.equal(fishNear(game, point), nearest);
});
