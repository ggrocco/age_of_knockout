import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { formationSlots } from '../src/sim/formation.js';

const tile = u => `${Math.floor(u.x)},${Math.floor(u.y)}`;
const run = (g, n = 600) => { for (let i = 0; i < n; i++) g.tick(); };
// An open patch of land with no buildings, resources or water within `r` tiles of (x, y).
function openSpot(g, r) {
  const n = g.map.size, free = (x, y) => g.map.tiles[y * n + x] === 0 && !g.occAt(x, y);
  for (let y = r + 2; y < n - r - 2; y++) for (let x = r + 2; x < n - r - 2; x++) {
    let ok = true;
    for (let j = -r; j <= r && ok; j++) for (let i = -r; i <= r && ok; i++) ok = free(x + i, y + j);
    if (ok) return { x, y };
  }
  throw new Error('no open spot');
}
// Mixed group west of an open spot, all idle so none wanders off to fight.
function mixed(g, o) {
  const us = [];
  for (let i = 0; i < 4; i++) us.push(g.spawnUnit('axeman', 0, o.x - 8.5, o.y - 1.5 + i));
  for (let i = 0; i < 3; i++) us.push(g.spawnUnit('bowman', 0, o.x - 9.5, o.y - 1.5 + i));
  for (let i = 0; i < 2; i++) us.push(g.spawnUnit('villager', 0, o.x - 10.5, o.y - 0.5 + i));
  for (const u of us) u.order = { type: 'idle' };
  return us;
}

test('a group move spreads units over distinct tiles around the point, fighters in front', () => {
  const g = createGame({ seed: 1 }), o = openSpot(g, 10), us = mixed(g, o);
  g.command(0, { type: 'move', ids: us.map(u => u.id), x: o.x + 0.5, y: o.y + 0.5 });
  run(g);
  assert.equal(new Set(us.map(tile)).size, us.length, 'every unit on its own tile');
  for (const u of us) { assert.equal(u.order.type, 'idle'); assert.ok(Math.hypot(u.x - o.x, u.y - o.y) <= 3, `${u.type} near the point`); }
  // Heading east: the front is the largest x.
  const xs = t => us.filter(u => u.type === t).map(u => u.x);
  assert.ok(Math.min(...xs('axeman')) > Math.max(...xs('bowman')), 'melee ahead of archers');
  assert.ok(Math.min(...xs('bowman')) > Math.max(...xs('villager')), 'archers ahead of villagers');
});

test('a single unit still goes exactly to the point', () => {
  const g = createGame({ seed: 1 }), o = openSpot(g, 4), u = g.spawnUnit('axeman', 0, o.x - 3.5, o.y + 0.5);
  g.command(0, { type: 'move', ids: [u.id], x: o.x + 0.3, y: o.y + 0.7 });
  assert.deepEqual([u.order.x, u.order.y], [o.x + 0.3, o.y + 0.7]);
});

test('formation slots skip blocked tiles and stay reachable from the point', () => {
  const g = createGame({ seed: 1 }), n = g.map.size, tc = [...g.buildings.values()].find(b => b.owner === 0 && b.type === 'town_center');
  const us = []; for (let i = 0; i < 12; i++) us.push(g.spawnUnit('clubman', 0, tc.x - 6.5, tc.y + 0.5 + (i % 4)));
  const slots = formationSlots(g, us, tc.x + 0.5, tc.y + 0.5); // clicked on the town centre itself
  const keys = [...slots.values()].map(s => `${s.x},${s.y}`);
  assert.equal(new Set(keys).size, us.length);
  for (const s of slots.values()) {
    const x = Math.floor(s.x), y = Math.floor(s.y);
    assert.notEqual(g.map.tiles[y * n + x], 1, 'not water'); assert.equal(g.occAt(x, y), 0, 'not under a building');
  }
});

test('group moves are deterministic', () => {
  const end = () => { const g = createGame({ seed: 1 }), o = openSpot(g, 10), us = mixed(g, o);
    g.command(0, { type: 'move', ids: us.map(u => u.id).reverse(), x: o.x - 2, y: o.y + 6 }); run(g); return us.map(u => [u.x, u.y]); };
  assert.deepEqual(end(), end());
});
