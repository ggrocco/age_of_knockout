# Era Chain (Medieval → Age of Sail → Industrial → Modern) — Design Spec

Date: 2026-10-19
Status: Draft, awaiting user review
Sub-project A of "more eras with boats and planes". B (naval) and C (air) get their own specs and build on this one.

## Goal
Add four eras between Iron and AI Future — **Medieval Age, Age of Sail, Industrial Age, Modern Age** — each with its own
land units, look and (for two of them) a new building. Death Match becomes the round where the late eras are played.

## Confirmed decisions (from brainstorming)
- Lineup: Stone → Tool → Bronze → Iron → **Medieval → Age of Sail → Industrial → Modern** → AI Future.
- Scope: "lean eras" — 2–3 land units per era at existing buildings, plus a **Castle** (Medieval) and a **Factory**
  (Industrial); buildings re-skin per era with a palette, roof form and one signature detail; no new technologies.
- Death Match starts both players in the **Iron Age** with 20,000 of every resource (cap unchanged, 24,000 ticks).
- The sail era is named **"Age of Sail"**; no UI may read "Sail Age" or a bare "Sail".
- Prerequisite done separately (PR #7): the Wonder no longer blocks Bronze → Iron; `ageUpNeed(age)` is the single
  source for the age-up building rule.

## Non-goals
- Boats, Docks, shared water, naval pathing (sub-project B). Planes, Airfield, anti-air, flying movement (C).
- New technologies; rebalancing the existing ancient/future units; changes to the other four rounds or the bracket.
- Exact historical accuracy. All new numbers are invented, game-tuned approximations (recorded in `src/data/README.md`).

## Current state (facts this design relies on)
- `src/data/ages.js`: `AGES = ['stone','tool','bronze','iron','future']`, `AGE_COST`, `AGE_NAME`, `ageLabel`.
- `src/sim/commands.js`: `ageUpNeed(age) = min(2, non-extra, non-TC buildings of that age)`; `ageUpProblem` uses it.
- Class-based rules: spawn cooldown by class (`game.js`: archer 40 / siege 80 / other 30 ticks); techs by class
  (Bronze/Iron Weapons +2 atk inf/cav, Bronze Shields inf, Ballistics +1 range archer/siege); Spearman `bonus: {cav: 8}`;
  siege cannot carry relics (`commands.js`).
- `src/render/models.js`: `unitModel` sends every `cav` unit to the horse branch and every `siege` unit to the catapult
  branch; building style is a two-way `masonry` check (`['bronze','iron','future']`) used in `buildingGeos` and the
  `buildingModel` cache key.
- `src/ai/bot.js`: `bestUnit` only picks units listed in the `PREF` lists; `SIEGE` list; per-age build logic is hard-coded
  by `ageIndex`; Death Match waves start at 6,000 ticks once the army reaches 24/32/38.
- Measured after PR #7: Death Match bots reach AI Future 12/12 starting from Stone (4 age-ups).

## Design

### 1. Ages and labels (`src/data/ages.js`)
- `AGES` gains `medieval, sail, industrial, modern` between `iron` and `future`.
- `AGE_NAME`: `medieval: 'Medieval'`, `sail: 'Age of Sail'`, `industrial: 'Industrial'`, `modern: 'Modern'`
  (the short name for sail is the full name, so no bare "Sail" can appear).
- New `ageTitle(a)`: the sentence form — `'Iron Age'`, `'Medieval Age'`, `'Age of Sail'`, `'AI Future Age'`
  (an explicit `AGE_TITLE` map, not string concatenation).
- Every place that appends " Age"/" age" switches to `ageTitle`:

  | Place | Today | After |
  |---|---|---|
  | `hud.js:28` locked tile small text | `ageLabel(x) + ' age'` | `ageTitle(x)` |
  | `hud.js:62` desktop top bar | `${ageName} Age` | `ageTitle(p.age)` |
  | `hud.js:96`, `hud.js:108` notes | `'Requires ' + ageLabel(x) + ' Age'` | `'Requires ' + ageTitle(x)` |
  | `tips.js:57/62/69` subtitles | `${ageLabel(x)} Age` | `ageTitle(x)` |
  | `tips.js:73` age tip title | `Advance to ${ageLabel(next)} Age` | `Advance to ${ageTitle(next)}` |
  | `hud.js:60` phone top bar | `ageLabel(p.age)` | unchanged (short: "Medieval", "Age of Sail") |
  | `hud.js:111` Advance tile | `'Advance: ' + ageLabel(next)` | unchanged ("Advance: Age of Sail") |

- Age-up costs (cost to advance INTO the era; seconds). Iron and earlier unchanged; AI Future is raised so it stays the
  most expensive:

  | Era | Food | Wood | Gold | Stone | Time |
  |---|---|---|---|---|---|
  | Medieval | 1100 | 200 | 900 | 0 | 50 s |
  | Age of Sail | 1200 | 400 | 1000 | 100 | 55 s |
  | Industrial | 1400 | 400 | 1100 | 200 | 60 s |
  | Modern | 1600 | 0 | 1300 | 300 | 65 s |
  | AI Future (was 1200/0/1200/300, 60 s) | 1800 | 0 | 1500 | 400 | 70 s |

### 2. Units and buildings (`src/data/units.js`, `src/data/buildings.js`)
New class **`armor`** (label "Armored") for the Tank, so the class-based ancient rules don't apply to it (see §3).
Optional per-unit **`cooldown`** (ticks) overrides the class default; only the Machine Gunner (12) and the Tank (40) use it.

| Unit | Era | Class | Trained at | HP | Atk (type) | M/P armor | Range | Speed | Cost f/w/g/s | Train | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Knight | Medieval | cav | Stable | 140 | 12 melee | 3/2 | 0.9 | 2.4 | 60/0/75/0 | 30 s | |
| Crossbowman | Medieval | archer | Archery Range | 45 | 6 pierce | 0/0 | 6 | 1.7 | 40/30/20/0 | 27 s | |
| Trebuchet | Medieval | siege | Castle | 120 | 70 melee | 0/0 | 10 | 0.6 | 0/200/120/0 | 60 s | splash 1.5 |
| Musketeer | Sail | archer | Barracks | 60 | 10 pierce | 1/0 | 5 | 1.6 | 60/0/40/0 | 30 s | |
| Cannon | Sail | siege | Castle | 130 | 75 melee | 0/0 | 9 | 0.8 | 0/150/150/0 | 55 s | splash 1.3 |
| Rifleman | Industrial | archer | Barracks | 70 | 12 pierce | 1/1 | 7 | 1.7 | 70/0/50/0 | 30 s | |
| Field Artillery | Industrial | siege | Factory | 150 | 80 melee | 0/0 | 10 | 0.9 | 0/180/180/0 | 60 s | splash 1.5 |
| Machine Gunner | Modern | archer | Barracks | 90 | 5 pierce | 1/2 | 6 | 1.5 | 80/0/60/0 | 32 s | cooldown 12 ticks |
| Tank | Modern | armor | Factory | 240 | 22 melee | 4/6 | 5 | 1.8 | 150/0/150/0 | 45 s | cooldown 40 ticks |

| Building | Era | HP | Cost f/w/g/s | Size | Build | Trains | Armor M/P |
|---|---|---|---|---|---|---|---|
| Castle | Medieval | 1200 | 0/300/0/300 | 4 | 90 s | Trebuchet, Cannon | 6/10 |
| Factory | Industrial | 700 | 0/250/150/50 | 3 | 60 s | Field Artillery, Tank | 3/8 (default) |

- Barracks `trains` gains Musketeer, Rifleman, Machine Gunner (10 entries total); Stable gains Knight; Archery Range
  gains Crossbowman.
- Age-up building rule (unchanged code, new data): Medieval → Sail needs the **Castle**; Industrial → Modern needs the
  **Factory**; Iron → Medieval, Sail → Industrial and Modern → AI Future need none. B's Dock and C's Airfield will be
  `extra`, so advancing never depends on water.
- Railgun keeps the longest siege range (11 vs ≤ 10 base; with Ballistics 12 vs ≤ 11).

### 3. Class-rule decisions for the new units
| Rule | Applies to | Decision |
|---|---|---|
| Bronze/Iron Weapons (+4 atk, inf/cav) | Knight | Accept (+4 on 12). Tank is `armor`, so excluded. |
| Bronze Shields (inf) | none of the new units | — |
| Ballistics (+1 range, archer/siege) | Crossbowman, Musketeer, Rifleman, Machine Gunner, Trebuchet, Cannon, Field Artillery | Accept (gunnery is ballistics). |
| Spearman +8 vs cav | Knight | Accept (classic counter). Not the Tank. |
| Scout +5 vs inf | none of the new units | — |
| Relic carrying (all but siege) | Knight, gunners, Tank | Accept; new siege can't carry, like the Catapult. |
| Class cooldown (archer 40) | gunners | Accept, except Machine Gunner (12) and Tank (40, overriding the default 30). |

New-class plumbing for `armor`: `CLASS_LABEL` ("Armored"), icon `BY_CLASS` fallback (Tank icon), HUD tint `t-mil`,
bot `PREF.armor` list (siege and Tank first).

### 4. Death Match (`src/rounds/index.js`)
- `setup` sets both players to `age = 'iron'` and 20,000 of every resource.
- `desc`: "Start in the Iron Age with 20000 of every resource. Destroy the enemy."

### 5. Bot (`src/ai/bot.js`)
- **Generic gate rule** (only from Iron onward, so the tuned early build order is untouched): if the player owns
  fewer distinct buildings of its current era than `ageUpNeed(me.age)`, it builds the first missing one. Needs
  `ageBuildings(age)` exported from `commands.js`. This builds the Castle in Medieval and the Factory in Industrial.
- **Unit choice**: the new units are added to every `PREF` list right after the AI Future units, newest era first; within
  an era the list's counter intent decides the order (e.g. vs cavalry: Musketeer before Cannon). New `PREF.armor`.
- `SIEGE = ['railgun', 'field_artillery', 'cannon', 'trebuchet', 'catapult']`; the cap of 2 siege still counts by class.
- Age-up loop already runs to `AGES.length - 1`; nothing else changes.

### 6. Unit models (`src/render/models.js`)
- `unitModel` dispatch order: future → Tank → era siege (Trebuchet, Cannon, Field Artillery) → Catapult → cavalry
  (horse) → humanoid. This stops the Tank getting a horse and the new siege rendering as a Catapult.
- Humanoids via the existing `HUMAN` table and `limbs()` options. New weapons `crossbow`, `musket`, `rifle`, `mg`.
  New helmets `great` (closed helm), `tricorn`, `kepi`, `steel`.
- Knight: horse with a team caparison, armoured rider with lance and plume.
- New builders: `trebuchet(team)` (tall arm + counterweight, reuses the `cat` arm swing), `cannon(team, kind)` for the
  Cannon and Field Artillery (barrel on wheels; artillery gets a gun shield; barrel recoil on fire), `tank(team)` (hull,
  tracks, turret, barrel; turret recoil, slight bob while moving).
- Models stay merged and cached per type/team, like the existing ones.

### 7. Building looks per era (new `src/render/styles.js` + `buildingGeos`)
`styles.js` is pure data: `ERA_STYLE[age] = { key, wall, roof, trim, roofForm: 'gable'|'flat', detail }`.
`buildingGeos` reads it instead of the `masonry` boolean. The cache key becomes `b:type:owner:styleKey`, and two eras that
share a style share geometry.

| Eras | Style key | Look | Roof | Signature detail |
|---|---|---|---|---|
| Stone, Tool | timber | today's timber and thatch | gable | — |
| Bronze, Iron | masonry | today's plaster and terracotta | gable | — |
| Medieval | castle | grey stone, slate | gable | battlements on wall tops |
| Age of Sail | colonial | whitewash, red tile, dark timber | gable | timber trim bands |
| Industrial | brick | red brick, grey metal | gable | chimney stack |
| Modern | concrete | concrete, glass | flat | window band |
| AI Future | glass | white panels, cyan light strip | flat | glowing trim strip |

- The roof form switches through a local roof helper used by the four `b.roof` calls. The signature detail applies to
  every building except the Farm.
- New building geometry for the Castle (square keep, four corner towers, battlements, gate) and the Factory (brick hall,
  sawtooth roof, two chimneys). Both also follow the era style when their owner advances later.
- The existing age-change refresh in `view.js` already rebuilds a building when its owner's era changes.

### 8. HUD, icons and descriptions
- New hand-drawn 24×24 SVG icons for the 9 units and 2 buildings (`src/ui/icons.js`), matching the existing glyph style.
- `DESC` text for each new unit and building. Barracks, Archery Range, Stable and Government Center descriptions are
  updated to mention what they gain; each stays ≤ 200 characters (existing test).
- Tooltips list unlocks per era automatically (data-driven); they use `ageTitle`.

## Delivery order (balance before art)
1. **Data, gate, bot, Death Match, labels** — §1–5. Commit `test/era-reach.js`, a headless measurement like
   `bot-sim.js` that prints the final era per round and pairing.
2. **Measure and tune** (see the success criteria). Change data only: age costs/times first, then the Death Match wave
   timing (`dmWave`/`needTime` in `bot.js`). Record what moved in `progress.md`.
3. **Icons and descriptions** — §8.
4. **Unit models** — §6.
5. **Building styles, Castle and Factory models** — §7.
6. **Browser verification** — see Testing.

## Success criteria
1. Through the real UI, a player can advance Iron → Medieval → Age of Sail → Industrial → Modern → AI Future. The Castle
   and Factory are required where stated, and other eras need no building.
2. Each era unlocks exactly its listed units and building, and the HUD and tooltips name it correctly ("Age of Sail",
   never "Sail Age").
3. Every new unit has its own model and icon. Buildings visibly change in each new era.
4. **Bots play the new eras in Death Match** (measured with `test/era-reach.js`, 12 seeds, medium-vs-medium and
   hard-vs-hard): the median final era is at least Industrial, and at least 25% of player-games reach Modern. If either is
   missed after tuning per Delivery step 2, report the measured numbers instead of claiming success.
5. `npm test` green, `node test/bot-sim.js 12` all clean, `?autotour=1` ends with no console errors.

## Testing
- **Tests that encode the old chain and are rewritten, not regressions:**
  - `data.test` `deepEqual(AGES, …)` and `AGE_COST.future`.
  - `build.test` "iron age can advance to AI Future" becomes the full Iron → Future chain.
  - `build.test` `ageUpNeed` list `[2,2,1,0]` becomes stone…modern `[2,2,1,0,1,0,1,0]`.
  - `ui-tiles` `need('future')` comment ("iron age has no buildings") becomes Modern.
  - `rounds.test` "deathmatch setup grants 20000 each" gains the Iron start.
- **New tests:**
  - `data.test`:
    - era order;
    - age-up food and gold never decrease from Tool onward;
    - each new era has its listed units at its listed buildings;
    - the Railgun keeps the longest siege range;
    - `ageTitle` returns 'Age of Sail' and 'Iron Age'.
  - `build.test`:
    - Medieval → Sail is refused with `needs buildings` until a Castle exists;
    - Industrial → Modern is likewise refused until a Factory exists;
    - Iron → Medieval and Sail → Industrial need no building.
  - `combat.test`:
    - the Machine Gunner fires every 12 ticks;
    - the Spearman's cavalry bonus applies to the Knight and not the Tank.
  - `techs.test`:
    - Bronze Weapons raises Knight attack and not Tank attack;
    - Ballistics adds range to the Musketeer.
  - `ai.test`:
    - for each new era, a bot that owns the right buildings, with villagers and rich resources, trains at least one unit
      from that era (this catches a unit missing from `PREF`);
    - a Medieval bot builds a Castle and then advances to Age of Sail.
  - `render-models.test`:
    - existing loops cover every building in every era and every unit;
    - new: `ERA_STYLE` has an entry for every age, and the four new eras have distinct style keys.
  - `ui-tiles`:
    - existing loops cover icons and descriptions for the new ids;
    - new: no tip contains "Sail Age" or "Age of Sail Age".
- **Browser (required by CLAUDE.md):**
  - Death Match start (`?round=2&opp=medium&seed=1`) reads "Iron Age", and the Advance tile reads "Advance: Medieval".
  - Jump to each era with resources. Build a Castle and a Factory through the UI, then train each new unit. Screenshot
    the units, the buildings in each era style, the HUD labels and the tooltips.
  - Crowded panels: the Barracks (10 units) and the villager build panel (13 buildings), on desktop and on `?touch=1` at
    402×874 and 874×402.
  - `?round=2&autoplay=1&speed=8` to watch a bot climb the eras; `?autotour=1` to the end with no console errors.

## Docs
- `src/data/README.md`: an "Invented content (historical eras)" section covering the new units, buildings, costs, the
  `armor` class, the Machine Gunner/Tank cooldown overrides (amending "Reload times not reconciled") and the raised AI
  Future cost.
- `progress.md`: ledger lines per delivery step, including the measured era reach and any tuning.

## Follow-ups (not in this spec)
- **B. Naval:** a map generator change for water both players share, a Dock (Age of Sail, `extra`), boats, and water
  pathing.
- **C. Air:** an Airfield (Modern, `extra`), planes, flying movement and anti-air rules. Whether the existing Combat Drone
  becomes a true air unit is decided there.

## Risks
- Balance is invented and only bot-vs-bot measured; no human playtest.
- Death Match pacing: 5 age-ups (~300 s of research) plus a Castle and Factory compete with the bots' army; criterion 4
  may need data tuning or may be reported as missed.
- `models.js` grows by roughly 150 lines; styles move out to `styles.js` to limit it.
- Crowded Barracks and build panels on phones; checked in the browser, not by tests.
- Branching: this work lives on the local branch `claude/era-chain`, stacked on `claude/more-eras-506d76` (PR #7). It is
  pushed only after asking.
