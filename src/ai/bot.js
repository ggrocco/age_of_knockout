// Scripted build-order AI. Issues only game.command calls and reads game.visibleEntities/knownResources.
import { UNITS } from '../data/units.js';
import { BUILDINGS } from '../data/buildings.js';
import { AGES, AGE_COST, ageIndex, popLimit } from '../data/ages.js';
import { TECHS } from '../data/techs.js';
import { canPlace, canAfford, canRepair, ageUpProblem, ageUpNeed, ageBuildings } from '../sim/commands.js';
import { RES_KIND, WATER, centerOf, distPoint } from '../sim/util.js';
import { canHit } from '../sim/orders.js';
import { nearestOpen } from '../sim/formation.js';
import { parseTimeLimit } from '../time-limit.js';

// attackAge: the bot sends no wave before reaching this age. grace: no wave before this tick in any round
// (overrides the early Wonder rush and Death Match timings), so a relaxed match starts peacefully like AoE1.
// towers: how many Towers it keeps near its Town Center from the Tool Age on.
// fleet: warships it keeps from the Bronze Age on (two more once it has seen enemy ships); fishers: Fishing Ships from the Medieval Age;
// transports: Transport Ships it keeps when the enemy (or, in the relics round, a relic) is across the sea.
// ageFirst: research and the second half of the army only spend what leaves the next age-up affordable.
// work: the bot's sim workRate handicap (half-speed economy and production). cap: the match's time limit in ticks.
export const DIFF = {
  relaxed: { every: 40, villagers: 14, wave: 10, attackAt: 36000, army: 12, attackAge: 'bronze', grace: 36000, dmWave: 20, dmArmy: 24, work: 0.5, cap: 48000, towers: 1, fleet: 1, fishers: 2, transports: 1 },
  easy:    { every: 20, villagers: 18, wave: 12, attackAt: 10000, army: 16, attackAge: 'tool', grace: 0, dmWave: 24, dmArmy: 44, towers: 1, ageFirst: true, fleet: 2, fishers: 2, transports: 1 },
  medium:  { every: 15, villagers: 20, wave: 14, attackAt: 8000, army: 28, attackAge: 'stone', grace: 0, dmWave: 32, dmArmy: 44, towers: 2, fleet: 3, fishers: 3, transports: 2 },
  hard:    { every: 10, villagers: 26, wave: 18, attackAt: 8000, army: 36, attackAge: 'stone', grace: 0, dmWave: 38, dmArmy: 44, towers: 3, fleet: 4, fishers: 4, transports: 2 },
};
// Bot think interval in ticks for each difficulty.
export const THINK_EVERY = Object.fromEntries(Object.entries(DIFF).map(([k, d]) => [k, d.every]));
// createGame options for a match between these bot difficulties (null = a human player): each bot's handicap,
// and the chosen time limit, otherwise the longest bot cap (undefined keeps the round's own).
export const matchOptions = (diffs, { noTimeLimit = false, timeLimit } = {}) => ({
  workRate: diffs.map(d => DIFF[d]?.work ?? 1),
  capTicks: parseTimeLimit(timeLimit) !== null ? (Number(timeLimit) === 0 ? Infinity : Number(timeLimit) * 1200)
    : noTimeLimit ? Infinity : Math.max(0, ...diffs.map(d => DIFF[d]?.cap ?? 0)) || undefined,
});
const SHARE = { food: 0.35, wood: 0.35, gold: 0.2, stone: 0.1 };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Tiles reachable on foot from start on the bare map: water and the map's starting resources block, buildings don't.
function reachableFrom(map, start) {
  const n = map.size, blocked = new Uint8Array(n * n), seen = new Uint8Array(n * n);
  for (let i = 0; i < n * n; i++) blocked[i] = map.tiles[i] === 1 ? 1 : 0;
  for (const r of map.resources) blocked[Math.floor(r.y) * n + Math.floor(r.x)] = 1;
  const queue = [start.y * n + start.x]; seen[queue[0]] = 1;
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k], x = i % n, y = (i / n) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * n + nx;
      if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[j] && !blocked[j]) { seen[j] = 1; queue.push(j); }
    }
  }
  return seen;
}
// Each walkable tile's land mass (4-neighbour, deep water parts them; -1 on deep water), from the bare map: on an island
// map the home islands and the central island are separate land masses, on a river map there is one.
function landMasses(map) {
  const n = map.size, id = new Int32Array(n * n).fill(-1);
  for (let s = 0, next = 0; s < n * n; s++) {
    if (map.tiles[s] === 1 || id[s] >= 0) continue;
    const queue = [s]; id[s] = next;
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k], x = i % n, y = (i / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * n + nx;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && id[j] < 0 && map.tiles[j] !== 1) { id[j] = next; queue.push(j); }
      }
    }
    next++;
  }
  return id;
}
// Nearest tile (by square rings) in the reachable set.
function nearestReachable(map, reach, p) {
  const n = map.size;
  for (let r = 0; r < n; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = p.x + dx, y = p.y + dy;
    if (x >= 0 && y >= 0 && x < n && y < n && reach[y * n + x]) return { x, y };
  }
  return p;
}

export function createBot(game, pid, difficulty = 'medium') {
  const D = DIFF[difficulty], me = game.players[pid], enemy = 1 - pid, enemyStart = game.map.starts[enemy];
  // Fixed sweep points can fall in a lake; every unit sent there would search the whole map for a path, so snap them to reachable land.
  // The points are laid out for a 64-tile map and scaled to the real size.
  const reach = reachableFrom(game.map, game.map.starts[pid]), k = game.map.size / 64;
  // Which land mass a point is on; soldiers only get orders for targets on their own (a transport ferries the rest).
  const mass = landMasses(game.map), massOf = p => mass[Math.floor(p.y) * game.map.size + Math.floor(p.x)], homeMass = massOf(game.map.starts[pid]);
  const sameLand = (a, b) => massOf(a) === massOf(b), overSea = massOf(enemyStart) !== homeMass;
  const sweep = [enemyStart, ...[[16, 16], [48, 16], [16, 48], [48, 48], [32, 32], [32, 10], [32, 54], [10, 32], [54, 32]].map(([x, y]) => nearestReachable(game.map, reach, { x: Math.round(x * k), y: Math.round(y * k) }))];
  const sentTo = new Map(); // unit id -> sweepIdx of the waypoint it was last sent to
  const bot = { saving: false, why: {}, rejects: 0, maxRejects: 0, issued: 0, waveActive: false, sweep, sweepIdx: 0, scout: 0, think };

  // In the Wonder round, keep the wonder's cost untouched until it is placed.
  const reserved = () => (game.rules && game.rules.id === 'wonder' && !mine('buildings').some(b => b.type === 'wonder')) ? BUILDINGS.wonder.cost : null;
  const canPay = cost => { const r = reserved(); return canAfford(me, r ? Object.fromEntries(['food', 'wood', 'gold', 'stone'].map(k => [k, (cost[k] || 0) + (r[k] || 0)])) : cost); };

  function cmd(c) {
    const r = game.command(pid, c); bot.issued++;
    if (r.ok) bot.rejects = 0; else { const k = c.type + ':' + (c.building || c.unit || '') + ':' + r.reason; bot.why[k] = (bot.why[k] || 0) + 1; bot.rejects++; bot.maxRejects = Math.max(bot.maxRejects, bot.rejects); }
    return r.ok;
  }
  const mine = kind => [...game[kind].values()].filter(e => e.owner === pid && !e.aboard); // passengers take no orders
  const count = type => mine('buildings').filter(b => b.type === type).length;
  // True when paying `cost` still leaves, of each resource it spends, what the next age-up costs (from the Age of Sail on
  // that includes stone). No reserve while an age-up is already paid for and running, or at the last age.
  const leavesAgeUp = cost => {
    const next = AGES[ageIndex(me.age) + 1], need = !me.ageUp && next ? AGE_COST[next].cost : {};
    return Object.keys(cost).every(k => !cost[k] || me.res[k] - cost[k] >= (need[k] || 0));
  };

  // More villagers as the eras go on (the age-ups and buildings cost more): +2 a era from the Iron Age, +12 in AI Future.
  const villagerTarget = () => D.villagers + 2 * Math.max(0, ageIndex(me.age) - ageIndex('bronze'));

  function spotNear(type, around, margin = true) {
    const def = BUILDINGS[type], c = around;
    for (let r = 3; r < 16; r++) for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = Math.floor(c.x) + dx, y = Math.floor(c.y) + dy;
      if (!canPlace(game, pid, type, x, y)) continue;
      if (margin && r < 12) { let clear = true;
        for (let j = y - 1; j <= y + def.size && clear; j++) for (let i = x - 1; i <= x + def.size; i++) if (game.occAt(i, j)) { clear = false; break; }
        if (!clear) continue; }
      return { x, y };
    }
    return null;
  }
  function tryBuild(type, vills, around, nBuilders = 1) {
    const def = BUILDINGS[type];
    if (ageIndex(def.age) > ageIndex(me.age) || !(type === 'wonder' ? canAfford(me, def.cost) : canPay(def.cost))) return false;
    const sp = spotNear(type, around); if (!sp) return false;
    const chosen = [...vills].filter(v => v.order.type !== 'build').sort((a, b) => dist(a, sp) - dist(b, sp)).slice(0, nBuilders);
    if (!chosen.length) return false;
    return cmd({ type: 'build', ids: chosen.map(v => v.id), building: type, x: sp.x, y: sp.y });
  }

  // A wall screen in front of each finished tower: a straight line of WALL_SCREEN tiles, one open row out from the tower
  // on the side facing the enemy start, so attackers walk round it under the tower's fire or stop to break it. Lost
  // segments are put back. Walls have no gates and our own units never break our own walls, so a tile next to one of our
  // other buildings is left out, and the whole line is dropped if it would cut off any ground we can walk on now.
  const WALL_SCREEN = 6, wallSkip = new Map(); // tower id -> tick its screen was last found to cut off ground
  function screenTiles(t) {
    const c = centerOf(t), dx = enemyStart.x + 0.5 - c.x, dy = enemyStart.y + 0.5 - c.y, out = [];
    if (Math.abs(dx) >= Math.abs(dy)) { const x = dx > 0 ? t.x + t.size + 1 : t.x - 2; for (let k = 0; k < WALL_SCREEN; k++) out.push({ x, y: t.y - 2 + k }); }
    else { const y = dy > 0 ? t.y + t.size + 1 : t.y - 2; for (let k = 0; k < WALL_SCREEN; k++) out.push({ x: t.x - 2 + k, y }); }
    return out;
  }
  const nextToBuilding = (x, y) => {
    for (let j = y - 1; j <= y + 1; j++) for (let i = x - 1; i <= x + 1; i++) { const e = game.entities.get(game.occAt(i, j)); if (e && e.kind === 'building' && e.type !== 'wall') return true; }
    return false;
  };
  // Tiles reachable on foot (4-way: paths never cut corners) from the open tile `from`, with the `extra` tile indices also blocked;
  // wall foundations count as walls already.
  function openArea(from, extra) {
    const n = game.map.size, seen = new Uint8Array(n * n), open = i => game.map.tiles[i] !== 1 && !game.occAt(i % n, (i / n) | 0) && !game.reserved.has(i) && !extra.has(i);
    const s = from.y * n + from.x; if (!open(s)) return seen;
    const queue = [s]; seen[s] = 1;
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k], x = i % n, y = (i / n) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * n + nx;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && !seen[j] && open(j)) { seen[j] = 1; queue.push(j); }
      }
    }
    return seen;
  }
  const countOf = a => a.reduce((s, v) => s + v, 0);
  // True when walling `tiles` leaves every tile we can reach from beside the Town Center still reachable.
  function keepsGroundOpen(tc, tiles) {
    const n = game.map.size, extra = new Set(tiles.map(t => t.y * n + t.x)), r = { x0: tc.x - 1, y0: tc.y - 1, x1: tc.x + tc.size, y1: tc.y + tc.size };
    let from = null;
    for (let y = r.y0; y <= r.y1 && !from; y++) for (let x = r.x0; x <= r.x1; x++) {
      const i = y * n + x;
      if ((x === r.x0 || x === r.x1 || y === r.y0 || y === r.y1) && x >= 0 && y >= 0 && x < n && y < n && game.map.tiles[i] !== 1 && !game.occAt(x, y) && !game.reserved.has(i) && !extra.has(i)) { from = { x, y }; break; }
    }
    if (!from) return false;
    const before = openArea(from, new Set()), after = countOf(openArea(from, extra));
    return after === countOf(before) - [...extra].filter(i => before[i]).length;
  }
  function wallTowers(tc, free) {
    if (ageIndex(me.age) < ageIndex(BUILDINGS.wall.age)) return;
    for (const t of mine('buildings')) {
      if (t.type !== 'tower' || !t.constructed || game.time - (wallSkip.get(t.id) ?? -Infinity) < 1200) continue;
      const tiles = screenTiles(t).filter(p => canPlace(game, pid, 'wall', p.x, p.y) && !nextToBuilding(p.x, p.y));
      if (!tiles.length) continue;
      const cost = { stone: BUILDINGS.wall.cost.stone * tiles.length };
      if (!canPay(cost) || !leavesAgeUp(cost)) return;
      if (!keepsGroundOpen(tc, tiles)) { wallSkip.set(t.id, game.time); continue; }
      const v = free.filter(u => u.order.type !== 'repair').sort((a, b) => dist(a, tiles[0]) - dist(b, tiles[0]))[0];
      if (v) cmd({ type: 'wall', ids: [v.id], tiles });
      return; // one screen per think
    }
  }

  // Foundations nobody is working on (the builder died, was pulled away, or gave up on the way) get the nearest free
  // villager again: count() includes foundations, so an abandoned House or gate building would otherwise block every later
  // one (and the age-up). One that has made no progress after three such calls, and none for 2 minutes, is unreachable:
  // delete it (count() then lets a new one go somewhere else).
  const stall = new Map(); // foundation id -> { progress, since, sends }
  function finishFoundations(buildings, vills) {
    for (const id of stall.keys()) { const b = game.entities.get(id); if (!b || b.constructed) stall.delete(id); }
    const working = new Set();
    for (const v of vills) for (let o = v.order; o && (o.type === 'build' || o.type === 'repair'); o = o.resume) { working.add(o.target); for (const id of o.queue || []) working.add(id); }
    let sent = 0;
    for (const b of buildings) {
      if (b.constructed || b.type === 'wonder') continue; // the Wonder round staffs its Wonder itself
      let s = stall.get(b.id);
      if (!s || b.progress > s.progress) stall.set(b.id, s = { progress: b.progress, since: game.time, sends: 0 });
      else if (s.sends >= 3 && game.time - s.since > 2400) { if (cmd({ type: 'delete', id: b.id })) stall.delete(b.id); continue; }
      if (working.has(b.id) || sent >= 2 || s.sends >= 3) continue; // three calls with no progress: wait to delete it
      const v = vills.filter(u => u.order.type !== 'build' && u.order.type !== 'repair').sort((a, c) => dist(a, b) - dist(c, b))[0];
      if (v && cmd({ type: 'construct', ids: [v.id], targetId: b.id })) { s.sends++; sent++; working.add(b.id); }
    }
  }

  // The most damaged finished building under 70% HP with no enemy soldier within 8 tiles of it gets the nearest free
  // villager (two for a Town Center or Castle), one building at a time, while we can pay for it. They go back to work after.
  function repairDamaged(done, vills, enemies) {
    if (vills.some(v => v.order.type === 'repair')) return;
    const danger = enemies.filter(e => e.kind === 'unit' && e.cls !== 'civ');
    const b = done.filter(x => x.hp < x.maxHp * 0.7 && canRepair(me, x.type) && !danger.some(e => distPoint(e.x, e.y, x) < 8)).sort((a, c) => a.hp / a.maxHp - c.hp / c.maxHp)[0];
    if (!b) return;
    const ids = vills.filter(v => v.order.type !== 'build' && v.order.type !== 'repair').sort((a, c) => dist(a, b) - dist(c, b)).slice(0, b.type === 'town_center' || b.type === 'castle' ? 2 : 1).map(v => v.id);
    if (ids.length) cmd({ type: 'repair', ids, targetId: b.id });
  }

  function think() {
    if (game.result) return;
    const tc = mine('buildings').find(b => b.type === 'town_center' && b.constructed), anyBase = tc || mine('buildings').find(b => b.constructed);
    const units = mine('units'), vills = units.filter(u => u.type === 'villager');
    const army = units.filter(u => u.cls !== 'civ' && u.type !== 'king' && !u.naval), ships = units.filter(u => u.naval);
    const roundId = game.rules ? game.rules.id : 'conquest';
    if (!anyBase && !vills.length && !army.length) return;
    const home = anyBase ? centerOf(anyBase) : (units[0] || game.map.starts[pid]);
    const buildings = mine('buildings'), done = buildings.filter(b => b.constructed);
    const vis = game.visibleEntities(pid), enemies = vis.filter(e => e.owner === enemy && (e.kind === 'unit' || e.kind === 'building'));

    // --- economy: villagers
    const queuedVills = done.reduce((n, b) => n + b.queue.filter(q => q.unit === 'villager').length, 0);
    if (tc && !(bot.saving && vills.length >= 14) && vills.length + queuedVills < villagerTarget() && tc.queue.length < 2 && canAfford(me, UNITS.villager.cost) && me.pop < me.popCap) cmd({ type: 'train', buildingId: tc.id, unit: 'villager' });

    // --- houses
    const housesBuilding = buildings.filter(b => b.type === 'house' && !b.constructed).length;
    if (me.popCap < popLimit(me.age) && me.pop + 3 >= me.popCap && housesBuilding < (roundId === 'deathmatch' ? 3 : 1) && vills.length) tryBuild('house', vills, home);

    // --- buildings & age
    const free = vills.filter(v => v.order.type !== 'build');
    // A lost Town Center is rebuilt: it trains the villagers and no age-up happens without one.
    if (!tc && !buildings.some(b => b.type === 'town_center') && vills.length) tryBuild('town_center', vills, home, Math.min(4, vills.length));
    if (vills.length >= 5 && count('barracks') < 1) tryBuild('barracks', free, home);
    if (vills.length >= 7 && count('storage_pit') < 1) tryBuild('storage_pit', free, home);
    // A Granary by the nearest berries (within 12 tiles of home, else at home, where the Farms go) shortens food trips.
    // Not before the Bronze age-up is paid for: earlier it slows the climb by a minute or more.
    if (((me.ageUp && ageIndex(me.age) >= 1) || ageIndex(me.age) >= 2) && count('granary') < 1 && roundId !== 'wonder') {
      const berry = game.knownResources(pid).filter(r => r.type === 'berry' && r.amount > 0 && dist(r, home) <= 12).sort((a, b) => dist(a, home) - dist(b, home))[0];
      tryBuild('granary', free, berry || home);
    }
    const dm = roundId === 'deathmatch'; // rich start: mass production buildings instead of a slow economy
    if (dm && vills.length >= 5) {
      if (count('barracks') < 4) tryBuild('barracks', free, home);
      else if (ageIndex(me.age) >= 1 && count('archery_range') < 2) tryBuild('archery_range', free, home);
      else if (ageIndex(me.age) >= 1 && count('stable') < 2) tryBuild('stable', free, home);
    }
    if (difficulty === 'hard' && vills.length >= 14 && count('barracks') < 2) tryBuild('barracks', free, home);
    bot.saving = false;
    if (!me.ageUp && vills.length >= (roundId === 'wonder' ? 5 : Math.min(9, D.villagers * 0.5)) && ageIndex(me.age) < AGES.length - 1) {
      const why = ageUpProblem(game, pid);
      if (!why) cmd({ type: 'age' }); else if (why === 'resources' && ageIndex(me.age) === 0) bot.saving = true;
    }
    // From Bronze on, build what the current era's gate needs (e.g. the Temple in Bronze, the Academy and Siege Workshop in
    // Iron); count() includes foundations, so no duplicates. The Wonder round stays in Bronze and saves for its Wonder.
    if (ageIndex(me.age) >= ageIndex('iron') || (me.age === 'bronze' && roundId !== 'wonder')) { const req = ageBuildings(me.age), missing = req.filter(t => count(t) < 1); if (missing.length && req.length - missing.length < ageUpNeed(me.age)) tryBuild(missing[0], free, home, Math.min(3, Math.floor(free.length / 4) || 1)); }
    if (ageIndex(me.age) >= 1) {
      if (count('archery_range') < 1) tryBuild('archery_range', free, home);
      if (count('stable') < 1) tryBuild('stable', free, home);
      // The Market (Woodworking, Gold Mining) waits until the Bronze age-up is paid for, so it never slows that age-up.
      if (count('market') < 1 && (me.ageUp || ageIndex(me.age) >= 2)) tryBuild('market', free, home);
    }
    if (ageIndex(me.age) >= 2 && count('government_center') < 1 && roundId !== 'wonder') tryBuild('government_center', free, home);
    // Towers near the Town Center (tryBuild refuses before the Tool Age). count() includes foundations, so a lost tower is
    // rebuilt and a slow one is not doubled. After the age-up and the era's buildings above, and never out of the next age-up.
    if (tc && count('tower') < D.towers && leavesAgeUp(BUILDINGS.tower.cost)) tryBuild('tower', free, home);
    if (tc) wallTowers(tc, free);
    finishFoundations(buildings, vills);
    if (!bot.saving) repairDamaged(done, vills, enemies);

    // --- research upgrades (economy first, then military; canPay respects wonder reservation)
    if (!bot.saving) for (const b of done) {
      if (b.research) continue;
      for (const id of RESEARCH_PREF) {
        const t = TECHS[id];
        if (t.building !== b.type || me.techs.has(id) || ageIndex(me.age) < ageIndex(t.age)) continue;
        if (t.requires && !me.techs.has(t.requires)) continue;
        if (done.some(bb => bb.research && bb.research.tech === id)) continue; // another building already on it
        if (!canPay(t.cost) || (D.ageFirst && !leavesAgeUp(t.cost))) continue;
        if (cmd({ type: 'research', buildingId: b.id, tech: id })) break;
      }
    }
    if (roundId === 'wonder' && ageIndex(me.age) >= 2 && count('wonder') < 1 && vills.length >= 8) tryBuild('wonder', free, home, Math.min(10, free.length));
    if (roundId === 'wonder') { // everyone helps build the wonder
      const w = buildings.find(b => b.type === 'wonder' && !b.constructed);
      const helpers = w ? free.filter(v => v.order.type !== 'build').slice(0, 12).map(v => v.id) : [];
      if (helpers.length) cmd({ type: 'construct', ids: helpers, targetId: w.id });
    }

    // --- idle villagers -> resources
    const idle = vills.filter(v => v.order.type === 'idle');
    if (idle.length) assign(idle, vills, tc, home, done);
    // A resource piling up while the next age-up waits on another -> every 10 s move one of its gatherers to the shortfall
    // (gold first, then food, stone, wood), keeping a fifth of the villagers on wood. A pile is 400 over what the age-up
    // takes of it. Without this a bot sits on thousands of food in the late eras while the gold for the age-up never comes.
    const nextAge = AGES[ageIndex(me.age) + 1], ageCost = nextAge && !me.ageUp ? AGE_COST[nextAge].cost : null;
    if (ageCost && game.time - (bot.shiftedAt ?? -Infinity) >= 200) {
      const short = ['gold', 'food', 'stone', 'wood'].find(k => me.res[k] < ageCost[k]), on = k => vills.filter(v => v.order.type === 'gather' && v.order.kind === k);
      const from = short && ['food', 'wood', 'stone', 'gold'].find(k => k !== short && me.res[k] - (ageCost[k] || 0) > 400 && on(k).length > (k === 'wood' ? vills.length * 0.2 : 0));
      if (from) { bot.shiftedAt = game.time; assign([on(from)[0]], vills, tc, home, done, short); }
    }

    // --- military production
    // Across the sea nobody can land before they have a Transport Ship: until ours is out, keep a small home guard and put
    // the rest into reaching the Dock's age (a full army would only wait on the beach).
    const armyCap = Math.min(roundId === 'deathmatch' ? D.dmArmy : D.army, overSea && !ships.some(u => u.cargo) ? 6 : Infinity);
    const armyCount = army.length + done.reduce((n, b) => n + b.queue.filter(q => UNITS[q.unit].cls !== 'civ' && !UNITS[q.unit].naval).length, 0);
    const enemyClass = dominantEnemyClass(enemies); // counter-pick against what we can see
    if (!bot.saving && armyCount < armyCap && (vills.length >= D.villagers * 0.6 || roundId === 'deathmatch' || roundId === 'wonder')) {
      // Buildings whose pick ranks higher go first, so the best siege takes the two siege places (a Castle's Trebuchet before
      // a Government Center's Catapult) and the best unit gets the resources when they run short.
      const pref = PREF[enemyClass] || PREF.default;
      const picks = done.filter(b => b.type !== 'town_center' && b.type !== 'dock' && b.queue.length < (roundId === 'deathmatch' ? 4 : 2))
        .map(b => ({ b, u: bestUnit(BUILDINGS[b.type].trains || [], enemyClass) })).filter(p => p.u).sort((a, c) => pref.indexOf(a.u) - pref.indexOf(c.u));
      for (const { b, u } of picks) {
        if (!canPay(UNITS[u].cost) || me.pop >= me.popCap) continue;
        if (D.ageFirst && armyCount >= armyCap / 2 && !leavesAgeUp(UNITS[u].cost)) continue;
        if (u === 'scout' && army.filter(a => a.type === 'scout').length + done.reduce((n, x) => n + x.queue.filter(q => q.unit === 'scout').length, 0) >= 2) continue; // a pair is plenty
        if (UNITS[u].cls === 'siege' && army.filter(a => a.cls === 'siege').length + done.reduce((n, x) => n + x.queue.filter(q => UNITS[q.unit].cls === 'siege').length, 0) >= 2) continue;
        cmd({ type: 'train', buildingId: b.id, unit: u });
      }
    }

    // --- military orders
    orderArmy(army, enemies, home, roundId, vis);
    navy(ships, done, buildings, free, enemies, home, roundId, army);
  }

  // ---- the navy: a Dock in the home bay, Fishing Ships, and a small fleet that patrols to the enemy's bay ----
  const SHIPS = ['destroyer', 'frigate', 'war_galley']; // newest first
  // Dock spots, nearest home first: every 3x3 block of deep water against the shore, beside ground we can walk to from our
  // start, on our side of the map and within 30 tiles of it. Fixed terrain, so worked out once; canPlace is checked when used.
  let dockSpots = null;
  function findDockSpots() {
    const n = game.map.size, own = game.map.starts[pid], out = [], wet = (x, y) => game.map.tiles[y * n + x] === WATER;
    for (let y = 1; y < n - 4; y++) for (let x = 1; x < n - 4; x++) {
      const c = { x: x + 1.5, y: y + 1.5 }, d = dist(c, own);
      if (d > 30 || d >= dist(c, enemyStart)) continue;
      let ok = true; for (let j = y; j < y + 3 && ok; j++) for (let i = x; i < x + 3; i++) if (!wet(i, j)) { ok = false; break; }
      if (!ok) continue;
      let land = false, sea = false;
      for (let k = 0; k < 3; k++) for (const [i, j] of [[x + k, y - 1], [x + k, y + 3], [x - 1, y + k], [x + 3, y + k]]) { land ||= !!reach[j * n + i]; sea ||= wet(i, j); }
      if (land && sea) out.push({ x, y, d });
    }
    return out.sort((a, b) => a.d - b.d);
  }
  function navy(ships, done, buildings, free, enemies, home, roundId, army) {
    if (ageIndex(me.age) < ageIndex(BUILDINGS.dock.age) || roundId === 'wonder') return; // the Wonder round saves for its Wonder
    const docks = done.filter(b => b.type === 'dock');
    if (!buildings.some(b => b.type === 'dock') && (overSea || (!bot.saving && free.length >= 6 && leavesAgeUp(BUILDINGS.dock.cost))) && canPay(BUILDINGS.dock.cost)) { // across the sea it comes first
      dockSpots ??= findDockSpots();
      const sp = dockSpots.find(p => canPlace(game, pid, 'dock', p.x, p.y));
      const v = sp && free.filter(u => u.order.type !== 'repair').sort((a, b) => dist(a, sp) - dist(b, sp))[0];
      if (v) cmd({ type: 'build', ids: [v.id], building: 'dock', x: sp.x, y: sp.y });
      else if (!sp && dockSpots.length && game.time - (bot.dockScout ?? -Infinity) > 1200) { // the bay is still unexplored: walk a villager over
        const p = dockSpots[0], n = game.map.size, v2 = free.sort((a, b) => dist(a, p) - dist(b, p))[0];
        if (v2 && !game.players[pid].explored[(p.y + 1) * n + p.x + 1]) { bot.dockScout = game.time; cmd({ type: 'move', ids: [v2.id], x: p.x + 1.5, y: p.y + 1.5 }); }
      }
    }
    if (!docks.length) return;
    const dock = docks[0], queued = type => done.reduce((k, b) => k + b.queue.filter(q => q.unit === type).length, 0);
    const fishers = ships.filter(u => u.type === 'fishing_ship'), fleet = ships.filter(u => u.cls === 'ship'), transports = ships.filter(u => u.cargo);
    // Transport Ships, first in the Dock's queue, when there is somewhere to go that soldiers can't walk to.
    const relicsAcross = roundId === 'relics' && [...game.relics.values()].some(r => massOf(r) !== homeMass);
    if ((overSea || relicsAcross) && transports.length + queued('transport_ship') < D.transports && dock.queue.length < 2 && canPay(UNITS.transport_ship.cost)
      && me.pop < me.popCap) cmd({ type: 'train', buildingId: dock.id, unit: 'transport_ship' });
    ferryWork(transports, army, enemies, home, roundId);
    // Fishing Ships: train up to `fishers`, and send idle ones to the nearest fish we know of.
    const fish = game.knownResources(pid).filter(r => r.type === 'fish' && r.amount > 0);
    if (ageIndex(me.age) >= ageIndex(UNITS.fishing_ship.age) && fish.length && fishers.length + queued('fishing_ship') < D.fishers && dock.queue.length < 2
      && canPay(UNITS.fishing_ship.cost) && me.pop < me.popCap) cmd({ type: 'train', buildingId: dock.id, unit: 'fishing_ship' });
    for (const u of fishers) if (u.order.type === 'idle') { const f = fish.sort((a, b) => dist(a, u) - dist(b, u))[0]; if (f) cmd({ type: 'gather', ids: [u.id], resourceId: f.id }); }
    // Warships: the newest we can build, up to `fleet` (two more once enemy ships show up), never out of the next age-up.
    const enemyShips = enemies.filter(e => e.kind === 'unit' && e.naval), want = D.fleet + (enemyShips.length ? 2 : 0);
    const best = SHIPS.find(t => ageIndex(UNITS[t].age) <= ageIndex(me.age));
    if (!bot.saving && (transports.length >= ((overSea || relicsAcross) ? D.transports : 0)) && fleet.length + SHIPS.reduce((k, t) => k + queued(t), 0) < want && dock.queue.length < 2 && canPay(UNITS[best].cost)
      && (!D.ageFirst || leavesAgeUp(UNITS[best].cost)) && me.pop < me.popCap) cmd({ type: 'train', buildingId: dock.id, unit: best });
    // Idle warships take the nearest target they can reach (enemy ships first), else, while a land wave is on, sail to the
    // enemy's bay (the mirror of our Dock) and back to our Dock in turn.
    const targets = enemies.filter(e => (e.kind === 'unit' || e.constructed) && fleet.length && canHit(game, fleet[0], e));
    for (const u of fleet) {
      if (u.order.type !== 'idle') continue;
      const t = targets.filter(e => e.naval).sort((a, b) => dist(a, u) - dist(b, u))[0] || targets.sort((a, b) => dist(a, u) - dist(b, u))[0];
      if (t && dist(t, u) < 30) { cmd({ type: 'attack', ids: [u.id], targetId: t.id }); continue; }
      if (!bot.waveActive) continue;
      const n = game.map.size, c = centerOf(dock), legs = [nearestOpen(game, n - c.x, n - c.y, true), nearestOpen(game, c.x, c.y, true)];
      const leg = fleetLeg.get(u.id) ?? 0, to = legs[leg];
      if (!to) continue;
      fleetLeg.set(u.id, dist(u, to) < 5 || sentLeg.get(u.id) === leg ? 1 - leg : leg); // there (or stuck short of it): turn round
      const next = legs[fleetLeg.get(u.id)];
      if (cmd({ type: 'move', ids: [u.id], x: next.x, y: next.y })) sentLeg.set(u.id, fleetLeg.get(u.id));
    }
  }
  const fleetLeg = new Map(), sentLeg = new Map(); // ship id -> the leg (0 to the enemy's bay, 1 home) it is on, and was last sent on

  // Ferries. Each Transport Ship takes one job at a time: bring relic carriers stranded on another island home; take a
  // squad to an island with loose relics nobody of ours is on; or, while a land wave is on and the enemy is across the
  // sea, take the soldiers waiting at home to the enemy's shore. A job loads (the passengers board; the transport comes to
  // the shore nearest them), sails (unloads at the shore nearest the destination) and ends once the hold is empty. It is
  // dropped if nobody ends up aboard, and a hold that won't unload where it was sent is unloaded at home.
  const ferry = bot.ferry = new Map(), ferried = new Set(); // transport id -> job; ids of units in a job (orderArmy leaves them be)
  function ferryWork(transports, army, enemies, home, roundId) {
    for (const id of ferry.keys()) if (!transports.some(t => t.id === id)) ferry.delete(id);
    ferried.clear();
    for (const j of ferry.values()) for (const id of j.ids) ferried.add(id);
    const cap = UNITS.transport_ship.carries;
    for (const t of transports) {
      let job = ferry.get(t.id);
      if (!job && t.cargo.length) { // passengers with no job (a stray who boarded late): take them where the soldiers are going
        job = { stage: 'sail', ids: [...t.cargo], dest: bot.waveActive && overSea ? { x: enemyStart.x, y: enemyStart.y } : { x: home.x, y: home.y }, since: game.time, tries: 0 };
        ferry.set(t.id, job); cmd({ type: 'unload', transportId: t.id, x: job.dest.x, y: job.dest.y });
        continue;
      }
      if (!job) {
        const free = army.filter(u => !ferried.has(u.id) && u.order.type === 'idle');
        const carriers = free.filter(u => u.relic !== null && massOf(u) !== homeMass);
        const loose = roundId === 'relics' && [...game.relics.values()].find(r => r.holder === null && r.stored === null && massOf(r) !== homeMass
          && !army.some(u => sameLand(u, r) && u.relic === null) && ![...ferry.values()].some(j => j.relic === r.id));
        const waiting = free.filter(u => u.relic === null && massOf(u) === homeMass);
        let ids = null, dest = null, relic = null, wave = false;
        if (carriers.length) { ids = carriers.slice(0, cap); dest = home; }
        else if (loose && waiting.length) { ids = waiting.filter(u => u.cls !== 'siege').sort((a, b) => dist(a, t) - dist(b, t)).slice(0, Math.min(cap, 5)); dest = loose; relic = loose.id; }
        else if (bot.waveActive && overSea && waiting.length >= Math.min(4, cap)) { ids = waiting.sort((a, b) => dist(a, t) - dist(b, t)).slice(0, cap); dest = enemyStart; wave = true; }
        if (!ids?.length) continue;
        ids = ids.slice(0, cap - t.cargo.length);
        job = { stage: 'load', ids: ids.map(u => u.id), dest: { x: dest.x, y: dest.y }, relic, wave, since: game.time, tries: 0 };
        ferry.set(t.id, job); for (const id of job.ids) ferried.add(id);
        cmd({ type: 'board', ids: job.ids, transportId: t.id });
        continue;
      }
      if (job.stage === 'load') {
        const alive = job.ids.map(id => game.entities.get(id)).filter(u => u && !u.dead), on = alive.filter(u => u.aboard === t.id);
        const coming = alive.filter(u => !u.aboard && u.order.type === 'board' && u.order.target === t.id);
        // A wave sails as one convoy: a loaded transport waits for the others still taking on soldiers.
        const convoy = job.wave && [...ferry].some(([id, j]) => id !== t.id && j.wave && j.stage === 'load' && j.ids.some(i => { const u = game.entities.get(i); return u && !u.dead && !u.aboard && u.order.type === 'board'; }));
        if (on.length && ((!coming.length && !convoy) || game.time - job.since > 900)) { // everyone who is coming is aboard (or they took too long)
          job.ids = on.map(u => u.id); job.stage = 'sail'; job.since = game.time;
          cmd({ type: 'unload', transportId: t.id, x: job.dest.x, y: job.dest.y });
          for (const u of coming) cmd({ type: 'move', ids: [u.id], x: u.x, y: u.y }); // the late ones stay behind for the next trip
        } else if (!coming.length || game.time - job.since > 2400) ferry.delete(t.id);
      } else if (!t.cargo.length) ferry.delete(t.id); // all ashore
      else if (t.order.type === 'idle') { // the unload stopped short: try again, then bring them home
        if (++job.tries > 3) job.dest = { x: home.x, y: home.y };
        cmd({ type: 'unload', transportId: t.id, x: job.dest.x, y: job.dest.y });
      }
    }
  }

  const SIEGE = ['railgun', 'field_artillery', 'cannon', 'trebuchet', 'catapult'];
  const RESEARCH_PREF = ['woodworking', 'gold_mining', 'sacred_harvest', 'colonial_trade', 'electrification', 'masonry', 'bronze_weapons', 'bronze_shields',
    'iron_weapons', 'ballistics', 'hide_armor', 'scale_barding', 'phalanx_drill', 'torsion_engines', 'steel_weapons', 'plate_armor', 'paper_cartridges',
    'bayonets', 'railways', 'rifled_barrels', 'composite_armor', 'air_support', 'nanoweave_plating'];
  // Counter-pick preference lists (openage damage.md classes). Same units, reordered; the era units sit right after the
  // AI Future ones (newest first at each building), and armor (Tanks, Armored Trains) is answered with siege and Tanks:
  // vs archers -> tanky melee / pierce-armoured closers; vs cavalry -> spearman (bonus) first;
  // vs infantry -> pierce archers (infantry has no pierce armour); vs siege -> fast closers.
  const PREF = {
    default: ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon', 'musketeer', 'knight', 'trebuchet', 'swordsman', 'hoplite', 'catapult', 'drone', 'crossbowman', 'horse_archer', 'scout', 'axeman', 'bowman', 'spearman', 'clubman', 'slinger'],
    archer:  ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon', 'musketeer', 'knight', 'trebuchet', 'catapult', 'swordsman', 'hoplite', 'horse_archer', 'scout', 'drone', 'crossbowman', 'axeman', 'spearman', 'clubman', 'bowman', 'slinger'],
    cav:     ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon', 'musketeer', 'knight', 'trebuchet', 'catapult', 'spearman', 'swordsman', 'hoplite', 'drone', 'crossbowman', 'bowman', 'horse_archer', 'axeman', 'scout', 'clubman', 'slinger'],
    inf:     ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon', 'musketeer', 'knight', 'trebuchet', 'catapult', 'drone', 'crossbowman', 'bowman', 'horse_archer', 'scout', 'slinger', 'hoplite', 'swordsman', 'axeman', 'spearman', 'clubman'],
    siege:   ['mech', 'railgun', 'tank', 'armored_train', 'machine_gunner', 'field_artillery', 'rifleman', 'cannon', 'musketeer', 'knight', 'trebuchet', 'catapult', 'horse_archer', 'scout', 'drone', 'crossbowman', 'hoplite', 'swordsman', 'axeman', 'bowman', 'spearman', 'clubman', 'slinger'],
    armor:   ['railgun', 'mech', 'field_artillery', 'tank', 'armored_train', 'cannon', 'trebuchet', 'machine_gunner', 'rifleman', 'knight', 'musketeer', 'catapult', 'drone', 'crossbowman', 'swordsman', 'hoplite', 'horse_archer', 'scout', 'axeman', 'bowman', 'spearman', 'clubman', 'slinger'],
  };
  function dominantEnemyClass(enemies) {
    const n = {};
    for (const e of enemies) if (e.kind === 'unit' && e.cls && e.cls !== 'civ' && !e.naval) n[e.cls] = (n[e.cls] || 0) + 1;
    let best = null, bn = 0;
    for (const k in n) if (n[k] > bn) { bn = n[k]; best = k; }
    return best;
  }
  function bestUnit(trains, enemyClass) {
    const pref = PREF[enemyClass] || PREF.default;
    const known = pref.filter(u => trains.includes(u) && ageIndex(UNITS[u].age) <= ageIndex(me.age));
    if (!known.length) return null;
    const affordable = known.filter(u => canPay(UNITS[u].cost)); // prefer the best unit we can actually pay for right now
    const ok = affordable.length ? affordable : known; // none affordable: caller's canPay check skips this building
    const siege = ok.find(u => SIEGE.includes(u));
    if (siege && game.time % 3 === 0) return siege;
    return ok.find(u => !SIEGE.includes(u)) || siege;
  }

  function dropDist(kind, p, done) {
    let best = Infinity;
    for (const b of done) if ((BUILDINGS[b.type].drops || []).includes(kind)) best = Math.min(best, distPoint(p.x, p.y, b));
    return best;
  }
  // Top-left of the first 2x2 Mine spot on an ore patch of this kind, trying patches nearest `home` first. Only patches
  // in our own half (nearer our start than the enemy's), and only spots with a tile on or around them we can walk to:
  // a foundation nobody can reach would block every later Mine of that kind.
  function mineSpot(kind, home) {
    const n = game.map.size, own = game.map.starts[pid], centre = p => p.tiles.reduce((c, i) => ({ x: c.x + (i % n + 0.5) / p.tiles.length, y: c.y + (((i / n) | 0) + 0.5) / p.tiles.length }), { x: 0, y: 0 });
    const walkable = (x, y) => { for (let j = y - 1; j <= y + 2; j++) for (let i = x - 1; i <= x + 2; i++) if (i >= 0 && j >= 0 && i < n && j < n && reach[j * n + i]) return true; return false; };
    const patches = [...game.patches.values()].filter(p => p.kind === kind && p.reserve > 0).map(p => ({ p, c: centre(p) }))
      .filter(({ c }) => dist(c, own) < dist(c, enemyStart)).map(({ p, c }) => ({ p, d: dist(c, home) })).sort((a, b) => a.d - b.d);
    for (const { p } of patches) for (const i of p.tiles) { const x = i % n, y = (i / n) | 0; if (walkable(x, y) && canPlace(game, pid, 'mine', x, y)) return { x, y }; }
    return null;
  }
  // force: the resource kind to send them to instead of the one furthest below its share.
  function assign(idle, vills, tc, home, done, force) {
    const cnt = { food: 0, wood: 0, gold: 0, stone: 0 };
    for (const v of vills) if (v.order.type === 'gather') cnt[v.order.kind]++;
    const known = game.knownResources(pid).filter(r => sameLand(r, home)); // nothing across the sea
    const early = vills.length < 12 || ageIndex(me.age) === 0;
    for (const v of idle) {
      const total = vills.length || 1;
      let kind = force || 'wood', bestDef = -Infinity;
      if (!force) for (const k of ['food', 'wood', 'gold', 'stone']) {
        const share = early ? (k === 'food' ? 0.5 : k === 'wood' ? 0.5 : k === 'gold' ? 0 : 0) : SHARE[k];
        if (game.rules && game.rules.id === 'deathmatch' && (k === 'gold' || k === 'stone')) continue;
        const def = share * total - cnt[k]; if (def > bestDef) { bestDef = def; kind = k; }
      }
      // find the closest resource of this kind near a dropsite
      let res = null, bs = Infinity;
      for (const r of known) if (RES_KIND[r.type] === kind && r.type !== 'fish' && r.amount > 0) { const s = dist(r, v) + 1.5 * Math.min(dropDist(kind, r, done), 25); if (s < bs) { bs = s; res = r; } }
      if (kind === 'food') { // prefer farms once berries are far away
        const farms = done.filter(b => b.gatherType === 'food' && b.amount > 0);
        const nearestFarm = farms.sort((a, b) => dist(a, v) - dist(b, v))[0];
        if (!res || dist(res, home) > 12) {
          if (nearestFarm && farms.length * 2 > cnt.food) res = nearestFarm;
          else if (me.res.wood >= 60 && tryBuild('farm', [v], home)) { cnt.food++; continue; }
        }
      }
      if ((kind === 'gold' || kind === 'stone') && (!res || dist(res, home) > 16)) { // piles gone or far: dig a Mine
        const mines = done.filter(b => b.type === 'mine' && b.gatherType === kind && b.amount > 0);
        if (mines.length) { // spread out: the first with fewer than 4 gatherers, else the least worked
          const load = m => vills.filter(u => u.order.type === 'gather' && u.order.res === m.id).length;
          res = mines.find(m => load(m) < 4) || mines.reduce((a, b) => load(b) < load(a) ? b : a);
        } else if (ageIndex(me.age) >= ageIndex(BUILDINGS.mine.age) && !mine('buildings').some(b => b.type === 'mine' && !b.constructed && b.gatherType === kind) && canPay(BUILDINGS.mine.cost)) {
          const sp = mineSpot(kind, home);
          if (sp && cmd({ type: 'build', ids: [v.id], building: 'mine', x: sp.x, y: sp.y })) { cnt[kind]++; continue; }
        }
      }
      if (!res) { // none of this kind explored yet (trees can start just outside the explored radius): walk out and look
        if (kind !== 'wood') cnt[kind] = 99;
        const a = bot.scout * 2.4, r = Math.min(30, 12 + 2 * Math.floor(bot.scout++ / 6));
        const wp = nearestReachable(game.map, reach, { x: Math.round(Math.min(game.map.size - 1, Math.max(0, home.x + r * Math.cos(a)))), y: Math.round(Math.min(game.map.size - 1, Math.max(0, home.y + r * Math.sin(a)))) });
        cmd({ type: 'move', ids: [v.id], x: wp.x + 0.5, y: wp.y + 0.5 });
        continue;
      }
      // far from any dropsite -> build one there first
      if ((res.kind === 'resource' || res.type === 'mine') && dropDist(kind, res, done) > 10) {
        const type = kind === 'food' ? 'granary' : 'storage_pit', sp = spotNear(type, res, false);
        if (sp && !mine('buildings').some(b => !b.constructed && b.type === type) && canAfford(me, BUILDINGS[type].cost) && cmd({ type: 'build', ids: [v.id], building: type, x: sp.x, y: sp.y })) continue;
      }
      if (cmd({ type: 'gather', ids: [v.id], resourceId: res.id })) cnt[kind]++;
    }
  }

  function orderArmy(army, enemies, home, roundId, vis) {
    if (!army.length) return;
    const threats = enemies.filter(e => e.kind === 'unit' && e.cls !== 'civ' && !e.naval && dist(e, home) < 14 && sameLand(e, home)); // ships are the towers' and the fleet's
    const idle = army.filter(u => u.order.type === 'idle');
    // relics: send the nearest free soldier to each loose relic (idle or mid-wave), one per relic
    if (roundId === 'relics') {
      const assigned = new Set(army.filter(a => a.order.type === 'relic').map(a => a.order.relic));
      for (const r of game.relics.values()) {
        if (r.holder !== null || r.stored !== null || assigned.has(r.id)) continue;
        const u = army.filter(a => a.relic === null && a.cls !== 'siege' && a.order.type !== 'relic' && sameLand(a, r)).sort((a, b) => dist(a, r) - dist(b, r))[0];
        if (u && dist(u, r) < 40) { cmd({ type: 'relic', ids: [u.id], relicId: r.id }); assigned.add(r.id); }
      }
    }
    if (threats.length) {
      const t = threats.sort((a, b) => dist(a, home) - dist(b, home))[0];
      for (const u of idle) if (sameLand(u, t)) cmd({ type: 'attack', ids: [u.id], targetId: t.id });
      return;
    }
    const combat = army;
    const rush = roundId === 'wonder'; // contest the Wonder while it is being built
    // Death Match: whoever attacks piecemeal loses to defenders, so wait for a big army (bigger for harder bots)
    const needWave = rush ? 5 : roundId === 'deathmatch' ? D.dmWave : D.wave;
    const needTime = Math.max(D.grace, rush ? 3600 : roundId === 'deathmatch' ? 9000 : D.attackAt);
    if (!bot.waveActive && game.time >= needTime && ageIndex(me.age) >= ageIndex(D.attackAge) && combat.length >= needWave) bot.waveActive = true;
    const afloat = [...game.units.values()].filter(u => u.owner === pid && u.aboard).length; // a wave at sea is still a wave
    if (bot.waveActive && combat.length + afloat < 3) bot.waveActive = false;
    if (!bot.waveActive) return;
    const cx = combat.reduce((s, u) => s + u.x, 0) / combat.length, cy = combat.reduce((s, u) => s + u.y, 0) / combat.length, c = { x: cx, y: cy };
    // The wave's target, chosen among the enemies on land mass m (the King, Wonder or relic vault first, then the nearest
    // soldier, building, anyone); soldiers on each land mass take that mass's target.
    const vaults = roundId === 'relics' ? new Set([...game.relics.values()].filter(r => r.stored !== null && game.relicOwner(r) === enemy).map(r => r.stored)) : new Set();
    const targetOn = m => {
      const here = enemies.filter(e => massOf(e.kind === 'building' ? centerOf(e) : e) === m);
      const key = here.find(e => (roundId === 'regicide' && e.type === 'king') || (roundId === 'wonder' && e.type === 'wonder') || vaults.has(e.id));
      return key || here.filter(e => e.kind === 'unit' && e.cls !== 'civ' && !e.naval).sort((a, b) => dist(a, c) - dist(b, c))[0]
        || here.filter(e => e.kind === 'building').sort((a, b) => dist(a, c) - dist(b, c))[0]
        || here.filter(e => e.kind === 'unit' && !e.naval).sort((a, b) => dist(a, c) - dist(b, c))[0];
    };
    const targets = new Map(), targetFor = u => { const m = massOf(u); if (!targets.has(m)) targets.set(m, targetOn(m)); return targets.get(m); };
    // Siege goes for the defences first: a siege unit with no attack order of its own (idle, on a sweep move, or only
    // auto-aggro on something else) takes the finished enemy tower nearest it that we can see. A commanded attack, a
    // breach (an attack with `resume`) and an attack already on a tower are kept.
    const towers = enemies.filter(e => e.type === 'tower' && e.constructed), onTower = new Set();
    if (towers.length) for (const u of combat) {
      const o = u.order, on = o.type === 'attack' ? game.entities.get(o.target) : null, near = towers.filter(e => sameLand(u, centerOf(e)));
      if (u.cls !== 'siege' || !near.length || !(o.type === 'idle' || o.type === 'move' || (o.auto && on?.type !== 'tower'))) continue;
      const t = near.reduce((best, e) => distPoint(u.x, u.y, e) < distPoint(u.x, u.y, best) ? e : best);
      if (cmd({ type: 'attack', ids: [u.id], targetId: t.id })) onTower.add(u.id);
    }
    let advanced = false;
    for (const u of idle) {
      if (u.relic !== null || onTower.has(u.id) || ferried.has(u.id)) continue;
      const target = targetFor(u);
      if (target) cmd({ type: 'attack', ids: [u.id], targetId: target.id });
      else if (massOf(u) !== massOf(enemyStart)) continue; // nothing to fight on this land: wait for a transport
      else {
        let wp = sweep[bot.sweepIdx % sweep.length];
        // Idle short of the waypoint it was sent to means the move failed: go on to the next one rather than
        // re-sending it (each re-send costs a whole-map path search per unit). Skip at most one waypoint per think.
        if (dist(u, wp) < 4 || (sentTo.get(u.id) === bot.sweepIdx && !advanced)) { bot.sweepIdx++; advanced = true; wp = sweep[bot.sweepIdx % sweep.length]; }
        if (cmd({ type: 'move', ids: [u.id], x: wp.x + 0.5, y: wp.y + 0.5 })) sentTo.set(u.id, bot.sweepIdx);
      }
    }
  }
  return bot;
}
