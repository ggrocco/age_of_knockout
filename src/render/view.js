import * as THREE from 'three';
import { BUILDINGS } from '../data/buildings.js';
import { buildModel, animate, unitEra, TEAM, MODEL_MATERIAL } from './models.js';
import { createModelBatch, PROXY_LAYER } from './batch.js';
import { prepareCosmetics } from './cosmetics.js';
import { createContactShadows } from './contact-shadows.js';
import { createTerrain } from './terrain.js';
import { QUALITY, readQuality, saveQuality, validQuality, renderPixelRatio } from './quality.js';
import { viewHalfHeight } from './camera-fit.js';
import { createSkyLighting, createLightingEffects } from './lighting.js';

let sessionQuality = null;
const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|basic render/i;

export const OWNER_COLOR = TEAM;
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ring: new THREE.RingGeometry(0.55, 0.7, 24),
  plane: new THREE.PlaneGeometry(1, 1),
  selection: new THREE.RingGeometry(0.94, 1, 48),
};
for (const geometry of Object.values(geo)) geometry.userData.shared = true;
// Selection rings and HP bars are created on first use and share these.
const overlay = {
  ring: new THREE.MeshBasicMaterial({ color: 0xf3df93, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  barBg: new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false }),
  barFg: [0x22c55e, 0xeab308, 0xef4444].map(color => new THREE.MeshBasicMaterial({ color, depthTest: false })),
};
for (const material of [overlay.ring, overlay.barBg, ...overlay.barFg]) material.userData.shared = true;
const noRaycast = () => {};
const GHOST_OK = 0x22c55e, GHOST_BAD = 0xef4444;
const CAMERA_DIRECTION = new THREE.Vector3(1, 1.05, 1).normalize();
const LIE_FLAT = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
const scratchQuaternion = new THREE.Quaternion();

// Cached model geometry/materials belong to the module; everything else to this view.
function disposeObject(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(object => {
    if (object.geometry && !object.geometry.userData.shared) geometries.add(object.geometry);
    const ownMaterials = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of ownMaterials) {
      if (material.userData.shared) continue;
      materials.add(material);
      if (material.map) textures.add(material.map);
    }
  });
  textures.forEach(texture => texture.dispose());
  materials.forEach(material => material.dispose());
  geometries.forEach(geometry => geometry.dispose());
}

// With hardware acceleration off (or the GPU blocklisted) the browser rasterises on the CPU.
function detectGpu(renderer) {
  const gl = renderer.getContext(), gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(gl.getParameter(gpuInfo ? gpuInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return { gpu, softwareGpu: SOFTWARE_GPU.test(gpu) };
}

// Hemisphere light, sky reflections and the shadow-casting sun, which placeCamera keeps over the focus.
function addLights(scene, renderer, preset) {
  scene.add(new THREE.HemisphereLight(0xc9deeb, 0x776342, 1.55));
  const skyLighting = renderer.extensions.has('EXT_color_buffer_float') ? createSkyLighting(renderer) : null;
  scene.environment = skyLighting?.texture ?? null;
  scene.environmentIntensity = 0.4;
  const sun = new THREE.DirectionalLight(0xffe5ba, 3.3);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(Math.min(preset.shadows, renderer.capabilities.maxTextureSize));
  sun.shadow.radius = 2.5; sun.shadow.intensity = 0.85;
  sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
  scene.add(sun, sun.target);
  return { sun, skyLighting };
}

// Fog of war: an N×N canvas over the map, black where unexplored and dimmed where explored but out of sight.
function createFogOverlay(scene, game, size) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d'), image = context.createImageData(size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  const fog = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
  fog.rotation.x = -Math.PI / 2; fog.scale.set(size, size, 1); fog.position.set(size / 2, 0.08, size / 2); fog.renderOrder = 1;
  scene.add(fog);
  let stamp = -1;
  // Vision only changes every 4 ticks.
  function update() {
    if (game.time === stamp || game.time % 4 !== 0 && stamp >= 0) return;
    stamp = game.time;
    const player = game.players[0], pixels = image.data;
    for (let i = 0; i < size * size; i++) {
      pixels[i * 4] = 4; pixels[i * 4 + 1] = 6; pixels[i * 4 + 2] = 4;
      pixels[i * 4 + 3] = player.visible[i] ? 0 : player.explored[i] ? 110 : 235;
    }
    context.putImageData(image, 0, 0);
    texture.needsUpdate = true;
  }
  return { mesh: fog, update };
}

// The soft round contact shadow drawn under every model.
function createBlobShadowMaterial() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const context = canvas.getContext('2d'), gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(20,14,6,0.38)'); gradient.addColorStop(0.45, 'rgba(20,14,6,0.18)');
  gradient.addColorStop(1, 'rgba(20,14,6,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  material.userData.shared = true;
  return { material, texture };
}

// Where an entity stands in the world: a building's centre, a relic raised while carried.
const worldPos = e => e.kind === 'building'
  ? [e.x + e.size / 2, 0, e.y + e.size / 2]
  : [e.x, e.kind === 'relic' ? (e.holder !== null ? 1.35 : 0.2) : 0, e.y];

// The heading an idle unit turns to: its order's target or resource, else null (keep facing).
function idleFacing(game, e) {
  const order = e.order;
  const target = order.target !== undefined ? game.entities.get(order.target)
    : order.res !== undefined ? game.entities.get(order.res) : null;
  if (!target) return null;
  const targetX = target.kind === 'building' ? target.x + target.size / 2 : target.x;
  const targetY = target.kind === 'building' ? target.y + target.size / 2 : target.y;
  return Math.atan2(targetX - e.x, targetY - e.y);
}

// Glides a unit towards its sim position (blend k) and turns it to face where it goes; returns whether it moves.
function moveUnitGroup(game, group, e, x, z, blend, dt) {
  group.position.x += (x - group.position.x) * blend;
  group.position.z += (z - group.position.z) * blend;
  const dx = x - group.position.x, dz = z - group.position.z, moving = Math.hypot(dx, dz) > 0.03;
  const face = moving ? Math.atan2(dx, dz) : idleFacing(game, e);
  if (face !== null) {
    let turn = face - group.rotation.y;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    group.rotation.y += turn * Math.min(1, dt * 12);
  }
  group.position.y = e.relic !== null ? 0.25 : 0;
  return moving;
}

// A hit makes a unit or building "pop" (briefly swell) for 0.12 s.
function updateHitPop(group, data, e, dt) {
  if (e.hp < data.hp - 0.01) data.pop = 0.12;
  data.hp = e.hp;
  if (data.pop > 0) {
    data.pop -= dt;
    group.scale.setScalar(1 + Math.max(0, data.pop) * (e.kind === 'unit' ? 1.6 : 0.25));
  } else group.scale.setScalar(1);
}

// Completed buildings only change with simulation/selection state. Their matrices are frozen after each update.
const freezeMatrix = object => { object.updateMatrix(); object.matrixAutoUpdate = false; };

export function createView(container, game) {
  let storage;
  try { storage = window.localStorage; } catch { /* Storage is optional. */ }
  let qualityName = sessionQuality ?? readQuality(location.search, storage), preset = QUALITY[qualityName];
  // Prefer the discrete GPU on dual-GPU laptops (a hint the browser may ignore).
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  // On a software renderer, drop to the cheapest preset unless the player chose one.
  const { gpu, softwareGpu } = detectGpu(renderer);
  if (softwareGpu) {
    console.warn(`WebGL is using a software renderer (${gpu}); hardware acceleration looks disabled.`);
    if (sessionQuality === null && !new URLSearchParams(location.search).has('quality')) {
      qualityName = 'balanced';
      preset = QUALITY.balanced;
    }
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x20271b);
  // view.frame updates world matrices once, not once per render pass.
  scene.matrixWorldAutoUpdate = false; scene.matrixAutoUpdate = false;
  const { sun, skyLighting } = addLights(scene, renderer, preset), sunOffset = new THREE.Vector3(-22, 38, 16);
  const mapSize = game.map.size;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 250);
  const view = {
    renderer, scene, camera, gpu, softwareGpu, quality: qualityName, zoom: 14,
    focus: new THREE.Vector3(mapSize / 2, 0, mapSize / 2), groups: new Map(), pickables: [], dom: renderer.domElement,
  };
  const batch = createModelBatch(MODEL_MATERIAL);
  scene.add(batch.mesh);
  let effects = createLightingEffects(renderer, scene, camera, preset, batch.cosmetics);
  view.revision = 0;
  view.invalidate = () => { view.revision++; };

  // ---------- camera ----------
  let cameraKey = '';
  // The shadow camera follows the view and covers what it shows (at least 18 tiles, at most the map).
  function fitSunShadow(halfHeight, aspect) {
    const extent = Math.min(mapSize, Math.max(18, halfHeight * Math.max(1, aspect) * 1.4)), shadowCamera = sun.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -extent;
    shadowCamera.right = shadowCamera.top = extent;
    shadowCamera.updateProjectionMatrix();
    sun.target.position.copy(view.focus);
    sun.position.copy(view.focus).add(sunOffset);
  }
  function placeCamera() {
    const width = renderer.domElement.clientWidth || 1, height = renderer.domElement.clientHeight || 1, aspect = width / height;
    const key = `${width},${height},${view.zoom},${view.focus.x},${view.focus.z}`;
    if (key === cameraKey) return;
    cameraKey = key;
    const halfHeight = viewHalfHeight(view.zoom, width, height);
    camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect; camera.top = halfHeight; camera.bottom = -halfHeight;
    camera.updateProjectionMatrix();
    camera.position.copy(view.focus).addScaledVector(CAMERA_DIRECTION, 120);
    camera.lookAt(view.focus);
    camera.updateMatrixWorld(true);
    fitSunShadow(halfHeight, aspect);
  }
  view.refreshCamera = placeCamera;
  view.halfExtents = () => [camera.right, camera.top];
  view.resize = () => {
    const width = Math.max(1, container.clientWidth), height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(renderPixelRatio(width, height, window.devicePixelRatio, preset));
    renderer.setSize(width, height, false);
    view.setZoom(view.zoom);
    cameraKey = '';
    placeCamera();
    effects.resize(width, height);
    view.invalidate();
  };
  view.setQuality = name => {
    if (!validQuality(name)) return;
    sessionQuality = name; saveQuality(name, storage);
    if (name === qualityName) return;
    qualityName = name; preset = QUALITY[name]; view.quality = name;
    effects.dispose();
    effects = createLightingEffects(renderer, scene, camera, preset, batch.cosmetics);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    sun.shadow.mapSize.setScalar(Math.min(preset.shadows, renderer.capabilities.maxTextureSize));
    terrain.setQuality(preset);
    view.resize();
  };
  view.pan = (dx, dz) => {
    view.focus.x = Math.max(0, Math.min(mapSize, view.focus.x + dx));
    view.focus.z = Math.max(0, Math.min(mapSize, view.focus.z + dz));
    view.invalidate();
  };
  // 3 lets a phone close in to ~7 tiles across in portrait; a big screen's width cap must not cost zoom-out reach.
  view.setZoom = zoom => {
    const fit = Math.min(1, viewHalfHeight(1, renderer.domElement.clientWidth, renderer.domElement.clientHeight));
    view.zoom = Math.max(3, Math.min(34 / fit, zoom));
    view.invalidate();
  };
  view.centerOn = (x, y) => { view.focus.set(x, 0, y); view.invalidate(); };

  // ---------- terrain ----------
  const terrain = createTerrain(game, renderer, preset), ground = terrain.ground;
  scene.add(ground, terrain.water, terrain.grass);
  const outer = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({ color: 0x1c2618 })); // the dark border around the map
  outer.rotation.x = -Math.PI / 2; outer.scale.set(mapSize * 3, mapSize * 3, 1); outer.position.set(mapSize / 2, -0.05, mapSize / 2);
  scene.add(outer);
  view.ground = ground;

  const fog = createFogOverlay(scene, game, mapSize);
  view.fogEnabled = true;

  // ---------- entity meshes ----------
  const blobShadow = createBlobShadowMaterial();
  const shadows = createContactShadows(scene, geo.plane, blobShadow.material, () => effects.invalidate());
  const activeGroups = new Set(), dirtyGroups = new Set();
  let groupSeq = 0;
  // The era a model is drawn in: its owner's for a building, the unit's look era (era-units.js) for a unit.
  const lookAge = e => e.kind === 'building' ? game.players[e.owner].age
    : e.kind === 'unit' ? unitEra(e.type, game.players[e.owner]?.age) : null;
  function makeMesh(e) {
    const group = new THREE.Group();
    group.userData = { id: e.id, kind: e.kind, owner: e.owner, hp: e.hp, seq: ++groupSeq };
    const age = lookAge(e);
    const model = buildModel(e, age);
    group.add(model.root);
    group.userData.anim = model.anim;
    group.userData.age = age;
    const blobSize = new THREE.Vector3(model.shadow * 2.8, model.shadow * 2.8, 1);
    group.userData.blob = new THREE.Matrix4().makeTranslation(0, 0.04, 0).multiply(LIE_FLAT).scale(blobSize);
    group.traverse(object => {
      if (!object.isMesh) return;
      if (object.material?.blending === THREE.AdditiveBlending) { object.raycast = noRaycast; return; }
      object.userData.gid = e.id;
    });
    prepareCosmetics(group, e);
    batch.add(group);
    if (e.kind === 'building') {
      // Completed buildings only change with simulation/selection state. The GPU
      // animates their flags, smoke and machinery without walking this hierarchy.
      const update = group.updateMatrixWorld;
      group.updateMatrixWorld = function(force) {
        if (!force && !this.userData.matrixDirty) return;
        this.userData.matrixDirty = false;
        update.call(this, true);
      };
    }
    return group;
  }
  function selectionRing(group) {
    const data = group.userData;
    if (data.ring) return data.ring;
    const ring = data.ring = new THREE.Mesh(geo.selection, overlay.ring);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    const radius = data.kind === 'building' ? data.entity.size * 0.68 : 0.48;
    ring.scale.set(radius, radius, 1); ring.renderOrder = 3; ring.raycast = noRaycast;
    group.add(ring);
    effects.invalidate();
    return ring;
  }
  function healthBar(group) {
    const data = group.userData;
    if (data.bar) return data.bar;
    const e = data.entity, background = new THREE.Mesh(geo.plane, overlay.barBg), fill = new THREE.Mesh(geo.plane, overlay.barFg[0]);
    const bar = new THREE.Group();
    // Overlapping bars stack per entity (background, then fill) in the order their entities appeared.
    background.renderOrder = 4 + data.seq * 1e-6; fill.renderOrder = background.renderOrder + 1e-7;
    background.scale.set(1, 0.14, 1);
    background.raycast = fill.raycast = noRaycast;
    bar.add(background, fill);
    effects.invalidate();
    bar.position.y = e.kind === 'building' ? (e.type === 'farm' ? 0.8 : e.type === 'house' ? 1.8 : 2.6) : 1.5;
    group.add(bar);
    return data.bar = { bar, fg: fill };
  }
  // The bar faces the camera and shows the hp left: green, then yellow below half, red below a quarter.
  function updateHealthBar(group, e, show) {
    const { bar, fg } = healthBar(group);
    bar.visible = show;
    if (!show) return;
    const health = Math.max(0.001, e.hp / e.maxHp);
    bar.parent.getWorldQuaternion(scratchQuaternion).invert();
    bar.quaternion.copy(scratchQuaternion).multiply(camera.quaternion);
    fg.scale.set(health, 0.14, 1);
    fg.position.x = (health - 1) / 2;
    fg.position.z = 0.001;
    fg.material = overlay.barFg[health > 0.5 ? 0 : health > 0.25 ? 1 : 2];
  }
  function updateOverlays(group, data, e, selected) {
    const show = selected || e.hp < e.maxHp;
    if (selected || data.ring) selectionRing(group).visible = selected;
    if (show || data.bar) updateHealthBar(group, e, show);
  }
  const removeGroup = group => {
    scene.remove(group); activeGroups.delete(group); batch.remove(group); shadows.remove(group);
    disposeObject(group); effects.invalidate();
  };
  const forget = (id, group) => {
    removeGroup(group);
    view.groups.delete(id);
    const index = view.pickables.indexOf(group);
    if (index >= 0) view.pickables.splice(index, 1);
  };
  function addGroup(e, turned) {
    const group = makeMesh(e);
    view.groups.set(e.id, group);
    if (turned !== null) group.rotation.y = turned;
    // Resource proxies are only needed for picking. Their matrices change on depletion,
    // so keep them out of the scene's per-frame hierarchy walk.
    if (e.kind !== 'resource') { scene.add(group); activeGroups.add(group); }
    view.pickables.push(group);
    group.position.set(...worldPos(e));
    effects.invalidate();
    return group;
  }
  // Creates, rebuilds (after an age-up) and updates the group of one visible entity.
  function syncEntity(e, force) {
    let group = view.groups.get(e.id), turned = null;
    // On an age-up, buildings and units from earlier eras are rebuilt in the new era's look (units keep their facing).
    if (group && (e.kind === 'building' || e.kind === 'unit')
      && (group.userData.age !== lookAge(e) || group.userData.owner !== e.owner)) {
      turned = group.rotation.y;
      removeGroup(group);
      view.groups.delete(e.id);
      view.pickables.splice(view.pickables.indexOf(group), 1);
      group = null;
    }
    if (!group) group = addGroup(e, turned);
    group.userData.entity = e;
    if (force) group.userData.stateStamp = -1;
    if (e.kind === 'resource' && group.userData.amount !== e.amount) {
      animate(group, e, 0, false);
      group.updateMatrixWorld(true);
      batch.update(group); shadows.update(group);
      group.userData.amount = e.amount;
    }
  }
  const seen = new Set();
  let syncStamp = -1;
  view.selection = new Set();
  view.sync = (force = false) => {
    if (!force && game.time === syncStamp) return; // entity set only changes on a sim tick (20/s); frames run faster
    syncStamp = game.time;
    fog.update();
    seen.clear();
    const list = view.spectating
      ? [...game.entities.values()].filter(e => !e.aboard && !e.garrisonedIn)
      : [...game.visibleEntities(0), ...game.knownResources(0)];
    for (const e of list) {
      seen.add(e.id);
      syncEntity(e, force);
    }
    for (const [id, group] of view.groups) if (!seen.has(id) || !game.entities.has(id)) forget(id, group);
  };

  // One entity's group per frame: position, facing, hit pop, animation, ring and bar. Returns false when it is skipped.
  function updateGroup(group, dt, t, blend) {
    const e = group.userData.entity;
    if (!e) return false;
    const selected = view.selection.has(e.id), data = group.userData;
    if (e.kind === 'building' && data.stateStamp === game.time && data.selected === selected && !(data.pop > 0)
      && !(data.anim.dig && e.digging > 0)) return false;
    data.stateStamp = game.time; data.selected = selected;
    const [x, y, z] = worldPos(e);
    let moving = false;
    if (e.kind === 'unit') moving = moveUnitGroup(game, group, e, x, z, blend, dt);
    else group.position.set(x, y, z);
    const unitOrBuilding = e.kind === 'unit' || e.kind === 'building';
    if (unitOrBuilding) updateHitPop(group, data, e, dt);
    animate(group, e, t, moving);
    if (unitOrBuilding) updateOverlays(group, data, e, selected);
    if (e.kind === 'building') { group.traverse(freezeMatrix); data.matrixDirty = true; }
    return true;
  }
  function drawFrame(dt, t) {
    placeCamera();
    terrain.refresh(); terrain.update(t, view.fogEnabled);
    const blend = Math.min(1, dt * 16);
    dirtyGroups.clear();
    for (const group of activeGroups) if (updateGroup(group, dt, t, blend)) dirtyGroups.add(group);
    fog.mesh.visible = view.fogEnabled;
    scene.updateMatrixWorld();
    for (const group of dirtyGroups) { batch.update(group); shadows.update(group); }
    batch.flush(t);
    renderer.info.reset();
    effects.render();
  }

  // ---------- placement ghosts ----------
  const ghostMaterial = new THREE.MeshBasicMaterial({ color: GHOST_OK, transparent: true, opacity: 0.5, depthTest: false });
  const ghost = new THREE.Mesh(geo.box, ghostMaterial);
  ghost.visible = false; ghost.renderOrder = 5;
  scene.add(ghost);
  let ghostKey = '';
  view.showGhost = (type, tx, ty, ok) => {
    const key = type ? `${type},${tx},${ty},${ok}` : '';
    if (key === ghostKey) return;
    ghostKey = key;
    view.invalidate();
    if (!type) { ghost.visible = false; return; }
    const size = BUILDINGS[type].size;
    ghost.visible = true;
    ghost.scale.set(size, 1.2, size);
    ghost.position.set(tx + size / 2, 0.6, ty + size / 2);
    ghost.material.color.setHex(ok ? GHOST_OK : GHOST_BAD);
  };
  // wall ghost line: one 1x1 box per tile (lineTiles caps a line at 64), green where okFlags[i], red elsewhere; null hides it
  const GHOST_LINE_MAX = 64, ghostOk = new THREE.Color(GHOST_OK), ghostBad = new THREE.Color(GHOST_BAD);
  const tileMatrix = new THREE.Matrix4();
  const ghostLineMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthTest: false });
  const ghostLine = new THREE.InstancedMesh(geo.box, ghostLineMaterial, GHOST_LINE_MAX);
  ghostLine.visible = false; ghostLine.renderOrder = 5; ghostLine.frustumCulled = false; ghostLine.raycast = noRaycast;
  ghostLine.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  ghostLine.setColorAt(0, ghostOk);
  scene.add(ghostLine);
  let ghostLineKey = '';
  view.showGhostLine = (tiles, okFlags) => {
    const key = tiles?.map((tile, i) => `${tile.x},${tile.y},${!!okFlags?.[i]}`).join(';') || '';
    if (key === ghostLineKey) return;
    ghostLineKey = key;
    view.invalidate();
    if (!tiles || !tiles.length) { ghostLine.visible = false; return; }
    const count = Math.min(tiles.length, GHOST_LINE_MAX);
    for (let i = 0; i < count; i++) {
      ghostLine.setMatrixAt(i, tileMatrix.makeScale(1, 1.2, 1).setPosition(tiles[i].x + 0.5, 0.6, tiles[i].y + 0.5));
      ghostLine.setColorAt(i, okFlags?.[i] ? ghostOk : ghostBad);
    }
    ghostLine.count = count;
    ghostLine.instanceMatrix.needsUpdate = true; ghostLine.instanceColor.needsUpdate = true;
    ghostLine.visible = true;
  };

  // ---------- picking ----------
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  ray.layers.enable(PROXY_LAYER);
  const setRay = (clientX, clientY) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
  };
  view.pickEntity = (clientX, clientY) => {
    setRay(clientX, clientY);
    const hits = ray.intersectObjects(view.pickables, true);
    for (const hit of hits) {
      const id = hit.object.userData.gid;
      if (id !== undefined && view.groups.get(id)) return view.groups.get(id).userData.entity;
    }
    return null;
  };
  view.pickGround = (clientX, clientY) => {
    setRay(clientX, clientY);
    const hit = ray.intersectObject(ground)[0];
    return hit ? { x: hit.point.x, y: hit.point.z } : null;
  };
  view.project = (x, y) => {
    const projected = new THREE.Vector3(x, 0.4, y).project(camera), rect = renderer.domElement.getBoundingClientRect();
    return { x: rect.left + (projected.x + 1) / 2 * rect.width, y: rect.top + (1 - projected.y) / 2 * rect.height };
  };
  view.dispose = () => {
    effects.dispose(); terrain.dispose(); skyLighting?.dispose(); batch.dispose(); shadows.dispose(); ghostLine.dispose();
    for (const group of view.groups.values()) if (group.userData.kind === 'resource') disposeObject(group);
    disposeObject(scene);
    blobShadow.material.dispose(); blobShadow.texture.dispose();
    sun.shadow.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
  };

  // ---------- move markers ----------
  // A green ring where a move order lands, growing and fading for 0.45 s.
  const markers = [];
  view.marker = (x, y) => {
    const material = new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, side: THREE.DoubleSide, depthTest: false });
    const marker = new THREE.Mesh(geo.ring, material);
    marker.rotation.x = -Math.PI / 2; marker.position.set(x, 0.12, y); marker.renderOrder = 6; marker.userData.age = 0;
    scene.add(marker);
    markers.push(marker);
    effects.invalidate();
    view.invalidate();
  };
  function updateMarkers(dt) {
    for (let i = markers.length - 1; i >= 0; i--) {
      const marker = markers[i];
      marker.userData.age += dt;
      marker.scale.setScalar(0.6 + marker.userData.age * 2);
      marker.material.opacity = Math.max(0, 1 - marker.userData.age * 2.2);
      if (marker.userData.age > 0.45) {
        scene.remove(marker); disposeObject(marker); markers.splice(i, 1); effects.invalidate();
      }
    }
  }
  view.frame = (dt, t) => {
    updateMarkers(dt);
    drawFrame(dt, t);
  };
  view.resize();
  return view;
}
