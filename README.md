# Age of Knockout

A browser RTS in the spirit of Age of Empires I (1997), played as a 32-player knockout bracket of 1v1 matches
against AI. Five rounds, each a different game type: Standard (conquest), Death Match, Regicide, Wonder Race,
Capture the Relics. Lose once and you're out.

Or play **Kingdom Conquest**, a standalone round against three AI civilizations: kill kings to capture entire empires.

**Play it in the browser: https://ggrocco.github.io/age_of_knockout/**

![A Bronze Age base in Wonder Race: mud-brick houses, towers, a Temple and a Wonder under construction, with a Dock, War Galleys and a Transport Ship in the home bay](docs/screenshots/wonder.jpg)

## Run

```
npm install
npm start                       # node serve.js, then open http://localhost:8000/
npm test                        # simulation, rounds, bot, bracket, data and render-model tests
npm run lint                    # ESLint
node test/bot-sim.js 12         # bot-vs-bot termination check, 12 seeds x 5 rounds
node test/bot-sim.js 12 medium,medium islands   # the same on island maps
node test/kingdom-sim.js 12     # four civilizations, both map settings
```

No build step: plain ES modules, with three.js loaded through the import map in `index.html`.
The development server listens on `127.0.0.1:8000` by default. Set `PORT` (or pass a port to `serve.js`) to change the
port; set `HOST` only when your preview proxy requires a different listening interface.
For hardware render measurements, start the dev server and open `http://localhost:8000/test/tools/render-audit.html?quality=high`. The diagnostic reports CPU and asynchronous GPU timings, restores your saved graphics preference, and is excluded from the nginx image.

## How a tournament works

![Main menu: the Rules panel (difficulty, map, time-limit slider) beside the Play panel (Begin Tournament, Kingdom Conquest), with five quick-match tiles below](docs/screenshots/menu.jpg)

Pick a **difficulty**, set the **Time limit** slider, and press **Begin Tournament**, or jump straight into one
game type with a **Quick match** tile. Both choices are saved in this browser. The keyboard and mouse (or touch)
controls are under **Controls** at the bottom of the menu.
The difficulty sets the opponent for each of your five rounds:

| Level | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 |
| --- | --- | --- | --- | --- | --- |
| Relaxed | relaxed | relaxed | relaxed | relaxed | relaxed |
| Normal | easy | easy | medium | medium | hard |
| Hard | medium | medium | hard | hard | hard |

Relaxed opponents work at half your speed and wait 30 minutes, and until the Bronze Age, before attacking.
Easy opponents keep a smaller army than medium and hard ones, but put their economy into reaching the next age and
quickly replace lost villagers.

![Round 1 bracket: the rules, time limit and map, you against Ramses, the other first-round pairings, and the later rounds still to play](docs/screenshots/bracket.jpg)

Before each round the bracket shows the rules, the time limit and your opponent. **Back to menu** returns to the
main menu before round 1; from round 2 on the button reads **Leave tournament** and asks to confirm, since leaving
loses your progress. The other matches in each round are
played out by bots in a background Worker so the progress screen stays responsive. If the Worker cannot run or is
stopped (a phone may suspend it), the remaining matches are played on the page instead, with the same results; if the
round still cannot be finished, **Try again** replays it without losing your result.

| Round | Game type | Goal |
| --- | --- | --- |
| 1 | Standard Game | Destroy all enemy units and buildings |
| 2 | Death Match | Start in the Iron Age with 20,000 of every resource; destroy the enemy |
| 3 | Regicide | Kill the enemy king, protect yours |
| 4 | Wonder Race | Build a Wonder (Bronze Age) and keep it standing for 3 minutes |
| 5 | Capture the Relics | Hold all 5 relics in your Town Center for 3 minutes |

**Time limits.** The slider applies to quick matches and all five of your tournament rounds, in every mode and
difficulty, including Relaxed.

| Slider value | Match time limit |
| --- | --- |
| **25** (default) | 25 minutes of game time |
| **1–120** | Choose a limit in one-minute steps, up to 2 hours |
| **0** | No time limit |

If no one wins before a finite limit, the higher score wins. Speed controls change how quickly game time passes;
pausing stops the clock, which shows elapsed / limit. The Quick buttons and bracket show your chosen limit before
you play. On desktop, hover or keyboard-focus a Quick button, a bracket round heading, or the in-game objective or
clock for a card with the mode's goal, time limit and scoring.

At **0**, the clock shows `elapsed / ∞`, and normal victory conditions, Wonder/relic countdowns and resigning still
end a match. A saved choice from the former No time limit checkbox becomes 0. Off-screen AI bracket matches keep
their finite mode/difficulty limits so the bracket always resolves.

## Kingdom Conquest

Press **Kingdom Conquest · 4 teams**, or open `?mode=kingdoms`. You play Blue against Red, Green and Yellow,
starting in Stone Age. The existing Rivers / Islands and time-limit settings apply. Difficulty selects three
relaxed, medium (Normal), or hard opponents; `&opp=easy` also works. The five-round tournament keeps its original rules.

Kill a civilization's king to inherit its surviving units, buildings, resources, explored land, territory, and production
queues, including civilizations it already conquered. The higher completed age and both sides' researched upgrades
are kept, without stacking duplicate bonuses. Damaged assets retain their health fraction. Existing armies survive
above the population limit, but new training must wait until there is room.

Your king has **250 HP**, ten times a villager, and automatically walks into the nearest reachable, completed friendly
castle. While sheltered he cannot act or take damage. Destroying or deleting the castle releases him alive with his
remaining health; he can then shelter in another castle. Inaccessible castles provide no protection, and a king aboard
a sunken transport dies, awarding his empire to the team that sank it.

Every completed building claims dry land within **eight orthogonal ground steps** of its footprint. Claims stop at
water, including shallows; the nearest building wins overlaps and equally distant opposing claims remain neutral.
The standings show territory tiles, percentage of all dry land, and each king's health/protection. Territory colors
appear on the minimap within explored land and follow fog shading.

The last surviving civilization wins. At the deadline, most territory wins; the existing game score breaks territory
ties, and an exact remaining tie is a draw. Choose **0** on the time slider for unlimited conquest. If your king falls,
choose **Spectate** to watch the remaining teams with full visibility, or **Back to menu**. Spectators cannot issue
commands. Resigning eliminates your civilization without awarding its assets to an opponent.

Four-player maps use quarter-turn symmetry and equivalent starting resources. Rivers connects all four starts by
land crossings; Islands has four home islands and a contested central island. Resource replenishment also uses
four-way groups. Blue, Red, Green and Yellow can be previewed in both the building/unit gallery and the Age Ladder.

## Playing

![Stone Age village with the Town Center selected: the HUD offers Villager, Advance: Tool and Delete](docs/screenshots/village.jpg)

You start in the Stone Age (Death Match: Iron Age) with a Town Center and a few villagers on a 112-tile map, at a random point on a ring
around the centre (the opponent mirrors you). Gather food, wood, gold and stone, build houses for population, and
**advance through nine eras**: Stone, Tool, Bronze, Iron, Medieval, Age of Sail, Industrial, Modern and AI Future.
Each era unlocks units and buildings and changes how your buildings look. To advance you need a Town Center and
**two finished buildings of your current era**, as in AoE1, and every era but the last has exactly two of its own:

| Leaving | Build both of |
| --- | --- |
| Stone | two of House, Granary, Storage Pit, Barracks |
| Tool | two of Archery Range, Stable, Market |
| Bronze | Government Center and Temple |
| Iron | Academy and Siege Workshop |
| Medieval | Castle and University |
| Age of Sail | Arsenal and Trading Company |
| Industrial | Factory and Railway Station |
| Modern | Power Plant and Airfield |

The new gate buildings each research one upgrade: Sacred Harvest (Temple, food +20%), Phalanx Drill (Academy, infantry
+20 HP), Torsion Engines (Siege Workshop, siege +10 attack), Masonry (University, stone +25%), Bayonets (Arsenal, ranged
foot units +2 melee armor), Colonial Trade (Trading Company, gold +20%), Railways (Railway Station, every unit 10% faster; the station also trains the Armored Train),
Electrification (Power Plant, all gathering +10%) and Air Support (Airfield, Tanks, Armored Trains and siege +30 HP). The Airfield also trains the Combat Drone once you reach AI Future. Farms, Mines,
Docks, Towers, Walls and the Wonder never count. Soldiers trained in an earlier era take on
the current one's look too: uniforms and weapon finish change, horses give way to motorbikes and hoverbikes, and
catapults and trebuchets become mortars and rocket batteries from the Age of Sail on. Villagers, the King and ships keep one look.
Each era also raises the population limit that houses can reach: 50 in the Stone Age, then 65, 80, 100, 120, 140, 160,
180 and 200 in AI Future (each house adds 4, the Town Center 10).
Farms grow with the eras too: a Farm holds 400 food in the Stone Age, then 500, 600, 750, 900, 1050, 1250, 1500 and
1800 in AI Future, and villagers work it faster (normal speed in Stone, up to 2.4x in AI Future). When you advance,
every Farm you already have grows to the new size and keeps its share of food left.

![Industrial Age Death Match base: brick houses with chimneys, a factory, a railway station and red-brick towers, with Frigates, a War Galley and Fishing Ships at the Dock](docs/screenshots/deathmatch.jpg)

**Towers and walls** get stronger when you advance: every existing tower and wall section re-scales to your current
era, and the tower's weapon changes with it (arrows, cannon, machine guns, beams). Draw a wall by dragging its line (on touch: tap
where it starts, tap where it ends, then press Place); an enemy army with no way round it attacks the wall to break through.
The opponent puts a short wall line in front of each of its towers, on the side facing you, so attackers walk round it
under fire or stop to break it; it never walls in its own base, and it rebuilds lost sections. It also repairs damaged
buildings, finishes foundations its builders left, and rebuilds a lost Town Center.

**Mines and rocky ground.** The map has grey rocky ground: gold veins (yellow flecks) and quarries (grey).
From the Tool Age a villager can build a **Mine** (100 wood, 50 stone) on one; only rocky ground will take it. Right-click
the finished Mine with villagers and they dig gold or stone from it, carrying it to the nearest Storage Pit or Town Center.
Every Mine on a patch draws on the patch's one shared reserve (the inspect line reads "Gold left N"). When the reserve
runs dry the Mines collapse, the ground turns back to grass, and a fresh pair of patches of that kind appears elsewhere
on the map, one for each side, each holding a third of what the emptied patch started with. The rocky ground thins out:
once that third would be under 400 no new pair appears, and at most 8 gold and 4 stone patches exist at once. Loose gold and stone piles run out too: when a kind drops below a quarter of its starting
total, new mirrored piles appear (a block for each side, away from both bases and the centre). The opponent digs Mines on
its own half of the map when its piles run low.

**Maps.** The menu's Map setting (saved, like the time limit; `?map=` overrides it) picks the map for quick matches and
the whole tournament, the bracket's other matches included:

- **Rivers** (default): the river map below, where soldiers can always walk to the enemy.
- **Islands**: each side starts on its own island, and a third island in the middle holds the relics and rich gold
  and stone. No ground joins them: build a Dock and Transport Ships to attack, fetch relics or claim the centre. Every
  home island holds enough wood, gold and stone (with Farms for food) to advance at least four Ages, to the Medieval
  Age, without leaving it.

**Water and ships.** On a river map a river runs between the two bases, from edge to edge, opening into a lake
past each ford, and each player has a home bay off it, a short walk from the Town Center. There is always a way to
attack on foot: soldiers wade the light-blue **shallows** over the centre (where the relics are) and at a ford on each
side, and only deep water stops them. From the Stone Age a villager can build a **Dock** (100 wood) on deep water
against the shore; it trains the ships, which sail the deep water and the shallows of the whole river, so the two home
fleets can meet:

| Ship | Age | Cost | Role |
| --- | --- | --- | --- |
| Fishing Ship | Stone | 75 wood | Fishes the shoals in the bays and the river, lands the catch at a Dock |
| War Galley | Bronze | 135 wood, 30 gold | Oared warship, shoots arrows |
| Transport Ship | Bronze | 150 wood | Carries 8 soldiers or villagers; unarmed |
| Frigate | Age of Sail | 200 wood, 100 gold | Cannon broadsides that splash and batter buildings by the water |
| Destroyer | Modern | 150 wood, 200 gold | Fast, armoured, long-ranged guns that splash |

A ship can hit anything within its range of the water, ships first; soldiers on the bank can only hit a ship with ranged
attacks, but a ship in the shallows can be attacked by anyone, and Towers shoot ships too. Ships alone don't keep a
beaten side in the game (a Dock does). The opponent builds a Dock in its bay, fishes from the Medieval Age, and keeps a
small fleet that answers yours and patrols to your bay during its attacks.

**Transport Ships.** Right-click your Transport Ship with soldiers or villagers selected (tap it on a phone) and they
walk to it and board; it sails to the shore nearest them if it is out at sea. With it selected, right-click the far
shore to land everyone there (they walk on to the spot you clicked), or press **Unload** to land them on the nearest
shore. Passengers are out of sight and can't be attacked, but if the ship sinks everyone aboard is lost; a relic they
carried washes up on the nearest land. A relic carrier landed at home takes the relic on to a Town Center. On an island
map the opponent ferries its attack waves to your island and sends squads to fetch the relics from the centre.

### Controls (desktop)

Left click / drag select (double-click: all of a type) · right click move / gather / build / repair / attack / fetch relic ·
WASD or arrows pan, wheel zooms · `.` or the round button above the minimap (badge = count) next idle villager or Fishing Ship, `H` Town Center · hold Space and drag
with the left mouse button to pan · Esc pauses and resumes (a Paused dialog stops everything, working villagers
included; during a building placement Esc cancels it instead) · click the minimap to jump. Select villagers to get the build menu, select a building to train units or advance the Age.

**Villagers go back to work.** Order a villager that is gathering or building to build something else and, once the
new building is done, it returns to what it was doing: the unfinished building first (several interruptions unwind
newest first), then the tree, mine, berries or farm it was working. A Farm or Mine it builds becomes its job at the end
of that chain instead, as in AoE. Move, attack or gather orders replace the whole chain.

**Repair a building:** select villagers and right-click (tap on touch) one of your finished, damaged buildings. They
put its HP back as fast as they would build it; full repair costs half the building's cost, paid as the HP goes back on,
and they stop when a resource it costs runs out. Selecting a damaged building shows what a full repair would cost.
Like a build, a repair returns the villager to the job it interrupted. A damaged building trains units and researches
at its share of full HP (a Barracks at 60% HP works at 60% speed, never below 25%); the info panel shows the slowdown,
and repairing brings it back to full speed.

**Delete a building:** select it and click **Delete**, or press **Delete / Backspace**. A confirmation dialog names
the building and pauses the match. Choose **Cancel** (or press **Esc**) to keep it, or **Delete building** to remove
it without a refund; queued training and research are lost. Closing the dialog restores your previous pause state.

**Group moves:** several units sent to one spot (right click on the ground or the minimap, or a tap on touch) spread out
around it in a block facing the way they march, one unit per tile: melee fighters in the front rows, then ranged units,
siege, and villagers at the back.

### Controls (phone / touch)

<img src="docs/screenshots/phone.jpg" alt="Phone portrait layout: compact top bar, minimap top right, round action buttons and the Town Center panel" width="260" align="right">

Tap your unit or building to select it; with a selection, tap a target to order it (ground = move, enemy = attack,
tree/mine/farm = gather, fish = fish with Fishing Ships, own Transport Ship = board, unfinished building = help build, damaged building = repair, relic = pick up). One finger drags the map, two fingers
pinch-zoom and pan.

Round buttons: next idle villager or Fishing Ship (badge = count), Town Center, box-select mode, deselect. Building placement: tap
or drag to position the ghost, then press Place. The menu button (top right) has pause, speed, resign and quit.

The **Delete** tile opens the same **Cancel / Delete building** confirmation as desktop, including for unfinished
buildings, towers and walls.

Both orientations are supported; use `?touch=1` to force the touch layout on a desktop browser. Not yet tested on a
real iPhone.

<br clear="right">

## Buildings and units by era

![buildings.html: Government Center, Temple, Dock and Wonder rendered in every era from Bronze to AI Future, with what each trains and researches](docs/screenshots/gallery.jpg)

Open `http://localhost:8000/buildings.html` to see every building in every era, rendered with the game's own
models. Under each era it lists what the building trains by then and any upgrade it can start researching in that
era, with what the upgrade does. Switch Blue/Red team and Fit/True scale; click a building to orbit it or see it under construction. The page
reads `src/data`, so new eras and buildings appear on reload.

Choose **Units**, or open `http://localhost:8000/buildings.html?view=units`, to compare villagers, fighters,
cavalry, siege engines and ships across all nine eras. Each row shows the same unit in its owner's era from its
unlock onward, with training location and base stats. Blue/Red and Fit/True scale also work for units.
Click a unit to orbit it and preview walking/sailing, attacks, or a villager chopping wood. The King retains its
royal appearance. The Age Ladder's **Unit Evolution** link opens this view.

## Age Ladder

![ages.html: the Stone to Medieval Ages with the buildings (the Dock among them) and units each one brings](docs/screenshots/age-ladder.jpg)

[Open the Age Ladder](https://ggrocco.github.io/age_of_knockout/ages.html) (or `http://localhost:8000/ages.html`) to see
every Age side by side: the buildings and units it brings, rendered with the game's own models; which buildings you
need to leave it and what advancing costs; its upgrades; and what grows by itself on arrival (population limit, Farms,
Towers, Walls). Tap a building, unit or upgrade to trace everything its building trains and researches across the Ages.
Below the map, a chart prices each age-up (research plus the cheapest gate buildings) and a list shows where the
ladder trips players, checked against the data on every load. Like the buildings page, it reads `src/data`, so changes
show up on reload.

## How it's built

```mermaid
flowchart LR
  subgraph Browser
    input["src/ui input<br/>(mouse, keys, touch)"]
    view["src/render<br/>Three.js view"]
    hud["src/ui HUD"]
  end
  bot["src/ai/bot.js"]
  cmds["src/sim/commands.js<br/>execute()"]
  sim["src/sim game.js<br/>deterministic · seeded RNG · 20 ticks/s"]
  rounds["src/rounds<br/>win checks · time caps"]
  data[("src/data<br/>units · buildings · ages · techs · defences")]
  tour["src/tournament<br/>bracket + headless runner"]

  input --> cmds
  bot --> cmds
  cmds --> sim
  data --> sim
  sim --> rounds
  sim -. reads state .-> view
  sim -. reads state .-> hud
  tour --> sim
```

The player and the bot change the game only through `commands.js`. The simulation in `src/sim` has no DOM and a
seeded RNG, so the same match runs headlessly in tests, in `test/bot-sim.js` and for the other bracket matches. The renderer and HUD only read its state.

- `src/sim`: game state, unit orders, A* pathfinding, fog of war, towers and walls, map generation.
- `src/rounds`: the five game types, their win checks, time caps and score tiebreak.
- `src/ai`: the bot (relaxed / easy / medium / hard); it also plays your side with `&autoplay=1`.
- `src/tournament`: the 32-player bracket and headless match runner.
- `src/render`, `src/ui`, `src/main.js`: Three.js view, per-era building designs (`src/render/arch`), HUD, input
  and tournament flow.
- `src/data`: unit, building, age, tech and defence tables. Unit combat and cost stats are checked against
  openage's AoE1 manual data; buildings, age-up costs, techs, towers/walls and AI Future content are approximations
  or invented. See `src/data/README.md` for every deviation from AoE1.

## Rendering

The Three.js view uses warm directional lighting, filtered shadows, sky reflections, textured wood/stone/metal,
wind-blown grass, and reflective water with animated normals and shoreline foam. High and Ultra add ambient
occlusion for depth around buildings, foliage and units. Every era has its own building designs, from hide tents and
thatch through mud brick, terracotta tile, castles, colonial whitewash, industrial brick and modern concrete to AI Future
glass. Units have articulated equipment, including separate drone, mech and railgun models for AI Future, and fighters
from earlier eras are redrawn in their owner's current era. These are
original procedural models (no image or model files), not Age of Empires assets.

Choose **Settings → Graphics quality** on desktop, or open the top-right menu on a phone. Changes apply without
restarting the match and are saved in this browser. The default is **High**; try High on an iPhone 17 Pro and Ultra
on an M2 Max, then adjust for frame rate and battery use. These are starting recommendations, not measured
performance guarantees on those devices. Use `&quality=balanced|high|ultra` to override the saved preference.

| Preset | Maximum pixel ratio / rendered pixels | Shadow map | Ambient occlusion | Bloom | Grass clumps |
| --- | --- | --- | --- | --- | --- |
| Balanced | 1.5 / 2 million | 1024 | Off | Off | 2,500 |
| High | 2 / 4 million | 2048 | Half resolution, 12 samples | Off | 8,000 |
| Ultra | 2.5 / 8 million | 4096 | Three-quarter resolution, 24 samples | Three-eighths resolution | 14,000 |

Lights glow: fire and braziers, lamp lenses, muzzle flashes and the AI Future's cyan and magenta neon give off their
own light, so they stay bright in shadow. On Ultra a bloom pass adds a halo around them (sun glints on gold and
chrome can sparkle a little too); it costs about 3 ms a frame on an M2 Max, so Balanced and High keep the lights a
little brighter without the halo.

No extra assets, network downloads, or build step are needed. Geometry is shared between models, every model is
drawn through one batched mesh, and grass is instanced. Decorative grass respects fog and building/resource
footprints. Float render-target support is checked before enabling sky reflections and ambient occlusion; direct
rendering remains available. `test/render-models.test.js` checks every unit and building era for valid geometry and
animation transforms, and `test/graphics-quality.test.js` covers preference handling, pixel budgets and the
rendering fallback. Shaders, picking, lighting and visual quality are checked in a browser.

Static model and contact-shadow transforms stay on the GPU until they change. Building flags, machinery, smoke and drone rotors use vertex-shader animation; terrain textures are baked on the GPU at match start and repainted there when ore patches change. Paused and result screens redraw at 10 FPS, while camera and selection changes remain responsive. Pausing freezes the animation clock. The simulation remains deterministic JavaScript at 20 ticks per second.

## URL parameters

| Param | Effect |
| --- | --- |
| `?mode=kingdoms` | Start standalone four-team Kingdom Conquest; `opp` sets all three opponents |
| `?round=1..5` | Start that round as a quick match, skipping the menus |
| `&opp=relaxed\|easy\|medium\|hard` | Opponent for `?round=` (default `medium`) |
| `&seed=N` | Replay a map; without it every match gets a fresh map and start position |
| `?map=rivers\|islands` | Map type, overriding the saved menu pick (default Rivers) |
| `&speed=N` | Game speed multiplier |
| `&autoplay=1` | A bot plays your side; `&bot=easy\|medium\|hard` sets its difficulty (default `hard`) |
| `?autotour=1` | Whole tournament on autopilot |
| `?level=relaxed\|normal\|hard` | Tournament difficulty, overriding the saved menu pick |
| `?timeLimit=0..120` | Override the saved time limit in whole minutes; 0 = unlimited, default 25 |
| `?noTimeLimit=1\|0` | Legacy override: 1 = unlimited, 0 = 25 minutes; `timeLimit` takes precedence |
| `?touch=1` | Force the touch layout |
| `&fps=N` | Frame cap (default 60; redraws at 10 FPS while paused or on the result card, with immediate camera/selection updates) |
| `&quality=balanced\|high\|ultra` | Graphics preset |

`window.__app` exposes the live game for debugging. Try `?round=1&seed=1` for the starting village,
`?round=2&seed=3&autoplay=1&speed=8` to watch two bots race through the eras, and `?round=3&seed=1&touch=1` for the
phone layout.

For a custom deadline, use `?round=1&timeLimit=60` for a one-hour quick match or `?round=1&timeLimit=0` for no limit.
For four-team play, try `?mode=kingdoms&seed=3`, or add `&map=islands&autoplay=1` to watch four bots.

## Deploy (Docker)

```
docker compose up -d --build     # nginx image on http://localhost:8080/ (AOE_PORT=9000 to change)
```

The image is static files only (`index.html`, `buildings.html`, `ages.html`, `styles.css`, `favicon.svg`, `src/`, the two
three.js folders the import map uses) behind nginx, with a healthcheck. Plain `docker build -t aoe-knockout .`
builds the same image.

## Deploy (GitHub Pages)

`.github/workflows/pages.yml` publishes the game to https://ggrocco.github.io/age_of_knockout/ on every push to `main` (or
by hand from the Actions tab). It runs `npm test`, assembles the same files as the nginx image and deploys them with
GitHub's Pages actions. One-time setup: **Settings > Pages > Source: GitHub Actions** (the repository must be public,
or on a plan that allows Pages for private repositories). Pages caches files for 10 minutes, so the workflow serves
`styles.css` and `src/` from `v/<content hash>/`, as the Docker image does; a new deploy reaches players within
about 10 minutes and never mixes old and new modules.

## CI (GitHub Actions)

`.github/workflows/ci.yml` runs on every pull request and every push to `main`:

- **Tests**: `npm test` and the `test/bot-sim.js 12` bot-vs-bot check.
- **Lint**: `npm run lint` (ESLint, `eslint.config.js`).
- **Security**: `npm audit` (fails on moderate or worse) and `npm audit signatures`; on pull requests, GitHub's
  dependency review blocks newly added vulnerable dependencies.

`.github/workflows/codeql.yml` runs CodeQL security analysis on the JavaScript and the workflow files on the same
events and once a week; findings show under **Security > Code scanning**.

## CI (Jenkins)

`Jenkinsfile` runs the unit tests (JUnit report), `test/bot-sim.js 12`, then builds the nginx image and smoke-tests
it (page, CSS, JS and both three.js import-map paths served with the right content type). Everything runs in Docker,
so the agent needs only the docker CLI with a reachable daemon (e.g. Jenkins in a container with
`/var/run/docker.sock` mounted and the docker CLI installed) and the JUnit plugin. Nothing is pushed or deployed.
Same tests without Jenkins:

```
docker build --target test -t aoe-knockout-test . && docker run --rm aoe-knockout-test
```

## Contributing

Issues, ideas and pull requests are welcome and much appreciated! Age of Knockout is a one-person project made just
for fun, so please expect slow replies and reviews. Contributor and agent notes are in `AGENTS.md`.

## Status

Rules, AI and bracket are covered by headless tests and bot-vs-bot runs; the renderer and UI were checked with
browser screenshots and scripted events. Feel, balance and fidelity to the original have not been judged by a human
player. `progress.md` records rulings, known gaps and deferred issues; design specs and plans are in
`docs/superpowers/`. Contributor and agent notes are in `AGENTS.md`.

Villagers and ships update their appearance when their owner advances: civilian workwear and safety gear, sailing craft, powered vessels and AI Future hulls. Their roles and stats stay the same. Fishing Ships are the first boats available; transports and warships follow in Bronze.
