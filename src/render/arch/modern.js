// Modern Age: today's glass, steel and concrete under flat roofs, with signage, air-con units, solar panels and
// antennas. A glass office tower with a helipad, a white cube house, corrugated steel grain bins, a container yard, a
// greenhouse, an army base with a turning radar, a concrete shooting range, a motor pool, a supermarket, a glass
// government block, a twisting skyscraper, a concrete bunker complex and a clean modern plant; for defence, a missile
// turret with a sweeping radar and a precast concrete barrier.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, stick, place, HOT, CYL6, CYL8, DISC, BALL, CONE4, FRUSTUM } from './kit.js';

export function house(ctx) {
  const { b, s, t } = ctx;
  // Two offset white boxes with dark glazing, flat roofs and solar panels.
  b.box(s + 0.1, 0.05, s + 0.1, 0x7d8a5a).box(1.25, 0.62, 0.95, P.white, -0.2, 0.05, 0.12).box(1.0, 0.56, 0.85, 0xdadad6, 0.22, 0.67, -0.12);
  b.box(0.8, 0.42, 0.03, P.dark, -0.35, 0.12, 0.6).box(0.7, 0.36, 0.03, P.dark, 0.25, 0.76, 0.32).box(0.03, 0.36, 0.5, P.dark, 0.73, 0.76, -0.1);
  b.box(1.27, 0.04, 0.97, 0x3a3d40, -0.2, 0.67, 0.12).box(1.02, 0.05, 0.87, 0x3a3d40, 0.22, 1.23, -0.12);
  for (let i = 0; i < 3; i++) b.box(0.24, 0.02, 0.4, 0x1f3550, -0.08 + i * 0.27, 1.32, -0.15, -0.35);
  // Garage door and driveway, a team-coloured front door, a garden tree.
  b.box(0.5, 0.36, 0.03, 0x8d8f91, 0.55, 0.05, 0.45).box(0.6, 0.02, 0.5, 0x3a3d40, 0.55, 0.05, 0.75).box(0.16, 0.42, 0.03, t, -0.75, 0.05, 0.6);
  b.cyl(0.03, 0.35, 0x6b5a46, -0.78, 0.05, -0.65).foliage(0.2, 0x4f7a3a, -0.78, 0.35, -0.65);
  return 1.41;
}

export function town_center(ctx) {
  const { b, mast, s, t, td } = ctx, tx = 0.3, tz = -0.25;
  // Concrete podium with a glass tower banded by floor slabs.
  b.box(s + 0.1, 0.05, s + 0.1, 0x3a3d40).box(s - 0.2, 0.55, s * 0.7, P.concrete, 0, 0.05, -0.1).box(s - 0.24, 0.3, 0.03, P.dark, 0, 0.12, -0.1 + s * 0.35 + 0.01);
  b.box(1.36, 2.2, 1.16, P.glass, tx, 0.6, tz);
  for (let i = 0; i <= 5; i++) b.box(1.42, 0.06, 1.22, P.concrete, tx, 0.6 + i * 0.43, tz);
  // Rooftop plant and helipad; the antenna and its red light are in the mast.
  b.box(0.3, 0.2, 0.25, 0x8d8f91, tx - 0.35, 2.8, tz - 0.3).box(0.25, 0.18, 0.25, 0x8d8f91, tx + 0.4, 2.8, tz - 0.32);
  mast.cyl(0.02, 0.9, 0x8d8f91, tx + 0.5, 2.8, tz + 0.35).sph(0.04, 0xff3b30, tx + 0.5, 3.72, tz + 0.35);
  b.cyl(0.38, 0.03, 0x3a3d40, tx - 0.05, 2.8, tz + 0.1).box(0.04, 0.02, 0.3, P.white, tx - 0.15, 2.84, tz + 0.1).box(0.04, 0.02, 0.3, P.white, tx + 0.05, 2.84, tz + 0.1).box(0.2, 0.02, 0.04, P.white, tx - 0.05, 2.84, tz + 0.1);
  // Podium solar panels, the entrance canopy and the team-coloured sign.
  for (let i = 0; i < 4; i++) b.box(0.26, 0.02, 0.36, 0x1f3550, -0.95 + i * 0.3, 0.64, -0.6, -0.3);
  b.box(0.9, 0.05, 0.45, 0x8d8f91, -0.55, 0.5, s * 0.25 + 0.15).box(0.04, 0.45, 0.04, 0x8d8f91, -0.95, 0.05, s * 0.25 + 0.35).box(0.04, 0.45, 0.04, 0x8d8f91, -0.15, 0.05, s * 0.25 + 0.35).box(0.6, 0.12, 0.03, t, -0.55, 0.38, -0.1 + s * 0.35 + 0.02);
  // Three flagpoles with their flags (in the mast, so the flags never hang off a hidden pole), and a crossing.
  for (let i = 0; i < 3; i++) mast.cyl(0.015, 1.1, C.iron, 0.6 + i * 0.28, 0.05, s / 2 - 0.12).box(0.02, 0.18, 0.3, i === 1 ? t : td, 0.6 + i * 0.28, 0.9, s / 2 - 0.12 + 0.15);
  for (let i = 0; i < 5; i++) b.box(0.03, 0.01, 0.4, P.white, -1.15 + i * 0.25, 0.05, s / 2 - 0.2);
  return 3.0;
}

// ---------- shared Modern parts ----------
// The Town Center's concrete, steel grey, asphalt and glass, and the House's lawn; olive drab for the military.
const WHITE = P.white, CONC = P.concrete, CONC_L = 0xd9d7d1, CONC_D = 0xa3a19b, ASPH = 0x3a3d40, ASPH_L = 0x4d5155;
const STEEL = 0x8d8f91, STEEL_L = 0xb4bcc2, STEEL_D = 0x5f656b, GLASS = P.glass, GLASS_D = 0x2c3e4c, DARK = P.dark;
const ROOF = 0x55595c, SOLAR = 0x1f3550, PANE = 0xcfe3ea, LIT = 0xfffbea, RED = 0xff3b30, YELLOW = 0xe2b83a;
const LAWN = 0x7d8a5a, GRASS = 0x6f8a4a, GRASS_D = 0x5f7a40, PAVE = 0xd3cfc4, GRAVEL = 0xa59d8a, WATER = 0x4f86a8;
const DIRT = 0x8f8670, SAND = 0xc8bfa2, SAND_D = 0xa89f84, LINE = 0xf0eee6, OLIVE = P.olive, OLIVE_D = 0x434b2d;
const TYRE = 0x222426, BARK = 0x6b5a46, LEAF = 0x4f7a3a, LEAF_L = 0x6a9a48, TOMATO = 0xd2402c, CRATE = 0x3d8a4e;
// Low-poly parts: a tomato; a half cylinder, curved side toward +x (earth-covered bunkers); a glass dome and its rib.
const OCTA = new THREE.OctahedronGeometry(1, 0), HALF = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false, 0, Math.PI);
const DOME = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), RIB = new THREE.TorusGeometry(1, 0.012, 3, 8, Math.PI / 2);
// A radar dish's shell: wide face at +y.
const DISH = new THREE.CylinderGeometry(1, 0.35, 1, 16);

// A point on a wall face centred at (x, z) facing ry (0: +z): u along the face, o out from it.
const onFace = (x, z, ry) => (u, o = 0) => [x + u * Math.cos(ry) + o * Math.sin(ry), z - u * Math.sin(ry) + o * Math.cos(ry)];
// [x, z] turned a about y, as rotation.y turns it.
const turn = ([x, z], a) => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];
// The colour c with each channel scaled by k (k < 1 darkens).
const shade = (c, k) => { const ch = n => Math.min(255, Math.round(((c >> n) & 255) * k)); return (ch(16) << 16) | (ch(8) << 8) | ch(0); };

// A glazed curtain wall w wide and hh tall on the wall face centred at (x, z) facing ry, from y0: glass in mullions
// about `bay` apart, with a transom at each of `floors` floor lines.
const curtain = (b, x, z, ry, w, y0, hh, floors, bay = 0.2, glass = GLASS, frame = WHITE) => {
  const at = onFace(x, z, ry), [gx, gz] = at(0, 0.006), [fx, fz] = at(0, 0.014), n = Math.max(1, Math.round(w / bay));
  b.box(w, hh, 0.012, glass, gx, y0, gz, 0, ry);
  for (let i = 0; i <= n; i++) { const [px, pz] = at(-w / 2 + i * w / n, 0.013); b.box(0.02, hh, 0.014, frame, px, y0, pz, 0, ry); }
  for (let f = 0; f <= floors; f++) b.box(w + 0.02, 0.026, 0.016, frame, fx, y0 + Math.min(f * hh / floors, hh - 0.026), fz, 0, ry);
};
// A rooftop air-con unit standing on y, its fan grille on top.
const ac = (b, x, y, z, k = 1) => b.box(0.2 * k, 0.11 * k, 0.15 * k, STEEL_L, x, y, z).add(CYL8, DARK, x, y + 0.11 * k + 0.004, z, 0.045 * k, 0.008, 0.045 * k);
// A chain-link fence from p to q standing on y: steel posts about 0.28 apart, a top rail and two line wires.
const fence = (b, [x0, z0], [x1, z1], y, hh = 0.3) => {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.28)), ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let i = 0; i <= n; i++) b.box(0.02, hh, 0.02, STEEL, x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n);
  for (const [yy, r] of [[hh - 0.014, 0.014], [hh * 0.5, 0.006], [0.05, 0.006]]) b.box(L, r, r, STEEL_L, (x0 + x1) / 2, y + yy, (z0 + z1) / 2, 0, ry);
};
// A small round tree standing on y.
const tree = (b, x, y, z, k = 1) => b.cylT(0.02 * k, 0.03 * k, 0.2 * k, BARK, x, y, z, 6).foliage(0.15 * k, LEAF, x, y + 0.16 * k, z);
// A barrier arm of n stripes, alternately team and white, from x along -x at height y (on z).
const boom = (b, t, x, y, z, n, w = 0.096) => { for (let i = 0; i < n; i++) b.box(w, 0.03, 0.03, i % 2 ? WHITE : t, x - w / 2 - i * w, y, z); };

// ---------- vehicles, for place(): each built at the origin facing +x, on its wheels ----------
const wheels = (v, xs, W, r = 0.04) => { for (const x of xs) for (const k of [-1, 1]) v.add(CYL8, TYRE, x, r, k * (W / 2 - 0.01), r, 0.035, r, Math.PI / 2, 0, 0); };
// A car in c: body, glasshouse and roof.
const car = c => {
  const v = new B();
  v.box(0.36, 0.075, 0.17, c, 0, 0.03, 0).box(0.2, 0.065, 0.155, GLASS_D, -0.02, 0.105, 0).box(0.19, 0.012, 0.15, c, -0.02, 0.17, 0);
  wheels(v, [-0.11, 0.11], 0.17);
  return v;
};
// A pickup in c with a load of produce crates in its bed.
const pickup = c => {
  const v = new B();
  v.box(0.4, 0.07, 0.18, c, 0, 0.035, 0).box(0.14, 0.08, 0.17, c, 0.05, 0.105, 0).box(0.012, 0.055, 0.15, GLASS_D, 0.121, 0.12, 0);
  for (const k of [-1, 1]) v.box(0.09, 0.045, 0.012, GLASS_D, 0.05, 0.125, k * 0.086).box(0.17, 0.05, 0.012, c, -0.11, 0.105, k * 0.084);
  v.box(0.012, 0.05, 0.18, c, -0.195, 0.105, 0).box(0.1, 0.06, 0.13, CRATE, -0.1, 0.105, 0).box(0.09, 0.01, 0.12, TOMATO, -0.1, 0.165, 0);
  wheels(v, [-0.12, 0.12], 0.18);
  return v;
};
// An olive military utility vehicle with the team mark on its bonnet and doors, and a spare wheel on the back.
const jeep = t => {
  const v = new B();
  v.box(0.42, 0.09, 0.2, OLIVE, 0, 0.04, 0).box(0.22, 0.085, 0.19, OLIVE, -0.06, 0.13, 0).box(0.012, 0.06, 0.16, GLASS_D, 0.051, 0.142, 0);
  for (const k of [-1, 1]) v.box(0.14, 0.045, 0.012, GLASS_D, -0.06, 0.15, k * 0.096).box(0.07, 0.05, 0.006, t, -0.06, 0.06, k * 0.102);
  v.box(0.09, 0.005, 0.09, t, 0.13, 0.13, 0).box(0.03, 0.03, 0.21, OLIVE_D, 0.21, 0.05, 0);
  v.add(CYL8, TYRE, -0.222, 0.12, 0, 0.05, 0.03, 0.05, 0, 0, Math.PI / 2);
  wheels(v, [-0.13, 0.13], 0.2, 0.045);
  return v;
};
// A truck: its cab in c at the front, the load (a body len long) in load, with the team mark (if any) on the cab doors
// and a team stripe (if any) along the load.
const truck = (c, load, { mark, stripe, len = 0.46 } = {}) => {
  const v = new B(), W = 0.22, lx = 0.15 - len / 2;
  v.box(len + 0.2, 0.04, 0.16, TYRE, 0.07 - len / 2 + 0.23, 0.05, 0);
  v.box(0.16, 0.2, W, c, 0.24, 0.06, 0).box(0.012, 0.08, W - 0.04, GLASS_D, 0.32, 0.16, 0);
  for (const k of [-1, 1]) {
    v.box(0.08, 0.07, 0.012, GLASS_D, 0.26, 0.16, k * (W / 2 + 0.002));
    if (mark) v.box(0.06, 0.05, 0.006, mark, 0.24, 0.09, k * (W / 2 + 0.004));
    if (stripe) v.box(len, 0.04, 0.006, stripe, lx, 0.2, k * (W / 2 + 0.008));
  }
  v.box(len, 0.24, W + 0.01, load, lx, 0.09, 0);
  wheels(v, [lx - len / 2 + 0.1, lx - len / 2 + 0.22, 0.24], W, 0.045);
  return v;
};
// An eight-wheeled armoured personnel carrier with a sloped glacis, a small turret and the team marks.
const apc = t => {
  const v = new B();
  v.box(0.56, 0.13, 0.24, OLIVE, 0, 0.06, 0).box(0.14, 0.1, 0.24, OLIVE, 0.3, 0.07, 0, 0, 0, 0.7);
  v.box(0.18, 0.07, 0.15, OLIVE_D, -0.04, 0.19, 0).box(0.1, 0.005, 0.1, t, -0.19, 0.19, 0);
  stick(v, 0.012, OLIVE_D, [0.04, 0.23, 0], [0.32, 0.24, 0], CYL6);
  for (const k of [-1, 1]) v.box(0.09, 0.06, 0.006, t, -0.12, 0.11, k * 0.123);
  wheels(v, [-0.21, -0.07, 0.07, 0.21], 0.25, 0.05);
  return v;
};

// Granary: steel silos with pipes. Three corrugated steel grain bins on concrete rings, each banded in team colour
// under a conical roof with a vent cap and a ladder up its camera side. Among them a steel distributor tower carries
// the spout pipes down to each bin's roof, fed by an inclined auger from the intake hopper, where a grain truck with a
// team cab unloads.
export function granary(ctx) {
  const { b, s, t } = ctx, y = 0.04, fills = [];
  b.box(s, y, s, CONC_D);
  for (const [x, z, r, hh] of [[-0.4, -0.4, 0.42, 0.95], [0.5, -0.5, 0.3, 0.72], [-0.52, 0.48, 0.3, 0.72]]) {
    const y0 = y + 0.06, top = y0 + hh, rh = r * 0.6, ay = top + 0.03 + rh;
    b.cylT(r + 0.05, r + 0.06, 0.06, CONC, x, y, z, 16).cylT(r, r, hh, STEEL_L, x, y0, z, 16);
    for (let yy = y0 + 0.09; yy < top - 0.2; yy += 0.11) b.cylT(r + 0.007, r + 0.007, 0.016, STEEL, x, yy, z, 16);
    b.cylT(r + 0.01, r + 0.01, 0.07, t, x, top - 0.15, z, 16).cylT(r + 0.03, r + 0.03, 0.03, STEEL, x, top, z, 16);
    b.cone(r + 0.03, rh, STEEL_L, x, top + 0.03, z, 16).cylT(0.05, 0.07, 0.07, STEEL, x, ay - 0.05, z, 8).cone(0.08, 0.05, STEEL_L, x, ay + 0.02, z, 8);
    fills.push([x, ay + 0.04, z]);
    // The ladder up the side facing the camera.
    const d = (r + 0.02) * Math.SQRT1_2, o = 0.03 * Math.SQRT1_2;
    for (const k of [-1, 1]) b.box(0.012, hh, 0.012, STEEL_D, x + d - k * o, y0, z + d + k * o);
    for (let yy = y0 + 0.08; yy < top; yy += 0.08) b.box(0.072, 0.008, 0.008, STEEL_D, x + d, yy, z + d, 0, Math.PI / 4);
  }
  // The distributor tower: four legs braced on the camera faces, a railed platform and the distributor head, its spout
  // pipes down to the bins.
  const tx = 0.32, tz = 0.26, th = 1.42, ty = y + th;
  for (const [kx, kz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.03, th, 0.03, STEEL_D, tx + kx * 0.1, y, tz + kz * 0.1);
  for (let i = 0; i < 3; i++) {
    const y1 = y + i * th / 3 + 0.02, y2 = y + (i + 1) * th / 3, [a, c] = i % 2 ? [-0.1, 0.1] : [0.1, -0.1];
    stick(b, 0.008, STEEL, [tx + a, y1, tz + 0.1], [tx + c, y2, tz + 0.1], unit.box);
    stick(b, 0.008, STEEL, [tx + 0.1, y1, tz + c], [tx + 0.1, y2, tz + a], unit.box);
  }
  b.box(0.3, 0.03, 0.3, STEEL, tx, ty, tz).box(0.3, 0.012, 0.012, STEEL_L, tx, ty + 0.13, tz + 0.14).box(0.012, 0.012, 0.3, STEEL_L, tx + 0.14, ty + 0.13, tz);
  for (const [kx, kz] of [[1, 1], [-1, 1], [1, -1]]) b.box(0.012, 0.13, 0.012, STEEL_L, tx + kx * 0.14, ty, tz + kz * 0.14);
  b.cylT(0.07, 0.05, 0.12, STEEL_L, tx, ty + 0.03, tz, 8).cone(0.075, 0.06, STEEL, tx, ty + 0.15, tz, 8);
  for (const f of fills) stick(b, 0.022, STEEL, [tx, ty + 0.08, tz], f, CYL6);
  // The intake hopper and its grate, the auger up to the head on its A-frame, and the truck unloading.
  const hx = 0.72, hz = 0.74, foot = [hx - 0.04, y + 0.1, hz - 0.04], mid = [(hx + tx) / 2, (y + ty) / 2, (hz + tz) / 2];
  b.box(0.3, 0.02, 0.3, STEEL_D, hx, y, hz).cylT(0.14, 0.05, 0.12, STEEL, hx, y + 0.02, hz, 4, 0, Math.PI / 4);
  stick(b, 0.032, STEEL_L, foot, [tx + 0.04, ty - 0.04, tz + 0.04], CYL8);
  b.box(0.09, 0.08, 0.11, STEEL_D, hx - 0.12, y, hz - 0.02);
  for (const k of [-1, 1]) stick(b, 0.012, STEEL_D, [mid[0] + k * 0.12, y, mid[2] - k * 0.12], mid, unit.box);
  place(b, truck(t, STEEL_L), 0.22, y, 0.78, Math.PI);
  return ty + 0.21;
}

// A shipping container, 20 ft (L 0.5) or 40 ft (L 1.0), facing +x for place() and standing on y = 0: ribbed sides in
// c, a darker frame of rails and corner posts, and the doors at its +x end with their locking bars.
const container = (c, L) => {
  const g = new B(), W = 0.24, H = 0.25, f = shade(c, 0.72), n = Math.round(L / 0.085);
  g.box(L, H, W, c);
  for (let i = 1; i < n; i++) for (const k of [-1, 1]) g.box(0.03, H - 0.05, 0.01, c, -L / 2 + i * L / n, 0.025, k * (W / 2 + 0.004));
  for (const yy of [0, H - 0.024]) g.box(L + 0.004, 0.024, W + 0.012, f, 0, yy, 0);
  for (const kx of [-1, 1]) for (const kz of [-1, 1]) g.box(0.028, H, 0.028, f, kx * (L / 2 - 0.012), 0, kz * (W / 2 - 0.008));
  g.box(0.006, H - 0.05, 0.008, f, L / 2 + 0.002, 0.025, 0);
  for (const zz of [-0.085, -0.035, 0.035, 0.085]) g.box(0.008, H - 0.06, 0.008, STEEL_L, L / 2 + 0.004, 0.03, zz);
  return g;
};
// A top-lift container handler facing +x for place(): its yellow body and cab, the mast and the spreader holding a
// 20 ft box in c sideways at the front.
const handler = c => {
  const v = new B();
  v.box(0.34, 0.12, 0.24, YELLOW, -0.02, 0.06, 0).box(0.12, 0.14, 0.14, GLASS_D, -0.1, 0.18, -0.04).box(0.13, 0.015, 0.15, YELLOW, -0.1, 0.32, -0.04);
  for (const k of [-1, 1]) v.box(0.04, 0.78, 0.04, STEEL_D, 0.17, 0.04, k * 0.08);
  v.box(0.14, 0.03, 0.1, STEEL_D, 0.24, 0.63, 0).box(0.2, 0.03, 0.46, STEEL_D, 0.33, 0.63, 0);
  wheels(v, [-0.12, 0.12], 0.26, 0.06);
  place(v, container(c, 0.5), 0.33, 0.38, 0, Math.PI / 2);
  return v;
};

// Storage Pit: stacked shipping containers. A container yard on asphalt: 40 ft boxes stacked three and two high across
// the back, 20 ft boxes two high down the right, several in team colour, among lane markings. A yellow top-lift
// handler brings another box in; the white site office on its blocks has a team door, steps, an air-con unit and the
// flag.
const ORANGE = 0xc8742c, GREEN_C = 0x3f6b4a, CREAM = 0xd9d4c4, BROWN = 0x7a4a2e, BLUE_GREY = 0x5d7380, GREY_C = 0x8a8f93;
export function storage_pit(ctx) {
  const { b, s, t } = ctx, y = 0.03, H = 0.25;
  b.box(s, y, s, ASPH_L);
  for (const [x, z, w, d] of [[-0.3, -0.29, 1.12, 0.02], [0.36, -0.5, 0.02, 0.6], [0.36, 0.33, 0.9, 0.02]]) b.box(w, 0.004, d, YELLOW, x, y, z);
  for (const [x, z, cs] of [[-0.3, -0.72, [GREY_C, t, ORANGE]], [-0.3, -0.45, [GREEN_C, CREAM]]]) cs.forEach((c, i) => place(b, container(c, 1.0), x, y + i * H, z));
  place(b, container(BROWN, 0.5), -0.55, y + 2 * H, -0.45);
  for (const [x, cs] of [[0.52, [t, BROWN]], [0.78, [BLUE_GREY]]]) cs.forEach((c, i) => place(b, container(c, 0.5), x, y + i * H, -0.5, -Math.PI / 2));
  place(b, handler(ORANGE), 0.42, y, 0.4, Math.PI / 2);
  // The site office.
  const ox = -0.48, oz = 0.5, ow = 0.6, od = 0.3, oh = 0.28, oy = y + 0.04, front = oz + od / 2 + 0.004;
  b.box(ow - 0.04, 0.04, od - 0.04, CONC_D, ox, y, oz).box(ow, oh, od, WHITE, ox, oy, oz).box(ow + 0.02, 0.025, od + 0.02, STEEL, ox, oy + oh, oz);
  for (const dx of [-0.18, 0.0]) b.box(0.14, 0.09, 0.012, GLASS_D, ox + dx, oy + 0.13, front);
  b.box(0.012, 0.09, 0.16, GLASS_D, ox + ow / 2 + 0.004, oy + 0.13, oz).box(0.1, 0.21, 0.012, t, ox + 0.2, oy, front);
  b.box(0.14, 0.04, 0.08, STEEL, ox + 0.2, y, front + 0.04);
  ac(b, ox - 0.1, oy + oh + 0.025, oz - 0.02, 0.8);
  flag(ctx, ox - 0.26, oy + oh + 0.025, oz - 0.1, 0.45, STEEL, [0.18, 0.3]);
  return y + 0.85;
}

// Farm: a greenhouse. A three-span glasshouse of white steel. Its back walls and the back slope of each roof span are
// glazed; the front and right walls are open frames over a low kick plate, and the sunny slopes' vents are open, so the
// tomato rows inside (extra.crops, shown once the farm is finished, shrinking as the food runs out) show through. A
// team-framed door opens onto the concrete apron, with a team-banded water tank, crates of tomatoes on a pallet and a
// team pickup loaded with more.
export function farm(ctx) {
  const { b, s, t, extra } = ctx, y = 0.03, x0 = -0.84, x1 = 0.84, z0 = -0.84, z1 = 0.46, D = z1 - z0, cz = (z0 + z1) / 2;
  const GH = 0.48, R = 0.17, sw = (x1 - x0) / 3, gy = y + GH + 0.03, len = Math.hypot(sw / 2, R), tilt = Math.atan2(R, sw / 2);
  b.box(s, y, s, GRAVEL).box(x1 - x0, 0.006, D, 0xdedcd2, 0, y, cz);
  // The frame: posts, the kick plate, transoms on the open walls, the glazed back walls and the gutters.
  const xs = [0, 1, 2, 3].map(i => x0 + i * sw), zs = [0, 1, 2, 3].map(i => z0 + i * D / 3);
  for (const x of xs) for (const z of zs) b.box(0.024, GH, 0.024, WHITE, x, y, z);
  b.box(x1 - x0, 0.07, 0.02, STEEL_L, 0, y, z1).box(0.02, 0.07, D, STEEL_L, x1, y, cz);
  for (const yy of [0.07, GH * 0.55]) b.box(x1 - x0, 0.016, 0.016, WHITE, 0, y + yy, z1).box(0.016, 0.016, D, WHITE, x1, y + yy, cz);
  b.box(x1 - x0, GH, 0.012, PANE, 0, y, z0).box(0.012, GH, D, PANE, x0, y, cz);
  for (const x of xs) b.box(0.05, 0.03, D + 0.04, WHITE, x, y + GH, cz);
  // The roof spans: the back slope glazed, the sunny one open between its glazing bars; the ridge; the gable ends,
  // glazed at the back and framed at the front.
  for (let i = 0; i < 3; i++) {
    const cx = x0 + (i + 0.5) * sw;
    b.box(len, 0.01, D, PANE, cx - sw / 4, gy + R / 2 - 0.005, cz, 0, 0, tilt);
    for (const z of zs) b.box(len, 0.014, 0.018, WHITE, cx + sw / 4, gy + R / 2 - 0.007, z, 0, 0, -tilt);
    b.box(0.03, 0.02, D + 0.04, WHITE, cx, gy + R - 0.01, cz).roof(sw, R, 0.01, PANE, cx, gy, z0);
  }
  // The team door frame in the front wall.
  for (const k of [-1, 1]) b.box(0.03, 0.38, 0.03, t, k * 0.12, y, z1 + 0.012);
  b.box(0.27, 0.035, 0.03, t, 0, y + 0.38, z1 + 0.012);
  // The tomato rows, two to a span, in white troughs: the vines and their trusses.
  const cr = new B();
  for (let i = 0; i < 3; i++) for (const k of [-1, 1]) {
    const x = x0 + (i + 0.5) * sw + k * sw / 4;
    b.box(0.09, 0.035, D - 0.12, WHITE, x, y, cz);
    cr.box(0.07, 0.28, D - 0.16, LEAF, x, y + 0.035, cz);
    for (let j = 0; j < 7; j++) {
      const z = z0 + 0.12 + j * (D - 0.24) / 6, hy = 0.3 + ((i * 2 + j * 3 + k) % 3) * 0.025;
      cr.add(BALL, j % 2 ? LEAF_L : LEAF, x, y + hy, z, 0.06, 0.05, 0.06);
      for (const [dx, dy, dz] of [[0.04, 0.12, 0.03], [0.042, 0.2, -0.04], [-0.04, 0.16, 0]]) cr.add(OCTA, TOMATO, x + dx, y + dy, z + dz, 0.022, 0.022, 0.022);
    }
  }
  extra.crops = cr.geometry();
  // The apron: the water tank, crates of tomatoes on a pallet, the pickup.
  b.box(x1 - x0, 0.012, 0.36, CONC_L, 0, y, 0.68);
  b.cylT(0.13, 0.13, 0.36, WHITE, -0.66, y, 0.68, 12).cylT(0.135, 0.135, 0.05, t, -0.66, y + 0.24, 0.68, 12).cone(0.135, 0.05, WHITE, -0.66, y + 0.36, 0.68, 12);
  b.box(0.26, 0.03, 0.2, C.wood, -0.26, y, 0.7);
  for (const [dx, dz, yy] of [[-0.06, -0.045, 0], [0.06, -0.045, 0], [-0.06, 0.045, 0], [0.06, 0.045, 0], [0, 0, 0.07]]) {
    b.box(0.11, 0.07, 0.08, CRATE, -0.26 + dx, y + 0.03 + yy, 0.7 + dz).box(0.1, 0.012, 0.07, TOMATO, -0.26 + dx, y + 0.09 + yy, 0.7 + dz);
  }
  place(b, pickup(t), 0.42, y, 0.7);
  return gy + R + 0.01;
}

// The radar built at the origin for a spinner turning about y: a turntable and yoke carrying a white dish that looks
// out along +x, tipped up, with its feed horn on struts, a team hub on its back and a counterweight.
const radar = t => {
  const g = new B(), tilt = 0.4, ax = [Math.cos(tilt), Math.sin(tilt)], up = [-Math.sin(tilt), Math.cos(tilt)], c = [0.0, 0.36], hh = 0.1;
  const on = (u, v = 0, z = 0) => [c[0] + ax[0] * u + up[0] * v, c[1] + ax[1] * u + up[1] * v, z], rz = -(Math.PI / 2 - tilt);
  g.add(CYL8, STEEL_D, 0, 0.03, 0, 0.09, 0.06, 0.09).box(0.05, 0.22, 0.12, STEEL, -0.04, 0.06, 0);
  g.add(DISH, WHITE, ...on(0), 0.3, hh, 0.3, 0, 0, rz).add(DISC, 0xdfe3e6, ...on(hh / 2 + 0.003), 0.27, 0.006, 0.27, 0, 0, rz);
  g.add(CYL8, t, ...on(-hh / 2 - 0.03), 0.1, 0.06, 0.1, 0, 0, rz).box(0.08, 0.08, 0.1, STEEL_D, -0.16, 0.26, 0);
  const feed = on(0.3);
  stick(g, 0.012, STEEL, on(hh / 2), feed, CYL6);
  for (const [v, z] of [[0.26, 0], [-0.26, 0], [0, 0.26], [0, -0.26]]) stick(g, 0.005, STEEL, on(hh / 2, v, z), feed, CYL6);
  g.box(0.05, 0.05, 0.05, STEEL_D, feed[0], feed[1] - 0.025, 0, 0, 0, rz);
  return g.geometry();
};

// Barracks: an army base with a radar dish. Behind a chain-link fence, a two-storey barrack block of sand-coloured
// concrete with ribbon windows, a team band under its parapet, a canopied team door and air-con units on its flat roof.
// A steel lattice tower in the back corner carries the radar: its dish (an animated spinner) sweeps round on the
// equipment cabin. At the gate, a guard booth and a team-striped boom barrier between jersey barriers; olive jeeps and
// a truck are parked by the block, and the flag flies over the asphalt parade square.
export function barracks(ctx) {
  const { b, mast, s, h, t, td, extra } = ctx, y = 0.03;
  b.box(s, y, s, 0x9b9478);
  // The barrack block: plinth, walls, ribbon windows (split round the door), the team band, coping and roof.
  const x0 = -1.32, x1 = 0.42, z0 = -1.32, z1 = -0.64, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, BH = 0.78, fy = y + 0.05, top = fy + BH;
  b.box(W + 0.04, 0.05, D + 0.04, CONC_D, cx, y, cz).box(W, BH, D, SAND, cx, fy, cz);
  const dx = cx - 0.3, gap = [dx - 0.17, dx + 0.17];
  for (const [a, c] of [[x0 + 0.08, gap[0]], [gap[1], x1 - 0.08]]) curtain(b, (a + c) / 2, z1, 0, c - a, fy + 0.14, 0.14, 1, 0.16, GLASS_D, SAND_D);
  curtain(b, cx, z1, 0, W - 0.16, fy + 0.48, 0.14, 1, 0.16, GLASS_D, SAND_D);
  for (const wy of [0.14, 0.48]) curtain(b, x1, cz, Math.PI / 2, D - 0.16, fy + wy, 0.14, 1, 0.16, GLASS_D, SAND_D);
  b.box(W + 0.02, 0.07, D + 0.02, t, cx, top - 0.14, cz).box(W + 0.04, 0.06, D + 0.04, SAND_D, cx, top - 0.06, cz).box(W - 0.06, 0.006, D - 0.06, ROOF, cx, top, cz);
  b.box(0.2, 0.3, 0.012, td, dx, fy, z1 + 0.006).box(0.42, 0.03, 0.22, CONC, dx, fy + 0.38, z1 + 0.11);
  for (const k of [-1, 1]) b.box(0.02, 0.38, 0.02, STEEL, dx + k * 0.19, fy, z1 + 0.2);
  for (const [ax, az] of [[cx - 0.55, cz], [cx + 0.05, cz - 0.1], [cx + 0.55, cz + 0.05]]) ac(b, ax, top, az);
  mast.cyl(0.01, 0.42, STEEL, x0 + 0.15, top, z0 + 0.15).cyl(0.008, 0.3, STEEL, x0 + 0.3, top, z0 + 0.12);
  // The radar tower: tapering lattice legs, X-braced, a railed platform, the equipment cabin and the radar on it.
  const rx = 0.95, rz = -0.92, RH = 1.55, ry0 = y + 0.06, leg = (kx, kz, f) => { const w = 0.2 - 0.08 * f; return [rx + kx * w, ry0 + RH * f, rz + kz * w]; };
  b.box(0.52, 0.06, 0.52, CONC, rx, y, rz);
  for (const [kx, kz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) stick(b, 0.018, STEEL_D, leg(kx, kz, 0), leg(kx, kz, 1), unit.box);
  for (let i = 0; i < 4; i++) {
    const f0 = i / 4, f1 = (i + 1) / 4;
    for (const [p, q] of [[[-1, 1], [1, 1]], [[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]]]) {
      stick(b, 0.007, STEEL, leg(...p, f0), leg(...q, f1), unit.box); stick(b, 0.007, STEEL, leg(...q, f0), leg(...p, f1), unit.box);
      stick(b, 0.007, STEEL, leg(...p, f1), leg(...q, f1), unit.box);
    }
  }
  const py = ry0 + RH;
  b.box(0.42, 0.04, 0.42, STEEL_D, rx, py, rz).box(0.42, 0.012, 0.012, STEEL_L, rx, py + 0.15, rz + 0.2).box(0.012, 0.012, 0.42, STEEL_L, rx + 0.2, py + 0.15, rz);
  for (const [kx, kz] of [[1, 1], [-1, 1], [1, -1]]) b.box(0.012, 0.15, 0.012, STEEL_L, rx + kx * 0.2, py, rz + kz * 0.2);
  b.box(0.26, 0.16, 0.26, WHITE, rx, py + 0.04, rz).box(0.265, 0.035, 0.265, t, rx, py + 0.13, rz);
  extra.spinners = [{ geo: radar(t), at: [rx, py + 0.2, rz], axis: 'y', speed: 1.2 }];
  // The fence and the gate: its guard booth, the boom barrier and jersey barriers.
  const e = h - 0.04;
  fence(b, [-e, e], [0.3, e], y); fence(b, [0.98, e], [e, e], y); fence(b, [e, e], [e, -e], y); fence(b, [-e, e], [-e, -0.6], y);
  const gx = 1.12, gz = 1.0;
  b.box(0.28, 0.3, 0.26, WHITE, gx, y, gz).box(0.285, 0.1, 0.265, GLASS_D, gx, y + 0.15, gz).box(0.287, 0.03, 0.267, t, gx, y + 0.08, gz).box(0.36, 0.035, 0.34, CONC, gx, y + 0.3, gz);
  b.box(0.05, 0.17, 0.05, STEEL_D, 0.93, y, 1.2);
  boom(b, t, 0.92, y + 0.13, 1.2, 6);
  for (const x of [0.2, 0.62]) b.add(FRUSTUM, CONC, x, y + 0.05, 1.05, 0.18, 0.1, 0.045);
  // The parade square and its flag; the jeeps and the truck.
  b.box(1.0, 0.006, 0.8, ASPH, 0.45, y, 0.3);
  for (const [w, d, x, z] of [[1.0, 0.02, 0.45, -0.1], [1.0, 0.02, 0.45, 0.7], [0.02, 0.8, -0.05, 0.3], [0.02, 0.8, 0.95, 0.3]]) b.box(w, 0.007, d, LINE, x, y, z);
  flag(ctx, 0.45, y, 0.3, 1.1, STEEL, [0.26, 0.46]);
  for (const x of [-1.05, -0.73]) place(b, jeep(t), x, y, -0.2, -Math.PI / 2);
  place(b, truck(OLIVE, OLIVE_D, { mark: t }), -0.85, y, 0.55);
  return py + 0.2;
}

// Archery Range: a concrete range with booths. A covered firing line of concrete across the front: a low back wall,
// its flat roof with a team fascia, and booths divided by team-coloured partitions, a bench in each; the glazed
// range-control cabin on the roof flies the flag. Six mown lanes run downrange between low concrete lane walls with
// distance boards, inside concrete side walls, to a concrete target trench: behind it stand the silhouette targets with
// team rings, before a grassed earth berm and the concrete backstop.
export function archery_range(ctx) {
  const { b, mast, s, t } = ctx, y = 0.03, lanes = [-1.05, -0.63, -0.21, 0.21, 0.63, 1.05];
  b.box(s, y, s, GRASS);
  lanes.forEach((x, i) => b.box(0.42, 0.005, 1.56, i % 2 ? GRASS : 0x7d9a52, x, y, 0.14));
  for (let i = 1; i < 6; i++) {
    const x = -1.26 + i * 0.42;
    b.box(0.035, 0.1, 1.5, CONC, x, y, 0.15);
    for (const z of [0.4, -0.12]) b.box(0.06, 0.1, 0.08, WHITE, x, y + 0.1, z).box(0.062, 0.04, 0.03, DARK, x, y + 0.13, z);
  }
  for (const k of [-1, 1]) b.box(0.07, 0.26, 2.24, CONC_D, k * 1.33, y, -0.2);
  // The target trench, the targets behind it, the berm and the backstop.
  b.box(2.6, 0.13, 0.07, CONC, 0, y, -0.64);
  for (const x of lanes) {
    for (const k of [-1, 1]) b.box(0.016, 0.44, 0.016, STEEL_D, x + k * 0.14, y, -0.76);
    b.box(0.26, 0.32, 0.014, WHITE, x, y + 0.14, -0.745).box(0.06, 0.06, 0.006, DARK, x, y + 0.38, -0.735).box(0.16, 0.17, 0.006, DARK, x, y + 0.2, -0.735);
    b.add(DISC, t, x, y + 0.29, -0.729, 0.05, 0.006, 0.05, Math.PI / 2, 0, 0).add(DISC, WHITE, x, y + 0.29, -0.724, 0.02, 0.006, 0.02, Math.PI / 2, 0, 0);
  }
  b.roof(0.5, 0.48, 2.6, GRASS_D, 0, y, -1.04, Math.PI / 2).box(2.72, 0.5, 0.06, CONC, 0, y, -1.32);
  // The firing line: floor, back wall, end walls, columns, the team partitions and benches, the roof and fascia.
  const fz0 = 0.92, fz1 = 1.34, fcz = (fz0 + fz1) / 2, fy = y + 0.05, RY = y + 0.56, rz = fcz - 0.03;
  b.box(2.76, 0.05, fz1 - fz0, CONC_L, 0, y, fcz).box(2.76, 0.24, 0.07, CONC_D, 0, fy, fz1 - 0.035);
  for (const k of [-1, 1]) b.box(0.06, RY - fy, fz1 - fz0, CONC_D, k * 1.35, fy, fcz);
  for (let i = 0; i <= 6; i++) {
    const x = -1.26 + i * 0.42;
    b.box(0.07, RY - fy, 0.07, CONC, x, fy, fz0 + 0.035);
    if (i > 0 && i < 6) b.box(0.03, 0.42, 0.34, t, x, fy, fcz + 0.02);
  }
  for (const x of lanes) b.box(0.03, 0.2, 0.03, STEEL_D, x, fy, fz0 + 0.1).box(0.24, 0.03, 0.1, WHITE, x, fy + 0.2, fz0 + 0.1);
  b.box(2.8, 0.06, 0.52, CONC, 0, RY, rz).box(2.8, 0.05, 0.015, t, 0, RY + 0.005, rz + 0.268).box(0.015, 0.05, 0.52, t, 1.408, RY + 0.005, rz);
  // The range-control cabin on the roof.
  const kx = -0.85, ky = RY + 0.06;
  b.box(0.56, 0.24, 0.34, CONC_L, kx, ky, rz);
  curtain(b, kx, rz + 0.17, 0, 0.5, ky + 0.07, 0.13, 1, 0.14, GLASS_D, WHITE);
  curtain(b, kx + 0.28, rz, Math.PI / 2, 0.28, ky + 0.07, 0.13, 1, 0.14, GLASS_D, WHITE);
  b.box(0.62, 0.03, 0.4, WHITE, kx, ky + 0.24, rz);
  ac(b, kx - 0.14, ky + 0.27, rz - 0.04, 0.8);
  mast.cyl(0.008, 0.36, STEEL, kx - 0.22, ky + 0.27, rz - 0.12);
  flag(ctx, kx + 0.22, ky + 0.27, rz - 0.1, 0.45, STEEL, [0.18, 0.3]);
  return ky + 0.37;
}

// Stable: a motor-pool garage. A long steel shed clad in ribbed olive-grey sheeting under a low metal roof with ridge
// vents, four roller-door bays across its front, numbered in yellow: two shut in team colour, two open with a jeep
// and a truck nosing out. The asphalt yard has parking lines, another jeep and a truck, a fuel point with a
// team-trimmed canopy and pump, a team-banded fuel tank on saddles, oil drums and the flag.
const CLAD = 0xa7ab9a, ROOF_M = 0x6f7a80;
export function stable(ctx) {
  const { b, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, ASPH);
  const x0 = -1.32, x1 = 1.0, z0 = -1.32, z1 = -0.42, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, WH = 0.7, top = y + WH, RH = 0.16;
  b.box(W, WH, D, CLAD, cx, y, cz).roof(D + 0.08, RH, W + 0.08, ROOF_M, cx, top, cz, Math.PI / 2);
  for (let x = x0 + 0.05; x < x1; x += 0.09) b.box(0.03, WH, 0.01, CLAD, x, y, z1 + 0.006);
  for (let z = z0 + 0.05; z < z1; z += 0.09) b.box(0.01, WH, 0.03, CLAD, x1 + 0.006, y, z);
  for (let i = 0; i < 3; i++) b.box(0.12, 0.05, 0.08, STEEL, cx - 0.7 + i * 0.7, top + RH - 0.02, cz);
  // The bays: frames, team roller doors (two open, a vehicle in each), the bay numbers.
  for (const [i, dx] of [-0.84, -0.28, 0.28, 0.84].entries()) {
    const x = cx + dx;
    b.box(0.5, 0.56, 0.02, STEEL_D, x, y, z1 + 0.016).box(0.08 + i * 0.03, 0.05, 0.008, YELLOW, x, y + 0.6, z1 + 0.014);
    if (i % 2) b.box(0.42, 0.5, 0.012, DARK, x, y, z1 + 0.03).box(0.44, 0.07, 0.03, t, x, y + 0.45, z1 + 0.04);
    else {
      b.box(0.42, 0.5, 0.012, t, x, y, z1 + 0.03);
      for (let k = 1; k < 7; k++) b.box(0.42, 0.008, 0.016, shade(t, 0.75), x, y + k * 0.07, z1 + 0.032);
    }
  }
  place(b, jeep(t), cx - 0.28, y, z1 - 0.05, -Math.PI / 2);
  place(b, truck(OLIVE, OLIVE_D, { mark: t }), cx + 0.84, y, z1 - 0.12, -Math.PI / 2);
  // The +x end: a team personnel door and a window.
  b.box(0.012, 0.3, 0.12, td, x1 + 0.012, y, cz + 0.22).box(0.012, 0.12, 0.25, GLASS_D, x1 + 0.012, y + 0.38, cz - 0.12);
  // The yard: parking lines, the parked jeep and truck, the fuel point and tank, the drums and the flag.
  for (const x of [-1.28, -0.72, -0.16, 0.4, 0.96]) b.box(0.02, 0.004, 0.55, YELLOW, x, y, 0.0);
  place(b, jeep(t), cx - 0.84, y, 0.02, -Math.PI / 2);
  place(b, truck(OLIVE, OLIVE_D, { mark: t }), -0.42, y, 0.82);
  const fx = 0.95, fz = 0.9;
  b.box(0.4, 0.05, 0.2, CONC, fx, y, fz).box(0.08, 0.2, 0.06, WHITE, fx, y + 0.05, fz).box(0.082, 0.04, 0.062, t, fx, y + 0.17, fz);
  for (const k of [-1, 1]) b.box(0.03, 0.4, 0.03, STEEL, fx + k * 0.17, y + 0.05, fz);
  b.box(0.52, 0.03, 0.36, t, fx, y + 0.42, fz).box(0.5, 0.03, 0.34, WHITE, fx, y + 0.45, fz);
  b.add(unit.cyl, WHITE, 1.15, y + 0.15, 0.32, 0.1, 0.42, 0.1, Math.PI / 2, 0, 0).add(unit.cyl, t, 1.15, y + 0.15, 0.32, 0.102, 0.06, 0.102, Math.PI / 2, 0, 0);
  for (const k of [-1, 1]) b.box(0.18, 0.07, 0.04, STEEL_D, 1.15, y, 0.32 + k * 0.13);
  for (const [x, z, c] of [[-1.2, 1.12, OLIVE], [-1.08, 1.15, STEEL_D], [-1.15, 1.25, OLIVE], [-1.24, 1.24, YELLOW]]) b.add(CYL8, c, x, y + 0.075, z, 0.05, 0.15, 0.05);
  flag(ctx, -1.28, y, 0.5, 0.95, STEEL);
  return top + RH + 0.03;
}

// Market: a supermarket with a lit sign. A broad white store with a team band under its coping and air-con units on its
// flat roof. Its glazed entrance block stands proud of the front under a canopy with a team fascia, carrying the lit
// sign: glowing letters and the team logo on a dark board. Shop windows with bright posters run either side, and a lit
// brand disc marks the +x end. In the car park, painted bays with parked cars, a trolley bay of team-handled trolleys,
// lamp posts and the tall lit pylon sign at the corner.
const STORE = 0xe4e2dc;
export function market(ctx) {
  const { b, mast, s, t } = ctx, y = 0.03;
  b.box(s, y, s, ASPH);
  const x0 = -1.32, x1 = 1.32, z0 = -1.32, z1 = -0.45, W = x1 - x0, D = z1 - z0, cz = (z0 + z1) / 2, SH = 0.7, top = y + SH;
  b.box(W, SH, D, STORE, 0, y, cz).box(W + 0.01, 0.07, D + 0.01, STEEL, 0, y, cz).box(W + 0.02, 0.06, D + 0.02, t, 0, top - 0.13, cz);
  b.box(W + 0.04, 0.05, D + 0.04, WHITE, 0, top - 0.05, cz).box(W - 0.06, 0.006, D - 0.06, ROOF, 0, top, cz);
  for (const [x, z] of [[-0.9, -0.85], [-0.3, -1.0], [0.5, -0.8], [0.95, -1.05]]) ac(b, x, top, z);
  b.box(W, 0.02, 0.26, CONC_L, 0, y, z1 + 0.13);
  // Shop windows and their posters.
  for (const k of [-1, 1]) {
    curtain(b, k * 0.88, z1, 0, 0.8, y + 0.08, 0.36, 1, 0.2, GLASS, STEEL_L);
    for (let j = 0; j < 4; j++) b.box(0.12, 0.16, 0.006, [YELLOW, TOMATO, CRATE][(j + (k > 0 ? 1 : 0)) % 3], k * 0.88 - 0.3 + j * 0.2, y + 0.16, z1 + 0.016);
  }
  // The entrance block: glass front and doors, the canopy, the lit sign.
  const ez = z1 + 0.08, PH = 1.0;
  b.box(0.88, PH, 0.2, WHITE, 0, y, z1 - 0.02);
  curtain(b, 0, ez, 0, 0.76, y + 0.02, 0.62, 2, 0.19, GLASS, WHITE);
  b.box(0.3, 0.3, 0.01, GLASS_D, 0, y + 0.02, ez + 0.024);
  b.box(1.0, 0.04, 0.4, WHITE, 0, y + 0.66, ez + 0.2).box(1.02, 0.03, 0.015, t, 0, y + 0.665, ez + 0.4);
  for (const k of [-1, 1]) b.box(0.025, 0.66, 0.025, STEEL, k * 0.46, y, ez + 0.37);
  // The sign: glowing letters on a dark board beside the team logo, a team underline.
  b.box(0.84, 0.24, 0.04, DARK, 0, y + 0.73, ez + 0.02).box(0.17, 0.17, 0.012, t, -0.31, y + 0.765, ez + 0.046).box(0.09, 0.09, 0.008, LIT, -0.31, y + 0.805, ez + 0.054);
  for (const [x, w] of [[-0.15, 0.07], [-0.05, 0.06], [0.05, 0.08], [0.15, 0.06], [0.25, 0.07]]) b.box(w, 0.11, 0.012, LIT, x, y + 0.8, ez + 0.046);
  b.box(0.48, 0.02, 0.012, t, 0.05, y + 0.77, ez + 0.046);
  b.add(DISC, t, x1 + 0.006, top - 0.3, cz, 0.15, 0.012, 0.15, 0, 0, Math.PI / 2).add(DISC, LIT, x1 + 0.012, top - 0.3, cz, 0.1, 0.012, 0.1, 0, 0, Math.PI / 2);
  // The car park: bays, cars, the trolley bay, lamp posts.
  for (const [zc, n] of [[0.21, 9], [1.03, 8]]) for (let i = 0; i < n; i++) b.box(0.012, 0.004, 0.42, LINE, -1.2 + i * 0.3, y, zc);
  for (const [x, z, c, ry] of [[-1.05, 0.21, 0xbfc4c8, Math.PI / 2], [-0.45, 0.21, 0xe8e8e4, Math.PI / 2], [0.45, 0.21, 0x2b2f33, Math.PI / 2], [0.75, 0.21, GREEN_C, Math.PI / 2], [-0.75, 1.03, YELLOW, -Math.PI / 2], [0.15, 1.03, 0xbfc4c8, -Math.PI / 2]]) place(b, car(c), x, y, z, ry);
  const qx = -0.15, qz = 0.62;
  for (const k of [-1, 1]) b.box(0.012, 0.012, 0.42, STEEL, qx + k * 0.07, y + 0.12, qz).box(0.015, 0.12, 0.015, STEEL, qx + k * 0.07, y, qz - 0.2);
  for (let i = 0; i < 4; i++) b.box(0.1, 0.06, 0.09, STEEL_L, qx, y + 0.05, qz - 0.12 + i * 0.07).box(0.1, 0.012, 0.012, t, qx, y + 0.12, qz - 0.08 + i * 0.07);
  for (const x of [-0.6, 0.6]) mast.cyl(0.012, 0.95, STEEL_D, x, y, 0.62).box(0.2, 0.025, 0.05, STEEL_D, x, y + 0.95, 0.62);
  // The pylon sign, turned to face the camera's corner.
  const px = 1.2, pz = 1.12, pr = Math.PI / 4;
  b.box(0.16, 0.08, 0.1, CONC, px, y, pz, 0, pr).box(0.06, 0.95, 0.04, STEEL_D, px, y + 0.08, pz, 0, pr);
  b.box(0.38, 0.32, 0.08, DARK, px, y + 1.0, pz, 0, pr).box(0.32, 0.14, 0.084, LIT, px, y + 1.14, pz, 0, pr).box(0.32, 0.1, 0.084, t, px, y + 1.03, pz, 0, pr);
  return y + 1.32;
}

// Government Center: a glass government block. A broad, low block of three glazed storeys on a stone podium, its
// curtain walls ribbed by white fins, under a deep flat roof slab with a team fascia that the colonnade of slim white
// columns carries out over the front; a team emblem over the entrance and a steel-ribbed glass dome on the roof. Broad
// steps come down to the forecourt: a reflecting pool between lawns with trees, and the team flags flanking it.
const GOV_GLASS = 0x6a98ad, DOME_GLASS = 0x9cc4d4;
export function government_center(ctx) {
  const { b, mast, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, PAVE);
  for (const k of [-1, 1]) { b.box(0.8, 0.012, 0.75, LAWN, k * 0.95, y, 0.95); tree(b, k * 0.8, y, 0.85); tree(b, k * 1.12, y, 1.12, 0.85); }
  b.box(1.06, 0.04, 0.48, CONC_L, 0, y, 0.93).box(1.0, 0.01, 0.42, WATER, 0, y + 0.034, 0.93);
  // The podium and its steps.
  const pz0 = -1.3, pz1 = 0.32, py = y + 0.1;
  b.box(2.6, 0.1, pz1 - pz0, CONC_L, 0, y, (pz0 + pz1) / 2);
  for (let i = 0; i < 3; i++) b.box(1.3, 0.1 - i * 0.033, 0.1, CONC_L, 0, y, pz1 + 0.05 + i * 0.1);
  // The glass block: fins and floor slabs on the camera faces, the door and the emblem.
  const bx = 1.1, bz0 = -1.15, bz1 = 0.05, bcz = (bz0 + bz1) / 2, BH = 0.84, btop = py + BH;
  b.box(2 * bx, BH, bz1 - bz0, GOV_GLASS, 0, py, bcz);
  for (let i = 0; i <= 10; i++) if (i !== 5) b.box(0.03, BH, 0.07, WHITE, -bx + i * 0.22, py, bz1 + 0.035);
  for (let i = 0; i <= 5; i++) b.box(0.07, BH, 0.03, WHITE, bx + 0.035, py, bz0 + i * 0.24);
  for (let f = 1; f < 3; f++) b.box(2 * bx + 0.02, 0.03, 0.03, WHITE, 0, py + f * BH / 3, bz1 + 0.015).box(0.03, 0.03, bz1 - bz0, WHITE, bx + 0.015, py + f * BH / 3, bcz);
  b.box(0.36, 0.34, 0.012, td, 0, py, bz1 + 0.006).box(0.4, 0.03, 0.02, WHITE, 0, py + 0.34, bz1 + 0.01);
  b.add(DISC, C.gold, 0, py + 0.58, bz1 + 0.008, 0.13, 0.012, 0.13, Math.PI / 2, 0, 0).add(DISC, t, 0, py + 0.58, bz1 + 0.016, 0.11, 0.012, 0.11, Math.PI / 2, 0, 0);
  // The roof slab, its team fascia and the colonnade.
  b.box(2.44, 0.07, 1.5, WHITE, 0, btop, -0.5).box(2.46, 0.03, 0.012, t, 0, btop + 0.02, 0.256).box(0.012, 0.03, 1.5, t, 1.226, btop + 0.02, -0.5);
  for (let i = 0; i < 7; i++) b.cylT(0.022, 0.022, BH, WHITE, -1.05 + i * 0.35, py, 0.19, 8);
  // The glass dome on its drum: rings and ribs, the oculus.
  const dy = btop + 0.07, dz = -0.5, R = 0.44, dt = dy + 0.06;
  b.cylT(R + 0.04, R + 0.04, 0.06, WHITE, 0, dy, dz, 16).add(DOME, DOME_GLASS, 0, dt, dz, R, R, R);
  for (const f of [0.3, 0.55, 0.78]) { const a = f * Math.PI / 2, r = R * Math.cos(a) + 0.006; b.cylT(r, r, 0.014, STEEL_L, 0, dt + R * Math.sin(a) - 0.007, dz, 16); }
  for (let i = 0; i < 8; i++) b.add(RIB, STEEL_L, 0, dt, dz, R + 0.004, R + 0.004, 1, 0, i * Math.PI / 4, 0);
  b.cylT(0.08, 0.08, 0.03, STEEL_L, 0, dt + R - 0.015, dz, 12);
  ac(b, -0.85, btop + 0.07, -0.9); ac(b, 0.85, btop + 0.07, -0.95);
  // The flags: the team flag and two more poles beside the pool.
  flag(ctx, -0.68, y, 0.62, 1.0, C.iron);
  for (const [x, c] of [[0.6, td], [0.82, t]]) mast.cyl(0.012, 1.0, C.iron, x, y, 0.62).box(0.02, 0.17, 0.3, c, x, y + 0.82, 0.77);
  return dt + R + 0.02;
}

// Wonder: a skyscraper. A supertall tower of dark glass floor plates, each a little smaller and turned a little further
// than the one below, so the tower twists a quarter turn as it tapers, white slab edges banding it and team-coloured
// light strips spiralling up two corners. It rises from a glass lobby podium with a team band and an entrance canopy,
// and ends in a glass pyramid crown over a lit band; the antenna and its red light are in the mast. Round it, a paved
// plaza with lawns and trees, a fountain and the flag.
const GLASS_T = 0x3d6f93;
export function wonder(ctx) {
  const { b, mast, s, t } = ctx, y = 0.03;
  b.box(s, y, s, PAVE);
  for (const [x, z] of [[-1.35, 1.35], [1.35, -1.35], [-1.35, -1.35]]) { b.box(0.9, 0.012, 0.9, LAWN, x, y, z); tree(b, x + 0.15, y, z - 0.12); tree(b, x - 0.2, y, z + 0.18, 0.85); tree(b, x + 0.22, y, z + 0.25, 0.7); }
  b.cylT(0.32, 0.34, 0.08, CONC_L, 1.4, y, 1.4, 16).cylT(0.29, 0.29, 0.01, WATER, 1.4, y + 0.075, 1.4, 16).cone(0.05, 0.3, PANE, 1.4, y + 0.08, 1.4, 6);
  // The podium: glass lobby, team band, roof slab, the canopy.
  const PH = 0.4;
  b.box(2.0, PH, 2.0, GLASS_D, 0, y, 0).box(2.02, 0.04, 2.02, t, 0, y + PH - 0.04, 0).box(2.06, 0.05, 2.06, WHITE, 0, y + PH, 0);
  curtain(b, 0, 1.0, 0, 1.96, y, PH - 0.04, 1, 0.24, GLASS_D, WHITE); curtain(b, 1.0, 0, Math.PI / 2, 1.96, y, PH - 0.04, 1, 0.24, GLASS_D, WHITE);
  b.box(0.6, 0.03, 0.32, WHITE, 0, y + 0.3, 1.17);
  for (const k of [-1, 1]) b.box(0.025, 0.3, 0.025, STEEL, k * 0.27, y, 1.3);
  flag(ctx, 0.85, y + PH + 0.05, 0.85, 0.5, STEEL);
  // The tower: N floor plates, tapering and turning, with the team strips on two corners.
  const N = 34, ty0 = y + PH + 0.05, ty1 = 4.9, dy = (ty1 - ty0) / N, twist = Math.PI / 2, side = f => 1.26 - 0.5 * f;
  for (let i = 0; i < N; i++) {
    const a = twist * i / N, w = side(i / N), yy = ty0 + i * dy;
    b.box(w, dy - 0.022, w, GLASS_T, 0, yy, 0, 0, a).box(w + 0.035, 0.022, w + 0.035, WHITE, 0, yy + dy - 0.022, 0, 0, a);
    for (const k of [-1, 1]) { const [cx, cz] = turn([k * (w / 2 + 0.005), k * (w / 2 + 0.005)], a); b.box(0.04, dy - 0.022, 0.04, t, cx, yy, cz, 0, a); }
  }
  // The crown: the lit band and the glass pyramid; the antenna.
  const aT = twist * (N - 1) / N, wt = side((N - 1) / N), r = wt / Math.SQRT2;
  b.box(wt + 0.06, 0.06, wt + 0.06, LIT, 0, ty1, 0, 0, aT).add(CONE4, GLASS_T, 0, ty1 + 0.06 + 0.22, 0, r, 0.44, r, 0, aT + Math.PI / 4, 0);
  mast.cyl(0.03, 0.25, STEEL_L, 0, ty1 + 0.42, 0).cyl(0.014, 0.8, STEEL_L, 0, ty1 + 0.62, 0).sph(0.035, RED, 0, ty1 + 1.44, 0);
  return ty1 + 0.5;
}

// Castle: a concrete bunker complex. Concrete T-walls ring the compound, the camera sides painted with a team band, a
// team-striped boom across the gate with a checkpoint booth inside. In the middle the command bunker: a battered
// concrete mass with a blast door in team colour under yellow-and-black hazard stripes, and the command post on top,
// slit-windowed and team-banded, with antennas, a dish and the flag. Hexagonal pillboxes with guns hold three corners,
// an earth-covered magazine with a team door lies to the right, a watchtower stands in the back corner and an APC is
// parked inside the gate.
const BUNKER = 0xaeaca5;
export function castle(ctx) {
  const { b, mast, s, h, t } = ctx, y = 0.03;
  b.box(s, y, s, DIRT);
  // The T-walls.
  const e = h - 0.08, n = 13, step = 2 * e / n;
  for (let i = 0; i < n; i++) {
    const u = -e + (i + 0.5) * step;
    for (const [x, z, ry, team] of [[u, e, 0, true], [e, u, Math.PI / 2, true], [u, -e, 0, false], [-e, u, Math.PI / 2, false]]) {
      if (z === e && Math.abs(u) < 0.4) continue;
      b.box(0.27, 0.48, 0.07, CONC, x, y, z, 0, ry).box(0.27, 0.06, 0.2, CONC_D, x, y, z, 0, ry);
      if (team) b.box(0.272, 0.05, 0.074, t, x, y + 0.3, z, 0, ry);
    }
  }
  for (const k of [-1, 1]) b.box(0.12, 0.6, 0.2, CONC_D, k * 0.44, y, e);
  b.box(0.05, 0.2, 0.05, STEEL_D, 0.36, y, e - 0.06);
  boom(b, t, 0.34, y + 0.17, e - 0.06, 7, 0.1);
  b.box(0.26, 0.28, 0.22, WHITE, -0.68, y, e - 0.3).box(0.265, 0.09, 0.225, GLASS_D, -0.68, y + 0.14, e - 0.3).box(0.32, 0.03, 0.28, CONC, -0.68, y + 0.28, e - 0.3);
  // The command bunker, its blast door and hazard stripes, the command post and its roof.
  const cx = -0.3, cz = -0.35, HB = 0.55, CY = y + HB;
  b.add(FRUSTUM, BUNKER, cx, y + HB / 2, cz, 0.85, HB, 0.85);
  for (const [vx, vz] of [[0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) b.box(0.08, 0.14, 0.08, STEEL_D, cx + vx, CY - 0.04, cz + vz).box(0.11, 0.025, 0.11, CONC_D, cx + vx, CY + 0.1, cz + vz);
  b.box(0.44, 0.38, 0.32, CONC_D, cx, y, cz + 0.78).box(0.28, 0.28, 0.012, t, cx, y, cz + 0.946);
  for (let i = 0; i < 8; i++) b.box(0.055, 0.04, 0.012, i % 2 ? DARK : YELLOW, cx - 0.1925 + i * 0.055, y + 0.31, cz + 0.946);
  b.box(0.8, 0.3, 0.8, CONC_L, cx, CY, cz).box(0.81, 0.05, 0.81, t, cx, CY + 0.06, cz);
  b.box(0.6, 0.05, 0.012, DARK, cx, CY + 0.18, cz + 0.406).box(0.012, 0.05, 0.6, DARK, cx + 0.406, CY + 0.18, cz);
  const top = CY + 0.35;
  b.box(0.9, 0.05, 0.9, CONC, cx, CY + 0.3, cz);
  ac(b, cx - 0.2, top, cz + 0.2, 0.8);
  b.box(0.03, 0.12, 0.03, STEEL_D, cx + 0.2, top, cz - 0.2).cylT(0.14, 0.03, 0.05, WHITE, cx + 0.2, top + 0.1, cz - 0.2, 12, 0.5, 0, -0.5);
  mast.cyl(0.008, 0.6, STEEL, cx - 0.32, top, cz - 0.32).cyl(0.008, 0.45, STEEL, cx - 0.2, top, cz - 0.36).cyl(0.008, 0.5, STEEL, cx - 0.36, top, cz - 0.18);
  flag(ctx, cx + 0.32, top, cz + 0.32, 0.6, STEEL);
  // The pillboxes: concrete hexes under sloped caps, a firing slit in each face, and a gun out of one.
  for (const [x, z, ga] of [[1.2, 1.2, Math.PI / 6], [-1.2, 1.15, -Math.PI / 6], [1.2, -1.2, Math.PI / 2]]) {
    b.add(CYL6, CONC, x, y + 0.17, z, 0.28, 0.34, 0.28).cylT(0.19, 0.3, 0.1, CONC_D, x, y + 0.34, z, 6);
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; b.box(0.15, 0.045, 0.02, DARK, x + Math.sin(a) * 0.243, y + 0.21, z + Math.cos(a) * 0.243, 0, a); }
    stick(b, 0.018, STEEL_D, [x + Math.sin(ga) * 0.2, y + 0.232, z + Math.cos(ga) * 0.2], [x + Math.sin(ga) * 0.45, y + 0.24, z + Math.cos(ga) * 0.45], CYL6);
  }
  // The earth-covered magazine and its team door.
  b.add(HALF, GRASS_D, 0.95, y, -0.15, 0.3, 0.7, 0.3, 0, 0, Math.PI / 2).box(0.06, 0.34, 0.68, CONC, 1.3, y, -0.15).box(0.012, 0.2, 0.22, t, 1.336, y, -0.15);
  // The watchtower: legs, the cabin with its window band and team band, the roof.
  const wx = -1.3, wz = -1.3, WT = 1.15;
  for (const [kx, kz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) stick(b, 0.02, STEEL_D, [wx + kx * 0.16, y, wz + kz * 0.16], [wx + kx * 0.12, y + WT, wz + kz * 0.12], unit.box);
  for (const f of [0.35, 0.7]) b.box(0.3, 0.015, 0.015, STEEL, wx, y + WT * f, wz + 0.15).box(0.015, 0.015, 0.3, STEEL, wx + 0.15, y + WT * f, wz);
  b.box(0.34, 0.24, 0.34, CONC_L, wx, y + WT, wz).box(0.345, 0.09, 0.345, GLASS_D, wx, y + WT + 0.11, wz).box(0.347, 0.03, 0.347, t, wx, y + WT + 0.05, wz).box(0.4, 0.04, 0.4, CONC_D, wx, y + WT + 0.24, wz);
  place(b, apc(t), 0.4, y, 0.9);
  return y + WT + 0.28;
}

// Factory: a clean modern plant. A white clad production hall with a team corporate band round its top, glazed
// skylight ridges, solar panels and air-con on its flat roof and a slim white stack, team-banded, that gives off no
// smoke. A glazed two-storey office at the front carries the team logo; three loading docks run down the +x side, one
// with a white team-striped truck backed onto it; stainless process tanks with team bands are piped to the hall over a
// steel rack; cars stand by the office, and a lawn with trees and the team monument sign fronts the plant.
const CLAD_W = 0xe8e8e4;
export function factory(ctx) {
  const { b, s, t } = ctx, y = 0.03;
  b.box(s, y, s, CONC_L);
  // The hall: cladding and its panel joints, the plinth, the team band, coping and roof.
  const x0 = -1.32, x1 = 0.6, z0 = -1.32, z1 = 0.18, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, HH = 0.84, top = y + HH;
  b.box(W, HH, D, CLAD_W, cx, y, cz).box(W + 0.01, 0.06, D + 0.01, STEEL, cx, y, cz);
  for (let yy = 0.22; yy < HH - 0.25; yy += 0.18) b.box(W + 0.008, 0.008, D + 0.008, 0xc9ccca, cx, y + yy, cz);
  b.box(W + 0.014, 0.08, D + 0.014, t, cx, top - 0.18, cz).box(W + 0.03, 0.05, D + 0.03, STEEL_L, cx, top - 0.05, cz).box(W - 0.04, 0.006, D - 0.04, ROOF, cx, top, cz);
  // The roof: skylight ridges, solar panels, air-con, the stack.
  for (const z of [-1.05, -0.68, -0.31]) b.roof(0.18, 0.08, W - 0.5, PANE, cx + 0.1, top, z, Math.PI / 2);
  for (let i = 0; i < 6; i++) b.box(0.24, 0.02, 0.16, SOLAR, cx - 0.6 + i * 0.27, top + 0.03, 0.02, 0.3);
  ac(b, x1 - 0.2, top, -1.1); ac(b, x1 - 0.2, top, -0.7);
  b.cylT(0.07, 0.08, 0.75, WHITE, -1.12, top, -1.12, 10).cylT(0.085, 0.085, 0.06, t, -1.12, top + 0.55, -1.12, 10).cylT(0.075, 0.075, 0.03, STEEL, -1.12, top + 0.72, -1.12, 10);
  // The office: glazed walls, the roof slab, the logo, the door and its canopy.
  const ox0 = -1.32, ox1 = -0.4, oz0 = z1, oz1 = 0.74, ocx = (ox0 + ox1) / 2, ocz = (oz0 + oz1) / 2, OH = 0.56, otop = y + OH;
  b.box(ox1 - ox0, OH, oz1 - oz0, WHITE, ocx, y, ocz);
  curtain(b, ocx, oz1, 0, ox1 - ox0 - 0.06, y + 0.04, OH - 0.1, 2, 0.15, GLASS, WHITE);
  curtain(b, ox1, ocz, Math.PI / 2, oz1 - oz0 - 0.06, y + 0.04, OH - 0.1, 2, 0.15, GLASS, WHITE);
  b.box(ox1 - ox0 + 0.08, 0.05, oz1 - oz0 + 0.08, WHITE, ocx, otop, ocz);
  b.box(0.36, 0.16, 0.03, t, ocx + 0.15, otop + 0.05, oz1).box(0.12, 0.08, 0.008, WHITE, ocx + 0.15, otop + 0.09, oz1 + 0.018);
  b.box(0.18, 0.24, 0.01, GLASS_D, ocx - 0.2, y + 0.02, oz1 + 0.03).box(0.36, 0.025, 0.2, WHITE, ocx - 0.2, y + 0.3, oz1 + 0.1);
  // The docks and the truck at one of them.
  for (const z of [-1.05, -0.72, -0.39]) b.box(0.03, 0.4, 0.28, TYRE, x1 + 0.015, y + 0.06, z).box(0.012, 0.32, 0.22, STEEL_D, x1 + 0.034, y + 0.08, z).box(0.1, 0.06, 0.3, CONC_D, x1 + 0.05, y, z);
  b.box(0.76, 0.006, 1.0, ASPH, 1.01, y, -0.72);
  place(b, truck(t, WHITE, { stripe: t, len: 0.52 }), 1.02, y, -0.72);
  // The tanks on their bund, the pipe rack to the hall.
  b.box(0.75, 0.04, 0.72, CONC_D, 0.99, y, 0.78);
  for (const [x, z] of [[0.82, 0.6], [1.16, 0.6], [0.99, 0.96]]) b.cylT(0.14, 0.14, 0.62, STEEL_L, x, y + 0.04, z, 12).cylT(0.145, 0.145, 0.04, t, x, y + 0.5, z, 12).cylT(0.03, 0.14, 0.06, STEEL_L, x, y + 0.66, z, 12);
  for (const yy of [0.5, 0.56]) { stick(b, 0.02, STEEL_L, [x1, y + yy, 0.05], [0.99, y + yy, 0.05], CYL8); stick(b, 0.02, STEEL_L, [0.99, y + yy, 0.05], [0.99, y + yy, 0.85], CYL8); }
  for (const [x, z] of [[0.8, 0.05], [0.99, 0.05], [0.99, 0.32]]) b.box(0.03, 0.5, 0.03, STEEL_D, x, y, z);
  // The cars, the lawn, its trees and the monument sign.
  for (const x of [-0.18, 0.15]) place(b, car(x < 0 ? 0xbfc4c8 : 0x2b2f33), x, y, 0.48, Math.PI / 2);
  b.box(1.9, 0.012, 0.52, LAWN, -0.44, y, 1.12);
  for (const [x, z] of [[-1.15, 1.1], [-0.75, 1.2], [0.3, 1.15]]) tree(b, x, y, z);
  b.box(0.42, 0.16, 0.06, WHITE, -0.2, y, 1.08).box(0.14, 0.1, 0.008, t, -0.2, y + 0.03, 1.114);
  return top + 0.75;
}

// ---------- Modern defences ----------
// Tower: a missile turret. An eight-sided concrete emplacement with a team band and a steel door in a yellow frame
// carries a steel pedestal and turret ring; on it, between trunnion plates, an olive launcher pod of six tubes (their
// red missile noses showing) is elevated toward the field, team-marked on its side. A radar on a mast at the back
// sweeps round (a spinner), beside a whip antenna, a generator and the flag. Its shot is a missile leaving its tube on
// a tongue of flame, with the backblast behind the pod (extra.fire).
export function tower(ctx) {
  const { b, mast, t, extra } = ctx, y = 0.03, th = 0.42, ct = Math.cos(th), st = Math.sin(th);
  b.box(1.76, y, 1.76, ASPH);
  for (const [w, d, x, z] of [[1.6, 0.03, 0, 0.82], [0.03, 1.6, 0.82, 0]]) b.box(w, 0.006, d, YELLOW, x, y, z);
  // The emplacement and the pedestal.
  const et = y + 0.55;
  b.cylT(0.74, 0.8, 0.55, CONC, 0, y, 0, 8, 0, Math.PI / 8).cylT(0.78, 0.78, 0.08, t, 0, y + 0.28, 0, 8, 0, Math.PI / 8).cylT(0.76, 0.76, 0.05, CONC_L, 0, et, 0, 8, 0, Math.PI / 8);
  b.box(0.3, 0.38, 0.03, YELLOW, 0, y + 0.02, 0.735).box(0.24, 0.34, 0.03, STEEL_D, 0, y + 0.02, 0.745);
  b.cylT(0.26, 0.32, 0.62, STEEL_D, 0, et + 0.05, 0, 12).add(CYL8, STEEL, 0, et + 0.71, 0, 0.42, 0.08, 0.42);
  const ring = et + 0.75, cx = 0, cy = ring + 0.32, cz = -0.02, at = (u, v, w) => [cx + u, cy + v * ct + w * st, cz - v * st + w * ct];
  for (const k of [-1, 1]) b.box(0.06, 0.42, 0.34, STEEL_D, k * 0.37, ring - 0.02, cz).add(CYL8, STEEL, k * 0.41, cy, cz, 0.06, 0.04, 0.06, 0, 0, Math.PI / 2);
  // The launcher pod, its tubes and their missile noses, the team mark on its side.
  b.add(unit.box, OLIVE, ...at(0, 0, 0), 0.66, 0.44, 0.86, -th, 0, 0).add(unit.box, OLIVE_D, ...at(0, 0.235, 0), 0.62, 0.03, 0.8, -th, 0, 0);
  for (const u of [-0.2, 0, 0.2]) for (const v of [-0.1, 0.1]) {
    b.add(DISC, DARK, ...at(u, v, 0.432), 0.08, 0.012, 0.08, Math.PI / 2 - th, 0, 0).add(CONE4, RED, ...at(u, v, 0.43), 0.045, 0.05, 0.045, Math.PI / 2 - th, 0, 0);
  }
  b.add(unit.box, t, ...at(0.332, 0.02, 0), 0.012, 0.2, 0.5, -th, 0, 0).add(unit.box, LINE, ...at(0.333, -0.13, 0), 0.012, 0.04, 0.6, -th, 0, 0);
  // The radar mast, the antenna, a generator and the flag.
  const rx = -0.5, rz = -0.5;
  b.cylT(0.03, 0.045, 0.62, STEEL_D, rx, et + 0.05, rz, 8);
  extra.spinners = [{ geo: radar(t), at: [rx, et + 0.67, rz], axis: 'y', speed: 1.4 }];
  mast.cyl(0.008, 0.75, STEEL_L, 0.52, et + 0.05, -0.36);
  ac(b, 0.38, et + 0.05, 0.38, 1.2);
  flag(ctx, 0.56, et + 0.05, -0.56, 0.8, STEEL_L);
  // The missile away on its flame, smoke in its wake, and the backblast out of the pod's rear.
  const fire = new B(), u = 0.2, v = 0.1;
  stick(fire, 0.05, WHITE, at(u, v, 0.78), at(u, v, 1.22), CYL8); stick(fire, 0.05, RED, at(u, v, 1.22), at(u, v, 1.36), CONE4);
  for (const k of [-1, 1]) fire.add(unit.box, STEEL_D, ...at(u + k * 0.06, v, 0.82), 0.07, 0.01, 0.1, -th, 0, 0);
  stick(fire, 0.1, P.fire, at(u, v, 0.78), at(u, v, 0.32), CONE4); fire.add(BALL, HOT, ...at(u, v, 0.76), 0.07, 0.07, 0.07).add(BALL, P.ember, ...at(u, v, 0.66), 0.075, 0.075, 0.075);
  fire.add(BALL, P.smoke, ...at(u, v - 0.06, 0.46), 0.11, 0.1, 0.11);
  fire.add(BALL, P.ember, ...at(u, v, -0.47), 0.1, 0.1, 0.1).add(BALL, P.smoke, ...at(u, v + 0.02, -0.66), 0.19, 0.16, 0.19).add(BALL, 0xb4b4b4, ...at(u - 0.16, v - 0.08, -0.8), 0.15, 0.13, 0.15);
  extra.fire = { geo: fire.geometry(), at: [0, 0, 0] };
  return cy + 0.45;
}

// Wall: a concrete barrier. A blast-wall block on a broad footing, its upper part set back a little, so segments in a
// line read as separate precast units, painted with a yellow hazard band and a team band, a lighter cap and two steel
// lifting eyes on top; its footing and lower body fill the tile edge to edge, so segments in a line close up into one
// barrier.
export function wall(ctx) {
  const { b, t } = ctx, k = 0.47;
  b.box(1, 0.08, 1, CONC_D).box(1, 0.3, 1, CONC, 0, 0.08, 0).box(2 * k, 0.5, 2 * k, CONC, 0, 0.38, 0);
  b.box(2 * k + 0.008, 0.07, 2 * k + 0.008, YELLOW, 0, 0.44, 0).box(2 * k + 0.008, 0.06, 2 * k + 0.008, t, 0, 0.7, 0);
  b.box(2 * k - 0.04, 0.05, 2 * k - 0.04, CONC_L, 0, 0.88, 0);
  for (const x of [-0.22, 0.22]) b.box(0.02, 0.06, 0.02, STEEL_D, x - 0.04, 0.93, 0).box(0.02, 0.06, 0.02, STEEL_D, x + 0.04, 0.93, 0).box(0.1, 0.02, 0.02, STEEL_D, x, 0.99, 0);
  return 1.01;
}
