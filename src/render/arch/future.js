// AI Future: floating rings and plates, a chrome spire, neon edges, orbiting drones. White panels and dark glass under
// cyan and magenta neon, domes and crystal spires, parts that hover or turn: a twisting vertical-farm tower, a cube store
// on a glowing pedestal, hydroponic beds under grow lights, a drone bay with charging pods, a laser range with hologram
// targets, a hover-bike dock, a holo-kiosk plaza, a glowing data core, a floating crystal megastructure, an energy-dome
// fortress and a nanofab with floating arms; for defence, a laser turret under a turning ring and an energy barrier.
import * as THREE from 'three';
import { B, unit } from '../builder.js';
import { P, ring, stick, hash, place, flag, HOT, BALL, CYL6, CYL8, DISC } from './kit.js';

export function house(ctx) {
  const { b, extra, t } = ctx;
  // A pod on a chrome stem; the neon edge ring sits flush under the dark base disc.
  b.cylT(0.64, 0.64, 0.03, P.neonM, 0, 0.0, 0, 24).cyl(0.62, 0.06, P.dark).cylT(0.07, 0.15, 0.75, P.chrome, 0, 0.05, 0, 10);
  b.sph(0.5, P.snow, 0, 1.05, 0, 1.15, 0.72, 1.15).sph(0.505, P.dark, 0, 1.08, 0, 1.16, 0.22, 1.16).box(0.2, 0.05, 0.05, t, 0, 1.36, 0.42);
  extra.floaters = [
    { geo: ring(0.68, 0.035, P.neonC), at: [0, 1.05, 0], amp: 0.1, speed: 1.4 },
    { geo: new B().sph(0.08, P.chrome).add(unit.cyl, P.neonC, 0, -0.06, 0, 0.12, 0.015, 0.12).geometry(), at: [0.75, 1.6, 0.4], amp: 0.15, speed: 2.2, phase: 1 }, // a drone
  ];
  extra.spinners = [{ geo: ring(0.82, 0.02, P.neonM, 0.35), at: [0, 1.05, 0], axis: 'y', speed: 0.9 }];
  return 1.41;
}

export function town_center(ctx) {
  const { b, extra, t } = ctx;
  // Neon-edged plinth and dome, the chrome spire with its glowing tip (solid, so it stays in the body), three pylons.
  b.cylT(1.25, 1.35, 0.25, P.snow, 0, 0, 0, 24).cylT(1.36, 1.36, 0.04, P.neonC, 0, 0.12, 0, 24).sph(0.85, P.snow, 0, 0.25, 0, 1, 0.65, 1).sph(0.86, P.dark, 0, 0.42, 0, 1, 0.18, 1);
  b.cylT(0.1, 0.42, 2.7, P.chrome, 0, 0.25, 0, 8).sph(0.13, P.neonC, 0, 3.0, 0).box(0.26, 0.5, 0.03, t, 0, 1.4, 0.25);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; b.box(0.1, 0.9, 0.1, P.chrome, Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0).box(0.14, 0.04, 0.14, P.neonM, Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0); }
  // Two counter-rotating rings and three orbiting drones.
  const drones = new B();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; drones.sph(0.09, P.chrome, Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55).add(unit.cyl, P.neonC, Math.cos(a) * 1.55, -0.07, Math.sin(a) * 1.55, 0.14, 0.015, 0.14); }
  extra.spinners = [
    { geo: ring(1.15, 0.04, P.neonC, 0.3), at: [0, 1.8, 0], axis: 'y', speed: 0.8 },
    { geo: ring(1.45, 0.03, P.neonM, -0.25), at: [0, 1.3, 0], axis: 'y', speed: -0.6 },
    { geo: drones.geometry(), at: [0, 2.3, 0], axis: 'y', speed: 1.3 },
  ];
  // Two hovering landing plates.
  extra.floaters = [
    { geo: new B().box(0.55, 0.05, 0.55, P.snow).box(0.57, 0.02, 0.57, P.neonM, 0, -0.02, 0).geometry(), at: [-1.0, 1.6, 0.6], amp: 0.12, speed: 1.3 },
    { geo: new B().box(0.45, 0.05, 0.45, P.snow).box(0.47, 0.02, 0.47, P.neonC, 0, -0.02, 0).geometry(), at: [0.95, 2.0, -0.7], amp: 0.1, speed: 1.7, phase: 2 },
  ];
  // A small flag flies from the glowing tip; there is no pole.
  extra.flag = new B().box(0.02, 0.24, 0.4, t, 0, 0, 0.2).geometry(); extra.flagAt = [0, 3.1, 0];
  return 3.13;
}

// ---------- shared AI Future parts ----------
// The Town Center's and House's white, chrome, dark glass and neon, plus deeper glass, pale panels, deck paving and a
// dark apron, nutrient water and nanite fluid.
const SNOW = P.snow, CHROME = P.chrome, DARK = P.dark, NC = P.neonC, NM = P.neonM;
const GLASS = 0x1b2833, PANEL = 0xc9d3da, PAVE = 0xe2e7ea, GRID = 0x8f9ea8, APRON = 0x34414b, WATER = 0x1d6f8f, FLUID = 0x2a8fa8;
const LEAF = 0x46b856, LEAF_L = 0x8bdc62, GOLD = 0xf2c230, LOG = 0x7a5230, ROCK = 0x8f8c84;
// A hemisphere, flat side down at y = 0, and a crystal (a flat-shaded octahedron).
const DOME = new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), GEM = new THREE.OctahedronGeometry(1, 0);
// A half cylinder of radius 1 and length 1 along y, the half with x ≥ 0 (open on its flat side); turned π/2 about z it
// lies along x with its curve up, for vaults.
const VAULT = new THREE.CylinderGeometry(1, 1, 1, 16, 1, false, 0, Math.PI);

// A thin, cheap torus of radius r centred at (x, y, z); flat (rx = π/2) by default, or upright in the xy plane turned ry
// about y (rx = 0). arc < 2π draws an arch from +x up over the top.
const hoop = (b, r, tube, c, x = 0, y = 0, z = 0, rx = Math.PI / 2, ry = 0, n = 24, arc = Math.PI * 2) => {
  const g = new THREE.TorusGeometry(r, tube, 3, n, arc);
  b.add(g, c, x, y, z, 1, 1, 1, rx, ry, 0); g.dispose();
  return b;
};
// A white slab w × d and hh tall standing on y at (x, z), turned ry, with a neon strip round it just under its top.
const slab = (b, w, d, hh, x = 0, z = 0, y = 0, c = SNOW, edge = NC, ry = 0) =>
  b.box(w, hh, d, c, x, y, z, 0, ry).box(w + 0.025, 0.022, d + 0.025, edge, x, y + hh - 0.045, z, 0, ry);
// A point (u, v) in the frame turned ry about y round (x, z).
const turn = (x, z, ry) => (u, v) => [x + u * Math.cos(ry) + v * Math.sin(ry), z - u * Math.sin(ry) + v * Math.cos(ry)];
// A drone for a floater, centred on the origin and scaled k: a chrome pod on four rotors, a neon glow under it. Returns
// its B, so a cargo can hang from it.
const drone = (glow = NC, k = 1) => {
  const g = new B().add(BALL, CHROME, 0, 0, 0, 0.08 * k, 0.045 * k, 0.08 * k).add(CYL8, glow, 0, -0.04 * k, 0, 0.05 * k, 0.012 * k, 0.05 * k);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, x = Math.cos(a) * 0.12 * k, z = Math.sin(a) * 0.12 * k;
    g.box(0.12 * k, 0.012 * k, 0.018 * k, DARK, x / 2, -0.006 * k, z / 2, 0, -a).add(CYL8, GRID, x, 0.008 * k, z, 0.05 * k, 0.008 * k, 0.05 * k);
  }
  return g;
};
// A crate of greens w wide standing on y: a white tub, its team or neon band, leaves heaped on top.
const greens = (b, x, y, z, w, band) => b.box(w, w * 0.6, w, SNOW, x, y, z).box(w + 0.006, 0.02, w + 0.006, band, x, y + w * 0.3, z).add(GEM, LEAF, x, y + w * 0.62, z, w * 0.42, w * 0.18, w * 0.42);

// Granary: a vertical-farm tower with glowing tiers. Five storeys of dark glass, each smaller and turned a little
// further than the one below, so the tower twists as it climbs; every white floor slab is lined with crops along its
// edges, lit from beneath by the next slab's grow lights, cyan and magenta in turn. A white dome with a team band caps
// it under an antenna. The team loading doors open at its foot onto crates of greens; a neon ring circles the tower
// and a drone flies a crate in.
export function granary(ctx) {
  const { b, mast, extra, s, t } = ctx, cx = -0.16, cz = -0.16, yb = 0.16, th = 0.46, n = 5;
  b.box(s, 0.04, s, PAVE);
  slab(b, 1.34, 1.34, 0.12, cx, cz, 0.04);
  for (let i = 0; i < n; i++) {
    const ry = i * 0.2, W = 1.24 - i * 0.08, cw = 0.68 - i * 0.05, y = yb + i * th, top = y + th, at = turn(cx, cz, ry);
    b.box(cw, th - 0.05, cw, GLASS, cx, y, cz, 0, ry);
    for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const [x, z] = at(u * cw / 2, v * cw / 2); b.box(0.03, th - 0.05, 0.03, CHROME, x, y, z, 0, ry); }
    b.box(W, 0.05, W, SNOW, cx, top - 0.05, cz, 0, ry).box(W + 0.03, 0.022, W + 0.03, i % 2 ? NM : NC, cx, top - 0.075, cz, 0, ry);
    // The crops round the slab's edge: a hedge along each side, leafy tufts along it.
    const e = W / 2 - 0.08;
    for (const k of [-1, 1]) {
      let [x, z] = at(0, k * e); b.box(W - 0.2, 0.05, 0.07, LEAF, x, top, z, 0, ry);
      [x, z] = at(k * e, 0); b.box(0.07, 0.05, W - 0.2, LEAF, x, top, z, 0, ry);
      for (let m = 0; m < 4; m++) {
        const u = (m - 1.5) * (W - 0.3) / 3, c = (m + i) % 2 ? LEAF_L : LEAF;
        [x, z] = at(u, k * e); b.add(GEM, c, x, top + 0.07, z, 0.06, 0.07, 0.05, 0, ry + m);
        [x, z] = at(k * e, u); b.add(GEM, c, x, top + 0.07, z, 0.05, 0.07, 0.06, 0, ry - m);
      }
    }
  }
  // The dome, its team band and neon ring, and the antenna.
  const yt = yb + n * th;
  b.cylT(0.37, 0.37, 0.06, t, cx, yt, cz, 12).add(DOME, SNOW, cx, yt + 0.06, cz, 0.36, 0.3, 0.36);
  hoop(b, 0.37, 0.018, NC, cx, yt + 0.08, cz);
  mast.cyl(0.014, 0.42, CHROME, cx, yt + 0.32, cz).add(BALL, NM, cx, yt + 0.76, cz, 0.035, 0.035, 0.035);
  // The team loading doors at the foot, under neon lintels, and crates of greens waiting by them.
  const c0 = 0.68 / 2;
  b.box(0.28, 0.3, 0.02, t, cx, yb, cz + c0 + 0.01).box(0.32, 0.025, 0.03, NC, cx, yb + 0.31, cz + c0 + 0.01);
  b.box(0.02, 0.3, 0.28, t, cx + c0 + 0.01, yb, cz).box(0.03, 0.025, 0.32, NC, cx + c0 + 0.01, yb + 0.31, cz);
  greens(b, 0.62, 0.04, 0.3, 0.16, t); greens(b, 0.66, 0.04, 0.56, 0.15, NC); greens(b, 0.4, 0.04, 0.66, 0.15, t); greens(b, 0.64, 0.14, 0.42, 0.13, NM);
  // A neon ring circles the tower; a drone flies a crate of greens in.
  extra.spinners = [{ geo: hoop(new B(), 0.95, 0.022, NC, 0, 0, 0, Math.PI / 2 + 0.22, 0, 40).geometry(), at: [cx, 1.4, cz], axis: 'y', speed: 0.7 }];
  const d = drone(NM); d.box(0.008, 0.1, 0.008, GRID, 0, -0.14, 0); greens(d, 0, -0.27, 0, 0.13, t);
  extra.floaters = [{ geo: d.geometry(), at: [0.55, 1.9, 0.52], amp: 0.12, speed: 1.5 }];
  return yt + 0.36;
}

// Storage Pit: an automated cube store. A cube of bins in a chrome frame hovers over a pedestal glowing magenta, its
// white bin faces in a grid of dark seams, a few in team colour, robots on the rail grid over its top. Logs, gold and
// stone ride a conveyor in under a team intake hood at the right; at the front a lift shaft of neon frames carries a
// bin up and down, and a drone flies another away.
export function storage_pit(ctx) {
  const { b, extra, s, t, td } = ctx, cx = -0.2, cz = -0.22, S = 0.96, y0 = 0.24, n = 3, c = S / n;
  b.box(s, 0.04, s, PAVE);
  slab(b, 1.22, 1.22, 0.07, cx, cz, 0.04);
  b.box(0.8, y0 - 0.11, 0.8, DARK, cx, 0.11, cz).box(0.84, 0.025, 0.84, NM, cx, y0 - 0.07, cz);
  b.box(S, S, S, DARK, cx, y0, cz);
  // The bins: panels on the two faces the camera sees and on top, the dark core showing as seams between them.
  const bin = (i, j) => (i * 2 + j * 5) % 7 === 3 ? t : (i + j) % 3 === 1 ? PANEL : SNOW;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const u = (i - 1) * c, yy = y0 + j * c + 0.015;
    b.box(c - 0.035, c - 0.03, 0.02, bin(i, j), cx + u, yy, cz + S / 2 + 0.005).box(0.02, c - 0.03, c - 0.035, bin(j, i + 1), cx + S / 2 + 0.005, yy, cz - u);
    b.box(c - 0.035, 0.02, c - 0.035, (i + j) % 2 ? PANEL : SNOW, cx + u, y0 + S, cz + (j - 1) * c);
    if ((i + j) % 2 === 0) b.box(0.05, 0.02, 0.01, NC, cx + u, yy + c - 0.08, cz + S / 2 + 0.018).box(0.01, 0.02, 0.05, NC, cx + S / 2 + 0.018, yy + c - 0.08, cz - u);
  }
  // The chrome frame: corner posts, the rail grid over the top, two robots on it (one in team colour).
  for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.045, S + 0.1, 0.045, CHROME, cx + u * S / 2, y0 - 0.02, cz + v * S / 2);
  for (let k = 0; k <= n; k++) b.box(S + 0.05, 0.025, 0.025, CHROME, cx, y0 + S + 0.02, cz - S / 2 + k * c).box(0.025, 0.025, S + 0.05, CHROME, cx - S / 2 + k * c, y0 + S + 0.02, cz);
  b.box(0.2, 0.1, 0.2, t, cx - c / 2, y0 + S + 0.045, cz - c / 2).box(0.12, 0.02, 0.12, NC, cx - c / 2, y0 + S + 0.145, cz - c / 2);
  b.box(0.2, 0.1, 0.2, SNOW, cx + c, y0 + S + 0.045, cz + c / 2).box(0.12, 0.02, 0.12, NM, cx + c, y0 + S + 0.145, cz + c / 2);
  // The conveyor in from the right under the team intake hood, carrying logs, gold and stone.
  const vz = cz + 0.18, vx0 = cx + S / 2, vx1 = 0.86;
  b.box(vx1 - vx0, 0.05, 0.24, DARK, (vx0 + vx1) / 2, 0.04, vz).box(vx1 - vx0, 0.03, 0.02, CHROME, (vx0 + vx1) / 2, 0.09, vz - 0.13).box(vx1 - vx0, 0.03, 0.02, CHROME, (vx0 + vx1) / 2, 0.09, vz + 0.13);
  b.box(0.18, 0.2, 0.3, td, vx0 + 0.09, 0.04, vz).box(0.012, 0.12, 0.22, DARK, vx0 + 0.185, 0.06, vz).box(0.2, 0.022, 0.32, NC, vx0 + 0.09, 0.24, vz);
  for (const k of [-1, 1]) b.add(CYL6, LOG, 0.52, 0.13, vz + k * 0.05, 0.035, 0.18, 0.035, Math.PI / 2, 0, 0);
  b.add(CYL6, LOG, 0.52, 0.19, vz, 0.035, 0.18, 0.035, Math.PI / 2, 0, 0);
  for (let i = 0; i < 4; i++) b.add(GEM, GOLD, 0.68 + (i % 2) * 0.05, 0.14 + (i > 1) * 0.04, vz - 0.04 + (i % 3) * 0.04, 0.035, 0.035, 0.035, 0, i);
  b.rock(0.05, ROCK, 0.8, 0.09, vz - 0.03, 1.1, 0.9, 1, 1).rock(0.045, 0x9a9a92, 0.81, 0.09, vz + 0.06, 1, 0.8, 1.1, 2);
  // The lift shaft at the front: four chrome posts and three neon frames round the bin it carries.
  const lx = -0.42, lz = 0.6, lw = 0.15, lh = 1.3;
  for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) b.box(0.025, lh, 0.025, CHROME, lx + u * lw, 0.04, lz + v * lw);
  for (const y of [0.45, 0.88, lh]) for (const k of [-1, 1]) b.box(lw * 2 + 0.03, 0.022, 0.022, NC, lx, y, lz + k * lw).box(0.022, 0.022, lw * 2 + 0.03, NC, lx + k * lw, y, lz);
  b.box(lw * 2 + 0.06, 0.04, lw * 2 + 0.06, SNOW, lx, 0.04, lz).box(lw * 2 + 0.06, 0.04, lw * 2 + 0.06, SNOW, lx, lh + 0.02, lz);
  const lifted = new B().box(0.2, 0.18, 0.2, SNOW, 0, -0.09, 0).box(0.206, 0.04, 0.206, t, 0, -0.02, 0);
  const d = drone(NC); d.box(0.008, 0.08, 0.008, GRID, 0, -0.12, 0).box(0.16, 0.14, 0.16, SNOW, 0, -0.3, 0).box(0.166, 0.03, 0.166, td, 0, -0.22, 0);
  extra.floaters = [
    { geo: lifted.geometry(), at: [lx, 0.85, lz], amp: 0.32, speed: 0.9 },
    { geo: d.geometry(), at: [0.5, 1.6, 0.42], amp: 0.12, speed: 1.6, phase: 1 },
  ];
  return y0 + S + 0.16;
}

// Farm: glowing hydroponic beds. Four long white troughs edged in cyan neon run front to back over a white deck, their
// channels of nutrient water planted with rows of greens (extra.crops, which animate() shows once the farm is finished
// and shrinks as the food runs out), their team end caps to the front. Two chrome gantries span the beds carrying
// magenta grow-light bars; nutrient tanks piped into the beds and a team control pillar stand at the back, and a drone
// tends the crops, scanning them with a ring of light.
export function farm(ctx) {
  const { b, extra, s, t, td } = ctx, xs = [-0.6, -0.2, 0.2, 0.6], L = 1.36, z0 = 0.1, tw = 0.26, th = 0.1, y = 0.03;
  b.box(s, y, s, PAVE);
  for (const x of xs) {
    b.box(tw, th, L, SNOW, x, y, z0).box(tw - 0.06, 0.012, L - 0.06, WATER, x, y + th - 0.004, z0);
    b.box(0.012, 0.022, L, NC, x + tw / 2 + 0.004, y + th - 0.045, z0).box(tw + 0.012, th + 0.012, 0.03, t, x, y, z0 + L / 2 + 0.01);
  }
  // The gantries: chrome portals over the beds, a magenta grow light over each one.
  for (const gz of [z0 - 0.36, z0 + 0.32]) {
    for (const k of [-1, 1]) b.box(0.04, 0.62, 0.04, CHROME, k * 0.84, y, gz);
    b.box(1.72, 0.04, 0.05, CHROME, 0, y + 0.6, gz);
    for (const x of xs) b.box(0.2, 0.02, 0.07, NM, x, y + 0.575, gz);
  }
  // At the back: two nutrient tanks piped into the beds, the team control pillar and its screen.
  const bz = z0 - L / 2 - 0.16;
  for (const x of [-0.66, -0.36]) b.cylT(0.11, 0.11, 0.42, SNOW, x, y, bz, 10).cylT(0.115, 0.115, 0.03, NC, x, y + 0.3, bz, 10).add(DOME, SNOW, x, y + 0.42, bz, 0.11, 0.06, 0.11);
  b.box(1.3, 0.03, 0.03, CHROME, -0.05, y + 0.06, bz + 0.1);
  for (const x of xs) b.box(0.03, 0.03, 0.06, CHROME, x, y + 0.06, bz + 0.13);
  b.box(0.18, 0.5, 0.12, SNOW, 0.62, y, bz).box(0.19, 0.08, 0.13, td, 0.62, y + 0.42, bz).box(0.14, 0.16, 0.012, DARK, 0.62, y + 0.2, bz + 0.065).box(0.1, 0.02, 0.014, NC, 0.62, y + 0.28, bz + 0.067);
  // The greens: lettuce rosettes in two beds and leafy herb stalks in the others, along each channel.
  const cr = new B();
  for (const [i, x] of xs.entries()) for (let j = 0; j < 6; j++) {
    const z = z0 - L / 2 + 0.14 + j * (L - 0.28) / 5, k = 0.85 + hash(i, j) * 0.3, yb = y + th - 0.02;
    if (i % 2 === 0) {
      cr.add(BALL, LEAF, x, yb + 0.04 * k, z, 0.075 * k, 0.05 * k, 0.075 * k);
      for (let m = 0; m < 4; m++) { const a = m * Math.PI / 2 + hash(j, i) * 1.5; cr.add(GEM, LEAF_L, x + Math.cos(a) * 0.06 * k, yb + 0.05 * k, z + Math.sin(a) * 0.06 * k, 0.035 * k, 0.025 * k, 0.07 * k, 0, Math.PI / 2 - a); }
    } else {
      for (let m = 0; m < 3; m++) { const a = m * 2.1 + hash(i, j) * 2; cr.add(GEM, m ? LEAF : LEAF_L, x + Math.cos(a) * 0.04, yb + 0.09 * k, z + Math.sin(a) * 0.04, 0.04 * k, 0.1 * k, 0.04 * k, 0, a); }
    }
  }
  extra.crops = cr.geometry();
  // The tending drone and its scanning ring.
  const d = drone(NC); hoop(d, 0.16, 0.01, NC, 0, -0.12, 0, Math.PI / 2, 0, 16);
  extra.floaters = [{ geo: d.geometry(), at: [0.2, 0.95, 0.12], amp: 0.1, speed: 1.4 }];
  return 0.66;
}

// A mech walker standing on y at (x, z), facing +z: grey legs, a team torso, a cyan visor and an arm cannon.
const mech = (b, t, x, y, z) => {
  for (const k of [-1, 1]) b.box(0.06, 0.22, 0.07, GRID, x + k * 0.07, y + 0.03, z).box(0.09, 0.03, 0.12, DARK, x + k * 0.07, y, z + 0.01).box(0.05, 0.16, 0.06, GRID, x + k * 0.145, y + 0.22, z);
  b.box(0.2, 0.06, 0.12, CHROME, x, y + 0.24, z).box(0.22, 0.16, 0.16, t, x, y + 0.3, z).box(0.12, 0.03, 0.02, NC, x, y + 0.4, z + 0.08);
  b.box(0.04, 0.04, 0.18, DARK, x + 0.17, y + 0.3, z + 0.06);
};

// Barracks: a drone bay with charging pods. A white hangar vault ribbed in chrome lies across the back, a team band
// round it and an antenna on its crest, its dark glass bay door under a neon lintel and a team chevron. On the dark
// apron in front five charging pods stand in a row, white capsules with dark glass fronts, a visor glowing in each and
// a team band round them, cyan charge rings rising and falling along them; two mech walkers stand ready on the launch
// pad, and a patrol drone hovers over the hangar.
export function barracks(ctx) {
  const { b, mast, extra, s, t } = ctx, y = 0.04, hz = -0.74, Rz = 0.62, Ry = 0.95, L = 2.5;
  b.box(s, y, s, PAVE);
  slab(b, s - 0.12, 1.5, 0.03, 0, 0.55, y, APRON, NC);
  for (const x of [-1.15, 1.15]) b.box(0.04, 0.006, 1.3, SNOW, x, y + 0.03, 0.55);
  // The hangar vault, its chrome ribs, the team band and the bay.
  b.add(VAULT, SNOW, 0, y, hz, Ry, L, Rz, 0, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) b.add(VAULT, CHROME, -L / 2 + 0.05 + i * (L - 0.1) / 5, y, hz, Ry + 0.02, 0.05, Rz + 0.02, 0, 0, Math.PI / 2);
  b.add(VAULT, t, 0.98, y, hz, Ry + 0.022, 0.14, Rz + 0.022, 0, 0, Math.PI / 2);
  const bz = hz + Rz + 0.06;
  b.box(1.3, 0.62, 0.44, SNOW, 0, y, bz - 0.22).box(1.1, 0.48, 0.02, GLASS, 0, y + 0.02, bz + 0.005).box(1.14, 0.03, 0.03, NC, 0, y + 0.52, bz + 0.01);
  for (let i = 1; i < 4; i++) b.box(0.012, 0.48, 0.022, CHROME, -0.55 + i * 0.275, y + 0.02, bz + 0.008);
  for (const k of [-1, 1]) b.box(0.2, 0.05, 0.02, t, k * 0.08, y + 0.555, bz + 0.012, 0, 0, k * 0.45);
  mast.cyl(0.014, 0.5, CHROME, -0.75, y + Ry, hz).add(BALL, NM, -0.75, y + Ry + 0.52, hz, 0.03, 0.03, 0.03);
  // The charging pods and their power line.
  b.box(2.3, 0.03, 0.04, DARK, 0, y + 0.03, -0.1);
  for (let i = 0; i < 5; i++) {
    const x = -1.0 + i * 0.5, z = 0.2;
    b.add(CYL8, NC, x, y + 0.04, z, 0.2, 0.02, 0.2).add(CYL8, DARK, x, y + 0.07, z, 0.18, 0.04, 0.18).box(0.03, 0.03, 0.22, DARK, x, y + 0.03, z - 0.2);
    b.cylT(0.135, 0.15, 0.5, SNOW, x, y + 0.09, z, 10).add(BALL, SNOW, x, y + 0.59, z, 0.135, 0.1, 0.135).cylT(0.152, 0.152, 0.05, t, x, y + 0.14, z, 10);
    b.box(0.15, 0.32, 0.03, GLASS, x, y + 0.2, z + 0.13).box(0.09, 0.025, 0.02, i % 2 ? NM : NC, x, y + 0.44, z + 0.147);
  }
  // The launch pad: a neon ring round a team chevron, two mechs on it.
  hoop(b, 0.42, 0.016, NC, 0, y + 0.035, 0.88, Math.PI / 2, 0, 32);
  for (const k of [-1, 1]) b.box(0.26, 0.008, 0.06, t, k * 0.09, y + 0.03, 1.02, 0, k * 0.6);
  mech(b, t, -0.17, y + 0.03, 0.8); mech(b, t, 0.2, y + 0.03, 0.9);
  // The charge rings ride up and down the pods; the patrol drone.
  extra.floaters = [
    ...[0, 1, 2, 3, 4].map(i => ({ geo: hoop(new B(), 0.19, 0.012, i % 2 ? NM : NC, 0, 0, 0, Math.PI / 2, 0, 16).geometry(), at: [-1.0 + i * 0.5, y + 0.36, 0.2], amp: 0.16, speed: 1.3, phase: i * 1.2 })),
    { geo: drone(NC, 1.3).geometry(), at: [0.55, 1.45, -0.5], amp: 0.12, speed: 1.5, phase: 2 },
  ];
  return y + Ry + 0.02;
}

// A hologram target for a floater, facing +z: cyan and magenta rings round a white bull, on the beam of its projector.
const holoTarget = () => {
  const g = new B();
  hoop(g, 0.2, 0.014, NC, 0, 0, 0, 0, 0, 20); hoop(g, 0.12, 0.012, NM, 0, 0, 0, 0, 0, 16);
  return g.add(DISC, SNOW, 0, 0, 0, 0.05, 0.012, 0.05, Math.PI / 2, 0, 0).add(CYL8, NC, 0, -0.33, 0, 0.01, 0.26, 0.01);
};

// Archery Range: a laser range with hologram targets. Three lanes run back over a dark floor between cyan neon lines,
// past distance marks, from a white firing deck at the front, where laser emitters stand on a counter faced with team
// panels, two of them firing magenta beams down the lanes. At the far end, hologram targets hover over their chrome
// projectors before a white backstop with a dark glass band and a score screen; light pylons stand at the deck's ends.
export function archery_range(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04, lanes = [-0.8, 0, 0.8], zt = -0.95, zc = 0.92, ty = y + 0.6, ey = y + 0.48;
  b.box(s, y, s, PAVE);
  b.box(2.5, 0.02, 2.0, APRON, 0, y, -0.28);
  for (const x of [-1.2, -0.4, 0.4, 1.2]) b.box(0.025, 0.012, 2.0, NC, x, y + 0.02, -0.28);
  for (const z of [-0.55, 0, 0.45]) for (const x of lanes) b.box(0.3, 0.008, 0.02, GRID, x, y + 0.02, z);
  // The backstop, its wings, the score screen.
  b.box(2.3, 0.7, 0.12, SNOW, 0, y, -1.27).box(2.32, 0.12, 0.13, GLASS, 0, y + 0.42, -1.27).box(2.32, 0.025, 0.14, NC, 0, y + 0.66, -1.27);
  for (const k of [-1, 1]) b.box(0.12, 0.6, 0.5, SNOW, k * 1.24, y, -1.06).box(0.13, 0.025, 0.51, NC, k * 1.24, y + 0.56, -1.06);
  b.box(0.6, 0.24, 0.02, DARK, 0, y + 0.12, -1.2);
  for (let i = 0; i < 5; i++) b.box(0.06, 0.05 + i * 0.03, 0.01, i % 2 ? NM : NC, -0.2 + i * 0.1, y + 0.15, -1.19);
  // The target projectors, each with a team marker.
  for (const x of lanes) b.add(CYL8, CHROME, x, y + 0.05, zt, 0.14, 0.06, 0.14).add(CYL8, NC, x, y + 0.085, zt, 0.1, 0.012, 0.1).box(0.1, 0.03, 0.03, t, x, y + 0.02, zt + 0.17);
  // The firing deck: the counter and its team panels, the emitters, two beams, the light pylons.
  slab(b, 2.5, 0.5, 0.1, 0, 1.05, y);
  b.box(2.3, 0.28, 0.16, SNOW, 0, y + 0.1, zc);
  for (const x of lanes) {
    b.box(0.5, 0.2, 0.02, td, x, y + 0.14, zc + 0.085).box(0.5, 0.02, 0.025, NC, x, y + 0.36, zc + 0.085);
    b.box(0.04, 0.06, 0.04, CHROME, x, y + 0.38, zc).add(BALL, CHROME, x, ey, zc, 0.07, 0.07, 0.07);
    b.add(CYL8, DARK, x, ey, zc - 0.15, 0.025, 0.22, 0.025, Math.PI / 2, 0, 0).add(CYL8, NM, x, ey, zc - 0.265, 0.032, 0.014, 0.032, Math.PI / 2, 0, 0);
  }
  for (const x of [lanes[0], lanes[2]]) stick(b, 0.009, NM, [x, ey, zc - 0.27], [x, ty, zt], CYL6);
  for (const k of [-1, 1]) b.box(0.08, 0.8, 0.08, SNOW, k * 1.2, y + 0.1, 1.2).box(0.1, 0.06, 0.1, k < 0 ? NC : NM, k * 1.2, y + 0.9, 1.2).box(0.085, 0.12, 0.085, t, k * 1.2, y + 0.6, 1.2);
  // The hologram targets hover over their projectors.
  extra.floaters = lanes.map((x, i) => ({ geo: holoTarget().geometry(), at: [x, ty, zt], amp: 0.06, speed: 1.6, phase: i * 2 }));
  return 1.0;
}

// A hover-bike for a floater, nose to +z: a white fuselage with a team fairing, a dark windscreen and seat, chrome
// thrusters glowing cyan behind and an underglow.
const bike = t => {
  const g = new B().add(GEM, SNOW, 0, 0.1, 0, 0.11, 0.07, 0.34).add(GEM, t, 0, 0.13, 0.12, 0.075, 0.05, 0.2);
  g.box(0.11, 0.06, 0.02, DARK, 0, 0.16, 0.07, -0.6).box(0.08, 0.03, 0.16, DARK, 0, 0.14, -0.1).box(0.24, 0.015, 0.02, CHROME, 0, 0.19, 0.1);
  for (const k of [-1, 1]) g.add(CYL8, CHROME, k * 0.11, 0.07, -0.06, 0.045, 0.3, 0.045, Math.PI / 2, 0, 0).add(CYL8, NC, k * 0.11, 0.07, -0.215, 0.036, 0.012, 0.036, Math.PI / 2, 0, 0);
  return g.add(CYL8, NC, 0, 0.0, 0, 0.1, 0.01, 0.24);
};

// Stable: a hover-bike dock. A white wing cantilevered from the back wall on chrome braces, neon fins along it, shades
// the charge panels; before it three docking cradles, each a dark pad ringed in neon with a team marker, its bike
// hovering over it nose out on a docking arm. Cyan guide lines lead out over the apron, where a fourth bike hovers
// turning away, and a charging pylon stands at the corner.
export function stable(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04, bays = [-0.82, 0, 0.82], zb = -0.2, K = 1.4;
  b.box(s, y, s, PAVE);
  b.box(s - 0.12, 0.015, 1.0, APRON, 0, y, 0.8);
  for (const x of bays) b.box(0.04, 0.008, 0.95, NC, x, y + 0.015, 0.8);
  // The back wall and its charge panels, a team plate over each.
  b.box(2.6, 0.95, 0.16, SNOW, 0, y, -1.22).box(2.62, 0.025, 0.17, NC, 0, y + 0.88, -1.22);
  for (const x of bays) b.box(0.48, 0.42, 0.02, GLASS, x, y + 0.2, -1.13).box(0.4, 0.025, 0.022, NC, x, y + 0.3, -1.13).box(0.2, 0.08, 0.025, t, x, y + 0.68, -1.13);
  // The wing: white over dark glass, sloping down to the front, its neon lip and fins, the braces under it.
  b.box(2.7, 0.06, 0.95, SNOW, 0, 1.02, -0.8, 0.14).box(2.6, 0.02, 0.88, GLASS, 0, 0.995, -0.8, 0.14).box(2.72, 0.025, 0.04, NC, 0, 0.96, -0.33);
  for (const x of [-1.0, -0.41, 0.41, 1.0]) b.box(0.03, 0.05, 0.9, NC, x, 1.06, -0.8, 0.14);
  for (const x of [-1.25, 1.25]) stick(b, 0.025, CHROME, [x, y + 0.45, -1.14], [x, 1.0, -0.42], CYL6);
  // The cradles: dark pads in neon rings, team markers, docking arms out from the panels.
  for (const x of bays) {
    b.add(CYL8, NC, x, y + 0.01, zb, 0.32, 0.02, 0.55).add(CYL8, DARK, x, y + 0.03, zb, 0.3, 0.04, 0.53).box(0.14, 0.01, 0.05, t, x, y + 0.05, zb + 0.42);
    b.box(0.04, 0.04, 0.5, CHROME, x, y + 0.32, -0.9).box(0.1, 0.06, 0.06, DARK, x, y + 0.3, -0.64);
  }
  // The charging pylon.
  b.box(0.14, 0.7, 0.14, SNOW, -1.12, y, 1.05).box(0.15, 0.1, 0.15, td, -1.12, y + 0.5, 1.05).box(0.16, 0.03, 0.16, NC, -1.12, y + 0.7, 1.05).box(0.02, 0.2, 0.08, DARK, -1.04, y + 0.2, 1.05);
  // The bikes hover over their cradles; the fourth turns away over the apron.
  const bikeAt = (ry, k) => { const g = new B(); place(g, bike(t), 0, 0, 0, ry, k); return g.geometry(); };
  extra.floaters = [
    ...bays.map((x, i) => ({ geo: bikeAt(0, K), at: [x, y + 0.2, zb], amp: 0.05, speed: 2, phase: i * 1.7 })),
    { geo: bikeAt(0.9, 1.25), at: [0.85, y + 0.3, 0.8], amp: 0.07, speed: 1.6, phase: 0.5 },
  ];
  return 1.18;
}

// A kiosk's hologram for a spinner, above its canopy: the good it trades (food, wood, gold or stone) over a cyan ring.
const ware = kind => {
  const g = new B();
  hoop(g, 0.13, 0.008, NC, 0, -0.1, 0, Math.PI / 2, 0, 16);
  if (kind === 'food') g.add(BALL, 0xd8402e, 0, 0, 0, 0.08, 0.08, 0.08).add(GEM, LEAF, 0.03, 0.09, 0, 0.025, 0.05, 0.015, 0, 0, -0.5);
  if (kind === 'wood') for (const [yy, zz] of [[-0.03, -0.04], [-0.03, 0.04], [0.035, 0]]) g.add(CYL6, LOG, 0, yy, zz, 0.035, 0.22, 0.035, 0, 0, Math.PI / 2);
  if (kind === 'gold') g.add(GEM, GOLD, 0, 0, 0, 0.07, 0.1, 0.07).add(GEM, GOLD, 0.08, -0.04, 0.02, 0.04, 0.06, 0.04);
  if (kind === 'stone') g.rock(0.07, ROCK, 0, -0.06, 0, 1.2, 0.9, 1, 1).rock(0.05, 0x9a9a92, 0.07, -0.04, 0.03, 1, 0.8, 1, 2);
  return g;
};

// Market: a holo-kiosk plaza. A round plaza inlaid with cyan and magenta rings; at its heart a chrome projector casts
// a great golden credit coin, turning in a magenta ticker ring. Round it, three white kiosks under team canopies, price
// panels glowing on their counters, each with a hologram of its wares turning over it (food, wood and gold, stone at the
// projector's foot), and a white arch with team pillars opens the plaza at the front.
export function market(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.04;
  b.box(s, y, s, PAVE);
  b.add(DISC, PANEL, 0, y + 0.005, 0, 1.3, 0.01, 1.3);
  hoop(b, 1.3, 0.016, NC, 0, y + 0.012, 0, Math.PI / 2, 0, 40); hoop(b, 0.72, 0.016, NM, 0, y + 0.012, 0, Math.PI / 2, 0, 32);
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; b.box(0.58, 0.01, 0.02, NC, Math.cos(a) * 1.01, y + 0.008, Math.sin(a) * 1.01, 0, -a); }
  // The projector and its light column.
  b.cylT(0.3, 0.36, 0.12, CHROME, 0, y, 0, 12).cylT(0.28, 0.28, 0.02, NC, 0, y + 0.12, 0, 12).cylT(0.12, 0.16, 0.08, DARK, 0, y + 0.14, 0, 8).add(CYL8, NC, 0, y + 0.45, 0, 0.025, 0.5, 0.025);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; b.box(0.08, 0.1, 0.03, t, Math.cos(a) * 0.33, y, Math.sin(a) * 0.33, 0, -a + Math.PI / 2); }
  // The kiosks: hexagonal counters with price panels, chrome poles, team canopies edged in magenta.
  const kiosks = [[-0.92, -0.92, 'food'], [0.98, -0.5, 'wood'], [-0.5, 0.98, 'gold']];
  for (const [x, z] of kiosks) {
    b.add(CYL6, SNOW, x, y + 0.17, z, 0.26, 0.34, 0.26).add(CYL6, GLASS, x, y + 0.3, z, 0.27, 0.06, 0.27).add(CYL6, NC, x, y + 0.34, z, 0.275, 0.012, 0.275);
    b.cylT(0.025, 0.025, 0.4, CHROME, x, y + 0.34, z, 6).add(CYL6, t, x, y + 0.76, z, 0.34, 0.04, 0.34).add(CYL6, NM, x, y + 0.735, z, 0.35, 0.014, 0.35);
    const a = Math.atan2(-z, -x);
    for (const k of [-0.5, 0.5]) { const pa = a + k, px = x + Math.cos(pa) * 0.27, pz = z + Math.sin(pa) * 0.27; b.box(0.12, 0.09, 0.012, k < 0 ? NC : NM, px, y + 0.4, pz, 0, Math.PI / 2 - pa); }
  }
  // Trade crates by the kiosks.
  for (const [x, z, w, c] of [[-0.55, -1.1, 0.16, t], [-0.36, -1.12, 0.13, SNOW], [1.15, -0.05, 0.15, td], [-1.12, 0.6, 0.14, SNOW]]) b.box(w, w * 0.8, w, SNOW, x, y, z).box(w + 0.006, 0.025, w + 0.006, c === SNOW ? NC : c, x, y + w * 0.4, z);
  // The arch at the front corner, between team pillars.
  const ax = 0.95, az = 0.95, ar = -Math.PI / 4;
  hoop(b, 0.42, 0.04, SNOW, ax, y + 0.5, az, 0, ar, 12, Math.PI); hoop(b, 0.42, 0.012, NC, ax + 0.03, y + 0.5, az + 0.03, 0, ar, 12, Math.PI);
  for (const k of [-1, 1]) { const px = ax + k * 0.42 * Math.cos(ar), pz = az - k * 0.42 * Math.sin(ar); b.box(0.09, 0.5, 0.09, td, px, y, pz, 0, ar).box(0.1, 0.03, 0.1, NC, px, y + 0.5, pz, 0, ar); }
  // The coin and its ticker ring over the projector, the kiosks' wares, the stone at the projector's foot.
  const coin = new B().add(DISC, GOLD, 0, 0, 0, 0.3, 0.05, 0.3, Math.PI / 2, 0, 0).box(0.07, 0.2, 0.07, 0xb8901c, 0, -0.1, 0);
  hoop(coin, 0.31, 0.02, NC, 0, 0, 0, 0, 0, 24);
  extra.spinners = [
    { geo: coin.geometry(), at: [0, y + 1.05, 0], axis: 'y', speed: 1.2 },
    { geo: hoop(new B(), 0.52, 0.018, NM, 0, 0, 0, Math.PI / 2 + 0.3, 0, 36).geometry(), at: [0, y + 1.05, 0], axis: 'y', speed: -0.6 },
    ...kiosks.map(([x, z, kind], i) => ({ geo: ware(kind).geometry(), at: [x, y + 1.0, z], axis: 'y', speed: 0.9 + i * 0.15 })),
    { geo: ware('stone').geometry(), at: [0.42, y + 0.32, 0.42], axis: 'y', speed: 0.8 },
  ];
  return 1.0;
}

// Government Center: a glowing data core. On a round white plinth stepped in three neon-edged tiers stands the core, a
// fat column of dark glass banded in cyan light and streaked with data, in a cage of four white ribs that bow out from
// the plinth and close on a chrome crown; team banners hang on the ribs and a team carpet leads in. Over the crown the
// core's heart, a magenta orb, floats in a cradle of chrome prongs; two data rings turn round the column and a ring of
// data packets orbits it. Server monoliths stand at the corners, the front one low.
export function government_center(ctx) {
  const { b, extra, t, td } = ctx;
  let y = 0;
  for (const [r, c] of [[1.32, NC], [1.1, NM], [0.88, NC]]) { b.cylT(r, r + 0.03, 0.12, SNOW, 0, y, 0, 24).cylT(r + 0.035, r + 0.035, 0.022, c, 0, y + 0.07, 0, 24); y += 0.12; }
  b.box(0.26, 0.012, 0.42, td, 0, y, 0.67);
  // The core: a chrome socket, five storeys of dark glass between cyan bands, data streaks, the crown.
  b.cylT(0.5, 0.56, 0.1, CHROME, 0, y, 0, 12);
  const c0 = y + 0.1, lv = 0.35;
  for (let i = 0; i < 5; i++) b.cylT(0.42, 0.42, lv - 0.05, GLASS, 0, c0 + i * lv, 0, 12).cylT(0.44, 0.44, 0.05, i % 2 ? NM : NC, 0, c0 + i * lv + lv - 0.05, 0, 12);
  const top = c0 + 5 * lv;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; b.box(0.025, 5 * lv - 0.1, 0.025, NC, Math.cos(a) * 0.425, c0 + 0.05, Math.sin(a) * 0.425); }
  b.cylT(0.52, 0.44, 0.1, CHROME, 0, top, 0, 12).cylT(0.53, 0.53, 0.025, NM, 0, top + 0.06, 0, 12);
  // The ribs, bowed out from the plinth to the crown, a team banner on each, and the crown's prongs.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), p0 = [ca * 0.82, 0.36, sa * 0.82], p1 = [ca * 0.8, 1.25, sa * 0.8], p2 = [ca * 0.5, top + 0.05, sa * 0.5];
    stick(b, 0.05, SNOW, p0, p1, CYL6); stick(b, 0.05, SNOW, p1, p2, CYL6); b.add(BALL, SNOW, ...p1, 0.055, 0.055, 0.055);
    b.box(0.16, 0.5, 0.025, t, ca * 0.86, 0.62, sa * 0.86, 0, Math.PI / 2 - a).box(0.17, 0.03, 0.03, NC, ca * 0.86, 1.12, sa * 0.86, 0, Math.PI / 2 - a);
    stick(b, 0.018, CHROME, [ca * 0.42, top + 0.1, sa * 0.42], [ca * 0.3, top + 0.42, sa * 0.3], CYL6);
  }
  // The server monoliths: dark glass slabs facing out from the corners, ruled in neon, white caps, team bases.
  for (const [x, z, hh] of [[-1.12, -1.12, 1.5], [1.12, -1.12, 1.0], [-1.12, 1.12, 1.0], [1.12, 1.12, 0.5]]) {
    const ry = Math.PI / 2 - Math.atan2(z, x), [ox, oz] = turn(x, z, ry)(0, 0.075);
    b.box(0.28, hh, 0.14, GLASS, x, 0, z, 0, ry).box(0.32, 0.05, 0.18, SNOW, x, hh, z, 0, ry).box(0.29, 0.08, 0.15, t, x, 0, z, 0, ry);
    for (let k = 1; k * 0.22 < hh - 0.1; k++) b.box(0.2, 0.015, 0.01, k % 2 ? NC : NM, ox, 0.08 + k * 0.22, oz, 0, ry);
  }
  // The heart floats in its prongs; the data rings and the packets turn round the column.
  const heart = new B().add(unit.foliage, NM, 0, 0, 0, 0.22, 0.22, 0.22).add(unit.foliage, 0xffd6fb, 0, 0, 0, 0.1, 0.1, 0.1);
  hoop(heart, 0.27, 0.012, NC, 0, 0, 0, Math.PI / 2 + 0.4, 0, 20);
  const packets = new B();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; packets.box(0.07, 0.07, 0.07, [NC, SNOW, NM, SNOW][i % 4], Math.cos(a) * 1.05, -0.035, Math.sin(a) * 1.05, 0, a); }
  extra.floaters = [{ geo: heart.geometry(), at: [0, top + 0.42, 0], amp: 0.06, speed: 1.2 }];
  extra.spinners = [
    { geo: hoop(new B(), 0.68, 0.02, NC, 0, 0, 0, Math.PI / 2 + 0.35, 0, 36).geometry(), at: [0, 1.3, 0], axis: 'y', speed: 0.7 },
    { geo: hoop(new B(), 0.86, 0.018, NM, 0, 0, 0, Math.PI / 2 - 0.3, 0, 36).geometry(), at: [0, 1.8, 0], axis: 'y', speed: -0.5 },
    { geo: packets.geometry(), at: [0, 0.75, 0], axis: 'y', speed: 0.45 },
  ];
  return top + 0.42;
}

// Pale crystal colours, and a crystal of unit length along y (half the octahedron) for stick(); a hexagonal prism and
// point with flat facets, for the Wonder's spire.
const CRYS = 0x7fdcff, CRYS_M = 0xe39cff, CRYS_W = 0xd2f4ff, GEM5 = new THREE.OctahedronGeometry(0.5, 0);
const facet = g => { const n = g.toNonIndexed(); n.computeVertexNormals(); g.dispose(); return n; };
const PRISM6 = facet(new THREE.CylinderGeometry(1, 1, 1, 6)), POINT6 = facet(new THREE.ConeGeometry(1, 1, 6));
// A crystal island for a floater: an inverted white rock crowned with crystals, a neon ring round its rim.
const island = (k, c) => {
  const g = new B().add(new THREE.ConeGeometry(0.3 * k, 0.42 * k, 6), SNOW, 0, -0.21 * k, 0, 1, 1, 1, Math.PI, 0, 0).add(CYL6, PANEL, 0, 0.01, 0, 0.3 * k, 0.03, 0.3 * k);
  hoop(g, 0.31 * k, 0.012, NC, 0, 0.0, 0, Math.PI / 2, 0, 18);
  for (const [x, z, l, tl] of [[0, 0, 0.5, 0], [0.12, 0.05, 0.3, 0.35], [-0.1, 0.08, 0.26, -0.4], [0.02, -0.13, 0.22, 0.3]]) {
    stick(g, 0.11 * k, l > 0.4 ? c : CRYS_W, [x * k, 0.02, z * k], [(x + Math.sin(tl) * l * 0.5) * k, (0.02 + l) * k, (z + Math.sin(tl) * 0.2) * k], GEM5);
  }
  return g;
};

// Wonder: a floating crystal megastructure. Three white octagonal terraces, edged in neon, step up to a chrome socket
// banded in team colour, from which the great crystal spire rises, neon on its edges, past five lesser crystals leaning
// out round it, to a glowing emitter; above it, over a gap of light, the spire's upper crystal floats. Crystal pylons
// stand on the terrace corners and team-lined stairs climb the two faces the camera sees. Three crystal islands drift
// round the spire, two great rings turn about it and a halo of shards orbits it.
export function wonder(ctx) {
  const { b, extra, t } = ctx, OCT = Math.PI / 8;
  let y = 0;
  for (const [r, c] of [[1.86, NC], [1.5, NM], [1.12, NC]]) { b.cylT(r - 0.02, r, 0.16, SNOW, 0, y, 0, 8, 0, OCT).cylT(r + 0.012, r + 0.012, 0.025, c, 0, y + 0.115, 0, 8, 0, OCT); y += 0.16; }
  // The stairs up the front and right faces, between team cheeks.
  for (const ry of [0, Math.PI / 2]) {
    const at = turn(0, 0, ry);
    for (let k = 0; k < 6; k++) { const [x, z] = at(0, 1.86 - 0.115 * (k + 0.5)); b.box(0.5, 0.08 * (k + 1), 0.115, PANEL, x, 0, z, 0, ry); }
    for (const u of [-0.28, 0.28]) { const [x0, z0] = at(u, 1.88), [x1, z1] = at(u, 1.06); stick(b, 0.035, t, [x0, 0.06, z0], [x1, 0.52, z1], CYL6); }
  }
  // The crystal pylons on the lowest terrace's corners.
  for (let i = 0; i < 8; i++) {
    const a = OCT + i * Math.PI / 4, x = Math.cos(a) * 1.64, z = Math.sin(a) * 1.64;
    b.cylT(0.07, 0.09, 0.06, CHROME, x, 0.16, z, 6).cylT(0.075, 0.075, 0.015, NC, x, 0.22, z, 6);
    stick(b, 0.12, i % 2 ? CRYS_M : CRYS, [x, 0.2, z], [x, 0.75, z], GEM5);
  }
  // The socket, its team band, the spire with neon edges, its bands and the emitter on its top.
  const y0 = 0.48, sy = y0 + 0.16, sh = 2.2, R = 0.42, ey = sy + sh;
  b.cylT(0.62, 0.72, 0.16, CHROME, 0, y0, 0, 8, 0, OCT).cylT(0.73, 0.73, 0.06, t, 0, y0 + 0.04, 0, 8, 0, OCT);
  b.add(PRISM6, CRYS, 0, sy + sh / 2, 0, R, sh, R);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.box(0.03, sh, 0.03, NC, Math.sin(a) * R, sy, Math.cos(a) * R, 0, a); }
  for (const yy of [sy + 0.9, sy + 1.7]) b.add(PRISM6, NM, 0, yy, 0, R + 0.02, 0.05, R + 0.02);
  b.add(PRISM6, CHROME, 0, ey + 0.04, 0, R + 0.05, 0.08, R + 0.05).add(PRISM6, NC, 0, ey + 0.09, 0, R - 0.05, 0.02, R - 0.05);
  // The upper crystal, floating over the emitter: a short point below, the prism, a long point above.
  const crown = new B().add(POINT6, CRYS_W, 0, -0.25, 0, R, 0.5, R, Math.PI, 0, 0).add(PRISM6, CRYS, 0, 0.4, 0, R, 0.8, R).add(POINT6, CRYS_W, 0, 1.2, 0, R, 0.8, R);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; crown.box(0.03, 0.8, 0.03, NC, Math.sin(a) * R, 0, Math.cos(a) * R, 0, a); }
  crown.add(PRISM6, NM, 0, 0.4, 0, R + 0.02, 0.05, R + 0.02);
  // The lesser crystals leaning out round the spire.
  for (let i = 0; i < 5; i++) {
    const a = i * 2 * Math.PI / 5 + 0.6, l = 1.4 + hash(i, 4) * 0.9, lean = 0.28 + hash(4, i) * 0.12, ca = Math.cos(a), sa = Math.sin(a);
    const p = [ca * 0.55, sy - 0.05, sa * 0.55], q = [p[0] + ca * Math.sin(lean) * l, p[1] + Math.cos(lean) * l, p[2] + sa * Math.sin(lean) * l];
    stick(b, 0.36, i % 2 ? CRYS_M : CRYS, p, q, GEM5);
  }
  // The upper crystal, the islands, the rings and the halo of shards.
  extra.floaters = [
    { geo: crown.geometry(), at: [0, ey + 0.8, 0], amp: 0.1, speed: 0.7 },
    ...[[0.5, 1.3, 2.4, 1.4, CRYS], [2.6, 1.3, 3.3, 1.15, CRYS_M], [4.6, 1.28, 2.85, 1.3, CRYS]].map(([a, r, yy, k, c], i) => ({ geo: island(k, c).geometry(), at: [Math.cos(a) * r, yy, Math.sin(a) * r], amp: 0.14, speed: 0.9 + i * 0.2, phase: i * 2 })),
  ];
  const shards = new B();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; shards.add(GEM, i % 2 ? CRYS_M : CRYS_W, Math.cos(a) * 1.72, 0, Math.sin(a) * 1.72, 0.06, 0.14, 0.06, 0, a, 0.4); }
  extra.spinners = [
    { geo: hoop(new B(), 1.0, 0.03, NC, 0, 0, 0, Math.PI / 2 + 0.35, 0, 48).geometry(), at: [0, ey + 0.4, 0], axis: 'y', speed: 0.5 },
    { geo: hoop(new B(), 0.82, 0.025, NM, 0, 0, 0, Math.PI / 2 - 0.45, 0, 40).geometry(), at: [0, ey + 1.5, 0], axis: 'y', speed: -0.7 },
    { geo: shards.geometry(), at: [0, 1.45, 0], axis: 'y', speed: 0.35 },
  ];
  return ey + 0.1;
}

// Castle: an energy-dome fortress. Eight white rampart walls, banded in dark glass and topped with cyan neon, close an
// octagon round a dark court, a white pylon at each corner; laser turrets with team bands stand on the four walls that
// face the axes, and the gate opens in the front wall through a team portal barred by cyan energy bars. The keep is a
// white hexagonal tower with dark glass slit bands and team banners, crowned by the dome generator; over it all the
// energy dome, a lattice of cyan meridians and magenta parallels, turns slowly. Patrol drones hover by the turrets.
export function castle(ctx) {
  const { b, extra, s, t, td } = ctx, A = 1.5, H = 0.5, W = 0.16, seg = 2 * A * Math.tan(Math.PI / 8), OCT = Math.PI / 8, y = 0.04;
  b.box(s, y, s, PAVE);
  b.cylT(A, A, 0.02, APRON, 0, y, 0, 8, 0, OCT);
  for (let i = 0; i < 8; i++) {
    const th = i * Math.PI / 4, ry = Math.PI / 2 - th, at = turn(Math.cos(th) * A, Math.sin(th) * A, ry);
    // The front wall (i = 1) is two halves either side of the gate.
    for (const [u, len] of i === 1 ? [[-(seg + 0.44) / 4, (seg - 0.44) / 2], [(seg + 0.44) / 4, (seg - 0.44) / 2]] : [[0, seg + 0.02]]) {
      const [x, z] = at(u, 0);
      b.box(len, H, W, SNOW, x, y, z, 0, ry).box(len + 0.01, 0.08, W + 0.012, GLASS, x, y + 0.24, z, 0, ry).box(len + 0.01, 0.03, W + 0.012, NC, x, y + H, z, 0, ry);
    }
    // A pylon at each corner.
    const va = th + OCT, vr = A / Math.cos(OCT), vx = Math.cos(va) * vr, vz = Math.sin(va) * vr;
    b.add(CYL6, SNOW, vx, y + 0.32, vz, 0.12, 0.64, 0.12).add(CYL6, NC, vx, y + 0.66, vz, 0.1, 0.04, 0.1);
    if (i % 2) continue;
    // A laser turret on the wall: a white drum with a team band, a chrome head, twin barrels pointing out.
    const [tx, tz] = at(0, 0), [bx, bz] = at(0, 0.22);
    b.cylT(0.17, 0.18, 0.24, SNOW, tx, y + H + 0.03, tz, 10).cylT(0.182, 0.182, 0.05, t, tx, y + H + 0.1, tz, 10).add(DOME, CHROME, tx, y + H + 0.27, tz, 0.15, 0.12, 0.15);
    for (const k of [-0.05, 0.05]) { const [px, pz] = turn(bx, bz, ry)(k, 0); b.add(CYL8, DARK, px, y + H + 0.32, pz, 0.022, 0.3, 0.022, Math.PI / 2, ry, 0); }
    b.add(CYL8, NM, bx + Math.cos(th) * 0.15, y + H + 0.32, bz + Math.sin(th) * 0.15, 0.05, 0.02, 0.05, Math.PI / 2, ry, 0);
  }
  // The gate: team pylons, a white lintel with a neon strip, three energy bars.
  const gth = Math.PI / 4, gry = Math.PI / 2 - gth, gat = turn(Math.cos(gth) * A, Math.sin(gth) * A, gry);
  for (const u of [-0.26, 0.26]) { const [x, z] = gat(u, 0); b.box(0.1, 0.72, 0.22, td, x, y, z, 0, gry); }
  let [gx, gz] = gat(0, 0); b.box(0.62, 0.1, 0.22, SNOW, gx, y + 0.66, gz, 0, gry).box(0.63, 0.025, 0.23, NC, gx, y + 0.7, gz, 0, gry);
  for (const yy of [0.16, 0.32, 0.48]) b.box(0.42, 0.02, 0.02, NC, gx, y + yy, gz, 0, gry);
  // The keep: a white hexagonal tower, slit bands of dark glass, team banners on the faces the camera sees, the crown and
  // the dome generator.
  b.add(CYL6, SNOW, 0, y + 0.02 + 0.55, 0, 0.5, 1.1, 0.5);
  for (const yy of [0.4, 0.72, 1.0]) b.add(CYL6, GLASS, 0, y + yy, 0, 0.505, 0.05, 0.505);
  for (const a of [Math.PI / 6, Math.PI / 2]) b.box(0.18, 0.62, 0.02, t, Math.sin(a) * 0.44, y + 0.3, Math.cos(a) * 0.44, 0, a);
  b.cylT(0.56, 0.5, 0.08, CHROME, 0, y + 1.12, 0, 6).cylT(0.08, 0.1, 0.2, GRID, 0, y + 1.2, 0, 8).add(BALL, CHROME, 0, y + 1.5, 0, 0.2, 0.2, 0.2);
  hoop(b, 0.22, 0.02, NC, 0, y + 1.5, 0, Math.PI / 2, 0, 20); b.add(BALL, NM, 0, y + 1.72, 0, 0.05, 0.05, 0.05);
  // The energy dome over the walls; drones by the turrets.
  const dome = new B(), R = A - W / 2 - 0.02;
  for (let k = 0; k < 6; k++) hoop(dome, R, 0.012, NC, 0, 0, 0, 0, k * Math.PI / 6, 20, Math.PI);
  for (const e of [Math.PI / 6, Math.PI / 3]) hoop(dome, R * Math.cos(e), 0.012, NM, 0, R * Math.sin(e), 0, Math.PI / 2, 0, 32);
  hoop(dome, R * 0.22, 0.014, NC, 0, R * 0.975, 0, Math.PI / 2, 0, 12);
  extra.spinners = [{ geo: dome.geometry(), at: [0, y + H, 0], axis: 'y', speed: 0.25 }];
  extra.floaters = [
    { geo: drone(NM, 1.2).geometry(), at: [1.55, 1.2, -0.75], amp: 0.12, speed: 1.4 },
    { geo: drone(NC, 1.2).geometry(), at: [-0.75, 1.3, 1.55], amp: 0.12, speed: 1.6, phase: 2 },
  ];
  return y + 1.77;
}

// A floating robot arm for a floater, reaching along +x: an antigravity hub over a neon ring, a white upper arm and
// forearm on a grey elbow, a magenta tool tip.
const arm = () => {
  const g = new B().add(BALL, CHROME, 0, 0, 0, 0.07, 0.07, 0.07);
  hoop(g, 0.1, 0.012, NC, 0, -0.04, 0, Math.PI / 2, 0, 14);
  stick(g, 0.032, SNOW, [0, 0, 0], [0.12, 0.2, 0], CYL6); g.add(BALL, GRID, 0.12, 0.2, 0, 0.042, 0.042, 0.042);
  stick(g, 0.026, SNOW, [0.12, 0.2, 0], [0.36, 0.02, 0], CYL6);
  return g.box(0.06, 0.05, 0.05, GRID, 0.37, -0.005, 0).add(BALL, NM, 0.405, 0.0, 0, 0.022, 0.022, 0.022);
};

// Factory: a nanofab with floating arms. A faceted white fab shell across the back, its ridges lit in neon, a ribbon
// of dark glass along its upper facet and a team stripe along its lower one; a dark glass bay opens in its front under
// a neon frame, and two glass nano-vats ringed in cyan stand piped to its end. Before it, on a glowing assembly cradle,
// a team tank hull is being printed, its turret still a cage of cyan layers; three robot arms float round it with no
// mounts, their magenta tool tips at work, and a scanning halo turns over the cradle.
export function factory(ctx) {
  const { b, extra, s, t, td } = ctx, y = 0.08, L = 2.0, hx = -0.25;
  b.box(s, 0.04, s, PAVE);
  slab(b, s - 0.12, s - 0.12, 0.04, 0, 0, 0.04);
  // The shell: a faceted profile (z, height) extruded along x, neon on its ridges.
  const prof = [[-1.3, 0], [-1.3, 1.3], [-1.02, 1.48], [-0.55, 1.18], [-0.26, 0.6], [-0.18, 0]], sh = new THREE.Shape();
  sh.moveTo(-prof[0][0], prof[0][1]); for (const [z, yy] of prof.slice(1)) sh.lineTo(-z, yy); sh.closePath();
  const hall = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); hall.translate(0, 0, -L / 2);
  b.add(hall, SNOW, hx, y, 0, 1, 1, 1, 0, Math.PI / 2, 0); hall.dispose();
  for (const [z, yy] of prof.slice(2, 5)) b.box(L + 0.02, 0.03, 0.03, NC, hx, y + yy - 0.015, z);
  // A facet's frame: the point a fraction f along the facet from prof[i] to prof[i + 1], o out from it, and its tilt.
  const facetAt = (i, f, o = 0.012) => {
    const [z0, y0] = prof[i], [z1, y1] = prof[i + 1], L2 = Math.hypot(z1 - z0, y1 - y0), nz = (y0 - y1) / L2, ny = (z1 - z0) / L2;
    return [z0 + (z1 - z0) * f + nz * o, y + y0 + (y1 - y0) * f + ny * o, Math.atan2(y0 - y1, z1 - z0)];
  };
  let [fz, fy, fr] = facetAt(2, 0.5); b.box(L - 0.16, 0.02, 0.24, GLASS, hx, fy - 0.01, fz, fr);
  [fz, fy, fr] = facetAt(3, 0.5); b.box(L - 0.02, 0.02, 0.1, t, hx, fy - 0.01, fz, fr);
  // The bay in the front facet, its neon frame, and the team stripe on the shell's end.
  [fz, fy, fr] = facetAt(4, 0.55); b.box(1.0, 0.02, 0.48, GLASS, 0.15, fy - 0.01, fz, fr);
  [fz, fy, fr] = facetAt(4, 0.12); b.box(1.06, 0.03, 0.03, NC, 0.15, fy - 0.015, fz, fr);
  b.box(0.02, 0.12, 0.9, t, hx + L / 2 + 0.005, y + 0.55, -0.8);
  // The nano-vats at the shell's end, piped into it.
  for (const z of [-1.02, -0.56]) {
    b.cylT(0.2, 0.22, 0.08, CHROME, 1.0, y, z, 10).cylT(0.17, 0.17, 1.1, FLUID, 1.0, y + 0.08, z, 12).add(DOME, SNOW, 1.0, y + 1.18, z, 0.17, 0.1, 0.17);
    for (const yy of [0.35, 0.7, 1.05]) b.cylT(0.176, 0.176, 0.03, yy > 1 ? NM : NC, 1.0, y + yy, z, 12);
    b.box(0.2, 0.05, 0.05, CHROME, hx + L / 2 + 0.1, y + 0.3, z);
  }
  // The cradle: a dark disc in neon rings, and the hull being printed on it.
  const cx = 0.1, cz = 0.66;
  b.cylT(0.55, 0.6, 0.08, DARK, cx, y, cz, 16); hoop(b, 0.58, 0.016, NC, cx, y + 0.06, cz, Math.PI / 2, 0, 32); hoop(b, 0.36, 0.012, NM, cx, y + 0.08, cz, Math.PI / 2, 0, 24);
  for (const k of [-1, 1]) b.box(0.6, 0.006, 0.12, DARK, cx, y + 0.08, cz + k * 0.15).box(0.6, 0.012, 0.014, GRID, cx, y + 0.13, cz + k * 0.15);
  b.box(0.58, 0.06, 0.12, DARK, cx, y + 0.08, cz - 0.15).box(0.58, 0.06, 0.12, DARK, cx, y + 0.08, cz + 0.15);
  b.box(0.52, 0.1, 0.26, t, cx - 0.02, y + 0.12, cz).box(0.16, 0.05, 0.26, td, cx + 0.3, y + 0.15, cz, 0, 0, -0.6);
  b.box(0.24, 0.04, 0.22, td, cx - 0.05, y + 0.22, cz);
  for (const yy of [0.29, 0.34, 0.39]) for (const k of [-1, 1]) b.box(0.24, 0.012, 0.012, NC, cx - 0.05, y + yy, cz + k * 0.105).box(0.012, 0.012, 0.22, NC, cx - 0.05 + k * 0.115, y + yy, cz);
  b.box(0.3, 0.012, 0.012, NC, cx + 0.22, y + 0.33, cz);
  // The floating arms round the cradle, reaching in; the scanning halo.
  extra.floaters = [0.5, 2.6, 4.7].map((a, i) => {
    const g = new B(); place(g, arm(), 0, 0, 0, Math.PI - a, 1.3);
    return { geo: g.geometry(), at: [cx + Math.cos(a) * 0.72, y + 0.4, cz + Math.sin(a) * 0.72], amp: 0.05, speed: 1.8 + i * 0.3, phase: i * 2 };
  });
  extra.spinners = [{ geo: hoop(new B(), 0.48, 0.014, NC, 0, 0, 0, Math.PI / 2 + 0.28, 0, 32).geometry(), at: [cx, y + 0.78, cz], axis: 'y', speed: 0.9 }];
  return y + 1.5;
}

// ---------- AI Future defences ----------
// Tower: a laser turret. A white hexagonal plinth edged in cyan neon carries a tapering white column, team-banded and
// ringed with neon, up to a chrome collar and the turret head: a white pod with a dark visor and a team fin, its chrome
// emitter (neon focusing coils, twin prongs and a glowing lens) aimed at the field and heat-sink fins behind. A magenta
// ring turns round the head (a spinner) and a crystal hovers over it (a floater). Its shot is the laser: a beam from
// the lens and the flare at its source (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, y = 0.03, hy = 1.92, d = [0.447, 0, 0.894], px = [d[2], 0, -d[0]], ry = Math.atan2(d[0], d[2]);
  const at = (f, o = 0, dy = 0) => [d[0] * f + px[0] * o, hy + dy, d[2] * f + px[2] * o];
  b.box(1.76, y, 1.76, PAVE);
  b.cylT(0.8, 0.86, 0.22, SNOW, 0, y, 0, 6).cylT(0.875, 0.875, 0.03, NC, 0, y + 0.13, 0, 6).cylT(0.74, 0.74, 0.03, APRON, 0, y + 0.22, 0, 6);
  // The column, its team band and neon rings, and the collar.
  b.cylT(0.2, 0.34, 1.25, SNOW, 0, y + 0.25, 0, 8);
  b.cylT(0.3, 0.315, 0.12, t, 0, 0.55, 0, 8);
  for (const [yy, r] of [[0.98, 0.265], [1.3, 0.235]]) b.cylT(r, r, 0.025, NC, 0, yy, 0, 8);
  b.cylT(0.36, 0.22, 0.12, CHROME, 0, 1.5, 0, 12);
  // The head: the pod, its visor and team fin, the heat sinks behind.
  b.sph(0.4, SNOW, 0, hy, 0, 1, 0.72, 1).sph(0.405, DARK, 0, hy + 0.03, 0, 1, 0.2, 1);
  b.box(0.05, 0.14, 0.38, t, ...at(-0.04, 0, 0.22), 0, ry);
  for (const o of [-0.12, -0.04, 0.04, 0.12]) b.box(0.03, 0.18, 0.16, GRID, ...at(-0.42, o, -0.09), 0, ry);
  // The emitter: barrel, coils, prongs and lens.
  stick(b, 0.07, CHROME, at(0.3), at(0.82), CYL8);
  for (const f of [0.46, 0.58, 0.7]) stick(b, 0.088, NC, at(f), at(f + 0.025), CYL8);
  for (const o of [-0.1, 0.1]) stick(b, 0.022, CHROME, at(0.55, o), at(0.98, o * 0.6), CYL6);
  stick(b, 0.06, NC, at(0.82), at(0.85), DISC);
  flag(ctx, -0.56, y + 0.25, -0.56, 0.9, CHROME);
  extra.spinners = [{ geo: ring(0.62, 0.025, NM, 0.35), at: [0, hy, 0], axis: 'y', speed: 1.1 }];
  extra.floaters = [{ geo: new B().add(GEM, NC, 0, 0, 0, 0.09, 0.17, 0.09).add(GEM, t, 0, 0, 0, 0.05, 0.1, 0.05).geometry(), at: [0, hy + 0.62, 0], amp: 0.07, speed: 1.5 }];
  // The laser: the beam out of the lens, the flare at the lens and a spark where it strikes.
  const fire = new B(), tip = at(0.86), end = at(2.1, 0, -0.18);
  stick(fire, 0.04, NC, tip, end, CYL6);
  fire.add(BALL, HOT, ...tip, 0.12, 0.12, 0.12).add(BALL, NM, ...end, 0.08, 0.08, 0.08);
  extra.fire = { geo: fire.geometry(), at: [0, 0, 0] };
  return hy + 0.37;
}

// Wall: an energy barrier. A dark plinth with a cyan neon edge and a white deck, white emitter pylons with team caps
// at its corners, and between them a block of humming energy, its crest edged in neon and its faces crossed by three
// laser beams, cyan and magenta; it fills its tile edge to edge, so segments in a line close up into one barrier, the
// beams running on from pylon to pylon.
export function wall(ctx) {
  const { b, t } = ctx, y0 = 0.16, top = 0.86, f = 0.44, fy = 0.76;
  b.box(1, 0.1, 1, DARK).box(1, 0.025, 1, NC, 0, 0.1, 0).box(1, 0.035, 1, SNOW, 0, 0.125, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.1, top - y0, 0.1, SNOW, x * 0.45, y0, z * 0.45).box(0.1, 0.06, 0.1, t, x * 0.45, top, z * 0.45);
  b.box(2 * f, fy - y0, 2 * f, FLUID, 0, y0, 0);
  for (const k of [-1, 1]) {
    b.box(2 * f, 0.02, 0.02, NC, 0, fy, k * (f - 0.01)).box(0.02, 0.02, 2 * f - 0.04, NC, k * (f - 0.01), fy, 0);
    for (const [i, yy] of [0.3, 0.46, 0.62].entries()) { const c = i === 1 ? NM : NC; b.box(0.8, 0.025, 0.025, c, 0, yy, k * 0.475).box(0.025, 0.025, 0.8, c, k * 0.475, yy, 0); }
  }
  return top + 0.06;
}
