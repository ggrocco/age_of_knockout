// Industrial Age: brick and iron, turning gears, smokestacks, a water tower, pipes. Red brick on blue-brick plinths with
// buff stone dressings, crested slate roofs, cast-iron windows, columns and lattice, glass on iron ribs, railways and
// steam, beside today's kept Factory (legacy.js). Brick works and row houses, brick grain silos with their elevator, a
// goods depot with a steam gantry crane, ploughed rows with a traction engine, a castellated armoury with a searchlight,
// a rifle range of sandbagged lanes, a horse depot on a siding, a glass-vaulted shopping arcade, a clock-tower parliament,
// an iron lattice tower and an armoured fort with gun turrets; for defence, a machine-gun nest on a brick tower and a
// breastwork of sandbags and barbed wire.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import {
  P, flag, gear, puff, stick, lerp, hash, place, horse, streak, muzzleFlash, CYL6, CYL8, DISC, BALL, CONE4, FRUSTUM, ARCH,
  ARCH_RING, WEDGE, HORSE_HEAD, sack, barrel,
} from './kit.js';

// ---------- the Industrial palette ----------
// The House's and Town Center's brick, slate and iron; buff sandstone for the dressings, blue engineering brick for the
// plinths, black-painted ironwork, glass for the roofs, railway sleepers and rails.
const BRICK = P.brick, BRICK_D = P.brickD, BLUE = 0x4a4c55, BUFF = 0xc8b48a, BUFF_D = 0xa8956c;
const SLATE = 0x5d6468, SLATE_D = 0x474d51, IRON = P.iron, IRON_D = 0x33373b, CORR = 0x8a9196, CORR_D = 0x737a80;
const GLASS = 0x34495a, SHOP = 0x7d9db0, ROOF_GLASS = 0x8fb6c9, ROOF_GLASS_D = 0x79a2b8, LIT = 0xffd27a, PAINT = 0x2a2f2c;
const GREEN = 0x2f4a3a;
const CINDER = 0x5a5650, YARD = 0x6e6a60, SETT = 0x77746c, SETT_D = 0x66635c, PAVE = 0x9d968a, GRAVEL = 0x9a917f;
const RAIL = 0x2f3236, SLEEPER = 0x4e3a28, SAND = 0xb8a172, SAND_D = 0x9c8658, STONE_L = 0xb4b1a6;
const SOIL = 0x5b4532, SOIL_D = 0x45352a, STUBBLE = 0x9c8a5a, GRASS = 0x5f7f3a, GRASS_L = 0x6f8f44, GRASS_D = 0x4f6d32;
const HEDGE = 0x3f5f2c;
const TURNIP = 0x4f7f2e, TURNIP_L = 0x6a9a3a, GRANITE = 0x8a8a84, GRANITE_D = 0x6c6c66, TOWER = 0x5e4a3a, TOWER_L = 0x735c48;
const CLOCK = P.white, LENS = 0xfff3c2, POT = 0x8a4a30, GUN = 0x26292c;
// A hemisphere, flat side down at y = 0; a low-poly turnip; a cheap half-ring rib for the arcade's vault and the tower's
// arches.
const DOME = new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2), TURNIP_GEO = new THREE.IcosahedronGeometry(1, 0);
const RIB = new THREE.TorusGeometry(1, 0.03, 3, 10, Math.PI), BIG_ARCH = new THREE.TorusGeometry(1, 0.05, 3, 14, Math.PI);

// ---------- House and Town Center ----------
// The House's iron fire escape down its -x end, a rooftop water tank, a gas street lamp and the team door.
const houseIronwork = (b, td, width, depth) => {
  for (let i = 0; i < 2; i++) {
    b.box(0.4, 0.03, 0.22, P.iron, -width / 2 - 0.12, 0.45 + i * 0.45, 0.1); // landing
    b.box(0.03, 0.45, 0.22, P.iron, -width / 2 - 0.3, 0.45 + i * 0.45, 0.1); // its rail
  }
  for (const [x, z] of [[-0.25, -0.25], [-0.05, -0.25], [-0.25, -0.05], [-0.05, -0.05]]) {
    b.box(0.03, 0.35, 0.03, P.iron, x, 1.55, z); // the water tank's legs
  }
  b.cyl(0.17, 0.3, C.wood, -0.15, 1.9, -0.15);
  b.cone(0.19, 0.12, P.iron, -0.15, 2.2, -0.15, 8);
  b.cyl(0.025, 0.7, P.iron, 0.55, 0, depth / 2 + 0.3);
  b.box(0.1, 0.12, 0.1, P.ember, 0.55, 0.7, depth / 2 + 0.3);
  b.box(0.24, 0.42, 0.05, td, -0.25, 0, depth / 2 + 0.03);
};

export function house(ctx) {
  const { b, extra, s, td } = ctx, width = s - 0.25, depth = s - 0.35;
  // The brick row house under its slate roof, two rows of three windows with stone lintels.
  b.box(width, 1.2, depth, P.brick);
  b.roof(width + 0.1, 0.5, depth + 0.1, SLATE, 0, 1.2, 0);
  for (let row = 0; row < 2; row++) for (const x of [-0.4, 0, 0.4]) {
    b.box(0.16, 0.26, 0.04, 0x2f3437, x, 0.25 + row * 0.5, depth / 2 + 0.01);
    b.box(0.2, 0.05, 0.05, C.stone, x, 0.51 + row * 0.5, depth / 2 + 0.01);
  }
  // The chimney stack and its two pots.
  b.box(0.22, 0.85, 0.22, P.brickD, width / 2 - 0.2, 1.2, -0.2);
  b.cyl(0.05, 0.12, C.stone, width / 2 - 0.25, 2.05, -0.2);
  b.cyl(0.05, 0.12, C.stone, width / 2 - 0.15, 2.05, -0.2);
  houseIronwork(b, td, width, depth);
  extra.smoke = [0, 0.5].map(phase => ({ geo: puff(), at: [width / 2 - 0.2, 2.15, -0.2], phase }));
  return 2.32;
}

// The brick works' glazed sawtooth roof: three slate slopes, each with a glass face.
const sawtoothRoof = (b, width, depth, centerZ) => {
  const run = depth / 3, rise = 0.42, slope = Math.hypot(run, rise), tilt = Math.atan2(rise, run);
  for (let i = 0; i < 3; i++) {
    const bayZ = centerZ - depth / 2 + i * run;
    b.box(width, 0.05, slope, SLATE, 0, 1.2 + rise / 2 - 0.025, bayZ + run / 2, -tilt);
    b.box(width - 0.04, rise, 0.04, P.glass, 0, 1.2, bayZ + run - 0.02);
  }
};
// The brick works' two iron-banded smokestacks at the back, and the pipes along the front.
const worksStacks = (b, width, stackZ, frontZ) => {
  for (const x of [-width / 2 + 0.3, width / 2 - 0.3]) {
    b.cyl(0.15, 2.5, P.brickD, x, 0.1, stackZ);
    b.cyl(0.18, 0.08, P.iron, x, 2.6, stackZ);
    b.cyl(0.17, 0.06, P.iron, x, 1.7, stackZ);
  }
  b.add(unit.cyl, P.iron, 0, 0.32, frontZ + 0.12, 0.05, width * 0.9, 0.05, 0, 0, Math.PI / 2);
  b.add(unit.cyl, P.iron, width / 2 - 0.15, 0.7, frontZ + 0.12, 0.05, 0.9, 0.05);
};
// The water tower on iron legs in front of the works.
const waterTower = (b, frontZ) => {
  const x = 0.95, z = frontZ + 0.55;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.04, 1.0, 0.04, P.iron, x + sx * 0.2, 0, z + sz * 0.2);
  b.cyl(0.32, 0.45, 0x6b5a46, x, 1.0, z); // the tank
  b.cone(0.35, 0.22, P.iron, x, 1.45, z, 10); // its roof
  b.box(0.5, 0.03, 0.5, P.iron, x, 0.98, z); // its platform
};

export function town_center(ctx) {
  const { b, extra, s, t, td } = ctx, width = s - 0.2, depth = s * 0.6, centerZ = -0.25, frontZ = centerZ + depth / 2;
  // The cinder yard and the brick works with its team band.
  b.box(s + 0.12, 0.1, s + 0.12, CINDER);
  b.box(width, 1.1, depth, P.brick, 0, 0.1, centerZ);
  b.box(width + 0.04, 0.08, depth + 0.04, t, 0, 0.95, centerZ);
  sawtoothRoof(b, width, depth, centerZ);
  const stackZ = centerZ - depth / 2 + 0.2;
  worksStacks(b, width, stackZ, frontZ);
  waterTower(b, frontZ);
  // Clock over the team-coloured door: the dial and its two hands.
  b.add(unit.cyl, P.white, 0.25, 0.85, frontZ + 0.03, 0.17, 0.03, 0.17, Math.PI / 2, 0, 0);
  b.box(0.02, 0.12, 0.02, C.dark, 0.25, 0.84, frontZ + 0.05);
  b.box(0.09, 0.02, 0.02, C.dark, 0.28, 0.86, frontZ + 0.05);
  b.box(0.5, 0.6, 0.05, td, 0.25, 0.1, frontZ + 0.02);
  extra.spinners = [
    { geo: gear(0.34, P.iron), at: [-0.55, 0.62, frontZ + 0.05], axis: 'z', speed: 1.4 },
    { geo: gear(0.2, P.brass), at: [-0.07, 0.38, frontZ + 0.05], axis: 'z', speed: -2.4 },
  ];
  extra.smoke = [0, 0.33, 0.66].map(phase => ({ geo: puff(), at: [-width / 2 + 0.3, 2.7, stackZ], phase }))
    .concat([0.15, 0.5, 0.85].map(phase => ({ geo: puff(), at: [width / 2 - 0.3, 2.7, stackZ], phase })));
  flag(ctx, -0.3, 1.62, centerZ, 0.7, P.iron);
  return 2.68;
}

// ---------- shared Industrial parts ----------
// A point on a wall face centred at (x, z) facing along ry (0: +z): `along` the face, `out` from it.
const onFace = (x, z, ry) => (along, out = 0) => [
  x + along * Math.cos(ry) + out * Math.sin(ry),
  z - along * Math.sin(ry) + out * Math.cos(ry),
];
// A cast-iron window width × height on a wall face (x, z) facing ry, its sill at y: dark panes and an iron mullion
// under a segmental arch of dark brick.
const ironWindow = (b, x, y, z, ry = 0, width = 0.12, height = 0.2) => {
  const [mullionX, mullionZ] = onFace(x, z, ry)(0, 0.008);
  b.box(width, height, 0.02, GLASS, x, y, z, 0, ry);
  b.box(width + 0.03, 0.035, 0.03, BRICK_D, x, y + height, z, 0, ry);
  b.box(0.012, height, 0.02, IRON, mullionX, y, mullionZ, 0, ry);
};
// Rows of `count` windows spread across a face `width` wide centred at (x, z) facing ry, a row at each sill height.
const ironWindowRows = (b, x, z, ry, width, count, sillHeights, windowWidth, windowHeight) => {
  const at = onFace(x, z, ry);
  for (const y of sillHeights) for (let i = 0; i < count; i++) {
    const [wx, wz] = at(-width / 2 + (i + 0.5) * width / count, 0.01);
    ironWindow(b, wx, y, wz, ry, windowWidth, windowHeight);
  }
};
// A Gothic window width × height on a wall face (x, z) facing ry, its sill at y: dark glass in a buff frame under a
// pointed head.
const lancet = (b, x, y, z, ry = 0, width = 0.1, height = 0.22) => {
  const [glassX, glassZ] = onFace(x, z, ry)(0, 0.006);
  b.box(width + 0.03, height, 0.02, BUFF, x, y, z, 0, ry);
  b.box(width, height - 0.02, 0.02, GLASS, glassX, y + 0.01, glassZ, 0, ry);
  b.add(CONE4, BUFF, x, y + height + width * 0.4, z, (width + 0.03) / 2, width * 0.8, 0.014, 0, ry, 0);
};
// A brick block width × depth centred at (x, z) standing on y: a blue-brick plinth, walls `height` tall in `color` and
// a buff band at the eaves. Returns the wall top.
const brickBlock = (b, x, z, width, depth, height, { y = 0.03, color = BRICK } = {}) => {
  b.box(width + 0.03, 0.08, depth + 0.03, BLUE, x, y, z);
  b.box(width, height, depth, color, x, y + 0.08, z);
  b.box(width + 0.03, 0.04, depth + 0.03, BUFF, x, y + 0.04 + height, z);
  return y + 0.08 + height;
};
// A slate gable roof over width (along x) × depth (along z) centred at (x, z) on y, rising `rise`, its ridge along x
// (alongZ: along z); `crest` runs iron cresting along the ridge.
const slateRoof = (b, x, y, z, width, depth, rise, alongZ = false, crest = true) => {
  if (alongZ) b.roof(width, rise, depth, SLATE, x, y, z);
  else b.roof(depth, rise, width, SLATE, x, y, z, Math.PI / 2);
  const ridge = alongZ ? depth : width;
  b.box(alongZ ? 0.03 : ridge, 0.03, alongZ ? ridge : 0.03, IRON_D, x, y + rise - 0.015, z);
  if (!crest) return;
  for (let u = -ridge / 2 + 0.08; u < ridge / 2 - 0.04; u += 0.14) {
    b.box(0.012, 0.05, 0.012, IRON_D, alongZ ? x : x + u, y + rise + 0.01, alongZ ? z + u : z);
  }
};
// A square brick chimney stack `height` tall standing on y, its buff cap and two pots; returns the pots' top (for smoke).
const chimney = (b, x, y, z, height, width = 0.14) => {
  b.box(width, height, width, BRICK_D, x, y, z);
  b.box(width + 0.04, 0.04, width + 0.04, BUFF, x, y + height, z);
  for (const side of [-1, 1]) b.cylT(0.022, 0.028, 0.07, POT, x + side * width / 4, y + height + 0.04, z, 6);
  return y + height + 0.11;
};
// Smoke puffs rising from (x, y, z), one per phase.
const smoke = (extra, x, y, z, phases) => {
  (extra.smoke ??= []).push(...phases.map(phase => ({ geo: puff(), at: [x, y, z], phase })));
};
// A railway track from `from` to `to` along x at z = `line` (alongZ: along z at x = `line`), on y: sleepers every 0.12,
// two rails.
const railTrack = (b, from, to, line, y = 0.03, alongZ = false) => {
  const at = (u, offset) => alongZ ? [line + offset, u] : [u, line + offset];
  for (let u = from + 0.05; u < to; u += 0.12) {
    const [x, z] = at(u, 0);
    b.box(alongZ ? 0.34 : 0.06, 0.02, alongZ ? 0.06 : 0.34, SLEEPER, x, y, z);
  }
  for (const offset of [-0.1, 0.1]) {
    const [x, z] = at((from + to) / 2, offset);
    b.box(alongZ ? 0.025 : to - from, 0.03, alongZ ? to - from : 0.025, RAIL, x, y + 0.01, z);
  }
};
// A buffer stop across the track at (x, z) facing along +x (alongZ: facing +z): two posts and a team-painted beam with
// its buffers.
const bufferStop = (b, t, x, z, y = 0.03, alongZ = false) => {
  for (const offset of [-0.1, 0.1]) b.box(0.05, 0.16, 0.05, C.woodD, alongZ ? x + offset : x, y, alongZ ? z : z + offset);
  b.box(alongZ ? 0.38 : 0.07, 0.08, alongZ ? 0.07 : 0.38, t, x, y + 0.1, z);
  for (const offset of [-0.1, 0.1]) {
    const bx = alongZ ? x + offset : x + 0.05, bz = alongZ ? z + 0.05 : z + offset;
    b.add(CYL6, IRON, bx, y + 0.14, bz, 0.022, 0.06, 0.022, alongZ ? Math.PI / 2 : 0, 0, alongZ ? 0 : Math.PI / 2);
  }
};
// A wagon's running gear: cast wheels, the iron frame at floor height and spring buffers at both ends.
const wagonChassis = (g, length, floorY) => {
  const wheelRadius = 0.065;
  for (const x of [-length * 0.3, length * 0.3]) for (const side of [-1, 1]) {
    g.add(CYL8, IRON_D, x, wheelRadius, side * 0.1, wheelRadius, 0.03, wheelRadius, Math.PI / 2, 0, 0);
  }
  g.box(length, 0.05, 0.26, PAINT, 0, floorY - 0.05, 0);
  for (const end of [-1, 1]) for (const offset of [-0.08, 0.08]) {
    g.add(CYL6, IRON, end * (length / 2 + 0.03), floorY - 0.025, offset, 0.02, 0.06, 0.02, 0, 0, Math.PI / 2);
  }
};
// An open wagon's plank floor and team-painted sides and ends, with a dark top rail.
const openWagonBody = (g, t, length, floorY) => {
  g.box(length, 0.03, 0.28, C.woodD, 0, floorY, 0);
  for (const side of [-1, 1]) {
    g.box(length, 0.13, 0.02, t, 0, floorY, side * 0.13);
    g.box(0.02, 0.13, 0.28, t, side * (length / 2 - 0.01), floorY, 0);
    g.box(length + 0.01, 0.02, 0.025, PAINT, 0, floorY + 0.12, side * 0.13);
  }
};
// A covered body under a curved roof: a van's sliding doors, or a horse box's vents and its let-down side door.
const coveredWagonBody = (g, t, kind, length, floorY) => {
  g.box(length, 0.28, 0.28, t, 0, floorY, 0);
  g.add(CYL8, CORR, 0, floorY + 0.28, 0, 0.05, length + 0.02, 0.15, 0, 0, Math.PI / 2);
  for (const side of [-1, 1]) g.box(length + 0.004, 0.02, 0.284, PAINT, 0, floorY + (side > 0 ? 0.26 : 0), 0);
  if (kind === 'van') {
    for (const side of [-1, 1]) {
      g.box(0.2, 0.22, 0.012, PAINT, 0, floorY + 0.03, side * 0.142);
      g.box(0.18, 0.012, 0.014, IRON, 0, floorY + 0.12, side * 0.143);
    }
    return;
  }
  for (const side of [-1, 1]) g.box(length - 0.06, 0.05, 0.012, C.dark, 0, floorY + 0.19, side * 0.142);
  g.box(0.2, 0.2, 0.012, C.dark, 0, floorY + 0.02, -0.142);
};
// A four-wheeled railway wagon for place(), built at the origin along x standing on the rails (y = 0): an iron frame on
// cast wheels with spring buffers, its body `length` long in team paint; kind 'open' (sides and a plank floor), 'van'
// (covered under a curved roof) or 'horse' (a horse box, ventilated along its top, its side door let down on the -z side).
const railWagon = (t, kind, length = 0.6) => {
  const g = new B(), floorY = 0.13;
  wagonChassis(g, length, floorY);
  if (kind === 'open') openWagonBody(g, t, length, floorY);
  else coveredWagonBody(g, t, kind, length, floorY);
  return g;
};
// A gas lamp: an iron post `height` tall standing on y, its lit lantern and cap.
const gasLamp = (b, x, z, height = 0.5, y = 0.03) => {
  b.cylT(0.012, 0.022, height, IRON_D, x, y, z, 6);
  b.box(0.06, 0.07, 0.06, LIT, x, y + height, z);
  b.add(CONE4, IRON_D, x, y + height + 0.095, z, 0.06, 0.05, 0.06, 0, Math.PI / 4, 0);
};
// Iron railings from p to q ([x, z]) on y: posts every 0.1 between a top and a bottom rail.
const railings = (b, [x0, z0], [x1, z1], height = 0.22, y = 0.03) => {
  const length = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0);
  const posts = Math.max(1, Math.round(length / 0.1));
  for (let i = 0; i <= posts; i++) b.box(0.014, height, 0.014, IRON_D, x0 + (x1 - x0) * i / posts, y, z0 + (z1 - z0) * i / posts);
  for (const railY of [0.04, height - 0.03]) b.box(length, 0.016, 0.016, IRON_D, (x0 + x1) / 2, y + railY, (z0 + z1) / 2, 0, ry);
};
// A brick pier standing on y, its buff cap.
const brickPier = (b, x, z, height = 0.3, y = 0.03) => {
  b.box(0.12, height, 0.12, BRICK, x, y, z);
  b.box(0.15, 0.04, 0.15, BUFF, x, y + height, z);
};
// A wooden crate `width` wide standing on y, turned ry, with a band of stencilled team paint (band) or none.
const crate = (b, x, y, z, width = 0.14, ry = 0, band = null) => {
  b.box(width, width * 0.8, width, C.wood, x, y, z, 0, ry);
  b.box(width + 0.006, 0.018, width + 0.006, C.woodD, x, y + width * 0.8 - 0.018, z, 0, ry);
  if (band !== null) b.box(width + 0.008, width * 0.2, width + 0.008, band, x, y + width * 0.3, z, 0, ry);
};
// Sandbags from p to q ([x, z]) on y, `courses` high, laid in bond with a little jitter.
const sandbags = (b, [x0, z0], [x1, z1], courses = 2, y = 0.03) => {
  const length = Math.hypot(x1 - x0, z1 - z0), bags = Math.max(1, Math.round(length / 0.15));
  const ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let course = 0; course < courses; course++) for (let i = 0; i < bags - (course % 2); i++) {
    const along = (i + 0.5 + (course % 2) * 0.5) / bags, color = (i + course) % 3 ? SAND : SAND_D;
    const x = x0 + (x1 - x0) * along, z = z0 + (z1 - z0) * along, turn = ry + (hash(i, course) - 0.5) * 0.14;
    b.box(length / bags - 0.012, 0.052, 0.1 - course * 0.008, color, x, y + course * 0.052, z, 0, turn);
  }
};

// ---------- Granary ----------
// The three brick silos on their blue-brick plinth: iron tie-bands, a team band under the buff copings; the corrugated
// conveyor gallery along their tops and an iron ladder up the middle one.
const granarySilos = (b, t, y) => {
  const radius = 0.21, siloZ = -0.54, baseY = y + 0.1, height = 1.9, topY = baseY + height;
  b.box(1.32, 0.1, 0.48, BLUE, -0.23, y, siloZ);
  for (const x of [-0.66, -0.23, 0.2]) {
    b.cylT(radius, radius, height, BRICK, x, baseY, siloZ, 12);
    b.cylT(radius + 0.012, radius + 0.012, 0.12, t, x, topY - 0.3, siloZ, 12);
    b.cylT(radius + 0.025, radius + 0.025, 0.05, BUFF, x, topY, siloZ, 12);
    for (const bandY of [topY - 0.33, topY - 0.18]) b.cylT(radius + 0.016, radius + 0.016, 0.03, BUFF, x, bandY, siloZ, 12);
    for (const f of [0.2, 0.45, 0.7]) b.cylT(radius + 0.008, radius + 0.008, 0.022, IRON, x, baseY + height * f, siloZ, 12);
  }
  const galleryY = topY + 0.05, galleryWidth = 1.3, galleryX = -0.25;
  b.box(galleryWidth, 0.2, 0.22, CORR, galleryX, galleryY, siloZ);
  for (let i = 0; i < 5; i++) {
    b.box(0.08, 0.07, 0.02, GLASS, galleryX - galleryWidth / 2 + 0.14 + i * 0.26, galleryY + 0.08, siloZ + 0.111);
  }
  slateRoof(b, galleryX, galleryY + 0.2, siloZ, galleryWidth + 0.04, 0.3, 0.1, false, false);
  for (const side of [-1, 1]) b.box(0.012, height - 0.1, 0.012, IRON_D, -0.23 + side * 0.05, baseY, siloZ + radius + 0.02);
  for (let i = 0; i < 12; i++) b.box(0.1, 0.01, 0.01, IRON_D, -0.23, baseY + 0.1 + i * 0.15, siloZ + radius + 0.02);
};
// The elevator's head house: string courses, windows, the team board and door, the bucket elevator leg, the spout and
// the flag. Returns its wall top.
const granaryHeadHouse = (ctx, y) => {
  const { b, t, td } = ctx;
  const x = 0.67, z = -0.5, width = 0.38, depth = 0.56, frontZ = z + depth / 2;
  const top = brickBlock(b, x, z, width, depth, 2.42, { y });
  for (const courseY of [0.95, 1.75]) b.box(width + 0.02, 0.03, depth + 0.02, BUFF, x, courseY, z);
  slateRoof(b, x, top, z, width + 0.08, depth + 0.08, 0.26, true);
  for (const sillY of [1.1, 1.85]) ironWindow(b, 0.58, sillY, frontZ + 0.01, 0, 0.11, 0.2);
  ironWindowRows(b, x + width / 2, z, Math.PI / 2, depth, 2, [0.42, 1.1, 1.85], 0.11, 0.2);
  // The company board under the eaves, the door under its buff lintel.
  b.box(0.32, 0.13, 0.02, BUFF, x, 2.2, frontZ + 0.01);
  b.box(0.28, 0.09, 0.02, t, x, 2.22, frontZ + 0.018);
  b.box(0.16, 0.32, 0.02, td, 0.57, y + 0.08, frontZ + 0.01);
  b.box(0.2, 0.03, 0.03, BUFF, 0.57, y + 0.4, frontZ + 0.015);
  // The elevator leg from its receiving boot up to its head, and the spout down to the van.
  b.box(0.16, 0.12, 0.16, IRON_D, 0.79, y, frontZ + 0.06);
  b.box(0.09, 2.2, 0.09, IRON, 0.79, y + 0.12, frontZ + 0.05);
  b.box(0.13, 0.12, 0.14, IRON_D, 0.79, y + 2.3, frontZ + 0.04);
  stick(b, 0.026, IRON, [0.6, 1.32, frontZ + 0.02], [0.44, 0.58, 0.42], CYL6);
  flag(ctx, x, top + 0.24, z - 0.12, 0.45, IRON);
  return top;
};
// The granary yard: the weigh-house by its weighbridge, sacks and a lamp.
const granaryYard = (b, td, y) => {
  const houseTop = brickBlock(b, -0.58, -0.02, 0.4, 0.3, 0.34, { y });
  slateRoof(b, -0.58, houseTop, -0.02, 0.46, 0.38, 0.14, false, false);
  b.box(0.12, 0.24, 0.02, td, -0.68, y + 0.08, 0.135);
  ironWindow(b, -0.48, y + 0.18, 0.135, 0, 0.1, 0.13);
  ironWindow(b, -0.37, y + 0.18, -0.02, Math.PI / 2, 0.1, 0.13);
  chimney(b, -0.72, houseTop - 0.02, -0.02, 0.2, 0.08);
  b.box(0.36, 0.012, 0.26, IRON_D, -0.1, y, 0.03);
  b.box(0.32, 0.014, 0.22, IRON, -0.1, y, 0.03);
  for (const [x, z, lift] of [[0.36, -0.06, 0], [0.48, -0.1, 0], [0.42, 0.04, 0], [0.42, -0.04, 0.1]]) {
    sack(b, x, y + lift, z, 0.06);
  }
  // A pallet stacked with sacks.
  b.box(0.36, 0.04, 0.24, C.wood, -0.48, y, 0.74);
  for (const [dx, dz, dy] of [[-0.09, -0.06, 0], [0.09, -0.06, 0], [-0.09, 0.06, 0], [0.09, 0.06, 0], [0, 0, 0.11]]) {
    sack(b, -0.48 + dx, y + 0.04 + dy, 0.74 + dz, 0.065);
  }
  gasLamp(b, 0.05, 0.74, 0.5);
};

// Granary: tall grain silos and an elevator. Three tall brick silos on a blue-brick plinth stand along the back, with
// iron tie-bands, a team band under their buff copings and a corrugated-iron conveyor gallery along their tops. At their
// +x end rises the elevator: a tall brick head house under a crested slate roof flying the flag, its iron bucket
// elevator leg running up the front from the receiving boot, a team company board under the eaves and an iron spout down
// to a team grain van on the siding in front. A brick weigh-house by its weighbridge, sacks and a gas lamp stand in the
// yard.
export function granary(ctx) {
  const { b, s, h, t, td } = ctx, y = 0.03;
  b.box(s, y, s, YARD);
  granarySilos(b, t, y);
  const top = granaryHeadHouse(ctx, y);
  // The siding and the grain van under the spout.
  railTrack(b, -h, h, 0.46, y);
  place(b, railWagon(t, 'van', 0.62), 0.42, y + 0.02, 0.46);
  granaryYard(b, td, y);
  return top + 0.26;
}

// ---------- Storage Pit ----------
// The crane's lattice jib: two lower chords and an upper one meeting at the head, laced on both sloping faces; returns
// the head.
const craneJib = g => {
  const head = [0.56, 0.62, 0], lowerChord = side => [0.08, 0.05, side * 0.055], upperChord = [0.02, 0.13, 0];
  for (const side of [-1, 1]) {
    stick(g, 0.028, IRON, lowerChord(side), head, unit.box);
    for (let i = 0; i < 5; i++) {
      stick(g, 0.012, IRON, lerp(lowerChord(side), head, i / 5), lerp(upperChord, head, (i + 0.5) / 5), unit.box);
    }
  }
  stick(g, 0.024, IRON, upperChord, head, unit.box);
  g.add(CYL8, IRON_D, head[0], head[1], 0, 0.035, 0.05, 0.035, Math.PI / 2, 0, 0);
  return head;
};
// The stays from the A-frame on the roof to the jib's head, the hoist rope, the hook and its slings, and the load.
const craneRigging = (g, t, head) => {
  for (const side of [-1, 1]) stick(g, 0.014, IRON_D, [-0.14, 0.24, side * 0.08], [-0.06, 0.44, 0], unit.box);
  stick(g, 0.006, IRON_D, [-0.06, 0.44, 0], head, unit.box);
  stick(g, 0.005, PAINT, [head[0], head[1] - 0.03, 0], [head[0], 0.3, 0], unit.box);
  g.box(0.03, 0.04, 0.03, IRON_D, head[0], 0.26, 0);
  for (const side of [-1, 1]) stick(g, 0.004, PAINT, [head[0], 0.26, 0], [head[0] + side * 0.05, 0.19, 0], unit.box);
  crate(g, head[0], 0.085, 0, 0.13, 0.3, t);
};
// The steam crane on top of the gantry, built at the origin for a spinner turning about y (its jib along +x): the
// turntable, the team-painted machinery house with its boiler pipe, the counterweight, a laced lattice jib on its stays
// and the hook lifting a team-banded crate (slung high, so it clears the goods shed's roof as the crane slews).
const steamCrane = t => {
  const g = new B();
  g.cylT(0.15, 0.15, 0.03, IRON, 0, 0, 0, 12);
  // The machinery house, its roof and the counterweight; windows each side; the boiler pipe and its brass cap.
  g.box(0.26, 0.2, 0.22, t, -0.05, 0.03, 0);
  g.box(0.3, 0.025, 0.26, SLATE_D, -0.05, 0.23, 0);
  g.box(0.08, 0.16, 0.24, IRON_D, -0.22, 0.03, 0);
  for (const side of [-1, 1]) g.box(0.08, 0.07, 0.012, GLASS, -0.02, 0.11, side * 0.111);
  g.cylT(0.018, 0.018, 0.14, PAINT, -0.12, 0.255, 0.06, 6);
  g.cylT(0.026, 0.02, 0.03, P.brass, -0.12, 0.39, 0.06, 6);
  craneRigging(g, t, craneJib(g));
  return g.geometry();
};

// The goods shed at the back: team sliding doors, an iron canopy on brackets, the loading dock, a window and the flag.
// Returns its wall top.
const goodsShed = (ctx, y) => {
  const { b, t } = ctx;
  const x = -0.42, z = -0.66, width = 0.92, depth = 0.42, frontZ = z + depth / 2, endX = x + width / 2;
  const top = brickBlock(b, x, z, width, depth, 0.52, { y });
  slateRoof(b, x, top, z, width + 0.08, depth + 0.12, 0.26);
  for (const dx of [-0.2, 0.2]) {
    b.box(0.3, 0.36, 0.02, t, x + dx, y + 0.08, frontZ + 0.01); // the door
    b.box(0.012, 0.36, 0.024, IRON_D, x + dx, y + 0.08, frontZ + 0.013); // its meeting stile
    b.box(0.36, 0.02, 0.03, IRON_D, x + dx, y + 0.45, frontZ + 0.02); // its rail
  }
  b.box(width - 0.08, 0.025, 0.2, SLATE_D, x, y + 0.5, frontZ + 0.1);
  for (const dx of [-0.4, 0, 0.38]) {
    stick(b, 0.014, IRON_D, [x + dx, y + 0.32, frontZ + 0.01], [x + dx, y + 0.5, frontZ + 0.18], unit.box); // canopy bracket
  }
  b.box(width, 0.1, 0.12, BLUE, x, y, frontZ + 0.06);
  b.box(width, 0.015, 0.13, BUFF, x, y + 0.1, frontZ + 0.065);
  ironWindow(b, endX + 0.01, y + 0.24, z, Math.PI / 2, 0.14, 0.2);
  flag(ctx, x - 0.32, top + 0.24, z, 0.42, IRON);
  return top;
};
// The siding down the +x side at x = trackX, its buffer stop and the rail cart of dressed stone.
const stoneSiding = (b, t, h, y, trackX) => {
  railTrack(b, -h + 0.06, h, trackX, y, true);
  bufferStop(b, t, trackX, -h + 0.07, y, true);
  place(b, railWagon(t, 'open', 0.5), trackX, y + 0.02, 0.44, Math.PI / 2);
  for (const [x, z, width, ry] of [[trackX - 0.04, 0.33, 0.15, 0.1], [trackX + 0.03, 0.55, 0.14, -0.1]]) {
    b.box(width * 0.75, 0.09, width, STONE_L, x, 0.21, z, 0, ry);
  }
  b.box(0.1, 0.08, 0.12, C.stone, trackX, 0.21, 0.44, 0, 0.3);
  b.box(0.09, 0.07, 0.12, STONE_L, trackX - 0.01, 0.29, 0.43, 0, -0.2);
};
// The gantry at the back of the siding: crane rails each side of it, a portal frame on bogies, the deck and the
// turntable base, with the steam crane slewing on top.
const craneGantry = (ctx, y, trackX) => {
  const { b, h, t, extra } = ctx, z = -0.3, height = 0.72;
  for (const side of [-1, 1]) {
    const x = trackX + side * 0.27;
    b.box(0.03, 0.02, 0.9, RAIL, x, y, -h + 0.45); // crane rail
    b.box(0.08, 0.06, 0.5, IRON_D, x, y + 0.02, z); // bogie
    for (const dz of [-0.2, 0.2]) stick(b, 0.06, IRON, [x, y + 0.08, z + dz], [x, height, z + dz * 0.8], unit.box);
    stick(b, 0.02, IRON, [x, y + 0.1, z - 0.2], [x, height - 0.1, z + 0.17], unit.box);
    stick(b, 0.02, IRON, [x, y + 0.1, z + 0.2], [x, height - 0.1, z - 0.17], unit.box);
    b.box(0.07, 0.07, 0.44, IRON, x, height, z);
  }
  for (const dz of [-0.17, 0.17]) b.box(0.62, 0.07, 0.07, IRON, trackX, height, z + dz);
  b.box(0.5, 0.03, 0.36, IRON_D, trackX, height + 0.07, z);
  b.cylT(0.15, 0.17, 0.04, IRON_D, trackX, height + 0.1, z, 12);
  extra.spinners = [{ geo: steamCrane(t), at: [trackX, height + 0.14, z], axis: 'y', speed: 0.45 }];
};
// The goods in the yard: sawn timber on bearers, dressed stone, the strongbox of gold ingots, barrels and a lamp.
const yardGoods = (b, y) => {
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 4 - (layer === 2); i++) {
    const color = (i + layer) % 2 ? C.wood : 0x8a6238;
    b.box(0.5, 0.035, 0.07, color, -0.52, y + 0.03 + layer * 0.036, -0.1 + i * 0.075 + (layer === 2) * 0.04);
  }
  for (const x of [-0.7, -0.34]) b.box(0.04, 0.03, 0.32, C.woodD, x, y, 0.01);
  for (const [x, z, ry] of [[-0.02, 0.06, 0.2], [-0.02, 0.26, -0.3]]) b.box(0.17, 0.12, 0.13, STONE_L, x, y, z, 0, ry);
  b.box(0.15, 0.1, 0.12, C.stone, -0.02, y + 0.12, 0.14, 0, 0.1);
  const boxX = -0.6, boxZ = 0.62;
  b.box(0.22, 0.12, 0.14, C.woodD, boxX, y, boxZ);
  b.box(0.23, 0.025, 0.15, IRON, boxX, y + 0.12, boxZ); // the iron lid
  b.box(0.025, 0.13, 0.15, IRON, boxX - 0.07, y, boxZ); // and straps
  b.box(0.025, 0.13, 0.15, IRON, boxX + 0.07, y, boxZ);
  for (const [dx, dz, dy] of [[-0.04, -0.03, 0], [0.04, -0.03, 0], [0, 0.03, 0], [0, 0, 0.025]]) {
    b.box(0.07, 0.025, 0.035, C.gold, boxX + dx, y + 0.145 + dy, boxZ + dz, 0, 0.2);
  }
  barrel(b, -0.28, y, 0.66);
  barrel(b, -0.16, y, 0.74, 0.065);
  barrel(b, -0.22, y, 0.54, 0.065);
  gasLamp(b, 0.08, 0.72, 0.5);
};

// Storage Pit: a depot with a gantry crane and a rail cart. A brick goods shed with team sliding doors under an iron
// canopy and a crested slate roof flying the flag stands at the back of a cinder yard. A siding runs down the +x side to a
// team buffer stop, with a team-painted rail cart of dressed stone at its front. At the back of the siding an iron gantry
// straddles the track on its bogies and rails, and on top of it a steam crane (an animated spinner) slews round: its
// team-painted machinery house with a boiler pipe, its counterweight and a lattice jib swinging a crate on its hook. Sawn
// timber, dressed stone, a strongbox of gold ingots and barrels lie in the yard, with a gas lamp.
export function storage_pit(ctx) {
  const { b, s, h, t } = ctx, y = 0.03, trackX = 0.45;
  b.box(s, y, s, CINDER);
  const top = goodsShed(ctx, y);
  stoneSiding(b, t, h, y, trackX);
  craneGantry(ctx, y, trackX);
  yardGoods(b, y);
  return top + 0.26;
}

// ---------- Farm ----------
// A traction engine's wheel of radius r and width w at (x, z): the iron tyre, its team centre and the brass hub, on the
// outer side.
const engineWheel = (g, t, x, z, r, w) => {
  const outward = Math.sign(z);
  g.add(DISC, IRON_D, x, r, z, r, w, r, Math.PI / 2, 0, 0);
  g.add(DISC, t, x, r, z + outward * (w / 2 + 0.002), r * 0.72, 0.006, r * 0.72, Math.PI / 2, 0, 0);
  g.add(CYL6, P.brass, x, r, z + outward * (w / 2 + 0.008), 0.025, 0.02, 0.025, Math.PI / 2, 0, 0);
};
// A steam traction engine for place(), built at the origin facing +x: a team-painted boiler with brass bands, the smoke
// box and tall chimney forward, big iron wheels with team centres, the cylinder and flywheel on top, the firebox and a
// team-dark tender at the back and a canopy over all on four posts.
const tractionEngine = (t, td) => {
  const g = new B();
  for (const side of [-1, 1]) {
    engineWheel(g, t, -0.12, side * 0.14, 0.14, 0.07);
    engineWheel(g, t, 0.2, side * 0.11, 0.08, 0.045);
  }
  g.add(unit.cyl, t, 0.04, 0.2, 0, 0.08, 0.34, 0.08, 0, 0, Math.PI / 2); // boiler
  for (const x of [-0.06, 0.1]) g.add(unit.cyl, P.brass, x, 0.2, 0, 0.083, 0.014, 0.083, 0, 0, Math.PI / 2);
  g.add(unit.cyl, IRON_D, 0.235, 0.2, 0, 0.085, 0.06, 0.085, 0, 0, Math.PI / 2); // smoke box
  g.cylT(0.022, 0.026, 0.3, PAINT, 0.24, 0.27, 0, 8); // chimney
  g.cylT(0.032, 0.026, 0.03, P.brass, 0.24, 0.57, 0, 8);
  g.box(0.14, 0.05, 0.06, IRON, 0.05, 0.27, 0); // cylinder
  g.add(DISC, IRON_D, 0.02, 0.33, 0.1, 0.08, 0.02, 0.08, Math.PI / 2, 0, 0); // flywheel
  g.box(0.1, 0.2, 0.16, PAINT, -0.17, 0.11, 0); // firebox
  g.box(0.14, 0.15, 0.24, td, -0.27, 0.1, 0); // tender
  for (const x of [-0.31, 0.16]) for (const side of [-1, 1]) g.box(0.014, 0.4, 0.014, IRON_D, x, 0.12, side * 0.13);
  g.box(0.54, 0.015, 0.32, td, -0.07, 0.51, 0); // canopy
  return g;
};
// A three-furrow plough for place(), built at the origin and drawn toward +x: a skewed iron frame on two wheels, its
// steel shares in the soil and the drawbar forward.
const plough = () => {
  const g = new B();
  g.box(0.3, 0.03, 0.04, IRON, -0.02, 0.12, 0, 0, 0.45);
  for (let i = 0; i < 3; i++) {
    const x = -0.12 + i * 0.1, z = 0.05 - i * 0.045;
    stick(g, 0.016, IRON, [x, 0.12, z], [x + 0.03, 0.02, z], unit.box);
    g.box(0.08, 0.035, 0.02, P.steel, x + 0.04, 0.0, z, 0, 0.5, 0.3);
  }
  for (const side of [-1, 1]) g.add(CYL8, IRON_D, -0.04, 0.06, side * 0.11, 0.06, 0.02, 0.06, Math.PI / 2, 0, 0);
  g.box(0.03, 0.03, 0.24, IRON, -0.04, 0.045, 0);
  stick(g, 0.02, IRON, [0.1, 0.12, 0], [0.14, 0.11, 0], unit.box);
  return g;
};

// The farm's layout: the Dutch barn fills the back corner beyond barnX / barnZ; the plough stands at ploughX.
const FARM = { barnX: -0.38, barnZ: -0.42, ploughX: -0.08 };
// The back field's ridges (the barn's corner left out) and the front's: furrows behind the plough, stubble ahead with
// its rows. Returns the back ridges' z (where the turnips grow).
const farmField = (b, h, y) => {
  const { barnX, barnZ, ploughX } = FARM, backRidges = [];
  for (let z = -0.8; z < 0.24; z += 0.12) backRidges.push(z);
  for (const z of backRidges) {
    const x0 = z < barnZ ? barnX : -h + 0.03, x1 = h - 0.06;
    b.roof(0.1, 0.045, x1 - x0, SOIL, (x0 + x1) / 2, y, z, Math.PI / 2);
  }
  for (let z = 0.36; z < 0.82; z += 0.12) {
    b.roof(0.1, 0.05, ploughX - 0.1 + h - 0.03, SOIL, (ploughX - 0.1 - h + 0.03) / 2, y, z, Math.PI / 2);
  }
  b.box(h - 0.06 - ploughX + 0.1, 0.008, 0.5, STUBBLE, (ploughX - 0.1 + h - 0.06) / 2, y, 0.57);
  for (const z of [0.4, 0.52, 0.64, 0.76]) {
    b.box(h - 0.08 - ploughX + 0.1, 0.012, 0.012, 0xb3a16a, (ploughX - 0.1 + h - 0.08) / 2, y + 0.008, z);
  }
  return backRidges;
};
// The Dutch barn: iron posts, a curved roof of corrugated sheets, hay inside and out, the flag. Returns its roof top.
const dutchBarn = (ctx, y) => {
  const { b, h } = ctx;
  const x = (FARM.barnX - h + 0.04) / 2, z = (FARM.barnZ - h + 0.04) / 2, width = 0.46, depth = 0.42, postHeight = 0.56;
  const radius = 0.3, halfAngle = Math.asin(0.24 / radius), roofCenterY = y + postHeight + 0.12 - radius;
  b.box(width + 0.04, 0.02, depth + 0.04, CINDER, x, y, z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(0.035, postHeight, 0.035, IRON_D, x + sx * width / 2, y, z + sz * depth / 2);
  }
  for (let i = 0; i < 5; i++) {
    const a = -halfAngle + (i + 0.5) * 2 * halfAngle / 5;
    b.box(width + 0.08, 0.018, 0.112, i % 2 ? CORR_D : CORR, x, roofCenterY + radius * Math.cos(a), z + radius * Math.sin(a), a);
  }
  b.box(width - 0.06, 0.4, depth - 0.08, C.hay, x, y + 0.02, z);
  for (const layerY of [0.15, 0.29]) b.box(width - 0.05, 0.012, depth - 0.07, C.thatchD, x, y + layerY, z);
  for (const [bx, bz, lift] of [[x + 0.3, z + 0.14, 0], [x + 0.3, z - 0.04, 0], [x + 0.3, z + 0.05, 0.11]]) {
    b.box(0.13, 0.11, 0.18, C.hay, bx, y + lift, bz, 0, 0.1);
  }
  flag(ctx, x, y + postHeight + 0.11, z, 0.4, IRON);
  return y + postHeight + 0.15;
};
// The fence: iron posts and two wires along the front and the right, the team five-bar gate in the front.
const farmFence = (b, h, t, y) => {
  const edge = h - 0.04, gate = [-0.56, -0.24];
  for (let u = -h + 0.06; u < edge; u += 0.2) {
    if (u < gate[0] - 0.02 || u > gate[1] + 0.02) b.box(0.025, 0.24, 0.025, IRON_D, u, y, edge);
    b.box(0.025, 0.24, 0.025, IRON_D, edge, y, u);
  }
  for (const wireY of [0.1, 0.2]) {
    b.box(gate[0] + h - 0.06, 0.008, 0.008, P.steel, (gate[0] - h + 0.06) / 2, y + wireY, edge);
    b.box(edge - gate[1], 0.008, 0.008, P.steel, (gate[1] + edge) / 2, y + wireY, edge);
    b.box(0.008, 0.008, 2 * h - 0.1, P.steel, edge, y + wireY, -0.02);
  }
  for (const x of gate) b.box(0.04, 0.28, 0.04, IRON_D, x, y, edge);
  const gateX = (gate[0] + gate[1]) / 2, barWidth = gate[1] - gate[0] - 0.04;
  for (let i = 0; i < 5; i++) b.box(barWidth, 0.02, 0.016, t, gateX, y + 0.04 + i * 0.045, edge);
  b.box(0.022, 0.24, 0.016, t, gateX, y + 0.13, edge, 0, 0, 1.05);
};
// The turnips along the back ridges, clear of the barn's corner (extra.crops).
const turnipRows = (h, y, backRidges) => {
  const crops = new B();
  for (const [j, z] of backRidges.entries()) for (let i = 0, x = -h + 0.1; x < h - 0.1; i++, x += 0.15) {
    if (z < FARM.barnZ && x < FARM.barnX + 0.04) continue;
    const size = 0.85 + hash(i, j) * 0.3, color = hash(j, i) > 0.5 ? TURNIP : TURNIP_L;
    const jitterX = x + (hash(i + 3, j) - 0.5) * 0.03;
    crops.add(TURNIP_GEO, color, jitterX, y + 0.08, z, 0.055 * size, 0.05 * size, 0.05 * size, 0, i + j);
  }
  return crops.geometry();
};

// Farm: ploughed rows with a tractor. Ploughed ridges run across the field in dark soil; turnips stand in rows along
// the back ridges (extra.crops, which animate() shows once the farm is finished and shrinks as the food runs out).
// Across the front a team-painted steam traction engine, its smoke box forward and its canopy over the footplate, draws a
// three-furrow plough through the stubble, fresh furrows behind it. A corrugated-iron Dutch barn full of hay stands in the
// back corner flying the flag; iron posts and wire fence the front and the right, with a team five-bar gate.
export function farm(ctx) {
  const { b, h, s, t, td, extra } = ctx, y = 0.03;
  b.box(s, y, s, SOIL_D);
  const backRidges = farmField(b, h, y);
  place(b, tractionEngine(t, td), FARM.ploughX + 0.46, y, 0.57);
  place(b, plough(), FARM.ploughX, y, 0.57);
  const top = dutchBarn(ctx, y);
  farmFence(b, h, t, y);
  extra.crops = turnipRows(h, y, backRidges);
  return top;
}

// ---------- Barracks ----------
// A breech-loading field gun for place(), built at the origin facing +x: its steel barrel over a team carriage, an iron
// shield, wooden wheels with team hubs and the trail back to the ground.
const fieldGun = t => {
  const g = new B(), wheelRadius = 0.12;
  for (const side of [-1, 1]) {
    g.add(DISC, C.woodD, 0, wheelRadius, side * 0.15, wheelRadius, 0.025, wheelRadius, Math.PI / 2, 0, 0);
    g.add(CYL6, t, 0, wheelRadius, side * 0.168, 0.035, 0.02, 0.035, Math.PI / 2, 0, 0);
  }
  g.add(CYL6, IRON_D, 0, wheelRadius, 0, 0.018, 0.3, 0.018, Math.PI / 2, 0, 0); // axle
  stick(g, 0.06, t, [0.04, wheelRadius + 0.02, 0], [-0.4, 0.02, 0], unit.box); // trail
  g.box(0.16, 0.06, 0.1, t, 0.02, wheelRadius + 0.02, 0); // carriage
  g.box(0.02, 0.16, 0.26, IRON, 0.1, wheelRadius - 0.02, 0); // shield
  stick(g, 0.03, GUN, [-0.08, wheelRadius + 0.1, 0], [0.4, wheelRadius + 0.12, 0], CYL8); // barrel
  g.add(CYL8, GUN, -0.07, wheelRadius + 0.1, 0, 0.042, 0.1, 0.042, 0, 0, Math.PI / 2); // breech
  return g;
};
// A searchlight standing on a roof at y: its pedestal, the turntable and yoke, and the lamp drum (centre 0.32 up) with
// its brass rim and bright lens, aimed along the unit direction `aim`.
const searchlight = (b, x, y, z, aim) => {
  const drumY = y + 0.32, along = f => [x + aim[0] * f, drumY + aim[1] * f, z + aim[2] * f];
  const flat = Math.hypot(aim[0], aim[2]), acrossX = -aim[2] / flat, acrossZ = aim[0] / flat;
  b.cylT(0.05, 0.08, 0.15, IRON_D, x, y, z, 8);
  b.box(0.3, 0.03, 0.06, IRON, x, drumY - 0.17, z, 0, Math.atan2(-acrossZ, acrossX));
  for (const side of [-1, 1]) {
    const from = [x + side * acrossX * 0.12, drumY - 0.15, z + side * acrossZ * 0.12];
    stick(b, 0.02, IRON_D, from, [x + side * acrossX * 0.14, drumY, z + side * acrossZ * 0.14], unit.box);
  }
  stick(b, 0.12, IRON, along(-0.12), along(0.1), CYL8);
  stick(b, 0.13, P.brass, along(0.09), along(0.13), CYL8);
  stick(b, 0.105, LENS, along(0.12), along(0.135), DISC);
};

// The armoury's head house and its corner tower, which the yard and the railings line up on.
const ARMOURY = { x: -0.41, width: 1.54, z: -0.45, depth: 0.38 };
const ARMOURY_TOWER = { x: 0.65, z: -0.59, width: 0.58 };
// The drill shed: walls, the segmental barrel roof (a glazed crown) and its gable ends; the boiler stack.
const drillShed = (b, extra, y) => {
  const x = -0.48, width = 1.68, z = -0.98, depth = 0.68, wallTop = brickBlock(b, x, z, width, depth, 0.62, { y });
  const span = depth / 2 + 0.04, rise = 0.3, radius = (span * span + rise * rise) / (2 * rise);
  const halfAngle = Math.asin(span / radius), centerY = wallTop + rise - radius, strips = 7;
  for (let i = 0; i < strips; i++) {
    const a = -halfAngle + (i + 0.5) * 2 * halfAngle / strips, color = i === 3 ? ROOF_GLASS : i % 2 ? SLATE_D : SLATE;
    const stripWidth = 2 * radius * Math.sin(halfAngle / strips) + 0.006;
    b.box(width + 0.06, 0.03, stripWidth, color, x, centerY + radius * Math.cos(a) - 0.015, z + radius * Math.sin(a), a);
  }
  for (const side of [-1, 1]) {
    b.add(ARCH, BRICK, x + side * (width / 2 + 0.001), wallTop, z, span - 0.04, rise - 0.02, 1, 0, side * Math.PI / 2, 0);
  }
  smoke(extra, -1.12, chimney(b, -1.12, y, -1.18, 1.5, 0.16), -1.18, [0, 0.33, 0.66]);
};
// The head house's gate under its buff arch, the team shield over it and the team banners either side.
const armouryGate = (b, t, td, y, gateX, faceZ) => {
  b.box(0.3, 0.32, 0.02, td, gateX, y + 0.08, faceZ);
  b.add(ARCH, td, gateX, y + 0.4, faceZ, 0.15, 0.15, 1);
  b.add(ARCH_RING, BUFF, gateX, y + 0.4, faceZ + 0.004, 0.17, 0.17, 0.15);
  b.box(0.012, 0.32, 0.024, IRON_D, gateX, y + 0.08, faceZ + 0.002);
  b.box(0.05, 0.06, 0.03, BUFF, gateX, y + 0.55, faceZ); // keystone
  b.box(0.2, 0.2, 0.02, BUFF, gateX, 0.66, faceZ);
  b.box(0.16, 0.13, 0.024, t, gateX, 0.69, faceZ);
  b.add(CONE4, t, gateX, 0.66, faceZ + 0.002, 0.08, 0.07, 0.012, Math.PI, 0, 0);
  for (const side of [-1, 1]) {
    b.box(0.13, 0.34, 0.012, t, gateX + side * 0.26, 0.46, faceZ + 0.004);
    b.box(0.15, 0.02, 0.02, IRON_D, gateX + side * 0.26, 0.8, faceZ + 0.006);
  }
};
// The head house: front wall, string course, battlements, the gate, the shield, banners and windows, the corner turret.
const armouryHall = (b, t, td, y) => {
  const { x, width, z, depth } = ARMOURY, frontZ = z + depth / 2, wallTop = brickBlock(b, x, z, width, depth, 0.78, { y });
  b.box(width + 0.02, 0.03, depth + 0.02, BUFF, x, y + 0.5, z);
  for (let bx = x - width / 2 + 0.08; bx < x + width / 2; bx += 0.16) b.box(0.09, 0.1, 0.08, BRICK, bx, wallTop, frontZ - 0.04);
  for (let bz = z - depth / 2 + 0.08; bz < frontZ - 0.08; bz += 0.16) {
    b.box(0.08, 0.1, 0.09, BRICK, x - width / 2 + 0.04, wallTop, bz);
  }
  const faceZ = frontZ + 0.011;
  armouryGate(b, t, td, y, x, faceZ);
  for (const wx of [-1.02, -0.84, 0.02, 0.2]) for (const sillY of [0.18, 0.56]) ironWindow(b, wx, sillY, faceZ, 0, 0.06, 0.22);
  // The round turret at the far corner, its battlements and slit window.
  const turretX = x - width / 2, turretZ = frontZ - 0.02;
  b.cylT(0.1, 0.1, 0.98, BRICK, turretX, y, turretZ, 8);
  b.cylT(0.12, 0.12, 0.05, BUFF, turretX, y + 0.98, turretZ, 8);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    b.box(0.05, 0.08, 0.05, BRICK, turretX + Math.cos(a) * 0.09, y + 1.03, frontZ - 0.02 + Math.sin(a) * 0.09);
  }
  ironWindow(b, turretX, 0.55, frontZ + 0.085, 0, 0.05, 0.16);
};
// The tower: corbelled parapet and battlements, bartizans, slit windows, the searchlight and the flag. Returns its top.
const armouryTower = (ctx, y) => {
  const { b } = ctx, { x, z, width } = ARMOURY_TOWER, top = brickBlock(b, x, z, width, width, 1.55, { y });
  b.box(width + 0.06, 0.08, width + 0.06, BUFF, x, top - 0.08, z);
  for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
    const u = -width / 2 + 0.05 + i * (width - 0.1) / 3;
    b.box(0.08, 0.1, 0.08, BRICK, x + u, top, z + side * (width / 2 - 0.01));
    b.box(0.08, 0.1, 0.08, BRICK, x + side * (width / 2 - 0.01), top, z + u);
  }
  for (const [bx, bz] of [[x + width / 2, z + width / 2], [x - width / 2, z + width / 2], [x + width / 2, z - width / 2]]) {
    b.cylT(0.075, 0.035, 0.12, BUFF, bx, top - 0.32, bz, 8); // corbel
    b.cylT(0.075, 0.075, 0.28, BRICK, bx, top - 0.2, bz, 8);
    b.cone(0.09, 0.14, SLATE, bx, top + 0.08, bz, 8);
  }
  for (const sillY of [0.3, 0.75, 1.2]) {
    ironWindow(b, x, sillY, z + width / 2 + 0.01, 0, 0.06, 0.2);
    ironWindow(b, x + width / 2 + 0.01, sillY, z, Math.PI / 2, 0.06, 0.2);
  }
  searchlight(b, x, top, z, [Math.cos(0.32) * Math.SQRT1_2, Math.sin(0.32), Math.cos(0.32) * Math.SQRT1_2]);
  flag(ctx, x - width / 2 + 0.06, top, z - width / 2 + 0.06, 0.55, IRON);
  return top;
};
// The yard: the path, the field guns, ammunition and shells, the rifle rack.
const armouryYard = (b, h, t, y) => {
  const gateX = ARMOURY.x, frontZ = ARMOURY.z + ARMOURY.depth / 2;
  b.box(0.42, 0.008, h - frontZ, PAVE, gateX, y, (frontZ + h) / 2);
  for (const x of [gateX - 0.5, gateX + 0.5]) place(b, fieldGun(t), x, y, 0.42, -Math.PI / 2);
  for (const [x, z, lift, ry] of [[0.62, 0.12, 0, 0.1], [0.8, 0.1, 0, -0.15], [0.7, 0.14, 0.11, 0.3]]) {
    crate(b, x, y + lift, z, 0.14, ry, t);
  }
  for (let i = 0; i < 6; i++) {
    const x = 0.62 + (i % 3) * 0.06, z = 0.36 + (i / 3 | 0) * 0.06;
    b.cylT(0.022, 0.022, 0.08, P.brass, x, y, z, 6); // shell case
    b.add(CONE4, GUN, x, y + 0.1, z, 0.024, 0.04, 0.024); // its head
  }
  b.box(0.5, 0.03, 0.05, C.woodD, -1.0, y + 0.3, -0.02);
  b.box(0.5, 0.03, 0.06, C.woodD, -1.0, y + 0.04, 0.02);
  for (const side of [-1, 1]) b.box(0.03, 0.34, 0.03, C.woodD, -1.0 + side * 0.24, y, 0.0);
  for (let i = 0; i < 7; i++) {
    const x = -1.18 + i * 0.06;
    stick(b, 0.012, C.woodD, [x, y + 0.05, 0.04], [x, y + 0.28, -0.0], unit.box); // stock
    stick(b, 0.007, GUN, [x, y + 0.28, 0.0], [x, y + 0.42, -0.02], unit.box); // barrel
  }
};
// The front: railings between brick piers, lamps on the gate piers; along the right as far as the tower.
const armouryRailings = (b, h, y) => {
  const edge = h - 0.06, gate0 = ARMOURY.x - 0.26, gate1 = ARMOURY.x + 0.26;
  const towerFront = ARMOURY_TOWER.z + ARMOURY_TOWER.width / 2 + 0.1;
  railings(b, [-h + 0.06, edge], [gate0, edge]);
  railings(b, [gate1, edge], [edge, edge]);
  railings(b, [edge, edge], [edge, towerFront]);
  for (const x of [-h + 0.06, -0.9, gate0, gate1, 0.4, edge]) brickPier(b, x, edge, x === gate0 || x === gate1 ? 0.36 : 0.28);
  brickPier(b, edge, 0.5);
  brickPier(b, edge, towerFront);
  for (const x of [gate0, gate1]) gasLamp(b, x, edge, 0.26, y + 0.4);
};

// Barracks: an armoury with a searchlight. A castellated brick armoury: the head house's battlemented front with a team
// gate under a buff arch, a team shield, team banners and slit windows, a round turret at its far corner; the drill shed's
// slate barrel roof behind with a glazed crown and a smoking boiler stack; at the corner a tall battlemented tower with
// bartizans, and on its roof the searchlight on its pedestal, aimed out over the yard. In front, on the gravel: two field
// guns on team carriages either side of the path, ammunition boxes and shells, a rifle rack, and iron railings between
// brick piers along the front.
export function barracks(ctx) {
  const { b, s, h, t, td, extra } = ctx, y = 0.03;
  b.box(s, y, s, GRAVEL);
  drillShed(b, extra, y);
  armouryHall(b, t, td, y);
  const top = armouryTower(ctx, y);
  armouryYard(b, h, t, y);
  armouryRailings(b, h, y);
  return top + 0.48;
}

// ---------- Archery Range ----------
// The rifle range's lanes, the firing line their breastworks stand on, and the stop butt at the back.
const LANES = [-0.86, 0, 0.86], FIRING_Z = 0.72, BUTT_Z = -1.1;
// The stop butt, the mantlet and a target in each lane on its iron frame: team rings round a black bull.
const stopButt = (b, t, y) => {
  b.add(FRUSTUM, GRASS_D, 0, y + 0.3, BUTT_Z, 1.36, 0.6, 0.27);
  b.box(2.5, 0.3, 0.02, 0x7a6648, 0, y + 0.1, -0.85, -0.12);
  b.box(2.66, 0.24, 0.08, BRICK, 0, y, -0.6);
  b.box(2.7, 0.025, 0.1, BUFF, 0, y + 0.24, -0.6);
  for (const x of LANES) {
    const z = -0.72, bullY = y + 0.46;
    for (const side of [-1, 1]) b.box(0.025, 0.62, 0.025, IRON_D, x + side * 0.2, y, z - 0.02);
    b.box(0.42, 0.02, 0.025, IRON_D, x, y + 0.62, z - 0.02);
    b.box(0.38, 0.38, 0.02, CLOCK, x, y + 0.27, z);
    for (const [color, r, dz] of [[t, 0.16, 0.012], [CLOCK, 0.115, 0.016], [t, 0.075, 0.02], [GUN, 0.04, 0.024]]) {
      b.add(DISC, color, x, bullY, z + dz, r, 0.006, r, Math.PI / 2, 0, 0);
    }
    // The lane's number board.
    b.box(0.1, 0.07, 0.015, PAINT, x, y + 0.66, z);
    b.box(0.03, 0.04, 0.016, CLOCK, x, y + 0.675, z + 0.002);
  }
};
// Sandbag walls between and beside the lanes; at each lane's firing line its breastwork, a team mat and a rifle laid
// ready, and white distance boards along the lane.
const firingLanes = (b, t, y) => {
  for (const x of [-0.43, 0.43]) sandbags(b, [x, -0.5], [x, FIRING_Z - 0.02], 3);
  for (const x of [-1.3, 1.3]) sandbags(b, [x, -0.5], [x, 0.9], 2);
  for (const x of LANES) {
    sandbags(b, [x - 0.22, FIRING_Z], [x + 0.22, FIRING_Z], 3);
    b.box(0.18, 0.012, 0.26, t, x + 0.04, y, FIRING_Z + 0.17);
    stick(b, 0.016, C.woodD, [x + 0.05, y + 0.17, FIRING_Z + 0.12], [x + 0.05, y + 0.165, FIRING_Z - 0.02], unit.box);
    stick(b, 0.009, GUN, [x + 0.05, y + 0.168, FIRING_Z - 0.02], [x + 0.05, y + 0.17, FIRING_Z - 0.18], unit.box);
    for (const z of [-0.1, 0.3]) {
      b.box(0.025, 0.24, 0.025, CLOCK, x + 0.25, y, z);
      b.box(0.14, 0.08, 0.015, CLOCK, x + 0.25, y + 0.22, z + 0.015);
      b.box(0.06, 0.04, 0.017, PAINT, x + 0.25, y + 0.24, z + 0.016);
    }
  }
};
// The brick range house under slate at the front.
const rangeHouse = (b, td, y) => {
  const x = 1.1, z = 1.16, wallTop = brickBlock(b, x, z, 0.48, 0.32, 0.36, { y });
  slateRoof(b, x, wallTop, z, 0.54, 0.4, 0.16, false, false);
  b.box(0.12, 0.26, 0.02, td, x - 0.1, y + 0.08, z + 0.17);
  ironWindow(b, x + 0.12, y + 0.2, z + 0.17, 0, 0.1, 0.13);
  ironWindow(b, x + 0.25, y + 0.2, z, Math.PI / 2, 0.1, 0.13);
  chimney(b, x - 0.16, wallTop - 0.02, z, 0.16, 0.08);
};
// The rifle rack and the team-banded ammunition boxes by the range house.
const rangeRackAndAmmunition = (b, t, y) => {
  b.box(0.52, 0.03, 0.05, C.woodD, -0.95, y + 0.3, 1.1);
  b.box(0.52, 0.03, 0.06, C.woodD, -0.95, y + 0.04, 1.14);
  for (const side of [-1, 1]) b.box(0.03, 0.34, 0.03, C.woodD, -0.95 + side * 0.25, y, 1.12);
  for (let i = 0; i < 7; i++) {
    const x = -1.13 + i * 0.06;
    stick(b, 0.012, C.woodD, [x, y + 0.05, 1.16], [x, y + 0.28, 1.12], unit.box); // stock
    stick(b, 0.007, GUN, [x, y + 0.28, 1.12], [x, y + 0.42, 1.1], unit.box); // barrel
  }
  for (const [x, z, lift, ry] of [[-0.42, 1.12, 0, 0.1], [-0.26, 1.18, 0, -0.2], [-0.35, 1.14, 0.11, 0.25]]) {
    crate(b, x, y + lift, z, 0.14, ry, t);
  }
};

// Archery Range: a rifle range with sandbag lanes. Three mown lanes run back from the firing line to the stop butt: a
// long earth bank behind the marker's brick mantlet, where square targets painted in team rings round a black bull stand
// on iron frames. Sandbag walls part the lanes and flank the range; at the firing line each lane has its sandbag
// breastwork, a team mat and a rifle laid ready, and white distance boards stand along the lanes. At the front a brick
// range house under slate, a rifle rack and team-banded ammunition boxes; the team range flag flies from a tall iron pole
// on the butt.
export function archery_range(ctx) {
  const { b, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, GRASS);
  for (const x of LANES) b.box(0.62, 0.006, 1.9, GRASS_L, x, y, -0.2);
  stopButt(b, t, y);
  firingLanes(b, t, y);
  rangeHouse(b, td, y);
  rangeRackAndAmmunition(b, t, y);
  flag(ctx, 1.12, y + 0.58, BUTT_Z, 1.0, IRON, [0.3, 0.5]);
  return 0.82;
}

// ---------- Stable ----------
// The long stable at the back, x0..x1 × z0..z1.
const STABLE = { x0: -1.32, x1: 0.44, z0: -1.32, z1: -0.72 };
// The loading dock beside the siding: centred at x, `width` wide, from z0 to z1, `height` tall.
const DOCK = { x: 0.695, width: 0.35, z0: -0.45, z1: 0.5, height: 0.24 };
// The stable's roof and its iron ventilator along the ridge. Returns the ventilator's base.
const stableRoof = (b, cx, cz, width, depth, wallTop) => {
  const ventY = wallTop + 0.28;
  slateRoof(b, cx, wallTop, cz, width + 0.08, depth + 0.12, 0.32, false, false);
  b.box(1.0, 0.1, 0.12, IRON, cx, ventY, cz);
  for (let i = 0; i < 8; i++) b.box(0.012, 0.06, 0.125, IRON_D, cx - 0.44 + i * 0.125, ventY + 0.02, cz);
  slateRoof(b, cx, ventY + 0.1, cz, 1.06, 0.2, 0.07);
  return ventY;
};
// The stable doors along the front, team lower leaves under dark upper ones, with a horse looking out of every other.
const stableDoors = (b, t, floorY, frontZ) => {
  for (const [i, x] of [-1.1, -0.66, -0.22, 0.22].entries()) {
    b.box(0.24, 0.42, 0.02, BUFF, x, floorY, frontZ + 0.006); // frame
    b.box(0.19, 0.2, 0.02, t, x, floorY, frontZ + 0.012); // lower leaf
    b.box(0.19, 0.18, 0.02, C.dark, x, floorY + 0.2, frontZ + 0.01); // open upper leaf
    b.box(0.27, 0.04, 0.03, BRICK_D, x, floorY + 0.42, frontZ + 0.01); // lintel
    if (!(i % 2)) continue;
    b.box(0.08, 0.08, 0.16, HORSE_HEAD, x, floorY + 0.25, frontZ + 0.08, -0.35); // head
    b.box(0.08, 0.14, 0.08, HORSE_HEAD, x, floorY + 0.2, frontZ + 0.02, 0.5); // neck
    b.box(0.03, 0.05, 0.02, CLOCK, x, floorY + 0.27, frontZ + 0.16); // blaze
  }
};
// The stable: roof and ventilator, the doors and horses, windows, the cart arch and loft door, the flag. Returns the
// ventilator's base.
const stableBuilding = (ctx, y) => {
  const { b, t } = ctx, { x0, x1, z0, z1 } = STABLE, floorY = y + 0.08;
  const width = x1 - x0, depth = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const wallTop = brickBlock(b, cx, cz, width, depth, 0.6, { y });
  const ventY = stableRoof(b, cx, cz, width, depth, wallTop);
  stableDoors(b, t, floorY, z1);
  for (const x of [-0.88, -0.44, 0.0]) ironWindow(b, x, floorY + 0.3, z1 + 0.01, 0, 0.12, 0.14);
  // The cart arch and the loft door in the +x end.
  const archX = x1 + 0.011;
  b.box(0.02, 0.3, 0.3, C.dark, archX, floorY, cz);
  b.add(ARCH, C.dark, archX, floorY + 0.3, cz, 0.15, 0.15, 1, 0, Math.PI / 2, 0);
  b.add(ARCH_RING, BUFF, archX + 0.004, floorY + 0.3, cz, 0.17, 0.17, 0.15, 0, Math.PI / 2, 0);
  b.box(0.02, 0.14, 0.12, C.woodD, x1 + 0.05, wallTop + 0.03, cz);
  b.box(0.022, 0.06, 0.1, C.hay, x1 + 0.052, wallTop + 0.03, cz);
  flag(ctx, cx - 0.7, wallTop + 0.3, cz, 0.42, IRON);
  return ventY;
};
// The loading dock and the ramp with iron rails coming down from it into the yard.
const loadingDock = (b, y) => {
  const { x, width, z0, z1, height } = DOCK;
  b.box(width, height - 0.02, z1 - z0, BRICK, x, y, (z0 + z1) / 2);
  b.box(width + 0.02, 0.025, z1 - z0 + 0.02, BUFF, x, y + height - 0.02, (z0 + z1) / 2);
  b.add(WEDGE, SETT_D, x, y, z1, width, height + 0.005, 0.5);
  for (const side of [-1, 1]) {
    const railX = x + side * (width / 2 - 0.01);
    stick(b, 0.014, IRON_D, [railX, y + height + 0.18, z1], [railX, y + 0.18, z1 + 0.5], unit.box);
    for (const f of [0, 0.5, 1]) b.box(0.014, 0.18, 0.014, IRON_D, railX, y + height * (1 - f), z1 + 0.5 * f);
  }
};
// The siding along the +x side, its buffer stop; the dock and its ramp; the horse box with its door let down onto the
// dock; the signal over the siding.
const horseSiding = (b, h, t, y) => {
  const trackX = 1.06;
  railTrack(b, -h + 0.08, h, trackX, y, true);
  bufferStop(b, t, trackX, -h + 0.09, y, true);
  loadingDock(b, y);
  place(b, railWagon(t, 'horse', 0.82), trackX, y + 0.02, 0.05, Math.PI / 2);
  b.box(0.16, 0.015, 0.2, t, DOCK.x + DOCK.width / 2 + 0.04, y + DOCK.height - 0.005, 0.05, 0, 0, -0.06);
  const signalX = 1.3, signalZ = -0.62;
  b.box(0.03, 0.95, 0.03, IRON_D, signalX, y, signalZ); // post
  b.box(0.16, 0.035, 0.012, t, signalX - 0.07, y + 0.85, signalZ + 0.02, 0, 0, -0.3); // arm
  b.box(0.05, 0.05, 0.05, LIT, signalX, y + 0.95, signalZ); // lamp
  b.box(0.08, 0.02, 0.08, IRON_D, signalX, y + 1.0, signalZ); // cap
};
// The horses: one waiting on the dock, two in the yard by the trough and the hay; a lamp.
const stableYard = (b, t, y) => {
  place(b, horse(t), DOCK.x - 0.06, y + DOCK.height, 0.05, 0, 0.9);
  place(b, horse(t), -0.78, y, 0.42, 0.5, 0.9);
  place(b, horse(t, true), -0.3, y, 0.86, -0.3, 0.9);
  b.box(0.12, 0.12, 0.42, IRON_D, -1.18, y, 0.5); // trough
  b.box(0.08, 0.01, 0.38, 0x3f7fa3, -1.18, y + 0.11, 0.5); // its water
  for (const [x, z, lift, ry] of [[0.18, 0.66, 0, 0.2], [0.3, 0.78, 0, -0.1], [0.24, 0.72, 0.11, 0.4]]) {
    b.box(0.2, 0.11, 0.12, C.hay, x, y + lift, z, 0, ry); // hay bales
  }
  gasLamp(b, -1.15, -0.2, 0.55);
};

// Stable: a horse depot with a rail ramp. A long brick stable at the back under a slate roof with an iron ventilator
// along its ridge: stable doors with team lower leaves (two horses looking out), arched windows, a cart arch and a loft
// door in its +x end. A siding runs down the +x side to a team buffer stop, where a team horse box stands at a brick
// loading dock: its side door is let down onto the dock, a horse in a team saddle cloth waits to board, and a ramp with
// iron rails comes down from the dock into the cobbled yard, where two more horses stand by an iron trough and hay. A
// signal stands over the siding.
export function stable(ctx) {
  const { b, s, h, t } = ctx, y = 0.03;
  b.box(s, y, s, SETT);
  const ventY = stableBuilding(ctx, y);
  horseSiding(b, h, t, y);
  stableYard(b, t, y);
  return ventY + 0.17;
}

// ---------- Market ----------
// A shopfront for place(), built at the origin on a wall face at z = 0 facing +z, `width` wide: a dark-green stall riser
// and pilasters round its window, a fascia with a gold line, a team awning out over the pavement and crates of produce
// under it (fruit in the given colour).
const shopfront = (t, width, fruit) => {
  const g = new B(), sillY = 0.11;
  g.box(width, 0.07, 0.03, GREEN, 0, sillY, 0.015); // stall riser
  g.box(width - 0.08, 0.24, 0.02, SHOP, 0, sillY + 0.07, 0.012); // window
  for (const side of [-1, 1]) g.box(0.035, 0.31, 0.035, GREEN, side * (width / 2 - 0.018), sillY, 0.018);
  g.box(width, 0.07, 0.03, GREEN, 0, sillY + 0.31, 0.016); // fascia
  g.box(width - 0.12, 0.014, 0.034, C.gold, 0, sillY + 0.338, 0.017);
  g.box(width - 0.02, 0.012, 0.18, t, 0, sillY + 0.27, 0.09, 0.45); // awning
  for (const side of [-1, 1]) {
    g.box(0.1, 0.06, 0.08, C.wood, side * 0.1, sillY - 0.08, 0.1);
    g.box(0.09, 0.025, 0.07, side > 0 ? fruit : 0x6a9a3a, side * 0.1, sillY - 0.02, 0.1);
  }
  return g;
};

// The arcade: the passage half-width, the shop ranges from back to front (z0..z1), and each range's width.
const ARCADE = { passage: 0.42, z0: -1.32, z1: 0.86, range: 0.86 };
const FRUITS = [0xd8432a, 0xe8a23a, 0xc8302a, 0xd9c24a];
// The two shop ranges: string courses, slate roofs, chimneys with smoke. Returns their wall top.
const shopRanges = (b, extra, y) => {
  const { passage, z0, z1, range } = ARCADE, length = z1 - z0, cz = (z0 + z1) / 2;
  let top = 0;
  for (const side of [-1, 1]) {
    const cx = side * (passage + range / 2), chimneyZ = side < 0 ? -0.62 : -0.2;
    top = brickBlock(b, cx, cz, range, length, 0.86, { y });
    b.box(range + 0.02, 0.03, length + 0.02, BUFF, cx, y + 0.5, cz);
    slateRoof(b, cx, top, cz, range + 0.08, length + 0.06, 0.28, true, false);
    smoke(extra, cx, chimney(b, cx, top + 0.16, chimneyZ, 0.3), chimneyZ, side < 0 ? [0, 0.5] : [0.25, 0.75]);
  }
  return top;
};
// The shopfronts and upper windows on the passage side of the -x range and the outer side of the +x range; the ranges'
// front ends.
const shopfronts = (b, t, y) => {
  const { passage, z0, z1, range } = ARCADE, length = z1 - z0, cz = (z0 + z1) / 2;
  for (const [faceX, firstFruit] of [[-passage, 0], [passage + range, 4]]) {
    for (let i = 0; i < 4; i++) {
      place(b, shopfront(t, 0.46, FRUITS[(i + firstFruit) % 4]), faceX + 0.001, 0, z0 + (i + 0.5) * length / 4, Math.PI / 2);
    }
    ironWindowRows(b, faceX, cz, Math.PI / 2, length, 8, [y + 0.6], 0.1, 0.18);
  }
  for (const side of [-1, 1]) {
    const endX = side * (passage + 0.2 + (range - 0.2) / 2);
    place(b, shopfront(t, 0.5, FRUITS[side > 0 ? 1 : 2]), endX, 0, z1 + 0.001, 0);
    ironWindowRows(b, endX, z1, 0, 0.6, 3, [y + 0.6], 0.1, 0.18);
  }
};
// The glass vault over the passage on its iron ribs, its ridge vent.
const glassVault = (b, top) => {
  const { passage, z0, z1 } = ARCADE, length = z1 - z0, cz = (z0 + z1) / 2;
  for (let i = 0; i < 8; i++) {
    const a = (i + 0.5) * Math.PI / 8, paneWidth = 2 * passage * Math.sin(Math.PI / 16) + 0.006;
    const color = i % 2 ? ROOF_GLASS_D : ROOF_GLASS;
    b.box(paneWidth, 0.012, length, color, passage * Math.cos(a), top + passage * Math.sin(a), cz, 0, 0, a - Math.PI / 2);
  }
  for (let z = z0 + 0.12; z < z1; z += 0.36) b.add(RIB, IRON_D, 0, top, z, passage + 0.006, passage + 0.006, passage + 0.006);
  b.box(0.07, 0.035, length, IRON_D, 0, top + passage, cz);
};
// The entrance screen's outline, extruded 0.1 deep: a gabled wall halfWidth either side of the axis, its eaves at
// eavesY and its apex at gableY, pierced by a round arch of radius archRadius springing at archSpring.
const screenGeometry = (halfWidth, eavesY, gableY, archRadius, archSpring) => {
  const shape = new THREE.Shape();
  shape.moveTo(-halfWidth, 0);
  shape.lineTo(halfWidth, 0);
  shape.lineTo(halfWidth, eavesY);
  shape.lineTo(0, gableY);
  shape.lineTo(-halfWidth, eavesY);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-archRadius, 0);
  hole.lineTo(archRadius, 0);
  hole.lineTo(archRadius, archSpring);
  hole.absarc(0, archSpring, archRadius, 0, Math.PI, false);
  hole.lineTo(-archRadius, 0);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 8 });
};
// The entrance screen's sizes: half-width, eaves and gable heights, the arch's radius and springing height.
const SCREEN = { halfWidth: 0.66, eaves: 1.18, gable: 1.5, archRadius: 0.34, archSpring: 0.5 };
// The arch's iron-and-glass fanlight, the team name-board over it and the clock in the gable.
const screenFanlightAndClock = (b, t, y, faceZ) => {
  const { z1 } = ARCADE, { archRadius: r, archSpring } = SCREEN;
  b.add(ARCH, ROOF_GLASS, 0, y + archSpring, z1 + 0.04, r, r, 1);
  b.add(ARCH_RING, BUFF_D, 0, y + archSpring, faceZ + 0.004, r + 0.02, r + 0.02, 0.2);
  for (let i = 1; i < 6; i++) {
    const a = i * Math.PI / 6;
    b.box(0.012, r, 0.016, IRON_D, Math.cos(a) * r / 2, y + archSpring + Math.sin(a) * r / 2, z1 + 0.05, 0, 0, a - Math.PI / 2);
  }
  b.box(2 * r, 0.014, 0.016, IRON_D, 0, y + archSpring, z1 + 0.05);
  b.box(0.6, 0.11, 0.02, t, 0, y + 0.9, faceZ + 0.002);
  b.box(0.5, 0.016, 0.022, C.gold, 0, y + 0.947, faceZ + 0.004);
  b.add(DISC, P.brass, 0, y + 1.2, faceZ + 0.002, 0.14, 0.012, 0.14, Math.PI / 2, 0, 0);
  b.add(DISC, CLOCK, 0, y + 1.2, faceZ + 0.01, 0.12, 0.01, 0.12, Math.PI / 2, 0, 0);
  b.box(0.016, 0.09, 0.012, C.dark, 0, y + 1.22, faceZ + 0.018);
  b.box(0.07, 0.016, 0.012, C.dark, 0.03, y + 1.2, faceZ + 0.018);
};
// The entrance screen: the arch, its fanlight, the name-board, the clock, the gable and pinnacles; the lamps.
const entranceScreen = (b, t, y) => {
  const { z1 } = ARCADE, { halfWidth, eaves, gable } = SCREEN, faceZ = z1 + 0.09;
  const screen = screenGeometry(halfWidth, eaves, gable, SCREEN.archRadius, SCREEN.archSpring);
  b.add(screen, BUFF, 0, y, z1 - 0.01, 1, 1, 1);
  screen.dispose();
  screenFanlightAndClock(b, t, y, faceZ);
  for (const side of [-1, 1]) {
    // The gable's coping, the corner pier and its pinnacle.
    stick(b, 0.04, BUFF_D, [side * halfWidth, y + eaves + 0.02, faceZ - 0.04], [0, y + gable + 0.02, faceZ - 0.04], unit.box);
    b.box(0.1, 0.12, 0.12, BUFF_D, side * (halfWidth - 0.03), y + eaves, faceZ - 0.05);
    b.add(CONE4, BUFF_D, side * (halfWidth - 0.03), y + eaves + 0.24, faceZ - 0.05, 0.08, 0.24, 0.08, 0, Math.PI / 4, 0);
  }
  b.box(0.08, 0.1, 0.08, BUFF_D, 0, y + gable - 0.04, faceZ - 0.05);
  b.add(CONE4, BUFF_D, 0, y + gable + 0.16, faceZ - 0.05, 0.06, 0.2, 0.06, 0, Math.PI / 4, 0);
  for (const x of [-0.78, 0.78]) gasLamp(b, x, z1 + 0.22, 0.52);
};
// The team fruit barrow and the flower stall at the entrance.
const barrowAndFlowerStall = (b, t, y) => {
  const barrow = new B();
  for (const side of [-1, 1]) barrow.add(CYL8, C.woodD, 0.08, 0.08, side * 0.13, 0.08, 0.02, 0.08, Math.PI / 2, 0, 0);
  barrow.box(0.36, 0.08, 0.24, t, 0, 0.1, 0);
  barrow.box(0.34, 0.03, 0.22, 0xd8432a, 0, 0.18, 0);
  barrow.box(0.16, 0.03, 0.1, 0xe8a23a, -0.06, 0.21, 0);
  for (const side of [-1, 1]) stick(barrow, 0.012, C.woodD, [-0.16, 0.12, side * 0.08], [-0.36, 0.06, side * 0.08], unit.box);
  barrow.box(0.03, 0.12, 0.03, C.woodD, 0.14, 0.0, 0);
  place(b, barrow, -0.98, y, 1.16, 0.3);
  b.box(0.36, 0.04, 0.2, C.wood, 0.98, y + 0.18, 1.16);
  for (const side of [-1, 1]) b.box(0.03, 0.18, 0.18, C.woodD, 0.98 + side * 0.15, y, 1.16);
  for (const [i, dx] of [-0.12, -0.04, 0.04, 0.12].entries()) {
    b.cylT(0.035, 0.03, 0.06, IRON, 0.98 + dx, y + 0.22, 1.16, 6); // pot
    b.add(BALL, [0xd84a7a, 0xf2efe6, 0xe8c23a, t][i], 0.98 + dx, y + 0.31, 1.16, 0.045, 0.04, 0.045); // flowers
  }
};

// Market: an iron-and-glass arcade. Two brick ranges of shops face each other across a passage under a glass barrel
// vault on iron ribs. Their ground floors are shopfronts with team awnings and dark-green fascias, iron windows above,
// under slate roofs with smoking chimneys; the +x range's outer side has shopfronts of its own. At the front the arcade's
// buff stone entrance screen: a great round arch filled with an iron-and-glass fanlight, a team name-board over it, a
// clock in its gable and pinnacles at its corners, with gas lamps either side; a team fruit barrow and a flower stall
// stand at the entrance.
export function market(ctx) {
  const { b, s, t, extra } = ctx, y = 0.03;
  b.box(s, y, s, SETT);
  b.box(0.84, 0.006, 2.3, PAVE, 0, y, -0.2);
  const top = shopRanges(b, extra, y);
  shopfronts(b, t, y);
  glassVault(b, top);
  entranceScreen(b, t, y);
  flag(ctx, ARCADE.passage + ARCADE.range / 2, top + 0.26, -0.9, 0.45, IRON);
  barrowAndFlowerStall(b, t, y);
  return Math.max(SCREEN.gable + 0.36, top + 0.6);
}

// ---------- Government Center ----------
// The hall, x0..x1 × z0..z1, six bays long; the porch stands in front of its middle.
const HALL = { x0: -1.32, x1: 0.6, z0: -1.1, z1: -0.4 };
const HALL_BAY = (HALL.x1 - HALL.x0) / 6, PORCH_X = HALL.x0 + 3 * HALL_BAY, PORCH_FRONT = HALL.z1 + 0.3;
// The hall's two storeys of pointed windows (the porch covers the middle two below), its buttresses rising into
// pinnacles and the team banners either side of the porch.
const hallFront = (b, t, y, wallTop) => {
  const { x0, z1 } = HALL, bay = HALL_BAY;
  for (let i = 0; i < 6; i++) {
    const x = x0 + (i + 0.5) * bay;
    lancet(b, x, y + 0.6, z1 + 0.01, 0, 0.1, 0.24);
    if (i !== 2 && i !== 3) lancet(b, x, y + 0.16, z1 + 0.01, 0, 0.1, 0.24);
  }
  for (let i = 0; i <= 6; i++) {
    const x = x0 + i * bay;
    b.box(0.06, 0.92, 0.06, BRICK_D, x, y + 0.08, z1 + 0.03);
    b.box(0.08, 0.05, 0.08, BUFF, x, y + 0.5, z1 + 0.03);
    b.box(0.06, 0.12, 0.06, BUFF, x, wallTop - 0.02, z1 + 0.03);
    b.add(CONE4, BUFF, x, wallTop + 0.18, z1 + 0.03, 0.05, 0.16, 0.05, 0, Math.PI / 4, 0);
  }
  for (const x of [x0 + 2 * bay, x0 + 4 * bay]) {
    b.box(0.1, 0.32, 0.012, t, x, y + 0.5, z1 + 0.067);
    b.box(0.12, 0.02, 0.02, IRON_D, x, y + 0.82, z1 + 0.067);
  }
};
// The porch: buff walls, its gable and team band, the pointed team doorway, the steps.
const hallPorch = (b, t, td, y) => {
  const x = PORCH_X, back = HALL.z1, front = PORCH_FRONT, cz = (back + front) / 2;
  b.box(0.5, 0.62, front - back, BUFF, x, y + 0.08, cz);
  b.roof(0.56, 0.3, front - back + 0.04, SLATE, x, y + 0.7, cz);
  b.roof(0.5, 0.27, 0.02, BUFF, x, y + 0.7, front + 0.01); // the gable
  b.box(0.5, 0.05, 0.02, t, x, y + 0.64, front + 0.01);
  b.add(CONE4, BUFF, x, y + 1.04, front, 0.03, 0.1, 0.03, 0, Math.PI / 4, 0);
  b.box(0.2, 0.32, 0.02, td, x, y + 0.08, front + 0.012);
  b.add(CONE4, td, x, y + 0.48, front + 0.012, 0.1, 0.16, 0.01);
  b.box(0.012, 0.36, 0.024, IRON_D, x, y + 0.08, front + 0.014);
  for (let i = 0; i < 3; i++) b.box(0.6, 0.03 * (3 - i), 0.08, PAVE, x, y, front + 0.04 + i * 0.08);
};
// The hall: string course, roof, chimneys and smoke, windows, buttresses and pinnacles, banners; the porch; the flag.
const parliamentHall = (ctx, y) => {
  const { b, t, td, extra } = ctx, { x0, x1, z0, z1 } = HALL;
  const width = x1 - x0, depth = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const wallTop = brickBlock(b, cx, cz, width, depth, 0.92, { y });
  b.box(width + 0.02, 0.03, depth + 0.02, BUFF, cx, y + 0.52, cz);
  slateRoof(b, cx, wallTop, cz, width + 0.06, depth + 0.1, 0.46);
  for (const [x, phase] of [[-1.0, 0], [0.2, 0.25]]) {
    smoke(extra, x, chimney(b, x, wallTop + 0.22, cz + 0.12, 0.36, 0.12), cz + 0.12, [phase, phase + 0.5]);
  }
  hallFront(b, t, y, wallTop);
  hallPorch(b, t, td, y);
  flag(ctx, x0 + 0.2, wallTop + 0.44, cz, 0.5, IRON);
};
// The clock faces on the two faces of the clock stage the camera sees: a gilded rim, the white dial, the hands.
const clockFaces = (b, x, z, stageWidth, clockY) => {
  for (const ry of [0, Math.PI / 2]) {
    const at = onFace(x, z, ry), [rimX, rimZ] = at(0, stageWidth / 2), [dialX, dialZ] = at(0, stageWidth / 2 + 0.008);
    const [hourX, hourZ] = at(0, stageWidth / 2 + 0.016), [minuteX, minuteZ] = at(0.03, stageWidth / 2 + 0.016);
    b.add(DISC, C.gold, rimX, clockY, rimZ, 0.2, 0.014, 0.2, Math.PI / 2, 0, -ry);
    b.add(DISC, CLOCK, dialX, clockY, dialZ, 0.17, 0.012, 0.17, Math.PI / 2, 0, -ry);
    b.box(0.016, 0.12, 0.01, C.dark, hourX, clockY - 0.01, hourZ, 0, ry);
    b.box(0.08, 0.016, 0.01, C.dark, minuteX, clockY, minuteZ, 0, ry);
  }
};
// The clock tower: shaft, quoins, slit windows, the team frieze, the clock stage and faces, pinnacles, the spire.
// Returns the spire's top.
const clockTower = (ctx, y) => {
  const { b, mast, t } = ctx, x = 0.92, z = -0.69, width = 0.52, shaftTop = brickBlock(b, x, z, width, width, 2.12, { y });
  for (const [qx, qz] of [[1, 1], [-1, 1], [1, -1]]) {
    b.box(0.04, 2.1, 0.04, BUFF, x + qx * width / 2, y + 0.08, z + qz * width / 2); // quoins
  }
  for (const sillY of [0.5, 0.95, 1.4, 1.85]) {
    lancet(b, x, sillY, z + width / 2 + 0.01, 0, 0.06, 0.18);
    lancet(b, x + width / 2 + 0.01, sillY, z, Math.PI / 2, 0.06, 0.18);
  }
  b.box(width + 0.04, 0.08, width + 0.04, t, x, shaftTop - 0.08, z);
  const stageWidth = 0.6;
  b.box(stageWidth, 0.5, stageWidth, BUFF, x, shaftTop, z);
  b.box(stageWidth + 0.04, 0.04, stageWidth + 0.04, BUFF_D, x, shaftTop + 0.5, z);
  clockFaces(b, x, z, stageWidth, shaftTop + 0.25);
  for (const [qx, qz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const px = x + qx * (stageWidth / 2 - 0.035), pz = z + qz * (stageWidth / 2 - 0.035);
    b.box(0.07, 0.12, 0.07, BUFF, px, shaftTop + 0.54, pz);
    b.add(CONE4, BUFF, px, shaftTop + 0.76, pz, 0.05, 0.2, 0.05, 0, Math.PI / 4, 0);
  }
  const spireY = shaftTop + 0.54, spireHeight = 0.8, spireRadius = (stageWidth / 2 - 0.02) * Math.SQRT2;
  b.add(CONE4, SLATE, x, spireY + spireHeight / 2, z, spireRadius, spireHeight, spireRadius, 0, Math.PI / 4, 0);
  mast.cylT(0.006, 0.02, 0.4, C.gold, x, spireY + spireHeight - 0.06, z, 6);
  mast.add(BALL, C.gold, x, spireY + spireHeight + 0.2, z, 0.025, 0.025, 0.025);
  return spireY + spireHeight;
};
// The forecourt: path, lawns, the statue, the flower bed, lamps and railings.
const forecourt = (b, h, t, y) => {
  const x = PORCH_X;
  b.box(0.5, 0.01, h - PORCH_FRONT, GRAVEL, x, y, (PORCH_FRONT + h) / 2);
  b.box(x - 0.25 + h - 0.04, 0.012, 1.2, GRASS, (x - 0.25 - h + 0.04) / 2, y, 0.62);
  b.box(h - 0.04 - x - 0.25, 0.012, 1.2, GRASS, (x + 0.25 + h - 0.04) / 2, y, 0.62);
  // The statue on its plinth (P.bronze is not in the palette, so it comes out in the builder's default colour).
  const statueX = 0.45, statueZ = 0.5;
  b.box(0.22, 0.28, 0.22, BUFF, statueX, y, statueZ);
  b.box(0.26, 0.04, 0.26, BUFF_D, statueX, y + 0.28, statueZ);
  b.cylT(0.04, 0.06, 0.2, P.bronze, statueX, y + 0.32, statueZ, 6);
  b.add(BALL, P.bronze, statueX, y + 0.57, statueZ, 0.04, 0.045, 0.04);
  stick(b, 0.02, P.bronze, [statueX + 0.03, y + 0.48, statueZ], [statueX + 0.12, y + 0.6, statueZ + 0.03], unit.box);
  b.box(0.5, 0.03, 0.22, t, -1.0, y + 0.012, 0.62); // flower bed
  b.box(0.54, 0.04, 0.26, HEDGE, -1.0, y, 0.62); // its hedge
  for (const lampX of [x - 0.3, x + 0.3]) gasLamp(b, lampX, 1.1, 0.5);
  const edge = h - 0.05;
  railings(b, [-h + 0.06, edge], [x - 0.3, edge]);
  railings(b, [x + 0.3, edge], [edge, edge]);
  railings(b, [edge, edge], [edge, -0.2]);
  for (const pierX of [-h + 0.06, x - 0.3, x + 0.3, edge]) brickPier(b, pierX, edge, 0.3);
};

// Government Center: a clock-tower parliament. A Victorian Gothic hall of red brick with buff stone dressings: two
// storeys of pointed windows between buttresses that rise into pinnacles, a steep crested slate roof with smoking
// chimneys, and a gabled buff porch with a pointed team doorway, a team band and team banners either side. At its +x end
// rises the clock tower: brick with buff quoins and slit windows, a team frieze under the clock stage, clock faces, corner
// pinnacles and a steep slate spire with a gilded tip; the flag flies over the hall. In the forecourt, lawns either side
// of the path, a statue, a team flower bed, gas lamps and iron railings along the front.
export function government_center(ctx) {
  const { b, s, h, t } = ctx, y = 0.03;
  b.box(s, y, s, PAVE);
  parliamentHall(ctx, y);
  const top = clockTower(ctx, y);
  forecourt(b, h, t, y);
  return top;
}

// ---------- Wonder ----------
// The lattice tower's profile: [height, half-width of its outer corners] from the piers to the top.
const TOWER_PROFILE = [
  [0.2, 1.5], [0.55, 1.25], [0.9, 1.05], [1.3, 0.88], [1.8, 0.7], [2.3, 0.56], [2.8, 0.43], [3.35, 0.31], [3.9, 0.21],
  [4.4, 0.14], [4.85, 0.1],
];
// The two platforms' heights and the top's.
const PLATFORM_1 = 1.3, PLATFORM_2 = 2.8, TOWER_TOP = 4.85;
// The tower's outer half-width at height y, interpolated along the profile.
const towerHalfWidth = y => {
  for (let i = 1; i < TOWER_PROFILE.length; i++) {
    if (y > TOWER_PROFILE[i][0] + 1e-9) continue;
    const [ya, wa] = TOWER_PROFILE[i - 1], [yb, wb] = TOWER_PROFILE[i];
    return wa + (wb - wa) * (y - ya) / (yb - ya);
  }
  return TOWER_PROFILE[TOWER_PROFILE.length - 1][1];
};
// How wide each leg's lattice column is at height y, tapering to the second platform.
const legWidth = y => y <= PLATFORM_1
  ? 0.44 - 0.18 * (y - 0.2) / (PLATFORM_1 - 0.2)
  : 0.26 - 0.09 * (y - PLATFORM_1) / (PLATFORM_2 - PLATFORM_1);
// A square lattice column from fromY to toY in `stories` stories: corner chords of radius chordRadius and a cross brace
// of radius braceRadius on each of its four faces; corners(y) gives its four [x, z] corners at height y.
const latticeColumn = (b, corners, fromY, toY, stories, chordRadius, braceRadius) => {
  for (let i = 0; i < stories; i++) {
    const y0 = fromY + (toY - fromY) * i / stories, y1 = fromY + (toY - fromY) * (i + 1) / stories;
    const below = corners(y0), above = corners(y1);
    for (let k = 0; k < 4; k++) {
      const next = (k + 1) % 4, a0 = [below[k][0], y0, below[k][1]], a1 = [above[k][0], y1, above[k][1]];
      const b0 = [below[next][0], y0, below[next][1]], b1 = [above[next][0], y1, above[next][1]];
      stick(b, chordRadius, TOWER, a0, a1, unit.box);
      stick(b, braceRadius, TOWER_L, a0, b1, unit.box);
      stick(b, braceRadius, TOWER_L, b0, a1, unit.box);
    }
  }
};
// The park: walks, the circle under the tower, team flower beds in their hedges and lamps.
const towerPark = (b, s, t, y) => {
  b.box(0.4, 0.01, s, GRAVEL, 0, y, 0);
  b.box(s, 0.01, 0.4, GRAVEL, 0, y, 0);
  b.cylT(0.62, 0.62, 0.012, GRAVEL, 0, y, 0, 16);
  const beds = [[0.75, 1.55, 0.6, 0.24], [-0.75, 1.55, 0.6, 0.24], [1.55, 0.75, 0.24, 0.6], [1.55, -0.75, 0.24, 0.6]];
  for (const [x, z, width, depth] of beds) {
    b.box(width + 0.04, 0.04, depth + 0.04, HEDGE, x, y, z);
    b.box(width, 0.05, depth, t, x, y, z);
  }
  for (const [x, z] of [[0.3, 1.6], [-0.3, 1.6], [1.6, 0.3], [1.6, -0.3]]) gasLamp(b, x, z, 0.5);
};
// The legs: square lattice columns from the piers to the second platform, then the shaft to the top; the great arches
// between the legs under the first platform.
const towerLegs = (b, y) => {
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const leg = height => {
      const outer = towerHalfWidth(height), inner = outer - legWidth(height);
      return [[sx * outer, sz * outer], [sx * inner, sz * outer], [sx * inner, sz * inner], [sx * outer, sz * inner]];
    };
    b.box(0.56, 0.17, 0.56, BUFF, sx * 1.28, y, sz * 1.28); // pier
    b.box(0.6, 0.03, 0.6, BUFF_D, sx * 1.28, y, sz * 1.28);
    latticeColumn(b, leg, 0.2, PLATFORM_1, 6, 0.045, 0.02);
    latticeColumn(b, leg, PLATFORM_1, PLATFORM_2, 7, 0.04, 0.018);
  }
  const shaft = height => { const w = towerHalfWidth(height); return [[w, w], [-w, w], [-w, -w], [w, -w]]; };
  latticeColumn(b, shaft, PLATFORM_2, TOWER_TOP, 9, 0.035, 0.014);
  for (const [ry, side] of [[0, 1], [0, -1], [Math.PI / 2, 1], [Math.PI / 2, -1]]) {
    b.add(BIG_ARCH, TOWER, ry ? side * 0.98 : 0, 0.42, ry ? 0 : side * 0.98, 0.95, 0.84, 1, 0, ry, 0);
  }
};
// The platforms, their team friezes, rails and balusters; the kiosks on the first.
const towerPlatforms = (b, t) => {
  const platforms = [[PLATFORM_1, towerHalfWidth(PLATFORM_1) + 0.1], [PLATFORM_2, towerHalfWidth(PLATFORM_2) + 0.08]];
  for (const [platformY, w] of platforms) {
    b.box(2 * w, 0.06, 2 * w, TOWER, 0, platformY, 0);
    for (const side of [-1, 1]) {
      b.box(2 * w + 0.03, 0.1, 0.03, t, 0, platformY - 0.03, side * w);
      b.box(0.03, 0.1, 2 * w + 0.03, t, side * w, platformY - 0.03, 0);
    }
    for (const side of [-1, 1]) {
      b.box(2 * w, 0.015, 0.015, TOWER, 0, platformY + 0.16, side * w);
      b.box(0.015, 0.015, 2 * w, TOWER, side * w, platformY + 0.16, 0);
    }
    for (let i = 0; i < 4; i++) for (const side of [-1, 1]) {
      const u = -w + (i + 0.5) * w / 2;
      b.box(0.012, 0.1, 0.012, TOWER, u, platformY + 0.06, side * w);
      b.box(0.012, 0.1, 0.012, TOWER, side * w, platformY + 0.06, u);
    }
  }
  const kioskOffset = towerHalfWidth(PLATFORM_1) - 0.18;
  const kiosks = [[0, kioskOffset, 0], [kioskOffset, 0, Math.PI / 2], [0, -kioskOffset, 0], [-kioskOffset, 0, Math.PI / 2]];
  for (const [x, z, ry] of kiosks) {
    b.box(0.56, 0.16, 0.14, ROOF_GLASS_D, x, PLATFORM_1 + 0.06, z, 0, ry);
    b.box(0.6, 0.03, 0.18, TOWER_L, x, PLATFORM_1 + 0.22, z, 0, ry);
  }
};

// Wonder: an iron lattice tower. On four buff stone piers in a park, four latticed iron legs, braced on every face, curve
// in and up to the first platform, joined below it by great ornamental arches; on up to the second platform, then they
// merge into the tapering shaft, its lattice rising to the glazed lantern at the top, which carries the flag. Team-painted
// friezes run round both platforms, with kiosks on the first. Below, gravel walks cross the lawns, with team flower beds
// and gas lamps.
export function wonder(ctx) {
  const { b, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, GRASS);
  towerPark(b, s, t, y);
  towerLegs(b, y);
  towerPlatforms(b, t);
  // The top: its little deck, the glazed lantern and dome, the flag.
  b.box(0.28, 0.04, 0.28, TOWER, 0, TOWER_TOP, 0);
  b.cylT(0.09, 0.09, 0.18, ROOF_GLASS, 0, TOWER_TOP + 0.04, 0, 8);
  b.cylT(0.11, 0.11, 0.02, TOWER, 0, TOWER_TOP + 0.22, 0, 8);
  b.add(DOME, TOWER_L, 0, TOWER_TOP + 0.24, 0, 0.1, 0.09, 0.1);
  b.add(BALL, td, 0, TOWER_TOP + 0.34, 0, 0.025, 0.025, 0.025);
  flag(ctx, 0, TOWER_TOP + 0.35, 0, 0.55, IRON_D);
  return TOWER_TOP + 0.36;
}

// ---------- Castle ----------
// A domed iron gun turret for place(), built at the origin standing on y = 0 with its guns along +x: a granite base
// ring, the iron drum with its team band, the shallow dome and sighting hood, and twin guns run out of their mantlets.
const turret = t => {
  const g = new B();
  g.cylT(0.3, 0.31, 0.06, GRANITE_D, 0, 0, 0, 12);
  g.cylT(0.27, 0.27, 0.2, IRON, 0, 0.06, 0, 12);
  g.cylT(0.275, 0.275, 0.045, t, 0, 0.17, 0, 12);
  g.add(DOME, IRON, 0, 0.26, 0, 0.27, 0.12, 0.27);
  g.box(0.1, 0.05, 0.08, IRON_D, -0.06, 0.36, 0);
  for (const side of [-1, 1]) {
    g.box(0.07, 0.08, 0.07, IRON_D, 0.25, 0.13, side * 0.08);
    stick(g, 0.035, GUN, [0.18, 0.17, side * 0.08], [0.6, 0.18, side * 0.08], CYL8);
  }
  return g;
};
// The fort's octagon: an eighth of a turn, and its cosine (an octagon's apothem over its circumradius).
const OCTANT = Math.PI / 8, COS_OCTANT = Math.cos(OCTANT);
// The fort's walls: their circumradius, height and top, the apothem (from the centre to the middle of a face) and the
// length of a face.
const FORT = { radius: 1.46, wallHeight: 0.78 };
FORT.apothem = FORT.radius * COS_OCTANT;
FORT.faceLength = 2 * FORT.radius * Math.sin(OCTANT);
// The glacis, the walls, the cordon, the parapet.
const fortWalls = (b, y, wallTop) => {
  const { radius, wallHeight, apothem, faceLength } = FORT;
  b.cylT(1.72, 1.86, 0.14, GRASS_D, 0, y, 0, 8, 0, OCTANT, 0);
  b.cylT(radius + 0.04, radius + 0.06, 0.1, GRANITE_D, 0, y, 0, 8, 0, OCTANT, 0);
  b.cylT(radius, radius, wallHeight, GRANITE, 0, y, 0, 8, 0, OCTANT, 0);
  b.cylT(radius + 0.02, radius + 0.02, 0.05, BUFF, 0, wallTop - 0.08, 0, 8, 0, OCTANT, 0);
  for (let i = 0; i < 8; i++) {
    const facing = i * Math.PI / 4, x = Math.sin(facing) * (apothem - 0.06), z = Math.cos(facing) * (apothem - 0.06);
    b.box(faceLength, 0.12, 0.12, GRANITE_D, x, wallTop, z, 0, facing);
  }
};
// The armour on a face of the fort facing `facing`, its bands and straps, and its gun ports with the muzzles run out
// (set wider on the gate face).
const armouredFace = (b, y, facing) => {
  const { apothem, faceLength } = FORT, at = onFace(0, 0, facing), [px, pz] = at(0, apothem + 0.017), gate = facing === 0;
  b.box(faceLength * 0.86, 0.4, 0.035, IRON_D, px, y + 0.18, pz, 0, facing);
  for (const bandY of [0.18, 0.56]) {
    const [bx, bz] = at(0, apothem + 0.036);
    b.box(faceLength * 0.86, 0.025, 0.012, IRON, bx, y + bandY, bz, 0, facing);
  }
  for (const u of gate ? [-0.38, 0.38] : [-0.32, 0.32]) {
    const [sx, sz] = at(u, apothem + 0.036);
    b.box(0.012, 0.4, 0.012, IRON, sx, y + 0.18, sz, 0, facing);
  }
  for (const u of gate ? [-0.24, 0.24] : [-0.16, 0.16]) {
    const [portX, portZ] = at(u, apothem + 0.036), [muzzleX, muzzleZ] = at(u, apothem + 0.13);
    b.box(0.1, 0.09, 0.01, C.dark, portX, y + 0.34, portZ, 0, facing);
    stick(b, 0.03, GUN, [portX, y + 0.385, portZ], [muzzleX, y + 0.385, muzzleZ], CYL8);
  }
};
// The iron gate with its team panel in the front face, and the gravel road out from it.
const fortGate = (b, h, t, y) => {
  const z = FORT.apothem + 0.04;
  b.box(0.26, 0.28, 0.02, IRON, 0, y + 0.1, z);
  b.add(ARCH, IRON, 0, y + 0.38, z, 0.13, 0.13, 1);
  b.add(ARCH_RING, BUFF, 0, y + 0.38, z + 0.004, 0.15, 0.15, 0.2);
  b.box(0.14, 0.12, 0.024, t, 0, y + 0.18, z + 0.002);
  b.box(0.012, 0.28, 0.026, IRON_D, 0, y + 0.1, z + 0.004);
  b.box(0.34, 0.012, h - z, GRAVEL, 0, y + 0.14, (z + h) / 2);
};
// The keep: walls, band, shuttered windows, chimneys and smoke, the cupola, the flag. Returns its wall top.
const fortKeep = (ctx, wallTop) => {
  const { b, extra } = ctx, radius = 0.52, height = 0.62, top = wallTop + height, apothem = radius * COS_OCTANT;
  b.cylT(radius, radius, height, BRICK, 0, wallTop, 0, 8, 0, OCTANT, 0);
  b.cylT(radius + 0.03, radius + 0.03, 0.05, BUFF, 0, top - 0.05, 0, 8, 0, OCTANT, 0);
  for (const facing of [0, Math.PI / 4, Math.PI / 2]) {
    const at = onFace(0, 0, facing);
    for (const sillY of [wallTop + 0.12, wallTop + 0.36]) {
      const [x, z] = at(0, apothem + 0.008);
      b.box(0.09, 0.15, 0.02, IRON_D, x, sillY, z, 0, facing); // shutter
      b.box(0.11, 0.03, 0.03, BUFF, x, sillY + 0.15, z, 0, facing); // lintel
    }
  }
  for (const [x, z, phase] of [[-0.26, -0.12, 0], [0.12, -0.3, 0.25]]) {
    smoke(extra, x, chimney(b, x, top, z, 0.3, 0.1), z, [phase, phase + 0.5]);
  }
  b.cylT(0.12, 0.12, 0.08, IRON, 0.18, top, 0.12, 10); // the observation cupola
  b.add(DOME, IRON_D, 0.18, top + 0.08, 0.12, 0.12, 0.08, 0.12);
  flag(ctx, -0.1, top, 0.28, 0.7, IRON);
  return top;
};

// Castle: an armoured fortress with gun turrets. A massive octagonal fort of granite on a grass glacis: its walls are
// faced in black iron armour, each face pierced by gun ports with the muzzles run out, under a buff cordon and a granite
// parapet. Four domed iron gun turrets, team-banded, with twin guns stand on the ramparts at the diagonals; at the centre
// the brick keep with iron-shuttered windows, its smoking chimneys, an iron observation cupola and the flagstaff. An iron
// gate with a team panel opens in the front face onto a gravel road.
export function castle(ctx) {
  const { b, s, h, t } = ctx, y = 0.03, wallTop = y + FORT.wallHeight;
  b.box(s, y, s, GRASS);
  fortWalls(b, y, wallTop);
  // The armour on the faces the camera sees.
  for (const facing of [-Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) armouredFace(b, y, facing);
  fortGate(b, h, t, y);
  // The turrets on the ramparts at the diagonals.
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    place(b, turret(t), sx * 0.66, wallTop, sz * 0.66, -Math.atan2(sz, sx));
  }
  return fortKeep(ctx, wallTop) + 0.42;
}

// ---------- Industrial defences ----------
// The machine-gun nest's tower: its width, and the gun's aim (a unit vector toward the camera side) and its yaw.
const NEST_WIDTH = 1.05, GUN_AIM = [0.447, 0, 0.894], GUN_YAW = Math.atan2(GUN_AIM[0], GUN_AIM[2]);
// The brick tower: string courses, the team band, windows on the two faces the camera sees, the team door; the iron
// ladder up the +x face. Returns the wall top.
const nestTower = (b, t) => {
  const width = NEST_WIDTH, half = width / 2, top = brickBlock(b, 0, 0, width, width, 2.0);
  for (const y of [0.75, 1.42]) b.box(width + 0.02, 0.05, width + 0.02, BUFF, 0, y, 0);
  b.box(width + 0.025, 0.1, width + 0.025, t, 0, 1.8, 0);
  ironWindowRows(b, 0, half, 0, width, 2, [0.95, 1.55], 0.12, 0.22);
  ironWindowRows(b, half, 0, Math.PI / 2, width, 2, [0.95, 1.55], 0.12, 0.22);
  b.box(0.3, 0.54, 0.02, IRON_D, 0, 0.11, half + 0.006); // door frame
  b.box(0.24, 0.5, 0.02, t, 0, 0.11, half + 0.012); // door
  b.box(0.36, 0.06, 0.03, BUFF, 0, 0.65, half + 0.012); // lintel
  const ladderX = half + 0.05;
  for (const z of [-0.2, -0.38]) b.box(0.02, top + 0.3 - 0.11, 0.02, IRON_D, ladderX, 0.11, z);
  for (let y = 0.3; y < top + 0.3; y += 0.16) b.box(0.016, 0.016, 0.18, IRON, ladderX, y, -0.29);
  return top;
};
// The Maxim gun at (x, gunY, z) on its tripod (feet on deckY), firing over the bags along GUN_AIM, behind a steel
// shield with a team band. `along(f)` is the point f along the barrel's line.
const maximGun = (b, t, x, z, deckY, gunY, along) => {
  for (const a of [GUN_YAW + Math.PI, GUN_YAW + Math.PI / 3, GUN_YAW - Math.PI / 3]) {
    stick(b, 0.014, IRON_D, [x + Math.sin(a) * 0.2, deckY, z + Math.cos(a) * 0.2], [x, gunY - 0.04, z], CYL6);
  }
  const [bodyX, , bodyZ] = along(-0.04), [shieldX, , shieldZ] = along(0.14);
  b.box(0.09, 0.09, 0.24, GUN, bodyX, gunY - 0.045, bodyZ, 0, GUN_YAW);
  stick(b, 0.045, IRON, along(0.08), along(0.4), CYL8); // water jacket
  stick(b, 0.022, GUN, along(0.4), along(0.48), CYL6); // muzzle
  b.box(0.34, 0.2, 0.02, IRON_D, shieldX, gunY - 0.12, shieldZ, 0, GUN_YAW);
  b.box(0.3, 0.04, 0.024, t, shieldX, gunY - 0.02, shieldZ, 0, GUN_YAW);
};
// The gun's burst (extra.fire): a flash at the muzzle and a tracer streaking on from it.
const gunBurst = muzzle => {
  const fire = new B(), aim = GUN_AIM;
  muzzleFlash(fire, muzzle, aim, 1.6);
  const from = [muzzle[0] + aim[0] * 0.4, muzzle[1], muzzle[2] + aim[2] * 0.4];
  const to = [muzzle[0] + aim[0] * 1.2, muzzle[1] - 0.1, muzzle[2] + aim[2] * 1.2];
  streak(fire, from, to, 0.02, undefined, P.ember, 0.05);
  return { geo: fire.geometry(), at: [0, 0, 0] };
};

// Tower: a machine-gun nest on a brick tower. A square brick tower on a blue-brick plinth with buff string courses, a
// team band and cast-iron windows, a team-painted iron door at its foot and an iron ladder up its side. Its corbelled
// top is ringed with sandbags round a Maxim gun on its tripod behind a steel shield, ammunition boxes stencilled in
// team colour beside it, a searchlight on the back corner and the flag. Its shot is the gun's burst: a muzzle flash and
// a tracer (extra.fire), which blinks as the gun keeps firing.
export function tower(ctx) {
  const { b, t, extra } = ctx, width = NEST_WIDTH;
  b.box(1.76, 0.03, 1.76, SETT);
  const top = nestTower(b, t);
  // The corbelled deck and its ring of sandbags.
  b.box(width + 0.12, 0.06, width + 0.12, BRICK_D, 0, top, 0);
  b.box(width + 0.22, 0.07, width + 0.22, BUFF_D, 0, top + 0.06, 0);
  const deckY = top + 0.13, edge = (width + 0.22) / 2 - 0.06;
  const corners = [[-edge, edge], [edge, edge], [edge, -edge], [-edge, -edge]];
  for (let i = 0; i < 4; i++) sandbags(b, corners[i], corners[(i + 1) % 4], 3, deckY);
  const gunX = 0.02, gunZ = 0.06, gunY = deckY + 0.27, along = f => [gunX + GUN_AIM[0] * f, gunY, gunZ + GUN_AIM[2] * f];
  maximGun(b, t, gunX, gunZ, deckY, gunY, along);
  for (const [x, z] of [[-0.3, 0.18], [-0.3, 0.36]]) crate(b, x, deckY, z, 0.13, 0.3, t);
  searchlight(b, -0.36, deckY, -0.36, [0.62, 0.22, 0.75]);
  flag(ctx, 0.44, deckY, -0.44, 0.85, IRON);
  extra.fire = gunBurst(along(0.5));
  return deckY + 0.4;
}

// Wall: sandbags and barbed wire. Three courses of sandbags laid in bond, alternately along x and along z, on the bare
// ground, with team-painted iron pickets carrying a zigzag of barbed wire along the top both ways; it fills its tile
// edge to edge, so segments in a line close up into one breastwork and the wire runs on from one to the next.
export function wall(ctx) {
  const { b, t } = ctx, courseHeight = 0.13;
  for (let course = 0; course < 3; course++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const along = (i - 1) * 0.34, across = (j - 0.5) * 0.52, [x, z] = course % 2 ? [across, along] : [along, across];
    const jitter = hash(i + course * 3, j), [cellWidth, cellDepth] = course % 2 ? [0.48, 0.32] : [0.32, 0.48];
    // The outer bags lie flush with the tile's edge; the rest sit a little apart.
    const bagWidth = cellWidth - 0.02 - jitter * 0.02, bagDepth = cellDepth - 0.02 - jitter * 0.015;
    const bagX = x + Math.sign(x) * (cellWidth - bagWidth) / 2, bagZ = z + Math.sign(z) * (cellDepth - bagDepth) / 2;
    b.box(bagWidth, courseHeight - 0.01, bagDepth, jitter > 0.55 ? SAND_D : SAND, bagX, course * courseHeight, bagZ);
  }
  const y = 3 * courseHeight - 0.01;
  for (const [x, z] of [[-0.245, 0], [0.245, 0], [0, -0.245], [0, 0.245]]) b.box(0.03, 0.34, 0.03, t, x, y, z);
  // The barbed wire zigzagging between the pickets, along x and then along z.
  for (const alongZ of [0, 1]) for (let i = 0; i < 4; i++) {
    const u0 = -0.49 + i * 0.245, u1 = u0 + 0.245, y0 = y + (i % 2 ? 0.3 : 0.06), y1 = y + (i % 2 ? 0.06 : 0.3);
    stick(b, 0.015, CORR, alongZ ? [0, y0, u0] : [u0, y0, 0], alongZ ? [0, y1, u1] : [u1, y1, 0], unit.box);
  }
  return y + 0.34;
}
