// The Dock, one design for every era from Bronze to AI Future: a U-shaped pier standing on piles over the water, a quay
// across the back and two arms reaching forward round an open slip. A harbour house in the era's style (gates.js block())
// stands on the quay; the rest changes with the era: a reed-bound palm-log pier with a mud store and a beached reed
// boat (Bronze), a stone quay with a marble edge and amphorae (Iron), a timber wharf with a treadwheel crane (Medieval),
// a plank wharf with a jib crane, barrels and a beacon (Age of Sail), a brick quay with a steam crane and bollards
// (Industrial), a concrete pier with a container gantry (Modern) and a white floating platform with neon edges and a
// hovering cargo drone (AI Future).
//
// The model cache can't see which side the shore is on, so the design is the same all round apart from its open slip.
// Animated parts in ctx.extra (see buildingModel): cranes turn about y (spinners), the steam crane smokes, the AI Future
// drone floats.
import { B, C, unit } from '../builder.js';
import { P, flag, stick, barrel, sack, puff, CYL6, CYL8, BALL, DISC } from './kit.js';
import { block } from './gates.js';

const push = (extra, k, x) => (extra[k] ??= []).push(x);
// Per era: the deck, its edge, the piles and the deck's height above the water.
const DECK = {
  bronze: { deck: 0x8a6a42, edge: 0x6b5030, pile: 0x5d4428, y: 0.16 },
  iron: { deck: 0xbcad8d, edge: C.marble, pile: 0x9a8c70, y: 0.2 },
  medieval: { deck: 0x7a5a3a, edge: 0x5a4028, pile: 0x4a3420, y: 0.2 },
  sail: { deck: 0x8f6c45, edge: 0x5e4329, pile: 0x4e3824, y: 0.22 },
  industrial: { deck: 0x7d6f63, edge: P.brickD, pile: 0x4a4f55, y: 0.24 },
  modern: { deck: 0xb9b7b0, edge: 0x8d8f91, pile: 0x9a9890, y: 0.26 },
  future: { deck: P.snow, edge: P.neonC, pile: P.chrome, y: 0.24 },
};
const QUAY = 1.05, ARM = 0.62; // depth of the back quay (z) and width of each arm (x)

// The deck: the quay along -z and two arms along +z, an edge strip round the slip, and piles under it all.
function pier(ctx) {
  const { b, s, h, age } = ctx, e = DECK[age], y = e.y, zq = -h + QUAY, armLen = s - QUAY, round = age !== 'modern' && age !== 'future';
  b.box(s, 0.08, QUAY, e.deck, 0, y - 0.08, -h + QUAY / 2);
  for (const k of [-1, 1]) b.box(ARM, 0.08, armLen, e.deck, k * (h - ARM / 2), y - 0.08, zq + armLen / 2);
  for (const k of [-1, 1]) b.box(0.05, 0.05, armLen, e.edge, k * (h - ARM), y - 0.05, zq + armLen / 2);
  b.box(s - 2 * ARM, 0.05, 0.05, e.edge, 0, y - 0.05, zq);
  if (age === 'future') { b.box(s + 0.04, 0.03, 0.03, P.neonC, 0, y - 0.1, -h); for (const k of [-1, 1]) b.box(0.03, 0.03, s, P.neonC, k * h, y - 0.1, 0); return y; }
  const piles = [];
  for (let x = -h + 0.12; x <= h - 0.1; x += 0.46) piles.push([x, -h + 0.1], [x, zq - 0.06]);
  for (const k of [-1, 1]) for (let z = zq + 0.4; z <= h; z += 0.45) piles.push([k * (h - 0.08), z], [k * (h - ARM + 0.08), z]);
  for (const [x, z] of piles) round ? b.add(CYL6, e.pile, x, y / 2 - 0.06, z, 0.055, y + 0.12, 0.055) : b.box(0.12, y + 0.04, 0.12, e.pile, x, -0.08, z);
  return y;
}

// A slewing jib crane: a mast on the arm's end and a jib turning above it (a spinner); returns its top.
function crane(ctx, x, z, y, hh, mast, jib, len = 0.9) {
  const { b, extra } = ctx;
  b.box(0.12, hh, 0.12, mast, x, y, z).box(0.2, 0.06, 0.2, mast, x, y + hh, z);
  const j = new B().box(0.07, 0.07, len, jib, 0, 0, len / 2 - 0.15).box(0.1, 0.12, 0.16, jib, 0, -0.03, -0.22).cyl(0.005, 0.35, C.hay, 0, -0.33, len - 0.2);
  push(extra, 'spinners', { geo: j.geometry(), at: [x, y + hh + 0.07, z], axis: 'y', speed: 0.25 });
  return y + hh + 0.14;
}

export function dock(ctx) {
  const { b, mast, extra, h, t, age } = ctx, y = pier(ctx), zq = -h + QUAY / 2, ax = h - ARM / 2, tip = h - 0.25;
  // The harbour house on the quay's left, the team flag on the right arm's tip.
  let top = block(ctx, { w: 1.2, d: 0.8, hh: 0.62, x: -0.68, z: zq, y });
  flag(ctx, ax, y, tip, 0.9, age === 'future' ? P.chrome : C.woodD);
  switch (age) {
    case 'bronze': { // reed bundles lashed to the logs, a mud store, a reed boat on the arm and a fishing net on poles
      for (let x = -h + 0.1; x < h; x += 0.3) b.add(CYL6, C.hay, x, y + 0.01, -h - 0.02, 0.05, 0.06, 0.05, 0, 0, Math.PI / 2);
      b.box(0.5, 0.36, 0.5, P.mud, 0.62, y, zq).box(0.54, 0.05, 0.54, P.mudD, 0.62, y + 0.36, zq).box(0.16, 0.24, 0.02, C.dark, 0.62, y, zq + 0.26);
      b.add(BALL, C.hay, -ax, y + 0.06, 0.55, 0.16, 0.08, 0.5).add(BALL, C.thatchD, -ax, y + 0.1, 0.55, 0.12, 0.04, 0.44);
      for (const z of [0.1, 0.9]) stick(b, 0.02, C.woodD, [ax, y, z], [ax, y + 0.6, z], CYL6);
      b.box(0.02, 0.4, 0.8, C.hay, ax, y + 0.18, 0.5);
      for (let i = 0; i < 3; i++) sack(b, 0.3 + i * 0.18, y, zq + 0.35, 0.08);
      top = Math.max(top, y + 0.6);
      break;
    }
    case 'iron': { // a stone quay with a marble edge, an amphora stack, a bronze mooring ring and a lamp on a column
      b.box(ctx.s + 0.06, 0.05, 0.08, C.marble, 0, y, -h);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) b.cylT(0.03, 0.06, 0.2, 0xb0643c, 0.3 + i * 0.13, y + j * 0.14, zq + 0.22 - j * 0.06, 8);
      b.cylT(0.06, 0.07, 0.7, C.marble, -ax, y, tip).cyl(0.1, 0.04, C.marble, -ax, y + 0.7, tip).sph(0.07, P.fire, -ax, y + 0.8, tip);
      b.add(DISC, C.bronze, ax - 0.2, y + 0.02, 0.4, 0.07, 0.02, 0.07);
      top = Math.max(top, y + 0.87);
      break;
    }
    case 'medieval': { // a treadwheel crane on the right of the quay, barrels and a lantern post
      const cx = 0.68;
      b.box(0.5, 0.42, 0.36, C.woodD, cx, y, zq).roof(0.56, 0.28, 0.42, P.slate, cx, y + 0.42, zq);
      b.add(unit.tor, C.wood, cx, y + 0.3, zq + 0.22, 0.24, 0.24, 0.24, 0, 0, Math.PI / 2).add(unit.tor, C.wood, cx, y + 0.3, zq + 0.22, 0.24, 0.24, 0.24, 0, 0, -Math.PI / 2);
      top = Math.max(top, crane(ctx, cx, zq - 0.05, y + 0.7, 0.5, C.woodD, C.wood));
      for (const [x, z] of [[-ax, 0.3], [-ax, 0.55], [-ax + 0.14, 0.42]]) barrel(b, x, y, z);
      b.cyl(0.03, 0.6, C.woodD, -ax, y, tip).box(0.1, 0.12, 0.1, P.ember, -ax, y + 0.6, tip);
      break;
    }
    case 'sail': { // a jib crane on the right arm, barrels and crates on the quay and a beacon on the left arm's tip
      top = Math.max(top, crane(ctx, ax, 0.1, y, 1.0, C.woodD, C.wood, 1.0));
      for (const [x, z] of [[0.35, zq - 0.1], [0.5, zq + 0.12], [0.2, zq + 0.12]]) barrel(b, x, y, z, 0.08, 0.2);
      b.box(0.24, 0.22, 0.24, C.wood, 0.72, y, zq).box(0.26, 0.03, 0.26, C.woodD, 0.72, y + 0.22, zq);
      b.cylT(0.08, 0.11, 0.62, P.white, -ax, y, tip, 8).box(0.18, 0.16, 0.18, P.glass, -ax, y + 0.62, tip).cone(0.13, 0.14, P.tile, -ax, y + 0.78, tip, 8).sph(0.05, P.ember, -ax, y + 0.69, tip);
      top = Math.max(top, y + 0.92);
      break;
    }
    case 'industrial': { // iron bollards, a steam crane with its boiler and smoking stack, and coal on the quay
      for (const k of [-1, 1]) for (const z of [0.2, 0.9]) b.cylT(0.04, 0.05, 0.12, P.iron, k * (h - 0.1), y, z, 8).cyl(0.06, 0.03, P.iron, k * (h - 0.1), y + 0.12, z);
      const cx = ax, cz = 0.0;
      b.box(0.44, 0.3, 0.44, P.iron, cx, y, cz).cyl(0.12, 0.3, 0x2f3437, cx - 0.1, y + 0.3, cz - 0.1);
      push(extra, 'smoke', { geo: puff(), at: [cx - 0.1, y + 0.68, cz - 0.1], phase: 0.3 });
      top = Math.max(top, crane(ctx, cx, cz + 0.1, y + 0.3, 0.7, P.iron, 0x5d6468, 1.1));
      for (let i = 0; i < 4; i++) b.rock(0.09, 0x1f1f1f, 0.3 + (i % 2) * 0.16, y, zq - 0.15 + (i >> 1) * 0.15, 1, 0.7, 1, i);
      break;
    }
    case 'modern': { // a container gantry over the slip, stacked containers and a radar mast on the harbour house
      for (const k of [-1, 1]) b.box(0.08, 1.3, 0.08, 0xe0b028, k * (h - ARM / 2), y, 0.35).box(0.08, 1.3, 0.08, 0xe0b028, k * (h - ARM / 2), y, 0.95);
      b.box(ctx.s - ARM + 0.1, 0.12, 0.14, 0xe0b028, 0, y + 1.3, 0.35).box(ctx.s - ARM + 0.1, 0.12, 0.14, 0xe0b028, 0, y + 1.3, 0.95);
      b.box(0.3, 0.16, 0.7, 0x55595c, 0.2, y + 1.42, 0.65).box(0.12, 0.02, 0.5, t, 0.2, y + 1.58, 0.65);
      for (const [x, z, yy, c] of [[0.48, zq - 0.1, 0, 0x2f6f9f], [0.48, zq + 0.18, 0, 0xb84532], [0.48, zq + 0.04, 0.2, t]]) b.box(0.42, 0.2, 0.26, c, x, y + yy, z, 0, Math.PI / 2);
      mast.cyl(0.015, 0.6, 0x8d8f91, -0.9, top, zq).box(0.3, 0.04, 0.06, 0x8d8f91, -0.9, top + 0.55, zq);
      top = Math.max(top, y + 1.58);
      break;
    }
    default: { // AI Future: hover pads under the platform, a launch ring over the slip and a hovering cargo drone
      for (const [x, z] of [[-h + 0.3, -h + 0.3], [h - 0.3, -h + 0.3], [-ax, h - 0.3], [ax, h - 0.3]]) b.add(CYL8, P.dark, x, 0.05, z, 0.2, 0.1, 0.2).add(CYL8, P.neonC, x, 0.0, z, 0.16, 0.02, 0.16);
      for (const k of [-1, 1]) b.box(0.08, 0.7, 0.08, P.chrome, k * (h - ARM), y, 0.9);
      b.box(ctx.s - 2 * ARM + 0.1, 0.06, 0.08, P.chrome, 0, y + 0.7, 0.9).box(ctx.s - 2 * ARM, 0.03, 0.03, P.neonM, 0, y + 0.66, 0.9);
      const d = new B().box(0.36, 0.1, 0.36, P.snow).box(0.38, 0.03, 0.38, P.neonC, 0, -0.03, 0).box(0.28, 0.16, 0.28, t, 0, -0.2, 0);
      for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) d.cyl(0.08, 0.02, P.dark, x, 0.1, z);
      push(extra, 'floaters', { geo: d.geometry(), at: [0.55, y + 1.0, zq], amp: 0.08, speed: 1.3 });
      top = Math.max(top, y + 0.76);
      break;
    }
  }
  return top;
}
