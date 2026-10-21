# AGENTS.md

Guidance for coding agents (Claude Code, Codex, Cursor, etc.) working in this repository. `CLAUDE.md` imports this
file and adds only Claude-specific tooling notes; put shared guidance here so the two cannot drift.

## Commands

No build step, bundler or linter. Plain ES modules; three.js is resolved by the import map in `index.html` straight
from `node_modules`.

```
npm install
npm start                                   # node serve.js, then open http://localhost:8000/
npm test                                    # node --test test/*.test.js
node --test test/econ.test.js               # single test file
node --test --test-name-pattern="<name>" test/*.test.js   # single test
node test/bot-sim.js 12                     # bot-vs-bot termination check (12 seeds x 5 rounds)
node test/era-reach.js 12 deathmatch        # measurement, not a test: how far bots climb the eras
docker compose up -d --build                # nginx image, served on :8080
docker build --target test -t aoe-knockout-test . && docker run --rm aoe-knockout-test   # tests in Docker
```

`node test/tools/hash-buildings.js > test/fixtures/kept-buildings.json` regenerates the fixture that pins the
"kept" building looks byte for byte. Only regenerate it when you mean to change one of those looks; a failing
`arch.test.js` hash is otherwise a regression.

## URL parameters

| Param | Effect |
| --- | --- |
| `?round=1..5` | Skip the menus, start that round as a quick match |
| `&opp=relaxed\|easy\|medium\|hard` | Opponent bot for `?round=` (default `medium`) |
| `&seed=N` | Replay a map; omitted = random map and start position |
| `&speed=N` | Game speed multiplier |
| `&autoplay=1` | A bot plays your side; `&bot=easy\|medium\|hard` sets it (default `hard`) |
| `?autotour=1` | Whole tournament on autopilot, clicking through every screen |
| `?level=relaxed\|normal\|hard` | Tournament difficulty (else the saved menu pick, else Normal) |
| `?timeLimit=0..120` | Override the saved time limit in whole minutes; 0 = unlimited, default 25 |
| `?noTimeLimit=1\|0` | Legacy override: 1 = unlimited, 0 = 25 minutes; `timeLimit` takes precedence |
| `?touch=1` | Force the phone/touch layout |
| `&fps=N` | Frame cap (default 60; 30 while paused or on the result card) |
| `&quality=balanced\|high\|ultra` | Override the saved graphics preset |
| `buildings.html?team=1&scale=true` | Design page: red team, true scale |

`window.__app` exposes the live app; `window.__app.match.game` is the running sim.

Building deletion (Delete tile and Delete/Backspace shortcuts) always opens an explicit Cancel/Delete dialog on
desktop and touch. The match pauses while it is open and restores its previous pause state on close. The shared
`requestBuildingDeletion` in `src/ui/input.js` rechecks the match and target before issuing the delete command.

## Architecture

A 32-player knockout bracket of 1v1 AoE1-style RTS matches vs AI: five rounds (Standard Game, Death Match,
Regicide, Wonder Race, Capture the Relics), nine eras (Stone to AI Future), on a 96-tile map.

- `src/sim`: the game itself, **deterministic, no DOM, seeded RNG, 20 ticks/s**. `createGame` (`game.js`) owns all
  state (entities/units/buildings/resources/relics Maps, occupancy grid). The player and the bot both act only through
  `commands.js` `execute`; per-unit behaviour is in `orders.js`. Also `map.js` (180-degree symmetric map, ring starts,
  rivers), `path.js` (A*), `vision.js` (fog), `defence.js` (tower shooting, walls, breaching, re-scaling on age-up).
  Keep it DOM-free and deterministic so the headless runner and tests work.
- `src/rounds/index.js`: per-round rules. `check(game)` returns null or `{winner, reason}`; rounds have a tick cap
  plus a score tiebreak (`scoreOf`). The menu's time-limit slider sets human matches to 0–120 minutes (default 25),
  with 0 setting `capTicks: Infinity`; off-screen bracket matches keep finite mode/difficulty caps so resolution
  always terminates. `src/time-limit.js` reads the saved/URL preference and preserves the former checkbox choice.
- `src/ai/bot.js`: the bot, tiers `relaxed`/`easy`/`medium`/`hard`. It is given the enemy start location. `relaxed`
  waits 30 minutes and Bronze Age before attacking and plays at half speed via `createGame({ workRate })`. Also
  drives `?autoplay`.
- `src/tournament`: `bracket.js` (bracket, `LEVELS` = each difficulty's five-round opponent ramp) and a headless
  match runner (`sim.js`) used by tests and `test/bot-sim.js`.
- `src/render`, `src/ui`, `src/main.js`: Three.js view, HUD, desktop + touch input, tournament flow. Reads sim state;
  never mutates it except via commands.
  - Every mesh using `MODEL_MATERIAL` is drawn through one `BatchedMesh` (`render/batch.js`); the per-entity meshes
    stay in the scene graph on layer 1 as unrendered proxies that `animate()` and picking use, and blob shadows are
    one `InstancedMesh`. A new model part only needs that material to be batched.
  - Building looks: `render/arch/index.js` picks a design per (building, era). `DESIGNS` has one module per era
    (`arch/stone.js` … `arch/future.js`, built with `arch/kit.js`); `KEPT` lists older looks that stay byte-identical
    (pinned by `test/fixtures/kept-buildings.json`); anything else falls back to `arch/legacy.js` coloured by the
    era palette in `render/styles.js` (`ERA_STYLE`). `buildingStyle` in `models.js` is only that palette's key.
  - Graphics presets (Balanced/High/Ultra) live in `render/quality.js`.
- `src/gallery`: the `buildings.html` design page. `rows.js` (DOM-free, tested) builds the building × era grid from
  the data tables; `main.js` renders each cell with the game's own models under the game's light rig, so new eras and
  buildings appear on reload with no page edits.
- `src/data`: unit/building/age/tech/defence tables. Unit combat and cost stats are checked against openage's AoE1
  manual data; buildings, Slinger, Spearman, age-up costs, techs, towers/walls and all AI Future content are
  **unverified or invented approximations**. `src/data/README.md` records every deviation from AoE1.

Tests cover the sim, rounds, bot, bracket, data tables, render-model geometry, gallery rows and pure input helpers
headlessly (Node test runner). The DOM, HUD, browser event handling, shaders and visual quality have no automated tests.

## When you change X, also update Y

- New or changed URL param, control, or game rule the player sees: `README.md` and the table above.
- Import map or static assets in `index.html` / `buildings.html`: the `Dockerfile` `COPY` lines and the smoke-test
  paths in `Jenkinsfile`.
- A deliberate change to a `KEPT` building look: regenerate `test/fixtures/kept-buildings.json` (command above).
- A deviation from AoE1 (stat, rule, tech-tree placement): `src/data/README.md` and `progress.md`.
- A ruling, known gap or deferred minor issue: append it to `progress.md`.

## Testing in the browser (required)

`npm test` is headless: it checks model geometry and pure UI/input helpers, but does not exercise the browser DOM,
HUD, event handling, shaders, `src/main.js`, `styles.css` or `index.html`.
**Always verify your change in a real browser before calling it done**, not just when it is "UI work". A sim/data
change that adds or alters something the player can see or click (a unit, building, age, HUD label, round rule) also
needs a browser check that it appears and works. Run `npm test` too, but it is not a substitute.

1. Start the dev server (`npm start`, port 8000; Claude Code: see `CLAUDE.md`) and open `http://localhost:8000/?...`.
2. Screenshot the actual thing you changed, look at it, and check the console (it must be free of errors). If
   nothing on screen changed, suspect a stale module cache and hard-reload before debugging. If several checkouts or
   worktrees exist, confirm the port serves yours (e.g. `curl` a changed file and diff it).
3. In your final message, say what you verified in the browser and what you could not.

Shortcuts:

- Skip the menus: `?round=3&opp=easy&seed=1`. Fast-forward with `&speed=8`; `&autoplay=1` lets the bot play your
  side to reach later ages and bigger armies.
- Jump to state instead of playing there, from the console:
  `const p = __app.match.game.players[0]; p.age = 'future'; p.res = {food: 9999, wood: 9999, gold: 9999, stone: 9999};`
  then use the real UI (train, build, age-up button) and read the HUD.
- Phone layout: `?touch=1` at 402x874 and 874x402. Touch input needs dispatched `TouchEvent`s.
- Whole flow: `?autotour=1` should reach a champion/eliminated screen with no console errors.

## Deployment

`Dockerfile` copies only `index.html`, `buildings.html`, `styles.css`, `favicon.svg`, `src/` and the two three.js
folders the import map references (`node_modules/three/build`, `.../examples/jsm`) into nginx. Its `test` stage
(node, runs `test/`) must stay before the nginx stage, which has to remain the last (default) target.

`Jenkinsfile` builds the `test` target, runs the unit tests (JUnit to `reports/junit.xml`) and `bot-sim.js 12` in
it, then builds the nginx image and smoke-tests it from inside the container. It only needs the docker CLI on the
agent; it never pushes or deploys.

## Project docs

- `docs/superpowers/{specs,plans}`: design specs and implementation plans.
- `progress.md`: the running ledger of rulings, known gaps and deferred minor issues. Check it before assuming
  something is a bug.
- `src/data/README.md`: data sources and every deviation from AoE1.
- `docs/screenshots/`: README images (`graphics-evolution-preview.png` is an older five-age preview, no longer
  referenced). `shots/` holds early screenshots from the first build and is out of date.
