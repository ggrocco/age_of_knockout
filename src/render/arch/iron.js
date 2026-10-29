// Iron Age: Greek and Roman masonry, beside today's kept Town Center, House, Government Center and Wonder (legacy.js):
// plaster and ashlar under terracotta tile, marble columns and pediments with team-coloured tympana. A buttressed
// horreum, a storehouse with an amphora pit, olive and grain terraces, a palisaded camp of leather tents, a stone
// archery yard with marble targets, an arcaded stable and an agora round a market tholos; for defence, a stone tower
// with a ballista on its roof and an ashlar wall.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { B, C, unit } from '../builder.js';
import {
  P, flag, firePit, stick, hash, place, horse, streak, WEDGE, CYL6, BALL, CONE4, ARCH, ARCH_RING, HORSE_HEAD, sack,
} from './kit.js';

// ---------- shared Iron parts ----------
const MARBLE = C.marble, MARBLE_D = 0xd9d1bf, PLASTER = 0xd7c7a4, ASHLAR = 0xbcad8d, ASHLAR_D = 0xa39579;
const TILE = 0xa96342, TILE_L = 0xb7714e, TILE_D = 0x8a4c34, CLAY = 0xb5693f, PAVING = 0xbfb193, SAND = 0xd2bf8e;
const EARTH = 0x7a6346, SOIL = 0x6b5232, WALLSTONE = 0x9a8f78, BARK = 0x5e4e3c;
const OLIVE = 0x7d8c63, OLIVE_D = 0x5f6d4a, OLIVE_L = 0x9aa582;
const WATER = 0x3f7fa3;
const CAMP_GROUND = 0x9c8a66, THRESHING = 0xb59a6a, CAPSTONE = 0xb3a487, STONE_D = 0x857a64, STONE_L = 0xada28a;
const LINEN = 0xf2efe6, ASHLAR_DD = 0x938670, AGORA = 0xcdc2a6, OCHRE = 0xd9a441, MADDER = 0x6b3a1e, GREEN_CLOTH = 0x4f6b2a;
const STAKE_L = 0x8a6238, OLIVE_BASKET = 0x3a3a2a;
const CORNERS = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
// AMPHORA: a terracotta amphora 0.61 tall with two handles, foot at the origin.
const AMPHORA = (() => {
  // The body's outline as [radius, height] pairs, from the foot up to the mouth.
  const profile = [[0, 0], [0.03, 0.05], [0.08, 0.18], [0.1, 0.33], [0.08, 0.45], [0.035, 0.51], [0.035, 0.58], [0.05, 0.61],
    [0, 0.61]];
  const body = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 6).toNonIndexed();
  const handles = [-1, 1].map(k => new THREE.BoxGeometry(0.022, 0.15, 0.03)
    .rotateZ(k * 0.45).translate(k * 0.065, 0.5, 0).toNonIndexed());
  for (const g of [body, ...handles]) {
    g.deleteAttribute('uv');
    g.deleteAttribute('normal');
  }
  const merged = mergeGeometries([body, ...handles]);
  merged.computeVertexNormals();
  return merged;
})();

// A marble column hh tall standing on y: a square base, an eight-sided tapering shaft and a square capital.
const column = (b, x, y, z, hh, r = 0.065) => {
  b.box(r * 2.7, 0.05, r * 2.7, MARBLE_D, x, y, z);
  b.cylT(r * 0.82, r, hh - 0.09, MARBLE, x, y + 0.05, z, 8);
  b.box(r * 2.9, 0.04, r * 2.9, MARBLE_D, x, y + hh - 0.04, z);
};
// A terracotta gable roof (tiled by B.roof) w wide, hh high and d long, standing on y, its ridge along z (or along x,
// with alongX), with a ridge cap and marble pediments closing both gable ends, each with a team-coloured tympanum.
// The pediments stand d / 2 + 0.045 out from the centre.
const gable = (b, t, w, hh, d, x, y, z, alongX = false) => {
  const turn = alongX ? Math.PI / 2 : 0, along = offset => alongX ? [x + offset, z] : [x, z + offset];
  b.roof(w, hh, d, TILE, x, y, z, turn).box(0.07, 0.05, d + 0.04, TILE_D, x, y + hh - 0.015, z, 0, turn);
  for (const k of [-1, 1]) {
    const [pedimentX, pedimentZ] = along(k * (d / 2 + 0.01)), [tympanumX, tympanumZ] = along(k * (d / 2 + 0.039));
    b.roof(w + 0.08, hh + 0.07, 0.05, MARBLE, pedimentX, y - 0.02, pedimentZ, turn);
    b.roof(w * 0.66, hh * 0.58, 0.012, t, tympanumX, y + 0.05, tympanumZ, turn);
  }
};
// A single-pitch terracotta roof built at the origin for place(): `width` along x, sloping from its high back edge
// (z = -run / 2, y = rise) to its low front edge (z = run / 2, y = 0), with tile courses across it and cover-tile ridges
// down it.
const leanTo = (width, run, rise) => {
  const roof = new B(), pitch = Math.atan2(rise, run), length = Math.hypot(run, rise) + 0.08;
  // at(f, off): [y, z] of the point a fraction f (-0.5 back .. 0.5 front) down the slope, raised off along its normal.
  const at = (f, off) => [rise / 2 - f * rise + off * Math.cos(pitch), f * run + off * Math.sin(pitch)];
  roof.box(width, 0.04, length, TILE, 0, rise / 2 - 0.02, 0, pitch);
  for (let i = 0; i < 4; i++) {
    const [y, z] = at((i + 0.5) / 4 - 0.5, 0.025);
    roof.box(width + 0.01, 0.025, length / 4 - 0.015, i % 2 ? TILE : TILE_L, 0, y - 0.0125, z, pitch);
  }
  for (let x = -width / 2 + 0.08; x < width / 2 - 0.03; x += 0.2) {
    const [y, z] = at(0, 0.045);
    roof.box(0.04, 0.04, length, TILE_D, x, y - 0.02, z, pitch);
  }
  return roof;
};
// An arched opening drawn on a wall face at z (facing +z): a dark doorway `width` wide, springing at y + spring, under
// a marble arch ring.
const archway = (b, x, y, z, width, spring, c = C.dark) => {
  const r = width / 2;
  b.box(width, spring, 0.02, c, x, y, z);
  b.add(ARCH, c, x, y + spring, z + 0.011, r, r, 1);
  b.add(ARCH_RING, MARBLE_D, x, y + spring, z + 0.012, r + 0.03, r + 0.03, 0.25);
};
// A terracotta amphora standing on y (k scales it), its stopper sealed with `seal`; tipped by rx/rz it lies unsealed.
const amphora = (b, x, y, z, k = 1, seal = null, rx = 0, rz = 0) => {
  b.add(AMPHORA, CLAY, x, y, z, k, k, k, rx, 0, rz);
  if (seal && !rx && !rz) b.add(CYL6, seal, x, y + 0.6 * k, z, 0.045 * k, 0.04 * k, 0.045 * k);
};
// A Roman scutum built at the origin for place(), facing +z: a team-painted face edged dark, a gold spine and a
// bronze boss.
const scutum = t => new B()
  .box(0.22, 0.32, 0.02, C.woodD, 0, 0, 0)
  .box(0.19, 0.29, 0.02, t, 0, 0.015, 0.012)
  .box(0.03, 0.29, 0.024, C.gold, 0, 0.015, 0.016)
  .add(BALL, C.bronze, 0, 0.16, 0.03, 0.045, 0.045, 0.03);
// Arrows stuck in a target at (x, y, z): count of them, fletched in linen.
const arrowsIn = (b, x, y, z, offsets, count) => {
  for (const [dx, dy] of offsets.slice(0, count)) {
    const nock = [x + dx, y + dy, z + 0.05];
    stick(b, 0.008, C.wood, nock, [nock[0] + 0.02, nock[1] + 0.03, nock[2] + 0.3], CYL6);
    b.box(0.004, 0.035, 0.07, LINEN, nock[0] + 0.02, nock[1] + 0.01, nock[2] + 0.27);
  }
};

// The horreum's long walls from x0 to x1, buttressed, with ventilation slits between the buttresses.
function horreumWalls(b, x0, x1, width, floor, wallHeight) {
  b.box(x1 - x0, wallHeight, width, PLASTER, (x0 + x1) / 2, floor, 0);
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
    const x = x0 + 0.08 + i * 0.3, side = k * (width / 2 + 0.04);
    b.box(0.1, wallHeight - 0.04, 0.08, ASHLAR, x, floor, side).box(0.12, 0.05, 0.1, ASHLAR_D, x, floor + wallHeight - 0.06, side);
    if (i < 3) {
      b.box(0.05, 0.2, 0.02, C.dark, x + 0.15, floor + 0.42, k * (width / 2 + 0.005)); // a slit
      b.box(0.11, 0.06, 0.02, C.dark, x + 0.15, 0.08, k * (width / 2 + 0.075)); // a podium vent
    }
  }
}
// A grain cart at (x, z) loaded with sacks, its shafts resting on the ground.
function grainCart(b, x, z) {
  for (const k of [-1, 1]) b.add(unit.cyl, C.woodD, x, 0.14, z + k * 0.12, 0.11, 0.03, 0.11, Math.PI / 2, 0, 0);
  b.box(0.5, 0.05, 0.22, C.wood, x, 0.17, z); // the bed
  b.box(0.5, 0.08, 0.02, C.woodD, x, 0.22, z + 0.1).box(0.5, 0.08, 0.02, C.woodD, x, 0.22, z - 0.1); // its sides
  stick(b, 0.015, C.wood, [x + 0.25, 0.19, z - 0.05], [x + 0.62, 0.05, z - 0.05], CYL6);
  stick(b, 0.015, C.wood, [x + 0.25, 0.19, z + 0.05], [x + 0.62, 0.05, z + 0.05], CYL6);
  for (const [dx, dy] of [[-0.15, 0], [0, 0], [0.15, 0], [-0.07, 0.12], [0.08, 0.12]]) sack(b, x + dx, 0.22 + dy, z, 0.07);
}
// Granary: a Roman horreum. A long plastered hall raised on a podium against damp and rats, its walls buttressed with
// ventilation slits between the buttresses; a portico of four marble columns at the +x end over the loading doors and
// steps, a team frieze all round under a tiled roof with marble pediments, the flag on its ridge; a grain cart, sacks
// and a heap of grain before it.
export function granary(ctx) {
  const { b, s, h, t } = ctx, hallBack = -h + 0.05, hallEnd = 0.22, porticoX = 0.6, width = 0.98;
  const floor = 0.22, wallHeight = 0.8, centreX = (hallBack + porticoX + 0.08) / 2, length = porticoX + 0.08 - hallBack;
  b.box(s, 0.03, s, PAVING);
  // The podium, and steps up to the portico.
  b.box(length + 0.04, floor - 0.03, width + 0.14, ASHLAR_D, centreX, 0.03, 0);
  for (let i = 0; i < 3; i++) {
    b.box(0.18 - 0.06 * i, 0.065 * (i + 1), 0.62, ASHLAR, porticoX + 0.1 + (0.18 - 0.06 * i) / 2, 0.03, 0);
  }
  horreumWalls(b, hallBack, hallEnd, width, floor, wallHeight);
  // The portico: columns, the loading doors in the hall's end wall, sacks waiting on its floor.
  for (const z of [-0.36, -0.12, 0.12, 0.36]) column(b, porticoX, floor, z, wallHeight);
  b.box(0.02, 0.56, 0.42, C.woodD, hallEnd + 0.01, floor, 0).box(0.02, 0.56, 0.015, C.dark, hallEnd + 0.022, floor, 0);
  b.box(0.04, 0.06, 0.52, MARBLE_D, hallEnd + 0.02, floor + 0.56, 0);
  for (const [x, z] of [[0.34, -0.3], [0.4, -0.16], [0.36, 0.3]]) sack(b, x, floor, z, 0.08);
  // The entablature: an architrave, the team frieze and a cornice right round the hall and portico.
  const top = floor + wallHeight;
  b.box(length, 0.05, width + 0.1, MARBLE_D, centreX, top, 0).box(length + 0.01, 0.07, width + 0.11, t, centreX, top + 0.05, 0);
  b.box(length + 0.03, 0.04, width + 0.13, MARBLE, centreX, top + 0.12, 0);
  gable(b, t, width + 0.12, 0.42, length - 0.04, centreX, top + 0.16, 0, true);
  flag(ctx, hallBack + 0.12, top + 0.55, 0, 0.5);
  // A grain cart loaded with sacks along the +z side, and a bronze modius of grain by the steps.
  grainCart(b, -0.45, 0.74);
  b.cylT(0.08, 0.065, 0.13, C.bronze, 0.76, 0.03, 0.7, 8).cone(0.075, 0.06, C.hay, 0.76, 0.16, 0.7, 8);
  sack(b, 0.6, 0.03, 0.8, 0.085);
  sack(b, 0.56, 0.03, 0.6, 0.08);
  b.cyl(0.19, 0.02, THRESHING, 0.35, 0.03, 0.69).cone(0.16, 0.15, C.hay, 0.35, 0.05, 0.69, 8);
  return top + 0.16 + 0.49;
}

// The storehouse from x0 to x1 and from backZ to frontZ: ashlar courses, alternately set in, with marble quoins at the
// front corners and two arched doorways; a tiled lean-to roof, high at the back, with wedge-shaped gable walls.
// Returns the roof's top.
function storehouse(ctx, x0, x1, backZ, frontZ) {
  const { b, t } = ctx, wallHeight = 0.68, centreX = (x0 + x1) / 2, width = x1 - x0, depth = frontZ - backZ;
  const centreZ = (backZ + frontZ) / 2, course = wallHeight / 4;
  for (let i = 0; i < 4; i++) {
    const inset = (i % 2) * 0.012;
    b.box(width - inset, course, depth - inset, i % 2 ? ASHLAR_D : ASHLAR, centreX, 0.03 + i * wallHeight / 4, centreZ);
  }
  for (let i = 0; i < 4; i++) for (const x of [x0 + 0.06, x1 - 0.06]) {
    const quoinX = x + (x < centreX ? 1 : -1) * (i % 2 ? 0 : 0.03);
    b.box(i % 2 ? 0.12 : 0.18, wallHeight / 4 - 0.01, 0.03, MARBLE_D, quoinX, 0.035 + i * wallHeight / 4, frontZ + 0.006);
  }
  for (const x of [-0.5, 0.06]) archway(b, x, 0.03, frontZ + 0.002, 0.32, 0.32);
  b.box(0.22, 0.08, 0.02, t, -0.22, 0.5, frontZ + 0.012);
  const rise = 0.22, top = 0.03 + wallHeight;
  for (const x of [x0 + 0.03, x1 - 0.03]) b.add(WEDGE, ASHLAR, x, top, backZ, 0.06, rise, depth);
  place(b, leanTo(width + 0.04, depth - 0.04, rise), centreX, top + 0.02, centreZ);
  flag(ctx, x1 - 0.1, top + rise, backZ + 0.1, 0.6);
  return top + rise;
}
// Amphorae laid in a stack beside the storehouse, logs half under a team cloth, marble blocks and the gold strongbox.
function storeYard(ctx) {
  const { b, t } = ctx;
  for (let i = 0; i < 3; i++) amphora(b, 0.44, 0.1, -0.8 + i * 0.18, 0.68, null, 0, -Math.PI / 2);
  for (let i = 0; i < 2; i++) amphora(b, 0.46, 0.22, -0.71 + i * 0.18, 0.64, null, 0, -Math.PI / 2);
  for (const [i, [x, y]] of [[0.3, 0.1], [0.45, 0.1], [0.6, 0.1], [0.37, 0.22], [0.52, 0.22]].entries()) {
    stick(b, 0.065, i % 2 ? C.woodD : C.wood, [x, y, 0.2], [x, y, 0.84], CYL6);
  }
  for (const k of [-1, 1]) b.box(0.2, 0.015, 0.34, t, 0.45 + k * 0.088, 0.275, 0.64, 0, 0, -k * 0.5);
  for (const [x, z, turn] of [[-0.02, 0.2, 0.1], [0.0, 0.0, -0.2]]) b.box(0.2, 0.15, 0.16, MARBLE_D, x, 0.03, z, 0, turn);
  b.box(0.18, 0.13, 0.14, MARBLE, -0.01, 0.18, 0.1, 0, 0.3);
  b.box(0.24, 0.14, 0.16, C.wood, 0.66, 0.03, -0.06).box(0.26, 0.03, 0.18, C.bronze, 0.66, 0.17, -0.06); // the strongbox
  b.box(0.26, 0.14, 0.02, C.bronze, 0.66, 0.03, 0.02);
  for (const [x, z] of [[0.62, -0.1], [0.7, -0.04], [0.66, -0.14]]) b.cylT(0.03, 0.03, 0.02, C.gold, x, 0.2, z, 6);
}
// Storage Pit: an ashlar storehouse with two arched doorways under a tiled lean-to roof flying the team flag; before
// it a sand pit of amphorae stood upright (some sealed in team colour), amphorae laid in a stack beside it, logs half
// under a team cloth, cut marble blocks and a bronze-bound strongbox of gold.
export function storage_pit(ctx) {
  const { b, s, h, t } = ctx;
  b.box(s, 0.03, s, PAVING);
  const roofTop = storehouse(ctx, -h + 0.03, 0.4, -h + 0.03, -0.2);
  // The amphora pit: a kerbed bed of sand with amphorae stood in it.
  const pitX = -0.48, pitZ = 0.42;
  b.box(0.76, 0.05, 0.66, ASHLAR_D, pitX, 0.03, pitZ).box(0.68, 0.02, 0.58, SAND, pitX, 0.06, pitZ);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    amphora(b, pitX - 0.22 + j * 0.22, -0.02, pitZ - 0.2 + i * 0.2, 0.62 + hash(i, j) * 0.08, (i + j) % 2 ? null : t);
  }
  storeYard(ctx);
  return roofTop + 0.09;
}

// The terraces' dry-stone walls, capstones and earth tops; darker and lighter stones picked out on the faces.
function terraceWalls(ctx, terraces) {
  const { b, s, h } = ctx;
  for (const [i, [frontZ, backZ, top]] of terraces.entries()) {
    const depth = frontZ - backZ, centreZ = (frontZ + backZ) / 2, foot = i ? terraces[0][2] : 0.03;
    b.box(s - 0.02, top - 0.03, depth, WALLSTONE, 0, 0.03, centreZ); // the wall
    b.box(s - 0.04, 0.015, depth - 0.06, SOIL, 0, top, centreZ - 0.02); // the earth on top
    b.box(s - 0.02, 0.03, 0.07, CAPSTONE, 0, top - 0.02, frontZ - 0.03);
    for (let j = 0; j < 9; j++) for (let row = 0; row < 2; row++) {
      const x = -h + 0.12 + j * 0.19 + row * 0.09, w = 0.13 + hash(row, j) * 0.05;
      if (hash(j + 4 * i, row) < 0.45 || x + w / 2 > h - 0.02) continue;
      b.box(w, 0.06, 0.02, hash(j, row + i) < 0.7 ? STONE_D : STONE_L, x, foot + 0.03 + row * (top - foot) * 0.45, frontZ + 0.002);
    }
  }
}
// An olive tree scaled k at (x, y, z): a gnarled, forking trunk under flat clumps of grey-green and silvery leaves.
const OLIVE_CLUMPS = [[-0.1, 0.4, 0.02, 0.14, OLIVE], [0.13, 0.38, -0.04, 0.13, OLIVE_D], [0.02, 0.46, -0.02, 0.13, OLIVE_L],
  [-0.02, 0.36, 0.12, 0.1, OLIVE_D], [0.08, 0.34, 0.1, 0.09, OLIVE]];
function oliveTree(b, x, y, z, k) {
  const root = [x, y, z], fork = [x + 0.04 * k, y + 0.2 * k, z - 0.02];
  const left = [x - 0.1 * k, y + 0.36 * k, z + 0.03], right = [x + 0.13 * k, y + 0.34 * k, z - 0.04];
  stick(b, 0.045 * k, BARK, root, fork, CYL6);
  stick(b, 0.03 * k, BARK, fork, left, CYL6);
  stick(b, 0.028 * k, BARK, fork, right, CYL6);
  for (const [dx, dy, dz, r, color] of OLIVE_CLUMPS) {
    b.rock(r * k, color, x + dx * k, y + dy * k - r * k * 0.35, z + dz * k, 1.25, 0.6, 1.25, dx * 9 + dz * 5);
  }
}
// Wheat on the ground terrace: rows of tufts with ears, ripening from green to gold; none on the stair.
function wheat() {
  const crops = new B();
  for (let row = 0; row < 5; row++) for (let col = 0; col < 11; col++) {
    const x = -0.78 + col * 0.156 + (hash(row, col) - 0.5) * 0.03, z = 0.17 + row * 0.155;
    if (x > 0.56 && z < 0.4) continue;
    const height = 0.2 + hash(col + 7, row) * 0.07, lean = (hash(row * 3, col + 1) - 0.5) * 0.3, ripe = (row + (col >> 2)) % 3;
    const sinLean = Math.sin(lean), cosLean = Math.cos(lean);
    const stem = [0x8fa040, 0xb8a848, 0xc9a84a][ripe], ear = [0xb8c060, 0xdcc060, 0xe2b84a][ripe];
    crops.add(CONE4, stem, x, 0.04 + height / 2, z, 0.045, height, 0.045, lean, 0, -lean);
    crops.add(CONE4, stem, x + 0.025, 0.04 + height * 0.3, z - 0.015, 0.035, height * 0.6, 0.035, -0.4, 0, -0.5);
    const earX = x + sinLean * height * 0.55, earY = 0.04 + height / 2 + cosLean * cosLean * height * 0.55;
    crops.add(CONE4, ear, earX, earY, z + sinLean * cosLean * height * 0.55, 0.026, 0.1, 0.026, lean, 0, -lean);
  }
  return crops.geometry();
}
// Farm: olive and grain terraces climbing to the back on dry-stone walls, with a stone stair up the right side; olive
// trees on the upper terraces with baskets of olives, a field hut with a tiled roof flying the team flag and oil
// amphorae sealed in team colour, and wheat on the bottom terrace. The wheat is extra.crops (animate() shows it once the
// farm is finished and shrinks it as the food runs out); it stays on the ground terrace, since shrinking scales it
// towards y = 0.
export function farm(ctx) {
  const { b, s, h, t, extra } = ctx, terraces = [[0.08, -0.38, 0.23], [-0.38, -h + 0.01, 0.43]];
  b.box(s, 0.03, s, EARTH).box(s - 0.08, 0.012, 0.74, SOIL, 0, 0.03, 0.47);
  terraceWalls(ctx, terraces);
  // The stair up the right-hand side.
  for (let i = 0; i < 3; i++) b.box(0.22, 0.07 * (i + 1) + 0.03, 0.09, CAPSTONE, 0.7, 0.0, 0.08 + 0.27 - i * 0.09);
  for (let i = 0; i < 3; i++) b.box(0.22, 0.23 + 0.067 * (i + 1) - 0.03, 0.08, CAPSTONE, 0.7, 0.0, -0.38 + 0.24 - i * 0.08);
  // Olive trees, a basket of olives under each tree on the middle terrace.
  for (const [x, z] of [[-0.55, -0.16], [0.08, -0.17]]) {
    oliveTree(b, x, 0.23, z, 1);
    b.cylT(0.06, 0.045, 0.06, P.wattle, x + 0.18, 0.245, z + 0.12, 6);
    b.add(BALL, OLIVE_BASKET, x + 0.18, 0.3, z + 0.12, 0.05, 0.02, 0.05);
  }
  oliveTree(b, -0.3, 0.43, -0.64, 1.05);
  oliveTree(b, 0.22, 0.43, -0.68, 1.0);
  // The field hut on the top terrace, the flag on its roof, oil amphorae beside it.
  const hutX = 0.66, hutZ = -0.66;
  b.box(0.3, 0.26, 0.3, PLASTER, hutX, 0.44, hutZ).box(0.12, 0.18, 0.02, C.dark, hutX - 0.04, 0.44, hutZ + 0.15);
  b.roof(0.4, 0.16, 0.38, TILE, hutX, 0.7, hutZ);
  flag(ctx, hutX + 0.1, 0.78, hutZ - 0.1, 0.42, C.woodD, [0.18, 0.32]);
  for (const [x, z] of [[0.38, -0.5], [0.46, -0.44]]) amphora(b, x, 0.445, z, 0.5, t);
  extra.crops = wheat();
  return 1.0;
}

// A Roman standard planted on y, into the mast: a pole topped with a gold eagle (aquila), silver discs (signum) or a
// team-coloured vexillum hung from a crossbar.
const standard = (ctx, x, y, z, kind) => {
  const { mast: m, t } = ctx, H = 1.25, top = y + H;
  m.cyl(0.018, H, C.woodD, x, y, z).cone(0.03, 0.08, C.iron, x, top, z, 4);
  if (kind === 'aquila') {
    m.box(0.12, 0.08, 0.1, C.gold, x, top - 0.04, z).add(BALL, C.gold, x, top + 0.08, z + 0.02, 0.05, 0.05, 0.05); // body, head
    for (const k of [-1, 1]) m.box(0.16, 0.05, 0.02, C.gold, x + k * 0.09, top + 0.06, z, 0, 0, k * 0.5); // the wings
    m.add(unit.tor, C.gold, x, top - 0.18, z, 0.07, 0.07, 0.07, 0, 0, Math.PI); // the wreath
  } else if (kind === 'signum') {
    for (let i = 0; i < 4; i++) m.add(unit.cyl, C.iron, x, top - 0.2 - i * 0.14, z + 0.025, 0.055, 0.015, 0.055, Math.PI / 2, 0, 0);
    m.box(0.16, 0.02, 0.02, C.gold, x, top - 0.08, z);
    m.box(0.03, 0.14, 0.012, t, x - 0.07, top - 0.22, z).box(0.03, 0.14, 0.012, t, x + 0.07, top - 0.22, z);
  } else {
    m.box(0.32, 0.025, 0.025, C.gold, x, top - 0.1, z).box(0.28, 0.32, 0.012, t, x, top - 0.42, z + 0.015);
    m.box(0.28, 0.03, 0.014, C.gold, x, top - 0.45, z + 0.015);
  }
};
// A leather contubernium tent: low walls under a ridge, its door flap on the +z gable (on +x with ry = PI / 2).
const tent = (b, x, z, w, d, hh, ry = 0, c = P.hide, flap = P.hideD, y = 0.06) => {
  const flapX = Math.sin(ry) * (d / 2 + 0.013), flapZ = Math.cos(ry) * (d / 2 + 0.013);
  b.box(w, 0.08, d, c, x, y, z, 0, ry).roof(w + 0.06, hh, d + 0.02, c, x, y + 0.08, z, ry);
  b.roof(w * 0.42, hh * 0.8 + 0.08, 0.01, flap, x + flapX, y, z + flapZ, ry);
};
// A run of palisade stakes along the rampart from p to q, standing on y: pointed, alternately shaded, a little uneven.
const palisade = (b, [x1, z1], [x2, z2], y, hh) => {
  const length = Math.hypot(x2 - x1, z2 - z1), count = Math.round(length / 0.1), turn = Math.atan2(x2 - x1, z2 - z1);
  for (let i = 0; i < count; i++) {
    const f = (i + 0.5) / count, x = x1 + (x2 - x1) * f, z = z1 + (z2 - z1) * f;
    const stake = hh - hash(i, count) * 0.06, color = i % 2 ? C.wood : STAKE_L;
    b.box(0.085, stake, 0.085, color, x, y, z, 0, turn);
    b.add(CONE4, color, x, y + stake + 0.05, z, 0.06, 0.1, 0.06, 0, turn + Math.PI / 4, 0); // its point
  }
};
// The camp's gate towers either side of the gate (gateHalf wide each side) at z = gateZ: four posts, a platform and a
// parapet hung with a team shield, a walkway over the gate, open gate leaves and the flag.
function campGate(ctx, gateHalf, gateZ) {
  const { b, t } = ctx;
  for (const k of [-1, 1]) {
    const towerX = k * (gateHalf + 0.16);
    for (const [dx, dz] of CORNERS) b.box(0.05, 0.98, 0.05, C.woodD, towerX + dx * 0.14, 0.06, gateZ + dz * 0.12);
    b.box(0.36, 0.04, 0.32, C.wood, towerX, 0.72, gateZ);
    for (const [dx, dz, w, d] of [[0, 0.15, 0.36, 0.03], [0, -0.15, 0.36, 0.03], [0.17, 0, 0.03, 0.3], [-0.17, 0, 0.03, 0.3]]) {
      b.box(w, 0.2, d, C.wood, towerX + dx, 0.76, gateZ + dz);
    }
    place(b, scutum(t), towerX, 0.7, gateZ + 0.155, 0, 0.9);
  }
  b.box(gateHalf * 2 + 0.08, 0.05, 0.22, C.woodD, 0, 0.7, gateZ).box(gateHalf * 2 + 0.08, 0.12, 0.03, C.wood, 0, 0.75, gateZ + 0.1);
  for (const k of [-1, 1]) b.box(0.03, 0.5, 0.24, C.woodD, k * (gateHalf - 0.08), 0.06, gateZ - 0.14, 0, -k * 0.5);
  flag(ctx, -(gateHalf + 0.16) - 0.12, 0.96, gateZ - 0.1, 0.55, C.woodD, [0.26, 0.46]);
}
// The commander's tent, linen with a team valance, and the standards before it on stone bases.
function commandersTent(ctx) {
  const { b, t } = ctx;
  b.box(0.86, 0.32, 0.6, P.plaster, 0, 0.06, -0.8).box(0.88, 0.07, 0.62, t, 0, 0.32, -0.8);
  b.roof(0.94, 0.36, 0.62, P.plaster, 0, 0.38, -0.8).roof(0.3, 0.3, 0.01, t, 0, 0.06, -0.49);
  for (const x of [-0.28, 0, 0.28]) b.box(0.08, 0.06, 0.08, ASHLAR, x, 0.06, -0.38); // the standards' bases
  standard(ctx, -0.28, 0.12, -0.38, 'signum');
  standard(ctx, 0, 0.12, -0.38, 'aquila');
  standard(ctx, 0.28, 0.12, -0.38, 'vexillum');
}
// A rack of pila and two shields at (x, z).
function pilaRack(ctx, x, z) {
  const { b, t } = ctx;
  for (const dx of [-0.2, 0.2]) b.box(0.04, 0.4, 0.04, C.woodD, x + dx, 0.06, z);
  b.box(0.44, 0.03, 0.04, C.wood, x, 0.42, z);
  for (let i = 0; i < 5; i++) {
    const pilumX = x - 0.16 + i * 0.08;
    stick(b, 0.01, C.wood, [pilumX, 0.06, z + 0.12], [pilumX - 0.02, 0.8, z - 0.02], CYL6);
    stick(b, 0.012, C.iron, [pilumX - 0.02, 0.8, z - 0.02], [pilumX - 0.022, 0.9, z - 0.04], CONE4);
  }
  place(b, scutum(t), x - 0.1, 0.07, z + 0.12, 0, 0.85);
  place(b, scutum(t), x + 0.14, 0.07, z + 0.13, -0.2, 0.85);
}
// Barracks: a Roman camp. An earth rampart topped by a palisade of stakes squares the camp, entered through a gate
// between two timber towers (team shields on their parapets, the flag on one); inside, the road from the gate to the
// commander's linen tent with its team valance, the legion's standards planted before it, rows of leather tents, a
// rack of pila and shields and a cooking fire.
export function barracks(ctx) {
  const { b, s, h } = ctx, edge = h - 0.15, gateHalf = 0.27, rampartTop = 0.18;
  b.box(s, 0.06, s, CAMP_GROUND);
  // The roads: from the gate to the commander's tent, and across the camp in front of it.
  b.box(0.42, 0.012, 1.72, SAND, 0, 0.06, 0.36).box(2.3, 0.012, 0.34, SAND, 0, 0.06, -0.3);
  // The rampart, and the palisade along it, broken at the gate.
  for (const k of [-1, 1]) b.box(0.28, 0.12, s - 0.04, EARTH, k * edge, 0.06, 0).box(s - 0.6, 0.12, 0.28, EARTH, 0, 0.06, k * edge);
  palisade(b, [-edge, -edge], [edge, -edge], rampartTop, 0.36);
  palisade(b, [-edge, -edge + 0.1], [-edge, edge], rampartTop, 0.36);
  palisade(b, [edge, -edge + 0.1], [edge, edge], rampartTop, 0.36);
  for (const k of [-1, 1]) palisade(b, [k * (edge - 0.1), edge], [k * (gateHalf + 0.32), edge], rampartTop, 0.36);
  campGate(ctx, gateHalf, edge - 0.05);
  commandersTent(ctx);
  // The tents: two blocks of four either side of the road, one more each side of the commander's tent.
  for (const k of [-1, 1]) {
    for (const [x, z] of [[0.46, 0.14], [0.86, 0.14], [0.46, 0.72], [0.86, 0.72]]) tent(b, k * x, z, 0.36, 0.48, 0.32);
    tent(b, k * 0.84, -0.82, 0.4, 0.5, 0.34);
  }
  pilaRack(ctx, -0.66, 1.0);
  // A cooking fire with its pot on a tripod among the right-hand tents.
  const fireX = 0.66, fireZ = 0.43;
  firePit(ctx, fireX, fireZ);
  b.cylT(0.06, 0.05, 0.07, C.iron, fireX, 0.2, fireZ, 8);
  for (const k of [-1, 1]) stick(b, 0.01, C.woodD, [fireX + k * 0.12, 0.06, fireZ], [fireX, 0.32, fireZ], CYL6);
  return 1.04;
}

// A marble target at (x, y, z) on a pedestal, painted with team and dark rings round a gold mark, arrowCount arrows in it.
function marbleTarget(ctx, x, y, z, arrowCount) {
  const { b, t } = ctx;
  b.box(0.3, 0.06, 0.22, MARBLE_D, x, 0.06, z).box(0.2, 0.34, 0.14, MARBLE, x, 0.12, z).box(0.26, 0.04, 0.18, MARBLE_D, x, 0.42, z);
  b.add(unit.cyl, MARBLE, x, y, z, 0.25, 0.07, 0.25, Math.PI / 2, 0, 0);
  b.add(unit.cyl, t, x, y, z + 0.036, 0.19, 0.01, 0.19, Math.PI / 2, 0, 0);
  b.add(unit.cyl, MARBLE, x, y, z + 0.04, 0.13, 0.01, 0.13, Math.PI / 2, 0, 0);
  b.add(unit.cyl, C.dark, x, y, z + 0.044, 0.075, 0.01, 0.075, Math.PI / 2, 0, 0);
  b.add(unit.cyl, C.gold, x, y, z + 0.048, 0.035, 0.01, 0.035, Math.PI / 2, 0, 0);
  arrowsIn(b, x, y, z, [[0.06, 0.04], [-0.1, -0.07], [0.03, -0.13]], arrowCount);
}
// The stoa from x0 to x1 and z0 to z1: a stylobate, two rows of marble columns (columnHeight tall), an architrave with
// a team frieze, a tiled lean-to roof and the flag; under it a bow rack and quivers.
function archersStoa(ctx, x0, x1, z0, z1, columnHeight) {
  const { b, t } = ctx, centreX = (x0 + x1) / 2, centreZ = (z0 + z1) / 2, ch = columnHeight;
  b.box(x1 - x0, 0.08, z1 - z0 + 0.06, ASHLAR_D, centreX, 0.06, centreZ);
  for (let i = 0; i < 4; i++) for (const z of [z0 + 0.06, z1 - 0.06]) column(b, x0 + 0.1 + i * (x1 - x0 - 0.2) / 3, 0.14, z, ch);
  for (const z of [z0 + 0.06, z1 - 0.06]) b.box(x1 - x0, 0.06, 0.12, MARBLE_D, centreX, 0.14 + ch, z);
  b.box(x1 - x0 + 0.01, 0.07, 0.125, t, centreX, 0.2 + ch, z1 - 0.06);
  for (const x of [x0 + 0.02, x1 - 0.02]) b.box(0.04, 0.07, z1 - z0, MARBLE_D, x, 0.2 + ch, centreZ);
  place(b, leanTo(x1 - x0 + 0.06, z1 - z0 + 0.06, 0.16), centreX, 0.27 + ch, centreZ);
  flag(ctx, x1 - 0.06, 0.27 + ch + 0.08, z0 + 0.04, 0.55);
  stick(b, 0.018, C.woodD, [x0 + 0.25, 0.55, centreZ], [x0 + 1.05, 0.55, centreZ], CYL6);
  for (const dx of [0.35, 0.6, 0.85]) b.add(unit.tor, C.woodD, x0 + dx, 0.4, centreZ, 0.16, 0.16, 0.16, 0, 0, Math.PI / 2);
  for (const dx of [1.3, 1.5]) {
    b.cylT(0.055, 0.045, 0.22, C.leather, x0 + dx, 0.14, centreZ + 0.05, 6);
    for (const k of [-0.02, 0.02]) b.box(0.006, 0.1, 0.006, LINEN, x0 + dx + k, 0.36, centreZ + 0.05);
  }
}
// Archery Range: a stone archery yard. Sand lanes between marble kerbs run to three marble targets painted with team
// rings on marble pedestals, before an ashlar butt wall with marble pilasters and coping; the archers shoot from a
// stoa of marble columns under a tiled lean-to roof, with a bow rack, quivers and the team flag.
export function archery_range(ctx) {
  const { b, s, h, t } = ctx, buttZ = -h + 0.14, columnHeight = 0.82;
  b.box(s, 0.06, s, PAVING).box(2.4, 0.012, 1.86, SAND, 0, 0.06, -0.24);
  // The butt wall: ashlar courses, a marble coping, pilasters on its face.
  for (let i = 0; i < 3; i++) b.box(s - 0.02 - (i % 2) * 0.012, 0.3, 0.26, i % 2 ? ASHLAR_DD : ASHLAR_D, 0, 0.06 + i * 0.3, buttZ);
  b.box(s, 0.06, 0.3, MARBLE, 0, 0.96, buttZ);
  for (const x of [-1.2, -0.42, 0.42, 1.2]) b.box(0.12, 0.9, 0.04, MARBLE_D, x, 0.06, buttZ + 0.14);
  // Low side walls along the yard.
  for (const k of [-1, 1]) {
    b.box(0.18, 0.36, 1.86, ASHLAR_D, k * (h - 0.1), 0.06, -0.24).box(0.2, 0.04, 1.88, MARBLE_D, k * (h - 0.1), 0.42, -0.24);
  }
  // Lane kerbs, distance stones and the shooting line.
  for (const x of [-0.43, 0.43]) b.box(0.05, 0.04, 1.7, MARBLE_D, x, 0.06, -0.3);
  for (const x of [-0.43, 0.43]) for (const z of [-0.3, 0.3]) b.box(0.08, 0.14, 0.08, MARBLE, x, 0.06, z);
  b.box(2.36, 0.03, 0.06, MARBLE, 0, 0.06, 0.66);
  for (const [i, x] of [-0.86, 0, 0.86].entries()) marbleTarget(ctx, x, 0.64, -0.92, 2 + (i % 2));
  archersStoa(ctx, -h + 0.04, 0.6, 0.8, h - 0.08, columnHeight);
  // At the front right: an arrow chest and a spare target.
  b.box(0.36, 0.2, 0.24, C.wood, 1.0, 0.06, 1.0).box(0.38, 0.03, 0.26, C.bronze, 1.0, 0.18, 1.0);
  b.add(unit.cyl, MARBLE, 1.05, 0.3, 0.62, 0.22, 0.06, 0.22, Math.PI / 2 - 0.35, 0, 0);
  b.add(unit.cyl, t, 1.05, 0.31, 0.65, 0.16, 0.01, 0.16, Math.PI / 2 - 0.35, 0, 0);
  return 0.27 + columnHeight + 0.23;
}

// The stalls along the stable's front (z = front): arches between pilasters, half-doors, two horses looking out.
function stableStalls(b, front, width, wallHeight) {
  const xs = [-1.04, -0.52, 0, 0.52, 1.04];
  for (const x of xs) archway(b, x, 0.06, front + 0.002, 0.36, 0.5);
  for (const x of [-1.3, -0.78, -0.26, 0.26, 0.78, 1.3]) {
    b.box(0.1, wallHeight, 0.05, MARBLE_D, Math.max(-width / 2 + 0.05, Math.min(width / 2 - 0.05, x)), 0.06, front + 0.02);
  }
  for (const [i, x] of xs.entries()) {
    b.box(0.34, 0.3, 0.03, i % 2 ? C.woodD : C.wood, x, 0.06, front + 0.03).box(0.36, 0.03, 0.04, C.woodD, x, 0.36, front + 0.03);
  }
  for (const x of [-0.52, 0.52]) { // a horse's neck, head and blaze
    b.box(0.1, 0.18, 0.16, HORSE_HEAD, x, 0.38, front + 0.06, -0.5).box(0.08, 0.08, 0.18, HORSE_HEAD, x, 0.5, front + 0.14, 0.3);
    b.box(0.03, 0.05, 0.02, LINEN, x, 0.53, front + 0.23);
  }
}
// The yard before the stable: a low wall at the front with a gateway between marble-capped piers, a marble trough
// along the right, a hay rick at the left and a hitching rail with team blankets over it.
function stableYard(ctx, wallZ) {
  const { b, t } = ctx;
  for (const k of [-1, 1]) {
    b.box(1.0, 0.3, 0.12, ASHLAR, k * 0.86, 0.06, wallZ).box(1.02, 0.04, 0.14, MARBLE_D, k * 0.86, 0.36, wallZ);
    b.box(0.16, 0.44, 0.16, ASHLAR_D, k * 0.34, 0.06, wallZ).add(BALL, MARBLE, k * 0.34, 0.56, wallZ, 0.07, 0.07, 0.07);
  }
  b.box(0.24, 0.2, 0.86, MARBLE_D, 1.08, 0.06, 0.3).box(0.18, 0.02, 0.8, WATER, 1.08, 0.24, 0.3);
  b.cylT(0.22, 0.25, 0.3, C.hay, -1.0, 0.06, 0.08, 10).cone(0.25, 0.24, C.thatch, -1.0, 0.36, 0.08, 10);
  b.cylT(0.2, 0.2, 0.04, C.thatchD, -1.0, 0.24, 0.08, 10);
  for (const x of [-0.95, -0.35]) b.box(0.05, 0.42, 0.05, C.woodD, x, 0.06, 0.62);
  stick(b, 0.02, C.wood, [-1.0, 0.44, 0.62], [-0.3, 0.44, 0.62], CYL6);
  for (const x of [-0.8, -0.5]) { // a blanket hanging down both sides of the rail
    b.box(0.2, 0.2, 0.012, t, x, 0.26, 0.64).box(0.2, 0.02, 0.05, t, x, 0.45, 0.62).box(0.2, 0.2, 0.012, t, x, 0.26, 0.6);
  }
}
// Stable: a stone stable block with an arcade of five arched stalls between marble pilasters, horses looking out over
// the half-doors, under a tiled roof with marble pediments, team tympana and the flag; a paved yard before it with a
// marble trough, a hay rick, a hitching rail hung with team blankets and two horses in team saddle cloths, behind a low
// wall.
export function stable(ctx) {
  const { b, s, h, t } = ctx, backZ = -h + 0.1, front = -0.45, wallHeight = 0.92;
  const depth = front - backZ, centreZ = (backZ + front) / 2, width = s - 0.2;
  b.box(s, 0.06, s, PAVING);
  // The stable block in ashlar courses, a cornice with a team frieze.
  for (let i = 0; i < 3; i++) {
    const inset = (i % 2) * 0.012;
    b.box(width - inset, wallHeight / 3, depth - inset, i % 2 ? ASHLAR_D : ASHLAR, 0, 0.06 + i * wallHeight / 3, centreZ);
  }
  b.box(width + 0.04, 0.05, depth + 0.04, MARBLE_D, 0, 0.06 + wallHeight, centreZ);
  b.box(width + 0.05, 0.07, depth + 0.05, t, 0, 0.11 + wallHeight, centreZ);
  b.box(width + 0.08, 0.04, depth + 0.08, MARBLE, 0, 0.18 + wallHeight, centreZ);
  stableStalls(b, front, width, wallHeight);
  gable(b, t, depth + 0.14, 0.48, width + 0.06 - 0.09, 0, 0.22 + wallHeight, centreZ, true);
  flag(ctx, -width / 2 + 0.2, 0.22 + wallHeight + 0.45, centreZ, 0.55);
  stableYard(ctx, h - 0.08);
  place(b, horse(t), 0.3, 0.06, 0.25, 0.4);
  place(b, horse(t, true), 0.62, 0.06, 0.82, -Math.PI / 2 + 0.5);
  return 0.22 + wallHeight + 0.55;
}

// The agora's back stoa (along z = backZ, its columns at z = colonnadeZ): the shop wall with team awnings over the shop
// doors, columns along the square, the architrave and roof.
function backStoa(ctx, edge, wallHeight, columnHeight) {
  const { b, t } = ctx, backZ = -edge + 0.14, colonnadeZ = -0.72, ch = columnHeight;
  b.box(2 * edge, wallHeight, 0.28, PLASTER, 0, 0.06, backZ).box(2 * edge, 0.06, 0.3, ASHLAR_D, 0, 0.06 + wallHeight, backZ);
  b.box(2 * edge, 0.06, colonnadeZ - backZ + 0.1, ASHLAR_D, 0, 0.06, (backZ + colonnadeZ) / 2 + 0.03);
  for (const x of [-0.35, 0.3, 0.95]) { // a shop door and its awning
    b.box(0.3, 0.5, 0.02, C.dark, x, 0.12, backZ + 0.145).box(0.36, 0.02, 0.16, t, x, 0.66, backZ + 0.22, 0.35);
  }
  for (let i = 0; i < 6; i++) column(b, -0.44 + i * 0.34, 0.12, colonnadeZ + 0.04, ch);
  b.box(2 * edge - 0.62, 0.07, 0.12, MARBLE_D, 0.31, 0.12 + ch, colonnadeZ + 0.04);
  const roofBack = -edge + 0.05, roofFront = colonnadeZ + 0.1;
  place(b, leanTo(2 * edge - 0.62, roofFront - roofBack - 0.08, 0.16), 0.31, 0.19 + ch, (roofBack + roofFront) / 2);
}
// The left stoa, the same along x = -edge.
function leftStoa(ctx, edge, wallHeight, columnHeight) {
  const { b, t } = ctx, backX = -edge + 0.14, colonnadeX = -0.72, ch = columnHeight;
  b.box(0.28, wallHeight, 2 * edge, PLASTER, backX, 0.06, 0).box(0.3, 0.06, 2 * edge, ASHLAR_D, backX, 0.06 + wallHeight, 0);
  b.box(colonnadeX - backX + 0.1, 0.06, 2 * edge - 0.62, ASHLAR_D, (backX + colonnadeX) / 2 + 0.03, 0.06, 0.31);
  for (const z of [0.0, 0.65]) { // a shop door and its awning
    b.box(0.02, 0.5, 0.3, C.dark, backX + 0.145, 0.12, z).box(0.16, 0.02, 0.36, t, backX + 0.22, 0.66, z, 0, 0, -0.35);
  }
  for (let i = 0; i < 4; i++) column(b, colonnadeX + 0.04, 0.12, -0.36 + i * 0.5, ch);
  b.box(0.12, 0.07, 2 * edge - 0.62, MARBLE_D, colonnadeX + 0.04, 0.12 + ch, 0.31);
  const roofBack = -edge + 0.05, roofFront = colonnadeX + 0.1;
  place(b, leanTo(2 * edge - 0.62, roofFront - roofBack - 0.08, 0.16), (roofBack + roofFront) / 2, 0.19 + ch, 0.31, Math.PI / 2);
}
// The tholos at (x, z): a stepped round base, six columns, an entablature with a team band, a conical tiled roof, a
// fountain.
function tholos(ctx, x, z) {
  const { b, t } = ctx, radius = 0.32;
  b.cylT(0.44, 0.47, 0.05, ASHLAR_D, x, 0.06, z, 12).cylT(0.4, 0.42, 0.05, ASHLAR, x, 0.11, z, 12);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3 + Math.PI / 6;
    column(b, x + Math.cos(angle) * radius, 0.16, z + Math.sin(angle) * radius, 0.66, 0.055);
  }
  b.cylT(0.39, 0.39, 0.06, MARBLE_D, x, 0.82, z, 12); // the architrave
  b.cylT(0.395, 0.395, 0.06, t, x, 0.88, z, 12).cylT(0.42, 0.42, 0.03, MARBLE, x, 0.94, z, 12); // the team band, the cornice
  b.cone(0.46, 0.34, TILE, x, 0.97, z, 12).cylT(0.03, 0.05, 0.06, TILE_D, x, 1.29, z, 6); // the roof and its finial
  b.cylT(0.2, 0.22, 0.12, MARBLE_D, x, 0.16, z, 10).cylT(0.17, 0.17, 0.01, WATER, x, 0.28, z, 10); // the fountain's basin
  b.cylT(0.04, 0.05, 0.2, MARBLE, x, 0.16, z, 6); // and its spout
}
// A trader's table at (x, z) turned `turn` under a team awning; goods(x, z) lays out its wares.
function traderStall(ctx, x, z, turn, goods) {
  const { b, t } = ctx, cos = Math.cos(turn), sin = Math.sin(turn);
  for (const [dx, dz] of [[-0.24, -0.12], [0.24, -0.12], [-0.24, 0.12], [0.24, 0.12]]) {
    b.box(0.03, 0.26, 0.03, C.woodD, x + dx * cos + dz * sin, 0.06, z - dx * sin + dz * cos);
  }
  b.box(0.56, 0.03, 0.3, C.wood, x, 0.32, z, 0, turn);
  for (const [dx, dz] of [[-0.26, -0.16], [0.26, -0.16]]) {
    b.cylT(0.012, 0.012, 0.66, C.woodD, x + dx * cos + dz * sin, 0.06, z - dx * sin + dz * cos, 5);
  }
  b.box(0.6, 0.02, 0.36, t, x + 0.04 * sin, 0.7, z + 0.04 * cos, 0.25, turn);
  goods(x, z);
}
// Market: an agora. Stoas of marble columns under tiled lean-to roofs line the back and left, sheltering a row of
// shops with team-coloured awnings over their doors; in the square a market tholos (a ring of columns under a conical
// tiled roof, team band, fountain inside), traders' tables of amphorae, fruit and cloth under team awnings, and a
// marble measuring table.
export function market(ctx) {
  const { b, s, h } = ctx, edge = h - 0.02, wallHeight = 0.86, columnHeight = 0.82;
  b.box(s, 0.06, s, PAVING).box(1.9, 0.012, 1.9, AGORA, 0.32, 0.06, 0.32);
  backStoa(ctx, edge, wallHeight, columnHeight);
  leftStoa(ctx, edge, wallHeight, columnHeight);
  // The corner where the stoas meet.
  b.box(0.7, 0.07, 0.7, MARBLE_D, -edge + 0.35, 0.12 + columnHeight, -edge + 0.35);
  b.box(0.72, 0.18, 0.72, TILE, -edge + 0.36, 0.19 + columnHeight, -edge + 0.36);
  tholos(ctx, 0.42, 0.4);
  // Traders' tables under team awnings: amphorae, fruit, bolts of cloth.
  traderStall(ctx, -0.34, 0.78, 0, (x, z) => {
    for (const dx of [-0.16, 0, 0.16]) amphora(b, x + dx, 0.35, z, 0.42);
  });
  traderStall(ctx, 0.98, -0.3, -Math.PI / 2, (x, z) => {
    for (const [i, c] of [OCHRE, C.red, 0x6f8f3a, OCHRE].entries()) b.add(BALL, c, x, 0.4, z - 0.18 + i * 0.12, 0.06, 0.05, 0.06);
  });
  for (const [i, c] of [MADDER, OCHRE, GREEN_CLOTH].entries()) {
    b.add(CYL6, c, -0.05 + i * 0.11, 0.1, 1.15, 0.045, 0.24, 0.045, Math.PI / 2, 0, 0);
  }
  // The measuring table: a marble block with round measures cut in it.
  b.box(0.42, 0.24, 0.2, MARBLE, -0.2, 0.06, -0.3);
  for (const [dx, r] of [[-0.12, 0.05], [0.02, 0.04], [0.13, 0.03]]) b.cylT(r, r, 0.01, C.dark, -0.2 + dx, 0.3, -0.3, 8);
  return 1.36;
}

// ---------- Iron defences ----------
// A ballista built at the origin for place(), shooting along +z from its trestle: the stock and slider, the torsion
// frame with its two sinew skeins (team-painted front plate, bronze washers), the arms swept back, the bowstring drawn
// to the trigger and a bolt laid in the groove. Returns its B.
const ballista = t => {
  const g = new B(), y = 0.3, frameZ = 0.22;
  for (const [x, z] of [[-0.14, -0.16], [0.14, -0.16], [-0.12, 0.12], [0.12, 0.12]]) {
    stick(g, 0.018, C.woodD, [x, 0, z], [x * 0.3, y - 0.04, z * 0.4], CYL6); // the trestle's legs
  }
  g.cylT(0.05, 0.06, 0.05, C.woodD, 0, y - 0.07, 0, 6);
  g.box(0.08, 0.05, 0.72, C.wood, 0, y - 0.025, -0.06, 0.06); // the stock
  g.box(0.03, 0.012, 0.66, C.woodD, 0, y + 0.02, -0.06, 0.06); // the slider
  g.box(0.44, 0.2, 0.08, C.woodD, 0, y - 0.06, frameZ).box(0.2, 0.12, 0.012, t, 0, y - 0.02, frameZ + 0.046);
  for (const k of [-1, 1]) {
    const skeinX = k * 0.16;
    g.add(CYL6, P.hideD, skeinX, y + 0.04, frameZ, 0.04, 0.3, 0.04);
    for (const dy of [0.2, -0.12]) g.add(CYL6, C.bronze, skeinX, y + dy, frameZ, 0.055, 0.03, 0.055); // the washers
    stick(g, 0.016, C.wood, [skeinX, y + 0.04, frameZ], [k * 0.42, y + 0.04, frameZ - 0.16], CYL6); // an arm
    stick(g, 0.004, P.bone, [k * 0.42, y + 0.04, frameZ - 0.16], [0, y + 0.05, -0.3], CYL6); // the bowstring
  }
  stick(g, 0.012, C.wood, [0, y + 0.06, -0.3], [0, y + 0.06, 0.4], CYL6); // the bolt
  stick(g, 0.02, C.iron, [0, y + 0.06, 0.4], [0, y + 0.06, 0.48], CONE4);
  return g;
};
// The tower's square battlements on its roof (at roofY), `span` across: merlons all round, and the breastwork between.
function battlements(b, roofY, span) {
  for (let i = 0; i < 5; i++) {
    const u = -span / 2 + 0.09 + i * (span - 0.18) / 4;
    const merlons = [[u, span / 2 - 0.06, 0.18, 0.12], [u, -span / 2 + 0.06, 0.18, 0.12], [span / 2 - 0.06, u, 0.12, 0.18],
      [-span / 2 + 0.06, u, 0.12, 0.18]];
    for (const [x, z, w, d] of merlons) {
      b.box(w, 0.26, d, ASHLAR, x, roofY, z).box(w + 0.02, 0.03, d + 0.02, MARBLE_D, x, roofY + 0.26, z);
    }
  }
  b.box(span, 0.1, 0.1, ASHLAR_D, 0, roofY, span / 2 - 0.06).box(span, 0.1, 0.1, ASHLAR_D, 0, roofY, -span / 2 + 0.06);
  b.box(0.1, 0.1, span, ASHLAR_D, span / 2 - 0.06, roofY, 0).box(0.1, 0.1, span, ASHLAR_D, -span / 2 + 0.06, roofY, 0);
}
// The tower's gate and the windows on its camera faces (the +x ones framed in marble), its walls `face` from the centre.
function towerOpenings(b, foot, course, face) {
  const windowY = foot + 3 * course + 0.06;
  archway(b, 0, foot, face + 0.002, 0.36, 0.34);
  for (const x of [-0.34, 0.34]) archway(b, x, windowY, face + 0.002, 0.14, 0.16);
  for (const z of [-0.34, 0.34]) {
    b.box(0.02, 0.22, 0.14, C.dark, face + 0.001, windowY, z); // a window
    b.box(0.03, 0.04, 0.2, MARBLE_D, face + 0.005, foot + 3 * course + 0.28, z); // its marble lintel
  }
  b.box(0.02, 0.4, 0.3, C.dark, face + 0.001, foot + 0.02, 0.25); // the side door
  b.box(0.03, 0.05, 0.36, MARBLE_D, face + 0.005, foot + 0.42, 0.25);
}
// Tower: a stone tower with a ballista. A square Roman tower of ashlar courses on a podium, a marble string course
// halfway up, a team frieze under a marble cornice and a battlemented top with team shields on the merlons; an arched
// gate at its foot and arched windows above. On the roof a ballista on its trestle covers the approach, with a rack of
// bolts and the flag. Its shot is the bolt loosed from the ballista (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, width = 1.3, foot = 0.2, course = 0.36, courses = 5, top = foot + courses * course;
  b.box(1.76, 0.06, 1.76, PAVING).box(1.56, 0.14, 1.56, ASHLAR_D, 0, 0.06, 0);
  for (let i = 0; i < courses; i++) {
    const w = width - (i % 2) * 0.014;
    b.box(w, course, w, i % 2 ? ASHLAR : ASHLAR_D, 0, foot + i * course, 0);
  }
  b.box(width + 0.05, 0.05, width + 0.05, MARBLE_D, 0, foot + 2 * course, 0); // the string course
  b.box(width + 0.03, 0.09, width + 0.03, t, 0, top - 0.11, 0).box(width + 0.1, 0.06, width + 0.1, MARBLE, 0, top - 0.02, 0);
  towerOpenings(b, foot, course, width / 2);
  // The roof: paving inside the battlements, merlons all round, team shields on the camera faces.
  const roofY = top + 0.04, span = width + 0.06;
  b.box(width - 0.06, 0.03, width - 0.06, PAVING, 0, roofY, 0);
  battlements(b, roofY, span);
  for (const x of [-0.31, 0.31]) place(b, scutum(t), x, roofY + 0.06, span / 2 + 0.002);
  place(b, scutum(t), span / 2 + 0.002, roofY + 0.06, -0.31, Math.PI / 2);
  // The ballista and a rack of spare bolts.
  place(b, ballista(t), 0, roofY + 0.03, 0.06);
  for (let i = 0; i < 4; i++) {
    stick(b, 0.012, C.wood, [-0.42 + i * 0.05, roofY + 0.03, -0.45], [-0.4 + i * 0.05, roofY + 0.48, -0.5], CYL6);
  }
  b.box(0.3, 0.04, 0.06, C.woodD, -0.34, roofY + 0.3, -0.48);
  flag(ctx, 0.48, roofY + 0.03, -0.48, 0.95);
  // The bolt in flight, just loosed from the slider.
  const fire = new B();
  streak(fire, [0, 0, 0], [0, -0.06, 0.9], 0.032, undefined, P.ember, 0.075);
  stick(fire, 0.05, P.ember, [0, -0.06, 0.88], [0, -0.065, 1.0], CONE4);
  extra.fire = { geo: fire.geometry(), at: [0, roofY + 0.39, 0.6] };
  return roofY + 0.55;
}

// Wall: an ashlar wall. Courses of dressed stone (each alternate course set back a hair, so the joints read) on a dark
// plinth, a team-painted frieze under a marble cornice and a paved walk behind a low breastwork with corner piers; it
// fills its tile edge to edge, so segments in a line close up into one wall.
export function wall(ctx) {
  const { b, t } = ctx, plinth = 0.1, course = 0.2;
  b.box(1, plinth, 1, ASHLAR_D);
  for (let i = 0; i < 3; i++) {
    const w = 1 - (i % 2) * 0.014;
    b.box(w, course, w, i % 2 ? WALLSTONE : ASHLAR, 0, plinth + i * course, 0);
  }
  const frieze = plinth + 3 * course;
  b.box(1, 0.07, 1, t, 0, frieze, 0).box(1, 0.05, 1, MARBLE, 0, frieze + 0.07, 0);
  const walk = frieze + 0.12;
  b.box(0.84, 0.02, 0.84, PAVING, 0, walk, 0);
  for (const [x, z, w, d] of [[0, 0.45, 0.82, 0.1], [0, -0.45, 0.82, 0.1], [0.45, 0, 0.1, 0.82], [-0.45, 0, 0.1, 0.82]]) {
    b.box(w, 0.14, d, ASHLAR, x, walk, z); // the breastwork
  }
  for (const [x, z] of CORNERS) { // the corner piers and their caps
    b.box(0.16, 0.22, 0.16, ASHLAR_D, x * 0.41, walk, z * 0.41).box(0.18, 0.03, 0.18, MARBLE_D, x * 0.41, walk + 0.22, z * 0.41);
  }
  return walk + 0.25;
}
