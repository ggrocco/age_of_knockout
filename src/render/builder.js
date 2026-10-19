// Shared model-building toolkit: the palette, the vertex-colour geometry builder B, the per-key geometry cache and the
// mesh/pivot helpers. Used by models.js and the per-era building designs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createModelMaterial, surfaceKind } from './materials.js';

export const TEAM = [0x356bb0, 0xb84532], TEAM_DARK = [0x234779, 0x7c3027];
export const C = { skin: 0xe8b98a, hair: 0x4a3222, wood: 0x7a5230, woodD: 0x4e3320, plaster: 0xe6d8b4, stone: 0x9a9a92, stoneD: 0x6f6f68, thatch: 0xc9a24a, thatchD: 0xa8822f, dark: 0x2a2018, gold: 0xf2c230, iron: 0xb9c0c8, bronze: 0xb5803a, leather: 0x8a5a2b, cloth: 0xc9b58a, hay: 0xe0c060, marble: 0xefe9dc, green: 0x3f7f3a, red: 0xc0392b, glass: 0x6fa8c8 };
const VC = createModelMaterial();
export const MODEL_MATERIAL = VC;
export const unit = { box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 10, 8), cyl: new THREE.CylinderGeometry(1, 1, 1, 10), rock: new THREE.DodecahedronGeometry(1, 0), foliage: new THREE.IcosahedronGeometry(1, 1), tor: new THREE.TorusGeometry(1, 0.08, 6, 14, Math.PI) };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
const prismCache = new Map();
function prismGeo(w, h, d) { const k = [w, h, d].join(); if (!prismCache.has(k)) { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); prismCache.set(k, g); } return prismCache.get(k); }

export class B {
  constructor() { this.geos = []; }
  add(geo, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    _q.setFromEuler(_e.set(rx, ry, rz)); _m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
    let g = geo.index ? geo.toNonIndexed() : geo.clone(); g.applyMatrix4(_m); g.deleteAttribute('uv');
    const n = g.attributes.position.count, col = new Float32Array(n * 3); _c.set(color);
    for (let i = 0; i < n; i++) {
      // Subtle per-face patina; shared by each triangle's vertices to avoid seams.
      const shade = 0.94 + ((Math.imul((i / 3 | 0) + 1, 16807) >>> 0) % 101) / 1250;
      col[i * 3] = _c.r * shade; col[i * 3 + 1] = _c.g * shade; col[i * 3 + 2] = _c.b * shade;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('surface', new THREE.BufferAttribute(new Float32Array(n).fill(surfaceKind(color)), 1)); this.geos.push(g); return this;
  }
  box(w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(unit.box, c, x, y + h / 2, z, w, h, d, rx, ry, rz); }
  cyl(r, h, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { return this.add(unit.cyl, c, x, y + h / 2, z, r, h, r, rx, ry, rz); }
  cylT(rt, rb, h, c, x = 0, y = 0, z = 0, seg = 10, rx = 0, ry = 0, rz = 0) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y + h / 2, z, 1, 1, 1, rx, ry, rz); }
  cone(r, h, c, x = 0, y = 0, z = 0, seg = 8, ry = 0) { return this.add(new THREE.ConeGeometry(r, h, seg), c, x, y + h / 2, z, 1, 1, 1, 0, ry, 0); }
  sph(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) { return this.add(unit.sph, c, x, y, z, r * sx, r * sy, r * sz); }
  rock(r, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, ry = 0) { return this.add(unit.rock, c, x, y + r * sy * 0.6, z, r * sx, r * sy, r * sz, 0, ry, 0); }
  foliage(r, c, x, y, z, sx = 1, sy = 1, sz = 1, ry = 0) { return this.add(unit.foliage, c, x, y + r * sy * 0.6, z, r * sx, r * sy, r * sz, 0, ry, 0); }
  roof(w, h, d, c, x = 0, y = 0, z = 0, ry = 0) {
    this.add(prismGeo(w, h, d), c, x, y, z, 1, 1, 1, 0, ry, 0);
    if (![C.thatch, 0xa96342, 0x945139].includes(c)) return this;
    const surface = new B(), slope = Math.atan2(h, w / 2), length = Math.hypot(w / 2, h);
    const tiled = c === 0xa96342 || c === 0x945139;
    for (const side of [-1, 1]) {
      if (tiled) {
        for (let row = 0; row < 6; row++) {
          const f = (row + 0.5) / 6;
          surface.box(length / 6 + 0.025, 0.035, d + 0.04, row % 2 ? c : 0xb7714e,
            side * w / 2 * f, h * (1 - f) + 0.018, 0, 0, 0, -side * slope);
          for (let zz = -d / 2 + 0.12; zz < d / 2; zz += 0.24) {
            surface.box(length / 6, 0.052, 0.035, 0x8a4c34, side * w / 2 * f, h * (1 - f) + 0.025, zz, 0, 0, -side * slope);
          }
        }
      } else {
        for (let zz = -d / 2; zz <= d / 2; zz += 0.095) {
          surface.box(length, 0.025, 0.025, Math.round((zz + d) * 100) % 3 ? C.thatchD : C.hay,
            side * w / 4, h / 2 + 0.018, zz, 0, 0, -side * slope);
        }
        for (let row = 1; row <= 3; row++) {
          surface.box(0.035, 0.035, d + 0.08, C.wood, side * w / 2 * row / 4, h * (1 - row / 4) + 0.04, 0);
        }
      }
    }
    const detail = surface.geometry();
    this.add(detail, 0xffffff, x, y, z, 1, 1, 1, 0, ry);
    // Preserve the detail's baked colors after applying its transform.
    this.geos[this.geos.length - 1].setAttribute('color', detail.attributes.color.clone());
    this.geos[this.geos.length - 1].setAttribute('surface', detail.attributes.surface.clone());
    detail.dispose();
    return this;
  }
  geometry() { const m = mergeGeometries(this.geos, false); for (const g of this.geos) g.dispose(); m.userData.shared = true; return m; }

}
const cache = new Map();
export const cached = (k, f) => { if (!cache.has(k)) cache.set(k, f()); return cache.get(k); };
export const mesh = g => { const m = new THREE.Mesh(g, VC); m.castShadow = m.receiveShadow = true; return m; };
export const pivot = (x, y, z, g) => { const p = new THREE.Group(); p.position.set(x, y, z); if (g) p.add(mesh(g)); return p; };
