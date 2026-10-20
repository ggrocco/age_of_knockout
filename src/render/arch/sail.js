// Age of Sail: a Georgian brick townhouse, a white town hall with a cupola and clock.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, windowGrid } from './kit.js';

const hipRoof = new THREE.ConeGeometry(1, 1, 4);

export function house(ctx) {
  const { b, s, td } = ctx, W = s - 0.25, D = s - 0.35;
  b.box(W, 1.15, D, P.brick).box(W + 0.1, 0.08, D + 0.1, P.white, 0, 1.15, 0).box(W + 0.04, 0.1, D + 0.04, P.white, 0, 0, 0);
  b.add(hipRoof, P.tile, 0, 1.23 + 0.32, 0, W * 0.78, 0.64, D * 0.8, 0, Math.PI / 4, 0);
  for (const k of [-1, 1]) b.box(0.16, 0.6, 0.32, P.brick, k * (W / 2 - 0.12), 1.23, 0).box(0.2, 0.06, 0.36, P.white, k * (W / 2 - 0.12), 1.83, 0);
  windowGrid(ctx, 3, 2, W, D / 2 + 0.01, 0.2, 0.5, P.white, 0x3f5f7a);
  b.box(0.24, 0.42, 0.05, td, 0, 0.0, D / 2 + 0.04).roof(0.36, 0.12, 0.06, P.white, 0, 0.44, D / 2 + 0.05).box(0.4, 0.06, 0.2, 0xd9cfb0, 0, 0, D / 2 + 0.12);
  return 1.89;
}

export function town_center(ctx) {
  const { b, mast, extra, s, t, td } = ctx, W = s - 0.3, D = s * 0.6, z0 = -0.2;
  b.box(s + 0.12, 0.12, s + 0.12, 0xd9cfb0).box(W, 1.35, D, P.white, 0, 0.12, z0);
  b.add(hipRoof, P.tile, 0, 1.47 + 0.3, z0, W * 0.74, 0.6, D * 0.78, 0, Math.PI / 4, 0);
  windowGrid(ctx, 6, 2, W, z0 + D / 2 + 0.01, 0.35, 0.55, P.white, 0x2f4f6a);
  // Portico: four columns under a pediment, over the team-coloured door.
  for (let i = 0; i < 4; i++) b.cyl(0.07, 1.1, P.white, -0.45 + i * 0.3, 0.12, z0 + D / 2 + 0.3);
  b.box(1.2, 0.12, 0.42, P.white, 0, 1.22, z0 + D / 2 + 0.2).roof(1.25, 0.32, 0.44, P.white, 0, 1.34, z0 + D / 2 + 0.2).box(0.4, 0.55, 0.05, td, 0, 0.12, z0 + D / 2 + 0.02);
  // Clock tower and its copper cupola.
  b.box(0.5, 0.5, 0.5, P.white, 0, 1.75, z0).add(unit.cyl, P.white, 0, 2.05, z0 + 0.26, 0.16, 0.03, 0.16, Math.PI / 2, 0, 0).box(0.02, 0.12, 0.02, C.dark, 0, 2.03, z0 + 0.28).box(0.09, 0.02, 0.02, C.dark, 0.03, 2.05, z0 + 0.28);
  b.sph(0.32, 0x5d7f6a, 0, 2.25, z0, 1, 0.8, 1);
  // The cupola's thin spire carries the flag (the prototype's thinner, darker pole, flag set a little above its tip).
  mast.cyl(0.02, 0.5, C.dark, 0, 2.45, z0);
  extra.flag = new B().box(0.025, 0.28, 0.5, t, 0, 0, 0.25).geometry(); extra.flagAt = [0, 2.75, z0];
  return 2.51;
}
