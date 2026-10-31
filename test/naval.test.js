import test from 'node:test'; import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { canPlace } from '../src/sim/commands.js';
import { canHit } from '../src/sim/orders.js';
import { isEliminated, roundById } from '../src/rounds/index.js';
import { createBot } from '../src/ai/bot.js';
import { passable } from '../src/sim/util.js';

// A game where player 0 sees the whole map, is in `age` and can pay for anything.
function setup(age = 'medieval', seed = 3) {
  const g = createGame({ seed });
  for (const p of g.players) { p.explored.fill(1); p.age = age; p.res = { food: 9999, wood: 9999, gold: 9999, stone: 9999 }; }
  return g;
}
const tileAt = (g, e) => g.map.tiles[Math.floor(e.y) * g.map.size + Math.floor(e.x)];
// The Dock spot nearest player pid's start.
function dockSpot(g, pid = 0) {
  const n = g.map.size, s = g.map.starts[pid]; let best = null, bd = Infinity;
  for (let y = 1; y < n - 4; y++) for (let x = 1; x < n - 4; x++) if (canPlace(g, pid, 'dock', x, y)) { const d = Math.hypot(x - s.x, y - s.y); if (d < bd) { bd = d; best = { x, y }; } }
  return best;
}
const dockFor = (g, pid = 0) => { const sp = dockSpot(g, pid); return g.addBuilding('dock', pid, sp.x, sp.y, true); };
const run = (g, ticks) => { for (let i = 0; i < ticks; i++) g.tick(); };
// The open tile of this layer nearest (x, y).
function nearest(g, x, y, test) {
  const n = g.map.size; let best = null, bd = Infinity;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (test(g.map.tiles[j * n + i], i, j) && !g.occAt(i, j)) { const d = Math.hypot(i - x, j - y); if (d < bd) { bd = d; best = { x: i + 0.5, y: j + 0.5 }; } }
  return best;
}

test('a Dock goes only on deep water against the shore', () => {
  const g = setup('stone'), n = g.map.size, sp = dockSpot(g);
  assert.ok(sp, 'a spot in the home bay');
  for (let j = sp.y; j < sp.y + 3; j++) for (let i = sp.x; i < sp.x + 3; i++) assert.equal(g.map.tiles[j * n + i], 1);
  const s = g.map.starts[0];
  assert.ok(Math.hypot(sp.x + 1.5 - s.x, sp.y + 1.5 - s.y) < 22, 'a short walk from home');
  assert.equal(canPlace(g, 0, 'dock', s.x + 3, s.y + 3), false, 'not on land');
  let open = null; // a 3x3 of deep water with deep water all round it: out in the lake, nowhere to stand to build it
  for (let y = 2; y < n - 5 && !open; y++) for (let x = 2; x < n - 5 && !open; x++) {
    let all = true; for (let j = y - 1; j < y + 4 && all; j++) for (let i = x - 1; i < x + 4; i++) if (g.map.tiles[j * n + i] !== 1) { all = false; break; }
    if (all) open = { x, y };
  }
  assert.ok(open); assert.equal(canPlace(g, 0, 'dock', open.x, open.y), false, 'not out in open water');
  const ford = nearest(g, n / 2, n / 2, t => t === 4);
  assert.equal(canPlace(g, 0, 'dock', Math.floor(ford.x), Math.floor(ford.y)), false, 'not on shallows');
  assert.equal(canPlace(g, 0, 'house', Math.floor(ford.x), Math.floor(ford.y)), false, 'nothing is built on shallows');
  const v = [...g.units.values()].find(u => u.owner === 0);
  assert.equal(g.command(0, { type: 'build', ids: [v.id], building: 'dock', x: sp.x, y: sp.y }).ok, true);
});

test('Fishing Ships launch in Stone before Bronze Age warships and transports', () => {
  const g = setup('stone'), dock = dockFor(g);
  for (const unit of ['war_galley', 'transport_ship']) assert.equal(g.command(0, { type: 'train', buildingId: dock.id, unit }).reason, 'age');
  assert.equal(g.command(0, { type: 'train', buildingId: dock.id, unit: 'fishing_ship' }).ok, true);
  run(g, 20 * 31);
  assert.ok([...g.units.values()].some(u => u.type === 'fishing_ship' && tileAt(g, u) === 1));
  g.players[0].age = 'bronze';
  assert.equal(g.command(0, { type: 'train', buildingId: dock.id, unit: 'war_galley' }).ok, true);
  run(g, 20 * 41);
  const ship = [...g.units.values()].find(u => u.type === 'war_galley');
  assert.ok(ship && ship.naval); assert.equal(tileAt(g, ship), 1, 'launched on water');
  g.players[0].age = 'modern';
  for (const unit of ['fishing_ship', 'frigate', 'destroyer']) assert.equal(g.command(0, { type: 'train', buildingId: dock.id, unit }).ok, true, unit);
});

test('ships stay on the water: sent inland they sail to the nearest shore, and they cross the shallows', () => {
  const g = setup(), dock = dockFor(g), ship = g.spawnUnit('war_galley', 0, ...Object.values(g.findSpawn(dock, true)));
  const e = g.map.starts[1];
  assert.equal(g.command(0, { type: 'move', ids: [ship.id], x: e.x + 0.5, y: e.y + 0.5 }).ok, true);
  assert.ok(passable(tileAt(g, ship.order), true), 'the order was moved onto water');
  let crossed = false;
  for (let i = 0; i < 20 * 150 && ship.order.type !== 'idle'; i++) { g.tick(); assert.ok(passable(tileAt(g, ship), true), 'never on land'); if (tileAt(g, ship) === 4) crossed = true; }
  assert.ok(crossed, 'sailed through the shallows'); assert.ok(Math.hypot(ship.x - e.x, ship.y - e.y) < 22, 'reached the enemy bay');
  // A soldier walks the shallows but never deep water.
  const ford = nearest(g, g.map.size / 2, g.map.size / 2, (t, i, j) => t === 4 && g.map.tiles[j * g.map.size + i + 1] === 4), u = g.spawnUnit('clubman', 0, ford.x, ford.y);
  const deep = nearest(g, ford.x, ford.y, t => t === 1);
  g.command(0, { type: 'move', ids: [u.id], x: deep.x, y: deep.y }); run(g, 200);
  assert.ok(passable(tileAt(g, u), false), 'still on foot ground');
});

test('Fishing Ships fish and land the catch at the Dock; villagers leave the fish alone', () => {
  const g = setup(), dock = dockFor(g), p = g.players[0];
  const sp = g.findSpawn(dock, true), boat = g.spawnUnit('fishing_ship', 0, sp.x, sp.y), v = [...g.units.values()].find(u => u.type === 'villager' && u.owner === 0);
  const fish = [...g.resources.values()].filter(r => r.type === 'fish').sort((a, b) => Math.hypot(a.x - boat.x, a.y - boat.y) - Math.hypot(b.x - boat.x, b.y - boat.y))[0];
  const berry = [...g.resources.values()].find(r => r.type === 'berry');
  assert.equal(g.command(0, { type: 'gather', ids: [v.id], resourceId: fish.id }).reason, 'needs a fishing ship');
  assert.equal(g.command(0, { type: 'gather', ids: [boat.id], resourceId: berry.id }).reason, 'no villagers');
  assert.equal(g.command(0, { type: 'gather', ids: [boat.id, v.id], resourceId: fish.id }).ok, true);
  assert.equal(v.order.type, 'idle', 'only the ship took the order');
  const food = p.res.food, left = fish.amount;
  run(g, 20 * 90);
  assert.ok(p.res.food - food >= 30, 'the catch was landed: ' + (p.res.food - food));
  assert.ok(fish.amount < left);
  assert.equal(g.command(0, { type: 'attack', ids: [boat.id], targetId: v.id }).reason, 'no units', 'a Fishing Ship cannot attack');
});

test('who can hit a ship: archers from the bank, anyone in the shallows; ships hit the shore but not inland', () => {
  const g = setup(), n = g.map.size, dock = dockFor(g);
  const off = nearest(g, dock.x + 1, dock.y + 1, (t, i, j) => t === 1 && g.toLand[j * n + i] >= 2 && g.toLand[j * n + i] <= 3); // 2-3 tiles out
  const galley = g.spawnUnit('war_galley', 1, off.x, off.y);
  const shore = nearest(g, off.x, off.y, t => t === 0), sword = g.spawnUnit('swordsman', 0, shore.x, shore.y), bow = g.spawnUnit('crossbowman', 0, shore.x, shore.y);
  assert.equal(canHit(g, sword, galley), false, 'a swordsman cannot reach a ship off the shore');
  assert.equal(canHit(g, bow, galley), true, 'a crossbowman can shoot it from the bank');
  assert.equal(canHit(g, galley, sword), true, 'the galley can shoot the bank');
  const ford = nearest(g, n / 2, n / 2, t => t === 4), wader = g.spawnUnit('war_galley', 1, ford.x, ford.y);
  assert.equal(canHit(g, sword, wader), true, 'a ship in the shallows can be boarded');
  const inland = g.spawnUnit('villager', 0, g.map.starts[0].x + 0.5, g.map.starts[0].y + 3.5);
  assert.equal(canHit(g, galley, inland), false, 'nor can a ship reach far inland');
  assert.equal(canHit(g, sword, dock), true, 'a Dock can be attacked from the shore');
  // An idle swordsman by the water does not chase the galley it can never reach, and orders on it end at once.
  run(g, 10);
  assert.notEqual(sword.order.target, galley.id);
  g.command(0, { type: 'attack', ids: [sword.id], targetId: galley.id }); g.tick();
  assert.equal(sword.order.type, 'idle');
  // The galley shoots what it can reach.
  galley.order = { type: 'attack', target: sword.id, fails: 0 }; const hp = sword.hp; run(g, 200);
  assert.ok(sword.hp < hp, 'the galley hit the swordsman on the bank');
});

test('a Tower shoots a ship in range', () => {
  const g = setup('iron'), dock = dockFor(g, 0), sp = g.findSpawn(dock, true), ship = g.spawnUnit('war_galley', 1, sp.x, sp.y), n = g.map.size;
  let spot = null;
  for (let r = 1; r < 6 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r; dx++) if (canPlace(g, 0, 'tower', Math.floor(sp.x) + dx, Math.floor(sp.y) + dy)) { spot = { x: Math.floor(sp.x) + dx, y: Math.floor(sp.y) + dy }; break; }
  assert.ok(spot, 'room for a tower by the bay ' + n);
  g.addBuilding('tower', 0, spot.x, spot.y, true);
  const hp = ship.hp; run(g, 100);
  assert.ok(ship.hp < hp);
});

test('ships alone cannot keep a side in the game, a Dock can', () => {
  const g = setup();
  for (const e of [...g.units.values(), ...g.buildings.values()]) if (e.owner === 1) g.remove(e);
  const dock = dockFor(g, 1), sp = g.findSpawn(dock, true); g.spawnUnit('war_galley', 1, sp.x, sp.y);
  assert.equal(isEliminated(g, 1), false, 'the Dock still trains ships');
  g.remove(dock);
  assert.equal(isEliminated(g, 1), true, 'a last ship does not count');
});

test('a bot builds a Dock, keeps a fleet and fishes', () => {
  const g = createGame({ seed: 2, rules: roundById('deathmatch') }), b = createBot(g, 0, 'hard');
  for (let i = 0; i < 20 * 600; i++) { g.tick(); if (g.time % 10 === 0) b.think(); }
  const mine = [...g.units.values()].filter(u => u.owner === 0);
  assert.ok([...g.buildings.values()].some(x => x.owner === 0 && x.type === 'dock' && x.constructed), 'a Dock');
  assert.ok(mine.filter(u => u.cls === 'ship').length >= 2, 'a fleet');
  assert.ok(mine.some(u => u.type === 'fishing_ship' && u.order.type === 'gather'), 'a Fishing Ship at work');
  assert.ok(mine.filter(u => u.naval).every(u => passable(tileAt(g, u), true)));
  assert.equal(b.maxRejects < 20, true, JSON.stringify(b.why));
});

// ---- transports and island maps ----
const islandGame = (seed = 4) => { const g = createGame({ seed, mapType: 'islands' }); for (const p of g.players) { p.explored.fill(1); p.age = 'iron'; p.res = { food: 9999, wood: 9999, gold: 9999, stone: 9999 }; } return g; };
const sameIsland = (g, a, b) => { // on foot from a to b, ignoring resources and buildings
  const n = g.map.size, seen = new Uint8Array(n * n), s = Math.floor(a.y) * n + Math.floor(a.x), st = [s]; seen[s] = 1;
  while (st.length) { const i = st.pop(), x = i % n, y = (i / n) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, j = ny * n + nx; if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[j] && g.map.tiles[j] !== 1) { seen[j] = 1; st.push(j); } } }
  return !!seen[Math.floor(b.y) * n + Math.floor(b.x)];
};
function loadedTransport(g, people) {
  const dock = dockFor(g), sp = g.findSpawn(dock, true), t = g.spawnUnit('transport_ship', 0, sp.x, sp.y);
  assert.equal(g.command(0, { type: 'board', ids: people.map(u => u.id), transportId: t.id }).ok, true);
  for (let i = 0; i < 20 * 120 && t.cargo.length < people.length; i++) g.tick();
  return t;
}

test('a Transport Ship carries soldiers across the sea: they board out of sight, take no orders, and land where sent', () => {
  const g = islandGame(), s = g.map.starts[0], e = g.map.starts[1];
  const army = [0, 1, 2, 3, 4].map(k => g.spawnUnit('swordsman', 0, s.x - 1.5 + k, s.y + 3.5)), t = loadedTransport(g, army);
  assert.equal(t.cargo.length, 5);
  assert.ok(army.every(u => u.aboard === t.id && !g.visibleEntities(0).includes(u) && !g.visibleEntities(1).includes(u)), 'hidden aboard');
  assert.equal(g.command(0, { type: 'move', ids: [army[0].id], x: s.x, y: s.y }).reason, 'no units', 'passengers take no orders');
  const enemyArcher = g.spawnUnit('crossbowman', 1, t.x, t.y); assert.equal(canHit(g, enemyArcher, army[0]), false, 'nor can they be shot');
  g.remove(enemyArcher);
  g.recount(); const pop = g.players[0].pop;
  assert.equal(g.command(0, { type: 'unload', transportId: t.id, x: e.x + 0.5, y: e.y + 0.5 }).ok, true);
  for (let i = 0; i < 20 * 150 && t.cargo.length; i++) g.tick();
  assert.equal(t.cargo.length, 0);
  assert.ok(army.every(u => !u.aboard && passable(tileAt(g, u), false) && sameIsland(g, u, e)), 'ashore on the enemy island');
  assert.equal(g.players[0].pop, pop, 'passengers counted in population all along');
  assert.ok(army.every(u => u.order.type === 'move'), 'and walking on to where they were sent');
});

test('a move to another island ferries the walkers over: the transport comes, carries a boatload, and goes back for the rest', () => {
  const g = islandGame(), s = g.map.starts[0], e = g.map.starts[1];
  const army = Array.from({ length: 12 }, (_, k) => g.spawnUnit(k % 3 ? 'swordsman' : 'villager', 0, s.x - 5.5 + k, s.y + 3.5));
  const homebody = g.spawnUnit('clubman', 0, s.x + 0.5, s.y + 5.5);
  const dock = dockFor(g), sp = g.findSpawn(dock, true), t = g.spawnUnit('transport_ship', 0, sp.x, sp.y);
  // No transport selected: the free one is used; a soldier sent along on the same island just walks.
  assert.equal(g.command(0, { type: 'move', ids: army.map(u => u.id), x: e.x + 0.5, y: e.y + 0.5, ferry: true }).ok, true);
  assert.ok(army.every(u => u.order.type === 'ferry' && u.order.transport === t.id));
  assert.equal(t.order.type, 'ferry'); assert.equal(t.order.ids.length, 12);
  const slots = Object.values(t.order.slots);
  assert.equal(new Set(slots.map(p => p.x + ',' + p.y)).size, 12, 'each has its own place in the formation over there');
  assert.ok(slots.every(p => sameIsland(g, p, e) && Math.hypot(p.x - e.x, p.y - e.y) < 10));
  let trips = 0, wasLoaded = false;
  for (let i = 0; i < 20 * 600 && t.order.type === 'ferry'; i++) {
    g.tick();
    if (t.cargo.length) wasLoaded = true;
    else if (wasLoaded) { trips++; wasLoaded = false; }
    assert.ok(t.cargo.length <= 8);
  }
  assert.equal(t.order.type, 'idle', 'done once everyone is over');
  assert.ok(trips >= 2, 'two boatloads: ' + trips);
  assert.ok(army.every(u => !u.aboard && sameIsland(g, u, e)), 'all ashore on the enemy island');
  // Sent back home together with someone already there: two transports selected split the riders between them.
  const t2 = g.spawnUnit('transport_ship', 0, sp.x, sp.y), riders = army.slice(0, 10);
  assert.equal(g.command(0, { type: 'move', ids: [...riders.map(u => u.id), homebody.id, t.id, t2.id], x: s.x + 0.5, y: s.y + 0.5, ferry: true }).ok, true);
  assert.equal(homebody.order.type, 'move', 'the one at home walks');
  assert.deepEqual([t.order.ids.length, t2.order.ids.length].sort(), [2, 8]);
  for (let i = 0; i < 20 * 600 && (t.order.type === 'ferry' || t2.order.type === 'ferry'); i++) g.tick();
  assert.ok(riders.every(u => !u.aboard && sameIsland(g, u, s)), 'all home again');
});

test('a ferry rider given another order drops out; with no transport, or no `ferry` flag, a move across the sea is a plain move', () => {
  const g = islandGame(), s = g.map.starts[0], e = g.map.starts[1];
  const pair = [0, 1].map(k => g.spawnUnit('swordsman', 0, s.x + 0.5 + k, s.y + 3.5));
  assert.equal(g.command(0, { type: 'move', ids: pair.map(u => u.id), x: e.x + 0.5, y: e.y + 0.5, ferry: true }).ok, true);
  assert.ok(pair.every(u => u.order.type === 'move'), 'nothing to carry them');
  const dock = dockFor(g), sp = g.findSpawn(dock, true), t = g.spawnUnit('transport_ship', 0, sp.x, sp.y);
  g.command(0, { type: 'move', ids: pair.map(u => u.id), x: e.x + 0.5, y: e.y + 0.5 });
  assert.ok(pair.every(u => u.order.type === 'move'), 'only a move with `ferry` set (the player\'s) takes the boat');
  g.command(0, { type: 'move', ids: pair.map(u => u.id), x: e.x + 0.5, y: e.y + 0.5, ferry: true });
  g.tick();
  g.command(0, { type: 'move', ids: [pair[1].id], x: s.x + 0.5, y: s.y + 0.5 });
  for (let i = 0; i < 20 * 400 && t.order.type === 'ferry'; i++) g.tick();
  assert.ok(sameIsland(g, pair[0], e) && !pair[0].aboard, 'the first went over');
  assert.ok(sameIsland(g, pair[1], s), 'the second stayed home');
});

test('a transport refuses more than 8, and sinking it drowns everyone aboard; a relic aboard washes ashore', () => {
  const g = islandGame(), s = g.map.starts[0];
  const nine = Array.from({ length: 9 }, (_, k) => g.spawnUnit('clubman', 0, s.x - 4.5 + k, s.y + 3.5)), t = loadedTransport(g, nine);
  assert.equal(t.cargo.length, 8, 'room for 8');
  assert.equal(g.command(0, { type: 'board', ids: [nine.find(u => !u.aboard).id], transportId: t.id }).reason, 'transport full');
  const aboard = nine.filter(u => u.aboard), relic = g.spawnRelic(t.x, t.y); relic.holder = aboard[0].id; aboard[0].relic = relic.id; // a relic in the hold
  const enemy = g.spawnUnit('war_galley', 1, t.x, t.y), kills = g.players[1].kills;
  g.damage(t, 9999, enemy); g.tick();
  assert.ok(aboard.every(u => u.dead), 'all drowned');
  assert.equal(g.players[1].kills - kills, 2 + 2 * 8, 'kills for the ship and everyone aboard');
  assert.equal(relic.holder, null); assert.equal(g.map.tiles[Math.floor(relic.y) * g.map.size + Math.floor(relic.x)], 0, 'the relic lies on land');
});

test('carried relics: after landing, a relic carrier takes it on to a Town Center', () => {
  const g = islandGame(), s = g.map.starts[0], c = g.map.relicSpots[0];
  const carrier = g.spawnUnit('clubman', 0, s.x + 0.5, s.y + 3.5), relic = g.spawnRelic(carrier.x, carrier.y); relic.holder = carrier.id; carrier.relic = relic.id;
  const t = loadedTransport(g, [carrier]);
  g.command(0, { type: 'unload', transportId: t.id, x: c.x, y: c.y }); // over to the centre and back again
  for (let i = 0; i < 20 * 120 && t.cargo.length; i++) g.tick();
  g.command(0, { type: 'board', ids: [carrier.id], transportId: t.id });
  for (let i = 0; i < 20 * 120 && !carrier.aboard; i++) g.tick();
  g.command(0, { type: 'unload', transportId: t.id, x: s.x, y: s.y });
  for (let i = 0; i < 20 * 200 && relic.stored === null; i++) g.tick();
  assert.equal(g.relicOwner(relic), 0); assert.notEqual(relic.stored, null, 'stored at home');
});

test('on an island map the bot ferries an army to the enemy island and relic squads to the centre', () => {
  // Death Match on islands: rich and in the Iron Age, so a hard bot crosses within minutes.
  const g = createGame({ seed: 2, rules: roundById('deathmatch'), mapType: 'islands' }), b = createBot(g, 0, 'hard'), e = g.map.starts[1];
  let landed = 0;
  for (let i = 0; i < 20 * 900 && landed < 4; i++) {
    g.tick(); if (g.time % 10 === 0) b.think();
    if (g.time % 100 === 0) landed = [...g.units.values()].filter(u => u.owner === 0 && !u.naval && !u.aboard && sameIsland(g, u, e)).length;
  }
  assert.ok(landed >= 4, 'soldiers landed on the enemy island: ' + landed);
  assert.ok([...g.units.values()].some(u => u.owner === 0 && u.type === 'transport_ship'));
  assert.ok(b.maxRejects < 20, JSON.stringify(b.why));
  // Capture the Relics on islands: the relics are on the central island; the bot fetches them home by sea.
  const r = createGame({ seed: 3, rules: roundById('relics'), mapType: 'islands' }), rb = createBot(r, 0, 'hard');
  for (let i = 0; i < 20 * 1500 && ![...r.relics.values()].some(x => r.relicOwner(x) === 0 && x.stored !== null); i++) { r.tick(); if (r.time % 10 === 0) rb.think(); }
  assert.ok([...r.relics.values()].some(x => r.relicOwner(x) === 0 && x.stored !== null), 'a relic stored at home');
  assert.ok(rb.maxRejects < 20, JSON.stringify(rb.why));
});

test('on an island map a lone bot climbs four Ages (to Medieval) on its home island alone', () => {
  const g = createGame({ seed: 1, mapType: 'islands' }), b = createBot(g, 0, 'easy'), home = g.map.starts[0];
  let villagerAbroad = false;
  for (let i = 0; i < 20 * 60 * 35 && g.players[0].age !== 'medieval'; i++) {
    g.tick(); if (g.time % 20 === 0) b.think();
    if (g.time % 600 === 0) villagerAbroad ||= [...g.units.values()].some(u => u.owner === 0 && u.type === 'villager' && !sameIsland(g, u, home));
  }
  assert.equal(g.players[0].age, 'medieval', 'reached the Medieval Age within 35 minutes');
  assert.equal(villagerAbroad, false, 'every villager stayed on the home island');
});

// Hold the age at Stone to prove the bot uses fishing before transport or combat ships unlock.
test('a Stone Age bot launches and works Fishing Ships', () => {
  const g = setup('stone', 2), dock = dockFor(g), bot = createBot(g, 0, 'hard');
  for (let i = 0; i < 20 * 120; i++) {
    g.players[0].age = 'stone'; g.players[0].ageUp = null;
    g.tick(); if (g.time % 10 === 0) bot.think();
  }
  const boats = [...g.units.values()].filter(u => u.owner === 0 && u.naval);
  assert.ok(boats.some(u => u.type === 'fishing_ship' && u.order.type === 'gather'));
  assert.ok(boats.every(u => u.type === 'fishing_ship'));
  assert.ok(dock.constructed);
  assert.equal(bot.why.age ?? 0, 0, 'no rejected attempts to train locked ships');
});
