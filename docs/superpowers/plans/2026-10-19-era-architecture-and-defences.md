# Era Architecture and Defences Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every building gets its own silhouette in every era. Add Towers and Walls that shoot, block, upgrade with
the era and can be breached, with bot and UI support.

**Architecture:**
- **Rendering:**
  - Shared geometry helpers move into `src/render/builder.js`.
  - Per-era building designs live in `src/render/arch/<era>.js` behind a registry, `src/render/arch/index.js`.
  - Today's kept designs move verbatim into `arch/legacy.js`, with their geometry pinned by a hash fixture.
- **Defences:**
  - Ordinary buildings, plus a stats table in `src/data/defences.js`.
  - A tower update and the breach logic in `src/sim/defence.js`.
  - Two commands, `wall` and `delete`.

**Tech Stack:** Plain ES modules, Node test runner, three.js procedural models. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-19-era-architecture-and-defences-design.md`. Prototype for reference only:
`git show spike/era-architecture:src/render/spike-arch.js`.

## Global Constraints

- **Determinism:** `src/sim` and `src/ai` stay DOM-free and deterministic. No `Math.random`; any randomness uses the
  seeded RNG.
- **Footprints:** every existing building keeps its `size` and footprint. New: Tower `size: 2`, Wall `size: 1`.
- **Kept designs:**
  - These stay byte-identical (sha1 of the position and colour buffers): every Tool building, the Iron Town Center,
    House, Government Center and Wonder, the Medieval Castle and the Industrial Factory.
  - Every other era of a building gets a new design.
- **Heights:**
  - The body mesh (`anim.body`) stays at or below 3.6 units; the Wonder at or below 5.5.
  - Flagpoles, antennas and thin spire tips go in the separate `mast` geometry.
  - Animated parts don't count toward height.
- **Team colour:** every design shows it (flag, banner, stripe or trim).
- **Animated parts:** only through `spinners`, `floaters` and `smoke`, all hidden while the building is unfinished.
- **Rendering:** all model meshes use the shared model material, so the batched renderer draws them.
- **Tower stats**, verbatim from the spec (cost 40 wood + 120 stone, `extra`):

  | Era | HP | Attack | Range | Cooldown | Splash |
  |---|---|---|---|---|---|
  | tool | 125 | 3 pierce | 5 | 40 | — |
  | bronze | 160 | 4 pierce | 6 | 40 | — |
  | iron | 220 | 7 pierce | 7 | 40 | — |
  | medieval | 280 | 9 pierce | 7 | 40 | — |
  | sail | 340 | 16 melee | 8 | 60 | 0.8 |
  | industrial | 380 | 4 pierce | 7 | 12 | — |
  | modern | 440 | 26 melee | 9 | 50 | 1.0 |
  | future | 500 | 18 pierce | 9 | 20 | — |

- **Wall stats:**
  - HP by era: tool 120, bronze 200, iron 300, medieval 400, sail 450, industrial 500, modern 650, future 800.
  - Armor: melee 4 / pierce 10.
  - Cost: 5 stone per segment; `extra`.
- **Bot towers per difficulty:** relaxed 1, easy 1, medium 2, hard 3. The bot never builds walls.
- **Copy:** UI text never says "Sail Age". `DESC` entries are 20–200 characters and claim only what the sim does.
- **Commits:** end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Work on branch
  `claude/era-architecture`, and don't push without asking.
- **Tests:** every task ends with `npm test` green. Tasks that touch the sim or bot also need
  `node test/bot-sim.js 12` to print "ALL MATCHES ENDED CLEANLY".

## Review Focus

1. **A wall line drawn across trees or buildings.** Every free tile is placed and paid for. Blocked tiles are skipped
   and not charged, and the villagers skip them in their build queue. → Task 14 test.
2. **A unit standing on a wall tile when the segment finishes.** It is moved to the nearest free tile, never left
   inside the wall. → Task 14 test.
3. **A target unreachable because of water or trees, not buildings.** Breaching finds no enemy building and returns
   null; the unit gives up as it does today and attacks nothing at random. → Task 15 test.
4. **Advancing while a tower or wall is damaged or still under construction.** Its HP fraction and construction
   progress are kept. When it finishes, it ends at the new era's max HP. → Task 13 test.
5. **Phone wall placement next to pan and pinch gestures.** Tap start, tap end, then confirm. A pan in between must
   not place anything. → Task 17 browser step.

## File Structure

| File | Responsibility | Tasks |
|---|---|---|
| `src/render/builder.js` (new) | `B` merge builder, palette `C`, unit geometries, `mesh`, `pivot`, `cached`, team colours, model material | 1 |
| `src/render/models.js` | units, nature, relics; `buildingModel` uses the arch registry; animation | 1–3, 18 |
| `src/render/arch/legacy.js` (new) | today's `buildingGeos` body, verbatim, for kept designs and not-yet-redesigned eras | 2 |
| `src/render/arch/kit.js` (new) | design context and shared design helpers (`door`, `win`, `found`, `flag`, `ring`, `gear`, `puff`, `firePit`, `windowGrid`, `scaffold`) | 2 |
| `src/render/arch/index.js` (new) | registry, `designOf`, `archGeos` | 2 |
| `src/render/arch/{stone,bronze,iron,medieval,sail,industrial,modern,future}.js` (new) | one design function per building type for that era | 3–11, 18 |
| `test/fixtures/kept-buildings.json` (new), `test/tools/hash-buildings.js` (new) | pinned hashes of kept designs, and the script that writes them | 1 |
| `test/arch.test.js` (new) | kept hashes, pairwise distinctness, heights, animated parts | 1–11, 18 |
| `src/data/defences.js` (new), `src/data/buildings.js`, `src/data/README.md` | tower and wall tables, `defenceStats` | 12 |
| `src/sim/defence.js` (new), `src/sim/game.js`, `src/sim/orders.js`, `src/sim/commands.js`, `src/sim/util.js` | towers, walls, breaching, `wall` and `delete` commands, `lineTiles` | 12–15 |
| `src/rounds/index.js` | walls excluded from score | 12 |
| `src/ai/bot.js` | towers, siege targets towers | 16 |
| `src/ui/input.js`, `src/ui/hud.js`, `src/ui/icons.js`, `src/ui/tips.js`, `src/render/view.js` | wall drag / tap-tap, ghost line, delete tile and key, icons, descriptions | 12, 17 |
| `test/defence.test.js` (new) | tower, wall, breach, command and score tests | 12–16 |

---

## Part 1 — Rendering architecture

### Task 1: Shared builder module and the kept-design hash fixture

**Files:**
- Create: `src/render/builder.js`, `test/tools/hash-buildings.js`, `test/fixtures/kept-buildings.json`,
  `test/arch.test.js`
- Modify: `src/render/models.js` (import from `builder.js`; re-export `TEAM`, `TEAM_DARK`, `MODEL_MATERIAL`)

**Interfaces:**
- Produces:
  - `builder.js` exports `B`, `C`, `unit`, `TEAM`, `TEAM_DARK`, `MODEL_MATERIAL`, `mesh(g)`, `pivot(x, y, z, g)`,
    `cached(key, f)`. Same behaviour as today's definitions.
  - `test/tools/hash-buildings.js` exports `hashBuildings()` and prints its JSON when run directly. The JSON maps `` `${type}:${age}:${owner}:${constructed}` ``
    to a sha1 hex of every mesh's `position` + `color` arrays, in traversal order. It covers the kept list:
    - Tool: town_center, house, granary, storage_pit, farm, barracks, archery_range, stable, market;
    - Iron: town_center, house, government_center, wonder;
    - Medieval: castle;
    - Industrial: factory.

- [ ] **Step 1: Generate the fixture from the current code, before any refactor.**
  Write `test/tools/hash-buildings.js` (it imports `buildModel` and `BUILDINGS`, and renders owners 0/1 with
  constructed true/false and `progress: 0.5`, `amount: 300`). Then run
  `node test/tools/hash-buildings.js > test/fixtures/kept-buildings.json`.
  Expected: 60 keys (15 type/age pairs × 2 owners × 2 states).
- [ ] **Step 2: Write the pinning test** in `test/arch.test.js`:

  ```js
  test('kept designs stay byte-identical', () => {
    const want = JSON.parse(readFileSync(new URL('./fixtures/kept-buildings.json', import.meta.url)));
    assert.deepEqual(hashBuildings(), want); // hashBuildings is exported by test/tools/hash-buildings.js
  });
  ```

  Run `node --test test/arch.test.js`. Expected: PASS. It is a characterisation test and passes before the refactor.
- [ ] **Step 3: Extract `builder.js`.** Move `B`, `prismGeo`, `C`, `unit`, the `_m/_q/...` temporaries, `cache`,
  `cached`, `mesh`, `pivot`, `TEAM`, `TEAM_DARK` and the model material out of `models.js` unchanged. `models.js`
  imports them and re-exports `TEAM`, `TEAM_DARK` and `MODEL_MATERIAL`, because `view.js` and the gallery import them
  from `models.js`.
- [ ] **Step 4: Run all checks.** Run `npm test`. Expected: all pass, the pinning test included.
- [ ] **Step 5: Commit** with the message `refactor: shared model builder; pin kept building designs`.

### Task 2: Arch registry, legacy module, design kit, mast and animated parts

**Files:**
- Create: `src/render/arch/legacy.js`, `src/render/arch/kit.js`, `src/render/arch/index.js`
- Modify: `src/render/models.js` (`buildingModel`, `animate`)
- Test: `test/arch.test.js`

**Interfaces:**
- `legacy.js`:
  - `legacyGeos(type, team, size, age) → { body, extra }`: today's `buildingGeos` moved verbatim, scaffold included.
  - It still reads `styleOf(age)` from `styles.js`, which survives for legacy only.
- `kit.js`:
  - `designCtx(type, team, size, age) → ctx` with
    `{ b: B, mast: B, extra: {}, type, team, size, s: size - 0.22, h, t: TEAM[team], td: TEAM_DARK[team], age }`.
  - Helpers taking `ctx` first: `door(ctx, w, hh, z, x)`, `win(ctx, x, y, z, ry)`, `found(ctx, w, d)`,
    `banner(ctx, x, z, y0, hh)`, `flag(ctx, x, y, z)` (pole into `ctx.mast`, sets `extra.flag` / `extra.flagAt`),
    `firePit(ctx, x, z)`, `windowGrid(ctx, cols, rows, w, z, y0, dy, frame, glass, x0 = 0)`.
  - Geometry makers: `ring(r, tube, color, tilt) → geometry`, `gear(R, color) → geometry`, `puff() → geometry`.
  - `finish(ctx, scaffoldHeight) → { body, mast, extra }`. It adds the standard scaffold sized to `scaffoldHeight`.
- `index.js`:
  - `KEPT = { tool: [...9 types], iron: ['town_center', 'house', 'government_center', 'wonder'], medieval: ['castle'], industrial: ['factory'] }`.
  - `DESIGNS = { stone, bronze, iron, medieval, sail, industrial, modern, future }`: each maps a type to
    `design(ctx) → scaffoldHeight`. All start empty.
  - `designAge(type, age)`: `age`, or the building's unlock age if `age` is earlier.
  - `designOf(type, age) → { key, kind: 'kept' | 'design' | 'legacy', age }`, with key `kept:<age>`, `<age>`, or
    `legacy:<styleKey>`.
  - `archGeos(type, team, size, age) → { body, mast?, extra }`.
- `models.js` `buildingModel`:
  - The cache key is `` `b:${e.type}:${e.owner}:${designOf(e.type, age).key}` ``.
  - It adds `mast` as a static mesh.
  - It adds `extra.spinners` (`{ geo, at, axis, speed }`), `extra.floaters` (`{ geo, at, amp, speed, phase }`) and
    `extra.smoke` (`{ geo, at, phase }`) as pivots in `anim.spinners`, `anim.floaters` and `anim.smoke`.
- `animate`, for a building:
  - Animated parts are `visible = e.constructed`.
  - Spinners: `rotation[axis] = t * speed`.
  - Floaters: `position.y = at.y + sin(t * speed + phase) * amp`.
  - Smoke: `k = (t * 0.35 + phase) % 1`, rising `k * 0.9`, scaled `0.5 + k * 0.9`.

- [ ] **Step 1: Write the failing tests:**
  - `designOf('castle', 'stone').age === 'medieval'`.
  - `designOf('house', 'tool').kind === 'kept'`.
  - `designOf('house', 'sail').kind === 'legacy'`, since no design exists yet.
  - The animated-parts plumbing is tested in Task 3 with real designs; no test-only hook goes into production code.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/arch.test.js`. Expected: FAIL, because
  `arch/index.js` doesn't exist.
- [ ] **Step 3: Implement**, following the interfaces above. `buildingGeos` disappears from `models.js`.
- [ ] **Step 4: Run all checks.** Run `npm test`. Expected: all pass, including the kept-hash pin and the existing
  every-building × every-era loop.
- [ ] **Step 5: Commit** with the message `refactor: per-era building design registry with animated parts`.

### Task 3: Port the prototype Town Center and House, and add the distinctness and height tests

**Files:**
- Modify: `src/render/arch/{stone,bronze,medieval,sail,industrial,modern,future}.js`
- Test: `test/arch.test.js`

**Interfaces:**
- Produces two shared test helpers in `test/arch.test.js`:
  - `posHash(type, age)`: sha1 of the static mesh position arrays at `constructed: true`, owner 0;
  - `bodyHeight(type, age)`: max y of `anim.body`'s bounding box.

- [ ] **Step 1: Write the failing tests:**

  ```js
  const available = type => AGES.filter(a => ageIndex(a) >= ageIndex(BUILDINGS[type].age));
  const distinctAcrossEras = types => { for (const type of types) { const hs = available(type).map(a => posHash(type, a)); assert.equal(new Set(hs).size, hs.length, `${type}: two eras share a shape`); } };
  const heightsOk = types => { for (const type of types) for (const a of available(type)) assert.ok(bodyHeight(type, a) <= (type === 'wonder' ? 5.5 : 3.6), `${type}/${a} height ${bodyHeight(type, a)}`); };
  test('Town Center and House: every era has its own shape', () => distinctAcrossEras(['town_center', 'house']));
  test('Town Center and House: heights within the cap', () => heightsOk(['town_center', 'house']));
  test('animated parts: hidden until finished, then they move', () => {
    // industrial town_center: anim.smoke and anim.spinners non-empty; future town_center: anim.spinners and anim.floaters non-empty.
    // At constructed:false every part is hidden. At constructed:true, between animate(t=1) and animate(t=2): every part is
    // visible, spinner rotation[axis] changed, floater position.y changed, smoke position.y changed.
  });
  ```

- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/arch.test.js`.
  Expected: FAIL, because the House is legacy in several eras.
- [ ] **Step 3: Port** the prototype's `town_center` and `house` builders for stone, bronze, medieval, sail,
  industrial, modern and future into the era modules, using `kit.js` helpers.
  - Flagpoles and the Modern antenna go into `ctx.mast`.
  - Return the scaffold height: the body's top.
  - Keep the prototype's shapes and colours. That is what the user approved, including the AI Future pod's
    edge-ring fix.
- [ ] **Step 4: Run all checks.** Run `npm test`. Expected: all pass.
- [ ] **Step 5: Commit** with the message `feat: era Town Center and House designs`.

## Part 2 — Remaining building designs

Tasks 4–11 share one shape. For the era named:

- **Files:**
  - Modify: `src/render/arch/<era>.js`
  - Test: `test/arch.test.js`
- **Step 1: Write the failing tests.** Add `distinctAcrossEras(TYPES)` and `heightsOk(TYPES)` for the task's TYPES;
  they accumulate. Add an animated-parts assertion wherever the design calls for one.
- **Step 2: Run them to verify they fail.** Run `node --test test/arch.test.js`. Expected: FAIL.
- **Step 3: Implement** each design from the spec's table (and its Iron table) with `kit.js` helpers. The building's
  job must stay readable.
- **Step 4: Run all checks.** Run `npm test` (all pass). Then:
  1. With `preview_start`, open `buildings.html`.
  2. Screenshot the era's column next to its neighbours. Use a 3×3 sheet of the cell canvases if the pane is small.
  3. Read the console.
  4. If a design reads as the wrong building or the wrong era, fix it now.
- **Step 5: Commit** with the message `feat: <era> building designs`.

| Task | Era | TYPES (new designs) | Animated parts |
|---|---|---|---|
| 4 | stone | granary, storage_pit, farm, barracks | none |
| 5 | bronze | granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder | — |
| 6 | iron | granary, storage_pit, farm, barracks, archery_range, stable, market | — |
| 7 | medieval | granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder | storage_pit: treadwheel spinner |
| 8 | sail | granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder, castle | wonder: lighthouse lamp spinner |
| 9 | industrial | granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder, castle | smoke on barracks, market, government_center and castle; a gantry-crane spinner on storage_pit |
| 10 | modern | granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder, castle, factory | barracks: radar dish spinner |
| 11 | future | granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder, castle, factory | spinners or floaters on every AI Future building |

At the end of Task 11, `distinctAcrossEras` and `heightsOk` run over every building type except the Tower and Wall
(those come in Task 18). `designOf(type, age).kind` must never be `'legacy'` outside the `KEPT` list; add that as an
assertion.

## Part 3 — Defences

### Task 12: Tower and Wall data, icons, descriptions, age gate and score

**Files:**
- Create: `src/data/defences.js`
- Modify:
  - `src/data/buildings.js`, `src/data/README.md`
  - `src/sim/game.js` (`addBuilding`)
  - `src/rounds/index.js` (`scoreOf`)
  - `src/ui/icons.js`, `src/ui/tips.js`
- Test: `test/defence.test.js`, `test/ui-tiles.test.js`

**Interfaces:**
- `defences.js` exports:
  - `TOWER` (era → `{ hp, atk, atkType, range, cooldown, splash? }`, the Global Constraints table);
  - `WALL_HP` (era → hp);
  - `defenceStats(type, age)`. For ages before Tool it returns the Tool row.
- `BUILDINGS`:
  - `tower: { name: 'Tower', hp: 125, cost: c(0, 40, 0, 120), size: 2, buildTime: 40, age: 'tool', sight: 8, extra: true, defence: 'tower' }`;
  - `wall: { name: 'Wall', hp: 120, cost: c(0, 0, 0, 5), size: 1, buildTime: 6, age: 'tool', sight: 2, extra: true, defence: 'wall', marmor: 4, parmor: 10 }`.
  - Build times and sight are my call; record them in the README.
- `addBuilding`, for `defence`: `maxHp` comes from `defenceStats(type, owner age)`. A tower also gets
  `atk, atkType, range, cooldown, splash, bonus: null, cd: 0`.
- Score: `blds` skips `type === 'wall'`.

- [ ] **Step 1: Write the failing tests:**
  - `'tower and wall take their HP from the owner era'`: at sail, a tower has `maxHp` 340 and a wall 450.
  - `'towers and walls do not count toward age-up'`: `ageUpNeed('tool')` is unchanged (2) and `ageBuildings('tool')`
    excludes both.
  - `'walls do not add to the building score; towers do'`: add 10 finished walls; `scoreOf` is unchanged. Add a
    finished tower; the score rises.
  - `'towers and walls do not keep a player alive'`: wipe a player except one tower and one wall;
    `isEliminated` is true.
  - The ui-tiles icon and description loops cover `tower` and `wall` automatically.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/defence.test.js test/ui-tiles.test.js`.
- [ ] **Step 3: Implement.**
  - Icons: a tower with crenellations, and a wall segment row.
  - `DESC`: the tower shoots the nearest enemy and grows stronger each era; walls block everyone, have no gates, grow
    tougher each era, and can be deleted.
  - README: an "Invented content (defences)" section with both tables.
- [ ] **Step 4: Run all checks.** Run `npm test` and `node test/bot-sim.js 12`.
- [ ] **Step 5: Commit** with the message `feat: Tower and Wall data`.

### Task 13: Tower shooting and upgrade on advance

**Files:**
- Create: `src/sim/defence.js`
- Modify: `src/sim/game.js` (tick: `updateTower`; on age completion, `refreshDefences(game, pid)`)
- Test: `test/defence.test.js`

**Interfaces:**
- `updateTower(game, b)`. Each tick for a finished tower:
  - decrement `cd`;
  - at 0, pick the nearest enemy unit whose tile is visible to the owner, within `range` of the tower's centre;
  - `hit(game, b, target)`, then `cd = cooldown`.
- `refreshDefences(game, pid)`. For each tower and wall of `pid`:
  - `hp = hp / maxHp * newMax`, then `maxHp = newMax`;
  - a tower also copies the attack fields.
  - Construction progress is unchanged. A building finished later ends at `maxHp`.

- [ ] **Step 1: Write the failing tests:**
  - `'a tower shoots the nearest enemy in range, not one out of range, not allies'`.
  - `'a tower does not shoot an enemy hidden by fog'`.
  - `'a sail tower splashes'`.
  - `'advancing upgrades towers and walls in place, keeping the HP fraction'`: a tower at 50% in Tool is at 50% of
    160 after Bronze.
  - Review Focus 4: an unfinished tower keeps its `progress` across an advance, and finishes at the new `maxHp`.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/defence.test.js`.
- [ ] **Step 3: Implement**, as above. Kills are credited through `game.damage` as they are today.
- [ ] **Step 4: Run all checks.** Run `npm test` and `node test/bot-sim.js 12`.
- [ ] **Step 5: Commit** with the message `feat: towers shoot and upgrade with the era`.

### Task 14: Wall line command, non-blocking foundations, and deleting your own buildings

**Files:**
- Modify:
  - `src/sim/util.js` (`lineTiles`)
  - `src/sim/commands.js` (`wall`, `delete`, `canPlace` reserved tiles)
  - `src/sim/game.js` (reservation, completion eviction)
  - `src/sim/orders.js` (`doBuild` queue)
- Test: `test/defence.test.js`

**Interfaces:**
- `lineTiles(a, b) → [{x, y}]`:
  - snap to horizontal if `|dx| > 2|dy|`, vertical if `|dy| > 2|dx|`, else diagonal of length `max(|dx|, |dy|)`;
  - inclusive of both ends, at most 64 tiles.
- `{ type: 'wall', ids, tiles }`:
  - for each tile in order, if `canPlace(game, pid, 'wall', x, y)` and the player can afford it, pay and place an
    unfinished wall;
  - stop at the first unaffordable tile;
  - return `{ ok: true, placed: n }`, or `fail('placement')` when n is 0;
  - the villagers get `{ type: 'build', target: firstId, queue: [restIds] }`.
- `doBuild`: when the target is finished, take the nearest unfinished building still alive in `o.queue`, else stop.
- **Wall foundations don't block movement.**
  - They reserve their tile in `game.reserved` (a Set of tile indices), and `canPlace` rejects reserved tiles.
  - On completion the tile is marked as occupied, and any unit on it moves to the nearest free tile.
  - `remove` clears the reservation.
- `{ type: 'delete', id }`: removes the caller's own building, with no refund. Anything else fails with
  `'bad target'`.

- [ ] **Step 1: Write the failing tests:**
  - `lineTiles` snapping, horizontal, vertical, diagonal and the 64 cap.
  - `'a wall line places and pays per segment and stops when stone runs out'`.
  - Review Focus 1: a line across a tree places the free tiles, skips the tree without charging for it, and the
    villagers build every placed segment.
  - `'a finished wall blocks pathing'`.
  - `'wall foundations do not block movement'`.
  - Review Focus 2: a unit standing on a wall tile when it completes is moved off.
  - `'you can delete your own building, not an enemy one'`. Delete a Barracks with a training queue: no error, pop is
    recounted.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/defence.test.js`.
- [ ] **Step 3: Implement**, as above.
- [ ] **Step 4: Run all checks.** Run `npm test` and `node test/bot-sim.js 12`.
- [ ] **Step 5: Commit** with the message `feat: wall lines and deleting your own buildings`.

### Task 15: Breaching

**Files:**
- Modify: `src/sim/defence.js` (`breachTarget`), `src/sim/orders.js` (`doAttack`, `doMove`)
- Test: `test/defence.test.js`

**Interfaces:**
- `breachTarget(game, u, to, goal) → buildingId | null`:
  1. Run `findPath(game.map, blockedExceptEnemyBuildings, from, to, goal)`. The `blocked` callback treats tiles held
     by an enemy building as free; resources, water and own buildings still block.
  2. Walk the path and return the id of the first enemy building occupying a path tile.
  3. Return null when there is no path, or when the path crosses no enemy building.
- In `doAttack` and `doMove`, when `travel` returns `'fail'`:
  - if `breachTarget` finds a building, the order becomes `{ type: 'attack', target: id, fails: 0, resume: <old order> }`;
  - when that target dies, the order is restored from `resume`.

- [ ] **Step 1: Write the failing tests:**
  - `'a unit walled off from its target attacks a wall segment, then reaches the target'`: a closed wall ring around
    an enemy building; a swordsman ordered to attack it.
  - `'towers and other buildings used as a fence are breached too'`.
  - Review Focus 3: a target cut off by water or trees only, with no enemy buildings; `breachTarget` returns null and
    the unit stops as before.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/defence.test.js`.
- [ ] **Step 3: Implement**, as above.
- [ ] **Step 4: Run all checks.** Run `npm test` and `node test/bot-sim.js 12`.
- [ ] **Step 5: Commit** with the message `feat: units breach blocking enemy buildings`.

### Task 16: Bot towers, siege targets towers, and the fortress test

**Files:**
- Modify: `src/ai/bot.js` (`DIFF.*.towers`; the tower rule in `think`; the siege tower preference in `orderArmy`)
- Test: `test/ai.test.js`

**Interfaces:**
- `DIFF[d].towers`: relaxed 1, easy 1, medium 2, hard 3.
- From the Tool Age: if `count('tower') < D.towers`, then `tryBuild('tower', free, home)`.
- In an active wave: an idle siege unit attacks the nearest visible enemy tower, if there is one.

- [ ] **Step 1: Write the failing tests:**
  - `'bot keeps its tower count'`: a hard bot in Tool, with rich resources, has 3 towers within 6000 ticks.
  - `'a hard Death Match army breaks into a walled, towered base'`:
    1. Use the Death Match rules and set `game.time = 9000`.
    2. Player 1's Town Center sits inside one closed wall ring with 3 finished towers.
    3. A hard bot for player 0 starts with 24 mixed era units, including 2 Cannons, near the ring.
    4. Within 3000 ticks, a player 0 unit is inside the ring or the Town Center has lost HP.
  - `'the bot never builds walls'`.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/ai.test.js`.
- [ ] **Step 3: Implement**, as above.
- [ ] **Step 4: Run all checks.** Run `npm test`, then `node test/bot-sim.js 12` (all clean) and
  `node test/era-reach.js 12` (Death Match still median Modern; record the numbers).
- [ ] **Step 5: Commit** with the message `feat: bot builds towers and sends siege at them`.

### Task 17: Wall placement, the ghost line and Delete in the UI

**Files:**
- Modify: `src/ui/input.js`, `src/ui/hud.js`, `src/render/view.js` (`showGhostLine`), `src/ui/icons.js`,
  `src/ui/tips.js`, `styles.css` (danger tint)

**Interfaces:**
- `view.showGhostLine(tiles, okFlags)`: an InstancedMesh of 1×1 ghost boxes, green or red per tile.
  `showGhostLine(null)` hides it.
- **Desktop:** with `ui.placing === 'wall'`:
  - mouse-down sets the start tile;
  - mouse-move shows `lineTiles(start, current)`;
  - mouse-up issues `{ type: 'wall', ids: selectedVillagers, tiles }`. The result toasts the placed count, or the
    reason.
- **Phone:**
  - first tap sets the start;
  - second tap sets the end and shows the line;
  - the existing confirm button issues the command;
  - a pan or pinch between taps changes nothing.
- **Delete:**
  - a selected own building shows a `Delete` tile (`data-delete`, danger tint);
  - desktop: the Delete key does the same;
  - touch: the first tap arms it, with the tile showing "Tap again to delete"; a second tap within 3 s deletes.

- [ ] **Step 1: Write the failing test** (`test/ui-tiles.test.js`): `ICONS.delete` exists and `DESC` covers
  `delete`. The rest of this task is browser-verified, since the UI has no DOM tests.
- [ ] **Step 2: Run it to verify it fails.** Run `node --test test/ui-tiles.test.js`.
- [ ] **Step 3: Implement**, as above.
- [ ] **Step 4: Run all checks.**
  1. Run `npm test`.
  2. Desktop browser:
     - draw a wall line across a tree and confirm the gap and the cost;
     - build a Tower;
     - delete a Wall with the key and with the tile.
  3. `?touch=1` at 402×874 and 874×402:
     - tap, tap, confirm a wall line;
     - pan between taps, which must not place anything (Review Focus 5);
     - delete with a double tap.
  4. The console stays clean.
- [ ] **Step 5: Commit** with the message `feat: wall placement and delete in the UI`.

### Task 18: Tower and Wall looks per era, and the firing visual

**Files:**
- Create: `src/render/arch/tool.js`
- Modify: `src/render/arch/{bronze,iron,medieval,sail,industrial,modern,future}.js`, `src/render/arch/index.js` (add
  `tool` to `DESIGNS`)
- Modify: `src/render/models.js` (tower `anim.fire`)
- Test: `test/arch.test.js`

**Interfaces:**
- **Designs:** `tower` and `wall` for every era from Tool to AI Future, per the spec tables. Tool is a new module;
  its only designs are these two, since the other Tool buildings are `KEPT`.
- **Walls:** each 1×1 segment fills its tile edge to edge, so touching segments read as one wall.
- **Firing visual:** a tower model gets `anim.fire`: a pivot that recoils, or a small emissive-colour flash part
  shown while `e.cd > e.cooldown - 6`. It uses the model material only.

- [ ] **Step 1: Write the failing tests:**
  - `distinctAcrossEras(['tower', 'wall'])` and `heightsOk(['tower', 'wall'])`;
  - `'a firing tower shows its fire part'`: animate with `cd = cooldown - 1`, then `cd = 0`; the part's state differs.
- [ ] **Step 2: Run the tests to verify they fail.** Run `node --test test/arch.test.js`.
- [ ] **Step 3: Implement**, as above.
- [ ] **Step 4: Run all checks.** Run `npm test`. Then take gallery screenshots of the Tower and Wall rows, and look
  at a firing tower in a match.
- [ ] **Step 5: Commit** with the message `feat: tower and wall designs per era`.

### Task 19: Full browser verification, performance and docs

**Files:**
- Modify: `progress.md`, `src/data/README.md` (if anything changed), and any fix found, test-first where possible.

- [ ] **Step 1: Gallery.** Screenshot every building in every era (3×3 sheets per building) and review each against
  the spec's anti-goals: is the era recognisable, and the building's job readable?
- [ ] **Step 2: Matches.**
  - One match per era, jumping state with `javascript_tool`, to watch the animations.
  - An autoplay Death Match (`?round=2&autoplay=1&speed=8`): the bot builds towers.
  - A staged breach: a player's wall ring and a bot army.
  - `?autotour=1` to the end screen.
  - The console stays clean throughout.
- [ ] **Step 3: Performance.**
  - Death Match at tick ~15000 (autoplay, seed 1, both sides in Modern or later): record `renderer.info.render.calls`
    and the mean frame time over 5 s.
  - Compare with the same on `claude/era-chain`.
  - Expected: draw calls within +20%, and no visible frame drop. Otherwise reduce geometry and re-measure.
- [ ] **Step 4: Final checks and ledger.**
  1. Run `npm test`, `node test/bot-sim.js 12` and `node test/era-reach.js 12`.
  2. Append to `progress.md`: what was verified, what was not (real phone, hardware GPU), the performance numbers, and
     any deferred minors.
  3. Commit with the message `docs: era architecture and defences verification ledger`.
  4. Ask the user before pushing.
