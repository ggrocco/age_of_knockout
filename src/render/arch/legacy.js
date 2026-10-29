// Today's building models, moved verbatim from models.js: the kept designs (Tool, the Iron Town Center / House /
// Government Center / Wonder, the Medieval Castle, the Industrial Factory) and the fallback for eras without their own
// design yet. Their geometry is pinned by test/fixtures/kept-buildings.json, so don't change what they draw; new looks go
// in <era>.js.
import { styleOf } from '../styles.js';
import { B, C, unit, TEAM, TEAM_DARK } from '../builder.js';
import { door, win, found, banner, scaffold } from './kit.js';

const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const CHIMNEY_BRICK = 0x7a3a2a, JAR = 0xa56843, LIGHT_STONE = 0xc9baa0, CREAM_MARBLE = 0xd9cfb0;

// ---------- shared parts (ctx: see legacyGeos) ----------
// A gable roof plus its ridge cap (drawn by ridge()), or (flat-roofed eras) a slab with a low parapet over the same
// footprint.
function roof(ctx, width, height, depth, x, y, z, turn = 0, ridge) {
  const { b, style } = ctx;
  if (!ctx.flat) {
    b.roof(width, height, depth, style.roof, x, y, z, turn);
    if (ridge) ridge();
    return;
  }
  const alongX = turn ? depth : width, alongZ = turn ? width : depth;
  b.box(alongX, 0.14, alongZ, style.roof, x, y, z);
  for (const k of [-1, 1]) {
    b.box(alongX, 0.12, 0.07, style.trim, x, y + 0.14, z + k * alongZ / 2);
    b.box(0.07, 0.12, alongZ, style.trim, x + k * alongX / 2, y + 0.14, z);
  }
}

// The era's signature detail on a building's main wall block: `width` by `depth` centred on centreZ, its wall top at
// `top` (round: a tower of diameter `width`).
function eraDetail(ctx, width, depth, centreZ, top, round = false) {
  const { b, style } = ctx, detail = style.detail;
  if (!detail) return;
  if (detail === 'chimney') {
    const x = round ? width * 0.3 : width / 2 - 0.3, z = centreZ - (round ? width : depth) / 4;
    b.box(0.24, 1.1, 0.24, CHIMNEY_BRICK, x, top, z).box(0.3, 0.06, 0.3, C.stoneD, x, top + 1.1, z);
    return;
  }
  const bandYs = detail === 'bands' ? [top * 0.5, top - 0.1] : detail === 'window' ? [top * 0.55] : [top - 0.12];
  const bandHeight = detail === 'window' ? 0.16 : 0.06;
  if (round) roundDetail(ctx, detail, width, centreZ, top, bandYs, bandHeight);
  else squareDetail(ctx, detail, width, depth, centreZ, top, bandYs, bandHeight);
}
// On a round tower: a ring of ten merlons, or bands round it.
function roundDetail(ctx, detail, diameter, centreZ, top, bandYs, bandHeight) {
  const { b, style } = ctx;
  if (detail === 'crenel') {
    for (let i = 0; i < 10; i++) {
      const angle = i * Math.PI / 5;
      b.box(0.16, 0.16, 0.12, style.trim, Math.cos(angle) * diameter / 2, top, centreZ + Math.sin(angle) * diameter / 2, 0, -angle);
    }
    return;
  }
  for (const y of bandYs) b.cyl(diameter / 2 + 0.02, bandHeight, style.trim, 0, y, centreZ);
}
// On a square block, along each of its four edges: merlons every 0.3, or bands.
function squareDetail(ctx, detail, width, depth, centreZ, top, bandYs, bandHeight) {
  const { b, style } = ctx;
  const edges = [
    [0, -depth / 2, width, 0], [0, depth / 2, width, 0], [-width / 2, 0, depth, Math.PI / 2], [width / 2, 0, depth, Math.PI / 2],
  ];
  for (const [edgeX, edgeZ, length, turn] of edges) {
    if (detail === 'crenel') {
      for (let k = -length / 2 + 0.1; k <= length / 2 - 0.1; k += 0.3) {
        b.box(0.16, 0.16, 0.12, style.trim, turn ? edgeX : k, top, centreZ + (turn ? k : edgeZ), 0, turn);
      }
    } else for (const y of bandYs) b.box(length + 0.02, bandHeight, 0.04, style.trim, edgeX, y, centreZ + edgeZ, 0, turn);
  }
}

// Corner posts round a wall block `width` by `depth`, `height` tall.
function posts(ctx, width, depth, height, color = C.woodD) {
  for (const [x, z] of CORNERS) ctx.b.box(0.1, height, 0.1, color, x * width / 2, 0.16, z * depth / 2);
}
// The team flag on a pole drawn by the caller, its cloth at `at`.
function legacyFlag(ctx, at) {
  ctx.extra.flag = new B().box(0.025, 0.3, 0.55, ctx.t, 0, 0, 0.27).geometry();
  ctx.extra.flagAt = at;
}
// Quoin stones up both ends of the front wall at z = front, and a team-coloured rail along it.
function frontQuoins(ctx, front) {
  const { b, s, style } = ctx;
  for (const side of [-1, 1]) {
    for (let row = 0; row < 4; row++) {
      b.box(0.2, 0.09, 0.07, style.key === 'timber' ? C.wood : style.trim, side * (s / 2 - 0.18), 0.19 + row * 0.18, front);
    }
  }
  b.box(s * 0.55, 0.045, 0.045, ctx.td, 0, 0.81, front + 0.04);
}

// ---------- the buildings ----------
function house(ctx) {
  const { b, s, td, style } = ctx, wall = s - 0.1, front = wall / 2 + 0.02;
  found(ctx, s, s);
  b.box(wall, 0.72, wall, style.wall, 0, 0.16, 0);
  posts(ctx, wall, wall, 0.72);
  b.box(s - 0.06, 0.06, s - 0.06, C.woodD, 0, 0.5, 0); // the timber band round the walls
  roof(ctx, s + 0.35, 0.75, s + 0.3, 0, 0.88, 0, 0, () => {
    b.box(0.09, 0.07, s + 0.36, td, 0, 1.6, 0).box(0.03, 0.03, s + 0.3, C.thatchD, 0, 0.9, 0);
  });
  door(ctx, 0.3, 0.5, front, -0.25);
  win(ctx, 0.35, 0.5, front);
  b.box(0.18, 0.55, 0.18, C.stoneD, 0.5, 1.0, -0.4); // the chimney
  eraDetail(ctx, wall, wall, 0, 0.88);
  frontQuoins(ctx, wall / 2 + 0.012);
}

// An ancient assembly hall: a broad roof, shaded porch and working courtyard.
// Team identity lives on cloth and trim rather than an entirely blue/red roof.
function town_center(ctx) {
  const { b, s, style, flat } = ctx, hallZ = -s * 0.12;
  found(ctx, s, s);
  b.box(s - 0.3, 1.05, s * 0.66, style.wall, 0, 0.16, hallZ);
  posts(ctx, s - 0.3, s * 0.66, 1.05);
  b.box(s - 0.18, 0.1, s * 0.69, C.woodD, 0, 1.12, hallZ);
  roof(ctx, s + 0.25, 0.95, s * 0.88, 0, 1.23, hallZ, 0, () => b.box(0.1, 0.1, s * 0.92, C.woodD, 0, 2.16, hallZ));
  const front = s * 0.22;
  door(ctx, 0.5, 0.83, front);
  win(ctx, -0.68, 0.58, front);
  win(ctx, 0.68, 0.58, front);
  townCenterPorch(ctx);
  townCenterYard(ctx);
  if (style.key !== 'timber') townCenterSideWalls(ctx, hallZ);
  eraDetail(ctx, s - 0.3, s * 0.66, hallZ, 1.21);
  b.cyl(0.025, flat ? 1.83 : 1.0, C.woodD, 0, flat ? 1.37 : 2.2, -0.4); // the flagpole
  legacyFlag(ctx, [0, 2.84, -0.4]);
}
// The porch: four columns on stone bases, a beam over them and a striped awning (every third stripe team-coloured).
function townCenterPorch(ctx) {
  const { b, s, t, style } = ctx, porchZ = s * 0.45;
  const column = style.key === 'timber' ? C.woodD : style.key === 'masonry' ? C.marble : style.trim;
  for (const x of [-s * 0.4, -s * 0.18, s * 0.18, s * 0.4]) {
    b.cylT(0.06, 0.09, 1.0, column, x, 0.16, porchZ, 8);
    b.box(0.2, 0.08, 0.2, C.stone, x, 0.16, porchZ);
  }
  b.box(s * 0.92, 0.08, 0.11, C.woodD, 0, 1.16, porchZ);
  for (let i = 0; i < 9; i++) {
    b.box(s / 10, 0.035, s * 0.37, i % 3 === 0 ? t : C.cloth,
      -s * 0.4 + i * s / 10, 1.2, s * 0.35, 0.14);
  }
}
// The entrance steps, terracotta storage jars and stacked timber beside the entrance.
function townCenterYard(ctx) {
  const { b, h } = ctx;
  for (let i = 0; i < 3; i++) b.box(0.9 + i * 0.14, 0.045, 0.17, C.stone, 0, 0.11 - i * 0.03, h + i * 0.13);
  for (const [x, z] of [[-h + 0.18, h - 0.15], [-h + 0.48, h - 0.16]]) {
    b.sph(0.15, JAR, x, 0.27, z, 1, 1.2, 1).cyl(0.065, 0.05, C.dark, x, 0.43, z);
  }
  for (let i = 0; i < 3; i++) b.cyl(0.055, 0.6, C.wood, h - 0.22, 0.16 + i * 0.08, 0.1, Math.PI / 2);
}
// Masonry eras face the hall's ends in five courses of alternating stone (or the era's wall and trim).
function townCenterSideWalls(ctx, hallZ) {
  const { b, s, h, style, ancient } = ctx;
  for (const x of [-h + 0.12, h - 0.12]) for (let row = 0; row < 5; row++) {
    const course = ancient ? (row % 2 ? C.stone : LIGHT_STONE) : (row % 2 ? style.trim : style.wall);
    b.box(0.2, 0.13, s * 0.69, course, x, 0.18 + row * 0.19, hallZ);
  }
}

const GRANARY_HAY = [[0.6, 0.7], [0.85, 0.5], [0.7, 0.4]];
function granary(ctx) {
  const { b, s, t, style, ancient, flat } = ctx, radius = s / 2;
  b.cyl(radius + 0.05, 0.16, C.stone).cyl(radius - 0.08, 0.85, ancient ? C.plaster : style.wall, 0, 0.16, 0);
  if (flat) b.cyl(radius + 0.1, 0.14, style.roof, 0, 1.0, 0);
  else b.cone(radius + 0.2, 0.85, ancient ? C.thatch : style.roof, 0, 1.0, 0, 12);
  b.cyl(radius - 0.06, 0.08, t, 0, 0.72, 0); // the team band
  door(ctx, 0.3, 0.5, radius - 0.08);
  for (const [x, z] of GRANARY_HAY) b.cyl(0.12, 0.22, C.hay, x, 0.16, z).sph(0.09, C.hay, x, 0.4, z, 1, 0.6, 1);
  // The finial on the roof's peak.
  b.box(0.1, 0.2, 0.1, C.woodD, 0, flat ? 1.14 : 1.8, 0).cone(0.06, 0.12, t, 0, flat ? 1.19 : 1.85, 0, 6);
  eraDetail(ctx, s - 0.16, 0, 0, 1.01, true);
}

function storage_pit(ctx) {
  const { b, s, t, style, ancient } = ctx;
  b.box(s, 0.1, s, C.woodD, 0, 0, 0).box(s - 0.3, 0.08, s - 0.3, C.dark, 0, 0.08, 0); // the pit and its rim
  // Posts, taller at the back, carrying a team-coloured awning under the roofing.
  for (const [x, z, height] of [[-0.7, -0.7, 0.9], [0.7, -0.7, 0.9], [-0.7, 0.7, 0.6], [0.7, 0.7, 0.6]]) {
    b.box(0.1, height, 0.1, C.wood, x, 0.1, z);
  }
  b.box(s + 0.3, 0.07, s + 0.2, t, 0, 0.85, 0, 0.28).box(s + 0.3, 0.03, s + 0.2, ancient ? C.thatch : style.roof, 0, 0.9, 0, 0.28);
  // Crates, a tub, and heaps of stone and gold.
  for (const [x, z] of [[-0.3, 0.2], [0.1, 0.45], [0.4, -0.1]]) {
    b.box(0.24, 0.22, 0.24, C.wood, x, 0.14, z).box(0.26, 0.03, 0.26, C.woodD, x, 0.36, z);
  }
  b.cylT(0.13, 0.15, 0.3, C.woodD, -0.55, 0.14, 0.3);
  b.sph(0.16, C.stoneD, 0.5, 0.2, 0.4, 1, 0.5, 1).sph(0.14, C.gold, 0.15, 0.24, -0.35, 1, 0.5, 1);
}

function farm(ctx) {
  const { b, s, t, extra } = ctx;
  b.box(s, 0.05, s, 0x6b4a26, 0, 0, 0);
  for (let i = -2; i <= 2; i++) b.box(s * 0.9, 0.05, 0.11, 0x4a3018, 0, 0.05, i * 0.32); // the furrows
  // A post at the back-right corner with a crossbar and a team pennant.
  const postX = s / 2 - 0.1, postZ = -s / 2 + 0.1;
  b.box(0.06, 0.6, 0.06, C.wood, postX, 0.05, postZ).box(0.34, 0.05, 0.05, C.wood, postX, 0.5, postZ);
  b.box(0.16, 0.2, 0.05, t, postX, 0.28, postZ);
  // The crops (animate() shows them once the farm is finished): rows of green shoots with ripening heads.
  const crops = new B();
  for (let i = -2; i <= 2; i++) for (let j = -3; j <= 3; j++) {
    crops.cone(0.06, 0.22, i % 2 ? 0x6fae2f : 0x8bc34a, j * 0.24, 0.09, i * 0.32, 5).sph(0.045, C.hay, j * 0.24, 0.32, i * 0.32);
  }
  extra.crops = crops.geometry();
}

function barracks(ctx) {
  const { b, s, t, td, style, ancient } = ctx, width = s - 0.2, depth = s - 0.3, front = depth / 2;
  found(ctx, s, s);
  b.box(width, 0.95, depth, ancient ? 0xcbb890 : style.wall, 0, 0.16, 0);
  posts(ctx, width, depth, 0.95);
  b.box(s - 0.16, 0.08, s - 0.26, C.woodD, 0, 0.66, 0);
  roof(ctx, s - 0.05, 0.85, s + 0.25, 0, 1.06, 0, Math.PI / 2, () => b.box(s + 0.28, 0.08, 0.09, td, 0, 1.9, 0));
  eraDetail(ctx, width, depth, 0, 1.11);
  door(ctx, 0.5, 0.7, front + 0.02);
  // Two bronze shields with team-painted faces either side of the door.
  for (const x of [-0.75, 0.75]) {
    b.add(unit.cyl, C.bronze, x, 0.75, front + 0.05, 0.2, 0.03, 0.2, Math.PI / 2, 0, 0);
    b.add(unit.cyl, t, x, 0.75, front + 0.07, 0.13, 0.03, 0.13, Math.PI / 2, 0, 0);
  }
  // A spear rack before the hall, and the banner.
  const rackZ = s / 2 + 0.28;
  b.box(1.0, 0.06, 0.06, C.woodD, 0, 0.55, rackZ);
  for (let i = -2; i <= 2; i++) b.cyl(0.018, 0.75, C.wood, i * 0.2, 0.16, rackZ).cone(0.035, 0.1, C.iron, i * 0.2, 0.9, rackZ, 5);
  b.box(0.06, 0.06, 0.6, C.woodD, s / 2 - 0.1, 0.5, rackZ);
  banner(ctx, -s / 2 + 0.1, s / 2 + 0.2, 0.16, 1.4);
  frontQuoins(ctx, depth / 2 + 0.012);
}

// A straw target on a post: a hay boss with white, red and gold rings.
function strawTarget(b, x, edge) {
  b.box(0.05, 0.6, 0.05, C.wood, x, 0.16, edge - 0.15);
  b.add(unit.cyl, C.hay, x, 0.66, edge - 0.15, 0.3, 0.06, 0.3, Math.PI / 2);
  b.add(unit.cyl, 0xffffff, x, 0.66, edge - 0.12, 0.22, 0.03, 0.22, Math.PI / 2);
  b.add(unit.cyl, C.red, x, 0.66, edge - 0.1, 0.15, 0.03, 0.15, Math.PI / 2);
  b.add(unit.cyl, C.gold, x, 0.66, edge - 0.08, 0.06, 0.03, 0.06, Math.PI / 2);
}
function archery_range(ctx) {
  const { b, s, t, style, ancient } = ctx;
  found(ctx, s, s);
  posts(ctx, s - 0.3, s - 0.7, 1.05);
  // The archers' shelter: a team-coloured canopy under its roofing, and a wall behind it.
  b.box(s - 0.1, 0.09, s - 0.6, t, 0, 1.21, -0.25, 0.12);
  b.box(s - 0.1, 0.03, s - 0.6, ancient ? C.thatch : style.roof, 0, 1.3, -0.25, 0.12);
  b.box(s - 0.5, 0.7, 0.08, C.woodD, 0, 0.2, -s / 2 + 0.5);
  for (const x of [-0.8, 0, 0.8]) strawTarget(b, x, s / 2);
  b.box(0.4, 0.3, 0.3, C.hay, -1.0, 0.16, 0.0).box(0.4, 0.3, 0.3, C.hay, -1.0, 0.46, 0.05); // hay bales
  banner(ctx, s / 2 - 0.1, -s / 2 + 0.2, 0.16, 1.3);
}

function stable(ctx) {
  const { b, s, td, style, ancient } = ctx, edge = s / 2;
  found(ctx, s, s);
  b.box(s - 0.2, 0.85, s - 0.4, ancient ? 0xb5854f : style.wall, 0, 0.16, -0.2);
  posts(ctx, s - 0.2, s - 0.4, 0.85);
  roof(ctx, s + 0.15, 1.0, s - 0.1, 0, 1.0, -0.2, Math.PI / 2, () => b.box(s + 0.2, 0.08, 0.09, td, 0, 2.0, -0.2));
  eraDetail(ctx, s - 0.2, s - 0.4, -0.2, 1.01);
  b.box(0.6, 0.65, 0.06, C.dark, 0, 0.16, s / 2 - 0.4 + 0.02).box(0.7, 0.06, 0.08, C.woodD, 0, 0.8, edge - 0.38); // the door
  // The paddock fence in front.
  for (const x of [-1, 1]) {
    b.box(0.06, 0.5, 0.06, C.wood, x * 0.9, 0.16, edge - 0.1).box(0.06, 0.06, 0.7, C.wood, x * 0.9, 0.5, edge - 0.45);
  }
  b.box(1.9, 0.06, 0.06, C.wood, 0, 0.5, edge - 0.1).box(1.9, 0.06, 0.06, C.wood, 0, 0.3, edge - 0.1);
  // Hay in the paddock and in the loft door.
  b.box(0.45, 0.28, 0.3, C.hay, -1.0, 0.16, edge - 0.4).box(0.3, 0.3, 0.3, C.hay, 1.0, 0.16, edge - 0.5);
  b.box(0.3, 0.1, 0.3, C.wood, 0.95, 1.4, edge - 0.65);
  banner(ctx, -s / 2 + 0.1, edge - 0.1, 0.16, 1.4);
  frontQuoins(ctx, edge - 0.39);
}

// A market stall at (x, z): a counter, four posts (taller at the back), an awning striped white and `stripe`, and fruit.
const FRUIT = [C.red, C.gold, C.green, 0xc026d3];
function marketStall(b, x, z, stripe) {
  b.box(0.9, 0.35, 0.5, C.wood, x, 0.16, z);
  b.box(0.06, 0.95, 0.06, C.woodD, x - 0.42, 0.16, z - 0.25).box(0.06, 0.95, 0.06, C.woodD, x + 0.42, 0.16, z - 0.25);
  b.box(0.06, 0.75, 0.06, C.woodD, x - 0.42, 0.16, z + 0.25).box(0.06, 0.75, 0.06, C.woodD, x + 0.42, 0.16, z + 0.25);
  for (let i = 0; i < 4; i++) b.box(0.24, 0.04, 0.72, i % 2 ? 0xffffff : stripe, x - 0.36 + i * 0.24, 0.95, z, 0.25);
  for (let i = 0; i < 4; i++) b.sph(0.08, FRUIT[i], x - 0.27 + i * 0.18, 0.55, z + 0.05, 1, 0.8, 1);
}
function market(ctx) {
  const { b, s, t } = ctx;
  found(ctx, s, s);
  for (const [x, z, stripe] of [[-0.7, -0.5, t], [0.7, -0.5, 0xffffff], [0, 0.6, t]]) marketStall(b, x, z, stripe);
  b.cylT(0.16, 0.18, 0.36, C.woodD, 1.0, 0.16, 0.9).cylT(0.16, 0.18, 0.36, C.woodD, 0.75, 0.16, 1.05); // barrels
  b.box(0.3, 0.26, 0.3, C.wood, -1.0, 0.16, 0.9); // a crate
}

function government_center(ctx) {
  const { b, s, t, style, ancient } = ctx;
  b.box(s + 0.2, 0.14, s + 0.2, C.marble).box(s, 0.14, s, C.stone, 0, 0.14, 0); // the stepped plinth
  b.box(s - 0.5, 1.0, s - 0.9, ancient ? C.marble : style.wall, 0, 0.28, -0.35);
  eraDetail(ctx, s - 0.5, s - 0.9, -0.35, 1.28);
  // The portico: six columns with stone bases and capitals, an entablature and a pediment with a team tympanum.
  const porticoZ = s / 2 - 0.25;
  for (let i = 0; i < 6; i++) {
    const x = -s / 2 + 0.3 + i * (s - 0.6) / 5;
    b.cyl(0.11, 1.15, C.marble, x, 0.28, porticoZ); // the shaft
    b.cyl(0.14, 0.07, C.stone, x, 0.28, porticoZ).cyl(0.14, 0.07, C.stone, x, 1.36, porticoZ); // its base and capital
  }
  b.box(s - 0.2, 0.2, 0.55, C.marble, 0, 1.43, porticoZ);
  b.roof(s - 0.1, 0.62, 0.6, C.marble, 0, 1.63, porticoZ, 0).roof(s - 0.5, 0.42, 0.62, t, 0, 1.68, porticoZ, 0);
  b.cone(0.5, 0.5, t, 0, 1.28, -0.35, 8).cone(0.14, 0.3, C.gold, 0, 1.75, -0.35, 6); // the dome and its gold finial
  banner(ctx, s / 2 - 0.05, s / 2 - 0.05, 0.28, 1.6);
}

function wonder(ctx) {
  const { b, s } = ctx;
  for (let i = 0; i < 3; i++) b.box(s - i * 0.5, 0.22, s - i * 0.5, i % 2 ? C.marble : CREAM_MARBLE, 0, i * 0.22, 0);
  // A ring of twelve columns under a round entablature.
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6, radius = s * 0.36, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    b.cyl(0.13, 1.1, C.marble, x, 0.66, z).cyl(0.17, 0.08, C.stone, x, 0.66, z).cyl(0.17, 0.08, C.stone, x, 1.76, z);
  }
  b.cyl(s * 0.4, 0.14, C.marble, 0, 1.84, 0);
  // The stepped tower, a gold pyramid and spire, and a glowing tip.
  const steps = [C.marble, CREAM_MARBLE, C.marble, CREAM_MARBLE];
  for (let i = 0; i < 4; i++) b.box(s * 0.62 - i * 0.5, 0.42, s * 0.62 - i * 0.5, steps[i], 0, 1.96 + i * 0.42, 0);
  b.cone(0.55, 0.8, C.gold, 0, 3.64, 0, 4, Math.PI / 4).cone(0.09, 0.5, C.gold, 0, 4.4, 0, 6).sph(0.11, 0xfff3a0, 0, 4.95);
  // Torches in bronze bowls at the corners.
  const corner = s / 2 - 0.15;
  for (const [x, z] of CORNERS) {
    b.cyl(0.05, 0.6, C.woodD, x * corner, 0.66, z * corner);
    b.cylT(0.13, 0.06, 0.12, C.bronze, x * corner, 1.26, z * corner).cone(0.1, 0.24, 0xff9a1f, x * corner, 1.36, z * corner, 6);
  }
  banner(ctx, 0, s / 2 - 0.05, 0.66, 1.9);
}

// The castle's keep, `side` square: its windows, and a flat roof or corner merlons.
function castleKeep(ctx, side, stone, trim) {
  const { b, s, style, flat } = ctx;
  b.box(side, 1.1, side, stone, 0, 1.46, -0.1);
  for (const x of [-0.35, 0.35]) b.box(0.08, 0.3, 0.04, C.dark, x, 1.9, -0.1 + side / 2);
  if (flat) b.box(s - 1.6, 0.12, s - 1.6, style.roof, 0, 2.56, -0.1);
  else for (const [x, z] of CORNERS) b.box(0.18, 0.18, 0.14, trim, x * (s - 1.9) / 2, 2.56, -0.1 + z * (s - 1.9) / 2);
}
// The castle's four corner towers, `at` from the centre along x and z, under flat roofs or conical caps.
function castleTowers(ctx, at, stone) {
  const { b, style, ancient, flat } = ctx;
  for (const [x, z] of CORNERS) {
    b.cyl(0.42, 1.9, stone, x * at, 0.16, z * at);
    if (flat) b.cyl(0.46, 0.12, style.roof, x * at, 2.06, z * at);
    else b.cone(0.5, 0.65, ancient ? 0x4f5a66 : style.roof, x * at, 2.06, z * at, 8);
  }
}
// A keep inside a battlemented curtain wall with four corner towers; later eras re-skin the stone.
function castle(ctx) {
  const { b, s, h, t, style, ancient } = ctx, plainStone = ancient || style.key === 'castle';
  const stone = plainStone ? 0x9c9a92 : style.wall, trim = plainStone ? 0x6f6f68 : style.trim;
  const curtain = s - 0.7, towerAt = h - 0.42, keep = s - 1.7;
  found(ctx, s, s);
  b.box(curtain, 1.3, curtain, stone, 0, 0.16, 0).box(curtain + 0.06, 0.08, curtain + 0.06, t, 0, 1.08, 0);
  const edges = [[0, -curtain / 2, 0], [0, curtain / 2, 0], [-curtain / 2, 0, Math.PI / 2], [curtain / 2, 0, Math.PI / 2]];
  for (const [edgeX, edgeZ, turn] of edges) for (let k = -curtain / 2 + 0.15; k <= curtain / 2 - 0.15; k += 0.34) {
    b.box(0.18, 0.18, 0.14, trim, turn ? edgeX : k, 1.46, turn ? k : edgeZ, 0, turn); // merlons
  }
  castleKeep(ctx, keep, stone, trim);
  castleTowers(ctx, towerAt, stone);
  // The gate and its portcullis bars.
  door(ctx, 0.7, 0.85, curtain / 2 + 0.02);
  for (let i = -2; i <= 2; i++) b.box(0.03, 0.85, 0.03, C.iron, i * 0.13, 0.16, curtain / 2 + 0.06);
  eraDetail(ctx, keep, keep, -0.1, 2.56);
  b.cyl(0.025, 0.9, C.woodD, 0, 2.56, -0.1); // the flagpole
  legacyFlag(ctx, [0, 3.15, -0.1]);
}

// A works hall with a glazed sawtooth roof and two smokestacks at the back.
function factory(ctx) {
  const { b, s, t, style, ancient } = ctx, width = s - 0.2, depth = s - 0.3;
  const bay = depth / 3, rise = 0.42, slope = Math.hypot(bay, rise), tilt = Math.atan2(rise, bay);
  found(ctx, s, s);
  b.box(width, 1.0, depth, ancient ? 0x9a4a35 : style.wall, 0, 0.16, 0).box(width + 0.04, 0.08, depth + 0.04, t, 0, 0.9, 0);
  // The sawtooth: three sloping roof bays, each with a glazed upright face.
  for (let i = 0; i < 3; i++) {
    const bayBack = -depth / 2 + i * bay;
    b.box(width, 0.05, slope, ancient ? 0x5d6468 : style.roof, 0, 1.16 + rise / 2 - 0.025, bayBack + bay / 2, -tilt);
    b.box(width - 0.04, rise, 0.04, C.glass, 0, 1.16, bayBack + bay - 0.02);
  }
  for (const x of [-width / 2 + 0.35, width / 2 - 0.35]) {
    b.cyl(0.13, 2.1, CHIMNEY_BRICK, x, 0.16, -depth / 2 + 0.25).cyl(0.16, 0.08, C.stoneD, x, 2.26, -depth / 2 + 0.25);
  }
  door(ctx, 0.8, 0.7, depth / 2 + 0.02);
  win(ctx, -0.85, 0.5, depth / 2 + 0.02);
  win(ctx, 0.85, 0.5, depth / 2 + 0.02);
  eraDetail(ctx, width, depth, 0, 1.16);
  banner(ctx, width / 2 - 0.05, depth / 2 + 0.1, 0.16, 1.3);
}

const plainBlock = ctx => { ctx.b.box(ctx.s, 0.8, ctx.s, C.plaster); };

const LEGACY = {
  house, town_center, granary, storage_pit, farm, barracks, archery_range, stable, market, government_center, wonder,
  castle, factory,
};
// The scaffold's height while each building goes up.
const SCAFFOLD_HEIGHT = {
  house: 1.7, town_center: 3.0, granary: 1.6, storage_pit: 1.1, farm: 0.8, wonder: 5.0, castle: 3.2, factory: 2.4,
  government_center: 2.4,
};

export function legacyGeos(type, team, size, age) {
  const s = size - 0.22, style = styleOf(age), b = new B(), extra = {};
  // The drawing context: b the body, s the footprint's side and h half of it, t / td the team colour and its dark shade.
  const ctx = {
    b, s, h: s / 2, t: TEAM[team], td: TEAM_DARK[team], extra, style,
    ancient: style.key === 'timber' || style.key === 'masonry', flat: style.roofForm === 'flat',
  };
  (Object.hasOwn(LEGACY, type) ? LEGACY[type] : plainBlock)(ctx);
  extra.scaffold = scaffold(s, SCAFFOLD_HEIGHT[type] ?? 1.9);
  return { body: b.geometry(), extra };
}
