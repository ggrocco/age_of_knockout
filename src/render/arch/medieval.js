// Medieval Age: grey stone and slate, oak framing over limewashed plaster, battlements and pointed arches, beside
// today's kept Castle (legacy.js). Half-timbered houses, a stone hall with a tall spired keep tower, a timber tithe barn,
// a store with a treadwheel crane, strip fields with haystacks, a stone barracks behind a gatehouse, timber archery
// butts, a stable with a hay loft, an arcaded market hall, a hall with a rose window and a gothic cathedral; for
// defence, a round castle tower with a bartizan and a battlemented curtain wall.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, stick, lerp, hash, place, horse, streak, CYL6, CYL8, DISC, BALL, CONE4, FRUSTUM, HORSE_HEAD, sack, barrel } from './kit.js';

export function house(ctx) {
  const { b, s, t } = ctx, W = s - 0.2, D = s - 0.3;
  b.box(W, 0.5, D, C.stone).box(W + 0.15, 0.55, D + 0.15, P.plaster, 0, 0.5, 0);
  for (const z of [-1, 1]) {
    for (const x of [-0.75, -0.25, 0.25, 0.75]) b.box(0.06, 0.55, 0.03, P.beam, x * (W + 0.15) / 1.6, 0.5, z * (D + 0.15) / 2);
    for (const [x, r] of [[-0.48, 0.6], [0.48, -0.6]]) b.box(0.05, 0.62, 0.03, P.beam, x, 0.52, z * (D + 0.15) / 2, 0, 0, r);
  }
  b.box(W + 0.2, 0.06, D + 0.2, P.beam, 0, 0.47, 0).box(W + 0.2, 0.06, D + 0.2, P.beam, 0, 1.03, 0);
  b.roof(s + 0.25, 1.0, s + 0.15, P.slate, 0, 1.06, 0).box(0.22, 0.95, 0.22, C.stoneD, 0.45, 1.06, -0.3);
  b.box(0.28, 0.42, 0.04, C.dark, -0.2, 0.0, D / 2 + 0.01).add(unit.tor, C.stoneD, -0.2, 0.42, D / 2 + 0.02, 0.14, 0.12, 0.14);
  for (const x of [-0.35, 0.35]) b.box(0.2, 0.22, 0.04, P.beam, x, 0.66, (D + 0.15) / 2 + 0.01).box(0.15, 0.17, 0.05, C.glass, x, 0.685, (D + 0.15) / 2 + 0.01);
  b.box(0.3, 0.06, 0.06, t, 0, 0.98, (D + 0.15) / 2 + 0.03);
  return 2.06;
}

export function town_center(ctx) {
  const { b, mast, extra, s, h, t } = ctx;
  // The hall, with arched doorways.
  b.box(s + 0.12, 0.12, s + 0.12, 0x756852).box(s - 0.6, 1.0, s * 0.6, C.stone, -0.25, 0.12, -0.25).roof(s - 0.45, 0.85, s * 0.62, P.slate, -0.25, 1.12, -0.25);
  for (const x of [-0.95, -0.45, 0.05]) b.box(0.12, 0.34, 0.04, C.dark, x, 0.55, -0.25 + s * 0.3 + 0.01).add(unit.tor, C.stoneD, x, 0.89, -0.25 + s * 0.3 + 0.02, 0.07, 0.07, 0.07);
  // The keep: crenellated, spired, with arrow slits, a gate and team banners.
  const tx = h - 0.55, tz = h - 0.55;
  b.box(0.95, 2.3, 0.95, 0x8c8a84, tx, 0.12, tz);
  for (const [ex, ez, ry] of [[0, -0.475, 0], [0, 0.475, 0], [-0.475, 0, Math.PI / 2], [0.475, 0, Math.PI / 2]]) for (let k = -0.4; k <= 0.41; k += 0.27) b.box(0.15, 0.18, 0.12, C.stoneD, tx + (ry ? ex : k), 2.42, tz + (ry ? k : ez), 0, ry);
  b.cone(0.6, 1.0, P.slate, tx, 2.42, tz, 4, Math.PI / 4);
  for (const y of [0.7, 1.3, 1.85]) b.box(0.06, 0.24, 0.04, C.dark, tx, y, tz + 0.48);
  b.box(0.5, 0.72, 0.06, C.dark, tx, 0.12, tz + 0.48).box(0.34, 0.6, 0.02, t, tx - 0.5, 1.2, tz + 0.48).box(0.34, 0.6, 0.02, t, tx + 0.5, 1.2, tz + 0.48);
  // The spire's flagpole carries the prototype's larger flag, a little above its tip; kit flag() would shrink it.
  mast.cyl(0.025, 0.7, C.woodD, tx, 3.38, tz);
  extra.flag = new B().box(0.025, 0.3, 0.55, t, 0, 0, 0.27).geometry(); extra.flagAt = [tx, 3.82, tz];
  return 3.42;
}

// ---------- shared Medieval parts ----------
// The Castle's grey stone and dark dressings, the Town Center's slate, the House's oak and plaster.
const STONE = C.stone, STONE_D = C.stoneD, STONE_L = 0xb4b1a6, SLATE = P.slate, SLATE_L = 0x5f6a77, SLATE_D = 0x3a434d;
const OAK = P.beam, PLASTER = P.plaster, BOARD = 0x6e4c2c, BOARD_L = 0x84623e, STRAW = C.hay, STRAW_D = 0xc9a548;
const YARD = 0x8a7d62, COBBLE = 0x8d887c, PAVE = 0xb3ae9f, GRASS = 0x6a8a3e, GRASS_L = 0x7e9c4c, TURF = 0x5b7a37;
const SOIL = 0x6a5233, SOIL_L = 0x7d6440, GLASS = 0x28323c, ROPE = 0xcbb98a;
// A point on a wall face centred at (x, z) facing along ry (0: +z): u along the face, o out from it.
const onFace = (x, z, ry) => (u, o = 0) => [x + u * Math.cos(ry) + o * Math.sin(ry), z - u * Math.sin(ry) + o * Math.cos(ry)];

// A slate gable roof built at the origin for place(): w wide, hh high and d long, its ridge along z, with alternate
// courses of lighter slate down both slopes and a dark ridge.
const slateRoof = (w, hh, d) => {
  const r = new B(), a = Math.atan2(hh, w / 2), L = Math.hypot(w / 2, hh);
  r.roof(w, hh, d, SLATE);
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) {
    const f = (i + 0.5) / 4;
    r.add(unit.box, i % 2 ? SLATE : SLATE_L, k * (w / 2 * f + Math.sin(a) * 0.012), hh * (1 - f) + Math.cos(a) * 0.012, 0, L / 4 + 0.01, 0.022, d + 0.03, 0, 0, -k * a);
  }
  return r.box(0.06, 0.05, d + 0.05, SLATE_D, 0, hh - 0.03, 0);
};
// A single-pitch slate roof built at the origin for place(): `width` along x, from its high back edge (z = -run / 2,
// y = rise) down to its low front edge (z = run / 2, y = 0), in three courses.
const slateLeanTo = (width, run, rise) => {
  const r = new B(), a = Math.atan2(rise, run), L = Math.hypot(run, rise) + 0.06;
  r.box(width, 0.035, L, SLATE, 0, rise / 2 - 0.0175, 0, a);
  for (let i = 0; i < 3; i++) { const f = (i + 0.5) / 3 - 0.5; r.add(unit.box, i % 2 ? SLATE : SLATE_L, 0, rise / 2 - f * rise + 0.018 * Math.cos(a), f * run + 0.018 * Math.sin(a), width + 0.01, 0.02, L / 3 - 0.01, a, 0, 0); }
  return r;
};
// The gable-end triangle w wide and hh high on y, a thin infill at the end of a roof (ridge along z; along x, alongX).
const gableEnd = (b, w, hh, c, x, y, z, alongX = false) => b.roof(w, hh, 0.02, c, x, y, z, alongX ? Math.PI / 2 : 0);
// Oak framing on a plastered wall face w wide and hh tall standing on y, centred at (x, z) and facing along ry (0: +z):
// posts every ~0.22, sill, middle and head rails, and a brace in each end panel.
const halfTimber = (b, x, y, z, w, hh, ry = 0) => {
  const at = onFace(x, z, ry), n = Math.max(2, Math.round(w / 0.22)), pw = w / n, ang = Math.atan2(hh / 2, pw);
  for (let i = 0; i <= n; i++) { const [px, pz] = at(-w / 2 + i * pw, 0.012); b.box(0.04, hh, 0.025, OAK, px, y, pz, 0, ry); }
  const [mx, mz] = at(0, 0.012);
  for (const yy of [0, hh / 2 - 0.0175, hh - 0.035]) b.box(w + 0.02, 0.035, 0.025, OAK, mx, y + yy, mz, 0, ry);
  for (const k of [-1, 1]) { const [px, pz] = at(k * (w / 2 - pw / 2), 0.012); b.add(unit.box, OAK, px, y + hh / 4, pz, Math.hypot(pw, hh / 2), 0.03, 0.025, 0, ry, k * ang); }
};
// A pointed (lancet) opening w wide on a wall face, its sill at y and its point at y + hh, facing along ry (0: +z).
const lancet = (b, x, y, z, w, hh, ry = 0, c = C.dark) => {
  const k = w / Math.SQRT2;
  b.box(w, hh - w / 2, 0.02, c, x, y, z, 0, ry).add(unit.box, c, x, y + hh - w / 2, z, k, k, 0.02, 0, ry, Math.PI / 4);
};
// A stepped stone buttress hh tall standing on y against a wall face at (x, z), projecting along ry (0: +z).
const buttress = (b, x, y, z, hh, ry = 0, c = STONE_D) => {
  const [ax, az] = onFace(x, z, ry)(0, 0.07), [bx, bz] = onFace(x, z, ry)(0, 0.045);
  b.box(0.1, hh * 0.62, 0.14, c, ax, y, az, 0, ry).box(0.08, hh * 0.38, 0.09, c, bx, y + hh * 0.62, bz, 0, ry);
};
// A battlemented stone wall from (x1, z1) to (x2, z2), hh tall and th thick, standing on y, merlons along its top.
const curtain = (b, [x1, z1], [x2, z2], y, hh, th = 0.16) => {
  const L = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(-(z2 - z1), x2 - x1), n = Math.max(1, Math.round(L / 0.24));
  b.box(L + th, hh, th, STONE, (x1 + x2) / 2, y, (z1 + z2) / 2, 0, ry);
  for (let i = 0; i <= n; i++) { const f = i / n; b.box(0.12, 0.13, th + 0.02, STONE_D, x1 + (x2 - x1) * f, y + hh, z1 + (z2 - z1) * f, 0, ry); }
};
// Merlons round the top (y) of a square block w × d centred at (x, z).
const battlements = (b, x, y, z, w, d, c = STONE_D) => {
  for (const k of [-1, 1]) {
    for (let i = 0, n = Math.max(1, Math.round(w / 0.2)); i <= n; i++) b.box(0.1, 0.12, 0.08, c, x - w / 2 + i * w / n, y, z + k * (d / 2 - 0.04));
    for (let i = 1, n = Math.max(1, Math.round(d / 0.2)); i < n; i++) b.box(0.08, 0.12, 0.1, c, x + k * (w / 2 - 0.04), y, z - d / 2 + i * d / n);
  }
};
// A heater shield built at the origin for place(), facing +z, its point at y = 0: team-painted with a gold cross.
const heater = t => new B().box(0.15, 0.08, 0.02, t, 0, 0.085, 0).add(unit.box, t, 0, 0.075, 0, 0.106, 0.106, 0.02, 0, 0, Math.PI / 4)
  .box(0.022, 0.13, 0.024, C.gold, 0, 0.02, 0).box(0.11, 0.022, 0.024, C.gold, 0, 0.11, 0);
// A rose window of radius R built at the origin for place(), facing +z: a stone ring and tracery over dark glass, with
// petals of team colour and gold round a team boss.
const rose = (t, R) => {
  const r = new B(), disc = (c, rr, z) => r.add(DISC, c, 0, 0, z, rr, 0.02, rr, Math.PI / 2, 0, 0);
  disc(STONE_D, R + 0.05, 0); disc(GLASS, R, 0.01);
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; r.add(DISC, i % 2 ? C.gold : t, Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 0.02, R * 0.27, 0.02, R * 0.27, Math.PI / 2, 0, 0); }
  for (let i = 0; i < 4; i++) r.add(unit.box, STONE_L, 0, 0, 0.032, R * 2, R * 0.07, 0.012, 0, 0, i * Math.PI / 4 + Math.PI / 8);
  disc(t, R * 0.25, 0.03); disc(STONE_L, R * 0.09, 0.04);
  return r;
};
// A conical haystack of radius r and height hh standing on y, with its stack pole poking out of the top.
const haystack = (b, x, z, r = 0.17, hh = 0.44, y = 0.03) => {
  b.cylT(r * 0.94, r, hh * 0.46, STRAW, x, y, z, 8).cone(r * 1.05, hh * 0.58, STRAW_D, x, y + hh * 0.42, z, 8);
  b.cylT(r * 0.96, r * 0.96, 0.025, 0xb8953e, x, y + hh * 0.36, z, 8).cylT(0.012, 0.012, 0.1, C.woodD, x, y + hh * 0.95, z, 4);
};
// A two-wheeled cart facing +x built at the origin for place(); load(c) piles its goods on the bed (top at y = 0.19).
const cart = load => {
  const c = new B();
  for (const k of [-1, 1]) c.add(unit.cyl, C.woodD, 0, 0.12, k * 0.15, 0.12, 0.03, 0.12, Math.PI / 2, 0, 0).add(CYL6, OAK, 0, 0.12, k * 0.168, 0.03, 0.02, 0.03, Math.PI / 2, 0, 0);
  c.box(0.5, 0.04, 0.26, C.wood, 0, 0.15, 0).box(0.5, 0.08, 0.02, C.woodD, 0, 0.19, 0.12).box(0.5, 0.08, 0.02, C.woodD, 0, 0.19, -0.12).box(0.02, 0.08, 0.26, C.woodD, -0.25, 0.19, 0);
  for (const k of [-1, 1]) stick(c, 0.014, C.wood, [0.24, 0.17, k * 0.07], [0.6, 0.04, k * 0.07], CYL6);
  load(c);
  return c;
};
// A sheaf stook: three sheaves of wheat leant together, on y.
const stook = (b, x, z, y = 0.03) => {
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + x * 7; b.add(CONE4, STRAW_D, x + Math.cos(a) * 0.035, y + 0.11, z + Math.sin(a) * 0.035, 0.05, 0.22, 0.05, Math.sin(a) * 0.25, a, -Math.cos(a) * 0.25); }
  b.add(CYL6, 0xb8953e, x, y + 0.12, z, 0.05, 0.03, 0.05);
};

// Granary: a timber tithe barn. Weatherboarded walls between oak posts on a stone plinth under a huge, steep slate
// roof, its ridge along x, with boarded gable ends (a team loft door in the +x one); a cart porch (midstrey) on the
// long +z side with great team-painted doors and the flag on the ridge. Before it a cart of sacks, sacks by the doors and
// stooks of wheat waiting to come in.
export function granary(ctx) {
  const { b, s, t } = ctx, x0 = -0.84, x1 = 0.72, z0 = -0.68, z1 = 0.12, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, L = x1 - x0, D = z1 - z0;
  const py = 0.15, wh = 0.4, top = py + wh, rw = D + 0.26, rh = 0.82;
  b.box(s, 0.03, s, YARD);
  // The plinth, the boarded walls with battens and the oak frame.
  b.box(L + 0.04, py - 0.03, D + 0.04, STONE, cx, 0.03, cz).box(L, wh, D, BOARD, cx, py, cz);
  for (let x = x0 + 0.05; x < x1 - 0.02; x += 0.1) b.box(0.028, wh, 0.012, BOARD_L, x, py, z1 + 0.006);
  for (let z = z0 + 0.05; z < z1 - 0.02; z += 0.1) b.box(0.012, wh, 0.028, BOARD_L, x1 + 0.006, py, z);
  for (const x of [x0 + 0.03, x0 + 0.4, 0.37, x1 - 0.03]) b.box(0.06, wh, 0.05, OAK, x, py, z1 + 0.005);
  for (const z of [z0 + 0.03, z1 - 0.03]) b.box(0.05, wh, 0.06, OAK, x1 + 0.005, py, z);
  b.box(L + 0.06, 0.05, D + 0.06, OAK, cx, top - 0.05, cz);
  for (const z of [cz - 0.2, cz + 0.2]) b.box(0.014, 0.16, 0.035, C.dark, x1 + 0.014, py + 0.12, z);
  // The roof and its boarded gable ends, the team loft door in the +x one.
  place(b, slateRoof(rw, rh, L + 0.04), cx, top, cz, Math.PI / 2);
  const gw = rw - 0.1, gh = rh * gw / rw, gx = x1 + 0.034;
  for (const x of [gx, x0 - 0.034]) gableEnd(b, gw, gh, BOARD, x, top, cz, true);
  for (let i = 1; i < 8; i++) { const z = cz - gw / 2 + i * gw / 8, hh = gh * (1 - Math.abs(z - cz) / (gw / 2)); b.box(0.012, hh * 0.96, 0.026, BOARD_L, gx + 0.012, top, z); }
  b.box(0.016, 0.22, 0.2, OAK, gx + 0.018, top + 0.08, cz).box(0.016, 0.18, 0.16, t, gx + 0.024, top + 0.1, cz);
  flag(ctx, x0 + 0.12, top + rh - 0.02, cz, 0.45);
  // The midstrey: a gabled cart porch with great team doors, Z-braced in oak.
  const px = -0.06, pw = 0.58, pz = z1 + 0.42;
  b.box(pw + 0.04, py - 0.03, pz - z1, STONE, px, 0.03, (z1 + pz) / 2);
  for (const k of [-1, 1]) b.box(0.05, wh, pz - z1, BOARD, px + k * (pw / 2 - 0.025), py, (z1 + pz) / 2).box(0.06, wh, 0.06, OAK, px + k * pw / 2, py, pz);
  b.box(pw + 0.06, 0.06, 0.06, OAK, px, top - 0.06, pz);
  const dw = (pw - 0.08) / 2, dh = wh - 0.07;
  for (const k of [-1, 1]) {
    const dx = px + k * dw / 2;
    b.box(dw - 0.01, dh, 0.025, t, dx, py, pz - 0.01);
    for (const yy of [0.04, dh - 0.07]) b.box(dw - 0.03, 0.03, 0.012, OAK, dx, py + yy, pz + 0.006);
    b.add(unit.box, OAK, dx, py + dh / 2, pz + 0.006, Math.hypot(dw - 0.04, dh - 0.1), 0.03, 0.012, 0, 0, k * Math.atan2(dh - 0.1, dw - 0.04));
  }
  const prw = pw + 0.18, prh = 0.48;
  place(b, slateRoof(prw, prh, pz - z1 + 0.34), px, top, (pz + z1 - 0.32) / 2);
  gableEnd(b, prw - 0.08, prh * (prw - 0.08) / prw, BOARD, px, top, pz + 0.022);
  // A cart of sacks, sacks by the doors, stooks of wheat.
  place(b, cart(c => { for (const [dx, dy, dz] of [[-0.14, 0, -0.06], [0, 0, 0.06], [0.13, 0, -0.05], [-0.06, 0.11, 0], [0.08, 0.11, 0.02]]) sack(c, dx, 0.19 + dy, dz, 0.07); }), 0.42, 0.03, 0.72, -0.35);
  for (const [x, z] of [[0.33, 0.66], [0.3, 0.48]]) sack(b, x, 0.03, z, 0.08);
  for (const [x, z] of [[-0.68, 0.42], [-0.48, 0.68], [-0.74, 0.76], [-0.28, 0.82]]) stook(b, x, z);
  return top + rh + 0.03;
}

// The treadwheel built at the origin, its axle along z (it turns about z): two oak rims joined by treads (two of them
// team-painted, so the turning shows) and spoked to the axle.
const treadwheel = (t, R, w) => {
  const g = new B(), rim = new THREE.TorusGeometry(R, 0.028, 4, 16);
  for (const k of [-1, 1]) {
    g.add(rim, C.wood, 0, 0, k * w / 2, 1, 1, 1);
    for (let i = 0; i < 4; i++) g.add(unit.box, C.woodD, 0, 0, k * w / 2, R * 2, 0.034, 0.03, 0, 0, i * Math.PI / 4 + (k > 0 ? Math.PI / 8 : 0));
  }
  for (let i = 0; i < 14; i++) { const a = i * Math.PI / 7; g.add(unit.box, i % 7 ? C.wood : t, Math.cos(a) * R, Math.sin(a) * R, 0, 0.03, 0.07, w + 0.05, 0, 0, a); }
  rim.dispose();
  return g.add(CYL8, OAK, 0, 0, 0, 0.055, w + 0.1, 0.055, Math.PI / 2, 0, 0).geometry();
};
// Storage Pit: a timber store and a treadwheel crane. The store has a stone ground floor with team doors and shutters
// under a jettied, half-timbered upper floor and a slate roof flying the flag. The crane's treadwheel (an animated
// spinner) turns on its trestles and winds the rope up the post and along the jib to a block of stone; the wood, stone
// and gold brought in lie about the cobbled yard: logs half under a team cloth, dressed stone, a strongbox and barrels.
export function storage_pit(ctx) {
  const { b, s, t, extra } = ctx, x0 = -0.86, x1 = 0.16, z0 = -0.86, z1 = -0.22, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const g = 0.38, u = 0.36, j = 0.06, fy = 0.03 + g, uy = fy + 0.04;
  b.box(s, 0.03, s, COBBLE);
  // The stone ground floor: quoins, the team doors under an oak lintel, a shuttered window on the +x side.
  b.box(W, g, D, STONE, cx, 0.03, cz);
  for (let i = 0; i < 4; i++) b.box(i % 2 ? 0.08 : 0.14, g / 4 - 0.01, 0.014, STONE_L, x1 - (i % 2 ? 0.04 : 0.07), 0.035 + i * g / 4, z1 + 0.007).box(0.014, g / 4 - 0.01, i % 2 ? 0.14 : 0.08, STONE_L, x1 + 0.007, 0.035 + i * g / 4, z1 - (i % 2 ? 0.07 : 0.04));
  const dx = cx - 0.1;
  b.box(0.36, 0.3, 0.014, t, dx, 0.03, z1 + 0.007).box(0.014, 0.3, 0.02, C.dark, dx, 0.03, z1 + 0.012).box(0.44, 0.06, 0.04, OAK, dx, 0.33, z1 + 0.012);
  for (const yy of [0.09, 0.24]) b.box(0.32, 0.018, 0.02, P.iron, dx, yy, z1 + 0.015);
  b.box(0.014, 0.14, 0.12, C.dark, x1 + 0.007, 0.16, cz).box(0.014, 0.14, 0.06, t, x1 + 0.012, 0.16, cz - 0.1).box(0.014, 0.14, 0.06, t, x1 + 0.012, 0.16, cz + 0.1);
  // The jetty: joist ends under the upper floor, which overhangs the +z and +x faces.
  const ux1 = x1 + j, uz1 = z1 + j, ucx = (x0 + ux1) / 2, ucz = (z0 + uz1) / 2, UW = ux1 - x0, UD = uz1 - z0;
  b.box(UW, 0.04, UD, OAK, ucx, fy, ucz);
  for (let x = x0 + 0.06; x < ux1; x += 0.12) b.box(0.03, 0.03, j, OAK, x, fy - 0.03, z1 + j / 2);
  b.box(UW, u, UD, PLASTER, ucx, uy, ucz);
  halfTimber(b, ucx, uy, uz1, UW, u, 0); halfTimber(b, ux1, uy, ucz, UD, u, Math.PI / 2);
  for (const x of [ucx - 0.3, ucx + 0.25]) b.box(0.13, 0.12, 0.02, GLASS, x, uy + 0.2, uz1 + 0.02);
  b.box(0.02, 0.12, 0.13, GLASS, ux1 + 0.02, uy + 0.2, ucz);
  // The roof, its half-timbered +x gable, and the flag.
  const top = uy + u, rw = UD + 0.22, rh = 0.48;
  place(b, slateRoof(rw, rh, UW + 0.06), ucx, top, ucz, Math.PI / 2);
  const gw = rw - 0.1, gh = rh * gw / rw;
  gableEnd(b, gw, gh, PLASTER, ux1 + 0.042, top, ucz, true);
  b.box(0.026, gh * 0.9, 0.04, OAK, ux1 + 0.054, top, ucz).box(0.026, 0.035, gw - 0.04, OAK, ux1 + 0.054, top, ucz);
  flag(ctx, x0 + 0.12, top + rh - 0.02, ucz, 0.45);
  // The treadwheel crane: trestles carrying the wheel's axle, the post and jib, the rope, and the stone on the hook.
  const wx = 0.5, wy = 0.45, wz = 0.36, R = 0.36, ww = 0.22;
  for (const zt of [wz - ww / 2 - 0.07, wz + ww / 2 + 0.07]) {
    b.box(0.66, 0.04, 0.05, OAK, wx, 0.03, zt);
    for (const k of [-1, 1]) stick(b, 0.022, C.woodD, [wx + k * 0.27, 0.06, zt], [wx, wy + 0.04, zt], unit.box);
    b.box(0.07, 0.07, 0.06, OAK, wx, wy - 0.035, zt).box(0.34, 0.025, 0.025, C.woodD, wx, 0.22, zt);
  }
  b.add(CYL8, OAK, wx, wy, wz, 0.028, ww + 0.34, 0.028, Math.PI / 2, 0, 0);
  extra.spinners = [{ geo: treadwheel(t, R, ww), at: [wx, wy, wz], axis: 'z', speed: 0.9 }];
  const pz = wz - ww / 2 - 0.2, tip = [0.86, 1.62, -0.42], pTop = [wx, 1.38, pz];
  b.box(0.16, 0.06, 0.16, STONE_D, wx, 0.03, pz).box(0.08, 1.36, 0.08, C.woodD, wx, 0.09, pz);
  stick(b, 0.03, C.wood, [wx, 1.18, pz], tip, unit.box); stick(b, 0.02, C.woodD, [wx, 0.8, pz], lerp([wx, 1.18, pz], tip, 0.45), unit.box);
  b.add(CYL8, OAK, wx, 1.4, pz, 0.06, 0.04, 0.06, Math.PI / 2, 0, 0).add(CYL8, OAK, tip[0], tip[1] - 0.02, tip[2], 0.045, 0.04, 0.045, Math.PI / 2, 0, Math.PI / 4);
  stick(b, 0.008, ROPE, [wx, wy, wz - ww / 2 - 0.12], pTop, CYL6); stick(b, 0.008, ROPE, pTop, [tip[0], tip[1] - 0.05, tip[2]], CYL6);
  stick(b, 0.008, ROPE, [tip[0], tip[1] - 0.05, tip[2]], [tip[0], 0.66, tip[2]], CYL6);
  b.box(0.05, 0.03, 0.05, P.iron, tip[0], 0.63, tip[2]);
  for (const k of [-1, 1]) stick(b, 0.006, ROPE, [tip[0], 0.64, tip[2]], [tip[0] + k * 0.09, 0.52, tip[2]], CYL6);
  b.box(0.22, 0.14, 0.18, STONE_L, tip[0], 0.38, tip[2]);
  // Logs half under a team cloth, dressed stone, the strongbox of gold, barrels.
  for (const [i, [x, y]] of [[-0.74, 0.03], [-0.6, 0.03], [-0.46, 0.03], [-0.67, 0.15], [-0.53, 0.15]].entries()) stick(b, 0.065, i % 2 ? C.woodD : C.wood, [x, y + 0.065, 0.06], [x, y + 0.065, 0.66], CYL6);
  for (const k of [-1, 1]) b.box(0.17, 0.014, 0.3, t, -0.6 + k * 0.075, 0.25, 0.48, 0, 0, -k * 0.55);
  for (const [x, z, ry] of [[-0.24, 0.12, 0.1], [-0.12, 0.3, -0.25]]) b.box(0.2, 0.14, 0.15, STONE_L, x, 0.03, z, 0, ry);
  b.box(0.18, 0.12, 0.14, STONE, -0.2, 0.17, 0.2, 0, 0.35);
  const gx = -0.28, gz = 0.62;
  b.box(0.24, 0.14, 0.16, C.wood, gx, 0.03, gz).box(0.26, 0.03, 0.18, P.iron, gx, 0.17, gz).box(0.03, 0.15, 0.17, P.iron, gx - 0.08, 0.03, gz).box(0.03, 0.15, 0.17, P.iron, gx + 0.08, 0.03, gz);
  for (const [x, z] of [[-0.04, 0.0], [0.04, 0.03], [0.0, -0.04]]) b.cylT(0.03, 0.03, 0.02, C.gold, gx + x, 0.2, gz + z, 6);
  barrel(b, 0.04, 0.03, 0.78); barrel(b, -0.06, 0.03, 0.9, 0.065); barrel(b, 0.16, 0.03, 0.88, 0.065);
  return tip[1] + 0.04;
}
// Farm: strip fields. Five long strips of ridge and furrow between grass balks, ending at a grass headland: a hay
// meadow with three haystacks, two strips of wheat and one of barley (extra.crops, which animate() shows once the farm is
// finished and shrinks as the food runs out), and one ploughed and fallow, the plough left at its end. A scarecrow in a
// team tunic keeps the barley, a hay rake leans on a stack, team-capped stakes mark the strips' ends and the flag flies
// from the headland.
export function farm(ctx) {
  const { b, s, h, t, extra } = ctx, xs = [-0.68, -0.34, 0, 0.34, 0.68], sw = 0.3, z0 = -h + 0.02, z1 = 0.74, L = z1 - z0, cz = (z0 + z1) / 2;
  b.box(s, 0.03, s, SOIL);
  b.box(s, 0.02, h - z1, GRASS, 0, 0.03, (z1 + h) / 2);
  for (const x of [-0.51, -0.17, 0.17, 0.51]) b.box(0.04, 0.025, L, GRASS, x, 0.03, cz);
  // Each strip's ridges; the meadow is grassed over, the fallow strip freshly ploughed.
  for (const [i, x] of xs.entries()) {
    if (i === 0) { b.box(sw, 0.015, L, GRASS_L, x, 0.03, cz); continue; }
    for (const o of [-0.09, 0, 0.09]) b.box(0.07, 0.016, L - 0.02, i === 2 ? SOIL_L : 0x5e482c, x + o, 0.03, cz);
  }
  // The meadow's haystacks, a hay rake against one.
  for (const [z, r] of [[-0.58, 0.17], [-0.14, 0.16], [0.3, 0.17]]) haystack(b, xs[0], z, r, 0.44 + r);
  stick(b, 0.01, C.wood, [xs[0] + 0.2, 0.03, 0.38], [xs[0] + 0.1, 0.5, 0.33], CYL6);
  // A plough left at the end of the fallow strip.
  stick(b, 0.018, C.woodD, [0.0, 0.07, 0.45], [0.0, 0.07, 0.72], unit.box); stick(b, 0.014, C.woodD, [0.0, 0.07, 0.48], [-0.05, 0.3, 0.36], unit.box); stick(b, 0.014, C.woodD, [0.0, 0.07, 0.48], [0.05, 0.3, 0.36], unit.box);
  b.box(0.05, 0.03, 0.1, P.iron, 0, 0.04, 0.72);
  // The scarecrow among the barley, in a team tunic and straw hat.
  const sx = xs[3], sz = 0.12;
  b.box(0.03, 0.5, 0.03, C.woodD, sx, 0.03, sz).box(0.3, 0.025, 0.025, C.woodD, sx, 0.4, sz);
  b.box(0.15, 0.2, 0.08, t, sx, 0.24, sz).box(0.1, 0.06, 0.06, t, sx - 0.11, 0.37, sz).box(0.1, 0.06, 0.06, t, sx + 0.11, 0.37, sz);
  b.add(BALL, C.cloth, sx, 0.5, sz, 0.055, 0.06, 0.055).cone(0.09, 0.07, STRAW, sx, 0.53, sz, 8);
  // Team-capped stakes at the strips' ends, and the flag over the headland.
  for (const x of [-0.51, -0.17, 0.17, 0.51]) b.box(0.03, 0.2, 0.03, C.woodD, x, 0.03, z1 + 0.02).box(0.045, 0.05, 0.045, t, x, 0.2, z1 + 0.02);
  flag(ctx, -h + 0.08, 0.05, h - 0.36, 0.62, C.woodD, [0.2, 0.34]);
  // Wheat and barley in rows along the ridges, ripening unevenly; clear of the scarecrow.
  const cr = new B();
  for (const [x, ripe] of [[xs[1], 0xc9a84a], [xs[3], 0x7f9a3a], [xs[4], 0xd2ae4e]]) {
    for (let r = 0; r < 13; r++) for (const [k, o] of [-0.09, 0, 0.09].entries()) {
      const z = z0 + 0.08 + r * 0.124 + (hash(r, k) - 0.5) * 0.03, xx = x + o + (hash(k + 3, r) - 0.5) * 0.02;
      if (Math.hypot(xx - sx, z - sz) < 0.11) continue;
      const hh = 0.17 + hash(r + 5, k + Math.round(x * 10)) * 0.07, lean = (hash(r * 3, k + 1) - 0.5) * 0.3, ear = ripe === 0x7f9a3a ? 0xa8b858 : 0xe2c050;
      cr.add(CONE4, ripe, xx, 0.045 + hh / 2, z, 0.05, hh, 0.05, lean, 0, -lean);
      cr.add(CONE4, ear, xx + Math.sin(lean) * hh * 0.5, 0.045 + hh * 0.95, z + Math.sin(lean) * hh * 0.25, 0.03, 0.1, 0.03, lean, 0, -lean);
    }
  }
  extra.crops = cr.geometry();
  return 0.7;
}

// Barracks: a stone barracks behind a gatehouse. A battlemented curtain wall closes a trodden yard; at the front the
// gatehouse, two square towers either side of a pointed gate with its portcullis half raised, a team shield over it,
// team banners on the towers and the flag; at the back the barrack hall, lancet windows between buttresses, a team door,
// a slate roof and a chimney. In the yard: a quintain with a team shield, pells for sword drill and a rack of spears
// and team shields.
export function barracks(ctx) {
  const { b, s, h, t } = ctx, e = h - 0.12, y = 0.05, wh = 0.46;
  b.box(s, y, s, YARD);
  // The curtain wall, broken at the front for the gatehouse.
  curtain(b, [-e, -e], [e, -e], y, wh); curtain(b, [-e, -e], [-e, e], y, wh); curtain(b, [e, -e], [e, e], y, wh);
  for (const k of [-1, 1]) curtain(b, [k * e, e], [k * 0.6, e], y, wh);
  // The gatehouse: its block, the two towers with slits and banners, the gate and portcullis, the shield over it.
  const g0 = e - 0.3, g1 = e + 0.16, gc = (g0 + g1) / 2, gh = 1.1, th = 1.42, tz = g1 - 0.14;
  b.box(0.9, gh, g1 - g0, STONE, 0, y, gc); battlements(b, 0, y + gh, gc, 0.9, g1 - g0);
  for (const k of [-1, 1]) {
    const tx = k * 0.5;
    b.box(0.36, th, 0.44, STONE, tx, y, tz).box(0.38, 0.04, 0.46, STONE_D, tx, y + 0.95, tz); battlements(b, tx, y + th, tz, 0.36, 0.44);
    b.box(0.04, 0.2, 0.02, C.dark, tx, y + 1.08, tz + 0.225).box(0.02, 0.2, 0.04, C.dark, tx + k * 0.185, y + 0.6, tz);
    b.box(0.16, 0.42, 0.012, t, tx, y + 0.42, tz + 0.226).box(0.2, 0.025, 0.025, C.gold, tx, y + 0.84, tz + 0.23);
  }
  lancet(b, 0, y, g1 + 0.002, 0.36, 0.66);
  for (let i = -2; i <= 2; i++) b.box(0.018, 0.34, 0.02, P.iron, i * 0.065, y + 0.24, g1 + 0.016).cone(0.012, 0.04, P.iron, i * 0.065, y + 0.2, g1 + 0.016, 4);
  for (const yy of [0.32, 0.46]) b.box(0.3, 0.018, 0.02, P.iron, 0, y + yy, g1 + 0.018);
  place(b, heater(t), 0, y + 0.72, g1 + 0.012, 0, 1.5);
  flag(ctx, 0.5, y + th + 0.12, tz, 0.55);
  // The hall: lancets between buttresses, the team door under a stone arch, the roof, stone gables and a chimney.
  const hx = 1.06, hz0 = -e + 0.08, hz1 = -0.5, hcz = (hz0 + hz1) / 2, hd = hz1 - hz0, hh = 0.78;
  b.box(2 * hx, hh, hd, STONE, 0, y, hcz);
  for (const x of [-0.92, -0.62, -0.3, 0.3, 0.62, 0.92]) lancet(b, x, y + 0.3, hz1 + 0.011, 0.11, 0.36);
  for (const x of [-0.77, -0.46, 0.46, 0.77]) buttress(b, x, y, hz1, hh);
  lancet(b, 0, y, hz1 + 0.011, 0.3, 0.56, 0, STONE_D); lancet(b, 0, y, hz1 + 0.021, 0.22, 0.48, 0, t);
  for (let i = 0; i < 3; i++) lancet(b, hx + 0.011, y + 0.3, hcz - 0.2 + i * 0.2, 0.09, 0.32, Math.PI / 2);
  place(b, slateRoof(hd + 0.18, 0.5, 2 * hx + 0.06), 0, y + hh, hcz, Math.PI / 2);
  for (const k of [-1, 1]) gableEnd(b, hd + 0.08, 0.5 * (hd + 0.08) / (hd + 0.18), STONE, k * (hx + 0.042), y + hh, hcz, true);
  b.box(0.17, 0.66, 0.17, STONE_D, 0.72, y + hh, hcz - 0.06).box(0.21, 0.05, 0.21, STONE, 0.72, y + hh + 0.66, hcz - 0.06);
  // The yard: the path from the gate, a quintain, pells and the weapon rack.
  b.box(0.38, 0.008, g0 - hz1, COBBLE, 0, y, (g0 + hz1) / 2);
  const qx = -0.6, qz = 0.15;
  b.box(0.06, 0.56, 0.06, C.woodD, qx, y, qz).box(0.06, 0.04, 0.06, P.iron, qx, y + 0.56, qz);
  stick(b, 0.018, C.wood, [qx - 0.24, y + 0.58, qz + 0.06], [qx + 0.22, y + 0.58, qz - 0.06], unit.box);
  place(b, heater(t), qx - 0.25, y + 0.46, qz + 0.08, 0.25, 1.1);
  stick(b, 0.006, ROPE, [qx + 0.21, y + 0.57, qz - 0.06], [qx + 0.21, y + 0.4, qz - 0.06], CYL6);
  b.add(BALL, C.cloth, qx + 0.21, y + 0.35, qz - 0.06, 0.06, 0.08, 0.06);
  for (const [x, z] of [[-0.95, -0.15], [-0.75, 0.62], [-0.32, 0.6]]) b.box(0.08, 0.42, 0.08, C.wood, x, y, z).box(0.1, 0.03, 0.1, C.woodD, x, y + 0.42, z);
  const rx = 0.66, rz = 0.05;
  for (const dx of [-0.24, 0.24]) b.box(0.05, 0.5, 0.05, C.woodD, rx + dx, y, rz);
  b.box(0.54, 0.035, 0.05, C.wood, rx, y + 0.46, rz).box(0.54, 0.035, 0.05, C.wood, rx, y + 0.12, rz + 0.08);
  for (let i = 0; i < 5; i++) { const x = rx - 0.18 + i * 0.09; stick(b, 0.009, C.wood, [x, y + 0.02, rz + 0.12], [x - 0.01, y + 0.82, rz - 0.02], CYL6); b.cone(0.016, 0.07, P.iron, x - 0.01, y + 0.82, rz - 0.02, 4); }
  for (const dx of [-0.16, 0, 0.16]) place(b, heater(t), rx + dx, y + 0.26, rz + 0.04, 0, 0.95);
  return y + th + 0.12;
}

// Archery Range: timber butts and targets on a green. Three butts at the back, each a turf bank faced with oak planks
// between posts and a straw boss painted with team and white rings round a gold heart, arrows in it; mown lanes with
// distance pegs run back to the shooting line, a team pavise and a quiver at each mark. At the front an open timber
// shooting shed under slate holds a bow rack and arrow barrels under the flag; a post-and-rail fence closes the right.
export function archery_range(ctx) {
  const { b, s, h, t } = ctx, y = 0.05, lanes = [-0.84, 0, 0.84], bz = -h + 0.3, line = 0.6;
  b.box(s, y, s, GRASS);
  for (const x of lanes) b.box(0.56, 0.008, 1.95, GRASS_L, x, y, -0.18);
  for (const [i, x] of lanes.entries()) {
    b.add(FRUSTUM, TURF, x, y + 0.25, bz - 0.06, 0.36, 0.5, 0.17);
    for (let k = 0; k < 6; k++) b.box(0.105, 0.46, 0.03, k % 2 ? C.wood : 0x8a6238, x - 0.26 + k * 0.104, y, bz + 0.13);
    for (const k of [-1, 1]) b.box(0.06, 0.54, 0.06, OAK, x + k * 0.33, y, bz + 0.14);
    b.box(0.74, 0.05, 0.07, OAK, x, y + 0.49, bz + 0.14);
    const ty = y + 0.28, tz = bz + 0.15;
    for (const [c, r, dz] of [[STRAW, 0.18, 0.03], [t, 0.15, 0.06], [0xf2efe6, 0.105, 0.064], [t, 0.065, 0.068], [C.gold, 0.03, 0.072]]) b.add(DISC, c, x, ty, tz + dz, r, c === STRAW ? 0.06 : 0.01, r, Math.PI / 2, 0, 0);
    for (const [dx, dy] of [[0.05, 0.04], [-0.08, -0.05], [0.02, -0.1]].slice(0, 2 + (i % 2))) {
      const p = [x + dx, ty + dy, tz + 0.075];
      stick(b, 0.007, C.wood, p, [p[0] + 0.015, p[1] + 0.02, p[2] + 0.26], CYL6); b.box(0.004, 0.03, 0.06, 0xf2efe6, p[0] + 0.015, p[1] + 0.005, p[2] + 0.22);
    }
    // The mark: a team pavise and a quiver; distance pegs down the lane.
    b.box(0.17, 0.3, 0.025, t, x + 0.16, y, line + 0.06, -0.2).box(0.03, 0.3, 0.03, C.gold, x + 0.16, y, line + 0.07, -0.2);
    b.cylT(0.04, 0.035, 0.18, C.leather, x - 0.14, y, line + 0.04, 6);
    for (const k of [-0.015, 0.015]) b.box(0.006, 0.07, 0.006, 0xf2efe6, x - 0.14 + k, y + 0.18, line + 0.04);
    for (const z of [-0.45, 0.1]) b.box(0.03, 0.12, 0.03, C.woodD, x + 0.3, y, z).box(0.035, 0.03, 0.035, 0xf2efe6, x + 0.3, y + 0.12, z);
  }
  // The shooting line: a rope on low posts.
  for (const x of [-1.25, -0.42, 0.42, 1.25]) b.box(0.04, 0.2, 0.04, C.woodD, x, y, line);
  b.box(2.5, 0.015, 0.015, ROPE, 0, y + 0.18, line);
  // The shooting shed: posts, beams and a slate roof; a bow rack and arrow barrels under it; the flag.
  const sx0 = -1.28, sx1 = 0.24, sz0 = 0.88, sz1 = 1.28, scx = (sx0 + sx1) / 2, scz = (sz0 + sz1) / 2, ph = 0.6;
  b.box(sx1 - sx0 + 0.08, 0.03, sz1 - sz0 + 0.08, 0x7a6a4c, scx, y, scz);
  for (const x of [sx0, (2 * sx0 + sx1) / 3, (sx0 + 2 * sx1) / 3, sx1]) for (const z of [sz0, sz1]) b.box(0.06, ph, 0.06, OAK, x, y, z);
  for (const z of [sz0, sz1]) b.box(sx1 - sx0 + 0.06, 0.05, 0.06, OAK, scx, y + ph, z);
  for (const x of [sx0, sx1]) b.box(0.06, 0.05, sz1 - sz0, OAK, x, y + ph, scz);
  place(b, slateRoof(sz1 - sz0 + 0.24, 0.34, sx1 - sx0 + 0.12), scx, y + ph + 0.05, scz, Math.PI / 2);
  gableEnd(b, sz1 - sz0 + 0.14, 0.34 * (sz1 - sz0 + 0.14) / (sz1 - sz0 + 0.24), BOARD, sx1 + 0.072, y + ph + 0.05, scz, true);
  flag(ctx, sx0 + 0.1, y + ph + 0.36, scz, 0.5);
  stick(b, 0.016, C.woodD, [sx0 + 0.15, y + 0.42, scz + 0.12], [sx0 + 0.8, y + 0.42, scz + 0.12], CYL6);
  for (const dx of [0.25, 0.45, 0.65]) b.add(unit.tor, C.woodD, sx0 + dx, y + 0.28, scz + 0.12, 0.14, 0.14, 0.14, 0, 0, Math.PI / 2);
  for (const [x, z] of [[-0.2, scz], [-0.05, scz + 0.08]]) { barrel(b, x, y + 0.03, z); for (const k of [-0.02, 0.02]) b.box(0.006, 0.07, 0.006, 0xf2efe6, x + k, y + 0.2, z); }
  // The fence down the right-hand side.
  const fx = h - 0.08;
  for (let z = -h + 0.12; z <= h - 0.1; z += 0.42) b.box(0.05, 0.34, 0.05, C.woodD, fx, y, z);
  for (const yy of [0.14, 0.28]) b.box(0.03, 0.03, 2 * h - 0.2, C.wood, fx, y + yy, 0);
  return y + ph + 0.4;
}

// Stable: a timber stable with a hay loft, its gable to the front. Weatherboarded stalls on a stone plinth open on the
// +x side onto the paddock through dutch doors, their lower leaves team-painted, two horses looking out; above them the
// jettied, half-timbered hay loft under a steep slate roof, its loft door full of hay in the front wall and a hoist beam
// over it lifting a bale. The paddock's post-and-rail fence holds two horses in team saddle cloths, a water trough and a
// hay crib; the flag flies from the ridge.
export function stable(ctx) {
  const { b, s, h, t } = ctx, y = 0.05, x0 = -h + 0.08, x1 = -0.42, z0 = -h + 0.1, z1 = 0.62, W = x1 - x0, L = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const py = 0.13, g = 0.56, j = 0.07, lf = 0.42, fy = py + g, ly = fy + 0.04;
  b.box(s, y, s, YARD);
  // The stalls: the plinth, the boarded walls and battens, four dutch doors, two horses looking out.
  b.box(W + 0.04, py - y, L + 0.04, STONE, cx, y, cz).box(W, g, L, BOARD, cx, py, cz);
  for (let z = z0 + 0.05; z < z1 - 0.02; z += 0.1) b.box(0.012, g, 0.028, BOARD_L, x1 + 0.006, py, z);
  for (let x = x0 + 0.05; x < x1 - 0.02; x += 0.1) b.box(0.028, g, 0.012, BOARD_L, x, py, z1 + 0.006);
  for (const [i, z] of [-1.0, -0.54, -0.08, 0.38].entries()) {
    b.box(0.014, 0.27, 0.28, t, x1 + 0.014, py + 0.02, z).box(0.012, 0.22, 0.28, C.dark, x1 + 0.012, py + 0.29, z);
    for (const k of [-1, 1]) b.box(0.02, 0.53, 0.04, OAK, x1 + 0.018, py, z + k * 0.16);
    b.box(0.02, 0.04, 0.36, OAK, x1 + 0.018, py + 0.51, z).box(0.03, 0.03, 0.3, OAK, x1 + 0.024, py + 0.28, z);
    if (i % 2 === 0) b.box(0.1, 0.2, 0.08, HORSE_HEAD, x1 + 0.05, py + 0.26, z, 0, 0, -0.5).box(0.18, 0.08, 0.08, HORSE_HEAD, x1 + 0.13, py + 0.4, z, 0, 0, -0.3).box(0.02, 0.05, 0.03, 0xf2efe6, x1 + 0.22, py + 0.41, z).box(0.04, 0.1, 0.02, OAK, x1 + 0.03, py + 0.38, z, 0, 0, -0.5);
  }
  // The jettied hay loft: joists, plaster and oak framing, the loft door full of hay, its team leaf swung open.
  const lx1 = x1 + j, lcx = (x0 + lx1) / 2, LW = lx1 - x0;
  b.box(LW, 0.04, L, OAK, lcx, fy, cz);
  for (let z = z0 + 0.06; z < z1; z += 0.13) b.box(j, 0.03, 0.03, OAK, x1 + j / 2, fy - 0.03, z);
  b.box(LW, lf, L, PLASTER, lcx, ly, cz);
  halfTimber(b, lx1, ly, cz, L, lf, Math.PI / 2); halfTimber(b, lcx, ly, z1, LW, lf, 0);
  b.box(0.26, 0.3, 0.012, C.dark, lcx, ly + 0.05, z1 + 0.03).box(0.22, 0.12, 0.05, STRAW, lcx, ly + 0.05, z1 + 0.04).box(0.32, 0.035, 0.03, OAK, lcx, ly + 0.35, z1 + 0.036);
  b.box(0.13, 0.3, 0.02, t, lcx + 0.21, ly + 0.05, z1 + 0.042);
  // The roof, the plastered front gable, the hoist beam with a bale on its rope; the flag.
  const top = ly + lf, rw = LW + 0.22, rh = 0.62, gw = rw - 0.1, gh = rh * gw / rw;
  place(b, slateRoof(rw, rh, L + 0.06), lcx, top, cz);
  gableEnd(b, gw, gh, PLASTER, lcx, top, z1 + 0.042);
  b.box(0.035, gh * 0.85, 0.025, OAK, lcx, top, z1 + 0.055).box(gw - 0.06, 0.035, 0.025, OAK, lcx, top, z1 + 0.055);
  const hy = top + gh * 0.5;
  b.box(0.06, 0.06, 0.44, OAK, lcx, hy, z1 + 0.22);
  stick(b, 0.007, ROPE, [lcx, hy, z1 + 0.4], [lcx, ly - 0.06, z1 + 0.4], CYL6);
  b.box(0.22, 0.14, 0.15, STRAW, lcx, ly - 0.2, z1 + 0.4).box(0.225, 0.02, 0.155, STRAW_D, lcx, ly - 0.16, z1 + 0.4).box(0.225, 0.02, 0.155, STRAW_D, lcx, ly - 0.1, z1 + 0.4);
  flag(ctx, lcx, top + rh - 0.02, z0 + 0.15, 0.45);
  haystack(b, x0 + 0.22, h - 0.3, 0.16, 0.38, y);
  // The paddock: the fence with a gateway, two horses, a trough and a hay crib.
  const fx0 = x1 + 0.12, fx1 = h - 0.08, fz0 = z0, fz1 = h - 0.08;
  const rail = (p, q) => {
    const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.4));
    for (let i = 0; i <= n; i++) { const [x, z] = lerp(p, q, i / n); b.box(0.05, 0.36, 0.05, C.woodD, x, y, z); }
    for (const yy of [0.14, 0.29]) stick(b, 0.016, C.wood, [p[0], y + yy, p[1]], [q[0], y + yy, q[1]], unit.box);
  };
  rail([fx0, fz0], [fx1, fz0]); rail([fx1, fz0], [fx1, fz1]); rail([fx1, fz1], [0.36, fz1]); rail([-0.02, fz1], [fx0, fz1]); rail([fx0, fz1], [fx0, z1 + 0.1]);
  place(b, horse(t), 0.4, y, -0.3, 0.5);
  place(b, horse(t, true), 0.84, y, 0.72, -2.4);
  b.box(0.2, 0.16, 0.62, C.wood, fx1 - 0.18, y, -0.55).box(0.15, 0.02, 0.56, 0x3f7fa3, fx1 - 0.18, y + 0.15, -0.55);
  b.box(0.42, 0.22, 0.2, C.woodD, 0.1, y, fz0 + 0.18).box(0.38, 0.1, 0.17, STRAW, 0.1, y + 0.2, fz0 + 0.18);
  return top + rh + 0.03;
}

// A stone arcade len long built at the origin for place(), facing +z: bays + 1 piers d deep and pointed arches springing
// at `spring` and rising `rise` between them, under a dark string course.
const arcade = (len, bays, spring, rise, d, c = STONE_L) => {
  const a = new B(), pw = 0.13, bw = (len - pw) / bays, half = (bw - pw) / 2, th = Math.atan2(rise, half), L = Math.hypot(half, rise), hh = 0.15;
  for (let i = 0; i <= bays; i++) a.box(pw, spring + rise + 0.1, d, c, -len / 2 + pw / 2 + i * bw, 0, 0);
  for (let i = 0; i < bays; i++) {
    const xm = -len / 2 + pw / 2 + (i + 0.5) * bw;
    for (const k of [-1, 1]) a.add(unit.box, c, xm + k * half / 2 + k * Math.sin(th) * hh / 2, spring + rise / 2 + Math.cos(th) * hh / 2, 0, L, hh, d, 0, 0, -k * th);
  }
  return a.box(len + 0.02, 0.1, d + 0.03, STONE_D, 0, spring + rise, 0);
};
// A market stall: a trestle table of goods under an awning striped in team colour and white, built at the origin for
// place(), its front to +z; goods(c) piles the table (top at y = 0.3).
const stall = (t, goods) => {
  const c = new B();
  for (const [x, z] of [[-0.22, -0.12], [0.22, -0.12], [-0.22, 0.12], [0.22, 0.12]]) c.box(0.03, 0.27, 0.03, C.woodD, x, 0, z);
  c.box(0.52, 0.03, 0.3, C.wood, 0, 0.27, 0);
  for (const x of [-0.25, 0.25]) c.box(0.025, 0.66, 0.025, C.woodD, x, 0, -0.16).box(0.025, 0.52, 0.025, C.woodD, x, 0, 0.2);
  for (let i = 0; i < 5; i++) c.box(0.11, 0.02, 0.44, i % 2 ? 0xf2efe6 : t, -0.22 + i * 0.11, 0.59, 0.02, 0.32);
  goods(c);
  return c;
};
// Market: an arcaded market hall. A stone arcade of pointed arches carries the jettied, half-timbered upper hall under a
// slate roof with a louvred bell turret flying the flag, team banners hung from the jetty; under the arches the stalls
// are laid with cloth, sacks and barrels. In the square before it a stepped market cross and two stalls under
// team-striped awnings, with barrels and crates.
export function market(ctx) {
  const { b, s, t } = ctx, y = 0.05, x0 = -1.2, x1 = 0.86, z0 = -1.26, z1 = -0.3, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const fl = y + 0.05, spring = 0.36, rise = 0.24, ay = fl + spring + rise + 0.1;
  b.box(s, y, s, COBBLE).box(W + 0.08, 0.05, D + 0.08, PAVE, cx, y, cz);
  // The arcades on the +z and +x sides; plain walls behind.
  place(b, arcade(W, 4, spring, rise, 0.14), cx, fl, z1 - 0.07);
  place(b, arcade(D, 2, spring, rise, 0.14), x1 - 0.07, fl, cz, Math.PI / 2);
  b.box(W, ay - fl, 0.12, 0x4d4a44, cx, fl, z0 + 0.06).box(0.12, ay - fl, D, 0x4d4a44, x0 + 0.06, fl, cz);
  // Under the arches: tables of cloth bolts, sacks and barrels.
  for (const [x, z] of [[-0.82, -0.82], [-0.32, -0.7], [0.2, -0.82]]) {
    b.box(0.36, 0.03, 0.22, C.wood, x, fl + 0.2, z).box(0.03, 0.2, 0.2, C.woodD, x - 0.15, fl, z).box(0.03, 0.2, 0.2, C.woodD, x + 0.15, fl, z);
    for (const [i, c] of [0x6b3a1e, t, 0x4f6b2a].entries()) b.add(CYL6, c, x - 0.11 + i * 0.11, fl + 0.27, z, 0.04, 0.2, 0.04, Math.PI / 2, 0, 0);
  }
  barrel(b, 0.6, fl, -0.6); barrel(b, 0.58, fl, -0.84, 0.065); sack(b, -0.58, fl, -0.5, 0.08); sack(b, -0.48, fl, -0.46, 0.07);
  // The jettied upper hall, its windows, the team banners hung from the jetty.
  const j = 0.08, ux1 = x1 + j, uz1 = z1 + j, ucx = (x0 + ux1) / 2, ucz = (z0 + uz1) / 2, UW = ux1 - x0, UD = uz1 - z0, uh = 0.46, uy = ay + 0.05;
  b.box(UW, 0.05, UD, OAK, ucx, ay, ucz).box(UW, uh, UD, PLASTER, ucx, uy, ucz);
  halfTimber(b, ucx, uy, uz1, UW, uh, 0); halfTimber(b, ux1, uy, ucz, UD, uh, Math.PI / 2);
  for (const x of [-0.98, -0.5, 0.02, 0.5]) b.box(0.15, 0.13, 0.02, GLASS, x + 0.12, uy + 0.18, uz1 + 0.03);
  for (const z of [ucz - 0.24, ucz + 0.24]) b.box(0.02, 0.13, 0.15, GLASS, ux1 + 0.03, uy + 0.18, z);
  for (const x of [-0.72, 0.3]) b.box(0.15, 0.24, 0.012, t, x, ay - 0.25, uz1 + 0.01).box(0.19, 0.03, 0.025, C.gold, x, ay - 0.02, uz1 + 0.01).box(0.03, 0.14, 0.014, C.gold, x, ay - 0.2, uz1 + 0.012);
  // The roof, its plastered +x gable, the louvred bell turret and the flag.
  const top = uy + uh, rw = UD + 0.2, rh = 0.55, gw = rw - 0.1, gh = rh * gw / rw;
  place(b, slateRoof(rw, rh, UW + 0.08), ucx, top, ucz, Math.PI / 2);
  gableEnd(b, gw, gh, PLASTER, ux1 + 0.052, top, ucz, true);
  b.box(0.025, gh * 0.85, 0.035, OAK, ux1 + 0.064, top, ucz).box(0.025, 0.035, gw - 0.06, OAK, ux1 + 0.064, top, ucz);
  const by = top + rh - 0.08, bx = ucx + 0.1;
  b.box(0.26, 0.24, 0.26, OAK, bx, by, ucz).box(0.18, 0.15, 0.27, C.dark, bx, by + 0.05, ucz).box(0.27, 0.15, 0.18, C.dark, bx, by + 0.05, ucz);
  b.cone(0.25, 0.34, SLATE, bx, by + 0.24, ucz, 4, Math.PI / 4);
  flag(ctx, bx, by + 0.56, ucz, 0.42);
  // The square: the market cross, two stalls, barrels and crates.
  const mx = 0.66, mz = 0.66;
  for (const [i, w] of [0.5, 0.36, 0.22].entries()) b.box(w, 0.07, w, i % 2 ? STONE : STONE_L, mx, y + i * 0.07, mz);
  b.add(CYL8, STONE_L, mx, y + 0.21 + 0.32, mz, 0.045, 0.64, 0.045).box(0.06, 0.18, 0.06, STONE_L, mx, y + 0.83, mz).box(0.2, 0.05, 0.06, STONE_L, mx, y + 0.9, mz);
  place(b, stall(t, c => { for (const [i, col] of [C.red, 0xd9a441, 0x6f8f3a, 0xd9a441].entries()) c.add(BALL, col, -0.18 + i * 0.12, 0.34, 0.02, 0.05, 0.04, 0.05); }), -0.72, y, 0.5, 0.15);
  place(b, stall(t, c => { for (let i = 0; i < 3; i++) c.cylT(0.05, 0.04, 0.08, P.wattle, -0.14 + i * 0.14, 0.3, 0, 6); }), -0.08, y, 0.98, -0.1);
  barrel(b, 0.28, y, 0.36); barrel(b, 0.4, y, 0.5, 0.065);
  b.box(0.18, 0.16, 0.18, C.wood, 1.04, y, 0.22).box(0.15, 0.13, 0.15, C.woodD, 1.02, y + 0.16, 0.24, 0, 0.4).box(0.2, 0.15, 0.18, C.wood, 1.05, y, 0.0, 0, 0.2);
  return by + 0.58;
}

// Government Center: a cathedral-like hall. A tall aisled hall of grey stone with its gable to the front: a great rose
// window in team colour and gold over a pointed portal with team doors, team banners either side, octagonal stair turrets
// with slate spirelets at its corners and a stone cross on the gable. Buttresses with pinnacles and lancet windows
// along the aisles, clerestory windows above, a slate roof with a slender flèche (its spire in the mast) and the flag.
export function government_center(ctx) {
  const { b, mast, s, t } = ctx, y = 0.06, W = 1.1, z0 = -1.22, z1 = 0.7, L = z1 - z0, cz = (z0 + z1) / 2, wh = 1.22, rh = 0.78, aw = 0.34, ah = 0.62;
  b.box(s, y, s, PAVE);
  // The nave and its roof.
  b.box(W, wh, L, STONE, 0, y, cz);
  place(b, slateRoof(W + 0.16, rh, L + 0.02), 0, y + wh, cz - 0.01);
  // The aisles: lean-to roofs, buttresses with pinnacles, lancets, and the clerestory over them.
  for (const k of [-1, 1]) {
    const ry = k * Math.PI / 2, ox = W / 2 + aw, n = 4, step = (L - 0.3) / n;
    b.box(aw, ah, L - 0.12, STONE, k * (W / 2 + aw / 2), y, cz - 0.06);
    place(b, slateLeanTo(L - 0.1, aw + 0.06, 0.3), k * (W / 2 + aw / 2 + 0.02), y + ah, cz - 0.06, ry);
    for (let i = 0; i <= n; i++) {
      const z = z0 + 0.12 + i * step;
      buttress(b, k * ox, y, z, ah + 0.1, ry); b.cone(0.045, 0.16, STONE_D, k * (ox + 0.045), y + ah + 0.1, z, 4);
      if (i < n) { lancet(b, k * (ox + 0.011), y + 0.16, z + step / 2, 0.1, 0.34, ry, GLASS); lancet(b, k * (W / 2 + 0.011), y + ah + 0.36, z + step / 2, 0.09, 0.2, ry, GLASS); }
    }
  }
  // The front: its wall and gable, the cross, the rose window, the portal with team doors, banners and steps.
  const fz = z1 + 0.05, fw = W + 0.06, gh = rh * fw / (W + 0.16) + 0.07, ff = fz + 0.05;
  b.box(fw, wh, 0.1, STONE, 0, y, fz).roof(fw, gh, 0.1, STONE, 0, y + wh, fz);
  b.box(0.045, 0.22, 0.045, STONE_L, 0, y + wh + gh - 0.04, fz).box(0.15, 0.045, 0.045, STONE_L, 0, y + wh + gh + 0.08, fz);
  place(b, rose(t, 0.3), 0, y + wh + 0.06, ff + 0.002);
  lancet(b, 0, y, ff + 0.001, 0.44, 0.78, 0, STONE_D); lancet(b, 0, y, ff + 0.011, 0.34, 0.68, 0, t);
  b.box(0.014, 0.5, 0.02, OAK, 0, y, ff + 0.02);
  for (const k of [-1, 1]) b.box(0.15, 0.42, 0.012, t, k * 0.37, y + 0.3, ff + 0.006).box(0.19, 0.025, 0.02, C.gold, k * 0.37, y + 0.72, ff + 0.008).box(0.03, 0.22, 0.014, C.gold, k * 0.37, y + 0.4, ff + 0.01);
  for (let i = 0; i < 2; i++) b.box(0.62 - i * 0.12, 0.035, 0.12, STONE_L, 0, y - 0.035 + i * 0.035, ff + 0.12 - i * 0.06);
  // The stair turrets at the front corners.
  for (const k of [-1, 1]) {
    const tx = k * (fw / 2 + 0.02), hh = wh + 0.48;
    b.add(CYL8, STONE, tx, y + hh / 2, fz, 0.13, hh, 0.13).cylT(0.155, 0.155, 0.06, STONE_D, tx, y + hh, fz, 8).cone(0.155, 0.5, SLATE, tx, y + hh + 0.06, fz, 8);
    for (const yy of [0.4, 0.9, 1.35]) b.box(0.035, 0.14, 0.02, C.dark, tx, y + yy, fz + 0.13);
    mast.cylT(0.006, 0.014, 0.2, C.gold, tx, y + hh + 0.52, fz, 4);
  }
  // The flèche on the ridge and the flag on it.
  const zf = cz - 0.25, ridge = y + wh + rh;
  b.box(0.14, 0.16, 0.14, OAK, 0, ridge - 0.1, zf).box(0.16, 0.03, 0.16, SLATE_D, 0, ridge + 0.06, zf);
  mast.cone(0.07, 0.48, SLATE_D, 0, ridge + 0.09, zf, 6);
  flag(ctx, 0, ridge + 0.54, zf, 0.4, C.gold, [0.22, 0.4]);
  return y + wh + 0.56 + 0.5;
}

// Wonder: a gothic cathedral, its west front toward +z. Twin west towers with belfries, pinnacles and tall slate spires
// frame a gabled front with a great rose window over the team-doored portal, long team banners hanging from the towers;
// the aisled nave with flying buttresses on pinnacled piers, transepts with a second rose window in the +x end, an apse
// and a crossing tower carrying the tallest spire, whose tip and the flag are in the mast.
export function wonder(ctx) {
  const { b, mast, s, t } = ctx, y = 0.12, W = 1.0, wh = 1.5, rh = 0.72, aw = 0.36, ah = 0.78;
  const tz = 1.1, tw = 0.62, tx = 0.62, th = 2.72, front = tz + tw / 2, z0 = -1.15, z1 = front - 0.12, cz = (z0 + z1) / 2, L = z1 - z0;
  const tcz = -0.4, td = 0.7, tl = 1.42;
  b.box(s, 0.06, s, PAVE).box(3.2, 0.06, 3.3, STONE_L, 0, 0.06, -0.08);
  // The nave, its aisles (ending at the towers) and their roofs.
  b.box(W, wh, L, STONE, 0, y, cz);
  place(b, slateRoof(W + 0.14, rh, L), 0, y + wh, cz);
  const a1 = tz - tw / 2, acz = (z0 + a1) / 2;
  for (const k of [-1, 1]) {
    b.box(aw, ah, a1 - z0, STONE, k * (W / 2 + aw / 2), y, acz);
    place(b, slateLeanTo(a1 - z0, aw + 0.06, 0.34), k * (W / 2 + aw / 2 + 0.02), y + ah, acz, k * Math.PI / 2);
  }
  // The transepts, their stone gables, the rose window in the +x end and lancets.
  b.box(2 * tl, wh, td, STONE, 0, y, tcz);
  place(b, slateRoof(td + 0.14, rh, 2 * tl), 0, y + wh, tcz, Math.PI / 2);
  for (const k of [-1, 1]) {
    gableEnd(b, td + 0.06, rh * (td + 0.06) / (td + 0.14), STONE, k * (tl + 0.012), y + wh, tcz, true);
    for (const dz of [-1, 1]) b.box(0.12, wh + 0.1, 0.12, STONE_D, k * (tl - 0.02), y, tcz + dz * (td / 2 + 0.02)).cone(0.07, 0.3, STONE_D, k * (tl - 0.02), y + wh + 0.1, tcz + dz * (td / 2 + 0.02), 4);
    for (const x of [0.75, 1.12]) lancet(b, k * x, y + 0.35, tcz + td / 2 + 0.011, 0.12, 0.7, 0, GLASS);
  }
  place(b, rose(t, 0.24), tl + 0.024, y + wh - 0.3, tcz, Math.PI / 2);
  for (const dz of [-0.14, 0.14]) lancet(b, tl + 0.011, y + 0.22, tcz + dz, 0.1, 0.62, Math.PI / 2, GLASS);
  // The apse.
  b.cylT(0.5, 0.5, wh, STONE, 0, y, z0, 8).cone(0.56, 0.6, SLATE, 0, y + wh, z0, 8);
  // Flying buttresses on pinnacled piers, lancets in the aisles, the clerestory.
  for (const k of [-1, 1]) for (const z of [-0.98, 0.16, 0.52]) {
    const px = k * (W / 2 + aw + 0.14);
    b.box(0.14, ah + 0.42, 0.18, STONE_D, px, y, z).cone(0.075, 0.3, STONE_D, px, y + ah + 0.42, z, 4);
    stick(b, 0.03, STONE_D, [px - k * 0.04, y + ah + 0.32, z], [k * (W / 2 + 0.02), y + wh - 0.1, z], unit.box);
    lancet(b, k * (W / 2 + aw + 0.011), y + 0.2, z - 0.18, 0.11, 0.42, k * Math.PI / 2, GLASS);
    lancet(b, k * (W / 2 + 0.011), y + ah + 0.42, z - 0.18, 0.1, 0.26, k * Math.PI / 2, GLASS);
  }
  // The crossing tower and its spire.
  const cy = y + wh + 0.1, ch = 1.05, ctop = cy + ch;
  b.box(0.7, ch, 0.7, STONE, 0, cy, tcz); battlements(b, 0, ctop, tcz, 0.7, 0.7);
  for (const d of [-0.15, 0.15]) { lancet(b, d, cy + 0.42, tcz + 0.361, 0.1, 0.46); lancet(b, 0.361, cy + 0.42, tcz + d, 0.1, 0.46, Math.PI / 2); }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone(0.06, 0.32, STONE_D, dx * 0.31, ctop, tcz + dz * 0.31, 4);
  b.cone(0.34, 2.05, SLATE, 0, ctop, tcz, 8, Math.PI / 8);
  mast.cylT(0.006, 0.03, 0.5, SLATE_D, 0, ctop + 1.95, tcz, 6).box(0.03, 0.16, 0.03, C.gold, 0, ctop + 2.42, tcz).box(0.12, 0.03, 0.03, C.gold, 0, ctop + 2.5, tcz);
  // The west towers: buttressed, belfried, battlemented, pinnacled and spired, a team banner down each front.
  for (const k of [-1, 1]) {
    const x = k * tx, bf = tz + tw / 2;
    b.box(tw, th, tw, STONE, x, y, tz);
    for (const [dx, dz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) b.box(0.08, th * 0.82, 0.08, STONE_D, x + dx * (tw / 2 + 0.02), y, tz + dz * (tw / 2 + 0.02));
    for (const yy of [0.95, 1.85]) b.box(tw + 0.04, 0.04, tw + 0.04, STONE_D, x, y + yy, tz);
    for (const d of [-0.13, 0.13]) { lancet(b, x + d, y + 1.98, bf + 0.011, 0.1, 0.5); lancet(b, x + k * (tw / 2 + 0.011), y + 1.98, tz + d, 0.1, 0.5, k * Math.PI / 2); }
    battlements(b, x, y + th, tz, tw, tw);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cone(0.055, 0.3, STONE_D, x + dx * 0.27, y + th, tz + dz * 0.27, 4);
    b.cone(0.29, 1.45, SLATE, x, y + th, tz, 8, Math.PI / 8);
    mast.cylT(0.005, 0.02, 0.32, SLATE_D, x, y + th + 1.38, tz, 6);
    b.box(0.2, 0.76, 0.014, t, x, y + 1.0, bf + 0.008).box(0.24, 0.03, 0.03, C.gold, x, y + 1.76, bf + 0.012);
    b.box(0.035, 0.34, 0.016, C.gold, x, y + 1.24, bf + 0.016).box(0.13, 0.035, 0.016, C.gold, x, y + 1.46, bf + 0.016);
    lancet(b, x, y, bf + 0.001, 0.3, 0.62, 0, STONE_D); lancet(b, x, y, bf + 0.011, 0.22, 0.54, 0, C.dark);
  }
  // The west front between the towers: wall and gable, the rose, a row of niches, the great portal and steps.
  const fz = front - 0.06;
  b.box(W + 0.06, wh + 0.05, 0.12, STONE, 0, y, fz).roof(W + 0.16, rh + 0.1, 0.12, STONE, 0, y + wh, fz);
  b.box(0.045, 0.22, 0.045, STONE_L, 0, y + wh + rh + 0.06, fz).box(0.15, 0.045, 0.045, STONE_L, 0, y + wh + rh + 0.19, fz);
  place(b, rose(t, 0.25), 0, y + wh + 0.12, front + 0.003);
  for (const x of [-0.21, -0.07, 0.07, 0.21]) lancet(b, x, y + 0.92, front + 0.001, 0.07, 0.24);
  lancet(b, 0, y, front + 0.001, 0.4, 0.82, 0, STONE_D); lancet(b, 0, y, front + 0.011, 0.3, 0.72, 0, t);
  b.box(0.014, 0.52, 0.02, OAK, 0, y, front + 0.02);
  for (let i = 0; i < 3; i++) b.box(1.5 - i * 0.2, 0.04, 0.12, STONE_L, 0, 0.12 - (i + 1) * 0.04 + 0.04, front + 0.06 + (2 - i) * 0.06);
  flag(ctx, 0, ctop + 2.56, tcz, 0.5, C.gold);
  return ctop + 2.05;
}

// ---------- Medieval defences ----------
// A cross-shaped arrow loop on a wall face at (x, z) facing ry, its foot at y.
const loop = (b, x, y, z, ry, hh = 0.32) => b.box(0.045, hh, 0.03, C.dark, x, y, z, 0, ry).box(0.15, 0.045, 0.03, C.dark, x, y + hh * 0.55, z, 0, ry);

// Tower: a stone castle tower. A round drum on a battered plinth, a string course and arrow loops up its camera side,
// the parapet carried out on a ring of corbels (machicolations) and crowned with merlons; a pointed gate up two steps
// at its foot with a team banner hung above it, a team shield on the side, and a corbelled bartizan turret with a slate
// cone flying the flag. Its shot is a flight of crossbow quarrels from the battlements (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, R = 0.71, y0 = 0.34, top = 2.26, n = 16;
  b.box(1.76, 0.04, 1.76, COBBLE).cylT(0.73, 0.83, y0 - 0.04, STONE_D, 0, 0.04, 0, n);
  b.cylT(R - 0.01, R + 0.01, top - y0, STONE, 0, y0, 0, n);
  for (const y of [1.2, 1.9]) b.cylT(R + 0.025, R + 0.025, 0.05, STONE_D, 0, y, 0, n);
  // The machicolations, the parapet and its merlons.
  for (let i = 0; i < n; i++) { const a = i * 2 * Math.PI / n; b.box(0.09, 0.16, 0.13, STONE_D, Math.sin(a) * 0.76, top, Math.cos(a) * 0.76, 0, a); }
  const py = top + 0.16, pt = py + 0.3;
  b.cylT(0.83, 0.83, 0.3, STONE, 0, py, 0, n).cylT(0.84, 0.84, 0.04, STONE_D, 0, pt - 0.04, 0, n);
  for (let i = 0; i < 8; i++) { const a = (i + 0.5) * Math.PI / 4; b.box(0.26, 0.22, 0.13, STONE, Math.sin(a) * 0.77, pt, Math.cos(a) * 0.77, 0, a).box(0.28, 0.03, 0.15, STONE_D, Math.sin(a) * 0.77, pt + 0.22, Math.cos(a) * 0.77, 0, a); }
  // Arrow loops on the camera side and the parapet.
  for (const [a, y] of [[Math.PI / 4, 0.75], [Math.PI / 2, 1.4], [Math.PI / 4, 1.42], [Math.PI / 2, 0.62]]) loop(b, Math.sin(a) * (R + 0.005), y, Math.cos(a) * (R + 0.005), a);
  for (const a of [0, Math.PI / 4, Math.PI / 2]) loop(b, Math.sin(a) * 0.835, py + 0.04, Math.cos(a) * 0.835, a, 0.2);
  // The gate up two steps, the team banner over it, a shield on the side.
  lancet(b, 0, y0, R + 0.004, 0.36, 0.66, 0, STONE_D); lancet(b, 0, y0, R + 0.012, 0.28, 0.58, 0, OAK);
  b.box(0.012, 0.42, 0.02, C.dark, 0, y0, R + 0.022);
  for (let i = 0; i < 2; i++) b.box(0.5 - i * 0.1, y0 - 0.04 - i * 0.14, 0.14, STONE_L, 0, 0.04, R + 0.18 - i * 0.12);
  b.box(0.4, 0.04, 0.05, OAK, 0, 2.08, R + 0.03).box(0.34, 0.8, 0.014, t, 0, 1.28, R + 0.025);
  b.box(0.04, 0.4, 0.016, C.gold, 0, 1.52, R + 0.034).box(0.2, 0.04, 0.016, C.gold, 0, 1.78, R + 0.034);
  place(b, heater(t), R + 0.012, 1.42, 0, Math.PI / 2, 1.4);
  // The bartizan: a corbelled turret at the back right, its slate cone flying the flag.
  const bx = Math.sin(3 * Math.PI / 4) * 0.8, bz = Math.cos(3 * Math.PI / 4) * 0.8;
  b.cylT(0.21, 0.06, 0.34, STONE_D, bx, 1.78, bz, 10).cylT(0.21, 0.21, pt + 0.18 - 2.12, STONE, bx, 2.12, bz, 10);
  b.cylT(0.225, 0.225, 0.04, STONE_D, bx, pt + 0.14, bz, 10).cone(0.27, 0.5, SLATE, bx, pt + 0.18, bz, 10);
  loop(b, bx + 0.15, pt - 0.2, bz + 0.15, Math.PI / 4, 0.2);
  flag(ctx, bx, pt + 0.62, bz, 0.5);
  // The quarrels, loosed between the merlons toward the camera sides.
  const fire = new B();
  for (const a of [0.12, Math.PI / 4, Math.PI / 2 - 0.12]) streak(fire, [Math.sin(a) * 0.86, 0.06, Math.cos(a) * 0.86], [Math.sin(a) * 1.6, -0.16, Math.cos(a) * 1.6], 0.032, undefined, P.ember, 0.08);
  extra.fire = { geo: fire.geometry(), at: [0, pt, 0] };
  return pt + 0.68;
}

// Wall: a castle wall with battlements. A grey stone wall on a darker plinth, a string course under the wall-walk and
// square merlons round its top, an arrow slit in each merlon on the camera sides and team shields hung on them; it fills
// its tile edge to edge, so segments in a line close up into one curtain wall.
export function wall(ctx) {
  const { b, t } = ctx, h0 = 0.12, wh = 0.7, y = h0 + wh;
  b.box(1, h0, 1, STONE_D).box(1, wh / 2, 1, STONE, 0, h0, 0).box(0.986, wh / 2, 0.986, STONE, 0, h0 + wh / 2, 0);
  b.box(1, 0.05, 1, STONE_D, 0, y, 0);
  const my = y + 0.05;
  for (const [x, z] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) b.box(0.24, 0.26, 0.24, STONE, x * 0.38, my, z * 0.38);
  // Slits and shields sit a hair into the faces, so nothing pokes past the tile's edge.
  for (const u of [-0.38, 0.38]) b.box(0.04, 0.15, 0.012, C.dark, u, my + 0.06, 0.494).box(0.012, 0.15, 0.04, C.dark, 0.494, my + 0.06, u);
  place(b, heater(t), 0, 0.2, 0.484, 0, 1.3); place(b, heater(t), 0.484, 0.2, 0, Math.PI / 2, 1.3);
  return my + 0.26;
}
