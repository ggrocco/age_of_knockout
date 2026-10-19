# Era Architecture and Defences — Design

Date: 2026-10-19
Builds on: the era chain (PR #11, `claude/era-chain`). Prototype: local branch `spike/era-architecture` (throwaway).

## Intent

The user says the buildings look too alike from one age to the next. Stone and Tool look the same, Bronze and Iron the
same, and Modern and AI Future nearly the same. Industrial should already feel different because it has machines,
Modern should look like today, and AI Future should be "crazy". They also miss the towers, walls and other defences
of the original Age of Empires.

A throwaway prototype gave the Town Center and House their own shape in each era: a hut, a ziggurat, a keep, a
Georgian hall, a smoking brick works, a glass tower, and a spire with orbiting neon rings. The user liked it and asked
for the same concept on every building. They also asked for towers and walls to be designed in the same pass, so they
match the eras from the start.

Success means that, in the buildings gallery or a match, you can tell the era at a glance from a building's shape. You
can tell what the building is for in every era. And defences work like the original: towers shoot, walls block, and
neither lets a player stall a match.

## Goals

1. **Every building has its own silhouette per era**, following the prototype's concept, not only a new palette.
   - Tool and Iron keep today's timber and masonry looks.
   - Every other era where the building exists gets a new design.
2. **Each building stays readable in every era**: a barracks looks military, a market looks like trade.
3. **Animated era signatures** where the era calls for them:
   - Industrial: smoke, turning gears.
   - AI Future: floating parts, spinning rings, hovering drones.
4. **Two new defensive buildings**, a **Tower** and a **Wall**, with era looks and the gameplay rules below.
5. **The bot uses towers and breaks through walls**, so walling in cannot stall a match until the time cap.

## Non-goals

- Boats, docks and water (sub-project B), and planes and anti-air (sub-project C), all still pending.
- Gates in walls. The original had none; you leave a gap.
- Tower or wall technologies. Upgrades happen automatically with the era.
- Changing any other unit, building stat or round rule.
- Downloaded or AI-generated art. Everything stays procedural, in the existing low-poly vertex-coloured style.

## Anti-goals (would be a failure even if it technically works)

- Eras that are still told apart only by colour.
- A building whose job you can't recognise (e.g. a Modern stable that reads as a house).
- Walls that let a player wall themselves in and win on the time cap.
- Late-era buildings so tall they hide the units fighting behind them.
- A visible frame-rate drop in a busy match.
- Breaking the deterministic sim.

## Constraints

- Building footprints (`size`) and hit areas stay exactly as they are. Pathing and placement must not change for
  existing buildings.
- Models stay merged and cached per building, team and era. They draw through the existing batched renderer from
  PR #10, so this must keep working with it.
- Animated parts follow the existing proxy pattern: separate meshes on the model material, hidden while under
  construction.
- `src/sim` stays DOM-free and deterministic. Towers and walls are sim entities like any building.
- Everything must work on the phone layout (portrait and landscape) and on desktop.

## What was decided

| Decision | Who |
|---|---|
| Same concept as the prototype on every building | user |
| Towers and walls designed in this pass | user |
| Tower and wall rules as below (shoot nearest in range; walls block everyone, no gates; tougher each era; bot builds towers and breaks through walls) | user, accepting my proposal |
| Tool and Iron keep today's looks | user, by liking the prototype |
| Per-building, per-era designs in the table below | my call; the builder may refine the details as long as the era signature and the building's job stay readable |
| Stats and costs for towers and walls | my call; invented, recorded in `src/data/README.md` |

## Building looks per era

A building shows one design per era from its unlock era onward. In earlier eras (gallery, debug) it shows its
unlock-era design. "Today" means the current timber (Tool) or masonry (Iron) model.

| Building | Stone | Bronze | Medieval | Age of Sail | Industrial | Modern | AI Future |
|---|---|---|---|---|---|---|---|
| Town Center | round thatched hut, totem, fire pit (prototype) | stepped mud-brick ziggurat with shrine (prototype) | stone hall with spired keep tower (prototype) | white town hall, cupola, clock (prototype) | brick works, smokestacks, turning gear, water tower (prototype) | glass office tower, helipad (prototype) | chrome spire, orbiting neon rings, floating plates (prototype) |
| House | hide tent (prototype) | mud-brick, roof terrace, outside stair (prototype) | half-timbered, slate (prototype) | Georgian brick, chimneys (prototype) | brick row house, fire escape, smoking chimney (prototype) | white cube house, solar panels (prototype) | pod on a stalk, neon ring, drone (prototype) |
| Granary | raised storage huts on stilts | domed mud-brick silos | timber tithe barn | brick warehouse with hoist | tall grain silos and elevator | steel silos with pipes | vertical-farm tower with glowing tiers |
| Storage Pit | dug pit with log frame and hides | brick storehouse with jars | timber store with treadwheel crane | dockside warehouse with crane | depot with gantry crane and rail cart | stacked shipping containers | automated cube store with a drone |
| Farm | wild-grain patch with stakes | irrigated fields with canal | strip fields with haystacks | orchard rows | ploughed rows with a tractor | greenhouse | glowing hydroponic beds |
| Barracks | sparring ground, weapon racks, hide lean-to | mud-brick drill yard, bronze shields | stone barracks with gatehouse | brick barracks with parade flag | armoury with searchlight | army base with radar dish | drone bay with charging pods |
| Archery Range | — | mud-brick range with straw targets | timber butts and targets | stone shooting gallery | rifle range with sandbag lanes | concrete range with booths | laser range with hologram targets |
| Stable | — | mud-brick stable, horse yard | timber stable, hay loft | brick coach house | horse depot with rail ramp | motor-pool garage | hover-bike dock |
| Market | — | bazaar canopies | arcaded market hall | trading house with crates and scales | iron-and-glass arcade | supermarket with lit sign | holo-kiosk plaza |
| Government Center | — | palace with columns and ramps | cathedral-like hall with rose window | capitol dome | clock-tower parliament | glass government block | glowing data core |
| Wonder | — | great pyramid | gothic cathedral | lighthouse | iron lattice tower | skyscraper | floating crystal megastructure |
| Castle | — | — | stone keep (today's Castle) | star fort | armoured fortress with gun turrets | concrete bunker complex | energy-dome fortress |
| Factory | — | — | — | — | brick works (today's Factory) | clean modern plant | nanofab with floating arms |
| Tower (new) | — | mud-brick tower | stone castle tower | cannon bastion | machine-gun nest on a brick tower | missile turret | laser turret |
| Wall (new) | — | mud-brick wall | castle wall with battlements | star-fort earthwork | sandbags and barbed wire | concrete barrier | energy barrier |

Tool and Iron, the "today" columns, keep their current models. The Tower and Wall have no Tool or Iron model yet, so
they get new ones:

| | Tool | Iron |
|---|---|---|
| Tower | wooden lookout platform | stone tower with ballista |
| Wall | wooden palisade | stone wall |

**Look rules for the builder:**

- **Team colour:** every design carries it (flag, banner, stripe or trim).
- **Height:** later eras may be taller, but no building may exceed about **3.6 world units** (today's tallest are
  around 3), so units stay visible.
- **Animation:** only through the spinner, floater and smoke parts the prototype introduced. All are hidden while the
  building is under construction.
- **Scaffolding** shows during construction, as today, and is sized to the new heights.

## Defences: rules

### Tower
- Available from the **Tool Age**. Villagers build it; size 2×2. Cost: 40 wood + 120 stone (my call). It does not
  count toward the age-up building requirement (`extra`).
- Each tick it shoots the **nearest visible enemy unit within range**, using the existing damage model
  (`damageTo`, attack type against armor).
- **Stats come from the owner's current era.** An existing tower upgrades in place when its owner advances: it
  re-skins, and its HP scales to keep the same fraction of health.

| Era | Look | HP | Attack | Range | Cooldown (ticks) | Notes |
|---|---|---|---|---|---|---|
| Tool | wooden lookout | 125 | 3 pierce | 5 | 40 | |
| Bronze | mud-brick tower | 160 | 4 pierce | 6 | 40 | |
| Iron | stone + ballista | 220 | 7 pierce | 7 | 40 | |
| Medieval | castle tower | 280 | 9 pierce | 7 | 40 | |
| Age of Sail | cannon bastion | 340 | 16 melee | 8 | 60 | splash 0.8 |
| Industrial | MG nest | 380 | 4 pierce | 7 | 12 | |
| Modern | missile turret | 440 | 26 melee | 9 | 50 | splash 1.0 |
| AI Future | laser turret | 500 | 18 pierce | 9 | 20 | |

Armor: melee 3 / pierce 8 (the building default), so archers barely scratch it and siege and melee break it.

### Wall
- Available from the **Tool Age**. Size 1×1 per segment; cost 5 stone per segment (as in the original); `extra`.
- **Placement:** drag a straight line, horizontal, vertical or diagonal.
  - Desktop: press, drag, release.
  - Phone: tap the start, tap the end, confirm.
  - The ghost shows every segment. Placing pays per segment and stops when resources run out.
  - The selected villagers build the segments one after another until the line is done.
- **Walls block every unit, the owner's included.** There are no gates.
- **Durability comes from the owner's era**, upgrading in place like towers: HP Tool 120, Bronze 200, Iron 300,
  Medieval 400, Age of Sail 450, Industrial 500, Modern 650, AI Future 800. Armor: melee 4 / pierce 10.
- **Breaching:** when a unit cannot find a path to its target because enemy walls are in the way, it attacks the
  first enemy wall segment on the path it would take if walls were open. Once the breach is open it resumes its
  order. This applies to every unit, the player's and the bot's.

### Bot
- From the Tool Age on, it keeps easy 1 / medium 2 / hard 3 towers near its Town Center. It rebuilds them when
  destroyed, if it can afford to.
- It never builds walls. It breaks through the player's walls with the breaching rule.

### Scoring, elimination and age-up
- Walls do **not** count toward the score's building term, so they can't be used to farm score. Towers do count.
- Neither counts toward the age-up requirement (`extra`).
- Neither keeps a player alive under the elimination rule (they don't train units), so walls cannot block conquest.

## Approach (my call; the builder refines)

- **Production code, not the prototype.** The prototype stays on its branch as reference. The production version is
  rebuilt test-first.
- **One module per era**, `src/render/arch/<era>.js`, each exporting a builder per building type. `buildingGeos`
  dispatches by era and type and falls back to the building's unlock-era design.
  - The merge-geometry class `B` and the shared helpers move to a small module both sides import, so no kit has to be
    passed around.
  - Today's timber and masonry models move into `arch/tool.js` and `arch/iron.js` unchanged. Their geometry must stay
    byte-identical; it was hash-checked in the era-chain work.
  - `styles.js` stays only if the builder still needs it for palettes; otherwise it is retired.
- **Animated parts** (`spinners`, `floaters`, `smoke`) become a supported model feature with tests.
- **Gallery:** the buildings page picks up the Tower and Wall rows and every new design automatically, because it is
  data-driven.

## Testing

**Headless (Node), sim:**

- A tower shoots the nearest enemy in range and not one out of range.
- Its stats follow the owner's era, and it upgrades in place, keeping its HP fraction, on advance.
- A wall blocks pathing.
- Breaching: a unit whose target is walled off attacks a wall segment, and then reaches the target after the segment
  falls.
- A wall line command places and pays per segment and stops when resources run out.
- Walls are excluded from the score's building term.
- Towers and walls don't count toward age-up or keep a player alive.
- The bot keeps its tower count and breaks into a walled base within a time limit. `test/bot-sim.js` stays clean:
  every match ends.

**Headless (Node), render:**

- Every building in every era builds valid geometry (the existing loop).
- Every building with a design in an era differs from its previous era's design. Measure it by bounding-box or vertex
  differences, not only colour.
- Tool and Iron geometry is byte-identical to today's.
- Animated parts exist where designed and are hidden during construction.
- Heights stay at or below 3.6.

**Browser (required by CLAUDE.md):**

- Gallery screenshots of every building in every era, reviewed for readability and era feel.
- A match per era showing the animations.
- Building towers and walls through the real UI, on desktop and on a phone (both orientations).
- A tower shooting, a bot army breaching a wall, autoplay Death Match, and `?autotour=1`.
- Frame time and draw calls in a busy late-era scene compared with today.

## Delivery order (for the plan)

1. Architecture: per-era modules and the shared builder. Port Tool and Iron unchanged, with the hash check, and the
   prototype's Town Center and House.
2. The remaining buildings, era by era, each checked in the gallery.
3. Defences in the sim: tower shooting, walls, breaching, upgrade on advance, wall-line command. Then the bot, then
   HUD and input (wall drag, phone flow).
4. Tower and wall looks per era.
5. Browser verification, performance check, docs.

## Left to the builder

- The exact geometry, proportions and colours of each design, within the table and look rules above.
- How the breach path is computed, as long as the rule holds and pathing stays within its current per-call budget.
- Whether `styles.js` survives.
- The tower attack visual (muzzle flash, recoil or a short tracer), as long as it is cheap and stays inside the batch.
