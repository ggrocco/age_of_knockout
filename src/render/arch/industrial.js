// Industrial Age: brick and iron, turning gears, smokestacks, a water tower, pipes. Red brick on blue-brick plinths with
// buff stone dressings, crested slate roofs, cast-iron windows, columns and lattice, glass on iron ribs, railways and
// steam, beside today's kept Factory (legacy.js). Brick works and row houses, brick grain silos with their elevator, a
// goods depot with a steam gantry crane, ploughed rows with a traction engine, a castellated armoury with a searchlight,
// a rifle range of sandbagged lanes, a horse depot on a siding, a glass-vaulted shopping arcade, a clock-tower parliament,
// an iron lattice tower and an armoured fort with gun turrets; for defence, a machine-gun nest on a brick tower and a
// breastwork of sandbags and barbed wire.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, gear, puff, stick, lerp, hash, place, horse, streak, muzzleFlash, CYL6, CYL8, DISC, BALL, CONE4, FRUSTUM, ARCH, ARCH_RING, WEDGE, HORSE_HEAD, sack, barrel } from './kit.js';

export function house(ctx) {
  const { b, extra, s, td } = ctx, W = s - 0.25, D = s - 0.35;
  b.box(W, 1.2, D, P.brick).roof(W + 0.1, 0.5, D + 0.1, 0x5d6468, 0, 1.2, 0);
  for (let r = 0; r < 2; r++) for (const x of [-0.4, 0, 0.4]) b.box(0.16, 0.26, 0.04, 0x2f3437, x, 0.25 + r * 0.5, D / 2 + 0.01).box(0.2, 0.05, 0.05, C.stone, x, 0.51 + r * 0.5, D / 2 + 0.01);
  b.box(0.22, 0.85, 0.22, P.brickD, W / 2 - 0.2, 1.2, -0.2).cyl(0.05, 0.12, C.stone, W / 2 - 0.25, 2.05, -0.2).cyl(0.05, 0.12, C.stone, W / 2 - 0.15, 2.05, -0.2);
  // Iron fire escape, a rooftop water tank, a gas street lamp and the door.
  for (let i = 0; i < 2; i++) b.box(0.4, 0.03, 0.22, P.iron, -W / 2 - 0.12, 0.45 + i * 0.45, 0.1).box(0.03, 0.45, 0.22, P.iron, -W / 2 - 0.3, 0.45 + i * 0.45, 0.1);
  for (const [x, z] of [[-0.25, -0.25], [-0.05, -0.25], [-0.25, -0.05], [-0.05, -0.05]]) b.box(0.03, 0.35, 0.03, P.iron, x, 1.55, z);
  b.cyl(0.17, 0.3, C.wood, -0.15, 1.9, -0.15).cone(0.19, 0.12, P.iron, -0.15, 2.2, -0.15, 8);
  b.cyl(0.025, 0.7, P.iron, 0.55, 0, D / 2 + 0.3).box(0.1, 0.12, 0.1, P.ember, 0.55, 0.7, D / 2 + 0.3).box(0.24, 0.42, 0.05, td, -0.25, 0, D / 2 + 0.03);
  extra.smoke = [0, 0.5].map(phase => ({ geo: puff(), at: [W / 2 - 0.2, 2.15, -0.2], phase }));
  return 2.32;
}

export function town_center(ctx) {
  const { b, extra, s, t, td } = ctx, W = s - 0.2, D = s * 0.6, z0 = -0.25, front = z0 + D / 2;
  b.box(s + 0.12, 0.1, s + 0.12, 0x5a5650).box(W, 1.1, D, P.brick, 0, 0.1, z0).box(W + 0.04, 0.08, D + 0.04, t, 0, 0.95, z0);
  // Glazed sawtooth roof.
  const L = D / 3, rise = 0.42, len = Math.hypot(L, rise), tilt = Math.atan2(rise, L);
  for (let i = 0; i < 3; i++) { const zz = z0 - D / 2 + i * L; b.box(W, 0.05, len, 0x5d6468, 0, 1.2 + rise / 2 - 0.025, zz + L / 2, -tilt).box(W - 0.04, rise, 0.04, P.glass, 0, 1.2, zz + L - 0.02); }
  // Two smokestacks at the back, iron-banded, and pipes along the front.
  const stackZ = z0 - D / 2 + 0.2;
  for (const x of [-W / 2 + 0.3, W / 2 - 0.3]) b.cyl(0.15, 2.5, P.brickD, x, 0.1, stackZ).cyl(0.18, 0.08, P.iron, x, 2.6, stackZ).cyl(0.17, 0.06, P.iron, x, 1.7, stackZ);
  b.add(unit.cyl, P.iron, 0, 0.32, front + 0.12, 0.05, W * 0.9, 0.05, 0, 0, Math.PI / 2).add(unit.cyl, P.iron, W / 2 - 0.15, 0.7, front + 0.12, 0.05, 0.9, 0.05);
  // Water tower on iron legs.
  const wx = 0.95, wz = front + 0.55;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.04, 1.0, 0.04, P.iron, wx + x * 0.2, 0, wz + z * 0.2);
  b.cyl(0.32, 0.45, 0x6b5a46, wx, 1.0, wz).cone(0.35, 0.22, P.iron, wx, 1.45, wz, 10).box(0.5, 0.03, 0.5, P.iron, wx, 0.98, wz);
  // Clock over the team-coloured door.
  b.add(unit.cyl, P.white, 0.25, 0.85, front + 0.03, 0.17, 0.03, 0.17, Math.PI / 2, 0, 0).box(0.02, 0.12, 0.02, C.dark, 0.25, 0.84, front + 0.05).box(0.09, 0.02, 0.02, C.dark, 0.28, 0.86, front + 0.05);
  b.box(0.5, 0.6, 0.05, td, 0.25, 0.1, front + 0.02);
  extra.spinners = [{ geo: gear(0.34, P.iron), at: [-0.55, 0.62, front + 0.05], axis: 'z', speed: 1.4 }, { geo: gear(0.2, P.brass), at: [-0.07, 0.38, front + 0.05], axis: 'z', speed: -2.4 }];
  extra.smoke = [0, 0.33, 0.66].map(phase => ({ geo: puff(), at: [-W / 2 + 0.3, 2.7, stackZ], phase }))
    .concat([0.15, 0.5, 0.85].map(phase => ({ geo: puff(), at: [W / 2 - 0.3, 2.7, stackZ], phase })));
  flag(ctx, -0.3, 1.62, z0, 0.7, P.iron);
  return 2.68;
}

// ---------- shared Industrial parts ----------
// The House's and Town Center's brick, slate and iron; buff sandstone for the dressings, blue engineering brick for the
// plinths, black-painted ironwork, glass for the roofs, railway sleepers and rails.
const BRICK = P.brick, BRICK_D = P.brickD, BLUE = 0x4a4c55, BUFF = 0xc8b48a, BUFF_D = 0xa8956c;
const SLATE = 0x5d6468, SLATE_D = 0x474d51, IRON = P.iron, IRON_D = 0x33373b, CORR = 0x8a9196, CORR_D = 0x737a80;
const GLASS = 0x34495a, SHOP = 0x7d9db0, ROOF_GLASS = 0x8fb6c9, ROOF_GLASS_D = 0x79a2b8, LIT = 0xffd27a, PAINT = 0x2a2f2c, GREEN = 0x2f4a3a;
const CINDER = 0x5a5650, YARD = 0x6e6a60, SETT = 0x77746c, SETT_D = 0x66635c, PAVE = 0x9d968a, GRAVEL = 0x9a917f;
const RAIL = 0x2f3236, SLEEPER = 0x4e3a28, SAND = 0xb8a172, SAND_D = 0x9c8658, STONE_L = 0xb4b1a6;
const SOIL = 0x5b4532, SOIL_D = 0x45352a, STUBBLE = 0x9c8a5a, GRASS = 0x5f7f3a, GRASS_L = 0x6f8f44, GRASS_D = 0x4f6d32, HEDGE = 0x3f5f2c;
const TURNIP = 0x4f7f2e, TURNIP_L = 0x6a9a3a, GRANITE = 0x8a8a84, GRANITE_D = 0x6c6c66, TOWER = 0x5e4a3a, TOWER_L = 0x735c48;
const CLOCK = P.white, LENS = 0xfff3c2, POT = 0x8a4a30, GUN = 0x26292c;
// A hemisphere, flat side down at y = 0; a low-poly turnip; a cheap half-ring rib for the arcade's vault and the tower's
// arches.
const DOME = new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2), TURNIP_GEO = new THREE.IcosahedronGeometry(1, 0);
const RIB = new THREE.TorusGeometry(1, 0.03, 3, 10, Math.PI), BIG_ARCH = new THREE.TorusGeometry(1, 0.05, 3, 14, Math.PI);

// A point on a wall face centred at (x, z) facing along ry (0: +z): u along the face, o out from it.
const onFace = (x, z, ry) => (u, o = 0) => [x + u * Math.cos(ry) + o * Math.sin(ry), z - u * Math.sin(ry) + o * Math.cos(ry)];
// A cast-iron window w × hh on a wall face (x, z) facing ry, its sill at y: dark panes and an iron mullion under a
// segmental arch of dark brick.
const iwin = (b, x, y, z, ry = 0, w = 0.12, hh = 0.2) => {
  const [gx, gz] = onFace(x, z, ry)(0, 0.008);
  b.box(w, hh, 0.02, GLASS, x, y, z, 0, ry).box(w + 0.03, 0.035, 0.03, BRICK_D, x, y + hh, z, 0, ry).box(0.012, hh, 0.02, IRON, gx, y, gz, 0, ry);
};
// Rows of n windows spread across a face w wide centred at (x, z) facing ry, a row at each sill height in ys.
const iwins = (b, x, z, ry, w, n, ys, ww, hh) => {
  const at = onFace(x, z, ry);
  for (const y of ys) for (let i = 0; i < n; i++) { const [px, pz] = at(-w / 2 + (i + 0.5) * w / n, 0.01); iwin(b, px, y, pz, ry, ww, hh); }
};
// A Gothic window w × hh on a wall face (x, z) facing ry, its sill at y: dark glass in a buff frame under a pointed head.
const lancet = (b, x, y, z, ry = 0, w = 0.1, hh = 0.22) => {
  const [gx, gz] = onFace(x, z, ry)(0, 0.006);
  b.box(w + 0.03, hh, 0.02, BUFF, x, y, z, 0, ry).box(w, hh - 0.02, 0.02, GLASS, gx, y + 0.01, gz, 0, ry).add(CONE4, BUFF, x, y + hh + w * 0.4, z, (w + 0.03) / 2, w * 0.8, 0.014, 0, ry, 0);
};
// A brick block w × d centred at (x, z) standing on y: a blue-brick plinth, walls hh tall in c and a buff band at the
// eaves. Returns the wall top.
const block = (b, x, z, w, d, hh, { y = 0.03, c = BRICK } = {}) => {
  b.box(w + 0.03, 0.08, d + 0.03, BLUE, x, y, z).box(w, hh, d, c, x, y + 0.08, z).box(w + 0.03, 0.04, d + 0.03, BUFF, x, y + 0.04 + hh, z);
  return y + 0.08 + hh;
};
// A slate gable roof over w (along x) × d (along z) centred at (x, z) on y, rising rh, its ridge along x (alongZ: along
// z); `crest` runs iron cresting along the ridge.
const slate = (b, x, y, z, w, d, rh, alongZ = false, crest = true) => {
  if (alongZ) b.roof(w, rh, d, SLATE, x, y, z); else b.roof(d, rh, w, SLATE, x, y, z, Math.PI / 2);
  const L = alongZ ? d : w;
  b.box(alongZ ? 0.03 : L, 0.03, alongZ ? L : 0.03, IRON_D, x, y + rh - 0.015, z);
  if (crest) for (let u = -L / 2 + 0.08; u < L / 2 - 0.04; u += 0.14) b.box(0.012, 0.05, 0.012, IRON_D, alongZ ? x : x + u, y + rh + 0.01, alongZ ? z + u : z);
};
// A square brick chimney stack hh tall standing on y, its buff cap and two pots; returns the pots' top (for smoke).
const chimney = (b, x, y, z, hh, w = 0.14) => {
  b.box(w, hh, w, BRICK_D, x, y, z).box(w + 0.04, 0.04, w + 0.04, BUFF, x, y + hh, z);
  for (const k of [-1, 1]) b.cylT(0.022, 0.028, 0.07, POT, x + k * w / 4, y + hh + 0.04, z, 6);
  return y + hh + 0.11;
};
// Smoke puffs rising from (x, y, z), one per phase.
const smoke = (extra, x, y, z, phases) => { (extra.smoke ??= []).push(...phases.map(phase => ({ geo: puff(), at: [x, y, z], phase }))); };
// A railway track from u0 to u1 along x at z = c (alongZ: along z at x = c), on y: sleepers every 0.12, two rails.
const track = (b, u0, u1, c, y = 0.03, alongZ = false) => {
  const at = (u, o) => alongZ ? [c + o, u] : [u, c + o];
  for (let u = u0 + 0.05; u < u1; u += 0.12) { const [x, z] = at(u, 0); b.box(alongZ ? 0.34 : 0.06, 0.02, alongZ ? 0.06 : 0.34, SLEEPER, x, y, z); }
  for (const o of [-0.1, 0.1]) { const [x, z] = at((u0 + u1) / 2, o); b.box(alongZ ? 0.025 : u1 - u0, 0.03, alongZ ? u1 - u0 : 0.025, RAIL, x, y + 0.01, z); }
};
// A buffer stop across the track at (x, z) facing along +x (alongZ: facing +z): two posts and a team-painted beam with
// its buffers.
const bufferStop = (b, t, x, z, y = 0.03, alongZ = false) => {
  for (const o of [-0.1, 0.1]) b.box(0.05, 0.16, 0.05, C.woodD, alongZ ? x + o : x, y, alongZ ? z : z + o);
  b.box(alongZ ? 0.38 : 0.07, 0.08, alongZ ? 0.07 : 0.38, t, x, y + 0.1, z);
  for (const o of [-0.1, 0.1]) b.add(CYL6, IRON, alongZ ? x + o : x + 0.05, y + 0.14, alongZ ? z + 0.05 : z + o, 0.022, 0.06, 0.022, alongZ ? Math.PI / 2 : 0, 0, alongZ ? 0 : Math.PI / 2);
};
// A four-wheeled railway wagon for place(), built at the origin along x standing on the rails (y = 0): an iron frame on
// cast wheels with spring buffers, its body len long in team paint; kind 'open' (sides and a plank floor), 'van' (covered
// under a curved roof) or 'horse' (a horse box, ventilated along its top, its side door let down on the -z side).
const wagon = (t, kind, len = 0.6) => {
  const g = new B(), wr = 0.065, fy = 0.13;
  for (const x of [-len * 0.3, len * 0.3]) for (const k of [-1, 1]) g.add(CYL8, IRON_D, x, wr, k * 0.1, wr, 0.03, wr, Math.PI / 2, 0, 0);
  g.box(len, 0.05, 0.26, PAINT, 0, fy - 0.05, 0);
  for (const k of [-1, 1]) for (const o of [-0.08, 0.08]) g.add(CYL6, IRON, k * (len / 2 + 0.03), fy - 0.025, o, 0.02, 0.06, 0.02, 0, 0, Math.PI / 2);
  if (kind === 'open') {
    g.box(len, 0.03, 0.28, C.woodD, 0, fy, 0);
    for (const k of [-1, 1]) g.box(len, 0.13, 0.02, t, 0, fy, k * 0.13).box(0.02, 0.13, 0.28, t, k * (len / 2 - 0.01), fy, 0).box(len + 0.01, 0.02, 0.025, PAINT, 0, fy + 0.12, k * 0.13);
    return g;
  }
  g.box(len, 0.28, 0.28, t, 0, fy, 0).add(CYL8, CORR, 0, fy + 0.28, 0, 0.05, len + 0.02, 0.15, 0, 0, Math.PI / 2);
  for (const k of [-1, 1]) g.box(len + 0.004, 0.02, 0.284, PAINT, 0, fy + (k > 0 ? 0.26 : 0), 0);
  if (kind === 'van') { for (const k of [-1, 1]) g.box(0.2, 0.22, 0.012, PAINT, 0, fy + 0.03, k * 0.142).box(0.18, 0.012, 0.014, IRON, 0, fy + 0.12, k * 0.143); }
  else { for (const k of [-1, 1]) g.box(len - 0.06, 0.05, 0.012, C.dark, 0, fy + 0.19, k * 0.142); g.box(0.2, 0.2, 0.012, C.dark, 0, fy + 0.02, -0.142); }
  return g;
};
// A gas lamp: an iron post hh tall standing on y, its lit lantern and cap.
const gasLamp = (b, x, z, hh = 0.5, y = 0.03) => {
  b.cylT(0.012, 0.022, hh, IRON_D, x, y, z, 6).box(0.06, 0.07, 0.06, LIT, x, y + hh, z).add(CONE4, IRON_D, x, y + hh + 0.095, z, 0.06, 0.05, 0.06, 0, Math.PI / 4, 0);
};
// Iron railings from p to q ([x, z]) on y: posts every 0.1 between a top and a bottom rail.
const railings = (b, [x0, z0], [x1, z1], hh = 0.22, y = 0.03) => {
  const L = Math.hypot(x1 - x0, z1 - z0), ry = Math.atan2(-(z1 - z0), x1 - x0), n = Math.max(1, Math.round(L / 0.1));
  for (let i = 0; i <= n; i++) b.box(0.014, hh, 0.014, IRON_D, x0 + (x1 - x0) * i / n, y, z0 + (z1 - z0) * i / n);
  for (const yy of [0.04, hh - 0.03]) b.box(L, 0.016, 0.016, IRON_D, (x0 + x1) / 2, y + yy, (z0 + z1) / 2, 0, ry);
};
// A brick pier standing on y, its buff cap.
const pier = (b, x, z, hh = 0.3, y = 0.03) => b.box(0.12, hh, 0.12, BRICK, x, y, z).box(0.15, 0.04, 0.15, BUFF, x, y + hh, z);
// A wooden crate w wide standing on y, turned ry, with a band of stencilled team paint (band) or none.
const crate = (b, x, y, z, w = 0.14, ry = 0, band = null) => {
  b.box(w, w * 0.8, w, C.wood, x, y, z, 0, ry).box(w + 0.006, 0.018, w + 0.006, C.woodD, x, y + w * 0.8 - 0.018, z, 0, ry);
  if (band !== null) b.box(w + 0.008, w * 0.2, w + 0.008, band, x, y + w * 0.3, z, 0, ry);
};
// Sandbags from p to q ([x, z]) on y, `courses` high, laid in bond with a little jitter.
const sandbags = (b, [x0, z0], [x1, z1], courses = 2, y = 0.03) => {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 0.15)), ry = Math.atan2(-(z1 - z0), x1 - x0);
  for (let c = 0; c < courses; c++) for (let i = 0; i < n - (c % 2); i++) {
    const f = (i + 0.5 + (c % 2) * 0.5) / n;
    b.box(L / n - 0.012, 0.052, 0.1 - c * 0.008, (i + c) % 3 ? SAND : SAND_D, x0 + (x1 - x0) * f, y + c * 0.052, z0 + (z1 - z0) * f, 0, ry + (hash(i, c) - 0.5) * 0.14);
  }
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
  // The silos and the gallery along their tops.
  const r = 0.21, sz = -0.54, y0 = y + 0.1, sh = 1.9, st = y0 + sh;
  b.box(1.32, 0.1, 0.48, BLUE, -0.23, y, sz);
  for (const x of [-0.66, -0.23, 0.2]) {
    b.cylT(r, r, sh, BRICK, x, y0, sz, 12).cylT(r + 0.012, r + 0.012, 0.12, t, x, st - 0.3, sz, 12).cylT(r + 0.025, r + 0.025, 0.05, BUFF, x, st, sz, 12);
    for (const yy of [st - 0.33, st - 0.18]) b.cylT(r + 0.016, r + 0.016, 0.03, BUFF, x, yy, sz, 12);
    for (const f of [0.2, 0.45, 0.7]) b.cylT(r + 0.008, r + 0.008, 0.022, IRON, x, y0 + sh * f, sz, 12);
  }
  const gy = st + 0.05, gw = 1.3, gcx = -0.25;
  b.box(gw, 0.2, 0.22, CORR, gcx, gy, sz);
  for (let i = 0; i < 5; i++) b.box(0.08, 0.07, 0.02, GLASS, gcx - gw / 2 + 0.14 + i * 0.26, gy + 0.08, sz + 0.111);
  slate(b, gcx, gy + 0.2, sz, gw + 0.04, 0.3, 0.1, false, false);
  // An iron ladder up the front silo.
  for (const k of [-1, 1]) b.box(0.012, sh - 0.1, 0.012, IRON_D, -0.23 + k * 0.05, y0, sz + r + 0.02);
  for (let i = 0; i < 12; i++) b.box(0.1, 0.01, 0.01, IRON_D, -0.23, y0 + 0.1 + i * 0.15, sz + r + 0.02);
  // The head house: string courses, windows, the team board and door, the leg, the spout and the flag.
  const hx = 0.67, hz = -0.5, hw = 0.38, hd = 0.56, fz = hz + hd / 2, top = block(b, hx, hz, hw, hd, 2.42, { y });
  for (const yy of [0.95, 1.75]) b.box(hw + 0.02, 0.03, hd + 0.02, BUFF, hx, yy, hz);
  slate(b, hx, top, hz, hw + 0.08, hd + 0.08, 0.26, true);
  for (const yy of [1.1, 1.85]) iwin(b, 0.58, yy, fz + 0.01, 0, 0.11, 0.2);
  iwins(b, hx + hw / 2, hz, Math.PI / 2, hd, 2, [0.42, 1.1, 1.85], 0.11, 0.2);
  b.box(0.32, 0.13, 0.02, BUFF, hx, 2.2, fz + 0.01).box(0.28, 0.09, 0.02, t, hx, 2.22, fz + 0.018);
  b.box(0.16, 0.32, 0.02, td, 0.57, y + 0.08, fz + 0.01).box(0.2, 0.03, 0.03, BUFF, 0.57, y + 0.4, fz + 0.015);
  b.box(0.16, 0.12, 0.16, IRON_D, 0.79, y, fz + 0.06).box(0.09, 2.2, 0.09, IRON, 0.79, y + 0.12, fz + 0.05).box(0.13, 0.12, 0.14, IRON_D, 0.79, y + 2.3, fz + 0.04);
  stick(b, 0.026, IRON, [0.6, 1.32, fz + 0.02], [0.44, 0.58, 0.42], CYL6);
  flag(ctx, hx, top + 0.24, hz - 0.12, 0.45, IRON);
  // The siding and the grain van under the spout.
  track(b, -h, h, 0.46, y);
  place(b, wagon(t, 'van', 0.62), 0.42, y + 0.02, 0.46);
  // The weigh-house and weighbridge, sacks, a lamp.
  const wt = block(b, -0.58, -0.02, 0.4, 0.3, 0.34, { y });
  slate(b, -0.58, wt, -0.02, 0.46, 0.38, 0.14, false, false);
  b.box(0.12, 0.24, 0.02, td, -0.68, y + 0.08, 0.135);
  iwin(b, -0.48, y + 0.18, 0.135, 0, 0.1, 0.13); iwin(b, -0.37, y + 0.18, -0.02, Math.PI / 2, 0.1, 0.13);
  chimney(b, -0.72, wt - 0.02, -0.02, 0.2, 0.08);
  b.box(0.36, 0.012, 0.26, IRON_D, -0.1, y, 0.03).box(0.32, 0.014, 0.22, IRON, -0.1, y, 0.03);
  for (const [x, z, yy] of [[0.36, -0.06, 0], [0.48, -0.1, 0], [0.42, 0.04, 0], [0.42, -0.04, 0.1]]) sack(b, x, y + yy, z, 0.06);
  b.box(0.36, 0.04, 0.24, C.wood, -0.48, y, 0.74);
  for (const [dx, dz, dy] of [[-0.09, -0.06, 0], [0.09, -0.06, 0], [-0.09, 0.06, 0], [0.09, 0.06, 0], [0, 0, 0.11]]) sack(b, -0.48 + dx, y + 0.04 + dy, 0.74 + dz, 0.065);
  gasLamp(b, 0.05, 0.74, 0.5);
  return top + 0.26;
}

// The steam crane on top of the gantry, built at the origin for a spinner turning about y (its jib along +x): the
// turntable, the team-painted machinery house with its boiler pipe, the counterweight, a laced lattice jib on its stays
// and the hook lifting a team-banded crate (slung high, so it clears the goods shed's roof as the crane slews).
const steamCrane = t => {
  const g = new B();
  g.cylT(0.15, 0.15, 0.03, IRON, 0, 0, 0, 12);
  g.box(0.26, 0.2, 0.22, t, -0.05, 0.03, 0).box(0.3, 0.025, 0.26, SLATE_D, -0.05, 0.23, 0).box(0.08, 0.16, 0.24, IRON_D, -0.22, 0.03, 0);
  for (const k of [-1, 1]) g.box(0.08, 0.07, 0.012, GLASS, -0.02, 0.11, k * 0.111);
  g.cylT(0.018, 0.018, 0.14, PAINT, -0.12, 0.255, 0.06, 6).cylT(0.026, 0.02, 0.03, P.brass, -0.12, 0.39, 0.06, 6);
  // The jib: two lower chords and an upper one meeting at the head, laced on both sloping faces.
  const head = [0.56, 0.62, 0], lo = k => [0.08, 0.05, k * 0.055], up = [0.02, 0.13, 0];
  for (const k of [-1, 1]) {
    stick(g, 0.028, IRON, lo(k), head, unit.box);
    for (let i = 0; i < 5; i++) stick(g, 0.012, IRON, lerp(lo(k), head, i / 5), lerp(up, head, (i + 0.5) / 5), unit.box);
  }
  stick(g, 0.024, IRON, up, head, unit.box);
  g.add(CYL8, IRON_D, head[0], head[1], 0, 0.035, 0.05, 0.035, Math.PI / 2, 0, 0);
  // The stays from the A-frame on the roof, the hoist rope and the load.
  for (const k of [-1, 1]) stick(g, 0.014, IRON_D, [-0.14, 0.24, k * 0.08], [-0.06, 0.44, 0], unit.box);
  stick(g, 0.006, IRON_D, [-0.06, 0.44, 0], head, unit.box);
  stick(g, 0.005, PAINT, [head[0], head[1] - 0.03, 0], [head[0], 0.3, 0], unit.box);
  g.box(0.03, 0.04, 0.03, IRON_D, head[0], 0.26, 0);
  for (const k of [-1, 1]) stick(g, 0.004, PAINT, [head[0], 0.26, 0], [head[0] + k * 0.05, 0.19, 0], unit.box);
  crate(g, head[0], 0.085, 0, 0.13, 0.3, t);
  return g.geometry();
};

// Storage Pit: a depot with a gantry crane and a rail cart. A brick goods shed with team sliding doors under an iron
// canopy and a crested slate roof flying the flag stands at the back of a cinder yard. A siding runs down the +x side to a
// team buffer stop, with a team-painted rail cart of dressed stone at its front. At the back of the siding an iron gantry
// straddles the track on its bogies and rails, and on top of it a steam crane (an animated spinner) slews round: its
// team-painted machinery house with a boiler pipe, its counterweight and a lattice jib swinging a crate on its hook. Sawn
// timber, dressed stone, a strongbox of gold ingots and barrels lie in the yard, with a gas lamp.
export function storage_pit(ctx) {
  const { b, s, h, t, extra } = ctx, y = 0.03;
  b.box(s, y, s, CINDER);
  // The goods shed: doors, canopy on brackets, the loading dock, a window and the flag.
  const cx = -0.42, cz = -0.66, W = 0.92, D = 0.42, z1 = cz + D / 2, x1 = cx + W / 2, top = block(b, cx, cz, W, D, 0.52, { y });
  slate(b, cx, top, cz, W + 0.08, D + 0.12, 0.26);
  for (const dx of [-0.2, 0.2]) b.box(0.3, 0.36, 0.02, t, cx + dx, y + 0.08, z1 + 0.01).box(0.012, 0.36, 0.024, IRON_D, cx + dx, y + 0.08, z1 + 0.013).box(0.36, 0.02, 0.03, IRON_D, cx + dx, y + 0.45, z1 + 0.02);
  b.box(W - 0.08, 0.025, 0.2, SLATE_D, cx, y + 0.5, z1 + 0.1);
  for (const dx of [-0.4, 0, 0.38]) stick(b, 0.014, IRON_D, [cx + dx, y + 0.32, z1 + 0.01], [cx + dx, y + 0.5, z1 + 0.18], unit.box);
  b.box(W, 0.1, 0.12, BLUE, cx, y, z1 + 0.06).box(W, 0.015, 0.13, BUFF, cx, y + 0.1, z1 + 0.065);
  iwin(b, x1 + 0.01, y + 0.24, cz, Math.PI / 2, 0.14, 0.2);
  flag(ctx, cx - 0.32, top + 0.24, cz, 0.42, IRON);
  // The siding down the +x side, its buffer stop and the rail cart of stone.
  const tx = 0.45;
  track(b, -h + 0.06, h, tx, y, true); bufferStop(b, t, tx, -h + 0.07, y, true);
  place(b, wagon(t, 'open', 0.5), tx, y + 0.02, 0.44, Math.PI / 2);
  for (const [x, z, w, ry] of [[tx - 0.04, 0.33, 0.15, 0.1], [tx + 0.03, 0.55, 0.14, -0.1]]) b.box(w * 0.75, 0.09, w, STONE_L, x, 0.21, z, 0, ry);
  b.box(0.1, 0.08, 0.12, C.stone, tx, 0.21, 0.44, 0, 0.3).box(0.09, 0.07, 0.12, STONE_L, tx - 0.01, 0.29, 0.43, 0, -0.2);
  // The gantry at the back of the siding: crane rails each side of it, a portal frame on bogies, the deck and the
  // turntable base.
  const gz = -0.3, gh = 0.72;
  for (const k of [-1, 1]) {
    const x = tx + k * 0.27;
    b.box(0.03, 0.02, 0.9, RAIL, x, y, -h + 0.45).box(0.08, 0.06, 0.5, IRON_D, x, y + 0.02, gz);
    for (const dz of [-0.2, 0.2]) stick(b, 0.06, IRON, [x, y + 0.08, gz + dz], [x, gh, gz + dz * 0.8], unit.box);
    for (const [p, q] of [[[x, y + 0.1, gz - 0.2], [x, gh - 0.1, gz + 0.17]], [[x, y + 0.1, gz + 0.2], [x, gh - 0.1, gz - 0.17]]]) stick(b, 0.02, IRON, p, q, unit.box);
    b.box(0.07, 0.07, 0.44, IRON, x, gh, gz);
  }
  for (const dz of [-0.17, 0.17]) b.box(0.62, 0.07, 0.07, IRON, tx, gh, gz + dz);
  b.box(0.5, 0.03, 0.36, IRON_D, tx, gh + 0.07, gz).cylT(0.15, 0.17, 0.04, IRON_D, tx, gh + 0.1, gz, 12);
  extra.spinners = [{ geo: steamCrane(t), at: [tx, gh + 0.14, gz], axis: 'y', speed: 0.45 }];
  // The goods: sawn timber on bearers, dressed stone, the strongbox of gold ingots, barrels and a lamp.
  for (let l = 0; l < 3; l++) for (let i = 0; i < 4 - (l === 2); i++) b.box(0.5, 0.035, 0.07, (i + l) % 2 ? C.wood : 0x8a6238, -0.52, y + 0.03 + l * 0.036, -0.1 + i * 0.075 + (l === 2) * 0.04);
  for (const x of [-0.7, -0.34]) b.box(0.04, 0.03, 0.32, C.woodD, x, y, 0.01);
  for (const [x, z, ry] of [[-0.02, 0.06, 0.2], [-0.02, 0.26, -0.3]]) b.box(0.17, 0.12, 0.13, STONE_L, x, y, z, 0, ry);
  b.box(0.15, 0.1, 0.12, C.stone, -0.02, y + 0.12, 0.14, 0, 0.1);
  const bx = -0.6, bz = 0.62;
  b.box(0.22, 0.12, 0.14, C.woodD, bx, y, bz).box(0.23, 0.025, 0.15, IRON, bx, y + 0.12, bz).box(0.025, 0.13, 0.15, IRON, bx - 0.07, y, bz).box(0.025, 0.13, 0.15, IRON, bx + 0.07, y, bz);
  for (const [dx, dz, dy] of [[-0.04, -0.03, 0], [0.04, -0.03, 0], [0, 0.03, 0], [0, 0, 0.025]]) b.box(0.07, 0.025, 0.035, C.gold, bx + dx, y + 0.145 + dy, bz + dz, 0, 0.2);
  barrel(b, -0.28, y, 0.66); barrel(b, -0.16, y, 0.74, 0.065); barrel(b, -0.22, y, 0.54, 0.065);
  gasLamp(b, 0.08, 0.72, 0.5);
  return top + 0.26;
}

// A steam traction engine for place(), built at the origin facing +x: a team-painted boiler with brass bands, the smoke
// box and tall chimney forward, big iron wheels with team centres, the cylinder and flywheel on top, the firebox and a
// team-dark tender at the back and a canopy over all on four posts.
const tractionEngine = (t, td) => {
  const g = new B();
  const wheel = (x, z, r, w) => {
    const k = Math.sign(z);
    g.add(DISC, IRON_D, x, r, z, r, w, r, Math.PI / 2, 0, 0).add(DISC, t, x, r, z + k * (w / 2 + 0.002), r * 0.72, 0.006, r * 0.72, Math.PI / 2, 0, 0);
    g.add(CYL6, P.brass, x, r, z + k * (w / 2 + 0.008), 0.025, 0.02, 0.025, Math.PI / 2, 0, 0);
  };
  for (const k of [-1, 1]) { wheel(-0.12, k * 0.14, 0.14, 0.07); wheel(0.2, k * 0.11, 0.08, 0.045); }
  g.add(unit.cyl, t, 0.04, 0.2, 0, 0.08, 0.34, 0.08, 0, 0, Math.PI / 2);
  for (const x of [-0.06, 0.1]) g.add(unit.cyl, P.brass, x, 0.2, 0, 0.083, 0.014, 0.083, 0, 0, Math.PI / 2);
  g.add(unit.cyl, IRON_D, 0.235, 0.2, 0, 0.085, 0.06, 0.085, 0, 0, Math.PI / 2);
  g.cylT(0.022, 0.026, 0.3, PAINT, 0.24, 0.27, 0, 8).cylT(0.032, 0.026, 0.03, P.brass, 0.24, 0.57, 0, 8);
  g.box(0.14, 0.05, 0.06, IRON, 0.05, 0.27, 0).add(DISC, IRON_D, 0.02, 0.33, 0.1, 0.08, 0.02, 0.08, Math.PI / 2, 0, 0);
  g.box(0.1, 0.2, 0.16, PAINT, -0.17, 0.11, 0).box(0.14, 0.15, 0.24, td, -0.27, 0.1, 0);
  for (const x of [-0.31, 0.16]) for (const k of [-1, 1]) g.box(0.014, 0.4, 0.014, IRON_D, x, 0.12, k * 0.13);
  g.box(0.54, 0.015, 0.32, td, -0.07, 0.51, 0);
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
  for (const k of [-1, 1]) g.add(CYL8, IRON_D, -0.04, 0.06, k * 0.11, 0.06, 0.02, 0.06, Math.PI / 2, 0, 0);
  g.box(0.03, 0.03, 0.24, IRON, -0.04, 0.045, 0);
  stick(g, 0.02, IRON, [0.1, 0.12, 0], [0.14, 0.11, 0], unit.box);
  return g;
};

// Farm: ploughed rows with a tractor. Ploughed ridges run across the field in dark soil; turnips stand in rows along
// the back ridges (extra.crops, which animate() shows once the farm is finished and shrinks as the food runs out).
// Across the front a team-painted steam traction engine, its smoke box forward and its canopy over the footplate, draws a
// three-furrow plough through the stubble, fresh furrows behind it. A corrugated-iron Dutch barn full of hay stands in the
// back corner flying the flag; iron posts and wire fence the front and the right, with a team five-bar gate.
export function farm(ctx) {
  const { b, h, s, t, td, extra } = ctx, y = 0.03;
  b.box(s, y, s, SOIL_D);
  // The back field's ridges (the barn's corner left out) and the front's: furrows behind the plough, stubble ahead.
  const bx0 = -0.38, bz1 = -0.42, px = -0.08, back = [];
  for (let z = -0.8; z < 0.24; z += 0.12) back.push(z);
  for (const z of back) { const x0 = z < bz1 ? bx0 : -h + 0.03, x1 = h - 0.06; b.roof(0.1, 0.045, x1 - x0, SOIL, (x0 + x1) / 2, y, z, Math.PI / 2); }
  for (let z = 0.36; z < 0.82; z += 0.12) b.roof(0.1, 0.05, px - 0.1 + h - 0.03, SOIL, (px - 0.1 - h + 0.03) / 2, y, z, Math.PI / 2);
  b.box(h - 0.06 - px + 0.1, 0.008, 0.5, STUBBLE, (px - 0.1 + h - 0.06) / 2, y, 0.57);
  for (const z of [0.4, 0.52, 0.64, 0.76]) b.box(h - 0.08 - px + 0.1, 0.012, 0.012, 0xb3a16a, (px - 0.1 + h - 0.08) / 2, y + 0.008, z);
  // The traction engine and its plough.
  place(b, tractionEngine(t, td), px + 0.46, y, 0.57);
  place(b, plough(), px, y, 0.57);
  // The Dutch barn: iron posts, a curved roof of corrugated sheets, hay inside and out, the flag.
  const bx = (bx0 - h + 0.04) / 2, bz = (bz1 - h + 0.04) / 2, bw = 0.46, bd = 0.42, ph = 0.56, R = 0.3, half = Math.asin(0.24 / R), yc = y + ph + 0.12 - R;
  b.box(bw + 0.04, 0.02, bd + 0.04, CINDER, bx, y, bz);
  for (const kx of [-1, 1]) for (const kz of [-1, 1]) b.box(0.035, ph, 0.035, IRON_D, bx + kx * bw / 2, y, bz + kz * bd / 2);
  for (let i = 0; i < 5; i++) { const a = -half + (i + 0.5) * 2 * half / 5; b.box(bw + 0.08, 0.018, 0.112, i % 2 ? CORR_D : CORR, bx, yc + R * Math.cos(a), bz + R * Math.sin(a), a); }
  b.box(bw - 0.06, 0.4, bd - 0.08, C.hay, bx, y + 0.02, bz);
  for (const yy of [0.15, 0.29]) b.box(bw - 0.05, 0.012, bd - 0.07, C.thatchD, bx, y + yy, bz);
  for (const [x, z, yy] of [[bx + 0.3, bz + 0.14, 0], [bx + 0.3, bz - 0.04, 0], [bx + 0.3, bz + 0.05, 0.11]]) b.box(0.13, 0.11, 0.18, C.hay, x, y + yy, z, 0, 0.1);
  flag(ctx, bx, y + ph + 0.11, bz, 0.4, IRON);
  // The fence: iron posts and two wires along the front and the right, the team gate in the front.
  const fe = h - 0.04, gate = [-0.56, -0.24];
  for (let u = -h + 0.06; u < fe; u += 0.2) { if (u < gate[0] - 0.02 || u > gate[1] + 0.02) b.box(0.025, 0.24, 0.025, IRON_D, u, y, fe); b.box(0.025, 0.24, 0.025, IRON_D, fe, y, u); }
  for (const yy of [0.1, 0.2]) {
    b.box(gate[0] + h - 0.06, 0.008, 0.008, P.steel, (gate[0] - h + 0.06) / 2, y + yy, fe).box(fe - gate[1], 0.008, 0.008, P.steel, (gate[1] + fe) / 2, y + yy, fe);
    b.box(0.008, 0.008, 2 * h - 0.1, P.steel, fe, y + yy, -0.02);
  }
  for (const x of gate) b.box(0.04, 0.28, 0.04, IRON_D, x, y, fe);
  const gcx = (gate[0] + gate[1]) / 2, gw = gate[1] - gate[0] - 0.04;
  for (let i = 0; i < 5; i++) b.box(gw, 0.02, 0.016, t, gcx, y + 0.04 + i * 0.045, fe);
  b.box(0.022, 0.24, 0.016, t, gcx, y + 0.13, fe, 0, 0, 1.05);
  // The turnips along the back ridges.
  const cr = new B();
  for (const [j, z] of back.entries()) for (let i = 0, x = -h + 0.1; x < h - 0.1; i++, x += 0.15) {
    if (z < bz1 && x < bx0 + 0.04) continue;
    const k = 0.85 + hash(i, j) * 0.3;
    cr.add(TURNIP_GEO, hash(j, i) > 0.5 ? TURNIP : TURNIP_L, x + (hash(i + 3, j) - 0.5) * 0.03, y + 0.08, z, 0.055 * k, 0.05 * k, 0.05 * k, 0, i + j);
  }
  extra.crops = cr.geometry();
  return y + ph + 0.15;
}

// A breech-loading field gun for place(), built at the origin facing +x: its steel barrel over a team carriage, an iron
// shield, wooden wheels with team hubs and the trail back to the ground.
const fieldGun = t => {
  const g = new B(), wr = 0.12;
  for (const k of [-1, 1]) g.add(DISC, C.woodD, 0, wr, k * 0.15, wr, 0.025, wr, Math.PI / 2, 0, 0).add(CYL6, t, 0, wr, k * 0.168, 0.035, 0.02, 0.035, Math.PI / 2, 0, 0);
  g.add(CYL6, IRON_D, 0, wr, 0, 0.018, 0.3, 0.018, Math.PI / 2, 0, 0);
  stick(g, 0.06, t, [0.04, wr + 0.02, 0], [-0.4, 0.02, 0], unit.box);
  g.box(0.16, 0.06, 0.1, t, 0.02, wr + 0.02, 0).box(0.02, 0.16, 0.26, IRON, 0.1, wr - 0.02, 0);
  stick(g, 0.03, GUN, [-0.08, wr + 0.1, 0], [0.4, wr + 0.12, 0], CYL8);
  g.add(CYL8, GUN, -0.07, wr + 0.1, 0, 0.042, 0.1, 0.042, 0, 0, Math.PI / 2);
  return g;
};
// A searchlight standing on a roof at y: its pedestal, the turntable and yoke, and the lamp drum (centre 0.32 up) with
// its brass rim and bright lens, aimed along the unit direction d.
const searchlight = (b, x, y, z, d) => {
  const cy = y + 0.32, at = f => [x + d[0] * f, cy + d[1] * f, z + d[2] * f], sl = Math.hypot(d[0], d[2]), ux = -d[2] / sl, uz = d[0] / sl;
  b.cylT(0.05, 0.08, 0.15, IRON_D, x, y, z, 8).box(0.3, 0.03, 0.06, IRON, x, cy - 0.17, z, 0, Math.atan2(-uz, ux));
  for (const k of [-1, 1]) stick(b, 0.02, IRON_D, [x + k * ux * 0.12, cy - 0.15, z + k * uz * 0.12], [x + k * ux * 0.14, cy, z + k * uz * 0.14], unit.box);
  stick(b, 0.12, IRON, at(-0.12), at(0.1), CYL8); stick(b, 0.13, P.brass, at(0.09), at(0.13), CYL8); stick(b, 0.105, LENS, at(0.12), at(0.135), DISC);
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
  // The drill shed: walls, the segmental barrel roof (a glazed crown) and its gable ends; the boiler stack.
  const sx = -0.48, sw = 1.68, scz = -0.98, sd = 0.68, st = block(b, sx, scz, sw, sd, 0.62, { y });
  const span = sd / 2 + 0.04, rise = 0.3, R = (span * span + rise * rise) / (2 * rise), half = Math.asin(span / R), yc = st + rise - R, n = 7;
  for (let i = 0; i < n; i++) { const a = -half + (i + 0.5) * 2 * half / n; b.box(sw + 0.06, 0.03, 2 * R * Math.sin(half / n) + 0.006, i === 3 ? ROOF_GLASS : i % 2 ? SLATE_D : SLATE, sx, yc + R * Math.cos(a) - 0.015, scz + R * Math.sin(a), a); }
  for (const k of [-1, 1]) b.add(ARCH, BRICK, sx + k * (sw / 2 + 0.001), st, scz, span - 0.04, rise - 0.02, 1, 0, k * Math.PI / 2, 0);
  smoke(extra, -1.12, chimney(b, -1.12, y, -1.18, 1.5, 0.16), -1.18, [0, 0.33, 0.66]);
  // The head house: front wall, string course, battlements, the gate, the shield, banners and windows, the corner turret.
  const hx = -0.41, hw = 1.54, hz = -0.45, hd = 0.38, fz = hz + hd / 2, ht = block(b, hx, hz, hw, hd, 0.78, { y });
  b.box(hw + 0.02, 0.03, hd + 0.02, BUFF, hx, y + 0.5, hz);
  for (let x = hx - hw / 2 + 0.08; x < hx + hw / 2; x += 0.16) b.box(0.09, 0.1, 0.08, BRICK, x, ht, fz - 0.04);
  for (let z = hz - hd / 2 + 0.08; z < fz - 0.08; z += 0.16) b.box(0.08, 0.1, 0.09, BRICK, hx - hw / 2 + 0.04, ht, z);
  const gx = hx, gf = fz + 0.011;
  b.box(0.3, 0.32, 0.02, td, gx, y + 0.08, gf).add(ARCH, td, gx, y + 0.4, gf, 0.15, 0.15, 1).add(ARCH_RING, BUFF, gx, y + 0.4, gf + 0.004, 0.17, 0.17, 0.15);
  b.box(0.012, 0.32, 0.024, IRON_D, gx, y + 0.08, gf + 0.002).box(0.05, 0.06, 0.03, BUFF, gx, y + 0.55, gf);
  b.box(0.2, 0.2, 0.02, BUFF, gx, 0.66, gf).box(0.16, 0.13, 0.024, t, gx, 0.69, gf).add(CONE4, t, gx, 0.66, gf + 0.002, 0.08, 0.07, 0.012, Math.PI, 0, 0);
  for (const k of [-1, 1]) b.box(0.13, 0.34, 0.012, t, gx + k * 0.26, 0.46, gf + 0.004).box(0.15, 0.02, 0.02, IRON_D, gx + k * 0.26, 0.8, gf + 0.006);
  for (const x of [-1.02, -0.84, 0.02, 0.2]) for (const yy of [0.18, 0.56]) iwin(b, x, yy, gf, 0, 0.06, 0.22);
  b.cylT(0.1, 0.1, 0.98, BRICK, hx - hw / 2, y, fz - 0.02, 8).cylT(0.12, 0.12, 0.05, BUFF, hx - hw / 2, y + 0.98, fz - 0.02, 8);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; b.box(0.05, 0.08, 0.05, BRICK, hx - hw / 2 + Math.cos(a) * 0.09, y + 1.03, fz - 0.02 + Math.sin(a) * 0.09); }
  iwin(b, hx - hw / 2, 0.55, fz + 0.085, 0, 0.05, 0.16);
  // The tower: corbelled parapet and battlements, bartizans, slit windows, the searchlight and the flag.
  const tx = 0.65, tz = -0.59, tw = 0.58, tt = block(b, tx, tz, tw, tw, 1.55, { y });
  b.box(tw + 0.06, 0.08, tw + 0.06, BUFF, tx, tt - 0.08, tz);
  for (let i = 0; i < 4; i++) for (const k of [-1, 1]) {
    const u = -tw / 2 + 0.05 + i * (tw - 0.1) / 3;
    b.box(0.08, 0.1, 0.08, BRICK, tx + u, tt, tz + k * (tw / 2 - 0.01)).box(0.08, 0.1, 0.08, BRICK, tx + k * (tw / 2 - 0.01), tt, tz + u);
  }
  for (const [x, z] of [[tx + tw / 2, tz + tw / 2], [tx - tw / 2, tz + tw / 2], [tx + tw / 2, tz - tw / 2]]) {
    b.cylT(0.075, 0.035, 0.12, BUFF, x, tt - 0.32, z, 8).cylT(0.075, 0.075, 0.28, BRICK, x, tt - 0.2, z, 8).cone(0.09, 0.14, SLATE, x, tt + 0.08, z, 8);
  }
  for (const yy of [0.3, 0.75, 1.2]) { iwin(b, tx, yy, tz + tw / 2 + 0.01, 0, 0.06, 0.2); iwin(b, tx + tw / 2 + 0.01, yy, tz, Math.PI / 2, 0.06, 0.2); }
  const d = [Math.cos(0.32) * Math.SQRT1_2, Math.sin(0.32), Math.cos(0.32) * Math.SQRT1_2];
  searchlight(b, tx, tt, tz, d);
  flag(ctx, tx - tw / 2 + 0.06, tt, tz - tw / 2 + 0.06, 0.55, IRON);
  // The yard: the path, the field guns, ammunition and shells, the rifle rack.
  b.box(0.42, 0.008, h - fz, PAVE, gx, y, (fz + h) / 2);
  for (const x of [gx - 0.5, gx + 0.5]) place(b, fieldGun(t), x, y, 0.42, -Math.PI / 2);
  for (const [x, z, yy, ry] of [[0.62, 0.12, 0, 0.1], [0.8, 0.1, 0, -0.15], [0.7, 0.14, 0.11, 0.3]]) crate(b, x, y + yy, z, 0.14, ry, t);
  for (let i = 0; i < 6; i++) { const x = 0.62 + (i % 3) * 0.06, z = 0.36 + (i / 3 | 0) * 0.06; b.cylT(0.022, 0.022, 0.08, P.brass, x, y, z, 6).add(CONE4, GUN, x, y + 0.1, z, 0.024, 0.04, 0.024); }
  b.box(0.5, 0.03, 0.05, C.woodD, -1.0, y + 0.3, -0.02).box(0.5, 0.03, 0.06, C.woodD, -1.0, y + 0.04, 0.02);
  for (const k of [-1, 1]) b.box(0.03, 0.34, 0.03, C.woodD, -1.0 + k * 0.24, y, 0.0);
  for (let i = 0; i < 7; i++) { const x = -1.18 + i * 0.06; stick(b, 0.012, C.woodD, [x, y + 0.05, 0.04], [x, y + 0.28, -0.0], unit.box); stick(b, 0.007, GUN, [x, y + 0.28, 0.0], [x, y + 0.42, -0.02], unit.box); }
  // The front: railings between brick piers, lamps on the gate piers; along the right as far as the tower.
  const fe = h - 0.06, g0 = gx - 0.26, g1 = gx + 0.26;
  railings(b, [-h + 0.06, fe], [g0, fe]); railings(b, [g1, fe], [fe, fe]); railings(b, [fe, fe], [fe, tz + tw / 2 + 0.1]);
  for (const x of [-h + 0.06, -0.9, g0, g1, 0.4, fe]) pier(b, x, fe, x === g0 || x === g1 ? 0.36 : 0.28);
  pier(b, fe, 0.5); pier(b, fe, tz + tw / 2 + 0.1);
  for (const x of [g0, g1]) gasLamp(b, x, fe, 0.26, y + 0.4);
  return tt + 0.48;
}

// Archery Range: a rifle range with sandbag lanes. Three mown lanes run back from the firing line to the stop butt: a
// long earth bank behind the marker's brick mantlet, where square targets painted in team rings round a black bull stand
// on iron frames. Sandbag walls part the lanes and flank the range; at the firing line each lane has its sandbag
// breastwork, a team mat and a rifle laid ready, and white distance boards stand along the lanes. At the front a brick
// range house under slate, a rifle rack and team-banded ammunition boxes; the team range flag flies from a tall iron pole
// on the butt.
export function archery_range(ctx) {
  const { b, s, t, td } = ctx, y = 0.03, lanes = [-0.86, 0, 0.86], fz = 0.72;
  b.box(s, y, s, GRASS);
  for (const x of lanes) b.box(0.62, 0.006, 1.9, GRASS_L, x, y, -0.2);
  // The stop butt, the mantlet and the targets.
  const bz = -1.1;
  b.add(FRUSTUM, GRASS_D, 0, y + 0.3, bz, 1.36, 0.6, 0.27).box(2.5, 0.3, 0.02, 0x7a6648, 0, y + 0.1, -0.85, -0.12);
  b.box(2.66, 0.24, 0.08, BRICK, 0, y, -0.6).box(2.7, 0.025, 0.1, BUFF, 0, y + 0.24, -0.6);
  for (const x of lanes) {
    const tz = -0.72, ty = y + 0.46;
    for (const k of [-1, 1]) b.box(0.025, 0.62, 0.025, IRON_D, x + k * 0.2, y, tz - 0.02);
    b.box(0.42, 0.02, 0.025, IRON_D, x, y + 0.62, tz - 0.02).box(0.38, 0.38, 0.02, CLOCK, x, y + 0.27, tz);
    for (const [c, r, dz] of [[t, 0.16, 0.012], [CLOCK, 0.115, 0.016], [t, 0.075, 0.02], [GUN, 0.04, 0.024]]) b.add(DISC, c, x, ty, tz + dz, r, 0.006, r, Math.PI / 2, 0, 0);
    b.box(0.1, 0.07, 0.015, PAINT, x, y + 0.66, tz).box(0.03, 0.04, 0.016, CLOCK, x, y + 0.675, tz + 0.002);
  }
  // Sandbag walls between and beside the lanes, the breastworks, mats and rifles; distance boards.
  for (const x of [-0.43, 0.43]) sandbags(b, [x, -0.5], [x, fz - 0.02], 3);
  for (const x of [-1.3, 1.3]) sandbags(b, [x, -0.5], [x, 0.9], 2);
  for (const x of lanes) {
    sandbags(b, [x - 0.22, fz], [x + 0.22, fz], 3);
    b.box(0.18, 0.012, 0.26, t, x + 0.04, y, fz + 0.17);
    stick(b, 0.016, C.woodD, [x + 0.05, y + 0.17, fz + 0.12], [x + 0.05, y + 0.165, fz - 0.02], unit.box);
    stick(b, 0.009, GUN, [x + 0.05, y + 0.168, fz - 0.02], [x + 0.05, y + 0.17, fz - 0.18], unit.box);
    for (const z of [-0.1, 0.3]) b.box(0.025, 0.24, 0.025, CLOCK, x + 0.25, y, z).box(0.14, 0.08, 0.015, CLOCK, x + 0.25, y + 0.22, z + 0.015).box(0.06, 0.04, 0.017, PAINT, x + 0.25, y + 0.24, z + 0.016);
  }
  // The range house; the rifle rack and the ammunition; the range flag on the butt.
  const rx = 1.1, rz = 1.16, rt = block(b, rx, rz, 0.48, 0.32, 0.36, { y });
  slate(b, rx, rt, rz, 0.54, 0.4, 0.16, false, false);
  b.box(0.12, 0.26, 0.02, td, rx - 0.1, y + 0.08, rz + 0.17);
  iwin(b, rx + 0.12, y + 0.2, rz + 0.17, 0, 0.1, 0.13); iwin(b, rx + 0.25, y + 0.2, rz, Math.PI / 2, 0.1, 0.13);
  chimney(b, rx - 0.16, rt - 0.02, rz, 0.16, 0.08);
  b.box(0.52, 0.03, 0.05, C.woodD, -0.95, y + 0.3, 1.1).box(0.52, 0.03, 0.06, C.woodD, -0.95, y + 0.04, 1.14);
  for (const k of [-1, 1]) b.box(0.03, 0.34, 0.03, C.woodD, -0.95 + k * 0.25, y, 1.12);
  for (let i = 0; i < 7; i++) { const x = -1.13 + i * 0.06; stick(b, 0.012, C.woodD, [x, y + 0.05, 1.16], [x, y + 0.28, 1.12], unit.box); stick(b, 0.007, GUN, [x, y + 0.28, 1.12], [x, y + 0.42, 1.1], unit.box); }
  for (const [x, z, yy, ry] of [[-0.42, 1.12, 0, 0.1], [-0.26, 1.18, 0, -0.2], [-0.35, 1.14, 0.11, 0.25]]) crate(b, x, y + yy, z, 0.14, ry, t);
  flag(ctx, 1.12, y + 0.58, bz, 1.0, IRON, [0.3, 0.5]);
  return 0.82;
}

// Stable: a horse depot with a rail ramp. A long brick stable at the back under a slate roof with an iron ventilator
// along its ridge: stable doors with team lower leaves (two horses looking out), arched windows, a cart arch and a loft
// door in its +x end. A siding runs down the +x side to a team buffer stop, where a team horse box stands at a brick
// loading dock: its side door is let down onto the dock, a horse in a team saddle cloth waits to board, and a ramp with
// iron rails comes down from the dock into the cobbled yard, where two more horses stand by an iron trough and hay. A
// signal stands over the siding.
export function stable(ctx) {
  const { b, s, h, t, td } = ctx, y = 0.03;
  b.box(s, y, s, SETT);
  // The stable: roof and ventilator, the doors and horses, windows, the cart arch and loft door, the flag.
  const x0 = -1.32, x1 = 0.44, z0 = -1.32, z1 = -0.72, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, fl = y + 0.08;
  const top = block(b, cx, cz, W, D, 0.6, { y }), vy = top + 0.28;
  slate(b, cx, top, cz, W + 0.08, D + 0.12, 0.32, false, false);
  b.box(1.0, 0.1, 0.12, IRON, cx, vy, cz);
  for (let i = 0; i < 8; i++) b.box(0.012, 0.06, 0.125, IRON_D, cx - 0.44 + i * 0.125, vy + 0.02, cz);
  slate(b, cx, vy + 0.1, cz, 1.06, 0.2, 0.07);
  for (const [i, x] of [-1.1, -0.66, -0.22, 0.22].entries()) {
    b.box(0.24, 0.42, 0.02, BUFF, x, fl, z1 + 0.006).box(0.19, 0.2, 0.02, t, x, fl, z1 + 0.012).box(0.19, 0.18, 0.02, C.dark, x, fl + 0.2, z1 + 0.01).box(0.27, 0.04, 0.03, BRICK_D, x, fl + 0.42, z1 + 0.01);
    if (i % 2) b.box(0.08, 0.08, 0.16, HORSE_HEAD, x, fl + 0.25, z1 + 0.08, -0.35).box(0.08, 0.14, 0.08, HORSE_HEAD, x, fl + 0.2, z1 + 0.02, 0.5).box(0.03, 0.05, 0.02, CLOCK, x, fl + 0.27, z1 + 0.16);
  }
  for (const x of [-0.88, -0.44, 0.0]) iwin(b, x, fl + 0.3, z1 + 0.01, 0, 0.12, 0.14);
  const ax = x1 + 0.011;
  b.box(0.02, 0.3, 0.3, C.dark, ax, fl, cz).add(ARCH, C.dark, ax, fl + 0.3, cz, 0.15, 0.15, 1, 0, Math.PI / 2, 0).add(ARCH_RING, BUFF, ax + 0.004, fl + 0.3, cz, 0.17, 0.17, 0.15, 0, Math.PI / 2, 0);
  b.box(0.02, 0.14, 0.12, C.woodD, x1 + 0.05, top + 0.03, cz).box(0.022, 0.06, 0.1, C.hay, x1 + 0.052, top + 0.03, cz);
  flag(ctx, cx - 0.7, top + 0.3, cz, 0.42, IRON);
  // The siding along the +x side, its buffer stop and signal; the dock, its ramp and railings; the horse box.
  const rx = 1.06, kx = 0.695, kw = 0.35, kz0 = -0.45, kz1 = 0.5, kh = 0.24;
  track(b, -h + 0.08, h, rx, y, true); bufferStop(b, t, rx, -h + 0.09, y, true);
  b.box(kw, kh - 0.02, kz1 - kz0, BRICK, kx, y, (kz0 + kz1) / 2).box(kw + 0.02, 0.025, kz1 - kz0 + 0.02, BUFF, kx, y + kh - 0.02, (kz0 + kz1) / 2);
  b.add(WEDGE, SETT_D, kx, y, kz1, kw, kh + 0.005, 0.5);
  for (const k of [-1, 1]) {
    const x = kx + k * (kw / 2 - 0.01);
    stick(b, 0.014, IRON_D, [x, y + kh + 0.18, kz1], [x, y + 0.18, kz1 + 0.5], unit.box);
    for (const f of [0, 0.5, 1]) b.box(0.014, 0.18, 0.014, IRON_D, x, y + kh * (1 - f), kz1 + 0.5 * f);
  }
  place(b, wagon(t, 'horse', 0.82), rx, y + 0.02, 0.05, Math.PI / 2);
  b.box(0.16, 0.015, 0.2, t, kx + kw / 2 + 0.04, y + kh - 0.005, 0.05, 0, 0, -0.06);
  const sgx = 1.3, sgz = -0.62;
  b.box(0.03, 0.95, 0.03, IRON_D, sgx, y, sgz).box(0.16, 0.035, 0.012, t, sgx - 0.07, y + 0.85, sgz + 0.02, 0, 0, -0.3).box(0.05, 0.05, 0.05, LIT, sgx, y + 0.95, sgz).box(0.08, 0.02, 0.08, IRON_D, sgx, y + 1.0, sgz);
  // The horses: one waiting on the dock, two in the yard by the trough and the hay.
  place(b, horse(t), kx - 0.06, y + kh, 0.05, 0, 0.9);
  place(b, horse(t), -0.78, y, 0.42, 0.5, 0.9); place(b, horse(t, true), -0.3, y, 0.86, -0.3, 0.9);
  b.box(0.12, 0.12, 0.42, IRON_D, -1.18, y, 0.5).box(0.08, 0.01, 0.38, 0x3f7fa3, -1.18, y + 0.11, 0.5);
  for (const [x, z, yy, ry] of [[0.18, 0.66, 0, 0.2], [0.3, 0.78, 0, -0.1], [0.24, 0.72, 0.11, 0.4]]) b.box(0.2, 0.11, 0.12, C.hay, x, y + yy, z, 0, ry);
  gasLamp(b, -1.15, -0.2, 0.55);
  return vy + 0.17;
}

// A shopfront for place(), built at the origin on a wall face at z = 0 facing +z, w wide: a dark-green stall riser and
// pilasters round its window, a fascia with a gold line, a team awning out over the pavement and crates of produce under
// it (fruit in the given colour).
const shopfront = (t, w, fruit) => {
  const g = new B(), fl = 0.11;
  g.box(w, 0.07, 0.03, GREEN, 0, fl, 0.015).box(w - 0.08, 0.24, 0.02, SHOP, 0, fl + 0.07, 0.012);
  for (const k of [-1, 1]) g.box(0.035, 0.31, 0.035, GREEN, k * (w / 2 - 0.018), fl, 0.018);
  g.box(w, 0.07, 0.03, GREEN, 0, fl + 0.31, 0.016).box(w - 0.12, 0.014, 0.034, C.gold, 0, fl + 0.338, 0.017);
  g.box(w - 0.02, 0.012, 0.18, t, 0, fl + 0.27, 0.09, 0.45);
  for (const k of [-1, 1]) g.box(0.1, 0.06, 0.08, C.wood, k * 0.1, fl - 0.08, 0.1).box(0.09, 0.025, 0.07, k > 0 ? fruit : 0x6a9a3a, k * 0.1, fl - 0.02, 0.1);
  return g;
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
  // The two ranges: string courses, slate roofs, chimneys with smoke.
  const pw = 0.42, z0 = -1.32, z1 = 0.86, L = z1 - z0, cz = (z0 + z1) / 2, rw = 0.86;
  let top = 0;
  for (const k of [-1, 1]) {
    const cx = k * (pw + rw / 2);
    top = block(b, cx, cz, rw, L, 0.86, { y });
    b.box(rw + 0.02, 0.03, L + 0.02, BUFF, cx, y + 0.5, cz);
    slate(b, cx, top, cz, rw + 0.08, L + 0.06, 0.28, true, false);
    smoke(extra, cx, chimney(b, cx, top + 0.16, k < 0 ? -0.62 : -0.2, 0.3), k < 0 ? -0.62 : -0.2, k < 0 ? [0, 0.5] : [0.25, 0.75]);
  }
  // The shopfronts and upper windows on the passage side of the -x range and the outer side of the +x range; the ranges'
  // front ends.
  const fruits = [0xd8432a, 0xe8a23a, 0xc8302a, 0xd9c24a];
  for (const [fx, n] of [[-pw, 0], [pw + rw, 4]]) {
    for (let i = 0; i < 4; i++) place(b, shopfront(t, 0.46, fruits[(i + n) % 4]), fx + 0.001, 0, z0 + (i + 0.5) * L / 4, Math.PI / 2);
    iwins(b, fx, cz, Math.PI / 2, L, 8, [y + 0.6], 0.1, 0.18);
  }
  for (const k of [-1, 1]) {
    const ex = k * (pw + 0.2 + (rw - 0.2) / 2);
    place(b, shopfront(t, 0.5, fruits[k > 0 ? 1 : 2]), ex, 0, z1 + 0.001, 0);
    iwins(b, ex, z1, 0, 0.6, 3, [y + 0.6], 0.1, 0.18);
  }
  // The glass vault on its iron ribs, its ridge vent.
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 8; b.box(2 * pw * Math.sin(Math.PI / 16) + 0.006, 0.012, L, i % 2 ? ROOF_GLASS_D : ROOF_GLASS, pw * Math.cos(a), top + pw * Math.sin(a), cz, 0, 0, a - Math.PI / 2); }
  for (let z = z0 + 0.12; z < z1; z += 0.36) b.add(RIB, IRON_D, 0, top, z, pw + 0.006, pw + 0.006, pw + 0.006);
  b.box(0.07, 0.035, L, IRON_D, 0, top + pw, cz);
  // The entrance screen: the arch, its fanlight, the name-board, the clock, the gable and pinnacles; the lamps.
  const sw = 0.66, sh = 1.18, gt = 1.5, ar = 0.34, as = 0.5, zf = z1 + 0.09;
  const shape = new THREE.Shape(); shape.moveTo(-sw, 0); shape.lineTo(sw, 0); shape.lineTo(sw, sh); shape.lineTo(0, gt); shape.lineTo(-sw, sh); shape.closePath();
  const hole = new THREE.Path(); hole.moveTo(-ar, 0); hole.lineTo(ar, 0); hole.lineTo(ar, as); hole.absarc(0, as, ar, 0, Math.PI, false); hole.lineTo(-ar, 0); shape.holes.push(hole);
  const screen = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false, curveSegments: 8 });
  b.add(screen, BUFF, 0, y, z1 - 0.01, 1, 1, 1); screen.dispose();
  b.add(ARCH, ROOF_GLASS, 0, y + as, z1 + 0.04, ar, ar, 1).add(ARCH_RING, BUFF_D, 0, y + as, zf + 0.004, ar + 0.02, ar + 0.02, 0.2);
  for (let i = 1; i < 6; i++) b.box(0.012, ar, 0.016, IRON_D, Math.cos(i * Math.PI / 6) * ar / 2, y + as + Math.sin(i * Math.PI / 6) * ar / 2, z1 + 0.05, 0, 0, i * Math.PI / 6 - Math.PI / 2);
  b.box(2 * ar, 0.014, 0.016, IRON_D, 0, y + as, z1 + 0.05);
  b.box(0.6, 0.11, 0.02, t, 0, y + 0.9, zf + 0.002).box(0.5, 0.016, 0.022, C.gold, 0, y + 0.947, zf + 0.004);
  b.add(DISC, P.brass, 0, y + 1.2, zf + 0.002, 0.14, 0.012, 0.14, Math.PI / 2, 0, 0).add(DISC, CLOCK, 0, y + 1.2, zf + 0.01, 0.12, 0.01, 0.12, Math.PI / 2, 0, 0);
  b.box(0.016, 0.09, 0.012, C.dark, 0, y + 1.22, zf + 0.018).box(0.07, 0.016, 0.012, C.dark, 0.03, y + 1.2, zf + 0.018);
  for (const k of [-1, 1]) { stick(b, 0.04, BUFF_D, [k * sw, y + sh + 0.02, zf - 0.04], [0, y + gt + 0.02, zf - 0.04], unit.box); b.box(0.1, 0.12, 0.12, BUFF_D, k * (sw - 0.03), y + sh, zf - 0.05).add(CONE4, BUFF_D, k * (sw - 0.03), y + sh + 0.24, zf - 0.05, 0.08, 0.24, 0.08, 0, Math.PI / 4, 0); }
  b.box(0.08, 0.1, 0.08, BUFF_D, 0, y + gt - 0.04, zf - 0.05).add(CONE4, BUFF_D, 0, y + gt + 0.16, zf - 0.05, 0.06, 0.2, 0.06, 0, Math.PI / 4, 0);
  for (const x of [-0.78, 0.78]) gasLamp(b, x, z1 + 0.22, 0.52);
  flag(ctx, pw + rw / 2, top + 0.26, -0.9, 0.45, IRON);
  // The fruit barrow and the flower stall.
  const fb = new B();
  for (const k of [-1, 1]) fb.add(CYL8, C.woodD, 0.08, 0.08, k * 0.13, 0.08, 0.02, 0.08, Math.PI / 2, 0, 0);
  fb.box(0.36, 0.08, 0.24, t, 0, 0.1, 0).box(0.34, 0.03, 0.22, 0xd8432a, 0, 0.18, 0).box(0.16, 0.03, 0.1, 0xe8a23a, -0.06, 0.21, 0);
  for (const k of [-1, 1]) stick(fb, 0.012, C.woodD, [-0.16, 0.12, k * 0.08], [-0.36, 0.06, k * 0.08], unit.box);
  fb.box(0.03, 0.12, 0.03, C.woodD, 0.14, 0.0, 0);
  place(b, fb, -0.98, y, 1.16, 0.3);
  b.box(0.36, 0.04, 0.2, C.wood, 0.98, y + 0.18, 1.16);
  for (const k of [-1, 1]) b.box(0.03, 0.18, 0.18, C.woodD, 0.98 + k * 0.15, y, 1.16);
  for (const [i, dx] of [-0.12, -0.04, 0.04, 0.12].entries()) b.cylT(0.035, 0.03, 0.06, IRON, 0.98 + dx, y + 0.22, 1.16, 6).add(BALL, [0xd84a7a, 0xf2efe6, 0xe8c23a, t][i], 0.98 + dx, y + 0.31, 1.16, 0.045, 0.04, 0.045);
  return Math.max(gt + 0.36, top + 0.6);
}

// Government Center: a clock-tower parliament. A Victorian Gothic hall of red brick with buff stone dressings: two
// storeys of pointed windows between buttresses that rise into pinnacles, a steep crested slate roof with smoking
// chimneys, and a gabled buff porch with a pointed team doorway, a team band and team banners either side. At its +x end
// rises the clock tower: brick with buff quoins and slit windows, a team frieze under the clock stage, clock faces, corner
// pinnacles and a steep slate spire with a gilded tip; the flag flies over the hall. In the forecourt, lawns either side
// of the path, a statue, a team flower bed, gas lamps and iron railings along the front.
export function government_center(ctx) {
  const { b, mast, s, h, t, td, extra } = ctx, y = 0.03;
  b.box(s, y, s, PAVE);
  // The hall: string course, roof, chimneys and smoke, windows, buttresses and pinnacles, banners.
  const x0 = -1.32, x1 = 0.6, z0 = -1.1, z1 = -0.4, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, bay = W / 6;
  const top = block(b, cx, cz, W, D, 0.92, { y });
  b.box(W + 0.02, 0.03, D + 0.02, BUFF, cx, y + 0.52, cz);
  slate(b, cx, top, cz, W + 0.06, D + 0.1, 0.46);
  for (const [x, ph] of [[-1.0, 0], [0.2, 0.25]]) smoke(extra, x, chimney(b, x, top + 0.22, cz + 0.12, 0.36, 0.12), cz + 0.12, [ph, ph + 0.5]);
  for (let i = 0; i < 6; i++) {
    const x = x0 + (i + 0.5) * bay;
    lancet(b, x, y + 0.6, z1 + 0.01, 0, 0.1, 0.24);
    if (i !== 2 && i !== 3) lancet(b, x, y + 0.16, z1 + 0.01, 0, 0.1, 0.24);
  }
  for (let i = 0; i <= 6; i++) {
    const x = x0 + i * bay;
    b.box(0.06, 0.92, 0.06, BRICK_D, x, y + 0.08, z1 + 0.03).box(0.08, 0.05, 0.08, BUFF, x, y + 0.5, z1 + 0.03);
    b.box(0.06, 0.12, 0.06, BUFF, x, top - 0.02, z1 + 0.03).add(CONE4, BUFF, x, top + 0.18, z1 + 0.03, 0.05, 0.16, 0.05, 0, Math.PI / 4, 0);
  }
  for (const x of [x0 + 2 * bay, x0 + 4 * bay]) b.box(0.1, 0.32, 0.012, t, x, y + 0.5, z1 + 0.067).box(0.12, 0.02, 0.02, IRON_D, x, y + 0.82, z1 + 0.067);
  // The porch: buff walls, its gable and team band, the pointed team doorway, the steps.
  const px = x0 + 3 * bay, pz0 = z1, pz1 = z1 + 0.3, pzc = (pz0 + pz1) / 2;
  b.box(0.5, 0.62, pz1 - pz0, BUFF, px, y + 0.08, pzc).roof(0.56, 0.3, pz1 - pz0 + 0.04, SLATE, px, y + 0.7, pzc).roof(0.5, 0.27, 0.02, BUFF, px, y + 0.7, pz1 + 0.01);
  b.box(0.5, 0.05, 0.02, t, px, y + 0.64, pz1 + 0.01).add(CONE4, BUFF, px, y + 1.04, pz1, 0.03, 0.1, 0.03, 0, Math.PI / 4, 0);
  b.box(0.2, 0.32, 0.02, td, px, y + 0.08, pz1 + 0.012).add(CONE4, td, px, y + 0.48, pz1 + 0.012, 0.1, 0.16, 0.01).box(0.012, 0.36, 0.024, IRON_D, px, y + 0.08, pz1 + 0.014);
  for (let i = 0; i < 3; i++) b.box(0.6, 0.03 * (3 - i), 0.08, PAVE, px, y, pz1 + 0.04 + i * 0.08);
  flag(ctx, x0 + 0.2, top + 0.44, cz, 0.5, IRON);
  // The clock tower: shaft, quoins, slit windows, the team frieze, the clock stage and faces, pinnacles, the spire.
  const tx = 0.92, tz = -0.69, tw = 0.52, tt = block(b, tx, tz, tw, tw, 2.12, { y });
  for (const [qx, qz] of [[1, 1], [-1, 1], [1, -1]]) b.box(0.04, 2.1, 0.04, BUFF, tx + qx * tw / 2, y + 0.08, tz + qz * tw / 2);
  for (const yy of [0.5, 0.95, 1.4, 1.85]) { lancet(b, tx, yy, tz + tw / 2 + 0.01, 0, 0.06, 0.18); lancet(b, tx + tw / 2 + 0.01, yy, tz, Math.PI / 2, 0.06, 0.18); }
  b.box(tw + 0.04, 0.08, tw + 0.04, t, tx, tt - 0.08, tz);
  const cs = 0.6, cy = tt + 0.25;
  b.box(cs, 0.5, cs, BUFF, tx, tt, tz).box(cs + 0.04, 0.04, cs + 0.04, BUFF_D, tx, tt + 0.5, tz);
  // The clock faces on the two faces the camera sees: a gilded rim, the white dial, the hands.
  for (const ry of [0, Math.PI / 2]) {
    const at = onFace(tx, tz, ry), [rx, rz] = at(0, cs / 2), [dx, dz] = at(0, cs / 2 + 0.008), [vx, vz] = at(0, cs / 2 + 0.016), [hx, hz] = at(0.03, cs / 2 + 0.016);
    b.add(DISC, C.gold, rx, cy, rz, 0.2, 0.014, 0.2, Math.PI / 2, 0, -ry).add(DISC, CLOCK, dx, cy, dz, 0.17, 0.012, 0.17, Math.PI / 2, 0, -ry);
    b.box(0.016, 0.12, 0.01, C.dark, vx, cy - 0.01, vz, 0, ry).box(0.08, 0.016, 0.01, C.dark, hx, cy, hz, 0, ry);
  }
  for (const [qx, qz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.box(0.07, 0.12, 0.07, BUFF, tx + qx * (cs / 2 - 0.035), tt + 0.54, tz + qz * (cs / 2 - 0.035)).add(CONE4, BUFF, tx + qx * (cs / 2 - 0.035), tt + 0.76, tz + qz * (cs / 2 - 0.035), 0.05, 0.2, 0.05, 0, Math.PI / 4, 0);
  const sy = tt + 0.54, sh = 0.8;
  b.add(CONE4, SLATE, tx, sy + sh / 2, tz, (cs / 2 - 0.02) * Math.SQRT2, sh, (cs / 2 - 0.02) * Math.SQRT2, 0, Math.PI / 4, 0);
  mast.cylT(0.006, 0.02, 0.4, C.gold, tx, sy + sh - 0.06, tz, 6).add(BALL, C.gold, tx, sy + sh + 0.2, tz, 0.025, 0.025, 0.025);
  // The forecourt: path, lawns, the statue, the flower bed, lamps and railings.
  b.box(0.5, 0.01, h - pz1, GRAVEL, px, y, (pz1 + h) / 2);
  b.box(px - 0.25 + h - 0.04, 0.012, 1.2, GRASS, (px - 0.25 - h + 0.04) / 2, y, 0.62).box(h - 0.04 - px - 0.25, 0.012, 1.2, GRASS, (px + 0.25 + h - 0.04) / 2, y, 0.62);
  const sx = 0.45, szz = 0.5;
  b.box(0.22, 0.28, 0.22, BUFF, sx, y, szz).box(0.26, 0.04, 0.26, BUFF_D, sx, y + 0.28, szz);
  b.cylT(0.04, 0.06, 0.2, P.bronze, sx, y + 0.32, szz, 6).add(BALL, P.bronze, sx, y + 0.57, szz, 0.04, 0.045, 0.04);
  stick(b, 0.02, P.bronze, [sx + 0.03, y + 0.48, szz], [sx + 0.12, y + 0.6, szz + 0.03], unit.box);
  b.box(0.5, 0.03, 0.22, t, -1.0, y + 0.012, 0.62).box(0.54, 0.04, 0.26, HEDGE, -1.0, y, 0.62);
  for (const x of [px - 0.3, px + 0.3]) gasLamp(b, x, 1.1, 0.5);
  const fe = h - 0.05;
  railings(b, [-h + 0.06, fe], [px - 0.3, fe]); railings(b, [px + 0.3, fe], [fe, fe]); railings(b, [fe, fe], [fe, -0.2]);
  for (const x of [-h + 0.06, px - 0.3, px + 0.3, fe]) pier(b, x, fe, 0.3);
  return sy + sh;
}

// Wonder: an iron lattice tower. On four buff stone piers in a park, four latticed iron legs, braced on every face, curve
// in and up to the first platform, joined below it by great ornamental arches; on up to the second platform, then they
// merge into the tapering shaft, its lattice rising to the glazed lantern at the top, which carries the flag. Team-painted
// friezes run round both platforms, with kiosks on the first. Below, gravel walks cross the lawns, with team flower beds
// and gas lamps.
export function wonder(ctx) {
  const { b, s, t, td } = ctx, y = 0.03;
  b.box(s, y, s, GRASS);
  // The park: walks, the circle under the tower, flower beds and lamps.
  b.box(0.4, 0.01, s, GRAVEL, 0, y, 0).box(s, 0.01, 0.4, GRAVEL, 0, y, 0).cylT(0.62, 0.62, 0.012, GRAVEL, 0, y, 0, 16);
  for (const [x, z, w, d] of [[0.75, 1.55, 0.6, 0.24], [-0.75, 1.55, 0.6, 0.24], [1.55, 0.75, 0.24, 0.6], [1.55, -0.75, 0.24, 0.6]]) b.box(w + 0.04, 0.04, d + 0.04, HEDGE, x, y, z).box(w, 0.05, d, t, x, y, z);
  for (const [x, z] of [[0.3, 1.6], [-0.3, 1.6], [1.6, 0.3], [1.6, -0.3]]) gasLamp(b, x, z, 0.5);
  // The legs: square lattice columns from the piers to the second platform, then the shaft to the top.
  const NODES = [[0.2, 1.5], [0.55, 1.25], [0.9, 1.05], [1.3, 0.88], [1.8, 0.7], [2.3, 0.56], [2.8, 0.43], [3.35, 0.31], [3.9, 0.21], [4.4, 0.14], [4.85, 0.1]];
  const Wof = yy => { for (let i = 1; i < NODES.length; i++) if (yy <= NODES[i][0] + 1e-9) { const [ya, wa] = NODES[i - 1], [yb, wb] = NODES[i]; return wa + (wb - wa) * (yy - ya) / (yb - ya); } return NODES[NODES.length - 1][1]; };
  const P1 = 1.3, P2 = 2.8, TOP = 4.85, Lof = yy => yy <= P1 ? 0.44 - 0.18 * (yy - 0.2) / (P1 - 0.2) : 0.26 - 0.09 * (yy - P1) / (P2 - P1);
  const lattice = (corners, ya, yb, n, rc, rd) => {
    for (let i = 0; i < n; i++) {
      const y0 = ya + (yb - ya) * i / n, y1 = ya + (yb - ya) * (i + 1) / n, A = corners(y0), Z = corners(y1);
      for (let k = 0; k < 4; k++) {
        const k2 = (k + 1) % 4, a0 = [A[k][0], y0, A[k][1]], a1 = [Z[k][0], y1, Z[k][1]], b0 = [A[k2][0], y0, A[k2][1]], b1 = [Z[k2][0], y1, Z[k2][1]];
        stick(b, rc, TOWER, a0, a1, unit.box); stick(b, rd, TOWER_L, a0, b1, unit.box); stick(b, rd, TOWER_L, b0, a1, unit.box);
      }
    }
  };
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
    const leg = yy => { const w = Wof(yy), i = w - Lof(yy); return [[sx * w, sz * w], [sx * i, sz * w], [sx * i, sz * i], [sx * w, sz * i]]; };
    b.box(0.56, 0.17, 0.56, BUFF, sx * 1.28, y, sz * 1.28).box(0.6, 0.03, 0.6, BUFF_D, sx * 1.28, y, sz * 1.28);
    lattice(leg, 0.2, P1, 6, 0.045, 0.02); lattice(leg, P1, P2, 7, 0.04, 0.018);
  }
  lattice(yy => { const w = Wof(yy); return [[w, w], [-w, w], [-w, -w], [w, -w]]; }, P2, TOP, 9, 0.035, 0.014);
  // The great arches between the legs under the first platform.
  for (const [ry, k] of [[0, 1], [0, -1], [Math.PI / 2, 1], [Math.PI / 2, -1]]) b.add(BIG_ARCH, TOWER, ry ? k * 0.98 : 0, 0.42, ry ? 0 : k * 0.98, 0.95, 0.84, 1, 0, ry, 0);
  // The platforms, their team friezes and rails; the kiosks on the first.
  for (const [py, w] of [[P1, Wof(P1) + 0.1], [P2, Wof(P2) + 0.08]]) {
    b.box(2 * w, 0.06, 2 * w, TOWER, 0, py, 0);
    for (const k of [-1, 1]) b.box(2 * w + 0.03, 0.1, 0.03, t, 0, py - 0.03, k * w).box(0.03, 0.1, 2 * w + 0.03, t, k * w, py - 0.03, 0);
    for (const k of [-1, 1]) b.box(2 * w, 0.015, 0.015, TOWER, 0, py + 0.16, k * w).box(0.015, 0.015, 2 * w, TOWER, k * w, py + 0.16, 0);
    for (let i = 0; i < 4; i++) for (const k of [-1, 1]) { const u = -w + (i + 0.5) * w / 2; b.box(0.012, 0.1, 0.012, TOWER, u, py + 0.06, k * w).box(0.012, 0.1, 0.012, TOWER, k * w, py + 0.06, u); }
  }
  const kw = Wof(P1) - 0.18;
  for (const [x, z, ry] of [[0, kw, 0], [kw, 0, Math.PI / 2], [0, -kw, 0], [-kw, 0, Math.PI / 2]]) b.box(0.56, 0.16, 0.14, ROOF_GLASS_D, x, P1 + 0.06, z, 0, ry).box(0.6, 0.03, 0.18, TOWER_L, x, P1 + 0.22, z, 0, ry);
  // The top: its little deck, the glazed lantern and dome, the flag.
  b.box(0.28, 0.04, 0.28, TOWER, 0, TOP, 0).cylT(0.09, 0.09, 0.18, ROOF_GLASS, 0, TOP + 0.04, 0, 8).cylT(0.11, 0.11, 0.02, TOWER, 0, TOP + 0.22, 0, 8);
  b.add(DOME, TOWER_L, 0, TOP + 0.24, 0, 0.1, 0.09, 0.1).add(BALL, td, 0, TOP + 0.34, 0, 0.025, 0.025, 0.025);
  flag(ctx, 0, TOP + 0.35, 0, 0.55, IRON_D);
  return TOP + 0.36;
}

// A domed iron gun turret for place(), built at the origin standing on y = 0 with its guns along +x: a granite base
// ring, the iron drum with its team band, the shallow dome and sighting hood, and twin guns run out of their mantlets.
const turret = t => {
  const g = new B();
  g.cylT(0.3, 0.31, 0.06, GRANITE_D, 0, 0, 0, 12).cylT(0.27, 0.27, 0.2, IRON, 0, 0.06, 0, 12).cylT(0.275, 0.275, 0.045, t, 0, 0.17, 0, 12);
  g.add(DOME, IRON, 0, 0.26, 0, 0.27, 0.12, 0.27).box(0.1, 0.05, 0.08, IRON_D, -0.06, 0.36, 0);
  for (const k of [-1, 1]) { g.box(0.07, 0.08, 0.07, IRON_D, 0.25, 0.13, k * 0.08); stick(g, 0.035, GUN, [0.18, 0.17, k * 0.08], [0.6, 0.18, k * 0.08], CYL8); }
  return g;
};

// Castle: an armoured fortress with gun turrets. A massive octagonal fort of granite on a grass glacis: its walls are
// faced in black iron armour, each face pierced by gun ports with the muzzles run out, under a buff cordon and a granite
// parapet. Four domed iron gun turrets, team-banded, with twin guns stand on the ramparts at the diagonals; at the centre
// the brick keep with iron-shuttered windows, its smoking chimneys, an iron observation cupola and the flagstaff. An iron
// gate with a team panel opens in the front face onto a gravel road.
export function castle(ctx) {
  const { b, s, h, t, extra } = ctx, y = 0.03, oct = Math.PI / 8, cos8 = Math.cos(oct);
  b.box(s, y, s, GRASS);
  // The glacis, the walls, the cordon, the parapet.
  const R = 1.46, wh = 0.78, wt = y + wh, a = R * cos8, fl = 2 * R * Math.sin(oct);
  b.cylT(1.72, 1.86, 0.14, GRASS_D, 0, y, 0, 8, 0, oct, 0).cylT(R + 0.04, R + 0.06, 0.1, GRANITE_D, 0, y, 0, 8, 0, oct, 0);
  b.cylT(R, R, wh, GRANITE, 0, y, 0, 8, 0, oct, 0).cylT(R + 0.02, R + 0.02, 0.05, BUFF, 0, wt - 0.08, 0, 8, 0, oct, 0);
  for (let i = 0; i < 8; i++) { const f = i * Math.PI / 4, [x, z] = [Math.sin(f) * (a - 0.06), Math.cos(f) * (a - 0.06)]; b.box(fl, 0.12, 0.12, GRANITE_D, x, wt, z, 0, f); }
  // The armour on the faces the camera sees, with gun ports and muzzles; the gate in the front face.
  for (const f of [-Math.PI / 4, 0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) {
    const at = onFace(0, 0, f), [px, pz] = at(0, a + 0.017), gate = f === 0;
    b.box(fl * 0.86, 0.4, 0.035, IRON_D, px, y + 0.18, pz, 0, f);
    for (const yy of [0.18, 0.56]) { const [bx, bz] = at(0, a + 0.036); b.box(fl * 0.86, 0.025, 0.012, IRON, bx, y + yy, bz, 0, f); }
    for (const u of gate ? [-0.38, 0.38] : [-0.32, 0.32]) { const [sx, sz] = at(u, a + 0.036); b.box(0.012, 0.4, 0.012, IRON, sx, y + 0.18, sz, 0, f); }
    for (const u of gate ? [-0.24, 0.24] : [-0.16, 0.16]) {
      const [gx, gz] = at(u, a + 0.036), [mx, mz] = at(u, a + 0.13);
      b.box(0.1, 0.09, 0.01, C.dark, gx, y + 0.34, gz, 0, f);
      stick(b, 0.03, GUN, [gx, y + 0.385, gz], [mx, y + 0.385, mz], CYL8);
    }
  }
  const gz = a + 0.04;
  b.box(0.26, 0.28, 0.02, IRON, 0, y + 0.1, gz).add(ARCH, IRON, 0, y + 0.38, gz, 0.13, 0.13, 1).add(ARCH_RING, BUFF, 0, y + 0.38, gz + 0.004, 0.15, 0.15, 0.2);
  b.box(0.14, 0.12, 0.024, t, 0, y + 0.18, gz + 0.002).box(0.012, 0.28, 0.026, IRON_D, 0, y + 0.1, gz + 0.004);
  b.box(0.34, 0.012, h - gz, GRAVEL, 0, y + 0.14, (gz + h) / 2);
  // The turrets on the ramparts.
  for (const [sx, sz] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) place(b, turret(t), sx * 0.66, wt, sz * 0.66, -Math.atan2(sz, sx));
  // The keep: walls, band, shuttered windows, chimneys and smoke, the cupola, the flag.
  const kr = 0.52, kh = 0.62, kt = wt + kh, ka = kr * cos8;
  b.cylT(kr, kr, kh, BRICK, 0, wt, 0, 8, 0, oct, 0).cylT(kr + 0.03, kr + 0.03, 0.05, BUFF, 0, kt - 0.05, 0, 8, 0, oct, 0);
  for (const f of [0, Math.PI / 4, Math.PI / 2]) {
    const at = onFace(0, 0, f);
    for (const yy of [wt + 0.12, wt + 0.36]) { const [x, z] = at(0, ka + 0.008); b.box(0.09, 0.15, 0.02, IRON_D, x, yy, z, 0, f).box(0.11, 0.03, 0.03, BUFF, x, yy + 0.15, z, 0, f); }
  }
  for (const [x, z, ph] of [[-0.26, -0.12, 0], [0.12, -0.3, 0.25]]) smoke(extra, x, chimney(b, x, kt, z, 0.3, 0.1), z, [ph, ph + 0.5]);
  b.cylT(0.12, 0.12, 0.08, IRON, 0.18, kt, 0.12, 10).add(DOME, IRON_D, 0.18, kt + 0.08, 0.12, 0.12, 0.08, 0.12);
  flag(ctx, -0.1, kt, 0.28, 0.7, IRON);
  return kt + 0.42;
}

// ---------- Industrial defences ----------
// Tower: a machine-gun nest on a brick tower. A square brick tower on a blue-brick plinth with buff string courses, a
// team band and cast-iron windows, a team-painted iron door at its foot and an iron ladder up its side. Its corbelled
// top is ringed with sandbags round a Maxim gun on its tripod behind a steel shield, ammunition boxes stencilled in
// team colour beside it, a searchlight on the back corner and the flag. Its shot is the gun's burst: a muzzle flash and
// a tracer (extra.fire), which blinks as the gun keeps firing.
export function tower(ctx) {
  const { b, t, extra } = ctx, W = 1.05, h = W / 2;
  b.box(1.76, 0.03, 1.76, SETT);
  const top = block(b, 0, 0, W, W, 2.0);
  for (const y of [0.75, 1.42]) b.box(W + 0.02, 0.05, W + 0.02, BUFF, 0, y, 0);
  b.box(W + 0.025, 0.1, W + 0.025, t, 0, 1.8, 0);
  iwins(b, 0, h, 0, W, 2, [0.95, 1.55], 0.12, 0.22); iwins(b, h, 0, Math.PI / 2, W, 2, [0.95, 1.55], 0.12, 0.22);
  b.box(0.3, 0.54, 0.02, IRON_D, 0, 0.11, h + 0.006).box(0.24, 0.5, 0.02, t, 0, 0.11, h + 0.012).box(0.36, 0.06, 0.03, BUFF, 0, 0.65, h + 0.012);
  // The iron ladder up the +x face.
  const lx = h + 0.05;
  for (const z of [-0.2, -0.38]) b.box(0.02, top + 0.3 - 0.11, 0.02, IRON_D, lx, 0.11, z);
  for (let y = 0.3; y < top + 0.3; y += 0.16) b.box(0.016, 0.016, 0.18, IRON, lx, y, -0.29);
  // The corbelled deck and its ring of sandbags.
  b.box(W + 0.12, 0.06, W + 0.12, BRICK_D, 0, top, 0).box(W + 0.22, 0.07, W + 0.22, BUFF_D, 0, top + 0.06, 0);
  const dy = top + 0.13, e = (W + 0.22) / 2 - 0.06;
  for (const [p, q] of [[[-e, e], [e, e]], [[e, e], [e, -e]], [[e, -e], [-e, -e]], [[-e, -e], [-e, e]]]) sandbags(b, p, q, 3, dy);
  // The Maxim gun on its tripod, firing over the bags toward the camera side, behind a steel shield.
  const d = [0.447, 0, 0.894], ry = Math.atan2(d[0], d[2]), gx = 0.02, gz = 0.06, gy = dy + 0.27, at = f => [gx + d[0] * f, gy, gz + d[2] * f];
  for (const a of [ry + Math.PI, ry + Math.PI / 3, ry - Math.PI / 3]) stick(b, 0.014, IRON_D, [gx + Math.sin(a) * 0.2, dy, gz + Math.cos(a) * 0.2], [gx, gy - 0.04, gz], CYL6);
  b.box(0.09, 0.09, 0.24, GUN, ...at(-0.04).map((v, i) => i === 1 ? v - 0.045 : v), 0, ry);
  stick(b, 0.045, IRON, at(0.08), at(0.4), CYL8); stick(b, 0.022, GUN, at(0.4), at(0.48), CYL6);
  b.box(0.34, 0.2, 0.02, IRON_D, ...at(0.14).map((v, i) => i === 1 ? v - 0.12 : v), 0, ry).box(0.3, 0.04, 0.024, t, ...at(0.14).map((v, i) => i === 1 ? v - 0.02 : v), 0, ry);
  for (const [x, z] of [[-0.3, 0.18], [-0.3, 0.36]]) crate(b, x, dy, z, 0.13, 0.3, t);
  searchlight(b, -0.36, dy, -0.36, [0.62, 0.22, 0.75]);
  flag(ctx, 0.44, dy, -0.44, 0.85, IRON);
  // The burst: a flash at the muzzle and a tracer streaking on from it.
  const fire = new B(), m = at(0.5);
  muzzleFlash(fire, m, d, 1.6);
  streak(fire, [m[0] + d[0] * 0.4, m[1], m[2] + d[2] * 0.4], [m[0] + d[0] * 1.2, m[1] - 0.1, m[2] + d[2] * 1.2], 0.02, undefined, P.ember, 0.05);
  extra.fire = { geo: fire.geometry(), at: [0, 0, 0] };
  return dy + 0.4;
}

// Wall: sandbags and barbed wire. Three courses of sandbags laid in bond, alternately along x and along z, on the bare
// ground, with team-painted iron pickets carrying a zigzag of barbed wire along the top both ways; it fills its tile
// edge to edge, so segments in a line close up into one breastwork and the wire runs on from one to the next.
export function wall(ctx) {
  const { b, t } = ctx, ch = 0.13;
  for (let c = 0; c < 3; c++) for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const u = (i - 1) * 0.34, v = (j - 0.5) * 0.52, [x, z] = c % 2 ? [v, u] : [u, v], k = hash(i + c * 3, j);
    const [w, d] = c % 2 ? [0.48, 0.32] : [0.32, 0.48], sx = Math.sign(x), sz = Math.sign(z);
    // The outer bags lie flush with the tile's edge; the rest sit a little apart.
    const bw = w - 0.02 - k * 0.02, bd = d - 0.02 - k * 0.015;
    b.box(bw, ch - 0.01, bd, k > 0.55 ? SAND_D : SAND, x + sx * (w - bw) / 2, c * ch, z + sz * (d - bd) / 2);
  }
  const y = 3 * ch - 0.01;
  for (const [x, z] of [[-0.245, 0], [0.245, 0], [0, -0.245], [0, 0.245]]) b.box(0.03, 0.34, 0.03, t, x, y, z);
  for (const axis of [0, 1]) for (let i = 0; i < 4; i++) {
    const u0 = -0.49 + i * 0.245, u1 = u0 + 0.245, y0 = y + (i % 2 ? 0.3 : 0.06), y1 = y + (i % 2 ? 0.06 : 0.3);
    stick(b, 0.015, CORR, axis ? [0, y0, u0] : [u0, y0, 0], axis ? [0, y1, u1] : [u1, y1, 0], unit.box);
  }
  return y + 0.34;
}
