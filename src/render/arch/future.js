// AI Future: floating rings and plates, a chrome spire, neon edges, orbiting drones.
import { B, unit } from '../builder.js';
import { P, ring } from './kit.js';

export function house(ctx) {
  const { b, extra, t } = ctx;
  // A pod on a chrome stem; the neon edge ring sits flush under the dark base disc.
  b.cylT(0.64, 0.64, 0.03, P.neonM, 0, 0.0, 0, 24).cyl(0.62, 0.06, P.dark).cylT(0.07, 0.15, 0.75, P.chrome, 0, 0.05, 0, 10);
  b.sph(0.5, P.snow, 0, 1.05, 0, 1.15, 0.72, 1.15).sph(0.505, P.dark, 0, 1.08, 0, 1.16, 0.22, 1.16).box(0.2, 0.05, 0.05, t, 0, 1.36, 0.42);
  extra.floaters = [
    { geo: ring(0.68, 0.035, P.neonC), at: [0, 1.05, 0], amp: 0.1, speed: 1.4 },
    { geo: new B().sph(0.08, P.chrome).add(unit.cyl, P.neonC, 0, -0.06, 0, 0.12, 0.015, 0.12).geometry(), at: [0.75, 1.6, 0.4], amp: 0.15, speed: 2.2, phase: 1 }, // a drone
  ];
  extra.spinners = [{ geo: ring(0.82, 0.02, P.neonM, 0.35), at: [0, 1.05, 0], axis: 'y', speed: 0.9 }];
  return 1.41;
}

export function town_center(ctx) {
  const { b, extra, t } = ctx;
  // Neon-edged plinth and dome, the chrome spire with its glowing tip (solid, so it stays in the body), three pylons.
  b.cylT(1.25, 1.35, 0.25, P.snow, 0, 0, 0, 24).cylT(1.36, 1.36, 0.04, P.neonC, 0, 0.12, 0, 24).sph(0.85, P.snow, 0, 0.25, 0, 1, 0.65, 1).sph(0.86, P.dark, 0, 0.42, 0, 1, 0.18, 1);
  b.cylT(0.1, 0.42, 2.7, P.chrome, 0, 0.25, 0, 8).sph(0.13, P.neonC, 0, 3.0, 0).box(0.26, 0.5, 0.03, t, 0, 1.4, 0.25);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; b.box(0.1, 0.9, 0.1, P.chrome, Math.cos(a) * 1.0, 0.25, Math.sin(a) * 1.0).box(0.14, 0.04, 0.14, P.neonM, Math.cos(a) * 1.0, 1.15, Math.sin(a) * 1.0); }
  // Two counter-rotating rings and three orbiting drones.
  const drones = new B();
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; drones.sph(0.09, P.chrome, Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55).add(unit.cyl, P.neonC, Math.cos(a) * 1.55, -0.07, Math.sin(a) * 1.55, 0.14, 0.015, 0.14); }
  extra.spinners = [
    { geo: ring(1.15, 0.04, P.neonC, 0.3), at: [0, 1.8, 0], axis: 'y', speed: 0.8 },
    { geo: ring(1.45, 0.03, P.neonM, -0.25), at: [0, 1.3, 0], axis: 'y', speed: -0.6 },
    { geo: drones.geometry(), at: [0, 2.3, 0], axis: 'y', speed: 1.3 },
  ];
  // Two hovering landing plates.
  extra.floaters = [
    { geo: new B().box(0.55, 0.05, 0.55, P.snow).box(0.57, 0.02, 0.57, P.neonM, 0, -0.02, 0).geometry(), at: [-1.0, 1.6, 0.6], amp: 0.12, speed: 1.3 },
    { geo: new B().box(0.45, 0.05, 0.45, P.snow).box(0.47, 0.02, 0.47, P.neonC, 0, -0.02, 0).geometry(), at: [0.95, 2.0, -0.7], amp: 0.1, speed: 1.7, phase: 2 },
  ];
  // A small flag flies from the glowing tip; there is no pole.
  extra.flag = new B().box(0.02, 0.24, 0.4, t, 0, 0, 0.2).geometry(); extra.flagAt = [0, 3.1, 0];
  return 3.13;
}
