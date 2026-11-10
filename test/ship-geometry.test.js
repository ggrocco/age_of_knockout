import test from 'node:test';
import assert from 'node:assert/strict';
import { AGES, ageIndex } from '../src/data/ages.js';
import { UNITS } from '../src/data/units.js';
import { buildModel } from '../src/render/models.js';

// A hull and deck with differently coloured top faces in the same plane alternate which one wins the depth test
// as the ship rolls. Ignore shared edges and the subtle per-face patina, as in the tower roof regression.
function coplanarTops(geometry) {
  const p = geometry.attributes.position.array, c = geometry.attributes.color.array, up = [];
  for (let i = 0; i < p.length; i += 9) {
    const y = p[i + 1];
    if (Math.abs(p[i + 4] - y) > 1e-6 || Math.abs(p[i + 7] - y) > 1e-6) continue;
    const points = [[p[i], p[i + 2]], [p[i + 3], p[i + 5]], [p[i + 6], p[i + 8]]];
    const area = (points[1][1] - points[0][1]) * (points[2][0] - points[0][0])
      - (points[1][0] - points[0][0]) * (points[2][1] - points[0][1]);
    if (area > 1e-9) up.push({ y, points, color: [c[i], c[i + 1], c[i + 2]] });
  }
  const apart = (a, b) => [a, b].some(triangle => triangle.some((point, k) => {
    const next = triangle[(k + 1) % 3], ax = next[1] - point[1], az = point[0] - next[0];
    const length = Math.hypot(ax, az), project = points => points.map(v => (v[0] * ax + v[1] * az) / length);
    const pa = project(a), pb = project(b);
    return Math.max(...pa) <= Math.min(...pb) + 1e-3 || Math.max(...pb) <= Math.min(...pa) + 1e-3;
  }));
  const different = (a, b) => a.some((value, k) => Math.max(value, b[k]) > 1.1 * Math.min(value, b[k]));
  const clashes = [];
  for (let i = 0; i < up.length; i++) for (let j = i + 1; j < up.length; j++) {
    const a = up[i], b = up[j];
    if (Math.abs(a.y - b.y) < 1e-5 && different(a.color, b.color) && !apart(a.points, b.points)) clashes.push(a.y);
  }
  return clashes;
}

for (const type of ['war_galley', 'transport_ship', 'frigate', 'destroyer', 'fishing_ship']) {
  test(`${type}: hull and deck have no overlapping coplanar tops in any playable era`, () => {
    for (const age of AGES.filter(age => ageIndex(age) >= ageIndex(UNITS[type].age))) for (const owner of [0, 1, 2, 3]) {
      const model = buildModel({ ...UNITS[type], kind: 'unit', type, owner, id: 1 }, age);
      assert.deepEqual(coplanarTops(model.anim.body.children[0].geometry), [], `${type}/${age}/team ${owner}`);
    }
  });
}
