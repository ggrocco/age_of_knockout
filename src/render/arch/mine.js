// The Mine, one design for every era from Tool to AI Future: a low rocky mound over the ore with a dark shaft mouth at
// its back-left corner, a headframe over the shaft carrying the winding wheel, a short track from the mouth to the ore
// pile at its back-right and the era's winder in front. The headframe grows with the eras: a log A-frame with a
// windlass (Tool), on a mud-brick collar beside a domed hut (Bronze), squared and iron-strapped under a plank hood beside
// a smelting furnace (Iron), a gallows frame worked by a treadwheel (Medieval), a timber-and-iron tower before a brick
// winding house (Sail), a steel lattice headframe with an engine house and its chimney (Industrial), a concrete tower
// feeding a conveyor (Modern) and a glowing lift pylon over a mag-rail (AI Future).
//
// Animated parts in ctx.extra (see buildingModel): `wheel`, the winding wheel turning about x; `cart`, the tub on the
// track, run between `from` and `to`; both move only while villagers dig. `ore` holds the pile at the track's end in
// both tints ({ gold, stone, at }), since the model cache can't see which ore the Mine stands on.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, stick, lerp, hash, CYL6, CYL8, BALL, CONE4, FRUSTUM } from './kit.js';

const ROCK = 0x7f776a, ROCK_D = 0x5f584e, ROCK_L = 0x9a9183, SHAFT = 0x14110e, ORE = 0x6c655b;
const BRICK = P.brick, BRICK_D = P.brickD, CONCRETE = P.concrete, STEEL = P.steel, IRON = P.iron, RAIL = 0x2f3236;
const JAR = 0xa56843, SLAG = 0x5a4a3a, TILE = 0xa96342, SLATE_ROOF = 0x5d6468, WINDOW = 0x34495a, WINDOW_D = 0x2f4f6a;
const CHIMNEY_CAP = 0xc8b48a, SLEEPER_D = 0x4e3a28, BELT = 0x2a2f2c, CONCRETE_D = 0xa8a69f;
const TINT = { gold: 0xd4af37, stone: 0x9a9a94 };
// The shaft mouth's centre, the mound's top (where everything stands), and the track along x at z = TRACK_Z from the
// mouth to the pile.
const SHAFT_X = -0.34, SHAFT_Z = -0.34, GROUND = 0.12, TRACK_Z = -0.34, PILE = [0.68, GROUND, -0.34];
const TORUS = new THREE.TorusGeometry(1, 0.08, 4, 16);
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];

const shade = (color, factor) => new THREE.Color(color).multiplyScalar(factor).getHex();

// A winding wheel of radius R turning about x, centred on the origin: rim, n spokes and hub.
const sheave = (R, color, hub = IRON, n = 4) => {
  const g = new B()
    .add(TORUS, color, 0, 0, 0, R, R, R, 0, Math.PI / 2, 0)
    .add(CYL8, hub, 0, 0, 0, R * 0.22, 0.06, R * 0.22, 0, 0, Math.PI / 2);
  for (let i = 0; i < n; i++) g.box(0.025, R * 2, 0.025, color, 0, -R, 0, i * Math.PI / n);
  return g;
};
// A treadwheel of radius R and width w turning about x: two rims, the tread slats and the spokes.
const treadwheel = (R, w, t) => {
  const g = new B();
  for (const k of [-1, 1]) {
    g.add(TORUS, C.woodD, k * w / 2, 0, 0, R, R, R * 1.4, 0, Math.PI / 2, 0);
    for (let i = 0; i < 3; i++) g.box(0.03, R * 2, 0.03, C.wood, k * w / 2, -R, 0, i * Math.PI / 3);
  }
  for (let i = 0; i < 14; i++) {
    const angle = i * Math.PI / 7;
    g.box(w, 0.02, 0.07, i % 7 ? C.wood : t, 0, Math.sin(angle) * R - 0.01, Math.cos(angle) * R, angle);
  }
  return g.add(CYL8, C.woodD, 0, 0, 0, 0.05, w + 0.1, 0.05, 0, 0, Math.PI / 2);
};
// The tub that runs the track, built at the origin along x standing on it (y = 0): a box on four small wheels, heaped
// with grey ore (either kind: the pile shows which). body and band are its colours.
const tub = (body, band, wheels = IRON) => {
  const g = new B();
  for (const x of [-0.06, 0.06]) for (const k of [-1, 1]) {
    g.add(CYL6, wheels, x, 0.035, k * 0.06, 0.035, 0.02, 0.035, Math.PI / 2, 0, 0);
  }
  g.box(0.22, 0.11, 0.15, body, 0, 0.04, 0).box(0.23, 0.025, 0.16, band, 0, 0.13, 0);
  for (let i = 0; i < 3; i++) g.rock(0.045, i % 2 ? ORE : ROCK_L, -0.05 + i * 0.05, 0.12, (hash(i, 5) - 0.5) * 0.06, 1, 0.7, 1, i);
  return g;
};
// The ore heap at the end of the track, in one ore's tint, centred on the origin.
const orePile = tint => {
  const g = new B(), dark = shade(tint, 0.72), light = shade(tint, 1.15);
  g.rock(0.15, tint, 0, 0, 0, 1.2, 0.8, 1.1, 0.4);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + hash(i, 1), r = 0.13 + hash(i, 2) * 0.05;
    g.rock(0.06 + hash(i, 3) * 0.035, [dark, tint, light][i % 3], Math.cos(angle) * r, 0, Math.sin(angle) * r, 1, 0.8, 1, i);
  }
  return g.rock(0.06, light, 0.02, 0.12, -0.02, 1, 0.8, 1, 2);
};
// A track along x from x0 to x1 at z = TRACK_Z on y: sleepers and two rails.
const track = (b, x0, x1, y = GROUND, sleeper = C.woodD, rail = RAIL) => {
  for (let x = x0 + 0.04; x < x1; x += 0.1) b.box(0.05, 0.02, 0.22, sleeper, x, y, TRACK_Z);
  for (const offset of [-0.07, 0.07]) b.box(x1 - x0, 0.025, 0.02, rail, (x0 + x1) / 2, y + 0.015, TRACK_Z + offset);
};

// The mound every era stands on: a rocky bank over the footprint, boulders round its rim, and the shaft mouth.
const mound = (b, collar) => {
  b.add(FRUSTUM, ROCK, 0, GROUND / 2, 0, 0.88, GROUND, 0.88);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6 + hash(i, 9) * 0.4, r = 0.66 + hash(i, 4) * 0.12;
    const boulder = 0.07 + hash(i, 6) * 0.06;
    b.rock(boulder, [ROCK, ROCK_D, ROCK_L][i % 3], Math.cos(angle) * r, GROUND - 0.04, Math.sin(angle) * r, 1, 0.7, 1, i);
  }
  b.box(0.4, 0.012, 0.4, SHAFT, SHAFT_X, GROUND, SHAFT_Z);
  // The collar round the mouth.
  b.box(0.48, 0.05, 0.05, collar, SHAFT_X, GROUND, SHAFT_Z - 0.22).box(0.48, 0.05, 0.05, collar, SHAFT_X, GROUND, SHAFT_Z + 0.22);
  b.box(0.05, 0.05, 0.4, collar, SHAFT_X - 0.22, GROUND, SHAFT_Z).box(0.05, 0.05, 0.4, collar, SHAFT_X + 0.22, GROUND, SHAFT_Z);
};
// An A-frame over the shaft H tall: at x = SHAFT_X ± half, a pair of legs straddling it along z meeting at the apex,
// tied halfway; the axle runs across the two apexes. geo and r are the legs' section; returns the wheel's centre.
const aFrame = (b, H, r, color, geo = CYL6, half = 0.22, foot = 0.34) => {
  const tieY = GROUND + (H - GROUND) * 0.45;
  for (const k of [-1, 1]) {
    const x = SHAFT_X + k * half, apex = [x, H, SHAFT_Z];
    stick(b, r, color, [x, GROUND, SHAFT_Z - foot], apex, geo);
    stick(b, r, color, [x, GROUND, SHAFT_Z + foot], apex, geo);
    stick(b, r * 0.7, C.woodD, [x, tieY, SHAFT_Z - foot * 0.55], [x, tieY, SHAFT_Z + foot * 0.55], geo);
  }
  b.add(CYL6, C.woodD, SHAFT_X, H - 0.06, SHAFT_Z, 0.03, half * 2 + 0.12, 0.03, 0, 0, Math.PI / 2);
  return [SHAFT_X, H - 0.06, SHAFT_Z];
};
// The rope from the top of the wheel at `wheel` (radius R) forward to `to`, and down the shaft from its back.
const rope = (b, wheel, R, to, color = C.hay) => {
  const [x, y, z] = wheel;
  stick(b, 0.008, color, [x, y + R * 0.2, z + R], to, CYL6);
  stick(b, 0.008, color, [x, y, z - R], [x, GROUND + 0.02, z - R], CYL6);
};
// The Industrial steel headframe H tall: each side's pair of legs meeting at the top, laced with struts and diagonals,
// and struts across the front between the two sides.
const latticeHeadframe = (b, H) => {
  const legs = [];
  for (const k of [-1, 1]) {
    const top = [SHAFT_X + k * 0.12, H, SHAFT_Z], back = [SHAFT_X + k * 0.24, GROUND, SHAFT_Z - 0.26];
    const front = [SHAFT_X + k * 0.24, GROUND, SHAFT_Z + 0.26];
    stick(b, 0.03, STEEL, back, top, unit.box);
    stick(b, 0.03, STEEL, front, top, unit.box);
    legs.push([back, front, top]);
    for (let i = 1; i < 6; i++) {
      const onBack = lerp(back, top, i / 6), onFront = lerp(front, top, i / 6), belowBack = lerp(back, top, (i - 1) / 6);
      stick(b, 0.012, STEEL, onBack, onFront, unit.box);
      stick(b, 0.01, IRON, belowBack, onFront, unit.box);
    }
  }
  for (let i = 0; i < 5; i++) {
    const f = (i + 1) / 6;
    stick(b, 0.012, STEEL, lerp(legs[0][1], legs[0][2], f), lerp(legs[1][1], legs[1][2], f), unit.box);
  }
};
// The tub's run along the track, `lift` above the mound.
const cartRun = (geo, fromX, toX, lift) => ({ geo, from: [fromX, GROUND + lift, TRACK_Z], to: [toX, GROUND + lift, TRACK_Z] });

const ERAS = {
  // Tool: a log A-frame lashed at the top, a rope windlass in front on forked posts, a leather bucket in the shaft, a
  // wattle hurdle and a team hide on the flagpole.
  tool(ctx) {
    const { b, t, extra } = ctx, radius = 0.15;
    const wheel = aFrame(b, 1.25, 0.04, C.wood);
    for (const k of [-1, 1]) b.add(BALL, P.hideD, SHAFT_X + k * 0.22, 1.2, SHAFT_Z, 0.05, 0.05, 0.05); // the lashings
    // The windlass: a drum on forked posts, with its crank.
    const windlassZ = 0.18;
    for (const k of [-1, 1]) {
      const x = SHAFT_X + k * 0.24;
      b.cyl(0.03, 0.42, C.woodD, x, GROUND, windlassZ).box(0.08, 0.04, 0.06, C.woodD, x, GROUND + 0.4, windlassZ);
    }
    b.add(CYL8, C.wood, SHAFT_X, GROUND + 0.42, windlassZ, 0.06, 0.48, 0.06, 0, 0, Math.PI / 2);
    b.box(0.03, 0.16, 0.03, C.woodD, SHAFT_X + 0.3, GROUND + 0.34, windlassZ);
    rope(b, wheel, radius, [SHAFT_X, GROUND + 0.47, windlassZ]);
    b.cylT(0.06, 0.05, 0.1, C.leather, SHAFT_X, GROUND + 0.06, SHAFT_Z + radius, 7); // the bucket
    // The wattle hurdle on its stakes, hung with a team hide.
    for (let i = 0; i < 5; i++) b.cyl(0.015, 0.3, C.woodD, 0.1 + i * 0.12, GROUND, 0.7);
    b.box(0.52, 0.18, 0.03, P.wattle, 0.34, GROUND + 0.06, 0.7).box(0.3, 0.22, 0.02, t, 0.34, GROUND + 0.04, 0.72);
    track(b, SHAFT_X + 0.24, 0.55);
    flag(ctx, 0.62, GROUND, 0.42, 0.8);
    extra.wheel = { geo: sheave(radius, C.wood, C.woodD).geometry(), at: wheel, axis: 'x', speed: 2.4 };
    extra.cart = cartRun(tub(C.wood, C.woodD, C.woodD).geometry(), -0.02, 0.44, 0.02);
    return 1.32;
  },
  // Bronze: the A-frame on a raised mud-brick collar, its posts capped in bronze and braced twice; a domed mud-brick
  // hut with a team awning in front, and storage jars.
  bronze(ctx) {
    const { b, t, extra } = ctx, radius = 0.16;
    b.box(0.62, 0.1, 0.62, P.mud, SHAFT_X, GROUND, SHAFT_Z).box(0.42, 0.012, 0.42, SHAFT, SHAFT_X, GROUND + 0.1, SHAFT_Z);
    const wheel = aFrame(b, 1.4, 0.04, C.wood);
    for (const k of [-1, 1]) {
      const x = SHAFT_X + k * 0.22;
      b.add(CONE4, C.bronze, x, 1.42, SHAFT_Z, 0.05, 0.08, 0.05);
      stick(b, 0.022, C.woodD, [x, 0.3, SHAFT_Z - 0.27], [x, 0.95, SHAFT_Z + 0.13], CYL6);
    }
    // The domed hut, its door and the team awning on a pole.
    const hutX = 0.4, hutZ = 0.38;
    b.box(0.44, 0.34, 0.36, P.mud, hutX, GROUND, hutZ).box(0.46, 0.04, 0.38, P.mudD, hutX, GROUND + 0.34, hutZ);
    b.add(BALL, P.mudD, hutX, GROUND + 0.38, hutZ, 0.17, 0.12, 0.15).box(0.12, 0.2, 0.02, C.dark, hutX - 0.1, GROUND, hutZ + 0.18);
    stick(b, 0.012, C.woodD, [hutX + 0.02, GROUND + 0.32, hutZ + 0.18], [hutX + 0.02, GROUND, hutZ + 0.44], CYL6);
    b.box(0.32, 0.015, 0.26, t, hutX + 0.02, GROUND + 0.26, hutZ + 0.3, 0.45);
    for (const [x, z] of [[-0.1, 0.5], [-0.24, 0.62], [0.05, 0.66]]) {
      b.cylT(0.05, 0.07, 0.16, JAR, x, GROUND, z, 8).cylT(0.03, 0.05, 0.04, JAR, x, GROUND + 0.16, z, 8);
    }
    rope(b, wheel, radius, [SHAFT_X, GROUND + 0.2, 0.2]);
    track(b, SHAFT_X + 0.3, 0.55);
    flag(ctx, 0.66, GROUND + 0.4, 0.2, 0.75);
    extra.wheel = { geo: sheave(radius, C.wood, C.bronze).geometry(), at: wheel, axis: 'x', speed: 2.4 };
    extra.cart = cartRun(tub(C.wood, C.bronze).geometry(), 0.0, 0.44, 0.02);
    return 1.5;
  },
  // Iron: squared timbers strapped with iron plates on a dressed-stone collar, a plank hood shading the shaft, and a
  // stone smelting furnace with a team banner.
  iron(ctx) {
    const { b, t, extra } = ctx, radius = 0.17;
    b.box(0.6, 0.08, 0.6, C.stone, SHAFT_X, GROUND, SHAFT_Z).box(0.42, 0.012, 0.42, SHAFT, SHAFT_X, GROUND + 0.08, SHAFT_Z);
    const wheel = aFrame(b, 1.55, 0.035, C.wood, unit.box);
    for (const k of [-1, 1]) for (const f of [0.3, 0.7]) { // the iron straps
      b.box(0.08, 0.05, 0.08, IRON, SHAFT_X + k * 0.22, GROUND + (1.55 - GROUND) * f, SHAFT_Z + (f - 0.5) * 0.4);
    }
    for (const k of [-1, 1]) b.box(0.6, 0.02, 0.26, C.wood, SHAFT_X, 0.66, SHAFT_Z + k * 0.14, k * 0.35); // the plank hood
    // The furnace, glowing at its mouth, with a team banner and slag and blooms beside it.
    const furnaceX = 0.42, furnaceZ = 0.42;
    b.cylT(0.16, 0.22, 0.42, C.stoneD, furnaceX, GROUND, furnaceZ, 8); // the furnace
    b.cylT(0.08, 0.14, 0.24, C.stone, furnaceX, GROUND + 0.42, furnaceZ, 8); // its flue
    b.box(0.1, 0.1, 0.02, P.fire, furnaceX, GROUND + 0.04, furnaceZ + 0.21);
    b.box(0.02, 0.36, 0.24, t, furnaceX - 0.23, GROUND + 0.18, furnaceZ);
    for (let i = 0; i < 4; i++) {
      b.box(0.12, 0.06, 0.1, i % 2 ? IRON : SLAG, -0.04 + (i % 2) * 0.13, GROUND + (i > 1 ? 0.06 : 0), 0.6);
    }
    rope(b, wheel, radius, [SHAFT_X, GROUND + 0.3, 0.22], C.leather);
    b.box(0.08, 0.3, 0.08, C.woodD, SHAFT_X, GROUND, 0.22); // the winch post
    b.box(0.3, 0.06, 0.06, IRON, SHAFT_X, GROUND + 0.26, 0.22);
    track(b, SHAFT_X + 0.3, 0.55, GROUND, C.woodD, IRON);
    flag(ctx, 0.7, GROUND, 0.06, 0.85);
    extra.wheel = { geo: sheave(radius, C.woodD, IRON, 6).geometry(), at: wheel, axis: 'x', speed: 2.2 };
    extra.cart = cartRun(tub(C.woodD, IRON).geometry(), 0.0, 0.44, 0.035);
    return 1.62;
  },
  // Medieval: a gallows frame over the shaft with a pulley block, worked by a treadwheel on trestles in front (the
  // turning wheel), and a slate-roofed lean-to with a team door.
  medieval(ctx) {
    const { b, t, extra } = ctx, radius = 0.38, wheelWidth = 0.26, wheelY = GROUND + 0.44, wheelZ = 0.24;
    // The gallows frame: two posts on sills, raking props, a crossbeam and the pulley block.
    for (const k of [-1, 1]) {
      const x = SHAFT_X + k * 0.24;
      b.box(0.08, 1.2, 0.08, C.woodD, x, GROUND, SHAFT_Z).box(0.08, 0.04, 0.4, C.woodD, x, GROUND, SHAFT_Z);
    }
    for (const k of [-1, 1]) {
      const x = SHAFT_X + k * 0.24;
      stick(b, 0.025, C.wood, [x, GROUND + 0.04, SHAFT_Z + 0.18], [x, GROUND + 0.8, SHAFT_Z], unit.box);
    }
    b.box(0.6, 0.08, 0.1, C.wood, SHAFT_X, GROUND + 1.2, SHAFT_Z).box(0.12, 0.1, 0.08, C.woodD, SHAFT_X, GROUND + 1.1, SHAFT_Z);
    // The treadwheel's trestles.
    for (const k of [-1, 1]) {
      const trestleX = SHAFT_X + k * (wheelWidth / 2 + 0.07);
      stick(b, 0.022, C.woodD, [trestleX, GROUND, wheelZ - 0.3], [trestleX, wheelY + 0.03, wheelZ], unit.box);
      stick(b, 0.022, C.woodD, [trestleX, GROUND, wheelZ + 0.3], [trestleX, wheelY + 0.03, wheelZ], unit.box);
      b.box(0.05, 0.03, 0.66, C.wood, trestleX, GROUND, wheelZ);
    }
    stick(b, 0.008, C.hay, [SHAFT_X, wheelY + 0.04, wheelZ], [SHAFT_X, GROUND + 1.12, SHAFT_Z], CYL6); // the rope
    stick(b, 0.008, C.hay, [SHAFT_X, GROUND + 1.12, SHAFT_Z], [SHAFT_X, GROUND + 0.02, SHAFT_Z], CYL6);
    const leanToX = 0.46, leanToZ = 0.5;
    b.box(0.5, 0.34, 0.3, C.stone, leanToX, GROUND, leanToZ).box(0.16, 0.24, 0.02, t, leanToX, GROUND, leanToZ + 0.155);
    b.box(0.56, 0.03, 0.4, P.slate, leanToX, GROUND + 0.38, leanToZ - 0.01, -0.3);
    track(b, SHAFT_X + 0.3, 0.55);
    flag(ctx, 0.74, GROUND + 0.42, 0.42, 0.6);
    extra.wheel = { geo: treadwheel(radius, wheelWidth, t).geometry(), at: [SHAFT_X, wheelY, wheelZ], axis: 'x', speed: 1.2 };
    extra.cart = cartRun(tub(C.wood, IRON).geometry(), 0.0, 0.44, 0.035);
    return GROUND + 1.28;
  },
  // Age of Sail: a four-post timber headframe tapering to the wheel, cross-braced with iron rods, over a brick collar;
  // a brick winding house with a tiled roof and a team door in front.
  sail(ctx) {
    const { b, t, extra } = ctx, H = 1.85, radius = 0.19, footSpread = 0.24, topSpread = 0.1;
    b.box(0.56, 0.08, 0.56, BRICK, SHAFT_X, GROUND, SHAFT_Z).box(0.42, 0.012, 0.42, SHAFT, SHAFT_X, GROUND + 0.08, SHAFT_Z);
    // The point on the leg at corner (sx, sz) at height y.
    const leg = (sx, sz, y) => {
      const f = (y - GROUND) / (H - GROUND), spread = footSpread + (topSpread - footSpread) * f;
      return [SHAFT_X + sx * spread, y, SHAFT_Z + sz * spread];
    };
    for (const [sx, sz] of CORNERS) stick(b, 0.035, C.wood, leg(sx, sz, GROUND), leg(sx, sz, H), unit.box);
    const sides = [[[-1, -1], [1, -1]], [[-1, 1], [1, 1]], [[-1, -1], [-1, 1]], [[1, -1], [1, 1]]];
    for (const y of [0.7, 1.3]) for (const [from, to] of sides) stick(b, 0.02, C.woodD, leg(...from, y), leg(...to, y), unit.box);
    for (const [from, to] of [[[-1, 1], [1, 1]], [[1, -1], [1, 1]]]) { // iron rods crossing the camera faces
      stick(b, 0.01, IRON, leg(...from, 0.2), leg(...to, 0.7), CYL6);
      stick(b, 0.01, IRON, leg(...to, 0.2), leg(...from, 0.7), CYL6);
    }
    b.box(0.3, 0.05, 0.3, C.woodD, SHAFT_X, H, SHAFT_Z);
    const wheel = [SHAFT_X, H + 0.08, SHAFT_Z];
    // The winding house with a tiled roof, a team door and a window.
    const houseX = 0.36, houseZ = 0.42;
    b.box(0.6, 0.4, 0.38, BRICK, houseX, GROUND, houseZ).roof(0.44, 0.2, 0.62, TILE, houseX, GROUND + 0.4, houseZ, Math.PI / 2);
    b.box(0.14, 0.26, 0.02, t, houseX - 0.12, GROUND, houseZ + 0.195);
    b.box(0.12, 0.12, 0.02, WINDOW_D, houseX + 0.14, GROUND + 0.18, houseZ + 0.195);
    rope(b, wheel, radius, [houseX - 0.3, GROUND + 0.3, houseZ - 0.1], C.hay);
    track(b, SHAFT_X + 0.3, 0.55, GROUND, C.woodD, IRON);
    flag(ctx, houseX + 0.22, GROUND + 0.5, houseZ, 0.55);
    extra.wheel = { geo: sheave(radius, IRON, C.brass, 6).geometry(), at: wheel, axis: 'x', speed: 2.6 };
    extra.cart = cartRun(tub(IRON, C.woodD).geometry(), 0.0, 0.44, 0.035);
    return H + 0.3;
  },
  // Industrial: a steel lattice headframe, its back legs raked to take the pull, laced on every face; a brick engine
  // house with a team door and a tall chimney.
  industrial(ctx) {
    const { b, t, extra } = ctx, H = 2.3, radius = 0.24;
    b.box(0.6, 0.06, 0.6, CONCRETE, SHAFT_X, GROUND, SHAFT_Z).box(0.42, 0.012, 0.42, SHAFT, SHAFT_X, GROUND + 0.06, SHAFT_Z);
    latticeHeadframe(b, H);
    b.box(0.36, 0.04, 0.14, STEEL, SHAFT_X, H - 0.02, SHAFT_Z).box(0.4, 0.03, 0.03, t, SHAFT_X, H - 0.12, SHAFT_Z + 0.05);
    const wheel = [SHAFT_X, H + 0.14, SHAFT_Z];
    // The engine house, its team door and windows, and the chimney.
    const houseX = 0.36, houseZ = 0.44;
    b.box(0.62, 0.48, 0.42, BRICK, houseX, GROUND, houseZ);
    b.roof(0.48, 0.18, 0.64, SLATE_ROOF, houseX, GROUND + 0.48, houseZ, Math.PI / 2);
    b.box(0.14, 0.28, 0.02, t, houseX - 0.14, GROUND, houseZ + 0.215);
    for (const x of [0.04, 0.2]) b.box(0.1, 0.16, 0.02, WINDOW, houseX + x, GROUND + 0.22, houseZ + 0.215);
    b.box(0.16, 1.8, 0.16, BRICK_D, 0.66, GROUND, 0.22).box(0.2, 0.05, 0.2, CHIMNEY_CAP, 0.66, GROUND + 1.8, 0.22);
    rope(b, wheel, radius, [houseX - 0.3, GROUND + 0.4, houseZ - 0.2], RAIL);
    track(b, SHAFT_X + 0.3, 0.55, GROUND, SLEEPER_D, RAIL);
    flag(ctx, houseX - 0.2, GROUND + 0.66, houseZ - 0.1, 0.5, P.iron);
    extra.wheel = { geo: sheave(radius, STEEL, IRON, 8).geometry(), at: wheel, axis: 'x', speed: 3 };
    extra.cart = cartRun(tub(t, IRON).geometry(), 0.0, 0.44, 0.035);
    return H + 0.42;
  },
  // Modern: a concrete winder tower over the shaft with the wheel in an open housing on its roof, a team band and
  // glazed control room; an inclined conveyor carries the skip from the tower's foot up over the ore heap.
  modern(ctx) {
    const { b, t, extra } = ctx, H = 2.2, radius = 0.2;
    b.box(0.5, H - GROUND, 0.5, CONCRETE, SHAFT_X, GROUND, SHAFT_Z).box(0.52, 0.06, 0.52, CONCRETE_D, SHAFT_X, H, SHAFT_Z);
    b.box(0.52, 0.08, 0.52, t, SHAFT_X, H - 0.3, SHAFT_Z);
    b.box(0.36, 0.2, 0.02, WINDOW, SHAFT_X, H - 0.6, SHAFT_Z + 0.255); // the control room's windows
    b.box(0.02, 0.2, 0.36, WINDOW, SHAFT_X + 0.255, H - 0.6, SHAFT_Z);
    for (const k of [-1, 1]) b.box(0.04, 0.34, 0.3, STEEL, SHAFT_X + k * 0.14, H + 0.06, SHAFT_Z); // the wheel's housing
    b.box(0.14, 0.28, 0.02, C.dark, SHAFT_X + 0.1, GROUND, SHAFT_Z + 0.255);
    const wheel = [SHAFT_X, H + 0.26, SHAFT_Z];
    // The conveyor: a belt on trestles, low at the tower and high over the pile.
    const low = [SHAFT_X + 0.3, GROUND + 0.12, TRACK_Z], high = [0.62, GROUND + 0.62, TRACK_Z];
    stick(b, 0.05, BELT, low, high, unit.box);
    for (const f of [0.35, 0.75]) {
      const p = lerp(low, high, f);
      for (const dz of [-0.07, 0.07]) b.box(0.04, p[1] - GROUND, 0.04, STEEL, p[0], GROUND, TRACK_Z + dz);
    }
    b.box(0.2, 0.14, 0.2, STEEL, high[0], high[1] - 0.16, TRACK_Z);
    const houseX = 0.36, houseZ = 0.44;
    b.box(0.6, 0.34, 0.36, CONCRETE, houseX, GROUND, houseZ).box(0.62, 0.04, 0.38, t, houseX, GROUND + 0.34, houseZ);
    b.box(0.5, 0.12, 0.02, WINDOW, houseX, GROUND + 0.16, houseZ + 0.185);
    rope(b, wheel, radius, [SHAFT_X + 0.2, H + 0.06, SHAFT_Z + 0.2], RAIL);
    flag(ctx, houseX + 0.22, GROUND + 0.38, houseZ - 0.1, 0.5, STEEL);
    extra.wheel = { geo: sheave(radius, STEEL, t, 6).geometry(), at: wheel, axis: 'x', speed: 3.2 };
    const skip = new B()
      .box(0.16, 0.08, 0.12, t, 0, 0.02, 0)
      .rock(0.04, ORE, 0, 0.08, 0, 1, 0.7, 1)
      .box(0.17, 0.02, 0.13, STEEL, 0, 0, 0);
    const onBelt = f => lerp(low, high, f).map((v, i) => i === 1 ? v + 0.05 : v);
    extra.cart = { geo: skip.geometry(), from: onBelt(0.1), to: onBelt(0.9) };
    return H + 0.42;
  },
  // AI Future: a slender white lift pylon over a glowing shaft ring, a neon ring turning at its head, and a mag-rail
  // down which a hover pod glides to the heap; a low white processing pod with a team band in front.
  future(ctx) {
    const { b, t, extra } = ctx, H = 2.5;
    b.box(0.56, 0.04, 0.56, P.snow, SHAFT_X, GROUND, SHAFT_Z).box(0.44, 0.02, 0.44, P.neonC, SHAFT_X, GROUND + 0.035, SHAFT_Z);
    b.box(0.38, 0.03, 0.38, SHAFT, SHAFT_X, GROUND + 0.04, SHAFT_Z);
    for (const [sx, sz] of CORNERS) { // the pylon's legs, each with a neon strip
      const legFoot = [SHAFT_X + sx * 0.22, GROUND, SHAFT_Z + sz * 0.22];
      stick(b, 0.03, P.snow, legFoot, [SHAFT_X + sx * 0.08, H, SHAFT_Z + sz * 0.08], unit.box);
      const stripFoot = [SHAFT_X + sx * 0.235, GROUND + 0.05, SHAFT_Z + sz * 0.235];
      stick(b, 0.008, P.neonC, stripFoot, [SHAFT_X + sx * 0.095, H - 0.05, SHAFT_Z + sz * 0.095], unit.box);
    }
    b.box(0.26, 0.08, 0.26, P.chrome, SHAFT_X, H, SHAFT_Z).box(0.28, 0.02, 0.28, t, SHAFT_X, H + 0.08, SHAFT_Z);
    const wheel = [SHAFT_X, H + 0.3, SHAFT_Z];
    b.box(0.03, 0.2, 0.03, P.chrome, SHAFT_X, H + 0.08, SHAFT_Z);
    // The mag-rail: a white beam with a neon strip on short posts.
    b.box(0.66, 0.06, 0.12, P.snow, 0.17, GROUND + 0.1, TRACK_Z).box(0.66, 0.012, 0.04, P.neonC, 0.17, GROUND + 0.16, TRACK_Z);
    for (const x of [-0.08, 0.42]) b.box(0.05, 0.1, 0.05, P.chrome, x, GROUND, TRACK_Z);
    // The processing pod.
    const podX = 0.36, podZ = 0.44;
    b.add(BALL, P.snow, podX, GROUND, podZ, 0.34, 0.26, 0.24).box(0.5, 0.03, 0.04, t, podX, GROUND + 0.12, podZ + 0.21);
    b.box(0.3, 0.012, 0.02, P.neonM, podX, GROUND + 0.2, podZ + 0.18);
    flag(ctx, podX + 0.24, GROUND + 0.1, podZ - 0.14, 0.55, P.chrome);
    const rings = new B()
      .add(TORUS, P.neonC, 0, 0, 0, 0.17, 0.17, 0.17, 0, Math.PI / 2, 0)
      .add(TORUS, P.neonM, 0, 0, 0, 0.11, 0.11, 0.11, 0, Math.PI / 2, 0.6);
    extra.wheel = { geo: rings.geometry(), at: wheel, axis: 'x', speed: 2.4 };
    const pod = new B()
      .add(BALL, P.chrome, 0, 0.06, 0, 0.12, 0.05, 0.08)
      .box(0.2, 0.01, 0.06, P.neonC, 0, 0.02, 0)
      .rock(0.04, ORE, 0, 0.08, 0, 1, 0.7, 1);
    extra.cart = cartRun(pod.geometry(), -0.02, 0.42, 0.2);
    return H + 0.34;
  },
};

// The collar round the shaft mouth, per era.
const COLLAR = {
  tool: C.wood, bronze: P.mudD, iron: C.stoneD, medieval: C.woodD, sail: BRICK_D, industrial: STEEL, modern: CONCRETE,
  future: P.chrome,
};
export function mine(ctx) {
  mound(ctx.b, COLLAR[ctx.age] ?? C.wood);
  const top = ERAS[ctx.age](ctx);
  ctx.extra.ore = { gold: orePile(TINT.gold).geometry(), stone: orePile(TINT.stone).geometry(), at: PILE };
  return top;
}
