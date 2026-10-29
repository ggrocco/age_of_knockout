import * as THREE from 'three';
import { StorageBufferAttribute, IndirectStorageBufferAttribute } from 'three/webgpu';
import {
  Fn, If, Return, storage, uniform, uniformArray, instanceIndex, atomicAdd, atomicLoad, attribute,
  positionGeometry, normalLocal, uint, float, vec3, vec4, mat3, mat4, max, length, dot,
} from 'three/tsl';
import { modelMaterial, cosmeticParts } from './webgpu.js';
import { PROXY_LAYER } from './batch.js';

// GPU-driven model batch for the WebGPU path, with the same interface as batch.js. three.js's WebGPU BatchedMesh
// issues one draw per instance; here every frame a compute pass culls each instance against the camera and sun
// frustums and appends the survivors to its geometry's slice of a visible list, counting them into indirect draw
// args. The scene then draws one drawIndirect per geometry in use: the draw count follows the variety of models,
// not the size of the armies. Needs the indirect-first-instance feature (each draw starts at its own slice).

const NONE = 0xffffffff; // geometry id of a free or hidden instance slot
const ARGS = 4; // drawIndirect: vertexCount, instanceCount, firstVertex, firstInstance
const _m = new THREE.Matrix4(), _frustum = new THREE.Frustum();

// `capacity` sets the starting sizes (tests start small to exercise growth).
export function createGpuBatch(material, renderer, capacity = {}) {
  let instanceCapacity = capacity.instances ?? 2048, vertexCapacity = capacity.vertices ?? 1 << 18, geometryCapacity = capacity.geometries ?? 256;
  let vertexUsed = 0, highWater = 0, membershipDirty = true, frame = 0;
  const free = [], geometries = [], geometryIds = new Map(), entries = new Map(), retired = [];
  const dirty = { matrices: new Set(), cosmetic: new Set(), meta: new Set() };
  // CPU copies of every GPU buffer we write; the GPU only writes the visible list and the instance counts.
  let positions, normals, colors, surfaces, matrices, cosmetic, spheres, geometryOf, args;
  const time = uniform(0), planes = Array.from({ length: 12 }, () => new THREE.Vector4()), planeNodes = uniformArray(planes, 'vec4');
  // The scene holds this group; each build puts a new mesh in it (see build).
  const root = new THREE.Group(); root.isGpuBatch = true;
  let gpu = null;

  const grow = (array, size) => { const next = new array.constructor(size); next.set(array.subarray(0, Math.min(array.length, size))); return next; };
  function allocate() {
    positions = grow(positions ?? new Float32Array(0), vertexCapacity * 3); normals = grow(normals ?? new Float32Array(0), vertexCapacity * 3);
    colors = grow(colors ?? new Float32Array(0), vertexCapacity * 3); surfaces = grow(surfaces ?? new Float32Array(0), vertexCapacity);
    matrices = grow(matrices ?? new Float32Array(0), instanceCapacity * 16); cosmetic = grow(cosmetic ?? new Float32Array(0), instanceCapacity * 8);
    spheres = grow(spheres ?? new Float32Array(0), instanceCapacity * 4);
    const previous = geometryOf; geometryOf = new Uint32Array(instanceCapacity).fill(NONE); if (previous) geometryOf.set(previous);
    args = grow(args ?? new Uint32Array(0), geometryCapacity * ARGS);
  }

  // GPU resources are rebuilt whole when a capacity doubles (rare); every frame only uploads changed ranges. A
  // rebuild makes a new mesh, material and buffers rather than swapping them under three.js's cached render
  // objects, and frees the old ones only after frames already submitted with them are done.
  function build() {
    const geometry = new THREE.BufferGeometry(), drawMaterial = modelMaterial(material);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('surface', new THREE.BufferAttribute(surfaces, 1));
    const buffers = {
      matrices: new StorageBufferAttribute(matrices, 4), cosmetic: new StorageBufferAttribute(cosmetic, 4),
      spheres: new StorageBufferAttribute(spheres, 4), meta: new StorageBufferAttribute(geometryOf, 1),
      visible: new StorageBufferAttribute(new Uint32Array(instanceCapacity), 1), args: new IndirectStorageBufferAttribute(args, ARGS),
    };
    const node = (attr, type, count) => storage(attr, type, count);
    const read = (attr, type, count) => storage(attr, type, count).toReadOnly(); // vertex stages may not write storage
    const matrixAt = (store, id) => { const k = id.mul(4); return [0, 1, 2, 3].map(j => store.element(k.add(j))); };

    // Vertex stage: instance_index includes the draw's firstInstance, so it indexes the geometry's visible slice.
    const visibleR = read(buffers.visible, 'uint', instanceCapacity), matricesR = read(buffers.matrices, 'vec4', instanceCapacity * 4);
    const cosmeticR = read(buffers.cosmetic, 'vec4', instanceCapacity * 2);
    drawMaterial.positionNode = Fn(() => {
      const id = visibleR.element(instanceIndex);
      const [c0, c1, c2, c3] = matrixAt(matricesR, id).map(c => c.toVar());
      const a = cosmeticR.element(id.mul(2)).toVar(), b = cosmeticR.element(id.mul(2).add(1)).toVar();
      const p = vec3(positionGeometry).toVar(), n = vec3(attribute('normal', 'vec3')).toVar(), lift = float(0).toVar();
      If(a.x.greaterThan(0.5).or(b.y.greaterThan(0)), () => { lift.assign(cosmeticParts(a, b, time, p, n)); });
      const m3 = mat3(c0.xyz, c1.xyz, c2.xyz);
      normalLocal.assign(m3.mul(n.div(vec3(dot(c0.xyz, c0.xyz), dot(c1.xyz, c1.xyz), dot(c2.xyz, c2.xyz)))));
      return mat4(c0, c1, c2, c3).mul(vec4(p, 1)).xyz.add(vec3(0, lift, 0));
    })();

    const matricesW = node(buffers.matrices, 'vec4', instanceCapacity * 4), spheresW = node(buffers.spheres, 'vec4', instanceCapacity);
    const metaW = node(buffers.meta, 'uint', instanceCapacity), visibleW = node(buffers.visible, 'uint', instanceCapacity);
    const argsW = node(buffers.args, 'uint', geometryCapacity * ARGS).toAtomic();
    const cull = Fn(() => {
      const i = instanceIndex;
      If(i.greaterThanEqual(uint(instanceCapacity)), () => { Return(); });
      const g = metaW.element(i).toVar();
      If(g.equal(uint(NONE)), () => { Return(); });
      const [c0, c1, c2, c3] = matrixAt(matricesW, i).map(c => c.toVar());
      const s = spheresW.element(i).toVar();
      const center = mat4(c0, c1, c2, c3).mul(vec4(s.xyz, 1)).xyz.toVar();
      const radius = s.w.mul(max(length(c0.xyz), max(length(c1.xyz), length(c2.xyz)))).toVar();
      const inside = from => [0, 1, 2, 3, 4, 5].map(k => planeNodes.element(from + k))
        .map(pl => dot(pl.xyz, center).add(pl.w).greaterThanEqual(radius.negate()))
        .reduce((all, test) => all.and(test));
      If(inside(0).or(inside(6)), () => {
        const slot = atomicAdd(argsW.element(g.mul(ARGS).add(1)), uint(1)).toVar();
        const first = atomicLoad(argsW.element(g.mul(ARGS).add(3))).toVar();
        visibleW.element(first.add(slot)).assign(i);
      });
    })().compute(instanceCapacity, [64]);

    const mesh = new THREE.Mesh(geometry, drawMaterial);
    mesh.castShadow = mesh.receiveShadow = true; mesh.frustumCulled = false;
    if (gpu) { root.remove(gpu.mesh); retired.push({ gpu, frame }); }
    root.add(mesh);
    gpu = { buffers, cull, geometry, mesh, material: drawMaterial };
    membershipDirty = true;
  }

  function addGeometry(source) {
    const count = source.attributes.position.count;
    if (vertexUsed + count > vertexCapacity || geometries.length >= geometryCapacity) {
      while (vertexUsed + count > vertexCapacity) vertexCapacity *= 2;
      if (geometries.length >= geometryCapacity) geometryCapacity *= 2;
      allocate(); build();
    }
    const at = vertexUsed; vertexUsed += count;
    positions.set(source.attributes.position.array, at * 3); normals.set(source.attributes.normal.array, at * 3);
    colors.set(source.attributes.color.array, at * 3); surfaces.set(source.attributes.surface.array, at);
    for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['surface', 1]]) {
      const attr = gpu.geometry.attributes[name]; attr.addUpdateRange(at * size, count * size); attr.needsUpdate = true;
    }
    if (!source.boundingSphere) source.computeBoundingSphere();
    const id = geometries.length;
    geometries.push({ firstVertex: at, vertexCount: count, sphere: source.boundingSphere, live: 0 });
    geometryIds.set(source, id);
    return id;
  }

  function setMeta(slot, value) { if (geometryOf[slot] !== value) { geometryOf[slot] = value; dirty.meta.add(slot); } }
  function update(group) {
    const parts = entries.get(group); if (!parts) return 0;
    let writes = 0;
    for (const entry of parts) {
      const { part, slot } = entry;
      let shown = group.visible;
      for (let o = part; shown && o !== group; o = o.parent) shown = o.visible;
      setMeta(slot, shown ? entry.geometry : NONE);
      if (shown && (!entry.world || !entry.world.equals(part.matrixWorld))) {
        (entry.world ??= new THREE.Matrix4()).copy(part.matrixWorld);
        matrices.set(part.matrixWorld.elements, slot * 16); dirty.matrices.add(slot); writes++;
      }
    }
    return writes;
  }

  // Coalesce dirty slots into runs, so a moving army uploads a few ranges rather than one write per unit.
  function upload(attr, slots, stride) {
    if (!slots.size) return;
    const sorted = [...slots].sort((x, y) => x - y);
    let start = sorted[0], end = start;
    for (const slot of sorted.slice(1)) {
      if (slot <= end + 8) { end = slot; continue; }
      attr.addUpdateRange(start * stride, (end - start + 1) * stride); start = end = slot;
    }
    attr.addUpdateRange(start * stride, (end - start + 1) * stride);
    attr.needsUpdate = true; slots.clear();
  }

  function release(old) { old.geometry.dispose(); old.material.dispose(); old.cull.dispose?.(); }

  allocate(); build();
  return {
    mesh: root, cosmetics: null,
    add(group) {
      const parts = [];
      group.traverse(part => {
        if (!part.isMesh || part.material !== material) return;
        part.layers.set(PROXY_LAYER);
        const geometry = geometryIds.get(part.geometry) ?? addGeometry(part.geometry);
        if (!free.length && highWater >= instanceCapacity) { instanceCapacity *= 2; allocate(); build(); }
        const slot = free.length ? free.pop() : highWater++;
        const p = part.userData.cosmetic ?? {}, sphere = geometries[geometry].sphere;
        cosmetic.set([p.mode ?? 0, p.axis ?? 1, p.speed ?? 0, p.amplitude ?? 0, p.phase ?? 0, p.bob ?? 0, p.bobPhase ?? 0, 0], slot * 8);
        // Animated parts turn, rise and grow about their origin: a sphere around the origin covers every pose.
        if (part.userData.cosmetic) spheres.set([0, 0, 0, (sphere.center.length() + sphere.radius) * 1.4 + 1], slot * 4);
        else spheres.set([sphere.center.x, sphere.center.y, sphere.center.z, sphere.radius], slot * 4);
        dirty.cosmetic.add(slot);
        geometries[geometry].live++; membershipDirty = true;
        parts.push({ part, slot, geometry, world: null });
      });
      entries.set(group, parts);
    },
    remove(group) {
      const parts = entries.get(group); if (!parts) return;
      for (const { slot, geometry } of parts) { setMeta(slot, NONE); geometries[geometry].live--; free.push(slot); dirty.matrices.delete(slot); }
      membershipDirty = true; entries.delete(group);
    },
    update,
    flush(t) {
      time.value = t;
      upload(gpu.buffers.matrices, dirty.matrices, 16); upload(gpu.buffers.meta, dirty.meta, 1);
      if (dirty.cosmetic.size) { upload(gpu.buffers.spheres, new Set(dirty.cosmetic), 4); upload(gpu.buffers.cosmetic, dirty.cosmetic, 8); }
    },
    // Before each render: fill this frame's indirect args from the camera and the sun's shadow frustum.
    cull(camera, light) {
      if (membershipDirty) {
        const offsets = []; let first = 0;
        geometries.forEach((g, i) => {
          args.set([g.vertexCount, 0, g.firstVertex, first], i * ARGS);
          if (g.live > 0) { offsets.push(i * ARGS * 4); first += g.live; }
        });
        gpu.geometry.setIndirect(gpu.buffers.args, offsets.length ? offsets : []);
        gpu.mesh.visible = offsets.length > 0; membershipDirty = false;
      }
      for (let i = 0; i < geometries.length; i++) args[i * ARGS + 1] = 0; // the cull pass counts them up again
      gpu.buffers.args.needsUpdate = true;
      _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _frustum.setFromProjectionMatrix(_m, camera.coordinateSystem, camera.reversedDepth);
      _frustum.planes.forEach((plane, k) => planes[k].set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant));
      light.shadow.updateMatrices(light);
      light.shadow.getFrustum().planes.forEach((plane, k) => planes[6 + k].set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant));
      renderer.compute(gpu.cull);
      frame++;
      while (retired.length && frame - retired[0].frame > 3) release(retired.shift().gpu);
    },
    get instanceCount() { return highWater - free.length; },
    // How many instances the last cull kept (a GPU readback: for measurements, not per frame).
    async visibleCount() {
      const data = new Uint32Array(await renderer.getArrayBufferAsync(gpu.buffers.args));
      let kept = 0; for (let i = 0; i < geometries.length; i++) kept += data[i * ARGS + 1];
      return kept;
    },
    get drawCount() { const offsets = gpu.geometry.indirectOffset; return Array.isArray(offsets) ? offsets.length : 0; },
    dispose() { for (const old of retired) release(old.gpu); retired.length = 0; release(gpu); },
  };
}
