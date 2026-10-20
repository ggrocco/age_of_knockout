// Design kit for the per-era building designs in arch/<era>.js. A design draws into a context: `ctx.b` is the body
// (scales up during construction, counts toward the height cap), `ctx.mast` holds flagpoles, antennas and thin spire
// tips, and `ctx.extra` carries the flag and the animated parts (spinners, floaters, smoke; see buildingModel).
import * as THREE from 'three';
import { B, C, unit, TEAM, TEAM_DARK } from '../builder.js';

const FIRE = 0xff8a2a, EMBER = 0xffc04a, BRASS = 0xc9a13a, SCAFFOLD = 0xa8823f;

export function designCtx(type, team, size, age) {
  const s = size - 0.22;
  return { b: new B(), mast: new B(), extra: {}, type, team, size, s, h: s / 2, t: TEAM[team], td: TEAM_DARK[team], age };
}

// ---------- body helpers (draw into ctx.b) ----------
export const door = (ctx, w, hh, z, x = 0) => { ctx.b.box(w, hh, 0.06, C.dark, x, 0.16, z).box(w + 0.1, 0.06, 0.08, C.woodD, x, 0.16 + hh, z); };
export const win = (ctx, x, y, z, ry = 0) => { ctx.b.box(0.22, 0.22, 0.05, C.glass, x, y, z, 0, ry).box(0.28, 0.04, 0.07, C.woodD, x, y + 0.22, z, 0, ry); };
export const found = (ctx, w, d) => {
  const { b } = ctx;
  b.box(w + 0.12, 0.12, d + 0.12, 0x756852, 0, 0, 0);
  for (let x = -w / 2; x < w / 2; x += 0.32) for (const z of [-d / 2, d / 2]) {
    b.box(0.29, 0.09, 0.16, Math.round(x * 100) % 3 ? 0xa6977b : 0xb3a487, x + 0.12, 0.09, z);
  }
};
export const banner = (ctx, x, z, y0, hh) => { ctx.b.cyl(0.025, hh, C.woodD, x, y0, z).box(0.02, 0.32, 0.28, ctx.t, x, y0 + hh - 0.34, z + 0.15); };
// A 0.7-tall pole standing on y (into ctx.mast) with the team flag at its top, flush with the pole's tip.
export const flag = (ctx, x, y, z) => {
  ctx.mast.cyl(0.025, 0.7, C.woodD, x, y, z);
  ctx.extra.flag = new B().box(0.025, 0.28, 0.5, ctx.t, 0, 0, 0.25).geometry(); ctx.extra.flagAt = [x, y + 0.42, z];
};
export const firePit = (ctx, x, z) => {
  const { b } = ctx;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.sph(0.05, C.stoneD, x + Math.cos(a) * 0.13, 0.03, z + Math.sin(a) * 0.13); }
  b.cone(0.08, 0.22, FIRE, x, 0.02, z, 5).cone(0.04, 0.14, EMBER, x, 0.05, z, 5);
};
// cols × rows framed windows across width w on the wall face at z, the first row at y0, rows dy apart.
export const windowGrid = (ctx, cols, rows, w, z, y0, dy, frame, glass, x0 = 0) => {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = x0 + (c - (cols - 1) / 2) * (w / cols);
    ctx.b.box(0.2, 0.24, 0.04, frame, x, y0 + r * dy, z).box(0.15, 0.19, 0.05, glass, x, y0 + r * dy + 0.025, z);
  }
};

// ---------- geometry makers for animated parts ----------
// A horizontal ring of radius r (tube scales with r), tipped by `tilt` radians about x.
export const ring = (r, tube, color, tilt = 0) => new B().add(new THREE.TorusGeometry(1, tube, 6, 40), color, 0, 0, 0, r, r, r, Math.PI / 2 + tilt, 0, 0).geometry();
// A 12-tooth gear of radius R facing +z, with a brass hub.
export const gear = (R, color) => {
  const g = new B().add(unit.cyl, color, 0, 0, 0, R, 0.06, R, Math.PI / 2, 0, 0).add(unit.cyl, BRASS, 0, 0, 0.04, 0.09, 0.08, 0.09, Math.PI / 2, 0, 0);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.box(0.1, 0.1, 0.07, color, Math.cos(a) * R, Math.sin(a) * R - 0.05, 0, 0, 0, a); }
  return g.geometry();
};
export const puff = () => new B().sph(0.12, 0x9a9a9a, 0, 0, 0).sph(0.09, 0x8a8a8a, 0.08, 0.1, 0.03).sph(0.08, 0xa8a8a8, -0.06, 0.16, -0.02).geometry();

// Scaffolding around the footprint, sh tall: corner posts, rails every 0.6 and two diagonal braces.
function scaffold(s, sh) {
  const sc = new B(), w = s / 2 + 0.12;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) sc.box(0.06, sh, 0.06, SCAFFOLD, x * w, 0, z * w);
  for (let y = 0.5; y < sh; y += 0.6) for (const [x, z, ry] of [[0, -w, 0], [0, w, 0], [-w, 0, Math.PI / 2], [w, 0, Math.PI / 2]]) sc.box(w * 2, 0.05, 0.05, SCAFFOLD, x, y, z, 0, ry);
  for (const [x, z, ry] of [[0, w, 0], [w, 0, Math.PI / 2]]) sc.box(w * 2.2, 0.04, 0.04, SCAFFOLD, x, sh / 2, z, 0, ry, 0.6);
  return sc.geometry();
}

// Ends a design: merges the body and mast and adds the scaffold, scaffoldHeight tall (the design's return value).
export function finish(ctx, scaffoldHeight) {
  if (!(scaffoldHeight > 0)) throw new Error(`${ctx.type}/${ctx.age}: a design must return its scaffold height`);
  ctx.extra.scaffold = scaffold(ctx.s, scaffoldHeight);
  return { body: ctx.b.geometry(), mast: ctx.mast.geos.length ? ctx.mast.geometry() : null, extra: ctx.extra };
}
