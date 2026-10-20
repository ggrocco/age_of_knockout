// Bronze Age: Mesopotamian mud-brick, flat roof terraces, a stepped ziggurat with a shrine.
import { C } from '../builder.js';
import { P, flag } from './kit.js';

export function house(ctx) {
  const { b, s, t } = ctx, W = s - 0.2;
  b.box(s + 0.1, 0.1, s + 0.1, P.mudD).box(W, 0.82, W, P.mud, 0, 0.1, 0);
  for (const k of [-1, 1]) b.box(W, 0.14, 0.08, P.mudD, 0, 0.92, k * W / 2).box(0.08, 0.14, W, P.mudD, k * W / 2, 0.92, 0);
  // Roof-terrace awning in team colour, an outside stair, the door and a vent, and storage jars on the roof.
  b.box(0.04, 0.45, 0.04, C.wood, -0.45, 0.92, -0.45).box(0.04, 0.45, 0.04, C.wood, 0.45, 0.92, -0.45).box(1.0, 0.03, 0.6, t, 0, 1.33, -0.22, 0.12);
  for (let i = 0; i < 5; i++) b.box(0.24, 0.18 * (i + 1), 0.2, P.mudD, W / 2 + 0.12, 0.1, 0.55 - i * 0.2);
  b.box(0.3, 0.5, 0.04, C.dark, -0.2, 0.1, W / 2 + 0.01).box(0.12, 0.08, 0.04, C.dark, 0.3, 0.6, W / 2 + 0.01);
  b.sph(0.08, 0xa56843, -0.3, 1.02, 0.25, 1, 1.25, 1).sph(0.07, 0xa56843, -0.12, 1.0, 0.3, 1, 1.25, 1);
  return 1.4;
}

export function town_center(ctx) {
  const { b, s, t } = ctx;
  b.box(s, 0.55, s, P.mud).box(s - 0.7, 0.5, s - 0.7, P.mudD, 0, 0.55, 0).box(s - 1.4, 0.45, s - 1.4, P.mud, 0, 1.05, 0);
  for (let i = 0; i < 8; i++) b.box(0.55, 0.19 * (i + 1), 0.17, 0xb88f5c, 0, 0, s / 2 + 0.16 - i * 0.17); // the grand stair
  b.box(0.62, 0.45, 0.62, 0xe0c9a0, 0, 1.5, 0).box(0.2, 0.3, 0.04, C.dark, 0, 1.5, 0.31).cone(0.44, 0.35, C.bronze, 0, 1.95, 0, 4, Math.PI / 4); // shrine
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.cylT(0.08, 0.05, 0.14, C.bronze, x * (s / 2 - 0.18), 0.55, z * (s / 2 - 0.18), 8).cone(0.07, 0.16, P.fire, x * (s / 2 - 0.18), 0.69, z * (s / 2 - 0.18), 5);
  for (const x of [-0.85, 0.85]) b.box(0.3, 0.46, 0.02, t, x, 0.05, s / 2 + 0.01).box(0.3, 0.05, 0.03, C.bronze, x, 0.5, s / 2 + 0.01);
  flag(ctx, 0, 2.28, 0, 0.6);
  return 2.3;
}
