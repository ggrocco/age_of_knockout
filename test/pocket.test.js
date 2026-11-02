import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace, POCKET_TILES } from '../src/sim/commands.js';
import { findPath } from '../src/sim/path.js';
import { wallPlan } from '../src/ui/input.js';

// A game with the whole map explored for player 0, and the top-left of a clear (open, plain land) side x side square.
function openGround(side = 11, seed = 1) {
  const g = createGame({ seed }), n = g.map.size;
  g.players[0].explored.fill(1);
  const clear = (x0, y0) => {
    for (let y = y0; y < y0 + side; y++) for (let x = x0; x < x0 + side; x++) {
      if (g.map.tiles[y * n + x] !== 0 || g.occAt(x, y)) return false;
    }
    return true;
  };
  for (let y = 4; y < n - side - 4; y++) for (let x = 4; x < n - side - 4; x++) if (clear(x, y)) return { g, x, y, n };
  throw new Error('no clear ground');
}
// The 8 tiles round (cx, cy), clockwise from the top-left.
const around = (cx, cy) => [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([dx, dy]) => ({ x: cx + dx, y: cy + dy }));
const wallsAt = (g, tiles) => tiles.forEach(t => g.addBuilding('wall', 0, t.x, t.y, true));

test('a building may not close a one-tile pocket (a villager there would be stuck between buildings)', () => {
  const { g, x, y } = openGround(), cx = x + 5, cy = y + 5, ring = around(cx, cy);
  wallsAt(g, ring.slice(0, 7)); // all round but the left side
  const gap = ring[7];
  assert.equal(canPlace(g, 0, 'wall', gap.x, gap.y), false, 'the last wall tile would seal the hole');
  assert.equal(canPlace(g, 0, 'farm', gap.x - 1, gap.y), false, 'so would a 2x2 Farm over the gap');
  assert.equal(canPlace(g, 0, 'farm', gap.x - 2, gap.y - 3), true, 'a Farm nearby that leaves the gap open is fine');
  assert.ok(findPath(g.map, (i, j) => g.blocked(i, j), { x: cx, y: cy }, { x: x, y: y }), 'the hole still has a way out');
});

test('a foundation counts as the wall it becomes, and a pocket between Houses is refused too', () => {
  const { g, x, y } = openGround();
  // Two Houses side by side with a one-tile slot between them, closed at the top by a wall foundation.
  const size = g.addBuilding('house', 0, x + 2, y + 3, true).size;
  g.addBuilding('house', 0, x + 3 + size, y + 3, true);
  const slot = { x: x + 2 + size, y: y + 3 };
  g.addBuilding('wall', 0, slot.x, slot.y - 1, false);
  assert.ok(g.reserved.has((slot.y - 1) * g.map.size + slot.x), 'an unfinished wall only reserves its tile');
  const bottom = slot.y + size; // first row below the Houses
  assert.equal(canPlace(g, 0, 'wall', slot.x, bottom), false, 'walling the slot\'s open end seals it');
  assert.equal(canPlace(g, 0, 'wall', slot.x + 2, bottom + 1), true, 'a wall elsewhere is fine');
});

test(`a big enclosure is allowed: only regions under ${POCKET_TILES} tiles are pockets`, () => {
  const { g, x, y } = openGround(11);
  const ring = [];
  for (let i = 0; i < 8; i++) ring.push({ x: x + 1 + i, y: y + 1 }, { x: x + 1 + i, y: y + 8 });
  for (let j = 2; j < 8; j++) ring.push({ x: x + 1, y: y + j }, { x: x + 8, y: y + j });
  const gap = ring.pop(); // 6 x 6 = 36 tiles inside
  wallsAt(g, ring);
  assert.equal(canPlace(g, 0, 'wall', gap.x, gap.y), true);
});

test('the wall ghost shows the tile that would close a pocket red, and the command skips it', () => {
  const { g, x, y } = openGround(), hx = x + 5, hy = y + 5; // a two-tile hole, (hx, hy) and (hx + 1, hy)
  const ring = [];
  for (let i = hx - 1; i <= hx + 2; i++) ring.push({ x: i, y: hy - 1 }, { x: i, y: hy + 1 });
  ring.push({ x: hx - 1, y: hy }, { x: hx + 2, y: hy });
  const line = [{ x: hx, y: hy - 1 }, { x: hx + 1, y: hy - 1 }]; // its two ways out, both on the top side
  wallsAt(g, ring.filter(t => !line.some(l => l.x === t.x && l.y === t.y)));
  assert.ok(line.every(t => canPlace(g, 0, 'wall', t.x, t.y)), 'each tile alone leaves the other way out');
  const plan = wallPlan(g, 0, line);
  assert.deepEqual(plan.ok, [true, false], 'with the first placed, the second would seal the hole'); assert.equal(plan.count, 1);
  assert.equal(g.reserved.size, 0, 'the plan leaves the game as it was');
  const p = g.players[0]; p.age = 'tool'; p.res.stone = 500;
  const vill = [...g.units.values()].find(u => u.owner === 0 && u.type === 'villager');
  assert.deepEqual(g.command(0, { type: 'wall', ids: [vill.id], tiles: line }), { ok: true, placed: 1 });
});

test('walls reach the map edge (so a line can close the border), other buildings keep a tile off it', () => {
  const g = createGame({ seed: 1 }), n = g.map.size;
  g.players[0].explored.fill(1);
  const edge = [];
  for (let k = 2; k < n - 2; k++) edge.push({ x: 0, y: k }, { x: n - 1, y: k }, { x: k, y: 0 }, { x: k, y: n - 1 });
  // Edge tiles with nothing but open land round them (one beside a nook of land would seal it, and is refused).
  const land = (i, j) => i < 0 || j < 0 || i >= n || j >= n || (g.map.tiles[j * n + i] === 0 && !g.occAt(i, j));
  const open = edge.filter(t => [-1, 0, 1].every(dy => [-1, 0, 1].every(dx => land(t.x + dx, t.y + dy))));
  assert.ok(open.length > 0, 'the map has open land on its edge');
  for (const t of open) assert.equal(canPlace(g, 0, 'wall', t.x, t.y), true, `wall at ${t.x},${t.y}`);
  const t = open.find(e => e.x === 0 && g.map.tiles[e.y * n + 1] === 0 && g.map.tiles[(e.y + 1) * n] === 0 && g.map.tiles[(e.y + 1) * n + 1] === 0);
  if (t) assert.equal(canPlace(g, 0, 'farm', 0, t.y), false, 'a Farm still keeps off the edge');
  // A wall across the edge column stops a walk along the border.
  const s = open.find(e => e.x === 0);
  // Everything off the edge column on the wall's row is blocked, as if a wall line ran in from the east.
  const blockedBeside = (i, j) => g.blocked(i, j) || (i > 0 && j === s.y);
  assert.ok(findPath(g.map, blockedBeside, { x: 0, y: s.y - 1 }, { x: 0, y: s.y + 1 }), 'open edge: a way round');
  g.addBuilding('wall', 0, s.x, s.y, true);
  assert.equal(findPath(g.map, blockedBeside, { x: 0, y: s.y - 1 }, { x: 0, y: s.y + 1 }), null, 'walled edge: none');
});

test('a hole already shut in (at a corner of the ring) does not stop a building beside it', () => {
  const { g, x, y } = openGround(), cx = x + 5, cy = y + 5;
  wallsAt(g, around(cx, cy)); // (cx, cy) is sealed already
  // A wall diagonal to the hole's top-right wall: the hole is a corner of its ring, never beside it.
  assert.equal(canPlace(g, 0, 'wall', cx + 2, cy - 2), true);
  assert.equal(canPlace(g, 0, 'farm', cx + 2, cy - 3), true, 'nor a Farm there');
});
