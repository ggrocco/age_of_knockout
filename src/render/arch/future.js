// AI Future: floating rings and plates, a chrome spire, neon edges, orbiting drones. White panels and dark glass under
// cyan and magenta neon, domes and crystal spires, parts that hover or turn: a twisting vertical-farm tower, a cube store
// on a glowing pedestal, hydroponic beds under grow lights, a drone bay with charging pods, a laser range with hologram
// targets, a hover-bike dock, a holo-kiosk plaza, a glowing data core, a floating crystal megastructure, an energy-dome
// fortress and a nanofab with floating arms; for defence, a laser turret under a turning ring and an energy barrier.
import * as THREE from 'three';
import { B, unit } from '../builder.js';
import { P, ring, stick, hash, place, flag, HOT, BALL, CYL6, CYL8, DISC } from './kit.js';

// ---------- the AI Future palette ----------
// The Town Center's and House's white, chrome, dark glass and neon, plus deeper glass, pale panels, deck paving and a
// dark apron, nutrient water and nanite fluid.
const SNOW = P.snow, CHROME = P.chrome, DARK = P.dark, CYAN = P.neonC, MAGENTA = P.neonM;
const GLASS = 0x1b2833, PANEL = 0xc9d3da, PAVE = 0xe2e7ea, GRID = 0x8f9ea8, APRON = 0x34414b, WATER = 0x1d6f8f;
const FLUID = 0x2a8fa8;
const LEAF = 0x46b856, LEAF_L = 0x8bdc62, GOLD = 0xf2c230, LOG = 0x7a5230, ROCK = 0x8f8c84;
// A hemisphere, flat side down at y = 0, and a crystal (a flat-shaded octahedron).
const DOME = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), GEM = new THREE.OctahedronGeometry(1, 0);
// A half cylinder of radius 1 and length 1 along y, the half with x ≥ 0 (open on its flat side); turned π/2 about z it
// lies along x with its curve up, for vaults.
const VAULT = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI);

// ---------- House and Town Center ----------
// A small drone for the House's floater: a chrome ball over a cyan glow.
const houseDrone = () => new B().sph(0.08, CHROME).add(unit.cyl, CYAN, 0, -0.06, 0, 0.12, 0.015, 0.12).geometry();

export function house(ctx) {
  const { b, extra, t } = ctx;
  // A pod on a chrome stem; the neon edge ring sits flush under the dark base disc.
  b.cylT(0.64, 0.64, 0.03, MAGENTA, 0, 0.0, 0, 24);
  b.cyl(0.62, 0.06, DARK);
  b.cylT(0.07, 0.15, 0.75, CHROME, 0, 0.05, 0, 10);
  b.sph(0.5, SNOW, 0, 1.05, 0, 1.15, 0.72, 1.15); // the pod
  b.sph(0.505, DARK, 0, 1.08, 0, 1.16, 0.22, 1.16); // its window band
  b.box(0.2, 0.05, 0.05, t, 0, 1.36, 0.42);
  extra.floaters = [
    { geo: ring(0.68, 0.035, CYAN), at: [0, 1.05, 0], amp: 0.1, speed: 1.4 },
    { geo: houseDrone(), at: [0.75, 1.6, 0.4], amp: 0.15, speed: 2.2, phase: 1 },
  ];
  extra.spinners = [{ geo: ring(0.82, 0.02, MAGENTA, 0.35), at: [0, 1.05, 0], axis: 'y', speed: 0.9 }];
  return 1.41;
}

// The Town Center's three orbiting drones, built round the origin for a spinner.
const orbitingDrones = () => {
  const drones = new B();
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3, x = Math.cos(a) * 1.55, z = Math.sin(a) * 1.55;
    drones.sph(0.09, CHROME, x, 0, z);
    drones.add(unit.cyl, CYAN, x, -0.07, z, 0.14, 0.015, 0.14);
  }
  return drones.geometry();
};
// A hovering landing plate `size` wide with a neon rim in `glow`.
const landingPlate = (size, glow) => {
  const plate = new B().box(size, 0.05, size, SNOW);
  return plate.box(size + 0.02, 0.02, size + 0.02, glow, 0, -0.02, 0).geometry();
};

// Neon-edged plinth and dome, the chrome spire with its glowing tip (solid, so it stays in the body), three pylons.
const townCenterBody = (b, t) => {
  b.cylT(1.25, 1.35, 0.25, SNOW, 0, 0, 0, 24);
  b.cylT(1.36, 1.36, 0.04, CYAN, 0, 0.12, 0, 24);
  b.sph(0.85, SNOW, 0, 0.25, 0, 1, 0.65, 1);
  b.sph(0.86, DARK, 0, 0.42, 0, 1, 0.18, 1);
  b.cylT(0.1, 0.42, 2.7, CHROME, 0, 0.25, 0, 8);
  b.sph(0.13, CYAN, 0, 3.0, 0);
  b.box(0.26, 0.5, 0.03, t, 0, 1.4, 0.25);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    b.box(0.1, 0.9, 0.1, CHROME, Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0);
    b.box(0.14, 0.04, 0.14, MAGENTA, Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0);
  }
};

export function town_center(ctx) {
  const { b, extra, t } = ctx;
  townCenterBody(b, t);
  // Two counter-rotating rings and three orbiting drones.
  const drones = orbitingDrones();
  extra.spinners = [
    { geo: ring(1.15, 0.04, CYAN, 0.3), at: [0, 1.8, 0], axis: 'y', speed: 0.8 },
    { geo: ring(1.45, 0.03, MAGENTA, -0.25), at: [0, 1.3, 0], axis: 'y', speed: -0.6 },
    { geo: drones, at: [0, 2.3, 0], axis: 'y', speed: 1.3 },
  ];
  // Two hovering landing plates.
  extra.floaters = [
    { geo: landingPlate(0.55, MAGENTA), at: [-1.0, 1.6, 0.6], amp: 0.12, speed: 1.3 },
    { geo: landingPlate(0.45, CYAN), at: [0.95, 2.0, -0.7], amp: 0.1, speed: 1.7, phase: 2 },
  ];
  // A small flag flies from the glowing tip; there is no pole.
  extra.flag = new B().box(0.02, 0.24, 0.4, t, 0, 0, 0.2).geometry();
  extra.flagAt = [0, 3.1, 0];
  return 3.13;
}

// ---------- shared AI Future parts ----------
// A thin, cheap torus of `radius` centred at (x, y, z); flat (rx = π/2) by default, or upright in the xy plane turned
// ry about y (rx = 0). arc < 2π draws an arch from +x up over the top.
const hoop = (b, radius, tube, color, x = 0, y = 0, z = 0, rx = Math.PI / 2, ry = 0, segments = 24, arc = Math.PI * 2) => {
  const g = new THREE.TorusGeometry(radius, tube, 3, segments, arc);
  b.add(g, color, x, y, z, 1, 1, 1, rx, ry, 0);
  g.dispose();
  return b;
};
// A white slab width × depth and `height` tall standing on y at (x, z), turned ry, with a neon strip round it just under
// its top.
const neonSlab = (b, width, depth, height, x = 0, z = 0, y = 0, color = SNOW, edge = CYAN, ry = 0) => {
  b.box(width, height, depth, color, x, y, z, 0, ry);
  b.box(width + 0.025, 0.022, depth + 0.025, edge, x, y + height - 0.045, z, 0, ry);
};
// A point (u, v) in the frame turned ry about y round (x, z).
const turnedFrame = (x, z, ry) => (u, v) => [x + u * Math.cos(ry) + v * Math.sin(ry), z - u * Math.sin(ry) + v * Math.cos(ry)];
// A drone for a floater, centred on the origin and scaled by `size`: a chrome pod on four rotors, a glow under it.
// Returns its B, so a cargo can hang from it.
const drone = (glow = CYAN, size = 1) => {
  const g = new B();
  g.add(BALL, CHROME, 0, 0, 0, 0.08 * size, 0.045 * size, 0.08 * size);
  g.add(CYL8, glow, 0, -0.04 * size, 0, 0.05 * size, 0.012 * size, 0.05 * size);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 0.12 * size, z = Math.sin(a) * 0.12 * size;
    g.box(0.12 * size, 0.012 * size, 0.018 * size, DARK, x / 2, -0.006 * size, z / 2, 0, -a); // the rotor's arm
    g.add(CYL8, GRID, x, 0.008 * size, z, 0.05 * size, 0.008 * size, 0.05 * size); // the rotor
  }
  return g;
};
// A crate of greens `width` wide standing on y: a white tub, its team or neon band, leaves heaped on top.
const greensCrate = (b, x, y, z, width, band) => {
  b.box(width, width * 0.6, width, SNOW, x, y, z);
  b.box(width + 0.006, 0.02, width + 0.006, band, x, y + width * 0.3, z);
  b.add(GEM, LEAF, x, y + width * 0.62, z, width * 0.42, width * 0.18, width * 0.42);
};

// ---------- Granary ----------
// The vertical farm's footprint centre, its first floor and each storey's height, and how many storeys it has.
const FARM_TOWER = { x: -0.16, z: -0.16, baseY: 0.16, storey: 0.46, storeys: 5 };
// The crops round a floor slab `width` wide at height `top`, turned ry: a hedge along each side, leafy tufts along it.
const slabCrops = (b, at, i, width, top, ry) => {
  const edge = width / 2 - 0.08;
  for (const side of [-1, 1]) {
    const [hedgeX, hedgeZ] = at(0, side * edge);
    b.box(width - 0.2, 0.05, 0.07, LEAF, hedgeX, top, hedgeZ, 0, ry);
    const [crossX, crossZ] = at(side * edge, 0);
    b.box(0.07, 0.05, width - 0.2, LEAF, crossX, top, crossZ, 0, ry);
    for (let m = 0; m < 4; m++) {
      const u = (m - 1.5) * (width - 0.3) / 3, color = (m + i) % 2 ? LEAF_L : LEAF;
      const [x1, z1] = at(u, side * edge);
      b.add(GEM, color, x1, top + 0.07, z1, 0.06, 0.07, 0.05, 0, ry + m);
      const [x2, z2] = at(side * edge, u);
      b.add(GEM, color, x2, top + 0.07, z2, 0.05, 0.07, 0.06, 0, ry - m);
    }
  }
};
// Storey i: its dark glass core and chrome corner posts, the floor slab over it with its grow-light strip, and the
// crops along the slab's edges. Each storey is smaller and turned a little further than the one below.
const farmStorey = (b, i) => {
  const { x, z, baseY, storey } = FARM_TOWER;
  const ry = i * 0.2, slabWidth = 1.24 - i * 0.08, coreWidth = 0.68 - i * 0.05;
  const floorY = baseY + i * storey, top = floorY + storey;
  const at = turnedFrame(x, z, ry);
  b.box(coreWidth, storey - 0.05, coreWidth, GLASS, x, floorY, z, 0, ry);
  for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const [px, pz] = at(u * coreWidth / 2, v * coreWidth / 2);
    b.box(0.03, storey - 0.05, 0.03, CHROME, px, floorY, pz, 0, ry);
  }
  b.box(slabWidth, 0.05, slabWidth, SNOW, x, top - 0.05, z, 0, ry);
  b.box(slabWidth + 0.03, 0.022, slabWidth + 0.03, i % 2 ? MAGENTA : CYAN, x, top - 0.075, z, 0, ry);
  slabCrops(b, at, i, slabWidth, top, ry);
};
// The team loading doors at the foot, under neon lintels, and crates of greens waiting by them.
const loadingDoors = (b, t) => {
  const { x, z, baseY } = FARM_TOWER, coreHalf = 0.68 / 2;
  b.box(0.28, 0.3, 0.02, t, x, baseY, z + coreHalf + 0.01);
  b.box(0.32, 0.025, 0.03, CYAN, x, baseY + 0.31, z + coreHalf + 0.01);
  b.box(0.02, 0.3, 0.28, t, x + coreHalf + 0.01, baseY, z);
  b.box(0.03, 0.025, 0.32, CYAN, x + coreHalf + 0.01, baseY + 0.31, z);
  greensCrate(b, 0.62, 0.04, 0.3, 0.16, t);
  greensCrate(b, 0.66, 0.04, 0.56, 0.15, CYAN);
  greensCrate(b, 0.4, 0.04, 0.66, 0.15, t);
  greensCrate(b, 0.64, 0.14, 0.42, 0.13, MAGENTA);
};

// Granary: a vertical-farm tower with glowing tiers. Five storeys of dark glass, each smaller and turned a little
// further than the one below, so the tower twists as it climbs; every white floor slab is lined with crops along its
// edges, lit from beneath by the next slab's grow lights, cyan and magenta in turn. A white dome with a team band caps
// it under an antenna. The team loading doors open at its foot onto crates of greens; a neon ring circles the tower
// and a drone flies a crate in.
export function granary(ctx) {
  const { b, mast, extra, s, t } = ctx, { x, z, baseY, storey, storeys } = FARM_TOWER;
  b.box(s, 0.04, s, PAVE);
  neonSlab(b, 1.34, 1.34, 0.12, x, z, 0.04);
  for (let i = 0; i < storeys; i++) farmStorey(b, i);
  // The dome, its team band and neon ring, and the antenna.
  const top = baseY + storeys * storey;
  b.cylT(0.37, 0.37, 0.06, t, x, top, z, 12);
  b.add(DOME, SNOW, x, top + 0.06, z, 0.36, 0.3, 0.36);
  hoop(b, 0.37, 0.018, CYAN, x, top + 0.08, z);
  mast.cyl(0.014, 0.42, CHROME, x, top + 0.32, z);
  mast.add(BALL, MAGENTA, x, top + 0.76, z, 0.035, 0.035, 0.035);
  loadingDoors(b, t);
  // A neon ring circles the tower; a drone flies a crate of greens in.
  const towerRing = hoop(new B(), 0.95, 0.022, CYAN, 0, 0, 0, Math.PI / 2 + 0.22, 0, 40).geometry();
  extra.spinners = [{ geo: towerRing, at: [x, 1.4, z], axis: 'y', speed: 0.7 }];
  const courier = drone(MAGENTA);
  courier.box(0.008, 0.1, 0.008, GRID, 0, -0.14, 0); // the sling
  greensCrate(courier, 0, -0.27, 0, 0.13, t);
  extra.floaters = [{ geo: courier.geometry(), at: [0.55, 1.9, 0.52], amp: 0.12, speed: 1.5 }];
  return top + 0.36;
}

// ---------- Storage Pit ----------
// The cube store: its centre, size, the height it hovers at and its bins per side.
const CUBE = { x: -0.2, z: -0.22, size: 0.96, y: 0.24, bins: 3 };
// A bin's colour from its column and row: a few in team colour, the rest white or pale.
const binColor = (t, i, j) => (i * 2 + j * 5) % 7 === 3 ? t : (i + j) % 3 === 1 ? PANEL : SNOW;
// The bins: panels on the two faces the camera sees and on top, the dark core showing as seams between them, a neon
// tag on every other.
const cubeBins = (b, t) => {
  const { x, z, size, y, bins } = CUBE, cell = size / bins;
  for (let i = 0; i < bins; i++) for (let j = 0; j < bins; j++) {
    const u = (i - 1) * cell, binY = y + j * cell + 0.015;
    b.box(cell - 0.035, cell - 0.03, 0.02, binColor(t, i, j), x + u, binY, z + size / 2 + 0.005);
    b.box(0.02, cell - 0.03, cell - 0.035, binColor(t, j, i + 1), x + size / 2 + 0.005, binY, z - u);
    b.box(cell - 0.035, 0.02, cell - 0.035, (i + j) % 2 ? PANEL : SNOW, x + u, y + size, z + (j - 1) * cell);
    if ((i + j) % 2 !== 0) continue;
    b.box(0.05, 0.02, 0.01, CYAN, x + u, binY + cell - 0.08, z + size / 2 + 0.018);
    b.box(0.01, 0.02, 0.05, CYAN, x + size / 2 + 0.018, binY + cell - 0.08, z - u);
  }
};
// The chrome frame: corner posts, the rail grid over the top, two robots on it (one in team colour).
const cubeFrame = (b, t) => {
  const { x, z, size, y, bins } = CUBE, cell = size / bins;
  for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.box(0.045, size + 0.1, 0.045, CHROME, x + u * size / 2, y - 0.02, z + v * size / 2);
  }
  for (let k = 0; k <= bins; k++) {
    b.box(size + 0.05, 0.025, 0.025, CHROME, x, y + size + 0.02, z - size / 2 + k * cell);
    b.box(0.025, 0.025, size + 0.05, CHROME, x - size / 2 + k * cell, y + size + 0.02, z);
  }
  b.box(0.2, 0.1, 0.2, t, x - cell / 2, y + size + 0.045, z - cell / 2);
  b.box(0.12, 0.02, 0.12, CYAN, x - cell / 2, y + size + 0.145, z - cell / 2);
  b.box(0.2, 0.1, 0.2, SNOW, x + cell, y + size + 0.045, z + cell / 2);
  b.box(0.12, 0.02, 0.12, MAGENTA, x + cell, y + size + 0.145, z + cell / 2);
};
// The conveyor in from the right under the team intake hood, carrying logs, gold and stone.
const conveyor = (b, td) => {
  const z = CUBE.z + 0.18, x0 = CUBE.x + CUBE.size / 2, x1 = 0.86, cx = (x0 + x1) / 2;
  b.box(x1 - x0, 0.05, 0.24, DARK, cx, 0.04, z); // belt
  b.box(x1 - x0, 0.03, 0.02, CHROME, cx, 0.09, z - 0.13); // its rails
  b.box(x1 - x0, 0.03, 0.02, CHROME, cx, 0.09, z + 0.13);
  b.box(0.18, 0.2, 0.3, td, x0 + 0.09, 0.04, z); // intake hood
  b.box(0.012, 0.12, 0.22, DARK, x0 + 0.185, 0.06, z);
  b.box(0.2, 0.022, 0.32, CYAN, x0 + 0.09, 0.24, z);
  for (const side of [-1, 1]) b.add(CYL6, LOG, 0.52, 0.13, z + side * 0.05, 0.035, 0.18, 0.035, Math.PI / 2, 0, 0);
  b.add(CYL6, LOG, 0.52, 0.19, z, 0.035, 0.18, 0.035, Math.PI / 2, 0, 0);
  for (let i = 0; i < 4; i++) {
    b.add(GEM, GOLD, 0.68 + (i % 2) * 0.05, 0.14 + (i > 1) * 0.04, z - 0.04 + (i % 3) * 0.04, 0.035, 0.035, 0.035, 0, i); // gold
  }
  b.rock(0.05, ROCK, 0.8, 0.09, z - 0.03, 1.1, 0.9, 1, 1);
  b.rock(0.045, 0x9a9a92, 0.81, 0.09, z + 0.06, 1, 0.8, 1.1, 2);
};
// The lift shaft at the front: its centre, half-width and height.
const LIFT = { x: -0.42, z: 0.6, half: 0.15, height: 1.3 };
// The lift shaft: four chrome posts and three neon frames round the bin it carries, its floor and head.
const liftShaft = b => {
  const { x, z, half, height } = LIFT;
  for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    b.box(0.025, height, 0.025, CHROME, x + u * half, 0.04, z + v * half);
  }
  for (const frameY of [0.45, 0.88, height]) for (const side of [-1, 1]) {
    b.box(half * 2 + 0.03, 0.022, 0.022, CYAN, x, frameY, z + side * half);
    b.box(0.022, 0.022, half * 2 + 0.03, CYAN, x + side * half, frameY, z);
  }
  b.box(half * 2 + 0.06, 0.04, half * 2 + 0.06, SNOW, x, 0.04, z);
  b.box(half * 2 + 0.06, 0.04, half * 2 + 0.06, SNOW, x, height + 0.02, z);
};

// Storage Pit: an automated cube store. A cube of bins in a chrome frame hovers over a pedestal glowing magenta, its
// white bin faces in a grid of dark seams, a few in team colour, robots on the rail grid over its top. Logs, gold and
// stone ride a conveyor in under a team intake hood at the right; at the front a lift shaft of neon frames carries a
// bin up and down, and a drone flies another away.
export function storage_pit(ctx) {
  const { b, extra, s, t, td } = ctx, { x, z, size, y } = CUBE;
  b.box(s, 0.04, s, PAVE);
  neonSlab(b, 1.22, 1.22, 0.07, x, z, 0.04);
  b.box(0.8, y - 0.11, 0.8, DARK, x, 0.11, z); // the pedestal
  b.box(0.84, 0.025, 0.84, MAGENTA, x, y - 0.07, z);
  b.box(size, size, size, DARK, x, y, z); // the cube's core
  cubeBins(b, t);
  cubeFrame(b, t);
  conveyor(b, td);
  liftShaft(b);
  // The bin riding the lift, and a drone carrying another away.
  const lifted = new B().box(0.2, 0.18, 0.2, SNOW, 0, -0.09, 0).box(0.206, 0.04, 0.206, t, 0, -0.02, 0);
  const courier = drone(CYAN);
  courier.box(0.008, 0.08, 0.008, GRID, 0, -0.12, 0);
  courier.box(0.16, 0.14, 0.16, SNOW, 0, -0.3, 0);
  courier.box(0.166, 0.03, 0.166, td, 0, -0.22, 0);
  extra.floaters = [
    { geo: lifted.geometry(), at: [LIFT.x, 0.85, LIFT.z], amp: 0.32, speed: 0.9 },
    { geo: courier.geometry(), at: [0.5, 1.6, 0.42], amp: 0.12, speed: 1.6, phase: 1 },
  ];
  return y + size + 0.16;
}

// ---------- Farm ----------
// The hydroponic beds: their x, length, centre z, trough width and height.
const BEDS = { xs: [-0.6, -0.2, 0.2, 0.6], length: 1.36, z: 0.1, width: 0.26, height: 0.1 };
// The troughs with their channels of water, neon edges and team end caps.
const troughs = (b, t, y) => {
  const { xs, length, z, width, height } = BEDS;
  for (const x of xs) {
    b.box(width, height, length, SNOW, x, y, z);
    b.box(width - 0.06, 0.012, length - 0.06, WATER, x, y + height - 0.004, z);
    b.box(0.012, 0.022, length, CYAN, x + width / 2 + 0.004, y + height - 0.045, z);
    b.box(width + 0.012, height + 0.012, 0.03, t, x, y, z + length / 2 + 0.01);
  }
};
// The gantries: chrome portals over the beds, a magenta grow light over each one.
const growLightGantries = (b, y) => {
  for (const gantryZ of [BEDS.z - 0.36, BEDS.z + 0.32]) {
    for (const side of [-1, 1]) b.box(0.04, 0.62, 0.04, CHROME, side * 0.84, y, gantryZ);
    b.box(1.72, 0.04, 0.05, CHROME, 0, y + 0.6, gantryZ);
    for (const x of BEDS.xs) b.box(0.2, 0.02, 0.07, MAGENTA, x, y + 0.575, gantryZ);
  }
};
// At the back: two nutrient tanks piped into the beds, the team control pillar and its screen.
const nutrientTanks = (b, td, y) => {
  const z = BEDS.z - BEDS.length / 2 - 0.16;
  for (const x of [-0.66, -0.36]) {
    b.cylT(0.11, 0.11, 0.42, SNOW, x, y, z, 10);
    b.cylT(0.115, 0.115, 0.03, CYAN, x, y + 0.3, z, 10);
    b.add(DOME, SNOW, x, y + 0.42, z, 0.11, 0.06, 0.11);
  }
  b.box(1.3, 0.03, 0.03, CHROME, -0.05, y + 0.06, z + 0.1); // the manifold
  for (const x of BEDS.xs) b.box(0.03, 0.03, 0.06, CHROME, x, y + 0.06, z + 0.13);
  b.box(0.18, 0.5, 0.12, SNOW, 0.62, y, z); // the control pillar
  b.box(0.19, 0.08, 0.13, td, 0.62, y + 0.42, z);
  b.box(0.14, 0.16, 0.012, DARK, 0.62, y + 0.2, z + 0.065);
  b.box(0.1, 0.02, 0.014, CYAN, 0.62, y + 0.28, z + 0.067);
};
// A lettuce rosette at (x, z) on the channel at rootY, scaled by `size`.
const lettuce = (crops, i, j, x, rootY, z, size) => {
  crops.add(BALL, LEAF, x, rootY + 0.04 * size, z, 0.075 * size, 0.05 * size, 0.075 * size);
  for (let m = 0; m < 4; m++) {
    const a = m * Math.PI / 2 + hash(j, i) * 1.5;
    const leafX = x + Math.cos(a) * 0.06 * size, leafZ = z + Math.sin(a) * 0.06 * size;
    crops.add(GEM, LEAF_L, leafX, rootY + 0.05 * size, leafZ, 0.035 * size, 0.025 * size, 0.07 * size, 0, Math.PI / 2 - a);
  }
};
// A clump of three leafy herb stalks at (x, z) on the channel at rootY, scaled by `size`.
const herbs = (crops, i, j, x, rootY, z, size) => {
  for (let m = 0; m < 3; m++) {
    const a = m * 2.1 + hash(i, j) * 2;
    const stalkX = x + Math.cos(a) * 0.04, stalkZ = z + Math.sin(a) * 0.04;
    crops.add(GEM, m ? LEAF : LEAF_L, stalkX, rootY + 0.09 * size, stalkZ, 0.04 * size, 0.1 * size, 0.04 * size, 0, a);
  }
};
// The greens (extra.crops): lettuce rosettes in two beds and leafy herb stalks in the others, along each channel.
const hydroponicCrops = y => {
  const { xs, length, z: bedZ, height } = BEDS, crops = new B();
  for (const [i, x] of xs.entries()) for (let j = 0; j < 6; j++) {
    const z = bedZ - length / 2 + 0.14 + j * (length - 0.28) / 5, size = 0.85 + hash(i, j) * 0.3, rootY = y + height - 0.02;
    if (i % 2 === 0) lettuce(crops, i, j, x, rootY, z, size);
    else herbs(crops, i, j, x, rootY, z, size);
  }
  return crops.geometry();
};

// Farm: glowing hydroponic beds. Four long white troughs edged in cyan neon run front to back over a white deck, their
// channels of nutrient water planted with rows of greens (extra.crops, which animate() shows once the farm is finished
// and shrinks as the food runs out), their team end caps to the front. Two chrome gantries span the beds carrying
// magenta grow-light bars; nutrient tanks piped into the beds and a team control pillar stand at the back, and a drone
// tends the crops, scanning them with a ring of light.
export function farm(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, PAVE);
  troughs(b, t, y);
  growLightGantries(b, y);
  nutrientTanks(b, td, y);
  extra.crops = hydroponicCrops(y);
  // The tending drone and its scanning ring.
  const tender = drone(CYAN);
  hoop(tender, 0.16, 0.01, CYAN, 0, -0.12, 0, Math.PI / 2, 0, 16);
  extra.floaters = [{ geo: tender.geometry(), at: [0.2, 0.95, 0.12], amp: 0.1, speed: 1.4 }];
  return 0.66;
}

// ---------- Barracks ----------
// A mech walker standing on y at (x, z), facing +z: grey legs, a team torso, a cyan visor and an arm cannon.
const mech = (b, t, x, y, z) => {
  for (const side of [-1, 1]) {
    b.box(0.06, 0.22, 0.07, GRID, x + side * 0.07, y + 0.03, z); // leg
    b.box(0.09, 0.03, 0.12, DARK, x + side * 0.07, y, z + 0.01); // foot
    b.box(0.05, 0.16, 0.06, GRID, x + side * 0.145, y + 0.22, z); // arm
  }
  b.box(0.2, 0.06, 0.12, CHROME, x, y + 0.24, z); // hips
  b.box(0.22, 0.16, 0.16, t, x, y + 0.3, z); // torso
  b.box(0.12, 0.03, 0.02, CYAN, x, y + 0.4, z + 0.08); // visor
  b.box(0.04, 0.04, 0.18, DARK, x + 0.17, y + 0.3, z + 0.06); // cannon
};
// The hangar vault: its z, the vault's depth (z radius) and height (y radius), and its length along x.
const HANGAR = { z: -0.74, depth: 0.62, height: 0.95, length: 2.5 };
// The hangar vault, its chrome ribs, the team band; the bay, its glass door, neon lintel and team chevron; the antenna.
const hangar = (b, mast, t, y) => {
  const { z, depth, height, length } = HANGAR;
  b.add(VAULT, SNOW, 0, y, z, height, length, depth, 0, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    b.add(VAULT, CHROME, -length / 2 + 0.05 + i * (length - 0.1) / 5, y, z, height + 0.02, 0.05, depth + 0.02, 0, 0, Math.PI / 2);
  }
  b.add(VAULT, t, 0.98, y, z, height + 0.022, 0.14, depth + 0.022, 0, 0, Math.PI / 2);
  const bayZ = z + depth + 0.06;
  b.box(1.3, 0.62, 0.44, SNOW, 0, y, bayZ - 0.22);
  b.box(1.1, 0.48, 0.02, GLASS, 0, y + 0.02, bayZ + 0.005);
  b.box(1.14, 0.03, 0.03, CYAN, 0, y + 0.52, bayZ + 0.01);
  for (let i = 1; i < 4; i++) b.box(0.012, 0.48, 0.022, CHROME, -0.55 + i * 0.275, y + 0.02, bayZ + 0.008);
  for (const side of [-1, 1]) b.box(0.2, 0.05, 0.02, t, side * 0.08, y + 0.555, bayZ + 0.012, 0, 0, side * 0.45);
  mast.cyl(0.014, 0.5, CHROME, -0.75, y + height, z);
  mast.add(BALL, MAGENTA, -0.75, y + height + 0.52, z, 0.03, 0.03, 0.03);
};
// The charging pods along the power line: each a neon pad, a white capsule with a team band, a glass front and visor.
const chargingPods = (b, t, y) => {
  b.box(2.3, 0.03, 0.04, DARK, 0, y + 0.03, -0.1);
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5, z = 0.2;
    b.add(CYL8, CYAN, x, y + 0.04, z, 0.2, 0.02, 0.2);
    b.add(CYL8, DARK, x, y + 0.07, z, 0.18, 0.04, 0.18);
    b.box(0.03, 0.03, 0.22, DARK, x, y + 0.03, z - 0.2); // the feed from the power line
    b.cylT(0.135, 0.15, 0.5, SNOW, x, y + 0.09, z, 10);
    b.add(BALL, SNOW, x, y + 0.59, z, 0.135, 0.1, 0.135);
    b.cylT(0.152, 0.152, 0.05, t, x, y + 0.14, z, 10);
    b.box(0.15, 0.32, 0.03, GLASS, x, y + 0.2, z + 0.13);
    b.box(0.09, 0.025, 0.02, i % 2 ? MAGENTA : CYAN, x, y + 0.44, z + 0.147);
  }
};
// A pod's charge ring, riding up and down it.
const chargeRing = i => hoop(new B(), 0.19, 0.012, i % 2 ? MAGENTA : CYAN, 0, 0, 0, Math.PI / 2, 0, 16).geometry();

// Barracks: a drone bay with charging pods. A white hangar vault ribbed in chrome lies across the back, a team band
// round it and an antenna on its crest, its dark glass bay door under a neon lintel and a team chevron. On the dark
// apron in front five charging pods stand in a row, white capsules with dark glass fronts, a visor glowing in each and
// a team band round them, cyan charge rings rising and falling along them; two mech walkers stand ready on the launch
// pad, and a patrol drone hovers over the hangar.
export function barracks(ctx) {
  const { b, mast, extra, s, t } = ctx, y = 0.04;
  b.box(s, y, s, PAVE);
  neonSlab(b, s - 0.12, 1.5, 0.03, 0, 0.55, y, APRON, CYAN);
  for (const x of [-1.15, 1.15]) b.box(0.04, 0.006, 1.3, SNOW, x, y + 0.03, 0.55);
  hangar(b, mast, t, y);
  chargingPods(b, t, y);
  // The launch pad: a neon ring round a team chevron, two mechs on it.
  hoop(b, 0.42, 0.016, CYAN, 0, y + 0.035, 0.88, Math.PI / 2, 0, 32);
  for (const side of [-1, 1]) b.box(0.26, 0.008, 0.06, t, side * 0.09, y + 0.03, 1.02, 0, side * 0.6);
  mech(b, t, -0.17, y + 0.03, 0.8);
  mech(b, t, 0.2, y + 0.03, 0.9);
  // The charge rings ride up and down the pods; the patrol drone.
  extra.floaters = [
    ...[0, 1, 2, 3, 4].map(i => ({
      geo: chargeRing(i), at: [-1.0 + i * 0.5, y + 0.36, 0.2], amp: 0.16, speed: 1.3, phase: i * 1.2,
    })),
    { geo: drone(CYAN, 1.3).geometry(), at: [0.55, 1.45, -0.5], amp: 0.12, speed: 1.5, phase: 2 },
  ];
  return y + HANGAR.height + 0.02;
}

// ---------- Archery Range ----------
// A hologram target for a floater, facing +z: cyan and magenta rings round a white bull, on the beam of its projector.
const holoTarget = () => {
  const g = new B();
  hoop(g, 0.2, 0.014, CYAN, 0, 0, 0, 0, 0, 20);
  hoop(g, 0.12, 0.012, MAGENTA, 0, 0, 0, 0, 0, 16);
  g.add(DISC, SNOW, 0, 0, 0, 0.05, 0.012, 0.05, Math.PI / 2, 0, 0);
  return g.add(CYL8, CYAN, 0, -0.33, 0, 0.01, 0.26, 0.01);
};
// The laser range's lanes, the targets' z and the firing counter's, the targets' height and the emitters'.
const LASER_LANES = [-0.8, 0, 0.8], TARGET_Z = -0.95, COUNTER_Z = 0.92;
// The range floor, its neon lane lines and distance marks; the backstop, its wings, the score screen; the target
// projectors, each with a team marker.
const laserRangeFloor = (b, t, y) => {
  b.box(2.5, 0.02, 2.0, APRON, 0, y, -0.28);
  for (const x of [-1.2, -0.4, 0.4, 1.2]) b.box(0.025, 0.012, 2.0, CYAN, x, y + 0.02, -0.28);
  for (const z of [-0.55, 0, 0.45]) for (const x of LASER_LANES) b.box(0.3, 0.008, 0.02, GRID, x, y + 0.02, z);
  b.box(2.3, 0.7, 0.12, SNOW, 0, y, -1.27);
  b.box(2.32, 0.12, 0.13, GLASS, 0, y + 0.42, -1.27);
  b.box(2.32, 0.025, 0.14, CYAN, 0, y + 0.66, -1.27);
  for (const side of [-1, 1]) {
    b.box(0.12, 0.6, 0.5, SNOW, side * 1.24, y, -1.06);
    b.box(0.13, 0.025, 0.51, CYAN, side * 1.24, y + 0.56, -1.06);
  }
  b.box(0.6, 0.24, 0.02, DARK, 0, y + 0.12, -1.2);
  for (let i = 0; i < 5; i++) b.box(0.06, 0.05 + i * 0.03, 0.01, i % 2 ? MAGENTA : CYAN, -0.2 + i * 0.1, y + 0.15, -1.19);
  for (const x of LASER_LANES) {
    b.add(CYL8, CHROME, x, y + 0.05, TARGET_Z, 0.14, 0.06, 0.14);
    b.add(CYL8, CYAN, x, y + 0.085, TARGET_Z, 0.1, 0.012, 0.1);
    b.box(0.1, 0.03, 0.03, t, x, y + 0.02, TARGET_Z + 0.17);
  }
};
// The firing deck: the counter and its team panels, the emitters, two beams down the lanes, the light pylons.
const firingDeck = (b, t, td, y, targetY) => {
  const emitterY = y + 0.48, z = COUNTER_Z;
  neonSlab(b, 2.5, 0.5, 0.1, 0, 1.05, y);
  b.box(2.3, 0.28, 0.16, SNOW, 0, y + 0.1, z);
  for (const x of LASER_LANES) {
    b.box(0.5, 0.2, 0.02, td, x, y + 0.14, z + 0.085);
    b.box(0.5, 0.02, 0.025, CYAN, x, y + 0.36, z + 0.085);
    b.box(0.04, 0.06, 0.04, CHROME, x, y + 0.38, z);
    b.add(BALL, CHROME, x, emitterY, z, 0.07, 0.07, 0.07);
    b.add(CYL8, DARK, x, emitterY, z - 0.15, 0.025, 0.22, 0.025, Math.PI / 2, 0, 0);
    b.add(CYL8, MAGENTA, x, emitterY, z - 0.265, 0.032, 0.014, 0.032, Math.PI / 2, 0, 0);
  }
  for (const x of [LASER_LANES[0], LASER_LANES[2]]) {
    stick(b, 0.009, MAGENTA, [x, emitterY, z - 0.27], [x, targetY, TARGET_Z], CYL6); // the beams
  }
  for (const side of [-1, 1]) {
    b.box(0.08, 0.8, 0.08, SNOW, side * 1.2, y + 0.1, 1.2);
    b.box(0.1, 0.06, 0.1, side < 0 ? CYAN : MAGENTA, side * 1.2, y + 0.9, 1.2);
    b.box(0.085, 0.12, 0.085, t, side * 1.2, y + 0.6, 1.2);
  }
};

// Archery Range: a laser range with hologram targets. Three lanes run back over a dark floor between cyan neon lines,
// past distance marks, from a white firing deck at the front, where laser emitters stand on a counter faced with team
// panels, two of them firing magenta beams down the lanes. At the far end, hologram targets hover over their chrome
// projectors before a white backstop with a dark glass band and a score screen; light pylons stand at the deck's ends.
export function archery_range(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04, targetY = y + 0.6;
  b.box(s, y, s, PAVE);
  laserRangeFloor(b, t, y);
  firingDeck(b, t, td, y, targetY);
  // The hologram targets hover over their projectors.
  extra.floaters = LASER_LANES.map((x, i) => ({
    geo: holoTarget().geometry(), at: [x, targetY, TARGET_Z], amp: 0.06, speed: 1.6, phase: i * 2,
  }));
  return 1.0;
}

// ---------- Stable ----------
// A hover-bike for a floater, nose to +z: a white fuselage with a team fairing, a dark windscreen and seat, chrome
// thrusters glowing cyan behind and an underglow.
const hoverBike = t => {
  const g = new B();
  g.add(GEM, SNOW, 0, 0.1, 0, 0.11, 0.07, 0.34); // fuselage
  g.add(GEM, t, 0, 0.13, 0.12, 0.075, 0.05, 0.2); // fairing
  g.box(0.11, 0.06, 0.02, DARK, 0, 0.16, 0.07, -0.6); // windscreen
  g.box(0.08, 0.03, 0.16, DARK, 0, 0.14, -0.1); // seat
  g.box(0.24, 0.015, 0.02, CHROME, 0, 0.19, 0.1); // handlebars
  for (const side of [-1, 1]) {
    g.add(CYL8, CHROME, side * 0.11, 0.07, -0.06, 0.045, 0.3, 0.045, Math.PI / 2, 0, 0);
    g.add(CYL8, CYAN, side * 0.11, 0.07, -0.215, 0.036, 0.012, 0.036, Math.PI / 2, 0, 0);
  }
  return g.add(CYL8, CYAN, 0, 0.0, 0, 0.1, 0.01, 0.24);
};
// The dock's bays, the cradles' z and how much bigger than life the docked bikes are drawn.
const BIKE_BAYS = [-0.82, 0, 0.82], CRADLE_Z = -0.2, BIKE_SCALE = 1.4;
// The back wall and its charge panels, a team plate over each; the wing, white over dark glass, sloping down to the
// front, its neon lip and fins, the braces under it.
const dockWallAndWing = (b, t, y) => {
  b.box(2.6, 0.95, 0.16, SNOW, 0, y, -1.22);
  b.box(2.62, 0.025, 0.17, CYAN, 0, y + 0.88, -1.22);
  for (const x of BIKE_BAYS) {
    b.box(0.48, 0.42, 0.02, GLASS, x, y + 0.2, -1.13);
    b.box(0.4, 0.025, 0.022, CYAN, x, y + 0.3, -1.13);
    b.box(0.2, 0.08, 0.025, t, x, y + 0.68, -1.13);
  }
  b.box(2.7, 0.06, 0.95, SNOW, 0, 1.02, -0.8, 0.14);
  b.box(2.6, 0.02, 0.88, GLASS, 0, 0.995, -0.8, 0.14);
  b.box(2.72, 0.025, 0.04, CYAN, 0, 0.96, -0.33);
  for (const x of [-1.0, -0.41, 0.41, 1.0]) b.box(0.03, 0.05, 0.9, CYAN, x, 1.06, -0.8, 0.14);
  for (const x of [-1.25, 1.25]) stick(b, 0.025, CHROME, [x, y + 0.45, -1.14], [x, 1.0, -0.42], CYL6);
};
// The cradles: dark pads in neon rings, team markers, docking arms out from the panels; the charging pylon.
const cradlesAndPylon = (b, t, td, y) => {
  for (const x of BIKE_BAYS) {
    b.add(CYL8, CYAN, x, y + 0.01, CRADLE_Z, 0.32, 0.02, 0.55);
    b.add(CYL8, DARK, x, y + 0.03, CRADLE_Z, 0.3, 0.04, 0.53);
    b.box(0.14, 0.01, 0.05, t, x, y + 0.05, CRADLE_Z + 0.42);
    b.box(0.04, 0.04, 0.5, CHROME, x, y + 0.32, -0.9); // docking arm
    b.box(0.1, 0.06, 0.06, DARK, x, y + 0.3, -0.64); // its clamp
  }
  b.box(0.14, 0.7, 0.14, SNOW, -1.12, y, 1.05);
  b.box(0.15, 0.1, 0.15, td, -1.12, y + 0.5, 1.05);
  b.box(0.16, 0.03, 0.16, CYAN, -1.12, y + 0.7, 1.05);
  b.box(0.02, 0.2, 0.08, DARK, -1.04, y + 0.2, 1.05);
};

// Stable: a hover-bike dock. A white wing cantilevered from the back wall on chrome braces, neon fins along it, shades
// the charge panels; before it three docking cradles, each a dark pad ringed in neon with a team marker, its bike
// hovering over it nose out on a docking arm. Cyan guide lines lead out over the apron, where a fourth bike hovers
// turning away, and a charging pylon stands at the corner.
export function stable(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04;
  b.box(s, y, s, PAVE);
  b.box(s - 0.12, 0.015, 1.0, APRON, 0, y, 0.8);
  for (const x of BIKE_BAYS) b.box(0.04, 0.008, 0.95, CYAN, x, y + 0.015, 0.8);
  dockWallAndWing(b, t, y);
  cradlesAndPylon(b, t, td, y);
  // The bikes hover over their cradles; the fourth turns away over the apron.
  const bikeAt = (ry, scale) => { const g = new B(); place(g, hoverBike(t), 0, 0, 0, ry, scale); return g.geometry(); };
  extra.floaters = [
    ...BIKE_BAYS.map((x, i) => ({ geo: bikeAt(0, BIKE_SCALE), at: [x, y + 0.2, CRADLE_Z], amp: 0.05, speed: 2, phase: i * 1.7 })),
    { geo: bikeAt(0.9, 1.25), at: [0.85, y + 0.3, 0.8], amp: 0.07, speed: 1.6, phase: 0.5 },
  ];
  return 1.18;
}

// ---------- Market ----------
// A kiosk's hologram for a spinner, above its canopy: the good it trades (food, wood, gold or stone) over a cyan ring.
const wareHologram = kind => {
  const g = new B();
  hoop(g, 0.13, 0.008, CYAN, 0, -0.1, 0, Math.PI / 2, 0, 16);
  if (kind === 'food') {
    g.add(BALL, 0xd8402e, 0, 0, 0, 0.08, 0.08, 0.08); // an apple
    g.add(GEM, LEAF, 0.03, 0.09, 0, 0.025, 0.05, 0.015, 0, 0, -0.5); // its leaf
  }
  if (kind === 'wood') {
    for (const [logY, logZ] of [[-0.03, -0.04], [-0.03, 0.04], [0.035, 0]]) {
      g.add(CYL6, LOG, 0, logY, logZ, 0.035, 0.22, 0.035, 0, 0, Math.PI / 2);
    }
  }
  if (kind === 'gold') g.add(GEM, GOLD, 0, 0, 0, 0.07, 0.1, 0.07).add(GEM, GOLD, 0.08, -0.04, 0.02, 0.04, 0.06, 0.04);
  if (kind === 'stone') g.rock(0.07, ROCK, 0, -0.06, 0, 1.2, 0.9, 1, 1).rock(0.05, 0x9a9a92, 0.07, -0.04, 0.03, 1, 0.8, 1, 2);
  return g;
};
// The kiosks: [x, z, the ware they trade].
const KIOSKS = [[-0.92, -0.92, 'food'], [0.98, -0.5, 'wood'], [-0.5, 0.98, 'gold']];
// The plaza floor and its inlaid rings and spokes; the projector, its light column and team markers.
const plazaAndProjector = (b, t, y) => {
  b.add(DISC, PANEL, 0, y + 0.005, 0, 1.3, 0.01, 1.3);
  hoop(b, 1.3, 0.016, CYAN, 0, y + 0.012, 0, Math.PI / 2, 0, 40);
  hoop(b, 0.72, 0.016, MAGENTA, 0, y + 0.012, 0, Math.PI / 2, 0, 32);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    b.box(0.58, 0.01, 0.02, CYAN, Math.cos(a) * 1.01, y + 0.008, Math.sin(a) * 1.01, 0, -a);
  }
  b.cylT(0.3, 0.36, 0.12, CHROME, 0, y, 0, 12);
  b.cylT(0.28, 0.28, 0.02, CYAN, 0, y + 0.12, 0, 12);
  b.cylT(0.12, 0.16, 0.08, DARK, 0, y + 0.14, 0, 8);
  b.add(CYL8, CYAN, 0, y + 0.45, 0, 0.025, 0.5, 0.025); // the light column
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    b.box(0.08, 0.1, 0.03, t, Math.cos(a) * 0.33, y, Math.sin(a) * 0.33, 0, -a + Math.PI / 2);
  }
};
// A kiosk at (x, z): a hexagonal counter with price panels facing the projector, a chrome pole, a team canopy edged in
// magenta.
const kiosk = (b, t, y, x, z) => {
  b.add(CYL6, SNOW, x, y + 0.17, z, 0.26, 0.34, 0.26);
  b.add(CYL6, GLASS, x, y + 0.3, z, 0.27, 0.06, 0.27);
  b.add(CYL6, CYAN, x, y + 0.34, z, 0.275, 0.012, 0.275);
  b.cylT(0.025, 0.025, 0.4, CHROME, x, y + 0.34, z, 6);
  b.add(CYL6, t, x, y + 0.76, z, 0.34, 0.04, 0.34);
  b.add(CYL6, MAGENTA, x, y + 0.735, z, 0.35, 0.014, 0.35);
  const towardCentre = Math.atan2(-z, -x);
  for (const offset of [-0.5, 0.5]) {
    const a = towardCentre + offset, px = x + Math.cos(a) * 0.27, pz = z + Math.sin(a) * 0.27;
    b.box(0.12, 0.09, 0.012, offset < 0 ? CYAN : MAGENTA, px, y + 0.4, pz, 0, Math.PI / 2 - a);
  }
};
// The arch at the front corner, between team pillars.
const plazaArch = (b, td, y) => {
  const x = 0.95, z = 0.95, ry = -Math.PI / 4;
  hoop(b, 0.42, 0.04, SNOW, x, y + 0.5, z, 0, ry, 12, Math.PI);
  hoop(b, 0.42, 0.012, CYAN, x + 0.03, y + 0.5, z + 0.03, 0, ry, 12, Math.PI);
  for (const side of [-1, 1]) {
    const px = x + side * 0.42 * Math.cos(ry), pz = z - side * 0.42 * Math.sin(ry);
    b.box(0.09, 0.5, 0.09, td, px, y, pz, 0, ry);
    b.box(0.1, 0.03, 0.1, CYAN, px, y + 0.5, pz, 0, ry);
  }
};
// The golden credit coin over the projector, in its cyan rim.
const creditCoin = () => {
  const coin = new B().add(DISC, GOLD, 0, 0, 0, 0.3, 0.05, 0.3, Math.PI / 2, 0, 0).box(0.07, 0.2, 0.07, 0xb8901c, 0, -0.1, 0);
  hoop(coin, 0.31, 0.02, CYAN, 0, 0, 0, 0, 0, 24);
  return coin.geometry();
};

// Market: a holo-kiosk plaza. A round plaza inlaid with cyan and magenta rings; at its heart a chrome projector casts
// a great golden credit coin, turning in a magenta ticker ring. Round it, three white kiosks under team canopies, price
// panels glowing on their counters, each with a hologram of its wares turning over it (food, wood and gold, stone at the
// projector's foot), and a white arch with team pillars opens the plaza at the front.
export function market(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04;
  b.box(s, y, s, PAVE);
  plazaAndProjector(b, t, y);
  for (const [x, z] of KIOSKS) kiosk(b, t, y, x, z);
  // Trade crates by the kiosks.
  const crates = [[-0.55, -1.1, 0.16, t], [-0.36, -1.12, 0.13, SNOW], [1.15, -0.05, 0.15, td], [-1.12, 0.6, 0.14, SNOW]];
  for (const [x, z, width, band] of crates) {
    b.box(width, width * 0.8, width, SNOW, x, y, z);
    b.box(width + 0.006, 0.025, width + 0.006, band === SNOW ? CYAN : band, x, y + width * 0.4, z);
  }
  plazaArch(b, td, y);
  // The coin and its ticker ring over the projector, the kiosks' wares, the stone at the projector's foot.
  const coin = creditCoin(), ticker = hoop(new B(), 0.52, 0.018, MAGENTA, 0, 0, 0, Math.PI / 2 + 0.3, 0, 36).geometry();
  extra.spinners = [
    { geo: coin, at: [0, y + 1.05, 0], axis: 'y', speed: 1.2 },
    { geo: ticker, at: [0, y + 1.05, 0], axis: 'y', speed: -0.6 },
    ...KIOSKS.map(([x, z, kind], i) => ({
      geo: wareHologram(kind).geometry(), at: [x, y + 1.0, z], axis: 'y', speed: 0.9 + i * 0.15,
    })),
    { geo: wareHologram('stone').geometry(), at: [0.42, y + 0.32, 0.42], axis: 'y', speed: 0.8 },
  ];
  return 1.0;
}

// ---------- Government Center ----------
// The data core's base and the height of each of its five storeys.
const CORE_STOREY = 0.35;
// The plinth's three neon-edged tiers and the team carpet. Returns the plinth's top.
const steppedPlinth = (b, td) => {
  let y = 0;
  for (const [radius, edge] of [[1.32, CYAN], [1.1, MAGENTA], [0.88, CYAN]]) {
    b.cylT(radius, radius + 0.03, 0.12, SNOW, 0, y, 0, 24);
    b.cylT(radius + 0.035, radius + 0.035, 0.022, edge, 0, y + 0.07, 0, 24);
    y += 0.12;
  }
  b.box(0.26, 0.012, 0.42, td, 0, y, 0.67);
  return y;
};
// The core on the plinth at y: a chrome socket, five storeys of dark glass between neon bands, data streaks, the
// crown. Returns the core's top.
const dataCore = (b, y) => {
  b.cylT(0.5, 0.56, 0.1, CHROME, 0, y, 0, 12);
  const baseY = y + 0.1, storey = CORE_STOREY;
  for (let i = 0; i < 5; i++) {
    b.cylT(0.42, 0.42, storey - 0.05, GLASS, 0, baseY + i * storey, 0, 12);
    b.cylT(0.44, 0.44, 0.05, i % 2 ? MAGENTA : CYAN, 0, baseY + i * storey + storey - 0.05, 0, 12);
  }
  const top = baseY + 5 * storey;
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + 0.3;
    b.box(0.025, 5 * storey - 0.1, 0.025, CYAN, Math.cos(a) * 0.425, baseY + 0.05, Math.sin(a) * 0.425);
  }
  b.cylT(0.52, 0.44, 0.1, CHROME, 0, top, 0, 12);
  b.cylT(0.53, 0.53, 0.025, MAGENTA, 0, top + 0.06, 0, 12);
  return top;
};
// The ribs, bowed out from the plinth to the crown, a team banner on each, and the crown's prongs.
const coreCage = (b, t, top) => {
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
    const foot = [ca * 0.82, 0.36, sa * 0.82], knee = [ca * 0.8, 1.25, sa * 0.8], head = [ca * 0.5, top + 0.05, sa * 0.5];
    stick(b, 0.05, SNOW, foot, knee, CYL6);
    stick(b, 0.05, SNOW, knee, head, CYL6);
    b.add(BALL, SNOW, ...knee, 0.055, 0.055, 0.055);
    b.box(0.16, 0.5, 0.025, t, ca * 0.86, 0.62, sa * 0.86, 0, Math.PI / 2 - a);
    b.box(0.17, 0.03, 0.03, CYAN, ca * 0.86, 1.12, sa * 0.86, 0, Math.PI / 2 - a);
    stick(b, 0.018, CHROME, [ca * 0.42, top + 0.1, sa * 0.42], [ca * 0.3, top + 0.42, sa * 0.3], CYL6);
  }
};
// The server monoliths: dark glass slabs facing out from the corners, ruled in neon, white caps, team bases.
const serverMonoliths = (b, t) => {
  for (const [x, z, height] of [[-1.12, -1.12, 1.5], [1.12, -1.12, 1.0], [-1.12, 1.12, 1.0], [1.12, 1.12, 0.5]]) {
    const ry = Math.PI / 2 - Math.atan2(z, x), [faceX, faceZ] = turnedFrame(x, z, ry)(0, 0.075);
    b.box(0.28, height, 0.14, GLASS, x, 0, z, 0, ry);
    b.box(0.32, 0.05, 0.18, SNOW, x, height, z, 0, ry);
    b.box(0.29, 0.08, 0.15, t, x, 0, z, 0, ry);
    for (let k = 1; k * 0.22 < height - 0.1; k++) {
      b.box(0.2, 0.015, 0.01, k % 2 ? CYAN : MAGENTA, faceX, 0.08 + k * 0.22, faceZ, 0, ry); // neon rules
    }
  }
};
// The core's floating heart, a magenta orb in a cyan ring, and the ring of data packets orbiting the column.
const coreHeart = () => {
  const heart = new B().add(unit.foliage, MAGENTA, 0, 0, 0, 0.22, 0.22, 0.22).add(unit.foliage, 0xffd6fb, 0, 0, 0, 0.1, 0.1, 0.1);
  hoop(heart, 0.27, 0.012, CYAN, 0, 0, 0, Math.PI / 2 + 0.4, 0, 20);
  return heart;
};
const dataPackets = () => {
  const packets = new B();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    packets.box(0.07, 0.07, 0.07, [CYAN, SNOW, MAGENTA, SNOW][i % 4], Math.cos(a) * 1.05, -0.035, Math.sin(a) * 1.05, 0, a);
  }
  return packets;
};

// Government Center: a glowing data core. On a round white plinth stepped in three neon-edged tiers stands the core, a
// fat column of dark glass banded in cyan light and streaked with data, in a cage of four white ribs that bow out from
// the plinth and close on a chrome crown; team banners hang on the ribs and a team carpet leads in. Over the crown the
// core's heart, a magenta orb, floats in a cradle of chrome prongs; two data rings turn round the column and a ring of
// data packets orbits it. Server monoliths stand at the corners, the front one low.
export function government_center(ctx) {
  const { b, extra, t, td } = ctx;
  const top = dataCore(b, steppedPlinth(b, td));
  coreCage(b, t, top);
  serverMonoliths(b, t);
  // The heart floats in its prongs; the data rings and the packets turn round the column.
  const heart = coreHeart(), packets = dataPackets();
  extra.floaters = [{ geo: heart.geometry(), at: [0, top + 0.42, 0], amp: 0.06, speed: 1.2 }];
  const lowerRing = hoop(new B(), 0.68, 0.02, CYAN, 0, 0, 0, Math.PI / 2 + 0.35, 0, 36).geometry();
  const upperRing = hoop(new B(), 0.86, 0.018, MAGENTA, 0, 0, 0, Math.PI / 2 - 0.3, 0, 36).geometry();
  extra.spinners = [
    { geo: lowerRing, at: [0, 1.3, 0], axis: 'y', speed: 0.7 },
    { geo: upperRing, at: [0, 1.8, 0], axis: 'y', speed: -0.5 },
    { geo: packets.geometry(), at: [0, 0.75, 0], axis: 'y', speed: 0.45 },
  ];
  return top + 0.42;
}

// ---------- Wonder ----------
// Pale crystal colours, and a crystal of unit length along y (half the octahedron) for stick(); a hexagonal prism and
// point with flat facets, for the Wonder's spire.
const CRYS = 0x7fdcff, CRYS_M = 0xe39cff, CRYS_W = 0xd2f4ff, GEM5 = new THREE.OctahedronGeometry(0.5, 0);
const flatShaded = geometry => {
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  geometry.dispose();
  return faceted;
};
const PRISM6 = flatShaded(new THREE.CylinderGeometry(1, 1, 1, 6)), POINT6 = flatShaded(new THREE.ConeGeometry(1, 1, 6));
// An eighth of a turn's half (the octagons' corners), and the spire: its base, height and radius.
const OCTANT = Math.PI / 8;
const SPIRE = { socketY: 0.48, height: 2.2, radius: 0.42 };
SPIRE.baseY = SPIRE.socketY + 0.16;
SPIRE.top = SPIRE.baseY + SPIRE.height;
// A crystal island for a floater, scaled by `size`: an inverted white rock crowned with crystals (the big one in
// `color`), a neon ring round its rim.
const crystalIsland = (size, color) => {
  const g = new B();
  g.add(new THREE.ConeGeometry(0.3 * size, 0.42 * size, 6), SNOW, 0, -0.21 * size, 0, 1, 1, 1, Math.PI, 0, 0);
  g.add(CYL6, PANEL, 0, 0.01, 0, 0.3 * size, 0.03, 0.3 * size);
  hoop(g, 0.31 * size, 0.012, CYAN, 0, 0.0, 0, Math.PI / 2, 0, 18);
  const crystals = [[0, 0, 0.5, 0], [0.12, 0.05, 0.3, 0.35], [-0.1, 0.08, 0.26, -0.4], [0.02, -0.13, 0.22, 0.3]];
  for (const [x, z, length, tilt] of crystals) {
    const tip = [(x + Math.sin(tilt) * length * 0.5) * size, (0.02 + length) * size, (z + Math.sin(tilt) * 0.2) * size];
    stick(g, 0.11 * size, length > 0.4 ? color : CRYS_W, [x * size, 0.02, z * size], tip, GEM5);
  }
  return g;
};
// The three octagonal terraces; the stairs up the front and right faces, between team cheeks; the crystal pylons on
// the lowest terrace's corners.
const terraces = (b, t) => {
  let y = 0;
  for (const [radius, edge] of [[1.86, CYAN], [1.5, MAGENTA], [1.12, CYAN]]) {
    b.cylT(radius - 0.02, radius, 0.16, SNOW, 0, y, 0, 8, 0, OCTANT);
    b.cylT(radius + 0.012, radius + 0.012, 0.025, edge, 0, y + 0.115, 0, 8, 0, OCTANT);
    y += 0.16;
  }
  for (const ry of [0, Math.PI / 2]) {
    const at = turnedFrame(0, 0, ry);
    for (let k = 0; k < 6; k++) {
      const [x, z] = at(0, 1.86 - 0.115 * (k + 0.5));
      b.box(0.5, 0.08 * (k + 1), 0.115, PANEL, x, 0, z, 0, ry);
    }
    for (const u of [-0.28, 0.28]) {
      const [x0, z0] = at(u, 1.88), [x1, z1] = at(u, 1.06);
      stick(b, 0.035, t, [x0, 0.06, z0], [x1, 0.52, z1], CYL6);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = OCTANT + i * Math.PI / 4, x = Math.cos(a) * 1.64, z = Math.sin(a) * 1.64;
    b.cylT(0.07, 0.09, 0.06, CHROME, x, 0.16, z, 6);
    b.cylT(0.075, 0.075, 0.015, CYAN, x, 0.22, z, 6);
    stick(b, 0.12, i % 2 ? CRYS_M : CRYS, [x, 0.2, z], [x, 0.75, z], GEM5);
  }
};
// The socket, its team band, the spire with neon edges, its bands and the emitter on its top.
const crystalSpire = (b, t) => {
  const { socketY, baseY, height, radius, top } = SPIRE;
  b.cylT(0.62, 0.72, 0.16, CHROME, 0, socketY, 0, 8, 0, OCTANT);
  b.cylT(0.73, 0.73, 0.06, t, 0, socketY + 0.04, 0, 8, 0, OCTANT);
  b.add(PRISM6, CRYS, 0, baseY + height / 2, 0, radius, height, radius);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    b.box(0.03, height, 0.03, CYAN, Math.sin(a) * radius, baseY, Math.cos(a) * radius, 0, a);
  }
  for (const bandY of [baseY + 0.9, baseY + 1.7]) b.add(PRISM6, MAGENTA, 0, bandY, 0, radius + 0.02, 0.05, radius + 0.02);
  b.add(PRISM6, CHROME, 0, top + 0.04, 0, radius + 0.05, 0.08, radius + 0.05);
  b.add(PRISM6, CYAN, 0, top + 0.09, 0, radius - 0.05, 0.02, radius - 0.05);
};
// The upper crystal, floating over the emitter: a short point below, the prism, a long point above, neon on its edges.
const upperCrystal = () => {
  const { radius } = SPIRE, crown = new B();
  crown.add(POINT6, CRYS_W, 0, -0.25, 0, radius, 0.5, radius, Math.PI, 0, 0);
  crown.add(PRISM6, CRYS, 0, 0.4, 0, radius, 0.8, radius);
  crown.add(POINT6, CRYS_W, 0, 1.2, 0, radius, 0.8, radius);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    crown.box(0.03, 0.8, 0.03, CYAN, Math.sin(a) * radius, 0, Math.cos(a) * radius, 0, a);
  }
  crown.add(PRISM6, MAGENTA, 0, 0.4, 0, radius + 0.02, 0.05, radius + 0.02);
  return crown;
};
// The lesser crystals leaning out round the spire.
const lesserCrystals = b => {
  for (let i = 0; i < 5; i++) {
    const a = i * 2 * Math.PI / 5 + 0.6, length = 1.4 + hash(i, 4) * 0.9, lean = 0.28 + hash(4, i) * 0.12;
    const ca = Math.cos(a), sa = Math.sin(a), foot = [ca * 0.55, SPIRE.baseY - 0.05, sa * 0.55];
    const tip = [
      foot[0] + ca * Math.sin(lean) * length,
      foot[1] + Math.cos(lean) * length,
      foot[2] + sa * Math.sin(lean) * length,
    ];
    stick(b, 0.36, i % 2 ? CRYS_M : CRYS, foot, tip, GEM5);
  }
};
// The halo of shards orbiting the spire.
const shardHalo = () => {
  const shards = new B();
  for (let i = 0; i < 10; i++) {
    const a = i * Math.PI / 5;
    shards.add(GEM, i % 2 ? CRYS_M : CRYS_W, Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72, 0.06, 0.14, 0.06, 0, a, 0.4);
  }
  return shards;
};

// Wonder: a floating crystal megastructure. Three white octagonal terraces, edged in neon, step up to a chrome socket
// banded in team colour, from which the great crystal spire rises, neon on its edges, past five lesser crystals leaning
// out round it, to a glowing emitter; above it, over a gap of light, the spire's upper crystal floats. Crystal pylons
// stand on the terrace corners and team-lined stairs climb the two faces the camera sees. Three crystal islands drift
// round the spire, two great rings turn about it and a halo of shards orbits it.
export function wonder(ctx) {
  const { b, extra, t } = ctx, { top } = SPIRE;
  terraces(b, t);
  crystalSpire(b, t);
  const crown = upperCrystal();
  lesserCrystals(b);
  // The upper crystal, the islands, the rings and the halo of shards.
  const islands = [[0.5, 1.3, 2.4, 1.4, CRYS], [2.6, 1.3, 3.3, 1.15, CRYS_M], [4.6, 1.28, 2.85, 1.3, CRYS]];
  extra.floaters = [
    { geo: crown.geometry(), at: [0, top + 0.8, 0], amp: 0.1, speed: 0.7 },
    ...islands.map(([a, radius, height, size, color], i) => ({
      geo: crystalIsland(size, color).geometry(),
      at: [Math.cos(a) * radius, height, Math.sin(a) * radius],
      amp: 0.14, speed: 0.9 + i * 0.2, phase: i * 2,
    })),
  ];
  const shards = shardHalo();
  const lowerRing = hoop(new B(), 1.0, 0.03, CYAN, 0, 0, 0, Math.PI / 2 + 0.35, 0, 48).geometry();
  const upperRing = hoop(new B(), 0.82, 0.025, MAGENTA, 0, 0, 0, Math.PI / 2 - 0.45, 0, 40).geometry();
  extra.spinners = [
    { geo: lowerRing, at: [0, top + 0.4, 0], axis: 'y', speed: 0.5 },
    { geo: upperRing, at: [0, top + 1.5, 0], axis: 'y', speed: -0.7 },
    { geo: shards.geometry(), at: [0, 1.45, 0], axis: 'y', speed: 0.35 },
  ];
  return top + 0.1;
}

// ---------- Castle ----------
// The fortress's octagon of ramparts: the apothem (centre to the middle of a wall), the walls' height and thickness,
// and the length of a wall.
const RAMPART = { apothem: 1.5, height: 0.5, thickness: 0.16 };
RAMPART.length = 2 * RAMPART.apothem * Math.tan(Math.PI / 8);
// Rampart i: its wall (the front wall, i = 1, two halves either side of the gate), the pylon at its corner, and on
// every other wall a laser turret: a white drum with a team band, a chrome head, twin barrels pointing out.
const rampart = (b, t, y, i) => {
  const { apothem, height, thickness, length } = RAMPART, facing = i * Math.PI / 4, ry = Math.PI / 2 - facing;
  const at = turnedFrame(Math.cos(facing) * apothem, Math.sin(facing) * apothem, ry);
  const halfWall = (length - 0.44) / 2;
  const pieces = i === 1 ? [[-(length + 0.44) / 4, halfWall], [(length + 0.44) / 4, halfWall]] : [[0, length + 0.02]];
  for (const [u, pieceLength] of pieces) {
    const [x, z] = at(u, 0);
    b.box(pieceLength, height, thickness, SNOW, x, y, z, 0, ry);
    b.box(pieceLength + 0.01, 0.08, thickness + 0.012, GLASS, x, y + 0.24, z, 0, ry);
    b.box(pieceLength + 0.01, 0.03, thickness + 0.012, CYAN, x, y + height, z, 0, ry);
  }
  const cornerAngle = facing + OCTANT, cornerRadius = apothem / Math.cos(OCTANT);
  const cornerX = Math.cos(cornerAngle) * cornerRadius, cornerZ = Math.sin(cornerAngle) * cornerRadius;
  b.add(CYL6, SNOW, cornerX, y + 0.32, cornerZ, 0.12, 0.64, 0.12);
  b.add(CYL6, CYAN, cornerX, y + 0.66, cornerZ, 0.1, 0.04, 0.1);
  if (i % 2) return;
  const [turretX, turretZ] = at(0, 0), [barrelX, barrelZ] = at(0, 0.22);
  b.cylT(0.17, 0.18, 0.24, SNOW, turretX, y + height + 0.03, turretZ, 10);
  b.cylT(0.182, 0.182, 0.05, t, turretX, y + height + 0.1, turretZ, 10);
  b.add(DOME, CHROME, turretX, y + height + 0.27, turretZ, 0.15, 0.12, 0.15);
  for (const offset of [-0.05, 0.05]) {
    const [px, pz] = turnedFrame(barrelX, barrelZ, ry)(offset, 0);
    b.add(CYL8, DARK, px, y + height + 0.32, pz, 0.022, 0.3, 0.022, Math.PI / 2, ry, 0);
  }
  const lensX = barrelX + Math.cos(facing) * 0.15, lensZ = barrelZ + Math.sin(facing) * 0.15;
  b.add(CYL8, MAGENTA, lensX, y + height + 0.32, lensZ, 0.05, 0.02, 0.05, Math.PI / 2, ry, 0);
};
// The gate in the front wall: team pylons, a white lintel with a neon strip, three energy bars.
const energyGate = (b, td, y) => {
  const facing = Math.PI / 4, ry = Math.PI / 2 - facing;
  const at = turnedFrame(Math.cos(facing) * RAMPART.apothem, Math.sin(facing) * RAMPART.apothem, ry);
  for (const u of [-0.26, 0.26]) {
    const [x, z] = at(u, 0);
    b.box(0.1, 0.72, 0.22, td, x, y, z, 0, ry);
  }
  const [x, z] = at(0, 0);
  b.box(0.62, 0.1, 0.22, SNOW, x, y + 0.66, z, 0, ry);
  b.box(0.63, 0.025, 0.23, CYAN, x, y + 0.7, z, 0, ry);
  for (const barY of [0.16, 0.32, 0.48]) b.box(0.42, 0.02, 0.02, CYAN, x, y + barY, z, 0, ry);
};
// The keep: a white hexagonal tower, slit bands of dark glass, team banners on the faces the camera sees, the crown and
// the dome generator.
const keep = (b, t, y) => {
  b.add(CYL6, SNOW, 0, y + 0.02 + 0.55, 0, 0.5, 1.1, 0.5);
  for (const bandY of [0.4, 0.72, 1.0]) b.add(CYL6, GLASS, 0, y + bandY, 0, 0.505, 0.05, 0.505);
  for (const a of [Math.PI / 6, Math.PI / 2]) b.box(0.18, 0.62, 0.02, t, Math.sin(a) * 0.44, y + 0.3, Math.cos(a) * 0.44, 0, a);
  b.cylT(0.56, 0.5, 0.08, CHROME, 0, y + 1.12, 0, 6);
  b.cylT(0.08, 0.1, 0.2, GRID, 0, y + 1.2, 0, 8);
  b.add(BALL, CHROME, 0, y + 1.5, 0, 0.2, 0.2, 0.2);
  hoop(b, 0.22, 0.02, CYAN, 0, y + 1.5, 0, Math.PI / 2, 0, 20);
  b.add(BALL, MAGENTA, 0, y + 1.72, 0, 0.05, 0.05, 0.05);
};
// The energy dome over the walls: cyan meridians, magenta parallels and a ring at its crown.
const energyDome = () => {
  const dome = new B(), radius = RAMPART.apothem - RAMPART.thickness / 2 - 0.02;
  for (let k = 0; k < 6; k++) hoop(dome, radius, 0.012, CYAN, 0, 0, 0, 0, k * Math.PI / 6, 20, Math.PI);
  for (const elevation of [Math.PI / 6, Math.PI / 3]) {
    hoop(dome, radius * Math.cos(elevation), 0.012, MAGENTA, 0, radius * Math.sin(elevation), 0, Math.PI / 2, 0, 32);
  }
  hoop(dome, radius * 0.22, 0.014, CYAN, 0, radius * 0.975, 0, Math.PI / 2, 0, 12);
  return dome.geometry();
};

// Castle: an energy-dome fortress. Eight white rampart walls, banded in dark glass and topped with cyan neon, close an
// octagon round a dark court, a white pylon at each corner; laser turrets with team bands stand on the four walls that
// face the axes, and the gate opens in the front wall through a team portal barred by cyan energy bars. The keep is a
// white hexagonal tower with dark glass slit bands and team banners, crowned by the dome generator; over it all the
// energy dome, a lattice of cyan meridians and magenta parallels, turns slowly. Patrol drones hover by the turrets.
export function castle(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04;
  b.box(s, y, s, PAVE);
  b.cylT(RAMPART.apothem, RAMPART.apothem, 0.02, APRON, 0, y, 0, 8, 0, OCTANT);
  for (let i = 0; i < 8; i++) rampart(b, t, y, i);
  energyGate(b, td, y);
  keep(b, t, y);
  // The energy dome over the walls; drones by the turrets.
  extra.spinners = [{ geo: energyDome(), at: [0, y + RAMPART.height, 0], axis: 'y', speed: 0.25 }];
  extra.floaters = [
    { geo: drone(MAGENTA, 1.2).geometry(), at: [1.55, 1.2, -0.75], amp: 0.12, speed: 1.4 },
    { geo: drone(CYAN, 1.2).geometry(), at: [-0.75, 1.3, 1.55], amp: 0.12, speed: 1.6, phase: 2 },
  ];
  return y + 1.77;
}

// ---------- Factory ----------
// A floating robot arm for a floater, reaching along +x: an antigravity hub over a neon ring, a white upper arm and
// forearm on a grey elbow, a magenta tool tip.
const robotArm = () => {
  const g = new B().add(BALL, CHROME, 0, 0, 0, 0.07, 0.07, 0.07);
  hoop(g, 0.1, 0.012, CYAN, 0, -0.04, 0, Math.PI / 2, 0, 14);
  stick(g, 0.032, SNOW, [0, 0, 0], [0.12, 0.2, 0], CYL6); // upper arm
  g.add(BALL, GRID, 0.12, 0.2, 0, 0.042, 0.042, 0.042); // elbow
  stick(g, 0.026, SNOW, [0.12, 0.2, 0], [0.36, 0.02, 0], CYL6); // forearm
  return g.box(0.06, 0.05, 0.05, GRID, 0.37, -0.005, 0).add(BALL, MAGENTA, 0.405, 0.0, 0, 0.022, 0.022, 0.022);
};
// The fab shell: its faceted profile ([z, height] from the back to the front), extruded `length` along x centred at x.
const SHELL = {
  profile: [[-1.3, 0], [-1.3, 1.3], [-1.02, 1.48], [-0.55, 1.18], [-0.26, 0.6], [-0.18, 0]],
  length: 2.0,
  x: -0.25,
};
// The shell's geometry: the profile as a shape, extruded and centred on its length.
const shellGeometry = () => {
  const { profile, length } = SHELL, shape = new THREE.Shape();
  shape.moveTo(-profile[0][0], profile[0][1]);
  for (const [z, height] of profile.slice(1)) shape.lineTo(-z, height);
  shape.closePath();
  const hall = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  hall.translate(0, 0, -length / 2);
  return hall;
};
// A facet's frame on the shell standing on y: the point a fraction f along the facet from profile[i] to profile[i + 1],
// `out` from it, and the facet's tilt, as [z, y, tilt].
const facetAt = (y, i, f, out = 0.012) => {
  const [z0, y0] = SHELL.profile[i], [z1, y1] = SHELL.profile[i + 1], length = Math.hypot(z1 - z0, y1 - y0);
  const normalZ = (y0 - y1) / length, normalY = (z1 - z0) / length;
  return [z0 + (z1 - z0) * f + normalZ * out, y + y0 + (y1 - y0) * f + normalY * out, Math.atan2(y0 - y1, z1 - z0)];
};
// The shell, neon on its ridges, the glass ribbon and team stripe on its facets, the bay and its frame in the front
// facet, the team stripe on its end.
const fabShell = (b, t, y) => {
  const { profile, length, x } = SHELL, hall = shellGeometry();
  b.add(hall, SNOW, x, y, 0, 1, 1, 1, 0, Math.PI / 2, 0);
  hall.dispose();
  for (const [z, height] of profile.slice(2, 5)) b.box(length + 0.02, 0.03, 0.03, CYAN, x, y + height - 0.015, z);
  const [ribbonZ, ribbonY, ribbonTilt] = facetAt(y, 2, 0.5);
  b.box(length - 0.16, 0.02, 0.24, GLASS, x, ribbonY - 0.01, ribbonZ, ribbonTilt);
  const [stripeZ, stripeY, stripeTilt] = facetAt(y, 3, 0.5);
  b.box(length - 0.02, 0.02, 0.1, t, x, stripeY - 0.01, stripeZ, stripeTilt);
  const [bayZ, bayY, bayTilt] = facetAt(y, 4, 0.55);
  b.box(1.0, 0.02, 0.48, GLASS, 0.15, bayY - 0.01, bayZ, bayTilt);
  const [frameZ, frameY, frameTilt] = facetAt(y, 4, 0.12);
  b.box(1.06, 0.03, 0.03, CYAN, 0.15, frameY - 0.015, frameZ, frameTilt);
  b.box(0.02, 0.12, 0.9, t, x + length / 2 + 0.005, y + 0.55, -0.8);
};
// The nano-vats at the shell's end, piped into it.
const nanoVats = (b, y) => {
  for (const z of [-1.02, -0.56]) {
    b.cylT(0.2, 0.22, 0.08, CHROME, 1.0, y, z, 10);
    b.cylT(0.17, 0.17, 1.1, FLUID, 1.0, y + 0.08, z, 12);
    b.add(DOME, SNOW, 1.0, y + 1.18, z, 0.17, 0.1, 0.17);
    for (const ringY of [0.35, 0.7, 1.05]) b.cylT(0.176, 0.176, 0.03, ringY > 1 ? MAGENTA : CYAN, 1.0, y + ringY, z, 12);
    b.box(0.2, 0.05, 0.05, CHROME, SHELL.x + SHELL.length / 2 + 0.1, y + 0.3, z);
  }
};
// The assembly cradle at (x, z).
const CRADLE = { x: 0.1, z: 0.66 };
// The cradle: a dark disc in neon rings, and the hull being printed on it, its turret still a cage of neon layers.
const printCradle = (b, t, td, y) => {
  const { x, z } = CRADLE;
  b.cylT(0.55, 0.6, 0.08, DARK, x, y, z, 16);
  hoop(b, 0.58, 0.016, CYAN, x, y + 0.06, z, Math.PI / 2, 0, 32);
  hoop(b, 0.36, 0.012, MAGENTA, x, y + 0.08, z, Math.PI / 2, 0, 24);
  for (const side of [-1, 1]) {
    b.box(0.6, 0.006, 0.12, DARK, x, y + 0.08, z + side * 0.15);
    b.box(0.6, 0.012, 0.014, GRID, x, y + 0.13, z + side * 0.15);
  }
  b.box(0.58, 0.06, 0.12, DARK, x, y + 0.08, z - 0.15); // the tracks
  b.box(0.58, 0.06, 0.12, DARK, x, y + 0.08, z + 0.15);
  b.box(0.52, 0.1, 0.26, t, x - 0.02, y + 0.12, z); // the hull
  b.box(0.16, 0.05, 0.26, td, x + 0.3, y + 0.15, z, 0, 0, -0.6); // its glacis
  b.box(0.24, 0.04, 0.22, td, x - 0.05, y + 0.22, z); // the turret ring
  for (const layerY of [0.29, 0.34, 0.39]) for (const side of [-1, 1]) {
    b.box(0.24, 0.012, 0.012, CYAN, x - 0.05, y + layerY, z + side * 0.105);
    b.box(0.012, 0.012, 0.22, CYAN, x - 0.05 + side * 0.115, y + layerY, z);
  }
  b.box(0.3, 0.012, 0.012, CYAN, x + 0.22, y + 0.33, z); // the gun, still a line of light
};

// Factory: a nanofab with floating arms. A faceted white fab shell across the back, its ridges lit in neon, a ribbon
// of dark glass along its upper facet and a team stripe along its lower one; a dark glass bay opens in its front under
// a neon frame, and two glass nano-vats ringed in cyan stand piped to its end. Before it, on a glowing assembly cradle,
// a team tank hull is being printed, its turret still a cage of cyan layers; three robot arms float round it with no
// mounts, their magenta tool tips at work, and a scanning halo turns over the cradle.
export function factory(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.08, { x: cx, z: cz } = CRADLE;
  b.box(s, 0.04, s, PAVE);
  neonSlab(b, s - 0.12, s - 0.12, 0.04, 0, 0, 0.04);
  fabShell(b, t, y);
  nanoVats(b, y);
  printCradle(b, t, td, y);
  // The floating arms round the cradle, reaching in; the scanning halo.
  extra.floaters = [0.5, 2.6, 4.7].map((a, i) => {
    const g = new B();
    place(g, robotArm(), 0, 0, 0, Math.PI - a, 1.3);
    const at = [cx + Math.cos(a) * 0.72, y + 0.4, cz + Math.sin(a) * 0.72];
    return { geo: g.geometry(), at, amp: 0.05, speed: 1.8 + i * 0.3, phase: i * 2 };
  });
  const halo = hoop(new B(), 0.48, 0.014, CYAN, 0, 0, 0, Math.PI / 2 + 0.28, 0, 32).geometry();
  extra.spinners = [{ geo: halo, at: [cx, y + 0.78, cz], axis: 'y', speed: 0.9 }];
  return y + 1.5;
}

// ---------- AI Future defences ----------
// The laser turret's head height, its aim (a unit vector toward the field), the direction across the aim, and its yaw.
const HEAD_Y = 1.92, AIM = [0.447, 0, 0.894], ACROSS = [AIM[2], 0, -AIM[0]], AIM_YAW = Math.atan2(AIM[0], AIM[2]);
// A point `along` the aim from the head's centre, `across` it and `up` from it.
const onAim = (along, across = 0, up = 0) => [
  AIM[0] * along + ACROSS[0] * across,
  HEAD_Y + up,
  AIM[2] * along + ACROSS[2] * across,
];
// The plinth, the column with its team band and neon rings, and the collar.
const turretColumn = (b, t, y) => {
  b.cylT(0.8, 0.86, 0.22, SNOW, 0, y, 0, 6);
  b.cylT(0.875, 0.875, 0.03, CYAN, 0, y + 0.13, 0, 6);
  b.cylT(0.74, 0.74, 0.03, APRON, 0, y + 0.22, 0, 6);
  b.cylT(0.2, 0.34, 1.25, SNOW, 0, y + 0.25, 0, 8);
  b.cylT(0.3, 0.315, 0.12, t, 0, 0.55, 0, 8);
  for (const [ringY, radius] of [[0.98, 0.265], [1.3, 0.235]]) b.cylT(radius, radius, 0.025, CYAN, 0, ringY, 0, 8);
  b.cylT(0.36, 0.22, 0.12, CHROME, 0, 1.5, 0, 12);
};
// The head: the pod, its visor and team fin, the heat sinks behind; the emitter: barrel, coils, prongs and lens.
const turretHead = (b, t) => {
  b.sph(0.4, SNOW, 0, HEAD_Y, 0, 1, 0.72, 1);
  b.sph(0.405, DARK, 0, HEAD_Y + 0.03, 0, 1, 0.2, 1);
  b.box(0.05, 0.14, 0.38, t, ...onAim(-0.04, 0, 0.22), 0, AIM_YAW);
  for (const across of [-0.12, -0.04, 0.04, 0.12]) b.box(0.03, 0.18, 0.16, GRID, ...onAim(-0.42, across, -0.09), 0, AIM_YAW);
  stick(b, 0.07, CHROME, onAim(0.3), onAim(0.82), CYL8);
  for (const f of [0.46, 0.58, 0.7]) stick(b, 0.088, CYAN, onAim(f), onAim(f + 0.025), CYL8);
  for (const across of [-0.1, 0.1]) stick(b, 0.022, CHROME, onAim(0.55, across), onAim(0.98, across * 0.6), CYL6);
  stick(b, 0.06, CYAN, onAim(0.82), onAim(0.85), DISC);
};
// The laser (extra.fire): the beam out of the lens, the flare at the lens and a spark where it strikes.
const laserShot = () => {
  const fire = new B(), tip = onAim(0.86), end = onAim(2.1, 0, -0.18);
  stick(fire, 0.04, CYAN, tip, end, CYL6);
  fire.add(BALL, HOT, ...tip, 0.12, 0.12, 0.12).add(BALL, MAGENTA, ...end, 0.08, 0.08, 0.08);
  return { geo: fire.geometry(), at: [0, 0, 0] };
};

// Tower: a laser turret. A white hexagonal plinth edged in cyan neon carries a tapering white column, team-banded and
// ringed with neon, up to a chrome collar and the turret head: a white pod with a dark visor and a team fin, its chrome
// emitter (neon focusing coils, twin prongs and a glowing lens) aimed at the field and heat-sink fins behind. A magenta
// ring turns round the head (a spinner) and a crystal hovers over it (a floater). Its shot is the laser: a beam from
// the lens and the flare at its source (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, y = 0.03;
  b.box(1.76, y, 1.76, PAVE);
  turretColumn(b, t, y);
  turretHead(b, t);
  flag(ctx, -0.56, y + 0.25, -0.56, 0.9, CHROME);
  extra.spinners = [{ geo: ring(0.62, 0.025, MAGENTA, 0.35), at: [0, HEAD_Y, 0], axis: 'y', speed: 1.1 }];
  const crystal = new B().add(GEM, CYAN, 0, 0, 0, 0.09, 0.17, 0.09).add(GEM, t, 0, 0, 0, 0.05, 0.1, 0.05).geometry();
  extra.floaters = [{ geo: crystal, at: [0, HEAD_Y + 0.62, 0], amp: 0.07, speed: 1.5 }];
  extra.fire = laserShot();
  return HEAD_Y + 0.37;
}

// Wall: an energy barrier. A dark plinth with a cyan neon edge and a white deck, white emitter pylons with team caps
// at its corners, and between them a block of humming energy, its crest edged in neon and its faces crossed by three
// laser beams, cyan and magenta; it fills its tile edge to edge, so segments in a line close up into one barrier, the
// beams running on from pylon to pylon.
export function wall(ctx) {
  const { b, t } = ctx, deckTop = 0.16, pylonTop = 0.86, fieldHalf = 0.44, fieldTop = 0.76;
  b.box(1, 0.1, 1, DARK); // plinth
  b.box(1, 0.025, 1, CYAN, 0, 0.1, 0); // its neon edge
  b.box(1, 0.035, 1, SNOW, 0, 0.125, 0); // deck
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.box(0.1, pylonTop - deckTop, 0.1, SNOW, x * 0.45, deckTop, z * 0.45);
    b.box(0.1, 0.06, 0.1, t, x * 0.45, pylonTop, z * 0.45);
  }
  b.box(2 * fieldHalf, fieldTop - deckTop, 2 * fieldHalf, FLUID, 0, deckTop, 0); // the energy block
  for (const side of [-1, 1]) {
    b.box(2 * fieldHalf, 0.02, 0.02, CYAN, 0, fieldTop, side * (fieldHalf - 0.01));
    b.box(0.02, 0.02, 2 * fieldHalf - 0.04, CYAN, side * (fieldHalf - 0.01), fieldTop, 0);
    for (const [i, beamY] of [0.3, 0.46, 0.62].entries()) {
      const color = i === 1 ? MAGENTA : CYAN;
      b.box(0.8, 0.025, 0.025, color, 0, beamY, side * 0.475);
      b.box(0.025, 0.025, 0.8, color, side * 0.475, beamY, 0);
    }
  }
  return pylonTop + 0.06;
}
