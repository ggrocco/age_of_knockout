// Bronze Age: Mesopotamian and Egyptian mud-brick, flat roof terraces, ramps and stairs, columns and bronze ornament;
// a stepped ziggurat with a shrine, domed silos, irrigated basins with a shaduf, a palace on a terrace and a great
// pyramid.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, stick, lerp, hash, place } from './kit.js';

export function house(ctx) {
  const { b, s, t } = ctx, W = s - 0.2;
  b.box(s + 0.1, 0.1, s + 0.1, P.mudD).box(W, 0.82, W, P.mud, 0, 0.1, 0);
  for (const k of [-1, 1]) b.box(W, 0.14, 0.08, P.mudD, 0, 0.92, k * W / 2).box(0.08, 0.14, W, P.mudD, k * W / 2, 0.92, 0);
  // Roof-terrace awning in team colour, an outside stair, the door and a vent, and storage jars on the roof.
  b.box(0.04, 0.45, 0.04, C.wood, -0.45, 0.92, -0.45).box(0.04, 0.45, 0.04, C.wood, 0.45, 0.92, -0.45).box(1.0, 0.03, 0.6, t, 0, 1.33, -0.22, 0.12);
  for (let i = 0; i < 5; i++) b.box(0.24, 0.18 * (i + 1), 0.2, P.mudD, W / 2 + 0.12, 0.1, 0.55 - i * 0.2);
  b.box(0.3, 0.5, 0.04, C.dark, -0.2, 0.1, W / 2 + 0.01).box(0.12, 0.08, 0.04, C.dark, 0.3, 0.6, W / 2 + 0.01);
  b.sph(0.08, 0xa56843, -0.3, 1.02, 0.25, 1, 1.25, 1).sph(0.07, 0xa56843, -0.12, 1.0, 0.3, 1, 1.25, 1);
  return 1.4;
}

export function town_center(ctx) {
  const { b, s, t } = ctx;
  b.box(s, 0.55, s, P.mud).box(s - 0.7, 0.5, s - 0.7, P.mudD, 0, 0.55, 0).box(s - 1.4, 0.45, s - 1.4, P.mud, 0, 1.05, 0);
  for (let i = 0; i < 8; i++) b.box(0.55, 0.19 * (i + 1), 0.17, 0xb88f5c, 0, 0, s / 2 + 0.16 - i * 0.17); // the grand stair
  b.box(0.62, 0.45, 0.62, 0xe0c9a0, 0, 1.5, 0).box(0.2, 0.3, 0.04, C.dark, 0, 1.5, 0.31).cone(0.44, 0.35, C.bronze, 0, 1.95, 0, 4, Math.PI / 4); // shrine
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cylT(0.08, 0.05, 0.14, C.bronze, x * (s / 2 - 0.18), 0.55, z * (s / 2 - 0.18), 8).cone(0.07, 0.16, P.fire, x * (s / 2 - 0.18), 0.69, z * (s / 2 - 0.18), 5);
  for (const x of [-0.85, 0.85]) b.box(0.3, 0.46, 0.02, t, x, 0.05, s / 2 + 0.01).box(0.3, 0.05, 0.03, C.bronze, x, 0.5, s / 2 + 0.01);
  flag(ctx, 0, 2.28, 0, 0.6);
  return 2.3;
}

// ---------- shared Bronze parts ----------
// Low-poly shapes for small repeated parts, centred on the origin (DOME: a hemisphere, flat side down at y = 0;
// FRUSTUM: an axis-aligned square base of half-side 1 tapering to 0.7; WEDGE: a ramp of unit size across x, high at
// z = 0 and down to the ground at z = 1).
const DOME = new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), BALL = new THREE.SphereGeometry(1, 6, 4);
const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6), LEAF = new THREE.ConeGeometry(1, 1, 4);
const FRUSTUM = new THREE.CylinderGeometry(0.7, 1, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2);
const WEDGE = (() => {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(0, 1); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(0.5, 0, 0);
  return g;
})();
const STAIR = 0xb88f5c, LIME = 0xe0c9a0, DOMEC = 0xd2aa72, JAR = 0xa56843, SAND = 0xc8ad7a, WATER = 0x3f7fa3;
const HORSE = 0x8a5a33, MANE = 0x3a2a1c, PALM = 0x5d7a32, OCHRE = 0xd9a441, LIMESTONE = 0xc9baa0;

// A flat-roofed mud-brick block standing on y, with a darker coping round its roof edge.
const block = (b, w, hh, d, x, y, z, c = P.mud, cap = P.mudD) => {
  b.box(w, hh, d, c, x, y, z);
  for (const k of [-1, 1]) b.box(w + 0.04, 0.07, 0.08, cap, x, y + hh, z + k * (d / 2 - 0.02)).box(0.08, 0.07, d, cap, x + k * (w / 2 - 0.02), y + hh, z);
};
// Stepped Mesopotamian merlons along a roof edge from x0 to x1 at z (or, with alongZ, from z0 to z1 at x).
const merlons = (b, a0, a1, at, y, alongZ = false, c = P.mudD) => {
  for (let a = a0; a <= a1 + 1e-6; a += 0.22) {
    const [x, z] = alongZ ? [at, a] : [a, at], [w, d] = alongZ ? [0.08, 0.12] : [0.12, 0.08];
    b.box(w, 0.08, d, c, x, y, z).box(w * 0.5, 0.06, d * 0.5 + (alongZ ? 0 : 0.03), c, x, y + 0.08, z);
  }
};
// Shallow buttresses every `step` along a wall face at z, from x0 to x1: the niched Mesopotamian facade.
const buttresses = (b, x0, x1, step, z, y, hh) => { for (let x = x0; x <= x1 + 1e-6; x += step) b.box(0.09, hh, 0.05, P.mudD, x, y, z); };
// A terracotta storage jar of radius r standing on y, with its neck and (optionally) a cloth stopper.
const jar = (b, x, y, z, r, stopper) => {
  b.add(BALL, JAR, x, y + r * 1.1, z, r, r * 1.15, r).add(CYL6, JAR, x, y + r * 2.3, z, r * 0.45, r * 0.5, r * 0.45);
  if (stopper) b.add(CYL6, stopper, x, y + r * 2.58, z, r * 0.5, r * 0.1, r * 0.5);
};
// A round bronze shield with a team-painted face, hung on a wall facing +z (or +x, with facingX).
const shield = (b, t, x, y, z, facingX = false, r = 0.13) => {
  const [rx, rz, ox, oz] = facingX ? [0, Math.PI / 2, 1, 0] : [Math.PI / 2, 0, 0, 1];
  b.add(unit.cyl, C.bronze, x, y, z, r, 0.03, r, rx, 0, rz).add(unit.cyl, t, x + ox * 0.018, y, z + oz * 0.018, r * 0.74, 0.02, r * 0.74, rx, 0, rz)
    .add(BALL, C.bronze, x + ox * 0.03, y, z + oz * 0.03, 0.035, 0.035, 0.035);
};
// A bronze brazier with its fire, standing on y.
const brazier = (b, x, y, z) => b.cylT(0.03, 0.03, 0.22, C.bronze, x, y, z, 6).cylT(0.09, 0.05, 0.1, C.bronze, x, y + 0.22, z, 8).cone(0.07, 0.16, P.fire, x, y + 0.3, z, 5);
// A low-poly horse facing +x at the origin, with a team-coloured saddle cloth.
const horse = (t, grazing = false) => {
  const h = new B();
  h.box(0.44, 0.2, 0.17, HORSE, 0, 0.34, 0);
  for (const [x, z] of [[-0.17, -0.055], [-0.17, 0.055], [0.16, -0.055], [0.16, 0.055]]) h.box(0.055, 0.36, 0.055, HORSE, x, 0, z).box(0.06, 0.04, 0.06, MANE, x, 0, z);
  const [nx, ny, nr] = grazing ? [0.32, 0.36, 0.9] : [0.25, 0.6, -0.55];
  h.box(0.1, 0.3, 0.1, HORSE, nx, ny - 0.15, 0, 0, 0, nr).box(0.03, 0.26, 0.04, MANE, nx - 0.04, ny - 0.13, 0, 0, 0, nr);
  const hx = grazing ? 0.44 : 0.33, hy = grazing ? 0.12 : 0.62;
  h.box(0.2, 0.09, 0.09, HORSE, hx, hy, 0, 0, 0, grazing ? -1.1 : -0.35);
  h.box(0.05, 0.22, 0.04, MANE, -0.25, 0.26, 0, 0, 0, -0.35);
  h.box(0.2, 0.025, 0.19, t, -0.02, 0.535, 0).box(0.2, 0.12, 0.012, t, -0.02, 0.42, 0.093).box(0.2, 0.12, 0.012, t, -0.02, 0.42, -0.093);
  return h;
};

// Granary: beehive silos of mud brick (a drum and a dome, a filling hatch on top, a team band, a door at the foot) in a
// walled yard, a stair up beside the big silo, and the harvest heaped and sacked in front.
export function granary(ctx) {
  const { b, t } = ctx;
  b.box(1.76, 0.06, 1.76, P.mudD);
  b.box(1.7, 0.32, 0.1, P.mud, 0, 0.06, -0.82).box(0.1, 0.32, 1.54, P.mud, -0.82, 0.06, -0.05).box(1.74, 0.05, 0.14, P.mudD, 0, 0.38, -0.82).box(0.14, 0.05, 1.58, P.mudD, -0.82, 0.38, -0.05);
  const silo = (x, z, r, wall) => {
    const y = 0.14, dh = r * 1.15, d = r * 0.71;
    b.cylT(r + 0.05, r + 0.06, 0.08, P.mudD, x, 0.06, z, 10).cylT(r * 0.95, r, wall, P.mud, x, y, z, 10);
    b.cylT(r * 0.96 + 0.012, r * 0.97 + 0.012, 0.07, t, x, y + wall * 0.64, z, 10).add(DOME, DOMEC, x, y + wall, z, r * 0.95, dh, r * 0.95);
    b.cylT(r * 0.2, r * 0.27, 0.08, P.mudD, x, y + wall + dh - 0.05, z, 8).cylT(r * 0.17, r * 0.17, 0.02, C.dark, x, y + wall + dh + 0.025, z, 8);
    b.box(0.13, Math.min(0.3, wall * 0.5), 0.04, C.dark, x + d, y, z + d, 0, Math.PI / 4).box(0.2, 0.04, 0.05, C.wood, x + d, y + Math.min(0.3, wall * 0.5), z + d, 0, Math.PI / 4);
    return y + wall + dh + 0.045;
  };
  const top = silo(-0.3, -0.3, 0.4, 0.66);
  silo(0.5, -0.5, 0.28, 0.48); silo(-0.52, 0.47, 0.25, 0.42);
  // The stair up to the big silo's shoulder.
  for (let i = 0; i < 5; i++) b.box(0.2, 0.135 * (i + 1), 0.15, STAIR, 0.2, 0.06, 0.32 - i * 0.15);
  // A heap of grain on a threshing floor, sacks and a measuring basket.
  b.cyl(0.3, 0.02, 0xb59a6a, 0.46, 0.06, 0.4).cone(0.25, 0.27, C.hay, 0.46, 0.08, 0.4, 8);
  for (const [x, z] of [[0.08, 0.66], [0.24, 0.76], [0.74, 0.0], [0.76, 0.2]]) b.add(BALL, C.cloth, x, 0.15, z, 0.1, 0.1, 0.085).add(CYL6, C.leather, x, 0.25, z, 0.03, 0.04, 0.03);
  b.cylT(0.11, 0.08, 0.13, P.wattle, 0.72, 0.06, 0.7, 6).cylT(0.09, 0.09, 0.02, C.hay, 0.72, 0.18, 0.7, 6);
  return top;
}

// Storage Pit: a long buttressed brick storehouse with two doorways under a team-coloured awning; storage jars before
// it, and the wood, stone and gold brought in: a log stack, cut stone blocks and a basket of gold.
export function storage_pit(ctx) {
  const { b, t } = ctx, z0 = -0.56, D = 0.62, H = 0.74, front = z0 + D / 2;
  b.box(1.76, 0.06, 1.76, P.mudD);
  block(b, 1.62, H, D, 0, 0.06, z0);
  buttresses(b, -0.78, 0.78, 0.52, front + 0.02, 0.06, H);
  for (const x of [-0.42, 0.42]) b.box(0.3, 0.5, 0.05, C.dark, x, 0.06, front + 0.01).box(0.38, 0.06, 0.07, C.wood, x, 0.56, front + 0.02);
  // On the roof: a hatch, sacks and a bundle of reed mats.
  const roof = 0.06 + H;
  b.box(0.26, 0.02, 0.22, C.dark, -0.45, roof, z0 - 0.05).box(0.3, 0.03, 0.04, C.wood, -0.45, roof, z0 + 0.08);
  for (const [x, z] of [[0.35, -0.68], [0.52, -0.6], [0.44, -0.45]]) b.add(BALL, C.cloth, x, roof + 0.08, z, 0.1, 0.08, 0.085);
  stick(b, 0.06, C.hay, [0.0, roof + 0.06, -0.75], [0.0, roof + 0.06, -0.4], CYL6);
  // The awning: team cloth on poles over the doorways.
  for (const x of [-0.72, 0.72]) b.cylT(0.022, 0.022, 0.62, C.wood, x, 0.06, front + 0.32, 6);
  b.box(1.56, 0.03, 0.4, t, 0, 0.66, front + 0.15, 0.2).box(1.56, 0.08, 0.02, t, 0, 0.6, front + 0.35);
  // Jars along the left, two stoppered with team cloth.
  for (const [x, z, r, s] of [[-0.7, 0.22, 0.11, 1], [-0.45, 0.2, 0.1, 0], [-0.72, 0.5, 0.1, 0], [-0.47, 0.48, 0.11, 1], [-0.7, 0.76, 0.09, 0], [-0.22, 0.32, 0.09, 0]]) jar(b, x, 0.06, z, r, s ? t : JAR);
  // Logs stacked along the right.
  for (const [i, [x, y]] of [[0.44, 0.12], [0.58, 0.12], [0.72, 0.12], [0.51, 0.23], [0.65, 0.23], [0.58, 0.34]].entries()) stick(b, 0.06, i % 2 ? C.woodD : C.wood, [x, y, 0.16], [x, y, 0.8], CYL6);
  // Cut stone and a basket of gold.
  for (const [x, y, z, ry] of [[-0.04, 0.06, 0.66, 0.1], [0.2, 0.06, 0.7, -0.2], [0.08, 0.22, 0.68, 0.3]]) b.box(0.22, 0.16, 0.18, ry > 0 ? C.stone : C.stoneD, x, y, z, 0, ry);
  b.cylT(0.13, 0.1, 0.12, P.wattle, 0.06, 0.06, 0.36, 6);
  for (const [x, y, z, r] of [[0.03, 0.15, 0.34, 0.06], [0.1, 0.15, 0.39, 0.055], [0.06, 0.18, 0.3, 0.05], [0.07, 0.18, 0.36, 0.05]]) b.rock(r, C.gold, x, y, z, 1, 0.8, 1, x * 20);
  return 0.96;
}

// Farm: irrigated basins of barley between earth banks, fed from a canal along the left edge through a cross channel;
// a shaduf on the bank to lift the water, a date palm, and the farmer's team-coloured sunshade. The barley is
// extra.crops, which animate() shows once the farm is finished and shrinks as its food runs out.
export function farm(ctx) {
  const { b, t, extra } = ctx, cx = -0.74, bund = P.mudD;
  b.box(1.76, 0.025, 1.76, 0x6e5536);
  // The canal and its banks.
  b.box(0.15, 0.03, 1.76, WATER, cx, 0, 0);
  for (const k of [-1, 1]) b.box(0.05, 0.055, 1.76, bund, cx + k * 0.1, 0, 0);
  // Basins: wet earth inside banks, a cross channel from the canal between the front and back basins.
  const X = [[-0.6, 0.12], [0.18, 0.86]], Z = [[-0.86, -0.07], [0.07, 0.86]];
  for (const [x0, x1] of X) for (const [z0, z1] of Z) b.box(x1 - x0 - 0.04, 0.012, z1 - z0 - 0.04, 0x5b4429, (x0 + x1) / 2, 0.025, (z0 + z1) / 2);
  b.box(1.5, 0.03, 0.06, WATER, 0.11, 0, 0);
  for (const z of [-0.055, 0.055]) b.box(1.5, 0.05, 0.04, bund, 0.11, 0, z);
  for (const z of [-0.86, 0.86]) b.box(1.5, 0.05, 0.05, bund, 0.11, 0, z);
  b.box(0.05, 0.05, 1.76, bund, 0.86, 0, 0).box(0.05, 0.05, 1.76, bund, 0.15, 0, 0);
  // The shaduf: two posts and a crossbar, a sweep with a mud counterweight and a bucket hanging over the canal.
  const px = -0.6, pz = -0.44;
  for (const dz of [-0.06, 0.06]) b.cylT(0.022, 0.026, 0.62, C.wood, px, 0.03, pz + dz, 6);
  stick(b, 0.02, C.woodD, [px, 0.63, pz - 0.1], [px, 0.63, pz + 0.1], CYL6);
  b.box(0.06, 0.1, 0.13, t, px, 0.45, pz); // team cloth wound on the posts
  const tip = [cx, 0.98, pz + 0.38], tail = [-0.42, 0.42, pz - 0.36];
  stick(b, 0.018, C.wood, tail, tip, CYL6);
  b.add(BALL, P.mudD, tail[0], tail[1] - 0.02, tail[2], 0.07, 0.065, 0.07);
  stick(b, 0.005, C.leather, tip, [cx, 0.3, tip[2]], CYL6);
  b.cylT(0.045, 0.035, 0.07, C.leather, cx, 0.23, tip[2], 6);
  // A date palm at the canal head.
  const base = [-0.46, 0.03, -0.6], crown = [-0.4, 1.05, -0.55];
  for (let i = 0; i < 3; i++) stick(b, 0.04 - i * 0.006, i % 2 ? 0x7a6240 : 0x6a5236, lerp(base, crown, i / 3), lerp(base, crown, (i + 1) / 3), CYL6);
  for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, dx = Math.cos(a), dz = Math.sin(a); b.box(0.36, 0.015, 0.08, i % 2 ? PALM : 0x4f6b2a, crown[0] + dx * 0.16, crown[1] - 0.05, crown[2] + dz * 0.16, 0, -a, -0.45); }
  b.add(BALL, 0x8a4a22, crown[0], crown[1] - 0.1, crown[2], 0.07, 0.06, 0.07);
  // The farmer's sunshade at the front corner: four poles and a team-coloured cloth.
  const sx = 0.68, sz = 0.68;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cylT(0.015, 0.015, 0.5, C.wood, sx + dx * 0.13, 0.03, sz + dz * 0.13, 5);
  b.box(0.34, 0.025, 0.34, t, sx, 0.53, sz).box(0.22, 0.015, 0.16, P.hide, sx, 0.04, sz);
  // Barley: rows of tufts with ears, green in two basins and ripening in the others; none under the shade or palm.
  const cr = new B();
  X.forEach(([x0, x1], i) => Z.forEach(([z0, z1], j) => {
    const ripe = (i + j) % 2, rows = 6, cols = 6;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = x0 + 0.08 + c * (x1 - x0 - 0.16) / (cols - 1) + (hash(r + 5 * i, c + 7 * j) - 0.5) * 0.03, z = z0 + 0.08 + r * (z1 - z0 - 0.16) / (rows - 1);
      if ((x > sx - 0.2 && z > sz - 0.2) || (x < -0.3 && z < -0.42 && z > -0.72)) continue;
      const hh = 0.2 + hash(c + 11 * j, r + 3 * i) * 0.08, lean = (hash(r * 7 + i, c * 3 + j) - 0.5) * 0.3;
      const green = ripe ? 0x9a9a45 : [0x6f9a3a, 0x7fa845][(r + c) % 2], sn = Math.sin(lean), cs = Math.cos(lean);
      cr.add(LEAF, green, x, 0.025 + hh / 2, z, 0.045, hh, 0.045, lean, 0, -lean);
      cr.add(LEAF, green, x + 0.025, 0.025 + hh * 0.3, z - 0.015, 0.035, hh * 0.6, 0.035, -0.4, 0, -0.5);
      cr.add(LEAF, ripe ? 0xd8b04a : 0xa8b85a, x + sn * hh * 0.55, 0.025 + hh / 2 + cs * cs * hh * 0.55, z + sn * cs * hh * 0.55, 0.026, 0.1, 0.026, lean, 0, -lean);
    }
  }));
  extra.crops = cr.geometry();
  return 1.1;
}

// Barracks: a walled drill yard of trodden sand entered through a gate between two towers hung with team banners; the
// barrack hall at the back with a lookout and the flag, bronze shields on its front, a rack of bronze-tipped spears and
// training posts in the yard.
export function barracks(ctx) {
  const { b, t } = ctx, hz = -0.98, HD = 0.76, HH = 0.95, hf = hz + HD / 2;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.5, 0.012, 1.86, SAND, 0, 0.06, 0.37);
  // The hall: doorways with bronze lintels, shields between them, merlons along its front, a lookout on the roof.
  block(b, 2.7, HH, HD, 0, 0.06, hz);
  merlons(b, -1.24, 1.24, hf - 0.04, 0.06 + HH + 0.07);
  for (const x of [-0.78, 0, 0.78]) b.box(0.3, 0.55, 0.05, C.dark, x, 0.06, hf + 0.01).box(0.38, 0.06, 0.07, C.bronze, x, 0.61, hf + 0.02);
  for (const x of [-1.15, -0.39, 0.39, 1.15]) shield(b, t, x, 0.62, hf + 0.03);
  block(b, 0.56, 0.42, 0.5, -0.9, 0.06 + HH, hz - 0.04);
  b.box(0.12, 0.16, 0.04, C.dark, -0.9, 0.06 + HH + 0.16, hz + 0.22);
  flag(ctx, -0.9, 0.06 + HH + 0.49, hz - 0.04, 0.7, C.woodD, [0.3, 0.52]);
  // The yard wall, a gate between two towers in front with team banners and bronze caps.
  for (const k of [-1, 1]) b.box(0.14, 0.42, 1.96, P.mud, k * 1.3, 0.06, 0.38).box(0.16, 0.05, 1.96, P.mudD, k * 1.3, 0.48, 0.38);
  for (const k of [-1, 1]) {
    b.box(0.88, 0.42, 0.14, P.mud, k * 0.86, 0.06, 1.3).box(0.88, 0.05, 0.16, P.mudD, k * 0.86, 0.48, 1.3);
    b.box(0.32, 0.86, 0.3, P.mud, k * 0.42, 0.06, 1.22).box(0.36, 0.06, 0.34, P.mudD, k * 0.42, 0.92, 1.22).box(0.2, 0.06, 0.2, C.bronze, k * 0.42, 0.98, 1.22);
    b.box(0.2, 0.46, 0.02, t, k * 0.42, 0.34, 1.38).box(0.22, 0.04, 0.03, C.bronze, k * 0.42, 0.8, 1.38);
  }
  // The spear rack along the left wall, facing the yard.
  const sx = -1.14;
  for (const z of [-0.3, 0.8]) b.cylT(0.03, 0.03, 0.6, C.woodD, sx, 0.06, z, 6);
  stick(b, 0.025, C.wood, [sx, 0.6, -0.36], [sx, 0.6, 0.86], CYL6);
  for (let i = 0; i < 7; i++) {
    const z = -0.22 + i * 0.16, p = [sx + 0.2, 0.06, z], q = [sx - 0.05, 1.08, z];
    stick(b, 0.014, C.wood, p, q, CYL6);
    stick(b, 0.03, C.bronze, q, lerp(p, q, 1.1), LEAF);
  }
  for (const [z, r] of [[0.02, 0.12], [0.3, 0.11]]) shield(b, t, sx + 0.12, 0.2, z, true, r);
  // Training posts: a post with arms and a straw head.
  for (const [x, z] of [[0.45, 0.3], [-0.25, 0.65], [0.75, 0.85]]) {
    b.cylT(0.04, 0.045, 0.78, C.woodD, x, 0.06, z, 6).cylT(0.09, 0.1, 0.3, C.hay, x, 0.4, z, 6).add(BALL, C.hay, x, 0.8, z, 0.08, 0.08, 0.08);
    stick(b, 0.02, C.wood, [x - 0.22, 0.6, z], [x + 0.22, 0.6, z], CYL6);
  }
  // A war chariot: a wicker car on two spoked wheels, its pole resting on the ground.
  const cx = 0.95, cz = -0.12;
  for (const k of [-1, 1]) {
    b.add(unit.cyl, C.woodD, cx + k * 0.17, 0.22, cz, 0.16, 0.03, 0.16, 0, 0, Math.PI / 2).add(CYL6, C.bronze, cx + k * 0.19, 0.22, cz, 0.035, 0.05, 0.035, 0, 0, Math.PI / 2);
    for (let i = 0; i < 3; i++) b.box(0.012, 0.3, 0.02, C.wood, cx + k * 0.17, 0.07, cz, i * Math.PI / 3);
  }
  stick(b, 0.02, C.woodD, [cx - 0.2, 0.22, cz], [cx + 0.2, 0.22, cz], CYL6);
  b.box(0.3, 0.2, 0.2, P.wattle, cx, 0.26, cz - 0.04).box(0.3, 0.04, 0.2, t, cx, 0.46, cz - 0.04);
  stick(b, 0.022, C.wood, [cx, 0.28, cz + 0.06], [cx, 0.07, cz + 0.7], CYL6);
  brazier(b, 0.95, 0.06, -0.48);
  return 1.5;
}

// Archery Range: three lanes of sand between low kerbs, straw targets painted in team colour on stands before a high
// mud-brick butt wall, and at the front the archers' shelter of brick piers and a team awning with a bow rack.
export function archery_range(ctx) {
  const { b, t } = ctx;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.56, 0.012, 2.2, SAND, 0, 0.06, -0.1);
  // The butt: a thick bank of brick behind the targets.
  block(b, 2.7, 0.78, 0.36, 0, 0.06, -1.18);
  merlons(b, -1.2, 1.2, -1.02, 0.91);
  buttresses(b, -1.2, 1.2, 0.6, -0.99, 0.06, 0.78);
  // Lane kerbs and the shooting line.
  for (const x of [-0.44, 0.44]) b.box(0.06, 0.05, 1.8, P.mudD, x, 0.06, -0.1);
  b.box(2.5, 0.05, 0.08, LIME, 0, 0.06, 0.82);
  // The targets: straw discs on stands, rings of white, team colour and bronze, arrows in them.
  for (const [i, x] of [-0.86, 0, 0.86].entries()) {
    const z = -0.84, y = 0.52;
    for (const k of [-1, 1]) stick(b, 0.022, C.wood, [x + k * 0.18, 0.06, z + 0.08], [x + k * 0.1, y + 0.18, z - 0.02], CYL6);
    stick(b, 0.02, C.woodD, [x, 0.06, z - 0.22], [x, y + 0.14, z - 0.02], CYL6);
    b.add(unit.cyl, C.hay, x, y, z, 0.26, 0.12, 0.26, Math.PI / 2, 0, 0).add(unit.cyl, C.hay, x, y, z, 0.27, 0.08, 0.27, Math.PI / 2, 0, 0)
      .add(unit.cyl, 0xf2efe6, x, y, z + 0.065, 0.2, 0.01, 0.2, Math.PI / 2, 0, 0).add(unit.cyl, t, x, y, z + 0.07, 0.14, 0.01, 0.14, Math.PI / 2, 0, 0)
      .add(unit.cyl, C.bronze, x, y, z + 0.075, 0.055, 0.01, 0.055, Math.PI / 2, 0, 0);
    for (const [dx, dy] of [[0.07, 0.05], [-0.1, -0.08], [0.02, -0.12]].slice(0, 2 + (i % 2))) { const p = [x + dx, y + dy, z + 0.05]; stick(b, 0.008, C.wood, p, [p[0] + 0.02, p[1] + 0.03, p[2] + 0.3], CYL6); b.box(0.004, 0.035, 0.07, 0xf2efe6, p[0] + 0.02, p[1] + 0.01, p[2] + 0.27); }
  }
  // The archers' shelter: four brick piers, a flat roof with a team awning, a bow rack and arrow baskets.
  const ax = -0.82, az = 0.92;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.13, 0.82, 0.13, P.mud, ax + dx * 0.42, 0.06, az + dz * 0.22);
  b.box(1.04, 0.07, 0.6, P.mudD, ax, 0.88, az).box(1.0, 0.025, 0.2, t, ax, 0.8, az + 0.36, 0.3).box(1.0, 0.1, 0.015, t, ax, 0.68, az + 0.46);
  stick(b, 0.02, C.woodD, [ax - 0.42, 0.55, az - 0.22], [ax + 0.42, 0.55, az - 0.22], CYL6);
  for (const dx of [-0.25, 0, 0.25]) b.add(unit.tor, C.woodD, ax + dx, 0.4, az - 0.2, 0.16, 0.16, 0.16, 0, 0, Math.PI / 2);
  for (const dx of [0.1, 0.32]) { b.cylT(0.06, 0.05, 0.22, C.leather, ax + dx, 0.06, az + 0.1, 6); for (const k of [-0.025, 0.025]) b.box(0.006, 0.12, 0.006, 0xf2efe6, ax + dx + k, 0.28, az + 0.1); }
  // A bronze-banded arrow chest and spare targets by the butt.
  b.box(0.36, 0.2, 0.24, C.wood, 1.0, 0.06, 0.55).box(0.38, 0.03, 0.26, C.bronze, 1.0, 0.18, 0.55);
  b.add(unit.cyl, C.hay, 1.1, 0.27, -0.6, 0.2, 0.1, 0.2, 0, 0, Math.PI / 2 - 0.3);
  return 1.05;
}

// Stable: a mud-brick stable block with four stall doorways and fodder under a reed shade on its roof; before it a
// horse yard of brick piers and rails with a water trough, a hay stack and two horses in team saddle cloths.
export function stable(ctx) {
  const { b, t } = ctx, hz = -0.96, HD = 0.8, HH = 0.9, hf = hz + HD / 2;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.5, 0.012, 1.84, 0x9c7f55, 0, 0.06, 0.38);
  block(b, 2.7, HH, HD, 0, 0.06, hz);
  for (const x of [-0.99, -0.33, 0.33, 0.99]) b.box(0.38, 0.66, 0.05, C.dark, x, 0.06, hf + 0.01).box(0.36, 0.3, 0.04, C.wood, x, 0.06, hf + 0.04).box(0.46, 0.07, 0.07, C.woodD, x, 0.72, hf + 0.02);
  buttresses(b, -1.32, 1.32, 0.66, hf + 0.02, 0.06, HH);
  b.box(0.24, 0.38, 0.02, t, 0, 0.35, hf + 0.03);
  // The reed shade on the roof over the stored fodder.
  const roof = 0.06 + HH + 0.07;
  for (const [x, z] of [[-1.2, -1.28], [0.2, -1.28], [-1.2, -0.68], [0.2, -0.68]]) b.cylT(0.025, 0.025, 0.42, C.wood, x, roof, z, 6);
  for (let i = 0; i < 6; i++) b.box(0.27, 0.04, 0.78, i % 2 ? C.thatchD : C.thatch, -1.17 + i * 0.27, roof + 0.41 - (i % 2) * 0.012, -0.98, 0.1, 0, (i % 2 ? 1 : -1) * 0.04);
  b.box(1.6, 0.06, 0.05, C.woodD, -0.5, roof + 0.38, -0.6);
  for (const [x, z] of [[-0.95, -1.05], [-0.6, -1.08], [-0.25, -1.02], [-0.78, -0.85]]) b.box(0.3, 0.17, 0.2, C.hay, x, roof, z, 0, x);
  flag(ctx, 1.05, roof, -1.1, 0.75, C.woodD, [0.3, 0.52]);
  // The yard: brick piers carrying two rails, open at the front-right as a gate.
  const rail = (p, q) => { for (const y of [0.32, 0.54]) stick(b, 0.025, C.wood, [p[0], y, p[1]], [q[0], y, q[1]], CYL6); };
  const posts = [[-1.3, -0.58], [-1.3, 0.36], [-1.3, 1.3], [-0.4, 1.3], [0.4, 1.3], [1.3, 1.3], [1.3, 0.36], [1.3, -0.58]];
  for (const [x, z] of posts) b.box(0.13, 0.62, 0.13, P.mud, x, 0.06, z).box(0.16, 0.04, 0.16, P.mudD, x, 0.68, z);
  for (let i = 0; i < posts.length - 1; i++) if (i !== 3) rail(posts[i], posts[i + 1]);
  // The water trough along the right fence and a hay stack at the left.
  b.box(0.22, 0.2, 0.9, P.mudD, 1.08, 0.06, 0.4).box(0.16, 0.02, 0.84, WATER, 1.08, 0.24, 0.4);
  b.box(0.42, 0.3, 0.36, C.hay, -1.0, 0.06, 0.95).box(0.38, 0.14, 0.32, C.thatch, -1.0, 0.36, 0.95, 0, 0.2);
  place(b, horse(t), -0.25, 0.06, 0.5, 0.5);
  place(b, horse(t, true), 0.75, 0.06, 0.62, -Math.PI / 2 + 0.4);
  return 1.52;
}

// A bazaar canopy w × d on four poles, its ridge along x at height hh: striped cloth (colours alternate) in two slopes.
const canopy = (b, x, z, w, d, hh, colours) => {
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cylT(0.02, 0.02, hh - 0.12, C.wood, x + dx * (w / 2 - 0.04), 0.06, z + dz * (d / 2 - 0.04), 5);
  const n = 5, rise = 0.16, L = Math.hypot(d / 2, rise) + 0.02, tilt = Math.atan2(rise, d / 2);
  for (let i = 0; i < n; i++) for (const k of [-1, 1]) b.box(w / n + 0.002, 0.02, L, colours[i % colours.length], x - w / 2 + (i + 0.5) * w / n, 0.06 + hh - 0.12 + rise / 2 - 0.01, z + k * d / 4, k * tilt);
  b.box(w + 0.02, 0.07, 0.012, colours[0], x, 0.06 + hh - 0.19, z + d / 2 + 0.005);
};
// Market: a bazaar of striped canopies (two in team colour) over brick counters piled with goods: jars, rugs, baskets
// of dates and grain, and a bronze balance; a well in the square and a low wall at the back.
export function market(ctx) {
  const { b, t } = ctx;
  b.box(2.76, 0.06, 2.76, P.mudD).box(2.56, 0.012, 2.56, SAND, 0, 0.06, 0);
  b.box(2.7, 0.36, 0.12, P.mud, 0, 0.06, -1.3).box(2.74, 0.05, 0.16, P.mudD, 0, 0.42, -1.3).box(0.12, 0.36, 2.4, P.mud, -1.3, 0.06, -0.06).box(0.16, 0.05, 2.4, P.mudD, -1.3, 0.42, -0.06);
  const counter = (x, z, w) => b.box(w, 0.26, 0.3, P.mud, x, 0.06, z).box(w + 0.04, 0.03, 0.34, P.mudD, x, 0.32, z);
  // Back left: the potter's stall.
  canopy(b, -0.68, -0.78, 1.0, 0.78, 1.0, [t, C.cloth]);
  counter(-0.68, -0.68, 0.84);
  for (const [i, x] of [-0.98, -0.78, -0.58, -0.38].entries()) jar(b, x, 0.35, -0.68, 0.06 + (i % 2) * 0.015, null);
  for (const x of [-0.95, -0.7]) jar(b, x, 0.06, -0.98, 0.1, null);
  // Back right: the weaver's stall, rugs stacked and one unrolled.
  canopy(b, 0.62, -0.8, 1.04, 0.78, 1.08, [OCHRE, C.cloth]);
  counter(0.62, -0.7, 0.86);
  for (const [i, c] of [0x7a5a2a, OCHRE, 0x8a4a2a, C.cloth].entries()) b.box(0.5, 0.035, 0.24, c, 0.5, 0.35 + i * 0.035, -0.7, 0, (i - 1.5) * 0.06);
  for (const [i, c] of [0x6b3a1e, 0x4f6b2a, OCHRE].entries()) b.add(CYL6, c, 0.9, 0.39, -0.8 + i * 0.1, 0.045, 0.24, 0.045, 0, 0, Math.PI / 2); // bolts of cloth
  b.box(0.62, 0.012, 0.42, 0x6b3a1e, 0.55, 0.075, -0.2).box(0.52, 0.014, 0.32, OCHRE, 0.55, 0.077, -0.2).box(0.36, 0.016, 0.18, 0x8a4a2a, 0.55, 0.079, -0.2).box(0.12, 0.018, 0.06, C.cloth, 0.55, 0.081, -0.2);
  // Front left: the grocer's stall, baskets of dates, grain and melons.
  canopy(b, -0.72, 0.62, 0.9, 0.76, 0.94, [C.cloth, t]);
  counter(-0.72, 0.72, 0.76);
  for (const [i, c] of [0x6b3a1e, C.hay, 0x6f8f3a].entries()) { const x = -0.98 + i * 0.26; b.cylT(0.1, 0.08, 0.1, P.wattle, x, 0.35, 0.72, 6).add(BALL, c, x, 0.45, 0.72, 0.085, 0.05, 0.085); }
  for (const [x, z] of [[-0.4, 0.98], [-0.28, 1.06]]) b.add(BALL, 0x6f8f3a, x, 0.13, z, 0.08, 0.07, 0.08);
  // Front right: the money-changer's table with a bronze balance, under an awning.
  canopy(b, 0.72, 0.78, 0.74, 0.6, 0.86, [OCHRE, t]);
  b.box(0.5, 0.24, 0.28, C.wood, 0.72, 0.06, 0.8).box(0.54, 0.03, 0.32, C.woodD, 0.72, 0.3, 0.8);
  b.cylT(0.012, 0.012, 0.24, C.bronze, 0.72, 0.33, 0.8, 5).box(0.3, 0.015, 0.015, C.bronze, 0.72, 0.56, 0.8);
  for (const k of [-1, 1]) { b.box(0.004, 0.13, 0.004, C.bronze, 0.72 + k * 0.14, 0.43, 0.8).cylT(0.05, 0.035, 0.02, C.bronze, 0.72 + k * 0.14, 0.42, 0.8, 8); }
  for (const [x, z] of [[0.6, 0.86], [0.63, 0.75]]) b.cylT(0.025, 0.025, 0.015, C.gold, x, 0.33, z, 6);
  // The well in the square.
  b.cylT(0.2, 0.22, 0.26, P.mudD, 0.0, 0.06, 0.05, 10).cylT(0.15, 0.15, 0.01, WATER, 0.0, 0.3, 0.05, 10);
  for (const k of [-1, 1]) b.cylT(0.02, 0.02, 0.5, C.wood, k * 0.2, 0.06, 0.05, 5);
  stick(b, 0.018, C.woodD, [-0.24, 0.56, 0.05], [0.24, 0.56, 0.05], CYL6);
  jar(b, 0.3, 0.06, 0.25, 0.08, null);
  return 1.2;
}

// Government Center: a palace on a brick terrace. A grand ramp climbs to a portico of plastered columns with bronze
// papyrus capitals; behind it the whitewashed hall with a team frieze, bronze doors and banners; a second ramp up the
// side to the roof, and an upper storey flying the flag.
export function government_center(ctx) {
  const { b, t } = ctx, ty = 0.46, tf = 0.55, hz = -0.8, hf = -0.3, top = 1.38;
  b.box(2.76, 0.06, 2.76, P.mudD);
  // The terrace, its front buttressed and hung with team panels either side of the grand ramp, braziers at its corners.
  block(b, 2.5, ty - 0.06, 1.88, 0, 0.06, -0.39);
  buttresses(b, -1.2, 1.2, 0.3, tf + 0.02, 0.06, ty - 0.06);
  for (const k of [-1, 1]) b.box(0.3, 0.3, 0.02, t, k * 0.78, 0.1, tf + 0.05).box(0.32, 0.04, 0.03, C.bronze, k * 0.78, 0.4, tf + 0.05);
  b.add(WEDGE, STAIR, 0, 0.06, tf, 0.84, ty - 0.06, 1.33 - tf);
  const L = Math.hypot(1.33 - tf, ty - 0.06), tilt = Math.atan2(ty - 0.06, 1.33 - tf);
  for (const k of [-1, 1]) b.box(0.08, 0.1, L, P.mudD, k * 0.46, (ty + 0.06) / 2, (tf + 1.33) / 2, tilt);
  for (const k of [-1, 1]) brazier(b, k * 1.1, ty, 0.42);
  // The hall: whitewashed, a team frieze under its coping, bronze doors and banners behind the columns.
  block(b, 2.0, top - ty, 1.0, 0, ty, hz, LIME, 0xcdb58a);
  b.box(2.02, 0.08, 1.02, t, 0, top - 0.16, hz);
  b.box(0.4, 0.62, 0.04, C.bronze, 0, ty, hf + 0.01).box(0.02, 0.62, 0.05, C.dark, 0, ty, hf + 0.02).box(0.5, 0.06, 0.06, C.bronze, 0, ty + 0.62, hf + 0.02);
  for (const k of [-1, 1]) b.box(0.2, 0.5, 0.02, t, k * 0.62, ty + 0.2, hf + 0.02).box(0.22, 0.03, 0.03, C.bronze, k * 0.62, ty + 0.7, hf + 0.02);
  // The portico: six columns, an architrave and a flat roof with stepped merlons.
  for (let i = 0; i < 6; i++) {
    const x = -0.9 + i * 0.36, z = 0.26;
    b.cylT(0.09, 0.1, 0.06, C.bronze, x, ty, z, 8).cylT(0.06, 0.075, 0.72, LIME, x, ty + 0.06, z, 8).cylT(0.13, 0.06, 0.13, C.bronze, x, ty + 0.78, z, 8);
  }
  b.box(2.04, 0.08, 0.68, 0xcdb58a, 0, top - 0.06, -0.02).box(2.06, 0.1, 0.14, LIME, 0, top - 0.1, 0.27);
  merlons(b, -0.92, 0.92, 0.3, top + 0.02, false, 0xcdb58a);
  // The side ramp up to the roof.
  b.add(WEDGE, STAIR, 1.13, ty, -1.27, 0.2, top - ty, 0.95);
  // The upper storey with windows, merlons and the flag.
  block(b, 0.9, 0.5, 0.62, -0.1, top + 0.02, -0.88, LIME, 0xcdb58a);
  for (const x of [-0.35, -0.1, 0.15]) b.box(0.08, 0.16, 0.03, C.dark, x, top + 0.24, -0.56);
  merlons(b, -0.5, 0.3, -0.58, top + 0.59, false, 0xcdb58a);
  flag(ctx, 0.25, top + 0.59, -1.1, 0.7, C.woodD, [0.3, 0.52]);
  return 2.12;
}

// A square pyramid of half-side hs and height hh standing on y: limestone courses (frustum) under a gilded capstone.
const pyramid = (b, x, y, z, hs, hh, cap = 0.1, c = LIMESTONE) => {
  const R = hs * Math.SQRT2;
  b.cylT(R * cap, R, hh * (1 - cap), c, x, y, z, 4, 0, Math.PI / 4).cone(R * cap, hh * cap, C.gold, x, y + hh * (1 - cap), z, 4, Math.PI / 4);
};
// A sphinx couchant facing +x, built at the origin.
const sphinx = () => {
  const s = new B(), c = 0xd2b98a;
  s.box(0.5, 0.14, 0.2, c, -0.08, 0, 0).box(0.18, 0.1, 0.22, c, -0.24, 0.1, 0);
  for (const k of [-1, 1]) s.box(0.26, 0.05, 0.06, c, 0.24, 0, k * 0.065);
  s.box(0.14, 0.24, 0.17, c, 0.12, 0.08, 0).add(FRUSTUM, 0xc2a675, 0.13, 0.3, 0, 0.1, 0.16, 0.12).box(0.04, 0.12, 0.1, c, 0.2, 0.26, 0);
  s.box(0.2, 0.025, 0.05, 0xc2a675, -0.36, 0.02, 0.1, 0, 0.4);
  return s;
};
// Wonder: a great pyramid with a gilded capstone, two queens' pyramids beside it, and before it a temple pylon with
// team banners and pennants on tall flagstaffs, two obelisks at its gate and a sphinx keeping watch.
export function wonder(ctx) {
  const { b, mast, t } = ctx, px = -0.4, pz = -0.4, H = 3.9;
  b.box(3.76, 0.05, 3.76, 0xd8c08a);
  b.box(2.9, 0.06, 2.9, 0xcdbf98, px, 0.05, pz);
  pyramid(b, px, 0.11, pz, 1.4, H);
  for (const z of [-1.42, -0.52]) { b.box(0.8, 0.04, 0.8, 0xcdbf98, 1.45, 0.05, z); pyramid(b, 1.45, 0.09, z, 0.36, 0.86, 0.08); }
  // The causeway from the pyramid to the pylon.
  b.box(0.42, 0.05, 0.5, 0xcdbf98, px, 0.05, 1.2);
  // The pylon: two battered towers either side of the gate, team banners on their faces, flagstaffs with pennants.
  const gz = 1.4, ph = 1.1, slope = Math.atan(0.3 * 0.17 / ph);
  for (const k of [-1, 1]) {
    const x = px + k * 0.47, fx = x + k * 0.25;
    b.add(FRUSTUM, LIMESTONE, x, 0.05 + ph / 2, gz, 0.34, ph, 0.17).box(0.56, 0.08, 0.3, 0xcdbf98, x, 0.05 + ph, gz).box(0.5, 0.04, 0.25, LIMESTONE, x, 0.13 + ph, gz);
    b.box(0.3, 0.66, 0.02, t, x, 0.26, gz + 0.16, -slope).box(0.32, 0.04, 0.03, C.gold, x, 0.92, gz + 0.13, -slope);
    mast.cyl(0.02, 1.62, C.woodD, fx, 0.05, gz + 0.2).box(0.014, 0.13, 0.26, t, fx, 1.48, gz + 0.33).box(0.014, 0.06, 0.16, t, fx, 1.34, gz + 0.28); // flagstaff and pennants
  }
  b.box(0.26, 0.66, 0.06, C.dark, px, 0.05, gz).box(0.4, 0.12, 0.26, LIMESTONE, px, 0.71, gz).box(0.42, 0.04, 0.27, C.gold, px, 0.76, gz);
  // Obelisks at the gate and the sphinx at the corner.
  for (const k of [-1, 1]) { const x = px + k * 0.22; b.add(FRUSTUM, 0xd9c49a, x, 0.65, 1.76, 0.065, 1.1, 0.065).cone(0.065, 0.12, C.gold, x, 1.2, 1.76, 4, Math.PI / 4); }
  place(b, sphinx(), 1.25, 0.05, 1.25, -Math.PI / 4, 1.5);
  return 4.02;
}
