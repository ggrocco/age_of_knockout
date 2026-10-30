import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { KINGDOMS, ROUNDS, scoreOf } from '../src/rounds/index.js';
import { generateMap, homeBudget } from '../src/sim/map.js';
import { rotations } from '../src/sim/map-four.js';
import { updateTerritory, checkKingdoms } from '../src/sim/kingdoms.js';
import { hit, damageTo, canHit } from '../src/sim/orders.js';
import { updateVision } from '../src/sim/vision.js';
import { updateTower } from '../src/sim/defence.js';
import { updateRespawn, spawnPatchPair, PATCH_CAP } from '../src/sim/ore.js';
import { createBot } from '../src/ai/bot.js';
import { kingdomRows, kingdomStandingsHtml } from '../src/ui/kingdoms.js';
import { TEAMS } from '../src/data/teams.js';
import { roundTipHtml } from '../src/ui/tips.js';
import { canPlace } from '../src/sim/commands.js';

const G = (options = {}) => createGame({ seed: 3, rules: KINGDOMS, capTicks: Infinity, ...options });
const king = (g, pid) => g.units.get(g.roundState.kings[pid]);
const run = (g, ticks) => { for (let i = 0; i < ticks; i++) g.tick(); };
function arena() {
  const g = G();
  for (const e of [...g.resources.values(), ...g.buildings.values()]) g.remove(e);
  g.map.tiles.fill(0); g.terrainVersion++;
  for (const p of g.players) { p.explored.fill(1); p.visible.fill(1); }
  return g;
}
function capture(g, loser, winner) { g.damage(king(g, loser), 9999, king(g, winner)); }

test('Kingdoms is separate from the five tournament rounds and starts four equal civilizations', () => {
  const g = G();
  assert.equal(ROUNDS.length, 5);
  assert.ok(!ROUNDS.includes(KINGDOMS));
  assert.equal(createGame().players.length, 2);
  assert.equal(g.players.length, 4);
  assert.deepEqual(g.players.map(p => [p.age, p.workRate, p.pop]), Array.from({ length: 4 }, () => ['stone', 1, 4]));
  assert.equal(new Set(g.roundState.territory.counts).size, 1);
  assert.equal(new Set(TEAMS.map(t => t.color)).size, 4);
  assert.ok(roundTipHtml(KINGDOMS).includes('remaining tie is a draw'));
});

test('each of the four starts has a usable nearby Dock shore on both map types', () => {
  for (const mapType of ['rivers', 'islands']) for (const seed of [1, 3, 12]) {
    const g = G({ mapType, seed }), n = g.map.size;
    for (const p of g.players) {
      p.explored.fill(1);
      const home = g.map.starts[p.id]; let found = false;
      for (let y = 1; y < n - 4 && !found; y++) for (let x = 1; x < n - 4; x++) {
        if (Math.hypot(x + 1.5 - home.x, y + 1.5 - home.y) < 30 && canPlace(g, p.id, 'dock', x, y)) { found = true; break; }
      }
      assert.ok(found, `${mapType} seed ${seed} player ${p.id}`);
    }
  }
});

test('four-player maps have quarter-turn terrain, resources, ore and equivalent usable island budgets', () => {
  for (const type of ['rivers', 'islands']) for (let seed = 1; seed <= 20; seed++) {
    const m = generateMap(seed, 112, type, 4), n = m.size;
    assert.deepEqual(m.starts, rotations(n, m.starts[0].x, m.starts[0].y));
    for (let i = 0; i < n * n; i++) {
      const p = rotations(n, i % n, Math.floor(i / n))[1];
      assert.equal(m.tiles[i], m.tiles[p.y * n + p.x], `${type} ${seed}`);
    }
    const resources = new Set(m.resources.map(r => `${r.type}:${Math.floor(r.x)},${Math.floor(r.y)}:${r.amount}`));
    for (const r of m.resources) for (const p of rotations(n, Math.floor(r.x), Math.floor(r.y))) {
      assert.ok(resources.has(`${r.type}:${p.x},${p.y}:${r.amount}`));
    }
    for (const patch of m.orePatches) for (const i of patch.tiles) {
      const p = rotations(n, i % n, Math.floor(i / n))[1];
      assert.ok(m.orePatches.some(q => q.kind === patch.kind && q.reserve === patch.reserve && q.tiles.includes(p.y * n + p.x)));
    }
    if (type === 'islands') assert.ok(m.starts.every((_, pid) => homeBudget(m, pid).ok));
  }
});

test('a king needs ten villagers worth of damage; original Regicide stats remain unchanged', () => {
  const g = G(), k = king(g, 1), villager = [...g.units.values()].find(u => u.type === 'villager');
  assert.equal(k.maxHp, villager.maxHp * 10);
  const attacker = { atk: 25, atkType: 'melee', owner: 0 };
  assert.equal(damageTo(attacker, k), damageTo(attacker, villager));
  assert.equal(damageTo({ ...attacker, atkType: 'pierce' }, k), damageTo({ ...attacker, atkType: 'pierce' }, villager));
  for (let i = 0; i < 9; i++) hit(g, attacker, k);
  assert.equal(k.hp, 25); assert.equal(g.players[1].defeated, false);
  hit(g, attacker, k); assert.equal(g.players[1].defeated, true);
  const old = createGame({ rules: ROUNDS[2] });
  assert.equal(old.units.get(old.roundState.kings[0]).hp, 120);
});

test('conquest inherits assets, resources, fog, relics, queues, best age and upgrades exactly once', () => {
  const g = arena(), p = g.players[0], enemy = g.players[1];
  p.age = 'tool'; enemy.age = 'iron'; p.ageUp = { to: 'bronze', remaining: 5 };
  enemy.ageUp = { to: 'medieval', remaining: 90 };
  g.completeTech(0, 'bronze_weapons'); g.completeTech(1, 'bronze_weapons'); g.completeTech(1, 'gold_mining');
  g.completeTech(1, 'phalanx_drill');
  const mine = g.spawnUnit('swordsman', 0, 30, 30), theirs = g.spawnUnit('swordsman', 1, 35, 35);
  mine.hp /= 2; theirs.hp /= 2;
  const b = g.addBuilding('barracks', 1, 40, 40, true);
  b.queue.push({ unit: 'clubman', remaining: 100 });
  const research = g.addBuilding('market', 1, 45, 40, true);
  research.research = { tech: 'gold_mining', remaining: 20 };
  const slow = g.addBuilding('storage_pit', 0, 50, 40, true), fast = g.addBuilding('storage_pit', 1, 53, 40, true);
  slow.research = { tech: 'bronze_shields', remaining: 80 }; fast.research = { tech: 'bronze_shields', remaining: 20 };
  const farm = g.addBuilding('farm', 0, 56, 40, true); farm.amount /= 2;
  const ship = g.spawnUnit('transport_ship', 1, 60, 60), passenger = g.spawnUnit('villager', 1, 60, 60);
  ship.cargo.push(passenger.id); passenger.aboard = ship.id;
  const relic = g.spawnRelic(40, 40); relic.stored = b.id;
  p.explored.fill(0); enemy.explored.fill(0); enemy.explored[0] = 1;
  capture(g, 1, 0);
  assert.equal(enemy.defeated, true); assert.equal(enemy.defeatedBy, 0);
  assert.equal(p.res.food, 400); assert.equal(enemy.res.food, 0);
  assert.equal(p.age, 'iron'); assert.deepEqual(p.ageUp, { to: 'medieval', remaining: 90 });
  assert.equal(p.explored[0], 1); assert.equal(b.owner, 0); assert.equal(g.relicOwner(relic), 0);
  assert.equal(b.queue[0].remaining, 100); assert.equal(research.research, null);
  for (const u of [mine, theirs]) {
    assert.equal(u.atk, 15); assert.equal(u.maxHp, 180); assert.equal(u.hp / u.maxHp, 0.5); assert.equal(u.owner, 0);
  }
  assert.equal(slow.research, null); assert.equal(fast.research.remaining, 20);
  assert.equal(farm.amount / farm.maxAmount, 0.5);
  assert.equal(ship.owner, 0); assert.equal(passenger.owner, 0); assert.equal(passenger.aboard, ship.id);
  assert.equal(p.gatherMult.gold, 1.25);
  g.damage({ ...king(g, 0), owner: 1, dead: true }, 999, king(g, 0));
  assert.equal(p.res.food, 400);
  assert.equal(g.command(1, { type: 'age' }).reason, 'defeated');
  capture(g, 0, 2);
  assert.equal(b.owner, 2); assert.equal(theirs.owner, 2); assert.equal(g.players[2].res.food, 600);
  assert.equal(g.players[2].gatherMult.gold, 1.25);
});

test('capture clears newly friendly attacks, keeps population overflow and stops the defeated bot', () => {
  const g = G(), bot = createBot(g, 1);
  const soldier = g.spawnUnit('clubman', 0, 40, 40), enemy = g.spawnUnit('clubman', 1, 41, 40);
  soldier.order = { type: 'attack', target: enemy.id }; enemy.order = { type: 'attack', target: soldier.id };
  for (let i = 0; i < 50; i++) g.spawnUnit('villager', 1, 50, 50);
  capture(g, 1, 0);
  assert.equal(soldier.order.type, 'idle'); assert.equal(enemy.order.type, 'idle');
  assert.ok(g.players[0].pop > g.players[0].popCap);
  const before = bot.issued; bot.think(); assert.equal(bot.issued, before);
  const tc = [...g.buildings.values()].find(b => b.owner === 0 && b.type === 'town_center');
  assert.equal(g.command(0, { type: 'train', buildingId: tc.id, unit: 'villager' }).ok, false);
});

test('kings enter reachable castles, ignore direct/splash/tower targeting, and survive castle destruction', () => {
  const g = arena(), k = king(g, 0); k.x = 30.5; k.y = 30.5; k.hp = 180;
  const castle = g.addBuilding('castle', 0, 34, 30, true);
  run(g, 150);
  assert.equal(k.garrisonedIn, castle.id); assert.equal(castle.king, k.id);
  assert.ok(!g.visibleEntities(0).includes(k));
  assert.equal(g.command(0, { type: 'move', ids: [k.id], x: 20, y: 20 }).ok, false);
  const attacker = g.spawnUnit('catapult', 1, 32, 30);
  assert.equal(canHit(g, attacker, k), false);
  g.damage(k, 10000, attacker); assert.equal(k.hp, 180);
  const tower = g.addBuilding('tower', 1, 28, 28, true);
  updateVision(g); updateTower(g, tower); assert.equal(k.hp, 180);
  castle.hp = 1; hit(g, attacker, castle);
  assert.equal(k.garrisonedIn, null); assert.equal(k.hp, 180); assert.ok(g.units.has(k.id));
  assert.equal(g.occAt(Math.floor(k.x), Math.floor(k.y)), 0);
  const replacement = g.addBuilding('castle', 0, 39, 32, true);
  run(g, 300); assert.equal(k.garrisonedIn, replacement.id);
  assert.equal(g.command(0, { type: 'delete', id: replacement.id }).ok, true);
  assert.equal(k.garrisonedIn, null); assert.ok(k.hp > 0);
});

test('an unreachable nearer castle is skipped and foundations never shelter kings', () => {
  const g = arena(), k = king(g, 0); k.x = 30.5; k.y = 30.5;
  const blocked = g.addBuilding('castle', 0, 34, 30, true);
  for (let y = 28; y < 36; y++) for (let x = 32; x < 40; x++) {
    if (x < 33 || x > 38 || y < 29 || y > 34) g.map.tiles[y * g.map.size + x] = 1;
  }
  const foundation = g.addBuilding('castle', 0, 24, 30, false);
  const reachable = g.addBuilding('castle', 0, 25, 36, true);
  run(g, 300);
  assert.notEqual(k.garrisonedIn, blocked.id); assert.notEqual(k.garrisonedIn, foundation.id);
  assert.equal(k.garrisonedIn, reachable.id);
});

test('king deaths from towers, splash and sunk transports credit the responsible empire', () => {
  for (const source of ['tower', 'splash', 'transport']) {
    const g = arena(), k = king(g, 1); k.x = 30.5; k.y = 30.5; k.hp = 1;
    if (source === 'tower') {
      const tower = g.addBuilding('tower', 2, 27, 27, true); tower.atk = 100;
      updateVision(g); updateTower(g, tower);
    } else if (source === 'splash') {
      const target = g.addBuilding('house', 1, 31, 30, true);
      k.x = 30.9; k.y = 30.9;
      hit(g, g.spawnUnit('catapult', 2, 28, 30), target);
    } else {
      const ship = g.spawnUnit('transport_ship', 1, 30.5, 30.5);
      ship.cargo.push(k.id); k.aboard = ship.id;
      g.damage(ship, 9999, g.spawnUnit('war_galley', 2, 31, 31));
    }
    assert.equal(g.players[1].defeated, true, source); assert.equal(g.players[1].defeatedBy, 2, source);
    assert.equal(g.players[2].res.food, 400, source);
  }
});

test('territory is bounded by ground distance, contested tiles are neutral, and footprints update claims', () => {
  const g = arena(), n = g.map.size;
  const a = g.addBuilding('house', 0, 30, 30, true), b = g.addBuilding('house', 1, 37, 30, true);
  const foundation = g.addBuilding('house', 2, 60, 60, false);
  updateTerritory(g);
  assert.equal(g.roundState.territory.owners[30 * n + 34], -1);
  assert.equal(g.roundState.territory.owners[30 * n + 33], 0);
  assert.equal(g.roundState.territory.owners[60 * n + 60], -1);
  foundation.constructed = true; updateTerritory(g); assert.equal(g.roundState.territory.owners[60 * n + 60], 2);
  g.remove(b); updateTerritory(g); assert.equal(g.roundState.territory.owners[30 * n + 34], 0);
  for (let y = 0; y < n; y++) g.map.tiles[y * n + 33] = 1;
  g.terrainVersion++; updateTerritory(g);
  assert.equal(g.roundState.territory.owners[30 * n + 34], -1);
  const version = g.roundState.territory.version; updateTerritory(g); assert.equal(g.roundState.territory.version, version);
  g.remove(a); updateTerritory(g); assert.equal(g.roundState.territory.counts[0], 0);
  const before = g.roundState.territory.counts[2]; assert.ok(before > 0);
  assert.equal(g.command(2, { type: 'delete', id: foundation.id }).ok, true);
  assert.equal(g.roundState.territory.counts[2], 0, 'deletion updates claims without waiting for a tick');
});

test('only the last empire wins; territory then score resolves deadlines and exact ties draw', () => {
  const g = G(); capture(g, 1, 0); g.tick(); assert.equal(g.result, null);
  capture(g, 2, 0); capture(g, 3, 0); g.tick(); assert.equal(g.result.winner, 0);
  const timed = G(); timed.time = 999999; timed.tick(); assert.equal(timed.result, null);
  timed.capTicks = timed.time + 1; timed.players[2].kills = 1000; timed.tick();
  assert.equal(timed.result.winner, 2); assert.equal(timed.result.reason, 'territory');
  const draw = arena(); draw.capTicks = 1; draw.tick(); assert.equal(draw.result.winner, null);
  const land = arena(); land.addBuilding('castle', 3, 40, 40, true); land.capTicks = 1; land.tick(); assert.equal(land.result.winner, 3);
});

test('resignation and unattributed king deaths eliminate one team without awarding assets or ending four-way play', () => {
  for (const resign of [true, false]) {
    const g = G();
    if (resign) assert.equal(g.command(0, { type: 'resign' }).ok, true);
    else g.remove(king(g, 0));
    g.tick(); assert.equal(g.result, null); assert.equal(g.players[0].defeated, true);
    assert.ok(![...g.entities.values()].some(e => e.owner === 0));
    assert.equal(g.players[1].res.food, 200);
    assert.equal(checkKingdoms(g, scoreOf), null);
  }
});

test('four-team replenishment creates rotated groups and scales ore caps', () => {
  const g = G();
  for (const r of [...g.resources.values()]) if (r.type === 'gold') g.remove(r);
  updateRespawn(g);
  const piles = [...g.resources.values()].filter(r => r.type === 'gold');
  assert.equal(piles.length, 16);
  const keys = new Set(piles.map(r => Math.floor(r.y) * g.map.size + Math.floor(r.x)));
  for (const r of piles) for (const p of rotations(g.map.size, Math.floor(r.x), Math.floor(r.y))) assert.ok(keys.has(p.y * g.map.size + p.x));
  assert.equal(spawnPatchPair(g, 'stone', 800), true);
  assert.equal([...g.patches.values()].filter(p => p.kind === 'stone').length, PATCH_CAP.stone * 2);
  assert.equal(spawnPatchPair(g, 'stone', 800), false);
});

test('standings distinguish four teams, sheltered kings, conquered teams and territory ranking', () => {
  const g = G(); capture(g, 1, 2);
  assert.equal(kingdomRows(g)[0].id, 2);
  const html = kingdomStandingsHtml(g, true);
  for (const team of TEAMS) assert.ok(html.includes(team.name));
  assert.ok(html.includes('Conquered')); assert.ok(html.includes('Final standings'));
});

test('the bot builds a protective castle and retargets after its preferred opponent is conquered', () => {
  const g = G(), bot = createBot(g, 0, 'hard'), p = g.players[0];
  p.age = 'medieval'; p.res = { food: 10000, wood: 10000, gold: 10000, stone: 10000 }; p.explored.fill(1);
  bot.think();
  assert.ok([...g.buildings.values()].some(b => b.owner === 0 && b.type === 'castle'));
  const previous = { ...bot.sweep[0] };
  const enemy = g.map.starts.findIndex(s => s.x === previous.x && s.y === previous.y);
  capture(g, enemy, 0); bot.think();
  assert.notDeepEqual(bot.sweep[0], previous);
  assert.equal(bot.maxRejects, 0);
  run(g, 4000);
  const castle = [...g.buildings.values()].find(b => b.owner === 0 && b.type === 'castle');
  assert.equal(castle.constructed, true);
  assert.equal(king(g, 0).garrisonedIn, castle.id);
});

test('island bots collect inherited armies and retarget active ferry destinations after conquest', () => {
  const g = G({ mapType: 'islands' }); capture(g, 3, 0);
  const p = g.players[0]; p.age = 'medieval'; p.explored.fill(1); p.res = { food: 9999, wood: 9999, gold: 9999, stone: 9999 };
  const home = g.map.starts[3], n = g.map.size;
  let spot = null, distance = Infinity;
  for (let y = 1; y < n - 4; y++) for (let x = 1; x < n - 4; x++) {
    const d = Math.hypot(x - home.x, y - home.y);
    if (d < distance && canPlace(g, 0, 'dock', x, y)) { distance = d; spot = { x, y }; }
  }
  const dock = g.addBuilding('dock', 0, spot.x, spot.y, true), launch = g.findSpawn(dock, true);
  const transport = g.spawnUnit('transport_ship', 0, launch.x, launch.y);
  for (let i = 0; i < 20; i++) g.spawnUnit('clubman', 0, home.x + 3.5, home.y + 3.5);
  g.time = 10000;
  const bot = createBot(g, 0, 'hard'); bot.think();
  const job = bot.ferry.get(transport.id);
  assert.ok(job?.wave); assert.ok(job.ids.length > 0);
  const old = { ...job.dest }, enemy = g.map.starts.findIndex(s => s.x === old.x && s.y === old.y);
  capture(g, enemy, 0); bot.think();
  assert.notDeepEqual(job.dest, old);
  assert.deepEqual(job.dest, bot.sweep[0]);
});
