import { WebGPURenderer, MeshStandardNodeMaterial, MeshPhysicalNodeMaterial } from 'three/webgpu';
import {
  Fn, If, Discard, attribute, uniform, texture, textureLoad, textureSize, batchIndirectIndex,
  positionGeometry, positionLocal, positionWorld, positionView, normalView, materialColor, materialOpacity,
  float, int, ivec2, vec3, vec4, mat4, sin, cos, fract, floor, mix, smoothstep, max, pow, abs, sign, dot, cross,
  normalize, dFdx, dFdy, select,
} from 'three/tsl';

// WebGPU spike (`?renderer=webgpu`): the WebGPU renderer ignores `onBeforeCompile`, so the GLSL patches in
// materials.js, grass.js, terrain.js and cosmetics.js are re-expressed here as TSL node materials.
// Loaded with a dynamic import, so the default WebGL path never downloads the WebGPU build.

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render|fallback/i;

export async function createWebGPUBackend({ trackTimestamp = false } = {}) {
  if (!navigator.gpu) throw new Error('navigator.gpu is missing');
  const renderer = new WebGPURenderer({ antialias: true, powerPreference: 'high-performance', trackTimestamp });
  await renderer.init();
  if (!renderer.backend.isWebGPUBackend) { renderer.dispose(); throw new Error('no WebGPU adapter (would fall back to WebGL 2)'); }
  const device = renderer.backend.device, info = device.adapterInfo ?? {};
  const gpu = `WebGPU: ${[info.vendor, info.architecture, info.description].filter(Boolean).join(' ') || 'unknown adapter'}`;
  // A lost device (driver reset, GPU process crash) leaves the canvas blank for good; callers fall back to WebGL.
  // three.js ignores a loss with reason "destroyed" (it assumes the app destroyed the device), but this page never
  // destroys its device, and a dropped GPU instance reports exactly that reason, so the device is watched directly.
  const lostListeners = [];
  const lose = loss => { if (backend.lost) return; backend.lost = loss; lostListeners.forEach(listener => listener(loss)); };
  renderer.onDeviceLost = loss => { renderer._onDeviceLost(loss); lose(loss); };
  device.lost.then(info => { if (!disposed) lose({ api: 'WebGPU', message: info.message || `device ${info.reason ?? 'lost'}`, reason: info.reason }); });
  let disposed = false;
  const dispose = renderer.dispose.bind(renderer);
  renderer.dispose = () => { disposed = true; dispose(); };
  const backend = {
    webgpu: true, renderer, gpu, lost: null,
    onLost(listener) { lostListeners.push(listener); if (backend.lost) listener(backend.lost); },
    softwareGpu: !!info.isFallbackAdapter || SOFTWARE.test(gpu),
    maxTextureSize: device.limits.maxTextureDimension2D,
    maxAnisotropy: renderer.getMaxAnisotropy(),
    modelMaterial, animateBatch, grassMaterial, waterMaterial,
  };
  return backend;
}

// materials.js: procedural wood grain, stone courses and metal patina anchored in model space.
const surfaceNoise = Fn(([p]) => {
  const i = floor(p), f0 = fract(p), f = f0.mul(f0).mul(float(3).sub(f0.mul(2)));
  const n = dot(i, vec3(1, 57, 113));
  const a = fract(sin(vec4(n, n.add(1), n.add(57), n.add(58))).mul(43758.5453));
  const b = fract(sin(vec4(n.add(113), n.add(114), n.add(170), n.add(171))).mul(43758.5453));
  return mix(mix(mix(a.x, a.y, f.x), mix(a.z, a.w, f.x), f.y), mix(mix(b.x, b.y, f.x), mix(b.z, b.w, f.x), f.y), f.z);
});

export function modelMaterial(source) {
  const material = new MeshStandardNodeMaterial({ vertexColors: true, roughness: source.roughness, metalness: source.metalness });
  const surface = attribute('surface', 'float'), p = positionGeometry;
  const patina = surfaceNoise(p.mul(19));
  const wood = surface.greaterThan(0.5).and(surface.lessThan(1.5));
  const masonry = surface.greaterThan(1.5).and(surface.lessThan(3.5)), stone = masonry.and(surface.lessThan(2.5));
  const metal = surface.greaterThan(3.5);
  const grain = sin(p.y.mul(5).add(surfaceNoise(p.mul(vec3(18, 1.8, 18))).mul(18)));
  const joint = select(stone, smoothstep(0.455, 0.485, abs(fract(p.y.mul(6)).sub(0.5))), float(0));
  const shade = select(wood, patina.mul(0.18).add(0.82).add(grain.mul(0.12)),
    select(masonry, patina.mul(0.22).add(0.87).mul(joint.mul(-0.18).add(1)),
      select(metal, patina.mul(0.10).add(0.93), float(1))));
  material.colorNode = materialColor.mul(shade);
  material.roughnessNode = select(metal, patina.mul(0.17).add(0.32), float(source.roughness));
  material.metalnessNode = select(metal, float(0.7), float(source.metalness));
  // Same screen-space bump as the GLSL `normal_fragment_maps` patch.
  const relief = select(wood, grain.mul(0.003), select(masonry, patina.mul(0.012).sub(joint.mul(0.008)), float(0)));
  material.normalNode = Fn(() => {
    const normal = normalView, qx = dFdx(positionView), qy = dFdy(positionView);
    const rx = cross(qy, normal), ry = cross(normal, qx), determinant = dot(qx, rx);
    return normalize(normal.mul(abs(determinant)).sub(sign(determinant).mul(rx.mul(dFdx(relief)).add(ry.mul(dFdy(relief))))));
  })();
  return material;
}

// cosmetics.js: flags, spinners, floaters, smoke and bobbing. Every mode is a transform in part space before the
// part's matrix, plus a bob after it. Call inside an Fn: `a` and `b` are the part's two cosmetic data texels, `p` and
// `n` vec3 vars in part space (rotations turn `n` too). Returns the bob, a float var.
// Values shared by several If branches are made vars first: a node first used inside one branch is undefined in its
// siblings (z-axis spinners once turned with zeroed sin/cos and vanished).
export function cosmeticParts(a, b, time, p, n = null) {
  const angle = select(a.x.lessThan(1.5), time.mul(a.z), sin(time.mul(a.z).add(b.x)).mul(a.w)).toVar();
  const c = cos(angle).toVar(), s = sin(angle).toVar(), lift = float(0).toVar();
  const rx = v => vec3(v.x, c.mul(v.y).sub(s.mul(v.z)), s.mul(v.y).add(c.mul(v.z)));
  const ry = v => vec3(c.mul(v.x).add(s.mul(v.z)), v.y, s.negate().mul(v.x).add(c.mul(v.z)));
  const rz = v => vec3(c.mul(v.x).sub(s.mul(v.y)), s.mul(v.x).add(c.mul(v.y)), v.z);
  If(a.x.greaterThan(0.5).and(a.x.lessThan(2.5)), () => {
    for (const [test, turn] of [[a.y.lessThan(0.5), rx], [a.y.greaterThanEqual(0.5).and(a.y.lessThan(1.5)), ry], [a.y.greaterThanEqual(1.5), rz]]) {
      If(test, () => { p.assign(turn(p)); if (n) n.assign(turn(n)); });
    }
  }).ElseIf(a.x.greaterThan(2.5).and(a.x.lessThan(3.5)), () => {
    p.y.addAssign(sin(time.mul(a.z).add(b.x)).mul(a.w));
  }).ElseIf(a.x.greaterThan(3.5), () => {
    const t = fract(time.mul(a.z).add(b.x));
    p.assign(p.mul(t.mul(0.9).add(0.5)).add(vec3(0, t.mul(0.9), 0)));
  });
  lift.assign(sin(time.mul(3).add(b.z)).mul(b.y));
  return lift;
}

// The BatchedMesh fallback (devices without indirect-first-instance; gpu-batch.js is the GPU-driven path). The batch
// node has already applied the batching matrix to positionLocal, so this rebuilds it. Normals are not re-rotated.
export function animateBatch(material, mesh, uniforms) {
  const time = uniform(0), data = texture(uniforms.cosmeticData.value), matrices = texture(mesh._matricesTexture);
  material.positionNode = Fn(() => {
    const id = int(batchIndirectIndex), animated = attribute('cosmetic', 'float').greaterThan(0.5);
    const j = id.mul(2), w = int(64);
    const a = textureLoad(data, ivec2(j.mod(w), j.div(w))).toVar(), b = textureLoad(data, ivec2(j.add(1).mod(w), j.add(1).div(w))).toVar();
    const size = int(textureSize(matrices, 0).x), k = id.mul(4), x = k.mod(size), y = k.div(size);
    const batching = mat4(textureLoad(matrices, ivec2(x, y)), textureLoad(matrices, ivec2(x.add(1), y)),
      textureLoad(matrices, ivec2(x.add(2), y)), textureLoad(matrices, ivec2(x.add(3), y)));
    const p = vec3(positionGeometry).toVar(), lift = float(0).toVar();
    If(animated, () => { lift.assign(cosmeticParts(a, b, time, p)); });
    return select(animated, batching.mul(vec4(p, 1)).xyz.add(vec3(0, lift, 0)), positionLocal);
  })();
  return {
    time, data, matrices,
    // Capacity growth replaces both textures; point the nodes at the current ones before each frame.
    sync() { time.value = uniforms.cosmeticTime.value; data.value = uniforms.cosmeticData.value; matrices.value = mesh._matricesTexture; },
  };
}

// grass.js: wind sway, and no blades in unexplored fog, on buildings, ore or shallows.
export function grassMaterial(params, { mask, size, time, fog }) {
  const material = new MeshStandardNodeMaterial(params);
  const grassTime = uniform(0).onRenderUpdate(() => time.value), showFog = uniform(1).onRenderUpdate(() => fog.value);
  // The InstancedMesh sits at the origin, so the instanced position is already in world space.
  material.positionNode = positionLocal.add(vec3(sin(grassTime.mul(1.7).add(positionLocal.x.mul(0.8)).add(positionLocal.z.mul(0.5)))
    .mul(positionGeometry.y).mul(0.18), 0, 0));
  material.colorNode = Fn(() => {
    const state = texture(mask, positionWorld.xz.div(size));
    Discard(state.g.greaterThan(0.5).or(showFog.greaterThan(0.5).and(state.r.lessThan(0.1))));
    return materialColor.mul(select(showFog.greaterThan(0.5), mix(0.28, 1, state.r), float(1)));
  })();
  return material;
}

// terrain.js water: darker shallows by the shore, clearer fords, and animated foam.
export function waterMaterial(params, { time }) {
  const material = new MeshPhysicalNodeMaterial(params);
  const waterTime = uniform(0).onRenderUpdate(() => time.value);
  const shore = attribute('shore', 'float'), ford = attribute('ford', 'float'), world = positionGeometry.xz;
  const shallows = max(float(1).sub(smoothstep(0.8, 2.7, shore)), ford);
  const foam = pow(sin(world.x.mul(3).add(world.y.mul(4)).sub(waterTime.mul(0.8))).mul(0.5).add(0.5), 8);
  let color = mix(materialColor.rgb, vec3(0.16, 0.31, 0.25), shallows.mul(0.5));
  color = mix(color, vec3(0.22, 0.5, 0.47), ford.mul(0.5));
  material.colorNode = color.add(max(float(1).sub(smoothstep(0.85, 1.25, shore)), ford.mul(0.3)).mul(foam).mul(0.16));
  material.opacityNode = materialOpacity.mul(float(1).sub(ford.mul(0.15)));
  return material;
}
