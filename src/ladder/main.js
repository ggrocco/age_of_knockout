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
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); n.append(...kids.filter(k => k != null)); return n; };
const costLine = c => el('div', { className: 'cost' }, ...RES.filter(k => c[k]).map(k => el('span', {}, el('i', { className: `r-${k}` }), String(c[k]))));
const none = text => el('span', { className: 'none', textContent: text });
const tag = (text, cls = '') => el('span', { className: `tag ${cls}`, textContent: text });
const chip = (b, label, sub, ...tags) => {
  const n = el('button', { type: 'button', className: 'chip' }, label, sub ? el('span', { className: 'sub', textContent: sub }) : null, ...tags);
  n.dataset.b = b; return n;
};
// A picture of a building or unit, rendered later by renderThumbs(); `b` is the building it traces to.
const thumb = (kind, type, b, name, ...lines) => {
  const n = el('button', { type: 'button', className: 'obj', title: name }, el('canvas', { width: THUMB_W, height: THUMB_H }), el('span', { className: 'name', textContent: name }), ...lines);
  Object.assign(n.dataset, { kind, type, b }); return n;
};

// ---------- the map ----------
function buildMatrix() {
  const rows = [
    ['', null, a => [el('span', { className: 'n', textContent: `${String(a.i + 1).padStart(2, '0')} / ${String(ages.length).padStart(2, '0')}` }),
      el('span', { className: 't', textContent: a.title }), el('span', { className: 'then', textContent: a.next ? `then ${byId[a.next].title}` : 'Final Age' })], 'eh'],
    ['New buildings', 'Gate = counts toward advancing', a => a.buildings.length ? [el('div', { className: 'objs' }, ...a.buildings.map(b =>
      thumb('building', b.id, b.id, b.name, b.gate ? tag('Gate', 'gate') : tag(b.id === 'town_center' ? 'Always needed' : "Doesn't count"),
        b.trains.length ? el('span', { className: 'sub', textContent: `Trains ${b.trains.length} unit${b.trains.length > 1 ? 's' : ''}` }) : null)))] : [none('None')]],
    ['New units', 'And where they are trained', a => a.units.length ? [el('div', { className: 'objs' }, ...a.units.map(u =>
      thumb('unit', u.id, u.at, u.name, el('span', { className: 'sub', textContent: u.atName }), u.older ? tag('Older building', 'old') : null)))] : [none('None')]],
    ['Needed to advance', 'Town Center + finished buildings of this Age', a => a.advance
      ? [el('span', { className: 'rule', textContent: `TC + ${a.advance.need} of ${a.advance.gates.length}` }), ...a.advance.gates.map(g => chip(g, BUILDINGS[g].name))]
      : [none('Top of the ladder')]],
    ['Advance cost', 'Paid at the Town Center', a => a.advance ? [costLine(a.advance.cost), el('span', { className: 'sub', textContent: `${a.advance.time}s research` })] : [none('None')]],
    ['New upgrades', 'Researched at', a => a.techs.length ? a.techs.map(t => chip(t.at, t.name, t.atName + (t.requires ? ` · after ${t.requires}` : ''))) : [none('None')]],
    ['Grows on arrival', 'Change from the Age before', a => [growList(a)]],
  ];
  const m = document.getElementById('matrix');
  m.style.setProperty('--cols', ages.length);
  for (const [label, sub, fill, cls] of rows) {
    m.append(el('div', { className: 'rl' }, label, sub ? el('small', { textContent: sub }) : null));
    for (const a of ages) { const c = el('div', { className: cls || 'cell' }, ...fill(a)); c.style.setProperty('--era', era(a.id)); m.append(c); }
  }
  m.addEventListener('click', ev => { const t = ev.target.closest('[data-b]'); if (t) trace(t.dataset.b); });
}
function growList(a) {
  const p = a.i ? ages[a.i - 1].grows : null, dl = el('dl', { className: 'grow' });
  const fmt = { farmSpeed: v => `×${v}` };
  for (const { key, label } of GROWTH) {
    const v = a.grows[key], pv = p?.[key], f = fmt[key] || String, d = v != null && pv != null && v !== pv ? Math.round((v - pv) * 100) / 100 : null;
    dl.append(el('dt', { textContent: label.replace(' / sec', ' dps').replace('Population limit', 'Pop limit') }),
      el('dd', {}, v == null ? '–' : f(v), d ? el('em', { textContent: ` ${d > 0 ? '+' : ''}${d}` }) : null));
  }
  return dl;
}

// Highlight everything a building trains and researches, across every Age.
const bar = document.getElementById('trace'), barIdle = bar.textContent;
function trace(b) {
  state.tracing = state.tracing === b ? null : b;
  const m = document.getElementById('matrix');
  m.classList.toggle('tracing', !!state.tracing);
  for (const n of m.querySelectorAll('[data-b]')) n.classList.toggle('on', n.dataset.b === state.tracing);
  if (!state.tracing) { bar.replaceChildren(barIdle); return; }
  const units = ages.flatMap(a => a.units.filter(u => u.at === b)), techs = ages.flatMap(a => a.techs.filter(t => t.at === b));
  const eras = ages.filter(a => a.units.some(u => u.at === b) || a.techs.some(t => t.at === b)).length;
  const clear = el('button', { type: 'button', textContent: 'Clear' }); clear.onclick = () => trace(b);
  bar.replaceChildren(el('strong', { textContent: BUILDINGS[b].name }), ` (${byId[BUILDINGS[b].age].title}): ${units.length} unit${units.length === 1 ? '' : 's'}, ${techs.length} upgrade${techs.length === 1 ? '' : 's'}, new content in ${eras} Age${eras === 1 ? '' : 's'}. `, clear);
}

// ---------- price of each jump ----------
const J = jumps(ages);
function drawPrice(withGates) {
  const W = 640, L = 112, R = 92, rowH = 34, top = 6, H = top + J.length * rowH + 26;
  const tot = j => RES.map(k => (j.cost[k] || 0) + (withGates ? j.gateCost[k] : 0));
  const max = Math.ceil(Math.max(...J.map(j => tot(j).reduce((s, v) => s + v))) / 1000) * 1000, x = v => L + v / max * (W - L - R);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Resources each age-up takes">`;
  for (let v = 0; v <= max; v += 1000) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${top}" y2="${H - 22}" class="grid"/><text x="${x(v)}" y="${H - 6}" class="axis" text-anchor="middle">${v ? v / 1000 + 'k' : '0'}</text>`;
  J.forEach((j, r) => {
    const y = top + r * rowH + 6, h = rowH - 14, t = tot(j), secs = withGates ? j.timeWithGates : j.time; let acc = 0;
    s += `<rect x="4" y="${y + 3}" width="5" height="${h - 6}" style="fill:${era(j.to)}"/><text x="14" y="${y + h / 2 + 4}" class="lab">${byId[j.to].title.replace(' Age', '')}</text>`;
    t.forEach((v, k) => { if (v) { s += `<rect x="${x(acc)}" y="${y}" width="${Math.max(0, x(acc + v) - x(acc) - 1)}" height="${h}" class="r-${RES[k]}"><title>${RES[k]} ${v}</title></rect>`; acc += v; } });
    s += `<text x="${x(acc) + 6}" y="${y + h / 2 + 4}" class="val">${acc.toLocaleString('en')}</text><text x="${W - 4}" y="${y + h / 2 + 4}" class="axis" text-anchor="end">${Math.floor(secs / 60)}m${String(secs % 60).padStart(2, '0')}s</text>`;
  });
  document.getElementById('price').innerHTML = s + '</svg>';
  for (const b of document.querySelectorAll('[data-gates]')) b.setAttribute('aria-pressed', String((b.dataset.gates === '1') === withGates));
}
document.getElementById('price-mode').addEventListener('click', ev => { const b = ev.target.closest('[data-gates]'); if (b) drawPrice(b.dataset.gates === '1'); });

// ---------- grows by itself ----------
function drawSparks() {
  const fmt = { farmSpeed: v => `×${v}` }, note = { farmFood: 'food', towerDps: 'from Tool', wallHp: 'from Tool' };
  document.getElementById('sparks').replaceChildren(...GROWTH.map(({ key, label }) => {
    const pts = ages.map(a => [a.i, a.grows[key]]).filter(p => p[1] != null), f = fmt[key] || String, W = 200, H = 46;
    const lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
    const px = i => 4 + i / (ages.length - 1) * (W - 8), py = v => H - 5 - (v - lo) / ((hi - lo) || 1) * (H - 12);
    const line = pts.map((p, k) => `${k ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(''), last = pts.at(-1);
    const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" aria-hidden="true"><path d="${line}L${px(last[0])},${H}L${px(pts[0][0])},${H}Z" class="area"/><path d="${line}" class="line"/>`
      + pts.map(p => `<circle cx="${px(p[0])}" cy="${py(p[1])}" r="2.4" style="fill:${era(ages[p[0]].id)}"/>`).join('') + `<circle cx="${px(last[0])}" cy="${py(last[1])}" r="4" class="end"/></svg>`;
    const card = el('div', { className: 'spark' }, el('span', { className: 'lab', textContent: label }), el('span', { className: 'val' }, `${f(pts[0][1])} → ${f(last[1])}`, note[key] ? el('small', { textContent: note[key] }) : null));
    card.insertAdjacentHTML('beforeend', svg); return card;
  }));
}

// ---------- problems ----------
function drawFindings() {
  const list = findings(ages), sev = { high: 'High', med: 'Medium', low: 'Low' };
  document.getElementById('findings').replaceChildren(...(list.length ? list.map(f => el('article', { className: 'find' },
    el('header', {}, el('span', { className: `sev ${f.sev}`, textContent: sev[f.sev] }), el('h3', { textContent: f.title })),
    el('p', { textContent: f.text }), el('p', { className: 'fix' }, el('b', { textContent: 'Try' }), f.fix))) : [el('p', { textContent: 'The data shows no evolution problems.' })]));
}

// ---------- model pictures ----------
const stage = createStage(new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }));
stage.renderer.setPixelRatio(1); stage.renderer.setSize(THUMB_W, THUMB_H, false);
let run = 0;
async function renderThumbs() {
  const me = ++run, items = [...document.querySelectorAll('.obj')], start = performance.now();
  for (let i = 0; i < items.length; i++) {
    if (i % 8 === 0) { await new Promise(requestAnimationFrame); if (me !== run) return; }
    const { kind, type } = items[i].dataset, age = kind === 'unit' ? undefined : BUILDINGS[type].age;
    const g = modelGroup(kind === 'unit' ? unitEntity(type, state.team) : entity(type, state.team), age);
    stage.show(g); stage.aim(boxOf(g), THUMB_W / THUMB_H, kind === 'unit' ? 1.25 : 1.08);
    stage.renderer.render(stage.scene, stage.camera);
    items[i].querySelector('canvas').getContext('2d').drawImage(stage.renderer.domElement, 0, 0);
  }
  stage.show(null);
  window.__ladder.rendered = items.length; window.__ladder.ms = Math.round(performance.now() - start);
}

// ---------- team toggle ----------
function syncTeam() {
  for (const b of document.querySelectorAll('[data-team]')) b.setAttribute('aria-pressed', String(+b.dataset.team === state.team));
  const q = new URLSearchParams(location.search); state.team ? q.set('team', '1') : q.delete('team');
  history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}${location.hash}`);
}
document.querySelector('header').addEventListener('click', ev => {
  const b = ev.target.closest('[data-team]'); if (!b) return;
  state.team = +b.dataset.team; syncTeam(); renderThumbs();
});

window.__ladder = { ages, rendered: 0 };
document.getElementById('strata').replaceChildren(...ages.map(a => { const s = el('span'); s.style.background = era(a.id); return s; }));
buildMatrix(); drawPrice(true); drawSparks(); drawFindings(); syncTeam(); renderThumbs();
