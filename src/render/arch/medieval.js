// Medieval Age: half-timbered houses, a stone hall with a tall spired keep tower.
import { B, C, unit } from '../builder.js';
import { P } from './kit.js';

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
