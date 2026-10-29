// Bronze Age: Mesopotamian and Egyptian mud-brick, flat roof terraces, ramps and stairs, columns and bronze ornament;
// a stepped ziggurat with a shrine, domed silos, irrigated basins with a shaduf, a palace on a terrace and a great
// pyramid; for defence, a battered mud-brick tower and a niched wall crowned with stepped merlons.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, stick, lerp, hash, place, horse, streak, WEDGE, CYL6, BALL, CONE4, FRUSTUM } from './kit.js';

// ---------- shared Bronze parts ----------
// DOME: a hemisphere, flat side down at y = 0, for small repeated parts (the kit has CYL6, BALL, CONE4, FRUSTUM and
// WEDGE, the ramp).
const DOME = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2);
const STAIR = 0xb88f5c, LIME = 0xe0c9a0, DOMEC = 0xd2aa72, JAR = 0xa56843, SAND = 0xc8ad7a, WATER = 0x3f7fa3;
const PALM = 0x5d7a32, OCHRE = 0xd9a441, LIMESTONE = 0xc9baa0;
const LIME_D = 0xcdb58a, PAVING = 0xcdbf98, FIELD = 0x6e5536, WET_EARTH = 0x5b4429, THRESHING = 0xb59a6a;
const PALM_D = 0x4f6b2a, TRUNK = 0x7a6240, TRUNK_D = 0x6a5236, DATES = 0x8a4a22, YARD = 0x9c7f55, RUST = 0x8a4a2a;
const BROWN = 0x7a5a2a, MADDER = 0x6b3a1e, MELON = 0x6f8f3a, LINEN = 0xf2efe6;
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

// A flat-roofed mud-brick block standing on y, with a darker coping round its roof edge.
const block = (b, w, hh, d, x, y, z, c = P.mud, cap = P.mudD) => {
  b.box(w, hh, d, c, x, y, z);
  for (const k of [-1, 1]) {
    b.box(w + 0.04, 0.07, 0.08, cap, x, y + hh, z + k * (d / 2 - 0.02)).box(0.08, 0.07, d, cap, x + k * (w / 2 - 0.02), y + hh, z);
  }
};
// Stepped Mesopotamian merlons along a roof edge from a0 to a1 along x at z = at (or, with alongZ, along z at x = at).
const merlons = (b, a0, a1, at, y, alongZ = false, c = P.mudD) => {
  for (let a = a0; a <= a1 + 1e-6; a += 0.22) {
    const [x, z] = alongZ ? [at, a] : [a, at], [w, d] = alongZ ? [0.08, 0.12] : [0.12, 0.08];
    b.box(w, 0.08, d, c, x, y, z).box(w * 0.5, 0.06, d * 0.5 + (alongZ ? 0 : 0.03), c, x, y + 0.08, z);
  }
};
// Shallow buttresses every `step` along a wall face at z, from x0 to x1: the niched Mesopotamian facade.
const buttresses = (b, x0, x1, step, z, y, hh) => {
  for (let x = x0; x <= x1 + 1e-6; x += step) b.box(0.09, hh, 0.05, P.mudD, x, y, z);
};
// A terracotta storage jar of radius r standing on y, with its neck and (optionally) a cloth stopper.
const jar = (b, x, y, z, r, stopper) => {
  b.add(BALL, JAR, x, y + r * 1.1, z, r, r * 1.15, r).add(CYL6, JAR, x, y + r * 2.3, z, r * 0.45, r * 0.5, r * 0.45);
  if (stopper) b.add(CYL6, stopper, x, y + r * 2.58, z, r * 0.5, r * 0.1, r * 0.5);
};
// A round bronze shield with a team-painted face, hung on a wall facing +z (or +x, with facingX).
const shield = (b, t, x, y, z, facingX = false, r = 0.13) => {
  const [rx, rz, ox, oz] = facingX ? [0, Math.PI / 2, 1, 0] : [Math.PI / 2, 0, 0, 1];
  b.add(unit.cyl, C.bronze, x, y, z, r, 0.03, r, rx, 0, rz); // the rim
  b.add(unit.cyl, t, x + ox * 0.018, y, z + oz * 0.018, r * 0.74, 0.02, r * 0.74, rx, 0, rz); // the painted face
  b.add(BALL, C.bronze, x + ox * 0.03, y, z + oz * 0.03, 0.035, 0.035, 0.035); // the boss
};
// A bronze brazier with its fire, standing on y.
const brazier = (b, x, y, z) => b
  .cylT(0.03, 0.03, 0.22, C.bronze, x, y, z, 6)
  .cylT(0.09, 0.05, 0.1, C.bronze, x, y + 0.22, z, 8)
  .cone(0.07, 0.16, P.fire, x, y + 0.3, z, 5);

// House: a flat-roofed mud-brick house with a parapet, a team awning shading its roof terrace, an outside stair, a
// door and a vent, and storage jars on the roof.
export function house(ctx) {
  const { b, s, t } = ctx, wall = s - 0.2, front = wall / 2 + 0.01;
  b.box(s + 0.1, 0.1, s + 0.1, P.mudD).box(wall, 0.82, wall, P.mud, 0, 0.1, 0);
  for (const k of [-1, 1]) { // the parapet
    b.box(wall, 0.14, 0.08, P.mudD, 0, 0.92, k * wall / 2).box(0.08, 0.14, wall, P.mudD, k * wall / 2, 0.92, 0);
  }
  b.box(0.04, 0.45, 0.04, C.wood, -0.45, 0.92, -0.45).box(0.04, 0.45, 0.04, C.wood, 0.45, 0.92, -0.45); // awning poles
  b.box(1.0, 0.03, 0.6, t, 0, 1.33, -0.22, 0.12);
  for (let i = 0; i < 5; i++) b.box(0.24, 0.18 * (i + 1), 0.2, P.mudD, wall / 2 + 0.12, 0.1, 0.55 - i * 0.2); // the stair
  b.box(0.3, 0.5, 0.04, C.dark, -0.2, 0.1, front).box(0.12, 0.08, 0.04, C.dark, 0.3, 0.6, front); // the door, the vent
  b.sph(0.08, JAR, -0.3, 1.02, 0.25, 1, 1.25, 1).sph(0.07, JAR, -0.12, 1.0, 0.3, 1, 1.25, 1);
  return 1.4;
}

// Town Center: a three-stage ziggurat with a grand stair up its front to a shrine with a bronze roof, fire bowls on
// its first terrace and team banners either side of the stair.
export function town_center(ctx) {
  const { b, s, t } = ctx, corner = s / 2 - 0.18;
  b.box(s, 0.55, s, P.mud).box(s - 0.7, 0.5, s - 0.7, P.mudD, 0, 0.55, 0).box(s - 1.4, 0.45, s - 1.4, P.mud, 0, 1.05, 0);
  for (let i = 0; i < 8; i++) b.box(0.55, 0.19 * (i + 1), 0.17, STAIR, 0, 0, s / 2 + 0.16 - i * 0.17); // the grand stair
  b.box(0.62, 0.45, 0.62, LIME, 0, 1.5, 0).box(0.2, 0.3, 0.04, C.dark, 0, 1.5, 0.31); // the shrine and its door
  b.cone(0.44, 0.35, C.bronze, 0, 1.95, 0, 4, Math.PI / 4);
  for (const [x, z] of CORNERS) {
    b.cylT(0.08, 0.05, 0.14, C.bronze, x * corner, 0.55, z * corner, 8).cone(0.07, 0.16, P.fire, x * corner, 0.69, z * corner, 5);
  }
  for (const x of [-0.85, 0.85]) {
    b.box(0.3, 0.46, 0.02, t, x, 0.05, s / 2 + 0.01).box(0.3, 0.05, 0.03, C.bronze, x, 0.5, s / 2 + 0.01); // a banner
  }
  flag(ctx, 0, 2.28, 0, 0.6);
  return 2.3;
}

// A beehive silo of radius `radius` at (x, z): a drum and a dome, a filling hatch on top, a team band and a door at the
// foot. Returns its top.
function silo(ctx, x, z, radius, wallHeight) {
  const { b, t } = ctx, base = 0.14, domeHeight = radius * 1.15, doorAt = radius * 0.71;
  const doorHeight = Math.min(0.3, wallHeight * 0.5), turn = Math.PI / 4;
  b.cylT(radius + 0.05, radius + 0.06, 0.08, P.mudD, x, 0.06, z, 10).cylT(radius * 0.95, radius, wallHeight, P.mud, x, base, z, 10);
  b.cylT(radius * 0.96 + 0.012, radius * 0.97 + 0.012, 0.07, t, x, base + wallHeight * 0.64, z, 10);
  b.add(DOME, DOMEC, x, base + wallHeight, z, radius * 0.95, domeHeight, radius * 0.95);
  const top = base + wallHeight + domeHeight;
  b.cylT(radius * 0.2, radius * 0.27, 0.08, P.mudD, x, top - 0.05, z, 8); // the hatch
  b.cylT(radius * 0.17, radius * 0.17, 0.02, C.dark, x, top + 0.025, z, 8);
  b.box(0.13, doorHeight, 0.04, C.dark, x + doorAt, base, z + doorAt, 0, turn);
  b.box(0.2, 0.04, 0.05, C.wood, x + doorAt, base + doorHeight, z + doorAt, 0, turn);
  return top + 0.045;
}
// Granary: beehive silos of mud brick (a drum and a dome, a filling hatch on top, a team band, a door at the foot) in a
// walled yard, a stair up beside the big silo, and the harvest heaped and sacked in front.
export function granary(ctx) {
  const { b } = ctx;
  b.box(1.76, 0.06, 1.76, P.mudD);
  // The yard walls along the back and left, and their coping.
  b.box(1.7, 0.32, 0.1, P.mud, 0, 0.06, -0.82).box(0.1, 0.32, 1.54, P.mud, -0.82, 0.06, -0.05);
  b.box(1.74, 0.05, 0.14, P.mudD, 0, 0.38, -0.82).box(0.14, 0.05, 1.58, P.mudD, -0.82, 0.38, -0.05);
  const top = silo(ctx, -0.3, -0.3, 0.4, 0.66);
  silo(ctx, 0.5, -0.5, 0.28, 0.48);
  silo(ctx, -0.52, 0.47, 0.25, 0.42);
  // The stair up to the big silo's shoulder.
  for (let i = 0; i < 5; i++) b.box(0.2, 0.135 * (i + 1), 0.15, STAIR, 0.2, 0.06, 0.32 - i * 0.15);
  // A heap of grain on a threshing floor, sacks and a measuring basket.
  b.cyl(0.3, 0.02, THRESHING, 0.46, 0.06, 0.4).cone(0.25, 0.27, C.hay, 0.46, 0.08, 0.4, 8);
  for (const [x, z] of [[0.08, 0.66], [0.24, 0.76], [0.74, 0.0], [0.76, 0.2]]) {
    b.add(BALL, C.cloth, x, 0.15, z, 0.1, 0.1, 0.085).add(CYL6, C.leather, x, 0.25, z, 0.03, 0.04, 0.03);
  }
  b.cylT(0.11, 0.08, 0.13, P.wattle, 0.72, 0.06, 0.7, 6).cylT(0.09, 0.09, 0.02, C.hay, 0.72, 0.18, 0.7, 6);
  return top;
}

// The storehouse's yard: storage jars along the left, logs stacked along the right, cut stone and a basket of gold.
function storeYard(ctx) {
  const { b, t } = ctx;
  const jars = [[-0.7, 0.22, 0.11, 1], [-0.45, 0.2, 0.1, 0], [-0.72, 0.5, 0.1, 0], [-0.47, 0.48, 0.11, 1], [-0.7, 0.76, 0.09, 0],
    [-0.22, 0.32, 0.09, 0]];
  for (const [x, z, r, sealed] of jars) jar(b, x, 0.06, z, r, sealed ? t : JAR); // two stoppered with team cloth
  const logs = [[0.44, 0.12], [0.58, 0.12], [0.72, 0.12], [0.51, 0.23], [0.65, 0.23], [0.58, 0.34]];
  for (const [i, [x, y]] of logs.entries()) stick(b, 0.06, i % 2 ? C.woodD : C.wood, [x, y, 0.16], [x, y, 0.8], CYL6);
  for (const [x, y, z, turn] of [[-0.04, 0.06, 0.66, 0.1], [0.2, 0.06, 0.7, -0.2], [0.08, 0.22, 0.68, 0.3]]) {
    b.box(0.22, 0.16, 0.18, turn > 0 ? C.stone : C.stoneD, x, y, z, 0, turn);
  }
  b.cylT(0.13, 0.1, 0.12, P.wattle, 0.06, 0.06, 0.36, 6);
  const gold = [[0.03, 0.15, 0.34, 0.06], [0.1, 0.15, 0.39, 0.055], [0.06, 0.18, 0.3, 0.05], [0.07, 0.18, 0.36, 0.05]];
  for (const [x, y, z, r] of gold) b.rock(r, C.gold, x, y, z, 1, 0.8, 1, x * 20);
}
// Storage Pit: a long buttressed brick storehouse with two doorways under a team-coloured awning; storage jars before
// it, and the wood, stone and gold brought in: a log stack, cut stone blocks and a basket of gold.
export function storage_pit(ctx) {
  const { b, t } = ctx, houseZ = -0.56, depth = 0.62, height = 0.74, front = houseZ + depth / 2;
  b.box(1.76, 0.06, 1.76, P.mudD);
  block(b, 1.62, height, depth, 0, 0.06, houseZ);
  buttresses(b, -0.78, 0.78, 0.52, front + 0.02, 0.06, height);
  for (const x of [-0.42, 0.42]) { // the doorways and their lintels
    b.box(0.3, 0.5, 0.05, C.dark, x, 0.06, front + 0.01).box(0.38, 0.06, 0.07, C.wood, x, 0.56, front + 0.02);
  }
  // On the roof: a hatch, sacks and a bundle of reed mats.
  const roof = 0.06 + height;
  b.box(0.26, 0.02, 0.22, C.dark, -0.45, roof, houseZ - 0.05).box(0.3, 0.03, 0.04, C.wood, -0.45, roof, houseZ + 0.08);
  for (const [x, z] of [[0.35, -0.68], [0.52, -0.6], [0.44, -0.45]]) b.add(BALL, C.cloth, x, roof + 0.08, z, 0.1, 0.08, 0.085);
  stick(b, 0.06, C.hay, [0.0, roof + 0.06, -0.75], [0.0, roof + 0.06, -0.4], CYL6);
  // The awning: team cloth on poles over the doorways.
  for (const x of [-0.72, 0.72]) b.cylT(0.022, 0.022, 0.62, C.wood, x, 0.06, front + 0.32, 6);
  b.box(1.56, 0.03, 0.4, t, 0, 0.66, front + 0.15, 0.2).box(1.56, 0.08, 0.02, t, 0, 0.6, front + 0.35);
  storeYard(ctx);
  return 0.96;
}

// The shaduf on the bank at (x, z): two posts and a crossbar, a sweep with a mud counterweight and a bucket hanging over
// the canal at canalX.
function shaduf(ctx, x, z, canalX) {
  const { b, t } = ctx;
  for (const dz of [-0.06, 0.06]) b.cylT(0.022, 0.026, 0.62, C.wood, x, 0.03, z + dz, 6);
  stick(b, 0.02, C.woodD, [x, 0.63, z - 0.1], [x, 0.63, z + 0.1], CYL6);
  b.box(0.06, 0.1, 0.13, t, x, 0.45, z); // team cloth wound on the posts
  const tip = [canalX, 0.98, z + 0.38], tail = [-0.42, 0.42, z - 0.36];
  stick(b, 0.018, C.wood, tail, tip, CYL6);
  b.add(BALL, P.mudD, tail[0], tail[1] - 0.02, tail[2], 0.07, 0.065, 0.07);
  stick(b, 0.005, C.leather, tip, [canalX, 0.3, tip[2]], CYL6);
  b.cylT(0.045, 0.035, 0.07, C.leather, canalX, 0.23, tip[2], 6);
}
// A date palm at the canal head: a three-piece trunk, seven fronds and a cluster of dates.
function datePalm(b) {
  const base = [-0.46, 0.03, -0.6], crown = [-0.4, 1.05, -0.55];
  for (let i = 0; i < 3; i++) {
    stick(b, 0.04 - i * 0.006, i % 2 ? TRUNK : TRUNK_D, lerp(base, crown, i / 3), lerp(base, crown, (i + 1) / 3), CYL6);
  }
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7, dx = Math.cos(angle), dz = Math.sin(angle);
    b.box(0.36, 0.015, 0.08, i % 2 ? PALM : PALM_D, crown[0] + dx * 0.16, crown[1] - 0.05, crown[2] + dz * 0.16, 0, -angle, -0.45);
  }
  b.add(BALL, DATES, crown[0], crown[1] - 0.1, crown[2], 0.07, 0.06, 0.07);
}
// Barley: rows of tufts with ears in each basin, green in two basins and ripening in the others; none under the shade
// at (shadeX, shadeZ) or the palm.
function barley(basinsX, basinsZ, shadeX, shadeZ) {
  const crops = new B(), rows = 6, cols = 6;
  for (const [i, [x0, x1]] of basinsX.entries()) for (const [j, [z0, z1]] of basinsZ.entries()) {
    const ripe = (i + j) % 2;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const x = x0 + 0.08 + col * (x1 - x0 - 0.16) / (cols - 1) + (hash(row + 5 * i, col + 7 * j) - 0.5) * 0.03;
      const z = z0 + 0.08 + row * (z1 - z0 - 0.16) / (rows - 1);
      if ((x > shadeX - 0.2 && z > shadeZ - 0.2) || (x < -0.3 && z < -0.42 && z > -0.72)) continue;
      const height = 0.2 + hash(col + 11 * j, row + 3 * i) * 0.08, lean = (hash(row * 7 + i, col * 3 + j) - 0.5) * 0.3;
      const green = ripe ? 0x9a9a45 : [0x6f9a3a, 0x7fa845][(row + col) % 2], sinLean = Math.sin(lean), cosLean = Math.cos(lean);
      crops.add(CONE4, green, x, 0.025 + height / 2, z, 0.045, height, 0.045, lean, 0, -lean); // the tuft
      crops.add(CONE4, green, x + 0.025, 0.025 + height * 0.3, z - 0.015, 0.035, height * 0.6, 0.035, -0.4, 0, -0.5); // a leaf
      // The ear, at the tip of the leaning tuft.
      const earX = x + sinLean * height * 0.55, earY = 0.025 + height / 2 + cosLean * cosLean * height * 0.55;
      const earZ = z + sinLean * cosLean * height * 0.55;
      crops.add(CONE4, ripe ? 0xd8b04a : 0xa8b85a, earX, earY, earZ, 0.026, 0.1, 0.026, lean, 0, -lean);
    }
  }
  return crops.geometry();
}
// Farm: irrigated basins of barley between earth banks, fed from a canal along the left edge through a cross channel;
// a shaduf on the bank to lift the water, a date palm, and the farmer's team-coloured sunshade. The barley is
// extra.crops, which animate() shows once the farm is finished and shrinks as its food runs out.
export function farm(ctx) {
  const { b, t, extra } = ctx, canalX = -0.74, bank = P.mudD;
  b.box(1.76, 0.025, 1.76, FIELD);
  // The canal and its banks.
  b.box(0.15, 0.03, 1.76, WATER, canalX, 0, 0);
  for (const k of [-1, 1]) b.box(0.05, 0.055, 1.76, bank, canalX + k * 0.1, 0, 0);
  // Basins: wet earth inside banks, a cross channel from the canal between the front and back basins.
  const basinsX = [[-0.6, 0.12], [0.18, 0.86]], basinsZ = [[-0.86, -0.07], [0.07, 0.86]];
  for (const [x0, x1] of basinsX) for (const [z0, z1] of basinsZ) {
    b.box(x1 - x0 - 0.04, 0.012, z1 - z0 - 0.04, WET_EARTH, (x0 + x1) / 2, 0.025, (z0 + z1) / 2);
  }
  b.box(1.5, 0.03, 0.06, WATER, 0.11, 0, 0);
  for (const z of [-0.055, 0.055]) b.box(1.5, 0.05, 0.04, bank, 0.11, 0, z);
  for (const z of [-0.86, 0.86]) b.box(1.5, 0.05, 0.05, bank, 0.11, 0, z);
  b.box(0.05, 0.05, 1.76, bank, 0.86, 0, 0).box(0.05, 0.05, 1.76, bank, 0.15, 0, 0);
  shaduf(ctx, -0.6, -0.44, canalX);
  datePalm(b);
  // The farmer's sunshade at the front corner: four poles and a team-coloured cloth.
  const shadeX = 0.68, shadeZ = 0.68;
  for (const [dx, dz] of CORNERS) b.cylT(0.015, 0.015, 0.5, C.wood, shadeX + dx * 0.13, 0.03, shadeZ + dz * 0.13, 5);
  b.box(0.34, 0.025, 0.34, t, shadeX, 0.53, shadeZ).box(0.22, 0.015, 0.16, P.hide, shadeX, 0.04, shadeZ);
  extra.crops = barley(basinsX, basinsZ, shadeX, shadeZ);
  return 1.1;
}

// The barrack hall at the back (hallZ, hallDepth deep, hallHeight high): doorways with bronze lintels, shields between
// them, merlons along its front, a lookout on the roof with the flag.
function barrackHall(ctx, hallZ, hallDepth, hallHeight) {
  const { b, t } = ctx, hallFront = hallZ + hallDepth / 2;
  block(b, 2.7, hallHeight, hallDepth, 0, 0.06, hallZ);
  merlons(b, -1.24, 1.24, hallFront - 0.04, 0.06 + hallHeight + 0.07);
  for (const x of [-0.78, 0, 0.78]) {
    b.box(0.3, 0.55, 0.05, C.dark, x, 0.06, hallFront + 0.01).box(0.38, 0.06, 0.07, C.bronze, x, 0.61, hallFront + 0.02);
  }
  for (const x of [-1.15, -0.39, 0.39, 1.15]) shield(b, t, x, 0.62, hallFront + 0.03);
  block(b, 0.56, 0.42, 0.5, -0.9, 0.06 + hallHeight, hallZ - 0.04); // the lookout
  b.box(0.12, 0.16, 0.04, C.dark, -0.9, 0.06 + hallHeight + 0.16, hallZ + 0.22);
  flag(ctx, -0.9, 0.06 + hallHeight + 0.49, hallZ - 0.04, 0.7, C.woodD, [0.3, 0.52]);
}
// The yard wall, a gate between two towers in front with team banners and bronze caps.
function yardWallAndGate(ctx) {
  const { b, t } = ctx;
  for (const k of [-1, 1]) b.box(0.14, 0.42, 1.96, P.mud, k * 1.3, 0.06, 0.38).box(0.16, 0.05, 1.96, P.mudD, k * 1.3, 0.48, 0.38);
  for (const k of [-1, 1]) {
    b.box(0.88, 0.42, 0.14, P.mud, k * 0.86, 0.06, 1.3).box(0.88, 0.05, 0.16, P.mudD, k * 0.86, 0.48, 1.3); // the front wall
    const towerX = k * 0.42;
    b.box(0.32, 0.86, 0.3, P.mud, towerX, 0.06, 1.22).box(0.36, 0.06, 0.34, P.mudD, towerX, 0.92, 1.22);
    b.box(0.2, 0.06, 0.2, C.bronze, towerX, 0.98, 1.22);
    b.box(0.2, 0.46, 0.02, t, towerX, 0.34, 1.38).box(0.22, 0.04, 0.03, C.bronze, towerX, 0.8, 1.38); // the banner
  }
}
// The spear rack along the left wall at x = rackX, facing the yard, with two shields leaning on it.
function bronzeSpearRack(ctx, rackX) {
  const { b, t } = ctx;
  for (const z of [-0.3, 0.8]) b.cylT(0.03, 0.03, 0.6, C.woodD, rackX, 0.06, z, 6);
  stick(b, 0.025, C.wood, [rackX, 0.6, -0.36], [rackX, 0.6, 0.86], CYL6);
  for (let i = 0; i < 7; i++) {
    const z = -0.22 + i * 0.16, butt = [rackX + 0.2, 0.06, z], head = [rackX - 0.05, 1.08, z];
    stick(b, 0.014, C.wood, butt, head, CYL6);
    stick(b, 0.03, C.bronze, head, lerp(butt, head, 1.1), CONE4);
  }
  for (const [z, r] of [[0.02, 0.12], [0.3, 0.11]]) shield(b, t, rackX + 0.12, 0.2, z, true, r);
}
// A war chariot at (x, z): a wicker car on two spoked wheels, its pole resting on the ground.
function chariot(ctx, x, z) {
  const { b, t } = ctx;
  for (const k of [-1, 1]) {
    b.add(unit.cyl, C.woodD, x + k * 0.17, 0.22, z, 0.16, 0.03, 0.16, 0, 0, Math.PI / 2); // a wheel
    b.add(CYL6, C.bronze, x + k * 0.19, 0.22, z, 0.035, 0.05, 0.035, 0, 0, Math.PI / 2); // its hub
    for (let i = 0; i < 3; i++) b.box(0.012, 0.3, 0.02, C.wood, x + k * 0.17, 0.07, z, i * Math.PI / 3); // spokes
  }
  stick(b, 0.02, C.woodD, [x - 0.2, 0.22, z], [x + 0.2, 0.22, z], CYL6); // the axle
  b.box(0.3, 0.2, 0.2, P.wattle, x, 0.26, z - 0.04).box(0.3, 0.04, 0.2, t, x, 0.46, z - 0.04);
  stick(b, 0.022, C.wood, [x, 0.28, z + 0.06], [x, 0.07, z + 0.7], CYL6);
}
// Barracks: a walled drill yard of trodden sand entered through a gate between two towers hung with team banners; the
// barrack hall at the back with a lookout and the flag, bronze shields on its front, a rack of bronze-tipped spears and
// training posts in the yard.
export function barracks(ctx) {
  const { b } = ctx;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.5, 0.012, 1.86, SAND, 0, 0.06, 0.37);
  barrackHall(ctx, -0.98, 0.76, 0.95);
  yardWallAndGate(ctx);
  bronzeSpearRack(ctx, -1.14);
  // Training posts: a post with arms and a straw head.
  for (const [x, z] of [[0.45, 0.3], [-0.25, 0.65], [0.75, 0.85]]) {
    b.cylT(0.04, 0.045, 0.78, C.woodD, x, 0.06, z, 6).cylT(0.09, 0.1, 0.3, C.hay, x, 0.4, z, 6);
    b.add(BALL, C.hay, x, 0.8, z, 0.08, 0.08, 0.08);
    stick(b, 0.02, C.wood, [x - 0.22, 0.6, z], [x + 0.22, 0.6, z], CYL6);
  }
  chariot(ctx, 0.95, -0.12);
  brazier(b, 0.95, 0.06, -0.48);
  return 1.5;
}

// A straw target at (x, y, z) on a stand: straw discs ringed in white, team colour and bronze, arrowCount arrows in it.
function bronzeTarget(ctx, x, y, z, arrowCount) {
  const { b, t } = ctx;
  for (const k of [-1, 1]) stick(b, 0.022, C.wood, [x + k * 0.18, 0.06, z + 0.08], [x + k * 0.1, y + 0.18, z - 0.02], CYL6);
  stick(b, 0.02, C.woodD, [x, 0.06, z - 0.22], [x, y + 0.14, z - 0.02], CYL6);
  b.add(unit.cyl, C.hay, x, y, z, 0.26, 0.12, 0.26, Math.PI / 2, 0, 0);
  b.add(unit.cyl, C.hay, x, y, z, 0.27, 0.08, 0.27, Math.PI / 2, 0, 0);
  b.add(unit.cyl, LINEN, x, y, z + 0.065, 0.2, 0.01, 0.2, Math.PI / 2, 0, 0);
  b.add(unit.cyl, t, x, y, z + 0.07, 0.14, 0.01, 0.14, Math.PI / 2, 0, 0);
  b.add(unit.cyl, C.bronze, x, y, z + 0.075, 0.055, 0.01, 0.055, Math.PI / 2, 0, 0);
  for (const [dx, dy] of [[0.07, 0.05], [-0.1, -0.08], [0.02, -0.12]].slice(0, arrowCount)) {
    const nock = [x + dx, y + dy, z + 0.05];
    stick(b, 0.008, C.wood, nock, [nock[0] + 0.02, nock[1] + 0.03, nock[2] + 0.3], CYL6);
    b.box(0.004, 0.035, 0.07, LINEN, nock[0] + 0.02, nock[1] + 0.01, nock[2] + 0.27); // the fletching
  }
}
// The archers' shelter at (x, z): four brick piers, a flat roof with a team awning, a bow rack and arrow baskets.
function archersShelter(ctx, x, z) {
  const { b, t } = ctx;
  for (const [dx, dz] of CORNERS) b.box(0.13, 0.82, 0.13, P.mud, x + dx * 0.42, 0.06, z + dz * 0.22);
  b.box(1.04, 0.07, 0.6, P.mudD, x, 0.88, z);
  b.box(1.0, 0.025, 0.2, t, x, 0.8, z + 0.36, 0.3).box(1.0, 0.1, 0.015, t, x, 0.68, z + 0.46); // the awning
  stick(b, 0.02, C.woodD, [x - 0.42, 0.55, z - 0.22], [x + 0.42, 0.55, z - 0.22], CYL6);
  for (const dx of [-0.25, 0, 0.25]) b.add(unit.tor, C.woodD, x + dx, 0.4, z - 0.2, 0.16, 0.16, 0.16, 0, 0, Math.PI / 2); // bows
  for (const dx of [0.1, 0.32]) {
    b.cylT(0.06, 0.05, 0.22, C.leather, x + dx, 0.06, z + 0.1, 6);
    for (const k of [-0.025, 0.025]) b.box(0.006, 0.12, 0.006, LINEN, x + dx + k, 0.28, z + 0.1);
  }
}
// Archery Range: three lanes of sand between low kerbs, straw targets painted in team colour on stands before a high
// mud-brick butt wall, and at the front the archers' shelter of brick piers and a team awning with a bow rack.
export function archery_range(ctx) {
  const { b } = ctx;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.56, 0.012, 2.2, SAND, 0, 0.06, -0.1);
  // The butt: a thick bank of brick behind the targets.
  block(b, 2.7, 0.78, 0.36, 0, 0.06, -1.18);
  merlons(b, -1.2, 1.2, -1.02, 0.91);
  buttresses(b, -1.2, 1.2, 0.6, -0.99, 0.06, 0.78);
  // Lane kerbs and the shooting line.
  for (const x of [-0.44, 0.44]) b.box(0.06, 0.05, 1.8, P.mudD, x, 0.06, -0.1);
  b.box(2.5, 0.05, 0.08, LIME, 0, 0.06, 0.82);
  for (const [i, x] of [-0.86, 0, 0.86].entries()) bronzeTarget(ctx, x, 0.52, -0.84, 2 + (i % 2));
  archersShelter(ctx, -0.82, 0.92);
  // A bronze-banded arrow chest and spare targets by the butt.
  b.box(0.36, 0.2, 0.24, C.wood, 1.0, 0.06, 0.55).box(0.38, 0.03, 0.26, C.bronze, 1.0, 0.18, 0.55);
  b.add(unit.cyl, C.hay, 1.1, 0.27, -0.6, 0.2, 0.1, 0.2, 0, 0, Math.PI / 2 - 0.3);
  return 1.05;
}

// The reed shade on the stable's roof (at roofY) over the stored fodder, with the flag.
function reedShade(ctx, roofY) {
  const { b } = ctx;
  for (const [x, z] of [[-1.2, -1.28], [0.2, -1.28], [-1.2, -0.68], [0.2, -0.68]]) {
    b.cylT(0.025, 0.025, 0.42, C.wood, x, roofY, z, 6);
  }
  for (let i = 0; i < 6; i++) { // reed mats, alternately tipped
    const odd = i % 2, y = roofY + 0.41 - odd * 0.012;
    b.box(0.27, 0.04, 0.78, odd ? C.thatchD : C.thatch, -1.17 + i * 0.27, y, -0.98, 0.1, 0, (odd ? 1 : -1) * 0.04);
  }
  b.box(1.6, 0.06, 0.05, C.woodD, -0.5, roofY + 0.38, -0.6);
  for (const [x, z] of [[-0.95, -1.05], [-0.6, -1.08], [-0.25, -1.02], [-0.78, -0.85]]) {
    b.box(0.3, 0.17, 0.2, C.hay, x, roofY, z, 0, x); // fodder
  }
  flag(ctx, 1.05, roofY, -1.1, 0.75, C.woodD, [0.3, 0.52]);
}
// The horse yard: brick piers carrying two rails, open at the front-right as a gate.
const YARD_PIERS = [[-1.3, -0.58], [-1.3, 0.36], [-1.3, 1.3], [-0.4, 1.3], [0.4, 1.3], [1.3, 1.3], [1.3, 0.36], [1.3, -0.58]];
function horseYard(b) {
  const rail = (from, to) => {
    for (const y of [0.32, 0.54]) stick(b, 0.025, C.wood, [from[0], y, from[1]], [to[0], y, to[1]], CYL6);
  };
  for (const [x, z] of YARD_PIERS) b.box(0.13, 0.62, 0.13, P.mud, x, 0.06, z).box(0.16, 0.04, 0.16, P.mudD, x, 0.68, z);
  for (let i = 0; i < YARD_PIERS.length - 1; i++) if (i !== 3) rail(YARD_PIERS[i], YARD_PIERS[i + 1]);
}
// Stable: a mud-brick stable block with four stall doorways and fodder under a reed shade on its roof; before it a
// horse yard of brick piers and rails with a water trough, a hay stack and two horses in team saddle cloths.
export function stable(ctx) {
  const { b, t } = ctx, hallZ = -0.96, hallDepth = 0.8, hallHeight = 0.9, hallFront = hallZ + hallDepth / 2;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.5, 0.012, 1.84, YARD, 0, 0.06, 0.38);
  block(b, 2.7, hallHeight, hallDepth, 0, 0.06, hallZ);
  for (const x of [-0.99, -0.33, 0.33, 0.99]) { // the stall doorways and their half-doors
    b.box(0.38, 0.66, 0.05, C.dark, x, 0.06, hallFront + 0.01).box(0.36, 0.3, 0.04, C.wood, x, 0.06, hallFront + 0.04);
    b.box(0.46, 0.07, 0.07, C.woodD, x, 0.72, hallFront + 0.02);
  }
  buttresses(b, -1.32, 1.32, 0.66, hallFront + 0.02, 0.06, hallHeight);
  b.box(0.24, 0.38, 0.02, t, 0, 0.35, hallFront + 0.03);
  reedShade(ctx, 0.06 + hallHeight + 0.07);
  horseYard(b);
  // The water trough along the right fence and a hay stack at the left.
  b.box(0.22, 0.2, 0.9, P.mudD, 1.08, 0.06, 0.4).box(0.16, 0.02, 0.84, WATER, 1.08, 0.24, 0.4);
  b.box(0.42, 0.3, 0.36, C.hay, -1.0, 0.06, 0.95).box(0.38, 0.14, 0.32, C.thatch, -1.0, 0.36, 0.95, 0, 0.2);
  place(b, horse(t), -0.25, 0.06, 0.5, 0.5);
  place(b, horse(t, true), 0.75, 0.06, 0.62, -Math.PI / 2 + 0.4);
  return 1.52;
}

// A bazaar canopy w × d on four poles, its ridge along x at height hh: striped cloth (colours alternate) in two slopes.
const canopy = (b, x, z, w, d, hh, colours) => {
  for (const [dx, dz] of CORNERS) b.cylT(0.02, 0.02, hh - 0.12, C.wood, x + dx * (w / 2 - 0.04), 0.06, z + dz * (d / 2 - 0.04), 5);
  const stripes = 5, rise = 0.16, slope = Math.hypot(d / 2, rise) + 0.02, tilt = Math.atan2(rise, d / 2);
  for (let i = 0; i < stripes; i++) for (const k of [-1, 1]) {
    const stripeX = x - w / 2 + (i + 0.5) * w / stripes, stripeY = 0.06 + hh - 0.12 + rise / 2 - 0.01;
    b.box(w / stripes + 0.002, 0.02, slope, colours[i % colours.length], stripeX, stripeY, z + k * d / 4, k * tilt);
  }
  b.box(w + 0.02, 0.07, 0.012, colours[0], x, 0.06 + hh - 0.19, z + d / 2 + 0.005); // the valance
};
// A brick counter w wide at (x, z), with its top.
const counter = (b, x, z, w) => b.box(w, 0.26, 0.3, P.mud, x, 0.06, z).box(w + 0.04, 0.03, 0.34, P.mudD, x, 0.32, z);
// Back left: the potter's stall.
function pottersStall(ctx) {
  const { b, t } = ctx;
  canopy(b, -0.68, -0.78, 1.0, 0.78, 1.0, [t, C.cloth]);
  counter(b, -0.68, -0.68, 0.84);
  for (const [i, x] of [-0.98, -0.78, -0.58, -0.38].entries()) jar(b, x, 0.35, -0.68, 0.06 + (i % 2) * 0.015, null);
  for (const x of [-0.95, -0.7]) jar(b, x, 0.06, -0.98, 0.1, null);
}
// Back right: the weaver's stall, rugs stacked and one unrolled.
function weaversStall(b) {
  canopy(b, 0.62, -0.8, 1.04, 0.78, 1.08, [OCHRE, C.cloth]);
  counter(b, 0.62, -0.7, 0.86);
  for (const [i, c] of [BROWN, OCHRE, RUST, C.cloth].entries()) { // the stacked rugs
    b.box(0.5, 0.035, 0.24, c, 0.5, 0.35 + i * 0.035, -0.7, 0, (i - 1.5) * 0.06);
  }
  for (const [i, c] of [MADDER, PALM_D, OCHRE].entries()) { // bolts of cloth
    b.add(CYL6, c, 0.9, 0.39, -0.8 + i * 0.1, 0.045, 0.24, 0.045, 0, 0, Math.PI / 2);
  }
  // The unrolled rug, its borders one inside the other.
  b.box(0.62, 0.012, 0.42, MADDER, 0.55, 0.075, -0.2).box(0.52, 0.014, 0.32, OCHRE, 0.55, 0.077, -0.2);
  b.box(0.36, 0.016, 0.18, RUST, 0.55, 0.079, -0.2).box(0.12, 0.018, 0.06, C.cloth, 0.55, 0.081, -0.2);
}
// Front left: the grocer's stall, baskets of dates, grain and melons.
function grocersStall(ctx) {
  const { b, t } = ctx;
  canopy(b, -0.72, 0.62, 0.9, 0.76, 0.94, [C.cloth, t]);
  counter(b, -0.72, 0.72, 0.76);
  for (const [i, c] of [MADDER, C.hay, MELON].entries()) {
    const x = -0.98 + i * 0.26;
    b.cylT(0.1, 0.08, 0.1, P.wattle, x, 0.35, 0.72, 6).add(BALL, c, x, 0.45, 0.72, 0.085, 0.05, 0.085);
  }
  for (const [x, z] of [[-0.4, 0.98], [-0.28, 1.06]]) b.add(BALL, MELON, x, 0.13, z, 0.08, 0.07, 0.08);
}
// Front right: the money-changer's table with a bronze balance, under an awning.
function moneyChanger(ctx) {
  const { b, t } = ctx;
  canopy(b, 0.72, 0.78, 0.74, 0.6, 0.86, [OCHRE, t]);
  b.box(0.5, 0.24, 0.28, C.wood, 0.72, 0.06, 0.8).box(0.54, 0.03, 0.32, C.woodD, 0.72, 0.3, 0.8);
  b.cylT(0.012, 0.012, 0.24, C.bronze, 0.72, 0.33, 0.8, 5).box(0.3, 0.015, 0.015, C.bronze, 0.72, 0.56, 0.8); // the balance
  for (const k of [-1, 1]) {
    const panX = 0.72 + k * 0.14;
    b.box(0.004, 0.13, 0.004, C.bronze, panX, 0.43, 0.8).cylT(0.05, 0.035, 0.02, C.bronze, panX, 0.42, 0.8, 8); // a pan on its cord
  }
  for (const [x, z] of [[0.6, 0.86], [0.63, 0.75]]) b.cylT(0.025, 0.025, 0.015, C.gold, x, 0.33, z, 6);
}
// Market: a bazaar of striped canopies (two in team colour) over brick counters piled with goods: jars, rugs, baskets
// of dates and grain, and a bronze balance; a well in the square and a low wall at the back.
export function market(ctx) {
  const { b } = ctx;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.56, 0.012, 2.56, SAND, 0, 0.06, 0);
  b.box(2.7, 0.36, 0.12, P.mud, 0, 0.06, -1.3).box(2.74, 0.05, 0.16, P.mudD, 0, 0.42, -1.3); // the back wall
  b.box(0.12, 0.36, 2.4, P.mud, -1.3, 0.06, -0.06).box(0.16, 0.05, 2.4, P.mudD, -1.3, 0.42, -0.06); // the left wall
  pottersStall(ctx);
  weaversStall(b);
  grocersStall(ctx);
  moneyChanger(ctx);
  // The well in the square.
  b.cylT(0.2, 0.22, 0.26, P.mudD, 0.0, 0.06, 0.05, 10).cylT(0.15, 0.15, 0.01, WATER, 0.0, 0.3, 0.05, 10);
  for (const k of [-1, 1]) b.cylT(0.02, 0.02, 0.5, C.wood, k * 0.2, 0.06, 0.05, 5);
  stick(b, 0.018, C.woodD, [-0.24, 0.56, 0.05], [0.24, 0.56, 0.05], CYL6);
  jar(b, 0.3, 0.06, 0.25, 0.08, null);
  return 1.2;
}

// The palace terrace (its top at terraceTop, its front at terraceFront), its front buttressed and hung with team
// panels either side of the grand ramp, braziers at its corners.
function palaceTerrace(ctx, terraceTop, terraceFront) {
  const { b, t } = ctx, rampFoot = 1.33, rampHeight = terraceTop - 0.06;
  block(b, 2.5, rampHeight, 1.88, 0, 0.06, -0.39);
  buttresses(b, -1.2, 1.2, 0.3, terraceFront + 0.02, 0.06, rampHeight);
  for (const k of [-1, 1]) {
    const panelZ = terraceFront + 0.05;
    b.box(0.3, 0.3, 0.02, t, k * 0.78, 0.1, panelZ).box(0.32, 0.04, 0.03, C.bronze, k * 0.78, 0.4, panelZ);
  }
  b.add(WEDGE, STAIR, 0, 0.06, terraceFront, 0.84, rampHeight, rampFoot - terraceFront); // the grand ramp
  const length = Math.hypot(rampFoot - terraceFront, rampHeight), tilt = Math.atan2(rampHeight, rampFoot - terraceFront);
  for (const k of [-1, 1]) b.box(0.08, 0.1, length, P.mudD, k * 0.46, (terraceTop + 0.06) / 2, (terraceFront + rampFoot) / 2, tilt);
  for (const k of [-1, 1]) brazier(b, k * 1.1, terraceTop, 0.42);
}
// The hall on the terrace: whitewashed, a team frieze under its coping, bronze doors and banners behind the columns.
function palaceHall(ctx, floor, roofTop) {
  const { b, t } = ctx, hallZ = -0.8, hallFront = -0.3;
  block(b, 2.0, roofTop - floor, 1.0, 0, floor, hallZ, LIME, LIME_D);
  b.box(2.02, 0.08, 1.02, t, 0, roofTop - 0.16, hallZ);
  b.box(0.4, 0.62, 0.04, C.bronze, 0, floor, hallFront + 0.01).box(0.02, 0.62, 0.05, C.dark, 0, floor, hallFront + 0.02);
  b.box(0.5, 0.06, 0.06, C.bronze, 0, floor + 0.62, hallFront + 0.02);
  for (const k of [-1, 1]) {
    const bannerZ = hallFront + 0.02;
    b.box(0.2, 0.5, 0.02, t, k * 0.62, floor + 0.2, bannerZ).box(0.22, 0.03, 0.03, C.bronze, k * 0.62, floor + 0.7, bannerZ);
  }
}
// The portico: six columns, an architrave and a flat roof with stepped merlons.
function palacePortico(b, floor, roofTop) {
  for (let i = 0; i < 6; i++) {
    const x = -0.9 + i * 0.36, z = 0.26;
    b.cylT(0.09, 0.1, 0.06, C.bronze, x, floor, z, 8).cylT(0.06, 0.075, 0.72, LIME, x, floor + 0.06, z, 8);
    b.cylT(0.13, 0.06, 0.13, C.bronze, x, floor + 0.78, z, 8); // the papyrus capital
  }
  b.box(2.04, 0.08, 0.68, LIME_D, 0, roofTop - 0.06, -0.02).box(2.06, 0.1, 0.14, LIME, 0, roofTop - 0.1, 0.27);
  merlons(b, -0.92, 0.92, 0.3, roofTop + 0.02, false, LIME_D);
}
// Government Center: a palace on a brick terrace. A grand ramp climbs to a portico of plastered columns with bronze
// papyrus capitals; behind it the whitewashed hall with a team frieze, bronze doors and banners; a second ramp up the
// side to the roof, and an upper storey flying the flag.
export function government_center(ctx) {
  const { b } = ctx, terraceTop = 0.46, roofTop = 1.38;
  b.box(2.76, 0.06, 2.76, P.mudD);
  palaceTerrace(ctx, terraceTop, 0.55);
  palaceHall(ctx, terraceTop, roofTop);
  palacePortico(b, terraceTop, roofTop);
  b.add(WEDGE, STAIR, 1.13, terraceTop, -1.27, 0.2, roofTop - terraceTop, 0.95); // the side ramp up to the roof
  // The upper storey with windows, merlons and the flag.
  block(b, 0.9, 0.5, 0.62, -0.1, roofTop + 0.02, -0.88, LIME, LIME_D);
  for (const x of [-0.35, -0.1, 0.15]) b.box(0.08, 0.16, 0.03, C.dark, x, roofTop + 0.24, -0.56);
  merlons(b, -0.5, 0.3, -0.58, roofTop + 0.59, false, LIME_D);
  flag(ctx, 0.25, roofTop + 0.59, -1.1, 0.7, C.woodD, [0.3, 0.52]);
  return 2.12;
}

// A square pyramid of half-side hs and height hh standing on y: limestone courses (frustum) under a gilded capstone
// (the top `cap` of its height).
const pyramid = (b, x, y, z, hs, hh, cap = 0.1, c = LIMESTONE) => {
  const radius = hs * Math.SQRT2;
  b.cylT(radius * cap, radius, hh * (1 - cap), c, x, y, z, 4, 0, Math.PI / 4);
  b.cone(radius * cap, hh * cap, C.gold, x, y + hh * (1 - cap), z, 4, Math.PI / 4);
};
// A sphinx couchant facing +x, built at the origin.
const SPHINX = 0xd2b98a, SPHINX_D = 0xc2a675;
const sphinx = () => {
  const s = new B();
  s.box(0.5, 0.14, 0.2, SPHINX, -0.08, 0, 0).box(0.18, 0.1, 0.22, SPHINX, -0.24, 0.1, 0); // the body and haunches
  for (const k of [-1, 1]) s.box(0.26, 0.05, 0.06, SPHINX, 0.24, 0, k * 0.065); // the forepaws
  s.box(0.14, 0.24, 0.17, SPHINX, 0.12, 0.08, 0); // the chest
  s.add(FRUSTUM, SPHINX_D, 0.13, 0.3, 0, 0.1, 0.16, 0.12).box(0.04, 0.12, 0.1, SPHINX, 0.2, 0.26, 0); // the headdress, face
  s.box(0.2, 0.025, 0.05, SPHINX_D, -0.36, 0.02, 0.1, 0, 0.4); // the tail
  return s;
};
// The pylon at x = centreX, z = gateZ: two battered towers either side of the gate, team banners on their faces,
// flagstaffs with pennants.
function pylon(ctx, centreX, gateZ) {
  const { b, mast, t } = ctx, height = 1.1, slope = Math.atan(0.3 * 0.17 / height);
  for (const k of [-1, 1]) {
    const x = centreX + k * 0.47, staffX = x + k * 0.25;
    b.add(FRUSTUM, LIMESTONE, x, 0.05 + height / 2, gateZ, 0.34, height, 0.17);
    b.box(0.56, 0.08, 0.3, PAVING, x, 0.05 + height, gateZ).box(0.5, 0.04, 0.25, LIMESTONE, x, 0.13 + height, gateZ);
    b.box(0.3, 0.66, 0.02, t, x, 0.26, gateZ + 0.16, -slope).box(0.32, 0.04, 0.03, C.gold, x, 0.92, gateZ + 0.13, -slope);
    mast.cyl(0.02, 1.62, C.woodD, staffX, 0.05, gateZ + 0.2); // the flagstaff and its pennants
    mast.box(0.014, 0.13, 0.26, t, staffX, 1.48, gateZ + 0.33).box(0.014, 0.06, 0.16, t, staffX, 1.34, gateZ + 0.28);
  }
  b.box(0.26, 0.66, 0.06, C.dark, centreX, 0.05, gateZ).box(0.4, 0.12, 0.26, LIMESTONE, centreX, 0.71, gateZ); // the gate
  b.box(0.42, 0.04, 0.27, C.gold, centreX, 0.76, gateZ);
}
// Wonder: a great pyramid with a gilded capstone, two queens' pyramids beside it, and before it a temple pylon with
// team banners and pennants on tall flagstaffs, two obelisks at its gate and a sphinx keeping watch.
export function wonder(ctx) {
  const { b } = ctx, pyramidX = -0.4, pyramidZ = -0.4;
  b.box(3.76, 0.05, 3.76, 0xd8c08a);
  b.box(2.9, 0.06, 2.9, PAVING, pyramidX, 0.05, pyramidZ);
  pyramid(b, pyramidX, 0.11, pyramidZ, 1.4, 3.9);
  for (const z of [-1.42, -0.52]) {
    b.box(0.8, 0.04, 0.8, PAVING, 1.45, 0.05, z);
    pyramid(b, 1.45, 0.09, z, 0.36, 0.86, 0.08);
  }
  b.box(0.42, 0.05, 0.5, PAVING, pyramidX, 0.05, 1.2); // the causeway from the pyramid to the pylon
  pylon(ctx, pyramidX, 1.4);
  // Obelisks at the gate and the sphinx at the corner.
  for (const k of [-1, 1]) {
    const x = pyramidX + k * 0.22;
    b.add(FRUSTUM, 0xd9c49a, x, 0.65, 1.76, 0.065, 1.1, 0.065).cone(0.065, 0.12, C.gold, x, 1.2, 1.76, 4, Math.PI / 4);
  }
  place(b, sphinx(), 1.25, 0.05, 1.25, -Math.PI / 4, 1.5);
  return 4.02;
}

// ---------- Bronze defences ----------
// A square block of half-side 1 at y = -0.5 battered in to 0.86 at y = 0.5: a mud-brick tower's sloping walls.
const BATTER = new THREE.CylinderGeometry(0.86, 1, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2);
const MUD_L = 0xd2ab78;
// The mud-brick tower: its walls' foot, their height, the half-width at the foot and the walls' top.
const TOWER_FOOT = 0.18, TOWER_HEIGHT = 2.0, TOWER_HALF = 0.64, TOWER_TOP = TOWER_FOOT + TOWER_HEIGHT;
// The half-width of the battered walls at height y.
const faceAt = y => TOWER_HALF * (1 - 0.14 * (y - TOWER_FOOT) / TOWER_HEIGHT);
// The four faces' outward directions for a point u along the face: [x, z, outX, outZ].
const FACES = u => [[u, 0, 0, 1], [u, 0, 0, -1], [0, u, 1, 0], [0, u, -1, 0]];

// Cedar beam ends poking out under the parapet, on every face.
function beamEnds(b) {
  const y = TOWER_TOP - 0.16, face = faceAt(y);
  for (const u of [-0.36, -0.12, 0.12, 0.36]) for (const [x, z, outX, outZ] of FACES(u)) {
    const inner = [x + outX * (face - 0.04), y, z + outZ * (face - 0.04)];
    const outer = [x + outX * (face + 0.1), y, z + outZ * (face + 0.1)];
    stick(b, 0.032, C.wood, inner, outer, CYL6);
  }
}
// The bronze door at the foot, the slits above it and on the side, the outside stair up the +x face to a side door.
function towerDoorsAndStair(b) {
  const doorZ = faceAt(0.5) + 0.005;
  b.box(0.3, 0.5, 0.03, C.dark, 0, TOWER_FOOT, doorZ).box(0.26, 0.46, 0.02, C.bronze, 0, TOWER_FOOT, doorZ + 0.012);
  b.box(0.02, 0.46, 0.03, C.dark, 0, TOWER_FOOT, doorZ + 0.02).box(0.4, 0.07, 0.06, C.wood, 0, TOWER_FOOT + 0.5, doorZ + 0.01);
  for (const [x, y] of [[0, 1.0], [-0.3, 1.7], [0.3, 1.7]]) b.box(0.06, 0.22, 0.03, C.dark, x, y, faceAt(y) + 0.008);
  for (const z of [-0.3, 0.3]) b.box(0.03, 0.22, 0.06, C.dark, faceAt(1.7) + 0.008, 1.7, z);
  const stairX = faceAt(0.6) + 0.12;
  for (let i = 0; i < 6; i++) b.box(0.22, 0.15 * (i + 1), 0.16, STAIR, stairX, 0.06, 0.62 - i * 0.16);
  b.box(0.03, 0.4, 0.22, C.dark, faceAt(1.1) + 0.005, 0.96, -0.3);
}
// On the roof: the team awning on four poles, a brazier, a jar of water and an arrow basket.
function towerRoof(ctx) {
  const { b, t } = ctx, roof = TOWER_TOP + 0.24;
  for (const [x, z] of [[-0.48, -0.48], [-0.48, 0.0], [0.0, -0.48], [0.0, 0.0]]) b.cylT(0.022, 0.022, 0.5, C.wood, x, roof, z, 6);
  b.box(0.6, 0.03, 0.6, t, -0.24, TOWER_TOP + 0.74, -0.24, 0.08, 0, -0.08).box(0.6, 0.08, 0.02, t, -0.24, TOWER_TOP + 0.68, 0.07);
  brazier(b, 0.35, roof, 0.35);
  jar(b, -0.3, roof, 0.32, 0.08);
  b.cylT(0.08, 0.06, 0.14, P.wattle, 0.32, roof, -0.3, 6);
}
// Tower: a mud-brick tower. Battered walls on a plinth course rise to a corbelled parapet of stepped merlons, cedar
// beam ends poking out under it; a team band girds the tower, bronze-faced shields hang on the parapet and a bronze
// door opens at its foot under arrow slits. An outside stair climbs to a side door; on the roof a team awning shades
// the archers beside a brazier, and the flag flies. Its shot is a flight of bronze-tipped arrows over the merlons
// (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, top = TOWER_TOP;
  b.box(1.72, 0.06, 1.72, P.mudD).box(1.42, 0.12, 1.42, P.mudD, 0, 0.06, 0);
  b.add(BATTER, P.mud, 0, TOWER_FOOT + TOWER_HEIGHT / 2, 0, TOWER_HALF, TOWER_HEIGHT, TOWER_HALF);
  // The team band and a darker course near the foot.
  for (const [y, height, color] of [[1.42, 0.12, t], [0.5, 0.05, P.mudD]]) {
    const width = 2 * faceAt(y) + 0.025;
    b.box(width, height, width, color, 0, y, 0);
  }
  beamEnds(b);
  // The corbelled parapet, its stepped merlons, and the shields hung on its camera faces.
  block(b, 1.24, 0.24, 1.24, 0, top, 0);
  const merlonY = top + 0.31;
  for (const k of [-1, 1]) {
    merlons(b, -0.55, 0.55, k * 0.58, merlonY);
    merlons(b, -0.33, 0.33, k * 0.58, merlonY, true);
  }
  shield(b, t, -0.3, top + 0.12, 0.625);
  shield(b, t, 0.3, top + 0.12, 0.625);
  shield(b, t, 0.625, top + 0.12, 0, true);
  towerDoorsAndStair(b);
  towerRoof(ctx);
  // Storage jars at the foot.
  jar(b, -0.74, 0.06, 0.55, 0.1, t);
  jar(b, -0.74, 0.06, 0.78, 0.08);
  flag(ctx, -0.42, top + 0.24, -0.42, 0.95);
  extra.fire = { geo: arrowFlight(), at: [0, merlonY, 0] };
  return top + 0.77;
}
// The tower's shot: a flight of arrows, out over the merlons to the camera sides.
function arrowFlight() {
  const fire = new B();
  for (const [dx, dz, y] of [[0.25, 1, 0.12], [1, 0.25, 0.12], [-0.3, 1, 0.02]]) {
    const length = Math.hypot(dx, dz), ux = dx / length, uz = dz / length;
    streak(fire, [ux * 0.62, y, uz * 0.62], [ux * 1.45, y - 0.2, uz * 1.45], 0.028, undefined, P.ember, 0.075);
  }
  return fire.geometry();
}

// Wall: a mud-brick wall. A niched block of brick (pilasters at its corners and the middle of every face) on a darker
// footing, girded by a team band under the coping and crowned with stepped merlons; it fills its tile edge to edge, so
// segments in a line close up into one wall, the pilasters pairing up at the joins.
export function wall(ctx) {
  const { b, t } = ctx, footing = 0.08, top = 0.62, height = top - footing;
  b.box(1, footing, 1, P.mudD).box(0.96, height, 0.96, P.mud, 0, footing, 0);
  for (const [x, z] of CORNERS) b.box(0.12, height, 0.12, MUD_L, x * 0.44, footing, z * 0.44);
  for (const [x, z, w, d] of [[0, 0.49, 0.14, 0.02], [0, -0.49, 0.14, 0.02], [0.49, 0, 0.02, 0.14], [-0.49, 0, 0.02, 0.14]]) {
    b.box(w, height, d, MUD_L, x, footing, z);
  }
  b.box(1, 0.06, 1, t, 0, top, 0).box(1, 0.06, 1, P.mudD, 0, top + 0.06, 0); // the team band and the coping
  const merlonY = top + 0.12;
  for (const [x, z] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
    b.box(0.16, 0.1, 0.16, P.mud, x * 0.36, merlonY, z * 0.36).box(0.08, 0.08, 0.08, P.mud, x * 0.36, merlonY + 0.1, z * 0.36);
  }
  return merlonY + 0.18;
}
