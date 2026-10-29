// Age ladder page (ages.html): per Age, what it brings (rendered with the game's own models), what leaving it needs and
// costs, its upgrades and what grows on arrival; then the price of each jump and the problems the data shows (model.js).
import { BUILDINGS } from '../data/buildings.js';
import { createStage, entity, unitEntity, modelGroup, boxOf } from '../gallery/stage.js';
import { ladder, jumps, findings, GROWTH, RES } from './model.js';
import * as THREE from 'three';

const params = new URLSearchParams(location.search);
const state = { team: params.get('team') === '1' ? 1 : 0, tracing: null };
const ages = ladder(), byId = Object.fromEntries(ages.map(a => [a.id, a]));
const THUMB_W = 240, THUMB_H = 184; // 2x the CSS size
const era = id => `var(--e-${id})`;
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids.filter(kid => kid != null));
  return node;
};
const sub = text => el('span', { className: 'sub', textContent: text });
const costLine = cost => el('div', { className: 'cost' },
  ...RES.filter(res => cost[res]).map(res => el('span', {}, el('i', { className: `r-${res}` }), String(cost[res]))));
const none = text => el('span', { className: 'none', textContent: text });
const tag = (text, cls = '') => el('span', { className: `tag ${cls}`, textContent: text });
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
// A clickable name that traces building `b` (what it trains and researches across the Ages).
const chip = (b, label, subText, ...tags) => {
  const node = el('button', { type: 'button', className: 'chip' }, label, subText ? sub(subText) : null, ...tags);
  node.dataset.b = b;
  return node;
};
// A picture of a building or unit, rendered later by renderThumbs(); `b` is the building it traces to.
const thumb = (kind, type, b, name, ...lines) => {
  const node = el('button', { type: 'button', className: 'obj', title: name },
    el('canvas', { width: THUMB_W, height: THUMB_H }), el('span', { className: 'name', textContent: name }), ...lines);
  Object.assign(node.dataset, { kind, type, b });
  return node;
};

// ---------- the map ----------
// Each fill returns the contents of one Age's cell in that row.
const twoDigits = n => String(n).padStart(2, '0');
const ageHeading = a => [
  el('span', { className: 'n', textContent: `${twoDigits(a.i + 1)} / ${twoDigits(ages.length)}` }),
  el('span', { className: 't', textContent: a.title }),
  el('span', { className: 'then', textContent: a.next ? `then ${byId[a.next].title}` : 'Final Age' }),
];
const buildingThumb = b => thumb('building', b.id, b.id, b.name,
  b.gate ? tag('Gate', 'gate') : tag(b.id === 'town_center' ? 'Always needed' : "Doesn't count"),
  b.trains.length ? sub(`Trains ${b.trains.length} unit${b.trains.length > 1 ? 's' : ''}`) : null);
const newBuildings = a => a.buildings.length ? [el('div', { className: 'objs' }, ...a.buildings.map(buildingThumb))] : [none('None')];
const unitThumb = u => thumb('unit', u.id, u.at, u.name, sub(u.atName), u.older ? tag('Older building', 'old') : null);
const newUnits = a => a.units.length ? [el('div', { className: 'objs' }, ...a.units.map(unitThumb))] : [none('None')];
const neededToAdvance = a => {
  if (!a.advance) return [none('Top of the ladder')];
  const rule = el('span', { className: 'rule', textContent: `TC + ${a.advance.need} of ${a.advance.gates.length}` });
  return [rule, ...a.advance.gates.map(g => chip(g, BUILDINGS[g].name))];
};
const advanceCost = a => a.advance ? [costLine(a.advance.cost), sub(`${a.advance.time}s research`)] : [none('None')];
const newUpgrades = a => {
  if (!a.techs.length) return [none('None')];
  return a.techs.map(t => chip(t.at, t.name, t.atName + (t.requires ? ` · after ${t.requires}` : '')));
};
// [label, small print, fill, cell class]
const MATRIX_ROWS = [
  ['', null, ageHeading, 'eh'],
  ['New buildings', 'Gate = counts toward advancing', newBuildings],
  ['New units', 'And where they are trained', newUnits],
  ['Needed to advance', 'Town Center + finished buildings of this Age', neededToAdvance],
  ['Advance cost', 'Paid at the Town Center', advanceCost],
  ['New upgrades', 'Researched at', newUpgrades],
  ['Grows on arrival', 'Change from the Age before', a => [growList(a)]],
];
function buildMatrix() {
  const matrix = document.getElementById('matrix');
  matrix.style.setProperty('--cols', ages.length);
  for (const [label, smallPrint, fill, cls] of MATRIX_ROWS) {
    matrix.append(el('div', { className: 'rl' }, label, smallPrint ? el('small', { textContent: smallPrint }) : null));
    for (const a of ages) {
      const cell = el('div', { className: cls || 'cell' }, ...fill(a));
      cell.style.setProperty('--era', era(a.id));
      matrix.append(cell);
    }
  }
  matrix.addEventListener('click', ev => {
    const target = ev.target.closest('[data-b]');
    if (target) trace(target.dataset.b);
  });
}
const GROWTH_FORMAT = { farmSpeed: v => `×${v}` };
const shortLabel = label => label.replace(' / sec', ' dps').replace('Population limit', 'Pop limit');
// Each stat on arrival, with its change from the Age before.
function growList(a) {
  const before = a.i ? ages[a.i - 1].grows : null, list = el('dl', { className: 'grow' });
  for (const { key, label } of GROWTH) {
    const value = a.grows[key], previous = before?.[key], format = GROWTH_FORMAT[key] || String;
    const change = value != null && previous != null && value !== previous ? Math.round((value - previous) * 100) / 100 : null;
    list.append(el('dt', { textContent: shortLabel(label) }),
      el('dd', {}, value == null ? '–' : format(value), change ? el('em', { textContent: ` ${change > 0 ? '+' : ''}${change}` }) : null),
    );
  }
  return list;
}

// Highlight everything a building trains and researches, across every Age.
const bar = document.getElementById('trace'), barIdle = bar.textContent;
function trace(b) {
  state.tracing = state.tracing === b ? null : b;
  const matrix = document.getElementById('matrix');
  matrix.classList.toggle('tracing', !!state.tracing);
  for (const node of matrix.querySelectorAll('[data-b]')) node.classList.toggle('on', node.dataset.b === state.tracing);
  if (!state.tracing) { bar.replaceChildren(barIdle); return; }
  const units = ages.flatMap(a => a.units.filter(u => u.at === b)), techs = ages.flatMap(a => a.techs.filter(t => t.at === b));
  const eras = ages.filter(a => a.units.some(u => u.at === b) || a.techs.some(t => t.at === b)).length;
  const clear = el('button', { type: 'button', textContent: 'Clear' });
  clear.onclick = () => trace(b);
  const summary = ` (${byId[BUILDINGS[b].age].title}): ${plural(units.length, 'unit')}, ${plural(techs.length, 'upgrade')}, `
    + `new content in ${plural(eras, 'Age')}. `;
  bar.replaceChildren(el('strong', { textContent: BUILDINGS[b].name }), summary, clear);
}

// ---------- price of each jump ----------
const JUMPS = jumps(ages);
const PRICE = { width: 640, left: 112, right: 92, rowH: 34, top: 6 };
const minutes = secs => `${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, '0')}s`;
// One bar of stacked resources per age-up, with its total and how long it takes.
function priceRow(jump, row, withGates, x) {
  const { width, rowH, top } = PRICE, y = top + row * rowH + 6, h = rowH - 14, textY = y + h / 2 + 4;
  const amounts = RES.map(res => (jump.cost[res] || 0) + (withGates ? jump.gateCost[res] : 0));
  const secs = withGates ? jump.timeWithGates : jump.time;
  let svg = `<rect x="4" y="${y + 3}" width="5" height="${h - 6}" style="fill:${era(jump.to)}"/>`
    + `<text x="14" y="${textY}" class="lab">${byId[jump.to].title.replace(' Age', '')}</text>`, sum = 0;
  amounts.forEach((v, k) => {
    if (!v) return;
    svg += `<rect x="${x(sum)}" y="${y}" width="${Math.max(0, x(sum + v) - x(sum) - 1)}" height="${h}" class="r-${RES[k]}">`
      + `<title>${RES[k]} ${v}</title></rect>`;
    sum += v;
  });
  return svg + `<text x="${x(sum) + 6}" y="${textY}" class="val">${sum.toLocaleString('en')}</text>`
    + `<text x="${width - 4}" y="${textY}" class="axis" text-anchor="end">${minutes(secs)}</text>`;
}
function drawPrice(withGates) {
  const { width, left, right, rowH, top } = PRICE, height = top + JUMPS.length * rowH + 26;
  const totalOf = jump => RES.reduce((sum, res) => sum + (jump.cost[res] || 0) + (withGates ? jump.gateCost[res] : 0), 0);
  const max = Math.ceil(Math.max(...JUMPS.map(totalOf)) / 1000) * 1000, x = v => left + v / max * (width - left - right);
  let svg = `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="Resources each age-up takes">`;
  for (let v = 0; v <= max; v += 1000) {
    svg += `<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${height - 22}" class="grid"/>`
      + `<text x="${x(v)}" y="${height - 6}" class="axis" text-anchor="middle">${v ? v / 1000 + 'k' : '0'}</text>`;
  }
  JUMPS.forEach((jump, row) => { svg += priceRow(jump, row, withGates, x); });
  document.getElementById('price').innerHTML = svg + '</svg>';
  for (const button of document.querySelectorAll('[data-gates]')) {
    button.setAttribute('aria-pressed', String((button.dataset.gates === '1') === withGates));
  }
}
document.getElementById('price-mode').addEventListener('click', ev => {
  const button = ev.target.closest('[data-gates]');
  if (button) drawPrice(button.dataset.gates === '1');
});

// ---------- grows by itself ----------
const SPARK_NOTE = { farmFood: 'food', towerDps: 'from Tool', wallHp: 'from Tool' }, SPARK_W = 200, SPARK_H = 46;
// A sparkline of one stat over the Ages: [age index, value] points, an area under the line, era-coloured dots.
function sparkSvg(points) {
  const lo = Math.min(...points.map(p => p[1])), hi = Math.max(...points.map(p => p[1]));
  const px = i => 4 + i / (ages.length - 1) * (SPARK_W - 8), py = v => SPARK_H - 5 - (v - lo) / ((hi - lo) || 1) * (SPARK_H - 12);
  const line = points.map((p, k) => `${k ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(''), last = points.at(-1);
  const area = `${line}L${px(last[0])},${SPARK_H}L${px(points[0][0])},${SPARK_H}Z`;
  const dots = points.map(p => `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="2.4" style="fill:${era(ages[p[0]].id)}"/>`).join('');
  return `<svg viewBox="0 0 ${SPARK_W} ${SPARK_H}" width="100%" aria-hidden="true">`
    + `<path d="${area}" class="area"/><path d="${line}" class="line"/>` + dots + `<circle cx="${px(last[0])}" cy="${py(last[1])}" r="4" class="end"/></svg>`;
}
function sparkCard({ key, label }) {
  const points = ages.map(a => [a.i, a.grows[key]]).filter(p => p[1] != null), format = GROWTH_FORMAT[key] || String;
  const card = el('div', { className: 'spark' }, el('span', { className: 'lab', textContent: label }),
    el('span', { className: 'val' }, `${format(points[0][1])} → ${format(points.at(-1)[1])}`,
      SPARK_NOTE[key] ? el('small', { textContent: SPARK_NOTE[key] }) : null));
  card.insertAdjacentHTML('beforeend', sparkSvg(points));
  return card;
}
function drawSparks() {
  document.getElementById('sparks').replaceChildren(...GROWTH.map(sparkCard));
}

// ---------- problems ----------
const SEVERITY = { high: 'High', med: 'Medium', low: 'Low' };
const findingCard = f => el('article', { className: 'find' },
  el('header', {}, el('span', { className: `sev ${f.sev}`, textContent: SEVERITY[f.sev] }), el('h3', { textContent: f.title })),
  el('p', { textContent: f.text }), el('p', { className: 'fix' }, el('b', { textContent: 'Try' }), f.fix));
function drawFindings() {
  const list = findings(ages);
  const cards = list.length ? list.map(findingCard) : [el('p', { textContent: 'The data shows no evolution problems.' })];
  document.getElementById('findings').replaceChildren(...cards);
}

// ---------- model pictures ----------
const stage = createStage(new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }));
stage.renderer.setPixelRatio(1); stage.renderer.setSize(THUMB_W, THUMB_H, false);
// Renders one thumbnail's model (a building in its own Age, a unit as spawned) into its canvas.
function renderThumb(item) {
  const { kind, type } = item.dataset, age = kind === 'unit' ? undefined : BUILDINGS[type].age;
  const group = modelGroup(kind === 'unit' ? unitEntity(type, state.team) : entity(type, state.team), age);
  stage.show(group);
  stage.aim(boxOf(group), THUMB_W / THUMB_H, kind === 'unit' ? 1.25 : 1.08);
  stage.renderer.render(stage.scene, stage.camera);
  item.querySelector('canvas').getContext('2d').drawImage(stage.renderer.domElement, 0, 0);
}
// Eight thumbnails per frame; a newer run (team change) cancels this one.
let run = 0;
async function renderThumbs() {
  const me = ++run, items = [...document.querySelectorAll('.obj')], start = performance.now();
  for (let i = 0; i < items.length; i++) {
    if (i % 8 === 0) {
      await new Promise(requestAnimationFrame);
      if (me !== run) return;
    }
    renderThumb(items[i]);
  }
  stage.show(null);
  window.__ladder.rendered = items.length;
  window.__ladder.ms = Math.round(performance.now() - start);
}

// ---------- team toggle ----------
function syncTeam() {
  for (const b of document.querySelectorAll('[data-team]')) b.setAttribute('aria-pressed', String(+b.dataset.team === state.team));
  const query = new URLSearchParams(location.search);
  state.team ? query.set('team', '1') : query.delete('team');
  history.replaceState(null, '', `${location.pathname}${query.size ? `?${query}` : ''}${location.hash}`);
}
document.querySelector('header').addEventListener('click', ev => {
  const button = ev.target.closest('[data-team]');
  if (!button) return;
  state.team = +button.dataset.team;
  syncTeam();
  renderThumbs();
});

window.__ladder = { ages, rendered: 0 };
document.getElementById('strata').replaceChildren(...ages.map(a => {
  const band = el('span');
  band.style.background = era(a.id);
  return band;
}));
buildMatrix(); drawPrice(true); drawSparks(); drawFindings(); syncTeam(); renderThumbs();
