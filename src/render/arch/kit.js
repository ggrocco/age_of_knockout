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
const FOUNDATION = 0x756852, KERB_STONE = 0xa6977b, KERB_STONE_L = 0xb3a487;

// The context a design draws into. s is the footprint's side (a little inside the tiles) and h half of it; t and td are
// the team colour and its dark shade.
export function designCtx(type, team, size, age) {
  const s = size - 0.22;
  return { b: new B(), mast: new B(), extra: {}, type, team, size, s, h: s / 2, t: TEAM[team], td: TEAM_DARK[team], age };
}

// Adds an animated part to the list ctx.extra[key] (spinners, floaters, smoke), starting the list if needed.
export const pushExtra = (extra, key, part) => (extra[key] ??= []).push(part);

// ---------- shape helpers (any B) ----------
// A pole (or log) of radius `radius` from point `from` to point `to`; geo's +y end lands on `to`.
export const stick = (b, radius, color, [x1, y1, z1], [x2, y2, z2], geo = unit.cyl) => {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1, length = Math.hypot(dx, dy, dz);
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2, midZ = (z1 + z2) / 2;
  b.add(geo, color, midX, midY, midZ, radius, length, radius, Math.atan2(dz, dy), 0, -Math.asin(dx / length));
};
// The point a fraction of the way from `from` to `to` (beyond 1 it carries on past `to`).
export const lerp = (from, to, fraction) => from.map((v, i) => v + (to[i] - v) * fraction);
// A deterministic 0..1 value per integer pair, for scatter that comes out the same on every build.
export const hash = (i, j) => (Math.imul(i * 73 + j * 151 + 7, 2654435761) >>> 0) % 1000 / 1000;
// Adds a part drawn in its own B (built at the origin) to b at (x, y, z), turned `turn` about y and scaled `scale`,
// keeping its colours.
export const place = (b, part, x, y, z, turn = 0, scale = 1) => {
  const geo = part.geometry();
  b.add(geo, 0xffffff, x, y, z, scale, scale, scale, 0, turn, 0);
  const copy = b.geos[b.geos.length - 1];
  copy.setAttribute('color', geo.attributes.color.clone());
  copy.setAttribute('surface', geo.attributes.surface.clone());
  geo.dispose();
};

// ---------- low-poly shapes for small repeated parts, centred on the origin ----------
export const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6), BALL = new THREE.SphereGeometry(1, 6, 4);
export const CONE4 = new THREE.ConeGeometry(1, 1, 4);
export const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8), DISC = new THREE.CylinderGeometry(1, 1, 1, 12);
// A square base of half-side 1 at y = -0.5 tapering to 0.7 at y = 0.5 (turf banks, plinths).
export const FRUSTUM = new THREE.CylinderGeometry(0.7, 1, 1, 4).rotateY(Math.PI / 4).scale(Math.SQRT2, 1, Math.SQRT2);
// ARCH: a half disc facing +z, flat side down at the origin (an arched opening's head); ARCH_RING: its half-ring frame.
export const ARCH = new THREE.CircleGeometry(1, 8, 0, Math.PI);
export const ARCH_RING = new THREE.TorusGeometry(1, 0.16, 4, 8, Math.PI);
// A ramp of unit size across x, high at z = 0 and down to the ground at z = 1 (stairs, ramps, lean-to gable walls).
export const WEDGE = (() => {
  const triangle = new THREE.Shape();
  triangle.moveTo(0, 0);
  triangle.lineTo(1, 0);
  triangle.lineTo(0, 1);
  triangle.closePath();
  const geo = new THREE.ExtrudeGeometry(triangle, { depth: 1, bevelEnabled: false });
  geo.rotateY(-Math.PI / 2);
  geo.translate(0.5, 0, 0);
  return geo;
})();
// An oak barrel with iron hoops standing on y: a straight body, a wider belly round its middle, a hoop near each end.
export const barrel = (b, x, y, z, radius = 0.07, height = 0.17) => {
  const ends = radius * 0.86, hoop = radius * 0.9;
  b.cylT(ends, ends, height, C.wood, x, y, z, 8);
  b.cylT(radius, radius, height * 0.56, C.wood, x, y + height * 0.22, z, 8);
  for (const along of [0.1, 0.84]) b.cylT(hoop, hoop, 0.018, P.iron, x, y + height * along, z, 8);
};
// A sack of grain of radius r standing on y, tied at the neck.
export const sack = (b, x, y, z, r) => b
  .add(BALL, C.cloth, x, y + r * 0.9, z, r, r, r * 0.85)
  .add(CYL6, C.leather, x, y + r * 1.8, z, r * 0.3, r * 0.4, r * 0.3);
// A low-poly horse facing +x at the origin, with a saddle cloth in `team` colour; for place(). HORSE_HEAD is its coat,
// for horses' heads drawn looking out of stalls.
export const HORSE_HEAD = 0x8a5a33;
const HORSE = HORSE_HEAD, MANE = 0x3a2a1c;
const HORSE_LEGS = [[-0.17, -0.055], [-0.17, 0.055], [0.16, -0.055], [0.16, 0.055]];
export const horse = (team, grazing = false) => {
  const h = new B();
  h.box(0.44, 0.2, 0.17, HORSE, 0, 0.34, 0); // body
  for (const [x, z] of HORSE_LEGS) h.box(0.055, 0.36, 0.055, HORSE, x, 0, z).box(0.06, 0.04, 0.06, MANE, x, 0, z); // leg, hoof
  // The neck and its mane, stretched down to the grass or held up.
  const [neckX, neckY, neckTilt] = grazing ? [0.32, 0.36, 0.9] : [0.25, 0.6, -0.55];
  h.box(0.1, 0.3, 0.1, HORSE, neckX, neckY - 0.15, 0, 0, 0, neckTilt);
  h.box(0.03, 0.26, 0.04, MANE, neckX - 0.04, neckY - 0.13, 0, 0, 0, neckTilt);
  const headX = grazing ? 0.44 : 0.33, headY = grazing ? 0.12 : 0.62;
  h.box(0.2, 0.09, 0.09, HORSE, headX, headY, 0, 0, 0, grazing ? -1.1 : -0.35);
  h.box(0.05, 0.22, 0.04, MANE, -0.25, 0.26, 0, 0, 0, -0.35); // tail
  // The saddle cloth over the back and down both flanks.
  h.box(0.2, 0.025, 0.19, team, -0.02, 0.535, 0);
  h.box(0.2, 0.12, 0.012, team, -0.02, 0.42, 0.093).box(0.2, 0.12, 0.012, team, -0.02, 0.42, -0.093);
  return h;
};

// ---------- body helpers (draw into ctx.b) ----------
// A dark doorway `width` wide and `height` tall on the wall face at z, under a timber lintel.
export const door = (ctx, width, height, z, x = 0) => {
  ctx.b.box(width, height, 0.06, C.dark, x, 0.16, z).box(width + 0.1, 0.06, 0.08, C.woodD, x, 0.16 + height, z);
};
// A glazed window with a timber lintel, turned `turn` about y.
export const win = (ctx, x, y, z, turn = 0) => {
  ctx.b.box(0.22, 0.22, 0.05, C.glass, x, y, z, 0, turn).box(0.28, 0.04, 0.07, C.woodD, x, y + 0.22, z, 0, turn);
};
// A stone foundation slab `width` × `depth`, kerb stones in two shades along its front and back edges.
export const found = (ctx, width, depth) => {
  const { b } = ctx;
  b.box(width + 0.12, 0.12, depth + 0.12, FOUNDATION, 0, 0, 0);
  for (let x = -width / 2; x < width / 2; x += 0.32) for (const z of [-depth / 2, depth / 2]) {
    b.box(0.29, 0.09, 0.16, Math.round(x * 100) % 3 ? KERB_STONE : KERB_STONE_L, x + 0.12, 0.09, z);
  }
};
// A banner pole `height` tall standing on baseY, the team cloth hung near its top.
export const banner = (ctx, x, z, baseY, height) => {
  ctx.b.cyl(0.025, height, C.woodD, x, baseY, z).box(0.02, 0.32, 0.28, ctx.t, x, baseY + height - 0.34, z + 0.15);
};
// A pole `len` tall standing on y (into ctx.mast) with the team flag at its top, flush with the pole's tip.
// cloth is the flag's [height, length]; it flies along +z from the pole.
export const flag = (ctx, x, y, z, len = 0.7, pole = C.woodD, cloth = [0.28, 0.5]) => {
  const [clothHeight, clothLength] = cloth;
  ctx.mast.cyl(0.025, len, pole, x, y, z);
  ctx.extra.flag = new B().box(0.025, clothHeight, clothLength, ctx.t, 0, 0, clothLength / 2).geometry();
  ctx.extra.flagAt = [x, y + len - clothHeight, z];
};
// A ring of six stones round a fire and its glowing embers.
export const firePit = (ctx, x, z) => {
  const { b } = ctx;
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    b.sph(0.05, C.stoneD, x + Math.cos(angle) * 0.13, 0.03, z + Math.sin(angle) * 0.13);
  }
  b.cone(0.08, 0.22, P.fire, x, 0.02, z, 5).cone(0.04, 0.14, P.ember, x, 0.05, z, 5);
};
// cols × rows framed windows across width `width` on the wall face at z, the first row at firstY, rows rowStep apart,
// centred on centreX.
export const windowGrid = (ctx, cols, rows, width, z, firstY, rowStep, frame, glass, centreX = 0) => {
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = centreX + (col - (cols - 1) / 2) * (width / cols), y = firstY + row * rowStep;
    ctx.b.box(0.2, 0.24, 0.04, frame, x, y, z).box(0.15, 0.19, 0.05, glass, x, y + 0.025, z);
  }
};

// ---------- geometry makers for animated parts ----------
// A horizontal ring of radius `radius` (tube scales with it), tipped by `tilt` radians about x.
export const ring = (radius, tube, color, tilt = 0) => new B()
  .add(new THREE.TorusGeometry(1, tube, 6, 40), color, 0, 0, 0, radius, radius, radius, Math.PI / 2 + tilt, 0, 0)
  .geometry();
// A 12-tooth gear of radius `radius` facing +z, with a brass hub.
export const gear = (radius, color) => {
  const g = new B()
    .add(unit.cyl, color, 0, 0, 0, radius, 0.06, radius, Math.PI / 2, 0, 0)
    .add(unit.cyl, P.brass, 0, 0, 0.04, 0.09, 0.08, 0.09, Math.PI / 2, 0, 0);
  for (let i = 0; i < 12; i++) {
    const angle = i * Math.PI / 6;
    g.box(0.1, 0.1, 0.07, color, Math.cos(angle) * radius, Math.sin(angle) * radius - 0.05, 0, 0, 0, angle);
  }
  return g.geometry();
};
// A puff of smoke: three grey balls.
export const puff = () => new B()
  .sph(0.12, P.smoke, 0, 0, 0)
  .sph(0.09, 0x8a8a8a, 0.08, 0.1, 0.03)
  .sph(0.08, 0xa8a8a8, -0.06, 0.16, -0.02)
  .geometry();

// Scaffolding round a footprint of side `side`, `height` tall: corner posts, rails every 0.6 and two diagonal braces.
// legacy.js builds the same scaffold round today's models.
export function scaffold(side, height) {
  const sc = new B(), half = side / 2 + 0.12;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) sc.box(0.06, height, 0.06, SCAFFOLD, x * half, 0, z * half);
  const rails = [[0, -half, 0], [0, half, 0], [-half, 0, Math.PI / 2], [half, 0, Math.PI / 2]];
  for (let y = 0.5; y < height; y += 0.6) for (const [x, z, turn] of rails) {
    sc.box(half * 2, 0.05, 0.05, SCAFFOLD, x, y, z, 0, turn);
  }
  for (const [x, z, turn] of [[0, half, 0], [half, 0, Math.PI / 2]]) {
    sc.box(half * 2.2, 0.04, 0.04, SCAFFOLD, x, height / 2, z, 0, turn, 0.6);
  }
  return sc.geometry();
}

// Ends a design: merges the body and mast and adds the scaffold, scaffoldHeight tall (the design's return value).
export function finish(ctx, scaffoldHeight) {
  if (!(scaffoldHeight > 0)) throw new Error(`${ctx.type}/${ctx.age}: a design must return its scaffold height`);
  ctx.extra.scaffold = scaffold(ctx.s, scaffoldHeight);
  return { body: ctx.b.geometry(), mast: ctx.mast.geos.length ? ctx.mast.geometry() : null, extra: ctx.extra };
}

// ---------- tower shots (a tower's extra.fire: a pivot animate() shows for a moment after each shot) ----------
// White-hot, for the cores of flashes and the shafts of loosed arrows.
export const HOT = 0xfff3c2;
// A streak from p to q in c, r thick (a loosed arrow, a bolt, a tracer), drawn into g, with a glowing head of radius rh
// in glow at q (null: none).
export const streak = (g, p, q, r, c = HOT, glow = P.fire, rh = r * 2.6) => {
  stick(g, r, c, p, q, CYL6);
  if (glow !== null) g.add(BALL, glow, q[0], q[1], q[2], rh, rh, rh);
  return g;
};
const cross = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]];
const normalised = v => {
  const length = Math.hypot(...v);
  return v.map(c => c / length);
};
// A muzzle flash at p, blasting along the direction d, drawn into g and scaled k: a long flame cone out of the muzzle,
// four short prongs round it and a white-hot core.
export const muzzleFlash = (g, p, d, k = 1) => {
  const forward = normalised(d);
  const side = normalised(cross(forward, Math.abs(forward[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), up = cross(side, forward);
  // p moved by each [direction, distance] in turn.
  const offset = (...moves) => p.map((c, i) => moves.reduce((sum, [dir, dist]) => sum + dir[i] * dist, c));
  stick(g, 0.07 * k, P.fire, p, offset([forward, 0.34 * k]), CONE4);
  for (const prong of [side, up, side.map(c => -c), up.map(c => -c)]) {
    stick(g, 0.03 * k, P.ember, offset([forward, 0.04 * k]), offset([prong, 0.15 * k], [forward, 0.08 * k]), CONE4);
  }
  g.add(BALL, HOT, p[0], p[1], p[2], 0.065 * k, 0.065 * k, 0.065 * k);
  return g;
};
