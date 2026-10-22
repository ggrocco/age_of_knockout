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
  Two invented era units override the class default with their own `cooldown`: the Machine Gunner (12 ticks, rapid
  fire) and the Tank (40 ticks).

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
- Storage Pit: **Bronze Weapons** (+2 attack, infantry/cavalry), **Iron Weapons** (+2 more, requires
  Bronze Weapons), **Bronze Shields** (+1 melee & +1 pierce armor, infantry).
- Government Center: **Ballistics** (+1 range, archers & siege).
- Market: **Woodworking** (+25% wood gather), **Gold Mining** (+25% gold gather).

Costs are deliberately mixed across resources (not gold-only) so researching does not starve age-ups.
Effects apply once per unit (at spawn and when a tech completes for already-built units).

## Invented content (AI Future)

The **AI Future age** (the 5th age, after Iron) and the units **Combat Drone**, **Mech Walker** and
**Railgun** are invented for this game; they do not exist in the original Age of Empires I. Drones are
trained at the Archery Range, Mech Walkers at the Barracks and Railguns at the Government Center.
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
  Artillery (siege, Factory) in Industrial; Machine Gunner (ranged, Barracks) and Tank in Modern. Gunpowder infantry use
  the `archer` class (ranged, pierce damage).
- **`armor` class** (label "Armored") exists only for the Tank, so the ancient class-based rules skip it: Bronze/Iron
  Weapons (inf/cav), Bronze Shields (inf) and the Spearman's +8 vs cavalry do not apply. Ballistics (+1 range,
  archer/siege) does apply to the new gunners and siege; the Railgun keeps the longest siege range.
- **Buildings**: the **Castle** (Medieval, 1200 HP, melee/pierce armor 6/10) trains Trebuchets and Cannons and is the
  building you need to leave the Medieval Age; the **Factory** (Industrial) trains Field Artillery and Tanks and is
  needed to leave the Industrial Age. The Age of Sail and Modern Age have no gate building of their own.
- **Death Match** starts both players in the Iron Age (20000 of every resource), so it is the round where these eras
  are played.

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
