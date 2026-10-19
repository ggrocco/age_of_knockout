// Buildings-by-era design page (buildings.html): every building in every age, rendered with
// the game's own models and lighting. Rows/columns come from the data tables (rows.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AGES, ageTitle } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { buildModel, animate, buildingStyle } from '../render/models.js';
import { createSkyLighting } from '../render/lighting.js';
import { galleryRows, buildingFacts, trainsBy } from './rows.js';

const params = new URLSearchParams(location.search);
const state = { team: params.get('team') === '1' ? 1 : 0, scale: params.get('scale') === 'true' ? 'true' : 'fit' };
const rows = galleryRows();
const CELL_W = 336, CELL_H = 272; // 2x the desktop CSS cell size
const DIR = new THREE.Vector3(1, 1.05, 1).normalize(); // the game camera's view direction

// Same light rig and tone mapping as src/render/view.js, so the page shows what the game shows.
function createStage(renderer) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x20271b);
  scene.add(new THREE.HemisphereLight(0xc9deeb, 0x776342, 1.55));
  if (renderer.extensions.has('EXT_color_buffer_float')) { scene.environment = createSkyLighting(renderer).texture; scene.environmentIntensity = 0.4; }
  const sun = new THREE.DirectionalLight(0xffe5ba, 3.3);
  sun.position.set(-22, 38, 16).setLength(40); sun.castShadow = true;
  sun.shadow.mapSize.setScalar(Math.min(2048, renderer.capabilities.maxTextureSize));
  sun.shadow.radius = 2.5; sun.shadow.intensity = 0.85; sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 90 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x5b6a3a, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.005; ground.receiveShadow = true;
  scene.add(sun, sun.target, ground);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 200);
  let shown = null;
  return {
    renderer, scene, camera,
    show(group) { if (shown) scene.remove(shown); shown = group; if (group) scene.add(group); },
    // Point the game's isometric camera at `box`'s centre and zoom so the box fills the view.
    aim(box, aspect, pad = 1.1) {
      const c = box.getCenter(new THREE.Vector3());
      camera.position.copy(c).addScaledVector(DIR, 60); camera.lookAt(c); camera.updateMatrixWorld();
      let w = 0, h = 0;
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
        w = Math.max(w, Math.abs(p.x)); h = Math.max(h, Math.abs(p.y));
      }
      const hh = Math.max(h, w / aspect) * pad;
      Object.assign(camera, { top: hh, bottom: -hh, left: -hh * aspect, right: hh * aspect, zoom: 1 });
      camera.updateProjectionMatrix();
      return c;
    },
    setAspect(aspect) { const hh = camera.top; camera.left = -hh * aspect; camera.right = hh * aspect; camera.updateProjectionMatrix(); },
  };
}

const entity = (type, owner, built = true) => {
  const spec = BUILDINGS[type];
  return { id: 0, kind: 'building', type, owner, size: spec.size, constructed: built, progress: built ? 1 : 0.5, amount: spec.amount ?? 400 };
};
// buildModel attaches scaffolding until animate() is told the building is finished.
function modelGroup(e, age, t = 0) {
  const m = buildModel(e, age), g = new THREE.Group();
  g.add(m.root); g.userData.anim = m.anim; animate(g, e, t, false); g.updateMatrixWorld(true);
  return g;
}
const boxOf = g => new THREE.Box3().setFromObject(g);

// ---------- grid ----------
const grid = document.getElementById('grid'), status = document.getElementById('status');
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids); return n; };

function buildTable() {
  const head = el('tr', {}, el('th', { scope: 'col' }, el('span', { className: 'age', textContent: 'Building' })));
  AGES.forEach((age, i) => {
    const style = buildingStyle(age), changed = i > 0 && style !== buildingStyle(AGES[i - 1]);
    head.append(el('th', { scope: 'col' }, el('span', { className: 'age', textContent: ageTitle(age) }),
      el('span', { className: `style${changed ? ' changed' : ''}`, textContent: `${style}${changed ? ' — new look' : ''}` })));
  });
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr', {}, el('th', { scope: 'row' }, el('span', { className: 'name', textContent: row.name }), el('code', { textContent: row.type }),
      el('ul', {}, ...buildingFacts(row.spec).map(f => el('li', { textContent: f })))));
    for (const cell of row.cells) {
      if (!cell.available) { tr.append(el('td', { className: 'off' }, el('div', { className: 'locked', textContent: `Unlocks in ${ageTitle(row.unlock)}` }))); continue; }
      const canvas = el('canvas', { width: CELL_W, height: CELL_H });
      const btn = el('button', { className: 'cell', title: `${row.name} — ${ageTitle(cell.age)}` }, canvas);
      btn.setAttribute('aria-label', `Open ${row.name} in the ${ageTitle(cell.age)}`);
      btn.dataset.type = row.type; btn.dataset.age = cell.age;
      if (cell.unlocks) btn.append(el('span', { className: 'badge', textContent: 'NEW' }));
      const td = el('td', {}, btn), trains = trainsBy(row.spec, cell.age);
      if (trains.length) td.append(el('div', { className: 'trains', textContent: `Trains: ${trains.join(', ')}` }));
      tr.append(td);
    }
    body.append(tr);
  }
  grid.replaceChildren(el('thead', {}, head), body);
  grid.addEventListener('click', ev => { const b = ev.target.closest('.cell'); if (b) openDetail(b.dataset.type, b.dataset.age); });
}

const cellStage = createStage(new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }));
cellStage.renderer.setPixelRatio(1); cellStage.renderer.setSize(CELL_W, CELL_H, false);
// True scale frames every cell like the largest building, all standing on the same spot.
let unionBox = null;
function getUnionBox() {
  if (unionBox) return unionBox;
  unionBox = new THREE.Box3();
  for (const age of AGES) for (const type of Object.keys(BUILDINGS)) unionBox.union(boxOf(modelGroup(entity(type, 0), age)));
  return unionBox;
}

let renderRun = 0;
async function renderCells() {
  const run = ++renderRun, start = performance.now(), cells = [...grid.querySelectorAll('.cell')];
  status.textContent = 'Rendering…';
  for (let i = 0; i < cells.length; i++) {
    if (i % 6 === 0) { await new Promise(requestAnimationFrame); if (run !== renderRun) return; }
    const { type, age } = cells[i].dataset, g = modelGroup(entity(type, state.team), age);
    cellStage.show(g); cellStage.aim(state.scale === 'fit' ? boxOf(g) : getUnionBox(), CELL_W / CELL_H, state.scale === 'fit' ? 1.08 : 1.02);
    cellStage.renderer.render(cellStage.scene, cellStage.camera);
    cells[i].querySelector('canvas').getContext('2d').drawImage(cellStage.renderer.domElement, 0, 0);
  }
  cellStage.show(null);
  status.textContent = `${rows.length} buildings × ${AGES.length} ages · ${cells.length} renders in ${Math.round(performance.now() - start)} ms. Click a building to inspect it.`;
  window.__gallery.rendered = cells.length;
}

// ---------- detail viewer ----------
const dialog = document.getElementById('detail'), stageCanvas = document.getElementById('stage');
const buildBox = document.getElementById('detail-build'), spinBox = document.getElementById('detail-spin');
let detail = null, stage = null, controls = null, raf = 0;

function openDetail(type, age) {
  if (!stage) {
    stage = createStage(new THREE.WebGLRenderer({ canvas: stageCanvas, antialias: true }));
    stage.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    controls = new OrbitControls(stage.camera, stageCanvas); controls.enableDamping = true;
  }
  detail = { type, age, t: 0 };
  document.getElementById('detail-title').textContent = `${BUILDINGS[type].name} — ${ageTitle(age)} (${buildingStyle(age)})`;
  if (!dialog.open) dialog.showModal();
  refreshDetail(true);
  cancelAnimationFrame(raf); let last = performance.now();
  const loop = now => {
    if (!dialog.open) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; detail.t += dt;
    resizeStage();
    animate(detail.group, detail.e, detail.t, false);
    if (spinBox.checked) detail.group.rotation.y += dt * 0.5;
    controls.update(); stage.renderer.render(stage.scene, stage.camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function refreshDetail(reframe) {
  if (!detail) return;
  detail.e = entity(detail.type, state.team, !buildBox.checked);
  detail.group = modelGroup(detail.e, detail.age, detail.t);
  stage.show(detail.group);
  if (reframe) { resizeStage(true); controls.target.copy(stage.aim(boxOf(detail.group), aspectOf(), 1.3)); controls.update(); }
}
const aspectOf = () => stageCanvas.clientWidth / Math.max(1, stageCanvas.clientHeight);
function resizeStage(force) {
  const w = stageCanvas.clientWidth, h = stageCanvas.clientHeight, r = stage.renderer.getPixelRatio();
  if (!force && stageCanvas.width === Math.round(w * r) && stageCanvas.height === Math.round(h * r)) return;
  stage.renderer.setSize(w, h, false); stage.setAspect(w / Math.max(1, h));
}
buildBox.addEventListener('change', () => refreshDetail(false));
document.getElementById('detail-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', ev => { if (ev.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { cancelAnimationFrame(raf); stage?.show(null); detail = null; });

// ---------- toolbar ----------
function syncToolbar() {
  for (const b of document.querySelectorAll('[data-team]')) b.setAttribute('aria-pressed', String(+b.dataset.team === state.team));
  for (const b of document.querySelectorAll('[data-scale]')) b.setAttribute('aria-pressed', String(b.dataset.scale === state.scale));
  const q = new URLSearchParams(location.search);
  state.team ? q.set('team', '1') : q.delete('team');
  state.scale === 'true' ? q.set('scale', 'true') : q.delete('scale');
  history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
}
document.querySelector('header').addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.team !== undefined) state.team = +b.dataset.team;
  else if (b.dataset.scale !== undefined) state.scale = b.dataset.scale;
  else return;
  syncToolbar(); renderCells(); refreshDetail(false);
});

window.__gallery = { rows, state, rendered: 0 };
buildTable(); syncToolbar(); renderCells();
