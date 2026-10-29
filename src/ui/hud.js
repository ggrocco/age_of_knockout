import { UNITS } from '../data/units.js';
import { BUILDINGS, repairCost, workSpeed } from '../data/buildings.js';
import { TECHS } from '../data/techs.js';
import { AGES, AGE_COST, ageIndex, ageLabel, ageTitle, popLimit } from '../data/ages.js';
import { canAfford, ageUpProblem, ageUpNeed, popFullReason } from '../sim/commands.js';
import { ROUNDS, WONDER_TICKS, RELIC_TICKS } from '../rounds/index.js';
import { icon } from './icons.js';
import { COLORS, RES, costHtml, tipHtml, roundTipHtml, queueText } from './tips.js';
import { QUALITY } from '../render/quality.js';

const REASONS = { 'needs a fishing ship': 'Only Fishing Ships can fish', resources: 'Not enough resources', 'pop cap': 'Population cap reached - build Houses', 'pop limit': 'Population limit of this Age reached - advance to raise it', age: 'Requires a later Age', placement: 'Cannot build there', 'needs buildings': 'Advancing needs more finished buildings of your current Age',
  'queue full': 'Production queue is full', 'no villagers': 'Select villagers first', 'no units': 'Select units first', 'bad target': 'Invalid target', 'already researching': 'Already advancing', 'needs town center': 'Requires a Town Center',
  'nothing to repair': 'Nothing to repair' };
const TECHS_AT = new Set(Object.values(TECHS).map(t => t.building)); // buildings that research something
export const reasonText = r => REASONS[r] || r;
const fmtTime = t => { const s = Math.floor(t / 20); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const tintOf = d => !d.cls ? 't-bld' : d.age === 'future' ? 't-fut' : d.cls === 'civ' ? 't-civ' : d.cls === 'siege' ? 't-siege' : 't-mil';
const shortOf = (p, cost) => RES.filter(k => cost[k] > p.res[k]);

export function createHud(ui) {
  const $ = id => document.getElementById(id), top = $('topbar'), info = $('info'), cmds = $('cmds');
  let cmdKey = '', infoKey = '', updateKey = '', lastGame = null, revision = 0;
  const hud = { toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(hud._t); hud._t = setTimeout(() => t.classList.remove('show'), 2200); } };
  // Glass command tile: icon orb + name + cost. Disabled tiles use .off / aria-disabled (not [disabled]) so they still receive hover for the tooltip.
  // tile() returns a descriptor: `key` (attributes + name + lock) changes only when the tile set, its target building or a lock state changes (then the panel is rebuilt);
  // otherwise `off` and `small` (cost line) are patched in place so hover/glow animations and focus survive resource ticks.
  const tips = new Map();
  const roundTips = new Map(ROUNDS.map(r => [`round:${r.id}`, r]));
  const tile = (attrs, { kind, id, name, cost, tint, cls, ok, lockedAge, short = [], notes = [], next, age, extra = '', cx = '' }) => {
    tips.set(`${kind}:${id}`, tipHtml({ kind, id, next, age, short, notes }));
    const lock = lockedAge ? `<span class="lock">${icon('lock')}</span>` : '', small = lockedAge ? ageTitle(lockedAge) : costHtml(cost, short, true) + extra;
    return { key: `${attrs}|${name}|${lockedAge ? 'L' : ''}`, off: !ok, small,
      html: `<button class="btn tile ${tint}${ok ? '' : ' off'}${lockedAge ? ' locked' : ''}${cx}" ${attrs} data-tip="${kind}:${id}" aria-describedby="tip" aria-disabled="${!ok}"><span class="orb">${icon(id, cls)}${lock}</span><span class="lbl"><b>${name}</b><small>${small}</small></span></button>` };
  };
  const tipEl = $('tip'); let tipKey = '', tipTarget = null;
  const hideTip = () => { tipKey = ''; tipTarget = null; tipEl.classList.remove('show'); };
  hud.hideTip = hideTip;
  const showTip = (b, force) => {
    const round = roundTips.get(b.dataset.tip);
    const html = round ? roundTipHtml(round, ui.roundCaps?.[round.id]) : tips.get(b.dataset.tip); if (!html || ui.touch) return hideTip();
    const was = tipEl.classList.contains('show'); if (!force && was && tipTarget === b) return;
    tipKey = b.dataset.tip; tipTarget = b; if (tipEl._html !== html) { tipEl.innerHTML = html; tipEl._html = html; }
    const tint = [...b.classList].find(c => c.startsWith('t-')) || 't-bld'; if (tipEl._tint !== tint) { if (tipEl._tint) tipEl.classList.remove(tipEl._tint); tipEl.classList.add(tint); tipEl._tint = tint; }
    tipEl.classList.toggle('move', was);
    const r = b.getBoundingClientRect(), w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    tipEl.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
    tipEl.style.top = Math.max(8, Math.min(window.innerHeight - h - 8, r.top - h - 10 < 8 ? r.bottom + 10 : r.top - h - 10)) + 'px';
    tipEl.classList.add('show');
  };
  document.addEventListener('mouseover', e => { const b = e.target.closest?.('[data-tip]'); if (b) showTip(b); else if (tipKey) hideTip(); });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) hideTip(); });
  document.addEventListener('focusin', e => { const b = e.target.closest?.('[data-tip]'); if (b) showTip(b); });
  document.addEventListener('focusout', hideTip);
  document.addEventListener('scroll', hideTip, { passive: true, capture: true });
  document.addEventListener('click', hideTip);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('resize', hideTip);
  const deleteDialog = $('delete-confirmation'); let deleteRequest = null;
  const finishDelete = () => {
    const request = deleteRequest; if (!request) return;
    deleteRequest = null; ui.deleteConfirmOpen = false;
    if (ui.game !== request.game) return;
    ui.paused = request.wasPaused;
    if (deleteDialog.returnValue === 'delete') request.confirm();
    if (request.focus?.isConnected) request.focus.focus({ preventScroll: true });
  };
  deleteDialog.addEventListener('close', () => { if (!deleteDialog.open) finishDelete(); });
  hud.confirmDelete = (building, confirm) => {
    if (deleteRequest || !ui.game || ui.game.result) return;
    hideTip();
    deleteRequest = { game: ui.game, wasPaused: ui.paused, focus: document.activeElement, confirm };
    ui.paused = true; ui.deleteConfirmOpen = true;
    $('delete-title').textContent = `Delete ${BUILDINGS[building.type].name}?`;
    deleteDialog.returnValue = 'cancel'; deleteDialog.showModal();
  };
  hud.cancelDelete = () => {
    if (deleteDialog.open) deleteDialog.close('cancel');
    finishDelete();
  };
  hud.invalidate = () => { revision++; };
  hud.reset = () => { lastGame = null; updateKey = ''; cmdKey = ''; infoKey = ''; };
  hud.update = () => {
    const g = ui.game;
    if (!g) return;
    const stamp = `${g.time}|${!!g.result}|${[...ui.sel]}|${ui.inspect?.id}|${ui.placing}|${ui.paused}|${ui.speed}|${ui.boxMode}|${ui.resignArmed}|${ui.deleteConfirmOpen}|${$('gamemenu').classList.contains('hidden')}|${revision}`;
    if (lastGame === g && updateKey === stamp) return;
    lastGame = g; updateKey = stamp;
    const p = g.players[0], round = g.rules;
    // The pause modal: shown for a player pause, not while the settings menu or delete dialog (which also pause) is up.
    const pauseEl = $('pausemodal'), showPause = ui.paused && !g.result && !ui.deleteConfirmOpen && $('gamemenu').classList.contains('hidden');
    if (showPause === pauseEl.classList.contains('hidden')) { pauseEl.classList.toggle('hidden', !showPause); if (showPause) { hideTip(); pauseEl.querySelector('button').focus({ preventScroll: true }); } }
    let obj = round ? round.desc : '';
    const st = g.roundState;
    if (round && round.id === 'wonder') obj = `Wonder countdown - you ${fmtTime(st.hold[0])}/${fmtTime(WONDER_TICKS)} | enemy ${fmtTime(st.hold[1])}/${fmtTime(WONDER_TICKS)}`;
    if (round && round.id === 'relics') obj = `Relics held - you ${st.count ? st.count[0] : 0} | enemy ${st.count ? st.count[1] : 0} of 5 | hold ${fmtTime(st.hold[0])}/${fmtTime(RELIC_TICKS)}`;
    if (round && round.id === 'regicide') obj = `Protect your King (${g.entities.has(st.kings[0]) ? 'alive' : 'DEAD'}). Kill theirs.`;
    const resHtml = ['food', 'wood', 'gold', 'stone'].map(k => `<span class="res"><i class="dot" style="background:${COLORS[k]}"></i>${Math.floor(p.res[k])}</span>`).join('');
    const ageName = ageLabel(p.age);
    const roundAttrs = round ? `data-tip="round:${round.id}" aria-describedby="tip" tabindex="0"` : '';
    const clockHtml = `<span class="res match-clock" ${roundAttrs} aria-label="Elapsed game time${round ? (g.capTicks === Infinity ? ' / no time limit' : ' / time limit') : ''}"></span>`;
    let html;
    if (ui.touch) html = resHtml + `<span class="res" title="Population (${ageTitle(p.age)} limit ${popLimit(p.age)})">&#9823;${p.pop}/${p.popCap}</span><span class="res">${ageName}${p.ageUp ? '&hellip;' : ''}</span><span style="flex:1"></span>${clockHtml}<button data-menu="open" aria-label="Menu">&#9776;</button>`;
    else html = resHtml
      + `<span class="res" title="Population (${ageTitle(p.age)} limit ${popLimit(p.age)})">Pop ${p.pop}/${p.popCap}</span><span class="res">${p.ageUp ? 'Advancing... ' : ''}${ageTitle(p.age)}</span>`
      + `<span class="grow" ${roundAttrs}><b>${round ? round.name : 'Match'}</b> - <span class="obj">${obj}</span></span>${clockHtml}`
      + [1, 2, 4].map(s => `<button data-speed="${s}" class="${ui.speed === s ? 'on' : ''}">${s}x</button>`).join('') + `<button data-pause="1" class="${ui.paused ? 'on' : ''}">${ui.paused ? 'Resume' : 'Pause'}</button><button data-resign="1" class="${ui.resignArmed ? 'on' : ''}">${ui.resignArmed ? 'Confirm resign?' : 'Resign'}</button>`;
    if (!ui.touch) html += '<button data-menu="open" aria-label="Game settings">Settings</button>';
    let idleN = 0; for (const u of g.units.values()) if (u.owner === 0 && u.type === 'villager' && u.order.type === 'idle') idleN++;
    const badge = document.querySelector(ui.touch ? '#touchbar [data-act=idle] .badge' : '#idlebtn .badge'), bt = idleN ? String(idleN) : ''; if (badge.textContent !== bt) badge.textContent = bt;
    if (!ui.touch) $('idlebtn').classList.toggle('has', idleN > 0);
    if (ui.touch) {
      const objEl = $('objective'), otxt = round ? `${round.name}: ${obj}` : ''; if (objEl.textContent !== otxt) objEl.textContent = otxt;
      document.querySelector('#touchbar [data-act=box]').classList.toggle('on', !!ui.boxMode);
      $('placebar').classList.toggle('hidden', !ui.placing); document.body.classList.toggle('placing', !!ui.placing);
    }
    if (top._html !== html) {
      // Resource/countdown updates rebuild the bar; keep keyboard focus on its tooltip targets.
      const active = document.activeElement, focusedTip = top.contains(active) && active.matches('[data-tip]');
      const focusSelector = focusedTip ? (active.classList.contains('match-clock') ? '.match-clock' : '.grow') : null;
      const tipWasShown = tipEl.classList.contains('show');
      top.innerHTML = html; top._html = html;
      if (focusSelector) { top.querySelector(focusSelector)?.focus({ preventScroll: true }); if (!tipWasShown) hideTip(); }
    }
    const clock = top.querySelector('.match-clock'), clockText = fmtTime(g.time) + (round ? ` / ${g.capTicks === Infinity ? '∞' : fmtTime(g.capTicks)}` : '');
    if (clock.textContent !== clockText) clock.textContent = clockText;
    // info panel
    const sel = [...ui.sel].map(id => g.entities.get(id)).filter(Boolean), one = sel.length === 1 ? sel[0] : null, insp = ui.inspect && g.entities.get(ui.inspect.id);
    let ih = '';
    const bar = e => `<div class="bar"><i style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></i></div>`;
    const nameOf = e => e.kind === 'unit' ? UNITS[e.type].name : e.kind === 'building' ? BUILDINGS[e.type].name : e.type;
    const describe = e => {
      let s = `<h3>${nameOf(e)}${e.owner === 1 ? ' <small class="lose">(enemy)</small>' : ''}</h3>` + bar(e) + `HP ${Math.ceil(e.hp)}/${e.maxHp}`;
      if (e.kind === 'unit') s += ` &nbsp; Attack ${e.atk} ${e.atkType === 'pierce' ? 'pierce' : 'melee'} &nbsp; Armor ${e.marmor}/${e.parmor}` + (e.carry?.amount > 0 ? `<br>Carrying ${Math.floor(e.carry.amount)} ${e.carry.type}` : '') + `<br>${e.order.type === 'idle' ? 'Idle' : e.order.type[0].toUpperCase() + e.order.type.slice(1)}`;
      if (e.kind === 'building') s += e.constructed ? (e.queue.length ? `<br>Training: ${queueText(e.queue)} (${Math.ceil(e.queue[0].remaining / 20 / workSpeed(e))}s)` : (e.gatherType ? `<br>${e.gatherType[0].toUpperCase() + e.gatherType.slice(1)} left ${Math.floor(e.amount)}${e.maxAmount ? ' / ' + e.maxAmount : ''}` : '')) : `<br>Under construction ${Math.floor(e.progress * 100)}%`;
      if (e.kind === 'building' && e.owner === 0 && e.constructed && !e.gatherType && e.hp < e.maxHp) { // what villagers would pay to make it whole
        const rc = repairCost(e.type, e.maxHp - e.hp, e.maxHp), rcr = Object.fromEntries(Object.entries(rc).map(([k, v]) => [k, Math.ceil(v)]));
        if (BUILDINGS[e.type].trains || TECHS_AT.has(e.type)) s += `<br><span class="lose">Damaged: works at ${Math.round(workSpeed(e) * 100)}% speed</span>`;
        s += `<br>Repair: ${costHtml(rcr, shortOf(p, rcr), true)}${ui.touch ? '' : ' <small>(right-click with villagers)</small>'}`;
      }
      // Phones have no tooltips and the Advance tile clips 4-resource costs, so the Town Center lists the next Age's full cost here.
      const next = AGES[ageIndex(p.age) + 1];
      if (ui.touch && e.type === 'town_center' && e.owner === 0 && e.constructed && next) s += `<br>${ageTitle(next)}: ${costHtml(AGE_COST[next].cost, shortOf(p, AGE_COST[next].cost), true)}`;
      return s;
    };
    if (one) ih = describe(one);
    else if (sel.length) { const c = {}; for (const e of sel) c[nameOf(e)] = (c[nameOf(e)] || 0) + 1; ih = `<h3>${sel.length} selected</h3>` + Object.entries(c).map(([k, v]) => `${v} x ${k}`).join('<br>'); }
    else if (insp) ih = describe(insp);
    else if (ui.inspect && ui.inspect.kind === 'resource') ih = `<h3>${ui.inspect.type}</h3>`;
    else ih = `<h3>${round ? round.name : ''}</h3>${round ? round.desc : ''}<br><br><small>Left-click / drag to select. Right-click to order. WASD or Space + drag pans, wheel zooms. Esc pauses.</small>`;
    if (ih !== infoKey) { info.innerHTML = ih; infoKey = ih; }
    // commands
    const own = sel.filter(e => e.owner === 0), vills = own.filter(e => e.type === 'villager'), bld = own.find(e => e.kind === 'building' && e.constructed);
    // Every selected own building, foundations too, uses the same confirmation dialog.
    const del = own.find(e => e.kind === 'building');
    let key = `${del ? 'D' + del.id : ''}${vills.length ? 'V' : ''}${bld ? bld.id + ':' + bld.queue.length : ''}${bld && bld.research ? 'R' + Math.ceil(bld.research.remaining / 20 / workSpeed(bld)) : ''}${p.techs.size}${p.age}${p.ageUp ? 'a' : ''}${['food', 'wood', 'gold', 'stone'].map(k => Math.floor(p.res[k] / 25)).join(',')}${canAfford(p, BUILDINGS.wall.cost) ? 'W' : ''}${p.pop >= p.popCap ? 'P' : ''}${ui.placing || ''}`; // the 5-stone Wall is finer than the 25-step buckets
    if (key !== cmdKey) {
      cmdKey = key; const btns = []; tips.clear();
      const notesFor = (locked, d, short, popFull) => locked ? ['Requires ' + ageTitle(d.age)] : [...(short.length ? [reasonText('resources')] : []), ...(popFull ? [reasonText(popFullReason(p))] : [])];
      if (vills.length) for (const [id, d] of Object.entries(BUILDINGS)) {
        const locked = ageIndex(d.age) > ageIndex(p.age), short = shortOf(p, d.cost), ok = !locked && canAfford(p, d.cost);
        btns.push(tile(`data-build="${id}"`, { kind: 'building', id, name: d.name, cost: d.cost, tint: tintOf(d), ok, lockedAge: locked ? d.age : '', short, notes: notesFor(locked, d, short), age: p.age }));
      }
      if (bld) {
        for (const u of BUILDINGS[bld.type].trains || []) { const d = UNITS[u], locked = ageIndex(d.age) > ageIndex(p.age), short = shortOf(p, d.cost), popFull = p.pop >= p.popCap, ok = !locked && canAfford(p, d.cost) && !popFull;
          btns.push(tile(`data-train="${u}" data-b="${bld.id}"`, { kind: 'unit', id: u, name: d.name, cost: d.cost, tint: tintOf(d), cls: d.cls, ok, lockedAge: locked ? d.age : '', short, notes: notesFor(locked, d, short, popFull) })); }
        for (const [id, t] of Object.entries(TECHS)) { // research upgrades for this building type
          if (t.building !== bld.type || p.techs.has(id)) continue;
          const inProg = bld.research?.tech === id, locked = ageIndex(p.age) < ageIndex(t.age), needReq = t.requires && !p.techs.has(t.requires);
          const short = shortOf(p, t.cost), busy = bld.research && !inProg, ok = !inProg && !locked && !needReq && !busy && canAfford(p, t.cost);
          const notes = inProg ? [`Researching (${Math.ceil(bld.research.remaining / 20 / workSpeed(bld))}s)`] : locked ? ['Requires ' + ageTitle(t.age)] : needReq ? ['Needs ' + TECHS[t.requires].name] : busy ? ['Building is busy'] : short.length ? [reasonText('resources')] : [];
          btns.push(tile(`data-research="${id}" data-b="${bld.id}"`, { kind: 'tech', id, name: t.name, cost: t.cost, tint: 't-age', ok, lockedAge: locked ? t.age : '', short, notes })); }
        if (bld.type === 'town_center') { const next = AGES[ageIndex(p.age) + 1]; if (next) { const why = ageUpProblem(ui.game, 0), cost = AGE_COST[next].cost;
          btns.push(tile('data-age="1"', { kind: 'age', id: 'age', next, name: 'Advance: ' + ageLabel(next), cost, tint: 't-age', ok: !why, short: shortOf(p, cost), notes: why ? [reasonText(why)] : [], extra: why === 'needs buildings' ? `<span class="c">+${ageUpNeed(p.age)} bldg${ageUpNeed(p.age) > 1 ? 's' : ''}</span>` : '', cx: ' age' })); } }
      }
      if (del) btns.push(tile(`data-delete="${del.id}"`, { kind: 'delete', id: 'delete', name: 'Delete', cost: {}, tint: 't-del', ok: true, extra: '<span class="c">No refund</span>' }));
      const struct = btns.map(b => b.key).join('|');
      if (struct !== cmds._struct) { cmds.innerHTML = btns.map(b => b.html).join(''); cmds._struct = struct; }
      else btns.forEach((b, i) => { const el = cmds.children[i], sm = el.querySelector('small'); el.classList.toggle('off', b.off); el.setAttribute('aria-disabled', b.off); if (sm.innerHTML !== b.small) sm.innerHTML = b.small; });
      if (tipKey && !roundTips.has(tipKey)) { const nb = cmds.querySelector(`[data-tip="${tipKey}"]`); if (nb) showTip(nb, true); else hideTip(); }
    }
    document.body.classList.toggle('has-cmds', cmds.children.length > 0);
  };
  hud.openMenu = () => {
    const m = $('gamemenu'), opening = m.classList.contains('hidden');
    if (opening) { ui._menuFocus = document.activeElement; ui._wasPaused = ui.paused; ui.paused = true; }
    m.innerHTML = `<div class="card"><h2>Menu</h2><button class="btn" data-menu="close">Resume game</button><div class="row">${[1, 2, 4].map(s => `<button class="btn ${ui.speed === s ? 'on' : ''}" data-speed="${s}">${s}x</button>`).join('')}</div><button class="btn" data-resign="1">${ui.resignArmed ? 'Confirm resign?' : 'Resign'}</button><button class="btn" data-quit="1">${ui.quitArmed ? 'Confirm quit?' : 'Quit to menu'}</button></div>`;
    const graphics = `<fieldset class="graphics"><legend>Graphics quality</legend><div class="quality-options">${Object.entries(QUALITY).map(([id, option]) => `<button class="btn ${ui.view?.quality === id ? 'on' : ''}" data-quality="${id}" aria-pressed="${ui.view?.quality === id}">${option.label}</button>`).join('')}</div><p>High adds richer lighting and grass. Ultra sharpens shadows and detail. Balanced uses less power.</p></fieldset>`;
    m.querySelector('.card').insertAdjacentHTML('beforeend', graphics);
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Game settings');
    m.classList.remove('hidden');
    if (opening) m.querySelector('[data-menu="close"]').focus();
  };
  hud.closeMenu = () => {
    const m = $('gamemenu'); if (m.classList.contains('hidden')) return;
    m.classList.add('hidden'); ui.paused = !!ui._wasPaused;
    (ui._menuFocus?.isConnected ? ui._menuFocus : top.querySelector('[data-menu="open"]'))?.focus();
  };
  $('gamemenu').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); hud.closeMenu(); }
    if (e.key === 'Tab') {
      const buttons = [...$('gamemenu').querySelectorAll('button')], first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.classList.contains('off')) return;
    if (b.dataset.menu === 'open') return hud.openMenu();
    if (b.dataset.menu === 'close') return hud.closeMenu();
    if (b.dataset.quality) { ui.view?.setQuality(b.dataset.quality); hud.openMenu(); $('gamemenu').querySelector(`[data-quality="${ui.view.quality}"]`)?.focus(); return; }
    if (b.dataset.act) return ui.actions?.[b.dataset.act]?.();
    if (b.dataset.quit) { if (ui.quitArmed) { ui.quitArmed = false; hud.closeMenu(); return ui.quit(); } ui.quitArmed = true; setTimeout(() => { ui.quitArmed = false; }, 3000); return hud.openMenu(); }
    if (b.dataset.speed) ui.setSpeed(+b.dataset.speed);
    else if (b.dataset.pause) ui.togglePause();
    else if (b.dataset.resign) { if (ui.resignArmed) { ui.resignArmed = false; ui.game.command(0, { type: 'resign' }); hud.closeMenu(); } else { ui.resignArmed = true; setTimeout(() => { ui.resignArmed = false; }, 3000); if (!$('gamemenu').classList.contains('hidden')) hud.openMenu(); } }
    else if (b.dataset.delete) { ui.actions?.delete(+b.dataset.delete); cmdKey = ''; }
    else if (b.dataset.build) ui.startPlacing(b.dataset.build);
    else if (b.dataset.train) { const n = e.shiftKey ? 5 : 1; for (let i = 0; i < n; i++) { const r = ui.cmd({ type: 'train', buildingId: +b.dataset.b, unit: b.dataset.train }); if (!r.ok) break; } cmdKey = ''; }
    else if (b.dataset.research) { ui.cmd({ type: 'research', buildingId: +b.dataset.b, tech: b.dataset.research }); cmdKey = ''; }
    else if (b.dataset.age) { ui.cmd({ type: 'age' }); cmdKey = ''; }
  });
  return hud;
}
