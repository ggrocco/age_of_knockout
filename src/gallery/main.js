// Buildings-by-era design page (buildings.html): every building in every age, rendered with
// the game's own models and lighting. Rows/columns come from the data tables (rows.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { AGES, ageTitle } from '../data/ages.js';
import { BUILDINGS } from '../data/buildings.js';
import { animate, buildingStyle } from '../render/models.js';
import { createStage, entity, modelGroup, boxOf } from './stage.js';
import { galleryRows, buildingFacts, trainsBy, upgradesAt } from './rows.js';

const params = new URLSearchParams(location.search);
const state = { team: params.get('team') === '1' ? 1 : 0, scale: params.get('scale') === 'true' ? 'true' : 'fit' };
const rows = galleryRows();
const CELL_W = 336, CELL_H = 272; // 2x the desktop CSS cell size

// ---------- grid ----------
const grid = document.getElementById('grid'), status = document.getElementById('status');
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
};

// One column per age, marking the ages whose building look changes.
function headerRow() {
  const head = el('tr', {}, el('th', { scope: 'col' }, el('span', { className: 'age', textContent: 'Building' })));
  AGES.forEach((age, i) => {
    const style = buildingStyle(age), changed = i > 0 && style !== buildingStyle(AGES[i - 1]);
    head.append(el('th', { scope: 'col' }, el('span', { className: 'age', textContent: ageTitle(age) }),
      el('span', { className: `style${changed ? ' changed' : ''}`, textContent: `${style}${changed ? ' — new look' : ''}` })));
  });
  return head;
}
// The row header: name, id and the building's facts.
const rowHeader = row => el('th', { scope: 'row' }, el('span', { className: 'name', textContent: row.name }),
  el('code', { textContent: row.type }), el('ul', {}, ...buildingFacts(row.spec).map(fact => el('li', { textContent: fact }))));
// A cell: a button with the render canvas, then what the building trains and the upgrades it gains in that age.
function buildingCell(row, cell) {
  if (!cell.available) {
    return el('td', { className: 'off' }, el('div', { className: 'locked', textContent: `Unlocks in ${ageTitle(row.unlock)}` }));
  }
  const canvas = el('canvas', { width: CELL_W, height: CELL_H });
  const button = el('button', { className: 'cell', title: `${row.name} — ${ageTitle(cell.age)}` }, canvas);
  button.setAttribute('aria-label', `Open ${row.name} in the ${ageTitle(cell.age)}`);
  button.dataset.type = row.type; button.dataset.age = cell.age;
  if (cell.unlocks) button.append(el('span', { className: 'badge', textContent: 'NEW' }));
  const td = el('td', {}, button), trains = trainsBy(row.spec, cell.age);
  if (trains.length) td.append(el('div', { className: 'trains', textContent: `Trains: ${trains.join(', ')}` }));
  for (const upgrade of upgradesAt(row.type, cell.age)) {
    td.append(el('div', { className: 'upgrade' }, 'New upgrade: ', el('strong', { textContent: upgrade.name }), ` (${upgrade.desc})`));
  }
  return td;
}
function buildTable() {
  const body = el('tbody');
  for (const row of rows) {
    const tr = el('tr', {}, rowHeader(row));
    for (const cell of row.cells) tr.append(buildingCell(row, cell));
    body.append(tr);
  }
  grid.replaceChildren(el('thead', {}, headerRow()), body);
  grid.addEventListener('click', ev => {
    const button = ev.target.closest('.cell');
    if (button) openDetail(button.dataset.type, button.dataset.age);
  });
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

// Renders one cell's building in the shared stage and copies the picture into the cell's canvas.
function renderCell(cell) {
  const { type, age } = cell.dataset, group = modelGroup(entity(type, state.team), age);
  const fit = state.scale === 'fit';
  cellStage.show(group);
  cellStage.aim(fit ? boxOf(group) : getUnionBox(), CELL_W / CELL_H, fit ? 1.08 : 1.02);
  cellStage.renderer.render(cellStage.scene, cellStage.camera);
  cell.querySelector('canvas').getContext('2d').drawImage(cellStage.renderer.domElement, 0, 0);
}
// Six cells per frame, so the page stays responsive; a newer run (team or scale change) cancels this one.
let renderRun = 0;
async function renderCells() {
  const run = ++renderRun, start = performance.now(), cells = [...grid.querySelectorAll('.cell')];
  status.textContent = 'Rendering…';
  for (let i = 0; i < cells.length; i++) {
    if (i % 6 === 0) {
      await new Promise(requestAnimationFrame);
      if (run !== renderRun) return;
    }
    renderCell(cells[i]);
  }
  cellStage.show(null);
  const took = Math.round(performance.now() - start);
  status.textContent = `${rows.length} buildings × ${AGES.length} ages · ${cells.length} renders in ${took} ms. `
    + 'Click a building to inspect it.';
  window.__gallery.rendered = cells.length;
}

// ---------- detail viewer ----------
const dialog = document.getElementById('detail'), stageCanvas = document.getElementById('stage');
const buildBox = document.getElementById('detail-build'), spinBox = document.getElementById('detail-spin');
let detail = null, stage = null, controls = null, raf = 0;

function ensureDetailStage() {
  if (stage) return;
  stage = createStage(new THREE.WebGLRenderer({ canvas: stageCanvas, antialias: true }));
  stage.renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  controls = new OrbitControls(stage.camera, stageCanvas);
  controls.enableDamping = true;
}
// Animates and draws the open detail until the dialog closes.
function startDetailLoop() {
  cancelAnimationFrame(raf);
  let last = performance.now();
  const loop = now => {
    if (!dialog.open) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    detail.t += dt;
    resizeStage();
    animate(detail.group, detail.e, detail.t, false);
    if (spinBox.checked) detail.group.rotation.y += dt * 0.5;
    controls.update();
    stage.renderer.render(stage.scene, stage.camera);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}
function openDetail(type, age) {
  ensureDetailStage();
  detail = { type, age, t: 0 };
  document.getElementById('detail-title').textContent = `${BUILDINGS[type].name} — ${ageTitle(age)} (${buildingStyle(age)})`;
  if (!dialog.open) dialog.showModal();
  refreshDetail(true);
  startDetailLoop();
}
function refreshDetail(reframe) {
  if (!detail) return;
  detail.e = entity(detail.type, state.team, !buildBox.checked);
  detail.group = modelGroup(detail.e, detail.age, detail.t);
  stage.show(detail.group);
  if (!reframe) return;
  resizeStage(true);
  controls.target.copy(stage.aim(boxOf(detail.group), aspectOf(), 1.3));
  controls.update();
}
const aspectOf = () => stageCanvas.clientWidth / Math.max(1, stageCanvas.clientHeight);
function resizeStage(force) {
  const width = stageCanvas.clientWidth, height = stageCanvas.clientHeight, ratio = stage.renderer.getPixelRatio();
  if (!force && stageCanvas.width === Math.round(width * ratio) && stageCanvas.height === Math.round(height * ratio)) return;
  stage.renderer.setSize(width, height, false);
  stage.setAspect(width / Math.max(1, height));
}
buildBox.addEventListener('change', () => refreshDetail(false));
document.getElementById('detail-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', ev => { if (ev.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => { cancelAnimationFrame(raf); stage?.show(null); detail = null; });

// ---------- toolbar ----------
function syncToolbar() {
  for (const b of document.querySelectorAll('[data-team]')) b.setAttribute('aria-pressed', String(+b.dataset.team === state.team));
  for (const b of document.querySelectorAll('[data-scale]')) b.setAttribute('aria-pressed', String(b.dataset.scale === state.scale));
  const query = new URLSearchParams(location.search);
  state.team ? query.set('team', '1') : query.delete('team');
  state.scale === 'true' ? query.set('scale', 'true') : query.delete('scale');
  history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}`);
}
document.querySelector('header').addEventListener('click', ev => {
  const button = ev.target.closest('button');
  if (!button) return;
  if (button.dataset.team !== undefined) state.team = +button.dataset.team;
  else if (button.dataset.scale !== undefined) state.scale = button.dataset.scale;
  else return;
  syncToolbar(); renderCells(); refreshDetail(false);
});

window.__gallery = { rows, state, rendered: 0 };
buildTable(); syncToolbar(); renderCells();
