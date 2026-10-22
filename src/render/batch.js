import * as THREE from 'three';
import { createCosmetics } from './cosmetics.js';

// Picking uses CPU proxies; cameras draw only the resident batch on layer 0.
export const PROXY_LAYER = 1;

export function createModelBatch(material) {
  let instanceCapacity = 512, vertexCapacity = 1 << 18;
  const cosmetics = createCosmetics(instanceCapacity), drawMaterial = material.clone();
  drawMaterial.onBeforeCompile = material.onBeforeCompile;
  drawMaterial.customProgramCacheKey = material.customProgramCacheKey;
  cosmetics.patch(drawMaterial);
  const mesh = new THREE.BatchedMesh(instanceCapacity, vertexCapacity, vertexCapacity, drawMaterial);
  mesh.customDepthMaterial = cosmetics.patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }));
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const geometryIds = new Map(), entries = new Map(), dirtyIds = new Set();
  let uploadedTexture = null;

  function geometryId(geometry, animated) {
    let ids = geometryIds.get(geometry);
    if (!ids) geometryIds.set(geometry, ids = []);
    const variant = animated ? 1 : 0;
    if (ids[variant] !== undefined) return ids[variant];
    const need = geometry.attributes.position.count;
    if (mesh.unusedVertexCount < need) {
      const used = vertexCapacity - mesh.unusedVertexCount;
      while (used + need > vertexCapacity) vertexCapacity *= 2;
      mesh.setGeometrySize(vertexCapacity, vertexCapacity);
    }
    // Share source arrays, but never modify cached model geometry or its pinned bounds.
    const copy = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) copy.setAttribute(name, attribute);
    copy.setIndex(geometry.index);
    copy.setAttribute('cosmetic', new THREE.Float32BufferAttribute(new Float32Array(need).fill(variant), 1));
    if (animated) {
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      // Rotations are about the part origin. Smoke grows to 1.4x and rises by 0.9;
      // bobbing can add 0.055. This conservative sphere covers every cosmetic mode.
      copy.boundingSphere = new THREE.Sphere(new THREE.Vector3(),
        (geometry.boundingSphere.center.length() + geometry.boundingSphere.radius) * 1.4 + 1);
    } else copy.boundingSphere = geometry.boundingSphere;
    ids[variant] = mesh.addGeometry(copy); copy.dispose();
    return ids[variant];
  }

  function update(group) {
    const parts = entries.get(group); if (!parts) return 0;
    let writes = 0;
    for (const entry of parts) {
      const { part, id } = entry;
      let shown = group.visible;
      for (let o = part; shown && o !== group; o = o.parent) shown = o.visible;
      mesh.setVisibleAt(id, shown);
      if (shown && (!entry.world || !entry.world.equals(part.matrixWorld))) {
        (entry.world ??= new THREE.Matrix4()).copy(part.matrixWorld);
        mesh.setMatrixAt(id, part.matrixWorld); dirtyIds.add(id); writes++;
      }
    }
    return writes;
  }

  return {
    mesh, cosmetics,
    add(group) {
      const parts = [];
      group.traverse(part => {
        if (!part.isMesh || part.material !== material) return;
        if (mesh.instanceCount >= instanceCapacity) {
          instanceCapacity *= 2; mesh.setInstanceCount(instanceCapacity); cosmetics.resize(instanceCapacity);
        }
        part.layers.set(PROXY_LAYER);
        const id = mesh.addInstance(geometryId(part.geometry, !!part.userData.cosmetic));
        cosmetics.set(id, part.userData.cosmetic);
        parts.push({ part, id, world: null });
      });
      entries.set(group, parts);
    },
    remove(group) {
      const parts = entries.get(group); if (!parts) return;
      for (const { id } of parts) { mesh.deleteInstance(id); dirtyIds.delete(id); }
      entries.delete(group);
    },
    update,
    flush(t) {
      cosmetics.uniforms.cosmeticTime.value = t;
      // Three r186 stores BatchedMesh matrices in a DataTexture. Keep this adapter
      // isolated; if its storage changes, the public setters still upload correctly.
      const texture = mesh._matricesTexture;
      if (texture?.addUpdateRange && uploadedTexture === texture && dirtyIds.size) {
        const stride = texture.image.width * 4, rows = new Map();
        for (const id of dirtyIds) {
          const start = id * 16, row = Math.floor(start / stride), range = rows.get(row);
          if (range) { range[0] = Math.min(range[0], start); range[1] = Math.max(range[1], start + 16); }
          else rows.set(row, [start, start + 16]);
        }
        for (const [start, end] of rows.values()) texture.addUpdateRange(start, end - start);
      } else texture?.clearUpdateRanges(); // a resized/new texture needs its complete contents
      uploadedTexture = texture; dirtyIds.clear();
    },
    dispose() { mesh.dispose(); mesh.customDepthMaterial.dispose(); drawMaterial.dispose(); cosmetics.dispose(); },
  };
}
