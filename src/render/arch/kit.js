// Design kit for the per-era building designs in arch/<era>.js. A design draws into a context: `ctx.b` is the body
// (scales up during construction, counts toward the height cap), `ctx.mast` holds flagpoles, antennas and thin spire
// tips, and `ctx.extra` carries the flag and the animated parts (spinners, floaters, smoke; see buildingModel).
import * as THREE from 'three';
import { B, C, unit, TEAM, TEAM_DARK } from '../builder.js';

// The era designs' palette (from the prototype), on top of builder.js's C.
export const P = {
  hide: 0xa8875a, hideD: 0x7d5f3b, wattle: 0x9c7a4f, dirt: 0x6f6551, bone: 0xe8e0c8, fire: 0xff8a2a, ember: 0xffc04a,
  mud: 0xc9a06a, mudD: 0xa77f4f, slate: 0x4f5a66, beam: 0x3a2a1c, plaster: 0xe8dcc0, brick: 0xa8553f, brickD: 0x6b3426,
  white: 0xf2efe6, tile: 0xb0442e, iron: 0x4a4f55, steel: 0x8a949c, brass: 0xc9a13a, glass: 0x5f8fb0, concrete: 0xc4c2bc,
  dark: 0x26343c, snow: 0xf4f6f7, chrome: 0xd8e2e8, neonC: 0x39f3ff, neonM: 0xff3df2, olive: 0x55603a, smoke: 0x9a9a9a,
};
const SCAFFOLD = 0xa8823f;

export function designCtx(type, team, size, age) {
  const s = size - 0.22;
  return { b: new B(), mast: new B(), extra: {}, type, team, size, s, h: s / 2, t: TEAM[team], td: TEAM_DARK[team], age };
}

// ---------- shape helpers (any B) ----------
// A pole (or log) of radius r from point p to point q; geo's +y end lands on q.
export const stick = (b, r, c, [x1, y1, z1], [x2, y2, z2], geo = unit.cyl) => {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, L = Math.hypot(dx, dy, dz);
  b.add(geo, c, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, r, L, r, Math.atan2(dz, dy), 0, -Math.asin(dx / L));
};
export const lerp = (p, q, f) => p.map((v, i) => v + (q[i] - v) * f);
// A deterministic 0..1 value per integer pair, for scatter that comes out the same on every build.
export const hash = (i, j) => (Math.imul(i * 73 + j * 151 + 7, 2654435761) >>> 0) % 1000 / 1000;
// Adds a part drawn in its own B (built at the origin) to b at (x, y, z), turned ry about y and scaled k, keeping its
// colours.
export const place = (b, part, x, y, z, ry = 0, k = 1) => {
  const g = part.geometry();
  b.add(g, 0xffffff, x, y, z, k, k, k, 0, ry, 0);
  const last = b.geos[b.geos.length - 1];
  last.setAttribute('color', g.attributes.color.clone()); last.setAttribute('surface', g.attributes.surface.clone());
  g.dispose();
};

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
// A pole `len` tall standing on y (into ctx.mast) with the team flag at its top, flush with the pole's tip.
// cloth is the flag's [height, length]; it flies along +z from the pole.
export const flag = (ctx, x, y, z, len = 0.7, pole = C.woodD, cloth = [0.28, 0.5]) => {
  const [ch, cl] = cloth;
  ctx.mast.cyl(0.025, len, pole, x, y, z);
  ctx.extra.flag = new B().box(0.025, ch, cl, ctx.t, 0, 0, cl / 2).geometry(); ctx.extra.flagAt = [x, y + len - ch, z];
};
export const firePit = (ctx, x, z) => {
  const { b } = ctx;
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; b.sph(0.05, C.stoneD, x + Math.cos(a) * 0.13, 0.03, z + Math.sin(a) * 0.13); }
  b.cone(0.08, 0.22, P.fire, x, 0.02, z, 5).cone(0.04, 0.14, P.ember, x, 0.05, z, 5);
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
  const g = new B().add(unit.cyl, color, 0, 0, 0, R, 0.06, R, Math.PI / 2, 0, 0).add(unit.cyl, P.brass, 0, 0, 0.04, 0.09, 0.08, 0.09, Math.PI / 2, 0, 0);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; g.box(0.1, 0.1, 0.07, color, Math.cos(a) * R, Math.sin(a) * R - 0.05, 0, 0, 0, a); }
  return g.geometry();
};
export const puff = () => new B().sph(0.12, P.smoke, 0, 0, 0).sph(0.09, 0x8a8a8a, 0.08, 0.1, 0.03).sph(0.08, 0xa8a8a8, -0.06, 0.16, -0.02).geometry();

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
