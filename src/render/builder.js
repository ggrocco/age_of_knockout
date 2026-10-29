// Shared model-building toolkit: the palette, the vertex-colour geometry builder B, the per-key geometry cache and the
// mesh/pivot helpers. Used by models.js and the per-era building designs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createModelMaterial, surfaceKind } from './materials.js';

export const TEAM = [0x356bb0, 0xb84532], TEAM_DARK = [0x234779, 0x7c3027];
export const C = {
  skin: 0xe8b98a, hair: 0x4a3222, wood: 0x7a5230, woodD: 0x4e3320, plaster: 0xe6d8b4, stone: 0x9a9a92, stoneD: 0x6f6f68,
  thatch: 0xc9a24a, thatchD: 0xa8822f, dark: 0x2a2018, gold: 0xf2c230, iron: 0xb9c0c8, bronze: 0xb5803a, leather: 0x8a5a2b,
  cloth: 0xc9b58a, hay: 0xe0c060, marble: 0xefe9dc, green: 0x3f7f3a, red: 0xc0392b, glass: 0x6fa8c8,
};
const vertexColorMaterial = createModelMaterial();
export const MODEL_MATERIAL = vertexColorMaterial;
// Unit-sized shapes every part is scaled from.
export const unit = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 10, 8),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 10),
  rock: new THREE.DodecahedronGeometry(1, 0),
  foliage: new THREE.IcosahedronGeometry(1, 1),
  tor: new THREE.TorusGeometry(1, 0.08, 6, 14, Math.PI),
};
// Scratch objects reused by every B.add call.
const partMatrix = new THREE.Matrix4(), partRotation = new THREE.Quaternion(), partEuler = new THREE.Euler();
const partPosition = new THREE.Vector3(), partScale = new THREE.Vector3(), partColor = new THREE.Color();

// Roof colours that get a surface: thatch gets straw and battens, the two tile reds get rows of tiles.
const TILE_RED = 0xa96342, TILE_RED_DARK = 0x945139;
const DETAILED_ROOFS = [C.thatch, TILE_RED, TILE_RED_DARK];

// A triangular prism (a gable roof): a w-wide, h-tall triangle extruded d deep, centred on z.
const prismCache = new Map();
function prismGeo(w, h, d) {
  const key = [w, h, d].join();
  if (!prismCache.has(key)) {
    const outline = new THREE.Shape();
    outline.moveTo(-w / 2, 0);
    outline.lineTo(w / 2, 0);
    outline.lineTo(0, h);
    outline.closePath();
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: d, bevelEnabled: false });
    geometry.translate(0, 0, -d / 2);
    prismCache.set(key, geometry);
  }
  return prismCache.get(key);
}

// Per-vertex colours with a subtle per-face patina; shared by each triangle's vertices to avoid seams.
function patinaColors(vertexCount, color) {
  const colors = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const shade = 0.94 + ((Math.imul((i / 3 | 0) + 1, 16807) >>> 0) % 101) / 1250;
    colors[i * 3] = color.r * shade;
    colors[i * 3 + 1] = color.g * shade;
    colors[i * 3 + 2] = color.b * shade;
  }
  return colors;
}

// One side of a tiled roof: six rows of tiles, alternating colours, with ridged tile joints across each row.
function tiledRoofSide(surface, side, w, h, d, color, slope, length) {
  for (let row = 0; row < 6; row++) {
    const along = (row + 0.5) / 6;
    surface.box(length / 6 + 0.025, 0.035, d + 0.04, row % 2 ? color : 0xb7714e,
      side * w / 2 * along, h * (1 - along) + 0.018, 0, 0, 0, -side * slope);
    for (let z = -d / 2 + 0.12; z < d / 2; z += 0.24) {
      surface.box(length / 6, 0.052, 0.035, 0x8a4c34, side * w / 2 * along, h * (1 - along) + 0.025, z, 0, 0, -side * slope);
    }
  }
}

// One side of a thatched roof: straw bundles down the slope, then three battens along it.
function thatchRoofSide(surface, side, w, h, d, slope, length) {
  for (let z = -d / 2; z <= d / 2; z += 0.095) {
    surface.box(length, 0.025, 0.025, Math.round((z + d) * 100) % 3 ? C.thatchD : C.hay,
      side * w / 4, h / 2 + 0.018, z, 0, 0, -side * slope);
  }
  for (let row = 1; row <= 3; row++) {
    surface.box(0.035, 0.035, d + 0.08, C.wood, side * w / 2 * row / 4, h * (1 - row / 4) + 0.04, 0);
  }
}

// An optional colour map recolours every part as it is added (an era finish over a model's own colours).
export class B {
  constructor(map = null) { this.geos = []; this.map = map; }
  add(geo, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    if (this.map?.has(color)) color = this.map.get(color);
    partRotation.setFromEuler(partEuler.set(rx, ry, rz));
    partMatrix.compose(partPosition.set(x, y, z), partRotation, partScale.set(sx, sy, sz));
    const part = geo.index ? geo.toNonIndexed() : geo.clone();
    part.applyMatrix4(partMatrix);
    part.deleteAttribute('uv');
    const vertexCount = part.attributes.position.count;
    partColor.set(color);
    part.setAttribute('color', new THREE.BufferAttribute(patinaColors(vertexCount, partColor), 3));
    part.setAttribute('surface', new THREE.BufferAttribute(new Float32Array(vertexCount).fill(surfaceKind(color)), 1));
    this.geos.push(part);
    return this;
  }
  box(w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(unit.box, c, x, y + h / 2, z, w, h, d, rx, ry, rz); }
  cyl(r, h, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(unit.cyl, c, x, y + h / 2, z, r, h, r, rx, ry, rz); }
  cylT(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 10, rx = 0, ry = 0, rz = 0) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, 1, 1, 1, rx, ry, rz);
  }
  cone(r, h, c, x = 0, y = 0, z = 0, seg = 8, ry = 0) {
    return this.add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, 1, 1, 1, 0, ry, 0);
  }
  sph(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { return this.add(unit.sph, c, x, y, z, r * sx, r * sy, r * sz); }
  rock(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0) {
    return this.add(unit.rock, c, x, y + r * sy * 0.6, z, r * sx, r * sy, r * sz, 0, ry, 0);
  }
  foliage(r, c, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) {
    return this.add(unit.foliage, c, x, y + r * sy * 0.6, z, r * sx, r * sy, r * sz, 0, ry, 0);
  }
  // A gable roof; thatch and tile colours also get their surface detail (straw and battens, rows of tiles).
  roof(w, h, d, c, x = 0, y = 0, z = 0, ry = 0) {
    this.add(prismGeo(w, h, d), c, x, y, z, 1, 1, 1, 0, ry, 0);
    if (!DETAILED_ROOFS.includes(c)) return this;
    const surface = new B(), slope = Math.atan2(h, w / 2), length = Math.hypot(w / 2, h);
    const tiled = c === TILE_RED || c === TILE_RED_DARK;
    for (const side of [-1, 1]) {
      if (tiled) tiledRoofSide(surface, side, w, h, d, c, slope, length);
      else thatchRoofSide(surface, side, w, h, d, slope, length);
    }
    const detail = surface.geometry();
    this.add(detail, 0xffffff, x, y, z, 1, 1, 1, 0, ry);
    // Preserve the detail's baked colors after applying its transform.
    const placed = this.geos[this.geos.length - 1];
    placed.setAttribute('color', detail.attributes.color.clone());
    placed.setAttribute('surface', detail.attributes.surface.clone());
    detail.dispose();
    return this;
  }
  geometry() {
    const merged = mergeGeometries(this.geos, false);
    for (const part of this.geos) part.dispose();
    merged.userData.shared = true;
    return merged;
  }
}

const cache = new Map();
export const cached = (key, build) => {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
};
export const mesh = geometry => {
  const part = new THREE.Mesh(geometry, vertexColorMaterial);
  part.castShadow = part.receiveShadow = true;
  return part;
};
export const pivot = (x, y, z, geometry) => {
  const joint = new THREE.Group();
  joint.position.set(x, y, z);
  if (geometry) joint.add(mesh(geometry));
  return joint;
};
