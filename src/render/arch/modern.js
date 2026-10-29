// Modern Age: today's glass, steel and concrete under flat roofs, with signage, air-con units, solar panels and
// antennas. A glass office tower with a helipad, a white cube house, corrugated steel grain bins, a container yard, a
// greenhouse, an army base with a turning radar, a concrete shooting range, a motor pool, a supermarket, a glass
// government block, a twisting skyscraper, a concrete bunker complex and a clean modern plant; for defence, a missile
// turret with a sweeping radar and a precast concrete barrier.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, stick, place, HOT, CYL6, CYL8, DISC, BALL, CONE4, FRUSTUM } from './kit.js';

// ---------- the Modern palette ----------
// The Town Center's concrete, steel grey, asphalt and glass, and the House's lawn; olive drab for the military.
const WHITE = P.white, CONC = P.concrete, CONC_L = 0xd9d7d1, CONC_D = 0xa3a19b, ASPH = 0x3a3d40, ASPH_L = 0x4d5155;
const STEEL = 0x8d8f91, STEEL_L = 0xb4bcc2, STEEL_D = 0x5f656b, GLASS = P.glass, GLASS_D = 0x2c3e4c, DARK = P.dark;
const ROOF = 0x55595c, SOLAR = 0x1f3550, PANE = 0xcfe3ea, LIT = 0xfffbea, RED = 0xff3b30, YELLOW = 0xe2b83a;
const LAWN = 0x7d8a5a, GRASS = 0x6f8a4a, GRASS_D = 0x5f7a40, PAVE = 0xd3cfc4, GRAVEL = 0xa59d8a, WATER = 0x4f86a8;
const DIRT = 0x8f8670, SAND = 0xc8bfa2, SAND_D = 0xa89f84, LINE = 0xf0eee6, OLIVE = P.olive, OLIVE_D = 0x434b2d;
const TYRE = 0x222426, BARK = 0x6b5a46, LEAF = 0x4f7a3a, LEAF_L = 0x6a9a48, TOMATO = 0xd2402c, CRATE = 0x3d8a4e;
// Low-poly parts: a tomato; a half cylinder, curved side toward +x (earth-covered bunkers); a glass dome and its rib.
const OCTA = new THREE.OctahedronGeometry(1, 0), HALF = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false, 0, Math.PI);
const DOME = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const RIB = new THREE.TorusGeometry(1, 0.012, 3, 8, Math.PI / 2);
// A radar dish's shell: wide face at +y.
const DISH = new THREE.CylinderGeometry(1, 0.35, 1, 16);

// ---------- House and Town Center ----------
export function house(ctx) {
  const { b, s, t } = ctx;
  // Two offset white boxes on the lawn, with dark glazing, flat roofs and solar panels.
  b.box(s + 0.1, 0.05, s + 0.1, LAWN);
  b.box(1.25, 0.62, 0.95, WHITE, -0.2, 0.05, 0.12);
  b.box(1.0, 0.56, 0.85, 0xdadad6, 0.22, 0.67, -0.12);
  b.box(0.8, 0.42, 0.03, DARK, -0.35, 0.12, 0.6);
  b.box(0.7, 0.36, 0.03, DARK, 0.25, 0.76, 0.32);
  b.box(0.03, 0.36, 0.5, DARK, 0.73, 0.76, -0.1);
  b.box(1.27, 0.04, 0.97, ASPH, -0.2, 0.67, 0.12);
  b.box(1.02, 0.05, 0.87, ASPH, 0.22, 1.23, -0.12);
  for (let i = 0; i < 3; i++) b.box(0.24, 0.02, 0.4, SOLAR, -0.08 + i * 0.27, 1.32, -0.15, -0.35);
  // Garage door and driveway, a team-coloured front door, a garden tree.
  b.box(0.5, 0.36, 0.03, STEEL, 0.55, 0.05, 0.45);
  b.box(0.6, 0.02, 0.5, ASPH, 0.55, 0.05, 0.75);
  b.box(0.16, 0.42, 0.03, t, -0.75, 0.05, 0.6);
  b.cyl(0.03, 0.35, BARK, -0.78, 0.05, -0.65);
  b.foliage(0.2, LEAF, -0.78, 0.35, -0.65);
  return 1.41;
}

// The office tower's roof: plant boxes and the helipad with its H; the antenna and its red light are in the mast.
const towerRoof = (b, mast, x, z) => {
  b.box(0.3, 0.2, 0.25, STEEL, x - 0.35, 2.8, z - 0.3);
  b.box(0.25, 0.18, 0.25, STEEL, x + 0.4, 2.8, z - 0.32);
  mast.cyl(0.02, 0.9, STEEL, x + 0.5, 2.8, z + 0.35);
  mast.sph(0.04, RED, x + 0.5, 3.72, z + 0.35);
  b.cyl(0.38, 0.03, ASPH, x - 0.05, 2.8, z + 0.1);
  b.box(0.04, 0.02, 0.3, WHITE, x - 0.15, 2.84, z + 0.1);
  b.box(0.04, 0.02, 0.3, WHITE, x + 0.05, 2.84, z + 0.1);
  b.box(0.2, 0.02, 0.04, WHITE, x - 0.05, 2.84, z + 0.1);
};

export function town_center(ctx) {
  const { b, mast, s, t, td } = ctx, towerX = 0.3, towerZ = -0.25, podiumFront = -0.1 + s * 0.35;
  // Concrete podium with a glass tower banded by floor slabs.
  b.box(s + 0.1, 0.05, s + 0.1, ASPH);
  b.box(s - 0.2, 0.55, s * 0.7, CONC, 0, 0.05, -0.1);
  b.box(s - 0.24, 0.3, 0.03, DARK, 0, 0.12, podiumFront + 0.01);
  b.box(1.36, 2.2, 1.16, GLASS, towerX, 0.6, towerZ);
  for (let i = 0; i <= 5; i++) b.box(1.42, 0.06, 1.22, CONC, towerX, 0.6 + i * 0.43, towerZ);
  towerRoof(b, mast, towerX, towerZ);
  // Podium solar panels, the entrance canopy on its two posts and the team-coloured sign.
  for (let i = 0; i < 4; i++) b.box(0.26, 0.02, 0.36, SOLAR, -0.95 + i * 0.3, 0.64, -0.6, -0.3);
  const canopyZ = s * 0.25;
  b.box(0.9, 0.05, 0.45, STEEL, -0.55, 0.5, canopyZ + 0.15);
  b.box(0.04, 0.45, 0.04, STEEL, -0.95, 0.05, canopyZ + 0.35);
  b.box(0.04, 0.45, 0.04, STEEL, -0.15, 0.05, canopyZ + 0.35);
  b.box(0.6, 0.12, 0.03, t, -0.55, 0.38, podiumFront + 0.02);
  // Three flagpoles with their flags (in the mast, so the flags never hang off a hidden pole), and a crossing.
  const poleZ = s / 2 - 0.12;
  for (let i = 0; i < 3; i++) {
    mast.cyl(0.015, 1.1, C.iron, 0.6 + i * 0.28, 0.05, poleZ);
    mast.box(0.02, 0.18, 0.3, i === 1 ? t : td, 0.6 + i * 0.28, 0.9, poleZ + 0.15);
  }
  for (let i = 0; i < 5; i++) b.box(0.03, 0.01, 0.4, WHITE, -1.15 + i * 0.25, 0.05, s / 2 - 0.2);
  return 3.0;
}

// ---------- shared Modern parts ----------
// A point on a wall face centred at (x, z) facing ry (0: +z): `along` the face, `out` from it.
const onFace = (x, z, ry) => (along, out = 0) => [
  x + along * Math.cos(ry) + out * Math.sin(ry),
  z - along * Math.sin(ry) + out * Math.cos(ry),
];
// [x, z] turned by `angle` about y, as rotation.y turns it.
const turn = ([x, z], angle) => [x * Math.cos(angle) + z * Math.sin(angle), -x * Math.sin(angle) + z * Math.cos(angle)];
// The colour with each channel scaled by `factor` (below 1 darkens).
const shadeColor = (color, factor) => {
  const channel = shift => Math.min(255, Math.round(((color >> shift) & 255) * factor));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

// A glazed curtain wall `width` wide and `height` tall on the wall face centred at (x, z) facing ry, from y0: glass in
// mullions about `bay` apart, with a transom at each of `floors` floor lines.
const curtainWall = (b, x, z, ry, width, y0, height, floors, bay = 0.2, glass = GLASS, frame = WHITE) => {
  const at = onFace(x, z, ry), [glassX, glassZ] = at(0, 0.006), [transomX, transomZ] = at(0, 0.014);
  const mullions = Math.max(1, Math.round(width / bay));
  b.box(width, height, 0.012, glass, glassX, y0, glassZ, 0, ry);
  for (let i = 0; i <= mullions; i++) {
    const [mx, mz] = at(-width / 2 + i * width / mullions, 0.013);
    b.box(0.02, height, 0.014, frame, mx, y0, mz, 0, ry);
  }
  for (let f = 0; f <= floors; f++) {
    b.box(width + 0.02, 0.026, 0.016, frame, transomX, y0 + Math.min(f * height / floors, height - 0.026), transomZ, 0, ry);
  }
};
// A rooftop air-con unit standing on y, scaled by `size`, its fan grille on top.
const airCon = (b, x, y, z, size = 1) => {
  b.box(0.2 * size, 0.11 * size, 0.15 * size, STEEL_L, x, y, z);
  b.add(CYL8, DARK, x, y + 0.11 * size + 0.004, z, 0.045 * size, 0.008, 0.045 * size);
};
// A chain-link fence from p to q standing on y: steel posts about 0.28 apart, a top rail and two line wires.
const fence = (b, [x0, z0], [x1, z1], y, height = 0.3) => {
  const length = Math.hypot(x1 - x0, z1 - z0), posts = Math.max(1, Math.round(length / 0.28));
  const ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let i = 0; i <= posts; i++) b.box(0.02, height, 0.02, STEEL, x0 + (x1 - x0) * i / posts, y, z0 + (z1 - z0) * i / posts);
  for (const [wireY, thickness] of [[height - 0.014, 0.014], [height * 0.5, 0.006], [0.05, 0.006]]) {
    b.box(length, thickness, thickness, STEEL_L, (x0 + x1) / 2, y + wireY, (z0 + z1) / 2, 0, ry);
  }
};
// A small round tree standing on y, scaled by `size`.
const tree = (b, x, y, z, size = 1) => {
  b.cylT(0.02 * size, 0.03 * size, 0.2 * size, BARK, x, y, z, 6);
  b.foliage(0.15 * size, LEAF, x, y + 0.16 * size, z);
};
// A barrier arm of `stripes` stripes, alternately team and white, from x along -x at height y (on z).
const boomArm = (b, t, x, y, z, stripes, stripeWidth = 0.096) => {
  for (let i = 0; i < stripes; i++) {
    b.box(stripeWidth, 0.03, 0.03, i % 2 ? WHITE : t, x - stripeWidth / 2 - i * stripeWidth, y, z);
  }
};

// ---------- vehicles, for place(): each built at the origin facing +x, on its wheels ----------
// A pair of wheels (one each side of a body `width` wide) at each x in xs.
const wheels = (v, xs, width, radius = 0.04) => {
  for (const x of xs) for (const side of [-1, 1]) {
    v.add(CYL8, TYRE, x, radius, side * (width / 2 - 0.01), radius, 0.035, radius, Math.PI / 2, 0, 0);
  }
};
// A car in `color`: body, glasshouse and roof.
const car = color => {
  const v = new B();
  v.box(0.36, 0.075, 0.17, color, 0, 0.03, 0);
  v.box(0.2, 0.065, 0.155, GLASS_D, -0.02, 0.105, 0);
  v.box(0.19, 0.012, 0.15, color, -0.02, 0.17, 0);
  wheels(v, [-0.11, 0.11], 0.17);
  return v;
};
// A pickup in `color` with a load of produce crates in its bed.
const pickup = color => {
  const v = new B();
  v.box(0.4, 0.07, 0.18, color, 0, 0.035, 0); // chassis
  v.box(0.14, 0.08, 0.17, color, 0.05, 0.105, 0); // cab
  v.box(0.012, 0.055, 0.15, GLASS_D, 0.121, 0.12, 0); // windscreen
  for (const side of [-1, 1]) {
    v.box(0.09, 0.045, 0.012, GLASS_D, 0.05, 0.125, side * 0.086); // side window
    v.box(0.17, 0.05, 0.012, color, -0.11, 0.105, side * 0.084); // bed side
  }
  v.box(0.012, 0.05, 0.18, color, -0.195, 0.105, 0); // tailgate
  v.box(0.1, 0.06, 0.13, CRATE, -0.1, 0.105, 0);
  v.box(0.09, 0.01, 0.12, TOMATO, -0.1, 0.165, 0);
  wheels(v, [-0.12, 0.12], 0.18);
  return v;
};
// An olive military utility vehicle with the team mark on its bonnet and doors, and a spare wheel on the back.
const jeep = t => {
  const v = new B();
  v.box(0.42, 0.09, 0.2, OLIVE, 0, 0.04, 0); // body
  v.box(0.22, 0.085, 0.19, OLIVE, -0.06, 0.13, 0); // cab
  v.box(0.012, 0.06, 0.16, GLASS_D, 0.051, 0.142, 0); // windscreen
  for (const side of [-1, 1]) {
    v.box(0.14, 0.045, 0.012, GLASS_D, -0.06, 0.15, side * 0.096);
    v.box(0.07, 0.05, 0.006, t, -0.06, 0.06, side * 0.102);
  }
  v.box(0.09, 0.005, 0.09, t, 0.13, 0.13, 0); // bonnet mark
  v.box(0.03, 0.03, 0.21, OLIVE_D, 0.21, 0.05, 0); // bumper
  v.add(CYL8, TYRE, -0.222, 0.12, 0, 0.05, 0.03, 0.05, 0, 0, Math.PI / 2); // spare wheel
  wheels(v, [-0.13, 0.13], 0.2, 0.045);
  return v;
};
// A truck: its cab in `color` at the front, the load (a body `length` long) in `load`, with the team mark (if any) on
// the cab doors and a team stripe (if any) along the load.
const truck = (color, load, { mark, stripe, len: length = 0.46 } = {}) => {
  const v = new B(), width = 0.22, loadX = 0.15 - length / 2;
  v.box(length + 0.2, 0.04, 0.16, TYRE, 0.07 - length / 2 + 0.23, 0.05, 0); // chassis
  v.box(0.16, 0.2, width, color, 0.24, 0.06, 0); // cab
  v.box(0.012, 0.08, width - 0.04, GLASS_D, 0.32, 0.16, 0); // windscreen
  for (const side of [-1, 1]) {
    v.box(0.08, 0.07, 0.012, GLASS_D, 0.26, 0.16, side * (width / 2 + 0.002));
    if (mark) v.box(0.06, 0.05, 0.006, mark, 0.24, 0.09, side * (width / 2 + 0.004));
    if (stripe) v.box(length, 0.04, 0.006, stripe, loadX, 0.2, side * (width / 2 + 0.008));
  }
  v.box(length, 0.24, width + 0.01, load, loadX, 0.09, 0);
  wheels(v, [loadX - length / 2 + 0.1, loadX - length / 2 + 0.22, 0.24], width, 0.045);
  return v;
};
// An eight-wheeled armoured personnel carrier with a sloped glacis, a small turret and the team marks.
const apc = t => {
  const v = new B();
  v.box(0.56, 0.13, 0.24, OLIVE, 0, 0.06, 0); // hull
  v.box(0.14, 0.1, 0.24, OLIVE, 0.3, 0.07, 0, 0, 0, 0.7); // glacis
  v.box(0.18, 0.07, 0.15, OLIVE_D, -0.04, 0.19, 0); // turret
  v.box(0.1, 0.005, 0.1, t, -0.19, 0.19, 0);
  stick(v, 0.012, OLIVE_D, [0.04, 0.23, 0], [0.32, 0.24, 0], CYL6); // gun
  for (const side of [-1, 1]) v.box(0.09, 0.06, 0.006, t, -0.12, 0.11, side * 0.123);
  wheels(v, [-0.21, -0.07, 0.07, 0.21], 0.25, 0.05);
  return v;
};

// ---------- Granary ----------
// A corrugated grain bin of radius r, `height` tall, at (x, z) on its concrete ring: ribs, the team band, the conical
// roof with its vent cap, and a ladder up the side facing the camera. Returns the point its spout pipe comes down to.
const grainBin = (b, t, y, x, z, r, height) => {
  const baseY = y + 0.06, top = baseY + height, roofRise = r * 0.6, apexY = top + 0.03 + roofRise;
  b.cylT(r + 0.05, r + 0.06, 0.06, CONC, x, y, z, 16);
  b.cylT(r, r, height, STEEL_L, x, baseY, z, 16);
  for (let ribY = baseY + 0.09; ribY < top - 0.2; ribY += 0.11) b.cylT(r + 0.007, r + 0.007, 0.016, STEEL, x, ribY, z, 16);
  b.cylT(r + 0.01, r + 0.01, 0.07, t, x, top - 0.15, z, 16);
  b.cylT(r + 0.03, r + 0.03, 0.03, STEEL, x, top, z, 16); // eaves ring
  b.cone(r + 0.03, roofRise, STEEL_L, x, top + 0.03, z, 16);
  b.cylT(0.05, 0.07, 0.07, STEEL, x, apexY - 0.05, z, 8); // vent
  b.cone(0.08, 0.05, STEEL_L, x, apexY + 0.02, z, 8); // its cap
  // The ladder up the side facing the camera.
  const out = (r + 0.02) * Math.SQRT1_2, railOffset = 0.03 * Math.SQRT1_2;
  for (const side of [-1, 1]) {
    b.box(0.012, height, 0.012, STEEL_D, x + out - side * railOffset, baseY, z + out + side * railOffset);
  }
  for (let rungY = baseY + 0.08; rungY < top; rungY += 0.08) {
    b.box(0.072, 0.008, 0.008, STEEL_D, x + out, rungY, z + out, 0, Math.PI / 4);
  }
  return [x, apexY + 0.04, z];
};
// The distributor tower at (x, z): four legs braced on the camera faces, a railed platform and the distributor head,
// its spout pipes down to the bins (fills). Returns the platform's height.
const distributorTower = (b, y, x, z, fills) => {
  const height = 1.42, platformY = y + height;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.03, height, 0.03, STEEL_D, x + sx * 0.1, y, z + sz * 0.1);
  for (let i = 0; i < 3; i++) {
    const y1 = y + i * height / 3 + 0.02, y2 = y + (i + 1) * height / 3, [from, to] = i % 2 ? [-0.1, 0.1] : [0.1, -0.1];
    stick(b, 0.008, STEEL, [x + from, y1, z + 0.1], [x + to, y2, z + 0.1], unit.box);
    stick(b, 0.008, STEEL, [x + 0.1, y1, z + to], [x + 0.1, y2, z + from], unit.box);
  }
  b.box(0.3, 0.03, 0.3, STEEL, x, platformY, z);
  b.box(0.3, 0.012, 0.012, STEEL_L, x, platformY + 0.13, z + 0.14); // rails
  b.box(0.012, 0.012, 0.3, STEEL_L, x + 0.14, platformY + 0.13, z);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1]]) b.box(0.012, 0.13, 0.012, STEEL_L, x + sx * 0.14, platformY, z + sz * 0.14);
  b.cylT(0.07, 0.05, 0.12, STEEL_L, x, platformY + 0.03, z, 8);
  b.cone(0.075, 0.06, STEEL, x, platformY + 0.15, z, 8);
  for (const fill of fills) stick(b, 0.022, STEEL, [x, platformY + 0.08, z], fill, CYL6);
  return platformY;
};
// The intake hopper and its grate, the auger up to the distributor head on its A-frame, and the truck unloading.
const grainIntake = (b, t, y, towerX, towerZ, platformY) => {
  const x = 0.72, z = 0.74, foot = [x - 0.04, y + 0.1, z - 0.04];
  const mid = [(x + towerX) / 2, (y + platformY) / 2, (z + towerZ) / 2];
  b.box(0.3, 0.02, 0.3, STEEL_D, x, y, z);
  b.cylT(0.14, 0.05, 0.12, STEEL, x, y + 0.02, z, 4, 0, Math.PI / 4);
  stick(b, 0.032, STEEL_L, foot, [towerX + 0.04, platformY - 0.04, towerZ + 0.04], CYL8);
  b.box(0.09, 0.08, 0.11, STEEL_D, x - 0.12, y, z - 0.02); // auger motor
  for (const side of [-1, 1]) stick(b, 0.012, STEEL_D, [mid[0] + side * 0.12, y, mid[2] - side * 0.12], mid, unit.box);
  place(b, truck(t, STEEL_L), 0.22, y, 0.78, Math.PI);
};

// Granary: steel silos with pipes. Three corrugated steel grain bins on concrete rings, each banded in team colour
// under a conical roof with a vent cap and a ladder up its camera side. Among them a steel distributor tower carries
// the spout pipes down to each bin's roof, fed by an inclined auger from the intake hopper, where a grain truck with a
// team cab unloads.
export function granary(ctx) {
  const { b, s, t } = ctx, y = 0.04, fills = [], towerX = 0.32, towerZ = 0.26;
  b.box(s, y, s, CONC_D);
  for (const [x, z, r, height] of [[-0.4, -0.4, 0.42, 0.95], [0.5, -0.5, 0.3, 0.72], [-0.52, 0.48, 0.3, 0.72]]) {
    fills.push(grainBin(b, t, y, x, z, r, height));
  }
  const platformY = distributorTower(b, y, towerX, towerZ, fills);
  grainIntake(b, t, y, towerX, towerZ, platformY);
  return platformY + 0.21;
}

// ---------- Storage Pit ----------
const CONTAINER_WIDTH = 0.24, CONTAINER_HEIGHT = 0.25;
// A shipping container, 20 ft (length 0.5) or 40 ft (length 1.0), facing +x for place() and standing on y = 0: ribbed
// sides in `color`, a darker frame of rails and corner posts, and the doors at its +x end with their locking bars.
const container = (color, length) => {
  const g = new B(), width = CONTAINER_WIDTH, height = CONTAINER_HEIGHT, frame = shadeColor(color, 0.72);
  const ribs = Math.round(length / 0.085);
  g.box(length, height, width, color);
  for (let i = 1; i < ribs; i++) for (const side of [-1, 1]) {
    g.box(0.03, height - 0.05, 0.01, color, -length / 2 + i * length / ribs, 0.025, side * (width / 2 + 0.004));
  }
  for (const railY of [0, height - 0.024]) g.box(length + 0.004, 0.024, width + 0.012, frame, 0, railY, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.box(0.028, height, 0.028, frame, sx * (length / 2 - 0.012), 0, sz * (width / 2 - 0.008)); // corner posts
  }
  g.box(0.006, height - 0.05, 0.008, frame, length / 2 + 0.002, 0.025, 0); // the doors' meeting line
  for (const barZ of [-0.085, -0.035, 0.035, 0.085]) g.box(0.008, height - 0.06, 0.008, STEEL_L, length / 2 + 0.004, 0.03, barZ);
  return g;
};
// A top-lift container handler facing +x for place(): its yellow body and cab, the mast and the spreader holding a
// 20 ft box in `color` sideways at the front.
const containerHandler = color => {
  const v = new B();
  v.box(0.34, 0.12, 0.24, YELLOW, -0.02, 0.06, 0); // body
  v.box(0.12, 0.14, 0.14, GLASS_D, -0.1, 0.18, -0.04); // cab
  v.box(0.13, 0.015, 0.15, YELLOW, -0.1, 0.32, -0.04); // cab roof
  for (const side of [-1, 1]) v.box(0.04, 0.78, 0.04, STEEL_D, 0.17, 0.04, side * 0.08); // mast
  v.box(0.14, 0.03, 0.1, STEEL_D, 0.24, 0.63, 0); // spreader arm
  v.box(0.2, 0.03, 0.46, STEEL_D, 0.33, 0.63, 0); // spreader
  wheels(v, [-0.12, 0.12], 0.26, 0.06);
  place(v, container(color, 0.5), 0.33, 0.38, 0, Math.PI / 2);
  return v;
};
// The container colours.
const ORANGE = 0xc8742c, GREEN_C = 0x3f6b4a, CREAM = 0xd9d4c4, BROWN = 0x7a4a2e, BLUE_GREY = 0x5d7380, GREY_C = 0x8a8f93;
// The stacks: 40 ft boxes three and two high across the back, a 20 ft box on top, 20 ft boxes down the right.
const containerStacks = (b, t, y) => {
  for (const [x, z, colors] of [[-0.3, -0.72, [GREY_C, t, ORANGE]], [-0.3, -0.45, [GREEN_C, CREAM]]]) {
    for (const [i, color] of colors.entries()) place(b, container(color, 1.0), x, y + i * CONTAINER_HEIGHT, z);
  }
  place(b, container(BROWN, 0.5), -0.55, y + 2 * CONTAINER_HEIGHT, -0.45);
  for (const [x, colors] of [[0.52, [t, BROWN]], [0.78, [BLUE_GREY]]]) {
    for (const [i, color] of colors.entries()) place(b, container(color, 0.5), x, y + i * CONTAINER_HEIGHT, -0.5, -Math.PI / 2);
  }
};
// The white site office on its blocks: windows, the team door and steps, an air-con unit and the flag.
const siteOffice = (ctx, y) => {
  const { b, t } = ctx, x = -0.48, z = 0.5, width = 0.6, depth = 0.3, height = 0.28, floorY = y + 0.04;
  const front = z + depth / 2 + 0.004;
  b.box(width - 0.04, 0.04, depth - 0.04, CONC_D, x, y, z); // blocks
  b.box(width, height, depth, WHITE, x, floorY, z);
  b.box(width + 0.02, 0.025, depth + 0.02, STEEL, x, floorY + height, z); // roof
  for (const dx of [-0.18, 0.0]) b.box(0.14, 0.09, 0.012, GLASS_D, x + dx, floorY + 0.13, front);
  b.box(0.012, 0.09, 0.16, GLASS_D, x + width / 2 + 0.004, floorY + 0.13, z);
  b.box(0.1, 0.21, 0.012, t, x + 0.2, floorY, front);
  b.box(0.14, 0.04, 0.08, STEEL, x + 0.2, y, front + 0.04);
  airCon(b, x - 0.1, floorY + height + 0.025, z - 0.02, 0.8);
  flag(ctx, x - 0.26, floorY + height + 0.025, z - 0.1, 0.45, STEEL, [0.18, 0.3]);
};

// Storage Pit: stacked shipping containers. A container yard on asphalt: 40 ft boxes stacked three and two high across
// the back, 20 ft boxes two high down the right, several in team colour, among lane markings. A yellow top-lift
// handler brings another box in; the white site office on its blocks has a team door, steps, an air-con unit and the
// flag.
export function storage_pit(ctx) {
  const { b, s, t } = ctx, y = 0.03;
  b.box(s, y, s, ASPH_L);
  for (const [x, z, width, depth] of [[-0.3, -0.29, 1.12, 0.02], [0.36, -0.5, 0.02, 0.6], [0.36, 0.33, 0.9, 0.02]]) {
    b.box(width, 0.004, depth, YELLOW, x, y, z); // lane markings
  }
  containerStacks(b, t, y);
  place(b, containerHandler(ORANGE), 0.42, y, 0.4, Math.PI / 2);
  siteOffice(ctx, y);
  return y + 0.85;
}

// ---------- Farm ----------
// The glasshouse: its footprint x0..x1 × z0..z1, the walls' height, each roof span's width and rise, and the slope
// length and tilt of a span's two roof faces.
const GREENHOUSE = (() => {
  const x0 = -0.84, x1 = 0.84, z0 = -0.84, z1 = 0.46, depth = z1 - z0, wallHeight = 0.48, rise = 0.17, span = (x1 - x0) / 3;
  const slope = Math.hypot(span / 2, rise), tilt = Math.atan2(rise, span / 2);
  return { x0, x1, z0, z1, depth, cz: (z0 + z1) / 2, wallHeight, rise, span, slope, tilt };
})();
// The frame: posts, the kick plate, transoms on the open walls, the glazed back walls and the gutters. Returns the
// posts' z (the roof's glazing bars line up on them).
const greenhouseFrame = (b, y) => {
  const { x0, x1, z0, z1, depth, cz, wallHeight, span } = GREENHOUSE;
  const xs = [0, 1, 2, 3].map(i => x0 + i * span), zs = [0, 1, 2, 3].map(i => z0 + i * depth / 3);
  for (const x of xs) for (const z of zs) b.box(0.024, wallHeight, 0.024, WHITE, x, y, z);
  b.box(x1 - x0, 0.07, 0.02, STEEL_L, 0, y, z1); // kick plates
  b.box(0.02, 0.07, depth, STEEL_L, x1, y, cz);
  for (const transomY of [0.07, wallHeight * 0.55]) {
    b.box(x1 - x0, 0.016, 0.016, WHITE, 0, y + transomY, z1);
    b.box(0.016, 0.016, depth, WHITE, x1, y + transomY, cz);
  }
  b.box(x1 - x0, wallHeight, 0.012, PANE, 0, y, z0);
  b.box(0.012, wallHeight, depth, PANE, x0, y, cz);
  for (const x of xs) b.box(0.05, 0.03, depth + 0.04, WHITE, x, y + wallHeight, cz);
  return zs;
};
// The roof spans: the back slope glazed, the sunny one open between its glazing bars; the ridge; the gable ends,
// glazed at the back.
const greenhouseRoof = (b, gutterY, zs) => {
  const { x0, z0, depth, cz, rise, span, slope, tilt } = GREENHOUSE;
  for (let i = 0; i < 3; i++) {
    const cx = x0 + (i + 0.5) * span;
    b.box(slope, 0.01, depth, PANE, cx - span / 4, gutterY + rise / 2 - 0.005, cz, 0, 0, tilt);
    for (const z of zs) b.box(slope, 0.014, 0.018, WHITE, cx + span / 4, gutterY + rise / 2 - 0.007, z, 0, 0, -tilt);
    b.box(0.03, 0.02, depth + 0.04, WHITE, cx, gutterY + rise - 0.01, cz);
    b.roof(span, rise, 0.01, PANE, cx, gutterY, z0);
  }
};
// The tomato rows, two to a span, in white troughs (into b): the vines and their trusses (into the crops).
const tomatoRows = (b, y) => {
  const { x0, z0, depth, cz, span } = GREENHOUSE, crops = new B();
  for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
    const x = x0 + (i + 0.5) * span + side * span / 4;
    b.box(0.09, 0.035, depth - 0.12, WHITE, x, y, cz);
    crops.box(0.07, 0.28, depth - 0.16, LEAF, x, y + 0.035, cz);
    for (let j = 0; j < 7; j++) {
      const z = z0 + 0.12 + j * (depth - 0.24) / 6, leafY = 0.3 + ((i * 2 + j * 3 + side) % 3) * 0.025;
      crops.add(BALL, j % 2 ? LEAF_L : LEAF, x, y + leafY, z, 0.06, 0.05, 0.06);
      for (const [dx, dy, dz] of [[0.04, 0.12, 0.03], [0.042, 0.2, -0.04], [-0.04, 0.16, 0]]) {
        crops.add(OCTA, TOMATO, x + dx, y + dy, z + dz, 0.022, 0.022, 0.022);
      }
    }
  }
  return crops.geometry();
};
// The apron: the team-banded water tank, crates of tomatoes on a pallet, the pickup.
const farmApron = (b, t, y) => {
  const { x0, x1 } = GREENHOUSE;
  b.box(x1 - x0, 0.012, 0.36, CONC_L, 0, y, 0.68);
  b.cylT(0.13, 0.13, 0.36, WHITE, -0.66, y, 0.68, 12);
  b.cylT(0.135, 0.135, 0.05, t, -0.66, y + 0.24, 0.68, 12);
  b.cone(0.135, 0.05, WHITE, -0.66, y + 0.36, 0.68, 12);
  b.box(0.26, 0.03, 0.2, C.wood, -0.26, y, 0.7); // pallet
  for (const [dx, dz, lift] of [[-0.06, -0.045, 0], [0.06, -0.045, 0], [-0.06, 0.045, 0], [0.06, 0.045, 0], [0, 0, 0.07]]) {
    b.box(0.11, 0.07, 0.08, CRATE, -0.26 + dx, y + 0.03 + lift, 0.7 + dz);
    b.box(0.1, 0.012, 0.07, TOMATO, -0.26 + dx, y + 0.09 + lift, 0.7 + dz);
  }
  place(b, pickup(t), 0.42, y, 0.7);
};

// Farm: a greenhouse. A three-span glasshouse of white steel. Its back walls and the back slope of each roof span are
// glazed; the front and right walls are open frames over a low kick plate, and the sunny slopes' vents are open, so the
// tomato rows inside (extra.crops, shown once the farm is finished, shrinking as the food runs out) show through. A
// team-framed door opens onto the concrete apron, with a team-banded water tank, crates of tomatoes on a pallet and a
// team pickup loaded with more.
export function farm(ctx) {
  const { b, s, t, extra } = ctx, y = 0.03, { x0, x1, z1, depth, cz, wallHeight, rise } = GREENHOUSE;
  const gutterY = y + wallHeight + 0.03;
  b.box(s, y, s, GRAVEL);
  b.box(x1 - x0, 0.006, depth, 0xdedcd2, 0, y, cz); // the glasshouse floor
  const zs = greenhouseFrame(b, y);
  greenhouseRoof(b, gutterY, zs);
  // The team door frame in the front wall.
  for (const side of [-1, 1]) b.box(0.03, 0.38, 0.03, t, side * 0.12, y, z1 + 0.012);
  b.box(0.27, 0.035, 0.03, t, 0, y + 0.38, z1 + 0.012);
  extra.crops = tomatoRows(b, y);
  farmApron(b, t, y);
  return gutterY + rise + 0.01;
}

// ---------- Barracks ----------
// The radar built at the origin for a spinner turning about y: a turntable and yoke carrying a white dish that looks
// out along +x, tipped up, with its feed horn on struts, a team hub on its back and a counterweight.
const radar = t => {
  const g = new B(), tilt = 0.4, axis = [Math.cos(tilt), Math.sin(tilt)], up = [-Math.sin(tilt), Math.cos(tilt)];
  const hub = [0.0, 0.36], dishDepth = 0.1, rz = -(Math.PI / 2 - tilt);
  // A point `along` the dish's axis from its hub, `above` it and `z` across.
  const onAxis = (along, above = 0, z = 0) => [
    hub[0] + axis[0] * along + up[0] * above,
    hub[1] + axis[1] * along + up[1] * above,
    z,
  ];
  g.add(CYL8, STEEL_D, 0, 0.03, 0, 0.09, 0.06, 0.09); // turntable
  g.box(0.05, 0.22, 0.12, STEEL, -0.04, 0.06, 0); // yoke
  g.add(DISH, WHITE, ...onAxis(0), 0.3, dishDepth, 0.3, 0, 0, rz);
  g.add(DISC, 0xdfe3e6, ...onAxis(dishDepth / 2 + 0.003), 0.27, 0.006, 0.27, 0, 0, rz);
  g.add(CYL8, t, ...onAxis(-dishDepth / 2 - 0.03), 0.1, 0.06, 0.1, 0, 0, rz);
  g.box(0.08, 0.08, 0.1, STEEL_D, -0.16, 0.26, 0); // counterweight
  const feed = onAxis(0.3);
  stick(g, 0.012, STEEL, onAxis(dishDepth / 2), feed, CYL6);
  for (const [above, z] of [[0.26, 0], [-0.26, 0], [0, 0.26], [0, -0.26]]) {
    stick(g, 0.005, STEEL, onAxis(dishDepth / 2, above, z), feed, CYL6); // the feed's struts
  }
  g.box(0.05, 0.05, 0.05, STEEL_D, feed[0], feed[1] - 0.025, 0, 0, 0, rz);
  return g.geometry();
};

// The barrack block, x0..x1 × z0..z1.
const BARRACK = { x0: -1.32, x1: 0.42, z0: -1.32, z1: -0.64 };
// The barrack block: plinth, walls, ribbon windows (split round the door), the team band, coping and roof, the
// canopied door, air-con and antennas.
const barrackBlock = (ctx, y) => {
  const { b, mast, t, td } = ctx, { x0, x1, z0, z1 } = BARRACK, width = x1 - x0, depth = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, wallHeight = 0.78, floorY = y + 0.05, top = floorY + wallHeight;
  b.box(width + 0.04, 0.05, depth + 0.04, CONC_D, cx, y, cz);
  b.box(width, wallHeight, depth, SAND, cx, floorY, cz);
  const doorX = cx - 0.3, gap = [doorX - 0.17, doorX + 0.17];
  for (const [from, to] of [[x0 + 0.08, gap[0]], [gap[1], x1 - 0.08]]) {
    curtainWall(b, (from + to) / 2, z1, 0, to - from, floorY + 0.14, 0.14, 1, 0.16, GLASS_D, SAND_D);
  }
  curtainWall(b, cx, z1, 0, width - 0.16, floorY + 0.48, 0.14, 1, 0.16, GLASS_D, SAND_D);
  for (const sillY of [0.14, 0.48]) {
    curtainWall(b, x1, cz, Math.PI / 2, depth - 0.16, floorY + sillY, 0.14, 1, 0.16, GLASS_D, SAND_D);
  }
  b.box(width + 0.02, 0.07, depth + 0.02, t, cx, top - 0.14, cz);
  b.box(width + 0.04, 0.06, depth + 0.04, SAND_D, cx, top - 0.06, cz); // coping
  b.box(width - 0.06, 0.006, depth - 0.06, ROOF, cx, top, cz);
  b.box(0.2, 0.3, 0.012, td, doorX, floorY, z1 + 0.006);
  b.box(0.42, 0.03, 0.22, CONC, doorX, floorY + 0.38, z1 + 0.11); // canopy
  for (const side of [-1, 1]) b.box(0.02, 0.38, 0.02, STEEL, doorX + side * 0.19, floorY, z1 + 0.2);
  for (const [x, z] of [[cx - 0.55, cz], [cx + 0.05, cz - 0.1], [cx + 0.55, cz + 0.05]]) airCon(b, x, top, z);
  mast.cyl(0.01, 0.42, STEEL, x0 + 0.15, top, z0 + 0.15);
  mast.cyl(0.008, 0.3, STEEL, x0 + 0.3, top, z0 + 0.12);
};
// The radar tower: tapering lattice legs, X-braced, a railed platform, the equipment cabin and the radar on it.
// Returns the platform's height.
const radarTower = (ctx, y) => {
  const { b, t, extra } = ctx, x = 0.95, z = -0.92, height = 1.55, baseY = y + 0.06;
  // A leg's point at fraction f of the way up, on the corner (sx, sz).
  const leg = (sx, sz, f) => { const w = 0.2 - 0.08 * f; return [x + sx * w, baseY + height * f, z + sz * w]; };
  b.box(0.52, 0.06, 0.52, CONC, x, y, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) stick(b, 0.018, STEEL_D, leg(sx, sz, 0), leg(sx, sz, 1), unit.box);
  for (let i = 0; i < 4; i++) {
    const f0 = i / 4, f1 = (i + 1) / 4;
    for (const [p, q] of [[[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]]]) {
      stick(b, 0.007, STEEL, leg(...p, f0), leg(...q, f1), unit.box);
      stick(b, 0.007, STEEL, leg(...q, f0), leg(...p, f1), unit.box);
      stick(b, 0.007, STEEL, leg(...p, f1), leg(...q, f1), unit.box);
    }
  }
  const platformY = baseY + height;
  b.box(0.42, 0.04, 0.42, STEEL_D, x, platformY, z);
  b.box(0.42, 0.012, 0.012, STEEL_L, x, platformY + 0.15, z + 0.2); // rails
  b.box(0.012, 0.012, 0.42, STEEL_L, x + 0.2, platformY + 0.15, z);
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1]]) b.box(0.012, 0.15, 0.012, STEEL_L, x + sx * 0.2, platformY, z + sz * 0.2);
  b.box(0.26, 0.16, 0.26, WHITE, x, platformY + 0.04, z); // equipment cabin
  b.box(0.265, 0.035, 0.265, t, x, platformY + 0.13, z);
  extra.spinners = [{ geo: radar(t), at: [x, platformY + 0.2, z], axis: 'y', speed: 1.2 }];
  return platformY;
};
// The fence and the gate: its guard booth, the boom barrier and jersey barriers.
const baseFenceAndGate = (b, h, t, y) => {
  const edge = h - 0.04;
  fence(b, [-edge, edge], [0.3, edge], y);
  fence(b, [0.98, edge], [edge, edge], y);
  fence(b, [edge, edge], [edge, -edge], y);
  fence(b, [-edge, edge], [-edge, -0.6], y);
  const boothX = 1.12, boothZ = 1.0;
  b.box(0.28, 0.3, 0.26, WHITE, boothX, y, boothZ);
  b.box(0.285, 0.1, 0.265, GLASS_D, boothX, y + 0.15, boothZ);
  b.box(0.287, 0.03, 0.267, t, boothX, y + 0.08, boothZ);
  b.box(0.36, 0.035, 0.34, CONC, boothX, y + 0.3, boothZ);
  b.box(0.05, 0.17, 0.05, STEEL_D, 0.93, y, 1.2); // the boom's post
  boomArm(b, t, 0.92, y + 0.13, 1.2, 6);
  for (const x of [0.2, 0.62]) b.add(FRUSTUM, CONC, x, y + 0.05, 1.05, 0.18, 0.1, 0.045);
};
// The parade square and its flag; the jeeps and the truck.
const paradeSquare = (ctx, y) => {
  const { b, t } = ctx;
  b.box(1.0, 0.006, 0.8, ASPH, 0.45, y, 0.3);
  const lines = [[1.0, 0.02, 0.45, -0.1], [1.0, 0.02, 0.45, 0.7], [0.02, 0.8, -0.05, 0.3], [0.02, 0.8, 0.95, 0.3]];
  for (const [width, depth, x, z] of lines) {
    b.box(width, 0.007, depth, LINE, x, y, z);
  }
  flag(ctx, 0.45, y, 0.3, 1.1, STEEL, [0.26, 0.46]);
  for (const x of [-1.05, -0.73]) place(b, jeep(t), x, y, -0.2, -Math.PI / 2);
  place(b, truck(OLIVE, OLIVE_D, { mark: t }), -0.85, y, 0.55);
};

// Barracks: an army base with a radar dish. Behind a chain-link fence, a two-storey barrack block of sand-coloured
// concrete with ribbon windows, a team band under its parapet, a canopied team door and air-con units on its flat roof.
// A steel lattice tower in the back corner carries the radar: its dish (an animated spinner) sweeps round on the
// equipment cabin. At the gate, a guard booth and a team-striped boom barrier between jersey barriers; olive jeeps and
// a truck are parked by the block, and the flag flies over the asphalt parade square.
export function barracks(ctx) {
  const { b, s, h, t } = ctx, y = 0.03;
  b.box(s, y, s, 0x9b9478);
  barrackBlock(ctx, y);
  const platformY = radarTower(ctx, y);
  baseFenceAndGate(b, h, t, y);
  paradeSquare(ctx, y);
  return platformY + 0.2;
}

// ---------- Archery Range ----------
const RANGE_LANES = [-1.05, -0.63, -0.21, 0.21, 0.63, 1.05];
// The mown lanes, the low lane walls with their distance boards, and the side walls.
const rangeLanes = (b, y) => {
  for (const [i, x] of RANGE_LANES.entries()) b.box(0.42, 0.005, 1.56, i % 2 ? GRASS : 0x7d9a52, x, y, 0.14);
  for (let i = 1; i < 6; i++) {
    const x = -1.26 + i * 0.42;
    b.box(0.035, 0.1, 1.5, CONC, x, y, 0.15);
    for (const z of [0.4, -0.12]) {
      b.box(0.06, 0.1, 0.08, WHITE, x, y + 0.1, z);
      b.box(0.062, 0.04, 0.03, DARK, x, y + 0.13, z);
    }
  }
  for (const side of [-1, 1]) b.box(0.07, 0.26, 2.24, CONC_D, side * 1.33, y, -0.2);
};
// The target trench, the silhouette targets behind it with their team rings, the berm and the backstop.
const rangeTargets = (b, t, y) => {
  b.box(2.6, 0.13, 0.07, CONC, 0, y, -0.64);
  for (const x of RANGE_LANES) {
    for (const side of [-1, 1]) b.box(0.016, 0.44, 0.016, STEEL_D, x + side * 0.14, y, -0.76);
    b.box(0.26, 0.32, 0.014, WHITE, x, y + 0.14, -0.745); // the board
    b.box(0.06, 0.06, 0.006, DARK, x, y + 0.38, -0.735); // the silhouette's head
    b.box(0.16, 0.17, 0.006, DARK, x, y + 0.2, -0.735); // and body
    b.add(DISC, t, x, y + 0.29, -0.729, 0.05, 0.006, 0.05, Math.PI / 2, 0, 0);
    b.add(DISC, WHITE, x, y + 0.29, -0.724, 0.02, 0.006, 0.02, Math.PI / 2, 0, 0);
  }
  b.roof(0.5, 0.48, 2.6, GRASS_D, 0, y, -1.04, Math.PI / 2);
  b.box(2.72, 0.5, 0.06, CONC, 0, y, -1.32);
};
// The firing line: floor, back wall, end walls, columns, the team partitions and benches, the roof and fascia.
// Returns the roof's height and z.
const firingLine = (b, t, y) => {
  const z0 = 0.92, z1 = 1.34, cz = (z0 + z1) / 2, floorY = y + 0.05, roofY = y + 0.56, roofZ = cz - 0.03;
  b.box(2.76, 0.05, z1 - z0, CONC_L, 0, y, cz);
  b.box(2.76, 0.24, 0.07, CONC_D, 0, floorY, z1 - 0.035);
  for (const side of [-1, 1]) b.box(0.06, roofY - floorY, z1 - z0, CONC_D, side * 1.35, floorY, cz);
  for (let i = 0; i <= 6; i++) {
    const x = -1.26 + i * 0.42;
    b.box(0.07, roofY - floorY, 0.07, CONC, x, floorY, z0 + 0.035);
    if (i > 0 && i < 6) b.box(0.03, 0.42, 0.34, t, x, floorY, cz + 0.02);
  }
  for (const x of RANGE_LANES) {
    b.box(0.03, 0.2, 0.03, STEEL_D, x, floorY, z0 + 0.1); // bench leg
    b.box(0.24, 0.03, 0.1, WHITE, x, floorY + 0.2, z0 + 0.1); // bench
  }
  b.box(2.8, 0.06, 0.52, CONC, 0, roofY, roofZ);
  b.box(2.8, 0.05, 0.015, t, 0, roofY + 0.005, roofZ + 0.268);
  b.box(0.015, 0.05, 0.52, t, 1.408, roofY + 0.005, roofZ);
  return [roofY, roofZ];
};
// The range-control cabin on the roof, its antenna and the flag. Returns its top.
const rangeControl = (ctx, roofY, roofZ) => {
  const { b, mast } = ctx, x = -0.85, floorY = roofY + 0.06;
  b.box(0.56, 0.24, 0.34, CONC_L, x, floorY, roofZ);
  curtainWall(b, x, roofZ + 0.17, 0, 0.5, floorY + 0.07, 0.13, 1, 0.14, GLASS_D, WHITE);
  curtainWall(b, x + 0.28, roofZ, Math.PI / 2, 0.28, floorY + 0.07, 0.13, 1, 0.14, GLASS_D, WHITE);
  b.box(0.62, 0.03, 0.4, WHITE, x, floorY + 0.24, roofZ);
  airCon(b, x - 0.14, floorY + 0.27, roofZ - 0.04, 0.8);
  mast.cyl(0.008, 0.36, STEEL, x - 0.22, floorY + 0.27, roofZ - 0.12);
  flag(ctx, x + 0.22, floorY + 0.27, roofZ - 0.1, 0.45, STEEL, [0.18, 0.3]);
  return floorY + 0.37;
};

// Archery Range: a concrete range with booths. A covered firing line of concrete across the front: a low back wall,
// its flat roof with a team fascia, and booths divided by team-coloured partitions, a bench in each; the glazed
// range-control cabin on the roof flies the flag. Six mown lanes run downrange between low concrete lane walls with
// distance boards, inside concrete side walls, to a concrete target trench: behind it stand the silhouette targets with
// team rings, before a grassed earth berm and the concrete backstop.
export function archery_range(ctx) {
  const { b, s, t } = ctx, y = 0.03;
  b.box(s, y, s, GRASS);
  rangeLanes(b, y);
  rangeTargets(b, t, y);
  const [roofY, roofZ] = firingLine(b, t, y);
  return rangeControl(ctx, roofY, roofZ);
}

// ---------- Stable ----------
// The motor pool's cladding and metal roof.
const CLAD = 0xa7ab9a, ROOF_M = 0x6f7a80;
// The garage, x0..x1 × z0..z1, its wall height and roof rise.
const GARAGE = { x0: -1.32, x1: 1.0, z0: -1.32, z1: -0.42, wallHeight: 0.7, roofRise: 0.16 };
// The steel shed: ribbed cladding on the camera faces, the roof and its ridge vents. Returns the eaves height.
const garageShed = (b, y) => {
  const { x0, x1, z0, z1, wallHeight, roofRise } = GARAGE, width = x1 - x0, depth = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, top = y + wallHeight;
  b.box(width, wallHeight, depth, CLAD, cx, y, cz);
  b.roof(depth + 0.08, roofRise, width + 0.08, ROOF_M, cx, top, cz, Math.PI / 2);
  for (let x = x0 + 0.05; x < x1; x += 0.09) b.box(0.03, wallHeight, 0.01, CLAD, x, y, z1 + 0.006);
  for (let z = z0 + 0.05; z < z1; z += 0.09) b.box(0.01, wallHeight, 0.03, CLAD, x1 + 0.006, y, z);
  for (let i = 0; i < 3; i++) b.box(0.12, 0.05, 0.08, STEEL, cx - 0.7 + i * 0.7, top + roofRise - 0.02, cz);
  return top;
};
// The bays: frames, team roller doors (two open, a vehicle in each), the bay numbers; the +x end's team personnel door
// and window.
const garageBays = (b, t, td, y) => {
  const { x0, x1, z1 } = GARAGE, cx = (x0 + x1) / 2, cz = (GARAGE.z0 + z1) / 2;
  for (const [i, dx] of [-0.84, -0.28, 0.28, 0.84].entries()) {
    const x = cx + dx;
    b.box(0.5, 0.56, 0.02, STEEL_D, x, y, z1 + 0.016); // frame
    b.box(0.08 + i * 0.03, 0.05, 0.008, YELLOW, x, y + 0.6, z1 + 0.014); // number
    if (i % 2) {
      b.box(0.42, 0.5, 0.012, DARK, x, y, z1 + 0.03); // open, dark inside
      b.box(0.44, 0.07, 0.03, t, x, y + 0.45, z1 + 0.04); // the rolled-up door
      continue;
    }
    b.box(0.42, 0.5, 0.012, t, x, y, z1 + 0.03);
    for (let slat = 1; slat < 7; slat++) b.box(0.42, 0.008, 0.016, shadeColor(t, 0.75), x, y + slat * 0.07, z1 + 0.032);
  }
  place(b, jeep(t), cx - 0.28, y, z1 - 0.05, -Math.PI / 2);
  place(b, truck(OLIVE, OLIVE_D, { mark: t }), cx + 0.84, y, z1 - 0.12, -Math.PI / 2);
  b.box(0.012, 0.3, 0.12, td, x1 + 0.012, y, cz + 0.22);
  b.box(0.012, 0.12, 0.25, GLASS_D, x1 + 0.012, y + 0.38, cz - 0.12);
};
// The fuel point: its island and pump, the team-trimmed canopy on two posts; the team-banded tank on its saddles.
const fuelPoint = (b, t, y) => {
  const x = 0.95, z = 0.9;
  b.box(0.4, 0.05, 0.2, CONC, x, y, z);
  b.box(0.08, 0.2, 0.06, WHITE, x, y + 0.05, z);
  b.box(0.082, 0.04, 0.062, t, x, y + 0.17, z);
  for (const side of [-1, 1]) b.box(0.03, 0.4, 0.03, STEEL, x + side * 0.17, y + 0.05, z);
  b.box(0.52, 0.03, 0.36, t, x, y + 0.42, z);
  b.box(0.5, 0.03, 0.34, WHITE, x, y + 0.45, z);
  b.add(unit.cyl, WHITE, 1.15, y + 0.15, 0.32, 0.1, 0.42, 0.1, Math.PI / 2, 0, 0);
  b.add(unit.cyl, t, 1.15, y + 0.15, 0.32, 0.102, 0.06, 0.102, Math.PI / 2, 0, 0);
  for (const side of [-1, 1]) b.box(0.18, 0.07, 0.04, STEEL_D, 1.15, y, 0.32 + side * 0.13);
};

// Stable: a motor-pool garage. A long steel shed clad in ribbed olive-grey sheeting under a low metal roof with ridge
// vents, four roller-door bays across its front, numbered in yellow: two shut in team colour, two open with a jeep
// and a truck nosing out. The asphalt yard has parking lines, another jeep and a truck, a fuel point with a
// team-trimmed canopy and pump, a team-banded fuel tank on saddles, oil drums and the flag.
export function stable(ctx) {
  const { b, s, t, td } = ctx, y = 0.03, cx = (GARAGE.x0 + GARAGE.x1) / 2;
  b.box(s, y, s, ASPH);
  const top = garageShed(b, y);
  garageBays(b, t, td, y);
  // The yard: parking lines, the parked jeep and truck, the fuel point and tank, the drums and the flag.
  for (const x of [-1.28, -0.72, -0.16, 0.4, 0.96]) b.box(0.02, 0.004, 0.55, YELLOW, x, y, 0.0);
  place(b, jeep(t), cx - 0.84, y, 0.02, -Math.PI / 2);
  place(b, truck(OLIVE, OLIVE_D, { mark: t }), -0.42, y, 0.82);
  fuelPoint(b, t, y);
  for (const [x, z, color] of [[-1.2, 1.12, OLIVE], [-1.08, 1.15, STEEL_D], [-1.15, 1.25, OLIVE], [-1.24, 1.24, YELLOW]]) {
    b.add(CYL8, color, x, y + 0.075, z, 0.05, 0.15, 0.05);
  }
  flag(ctx, -1.28, y, 0.5, 0.95, STEEL);
  return top + GARAGE.roofRise + 0.03;
}

// ---------- Market ----------
const STORE = 0xe4e2dc;
// The store, x0..x1 × z0..z1, and its wall height.
const SUPERMARKET = { x0: -1.32, x1: 1.32, z0: -1.32, z1: -0.45, height: 0.7 };
// The store: walls, plinth, the team band, coping and roof, air-con, the pavement; the shop windows and their posters.
const storeBuilding = (b, t, y) => {
  const { x0, x1, z0, z1, height } = SUPERMARKET, width = x1 - x0, depth = z1 - z0, cz = (z0 + z1) / 2, top = y + height;
  b.box(width, height, depth, STORE, 0, y, cz);
  b.box(width + 0.01, 0.07, depth + 0.01, STEEL, 0, y, cz);
  b.box(width + 0.02, 0.06, depth + 0.02, t, 0, top - 0.13, cz);
  b.box(width + 0.04, 0.05, depth + 0.04, WHITE, 0, top - 0.05, cz);
  b.box(width - 0.06, 0.006, depth - 0.06, ROOF, 0, top, cz);
  for (const [x, z] of [[-0.9, -0.85], [-0.3, -1.0], [0.5, -0.8], [0.95, -1.05]]) airCon(b, x, top, z);
  b.box(width, 0.02, 0.26, CONC_L, 0, y, z1 + 0.13);
  for (const side of [-1, 1]) {
    curtainWall(b, side * 0.88, z1, 0, 0.8, y + 0.08, 0.36, 1, 0.2, GLASS, STEEL_L);
    for (let j = 0; j < 4; j++) {
      const poster = [YELLOW, TOMATO, CRATE][(j + (side > 0 ? 1 : 0)) % 3];
      b.box(0.12, 0.16, 0.006, poster, side * 0.88 - 0.3 + j * 0.2, y + 0.16, z1 + 0.016);
    }
  }
};
// The entrance block: glass front and doors, the canopy; the lit sign (glowing letters on a dark board beside the team
// logo, a team underline); the brand disc on the +x end.
const storeEntrance = (b, t, y) => {
  const { x1, z0, z1, height } = SUPERMARKET, cz = (z0 + z1) / 2, top = y + height, frontZ = z1 + 0.08;
  b.box(0.88, 1.0, 0.2, WHITE, 0, y, z1 - 0.02);
  curtainWall(b, 0, frontZ, 0, 0.76, y + 0.02, 0.62, 2, 0.19, GLASS, WHITE);
  b.box(0.3, 0.3, 0.01, GLASS_D, 0, y + 0.02, frontZ + 0.024);
  b.box(1.0, 0.04, 0.4, WHITE, 0, y + 0.66, frontZ + 0.2); // canopy
  b.box(1.02, 0.03, 0.015, t, 0, y + 0.665, frontZ + 0.4);
  for (const side of [-1, 1]) b.box(0.025, 0.66, 0.025, STEEL, side * 0.46, y, frontZ + 0.37);
  b.box(0.84, 0.24, 0.04, DARK, 0, y + 0.73, frontZ + 0.02);
  b.box(0.17, 0.17, 0.012, t, -0.31, y + 0.765, frontZ + 0.046);
  b.box(0.09, 0.09, 0.008, LIT, -0.31, y + 0.805, frontZ + 0.054);
  for (const [x, width] of [[-0.15, 0.07], [-0.05, 0.06], [0.05, 0.08], [0.15, 0.06], [0.25, 0.07]]) {
    b.box(width, 0.11, 0.012, LIT, x, y + 0.8, frontZ + 0.046);
  }
  b.box(0.48, 0.02, 0.012, t, 0.05, y + 0.77, frontZ + 0.046);
  b.add(DISC, t, x1 + 0.006, top - 0.3, cz, 0.15, 0.012, 0.15, 0, 0, Math.PI / 2);
  b.add(DISC, LIT, x1 + 0.012, top - 0.3, cz, 0.1, 0.012, 0.1, 0, 0, Math.PI / 2);
};
// The parked cars: [x, z, colour, ry].
const PARKED_CARS = [
  [-1.05, 0.21, 0xbfc4c8, Math.PI / 2], [-0.45, 0.21, 0xe8e8e4, Math.PI / 2], [0.45, 0.21, 0x2b2f33, Math.PI / 2],
  [0.75, 0.21, GREEN_C, Math.PI / 2], [-0.75, 1.03, YELLOW, -Math.PI / 2], [0.15, 1.03, 0xbfc4c8, -Math.PI / 2],
];
// The car park: bays, cars, the trolley bay of team-handled trolleys, lamp posts (in the mast).
const carPark = (b, mast, t, y) => {
  for (const [rowZ, bays] of [[0.21, 9], [1.03, 8]]) for (let i = 0; i < bays; i++) {
    b.box(0.012, 0.004, 0.42, LINE, -1.2 + i * 0.3, y, rowZ);
  }
  for (const [x, z, color, ry] of PARKED_CARS) place(b, car(color), x, y, z, ry);
  const bayX = -0.15, bayZ = 0.62;
  for (const side of [-1, 1]) {
    b.box(0.012, 0.012, 0.42, STEEL, bayX + side * 0.07, y + 0.12, bayZ); // rail
    b.box(0.015, 0.12, 0.015, STEEL, bayX + side * 0.07, y, bayZ - 0.2); // post
  }
  for (let i = 0; i < 4; i++) {
    b.box(0.1, 0.06, 0.09, STEEL_L, bayX, y + 0.05, bayZ - 0.12 + i * 0.07); // trolley
    b.box(0.1, 0.012, 0.012, t, bayX, y + 0.12, bayZ - 0.08 + i * 0.07); // its handle
  }
  for (const x of [-0.6, 0.6]) {
    mast.cyl(0.012, 0.95, STEEL_D, x, y, 0.62);
    mast.box(0.2, 0.025, 0.05, STEEL_D, x, y + 0.95, 0.62);
  }
};
// The pylon sign at (x, z), turned to face the camera's corner.
const pylonSign = (b, t, y) => {
  const x = 1.2, z = 1.12, ry = Math.PI / 4;
  b.box(0.16, 0.08, 0.1, CONC, x, y, z, 0, ry);
  b.box(0.06, 0.95, 0.04, STEEL_D, x, y + 0.08, z, 0, ry);
  b.box(0.38, 0.32, 0.08, DARK, x, y + 1.0, z, 0, ry);
  b.box(0.32, 0.14, 0.084, LIT, x, y + 1.14, z, 0, ry);
  b.box(0.32, 0.1, 0.084, t, x, y + 1.03, z, 0, ry);
};

// Market: a supermarket with a lit sign. A broad white store with a team band under its coping and air-con units on its
// flat roof. Its glazed entrance block stands proud of the front under a canopy with a team fascia, carrying the lit
// sign: glowing letters and the team logo on a dark board. Shop windows with bright posters run either side, and a lit
// brand disc marks the +x end. In the car park, painted bays with parked cars, a trolley bay of team-handled trolleys,
// lamp posts and the tall lit pylon sign at the corner.
export function market(ctx) {
  const { b, mast, s, t } = ctx, y = 0.03;
  b.box(s, y, s, ASPH);
  storeBuilding(b, t, y);
  storeEntrance(b, t, y);
  carPark(b, mast, t, y);
  pylonSign(b, t, y);
  return y + 1.32;
}

// ---------- Government Center ----------
const GOV_GLASS = 0x6a98ad, DOME_GLASS = 0x9cc4d4;
// The glass block's half-width, its back and front, and its height.
const GOV_BLOCK = { halfWidth: 1.1, z0: -1.15, z1: 0.05, height: 0.84 };
// The forecourt: lawns with trees, the reflecting pool; the podium and its steps. Returns the podium's top.
const govForecourt = (b, y) => {
  for (const side of [-1, 1]) {
    b.box(0.8, 0.012, 0.75, LAWN, side * 0.95, y, 0.95);
    tree(b, side * 0.8, y, 0.85);
    tree(b, side * 1.12, y, 1.12, 0.85);
  }
  b.box(1.06, 0.04, 0.48, CONC_L, 0, y, 0.93);
  b.box(1.0, 0.01, 0.42, WATER, 0, y + 0.034, 0.93);
  const z0 = -1.3, z1 = 0.32;
  b.box(2.6, 0.1, z1 - z0, CONC_L, 0, y, (z0 + z1) / 2);
  for (let i = 0; i < 3; i++) b.box(1.3, 0.1 - i * 0.033, 0.1, CONC_L, 0, y, z1 + 0.05 + i * 0.1);
  return y + 0.1;
};
// The glass block: fins and floor slabs on the camera faces, the door and the emblem.
const govGlassBlock = (b, t, td, podiumY) => {
  const { halfWidth: hw, z0, z1, height } = GOV_BLOCK, cz = (z0 + z1) / 2;
  b.box(2 * hw, height, z1 - z0, GOV_GLASS, 0, podiumY, cz);
  for (let i = 0; i <= 10; i++) if (i !== 5) b.box(0.03, height, 0.07, WHITE, -hw + i * 0.22, podiumY, z1 + 0.035);
  for (let i = 0; i <= 5; i++) b.box(0.07, height, 0.03, WHITE, hw + 0.035, podiumY, z0 + i * 0.24);
  for (let f = 1; f < 3; f++) {
    b.box(2 * hw + 0.02, 0.03, 0.03, WHITE, 0, podiumY + f * height / 3, z1 + 0.015);
    b.box(0.03, 0.03, z1 - z0, WHITE, hw + 0.015, podiumY + f * height / 3, cz);
  }
  b.box(0.36, 0.34, 0.012, td, 0, podiumY, z1 + 0.006);
  b.box(0.4, 0.03, 0.02, WHITE, 0, podiumY + 0.34, z1 + 0.01);
  b.add(DISC, C.gold, 0, podiumY + 0.58, z1 + 0.008, 0.13, 0.012, 0.13, Math.PI / 2, 0, 0);
  b.add(DISC, t, 0, podiumY + 0.58, z1 + 0.016, 0.11, 0.012, 0.11, Math.PI / 2, 0, 0);
};
// The glass dome on its drum over the roof at y: rings and ribs, the oculus. Returns its top.
const govDome = (b, y) => {
  const z = -0.5, radius = 0.44, baseY = y + 0.06;
  b.cylT(radius + 0.04, radius + 0.04, 0.06, WHITE, 0, y, z, 16);
  b.add(DOME, DOME_GLASS, 0, baseY, z, radius, radius, radius);
  for (const f of [0.3, 0.55, 0.78]) {
    const a = f * Math.PI / 2, ringRadius = radius * Math.cos(a) + 0.006;
    b.cylT(ringRadius, ringRadius, 0.014, STEEL_L, 0, baseY + radius * Math.sin(a) - 0.007, z, 16);
  }
  for (let i = 0; i < 8; i++) b.add(RIB, STEEL_L, 0, baseY, z, radius + 0.004, radius + 0.004, 1, 0, i * Math.PI / 4, 0);
  b.cylT(0.08, 0.08, 0.03, STEEL_L, 0, baseY + radius - 0.015, z, 12);
  return baseY + radius;
};

// Government Center: a glass government block. A broad, low block of three glazed storeys on a stone podium, its
// curtain walls ribbed by white fins, under a deep flat roof slab with a team fascia that the colonnade of slim white
// columns carries out over the front; a team emblem over the entrance and a steel-ribbed glass dome on the roof. Broad
// steps come down to the forecourt: a reflecting pool between lawns with trees, and the team flags flanking it.
export function government_center(ctx) {
  const { b, mast, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, PAVE);
  const podiumY = govForecourt(b, y), roofY = podiumY + GOV_BLOCK.height;
  govGlassBlock(b, t, td, podiumY);
  // The roof slab, its team fascia and the colonnade.
  b.box(2.44, 0.07, 1.5, WHITE, 0, roofY, -0.5);
  b.box(2.46, 0.03, 0.012, t, 0, roofY + 0.02, 0.256);
  b.box(0.012, 0.03, 1.5, t, 1.226, roofY + 0.02, -0.5);
  for (let i = 0; i < 7; i++) b.cylT(0.022, 0.022, GOV_BLOCK.height, WHITE, -1.05 + i * 0.35, podiumY, 0.19, 8);
  const domeTop = govDome(b, roofY + 0.07);
  airCon(b, -0.85, roofY + 0.07, -0.9);
  airCon(b, 0.85, roofY + 0.07, -0.95);
  // The flags: the team flag and two more poles beside the pool.
  flag(ctx, -0.68, y, 0.62, 1.0, C.iron);
  for (const [x, color] of [[0.6, td], [0.82, t]]) {
    mast.cyl(0.012, 1.0, C.iron, x, y, 0.62);
    mast.box(0.02, 0.17, 0.3, color, x, y + 0.82, 0.77);
  }
  return domeTop + 0.02;
}

// ---------- Wonder ----------
const GLASS_T = 0x3d6f93;
// The skyscraper: its floor plates, the height its crown starts at and the quarter turn it twists through.
const SKYSCRAPER = { floors: 34, top: 4.9, twist: Math.PI / 2 };
// A floor plate's width at fraction f of the way up.
const plateWidth = f => 1.26 - 0.5 * f;
// The plaza: lawns with trees in three corners, the fountain in the fourth.
const plaza = (b, y) => {
  for (const [x, z] of [[-1.35, 1.35], [1.35, -1.35], [-1.35, -1.35]]) {
    b.box(0.9, 0.012, 0.9, LAWN, x, y, z);
    tree(b, x + 0.15, y, z - 0.12);
    tree(b, x - 0.2, y, z + 0.18, 0.85);
    tree(b, x + 0.22, y, z + 0.25, 0.7);
  }
  b.cylT(0.32, 0.34, 0.08, CONC_L, 1.4, y, 1.4, 16); // the fountain's basin
  b.cylT(0.29, 0.29, 0.01, WATER, 1.4, y + 0.075, 1.4, 16);
  b.cone(0.05, 0.3, PANE, 1.4, y + 0.08, 1.4, 6); // its jet
};
// The podium: glass lobby, team band, roof slab, the canopy; the flag on its roof.
const lobbyPodium = (ctx, y, height) => {
  const { b, t } = ctx;
  b.box(2.0, height, 2.0, GLASS_D, 0, y, 0);
  b.box(2.02, 0.04, 2.02, t, 0, y + height - 0.04, 0);
  b.box(2.06, 0.05, 2.06, WHITE, 0, y + height, 0);
  curtainWall(b, 0, 1.0, 0, 1.96, y, height - 0.04, 1, 0.24, GLASS_D, WHITE);
  curtainWall(b, 1.0, 0, Math.PI / 2, 1.96, y, height - 0.04, 1, 0.24, GLASS_D, WHITE);
  b.box(0.6, 0.03, 0.32, WHITE, 0, y + 0.3, 1.17);
  for (const side of [-1, 1]) b.box(0.025, 0.3, 0.025, STEEL, side * 0.27, y, 1.3);
  flag(ctx, 0.85, y + height + 0.05, 0.85, 0.5, STEEL);
};
// The tower from baseY: its floor plates, tapering and turning, with the team strips on two corners.
const twistingTower = (b, t, baseY) => {
  const { floors, top, twist } = SKYSCRAPER, storey = (top - baseY) / floors;
  for (let i = 0; i < floors; i++) {
    const angle = twist * i / floors, width = plateWidth(i / floors), floorY = baseY + i * storey;
    b.box(width, storey - 0.022, width, GLASS_T, 0, floorY, 0, 0, angle);
    b.box(width + 0.035, 0.022, width + 0.035, WHITE, 0, floorY + storey - 0.022, 0, 0, angle); // slab edge
    for (const side of [-1, 1]) {
      const [cx, cz] = turn([side * (width / 2 + 0.005), side * (width / 2 + 0.005)], angle);
      b.box(0.04, storey - 0.022, 0.04, t, cx, floorY, cz, 0, angle);
    }
  }
};

// Wonder: a skyscraper. A supertall tower of dark glass floor plates, each a little smaller and turned a little further
// than the one below, so the tower twists a quarter turn as it tapers, white slab edges banding it and team-coloured
// light strips spiralling up two corners. It rises from a glass lobby podium with a team band and an entrance canopy,
// and ends in a glass pyramid crown over a lit band; the antenna and its red light are in the mast. Round it, a paved
// plaza with lawns and trees, a fountain and the flag.
export function wonder(ctx) {
  const { b, mast, s, t } = ctx, y = 0.03, podiumHeight = 0.4, { floors, top, twist } = SKYSCRAPER;
  b.box(s, y, s, PAVE);
  plaza(b, y);
  lobbyPodium(ctx, y, podiumHeight);
  twistingTower(b, t, y + podiumHeight + 0.05);
  // The crown: the lit band and the glass pyramid; the antenna.
  const topAngle = twist * (floors - 1) / floors, topWidth = plateWidth((floors - 1) / floors);
  const crownRadius = topWidth / Math.SQRT2;
  b.box(topWidth + 0.06, 0.06, topWidth + 0.06, LIT, 0, top, 0, 0, topAngle);
  b.add(CONE4, GLASS_T, 0, top + 0.06 + 0.22, 0, crownRadius, 0.44, crownRadius, 0, topAngle + Math.PI / 4, 0);
  mast.cyl(0.03, 0.25, STEEL_L, 0, top + 0.42, 0);
  mast.cyl(0.014, 0.8, STEEL_L, 0, top + 0.62, 0);
  mast.sph(0.035, RED, 0, top + 1.44, 0);
  return top + 0.5;
}

// ---------- Castle ----------
const BUNKER = 0xaeaca5;
// The T-walls round the compound, the camera sides team-banded, a gap at the gate: the boom across it and the
// checkpoint booth inside.
const compoundWalls = (b, t, y, edge) => {
  const panels = 13, step = 2 * edge / panels;
  for (let i = 0; i < panels; i++) {
    const u = -edge + (i + 0.5) * step;
    const sides = [[u, edge, 0, true], [edge, u, Math.PI / 2, true], [u, -edge, 0, false], [-edge, u, Math.PI / 2, false]];
    for (const [x, z, ry, team] of sides) {
      if (z === edge && Math.abs(u) < 0.4) continue;
      b.box(0.27, 0.48, 0.07, CONC, x, y, z, 0, ry); // the wall
      b.box(0.27, 0.06, 0.2, CONC_D, x, y, z, 0, ry); // its foot
      if (team) b.box(0.272, 0.05, 0.074, t, x, y + 0.3, z, 0, ry);
    }
  }
  for (const side of [-1, 1]) b.box(0.12, 0.6, 0.2, CONC_D, side * 0.44, y, edge); // gate piers
  b.box(0.05, 0.2, 0.05, STEEL_D, 0.36, y, edge - 0.06);
  boomArm(b, t, 0.34, y + 0.17, edge - 0.06, 7, 0.1);
  b.box(0.26, 0.28, 0.22, WHITE, -0.68, y, edge - 0.3);
  b.box(0.265, 0.09, 0.225, GLASS_D, -0.68, y + 0.14, edge - 0.3);
  b.box(0.32, 0.03, 0.28, CONC, -0.68, y + 0.28, edge - 0.3);
};
// The command bunker: the battered mass and its vents, the blast door under hazard stripes, the command post with its
// slits and team band, its roof with air-con, a dish, antennas and the flag.
const commandBunker = (ctx, y) => {
  const { b, mast, t } = ctx, x = -0.3, z = -0.35, height = 0.55, deckY = y + height;
  b.add(FRUSTUM, BUNKER, x, y + height / 2, z, 0.85, height, 0.85);
  for (const [vx, vz] of [[0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    b.box(0.08, 0.14, 0.08, STEEL_D, x + vx, deckY - 0.04, z + vz);
    b.box(0.11, 0.025, 0.11, CONC_D, x + vx, deckY + 0.1, z + vz);
  }
  b.box(0.44, 0.38, 0.32, CONC_D, x, y, z + 0.78); // the door's portal
  b.box(0.28, 0.28, 0.012, t, x, y, z + 0.946);
  for (let i = 0; i < 8; i++) b.box(0.055, 0.04, 0.012, i % 2 ? DARK : YELLOW, x - 0.1925 + i * 0.055, y + 0.31, z + 0.946);
  b.box(0.8, 0.3, 0.8, CONC_L, x, deckY, z);
  b.box(0.81, 0.05, 0.81, t, x, deckY + 0.06, z);
  b.box(0.6, 0.05, 0.012, DARK, x, deckY + 0.18, z + 0.406);
  b.box(0.012, 0.05, 0.6, DARK, x + 0.406, deckY + 0.18, z);
  const top = deckY + 0.35;
  b.box(0.9, 0.05, 0.9, CONC, x, deckY + 0.3, z);
  airCon(b, x - 0.2, top, z + 0.2, 0.8);
  b.box(0.03, 0.12, 0.03, STEEL_D, x + 0.2, top, z - 0.2);
  b.cylT(0.14, 0.03, 0.05, WHITE, x + 0.2, top + 0.1, z - 0.2, 12, 0.5, 0, -0.5); // the dish
  mast.cyl(0.008, 0.6, STEEL, x - 0.32, top, z - 0.32);
  mast.cyl(0.008, 0.45, STEEL, x - 0.2, top, z - 0.36);
  mast.cyl(0.008, 0.5, STEEL, x - 0.36, top, z - 0.18);
  flag(ctx, x + 0.32, top, z + 0.32, 0.6, STEEL);
};
// A pillbox at (x, z): a concrete hex under a sloped cap, a firing slit in each face, and a gun out toward gunAngle.
const pillbox = (b, y, x, z, gunAngle) => {
  b.add(CYL6, CONC, x, y + 0.17, z, 0.28, 0.34, 0.28);
  b.cylT(0.19, 0.3, 0.1, CONC_D, x, y + 0.34, z, 6);
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + k * Math.PI / 3;
    b.box(0.15, 0.045, 0.02, DARK, x + Math.sin(a) * 0.243, y + 0.21, z + Math.cos(a) * 0.243, 0, a);
  }
  const breech = [x + Math.sin(gunAngle) * 0.2, y + 0.232, z + Math.cos(gunAngle) * 0.2];
  stick(b, 0.018, STEEL_D, breech, [x + Math.sin(gunAngle) * 0.45, y + 0.24, z + Math.cos(gunAngle) * 0.45], CYL6);
};
// The watchtower in the back corner: legs, braces, the cabin with its window band and team band, the roof. Returns
// the cabin floor's height.
const watchtower = (b, t, y) => {
  const x = -1.3, z = -1.3, height = 1.15;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    stick(b, 0.02, STEEL_D, [x + sx * 0.16, y, z + sz * 0.16], [x + sx * 0.12, y + height, z + sz * 0.12], unit.box);
  }
  for (const f of [0.35, 0.7]) {
    b.box(0.3, 0.015, 0.015, STEEL, x, y + height * f, z + 0.15);
    b.box(0.015, 0.015, 0.3, STEEL, x + 0.15, y + height * f, z);
  }
  b.box(0.34, 0.24, 0.34, CONC_L, x, y + height, z);
  b.box(0.345, 0.09, 0.345, GLASS_D, x, y + height + 0.11, z);
  b.box(0.347, 0.03, 0.347, t, x, y + height + 0.05, z);
  b.box(0.4, 0.04, 0.4, CONC_D, x, y + height + 0.24, z);
  return y + height;
};

// Castle: a concrete bunker complex. Concrete T-walls ring the compound, the camera sides painted with a team band, a
// team-striped boom across the gate with a checkpoint booth inside. In the middle the command bunker: a battered
// concrete mass with a blast door in team colour under yellow-and-black hazard stripes, and the command post on top,
// slit-windowed and team-banded, with antennas, a dish and the flag. Hexagonal pillboxes with guns hold three corners,
// an earth-covered magazine with a team door lies to the right, a watchtower stands in the back corner and an APC is
// parked inside the gate.
export function castle(ctx) {
  const { b, s, h, t } = ctx, y = 0.03;
  b.box(s, y, s, DIRT);
  compoundWalls(b, t, y, h - 0.08);
  commandBunker(ctx, y);
  for (const [x, z, gunAngle] of [[1.2, 1.2, Math.PI / 6], [-1.2, 1.15, -Math.PI / 6], [1.2, -1.2, Math.PI / 2]]) {
    pillbox(b, y, x, z, gunAngle);
  }
  // The earth-covered magazine and its team door.
  b.add(HALF, GRASS_D, 0.95, y, -0.15, 0.3, 0.7, 0.3, 0, 0, Math.PI / 2);
  b.box(0.06, 0.34, 0.68, CONC, 1.3, y, -0.15);
  b.box(0.012, 0.2, 0.22, t, 1.336, y, -0.15);
  const cabinY = watchtower(b, t, y);
  place(b, apc(t), 0.4, y, 0.9);
  return cabinY + 0.28;
}

// ---------- Factory ----------
const CLAD_W = 0xe8e8e4;
// The production hall, x0..x1 × z0..z1, and its height.
const HALL = { x0: -1.32, x1: 0.6, z0: -1.32, z1: 0.18, height: 0.84 };
// The hall: cladding and its panel joints, the plinth, the team band, coping and roof; on the roof, skylight ridges,
// solar panels, air-con and the stack. Returns the roof's height.
const productionHall = (b, t, y) => {
  const { x0, x1, z0, z1, height } = HALL, width = x1 - x0, depth = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, top = y + height;
  b.box(width, height, depth, CLAD_W, cx, y, cz);
  b.box(width + 0.01, 0.06, depth + 0.01, STEEL, cx, y, cz);
  for (let jointY = 0.22; jointY < height - 0.25; jointY += 0.18) {
    b.box(width + 0.008, 0.008, depth + 0.008, 0xc9ccca, cx, y + jointY, cz);
  }
  b.box(width + 0.014, 0.08, depth + 0.014, t, cx, top - 0.18, cz);
  b.box(width + 0.03, 0.05, depth + 0.03, STEEL_L, cx, top - 0.05, cz);
  b.box(width - 0.04, 0.006, depth - 0.04, ROOF, cx, top, cz);
  for (const z of [-1.05, -0.68, -0.31]) b.roof(0.18, 0.08, width - 0.5, PANE, cx + 0.1, top, z, Math.PI / 2);
  for (let i = 0; i < 6; i++) b.box(0.24, 0.02, 0.16, SOLAR, cx - 0.6 + i * 0.27, top + 0.03, 0.02, 0.3);
  airCon(b, x1 - 0.2, top, -1.1);
  airCon(b, x1 - 0.2, top, -0.7);
  b.cylT(0.07, 0.08, 0.75, WHITE, -1.12, top, -1.12, 10);
  b.cylT(0.085, 0.085, 0.06, t, -1.12, top + 0.55, -1.12, 10);
  b.cylT(0.075, 0.075, 0.03, STEEL, -1.12, top + 0.72, -1.12, 10);
  return top;
};
// The office: glazed walls, the roof slab, the logo, the door and its canopy.
const plantOffice = (b, t, y) => {
  const x0 = -1.32, x1 = -0.4, z0 = HALL.z1, z1 = 0.74, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, height = 0.56, top = y + height;
  b.box(x1 - x0, height, z1 - z0, WHITE, cx, y, cz);
  curtainWall(b, cx, z1, 0, x1 - x0 - 0.06, y + 0.04, height - 0.1, 2, 0.15, GLASS, WHITE);
  curtainWall(b, x1, cz, Math.PI / 2, z1 - z0 - 0.06, y + 0.04, height - 0.1, 2, 0.15, GLASS, WHITE);
  b.box(x1 - x0 + 0.08, 0.05, z1 - z0 + 0.08, WHITE, cx, top, cz);
  b.box(0.36, 0.16, 0.03, t, cx + 0.15, top + 0.05, z1);
  b.box(0.12, 0.08, 0.008, WHITE, cx + 0.15, top + 0.09, z1 + 0.018);
  b.box(0.18, 0.24, 0.01, GLASS_D, cx - 0.2, y + 0.02, z1 + 0.03);
  b.box(0.36, 0.025, 0.2, WHITE, cx - 0.2, y + 0.3, z1 + 0.1);
};
// The docks down the +x side and the truck at one of them; the tanks on their bund and the pipe rack to the hall.
const docksAndTanks = (b, t, y) => {
  const hallX = HALL.x1;
  for (const z of [-1.05, -0.72, -0.39]) {
    b.box(0.03, 0.4, 0.28, TYRE, hallX + 0.015, y + 0.06, z); // dock seal
    b.box(0.012, 0.32, 0.22, STEEL_D, hallX + 0.034, y + 0.08, z); // door
    b.box(0.1, 0.06, 0.3, CONC_D, hallX + 0.05, y, z); // leveller
  }
  b.box(0.76, 0.006, 1.0, ASPH, 1.01, y, -0.72);
  place(b, truck(t, WHITE, { stripe: t, len: 0.52 }), 1.02, y, -0.72);
  b.box(0.75, 0.04, 0.72, CONC_D, 0.99, y, 0.78);
  for (const [x, z] of [[0.82, 0.6], [1.16, 0.6], [0.99, 0.96]]) {
    b.cylT(0.14, 0.14, 0.62, STEEL_L, x, y + 0.04, z, 12);
    b.cylT(0.145, 0.145, 0.04, t, x, y + 0.5, z, 12);
    b.cylT(0.03, 0.14, 0.06, STEEL_L, x, y + 0.66, z, 12);
  }
  for (const pipeY of [0.5, 0.56]) {
    stick(b, 0.02, STEEL_L, [hallX, y + pipeY, 0.05], [0.99, y + pipeY, 0.05], CYL8);
    stick(b, 0.02, STEEL_L, [0.99, y + pipeY, 0.05], [0.99, y + pipeY, 0.85], CYL8);
  }
  for (const [x, z] of [[0.8, 0.05], [0.99, 0.05], [0.99, 0.32]]) b.box(0.03, 0.5, 0.03, STEEL_D, x, y, z);
};

// Factory: a clean modern plant. A white clad production hall with a team corporate band round its top, glazed
// skylight ridges, solar panels and air-con on its flat roof and a slim white stack, team-banded, that gives off no
// smoke. A glazed two-storey office at the front carries the team logo; three loading docks run down the +x side, one
// with a white team-striped truck backed onto it; stainless process tanks with team bands are piped to the hall over a
// steel rack; cars stand by the office, and a lawn with trees and the team monument sign fronts the plant.
export function factory(ctx) {
  const { b, s, t } = ctx, y = 0.03;
  b.box(s, y, s, CONC_L);
  const top = productionHall(b, t, y);
  plantOffice(b, t, y);
  docksAndTanks(b, t, y);
  // The cars, the lawn, its trees and the monument sign.
  for (const x of [-0.18, 0.15]) place(b, car(x < 0 ? 0xbfc4c8 : 0x2b2f33), x, y, 0.48, Math.PI / 2);
  b.box(1.9, 0.012, 0.52, LAWN, -0.44, y, 1.12);
  for (const [x, z] of [[-1.15, 1.1], [-0.75, 1.2], [0.3, 1.15]]) tree(b, x, y, z);
  b.box(0.42, 0.16, 0.06, WHITE, -0.2, y, 1.08);
  b.box(0.14, 0.1, 0.008, t, -0.2, y + 0.03, 1.114);
  return top + 0.75;
}

// ---------- Modern defences ----------
// The launcher pod's elevation, and its cosine and sine.
const POD_ELEVATION = 0.42, POD_COS = Math.cos(POD_ELEVATION), POD_SIN = Math.sin(POD_ELEVATION);
// The emplacement and the pedestal: the eight-sided concrete base with its team band and cap, the steel door in its
// yellow frame, the pedestal and turret ring.
const emplacement = (b, t, y, top) => {
  b.cylT(0.74, 0.8, 0.55, CONC, 0, y, 0, 8, 0, Math.PI / 8);
  b.cylT(0.78, 0.78, 0.08, t, 0, y + 0.28, 0, 8, 0, Math.PI / 8);
  b.cylT(0.76, 0.76, 0.05, CONC_L, 0, top, 0, 8, 0, Math.PI / 8);
  b.box(0.3, 0.38, 0.03, YELLOW, 0, y + 0.02, 0.735);
  b.box(0.24, 0.34, 0.03, STEEL_D, 0, y + 0.02, 0.745);
  b.cylT(0.26, 0.32, 0.62, STEEL_D, 0, top + 0.05, 0, 12);
  b.add(CYL8, STEEL, 0, top + 0.71, 0, 0.42, 0.08, 0.42);
};
// The trunnion plates and the launcher pod, its six tubes and their missile noses, the team mark on its side.
// `onPod(u, v, w)` is a point in the pod's frame (u across, v up, w along the tubes).
const launcherPod = (b, t, ringY, podY, podZ, onPod) => {
  const tilt = -POD_ELEVATION;
  for (const side of [-1, 1]) {
    b.box(0.06, 0.42, 0.34, STEEL_D, side * 0.37, ringY - 0.02, podZ);
    b.add(CYL8, STEEL, side * 0.41, podY, podZ, 0.06, 0.04, 0.06, 0, 0, Math.PI / 2);
  }
  b.add(unit.box, OLIVE, ...onPod(0, 0, 0), 0.66, 0.44, 0.86, tilt, 0, 0);
  b.add(unit.box, OLIVE_D, ...onPod(0, 0.235, 0), 0.62, 0.03, 0.8, tilt, 0, 0);
  for (const u of [-0.2, 0, 0.2]) for (const v of [-0.1, 0.1]) {
    b.add(DISC, DARK, ...onPod(u, v, 0.432), 0.08, 0.012, 0.08, Math.PI / 2 - POD_ELEVATION, 0, 0); // tube mouth
    b.add(CONE4, RED, ...onPod(u, v, 0.43), 0.045, 0.05, 0.045, Math.PI / 2 - POD_ELEVATION, 0, 0); // missile nose
  }
  b.add(unit.box, t, ...onPod(0.332, 0.02, 0), 0.012, 0.2, 0.5, tilt, 0, 0);
  b.add(unit.box, LINE, ...onPod(0.333, -0.13, 0), 0.012, 0.04, 0.6, tilt, 0, 0);
};
// The shot (extra.fire): the missile away on its flame out of the tube at (u, v), smoke in its wake, and the backblast
// out of the pod's rear.
const missileLaunch = onPod => {
  const fire = new B(), u = 0.2, v = 0.1;
  stick(fire, 0.05, WHITE, onPod(u, v, 0.78), onPod(u, v, 1.22), CYL8); // the missile
  stick(fire, 0.05, RED, onPod(u, v, 1.22), onPod(u, v, 1.36), CONE4); // its nose
  for (const side of [-1, 1]) {
    fire.add(unit.box, STEEL_D, ...onPod(u + side * 0.06, v, 0.82), 0.07, 0.01, 0.1, -POD_ELEVATION, 0, 0); // fins
  }
  stick(fire, 0.1, P.fire, onPod(u, v, 0.78), onPod(u, v, 0.32), CONE4); // the flame
  fire.add(BALL, HOT, ...onPod(u, v, 0.76), 0.07, 0.07, 0.07);
  fire.add(BALL, P.ember, ...onPod(u, v, 0.66), 0.075, 0.075, 0.075);
  fire.add(BALL, P.smoke, ...onPod(u, v - 0.06, 0.46), 0.11, 0.1, 0.11);
  fire.add(BALL, P.ember, ...onPod(u, v, -0.47), 0.1, 0.1, 0.1); // the backblast
  fire.add(BALL, P.smoke, ...onPod(u, v + 0.02, -0.66), 0.19, 0.16, 0.19);
  fire.add(BALL, 0xb4b4b4, ...onPod(u - 0.16, v - 0.08, -0.8), 0.15, 0.13, 0.15);
  return { geo: fire.geometry(), at: [0, 0, 0] };
};

// Tower: a missile turret. An eight-sided concrete emplacement with a team band and a steel door in a yellow frame
// carries a steel pedestal and turret ring; on it, between trunnion plates, an olive launcher pod of six tubes (their
// red missile noses showing) is elevated toward the field, team-marked on its side. A radar on a mast at the back
// sweeps round (a spinner), beside a whip antenna, a generator and the flag. Its shot is a missile leaving its tube on
// a tongue of flame, with the backblast behind the pod (extra.fire).
export function tower(ctx) {
  const { b, mast, t, extra } = ctx, y = 0.03;
  b.box(1.76, y, 1.76, ASPH);
  for (const [width, depth, x, z] of [[1.6, 0.03, 0, 0.82], [0.03, 1.6, 0.82, 0]]) b.box(width, 0.006, depth, YELLOW, x, y, z);
  const top = y + 0.55;
  emplacement(b, t, y, top);
  const ringY = top + 0.75, podX = 0, podY = ringY + 0.32, podZ = -0.02;
  const onPod = (u, v, w) => [podX + u, podY + v * POD_COS + w * POD_SIN, podZ - v * POD_SIN + w * POD_COS];
  launcherPod(b, t, ringY, podY, podZ, onPod);
  // The radar mast, the antenna, a generator and the flag.
  const radarX = -0.5, radarZ = -0.5;
  b.cylT(0.03, 0.045, 0.62, STEEL_D, radarX, top + 0.05, radarZ, 8);
  extra.spinners = [{ geo: radar(t), at: [radarX, top + 0.67, radarZ], axis: 'y', speed: 1.4 }];
  mast.cyl(0.008, 0.75, STEEL_L, 0.52, top + 0.05, -0.36);
  airCon(b, 0.38, top + 0.05, 0.38, 1.2);
  flag(ctx, 0.56, top + 0.05, -0.56, 0.8, STEEL_L);
  extra.fire = missileLaunch(onPod);
  return podY + 0.45;
}

// Wall: a concrete barrier. A blast-wall block on a broad footing, its upper part set back a little, so segments in a
// line read as separate precast units, painted with a yellow hazard band and a team band, a lighter cap and two steel
// lifting eyes on top; its footing and lower body fill the tile edge to edge, so segments in a line close up into one
// barrier.
export function wall(ctx) {
  const { b, t } = ctx, upperHalf = 0.47;
  b.box(1, 0.08, 1, CONC_D); // footing
  b.box(1, 0.3, 1, CONC, 0, 0.08, 0); // lower body
  b.box(2 * upperHalf, 0.5, 2 * upperHalf, CONC, 0, 0.38, 0); // upper body
  b.box(2 * upperHalf + 0.008, 0.07, 2 * upperHalf + 0.008, YELLOW, 0, 0.44, 0);
  b.box(2 * upperHalf + 0.008, 0.06, 2 * upperHalf + 0.008, t, 0, 0.7, 0);
  b.box(2 * upperHalf - 0.04, 0.05, 2 * upperHalf - 0.04, CONC_L, 0, 0.88, 0); // cap
  for (const x of [-0.22, 0.22]) {
    b.box(0.02, 0.06, 0.02, STEEL_D, x - 0.04, 0.93, 0);
    b.box(0.02, 0.06, 0.02, STEEL_D, x + 0.04, 0.93, 0);
    b.box(0.1, 0.02, 0.02, STEEL_D, x, 0.99, 0);
  }
  return 1.01;
}
