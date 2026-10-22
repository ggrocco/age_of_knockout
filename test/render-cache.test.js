import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createModelBatch } from '../src/render/batch.js';
import { createContactShadows } from '../src/render/contact-shadows.js';
import { buildModel, animate, MODEL_MATERIAL } from '../src/render/models.js';
import { prepareCosmetics } from '../src/render/cosmetics.js';
import { bakeTerrain } from '../src/render/terrain-bake.js';

const proxy = material => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(), material)); g.updateMatrixWorld(true); return g; };
test('terrain refresh uploads current ore tiles, restores renderer state and releases its resources', () => {
  const previous = {}, viewport = new THREE.Vector4(3, 4, 20, 30), scissor = new THREE.Vector4(5, 6, 10, 12);
  let current = previous, testScissor = true, draws = 0, material, geometry;
  const renderer = {
    capabilities: { maxTextureSize: 1024, getMaxAnisotropy: () => 8 },
    getRenderTarget: () => current, setRenderTarget: value => { current = value; },
    getViewport: value => value.copy(viewport), setViewport: (...args) => { if (args.length === 1) viewport.copy(args[0]); else viewport.set(...args); },
    getScissor: value => value.copy(scissor), setScissor: value => scissor.copy(value),
    getScissorTest: () => testScissor, setScissorTest: value => { testScissor = value; },
    render: scene => { draws++; ({ material, geometry } = scene.children[0]); },
  };
  const tiles = Uint8Array.from([0, 1, 2, 3]), map = { size: 2, tiles, starts: [{ x: 0, y: 0 }, { x: 1, y: 1 }] };
  const target = bakeTerrain(renderer, map, 7, new Float32Array(4).fill(4), 4);
  const input = material.uniforms.terrainGrid.value;
  assert.equal(input.image.data[8], 2); assert.equal(input.image.data[12], 3);
  tiles[2] = 0; target.refresh(1); target.refresh(1);
  assert.equal(draws, 2, 'unchanged terrain versions do not redraw');
  assert.equal(input.image.data[8], 0, 'depleted ore is removed from the uploaded grid');
  assert.equal(current, previous); assert.deepEqual(viewport.toArray(), [3, 4, 20, 30]);
  assert.deepEqual(scissor.toArray(), [5, 6, 10, 12]); assert.equal(testScissor, true);
  const released = [];
  for (const item of [input, material, geometry, target]) item.addEventListener('dispose', () => released.push(item));
  target.dispose(); assert.equal(released.length, 4);
});

test('batch keeps unchanged matrices resident, and uploads changes after hide/show', () => {
  const material = new THREE.MeshStandardMaterial(), batch = createModelBatch(material), g = proxy(material);
  batch.add(g); assert.equal(batch.update(g), 1); batch.flush(0);
  const version = batch.mesh._matricesTexture.version;
  assert.equal(batch.update(g), 0); batch.flush(1);
  assert.equal(batch.mesh._matricesTexture.version, version);
  g.children[0].visible = false; g.position.x = 7; g.updateMatrixWorld(true);
  assert.equal(batch.update(g), 0); assert.equal(batch.mesh.getVisibleAt(0), false);
  g.children[0].visible = true;
  assert.equal(batch.update(g), 1); batch.flush(2);
  assert.equal(batch.mesh.getVisibleAt(0), true);
  const m = new THREE.Matrix4(); batch.mesh.getMatrixAt(0, m); assert.equal(m.elements[12], 7);
  for (const range of batch.mesh._matricesTexture.updateRanges) {
    const stride = batch.mesh._matricesTexture.image.width * 4;
    assert.equal(Math.floor(range.start / stride), Math.floor((range.start + range.count - 1) / stride));
  }
  batch.remove(g); const replacement = proxy(material); replacement.position.z = 9; replacement.updateMatrixWorld(true);
  batch.add(replacement); assert.equal(batch.update(replacement), 1, 'a reused slot must not retain the removed part matrix');
  batch.mesh.getMatrixAt(0, m); assert.equal(m.elements[14], 9);
  batch.dispose();
});

test('batch capacity growth retains animation data and forces a complete matrix upload', () => {
  const material = new THREE.MeshStandardMaterial(), batch = createModelBatch(material), g = new THREE.Group(), geometry = new THREE.BoxGeometry();
  for (let i = 0; i < 513; i++) { const p = new THREE.Mesh(geometry, material); p.position.x = i; g.add(p); }
  g.children[0].userData.cosmetic = { mode: 1, speed: 3 };
  g.updateMatrixWorld(true); batch.add(g); batch.update(g); batch.flush(0);
  assert.ok(batch.mesh.maxInstanceCount >= 513);
  assert.equal(batch.cosmetics.uniforms.cosmeticData.value.image.data[2], 3);
  assert.equal(batch.mesh._matricesTexture.updateRanges.length, 0);
  const m = new THREE.Matrix4(); batch.mesh.getMatrixAt(512, m); assert.equal(m.elements[12], 512);
  batch.dispose(); geometry.dispose();
});

test('contact shadows keep static slots, swap on removal, and retain matrices on growth', () => {
  const scene = new THREE.Scene(), material = new THREE.MeshBasicMaterial(), geometry = new THREE.PlaneGeometry();
  const shadows = createContactShadows(scene, geometry, material), groups = [];
  for (let i = 0; i < 258; i++) {
    const g = new THREE.Group(); g.position.x = i; g.userData.blob = new THREE.Matrix4(); g.updateMatrixWorld(true); groups.push(g); shadows.update(g);
  }
  const version = shadows.mesh.instanceMatrix.version;
  assert.equal(shadows.update(groups[0]), false); assert.equal(shadows.mesh.instanceMatrix.version, version);
  shadows.remove(groups[7]); assert.equal(shadows.mesh.count, 257);
  const m = new THREE.Matrix4(); shadows.mesh.getMatrixAt(7, m); assert.equal(m.elements[12], 257);
  groups[257].position.x = 999; groups[257].updateMatrixWorld(true); shadows.update(groups[257]);
  shadows.mesh.getMatrixAt(7, m); assert.equal(m.elements[12], 999);
  shadows.mesh.getMatrixAt(255, m); assert.equal(m.elements[12], 255);
  shadows.dispose(); assert.equal(scene.children.length, 0); material.dispose(); geometry.dispose();
});

test('GPU cosmetics preserve cached geometry and leave the gallery CPU path working', () => {
  const e = { kind: 'building', type: 'barracks', owner: 0, size: 3, constructed: true, progress: 1, amount: 400 };
  const model = buildModel(e, 'industrial'), g = new THREE.Group(); g.add(model.root); g.userData.anim = model.anim;
  const geometry = model.anim.body.children[0].geometry, keys = Object.keys(geometry.attributes);
  prepareCosmetics(g, e); animate(g, e, 1, false); g.updateMatrixWorld(true);
  const batch = createModelBatch(MODEL_MATERIAL); batch.add(g); batch.update(g); batch.flush(1);
  assert.deepEqual(Object.keys(geometry.attributes), keys, 'batch-only attributes must not alter the shared model');
  const a = model.anim.smoke[0].p; assert.equal(a.scale.x, 1, 'smoke transforms run on the GPU');
  assert.equal(a.children[0].userData.cosmetic.mode, 4);
  const other = buildModel(e, 'industrial'), gallery = new THREE.Group(); gallery.userData.anim = other.anim;
  animate(gallery, e, 1, false); assert.notEqual(other.anim.smoke[0].p.scale.x, 1);
  batch.dispose();
});
