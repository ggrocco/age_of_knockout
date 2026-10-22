import * as THREE from 'three';

// Stable slots keep stationary shadows resident. Removal swaps only the last slot.
export function createContactShadows(scene, geometry, material, onResize = () => {}) {
  const entries = [], slots = new Map(), matrix = new THREE.Matrix4();
  let mesh = null;
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
  return {
    get mesh() { return mesh; },
    update(group) {
      let slot = slots.get(group);
      if (slot === undefined) { slot = entries.length; slots.set(group, slot); entries.push({ group, world: null }); reserve(entries.length); mesh.count = entries.length; }
      const entry = entries[slot];
      if (entry.world?.equals(group.matrixWorld)) return false;
      (entry.world ??= new THREE.Matrix4()).copy(group.matrixWorld);
      matrix.multiplyMatrices(group.matrixWorld, group.userData.blob); mesh.setMatrixAt(slot, matrix);
      mesh.instanceMatrix.addUpdateRange(slot * 16, 16); mesh.instanceMatrix.needsUpdate = true;
      return true;
    },
    remove(group) {
      const slot = slots.get(group); if (slot === undefined) return;
      const last = entries.pop(); slots.delete(group);
      if (slot < entries.length) {
        entries[slot] = last; slots.set(last.group, slot);
        mesh.getMatrixAt(entries.length, matrix); mesh.setMatrixAt(slot, matrix);
        mesh.instanceMatrix.addUpdateRange(slot * 16, 16); mesh.instanceMatrix.needsUpdate = true;
      }
      mesh.count = entries.length;
    },
    dispose() { if (mesh) { scene.remove(mesh); mesh.dispose(); } slots.clear(); entries.length = 0; },
  };
}
