import * as THREE from 'three';

// Stable slots keep stationary shadows resident. Removal swaps only the last slot.
export function createContactShadows(scene, geometry, material, onResize = () => {}) {
  const entries = [], slots = new Map(), matrix = new THREE.Matrix4();
  let mesh = null;
  // Grows the instanced mesh (to twice what is needed, at least 256) and copies the old slots over.
  function reserve(count) {
    if (mesh && mesh.instanceMatrix.count >= count) return;
    const previous = mesh;
    mesh = new THREE.InstancedMesh(geometry, material, Math.max(256, count * 2));
    mesh.frustumCulled = false; mesh.raycast = () => {};
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (previous) {
      mesh.instanceMatrix.array.set(previous.instanceMatrix.array);
      scene.remove(previous); previous.dispose();
    }
    mesh.instanceMatrix.needsUpdate = true; mesh.count = entries.length;
    scene.add(mesh); onResize();
  }
  function addSlot(group) {
    const slot = entries.length;
    slots.set(group, slot);
    entries.push({ group, world: null });
    reserve(entries.length);
    mesh.count = entries.length;
    return slot;
  }
  function markSlot(slot) {
    mesh.instanceMatrix.addUpdateRange(slot * 16, 16);
    mesh.instanceMatrix.needsUpdate = true;
  }
  return {
    get mesh() { return mesh; },
    // Places the group's shadow (its blob matrix in world space); false when the group has not moved.
    update(group) {
      let slot = slots.get(group);
      if (slot === undefined) slot = addSlot(group);
      const entry = entries[slot];
      if (entry.world?.equals(group.matrixWorld)) return false;
      (entry.world ??= new THREE.Matrix4()).copy(group.matrixWorld);
      matrix.multiplyMatrices(group.matrixWorld, group.userData.blob);
      mesh.setMatrixAt(slot, matrix);
      markSlot(slot);
      return true;
    },
    // The last slot moves into the freed one, so the others stay where they are.
    remove(group) {
      const slot = slots.get(group);
      if (slot === undefined) return;
      const last = entries.pop();
      slots.delete(group);
      if (slot < entries.length) {
        entries[slot] = last;
        slots.set(last.group, slot);
        mesh.getMatrixAt(entries.length, matrix);
        mesh.setMatrixAt(slot, matrix);
        markSlot(slot);
      }
      mesh.count = entries.length;
    },
    dispose() { if (mesh) { scene.remove(mesh); mesh.dispose(); } slots.clear(); entries.length = 0; },
  };
}
