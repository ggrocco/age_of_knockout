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
const TINT = { gold: 0xd4af37, stone: 0x9a9a94 };
// The shaft mouth's centre, the mound's top, and the track along x at z = TZ from the mouth to the pile.
const SX = -0.34, SZ = -0.34, G = 0.12, TZ = -0.34, PILE = [0.68, G, -0.34];
const TORUS = new THREE.TorusGeometry(1, 0.08, 4, 16);

const shade = (c, k) => { const col = new THREE.Color(c); return col.multiplyScalar(k).getHex(); };

// A winding wheel of radius R turning about x, centred on the origin: rim, n spokes and hub.
const sheave = (R, c, hub = IRON, n = 4) => {
  const g = new B().add(TORUS, c, 0, 0, 0, R, R, R, 0, Math.PI / 2, 0).add(CYL8, hub, 0, 0, 0, R * 0.22, 0.06, R * 0.22, 0, 0, Math.PI / 2);
  for (let i = 0; i < n; i++) g.box(0.025, R * 2, 0.025, c, 0, -R, 0, i * Math.PI / n);
  return g;
};
// A treadwheel of radius R and width w turning about x: two rims, the tread slats and the spokes.
const treadwheel = (R, w, t) => {
  const g = new B();
  for (const k of [-1, 1]) {
    g.add(TORUS, C.woodD, k * w / 2, 0, 0, R, R, R * 1.4, 0, Math.PI / 2, 0);
    for (let i = 0; i < 3; i++) g.box(0.03, R * 2, 0.03, C.wood, k * w / 2, -R, 0, i * Math.PI / 3);
  }
  for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; g.box(w, 0.02, 0.07, i % 7 ? C.wood : t, 0, Math.sin(a) * R - 0.01, Math.cos(a) * R, a); }
  return g.add(CYL8, C.woodD, 0, 0, 0, 0.05, w + 0.1, 0.05, 0, 0, Math.PI / 2);
};
// The tub that runs the track, built at the origin along x standing on it (y = 0): a box on four small wheels, heaped
// with grey ore (either kind: the pile shows which). body and band are its colours.
const tub = (body, band, wheels = IRON) => {
  const g = new B();
  for (const x of [-0.06, 0.06]) for (const k of [-1, 1]) g.add(CYL6, wheels, x, 0.035, k * 0.06, 0.035, 0.02, 0.035, Math.PI / 2, 0, 0);
  g.box(0.22, 0.11, 0.15, body, 0, 0.04, 0).box(0.23, 0.025, 0.16, band, 0, 0.13, 0);
  for (let i = 0; i < 3; i++) g.rock(0.045, i % 2 ? ORE : ROCK_L, -0.05 + i * 0.05, 0.12, (hash(i, 5) - 0.5) * 0.06, 1, 0.7, 1, i);
  return g;
};
// The ore heap at the end of the track, in one ore's tint, centred on the origin.
const orePile = tint => {
  const g = new B(), dark = shade(tint, 0.72), light = shade(tint, 1.15);
  g.rock(0.15, tint, 0, 0, 0, 1.2, 0.8, 1.1, 0.4);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + hash(i, 1), r = 0.13 + hash(i, 2) * 0.05;
    g.rock(0.06 + hash(i, 3) * 0.035, [dark, tint, light][i % 3], Math.cos(a) * r, 0, Math.sin(a) * r, 1, 0.8, 1, i);
  }
  return g.rock(0.06, light, 0.02, 0.12, -0.02, 1, 0.8, 1, 2);
};
// A track along x from x0 to x1 at z = TZ on y: sleepers and two rails.
const track = (b, x0, x1, y = G, sleeper = C.woodD, rail = RAIL) => {
  for (let x = x0 + 0.04; x < x1; x += 0.1) b.box(0.05, 0.02, 0.22, sleeper, x, y, TZ);
  for (const o of [-0.07, 0.07]) b.box(x1 - x0, 0.025, 0.02, rail, (x0 + x1) / 2, y + 0.015, TZ + o);
};

// The mound every era stands on: a rocky bank over the footprint, boulders round its rim, and the shaft mouth.
const mound = (b, collar) => {
  b.add(FRUSTUM, ROCK, 0, G / 2, 0, 0.88, G, 0.88);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6 + hash(i, 9) * 0.4, r = 0.66 + hash(i, 4) * 0.12;
    b.rock(0.07 + hash(i, 6) * 0.06, [ROCK, ROCK_D, ROCK_L][i % 3], Math.cos(a) * r, G - 0.04, Math.sin(a) * r, 1, 0.7, 1, i);
  }
  b.box(0.4, 0.012, 0.4, SHAFT, SX, G, SZ);
  b.box(0.48, 0.05, 0.05, collar, SX, G, SZ - 0.22).box(0.48, 0.05, 0.05, collar, SX, G, SZ + 0.22);
  b.box(0.05, 0.05, 0.4, collar, SX - 0.22, G, SZ).box(0.05, 0.05, 0.4, collar, SX + 0.22, G, SZ);
};
// An A-frame over the shaft H tall: at x = SX ± half, a pair of legs straddling it along z meeting at the apex, tied
// halfway; the axle runs across the two apexes. geo and r are the legs' section; returns the wheel's centre.
const aFrame = (b, H, r, c, geo = CYL6, half = 0.22, foot = 0.34) => {
  for (const k of [-1, 1]) {
    const x = SX + k * half, apex = [x, H, SZ];
    stick(b, r, c, [x, G, SZ - foot], apex, geo); stick(b, r, c, [x, G, SZ + foot], apex, geo);
    stick(b, r * 0.7, C.woodD, [x, G + (H - G) * 0.45, SZ - foot * 0.55], [x, G + (H - G) * 0.45, SZ + foot * 0.55], geo);
  }
  b.add(CYL6, C.woodD, SX, H - 0.06, SZ, 0.03, half * 2 + 0.12, 0.03, 0, 0, Math.PI / 2);
  return [SX, H - 0.06, SZ];
};
// The rope from the top of the wheel at w (radius R) forward to (x, y, z), and down the shaft from its back.
const rope = (b, w, R, to, c = C.hay) => {
  stick(b, 0.008, c, [w[0], w[1] + R * 0.2, w[2] + R], to, CYL6);
  stick(b, 0.008, c, [w[0], w[1], w[2] - R], [w[0], G + 0.02, w[2] - R], CYL6);
};

const ERAS = {
  // Tool: a log A-frame lashed at the top, a rope windlass in front on forked posts, a leather bucket in the shaft, a
  // wattle hurdle and a team hide on the flagpole.
  tool(ctx) {
    const { b, t, extra } = ctx, R = 0.15;
    const w = aFrame(b, 1.25, 0.04, C.wood);
    for (const k of [-1, 1]) b.add(BALL, P.hideD, SX + k * 0.22, 1.2, SZ, 0.05, 0.05, 0.05);
    const wz = 0.18;
    for (const k of [-1, 1]) b.cyl(0.03, 0.42, C.woodD, SX + k * 0.24, G, wz).box(0.08, 0.04, 0.06, C.woodD, SX + k * 0.24, G + 0.4, wz);
    b.add(CYL8, C.wood, SX, G + 0.42, wz, 0.06, 0.48, 0.06, 0, 0, Math.PI / 2).box(0.03, 0.16, 0.03, C.woodD, SX + 0.3, G + 0.34, wz);
    rope(b, w, R, [SX, G + 0.47, wz]);
    b.cylT(0.06, 0.05, 0.1, C.leather, SX, G + 0.06, SZ + R, 7);
    for (let i = 0; i < 5; i++) b.cyl(0.015, 0.3, C.woodD, 0.1 + i * 0.12, G, 0.7);
    b.box(0.52, 0.18, 0.03, P.wattle, 0.34, G + 0.06, 0.7).box(0.3, 0.22, 0.02, t, 0.34, G + 0.04, 0.72);
    track(b, SX + 0.24, 0.55);
    flag(ctx, 0.62, G, 0.42, 0.8);
    extra.wheel = { geo: sheave(R, C.wood, C.woodD).geometry(), at: w, axis: 'x', speed: 2.4 };
    extra.cart = { geo: tub(C.wood, C.woodD, C.woodD).geometry(), from: [-0.02, G + 0.02, TZ], to: [0.44, G + 0.02, TZ] };
    return 1.32;
  },
  // Bronze: the A-frame on a raised mud-brick collar, its posts capped in bronze and braced twice; a domed mud-brick
  // hut with a team awning in front, and storage jars.
  bronze(ctx) {
    const { b, t, extra } = ctx, R = 0.16;
    b.box(0.62, 0.1, 0.62, P.mud, SX, G, SZ).box(0.42, 0.012, 0.42, SHAFT, SX, G + 0.1, SZ);
    const w = aFrame(b, 1.4, 0.04, C.wood);
    for (const k of [-1, 1]) {
      b.add(CONE4, C.bronze, SX + k * 0.22, 1.42, SZ, 0.05, 0.08, 0.05);
      stick(b, 0.022, C.woodD, [SX + k * 0.22, 0.3, SZ - 0.27], [SX + k * 0.22, 0.95, SZ + 0.13], CYL6);
    }
    const hx = 0.4, hz = 0.38;
    b.box(0.44, 0.34, 0.36, P.mud, hx, G, hz).box(0.46, 0.04, 0.38, P.mudD, hx, G + 0.34, hz)
      .add(BALL, P.mudD, hx, G + 0.38, hz, 0.17, 0.12, 0.15).box(0.12, 0.2, 0.02, C.dark, hx - 0.1, G, hz + 0.18);
    stick(b, 0.012, C.woodD, [hx + 0.02, G + 0.32, hz + 0.18], [hx + 0.02, G, hz + 0.44], CYL6);
    b.box(0.32, 0.015, 0.26, t, hx + 0.02, G + 0.26, hz + 0.3, 0.45);
    for (const [x, z] of [[-0.1, 0.5], [-0.24, 0.62], [0.05, 0.66]]) b.cylT(0.05, 0.07, 0.16, 0xa56843, x, G, z, 8).cylT(0.03, 0.05, 0.04, 0xa56843, x, G + 0.16, z, 8);
    rope(b, w, R, [SX, G + 0.2, 0.2]);
    track(b, SX + 0.3, 0.55);
    flag(ctx, 0.66, G + 0.4, 0.2, 0.75);
    extra.wheel = { geo: sheave(R, C.wood, C.bronze).geometry(), at: w, axis: 'x', speed: 2.4 };
    extra.cart = { geo: tub(C.wood, C.bronze).geometry(), from: [0.0, G + 0.02, TZ], to: [0.44, G + 0.02, TZ] };
    return 1.5;
  },
  // Iron: squared timbers strapped with iron plates on a dressed-stone collar, a plank hood shading the shaft, and a
  // stone smelting furnace with a team banner.
  iron(ctx) {
    const { b, t, extra } = ctx, R = 0.17;
    b.box(0.6, 0.08, 0.6, C.stone, SX, G, SZ).box(0.42, 0.012, 0.42, SHAFT, SX, G + 0.08, SZ);
    const w = aFrame(b, 1.55, 0.035, C.wood, unit.box);
    for (const k of [-1, 1]) for (const f of [0.3, 0.7]) b.box(0.08, 0.05, 0.08, IRON, SX + k * 0.22, G + (1.55 - G) * f, SZ + (f - 0.5) * 0.4);
    for (const k of [-1, 1]) b.box(0.6, 0.02, 0.26, C.wood, SX, 0.66, SZ + k * 0.14, k * 0.35);
    const fx = 0.42, fz = 0.42;
    b.cylT(0.16, 0.22, 0.42, C.stoneD, fx, G, fz, 8).cylT(0.08, 0.14, 0.24, C.stone, fx, G + 0.42, fz, 8).box(0.1, 0.1, 0.02, P.fire, fx, G + 0.04, fz + 0.21);
    b.box(0.02, 0.36, 0.24, t, fx - 0.23, G + 0.18, fz);
    for (let i = 0; i < 4; i++) b.box(0.12, 0.06, 0.1, i % 2 ? IRON : 0x5a4a3a, -0.04 + (i % 2) * 0.13, G + (i > 1 ? 0.06 : 0), 0.6);
    rope(b, w, R, [SX, G + 0.3, 0.22], C.leather);
    b.box(0.08, 0.3, 0.08, C.woodD, SX, G, 0.22).box(0.3, 0.06, 0.06, IRON, SX, G + 0.26, 0.22);
    track(b, SX + 0.3, 0.55, G, C.woodD, IRON);
    flag(ctx, 0.7, G, 0.06, 0.85);
    extra.wheel = { geo: sheave(R, C.woodD, IRON, 6).geometry(), at: w, axis: 'x', speed: 2.2 };
    extra.cart = { geo: tub(C.woodD, IRON).geometry(), from: [0.0, G + 0.035, TZ], to: [0.44, G + 0.035, TZ] };
    return 1.62;
  },
  // Medieval: a gallows frame over the shaft with a pulley block, worked by a treadwheel on trestles in front (the
  // turning wheel), and a slate-roofed lean-to with a team door.
  medieval(ctx) {
    const { b, t, extra } = ctx, R = 0.38, ww = 0.26, wy = G + 0.44, wz = 0.24;
    for (const k of [-1, 1]) b.box(0.08, 1.2, 0.08, C.woodD, SX + k * 0.24, G, SZ).box(0.08, 0.04, 0.4, C.woodD, SX + k * 0.24, G, SZ);
    for (const k of [-1, 1]) stick(b, 0.025, C.wood, [SX + k * 0.24, G + 0.04, SZ + 0.18], [SX + k * 0.24, G + 0.8, SZ], unit.box);
    b.box(0.6, 0.08, 0.1, C.wood, SX, G + 1.2, SZ).box(0.12, 0.1, 0.08, C.woodD, SX, G + 1.1, SZ);
    for (const k of [-1, 1]) {
      const xt = SX + k * (ww / 2 + 0.07);
      stick(b, 0.022, C.woodD, [xt, G, wz - 0.3], [xt, wy + 0.03, wz], unit.box); stick(b, 0.022, C.woodD, [xt, G, wz + 0.3], [xt, wy + 0.03, wz], unit.box);
      b.box(0.05, 0.03, 0.66, C.wood, xt, G, wz);
    }
    stick(b, 0.008, C.hay, [SX, wy + 0.04, wz], [SX, G + 1.12, SZ], CYL6);
    stick(b, 0.008, C.hay, [SX, G + 1.12, SZ], [SX, G + 0.02, SZ], CYL6);
    const lx = 0.46, lz = 0.5;
    b.box(0.5, 0.34, 0.3, C.stone, lx, G, lz).box(0.16, 0.24, 0.02, t, lx, G, lz + 0.155);
    b.box(0.56, 0.03, 0.4, P.slate, lx, G + 0.38, lz - 0.01, -0.3);
    track(b, SX + 0.3, 0.55);
    flag(ctx, 0.74, G + 0.42, 0.42, 0.6);
    extra.wheel = { geo: treadwheel(R, ww, t).geometry(), at: [SX, wy, wz], axis: 'x', speed: 1.2 };
    extra.cart = { geo: tub(C.wood, IRON).geometry(), from: [0.0, G + 0.035, TZ], to: [0.44, G + 0.035, TZ] };
    return G + 1.28;
  },
  // Age of Sail: a four-post timber headframe tapering to the wheel, cross-braced with iron rods, over a brick collar;
  // a brick winding house with a tiled roof and a team door in front.
  sail(ctx) {
    const { b, t, extra } = ctx, H = 1.85, R = 0.19, k0 = 0.24, k1 = 0.1;
    b.box(0.56, 0.08, 0.56, BRICK, SX, G, SZ).box(0.42, 0.012, 0.42, SHAFT, SX, G + 0.08, SZ);
    const leg = (sx, sz, y) => { const f = (y - G) / (H - G); return [SX + sx * (k0 + (k1 - k0) * f), y, SZ + sz * (k0 + (k1 - k0) * f)]; };
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) stick(b, 0.035, C.wood, leg(sx, sz, G), leg(sx, sz, H), unit.box);
    for (const y of [0.7, 1.3]) for (const [a, c] of [[[-1, -1], [1, -1]], [[-1, 1], [1, 1]], [[-1, -1], [-1, 1]], [[1, -1], [1, 1]]]) stick(b, 0.02, C.woodD, leg(...a, y), leg(...c, y), unit.box);
    for (const [a, c] of [[[-1, 1], [1, 1]], [[1, -1], [1, 1]]]) { stick(b, 0.01, IRON, leg(...a, 0.2), leg(...c, 0.7), CYL6); stick(b, 0.01, IRON, leg(...c, 0.2), leg(...a, 0.7), CYL6); }
    b.box(0.3, 0.05, 0.3, C.woodD, SX, H, SZ);
    const w = [SX, H + 0.08, SZ];
    const hx = 0.36, hz = 0.42;
    b.box(0.6, 0.4, 0.38, BRICK, hx, G, hz).roof(0.44, 0.2, 0.62, 0xa96342, hx, G + 0.4, hz, Math.PI / 2);
    b.box(0.14, 0.26, 0.02, t, hx - 0.12, G, hz + 0.195).box(0.12, 0.12, 0.02, 0x2f4f6a, hx + 0.14, G + 0.18, hz + 0.195);
    rope(b, w, R, [hx - 0.3, G + 0.3, hz - 0.1], C.hay);
    track(b, SX + 0.3, 0.55, G, C.woodD, IRON);
    flag(ctx, hx + 0.22, G + 0.5, hz, 0.55);
    extra.wheel = { geo: sheave(R, IRON, C.brass, 6).geometry(), at: w, axis: 'x', speed: 2.6 };
    extra.cart = { geo: tub(IRON, C.woodD).geometry(), from: [0.0, G + 0.035, TZ], to: [0.44, G + 0.035, TZ] };
    return H + 0.3;
  },
  // Industrial: a steel lattice headframe, its back legs raked to take the pull, laced on every face; a brick engine
  // house with a team door and a tall chimney.
  industrial(ctx) {
    const { b, t, extra } = ctx, H = 2.3, R = 0.24;
    b.box(0.6, 0.06, 0.6, CONCRETE, SX, G, SZ).box(0.42, 0.012, 0.42, SHAFT, SX, G + 0.06, SZ);
    const legs = [];
    for (const k of [-1, 1]) {
      const top = [SX + k * 0.12, H, SZ], f1 = [SX + k * 0.24, G, SZ - 0.26], f2 = [SX + k * 0.24, G, SZ + 0.26];
      stick(b, 0.03, STEEL, f1, top, unit.box); stick(b, 0.03, STEEL, f2, top, unit.box); legs.push([f1, f2, top]);
      for (let i = 1; i < 6; i++) {
        const a = lerp(f1, top, i / 6), c = lerp(f2, top, i / 6), a0 = lerp(f1, top, (i - 1) / 6);
        stick(b, 0.012, STEEL, a, c, unit.box); stick(b, 0.01, IRON, a0, c, unit.box);
      }
    }
    for (let i = 0; i < 5; i++) { const f = (i + 1) / 6; stick(b, 0.012, STEEL, lerp(legs[0][1], legs[0][2], f), lerp(legs[1][1], legs[1][2], f), unit.box); }
    b.box(0.36, 0.04, 0.14, STEEL, SX, H - 0.02, SZ).box(0.4, 0.03, 0.03, t, SX, H - 0.12, SZ + 0.05);
    const w = [SX, H + 0.14, SZ];
    const hx = 0.36, hz = 0.44;
    b.box(0.62, 0.48, 0.42, BRICK, hx, G, hz).roof(0.48, 0.18, 0.64, 0x5d6468, hx, G + 0.48, hz, Math.PI / 2);
    b.box(0.14, 0.28, 0.02, t, hx - 0.14, G, hz + 0.215);
    for (const x of [0.04, 0.2]) b.box(0.1, 0.16, 0.02, 0x34495a, hx + x, G + 0.22, hz + 0.215);
    b.box(0.16, 1.8, 0.16, BRICK_D, 0.66, G, 0.22).box(0.2, 0.05, 0.2, 0xc8b48a, 0.66, G + 1.8, 0.22);
    rope(b, w, R, [hx - 0.3, G + 0.4, hz - 0.2], RAIL);
    track(b, SX + 0.3, 0.55, G, 0x4e3a28, RAIL);
    flag(ctx, hx - 0.2, G + 0.66, hz - 0.1, 0.5, P.iron);
    extra.wheel = { geo: sheave(R, STEEL, IRON, 8).geometry(), at: w, axis: 'x', speed: 3 };
    extra.cart = { geo: tub(t, IRON).geometry(), from: [0.0, G + 0.035, TZ], to: [0.44, G + 0.035, TZ] };
    return H + 0.42;
  },
  // Modern: a concrete winder tower over the shaft with the wheel in an open housing on its roof, a team band and
  // glazed control room; an inclined conveyor carries the skip from the tower's foot up over the ore heap.
  modern(ctx) {
    const { b, t, extra } = ctx, H = 2.2, R = 0.2;
    b.box(0.5, H - G, 0.5, CONCRETE, SX, G, SZ).box(0.52, 0.06, 0.52, 0xa8a69f, SX, H, SZ);
    b.box(0.52, 0.08, 0.52, t, SX, H - 0.3, SZ).box(0.36, 0.2, 0.02, 0x34495a, SX, H - 0.6, SZ + 0.255).box(0.02, 0.2, 0.36, 0x34495a, SX + 0.255, H - 0.6, SZ);
    for (const k of [-1, 1]) b.box(0.04, 0.34, 0.3, STEEL, SX + k * 0.14, H + 0.06, SZ);
    b.box(0.14, 0.28, 0.02, C.dark, SX + 0.1, G, SZ + 0.255);
    const w = [SX, H + 0.26, SZ];
    // The conveyor: a belt on trestles, low at the tower and high over the pile.
    const c0 = [SX + 0.3, G + 0.12, TZ], c1 = [0.62, G + 0.62, TZ];
    stick(b, 0.05, 0x2a2f2c, c0, c1, unit.box);
    for (const f of [0.35, 0.75]) { const p = lerp(c0, c1, f); b.box(0.04, p[1] - G, 0.04, STEEL, p[0], G, TZ - 0.07).box(0.04, p[1] - G, 0.04, STEEL, p[0], G, TZ + 0.07); }
    b.box(0.2, 0.14, 0.2, STEEL, c1[0], c1[1] - 0.16, TZ);
    const hx = 0.36, hz = 0.44;
    b.box(0.6, 0.34, 0.36, CONCRETE, hx, G, hz).box(0.62, 0.04, 0.38, t, hx, G + 0.34, hz).box(0.5, 0.12, 0.02, 0x34495a, hx, G + 0.16, hz + 0.185);
    rope(b, w, R, [SX + 0.2, H + 0.06, SZ + 0.2], RAIL);
    flag(ctx, hx + 0.22, G + 0.38, hz - 0.1, 0.5, STEEL);
    extra.wheel = { geo: sheave(R, STEEL, t, 6).geometry(), at: w, axis: 'x', speed: 3.2 };
    const skip = new B().box(0.16, 0.08, 0.12, t, 0, 0.02, 0).rock(0.04, ORE, 0, 0.08, 0, 1, 0.7, 1).box(0.17, 0.02, 0.13, STEEL, 0, 0, 0);
    extra.cart = { geo: skip.geometry(), from: lerp(c0, c1, 0.1).map((v, i) => i === 1 ? v + 0.05 : v), to: lerp(c0, c1, 0.9).map((v, i) => i === 1 ? v + 0.05 : v) };
    return H + 0.42;
  },
  // AI Future: a slender white lift pylon over a glowing shaft ring, a neon ring turning at its head, and a mag-rail
  // down which a hover pod glides to the heap; a low white processing pod with a team band in front.
  future(ctx) {
    const { b, t, extra } = ctx, H = 2.5;
    b.box(0.56, 0.04, 0.56, P.snow, SX, G, SZ).box(0.44, 0.02, 0.44, P.neonC, SX, G + 0.035, SZ).box(0.38, 0.03, 0.38, SHAFT, SX, G + 0.04, SZ);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      stick(b, 0.03, P.snow, [SX + sx * 0.22, G, SZ + sz * 0.22], [SX + sx * 0.08, H, SZ + sz * 0.08], unit.box);
      stick(b, 0.008, P.neonC, [SX + sx * 0.235, G + 0.05, SZ + sz * 0.235], [SX + sx * 0.095, H - 0.05, SZ + sz * 0.095], unit.box);
    }
    b.box(0.26, 0.08, 0.26, P.chrome, SX, H, SZ).box(0.28, 0.02, 0.28, t, SX, H + 0.08, SZ);
    const w = [SX, H + 0.3, SZ];
    b.box(0.03, 0.2, 0.03, P.chrome, SX, H + 0.08, SZ);
    // The mag-rail: a white beam with a neon strip on short posts.
    b.box(0.66, 0.06, 0.12, P.snow, 0.17, G + 0.1, TZ).box(0.66, 0.012, 0.04, P.neonC, 0.17, G + 0.16, TZ);
    for (const x of [-0.08, 0.42]) b.box(0.05, 0.1, 0.05, P.chrome, x, G, TZ);
    const hx = 0.36, hz = 0.44;
    b.add(BALL, P.snow, hx, G, hz, 0.34, 0.26, 0.24).box(0.5, 0.03, 0.04, t, hx, G + 0.12, hz + 0.21).box(0.3, 0.012, 0.02, P.neonM, hx, G + 0.2, hz + 0.18);
    flag(ctx, hx + 0.24, G + 0.1, hz - 0.14, 0.55, P.chrome);
    extra.wheel = { geo: new B().add(TORUS, P.neonC, 0, 0, 0, 0.17, 0.17, 0.17, 0, Math.PI / 2, 0).add(TORUS, P.neonM, 0, 0, 0, 0.11, 0.11, 0.11, 0, Math.PI / 2, 0.6).geometry(), at: w, axis: 'x', speed: 2.4 };
    const pod = new B().add(BALL, P.chrome, 0, 0.06, 0, 0.12, 0.05, 0.08).box(0.2, 0.01, 0.06, P.neonC, 0, 0.02, 0).rock(0.04, ORE, 0, 0.08, 0, 1, 0.7, 1);
    extra.cart = { geo: pod.geometry(), from: [-0.02, G + 0.2, TZ], to: [0.42, G + 0.2, TZ] };
    return H + 0.34;
  },
};

export function mine(ctx) {
  const collar = { tool: C.wood, bronze: P.mudD, iron: C.stoneD, medieval: C.woodD, sail: BRICK_D, industrial: STEEL, modern: CONCRETE, future: P.chrome }[ctx.age] ?? C.wood;
  mound(ctx.b, collar);
  const top = ERAS[ctx.age](ctx);
  ctx.extra.ore = { gold: orePile(TINT.gold).geometry(), stone: orePile(TINT.stone).geometry(), at: PILE };
  return top;
}
