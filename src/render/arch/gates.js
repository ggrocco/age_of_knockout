// The gate buildings (data/buildings.js): the Temple (Bronze), Academy and Siege Workshop (Iron), University (Medieval),
// Arsenal and Trading Company (Age of Sail), Railway Station (Industrial), Power Plant and Airfield (Modern). Each is one
// design for every era it stands in: its rooms are era blocks (block(), below) in that era's building style, mud brick,
// Greek masonry, Gothic stone, colonial whitewash, brick, concrete or AI Future white and neon, and its own props (a
// shrine tower, training dummies, the engine on the bench, a train on the track) change with the era too.
// index.js adds them to DESIGNS, so they are tested and routed like the era modules' designs.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, ring, puff, flag, stick, barrel, sack, windowGrid, place, pushExtra, CYL6, CYL8, BALL, DISC } from './kit.js';

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
const BUFF = 0xd8c39a, GREY = 0x8d8f91, PLANT = 0xb4bcc2, COPPER_DOME = 0x6f8a8e, DARK_OLIVE = 0x434b2d, LAWN = 0x6f8a4a;
const YARD = 0x8f8670, LOCO = 0x2b2b2b, CONTAINER_RIB = 0x2c3e4c, CARTON = 0xc4a77a, TRANSFORMER = 0x5f656b, HULL = 0x8d949c;
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
const HIP = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2);
const HALF = new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI);
// The pointed head of a lancet window (a flat four-sided cone).
const CONE_LANCET = new THREE.ConeGeometry(1, 1, 4).rotateY(Math.PI / 4);

// ---------- rooms ----------
// A room's door on its front face: dw wide, dh tall.
const roomDoor = (ctx, room, dw, dh, color = C.dark) => ctx.b.box(dw, dh, 0.04, color, room.x, room.floor, room.front + 0.005);

// Bronze: battered mud brick, a flat roof behind merlons, palm beams poking out under it.
function bronzeRoom(ctx, room) {
  const { b } = ctx, { w, d, hh, x, z, floor, top, front, style } = room;
  b.box(w + 0.08, hh * 0.35, d + 0.08, style.trim, x, floor, z).box(w + 0.06, 0.08, d + 0.06, style.trim, x, top, z);
  const edges = [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]];
  for (const [edgeX, edgeZ, length, turn] of edges) {
    for (let k = -length / 2 + 0.1; k <= length / 2 - 0.08; k += 0.26) {
      b.box(0.13, 0.13, 0.1, P.mud, x + (turn ? edgeX : k), top + 0.08, z + (turn ? k : edgeZ), 0, turn); // merlons
    }
  }
  for (let k = -w / 2 + 0.15; k < w / 2 - 0.1; k += 0.3) {
    b.add(CYL6, C.woodD, x + k, top - 0.08, front + 0.04, 0.03, 0.12, 0.03, Math.PI / 2, 0, 0); // a beam end
  }
  roomDoor(ctx, room, Math.min(0.4, w * 0.3), Math.min(0.6, hh * 0.65));
  return top + 0.21;
}
// Iron: plaster on an ashlar podium, a marble portico under a tiled gable with a team tympanum.
function ironRoom(ctx, room) {
  const { b, t } = ctx, { w, d, hh, x, z, floor, top, front, style } = room;
  const columns = Math.max(3, Math.round(w / 0.42)), roofHeight = Math.min(0.55, w * 0.28), porticoZ = front + 0.16;
  for (let i = 0; i < columns; i++) {
    const columnX = x - w / 2 + 0.1 + i * (w - 0.2) / (columns - 1);
    b.cylT(0.05, 0.06, hh - 0.06, C.marble, columnX, floor, porticoZ, 8); // a column
    b.box(0.14, 0.06, 0.14, C.marble, columnX, top - 0.06, porticoZ); // its capital
  }
  b.box(w + 0.1, 0.08, d + 0.34, C.marble, x, top, z + 0.15); // the entablature
  b.roof(w + 0.16, roofHeight, d + 0.4, style.roof, x, top + 0.08, z + 0.15);
  b.roof(w + 0.2, roofHeight + 0.05, 0.05, C.marble, x, top + 0.06, z + 0.15 + (d + 0.4) / 2); // the pediment
  b.roof(w * 0.62, roofHeight * 0.55, 0.012, t, x, top + 0.13, z + 0.17 + (d + 0.4) / 2 + 0.02); // its tympanum
  roomDoor(ctx, room, Math.min(0.42, w * 0.3), Math.min(0.66, hh * 0.7));
  return top + 0.08 + roofHeight + 0.03;
}
// Medieval: stone with buttresses and lancet windows under a steep slate roof.
function medievalRoom(ctx, room) {
  const { b } = ctx, { w, d, hh, x, z, floor, top, front, style } = room;
  for (let k = -w / 2 + 0.2; k <= w / 2 - 0.2; k += Math.max(0.4, (w - 0.4) / 3)) for (const side of [-1, 1]) {
    b.box(0.12, hh * 0.8, 0.14, style.trim, x + k, floor, z + side * (d / 2 + 0.06));
  }
  for (let k = -w / 2 + 0.4; k < w / 2 - 0.25; k += 0.45) {
    b.box(0.1, 0.34, 0.03, GLASS_D, x + k, floor + hh * 0.38, front + 0.01);
    b.add(CONE_LANCET, GLASS_D, x + k, floor + hh * 0.38 + 0.4, front + 0.01, 0.07, 0.12, 0.02);
  }
  const roofHeight = Math.min(0.85, w * 0.42);
  b.roof(w + 0.12, roofHeight, d + 0.12, style.roof, x, top, z, 0);
  b.box(0.06, 0.06, d + 0.16, style.trim, x, top + roofHeight - 0.03, z); // the ridge
  roomDoor(ctx, room, Math.min(0.42, w * 0.3), Math.min(0.66, hh * 0.7), C.woodD);
  return top + roofHeight + 0.03;
}
// Age of Sail: whitewash with timber bands, sash windows and a tiled hip roof under a little cupola.
function sailRoom(ctx, room) {
  const { b } = ctx, { w, d, hh, x, z, floor, top, front, style } = room;
  b.box(w + 0.03, 0.05, d + 0.03, style.trim, x, floor + hh * 0.45, z);
  const cols = Math.max(2, Math.round(w / 0.5)), rows = hh > 0.9 ? 2 : 1;
  windowGrid(ctx, cols, rows, w, front + 0.01, floor + 0.16, hh * 0.45, style.trim, P.glass, x);
  const roofHeight = Math.min(0.6, Math.min(w, d) * 0.45);
  b.add(HIP, style.roof, x, top + roofHeight / 2, z, (w + 0.14) / 2, roofHeight, (d + 0.14) / 2);
  b.cyl(0.11, 0.18, P.white, x, top + roofHeight - 0.06, z); // the cupola
  b.add(CYL8, style.trim, x, top + roofHeight + 0.13, z, 0.13, 0.03, 0.13);
  b.cone(0.13, 0.18, P.tile, x, top + roofHeight + 0.14, z, 8);
  roomDoor(ctx, room, Math.min(0.32, w * 0.25), Math.min(0.5, hh * 0.5), P.beam);
  return top + roofHeight + 0.32;
}
// Industrial: brick on a dark plinth, a buff string course, arched windows, a slate gable and a smoking chimney.
function industrialRoom(ctx, room) {
  const { b, extra } = ctx, { w, d, hh, x, z, floor, top, front, style } = room;
  b.box(w + 0.03, 0.05, d + 0.03, BUFF, x, floor + hh * 0.5, z);
  windowGrid(ctx, Math.max(2, Math.round(w / 0.45)), 1, w, front + 0.01, floor + hh * 0.18, 0, BUFF, P.glass, x);
  const roofHeight = Math.min(0.55, w * 0.3), chimneyX = x + w / 2 - 0.2, chimneyZ = z - d / 4;
  b.roof(w + 0.12, roofHeight, d + 0.12, style.roof, x, top, z, 0);
  b.box(0.2, roofHeight + 0.55, 0.2, style.trim, chimneyX, top, chimneyZ); // the chimney
  b.box(0.26, 0.06, 0.26, BUFF, chimneyX, top + roofHeight + 0.55, chimneyZ);
  pushExtra(extra, 'smoke', { geo: puff(), at: [chimneyX, top + roofHeight + 0.66, chimneyZ], phase: (x + z + 4) % 1 });
  roomDoor(ctx, room, Math.min(0.42, w * 0.3), Math.min(0.62, hh * 0.6), C.woodD);
  return top + roofHeight + 0.61;
}
// Modern: concrete with ribbon windows, a flat roof behind a parapet and plant on top.
function modernRoom(ctx, room) {
  const { b } = ctx, { w, d, hh, x, z, floor, top, front, style } = room;
  for (let f = 0; f < Math.floor((hh - 0.1) / 0.36); f++) b.box(w + 0.03, 0.14, d + 0.03, GLASS_D, x, floor + 0.16 + f * 0.36, z);
  b.box(w + 0.04, 0.06, d + 0.04, style.roof, x, top, z);
  for (const side of [-1, 1]) {
    b.box(w + 0.04, 0.1, 0.04, style.trim, x, top + 0.06, z + side * d / 2); // the parapet
    b.box(0.04, 0.1, d, style.trim, x + side * w / 2, top + 0.06, z);
  }
  b.box(Math.min(0.4, w * 0.3), 0.16, 0.26, PLANT, x - w / 5, top + 0.06, z - d / 5); // the plant and its fan
  b.add(CYL8, P.dark, x - w / 5, top + 0.23, z - d / 5, 0.08, 0.01, 0.08);
  b.box(Math.min(0.5, w * 0.36), Math.min(0.5, hh * 0.5), 0.04, P.glass, x, floor, front + 0.005); // the glass door
  return top + 0.24;
}
// AI Future: white panels, a glass band ruled in neon, a low glass dome, and a neon ring turning round it.
function futureRoom(ctx, room) {
  const { b, extra } = ctx, { w, d, hh, x, z, floor, top, front } = room;
  for (const [sx, sz] of CORNERS) b.cyl(0.08, hh, P.chrome, x + sx * w / 2, floor, z + sz * d / 2);
  b.box(w + 0.03, hh * 0.3, d + 0.03, GLASS_D, x, floor + hh * 0.35, z);
  b.box(w + 0.05, 0.03, d + 0.05, P.neonC, x, floor + hh * 0.35, z).box(w + 0.05, 0.03, d + 0.05, P.neonM, x, floor + hh * 0.65, z);
  const radius = Math.min(w, d) / 2 - 0.05;
  b.box(w + 0.04, 0.05, d + 0.04, P.snow, x, top, z).add(BALL, GLASS_D, x, top + 0.05, z, radius, radius * 0.5, radius);
  pushExtra(extra, 'spinners', { geo: ring(radius + 0.08, 0.025, P.neonC, 0.25), at: [x, top + 0.1, z], axis: 'y', speed: 0.8 });
  b.box(Math.min(0.42, w * 0.3), Math.min(0.55, hh * 0.55), 0.04, P.neonC, x, floor, front + 0.005);
  b.box(Math.min(0.36, w * 0.26), Math.min(0.5, hh * 0.5), 0.045, GLASS_D, x, floor, front + 0.006);
  return top + 0.05 + radius * 0.5;
}
const ROOMS = {
  bronze: bronzeRoom, iron: ironRoom, medieval: medievalRoom, sail: sailRoom, industrial: industrialRoom, modern: modernRoom,
};

// A room: walls w wide (x), d deep (z) and hh high on a plinth at y, centred on (x, z), with the era's roof, trim and
// details and a team-coloured band under the eaves. Returns the roof's top.
export function block(ctx, { w, d, hh, x = 0, z = 0, y = 0 }) {
  const { b, t, age } = ctx, style = ERA[age], floor = y + 0.1, top = floor + hh, front = z + d / 2;
  b.box(w + 0.1, 0.1, d + 0.1, style.base, x, y, z).box(w, hh, d, style.wall, x, floor, z);
  b.box(w + 0.02, 0.07, d + 0.02, t, x, top - 0.2, z);
  return (ROOMS[age] ?? futureRoom)(ctx, { w, d, hh, x, z, floor, top, front, style });
}

// ---------- towers ----------
// The era's caps for a tower w square with its walls' top at `top`; each returns the cap's top.
const TOWER_CAPS = {
  bronze(ctx, x, z, w, top) { // merlons
    const { b } = ctx;
    b.box(w + 0.06, 0.07, w + 0.06, ERA.bronze.trim, x, top, z);
    for (const [sx, sz] of CORNERS) b.box(0.12, 0.14, 0.12, P.mud, x + sx * (w / 2 - 0.04), top + 0.07, z + sz * (w / 2 - 0.04));
    return top + 0.21;
  },
  iron(ctx, x, z, w, top) { // a little tholos
    const { b } = ctx;
    b.box(w + 0.08, 0.06, w + 0.08, C.marble, x, top, z);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      b.cylT(0.025, 0.03, 0.34, C.marble, x + Math.cos(angle) * w * 0.36, top + 0.06, z + Math.sin(angle) * w * 0.36, 6);
    }
    b.cylT(w * 0.42, w * 0.44, 0.05, C.marble, x, top + 0.4, z, 10).cone(w * 0.44, 0.24, ERA.iron.roof, x, top + 0.45, z, 10);
    return top + 0.69;
  },
  medieval(ctx, x, z, w, top) { // a spire and pinnacles
    const { b } = ctx;
    b.cone(w * 0.62, 1.0, ERA.medieval.roof, x, top, z, 8, Math.PI / 8);
    for (const [sx, sz] of CORNERS) b.cone(0.06, 0.3, ERA.medieval.trim, x + sx * w / 2, top, z + sz * w / 2, 4);
    return top + 1.0;
  },
  sail(ctx, x, z, w, top) { // a dome and lantern
    const { b } = ctx, lantern = top + 0.21 + w * 0.36;
    b.box(w + 0.05, 0.05, w + 0.05, ERA.sail.trim, x, top, z).cyl(w * 0.4, 0.16, P.white, x, top + 0.05, z);
    b.sph(w * 0.42, COPPER_DOME, x, top + 0.21, z, 1, 0.85, 1).cyl(0.05, 0.16, P.white, x, lantern, z);
    b.cone(0.06, 0.12, C.gold, x, top + 0.37 + w * 0.36, z, 6);
    return top + 0.49 + w * 0.36;
  },
  industrial(ctx, x, z, w, top) { // clock faces under a slate pyramid
    const { b } = ctx;
    for (const [dz, dx, turn] of [[w / 2 + 0.01, 0, 0], [0, w / 2 + 0.01, Math.PI / 2]]) {
      b.add(DISC, LINE, x + dx, top - 0.18, z + dz, w * 0.3, 0.02, w * 0.3, Math.PI / 2, turn, 0);
      b.box(0.02, w * 0.22, 0.03, P.dark, x + dx, top - 0.2, z + dz, 0, turn); // the hand
    }
    b.box(w + 0.06, 0.06, w + 0.06, BUFF, x, top, z).cone(w * 0.72, 0.5, ERA.industrial.roof, x, top + 0.06, z, 4, Math.PI / 4);
    return top + 0.56;
  },
  modern(ctx, x, z, w, top) { // a concrete shaft with a glass top
    const { b } = ctx;
    b.box(w + 0.02, 0.3, w + 0.02, GLASS_D, x, top, z).box(w + 0.06, 0.05, w + 0.06, ERA.modern.trim, x, top + 0.3, z);
    ctx.mast.cyl(0.015, 0.5, GREY, x, top + 0.35, z);
    return top + 0.35;
  },
};
// AI Future: a chrome needle with a floating orb.
function futureCap(ctx, x, z, w, top) {
  const { b, extra } = ctx;
  b.box(w + 0.04, 0.04, w + 0.04, P.neonC, x, top, z).cylT(0.02, w * 0.3, 0.55, P.chrome, x, top + 0.04, z, 8);
  const orb = new B().sph(0.11, P.neonM).add(unit.cyl, P.neonC, 0, 0, 0, 0.17, 0.012, 0.17).geometry();
  pushExtra(extra, 'floaters', { geo: orb, at: [x, top + 0.78, z], amp: 0.06, speed: 1.6 });
  return top + 0.59;
}
// A tower w square and hh tall standing at (x, y, z) in the era's style, with the era's cap; returns the cap's top.
// Bronze: merlons. Iron: a little tholos. Medieval: a spire and pinnacles. Sail: a dome and lantern. Industrial: clock
// faces under a slate pyramid. Modern: a concrete shaft with a glass top. Future: a chrome needle with a floating orb.
function tower(ctx, x, z, w, hh, y = 0) {
  const { b, t, age } = ctx, top = y + hh;
  b.box(w, hh, w, ERA[age].wall, x, y, z).box(w + 0.03, 0.06, w + 0.03, t, x, top - 0.3, z);
  return (TOWER_CAPS[age] ?? futureCap)(ctx, x, z, w, top);
}

// ---------- the gate buildings ----------
// Temple: a shrine raised on stepped terraces, a ziggurat in the Bronze Age, with a sanctuary hall on top, a tower in
// the era's style beside it (a church tower from the Middle Ages on) and fire bowls by the stair.
export function temple(ctx) {
  const { b, age } = ctx, style = ERA[age], ziggurat = age === 'bronze';
  const tiers = ziggurat ? [[2.6, 0.34], [2.0, 0.34], [1.4, 0.34]] : [[2.7, 0.12], [2.5, 0.12], [2.3, 0.12]];
  let y = 0;
  for (const [side, height] of tiers) {
    b.box(side, height, side, ziggurat ? (y ? P.mud : P.mudD) : style.base, 0, y, 0);
    y += height;
  }
  // The stair up the front of the terraces.
  const steps = ziggurat ? 6 : 3;
  for (let i = 0; i < steps; i++) {
    const stepZ = (ziggurat ? 1.3 : 1.35) - i * (ziggurat ? 0.12 : 0.1) + 0.06;
    b.box(0.5, (i + 1) * (y / steps), 0.12, ziggurat ? P.mudD : style.trim, 0, 0, stepZ);
  }
  for (const side of [-1, 1]) { // the fire bowls
    const bowlX = side * 0.45, bowlZ = ziggurat ? 0.55 : 1.0;
    b.cylT(0.12, 0.07, 0.16, C.bronze, bowlX, y, bowlZ, 8);
    b.cone(0.08, 0.2, P.fire, bowlX, y + 0.12, bowlZ, 5).cone(0.04, 0.12, P.ember, bowlX, y + 0.16, bowlZ, 5);
  }
  if (ziggurat) return block(ctx, { w: 0.9, d: 0.8, hh: 0.6, y });
  const top = block(ctx, { w: 1.4, d: 1.6, hh: 0.95, y, x: -0.3, z: -0.25 });
  return Math.max(top, tower(ctx, 0.75, -0.6, 0.55, age === 'iron' ? 1.4 : 2.0, y));
}

// The academy's practice targets at xs: holographic discs hovering over chrome pads (Future).
function holoTargets(ctx, xs) {
  const { b, extra } = ctx;
  xs.forEach((x, i) => {
    b.cylT(0.12, 0.14, 0.06, P.chrome, x, 0.03, 0.75, 10);
    const target = new B()
      .add(DISC, P.neonC, 0, 0, 0, 0.18, 0.02, 0.18, Math.PI / 2, 0, 0)
      .add(DISC, P.neonM, 0, 0, 0.012, 0.09, 0.02, 0.09, Math.PI / 2, 0, 0)
      .geometry();
    pushExtra(extra, 'floaters', { geo: target, at: [x, 0.6, 0.75], amp: 0.07, speed: 1.5, phase: i * 2 });
  });
}
// Painted boards on posts for musket and rifle drill (Age of Sail to Modern).
function boardTargets(ctx, xs) {
  const { b, t, age } = ctx;
  for (const x of xs) {
    b.box(0.05, 0.6, 0.05, C.woodD, x - 0.16, 0.03, 0.85).box(0.05, 0.6, 0.05, C.woodD, x + 0.16, 0.03, 0.85);
    b.box(0.4, 0.42, 0.04, age === 'modern' ? LINE : C.plaster, x, 0.3, 0.86);
    b.add(DISC, P.dark, x, 0.51, 0.885, 0.13, 0.01, 0.13, Math.PI / 2, 0, 0); // the ring
    b.add(DISC, t, x, 0.51, 0.89, 0.07, 0.01, 0.07, Math.PI / 2, 0, 0); // the bull
  }
}
// Straw dummies on posts, the middle one a tilting quintain in the Middle Ages.
function dummyTargets(ctx, xs) {
  const { b, t, age } = ctx;
  for (const [i, x] of xs.entries()) {
    b.cyl(0.04, 0.85, C.woodD, x, 0.03, 0.8);
    if (age === 'medieval' && i === 1) { // the quintain: a swinging arm with a team shield and a sandbag
      b.box(0.9, 0.05, 0.05, C.wood, x + 0.2, 0.8, 0.8).box(0.22, 0.28, 0.04, t, x - 0.18, 0.55, 0.8);
      b.add(BALL, C.cloth, x + 0.62, 0.6, 0.8, 0.09, 0.12, 0.09);
    } else {
      b.box(0.5, 0.05, 0.05, C.wood, x, 0.62, 0.8).add(BALL, C.hay, x, 0.58, 0.8, 0.15, 0.22, 0.12);
      b.add(BALL, C.cloth, x, 0.9, 0.8, 0.09, 0.09, 0.09);
    }
  }
}
// Academy: a school hall at the back of a drill yard where the era's practice targets stand: straw dummies on posts,
// a tilting quintain in the Middle Ages, painted boards for musket and rifle drill, holographic targets in the Future.
export function academy(ctx) {
  const { b, t, age } = ctx, style = ERA[age];
  const top = block(ctx, { w: 2.5, d: 1.1, hh: 1.05, z: -0.7 });
  b.box(2.6, 0.03, 1.2, age === 'modern' || age === 'future' ? YARD : P.dirt, 0, 0, 0.7);
  const xs = [-0.85, 0, 0.85];
  if (age === 'future') holoTargets(ctx, xs);
  else if (['sail', 'industrial', 'modern'].includes(age)) boardTargets(ctx, xs);
  else dummyTargets(ctx, xs);
  // A weapon rack by the hall door, the era's arms leaning in it.
  b.box(0.06, 0.5, 0.06, C.woodD, 1.05, 0.03, 0.1).box(0.06, 0.5, 0.06, C.woodD, 1.25, 0.03, 0.4);
  b.box(0.05, 0.05, 0.42, C.wood, 1.15, 0.45, 0.25, 0, -0.55);
  const arms = ['bronze', 'iron', 'medieval'].includes(age) ? C.wood : P.iron;
  for (let i = 0; i < 4; i++) {
    stick(b, 0.014, arms, [1.0 + i * 0.07, 0.03, 0.05 + i * 0.1], [1.12 + i * 0.07, 0.75, 0.08 + i * 0.1]);
  }
  b.box(0.12, 0.6, 0.02, style.trim, -1.15, 0.03, 1.2).box(0.1, 0.36, 0.025, t, -1.15, 0.22, 1.21); // the school's banner
  return top;
}

// The Siege Workshop's engine for the era, built at the origin (empty in Bronze: the Workshop unlocks in Iron).
const SIEGE_ENGINES = {
  iron(g) { // a catapult: base frame, upright, throwing arm and bucket
    g.box(0.9, 0.08, 0.45, C.wood, 0, 0.12, 0).box(0.08, 0.38, 0.4, C.woodD, 0.1, 0.2, 0);
    stick(g, 0.03, C.wood, [-0.3, 0.25, 0], [0.4, 0.7, 0]);
    g.cylT(0.1, 0.07, 0.07, C.woodD, 0.42, 0.69, 0, 8);
    for (const x of [-0.3, 0.3]) for (const side of [-1, 1]) {
      g.add(CYL8, C.woodD, x, 0.12, side * 0.25, 0.12, 0.05, 0.12, Math.PI / 2, 0, 0); // a wheel
    }
  },
  medieval(g) { // a trebuchet half raised in its A-frames
    g.box(1.0, 0.07, 0.5, C.wood, 0, 0.04, 0);
    for (const side of [-1, 1]) {
      stick(g, 0.025, C.wood, [-0.25, 0.1, side * 0.2], [0, 0.8, side * 0.2]);
      stick(g, 0.025, C.wood, [0.25, 0.1, side * 0.2], [0, 0.8, side * 0.2]);
    }
    stick(g, 0.03, C.woodD, [-0.45, 0.35, 0], [0.4, 0.95, 0]);
    g.box(0.2, 0.2, 0.2, C.stoneD, 0.32, 0.72, 0); // the counterweight
  },
  sail(g) { // a cannon on its carriage
    g.box(0.6, 0.12, 0.3, C.wood, 0, 0.12, 0);
    g.add(new THREE.CylinderGeometry(0.06, 0.09, 0.85, 10), P.iron, 0.1, 0.33, 0, 1, 1, 1, 0, 0, Math.PI / 2 - 0.08);
    for (const side of [-1, 1]) g.add(CYL8, C.woodD, -0.05, 0.12, side * 0.2, 0.12, 0.04, 0.12, Math.PI / 2, 0, 0);
  },
  industrial(g) { // a field gun with a shield and spoked wheels
    g.add(new THREE.CylinderGeometry(0.045, 0.06, 0.9, 10), P.olive, 0.12, 0.34, 0, 1, 1, 1, 0, 0, Math.PI / 2 - 0.15);
    g.box(0.06, 0.32, 0.5, P.olive, -0.12, 0.22, 0);
    stick(g, 0.03, P.olive, [-0.1, 0.22, 0], [-0.7, 0.04, 0]);
    for (const side of [-1, 1]) g.add(CYL8, C.woodD, -0.05, 0.18, side * 0.28, 0.18, 0.04, 0.18, Math.PI / 2, 0, 0);
  },
  modern(g, t) { // a tank: hull, tracks, turret and gun
    g.box(0.9, 0.2, 0.5, P.olive, 0, 0.12, 0).box(0.25, 0.08, 0.22, t, -0.2, 0.32, 0);
    for (const side of [-1, 1]) g.box(0.95, 0.16, 0.1, TYRE, 0, 0.04, side * 0.27);
    g.box(0.4, 0.14, 0.34, DARK_OLIVE, 0.05, 0.32, 0);
    g.add(new THREE.CylinderGeometry(0.025, 0.03, 0.55, 8), DARK_OLIVE, 0.45, 0.4, 0, 1, 1, 1, 0, 0, Math.PI / 2);
  },
  future(g) { // a railgun's twin rails on a hover sled
    g.box(0.8, 0.06, 0.4, P.snow, 0, 0.18, 0).box(0.82, 0.02, 0.42, P.neonC, 0, 0.17, 0);
    for (const side of [-1, 1]) { // a rail and its neon strip
      g.box(1.0, 0.06, 0.05, P.chrome, 0.15, 0.3, side * 0.08).box(1.0, 0.02, 0.02, P.neonM, 0.15, 0.36, side * 0.08);
    }
  },
};
// Siege Workshop: a workshop at the back with an open shed roofed in the era's material in front of it, wheels and timber
// stacked under the shed, and the era's engine out in the yard (a catapult, a trebuchet, a cannon, a field gun, a tank,
// a railgun).
export function siege_workshop(ctx) {
  const { b, t, extra, age } = ctx, style = ERA[age];
  const top = block(ctx, { w: 2.6, d: 0.7, hh: 1.2, z: -0.98 });
  b.box(2.6, 0.04, 1.95, age === 'future' || age === 'modern' ? GREY : P.dirt, 0, 0, 0.3);
  // The shed: posts and a lean-to roof sloping down to the front.
  const postColor = age === 'future' ? P.chrome : age === 'modern' || age === 'industrial' ? P.iron : C.woodD;
  for (const x of [-1.2, 0, 1.2]) b.box(0.09, 1.04, 0.09, postColor, x, 0.04, 0.42);
  b.box(2.66, 0.06, 1.1, style.roof, 0, 1.18, -0.08, Math.atan2(0.35, 1.5)).box(2.68, 0.05, 0.08, t, 0, 1.02, 0.46);
  // The engine in the yard.
  const engine = new B();
  SIEGE_ENGINES[age]?.(engine, t);
  if (engine.geos.length) place(b, engine, -0.3, 0.04, 0.95);
  // Spare wheels and a timber stack under the shed.
  const wheel = age === 'modern' || age === 'future' ? TYRE : C.woodD;
  for (let i = 0; i < 2; i++) b.add(CYL8, wheel, 0.9, 0.18, -0.15 + i * 0.12, 0.17, 0.05, 0.17, Math.PI / 2, 0, 0);
  for (let i = 0; i < 3; i++) b.add(CYL6, C.wood, -0.6, 0.08 + i * 0.1, -0.2, 0.05, 0.6, 0.05, 0, 0, Math.PI / 2);
  if (age === 'future') {
    const crate = new B().box(0.2, 0.04, 0.2, P.snow).box(0.08, 0.06, 0.08, P.neonM, 0, -0.05, 0).geometry();
    pushExtra(extra, 'floaters', { geo: crate, at: [0.8, 0.6, 0.95], amp: 0.06, speed: 1.8 });
  }
  return top;
}

// University: a long hall of learning round a lawn, its tall tower in the era's style (a Gothic spire, an observatory
// dome, a clock, a glass top or a floating orb) and a reading bench with books under it.
export function university(ctx) {
  const { b, t } = ctx;
  let top = block(ctx, { w: 1.7, d: 1.0, hh: 1.15, x: -0.5, z: -0.8 });
  top = Math.max(top, block(ctx, { w: 0.9, d: 1.4, hh: 0.9, x: -0.95, z: 0.55 }));
  top = Math.max(top, tower(ctx, 0.8, -0.65, 0.65, 2.1));
  b.box(1.4, 0.03, 1.2, LAWN, 0.55, 0, 0.75);
  b.box(0.6, 0.06, 0.2, C.wood, 0.5, 0.3, 0.8); // the reading bench
  b.box(0.05, 0.3, 0.05, C.woodD, 0.25, 0, 0.8).box(0.05, 0.3, 0.05, C.woodD, 0.75, 0, 0.8);
  for (const [i, c] of [P.tile, t, P.olive].entries()) b.box(0.12, 0.05, 0.16, c, 0.35 + i * 0.15, 0.36, 0.8); // books
  return top;
}

// The arsenal's yard stores: cannonballs and powder kegs (Age of Sail), hovering energy cells (Future), or crates of
// shells and ammunition.
function arsenalStores(ctx) {
  const { b, extra, age } = ctx;
  if (age === 'sail') {
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 3 - layer; i++) for (let j = 0; j < 3 - layer; j++) {
      const x = 0.45 + (i - (2 - layer) / 2) * 0.13, z = 0.55 + (j - (2 - layer) / 2) * 0.13;
      b.add(BALL, P.iron, x, 0.065 + layer * 0.11, z, 0.065, 0.065, 0.065); // a pyramid of shot
    }
    for (const [x, z] of [[-0.6, 0.55], [-0.85, 0.75], [-0.7, 0.85]]) barrel(b, x, 0, z, 0.1, 0.24);
  } else if (age === 'future') {
    for (const [x, z] of [[0.4, 0.5], [0.7, 0.7]]) b.cylT(0.11, 0.11, 0.06, P.chrome, x, 0, z, 10);
    for (const [i, [x, z]] of [[0.4, 0.5], [0.7, 0.7]].entries()) {
      const cell = new B().cylT(0.07, 0.07, 0.28, P.neonM, 0, 0, 0, 8).cylT(0.08, 0.08, 0.04, P.chrome, 0, 0.12, 0, 8).geometry();
      pushExtra(extra, 'floaters', { geo: cell, at: [x, 0.35, z], amp: 0.05, speed: 1.4, phase: i * 2 });
    }
  } else {
    const crate = age === 'modern' ? P.olive : C.wood, lid = age === 'modern' ? DARK_OLIVE : C.woodD;
    for (const [x, z] of [[0.35, 0.5], [0.75, 0.5], [0.55, 0.85]]) {
      b.box(0.32, 0.22, 0.24, crate, x, 0, z).box(0.33, 0.03, 0.25, lid, x, 0.22, z);
    }
    for (let i = 0; i < 3; i++) { // shells standing on end
      b.cylT(0.05, 0.05, 0.3, C.brass, -0.6 + i * 0.12, 0, 0.7, 8).cone(0.05, 0.1, C.brass, -0.6 + i * 0.12, 0.3, 0.7, 8);
    }
  }
}
// Arsenal: a gunpowder store behind a low yard wall, cannonballs piled in pyramids, powder kegs and a gun at the gate;
// in later eras the shot is shells and ammunition crates, in the Future glowing energy cells that hover.
export function arsenal(ctx) {
  const { b, t, age } = ctx, style = ERA[age];
  const top = block(ctx, { w: 2.2, d: 1.3, hh: 1.2, x: -0.15, z: -0.6 });
  for (const [x, z, w, d] of [[-1.25, 0.6, 0.1, 1.0], [1.25, 0.05, 0.1, 2.3], [-0.8, 1.15, 0.85, 0.1], [0.85, 1.15, 0.8, 0.1]]) {
    b.box(w, 0.35, d, style.trim, x, 0, z); // the yard wall
  }
  arsenalStores(ctx);
  // The gun at the gate: a cannon on a carriage, later a breech-loader.
  b.box(0.36, 0.1, 0.2, age === 'future' ? P.snow : C.wood, 0.05, 0.1, 0.8);
  const gunBarrel = new THREE.CylinderGeometry(0.04, 0.065, 0.55, 10);
  b.add(gunBarrel,age === 'future' ? P.chrome : P.iron, 0.05, 0.25, 0.85, 1, 1, 1, Math.PI / 2 - 0.1, 0, 0);
  b.box(0.14, 0.42, 0.02, t, 1.3, 0.05, 1.2);
  return top;
}

// The trading company's cargo for the era: bales, barrels and a sack (Age of Sail), crates and a handcart (Industrial),
// a team-painted shipping container (Modern), floating cargo pods (Future).
function cargo(ctx) {
  const { b, t, extra, age } = ctx;
  if (age === 'sail') {
    for (const [x, z] of [[-0.8, 0.55], [-0.55, 0.75], [-0.85, 0.9]]) { // bales and their straps
      b.box(0.24, 0.2, 0.18, C.cloth, x, 0, z).box(0.25, 0.02, 0.19, C.leather, x, 0.1, z);
    }
    for (const [x, z] of [[0.5, 0.6], [0.75, 0.8]]) barrel(b, x, 0, z, 0.1, 0.24);
    sack(b, 0.4, 0, 0.95, 0.1);
  } else if (age === 'industrial') {
    for (const [x, y, z] of [[-0.75, 0, 0.6], [-0.5, 0, 0.6], [-0.62, 0.24, 0.6], [0.6, 0, 0.8]]) {
      b.box(0.24, 0.24, 0.24, C.wood, x, y, z).box(0.25, 0.03, 0.25, C.woodD, x, y + 0.12, z);
    }
    b.box(0.5, 0.06, 0.3, C.wood, 0.3, 0.12, 0.45).add(CYL8, TYRE, 0.3, 0.1, 0.62, 0.1, 0.03, 0.1, Math.PI / 2, 0, 0);
  } else if (age === 'modern') {
    b.box(1.2, 0.45, 0.45, t, -0.4, 0, 0.75).box(1.22, 0.04, 0.47, LINE, -0.4, 0.45, 0.75);
    for (let i = 0; i < 6; i++) b.box(0.02, 0.4, 0.46, CONTAINER_RIB, -0.9 + i * 0.2, 0.02, 0.75);
    b.box(0.4, 0.03, 0.3, C.wood, 0.7, 0, 0.8).box(0.3, 0.25, 0.25, CARTON, 0.7, 0.03, 0.8);
  } else {
    for (const [i, [x, z]] of [[-0.6, 0.65], [0.55, 0.75]].entries()) {
      b.box(0.3, 0.03, 0.3, P.neonC, x, 0, z);
      const pod = new B().box(0.28, 0.22, 0.28, P.snow).box(0.29, 0.03, 0.29, t, 0, 0.1, 0).geometry();
      pushExtra(extra, 'floaters', { geo: pod, at: [x, 0.3, z], amp: 0.08, speed: 1.3, phase: i * 3 });
    }
  }
}
// Trading Company: a tall warehouse with a hoist over its loft door, the yard stacked with the era's cargo (bales and
// barrels, crates, a team-painted shipping container, floating cargo pods) and the company's flag.
export function trading_company(ctx) {
  const { b, age } = ctx, style = ERA[age];
  const top = block(ctx, { w: 2.3, d: 1.2, hh: 1.45, z: -0.7 });
  // The hoist: a beam out over the loft door, a rope and a crate on it.
  b.box(0.36, 0.3, 0.04, C.woodD, 0, 1.05, -0.08).box(0.07, 0.07, 0.45, style.trim, 0, 1.4, 0.1);
  stick(b, 0.008, C.cloth, [0, 1.4, 0.3], [0, 0.95, 0.3]);
  b.box(0.16, 0.14, 0.16, C.wood, 0, 0.8, 0.3);
  cargo(ctx);
  flag(ctx, 1.2, 0, 0.9, 1.6, age === 'future' ? P.chrome : C.woodD);
  return top;
}

// The station's train on the line: a steam locomotive under its own smoke (Industrial), a diesel in team livery
// (Modern), a maglev pod hovering over the guideway (Future).
function train(ctx) {
  const { b, t, extra, age } = ctx, loco = new B();
  if (age === 'industrial') { // boiler, cab, funnel, headlamp and wheels
    loco.add(unit.cyl, LOCO, 0, 0, 0, 0.17, 0.75, 0.17, 0, 0, Math.PI / 2).box(0.35, 0.42, 0.38, LOCO, -0.5, -0.12, 0);
    loco.box(0.37, 0.04, 0.4, t, -0.5, 0.22, 0);
    loco.cylT(0.06, 0.05, 0.25, LOCO, 0.25, 0.15, 0).add(DISC, C.gold, 0.38, 0, 0, 0.12, 0.02, 0.12, 0, 0, Math.PI / 2);
    for (const x of [-0.5, -0.15, 0.15]) for (const side of [-1, 1]) {
      loco.add(CYL8, P.red, x, -0.12, side * 0.16, 0.1, 0.03, 0.1, Math.PI / 2, 0, 0);
    }
    pushExtra(extra, 'smoke', { geo: puff(), at: [0.05, 0.75, 0.85], phase: 0.3 });
    place(b, loco, -0.2, 0.3, 0.85);
  } else if (age === 'modern') {
    loco.box(1.4, 0.36, 0.34, LINE, 0, 0.12, 0).box(1.42, 0.08, 0.36, t, 0, 0.22, 0).box(0.25, 0.12, 0.36, GLASS_D, 0.55, 0.34, 0);
    for (const x of [-0.45, 0.45]) loco.box(0.3, 0.1, 0.3, TYRE, x, 0, 0);
    place(b, loco, -0.1, 0.05, 0.85);
  } else {
    loco.sph(0.18, P.snow, 0.5, 0, 0, 1.6, 0.9, 1).box(1.0, 0.3, 0.32, P.snow, -0.1, -0.15, 0);
    loco.box(1.02, 0.08, 0.34, GLASS_D, -0.1, 0.02, 0).box(1.02, 0.03, 0.34, t, -0.1, -0.12, 0);
    pushExtra(extra, 'floaters', { geo: loco.geometry(), at: [-0.1, 0.32, 0.85], amp: 0.03, speed: 1.2 });
  }
}
// Railway Station: the booking hall at the back, a platform under a canopy, and the era's train on the line in front: a
// steam locomotive under its own smoke, a diesel, a maglev pod hovering over its guideway.
export function railway_station(ctx) {
  const { b, t, age } = ctx, style = ERA[age];
  let top = block(ctx, { w: 2.0, d: 0.9, hh: 1.15, x: -0.3, z: -0.9 });
  top = Math.max(top, tower(ctx, 1.05, -0.95, 0.5, 1.7));
  // The platform and its canopy on posts.
  b.box(2.7, 0.18, 0.55, style.base, 0, 0, 0.1).box(2.7, 0.02, 0.06, LINE, 0, 0.18, 0.35);
  for (const x of [-1.1, 0, 1.1]) b.box(0.05, 0.75, 0.05, age === 'future' ? P.chrome : P.iron, x, 0.18, 0.1);
  b.box(2.7, 0.05, 0.7, style.roof, 0, 0.93, 0.1).box(2.72, 0.05, 0.03, t, 0, 0.9, 0.46);
  // The line: sleepers and two rails (a single guideway in the Future).
  if (age === 'future') {
    b.box(2.7, 0.08, 0.3, P.snow, 0, 0, 0.85).box(2.72, 0.02, 0.32, P.neonC, 0, 0.08, 0.85);
  } else {
    for (let x = -1.25; x <= 1.26; x += 0.25) b.box(0.08, 0.03, 0.5, age === 'modern' ? P.concrete : C.woodD, x, 0, 0.85);
    for (const side of [-1, 1]) b.box(2.7, 0.04, 0.03, P.iron, 0, 0.03, 0.85 + side * 0.14);
  }
  train(ctx);
  return top;
}

// Power Plant: a turbine hall, a hyperboloid cooling tower with steam over it and a pylon carrying the lines away; in
// the Future a fusion core glowing in a turning ring instead of the cooling tower.
export function power_plant(ctx) {
  const { b, t, extra, age } = ctx;
  const top = block(ctx, { w: 1.3, d: 1.9, hh: 1.1, x: -0.65, z: -0.2 });
  if (age === 'future') {
    b.cylT(0.6, 0.65, 0.2, P.snow, 0.7, 0, -0.4, 16).cylT(0.66, 0.66, 0.03, P.neonC, 0.7, 0.12, -0.4, 16);
    b.cylT(0.15, 0.25, 1.0, P.chrome, 0.7, 0.2, -0.4, 10);
    const core = new B().sph(0.3, P.neonM).sph(0.18, 0xffd6fb).geometry();
    pushExtra(extra, 'floaters', { geo: core, at: [0.7, 1.55, -0.4], amp: 0.05, speed: 1.1 });
    pushExtra(extra, 'spinners', { geo: ring(0.52, 0.04, P.neonC, 0.4), at: [0.7, 1.55, -0.4], axis: 'y', speed: 1.4 });
  } else { // the cooling tower, narrowing to its waist and flaring at the lip
    b.cylT(0.42, 0.62, 1.1, P.concrete, 0.7, 0, -0.4, 16).cylT(0.5, 0.42, 0.7, P.concrete, 0.7, 1.1, -0.4, 16);
    b.cylT(0.51, 0.51, 0.08, t, 0.7, 1.3, -0.4, 16);
    b.cylT(0.46, 0.46, 0.02, GREY, 0.7, 1.79, -0.4, 16);
    pushExtra(extra, 'smoke', { geo: puff(), at: [0.7, 1.95, -0.4], phase: 0 });
    pushExtra(extra, 'smoke', { geo: puff(), at: [0.6, 1.95, -0.3], phase: 0.5 });
  }
  // The switchyard: transformers behind a fence, and a lattice pylon.
  for (const x of [0.3, 0.75]) { // a transformer and its insulator
    b.box(0.26, 0.3, 0.22, age === 'future' ? P.snow : TRANSFORMER, x, 0, 0.75).box(0.04, 0.12, 0.04, C.iron, x, 0.3, 0.75);
  }
  for (const x of [0.05, 1.25]) b.box(0.03, 0.25, 1.0, GREY, x, 0, 0.75);
  for (const side of [-1, 1]) stick(b, 0.025, P.steel, [1.15 + side * 0.15, 0, 0.35], [1.15, 1.6, 0.35]);
  b.box(0.6, 0.04, 0.04, P.steel, 1.15, 1.35, 0.35).box(0.4, 0.04, 0.04, P.steel, 1.15, 1.55, 0.35);
  return Math.max(top, age === 'future' ? 1.2 : 1.81);
}

// The plane on the apron, nose to +x, built at the origin.
function plane(ctx) {
  const { t, age } = ctx, plane = new B(), body = age === 'future' ? P.snow : LINE;
  plane.add(new THREE.CylinderGeometry(0.06, 0.08, 0.8, 10), body, 0, 0, 0, 1, 1, 1, 0, 0, Math.PI / 2); // the fuselage
  plane.add(BALL, age === 'future' ? GLASS_D : body, 0.42, 0, 0, 0.12, 0.07, 0.07); // the nose
  plane.box(0.22, 0.02, 0.9, body, 0.02, -0.02, 0).box(0.12, 0.02, 0.36, body, -0.36, 0, 0); // the wings and tailplane
  plane.box(0.14, 0.18, 0.02, t, -0.36, 0.02, 0); // the tail fin
  return plane;
}
// Airfield: a runway across the front with its centre line, a hangar with a curved roof, a terminal under a control tower
// and a plane on the apron; in the Future a drone pad, a jet that hovers and a glass control spire.
export function airfield(ctx) {
  const { b, t, extra, age } = ctx, style = ERA[age];
  b.box(2.75, 0.03, 0.8, ASPH, 0, 0, 0.9);
  for (let x = -1.2; x <= 1.21; x += 0.4) b.box(0.22, 0.01, 0.04, age === 'future' ? P.neonC : LINE, x, 0.03, 0.9);
  // The hangar: a half-cylinder roof over its open front.
  b.box(1.3, 0.05, 1.05, style.base, -0.65, 0, -0.65);
  b.add(HALF, age === 'future' ? P.snow : HULL, -0.65, 0.05, -0.65, 0.6, 1.0, 0.6, 0, Math.PI / 2, Math.PI / 2);
  b.add(HALF, C.dark, -0.65, 0.05, -0.14, 0.48, 0.02, 0.48, 0, Math.PI / 2, Math.PI / 2); // the open front
  b.box(0.6, 0.06, 0.03, t, -0.65, 0.52, -0.14);
  let top = block(ctx, { w: 1.1, d: 0.8, hh: 0.7, x: 0.8, z: -0.8 });
  top = Math.max(top, tower(ctx, 0.9, -0.8, 0.32, 2.0));
  const aircraft = plane(ctx);
  if (age === 'future') {
    b.cylT(0.3, 0.3, 0.02, P.neonM, 0.75, 0.03, 0.9, 16); // the drone pad
    pushExtra(extra, 'floaters', { geo: aircraft.geometry(), at: [0.75, 0.45, 0.9], amp: 0.08, speed: 1.2 });
  } else {
    place(b, aircraft, 0.7, 0.14, 0.9);
    b.box(0.03, 0.1, 0.03, TYRE, 0.7, 0.03, 0.9); // the landing gear
  }
  return top;
}

export const GATES = {
  temple, academy, siege_workshop, university, arsenal, trading_company, railway_station, power_plant, airfield,
};
