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
const geo = { box: new THREE.BoxGeometry(1, 1, 1), ring: new THREE.RingGeometry(0.55, 0.7, 24), plane: new THREE.PlaneGeometry(1, 1), selection: new THREE.RingGeometry(0.94, 1, 48) };
for (const geometry of Object.values(geo)) geometry.userData.shared = true;
// Selection rings and HP bars are created on first use and share these.
const overlay = {
  ring: new THREE.MeshBasicMaterial({ color: 0xf3df93, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  barBg: new THREE.MeshBasicMaterial({ color: 0x111111, depthTest: false }),
  barFg: [0x22c55e, 0xeab308, 0xef4444].map(color => new THREE.MeshBasicMaterial({ color, depthTest: false })),
};
for (const material of [overlay.ring, overlay.barBg, ...overlay.barFg]) material.userData.shared = true;
const noRaycast = () => {};

// Cached model geometry/materials belong to the module; everything else to this view.
function disposeObject(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(o => {
    if (o.geometry && !o.geometry.userData.shared) geometries.add(o.geometry);
    for (const material of o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []) {
      if (!material.userData.shared) { materials.add(material); if (material.map) textures.add(material.map); }
    }
  });
  textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose());
}

export function createView(container, game) {
  let storage; try { storage = window.localStorage; } catch { /* Storage is optional. */ }
  let qualityName = sessionQuality ?? readQuality(location.search, storage), preset = QUALITY[qualityName];
  // Prefer the discrete GPU on dual-GPU laptops (a hint the browser may ignore).
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.info.autoReset = false;
  // With hardware acceleration off (or the GPU blocklisted) the browser rasterises on the CPU; drop to the cheapest preset.
  const gl = renderer.getContext(), gpuInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = String(gl.getParameter(gpuInfo ? gpuInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER)), softwareGpu = SOFTWARE_GPU.test(gpu);
  if (softwareGpu) {
    console.warn(`WebGL is using a software renderer (${gpu}); hardware acceleration looks disabled.`);
    if (sessionQuality === null && !new URLSearchParams(location.search).has('quality')) { qualityName = 'balanced'; preset = QUALITY.balanced; }
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x20271b);
  scene.matrixWorldAutoUpdate = false; scene.matrixAutoUpdate = false; // view.frame updates world matrices once, not once per render pass
  scene.add(new THREE.HemisphereLight(0xc9deeb, 0x776342, 1.55));
  const skyLighting = renderer.extensions.has('EXT_color_buffer_float') ? createSkyLighting(renderer) : null;
  scene.environment = skyLighting?.texture ?? null; scene.environmentIntensity = 0.4;
  const sun = new THREE.DirectionalLight(0xffe5ba, 3.3), sunOffset = new THREE.Vector3(-22, 38, 16);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(Math.min(preset.shadows, renderer.capabilities.maxTextureSize));
  sun.shadow.radius = 2.5; sun.shadow.intensity = 0.85;
  sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 150;
  scene.add(sun, sun.target);
  const N = game.map.size;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 250);
  const view = { renderer, scene, camera, gpu, softwareGpu, quality: qualityName, zoom: 14, focus: new THREE.Vector3(N / 2, 0, N / 2), groups: new Map(), pickables: [], dom: renderer.domElement };
  const batch = createModelBatch(MODEL_MATERIAL); scene.add(batch.mesh);
  let effects = createLightingEffects(renderer, scene, camera, preset, batch.cosmetics);
  view.revision = 0; view.invalidate = () => { view.revision++; };
  const DIR = new THREE.Vector3(1, 1.05, 1).normalize();
  let cameraKey = '';
  function placeCamera() {
    const w = renderer.domElement.clientWidth || 1, h = renderer.domElement.clientHeight || 1, a = w / h;
    const key = `${w},${h},${view.zoom},${view.focus.x},${view.focus.z}`;
    if (key === cameraKey) return; cameraKey = key;
    const hh = viewHalfHeight(view.zoom, w, h); camera.left = -hh * a; camera.right = hh * a; camera.top = hh; camera.bottom = -hh; camera.updateProjectionMatrix();
    camera.position.copy(view.focus).addScaledVector(DIR, 120); camera.lookAt(view.focus); camera.updateMatrixWorld(true);
    const extent = Math.min(N, Math.max(18, hh * Math.max(1, a) * 1.4)), shadowCamera = sun.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -extent; shadowCamera.right = shadowCamera.top = extent;
    shadowCamera.updateProjectionMatrix();
    sun.target.position.copy(view.focus); sun.position.copy(view.focus).add(sunOffset);
  }
  view.refreshCamera = placeCamera; view.halfExtents = () => [camera.right, camera.top];
  view.resize = () => {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(renderPixelRatio(w, h, window.devicePixelRatio, preset));
    renderer.setSize(w, h, false); view.setZoom(view.zoom); cameraKey = ''; placeCamera(); effects.resize(w, h); view.invalidate();
  };
  view.setQuality = name => {
    if (!validQuality(name)) return;
    sessionQuality = name; saveQuality(name, storage);
    if (name === qualityName) return;
    qualityName = name; preset = QUALITY[name]; view.quality = name;
    effects.dispose(); effects = createLightingEffects(renderer, scene, camera, preset, batch.cosmetics);
    sun.shadow.map?.dispose(); sun.shadow.map = null;
    sun.shadow.mapSize.setScalar(Math.min(preset.shadows, renderer.capabilities.maxTextureSize));
    terrain.setQuality(preset); view.resize();
  };
  view.pan = (dx, dz) => { view.focus.x = Math.max(0, Math.min(N, view.focus.x + dx)); view.focus.z = Math.max(0, Math.min(N, view.focus.z + dz)); view.invalidate(); };
  view.setZoom = z => { // 3 lets a phone close in to ~7 tiles across in portrait; a big screen's width cap must not cost zoom-out reach
    const fit = Math.min(1, viewHalfHeight(1, renderer.domElement.clientWidth, renderer.domElement.clientHeight));
    view.zoom = Math.max(3, Math.min(34 / fit, z)); view.invalidate();
  };
  view.centerOn = (x, y) => { view.focus.set(x, 0, y); view.invalidate(); };

  // terrain
  const terrain = createTerrain(game, renderer, preset), ground = terrain.ground;
  scene.add(ground, terrain.water, terrain.grass);
  const outer = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({ color: 0x1c2618 })); outer.rotation.x = -Math.PI / 2; outer.scale.set(N * 3, N * 3, 1); outer.position.set(N / 2, -0.05, N / 2); scene.add(outer);
  view.ground = ground;

  // fog of war overlay
  const fogCanvas = document.createElement('canvas'); fogCanvas.width = fogCanvas.height = N; const fctx = fogCanvas.getContext('2d'), fogImg = fctx.createImageData(N, N);
  const fogTex = new THREE.CanvasTexture(fogCanvas); fogTex.magFilter = THREE.LinearFilter;
  const fog = new THREE.Mesh(geo.plane, new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false }));
  fog.rotation.x = -Math.PI / 2; fog.scale.set(N, N, 1); fog.position.set(N / 2, 0.08, N / 2); fog.renderOrder = 1; scene.add(fog);
  let fogStamp = -1;
  function updateFog() {
    if (game.time === fogStamp || game.time % 4 !== 0 && fogStamp >= 0) return; fogStamp = game.time;
    const p = game.players[0], d = fogImg.data;
    for (let i = 0; i < N * N; i++) { d[i * 4] = 4; d[i * 4 + 1] = 6; d[i * 4 + 2] = 4; d[i * 4 + 3] = p.visible[i] ? 0 : p.explored[i] ? 110 : 235; }
    fctx.putImageData(fogImg, 0, 0); fogTex.needsUpdate = true;
  }
  view.fogEnabled = true;

  // entity meshes
  const _wq = new THREE.Quaternion(), _x = new THREE.Matrix4().makeRotationX(-Math.PI / 2);
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 64;
  const shadowContext = shadowCanvas.getContext('2d'), gradient = shadowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(20,14,6,0.38)'); gradient.addColorStop(0.45, 'rgba(20,14,6,0.18)'); gradient.addColorStop(1, 'rgba(20,14,6,0)');
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 64, 64);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  shadowMat.userData.shared = true;
  const shadows = createContactShadows(scene, geo.plane, shadowMat, () => effects.invalidate());
  const activeGroups = new Set(), dirtyGroups = new Set();
  let groupSeq = 0;
  // The era a model is drawn in: its owner's for a building, the unit's look era (era-units.js) for a unit.
  const lookAge = e => e.kind === 'building' ? game.players[e.owner].age : e.kind === 'unit' ? unitEra(e.type, game.players[e.owner]?.age) : null;
  function makeMesh(e) {
    const g = new THREE.Group(); g.userData = { id: e.id, kind: e.kind, owner: e.owner, hp: e.hp, seq: ++groupSeq };
    const age = lookAge(e);
    const m = buildModel(e, age); g.add(m.root); g.userData.anim = m.anim; g.userData.age = age;
    g.userData.blob = new THREE.Matrix4().makeTranslation(0, 0.04, 0).multiply(_x).scale(new THREE.Vector3(m.shadow * 2.8, m.shadow * 2.8, 1));
    g.traverse(o => { if (!o.isMesh) return; if (o.material?.blending === THREE.AdditiveBlending) { o.raycast = noRaycast; return; } o.userData.gid = e.id; });
    prepareCosmetics(g, e); batch.add(g);
    if (e.kind === 'building') {
      // Completed buildings only change with simulation/selection state. The GPU
      // animates their flags, smoke and machinery without walking this hierarchy.
      const update = g.updateMatrixWorld;
      g.updateMatrixWorld = function(force) {
        if (!force && !this.userData.matrixDirty) return;
        this.userData.matrixDirty = false; update.call(this, true);
      };
    }
    return g;
  }
  function selectionRing(g) {
    const ud = g.userData; if (ud.ring) return ud.ring;
    const ring = ud.ring = new THREE.Mesh(geo.selection, overlay.ring); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    const r = ud.kind === 'building' ? ud.entity.size * 0.68 : 0.48; ring.scale.set(r, r, 1); ring.renderOrder = 3; ring.raycast = noRaycast; g.add(ring); effects.invalidate();
    return ring;
  }
  function healthBar(g) {
    const ud = g.userData; if (ud.bar) return ud.bar;
    const e = ud.entity, bg = new THREE.Mesh(geo.plane, overlay.barBg), fg = new THREE.Mesh(geo.plane, overlay.barFg[0]), bar = new THREE.Group();
    // Overlapping bars stack per entity (background, then fill) in the order their entities appeared.
    bg.renderOrder = 4 + ud.seq * 1e-6; fg.renderOrder = bg.renderOrder + 1e-7; bg.scale.set(1, 0.14, 1); bg.raycast = fg.raycast = noRaycast; bar.add(bg, fg);
    effects.invalidate();
    bar.position.y = e.kind === 'building' ? (e.type === 'farm' ? 0.8 : e.type === 'house' ? 1.8 : 2.6) : 1.5; g.add(bar);
    return ud.bar = { bar, fg };
  }
  const removeGroup = g => { scene.remove(g); activeGroups.delete(g); batch.remove(g); shadows.remove(g); disposeObject(g); effects.invalidate(); };
  const seen = new Set();
  let syncStamp = -1;
  view.selection = new Set();
  view.sync = (force = false) => {
    if (!force && game.time === syncStamp) return; syncStamp = game.time; // entity set only changes on a sim tick (20/s); frames run faster
    updateFog();
    seen.clear();
    const list = [...game.visibleEntities(0), ...game.knownResources(0)];
    for (const e of list) {
      seen.add(e.id);
      let g = view.groups.get(e.id), turned = null;
      // On an age-up, buildings and units from earlier eras are rebuilt in the new era's look (units keep their facing).
      if (g && (e.kind === 'building' || e.kind === 'unit') && g.userData.age !== lookAge(e)) {
        turned = g.rotation.y; removeGroup(g); view.groups.delete(e.id); view.pickables.splice(view.pickables.indexOf(g), 1); g = null;
      }
      if (!g) {
        g = makeMesh(e); view.groups.set(e.id, g); if (turned !== null) g.rotation.y = turned;
        // Resource proxies are only needed for picking. Their matrices change on depletion,
        // so keep them out of the scene's per-frame hierarchy walk.
        if (e.kind !== 'resource') { scene.add(g); activeGroups.add(g); }
        view.pickables.push(g); g.position.set(...worldPos(e)); effects.invalidate();
      }
      g.userData.entity = e;
      if (force) g.userData.stateStamp = -1;
      if (e.kind === 'resource' && g.userData.amount !== e.amount) {
        animate(g, e, 0, false); g.updateMatrixWorld(true);
        batch.update(g); shadows.update(g); g.userData.amount = e.amount;
      }
    }
    for (const [id, g] of view.groups) if (!seen.has(id) || !game.entities.has(id)) { removeGroup(g); view.groups.delete(id); const i = view.pickables.indexOf(g); if (i >= 0) view.pickables.splice(i, 1); }
  };
  const worldPos = e => e.kind === 'building' ? [e.x + e.size / 2, 0, e.y + e.size / 2] : [e.x, e.kind === 'relic' ? (e.holder !== null ? 1.35 : 0.2) : 0, e.y];
  view.frame = (dt, t) => {
    placeCamera();
    terrain.refresh(); terrain.update(t, view.fogEnabled);
    const k = Math.min(1, dt * 16); dirtyGroups.clear();
    for (const g of activeGroups) {
      const e = g.userData.entity; if (!e) continue;
      const selected = view.selection.has(e.id), ud = g.userData;
      if (e.kind === 'building' && ud.stateStamp === game.time && ud.selected === selected && !(ud.pop > 0) && !(ud.anim.dig && e.digging > 0)) continue;
      dirtyGroups.add(g);
      ud.stateStamp = game.time; ud.selected = selected;
      const [x, y, z] = worldPos(e);
      let moving = false;
      if (e.kind === 'unit') {
        g.position.x += (x - g.position.x) * k; g.position.z += (z - g.position.z) * k;
        const dx = x - g.position.x, dz = z - g.position.z; moving = Math.hypot(dx, dz) > 0.03;
        let face = null;
        if (moving) face = Math.atan2(dx, dz);
        else { const o = e.order, tgt = o.target !== undefined ? game.entities.get(o.target) : o.res !== undefined ? game.entities.get(o.res) : null; if (tgt) { const c = tgt.kind === 'building' ? { x: tgt.x + tgt.size / 2, y: tgt.y + tgt.size / 2 } : tgt; face = Math.atan2(c.x - e.x, c.y - e.y); } }
        if (face !== null) { let d = face - g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); g.rotation.y += d * Math.min(1, dt * 12); }
        g.position.y = e.relic !== null ? 0.25 : 0;
      } else g.position.set(x, y, z);
      if (e.kind === 'unit' || e.kind === 'building') { if (e.hp < ud.hp - 0.01) ud.pop = 0.12; ud.hp = e.hp; if (ud.pop > 0) { ud.pop -= dt; g.scale.setScalar(1 + Math.max(0, ud.pop) * (e.kind === 'unit' ? 1.6 : 0.25)); } else g.scale.setScalar(1); }
      animate(g, e, t, moving);
      if (e.kind === 'unit' || e.kind === 'building') {
        const show = selected || e.hp < e.maxHp;
        if (selected || ud.ring) selectionRing(g).visible = selected;
        if (show || ud.bar) { const { bar, fg } = healthBar(g); bar.visible = show; if (show) { const f = Math.max(0.001, e.hp / e.maxHp); bar.parent.getWorldQuaternion(_wq).invert(); bar.quaternion.copy(_wq).multiply(camera.quaternion); fg.scale.set(f, 0.14, 1); fg.position.x = (f - 1) / 2; fg.position.z = 0.001; fg.material = overlay.barFg[f > 0.5 ? 0 : f > 0.25 ? 1 : 2]; } }
      }
      if (e.kind === 'building') {
        g.traverse(o => { o.updateMatrix(); o.matrixAutoUpdate = false; }); ud.matrixDirty = true;
      }
    }
    fog.visible = view.fogEnabled;
    scene.updateMatrixWorld();
    for (const g of dirtyGroups) { batch.update(g); shadows.update(g); }
    batch.flush(t);
    renderer.info.reset(); effects.render();
  };
  // placement ghost
  const ghost = new THREE.Mesh(geo.box, new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.5, depthTest: false })); ghost.visible = false; ghost.renderOrder = 5; scene.add(ghost);
  let ghostKey = '';
  view.showGhost = (type, tx, ty, ok) => { const key = type ? `${type},${tx},${ty},${ok}` : ''; if (key === ghostKey) return; ghostKey = key; view.invalidate(); if (!type) { ghost.visible = false; return; } const s = BUILDINGS[type].size; ghost.visible = true; ghost.scale.set(s, 1.2, s); ghost.position.set(tx + s / 2, 0.6, ty + s / 2); ghost.material.color.setHex(ok ? 0x22c55e : 0xef4444); };
  // wall ghost line: one 1x1 box per tile (lineTiles caps a line at 64), green where okFlags[i], red elsewhere; null hides it
  const GHOST_LINE_MAX = 64, ghostOk = new THREE.Color(0x22c55e), ghostBad = new THREE.Color(0xef4444), _gm = new THREE.Matrix4();
  const ghostLine = new THREE.InstancedMesh(geo.box, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthTest: false }), GHOST_LINE_MAX);
  ghostLine.visible = false; ghostLine.renderOrder = 5; ghostLine.frustumCulled = false; ghostLine.raycast = noRaycast;
  ghostLine.instanceMatrix.setUsage(THREE.DynamicDrawUsage); ghostLine.setColorAt(0, ghostOk); scene.add(ghostLine);
  let ghostLineKey = '';
  view.showGhostLine = (tiles, okFlags) => {
    const key = tiles?.map((t, i) => `${t.x},${t.y},${!!okFlags?.[i]}`).join(';') || '';
    if (key === ghostLineKey) return; ghostLineKey = key; view.invalidate();
    if (!tiles || !tiles.length) { ghostLine.visible = false; return; }
    const n = Math.min(tiles.length, GHOST_LINE_MAX);
    for (let i = 0; i < n; i++) { ghostLine.setMatrixAt(i, _gm.makeScale(1, 1.2, 1).setPosition(tiles[i].x + 0.5, 0.6, tiles[i].y + 0.5)); ghostLine.setColorAt(i, okFlags?.[i] ? ghostOk : ghostBad); }
    ghostLine.count = n; ghostLine.instanceMatrix.needsUpdate = true; ghostLine.instanceColor.needsUpdate = true; ghostLine.visible = true;
  };
  // picking helpers
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); ray.layers.enable(PROXY_LAYER);
  const setRay = (cx, cy) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); };
  view.pickEntity = (cx, cy) => { setRay(cx, cy); const hits = ray.intersectObjects(view.pickables, true); for (const h of hits) { const id = h.object.userData.gid; if (id !== undefined && view.groups.get(id)) return view.groups.get(id).userData.entity; } return null; };
  view.pickGround = (cx, cy) => { setRay(cx, cy); const h = ray.intersectObject(ground)[0]; return h ? { x: h.point.x, y: h.point.z } : null; };
  view.project = (x, y) => { const v = new THREE.Vector3(x, 0.4, y).project(camera), r = renderer.domElement.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; };
  view.dispose = () => { effects.dispose(); terrain.dispose(); skyLighting?.dispose(); batch.dispose(); shadows.dispose(); ghostLine.dispose(); for (const g of view.groups.values()) if (g.userData.kind === 'resource') disposeObject(g); disposeObject(scene); shadowMat.dispose(); shadowTexture.dispose(); sun.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
  const markers = [];
  view.marker = (x, y) => { const m = new THREE.Mesh(geo.ring, new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, side: THREE.DoubleSide, depthTest: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.12, y); m.renderOrder = 6; m.userData.age = 0; scene.add(m); markers.push(m); effects.invalidate(); view.invalidate(); };
  const baseFrame = view.frame;
  view.frame = (dt, t) => { for (let i = markers.length - 1; i >= 0; i--) { const m = markers[i]; m.userData.age += dt; m.scale.setScalar(0.6 + m.userData.age * 2); m.material.opacity = Math.max(0, 1 - m.userData.age * 2.2); if (m.userData.age > 0.45) { scene.remove(m); disposeObject(m); markers.splice(i, 1); effects.invalidate(); } } baseFrame(dt, t); };
  view.resize();
  return view;
}
