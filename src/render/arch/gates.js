// The gate buildings (data/buildings.js): the Temple (Bronze), Academy and Siege Workshop (Iron), University (Medieval),
// Arsenal and Trading Company (Age of Sail), Railway Station (Industrial), Power Plant and Airfield (Modern). Each is one
// design for every era it stands in: its rooms are era blocks (block(), below) in that era's building style, mud brick,
// Greek masonry, Gothic stone, colonial whitewash, brick, concrete or AI Future white and neon, and its own props (a
// shrine tower, training dummies, the engine on the bench, a train on the track) change with the era too.
// index.js adds them to DESIGNS, so they are tested and routed like the era modules' designs.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, ring, puff, flag, stick, barrel, sack, windowGrid, CYL6, CYL8, BALL, DISC } from './kit.js';

// Per era: wall, trim and plinth colours, and the roof's colour.
const ERA = {
  bronze: { wall: P.mud, trim: P.mudD, base: 0x8d7a5a, roof: P.mudD },
  iron: { wall: 0xd7c7a4, trim: C.marble, base: 0xbcad8d, roof: 0xa96342 },
  medieval: { wall: 0x9c9a92, trim: 0x6f6f68, base: 0x756852, roof: P.slate },
  sail: { wall: P.white, trim: P.beam, base: 0x9a8f78, roof: P.tile },
  industrial: { wall: P.brick, trim: P.brickD, base: 0x6f6f68, roof: 0x5d6468 },
  modern: { wall: P.concrete, trim: 0x8d8f91, base: 0xa3a19b, roof: 0x55595c },
  future: { wall: P.snow, trim: P.chrome, base: 0xd8e2e8, roof: 0x46606b },
};
const GLASS_D = 0x1d2b3a, ASPH = 0x3a3d40, LINE = 0xf0eee6, TYRE = 0x222426;
const HIP = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2);
const HALF = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI);
const push = (extra, k, x) => (extra[k] ??= []).push(x);

// A room: walls w wide (x), d deep (z) and hh high on a plinth at y, centred on (x, z), with the era's roof, trim and
// details and a team-coloured band under the eaves. Returns the roof's top.
export function block(ctx, { w, d, hh, x = 0, z = 0, y = 0 }) {
  const { b, t, extra, age } = ctx, e = ERA[age], y0 = y + 0.1, top = y0 + hh, fz = z + d / 2;
  b.box(w + 0.1, 0.1, d + 0.1, e.base, x, y, z).box(w, hh, d, e.wall, x, y0, z).box(w + 0.02, 0.07, d + 0.02, t, x, top - 0.2, z);
  const door = (dw, dh, c = C.dark) => b.box(dw, dh, 0.04, c, x, y0, fz + 0.005);
  switch (age) {
    case 'bronze': { // battered mud brick, a flat roof behind merlons, palm beams poking out under it
      b.box(w + 0.08, hh * 0.35, d + 0.08, e.trim, x, y0, z).box(w + 0.06, 0.08, d + 0.06, e.trim, x, top, z);
      for (const [ex, ez, len, ry] of [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]]) {
        for (let k = -len / 2 + 0.1; k <= len / 2 - 0.08; k += 0.26) b.box(0.13, 0.13, 0.1, P.mud, x + (ry ? ex : k), top + 0.08, z + (ry ? k : ez), 0, ry);
      }
      for (let k = -w / 2 + 0.15; k < w / 2 - 0.1; k += 0.3) b.add(CYL6, C.woodD, x + k, top - 0.08, fz + 0.04, 0.03, 0.12, 0.03, Math.PI / 2, 0, 0);
      door(Math.min(0.4, w * 0.3), Math.min(0.6, hh * 0.65));
      return top + 0.21;
    }
    case 'iron': { // plaster on an ashlar podium, a marble portico under a tiled gable with a team tympanum
      const n = Math.max(3, Math.round(w / 0.42)), rh = Math.min(0.55, w * 0.28), pz = fz + 0.16;
      for (let i = 0; i < n; i++) { const cx = x - w / 2 + 0.1 + i * (w - 0.2) / (n - 1); b.cylT(0.05, 0.06, hh - 0.06, C.marble, cx, y0, pz, 8).box(0.14, 0.06, 0.14, C.marble, cx, top - 0.06, pz); }
      b.box(w + 0.1, 0.08, d + 0.34, C.marble, x, top, z + 0.15).roof(w + 0.16, rh, d + 0.4, e.roof, x, top + 0.08, z + 0.15);
      b.roof(w + 0.2, rh + 0.05, 0.05, C.marble, x, top + 0.06, z + 0.15 + (d + 0.4) / 2).roof(w * 0.62, rh * 0.55, 0.012, t, x, top + 0.13, z + 0.17 + (d + 0.4) / 2 + 0.02);
      door(Math.min(0.42, w * 0.3), Math.min(0.66, hh * 0.7));
      return top + 0.08 + rh + 0.03;
    }
    case 'medieval': { // stone with buttresses and lancet windows under a steep slate roof
      for (let k = -w / 2 + 0.2; k <= w / 2 - 0.2; k += Math.max(0.4, (w - 0.4) / 3)) for (const s of [-1, 1]) b.box(0.12, hh * 0.8, 0.14, e.trim, x + k, y0, z + s * (d / 2 + 0.06));
      for (let k = -w / 2 + 0.4; k < w / 2 - 0.25; k += 0.45) b.box(0.1, 0.34, 0.03, GLASS_D, x + k, y0 + hh * 0.38, fz + 0.01).add(CONE_LANCET, GLASS_D, x + k, y0 + hh * 0.38 + 0.4, fz + 0.01, 0.07, 0.12, 0.02);
      const rh = Math.min(0.85, w * 0.42);
      b.roof(w + 0.12, rh, d + 0.12, e.roof, x, top, z, 0).box(0.06, 0.06, d + 0.16, e.trim, x, top + rh - 0.03, z);
      door(Math.min(0.42, w * 0.3), Math.min(0.66, hh * 0.7), C.woodD);
      return top + rh + 0.03;
    }
    case 'sail': { // whitewash with timber bands, sash windows and a tiled hip roof under a little cupola
      b.box(w + 0.03, 0.05, d + 0.03, e.trim, x, y0 + hh * 0.45, z);
      windowGrid(ctx, Math.max(2, Math.round(w / 0.5)), hh > 0.9 ? 2 : 1, w, fz + 0.01, y0 + 0.16, hh * 0.45, e.trim, P.glass, x);
      const rh = Math.min(0.6, Math.min(w, d) * 0.45);
      b.add(HIP, e.roof, x, top + rh / 2, z, (w + 0.14) / 2, rh, (d + 0.14) / 2);
      b.cyl(0.11, 0.18, P.white, x, top + rh - 0.06, z).add(CYL8, e.trim, x, top + rh + 0.13, z, 0.13, 0.03, 0.13).cone(0.13, 0.18, P.tile, x, top + rh + 0.14, z, 8);
      door(Math.min(0.32, w * 0.25), Math.min(0.5, hh * 0.5), P.beam);
      return top + rh + 0.32;
    }
    case 'industrial': { // brick on a dark plinth, a buff string course, arched windows, a slate gable and a smoking chimney
      b.box(w + 0.03, 0.05, d + 0.03, 0xd8c39a, x, y0 + hh * 0.5, z);
      windowGrid(ctx, Math.max(2, Math.round(w / 0.45)), 1, w, fz + 0.01, y0 + hh * 0.18, 0, 0xd8c39a, P.glass, x);
      const rh = Math.min(0.55, w * 0.3), cx = x + w / 2 - 0.2, cz = z - d / 4;
      b.roof(w + 0.12, rh, d + 0.12, e.roof, x, top, z, 0).box(0.2, rh + 0.55, 0.2, e.trim, cx, top, cz).box(0.26, 0.06, 0.26, 0xd8c39a, cx, top + rh + 0.55, cz);
      push(extra, 'smoke', { geo: puff(), at: [cx, top + rh + 0.66, cz], phase: (x + z + 4) % 1 });
      door(Math.min(0.42, w * 0.3), Math.min(0.62, hh * 0.6), C.woodD);
      return top + rh + 0.61;
    }
    case 'modern': { // concrete with ribbon windows, a flat roof behind a parapet and plant on top
      for (let f = 0; f < Math.floor((hh - 0.1) / 0.36); f++) b.box(w + 0.03, 0.14, d + 0.03, GLASS_D, x, y0 + 0.16 + f * 0.36, z);
      b.box(w + 0.04, 0.06, d + 0.04, e.roof, x, top, z);
      for (const s of [-1, 1]) b.box(w + 0.04, 0.1, 0.04, e.trim, x, top + 0.06, z + s * d / 2).box(0.04, 0.1, d, e.trim, x + s * w / 2, top + 0.06, z);
      b.box(Math.min(0.4, w * 0.3), 0.16, 0.26, 0xb4bcc2, x - w / 5, top + 0.06, z - d / 5).add(CYL8, P.dark, x - w / 5, top + 0.23, z - d / 5, 0.08, 0.01, 0.08);
      b.box(Math.min(0.5, w * 0.36), Math.min(0.5, hh * 0.5), 0.04, P.glass, x, y0, fz + 0.005);
      return top + 0.24;
    }
    default: { // AI Future: white panels, a glass band ruled in neon, a low glass dome, and a neon ring turning round it
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(0.08, hh, P.chrome, x + sx * w / 2, y0, z + sz * d / 2);
      b.box(w + 0.03, hh * 0.3, d + 0.03, GLASS_D, x, y0 + hh * 0.35, z).box(w + 0.05, 0.03, d + 0.05, P.neonC, x, y0 + hh * 0.35, z).box(w + 0.05, 0.03, d + 0.05, P.neonM, x, y0 + hh * 0.65, z);
      const r = Math.min(w, d) / 2 - 0.05;
      b.box(w + 0.04, 0.05, d + 0.04, P.snow, x, top, z).add(BALL, GLASS_D, x, top + 0.05, z, r, r * 0.5, r);
      push(extra, 'spinners', { geo: ring(r + 0.08, 0.025, P.neonC, 0.25), at: [x, top + 0.1, z], axis: 'y', speed: 0.8 });
      b.box(Math.min(0.42, w * 0.3), Math.min(0.55, hh * 0.55), 0.04, P.neonC, x, y0, fz + 0.005).box(Math.min(0.36, w * 0.26), Math.min(0.5, hh * 0.5), 0.045, GLASS_D, x, y0, fz + 0.006);
      return top + 0.05 + r * 0.5;
    }
  }
}
// The pointed head of a lancet window (a flat four-sided cone).
const CONE_LANCET = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);

// A tower w square and hh tall standing at (x, y, z) in the era's style, with the era's cap; returns the cap's top.
// Bronze: merlons. Iron: a little tholos. Medieval: a spire and pinnacles. Sail: a dome and lantern. Industrial: clock
// faces under a slate pyramid. Modern: a concrete shaft with a glass top. Future: a chrome needle with a floating orb.
function tower(ctx, x, z, w, hh, y = 0) {
  const { b, t, extra, age } = ctx, e = ERA[age], top = y + hh;
  b.box(w, hh, w, e.wall, x, y, z).box(w + 0.03, 0.06, w + 0.03, t, x, top - 0.3, z);
  switch (age) {
    case 'bronze':
      b.box(w + 0.06, 0.07, w + 0.06, e.trim, x, top, z);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.12, 0.14, 0.12, P.mud, x + sx * (w / 2 - 0.04), top + 0.07, z + sz * (w / 2 - 0.04));
      return top + 0.21;
    case 'iron':
      b.box(w + 0.08, 0.06, w + 0.08, C.marble, x, top, z);
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.cylT(0.025, 0.03, 0.34, C.marble, x + Math.cos(a) * w * 0.36, top + 0.06, z + Math.sin(a) * w * 0.36, 6); }
      b.cylT(w * 0.42, w * 0.44, 0.05, C.marble, x, top + 0.4, z, 10).cone(w * 0.44, 0.24, e.roof, x, top + 0.45, z, 10);
      return top + 0.69;
    case 'medieval':
      b.cone(w * 0.62, 1.0, e.roof, x, top, z, 8, Math.PI / 8);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone(0.06, 0.3, e.trim, x + sx * w / 2, top, z + sz * w / 2, 4);
      return top + 1.0;
    case 'sail':
      b.box(w + 0.05, 0.05, w + 0.05, e.trim, x, top, z).cyl(w * 0.4, 0.16, P.white, x, top + 0.05, z);
      b.sph(w * 0.42, 0x6f8a8e, x, top + 0.21, z, 1, 0.85, 1).cyl(0.05, 0.16, P.white, x, top + 0.21 + w * 0.36, z).cone(0.06, 0.12, C.gold, x, top + 0.37 + w * 0.36, z, 6);
      return top + 0.49 + w * 0.36;
    case 'industrial':
      for (const [dz, dx, ry] of [[w / 2 + 0.01, 0, 0], [0, w / 2 + 0.01, Math.PI / 2]]) b.add(DISC, LINE, x + dx, top - 0.18, z + dz, w * 0.3, 0.02, w * 0.3, Math.PI / 2, ry, 0).box(0.02, w * 0.22, 0.03, P.dark, x + dx, top - 0.2, z + dz, 0, ry);
      b.box(w + 0.06, 0.06, w + 0.06, 0xd8c39a, x, top, z).cone(w * 0.72, 0.5, e.roof, x, top + 0.06, z, 4, Math.PI / 4);
      return top + 0.56;
    case 'modern':
      b.box(w + 0.02, 0.3, w + 0.02, GLASS_D, x, top, z).box(w + 0.06, 0.05, w + 0.06, e.trim, x, top + 0.3, z);
      ctx.mast.cyl(0.015, 0.5, 0x8d8f91, x, top + 0.35, z);
      return top + 0.35;
    default:
      b.box(w + 0.04, 0.04, w + 0.04, P.neonC, x, top, z).cylT(0.02, w * 0.3, 0.55, P.chrome, x, top + 0.04, z, 8);
      push(extra, 'floaters', { geo: new B().sph(0.11, P.neonM).add(unit.cyl, P.neonC, 0, 0, 0, 0.17, 0.012, 0.17).geometry(), at: [x, top + 0.78, z], amp: 0.06, speed: 1.6 });
      return top + 0.59;
  }
}

// Temple: a shrine raised on stepped terraces, a ziggurat in the Bronze Age, with a sanctuary hall on top, a tower in
// the era's style beside it (a church tower from the Middle Ages on) and fire bowls by the stair.
export function temple(ctx) {
  const { b, age } = ctx, e = ERA[age], zig = age === 'bronze';
  const tiers = zig ? [[2.6, 0.34], [2.0, 0.34], [1.4, 0.34]] : [[2.7, 0.12], [2.5, 0.12], [2.3, 0.12]];
  let y = 0;
  for (const [s, hh] of tiers) { b.box(s, hh, s, zig ? (y ? P.mud : P.mudD) : e.base, 0, y, 0); y += hh; }
  // The stair up the front of the terraces.
  for (let i = 0; i < (zig ? 6 : 3); i++) b.box(0.5, (i + 1) * (y / (zig ? 6 : 3)), 0.12, zig ? P.mudD : e.trim, 0, 0, (zig ? 1.3 : 1.35) - i * (zig ? 0.12 : 0.1) + 0.06);
  for (const s of [-1, 1]) { const fx = s * 0.45, fz = zig ? 0.55 : 1.0; b.cylT(0.12, 0.07, 0.16, C.bronze, fx, y, fz, 8).cone(0.08, 0.2, P.fire, fx, y + 0.12, fz, 5).cone(0.04, 0.12, P.ember, fx, y + 0.16, fz, 5); }
  let top = zig ? block(ctx, { w: 0.9, d: 0.8, hh: 0.6, y }) : block(ctx, { w: 1.4, d: 1.6, hh: 0.95, y, x: -0.3, z: -0.25 });
  if (!zig) top = Math.max(top, tower(ctx, 0.75, -0.6, 0.55, age === 'iron' ? 1.4 : 2.0, y));
  return top;
}

// Academy: a school hall at the back of a drill yard where the era's practice targets stand: straw dummies on posts,
// a tilting quintain in the Middle Ages, painted boards for musket and rifle drill, holographic targets in the Future.
export function academy(ctx) {
  const { b, t, extra, age } = ctx, e = ERA[age];
  const top = block(ctx, { w: 2.5, d: 1.1, hh: 1.05, z: -0.7 });
  b.box(2.6, 0.03, 1.2, age === 'modern' || age === 'future' ? 0x8f8670 : P.dirt, 0, 0, 0.7);
  const xs = [-0.85, 0, 0.85];
  if (age === 'future') xs.forEach((x, i) => {
    b.cylT(0.12, 0.14, 0.06, P.chrome, x, 0.03, 0.75, 10);
    push(extra, 'floaters', { geo: new B().add(DISC, P.neonC, 0, 0, 0, 0.18, 0.02, 0.18, Math.PI / 2, 0, 0).add(DISC, P.neonM, 0, 0, 0.012, 0.09, 0.02, 0.09, Math.PI / 2, 0, 0).geometry(), at: [x, 0.6, 0.75], amp: 0.07, speed: 1.5, phase: i * 2 });
  });
  else if (['sail', 'industrial', 'modern'].includes(age)) for (const x of xs) {
    b.box(0.05, 0.6, 0.05, C.woodD, x - 0.16, 0.03, 0.85).box(0.05, 0.6, 0.05, C.woodD, x + 0.16, 0.03, 0.85).box(0.4, 0.42, 0.04, age === 'modern' ? LINE : C.plaster, x, 0.3, 0.86);
    b.add(DISC, P.dark, x, 0.51, 0.885, 0.13, 0.01, 0.13, Math.PI / 2, 0, 0).add(DISC, t, x, 0.51, 0.89, 0.07, 0.01, 0.07, Math.PI / 2, 0, 0);
  } else for (const [i, x] of xs.entries()) {
    b.cyl(0.04, 0.85, C.woodD, x, 0.03, 0.8);
    if (age === 'medieval' && i === 1) b.box(0.9, 0.05, 0.05, C.wood, x + 0.2, 0.8, 0.8).box(0.22, 0.28, 0.04, t, x - 0.18, 0.55, 0.8).add(BALL, C.cloth, x + 0.62, 0.6, 0.8, 0.09, 0.12, 0.09);
    else b.box(0.5, 0.05, 0.05, C.wood, x, 0.62, 0.8).add(BALL, C.hay, x, 0.58, 0.8, 0.15, 0.22, 0.12).add(BALL, C.cloth, x, 0.9, 0.8, 0.09, 0.09, 0.09);
  }
  // A weapon rack by the hall door, the era's arms leaning in it.
  b.box(0.06, 0.5, 0.06, C.woodD, 1.05, 0.03, 0.1).box(0.06, 0.5, 0.06, C.woodD, 1.25, 0.03, 0.4).box(0.05, 0.05, 0.42, C.wood, 1.15, 0.45, 0.25, 0, -0.55);
  for (let i = 0; i < 4; i++) stick(b, 0.014, ['bronze', 'iron', 'medieval'].includes(age) ? C.wood : P.iron, [1.0 + i * 0.07, 0.03, 0.05 + i * 0.1], [1.12 + i * 0.07, 0.75, 0.08 + i * 0.1]);
  b.box(0.12, 0.6, 0.02, e.trim, -1.15, 0.03, 1.2).box(0.1, 0.36, 0.025, t, -1.15, 0.22, 1.21);
  return top;
}

// Siege Workshop: a workshop at the back with an open shed roofed in the era's material in front of it, wheels and timber
// stacked under the shed, and the era's engine out in the yard (a catapult, a trebuchet, a cannon, a field gun, a tank,
// a railgun).
export function siege_workshop(ctx) {
  const { b, t, extra, age } = ctx, e = ERA[age];
  const top = block(ctx, { w: 2.6, d: 0.7, hh: 1.2, z: -0.98 });
  b.box(2.6, 0.04, 1.95, age === 'future' || age === 'modern' ? 0x8d8f91 : P.dirt, 0, 0, 0.3);
  // The shed: posts and a lean-to roof sloping down to the front.
  for (const x of [-1.2, 0, 1.2]) b.box(0.09, 1.04, 0.09, age === 'future' ? P.chrome : age === 'modern' || age === 'industrial' ? P.iron : C.woodD, x, 0.04, 0.42);
  const a = Math.atan2(0.35, 1.5);
  b.box(2.66, 0.06, 1.1, e.roof, 0, 1.18, -0.08, a).box(2.68, 0.05, 0.08, t, 0, 1.02, 0.46);
  // The engine in the yard.
  const g = new B();
  switch (age) {
    case 'iron': // a catapult: base frame, upright, throwing arm and bucket
      g.box(0.9, 0.08, 0.45, C.wood, 0, 0.12, 0).box(0.08, 0.38, 0.4, C.woodD, 0.1, 0.2, 0);
      stick(g, 0.03, C.wood, [-0.3, 0.25, 0], [0.4, 0.7, 0]); g.cylT(0.1, 0.07, 0.07, C.woodD, 0.42, 0.69, 0, 8);
      for (const x of [-0.3, 0.3]) for (const s of [-1, 1]) g.add(CYL8, C.woodD, x, 0.12, s * 0.25, 0.12, 0.05, 0.12, Math.PI / 2, 0, 0);
      break;
    case 'medieval': // a trebuchet half raised in its A-frames
      g.box(1.0, 0.07, 0.5, C.wood, 0, 0.04, 0);
      for (const s of [-1, 1]) { stick(g, 0.025, C.wood, [-0.25, 0.1, s * 0.2], [0, 0.8, s * 0.2]); stick(g, 0.025, C.wood, [0.25, 0.1, s * 0.2], [0, 0.8, s * 0.2]); }
      stick(g, 0.03, C.woodD, [-0.45, 0.35, 0], [0.4, 0.95, 0]); g.box(0.2, 0.2, 0.2, C.stoneD, 0.32, 0.72, 0);
      break;
    case 'sail': // a cannon on its carriage
      g.box(0.6, 0.12, 0.3, C.wood, 0, 0.12, 0).add(new THREE.CylinderGeometry(0.06, 0.09, 0.85, 10), P.iron, 0.1, 0.33, 0, 1, 1, 1, 0, 0, Math.PI / 2 - 0.08);
      for (const s of [-1, 1]) g.add(CYL8, C.woodD, -0.05, 0.12, s * 0.2, 0.12, 0.04, 0.12, Math.PI / 2, 0, 0);
      break;
    case 'industrial': // a field gun with a shield and spoked wheels
      g.add(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 10), P.olive, 0.12, 0.34, 0, 1, 1, 1, 0, 0, Math.PI / 2 - 0.15).box(0.06, 0.32, 0.5, P.olive, -0.12, 0.22, 0);
      stick(g, 0.03, P.olive, [-0.1, 0.22, 0], [-0.7, 0.04, 0]);
      for (const s of [-1, 1]) g.add(CYL8, C.woodD, -0.05, 0.18, s * 0.28, 0.18, 0.04, 0.18, Math.PI / 2, 0, 0);
      break;
    case 'modern': // a tank: hull, tracks, turret and gun
      g.box(0.9, 0.2, 0.5, P.olive, 0, 0.12, 0).box(0.25, 0.08, 0.22, t, -0.2, 0.32, 0);
      for (const s of [-1, 1]) g.box(0.95, 0.16, 0.1, TYRE, 0, 0.04, s * 0.27);
      g.box(0.4, 0.14, 0.34, 0x434b2d, 0.05, 0.32, 0).add(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 8), 0x434b2d, 0.45, 0.4, 0, 1, 1, 1, 0, 0, Math.PI / 2);
      break;
    case 'future': // a railgun's twin rails on a hover sled
      g.box(0.8, 0.06, 0.4, P.snow, 0, 0.18, 0).box(0.82, 0.02, 0.42, P.neonC, 0, 0.17, 0);
      for (const s of [-1, 1]) g.box(1.0, 0.06, 0.05, P.chrome, 0.15, 0.3, s * 0.08).box(1.0, 0.02, 0.02, P.neonM, 0.15, 0.36, s * 0.08);
      break;
    default: // bronze never shows it; the Workshop unlocks in Iron
  }
  if (g.geos.length) { const geo = g.geometry(); b.add(geo, 0xffffff, -0.3, 0.04, 0.95, 1, 1, 1); keepColours(b, geo); }
  // Spare wheels and a timber stack under the shed.
  for (let i = 0; i < 2; i++) b.add(CYL8, age === 'modern' || age === 'future' ? TYRE : C.woodD, 0.9, 0.18, -0.15 + i * 0.12, 0.17, 0.05, 0.17, Math.PI / 2, 0, 0);
  for (let i = 0; i < 3; i++) b.add(CYL6, C.wood, -0.6, 0.08 + i * 0.1, -0.2, 0.05, 0.6, 0.05, 0, 0, Math.PI / 2);
  if (age === 'future') push(extra, 'floaters', { geo: new B().box(0.2, 0.04, 0.2, P.snow).box(0.08, 0.06, 0.08, P.neonM, 0, -0.05, 0).geometry(), at: [0.8, 0.6, 0.95], amp: 0.06, speed: 1.8 });
  return top;
}
// After b.add(geo, 0xffffff, ...): give the copy geo's own colours and surfaces back (kit.place does the same).
const keepColours = (b, geo) => { const last = b.geos[b.geos.length - 1]; last.setAttribute('color', geo.attributes.color.clone()); last.setAttribute('surface', geo.attributes.surface.clone()); geo.dispose(); };

// University: a long hall of learning round a lawn, its tall tower in the era's style (a Gothic spire, an observatory
// dome, a clock, a glass top or a floating orb) and a reading bench with books under it.
export function university(ctx) {
  const { b, t } = ctx;
  let top = block(ctx, { w: 1.7, d: 1.0, hh: 1.15, x: -0.5, z: -0.8 });
  top = Math.max(top, block(ctx, { w: 0.9, d: 1.4, hh: 0.9, x: -0.95, z: 0.55 }));
  top = Math.max(top, tower(ctx, 0.8, -0.65, 0.65, 2.1));
  b.box(1.4, 0.03, 1.2, 0x6f8a4a, 0.55, 0, 0.75);
  b.box(0.6, 0.06, 0.2, C.wood, 0.5, 0.3, 0.8).box(0.05, 0.3, 0.05, C.woodD, 0.25, 0, 0.8).box(0.05, 0.3, 0.05, C.woodD, 0.75, 0, 0.8);
  for (const [i, c] of [P.tile, t, P.olive].entries()) b.box(0.12, 0.05, 0.16, c, 0.35 + i * 0.15, 0.36, 0.8);
  return top;
}

// Arsenal: a gunpowder store behind a low yard wall, cannonballs piled in pyramids, powder kegs and a gun at the gate;
// in later eras the shot is shells and ammunition crates, in the Future glowing energy cells that hover.
export function arsenal(ctx) {
  const { b, t, extra, age } = ctx, e = ERA[age];
  const top = block(ctx, { w: 2.2, d: 1.3, hh: 1.2, x: -0.15, z: -0.6 });
  for (const [x, z, w, d] of [[-1.25, 0.6, 0.1, 1.0], [1.25, 0.05, 0.1, 2.3], [-0.8, 1.15, 0.85, 0.1], [0.85, 1.15, 0.8, 0.1]]) b.box(w, 0.35, d, e.trim, x, 0, z);
  if (age === 'sail') {
    for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - l; i++) for (let j = 0; j < 3 - l; j++) b.add(BALL, P.iron, 0.45 + (i - (2 - l) / 2) * 0.13, 0.065 + l * 0.11, 0.55 + (j - (2 - l) / 2) * 0.13, 0.065, 0.065, 0.065);
    for (const [x, z] of [[-0.6, 0.55], [-0.85, 0.75], [-0.7, 0.85]]) barrel(b, x, 0, z, 0.1, 0.24);
  } else if (age === 'future') {
    for (const [x, z] of [[0.4, 0.5], [0.7, 0.7]]) b.cylT(0.11, 0.11, 0.06, P.chrome, x, 0, z, 10);
    for (const [i, [x, z]] of [[0.4, 0.5], [0.7, 0.7]].entries()) push(extra, 'floaters', { geo: new B().cylT(0.07, 0.07, 0.28, P.neonM, 0, 0, 0, 8).cylT(0.08, 0.08, 0.04, P.chrome, 0, 0.12, 0, 8).geometry(), at: [x, 0.35, z], amp: 0.05, speed: 1.4, phase: i * 2 });
  } else {
    for (const [x, z] of [[0.35, 0.5], [0.75, 0.5], [0.55, 0.85]]) b.box(0.32, 0.22, 0.24, age === 'modern' ? P.olive : C.wood, x, 0, z).box(0.33, 0.03, 0.25, age === 'modern' ? 0x434b2d : C.woodD, x, 0.22, z);
    for (let i = 0; i < 3; i++) b.cylT(0.05, 0.05, 0.3, C.brass, -0.6 + i * 0.12, 0, 0.7, 8).cone(0.05, 0.1, C.brass, -0.6 + i * 0.12, 0.3, 0.7, 8);
  }
  // The gun at the gate: a cannon on a carriage, later a breech-loader.
  b.box(0.36, 0.1, 0.2, age === 'future' ? P.snow : C.wood, 0.05, 0.1, 0.8).add(new THREE.CylinderGeometry(0.04, 0.065, 0.55, 10), age === 'future' ? P.chrome : P.iron, 0.05, 0.25, 0.85, 1, 1, 1, Math.PI / 2 - 0.1, 0, 0);
  b.box(0.14, 0.42, 0.02, t, 1.3, 0.05, 1.2);
  return top;
}

// Trading Company: a tall warehouse with a hoist over its loft door, the yard stacked with the era's cargo (bales and
// barrels, crates, a team-painted shipping container, floating cargo pods) and the company's flag.
export function trading_company(ctx) {
  const { b, t, extra, age } = ctx, e = ERA[age];
  const top = block(ctx, { w: 2.3, d: 1.2, hh: 1.45, z: -0.7 });
  // The hoist: a beam out over the loft door, a rope and a crate on it.
  b.box(0.36, 0.3, 0.04, C.woodD, 0, 1.05, -0.08).box(0.07, 0.07, 0.45, e.trim, 0, 1.4, 0.1);
  stick(b, 0.008, C.cloth, [0, 1.4, 0.3], [0, 0.95, 0.3]); b.box(0.16, 0.14, 0.16, C.wood, 0, 0.8, 0.3);
  if (age === 'sail') {
    for (const [x, z] of [[-0.8, 0.55], [-0.55, 0.75], [-0.85, 0.9]]) b.box(0.24, 0.2, 0.18, C.cloth, x, 0, z).box(0.25, 0.02, 0.19, C.leather, x, 0.1, z);
    for (const [x, z] of [[0.5, 0.6], [0.75, 0.8]]) barrel(b, x, 0, z, 0.1, 0.24);
    sack(b, 0.4, 0, 0.95, 0.1);
  } else if (age === 'industrial') {
    for (const [x, y, z] of [[-0.75, 0, 0.6], [-0.5, 0, 0.6], [-0.62, 0.24, 0.6], [0.6, 0, 0.8]]) b.box(0.24, 0.24, 0.24, C.wood, x, y, z).box(0.25, 0.03, 0.25, C.woodD, x, y + 0.12, z);
    b.box(0.5, 0.06, 0.3, C.wood, 0.3, 0.12, 0.45).add(CYL8, TYRE, 0.3, 0.1, 0.62, 0.1, 0.03, 0.1, Math.PI / 2, 0, 0);
  } else if (age === 'modern') {
    b.box(1.2, 0.45, 0.45, t, -0.4, 0, 0.75).box(1.22, 0.04, 0.47, LINE, -0.4, 0.45, 0.75);
    for (let i = 0; i < 6; i++) b.box(0.02, 0.4, 0.46, 0x2c3e4c, -0.9 + i * 0.2, 0.02, 0.75);
    b.box(0.4, 0.03, 0.3, C.wood, 0.7, 0, 0.8).box(0.3, 0.25, 0.25, 0xc4a77a, 0.7, 0.03, 0.8);
  } else {
    for (const [i, [x, z]] of [[-0.6, 0.65], [0.55, 0.75]].entries()) {
      b.box(0.3, 0.03, 0.3, P.neonC, x, 0, z);
      push(extra, 'floaters', { geo: new B().box(0.28, 0.22, 0.28, P.snow).box(0.29, 0.03, 0.29, t, 0, 0.1, 0).geometry(), at: [x, 0.3, z], amp: 0.08, speed: 1.3, phase: i * 3 });
    }
  }
  flag(ctx, 1.2, 0, 0.9, 1.6, age === 'future' ? P.chrome : C.woodD);
  return top;
}

// Railway Station: the booking hall at the back, a platform under a canopy, and the era's train on the line in front: a
// steam locomotive under its own smoke, a diesel, a maglev pod hovering over its guideway.
export function railway_station(ctx) {
  const { b, t, extra, age } = ctx, e = ERA[age];
  let top = block(ctx, { w: 2.0, d: 0.9, hh: 1.15, x: -0.3, z: -0.9 });
  top = Math.max(top, tower(ctx, 1.05, -0.95, 0.5, 1.7));
  // The platform and its canopy on posts.
  b.box(2.7, 0.18, 0.55, e.base, 0, 0, 0.1).box(2.7, 0.02, 0.06, LINE, 0, 0.18, 0.35);
  for (const x of [-1.1, 0, 1.1]) b.box(0.05, 0.75, 0.05, age === 'future' ? P.chrome : P.iron, x, 0.18, 0.1);
  b.box(2.7, 0.05, 0.7, e.roof, 0, 0.93, 0.1).box(2.72, 0.05, 0.03, t, 0, 0.9, 0.46);
  // The line: sleepers and two rails (a single guideway in the Future).
  if (age === 'future') b.box(2.7, 0.08, 0.3, P.snow, 0, 0, 0.85).box(2.72, 0.02, 0.32, P.neonC, 0, 0.08, 0.85);
  else { for (let x = -1.25; x <= 1.26; x += 0.25) b.box(0.08, 0.03, 0.5, age === 'modern' ? P.concrete : C.woodD, x, 0, 0.85); for (const s of [-1, 1]) b.box(2.7, 0.04, 0.03, P.iron, 0, 0.03, 0.85 + s * 0.14); }
  const train = new B();
  if (age === 'industrial') { // a steam locomotive: boiler, funnel, cab, wheels
    train.add(unit.cyl, 0x2b2b2b, 0, 0, 0, 0.17, 0.75, 0.17, 0, 0, Math.PI / 2).box(0.35, 0.42, 0.38, 0x2b2b2b, -0.5, -0.12, 0).box(0.37, 0.04, 0.4, t, -0.5, 0.22, 0);
    train.cylT(0.06, 0.05, 0.25, 0x2b2b2b, 0.25, 0.15, 0).add(DISC, C.gold, 0.38, 0, 0, 0.12, 0.02, 0.12, 0, 0, Math.PI / 2);
    for (const x of [-0.5, -0.15, 0.15]) for (const s of [-1, 1]) train.add(CYL8, P.red, x, -0.12, s * 0.16, 0.1, 0.03, 0.1, Math.PI / 2, 0, 0);
    push(extra, 'smoke', { geo: puff(), at: [0.05, 0.75, 0.85], phase: 0.3 });
    const geo = train.geometry(); b.add(geo, 0xffffff, -0.2, 0.3, 0.85, 1, 1, 1); keepColours(b, geo);
  } else if (age === 'modern') { // a diesel locomotive in team livery
    train.box(1.4, 0.36, 0.34, LINE, 0, 0.12, 0).box(1.42, 0.08, 0.36, t, 0, 0.22, 0).box(0.25, 0.12, 0.36, GLASS_D, 0.55, 0.34, 0);
    for (const x of [-0.45, 0.45]) train.box(0.3, 0.1, 0.3, TYRE, x, 0, 0);
    const geo = train.geometry(); b.add(geo, 0xffffff, -0.1, 0.05, 0.85, 1, 1, 1); keepColours(b, geo);
  } else { // future: a maglev pod hovering over the guideway
    train.sph(0.18, P.snow, 0.5, 0, 0, 1.6, 0.9, 1).box(1.0, 0.3, 0.32, P.snow, -0.1, -0.15, 0).box(1.02, 0.08, 0.34, GLASS_D, -0.1, 0.02, 0).box(1.02, 0.03, 0.34, t, -0.1, -0.12, 0);
    push(extra, 'floaters', { geo: train.geometry(), at: [-0.1, 0.32, 0.85], amp: 0.03, speed: 1.2 });
  }
  return top;
}

// Power Plant: a turbine hall, a hyperboloid cooling tower with steam over it and a pylon carrying the lines away; in
// the Future a fusion core glowing in a turning ring instead of the cooling tower.
export function power_plant(ctx) {
  const { b, t, extra, age } = ctx;
  const top = block(ctx, { w: 1.3, d: 1.9, hh: 1.1, x: -0.65, z: -0.2 });
  if (age === 'future') {
    b.cylT(0.6, 0.65, 0.2, P.snow, 0.7, 0, -0.4, 16).cylT(0.66, 0.66, 0.03, P.neonC, 0.7, 0.12, -0.4, 16).cylT(0.15, 0.25, 1.0, P.chrome, 0.7, 0.2, -0.4, 10);
    push(extra, 'floaters', { geo: new B().sph(0.3, P.neonM).sph(0.18, 0xffd6fb).geometry(), at: [0.7, 1.55, -0.4], amp: 0.05, speed: 1.1 });
    push(extra, 'spinners', { geo: ring(0.52, 0.04, P.neonC, 0.4), at: [0.7, 1.55, -0.4], axis: 'y', speed: 1.4 });
  } else {
    b.cylT(0.42, 0.62, 1.1, P.concrete, 0.7, 0, -0.4, 16).cylT(0.5, 0.42, 0.7, P.concrete, 0.7, 1.1, -0.4, 16).cylT(0.51, 0.51, 0.08, t, 0.7, 1.3, -0.4, 16);
    b.cylT(0.46, 0.46, 0.02, 0x8d8f91, 0.7, 1.79, -0.4, 16);
    push(extra, 'smoke', { geo: puff(), at: [0.7, 1.95, -0.4], phase: 0 }); push(extra, 'smoke', { geo: puff(), at: [0.6, 1.95, -0.3], phase: 0.5 });
  }
  // The switchyard: transformers behind a fence, and a lattice pylon.
  for (const x of [0.3, 0.75]) b.box(0.26, 0.3, 0.22, age === 'future' ? P.snow : 0x5f656b, x, 0, 0.75).box(0.04, 0.12, 0.04, C.iron, x, 0.3, 0.75);
  for (const x of [0.05, 1.25]) b.box(0.03, 0.25, 1.0, 0x8d8f91, x, 0, 0.75);
  for (const s of [-1, 1]) stick(b, 0.025, P.steel, [1.15 + s * 0.15, 0, 0.35], [1.15, 1.6, 0.35]);
  b.box(0.6, 0.04, 0.04, P.steel, 1.15, 1.35, 0.35).box(0.4, 0.04, 0.04, P.steel, 1.15, 1.55, 0.35);
  return Math.max(top, age === 'future' ? 1.2 : 1.81);
}

// Airfield: a runway across the front with its centre line, a hangar with a curved roof, a terminal under a control tower
// and a plane on the apron; in the Future a drone pad, a jet that hovers and a glass control spire.
export function airfield(ctx) {
  const { b, t, extra, age } = ctx, e = ERA[age];
  b.box(2.75, 0.03, 0.8, ASPH, 0, 0, 0.9);
  for (let x = -1.2; x <= 1.21; x += 0.4) b.box(0.22, 0.01, 0.04, age === 'future' ? P.neonC : LINE, x, 0.03, 0.9);
  // The hangar: a half-cylinder roof over its open front.
  b.box(1.3, 0.05, 1.05, e.base, -0.65, 0, -0.65).add(HALF, age === 'future' ? P.snow : 0x8d949c, -0.65, 0.05, -0.65, 0.6, 1.0, 0.6, 0, Math.PI / 2, Math.PI / 2);
  b.add(HALF, C.dark, -0.65, 0.05, -0.14, 0.48, 0.02, 0.48, 0, Math.PI / 2, Math.PI / 2).box(0.6, 0.06, 0.03, t, -0.65, 0.52, -0.14);
  let top = block(ctx, { w: 1.1, d: 0.8, hh: 0.7, x: 0.8, z: -0.8 });
  top = Math.max(top, tower(ctx, 0.9, -0.8, 0.32, 2.0));
  // The plane on the apron, nose to +x.
  const pl = new B(), body = age === 'future' ? P.snow : LINE;
  pl.add(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 10), body, 0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2).add(BALL, age === 'future' ? GLASS_D : body, 0.42, 0, 0, 0.12, 0.07, 0.07);
  pl.box(0.22, 0.02, 0.9, body, 0.02, -0.02, 0).box(0.12, 0.02, 0.36, body, -0.36, 0, 0).box(0.14, 0.18, 0.02, t, -0.36, 0.02, 0);
  if (age === 'future') {
    b.cylT(0.3, 0.3, 0.02, P.neonM, 0.75, 0.03, 0.9, 16);
    push(extra, 'floaters', { geo: pl.geometry(), at: [0.75, 0.45, 0.9], amp: 0.08, speed: 1.2 });
  } else { const geo = pl.geometry(); b.add(geo, 0xffffff, 0.7, 0.14, 0.9, 1, 1, 1); keepColours(b, geo); b.box(0.03, 0.1, 0.03, TYRE, 0.7, 0.03, 0.9); }
  return top;
}

export const GATES = { temple, academy, siege_workshop, university, arsenal, trading_company, railway_station, power_plant, airfield };
