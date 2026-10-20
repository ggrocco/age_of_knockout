// Modern Age: today's glass and concrete, solar panels, antennas, a helipad tower.
import { C } from '../builder.js';
import { P } from './kit.js';

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
