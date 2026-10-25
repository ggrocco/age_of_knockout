# Data tables

Unit **combat and cost stats** (HP, attack, range, train time, cost) are now verified against the
openage project's reverse-engineered AoE1 manual data
(`doc/reverse_engineering/unit_stats/unit_stats_aoe.csv`, "copied from the original game manual of
Age of Empires I"). Building stats, the Slinger, Spearman, age-up costs and all AI-Future content
have **no entry** in that source and remain **unverified approximations** from memory.

Ruling deviations from the spec's content list (recorded in `progress.md`):
- Farm added (food economy needs a renewable source).
- Wonder requires Bronze Age (spec's round setup starts players rich; original needs Iron).
- Catapult trains at the Government Center (no Siege Workshop in the subset).
- King exists only for Regicide (not trainable).
- Human match deadlines are a game setting: 0–120 whole minutes (default 25 in every mode/difficulty); 0 disables
  the score deadline. This replaces the fixed 20/25/40-minute human caps and is not an AoE1-derived rule. Off-screen
  bracket matches retain those finite caps; Wonder and relic countdowns keep their normal durations.
- The population ceiling rises with the age instead of AoE1's fixed 50: houses (+4) and Town Centers (+10) raise the
  cap up to `AGE_POP_LIMIT` in `ages.js` (Stone 50, Tool 65, Bronze 80, Iron 100, Medieval 120, Age of Sail 140,
  Industrial 160, Modern 180, AI Future 200). Not an AoE1 rule; the later eras have no AoE1 counterpart.
- A villager pulled off gathering or another build to construct something goes back to that job when it is done
  (unfinished buildings newest first, then its resource); AoE1 builders go idle after anything but a Farm. A finished
  Farm or Mine is still worked by its builder, after any unfinished buildings in the chain.
- **Repair** (`REPAIR_COST`, `repairCost` in `buildings.js`; `doRepair` in `src/sim/orders.js`, `repairBuilding` in
  `src/sim/game.js`): villagers put a finished building's lost HP back at the speed they would build it (one villager
  restores full HP in the build time, crews scale like construction), paying half the build cost for full HP, bit by bit
  and in proportion to the HP restored. When a resource the building costs runs out, the repair stops there. Rate and
  cost are invented (AoE2-style) and not checked against AoE1. Any finished building can be repaired except Farms and
  Mines, which right-click gathers instead (the `repair` command itself accepts them).
- **Damage slows production** (`workSpeed`, `DAMAGED_MIN_SPEED` in `buildings.js`): a damaged building trains and
  researches at `hp / maxHp` of its normal speed, never below 25%, back to full once repaired. Invented; AoE1 has no
  such rule. Repairing, Farm/Mine gathering, tower fire and the player-wide age-up are not slowed.
- The Wonder does not count toward the age-up building requirement (flagged `extra`, like the Farm): it is a
  victory building, so leaving Bronze needs only the Government Center.

## Deviations from the verified AoE1 unit stats

The stat pass kept the game's own age placements and a few balance choices rather than copying AoE1
exactly:
- **Unit age placements kept.** AoE1's manual puts e.g. the Horse Archer in Age IV (Iron); this game
  keeps it in Bronze, and keeps the Swordsman line in Iron and the Hoplite in Bronze. Only the
  combat/cost numbers were reconciled, not the tech-tree tier.
- **`swordsman` uses AoE1 *Legion* stats (160 HP / 13 atk).** The bronze Hoplite is authentically
  elite (120/17), so the iron unit was mapped to the top of the swordsman line (Legion) to stay
  relevant — tankier where the Hoplite hits harder — instead of becoming a downgrade.
- **Catapult range (9) kept as the one deviation.** AoE1's manual gives range 12; it stays 9 so the
  invented future **Railgun** (range 11) still out-ranges it. Attack (50 → 60) and cost (→ 180 wood /
  80 gold) were corrected to the manual values.
- **Swordsman cost kept at 60 food / 40 gold.** It uses AoE1 Legion's HP/attack/train time, but
  Legion's own cost (35 food / 15 gold) assumes the full AoE1 upgrade investment; the higher cost is
  kept so a 160-HP unit isn't dirt cheap before techs exist.
- **Spearman and Slinger are not AoE1 units** (no manual entry); left at their from-memory values.
- **Unit sight** largely kept at the from-memory values rather than AoE1 LOS, to avoid destabilising
  vision/aggro; only Scout (10 → 8) and the ranged units were nudged toward their LOS.
- **Reload times not reconciled.** The sim uses per-class attack cooldowns (archer 40 / siege 80 /
  other 30 ticks), not AoE1's per-unit reload times (e.g. Bowman 1.4 s = 28 ticks, Scout 0.9 s = 18,
  Catapult 5 s = 100). Kept class-based to preserve the cooldown model and its test; a known fidelity gap.
  Three invented era units override the class default with their own `cooldown`: the Machine Gunner (12 ticks, rapid
  fire), the Armored Train (20 ticks) and the Tank (40 ticks).

## Combat model (melee/pierce armor + attack type)

Units now carry `atkType` (`melee`/`pierce`), `marmor` (melee armor) and `parmor` (pierce armor)
instead of a single `armor`, matching the openage AoE1 damage model
(`doc/reverse_engineering/game_mechanics/damage.md`). Values come from the CSV's `Att. Type`,
`M. Arm` and `P. Arm` columns (e.g. Hoplite melee armor 5, Horse Archer pierce armor 2, and AoE1 siege
`Att. Type = M`, so Catapult deals *melee* damage). Damage is
`max(1, max(0, atk − matchingArmor) + bonusVsClass)`.

Deviations / designed choices (not 1:1 from the manual):
- **Buildings carry melee armor 3 / pierce armor 8**, replacing the old flat "buildings take 0.5×
  from non-siege" rule. Effect: archers (pierce) barely scratch buildings; melee and siege damage
  them normally. The uniform value is a game simplification (AoE1 varies armor per building/tower).
- **Spearman gets +8 attack vs cavalry.** The Spearman is not an AoE1 unit, so this anti-cavalry
  bonus is a game-design choice (it gives the game's own counter unit a role), recorded here.
- **Scout gets +5 attack vs infantry.** Sourced from AoE1's Cavalry line, whose manual entry reads
  "+5 attack vs. infantry" (the Scout is this game's only `cav`-class melee unit).
- The invented Future units get designed armor split values (Mech 5/3, Drone 0/1, Railgun 0/0) and
  attack types (Railgun = pierce), with no AoE1 source.

## Technologies (`techs.js`)

Researchable upgrades were added so the Market and Government Center (which previously only counted
toward age-up) have a purpose. The *mechanic* — research at a building, apply a global effect — is the
AoE1 model; the military tech names echo AoE1's Storage Pit / Government Center tiers. **openage's docs
do not contain a clean AoE1 tech tree**, so the specific costs, research times and placements are
game-tuned designed approximations, not sourced values:
- Storage Pit, at least one per era (weapons and armor for that era's units):
  - Stone: **Hide Armor** (+1 pierce armor, infantry and ranged foot units; echoes AoE1's Leather Armor).
  - Tool: **Bronze Weapons** (+2 attack, infantry/cavalry), **Bronze Shields** (+1 melee & +1 pierce armor,
    infantry).
  - Bronze: **Iron Weapons** (+2 more, requires Bronze Weapons), **Scale Barding** (+1 melee & +1 pierce armor,
    cavalry; echoes AoE1's Scale Armor for cavalry).
  - Iron: **Steel Weapons** (+2 more, requires Iron Weapons).
  - Medieval: **Plate Armor** (+2 melee & +1 pierce armor, infantry/cavalry).
  - Age of Sail: **Paper Cartridges** (+1 attack, ranged foot units: the `archer` class, which also holds
    Musketeers, Riflemen, Machine Gunners and Drones).
  - Industrial: **Rifled Barrels** (+1 more, requires Paper Cartridges).
  - Modern: **Composite Armor** (+2 melee & +2 pierce armor, Tanks).
  - AI Future: **Nanoweave Plating** (+1 melee & +2 pierce armor, infantry, cavalry, ranged foot units and Tanks).

  Steel Weapons onwards have no AoE1 counterpart: invented. Siege is never upgraded at the Storage Pit.
- Government Center: **Ballistics** (+1 range, archers & siege).
- Market: **Woodworking** (+25% wood gather), **Gold Mining** (+25% gold gather).

Costs are deliberately mixed across resources (not gold-only) so researching does not starve age-ups.
Effects apply once per unit (at spawn and when a tech completes for already-built units).

## Invented content (AI Future)

The **AI Future age** (the 5th age, after Iron) and the units **Combat Drone**, **Mech Walker** and
**Railgun** are invented for this game; they do not exist in the original Age of Empires I. Drones are
trained at the Airfield (a Modern Age building; the Archery Range until 2026-10-24), Mech Walkers at the Barracks and Railguns at the Government Center.
Their costs and stats are guesses like the rest of the table, as is the age-up cost (1200 food,
1200 gold, 300 stone, 60 s).

## Invented content (historical eras)

Four eras sit between Iron and AI Future: **Medieval Age, Age of Sail, Industrial Age, Modern Age**
(`ages.js`; the sail era is titled "Age of Sail", never "Sail Age"). Like AI Future they are not part of Age of
Empires I, and every number below is an invented, game-tuned approximation (spec:
`docs/superpowers/specs/2026-10-19-era-chain-design.md`).

- **Age-up costs** escalate from Iron: Medieval 1100 food / 200 wood / 900 gold (50 s), Age of Sail 1200/400/1000/100
  stone (55 s), Industrial 1400/400/1100/200 (60 s), Modern 1600/0/1300/300 (65 s). **AI Future was raised** from
  1200 food / 1200 gold / 300 stone (60 s) to 1800/1500/400 (70 s) so it stays the most expensive.
- **Units**: Knight (cavalry, Stable), Crossbowman (ranged, Archery Range), Trebuchet (siege, Castle) in Medieval;
  Musketeer (ranged, Barracks) and Cannon (siege, Castle) in the Age of Sail; Rifleman (ranged, Barracks) and Field
  Artillery (siege, Factory) and the Armored Train (armored, Railway Station) in Industrial; Machine Gunner (ranged, Barracks) and Tank in Modern. Gunpowder infantry use
  the `archer` class (ranged, pierce damage).
- **`armor` class** (label "Armored") holds only the Tank and the Armored Train, so the ancient class-based rules skip it: Bronze/Iron
  Weapons (inf/cav), Bronze Shields (inf) and the Spearman's +8 vs cavalry do not apply. Ballistics (+1 range,
  archer/siege) does apply to the new gunners and siege; the Railgun keeps the longest siege range.
- **Buildings**: the **Castle** (Medieval, 1200 HP, melee/pierce armor 6/10) trains Trebuchets and Cannons and is the
  building you need to leave the Medieval Age; the **Factory** (Industrial) trains Field Artillery and Tanks and is
  needed to leave the Industrial Age.

## Invented content (gate buildings)

AoE1 asks for two buildings of your current age to advance, but this game's tables gave Bronze, Medieval and Industrial
one each and Iron, Age of Sail and Modern none, so from Bronze on most age-ups had little or nothing to build. Nine
buildings were added so that every age but AI Future has exactly two of its own, and `ageUpNeed` is now 2 for every age
(`ageBuildings` in `sim/commands.js`; the Wonder, Farm, Mine, Tower and Wall still never count). All are invented,
game-tuned guesses; only the Temple, Academy and Siege Workshop exist in AoE1, where they are Bronze Age buildings (the
Academy trains Hoplites and the Siege Workshop siege there; here they train nothing).

| Age | Building | Cost (wood/gold/stone) | HP | Build | Upgrade (cost food/wood/gold, time) |
| --- | --- | --- | --- | --- | --- |
| Bronze | Temple | 150/0/50 | 400 | 45 s | Sacred Harvest: food gathering x1.2 (0/120/80, 40 s) |
| Iron | Academy | 175/50/0 | 450 | 50 s | Phalanx Drill: infantry +20 HP (120/0/80, 45 s) |
| Iron | Siege Workshop | 200/0/50 | 450 | 50 s | Torsion Engines: siege +10 attack (0/150/120, 50 s) |
| Medieval | University | 200/100/50 | 600 | 55 s | Masonry: stone gathering x1.25 (100/100/0, 40 s) |
| Age of Sail | Arsenal | 200/50/100 | 600 | 55 s | Bayonets: `archer` class +2 melee armor (150/0/120, 50 s) |
| Age of Sail | Trading Company | 250/100/0 | 500 | 55 s | Colonial Trade: gold gathering x1.2 (200/150/0, 45 s) |
| Industrial | Railway Station | 250/100/100 | 700 | 60 s | Railways: every unit's speed x1.1 (200/0/200, 55 s); trains the Armored Train |
| Modern | Power Plant | 200/150/150 | 800 | 60 s | Electrification: all gathering x1.1 (250/0/200, 55 s) |
| Modern | Airfield | 250/200/100 | 800 | 65 s | Air Support: `armor` and `siege` classes +30 HP (200/0/250, 60 s) |

Two new tech effect shapes support them: `hp` (adds to a unit's max HP and current HP) and `speedMul` (multiplies its
speed). Death Match still starts in the Iron Age, so both players now build an Academy and a Siege Workshop before
their first age-up.
- **Death Match** starts both players in the Iron Age (20000 of every resource), so it is the round where these eras
  are played.

## Invented content (Armored Train)

The **Armored Train** (Industrial Age, trained at the Railway Station) is invented; AoE1 has nothing like it. It is an
`armor`-class unit, so Composite Armor, Air Support and Nanoweave Plating reach it and the old infantry/cavalry weapon
and armor upgrades and the Spearman's bonus do not. Stats: 220 HP, 8 pierce attack every 20 ticks (8 damage per
second), range 6, armor 3 melee / 4 pierce, speed 1.3, sight 8, cost 120 food / 80 wood / 120 gold, 45 s. It arrives
an Age before the Tank and is weaker than it (Tank: 240 HP, 11 damage per second, 4/6 armor, speed 1.8) but fires
more often, so it suits clearing infantry. There are no rails: it drives over open ground like any other unit. Its
look follows the owner's era: a steam locomotive in Industrial, an olive-drab diesel in Modern, a hovering maglev in
AI Future.

## Invented content (defences)

The **Tower** and the **Wall** (`defences.js`, entries in `buildings.js`) are invented for this game; AoE1's own
towers and walls are not modelled and nothing here comes from the openage data. Every number is a game-tuned guess.

- **Era scaling.** `addBuilding` gives a new defence the stats of its owner's era (`defenceStats(type, owner age)`).
  When the owner advances, `refreshDefences` (`src/sim/defence.js`) upgrades every existing tower and wall of theirs in place:
  same HP fraction against the new `maxHp`, a tower takes the new attack fields, and an unfinished one keeps its build
  `progress` and finishes at the new `maxHp`. Ages before Tool (only reachable by
  calling `addBuilding` directly, since the `build` command needs the Tool Age) use the Tool row.
- **Tower**: 40 wood + 120 stone, 2x2, build time 40 s, sight 10, Tool Age. Armor is the default building 3 melee / 8 pierce.
  Sight 10 (not 8) so the range-9 Modern and AI Future towers can see, and so shoot, to their full range in every
  direction: vision is centred on `floor(centre)`, half a tile off the middle of the 2x2.
  The attack stats are copied onto the building entity (`atk`, `atkType`, `range`, `cooldown`, `splash` (0 when none),
  `bonus: null`, `cd: 0`) under the same names a unit uses, so the shooting code can reuse the unit damage helpers.

  | Era | HP | Attack | Range | Cooldown (ticks) | Splash |
  |---|---|---|---|---|---|
  | Tool | 125 | 3 pierce | 5 | 40 | none |
  | Bronze | 160 | 4 pierce | 6 | 40 | none |
  | Iron | 220 | 7 pierce | 7 | 40 | none |
  | Medieval | 280 | 9 pierce | 7 | 40 | none |
  | Age of Sail | 340 | 16 melee | 8 | 60 | 0.8 |
  | Industrial | 380 | 4 pierce | 7 | 12 | none |
  | Modern | 440 | 26 melee | 9 | 50 | 1.0 |
  | AI Future | 500 | 18 pierce | 9 | 20 | none |

- **Wall**: 5 stone per 1x1 segment, build time 6 s, sight 2, Tool Age, armor 4 melee / 10 pierce (arrows barely scratch it;
  melee and siege do the work). No gates. HP by era: Tool 120, Bronze 200, Iron 300, Medieval 400, Age of Sail 450,
  Industrial 500, Modern 650, AI Future 800.
  Placed as a line (`wall` command, from `lineTiles`: up to 64 tiles, snapped horizontal, vertical or diagonal): every free
  tile is paid for and placed in order, tiles you cannot build on (a tree, a building, another foundation, water, fog) are
  skipped without charge, and the line stops at the first segment you cannot pay for. An unfinished segment (foundation) does not block movement, it only
  reserves its tile; a finished one does, and a unit standing on it is moved to the nearest free tile.
- **`extra: true`** on both (like the Farm and Wonder): neither counts toward the age-up building requirement.
- **Elimination and score.** Neither trains units, so neither keeps a side alive (`isEliminated` ignores them). A finished Tower
  adds to the building score like any building; Wall segments do not, so spamming walls cannot win a time-cap tiebreak.
- The `hp` on the `BUILDINGS` entries is the Tool-era value (the build menu and tooltip still show it); the entity's `maxHp` is
  the era value above.

## Invented content (Farm eras)

AoE1's Farm holds a fixed amount (its Domestication / Plow / Irrigation techs add food per farm; not checked against the
openage data, and none of them is modelled). Here the Farm instead scales with its owner's era, like the Tower; every
number is a game-tuned guess (`FARM` in `farms.js`).

- `addBuilding` gives a new Farm its owner's era `amount` and sets `maxAmount` to it. When the owner advances,
  `refreshFarms` (`src/sim/game.js`) grows every Farm of theirs to the new capacity, keeping the fraction of food left
  (`amount / maxAmount`); an unfinished Farm is full, so it starts full.
- `rate` multiplies the food gather rate of a villager working a Farm (`orders.js`), read from the owner's era at gather
  time, so it needs no refresh. It stacks with `gatherMult` and `workRate`. Berries and Mines are not affected, and the
  carry load (10) is unchanged, so a faster Farm shortens the work part of each trip, not the walk.
- The Stone row is the Farm's old fixed 400 food at normal speed, so the Stone Age economy is unchanged.

  | Era | Food held | Work speed |
  |---|---|---|
  | Stone | 400 | 1x |
  | Tool | 500 | 1.1x |
  | Bronze | 600 | 1.2x |
  | Iron | 750 | 1.3x |
  | Medieval | 900 | 1.4x |
  | Age of Sail | 1050 | 1.55x |
  | Industrial | 1250 | 1.75x |
  | Modern | 1500 | 2x |
  | AI Future | 1800 | 2.4x |

## Invented content (ore patches and the Mine)

AoE1 has no Mines, no rocky ground and no resource respawn; all of this is invented for this game and every number is an
untuned placeholder. Nothing here comes from the openage data.

- **Ore patches** (`map.js`, `ore.js`): map tiles 2 (gold vein) and 3 (quarry), placed with their 180-degree mirror or not
  at all. Per map: one 4x3 gold patch 12-16 tiles from each start (reserve 1500), plus mid-map patches 20-34 tiles from
  the first start (two 5x4 gold, reserve 3000, and one 5x4 stone, reserve 2500), each ringed by 5 richer loose piles
  (1200 gold / 900 stone). Tile values are fixed (2 gold vein, 3 quarry); only patch ids come from a counter
  (`game.nextPatchId`), so a patch id is never reused.
- **Mine** (`buildings.js`): Tool Age, 100 wood + 50 stone, 2x2, build time 30 s, 150 HP, sight 3, `extra: true` (does not
  count toward an age-up), `ore: true` (it can only be placed on a patch tile of any kind). `gatherType` and `amount` are
  copied from the patch the Mine stands on, not the building table. Villagers gather from it like a Farm, but every Mine
  on a patch shares that patch's `reserve` (`drawFrom` in `ore.js`).
- **Exhaustion**: when a reserve reaches 0 every Mine and foundation on the patch is removed (a foundation is lost with no
  refund), its tiles revert to land, and a new mirrored pair of that kind spawns, each new patch holding
  `floor(startReserve / 3)` of the drained patch's starting reserve (the pair holds 2/3 of it, so the map thins out):
  home gold 1500 -> 500 -> none, mid gold 3000 -> 1000 -> none, quarry 2500 -> 833 -> none. No respawn when that third
  is under `RESPAWN_MIN` (400), and none past the kind's cap, `PATCH_CAP` = 8 gold and 4 stone patches alive (per kind,
  so gold can't crowd out the quarries).
- **Pile respawn** (`ore.js`): every 30 s, if a kind's loose piles hold under 25% of its starting total and 120 s have
  passed since the last respawn, a mirrored 2x2 block of piles appears on each side (800 gold / 600 stone each), more than
  13 tiles from either start and more than 8 from the map centre (the relic land bridge), never on a loose relic, and
  only where a tile beside each block is reachable on foot from a Town Center (a 4-neighbour flood through land and ore
  ground, blocked by water, resources and buildings). Respawned patches also avoid loose relics.
- **Bot** (`ai/bot.js`): digs Mines only on patches in its own half that its villagers can reach (computed once on the
  bare map), when its loose piles of that kind run out.
- **Look** (`render/arch/mine.js`): the Mine varies by era to satisfy the architecture invariants (distinct per era, team
  colour, footprint, height cap); the wheel and the cart animate while it is finished.
