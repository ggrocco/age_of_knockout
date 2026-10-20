// Stone Age: hide tents, a chieftain's round hut with a totem, stilted grain huts, a log-lined storage pit, a staked
// patch of wild grain and a sparring ground.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, flag, firePit } from './kit.js';

// Unit-tall shapes centred on the origin along +y, for stick(): a sheaf (narrow at the base), a club (thick at the
// head), a grain stalk and a spear point.
const SHEAF = new THREE.CylinderGeometry(1, 0.7, 1, 6), CLUB = new THREE.CylinderGeometry(1, 0.45, 1, 6);
const STALK = new THREE.CylinderGeometry(0.4, 1, 1, 4), POINT = new THREE.ConeGeometry(1, 1, 5);
// A pole (or log) of radius r from point p to point q; geo's +y end lands on q.
const stick = (b, r, c, [x1, y1, z1], [x2, y2, z2], geo = unit.cyl) => {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz);
  b.add(geo, c, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, r, L, r, Math.atan2(dz, dy), 0, -Math.asin(dx / L));
};
const lerp = (p, q, f) => p.map((v, i) => v + (q[i] - v) * f);
// A deterministic 0..1 value per integer pair, for the wild grain's scatter.
const hash = (i, j) => (Math.imul(i * 73 + j * 151 + 7, 2654435761) >>> 0) % 1000 / 1000;

export function house(ctx) {
  const { b, t } = ctx;
  b.cyl(0.66, 0.05, P.dirt).cone(0.6, 1.25, P.hide, 0, 0.05, 0, 9).cylT(0.39, 0.43, 0.06, t, 0, 0.45, 0, 9).cylT(0.2, 0.24, 0.05, P.hideD, 0, 0.82, 0, 9);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 0.4; b.cyl(0.018, 0.5, C.woodD, Math.cos(a) * 0.05, 1.12, Math.sin(a) * 0.05, Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); }
  b.box(0.24, 0.46, 0.04, C.dark, 0, 0.05, 0.43, -0.45);
  firePit(ctx, 0.62, 0.5);
  b.box(0.04, 0.5, 0.04, C.woodD, -0.62, 0.05, -0.45).box(0.04, 0.5, 0.04, C.woodD, -0.62, 0.05, 0.05).box(0.04, 0.04, 0.54, C.wood, -0.62, 0.52, -0.2).box(0.02, 0.32, 0.4, P.hideD, -0.62, 0.2, -0.2);
  return 1.61;
}

export function town_center(ctx) {
  const { b, t } = ctx;
  b.cyl(1.32, 0.08, P.dirt).cylT(0.95, 1.0, 0.72, P.wattle, 0, 0.08, 0, 12).cone(1.28, 1.35, C.thatch, 0, 0.74, 0, 12).cylT(0.86, 0.9, 0.07, C.thatchD, 0, 1.06, 0, 12).cyl(0.09, 0.14, C.dark, 0, 2.03, 0);
  b.box(0.4, 0.52, 0.12, C.dark, 0, 0.08, 0.95).add(unit.tor, P.bone, -0.02, 0.48, 1.02, 0.34, 0.36, 0.34);
  // Totem: carved post with a team-coloured band, bone eyes and outstretched arms.
  const x = -1.0, z = 0.8;
  b.box(0.22, 0.36, 0.22, C.wood, x, 0.08, z).box(0.27, 0.3, 0.27, t, x, 0.44, z).box(0.22, 0.32, 0.22, C.woodD, x, 0.74, z).box(0.6, 0.07, 0.12, C.wood, x, 0.98, z).sph(0.06, P.bone, x - 0.06, 0.6, z + 0.14).sph(0.06, P.bone, x + 0.06, 0.6, z + 0.14);
  firePit(ctx, 0.95, 0.85);
  // Hide-drying racks and scattered bones.
  for (const [rx, rz] of [[1.0, -0.6], [0.6, -1.05]]) b.box(0.04, 0.55, 0.04, C.woodD, rx - 0.22, 0.08, rz).box(0.04, 0.55, 0.04, C.woodD, rx + 0.22, 0.08, rz).box(0.5, 0.04, 0.04, C.wood, rx, 0.6, rz).box(0.4, 0.34, 0.02, P.hide, rx, 0.24, rz);
  for (const [bx, bz, r] of [[-0.6, -1.1, 0.4], [0.2, 1.2, 1.2]]) b.box(0.28, 0.04, 0.05, P.bone, bx, 0.08, bz, 0, r);
  flag(ctx, 0, 2.0, 0);
  return 2.17;
}

// Hides lashed over a sloping frame, from the back edge [y, z] down to the front edge, across x0..x1: one hide per
// bay (colours), sagging between the rafter poles that lash it down, its ragged end hanging over the front pole.
const hideRoof = (b, x0, x1, [yb, zb], [yf, zf], bays) => {
  const T = Math.atan2(yb - yf, zf - zb), L = Math.hypot(zf - zb, yb - yf) + 0.14, w = (x1 - x0) / bays.length, sag = 0.16;
  const at = (x, v, n) => [x, yb + 0.04 - v * Math.sin(T) + n * Math.cos(T), zb - 0.07 + v * Math.cos(T) + n * Math.sin(T)];
  bays.forEach((c, i) => {
    for (const k of [-1, 1]) { const [x, y, z] = at(x0 + (i + 0.5 + k * 0.25) * w, L / 2, -Math.tan(sag) * w / 4); b.box(w / 2 / Math.cos(sag) + 0.012, 0.03, L, c, x, y - 0.015, z, T, 0, k * sag); }
    const fh = 0.07 + ((i * 2) % 3) * 0.035, [x, y, z] = at(x0 + (i + 0.5) * w, L - 0.01, -0.03);
    b.box(w * 0.8, fh, 0.025, c, x, y - fh, z, -0.12);
  });
  for (let i = 0; i <= bays.length; i++) stick(b, 0.02, C.woodD, at(x0 + i * w, 0.02, 0.01), at(x0 + i * w, L - 0.04, 0.01));
};
// Granary: two storage huts of wattle and thatch, raised on stilts capped with flat stones against rats; a ladder up
// to the big hut, grain baskets, a grinding stone and a stook of sheaves.
export function granary(ctx) {
  const { b, t } = ctx;
  b.cyl(0.86, 0.05, P.dirt);
  const hut = (x, z, r, legs, wall, roof) => {
    const k = r * 0.62, deck = 0.085 + legs, w0 = deck + 0.08, ry = Math.PI / 10;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cyl(0.035, legs, C.woodD, x + dx * k, 0.05, z + dz * k).cylT(0.075, 0.09, 0.035, C.stone, x + dx * k, 0.05 + legs, z + dz * k, 8);
    for (let i = -2; i <= 2; i++) stick(b, 0.04, i % 2 ? C.wood : C.woodD, [x - r - 0.05, deck + 0.04, z + i * r * 0.4], [x + r + 0.05, deck + 0.04, z + i * r * 0.4]);
    b.cylT(r, r + 0.02, wall, P.wattle, x, w0, z, 10, 0, ry);
    b.cylT(r + 0.012, r + 0.016, 0.025, C.woodD, x, w0 + wall * 0.62, z, 10, 0, ry);
    b.cylT(r + 0.018, r + 0.024, 0.08, t, x, w0 + wall * 0.22, z, 10, 0, ry); // team-dyed hide band
    b.cone(r + 0.13, roof, C.thatch, x, w0 + wall - 0.05, z, 10).cylT(r + 0.1, r + 0.14, 0.05, C.thatchD, x, w0 + wall - 0.06, z, 10).cylT(0.03, 0.06, 0.12, C.thatchD, x, w0 + wall + roof - 0.1, z, 6);
    b.box(0.17, Math.min(0.27, wall * 0.62), 0.05, C.dark, x, w0 + 0.02, z + r * 0.97);
    return w0;
  };
  const x = -0.32, z = -0.24, r = 0.34, sill = hut(x, z, r, 0.4, 0.44, 0.58);
  hut(0.47, 0.02, 0.25, 0.3, 0.34, 0.44);
  // Ladder from the yard up to the big hut's door.
  const foot = [x, 0.05, z + r + 0.4], top = [x, sill + 0.02, z + r + 0.04];
  for (const dx of [-0.08, 0.08]) stick(b, 0.02, C.wood, [foot[0] + dx, foot[1], foot[2]], [top[0] + dx, top[1], top[2]]);
  for (const f of [0.3, 0.62, 0.92]) { const [px, py, pz] = lerp(foot, top, f); stick(b, 0.015, C.woodD, [px - 0.1, py, pz], [px + 0.1, py, pz]); }
  // Grain baskets and a grinding stone.
  for (const [bx, bz, br] of [[-0.68, 0.42, 0.13], [-0.6, 0.72, 0.11], [-0.3, 0.74, 0.1]]) b.cylT(br, br * 0.78, 0.17, P.wattle, bx, 0.05, bz, 8).cylT(br + 0.01, br + 0.01, 0.025, C.wood, bx, 0.2, bz, 8).sph(br * 0.85, C.hay, bx, 0.22, bz, 1, 0.5, 1);
  b.rock(0.12, C.stoneD, 0.02, 0.05, 0.66, 1.3, 0.35, 1, 0.4).sph(0.05, C.stone, 0.02, 0.15, 0.66, 1.4, 0.7, 0.8);
  // A stook: a bound bundle of sheaves bristling with ears, two loose sheaves leaning on it.
  const cx = 0.4, cz = 0.58;
  b.cylT(0.075, 0.15, 0.3, 0xd8b755, cx, 0.05, cz, 8).cylT(0.08, 0.085, 0.035, C.thatchD, cx, 0.28, cz, 8);
  for (let i = 0; i < 7; i++) { const a = i * Math.PI * 2 / 7, r = i ? 0.055 : 0; stick(b, 0.035, i % 2 ? C.thatch : C.hay, [cx + Math.cos(a) * r * 0.6, 0.3, cz + Math.sin(a) * r * 0.6], [cx + Math.cos(a) * r * 1.6, 0.5 - (i % 2) * 0.03, cz + Math.sin(a) * r * 1.6], POINT); }
  for (const a of [0.6, 2.4]) {
    const p = [cx + Math.cos(a) * 0.24, 0.05, cz + Math.sin(a) * 0.24], q = [cx + Math.cos(a) * 0.1, 0.4, cz + Math.sin(a) * 0.1];
    stick(b, 0.045, C.hay, p, lerp(p, q, 0.72), SHEAF);
    stick(b, 0.06, C.thatch, lerp(p, q, 0.7), lerp(p, q, 1.02), SHEAF);
  }
  return 1.59;
}

// Storage Pit: a pit dug into the ground and lined with a log crib, its back half roofed with hides (one dyed in the
// team colour) on a log frame; stones and gold heaped in the open half, cut logs stacked beside it, dug earth around.
export function storage_pit(ctx) {
  const { b, t } = ctx, cx = -0.14, cz = -0.12, R = 0.46;
  b.cyl(0.86, 0.05, P.dirt);
  for (const [x, z, r, ry] of [[-0.62, 0.56, 0.19, 0.3], [0.12, 0.66, 0.17, 1.1], [0.62, -0.62, 0.16, 2]]) b.rock(r, 0x6a5a42, x, 0.02, z, 1.3, 0.6, 1, ry);
  b.box(R * 2, 0.014, R * 2, C.dark, cx, 0.05, cz);
  // Log crib: two courses all round, the ends crossing at the corners.
  for (const [y, c] of [[0.105, C.woodD], [0.205, C.wood]]) for (const k of [-1, 1]) {
    stick(b, 0.055, c, [cx - R - 0.1, y, cz + k * R], [cx + R + 0.1, y, cz + k * R]);
    stick(b, 0.055, c, [cx + k * R, y + 0.01, cz - R - 0.1], [cx + k * R, y + 0.01, cz + R + 0.1]);
  }
  // Stones and gold heaped in the pit's open half.
  for (const [x, z, r, y, c] of [[-0.34, 0.12, 0.13, 0.04, C.stone], [-0.16, 0.2, 0.1, 0.04, C.stoneD], [-0.28, -0.02, 0.1, 0.04, C.stoneD], [-0.26, 0.1, 0.09, 0.15, C.stone]]) b.rock(r, c, x, y, z, 1, 0.9, 1, x * 9);
  for (const [x, z, r, y] of [[0.1, 0.16, 0.09, 0.04], [0.18, 0.02, 0.08, 0.04], [0.02, 0.03, 0.08, 0.04], [0.1, 0.08, 0.07, 0.15]]) b.rock(r, C.gold, x, y, z, 1, 0.8, 1, z * 20);
  // Log frame: tall posts at the back, short ones mid-pit, hides lashed between them.
  const xs = [cx - R - 0.04, cx + R + 0.04], zb = cz - R - 0.03, zf = cz + 0.06, yb = 0.92, yf = 0.56;
  for (const x of xs) {
    b.cyl(0.04, yb - 0.05, C.woodD, x, 0.05, zb).cyl(0.035, yf - 0.05, C.woodD, x, 0.05, zf);
    stick(b, 0.03, C.wood, [x, yf - 0.02, zf], [x, yb - 0.02, zb]);
  }
  stick(b, 0.045, C.wood, [xs[0] - 0.1, yb, zb], [xs[1] + 0.1, yb, zb]);
  stick(b, 0.04, C.wood, [xs[0] - 0.08, yf, zf], [xs[1] + 0.08, yf, zf]);
  hideRoof(b, xs[0] - 0.06, xs[1] + 0.06, [yb, zb], [yf, zf], [P.hideD, t, P.hide]);
  // Cut logs stacked beside the pit.
  for (const [x, y] of [[0.5, 0.11], [0.64, 0.11], [0.78, 0.11], [0.57, 0.21], [0.71, 0.21]]) stick(b, 0.06, x === 0.64 || x === 0.57 ? C.woodD : C.wood, [x, y, 0.22], [x, y, 0.84]);
  return 1.0;
}

// Farm: a patch of wild grain staked out with a cord, team-dyed ties on the corner stakes, a bird-scarer hung with a
// team-dyed hide, and a gathering basket. The grain is extra.crops, which animate() shows once the farm is finished
// and shrinks as its food runs out.
export function farm(ctx) {
  const { b, t, extra } = ctx, E = 0.8;
  b.box(1.76, 0.03, 1.76, P.dirt);
  for (const [x, z, r] of [[-0.3, -0.25, 0.5], [0.3, 0.22, 0.46], [0.32, -0.4, 0.34], [-0.36, 0.38, 0.36], [0.0, 0.0, 0.4]]) b.cyl(r, 0.045, 0x6b4a26, x, 0, z);
  // Sixteen stakes round the edge, leaning a little, with a cord between them; one gap at the front.
  const at = [];
  for (let i = 0; i < 16; i++) { const f = (i % 4) / 2 - 1, p = [[f, -1], [1, f], [-f, 1], [-1, -f]][i >> 2]; at.push([p[0] * E, p[1] * E]); }
  at.forEach(([x, z], i) => {
    const hh = 0.27 + (i % 3) * 0.04, lean = ((i * 5) % 7 - 3) * 0.02, top = [x + lean, 0.05 + hh, z - lean * 0.6];
    stick(b, 0.022, C.wood, [x, 0.03, z], top);
    stick(b, 0.024, C.woodD, top, [top[0], top[1] + 0.06, top[2]], POINT);
    if (i % 4 === 0) stick(b, 0.03, t, lerp([x, 0.03, z], top, 0.6), lerp([x, 0.03, z], top, 0.78)); // team-dyed tie
    const [x2, z2] = at[(i + 1) % 16];
    if (i !== 9) stick(b, 0.008, C.leather, [x, 0.2, z], [x2, 0.2, z2]);
  });
  // The bird-scarer: a cross-stake hung with a team-dyed hide, a straw bundle for a head.
  const mx = -0.6, mz = -0.6, ry = Math.PI / 4;
  b.cyl(0.03, 0.66, C.woodD, mx, 0.03, mz).cone(0.07, 0.16, C.hay, mx, 0.62, mz, 6).sph(0.055, C.hay, mx, 0.64, mz);
  stick(b, 0.022, C.wood, [mx - 0.17, 0.52, mz + 0.17], [mx + 0.17, 0.52, mz - 0.17]);
  b.box(0.3, 0.26, 0.025, t, mx, 0.27, mz, 0, ry).box(0.32, 0.04, 0.03, P.hideD, mx, 0.49, mz, 0, ry);
  // A gathering basket of grain by the gap in the cord.
  b.cylT(0.12, 0.09, 0.15, P.wattle, 0.2, 0.03, 0.68, 8).sph(0.1, C.hay, 0.2, 0.18, 0.68, 1, 0.45, 1);
  // Wild grain: leafy clumps on a jittered grid with gaps, each with three ripening stalks and their seed heads.
  const cr = new B();
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    if (hash(i, j) < 0.1 || (i < 2 && j < 2) || (i >= 4 && i <= 5 && j === 6)) continue;
    const x = -0.63 + i * 0.21 + (hash(j, i) - 0.5) * 0.1, z = -0.63 + j * 0.21 + (hash(i + 9, j) - 0.5) * 0.1;
    cr.cone(0.075, 0.2, [0x7d9a42, 0x949a45, 0x6f8f3a][(i + 2 * j) % 3], x, 0.03, z, 5, i + j);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i * 1.7 + j, hh = 0.3 + hash(i * 3 + k, j) * 0.14, tip = [x + Math.cos(a) * 0.06, 0.03 + hh, z + Math.sin(a) * 0.06];
      stick(cr, 0.014, (i * 3 + j + k) % 3 ? 0xb0a64a : 0x8bab45, [x, 0.03, z], tip, STALK);
      cr.rock(0.03, k % 2 ? 0xd9a93a : 0xc8962e, tip[0], tip[1] - 0.025, tip[2], 1, 2.2, 1, a);
    }
  }
  extra.crops = cr.geometry();
  return 0.8;
}

// Barracks: a sparring ground ringed with stones round a hide-wrapped training post, a spear rack and a shield rack
// with painted hide shields, and a hide lean-to for the war band, whose flag flies from the lean-to's ridge post.
export function barracks(ctx) {
  const { b, t } = ctx;
  b.cyl(1.34, 0.05, P.dirt);
  // The ring: trodden sand inside a circle of stones.
  const rx = 0.36, rz = 0.4;
  b.cyl(0.68, 0.02, 0xa48a5e, rx, 0.05, rz);
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; b.rock(0.075, i % 2 ? C.stone : C.stoneD, rx + Math.cos(a) * 0.76, 0.04, rz + Math.sin(a) * 0.76, 1.25, 0.75, 1, a); }
  // Training post: a hide-wrapped bundle with a head, outstretched arms and a team-dyed sash.
  b.cyl(0.045, 0.98, C.woodD, rx, 0.05, rz).cylT(0.11, 0.14, 0.4, P.hide, rx, 0.3, rz, 8).cylT(0.12, 0.15, 0.08, t, rx, 0.5, rz, 8);
  for (const y of [0.34, 0.66]) b.cylT(0.115, 0.115, 0.025, P.hideD, rx, y, rz, 8);
  b.sph(0.1, P.hide, rx, 0.92, rz);
  stick(b, 0.03, C.wood, [rx - 0.32, 0.74, rz], [rx + 0.32, 0.74, rz]);
  for (const k of [-1, 1]) b.sph(0.045, P.hideD, rx + k * 0.32, 0.74, rz);
  // The lean-to: tall forked posts at the back, short ones at the front, hides lashed between them.
  const xs = [-1.12, -0.12], zb = -1.08, zf = -0.38, yb = 1.16, yf = 0.56;
  for (const x of xs) {
    b.cyl(0.045, yb - 0.05, C.woodD, x, 0.05, zb).cyl(0.04, yf - 0.05, C.woodD, x, 0.05, zf);
    for (const k of [-1, 1]) stick(b, 0.02, C.woodD, [x, yb - 0.02, zb], [x + k * 0.07, yb + 0.12, zb]);
    stick(b, 0.03, C.wood, [x, yf - 0.03, zf], [x, yb - 0.03, zb]);
  }
  stick(b, 0.05, C.wood, [xs[0] - 0.12, yb, zb], [xs[1] + 0.12, yb, zb]);
  stick(b, 0.045, C.wood, [xs[0] - 0.1, yf, zf], [xs[1] + 0.1, yf, zf]);
  hideRoof(b, xs[0] - 0.08, xs[1] + 0.08, [yb, zb], [yf, zf], [P.hide, P.hideD, 0xb39169, P.hide]);
  // Furs and a log seat in the shelter.
  b.box(0.62, 0.06, 0.36, P.hideD, -0.62, 0.05, -0.82).box(0.36, 0.05, 0.28, P.hide, -0.76, 0.11, -0.8, 0, 0.3);
  stick(b, 0.06, C.wood, [-0.95, 0.11, -0.5], [-0.3, 0.11, -0.5]);
  // Spear rack: two forked posts and a bar, flint-tipped spears and clubs leaning on it.
  const sx = -1.02;
  for (const z of [0.0, 0.82]) { b.cyl(0.035, 0.58, C.woodD, sx, 0.05, z); for (const k of [-1, 1]) stick(b, 0.018, C.woodD, [sx, 0.6, z], [sx, 0.7, z + k * 0.06]); }
  stick(b, 0.03, C.wood, [sx, 0.62, -0.06], [sx, 0.62, 0.88]);
  for (let i = 0; i < 5; i++) {
    const z = 0.1 + i * 0.15, p = [sx + 0.2, 0.05, z + 0.02], q = [sx - 0.08, 1.02, z - 0.02];
    stick(b, 0.016, C.wood, p, q);
    stick(b, 0.035, C.stoneD, q, lerp(p, q, 1.14), POINT);
  }
  for (const z of [0.2, 0.62]) stick(b, 0.05, C.woodD, [sx + 0.2, 0.05, z], [sx + 0.03, 0.56, z + 0.04], CLUB);
  // Shield rack at the back: a log on two posts with three painted hide shields facing the yard.
  const hz = -0.92;
  for (const x of [0.36, 1.18]) b.cyl(0.035, 0.6, C.woodD, x, 0.05, hz);
  stick(b, 0.035, C.wood, [0.3, 0.58, hz], [1.24, 0.58, hz]);
  for (const x of [0.5, 0.77, 1.04]) b.add(unit.cyl, P.hide, x, 0.4, hz + 0.05, 0.14, 0.03, 0.14, Math.PI / 2, 0, 0).add(unit.cyl, t, x, 0.4, hz + 0.07, 0.1, 0.02, 0.1, Math.PI / 2, 0, 0).sph(0.03, P.bone, x, 0.4, hz + 0.09);
  firePit(ctx, -0.52, 0.98);
  flag(ctx, xs[1], yb + 0.02, zb, 0.72, C.woodD, [0.3, 0.52]);
  return 1.35;
}
