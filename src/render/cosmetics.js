import * as THREE from 'three';

// Shader motion modes (cosmeticMatrix in GLSL below): 1 spin, 2 sway, 3 float, 4 rising smoke, 5 a fish's leap,
// 6 a spreading ripple; any part can also bob. Leap and ripple use `axis` for the share of each cycle they show.
const SPIN = 1, SWAY = 2, FLOAT = 3, SMOKE = 4, LEAP = 5, RIPPLE = 6, AXIS_INDEX = { x: 0, y: 1, z: 2 };
// A leap every ~2.9 s: airborne for 30% of it; a ripple spreads where it leaves the water and where it lands.
const LEAP_SPEED = 0.35, LEAP_SHARE = 0.3;

// Tags every mesh under `root` with its motion; the batch uploads it once per instance.
function markMotion(root, motion) {
  root?.traverse(part => { if (part.isMesh) part.userData.cosmetic = { ...part.userData.cosmetic, ...motion }; });
}

// Per-part parameters, not per-frame poses. The gallery keeps its CPU animation path.
export function prepareCosmetics(group, entity) {
  const anim = group.userData.anim;
  group.userData.gpuCosmetics = true;
  if (anim.type === 'building') {
    markMotion(anim.flag, { mode: SWAY, axis: 1, speed: 3, amplitude: 0.35 });
    for (const spinner of anim.spinners ?? []) {
      markMotion(spinner.p, { mode: SPIN, axis: AXIS_INDEX[spinner.axis], speed: spinner.speed });
    }
    for (const floater of anim.floaters ?? []) {
      markMotion(floater.p, { mode: FLOAT, speed: floater.speed, amplitude: floater.amp, phase: floater.phase });
    }
    for (const puff of anim.smoke ?? []) markMotion(puff.p, { mode: SMOKE, speed: 0.35, phase: puff.phase });
  } else if (anim.type === 'ship') {
    markMotion(anim.body, { bob: 0.025, bobPhase: entity.id });
  } else if (anim.fish) {
    const { rings, leaper, ripples } = anim.fish, phase = entity.id * 0.618 % 1;
    for (const ring of rings) markMotion(ring.p, { mode: SPIN, axis: 1, speed: ring.speed });
    markMotion(leaper, { mode: LEAP, axis: LEAP_SHARE, speed: LEAP_SPEED, amplitude: 0.42, phase });
    markMotion(ripples[0], { mode: RIPPLE, axis: 0.4, speed: LEAP_SPEED, amplitude: 0.8, phase });
    markMotion(ripples[1], { mode: RIPPLE, axis: 0.4, speed: LEAP_SPEED, amplitude: 0.8, phase: phase - LEAP_SHARE });
    markMotion(ripples[2], { mode: RIPPLE, axis: 0.8, speed: 0.4, amplitude: 1.1, phase: phase + 0.5 });
  } else if (anim.type === 'drone') {
    markMotion(anim.body, { bob: 0.055, bobPhase: entity.id });
    anim.rotors.forEach((rotor, i) => markMotion(rotor, { mode: SPIN, axis: 1, speed: i % 2 ? 35 : -35 }));
  }
}

export function createCosmetics(capacity) {
  const uniforms = { cosmeticTime: { value: 0 }, cosmeticData: { value: null } };
  let data, texture;
  // Two RGBA texels per instance in a 64-texel-wide float texture.
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
    set(id, motion = {}) {
      data.set([motion.mode ?? 0, motion.axis ?? 1, motion.speed ?? 0, motion.amplitude ?? 0,
        motion.phase ?? 0, motion.bob ?? 0, motion.bobPhase ?? 0, 0], id * 8);
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
      material.customProgramCacheKey = () => `${key}-cosmetics-v2`;
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
  } else if (a.x > 3.5 && a.x < 4.5) {
    float k = fract(cosmeticTime * a.z + b.x);
    base[3].xyz += base[1].xyz * k * 0.9;
    float scale = 0.5 + k * 0.9;
    base[0].xyz *= scale; base[1].xyz *= scale; base[2].xyz *= scale;
  } else if (a.x > 4.5) {
    // Leap and ripple run for the first a.y of each cycle and collapse to a point (draw nothing) for the rest.
    float u = fract(cosmeticTime * a.z + b.x) / a.y;
    if (u > 1.0) {
      base[0].xyz *= 0.0; base[1].xyz *= 0.0; base[2].xyz *= 0.0;
    } else if (a.x < 5.5) {
      // an arc a.w high, 0.6 long along the fish, nose up as it leaves the water and down as it dives
      float pitch = (u - 0.5) * 2.2, c = cos(pitch), s = sin(pitch);
      base[3].xyz += base[1].xyz * (sin(3.14159 * u) * a.w) + base[2].xyz * ((u - 0.5) * 0.6);
      mat4 r = mat4(1.0);
      r[1].yz = vec2(c, s); r[2].yz = vec2(-s, c);
      base = base * r;
    } else {
      // a flat ring growing to (0.2 + a.w) times its size and sinking under the water as it fades
      float spread = 0.2 + u * a.w;
      base[3].xyz -= base[1].xyz * (u * u * 0.06);
      base[0].xyz *= spread; base[2].xyz *= spread;
    }
  }
  base[3].y += sin(cosmeticTime * 3.0 + b.z) * b.y;
  return base;
}
#endif
`;
