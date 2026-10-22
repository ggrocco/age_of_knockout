# Map Resources and Mines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put more gold, stone and forest between the two bases, add rocky ore patches with finite shared reserves
that a new Mine building works like a Farm, and refill the map with fresh mirrored deposits and patches as it is
mined out.

**Architecture:** `map.js` lays out mirrored ore patches (new tile values 2 = gold vein, 3 = quarry) and mid-map
deposits. A new `src/sim/ore.js` owns everything that changes during play: patch state, drawing a load from a Mine,
exhausting a patch, spawning new patch pairs and respawning loose piles, all from a seeded RNG. The Mine is a Farm-
style building whose `amount` mirrors its patch's reserve. The bot builds Mines when its piles run out. The renderer
paints ore ground, repaints it when tiles change, and draws an animated Mine.

**Tech Stack:** Plain ES modules, Node test runner, three.js (render only).

**Spec:** `docs/superpowers/specs/2026-10-21-map-resources-and-mines-design.md`

## Global Constraints

- The sim stays DOM-free and deterministic: no `Math.random`, no wall clock. All new randomness comes from
  `makeRng` (`src/sim/rng.js`).
- Every deposit, ore patch and respawn is exactly 180-degree mirrored: tile `(x, y)` pairs with
  `(size-1-x, size-1-y)`. Place pairs whole or not at all (`map.js` `place` can silently drop one side, so check
  both tiles first).
- Tile values: 0 land, 1 water, **2 gold-vein ground, 3 quarry ground**. Existing `=== 1` water checks stay as they
  are. Ore tiles are walkable land.
- Starts and relic spots stay reachable (`connected` in `map.js`).
- Only a Mine may stand on ore ground. A Mine must stand wholly on one patch.
- No fifth resource, no Farm change, no KEPT look change (`test/fixtures/kept-buildings.json` must not move).
- Placeholder numbers, tuned only through bot-sim. Mine: cost 100 wood + 50 stone, Tool Age, size 2, `extra: true`.
  Reserves: home gold patch 1500, mid gold patch 3000, quarry 2500, respawned patch half its kind's mid reserve.
  Pile respawn below 25% of the starting total of that kind.
- `node test/bot-sim.js 12` must end every match cleanly.

## Review Focus

1. **A patch empties while villagers are walking to it or carrying from it.** They should drop what they carry and
   move on to the nearest gold/stone source of that kind (pile or own Mine), not freeze or crash. Test in Task 2.
2. **A Mine foundation (not yet built) on a patch that empties.** It is removed with the patch, nothing throws, and
   the builder goes idle. Test in Task 2.
3. **Building on a patch the player hasn't explored, or half on/half off a patch, or across two patches that
   touch.** All are refused by `canPlace`, and the ghost shows red. Test in Task 2.
4. **Respawn on a crowded late-game map** (no free mirrored spot). The search gives up quietly after a bounded number
   of tries and retries at the next check, with no infinite loop and no one-sided spawn. Test in Task 3.
5. **Replays.** The same seed and the same commands give the same patches, piles and respawns. Test in Task 3.

---

### Task 1: Map: ore patches, mid-map deposits, more forest

**Files:**
- Modify: `src/sim/map.js` (`build`, `connected`)
- Test: `test/map.test.js`

**Interfaces:**
- Produces: `generateMap(seed, size)` additionally returns
  `orePatches: Array<{ id: number, kind: 'gold'|'stone', tiles: number[] /* y*size+x */, reserve: number, twin: number }>`.
  Ids start at 1. `twin` is the id of the mirrored patch. `tiles[i]` is 2 for gold-vein tiles and 3 for quarry tiles.

- [ ] **Step 1: Write the failing tests** in `test/map.test.js`

```js
test('ore patches: mirrored, home gold patch per player, tiles match kinds', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const m = generateMap(seed), n = m.size, byId = new Map(m.orePatches.map(p => [p.id, p]));
    for (const p of m.orePatches) {
      const t = byId.get(p.twin);
      assert.equal(t.twin, p.id); assert.equal(t.kind, p.kind); assert.equal(t.reserve, p.reserve);
      assert.deepEqual([...p.tiles].map(i => n * n - 1 - i).sort((a, b) => a - b), [...t.tiles].sort((a, b) => a - b), 'mirrored ' + seed);
      for (const i of p.tiles) assert.equal(m.tiles[i], p.kind === 'gold' ? 2 : 3);
    }
    for (const s of m.starts) assert.ok(m.orePatches.some(p => p.kind === 'gold' && p.reserve === 1500
      && p.tiles.every(i => { const d = Math.hypot(i % n - s.x, (i / n | 0) - s.y); return d >= 10 && d <= 18; })), 'home patch ' + seed);
    assert.ok(m.orePatches.filter(p => p.kind === 'stone').length >= 2, 'quarries ' + seed);
    const onOre = m.resources.filter(r => m.tiles[Math.floor(r.y) * n + Math.floor(r.x)] >= 2);
    assert.equal(onOre.length, 0, 'no pile on ore ' + seed);
  }
});
test('mid-map gold and stone between the bases', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const m = generateMap(seed), [a, b] = m.starts;
    for (const type of ['gold', 'stone']) {
      const mid = m.resources.filter(r => r.type === type && Math.hypot(r.x - a.x, r.y - a.y) > 16 && Math.hypot(r.x - b.x, r.y - b.y) > 16);
      assert.ok(mid.length >= 8, `${type} mid ${seed}: ${mid.length}`);
      assert.ok(mid.every(r => r.amount > (type === 'gold' ? 800 : 600)), 'mid piles richer');
    }
  }
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test --test-name-pattern="ore patches|mid-map" test/map.test.js`
Expected: FAIL (`orePatches` is undefined).

- [ ] **Step 3: Implement in `src/sim/map.js`**

- Add `patch(kind, cx, cy, w, h, reserve)` inside `build`. It makes a `w`×`h` rectangle at `(cx, cy)` and accepts
  it only if every tile **and** every mirror tile is dry (`tiles === 0`), not `taken`, at least 1 tile inside the map
  edge, and the rectangle and its mirror don't overlap. It then writes 2 (gold) or 3 (stone) on both sides and pushes
  two `orePatches` entries with twin ids. It returns `true` or `false`.
- Order matters, because placement checks use `tiles` and `taken`: home ring → **home patch** → **mid patches + mid
  deposits** → woodlines and forests. `ok` already refuses non-zero tiles, so trees and piles stay off ore.
- **Home patch:** gold, 4×3 tiles (room for 2 Mines), its centre 12-16 tiles from `s0` at a random angle, outside the
  `home` radius 8. Retry the angle up to 100 times.
- **Mid patches (per half, mirrored by `patch`):** 2 gold (5×4, reserve 3000) and 1 quarry (5×4, reserve 2500).
  Each centre is a random point with `far(x, y)` true, 20-34 tiles from `s0`, and closer to `s0` than to `s1` (so the
  mirror lands in the other half). Next to each one, place a cluster of 5 mirrored piles of the matching type
  (gold 1200, stone 900) on free land touching the rectangle's border, using `place`.
- **Forests:** raise the scattered-forest count from `size*size/600` to `size*size/480`.
- `connected`: no change is needed, since ore tiles count as open (`tiles !== 1`). Confirm the retry loop still
  finds a valid map for seeds 1-200 (Step 4).
- Return `orePatches` from `build` (through `generateMap`). Relic spots stay off ore because patches use `far`, which
  excludes the centre radius 9; assert it in the test (no relic spot tile is 2 or 3).

- [ ] **Step 4: Run the map tests and the 200-seed validity check**

Run: `node --test test/map.test.js && node -e "import('./src/sim/map.js').then(({generateMap})=>{for(let s=1;s<=200;s++)generateMap(s);console.log('ok')})"`
Expected: all PASS, prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add src/sim/map.js test/map.test.js
git commit -m "feat(map): mirrored ore patches, mid-map gold and stone, denser forest"
```

---

### Task 2: Ore patch state and the Mine building

**Files:**
- Create: `src/sim/ore.js`
- Modify: `src/data/buildings.js`, `src/sim/game.js` (`createGame`, `addBuilding`, `updateBuilding`),
  `src/sim/commands.js` (`canPlace`), `src/sim/orders.js` (`nearestResource`, `doGather`, `doBuild`)
- Test: `test/ore.test.js` (new)

**Interfaces:**
- Consumes: `map.orePatches` from Task 1.
- Produces:
  - `BUILDINGS.mine = { name: 'Mine', hp: 150, cost: c(0, 100, 0, 50), size: 2, buildTime: 30, age: 'tool', sight: 3, extra: true, ore: true }`
  - `game.patches: Map<number, { id, kind, tiles, reserve, twin }>` (copied from the map, so map data isn't shared
    between games).
  - `game.patchAt: Int32Array(n*n)`, the patch id per tile (0 = none).
  - `game.terrainVersion: number`, incremented whenever `map.tiles` changes.
  - `game.oreRng`: `makeRng((seed ^ 0x6f7265) >>> 0)`.
  - In `ore.js`: `initOre(game)`, `drawFrom(game, res, want) -> number` (amount taken), `exhaustPatch(game, patch)`,
    `spawnPatchPair(game, kind, reserve) -> boolean`, `mirroredSpot(game, w, h, accept) -> {x, y} | null`
    (a bounded random search, at most 200 tries, from `game.oreRng`), `PATCH_CAP = 12`.
  - Mine entity fields: `patch` (patch id), `gatherType` (`'gold'|'stone'`), `amount` (equals its patch's reserve),
    and `digging` (the count of villagers working it last tick; render uses it).

- [ ] **Step 1: Write the failing tests** in `test/ore.test.js`

Helpers: `const g = createGame({ seed: 3 })`. `homePatch(g, pid)` is the gold patch nearest `g.map.starts[pid]`.
`explore(g, pid)` sets `g.players[pid].explored.fill(1)`. `rectOn(g, patch)` returns the top-left `{x, y}` of the
first 2×2 square that lies wholly inside `patch.tiles`.

```js
test('a Mine can only go wholly on one explored patch; nothing else can go on ore', () => {
  // canPlace(g, 0, 'mine', ...) is true on rectOn(home) once explored, false before exploring,
  // false when shifted so that one column is off the patch; canPlace(g, 0, 'house', same x, y) is false.
});
test('a Mine takes its kind and amount from the patch, and two Mines share the reserve', () => {
  // addBuilding('mine', 0, x, y, true) twice on the home patch: gatherType 'gold', both amount 1500.
  // drawFrom(g, mineA, 10) returns 10; patch.reserve 1490; after g.tick() both mines' amount === 1490.
});
test('villagers gather gold from a Mine and drop it at the Town Center', () => {
  // gather command on a constructed mine, 3000 ticks; players[0].res.gold rises and patch.reserve falls by the same amount (± carried).
});
test('an emptied patch collapses its Mines and foundations, reverts to land, and spawns a mirrored pair', () => {
  // a constructed mine + an unconstructed mine on one patch; set patch.reserve = 1; a villager gathers it.
  // after ticks: both mines gone, every patch tile is 0 in g.map.tiles and in g.patchAt, terrainVersion increased,
  // g.patches has two new gold patches that are twins, mirrored, each with reserve 1500, and on dry land with no building or resource on them.
  // the gathering villager is idle or gathering another gold source (no throw).
});
test('spawnPatchPair respects PATCH_CAP and returns false on a full map', () => {
  // fill g.patches up to PATCH_CAP with dummy entries: spawnPatchPair returns false and adds nothing.
});
test('finishing a Mine sends its builders to gather gold, not food', () => {
  // build command for a mine; tick until constructed; the builder's order is { type: 'gather', kind: 'gold' }.
});
```

Write each test body fully from its comment, with exact `assert` calls.

- [ ] **Step 2: Run to see them fail**

Run: `node --test test/ore.test.js`
Expected: FAIL (`ore.js` doesn't exist).

- [ ] **Step 3: Implement**

- `buildings.js`: add `mine` (see Interfaces). Its tip says what it holds, and comes from the patch rather than a
  data `gatherType`.
- `ore.js` `initOre(game)`: build `patches`, `patchAt`, `terrainVersion = 0` and `oreRng`. `createGame` calls it
  right after `map` is created, before the initial resources are added.
- `canPlace`: for `def.ore`, every tile must have the same non-zero `patchAt` and that patch's `reserve > 0`.
  Otherwise every tile must be `tiles === 0` (this replaces the `=== 1` water test for non-ore buildings). The
  explored, occupied, reserved and relic checks stay as they are.
- `addBuilding`: for `type === 'mine'`, set `e.patch`, `e.gatherType = patch.kind`, `e.amount = patch.reserve` and
  `e.digging = 0`.
- `drawFrom(game, res, want)`: for a building with `patch`, take `min(want, reserve)`, lower `reserve`, set
  `res.amount = reserve`, call `exhaustPatch` at 0, and return the amount taken. For anything else: the old path
  (`res.amount -= take`, `game.depleted(res)` at 0).
- `exhaustPatch`: `game.remove` every building whose `patch === id` (foundations included). Set its tiles to 0 in
  `map.tiles` and `patchAt`. `terrainVersion++`. Delete it from `patches`. Then
  `spawnPatchPair(game, kind, kind === 'gold' ? 1500 : 1250)`.
- `spawnPatchPair`: return false if `patches.size + 2 > PATCH_CAP`. Use `mirroredSpot(game, 4, 3, accept)` where
  `accept` requires every tile and every mirror tile to be `tiles === 0`, unoccupied (`game.occAt === 0`), not
  `reserved`, more than 13 tiles from both starts, and not overlapping its mirror. Write the tiles, `patchAt` and
  two twin entries with new ids (`max id + 1`), and `terrainVersion++`.
- `orders.js`: `doGather` work phase calls `drawFrom` instead of subtracting directly, and increments
  `res.gatherers` when `res.kind === 'building'`. `updateBuilding` copies it out and clears it
  (`b.digging = b.gatherers || 0; b.gatherers = 0`). Units update before buildings in `tick`, so `digging` is this
  tick's count. `nearestResource` considers own constructed buildings whose
  `gatherType === kind` for **every** kind, not just food. `doBuild` uses `kind: b.gatherType`.
- `updateBuilding`: for a Mine, set `b.amount` from its patch (0 if the patch is gone) before the existing
  `amount <= 0` removal.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: all PASS (existing farm, econ and map tests included).

- [ ] **Step 5: Commit**

```bash
git add src/sim/ore.js src/data/buildings.js src/sim/game.js src/sim/commands.js src/sim/orders.js test/ore.test.js
git commit -m "feat(sim): ore patches with shared reserves and the Mine building"
```

---

### Task 3: Respawning loose gold and stone piles

**Files:**
- Modify: `src/sim/ore.js`, `src/sim/game.js` (`tick`)
- Test: `test/ore.test.js`

**Interfaces:**
- Consumes: `mirroredSpot` and `oreRng` from Task 2.
- Produces: `updateRespawn(game)`, called from `game.tick` when `game.time % RESPAWN_EVERY === 0`
  (`RESPAWN_EVERY = secs(30)`). `game.pileStart = { gold, stone }`, the summed starting pile amounts recorded by
  `recordPileStart(game)`, which `createGame` calls after the initial resources are added (`initOre` runs before
  them). `game.lastRespawn = { gold, stone }`
  holds the tick of the last spawn.

- [ ] **Step 1: Write the failing tests**

```js
test('piles respawn mirrored once below 25% of the start, with a cooldown', () => {
  // remove gold piles until the sum < 0.25 * pileStart.gold; tick to the next RESPAWN_EVERY boundary.
  // exactly one cluster of 4 gold piles appeared (2 per side), each with amount 800, every pile's mirror tile holds a gold pile,
  // none on ore, none on water; ticking one more RESPAWN_EVERY adds none (cooldown secs(120)).
});
test('respawn is deterministic for a seed', () => {
  // two games with seed 7, the same removals, the same tick count: the gold pile positions are deepEqual.
});
test('a crowded map makes respawn give up quietly', () => {
  // stub: occupy every land tile via g.addResource trees (or set tiles to water in a copy); updateRespawn returns without throwing and adds nothing.
});
```

- [ ] **Step 2: Run to see them fail.** `node --test --test-name-pattern="respawn" test/ore.test.js`, which FAILS.

- [ ] **Step 3: Implement `updateRespawn`** in `ore.js`. For each kind with the remaining sum below
  `0.25 * pileStart[kind]` and `time - lastRespawn[kind] >= secs(120)`: use `mirroredSpot(game, 2, 2, accept)`
  (accept: all 4 tiles and their mirrors are `tiles === 0`, unoccupied, not reserved, and more than 13 tiles from
  both starts). Add 4 piles on each side with `game.addResource({ type: kind, x: tx + 0.5, y: ty + 0.5, amount: kind === 'gold' ? 800 : 600 })`.
  Wire it into `game.tick` after buildings update.

- [ ] **Step 4: Run** `npm test`. Expected: all PASS.

- [ ] **Step 5: Commit** `feat(sim): respawn mirrored gold and stone piles when the map runs low`

---

### Task 4: Bot builds and works Mines; tune with bot-sim

**Files:**
- Modify: `src/ai/bot.js` (`assign`, a new `mineSpot`)
- Test: `test/ai.test.js`

**Interfaces:**
- Consumes: `game.patches`, `game.patchAt`, `canPlace(game, pid, 'mine', x, y)`, Mine fields from Task 2.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

```js
test('a Tool Age bot with no gold piles nearby builds a Mine on its home patch and works it', () => {
  // createGame seed 3, conquest rules; createBot(g, 1, 'medium'); players[1].age = 'tool'; plenty of res;
  // remove every gold pile; players[1].explored.fill(1); give player 1 ten villagers via spawnUnit;
  // run ~6000 ticks calling think() on THINK_EVERY; assert a constructed 'mine' owned by 1 exists and
  // some villager of player 1 has order { type: 'gather', kind: 'gold', res: thatMine.id } at some point.
});
```

- [ ] **Step 2: Run to see it fail.** `node --test --test-name-pattern="builds a Mine" test/ai.test.js` FAILS.

- [ ] **Step 3: Implement in `bot.js` `assign`**, for `kind` gold or stone (Death Match still skips them):
  - Count own constructed Mines of that kind with `amount > 0`. If the chosen pile `res` is missing or more than 16
    tiles from `home`, and an own Mine of that kind exists, gather it. Spread villagers: prefer a Mine with fewer
    than 4 gatherers.
  - Otherwise, if the age is at least Tool, there's no own Mine foundation of that kind, and the bot can pay
    (`canPay`): `mineSpot(kind)` scans `game.patches` of that kind, nearest to `home` first, for the first 2×2
    `canPlace(game, pid, 'mine', x, y)`. Then build it with `v`.
  - A Mine whose patch is far from a drop site gets a Storage Pit, through the existing `dropDist > 10` branch
    (extend it to `res.kind === 'building' && res.type === 'mine'`).
  - `reachableFrom` needs no change: ore is walkable, and respawned piles only matter to sweep points, which ignore them.

- [ ] **Step 4: Run** `npm test`, then `node test/bot-sim.js 12`.
  Expected: tests PASS. bot-sim: every match ends, no exceptions, and the number of time-capped games is no worse
  than the pre-change baseline (record it on the base commit before Task 1 with the same command). If it's worse,
  tune the reserves, the Mine cost or the thresholds (Global Constraints values are placeholders) and note the final
  numbers.

- [ ] **Step 5: Commit** `feat(ai): bots build Mines when piles run out`

---

### Task 5: Render ore ground and the animated Mine

**Files:**
- Create: `src/render/arch/mine.js`
- Modify: `src/render/terrain.js`, `src/render/minimap.js`, `src/render/arch/index.js` (`designOf`, `archGeos`),
  `src/render/models.js` (`buildingModel` anim wiring, `animate`), `src/render/view.js` (call the repaint each frame),
  `src/render/grass.js` (no grass on ore tiles)
- Test: `test/render-models.test.js`

**Interfaces:**
- Consumes: `game.terrainVersion`, `map.tiles` values 2/3, `e.digging`.
- Produces:
  - `createTerrain(...)` result gains `refresh()`. When `game.terrainVersion` changed, it repaints only the tiles
    whose value differs from its own copy of `tiles` (24 px per tile on the canvas), then sets `texture.needsUpdate = true`.
    Factor the per-pixel colour into `colorAt(px, py)` so both the first paint and the repaint use it.
  - Minimap: the terrain canvas is rebuilt when `terrainVersion` changes. Colours: gold vein `#8a7a3a`, quarry `#7d7d78`.
  - `arch/mine.js` exports `mine(ctx)`, which returns the scaffold height. `designOf('mine', age)` returns
    `{ key: 'mine:' + a, kind: 'design', age: a }` for every era, and `archGeos` uses `mine` from `mine.js` for it.
  - New `ctx.extra` parts: `wheel` (a spinner over the headframe) and `cart` (`{ geo, from: [x,y,z], to: [x,y,z] }`).
    `animate` turns the wheel and runs the cart between `from` and `to` only while `e.digging > 0`. They stay still
    otherwise and are hidden while under construction.

- [ ] **Step 1: Write the failing test** in `test/render-models.test.js`

```js
test('the Mine has finite geometry in every era and animates only while dug', () => {
  // for every age in AGES and team 0/1: buildModel({ kind:'building', type:'mine', constructed:true, amount:1500, gatherType:'gold', digging:0, ... }, age)
  // has finite positions (reuse the file's existing finiteness helper); animate at t=0 and t=1 with digging 0 leaves the cart position unchanged;
  // with digging 2 the cart position changes between t=0 and t=0.5.
});
```

- [ ] **Step 2: Run to see it fail.** `node --test --test-name-pattern="Mine has finite" test/render-models.test.js` FAILS.

- [ ] **Step 3: Implement** the model with the `kit.js` helpers and `MODEL_MATERIAL` (so it is batched): a 2×2 rocky
  mound with a dark shaft mouth; a timber headframe (A-frame) with the wheel at its top; a short rail from the mouth
  with the cart on it; a pile of ore at the end tinted by `gatherType` (gold `0xd4af37`, stone `0x9a9a94`). If the
  model cache key can't see `gatherType`, make the ore pile its own small extra part tinted in `buildingModel`. Paint
  ore in `terrain.js` `colorAt`: rocky grey-brown with noise. Gold vein adds sparse yellow flecks from `hash`, and
  quarry adds darker cracks. Fade the edges toward grass over about a quarter tile with the same noise, so patches
  don't look like hard squares.

- [ ] **Step 4: Run** `npm test` (render-models, arch and gallery included; the kept-buildings hash must not change).

- [ ] **Step 5: Commit** `feat(render): ore ground, repaint on change, animated Mine`

---

### Task 6: HUD, tips, icon, docs, and browser verification

**Files:**
- Modify: `src/ui/hud.js` (inspect line), `src/ui/tips.js` (`DESC.mine`), `src/ui/icons.js` (`mine` icon),
  `README.md`, `src/data/README.md`, `progress.md`, `AGENTS.md` (only if a URL param or control changed; none is planned)
- Test: `test/ui-tiles.test.js`

- [ ] **Step 1: Write the failing test.** In `ui-tiles.test.js`, the Mine's build tile tooltip names the cost
  (100 wood, 50 stone) and says it must go on rocky ground.
- [ ] **Step 2: Run to see it fail.**
- [ ] **Step 3: Implement.**
  - The inspect line reads `` `${cap(e.gatherType)} left ${Math.floor(e.amount)}` `` (Food, Gold or Stone).
  - `DESC.mine`: 'A shaft on rocky ground. Build it on a gold vein for gold or a quarry for stone; every Mine on a
    patch shares its reserve, and the patch is gone when it runs dry.'
  - Give the Mine an icon with a pick and a wheel in the style of the others.
  - Right-click: `input.js` already sends `gather` for own buildings with a `gatherType`, so check that it works.
  - Docs: in `README.md`, describe the Mine, rocky ground and respawn. In `src/data/README.md`, mark the Mine, patches
    and respawn as invented (not AoE1). In `progress.md`, add the entry, the final tuned numbers, the bot-sim result
    and "every seed's map changed".
- [ ] **Step 4: Run** `npm test` and `node test/bot-sim.js 12`. Expected: all pass, bot-sim clean.
- [ ] **Step 5: Browser verification** (see `CLAUDE.md`): `preview_start` `my-age`, then `curl` a changed file from
  `:8000` and diff it against the worktree.
  - `?round=1&opp=easy&seed=3&speed=8`: screenshot the home gold patch. Console clean.
  - From the console, set `p.age='tool'` and fill the resources. Select a villager and open the build menu: the Mine
    tile shows. The placement ghost is red on grass and green on the patch. Build it, then right-click it with
    villagers. The wheel turns and the cart runs. The inspect line reads "Gold left N" and falls. The Storage Pit or
    Town Center receives the gold.
  - Set the patch's `reserve` to 5 from the console: the Mine collapses, the ground turns to grass, and two new
    patches appear (pan to them or check the minimap).
  - Check the phone layout at `?touch=1`, 402×874 and 874×402.
  - `?autotour=1`: it reaches the end screen with no console errors.
- [ ] **Step 6: Commit** `feat(ui): Mine tile, tooltip and inspect line; docs`
