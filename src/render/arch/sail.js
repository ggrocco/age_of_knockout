// Age of Sail: Georgian and colonial building of the 1600s–1700s. Red brick with white stone and painted-wood trim under
// red-tile hipped roofs, rows of white sash windows, pediments and round arches, pale Portland stone for the grander
// work and copper for domes. A white town hall with a cupola and clock, brick townhouses, a brick warehouse with a hoist,
// a dockside warehouse with a crane, orchard rows, a brick barracks on its parade ground, a stone shooting gallery, a
// brick coach house, a trading house with crates and scales, a domed capitol, a lighthouse and a star fort; for
// defence, a cannon bastion and a star-fort earthwork.
//
// In every design `size` is ctx.s (the side of the drawn footprint), `half` is ctx.h (half of it), `team` and
// `teamDark` are the team colours ctx.t and ctx.td; `side` (-1 or 1) mirrors a part to the left or right.
import * as THREE from 'three';
import { B, C, unit } from '../builder.js';
import {
  P, windowGrid, flag, stick, lerp, hash, place, horse, muzzleFlash, CYL6, CYL8, DISC, BALL, CONE4, ARCH, ARCH_RING,
  HORSE_HEAD, sack, barrel,
} from './kit.js';

// House: a brick townhouse. Brick walls between a stone plinth and a white cornice under a red-tile hipped roof, two
// chimney stacks, two rows of sash windows and a team door under a white pediment.
export function house(ctx) {
  const { b, s: size, td: teamDark } = ctx, width = size - 0.25, depth = size - 0.35, frontZ = depth / 2;
  b.box(width, 1.15, depth, P.brick);
  b.box(width + 0.1, 0.08, depth + 0.1, P.white, 0, 1.15, 0);
  b.box(width + 0.04, 0.1, depth + 0.04, P.white, 0, 0, 0);
  b.add(CONE4, P.tile, 0, 1.23 + 0.32, 0, width * 0.78, 0.64, depth * 0.8, 0, Math.PI / 4, 0);
  // The two end chimney stacks and their white caps.
  for (const side of [-1, 1]) {
    b.box(0.16, 0.6, 0.32, P.brick, side * (width / 2 - 0.12), 1.23, 0);
    b.box(0.2, 0.06, 0.36, P.white, side * (width / 2 - 0.12), 1.83, 0);
  }
  windowGrid(ctx, 3, 2, width, frontZ + 0.01, 0.2, 0.5, P.white, 0x3f5f7a);
  // The door, its pediment and the doorstep.
  b.box(0.24, 0.42, 0.05, teamDark, 0, 0.0, frontZ + 0.04);
  b.roof(0.36, 0.12, 0.06, P.white, 0, 0.44, frontZ + 0.05);
  b.box(0.4, 0.06, 0.2, 0xd9cfb0, 0, 0, frontZ + 0.08);
  return 1.89;
}

// Town Center: a white town hall. Two storeys of sash windows under a red-tile hipped roof, a columned portico over the
// team door, and a clock tower with a copper cupola flying the flag.
export function town_center(ctx) {
  const { b, s: size } = ctx, width = size - 0.3, depth = size * 0.6, z = -0.2, frontZ = z + depth / 2;
  b.box(size + 0.12, 0.12, size + 0.12, 0xd9cfb0);
  b.box(width, 1.35, depth, P.white, 0, 0.12, z);
  b.add(CONE4, P.tile, 0, 1.47 + 0.3, z, width * 0.74, 0.6, depth * 0.78, 0, Math.PI / 4, 0);
  windowGrid(ctx, 6, 2, width, frontZ + 0.01, 0.35, 0.55, P.white, 0x2f4f6a);
  townHallPortico(b, ctx.td, frontZ);
  clockTower(ctx, z);
  return 2.51;
}

// The portico: four columns under a pediment, over the team-coloured door.
function townHallPortico(b, teamDark, frontZ) {
  for (let i = 0; i < 4; i++) b.cyl(0.07, 1.1, P.white, -0.45 + i * 0.3, 0.12, frontZ + 0.3);
  b.box(1.2, 0.12, 0.42, P.white, 0, 1.22, frontZ + 0.2);
  b.roof(1.25, 0.32, 0.44, P.white, 0, 1.34, frontZ + 0.2);
  b.box(0.4, 0.55, 0.05, teamDark, 0, 0.12, frontZ + 0.02);
}

// The clock tower over the hall's middle (z) and its copper cupola: a white clock face with two dark hands.
function clockTower(ctx, z) {
  const { b, mast, extra, t: team } = ctx;
  b.box(0.5, 0.5, 0.5, P.white, 0, 1.75, z);
  b.add(unit.cyl, P.white, 0, 2.05, z + 0.26, 0.16, 0.03, 0.16, Math.PI / 2, 0, 0);
  b.box(0.02, 0.12, 0.02, C.dark, 0, 2.03, z + 0.28);
  b.box(0.09, 0.02, 0.02, C.dark, 0.03, 2.05, z + 0.28);
  b.sph(0.32, 0x5d7f6a, 0, 2.25, z, 1, 0.8, 1);
  // The cupola's thin spire carries the flag (the prototype's thinner, darker pole, flag set a little above its tip).
  mast.cyl(0.02, 0.5, C.dark, 0, 2.45, z);
  extra.flag = new B().box(0.025, 0.28, 0.5, team, 0, 0, 0.25).geometry();
  extra.flagAt = [0, 2.75, z];
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
// An apple.
const GEM = new THREE.OctahedronGeometry(1, 0);

// A point on a wall face centred at (x, z) facing along ry (0: +z): u along the face, o out from it.
const onFace = (x, z, ry) => (u, o = 0) => [x + u * Math.cos(ry) + o * Math.sin(ry), z - u * Math.sin(ry) + o * Math.cos(ry)];
// A rectangle on the ground from x = left to right and z = back to front, with its middle and its size.
const footprint = (left, right, back, front) => ({
  left, right, back, front, midX: (left + right) / 2, midZ: (back + front) / 2, width: right - left, depth: front - back,
});

// ---------- lofted solids: hipped roofs, ramparts, towers, hulls ----------
// Twice the signed area of a ring of [x, z] points: positive when it runs from +x toward +z.
const twiceSignedArea = ring => ring.reduce((sum, [x, z], i) => {
  const [nextX, nextZ] = ring[(i + 1) % ring.length];
  return sum + x * nextZ - nextX * z;
}, 0);
// Adds triangles (a flat list of x, y, z) to b in `color`, dropping slivers (a ridge's collapsed ends).
const addTriangles = (b, positions, color) => {
  const kept = [];
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az, bx, by, bz, cx, cy, cz] = positions.slice(i, i + 9);
    const ux = bx - ax, uy = by - ay, uz = bz - az, vx = cx - ax, vy = cy - ay, vz = cz - az;
    const doubleArea = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    if (doubleArea > 1e-9) kept.push(...positions.slice(i, i + 9));
  }
  if (!kept.length) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  geometry.computeVertexNormals();
  b.add(geometry, color, 0, 0, 0, 1, 1, 1);
  geometry.dispose();
};
// A flat, upward-facing cap over the ring (less its holes) at height y.
const cap = (b, ring, y, color, holes = []) => {
  const points = [...ring, ...holes.flat()], toVector = ([x, z]) => new THREE.Vector2(x, z), positions = [];
  for (const face of THREE.ShapeUtils.triangulateShape(ring.map(toVector), holes.map(hole => hole.map(toVector)))) {
    let [p, q, w] = face.map(i => points[i]);
    // Turn every triangle the same way round, so all of them face up.
    if ((q[1] - p[1]) * (w[0] - p[0]) - (q[0] - p[0]) * (w[1] - p[1]) < 0) [q, w] = [w, q];
    positions.push(p[0], y, p[1], q[0], y, q[1], w[0], y, w[1]);
  }
  addTriangles(b, positions, color);
};
// A solid lofted up through rings of [x, z] points (all the same length) at heights ys, band i coloured
// colors[i % length], its top ring capped in `top` (null: open) unless it has closed to a ridge. Faces point out of the
// solid, or into the rings with `inward` (the inner face of a ring of ramparts).
const loft = (b, rings, ys, colors, { top = colors[(rings.length - 2) % colors.length], inward = false } = {}) => {
  if (twiceSignedArea(rings[0]) < 0 !== inward) rings = rings.map(ring => [...ring].reverse());
  for (let i = 0; i + 1 < rings.length; i++) {
    const lower = rings[i], upper = rings[i + 1], positions = [];
    // Two triangles for each side of the band, from point j to the next point k.
    for (let j = 0; j < lower.length; j++) {
      const k = (j + 1) % lower.length;
      const lowerJ = [lower[j][0], ys[i], lower[j][1]], lowerK = [lower[k][0], ys[i], lower[k][1]];
      const upperJ = [upper[j][0], ys[i + 1], upper[j][1]], upperK = [upper[k][0], ys[i + 1], upper[k][1]];
      positions.push(...lowerJ, ...upperK, ...lowerK, ...lowerJ, ...upperJ, ...upperK);
    }
    addTriangles(b, positions, colors[i % colors.length]);
  }
  const last = rings[rings.length - 1];
  if (top !== null && Math.abs(twiceSignedArea(last)) > 1e-6) cap(b, last, ys[ys.length - 1], top);
};
// A rectangle `width` × `depth` centred at (x, z) as a ring, and a ring of `points` points round a circle.
const rect = (x, z, width, depth) => [
  [x + width / 2, z - depth / 2], [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2], [x - width / 2, z - depth / 2],
];
const circle = (x, z, radius, points, startAngle = 0) => Array.from({ length: points }, (_, i) => [
  x + Math.cos(startAngle + i * 2 * Math.PI / points) * radius, z + Math.sin(startAngle + i * 2 * Math.PI / points) * radius,
]);
// The ring (running from +x toward +z) grown by `distance` along its mitred edge normals; shrunk for distance < 0.
const offsetRing = (ring, distance) => {
  const n = ring.length;
  const normals = ring.map((p, i) => {
    const q = ring[(i + 1) % n], length = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return [(q[1] - p[1]) / length, -(q[0] - p[0]) / length];
  });
  return ring.map((p, i) => {
    const before = normals[(i + n - 1) % n], after = normals[i];
    const mitre = distance / (1 + before[0] * after[0] + before[1] * after[1]);
    return [p[0] + (before[0] + after[0]) * mitre, p[1] + (before[1] + after[1]) * mitre];
  });
};
// The point a fraction f along edge i of the ring, and the points of the ring from (edge i0, f0) forward to
// (edge i1, f1).
const pointAlong = (ring, i, f) => lerp(ring[i % ring.length], ring[(i + 1) % ring.length], f);
const ringPath = (ring, [i0, f0], [i1, f1]) => {
  const points = [pointAlong(ring, i0, f0)];
  for (let i = i0 + 1; i <= i1; i++) points.push(ring[i % ring.length]);
  points.push(pointAlong(ring, i1, f1));
  return points;
};

// ---------- Georgian building parts ----------
// A red-tile hipped roof over `width` × `depth` centred at (x, z), rising `rise` from y in alternate courses, with a
// dark ridge.
const hippedRoof = (b, x, y, z, width, depth, rise, courses = 4) => {
  const inset = Math.min(width, depth) / 2, rings = [], ys = [];
  for (let i = 0; i <= courses; i++) {
    rings.push(rect(x, z, width - 2 * inset * i / courses, depth - 2 * inset * i / courses));
    ys.push(y + rise * i / courses);
  }
  loft(b, rings, ys, [TILE, TILE_L], { top: null });
  if (Math.abs(width - depth) <= 0.02) return;
  const ridgeWidth = width > depth ? width - depth + 0.04 : 0.04, ridgeDepth = width > depth ? 0.04 : depth - width + 0.04;
  b.box(ridgeWidth, 0.03, ridgeDepth, TILE_D, x, y + rise - 0.02, z);
};
// A Georgian block `width` × `depth` centred at (x, z) standing on y: walls `height` tall in `color` over a stone
// plinth and under a white cornice, and (roofRise > 0) a hipped roof roofRise high with `eaves` out. Returns the
// cornice's top.
const block = (b, x, z, width, depth, height, roofRise, { y = 0.03, color = BRICK, eaves = 0.07 } = {}) => {
  const top = y + 0.07 + height;
  b.box(width + 0.03, 0.07, depth + 0.03, STONE_D, x, y, z);
  b.box(width, height, depth, color, x, y + 0.07, z);
  b.box(width + 0.06, 0.05, depth + 0.06, WHITE, x, top - 0.05, z);
  if (roofRise) hippedRoof(b, x, top, z, width + 2 * eaves, depth + 2 * eaves, roofRise);
  return top;
};
// A white sash window `width` × `height` on a wall face (centred on the face at x, z) facing ry, its sill at y: dark
// panes in a white frame with a meeting rail.
const sash = (b, x, y, z, ry = 0, width = 0.13, height = 0.22) => {
  const [paneX, paneZ] = onFace(x, z, ry)(0, 0.006);
  b.box(width, height, 0.02, WHITE, x, y, z, 0, ry);
  b.box(width - 0.035, height - 0.04, 0.02, GLASS, paneX, y + 0.02, paneZ, 0, ry);
  b.box(width - 0.035, 0.016, 0.024, WHITE, paneX, y + height / 2 - 0.008, paneZ, 0, ry);
};
// Rows of `count` sash windows spread across a wall face `wallWidth` wide centred at (x, z) facing ry, a row at each
// sill height in sillYs.
const sashes = (b, x, z, ry, wallWidth, count, sillYs, width, height) => {
  const at = onFace(x, z, ry);
  for (const y of sillYs) for (let i = 0; i < count; i++) {
    const [sashX, sashZ] = at(-wallWidth / 2 + (i + 0.5) * wallWidth / count, 0.01);
    sash(b, sashX, y, sashZ, ry, width, height);
  }
};
// A Georgian front door on a wall face (x, z) facing ry, sill at y: a panelled leaf in `color` in a white doorcase,
// under a fanlight and a small pediment.
const georgianDoor = (b, x, y, z, ry, color, width = 0.18, height = 0.32) => {
  const at = onFace(x, z, ry), [leafX, leafZ] = at(0, 0.01), [pedimentX, pedimentZ] = at(0, 0.03);
  b.box(width + 0.07, height + 0.12, 0.02, WHITE, x, y, z, 0, ry);
  b.box(width, height, 0.02, color, leafX, y, leafZ, 0, ry);
  b.box(width - 0.05, 0.07, 0.02, GLASS, leafX, y + height + 0.02, leafZ, 0, ry);
  b.roof(width + 0.15, 0.09, 0.05, WHITE, pedimentX, y + height + 0.12, pedimentZ, ry);
};
// A round-arched opening `width` wide on a wall face (x, z) facing ry, its sill at y and springing at y + spring: a
// door or void in `color` under a white arch ring and keystone.
const archway = (b, x, y, z, ry, width, spring, color = C.dark, ring = WHITE) => {
  const radius = width / 2, [headX, headZ] = onFace(x, z, ry)(0, 0.012);
  b.box(width, spring, 0.02, color, x, y, z, 0, ry);
  b.add(ARCH, color, headX, y + spring, headZ, radius, radius, 1, 0, ry, 0);
  b.add(ARCH_RING, ring, headX, y + spring, headZ, radius + 0.025, radius + 0.025, 0.15, 0, ry, 0);
  b.box(0.05, 0.07, 0.03, ring, headX, y + spring + radius - 0.01, headZ, 0, ry);
};
// A brick chimney stack `height` tall standing on y, its stone cap and two pots.
const chimney = (b, x, y, z, height = 0.3) => {
  b.box(0.13, height, 0.2, BRICK, x, y, z);
  b.box(0.16, 0.04, 0.23, STONE, x, y + height, z);
  for (const side of [-1, 1]) b.cylT(0.024, 0.03, 0.06, 0x9a4a30, x, y + height + 0.04, z + side * 0.05, 6);
};
// White stone quoins up the corner (x, z) of a wall `height` tall standing on y; outX, outZ (±1) point out of the
// corner. Long and short stones alternate on its two faces.
const quoins = (b, x, z, outX, outZ, y, height) => {
  const count = Math.max(2, Math.round(height / 0.1));
  for (let i = 0; i < count; i++) {
    const stoneY = y + i * height / count + 0.006, alongX = i % 2 ? 0.07 : 0.12, alongZ = i % 2 ? 0.12 : 0.07;
    b.box(alongX, height / count - 0.012, 0.02, WHITE, x - outX * (alongX / 2 - 0.01), stoneY, z + outZ * 0.006);
    b.box(0.02, height / count - 0.012, alongZ, WHITE, x + outX * 0.006, stoneY, z - outZ * (alongZ / 2 - 0.01));
  }
};
// A white column `height` tall standing on y: a square base, a tapering shaft of `radius` and a square capital.
const column = (b, x, y, z, height, radius = 0.04) => {
  b.box(radius * 2.6, 0.04, radius * 2.6, WHITE, x, y, z);
  b.cylT(radius * 0.85, radius, height - 0.08, WHITE, x, y + 0.04, z, 8);
  b.box(radius * 2.7, 0.04, radius * 2.7, WHITE, x, y + height - 0.04, z);
};
// A wooden crate `width` wide standing on y, turned ry, battened dark round its top and foot; band paints a stencilled
// band.
const crate = (b, x, y, z, width = 0.16, ry = 0, band = null) => {
  const height = width * 0.85;
  b.box(width, height, width, CRATE, x, y, z, 0, ry);
  b.box(width + 0.008, 0.02, width + 0.008, CRATE_D, x, y, z, 0, ry);
  b.box(width + 0.008, 0.02, width + 0.008, CRATE_D, x, y + height - 0.02, z, 0, ry);
  if (band !== null) b.box(width + 0.01, height * 0.24, width + 0.01, band, x, y + height * 0.38, z, 0, ry);
};
// A cannon on a team-painted carriage standing on y at (x, z), its muzzle pointing along (dx, dz), scaled `scale`.
const cannon = (b, team, x, y, z, dx, dz, scale = 1) => {
  const length = Math.hypot(dx, dz), nx = dx / length, nz = dz / length, ry = Math.atan2(nx, nz);
  // A point u along the gun's line and o across it, lift (scaled) above y.
  const at = (u, o, lift) => [x + nx * u + nz * o, y + lift * scale, z + nz * u - nx * o];
  b.box(0.1 * scale, 0.07 * scale, 0.26 * scale, team, x, y + 0.04 * scale, z, 0, ry);
  for (const side of [-1, 1]) {
    const [wheelX, wheelY, wheelZ] = at(0.05 * scale, side * 0.068 * scale, 0.055);
    b.add(CYL6, C.woodD, wheelX, wheelY, wheelZ, 0.055 * scale, 0.025 * scale, 0.055 * scale, 0, ry, Math.PI / 2);
  }
  stick(b, 0.032 * scale, GUN, at(-0.13 * scale, 0, 0.13), at(0.22 * scale, 0, 0.14), BORE);
};
// A pyramid of round shot standing on y: three balls and one on top.
const shotPile = (b, x, y, z, radius = 0.03) => {
  for (const [dx, dz, layer] of [[-1, -0.58, 0], [1, -0.58, 0], [0, 1.15, 0], [0, 0, 1]]) {
    b.add(BALL, GUN, x + dx * radius, y + radius + layer * radius * 1.63, z + dz * radius, radius, radius, radius);
  }
};
// A team-striped boat's hull lofted at the origin for place(), its bow to +x: `length` long and `width` wide, keel at
// y = 0, the gunwale at `height`, decked over in planking.
const boat = (team, length, width, height) => {
  const hull = new B();
  const section = (sectionLength, sectionWidth) => [
    [-sectionLength / 2, -sectionWidth * 0.42], [sectionLength * 0.12, -sectionWidth / 2], [sectionLength / 2, 0],
    [sectionLength * 0.12, sectionWidth / 2], [-sectionLength / 2, sectionWidth * 0.42],
  ];
  const sections = [section(length * 0.7, width * 0.3), section(length * 0.93, width * 0.86), section(length, width)];
  loft(hull, sections, [0, height * 0.6, height], [C.woodD, team], { top: C.wood });
  for (const x of [-length * 0.28, length * 0.05]) hull.box(0.03, 0.012, width * 0.8, C.woodD, x, height, 0);
  return hull;
};

// Granary: a brick warehouse with a hoist. Three tall storeys of brick on a stone plinth, with white string courses
// at the floors, white quoins, a white cornice and a red-tile hipped roof flying the flag. Team loading doors stack up
// the front to a white timber lucam, whose hoist beam lowers a sack on its rope; small sash windows run in rows. At the
// door, a handcart of sacks and sacks waiting on a pallet.
export function granary(ctx) {
  const { b, s: size } = ctx, store = footprint(-0.84, 0.2, -0.84, 0.02), floorHeight = 0.4, y = 0.03;
  const { right, back, front, midX, midZ, width, depth } = store;
  b.box(size, y, size, COBBLE);
  const top = block(b, midX, midZ, width, depth, 3 * floorHeight, 0.42, { y }), groundFloor = y + 0.07;
  for (let i = 1; i < 3; i++) b.box(width + 0.02, 0.03, depth + 0.02, WHITE, midX, groundFloor + i * floorHeight - 0.015, midZ);
  quoins(b, right, front, 1, 1, groundFloor, 3 * floorHeight);
  quoins(b, store.left, front, -1, 1, groundFloor, 3 * floorHeight);
  quoins(b, right, back, 1, -1, groundFloor, 3 * floorHeight);
  loadingDoors(ctx, midX, front, groundFloor, floorHeight);
  lucam(ctx, midX, front, groundFloor + 2 * floorHeight - 0.04, top + 0.2);
  // Rows of small sash windows on the front and the +x side.
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    sash(b, midX + side * 0.34, groundFloor + 0.1 + i * floorHeight, front + 0.01, 0, 0.12, 0.2);
  }
  const sillYs = [groundFloor + 0.1, groundFloor + 0.1 + floorHeight, groundFloor + 0.1 + 2 * floorHeight];
  sashes(b, right, midZ, Math.PI / 2, depth, 2, sillYs, 0.12, 0.2);
  flag(ctx, midX - 0.06, top + 0.42 - 0.02, midZ, 0.45);
  granaryYard(b, ctx.t, y);
  return top + 0.42;
}

// The loading doors up the front at x, one a floor, framed in white; the lowest is the cart door, under an iron bar.
function loadingDoors(ctx, x, front, groundFloor, floorHeight) {
  const { b, t: team } = ctx;
  for (const [floor, width, height] of [[0, 0.32, 0.36], [1, 0.26, 0.3]]) {
    const y = groundFloor + floor * floorHeight;
    b.box(width + 0.05, height + 0.04, 0.02, WHITE, x, y, front + 0.005);
    b.box(width, height, 0.02, team, x, y, front + 0.012);
    b.box(0.012, height, 0.024, CRATE_D, x, y, front + 0.014);
  }
  b.box(0.34, 0.025, 0.08, P.iron, x, groundFloor + floorHeight - 0.01, front + 0.04);
}

// The lucam: a white timber housing out from the top floor (its foot at bottom) and up into the roof (its eaves at
// top), the top door in its face, the hoist beam out from under its gable with a pulley, the rope and a sack on its way
// up.
function lucam(ctx, x, front, bottom, top) {
  const { b, t: team } = ctx, faceZ = front + 0.2;
  b.box(0.36, top - bottom, faceZ - front + 0.04, WHITE, x, bottom, (front + faceZ) / 2 - 0.02);
  b.box(0.24, 0.3, 0.02, team, x, bottom + 0.06, faceZ + 0.01);
  b.box(0.012, 0.3, 0.024, CRATE_D, x, bottom + 0.06, faceZ + 0.012);
  b.roof(0.44, 0.2, faceZ - front + 0.12, TILE, x, top, (front + faceZ) / 2);
  b.roof(0.34, 0.15, 0.02, WHITE, x, top, faceZ + 0.07);
  const beamY = top + 0.03, ropeZ = faceZ + 0.32;
  b.box(0.05, 0.05, 0.36, C.woodD, x, beamY, faceZ + 0.14);
  b.add(unit.cyl, C.wood, x, beamY - 0.02, ropeZ - 0.02, 0.035, 0.02, 0.035, 0, 0, Math.PI / 2);
  stick(b, 0.006, ROPE, [x, beamY - 0.05, ropeZ], [x, 0.86, ropeZ], CYL6);
  sack(b, x, 0.68, ropeZ, 0.09);
}

// A team handcart of sacks built at the origin for place(), its handles toward +x: two wheels, the bed and its sides.
function handcart(team) {
  const cart = new B();
  for (const side of [-1, 1]) cart.add(CYL6, C.woodD, 0, 0.1, side * 0.15, 0.1, 0.025, 0.1, Math.PI / 2, 0, 0);
  cart.box(0.36, 0.03, 0.26, team, 0, 0.12, 0);
  cart.box(0.36, 0.07, 0.02, team, 0, 0.15, 0.12);
  cart.box(0.36, 0.07, 0.02, team, 0, 0.15, -0.12);
  for (const side of [-1, 1]) stick(cart, 0.012, C.woodD, [0.16, 0.13, side * 0.1], [0.46, 0.03, side * 0.1], CYL6);
  for (const [dx, dy, dz] of [[-0.09, 0, -0.06], [0.07, 0, 0.05], [-0.06, 0.1, 0.03]]) sack(cart, dx, 0.15 + dy, dz, 0.075);
  return cart;
}

// The granary's yard: the handcart of sacks, a pallet of sacks, barrels.
function granaryYard(b, team, y) {
  place(b, handcart(team), 0.58, y, 0.52, 0.95);
  b.box(0.36, 0.05, 0.3, C.wood, -0.52, y, 0.5);
  for (const [dx, dy, dz] of [[-0.09, 0, -0.07], [0.09, 0, -0.07], [-0.09, 0, 0.07], [0.09, 0, 0.07], [0, 0.14, 0]]) {
    sack(b, -0.52 + dx, y + 0.05 + dy, 0.5 + dz, 0.08);
  }
  barrel(b, -0.12, y, 0.68);
  barrel(b, 0.6, y, -0.6);
  barrel(b, 0.6, y, -0.42, 0.065);
}

// Storage Pit: a dockside warehouse with a crane. A low brick warehouse with tall arched team doors under a team fascia
// stands at the back of a stone quay; at the quay's edge, over the water, a timber post crane with its winch swings a
// crate up out of a team-striped lighter moored to the bollards. On the quay, the goods brought in: casks, crates with
// team bands, a stack of planks, dressed stone and a strongbox of gold.
export function storage_pit(ctx) {
  const { b, t: team } = ctx, quayEdge = 0.44, quayY = 0.14;
  quay(ctx, quayEdge, quayY);
  const top = dockWarehouse(ctx, quayY);
  const jibY = dockCrane(ctx, quayY);
  // The lighter, moored to the bollards, with casks aboard.
  place(b, boat(team, 0.86, 0.3, 0.14), 0.3, 0.0, 0.69, 0);
  barrel(b, 0.06, 0.14, 0.66, 0.06, 0.13);
  barrel(b, 0.2, 0.14, 0.72, 0.06, 0.13);
  stick(b, 0.006, ROPE, [-0.72, quayY + 0.07, quayEdge - 0.06], [-0.1, 0.13, 0.62], CYL6);
  quayGoods(b, team, quayY);
  return Math.max(top + 0.32, jibY + 0.1);
}

// The quay out to z = edge: its stone face down to the water along the front, the paving, the coping and three
// bollards; the water beyond it.
function quay(ctx, edge, y) {
  const { b, s: size, h: half } = ctx, midZ = (edge - half) / 2;
  b.box(size, y - 0.01, half + edge, STONE_D, 0, 0, midZ);
  b.box(size, 0.01, half + edge - 0.06, 0x9c968a, 0, y - 0.01, midZ - 0.03);
  b.box(size, 0.035, 0.07, STONE, 0, y - 0.01, edge - 0.035);
  b.box(size, 0.05, half - edge, WATER, 0, 0, (edge + half) / 2);
  for (const x of [-0.72, -0.12, 0.42]) {
    b.add(CYL6, GUN, x, y + 0.05, edge - 0.08, 0.035, 0.1, 0.035);
    b.add(BALL, GUN, x, y + 0.1, edge - 0.08, 0.042, 0.03, 0.042);
  }
}

// The warehouse on the quay: tall arched doors (one open), a team fascia over them, a side door and windows, the flag.
// Returns its cornice's top.
function dockWarehouse(ctx, quayY) {
  const { b, t: team } = ctx, x = -0.13, z = -0.58, width = 1.48, depth = 0.56, front = z + depth / 2, right = x + width / 2;
  const top = block(b, x, z, width, depth, 0.7, 0.32, { y: quayY }), sill = quayY + 0.07;
  archway(b, -0.5, sill, front + 0.011, 0, 0.36, 0.3, team);
  b.box(0.012, 0.3, 0.024, CRATE_D, -0.5, sill, front + 0.024);
  archway(b, 0.2, sill, front + 0.011, 0, 0.36, 0.3);
  b.box(0.17, 0.3, 0.02, team, 0.2 + 0.19, sill, front + 0.08, 0, -1.1);
  b.box(0.98, 0.12, 0.02, WHITE, -0.15, top - 0.2, front + 0.01);
  b.box(0.92, 0.08, 0.02, team, -0.15, top - 0.18, front + 0.018);
  georgianDoor(b, right + 0.011, sill, z, Math.PI / 2, CRATE_D, 0.16, 0.3);
  for (const sashX of [-0.82, 0.48]) sash(b, sashX, quayY + 0.32, front + 0.01, 0, 0.13, 0.22);
  flag(ctx, x - 0.4, top + 0.32 - 0.02, z, 0.45);
  return top;
}

// The crane: its post on a stone step, the winch with crank handles, the braced jib out over the water and the rope
// to a crate on the hook. Returns the jib's height.
function dockCrane(ctx, quayY) {
  const { b, t: team } = ctx, x = 0.62, z = 0.22, jibY = 1.06, tip = [x, jibY + 0.06, 0.8], winchZ = z - 0.14;
  b.box(0.2, 0.05, 0.2, STONE, x, quayY, z);
  b.box(0.08, jibY - quayY - 0.01, 0.08, C.woodD, x, quayY + 0.05, z);
  b.box(0.11, 0.04, 0.11, P.iron, x, jibY - 0.08, z);
  stick(b, 0.03, C.wood, [x, jibY, z - 0.06], tip, unit.box);
  stick(b, 0.022, C.woodD, [x, 0.62, z + 0.04], lerp([x, jibY, z - 0.06], tip, 0.55), unit.box);
  // The winch: two cheeks, the drum and the crank handles.
  for (const side of [-1, 1]) b.box(0.025, 0.2, 0.12, C.woodD, x + side * 0.1, quayY + 0.05, winchZ);
  b.add(CYL8, C.wood, x, quayY + 0.2, winchZ, 0.045, 0.2, 0.045, 0, 0, Math.PI / 2);
  for (const side of [-1, 1]) {
    b.box(0.012, 0.09, 0.012, P.iron, x + side * 0.12, quayY + 0.17, z - 0.2);
    b.box(0.012, 0.012, 0.06, P.iron, x + side * 0.12, quayY + 0.13, z - 0.23);
  }
  craneRope(b, team, [x, quayY + 0.24, winchZ], [x, jibY + 0.02, z - 0.05], tip);
  return jibY;
}

// The crane's rope from the winch drum up the post and out along the jib, down to the hook, its two slings and the
// team-banded crate they lift.
function craneRope(b, team, drum, postTop, [tipX, tipY, tipZ]) {
  const sheave = [tipX, tipY - 0.04, tipZ];
  stick(b, 0.006, ROPE, drum, postTop, CYL6);
  stick(b, 0.006, ROPE, postTop, sheave, CYL6);
  stick(b, 0.006, ROPE, sheave, [tipX, 0.48, tipZ], CYL6);
  b.box(0.04, 0.03, 0.04, P.iron, tipX, 0.46, tipZ);
  for (const side of [-1, 1]) stick(b, 0.004, ROPE, [tipX, 0.47, tipZ], [tipX + side * 0.07, 0.38, tipZ], CYL6);
  crate(b, tipX, 0.24, tipZ, 0.15, 0.3, team);
}

// The goods on the quay: casks, crates, planks, dressed stone and the gold.
function quayGoods(b, team, y) {
  for (const [x, z] of [[-0.78, -0.08], [-0.64, -0.12], [-0.71, 0.04], [-0.82, 0.12]]) barrel(b, x, y, z);
  const crates = [[-0.38, 0.0, 0.17, 0.1, team], [-0.2, -0.04, 0.15, -0.2, null], [-0.3, 0.17, 0.15, 0.3, null]];
  for (const [x, z, width, ry, band] of crates) crate(b, x, y, z, width, ry, band);
  crate(b, -0.33, y + 0.145, 0.02, 0.14, -0.15, team);
  // The stack of planks: three layers, the top one a plank short and set in between.
  for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 3 - (layer === 2); i++) {
    const plankZ = -0.12 + i * 0.08 + (layer === 2) * 0.04;
    b.box(0.6, 0.035, 0.075, (i + layer) % 2 ? C.wood : 0x8a6238, 0.16, y + layer * 0.036, plankZ);
  }
  for (const [x, z, ry] of [[0.06, 0.24, 0.2], [0.26, 0.3, -0.3]]) b.box(0.18, 0.12, 0.13, STONE, x, y, z, 0, ry);
  b.box(0.17, 0.11, 0.13, STONE_D, 0.14, y + 0.12, 0.27, 0, 0.1);
  strongbox(b, -0.02, y, 0.38);
}

// A strongbox standing on y at (x, z): an iron-bound chest with gold coins on its lid.
function strongbox(b, x, y, z) {
  b.box(0.22, 0.12, 0.14, C.woodD, x, y, z);
  b.box(0.23, 0.025, 0.15, P.iron, x, y + 0.12, z);
  b.box(0.025, 0.13, 0.15, P.iron, x - 0.07, y, z);
  b.box(0.025, 0.13, 0.15, P.iron, x + 0.07, y, z);
  for (const [dx, dz] of [[-0.04, -0.02], [0.03, 0.02], [0.0, -0.035], [0.05, -0.03]]) {
    b.cylT(0.026, 0.026, 0.02, C.gold, x + dx, y + 0.145, z + dz, 6);
  }
}

// Farm: orchard rows. Three rows of apple trees (extra.crops, which animate() shows once the farm is finished and
// shrinks as the food runs out) stand in mown grass alleys, each tree in its own dug circle, hung with red and
// green apples. A white picket fence with a team gate closes the front and the right; baskets of picked apples, team
// crates and a three-legged orchard ladder stand about, with the flag on a post.
export function farm(ctx) {
  const { b, s: size, h: half, t: team, extra } = ctx, rows = [-0.6, -0.1, 0.4], places = [-0.62, -0.12, 0.38], y = 0.03;
  b.box(size, y, size, GRASS);
  for (const x of rows) b.box(0.3, 0.006, 1.52, GRASS_L, x, y, -0.12);
  for (const x of rows) for (const z of places) b.add(CYL8, SOIL, x, y + 0.004, z, 0.12, 0.008, 0.12);
  orchardFence(ctx, y);
  // Baskets of apples, crates, the ladder, the flag.
  for (const [x, z] of [[0.15, 0.6], [0.66, 0.12], [0.62, -0.02]]) appleBasket(b, x, y, z);
  crate(b, -0.36, y, 0.64, 0.15, 0.2, team);
  crate(b, -0.2, y, 0.68, 0.14, -0.3);
  crate(b, -0.3, y + 0.13, 0.66, 0.13, 0.5, team);
  orchardLadder(b, y);
  flag(ctx, -half + 0.1, y, half - 0.1, 0.75, WHITE, [0.2, 0.34]);
  // The apple trees, three rows of three.
  const crops = new B();
  for (const [i, x] of rows.entries()) for (const [j, z] of places.entries()) appleTree(crops, i, j, x, y, z);
  extra.crops = crops.geometry();
  return 0.72;
}

// A row of white pickets along the fence line, along x (leaving the gateway open) or along z.
function picketRow(b, half, y, fenceLine, gate, alongX) {
  for (let u = -half + 0.07; u < half - 0.04; u += 0.075) {
    if (alongX && u > gate[0] && u < gate[1]) continue;
    const [x, z] = alongX ? [u, fenceLine] : [fenceLine, u];
    b.box(0.024, 0.2, 0.016, WHITE, x, y, z);
    b.add(CONE4, WHITE, x, y + 0.215, z, 0.018, 0.03, 0.012, 0, Math.PI / 4, 0);
  }
}

// The picket fence along the front and the right: pickets, two rails, posts with ball finials and the gate's two team
// leaves, swung half open, each with a white brace.
function orchardFence(ctx, y) {
  const { b, h: half, t: team } = ctx, fenceLine = half - 0.05, gate = [0.03, 0.27];
  picketRow(b, half, y, fenceLine, gate, true);
  picketRow(b, half, y, fenceLine, gate, false);
  for (const railY of [0.07, 0.15]) {
    for (const [x0, x1] of [[-half + 0.04, gate[0]], [gate[1], half - 0.03]]) {
      b.box(x1 - x0, 0.02, 0.012, WHITE, (x0 + x1) / 2, y + railY, fenceLine - 0.012);
    }
    b.box(0.012, 0.02, 2 * half - 0.07, WHITE, fenceLine - 0.012, y + railY, -0.035);
  }
  for (const [x, z] of [[gate[0] - 0.02, fenceLine], [gate[1] + 0.02, fenceLine], [fenceLine, fenceLine]]) {
    b.box(0.045, 0.27, 0.045, WHITE, x, y, z);
    b.add(BALL, WHITE, x, y + 0.3, z, 0.03, 0.03, 0.03);
  }
  for (const side of [-1, 1]) {
    const hingeX = side < 0 ? gate[0] : gate[1], ry = side * 0.6, leafWidth = (gate[1] - gate[0]) / 2;
    const leafX = hingeX - side * Math.cos(ry) * leafWidth / 2, leafZ = fenceLine + Math.sin(ry) * leafWidth / 2 * side;
    b.box(leafWidth, 0.17, 0.02, team, leafX, y + 0.03, leafZ, 0, ry);
    b.box(leafWidth * 1.1, 0.018, 0.024, WHITE, leafX, y + 0.11, leafZ, 0, ry, -side * 0.6);
  }
}

// A wicker basket of picked apples, red and green.
function appleBasket(b, x, y, z) {
  b.cylT(0.07, 0.055, 0.09, WICKER, x, y, z, 8);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3, spread = i ? 0.035 : 0;
    const appleX = x + Math.cos(a) * spread, appleZ = z + Math.sin(a) * spread;
    b.add(BALL, i % 3 ? APPLE : APPLE_G, appleX, y + (i ? 0.1 : 0.12), appleZ, 0.028, 0.028, 0.028);
  }
}

// A three-legged orchard ladder: two rails from its foot to its top, rungs narrowing up it and the prop leg behind.
function orchardLadder(b, y) {
  const foot = [0.62, y, 0.6], top = [0.5, 0.66, 0.46];
  for (const side of [-1, 1]) {
    const railFoot = [foot[0] + side * 0.07, y, foot[2] - side * 0.05];
    const railTop = [top[0] + side * 0.025, top[1], top[2] - side * 0.018];
    stick(b, 0.01, C.wood, railFoot, railTop, CYL6);
  }
  for (let i = 1; i < 6; i++) {
    const f = i / 6, rung = lerp(foot, top, f), halfWidth = 0.07 * (1 - f) + 0.025 * f;
    const rungLeft = [rung[0] - halfWidth, rung[1], rung[2] + halfWidth * 0.7];
    stick(b, 0.007, C.wood, rungLeft, [rung[0] + halfWidth, rung[1], rung[2] - halfWidth * 0.7], CYL6);
  }
  stick(b, 0.01, C.wood, [top[0] - 0.28, y, top[2] - 0.12], top, CYL6);
}

// The apple tree in row i, place j at (x, z), into the crops: its trunk, two rounded crowns and eight apples on the
// sides the camera sees, each tree a little bigger or smaller and one in three of them less ripe.
function appleTree(crops, i, j, x, y, z) {
  const scale = 0.88 + hash(i, j) * 0.24, trunkTop = 0.2 * scale, ripe = (i + 2 * j) % 3 !== 1, crownY = trunkTop + 0.15 * scale;
  crops.cylT(0.026, 0.04, trunkTop + 0.06, BARK, x, y, z, 6);
  crops.foliage(0.19 * scale, LEAF, x, trunkTop, z, 1, 0.82, 1, hash(j, i) * 3);
  crops.foliage(0.11 * scale, LEAF_L, x + 0.08, trunkTop + 0.12 * scale, z + 0.07, 1, 0.8, 1, i);
  for (let m = 0; m < 8; m++) {
    const a = -0.9 + m * 0.42 + hash(m, i + j) * 0.3, elevation = (hash(m + 4, j) - 0.35) * 1.1, radius = 0.18 * scale;
    const appleX = x + Math.cos(a) * Math.cos(elevation) * radius, appleZ = z + Math.sin(a) * Math.cos(elevation) * radius;
    const appleY = crownY + Math.sin(elevation) * radius * 0.8;
    crops.add(GEM, ripe || m % 3 ? APPLE : APPLE_G, appleX, appleY, appleZ, 0.026, 0.026, 0.026);
  }
}

// Barracks: a brick barracks with a parade flag. A long two-storey barrack block of brick across the back, rows of
// white sash windows and four chimney stacks on its hipped roof, its stone centre pavilion with a team tympanum over the
// door. Before it the gravel parade ground: the tall parade flagstaff on its stone base between two field guns, piled
// arms and a team drum; a low brick wall with white coping and ball-topped piers closes the front and the right, with
// team sentry boxes at the gateway.
export function barracks(ctx) {
  const { b, s: size, t: team } = ctx, y = 0.03, barrack = footprint(-1.32, 1.32, -1.32, -0.64), floorY = y + 0.07;
  const { right, front, midZ, width, depth } = barrack;
  b.box(size, y, size, GRAVEL);
  const top = block(b, 0, midZ, width, depth, 0.86, 0.42, { y });
  b.box(width + 0.02, 0.03, depth + 0.02, WHITE, 0, floorY + 0.43, midZ);
  for (const x of [-0.9, -0.3, 0.3, 0.9]) chimney(b, x, top + 0.24, midZ, 0.36);
  centrePavilion(ctx, y, floorY, top, front);
  for (const side of [-1, 1]) sashes(b, side * 0.84, front, 0, 0.96, 3, [floorY + 0.12, floorY + 0.55], 0.14, 0.24);
  sashes(b, right, midZ, Math.PI / 2, depth, 2, [floorY + 0.12, floorY + 0.55], 0.14, 0.24);
  paradeFlagstaff(ctx, 0.0, y, 0.36);
  for (const x of [-1.0, -0.8, 0.8, 1.0]) piledArms(b, x, y, -0.18);
  drum(b, team, -0.38, y, 0.02);
  paradeWall(ctx, y, front);
  return top + 0.7;
}

// The centre pavilion: brought forward in stone, its pediment and team tympanum, the door between two columns.
function centrePavilion(ctx, y, floorY, top, blockFront) {
  const { b, t: team } = ctx, width = 0.74, front = blockFront + 0.1, midZ = (blockFront + front) / 2;
  b.box(width, top - y, front - blockFront + 0.02, STONE, 0, y, midZ - 0.01);
  b.box(width + 0.06, 0.05, front - blockFront + 0.08, WHITE, 0, top - 0.05, midZ);
  b.roof(width + 0.1, 0.28, 0.14, STONE, 0, top, front - 0.05);
  b.roof(width - 0.12, 0.19, 0.02, team, 0, top + 0.03, front + 0.03);
  georgianDoor(b, 0, floorY, front + 0.011, 0, ctx.td, 0.22, 0.36);
  for (const side of [-1, 1]) column(b, side * 0.19, floorY, front + 0.06, 0.48, 0.032);
  sash(b, 0, floorY + 0.58, front + 0.011, 0, 0.15, 0.22);
}

// The parade flagstaff at (x, z) on its stepped base, flanked by field guns and piles of shot.
function paradeFlagstaff(ctx, x, y, z) {
  const { b, t: team } = ctx;
  b.box(0.32, 0.06, 0.32, STONE_D, x, y, z);
  b.box(0.22, 0.06, 0.22, STONE, x, y + 0.06, z);
  b.cylT(0.05, 0.06, 0.08, WHITE, x, y + 0.12, z, 8);
  flag(ctx, x, y + 0.18, z, 1.72, WHITE, [0.4, 0.68]);
  for (const side of [-1, 1]) cannon(b, team, x + side * 0.48, y, z + 0.05, 0, 1);
  for (const side of [-1, 1]) shotPile(b, x + side * 0.74, y, z + 0.12);
}

// Piled arms at (x, z): three muskets stood together, butts out and bayonets up past their crossing.
function piledArms(b, x, y, z) {
  const apex = [x, y + 0.4, z];
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.3, foot = [x + Math.cos(a) * 0.075, y, z + Math.sin(a) * 0.075];
    stick(b, 0.008, C.woodD, foot, lerp(foot, apex, 1.1), CYL6);
    stick(b, 0.004, P.steel, lerp(foot, apex, 1.1), lerp(foot, apex, 1.32), CYL6);
  }
}

// A team drum at (x, z): its shell, white hoops, the head and two drumsticks laid on it.
function drum(b, team, x, y, z) {
  b.cylT(0.08, 0.08, 0.12, team, x, y, z, 10);
  b.cylT(0.085, 0.085, 0.02, WHITE, x, y, z, 10);
  b.cylT(0.085, 0.085, 0.02, WHITE, x, y + 0.1, z, 10);
  b.cylT(0.075, 0.075, 0.005, 0xe6dcc0, x, y + 0.12, z, 10);
  for (const side of [-1, 1]) {
    stick(b, 0.006, C.wood, [x + side * 0.03, y + 0.125, z], [x + side * 0.1, y + 0.16, z + 0.08], CYL6);
  }
}

// A low brick wall `height` tall from [x, z] point p to q, with white coping.
function brickWall(b, y, height, p, q) {
  const length = Math.hypot(q[0] - p[0], q[1] - p[1]), ry = Math.atan2(-(q[1] - p[1]), q[0] - p[0]), middle = lerp(p, q, 0.5);
  b.box(length, height, 0.08, BRICK, middle[0], y, middle[1], 0, ry);
  b.box(length + 0.02, 0.03, 0.11, WHITE, middle[0], y + height, middle[1], 0, ry);
}

// A brick pier `height` tall at (x, z), its white cap and a stone ball finial.
function pier(b, y, x, z, height = 0.3) {
  b.box(0.12, height, 0.12, BRICK, x, y, z);
  b.box(0.14, 0.03, 0.14, WHITE, x, y + height, z);
  b.add(BALL, STONE, x, y + height + 0.07, z, 0.05, 0.05, 0.05);
}

// The wall: brick with white coping along the front and the right, piers with ball finials, the gateway's sentry boxes.
function paradeWall(ctx, y, blockFront) {
  const { b, h: half, t: team } = ctx, edge = half - 0.06, height = 0.2, gateHalf = 0.32;
  brickWall(b, y, height, [-half + 0.02, edge], [-gateHalf, edge]);
  brickWall(b, y, height, [gateHalf, edge], [edge, edge]);
  brickWall(b, y, height, [edge, edge], [edge, blockFront + 0.05]);
  for (const x of [-1.0, -0.6, 0.6, 1.0]) pier(b, y, x, edge, 0.26);
  for (const z of [-0.3, 0.2, 0.7]) pier(b, y, edge, z, 0.26);
  pier(b, y, edge, edge, 0.26);
  for (const side of [-1, 1]) {
    pier(b, y, side * gateHalf, edge, 0.4);
    sentryBox(b, team, side * (gateHalf + 0.2), y, edge - 0.2);
  }
}

// A team sentry box at (x, z), open to the front, under a white roof and banded in white.
function sentryBox(b, team, x, y, z) {
  b.box(0.17, 0.4, 0.15, team, x, y, z);
  b.box(0.12, 0.3, 0.02, C.dark, x, y + 0.02, z + 0.076);
  b.roof(0.2, 0.1, 0.18, WHITE, x, y + 0.4, z);
  for (let i = 0; i < 3; i++) b.box(0.175, 0.025, 0.155, WHITE, x, y + 0.08 + i * 0.12, z);
}

// A stone arcade for place(), facing ±z, built at the origin standing on y = 0: a wall `length` long, `height` high and
// `depth` deep, pierced by `bays` round arches springing at `spring` (the arch radius fills each bay between piers
// pierWidth wide). Returns its geometry, the arches' radius and their centres along x.
const arcadeFace = (length, height, depth, bays, spring, pierWidth) => {
  const wall = new THREE.Shape(), bayWidth = (length - pierWidth) / bays, radius = (bayWidth - pierWidth) / 2;
  wall.moveTo(-length / 2, -0.02);
  wall.lineTo(length / 2, -0.02);
  wall.lineTo(length / 2, height);
  wall.lineTo(-length / 2, height);
  wall.closePath();
  for (let i = 0; i < bays; i++) {
    const archX = -length / 2 + pierWidth / 2 + (i + 0.5) * bayWidth, hole = new THREE.Path();
    hole.moveTo(archX - radius, 0);
    hole.lineTo(archX + radius, 0);
    hole.lineTo(archX + radius, spring);
    hole.absarc(archX, spring, radius, 0, Math.PI, false);
    hole.lineTo(archX - radius, 0);
    wall.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(wall, { depth, bevelEnabled: false, curveSegments: 6 });
  geometry.translate(0, 0, -depth / 2);
  return { geometry, radius, archXs: Array.from({ length: bays }, (_, i) => -length / 2 + pierWidth / 2 + (i + 0.5) * bayWidth) };
};

// Archery Range: a stone shooting gallery. At the front a long loggia of pale Portland stone opens in round arches onto
// three mown lanes; it carries a white entablature and a balustrade round its flat lead roof, the flag over it, with
// musket racks and powder kegs inside and a team pennant on each lane's firing rest. Down the lanes, between low stone
// kerbs and distance posts, a stone butt wall with pilasters and ball finials holds the targets, painted in team and
// white rings round a gold heart, in round-headed niches.
export function archery_range(ctx) {
  const { b, s: size, h: half, t: team } = ctx, y = 0.03, lanes = [-0.84, 0, 0.84], floorY = y + 0.05;
  b.box(size, y, size, GRASS);
  for (const x of lanes) b.box(0.6, 0.006, 2.0, GRASS_L, x, y, -0.32);
  for (const x of [-0.42, 0.42]) b.box(0.05, 0.05, 2.0, STONE_D, x, y, -0.32);
  // Distance posts down each lane.
  for (const x of lanes) for (const z of [-0.65, 0.05]) {
    b.box(0.04, 0.14, 0.04, WHITE, x + 0.26, y, z);
    b.box(0.05, 0.02, 0.05, C.dark, x + 0.26, y + 0.14, z);
  }
  buttWall(b, team, y, -half + 0.14, lanes);
  const front = 0.8, back = 1.3, loggiaZ = (front + back) / 2;
  const entablatureY = loggia(ctx, y, floorY, front, back, loggiaZ);
  loggiaFittings(b, team, y, floorY, lanes, front, back, loggiaZ);
  return entablatureY + 0.36;
}

// Inside the loggia: a musket rack along the back, powder kegs; at the firing line, rests with team pennants.
function loggiaFittings(b, team, y, floorY, lanes, front, back, loggiaZ) {
  b.box(1.6, 0.04, 0.05, C.woodD, -0.3, floorY + 0.32, back - 0.14);
  b.box(1.6, 0.04, 0.05, C.woodD, -0.3, floorY + 0.08, back - 0.11);
  for (let i = 0; i < 9; i++) {
    stick(b, 0.008, C.woodD, [-1.04 + i * 0.18, floorY + 0.02, back - 0.1], [-1.05 + i * 0.18, floorY + 0.44, back - 0.15], CYL6);
  }
  for (const [x, z] of [[0.75, loggiaZ], [0.88, loggiaZ + 0.04], [0.81, loggiaZ - 0.08]]) barrel(b, x, floorY, z, 0.055, 0.12);
  for (const x of lanes) firingRest(b, team, x, y, front - 0.1);
}

// The butt wall at z: pilasters, coping and finials; a target in a round-headed niche at each lane's end.
function buttWall(b, team, y, z, lanes) {
  const height = 0.76;
  b.box(2.72, height, 0.24, STONE, 0, y, z);
  b.box(2.76, 0.05, 0.28, WHITE, 0, y + height, z);
  for (const x of [-1.29, -0.42, 0.42, 1.29]) {
    b.box(0.13, height, 0.05, STONE_D, x, y, z + 0.13);
    b.box(0.11, 0.06, 0.11, STONE_D, x, y + height + 0.05, z);
    b.add(BALL, STONE, x, y + height + 0.17, z, 0.065, 0.065, 0.065);
  }
  for (const x of lanes) nicheTarget(b, team, x, y, z + 0.121);
}

// A target in a round-headed niche on the wall face at z: the dark niche and its white arch and sill, the rings round
// the gold heart, the stand under it.
function nicheTarget(b, team, x, y, z) {
  const targetY = y + 0.38;
  b.box(0.46, 0.34, 0.02, 0x4d4a44, x, y + 0.06, z);
  b.add(ARCH, 0x4d4a44, x, y + 0.4, z, 0.23, 0.23, 1);
  b.add(ARCH_RING, WHITE, x, y + 0.4, z + 0.004, 0.25, 0.25, 0.15);
  b.box(0.5, 0.04, 0.05, WHITE, x, y + 0.04, z + 0.01);
  const rings = [
    [C.woodD, 0.19, 0.0], [WHITE, 0.17, 0.008], [team, 0.135, 0.012],
    [WHITE, 0.095, 0.016], [team, 0.058, 0.02], [C.gold, 0.026, 0.024],
  ];
  for (const [color, radius, dz] of rings) b.add(DISC, color, x, targetY, z + 0.02 + dz, radius, 0.01, radius, Math.PI / 2, 0, 0);
  b.box(0.03, 0.2, 0.03, C.woodD, x, y + 0.06, z + 0.04);
}

// The loggia from z = front to back: two arcades and their end walls, the entablature, the lead roof and its
// balustrade, the flag. Returns the entablature's foot.
function loggia(ctx, y, floorY, front, back, midZ) {
  const { b } = ctx, length = 2.62, height = 0.6;
  const { geometry: face, radius, archXs } = arcadeFace(length, height, 0.1, 5, 0.36, 0.13);
  b.box(length + 0.06, 0.05, back - front + 0.08, PAVE, 0, y, midZ);
  for (const z of [front + 0.05, back - 0.05]) {
    b.add(face, STONE, 0, floorY, z, 1, 1, 1);
    // A white arch ring and keystone on the outer face of each arch.
    for (const x of archXs) {
      const ringZ = z + (z > midZ ? 0.052 : -0.052);
      b.add(ARCH_RING, WHITE, x, floorY + 0.36, ringZ, radius + 0.02, radius + 0.02, 0.15, 0, z > midZ ? 0 : Math.PI, 0);
      b.box(0.05, 0.07, 0.025, WHITE, x, floorY + 0.36 + radius - 0.02, ringZ);
    }
  }
  face.dispose();
  for (const side of [-1, 1]) b.box(0.1, height, back - front, STONE, side * (length / 2 - 0.05), floorY, midZ);
  const entablatureY = floorY + height;
  b.box(length + 0.06, 0.08, back - front + 0.06, WHITE, 0, entablatureY, midZ);
  b.box(length - 0.1, 0.03, back - front - 0.1, LEAD, 0, entablatureY + 0.08, midZ);
  balustrade(b, length, entablatureY, front, back, midZ);
  flag(ctx, 0, entablatureY + 0.11, midZ, 0.55);
  return entablatureY;
}

// The balustrade round the loggia's roof: balusters and a rail along the front, back and both ends, and a pier with
// a ball finial at each front corner.
function balustrade(b, length, y, front, back, midZ) {
  for (const z of [front, back]) {
    for (let x = -length / 2 + 0.08; x < length / 2 - 0.04; x += 0.11) b.box(0.03, 0.09, 0.03, WHITE, x, y + 0.08, z);
    b.box(length + 0.04, 0.03, 0.06, WHITE, 0, y + 0.17, z);
  }
  for (const side of [-1, 1]) {
    for (let z = front + 0.1; z < back - 0.05; z += 0.11) b.box(0.03, 0.09, 0.03, WHITE, side * length / 2, y + 0.08, z);
    b.box(0.06, 0.03, back - front + 0.04, WHITE, side * length / 2, y + 0.17, midZ);
    b.box(0.1, 0.06, 0.1, WHITE, side * length / 2, y + 0.2, front);
    b.add(BALL, STONE, side * length / 2, y + 0.31, front, 0.05, 0.05, 0.05);
  }
}

// The lane at x's firing rest at z, and its team pennant on a pole.
function firingRest(b, team, x, y, z) {
  const restX = x - 0.12;
  b.box(0.04, 0.26, 0.04, C.woodD, restX, y, z);
  b.box(0.16, 0.03, 0.05, C.woodD, restX, y + 0.26, z);
  b.box(0.015, 0.36, 0.015, C.woodD, x + 0.2, y, z);
  b.box(0.012, 0.08, 0.13, team, x + 0.2, y + 0.27, z + 0.07);
}

// The coach's wheels, big at the rear and small in front: each a rim, an iron hub and three spokes across it.
const coachWheels = body => {
  for (const [wheelX, radius] of [[-0.19, 0.13], [0.17, 0.09]]) for (const side of [-1, 1]) {
    body.add(CYL8, C.woodD, wheelX, radius, side * 0.16, radius, 0.024, radius, Math.PI / 2, 0, 0);
    body.add(CYL6, P.iron, wheelX, radius, side * 0.176, 0.024, 0.03, 0.024, Math.PI / 2, 0, 0);
    for (let i = 0; i < 3; i++) {
      body.add(unit.box, C.wood, wheelX, radius, side * 0.16, radius * 1.9, 0.012, 0.012, 0, 0, i * Math.PI / 3);
    }
  }
};
// A coach facing +x, built at the origin for place(): a dark painted body with team door panels and glazed upper
// panels, big rear and small front wheels, the coachman's box, a trunk on the roof and the pole forward to the pair.
const coach = team => {
  const body = new B();
  coachWheels(body);
  // The perch and the two axles.
  body.box(0.62, 0.03, 0.05, C.woodD, 0, 0.12, 0);
  body.box(0.03, 0.03, 0.34, C.woodD, -0.19, 0.12, 0);
  body.box(0.03, 0.03, 0.34, C.woodD, 0.17, 0.09, 0);
  // The body: lower and upper panels and the roof, the team door with its gold rail, the windows, the trunk.
  body.box(0.38, 0.15, 0.27, PAINT, -0.03, 0.2, 0);
  body.box(0.34, 0.14, 0.25, PAINT, -0.03, 0.35, 0);
  body.box(0.4, 0.03, 0.29, PAINT, -0.03, 0.49, 0);
  body.box(0.15, 0.13, 0.28, team, -0.03, 0.21, 0);
  body.box(0.012, 0.012, 0.285, C.gold, -0.03, 0.33, 0);
  for (const dx of [-0.12, 0.06]) body.box(0.1, 0.08, 0.255, GLASS, -0.03 + dx, 0.38, 0);
  body.box(0.2, 0.07, 0.2, C.leather, -0.06, 0.52, 0);
  // The coachman's box, its team cushion and footboard; the pole.
  body.box(0.1, 0.16, 0.24, PAINT, 0.23, 0.2, 0);
  body.box(0.12, 0.03, 0.26, team, 0.23, 0.36, 0);
  body.box(0.04, 0.1, 0.24, PAINT, 0.31, 0.12, 0);
  stick(body, 0.012, C.woodD, [0.27, 0.14, 0], [0.82, 0.32, 0], CYL6);
  return body;
};

// Stable: a brick coach house. A long brick coach house with three tall round-arched carriage doors in team colour (the
// middle one open), oculi to the loft above, a stone pediment with a team tympanum over the centre and a white lantern
// with a weathervane on its hipped roof. In the cobbled yard a team-panelled coach with its pair of horses in team
// saddle cloths, a pump and trough and a mounting block; a horse looks out of the stable door in the +x end.
export function stable(ctx) {
  const { b, s: size, t: team } = ctx, y = 0.03, house = footprint(-1.32, 0.96, -1.32, -0.6), floorY = y + 0.07;
  const { front, midX, midZ, width, depth } = house;
  b.box(size, y, size, COBBLE);
  const top = block(b, midX, midZ, width, depth, 0.92, 0.38, { y }), ridge = top + 0.38;
  b.box(width + 0.02, 0.03, depth + 0.02, WHITE, midX, floorY + 0.66, midZ);
  carriageDoors(b, team, midX, front, floorY);
  b.roof(0.9, 0.26, 0.12, STONE, midX, top, front + 0.02);
  b.roof(0.7, 0.18, 0.02, team, midX, top + 0.03, front + 0.085);
  stableEnd(b, team, house.right, midZ, floorY);
  ridgeLantern(ctx, midX, ridge - 0.05, midZ);
  flag(ctx, midX + 0.72, ridge - 0.02, midZ, 0.42);
  // The coach and its pair; the pump and trough, the mounting block.
  const coachX = -0.42, coachZ = 0.36;
  place(b, coach(team), coachX, y, coachZ, 0);
  for (const side of [-1, 1]) place(b, horse(team), coachX + 0.98, y, coachZ + side * 0.12, 0);
  pumpAndTrough(b, 1.12, y, -0.25);
  for (let i = 0; i < 3; i++) b.box(0.22 - i * 0.06, 0.06, 0.2, STONE, 0.5 - i * 0.03, y + i * 0.06, -0.38);
  return ridge + 0.36;
}

// The three carriage doors in the front wall at z = front (the middle one open, the others' team leaves shut), the
// oculi over them, and the open door's leaves swung out.
function carriageDoors(b, team, midX, front, floorY) {
  for (const [i, dx] of [-0.72, 0, 0.72].entries()) {
    const x = midX + dx;
    archway(b, x, floorY, front + 0.011, 0, 0.46, 0.34, i === 1 ? C.dark : team);
    if (i !== 1) b.box(0.012, 0.34, 0.024, CRATE_D, x, floorY, front + 0.024);
    b.add(DISC, WHITE, x, floorY + 0.8, front + 0.012, 0.075, 0.02, 0.075, Math.PI / 2, 0, 0);
    b.add(DISC, GLASS, x, floorY + 0.8, front + 0.02, 0.05, 0.01, 0.05, Math.PI / 2, 0, 0);
  }
  for (const side of [-1, 1]) b.box(0.2, 0.34, 0.02, team, midX + side * 0.25, floorY, front + 0.11, 0, side * 1.0);
}

// The +x end wall at x: a stable door (its lower leaf team), a horse looking out, windows.
function stableEnd(b, team, x, midZ, floorY) {
  const doorZ = midZ + 0.08;
  b.box(0.012, 0.38, 0.26, WHITE, x + 0.006, floorY, doorZ);
  b.box(0.012, 0.18, 0.2, team, x + 0.016, floorY, doorZ);
  b.box(0.012, 0.16, 0.2, C.dark, x + 0.014, floorY + 0.18, doorZ);
  b.box(0.16, 0.08, 0.08, HORSE_HEAD, x + 0.08, floorY + 0.24, doorZ, 0, 0, -0.3);
  b.box(0.08, 0.14, 0.08, HORSE_HEAD, x + 0.03, floorY + 0.22, doorZ, 0, 0, -0.5);
  b.box(0.02, 0.05, 0.03, WHITE, x + 0.16, floorY + 0.25, doorZ);
  sash(b, x + 0.01, floorY + 0.14, midZ - 0.2, Math.PI / 2, 0.14, 0.24);
  for (const side of [-1, 1]) sash(b, x + 0.01, floorY + 0.68, midZ + side * 0.17, Math.PI / 2, 0.12, 0.16);
}

// The lantern on the ridge at (x, z), standing on y: its louvres, its lead cap, and the weathervane in the mast.
function ridgeLantern(ctx, x, y, z) {
  const { b, mast } = ctx;
  b.box(0.26, 0.06, 0.26, WHITE, x, y, z);
  b.add(CYL8, WHITE, x, y + 0.17, z, 0.1, 0.22, 0.1);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 8, ry = Math.PI / 2 - a;
    b.box(0.04, 0.12, 0.02, C.dark, x + Math.cos(a) * 0.095, y + 0.1, z + Math.sin(a) * 0.095, 0, ry);
  }
  b.cylT(0.12, 0.12, 0.03, WHITE, x, y + 0.28, z, 8);
  b.add(DOME, LEAD, x, y + 0.31, z, 0.11, 0.1, 0.11);
  // The weathervane: its rod, the arm, the arrow's head and a gold ball.
  mast.cylT(0.006, 0.01, 0.3, C.dark, x, y + 0.4, z, 4);
  mast.box(0.18, 0.012, 0.012, C.dark, x, y + 0.6, z);
  mast.box(0.02, 0.05, 0.05, C.dark, x - 0.09, y + 0.58, z, 0, Math.PI / 4);
  mast.box(0.012, 0.04, 0.04, C.gold, x, y + 0.5, z, Math.PI / 4);
}

// A stone trough at (x, z) and the painted pump behind it, its spout and handle.
function pumpAndTrough(b, x, y, z) {
  b.box(0.18, 0.13, 0.46, STONE_D, x, y, z);
  b.box(0.14, 0.01, 0.42, WATER, x, y + 0.125, z);
  b.box(0.07, 0.42, 0.07, PAINT, x + 0.02, y, z - 0.32);
  b.box(0.03, 0.03, 0.1, PAINT, x + 0.02, y + 0.33, z - 0.27);
  b.box(0.02, 0.02, 0.18, PAINT, x + 0.02, y + 0.4, z - 0.4, 0.5);
}

// A beam scale for place(), built at the origin: a timber gallows frame `height` tall, its brass balance beam hung from
// the crosstree (tipped by its load), chains down to two brass pans, a crate on the lower pan and iron weights on the
// other.
const scales = (team, height) => {
  const scale = new B(), tilt = 0.12, halfBeam = 0.26, pivotY = height - 0.14;
  for (const side of [-1, 1]) {
    scale.box(0.06, height, 0.06, C.woodD, side * 0.36, 0, 0);
    scale.box(0.04, 0.04, 0.24, C.woodD, side * 0.36, 0, 0);
  }
  for (const side of [-1, 1]) {
    stick(scale, 0.015, C.woodD, [side * 0.36, height - 0.2, 0], [side * 0.2, height - 0.02, 0], unit.box);
  }
  scale.box(0.84, 0.06, 0.07, C.wood, 0, height, 0);
  scale.box(0.012, 0.1, 0.012, P.iron, 0, pivotY + 0.03, 0);
  scale.add(unit.box, P.brass, 0, pivotY, 0, 2 * halfBeam, 0.024, 0.03, 0, 0, -tilt);
  scale.add(CONE4, P.brass, 0, pivotY + 0.04, 0, 0.025, 0.08, 0.02);
  for (const side of [-1, 1]) {
    const endX = side * halfBeam * Math.cos(tilt), endY = pivotY - side * halfBeam * Math.sin(tilt), panY = endY - 0.36;
    for (const o of [-1, 1]) stick(scale, 0.004, P.iron, [endX, endY, 0], [endX + o * 0.07, panY + 0.02, 0], CYL6);
    scale.cylT(0.09, 0.06, 0.025, P.brass, endX, panY, 0, 10);
    if (side < 0) {
      crate(scale, endX, panY + 0.025, 0, 0.12, 0.2, team);
      continue;
    }
    for (let i = 0; i < 3; i++) scale.cylT(0.04 - i * 0.008, 0.04 - i * 0.008, 0.03, GUN, endX, panY + 0.025 + i * 0.03, 0, 8);
  }
  return scale;
};

// Market: a trading house with crates and scales. A brick merchant's house with a white shopfront of two bow windows
// either side of the door under a team fascia, a hanging team sign, sash windows and dormers in its hipped roof; its
// lower brick warehouse beside it. In the yard the great beam scale weighs a crate against iron weights, among stacked
// crates with team bands, casks, team bales of cloth, tea chests and sacks.
export function market(ctx) {
  const { b, s: size, h: half } = ctx, y = 0.03, shop = footprint(-1.32, 0.44, -1.32, -0.6), floorY = y + 0.07;
  const { right, front, midX, midZ, width, depth } = shop;
  b.box(size, y, size, COBBLE);
  const top = block(b, midX, midZ, width, depth, 0.94, 0.42, { y });
  quoins(b, right, front, 1, 1, floorY, 0.94);
  for (const side of [-1, 1]) chimney(b, midX + side * (width / 2 - 0.16), top + 0.2, midZ, 0.4);
  shopfront(ctx, shop, floorY);
  sashes(b, midX, front, 0, width, 5, [floorY + 0.62], 0.14, 0.24);
  sashes(b, right, midZ, Math.PI / 2, depth, 2, [floorY + 0.14, floorY + 0.62], 0.13, 0.24);
  for (const dx of [-0.42, 0.42]) dormer(b, midX + dx, top, front - 0.06);
  flag(ctx, midX, top + 0.42 - 0.02, midZ, 0.45);
  shopWarehouse(ctx, footprint(right + 0.08, half - 0.06, -1.3, -0.78), y, floorY);
  tradingYard(ctx, y);
  return top + 0.7;
}

// A dormer in the front slope at x, its foot at the cornice's top: white cheeks, a window and a tile roof.
function dormer(b, x, top, z) {
  b.box(0.2, 0.18, 0.22, WHITE, x, top + 0.06, z - 0.04);
  b.box(0.12, 0.12, 0.02, GLASS, x, top + 0.09, z + 0.075);
  b.roof(0.26, 0.12, 0.26, TILE, x, top + 0.24, z - 0.04);
}

// The warehouse beside the shop: a team loading door, a window.
function shopWarehouse(ctx, store, y, floorY) {
  const { b } = ctx;
  block(b, store.midX, store.midZ, store.width, store.depth, 0.6, 0.28, { y });
  archway(b, store.midX, floorY, store.front + 0.011, 0, 0.34, 0.3, ctx.t);
  b.box(0.012, 0.3, 0.024, CRATE_D, store.midX, floorY, store.front + 0.024);
  sash(b, store.right + 0.01, floorY + 0.26, store.midZ, Math.PI / 2, 0.13, 0.22);
}

// The shopfront: stall riser, bow windows, the door, the fascia and the hanging sign.
function shopfront(ctx, { right, front, midX, width }, floorY) {
  const { b, t: team } = ctx, faceZ = front + 0.012;
  b.box(width - 0.12, 0.5, 0.025, WHITE, midX, floorY, faceZ);
  for (const x of [midX - 0.48, midX + 0.48]) bowWindow(b, x, floorY, faceZ);
  georgianDoor(b, midX, floorY, faceZ + 0.004, 0, ctx.td, 0.2, 0.36);
  b.box(width - 0.1, 0.09, 0.04, team, midX, floorY + 0.5, faceZ + 0.02);
  b.box(width - 0.3, 0.014, 0.045, C.gold, midX, floorY + 0.535, faceZ + 0.022);
  // The sign on its iron bracket.
  b.box(0.02, 0.02, 0.24, P.iron, right - 0.06, floorY + 0.82, front + 0.12);
  b.box(0.02, 0.2, 0.18, WHITE, right - 0.06, floorY + 0.6, front + 0.15);
  b.box(0.024, 0.16, 0.14, team, right - 0.06, floorY + 0.62, front + 0.15);
}

// A bow window centred at x on the shopfront at z: its base and head, the front and two splayed side lights, three
// glazing bars and a transom.
function bowWindow(b, x, floorY, z) {
  const width = 0.42, out = 0.1;
  b.box(width, 0.12, out * 2, WHITE, x, floorY, z);
  b.box(width - 0.04, 0.26, 0.02, GLASS, x, floorY + 0.13, z + out);
  b.box(width + 0.04, 0.05, out * 2 + 0.04, WHITE, x, floorY + 0.4, z);
  for (const side of [-1, 1]) {
    b.box(0.02, 0.26, 0.16, GLASS, x + side * (width / 2 - 0.01), floorY + 0.13, z + 0.02, 0, -side * 0.35);
  }
  for (let i = 1; i < 4; i++) b.box(0.012, 0.26, 0.022, WHITE, x - width / 2 + i * width / 4, floorY + 0.13, z + out + 0.002);
  b.box(width - 0.04, 0.012, 0.022, WHITE, x, floorY + 0.26, z + out + 0.002);
}

// The yard: the scale, crates, casks, bales of cloth, tea chests, sacks.
function tradingYard(ctx, y) {
  const { b, t: team } = ctx;
  place(b, scales(team, 0.95), 0.32, y, 0.42, 0);
  const crates = [
    [-0.95, 0.0, 0.17, 0.1, team], [-0.77, -0.04, 0.16, -0.15, null], [-0.88, 0.18, 0.16, 0.3, null],
    [1.0, 0.62, 0.17, 0.2, team], [1.12, 0.45, 0.15, -0.1, null], [1.15, 0.92, 0.15, 0.4, team],
  ];
  for (const [x, z, width, ry, band] of crates) crate(b, x, y, z, width, ry, band);
  crate(b, -0.88, y + 0.145, 0.04, 0.15, -0.2, team);
  crate(b, 1.05, y + 0.145, 0.55, 0.14, 0.1, null);
  for (const [x, z] of [[-0.42, 0.7], [-0.28, 0.78], [-0.36, 0.9]]) barrel(b, x, y, z);
  balesAndTeaChests(b, team, y);
  sack(b, 0.66, y, 0.88, 0.08);
  sack(b, 0.54, y, 0.94, 0.075);
  sack(b, 0.62, y + 0.12, 0.9, 0.07);
}

// Bales of cloth, two lying side by side and corded, one on top; tea chests, gold-banded.
function balesAndTeaChests(b, team, y) {
  for (const [x, z, ry] of [[0.95, -0.25, 0.1], [1.12, -0.32, -0.2]]) {
    b.add(CYL8, team, x, y + 0.085, z, 0.085, 0.3, 0.085, 0, ry, Math.PI / 2);
    for (const o of [-0.08, 0.08]) {
      b.add(CYL8, ROPE, x + Math.cos(ry) * o, y + 0.085, z - Math.sin(ry) * o, 0.088, 0.02, 0.088, 0, ry, Math.PI / 2);
    }
  }
  b.add(CYL8, team, 1.03, y + 0.24, -0.29, 0.08, 0.28, 0.08, Math.PI / 2, 0.0, 0);
  // Tea chests, gold-banded.
  for (const [x, z, chestY] of [[-0.62, 0.42, 0], [-0.5, 0.48, 0], [-0.56, 0.45, 0.13]]) {
    b.box(0.13, 0.13, 0.13, 0x5a3a22, x, y + chestY, z);
    b.box(0.135, 0.012, 0.135, C.gold, x, y + chestY + 0.06, z);
  }
}

// Government Center: a capitol dome. A white neoclassical capitol on a stone podium: low wings either side with
// rows of sash windows under balustrades, the taller centre block fronted by a portico of six columns under a pediment
// with a team tympanum, broad steps to it. Over the centre a great copper dome on a drum ringed by columns, its white
// lantern flying the flag.
export function government_center(ctx) {
  const { b, s: size } = ctx, y = 0.05, floorY = y + 0.1;
  b.box(size, y, size, PAVE);
  b.box(2.62, 0.1, 2.16, STONE, 0, y, -0.22);
  for (const side of [-1, 1]) capitolWing(b, side, floorY);
  // The centre block.
  const back = -1.2, front = 0.34, midZ = (back + front) / 2, height = 0.84, top = floorY + height;
  b.box(1.0, height, front - back, WHITE, 0, floorY, midZ);
  b.box(1.05, 0.06, front - back + 0.05, STONE, 0, top - 0.06, midZ);
  capitolPortico(ctx, y, floorY, front);
  const lanternY = capitolDome(b, top, -0.44);
  flag(ctx, 0, lanternY + 0.24, -0.44, 0.5, C.gold);
  return lanternY + 0.26;
}

// The wing on the `side`: walls, string course, windows, balustrade and lead roof; the +x wing's end wall too.
function capitolWing(b, side, floorY) {
  const back = -1.02, front = 0.2, midZ = (back + front) / 2, depth = front - back, height = 0.66, top = floorY + height;
  const x = side * 0.91, width = 0.78;
  b.box(width, height, depth, WHITE, x, floorY, midZ);
  b.box(width + 0.02, 0.025, depth + 0.02, STONE, x, floorY + 0.3, midZ);
  b.box(width + 0.05, 0.05, depth + 0.05, STONE, x, top - 0.05, midZ);
  sashes(b, x, front, 0, width, 3, [floorY + 0.06, floorY + 0.36], 0.13, 0.22);
  b.box(width, 0.02, depth, LEAD, x, top, midZ);
  for (let u = -width / 2 + 0.05; u < width / 2; u += 0.1) b.box(0.025, 0.08, 0.025, WHITE, x + u, top, front);
  b.box(width + 0.02, 0.025, 0.05, WHITE, x, top + 0.08, front);
  if (side < 0) return;
  sashes(b, x + width / 2, midZ, Math.PI / 2, depth, 4, [floorY + 0.06, floorY + 0.36], 0.13, 0.22);
  for (let u = -depth / 2 + 0.05; u < depth / 2; u += 0.1) b.box(0.025, 0.08, 0.025, WHITE, x + width / 2, top, midZ + u);
  b.box(0.05, 0.025, depth + 0.02, WHITE, x + width / 2, top + 0.08, midZ);
}

// The portico out from the centre block's front: six columns, the entablature, the pediment and its team tympanum,
// the door, steps.
function capitolPortico(ctx, y, floorY, blockFront) {
  const { b, t: team } = ctx, front = 0.8, height = 0.64, midZ = (blockFront + front) / 2 + 0.02;
  for (let i = 0; i < 6; i++) column(b, -0.4 + i * 0.16, floorY, front, height, 0.04);
  b.box(1.0, 0.09, front - blockFront + 0.08, WHITE, 0, floorY + height, midZ);
  b.box(1.0, 0.03, 0.02, team, 0, floorY + height + 0.03, front + 0.07);
  b.roof(1.06, 0.26, front - blockFront + 0.1, WHITE, 0, floorY + height + 0.09, midZ);
  b.roof(0.8, 0.17, 0.02, team, 0, floorY + height + 0.13, front + 0.08);
  georgianDoor(b, 0, floorY, blockFront + 0.011, 0, ctx.td, 0.24, 0.42);
  for (let i = 0; i < 4; i++) b.box(1.16, (i + 1) * 0.025, 1.28 - i * 0.1 - 0.86, STONE, 0, y, (0.86 + 1.28 - i * 0.1) / 2);
}

// The drum standing on y at z, its ring of columns, the attic, the copper dome and the lantern. Returns the lantern's
// foot.
function capitolDome(b, y, z) {
  b.box(0.98, 0.1, 0.98, WHITE, 0, y, z);
  b.cylT(0.53, 0.53, 0.03, STONE, 0, y + 0.1, z, 16);
  b.cylT(0.42, 0.42, 0.34, WHITE, 0, y + 0.13, z, 16);
  // Windows round the drum's camera side, and its ring of columns.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i - 1.75) * 0.72, ry = Math.PI / 2 - a;
    b.box(0.06, 0.18, 0.02, GLASS, Math.cos(a) * 0.42, y + 0.19, z + Math.sin(a) * 0.42, 0, ry);
  }
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    b.cylT(0.02, 0.024, 0.33, WHITE, Math.cos(a) * 0.49, y + 0.13, z + Math.sin(a) * 0.49, 6);
  }
  b.cylT(0.53, 0.53, 0.05, WHITE, 0, y + 0.46, z, 16);
  b.cylT(0.41, 0.44, 0.12, WHITE, 0, y + 0.51, z, 16);
  b.add(DOME, COPPER, 0, y + 0.63, z, 0.43, 0.48, 0.43);
  b.cylT(0.44, 0.44, 0.03, COPPER_L, 0, y + 0.63, z, 16);
  const lanternY = y + 0.63 + 0.46;
  domeLantern(b, lanternY, z);
  return lanternY;
}

// The dome's white lantern standing on y, its copper cap and four windows.
function domeLantern(b, y, z) {
  b.cylT(0.1, 0.11, 0.16, WHITE, 0, y, z, 8);
  b.add(DOME, COPPER, 0, y + 0.16, z, 0.11, 0.1, 0.11);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, ry = Math.PI / 2 - a;
    b.box(0.03, 0.09, 0.02, C.dark, Math.cos(a) * 0.1, y + 0.03, z + Math.sin(a) * 0.1, 0, ry);
  }
}

// The lighthouse lamp, built at the origin for a spinner turning about y: a brass stand and a glowing lens drum whose
// two bright lens faces (±x), between dark brass backs, throw two short fans of light out between the glazing bars.
const LENS = 0xffe17a, LIGHT = 0xfff3c2, BEAM = 0xffe9a0;
const lamp = () => {
  const lens = new B();
  lens.cylT(0.05, 0.07, 0.06, P.brass, 0, 0, 0, 8);
  lens.add(CYL8, LENS, 0, 0.17, 0, 0.1, 0.22, 0.1);
  lens.cylT(0.11, 0.11, 0.025, P.brass, 0, 0.06, 0, 8);
  lens.cylT(0.11, 0.11, 0.025, P.brass, 0, 0.26, 0, 8);
  for (const side of [-1, 1]) {
    lens.box(0.02, 0.18, 0.15, LIGHT, side * 0.105, 0.075, 0);
    lens.box(0.15, 0.18, 0.02, P.brass, 0, 0.075, side * 0.105);
    lens.add(CONE4, BEAM, side * 0.31, 0.165, 0, 0.045, 0.4, 0.15, 0, 0, side * Math.PI / 2);
  }
  return lens.geometry();
};

// Wonder: a lighthouse. A tall tapering tower in the manner of Smeaton's Eddystone, flared at its foot and banded in team
// colour and white, rises from a stone plinth on a rocky headland, its stair windows climbing round it. Up top a
// corbelled gallery with an iron railing carries the lantern: glazing bars round the lamp (an animated spinner, whose
// beams sweep round), a copper roof and the flag. At its foot the whitewashed keeper's cottage and a brick oil store;
// rocks lie in the sea round the headland, with a jetty and a team-striped boat.
export function wonder(ctx) {
  const { b, s: size, t: team } = ctx, towerX = -0.25, towerZ = -0.25, landY = 0.16;
  b.box(size, 0.03, size, WATER);
  headland(b, landY);
  jetty(b, team);
  const galleryY = lighthouseTower(ctx, towerX, towerZ, landY);
  const lanternY = lantern(ctx, towerX, galleryY, towerZ);
  keeperCottage(ctx, landY);
  // The brick oil store behind, its casks.
  const storeX = 0.75, storeZ = -1.42;
  block(b, storeX, storeZ, 0.62, 0.46, 0.42, 0.24, { y: landY });
  archway(b, storeX, landY + 0.07, storeZ + 0.241, 0, 0.2, 0.18, team);
  barrel(b, 1.22, landY, -1.12);
  barrel(b, 1.1, landY, -1.02, 0.065);
  barrel(b, 1.16, landY + 0.17, -1.07, 0.06, 0.14);
  return lanternY + 0.36;
}

// The headland: rocky shores up to grass, with rocks lying in the sea off its coast; a gravel path.
function headland(b, landY) {
  const coast = [
    [1.86, -1.86], [1.86, -0.75], [1.42, -0.32], [1.12, 0.2], [0.78, 0.48], [0.48, 0.78], [0.2, 1.12], [-0.32, 1.42],
    [-0.75, 1.86], [-1.86, 1.86], [-1.86, -1.86],
  ];
  const clamp = v => Math.max(-1.78, Math.min(1.78, v));
  loft(b, [coast, offsetRing(coast, -0.08), offsetRing(coast, -0.2)], [0.0, landY - 0.06, landY], [ROCK, SAND], { top: GRASS });
  // Each rock lies a little out from a point along one of the shore's edges (e), along that edge's outward normal.
  for (let i = 0; i < 16; i++) {
    const e = i % 8 + 1, onShore = pointAlong(coast, e, hash(i, 3)), next = coast[(e + 1) % coast.length];
    const dx = next[1] - coast[e][1], dz = -(next[0] - coast[e][0]), length = Math.hypot(dx, dz);
    const out = 0.08 + hash(i, 7) * 0.3, radius = 0.06 + hash(5, i) * 0.1;
    const rockX = clamp(onShore[0] + dx / length * out), rockZ = clamp(onShore[1] + dz / length * out);
    b.rock(radius, i % 2 ? ROCK : ROCK_D, rockX, 0.0, rockZ, 1.2, 0.7, 1, i);
  }
  b.box(0.8, 0.006, 0.2, GRAVEL, 0.17, landY, 0.5, 0, -0.08);
}

// The jetty out along the diagonal into the sea, and the boat moored beside it.
function jetty(b, team) {
  // The point a fraction f out along the jetty, and its piles' offset either side of it.
  const along = f => [0.5 + f * 0.62, 0.5 + f * 0.62], pileOffset = Math.SQRT1_2 * 0.13;
  for (const f of [0.25, 0.62, 1]) for (const side of [-1, 1]) {
    const [x, z] = along(f);
    b.box(0.05, 0.19, 0.05, C.woodD, x + side * pileOffset, -0.02, z - side * pileOffset);
  }
  b.box(0.28, 0.03, 0.9, C.wood, 0.81, 0.15, 0.81, 0, Math.PI / 4);
  for (let i = 0; i < 6; i++) {
    const [x, z] = along(0.1 + i * 0.17);
    b.box(0.29, 0.008, 0.02, C.woodD, x, 0.18, z, 0, Math.PI / 4);
  }
  place(b, boat(team, 0.62, 0.24, 0.12), 1.2, 0.02, 0.76, -Math.PI / 4);
  stick(b, 0.006, ROPE, [1.0, 0.18, 0.82], [1.1, 0.13, 0.7], CYL6);
}

// The plinth and the tower: a flared, banded loft of twelve sides, its door porch and stair windows, and the
// corbelled gallery on top. Returns the gallery's floor.
function lighthouseTower(ctx, x, z, landY) {
  const { b, t: team } = ctx, foot = landY + 0.2, top = 4.02, bands = 9, rings = [], ys = [];
  const radiusAt = f => 0.29 + 0.34 * (1 - f) ** 2.2;
  loft(b, [circle(x, z, 0.86, 8, Math.PI / 8), circle(x, z, 0.8, 8, Math.PI / 8)], [landY, landY + 0.12], [STONE_D]);
  loft(b, [circle(x, z, 0.72, 8, Math.PI / 8), circle(x, z, 0.68, 8, Math.PI / 8)], [landY + 0.12, foot], [STONE]);
  for (let i = 0; i <= bands; i++) {
    rings.push(circle(x, z, radiusAt(i / bands), 12));
    ys.push(foot + (top - foot) * i / bands);
  }
  loft(b, rings, ys, [STONE, WHITE, team, WHITE, team, WHITE, team, WHITE, WHITE], { top: STONE });
  b.box(0.3, 0.44, 0.24, STONE, x, foot, z + 0.56);
  b.roof(0.36, 0.14, 0.26, STONE_D, x, foot + 0.44, z + 0.56);
  georgianDoor(b, x, foot, z + 0.681, 0, ctx.td, 0.16, 0.3);
  stairWindows(b, x, z, foot, top, radiusAt);
  b.cylT(0.47, radiusAt(1), 0.12, STONE_D, x, top, z, 12);
  b.cylT(0.48, 0.48, 0.04, STONE, x, top + 0.12, z, 12);
  return top + 0.16;
}

// The stair windows, climbing round the camera side of the tower from foot to top, each set into the tower's face at
// its height (radiusAt gives the radius a fraction of the way up).
function stairWindows(b, x, z, foot, top, radiusAt) {
  for (let k = 0; k < 6; k++) {
    const f = (k + 1.4) / 7.4, y = foot + (top - foot) * f, a = Math.PI / 4 + (k % 2 ? 0.55 : -0.55);
    const radius = radiusAt((y - foot) / (top - foot)), ry = Math.atan2(Math.cos(a), Math.sin(a));
    b.box(0.08, 0.13, 0.03, GLASS, x + Math.cos(a) * radius, y, z + Math.sin(a) * radius, 0, ry);
    b.box(0.1, 0.02, 0.04, WHITE, x + Math.cos(a) * radius, y - 0.01, z + Math.sin(a) * radius, 0, ry);
  }
}

// The gallery's iron railing: sixteen posts and a ring of rail round their tops.
function galleryRailing(b, x, y, z) {
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    b.box(0.014, 0.15, 0.014, GUN, x + Math.cos(a) * 0.46, y, z + Math.sin(a) * 0.46);
  }
  const rail = new THREE.TorusGeometry(0.46, 0.012, 3, 24);
  b.add(rail, GUN, x, y + 0.15, z, 1, 1, 1, Math.PI / 2, 0, 0);
  rail.dispose();
}

// The gallery's railing; the lantern, its glazing bars, copper roof and vent; the lamp; the flag. Returns the
// lantern's top.
function lantern(ctx, x, galleryY, z) {
  const { b, extra } = ctx;
  galleryRailing(b, x, galleryY, z);
  b.cylT(0.28, 0.28, 0.1, GUN, x, galleryY, z, 12);
  const foot = galleryY + 0.1, height = 0.4;
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8;
    b.box(0.024, height, 0.024, GUN, x + Math.cos(a) * 0.27, foot, z + Math.sin(a) * 0.27);
  }
  const bar = new THREE.TorusGeometry(0.27, 0.008, 3, 16);
  b.add(bar, GUN, x, foot + height * 0.55, z, 1, 1, 1, Math.PI / 2, 0, 0);
  bar.dispose();
  b.cylT(0.32, 0.32, 0.04, GUN, x, foot + height, z, 12);
  b.cone(0.31, 0.26, COPPER, x, foot + height + 0.04, z, 12);
  b.add(BALL, COPPER_L, x, foot + height + 0.32, z, 0.055, 0.055, 0.055);
  extra.spinners = [{ geo: lamp(), at: [x, foot, z], axis: 'y', speed: 1.1 }];
  flag(ctx, x, foot + height + 0.36, z, 0.42, GUN);
  return foot + height;
}

// The whitewashed keeper's cottage, facing the tower: its door and windows, two chimneys.
function keeperCottage(ctx, landY) {
  const { b } = ctx, x = -1.42, z = -0.55;
  const top = block(b, x, z, 0.6, 1.12, 0.5, 0.3, { y: landY, color: WHITE });
  georgianDoor(b, x + 0.311, landY + 0.07, z + 0.1, Math.PI / 2, ctx.td, 0.15, 0.28);
  for (const dz of [-0.38, -0.16, 0.36]) sash(b, x + 0.31, landY + 0.16, z + dz, Math.PI / 2, 0.12, 0.2);
  sashes(b, x, z + 0.56, 0, 0.6, 2, [landY + 0.16], 0.12, 0.2);
  for (const side of [-1, 1]) chimney(b, x, top + 0.12, z + side * 0.42, 0.3);
}

// The star fort's trace: a square of curtains `curtain` out from the centre with a pointed bastion at each corner, its
// flanks `flank` long standing `gorge` off the corner's axes, its faces meeting at the salient (salient, salient); the
// ring runs from +x toward +z, five edges a corner (flank, face, face, flank, curtain), from the +x flank of the
// (+x, +z) bastion.
const starTrace = (curtain, gorge, flank, salient) => {
  const bastion = [[curtain, gorge], [curtain + flank, gorge], [salient, salient], [gorge, curtain + flank], [gorge, curtain]];
  const ring = [];
  // Each corner's bastion is the first one turned a quarter turn further round.
  for (let k = 0; k < 4; k++) for (const [x, z] of bastion) {
    let [px, pz] = [x, z];
    for (let i = 0; i < k; i++) [px, pz] = [-pz, px];
    ring.push([px, pz]);
  }
  return ring;
};

// Castle: a star fort. Low angled bastions at the four corners of a square of curtains, its earthwork ramparts faced in
// stone with a white cordon and sloped grass parapets above, the parapets cut by embrasures with a cannon on a team
// carriage in each; a stone sentry box (guérite) on each salient and a wet ditch all round. A rusticated gateway with a
// team panel under its pediment opens on the front curtain over a timber bridge. Inside, round the gravel parade, the
// governor's house, a stone powder magazine with a team door, shot piled by the guns and the tall flagstaff.
export function castle(ctx) {
  const { b, s: size } = ctx, rampartTop = 0.42, parapetHeight = 0.16, curtain = 1.0;
  const trace = starTrace(curtain, 0.42, 0.28, 1.62), innerTrace = offsetRing(trace, -0.05);
  b.box(size, 0.03, size, GRASS);
  fortRamparts(b, trace, innerTrace, rampartTop);
  fortParapets(b, ctx.t, innerTrace, rampartTop, parapetHeight);
  guerites(b, innerTrace, rampartTop);
  fortGate(ctx, curtain);
  fortInterior(ctx);
  return rampartTop + parapetHeight + 0.3;
}

// The ditch, the scarp with its batter, the white cordon and the terreplein inside it, down to the parade ground.
function fortRamparts(b, trace, innerTrace, top) {
  const square = halfSide => rect(0, 0, 2 * halfSide, 2 * halfSide), cordon = offsetRing(innerTrace, 0.025);
  cap(b, offsetRing(trace, 0.28), 0.034, GRASS_D, [offsetRing(trace, 0.24)]);
  cap(b, offsetRing(trace, 0.24), 0.04, WATER, [trace]);
  loft(b, [trace, innerTrace], [0.03, top - 0.05], [STONE], { top: null });
  loft(b, [cordon, offsetRing(innerTrace, 0.025)], [top - 0.06, top], [WHITE], { top: null });
  cap(b, offsetRing(innerTrace, 0.025), top, WHITE, [innerTrace]);
  cap(b, innerTrace, top, GRASS, [square(0.66)]);
  loft(b, [square(0.52), square(0.66)], [0.03, top], [GRASS_D], { inward: true, top: null });
  b.box(1.04, 0.012, 1.04, GRAVEL, 0, 0.03, 0);
}

// The parapets, cut by an embrasure in every flank, face and curtain (the gate's in the front curtain), with a gun in
// each; the parapet's outer face slopes back.
function fortParapets(b, team, innerTrace, y, height) {
  const outer = innerTrace, crest = offsetRing(innerTrace, -0.06), inner = offsetRing(innerTrace, -0.2), n = outer.length;
  const edgeLength = i => Math.hypot(outer[(i + 1) % n][0] - outer[i][0], outer[(i + 1) % n][1] - outer[i][1]);
  // Where along each edge its embrasure is, and half its width as a fraction of the edge (wide for the gate, edge 4).
  const gapAt = i => i % 5 === 1 ? 0.55 : i % 5 === 2 ? 0.45 : 0.5, gapHalfWidth = i => (i === 4 ? 0.2 : 0.06) / edgeLength(i);
  for (let i = 0; i < n; i++) {
    // The stretch of parapet from this edge's embrasure to the next edge's.
    const from = [i, gapAt(i) + gapHalfWidth(i)], to = [i + 1, gapAt((i + 1) % n) - gapHalfWidth((i + 1) % n)];
    const innerFace = ringPath(inner, from, to).reverse();
    const foot = [...ringPath(outer, from, to), ...innerFace], top = [...ringPath(crest, from, to), ...innerFace];
    loft(b, [foot, top], [y, y + height], [GRASS_D], { top: GRASS });
    if (i === 4) continue;
    const gun = lerp(pointAlong(outer, i, gapAt(i)), pointAlong(inner, i, gapAt(i)), 0.55);
    const q = outer[(i + 1) % n], p = outer[i];
    cannon(b, team, gun[0], y, gun[1], q[1] - p[1], -(q[0] - p[0]), 0.85);
  }
}

// A guérite on each salient: its corbel, the drum, a stone dome and finial, and a slit looking out.
function guerites(b, innerTrace, y) {
  for (let k = 0; k < 4; k++) {
    const [x, z] = offsetRing(innerTrace, -0.12)[k * 5 + 2], a = Math.atan2(z, x);
    b.cylT(0.075, 0.03, 0.1, STONE_D, x, y - 0.1, z, 8);
    b.cylT(0.075, 0.075, 0.22, STONE, x, y, z, 8);
    b.add(DOME, STONE, x, y + 0.22, z, 0.085, 0.08, 0.085);
    b.add(BALL, STONE_D, x, y + 0.31, z, 0.025, 0.025, 0.025);
    b.box(0.025, 0.09, 0.02, C.dark, x + Math.cos(a) * 0.075, y + 0.08, z + Math.sin(a) * 0.075, 0, Math.PI / 2 - a);
  }
}

// The gateway in the front curtain, its rustication, pediment and team panel, and the bridge over the ditch with the
// path out to the edge.
function fortGate(ctx, curtain) {
  const { b, h: half, t: team } = ctx, z = curtain - 0.02;
  b.box(0.52, 0.62, 0.2, STONE, 0, 0.03, z - 0.08);
  for (let i = 0; i < 4; i++) b.box(0.53, 0.02, 0.205, STONE_D, 0, 0.1 + i * 0.12, z - 0.08);
  archway(b, 0, 0.04, z + 0.021, 0, 0.22, 0.2);
  b.box(0.56, 0.05, 0.24, WHITE, 0, 0.65, z - 0.08);
  b.roof(0.6, 0.16, 0.08, STONE, 0, 0.7, z);
  b.roof(0.44, 0.1, 0.02, team, 0, 0.72, z + 0.04);
  b.box(0.18, 0.12, 0.02, team, 0, 0.45, z + 0.021);
  b.box(0.2, 0.02, 0.025, C.gold, 0, 0.57, z + 0.022);
  b.box(0.04, 0.06, 0.025, C.gold, 0, 0.48, z + 0.026);
  b.box(0.26, 0.03, 0.4, C.wood, 0, 0.05, curtain + 0.2);
  for (const side of [-1, 1]) {
    for (const postZ of [curtain + 0.04, curtain + 0.38]) b.box(0.03, 0.14, 0.03, C.woodD, side * 0.12, 0.05, postZ);
    b.box(0.02, 0.02, 0.38, C.woodD, side * 0.12, 0.17, curtain + 0.21);
  }
  b.box(0.26, 0.006, half - curtain - 0.38, GRAVEL, 0, 0.03, (half + curtain + 0.38) / 2);
}

// Inside: the governor's house, the magazine (stone under a lead roof, with team doors on the two faces the camera
// sees), shot and the flagstaff.
function fortInterior(ctx) {
  const { b, t: team } = ctx;
  const top = block(b, -0.06, -0.33, 0.86, 0.32, 0.34, 0.2, { y: 0.03 });
  sashes(b, -0.06, -0.17, 0, 0.86, 4, [0.18], 0.11, 0.18);
  georgianDoor(b, -0.06, 0.1, -0.165, 0, ctx.td, 0.12, 0.22);
  for (const side of [-1, 1]) chimney(b, -0.06 + side * 0.3, top + 0.08, -0.33, 0.2);
  b.box(0.3, 0.22, 0.24, STONE, -0.3, 0.03, 0.22);
  b.roof(0.36, 0.14, 0.26, LEAD, -0.3, 0.25, 0.22, Math.PI / 2);
  b.box(0.1, 0.14, 0.02, team, -0.3, 0.03, 0.341);
  b.box(0.02, 0.14, 0.1, team, -0.149, 0.03, 0.22);
  for (const [x, z, y] of [[0.12, 0.3, 0], [0.18, 0.3, 0], [0.15, 0.35, 0], [0.15, 0.32, 0.045]]) {
    b.add(BALL, GUN, x, 0.06 + y, z, 0.03, 0.03, 0.03);
  }
  b.box(0.2, 0.06, 0.2, STONE_D, 0.3, 0.03, 0.22);
  b.box(0.12, 0.05, 0.12, STONE, 0.3, 0.09, 0.22);
  flag(ctx, 0.3, 0.14, 0.22, 1.5, C.woodD, [0.34, 0.6]);
}

// ---------- Age of Sail defences ----------
// Tower: a cannon bastion. A lone arrowhead bastion pointing at the field: its battered red-brick scarp on a stone
// plinth, a white stone cordon and a white salient angle, under a sloped turf parapet. Two heavy guns on team carriages
// fire over the parapet (en barbette), one down each face, with round shot piled by them and a powder barrel; a stone
// guérite keeps the salient and the flag flies from a staff behind the guns. Its shot is both guns firing: muzzle flashes
// and powder smoke (extra.fire).
export function tower(ctx) {
  const { b, t: team, extra } = ctx, rampartTop = 1.2, parapetHeight = 0.2, gunScale = 1.9;
  // The trace: the salient toward the camera, the faces back to the shoulders, the flanks to the gorge.
  const trace = [[0.84, 0.84], [-0.46, 0.74], [-0.86, 0.06], [0.06, -0.86], [0.74, -0.46]], innerTrace = offsetRing(trace, -0.08);
  b.box(1.76, 0.03, 1.76, GRASS);
  bastionScarp(b, trace, innerTrace, rampartTop);
  bastionParapet(b, innerTrace, rampartTop, parapetHeight);
  // The guns, on timber platforms, each firing square to its face; shot and a powder barrel by them.
  const guns = [[0.44, 0.22, 0.9963, -0.0862], [0.22, 0.44, -0.0862, 0.9963]];
  for (const [x, z, dx, dz] of guns) {
    b.box(0.22, 0.02, 0.5, C.wood, x - dx * 0.04, rampartTop, z - dz * 0.04, 0, Math.atan2(dx, dz));
    cannon(b, team, x, rampartTop + 0.02, z, dx, dz, gunScale);
  }
  shotPile(b, 0.02, rampartTop, 0.3, 0.035);
  shotPile(b, 0.3, rampartTop, 0.0, 0.035);
  barrel(b, 0.12, rampartTop, -0.12, 0.075, 0.18);
  salientGuerite(b, team, innerTrace, rampartTop);
  flag(ctx, -0.15, rampartTop, -0.15, 1.25, C.woodD, [0.32, 0.58]);
  extra.fire = { geo: broadside(guns, rampartTop, gunScale), at: [0, 0, 0] };
  return rampartTop + 0.52;
}

// The plinth, the battered brick scarp with its white salient angle, and the cordon on top.
function bastionScarp(b, trace, innerTrace, top) {
  loft(b, [offsetRing(trace, 0.085), offsetRing(trace, 0.07)], [0.03, 0.13], [STONE_D], { top: null });
  cap(b, offsetRing(trace, 0.085), 0.13, STONE_D, [offsetRing(trace, 0.06)]);
  loft(b, [offsetRing(trace, 0.06), innerTrace], [0.13, top - 0.06], [BRICK], { top: null });
  const salientFoot = offsetRing(trace, 0.06)[0];
  stick(b, 0.035, WHITE, [salientFoot[0], 0.13, salientFoot[1]], [innerTrace[0][0], top - 0.06, innerTrace[0][1]], CYL6);
  loft(b, [offsetRing(innerTrace, 0.025), offsetRing(innerTrace, 0.025)], [top - 0.06, top], [WHITE], { top: null });
  cap(b, offsetRing(innerTrace, 0.025), top, WHITE, [innerTrace]);
}

// The parapet: its outer face sloping back to a turf crest, its inner face plumb, round the gravel terreplein.
function bastionParapet(b, innerTrace, y, height) {
  const crest = offsetRing(innerTrace, -0.07), inner = offsetRing(innerTrace, -0.24);
  loft(b, [innerTrace, crest], [y, y + height], [GRASS_D], { top: null });
  cap(b, crest, y + height, GRASS, [inner]);
  loft(b, [inner, inner], [y, y + height], [GRASS_D], { inward: true, top: null });
  cap(b, inner, y, GRAVEL);
}

// The guérite on the salient, its slit looking out and a team panel beside it.
function salientGuerite(b, team, innerTrace, y) {
  const [x, z] = offsetRing(innerTrace, -0.11)[0];
  b.cylT(0.12, 0.05, 0.16, STONE_D, x, y - 0.16, z, 8);
  b.cylT(0.12, 0.12, 0.34, STONE, x, y, z, 8);
  b.add(DOME, STONE, x, y + 0.34, z, 0.135, 0.12, 0.135);
  b.add(BALL, STONE_D, x, y + 0.48, z, 0.04, 0.04, 0.04);
  b.box(0.04, 0.14, 0.02, C.dark, x + 0.085, y + 0.12, z + 0.085, 0, Math.PI / 4);
  b.box(0.09, 0.2, 0.02, team, x - 0.06, y + 0.02, z + 0.105, 0, -0.5);
}

// Both guns firing: a flash at each muzzle and a burst of powder smoke beyond it. Returns the shot's geometry.
function broadside(guns, rampartTop, gunScale) {
  const fire = new B();
  for (const [x, z, dx, dz] of guns) {
    const muzzle = [x + dx * 0.22 * gunScale, rampartTop + 0.02 + 0.14 * gunScale, z + dz * 0.22 * gunScale];
    // A point f out along the line of fire, rising a little.
    const at = f => [muzzle[0] + dx * f, muzzle[1] + f * 0.12, muzzle[2] + dz * f];
    muzzleFlash(fire, muzzle, [dx, 0, dz], 1.5);
    fire.add(BALL, P.smoke, ...at(0.6), 0.14, 0.12, 0.14);
    fire.add(BALL, 0xb4b4b4, ...at(0.82), 0.11, 0.1, 0.11);
    fire.add(BALL, 0xa8a8a8, ...at(0.5).map((v, i) => i === 1 ? v + 0.12 : v), 0.1, 0.09, 0.1);
  }
  return fire.geometry();
}

// Wall: a star-fort earthwork. A red-brick revetment on a stone plinth, white stone quoins at its corners and a white
// cordon, under a turf bank whose crest stands back from the edge, so segments in a line show embrasures between them;
// a team pennant on a pike flies from each. It fills its tile edge to edge, so segments in a line close up into one
// rampart.
export function wall(ctx) {
  const { b, t: team } = ctx, cordonY = 0.5;
  b.box(1, 0.07, 1, STONE_D);
  b.box(1, cordonY - 0.07, 1, BRICK, 0, 0.07, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    b.box(0.09, cordonY - 0.07, 0.012, WHITE, x * 0.455, 0.07, z * 0.494);
    b.box(0.012, cordonY - 0.07, 0.09, WHITE, x * 0.494, 0.07, z * 0.455);
  }
  // The cordon, the turf bank and its crest.
  b.box(1, 0.05, 1, WHITE, 0, cordonY, 0);
  b.box(1, 0.16, 1, GRASS_D, 0, cordonY + 0.05, 0);
  b.box(1, 0.015, 1, GRASS, 0, cordonY + 0.21, 0);
  const crestY = cordonY + 0.225;
  b.box(0.8, 0.13, 0.8, GRASS_D, 0, crestY, 0);
  b.box(0.8, 0.015, 0.8, GRASS_L, 0, crestY + 0.13, 0);
  // The pike and its team pennant.
  stick(b, 0.014, C.woodD, [0.28, crestY + 0.14, 0.28], [0.28, crestY + 0.62, 0.28], CYL6);
  b.box(0.012, 0.1, 0.2, team, 0.28, crestY + 0.5, 0.38);
  return crestY + 0.64;
}
