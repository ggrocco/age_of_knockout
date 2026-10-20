// Stone Age: hide tents and a chieftain's round hut with a totem.
import { C, unit } from '../builder.js';
import { P, flag, firePit } from './kit.js';

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
