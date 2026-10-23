// Age of Sail: Georgian and colonial building of the 1600s–1700s. Red brick with white stone and painted-wood trim under
// red-tile hipped roofs, rows of white sash windows, pediments and round arches, pale Portland stone for the grander
// work and copper for domes. A white town hall with a cupola and clock, brick townhouses, a brick warehouse with a hoist,
// a dockside warehouse with a crane, orchard rows, a brick barracks on its parade ground, a stone shooting gallery, a
// brick coach house, a trading house with crates and scales, a domed capitol, a lighthouse and a star fort; for
// defence, a cannon bastion and a star-fort earthwork.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import { P, windowGrid, flag, stick, lerp, hash, place, horse, muzzleFlash, CYL6, CYL8, DISC, BALL, CONE4, ARCH, ARCH_RING, HORSE_HEAD, sack, barrel } from './kit.js';

export function house(ctx) {
  const { b, s, td } = ctx, W = s - 0.25, D = s - 0.35;
  b.box(W, 1.15, D, P.brick).box(W + 0.1, 0.08, D + 0.1, P.white, 0, 1.15, 0).box(W + 0.04, 0.1, D + 0.04, P.white, 0, 0, 0);
  b.add(CONE4, P.tile, 0, 1.23 + 0.32, 0, W * 0.78, 0.64, D * 0.8, 0, Math.PI / 4, 0);
  for (const k of [-1, 1]) b.box(0.16, 0.6, 0.32, P.brick, k * (W / 2 - 0.12), 1.23, 0).box(0.2, 0.06, 0.36, P.white, k * (W / 2 - 0.12), 1.83, 0);
  windowGrid(ctx, 3, 2, W, D / 2 + 0.01, 0.2, 0.5, P.white, 0x3f5f7a);
  b.box(0.24, 0.42, 0.05, td, 0, 0.0, D / 2 + 0.04).roof(0.36, 0.12, 0.06, P.white, 0, 0.44, D / 2 + 0.05).box(0.4, 0.06, 0.2, 0xd9cfb0, 0, 0, D / 2 + 0.08);
  return 1.89;
}

export function town_center(ctx) {
  const { b, mast, extra, s, t, td } = ctx, W = s - 0.3, D = s * 0.6, z0 = -0.2;
  b.box(s + 0.12, 0.12, s + 0.12, 0xd9cfb0).box(W, 1.35, D, P.white, 0, 0.12, z0);
  b.add(CONE4, P.tile, 0, 1.47 + 0.3, z0, W * 0.74, 0.6, D * 0.78, 0, Math.PI / 4, 0);
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

// ---------- shared Age of Sail parts ----------
// The House's brick and white trim, the Town Center's tile and its cupola's copper; Portland stone for the grander work.
const BRICK = P.brick, WHITE = P.white, TILE = P.tile, TILE_L = 0xc25a3e, TILE_D = 0x86331f;
const STONE = 0xd6cdb6, STONE_D = 0xb0a68e, LEAD = 0x6b7378, COPPER = 0x5d7f6a, COPPER_L = 0x6f9580, GLASS = 0x2f4f6a;
const COBBLE = 0x8d887c, PAVE = 0xb9b1a0, GRAVEL = 0xc6b893, GRASS = 0x6a8a3e, GRASS_L = 0x7e9c4c, GRASS_D = 0x5b7a37;
const SOIL = 0x6a5233, WATER = 0x3f7fa3, ROCK = 0x8f8c84, ROCK_D = 0x73716b, SAND = 0xcdb98c;
const GUN = 0x2b2f33, ROPE = 0xcbb98a, CRATE = 0xa0763f, CRATE_D = 0x7a5530, PAINT = 0x23292c, WICKER = 0xb08a4a;
const LEAF = 0x4c7a30, LEAF_L = 0x5f8f3a, BARK = 0x5e4e3c, APPLE = 0xc8302a, APPLE_G = 0xb3bf48;
// A gun barrel, its muzzle at +y; a hemisphere, flat side down at y = 0; a cheap half ring for arches.
const BORE = new THREE.CylinderGeometry(0.72, 1, 1, 8), DOME = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
const GEM = new THREE.OctahedronGeometry(1, 0);

// A point on a wall face centred at (x, z) facing along ry (0: +z): u along the face, o out from it.
const onFace = (x, z, ry) => (u, o = 0) => [x + u * Math.cos(ry) + o * Math.sin(ry), z - u * Math.sin(ry) + o * Math.cos(ry)];

// ---------- lofted solids: hipped roofs, ramparts, towers, hulls ----------
// Twice the signed area of a ring of [x, z] points: positive when it runs from +x toward +z.
const area2 = r => r.reduce((a, [x, z], i) => { const [x2, z2] = r[(i + 1) % r.length]; return a + x * z2 - x2 * z; }, 0);
// Adds triangles (a flat list of x, y, z) to b in colour c, dropping slivers (a ridge's collapsed ends).
const tris = (b, pos, c) => {
  const keep = [];
  for (let i = 0; i < pos.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = pos.slice(i, i + 9), ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    if (Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) > 1e-9) keep.push(...pos.slice(i, i + 9));
  }
  if (!keep.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); g.computeVertexNormals();
  b.add(g, c, 0, 0, 0, 1, 1, 1); g.dispose();
};
// A flat, upward-facing cap over the ring r (less its holes) at height y.
const cap = (b, r, y, c, holes = []) => {
  const all = [...r, ...holes.flat()], v2 = ([x, z]) => new THREE.Vector2(x, z), pos = [];
  for (const f of THREE.ShapeUtils.triangulateShape(r.map(v2), holes.map(hl => hl.map(v2)))) {
    let [p, q, w] = f.map(i => all[i]);
    if ((q[1] - p[1]) * (w[0] - p[0]) - (q[0] - p[0]) * (w[1] - p[1]) < 0) [q, w] = [w, q];
    pos.push(p[0], y, p[1], q[0], y, q[1], w[0], y, w[1]);
  }
  tris(b, pos, c);
};
// A solid lofted up through rings of [x, z] points (all the same length) at heights ys, band i coloured cs[i % length],
// its top ring capped in `top` (null: open) unless it has closed to a ridge. Faces point out of the solid, or into the
// rings with `inward` (the inner face of a ring of ramparts).
const loft = (b, rings, ys, cs, { top = cs[(rings.length - 2) % cs.length], inward = false } = {}) => {
  if (area2(rings[0]) < 0 !== inward) rings = rings.map(r => [...r].reverse());
  for (let i = 0; i + 1 < rings.length; i++) {
    const L = rings[i], U = rings[i + 1], pos = [];
    for (let j = 0; j < L.length; j++) {
      const k = (j + 1) % L.length, l0 = [L[j][0], ys[i], L[j][1]], l1 = [L[k][0], ys[i], L[k][1]], u0 = [U[j][0], ys[i + 1], U[j][1]], u1 = [U[k][0], ys[i + 1], U[k][1]];
      pos.push(...l0, ...u1, ...l1, ...l0, ...u0, ...u1);
    }
    tris(b, pos, cs[i % cs.length]);
  }
  const last = rings[rings.length - 1];
  if (top !== null && Math.abs(area2(last)) > 1e-6) cap(b, last, ys[ys.length - 1], top);
};
const rect = (x, z, w, d) => [[x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2], [x - w / 2, z - d / 2]];
const circle = (x, z, r, n, a0 = 0) => Array.from({ length: n }, (_, i) => [x + Math.cos(a0 + i * 2 * Math.PI / n) * r, z + Math.sin(a0 + i * 2 * Math.PI / n) * r]);
// The ring r (running from +x toward +z) grown by d along its mitred edge normals; shrunk for d < 0.
const offset = (r, d) => {
  const n = r.length, nm = r.map((p, i) => { const q = r[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [(q[1] - p[1]) / L, -(q[0] - p[0]) / L]; });
  return r.map((p, i) => { const a = nm[(i + n - 1) % n], c = nm[i], k = d / (1 + a[0] * c[0] + a[1] * c[1]); return [p[0] + (a[0] + c[0]) * k, p[1] + (a[1] + c[1]) * k]; });
};
// The point a fraction f along edge i of ring r, and the points of r from (edge i0, f0) forward to (edge i1, f1).
const along = (r, i, f) => lerp(r[i % r.length], r[(i + 1) % r.length], f);
const path = (r, [i0, f0], [i1, f1]) => { const out = [along(r, i0, f0)]; for (let i = i0 + 1; i <= i1; i++) out.push(r[i % r.length]); out.push(along(r, i1, f1)); return out; };

// ---------- Georgian building parts ----------
// A red-tile hipped roof over w × d centred at (x, z), rising rh from y in alternate courses, with a dark ridge.
const hip = (b, x, y, z, w, d, rh, n = 4) => {
  const m = Math.min(w, d) / 2, rings = [], ys = [];
  for (let i = 0; i <= n; i++) { rings.push(rect(x, z, w - 2 * m * i / n, d - 2 * m * i / n)); ys.push(y + rh * i / n); }
  loft(b, rings, ys, [TILE, TILE_L], { top: null });
  if (Math.abs(w - d) > 0.02) b.box(w > d ? w - d + 0.04 : 0.04, 0.03, w > d ? 0.04 : d - w + 0.04, TILE_D, x, y + rh - 0.02, z);
};
// A Georgian block w × d centred at (x, z) standing on y: walls hh tall in c over a stone plinth and under a white
// cornice, and (rh > 0) a hipped roof rh high with eaves e out. Returns the cornice's top.
const block = (b, x, z, w, d, hh, rh, { y = 0.03, c = BRICK, e = 0.07 } = {}) => {
  const top = y + 0.07 + hh;
  b.box(w + 0.03, 0.07, d + 0.03, STONE_D, x, y, z).box(w, hh, d, c, x, y + 0.07, z).box(w + 0.06, 0.05, d + 0.06, WHITE, x, top - 0.05, z);
  if (rh) hip(b, x, top, z, w + 2 * e, d + 2 * e, rh);
  return top;
};
// A white sash window w × hh on a wall face (centred on the face at x, z) facing ry, its sill at y: dark panes in a
// white frame with a meeting rail.
const sash = (b, x, y, z, ry = 0, w = 0.13, hh = 0.22) => {
  const [gx, gz] = onFace(x, z, ry)(0, 0.006);
  b.box(w, hh, 0.02, WHITE, x, y, z, 0, ry).box(w - 0.035, hh - 0.04, 0.02, GLASS, gx, y + 0.02, gz, 0, ry).box(w - 0.035, 0.016, 0.024, WHITE, gx, y + hh / 2 - 0.008, gz, 0, ry);
};
// Rows of n sash windows spread across a wall face w wide centred at (x, z) facing ry, a row at each sill height in ys.
const sashes = (b, x, z, ry, w, n, ys, ww, hh) => {
  const at = onFace(x, z, ry);
  for (const y of ys) for (let i = 0; i < n; i++) { const [px, pz] = at(-w / 2 + (i + 0.5) * w / n, 0.01); sash(b, px, y, pz, ry, ww, hh); }
};
// A Georgian front door on a wall face (x, z) facing ry, sill at y: a panelled leaf in c in a white doorcase, under a
// fanlight and a small pediment.
const gdoor = (b, x, y, z, ry, c, w = 0.18, hh = 0.32) => {
  const at = onFace(x, z, ry), [ox, oz] = at(0, 0.01), [px, pz] = at(0, 0.03);
  b.box(w + 0.07, hh + 0.12, 0.02, WHITE, x, y, z, 0, ry).box(w, hh, 0.02, c, ox, y, oz, 0, ry).box(w - 0.05, 0.07, 0.02, GLASS, ox, y + hh + 0.02, oz, 0, ry);
  b.roof(w + 0.15, 0.09, 0.05, WHITE, px, y + hh + 0.12, pz, ry);
};
// A round-arched opening aw wide on a wall face (x, z) facing ry, its sill at y and springing at y + spring: a door
// or void in c under a white arch ring and keystone.
const archway = (b, x, y, z, ry, aw, spring, c = C.dark, ring = WHITE) => {
  const r = aw / 2, [kx, kz] = onFace(x, z, ry)(0, 0.012);
  b.box(aw, spring, 0.02, c, x, y, z, 0, ry).add(ARCH, c, kx, y + spring, kz, r, r, 1, 0, ry, 0);
  b.add(ARCH_RING, ring, kx, y + spring, kz, r + 0.025, r + 0.025, 0.15, 0, ry, 0).box(0.05, 0.07, 0.03, ring, kx, y + spring + r - 0.01, kz, 0, ry);
};
// A brick chimney stack hh tall standing on y, its stone cap and two pots.
const chimney = (b, x, y, z, hh = 0.3) => {
  b.box(0.13, hh, 0.2, BRICK, x, y, z).box(0.16, 0.04, 0.23, STONE, x, y + hh, z);
  for (const k of [-1, 1]) b.cylT(0.024, 0.03, 0.06, 0x9a4a30, x, y + hh + 0.04, z + k * 0.05, 6);
};
// White stone quoins up the corner (x, z) of a wall hh tall standing on y; sx, sz (±1) point out of the corner.
const quoins = (b, x, z, sx, sz, y, hh) => {
  const n = Math.max(2, Math.round(hh / 0.1));
  for (let i = 0; i < n; i++) {
    const yy = y + i * hh / n + 0.006, a = i % 2 ? 0.07 : 0.12, c = i % 2 ? 0.12 : 0.07;
    b.box(a, hh / n - 0.012, 0.02, WHITE, x - sx * (a / 2 - 0.01), yy, z + sz * 0.006).box(0.02, hh / n - 0.012, c, WHITE, x + sx * 0.006, yy, z - sz * (c / 2 - 0.01));
  }
};
// A white column hh tall standing on y: a square base, a tapering shaft of radius r and a square capital.
const column = (b, x, y, z, hh, r = 0.04) => {
  b.box(r * 2.6, 0.04, r * 2.6, WHITE, x, y, z).cylT(r * 0.85, r, hh - 0.08, WHITE, x, y + 0.04, z, 8).box(r * 2.7, 0.04, r * 2.7, WHITE, x, y + hh - 0.04, z);
};
// A wooden crate w wide standing on y, turned ry, battened dark round its top and foot; band paints a stencilled band.
const crate = (b, x, y, z, w = 0.16, ry = 0, band = null) => {
  const hh = w * 0.85;
  b.box(w, hh, w, CRATE, x, y, z, 0, ry).box(w + 0.008, 0.02, w + 0.008, CRATE_D, x, y, z, 0, ry).box(w + 0.008, 0.02, w + 0.008, CRATE_D, x, y + hh - 0.02, z, 0, ry);
  if (band !== null) b.box(w + 0.01, hh * 0.24, w + 0.01, band, x, y + hh * 0.38, z, 0, ry);
};
// A cannon on a team-painted carriage standing on y at (x, z), its muzzle pointing along (dx, dz), scaled k.
const cannon = (b, t, x, y, z, dx, dz, k = 1) => {
  const L = Math.hypot(dx, dz), nx = dx / L, nz = dz / L, ry = Math.atan2(nx, nz), at = (u, o, yy) => [x + nx * u + nz * o, y + yy * k, z + nz * u - nx * o];
  b.box(0.1 * k, 0.07 * k, 0.26 * k, t, x, y + 0.04 * k, z, 0, ry);
  for (const o of [-1, 1]) { const [wx, wy, wz] = at(0.05 * k, o * 0.068 * k, 0.055); b.add(CYL6, C.woodD, wx, wy, wz, 0.055 * k, 0.025 * k, 0.055 * k, 0, ry, Math.PI / 2); }
  stick(b, 0.032 * k, GUN, at(-0.13 * k, 0, 0.13), at(0.22 * k, 0, 0.14), BORE);
};
// A pyramid of round shot standing on y.
const shot = (b, x, y, z, r = 0.03) => {
  for (const [dx, dz, l] of [[-1, -0.58, 0], [1, -0.58, 0], [0, 1.15, 0], [0, 0, 1]]) b.add(BALL, GUN, x + dx * r, y + r + l * r * 1.63, z + dz * r, r, r, r);
};
// A team-striped boat's hull lofted at the origin for place(), its bow to +x: L long and w wide, keel at y = 0, the
// gunwale at hh, decked over in planking.
const boat = (t, L, w, hh) => {
  const g = new B(), ring = (l, ww) => [[-l / 2, -ww * 0.42], [l * 0.12, -ww / 2], [l / 2, 0], [l * 0.12, ww / 2], [-l / 2, ww * 0.42]];
  loft(g, [ring(L * 0.7, w * 0.3), ring(L * 0.93, w * 0.86), ring(L, w)], [0, hh * 0.6, hh], [C.woodD, t], { top: C.wood });
  for (const x of [-L * 0.28, L * 0.05]) g.box(0.03, 0.012, w * 0.8, C.woodD, x, hh, 0);
  return g;
};

// Granary: a brick warehouse with a hoist. Three tall storeys of brick on a stone plinth, with white string courses
// at the floors, white quoins, a white cornice and a red-tile hipped roof flying the flag. Team loading doors stack up
// the front to a white timber lucam, whose hoist beam lowers a sack on its rope; small sash windows run in rows. At the
// door, a handcart of sacks and sacks waiting on a pallet.
export function granary(ctx) {
  const { b, s, t } = ctx, x0 = -0.84, x1 = 0.2, z0 = -0.84, z1 = 0.02, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, fh = 0.4, y = 0.03;
  b.box(s, y, s, COBBLE);
  const top = block(b, cx, cz, W, D, 3 * fh, 0.42, { y }), f0 = y + 0.07;
  for (let i = 1; i < 3; i++) b.box(W + 0.02, 0.03, D + 0.02, WHITE, cx, f0 + i * fh - 0.015, cz);
  quoins(b, x1, z1, 1, 1, f0, 3 * fh); quoins(b, x0, z1, -1, 1, f0, 3 * fh); quoins(b, x1, z0, 1, -1, f0, 3 * fh);
  // The loading doors, one a floor, framed in white; the lowest is the cart door.
  for (const [i, w, hh] of [[0, 0.32, 0.36], [1, 0.26, 0.3]]) b.box(w + 0.05, hh + 0.04, 0.02, WHITE, cx, f0 + i * fh, z1 + 0.005).box(w, hh, 0.02, t, cx, f0 + i * fh, z1 + 0.012).box(0.012, hh, 0.024, CRATE_D, cx, f0 + i * fh, z1 + 0.014);
  b.box(0.34, 0.025, 0.08, P.iron, cx, f0 + fh - 0.01, z1 + 0.04);
  // The lucam: a white timber housing out from the top floor and up into the roof, the top door in its face, the hoist
  // beam out from under its gable with a pulley, the rope and a sack on its way up.
  const lz = z1 + 0.2, ly0 = f0 + 2 * fh - 0.04, ly1 = top + 0.2;
  b.box(0.36, ly1 - ly0, lz - z1 + 0.04, WHITE, cx, ly0, (z1 + lz) / 2 - 0.02).box(0.24, 0.3, 0.02, t, cx, ly0 + 0.06, lz + 0.01).box(0.012, 0.3, 0.024, CRATE_D, cx, ly0 + 0.06, lz + 0.012);
  b.roof(0.44, 0.2, lz - z1 + 0.12, TILE, cx, ly1, (z1 + lz) / 2).roof(0.34, 0.15, 0.02, WHITE, cx, ly1, lz + 0.07);
  const by = ly1 + 0.03, bz = lz + 0.32;
  b.box(0.05, 0.05, 0.36, C.woodD, cx, by, lz + 0.14).add(unit.cyl, C.wood, cx, by - 0.02, bz - 0.02, 0.035, 0.02, 0.035, 0, 0, Math.PI / 2);
  stick(b, 0.006, ROPE, [cx, by - 0.05, bz], [cx, 0.86, bz], CYL6); sack(b, cx, 0.68, bz, 0.09);
  // Rows of small sash windows on the front and the +x side.
  for (const k of [-1, 1]) for (let i = 0; i < 3; i++) sash(b, cx + k * 0.34, f0 + 0.1 + i * fh, z1 + 0.01, 0, 0.12, 0.2);
  sashes(b, x1, cz, Math.PI / 2, D, 2, [f0 + 0.1, f0 + 0.1 + fh, f0 + 0.1 + 2 * fh], 0.12, 0.2);
  flag(ctx, cx - 0.06, top + 0.42 - 0.02, cz, 0.45);
  // The yard: a team handcart of sacks, a pallet of sacks, a barrel.
  const hx = 0.58, hz = 0.52, hc = new B();
  for (const k of [-1, 1]) hc.add(CYL6, C.woodD, 0, 0.1, k * 0.15, 0.1, 0.025, 0.1, Math.PI / 2, 0, 0);
  hc.box(0.36, 0.03, 0.26, t, 0, 0.12, 0).box(0.36, 0.07, 0.02, t, 0, 0.15, 0.12).box(0.36, 0.07, 0.02, t, 0, 0.15, -0.12);
  for (const k of [-1, 1]) stick(hc, 0.012, C.woodD, [0.16, 0.13, k * 0.1], [0.46, 0.03, k * 0.1], CYL6);
  for (const [dx, dy, dz] of [[-0.09, 0, -0.06], [0.07, 0, 0.05], [-0.06, 0.1, 0.03]]) sack(hc, dx, 0.15 + dy, dz, 0.075);
  place(b, hc, hx, y, hz, 0.95);
  b.box(0.36, 0.05, 0.3, C.wood, -0.52, y, 0.5);
  for (const [dx, dy, dz] of [[-0.09, 0, -0.07], [0.09, 0, -0.07], [-0.09, 0, 0.07], [0.09, 0, 0.07], [0, 0.14, 0]]) sack(b, -0.52 + dx, y + 0.05 + dy, 0.5 + dz, 0.08);
  barrel(b, -0.12, y, 0.68); barrel(b, 0.6, y, -0.6); barrel(b, 0.6, y, -0.42, 0.065);
  return top + 0.42;
}

// Storage Pit: a dockside warehouse with a crane. A low brick warehouse with tall arched team doors under a team fascia
// stands at the back of a stone quay; at the quay's edge, over the water, a timber post crane with its winch swings a
// crate up out of a team-striped lighter moored to the bollards. On the quay, the goods brought in: casks, crates with
// team bands, a stack of planks, dressed stone and a strongbox of gold.
export function storage_pit(ctx) {
  const { b, s, h, t } = ctx, qe = 0.44, qy = 0.14, qz = (qe - h) / 2;
  // The quay: its stone face down to the water along the front, the paving, the coping and three bollards.
  b.box(s, qy - 0.01, h + qe, STONE_D, 0, 0, qz).box(s, 0.01, h + qe - 0.06, 0x9c968a, 0, qy - 0.01, qz - 0.03).box(s, 0.035, 0.07, STONE, 0, qy - 0.01, qe - 0.035);
  b.box(s, 0.05, h - qe, WATER, 0, 0, (qe + h) / 2);
  for (const x of [-0.72, -0.12, 0.42]) b.add(CYL6, GUN, x, qy + 0.05, qe - 0.08, 0.035, 0.1, 0.035).add(BALL, GUN, x, qy + 0.1, qe - 0.08, 0.042, 0.03, 0.042);
  // The warehouse: tall arched doors (one open), a team fascia over them, a side door and windows, the flag.
  const wx = -0.13, wz = -0.58, W = 1.48, D = 0.56, z1 = wz + D / 2, x1 = wx + W / 2;
  const top = block(b, wx, wz, W, D, 0.7, 0.32, { y: qy });
  archway(b, -0.5, qy + 0.07, z1 + 0.011, 0, 0.36, 0.3, t);
  b.box(0.012, 0.3, 0.024, CRATE_D, -0.5, qy + 0.07, z1 + 0.024);
  archway(b, 0.2, qy + 0.07, z1 + 0.011, 0, 0.36, 0.3);
  b.box(0.17, 0.3, 0.02, t, 0.2 + 0.19, qy + 0.07, z1 + 0.08, 0, -1.1);
  b.box(0.98, 0.12, 0.02, WHITE, -0.15, top - 0.2, z1 + 0.01).box(0.92, 0.08, 0.02, t, -0.15, top - 0.18, z1 + 0.018);
  gdoor(b, x1 + 0.011, qy + 0.07, wz, Math.PI / 2, CRATE_D, 0.16, 0.3);
  for (const x of [-0.82, 0.48]) sash(b, x, qy + 0.32, z1 + 0.01, 0, 0.13, 0.22);
  flag(ctx, wx - 0.4, top + 0.32 - 0.02, wz, 0.45);
  // The crane: its post on a stone step, the winch with crank handles, the braced jib out over the water and the rope
  // to a crate on the hook.
  const px = 0.62, pz = 0.22, jy = 1.06, tip = [px, jy + 0.06, 0.8];
  b.box(0.2, 0.05, 0.2, STONE, px, qy, pz).box(0.08, jy - qy - 0.01, 0.08, C.woodD, px, qy + 0.05, pz).box(0.11, 0.04, 0.11, P.iron, px, jy - 0.08, pz);
  stick(b, 0.03, C.wood, [px, jy, pz - 0.06], tip, unit.box); stick(b, 0.022, C.woodD, [px, 0.62, pz + 0.04], lerp([px, jy, pz - 0.06], tip, 0.55), unit.box);
  for (const k of [-1, 1]) b.box(0.025, 0.2, 0.12, C.woodD, px + k * 0.1, qy + 0.05, pz - 0.14);
  b.add(CYL8, C.wood, px, qy + 0.2, pz - 0.14, 0.045, 0.2, 0.045, 0, 0, Math.PI / 2);
  for (const k of [-1, 1]) b.box(0.012, 0.09, 0.012, P.iron, px + k * 0.12, qy + 0.17, pz - 0.2).box(0.012, 0.012, 0.06, P.iron, px + k * 0.12, qy + 0.13, pz - 0.23);
  stick(b, 0.006, ROPE, [px, qy + 0.24, pz - 0.14], [px, jy + 0.02, pz - 0.05], CYL6); stick(b, 0.006, ROPE, [px, jy + 0.02, pz - 0.05], [tip[0], tip[1] - 0.04, tip[2]], CYL6);
  stick(b, 0.006, ROPE, [tip[0], tip[1] - 0.04, tip[2]], [tip[0], 0.48, tip[2]], CYL6);
  b.box(0.04, 0.03, 0.04, P.iron, tip[0], 0.46, tip[2]);
  for (const k of [-1, 1]) stick(b, 0.004, ROPE, [tip[0], 0.47, tip[2]], [tip[0] + k * 0.07, 0.38, tip[2]], CYL6);
  crate(b, tip[0], 0.24, tip[2], 0.15, 0.3, t);
  // The lighter, moored to the bollards, with casks aboard.
  place(b, boat(t, 0.86, 0.3, 0.14), 0.3, 0.0, 0.69, 0);
  barrel(b, 0.06, 0.14, 0.66, 0.06, 0.13); barrel(b, 0.2, 0.14, 0.72, 0.06, 0.13);
  stick(b, 0.006, ROPE, [-0.72, qy + 0.07, qe - 0.06], [-0.1, 0.13, 0.62], CYL6);
  // The goods on the quay: casks, crates, planks, dressed stone and the gold.
  for (const [x, z] of [[-0.78, -0.08], [-0.64, -0.12], [-0.71, 0.04], [-0.82, 0.12]]) barrel(b, x, qy, z);
  for (const [x, z, w, ry, band] of [[-0.38, 0.0, 0.17, 0.1, t], [-0.2, -0.04, 0.15, -0.2, null], [-0.3, 0.17, 0.15, 0.3, null]]) crate(b, x, qy, z, w, ry, band);
  crate(b, -0.33, qy + 0.145, 0.02, 0.14, -0.15, t);
  for (let l = 0; l < 3; l++) for (let i = 0; i < 3 - (l === 2); i++) b.box(0.6, 0.035, 0.075, (i + l) % 2 ? C.wood : 0x8a6238, 0.16, qy + l * 0.036, -0.12 + i * 0.08 + (l === 2) * 0.04);
  for (const [x, z, ry] of [[0.06, 0.24, 0.2], [0.26, 0.3, -0.3]]) b.box(0.18, 0.12, 0.13, STONE, x, qy, z, 0, ry);
  b.box(0.17, 0.11, 0.13, STONE_D, 0.14, qy + 0.12, 0.27, 0, 0.1);
  const gx = -0.02, gz = 0.38;
  b.box(0.22, 0.12, 0.14, C.woodD, gx, qy, gz).box(0.23, 0.025, 0.15, P.iron, gx, qy + 0.12, gz).box(0.025, 0.13, 0.15, P.iron, gx - 0.07, qy, gz).box(0.025, 0.13, 0.15, P.iron, gx + 0.07, qy, gz);
  for (const [dx, dz] of [[-0.04, -0.02], [0.03, 0.02], [0.0, -0.035], [0.05, -0.03]]) b.cylT(0.026, 0.026, 0.02, C.gold, gx + dx, qy + 0.145, gz + dz, 6);
  return Math.max(top + 0.32, jy + 0.1);
}

// Farm: orchard rows. Three rows of apple trees (extra.crops, which animate() shows once the farm is finished and
// shrinks as the food runs out) stand in mown grass alleys, each tree in its own dug circle, hung with red and
// green apples. A white picket fence with a team gate closes the front and the right; baskets of picked apples, team
// crates and a three-legged orchard ladder stand about, with the flag on a post.
export function farm(ctx) {
  const { b, s, h, t, extra } = ctx, xs = [-0.6, -0.1, 0.4], zs = [-0.62, -0.12, 0.38], y = 0.03;
  b.box(s, y, s, GRASS);
  for (const x of xs) b.box(0.3, 0.006, 1.52, GRASS_L, x, y, -0.12);
  for (const x of xs) for (const z of zs) b.add(CYL8, SOIL, x, y + 0.004, z, 0.12, 0.008, 0.12);
  // The picket fence along the front and the right, its gate in team colour.
  const fe = h - 0.05, gate = [0.03, 0.27];
  const pickets = axis => {
    for (let u = -h + 0.07; u < h - 0.04; u += 0.075) {
      if (axis === 'x' && u > gate[0] && u < gate[1]) continue;
      const [x, z] = axis === 'x' ? [u, fe] : [fe, u];
      b.box(0.024, 0.2, 0.016, WHITE, x, y, z).add(CONE4, WHITE, x, y + 0.215, z, 0.018, 0.03, 0.012, 0, Math.PI / 4, 0);
    }
  };
  pickets('x'); pickets('z');
  for (const yy of [0.07, 0.15]) {
    for (const [x0, x1] of [[-h + 0.04, gate[0]], [gate[1], h - 0.03]]) b.box(x1 - x0, 0.02, 0.012, WHITE, (x0 + x1) / 2, y + yy, fe - 0.012);
    b.box(0.012, 0.02, 2 * h - 0.07, WHITE, fe - 0.012, y + yy, -0.035);
  }
  for (const x of [gate[0] - 0.02, gate[1] + 0.02]) b.box(0.045, 0.27, 0.045, WHITE, x, y, fe).add(BALL, WHITE, x, y + 0.3, fe, 0.03, 0.03, 0.03);
  b.box(0.045, 0.27, 0.045, WHITE, fe, y, fe).add(BALL, WHITE, fe, y + 0.3, fe, 0.03, 0.03, 0.03);
  // The gate's two team leaves, swung half open, each with a white brace.
  for (const k of [-1, 1]) {
    const hx = k < 0 ? gate[0] : gate[1], ry = k * 0.6, lw = (gate[1] - gate[0]) / 2, [mx, mz] = [hx - k * Math.cos(ry) * lw / 2, fe + Math.sin(ry) * lw / 2 * k];
    b.box(lw, 0.17, 0.02, t, mx, y + 0.03, mz, 0, ry).box(lw * 1.1, 0.018, 0.024, WHITE, mx, y + 0.11, mz, 0, ry, -k * 0.6);
  }
  // Baskets of apples, crates, the ladder, the flag.
  for (const [x, z] of [[0.15, 0.6], [0.66, 0.12], [0.62, -0.02]]) {
    b.cylT(0.07, 0.055, 0.09, WICKER, x, y, z, 8);
    for (let i = 0; i < 5; i++) { const a = i * 1.3, r = i ? 0.035 : 0; b.add(BALL, i % 3 ? APPLE : APPLE_G, x + Math.cos(a) * r, y + (i ? 0.1 : 0.12), z + Math.sin(a) * r, 0.028, 0.028, 0.028); }
  }
  crate(b, -0.36, y, 0.64, 0.15, 0.2, t); crate(b, -0.2, y, 0.68, 0.14, -0.3); crate(b, -0.3, y + 0.13, 0.66, 0.13, 0.5, t);
  const lb = [0.62, y, 0.6], lt = [0.5, 0.66, 0.46];
  for (const k of [-1, 1]) stick(b, 0.01, C.wood, [lb[0] + k * 0.07, y, lb[2] - k * 0.05], [lt[0] + k * 0.025, lt[1], lt[2] - k * 0.018], CYL6);
  for (let i = 1; i < 6; i++) { const f = i / 6, p = lerp(lb, lt, f), hw = 0.07 * (1 - f) + 0.025 * f; stick(b, 0.007, C.wood, [p[0] - hw, p[1], p[2] + hw * 0.7], [p[0] + hw, p[1], p[2] - hw * 0.7], CYL6); }
  stick(b, 0.01, C.wood, [lt[0] - 0.28, y, lt[2] - 0.12], lt, CYL6);
  flag(ctx, -h + 0.1, y, h - 0.1, 0.75, WHITE, [0.2, 0.34]);
  // The apple trees, three rows of three: trunks, rounded crowns and apples on the sides the camera sees.
  const cr = new B();
  for (const [i, x] of xs.entries()) for (const [j, z] of zs.entries()) {
    const k = 0.88 + hash(i, j) * 0.24, ty = 0.2 * k, ripe = (i + 2 * j) % 3 !== 1, yc = ty + 0.15 * k;
    cr.cylT(0.026, 0.04, ty + 0.06, BARK, x, y, z, 6);
    cr.foliage(0.19 * k, LEAF, x, ty, z, 1, 0.82, 1, hash(j, i) * 3).foliage(0.11 * k, LEAF_L, x + 0.08, ty + 0.12 * k, z + 0.07, 1, 0.8, 1, i);
    for (let m = 0; m < 8; m++) {
      const a = -0.9 + m * 0.42 + hash(m, i + j) * 0.3, el = (hash(m + 4, j) - 0.35) * 1.1, R = 0.18 * k;
      cr.add(GEM, ripe || m % 3 ? APPLE : APPLE_G, x + Math.cos(a) * Math.cos(el) * R, yc + Math.sin(el) * R * 0.8, z + Math.sin(a) * Math.cos(el) * R, 0.026, 0.026, 0.026);
    }
  }
  extra.crops = cr.geometry();
  return 0.72;
}

// Barracks: a brick barracks with a parade flag. A long two-storey barrack block of brick across the back, rows of
// white sash windows and four chimney stacks on its hipped roof, its stone centre pavilion with a team tympanum over the
// door. Before it the gravel parade ground: the tall parade flagstaff on its stone base between two field guns, piled
// arms and a team drum; a low brick wall with white coping and ball-topped piers closes the front and the right, with
// team sentry boxes at the gateway.
export function barracks(ctx) {
  const { b, s, h, t, td } = ctx, y = 0.03, x0 = -1.32, x1 = 1.32, z0 = -1.32, z1 = -0.64, W = x1 - x0, D = z1 - z0, cz = (z0 + z1) / 2, fl = y + 0.07;
  b.box(s, y, s, GRAVEL);
  const top = block(b, 0, cz, W, D, 0.86, 0.42, { y });
  b.box(W + 0.02, 0.03, D + 0.02, WHITE, 0, fl + 0.43, cz);
  for (const x of [-0.9, -0.3, 0.3, 0.9]) chimney(b, x, top + 0.24, cz, 0.36);
  // The centre pavilion: brought forward in stone, its pediment and team tympanum, the door between two columns.
  const pw = 0.74, pz = z1 + 0.1;
  b.box(pw, top - y, pz - z1 + 0.02, STONE, 0, y, (z1 + pz) / 2 - 0.01).box(pw + 0.06, 0.05, pz - z1 + 0.08, WHITE, 0, top - 0.05, (z1 + pz) / 2);
  b.roof(pw + 0.1, 0.28, 0.14, STONE, 0, top, pz - 0.05).roof(pw - 0.12, 0.19, 0.02, t, 0, top + 0.03, pz + 0.03);
  gdoor(b, 0, fl, pz + 0.011, 0, td, 0.22, 0.36);
  for (const k of [-1, 1]) column(b, k * 0.19, fl, pz + 0.06, 0.48, 0.032);
  sash(b, 0, fl + 0.58, pz + 0.011, 0, 0.15, 0.22);
  for (const k of [-1, 1]) sashes(b, k * 0.84, z1, 0, 0.96, 3, [fl + 0.12, fl + 0.55], 0.14, 0.24);
  sashes(b, x1, cz, Math.PI / 2, D, 2, [fl + 0.12, fl + 0.55], 0.14, 0.24);
  // The parade flagstaff on its stepped base, flanked by field guns.
  const fx = 0.0, fz = 0.36;
  b.box(0.32, 0.06, 0.32, STONE_D, fx, y, fz).box(0.22, 0.06, 0.22, STONE, fx, y + 0.06, fz).cylT(0.05, 0.06, 0.08, WHITE, fx, y + 0.12, fz, 8);
  flag(ctx, fx, y + 0.18, fz, 1.72, WHITE, [0.4, 0.68]);
  for (const k of [-1, 1]) cannon(b, t, fx + k * 0.48, y, fz + 0.05, 0, 1);
  for (const k of [-1, 1]) shot(b, fx + k * 0.74, y, fz + 0.12);
  // Piled arms: muskets stood in threes, bayonets up; a team drum.
  for (const ax of [-1.0, -0.8, 0.8, 1.0]) {
    const az = -0.18, apex = [ax, y + 0.4, az];
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.3, foot = [ax + Math.cos(a) * 0.075, y, az + Math.sin(a) * 0.075]; stick(b, 0.008, C.woodD, foot, lerp(foot, apex, 1.1), CYL6); stick(b, 0.004, P.steel, lerp(foot, apex, 1.1), lerp(foot, apex, 1.32), CYL6); }
  }
  b.cylT(0.08, 0.08, 0.12, t, -0.38, y, 0.02, 10).cylT(0.085, 0.085, 0.02, WHITE, -0.38, y, 0.02, 10).cylT(0.085, 0.085, 0.02, WHITE, -0.38, y + 0.1, 0.02, 10).cylT(0.075, 0.075, 0.005, 0xe6dcc0, -0.38, y + 0.12, 0.02, 10);
  for (const k of [-1, 1]) stick(b, 0.006, C.wood, [-0.38 + k * 0.03, y + 0.125, 0.02], [-0.38 + k * 0.1, y + 0.16, 0.1], CYL6);
  // The wall: brick with white coping along the front and the right, piers with ball finials, the gateway's sentry boxes.
  const we = h - 0.06, wh = 0.2, gw = 0.32;
  const wall = (p, q) => { const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ry = Math.atan2(-(q[1] - p[1]), q[0] - p[0]), m = lerp(p, q, 0.5); b.box(L, wh, 0.08, BRICK, m[0], y, m[1], 0, ry).box(L + 0.02, 0.03, 0.11, WHITE, m[0], y + wh, m[1], 0, ry); };
  wall([-h + 0.02, we], [-gw, we]); wall([gw, we], [we, we]); wall([we, we], [we, z1 + 0.05]);
  const pier = (x, z, hh = 0.3) => b.box(0.12, hh, 0.12, BRICK, x, y, z).box(0.14, 0.03, 0.14, WHITE, x, y + hh, z).add(BALL, STONE, x, y + hh + 0.07, z, 0.05, 0.05, 0.05);
  for (const x of [-1.0, -0.6, 0.6, 1.0]) pier(x, we, 0.26);
  for (const z of [-0.3, 0.2, 0.7]) pier(we, z, 0.26);
  pier(we, we, 0.26);
  for (const k of [-1, 1]) {
    pier(k * gw, we, 0.4);
    const sx = k * (gw + 0.2), sz = we - 0.2;
    b.box(0.17, 0.4, 0.15, t, sx, y, sz).box(0.12, 0.3, 0.02, C.dark, sx, y + 0.02, sz + 0.076).roof(0.2, 0.1, 0.18, WHITE, sx, y + 0.4, sz);
    for (let i = 0; i < 3; i++) b.box(0.175, 0.025, 0.155, WHITE, sx, y + 0.08 + i * 0.12, sz);
  }
  return top + 0.7;
}

// A stone arcade for place(), facing ±z, built at the origin standing on y = 0: a wall len long, hh high and d deep,
// pierced by `bays` round arches springing at `spring` (the arch radius fills each bay between piers pw wide).
const arcadeFace = (len, hh, d, bays, spring, pw) => {
  const sh = new THREE.Shape(), bw = (len - pw) / bays, r = (bw - pw) / 2;
  sh.moveTo(-len / 2, -0.02); sh.lineTo(len / 2, -0.02); sh.lineTo(len / 2, hh); sh.lineTo(-len / 2, hh); sh.closePath();
  for (let i = 0; i < bays; i++) {
    const xm = -len / 2 + pw / 2 + (i + 0.5) * bw, hole = new THREE.Path();
    hole.moveTo(xm - r, 0); hole.lineTo(xm + r, 0); hole.lineTo(xm + r, spring); hole.absarc(xm, spring, r, 0, Math.PI, false); hole.lineTo(xm - r, 0);
    sh.holes.push(hole);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -d / 2);
  return { g, r, xs: Array.from({ length: bays }, (_, i) => -len / 2 + pw / 2 + (i + 0.5) * bw) };
};

// Archery Range: a stone shooting gallery. At the front a long loggia of pale Portland stone opens in round arches onto
// three mown lanes; it carries a white entablature and a balustrade round its flat lead roof, the flag over it, with
// musket racks and powder kegs inside and a team pennant on each lane's firing rest. Down the lanes, between low stone
// kerbs and distance posts, a stone butt wall with pilasters and ball finials holds the targets, painted in team and
// white rings round a gold heart, in round-headed niches.
export function archery_range(ctx) {
  const { b, s, h, t } = ctx, y = 0.03, lanes = [-0.84, 0, 0.84], fl = y + 0.05;
  b.box(s, y, s, GRASS);
  for (const x of lanes) b.box(0.6, 0.006, 2.0, GRASS_L, x, y, -0.32);
  for (const x of [-0.42, 0.42]) b.box(0.05, 0.05, 2.0, STONE_D, x, y, -0.32);
  for (const x of lanes) for (const z of [-0.65, 0.05]) b.box(0.04, 0.14, 0.04, WHITE, x + 0.26, y, z).box(0.05, 0.02, 0.05, C.dark, x + 0.26, y + 0.14, z);
  // The butt wall: pilasters, coping and finials; a target in a niche at each lane's end.
  const bz = -h + 0.14, bh = 0.76;
  b.box(2.72, bh, 0.24, STONE, 0, y, bz).box(2.76, 0.05, 0.28, WHITE, 0, y + bh, bz);
  for (const x of [-1.29, -0.42, 0.42, 1.29]) b.box(0.13, bh, 0.05, STONE_D, x, y, bz + 0.13).box(0.11, 0.06, 0.11, STONE_D, x, y + bh + 0.05, bz).add(BALL, STONE, x, y + bh + 0.17, bz, 0.065, 0.065, 0.065);
  for (const x of lanes) {
    const nz = bz + 0.121, ty = y + 0.38;
    b.box(0.46, 0.34, 0.02, 0x4d4a44, x, y + 0.06, nz).add(ARCH, 0x4d4a44, x, y + 0.4, nz, 0.23, 0.23, 1).add(ARCH_RING, WHITE, x, y + 0.4, nz + 0.004, 0.25, 0.25, 0.15);
    b.box(0.5, 0.04, 0.05, WHITE, x, y + 0.04, nz + 0.01);
    for (const [c, r, dz] of [[C.woodD, 0.19, 0.0], [WHITE, 0.17, 0.008], [t, 0.135, 0.012], [WHITE, 0.095, 0.016], [t, 0.058, 0.02], [C.gold, 0.026, 0.024]]) b.add(DISC, c, x, ty, nz + 0.02 + dz, r, 0.01, r, Math.PI / 2, 0, 0);
    b.box(0.03, 0.2, 0.03, C.woodD, x, y + 0.06, nz + 0.04);
  }
  // The loggia: two arcades and their end walls, the entablature, the lead roof and its balustrade, the flag.
  const lz0 = 0.8, lz1 = 1.3, lcz = (lz0 + lz1) / 2, L = 2.62, ah = 0.6, { g: face, r: ar, xs } = arcadeFace(L, ah, 0.1, 5, 0.36, 0.13);
  b.box(L + 0.06, 0.05, lz1 - lz0 + 0.08, PAVE, 0, y, lcz);
  for (const z of [lz0 + 0.05, lz1 - 0.05]) {
    b.add(face, STONE, 0, fl, z, 1, 1, 1);
    for (const x of xs) { const zz = z + (z > lcz ? 0.052 : -0.052); b.add(ARCH_RING, WHITE, x, fl + 0.36, zz, ar + 0.02, ar + 0.02, 0.15, 0, z > lcz ? 0 : Math.PI, 0).box(0.05, 0.07, 0.025, WHITE, x, fl + 0.36 + ar - 0.02, zz); }
  }
  face.dispose();
  for (const k of [-1, 1]) b.box(0.1, ah, lz1 - lz0, STONE, k * (L / 2 - 0.05), fl, lcz);
  const ey = fl + ah;
  b.box(L + 0.06, 0.08, lz1 - lz0 + 0.06, WHITE, 0, ey, lcz).box(L - 0.1, 0.03, lz1 - lz0 - 0.1, LEAD, 0, ey + 0.08, lcz);
  for (const z of [lz0, lz1]) {
    for (let x = -L / 2 + 0.08; x < L / 2 - 0.04; x += 0.11) b.box(0.03, 0.09, 0.03, WHITE, x, ey + 0.08, z);
    b.box(L + 0.04, 0.03, 0.06, WHITE, 0, ey + 0.17, z);
  }
  for (const k of [-1, 1]) {
    for (let z = lz0 + 0.1; z < lz1 - 0.05; z += 0.11) b.box(0.03, 0.09, 0.03, WHITE, k * L / 2, ey + 0.08, z);
    b.box(0.06, 0.03, lz1 - lz0 + 0.04, WHITE, k * L / 2, ey + 0.17, lcz);
    b.box(0.1, 0.06, 0.1, WHITE, k * L / 2, ey + 0.2, lz0).add(BALL, STONE, k * L / 2, ey + 0.31, lz0, 0.05, 0.05, 0.05);
  }
  flag(ctx, 0, ey + 0.11, lcz, 0.55);
  // Inside: a musket rack along the back, powder kegs; at the firing line, rests with team pennants.
  b.box(1.6, 0.04, 0.05, C.woodD, -0.3, fl + 0.32, lz1 - 0.14).box(1.6, 0.04, 0.05, C.woodD, -0.3, fl + 0.08, lz1 - 0.11);
  for (let i = 0; i < 9; i++) stick(b, 0.008, C.woodD, [-1.04 + i * 0.18, fl + 0.02, lz1 - 0.1], [-1.05 + i * 0.18, fl + 0.44, lz1 - 0.15], CYL6);
  for (const [x, z] of [[0.75, lcz], [0.88, lcz + 0.04], [0.81, lcz - 0.08]]) barrel(b, x, fl, z, 0.055, 0.12);
  for (const x of lanes) {
    const rx = x - 0.12, rz = lz0 - 0.1;
    b.box(0.04, 0.26, 0.04, C.woodD, rx, y, rz).box(0.16, 0.03, 0.05, C.woodD, rx, y + 0.26, rz);
    b.box(0.015, 0.36, 0.015, C.woodD, x + 0.2, y, rz).box(0.012, 0.08, 0.13, t, x + 0.2, y + 0.27, rz + 0.07);
  }
  return ey + 0.36;
}

// A coach facing +x, built at the origin for place(): a dark painted body with team door panels and glazed upper
// panels, big rear and small front wheels, the coachman's box, a trunk on the roof and the pole forward to the pair.
const coach = t => {
  const c = new B();
  for (const [wx, r] of [[-0.19, 0.13], [0.17, 0.09]]) for (const k of [-1, 1]) {
    c.add(CYL8, C.woodD, wx, r, k * 0.16, r, 0.024, r, Math.PI / 2, 0, 0).add(CYL6, P.iron, wx, r, k * 0.176, 0.024, 0.03, 0.024, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) c.add(unit.box, C.wood, wx, r, k * 0.16, r * 1.9, 0.012, 0.012, 0, 0, i * Math.PI / 3);
  }
  c.box(0.62, 0.03, 0.05, C.woodD, 0, 0.12, 0).box(0.03, 0.03, 0.34, C.woodD, -0.19, 0.12, 0).box(0.03, 0.03, 0.34, C.woodD, 0.17, 0.09, 0);
  c.box(0.38, 0.15, 0.27, PAINT, -0.03, 0.2, 0).box(0.34, 0.14, 0.25, PAINT, -0.03, 0.35, 0).box(0.4, 0.03, 0.29, PAINT, -0.03, 0.49, 0);
  c.box(0.15, 0.13, 0.28, t, -0.03, 0.21, 0).box(0.012, 0.012, 0.285, C.gold, -0.03, 0.33, 0);
  for (const dx of [-0.12, 0.06]) c.box(0.1, 0.08, 0.255, GLASS, -0.03 + dx, 0.38, 0);
  c.box(0.2, 0.07, 0.2, C.leather, -0.06, 0.52, 0);
  c.box(0.1, 0.16, 0.24, PAINT, 0.23, 0.2, 0).box(0.12, 0.03, 0.26, t, 0.23, 0.36, 0).box(0.04, 0.1, 0.24, PAINT, 0.31, 0.12, 0);
  stick(c, 0.012, C.woodD, [0.27, 0.14, 0], [0.82, 0.32, 0], CYL6);
  return c;
};

// Stable: a brick coach house. A long brick coach house with three tall round-arched carriage doors in team colour (the
// middle one open), oculi to the loft above, a stone pediment with a team tympanum over the centre and a white lantern
// with a weathervane on its hipped roof. In the cobbled yard a team-panelled coach with its pair of horses in team
// saddle cloths, a pump and trough and a mounting block; a horse looks out of the stable door in the +x end.
export function stable(ctx) {
  const { b, mast, s, t } = ctx, y = 0.03, x0 = -1.32, x1 = 0.96, z0 = -1.32, z1 = -0.6, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, fl = y + 0.07;
  b.box(s, y, s, COBBLE);
  const top = block(b, cx, cz, W, D, 0.92, 0.38, { y }), rt = top + 0.38;
  b.box(W + 0.02, 0.03, D + 0.02, WHITE, cx, fl + 0.66, cz);
  // The carriage doors, the oculi over them, the pediment.
  for (const [i, dx] of [-0.72, 0, 0.72].entries()) {
    const x = cx + dx;
    archway(b, x, fl, z1 + 0.011, 0, 0.46, 0.34, i === 1 ? C.dark : t);
    if (i !== 1) b.box(0.012, 0.34, 0.024, CRATE_D, x, fl, z1 + 0.024);
    b.add(DISC, WHITE, x, fl + 0.8, z1 + 0.012, 0.075, 0.02, 0.075, Math.PI / 2, 0, 0).add(DISC, GLASS, x, fl + 0.8, z1 + 0.02, 0.05, 0.01, 0.05, Math.PI / 2, 0, 0);
  }
  for (const k of [-1, 1]) b.box(0.2, 0.34, 0.02, t, cx + k * 0.25, fl, z1 + 0.11, 0, k * 1.0);
  b.roof(0.9, 0.26, 0.12, STONE, cx, top, z1 + 0.02).roof(0.7, 0.18, 0.02, t, cx, top + 0.03, z1 + 0.085);
  // The +x end: a stable door (its lower leaf team), a horse looking out, windows.
  b.box(0.012, 0.38, 0.26, WHITE, x1 + 0.006, fl, cz + 0.08).box(0.012, 0.18, 0.2, t, x1 + 0.016, fl, cz + 0.08).box(0.012, 0.16, 0.2, C.dark, x1 + 0.014, fl + 0.18, cz + 0.08);
  b.box(0.16, 0.08, 0.08, HORSE_HEAD, x1 + 0.08, fl + 0.24, cz + 0.08, 0, 0, -0.3).box(0.08, 0.14, 0.08, HORSE_HEAD, x1 + 0.03, fl + 0.22, cz + 0.08, 0, 0, -0.5).box(0.02, 0.05, 0.03, WHITE, x1 + 0.16, fl + 0.25, cz + 0.08);
  for (const z of [cz - 0.2]) sash(b, x1 + 0.01, fl + 0.14, z, Math.PI / 2, 0.14, 0.24);
  for (const k of [-1, 1]) sash(b, x1 + 0.01, fl + 0.68, cz + k * 0.17, Math.PI / 2, 0.12, 0.16);
  // The lantern on the ridge, its lead cap; the weathervane and the flag.
  const lx = cx, ly = rt - 0.05;
  b.box(0.26, 0.06, 0.26, WHITE, lx, ly, cz).add(CYL8, WHITE, lx, ly + 0.17, cz, 0.1, 0.22, 0.1);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 8, ry = Math.PI / 2 - a; b.box(0.04, 0.12, 0.02, C.dark, lx + Math.cos(a) * 0.095, ly + 0.1, cz + Math.sin(a) * 0.095, 0, ry); }
  b.cylT(0.12, 0.12, 0.03, WHITE, lx, ly + 0.28, cz, 8).add(DOME, LEAD, lx, ly + 0.31, cz, 0.11, 0.1, 0.11);
  mast.cylT(0.006, 0.01, 0.3, C.dark, lx, ly + 0.4, cz, 4).box(0.18, 0.012, 0.012, C.dark, lx, ly + 0.6, cz).box(0.02, 0.05, 0.05, C.dark, lx - 0.09, ly + 0.58, cz, 0, Math.PI / 4).box(0.012, 0.04, 0.04, C.gold, lx, ly + 0.5, cz, Math.PI / 4);
  flag(ctx, cx + 0.72, rt - 0.02, cz, 0.42);
  // The coach and its pair; the pump and trough, the mounting block.
  const ox = -0.42, oz = 0.36;
  place(b, coach(t), ox, y, oz, 0);
  for (const k of [-1, 1]) place(b, horse(t), ox + 0.98, y, oz + k * 0.12, 0);
  const tx = 1.12, tz = -0.25;
  b.box(0.18, 0.13, 0.46, STONE_D, tx, y, tz).box(0.14, 0.01, 0.42, WATER, tx, y + 0.125, tz);
  b.box(0.07, 0.42, 0.07, PAINT, tx + 0.02, y, tz - 0.32).box(0.03, 0.03, 0.1, PAINT, tx + 0.02, y + 0.33, tz - 0.27).box(0.02, 0.02, 0.18, PAINT, tx + 0.02, y + 0.4, tz - 0.4, 0.5);
  for (let i = 0; i < 3; i++) b.box(0.22 - i * 0.06, 0.06, 0.2, STONE, 0.5 - i * 0.03, y + i * 0.06, -0.38);
  return rt + 0.36;
}

// A beam scale for place(), built at the origin: a timber gallows frame hh tall, its brass balance beam hung from the
// crosstree (tipped by its load), chains down to two brass pans, a crate on the lower pan and iron weights on the other.
const scales = (t, hh) => {
  const c = new B(), tilt = 0.12, half = 0.26, py = hh - 0.14;
  for (const k of [-1, 1]) c.box(0.06, hh, 0.06, C.woodD, k * 0.36, 0, 0).box(0.04, 0.04, 0.24, C.woodD, k * 0.36, 0, 0);
  for (const k of [-1, 1]) stick(c, 0.015, C.woodD, [k * 0.36, hh - 0.2, 0], [k * 0.2, hh - 0.02, 0], unit.box);
  c.box(0.84, 0.06, 0.07, C.wood, 0, hh, 0).box(0.012, 0.1, 0.012, P.iron, 0, py + 0.03, 0);
  c.add(unit.box, P.brass, 0, py, 0, 2 * half, 0.024, 0.03, 0, 0, -tilt).add(CONE4, P.brass, 0, py + 0.04, 0, 0.025, 0.08, 0.02);
  for (const k of [-1, 1]) {
    const ex = k * half * Math.cos(tilt), ey = py - k * half * Math.sin(tilt), pan = ey - 0.36;
    for (const o of [-1, 1]) stick(c, 0.004, P.iron, [ex, ey, 0], [ex + o * 0.07, pan + 0.02, 0], CYL6);
    c.cylT(0.09, 0.06, 0.025, P.brass, ex, pan, 0, 10);
    if (k < 0) crate(c, ex, pan + 0.025, 0, 0.12, 0.2, t);
    else for (let i = 0; i < 3; i++) c.cylT(0.04 - i * 0.008, 0.04 - i * 0.008, 0.03, GUN, ex, pan + 0.025 + i * 0.03, 0, 8);
  }
  return c;
};

// Market: a trading house with crates and scales. A brick merchant's house with a white shopfront of two bow windows
// either side of the door under a team fascia, a hanging team sign, sash windows and dormers in its hipped roof; its
// lower brick warehouse beside it. In the yard the great beam scale weighs a crate against iron weights, among stacked
// crates with team bands, casks, team bales of cloth, tea chests and sacks.
export function market(ctx) {
  const { b, s, h, t, td } = ctx, y = 0.03, x0 = -1.32, x1 = 0.44, z0 = -1.32, z1 = -0.6, W = x1 - x0, D = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, fl = y + 0.07;
  b.box(s, y, s, COBBLE);
  const top = block(b, cx, cz, W, D, 0.94, 0.42, { y });
  quoins(b, x1, z1, 1, 1, fl, 0.94);
  for (const k of [-1, 1]) chimney(b, cx + k * (W / 2 - 0.16), top + 0.2, cz, 0.4);
  // The shopfront: stall riser, bow windows, the door, the fascia and its sign.
  const sz = z1 + 0.012;
  b.box(W - 0.12, 0.5, 0.025, WHITE, cx, fl, sz);
  for (const bx of [cx - 0.48, cx + 0.48]) {
    const bw = 0.42, o = 0.1;
    b.box(bw, 0.12, o * 2, WHITE, bx, fl, sz).box(bw - 0.04, 0.26, 0.02, GLASS, bx, fl + 0.13, sz + o).box(bw + 0.04, 0.05, o * 2 + 0.04, WHITE, bx, fl + 0.4, sz);
    for (const k of [-1, 1]) b.box(0.02, 0.26, 0.16, GLASS, bx + k * (bw / 2 - 0.01), fl + 0.13, sz + 0.02, 0, -k * 0.35);
    for (let i = 1; i < 4; i++) b.box(0.012, 0.26, 0.022, WHITE, bx - bw / 2 + i * bw / 4, fl + 0.13, sz + o + 0.002);
    b.box(bw - 0.04, 0.012, 0.022, WHITE, bx, fl + 0.26, sz + o + 0.002);
  }
  gdoor(b, cx, fl, sz + 0.004, 0, td, 0.2, 0.36);
  b.box(W - 0.1, 0.09, 0.04, t, cx, fl + 0.5, sz + 0.02).box(W - 0.3, 0.014, 0.045, C.gold, cx, fl + 0.535, sz + 0.022);
  b.box(0.02, 0.02, 0.24, P.iron, x1 - 0.06, fl + 0.82, z1 + 0.12).box(0.02, 0.2, 0.18, WHITE, x1 - 0.06, fl + 0.6, z1 + 0.15).box(0.024, 0.16, 0.14, t, x1 - 0.06, fl + 0.62, z1 + 0.15);
  sashes(b, cx, z1, 0, W, 5, [fl + 0.62], 0.14, 0.24);
  sashes(b, x1, cz, Math.PI / 2, D, 2, [fl + 0.14, fl + 0.62], 0.13, 0.24);
  // Two dormers in the front slope.
  for (const dx of [-0.42, 0.42]) {
    const dz = z1 - 0.06;
    b.box(0.2, 0.18, 0.22, WHITE, cx + dx, top + 0.06, dz - 0.04).box(0.12, 0.12, 0.02, GLASS, cx + dx, top + 0.09, dz + 0.075).roof(0.26, 0.12, 0.26, TILE, cx + dx, top + 0.24, dz - 0.04);
  }
  flag(ctx, cx, top + 0.42 - 0.02, cz, 0.45);
  // The warehouse beside it: a team loading door, a window.
  const wx0 = x1 + 0.08, wx1 = h - 0.06, wz0 = -1.3, wz1 = -0.78, wcx = (wx0 + wx1) / 2, wcz = (wz0 + wz1) / 2;
  block(b, wcx, wcz, wx1 - wx0, wz1 - wz0, 0.6, 0.28, { y });
  archway(b, wcx, fl, wz1 + 0.011, 0, 0.34, 0.3, t);
  b.box(0.012, 0.3, 0.024, CRATE_D, wcx, fl, wz1 + 0.024);
  sash(b, wx1 + 0.01, fl + 0.26, wcz, Math.PI / 2, 0.13, 0.22);
  // The yard: the scale, crates, casks, bales, tea chests, sacks.
  place(b, scales(t, 0.95), 0.32, y, 0.42, 0);
  for (const [x, z, w, ry, band] of [[-0.95, 0.0, 0.17, 0.1, t], [-0.77, -0.04, 0.16, -0.15, null], [-0.88, 0.18, 0.16, 0.3, null], [1.0, 0.62, 0.17, 0.2, t], [1.12, 0.45, 0.15, -0.1, null], [1.15, 0.92, 0.15, 0.4, t]]) crate(b, x, y, z, w, ry, band);
  crate(b, -0.88, y + 0.145, 0.04, 0.15, -0.2, t); crate(b, 1.05, y + 0.145, 0.55, 0.14, 0.1, null);
  for (const [x, z] of [[-0.42, 0.7], [-0.28, 0.78], [-0.36, 0.9]]) barrel(b, x, y, z);
  for (const [x, z, ry] of [[0.95, -0.25, 0.1], [1.12, -0.32, -0.2]]) {
    b.add(CYL8, t, x, y + 0.085, z, 0.085, 0.3, 0.085, 0, ry, Math.PI / 2);
    for (const o of [-0.08, 0.08]) b.add(CYL8, ROPE, x + Math.cos(ry) * o, y + 0.085, z - Math.sin(ry) * o, 0.088, 0.02, 0.088, 0, ry, Math.PI / 2);
  }
  b.add(CYL8, t, 1.03, y + 0.24, -0.29, 0.08, 0.28, 0.08, Math.PI / 2, 0.0, 0);
  for (const [x, z, yy] of [[-0.62, 0.42, 0], [-0.5, 0.48, 0], [-0.56, 0.45, 0.13]]) b.box(0.13, 0.13, 0.13, 0x5a3a22, x, y + yy, z).box(0.135, 0.012, 0.135, C.gold, x, y + yy + 0.06, z);
  sack(b, 0.66, y, 0.88, 0.08); sack(b, 0.54, y, 0.94, 0.075); sack(b, 0.62, y + 0.12, 0.9, 0.07);
  return top + 0.7;
}

// Government Center: a capitol dome. A white neoclassical capitol on a stone podium: low wings either side with
// rows of sash windows under balustrades, the taller centre block fronted by a portico of six columns under a pediment
// with a team tympanum, broad steps to it. Over the centre a great copper dome on a drum ringed by columns, its white
// lantern flying the flag.
export function government_center(ctx) {
  const { b, s, t, td } = ctx, y = 0.05, fy = y + 0.1;
  b.box(s, y, s, PAVE).box(2.62, 0.1, 2.16, STONE, 0, y, -0.22);
  // The wings: walls, string course, windows, balustrade and lead roof.
  const wz0 = -1.02, wz1 = 0.2, wcz = (wz0 + wz1) / 2, wd = wz1 - wz0, wh = 0.66, wtop = fy + wh;
  for (const k of [-1, 1]) {
    const wx = k * 0.91, ww = 0.78;
    b.box(ww, wh, wd, WHITE, wx, fy, wcz).box(ww + 0.02, 0.025, wd + 0.02, STONE, wx, fy + 0.3, wcz).box(ww + 0.05, 0.05, wd + 0.05, STONE, wx, wtop - 0.05, wcz);
    sashes(b, wx, wz1, 0, ww, 3, [fy + 0.06, fy + 0.36], 0.13, 0.22);
    b.box(ww, 0.02, wd, LEAD, wx, wtop, wcz);
    for (let u = -ww / 2 + 0.05; u < ww / 2; u += 0.1) b.box(0.025, 0.08, 0.025, WHITE, wx + u, wtop, wz1);
    b.box(ww + 0.02, 0.025, 0.05, WHITE, wx, wtop + 0.08, wz1);
    if (k > 0) {
      sashes(b, wx + ww / 2, wcz, Math.PI / 2, wd, 4, [fy + 0.06, fy + 0.36], 0.13, 0.22);
      for (let u = -wd / 2 + 0.05; u < wd / 2; u += 0.1) b.box(0.025, 0.08, 0.025, WHITE, wx + ww / 2, wtop, wcz + u);
      b.box(0.05, 0.025, wd + 0.02, WHITE, wx + ww / 2, wtop + 0.08, wcz);
    }
  }
  // The centre block and the portico: six columns, the entablature, the pediment and its team tympanum, the door, steps.
  const cz0 = -1.2, cz1 = 0.34, ccz = (cz0 + cz1) / 2, ch = 0.84, ctop = fy + ch;
  b.box(1.0, ch, cz1 - cz0, WHITE, 0, fy, ccz).box(1.05, 0.06, cz1 - cz0 + 0.05, STONE, 0, ctop - 0.06, ccz);
  const pz = 0.8, ph = 0.64;
  for (let i = 0; i < 6; i++) column(b, -0.4 + i * 0.16, fy, pz, ph, 0.04);
  b.box(1.0, 0.09, pz - cz1 + 0.08, WHITE, 0, fy + ph, (cz1 + pz) / 2 + 0.02).box(1.0, 0.03, 0.02, t, 0, fy + ph + 0.03, pz + 0.07);
  b.roof(1.06, 0.26, pz - cz1 + 0.1, WHITE, 0, fy + ph + 0.09, (cz1 + pz) / 2 + 0.02).roof(0.8, 0.17, 0.02, t, 0, fy + ph + 0.13, pz + 0.08);
  gdoor(b, 0, fy, cz1 + 0.011, 0, td, 0.24, 0.42);
  for (let i = 0; i < 4; i++) b.box(1.16, (i + 1) * 0.025, 1.28 - i * 0.1 - 0.86, STONE, 0, y, (0.86 + 1.28 - i * 0.1) / 2);
  // The drum, its ring of columns, the attic, the copper dome and the lantern; the flag.
  const dz = -0.44, dy = ctop;
  b.box(0.98, 0.1, 0.98, WHITE, 0, dy, dz).cylT(0.53, 0.53, 0.03, STONE, 0, dy + 0.1, dz, 16);
  b.cylT(0.42, 0.42, 0.34, WHITE, 0, dy + 0.13, dz, 16);
  for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + (i - 1.75) * 0.72, ry = Math.PI / 2 - a; b.box(0.06, 0.18, 0.02, GLASS, Math.cos(a) * 0.42, dy + 0.19, dz + Math.sin(a) * 0.42, 0, ry); }
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; b.cylT(0.02, 0.024, 0.33, WHITE, Math.cos(a) * 0.49, dy + 0.13, dz + Math.sin(a) * 0.49, 6); }
  b.cylT(0.53, 0.53, 0.05, WHITE, 0, dy + 0.46, dz, 16).cylT(0.41, 0.44, 0.12, WHITE, 0, dy + 0.51, dz, 16);
  b.add(DOME, COPPER, 0, dy + 0.63, dz, 0.43, 0.48, 0.43).cylT(0.44, 0.44, 0.03, COPPER_L, 0, dy + 0.63, dz, 16);
  const ly = dy + 0.63 + 0.46;
  b.cylT(0.1, 0.11, 0.16, WHITE, 0, ly, dz, 8).add(DOME, COPPER, 0, ly + 0.16, dz, 0.11, 0.1, 0.11);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, ry = Math.PI / 2 - a; b.box(0.03, 0.09, 0.02, C.dark, Math.cos(a) * 0.1, ly + 0.03, dz + Math.sin(a) * 0.1, 0, ry); }
  flag(ctx, 0, ly + 0.24, dz, 0.5, C.gold);
  return ly + 0.26;
}

// The lighthouse lamp, built at the origin for a spinner turning about y: a brass stand and a glowing lens drum whose
// two bright lens faces (±x), between dark brass backs, throw two short fans of light out between the glazing bars.
const LENS = 0xffe17a, LIGHT = 0xfff3c2, BEAM = 0xffe9a0;
const lamp = () => {
  const g = new B();
  g.cylT(0.05, 0.07, 0.06, P.brass, 0, 0, 0, 8).add(CYL8, LENS, 0, 0.17, 0, 0.1, 0.22, 0.1).cylT(0.11, 0.11, 0.025, P.brass, 0, 0.06, 0, 8).cylT(0.11, 0.11, 0.025, P.brass, 0, 0.26, 0, 8);
  for (const k of [-1, 1]) {
    g.box(0.02, 0.18, 0.15, LIGHT, k * 0.105, 0.075, 0).box(0.15, 0.18, 0.02, P.brass, 0, 0.075, k * 0.105);
    g.add(CONE4, BEAM, k * 0.31, 0.165, 0, 0.045, 0.4, 0.15, 0, 0, k * Math.PI / 2);
  }
  return g.geometry();
};

// Wonder: a lighthouse. A tall tapering tower in the manner of Smeaton's Eddystone, flared at its foot and banded in team
// colour and white, rises from a stone plinth on a rocky headland, its stair windows climbing round it. Up top a
// corbelled gallery with an iron railing carries the lantern: glazing bars round the lamp (an animated spinner, whose
// beams sweep round), a copper roof and the flag. At its foot the whitewashed keeper's cottage and a brick oil store;
// rocks lie in the sea round the headland, with a jetty and a team-striped boat.
export function wonder(ctx) {
  const { b, s, t, td, extra } = ctx, tx = -0.25, tz = -0.25, ly = 0.16, clamp = v => Math.max(-1.78, Math.min(1.78, v));
  b.box(s, 0.03, s, WATER);
  // The headland: rocky shores up to grass, a gravel path.
  const coast = [[1.86, -1.86], [1.86, -0.75], [1.42, -0.32], [1.12, 0.2], [0.78, 0.48], [0.48, 0.78], [0.2, 1.12], [-0.32, 1.42], [-0.75, 1.86], [-1.86, 1.86], [-1.86, -1.86]];
  loft(b, [coast, offset(coast, -0.08), offset(coast, -0.2)], [0.0, ly - 0.06, ly], [ROCK, SAND], { top: GRASS });
  for (let i = 0; i < 16; i++) {
    const e = i % 8 + 1, f = hash(i, 3), p = along(coast, e, f), q = coast[(e + 1) % coast.length], dx = q[1] - coast[e][1], dz = -(q[0] - coast[e][0]), L = Math.hypot(dx, dz), o = 0.08 + hash(i, 7) * 0.3, r = 0.06 + hash(5, i) * 0.1;
    b.rock(r, i % 2 ? ROCK : ROCK_D, clamp(p[0] + dx / L * o), 0.0, clamp(p[1] + dz / L * o), 1.2, 0.7, 1, i);
  }
  b.box(0.8, 0.006, 0.2, GRAVEL, 0.17, ly, 0.5, 0, -0.08);
  // The jetty out along the diagonal into the sea, and the boat moored beside it.
  const jet = f => [0.5 + f * 0.62, 0.5 + f * 0.62], q = Math.SQRT1_2 * 0.13;
  for (const f of [0.25, 0.62, 1]) for (const k of [-1, 1]) { const [x, z] = jet(f); b.box(0.05, 0.19, 0.05, C.woodD, x + k * q, -0.02, z - k * q); }
  b.box(0.28, 0.03, 0.9, C.wood, 0.81, 0.15, 0.81, 0, Math.PI / 4);
  for (let i = 0; i < 6; i++) { const [x, z] = jet(0.1 + i * 0.17); b.box(0.29, 0.008, 0.02, C.woodD, x, 0.18, z, 0, Math.PI / 4); }
  place(b, boat(t, 0.62, 0.24, 0.12), 1.2, 0.02, 0.76, -Math.PI / 4);
  stick(b, 0.006, ROPE, [1.0, 0.18, 0.82], [1.1, 0.13, 0.7], CYL6);
  // The plinth and the tower: a flared, banded loft of twelve sides, its door porch and stair windows.
  const y0 = ly + 0.2, y1 = 4.02, N = 9, rings = [], ys = [], rOf = f => 0.29 + 0.34 * (1 - f) ** 2.2;
  loft(b, [circle(tx, tz, 0.86, 8, Math.PI / 8), circle(tx, tz, 0.8, 8, Math.PI / 8)], [ly, ly + 0.12], [STONE_D]);
  loft(b, [circle(tx, tz, 0.72, 8, Math.PI / 8), circle(tx, tz, 0.68, 8, Math.PI / 8)], [ly + 0.12, y0], [STONE]);
  for (let i = 0; i <= N; i++) { rings.push(circle(tx, tz, rOf(i / N), 12)); ys.push(y0 + (y1 - y0) * i / N); }
  loft(b, rings, ys, [STONE, WHITE, t, WHITE, t, WHITE, t, WHITE, WHITE], { top: STONE });
  b.box(0.3, 0.44, 0.24, STONE, tx, y0, tz + 0.56).roof(0.36, 0.14, 0.26, STONE_D, tx, y0 + 0.44, tz + 0.56);
  gdoor(b, tx, y0, tz + 0.681, 0, td, 0.16, 0.3);
  for (let k = 0; k < 6; k++) {
    const f = (k + 1.4) / 7.4, yy = y0 + (y1 - y0) * f, a = Math.PI / 4 + (k % 2 ? 0.55 : -0.55), r = rOf((yy - y0) / (y1 - y0)), ry = Math.atan2(Math.cos(a), Math.sin(a));
    b.box(0.08, 0.13, 0.03, GLASS, tx + Math.cos(a) * r, yy, tz + Math.sin(a) * r, 0, ry).box(0.1, 0.02, 0.04, WHITE, tx + Math.cos(a) * r, yy - 0.01, tz + Math.sin(a) * r, 0, ry);
  }
  // The gallery and its railing; the lantern, its glazing bars, copper roof and vent; the lamp; the flag.
  b.cylT(0.47, rOf(1), 0.12, STONE_D, tx, y1, tz, 12).cylT(0.48, 0.48, 0.04, STONE, tx, y1 + 0.12, tz, 12);
  const gy = y1 + 0.16;
  for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; b.box(0.014, 0.15, 0.014, GUN, tx + Math.cos(a) * 0.46, gy, tz + Math.sin(a) * 0.46); }
  const rail = new THREE.TorusGeometry(0.46, 0.012, 3, 24);
  b.add(rail, GUN, tx, gy + 0.15, tz, 1, 1, 1, Math.PI / 2, 0, 0); rail.dispose();
  b.cylT(0.28, 0.28, 0.1, GUN, tx, gy, tz, 12);
  const my = gy + 0.1, mh = 0.4;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; b.box(0.024, mh, 0.024, GUN, tx + Math.cos(a) * 0.27, my, tz + Math.sin(a) * 0.27); }
  const bar = new THREE.TorusGeometry(0.27, 0.008, 3, 16);
  b.add(bar, GUN, tx, my + mh * 0.55, tz, 1, 1, 1, Math.PI / 2, 0, 0); bar.dispose();
  b.cylT(0.32, 0.32, 0.04, GUN, tx, my + mh, tz, 12).cone(0.31, 0.26, COPPER, tx, my + mh + 0.04, tz, 12).add(BALL, COPPER_L, tx, my + mh + 0.32, tz, 0.055, 0.055, 0.055);
  extra.spinners = [{ geo: lamp(), at: [tx, my, tz], axis: 'y', speed: 1.1 }];
  flag(ctx, tx, my + mh + 0.36, tz, 0.42, GUN);
  // The whitewashed keeper's cottage, facing the tower; the brick oil store behind, its casks.
  const kx = -1.42, kz = -0.55;
  const kt = block(b, kx, kz, 0.6, 1.12, 0.5, 0.3, { y: ly, c: WHITE });
  gdoor(b, kx + 0.311, ly + 0.07, kz + 0.1, Math.PI / 2, td, 0.15, 0.28);
  for (const dz of [-0.38, -0.16, 0.36]) sash(b, kx + 0.31, ly + 0.16, kz + dz, Math.PI / 2, 0.12, 0.2);
  sashes(b, kx, kz + 0.56, 0, 0.6, 2, [ly + 0.16], 0.12, 0.2);
  for (const k of [-1, 1]) chimney(b, kx, kt + 0.12, kz + k * 0.42, 0.3);
  const ox = 0.75, oz = -1.42;
  block(b, ox, oz, 0.62, 0.46, 0.42, 0.24, { y: ly });
  archway(b, ox, ly + 0.07, oz + 0.241, 0, 0.2, 0.18, t);
  barrel(b, 1.22, ly, -1.12); barrel(b, 1.1, ly, -1.02, 0.065); barrel(b, 1.16, ly + 0.17, -1.07, 0.06, 0.14);
  return my + mh + 0.36;
}

// The star fort's trace: a square of curtains c out from the centre with a pointed bastion at each corner, its flanks fl
// long standing g off the corner's axes, its faces meeting at the salient (S, S); the ring runs from +x toward +z, five
// edges a corner (flank, face, face, flank, curtain), from the +x flank of the (+x, +z) bastion.
const trace = (c, g, fl, S) => {
  const q = [[c, g], [c + fl, g], [S, S], [g, c + fl], [g, c]], out = [];
  for (let k = 0; k < 4; k++) for (const [x, z] of q) { let [px, pz] = [x, z]; for (let i = 0; i < k; i++) [px, pz] = [-pz, px]; out.push([px, pz]); }
  return out;
};

// Castle: a star fort. Low angled bastions at the four corners of a square of curtains, its earthwork ramparts faced in
// stone with a white cordon and sloped grass parapets above, the parapets cut by embrasures with a cannon on a team
// carriage in each; a stone sentry box (guérite) on each salient and a wet ditch all round. A rusticated gateway with a
// team panel under its pediment opens on the front curtain over a timber bridge. Inside, round the gravel parade, the
// governor's house, a stone powder magazine with a team door, shot piled by the guns and the tall flagstaff.
export function castle(ctx) {
  const { b, s, h, t, td } = ctx, H = 0.42, PH = 0.16, c = 1.0, T = trace(c, 0.42, 0.28, 1.62), n = T.length;
  b.box(s, 0.03, s, GRASS);
  // The ditch, the scarp with its batter, the white cordon and the terreplein inside it.
  const T1 = offset(T, -0.05), sq = (r) => rect(0, 0, 2 * r, 2 * r);
  cap(b, offset(T, 0.28), 0.034, GRASS_D, [offset(T, 0.24)]); cap(b, offset(T, 0.24), 0.04, WATER, [T]);
  loft(b, [T, T1], [0.03, H - 0.05], [STONE], { top: null });
  loft(b, [offset(T1, 0.025), offset(T1, 0.025)], [H - 0.06, H], [WHITE], { top: null });
  cap(b, offset(T1, 0.025), H, WHITE, [T1]);
  cap(b, T1, H, GRASS, [sq(0.66)]);
  loft(b, [sq(0.52), sq(0.66)], [0.03, H], [GRASS_D], { inward: true, top: null });
  b.box(1.04, 0.012, 1.04, GRAVEL, 0, 0.03, 0);
  // The parapets, cut by an embrasure in every flank, face and curtain (the gate's in the front curtain), with a gun in
  // each; the parapet's outer face slopes back.
  const P0 = T1, P1 = offset(T1, -0.06), P2 = offset(T1, -0.2), len = r => i => Math.hypot(r[(i + 1) % n][0] - r[i][0], r[(i + 1) % n][1] - r[i][1]);
  const gapAt = i => i % 5 === 1 ? 0.55 : i % 5 === 2 ? 0.45 : 0.5, half = i => (i === 4 ? 0.2 : 0.06) / len(P0)(i);
  for (let i = 0; i < n; i++) {
    const a = [i, gapAt(i) + half(i)], z = [i + 1, gapAt((i + 1) % n) - half((i + 1) % n)];
    const inner = path(P2, a, z).reverse();
    loft(b, [[...path(P0, a, z), ...inner], [...path(P1, a, z), ...inner]], [H, H + PH], [GRASS_D], { top: GRASS });
    if (i === 4) continue;
    const e = lerp(along(P0, i, gapAt(i)), along(P2, i, gapAt(i)), 0.55), q = P0[(i + 1) % n], p = P0[i], dx = q[1] - p[1], dz = -(q[0] - p[0]);
    cannon(b, t, e[0], H, e[1], dx, dz, 0.85);
  }
  // A guérite on each salient.
  for (let k = 0; k < 4; k++) {
    const [x, z] = offset(T1, -0.12)[k * 5 + 2], a = Math.atan2(z, x);
    b.cylT(0.075, 0.03, 0.1, STONE_D, x, H - 0.1, z, 8).cylT(0.075, 0.075, 0.22, STONE, x, H, z, 8).add(DOME, STONE, x, H + 0.22, z, 0.085, 0.08, 0.085).add(BALL, STONE_D, x, H + 0.31, z, 0.025, 0.025, 0.025);
    b.box(0.025, 0.09, 0.02, C.dark, x + Math.cos(a) * 0.075, H + 0.08, z + Math.sin(a) * 0.075, 0, Math.PI / 2 - a);
  }
  // The gateway, its pediment and team panel, and the bridge over the ditch.
  const gz = c - 0.02;
  b.box(0.52, 0.62, 0.2, STONE, 0, 0.03, gz - 0.08);
  for (let i = 0; i < 4; i++) b.box(0.53, 0.02, 0.205, STONE_D, 0, 0.1 + i * 0.12, gz - 0.08);
  archway(b, 0, 0.04, gz + 0.021, 0, 0.22, 0.2);
  b.box(0.56, 0.05, 0.24, WHITE, 0, 0.65, gz - 0.08).roof(0.6, 0.16, 0.08, STONE, 0, 0.7, gz).roof(0.44, 0.1, 0.02, t, 0, 0.72, gz + 0.04);
  b.box(0.18, 0.12, 0.02, t, 0, 0.45, gz + 0.021).box(0.2, 0.02, 0.025, C.gold, 0, 0.57, gz + 0.022).box(0.04, 0.06, 0.025, C.gold, 0, 0.48, gz + 0.026);
  b.box(0.26, 0.03, 0.4, C.wood, 0, 0.05, c + 0.2);
  for (const k of [-1, 1]) { for (const z of [c + 0.04, c + 0.38]) b.box(0.03, 0.14, 0.03, C.woodD, k * 0.12, 0.05, z); b.box(0.02, 0.02, 0.38, C.woodD, k * 0.12, 0.17, c + 0.21); }
  b.box(0.26, 0.006, h - c - 0.38, GRAVEL, 0, 0.03, (h + c + 0.38) / 2);
  // Inside: the governor's house, the magazine, shot and the flagstaff.
  const top = block(b, -0.06, -0.33, 0.86, 0.32, 0.34, 0.2, { y: 0.03 });
  sashes(b, -0.06, -0.17, 0, 0.86, 4, [0.18], 0.11, 0.18);
  gdoor(b, -0.06, 0.1, -0.165, 0, td, 0.12, 0.22);
  for (const k of [-1, 1]) chimney(b, -0.06 + k * 0.3, top + 0.08, -0.33, 0.2);
  // The magazine: stone under a lead roof, with team doors on the two faces the camera sees.
  b.box(0.3, 0.22, 0.24, STONE, -0.3, 0.03, 0.22).roof(0.36, 0.14, 0.26, LEAD, -0.3, 0.25, 0.22, Math.PI / 2).box(0.1, 0.14, 0.02, t, -0.3, 0.03, 0.341);
  b.box(0.02, 0.14, 0.1, t, -0.149, 0.03, 0.22);
  for (const [x, z, yy] of [[0.12, 0.3, 0], [0.18, 0.3, 0], [0.15, 0.35, 0], [0.15, 0.32, 0.045]]) b.add(BALL, GUN, x, 0.06 + yy, z, 0.03, 0.03, 0.03);
  b.box(0.2, 0.06, 0.2, STONE_D, 0.3, 0.03, 0.22).box(0.12, 0.05, 0.12, STONE, 0.3, 0.09, 0.22);
  flag(ctx, 0.3, 0.14, 0.22, 1.5, C.woodD, [0.34, 0.6]);
  return H + PH + 0.3;
}

// ---------- Age of Sail defences ----------
// Tower: a cannon bastion. A lone arrowhead bastion pointing at the field: its battered red-brick scarp on a stone
// plinth, a white stone cordon and a white salient angle, under a sloped turf parapet. Two heavy guns on team carriages
// fire over the parapet (en barbette), one down each face, with round shot piled by them and a powder barrel; a stone
// guérite keeps the salient and the flag flies from a staff behind the guns. Its shot is both guns firing: muzzle flashes
// and powder smoke (extra.fire).
export function tower(ctx) {
  const { b, t, extra } = ctx, H = 1.2, PH = 0.2, k = 1.9;
  // The trace: the salient toward the camera, the faces back to the shoulders, the flanks to the gorge.
  const T = [[0.84, 0.84], [-0.46, 0.74], [-0.86, 0.06], [0.06, -0.86], [0.74, -0.46]], T1 = offset(T, -0.08);
  b.box(1.76, 0.03, 1.76, GRASS);
  loft(b, [offset(T, 0.085), offset(T, 0.07)], [0.03, 0.13], [STONE_D], { top: null });
  cap(b, offset(T, 0.085), 0.13, STONE_D, [offset(T, 0.06)]);
  loft(b, [offset(T, 0.06), T1], [0.13, H - 0.06], [BRICK], { top: null });
  const s0 = offset(T, 0.06)[0];
  stick(b, 0.035, WHITE, [s0[0], 0.13, s0[1]], [T1[0][0], H - 0.06, T1[0][1]], CYL6);
  loft(b, [offset(T1, 0.025), offset(T1, 0.025)], [H - 0.06, H], [WHITE], { top: null });
  cap(b, offset(T1, 0.025), H, WHITE, [T1]);
  // The parapet: its outer face sloping back to a turf crest, its inner face plumb, round the gravel terreplein.
  const P1 = offset(T1, -0.07), P2 = offset(T1, -0.24);
  loft(b, [T1, P1], [H, H + PH], [GRASS_D], { top: null });
  cap(b, P1, H + PH, GRASS, [P2]);
  loft(b, [P2, P2], [H, H + PH], [GRASS_D], { inward: true, top: null });
  cap(b, P2, H, GRAVEL);
  // The guns, on timber platforms, each firing square to its face; shot and a powder barrel by them.
  const guns = [[0.44, 0.22, 0.9963, -0.0862], [0.22, 0.44, -0.0862, 0.9963]];
  for (const [x, z, dx, dz] of guns) { b.box(0.22, 0.02, 0.5, C.wood, x - dx * 0.04, H, z - dz * 0.04, 0, Math.atan2(dx, dz)); cannon(b, t, x, H + 0.02, z, dx, dz, k); }
  shot(b, 0.02, H, 0.3, 0.035); shot(b, 0.3, H, 0.0, 0.035);
  barrel(b, 0.12, H, -0.12, 0.075, 0.18);
  // The guérite on the salient, its slit looking out.
  const [gx, gz] = offset(T1, -0.11)[0];
  b.cylT(0.12, 0.05, 0.16, STONE_D, gx, H - 0.16, gz, 8).cylT(0.12, 0.12, 0.34, STONE, gx, H, gz, 8).add(DOME, STONE, gx, H + 0.34, gz, 0.135, 0.12, 0.135).add(BALL, STONE_D, gx, H + 0.48, gz, 0.04, 0.04, 0.04);
  b.box(0.04, 0.14, 0.02, C.dark, gx + 0.085, H + 0.12, gz + 0.085, 0, Math.PI / 4).box(0.09, 0.2, 0.02, t, gx - 0.06, H + 0.02, gz + 0.105, 0, -0.5);
  flag(ctx, -0.15, H, -0.15, 1.25, C.woodD, [0.32, 0.58]);
  // Both guns firing: a flash at each muzzle and a burst of powder smoke beyond it.
  const fire = new B();
  for (const [x, z, dx, dz] of guns) {
    const m = [x + dx * 0.22 * k, H + 0.02 + 0.14 * k, z + dz * 0.22 * k], at = f => [m[0] + dx * f, m[1] + f * 0.12, m[2] + dz * f];
    muzzleFlash(fire, m, [dx, 0, dz], 1.5);
    fire.add(BALL, P.smoke, ...at(0.6), 0.14, 0.12, 0.14).add(BALL, 0xb4b4b4, ...at(0.82), 0.11, 0.1, 0.11).add(BALL, 0xa8a8a8, ...at(0.5).map((v, i) => i === 1 ? v + 0.12 : v), 0.1, 0.09, 0.1);
  }
  extra.fire = { geo: fire.geometry(), at: [0, 0, 0] };
  return H + 0.52;
}

// Wall: a star-fort earthwork. A red-brick revetment on a stone plinth, white stone quoins at its corners and a white
// cordon, under a turf bank whose crest stands back from the edge, so segments in a line show embrasures between them;
// a team pennant on a pike flies from each. It fills its tile edge to edge, so segments in a line close up into one
// rampart.
export function wall(ctx) {
  const { b, t } = ctx, y1 = 0.5;
  b.box(1, 0.07, 1, STONE_D).box(1, y1 - 0.07, 1, BRICK, 0, 0.07, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(0.09, y1 - 0.07, 0.012, WHITE, x * 0.455, 0.07, z * 0.494).box(0.012, y1 - 0.07, 0.09, WHITE, x * 0.494, 0.07, z * 0.455);
  b.box(1, 0.05, 1, WHITE, 0, y1, 0).box(1, 0.16, 1, GRASS_D, 0, y1 + 0.05, 0).box(1, 0.015, 1, GRASS, 0, y1 + 0.21, 0);
  const cy = y1 + 0.225;
  b.box(0.8, 0.13, 0.8, GRASS_D, 0, cy, 0).box(0.8, 0.015, 0.8, GRASS_L, 0, cy + 0.13, 0);
  stick(b, 0.014, C.woodD, [0.28, cy + 0.14, 0.28], [0.28, cy + 0.62, 0.28], CYL6);
  b.box(0.012, 0.1, 0.2, t, 0.28, cy + 0.5, 0.38);
  return cy + 0.64;
}
