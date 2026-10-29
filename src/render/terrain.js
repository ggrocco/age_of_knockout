import * as THREE from 'three';
import { createGrass } from './grass.js';
import { bakeTerrain } from './terrain-bake.js';

const TEXTURE_SIDE = 128; // the tiling bump and water normal textures

// Visual noise has its own seed; it never consumes the simulation's RNG.
function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

// Distance (up to 4 tiles) from each tile to the nearest tile on the other side of the waterline; gives shores a
// sand / shallow-water fringe.
function shoreDistances(size, waterAt) {
  const shore = new Float32Array(size * size).fill(4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      if (waterAt(x, y) !== waterAt(x + dx, y + dy)) shore[y * size + x] = Math.min(shore[y * size + x], Math.hypot(dx, dy));
    }
  }
  return shore;
}

// The shore distance at any point, bilinear between tile centres (clamped at the map's edge).
function shoreSampler(shore, size) {
  const at = (x, y) => shore[Math.max(0, Math.min(size - 1, y)) * size + Math.max(0, Math.min(size - 1, x))];
  return (x, y) => {
    const ix = Math.floor(x - 0.5), iy = Math.floor(y - 0.5), u = x - 0.5 - ix, v = y - 0.5 - iy;
    return (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v)
      + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v;
  };
}

function repeatingTexture(data) {
  const texture = new THREE.DataTexture(data, TEXTURE_SIDE, TEXTURE_SIDE);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

// Fine grey noise that roughens the ground's lighting, repeated every 4 tiles.
function createBumpTexture(seed, size) {
  const micro = new Uint8Array(TEXTURE_SIDE * TEXTURE_SIDE * 4);
  for (let i = 0; i < TEXTURE_SIDE * TEXTURE_SIDE; i++) {
    const value = 115 + hash(i % TEXTURE_SIDE, i / TEXTURE_SIDE | 0, seed) * 110;
    micro.set([value, value, value, 255], i * 4);
  }
  const texture = repeatingTexture(micro);
  texture.repeat.set(size / 4, size / 4); texture.needsUpdate = true;
  return texture;
}

// Water remains clipped to the simulation grid; its normal map animates without
// altering the ground used for picking or pathfinding. Shallows (tile 4, where soldiers wade) are water too, drawn
// lighter and clearer over their sandy bed: `ford` is 1 on their vertices.
function createWaterGeometry(size, tiles, waterAt, shoreAt) {
  const positions = [], uvs = [], shores = [], fords = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (waterAt(x, y) || tiles[y * size + x] === 4) {
    const ford = tiles[y * size + x] === 4 ? 1 : 0;
    for (const [px, py] of [[x,y], [x,y+1], [x+1,y], [x+1,y], [x,y+1], [x+1,y+1]]) {
      positions.push(px, 0.025, py); uvs.push(px / 4, py / 4); shores.push(shoreAt(px, py)); fords.push(ford);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('shore', new THREE.Float32BufferAttribute(shores, 1));
  geometry.setAttribute('ford', new THREE.Float32BufferAttribute(fords, 1));
  geometry.computeVertexNormals();
  return geometry;
}

// Three crossing wave trains, tiling seamlessly, as a normal map.
function createWaveNormals() {
  const normalData = new Uint8Array(TEXTURE_SIDE * TEXTURE_SIDE * 4), tau = Math.PI * 2;
  for (let y = 0; y < TEXTURE_SIDE; y++) for (let x = 0; x < TEXTURE_SIDE; x++) {
    const u = x / TEXTURE_SIDE * tau, v = y / TEXTURE_SIDE * tau;
    const dx = Math.cos(u * 4 + v * 3) * 0.4 + Math.cos(u * 9 - v * 5) * 0.25 + Math.cos(u * 16 + v * 13) * 0.12;
    const dy = Math.cos(u * 4 + v * 3) * 0.3 - Math.cos(u * 9 - v * 5) * 0.15 + Math.cos(u * 16 + v * 13) * 0.10;
    const normal = new THREE.Vector3(-dx, -dy, 1).normalize();
    const rgba = [(normal.x * 0.5 + 0.5) * 255, (normal.y * 0.5 + 0.5) * 255, (normal.z * 0.5 + 0.5) * 255, 255];
    normalData.set(rgba, (y * TEXTURE_SIDE + x) * 4);
  }
  const texture = repeatingTexture(normalData);
  texture.needsUpdate = true;
  return texture;
}

const WATER_VERTEX_HEAD = 'attribute float shore; attribute float ford; '
  + 'varying float waterShore; varying float waterFord; varying vec2 waterWorld;\n';
const WATER_FRAGMENT_HEAD = 'uniform float waterTime; varying float waterShore; varying float waterFord; varying vec2 waterWorld;\n';
// Shallows and fords tint the water and let more of the bed through; foam lines run along the shore.
const WATER_COLOR = `#include <color_fragment>
        float shallows = max(1.0 - smoothstep(0.8, 2.7, waterShore), waterFord);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.31, 0.25), shallows * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.22, 0.5, 0.47), waterFord * 0.5);
        diffuseColor.a *= 1.0 - waterFord * 0.15;
        float foam = pow(0.5 + 0.5 * sin(waterWorld.x * 3.0 + waterWorld.y * 4.0 - waterTime * 0.8), 8.0);
        diffuseColor.rgb += max(1.0 - smoothstep(0.85, 1.25, waterShore), waterFord * 0.3) * foam * 0.16;
      `;
function createWaterMaterial(normalTexture, waterTime) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x3c7776, normalMap: normalTexture, normalScale: new THREE.Vector2(0.32, 0.32),
    roughness: 0.22, metalness: 0.18, clearcoat: 0.65, clearcoatRoughness: 0.22,
    envMapIntensity: 1.1, transparent: true, opacity: 0.78, depthWrite: false,
  });
  material.onBeforeCompile = shader => {
    shader.uniforms.waterTime = waterTime;
    shader.vertexShader = `${WATER_VERTEX_HEAD}${shader.vertexShader}`
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nwaterShore = shore; waterFord = ford; waterWorld = position.xz;');
    shader.fragmentShader = `${WATER_FRAGMENT_HEAD}${shader.fragmentShader}`
      .replace('#include <color_fragment>', WATER_COLOR);
  };
  material.customProgramCacheKey = () => 'water-shore-v2';
  return material;
}

// Red = knowledge/visibility, green = occupancy. Decorative grass never reveals
// unseen terrain or pokes through completed or newly placed buildings.
function updateGrassMask(maskData, game, size, tiles) {
  const player = game.players[0];
  for (let i = 0; i < size * size; i++) {
    maskData[i * 4] = player.visible[i] ? 255 : player.explored[i] ? 100 : 0;
    maskData[i * 4 + 1] = game.occAt(i % size, i / size | 0) || tiles[i] >= 2 ? 255 : 0; // no grass on ore or shallows either
    maskData[i * 4 + 3] = 255;
  }
}

export function createTerrain(game, renderer, preset) {
  const { size, tiles } = game.map;
  const waterAt = (x, y) => x >= 0 && y >= 0 && x < size && y < size && tiles[y * size + x] === 1;
  const shore = shoreDistances(size, waterAt), shoreAt = shoreSampler(shore, size);
  const baked = bakeTerrain(renderer, game.map, game.seed, shore), texture = baked.texture;
  const geometry = new THREE.PlaneGeometry(size, size);
  const bumpTexture = createBumpTexture(game.seed, size);
  const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: bumpTexture, bumpScale: 0.045, roughness: 0.96 });
  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2; ground.position.set(size / 2, 0, size / 2); ground.receiveShadow = true;

  const waterGeometry = createWaterGeometry(size, tiles, waterAt, shoreAt);
  const normalTexture = createWaveNormals();
  const waterTime = { value: 0 };
  const water = new THREE.Mesh(waterGeometry, createWaterMaterial(normalTexture, waterTime));
  water.raycast = () => {};

  const maskData = new Uint8Array(size * size * 4), mask = new THREE.DataTexture(maskData, size, size);
  mask.magFilter = mask.minFilter = THREE.NearestFilter;
  const grass = createGrass(game, mask);
  grass.setCount(preset.grass);
  let maskStamp = -1, terrainStamp = game.terrainVersion;
  return {
    ground, water, grass: grass.mesh,
    setQuality(next) { grass.setCount(next.grass); },
    // The small grid is uploaded only when ore patches change; pixels are repainted on the GPU.
    refresh() {
      if (terrainStamp === game.terrainVersion) return;
      baked.refresh(game.terrainVersion);
      terrainStamp = game.terrainVersion;
    },
    update(t, fogEnabled = true) {
      waterTime.value = t;
      normalTexture.offset.set(t * 0.008 % 1, t * 0.005 % 1);
      grass.update(t, fogEnabled);
      // Vision only changes every 4 ticks.
      if (maskStamp !== game.time && (game.time % 4 === 0 || maskStamp < 0)) {
        maskStamp = game.time;
        updateGrassMask(maskData, game, size, tiles);
        mask.needsUpdate = true;
      }
    },
    dispose() { baked.dispose(); bumpTexture.dispose(); normalTexture.dispose(); mask.dispose(); },
  };
}
