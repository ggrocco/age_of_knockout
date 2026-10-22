import * as THREE from 'three';

// Per-part parameters, not per-frame poses. The gallery keeps its CPU animation path.
export function prepareCosmetics(group, entity) {
  const a = group.userData.anim;
  group.userData.gpuCosmetics = true;
  const mark = (root, motion) => root?.traverse(o => { if (o.isMesh) o.userData.cosmetic = { ...o.userData.cosmetic, ...motion }; });
  if (a.type === 'building') {
    mark(a.flag, { mode: 2, axis: 1, speed: 3, amplitude: 0.35 });
    for (const s of a.spinners ?? []) mark(s.p, { mode: 1, axis: { x: 0, y: 1, z: 2 }[s.axis], speed: s.speed });
    for (const f of a.floaters ?? []) mark(f.p, { mode: 3, speed: f.speed, amplitude: f.amp, phase: f.phase });
    for (const s of a.smoke ?? []) mark(s.p, { mode: 4, speed: 0.35, phase: s.phase });
  } else if (a.type === 'drone') {
    mark(a.body, { bob: 0.055, bobPhase: entity.id });
    a.rotors.forEach((p, i) => mark(p, { mode: 1, axis: 1, speed: i % 2 ? 35 : -35 }));
  }
}

export function createCosmetics(capacity) {
  const uniforms = { cosmeticTime: { value: 0 }, cosmeticData: { value: null } };
  let data, texture;
  function resize(count) {
    const next = new Float32Array(Math.ceil(count * 2 / 64) * 64 * 4);
    if (data) next.set(data.subarray(0, next.length));
    texture?.dispose(); data = next;
    texture = new THREE.DataTexture(data, 64, next.length / 256, THREE.RGBAFormat, THREE.FloatType);
    texture.needsUpdate = true; uniforms.cosmeticData.value = texture;
  }
  resize(capacity);
  return {
    uniforms, resize,
    set(id, p = {}) {
      data.set([p.mode ?? 0, p.axis ?? 1, p.speed ?? 0, p.amplitude ?? 0,
        p.phase ?? 0, p.bob ?? 0, p.bobPhase ?? 0, 0], id * 8);
      texture.needsUpdate = true;
    },
    patch(material) {
      const compile = material.onBeforeCompile, key = material.customProgramCacheKey();
      material.onBeforeCompile = function(shader, renderer) {
        compile.call(this, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = `${GLSL}\n${shader.vertexShader}`.replace('#include <batching_vertex>', `#include <batching_vertex>
          #ifdef USE_BATCHING
            if (cosmetic > 0.5) batchingMatrix = cosmeticMatrix(batchingMatrix, getIndirectIndex(gl_DrawID));
          #endif`);
      };
      material.customProgramCacheKey = () => `${key}-cosmetics-v1`;
      return material;
    },
    dispose() { texture.dispose(); },
  };
}

// Modifying batchingMatrix also transforms normals, shadow coordinates and AO normals.
const GLSL = `
#ifdef USE_BATCHING
attribute float cosmetic;
uniform float cosmeticTime;
uniform highp sampler2D cosmeticData;
mat4 cosmeticMatrix(mat4 base, float instanceId) {
  int j = int(instanceId) * 2;
  vec4 a = texelFetch(cosmeticData, ivec2(j % 64, j / 64), 0);
  vec4 b = texelFetch(cosmeticData, ivec2((j + 1) % 64, (j + 1) / 64), 0);
  if (a.x > 0.5 && a.x < 2.5) {
    float angle = a.x < 1.5 ? cosmeticTime * a.z : sin(cosmeticTime * a.z + b.x) * a.w;
    float c = cos(angle), s = sin(angle);
    mat4 r = mat4(1.0);
    if (a.y < 0.5) { r[1].yz = vec2(c,s); r[2].yz = vec2(-s,c); }
    else if (a.y < 1.5) { r[0].xz = vec2(c,-s); r[2].xz = vec2(s,c); }
    else { r[0].xy = vec2(c,s); r[1].xy = vec2(-s,c); }
    base = base * r;
  } else if (a.x > 2.5 && a.x < 3.5) {
    base[3].xyz += base[1].xyz * (sin(cosmeticTime * a.z + b.x) * a.w);
  } else if (a.x > 3.5) {
    float k = fract(cosmeticTime * a.z + b.x);
    base[3].xyz += base[1].xyz * k * 0.9;
    float scale = 0.5 + k * 0.9;
    base[0].xyz *= scale; base[1].xyz *= scale; base[2].xyz *= scale;
  }
  base[3].y += sin(cosmeticTime * 3.0 + b.z) * b.y;
  return base;
}
#endif
`;
