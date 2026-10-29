import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { requestedRenderer, loadRenderBackend } from '../src/render/view.js';
import { modelMaterial, animateBatch, grassMaterial, waterMaterial } from '../src/render/webgpu.js';
import { createModelBatch } from '../src/render/batch.js';

test('only ?renderer=webgpu opts into the WebGPU spike', () => {
  assert.equal(requestedRenderer(''), 'webgl');
  assert.equal(requestedRenderer('?renderer=webgpu&round=1'), 'webgpu');
  for (const value of ['webgl', 'WEBGPU', 'gpu', '']) assert.equal(requestedRenderer(`?renderer=${value}`), 'webgl');
});

test('the WebGPU backend falls back to WebGL (null) when not requested or not available', async () => {
  assert.equal(await loadRenderBackend('?round=1'), null);
  const warn = console.warn; let warned = '';
  console.warn = message => { warned = message; };
  try { assert.equal(await loadRenderBackend('?renderer=webgpu'), null); } // Node has no navigator.gpu
  finally { console.warn = warn; }
  assert.match(warned, /WebGPU unavailable.*using WebGL/);
});

test('TSL ports replace the GLSL patches the WebGPU renderer ignores', () => {
  const model = modelMaterial(new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }));
  assert.ok(model.isMeshStandardNodeMaterial && model.vertexColors);
  for (const node of ['colorNode', 'roughnessNode', 'metalnessNode', 'normalNode']) assert.ok(model[node]?.isNode, node);
  const grass = grassMaterial({ vertexColors: true }, { mask: new THREE.DataTexture(), size: 112, time: { value: 0 }, fog: { value: 1 } });
  assert.ok(grass.positionNode?.isNode && grass.colorNode?.isNode);
  const water = waterMaterial({ transparent: true, opacity: 0.78 }, { time: { value: 0 } });
  assert.ok(water.isMeshPhysicalNodeMaterial && water.colorNode?.isNode && water.opacityNode?.isNode);
});

test('WebGPU batch animates cosmetics in its positionNode and follows texture growth', () => {
  const source = new THREE.MeshStandardMaterial(), batch = createModelBatch(source, { modelMaterial, animateBatch });
  assert.ok(batch.mesh.material.positionNode?.isNode);
  assert.equal(batch.mesh.customDepthMaterial, undefined, 'WebGPU shadows reuse the positionNode');
  const geometry = new THREE.BoxGeometry();
  for (let i = 0; i < 600; i++) { // past the 512 starting capacity
    const g = new THREE.Group(), part = new THREE.Mesh(geometry, source);
    part.userData.cosmetic = { mode: 1, axis: 1, speed: 2 }; g.add(part); g.updateMatrixWorld(true);
    batch.add(g); batch.update(g);
  }
  batch.flush(3);
  assert.equal(batch.mesh.instanceCount, 600);
  batch.dispose();
});

test('cosmetic nodes follow replaced data and matrix textures', () => {
  const mesh = new THREE.BatchedMesh(4, 64, 64, new THREE.MeshStandardMaterial());
  const uniforms = { cosmeticTime: { value: 0 }, cosmeticData: { value: new THREE.DataTexture() } };
  const animation = animateBatch(modelMaterial(mesh.material), mesh, uniforms);
  uniforms.cosmeticTime.value = 3; uniforms.cosmeticData.value = new THREE.DataTexture(); mesh.setInstanceCount(64);
  animation.sync();
  assert.equal(animation.time.value, 3);
  assert.equal(animation.data.value, uniforms.cosmeticData.value);
  assert.equal(animation.matrices.value, mesh._matricesTexture);
  mesh.dispose();
});
