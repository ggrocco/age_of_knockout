// Industrial Age: brick and iron, turning gears, smokestacks, a water tower, pipes.
import { C, unit } from '../builder.js';
import { P, flag, gear, puff } from './kit.js';

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
