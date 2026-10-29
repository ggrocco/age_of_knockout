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

test('GPU-driven batch: one indirect draw per geometry in use, packed slices, growth keeps every instance', async () => {
  const { createGpuBatch } = await import('../src/render/gpu-batch.js');
  const computed = [], renderer = { compute: node => computed.push(node) };
  const source = new THREE.MeshStandardMaterial(), batch = createGpuBatch(source, renderer, { instances: 2, vertices: 64, geometries: 1 });
  const shape = (n, kind) => {
    const g = new THREE.BoxGeometry(n, n, n).toNonIndexed(), count = g.attributes.position.count;
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    g.setAttribute('surface', new THREE.Float32BufferAttribute(new Float32Array(count).fill(kind), 1));
    return g;
  };
  const box = shape(1, 0), wide = shape(2, 1), camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
  camera.position.set(0, 20, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const sun = new THREE.DirectionalLight(); sun.position.set(-5, 10, 5); sun.updateMatrixWorld(true); sun.target.updateMatrixWorld(true);
  const unit = (geometry, x, cosmetic) => {
    const g = new THREE.Group(), part = new THREE.Mesh(geometry, source); if (cosmetic) part.userData.cosmetic = cosmetic;
    g.add(part); g.position.x = x; g.updateMatrixWorld(true); batch.add(g); batch.update(g); return g;
  };
  const groups = [unit(box, 0), unit(wide, 1), unit(box, 2, { mode: 1, axis: 2, speed: 1 }), unit(box, 3), unit(wide, 4)];
  batch.flush(0); batch.cull(camera, sun);
  const mesh = () => batch.mesh.children[0], args = () => mesh().geometry.indirect.array;
  assert.equal(batch.mesh.children.length, 1, 'retired meshes leave the scene');
  assert.equal(batch.instanceCount, 5);
  assert.equal(batch.drawCount, 2, 'one draw per geometry, not per instance');
  const vertices = box.attributes.position.count;
  assert.deepEqual([...args().slice(0, 8)], [vertices, 0, 0, 0, vertices, 0, vertices, 3], 'box: 3 instances from slot 0; wide: 2 from slot 3');
  assert.equal(computed.length, 1, 'one cull pass per frame');
  batch.remove(groups[0]); batch.remove(groups[2]); batch.remove(groups[3]); batch.cull(camera, sun);
  assert.equal(batch.drawCount, 1, 'a geometry with no live instances is not drawn');
  assert.deepEqual([...args().slice(4, 8)], [vertices, 0, vertices, 0]);
  const again = unit(box, 5); batch.cull(camera, sun);
  assert.equal(batch.instanceCount, 3, 'removed slots are reused');
  again.visible = false; batch.update(again); batch.flush(1); batch.cull(camera, sun);
  assert.equal(batch.drawCount, 2, 'hidden instances keep their slice (the cull pass skips them)');
  assert.equal(computed.length, 4);
  batch.dispose();
});
