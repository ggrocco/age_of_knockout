// The Dock, one design for every era from Stone to AI Future: a U-shaped pier standing on piles over the water, a quay
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
import { P, flag, stick, barrel, sack, puff, pushExtra, CYL6, CYL8, BALL, DISC } from './kit.js';
import { block } from './gates.js';

// Per era: the deck, its edge, the piles and the deck's height above the water.
const DECK = {
  stone: { deck: 0x715538, edge: 0x59412a, pile: 0x4b3825, y: 0.12 },
  tool: { deck: 0x99764b, edge: 0x765536, pile: 0x62472c, y: 0.14 },
  bronze: { deck: 0x8a6a42, edge: 0x6b5030, pile: 0x5d4428, y: 0.16 },
  iron: { deck: 0xbcad8d, edge: C.marble, pile: 0x9a8c70, y: 0.2 },
  medieval: { deck: 0x7a5a3a, edge: 0x5a4028, pile: 0x4a3420, y: 0.2 },
  sail: { deck: 0x8f6c45, edge: 0x5e4329, pile: 0x4e3824, y: 0.22 },
  industrial: { deck: 0x7d6f63, edge: P.brickD, pile: 0x4a4f55, y: 0.24 },
  modern: { deck: 0xb9b7b0, edge: 0x8d8f91, pile: 0x9a9890, y: 0.26 },
  future: { deck: P.snow, edge: P.neonC, pile: P.chrome, y: 0.24 },
};
const QUAY = 1.05, ARM = 0.62; // depth of the back quay (z) and width of each arm (x)
const AMPHORA = 0xb0643c, COAL = 0x1f1f1f, BOILER = 0x2f3437, JIB_STEEL = 0x5d6468, GANTRY = 0xe0b028, GREY = 0x8d8f91;
const CABIN = 0x55595c, CONTAINER_BLUE = 0x2f6f9f, CONTAINER_RED = 0xb84532;

// The piles under the quay and both arms: round logs (or, in Modern and Future, square concrete).
function piles(ctx, deck, quayFront) {
  const { b, h, age } = ctx, y = deck.y, round = age !== 'modern' && age !== 'future', at = [];
  for (let x = -h + 0.12; x <= h - 0.1; x += 0.46) at.push([x, -h + 0.1], [x, quayFront - 0.06]);
  for (const k of [-1, 1]) for (let z = quayFront + 0.4; z <= h; z += 0.45) at.push([k * (h - 0.08), z], [k * (h - ARM + 0.08), z]);
  for (const [x, z] of at) {
    if (round) b.add(CYL6, deck.pile, x, y / 2 - 0.06, z, 0.055, y + 0.12, 0.055);
    else b.box(0.12, y + 0.04, 0.12, deck.pile, x, -0.08, z);
  }
}
// The deck: the quay along -z and two arms along +z, an edge strip round the slip, and piles under it all (the AI Future
// platform floats on neon instead). Returns the deck's top.
function pier(ctx) {
  const { b, s, h, age } = ctx, deck = DECK[age], y = deck.y, quayFront = -h + QUAY, armLength = s - QUAY;
  b.box(s, 0.08, QUAY, deck.deck, 0, y - 0.08, -h + QUAY / 2);
  for (const k of [-1, 1]) b.box(ARM, 0.08, armLength, deck.deck, k * (h - ARM / 2), y - 0.08, quayFront + armLength / 2);
  for (const k of [-1, 1]) b.box(0.05, 0.05, armLength, deck.edge, k * (h - ARM), y - 0.05, quayFront + armLength / 2);
  b.box(s - 2 * ARM, 0.05, 0.05, deck.edge, 0, y - 0.05, quayFront);
  if (age === 'future') {
    b.box(s + 0.04, 0.03, 0.03, P.neonC, 0, y - 0.1, -h);
    for (const k of [-1, 1]) b.box(0.03, 0.03, s, P.neonC, k * h, y - 0.1, 0);
    return y;
  }
  piles(ctx, deck, quayFront);
  return y;
}

// A slewing jib crane: a mast `height` tall standing on y and a jib `length` long turning above it (a spinner); returns
// its top.
function crane(ctx, x, z, y, height, mastColor, jibColor, length = 0.9) {
  const { b, extra } = ctx;
  b.box(0.12, height, 0.12, mastColor, x, y, z).box(0.2, 0.06, 0.2, mastColor, x, y + height, z);
  const jib = new B()
    .box(0.07, 0.07, length, jibColor, 0, 0, length / 2 - 0.15) // the jib
    .box(0.1, 0.12, 0.16, jibColor, 0, -0.03, -0.22) // its counterweight
    .cyl(0.005, 0.35, C.hay, 0, -0.33, length - 0.2); // the hook rope
  pushExtra(extra, 'spinners', { geo: jib.geometry(), at: [x, y + height + 0.07, z], axis: 'y', speed: 0.25 });
  return y + height + 0.14;
}

// ---------- the era's harbour props ----------
// Each draws on the pier (site: the deck's top y, the quay's centre line quayZ, the arms' centre line armX and their
// tips' z) and returns the dock's top, given the harbour house's.
const HARBOURS = {
  bronze(ctx, { y, quayZ, armX }, top) { // reed bundles lashed to the logs, a mud store, a reed boat and a net on poles
    const { b, h } = ctx;
    for (let x = -h + 0.1; x < h; x += 0.3) b.add(CYL6, C.hay, x, y + 0.01, -h - 0.02, 0.05, 0.06, 0.05, 0, 0, Math.PI / 2);
    b.box(0.5, 0.36, 0.5, P.mud, 0.62, y, quayZ).box(0.54, 0.05, 0.54, P.mudD, 0.62, y + 0.36, quayZ); // the store
    b.box(0.16, 0.24, 0.02, C.dark, 0.62, y, quayZ + 0.26);
    b.add(BALL, C.hay, -armX, y + 0.06, 0.55, 0.16, 0.08, 0.5); // the reed boat
    b.add(BALL, C.thatchD, -armX, y + 0.1, 0.55, 0.12, 0.04, 0.44);
    for (const z of [0.1, 0.9]) stick(b, 0.02, C.woodD, [armX, y, z], [armX, y + 0.6, z], CYL6);
    b.box(0.02, 0.4, 0.8, C.hay, armX, y + 0.18, 0.5); // the net
    for (let i = 0; i < 3; i++) sack(b, 0.3 + i * 0.18, y, quayZ + 0.35, 0.08);
    return Math.max(top, y + 0.6);
  },
  iron(ctx, { y, quayZ, armX, tip }, top) { // a marble edge, an amphora stack, a bronze mooring ring, a lamp on a column
    const { b, h } = ctx;
    b.box(ctx.s + 0.06, 0.05, 0.08, C.marble, 0, y, -h);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
      b.cylT(0.03, 0.06, 0.2, AMPHORA, 0.3 + i * 0.13, y + j * 0.14, quayZ + 0.22 - j * 0.06, 8);
    }
    b.cylT(0.06, 0.07, 0.7, C.marble, -armX, y, tip).cyl(0.1, 0.04, C.marble, -armX, y + 0.7, tip); // the lamp's column
    b.sph(0.07, P.fire, -armX, y + 0.8, tip);
    b.add(DISC, C.bronze, armX - 0.2, y + 0.02, 0.4, 0.07, 0.02, 0.07);
    return Math.max(top, y + 0.87);
  },
  medieval(ctx, { y, quayZ, armX, tip }, top) { // a treadwheel crane on the right of the quay, barrels and a lantern post
    const { b } = ctx, craneX = 0.68;
    b.box(0.5, 0.42, 0.36, C.woodD, craneX, y, quayZ).roof(0.56, 0.28, 0.42, P.slate, craneX, y + 0.42, quayZ);
    b.add(unit.tor, C.wood, craneX, y + 0.3, quayZ + 0.22, 0.24, 0.24, 0.24, 0, 0, Math.PI / 2); // the treadwheel
    b.add(unit.tor, C.wood, craneX, y + 0.3, quayZ + 0.22, 0.24, 0.24, 0.24, 0, 0, -Math.PI / 2);
    const craneTop = crane(ctx, craneX, quayZ - 0.05, y + 0.7, 0.5, C.woodD, C.wood);
    for (const [x, z] of [[-armX, 0.3], [-armX, 0.55], [-armX + 0.14, 0.42]]) barrel(b, x, y, z);
    b.cyl(0.03, 0.6, C.woodD, -armX, y, tip).box(0.1, 0.12, 0.1, P.ember, -armX, y + 0.6, tip);
    return Math.max(top, craneTop);
  },
  sail(ctx, { y, quayZ, armX, tip }, top) { // a jib crane on the right arm, barrels, crates and a beacon on the left tip
    const { b } = ctx;
    const craneTop = crane(ctx, armX, 0.1, y, 1.0, C.woodD, C.wood, 1.0);
    for (const [x, z] of [[0.35, quayZ - 0.1], [0.5, quayZ + 0.12], [0.2, quayZ + 0.12]]) barrel(b, x, y, z, 0.08, 0.2);
    b.box(0.24, 0.22, 0.24, C.wood, 0.72, y, quayZ).box(0.26, 0.03, 0.26, C.woodD, 0.72, y + 0.22, quayZ);
    b.cylT(0.08, 0.11, 0.62, P.white, -armX, y, tip, 8).box(0.18, 0.16, 0.18, P.glass, -armX, y + 0.62, tip); // the beacon
    b.cone(0.13, 0.14, P.tile, -armX, y + 0.78, tip, 8).sph(0.05, P.ember, -armX, y + 0.69, tip);
    return Math.max(Math.max(top, craneTop), y + 0.92);
  },
  industrial(ctx, { y, quayZ, armX }, top) { // iron bollards, a steam crane with its smoking boiler, coal on the quay
    const { b, h, extra } = ctx;
    for (const k of [-1, 1]) for (const z of [0.2, 0.9]) {
      b.cylT(0.04, 0.05, 0.12, P.iron, k * (h - 0.1), y, z, 8).cyl(0.06, 0.03, P.iron, k * (h - 0.1), y + 0.12, z);
    }
    const craneX = armX, craneZ = 0.0;
    b.box(0.44, 0.3, 0.44, P.iron, craneX, y, craneZ).cyl(0.12, 0.3, BOILER, craneX - 0.1, y + 0.3, craneZ - 0.1);
    pushExtra(extra, 'smoke', { geo: puff(), at: [craneX - 0.1, y + 0.68, craneZ - 0.1], phase: 0.3 });
    const craneTop = crane(ctx, craneX, craneZ + 0.1, y + 0.3, 0.7, P.iron, JIB_STEEL, 1.1);
    for (let i = 0; i < 4; i++) b.rock(0.09, COAL, 0.3 + (i % 2) * 0.16, y, quayZ - 0.15 + (i >> 1) * 0.15, 1, 0.7, 1, i);
    return Math.max(top, craneTop);
  },
  modern(ctx, { y, quayZ }, top) { // a container gantry over the slip, stacked containers, a radar mast on the house
    const { b, mast, h, t } = ctx, legX = h - ARM / 2, beam = ctx.s - ARM + 0.1;
    for (const k of [-1, 1]) b.box(0.08, 1.3, 0.08, GANTRY, k * legX, y, 0.35).box(0.08, 1.3, 0.08, GANTRY, k * legX, y, 0.95);
    b.box(beam, 0.12, 0.14, GANTRY, 0, y + 1.3, 0.35).box(beam, 0.12, 0.14, GANTRY, 0, y + 1.3, 0.95);
    b.box(0.3, 0.16, 0.7, CABIN, 0.2, y + 1.42, 0.65).box(0.12, 0.02, 0.5, t, 0.2, y + 1.58, 0.65); // the trolley
    const containers = [
      [0.48, quayZ - 0.1, 0, CONTAINER_BLUE], [0.48, quayZ + 0.18, 0, CONTAINER_RED], [0.48, quayZ + 0.04, 0.2, t],
    ];
    for (const [x, z, lift, color] of containers) b.box(0.42, 0.2, 0.26, color, x, y + lift, z, 0, Math.PI / 2);
    mast.cyl(0.015, 0.6, GREY, -0.9, top, quayZ).box(0.3, 0.04, 0.06, GREY, -0.9, top + 0.55, quayZ);
    return Math.max(top, y + 1.58);
  },
};
// AI Future: hover pads under the platform, a launch ring over the slip and a hovering cargo drone.
function futureHarbour(ctx, { y, quayZ, armX }, top) {
  const { b, h, t, extra } = ctx;
  for (const [x, z] of [[-h + 0.3, -h + 0.3], [h - 0.3, -h + 0.3], [-armX, h - 0.3], [armX, h - 0.3]]) {
    b.add(CYL8, P.dark, x, 0.05, z, 0.2, 0.1, 0.2).add(CYL8, P.neonC, x, 0.0, z, 0.16, 0.02, 0.16);
  }
  for (const k of [-1, 1]) b.box(0.08, 0.7, 0.08, P.chrome, k * (h - ARM), y, 0.9);
  b.box(ctx.s - 2 * ARM + 0.1, 0.06, 0.08, P.chrome, 0, y + 0.7, 0.9).box(ctx.s - 2 * ARM, 0.03, 0.03, P.neonM, 0, y + 0.66, 0.9);
  const drone = new B()
    .box(0.36, 0.1, 0.36, P.snow) // the body
    .box(0.38, 0.03, 0.38, P.neonC, 0, -0.03, 0)
    .box(0.28, 0.16, 0.28, t, 0, -0.2, 0); // the cargo pod slung under it
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) drone.cyl(0.08, 0.02, P.dark, x, 0.1, z); // rotors
  pushExtra(extra, 'floaters', { geo: drone.geometry(), at: [0.55, y + 1.0, quayZ], amp: 0.08, speed: 1.3 });
  return Math.max(top, y + 0.76);
}

export function dock(ctx) {
  const { h, age } = ctx, y = pier(ctx), quayZ = -h + QUAY / 2, armX = h - ARM / 2, tip = h - 0.25;
  // The harbour house on the quay's left, the team flag on the right arm's tip.
  let houseTop;
  if (age === 'stone' || age === 'tool') {
    const { b, t } = ctx;
    b.box(1.1, 0.48, 0.72, age === 'stone' ? C.woodD : P.mud, -0.68, y, quayZ)
      .roof(1.24, 0.34, 0.86, C.hay, -0.68, y + 0.48, quayZ)
      .box(0.24, 0.35, 0.025, C.dark, -0.68, y, quayZ + 0.37)
      .box(0.3, 0.045, 0.025, t, -0.68, y + 0.36, quayZ + 0.38);
    for (const z of [0.15, 0.85]) stick(b, 0.025, C.woodD, [armX, y, z], [armX, y + 0.6, z], CYL6);
    b.box(0.02, 0.35, 0.7, C.hay, armX, y + 0.2, 0.5);
    for (const x of [0.3, 0.6]) sack(b, x, y, quayZ, 0.12);
    if (age === 'tool') b.box(0.4, 0.2, 0.35, C.wood, -armX, y, 0.5).box(0.44, 0.035, 0.39, C.woodD, -armX, y + 0.2, 0.5);
    houseTop = y + 0.82;
  } else houseTop = block(ctx, { w: 1.2, d: 0.8, hh: 0.62, x: -0.68, z: quayZ, y });
  flag(ctx, armX, y, tip, 0.9, age === 'future' ? P.chrome : C.woodD);
  if (age === 'stone' || age === 'tool') return houseTop;
  return (HARBOURS[age] ?? futureHarbour)(ctx, { y, quayZ, armX, tip }, houseTop);
}
