import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { softenShadowChunk, sunShadowRadius, fitSunShadow, SUN_NEAR, SUN_FAR } from '../src/render/sun-shadow.js';
import { viewHalfHeight } from '../src/render/camera-fit.js';

const SUN_OFFSET = new THREE.Vector3(-22, 38, 16), CAMERA_DIRECTION = new THREE.Vector3(1, 1.05, 1).normalize();

test('the soft filter replaces three\'s PCF getShadow once and leaves the other filters alone', () => {
  const source = THREE.ShaderChunk.shadowmap_pars_fragment, soft = softenShadowChunk(source);
  const count = (text, part) => text.split(part).length - 1;
  assert.equal(count(soft, 'float getShadow( sampler2DShadow shadowMap'), 1);
  assert.equal(count(soft, 'getShadow( sampler2D shadowMap'), count(source, 'getShadow( sampler2D shadowMap'), 'VSM and basic paths kept');
  assert.ok(soft.includes('SOFT_REACH') && soft.includes('dFdx'));
  assert.ok(soft.includes('#elif defined( SHADOWMAP_TYPE_VSM )'));
  assert.throws(() => softenShadowChunk('void main() {}'), /not recognised/);
});

test('the radius tells the filter soft (texels per unit of depth, finer texels more) or hard (minus a fixed radius)', () => {
  assert.ok(sunShadowRadius(true, 0.01) > 0);
  assert.equal(sunShadowRadius(true, 0.01), 2 * sunShadowRadius(true, 0.02));
  assert.ok(sunShadowRadius(false, 0.01) < 0);
});

// A view like the game's: an orthographic camera looking down CAMERA_DIRECTION at `focus`.
function viewCamera(zoom, focus, width = 1280, height = 760) {
  const half = viewHalfHeight(zoom, width, height), aspect = width / height;
  const camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 250);
  camera.position.copy(focus).addScaledVector(CAMERA_DIRECTION, 120);
  camera.lookAt(focus); camera.updateMatrixWorld(true);
  return camera;
}
function fittedSun(camera, mapSize = 112, resolution = 2048) {
  const sun = new THREE.DirectionalLight();
  sun.shadow.camera.near = SUN_NEAR; sun.shadow.camera.far = SUN_FAR;
  const texel = fitSunShadow(sun, camera, SUN_OFFSET, mapSize, resolution);
  sun.updateMatrixWorld(); sun.target.updateMatrixWorld(); sun.shadow.updateMatrices(sun);
  return { sun, texel };
}
// Where a world point lands in the shadow map: x, y in [0, 1] and depth in [0, 1] when it is covered.
const inShadowMap = (sun, point) => point.clone().applyMatrix4(sun.shadow.matrix);

test('the shadow map covers the ground and anything up to 6 tall under every screen corner, within the map', () => {
  for (const [width, height] of [[1280, 760], [402, 760], [874, 330]]) for (const zoom of [3, 5, 10, 14, 20, 34]) for (const [fx, fz] of [[56, 56], [8, 8], [104, 20], [56, 110]]) {
    const camera = viewCamera(zoom, new THREE.Vector3(fx, 0, fz), width, height), { sun, texel } = fittedSun(camera);
    const forward = camera.getWorldDirection(new THREE.Vector3());
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) for (const height of [0, 3, 6]) {
      const corner = new THREE.Vector3(sx, sy, -1).unproject(camera);
      const point = corner.addScaledVector(forward, (height - corner.y) / forward.y);
      if (point.x < 0 || point.x > 112 || point.z < 0 || point.z > 112) continue; // beyond the map edge
      const at = inShadowMap(sun, point);
      for (const value of [at.x, at.y, at.z]) assert.ok(value >= 0 && value <= 1, `zoom ${zoom} at ${fx},${fz}: ${at.toArray()}`);
    }
    assert.ok(texel * 2048 / 2 <= 112, 'never wider than the map');
  }
});

test('zoomed in, the frame is tighter than the old 18-tile floor, and panning moves it in whole texels', () => {
  const close = fittedSun(viewCamera(5, new THREE.Vector3(56, 0, 56)));
  assert.ok(close.sun.shadow.camera.right < 18);
  const axisX = new THREE.Vector3(), axisY = new THREE.Vector3(), axisZ = new THREE.Vector3();
  new THREE.Matrix4().lookAt(SUN_OFFSET, new THREE.Vector3(), new THREE.Vector3(0, 1, 0)).extractBasis(axisX, axisY, axisZ);
  for (const step of [0, 0.003, 0.37, 1.9]) {
    const { sun, texel } = fittedSun(viewCamera(10, new THREE.Vector3(56 + step, 0, 56 - step / 2)));
    for (const axis of [axisX, axisY]) {
      const texels = sun.target.position.dot(axis) / texel;
      assert.ok(Math.abs(texels - Math.round(texels)) < 1e-6, `step ${step}: ${texels}`);
    }
  }
});
