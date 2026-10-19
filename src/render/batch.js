import * as THREE from 'three';

// Entity models stay in the scene graph as proxies on this layer: animate(), visibility toggles and
// picking keep using them, but the cameras only render layer 0, where the batch lives.
export const PROXY_LAYER = 1;

// Draws every mesh that uses the shared model material (units, buildings, resources, relics) with a
// single multi-draw call per pass instead of one call per body part.
export function createModelBatch(material) {
  let instanceCapacity = 512, vertexCapacity = 1 << 18;
  const mesh = new THREE.BatchedMesh(instanceCapacity, vertexCapacity, vertexCapacity, material);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false; // the batch's own bounds go stale as units move; instances are culled one by one
  const geometryIds = new Map(), entries = new Map();

  function geometryId(geometry) {
    let id = geometryIds.get(geometry);
    if (id !== undefined) return id;
    const need = geometry.attributes.position.count;
    if (mesh.unusedVertexCount < need) {
      const used = vertexCapacity - mesh.unusedVertexCount;
      while (used + need > vertexCapacity) vertexCapacity *= 2;
      mesh.setGeometrySize(vertexCapacity, vertexCapacity);
    }
    id = mesh.addGeometry(geometry); geometryIds.set(geometry, id);
    return id;
  }

  return {
    mesh,
    add(group) {
      const parts = [];
      group.traverse(o => {
        if (!o.isMesh || o.material !== material) return;
        if (mesh.instanceCount >= instanceCapacity) mesh.setInstanceCount(instanceCapacity *= 2);
        o.layers.set(PROXY_LAYER);
        parts.push(o, mesh.addInstance(geometryId(o.geometry)));
      });
      entries.set(group, parts);
    },
    remove(group) {
      const parts = entries.get(group); if (!parts) return;
      for (let i = 1; i < parts.length; i += 2) mesh.deleteInstance(parts[i]);
      entries.delete(group);
    },
    // Call after the scene's world matrices are current.
    update() {
      for (const [group, parts] of entries) {
        for (let i = 0; i < parts.length; i += 2) {
          const part = parts[i], id = parts[i + 1];
          let shown = true;
          for (let o = part; o !== group; o = o.parent) if (!o.visible) { shown = false; break; }
          mesh.setVisibleAt(id, shown);
          if (shown) mesh.setMatrixAt(id, part.matrixWorld);
        }
      }
    },
    dispose() { mesh.dispose(); },
  };
}
