import * as THREE from 'three';
import { UNITS } from '../data/units.js';
import { MODEL_MATERIAL } from './models.js';

// Fire, smoke and dust in one draw call. Each particle is written once, when it is born, into a ring of instanced
// attributes (start, velocity, birth and life, size, kind); the vertex shader moves, grows and fades it from then on,
// so the CPU only writes new particles. Premultiplied blending (ONE, ONE_MINUS_SRC_ALPHA) lets one material draw
// both alpha-blended smoke and dust and additive fire (fire writes zero alpha). Fire is HDR, so the Ultra bloom
// haloes it. Render only: the sim never sees particles, and nothing here is deterministic.

const KIND = { fire: 0, smoke: 1, dust: 2, debris: 3 };
// Particles per second for a moving unit, by unit class; villagers walk all game and kick up none.
const DUST_RATE = { cav: 5, siege: 4, inf: 1.2, archer: 1.2 };
const WIND = [0.18, 0, 0.1];

// `budget`: { capacity, rate } from the quality preset (render/quality.js).
export function createParticles(budget, random = Math.random) {
  let capacity = budget.capacity, rate = budget.rate, next = 0, lastTime = null;
  const quad = new THREE.PlaneGeometry(1, 1), geometry = new THREE.InstancedBufferGeometry();
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.attributes.position);
  geometry.setAttribute('uv', quad.attributes.uv);
  const attributes = {};
  function allocate() {
    for (const name of ['start', 'motion', 'look']) {
      const attribute = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
      attribute.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute(name, attributes[name] = attribute);
    }
    // Unborn slots: born far in the future, so the vertex shader drops them.
    for (let i = 0; i < capacity; i++) attributes.start.array[i * 4 + 3] = 1e9;
    geometry.instanceCount = capacity; next = 0;
  }
  allocate();
  const uniforms = { time: { value: 0 }, wind: { value: new THREE.Vector3(...WIND) } };
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT,
    transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.raycast = () => {};
  mesh.userData.skipAO = true; // never an occluder in the AO pass
  const touched = [];

  // One particle: position, velocity, life (s), start and end size (tiles), kind.
  function emit(x, y, z, vx, vy, vz, life, size0, size1, kind) {
    const i = next; next = (next + 1) % capacity;
    attributes.start.array.set([x, y, z, uniforms.time.value], i * 4);
    attributes.motion.array.set([vx, vy, vz, life], i * 4);
    attributes.look.array.set([size0, size1, kind, random()], i * 4);
    touched.push(i);
  }
  const spread = s => (random() - 0.5) * s;
  const emitters = {
    fire(x, y, z, heat) { emit(x, y, z, spread(0.3), 0.8 + random() * 0.6, spread(0.3), 0.6 + random() * 0.4, 0.55 + heat * 0.35, 0.12, KIND.fire); },
    smoke(x, y, z, heat) { emit(x, y, z, spread(0.2), 0.45 + random() * 0.3, spread(0.2), 2.6 + random() * 1.4, 0.6 + heat * 0.3, 1.8 + heat * 0.9, KIND.smoke); },
    dust(x, y, z) { emit(x, y, z, spread(0.5), 0.15 + random() * 0.2, spread(0.5), 1.1 + random() * 0.6, 0.35, 1.1, KIND.dust); },
    debris(x, y, z, push) {
      const a = random() * Math.PI * 2, s = push * (0.6 + random());
      emit(x, y, z, Math.cos(a) * s, 2.5 + random() * 2.5, Math.sin(a) * s, 1 + random() * 0.6, 0.12, 0.1, KIND.debris);
    },
  };
  // Fractional rates accumulate per emitter key on the group, so a slow trickle still comes out right.
  function trickle(data, key, perSecond, dt, spawn) {
    data[key] = (data[key] ?? random()) + perSecond * dt;
    for (; data[key] >= 1; data[key]--) spawn();
  }
  // The building's model (not its ring or health bar), in world space, measured once: buildings do not move.
  function buildingBox(group) {
    const data = group.userData;
    if (!data.box) {
      data.box = new THREE.Box3();
      group.traverse(o => { if (o.isMesh && o.material === MODEL_MATERIAL) data.box.expandByObject(o); });
    }
    return data.box;
  }
  function burn(group, e, dt) {
    const health = e.hp / e.maxHp;
    if (!e.constructed || health >= 0.5 || !(e.hp > 0)) return;
    const heat = 1 - health / 0.5, box = buildingBox(group), size = e.size ?? 2;
    if (box.isEmpty()) return;
    // Low on the roof: the box's top is often a flagpole or spire, not the roof.
    const at = () => [box.min.x + (0.15 + random() * 0.7) * (box.max.x - box.min.x),
      box.min.y + (0.3 + random() * 0.35) * (box.max.y - box.min.y), box.min.z + (0.15 + random() * 0.7) * (box.max.z - box.min.z)];
    const scale = rate * size / 2;
    trickle(group.userData, 'fireAcc', (3 + heat * 9) * scale, dt, () => emitters.fire(...at(), heat));
    trickle(group.userData, 'smokeAcc', (1.5 + heat * 4) * scale, dt, () => emitters.smoke(...at(), heat));
  }
  // Moving is judged from how far the group went since the last frame: the view's own flag reads false whenever
  // frames are slow enough for a unit to snap to its sim position.
  function kickDust(group, e, dt) {
    const unit = UNITS[e.type], data = group.userData, { x, z } = group.position, from = data.dustFrom;
    data.dustFrom = [x, z];
    if (!from || !unit || unit.naval || !DUST_RATE[unit.cls] || Math.hypot(x - from[0], z - from[1]) < 0.3 * dt) return;
    trickle(group.userData, 'dustAcc', DUST_RATE[unit.cls] * rate, dt, () => emitters.dust(x + spread(0.4), 0.05, z + spread(0.4)));
  }

  return {
    mesh,
    // Every frame, with the view's animation time (frozen while paused: nothing is born then).
    update(t, groups) {
      const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, t - lastTime));
      lastTime = t; uniforms.time.value = t;
      if (dt > 0) for (const group of groups) {
        const e = group.userData.entity;
        if (e?.kind === 'building') burn(group, e, dt);
        else if (e?.kind === 'unit') kickDust(group, e, dt);
      }
      flush();
    },
    // A building destroyed: a ball of fire, smoke and flying debris over its footprint. A unit killed: a puff of dust.
    burst(group, e) {
      if (e.kind === 'building') {
        const box = buildingBox(group), size = e.size ?? 2, n = Math.round(size * 6 * Math.max(0.5, rate));
        if (box.isEmpty()) return;
        const c = box.getCenter(new THREE.Vector3());
        for (let i = 0; i < n * 2; i++) emitters.fire(c.x + spread(size * 0.7), c.y * 0.6, c.z + spread(size * 0.7), 1.6);
        for (let i = 0; i < n; i++) emitters.smoke(c.x + spread(size * 0.7), c.y * 0.5, c.z + spread(size * 0.7), 1.6);
        for (let i = 0; i < n; i++) emitters.debris(c.x + spread(size * 0.5), c.y * 0.5, c.z + spread(size * 0.5), size * 0.4);
        for (let i = 0; i < n; i++) emitters.dust(c.x + spread(size), 0.05, c.z + spread(size));
      } else if (e.kind === 'unit' && !UNITS[e.type]?.naval) {
        const { x, z } = group.position;
        for (let i = 0; i < 4; i++) emitters.dust(x + spread(0.5), 0.05, z + spread(0.5));
      }
    },
    setQuality(next) {
      rate = next.rate;
      if (next.capacity !== capacity) { capacity = next.capacity; allocate(); }
    },
    get alive() { let n = 0; const s = attributes.start.array, m = attributes.motion.array, t = uniforms.time.value; for (let i = 0; i < capacity; i++) if (t - s[i * 4 + 3] < m[i * 4 + 3] && s[i * 4 + 3] <= t) n++; return n; },
    get capacity() { return capacity; },
    dispose() { geometry.dispose(); quad.dispose(); material.dispose(); },
  };

  // Uploads only the slots written since the last frame: the ring makes them at most two runs.
  function flush() {
    if (!touched.length) return;
    const runs = [];
    for (const i of touched) {
      const last = runs[runs.length - 1];
      if (last && i === last[1] + 1) last[1] = i; else runs.push([i, i]);
    }
    for (const attribute of Object.values(attributes)) {
      for (const [a, b] of runs) attribute.addUpdateRange(a * 4, (b - a + 1) * 4);
      attribute.needsUpdate = true;
    }
    touched.length = 0;
  }
}

const VERTEX = /* glsl */`
  attribute vec4 start, motion, look;
  uniform float time;
  uniform vec3 wind;
  varying vec2 vUv;
  varying float vAge, vKind, vSeed;
  void main() {
    float t = time - start.w, life = motion.w, age = t / life;
    vUv = uv; vAge = age; vKind = look.z; vSeed = look.w;
    if (age < 0.0 || age > 1.0) { gl_Position = vec4(0.0, 0.0, 2.0, 1.0); return; } // unborn or dead: clipped away
    vec3 p = start.xyz + motion.xyz * t;
    if (look.z < 0.5) p.y += 0.4 * t * t;                       // fire licks upward faster
    else if (look.z < 1.5) p += wind * t * t * 0.25 - vec3(0.0, 0.05 * t * t, 0.0); // smoke drifts and slows
    else if (look.z < 2.5) p += wind * t * 0.3;                 // dust drifts
    else p.y = max(0.03, p.y - 4.9 * t * t);                    // debris falls back down
    float size = mix(look.x, look.y, age);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 world = p + (right * position.x + up * position.y) * size;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }`;

const FRAGMENT = /* glsl */`
  varying vec2 vUv;
  varying float vAge, vKind, vSeed;
  void main() {
    vec2 d = vUv * 2.0 - 1.0;
    float r = length(d);
    if (r > 1.0) discard;
    // A little lumpiness so puffs are not perfect discs.
    float lump = 0.92 + 0.08 * sin(atan(d.y, d.x) * 3.0 + vSeed * 40.0);
    float soft = smoothstep(1.0, 0.25, r / lump);
    // Straight colour and coverage first; tone mapping and the sRGB encode (direct rendering, Balanced) must see the
    // straight colour, or faint smoke comes out far too bright. Premultiplied last.
    vec3 rgb; float a; bool additive = false;
    if (vKind < 0.5) {         // fire: yellow core to red, additive and HDR so the bloom picks it up
      // (Kept below white after tone mapping: hotter values read as white specks, not flame.)
      rgb = mix(vec3(2.0, 1.15, 0.35), vec3(1.4, 0.38, 0.06), smoothstep(0.0, 0.6, vAge));
      a = soft * soft * (1.0 - vAge * vAge); additive = true;
    } else if (vKind < 1.5) {  // smoke: dark and grey, thinning as it spreads
      rgb = vec3(mix(0.05, 0.28, vAge));
      a = soft * 0.75 * (1.0 - vAge) * smoothstep(0.0, 0.08, vAge);
    } else if (vKind < 2.5) {  // dust: earth-coloured haze
      rgb = vec3(0.74, 0.66, 0.52);
      a = soft * 0.5 * (1.0 - vAge) * smoothstep(0.0, 0.1, vAge);
    } else {                   // debris: dark chunks
      rgb = vec3(0.16, 0.12, 0.09);
      a = step(r, 0.7) * (1.0 - smoothstep(0.85, 1.0, vAge));
    }
    gl_FragColor = vec4(rgb, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor = vec4(gl_FragColor.rgb * a, additive ? 0.0 : a);
  }`;
