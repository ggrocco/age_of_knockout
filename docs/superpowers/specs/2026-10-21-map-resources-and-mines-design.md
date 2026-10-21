# Map resources and Mines: design

## Intent

On the 96-tile map each player gets 4 gold piles and 3 stone piles next to the Town Center, and no gold or stone
anywhere else. Once those run out the economy stalls and there is nothing worth expanding toward. The player wants:

1. **More gold, stone and trees out between the two sides**, so expanding the village pays off and the middle is
   worth contesting.
2. **A Mine building that works like the Farm.** You build it, villagers work it, and it yields gold or stone until it
   runs dry. It can only go on the **right ground** (rocky ore ground marked on the map). The digging is underground,
   so the Mine model shows it as animation: a turning headframe wheel and a cart going in and out.
3. **Fresh deposits appear at random (fair) spots once the map's piles are mostly mined out**, so long games don't
   dry up. The player recalls AoE doing something like this; whether it did or not, it's wanted here.
4. **Rocky ground runs out** (user decision). Each rocky patch has a total reserve; when it is used up the patch turns
   back into plain land and new rocky patches appear at random. Mines are not an endless supply the way Farms are, so
   players keep having to move out across the map.

"Silver" in the first request meant rock, i.e. stone. There is **no fifth resource**.

## Goals

- Mirrored gold and stone deposits in the land between the bases, richer toward the middle.
- More forest in that same land (the map already has ~500-800 trees; the gap is mainly gold and stone).
- Ore ground: a new kind of land tile in two flavours, **gold vein** and **quarry** (stone). It is walkable. Patches
  sit next to the mid-map deposits, plus **one small gold-vein patch near each home base** (user confirmed), so a
  first Mine doesn't need a long walk.
- Mine building, Farm-style: it takes villagers through the existing `gather` command and collapses when its patch
  is empty. The ground under it decides whether it yields gold or stone.
- Each rocky patch has a finite reserve that all Mines on it share; an empty patch reverts to plain land and
  spawns new random rocky patches.
- Random mirrored respawn of gold and stone deposits when the map runs low.
- The bot uses Mines and the new deposits.
- Everything stays deterministic and seeded (sim rule in AGENTS.md); bot-sim must still terminate cleanly.

## Non-goals

- No new resource type, no new HUD counter.
- No change to the home ring of berries, gold and stone, or to Farm behaviour.
- No mining tech line. The existing Gold Mining tech (+25% gold) applies to Mines as it does to piles.
- No per-era Mine looks. One design across all eras is enough (legacy palette fallback is fine).

## Anti-goals (a failure even if it works)

- **Unfair maps.** Every new deposit, ore patch and respawn must be exactly 180-degree mirrored.
- **Breaking the map.** Starts and relic spots must stay reachable (the existing flood fill check). Ore ground is
  walkable, and deposits block like they do now.
- **Non-determinism.** No `Math.random`. Respawn must come from a seeded RNG so `?seed=N` and the headless runner
  replay exactly.
- **Bot regressions.** bot-sim 12 must still end every match cleanly, without a large jump in time-capped games.
- **Changing a KEPT building look** (the fixture hash must not move).

## Decided

### Map (`src/sim/map.js`)

- `tiles` values: 0 land, 1 water (as today), **2 gold-vein ground, 3 quarry ground**. Everything that tests
  `tiles[i] === 1` for water keeps working unchanged. Ore tiles count as land for walking and connectivity.
- The map also returns `orePatches`: `{ id, kind: 'gold'|'stone', tiles: [tile indices], reserve }`. Patches come
  in mirrored pairs with equal reserves. Ore tiles are no longer fixed for the whole game: `tiles` changes during
  play (sim-owned state), so the renderer must be able to repaint them.
- **Home patch:** one gold-vein patch per player, roughly 4x4 (room for 2 Mines), 12-16 tiles from the start and
  clear of the start's home ring and woodlines, mirrored.
- **Mid-map:** about 2 gold-vein and 1 quarry patch per half, each with a cluster of matching deposits
  (gold or stone piles) next to it. Deposits must not sit on ore ground: the ground is for Mines.
  - Mid-map piles are **richer than home piles** (builder picks the amounts; home is 800 gold / 600 stone today).
  - Placement uses the existing `far` filter idea: away from both starts, not on water, mirrored with `place`.
- **More forest** in the land between the bases. A modest bump; the builder tunes it against connectivity and the
  bot's pathing.
- Map validity: the existing `connected` check still applies. Retries (`attempt`) still cover failures.

### Mine (`src/data/buildings.js` and the sim)

- `mine`: size 2, **Tool Age**, `extra: true` (doesn't count toward age-up, same as the Farm), cost about
  **100 wood + 50 stone**. These numbers are placeholders, tuned with bot-sim.
- **Patch reserve (user decision: the ground runs out).** A Mine has no stock of its own: every load its villagers
  carry out is taken from the shared `reserve` of the patch it stands on. A Mine's displayed "amount" is the
  patch's remaining reserve. Starting reserves, as placeholders: home gold patch about 1500, mid-map gold about
  3000, quarry about 2500 (builder tunes them).
- **Placement:** all of a Mine's tiles must be ore ground of **one** kind. Its `gatherType` is set at placement from
  that kind ('gold' or 'stone'). Other buildings **may not** be placed on ore ground, so it stays free for Mines.
  The placement ghost shows red off ore ground.
- **Working it:** the same as a Farm. The `gather` command accepts an own, constructed building with `gatherType`
  (already generic). Villagers carry gold or stone to the nearest drop site that takes it (Storage Pit, Town
  Center, Government Center). No worker cap, like the Farm.
- **Empty:** when a patch's reserve hits 0, every Mine on it collapses (removed, as an empty Farm is) and the
  patch's tiles revert to plain land (0). Villagers working it go idle or move to the next resource of that kind.
- **New patches:** each emptied patch spawns one new mirrored *pair* of patches of the same kind at random land
  spots away from both starts, so both players gain equally whichever side drained it. The RNG is seeded, the spots
  don't overlap water, buildings, resources or other patches, and connectivity is kept. Respawned patches are
  smaller than the originals (for example half the reserve), so the map slowly thins out instead of growing.
  Total patches alive are capped (builder picks the cap) so a long game doesn't fill the map.
- **Score:** Mines, like Farms, don't count as buildings in `scoreOf` (`!b.gatherType` already excludes them).

### Respawn

- When the gold piles left on the map (resource entities of type `gold`, summed `amount`) fall below about **25% of
  the starting total**, spawn one mirrored cluster of fresh gold piles. Stone works the same way, tracked
  separately.
- Location: random land tiles away from both Town Centers' start spots and off ore ground, mirrored, and reachable.
  The RNG is seeded from the game seed (for example `makeRng(seed ^ CONST)`), and the check is cheap enough to
  run every ~30 s of sim time.
- There's a cooldown between spawns so a fully mined map refills gradually, not in a burst.
- New piles appear under fog like any other resource; players discover them by exploring.

### View and UI

- **Terrain:** ore ground is painted in the terrain texture (`render/terrain.js`): gold vein is rocky with yellow
  flecks, quarry is grey broken rock. The minimap colours it too.
- **Ore repaint:** when a patch reverts or a new one appears, the terrain texture and minimap update (the
  builder can repaint just the changed tiles or rebuild the texture; it happens rarely).
- **Mine model:** a timber headframe over a shaft with a turning wheel, plus a small cart that moves in and out
  while villagers are working it (idle when nobody is). It's tinted gold or grey by type. It's built from
  `MODEL_MATERIAL` so it batches, and it appears on the `buildings.html` gallery automatically.
- **HUD:** the inspect line says "Gold left N" or "Stone left N" (today it hard-codes "Food left"); for a Mine N is
  its patch's remaining reserve. There's a tooltip
  for the Mine, and an icon.
- **Input:** right-clicking a constructed own Mine with villagers sends `gather` (already generic for `gatherType`).

### Bot (`src/ai/bot.js`)

- When the bot wants gold or stone and the nearest known pile is far away or gone, it builds a Mine on known ore
  ground of the right kind (home patch first) and sends gatherers there.
- It picks up mid-map and respawned piles through the existing nearest-known-resource logic.

### Tests

- Map: mirroring of new deposits and ore tiles, connectivity across many seeds, home patch present for both players.
- Mine: placement only on single-kind ore ground, `gatherType` from the ground, gather yields the right resource,
  removal when empty, other buildings refused on ore.
- Respawn: triggers below the threshold, mirrored, deterministic for a given seed.
- Patches: two Mines on one patch share its reserve; an empty patch collapses its Mines, reverts its tiles and
  spawns a mirrored pair; the patch cap holds.
- `node test/bot-sim.js 12` clean.

### Docs to update (per AGENTS.md)

- `README.md` (new building and map features), `src/data/README.md` and `progress.md`: the Mine and respawn are
  invented, not AoE1.

## Builder notes (from the review)

- `orders.js` hard-codes `kind: 'food'` when a villager starts working the field it just built, and after a pile
  runs out it only looks for food buildings. Both must use the building's `gatherType`.
- `map.js` `place` can drop one side of a mirrored pair when a tile is taken; new deposits and patches must be
  placed as whole pairs or not at all.
- The bot's `reachableFrom` treats the map's starting piles as fixed; it must account for changing ore tiles and
  respawned piles where it matters.
- Changing map generation changes the map for every existing seed. That is accepted; note it in `progress.md`.
- The Mine and the patch system apply to every round (Death Match bots already skip gold and stone).

## Left to the builder

- Exact patch shapes, counts and distances, deposit amounts, patch reserves, the respawned-patch size and cap,
  forest density, respawn threshold, cooldown and cluster size, within the intent above. Tune with `test/bot-sim.js` and `test/era-reach.js`.
- How the Mine animation is driven (`animate()` reading the building's worker count or a recent-gather flag).
- How the bot finds ore ground (scan `map.tiles` for explored patches).
